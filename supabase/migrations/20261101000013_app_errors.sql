-- Error tracking: server and browser errors are recorded here (server-key insert) and shown on /admin.
create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  source text not null check (source in ('server', 'client')),
  message text not null check (char_length(message) <= 1000),
  path text check (char_length(path) <= 300),
  detail text check (char_length(detail) <= 4000),
  created_at timestamptz not null default now()
);
create index if not exists app_errors_time_idx on public.app_errors (created_at desc);
alter table public.app_errors enable row level security;
revoke all on public.app_errors from anon, authenticated;

create or replace function public.app_log_error(p_key text, p_source text, p_message text, p_path text, p_detail text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_server_key(p_key);
  -- Keep the table small: at most 2000 rows per hour.
  if (select count(*) from public.app_errors where created_at > now() - interval '1 hour') >= 2000 then return; end if;
  insert into public.app_errors (source, message, path, detail)
  values (case when p_source = 'client' then 'client' else 'server' end,
          left(coalesce(nullif(p_message, ''), 'unknown error'), 1000), left(p_path, 300), left(p_detail, 4000));
  delete from public.app_errors where created_at < now() - interval '30 days';
end $$;
revoke all on function public.app_log_error(text, text, text, text, text) from public;
grant execute on function public.app_log_error(text, text, text, text, text) to anon, authenticated;

-- Errors in the last p_hours, grouped by source + message.
create or replace function public.admin_errors(p_hours int default 24)
returns table (source text, message text, count bigint, last_seen timestamptz, last_path text, last_detail text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
  select e.source, e.message, count(*), max(e.created_at),
         (array_agg(e.path order by e.created_at desc))[1],
         (array_agg(e.detail order by e.created_at desc))[1]
    from public.app_errors e
   where e.created_at > now() - make_interval(hours => least(greatest(p_hours, 1), 720))
   group by e.source, e.message
   order by max(e.created_at) desc
   limit 50;
end $$;
revoke all on function public.admin_errors(int) from public, anon;
grant execute on function public.admin_errors(int) to authenticated;
