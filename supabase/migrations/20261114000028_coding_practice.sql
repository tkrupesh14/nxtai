-- 5.4 C: Krpex Code problems, submissions and XP (plan.md "Coding practice").
-- - The problem bank (statements, tests, reference solutions) lives in lib/code/problems.ts. This table mirrors
--   what the database needs to pay XP: slug, difficulty and the number of tests (tests/db/coding.test.ts checks
--   the two agree). New problems need a new migration with their rows.
-- - Code runs and is graded in the learner's browser, so a result can be faked. Limits keep that small: XP once
--   per problem, at most 150 coding XP a day, 60 submissions an hour, and the submitted code is kept.
-- - XP for a first solve: easy 10 · medium 20 · hard 40; ×2 for the problem of the day (solved that day);
--   +5 when the first submission for the problem passes. A solved submission also counts as a study day.

create table if not exists public.coding_problems (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  title text not null check (char_length(title) <= 120),
  topic text not null check (char_length(topic) <= 60),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  tests int not null check (tests between 1 and 100),
  position int not null,
  active boolean not null default true
);

create table if not exists public.coding_submissions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  problem text not null references public.coding_problems (slug) on update cascade,
  language text not null check (language in ('python', 'javascript')),
  code text not null check (char_length(code) <= 20000),
  passed int not null,
  total int not null,
  solved boolean generated always as (passed = total) stored,
  xp int not null default 0,
  created_at timestamptz not null default now(),
  check (total > 0 and passed between 0 and total)
);
create index if not exists coding_submissions_user_problem on public.coding_submissions (user_id, problem, created_at desc);
create index if not exists coding_submissions_user_time on public.coding_submissions (user_id, created_at desc);

-- The problem of the day (IST), picked the first time someone asks for it.
create table if not exists public.coding_daily (
  day date primary key,
  problem text not null references public.coding_problems (slug) on update cascade
);

alter table public.coding_problems enable row level security;
alter table public.coding_submissions enable row level security;
alter table public.coding_daily enable row level security;
drop policy if exists "Anyone reads" on public.coding_problems;
create policy "Anyone reads" on public.coding_problems for select to anon, authenticated using (true);
drop policy if exists "Anyone reads" on public.coding_daily;
create policy "Anyone reads" on public.coding_daily for select to anon, authenticated using (true);
drop policy if exists "Read own" on public.coding_submissions;
create policy "Read own" on public.coding_submissions for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.coding_problems, public.coding_daily, public.coding_submissions from anon, authenticated;
grant select on public.coding_problems, public.coding_daily to anon, authenticated;
grant select on public.coding_submissions to authenticated;

-- Today's problem, chosen once per IST day from problems that weren't the problem of the day in the last 30 days.
create or replace function public.coding_daily_problem()
returns text language plpgsql security definer set search_path = '' as $$
declare d date := (now() at time zone 'Asia/Kolkata')::date; p text;
begin
  select problem into p from public.coding_daily where day = d;
  if found then return p; end if;
  select slug into p from public.coding_problems
   where active and slug not in (select problem from public.coding_daily where day > d - 30)
   order by md5(slug || d::text) limit 1;
  if p is null then
    select slug into p from public.coding_problems where active order by md5(slug || d::text) limit 1;
  end if;
  if p is null then return null; end if;
  insert into public.coding_daily (day, problem) values (d, p) on conflict (day) do nothing;
  return (select problem from public.coding_daily where day = d);
end $$;
revoke all on function public.coding_daily_problem() from public;
grant execute on function public.coding_daily_problem() to anon, authenticated;

-- Save a submission (graded in the browser) and pay XP for a first solve. Returns
-- {id, solved, xp (all XP gained, including the study-day bonus), first_try, daily}.
create or replace function public.submit_code(p_problem text, p_language text, p_code text, p_passed int, p_total int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  prob public.coding_problems;
  today date := (now() at time zone 'Asia/Kolkata')::date;
  first boolean;
  solved boolean := p_passed = p_total;
  daily boolean := false;
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

  -- One submission at a time per learner, so the hourly and daily limits hold.
  perform pg_advisory_xact_lock(hashtextextended('coding:' || uid::text, 0));
  if (select count(*) from public.coding_submissions where user_id = uid and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'rate_limited';
  end if;

  before := coalesce((select sum(points) from public.xp_events where user_id = uid), 0);
  first := not exists (select 1 from public.coding_submissions where user_id = uid and problem = p_problem);
  insert into public.coding_submissions (user_id, problem, language, code, passed, total)
  values (uid, p_problem, p_language, p_code, p_passed, p_total) returning id into sid;

  if solved then
    daily := exists (select 1 from public.coding_daily where day = today and problem = p_problem);
    if not exists (select 1 from public.xp_events where user_id = uid and key = 'code:' || p_problem) then
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
    'id', sid, 'solved', solved, 'first_try', first and solved, 'daily', daily,
    'xp', coalesce((select sum(points) from public.xp_events where user_id = uid), 0) - before);
end $$;
revoke all on function public.submit_code(text, text, text, int, int) from public, anon;
grant execute on function public.submit_code(text, text, text, int, int) to authenticated;

insert into public.coding_problems (slug, title, topic, difficulty, tests, position) values
  ('add-two-numbers', 'Add two numbers', 'Basics', 'easy', 5, 1),
  ('even-or-odd', 'Even or odd', 'Basics', 'easy', 6, 2),
  ('largest-of-three', 'Largest of three', 'Basics', 'easy', 5, 3),
  ('celsius-to-fahrenheit', 'Celsius to Fahrenheit', 'Basics', 'easy', 5, 4),
  ('exam-grade', 'Exam grade', 'Basics', 'easy', 10, 5),
  ('leap-year', 'Leap year', 'Basics', 'easy', 6, 6),
  ('fizzbuzz', 'FizzBuzz', 'Basics', 'easy', 4, 7),
  ('sum-to-n', 'Sum from 1 to n', 'Basics', 'easy', 5, 8),
  ('factorial', 'Factorial', 'Basics', 'easy', 5, 9),
  ('count-digits', 'Count the digits', 'Basics', 'easy', 5, 10),
  ('reverse-a-string', 'Reverse a string', 'Strings', 'easy', 5, 11),
  ('count-vowels', 'Count the vowels', 'Strings', 'easy', 5, 12),
  ('title-case', 'Capitalise each word', 'Strings', 'easy', 5, 13),
  ('count-words', 'Count the words', 'Strings', 'easy', 5, 14),
  ('longest-word', 'Longest word', 'Strings', 'easy', 4, 15),
  ('is-anagram', 'Anagrams', 'Strings', 'easy', 5, 16),
  ('letter-count', 'Count each character', 'Strings', 'easy', 4, 17),
  ('palindrome-sentence', 'Palindrome sentence', 'Strings', 'medium', 6, 18),
  ('compress-a-string', 'Compress a string', 'Strings', 'medium', 5, 19),
  ('first-unique-character', 'First unique character', 'Strings', 'medium', 5, 20),
  ('balanced-brackets', 'Balanced brackets', 'Strings', 'medium', 8, 21),
  ('caesar-cipher', 'Caesar cipher', 'Strings', 'medium', 5, 22),
  ('longest-unique-substring', 'Longest stretch without repeats', 'Strings', 'hard', 7, 23),
  ('sum-of-a-list', 'Sum of a list', 'Lists', 'easy', 5, 24),
  ('largest-in-a-list', 'Largest number in a list', 'Lists', 'easy', 5, 25),
  ('count-evens', 'Count the even numbers', 'Lists', 'easy', 5, 26),
  ('remove-duplicates', 'Remove duplicates', 'Lists', 'easy', 5, 27),
  ('running-sum', 'Running total', 'Lists', 'easy', 4, 28),
  ('move-zeros', 'Move the zeros to the end', 'Lists', 'easy', 5, 29),
  ('split-into-chunks', 'Split into chunks', 'Lists', 'easy', 4, 30),
  ('second-largest', 'Second largest', 'Lists', 'medium', 6, 31),
  ('rotate-a-list', 'Rotate a list', 'Lists', 'medium', 5, 32),
  ('merge-sorted-lists', 'Merge two sorted lists', 'Lists', 'medium', 5, 33),
  ('two-sum', 'Two sum', 'Lists', 'medium', 5, 34),
  ('flatten-a-list', 'Flatten a list', 'Lists', 'medium', 5, 35),
  ('transpose-a-matrix', 'Transpose a matrix', 'Lists', 'medium', 4, 36),
  ('missing-number', 'The missing number', 'Lists', 'medium', 5, 37),
  ('spiral-order', 'Spiral order', 'Lists', 'hard', 6, 38),
  ('invert-a-dictionary', 'Swap keys and values', 'Dictionaries', 'easy', 3, 39),
  ('word-frequency', 'Word frequency', 'Dictionaries', 'medium', 4, 40),
  ('group-by-length', 'Group words by length', 'Dictionaries', 'medium', 3, 41),
  ('most-common-number', 'Most common number', 'Dictionaries', 'medium', 5, 42),
  ('group-anagrams', 'Group anagrams', 'Dictionaries', 'hard', 4, 43),
  ('is-prime', 'Prime or not', 'Maths and loops', 'easy', 8, 44),
  ('greatest-common-divisor', 'Greatest common divisor', 'Maths and loops', 'easy', 5, 45),
  ('fibonacci', 'Fibonacci number', 'Maths and loops', 'easy', 7, 46),
  ('digit-sum', 'Sum of digits', 'Maths and loops', 'easy', 5, 47),
  ('power-of-two', 'Power of two', 'Maths and loops', 'easy', 7, 48),
  ('reverse-a-number', 'Reverse a number', 'Maths and loops', 'easy', 6, 49),
  ('primes-up-to-n', 'All primes up to n', 'Maths and loops', 'medium', 5, 50),
  ('armstrong-number', 'Armstrong number', 'Maths and loops', 'medium', 7, 51),
  ('decimal-to-binary', 'Decimal to binary', 'Maths and loops', 'medium', 6, 52),
  ('roman-numerals', 'Roman numerals', 'Maths and loops', 'medium', 7, 53),
  ('pascals-triangle-row', 'Row of Pascal''s triangle', 'Maths and loops', 'medium', 5, 54),
  ('power-with-recursion', 'Power, recursively', 'Recursion', 'easy', 5, 55),
  ('climbing-stairs', 'Climbing stairs', 'Recursion', 'medium', 6, 56),
  ('grid-paths', 'Paths through a grid', 'Recursion', 'medium', 6, 57),
  ('all-permutations', 'All arrangements of a word', 'Recursion', 'hard', 5, 58),
  ('all-subsets', 'All subsets', 'Recursion', 'hard', 4, 59),
  ('sort-by-length', 'Sort words by length', 'Sorting and searching', 'easy', 4, 60),
  ('bubble-sort', 'Sort it yourself', 'Sorting and searching', 'medium', 5, 61),
  ('binary-search', 'Binary search', 'Sorting and searching', 'medium', 6, 62),
  ('kth-smallest', 'K-th smallest', 'Sorting and searching', 'medium', 5, 63),
  ('merge-intervals', 'Merge intervals', 'Sorting and searching', 'hard', 5, 64),
  ('best-time-to-buy', 'Best day to buy and sell', 'Problem solving', 'medium', 6, 65),
  ('maximum-subarray', 'Biggest sum of a stretch', 'Problem solving', 'hard', 5, 66),
  ('coin-change', 'Fewest coins', 'Problem solving', 'hard', 6, 67),
  ('valid-sudoku-row', 'Valid Sudoku rows', 'Problem solving', 'easy', 5, 68),
  ('pairs-with-difference', 'Pairs with a given difference', 'Problem solving', 'medium', 5, 69),
  ('trapping-rain-water', 'Rain water between walls', 'Problem solving', 'hard', 6, 70)
on conflict (slug) do update set
  title = excluded.title, topic = excluded.topic, difficulty = excluded.difficulty,
  tests = excluded.tests, position = excluded.position, active = true;
