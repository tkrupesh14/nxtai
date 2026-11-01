-- Ask the professor: one row per question (or quick-button answer), used for history, cache, quotas and spend.
-- Rows are only created through take_question_credit(), which enforces the limits. Learners can read their
-- own rows and fill in a row only while it is pending, so answered rows can't be edited to reset quotas.

create table if not exists public.professor_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  section int not null default -1,
  kind text not null default 'ask' check (kind in ('ask', 'simpler', 'example', 'mistake')),
  question text not null check (char_length(question) <= 600),
  reply text check (char_length(reply) <= 6000),
  verdict text check (verdict in ('answer', 'off_topic', 'not_allowed')),
  status text not null default 'pending' check (status in ('pending', 'answered', 'failed')),
  tokens_in int not null default 0 check (tokens_in between 0 and 20000),
  tokens_out int not null default 0 check (tokens_out between 0 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists pq_user_time_idx on public.professor_questions (user_id, created_at desc);
create index if not exists pq_lesson_idx on public.professor_questions (lesson_id, created_at);
create index if not exists pq_time_idx on public.professor_questions (created_at);
create unique index if not exists pq_quick_once on public.professor_questions (lesson_id, section, kind)
  where kind <> 'ask' and status <> 'failed';

alter table public.professor_questions enable row level security;
drop policy if exists "Read own" on public.professor_questions;
create policy "Read own" on public.professor_questions for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "Finish own pending" on public.professor_questions;
create policy "Finish own pending" on public.professor_questions for update to authenticated
  using (user_id = (select auth.uid()) and status = 'pending')
  with check (user_id = (select auth.uid()));

revoke all on public.professor_questions from anon, authenticated;
grant select on public.professor_questions to authenticated;
grant update (reply, verdict, status, tokens_in, tokens_out) on public.professor_questions to authenticated;

-- Check limits and reserve a question for the calling user, one call at a time per user.
-- Limits (keep in sync with lib/learning/professor.ts): questions 5/day, 3/lesson/day, 10 s apart;
-- quick buttons 15/day, 2 s apart. Up to 2 failed answers a day are refunded.
create or replace function public.take_question_credit(p_lesson uuid, p_section int, p_kind text, p_question text)
returns table (question_id uuid, reason text, used_today int, used_lesson int)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
  is_ask boolean := p_kind = 'ask';
  max_day int := case when is_ask then 5 else 15 end;
  max_lesson int := case when is_ask then 3 else 15 end;
  gap interval := case when is_ask then interval '10 seconds' else interval '2 seconds' end;
  n_day int; n_lesson int; f_day int; f_lesson int; last_at timestamptz; new_id uuid;
begin
  if uid is null then
    return query select null::uuid, 'auth'::text, 0, 0; return;
  end if;
  if not exists (select 1 from public.lessons l where l.id = p_lesson and l.user_id = uid) then
    return query select null::uuid, 'not_found'::text, 0, 0; return;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 42));
  select count(*) filter (where q.status <> 'failed'),
         count(*) filter (where q.status <> 'failed' and q.lesson_id = p_lesson),
         count(*) filter (where q.status = 'failed'),
         count(*) filter (where q.status = 'failed' and q.lesson_id = p_lesson),
         max(q.created_at)
    into n_day, n_lesson, f_day, f_lesson, last_at
    from public.professor_questions q
   where q.user_id = uid and q.created_at >= day_start and (q.kind = 'ask') = is_ask;
  n_day := n_day + greatest(f_day - 2, 0);
  n_lesson := n_lesson + greatest(f_lesson - 2, 0);
  if last_at is not null and last_at > now() - gap then
    return query select null::uuid, 'slow_down'::text, n_day, n_lesson; return;
  end if;
  if n_day >= max_day then
    return query select null::uuid, 'daily_limit'::text, n_day, n_lesson; return;
  end if;
  if n_lesson >= max_lesson then
    return query select null::uuid, 'lesson_limit'::text, n_day, n_lesson; return;
  end if;
  begin
    insert into public.professor_questions (user_id, lesson_id, section, kind, question)
    values (uid, p_lesson, p_section, p_kind, left(p_question, 600)) returning id into new_id;
  exception when unique_violation then
    return query select null::uuid, 'busy'::text, n_day, n_lesson; return;
  end;
  return query select new_id, null::text, n_day + 1, n_lesson + 1;
end $$;
revoke all on function public.take_question_credit(uuid, int, text, text) from public, anon;
grant execute on function public.take_question_credit(uuid, int, text, text) to authenticated;

-- Today's professor-chat token totals across all users (numbers only), for the global spend cap.
create or replace function public.professor_tokens_today()
returns table (tokens_in bigint, tokens_out bigint)
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(q.tokens_in), 0)::bigint, coalesce(sum(q.tokens_out), 0)::bigint
    from public.professor_questions q
   where q.created_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
$$;
revoke all on function public.professor_tokens_today() from public, anon;
grant execute on function public.professor_tokens_today() to authenticated;
