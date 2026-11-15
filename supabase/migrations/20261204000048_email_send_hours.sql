-- Email campaigns: send during the day, spread out, instead of all just after midnight.
--   · admin_settings.email_send_from / email_send_to: sending hours in IST (default 10:00–19:00; both null = any time)
--   · private.email_allowed_now(at): how many of today's cap may have gone out by then: none before the start,
--     then rising evenly to the full cap at the end (with a first batch of 10 straight away)
--   · app_email_claim uses it. Applies to campaigns already sending.

alter table private.admin_settings add column if not exists email_send_from int default 10 check (email_send_from between 0 and 23);
alter table private.admin_settings add column if not exists email_send_to int default 19 check (email_send_to between 1 and 24);

create or replace function private.email_allowed_now(p_at timestamptz) returns int
language plpgsql stable security definer set search_path = '' as $$
declare
  s private.admin_settings;
  v_cap int := private.email_daily_cap();
  v_local timestamp := p_at at time zone 'Asia/Kolkata';
  v_hour numeric := extract(hour from v_local) + extract(minute from v_local) / 60.0;
begin
  select * into s from private.admin_settings where id;
  if s.email_send_from is null or s.email_send_to is null or s.email_send_to <= s.email_send_from then return v_cap; end if;
  if v_hour < s.email_send_from or v_hour >= s.email_send_to then return 0; end if;
  return least(v_cap, ceil(v_cap * (v_hour - s.email_send_from) / (s.email_send_to - s.email_send_from))::int + 10);
end $$;
revoke all on function private.email_allowed_now(timestamptz) from public, anon, authenticated;

-- Up to p_limit emails to send now, within today's cap and the sending hours (spread through the day), from campaigns that are sending. Each is marked
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
                  greatest(private.email_allowed_now(now()) - private.email_sent_today()
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

