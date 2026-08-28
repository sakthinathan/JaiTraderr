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

-- Only server-side contexts (Server Actions using Service Role Key or authenticated admins) 
-- will read/write to this table directly.
create policy "Allow server-side access to OTP verification"
    on public.job_card_unlock_otps
    for all
    to service_role
    using (true)
    with check (true);
