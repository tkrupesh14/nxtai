-- Krpex Code v2, Phase 3 (plan.md "Krpex Code v2"): the AI coach — hints in 3 steps (never the full solution),
-- "explain this error", and a review once the problem is solved.
-- Same plan and credits as Ask the professor (keep in sync with lib/code/coach.ts): free 3 a day, Pro 30 a day,
-- then 1 credit each. Up to 2 failed answers a day don't count, and paid ones that fail are refunded (2 a day).
-- The learner's code is sent to the AI provider only when they ask, and isn't stored here: rows keep a
-- fingerprint (sha256 of the code and question) so asking the same thing again is free.
-- Rows are only created through take_coach_credit(). Learners read their own and fill one in only while it is
-- pending. Run after 030. Safe to run twice.

create table if not exists public.coding_coach_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  problem text not null references public.coding_problems (slug) on update cascade,
  kind text not null check (kind in ('hint', 'error', 'review')),
  step int not null default 0 check ((kind = 'hint' and step between 1 and 3) or (kind <> 'hint' and step = 0)),
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  reply text check (char_length(reply) <= 8000),
  status text not null default 'pending' check (status in ('pending', 'answered', 'failed')),
  paid boolean not null default false,
  tokens_in int not null default 0 check (tokens_in between 0 and 30000),
  tokens_out int not null default 0 check (tokens_out between 0 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists coach_user_time_idx on public.coding_coach_requests (user_id, created_at desc);
create index if not exists coach_user_problem_idx on public.coding_coach_requests (user_id, problem, created_at desc);
create index if not exists coach_time_idx on public.coding_coach_requests (created_at);

alter table public.coding_coach_requests enable row level security;
drop policy if exists "Read own" on public.coding_coach_requests;
create policy "Read own" on public.coding_coach_requests for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "Finish own pending" on public.coding_coach_requests;
create policy "Finish own pending" on public.coding_coach_requests for update to authenticated
  using (user_id = (select auth.uid()) and status = 'pending')
  with check (user_id = (select auth.uid()));
revoke all on public.coding_coach_requests from anon, authenticated;
grant select on public.coding_coach_requests to authenticated;
grant update (reply, status, tokens_in, tokens_out) on public.coding_coach_requests to authenticated;

-- Coach answers paid with credits show up in the credit history as 'coach'.
alter table public.credit_ledger drop constraint if exists credit_ledger_reason_check;
alter table public.credit_ledger add constraint credit_ledger_reason_check
  check (reason in ('purchase', 'grant', 'question', 'course', 'refund', 'adjust', 'regen', 'coach'));

-- Today's free coach answers used, the daily allowance and the credit balance (for the coach panel).
create or replace function public.my_coach_allowance()
returns table (used_today int, daily int, credits int)
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  n int; f int;
begin
  if uid is null then
    return query select 0, 0, 0; return;
  end if;
  select count(*) filter (where c.status <> 'failed' and not c.paid), count(*) filter (where c.status = 'failed' and not c.paid)
    into n, f
    from public.coding_coach_requests c
   where c.user_id = uid and c.created_at >= public.ist_day_start();
  return query select n + greatest(f - 2, 0),
                      (case when public.current_plan(uid) = 'pro' then 30 else 3 end),
                      public.credit_balance(uid);
end $$;
revoke all on function public.my_coach_allowance() from public, anon;
grant execute on function public.my_coach_allowance() to authenticated;

-- Check the limits and reserve one coach answer for the calling user, one call at a time per user.
-- reason: auth | not_found | bad_request | not_solved (review before solving) | slow_down (5 s apart) | daily_limit.
create or replace function public.take_coach_credit(p_problem text, p_kind text, p_step int, p_fingerprint text)
returns table (request_id uuid, reason text, used_today int, daily int, paid boolean, credits_left int)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  p text;
  max_day int;
  n_day int; f_day int; last_at timestamptz;
  bal int; use_credit boolean := false; new_id uuid;
begin
  if uid is null then
    return query select null::uuid, 'auth'::text, 0, 0, false, 0; return;
  end if;
  if not exists (select 1 from public.coding_problems c where c.slug = p_problem and c.active) then
    return query select null::uuid, 'not_found'::text, 0, 0, false, 0; return;
  end if;
  if p_kind not in ('hint', 'error', 'review')
     or (p_kind = 'hint' and (p_step is null or p_step not between 1 and 3))
     or (p_kind <> 'hint' and p_step is distinct from 0)
     or p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{64}$' then
    return query select null::uuid, 'bad_request'::text, 0, 0, false, 0; return;
  end if;
  if p_kind = 'review' and not exists (
    select 1 from public.coding_submissions s where s.user_id = uid and s.problem = p_problem and s.solved
  ) then
    return query select null::uuid, 'not_solved'::text, 0, 0, false, 0; return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 43));
  p := public.current_plan(uid);
  max_day := case when p = 'pro' then 30 else 3 end;
  bal := public.credit_balance(uid);

  select count(*) filter (where c.status <> 'failed' and not c.paid),
         count(*) filter (where c.status = 'failed' and not c.paid),
         max(c.created_at)
    into n_day, f_day, last_at
    from public.coding_coach_requests c
   where c.user_id = uid and c.created_at >= public.ist_day_start();
  n_day := n_day + greatest(f_day - 2, 0);

  if last_at is not null and last_at > now() - interval '5 seconds' then
    return query select null::uuid, 'slow_down'::text, n_day, max_day, false, bal; return;
  end if;
  if n_day >= max_day then
    if bal >= 1 then
      use_credit := true;
    else
      return query select null::uuid, 'daily_limit'::text, n_day, max_day, false, bal; return;
    end if;
  end if;

  insert into public.coding_coach_requests (user_id, problem, kind, step, fingerprint, paid)
  values (uid, p_problem, p_kind, p_step, p_fingerprint, use_credit) returning id into new_id;
  if use_credit then
    insert into public.credit_ledger (user_id, delta, reason, ref) values (uid, -1, 'coach', new_id::text);
    return query select new_id, null::text, n_day, max_day, true, bal - 1;
  else
    return query select new_id, null::text, n_day + 1, max_day, false, bal;
  end if;
end $$;
revoke all on function public.take_coach_credit(text, text, int, text) from public, anon;
grant execute on function public.take_coach_credit(text, text, int, text) to authenticated;

-- A paid coach answer that fails is refunded (up to 2 a day, so a script can't loop failures for free).
create or replace function public.refund_failed_coach() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.paid and old.status = 'pending' and new.status = 'failed' then
    if (select count(*) from public.coding_coach_requests c
         where c.user_id = new.user_id and c.paid and c.status = 'failed'
           and c.created_at >= public.ist_day_start()) <= 2 then
      insert into public.credit_ledger (user_id, delta, reason, ref)
      values (new.user_id, 1, 'refund', new.id::text) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists refund_failed_coach on public.coding_coach_requests;
create trigger refund_failed_coach after update of status on public.coding_coach_requests
  for each row execute function public.refund_failed_coach();

-- The global daily AI spend cap now covers the coach too (same numbers-only result, same callers).
create or replace function public.professor_tokens_today()
returns table (tokens_in bigint, tokens_out bigint)
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(t.tokens_in), 0)::bigint, coalesce(sum(t.tokens_out), 0)::bigint
    from (
      select q.tokens_in, q.tokens_out from public.professor_questions q where q.created_at >= public.ist_day_start()
      union all
      select c.tokens_in, c.tokens_out from public.coding_coach_requests c where c.created_at >= public.ist_day_start()
    ) t;
$$;
revoke all on function public.professor_tokens_today() from public, anon;
grant execute on function public.professor_tokens_today() to authenticated;
