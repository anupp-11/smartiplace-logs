'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { AttendanceRecord, AttendanceLogWithPerson, LogFilters, PaginatedResponse, ActionResult } from '@/lib/types';

export async function getAttendanceForDate(date: string): Promise<ActionResult<AttendanceRecord[]>> {
  try {
    const supabase = await createClient();
    
    // Get all people
    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('id, full_name, role')
      .order('full_name', { ascending: true });

    if (peopleError) {
      return { success: false, error: peopleError.message };
    }

    // Get attendance records for the date
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('attendance_date', date);

    if (attendanceError) {
      return { success: false, error: attendanceError.message };
    }

    // Merge people with their attendance records
    const records: AttendanceRecord[] = (people || []).map((person) => {
      const record = attendance?.find((a) => a.person_id === person.id);
      return {
        person_id: person.id,
        full_name: person.full_name,
        role: person.role,
        status: record?.status || null,
        notes: record?.notes || null,
        existing_id: record?.id || null,
      };
    });

    return { success: true, data: records };
  } catch (_error) {
    return { success: false, error: 'Failed to fetch attendance records' };
  }
}

interface AttendanceInput {
  person_id: string;
  status: 'present' | 'absent' | 'leave' | 'half-day';
  notes: string | null;
}

export async function saveAttendance(date: string, records: AttendanceInput[]): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (records.length === 0) {
      return { success: false, error: 'No attendance records to save' };
    }

    // Prepare upsert data
    const upsertData = records.map((record) => ({
      person_id: record.person_id,
      attendance_date: date,
      status: record.status,
      notes: record.notes,
      recorded_by: user.id,
    }));

    // Use upsert with conflict on (person_id, attendance_date)
    const { error } = await supabase
      .from('attendance_logs')
      .upsert(upsertData, {
        onConflict: 'person_id,attendance_date',
      });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/attendance');
    revalidatePath('/logs');
    return { success: true, data: undefined };
  } catch (_error) {
    return { success: false, error: 'Failed to save attendance' };
  }
}

export async function getAttendanceLogs(filters: LogFilters): Promise<ActionResult<PaginatedResponse<AttendanceLogWithPerson>>> {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('attendance_logs')
      .select('*, people!inner(full_name, role)', { count: 'exact' });

    // Apply filters
    if (filters.dateFrom) {
      query = query.gte('attendance_date', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('attendance_date', filters.dateTo);
    }
    if (filters.personId) {
      query = query.eq('person_id', filters.personId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Get total count first
    const { count } = await query;

    // Apply pagination
    const offset = (filters.page - 1) * filters.limit;
    query = supabase
      .from('attendance_logs')
      .select('*, people!inner(full_name, role)')
      .order('attendance_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + filters.limit - 1);

    // Re-apply filters for the paginated query
    if (filters.dateFrom) {
      query = query.gte('attendance_date', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('attendance_date', filters.dateTo);
    }
    if (filters.personId) {
      query = query.eq('person_id', filters.personId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / filters.limit);

    return {
      success: true,
      data: {
        data: (data as AttendanceLogWithPerson[]) || [],
        count: totalCount,
        page: filters.page,
        limit: filters.limit,
        totalPages,
      },
    };
  } catch (_error) {
    return { success: false, error: 'Failed to fetch attendance logs' };
  }
}

export async function getAllFilteredLogs(filters: Omit<LogFilters, 'page' | 'limit'>): Promise<ActionResult<AttendanceLogWithPerson[]>> {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('attendance_logs')
      .select('*, people!inner(full_name, role)')
      .order('attendance_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.dateFrom) {
      query = query.gte('attendance_date', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('attendance_date', filters.dateTo);
    }
    if (filters.personId) {
      query = query.eq('person_id', filters.personId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as AttendanceLogWithPerson[]) || [] };
  } catch (_error) {
    return { success: false, error: 'Failed to fetch attendance logs for export' };
  }
}

export async function getDashboardStats(): Promise<ActionResult<{
  totalPeople: number;
  todayPresent: number;
  todayAbsent: number;
  todayPending: number;
}>> {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // Get total people count
    const { count: totalPeople } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true });

    // Get today's attendance
    const { data: todayAttendance } = await supabase
      .from('attendance_logs')
      .select('status')
      .eq('attendance_date', today);

    const todayPresent = todayAttendance?.filter(a => a.status === 'present').length || 0;
    const todayAbsent = todayAttendance?.filter(a => a.status === 'absent').length || 0;
    const todayPending = (totalPeople || 0) - todayPresent - todayAbsent;

    return {
      success: true,
      data: {
        totalPeople: totalPeople || 0,
        todayPresent,
        todayAbsent,
        todayPending,
      },
    };
  } catch (_error) {
    return { success: false, error: 'Failed to fetch dashboard stats' };
  }
}

export interface TodayAttendanceWithLocation {
  id: string;
  person_id: string;
  full_name: string;
  status: 'present' | 'absent' | 'leave' | 'half-day';
  punch_in_time: string | null;
  punch_out_time: string | null;
  punch_in_latitude: number | null;
  punch_in_longitude: number | null;
  punch_out_latitude: number | null;
  punch_out_longitude: number | null;
}

export async function getTodayAttendanceWithLocation(): Promise<ActionResult<TodayAttendanceWithLocation[]>> {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendance_logs')
      .select(`
        id,
        person_id,
        status,
        punch_in_time,
        punch_out_time,
        punch_in_latitude,
        punch_in_longitude,
        punch_out_latitude,
        punch_out_longitude,
        people!inner(full_name)
      `)
      .eq('attendance_date', today)
      .not('punch_in_time', 'is', null)
      .order('punch_in_time', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const result: TodayAttendanceWithLocation[] = (data || []).map((record) => {
      const people = record.people as unknown as { full_name: string };
      return {
        id: record.id,
        person_id: record.person_id,
        full_name: people.full_name,
        status: record.status,
        punch_in_time: record.punch_in_time,
        punch_out_time: record.punch_out_time,
        punch_in_latitude: record.punch_in_latitude,
        punch_in_longitude: record.punch_in_longitude,
        punch_out_latitude: record.punch_out_latitude,
        punch_out_longitude: record.punch_out_longitude,
      };
    });

    return { success: true, data: result };
  } catch (_error) {
    return { success: false, error: 'Failed to fetch today attendance with location' };
  }
}
