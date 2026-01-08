-- =====================================================
-- ATTENDANCE LOG TRACKING APP - SUPABASE SQL SCHEMA
-- =====================================================
-- Run this SQL in your Supabase SQL Editor to set up the database

-- 1. Create the 'people' table
-- =====================================================
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  role TEXT NULL,
  phone TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Create the 'attendance_logs' table
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  notes TEXT NULL,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(person_id, attendance_date)
);

-- 3. Create indexes for better query performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_attendance_logs_date ON attendance_logs(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_person ON attendance_logs(person_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_status ON attendance_logs(status);
CREATE INDEX IF NOT EXISTS idx_people_created_by ON people(created_by);

-- 4. Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for 'people' table
-- =====================================================

-- Policy: Authenticated users can read all people
CREATE POLICY "Authenticated users can read people"
  ON people
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert people (created_by must be their own ID)
CREATE POLICY "Authenticated users can insert people"
  ON people
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Policy: Authenticated users can update people they created
CREATE POLICY "Users can update people they created"
  ON people
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy: Authenticated users can delete people they created
CREATE POLICY "Users can delete people they created"
  ON people
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- 6. RLS Policies for 'attendance_logs' table
-- =====================================================

-- Policy: Authenticated users can read all attendance logs
CREATE POLICY "Authenticated users can read attendance_logs"
  ON attendance_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert attendance logs (recorded_by must be their own ID)
CREATE POLICY "Authenticated users can insert attendance_logs"
  ON attendance_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (recorded_by = auth.uid());

-- Policy: Authenticated users can update attendance logs they recorded
CREATE POLICY "Users can update attendance_logs they recorded"
  ON attendance_logs
  FOR UPDATE
  TO authenticated
  USING (recorded_by = auth.uid())
  WITH CHECK (recorded_by = auth.uid());

-- Policy: Authenticated users can delete attendance logs they recorded
CREATE POLICY "Users can delete attendance_logs they recorded"
  ON attendance_logs
  FOR DELETE
  TO authenticated
  USING (recorded_by = auth.uid());

-- =====================================================
-- OPTIONAL: More permissive policies for team collaboration
-- =====================================================
-- If you want ALL authenticated users to be able to update/delete ANY records
-- (not just their own), replace the update/delete policies above with these:

-- DROP POLICY IF EXISTS "Users can update people they created" ON people;
-- DROP POLICY IF EXISTS "Users can delete people they created" ON people;
-- DROP POLICY IF EXISTS "Users can update attendance_logs they recorded" ON attendance_logs;
-- DROP POLICY IF EXISTS "Users can delete attendance_logs they recorded" ON attendance_logs;

-- CREATE POLICY "Authenticated users can update any people"
--   ON people FOR UPDATE TO authenticated
--   USING (true) WITH CHECK (true);

-- CREATE POLICY "Authenticated users can delete any people"
--   ON people FOR DELETE TO authenticated
--   USING (true);

-- CREATE POLICY "Authenticated users can update any attendance_logs"
--   ON attendance_logs FOR UPDATE TO authenticated
--   USING (true) WITH CHECK (true);

-- CREATE POLICY "Authenticated users can delete any attendance_logs"
--   ON attendance_logs FOR DELETE TO authenticated
--   USING (true);

-- =====================================================
-- NOTE ON SERVICE ROLE
-- =====================================================
-- The service role key bypasses RLS entirely.
-- NEVER expose the service role key on the client side.
-- Only use it for server-side operations that need admin access.
-- This app uses only the anon key on the client for security.
