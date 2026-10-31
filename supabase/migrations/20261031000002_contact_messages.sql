-- Messages from the public /contact form.
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  email text not null check (char_length(email) between 3 and 320),
  message text not null check (char_length(message) between 5 and 5000),
  created_at timestamptz not null default now(),
  handled boolean not null default false
);

alter table public.contact_messages enable row level security;

-- Anyone (signed in or not) may submit; nobody can read, edit or delete via the API.
-- Read them in the Supabase dashboard (Table editor) or with the service role.
drop policy if exists "Anyone can submit a contact message" on public.contact_messages;
create policy "Anyone can submit a contact message"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (handled = false);

grant insert on public.contact_messages to anon, authenticated;
