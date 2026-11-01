-- Course categories (catalog lives in lib/learning/catalog.ts) and professor-style lesson blocks.
alter table public.courses add column if not exists category text;
alter table public.courses add column if not exists subcategory text;
alter table public.courses add column if not exists professor text;
alter table public.courses add column if not exists welcome text;
create index if not exists courses_category_idx on public.courses (category, subcategory);

alter table public.lessons add column if not exists blocks jsonb;
