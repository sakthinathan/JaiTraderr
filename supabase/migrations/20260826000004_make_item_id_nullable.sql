-- Migration: Make item_id nullable to support custom/manual laundry items
ALTER TABLE public.job_card_items ALTER COLUMN item_id DROP NOT NULL;
