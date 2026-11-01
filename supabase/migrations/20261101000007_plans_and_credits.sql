-- Plans and credits. Learners can only read their own rows; every write happens inside the
-- security-definer functions and triggers below (and, later, the payment webhook).
-- Plan limits (keep in sync with lib/learning/plans.ts):
--   free: 5 questions/day (3 per lesson), 15 quick answers/day, 2 new courses/month
--   pro:  40 questions/day (10 per lesson), 100 quick answers/day, 10 new courses/month
-- Credits are used once the daily or monthly allowance runs out: 1 per question, 20 per course.

create table if not exists public.user_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'past_due')),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  delta int not null check (delta <> 0),
  reason text not null check (reason in ('purchase', 'grant', 'question', 'course', 'refund', 'adjust')),
  ref text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);
create unique index if not exists credit_ledger_ref_once on public.credit_ledger (reason, ref);

-- Course creations are logged here (not counted from courses, which learners can delete).
create table if not exists public.course_creations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists course_creations_user_idx on public.course_creations (user_id, created_at desc);

alter table public.professor_questions add column if not exists paid boolean not null default false;

do $$
declare t text;
begin
  foreach t in array array['user_plans', 'credit_ledger', 'course_creations'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Read own" on public.%I', t);
    execute format('create policy "Read own" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

-- Internal helpers (not callable by learners).
create or replace function public.ist_day_start() returns timestamptz
language sql stable set search_path = '' as $$
  select date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' $$;

create or replace function public.ist_month_start() returns timestamptz
language sql stable set search_path = '' as $$
  select date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' $$;

create or replace function public.current_plan(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.plan from public.user_plans p
                    where p.user_id = p_user and p.status = 'active'
                      and (p.current_period_end is null or p.current_period_end > now())), 'free') $$;

create or replace function public.credit_balance(p_user uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(l.delta), 0)::int from public.credit_ledger l where l.user_id = p_user $$;

revoke all on function public.current_plan(uuid) from public, anon, authenticated;
revoke all on function public.credit_balance(uuid) from public, anon, authenticated;

-- What the account page and chat panel show.
create or replace function public.my_account_summary()
returns table (plan text, ask_day int, ask_lesson int, quick_day int, courses_month int,
               credits int, courses_used int, period_end timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p text;
begin
  if uid is null then return; end if;
  p := public.current_plan(uid);
  return query select p,
    case when p = 'pro' then 40 else 5 end,
    case when p = 'pro' then 10 else 3 end,
    case when p = 'pro' then 100 else 15 end,
    case when p = 'pro' then 10 else 2 end,
    public.credit_balance(uid),
    (select count(*)::int from public.course_creations c
      where c.user_id = uid and not c.paid and c.created_at >= public.ist_month_start()),
    (select up.current_period_end from public.user_plans up where up.user_id = uid);
end $$;
revoke all on function public.my_account_summary() from public, anon;
grant execute on function public.my_account_summary() to authenticated;

-- Questions: free daily allowance first, then credits. Replaces the version from migration 005.
drop function if exists public.take_question_credit(uuid, int, text, text);
create function public.take_question_credit(p_lesson uuid, p_section int, p_kind text, p_question text)
returns table (question_id uuid, reason text, used_today int, used_lesson int, paid boolean, credits_left int)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  day_start timestamptz := public.ist_day_start();
  is_ask boolean := p_kind = 'ask';
  p text;
  max_day int; max_lesson int;
  gap interval := case when is_ask then interval '10 seconds' else interval '2 seconds' end;
  n_day int; n_lesson int; f_day int; f_lesson int; last_at timestamptz;
  bal int; use_credit boolean := false; new_id uuid;
begin
  if uid is null then
    return query select null::uuid, 'auth'::text, 0, 0, false, 0; return;
  end if;
  if not exists (select 1 from public.lessons l where l.id = p_lesson and l.user_id = uid) then
    return query select null::uuid, 'not_found'::text, 0, 0, false, 0; return;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 42));
  p := public.current_plan(uid);
  max_day := case when is_ask then (case when p = 'pro' then 40 else 5 end) else (case when p = 'pro' then 100 else 15 end) end;
  max_lesson := case when is_ask then (case when p = 'pro' then 10 else 3 end) else max_day end;
  bal := public.credit_balance(uid);

  select count(*) filter (where q.status <> 'failed' and not q.paid),
         count(*) filter (where q.status <> 'failed' and not q.paid and q.lesson_id = p_lesson),
         count(*) filter (where q.status = 'failed' and not q.paid),
         count(*) filter (where q.status = 'failed' and not q.paid and q.lesson_id = p_lesson),
         max(q.created_at)
    into n_day, n_lesson, f_day, f_lesson, last_at
    from public.professor_questions q
   where q.user_id = uid and q.created_at >= day_start and (q.kind = 'ask') = is_ask;
  n_day := n_day + greatest(f_day - 2, 0);
  n_lesson := n_lesson + greatest(f_lesson - 2, 0);

  if last_at is not null and last_at > now() - gap then
    return query select null::uuid, 'slow_down'::text, n_day, n_lesson, false, bal; return;
  end if;
  if n_day >= max_day or n_lesson >= max_lesson then
    if is_ask and bal >= 1 then
      use_credit := true;
    else
      return query select null::uuid, (case when n_day >= max_day then 'daily_limit' else 'lesson_limit' end)::text,
                          n_day, n_lesson, false, bal;
      return;
    end if;
  end if;

  begin
    insert into public.professor_questions (user_id, lesson_id, section, kind, question, paid)
    values (uid, p_lesson, p_section, p_kind, left(p_question, 600), use_credit) returning id into new_id;
  exception when unique_violation then
    return query select null::uuid, 'busy'::text, n_day, n_lesson, false, bal; return;
  end;
  if use_credit then
    insert into public.credit_ledger (user_id, delta, reason, ref) values (uid, -1, 'question', new_id::text);
    bal := bal - 1;
    return query select new_id, null::text, n_day, n_lesson, true, bal;
  else
    return query select new_id, null::text, n_day + 1, n_lesson + 1, false, bal;
  end if;
end $$;
revoke all on function public.take_question_credit(uuid, int, text, text) from public, anon;
grant execute on function public.take_question_credit(uuid, int, text, text) to authenticated;

-- A paid question that fails is refunded (up to 2 a day, so a script can't loop failures for free).
create or replace function public.refund_failed_question() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.paid and old.status = 'pending' and new.status = 'failed' then
    if (select count(*) from public.professor_questions q
         where q.user_id = new.user_id and q.paid and q.status = 'failed'
           and q.created_at >= public.ist_day_start()) <= 2 then
      insert into public.credit_ledger (user_id, delta, reason, ref)
      values (new.user_id, 1, 'refund', new.id::text) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists refund_failed_question on public.professor_questions;
create trigger refund_failed_question after update of status on public.professor_questions
  for each row execute function public.refund_failed_question();

-- Before the AI call: can this learner create a course right now, and would it cost credits?
create or replace function public.course_allowance()
returns table (allowed boolean, reason text, free_left int, credits int, cost int)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p text; lim int; used int; today int; bal int;
begin
  if uid is null then return query select false, 'auth'::text, 0, 0, 20; return; end if;
  p := public.current_plan(uid);
  lim := case when p = 'pro' then 10 else 2 end;
  select count(*) filter (where not c.paid and c.created_at >= public.ist_month_start()),
         count(*) filter (where c.created_at >= public.ist_day_start())
    into used, today from public.course_creations c where c.user_id = uid;
  bal := public.credit_balance(uid);
  if today >= 3 then
    return query select false, 'daily_limit'::text, greatest(lim - used, 0), bal, 20; return;
  end if;
  if used < lim then
    return query select true, null::text, lim - used, bal, 0; return;
  end if;
  if bal >= 20 then
    return query select true, null::text, 0, bal, 20; return;
  end if;
  return query select false, 'monthly_limit'::text, 0, bal, 20;
end $$;
revoke all on function public.course_allowance() from public, anon;
grant execute on function public.course_allowance() to authenticated;

-- Every new course is charged here, so the limit holds even for direct API inserts.
create or replace function public.charge_course_creation() returns trigger
language plpgsql security definer set search_path = '' as $$
declare uid uuid := new.user_id; p text; lim int; used int; today int; bal int;
begin
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 43));
  p := public.current_plan(uid);
  lim := case when p = 'pro' then 10 else 2 end;
  select count(*) filter (where not c.paid and c.created_at >= public.ist_month_start()),
         count(*) filter (where c.created_at >= public.ist_day_start())
    into used, today from public.course_creations c where c.user_id = uid;
  if today >= 3 then
    raise exception 'course_daily_limit' using errcode = 'P0001';
  end if;
  if used < lim then
    insert into public.course_creations (user_id, course_id, paid) values (uid, new.id, false);
    return new;
  end if;
  bal := public.credit_balance(uid);
  if bal < 20 then
    raise exception 'course_monthly_limit' using errcode = 'P0001';
  end if;
  insert into public.credit_ledger (user_id, delta, reason, ref) values (uid, -20, 'course', new.id::text);
  insert into public.course_creations (user_id, course_id, paid) values (uid, new.id, true);
  return new;
end $$;
drop trigger if exists charge_course_creation on public.courses;
create trigger charge_course_creation before insert on public.courses
  for each row execute function public.charge_course_creation();
