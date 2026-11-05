-- 8.3 Hindi teaching: the language a course is taught in, and the learner's default for new courses.
-- Lessons, quizzes, tests, chat and the course plan are written in it; the site's own buttons and menus stay English.

alter table public.learner_profiles
  add column if not exists language text not null default 'en' check (language in ('en', 'hi'));
alter table public.courses
  add column if not exists language text not null default 'en' check (language in ('en', 'hi'));

-- Same as migration 015, plus p_course->>'language' (default English).
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

  insert into public.courses (user_id, title, summary, level, estimated_weeks, goal, category, subcategory, professor, welcome, language)
  values (uid,
          left(coalesce(p_course->>'title', 'My course'), 200),
          left(coalesce(p_course->>'summary', ''), 2000),
          left(coalesce(p_course->>'level', 'beginner'), 40),
          least(greatest(nullif(p_course->>'estimated_weeks', '')::int, 1), 104),
          left(coalesce(p_course->>'goal', ''), 500),
          left(p_course->>'category', 40),
          left(p_course->>'subcategory', 60),
          left(p_course->>'professor', 40),
          left(p_course->>'welcome', 2000),
          case when p_course->>'language' = 'hi' then 'hi' else 'en' end)
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

revoke all on function public.app_create_course(text, jsonb, jsonb, uuid[]) from public, anon;
grant execute on function public.app_create_course(text, jsonb, jsonb, uuid[]) to authenticated;
