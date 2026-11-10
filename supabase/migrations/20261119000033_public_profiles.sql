-- Community, Phase 5a (plan.md "Krpex Code v2" → Phase 5): public profiles.
-- A learner claims a handle (needed later to post) and can turn on a public page at code.krpex.in/u/<handle>
-- showing their level, XP, streak, solved counts, coding activity and finished study plans. Off by default.
-- Emails are never stored here or returned. Profiles are written only through save_public_profile(), which
-- checks the handle rules (also in lib/community/profile.ts), and read by others only through public_profile().
-- Run after 032. Safe to run twice.

create table if not exists public.public_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 160),
  is_public boolean not null default false,
  -- Show which problems were solved (titles and dates), not just the counts.
  show_solves boolean not null default false,
  -- Set by an admin to take a page down (an offensive name or bio); the owner still sees their settings.
  hidden boolean not null default false,
  handle_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.public_profiles enable row level security;
drop policy if exists "Read own" on public.public_profiles;
create policy "Read own" on public.public_profiles for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to authenticated;

-- Level from total XP: private.xp_level(int) from migration 027 (same formula as lib/learning/xp.ts).
create or replace function private.user_level(p_user uuid)
returns int language sql stable security definer set search_path = '' as $$
  select private.xp_level(coalesce(sum(points), 0)::int) from public.xp_events where user_id = p_user;
$$;

-- Looks like a link (lib/community/profile.ts hasLink). Links are allowed from level 4 (spam control).
create or replace function private.has_link(p_text text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(p_text, '') ~* '(https?://|www\.|[a-z0-9-]+\.(com|in|io|net|org|co|xyz|me|ly|dev|app|link|site|info|biz|online|shop|top)\M)';
$$;

-- Handles nobody may take (lib/community/profile.ts RESERVED_HANDLES): site words, and anything that looks official.
create or replace function private.reserved_handle(p_handle text)
returns boolean language sql immutable set search_path = '' as $$
  select p_handle = any (array[
      'about', 'account', 'admin', 'anonymous', 'api', 'code', 'contact', 'deleted', 'discuss', 'help', 'home', 'learn',
      'login', 'logout', 'me', 'mod', 'mods', 'null', 'plans', 'playground', 'pricing', 'privacy', 'problems', 'professor',
      'professors', 'profile', 'root', 'settings', 'signup', 'solutions', 'staff', 'support', 'system', 'teach', 'team',
      'terms', 'undefined', 'user', 'users', 'www'])
    or p_handle ~ '(krpex|admin|moderat|official)';
$$;

-- Claim or change a handle and save the profile. Returns the saved row (no email).
-- Errors: not_signed_in · bad_handle · reserved_handle · handle_taken · handle_change_too_soon (30 days) ·
-- bad_name · bad_bio · links_need_level_4.
create or replace function public.save_public_profile(
  p_handle text, p_display_name text, p_bio text, p_is_public boolean, p_show_solves boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_handle text := lower(btrim(coalesce(p_handle, '')));
  v_name text := btrim(regexp_replace(coalesce(p_display_name, ''), '\s+', ' ', 'g'));
  v_bio text := btrim(regexp_replace(coalesce(p_bio, ''), '\s+', ' ', 'g'));
  v_old public.public_profiles;
  v_row public.public_profiles;
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  if v_handle !~ '^[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$' then raise exception 'bad_handle'; end if;
  if private.reserved_handle(v_handle) then raise exception 'reserved_handle'; end if;
  if char_length(v_name) not between 1 and 40 or v_name ~* 'krpex' then raise exception 'bad_name'; end if;
  if char_length(v_bio) > 160 then raise exception 'bad_bio'; end if;
  if (private.has_link(v_name) or private.has_link(v_bio)) and private.user_level(v_user) < 4 then
    raise exception 'links_need_level_4';
  end if;

  select * into v_old from public.public_profiles where user_id = v_user for update;
  if found and v_old.handle <> v_handle and v_old.handle_changed_at > now() - interval '30 days' then
    raise exception 'handle_change_too_soon';
  end if;

  begin
    insert into public.public_profiles as pp (user_id, handle, display_name, bio, is_public, show_solves)
    values (v_user, v_handle, v_name, v_bio, coalesce(p_is_public, false), coalesce(p_show_solves, false))
    on conflict (user_id) do update set
      handle = excluded.handle,
      handle_changed_at = case when pp.handle <> excluded.handle then now() else pp.handle_changed_at end,
      display_name = excluded.display_name,
      bio = excluded.bio,
      is_public = excluded.is_public,
      show_solves = excluded.show_solves,
      updated_at = now()
    returning * into v_row;
  exception when unique_violation then
    raise exception 'handle_taken';
  end;

  return jsonb_build_object('handle', v_row.handle, 'display_name', v_row.display_name, 'bio', v_row.bio,
    'is_public', v_row.is_public, 'show_solves', v_row.show_solves, 'hidden', v_row.hidden,
    'handle_changed_at', v_row.handle_changed_at);
end $$;
revoke all on function public.save_public_profile(text, text, text, boolean, boolean) from public, anon;
grant execute on function public.save_public_profile(text, text, text, boolean, boolean) to authenticated;

-- Whether a handle is free for the signed-in learner (their own counts as free). Null if the format is wrong.
create or replace function public.handle_available(p_handle text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when lower(btrim(coalesce(p_handle, ''))) !~ '^[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$' then null
    when private.reserved_handle(lower(btrim(p_handle))) then false
    else not exists (select 1 from public.public_profiles where handle = lower(btrim(p_handle)) and user_id <> auth.uid())
  end;
$$;
revoke all on function public.handle_available(text) from public, anon;
grant execute on function public.handle_available(text) to authenticated;

-- A public profile page's data, or null when the handle is unknown, private or hidden. Never returns an email,
-- user id or code. Activity: coding submissions per IST day for the last 26 weeks. Study days and frozen days
-- (last 400 days) are for the streak, worked out on the page the same way as the learner's own.
create or replace function public.public_profile(p_handle text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  p public.public_profiles;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v jsonb;
begin
  select * into p from public.public_profiles
   where handle = lower(btrim(coalesce(p_handle, ''))) and is_public and not hidden;
  if not found then return null; end if;

  with solved as (
    select s.problem, min(s.created_at) as at
      from public.coding_submissions s where s.user_id = p.user_id and s.solved group by s.problem
  )
  select jsonb_build_object(
    'handle', p.handle,
    'display_name', p.display_name,
    'bio', p.bio,
    'joined', (select u.created_at from auth.users u where u.id = p.user_id),
    'xp', (select coalesce(sum(points), 0) from public.xp_events where user_id = p.user_id),
    'lessons', (select count(*) from public.xp_events where user_id = p.user_id and key like 'lesson:%'),
    'study_days', coalesce((select jsonb_agg(substr(key, 5) order by key) from public.xp_events
        where user_id = p.user_id and key like 'day:%' and created_at > now() - interval '400 days'), '[]'::jsonb),
    'frozen_days', coalesce((select jsonb_agg(to_char(used_for, 'YYYY-MM-DD') order by used_for) from public.streak_freezes
        where user_id = p.user_id and used_for is not null and used_for > v_today - 400), '[]'::jsonb),
    'solved', jsonb_build_object(
        'easy', (select count(*) from solved s join public.coding_problems c on c.slug = s.problem where c.difficulty = 'easy'),
        'medium', (select count(*) from solved s join public.coding_problems c on c.slug = s.problem where c.difficulty = 'medium'),
        'hard', (select count(*) from solved s join public.coding_problems c on c.slug = s.problem where c.difficulty = 'hard')),
    'recent', case when p.show_solves then coalesce((
        select jsonb_agg(jsonb_build_object('problem', r.problem, 'at', r.at) order by r.at desc)
          from (select * from solved order by at desc limit 10) r), '[]'::jsonb) end,
    'activity', coalesce((
        select jsonb_object_agg(d, n) from (
          select to_char(s.created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as d, count(*) as n
            from public.coding_submissions s
           where s.user_id = p.user_id and s.created_at > now() - interval '183 days'
           group by 1) a), '{}'::jsonb),
    'plans', coalesce((select jsonb_agg(jsonb_build_object('plan', substr(key, 6), 'at', created_at) order by created_at)
        from public.xp_events where user_id = p.user_id and key like 'plan:%'), '[]'::jsonb)
  ) into v
  from (select 1) one;
  return v;
end $$;
revoke all on function public.public_profile(text) from public;
grant execute on function public.public_profile(text) to anon, authenticated;

-- Handles of public profiles, for the sitemap.
create or replace function public.public_profile_handles()
returns setof text language sql stable security definer set search_path = '' as $$
  select handle from public.public_profiles where is_public and not hidden order by updated_at desc limit 5000;
$$;
revoke all on function public.public_profile_handles() from public;
grant execute on function public.public_profile_handles() to anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array['user_level(uuid)', 'has_link(text)', 'reserved_handle(text)'] loop
    execute format('revoke all on function private.%s from public, anon, authenticated', f);
  end loop;
end $$;
