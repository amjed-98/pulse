alter table public.workspace_billing
add column if not exists stripe_customer_id text,
add column if not exists stripe_subscription_id text,
add column if not exists stripe_price_id text,
add column if not exists current_period_end timestamptz,
add column if not exists cancel_at_period_end boolean not null default false;

alter table public.workspace_billing
drop constraint if exists workspace_billing_status_check;

alter table public.workspace_billing
add constraint workspace_billing_status_check
check (status in ('active', 'past_due', 'trialing', 'canceled'));

create unique index if not exists workspace_billing_stripe_customer_id_idx
on public.workspace_billing (stripe_customer_id)
where stripe_customer_id is not null;

create unique index if not exists workspace_billing_stripe_subscription_id_idx
on public.workspace_billing (stripe_subscription_id)
where stripe_subscription_id is not null;
