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
