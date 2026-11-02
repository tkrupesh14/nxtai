-- 5.3: module tests, a final exam per course, and certificates (Pro only).
-- - A module test unlocks when every lesson in the module is passed; the final exam when every module test is passed.
-- - Questions are written by the AI once (server only, like lessons) and graded here; learners never see the answers
--   until they pass. Pass mark 70%.
-- - Waits: a failed module test can be retaken after 1 hour; the final exam allows 2 tries per day (India time).
-- - Passing the final exam lets a Pro learner claim a certificate with a public code (/certificate/<code>).
--   The certificate keeps its own copy of the name and course details, so it stays valid if the course is deleted.

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  module_id uuid references public.course_modules (id) on delete cascade, -- null for the final exam
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('module', 'final')),
  questions jsonb,                  -- [{question, options[4], answer_index, explanation}]; hidden from learners
  generated_at timestamptz,         -- claim time while being written, then when it was saved
  best_score int check (best_score between 0 and 100),
  attempts int not null default 0,
  passed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((kind = 'module') = (module_id is not null))
);
create unique index if not exists assessments_module_key on public.assessments (module_id) where kind = 'module';
create unique index if not exists assessments_final_key on public.assessments (course_id) where kind = 'final';
create index if not exists assessments_user_idx on public.assessments (user_id, course_id);

create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  score int not null check (score between 0 and 100),
  passed boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists assessment_attempts_idx on public.assessment_attempts (assessment_id, created_at desc);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  full_name text not null check (char_length(full_name) between 2 and 80),
  course_title text not null,
  course_level text not null,
  lesson_count int not null,
  total_minutes int not null,
  score int not null check (score between 0 and 100),
  issued_at timestamptz not null default now()
);
create unique index if not exists certificates_course_key on public.certificates (course_id) where course_id is not null;
create index if not exists certificates_user_idx on public.certificates (user_id, issued_at desc);

alter table public.assessments enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.certificates enable row level security;

-- Learners can read their own rows (not the questions); all writes go through the functions below.
do $$
declare t text;
begin
  foreach t in array array['assessments', 'assessment_attempts', 'certificates'] loop
    execute format('drop policy if exists "Owner can read" on public.%I', t);
    execute format('create policy "Owner can read" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
  end loop;
end $$;
grant select (id, course_id, module_id, user_id, kind, generated_at, best_score, attempts, passed_at, created_at)
  on public.assessments to authenticated;
grant select on public.assessment_attempts to authenticated;
grant select on public.certificates to authenticated;

-- Is this module test / final exam open to the learner? (all lessons of the module passed / all module tests passed)
create or replace function private.assessment_unlocked(p_course uuid, p_module uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when p_module is not null then
      exists (select 1 from public.lessons l where l.module_id = p_module)
      and not exists (select 1 from public.lessons l where l.module_id = p_module and l.completed_at is null)
    else
      exists (select 1 from public.course_modules m where m.course_id = p_course)
      and not exists (
        select 1 from public.course_modules m
         where m.course_id = p_course
           and not exists (select 1 from public.assessments a
                            where a.module_id = m.id and a.kind = 'module' and a.passed_at is not null))
  end $$;
revoke all on function private.assessment_unlocked(uuid, uuid) from public, anon, authenticated;

-- When the learner may try again (null = now). Module test: 1 hour after a failed try.
-- Final exam: 2 tries per day (India time), until it is passed.
create or replace function private.assessment_retry_at(p_assessment uuid) returns timestamptz
language plpgsql stable security definer set search_path = '' as $$
declare a record; last record; today int;
begin
  select x.kind, x.passed_at into a from public.assessments x where x.id = p_assessment;
  if not found then return null; end if;
  if a.kind = 'module' then
    select t.passed, t.created_at into last from public.assessment_attempts t
     where t.assessment_id = p_assessment order by t.created_at desc limit 1;
    if found and not last.passed and last.created_at > now() - interval '1 hour' then
      return last.created_at + interval '1 hour';
    end if;
    return null;
  end if;
  if a.passed_at is not null then return null; end if;
  select count(*) into today from public.assessment_attempts t
   where t.assessment_id = p_assessment and t.created_at >= public.ist_day_start();
  if today >= 2 then return public.ist_day_start() + interval '1 day'; end if;
  return null;
end $$;
revoke all on function private.assessment_retry_at(uuid) from public, anon, authenticated;

-- Find or create the assessment and claim it for writing so only one request calls the AI (server only).
-- p_module null = the course's final exam.
-- status: ready | pending | locked | not_found | claimed (with claimed_at)
create or replace function public.app_claim_assessment(p_key text, p_course uuid, p_module uuid)
returns table (status text, assessment_id uuid, claimed_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); aid uuid; a record; ts timestamptz := clock_timestamp();
begin
  perform private.require_server_key(p_key);
  if uid is null or not exists (select 1 from public.courses c where c.id = p_course and c.user_id = uid) then
    return query select 'not_found'::text, null::uuid, null::timestamptz; return;
  end if;
  if p_module is not null and not exists (
    select 1 from public.course_modules m where m.id = p_module and m.course_id = p_course
  ) then
    return query select 'not_found'::text, null::uuid, null::timestamptz; return;
  end if;
  if not private.assessment_unlocked(p_course, p_module) then
    return query select 'locked'::text, null::uuid, null::timestamptz; return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(coalesce(p_module, p_course)::text, 14));
  select x.id into aid from public.assessments x
   where x.course_id = p_course and x.module_id is not distinct from p_module
     and x.kind = case when p_module is null then 'final' else 'module' end;
  if aid is null then
    insert into public.assessments (course_id, module_id, user_id, kind)
    values (p_course, p_module, uid, case when p_module is null then 'final' else 'module' end)
    returning id into aid;
  end if;

  select x.questions, x.generated_at into a from public.assessments x where x.id = aid for update;
  if a.questions is not null then return query select 'ready'::text, aid, null::timestamptz; return; end if;
  if a.generated_at is not null and a.generated_at > ts - interval '4 minutes' then
    return query select 'pending'::text, aid, null::timestamptz; return;
  end if;
  update public.assessments set generated_at = ts where id = aid;
  return query select 'claimed'::text, aid, ts;
end $$;

-- Save the written questions for a claimed assessment (server only). Questions can never be replaced.
create or replace function public.app_save_assessment(p_key text, p_assessment uuid, p_claimed_at timestamptz, p_questions jsonb)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare q jsonb;
begin
  perform private.require_server_key(p_key);
  if jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions) not between 4 and 30
     or octet_length(p_questions::text) > 150000 then
    raise exception 'invalid questions';
  end if;
  for q in select value from jsonb_array_elements(p_questions) loop
    if jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options') <> 4
       or jsonb_typeof(q->'answer_index') is distinct from 'number' or (q->>'answer_index')::int not between 0 and 3 then
      raise exception 'invalid questions';
    end if;
  end loop;
  update public.assessments
     set questions = p_questions, generated_at = clock_timestamp()
   where id = p_assessment and user_id = auth.uid() and questions is null and generated_at = p_claimed_at;
  return found;
end $$;

-- Give up a claim after a failed generation (server only).
create or replace function public.app_release_assessment(p_key text, p_assessment uuid, p_claimed_at timestamptz)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_server_key(p_key);
  update public.assessments set generated_at = null
   where id = p_assessment and user_id = auth.uid() and questions is null and generated_at = p_claimed_at;
end $$;

-- Questions without answers, in a shuffled order that changes with every try (question and option order).
-- Each question and option keeps its original index `i`; answers are submitted by those indexes.
create or replace function public.assessment_questions(p_assessment uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare a record;
begin
  select x.id, x.questions, x.attempts, x.best_score, x.passed_at into a
    from public.assessments x where x.id = p_assessment and x.user_id = auth.uid();
  if not found or a.questions is null then return null; end if;
  return jsonb_build_object(
    'retryAt', private.assessment_retry_at(a.id),
    'attempts', a.attempts,
    'bestScore', a.best_score,
    'passed', a.passed_at is not null,
    'questions', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'i', q.ord - 1,
               'question', q.value->'question',
               'options', (select jsonb_agg(jsonb_build_object('i', o.ord - 1, 'text', o.value)
                                            order by md5(a.id::text || a.attempts || q.ord || o.ord))
                             from jsonb_array_elements(q.value->'options') with ordinality as o(value, ord)))
             order by md5(a.id::text || a.attempts || q.ord)), '[]'::jsonb)
        from jsonb_array_elements(a.questions) with ordinality as q(value, ord)));
end $$;

-- Grade a try. p_answers[k] is the chosen option index for original question k (both 0-based, as in
-- assessment_questions). Before passing, results say only right or wrong; once passed, answers and explanations too.
create or replace function public.submit_assessment(p_assessment uuid, p_answers int[])
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); a record; q jsonb; n int; correct int := 0; i int; ok boolean;
  results jsonb := '[]'::jsonb; score int; passed boolean; retry timestamptz; now_passed boolean;
begin
  select x.id, x.course_id, x.module_id, x.kind, x.questions, x.passed_at into a
    from public.assessments x where x.id = p_assessment and x.user_id = uid for update;
  if not found or a.questions is null then
    return jsonb_build_object('error', 'This test isn''t available.');
  end if;
  if not private.assessment_unlocked(a.course_id, a.module_id) then
    return jsonb_build_object('error', 'This test isn''t unlocked yet.');
  end if;
  retry := private.assessment_retry_at(a.id);
  if retry is not null then
    return jsonb_build_object('error', 'wait', 'retryAt', retry);
  end if;
  n := jsonb_array_length(a.questions);
  if p_answers is null or coalesce(array_length(p_answers, 1), 0) <> n then
    return jsonb_build_object('error', 'Please answer every question.');
  end if;

  for i in 0 .. n - 1 loop
    q := a.questions->i;
    ok := p_answers[i + 1] is not distinct from (q->>'answer_index')::int;
    if ok then correct := correct + 1; end if;
    results := results || jsonb_build_array(jsonb_build_object('i', i, 'correct', ok));
  end loop;
  score := round(correct * 100.0 / n);
  passed := score >= 70;
  now_passed := passed or a.passed_at is not null;

  insert into public.assessment_attempts (assessment_id, user_id, score, passed) values (a.id, uid, score, passed);
  update public.assessments
     set attempts = attempts + 1,
         best_score = greatest(score, coalesce(best_score, 0)),
         passed_at = coalesce(passed_at, case when passed then now() end)
   where id = a.id;

  if now_passed then
    select jsonb_agg(r.value || jsonb_build_object(
             'answerIndex', (a.questions->(r.value->>'i')::int->>'answer_index')::int,
             'explanation', coalesce(a.questions->(r.value->>'i')::int->>'explanation', '')))
      into results from jsonb_array_elements(results) r;
  end if;

  return jsonb_build_object(
    'score', score,
    'passed', passed,
    'results', results,
    'retryAt', private.assessment_retry_at(a.id),
    'finalUnlocked', a.kind = 'module' and private.assessment_unlocked(a.course_id, null));
end $$;

-- Claim the certificate for a course whose final exam is passed. Pro only. Returns {code} or {error}:
-- not_passed | pro_only | bad_name. Claiming again returns the same certificate.
create or replace function public.issue_certificate(p_course uuid, p_name text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c record; ex record; existing text; nm text; new_code text; mins int; n int;
begin
  if uid is null then return jsonb_build_object('error', 'not_passed'); end if;
  select x.id, x.title, x.level into c from public.courses x where x.id = p_course and x.user_id = uid;
  if not found then return jsonb_build_object('error', 'not_passed'); end if;
  select x.best_score, x.passed_at into ex from public.assessments x where x.course_id = p_course and x.kind = 'final';
  if not found or ex.passed_at is null then return jsonb_build_object('error', 'not_passed'); end if;

  perform pg_advisory_xact_lock(hashtextextended(p_course::text, 15));
  select x.code into existing from public.certificates x where x.course_id = p_course;
  if existing is not null then return jsonb_build_object('code', existing); end if;

  if public.current_plan(uid) <> 'pro' then return jsonb_build_object('error', 'pro_only'); end if;
  nm := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  if char_length(nm) not between 2 and 80 or nm ~ '[<>{}\[\]\\/@:]' then
    return jsonb_build_object('error', 'bad_name');
  end if;

  select count(*), coalesce(sum(l.est_minutes), 0) into n, mins from public.lessons l where l.course_id = p_course;
  loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    exit when not exists (select 1 from public.certificates x where x.code = new_code);
  end loop;
  insert into public.certificates (code, user_id, course_id, full_name, course_title, course_level, lesson_count, total_minutes, score)
  values (new_code, uid, p_course, nm, c.title, c.level, n, mins, ex.best_score);
  return jsonb_build_object('code', new_code);
end $$;

-- Public certificate check (anyone with the link). Returns nothing that identifies the account.
create or replace function public.get_certificate(p_code text)
returns table (code text, full_name text, course_title text, course_level text, lesson_count int,
               total_minutes int, score int, issued_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.code, c.full_name, c.course_title, c.course_level, c.lesson_count, c.total_minutes, c.score, c.issued_at
    from public.certificates c where c.code = upper(btrim(p_code)) $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.app_claim_assessment(text, uuid, uuid)',
    'public.app_save_assessment(text, uuid, timestamptz, jsonb)',
    'public.app_release_assessment(text, uuid, timestamptz)',
    'public.assessment_questions(uuid)',
    'public.submit_assessment(uuid, int[])',
    'public.issue_certificate(uuid, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
revoke all on function public.get_certificate(text) from public;
grant execute on function public.get_certificate(text) to anon, authenticated;
