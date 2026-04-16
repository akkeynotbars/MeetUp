-- ============================================================================
-- MeetUp — initial auth schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- Created for Tasks 10–13 (signup, login, bcrypt, role middleware).
-- ============================================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- users
-- The single source of truth for accounts (both 'user' and 'company' roles).
-- password_hash is a bcrypt hash — never store plaintext.
-- ----------------------------------------------------------------------------
create table if not exists public.users (
  id            uuid        primary key default gen_random_uuid(),
  email         text        not null unique,
  password_hash text        not null,
  full_name     text        not null,
  role          text        not null check (role in ('user', 'company')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists users_role_idx on public.users (role);

-- ----------------------------------------------------------------------------
-- companies
-- One row per company account. user_id points to the owner in users.
-- status starts at 'pending_verification' until an admin approves.
-- ----------------------------------------------------------------------------
create table if not exists public.companies (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null unique references public.users(id) on delete cascade,
  name        text        not null,
  industry    text,
  status      text        not null default 'pending_verification'
                          check (status in ('pending_verification', 'verified', 'rejected')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists companies_status_idx on public.companies (status);

-- ----------------------------------------------------------------------------
-- updated_at auto-touch trigger
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_touch_updated_at on public.users;
create trigger users_touch_updated_at
  before update on public.users
  for each row execute function public.touch_updated_at();

drop trigger if exists companies_touch_updated_at on public.companies;
create trigger companies_touch_updated_at
  before update on public.companies
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- Our backend uses the SERVICE ROLE key, which bypasses RLS automatically.
-- We still enable RLS so that if anyone hits these tables with the
-- publishable/anon key (e.g. directly from the browser) it's locked down.
-- ----------------------------------------------------------------------------
alter table public.users     enable row level security;
alter table public.companies enable row level security;

-- (intentionally no policies — only the service role can read/write.
--  Add policies later when we want client-side reads.)
