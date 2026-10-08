create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  automation_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null check (provider in ('stripe','discord','telegram')),
  enabled boolean not null default false,
  stripe_secret_encrypted text,
  stripe_webhook_secret_encrypted text,
  discord_bot_token_encrypted text,
  discord_webhook_url_encrypted text,
  telegram_bot_token_encrypted text,
  telegram_admin_chat_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.failed_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  stripe_invoice_id text not null,
  stripe_customer_id text not null,
  customer_name text,
  customer_email text,
  amount_due bigint not null,
  currency text not null,
  status text not null default 'pending' check (status in ('pending','card_updated','recovered','unresolved')),
  dm_provider text check (dm_provider in ('discord','telegram')),
  dm_status text not null default 'pending' check (dm_status in ('pending','sent','failed','skipped')),
  discord_id text,
  telegram_id text,
  recovery_token_hash text not null unique,
  recovery_token_expires_at timestamptz not null,
  failed_at timestamptz not null default now(),
  recovered_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (integration_id, stripe_invoice_id)
);

create table if not exists public.recovered_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  failed_invoice_id uuid not null references public.failed_invoices(id) on delete cascade,
  stripe_invoice_id text not null,
  customer_name text,
  amount_recovered bigint not null,
  currency text not null,
  channel text check (channel in ('discord','telegram')),
  recovered_at timestamptz not null default now(),
  source text not null default 'stripe' check (source in ('stripe','simulation')),
  unique (failed_invoice_id)
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations(id) on delete cascade,
  stripe_event_id text not null unique,
  event_type text not null,
  processed_at timestamptz not null default now(),
  status text not null default 'processing' check (status in ('processing','succeeded','failed')),
  error_message text
);

create index if not exists failed_invoices_user_status_idx on public.failed_invoices(user_id, status, failed_at desc);
create index if not exists failed_invoices_customer_idx on public.failed_invoices(user_id, stripe_customer_id, failed_at desc);
create index if not exists recovered_logs_user_date_idx on public.recovered_logs(user_id, recovered_at desc);

alter table public.users enable row level security;
alter table public.integrations enable row level security;
alter table public.failed_invoices enable row level security;
alter table public.recovered_logs enable row level security;
alter table public.webhook_events enable row level security;

drop policy if exists "users own profile" on public.users;
drop policy if exists "users own profile update" on public.users;
drop policy if exists "users own integrations" on public.integrations;
drop policy if exists "users own failed invoices" on public.failed_invoices;
drop policy if exists "users own recovered logs" on public.recovered_logs;

create policy "users own profile" on public.users for select using (auth.uid() = id);
create policy "users own profile update" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "users own integrations" on public.integrations for select using (auth.uid() = user_id);
create policy "users own failed invoices" on public.failed_invoices for select using (auth.uid() = user_id);
create policy "users own recovered logs" on public.recovered_logs for select using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''), '@', 1)))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
