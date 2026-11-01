-- Payments (Razorpay). Orders are created and confirmed only through server-key functions.
-- Products and prices live in the app (lib/learning/plans.ts); the order row records what was sold.
create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  product text not null check (product in ('c100', 'c250', 'pro30')),
  amount_paise int not null check (amount_paise > 0),
  credits int not null default 0 check (credits >= 0),
  pro_days int not null default 0 check (pro_days >= 0),
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists payment_orders_user_idx on public.payment_orders (user_id, created_at desc);

alter table public.payment_orders enable row level security;
drop policy if exists "Read own" on public.payment_orders;
create policy "Read own" on public.payment_orders for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.payment_orders from anon, authenticated;
grant select on public.payment_orders to authenticated;

-- Record a Razorpay order for the signed-in learner (server only).
create or replace function public.app_create_order(
  p_key text, p_razorpay_order_id text, p_product text, p_amount_paise int, p_credits int, p_pro_days int
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  perform private.require_server_key(p_key);
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  insert into public.payment_orders (user_id, razorpay_order_id, product, amount_paise, credits, pro_days)
  values (auth.uid(), p_razorpay_order_id, p_product, p_amount_paise, p_credits, p_pro_days)
  returning id into new_id;
  return new_id;
end $$;

-- Apply a verified payment (server only; called after checking Razorpay's signature, from the
-- checkout callback or the webhook, so it may run twice: the second call changes nothing).
-- Returns: applied | already | not_found | amount_mismatch
create or replace function public.app_apply_payment(
  p_key text, p_razorpay_order_id text, p_razorpay_payment_id text, p_amount_paise int
) returns text
language plpgsql security definer set search_path = '' as $$
declare o record;
begin
  perform private.require_server_key(p_key);
  select * into o from public.payment_orders where razorpay_order_id = p_razorpay_order_id for update;
  if not found then return 'not_found'; end if;
  if o.status = 'paid' then return 'already'; end if;
  if p_amount_paise is distinct from o.amount_paise then return 'amount_mismatch'; end if;

  update public.payment_orders
     set status = 'paid', razorpay_payment_id = p_razorpay_payment_id, paid_at = now()
   where id = o.id;
  if o.credits > 0 then
    insert into public.credit_ledger (user_id, delta, reason, ref, note)
    values (o.user_id, o.credits, 'purchase', p_razorpay_payment_id, o.product)
    on conflict (reason, ref) do nothing;
  end if;
  if o.pro_days > 0 then
    insert into public.user_plans (user_id, plan, status, current_period_end, updated_at)
    values (o.user_id, 'pro', 'active', now() + make_interval(days => o.pro_days), now())
    on conflict (user_id) do update
      set plan = 'pro', status = 'active', updated_at = now(),
          current_period_end = greatest(coalesce(public.user_plans.current_period_end, now()), now())
                               + make_interval(days => o.pro_days);
  end if;
  return 'applied';
end $$;

revoke all on function public.app_create_order(text, text, text, int, int, int) from public, anon;
grant execute on function public.app_create_order(text, text, text, int, int, int) to authenticated;
-- The webhook has no learner session, so this one is callable without sign-in; the server key protects it.
revoke all on function public.app_apply_payment(text, text, text, int) from public;
grant execute on function public.app_apply_payment(text, text, text, int) to anon, authenticated;
