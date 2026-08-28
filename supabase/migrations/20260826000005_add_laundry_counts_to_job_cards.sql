-- Migration: Add operational laundry volume metrics (Kg, Pcs, Bags) to job_cards
ALTER TABLE public.job_cards 
ADD COLUMN total_weight_kg numeric(10,2) default 0.00,
ADD COLUMN total_pcs integer default 0,
ADD COLUMN total_bags integer default 0;
