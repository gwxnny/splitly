-- Splitly database schema. Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.installment_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  category text not null default 'wallet',
  icon_color text not null default '#F8E3E8' check (icon_color ~ '^#[0-9A-Fa-f]{6}  method text,
  notes text,
  start_month date not null,
  due_day integer not null default 1 check (due_day between 1 and 28),
  total_amount numeric(12,2) not null check (total_amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.installment_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  amount numeric(12,2) not null check (amount > 0),
  due_date date not null,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique(plan_id, month)
);

create index if not exists installment_plans_user_id_idx on public.installment_plans(user_id);
create index if not exists payment_items_user_id_month_idx on public.payment_items(user_id, month);
create index if not exists payment_items_plan_id_idx on public.payment_items(plan_id);
create index if not exists payment_items_due_date_idx on public.payment_items(user_id, due_date);

alter table public.installment_plans enable row level security;
alter table public.payment_items enable row level security;

drop policy if exists "Users manage their own installment plans" on public.installment_plans;
create policy "Users manage their own installment plans"
on public.installment_plans for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage their own payment items" on public.payment_items;
create policy "Users manage their own payment items"
on public.payment_items for all to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.installment_plans p
    where p.id = payment_items.plan_id and p.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.installment_plans p
    where p.id = payment_items.plan_id and p.user_id = auth.uid()
  )
);

grant select, insert, update, delete on public.installment_plans to authenticated;
grant select, insert, update, delete on public.payment_items to authenticated;

-- Keep updated_at current.
create or replace function public.set_splitly_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists set_splitly_plan_updated_at on public.installment_plans;
create trigger set_splitly_plan_updated_at
before update on public.installment_plans
for each row execute function public.set_splitly_updated_at();
),
  method text,
  notes text,
  start_month date not null,
  due_day integer not null default 1 check (due_day between 1 and 28),
  total_amount numeric(12,2) not null check (total_amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.installment_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  amount numeric(12,2) not null check (amount > 0),
  due_date date not null,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique(plan_id, month)
);

create index if not exists installment_plans_user_id_idx on public.installment_plans(user_id);
create index if not exists payment_items_user_id_month_idx on public.payment_items(user_id, month);
create index if not exists payment_items_plan_id_idx on public.payment_items(plan_id);
create index if not exists payment_items_due_date_idx on public.payment_items(user_id, due_date);

alter table public.installment_plans enable row level security;
alter table public.payment_items enable row level security;

drop policy if exists "Users manage their own installment plans" on public.installment_plans;
create policy "Users manage their own installment plans"
on public.installment_plans for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage their own payment items" on public.payment_items;
create policy "Users manage their own payment items"
on public.payment_items for all to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.installment_plans p
    where p.id = payment_items.plan_id and p.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.installment_plans p
    where p.id = payment_items.plan_id and p.user_id = auth.uid()
  )
);

grant select, insert, update, delete on public.installment_plans to authenticated;
grant select, insert, update, delete on public.payment_items to authenticated;

-- Keep updated_at current.
create or replace function public.set_splitly_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists set_splitly_plan_updated_at on public.installment_plans;
create trigger set_splitly_plan_updated_at
before update on public.installment_plans
for each row execute function public.set_splitly_updated_at();
