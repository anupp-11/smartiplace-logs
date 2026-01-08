-- =====================================================
-- ATTENDANCE LOG TRACKING APP - MIGRATION SQL
-- =====================================================
-- Run this SQL in Supabase SQL Editor to add:
-- - Member self-service login
-- - Punch In/Out with timestamps
-- - Leave requests
-- =====================================================

-- =====================================================
-- STEP 1: Drop existing policies (to recreate with new logic)
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can read people" ON people;
DROP POLICY IF EXISTS "Authenticated users can insert people" ON people;
DROP POLICY IF EXISTS "Users can update people they created" ON people;
DROP POLICY IF EXISTS "Users can delete people they created" ON people;
DROP POLICY IF EXISTS "Authenticated users can read attendance_logs" ON attendance_logs;
DROP POLICY IF EXISTS "Authenticated users can insert attendance_logs" ON attendance_logs;
DROP POLICY IF EXISTS "Users can update attendance_logs they recorded" ON attendance_logs;
DROP POLICY IF EXISTS "Users can delete attendance_logs they recorded" ON attendance_logs;

-- =====================================================
-- STEP 2: Add new columns to 'people' table
-- =====================================================
-- Link people to auth users (for member login)
ALTER TABLE people ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add email for invitations
ALTER TABLE people ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- =====================================================
-- STEP 3: Add punch timestamps to 'attendance_logs'
-- =====================================================
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS punch_in_time TIMESTAMPTZ;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS punch_out_time TIMESTAMPTZ;

-- Update status check to include 'leave'
ALTER TABLE attendance_logs DROP CONSTRAINT IF EXISTS attendance_logs_status_check;
ALTER TABLE attendance_logs ADD CONSTRAINT attendance_logs_status_check 
  CHECK (status IN ('present', 'absent', 'leave', 'half-day'));

-- =====================================================
-- STEP 4: Create 'user_roles' table for admin/member distinction
-- =====================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Everyone can read roles (needed for UI)
CREATE POLICY "Users can read all roles"
  ON user_roles FOR SELECT TO authenticated
  USING (true);

-- Only admins can manage roles
CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR NOT EXISTS (SELECT 1 FROM user_roles) -- First user becomes admin
  );

CREATE POLICY "Admins can update roles"
  ON user_roles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete roles"
  ON user_roles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- =====================================================
-- STEP 5: Create 'leave_requests' table
-- =====================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('sick', 'casual', 'annual', 'emergency', 'other')),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Enable RLS on leave_requests
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_person ON leave_requests(person_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_people_user_id ON people(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- =====================================================
-- STEP 6: Helper function to check if user is admin
-- =====================================================
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = check_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 7: Helper function to get person_id for current user
-- =====================================================
CREATE OR REPLACE FUNCTION get_my_person_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM people WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 8: New RLS Policies for 'people' table
-- =====================================================

-- Everyone can read all people
CREATE POLICY "Authenticated users can read people"
  ON people FOR SELECT TO authenticated
  USING (true);

-- Only admins can create people (or first user if no admins exist)
CREATE POLICY "Admins can insert people"
  ON people FOR INSERT TO authenticated
  WITH CHECK (
    is_admin(auth.uid()) 
    OR NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'admin')
  );

-- Admins can update any, members can update their own profile
CREATE POLICY "Users can update people"
  ON people FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR user_id = auth.uid())
  WITH CHECK (is_admin(auth.uid()) OR user_id = auth.uid());

-- Only admins can delete people
CREATE POLICY "Admins can delete people"
  ON people FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- =====================================================
-- STEP 9: New RLS Policies for 'attendance_logs' table
-- =====================================================

-- Admins can read all, members can read their own
CREATE POLICY "Users can read attendance_logs"
  ON attendance_logs FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid()) 
    OR person_id = get_my_person_id()
  );

-- Admins can insert for anyone, members only for themselves
CREATE POLICY "Users can insert attendance_logs"
  ON attendance_logs FOR INSERT TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
    OR (person_id = get_my_person_id() AND recorded_by = auth.uid())
  );

-- Admins can update any, members only their own
CREATE POLICY "Users can update attendance_logs"
  ON attendance_logs FOR UPDATE TO authenticated
  USING (
    is_admin(auth.uid())
    OR (person_id = get_my_person_id() AND recorded_by = auth.uid())
  );

-- Only admins can delete
CREATE POLICY "Admins can delete attendance_logs"
  ON attendance_logs FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- =====================================================
-- STEP 10: RLS Policies for 'leave_requests' table
-- =====================================================

-- Admins can read all, members can read their own
CREATE POLICY "Users can read leave_requests"
  ON leave_requests FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR person_id = get_my_person_id()
  );

-- Members can create their own leave requests
CREATE POLICY "Users can insert leave_requests"
  ON leave_requests FOR INSERT TO authenticated
  WITH CHECK (
    person_id = get_my_person_id()
    AND status = 'pending' -- Can only create pending requests
  );

-- Admins can update (approve/reject), members can update pending ones
CREATE POLICY "Users can update leave_requests"
  ON leave_requests FOR UPDATE TO authenticated
  USING (
    is_admin(auth.uid())
    OR (person_id = get_my_person_id() AND status = 'pending')
  );

-- Only admins can delete
CREATE POLICY "Admins can delete leave_requests"
  ON leave_requests FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- =====================================================
-- STEP 11: Make first user an admin automatically
-- =====================================================
-- Run this after creating your first user to make them admin:
-- INSERT INTO user_roles (user_id, role) VALUES ('YOUR-USER-ID-HERE', 'admin');

-- Or use this function to promote a user by email:
CREATE OR REPLACE FUNCTION make_admin_by_email(admin_email TEXT)
RETURNS VOID AS $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = admin_email;
  IF target_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role) 
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- USAGE: Make yourself admin
-- =====================================================
-- After running this migration, run this to make yourself admin:
-- SELECT make_admin_by_email('your-email@example.com');
