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
