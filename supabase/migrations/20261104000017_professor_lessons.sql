-- Professor portal, part 2 (tracker 8.1): model lessons professors write in the lesson editor, stored in the same
-- block format the AI writes (lib/learning/schemas.ts), so they can later be used as examples for the AI.

create table if not exists public.professor_lessons (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.professors (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 200),
  topic text check (char_length(topic) <= 120),
  language text not null check (language in ('en', 'hi')),
  objective text check (char_length(objective) <= 500),
  blocks jsonb not null check (jsonb_typeof(blocks) = 'array' and jsonb_array_length(blocks) between 1 and 30
                               and octet_length(blocks::text) <= 200000),
  key_takeaways jsonb not null default '[]'::jsonb check (jsonb_typeof(key_takeaways) = 'array' and octet_length(key_takeaways::text) <= 20000),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists professor_lessons_prof_idx on public.professor_lessons (professor_id, updated_at desc);

alter table public.professor_lessons enable row level security;
revoke all on public.professor_lessons from public, anon, authenticated;
drop policy if exists "Professor reads own lessons" on public.professor_lessons;
create policy "Professor reads own lessons" on public.professor_lessons for select to authenticated
  using (professor_id in (select p.id from public.professors p where p.user_id = (select auth.uid())));
drop policy if exists "Professor removes own lessons" on public.professor_lessons;
create policy "Professor removes own lessons" on public.professor_lessons for delete to authenticated
  using (professor_id in (select p.id from public.professors p where p.user_id = (select auth.uid())));
grant select, delete on public.professor_lessons to authenticated;

-- Create (p_id null) or update a lesson. The app validates the blocks; this checks ownership, sizes and limits.
-- Editing a published lesson keeps it published. At most 200 lessons per professor.
create or replace function public.professor_save_lesson(
  p_id uuid, p_title text, p_topic text, p_language text, p_objective text, p_blocks jsonb, p_takeaways jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare prof public.professors; out_id uuid;
begin
  select * into prof from public.professors where user_id = auth.uid();
  if not found then raise exception 'not_professor'; end if;
  if prof.status = 'suspended' then raise exception 'suspended'; end if;
  if p_id is null then
    perform pg_advisory_xact_lock(hashtextextended(prof.id::text, 17));
    if (select count(*) from public.professor_lessons l where l.professor_id = prof.id) >= 200 then
      raise exception 'too_many_lessons';
    end if;
    insert into public.professor_lessons (professor_id, title, topic, language, objective, blocks, key_takeaways)
    values (prof.id, trim(p_title), nullif(trim(coalesce(p_topic, '')), ''), p_language, nullif(trim(coalesce(p_objective, '')), ''),
            p_blocks, coalesce(p_takeaways, '[]'::jsonb))
    returning id into out_id;
  else
    update public.professor_lessons
       set title = trim(p_title), topic = nullif(trim(coalesce(p_topic, '')), ''), language = p_language,
           objective = nullif(trim(coalesce(p_objective, '')), ''), blocks = p_blocks,
           key_takeaways = coalesce(p_takeaways, '[]'::jsonb), updated_at = now()
     where id = p_id and professor_id = prof.id
    returning id into out_id;
    if out_id is null then raise exception 'not_found'; end if;
  end if;
  return out_id;
end $$;

-- Publish (approved professors only) or move back to draft.
create or replace function public.professor_set_lesson_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare prof public.professors;
begin
  select * into prof from public.professors where user_id = auth.uid();
  if not found then raise exception 'not_professor'; end if;
  if p_status not in ('draft', 'published') then raise exception 'invalid_status'; end if;
  if p_status = 'published' and prof.status <> 'approved' then raise exception 'not_approved'; end if;
  update public.professor_lessons
     set status = p_status, published_at = case when p_status = 'published' then now() else null end
   where id = p_id and professor_id = prof.id;
  if not found then raise exception 'not_found'; end if;
end $$;

revoke all on function public.professor_save_lesson(uuid, text, text, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.professor_save_lesson(uuid, text, text, text, text, jsonb, jsonb) to authenticated;
revoke all on function public.professor_set_lesson_status(uuid, text) from public, anon;
grant execute on function public.professor_set_lesson_status(uuid, text) to authenticated;

-- Admin overview: count model lessons too.
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
        'pages', (select coalesce(sum(m.pages), 0) from public.professor_materials m where m.professor_id = p.id),
        'lessons', (select count(*) from public.professor_lessons l where l.professor_id = p.id),
        'lessons_published', (select count(*) from public.professor_lessons l where l.professor_id = p.id and l.status = 'published')
      ) order by p.created_at desc)
      from public.professors p join auth.users u on u.id = p.user_id), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object(
        'id', i.id, 'email', i.email, 'subject', i.subject, 'created_at', i.created_at, 'expires_at', i.expires_at
      ) order by i.created_at desc)
      from private.professor_invites i where i.used_at is null and i.revoked_at is null and i.expires_at > now()), '[]'::jsonb)
  ) into r;
  return r;
end $$;
