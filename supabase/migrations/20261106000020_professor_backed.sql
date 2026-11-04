-- Professor-backed lessons (tracker 8.2): a professor's teaching profile, going live for learners (the professor
-- asks, Krpex approves), public professor pages, and search over a live professor's published material and model
-- lessons for the AI that teaches in their style. A learner's course stores its professor as 'p:<uuid>' in
-- courses.professor (AI personas keep their short ids).

alter table public.professors add column if not exists teaching_style text check (char_length(teaching_style) <= 2000);
-- The professor asks to be shown to learners; Krpex then sets live_at. Turning the request off hides them at once.
alter table public.professors add column if not exists listing_requested boolean not null default false;
alter table public.professors add column if not exists live_at timestamptz;

-- Word search over material ('simple': no stemming, works for English and Hindi alike).
alter table public.professor_material_sections
  add column if not exists fts tsvector generated always as (to_tsvector('simple', coalesce(heading, '') || ' ' || body)) stored;
create index if not exists professor_material_sections_fts_idx on public.professor_material_sections using gin (fts);
create index if not exists professor_material_sections_prof_idx on public.professor_material_sections (professor_id);

-- Live = approved, asked to be shown, and approved for learners by Krpex.
create or replace function private.professor_is_live(p public.professors) returns boolean
language sql immutable set search_path = '' as $$
  select p.status = 'approved' and p.listing_requested and p.live_at is not null;
$$;

-- Null for the two new arguments keeps their current values.
drop function if exists public.professor_update_profile(text, text, text, text, text[], text);
create or replace function public.professor_update_profile(
  p_display_name text, p_title text, p_institution text, p_bio text, p_languages text[], p_credentials text,
  p_teaching_style text default null, p_listing_requested boolean default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if private.my_professor_id() is null then raise exception 'not_professor'; end if;
  if char_length(trim(coalesce(p_display_name, ''))) not between 2 and 80 then raise exception 'invalid_name'; end if;
  update public.professors set
    display_name = trim(p_display_name),
    title = nullif(trim(left(coalesce(p_title, ''), 80)), ''),
    institution = nullif(trim(left(coalesce(p_institution, ''), 120)), ''),
    bio = nullif(trim(left(coalesce(p_bio, ''), 1200)), ''),
    languages = p_languages,
    credentials = nullif(trim(left(coalesce(p_credentials, ''), 1200)), ''),
    teaching_style = case when p_teaching_style is null then teaching_style
                          else nullif(trim(left(p_teaching_style, 2000)), '') end,
    listing_requested = coalesce(p_listing_requested, listing_requested),
    live_at = case when coalesce(p_listing_requested, listing_requested) then live_at end,
    updated_at = now()
  where user_id = auth.uid();
end $$;
revoke all on function public.professor_update_profile(text, text, text, text, text[], text, text, boolean) from public, anon;
grant execute on function public.professor_update_profile(text, text, text, text, text[], text, text, boolean) to authenticated;

-- Admin: show (or hide) a professor to learners. Only approved professors who asked can go live.
create or replace function public.admin_set_professor_live(p_id uuid, p_live boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  if p_live then
    update public.professors set live_at = coalesce(live_at, now()), updated_at = now()
     where id = p_id and status = 'approved' and listing_requested;
    if not found then raise exception 'not_ready'; end if;
  else
    update public.professors set live_at = null, updated_at = now() where id = p_id;
  end if;
end $$;
revoke all on function public.admin_set_professor_live(uuid, boolean) from public, anon;
grant execute on function public.admin_set_professor_live(uuid, boolean) to authenticated;

-- Admin list gains the teaching profile and live state.
create or replace function public.admin_professors() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  perform private.require_admin();
  select jsonb_build_object(
    'professors', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'email', u.email, 'display_name', p.display_name, 'title', p.title, 'institution', p.institution,
        'subject', p.subject, 'languages', p.languages, 'credentials', p.credentials, 'status', p.status,
        'agreement_version', p.agreement_version, 'created_at', p.created_at,
        'teaching_style', p.teaching_style, 'listing_requested', p.listing_requested, 'live', private.professor_is_live(p),
        'materials', (select count(*) from public.professor_materials m where m.professor_id = p.id),
        'published', (select count(*) from public.professor_materials m where m.professor_id = p.id and m.status = 'published'),
        'pages', (select coalesce(sum(m.pages), 0) from public.professor_materials m where m.professor_id = p.id),
        'lessons', (select count(*) from public.professor_lessons l where l.professor_id = p.id),
        'lessons_published', (select count(*) from public.professor_lessons l where l.professor_id = p.id and l.status = 'published'),
        'recording_minutes_month', (select coalesce(round(sum(rec.seconds) / 60.0), 0) from public.professor_recordings rec
                                     where rec.professor_id = p.id and rec.status <> 'failed' and rec.created_at >= date_trunc('month', now()))
      ) order by p.created_at desc)
      from public.professors p join auth.users u on u.id = p.user_id), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object(
        'id', i.id, 'email', i.email, 'subject', i.subject, 'created_at', i.created_at, 'expires_at', i.expires_at
      ) order by i.created_at desc)
      from private.professor_invites i where i.used_at is null and i.revoked_at is null and i.expires_at > now()), '[]'::jsonb)
  ) into r;
  return r;
end $$;

-- Public: live professors (optionally for one subject, e.g. 'science/physics'). Public fields only.
create or replace function private.public_professor_json(p public.professors) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'display_name', p.display_name, 'title', p.title, 'institution', p.institution, 'bio', p.bio,
    'subject', p.subject, 'languages', p.languages,
    'materials', (select count(*) from public.professor_materials m where m.professor_id = p.id and m.status = 'published'),
    'lessons', (select count(*) from public.professor_lessons l where l.professor_id = p.id and l.status = 'published'));
$$;
revoke all on function private.public_professor_json(public.professors) from public, anon, authenticated;

create or replace function public.public_professors(p_subject text default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(private.public_professor_json(p) order by p.live_at), '[]'::jsonb)
    from public.professors p
   where private.professor_is_live(p) and (p_subject is null or p.subject = p_subject);
$$;

create or replace function public.public_professor(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select private.public_professor_json(p) from public.professors p where p.id = p_id and private.professor_is_live(p);
$$;
revoke all on function public.public_professors(text), public.public_professor(uuid) from public;
grant execute on function public.public_professors(text), public.public_professor(uuid) to anon, authenticated;

-- Server only: what the AI needs to teach as a live professor: their profile, the published material sections that
-- best match p_query (at most p_max_chars, capped at 20,000), and their best-matching published model lesson.
-- Null if the professor isn't live (paused, hidden or removed): the course then falls back to the AI persona.
create or replace function public.app_teacher_context(p_key text, p_professor uuid, p_query text, p_max_chars int)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  p public.professors;
  q tsquery;
  lex text;
  n int := 0;
  budget int := least(greatest(coalesce(p_max_chars, 0), 0), 20000);
  used int := 0;
  sections jsonb := '[]'::jsonb;
  s record;
  example jsonb;
begin
  perform private.require_server_key(p_key);
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into p from public.professors where id = p_professor;
  if not found or not private.professor_is_live(p) then return null; end if;

  -- Any of the query's words (3+ characters, at most 40).
  for lex in select t.lexeme from unnest(to_tsvector('simple', left(coalesce(p_query, ''), 4000))) t
              where char_length(t.lexeme) >= 3 order by t.lexeme loop
    q := case when q is null then plainto_tsquery('simple', lex) else q || plainto_tsquery('simple', lex) end;
    n := n + 1;
    exit when n >= 40;
  end loop;

  if q is not null and budget > 0 then
    for s in
      select m.title as material, m.kind, ps.heading, ps.body
        from public.professor_material_sections ps join public.professor_materials m on m.id = ps.material_id
       where ps.professor_id = p.id and m.status = 'published' and ps.fts @@ q
       order by ts_rank(ps.fts, q) desc, ps.id
       limit 12
    loop
      exit when used >= budget;
      sections := sections || jsonb_build_object('material', s.material, 'kind', s.kind, 'heading', s.heading,
                                                 'body', left(s.body, budget - used));
      used := used + char_length(s.body);
    end loop;
  end if;

  select jsonb_build_object('title', l.title, 'objective', l.objective, 'blocks', l.blocks, 'key_takeaways', l.key_takeaways)
    into example
    from public.professor_lessons l
   where l.professor_id = p.id and l.status = 'published'
   order by case when q is null then 0
                 else ts_rank(to_tsvector('simple', l.title || ' ' || coalesce(l.topic, '') || ' ' || coalesce(l.objective, '')), q) end desc,
            l.published_at desc nulls last
   limit 1;

  return jsonb_build_object(
    'id', p.id, 'display_name', p.display_name, 'title', p.title, 'institution', p.institution, 'subject', p.subject,
    'teaching_style', p.teaching_style, 'sections', sections, 'example', example);
end $$;
revoke all on function public.app_teacher_context(text, uuid, text, int) from public, anon;
grant execute on function public.app_teacher_context(text, uuid, text, int) to authenticated;
