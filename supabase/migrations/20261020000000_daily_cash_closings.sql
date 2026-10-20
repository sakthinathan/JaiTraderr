-- Migration: Daily Cash Closings Table
-- Creates table to record end-of-day cash drawer settlements and reconciliation logs

create table if not exists public.daily_cash_closings (
    id uuid default gen_random_uuid() primary key,
    branch_id uuid references public.branches(id),
    closing_date date not null unique,
    opening_cash numeric(10,2) not null default 0,
    cash_collections numeric(10,2) not null default 0,
    upi_collections numeric(10,2) not null default 0,
    card_collections numeric(10,2) not null default 0,
    other_collections numeric(10,2) not null default 0,
    total_revenue numeric(10,2) not null default 0,
    cash_expenses numeric(10,2) not null default 0,
    other_expenses numeric(10,2) not null default 0,
    total_expenses numeric(10,2) not null default 0,
    expected_cash numeric(10,2) not null default 0,
    actual_cash numeric(10,2) not null default 0,
    variance numeric(10,2) not null default 0,
    notes text,
    closed_by text,
    status text not null default 'BALANCED' check (status in ('BALANCED', 'SURPLUS', 'DEFICIT')),
    closed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.daily_cash_closings enable row level security;

-- Policies for authenticated users
create policy "Enable read access for authenticated users on daily_cash_closings"
    on public.daily_cash_closings for select
    to authenticated
    using (true);

create policy "Enable insert/update access for authenticated users on daily_cash_closings"
    on public.daily_cash_closings for all
    to authenticated
    using (true)
    with check (true);
