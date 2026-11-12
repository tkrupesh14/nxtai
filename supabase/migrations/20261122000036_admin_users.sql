-- Admin panel 6.2 (plan.md Phase 6): a paged, filtered users list, one page per learner and an admin audit log.
-- Read through admin-only functions; nothing new is readable by learners. Every write stays in the existing
-- admin functions, which now also record what was done in private.admin_log.

create table if not exists private.admin_log (
  id bigint generated always as identity primary key,
  admin uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) <= 60),
  user_id uuid references auth.users (id) on delete set null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists admin_log_user_idx on private.admin_log (user_id, created_at desc);
create index if not exists admin_log_time_idx on private.admin_log (created_at desc);
alter table private.admin_log enable row level security;
revoke all on private.admin_log from public, anon, authenticated;

create index if not exists credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);
create index if not exists coding_submissions_user_idx on public.coding_submissions (user_id, created_at desc);
create index if not exists community_posts_author_idx on public.community_posts (author, created_at desc);

-- As in migration 023 (same checks and notifications), plus a line in the audit log (credits and Pro days given, with the admin's note).
create or replace function public.admin_grant(p_email text, p_credits int, p_pro_days int, p_note text)
returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  perform private.require_admin();
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then return 'not_found'; end if;
  if coalesce(p_credits, 0) = 0 and coalesce(p_pro_days, 0) <= 0 then return 'nothing'; end if;
  if coalesce(p_credits, 0) <> 0 then
    insert into public.credit_ledger (user_id, delta, reason, note)
    values (uid, least(greatest(p_credits, -100000), 100000), case when p_credits > 0 then 'grant' else 'adjust' end,
            left(coalesce(nullif(trim(p_note), ''), 'admin'), 200));
    if p_credits > 0 then
      perform private.notify(uid, 'credits_granted', 'Krpex added ' || least(p_credits, 100000) || ' credits to your account',
                             'Credits are used once your free questions and courses run out.', '/account', null);
    end if;
  end if;
  if coalesce(p_pro_days, 0) > 0 then
    insert into public.user_plans (user_id, plan, status, current_period_end, updated_at)
    values (uid, 'pro', 'active', now() + make_interval(days => least(p_pro_days, 3650)), now())
    on conflict (user_id) do update
      set plan = 'pro', status = 'active', updated_at = now(),
          current_period_end = greatest(coalesce(public.user_plans.current_period_end, now()), now())
                               + make_interval(days => least(p_pro_days, 3650));
    perform private.notify(uid, 'pro_granted', 'Krpex gave you Pro for ' || least(p_pro_days, 3650) || ' days',
                           'More questions and courses every day.', '/account', null);
  end if;
  insert into private.admin_log (admin, action, user_id, detail)
  values (auth.uid(), 'grant', uid, jsonb_strip_nulls(jsonb_build_object(
    'credits', nullif(least(greatest(coalesce(p_credits, 0), -100000), 100000), 0),
    'pro_days', nullif(least(greatest(coalesce(p_pro_days, 0), 0), 3650), 0),
    'note', nullif(left(trim(coalesce(p_note, '')), 200), ''))));
  return 'ok';
end $$;

-- Users, paged and filtered. p_plan: all | free | pro. p_active: all | 7d | 30d | quiet (no sign-in for 30 days).
-- p_sort: joined | seen. Returns { total, rows: [...] }.
create or replace function public.admin_user_list(p_search text default '', p_plan text default 'all', p_active text default 'all',
                                                  p_sort text default 'joined', p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  s text := '%' || lower(btrim(coalesce(p_search, ''))) || '%';
  lim int := least(greatest(coalesce(p_limit, 50), 1), 100);
  off int := least(greatest(coalesce(p_offset, 0), 0), 100000);
  r jsonb;
begin
  perform private.require_admin();
  with base as (
    select u.id, u.email::text as email, p.full_name, u.created_at, u.last_sign_in_at,
           public.current_plan(u.id) as plan, pp.handle
      from auth.users u
      left join public.users p on p.id = u.id
      left join public.public_profiles pp on pp.user_id = u.id
     where (lower(coalesce(u.email, '')) like s or lower(coalesce(p.full_name, '')) like s or lower(coalesce(pp.handle, '')) like s)
       and (case coalesce(p_active, 'all')
              when '7d' then u.last_sign_in_at >= now() - interval '7 days'
              when '30d' then u.last_sign_in_at >= now() - interval '30 days'
              when 'quiet' then u.last_sign_in_at is null or u.last_sign_in_at < now() - interval '30 days'
              else true end)
  ), filtered as (
    select * from base where coalesce(p_plan, 'all') = 'all' or plan = p_plan
  ), page as (
    select f.* from filtered f
     order by case when p_sort = 'seen' then f.last_sign_in_at end desc nulls last, f.created_at desc, f.id
     limit lim offset off
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
        'id', pg.id, 'email', pg.email, 'full_name', pg.full_name, 'handle', pg.handle,
        'created_at', pg.created_at, 'last_sign_in_at', pg.last_sign_in_at, 'plan', pg.plan,
        'credits', public.credit_balance(pg.id),
        'courses', (select count(*) from public.courses c where c.user_id = pg.id),
        'level', private.user_level(pg.id),
        'solved', (select count(distinct cs.problem) from public.coding_submissions cs where cs.user_id = pg.id and cs.solved),
        'banned', exists (select 1 from private.community_bans b where b.user_id = pg.id and (b.until is null or b.until > now()))
      ) order by case when p_sort = 'seen' then pg.last_sign_in_at end desc nulls last, pg.created_at desc, pg.id) from page pg), '[]'::jsonb)
  ) into r;
  return r;
end $$;

-- Everything about one learner, for /admin/users/<id>. Null if there is no such account.
-- AI cost here covers what is stored per learner (Ask the professor and the coding coach); course plans and
-- lessons are counted, not costed, until AI usage is logged per learner (6.4).
create or replace function public.admin_user(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u record; r jsonb;
begin
  perform private.require_admin();
  select au.id, au.email::text as email, au.created_at, au.last_sign_in_at, au.email_confirmed_at,
         to_jsonb(au) -> 'raw_app_meta_data' -> 'providers' as providers, p.full_name
    into u
    from auth.users au left join public.users p on p.id = au.id
   where au.id = p_user;
  if u.id is null then return null; end if;

  select jsonb_build_object(
    'account', jsonb_build_object(
      'id', u.id, 'email', u.email, 'full_name', u.full_name, 'created_at', u.created_at,
      'last_sign_in_at', u.last_sign_in_at, 'email_confirmed_at', u.email_confirmed_at,
      'providers', coalesce(u.providers, '[]'::jsonb),
      'admin', exists (select 1 from private.admins a where a.user_id = u.id),
      'professor', (select jsonb_build_object('id', pr.id, 'status', pr.status, 'name', pr.display_name) from public.professors pr where pr.user_id = u.id)),
    'learner', (select jsonb_build_object('goal', lp.goal, 'level', lp.level, 'language', lp.language, 'hours_per_week', lp.hours_per_week)
                  from public.learner_profiles lp where lp.user_id = u.id),
    'plan', (select jsonb_build_object('plan', public.current_plan(u.id), 'status', up.status, 'period_end', up.current_period_end)
               from (select 1) x left join public.user_plans up on up.user_id = u.id),
    'credits', public.credit_balance(u.id),
    'ledger', coalesce((select jsonb_agg(l order by l.created_at desc) from (
        select cl.delta, cl.reason, cl.note, cl.ref, cl.created_at from public.credit_ledger cl
         where cl.user_id = u.id order by cl.created_at desc limit 30) l), '[]'::jsonb),
    'xp', (select jsonb_build_object('total', coalesce(sum(x.points), 0), 'level', private.xp_level(coalesce(sum(x.points), 0)::int),
                    'week', coalesce(sum(x.points) filter (where x.created_at >= now() - interval '7 days'), 0),
                    'last', max(x.created_at))
             from public.xp_events x where x.user_id = u.id),
    'courses', coalesce((select jsonb_agg(c order by c.created_at desc) from (
        select co.id, co.title, co.category, co.status, co.language, co.created_at,
               (select count(*) from public.lessons l where l.course_id = co.id) as lessons,
               (select count(*) from public.lessons l where l.course_id = co.id and l.completed_at is not null) as passed,
               (select max(l.completed_at) from public.lessons l where l.course_id = co.id) as last_passed,
               (select ce.code from public.certificates ce where ce.course_id = co.id limit 1) as certificate
          from public.courses co where co.user_id = u.id order by co.created_at desc limit 50) c), '[]'::jsonb),
    'ai', jsonb_build_object(
      'lessons_written', (select count(*) from public.lessons l where l.user_id = u.id and l.generated_at is not null),
      'courses_created', (select count(*) from public.courses c where c.user_id = u.id),
      'questions', (select count(*) from public.professor_questions q where q.user_id = u.id and q.status = 'answered'),
      'questions_30d', (select count(*) from public.professor_questions q where q.user_id = u.id and q.status = 'answered' and q.created_at >= now() - interval '30 days'),
      'coach', (select count(*) from public.coding_coach_requests k where k.user_id = u.id and k.status = 'answered'),
      'coach_30d', (select count(*) from public.coding_coach_requests k where k.user_id = u.id and k.status = 'answered' and k.created_at >= now() - interval '30 days'),
      'usd', round((
          coalesce((select sum(q.tokens_in) * 0.10 + sum(q.tokens_out) * 0.50 from public.professor_questions q where q.user_id = u.id), 0)
        + coalesce((select sum(k.tokens_in) * 0.10 + sum(k.tokens_out) * 0.50 from public.coding_coach_requests k where k.user_id = u.id), 0)) / 1e6, 4),
      'usd_30d', round((
          coalesce((select sum(q.tokens_in) * 0.10 + sum(q.tokens_out) * 0.50 from public.professor_questions q where q.user_id = u.id and q.created_at >= now() - interval '30 days'), 0)
        + coalesce((select sum(k.tokens_in) * 0.10 + sum(k.tokens_out) * 0.50 from public.coding_coach_requests k where k.user_id = u.id and k.created_at >= now() - interval '30 days'), 0)) / 1e6, 4)),
    'payments', coalesce((select jsonb_agg(o order by o.created_at desc) from (
        select po.created_at, po.paid_at, po.product, po.amount_paise, po.status, po.razorpay_payment_id
          from public.payment_orders po where po.user_id = u.id order by po.created_at desc limit 50) o), '[]'::jsonb),
    'code', jsonb_build_object(
      'solved', (select count(distinct cs.problem) from public.coding_submissions cs where cs.user_id = u.id and cs.solved),
      'submissions', (select count(*) from public.coding_submissions cs where cs.user_id = u.id),
      'plans', (select count(*) from public.coding_plan_follows f where f.user_id = u.id),
      'recent', coalesce((select jsonb_agg(s order by s.created_at desc) from (
          select cs.problem, cp.title, cs.language, cs.passed, cs.total, cs.solved, cs.created_at
            from public.coding_submissions cs join public.coding_problems cp on cp.slug = cs.problem
           where cs.user_id = u.id order by cs.created_at desc limit 20) s), '[]'::jsonb)),
    'community', jsonb_build_object(
      'profile', (select jsonb_build_object('handle', pp.handle, 'display_name', pp.display_name, 'is_public', pp.is_public, 'hidden', pp.hidden)
                    from public.public_profiles pp where pp.user_id = u.id),
      'ban', (select jsonb_build_object('until', b.until, 'reason', b.reason, 'at', b.created_at)
                from private.community_bans b where b.user_id = u.id and (b.until is null or b.until > now())),
      'posts', (select count(*) from public.community_posts p where p.author = u.id and p.status <> 'deleted'),
      'comments', (select count(*) from public.community_comments c where c.author = u.id and c.status <> 'deleted'),
      'removed', (select count(*) from public.community_posts p where p.author = u.id and p.status = 'removed')
               + (select count(*) from public.community_comments c where c.author = u.id and c.status = 'removed'),
      'reports_received', (select count(*) from public.community_reports cr
                             left join public.community_posts p on p.id = cr.post_id
                             left join public.community_comments c on c.id = cr.comment_id
                            where coalesce(p.author, c.author) = u.id),
      'reports_made', (select count(*) from public.community_reports cr where cr.reporter = u.id),
      'recent', coalesce((select jsonb_agg(x order by x.created_at desc) from (
          select p.id, p.title, p.kind, p.status, p.score, p.comment_count, p.created_at, private.post_path(p) as path
            from public.community_posts p where p.author = u.id and p.status <> 'deleted' order by p.created_at desc limit 10) x), '[]'::jsonb)),
    'lesson_reports', coalesce((select jsonb_agg(x order by x.created_at desc) from (
        select lr.reason, lr.details, lr.status, lr.created_at, l.title as lesson
          from public.lesson_reports lr join public.lessons l on l.id = lr.lesson_id
         where lr.user_id = u.id order by lr.created_at desc limit 10) x), '[]'::jsonb),
    'audit', coalesce((select jsonb_agg(a order by a.at desc) from (
        select * from private.admin_audit_rows(u.id) limit 30) a), '[]'::jsonb)
  ) into r;
  return r;
end $$;

-- What admins did, newest first: this log plus the community moderation log (bans, hidden profiles, removed posts).
create or replace function private.admin_audit_rows(p_user uuid)
returns table (at timestamptz, admin text, action text, user_id uuid, email text, detail jsonb)
language sql stable security definer set search_path = '' as $$
  select x.at, a.email::text, x.action, x.user_id, t.email::text, x.detail from (
    select l.created_at as at, l.admin, l.action, l.user_id, l.detail from private.admin_log l
     where p_user is null or l.user_id = p_user
    union all
    select m.created_at, m.admin, m.action,
           coalesce(m.user_id, p.author, c.author),
           jsonb_strip_nulls(jsonb_build_object('reason', m.reason, 'post', m.post_id, 'comment', m.comment_id))
      from private.community_mod_log m
      left join public.community_posts p on p.id = m.post_id
      left join public.community_comments c on c.id = m.comment_id
     where p_user is null or coalesce(m.user_id, p.author, c.author) = p_user
  ) x
  left join auth.users a on a.id = x.admin
  left join auth.users t on t.id = x.user_id
  order by x.at desc;
$$;

create or replace function public.admin_audit(p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return coalesce((select jsonb_agg(a) from (
    select * from private.admin_audit_rows(null)
     limit least(greatest(coalesce(p_limit, 50), 1), 200) offset least(greatest(coalesce(p_offset, 0), 0), 100000)) a), '[]'::jsonb);
end $$;

revoke all on function private.admin_audit_rows(uuid) from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'public.admin_user_list(text, text, text, text, int, int)',
    'public.admin_user(uuid)',
    'public.admin_audit(int, int)',
    'public.admin_grant(text, int, int, text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
