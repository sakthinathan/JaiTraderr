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
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- 4. Index OTP unlock records for fast verification lookups
CREATE INDEX IF NOT EXISTS idx_job_card_unlock_otps_jc_verified ON public.job_card_unlock_otps(job_card_id, is_verified, expires_at);
