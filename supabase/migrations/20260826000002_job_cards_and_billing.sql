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
