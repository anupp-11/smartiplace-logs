-- Migration: Add location tracking to attendance_logs
-- Run this in Supabase SQL Editor

-- Add location columns for punch in
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS punch_in_latitude DECIMAL(10, 8);
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS punch_in_longitude DECIMAL(11, 8);
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS punch_in_address TEXT;

-- Add location columns for punch out
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS punch_out_latitude DECIMAL(10, 8);
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS punch_out_longitude DECIMAL(11, 8);
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS punch_out_address TEXT;

-- Create index for faster location-based queries (optional)
CREATE INDEX IF NOT EXISTS idx_attendance_logs_punch_in_location 
  ON attendance_logs (punch_in_latitude, punch_in_longitude) 
  WHERE punch_in_latitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_logs_punch_out_location 
  ON attendance_logs (punch_out_latitude, punch_out_longitude) 
  WHERE punch_out_latitude IS NOT NULL;
