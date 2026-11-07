-- 9.3: email for notifications.
--
-- The app server checks every few minutes for people who have notifications they haven't seen in the app, and
-- sends each of them one email listing them, at most once an hour (or once a day, or never; their choice on
-- /account/settings). Notifications read in the app are never emailed. Every email carries a link that turns
-- emails off without signing in.
--
-- People change their own settings through set_notification_email_settings(); the server reads who is due and
-- marks what it sent with the server key (migration 008).

alter table public.notifications add column if not exists emailed_at timestamptz;
create index if not exists notifications_to_email_idx on public.notifications (user_id, created_at)
  where read_at is null and emailed_at is null;

create table if not exists public.notification_email_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  frequency text not null default 'hourly' check (frequency in ('hourly', 'daily', 'off')),
  -- Kinds of notification, grouped by private.notification_topic().
  learning boolean not null default true,
  account boolean not null default true,
  teaching boolean not null default true,
  admin boolean not null default true,
  -- In the unsubscribe link of every email. Unguessable; never shown in the app.
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  last_sent_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.notification_email_settings enable row level security;
revoke all on public.notification_email_settings from public, anon, authenticated;
drop policy if exists "Read own email settings" on public.notification_email_settings;
create policy "Read own email settings" on public.notification_email_settings for select to authenticated
  using (user_id = (select auth.uid()));
grant select (user_id, frequency, learning, account, teaching, admin, updated_at)
  on public.notification_email_settings to authenticated;

create or replace function private.notification_topic(p_kind text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_kind in ('professor_reply', 'professor_confirmed', 'report_resolved') then 'learning'
    when p_kind in ('payment_paid', 'payment_failed', 'credits_granted', 'pro_granted') then 'account'
    when p_kind like 'admin\_%' then 'admin'
    else 'teaching'
  end
$$;

create or replace function public.set_notification_email_settings(
  p_frequency text, p_learning boolean, p_account boolean, p_teaching boolean, p_admin boolean
) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_frequency not in ('hourly', 'daily', 'off') then raise exception 'bad frequency' using errcode = '22023'; end if;
  insert into public.notification_email_settings as s (user_id, frequency, learning, account, teaching, admin)
  values (uid, p_frequency, coalesce(p_learning, true), coalesce(p_account, true), coalesce(p_teaching, true), coalesce(p_admin, true))
  on conflict (user_id) do update
    set frequency = excluded.frequency,
        -- null keeps the current value (the form only shows the topics that apply to you)
        learning = coalesce(p_learning, s.learning), account = coalesce(p_account, s.account),
        teaching = coalesce(p_teaching, s.teaching), admin = coalesce(p_admin, s.admin), updated_at = now();
end $$;
revoke all on function public.set_notification_email_settings(text, boolean, boolean, boolean, boolean) from public, anon;
grant execute on function public.set_notification_email_settings(text, boolean, boolean, boolean, boolean) to authenticated;

-- From the link in an email: no sign-in, the token is the proof. True if it matched someone.
create or replace function public.unsubscribe_notification_emails(p_token uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.notification_email_settings set frequency = 'off', updated_at = now() where unsubscribe_token = p_token;
  return found;
end $$;
revoke all on function public.unsubscribe_notification_emails(uuid) from public;
grant execute on function public.unsubscribe_notification_emails(uuid) to anon, authenticated;

-- Who should get an email now, with what. Server only. A notification waits 10 minutes first (the person may
-- see it in the app), is skipped once read, and is dropped after 3 days if it was never sent. Only confirmed
-- email addresses. Creates the settings row (defaults) so each email has an unsubscribe token.
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
revoke all on function public.app_due_notification_emails(text, int) from public;
grant execute on function public.app_due_notification_emails(text, int) to anon, authenticated;

-- After an email went out: those notifications are not sent again, and the next email waits an hour (or a day).
create or replace function public.app_mark_notifications_emailed(p_key text, p_user uuid, p_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_server_key(p_key);
  update public.notifications set emailed_at = now() where user_id = p_user and id = any (p_ids) and emailed_at is null;
  update public.notification_email_settings set last_sent_at = now() where user_id = p_user;
end $$;
revoke all on function public.app_mark_notifications_emailed(text, uuid, uuid[]) from public;
grant execute on function public.app_mark_notifications_emailed(text, uuid, uuid[]) to anon, authenticated;
