-- Community, Phase 5c (plan.md Phase 5): boards on community.krpex.in/c/<board>.
--   · general boards (help, interviews, projects, feedback) and one board per course category (coding … exam-prep),
--     mirrored in lib/community/boards.ts. A board's posts live in the space 'board:<slug>' (kind discussion).
--   · community_feed: the latest active discussions across problems and boards (never solutions).
--   · community_boards: every active board with its post count and last activity.
--   · approved professor accounts are labelled "Professor" next to their name, and may post without the level and
--     account-age rules (they're vetted). AI professors are not accounts and never post.
-- Run after 034. Safe to run twice.

create table if not exists public.community_boards (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 30),
  kind text not null check (kind in ('general', 'course')),
  title text not null check (char_length(title) between 2 and 60),
  position int not null default 0,
  active boolean not null default true
);
alter table public.community_boards enable row level security;
revoke all on public.community_boards from anon, authenticated;

insert into public.community_boards (slug, kind, title, position) values
  ('help', 'general', 'Help', 1),
  ('interviews', 'general', 'Interview prep', 2),
  ('projects', 'general', 'Show your project', 3),
  ('feedback', 'general', 'Feedback for Krpex', 4),
  ('coding', 'course', 'Coding & Software', 11),
  ('it-cloud', 'course', 'IT & Cloud', 12),
  ('ai-data', 'course', 'AI & Data', 13),
  ('science', 'course', 'Science', 14),
  ('math', 'course', 'Mathematics', 15),
  ('business', 'course', 'Business & Finance', 16),
  ('design', 'course', 'Design & Creative', 17),
  ('languages', 'course', 'Languages & Communication', 18),
  ('exam-prep', 'course', 'Exam Prep', 19)
on conflict (slug) do update set kind = excluded.kind, title = excluded.title, position = excluded.position;

create index if not exists community_posts_activity_idx on public.community_posts (activity_at desc) where status = 'visible' and kind = 'discussion';

-- ---------- helpers ----------

-- The board a space is ('board:help' → 'help'), or null.
create or replace function private.space_board(p_space text) returns text
language sql immutable set search_path = '' as $$
  select case when p_space ~ '^board:[a-z0-9]+(-[a-z0-9]+)*$' then substr(p_space, 7) end;
$$;

-- Path of a post on community.krpex.in, as a krpex.in path (/community/* moves there), for notification links.
create or replace function private.post_path(p public.community_posts) returns text
language sql immutable set search_path = '' as $$
  select case
    when private.space_board(p.space) is not null then '/community/c/' || private.space_board(p.space) || '/' || p.id
    else '/community/p/' || coalesce(private.space_problem(p.space), 'x') || '/'
      || case when p.kind = 'solution' then 'solutions' else 'discuss' end || '/' || p.id
  end;
$$;

create or replace function private.is_professor(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.professors where user_id = p_user and status = 'approved');
$$;

-- Name card shown next to posts: handle, display name, level, and whether it's a (human) professor.
create or replace function private.author_card(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select jsonb_build_object('handle', pp.handle, 'name', pp.display_name, 'level', private.user_level(p_user),
                               'public', pp.is_public and not pp.hidden, 'professor', private.is_professor(p_user))
       from public.public_profiles pp where pp.user_id = p_user),
    jsonb_build_object('deleted', true));
$$;

-- Posting rules. Errors: not_signed_in · need_handle · account_too_new · need_level_2 · banned.
-- Approved professors skip the account-age and level rules.
create or replace function private.require_poster(p_user uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_user is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.public_profiles where user_id = p_user) then raise exception 'need_handle'; end if;
  if not private.is_professor(p_user) then
    if (select created_at from auth.users where id = p_user) > now() - interval '24 hours' then raise exception 'account_too_new'; end if;
    if private.user_level(p_user) < 2 then raise exception 'need_level_2'; end if;
  end if;
  if exists (select 1 from private.community_bans b where b.user_id = p_user and (b.until is null or b.until > now())) then
    raise exception 'banned';
  end if;
end $$;

create or replace function private.check_links(p_user uuid, p_text text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if private.has_link(p_text) and private.user_level(p_user) < 4 and not private.is_professor(p_user) then
    raise exception 'links_need_level_4';
  end if;
end $$;

-- ---------- reading ----------

-- Every active board with its number of posts and last activity, in display order.
create or replace function public.community_boards()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'slug', b.slug, 'kind', b.kind, 'title', b.title,
      'posts', (select count(*) from public.community_posts p where p.space = 'board:' || b.slug and p.status = 'visible'),
      'last_activity', (select max(p.activity_at) from public.community_posts p where p.space = 'board:' || b.slug and p.status = 'visible'))
    order by b.position), '[]'::jsonb)
  from public.community_boards b where b.active;
$$;
revoke all on function public.community_boards() from public;
grant execute on function public.community_boards() to anon, authenticated;

-- The most recently active discussions. p_scope: null (everything) · 'code' (problems and general boards) ·
-- 'courses' (course boards). Solutions never appear here.
create or replace function public.community_feed(p_scope text default null, p_limit int default 20, p_offset int default 0)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'space', p.space, 'title', p.title,
      'excerpt', case when p.spoiler then null else left(regexp_replace(p.body, '\s+', ' ', 'g'), 220) end,
      'language', p.language, 'spoiler', p.spoiler, 'score', p.score, 'comments', p.comment_count,
      'created_at', p.created_at, 'activity_at', p.activity_at, 'edited', p.edited_at is not null,
      'author', private.author_card(p.author))
    order by p.activity_at desc), '[]'::jsonb)
  from (
    select p.* from public.community_posts p
     where p.status = 'visible' and p.kind = 'discussion'
       and (private.space_problem(p.space) is not null
            or exists (select 1 from public.community_boards b where 'board:' || b.slug = p.space and b.active
                         and (p_scope is null or (p_scope = 'code' and b.kind = 'general') or (p_scope = 'courses' and b.kind = 'course'))))
       and (p_scope is null or p_scope = 'code' or private.space_problem(p.space) is null)
     order by p.activity_at desc
     limit least(greatest(coalesce(p_limit, 20), 1), 50) offset greatest(coalesce(p_offset, 0), 0)) p;
$$;
revoke all on function public.community_feed(text, int, int) from public;
grant execute on function public.community_feed(text, int, int) to anon, authenticated;

-- ---------- writing ----------

-- Errors (besides the posting rules and clean_post): bad_space · solve_first · too_many_posts · too_fast.
-- Problem spaces take solutions and discussions; boards take discussions only.
create or replace function public.community_create_post(p_space text, p_kind text, p_title text, p_body text, p_code text, p_language text, p_spoiler boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v record; v_problem text := private.space_problem(p_space); v_id uuid;
begin
  perform private.require_poster(uid);
  if p_kind is null or p_kind not in ('solution', 'discussion') then raise exception 'bad_space'; end if;
  if v_problem is not null then
    if not exists (select 1 from public.coding_problems where slug = v_problem and active) then raise exception 'bad_space'; end if;
  elsif p_kind <> 'discussion' or not exists (
      select 1 from public.community_boards where 'board:' || slug = p_space and active) then
    raise exception 'bad_space';
  end if;
  select * into v from private.clean_post(p_kind, p_title, p_body, p_code, p_language);
  perform private.check_links(uid, v.title || ' ' || v.body);
  if p_kind = 'solution' and not exists (
      select 1 from public.coding_submissions where user_id = uid and problem = v_problem and solved) then
    raise exception 'solve_first';
  end if;
  perform pg_advisory_xact_lock(hashtext('community_post:' || uid));
  if (select count(*) from public.community_posts where author = uid and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'too_many_posts';
  end if;
  if exists (select 1 from public.community_posts where author = uid and created_at > now() - interval '30 seconds') then
    raise exception 'too_fast';
  end if;
  insert into public.community_posts (space, kind, author, title, body, code, language, spoiler)
  values (p_space, p_kind, uid, v.title, v.body, v.code, v.language, p_kind = 'discussion' and coalesce(p_spoiler, false))
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.community_create_post(text, text, text, text, text, text, boolean) from public, anon;
grant execute on function public.community_create_post(text, text, text, text, text, text, boolean) to authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'private.space_board(text)', 'private.post_path(public.community_posts)', 'private.is_professor(uuid)',
    'private.author_card(uuid)', 'private.require_poster(uuid)', 'private.check_links(uuid, text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end $$;
