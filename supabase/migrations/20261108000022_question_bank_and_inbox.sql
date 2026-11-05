-- 8.4 part 2: professors' question banks, and learners' questions flagged for the real professor to check.
--
-- Question bank: multiple-choice questions a professor writes. Published ones go into the module tests and final
-- exams of courses their AI version teaches (app_teacher_questions, server only), in the course's language.
--
-- Inbox: in a course taught by a live professor's AI version, a learner can send one AI answer from the lesson
-- chat to that professor (3 a day). The professor sees the lesson, the question, the AI's answer and the
-- learner's note, never who the learner is (professor_inbox()). They reply, or confirm the AI's answer.

-- ── Question bank ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function private.valid_options(o text[]) returns boolean
language sql immutable set search_path = '' as $$
  select cardinality(o) = 4
     and not exists (select 1 from unnest(o) x where x is null or char_length(btrim(x)) not between 1 and 300);
$$;

create table if not exists public.professor_bank_questions (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.professors (id) on delete cascade,
  topic text check (char_length(topic) <= 120),
  language text not null default 'en' check (language in ('en', 'hi')),
  question text not null check (char_length(question) between 5 and 1000),
  options text[] not null check (private.valid_options(options)),
  answer_index int not null check (answer_index between 0 and 3),
  explanation text check (char_length(explanation) <= 1000),
  status text not null default 'draft' check (status in ('draft', 'published')),
  fts tsvector generated always as (to_tsvector('simple', coalesce(topic, '') || ' ' || question)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pbq_professor_idx on public.professor_bank_questions (professor_id, created_at desc);
create index if not exists pbq_fts_idx on public.professor_bank_questions using gin (fts);

alter table public.professor_bank_questions enable row level security;
revoke all on public.professor_bank_questions from public, anon, authenticated;
drop policy if exists "Professor reads own questions" on public.professor_bank_questions;
create policy "Professor reads own questions" on public.professor_bank_questions for select to authenticated
  using (professor_id in (select p.id from public.professors p where p.user_id = (select auth.uid())));
drop policy if exists "Professor removes own questions" on public.professor_bank_questions;
create policy "Professor removes own questions" on public.professor_bank_questions for delete to authenticated
  using (professor_id in (select p.id from public.professors p where p.user_id = (select auth.uid())));
grant select, delete on public.professor_bank_questions to authenticated;

-- Add (p_id null) or edit one of your questions. Editing a published question keeps it published.
create or replace function public.professor_save_question(
  p_id uuid, p_topic text, p_language text, p_question text, p_options text[], p_answer_index int, p_explanation text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  prof public.professors;
  new_id uuid;
begin
  select * into prof from public.professors where user_id = auth.uid();
  if not found then raise exception 'not_professor'; end if;
  if p_language not in ('en', 'hi') then raise exception 'invalid_language'; end if;
  if p_id is null then
    perform pg_advisory_xact_lock(hashtextextended('bank:' || prof.id::text, 0));
    if (select count(*) from public.professor_bank_questions where professor_id = prof.id) >= 1000 then
      raise exception 'bank_full';
    end if;
    insert into public.professor_bank_questions (professor_id, topic, language, question, options, answer_index, explanation)
    values (prof.id, nullif(btrim(p_topic), ''), p_language, btrim(p_question),
            array(select btrim(x) from unnest(p_options) with ordinality u(x, i) order by i), p_answer_index,
            nullif(btrim(p_explanation), ''))
    returning id into new_id;
    return new_id;
  end if;
  update public.professor_bank_questions
     set topic = nullif(btrim(p_topic), ''), language = p_language, question = btrim(p_question),
         options = array(select btrim(x) from unnest(p_options) with ordinality u(x, i) order by i),
         answer_index = p_answer_index, explanation = nullif(btrim(p_explanation), ''), updated_at = now()
   where id = p_id and professor_id = prof.id;
  if not found then raise exception 'not_found'; end if;
  return p_id;
end $$;

-- Publish (approved professors only) or move back to draft.
create or replace function public.professor_set_question_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare prof public.professors;
begin
  select * into prof from public.professors where user_id = auth.uid();
  if not found then raise exception 'not_professor'; end if;
  if p_status not in ('draft', 'published') then raise exception 'invalid_status'; end if;
  if p_status = 'published' and prof.status <> 'approved' then raise exception 'not_approved'; end if;
  update public.professor_bank_questions set status = p_status, updated_at = now() where id = p_id and professor_id = prof.id;
  if not found then raise exception 'not_found'; end if;
end $$;

-- Server only: a live professor's published questions in this language that best match the query (any of its
-- words), for a module test or final exam. Empty when nothing matches: unrelated questions are never used.
create or replace function public.app_teacher_questions(p_key text, p_professor uuid, p_query text, p_language text, p_limit int)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  p public.professors;
  q tsquery;
  lex text;
  n int := 0;
begin
  perform private.require_server_key(p_key);
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into p from public.professors where id = p_professor;
  if not found or not private.professor_is_live(p) then return '[]'::jsonb; end if;
  for lex in select t.lexeme from unnest(to_tsvector('simple', left(coalesce(p_query, ''), 4000))) t
              where char_length(t.lexeme) >= 3 order by t.lexeme loop
    q := case when q is null then plainto_tsquery('simple', lex) else q || plainto_tsquery('simple', lex) end;
    n := n + 1;
    exit when n >= 60;
  end loop;
  if q is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', b.id, 'question', b.question, 'options', to_jsonb(b.options),
                                        'answer_index', b.answer_index, 'explanation', coalesce(b.explanation, '')))
      from (select * from public.professor_bank_questions b
             where b.professor_id = p.id and b.status = 'published' and b.language = p_language and b.fts @@ q
             order by ts_rank(b.fts, q) desc, random()
             limit least(greatest(coalesce(p_limit, 0), 0), 10)) b), '[]'::jsonb);
end $$;

-- ── Inbox ────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.professor_flags (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.professors (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question_id uuid not null unique references public.professor_questions (id) on delete cascade,
  -- Copies, so the professor sees what the learner saw.
  lesson_title text not null check (char_length(lesson_title) <= 200),
  question text not null check (char_length(question) <= 600),
  ai_reply text not null check (char_length(ai_reply) <= 6000),
  note text check (char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'answered', 'confirmed')),
  professor_reply text check (char_length(professor_reply) <= 3000),
  replied_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists pf_professor_idx on public.professor_flags (professor_id, status, created_at desc);
create index if not exists pf_user_idx on public.professor_flags (user_id, created_at desc);

alter table public.professor_flags enable row level security;
revoke all on public.professor_flags from public, anon, authenticated;
-- Learners read their own flags (with the professor's reply). Professors use professor_inbox(), without user_id.
drop policy if exists "Learner reads own flags" on public.professor_flags;
create policy "Learner reads own flags" on public.professor_flags for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.professor_flags to authenticated;

-- Send one of your answered chat questions to the live professor whose AI version teaches the course. 3 a day.
create or replace function public.flag_for_professor(p_question uuid, p_note text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  pq public.professor_questions;
  l public.lessons;
  c public.courses;
  prof public.professors;
  new_id uuid;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into pq from public.professor_questions where id = p_question and user_id = uid;
  if not found or pq.status <> 'answered' or pq.kind <> 'ask' or pq.reply is null then raise exception 'not_found'; end if;
  select * into l from public.lessons where id = pq.lesson_id;
  select * into c from public.courses where id = l.course_id;
  if c.professor is null or c.professor !~ '^p:[0-9a-f-]{36}$' then raise exception 'not_professor_course'; end if;
  select * into prof from public.professors where id = substr(c.professor, 3)::uuid;
  if not found or not private.professor_is_live(prof) then raise exception 'not_professor_course'; end if;
  if exists (select 1 from public.professor_flags where question_id = pq.id) then raise exception 'already_sent'; end if;
  perform pg_advisory_xact_lock(hashtextextended('flags:' || uid::text, 0));
  if (select count(*) from public.professor_flags where user_id = uid and created_at > now() - interval '1 day') >= 3 then
    raise exception 'flag_limit';
  end if;
  insert into public.professor_flags (professor_id, user_id, question_id, lesson_title, question, ai_reply, note)
  values (prof.id, uid, pq.id, left(l.title, 200), pq.question, pq.reply, nullif(left(btrim(coalesce(p_note, '')), 500), ''))
  returning id into new_id;
  return new_id;
end $$;

-- The signed-in professor's inbox: open questions first, then the 50 most recent answered ones. No learner ids.
create or replace function public.professor_inbox() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare pid uuid := private.my_professor_id();
begin
  if pid is null then raise exception 'not_professor'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', f.id, 'lesson_title', f.lesson_title, 'question', f.question,
                                        'ai_reply', f.ai_reply, 'note', f.note, 'status', f.status,
                                        'professor_reply', f.professor_reply, 'replied_at', f.replied_at,
                                        'created_at', f.created_at)
                     order by (f.status = 'open') desc, f.created_at desc)
      from (select * from public.professor_flags where professor_id = pid and status = 'open'
            union all
            (select * from public.professor_flags where professor_id = pid and status <> 'open'
              order by replied_at desc nulls last limit 50)) f), '[]'::jsonb);
end $$;

-- Reply ('answered', reply required) or confirm the AI's answer ('confirmed', reply optional). Can be edited.
create or replace function public.professor_reply_flag(p_id uuid, p_status text, p_reply text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  pid uuid := private.my_professor_id();
  reply text := nullif(btrim(coalesce(p_reply, '')), '');
begin
  if pid is null then raise exception 'not_professor'; end if;
  if p_status not in ('answered', 'confirmed') then raise exception 'invalid_status'; end if;
  if p_status = 'answered' and reply is null then raise exception 'reply_required'; end if;
  if char_length(reply) > 3000 then raise exception 'too_long'; end if;
  update public.professor_flags set status = p_status, professor_reply = reply, replied_at = now()
   where id = p_id and professor_id = pid;
  if not found then raise exception 'not_found'; end if;
end $$;


do $$
declare f text;
begin
  foreach f in array array[
    'professor_save_question(uuid, text, text, text, text[], int, text)', 'professor_set_question_status(uuid, text)',
    'app_teacher_questions(text, uuid, text, text, int)', 'flag_for_professor(uuid, text)', 'professor_inbox()',
    'professor_reply_flag(uuid, text, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke all on function private.valid_options(text[]) from public, anon, authenticated;
