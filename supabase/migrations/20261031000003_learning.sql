-- AI learning loop: learner profile -> course -> modules -> lessons (with quiz + progress).
-- Every row carries user_id so RLS is a simple "owner only" rule.

create table if not exists public.learner_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  goal text not null check (char_length(goal) between 3 and 500),
  level text not null,
  background text check (char_length(background) <= 1000),
  hours_per_week int check (hours_per_week between 1 and 80),
  learning_style text,
  timeline text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null,
  summary text not null,
  level text not null,
  estimated_weeks int,
  goal text not null,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now()
);
create index if not exists courses_user_idx on public.courses (user_id, created_at desc);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  position int not null,
  title text not null,
  summary text not null,
  unique (course_id, position)
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  module_id uuid not null references public.course_modules (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  position int not null,            -- order within the whole course (0-based)
  title text not null,
  objective text not null,
  est_minutes int,
  content_md text,                  -- generated on first open
  key_takeaways jsonb,
  quiz jsonb,                       -- [{question, options[], answer_index, explanation}]
  generated_at timestamptz,
  best_score int check (best_score between 0 and 100),
  attempts int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (course_id, position)
);
create index if not exists lessons_course_idx on public.lessons (course_id, position);

alter table public.learner_profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;

do $$
declare t text;
begin
  foreach t in array array['learner_profiles', 'courses', 'course_modules', 'lessons'] loop
    execute format('drop policy if exists "Owner full access" on public.%I', t);
    execute format(
      'create policy "Owner full access" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
