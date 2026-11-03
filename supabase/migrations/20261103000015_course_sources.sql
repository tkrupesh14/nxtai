-- Courses from the learner's own material: uploaded files are stored as extracted text only (never the file),
-- split into sections; the course plan assigns sections to lessons. Plan limits: Free 1 file / 50 pages,
-- Pro 3 files / 300 pages in total (keep in sync with SOURCE_LIMITS in lib/sources/sections.ts).

create table if not exists public.course_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- null until the course is created ("pending"); pending uploads are cleared after a day.
  course_id uuid references public.courses (id) on delete cascade,
  position int not null default 0,
  filename text not null check (char_length(filename) between 1 and 200),
  kind text not null check (kind in ('pdf', 'docx', 'text')),
  pages int not null check (pages between 1 and 1000),
  chars int not null check (chars >= 0),
  created_at timestamptz not null default now()
);
create index if not exists course_sources_user_idx on public.course_sources (user_id, created_at);
create index if not exists course_sources_course_idx on public.course_sources (course_id, position);

create table if not exists public.course_source_sections (
  id bigint generated always as identity primary key,
  source_id uuid not null references public.course_sources (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid references public.courses (id) on delete cascade,
  idx int not null,
  -- 1-based number across all of the course's files ("S12"), set when the course is created.
  position int,
  heading text check (char_length(heading) <= 200),
  page_from int,
  page_to int,
  body text not null check (char_length(body) between 1 and 8000),
  unique (source_id, idx)
);
create index if not exists course_source_sections_course_idx on public.course_source_sections (course_id, position);

-- Which sections each lesson teaches from (S numbers).
alter table public.lessons add column if not exists source_sections int[];
grant select (source_sections) on public.lessons to authenticated;

alter table public.course_sources enable row level security;
alter table public.course_source_sections enable row level security;
do $$
declare t text;
begin
  foreach t in array array['course_sources', 'course_source_sections'] loop
    execute format('drop policy if exists "Owner can read" on public.%I', t);
    execute format('create policy "Owner can read" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;
-- Learners may remove an upload before the course is built (sections go with it).
drop policy if exists "Owner can remove pending" on public.course_sources;
create policy "Owner can remove pending" on public.course_sources for delete to authenticated
  using (user_id = (select auth.uid()) and course_id is null);
grant delete on public.course_sources to authenticated;

-- Upload times for the hourly limit (kept even when an upload is removed).
create table if not exists private.source_uploads (
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists source_uploads_user_idx on private.source_uploads (user_id, created_at);

-- Save an extracted upload (server only). p_sections: [{heading, page_from, page_to, body}].
-- Errors: too_many_files | too_many_pages | rate_limited | invalid_source.
create or replace function public.app_add_source(
  p_key text, p_filename text, p_kind text, p_pages int, p_chars int, p_sections jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  pro boolean;
  max_files int; max_pages int;
  sid uuid; s jsonb; i int := 0;
begin
  perform private.require_server_key(p_key);
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_kind not in ('pdf', 'docx', 'text') or p_pages not between 1 and 1000
     or jsonb_typeof(p_sections) is distinct from 'array' or jsonb_array_length(p_sections) not between 1 and 400 then
    raise exception 'invalid_source';
  end if;

  -- Serialise uploads per learner so two at once can't both pass the limits.
  perform pg_advisory_xact_lock(hashtextextended('course_sources:' || uid::text, 0));
  delete from public.course_sources where user_id = uid and course_id is null and created_at < now() - interval '1 day';
  delete from private.source_uploads where user_id = uid and created_at < now() - interval '1 hour';
  if (select count(*) from private.source_uploads where user_id = uid) >= 20 then
    raise exception 'rate_limited';
  end if;
  insert into private.source_uploads (user_id) values (uid);

  pro := public.current_plan(uid) = 'pro';
  max_files := case when pro then 3 else 1 end;
  max_pages := case when pro then 300 else 50 end;
  if (select count(*) from public.course_sources where user_id = uid and course_id is null) >= max_files then
    raise exception 'too_many_files';
  end if;
  if coalesce((select sum(pages) from public.course_sources where user_id = uid and course_id is null), 0) + p_pages > max_pages then
    raise exception 'too_many_pages';
  end if;

  insert into public.course_sources (user_id, filename, kind, pages, chars)
  values (uid, left(coalesce(nullif(trim(p_filename), ''), 'Document'), 200), p_kind, p_pages, greatest(p_chars, 0))
  returning id into sid;

  for s in select value from jsonb_array_elements(p_sections) loop
    if coalesce(s->>'body', '') = '' then continue; end if;
    insert into public.course_source_sections (source_id, user_id, idx, heading, page_from, page_to, body)
    values (sid, uid, i, left(nullif(s->>'heading', ''), 200),
            case when s->>'page_from' ~ '^\d{1,4}$' then (s->>'page_from')::int end,
            case when s->>'page_to' ~ '^\d{1,4}$' then (s->>'page_to')::int end,
            left(s->>'body', 8000));
    i := i + 1;
  end loop;
  if i = 0 then raise exception 'invalid_source'; end if;
  return sid;
end $$;

-- Course creation now optionally attaches the learner's pending uploads (in the given order) and stores each
-- lesson's section numbers. Replaces the 3-argument version from migration 008.
drop function if exists public.app_create_course(text, jsonb, jsonb);
create or replace function public.app_create_course(p_key text, p_course jsonb, p_modules jsonb, p_sources uuid[] default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cid uuid; mid uuid; m jsonb; l jsonb;
  mpos int := 0; lpos int := 0; lcount int;
  nsources int := coalesce(cardinality(p_sources), 0);
  smax int := 0;
  pro boolean;
  max_files int; max_pages int;
begin
  perform private.require_server_key(p_key);
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if jsonb_typeof(p_modules) is distinct from 'array' or jsonb_array_length(p_modules) not between 1 and 8 then
    raise exception 'invalid course plan';
  end if;

  if nsources > 0 then
    perform pg_advisory_xact_lock(hashtextextended('course_sources:' || uid::text, 0));
    pro := public.current_plan(uid) = 'pro';
    max_files := case when pro then 3 else 1 end;
    max_pages := case when pro then 300 else 50 end;
    if nsources > max_files
       or nsources <> (select count(distinct x) from unnest(p_sources) x)
       or nsources <> (select count(*) from public.course_sources
                        where id = any (p_sources) and user_id = uid and course_id is null)
       or (select sum(pages) from public.course_sources where id = any (p_sources)) > max_pages then
      raise exception 'invalid_sources';
    end if;
  end if;

  insert into public.courses (user_id, title, summary, level, estimated_weeks, goal, category, subcategory, professor, welcome)
  values (uid,
          left(coalesce(p_course->>'title', 'My course'), 200),
          left(coalesce(p_course->>'summary', ''), 2000),
          left(coalesce(p_course->>'level', 'beginner'), 40),
          least(greatest(nullif(p_course->>'estimated_weeks', '')::int, 1), 104),
          left(coalesce(p_course->>'goal', ''), 500),
          left(p_course->>'category', 40),
          left(p_course->>'subcategory', 60),
          left(p_course->>'professor', 40),
          left(p_course->>'welcome', 2000))
  returning id into cid;

  if nsources > 0 then
    update public.course_sources cs set course_id = cid, position = o.ord - 1
      from unnest(p_sources) with ordinality o(id, ord)
     where cs.id = o.id;
    update public.course_source_sections ss set course_id = cid, position = n.pos
      from (select s.id, row_number() over (order by cs.position, s.idx)::int as pos
              from public.course_source_sections s join public.course_sources cs on cs.id = s.source_id
             where cs.course_id = cid) n
     where ss.id = n.id;
    select coalesce(max(position), 0) into smax from public.course_source_sections where course_id = cid;
  end if;

  for m in select value from jsonb_array_elements(p_modules) loop
    insert into public.course_modules (course_id, user_id, position, title, summary)
    values (cid, uid, mpos, left(coalesce(m->>'title', 'Module'), 200), left(coalesce(m->>'summary', ''), 1000))
    returning id into mid;
    lcount := 0;
    for l in select value from jsonb_array_elements(coalesce(m->'lessons', '[]'::jsonb)) loop
      exit when lcount >= 6;
      insert into public.lessons (course_id, module_id, user_id, position, title, objective, est_minutes, source_sections)
      values (cid, mid, uid, lpos,
              left(coalesce(l->>'title', 'Lesson'), 200),
              left(coalesce(l->>'objective', ''), 500),
              least(greatest(coalesce(nullif(l->>'est_minutes', '')::int, 30), 10), 90),
              case when smax > 0 then array(
                select distinct x::int from jsonb_array_elements_text(
                  case when jsonb_typeof(l->'sections') = 'array' then l->'sections' else '[]'::jsonb end) x
                 where x ~ '^\d{1,4}$' and x::int between 1 and smax
                 order by 1 limit 8) end);
      lpos := lpos + 1;
      lcount := lcount + 1;
    end loop;
    mpos := mpos + 1;
  end loop;
  if lpos = 0 then raise exception 'invalid course plan'; end if;
  return cid;
end $$;

revoke all on function public.app_add_source(text, text, text, int, int, jsonb) from public, anon;
grant execute on function public.app_add_source(text, text, text, int, int, jsonb) to authenticated;
revoke all on function public.app_create_course(text, jsonb, jsonb, uuid[]) from public, anon;
grant execute on function public.app_create_course(text, jsonb, jsonb, uuid[]) to authenticated;
