-- 5.7b: streak freezes and level rewards (plan.md "XP and rewards").
-- - Study days are the 'day:' XP rows (migration 026); a used freeze also counts as a study day for the streak.
-- - Freezes: one at level 2 and one for every 7-day streak; a learner holds at most 2. When a day is missed and the
--   day before was a study day, the server uses one for the missed day (app_use_streak_freezes, every 10 minutes).
-- - Level rewards, given automatically once each when an XP row takes the learner to that level:
--   L2 freeze · L3 10 credits · L5 20 credits · L7 25 credits · L10 7 days of Pro + one free certificate ·
--   L15 50 credits · L20 100 credits. Mirrored in lib/learning/xp.ts (LEVEL_REWARDS).

create table if not exists public.streak_freezes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null check (char_length(key) <= 40),  -- 'level:2' or 'streak:<date>'
  earned_at timestamptz not null default now(),
  used_for date,                                       -- the missed IST day it covered
  used_at timestamptz,
  unique (user_id, key)
);
create unique index if not exists streak_freezes_day_once on public.streak_freezes (user_id, used_for) where used_for is not null;

create table if not exists public.level_rewards (
  user_id uuid not null references auth.users (id) on delete cascade,
  level int not null,
  granted_at timestamptz not null default now(),
  used_at timestamptz,                                 -- level 10: when the free certificate was used
  primary key (user_id, level)
);

alter table public.streak_freezes enable row level security;
alter table public.level_rewards enable row level security;
do $$
declare t text;
begin
  foreach t in array array['streak_freezes', 'level_rewards'] loop
    execute format('drop policy if exists "Read own" on public.%I', t);
    execute format('create policy "Read own" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'inbox_question', 'professor_reply', 'professor_confirmed',
  'professor_approved', 'professor_suspended', 'professor_live', 'professor_hidden', 'review_new',
  'payment_paid', 'payment_failed', 'credits_granted', 'pro_granted', 'report_resolved',
  'admin_professor_joined', 'admin_listing_requested', 'admin_report',
  'reminder_streak', 'reminder_continue', 'reminder_freeze_used', 'level_reward'
));

create or replace function private.notification_topic(p_kind text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_kind in ('professor_reply', 'professor_confirmed', 'report_resolved') then 'learning'
    when p_kind in ('payment_paid', 'payment_failed', 'credits_granted', 'pro_granted', 'level_reward') then 'account'
    when p_kind like 'reminder\_%' then 'reminders'
    when p_kind like 'admin\_%' then 'admin'
    else 'teaching'
  end
$$;

-- A study day: an XP day row or a used freeze.
create or replace function private.studied_on(p_user uuid, p_day date) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.xp_events where user_id = p_user and key = 'day:' || to_char(p_day, 'YYYY-MM-DD'))
      or exists (select 1 from public.streak_freezes where user_id = p_user and used_for = p_day);
$$;

-- Length of the streak ending on p_day (0 if p_day wasn't a study day).
create or replace function private.streak_on(p_user uuid, p_day date) returns int
language plpgsql stable security definer set search_path = '' as $$
declare n int := 0;
begin
  while n < 1000 and private.studied_on(p_user, p_day - n) loop n := n + 1; end loop;
  return n;
end $$;

create or replace function private.give_freeze(p_user uuid, p_key text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.streak_freezes where user_id = p_user and used_for is null) < 2 then
    insert into public.streak_freezes (user_id, key) values (p_user, p_key) on conflict (user_id, key) do nothing;
  end if;
end $$;

-- Replaces 026's version: also earns a freeze when the new study day completes a 7-day run.
create or replace function private.award_day_xp(p_user uuid, p_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare d date := (p_at at time zone 'Asia/Kolkata')::date; n int;
begin
  insert into public.xp_events (user_id, key, points, created_at)
  values (p_user, 'day:' || to_char(d, 'YYYY-MM-DD'), 5, p_at)
  on conflict (user_id, key) do nothing;
  if not found then return; end if;
  n := private.streak_on(p_user, d);
  if n > 0 and n % 7 = 0 then perform private.give_freeze(p_user, 'streak:' || to_char(d, 'YYYY-MM-DD')); end if;
end $$;

create or replace function private.xp_level(p_total int) returns int
language plpgsql immutable set search_path = '' as $$
declare l int := 1;
begin
  while 25 * (l + 1) * l <= p_total and l < 10000 loop l := l + 1; end loop;
  return l;
end $$;

-- Give every ladder reward up to the learner's current level that they don't have yet.
create or replace function private.grant_level_rewards(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  lvl int := private.xp_level((select coalesce(sum(points), 0)::int from public.xp_events where user_id = p_user));
  r record;
begin
  for r in
    select * from (values
      (2, 0, 0, 'A streak freeze', 'If you miss a day, it keeps your streak going.'),
      (3, 10, 0, '10 bonus credits', 'Credits are used once your free questions and courses run out.'),
      (5, 20, 0, '20 bonus credits', 'Enough for one extra course.'),
      (7, 25, 0, '25 bonus credits', 'Credits are used once your free questions and courses run out.'),
      (10, 0, 7, '7 days of Pro and a free certificate', 'Pro is on now. Your free certificate is kept until you use it.'),
      (15, 50, 0, '50 bonus credits', 'Credits are used once your free questions and courses run out.'),
      (20, 100, 0, '100 bonus credits', 'Credits are used once your free questions and courses run out.')
    ) as ladder (level, credits, pro_days, what, note)
    where level <= lvl
    order by level
  loop
    insert into public.level_rewards (user_id, level) values (p_user, r.level) on conflict do nothing;
    continue when not found;
    if r.level = 2 then perform private.give_freeze(p_user, 'level:2'); end if;
    if r.credits > 0 then
      insert into public.credit_ledger (user_id, delta, reason, ref, note)
      values (p_user, r.credits, 'grant', 'level:' || p_user || ':' || r.level, 'Level ' || r.level || ' reward')
      on conflict do nothing;
    end if;
    if r.pro_days > 0 then
      insert into public.user_plans (user_id, plan, status, current_period_end, updated_at)
      values (p_user, 'pro', 'active', now() + make_interval(days => r.pro_days), now())
      on conflict (user_id) do update
        set plan = 'pro', status = 'active', updated_at = now(),
            current_period_end = greatest(coalesce(public.user_plans.current_period_end, now()), now())
                                 + make_interval(days => r.pro_days);
    end if;
    perform private.notify(p_user, 'level_reward', 'Level ' || r.level || '! You earned ' || lower(left(r.what, 1)) || substr(r.what, 2),
                           r.note, '/learn', null);
  end loop;
end $$;

create or replace function private.on_xp_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.grant_level_rewards(new.user_id);
  return null;
end $$;
drop trigger if exists xp_level_rewards on public.xp_events;
create trigger xp_level_rewards after insert on public.xp_events
  for each row execute function private.on_xp_event();

-- Server job: cover yesterday with a freeze for learners who missed it with a streak running. Safe to run often.
create or replace function public.app_use_streak_freezes(p_key text) returns int
language plpgsql security definer set search_path = '' as $$
declare
  yesterday date := (now() at time zone 'Asia/Kolkata')::date - 1;
  r record; f bigint; n int; used int := 0;
begin
  perform private.require_server_key(p_key);
  for r in select distinct user_id from public.streak_freezes where used_for is null loop
    continue when private.studied_on(r.user_id, yesterday) or not private.studied_on(r.user_id, yesterday - 1);
    select id into f from public.streak_freezes where user_id = r.user_id and used_for is null order by earned_at, id limit 1 for update;
    continue when f is null;
    update public.streak_freezes set used_for = yesterday, used_at = now() where id = f;
    n := private.streak_on(r.user_id, yesterday);
    perform private.notify(r.user_id, 'reminder_freeze_used', 'Streak freeze used: your ' || n || '-day streak is safe',
                           'You missed yesterday, so a streak freeze covered it. Study today to keep it going.', '/learn', null);
    used := used + 1;
  end loop;
  return used;
end $$;
revoke all on function public.app_use_streak_freezes(text) from public;
grant execute on function public.app_use_streak_freezes(text) to anon, authenticated;

-- Replaces 025's version: the streak counts study days (XP day rows) and frozen days.
create or replace function public.app_create_reminders(p_key text) returns int
language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Kolkata')::date;
  day_start timestamptz := (now() at time zone 'Asia/Kolkata')::date::timestamp at time zone 'Asia/Kolkata';
  r record;
  made int := 0;
begin
  perform private.require_server_key(p_key);

  -- Keep your streak: a run of 2+ study days ending yesterday, nothing yet today.
  for r in
    with act as (
      select user_id, to_date(substr(key, 5), 'YYYY-MM-DD') as d
        from public.xp_events where key like 'day:%' and created_at > now() - interval '40 days'
      union
      select user_id, used_for from public.streak_freezes where used_for > today - 40
    ), runs as (
      select user_id, d, d - (row_number() over (partition by user_id order by d))::int as grp
        from act where d < today
    )
    select user_id, count(*)::int as n from runs
     group by user_id, grp
    having max(d) = today - 1 and count(*) >= 2
  loop
    continue when exists (select 1 from public.notification_email_settings s where s.user_id = r.user_id and not s.reminders)
               or private.studied_on(r.user_id, today)
               or exists (select 1 from public.notifications n
                           where n.user_id = r.user_id and n.kind = 'reminder_streak' and n.created_at >= day_start);
    perform private.notify(r.user_id, 'reminder_streak', 'Keep your ' || r.n || '-day streak going',
                           'Finish a lesson or ask your professor a question today to keep it.', '/learn', null);
    made := made + 1;
  end loop;

  -- Continue your course: the latest active course with a lesson left, after 3–30 quiet days.
  for r in
    select distinct on (c.user_id) c.user_id, c.id as course_id, c.title as course_title,
           (select l.id from public.lessons l where l.course_id = c.id and l.completed_at is null order by l.position limit 1) as lesson_id,
           (select l.title from public.lessons l where l.course_id = c.id and l.completed_at is null order by l.position limit 1) as lesson_title
      from public.courses c
     where c.status = 'active'
       and exists (select 1 from public.lessons l where l.course_id = c.id and l.completed_at is null)
     order by c.user_id, c.created_at desc
  loop
    continue when exists (select 1 from public.notification_email_settings s where s.user_id = r.user_id and not s.reminders)
               or exists (select 1 from public.notifications n where n.user_id = r.user_id
                           and ((n.kind = 'reminder_continue' and n.created_at > now() - interval '7 days')
                                or (n.kind = 'reminder_streak' and n.created_at >= day_start)));
    continue when not coalesce((
      select greatest(
               (select max(created_at) from public.courses where user_id = r.user_id),
               (select max(completed_at) from public.lessons where user_id = r.user_id),
               (select max(created_at) from public.professor_questions where user_id = r.user_id and status = 'answered'))
             between now() - interval '30 days' and now() - interval '3 days'), false);
    perform private.notify(r.user_id, 'reminder_continue', 'Continue ' || left(r.course_title, 150),
                           'Next: ' || r.lesson_title, '/learn/' || r.course_id || '/' || r.lesson_id, r.course_id);
    made := made + 1;
  end loop;
  return made;
end $$;

-- Replaces 014's version: a learner without Pro can use their level-10 free certificate.
create or replace function public.issue_certificate(p_course uuid, p_name text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c record; ex record; existing text; nm text; new_code text; mins int; n int; free boolean := false;
begin
  if uid is null then return jsonb_build_object('error', 'not_passed'); end if;
  select x.id, x.title, x.level into c from public.courses x where x.id = p_course and x.user_id = uid;
  if not found then return jsonb_build_object('error', 'not_passed'); end if;
  select x.best_score, x.passed_at into ex from public.assessments x where x.course_id = p_course and x.kind = 'final';
  if not found or ex.passed_at is null then return jsonb_build_object('error', 'not_passed'); end if;

  perform pg_advisory_xact_lock(hashtextextended(p_course::text, 15));
  select x.code into existing from public.certificates x where x.course_id = p_course;
  if existing is not null then return jsonb_build_object('code', existing); end if;

  if public.current_plan(uid) <> 'pro' then
    perform 1 from public.level_rewards where user_id = uid and level = 10 and used_at is null for update;
    if not found then return jsonb_build_object('error', 'pro_only'); end if;
    free := true;
  end if;
  nm := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  if char_length(nm) not between 2 and 80 or nm ~ '[<>{}\[\]\\/@:]' then
    return jsonb_build_object('error', 'bad_name');
  end if;

  select count(*), coalesce(sum(l.est_minutes), 0) into n, mins from public.lessons l where l.course_id = p_course;
  loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    exit when not exists (select 1 from public.certificates x where x.code = new_code);
  end loop;
  insert into public.certificates (code, user_id, course_id, full_name, course_title, course_level, lesson_count, total_minutes, score)
  values (new_code, uid, p_course, nm, c.title, c.level, n, mins, ex.best_score);
  if free then update public.level_rewards set used_at = now() where user_id = uid and level = 10; end if;
  return jsonb_build_object('code', new_code);
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'studied_on(uuid, date)', 'streak_on(uuid, date)', 'give_freeze(uuid, text)', 'award_day_xp(uuid, timestamptz)',
    'grant_level_rewards(uuid)'
  ] loop
    execute format('revoke all on function private.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- Learners who already have levels get their rewards now (with a notification each).
do $$
declare u uuid;
begin
  for u in select distinct user_id from public.xp_events loop
    perform private.grant_level_rewards(u);
  end loop;
end $$;
