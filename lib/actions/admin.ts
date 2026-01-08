'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult, AttendanceLogWithPerson, LeaveRequest } from '@/lib/types';

interface LeaveStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  requests: LeaveRequest[];
}

export async function getPersonAttendanceLogs(personId: string): Promise<ActionResult<AttendanceLogWithPerson[]>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('attendance_logs')
      .select(`
        *,
        people:person_id (
          full_name,
          role
        )
      `)
      .eq('person_id', personId)
      .order('attendance_date', { ascending: false })
      .limit(100);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as AttendanceLogWithPerson[]) || [] };
  } catch {
    return { success: false, error: 'Failed to fetch attendance logs' };
  }
}

export async function getPersonLeaveStats(personId: string): Promise<ActionResult<LeaveStats>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('person_id', personId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const requests = (data as LeaveRequest[]) || [];
    const stats: LeaveStats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      requests,
    };

    return { success: true, data: stats };
  } catch {
    return { success: false, error: 'Failed to fetch leave stats' };
  }
}
