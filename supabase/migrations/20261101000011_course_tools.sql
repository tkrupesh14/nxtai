-- Course tools: archive/unarchive a course, regenerate a lesson for credits, report a problem with a lesson.

-- Credits can now also be spent on lesson regeneration.
alter table public.credit_ledger drop constraint if exists credit_ledger_reason_check;
alter table public.credit_ledger add constraint credit_ledger_reason_check
  check (reason in ('purchase', 'grant', 'question', 'course', 'refund', 'adjust', 'regen'));

-- Archive or restore one of your own courses (learners can't update courses directly since migration 008).
create or replace function public.set_course_archived(p_course uuid, p_archived boolean)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare all_done boolean;
begin
  select not exists (select 1 from public.lessons l where l.course_id = p_course and l.completed_at is null)
    into all_done;
  update public.courses
     set status = case when p_archived then 'archived' when all_done then 'completed' else 'active' end
   where id = p_course and user_id = auth.uid();
  return found;
end $$;
revoke all on function public.set_course_archived(uuid, boolean) from public, anon;
grant execute on function public.set_course_archived(uuid, boolean) to authenticated;

-- Clear a written lesson so it is written again (server only). Costs 5 credits; max 5 a day.
-- Progress (attempts, best score, completion) is kept, so later lessons stay unlocked.
-- Returns: ok | not_found | not_written | no_credits | daily_limit
create or replace function public.app_reset_lesson(p_key text, p_lesson uuid)
returns table (result text, credits_left int)
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); l record; bal int; today int;
begin
  perform private.require_server_key(p_key);
  if uid is null then return query select 'not_found'::text, 0; return; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 44));
  select x.id, x.blocks, x.content_md into l from public.lessons x where x.id = p_lesson and x.user_id = uid for update;
  if not found then return query select 'not_found'::text, 0; return; end if;
  bal := public.credit_balance(uid);
  if l.blocks is null and l.content_md is null then return query select 'not_written'::text, bal; return; end if;
  select count(*) into today from public.credit_ledger c
   where c.user_id = uid and c.reason = 'regen' and c.created_at >= public.ist_day_start();
  if today >= 5 then return query select 'daily_limit'::text, bal; return; end if;
  if bal < 5 then return query select 'no_credits'::text, bal; return; end if;
  insert into public.credit_ledger (user_id, delta, reason, ref)
  values (uid, -5, 'regen', p_lesson::text || ':' || extract(epoch from clock_timestamp())::text);
  update public.lessons
     set blocks = null, content_md = null, key_takeaways = null, quiz = null, generated_at = null
   where id = p_lesson;
  return query select 'ok'::text, bal - 5;
end $$;
revoke all on function public.app_reset_lesson(text, uuid) from public, anon;
grant execute on function public.app_reset_lesson(text, uuid) to authenticated;

-- Problem reports on lessons (read by the team; learners can read their own).
create table if not exists public.lesson_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  reason text not null check (reason in ('wrong', 'confusing', 'broken', 'inappropriate', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);
create index if not exists lesson_reports_time_idx on public.lesson_reports (created_at desc);
alter table public.lesson_reports enable row level security;
drop policy if exists "Read own" on public.lesson_reports;
create policy "Read own" on public.lesson_reports for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.lesson_reports from anon, authenticated;
grant select on public.lesson_reports to authenticated;

-- Report a problem with one of your lessons (max 10 a day). Returns: ok | not_found | daily_limit
create or replace function public.report_lesson(p_lesson uuid, p_reason text, p_details text)
returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); today int;
begin
  if uid is null or not exists (select 1 from public.lessons l where l.id = p_lesson and l.user_id = uid) then
    return 'not_found';
  end if;
  select count(*) into today from public.lesson_reports r where r.user_id = uid and r.created_at >= public.ist_day_start();
  if today >= 10 then return 'daily_limit'; end if;
  insert into public.lesson_reports (user_id, lesson_id, reason, details)
  values (uid, p_lesson, p_reason, nullif(left(trim(coalesce(p_details, '')), 1000), ''));
  return 'ok';
end $$;
revoke all on function public.report_lesson(uuid, text, text) from public, anon;
grant execute on function public.report_lesson(uuid, text, text) to authenticated;
