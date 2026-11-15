-- Email campaigns (E.2–E.5): contacts from our own community, a do-not-send list, campaigns sent in a slow
-- ramp through Amazon SES (news.krpex.in), and per-person delivery, opens, clicks, unsubscribes and sign-ups.
--   · private.email_imports / email_contacts / email_suppressions / email_campaigns / email_sends
--   · admin_email_*: import, overview, contacts, save / start / pause / resume / stop a campaign, results
--   · app_email_* (server key): claim a batch to send, record the result, SES events, opens/clicks, unsubscribe
-- Sending pauses itself when bounces pass 5% (after 40 sends) or complaints pass 0.1% (2 or more) since the
-- campaign started or was last resumed. The daily cap ramps: 100/day for the first week, then doubles every
-- 3 days, up to admin_settings.email_daily_max.

-- ── Tables ──────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists private.email_imports (
  id bigint generated always as identity primary key,
  source text not null check (char_length(source) between 1 and 80),
  consent_note text check (char_length(consent_note) <= 500),
  file_name text check (char_length(file_name) <= 200),
  tags text[] not null default '{}',
  counts jsonb not null default '{}',
  imported_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists private.email_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name text check (char_length(name) <= 80),
  college text check (char_length(college) <= 120),
  year text check (char_length(year) <= 20),
  tags text[] not null default '{}',
  source text not null check (char_length(source) between 1 and 80), -- where they signed up; admin only, never in emails
  import_id bigint references private.email_imports (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists email_contacts_tags_idx on private.email_contacts using gin (tags);

-- Never emailed again, whatever list they're on.
create table if not exists private.email_suppressions (
  email text primary key check (email = lower(email)),
  reason text not null check (reason in ('unsubscribed', 'bounced', 'complained', 'manual')),
  campaign_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists private.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,29}$'), -- links carry ?ref=email-<slug>
  name text not null check (char_length(name) between 1 and 120),
  subject text not null default '' check (char_length(subject) <= 150),
  preview text not null default '' check (char_length(preview) <= 150),
  body text not null default '' check (char_length(body) <= 20000),
  from_name text not null default 'Krpex' check (char_length(from_name) between 1 and 60),
  tags text[] not null default '{}', -- audience: contacts with any of these tags; empty = everyone
  status text not null default 'draft' check (status in ('draft', 'sending', 'paused', 'done')),
  paused_reason text check (char_length(paused_reason) <= 300),
  checked_from timestamptz, -- health is judged on sends since this time (start or last resume)
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists private.email_sends (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references private.email_campaigns (id) on delete cascade,
  contact_id uuid references private.email_contacts (id) on delete set null,
  email text not null,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'skipped', 'bounced', 'complained')),
  attempts int not null default 0,
  claimed_at timestamptz,
  sent_at timestamptz,
  message_id text,
  error text check (char_length(error) <= 300),
  delivered_at timestamptz,
  opened_at timestamptz,
  opens int not null default 0,
  clicked_at timestamptz,
  clicks int not null default 0,
  unsubscribed_at timestamptz,
  unique (campaign_id, email)
);
create index if not exists email_sends_queue_idx on private.email_sends (status, id);
create index if not exists email_sends_message_idx on private.email_sends (message_id);
create index if not exists email_sends_sent_idx on private.email_sends (sent_at);

do $$
declare t text;
begin
  foreach t in array array['email_imports', 'email_contacts', 'email_suppressions', 'email_campaigns', 'email_sends'] loop
    execute format('alter table private.%I enable row level security', t);
    execute format('revoke all on private.%I from public, anon, authenticated', t);
  end loop;
end $$;

alter table private.admin_settings add column if not exists email_daily_max int not null default 2000 check (email_daily_max between 0 and 50000);

-- ── Helpers ─────────────────────────────────────────────────────────────────────────────────────────────
-- Tags: lower-case letters, digits and dashes, up to 30 characters, at most 10.
create or replace function private.email_tags(p text[]) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce((array_agg(distinct t order by t))[1:10], '{}') from (
    select lower(btrim(x)) as t from unnest(coalesce(p, '{}')) x
  ) y where t ~ '^[a-z0-9][a-z0-9-]{0,29}$'
$$;

-- How many campaign emails may go out today (IST): 100/day in the first week after the first send, then double every 3 days.
create or replace function private.email_daily_cap() returns int
language plpgsql stable security definer set search_path = '' as $$
declare
  v_first timestamptz := (select min(sent_at) from private.email_sends);
  v_days int := coalesce(floor(extract(epoch from now() - v_first) / 86400)::int, 0);
  v_cap bigint := case when v_days < 7 then 100 else 100 * power(2, least(floor((v_days - 7) / 3.0) + 1, 20))::bigint end;
begin
  return least(v_cap, (select email_daily_max from private.admin_settings where id))::int;
end $$;

create or replace function private.email_sent_today() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from private.email_sends
   where sent_at >= (date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata');
$$;

-- Bounce and complaint rates for one campaign since it started or was last resumed.
create or replace function private.email_health(p_campaign uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('sent', n, 'bounced', b, 'complained', c,
    'bounce_rate', case when n > 0 then round(b::numeric / n, 4) else 0 end,
    'complaint_rate', case when n > 0 then round(c::numeric / n, 4) else 0 end,
    'unhealthy', (n >= 40 and b::numeric / n > 0.05) or (c >= 2 and c::numeric / n > 0.001))
  from (select count(*) filter (where s.status in ('sent', 'bounced', 'complained')) as n,
               count(*) filter (where s.status = 'bounced') as b,
               count(*) filter (where s.status = 'complained') as c
          from private.email_sends s join private.email_campaigns m on m.id = s.campaign_id
         where s.campaign_id = p_campaign and s.sent_at >= coalesce(m.checked_from, m.started_at, '-infinity')) x;
$$;

-- Pause a sending campaign whose bounces or complaints are too high. Returns true if it was paused.
create or replace function private.email_check_health(p_campaign uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare h jsonb := private.email_health(p_campaign);
begin
  if not (h ->> 'unhealthy')::boolean then return false; end if;
  update private.email_campaigns
     set status = 'paused', updated_at = now(),
         paused_reason = format('Paused automatically: %s bounced and %s complained out of %s sent since the last start.',
                                h ->> 'bounced', h ->> 'complained', h ->> 'sent')
   where id = p_campaign and status = 'sending';
  if found then
    perform private.notify_admins('admin_email_paused', 'An email campaign paused itself',
      'Too many bounces or spam complaints. Check the campaign before resuming.', '/admin/email/' || p_campaign, null);
  end if;
  return found;
end $$;

do $$
declare f text;
begin
  foreach f in array array['private.email_tags(text[])', 'private.email_daily_cap()', 'private.email_sent_today()',
                           'private.email_health(uuid)', 'private.email_check_health(uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end $$;

-- ── Admin: contacts ─────────────────────────────────────────────────────────────────────────────────────
-- p_rows: [{email, name, college, year}] already cleaned by the app (syntax, duplicates, mail servers); checked
-- again here. Existing contacts get the new tags and keep their source. p_skipped: the app's counts of rows it dropped.
create or replace function public.admin_email_import(p_source text, p_consent text, p_file text, p_tags text[], p_rows jsonb, p_skipped jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_source text := left(btrim(coalesce(p_source, '')), 80);
  v_tags text[] := private.email_tags(p_tags);
  v_import bigint;
  v_added int := 0;
  v_updated int := 0;
  v_bad int := 0;
  r jsonb;
  v_email text;
  v_inserted boolean;
begin
  perform private.require_admin();
  if v_source = '' then raise exception 'source required' using errcode = '22023'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 10000 then raise exception 'bad rows' using errcode = '22023'; end if;
  insert into private.email_imports (source, consent_note, file_name, tags, imported_by)
  values (v_source, nullif(left(btrim(coalesce(p_consent, '')), 500), ''), nullif(left(coalesce(p_file, ''), 200), ''), v_tags, auth.uid())
  returning id into v_import;
  for r in select * from jsonb_array_elements(p_rows) loop
    v_email := lower(btrim(coalesce(r ->> 'email', '')));
    if char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then v_bad := v_bad + 1; continue; end if;
    insert into private.email_contacts (email, name, college, year, tags, source, import_id)
    values (v_email, nullif(left(btrim(coalesce(r ->> 'name', '')), 80), ''), nullif(left(btrim(coalesce(r ->> 'college', '')), 120), ''),
            nullif(left(btrim(coalesce(r ->> 'year', '')), 20), ''), v_tags, v_source, v_import)
    on conflict (email) do update
      set tags = private.email_tags(private.email_contacts.tags || excluded.tags),
          name = coalesce(private.email_contacts.name, excluded.name),
          college = coalesce(private.email_contacts.college, excluded.college),
          year = coalesce(private.email_contacts.year, excluded.year)
    returning (xmax = 0) into v_inserted;
    if v_inserted then v_added := v_added + 1; else v_updated := v_updated + 1; end if;
  end loop;
  update private.email_imports
     set counts = coalesce(p_skipped, '{}'::jsonb) || jsonb_build_object('added', v_added, 'updated', v_updated, 'invalid_here', v_bad)
   where id = v_import;
  insert into private.admin_log (admin, action, detail)
  values (auth.uid(), 'email:import', jsonb_build_object('source', v_source, 'added', v_added, 'updated', v_updated));
  return jsonb_build_object('import_id', v_import, 'added', v_added, 'updated', v_updated, 'invalid', v_bad);
end $$;

create or replace function public.admin_email_contacts(p_search text default '', p_tag text default '', p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  s text := '%' || replace(replace(replace(lower(btrim(coalesce(p_search, ''))), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  v_tag text := lower(btrim(coalesce(p_tag, '')));
begin
  perform private.require_admin();
  return (with base as (
      select c.*, x.reason as suppressed from private.email_contacts c
        left join private.email_suppressions x on x.email = c.email
       where (v_tag = '' or v_tag = any (c.tags))
         and (s = '%%' or c.email like s or lower(coalesce(c.name, '')) like s or lower(coalesce(c.college, '')) like s)
    )
    select jsonb_build_object(
      'total', (select count(*) from base),
      'rows', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'email', email, 'name', name, 'college', college, 'year', year,
                  'tags', tags, 'source', source, 'suppressed', suppressed, 'created_at', created_at) order by created_at desc, email)
        from (select * from base order by created_at desc, email
               limit least(greatest(coalesce(p_limit, 50), 1), 200) offset least(greatest(coalesce(p_offset, 0), 0), 100000)) x), '[]'::jsonb)));
end $$;

-- ── Admin: overview ─────────────────────────────────────────────────────────────────────────────────────
create or replace function private.email_campaign_stats(p_campaign uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'recipients', count(*),
    'queued', count(*) filter (where s.status in ('queued', 'sending')),
    'sent', count(*) filter (where s.status in ('sent', 'bounced', 'complained')),
    'delivered', count(*) filter (where s.delivered_at is not null),
    'bounced', count(*) filter (where s.status = 'bounced'),
    'complained', count(*) filter (where s.status = 'complained'),
    'failed', count(*) filter (where s.status = 'failed'),
    'skipped', count(*) filter (where s.status = 'skipped'),
    'opened', count(*) filter (where s.opened_at is not null),
    'clicked', count(*) filter (where s.clicked_at is not null),
    'unsubscribed', count(*) filter (where s.unsubscribed_at is not null),
    'signed_up', count(*) filter (where exists (
        select 1 from auth.users u where lower(u.email) = s.email and u.created_at >= s.sent_at)),
    'applied', count(*) filter (where exists (
        select 1 from private.beta_testers b join auth.users u on u.id = b.user_id
         where lower(u.email) = s.email and b.source = 'applied' and b.created_at >= s.sent_at)))
  from private.email_sends s where s.campaign_id = p_campaign;
$$;
revoke all on function private.email_campaign_stats(uuid) from public, anon, authenticated;

create or replace function public.admin_email_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'contacts', (select count(*) from private.email_contacts),
    'sendable', (select count(*) from private.email_contacts c where not exists (select 1 from private.email_suppressions x where x.email = c.email)),
    'suppressed', (select jsonb_object_agg(reason, n) from (select reason, count(*) as n from private.email_suppressions group by reason) x),
    'tags', coalesce((select jsonb_agg(jsonb_build_object('tag', t, 'contacts', n) order by n desc, t)
                        from (select t, count(*) as n from private.email_contacts, unnest(tags) t group by t) x), '[]'::jsonb),
    'imports', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'source', source, 'consent_note', consent_note, 'file_name', file_name,
                          'tags', tags, 'counts', counts, 'created_at', created_at) order by created_at desc)
                        from (select * from private.email_imports order by created_at desc limit 10) x), '[]'::jsonb),
    'today', jsonb_build_object('sent', private.email_sent_today(), 'cap', private.email_daily_cap()),
    'campaigns', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'slug', slug, 'name', name, 'subject', subject, 'status', status,
                          'paused_reason', paused_reason, 'created_at', created_at, 'started_at', started_at, 'finished_at', finished_at,
                          'stats', private.email_campaign_stats(id)) order by created_at desc)
                        from private.email_campaigns), '[]'::jsonb));
end $$;

-- ── Admin: campaigns ────────────────────────────────────────────────────────────────────────────────────
-- Create (p_id null) or change a draft. Returns the id, or raises 'not a draft' / 'slug taken'.
create or replace function public.admin_email_campaign_save(p_id uuid, p_name text, p_slug text, p_subject text, p_preview text,
                                                            p_body text, p_from_name text, p_tags text[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_name text := left(btrim(coalesce(p_name, '')), 120);
begin
  perform private.require_admin();
  if v_name = '' then raise exception 'name required' using errcode = '22023'; end if;
  if v_slug !~ '^[a-z0-9][a-z0-9-]{0,29}$' then raise exception 'bad slug' using errcode = '22023'; end if;
  if exists (select 1 from private.email_campaigns where slug = v_slug and id is distinct from p_id) then
    raise exception 'slug taken' using errcode = '23505';
  end if;
  if p_id is null then
    insert into private.email_campaigns (slug, name, subject, preview, body, from_name, tags, created_by)
    values (v_slug, v_name, left(btrim(coalesce(p_subject, '')), 150), left(btrim(coalesce(p_preview, '')), 150),
            left(coalesce(p_body, ''), 20000), coalesce(nullif(left(btrim(coalesce(p_from_name, '')), 60), ''), 'Krpex'),
            private.email_tags(p_tags), auth.uid())
    returning id into v_id;
  else
    update private.email_campaigns
       set slug = v_slug, name = v_name, subject = left(btrim(coalesce(p_subject, '')), 150), preview = left(btrim(coalesce(p_preview, '')), 150),
           body = left(coalesce(p_body, ''), 20000), from_name = coalesce(nullif(left(btrim(coalesce(p_from_name, '')), 60), ''), 'Krpex'),
           tags = private.email_tags(p_tags), updated_at = now()
     where id = p_id and status = 'draft'
    returning id into v_id;
    if v_id is null then raise exception 'not a draft' using errcode = '22023'; end if;
  end if;
  return v_id;
end $$;

-- One campaign with its results. p_filter: all | queued | sent | opened | not_opened | clicked | bounced |
-- complained | unsubscribed | failed | signed_up | applied.
create or replace function public.admin_email_campaign(p_id uuid, p_filter text default 'all', p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  m private.email_campaigns;
  v_filter text := coalesce(p_filter, 'all');
begin
  perform private.require_admin();
  select * into m from private.email_campaigns where id = p_id;
  if not found then return null; end if;
  return (with base as (
      select s.*, c.name,
             exists (select 1 from auth.users u where lower(u.email) = s.email and u.created_at >= s.sent_at) as signed_up,
             exists (select 1 from private.beta_testers b join auth.users u on u.id = b.user_id
                      where lower(u.email) = s.email and b.source = 'applied' and b.created_at >= s.sent_at) as applied
        from private.email_sends s left join private.email_contacts c on c.id = s.contact_id
       where s.campaign_id = p_id
    ), picked as (
      select * from base where case v_filter
        when 'queued' then status in ('queued', 'sending')
        when 'sent' then status in ('sent', 'bounced', 'complained')
        when 'opened' then opened_at is not null
        when 'not_opened' then status = 'sent' and opened_at is null
        when 'clicked' then clicked_at is not null
        when 'bounced' then status = 'bounced'
        when 'complained' then status = 'complained'
        when 'unsubscribed' then unsubscribed_at is not null
        when 'failed' then status in ('failed', 'skipped')
        when 'signed_up' then signed_up
        when 'applied' then applied
        else true end
    )
    select jsonb_build_object(
      'campaign', jsonb_build_object('id', m.id, 'slug', m.slug, 'name', m.name, 'subject', m.subject, 'preview', m.preview, 'body', m.body,
                    'from_name', m.from_name, 'tags', m.tags, 'status', m.status, 'paused_reason', m.paused_reason,
                    'created_at', m.created_at, 'started_at', m.started_at, 'finished_at', m.finished_at),
      'audience', case when m.status = 'draft' then (
          select count(*) from private.email_contacts c
           where (m.tags = '{}' or c.tags && m.tags)
             and not exists (select 1 from private.email_suppressions x where x.email = c.email)) end,
      'stats', private.email_campaign_stats(p_id),
      'health', private.email_health(p_id),
      'today', jsonb_build_object('sent', private.email_sent_today(), 'cap', private.email_daily_cap()),
      'total', (select count(*) from picked),
      'rows', coalesce((select jsonb_agg(jsonb_build_object('email', email, 'name', name, 'status', status, 'sent_at', sent_at,
                  'delivered_at', delivered_at, 'opened_at', opened_at, 'opens', opens, 'clicked_at', clicked_at, 'clicks', clicks,
                  'unsubscribed_at', unsubscribed_at, 'error', error, 'signed_up', signed_up, 'applied', applied) order by id)
        from (select * from picked order by id
               limit least(greatest(coalesce(p_limit, 50), 1), 200) offset least(greatest(coalesce(p_offset, 0), 0), 100000)) x), '[]'::jsonb)));
end $$;

-- start: queue everyone in the audience who isn't on the do-not-send list; pause / resume / stop.
-- Returns 'ok', 'empty' (nobody to send to), 'incomplete' (no subject or body) or 'bad_state'.
create or replace function public.admin_email_campaign_set(p_id uuid, p_action text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  m private.email_campaigns;
  n int;
begin
  perform private.require_admin();
  select * into m from private.email_campaigns where id = p_id for update;
  if not found then return 'bad_state'; end if;
  if p_action = 'start' then
    if m.status <> 'draft' then return 'bad_state'; end if;
    if btrim(m.subject) = '' or btrim(m.body) = '' then return 'incomplete'; end if;
    insert into private.email_sends (campaign_id, contact_id, email)
    select m.id, c.id, c.email from private.email_contacts c
     where (m.tags = '{}' or c.tags && m.tags)
       and not exists (select 1 from private.email_suppressions x where x.email = c.email)
    on conflict (campaign_id, email) do nothing;
    get diagnostics n = row_count;
    if n = 0 then return 'empty'; end if;
    update private.email_campaigns set status = 'sending', started_at = now(), checked_from = now(), updated_at = now() where id = p_id;
  elsif p_action = 'pause' then
    if m.status <> 'sending' then return 'bad_state'; end if;
    update private.email_campaigns set status = 'paused', paused_reason = 'Paused by an admin.', updated_at = now() where id = p_id;
  elsif p_action = 'resume' then
    if m.status <> 'paused' then return 'bad_state'; end if;
    update private.email_campaigns set status = 'sending', paused_reason = null, checked_from = now(), updated_at = now() where id = p_id;
  elsif p_action = 'stop' then
    if m.status not in ('sending', 'paused') then return 'bad_state'; end if;
    update private.email_sends set status = 'skipped', error = 'Campaign stopped' where campaign_id = p_id and status = 'queued';
    update private.email_campaigns set status = 'done', finished_at = now(), updated_at = now() where id = p_id;
  else
    raise exception 'bad action' using errcode = '22023';
  end if;
  insert into private.admin_log (admin, action, detail)
  values (auth.uid(), 'email:' || p_action, jsonb_build_object('campaign', m.slug) || case when p_action = 'start' then jsonb_build_object('recipients', n) else '{}' end);
  return 'ok';
end $$;

-- ── Server: sending ─────────────────────────────────────────────────────────────────────────────────────
-- Up to p_limit emails to send now, within today's cap, from campaigns that are sending. Each is marked
-- 'sending' (taken again after 15 minutes if the server never reported back). Unhealthy campaigns pause first;
-- finished campaigns are closed; anyone on the do-not-send list is skipped.
create or replace function public.app_email_claim(p_key text, p_limit int default 20)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  m record;
  v_room int;
  v_out jsonb := '[]';
begin
  perform private.require_server_key(p_key);
  for m in select id from private.email_campaigns where status = 'sending' loop
    perform private.email_check_health(m.id);
    if not exists (select 1 from private.email_sends where campaign_id = m.id and status in ('queued', 'sending')) then
      update private.email_campaigns set status = 'done', finished_at = now(), updated_at = now() where id = m.id and status = 'sending';
    end if;
  end loop;
  update private.email_sends s set status = 'skipped', error = 'On the do-not-send list'
   where s.status = 'queued' and exists (select 1 from private.email_suppressions x where x.email = s.email);
  v_room := least(greatest(coalesce(p_limit, 20), 0), 100,
                  greatest(private.email_daily_cap() - private.email_sent_today()
                           - (select count(*)::int from private.email_sends where status = 'sending' and claimed_at > now() - interval '15 minutes'), 0));
  if v_room = 0 then return v_out; end if;
  with picked as (
    select s.id from private.email_sends s join private.email_campaigns c on c.id = s.campaign_id
     where c.status = 'sending'
       and (s.status = 'queued' or (s.status = 'sending' and s.claimed_at < now() - interval '15 minutes'))
     order by s.id limit v_room for update of s skip locked
  ), claimed as (
    update private.email_sends s set status = 'sending', claimed_at = now(), attempts = s.attempts + 1
      from picked where s.id = picked.id
    returning s.*
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', k.id, 'token', k.token, 'email', k.email, 'name', ct.name,
           'campaign', jsonb_build_object('id', c.id, 'slug', c.slug, 'subject', c.subject, 'preview', c.preview, 'body', c.body, 'from_name', c.from_name))
           order by k.id), '[]')
    into v_out
    from claimed k join private.email_campaigns c on c.id = k.campaign_id left join private.email_contacts ct on ct.id = k.contact_id;
  return v_out;
end $$;

-- The result of sending one: SES's message id, or an error (tried again later, up to 3 times).
create or replace function public.app_email_sent(p_key text, p_id bigint, p_message_id text, p_error text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_server_key(p_key);
  if p_error is null then
    update private.email_sends set status = 'sent', sent_at = now(), message_id = left(p_message_id, 200), error = null
     where id = p_id and status = 'sending';
  else
    update private.email_sends
       set status = case when attempts >= 3 then 'failed' else 'queued' end, error = left(p_error, 300)
     where id = p_id and status = 'sending';
  end if;
end $$;

-- An SES event for a message: 'delivery', 'bounce' (permanent ones only; others are ignored) or 'complaint'.
-- Bounces and complaints go on the do-not-send list. Returns true when the message was ours.
create or replace function public.app_email_event(p_key text, p_message_id text, p_type text, p_email text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare s private.email_sends;
begin
  perform private.require_server_key(p_key);
  select * into s from private.email_sends
   where message_id = p_message_id and (p_email is null or email = lower(btrim(p_email))) order by id limit 1;
  if not found then return false; end if;
  if p_type = 'delivery' then
    update private.email_sends set delivered_at = coalesce(delivered_at, now()) where id = s.id;
  elsif p_type in ('bounce', 'complaint') then
    update private.email_sends set status = case when p_type = 'bounce' then 'bounced' else 'complained' end where id = s.id;
    insert into private.email_suppressions (email, reason, campaign_id)
    values (s.email, case when p_type = 'bounce' then 'bounced' else 'complained' end, s.campaign_id)
    on conflict (email) do update set reason = case when excluded.reason = 'complained' then 'complained' else private.email_suppressions.reason end;
    perform private.email_check_health(s.campaign_id);
  else
    raise exception 'bad type' using errcode = '22023';
  end if;
  return true;
end $$;

-- An open (the image in the email) or a click (a link through krpex.in). A click also counts as an open.
create or replace function public.app_email_track(p_key text, p_token text, p_kind text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_server_key(p_key);
  if p_kind = 'open' then
    update private.email_sends set opened_at = coalesce(opened_at, now()), opens = least(opens + 1, 100000) where token = p_token;
  elsif p_kind = 'click' then
    update private.email_sends set clicked_at = coalesce(clicked_at, now()), clicks = least(clicks + 1, 100000),
           opened_at = coalesce(opened_at, now()) where token = p_token;
  else
    raise exception 'bad kind' using errcode = '22023';
  end if;
  return found;
end $$;

-- Unsubscribe from the link or the mail app's button: 'ok' or 'unknown'.
create or replace function public.app_email_unsubscribe(p_key text, p_token text)
returns text language plpgsql security definer set search_path = '' as $$
declare s private.email_sends;
begin
  perform private.require_server_key(p_key);
  select * into s from private.email_sends where token = p_token;
  if not found then return 'unknown'; end if;
  update private.email_sends set unsubscribed_at = coalesce(unsubscribed_at, now()) where id = s.id;
  insert into private.email_suppressions (email, reason, campaign_id) values (s.email, 'unsubscribed', s.campaign_id)
  on conflict (email) do nothing;
  return 'ok';
end $$;

-- ── Notifications ───────────────────────────────────────────────────────────────────────────────────────
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'inbox_question', 'professor_reply', 'professor_confirmed',
  'professor_approved', 'professor_suspended', 'professor_live', 'professor_hidden', 'review_new',
  'payment_paid', 'payment_failed', 'credits_granted', 'pro_granted', 'report_resolved',
  'admin_professor_joined', 'admin_listing_requested', 'admin_report',
  'reminder_streak', 'reminder_continue', 'reminder_freeze_used', 'level_reward',
  'community_reply', 'community_upvotes', 'community_removed', 'admin_community_report',
  'beta_approved', 'beta_declined', 'admin_beta_application',
  'admin_feedback', 'feedback_reply', 'feedback_fixed',
  'admin_email_paused'
));

-- ── Grants ──────────────────────────────────────────────────────────────────────────────────────────────
do $$
declare f text;
begin
  foreach f in array array['public.admin_email_import(text, text, text, text[], jsonb, jsonb)', 'public.admin_email_contacts(text, text, int, int)',
                           'public.admin_email_overview()', 'public.admin_email_campaign_save(uuid, text, text, text, text, text, text, text[])',
                           'public.admin_email_campaign(uuid, text, int, int)', 'public.admin_email_campaign_set(uuid, text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  foreach f in array array['public.app_email_claim(text, int)', 'public.app_email_sent(text, bigint, text, text)',
                           'public.app_email_event(text, text, text, text)', 'public.app_email_track(text, text, text)',
                           'public.app_email_unsubscribe(text, text)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
