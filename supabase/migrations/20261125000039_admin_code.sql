-- Admin panel 6.5 (plan.md Phase 6): Krpex Code — submissions and acceptance per problem, problems nobody solves,
-- runner errors and the AI coach. Read-only, admins only; nothing new is stored. Runner failures arrive in
-- public.app_errors as client errors whose message starts with "Code runner:" (components/code/use-runner.ts).
-- Coach cost comes from private.ai_cost_rows (migration 038), in rupees.
-- Run after 038. Safe to run twice.

create index if not exists coding_submissions_time_idx on public.coding_submissions (created_at desc);
create index if not exists coding_submissions_problem_idx on public.coding_submissions (problem, created_at desc);

create or replace function public.admin_code(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_days int := case when p_days in (7, 30, 90) then p_days else 30 end;
  v_first date := (now() at time zone 'Asia/Kolkata')::date - (v_days - 1);
  v_from timestamptz := v_first::timestamp at time zone 'Asia/Kolkata';
  r jsonb;
begin
  perform private.require_admin();
  with subs as materialized (
    select s.user_id, s.problem, s.language, s.solved, s.created_at from public.coding_submissions s where s.created_at >= v_from
  ), coach as materialized (
    select k.user_id, k.problem, k.kind, k.status, k.paid, k.created_at from public.coding_coach_requests k where k.created_at >= v_from
  ), per_problem as (
    select p.slug, p.title, p.topic, p.difficulty, p.position, p.active,
           (select count(*) from subs s where s.problem = p.slug) as submissions,
           (select count(*) from subs s where s.problem = p.slug and s.solved) as accepted,
           (select count(distinct s.user_id) from subs s where s.problem = p.slug) as tried,
           (select count(distinct s.user_id) from subs s where s.problem = p.slug and s.solved) as solvers,
           (select count(*) from public.coding_reveals v where v.problem = p.slug and v.created_at >= v_from) as reveals,
           (select count(*) from coach c where c.problem = p.slug) as coach,
           (select count(*) from public.coding_submissions s where s.problem = p.slug) as submissions_all
      from public.coding_problems p
  )
  select jsonb_build_object(
    'days', v_days,
    'submissions', (select count(*) from subs),
    'accepted', (select count(*) from subs where solved),
    'learners', (select count(distinct user_id) from subs),
    'solvers', (select count(distinct user_id) from subs where solved),
    'problems_solved', (select count(distinct problem) from subs where solved),
    'problems_active', (select count(*) from public.coding_problems where active),
    'languages', (select coalesce(jsonb_object_agg(language, n), '{}'::jsonb) from (select language, count(*) as n from subs group by language) x),
    'daily', (select jsonb_agg(jsonb_build_object(
        'day', dd,
        'submissions', (select count(*) from subs s where (s.created_at at time zone 'Asia/Kolkata')::date = dd),
        'accepted', (select count(*) from subs s where s.solved and (s.created_at at time zone 'Asia/Kolkata')::date = dd),
        'learners', (select count(distinct s.user_id) from subs s where (s.created_at at time zone 'Asia/Kolkata')::date = dd),
        'coach', (select count(*) from coach c where (c.created_at at time zone 'Asia/Kolkata')::date = dd)) order by dd desc)
      from generate_series(v_first, (now() at time zone 'Asia/Kolkata')::date, interval '1 day') g, lateral (select g::date as dd) x),
    'problems', (select coalesce(jsonb_agg(jsonb_build_object(
        'slug', slug, 'title', title, 'topic', topic, 'difficulty', difficulty, 'active', active,
        'submissions', submissions, 'accepted', accepted, 'tried', tried, 'solvers', solvers, 'reveals', reveals, 'coach', coach)
        order by submissions desc, position), '[]'::jsonb)
      from per_problem where submissions > 0 or reveals > 0 or coach > 0),
    -- Tried by at least 3 learners in the period, solved by under a quarter of them.
    'stuck', (select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'title', title, 'difficulty', difficulty,
        'tried', tried, 'solvers', solvers, 'reveals', reveals) order by solvers::numeric / tried, tried desc), '[]'::jsonb)
      from per_problem where tried >= 3 and solvers::numeric / tried < 0.25),
    'never_tried', (select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'title', title, 'difficulty', difficulty) order by position), '[]'::jsonb)
      from per_problem where active and submissions_all = 0),
    'coach', jsonb_build_object(
      'requests', (select count(*) from coach),
      'learners', (select count(distinct user_id) from coach),
      'failed', (select count(*) from coach where status = 'failed'),
      'paid', (select count(*) from coach where paid),
      'inr', (select round(coalesce(sum(inr), 0), 2) from private.ai_cost_rows(v_from) where feature = 'coach_reply'),
      'kinds', (select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'requests', n, 'answered', answered, 'failed', failed, 'paid', paid) order by n desc), '[]'::jsonb)
        from (select kind, count(*) as n, count(*) filter (where status = 'answered') as answered,
                     count(*) filter (where status = 'failed') as failed, count(*) filter (where paid) as paid
                from coach group by kind) x)),
    'runner_errors', (select coalesce(jsonb_agg(e order by e ->> 'last' desc), '[]'::jsonb) from (
        select jsonb_build_object('message', message, 'count', count(*), 'last', max(created_at), 'path', max(path), 'detail', max(detail)) as e
          from public.app_errors
         where created_at >= v_from and source = 'client' and message like 'Code runner:%'
         group by message order by max(created_at) desc limit 50) x)
  ) into r;
  return r;
end $$;
revoke all on function public.admin_code(int) from public, anon;
grant execute on function public.admin_code(int) to authenticated;
