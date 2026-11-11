-- Community, Phase 5b (plan.md Phase 5): solutions and discussions for each coding problem, on community.krpex.in.
--   · posts (kind solution | discussion) live in a "space": 'code:p:<problem slug>' for now; boards come in 5c.
--   · comments are threaded one level deep (a reply to a reply joins the same thread).
--   · upvotes only; scores are kept by triggers. No XP for posting or votes.
--   · a problem's solutions (list and threads) open only to learners who solved it or opened the official solution.
--   · posting needs a handle (migration 033), level 2, an account at least 24 hours old and no ban; links need
--     level 4; rate limits: 5 posts and 30 comments a day (30 s / 10 s apart), 200 votes and 10 reports a day.
--   · reports: three reports from learners at level 2+ hide a post or comment until an admin keeps or removes it.
--   · notifications: replies, upvote milestones (1, 10, 50) and removals.
-- Tables are read and written only through the functions below. Rules mirrored in lib/community/posts.ts.
-- Run after 033. Safe to run twice.

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  space text not null check (space ~ '^[a-z]+(:[a-z0-9]+(-[a-z0-9]+)*)+$' and char_length(space) <= 80),
  kind text not null check (kind in ('solution', 'discussion')),
  -- Kept when the author deletes their account ("[deleted user]").
  author uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 3 and 120),
  body text not null default '' check (char_length(body) <= 10000),
  code text check (char_length(code) between 1 and 20000),
  language text check (language in ('python', 'javascript')),
  spoiler boolean not null default false,
  score int not null default 0,
  comment_count int not null default 0,
  status text not null default 'visible' check (status in ('visible', 'hidden', 'removed', 'deleted')),
  removed_reason text check (char_length(removed_reason) <= 200),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  activity_at timestamptz not null default now(),
  check ((code is null) = (language is null))
);
create index if not exists community_posts_top_idx on public.community_posts (space, kind, score desc, created_at desc) where status = 'visible';
create index if not exists community_posts_new_idx on public.community_posts (space, kind, created_at desc) where status = 'visible';
create index if not exists community_posts_author_idx on public.community_posts (author, created_at desc);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  parent_id uuid references public.community_comments (id) on delete cascade,
  author uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  score int not null default 0,
  status text not null default 'visible' check (status in ('visible', 'hidden', 'removed', 'deleted')),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists community_comments_post_idx on public.community_comments (post_id, created_at);
create index if not exists community_comments_author_idx on public.community_comments (author, created_at desc);

create table if not exists public.community_votes (
  user_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid references public.community_posts (id) on delete cascade,
  comment_id uuid references public.community_comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, comment_id) = 1)
);
create unique index if not exists community_votes_post_once on public.community_votes (user_id, post_id) where post_id is not null;
create unique index if not exists community_votes_comment_once on public.community_votes (user_id, comment_id) where comment_id is not null;
create index if not exists community_votes_user_time_idx on public.community_votes (user_id, created_at desc);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references auth.users (id) on delete cascade,
  post_id uuid references public.community_posts (id) on delete cascade,
  comment_id uuid references public.community_comments (id) on delete cascade,
  reason text not null check (reason in ('spam', 'abuse', 'spoiler', 'wrong', 'other')),
  note text check (char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'kept', 'removed')),
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, comment_id) = 1)
);
create unique index if not exists community_reports_post_once on public.community_reports (reporter, post_id) where post_id is not null;
create unique index if not exists community_reports_comment_once on public.community_reports (reporter, comment_id) where comment_id is not null;
create index if not exists community_reports_open_idx on public.community_reports (created_at desc) where status = 'open';

create table if not exists private.community_bans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  until timestamptz, -- null: no end
  reason text check (char_length(reason) <= 200),
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists private.community_mod_log (
  id bigint generated always as identity primary key,
  admin uuid,
  action text not null,
  post_id uuid,
  comment_id uuid,
  user_id uuid,
  reason text,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['community_posts', 'community_comments', 'community_votes', 'community_reports'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Scores follow the votes (also when a voter's account is deleted).
create or replace function private.on_community_vote() returns trigger
language plpgsql security definer set search_path = '' as $$
declare d int := case when tg_op = 'INSERT' then 1 else -1 end; r public.community_votes;
begin
  r := case when tg_op = 'INSERT' then new else old end;
  if r.post_id is not null then
    update public.community_posts set score = greatest(0, score + d) where id = r.post_id;
  else
    update public.community_comments set score = greatest(0, score + d) where id = r.comment_id;
  end if;
  return null;
end $$;
drop trigger if exists community_vote_score on public.community_votes;
create trigger community_vote_score after insert or delete on public.community_votes
  for each row execute function private.on_community_vote();

-- Notifications: community kinds, emailed with "learning" notifications.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'inbox_question', 'professor_reply', 'professor_confirmed',
  'professor_approved', 'professor_suspended', 'professor_live', 'professor_hidden', 'review_new',
  'payment_paid', 'payment_failed', 'credits_granted', 'pro_granted', 'report_resolved',
  'admin_professor_joined', 'admin_listing_requested', 'admin_report',
  'reminder_streak', 'reminder_continue', 'reminder_freeze_used', 'level_reward',
  'community_reply', 'community_upvotes', 'community_removed', 'admin_community_report'
));

create or replace function private.notification_topic(p_kind text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_kind in ('professor_reply', 'professor_confirmed', 'report_resolved') then 'learning'
    when p_kind like 'community\_%' then 'learning'
    when p_kind in ('payment_paid', 'payment_failed', 'credits_granted', 'pro_granted', 'level_reward') then 'account'
    when p_kind like 'reminder\_%' then 'reminders'
    when p_kind like 'admin\_%' then 'admin'
    else 'teaching'
  end
$$;

-- ---------- helpers ----------

-- The coding problem a space is about ('code:p:two-sum' → 'two-sum'), or null.
create or replace function private.space_problem(p_space text) returns text
language sql immutable set search_path = '' as $$
  select case when p_space ~ '^code:p:[a-z0-9]+(-[a-z0-9]+)*$' then substr(p_space, 8) end;
$$;

-- Path of a post on community.krpex.in, as a krpex.in path (/community/* moves there), for notification links.
create or replace function private.post_path(p public.community_posts) returns text
language sql immutable set search_path = '' as $$
  select '/community/p/' || coalesce(private.space_problem(p.space), 'x') || '/'
    || case when p.kind = 'solution' then 'solutions' else 'discuss' end || '/' || p.id;
$$;

-- Whether a learner may read a space's posts of this kind: a problem's solutions only after solving it or
-- opening the official solution.
create or replace function private.community_can_read(p_user uuid, p_space text, p_kind text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_kind <> 'solution' or private.space_problem(p_space) is null or (
    p_user is not null and (
      exists (select 1 from public.coding_submissions s where s.user_id = p_user and s.problem = private.space_problem(p_space) and s.solved)
      or exists (select 1 from public.coding_reveals r where r.user_id = p_user and r.problem = private.space_problem(p_space))));
$$;

-- Name card shown next to posts: handle, display name, level; "deleted" when the account or profile is gone.
create or replace function private.author_card(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select jsonb_build_object('handle', pp.handle, 'name', pp.display_name, 'level', private.user_level(p_user),
                               'public', pp.is_public and not pp.hidden)
       from public.public_profiles pp where pp.user_id = p_user),
    jsonb_build_object('deleted', true));
$$;

-- Posting rules. Errors: not_signed_in · need_handle · account_too_new · need_level_2 · banned.
create or replace function private.require_poster(p_user uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_user is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.public_profiles where user_id = p_user) then raise exception 'need_handle'; end if;
  if (select created_at from auth.users where id = p_user) > now() - interval '24 hours' then raise exception 'account_too_new'; end if;
  if private.user_level(p_user) < 2 then raise exception 'need_level_2'; end if;
  if exists (select 1 from private.community_bans b where b.user_id = p_user and (b.until is null or b.until > now())) then
    raise exception 'banned';
  end if;
end $$;

create or replace function private.check_links(p_user uuid, p_text text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if private.has_link(p_text) and private.user_level(p_user) < 4 then raise exception 'links_need_level_4'; end if;
end $$;

create or replace function private.refresh_comment_count(p_post uuid) returns void
language sql security definer set search_path = '' as $$
  update public.community_posts set comment_count = (
    select count(*) from public.community_comments c where c.post_id = p_post and c.status = 'visible')
  where id = p_post;
$$;

-- Check and tidy a post's fields. Errors: bad_title · bad_body · bad_code · bad_language · need_code.
create or replace function private.clean_post(p_kind text, p_title text, p_body text, p_code text, p_language text,
  out title text, out body text, out code text, out language text)
language plpgsql immutable set search_path = '' as $$
begin
  title := btrim(regexp_replace(coalesce(p_title, ''), '\s+', ' ', 'g'));
  body := btrim(coalesce(p_body, ''));
  code := nullif(rtrim(coalesce(p_code, '')), '');
  language := case when code is null then null else p_language end;
  if char_length(title) not between 3 and 120 then raise exception 'bad_title'; end if;
  if char_length(body) > 10000 or (p_kind = 'discussion' and body = '') then raise exception 'bad_body'; end if;
  if char_length(code) > 20000 then raise exception 'bad_code'; end if;
  if code is not null and (language is null or language not in ('python', 'javascript')) then raise exception 'bad_language'; end if;
  if p_kind = 'solution' and code is null then raise exception 'need_code'; end if;
end $$;

-- ---------- reading ----------

-- A space's posts of one kind, plus counts for both kinds. Locked solutions return the count but no posts.
create or replace function public.community_list(p_space text, p_kind text, p_sort text default 'top', p_limit int default 20, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_locked boolean := not private.community_can_read(uid, p_space, p_kind);
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_posts jsonb := '[]'::jsonb;
begin
  if p_kind not in ('solution', 'discussion') then return null; end if;
  if not v_locked then
    select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'title', p.title,
        'excerpt', case when p.spoiler then null else left(regexp_replace(p.body, '\s+', ' ', 'g'), 220) end,
        'language', p.language, 'spoiler', p.spoiler, 'score', p.score, 'comments', p.comment_count,
        'created_at', p.created_at, 'edited', p.edited_at is not null, 'author', private.author_card(p.author),
        'mine', uid is not null and p.author = uid,
        'voted', exists (select 1 from public.community_votes v where v.user_id = uid and v.post_id = p.id))
      order by case when p_sort = 'new' then 0 else p.score end desc, p.created_at desc), '[]'::jsonb)
      into v_posts
      from (select * from public.community_posts
             where space = p_space and kind = p_kind and status = 'visible'
             order by case when p_sort = 'new' then 0 else score end desc, created_at desc
             limit v_limit offset greatest(coalesce(p_offset, 0), 0)) p;
  end if;
  return jsonb_build_object(
    'locked', v_locked,
    'posts', v_posts,
    'counts', jsonb_build_object(
      'solution', (select count(*) from public.community_posts where space = p_space and kind = 'solution' and status = 'visible'),
      'discussion', (select count(*) from public.community_posts where space = p_space and kind = 'discussion' and status = 'visible')));
end $$;
revoke all on function public.community_list(text, text, text, int, int) from public;
grant execute on function public.community_list(text, text, text, int, int) to anon, authenticated;

-- One post with its comments, or null if it doesn't exist or isn't visible (its author still sees it while hidden).
-- A locked solution comes back as {locked: true} with its title only.
create or replace function public.community_thread(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p public.community_posts;
begin
  select * into p from public.community_posts where id = p_id;
  if not found or not (p.status = 'visible' or (p.status = 'hidden' and p.author = uid)) then return null; end if;
  if not private.community_can_read(uid, p.space, p.kind) then
    return jsonb_build_object('locked', true, 'post', jsonb_build_object('id', p.id, 'space', p.space, 'kind', p.kind, 'title', p.title));
  end if;
  return jsonb_build_object(
    'locked', false,
    'post', jsonb_build_object(
      'id', p.id, 'space', p.space, 'kind', p.kind, 'title', p.title, 'body', p.body, 'code', p.code, 'language', p.language,
      'spoiler', p.spoiler, 'score', p.score, 'comments', p.comment_count, 'status', p.status, 'created_at', p.created_at,
      'edited_at', p.edited_at, 'author', private.author_card(p.author), 'mine', uid is not null and p.author = uid,
      'voted', exists (select 1 from public.community_votes v where v.user_id = uid and v.post_id = p.id)),
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', c.id, 'parent_id', c.parent_id, 'created_at', c.created_at, 'edited', c.edited_at is not null,
          'status', case when c.status = 'visible' or (c.status = 'hidden' and c.author = uid) then c.status else 'gone' end,
          'body', case when c.status = 'visible' or (c.status = 'hidden' and c.author = uid) then c.body end,
          'author', case when c.status = 'visible' or (c.status = 'hidden' and c.author = uid) then private.author_card(c.author) end,
          'score', c.score, 'mine', uid is not null and c.author = uid,
          'voted', exists (select 1 from public.community_votes v where v.user_id = uid and v.comment_id = c.id))
        order by c.created_at)
        from public.community_comments c
       where c.post_id = p.id
         -- A hidden, removed or deleted comment only stays (as "[removed]") when someone replied to it.
         and (c.status = 'visible' or (c.status = 'hidden' and c.author = uid) or exists (
               select 1 from public.community_comments r where r.parent_id = c.id and r.status = 'visible'))), '[]'::jsonb));
end $$;
revoke all on function public.community_thread(uuid) from public;
grant execute on function public.community_thread(uuid) to anon, authenticated;

-- What the signed-in learner can do: post, add links, or why not (for the composer).
create or replace function public.community_my_status()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_error text;
begin
  if uid is null then return jsonb_build_object('can_post', false, 'reason', 'not_signed_in'); end if;
  begin
    perform private.require_poster(uid);
  exception when others then v_error := sqlerrm;
  end;
  return jsonb_build_object('can_post', v_error is null, 'reason', v_error, 'level', private.user_level(uid),
    'links', private.user_level(uid) >= 4,
    'handle', (select handle from public.public_profiles where user_id = uid));
end $$;
revoke all on function public.community_my_status() from public, anon;
grant execute on function public.community_my_status() to authenticated;

-- ---------- writing ----------

-- Errors (besides the posting rules and clean_post): bad_space · solve_first · too_many_posts · too_fast.
create or replace function public.community_create_post(p_space text, p_kind text, p_title text, p_body text, p_code text, p_language text, p_spoiler boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v record; v_problem text := private.space_problem(p_space); v_id uuid;
begin
  perform private.require_poster(uid);
  if v_problem is null or p_kind not in ('solution', 'discussion')
     or not exists (select 1 from public.coding_problems where slug = v_problem and active) then
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

-- Author only, while visible or hidden. Errors: not_found plus the field checks.
create or replace function public.community_edit_post(p_id uuid, p_title text, p_body text, p_code text, p_language text, p_spoiler boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p public.community_posts; v record;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select * into p from public.community_posts where id = p_id and author = uid and status in ('visible', 'hidden') for update;
  if not found then raise exception 'not_found'; end if;
  select * into v from private.clean_post(p.kind, p_title, p_body, p_code, p_language);
  perform private.check_links(uid, v.title || ' ' || v.body);
  update public.community_posts
     set title = v.title, body = v.body, code = v.code, language = v.language,
         spoiler = p.kind = 'discussion' and coalesce(p_spoiler, false), edited_at = now()
   where id = p_id;
end $$;

create or replace function public.community_delete_post(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.community_posts set status = 'deleted' where id = p_id and author = auth.uid() and status in ('visible', 'hidden');
  if not found then raise exception 'not_found'; end if;
end $$;

-- Reply to a post, or to a comment (replies to replies join the same thread). Errors: not_found · locked ·
-- bad_body · too_many_comments · too_fast, plus the posting rules.
create or replace function public.community_comment(p_post uuid, p_parent uuid, p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); p public.community_posts; parent public.community_comments;
  v_body text := btrim(coalesce(p_body, '')); v_id uuid; v_parent uuid;
begin
  perform private.require_poster(uid);
  select * into p from public.community_posts where id = p_post and status = 'visible';
  if not found then raise exception 'not_found'; end if;
  if not private.community_can_read(uid, p.space, p.kind) then raise exception 'locked'; end if;
  if char_length(v_body) not between 1 and 2000 then raise exception 'bad_body'; end if;
  perform private.check_links(uid, v_body);
  if p_parent is not null then
    select * into parent from public.community_comments where id = p_parent and post_id = p.id and status = 'visible';
    if not found then raise exception 'not_found'; end if;
    v_parent := coalesce(parent.parent_id, parent.id);
  end if;
  perform pg_advisory_xact_lock(hashtext('community_comment:' || uid));
  if (select count(*) from public.community_comments where author = uid and created_at > now() - interval '24 hours') >= 30 then
    raise exception 'too_many_comments';
  end if;
  if exists (select 1 from public.community_comments where author = uid and created_at > now() - interval '10 seconds') then
    raise exception 'too_fast';
  end if;
  insert into public.community_comments (post_id, parent_id, author, body) values (p.id, v_parent, uid, v_body) returning id into v_id;
  update public.community_posts set activity_at = now() where id = p.id;
  perform private.refresh_comment_count(p.id);

  if p.author is not null and p.author <> uid then
    perform private.notify(p.author, 'community_reply', 'New reply to “' || p.title || '”',
      (select handle from public.public_profiles where user_id = uid) || ': ' || v_body, private.post_path(p) || '#c-' || v_id, p.id);
  end if;
  if parent.author is not null and parent.author <> uid and parent.author is distinct from p.author then
    perform private.notify(parent.author, 'community_reply', 'New reply to your comment on “' || p.title || '”',
      (select handle from public.public_profiles where user_id = uid) || ': ' || v_body, private.post_path(p) || '#c-' || v_id, parent.id);
  end if;
  return v_id;
end $$;

create or replace function public.community_edit_comment(p_id uuid, p_body text)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_body text := btrim(coalesce(p_body, ''));
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if char_length(v_body) not between 1 and 2000 then raise exception 'bad_body'; end if;
  perform private.check_links(uid, v_body);
  update public.community_comments set body = v_body, edited_at = now() where id = p_id and author = uid and status in ('visible', 'hidden');
  if not found then raise exception 'not_found'; end if;
end $$;

create or replace function public.community_delete_comment(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_post uuid;
begin
  update public.community_comments set status = 'deleted' where id = p_id and author = auth.uid() and status in ('visible', 'hidden')
  returning post_id into v_post;
  if not found then raise exception 'not_found'; end if;
  perform private.refresh_comment_count(v_post);
end $$;

-- Upvote (p_on) or take it back, on a post or a comment you can read. Returns the new score.
-- Errors: not_signed_in · not_found · locked · own_post · too_many_votes.
create or replace function public.community_vote(p_post uuid, p_comment uuid, p_on boolean)
returns int language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p public.community_posts; c public.community_comments; v_author uuid; v_score int; v_new boolean := false;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if num_nonnulls(p_post, p_comment) <> 1 then raise exception 'not_found'; end if;
  if p_comment is not null then
    select * into c from public.community_comments where id = p_comment and status = 'visible';
    if not found then raise exception 'not_found'; end if;
    v_author := c.author;
    select * into p from public.community_posts where id = c.post_id and status = 'visible';
  else
    select * into p from public.community_posts where id = p_post and status = 'visible';
    v_author := p.author;
  end if;
  if p.id is null then raise exception 'not_found'; end if;
  if not private.community_can_read(uid, p.space, p.kind) then raise exception 'locked'; end if;
  if v_author = uid then raise exception 'own_post'; end if;

  if coalesce(p_on, false) then
    if (select count(*) from public.community_votes where user_id = uid and created_at > now() - interval '24 hours') >= 200 then
      raise exception 'too_many_votes';
    end if;
    if p_comment is not null then
      insert into public.community_votes (user_id, comment_id) values (uid, p_comment) on conflict do nothing;
    else
      insert into public.community_votes (user_id, post_id) values (uid, p_post) on conflict do nothing;
    end if;
    v_new := found;
  else
    delete from public.community_votes where user_id = uid and (post_id = p_post or comment_id = p_comment);
  end if;

  if p_comment is not null then
    select score into v_score from public.community_comments where id = p_comment;
  else
    select score into v_score from public.community_posts where id = p_post;
    -- Upvote milestones on posts (not every vote).
    if v_new and v_author is not null and v_score in (1, 10, 50) then
      perform private.notify(v_author, 'community_upvotes',
        case when v_score = 1 then 'Someone upvoted “' || p.title || '”' else v_score || ' upvotes on “' || p.title || '”' end,
        null, private.post_path(p), p.id);
    end if;
  end if;
  return v_score;
end $$;

-- Report a post or comment once. Three open reports from learners at level 2+ hide it until an admin decides.
-- Errors: not_signed_in · not_found · own_post · bad_reason · too_many_reports.
create or replace function public.community_report(p_post uuid, p_comment uuid, p_reason text, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p public.community_posts; c public.community_comments; v_author uuid; v_reporters int;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if num_nonnulls(p_post, p_comment) <> 1 then raise exception 'not_found'; end if;
  if p_reason is null or p_reason not in ('spam', 'abuse', 'spoiler', 'wrong', 'other') then raise exception 'bad_reason'; end if;
  if p_comment is not null then
    select * into c from public.community_comments where id = p_comment and status = 'visible';
    if not found then raise exception 'not_found'; end if;
    v_author := c.author;
    select * into p from public.community_posts where id = c.post_id;
  else
    select * into p from public.community_posts where id = p_post and status = 'visible';
    if not found then raise exception 'not_found'; end if;
    v_author := p.author;
  end if;
  if not private.community_can_read(uid, p.space, p.kind) then raise exception 'not_found'; end if;
  if v_author = uid then raise exception 'own_post'; end if;
  if (select count(*) from public.community_reports where reporter = uid and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'too_many_reports';
  end if;

  insert into public.community_reports (reporter, post_id, comment_id, reason, note)
  values (uid, p_post, p_comment, p_reason, nullif(left(btrim(coalesce(p_note, '')), 500), ''))
  on conflict do nothing;
  if not found then return; end if;

  select count(distinct r.reporter) into v_reporters
    from public.community_reports r
   where r.status = 'open' and (r.post_id = p_post or r.comment_id = p_comment) and private.user_level(r.reporter) >= 2;
  if v_reporters >= 3 then
    if p_comment is not null then
      update public.community_comments set status = 'hidden' where id = p_comment and status = 'visible';
      perform private.refresh_comment_count(c.post_id);
    else
      update public.community_posts set status = 'hidden' where id = p_post and status = 'visible';
    end if;
  end if;
  perform private.notify_admins('admin_community_report',
    case when v_reporters >= 3 then 'Hidden after reports: ' else 'Community report: ' end || p.title,
    p_reason || coalesce(' — ' || nullif(btrim(coalesce(p_note, '')), ''), ''), '/admin#community', coalesce(p_comment, p_post));
end $$;

-- ---------- moderation (admins) ----------

-- Posts and comments with open reports, or hidden: newest report first.
create or replace function public.admin_community_queue()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return coalesce((
    select jsonb_agg(item order by (item ->> 'last_report') desc nulls last)
      from (
        select jsonb_build_object(
            'target', 'post', 'id', p.id, 'post_id', p.id, 'path', private.post_path(p), 'title', p.title,
            'body', left(p.body, 1500), 'code', left(p.code, 1500), 'status', p.status,
            'author', private.author_card(p.author), 'author_email', (select email from auth.users where id = p.author),
            'reports', (select coalesce(jsonb_agg(jsonb_build_object('reason', r.reason, 'note', r.note, 'at', r.created_at) order by r.created_at), '[]'::jsonb)
                          from public.community_reports r where r.post_id = p.id and r.status = 'open'),
            'last_report', (select max(created_at) from public.community_reports r where r.post_id = p.id and r.status = 'open')) as item
          from public.community_posts p
         where p.status = 'hidden' or exists (select 1 from public.community_reports r where r.post_id = p.id and r.status = 'open')
        union all
        select jsonb_build_object(
            'target', 'comment', 'id', c.id, 'post_id', p.id, 'path', private.post_path(p) || '#c-' || c.id, 'title', p.title,
            'body', c.body, 'code', null, 'status', c.status,
            'author', private.author_card(c.author), 'author_email', (select email from auth.users where id = c.author),
            'reports', (select coalesce(jsonb_agg(jsonb_build_object('reason', r.reason, 'note', r.note, 'at', r.created_at) order by r.created_at), '[]'::jsonb)
                          from public.community_reports r where r.comment_id = c.id and r.status = 'open'),
            'last_report', (select max(created_at) from public.community_reports r where r.comment_id = c.id and r.status = 'open'))
          from public.community_comments c join public.community_posts p on p.id = c.post_id
         where c.status = 'hidden' or exists (select 1 from public.community_reports r where r.comment_id = c.id and r.status = 'open')
        limit 200) q), '[]'::jsonb);
end $$;
revoke all on function public.admin_community_queue() from public, anon;
grant execute on function public.admin_community_queue() to authenticated;

-- Keep (visible again, reports closed) or remove (author told why). p_target: 'post' | 'comment'.
create or replace function public.admin_community_moderate(p_target text, p_id uuid, p_action text, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.community_posts; c public.community_comments; v_reason text := nullif(left(btrim(coalesce(p_reason, '')), 200), '');
begin
  perform private.require_admin();
  if p_action not in ('keep', 'remove') or p_target not in ('post', 'comment') then raise exception 'bad_action'; end if;
  if p_target = 'post' then
    update public.community_posts
       set status = case when p_action = 'keep' then 'visible' else 'removed' end,
           removed_reason = case when p_action = 'remove' then v_reason end
     where id = p_id and status in ('visible', 'hidden') returning * into p;
    if not found then raise exception 'not_found'; end if;
    update public.community_reports set status = case when p_action = 'keep' then 'kept' else 'removed' end
     where post_id = p_id and status = 'open';
    if p_action = 'remove' then
      perform private.notify(p.author, 'community_removed', 'A moderator removed your post “' || p.title || '”',
        coalesce(v_reason, 'It broke the community guidelines.'), '/community/guidelines', p.id);
    end if;
  else
    update public.community_comments set status = case when p_action = 'keep' then 'visible' else 'removed' end
     where id = p_id and status in ('visible', 'hidden') returning * into c;
    if not found then raise exception 'not_found'; end if;
    update public.community_reports set status = case when p_action = 'keep' then 'kept' else 'removed' end
     where comment_id = p_id and status = 'open';
    perform private.refresh_comment_count(c.post_id);
    if p_action = 'remove' then
      select * into p from public.community_posts where id = c.post_id;
      perform private.notify(c.author, 'community_removed', 'A moderator removed your comment on “' || p.title || '”',
        coalesce(v_reason, 'It broke the community guidelines.'), '/community/guidelines', c.id);
    end if;
  end if;
  insert into private.community_mod_log (admin, action, post_id, comment_id, user_id, reason)
  values (auth.uid(), p_action, case when p_target = 'post' then p_id end, case when p_target = 'comment' then p_id end,
          coalesce(p.author, c.author), v_reason);
end $$;
revoke all on function public.admin_community_moderate(text, uuid, text, text) from public, anon;
grant execute on function public.admin_community_moderate(text, uuid, text, text) to authenticated;

-- Stop someone posting: p_days > 0 for that long, null for good, 0 to lift the ban. Errors: not_found.
create or replace function public.admin_community_ban(p_handle text, p_days int, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  perform private.require_admin();
  select user_id into v_user from public.public_profiles where handle = lower(btrim(coalesce(p_handle, '')));
  if v_user is null then raise exception 'not_found'; end if;
  if p_days = 0 then
    delete from private.community_bans where user_id = v_user;
  else
    insert into private.community_bans (user_id, until, reason, created_by)
    values (v_user, case when p_days is null then null else now() + make_interval(days => least(p_days, 3650)) end,
            nullif(left(btrim(coalesce(p_reason, '')), 200), ''), auth.uid())
    on conflict (user_id) do update set until = excluded.until, reason = excluded.reason, created_by = excluded.created_by, created_at = now();
  end if;
  insert into private.community_mod_log (admin, action, user_id, reason)
  values (auth.uid(), case when p_days = 0 then 'unban' else 'ban:' || coalesce(p_days::text, 'forever') end, v_user, p_reason);
end $$;
revoke all on function public.admin_community_ban(text, int, text) from public, anon;
grant execute on function public.admin_community_ban(text, int, text) to authenticated;

-- Take a public profile page down (or back up). Errors: not_found.
create or replace function public.admin_set_profile_hidden(p_handle text, p_hidden boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  perform private.require_admin();
  update public.public_profiles set hidden = coalesce(p_hidden, true) where handle = lower(btrim(coalesce(p_handle, '')))
  returning user_id into v_user;
  if v_user is null then raise exception 'not_found'; end if;
  insert into private.community_mod_log (admin, action, user_id) values (auth.uid(), case when p_hidden then 'hide_profile' else 'show_profile' end, v_user);
end $$;
revoke all on function public.admin_set_profile_hidden(text, boolean) from public, anon;
grant execute on function public.admin_set_profile_hidden(text, boolean) to authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'public.community_create_post(text, text, text, text, text, text, boolean)',
    'public.community_edit_post(uuid, text, text, text, text, boolean)',
    'public.community_delete_post(uuid)',
    'public.community_comment(uuid, uuid, text)',
    'public.community_edit_comment(uuid, text)',
    'public.community_delete_comment(uuid)',
    'public.community_vote(uuid, uuid, boolean)',
    'public.community_report(uuid, uuid, text, text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  foreach f in array array[
    'private.on_community_vote()', 'private.space_problem(text)', 'private.post_path(public.community_posts)',
    'private.community_can_read(uuid, text, text)', 'private.author_card(uuid)', 'private.require_poster(uuid)',
    'private.check_links(uuid, text)', 'private.refresh_comment_count(uuid)',
    'private.clean_post(text, text, text, text, text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end $$;
