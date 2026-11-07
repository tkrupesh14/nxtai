-- 9.4: phone and browser push notifications. 9.5: study reminders.
--
-- Push: each device that allows notifications saves its push subscription here (the browser's push service
-- address and keys). Every minute the app server takes the notifications created since its last pass and
-- sends them, encrypted, to each of the owner's devices. Only the big browser push services are accepted as
-- addresses, so the server never sends requests anywhere else.
--
-- Reminders: at 7 pm India time the server asks for today's reminders. Someone who studied yesterday (with a
-- streak of 2+ days) but not today gets "keep your streak"; someone with an unfinished course who hasn't studied
-- for 3–30 days gets "continue your course", at most once a week. They are ordinary notifications (bell, push,
-- email), and people can turn them off.

-- ── Push subscriptions ───────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique check (
    char_length(endpoint) <= 1000
    and endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/'
  ),
  p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]{80,100}$'),
  auth text not null check (auth ~ '^[A-Za-z0-9_-]{16,32}$'),
  failures int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from public, anon, authenticated;
drop policy if exists "Read own push subscriptions" on public.push_subscriptions;
create policy "Read own push subscriptions" on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
grant select (id, endpoint, created_at) on public.push_subscriptions to authenticated;

-- Save this device's subscription (a device that changes hands moves to the new account). Keeps 10 per person.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (uid, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = uid, p256dh = excluded.p256dh, auth = excluded.auth, failures = 0;
  delete from public.push_subscriptions
   where user_id = uid
     and id not in (select id from public.push_subscriptions where user_id = uid order by created_at desc limit 10);
end $$;
revoke all on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

create or replace function public.delete_push_subscription(p_endpoint text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  delete from public.push_subscriptions where user_id = auth.uid() and endpoint = p_endpoint;
end $$;
revoke all on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.delete_push_subscription(text) to authenticated;

alter table public.notifications add column if not exists pushed_at timestamptz;

-- Server only: take the unread notifications of the last 10 minutes not yet pushed, for people with a device.
-- They are marked as pushed straight away, so two passes never send the same one twice.
create or replace function public.app_take_pushes(p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  perform private.require_server_key(p_key);
  with taken as (
    update public.notifications n set pushed_at = now()
     where n.pushed_at is null and n.read_at is null and n.created_at > now() - interval '10 minutes'
       and exists (select 1 from public.push_subscriptions p where p.user_id = n.user_id)
    returning n.id, n.user_id, n.title, n.body, n.link
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', t.id, 'title', t.title, 'body', t.body, 'link', t.link,
           'devices', (select jsonb_agg(jsonb_build_object('endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth))
                         from public.push_subscriptions p where p.user_id = t.user_id))), '[]'::jsonb)
    into result from taken t;
  return result;
end $$;
revoke all on function public.app_take_pushes(text) from public;
grant execute on function public.app_take_pushes(text) to anon, authenticated;

-- Server only: how a push went. A device the push service says is gone (404/410), or that failed 5 times in
-- a row, is removed.
create or replace function public.app_push_result(p_key text, p_endpoint text, p_ok boolean, p_gone boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_server_key(p_key);
  if p_gone then
    delete from public.push_subscriptions where endpoint = p_endpoint;
  elsif p_ok then
    update public.push_subscriptions set failures = 0 where endpoint = p_endpoint and failures > 0;
  else
    update public.push_subscriptions set failures = failures + 1 where endpoint = p_endpoint;
    delete from public.push_subscriptions where endpoint = p_endpoint and failures >= 5;
  end if;
end $$;
revoke all on function public.app_push_result(text, text, boolean, boolean) from public;
grant execute on function public.app_push_result(text, text, boolean, boolean) to anon, authenticated;

-- ── Reminders ────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'inbox_question', 'professor_reply', 'professor_confirmed',
  'professor_approved', 'professor_suspended', 'professor_live', 'professor_hidden', 'review_new',
  'payment_paid', 'payment_failed', 'credits_granted', 'pro_granted', 'report_resolved',
  'admin_professor_joined', 'admin_listing_requested', 'admin_report',
  'reminder_streak', 'reminder_continue'
));

-- Reminders on or off. They are only created when on; this also decides whether they are emailed.
alter table public.notification_email_settings add column if not exists reminders boolean not null default true;
grant select (reminders) on public.notification_email_settings to authenticated;

create or replace function private.notification_topic(p_kind text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_kind in ('professor_reply', 'professor_confirmed', 'report_resolved') then 'learning'
    when p_kind in ('payment_paid', 'payment_failed', 'credits_granted', 'pro_granted') then 'account'
    when p_kind like 'reminder\_%' then 'reminders'
    when p_kind like 'admin\_%' then 'admin'
    else 'teaching'
  end
$$;

-- Same as set_notification_email_settings (024), plus reminders. null keeps the current value.
create or replace function public.set_notification_settings(
  p_frequency text, p_learning boolean, p_account boolean, p_teaching boolean, p_admin boolean, p_reminders boolean
) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_frequency not in ('hourly', 'daily', 'off') then raise exception 'bad frequency' using errcode = '22023'; end if;
  insert into public.notification_email_settings as s (user_id, frequency, learning, account, teaching, admin, reminders)
  values (uid, p_frequency, coalesce(p_learning, true), coalesce(p_account, true), coalesce(p_teaching, true),
          coalesce(p_admin, true), coalesce(p_reminders, true))
  on conflict (user_id) do update
    set frequency = excluded.frequency,
        learning = coalesce(p_learning, s.learning), account = coalesce(p_account, s.account),
        teaching = coalesce(p_teaching, s.teaching), admin = coalesce(p_admin, s.admin),
        reminders = coalesce(p_reminders, s.reminders), updated_at = now();
end $$;
revoke all on function public.set_notification_settings(text, boolean, boolean, boolean, boolean, boolean) from public, anon;
grant execute on function public.set_notification_settings(text, boolean, boolean, boolean, boolean, boolean) to authenticated;

-- 024's email query, now with the reminders topic.
create or replace function public.app_due_notification_emails(p_key text, p_limit int default 50) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  perform private.require_server_key(p_key);

  insert into public.notification_email_settings (user_id)
  select distinct n.user_id from public.notifications n
   where n.read_at is null and n.emailed_at is null
  on conflict (user_id) do nothing;

  with due as (
    select s.user_id, s.unsubscribe_token, u.email, coalesce(nullif(btrim(p.full_name), ''), '') as name
      from public.notification_email_settings s
      join auth.users u on u.id = s.user_id
      left join public.users p on p.id = s.user_id
     where s.frequency <> 'off'
       and u.email is not null and u.email_confirmed_at is not null
       and (s.last_sent_at is null
            or s.last_sent_at < now() - case s.frequency when 'daily' then interval '23 hours' else interval '55 minutes' end)
  ), items as (
    select d.user_id, n.id, n.title, n.body, n.link, n.created_at
      from due d
      join public.notification_email_settings s on s.user_id = d.user_id
      join public.notifications n on n.user_id = d.user_id
     where n.read_at is null and n.emailed_at is null
       and n.created_at < now() - interval '10 minutes'
       and n.created_at > now() - interval '3 days'
       and case private.notification_topic(n.kind)
             when 'learning' then s.learning when 'account' then s.account
             when 'reminders' then s.reminders
             when 'admin' then s.admin else s.teaching end
  ), picked as (
    select d.user_id, d.email, d.name, d.unsubscribe_token,
           jsonb_agg(jsonb_build_object('id', i.id, 'title', i.title, 'body', i.body, 'link', i.link,
                                        'created_at', i.created_at) order by i.created_at desc) as items
      from due d join items i on i.user_id = d.user_id
     group by d.user_id, d.email, d.name, d.unsubscribe_token
     order by min(i.created_at)
     limit greatest(1, least(coalesce(p_limit, 50), 200))
  )
  select coalesce(jsonb_agg(jsonb_build_object('user_id', user_id, 'email', email, 'name', name,
                                               'unsubscribe_token', unsubscribe_token, 'items', items)), '[]'::jsonb)
    into result from picked;
  return result;
end $$;

-- Server only, once a day at 7 pm IST (running it again the same day adds nothing). Returns how many it created.
create or replace function public.app_create_reminders(p_key text) returns int
language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Kolkata')::date;
  day_start timestamptz := (now() at time zone 'Asia/Kolkata')::date::timestamp at time zone 'Asia/Kolkata';
  r record;
  made int := 0;
begin
  perform private.require_server_key(p_key);

  -- Keep your streak: active yesterday and the day before (and maybe longer), not yet today.
  for r in
    with act as (
      select user_id, (completed_at at time zone 'Asia/Kolkata')::date as d
        from public.lessons where completed_at > now() - interval '40 days'
      union
      select user_id, (created_at at time zone 'Asia/Kolkata')::date
        from public.professor_questions where status = 'answered' and created_at > now() - interval '40 days'
    ), runs as (
      select user_id, d, d - (row_number() over (partition by user_id order by d))::int as grp
        from act where d < today
    )
    select user_id, count(*)::int as n from runs
     group by user_id, grp
    having max(d) = today - 1 and count(*) >= 2
  loop
    continue when exists (select 1 from public.notification_email_settings s where s.user_id = r.user_id and not s.reminders)
               or exists (select 1 from public.lessons l where l.user_id = r.user_id and l.completed_at >= day_start)
               or exists (select 1 from public.professor_questions q
                           where q.user_id = r.user_id and q.status = 'answered' and q.created_at >= day_start)
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
revoke all on function public.app_create_reminders(text) from public;
grant execute on function public.app_create_reminders(text) to anon, authenticated;
