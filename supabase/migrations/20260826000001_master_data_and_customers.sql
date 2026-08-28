-- 1. Create Role Verification Helper
create or replace function public.has_role(user_id uuid, role_names text[])
returns boolean as $$
begin
    return exists (
        select 1 from public.user_roles
        where profile_id = user_id and role_id = any(role_names)
    );
end;
$$ language plpgsql security definer;

-- 2. Create Customers Sequence and Table
create sequence public.customer_code_seq;

create table public.customers (
    id uuid default gen_random_uuid() primary key,
    customer_code text unique,
    name text not null,
    mobile text not null,
    whatsapp_number text,
    same_as_mobile boolean default true not null,
    place_address text,
    email text,
    is_active boolean default true not null,
    branch_id uuid references public.branches(id) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for normalized mobile lookup
create index customers_normalized_mobile_idx on public.customers (regexp_replace(mobile, '\D', '', 'g'));

-- Enable RLS on Customers
alter table public.customers enable row level security;

-- Trigger to auto-generate customer code
create or replace function public.next_customer_code()
returns trigger as $$
begin
    if new.customer_code is null then
        new.customer_code := 'CUST-' || lpad(nextval('public.customer_code_seq')::text, 5, '0');
    end if;
    return new;
end;
$$ language plpgsql;

create trigger tr_next_customer_code
    before insert on public.customers
    for each row execute procedure public.next_customer_code();

-- 3. Create Services Table
create table public.services (
    id uuid default gen_random_uuid() primary key,
    name text unique not null,
    description text,
    is_active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Services
alter table public.services enable row level security;

-- 4. Create Items Table
create table public.items (
    id uuid default gen_random_uuid() primary key,
    name text unique not null,
    is_active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Items
alter table public.items enable row level security;

-- 5. Create Units Table
create table public.units (
    id text primary key,
    name text not null
);

-- Enable RLS on Units
alter table public.units enable row level security;

-- 6. Create Service Item Rates Table
create table public.service_item_rates (
    id uuid default gen_random_uuid() primary key,
    service_id uuid references public.services(id) on delete cascade not null,
    item_id uuid references public.items(id) on delete cascade not null,
    unit_id text references public.units(id) not null,
    rate numeric(10,2) not null check (rate >= 0),
    effective_from timestamp with time zone default timezone('utc'::text, now()) not null,
    effective_to timestamp with time zone,
    is_active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint unique_rate_period unique (service_id, item_id, unit_id, effective_from)
);

-- Enable RLS on Service Item Rates
alter table public.service_item_rates enable row level security;

-- 7. Create Expense Categories Table
create table public.expense_categories (
    id uuid default gen_random_uuid() primary key,
    name text unique not null,
    is_active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Expense Categories
alter table public.expense_categories enable row level security;

-- 8. Create Shelf Locations Table
create table public.shelf_locations (
    id uuid default gen_random_uuid() primary key,
    code text unique not null,
    branch_id uuid references public.branches(id) not null,
    is_active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Shelf Locations
alter table public.shelf_locations enable row level security;


-- 9. Setup Row Level Security Policies

-- Customers Policies
create policy "Allow customer read access for authenticated staff"
    on public.customers for select
    to authenticated
    using (public.has_role(auth.uid(), array['admin', 'billing_staff', 'delivery_staff']));

create policy "Allow customer insert access for admin and billing staff"
    on public.customers for insert
    to authenticated
    with check (public.has_role(auth.uid(), array['admin', 'billing_staff']));

create policy "Allow customer update access for admin and billing staff"
    on public.customers for update
    to authenticated
    using (public.has_role(auth.uid(), array['admin', 'billing_staff']))
    with check (public.has_role(auth.uid(), array['admin', 'billing_staff']));

create policy "Allow customer delete access for admin only"
    on public.customers for delete
    to authenticated
    using (public.is_admin(auth.uid()));

-- Services, Items, Units, Rates Policies
create policy "Allow select access to catalog tables for authenticated users"
    on public.services for select to authenticated using (is_active = true);

create policy "Allow write access to services for admins"
    on public.services for all to authenticated
    using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Allow select access to items for authenticated users"
    on public.items for select to authenticated using (is_active = true);

create policy "Allow write access to items for admins"
    on public.items for all to authenticated
    using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Allow select access to units for authenticated users"
    on public.units for select to authenticated using (true);

create policy "Allow write access to units for admins"
    on public.units for all to authenticated
    using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Allow select access to rates for authenticated users"
    on public.service_item_rates for select to authenticated using (is_active = true);

create policy "Allow write access to rates for admins"
    on public.service_item_rates for all to authenticated
    using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Expense Categories Policies
create policy "Allow select access to expense categories for authenticated users"
    on public.expense_categories for select to authenticated using (is_active = true);

create policy "Allow write access to expense categories for admins"
    on public.expense_categories for all to authenticated
    using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Shelf Locations Policies
create policy "Allow select access to shelves for authenticated users"
    on public.shelf_locations for select to authenticated using (is_active = true);

create policy "Allow write access to shelves for admins"
    on public.shelf_locations for all to authenticated
    using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
