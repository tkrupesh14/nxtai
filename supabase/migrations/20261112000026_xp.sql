-- 5.7: XP. A ledger of points, written only by database triggers when something is earned:
--   lesson passed 10 · perfect quiz (100%) +5 · module test passed 25 · final exam passed 50 ·
--   first study of the day (lesson passed or professor answered a question) 5.
-- Each reward has a key (e.g. 'lesson:<id>', 'day:2026-11-07') and is given once per learner, so retries,
-- regenerated lessons and re-takes never pay twice. Rows don't reference the course, so XP is kept when a
-- course is deleted (removed only with the account). Learners can read their own rows; nobody can write them.

create table if not exists public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null check (char_length(key) <= 80),
  points int not null check (points between 1 and 100),
  created_at timestamptz not null default now(),
  unique (user_id, key)
);
create index if not exists xp_events_user_time_idx on public.xp_events (user_id, created_at desc);

alter table public.xp_events enable row level security;
drop policy if exists "Read own" on public.xp_events;
create policy "Read own" on public.xp_events for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.xp_events from anon, authenticated;
grant select on public.xp_events to authenticated;

create or replace function private.award_xp(p_user uuid, p_key text, p_points int, p_at timestamptz default now())
returns void language sql security definer set search_path = '' as $$
  insert into public.xp_events (user_id, key, points, created_at) values (p_user, p_key, p_points, p_at)
  on conflict (user_id, key) do nothing;
$$;

-- The first study of an IST day.
create or replace function private.award_day_xp(p_user uuid, p_at timestamptz)
returns void language sql security definer set search_path = '' as $$
  select private.award_xp(p_user, 'day:' || to_char(p_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD'), 5, p_at);
$$;

create or replace function private.on_lesson_xp() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.completed_at is not null and old.completed_at is null then
    perform private.award_xp(new.user_id, 'lesson:' || new.id, 10);
    perform private.award_day_xp(new.user_id, new.completed_at);
  end if;
  if new.best_score = 100 and coalesce(old.best_score, 0) < 100 and new.completed_at is not null then
    perform private.award_xp(new.user_id, 'perfect:' || new.id, 5);
  end if;
  return null;
end $$;
drop trigger if exists lesson_xp on public.lessons;
create trigger lesson_xp after update of completed_at, best_score on public.lessons
  for each row execute function private.on_lesson_xp();

create or replace function private.on_assessment_xp() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.passed_at is not null and old.passed_at is null then
    perform private.award_xp(new.user_id, new.kind || ':' || new.id, case when new.kind = 'final' then 50 else 25 end);
    perform private.award_day_xp(new.user_id, new.passed_at);
  end if;
  return null;
end $$;
drop trigger if exists assessment_xp on public.assessments;
create trigger assessment_xp after update of passed_at on public.assessments
  for each row execute function private.on_assessment_xp();

create or replace function private.on_question_xp() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'answered' and (tg_op = 'INSERT' or old.status is distinct from 'answered') then
    perform private.award_day_xp(new.user_id, new.created_at);
  end if;
  return null;
end $$;
drop trigger if exists question_xp on public.professor_questions;
create trigger question_xp after insert or update of status on public.professor_questions
  for each row execute function private.on_question_xp();

-- The learner's total and last-7-days XP (IST days, today included).
create or replace function public.my_xp()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'total', coalesce(sum(points), 0),
    'week', coalesce(sum(points) filter (
      where (created_at at time zone 'Asia/Kolkata')::date > (now() at time zone 'Asia/Kolkata')::date - 7), 0))
  from public.xp_events where user_id = auth.uid();
$$;
revoke all on function public.my_xp() from public, anon;
grant execute on function public.my_xp() to authenticated;

do $$
declare f text;
begin
  foreach f in array array['award_xp(uuid, text, int, timestamptz)', 'award_day_xp(uuid, timestamptz)'] loop
    execute format('revoke all on function private.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- Backfill what learners already earned, dated when they earned it.
insert into public.xp_events (user_id, key, points, created_at)
select user_id, 'lesson:' || id, 10, completed_at from public.lessons where completed_at is not null
on conflict (user_id, key) do nothing;
insert into public.xp_events (user_id, key, points, created_at)
select user_id, 'perfect:' || id, 5, completed_at from public.lessons where completed_at is not null and best_score = 100
on conflict (user_id, key) do nothing;
insert into public.xp_events (user_id, key, points, created_at)
select user_id, kind || ':' || id, case when kind = 'final' then 50 else 25 end, passed_at
  from public.assessments where passed_at is not null
on conflict (user_id, key) do nothing;
insert into public.xp_events (user_id, key, points, created_at)
select user_id, 'day:' || to_char(t at time zone 'Asia/Kolkata', 'YYYY-MM-DD'), 5, min(t)
  from (
    select user_id, completed_at as t from public.lessons where completed_at is not null
    union all select user_id, passed_at from public.assessments where passed_at is not null
    union all select user_id, created_at from public.professor_questions where status = 'answered'
  ) a
 group by user_id, to_char(t at time zone 'Asia/Kolkata', 'YYYY-MM-DD')
on conflict (user_id, key) do nothing;
