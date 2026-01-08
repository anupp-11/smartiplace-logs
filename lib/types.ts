// Database types for the Attendance Log Tracking app

export type UserRole = 'admin' | 'member';

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface Person {
  id: string;
  full_name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  user_id: string | null;
  created_at: string;
  created_by: string | null;
}

export interface AttendanceLog {
  id: string;
  person_id: string;
  attendance_date: string;
  status: 'present' | 'absent' | 'leave' | 'half-day';
  notes: string | null;
  punch_in_time: string | null;
  punch_out_time: string | null;
  punch_in_latitude: number | null;
  punch_in_longitude: number | null;
  punch_in_address: string | null;
  punch_out_latitude: number | null;
  punch_out_longitude: number | null;
  punch_out_address: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface AttendanceLogWithPerson extends AttendanceLog {
  people: {
    full_name: string;
    role: string | null;
  };
}

export interface AttendanceRecord {
  person_id: string;
  full_name: string;
  role: string | null;
  status: 'present' | 'absent' | 'leave' | 'half-day' | null;
  notes: string | null;
  existing_id: string | null;
}

export type LeaveType = 'sick' | 'casual' | 'annual' | 'emergency' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  person_id: string;
  start_date: string;
  end_date: string;
  leave_type: LeaveType;
  reason: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export interface LeaveRequestWithPerson extends LeaveRequest {
  people: {
    full_name: string;
    role: string | null;
  };
}

export interface LogFilters {
  dateFrom?: string;
  dateTo?: string;
  personId?: string;
  status?: 'present' | 'absent' | 'leave' | 'half-day' | '';
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ActionResult<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string };

export interface TodayPunchStatus {
  hasPunchedIn: boolean;
  hasPunchedOut: boolean;
  punchInTime: string | null;
  punchOutTime: string | null;
  status: 'present' | 'absent' | 'leave' | 'half-day' | null;
  attendanceId: string | null;
}

export interface PunchLocation {
  latitude: number;
  longitude: number;
  address?: string;
}
