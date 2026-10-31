-- Profile table the dashboard reads (full_name). It was referenced by the app but never created.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile" on public.users
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists "Users can create own profile" on public.users;
create policy "Users can create own profile" on public.users
  for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile" on public.users
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

grant select, insert, update on public.users to authenticated;

-- Create a public.users profile row for every new auth user (email, GitHub, Google).
-- The app also creates it on demand (lib/supabase/profile.ts), so this is a safety net.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, full_name, created_at, updated_at)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'user_name', ''),
      split_part(new.email, '@', 1)
    ),
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: auth users who signed up before this trigger existed.
insert into public.users (id, full_name, created_at, updated_at)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    nullif(u.raw_user_meta_data ->> 'user_name', ''),
    split_part(u.email, '@', 1)
  ),
  now(),
  now()
from auth.users u
where not exists (select 1 from public.users p where p.id = u.id);
