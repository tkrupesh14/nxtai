-- Closed beta: a WhatsApp number on each application, so testers can be added to the testers' group and reached quickly.
--   · private.beta_testers.whatsapp (stored as +<country code><number>)
--   · private.whatsapp_number(text): tidies a typed number; 10-digit Indian mobiles get +91
--   · beta_apply takes p_whatsapp (optional here so older app versions keep working; the form asks for it);
--     changing a waiting application without a number keeps the one saved
--   · beta_my_status and admin_beta_list return it; admins can search by it

alter table private.beta_testers add column if not exists whatsapp text;
alter table private.beta_testers drop constraint if exists beta_testers_whatsapp_check;
alter table private.beta_testers add constraint beta_testers_whatsapp_check check (whatsapp ~ '^\+[1-9][0-9]{7,14}$');

-- '98765 43210', '+91 98765-43210', '09876543210' and '919876543210' all become '+919876543210'.
-- Other countries need the + and country code. Returns null for anything that isn't a phone number.
create or replace function private.whatsapp_number(p text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  t text := regexp_replace(btrim(coalesce(p, '')), '[\s().-]', '', 'g');
begin
  if t ~ '^[6-9][0-9]{9}$' then return '+91' || t; end if;
  if t ~ '^0[6-9][0-9]{9}$' then return '+91' || substr(t, 2); end if;
  if t ~ '^91[6-9][0-9]{9}$' then return '+' || t; end if;
  if t ~ '^\+[1-9][0-9]{7,14}$' then return t; end if;
  return null;
end $$;
revoke all on function private.whatsapp_number(text) from public, anon, authenticated;

drop function if exists public.beta_apply(text, text, text, text, text, boolean, text);

-- Returns 'ok' (saved; a waiting application can be changed), 'approved' (already in), 'declined' or 'open'
-- (the beta has ended: everyone is in). Consent to activity tracking and session recording is required.
-- p_ref is ignored unless it looks like a link name; p_whatsapp, when given, must be a phone number.
create or replace function public.beta_apply(p_name text, p_role text, p_goal text, p_device text, p_heard_from text, p_consent boolean,
                                             p_ref text default null, p_whatsapp text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  b private.beta_testers;
  v_new boolean;
  v_name text := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 80);
  v_goal text := nullif(left(btrim(coalesce(p_goal, '')), 500), '');
  v_heard text := nullif(left(btrim(coalesce(p_heard_from, '')), 200), '');
  v_wa text := private.whatsapp_number(p_whatsapp);
  v_ref text := case when lower(btrim(coalesce(p_ref, ''))) ~ '^[a-z0-9][a-z0-9-]{0,39}$' then lower(btrim(p_ref)) end;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if v_name = '' then raise exception 'name required' using errcode = '22023'; end if;
  if p_role is null or p_role not in ('school', 'college', 'working', 'teacher', 'other') then raise exception 'bad role' using errcode = '22023'; end if;
  if p_device is null or p_device not in ('android', 'iphone', 'computer', 'tablet') then raise exception 'bad device' using errcode = '22023'; end if;
  if v_goal is null then raise exception 'goal required' using errcode = '22023'; end if;
  if nullif(btrim(coalesce(p_whatsapp, '')), '') is not null and v_wa is null then raise exception 'bad whatsapp' using errcode = '22023'; end if;
  if not coalesce(p_consent, false) then raise exception 'consent required' using errcode = '22023'; end if;
  select * into b from private.beta_testers where user_id = uid for update;
  v_new := not found;
  if found and b.status = 'approved' then return 'approved'; end if;
  if found and b.status = 'declined' then return 'declined'; end if;
  if not private.beta_closed() then return 'open'; end if;
  insert into private.beta_testers (user_id, name, role, goal, device, heard_from, consent_at, ref, whatsapp)
  values (uid, v_name, p_role, v_goal, p_device, v_heard, now(), v_ref, v_wa)
  on conflict (user_id) do update
    set name = excluded.name, role = excluded.role, goal = excluded.goal, device = excluded.device,
        heard_from = excluded.heard_from, consent_at = now(), updated_at = now(),
        ref = coalesce(private.beta_testers.ref, excluded.ref),
        whatsapp = coalesce(excluded.whatsapp, private.beta_testers.whatsapp);
  if v_new then
    perform private.notify_admins('admin_beta_application', 'New beta application: ' || v_name,
                                  left(v_goal, 200), '/admin/beta', null);
  end if;
  return 'ok';
end $$;

create or replace function public.beta_my_status()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); b private.beta_testers;
begin
  select * into b from private.beta_testers where user_id = uid;
  return jsonb_build_object(
    'closed', private.beta_closed(),
    'signed_in', uid is not null,
    'access', private.has_beta_access(uid),
    'beta_tester', found and b.source = 'applied' and b.status = 'approved',
    'application', case when found and b.source = 'applied' then jsonb_build_object(
      'status', b.status, 'name', b.name, 'role', b.role, 'goal', b.goal, 'device', b.device, 'heard_from', b.heard_from,
      'whatsapp', b.whatsapp, 'created_at', b.created_at, 'decided_at', b.decided_at) end);
end $$;

-- p_status: waiting | approved | declined | existing (accounts from before the beta) | all.
-- 'sources': for each link (null = no link), applications, how many are waiting and approved, and approved
-- testers active in the last 7 days (any page view).
create or replace function public.admin_beta_list(p_status text default 'waiting', p_search text default '', p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  s text := '%' || replace(replace(replace(lower(btrim(coalesce(p_search, ''))), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  v_status text := case when p_status in ('waiting', 'approved', 'declined', 'existing', 'all') then p_status else 'waiting' end;
begin
  perform private.require_admin();
  return (with base as (
      select b.*, u.email::text as email, u.last_sign_in_at, a.email::text as decided_by_email, public.current_plan(b.user_id) as plan
        from private.beta_testers b
        join auth.users u on u.id = b.user_id
        left join auth.users a on a.id = b.decided_by
       where (v_status = 'all' or (v_status = 'existing' and b.source = 'existing') or (b.source = 'applied' and b.status = v_status))
         and (s = '%%' or lower(coalesce(u.email, '')) like s or lower(coalesce(b.name, '')) like s or lower(coalesce(b.goal, '')) like s
              or coalesce(b.ref, '') like s or coalesce(b.whatsapp, '') like s)
    )
    select jsonb_build_object(
      'closed', private.beta_closed(),
      'counts', (select jsonb_build_object(
          'waiting', count(*) filter (where source = 'applied' and status = 'waiting'),
          'approved', count(*) filter (where source = 'applied' and status = 'approved'),
          'declined', count(*) filter (where source = 'applied' and status = 'declined'),
          'existing', count(*) filter (where source = 'existing')) from private.beta_testers),
      'sources', coalesce((select jsonb_agg(jsonb_build_object(
          'ref', ref, 'applied', applied, 'waiting', waiting, 'approved', approved, 'active_7d', active_7d) order by applied desc, ref nulls last)
        from (select b.ref, count(*) as applied,
                     count(*) filter (where b.status = 'waiting') as waiting,
                     count(*) filter (where b.status = 'approved') as approved,
                     count(*) filter (where b.status = 'approved' and exists (
                       select 1 from private.page_views v where v.user_id = b.user_id and v.started_at > now() - interval '7 days')) as active_7d
                from private.beta_testers b where b.source = 'applied' group by b.ref) x), '[]'::jsonb),
      'total', (select count(*) from base),
      'rows', coalesce((select jsonb_agg(jsonb_build_object(
          'user_id', user_id, 'email', email, 'source', source, 'status', status, 'name', name, 'role', role, 'goal', goal,
          'device', device, 'heard_from', heard_from, 'ref', ref, 'whatsapp', whatsapp, 'consent_at', consent_at, 'note', note, 'pro_days', pro_days,
          'created_at', created_at, 'decided_at', decided_at, 'decided_by', decided_by_email,
          'last_sign_in_at', last_sign_in_at, 'plan', plan) order by created_at desc)
        from (select * from base order by created_at desc
               limit least(greatest(coalesce(p_limit, 50), 1), 100) offset least(greatest(coalesce(p_offset, 0), 0), 100000)) x), '[]'::jsonb)));
end $$;

revoke all on function public.beta_apply(text, text, text, text, text, boolean, text, text) from public, anon;
grant execute on function public.beta_apply(text, text, text, text, text, boolean, text, text) to authenticated;
