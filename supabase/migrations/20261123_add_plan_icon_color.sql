-- Add a saved colour for each installment plan icon.
-- Safe to run once on an existing Splitly database.
alter table public.installment_plans
  add column if not exists icon_color text not null default '#F8E3E8';

alter table public.installment_plans
  drop constraint if exists installment_plans_icon_color_check;

alter table public.installment_plans
  add constraint installment_plans_icon_color_check
  check (icon_color ~ '^#[0-9A-Fa-f]{6}$');
