-- Admin panel 6.3 (plan.md Phase 6): community moderation, and the rest of the admin actions in the audit log.
--   · admin_community_queue(p_show): 'all' (reported or hidden, as before) · 'reported' · 'hidden'.
--   · admin_community_bans(): who can't post, until when, why and who decided.
--   · admin_community_log(): the moderation history (community_mod_log, plus boards turned on/off) with what it was about.
--   · admin_community_boards() / admin_set_board_active(): every board with its counts, and turning one off or on.
--     A board that's off takes no new discussions and leaves the lists (its threads stay readable by link).
--   · Professor approvals, listing, invites and resolved lesson reports now write to private.admin_log, so they
--     show in a learner's Admin history and on System's Admin activity. The functions are otherwise unchanged.
-- Run after 036. Safe to run twice.

-- ---------- moderation queue, bans, history ----------

drop function if exists public.admin_community_queue();
create or replace function public.admin_community_queue(p_show text default 'all')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_show text := case when p_show in ('reported', 'hidden') then p_show else 'all' end;
begin
  perform private.require_admin();
  return coalesce((
    select jsonb_agg(item order by (item ->> 'last_report') desc nulls last, (item ->> 'created_at') desc)
      from (
        select jsonb_build_object(
            'target', 'post', 'id', p.id, 'post_id', p.id, 'path', private.post_path(p), 'title', p.title,
            'body', left(p.body, 1500), 'code', left(p.code, 1500), 'status', p.status, 'created_at', p.created_at,
            'author', private.author_card(p.author), 'author_id', p.author, 'author_email', (select email from auth.users where id = p.author),
            'reports', (select coalesce(jsonb_agg(jsonb_build_object('reason', r.reason, 'note', r.note, 'at', r.created_at) order by r.created_at), '[]'::jsonb)
                          from public.community_reports r where r.post_id = p.id and r.status = 'open'),
            'last_report', (select max(created_at) from public.community_reports r where r.post_id = p.id and r.status = 'open')) as item
          from public.community_posts p
         where (v_show <> 'reported' and p.status = 'hidden')
            or (v_show <> 'hidden' and p.status in ('visible', 'hidden')
                and exists (select 1 from public.community_reports r where r.post_id = p.id and r.status = 'open'))
        union all
        select jsonb_build_object(
            'target', 'comment', 'id', c.id, 'post_id', p.id, 'path', private.post_path(p) || '#c-' || c.id, 'title', p.title,
            'body', c.body, 'code', null, 'status', c.status, 'created_at', c.created_at,
            'author', private.author_card(c.author), 'author_id', c.author, 'author_email', (select email from auth.users where id = c.author),
            'reports', (select coalesce(jsonb_agg(jsonb_build_object('reason', r.reason, 'note', r.note, 'at', r.created_at) order by r.created_at), '[]'::jsonb)
                          from public.community_reports r where r.comment_id = c.id and r.status = 'open'),
            'last_report', (select max(created_at) from public.community_reports r where r.comment_id = c.id and r.status = 'open'))
          from public.community_comments c join public.community_posts p on p.id = c.post_id
         where (v_show <> 'reported' and c.status = 'hidden')
            or (v_show <> 'hidden' and c.status in ('visible', 'hidden')
                and exists (select 1 from public.community_reports r where r.comment_id = c.id and r.status = 'open'))
        limit 200) q), '[]'::jsonb);
end $$;

-- Bans still in force, newest first.
create or replace function public.admin_community_bans()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return coalesce((select jsonb_agg(jsonb_build_object(
      'user_id', b.user_id, 'handle', pp.handle, 'email', u.email, 'until', b.until, 'reason', b.reason,
      'by', a.email, 'at', b.created_at) order by b.created_at desc)
    from private.community_bans b
    left join public.public_profiles pp on pp.user_id = b.user_id
    left join auth.users u on u.id = b.user_id
    left join auth.users a on a.id = b.created_by
   where b.until is null or b.until > now()), '[]'::jsonb);
end $$;

-- Moderation history, newest first: keep/remove, bans, profile pages and boards on/off.
create or replace function public.admin_community_log(p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return coalesce((select jsonb_agg(x order by x.at desc) from (
    select m.created_at as at, a.email::text as admin, m.action, coalesce(m.user_id, p.author, c.author) as user_id, t.email::text as email,
           jsonb_strip_nulls(jsonb_build_object('reason', m.reason, 'post', m.post_id, 'comment', m.comment_id,
             'title', coalesce(p.title, cp.title),
             'path', case when p.id is not null then private.post_path(p) when cp.id is not null then private.post_path(cp) || '#c-' || c.id end)) as detail
      from private.community_mod_log m
      left join public.community_posts p on p.id = m.post_id
      left join public.community_comments c on c.id = m.comment_id
      left join public.community_posts cp on cp.id = c.post_id
      left join auth.users a on a.id = m.admin
      left join auth.users t on t.id = coalesce(m.user_id, p.author, c.author)
    union all
    select l.created_at, a.email::text, l.action, l.user_id, null, l.detail
      from private.admin_log l left join auth.users a on a.id = l.admin
     where l.action in ('board_on', 'board_off')
    order by 1 desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200) offset least(greatest(coalesce(p_offset, 0), 0), 100000)) x), '[]'::jsonb);
end $$;

-- ---------- boards ----------

create or replace function public.admin_community_boards()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return coalesce((select jsonb_agg(jsonb_build_object(
      'slug', b.slug, 'kind', b.kind, 'title', b.title, 'active', b.active,
      'posts', (select count(*) from public.community_posts p where p.space = 'board:' || b.slug and p.status = 'visible'),
      'hidden', (select count(*) from public.community_posts p where p.space = 'board:' || b.slug and p.status in ('hidden', 'removed')),
      'last_activity', (select max(p.activity_at) from public.community_posts p where p.space = 'board:' || b.slug and p.status = 'visible'))
    order by b.position)
  from public.community_boards b), '[]'::jsonb);
end $$;

-- Turn a board off (no new discussions, gone from the lists) or back on. Errors: not_found.
create or replace function public.admin_set_board_active(p_slug text, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_title text;
begin
  perform private.require_admin();
  update public.community_boards set active = coalesce(p_active, true) where slug = p_slug returning title into v_title;
  if v_title is null then raise exception 'not_found'; end if;
  insert into private.admin_log (admin, action, detail)
  values (auth.uid(), case when coalesce(p_active, true) then 'board_on' else 'board_off' end, jsonb_build_object('board', p_slug, 'title', v_title));
end $$;

-- ---------- the other admin actions, now logged ----------

-- As in migration 012, plus a log line (who reported it, which lesson).
create or replace function public.admin_resolve_report(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.lesson_reports;
begin
  perform private.require_admin();
  update public.lesson_reports set status = 'resolved' where id = p_id and status <> 'resolved' returning * into r;
  if found then
    insert into private.admin_log (admin, action, user_id, detail)
    values (auth.uid(), 'resolve_report', r.user_id, jsonb_build_object('reason', r.reason,
            'lesson', (select title from public.lessons where id = r.lesson_id)));
  end if;
end $$;

-- As in migration 016, plus a log line (the email and subject; never the token).
create or replace function public.admin_create_professor_invite(p_email text, p_subject text) returns text
language plpgsql security definer set search_path = '' as $$
declare tok text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  perform private.require_admin();
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(p_email) > 320 then
    raise exception 'invalid_email';
  end if;
  if p_subject is null or p_subject !~ '^[a-z_]+/[a-z0-9_-]+$' then raise exception 'invalid_subject'; end if;
  insert into private.professor_invites (email, subject, token_hash)
  values (lower(trim(p_email)), p_subject, encode(sha256(convert_to(tok, 'UTF8')), 'hex'));
  insert into private.admin_log (admin, action, user_id, detail)
  values (auth.uid(), 'professor_invite', (select id from auth.users where lower(email) = lower(trim(p_email)) limit 1),
          jsonb_build_object('email', lower(trim(p_email)), 'subject', p_subject));
  return tok;
end $$;

create or replace function public.admin_revoke_professor_invite(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_email text;
begin
  perform private.require_admin();
  update private.professor_invites set revoked_at = now() where id = p_id and used_at is null and revoked_at is null returning email into v_email;
  if v_email is not null then
    insert into private.admin_log (admin, action, user_id, detail)
    values (auth.uid(), 'professor_invite_revoked', (select id from auth.users where lower(email) = v_email limit 1), jsonb_build_object('email', v_email));
  end if;
end $$;

create or replace function public.admin_set_professor_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_name text; v_old text;
begin
  perform private.require_admin();
  if p_status not in ('pending', 'approved', 'suspended') then raise exception 'invalid_status'; end if;
  select user_id, display_name, status into v_user, v_name, v_old from public.professors where id = p_id;
  update public.professors
     set status = p_status, updated_at = now(),
         approved_at = case when p_status = 'approved' then coalesce(approved_at, now()) else approved_at end
   where id = p_id;
  if v_user is not null and v_old is distinct from p_status then
    insert into private.admin_log (admin, action, user_id, detail)
    values (auth.uid(), 'professor:' || p_status, v_user, jsonb_build_object('name', v_name));
  end if;
end $$;

-- As in migration 020, plus a log line.
create or replace function public.admin_set_professor_live(p_id uuid, p_live boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_name text;
begin
  perform private.require_admin();
  if p_live then
    update public.professors set live_at = coalesce(live_at, now()), updated_at = now()
     where id = p_id and status = 'approved' and listing_requested
    returning user_id, display_name into v_user, v_name;
    if not found then raise exception 'not_ready'; end if;
  else
    update public.professors set live_at = null, updated_at = now() where id = p_id
    returning user_id, display_name into v_user, v_name;
  end if;
  if v_user is not null then
    insert into private.admin_log (admin, action, user_id, detail)
    values (auth.uid(), case when p_live then 'professor_listed' else 'professor_unlisted' end, v_user, jsonb_build_object('name', v_name));
  end if;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.admin_community_queue(text)',
    'public.admin_community_bans()',
    'public.admin_community_log(int, int)',
    'public.admin_community_boards()',
    'public.admin_set_board_active(text, boolean)',
    'public.admin_resolve_report(uuid)',
    'public.admin_create_professor_invite(text, text)',
    'public.admin_revoke_professor_invite(uuid)',
    'public.admin_set_professor_status(uuid, text)',
    'public.admin_set_professor_live(uuid, boolean)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
