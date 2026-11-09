-- Krpex Code v2, Phase 1 (plan.md "Krpex Code v2"): tags, runtimes, public per-problem stats, and honest
-- solutions (opening the official solution before solving means the problem pays no XP).
-- Run after 028. Safe to run twice.

alter table public.coding_problems add column if not exists tags text[] not null default '{}';
alter table public.coding_submissions add column if not exists runtime_ms int check (runtime_ms between 0 and 600000);

-- Who opened a problem's official solution (and when). Written only by reveal_coding_solution().
create table if not exists public.coding_reveals (
  user_id uuid not null references auth.users (id) on delete cascade,
  problem text not null references public.coding_problems (slug) on update cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, problem)
);
alter table public.coding_reveals enable row level security;
drop policy if exists "Read own" on public.coding_reveals;
create policy "Read own" on public.coding_reveals for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.coding_reveals from anon, authenticated;
grant select on public.coding_reveals to authenticated;

-- Record that the learner opened the solution. Returns whether it costs XP (false once solved or already open).
create or replace function public.reveal_coding_solution(p_problem text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.coding_problems where slug = p_problem and active) then raise exception 'unknown_problem'; end if;
  if exists (select 1 from public.xp_events where user_id = uid and key = 'code:' || p_problem) then
    insert into public.coding_reveals (user_id, problem) values (uid, p_problem) on conflict do nothing;
    return false;
  end if;
  insert into public.coding_reveals (user_id, problem) values (uid, p_problem) on conflict do nothing;
  get diagnostics n = row_count;
  return n > 0;
end $$;
revoke all on function public.reveal_coding_solution(text) from public, anon;
grant execute on function public.reveal_coding_solution(text) to authenticated;

-- Per-problem totals for the problem table (acceptance) and the description. Counts only, no learners.
create or replace function public.coding_problem_stats()
returns table (slug text, submissions int, accepted int, solvers int, attempters int)
language sql stable security definer set search_path = '' as $$
  select p.slug,
         count(s.id)::int,
         count(s.id) filter (where s.solved)::int,
         count(distinct s.user_id) filter (where s.solved)::int,
         count(distinct s.user_id)::int
    from public.coding_problems p
    left join public.coding_submissions s on s.problem = p.slug
   where p.active
   group by p.slug
$$;
revoke all on function public.coding_problem_stats() from public;
grant execute on function public.coding_problem_stats() to anon, authenticated;

-- submit_code gains the runtime and the solution rule. Same checks and XP as 028 otherwise.
drop function if exists public.submit_code(text, text, text, int, int);
create or replace function public.submit_code(p_problem text, p_language text, p_code text, p_passed int, p_total int, p_runtime_ms int default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  prob public.coding_problems;
  today date := (now() at time zone 'Asia/Kolkata')::date;
  first boolean;
  solved boolean := p_passed = p_total;
  daily boolean := false;
  revealed boolean := false;
  pts int;
  used int;
  before int;
  sid bigint;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select * into prob from public.coding_problems where slug = p_problem and active;
  if not found then raise exception 'unknown_problem'; end if;
  if p_language is null or p_language not in ('python', 'javascript') then raise exception 'bad_language'; end if;
  if p_code is null or char_length(p_code) > 20000 then raise exception 'code_too_long'; end if;
  if p_total is distinct from prob.tests or p_passed is null or p_passed < 0 or p_passed > p_total then
    raise exception 'bad_result';
  end if;
  if p_runtime_ms is not null and (p_runtime_ms < 0 or p_runtime_ms > 600000) then raise exception 'bad_result'; end if;

  perform pg_advisory_xact_lock(hashtextextended('coding:' || uid::text, 0));
  if (select count(*) from public.coding_submissions where user_id = uid and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'rate_limited';
  end if;

  before := coalesce((select sum(points) from public.xp_events where user_id = uid), 0);
  first := not exists (select 1 from public.coding_submissions where user_id = uid and problem = p_problem);
  insert into public.coding_submissions (user_id, problem, language, code, passed, total, runtime_ms)
  values (uid, p_problem, p_language, p_code, p_passed, p_total, p_runtime_ms) returning id into sid;

  if solved then
    daily := exists (select 1 from public.coding_daily where day = today and problem = p_problem);
    revealed := exists (select 1 from public.coding_reveals where user_id = uid and problem = p_problem);
    if not revealed and not exists (select 1 from public.xp_events where user_id = uid and key = 'code:' || p_problem) then
      pts := case prob.difficulty when 'easy' then 10 when 'medium' then 20 else 40 end
             * case when daily then 2 else 1 end + case when first then 5 else 0 end;
      used := coalesce((select sum(points) from public.xp_events
                         where user_id = uid and key like 'code:%'
                           and (created_at at time zone 'Asia/Kolkata')::date = today), 0);
      pts := least(pts, 150 - used, 100);
      if pts > 0 then
        perform private.award_xp(uid, 'code:' || p_problem, pts);
        update public.coding_submissions set xp = pts where id = sid;
      end if;
    end if;
    perform private.award_day_xp(uid, now());
  end if;

  return jsonb_build_object(
    'id', sid, 'solved', solved, 'first_try', first and solved, 'daily', daily, 'revealed', revealed,
    'xp', coalesce((select sum(points) from public.xp_events where user_id = uid), 0) - before);
end $$;
revoke all on function public.submit_code(text, text, text, int, int, int) from public, anon;
grant execute on function public.submit_code(text, text, text, int, int, int) to authenticated;

-- Tags from lib/code/meta.ts (tests/db/coding.test.ts checks they agree).
update public.coding_problems p set tags = v.tags
  from (values
  ('add-two-numbers', array['Math']),
  ('even-or-odd', array['Math']),
  ('largest-of-three', array['Math']),
  ('celsius-to-fahrenheit', array['Math']),
  ('exam-grade', array['Simulation']),
  ('leap-year', array['Math']),
  ('fizzbuzz', array['String', 'Simulation']),
  ('sum-to-n', array['Math']),
  ('factorial', array['Math']),
  ('count-digits', array['Math']),
  ('reverse-a-string', array['String', 'Two pointers']),
  ('count-vowels', array['String']),
  ('title-case', array['String']),
  ('count-words', array['String']),
  ('longest-word', array['String']),
  ('is-anagram', array['String', 'Hash table', 'Sorting']),
  ('letter-count', array['String', 'Hash table']),
  ('palindrome-sentence', array['String', 'Two pointers']),
  ('compress-a-string', array['String', 'Two pointers']),
  ('first-unique-character', array['String', 'Hash table']),
  ('balanced-brackets', array['String', 'Stack']),
  ('caesar-cipher', array['String', 'Math']),
  ('longest-unique-substring', array['String', 'Hash table', 'Sliding window']),
  ('sum-of-a-list', array['Array']),
  ('largest-in-a-list', array['Array']),
  ('count-evens', array['Array', 'Math']),
  ('remove-duplicates', array['Array', 'Hash table']),
  ('running-sum', array['Array', 'Prefix sum']),
  ('move-zeros', array['Array', 'Two pointers']),
  ('split-into-chunks', array['Array']),
  ('second-largest', array['Array']),
  ('rotate-a-list', array['Array', 'Math']),
  ('merge-sorted-lists', array['Array', 'Two pointers']),
  ('two-sum', array['Array', 'Hash table']),
  ('flatten-a-list', array['Array', 'Recursion']),
  ('transpose-a-matrix', array['Array', 'Matrix']),
  ('missing-number', array['Array', 'Math']),
  ('spiral-order', array['Array', 'Matrix', 'Simulation']),
  ('invert-a-dictionary', array['Hash table']),
  ('word-frequency', array['String', 'Hash table']),
  ('group-by-length', array['String', 'Hash table']),
  ('most-common-number', array['Array', 'Hash table']),
  ('group-anagrams', array['String', 'Hash table', 'Sorting']),
  ('is-prime', array['Math']),
  ('greatest-common-divisor', array['Math']),
  ('fibonacci', array['Math', 'Dynamic programming']),
  ('digit-sum', array['Math']),
  ('power-of-two', array['Math', 'Bit manipulation']),
  ('reverse-a-number', array['Math']),
  ('primes-up-to-n', array['Math', 'Array']),
  ('armstrong-number', array['Math']),
  ('decimal-to-binary', array['Math', 'String', 'Bit manipulation']),
  ('roman-numerals', array['Math', 'String', 'Greedy']),
  ('pascals-triangle-row', array['Array', 'Dynamic programming']),
  ('power-with-recursion', array['Math', 'Recursion']),
  ('climbing-stairs', array['Math', 'Dynamic programming', 'Recursion']),
  ('grid-paths', array['Math', 'Dynamic programming', 'Recursion']),
  ('all-permutations', array['String', 'Backtracking', 'Recursion']),
  ('all-subsets', array['Array', 'Backtracking', 'Recursion']),
  ('sort-by-length', array['String', 'Sorting']),
  ('bubble-sort', array['Array', 'Sorting']),
  ('binary-search', array['Array', 'Binary search']),
  ('kth-smallest', array['Array', 'Sorting']),
  ('merge-intervals', array['Array', 'Sorting']),
  ('best-time-to-buy', array['Array', 'Greedy']),
  ('maximum-subarray', array['Array', 'Dynamic programming']),
  ('coin-change', array['Array', 'Dynamic programming']),
  ('valid-sudoku-row', array['Array', 'Hash table', 'Matrix']),
  ('pairs-with-difference', array['Array', 'Hash table']),
  ('trapping-rain-water', array['Array', 'Two pointers', 'Dynamic programming'])

  ) as v (slug, tags)
 where p.slug = v.slug;
