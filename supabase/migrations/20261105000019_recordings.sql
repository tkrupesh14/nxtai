-- Professor portal (tracker 8.4, part 1): lecture recordings. The app streams a professor's audio or video straight
-- to Sarvam's speech-to-text (batch) and keeps only the transcript; the recording itself is never stored by Krpex.
-- The professor corrects the transcript, then adds it to their material (kind 'lecture'), where it works like a PDF.

alter table public.professor_materials drop constraint if exists professor_materials_kind_check;
alter table public.professor_materials add constraint professor_materials_kind_check check (kind in ('pdf', 'docx', 'text', 'lecture'));

create table if not exists public.professor_recordings (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.professors (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  language text not null check (language in ('en', 'hi')),
  topic text check (char_length(topic) <= 120),
  filename text not null check (char_length(filename) between 1 and 255),
  bytes bigint not null check (bytes > 0),
  -- Length reserved against the monthly allowance at upload (from the browser), then the real length once transcribed.
  seconds int not null check (seconds between 1 and 7200),
  status text not null default 'uploading' check (status in ('uploading', 'transcribing', 'ready', 'failed', 'added')),
  job_id text check (char_length(job_id) <= 200),
  transcript text check (char_length(transcript) <= 300000),
  error text check (char_length(error) <= 500),
  material_id uuid references public.professor_materials (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists professor_recordings_prof_idx on public.professor_recordings (professor_id, created_at desc);

alter table public.professor_recordings enable row level security;
revoke all on public.professor_recordings from public, anon, authenticated;
drop policy if exists "Professor reads own recordings" on public.professor_recordings;
create policy "Professor reads own recordings" on public.professor_recordings for select to authenticated
  using (professor_id in (select p.id from public.professors p where p.user_id = (select auth.uid())));
drop policy if exists "Professor removes own recordings" on public.professor_recordings;
create policy "Professor removes own recordings" on public.professor_recordings for delete to authenticated
  using (professor_id in (select p.id from public.professors p where p.user_id = (select auth.uid())));
grant select, delete on public.professor_recordings to authenticated;

-- Start an upload: checks the professor, the monthly allowance (600 minutes, failed uploads don't count) and that
-- at most 3 are in progress. Called by the upload route with the server key, as the signed-in professor.
create or replace function public.app_start_recording(
  p_key text, p_title text, p_language text, p_topic text, p_filename text, p_bytes bigint, p_seconds int
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare prof public.professors; out_id uuid;
begin
  perform private.require_server_key(p_key);
  select * into prof from public.professors where user_id = auth.uid();
  if not found then raise exception 'not_professor'; end if;
  if prof.status = 'suspended' then raise exception 'suspended'; end if;
  if p_seconds is null or p_seconds < 1 or p_seconds > 7200 then raise exception 'too_long'; end if;
  perform pg_advisory_xact_lock(hashtextextended(prof.id::text, 19));
  if (select count(*) from public.professor_recordings r
       where r.professor_id = prof.id and r.status in ('uploading', 'transcribing') and r.updated_at > now() - interval '3 hours') >= 3 then
    raise exception 'too_many_in_progress';
  end if;
  if (select coalesce(sum(r.seconds), 0) from public.professor_recordings r
       where r.professor_id = prof.id and r.status <> 'failed' and r.created_at >= date_trunc('month', now())) + p_seconds > 600 * 60 then
    raise exception 'monthly_limit';
  end if;
  insert into public.professor_recordings (professor_id, title, language, topic, filename, bytes, seconds)
  values (prof.id, trim(p_title), p_language, nullif(trim(left(coalesce(p_topic, ''), 120)), ''), left(p_filename, 255), p_bytes, p_seconds)
  returning id into out_id;
  return out_id;
end $$;

-- Move a recording on: transcribing (with the Sarvam job id), ready (with the transcript), or failed.
create or replace function public.app_update_recording(
  p_key text, p_id uuid, p_status text, p_job_id text, p_transcript text, p_seconds int, p_error text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_server_key(p_key);
  if p_status not in ('transcribing', 'ready', 'failed') then raise exception 'invalid_status'; end if;
  update public.professor_recordings r
     set status = p_status,
         job_id = coalesce(p_job_id, r.job_id),
         transcript = coalesce(p_transcript, r.transcript),
         seconds = case when p_seconds between 1 and 7200 then p_seconds else r.seconds end,
         error = case when p_status = 'failed' then left(coalesce(p_error, 'failed'), 500) else null end,
         updated_at = now()
   where r.id = p_id and r.status in ('uploading', 'transcribing')
     and r.professor_id in (select p.id from public.professors p where p.user_id = auth.uid());
  if not found then raise exception 'not_found'; end if;
end $$;

-- The professor corrects the transcript.
create or replace function public.professor_save_transcript(p_id uuid, p_transcript text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if char_length(coalesce(p_transcript, '')) not between 1 and 300000 then raise exception 'invalid_transcript'; end if;
  update public.professor_recordings r set transcript = p_transcript, updated_at = now()
   where r.id = p_id and r.status = 'ready'
     and r.professor_id in (select p.id from public.professors p where p.user_id = auth.uid());
  if not found then raise exception 'not_found'; end if;
end $$;

-- Record that the transcript was added as material (the app adds it with app_add_professor_material first).
create or replace function public.app_recording_added(p_key text, p_id uuid, p_material uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_server_key(p_key);
  update public.professor_recordings r set status = 'added', material_id = p_material, updated_at = now()
   where r.id = p_id and r.status = 'ready'
     and r.professor_id in (select p.id from public.professors p where p.user_id = auth.uid())
     and exists (select 1 from public.professor_materials m where m.id = p_material and m.professor_id = r.professor_id);
  if not found then raise exception 'not_found'; end if;
end $$;

revoke all on function public.app_start_recording(text, text, text, text, text, bigint, int) from public, anon;
grant execute on function public.app_start_recording(text, text, text, text, text, bigint, int) to authenticated;
revoke all on function public.app_update_recording(text, uuid, text, text, text, int, text) from public, anon;
grant execute on function public.app_update_recording(text, uuid, text, text, text, int, text) to authenticated;
revoke all on function public.professor_save_transcript(uuid, text) from public, anon;
grant execute on function public.professor_save_transcript(uuid, text) to authenticated;
revoke all on function public.app_recording_added(text, uuid, uuid) from public, anon;
grant execute on function public.app_recording_added(text, uuid, uuid) to authenticated;

-- Admin overview: recording minutes this month too.
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
        'lessons_published', (select count(*) from public.professor_lessons l where l.professor_id = p.id and l.status = 'published'),
        'recording_minutes_month', (select coalesce(round(sum(rec.seconds) / 60.0), 0) from public.professor_recordings rec
                                     where rec.professor_id = p.id and rec.status <> 'failed' and rec.created_at >= date_trunc('month', now()))
      ) order by p.created_at desc)
      from public.professors p join auth.users u on u.id = p.user_id), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object(
        'id', i.id, 'email', i.email, 'subject', i.subject, 'created_at', i.created_at, 'expires_at', i.expires_at
      ) order by i.created_at desc)
      from private.professor_invites i where i.used_at is null and i.revoked_at is null and i.expires_at > now()), '[]'::jsonb)
  ) into r;
  return r;
end $$;
