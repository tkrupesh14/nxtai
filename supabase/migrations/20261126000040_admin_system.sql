-- Admin panel 6.6 (plan.md Phase 6): System — errors over a date range with search, deploys and restarts, and
-- health checks.
--   · private.app_starts: one row each time the production server starts (instrumentation.ts), with the commit it
--     was built from (scripts/deploy.sh writes .next/krpex-build.json). A new commit is a deploy; the same commit
--     again is a restart (pm2 restart or a crash); an older commit is a rollback.
--   · private.health_checks: every 5 minutes the server checks it can reach Supabase and records the result, its
--     response time and memory. Checks that couldn't be saved are sent later. Gaps mean the server was down.
--     Kept for 30 days.
--   · admin_error_groups(): errors in a time range, by source and search text, grouped by message.
--   · admin_system(p_hours): starts, health summary, downtime and failed checks for the range.
-- Run after 039. Safe to run twice.

create table if not exists private.app_starts (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  commit text check (char_length(commit) <= 40),
  subject text check (char_length(subject) <= 200),
  built_at timestamptz,
  dirty boolean not null default false
);
create index if not exists app_starts_time_idx on private.app_starts (at desc);
alter table private.app_starts enable row level security;
revoke all on private.app_starts from public, anon, authenticated;

create table if not exists private.health_checks (
  id bigint generated always as identity primary key,
  at timestamptz not null,
  ok boolean not null,
  database text not null check (char_length(database) <= 60),
  ms int not null check (ms between 0 and 600000),
  rss_mb int check (rss_mb between 0 and 100000),
  commit text check (char_length(commit) <= 40)
);
create index if not exists health_checks_time_idx on private.health_checks (at desc);
alter table private.health_checks enable row level security;
revoke all on private.health_checks from public, anon, authenticated;

create index if not exists app_errors_source_time_idx on public.app_errors (source, created_at desc);

create or replace function public.app_log_start(p_key text, p_commit text, p_subject text, p_built_at timestamptz, p_dirty boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_server_key(p_key);
  insert into private.app_starts (commit, subject, built_at, dirty)
  values (left(nullif(btrim(coalesce(p_commit, '')), ''), 40), left(nullif(btrim(coalesce(p_subject, '')), ''), 200),
          case when p_built_at between now() - interval '365 days' and now() + interval '1 hour' then p_built_at end, coalesce(p_dirty, false));
end $$;

-- p_at: when the check ran (checks saved late keep their time; no more than a day back, never in the future).
create or replace function public.app_log_health(p_key text, p_at timestamptz, p_ok boolean, p_database text, p_ms int, p_rss_mb int, p_commit text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_server_key(p_key);
  insert into private.health_checks (at, ok, database, ms, rss_mb, commit)
  values (least(greatest(coalesce(p_at, now()), now() - interval '1 day'), now()), coalesce(p_ok, false),
          left(coalesce(nullif(btrim(p_database), ''), 'unknown'), 60), least(greatest(coalesce(p_ms, 0), 0), 600000),
          least(greatest(p_rss_mb, 0), 100000), left(p_commit, 40));
  delete from private.health_checks where at < now() - interval '30 days';
end $$;

-- Errors between two times, grouped by message. p_source: all | server | client. p_search matches message or path.
create or replace function public.admin_error_groups(p_from timestamptz, p_to timestamptz default null, p_source text default 'all',
                                                     p_search text default '', p_limit int default 100)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_from timestamptz := greatest(coalesce(p_from, now() - interval '1 day'), now() - interval '400 days');
  v_to timestamptz := coalesce(p_to, now());
  v_source text := case when p_source in ('server', 'client') then p_source else 'all' end;
  v_q text := '%' || replace(replace(replace(lower(btrim(coalesce(p_search, ''))), '\', '\\'), '%', '\%'), '_', '\_') || '%';
begin
  perform private.require_admin();
  return (with e as materialized (
      select * from public.app_errors x
       where x.created_at >= v_from and x.created_at < v_to and (v_source = 'all' or x.source = v_source)
         and (v_q = '%%' or lower(x.message) like v_q or lower(coalesce(x.path, '')) like v_q)
    )
    select jsonb_build_object(
      'total', (select count(*) from e),
      'server', (select count(*) from e where source = 'server'),
      'client', (select count(*) from e where source = 'client'),
      'groups', coalesce((select jsonb_agg(g order by g ->> 'last_seen' desc) from (
          select jsonb_build_object('source', source, 'message', message, 'count', count(*), 'first_seen', min(created_at), 'last_seen', max(created_at),
                                    'paths', count(distinct path), 'last_path', (array_agg(path order by created_at desc))[1],
                                    'last_detail', (array_agg(detail order by created_at desc))[1]) as g
            from e group by source, message order by max(created_at) desc
           limit least(greatest(coalesce(p_limit, 100), 1), 200)) x), '[]'::jsonb),
      'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'server', s, 'client', c) order by d desc) from (
          select (created_at at time zone 'Asia/Kolkata')::date as d, count(*) filter (where source = 'server') as s, count(*) filter (where source = 'client') as c
            from e group by 1) x), '[]'::jsonb)));
end $$;

create or replace function public.admin_system(p_hours int default 168)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_hours int := least(greatest(coalesce(p_hours, 168), 1), 720);
  v_from timestamptz := now() - make_interval(hours => v_hours);
  v_first timestamptz;
begin
  perform private.require_admin();
  -- Uptime is counted from the first check ever recorded, so the days before checks existed don't count as down.
  v_first := greatest(v_from, (select min(at) from private.health_checks));
  return (with c as materialized (
      select h.*, lag(h.at) over (order by h.at) as prev_at from private.health_checks h where h.at >= v_from - interval '10 minutes'
    ), gaps as (
      -- More than 12 minutes between checks (they run every 5): the server was down or restarting.
      select prev_at as down_from, at as down_to from c where at >= v_from and prev_at is not null and at - prev_at > interval '12 minutes'
      union all
      select max(at), null from c having max(at) < now() - interval '12 minutes'
    ), starts as (
      select s.*, lag(s.commit) over (order by s.at, s.id) as prev_commit,
             exists (select 1 from private.app_starts o where o.commit = s.commit and o.at < s.at and o.id <> s.id) as seen_before
        from private.app_starts s
    )
    select jsonb_build_object(
      'hours', v_hours,
      'last_check', (select jsonb_build_object('at', at, 'ok', ok, 'database', database, 'ms', ms, 'rss_mb', rss_mb, 'commit', commit)
                       from private.health_checks order by at desc limit 1),
      'checks', (select count(*) from c where at >= v_from),
      'failed', (select count(*) from c where at >= v_from and not ok),
      'avg_ms', (select round(avg(ms)) from c where at >= v_from and ok),
      'max_ms', (select max(ms) from c where at >= v_from),
      'max_rss_mb', (select max(rss_mb) from c where at >= v_from),
      'first_check', (select min(at) from private.health_checks),
      'down_minutes', (select coalesce(round(sum(extract(epoch from (coalesce(down_to, now()) - greatest(down_from, v_from))) / 60 - 5)), 0) from gaps),
      'span_minutes', case when v_first is null then 0 else round(extract(epoch from now() - v_first) / 60) end,
      'downtime', coalesce((select jsonb_agg(jsonb_build_object('from', down_from, 'to', down_to,
                              'minutes', round(extract(epoch from (coalesce(down_to, now()) - down_from)) / 60)) order by down_from desc)
                            from gaps), '[]'::jsonb),
      'failures', coalesce((select jsonb_agg(jsonb_build_object('at', at, 'database', database, 'ms', ms) order by at desc)
                            from (select * from c where at >= v_from and not ok order by at desc limit 50) f), '[]'::jsonb),
      'starts', coalesce((select jsonb_agg(jsonb_build_object('at', at, 'commit', commit, 'subject', subject, 'built_at', built_at, 'dirty', dirty,
                              'kind', case when commit is null then 'unknown' when prev_commit is not distinct from commit then 'restart'
                                           when seen_before then 'rollback' else 'deploy' end) order by at desc)
                            from (select * from starts order by at desc limit 30) s), '[]'::jsonb)));
end $$;

do $$
declare f text;
begin
  foreach f in array array['public.app_log_start(text, text, text, timestamptz, boolean)',
                           'public.app_log_health(text, timestamptz, boolean, text, int, int, text)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
  foreach f in array array['public.admin_error_groups(timestamptz, timestamptz, text, text, int)', 'public.admin_system(int)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
