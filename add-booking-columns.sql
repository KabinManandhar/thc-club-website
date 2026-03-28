-- =============================================================================
-- THC Club: Add Zone Tracking columns to shelf_bookings
-- Run this on your Supabase SQL editor to add the missing columns
-- =============================================================================

ALTER TABLE shelf_bookings
  ADD COLUMN IF NOT EXISTS section TEXT,
  ADD COLUMN IF NOT EXISTS section_tier TEXT;

-- Reload PostgREST schema cache so the API recognizes the new columns immediately
NOTIFY pgrst, 'reload schema';
