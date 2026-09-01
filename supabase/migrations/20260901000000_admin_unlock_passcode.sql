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
