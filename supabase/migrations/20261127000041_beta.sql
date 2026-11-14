-- Closed beta B.1 (plan.md "Closed beta"): apply on krpex.in/beta, an admin approves, approved testers use
-- krpex.in courses, code.krpex.in and community.krpex.in. Everyone else can sign up, apply and wait.
--   · private.admin_settings.beta_closed: true while the beta is closed (admin switch on /admin/beta, logged).
--   · private.beta_testers: one row per account: an application (source 'applied') or an account that existed
--     before this migration (source 'existing', approved here so current learners keep their access).
--   · private.has_beta_access(uid): beta open, or approved, or an admin, or an approved professor.
--   · The database enforces it, not only the pages: new courses, professor questions, code submissions, coach
--     requests, community posts, comments, votes, reports and public profiles are refused without access
--     (triggers), and community reading returns nothing (public.community_list / community_thread /
--     community_feed / public_profile / public_profile_handles now check access and call the originals,
--     moved to private.*_open). Change those originals in private from now on, not the public wrappers.
--   · beta_my_status / beta_apply for learners; admin_beta_list / admin_beta_decide / admin_set_beta_closed.
--     Approving grants Pro (30 days by default) and notifies the tester (emailed with their notifications).
-- Run after 040. Safe to run twice.

alter table private.admin_settings add column if not exists beta_closed boolean not null default true;

create table if not exists private.beta_testers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  source text not null default 'applied' check (source in ('applied', 'existing')),
  status text not null default 'waiting' check (status in ('waiting', 'approved', 'declined')),
  name text check (char_length(name) between 1 and 80),
  role text check (role in ('school', 'college', 'working', 'teacher', 'other')),
  goal text check (char_length(goal) <= 500),
  device text check (device in ('android', 'iphone', 'computer', 'tablet')),
  heard_from text check (char_length(heard_from) <= 200),
  consent_at timestamptz,
  note text check (char_length(note) <= 500), -- the admin's note, never shown to the applicant
  pro_days int,
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists beta_testers_status_idx on private.beta_testers (status, created_at desc);
alter table private.beta_testers enable row level security;
revoke all on private.beta_testers from public, anon, authenticated;

-- Accounts that exist now keep their access. Only once: a second run must not approve accounts made since.
do $$
begin
  if not exists (select 1 from private.beta_testers where source = 'existing') then
    insert into private.beta_testers (user_id, source, status, decided_at)
    select id, 'existing', 'approved', now() from auth.users
    on conflict (user_id) do nothing;
  end if;
end $$;

create or replace function private.beta_closed() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select beta_closed from private.admin_settings where id), true);
$$;

create or replace function private.has_beta_access(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select not private.beta_closed()
      or (p_user is not null and (
            exists (select 1 from private.beta_testers where user_id = p_user and status = 'approved')
         or exists (select 1 from private.admins where user_id = p_user)
         or exists (select 1 from public.professors where user_id = p_user and status = 'approved')));
$$;
revoke all on function private.beta_closed() from public, anon, authenticated;
revoke all on function private.has_beta_access(uuid) from public, anon, authenticated;

-- ── Writes: refused without access ───────────────────────────────────────────────────────────────────────
-- tg_argv[0] is the column holding the account (user_id, author or reporter).
create or replace function private.require_beta_access() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_beta_access((to_jsonb(new) ->> tg_argv[0])::uuid) then
    raise exception 'beta access required' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function private.require_beta_access() from public, anon, authenticated;

do $$
declare t record;
begin
  for t in select * from (values ('courses', 'user_id'), ('professor_questions', 'user_id'), ('coding_submissions', 'user_id'),
                                 ('coding_coach_requests', 'user_id'), ('community_posts', 'author'), ('community_comments', 'author'),
                                 ('community_votes', 'user_id'), ('community_reports', 'reporter'), ('public_profiles', 'user_id')) v(tbl, col) loop
    execute format('drop trigger if exists beta_access on public.%I', t.tbl);
    execute format('create trigger beta_access before insert on public.%I for each row execute function private.require_beta_access(%L)', t.tbl, t.col);
  end loop;
end $$;
-- Making a profile public later counts too (hiding it, or an admin hiding it, doesn't).
drop trigger if exists beta_access_public on public.public_profiles;
create trigger beta_access_public before update of is_public on public.public_profiles
  for each row when (new.is_public and not old.is_public) execute function private.require_beta_access('user_id');

-- ── Community reading: nothing without access ───────────────────────────────────────────────────────────
do $$
begin
  if to_regprocedure('private.community_list_open(text, text, text, int, int)') is null then
    alter function public.community_list(text, text, text, int, int) set schema private;
    alter function private.community_list(text, text, text, int, int) rename to community_list_open;
  end if;
  if to_regprocedure('private.community_thread_open(uuid)') is null then
    alter function public.community_thread(uuid) set schema private;
    alter function private.community_thread(uuid) rename to community_thread_open;
  end if;
  if to_regprocedure('private.community_feed_open(text, int, int)') is null then
    alter function public.community_feed(text, int, int) set schema private;
    alter function private.community_feed(text, int, int) rename to community_feed_open;
  end if;
  if to_regprocedure('private.public_profile_open(text)') is null then
    alter function public.public_profile(text) set schema private;
    alter function private.public_profile(text) rename to public_profile_open;
  end if;
  if to_regprocedure('private.public_profile_handles_open()') is null then
    alter function public.public_profile_handles() set schema private;
    alter function private.public_profile_handles() rename to public_profile_handles_open;
  end if;
end $$;
revoke all on function private.community_list_open(text, text, text, int, int) from public, anon, authenticated;
revoke all on function private.community_thread_open(uuid) from public, anon, authenticated;
revoke all on function private.community_feed_open(text, int, int) from public, anon, authenticated;
revoke all on function private.public_profile_open(text) from public, anon, authenticated;
revoke all on function private.public_profile_handles_open() from public, anon, authenticated;

create or replace function public.community_list(p_space text, p_kind text, p_sort text default 'top', p_limit int default 20, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_beta_access(auth.uid()) then return null; end if;
  return private.community_list_open(p_space, p_kind, p_sort, p_limit, p_offset);
end $$;

create or replace function public.community_thread(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_beta_access(auth.uid()) then return null; end if;
  return private.community_thread_open(p_id);
end $$;

create or replace function public.community_feed(p_scope text default null, p_limit int default 20, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_beta_access(auth.uid()) then return '[]'::jsonb; end if;
  return private.community_feed_open(p_scope, p_limit, p_offset);
end $$;

-- Also says whether the person took part in the beta (approved from an application): the "Beta tester" badge.
create or replace function public.public_profile(p_handle text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if not private.has_beta_access(auth.uid()) then return null; end if;
  r := private.public_profile_open(p_handle);
  if r is null then return null; end if;
  return r || jsonb_build_object('beta_tester', exists (
    select 1 from public.public_profiles p join private.beta_testers b on b.user_id = p.user_id
     where p.handle = lower(btrim(coalesce(p_handle, ''))) and b.source = 'applied' and b.status = 'approved'));
end $$;

create or replace function public.public_profile_handles()
returns setof text language plpgsql stable security definer set search_path = '' as $$
begin
  if private.beta_closed() then return; end if;
  return query select * from private.public_profile_handles_open();
end $$;

-- ── Learners ────────────────────────────────────────────────────────────────────────────────────────────
-- { closed, signed_in, access, beta_tester, application: { status, name, role, goal, device, heard_from, created_at, decided_at } | null }
create or replace function public.beta_my_status()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); b private.beta_testers;
begin
  select * into b from private.beta_testers where user_id = uid;
  return jsonb_build_object(
    'closed', private.beta_closed(),
    'signed_in', uid is not null,
    'access', private.has_beta_access(uid),
    'beta_tester', found and b.source = 'applied' and b.status = 'approved',
    'application', case when found and b.source = 'applied' then jsonb_build_object(
      'status', b.status, 'name', b.name, 'role', b.role, 'goal', b.goal, 'device', b.device, 'heard_from', b.heard_from,
      'created_at', b.created_at, 'decided_at', b.decided_at) end);
end $$;

-- Returns 'ok' (saved; a waiting application can be changed), 'approved' (already in), 'declined' or 'open'
-- (the beta has ended: everyone is in). Consent to activity tracking and session recording is required.
create or replace function public.beta_apply(p_name text, p_role text, p_goal text, p_device text, p_heard_from text, p_consent boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  b private.beta_testers;
  v_new boolean;
  v_name text := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 80);
  v_goal text := nullif(left(btrim(coalesce(p_goal, '')), 500), '');
  v_heard text := nullif(left(btrim(coalesce(p_heard_from, '')), 200), '');
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if v_name = '' then raise exception 'name required' using errcode = '22023'; end if;
  if p_role is null or p_role not in ('school', 'college', 'working', 'teacher', 'other') then raise exception 'bad role' using errcode = '22023'; end if;
  if p_device is null or p_device not in ('android', 'iphone', 'computer', 'tablet') then raise exception 'bad device' using errcode = '22023'; end if;
  if v_goal is null then raise exception 'goal required' using errcode = '22023'; end if;
  if not coalesce(p_consent, false) then raise exception 'consent required' using errcode = '22023'; end if;
  select * into b from private.beta_testers where user_id = uid for update;
  v_new := not found;
  if found and b.status = 'approved' then return 'approved'; end if;
  if found and b.status = 'declined' then return 'declined'; end if;
  if not private.beta_closed() then return 'open'; end if;
  insert into private.beta_testers (user_id, name, role, goal, device, heard_from, consent_at)
  values (uid, v_name, p_role, v_goal, p_device, v_heard, now())
  on conflict (user_id) do update
    set name = excluded.name, role = excluded.role, goal = excluded.goal, device = excluded.device,
        heard_from = excluded.heard_from, consent_at = now(), updated_at = now();
  if v_new then
    perform private.notify_admins('admin_beta_application', 'New beta application: ' || v_name,
                                  left(v_goal, 200), '/admin/beta', null);
  end if;
  return 'ok';
end $$;

-- ── Admins ──────────────────────────────────────────────────────────────────────────────────────────────
-- p_status: waiting | approved | declined | existing (accounts from before the beta) | all.
create or replace function public.admin_beta_list(p_status text default 'waiting', p_search text default '', p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  s text := '%' || replace(replace(replace(lower(btrim(coalesce(p_search, ''))), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  v_status text := case when p_status in ('waiting', 'approved', 'declined', 'existing', 'all') then p_status else 'waiting' end;
begin
  perform private.require_admin();
  return (with base as (
      select b.*, u.email::text as email, u.last_sign_in_at, a.email::text as decided_by_email, public.current_plan(b.user_id) as plan
        from private.beta_testers b
        join auth.users u on u.id = b.user_id
        left join auth.users a on a.id = b.decided_by
       where (v_status = 'all' or (v_status = 'existing' and b.source = 'existing') or (b.source = 'applied' and b.status = v_status))
         and (s = '%%' or lower(coalesce(u.email, '')) like s or lower(coalesce(b.name, '')) like s or lower(coalesce(b.goal, '')) like s)
    )
    select jsonb_build_object(
      'closed', private.beta_closed(),
      'counts', (select jsonb_build_object(
          'waiting', count(*) filter (where source = 'applied' and status = 'waiting'),
          'approved', count(*) filter (where source = 'applied' and status = 'approved'),
          'declined', count(*) filter (where source = 'applied' and status = 'declined'),
          'existing', count(*) filter (where source = 'existing')) from private.beta_testers),
      'total', (select count(*) from base),
      'rows', coalesce((select jsonb_agg(jsonb_build_object(
          'user_id', user_id, 'email', email, 'source', source, 'status', status, 'name', name, 'role', role, 'goal', goal,
          'device', device, 'heard_from', heard_from, 'consent_at', consent_at, 'note', note, 'pro_days', pro_days,
          'created_at', created_at, 'decided_at', decided_at, 'decided_by', decided_by_email,
          'last_sign_in_at', last_sign_in_at, 'plan', plan) order by created_at desc)
        from (select * from base order by created_at desc
               limit least(greatest(coalesce(p_limit, 50), 1), 100) offset least(greatest(coalesce(p_offset, 0), 0), 100000)) x), '[]'::jsonb)));
end $$;

-- Approve (with Pro for p_pro_days, 0 for none) or decline an application; can be changed later (approving
-- again doesn't give Pro twice). Returns 'ok' or 'not_found'.
create or replace function public.admin_beta_decide(p_user uuid, p_status text, p_note text default '', p_pro_days int default 30)
returns text language plpgsql security definer set search_path = '' as $$
declare
  b private.beta_testers;
  v_days int := least(greatest(coalesce(p_pro_days, 0), 0), 365);
  v_note text := nullif(left(btrim(coalesce(p_note, '')), 500), '');
begin
  perform private.require_admin();
  if p_status not in ('approved', 'declined') then raise exception 'bad status' using errcode = '22023'; end if;
  select * into b from private.beta_testers where user_id = p_user and source = 'applied' for update;
  if not found then return 'not_found'; end if;
  if b.status = p_status then
    update private.beta_testers set note = coalesce(v_note, note), updated_at = now() where user_id = p_user;
    return 'ok';
  end if;
  if p_status = 'approved' and v_days > 0 and b.pro_days is null then
    insert into public.user_plans (user_id, plan, status, current_period_end, updated_at)
    values (p_user, 'pro', 'active', now() + make_interval(days => v_days), now())
    on conflict (user_id) do update
      set plan = 'pro', status = 'active', updated_at = now(),
          current_period_end = greatest(coalesce(public.user_plans.current_period_end, now()), now()) + make_interval(days => v_days);
  else
    v_days := 0;
  end if;
  update private.beta_testers
     set status = p_status, note = coalesce(v_note, note), decided_at = now(), decided_by = auth.uid(), updated_at = now(),
         pro_days = case when v_days > 0 then v_days else pro_days end
   where user_id = p_user;
  if p_status = 'approved' then
    perform private.notify(p_user, 'beta_approved', 'You''re in: welcome to the Krpex beta',
      'Krpex courses, Krpex Code and Krpex Community are open to you' ||
      case when v_days > 0 then ', with Pro free for ' || v_days || ' days' else '' end ||
      '. Tell us what works and what doesn''t with the Feedback button.', '/learn', null);
  else
    perform private.notify(p_user, 'beta_declined', 'About your Krpex beta application',
      'We can''t take you into the beta just yet. We''ll let you know when Krpex opens to everyone.', '/beta', null);
  end if;
  insert into private.admin_log (admin, action, user_id, detail)
  values (auth.uid(), 'beta:' || p_status, p_user, jsonb_strip_nulls(jsonb_build_object('note', v_note, 'pro_days', nullif(v_days, 0))));
  return 'ok';
end $$;

create or replace function public.admin_set_beta_closed(p_closed boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  if p_closed is null then raise exception 'bad value' using errcode = '22023'; end if;
  if p_closed is distinct from private.beta_closed() then
    update private.admin_settings set beta_closed = p_closed, updated_at = now(), updated_by = auth.uid() where id;
    insert into private.admin_log (admin, action, detail) values (auth.uid(), case when p_closed then 'beta_closed' else 'beta_opened' end, '{}');
  end if;
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
  'beta_approved', 'beta_declined', 'admin_beta_application'
));

create or replace function private.notification_topic(p_kind text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_kind in ('professor_reply', 'professor_confirmed', 'report_resolved') then 'learning'
    when p_kind like 'community\_%' then 'learning'
    when p_kind in ('payment_paid', 'payment_failed', 'credits_granted', 'pro_granted', 'level_reward', 'beta_approved', 'beta_declined') then 'account'
    when p_kind like 'reminder\_%' then 'reminders'
    when p_kind like 'admin\_%' then 'admin'
    else 'teaching'
  end
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────────────────────────────────
do $$
declare f text;
begin
  foreach f in array array['public.community_list(text, text, text, int, int)', 'public.community_thread(uuid)',
                           'public.community_feed(text, int, int)', 'public.public_profile(text)', 'public.public_profile_handles()',
                           'public.beta_my_status()'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
  foreach f in array array['public.beta_apply(text, text, text, text, text, boolean)', 'public.admin_beta_list(text, text, int, int)',
                           'public.admin_beta_decide(uuid, text, text, int)', 'public.admin_set_beta_closed(boolean)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
