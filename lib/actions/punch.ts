'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult, TodayPunchStatus, AttendanceLogWithPerson } from '@/lib/types';

export async function getCurrentUserPerson(): Promise<ActionResult<{ id: string; full_name: string }>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: person, error: personError } = await supabase
      .from('people')
      .select('id, full_name')
      .eq('user_id', user.id)
      .single();

    if (personError || !person) {
      return { success: false, error: 'Your account is not linked to a person profile.' };
    }

    return { success: true, data: person };
  } catch (_error) {
    return { success: false, error: 'Failed to get user profile' };
  }
}

export async function getTodayPunchStatus(): Promise<ActionResult<TodayPunchStatus>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get person linked to this user
    const { data: person, error: personError } = await supabase
      .from('people')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (personError || !person) {
      return { success: false, error: 'Your account is not linked to a person profile. Contact admin.' };
    }

    const today = new Date().toISOString().split('T')[0];

    // Get today's attendance
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('person_id', person.id)
      .eq('attendance_date', today)
      .single();

    if (attendanceError && attendanceError.code !== 'PGRST116') {
      return { success: false, error: attendanceError.message };
    }

    return {
      success: true,
      data: {
        hasPunchedIn: !!attendance?.punch_in_time,
        hasPunchedOut: !!attendance?.punch_out_time,
        punchInTime: attendance?.punch_in_time || null,
        punchOutTime: attendance?.punch_out_time || null,
        status: attendance?.status || null,
        attendanceId: attendance?.id || null,
      },
    };
  } catch (_error) {
    return { success: false, error: 'Failed to get punch status' };
  }
}

export async function punchIn(): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get person linked to this user
    const { data: person, error: personError } = await supabase
      .from('people')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (personError || !person) {
      return { success: false, error: 'Your account is not linked to a person profile. Contact admin.' };
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Check if already punched in today
    const { data: existing } = await supabase
      .from('attendance_logs')
      .select('id, punch_in_time')
      .eq('person_id', person.id)
      .eq('attendance_date', today)
      .single();

    if (existing?.punch_in_time) {
      return { success: false, error: 'You have already punched in today' };
    }

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('attendance_logs')
        .update({
          punch_in_time: now,
          status: 'present',
        })
        .eq('id', existing.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Create new record
      const { error } = await supabase
        .from('attendance_logs')
        .insert({
          person_id: person.id,
          attendance_date: today,
          status: 'present',
          punch_in_time: now,
          recorded_by: user.id,
        });

      if (error) {
        return { success: false, error: error.message };
      }
    }

    revalidatePath('/punch');
    revalidatePath('/my-logs');
    return { success: true, data: undefined };
  } catch (_error) {
    return { success: false, error: 'Failed to punch in' };
  }
}

export async function punchOut(): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get person linked to this user
    const { data: person, error: personError } = await supabase
      .from('people')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (personError || !person) {
      return { success: false, error: 'Your account is not linked to a person profile. Contact admin.' };
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Get today's attendance
    const { data: existing, error: existingError } = await supabase
      .from('attendance_logs')
      .select('id, punch_in_time, punch_out_time')
      .eq('person_id', person.id)
      .eq('attendance_date', today)
      .single();

    if (existingError || !existing) {
      return { success: false, error: 'You need to punch in first' };
    }

    if (!existing.punch_in_time) {
      return { success: false, error: 'You need to punch in first' };
    }

    if (existing.punch_out_time) {
      return { success: false, error: 'You have already punched out today' };
    }

    const { error } = await supabase
      .from('attendance_logs')
      .update({
        punch_out_time: now,
      })
      .eq('id', existing.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/punch');
    revalidatePath('/my-logs');
    return { success: true, data: undefined };
  } catch (_error) {
    return { success: false, error: 'Failed to punch out' };
  }
}

export async function getMyAttendanceLogs(limit: number = 30): Promise<ActionResult<AttendanceLogWithPerson[]>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get person linked to this user
    const { data: person, error: personError } = await supabase
      .from('people')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (personError || !person) {
      return { success: false, error: 'Your account is not linked to a person profile. Contact admin.' };
    }

    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*, people!inner(full_name, role)')
      .eq('person_id', person.id)
      .order('attendance_date', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as AttendanceLogWithPerson[]) || [] };
  } catch (_error) {
    return { success: false, error: 'Failed to fetch attendance logs' };
  }
}
