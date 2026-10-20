-- 1. Create Branches Table
create table public.branches (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    code text unique not null,
    address text,
    is_active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Branches
alter table public.branches enable row level security;

-- 2. Create Profiles Table
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    name text,
    email text unique not null,
    is_active boolean default true not null,
    default_branch_id uuid references public.branches(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Profiles
alter table public.profiles enable row level security;

-- 3. Create Roles Table
create table public.roles (
    id text primary key,
    name text not null,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Roles
alter table public.roles enable row level security;

-- 4. Create User Roles Table
create table public.user_roles (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    role_id text references public.roles(id) on delete cascade not null,
    branch_id uuid references public.branches(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint user_roles_unique unique (profile_id, role_id, branch_id)
);

-- Enable RLS on User Roles
alter table public.user_roles enable row level security;

-- 5. Helper Function to Check if User is Admin
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
begin
    return exists (
        select 1 from public.user_roles
        where profile_id = user_id and role_id = 'admin'
    );
end;
$$ language plpgsql security definer;

-- 6. Trigger Function to handle Auth Signups
create or replace function public.handle_new_user()
returns trigger as $$
declare
    default_branch_id uuid;
    default_role text := 'billing_staff';
    first_user boolean;
begin
    -- Get default branch
    select id into default_branch_id from public.branches where code = 'MAIN' limit 1;
    if default_branch_id is null then
        select id into default_branch_id from public.branches order by created_at asc limit 1;
    end if;

    -- Check if this is the first user in the system to make them admin
    select not exists (select 1 from public.profiles) into first_user;
    if first_user then
        default_role := 'admin';
    end if;

    -- Create profile
    insert into public.profiles (id, name, email, default_branch_id)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email,
        default_branch_id
    );

    -- Assign role
    insert into public.user_roles (profile_id, role_id, branch_id)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'role_id', default_role),
        default_branch_id
    );

    return new;
end;
$$ language plpgsql security definer;

-- Trigger to execute on auth user creation
create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- 7. Define Row Level Security Policies

-- Branches Policies
create policy "Allow read access to branches for authenticated users"
    on public.branches for select
    to authenticated
    using (is_active = true);

create policy "Allow all access to branches for admins"
    on public.branches for all
    to authenticated
    using (public.is_admin(auth.uid()))
    with check (public.is_admin(auth.uid()));

-- Profiles Policies
create policy "Allow read access to profiles for users themselves or admins"
    on public.profiles for select
    to authenticated
    using (auth.uid() = id or public.is_admin(auth.uid()));

create policy "Allow update access to profiles for users themselves or admins"
    on public.profiles for update
    to authenticated
    using (auth.uid() = id or public.is_admin(auth.uid()))
    with check (auth.uid() = id or public.is_admin(auth.uid()));

create policy "Allow delete access to profiles for admins"
    on public.profiles for delete
    to authenticated
    using (public.is_admin(auth.uid()));

-- Roles Policies
create policy "Allow read access to roles for authenticated users"
    on public.roles for select
    to authenticated
    using (true);

-- User Roles Policies
create policy "Allow read access to user roles for users themselves or admins"
    on public.user_roles for select
    to authenticated
    using (profile_id = auth.uid() or public.is_admin(auth.uid()));

create policy "Allow all access to user roles for admins"
    on public.user_roles for all
    to authenticated
    using (public.is_admin(auth.uid()))
    with check (public.is_admin(auth.uid()));
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
-- 1. Create Sequences
create sequence public.job_card_number_seq;

-- 2. Create Job Cards Table
create table public.job_cards (
    id uuid default gen_random_uuid() primary key,
    job_card_number text unique,
    customer_id uuid references public.customers(id) not null,
    branch_id uuid references public.branches(id) not null,
    status text default 'RECEIVED' not null check (status in ('RECEIVED', 'WASHING', 'IRONING', 'READY_FOR_DELIVERY', 'DELIVERED')),
    expected_delivery_date timestamp with time zone not null,
    remarks text,
    subtotal numeric(10,2) default 0.00 not null check (subtotal >= 0),
    discount numeric(10,2) default 0.00 not null check (discount >= 0),
    tax_amount numeric(10,2) default 0.00 not null check (tax_amount >= 0),
    grand_total numeric(10,2) default 0.00 not null check (grand_total >= 0),
    advance_paid numeric(10,2) default 0.00 not null check (advance_paid >= 0),
    balance_due numeric(10,2) default 0.00 not null,
    is_locked boolean default false not null,
    created_by uuid references auth.users(id),
    closed_by uuid references auth.users(id),
    closed_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Job Cards
alter table public.job_cards enable row level security;

-- 3. Create Job Card Services Table
create table public.job_card_services (
    id uuid default gen_random_uuid() primary key,
    job_card_id uuid references public.job_cards(id) on delete cascade not null,
    service_id uuid references public.services(id) not null,
    service_name_snapshot text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Job Card Services
alter table public.job_card_services enable row level security;

-- 4. Create Job Card Items Table
create table public.job_card_items (
    id uuid default gen_random_uuid() primary key,
    job_card_service_id uuid references public.job_card_services(id) on delete cascade not null,
    item_id uuid references public.items(id) not null,
    item_name_snapshot text not null,
    unit_id_snapshot text not null,
    rate_snapshot numeric(10,2) not null check (rate_snapshot >= 0),
    quantity numeric(10,2) not null check (quantity > 0),
    amount numeric(10,2) not null check (amount >= 0),
    remarks text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Job Card Items
alter table public.job_card_items enable row level security;

-- 5. Create Job Card Edit Requests Table
create table public.job_card_edit_requests (
    id uuid default gen_random_uuid() primary key,
    job_card_id uuid references public.job_cards(id) on delete cascade not null,
    requested_by uuid references auth.users(id) not null,
    reason text not null,
    status text default 'PENDING' not null check (status in ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by uuid references auth.users(id),
    approved_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Edit Requests
alter table public.job_card_edit_requests enable row level security;

-- 6. Create Audit Logs Table
create table public.audit_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id),
    action text not null,
    entity text not null,
    entity_id text,
    old_values jsonb,
    new_values jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Audit Logs (Admin only)
alter table public.audit_logs enable row level security;


-- 7. Database Triggers for Auto-Numbering & Locking

-- Auto generate Job Card Number trigger
create or replace function public.next_job_card_number()
returns trigger as $$
declare
    current_year text;
begin
    current_year := to_char(now(), 'YYYY');
    if new.job_card_number is null then
        new.job_card_number := 'JC-' || current_year || '-' || lpad(nextval('public.job_card_number_seq')::text, 5, '0');
    end if;
    return new;
end;
$$ language plpgsql;

create trigger tr_next_job_card_number
    before insert on public.job_cards
    for each row execute procedure public.next_job_card_number();

-- Locking checks trigger
create or replace function public.enforce_job_card_lock()
returns trigger as $$
begin
    if old.is_locked = true and new.is_locked = true then
        if not public.is_admin(auth.uid()) then
            -- Check if financial details or items are modified
            if old.customer_id <> new.customer_id or
               old.subtotal <> new.subtotal or
               old.discount <> new.discount or
               old.grand_total <> new.grand_total or
               old.tax_amount <> new.tax_amount then
                raise exception 'This job card is locked. Billing details cannot be edited without administrator approval.';
            end if;
        end if;
    end if;
    return new;
end;
$$ language plpgsql;

create trigger tr_enforce_job_card_lock
    before update on public.job_cards
    for each row execute procedure public.enforce_job_card_lock();


-- 8. Row Level Security Policies

-- Job Cards Policies
create policy "Allow select access to job cards for authenticated staff"
    on public.job_cards for select to authenticated
    using (public.has_role(auth.uid(), array['admin', 'billing_staff', 'processing_staff', 'delivery_staff']));

create policy "Allow insert access to job cards for billing staff and admin"
    on public.job_cards for insert to authenticated
    with check (public.has_role(auth.uid(), array['admin', 'billing_staff']));

create policy "Allow update access to job cards for billing staff and admin"
    on public.job_cards for update to authenticated
    using (public.has_role(auth.uid(), array['admin', 'billing_staff', 'processing_staff', 'delivery_staff']))
    with check (public.has_role(auth.uid(), array['admin', 'billing_staff', 'processing_staff', 'delivery_staff']));

create policy "Allow delete access to job cards for admin only"
    on public.job_cards for delete to authenticated
    using (public.is_admin(auth.uid()));

-- Job Card Services Policies
create policy "Allow select access to job card services for authenticated staff"
    on public.job_card_services for select to authenticated
    using (true);

create policy "Allow write access to job card services for billing and admin"
    on public.job_card_services for all to authenticated
    using (public.has_role(auth.uid(), array['admin', 'billing_staff']))
    with check (public.has_role(auth.uid(), array['admin', 'billing_staff']));

-- Job Card Items Policies
create policy "Allow select access to job card items for authenticated staff"
    on public.job_card_items for select to authenticated
    using (true);

create policy "Allow write access to job card items for billing and admin"
    on public.job_card_items for all to authenticated
    using (public.has_role(auth.uid(), array['admin', 'billing_staff']))
    with check (public.has_role(auth.uid(), array['admin', 'billing_staff']));

-- Edit Requests Policies
create policy "Allow select access to edit requests for requester or admin"
    on public.job_card_edit_requests for select to authenticated
    using (requested_by = auth.uid() or public.is_admin(auth.uid()));

create policy "Allow insert access to edit requests for billing staff and admin"
    on public.job_card_edit_requests for insert to authenticated
    with check (requested_by = auth.uid() and public.has_role(auth.uid(), array['admin', 'billing_staff']));

create policy "Allow update access to edit requests for admins"
    on public.job_card_edit_requests for update to authenticated
    using (public.is_admin(auth.uid()))
    with check (public.is_admin(auth.uid()));

-- Audit Logs Policies
create policy "Allow select access to audit logs for admins only"
    on public.audit_logs for select to authenticated
    using (public.is_admin(auth.uid()));
-- 1. Alter Job Cards to support Shelf Location
alter table public.job_cards add column shelf_location text;

-- 2. Create Job Card Status History Table
create table public.job_card_status_history (
    id uuid default gen_random_uuid() primary key,
    job_card_id uuid references public.job_cards(id) on delete cascade not null,
    from_status text check (from_status in ('RECEIVED', 'WASHING', 'IRONING', 'READY_FOR_DELIVERY', 'DELIVERED')),
    to_status text not null check (to_status in ('RECEIVED', 'WASHING', 'IRONING', 'READY_FOR_DELIVERY', 'DELIVERED')),
    changed_by uuid references auth.users(id),
    changed_at timestamp with time zone default timezone('utc'::text, now()) not null,
    remarks text
);

-- Enable RLS on Status History
alter table public.job_card_status_history enable row level security;

-- 3. Create Payments Table
create table public.payments (
    id uuid default gen_random_uuid() primary key,
    job_card_id uuid references public.job_cards(id) on delete cascade not null,
    amount numeric(10,2) not null check (amount > 0),
    payment_method text not null check (payment_method in ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER')),
    payment_type text not null check (payment_type in ('ADVANCE', 'PARTIAL', 'FINAL', 'REFUND')),
    recorded_by uuid references auth.users(id),
    recorded_at timestamp with time zone default timezone('utc'::text, now()) not null,
    remarks text
);

-- Enable RLS on Payments
alter table public.payments enable row level security;

-- 4. Create Notifications Table (Outbox Queue)
create table public.notifications (
    id uuid default gen_random_uuid() primary key,
    job_card_id uuid references public.job_cards(id) on delete cascade not null,
    recipient text not null,
    template_name text not null,
    status text default 'PENDING' not null check (status in ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
    retry_count integer default 0 not null,
    error_message text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    sent_at timestamp with time zone
);

-- Enable RLS on Notifications
alter table public.notifications enable row level security;

-- 5. Create Expenses Table
create table public.expenses (
    id uuid default gen_random_uuid() primary key,
    branch_id uuid references public.branches(id) not null,
    category_id uuid references public.expense_categories(id) not null,
    description text,
    amount numeric(10,2) not null check (amount > 0),
    expense_date date not null,
    payment_method text not null check (payment_method in ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER')),
    created_by uuid references auth.users(id),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Expenses
alter table public.expenses enable row level security;


-- 6. Setup Triggers

-- Trigger: require shelf location on READY_FOR_DELIVERY status
create or replace function public.check_shelf_location_requirement()
returns trigger as $$
begin
    if new.status = 'READY_FOR_DELIVERY' and (new.shelf_location is null or new.shelf_location = '') then
        raise exception 'A shelf location is mandatory when transitioning order to READY_FOR_DELIVERY status.';
    end if;
    return new;
end;
$$ language plpgsql;

create trigger tr_check_shelf_location_requirement
    before update on public.job_cards
    for each row execute procedure public.check_shelf_location_requirement();

-- Trigger: Recalculate balance_due when payment is added/modified
create or replace function public.recalculate_job_card_balance()
returns trigger as $$
declare
    target_jc_id uuid;
    total_paid numeric(10,2);
    jc_grand_total numeric(10,2);
    jc_advance_paid numeric(10,2);
begin
    if TG_OP = 'DELETE' then
        target_jc_id := old.job_card_id;
    else
        target_jc_id := new.job_card_id;
    end if;

    select coalesce(sum(amount), 0.00) into total_paid from public.payments
    where job_card_id = target_jc_id;

    select grand_total, advance_paid into jc_grand_total, jc_advance_paid from public.job_cards
    where id = target_jc_id;

    update public.job_cards
    set balance_due = jc_grand_total - coalesce(jc_advance_paid, 0.00) - total_paid
    where id = target_jc_id;

    return null;
end;
$$ language plpgsql;

create trigger tr_recalculate_job_card_balance
    after insert or update or delete on public.payments
    for each row execute procedure public.recalculate_job_card_balance();


-- 7. Row Level Security Policies

-- Status History Policies
create policy "Allow select access to status history for authenticated users"
    on public.job_card_status_history for select to authenticated
    using (true);

create policy "Allow insert access to status history for authenticated users"
    on public.job_card_status_history for insert to authenticated
    with check (true);

-- Payments Policies
create policy "Allow select access to payments for authenticated staff"
    on public.payments for select to authenticated
    using (public.has_role(auth.uid(), array['admin', 'billing_staff', 'delivery_staff']));

create policy "Allow insert access to payments for billing staff, delivery staff, and admins"
    on public.payments for insert to authenticated
    with check (public.has_role(auth.uid(), array['admin', 'billing_staff', 'delivery_staff']));

create policy "Allow edit access to payments for admins only"
    on public.payments for update to authenticated
    using (public.is_admin(auth.uid()))
    with check (public.is_admin(auth.uid()));

create policy "Allow delete access to payments for admins only"
    on public.payments for delete to authenticated
    using (public.is_admin(auth.uid()));

-- Notifications Policies
create policy "Allow select access to notifications for authenticated staff"
    on public.notifications for select to authenticated
    using (true);

create policy "Allow write access to notifications for system functions/admins"
    on public.notifications for all to authenticated
    using (public.is_admin(auth.uid()))
    with check (public.is_admin(auth.uid()));

-- Expenses Policies
create policy "Allow select access to expenses for admins only"
    on public.expenses for select to authenticated
    using (public.is_admin(auth.uid()));

create policy "Allow write access to expenses for admins only"
    on public.expenses for all to authenticated
    using (public.is_admin(auth.uid()))
    with check (public.is_admin(auth.uid()));
-- Migration: Make item_id nullable to support custom/manual laundry items
ALTER TABLE public.job_card_items ALTER COLUMN item_id DROP NOT NULL;
-- Migration: Add operational laundry volume metrics (Kg, Pcs, Bags) to job_cards
ALTER TABLE public.job_cards 
ADD COLUMN total_weight_kg numeric(10,2) default 0.00,
ADD COLUMN total_pcs integer default 0,
ADD COLUMN total_bags integer default 0;
-- Create table for storing OTP requests
create table public.job_card_unlock_otps (
    id uuid default gen_random_uuid() primary key,
    job_card_id uuid not null references public.job_cards(id) on delete cascade,
    otp_code_hash text not null, -- SHA-256 hashed OTP for database security
    requested_by uuid references auth.users(id) on delete set null,
    expires_at timestamp with time zone not null,
    attempts_count integer default 0 not null,
    is_verified boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.job_card_unlock_otps enable row level security;

-- Allow authenticated, anon, and service_role to manage OTP verification records
create policy "Allow all operations for authenticated and anon"
    on public.job_card_unlock_otps
    for all
    to authenticated, anon, service_role
    using (true)
    with check (true);

-- Overwrite recalculate_job_card_balance trigger function to subtract advance_paid
create or replace function public.recalculate_job_card_balance()
returns trigger as $$
declare
    target_jc_id uuid;
    total_paid numeric(10,2);
    jc_grand_total numeric(10,2);
    jc_advance_paid numeric(10,2);
begin
    if TG_OP = 'DELETE' then
        target_jc_id := old.job_card_id;
    else
        target_jc_id := new.job_card_id;
    end if;

    select coalesce(sum(amount), 0.00) into total_paid from public.payments
    where job_card_id = target_jc_id;

    select grand_total, advance_paid into jc_grand_total, jc_advance_paid from public.job_cards
    where id = target_jc_id;

    update public.job_cards
    set balance_due = jc_grand_total - coalesce(jc_advance_paid, 0.00) - total_paid
    where id = target_jc_id;

    return null;
end;
$$ language plpgsql;
-- High-Volume Performance Optimization Indexes for JaiLaundry Database

-- 1. Index job_cards for instant O(1) filtering on customer_id, status, and date sorting
CREATE INDEX IF NOT EXISTS idx_job_cards_customer_id ON public.job_cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_status ON public.job_cards(status);
CREATE INDEX IF NOT EXISTS idx_job_cards_created_at ON public.job_cards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_cards_branch_id ON public.job_cards(branch_id);

-- 2. Index relational line items and services for instant nested joins
CREATE INDEX IF NOT EXISTS idx_job_card_services_jc_id ON public.job_card_services(job_card_id);
CREATE INDEX IF NOT EXISTS idx_job_card_items_svc_id ON public.job_card_items(job_card_service_id);

-- 3. Index payments for fast customer balance and job card ledger lookups
CREATE INDEX IF NOT EXISTS idx_payments_job_card_id ON public.payments(job_card_id);
CREATE INDEX IF NOT EXISTS idx_payments_recorded_at ON public.payments(recorded_at DESC);

-- 4. Index OTP unlock records for fast verification lookups
CREATE INDEX IF NOT EXISTS idx_job_card_unlock_otps_jc_verified ON public.job_card_unlock_otps(job_card_id, is_verified, expires_at);
-- Create app_settings table for system configuration and Admin Unlock PIN
CREATE TABLE IF NOT EXISTS public.app_settings (
    key text PRIMARY KEY,
    value text NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read app_settings, admin to modify
CREATE POLICY "Allow read access to app_settings for authenticated staff"
    ON public.app_settings FOR SELECT TO authenticated, anon, service_role
    USING (true);

CREATE POLICY "Allow write access to app_settings for service_role and admin"
    ON public.app_settings FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Insert default Admin Unlock Passcode (default PIN: 889900)
INSERT INTO public.app_settings (key, value, description)
VALUES (
    'admin_unlock_passcode_hash',
    '720ca11f2659e4bb5ad3ef5f3d45e0d296c00d43a6d713c75eb018ef66ad506f', -- SHA-256 hash of 889900
    'SHA-256 hashed PIN required to unlock locked job cards'
)
ON CONFLICT (key) DO NOTHING;
-- Seed Branches
insert into public.branches (id, name, code, address, is_active) values
('b1111111-1111-1111-1111-111111111111', 'Main Branch', 'MAIN', '123 Laundry St, Clean City', true)
on conflict (code) do nothing;

-- Seed Roles
insert into public.roles (id, name, description) values
('admin', 'Admin', 'Full administrative control over all branch operations, billing configuration, audits, and expense management.'),
('billing_staff', 'Billing Staff', 'Responsible for customer registration, job card creation, pricing, payments, and document printing.'),
('processing_staff', 'Processing Staff', 'Responsible for moving jobs through operational statuses (washing, ironing) and shelf placements.'),
('delivery_staff', 'Delivery Staff', 'Responsible for final delivery validations and closing balance payments.')
on conflict (id) do nothing;

-- Seed Services
insert into public.services (id, name, description, is_active) values
('a1111111-1111-1111-1111-111111111111', 'Wash & Fold', 'Standard wash and fold service, billed by weight.', true),
('a2222222-2222-2222-2222-222222222222', 'Wash & Iron', 'Standard wash and premium steam press.', true),
('a3333333-3333-3333-3333-333333333333', 'Steam Iron', 'Premium crease-less steam ironing.', true),
('a4444444-4444-4444-4444-444444444444', 'Dry Cleaning', 'Gentle chemical cleaning for delicate fabrics.', true),
('a5555555-5555-5555-5555-555555555555', 'Shoe Cleaning', 'Deep cleaning and fabric restoration for shoes.', true)
on conflict (id) do nothing;

-- Seed Items
insert into public.items (id, name, is_active) values
('f1111111-1111-1111-1111-111111111111', 'Shirt', true),
('f2222222-2222-2222-2222-222222222222', 'Pant', true),
('f3333333-3333-3333-3333-333333333333', 'Saree', true),
('f4444444-4444-4444-4444-444444444444', 'Blazer', true),
('f5555555-5555-5555-5555-555555555555', 'Shoes', true),
('f6666666-6666-6666-6666-666666666666', 'Mixed Clothes', true)
on conflict (id) do nothing;

-- Seed Units
insert into public.units (id, name) values
('kg', 'Kilograms'),
('pcs', 'Pieces'),
('pair', 'Pairs'),
('set', 'Sets')
on conflict (id) do nothing;

-- Seed Service Item Rates
insert into public.service_item_rates (service_id, item_id, unit_id, rate, effective_from, is_active) values
-- Wash & Fold (Billed by Kg)
('a1111111-1111-1111-1111-111111111111', 'f6666666-6666-6666-6666-666666666666', 'kg', 80.00, '2026-08-01T00:00:00Z', true),
-- Wash & Iron (Billed by Pcs)
('a2222222-2222-2222-2222-222222222222', 'f1111111-1111-1111-1111-111111111111', 'pcs', 20.00, '2026-08-01T00:00:00Z', true),
('a2222222-2222-2222-2222-222222222222', 'f2222222-2222-2222-2222-222222222222', 'pcs', 25.00, '2026-08-01T00:00:00Z', true),
('a2222222-2222-2222-2222-222222222222', 'f3333333-3333-3333-3333-333333333333', 'pcs', 60.00, '2026-08-01T00:00:00Z', true),
-- Steam Iron (Billed by Pcs)
('a3333333-3333-3333-3333-333333333333', 'f1111111-1111-1111-1111-111111111111', 'pcs', 12.00, '2026-08-01T00:00:00Z', true),
('a3333333-3333-3333-3333-333333333333', 'f2222222-2222-2222-2222-222222222222', 'pcs', 15.00, '2026-08-01T00:00:00Z', true),
('a3333333-3333-3333-3333-333333333333', 'f3333333-3333-3333-3333-333333333333', 'pcs', 30.00, '2026-08-01T00:00:00Z', true),
-- Dry Cleaning (Billed by Pcs)
('a4444444-4444-4444-4444-444444444444', 'f3333333-3333-3333-3333-333333333333', 'pcs', 150.00, '2026-08-01T00:00:00Z', true),
('a4444444-4444-4444-4444-444444444444', 'f4444444-4444-4444-4444-444444444444', 'pcs', 180.00, '2026-08-01T00:00:00Z', true),
-- Shoe Cleaning (Billed by Pair)
('a5555555-5555-5555-5555-555555555555', 'f5555555-5555-5555-5555-555555555555', 'pair', 250.00, '2026-08-01T00:00:00Z', true)
on conflict (service_id, item_id, unit_id, effective_from) do nothing;

-- Seed Expense Categories
insert into public.expense_categories (id, name, is_active) values
('ec111111-1111-1111-1111-111111111111', 'Rent', true),
('ec222222-2222-2222-2222-222222222222', 'Salary', true),
('ec333333-3333-3333-3333-333333333333', 'Electricity', true),
('ec444444-4444-4444-4444-444444444444', 'Water Supply', true),
('ec555555-5555-5555-5555-555555555555', 'Detergent & Chemicals', true),
('ec666666-6666-6666-6666-666666666666', 'Packaging Material', true),
('ec777777-7777-7777-7777-777777777777', 'Transport & Fuel', true)
on conflict (id) do nothing;

-- Seed Shelf Locations
insert into public.shelf_locations (id, code, branch_id, is_active) values
('e0111111-1111-1111-1111-111111111111', 'A-01', 'b1111111-1111-1111-1111-111111111111', true),
('e0222222-2222-2222-2222-222222222222', 'A-02', 'b1111111-1111-1111-1111-111111111111', true),
('e0333333-3333-3333-3333-333333333333', 'B-01', 'b1111111-1111-1111-1111-111111111111', true),
('e0444444-4444-4444-4444-444444444444', 'B-02', 'b1111111-1111-1111-1111-111111111111', true)
on conflict (id) do nothing;
