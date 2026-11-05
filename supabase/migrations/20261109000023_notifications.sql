-- 9.1 + 9.2: notifications, which also drive live updates.
--
-- Database triggers write a row for each person something happened to (a learner asked the professor to check an
-- answer, the professor replied, a payment went through, …). Each signed-in tab listens to its own rows over
-- Supabase Realtime: it shows the notification and refreshes the data on screen. A row only says what its reader
-- may see: the professor's "new question" never names the learner.
--
-- Rows are written only here (security definer); people read their own and mark them read through
-- mark_notifications_read(). Kept 90 days.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in (
    'inbox_question', 'professor_reply', 'professor_confirmed',
    'professor_approved', 'professor_suspended', 'professor_live', 'professor_hidden', 'review_new',
    'payment_paid', 'payment_failed', 'credits_granted', 'pro_granted', 'report_resolved',
    'admin_professor_joined', 'admin_listing_requested', 'admin_report'
  )),
  title text not null check (char_length(title) between 1 and 200),
  body text check (char_length(body) <= 300),
  -- A path on this site ("/teach#inbox"), never another site.
  link text check (link ~ '^/[A-Za-z0-9]' and char_length(link) <= 300),
  -- What it is about (a flag, an order, …): a newer unread notification about the same thing replaces the older one.
  ref uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon, authenticated;
drop policy if exists "Read own notifications" on public.notifications;
create policy "Read own notifications" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.notifications to authenticated;

-- Live updates: Realtime sends each inserted row to its owner only (it checks the policy above).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- Mark some (p_ids) or all (null) of your notifications read. Returns how many are still unread.
create or replace function public.mark_notifications_read(p_ids uuid[]) returns int
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  update public.notifications set read_at = now()
   where user_id = uid and read_at is null and (p_ids is null or id = any (p_ids));
  return (select count(*) from public.notifications where user_id = uid and read_at is null);
end $$;
revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

create or replace function private.notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text, p_ref uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null then return; end if;
  delete from public.notifications
   where user_id = p_user
     and (created_at < now() - interval '90 days'
          or (p_ref is not null and ref = p_ref and kind = p_kind and read_at is null));
  insert into public.notifications (user_id, kind, title, body, link, ref)
  values (p_user, p_kind, left(p_title, 200), nullif(left(btrim(regexp_replace(coalesce(p_body, ''), '\s+', ' ', 'g')), 300), ''),
          p_link, p_ref);
end $$;

create or replace function private.notify_admins(p_kind text, p_title text, p_body text, p_link text, p_ref uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare a uuid;
begin
  for a in select user_id from private.admins loop
    perform private.notify(a, p_kind, p_title, p_body, p_link, p_ref);
  end loop;
end $$;

-- ── Professor inbox ──────────────────────────────────────────────────────────────────────────────────────────
create or replace function private.on_professor_flag() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  prof public.professors;
  lesson_path text;
begin
  select * into prof from public.professors where id = new.professor_id;
  if tg_op = 'INSERT' then
    perform private.notify(prof.user_id, 'inbox_question', 'A learner asked you to check an answer',
                           '“' || new.question || '” · ' || new.lesson_title, '/teach#inbox', new.id);
    return new;
  end if;
  if new.status = 'open' or (new.status is not distinct from old.status
                             and new.professor_reply is not distinct from old.professor_reply) then
    return new;
  end if;
  select '/learn/' || l.course_id || '/' || l.id || '?ask=1' into lesson_path
    from public.professor_questions q join public.lessons l on l.id = q.lesson_id
   where q.id = new.question_id;
  if new.status = 'answered' then
    perform private.notify(new.user_id, 'professor_reply', prof.display_name || ' replied to your question',
                           new.professor_reply, lesson_path, new.id);
  else
    perform private.notify(new.user_id, 'professor_confirmed', prof.display_name || ' checked the AI''s answer: it''s right',
                           new.question, lesson_path, new.id);
  end if;
  return new;
end $$;
drop trigger if exists notify_professor_flag on public.professor_flags;
create trigger notify_professor_flag after insert or update on public.professor_flags
  for each row execute function private.on_professor_flag();

-- ── Professor account ────────────────────────────────────────────────────────────────────────────────────────
create or replace function private.on_professor() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify_admins('admin_professor_joined', new.display_name || ' joined as a professor',
                                  'Check their profile and approve them.', '/admin', new.id);
    return new;
  end if;
  if new.status is distinct from old.status then
    if new.status = 'approved' then
      perform private.notify(new.user_id, 'professor_approved', 'Krpex approved your professor account',
                             'You can now publish material, write model lessons and review AI lessons.', '/teach', new.id);
    elsif new.status = 'suspended' then
      perform private.notify(new.user_id, 'professor_suspended', 'Krpex paused your professor account',
                             'Learners don''t see your AI professor for now. Write to us if you have questions.', '/teach', new.id);
    end if;
  end if;
  if new.live_at is not null and old.live_at is null then
    perform private.notify(new.user_id, 'professor_live', 'Your AI professor is live',
                           'Learners can now choose it for their courses.', '/teach', new.id);
  elsif new.live_at is null and old.live_at is not null then
    perform private.notify(new.user_id, 'professor_hidden', 'Your AI professor is hidden from learners',
                           'Courses it already teaches switch to the standard AI professor.', '/teach', new.id);
  end if;
  if new.listing_requested and not old.listing_requested and new.live_at is null then
    perform private.notify_admins('admin_listing_requested', new.display_name || ' asked to show their AI professor',
                                  'Check their profile and material, then make it live.', '/admin', new.id);
  end if;
  return new;
end $$;
drop trigger if exists notify_professor on public.professors;
create trigger notify_professor after insert or update on public.professors
  for each row execute function private.on_professor();

-- New AI lessons to review: the approved professors of that subject and language.
create or replace function private.on_review_lesson() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p record;
begin
  if new.status <> 'open' then return new; end if;
  for p in select user_id from public.professors
            where status = 'approved' and subject = new.subject and new.language = any (languages) loop
    perform private.notify(p.user_id, 'review_new', 'A new AI lesson to review', new.title, '/teach#reviews', null);
  end loop;
  return new;
end $$;
drop trigger if exists notify_review_lesson on public.review_lessons;
create trigger notify_review_lesson after insert on public.review_lessons
  for each row execute function private.on_review_lesson();

-- ── Payments and grants ──────────────────────────────────────────────────────────────────────────────────────
create or replace function private.on_payment_order() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status = 'paid' then
    perform private.notify(new.user_id, 'payment_paid', 'Payment received: thank you',
                           case when new.pro_days > 0 then 'Pro is active for ' || new.pro_days || ' more days.'
                                else new.credits || ' credits were added to your account.' end,
                           '/account', new.id);
  elsif new.status = 'failed' then
    perform private.notify(new.user_id, 'payment_failed', 'Your payment didn''t go through',
                           'You weren''t charged. You can try again from your account.', '/account', new.id);
  end if;
  return new;
end $$;
drop trigger if exists notify_payment_order on public.payment_orders;
create trigger notify_payment_order after update on public.payment_orders
  for each row execute function private.on_payment_order();

-- As in migration 012, plus a notification for the learner (the admin's note stays private).
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
  return 'ok';
end $$;

-- ── Problem reports ──────────────────────────────────────────────────────────────────────────────────────────
create or replace function private.on_lesson_report() returns trigger
language plpgsql security definer set search_path = '' as $$
declare l public.lessons;
begin
  select * into l from public.lessons where id = new.lesson_id;
  if tg_op = 'INSERT' then
    perform private.notify_admins('admin_report', 'New problem report: ' || new.reason, l.title, '/admin', new.id);
  elsif new.status = 'resolved' and old.status <> 'resolved' then
    perform private.notify(new.user_id, 'report_resolved', 'We looked at the problem you reported',
                           'Lesson “' || l.title || '”. Thanks for telling us.',
                           case when l.id is null then null else '/learn/' || l.course_id || '/' || l.id end, new.id);
  end if;
  return new;
end $$;
drop trigger if exists notify_lesson_report on public.lesson_reports;
create trigger notify_lesson_report after insert or update on public.lesson_reports
  for each row execute function private.on_lesson_report();

revoke all on function private.notify(uuid, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function private.notify_admins(text, text, text, text, uuid) from public, anon, authenticated;
