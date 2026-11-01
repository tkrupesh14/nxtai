-- G20: learners can no longer write courses, modules or lessons directly (which allowed adding
-- lessons, marking them complete or resetting them to make us regenerate them, all costing AI money).
-- - Course creation and lesson saving go through functions that need the server key (only a SHA-256
--   hash is stored here; the key lives in the app's environment as SERVER_RPC_KEY).
-- - Quizzes are graded in the database; learners can't read quiz answers.
-- - Learners keep read access (except lessons.quiz) and can delete their own courses.
-- After running this, set the key hash (see the end of this file).

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.server_keys (
  name text primary key,
  key_hash text not null,
  created_at timestamptz not null default now()
);

create or replace function private.require_server_key(p_key text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_key is null or not exists (
    select 1 from private.server_keys k
     where k.name = 'app' and k.key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')
  ) then
    raise exception 'server key required' using errcode = '42501';
  end if;
end $$;

-- Table permissions for learners.
revoke insert, update on public.courses from authenticated;
revoke insert, update, delete on public.course_modules from authenticated;
revoke insert, update, delete on public.lessons from authenticated;
revoke select on public.lessons from authenticated;
grant select (id, course_id, module_id, user_id, position, title, objective, est_minutes, content_md, blocks,
              key_takeaways, generated_at, best_score, attempts, completed_at, created_at)
  on public.lessons to authenticated;

-- Create a course with its modules and lessons in one transaction (server only).
-- The courses insert trigger (migration 007) charges the free allowance or credits.
create or replace function public.app_create_course(p_key text, p_course jsonb, p_modules jsonb)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cid uuid; mid uuid; m jsonb; l jsonb;
  mpos int := 0; lpos int := 0; lcount int;
begin
  perform private.require_server_key(p_key);
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if jsonb_typeof(p_modules) is distinct from 'array' or jsonb_array_length(p_modules) not between 1 and 8 then
    raise exception 'invalid course plan';
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

  for m in select value from jsonb_array_elements(p_modules) loop
    insert into public.course_modules (course_id, user_id, position, title, summary)
    values (cid, uid, mpos, left(coalesce(m->>'title', 'Module'), 200), left(coalesce(m->>'summary', ''), 1000))
    returning id into mid;
    lcount := 0;
    for l in select value from jsonb_array_elements(coalesce(m->'lessons', '[]'::jsonb)) loop
      exit when lcount >= 6;
      insert into public.lessons (course_id, module_id, user_id, position, title, objective, est_minutes)
      values (cid, mid, uid, lpos,
              left(coalesce(l->>'title', 'Lesson'), 200),
              left(coalesce(l->>'objective', ''), 500),
              least(greatest(coalesce(nullif(l->>'est_minutes', '')::int, 30), 10), 90));
      lpos := lpos + 1;
      lcount := lcount + 1;
    end loop;
    mpos := mpos + 1;
  end loop;
  if lpos = 0 then raise exception 'invalid course plan'; end if;
  return cid;
end $$;

-- Claim a lesson for generation so only one request calls the AI (server only).
-- status: ready | pending | locked | not_found | claimed (with claimed_at).
create or replace function public.app_claim_lesson(p_key text, p_lesson uuid)
returns table (status text, claimed_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); l record; ts timestamptz := clock_timestamp();
begin
  perform private.require_server_key(p_key);
  select x.id, x.course_id, x.position, x.content_md, x.blocks, x.generated_at into l
    from public.lessons x where x.id = p_lesson and x.user_id = uid for update;
  if not found then return query select 'not_found'::text, null::timestamptz; return; end if;
  if l.content_md is not null or l.blocks is not null then
    return query select 'ready'::text, null::timestamptz; return;
  end if;
  if l.position > 0 and not exists (
    select 1 from public.lessons p where p.course_id = l.course_id and p.position = l.position - 1 and p.completed_at is not null
  ) then
    return query select 'locked'::text, null::timestamptz; return;
  end if;
  if l.generated_at is not null and l.generated_at > ts - interval '4 minutes' then
    return query select 'pending'::text, null::timestamptz; return;
  end if;
  update public.lessons set generated_at = ts where id = p_lesson;
  return query select 'claimed'::text, ts;
end $$;

-- Save generated content for a claimed lesson (server only). Content can never be replaced.
create or replace function public.app_save_lesson(
  p_key text, p_lesson uuid, p_claimed_at timestamptz, p_blocks jsonb, p_takeaways jsonb, p_quiz jsonb
) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_server_key(p_key);
  if octet_length(p_blocks::text) > 300000 or octet_length(p_quiz::text) > 100000 or octet_length(p_takeaways::text) > 20000 then
    raise exception 'lesson too large';
  end if;
  update public.lessons
     set blocks = p_blocks, key_takeaways = p_takeaways, quiz = p_quiz, generated_at = clock_timestamp()
   where id = p_lesson and user_id = auth.uid() and blocks is null and content_md is null and generated_at = p_claimed_at;
  return found;
end $$;

-- Give up a claim after a failed generation (server only).
create or replace function public.app_release_lesson(p_key text, p_lesson uuid, p_claimed_at timestamptz)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_server_key(p_key);
  update public.lessons set generated_at = null
   where id = p_lesson and user_id = auth.uid() and blocks is null and content_md is null and generated_at = p_claimed_at;
end $$;

-- Final-quiz questions without the answers (for the lesson page).
create or replace function public.lesson_quiz_questions(p_lesson uuid)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('question', q.value->'question', 'options', q.value->'options') order by q.ord), '[]'::jsonb)
    from public.lessons l, jsonb_array_elements(coalesce(l.quiz, '[]'::jsonb)) with ordinality as q(value, ord)
   where l.id = p_lesson and l.user_id = auth.uid();
$$;

-- Grade the final quiz in the database and record progress. Pass mark 60%.
create or replace function public.submit_quiz(p_lesson uuid, p_answers int[])
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); l record; q jsonb; n int; correct int := 0; i int;
  results jsonb := '[]'::jsonb; score int; passed boolean; next_id uuid; remaining int;
begin
  select x.id, x.course_id, x.position, x.quiz, x.best_score, x.attempts, x.completed_at into l
    from public.lessons x where x.id = p_lesson and x.user_id = uid for update;
  if not found or l.quiz is null or jsonb_array_length(l.quiz) = 0 then
    return jsonb_build_object('error', 'This quiz isn''t available.');
  end if;
  if l.position > 0 and not exists (
    select 1 from public.lessons p where p.course_id = l.course_id and p.position = l.position - 1 and p.completed_at is not null
  ) then
    return jsonb_build_object('error', 'Finish the previous lesson first.');
  end if;
  n := jsonb_array_length(l.quiz);
  if p_answers is null or coalesce(array_length(p_answers, 1), 0) <> n then
    return jsonb_build_object('error', 'Please answer every question.');
  end if;
  for i in 0 .. n - 1 loop
    q := l.quiz->i;
    if p_answers[i + 1] = (q->>'answer_index')::int then correct := correct + 1; end if;
    results := results || jsonb_build_array(jsonb_build_object(
      'correct', p_answers[i + 1] = (q->>'answer_index')::int,
      'answerIndex', (q->>'answer_index')::int,
      'explanation', coalesce(q->>'explanation', '')));
  end loop;
  score := round(correct * 100.0 / n);
  passed := score >= 60;

  update public.lessons
     set attempts = coalesce(attempts, 0) + 1,
         best_score = greatest(score, coalesce(best_score, 0)),
         completed_at = coalesce(completed_at, case when passed then now() end)
   where id = p_lesson;

  select x.id into next_id from public.lessons x where x.course_id = l.course_id and x.position = l.position + 1;
  if passed and next_id is null then
    select count(*) into remaining from public.lessons x where x.course_id = l.course_id and x.completed_at is null;
    if remaining = 0 then update public.courses set status = 'completed' where id = l.course_id; end if;
  end if;

  return jsonb_build_object('score', score, 'passed', passed, 'results', results, 'nextLessonId', next_id);
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.app_create_course(text, jsonb, jsonb)',
    'public.app_claim_lesson(text, uuid)',
    'public.app_save_lesson(text, uuid, timestamptz, jsonb, jsonb, jsonb)',
    'public.app_release_lesson(text, uuid, timestamptz)',
    'public.lesson_quiz_questions(uuid)',
    'public.submit_quiz(uuid, int[])'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- Then, once, set the server key hash (the value is given separately; it is not secret):
-- insert into private.server_keys (name, key_hash) values ('app', '<sha256 hex of SERVER_RPC_KEY>')
--   on conflict (name) do update set key_hash = excluded.key_hash;
