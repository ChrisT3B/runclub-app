-- ============================================
-- C25k Buddy System: Database Schema Updates
-- ============================================
-- Run this BEFORE deploying the code changes.
-- Adds booking_type column to run_bookings table
-- to distinguish C25k participants from buddies.
-- ============================================

-- Add booking_type column to run_bookings
ALTER TABLE run_bookings ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'standard';

-- Backfill existing bookings to standard type
UPDATE run_bookings SET booking_type = 'standard' WHERE booking_type IS NULL;

-- Add documentation comment
COMMENT ON COLUMN run_bookings.booking_type IS 'Type of booking: standard (regular runs), c25k_participant (C25k runner on C25k run), buddy (support buddy on C25k run)';
