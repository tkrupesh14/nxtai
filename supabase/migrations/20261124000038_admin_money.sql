-- Admin panel 6.4 (plan.md Phase 6): money and AI, all in rupees.
--   · ai_usage now records who the call was for (auth.uid() of the signed-in request, when there is one) and the model.
--     Older rows have no learner, so per-learner totals cover professor questions and the coding coach in full, and
--     everything else from this migration on.
--   · AI providers bill in US dollars. Token prices per model live in private.ai_prices (dollars per 1M tokens; a
--     model not listed is priced as GPT-6 Luna) and are turned into rupees at one rate an admin sets on the Money
--     page (private.admin_settings, logged). Every admin figure is shown in rupees.
--   · admin_money(p_days): revenue, AI cost by day, feature and model, the costliest learners and credits, for 7/30/90 days.
--   · admin_payment_list(p_status, …): every payment, paged, by status.
--   · admin_user_ai(p_user): one learner's AI cost by feature.
--   · admin_overview / admin_daily: AI cost in rupees, now including the coding coach.
-- Run after 037. Safe to run twice.

-- ---------- what an AI call was for ----------

alter table public.ai_usage add column if not exists user_id uuid references auth.users (id) on delete set null;
alter table public.ai_usage add column if not exists model text check (char_length(model) <= 80);
create index if not exists ai_usage_user_idx on public.ai_usage (user_id, created_at desc) where user_id is not null;

-- As in migration 012, plus the model and the signed-in learner (from the request's JWT, so it can't be made up).
drop function if exists public.app_log_ai_usage(text, text, int, int);
create or replace function public.app_log_ai_usage(p_key text, p_kind text, p_in int, p_out int, p_model text default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_server_key(p_key);
  insert into public.ai_usage (kind, tokens_in, tokens_out, model, user_id)
  values (left(p_kind, 40), least(greatest(coalesce(p_in, 0), 0), 2000000), least(greatest(coalesce(p_out, 0), 0), 2000000),
          left(nullif(btrim(coalesce(p_model, '')), ''), 80), auth.uid());
end $$;
revoke all on function public.app_log_ai_usage(text, text, int, int, text) from public;
grant execute on function public.app_log_ai_usage(text, text, int, int, text) to anon, authenticated;

-- ---------- prices and the dollar rate ----------

create table if not exists private.ai_prices (
  model text primary key,
  usd_in_per_m numeric not null check (usd_in_per_m >= 0),
  usd_out_per_m numeric not null check (usd_out_per_m >= 0)
);
insert into private.ai_prices (model, usd_in_per_m, usd_out_per_m) values ('gpt-6-luna', 0.10, 0.50)
on conflict (model) do nothing;
alter table private.ai_prices enable row level security;
revoke all on private.ai_prices from public, anon, authenticated;

create table if not exists private.admin_settings (
  id boolean primary key default true check (id),
  usd_inr numeric not null default 88 check (usd_inr between 50 and 200),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
insert into private.admin_settings (id) values (true) on conflict (id) do nothing;
alter table private.admin_settings enable row level security;
revoke all on private.admin_settings from public, anon, authenticated;

create or replace function private.usd_inr() returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce((select usd_inr from private.admin_settings where id), 88);
$$;

-- 'openai/gpt-6-luna', 'global.openai.gpt-6-luna' → 'gpt-6-luna'. Unknown (older rows) → the default model.
create or replace function private.model_name(p_model text) returns text
language sql immutable set search_path = '' as $$
  select coalesce(nullif(regexp_replace(lower(coalesce(p_model, '')), '^([a-z0-9_-]+/|(global|us|eu|apac|openai|anthropic)\.)+', ''), ''), 'gpt-6-luna');
$$;

-- Every priced AI call between two times: course plans, goal checks, lessons and quizzes (ai_usage), professor
-- answers (professor_questions) and coding coach replies (coding_coach_requests). Cost in rupees.
create or replace function private.ai_cost_rows(p_from timestamptz, p_to timestamptz default null)
returns table (at timestamptz, user_id uuid, feature text, model text, tokens_in bigint, tokens_out bigint, inr numeric, priced boolean)
language sql stable security definer set search_path = '' as $$
  with calls as (
    select a.created_at, a.user_id, a.kind, private.model_name(a.model) as model, a.tokens_in, a.tokens_out
      from public.ai_usage a where a.created_at >= p_from and (p_to is null or a.created_at < p_to)
    union all
    select q.created_at, q.user_id, 'professor_reply', 'gpt-6-luna', q.tokens_in, q.tokens_out
      from public.professor_questions q where q.created_at >= p_from and (p_to is null or q.created_at < p_to) and q.tokens_in + q.tokens_out > 0
    union all
    select k.created_at, k.user_id, 'coach_reply', 'gpt-6-luna', k.tokens_in, k.tokens_out
      from public.coding_coach_requests k where k.created_at >= p_from and (p_to is null or k.created_at < p_to) and k.tokens_in + k.tokens_out > 0
  )
  select c.created_at, c.user_id, c.kind, c.model, c.tokens_in::bigint, c.tokens_out::bigint,
         (c.tokens_in * coalesce(p.usd_in_per_m, d.usd_in_per_m) + c.tokens_out * coalesce(p.usd_out_per_m, d.usd_out_per_m)) / 1e6 * private.usd_inr(),
         p.model is not null
    from calls c
    left join private.ai_prices p on p.model = c.model
    left join private.ai_prices d on d.model = 'gpt-6-luna';
$$;

-- Set the dollar rate used for AI costs. Errors: bad_rate.
create or replace function public.admin_set_usd_inr(p_rate numeric)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old numeric;
begin
  perform private.require_admin();
  if p_rate is null or p_rate < 50 or p_rate > 200 then raise exception 'bad_rate'; end if;
  select usd_inr into v_old from private.admin_settings where id;
  update private.admin_settings set usd_inr = round(p_rate, 2), updated_at = now(), updated_by = auth.uid() where id;
  insert into private.admin_log (admin, action, detail) values (auth.uid(), 'usd_inr', jsonb_build_object('from', v_old, 'to', round(p_rate, 2)));
end $$;

-- ---------- the Money page ----------

create or replace function public.admin_money(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_days int := case when p_days in (7, 30, 90) then p_days else 30 end;
  v_first date := (now() at time zone 'Asia/Kolkata')::date - (v_days - 1);
  v_from timestamptz := v_first::timestamp at time zone 'Asia/Kolkata';
  r jsonb;
begin
  perform private.require_admin();
  with ai_rows as materialized (select * from private.ai_cost_rows(v_from))
  select jsonb_build_object(
    'days', v_days,
    'rate', (select jsonb_build_object('usd_inr', s.usd_inr, 'updated_at', s.updated_at, 'by', u.email)
               from private.admin_settings s left join auth.users u on u.id = s.updated_by where s.id),
    'prices', (select coalesce(jsonb_agg(jsonb_build_object('model', p.model, 'in', p.usd_in_per_m, 'out', p.usd_out_per_m) order by p.model), '[]'::jsonb) from private.ai_prices p),
    'revenue_paise', (select coalesce(sum(amount_paise), 0) from public.payment_orders where status = 'paid' and paid_at >= v_from),
    'paid_orders', (select count(*) from public.payment_orders where status = 'paid' and paid_at >= v_from),
    'paying_learners', (select count(distinct user_id) from public.payment_orders where status = 'paid' and paid_at >= v_from),
    'unpaid_orders', (select count(*) from public.payment_orders where status <> 'paid' and created_at >= v_from),
    'ai_inr', (select round(coalesce(sum(inr), 0), 2) from ai_rows),
    'ai_calls', (select count(*) from ai_rows),
    'ai_unpriced', (select count(*) from ai_rows where not priced),
    'pro_active', (select count(*) from public.user_plans where plan = 'pro' and status = 'active' and (current_period_end is null or current_period_end > now())),
    'credits_outstanding', (select coalesce(sum(delta), 0) from public.credit_ledger),
    'daily', (select jsonb_agg(jsonb_build_object(
        'day', dd,
        'revenue_paise', (select coalesce(sum(o.amount_paise), 0) from public.payment_orders o where o.status = 'paid' and (o.paid_at at time zone 'Asia/Kolkata')::date = dd),
        'orders', (select count(*) from public.payment_orders o where o.status = 'paid' and (o.paid_at at time zone 'Asia/Kolkata')::date = dd),
        'ai_inr', (select round(coalesce(sum(a.inr), 0), 2) from ai_rows a where (a.at at time zone 'Asia/Kolkata')::date = dd),
        'ai_calls', (select count(*) from ai_rows a where (a.at at time zone 'Asia/Kolkata')::date = dd)) order by dd desc)
      from generate_series(v_first, (now() at time zone 'Asia/Kolkata')::date, interval '1 day') g, lateral (select g::date as dd) x),
    'features', (select coalesce(jsonb_agg(f order by (f ->> 'inr')::numeric desc), '[]'::jsonb) from (
        select jsonb_build_object('feature', feature, 'calls', count(*), 'tokens_in', sum(tokens_in), 'tokens_out', sum(tokens_out),
                                  'inr', round(sum(inr), 2)) as f
          from ai_rows group by feature) x),
    'models', (select coalesce(jsonb_agg(m order by (m ->> 'inr')::numeric desc), '[]'::jsonb) from (
        select jsonb_build_object('model', model, 'calls', count(*), 'tokens_in', sum(tokens_in), 'tokens_out', sum(tokens_out),
                                  'inr', round(sum(inr), 2), 'priced', bool_and(priced)) as m
          from ai_rows group by model) x),
    'learners', (select coalesce(jsonb_agg(l order by (l ->> 'inr')::numeric desc), '[]'::jsonb) from (
        select jsonb_build_object('user_id', a.user_id, 'email', u.email, 'calls', count(*), 'inr', round(sum(a.inr), 2),
                                  'paid_paise', (select coalesce(sum(o.amount_paise), 0) from public.payment_orders o
                                                  where o.user_id = a.user_id and o.status = 'paid' and o.paid_at >= v_from)) as l
          from ai_rows a left join auth.users u on u.id = a.user_id
         where a.user_id is not null
         group by a.user_id, u.email order by sum(a.inr) desc limit 20) x),
    'unattributed_inr', (select round(coalesce(sum(inr), 0), 2) from ai_rows where user_id is null),
    'credits', (select coalesce(jsonb_agg(c order by c ->> 'reason'), '[]'::jsonb) from (
        select jsonb_build_object('reason', reason, 'added', coalesce(sum(delta) filter (where delta > 0), 0),
                                  'used', coalesce(-sum(delta) filter (where delta < 0), 0), 'entries', count(*)) as c
          from public.credit_ledger where created_at >= v_from group by reason) x)
  ) into r;
  return r;
end $$;

-- Every payment, newest first. p_status: all | paid | created | failed.
create or replace function public.admin_payment_list(p_status text default 'all', p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_status text := case when p_status in ('paid', 'created', 'failed') then p_status else 'all' end;
begin
  perform private.require_admin();
  return jsonb_build_object(
    'total', (select count(*) from public.payment_orders o where v_status = 'all' or o.status = v_status),
    'rows', coalesce((select jsonb_agg(x) from (
        select o.created_at, o.paid_at, o.user_id, u.email, o.product, o.amount_paise, o.status, o.razorpay_order_id, o.razorpay_payment_id
          from public.payment_orders o left join auth.users u on u.id = o.user_id
         where v_status = 'all' or o.status = v_status
         order by coalesce(o.paid_at, o.created_at) desc
         limit least(greatest(coalesce(p_limit, 50), 1), 100) offset least(greatest(coalesce(p_offset, 0), 0), 100000)) x), '[]'::jsonb));
end $$;

-- One learner's AI cost by feature, all time and the last 30 days.
create or replace function public.admin_user_ai(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return (select jsonb_build_object(
      'inr', round(coalesce(sum(inr), 0), 2),
      'inr_30d', round(coalesce(sum(inr) filter (where at >= now() - interval '30 days'), 0), 2),
      'calls', count(*),
      'features', coalesce((select jsonb_agg(f order by (f ->> 'inr')::numeric desc) from (
          select jsonb_build_object('feature', feature, 'calls', count(*), 'inr', round(sum(inr), 2),
                                    'inr_30d', round(coalesce(sum(inr) filter (where at >= now() - interval '30 days'), 0), 2)) as f
            from private.ai_cost_rows('-infinity') where user_id = p_user group by feature) x), '[]'::jsonb))
    from private.ai_cost_rows('-infinity') where user_id = p_user);
end $$;

-- ---------- Overview, in rupees ----------

-- As in migration 012, with AI cost in rupees (ai_inr_today, ai_inr_30d) including the coding coach.
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
    'ai_inr_today', (select round(coalesce(sum(inr), 0), 2) from private.ai_cost_rows(d)),
    'ai_inr_30d', (select round(coalesce(sum(inr), 0), 2) from private.ai_cost_rows(now() - interval '30 days')),
    'revenue_paise_30d', (select coalesce(sum(amount_paise), 0) from public.payment_orders where status = 'paid' and paid_at >= now() - interval '30 days'),
    'revenue_paise_total', (select coalesce(sum(amount_paise), 0) from public.payment_orders where status = 'paid'),
    'paid_orders_total', (select count(*) from public.payment_orders where status = 'paid'),
    'pro_active', (select count(*) from public.user_plans where plan = 'pro' and status = 'active' and (current_period_end is null or current_period_end > now())),
    'credits_outstanding', (select coalesce(sum(delta), 0) from public.credit_ledger),
    'reports_open', (select count(*) from public.lesson_reports where status = 'open')
  ) into r;
  return r;
end $$;

drop function if exists public.admin_daily(int);
create or replace function public.admin_daily(p_days int default 14)
returns table (day date, signups int, courses int, lessons int, questions int, ai_inr numeric, revenue_paise bigint)
language plpgsql stable security definer set search_path = '' as $$
declare v_first date := (now() at time zone 'Asia/Kolkata')::date - (least(greatest(coalesce(p_days, 14), 1), 90) - 1);
begin
  perform private.require_admin();
  return query
  with days as (
    select g::date as dday from generate_series(v_first, (now() at time zone 'Asia/Kolkata')::date, interval '1 day') g
  ), ai as (
    select (a.at at time zone 'Asia/Kolkata')::date as dday, sum(a.inr) as inr
      from private.ai_cost_rows(v_first::timestamp at time zone 'Asia/Kolkata') a group by 1
  )
  select dd.dday,
    (select count(*)::int from auth.users u where (u.created_at at time zone 'Asia/Kolkata')::date = dd.dday),
    (select count(*)::int from public.courses c where (c.created_at at time zone 'Asia/Kolkata')::date = dd.dday),
    (select count(*)::int from public.lessons l where l.blocks is not null and (l.generated_at at time zone 'Asia/Kolkata')::date = dd.dday),
    (select count(*)::int from public.professor_questions q where q.status = 'answered' and (q.created_at at time zone 'Asia/Kolkata')::date = dd.dday),
    round(coalesce((select ai.inr from ai where ai.dday = dd.dday), 0), 2),
    (select coalesce(sum(o.amount_paise), 0)::bigint from public.payment_orders o where o.status = 'paid' and (o.paid_at at time zone 'Asia/Kolkata')::date = dd.dday)
  from days dd order by dd.dday desc;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.admin_set_usd_inr(numeric)',
    'public.admin_money(int)',
    'public.admin_payment_list(text, int, int)',
    'public.admin_user_ai(uuid)',
    'public.admin_overview()',
    'public.admin_daily(int)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  foreach f in array array['private.usd_inr()', 'private.model_name(text)', 'private.ai_cost_rows(timestamptz, timestamptz)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end $$;
