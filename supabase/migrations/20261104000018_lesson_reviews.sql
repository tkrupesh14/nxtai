-- Professor portal, part 3 (tracker 8.1): the review queue. Krpex generates sample AI lessons (no learner data:
-- just a subject, topic, level and language) and approved professors rate them, comment, and suggest corrections
-- block by block. Reviews are private to their professor; the admin sees them all. They later steer the AI (8.2).

create table if not exists public.review_lessons (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (subject ~ '^[a-z0-9-]+/[a-z0-9-]+$'),
  language text not null check (language in ('en', 'hi')),
  level text not null check (char_length(level) between 2 and 60),
  title text not null check (char_length(title) between 3 and 200),
  objective text check (char_length(objective) <= 500),
  blocks jsonb not null check (jsonb_typeof(blocks) = 'array' and jsonb_array_length(blocks) between 1 and 30
                               and octet_length(blocks::text) <= 200000),
  key_takeaways jsonb not null default '[]'::jsonb check (jsonb_typeof(key_takeaways) = 'array' and octet_length(key_takeaways::text) <= 20000),
  quiz jsonb not null default '[]'::jsonb check (jsonb_typeof(quiz) = 'array' and octet_length(quiz::text) <= 50000),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
create index if not exists review_lessons_open_idx on public.review_lessons (subject, status, created_at desc);

create table if not exists public.lesson_reviews (
  id uuid primary key default gen_random_uuid(),
  review_lesson_id uuid not null references public.review_lessons (id) on delete cascade,
  professor_id uuid not null references public.professors (id) on delete cascade,
  accuracy smallint not null check (accuracy between 1 and 5),
  clarity smallint not null check (clarity between 1 and 5),
  level_fit smallint not null check (level_fit between 1 and 5),
  overall smallint not null check (overall between 1 and 5),
  comment text check (char_length(comment) <= 4000),
  -- [{ "block": 0, "note": "...", "suggestion": "..." }]
  block_notes jsonb not null default '[]'::jsonb check (jsonb_typeof(block_notes) = 'array' and jsonb_array_length(block_notes) <= 30
                                                         and octet_length(block_notes::text) <= 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (review_lesson_id, professor_id)
);
create index if not exists lesson_reviews_prof_idx on public.lesson_reviews (professor_id);

alter table public.review_lessons enable row level security;
alter table public.lesson_reviews enable row level security;
revoke all on public.review_lessons from public, anon, authenticated;
revoke all on public.lesson_reviews from public, anon, authenticated;

-- Approved professors see open lessons in their subject and languages.
drop policy if exists "Approved professors read open review lessons" on public.review_lessons;
create policy "Approved professors read open review lessons" on public.review_lessons for select to authenticated
  using (status = 'open' and exists (
    select 1 from public.professors p
     where p.user_id = (select auth.uid()) and p.status = 'approved'
       and p.subject = review_lessons.subject and review_lessons.language = any (p.languages)));
grant select on public.review_lessons to authenticated;

-- A professor sees only their own reviews (ratings stay independent).
drop policy if exists "Professor reads own reviews" on public.lesson_reviews;
create policy "Professor reads own reviews" on public.lesson_reviews for select to authenticated
  using (professor_id in (select p.id from public.professors p where p.user_id = (select auth.uid())));
grant select on public.lesson_reviews to authenticated;

-- Admin: add a generated lesson to the queue (the app writes it with the AI, then calls this).
create or replace function public.admin_add_review_lesson(
  p_subject text, p_language text, p_level text, p_title text, p_objective text, p_blocks jsonb, p_takeaways jsonb, p_quiz jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare out_id uuid;
begin
  perform private.require_admin();
  insert into public.review_lessons (subject, language, level, title, objective, blocks, key_takeaways, quiz)
  values (p_subject, p_language, trim(p_level), trim(p_title), nullif(trim(coalesce(p_objective, '')), ''),
          p_blocks, coalesce(p_takeaways, '[]'::jsonb), coalesce(p_quiz, '[]'::jsonb))
  returning id into out_id;
  return out_id;
end $$;

create or replace function public.admin_set_review_lesson_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  if p_status not in ('open', 'closed') then raise exception 'invalid_status'; end if;
  update public.review_lessons set status = p_status where id = p_id;
  if not found then raise exception 'not_found'; end if;
end $$;

-- Admin: every lesson in the queue with its reviews.
create or replace function public.admin_review_lessons() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', l.id, 'subject', l.subject, 'language', l.language, 'level', l.level, 'title', l.title,
      'status', l.status, 'created_at', l.created_at, 'blocks', jsonb_array_length(l.blocks),
      'reviews', coalesce((select jsonb_agg(jsonb_build_object(
          'professor', p.display_name, 'accuracy', r.accuracy, 'clarity', r.clarity, 'level_fit', r.level_fit,
          'overall', r.overall, 'comment', r.comment, 'block_notes', r.block_notes, 'updated_at', r.updated_at
        ) order by r.updated_at desc)
        from public.lesson_reviews r join public.professors p on p.id = r.professor_id
        where r.review_lesson_id = l.id), '[]'::jsonb)
    ) order by l.created_at desc)
    from public.review_lessons l), '[]'::jsonb);
end $$;

-- Professor: submit or update a review. Approved professors only, for a lesson they can see.
create or replace function public.professor_submit_review(
  p_lesson uuid, p_accuracy int, p_clarity int, p_level_fit int, p_overall int, p_comment text, p_notes jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare prof public.professors; lesson public.review_lessons; out_id uuid; n jsonb;
begin
  select * into prof from public.professors where user_id = auth.uid();
  if not found then raise exception 'not_professor'; end if;
  if prof.status <> 'approved' then raise exception 'not_approved'; end if;
  select * into lesson from public.review_lessons where id = p_lesson;
  if not found or lesson.status <> 'open' or lesson.subject <> prof.subject or not (lesson.language = any (prof.languages)) then
    raise exception 'not_found';
  end if;
  if jsonb_typeof(coalesce(p_notes, '[]'::jsonb)) <> 'array' then raise exception 'invalid_notes'; end if;
  for n in select * from jsonb_array_elements(coalesce(p_notes, '[]'::jsonb)) loop
    if jsonb_typeof(n->'block') <> 'number' or (n->>'block')::int < 0 or (n->>'block')::int >= jsonb_array_length(lesson.blocks)
       or char_length(coalesce(n->>'note', '')) > 2000 or char_length(coalesce(n->>'suggestion', '')) > 20000
       or (coalesce(trim(n->>'note'), '') = '' and coalesce(trim(n->>'suggestion'), '') = '') then
      raise exception 'invalid_notes';
    end if;
  end loop;
  insert into public.lesson_reviews (review_lesson_id, professor_id, accuracy, clarity, level_fit, overall, comment, block_notes)
  values (p_lesson, prof.id, p_accuracy, p_clarity, p_level_fit, p_overall, nullif(trim(coalesce(p_comment, '')), ''),
          coalesce(p_notes, '[]'::jsonb))
  on conflict (review_lesson_id, professor_id) do update
    set accuracy = excluded.accuracy, clarity = excluded.clarity, level_fit = excluded.level_fit, overall = excluded.overall,
        comment = excluded.comment, block_notes = excluded.block_notes, updated_at = now()
  returning id into out_id;
  return out_id;
end $$;

revoke all on function public.admin_add_review_lesson(text, text, text, text, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.admin_add_review_lesson(text, text, text, text, text, jsonb, jsonb, jsonb) to authenticated;
revoke all on function public.admin_set_review_lesson_status(uuid, text) from public, anon;
grant execute on function public.admin_set_review_lesson_status(uuid, text) to authenticated;
revoke all on function public.admin_review_lessons() from public, anon;
grant execute on function public.admin_review_lessons() to authenticated;
revoke all on function public.professor_submit_review(uuid, int, int, int, int, text, jsonb) from public, anon;
grant execute on function public.professor_submit_review(uuid, int, int, int, int, text, jsonb) to authenticated;
