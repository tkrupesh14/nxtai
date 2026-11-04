-- Professor portal, part 1 (tracker 8.1): invite-only professor accounts, their profile and the contributor
-- agreement they accepted, and the material they upload (extracted text only, like course_sources).
-- Learners can't see any of this yet; 8.2 adds public professor pages and uses published material in lessons.

create table if not exists public.professors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  subject text not null check (subject ~ '^[a-z_]+/[a-z0-9_-]+$'), -- "science/physics"
  display_name text not null check (char_length(display_name) between 2 and 80),
  title text check (char_length(title) <= 80),
  institution text check (char_length(institution) <= 120),
  bio text check (char_length(bio) <= 1200),
  languages text[] not null default '{en}' check (cardinality(languages) between 1 and 2 and languages <@ array['en', 'hi']),
  credentials text check (char_length(credentials) <= 1200), -- seen by admins only (and the professor)
  status text not null default 'pending' check (status in ('pending', 'approved', 'suspended')),
  agreement_version text not null check (char_length(agreement_version) <= 40),
  agreement_at timestamptz not null default now(),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.professor_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 320),
  subject text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_at timestamptz,
  used_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz
);

create table if not exists public.professor_materials (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.professors (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  kind text not null check (kind in ('pdf', 'docx', 'text')),
  language text not null check (language in ('en', 'hi')),
  topic text check (char_length(topic) <= 120),
  pages int not null check (pages between 1 and 1000),
  chars int not null check (chars >= 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists professor_materials_prof_idx on public.professor_materials (professor_id, created_at);

create table if not exists public.professor_material_sections (
  id bigint generated always as identity primary key,
  material_id uuid not null references public.professor_materials (id) on delete cascade,
  professor_id uuid not null references public.professors (id) on delete cascade,
  idx int not null,
  heading text check (char_length(heading) <= 200),
  page_from int,
  page_to int,
  body text not null check (char_length(body) between 1 and 8000),
  unique (material_id, idx)
);

create table if not exists private.professor_uploads (
  professor_id uuid not null references public.professors (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- The signed-in user's professor id (null if they aren't one).
create or replace function private.my_professor_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.professors p where p.user_id = auth.uid();
$$;

alter table public.professors enable row level security;
alter table public.professor_materials enable row level security;
alter table public.professor_material_sections enable row level security;
revoke all on public.professors, public.professor_materials, public.professor_material_sections from public, anon, authenticated;

drop policy if exists "Professor reads own profile" on public.professors;
create policy "Professor reads own profile" on public.professors for select to authenticated using (user_id = (select auth.uid()));
grant select on public.professors to authenticated;

drop policy if exists "Professor reads own material" on public.professor_materials;
create policy "Professor reads own material" on public.professor_materials for select to authenticated
  using (professor_id in (select p.id from public.professors p where p.user_id = (select auth.uid())));
-- Withdrawing material deletes it for good (its sections go with it).
drop policy if exists "Professor removes own material" on public.professor_materials;
create policy "Professor removes own material" on public.professor_materials for delete to authenticated
  using (professor_id in (select p.id from public.professors p where p.user_id = (select auth.uid())));
grant select, delete on public.professor_materials to authenticated;

drop policy if exists "Professor reads own sections" on public.professor_material_sections;
create policy "Professor reads own sections" on public.professor_material_sections for select to authenticated
  using (professor_id in (select p.id from public.professors p where p.user_id = (select auth.uid())));
grant select on public.professor_material_sections to authenticated;
revoke all on function private.my_professor_id() from public, anon, authenticated;

-- Admin: create an invite for one email. Returns the token once (only its hash is stored).
create or replace function public.admin_create_professor_invite(p_email text, p_subject text) returns text
language plpgsql security definer set search_path = '' as $$
declare tok text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  perform private.require_admin();
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(p_email) > 320 then
    raise exception 'invalid_email';
  end if;
  if p_subject is null or p_subject !~ '^[a-z_]+/[a-z0-9_-]+$' then raise exception 'invalid_subject'; end if;
  insert into private.professor_invites (email, subject, token_hash)
  values (lower(trim(p_email)), p_subject, encode(sha256(convert_to(tok, 'UTF8')), 'hex'));
  return tok;
end $$;

create or replace function public.admin_revoke_professor_invite(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  update private.professor_invites set revoked_at = now() where id = p_id and used_at is null;
end $$;

create or replace function public.admin_set_professor_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  if p_status not in ('pending', 'approved', 'suspended') then raise exception 'invalid_status'; end if;
  update public.professors
     set status = p_status, updated_at = now(),
         approved_at = case when p_status = 'approved' then coalesce(approved_at, now()) else approved_at end
   where id = p_id;
end $$;

-- Admin: professors (with their material counts) and invites that haven't been used.
create or replace function public.admin_professors() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  perform private.require_admin();
  select jsonb_build_object(
    'professors', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'email', u.email, 'display_name', p.display_name, 'title', p.title, 'institution', p.institution,
        'subject', p.subject, 'languages', p.languages, 'credentials', p.credentials, 'status', p.status,
        'agreement_version', p.agreement_version, 'created_at', p.created_at,
        'materials', (select count(*) from public.professor_materials m where m.professor_id = p.id),
        'published', (select count(*) from public.professor_materials m where m.professor_id = p.id and m.status = 'published'),
        'pages', (select coalesce(sum(m.pages), 0) from public.professor_materials m where m.professor_id = p.id)
      ) order by p.created_at desc)
      from public.professors p join auth.users u on u.id = p.user_id), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object(
        'id', i.id, 'email', i.email, 'subject', i.subject, 'created_at', i.created_at, 'expires_at', i.expires_at
      ) order by i.created_at desc)
      from private.professor_invites i where i.used_at is null and i.revoked_at is null and i.expires_at > now()), '[]'::jsonb)
  ) into r;
  return r;
end $$;

-- The join page: is this invite usable by the signed-in user?
-- status: ok | wrong_email | used | expired | not_found | already_professor
create or replace function public.professor_invite_status(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare i private.professor_invites; me text;
begin
  if auth.uid() is null then return jsonb_build_object('status', 'not_found'); end if;
  if exists (select 1 from public.professors p where p.user_id = auth.uid()) then
    return jsonb_build_object('status', 'already_professor');
  end if;
  select * into i from private.professor_invites
   where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
  if not found or i.revoked_at is not null then return jsonb_build_object('status', 'not_found'); end if;
  if i.used_at is not null then return jsonb_build_object('status', 'used'); end if;
  if i.expires_at <= now() then return jsonb_build_object('status', 'expired'); end if;
  select lower(u.email) into me from auth.users u where u.id = auth.uid();
  if me is distinct from i.email then
    -- Show only a hint of the invited address.
    return jsonb_build_object('status', 'wrong_email', 'hint', left(i.email, 2) || '…@' || split_part(i.email, '@', 2));
  end if;
  return jsonb_build_object('status', 'ok', 'subject', i.subject);
end $$;

-- Accept an invite: creates the professor (pending until an admin approves) with the agreement version accepted.
create or replace function public.accept_professor_invite(p_token text, p_display_name text, p_agreement_version text)
returns text
language plpgsql security definer set search_path = '' as $$
declare i private.professor_invites; me text;
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  if char_length(trim(coalesce(p_display_name, ''))) not between 2 and 80 then raise exception 'invalid_name'; end if;
  if char_length(coalesce(p_agreement_version, '')) not between 1 and 40 then raise exception 'invalid_agreement'; end if;
  select * into i from private.professor_invites
   where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
   for update;
  if not found or i.revoked_at is not null or i.used_at is not null or i.expires_at <= now() then
    raise exception 'invite_invalid';
  end if;
  select lower(u.email) into me from auth.users u where u.id = auth.uid();
  if me is distinct from i.email then raise exception 'wrong_email'; end if;
  if exists (select 1 from public.professors p where p.user_id = auth.uid()) then raise exception 'already_professor'; end if;
  insert into public.professors (user_id, subject, display_name, agreement_version)
  values (auth.uid(), i.subject, trim(p_display_name), p_agreement_version);
  update private.professor_invites set used_at = now(), used_by = auth.uid() where id = i.id;
  return 'ok';
end $$;

create or replace function public.professor_update_profile(
  p_display_name text, p_title text, p_institution text, p_bio text, p_languages text[], p_credentials text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if private.my_professor_id() is null then raise exception 'not_professor'; end if;
  if char_length(trim(coalesce(p_display_name, ''))) not between 2 and 80 then raise exception 'invalid_name'; end if;
  update public.professors set
    display_name = trim(p_display_name),
    title = nullif(trim(left(coalesce(p_title, ''), 80)), ''),
    institution = nullif(trim(left(coalesce(p_institution, ''), 120)), ''),
    bio = nullif(trim(left(coalesce(p_bio, ''), 1200)), ''),
    languages = p_languages,
    credentials = nullif(trim(left(coalesce(p_credentials, ''), 1200)), ''),
    updated_at = now()
  where user_id = auth.uid();
end $$;

-- Server only: save an uploaded file's sections. Suspended professors can't upload.
-- Limits: 300 files and 5,000 pages per professor, 30 uploads an hour.
create or replace function public.app_add_professor_material(
  p_key text, p_title text, p_kind text, p_language text, p_topic text, p_pages int, p_chars int, p_sections jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare prof public.professors; new_id uuid; n int;
begin
  perform private.require_server_key(p_key);
  select * into prof from public.professors where user_id = auth.uid();
  if not found then raise exception 'not_professor'; end if;
  if prof.status = 'suspended' then raise exception 'suspended'; end if;
  perform pg_advisory_xact_lock(hashtextextended(prof.id::text, 16));
  if (select count(*) from private.professor_uploads u where u.professor_id = prof.id and u.created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rate_limited';
  end if;
  if (select count(*) from public.professor_materials m where m.professor_id = prof.id) >= 300 then raise exception 'too_many_files'; end if;
  if (select coalesce(sum(m.pages), 0) from public.professor_materials m where m.professor_id = prof.id) + p_pages > 5000 then
    raise exception 'too_many_pages';
  end if;
  n := coalesce(jsonb_array_length(p_sections), 0);
  if n = 0 or n > 400 then raise exception 'invalid_sections'; end if;

  insert into public.professor_materials (professor_id, title, kind, language, topic, pages, chars)
  values (prof.id, p_title, p_kind, p_language, nullif(trim(left(coalesce(p_topic, ''), 120)), ''), p_pages, p_chars)
  returning id into new_id;
  insert into public.professor_material_sections (material_id, professor_id, idx, heading, page_from, page_to, body)
  select new_id, prof.id, (s.ord - 1)::int, left(s.value->>'heading', 200), (s.value->>'page_from')::int, (s.value->>'page_to')::int,
         left(s.value->>'body', 8000)
    from jsonb_array_elements(p_sections) with ordinality as s(value, ord)
   where coalesce(s.value->>'body', '') <> '';
  insert into private.professor_uploads (professor_id) values (prof.id);
  return new_id;
end $$;

-- Publish (approved professors only) or move back to draft.
create or replace function public.professor_set_material_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare prof public.professors;
begin
  select * into prof from public.professors where user_id = auth.uid();
  if not found then raise exception 'not_professor'; end if;
  if p_status not in ('draft', 'published') then raise exception 'invalid_status'; end if;
  if p_status = 'published' and prof.status <> 'approved' then raise exception 'not_approved'; end if;
  update public.professor_materials
     set status = p_status, published_at = case when p_status = 'published' then now() else null end
   where id = p_id and professor_id = prof.id;
  if not found then raise exception 'not_found'; end if;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_create_professor_invite(text, text)', 'admin_revoke_professor_invite(uuid)', 'admin_set_professor_status(uuid, text)',
    'admin_professors()', 'professor_invite_status(text)', 'accept_professor_invite(text, text, text)',
    'professor_update_profile(text, text, text, text, text[], text)', 'professor_set_material_status(uuid, text)',
    'app_add_professor_material(text, text, text, text, text, int, int, jsonb)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
