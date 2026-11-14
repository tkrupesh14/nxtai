-- Closed beta B.2 (plan.md "Closed beta"): the Feedback button on krpex.in, code.krpex.in and community.krpex.in.
--   · private.feedback: one row per report: kind (bug / suggestion / confusing), what happened, the site and page,
--     an optional screenshot, and context added automatically (browser, screen size, build commit, recent
--     browser errors). Admins triage it: new → planned → in progress → fixed / won't fix, with a reply.
--   · Screenshots go in the private Storage bucket "feedback" at <user id>/<uuid>.<png|jpg|webp> (5 MB, images
--     only). Testers upload into their own folder from the browser and can read their own; admins read them all
--     through short-lived signed links. Nobody can overwrite or list other people's files.
--   · feedback_submit / feedback_mine for learners (any signed-in account, 20 a day); admin_feedback_list /
--     admin_feedback_update for admins. A reply, or marking it fixed, notifies the tester (emailed with their
--     notifications); each new report notifies the admins.
-- Run after 041. Safe to run twice.

create table if not exists private.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('bug', 'suggestion', 'confusing')),
  body text not null check (char_length(body) between 3 and 4000),
  site text not null check (site in ('main', 'code', 'community')),
  path text not null check (char_length(path) between 1 and 500),
  screenshot text check (char_length(screenshot) <= 200),
  context jsonb not null default '{}' check (pg_column_size(context) <= 12000),
  status text not null default 'new' check (status in ('new', 'planned', 'in_progress', 'fixed', 'wont_fix')),
  reply text check (char_length(reply) <= 2000),
  replied_at timestamptz,
  replied_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists feedback_status_idx on private.feedback (status, created_at desc);
create index if not exists feedback_user_idx on private.feedback (user_id, created_at desc);
alter table private.feedback enable row level security;
revoke all on private.feedback from public, anon, authenticated;

-- ── Screenshots (Supabase Storage; skipped where there is no Storage, like the test databases) ─────────────
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('feedback', 'feedback', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
  on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
  execute 'drop policy if exists "feedback: upload to your own folder" on storage.objects';
  execute 'drop policy if exists "feedback: yours, or any for admins" on storage.objects';
  execute $p$create policy "feedback: upload to your own folder" on storage.objects for insert to authenticated
    with check (bucket_id = 'feedback' and (storage.foldername(name))[1] = (select auth.uid())::text)$p$;
  execute $p$create policy "feedback: yours, or any for admins" on storage.objects for select to authenticated
    using (bucket_id = 'feedback' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())))$p$;
end $$;

-- ── Learners ────────────────────────────────────────────────────────────────────────────────────────────
-- p_screenshot: the object name in the "feedback" bucket (uploaded first, into the tester's own folder) or null.
-- p_context: { browser, screen, viewport, commit, language, errors: [{ message, at }] }, filled in by the app.
-- Returns the new report's id.
create or replace function public.feedback_submit(p_kind text, p_body text, p_site text, p_path text, p_screenshot text, p_context jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_id uuid;
  v_body text := left(btrim(coalesce(p_body, '')), 4000);
  v_path text := left(coalesce(nullif(btrim(p_path), ''), '/'), 500);
  v_shot text := nullif(btrim(coalesce(p_screenshot, '')), '');
  v_context jsonb := case when jsonb_typeof(p_context) = 'object' and pg_column_size(p_context) <= 12000 then p_context else '{}'::jsonb end;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_kind is null or p_kind not in ('bug', 'suggestion', 'confusing') then raise exception 'bad kind' using errcode = '22023'; end if;
  if p_site is null or p_site not in ('main', 'code', 'community') then raise exception 'bad site' using errcode = '22023'; end if;
  if char_length(v_body) < 3 then raise exception 'body required' using errcode = '22023'; end if;
  if v_shot is not null and v_shot !~ ('^' || uid::text || '/[0-9a-f-]{36}\.(png|jpg|webp)$') then
    raise exception 'bad screenshot' using errcode = '22023';
  end if;
  if (select count(*) from private.feedback where user_id = uid and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too many' using errcode = '54000';
  end if;
  insert into private.feedback (user_id, kind, body, site, path, screenshot, context)
  values (uid, p_kind, v_body, p_site, v_path, v_shot, v_context)
  returning id into v_id;
  perform private.notify_admins('admin_feedback',
    case p_kind when 'bug' then 'Bug report' when 'suggestion' then 'Suggestion' else 'Something confusing' end ||
      ' on ' || case p_site when 'code' then 'Krpex Code' when 'community' then 'Krpex Community' else 'krpex.in' end,
    left(v_body, 200), '/admin/beta/feedback', v_id);
  return v_id;
end $$;

-- The signed-in account's reports, newest first: [{ id, kind, body, site, path, screenshot, status, reply, replied_at, created_at }]
create or replace function public.feedback_mine(p_limit int default 50, p_offset int default 0)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'kind', kind, 'body', body, 'site', site, 'path', path, 'screenshot', screenshot, 'status', status,
      'reply', reply, 'replied_at', replied_at, 'created_at', created_at) order by created_at desc), '[]'::jsonb)
    from (select * from private.feedback where user_id = auth.uid() order by created_at desc
           limit least(greatest(coalesce(p_limit, 50), 1), 100) offset least(greatest(coalesce(p_offset, 0), 0), 100000)) f;
$$;

-- ── Admins ──────────────────────────────────────────────────────────────────────────────────────────────
-- p_status: new | planned | in_progress | fixed | wont_fix | open (new, planned, in progress) | all.
-- p_site, p_kind: '' for all. p_search matches what they wrote, the page and the email.
create or replace function public.admin_feedback_list(p_status text default 'open', p_site text default '', p_kind text default '',
                                                      p_search text default '', p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  s text := '%' || replace(replace(replace(lower(btrim(coalesce(p_search, ''))), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  v_status text := case when p_status in ('new', 'planned', 'in_progress', 'fixed', 'wont_fix', 'open', 'all') then p_status else 'open' end;
  v_site text := case when p_site in ('main', 'code', 'community') then p_site end;
  v_kind text := case when p_kind in ('bug', 'suggestion', 'confusing') then p_kind end;
begin
  perform private.require_admin();
  return (with base as (
      select f.*, u.email::text as email, b.name as tester_name, r.email::text as replied_by_email
        from private.feedback f
        join auth.users u on u.id = f.user_id
        left join private.beta_testers b on b.user_id = f.user_id
        left join auth.users r on r.id = f.replied_by
       where (v_status = 'all' or f.status = v_status or (v_status = 'open' and f.status in ('new', 'planned', 'in_progress')))
         and (v_site is null or f.site = v_site)
         and (v_kind is null or f.kind = v_kind)
         and (s = '%%' or lower(f.body) like s or lower(f.path) like s or lower(coalesce(u.email, '')) like s)
    )
    select jsonb_build_object(
      'counts', (select jsonb_build_object(
          'new', count(*) filter (where status = 'new'),
          'planned', count(*) filter (where status = 'planned'),
          'in_progress', count(*) filter (where status = 'in_progress'),
          'fixed', count(*) filter (where status = 'fixed'),
          'wont_fix', count(*) filter (where status = 'wont_fix')) from private.feedback),
      'total', (select count(*) from base),
      'rows', coalesce((select jsonb_agg(jsonb_build_object(
          'id', id, 'user_id', user_id, 'email', email, 'name', tester_name, 'kind', kind, 'body', body, 'site', site,
          'path', path, 'screenshot', screenshot, 'context', context, 'status', status, 'reply', reply,
          'replied_at', replied_at, 'replied_by', replied_by_email, 'created_at', created_at, 'updated_at', updated_at)
          order by created_at desc)
        from (select * from base order by created_at desc
               limit least(greatest(coalesce(p_limit, 50), 1), 100) offset least(greatest(coalesce(p_offset, 0), 0), 100000)) x), '[]'::jsonb)));
end $$;

-- Change the status and/or the reply ('' keeps the reply as it is). A new or changed reply notifies the tester;
-- so does marking it fixed. Returns 'ok' or 'not_found'.
create or replace function public.admin_feedback_update(p_id uuid, p_status text, p_reply text default '')
returns text language plpgsql security definer set search_path = '' as $$
declare
  f private.feedback;
  v_reply text := nullif(left(btrim(coalesce(p_reply, '')), 2000), '');
  v_new_reply boolean;
begin
  perform private.require_admin();
  if p_status is null or p_status not in ('new', 'planned', 'in_progress', 'fixed', 'wont_fix') then raise exception 'bad status' using errcode = '22023'; end if;
  select * into f from private.feedback where id = p_id for update;
  if not found then return 'not_found'; end if;
  v_new_reply := v_reply is not null and v_reply is distinct from f.reply;
  if not v_new_reply and p_status = f.status then return 'ok'; end if;
  update private.feedback
     set status = p_status, updated_at = now(),
         reply = case when v_new_reply then v_reply else reply end,
         replied_at = case when v_new_reply then now() else replied_at end,
         replied_by = case when v_new_reply then auth.uid() else replied_by end
   where id = p_id;
  if v_new_reply then
    perform private.notify(f.user_id, 'feedback_reply', 'Krpex replied to your feedback', left(v_reply, 200), '/account/feedback', p_id);
  elsif p_status = 'fixed' then
    perform private.notify(f.user_id, 'feedback_fixed', 'Fixed: something you reported', left(f.body, 200), '/account/feedback', p_id);
  end if;
  insert into private.admin_log (admin, action, user_id, detail)
  values (auth.uid(), 'feedback:' || p_status, f.user_id,
          jsonb_strip_nulls(jsonb_build_object('feedback', p_id, 'replied', case when v_new_reply then true end)));
  return 'ok';
end $$;

-- ── Notifications ───────────────────────────────────────────────────────────────────────────────────────
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'inbox_question', 'professor_reply', 'professor_confirmed',
  'professor_approved', 'professor_suspended', 'professor_live', 'professor_hidden', 'review_new',
  'payment_paid', 'payment_failed', 'credits_granted', 'pro_granted', 'report_resolved',
  'admin_professor_joined', 'admin_listing_requested', 'admin_report',
  'reminder_streak', 'reminder_continue', 'reminder_freeze_used', 'level_reward',
  'community_reply', 'community_upvotes', 'community_removed', 'admin_community_report',
  'beta_approved', 'beta_declined', 'admin_beta_application',
  'feedback_reply', 'feedback_fixed', 'admin_feedback'
));

create or replace function private.notification_topic(p_kind text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_kind in ('professor_reply', 'professor_confirmed', 'report_resolved') then 'learning'
    when p_kind like 'community\_%' then 'learning'
    when p_kind in ('payment_paid', 'payment_failed', 'credits_granted', 'pro_granted', 'level_reward', 'beta_approved', 'beta_declined') then 'account'
    when p_kind like 'feedback\_%' then 'account'
    when p_kind like 'reminder\_%' then 'reminders'
    when p_kind like 'admin\_%' then 'admin'
    else 'teaching'
  end
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────────────────────────────────
do $$
declare f text;
begin
  foreach f in array array['public.feedback_submit(text, text, text, text, text, jsonb)', 'public.feedback_mine(int, int)',
                           'public.admin_feedback_list(text, text, text, text, int, int)', 'public.admin_feedback_update(uuid, text, text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
