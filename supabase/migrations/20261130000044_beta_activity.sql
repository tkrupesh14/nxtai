-- Closed beta B.3 (plan.md "Closed beta"): what testers do on krpex.in, code.krpex.in and community.krpex.in.
--   · private.page_views: one row per page a tester saw (site, path without the query string, the page they came
--     from, when, seconds on it). Recorded only for approved testers who applied and agreed to tracking, and only
--     while the beta is closed (privacy page "Beta testing"). Kept 90 days.
--   · Actions aren't copied: lessons, quizzes, questions, code submissions, coach use, study plans, posts and
--     comments are read from their own tables for the admin timeline.
--   · activity_tracking / activity_record for the browser (through /api/beta/activity); admin_beta_activity
--     (funnel, sites, pages, testers) and admin_beta_tester_activity (one tester's timeline) for /admin/beta/activity.
-- Run after 043. Safe to run twice.

create table if not exists private.page_views (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  site text not null check (site in ('main', 'code', 'community')),
  path text not null check (char_length(path) between 1 and 300),
  came_from text check (char_length(came_from) <= 300),
  started_at timestamptz not null,
  seconds int not null check (seconds between 0 and 3600)
);
create index if not exists page_views_user_idx on private.page_views (user_id, started_at);
create index if not exists page_views_time_idx on private.page_views (started_at);
alter table private.page_views enable row level security;
revoke all on private.page_views from public, anon, authenticated;

-- Approved testers who applied (and so agreed to tracking), while the beta is closed.
create or replace function private.tracks_activity(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_user is not null and private.beta_closed() and exists (
    select 1 from private.beta_testers
     where user_id = p_user and source = 'applied' and status = 'approved' and consent_at is not null);
$$;
revoke all on function private.tracks_activity(uuid) from public, anon, authenticated;

-- Groups pages with ids in them: /learn/courses/<uuid> → /learn/courses/:id.
create or replace function private.page_group(p_path text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(p_path, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', ':id', 'gi');
$$;

-- ── Browser ─────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.activity_tracking() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.tracks_activity(auth.uid());
$$;

-- p_views: [{ site, path, came_from, started_at, seconds }], up to 50. Bad entries are skipped. Returns whether
-- this account is tracked (false: the browser stops sending).
create or replace function public.activity_record(p_views jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if not private.tracks_activity(uid) then return false; end if;
  if jsonb_typeof(p_views) <> 'array' then return true; end if;
  -- At most 3,000 pages a day per tester.
  if (select count(*) from private.page_views where user_id = uid and started_at > now() - interval '1 day') >= 3000 then return true; end if;
  insert into private.page_views (user_id, site, path, came_from, started_at, seconds)
  select uid, v->>'site', left(split_part(v->>'path', '?', 1), 300),
         nullif(left(split_part(coalesce(v->>'came_from', ''), '?', 1), 300), ''),
         (v->>'started_at')::timestamptz,
         least(greatest(coalesce((v->>'seconds')::numeric, 0)::int, 0), 3600)
    from jsonb_array_elements(p_views) with ordinality as e(v, n)
   where n <= 50
     and jsonb_typeof(v) = 'object'
     and v->>'site' in ('main', 'code', 'community')
     and coalesce(v->>'path', '') ~ '^/'
     and coalesce(v->>'started_at', '') ~ '^\d{4}-\d{2}-\d{2}T'
     and coalesce(v->>'seconds', '0') ~ '^\d+(\.\d+)?$'
     and (v->>'started_at')::timestamptz between now() - interval '2 days' and now() + interval '5 minutes';
  delete from private.page_views where started_at < now() - interval '90 days';
  return true;
end $$;

-- ── Admins ──────────────────────────────────────────────────────────────────────────────────────────────
-- Sessions: a tester's pages with less than 30 minutes between the end of one and the start of the next.
-- { days, funnel: {...}, sites: {...}, pages: [{ site, page, views, testers, avg_seconds, exits }], testers: [...] }
create or replace function public.admin_beta_activity(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_days int := least(greatest(coalesce(p_days, 30), 1), 90);
begin
  perform private.require_admin();
  return (with
    testers as (
      select b.user_id, b.status, b.name, b.decided_at, u.email::text as email, u.last_sign_in_at
        from private.beta_testers b join auth.users u on u.id = b.user_id
       where b.source = 'applied'),
    approved as (select * from testers where status = 'approved'),
    views as (
      select v.*, (v.started_at at time zone 'Asia/Kolkata')::date as day,
             lead(v.started_at) over (partition by v.user_id order by v.started_at) as next_at
        from private.page_views v where v.user_id in (select user_id from approved)),
    recent as (select * from views where started_at > now() - make_interval(days => v_days)),
    per_tester as (
      select a.user_id,
             (select count(*) from views v where v.user_id = a.user_id) as views,
             (select count(distinct day) from views v where v.user_id = a.user_id) as active_days,
             (select min(started_at) from views v where v.user_id = a.user_id) as first_seen,
             (select max(started_at) from views v where v.user_id = a.user_id) as last_seen,
             (select coalesce(jsonb_agg(distinct site), '[]'::jsonb) from views v where v.user_id = a.user_id) as sites,
             exists (select 1 from public.learner_profiles p where p.user_id = a.user_id) as onboarded,
             exists (select 1 from public.lessons l where l.user_id = a.user_id and l.generated_at is not null) as lesson_opened,
             exists (select 1 from public.lessons l where l.user_id = a.user_id and l.completed_at is not null) as lesson_finished,
             exists (select 1 from public.coding_submissions s where s.user_id = a.user_id) as code_submitted,
             exists (select 1 from public.community_posts p where p.author = a.user_id)
               or exists (select 1 from public.community_comments c where c.author = a.user_id) as community_posted
        from approved a)
    select jsonb_build_object(
      'days', v_days,
      'funnel', jsonb_build_object(
        'applied', (select count(*) from testers),
        'approved', (select count(*) from approved),
        'signed_in', (select count(*) from approved a join per_tester p using (user_id)
                       where p.views > 0 or a.last_sign_in_at >= a.decided_at),
        'onboarded', (select count(*) from per_tester where onboarded),
        'lesson_opened', (select count(*) from per_tester where lesson_opened),
        'lesson_finished', (select count(*) from per_tester where lesson_finished),
        'day_2', (select count(*) from per_tester where active_days >= 2),
        'week_2', (select count(*) from per_tester where last_seen >= first_seen + interval '7 days')),
      'sites', jsonb_build_object(
        'main', (select count(*) from per_tester where sites ? 'main'),
        'code', (select count(*) from per_tester where sites ? 'code'),
        'community', (select count(*) from per_tester where sites ? 'community'),
        'two_or_more', (select count(*) from per_tester where jsonb_array_length(sites) >= 2),
        'all_three', (select count(*) from per_tester where jsonb_array_length(sites) = 3),
        'code_submitted', (select count(*) from per_tester where code_submitted),
        'community_posted', (select count(*) from per_tester where community_posted)),
      'pages', coalesce((select jsonb_agg(jsonb_build_object(
          'site', site, 'page', page, 'views', views, 'testers', testers, 'avg_seconds', avg_seconds, 'exits', exits)
          order by site, views desc, page)
        from (select site, private.page_group(path) as page, count(*) as views, count(distinct user_id) as testers,
                     round(avg(seconds))::int as avg_seconds,
                     count(*) filter (where next_at is null or next_at > started_at + make_interval(secs => seconds) + interval '30 minutes') as exits
                from recent group by 1, 2) g), '[]'::jsonb),
      'testers', coalesce((select jsonb_agg(jsonb_build_object(
          'user_id', a.user_id, 'name', a.name, 'email', a.email, 'approved_at', a.decided_at, 'views', p.views,
          'active_days', p.active_days, 'last_seen', p.last_seen, 'sites', p.sites)
          order by p.last_seen desc nulls last, a.decided_at desc)
        from approved a join per_tester p using (user_id)), '[]'::jsonb)));
end $$;

-- One tester's timeline, newest first: pages and what they did, up to 500 events in the last p_days.
-- { tester: { user_id, name, email, status, approved_at, active_days, first_seen, last_seen }, events: [{ at, kind, site, title, detail, seconds }] }
create or replace function public.admin_beta_tester_activity(p_user uuid, p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 90));
begin
  perform private.require_admin();
  if not exists (select 1 from private.beta_testers where user_id = p_user) then return null; end if;
  return jsonb_build_object(
    'tester', (select jsonb_build_object('user_id', b.user_id, 'name', b.name, 'email', u.email, 'status', b.status, 'source', b.source,
                 'approved_at', b.decided_at,
                 'active_days', (select count(distinct (started_at at time zone 'Asia/Kolkata')::date) from private.page_views where user_id = p_user),
                 'first_seen', (select min(started_at) from private.page_views where user_id = p_user),
                 'last_seen', (select max(started_at) from private.page_views where user_id = p_user))
                 from private.beta_testers b join auth.users u on u.id = b.user_id where b.user_id = p_user),
    'events', coalesce((select jsonb_agg(e order by (e->>'at')::timestamptz desc) from (
      select jsonb_build_object('at', at, 'kind', kind, 'site', site, 'title', title, 'detail', detail, 'seconds', seconds) as e
        from (
          select started_at as at, 'page' as kind, site, path as title, came_from as detail, seconds
            from private.page_views where user_id = p_user and started_at > v_since
          union all
          select created_at, 'onboarding', 'main', 'Finished onboarding', left(goal, 120), null
            from public.learner_profiles where user_id = p_user and created_at > v_since
          union all
          select c.created_at, 'course', 'main', 'Started a course', c.title, null
            from public.courses c where c.user_id = p_user and c.created_at > v_since
          union all
          select l.generated_at, 'lesson_opened', 'main', 'Opened a lesson', l.title, null
            from public.lessons l where l.user_id = p_user and l.generated_at > v_since
          union all
          select l.completed_at, 'lesson_finished', 'main', 'Finished a lesson',
                 l.title || coalesce(' · quiz ' || l.best_score || '%', ''), null
            from public.lessons l where l.user_id = p_user and l.completed_at > v_since
          union all
          select q.created_at, 'question', 'main', 'Asked the professor', q.kind || ': ' || left(q.question, 120), null
            from public.professor_questions q where q.user_id = p_user and q.created_at > v_since
          union all
          select a.created_at, 'assessment', 'main', case when a.passed then 'Passed a test' else 'Took a test' end, a.score || '%', null
            from public.assessment_attempts a where a.user_id = p_user and a.created_at > v_since
          union all
          select s.created_at, 'submission', 'code', case when s.solved then 'Solved a problem' else 'Submitted code' end,
                 s.problem || ' · ' || s.language || ' · ' || s.passed || '/' || s.total, null
            from public.coding_submissions s where s.user_id = p_user and s.created_at > v_since
          union all
          select r.created_at, 'coach', 'code', 'Used the AI coach', r.kind || ' · ' || r.problem, null
            from public.coding_coach_requests r where r.user_id = p_user and r.created_at > v_since
          union all
          select f.created_at, 'plan', 'code', 'Followed a study plan', f.plan, null
            from public.coding_plan_follows f where f.user_id = p_user and f.created_at > v_since
          union all
          select p.created_at, 'post', 'community', case p.kind when 'solution' then 'Shared a solution' else 'Started a discussion' end, p.title, null
            from public.community_posts p where p.author = p_user and p.created_at > v_since
          union all
          select c.created_at, 'comment', 'community', 'Commented', left(c.body, 120), null
            from public.community_comments c where c.author = p_user and c.created_at > v_since
          union all
          select f.created_at, 'feedback', f.site, 'Sent feedback', f.kind || ': ' || left(f.body, 120), null
            from private.feedback f where f.user_id = p_user and f.created_at > v_since
        ) x
       order by at desc limit 500) y), '[]'::jsonb));
end $$;

-- ── Grants ──────────────────────────────────────────────────────────────────────────────────────────────
do $$
declare f text;
begin
  foreach f in array array['public.activity_tracking()', 'public.activity_record(jsonb)', 'public.admin_beta_activity(int)',
                           'public.admin_beta_tester_activity(uuid, int)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
