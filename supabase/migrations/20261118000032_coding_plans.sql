-- Krpex Code v2, Phase 4 (plan.md "Krpex Code v2"): study plans — ordered problem lists with progress and a bonus
-- for finishing. Plans are defined in lib/code/plans.ts and mirrored here (tests/db/coding-plans.test.ts checks).
-- Finishing a plan (every problem in it solved, in any order) pays its bonus once, as xp_events key 'plan:<slug>',
-- which is also the finish badge. Learners can follow up to 5 plans; followed plans show on the Code home page.
-- Run after 031. Safe to run twice.

create table if not exists public.coding_plans (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  title text not null check (char_length(title) <= 120),
  problems text[] not null check (cardinality(problems) between 1 and 300),
  bonus int not null check (bonus between 1 and 100),
  position int not null,
  active boolean not null default true
);
alter table public.coding_plans enable row level security;
drop policy if exists "Anyone reads" on public.coding_plans;
create policy "Anyone reads" on public.coding_plans for select to anon, authenticated using (true);
revoke all on public.coding_plans from anon, authenticated;
grant select on public.coding_plans to anon, authenticated;

create table if not exists public.coding_plan_follows (
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null references public.coding_plans (slug) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, plan)
);
alter table public.coding_plan_follows enable row level security;
drop policy if exists "Read own" on public.coding_plan_follows;
create policy "Read own" on public.coding_plan_follows for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.coding_plan_follows from anon, authenticated;
grant select on public.coding_plan_follows to authenticated;

-- Pay the bonus for every active plan the learner has now finished (only plans containing p_problem, if given).
create or replace function private.award_coding_plans(p_user uuid, p_problem text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.coding_plans;
begin
  for p in
    select * from public.coding_plans c
     where c.active and (p_problem is null or p_problem = any (c.problems))
       and not exists (select 1 from public.xp_events x where x.user_id = p_user and x.key = 'plan:' || c.slug)
  loop
    if not exists (
      select 1 from unnest(p.problems) as s(slug)
       where not exists (select 1 from public.coding_submissions cs where cs.user_id = p_user and cs.problem = s.slug and cs.solved)
    ) then
      perform private.award_xp(p_user, 'plan:' || p.slug, p.bonus);
    end if;
  end loop;
end $$;
revoke all on function private.award_coding_plans(uuid, text) from public, anon, authenticated;

create or replace function private.on_coding_solve() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.solved then
    perform private.award_coding_plans(new.user_id, new.problem);
  end if;
  return new;
end $$;
drop trigger if exists coding_plan_bonus on public.coding_submissions;
create trigger coding_plan_bonus after insert on public.coding_submissions
  for each row execute function private.on_coding_solve();

-- Follow or unfollow a plan. Following also pays the bonus for a plan already finished before plans existed.
-- Errors: not_signed_in, unknown_plan, too_many_plans (5 at a time).
create or replace function public.follow_coding_plan(p_plan text, p_follow boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.coding_plans where slug = p_plan and active) then raise exception 'unknown_plan'; end if;
  if not p_follow then
    delete from public.coding_plan_follows where user_id = uid and plan = p_plan;
    return;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('plans:' || uid::text, 0));
  if not exists (select 1 from public.coding_plan_follows where user_id = uid and plan = p_plan)
     and (select count(*) from public.coding_plan_follows where user_id = uid) >= 5 then
    raise exception 'too_many_plans';
  end if;
  insert into public.coding_plan_follows (user_id, plan) values (uid, p_plan) on conflict do nothing;
  perform private.award_coding_plans(uid, null);
end $$;
revoke all on function public.follow_coding_plan(text, boolean) from public, anon;
grant execute on function public.follow_coding_plan(text, boolean) to authenticated;

insert into public.coding_plans (slug, title, problems, bonus, position) values
  ('python-basics-30', 'Python basics in 30 days', array['add-two-numbers', 'even-or-odd', 'largest-of-three', 'celsius-to-fahrenheit', 'exam-grade', 'leap-year', 'times-table', 'sum-to-n', 'factorial', 'fizzbuzz', 'count-digits', 'digit-sum', 'is-prime', 'electricity-bill', 'reverse-a-string', 'count-vowels', 'is-palindrome', 'count-words', 'title-case', 'acronym', 'is-anagram', 'sum-of-a-list', 'largest-in-a-list', 'count-evens', 'running-sum', 'remove-duplicates', 'invert-a-dictionary', 'first-repeated', 'ransom-note', 'sort-by-length']::text[], 50, 1),
  ('placement-arrays-strings', 'Placement prep: arrays and strings', array['second-largest', 'move-zeros', 'rotate-a-list', 'missing-number', 'best-time-to-buy', 'majority-element', 'two-sum', 'merge-sorted-lists', 'container-with-most-water', 'sort-zeros-ones-twos', 'longest-unique-substring', 'anagram-positions', 'group-anagrams', 'first-unique-character', 'longest-consecutive-run', 'subarray-sum-equals-k', 'product-except-self', 'count-pairs-with-sum', 'palindrome-sentence', 'compress-a-string', 'longest-common-prefix', 'is-subsequence', 'longest-palindromic-substring', 'word-break']::text[], 75, 2),
  ('interview-patterns', 'Interview patterns: search, stacks and recursion', array['binary-search', 'first-and-last-position', 'minimum-in-rotated-list', 'search-rotated-list', 'integer-square-root', 'search-a-sorted-grid', 'balanced-brackets', 'next-greater-element', 'daily-temperatures', 'reverse-polish-notation', 'decode-string', 'largest-rectangle-in-histogram', 'all-subsets', 'all-permutations', 'generate-parentheses', 'combination-sum', 'n-queens', 'rotate-a-grid', 'flood-fill', 'count-islands', 'spiral-order']::text[], 75, 3),
  ('dynamic-programming', 'Dynamic programming from zero', array['fibonacci', 'climbing-stairs', 'min-cost-stairs', 'house-robber', 'grid-paths', 'minimum-path-sum', 'coin-change', 'knapsack', 'partition-equal-sums', 'decode-ways', 'maximum-subarray', 'maximum-product-subarray', 'longest-increasing-subsequence', 'longest-common-subsequence', 'edit-distance', 'word-break']::text[], 75, 4),
  ('krpex-150', 'Krpex 150', array['add-two-numbers', 'even-or-odd', 'largest-of-three', 'celsius-to-fahrenheit', 'exam-grade', 'leap-year', 'fizzbuzz', 'sum-to-n', 'factorial', 'count-digits', 'absolute-difference', 'minutes-to-clock', 'triangle-type', 'times-table', 'electricity-bill', 'reverse-a-string', 'count-vowels', 'title-case', 'count-words', 'longest-word', 'is-anagram', 'letter-count', 'palindrome-sentence', 'compress-a-string', 'first-unique-character', 'balanced-brackets', 'caesar-cipher', 'longest-unique-substring', 'is-palindrome', 'acronym', 'reverse-words', 'remove-vowels', 'pangram', 'longest-common-prefix', 'is-subsequence', 'run-length-decode', 'count-palindromic-substrings', 'longest-palindromic-substring', 'word-break', 'sum-of-a-list', 'largest-in-a-list', 'count-evens', 'remove-duplicates', 'running-sum', 'move-zeros', 'split-into-chunks', 'second-largest', 'rotate-a-list', 'merge-sorted-lists', 'two-sum', 'flatten-a-list', 'transpose-a-matrix', 'missing-number', 'spiral-order', 'reverse-a-list', 'average-of-a-list', 'common-elements', 'product-except-self', 'majority-element', 'container-with-most-water', 'sort-zeros-ones-twos', 'jump-game', 'longest-consecutive-run', 'subarray-sum-equals-k', 'invert-a-dictionary', 'word-frequency', 'group-by-length', 'most-common-number', 'group-anagrams', 'first-repeated', 'ransom-note', 'isomorphic-strings', 'top-k-frequent', 'word-pattern', 'count-pairs-with-sum', 'anagram-positions', 'is-prime', 'greatest-common-divisor', 'fibonacci', 'digit-sum', 'power-of-two', 'reverse-a-number', 'primes-up-to-n', 'armstrong-number', 'decimal-to-binary', 'roman-numerals', 'pascals-triangle-row', 'least-common-multiple', 'perfect-number', 'sum-of-multiples', 'collatz-steps', 'count-set-bits', 'happy-number', 'prime-factors', 'integer-square-root', 'spreadsheet-column-name', 'factorial-trailing-zeros', 'power-with-recursion', 'climbing-stairs', 'grid-paths', 'all-permutations', 'all-subsets', 'tower-of-hanoi', 'generate-parentheses', 'phone-letter-combinations', 'combinations', 'combination-sum', 'n-queens', 'sort-by-length', 'bubble-sort', 'binary-search', 'kth-smallest', 'merge-intervals', 'evens-before-odds', 'first-and-last-position', 'minimum-in-rotated-list', 'h-index', 'median-of-two-lists', 'search-rotated-list', 'meeting-rooms-needed', 'remove-adjacent-duplicates', 'reverse-polish-notation', 'backspace-compare', 'daily-temperatures', 'next-greater-element', 'simplify-path', 'decode-string', 'largest-rectangle-in-histogram', 'matrix-diagonal-sum', 'rotate-a-grid', 'flood-fill', 'set-grid-zeros', 'search-a-sorted-grid', 'count-islands', 'min-cost-stairs', 'house-robber', 'minimum-path-sum', 'longest-increasing-subsequence', 'edit-distance', 'longest-common-subsequence', 'decode-ways', 'knapsack', 'partition-equal-sums', 'maximum-product-subarray', 'best-time-to-buy', 'maximum-subarray', 'coin-change', 'valid-sudoku-row', 'pairs-with-difference', 'trapping-rain-water']::text[], 100, 5)
on conflict (slug) do update set
  title = excluded.title, problems = excluded.problems, bonus = excluded.bonus, position = excluded.position, active = true;
