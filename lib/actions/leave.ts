'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult, LeaveRequest, LeaveRequestWithPerson, LeaveType } from '@/lib/types';

export async function getMyLeaveRequests(): Promise<ActionResult<LeaveRequestWithPerson[]>> {
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
      .from('leave_requests')
      .select('*, people!inner(full_name, role)')
      .eq('person_id', person.id)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as LeaveRequestWithPerson[]) || [] };
  } catch (_error) {
    return { success: false, error: 'Failed to fetch leave requests' };
  }
}

export async function getAllLeaveRequests(statusFilter?: string): Promise<ActionResult<LeaveRequestWithPerson[]>> {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('leave_requests')
      .select('*, people!inner(full_name, role)')
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as LeaveRequestWithPerson[]) || [] };
  } catch (_error) {
    return { success: false, error: 'Failed to fetch leave requests' };
  }
}

export async function createLeaveRequest(formData: FormData): Promise<ActionResult<LeaveRequest>> {
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

    const startDate = formData.get('start_date') as string;
    const endDate = formData.get('end_date') as string;
    const leaveType = formData.get('leave_type') as LeaveType;
    const reason = formData.get('reason') as string;

    if (!startDate || !endDate || !leaveType) {
      return { success: false, error: 'Start date, end date, and leave type are required' };
    }

    if (new Date(endDate) < new Date(startDate)) {
      return { success: false, error: 'End date must be after or equal to start date' };
    }

    // Check for overlapping leave requests
    const { data: existing } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('person_id', person.id)
      .neq('status', 'rejected')
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: 'You already have a leave request for overlapping dates' };
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        person_id: person.id,
        start_date: startDate,
        end_date: endDate,
        leave_type: leaveType,
        reason: reason || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/leave');
    revalidatePath('/leave/manage');
    return { success: true, data };
  } catch (_error) {
    return { success: false, error: 'Failed to create leave request' };
  }
}

export async function cancelLeaveRequest(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get person linked to this user
    const { data: person } = await supabase
      .from('people')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Verify the leave request belongs to this person and is pending
    const { data: request, error: requestError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (requestError || !request) {
      return { success: false, error: 'Leave request not found' };
    }

    if (person && request.person_id !== person.id) {
      return { success: false, error: 'You can only cancel your own leave requests' };
    }

    if (request.status !== 'pending') {
      return { success: false, error: 'You can only cancel pending leave requests' };
    }

    const { error } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/leave');
    revalidatePath('/leave/manage');
    return { success: true, data: undefined };
  } catch (_error) {
    return { success: false, error: 'Failed to cancel leave request' };
  }
}

export async function reviewLeaveRequest(
  id: string, 
  action: 'approved' | 'rejected',
  reviewNotes?: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: action,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    // If approved, mark those days as leave in attendance_logs
    if (action === 'approved') {
      const { data: request } = await supabase
        .from('leave_requests')
        .select('person_id, start_date, end_date')
        .eq('id', id)
        .single();

      if (request) {
        const start = new Date(request.start_date);
        const end = new Date(request.end_date);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          
          await supabase
            .from('attendance_logs')
            .upsert({
              person_id: request.person_id,
              attendance_date: dateStr,
              status: 'leave',
              recorded_by: user.id,
            }, {
              onConflict: 'person_id,attendance_date',
            });
        }
      }
    }

    revalidatePath('/leave');
    revalidatePath('/leave/manage');
    revalidatePath('/logs');
    return { success: true, data: undefined };
  } catch (_error) {
    return { success: false, error: 'Failed to review leave request' };
  }
}
