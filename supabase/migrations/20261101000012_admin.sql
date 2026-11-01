-- Admin: AI usage log, admin list, and read-only admin functions (plus grant / resolve actions).
-- Admins are stored by user id (not email), so changing an email can't grant access.

-- Every AI call (course plans, goal checks, lessons) is logged here; professor chat tokens live in professor_questions.
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  kind text not null check (char_length(kind) <= 40),
  tokens_in int not null default 0 check (tokens_in >= 0),
  tokens_out int not null default 0 check (tokens_out >= 0),
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_time_idx on public.ai_usage (created_at);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

create or replace function public.app_log_ai_usage(p_key text, p_kind text, p_in int, p_out int)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_server_key(p_key);
  insert into public.ai_usage (kind, tokens_in, tokens_out)
  values (left(p_kind, 40), least(greatest(coalesce(p_in, 0), 0), 2000000), least(greatest(coalesce(p_out, 0), 0), 2000000));
end $$;
revoke all on function public.app_log_ai_usage(text, text, int, int) from public;
grant execute on function public.app_log_ai_usage(text, text, int, int) to anon, authenticated;

create table if not exists private.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
insert into private.admins (user_id)
select id from auth.users where lower(email) = 'harshitkrupesh@gmail.com'
on conflict do nothing;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.admins a where a.user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function private.require_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.admins a where a.user_id = auth.uid()) then
    raise exception 'admin only' using errcode = '42501';
  end if;
end $$;

-- Headline numbers. AI cost uses GPT-6 Luna prices ($0.10 / $0.50 per 1M tokens).
create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare d timestamptz := public.ist_day_start(); r jsonb;
begin
  perform private.require_admin();
  select jsonb_build_object(
    'users_total', (select count(*) from auth.users),
    'users_today', (select count(*) from auth.users where created_at >= d),
    'users_7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'active_7d', (select count(*) from auth.users where last_sign_in_at >= now() - interval '7 days'),
    'courses_total', (select count(*) from public.courses),
    'courses_today', (select count(*) from public.courses where created_at >= d),
    'lessons_written_today', (select count(*) from public.lessons where blocks is not null and generated_at >= d),
    'questions_today', (select count(*) from public.professor_questions where created_at >= d and status = 'answered'),
    'ai_usd_today', round((
        coalesce((select sum(tokens_in) * 0.10 + sum(tokens_out) * 0.50 from public.ai_usage where created_at >= d), 0)
      + coalesce((select sum(tokens_in) * 0.10 + sum(tokens_out) * 0.50 from public.professor_questions where created_at >= d), 0)
      ) / 1e6, 4),
    'ai_usd_30d', round((
        coalesce((select sum(tokens_in) * 0.10 + sum(tokens_out) * 0.50 from public.ai_usage where created_at >= now() - interval '30 days'), 0)
      + coalesce((select sum(tokens_in) * 0.10 + sum(tokens_out) * 0.50 from public.professor_questions where created_at >= now() - interval '30 days'), 0)
      ) / 1e6, 4),
    'revenue_paise_30d', (select coalesce(sum(amount_paise), 0) from public.payment_orders where status = 'paid' and paid_at >= now() - interval '30 days'),
    'revenue_paise_total', (select coalesce(sum(amount_paise), 0) from public.payment_orders where status = 'paid'),
    'paid_orders_total', (select count(*) from public.payment_orders where status = 'paid'),
    'pro_active', (select count(*) from public.user_plans where plan = 'pro' and status = 'active' and (current_period_end is null or current_period_end > now())),
    'credits_outstanding', (select coalesce(sum(delta), 0) from public.credit_ledger),
    'reports_open', (select count(*) from public.lesson_reports where status = 'open')
  ) into r;
  return r;
end $$;

-- One row per day (India time) for the last p_days days.
create or replace function public.admin_daily(p_days int default 14)
returns table (day date, signups int, courses int, lessons int, questions int, ai_usd numeric, revenue_paise bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
  with days as (
    select (generate_series((now() at time zone 'Asia/Kolkata')::date - (least(greatest(p_days, 1), 90) - 1),
                            (now() at time zone 'Asia/Kolkata')::date, interval '1 day'))::date as dday
  )
  select dd.dday,
    (select count(*)::int from auth.users u where (u.created_at at time zone 'Asia/Kolkata')::date = dd.dday),
    (select count(*)::int from public.courses c where (c.created_at at time zone 'Asia/Kolkata')::date = dd.dday),
    (select count(*)::int from public.lessons l where l.blocks is not null and (l.generated_at at time zone 'Asia/Kolkata')::date = dd.dday),
    (select count(*)::int from public.professor_questions q where q.status = 'answered' and (q.created_at at time zone 'Asia/Kolkata')::date = dd.dday),
    round((coalesce((select sum(a.tokens_in) * 0.10 + sum(a.tokens_out) * 0.50 from public.ai_usage a where (a.created_at at time zone 'Asia/Kolkata')::date = dd.dday), 0)
         + coalesce((select sum(q.tokens_in) * 0.10 + sum(q.tokens_out) * 0.50 from public.professor_questions q where (q.created_at at time zone 'Asia/Kolkata')::date = dd.dday), 0)) / 1e6, 4),
    (select coalesce(sum(o.amount_paise), 0)::bigint from public.payment_orders o where o.status = 'paid' and (o.paid_at at time zone 'Asia/Kolkata')::date = dd.dday)
  from days dd order by dd.dday desc;
end $$;

-- Users, newest first, optionally filtered by email / name.
create or replace function public.admin_users(p_search text default '', p_limit int default 50)
returns table (id uuid, email text, full_name text, created_at timestamptz, last_sign_in_at timestamptz,
               plan text, credits int, courses int, questions_7d int)
language plpgsql stable security definer set search_path = '' as $$
declare s text := '%' || lower(trim(coalesce(p_search, ''))) || '%';
begin
  perform private.require_admin();
  return query
  select u.id, u.email::text, p.full_name, u.created_at, u.last_sign_in_at,
         public.current_plan(u.id), public.credit_balance(u.id),
         (select count(*)::int from public.courses c where c.user_id = u.id),
         (select count(*)::int from public.professor_questions q where q.user_id = u.id and q.created_at >= now() - interval '7 days')
    from auth.users u left join public.users p on p.id = u.id
   where lower(coalesce(u.email, '')) like s or lower(coalesce(p.full_name, '')) like s
   order by u.created_at desc
   limit least(greatest(p_limit, 1), 200);
end $$;

create or replace function public.admin_payments(p_limit int default 20)
returns table (created_at timestamptz, paid_at timestamptz, email text, product text, amount_paise int, status text,
               razorpay_order_id text, razorpay_payment_id text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
  select o.created_at, o.paid_at, u.email::text, o.product, o.amount_paise, o.status, o.razorpay_order_id, o.razorpay_payment_id
    from public.payment_orders o join auth.users u on u.id = o.user_id
   order by o.created_at desc limit least(greatest(p_limit, 1), 200);
end $$;

create or replace function public.admin_reports(p_status text default 'open')
returns table (id uuid, created_at timestamptz, email text, course_id uuid, course_title text, lesson_id uuid,
               lesson_title text, reason text, details text, status text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
  select r.id, r.created_at, u.email::text, l.course_id, c.title, r.lesson_id, l.title, r.reason, r.details, r.status
    from public.lesson_reports r
    join auth.users u on u.id = r.user_id
    join public.lessons l on l.id = r.lesson_id
    join public.courses c on c.id = l.course_id
   where p_status = 'all' or r.status = p_status
   order by r.created_at desc limit 100;
end $$;

create or replace function public.admin_resolve_report(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  update public.lesson_reports set status = 'resolved' where id = p_id;
end $$;

-- Give credits and/or Pro days to a user by email. Returns: ok | not_found | nothing
create or replace function public.admin_grant(p_email text, p_credits int, p_pro_days int, p_note text)
returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  perform private.require_admin();
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then return 'not_found'; end if;
  if coalesce(p_credits, 0) = 0 and coalesce(p_pro_days, 0) <= 0 then return 'nothing'; end if;
  if coalesce(p_credits, 0) <> 0 then
    insert into public.credit_ledger (user_id, delta, reason, note)
    values (uid, least(greatest(p_credits, -100000), 100000), case when p_credits > 0 then 'grant' else 'adjust' end,
            left(coalesce(nullif(trim(p_note), ''), 'admin'), 200));
  end if;
  if coalesce(p_pro_days, 0) > 0 then
    insert into public.user_plans (user_id, plan, status, current_period_end, updated_at)
    values (uid, 'pro', 'active', now() + make_interval(days => least(p_pro_days, 3650)), now())
    on conflict (user_id) do update
      set plan = 'pro', status = 'active', updated_at = now(),
          current_period_end = greatest(coalesce(public.user_plans.current_period_end, now()), now())
                               + make_interval(days => least(p_pro_days, 3650));
  end if;
  return 'ok';
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.admin_overview()', 'public.admin_daily(int)', 'public.admin_users(text, int)',
    'public.admin_payments(int)', 'public.admin_reports(text)', 'public.admin_resolve_report(uuid)',
    'public.admin_grant(text, int, int, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
