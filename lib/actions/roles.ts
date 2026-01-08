'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult, UserRole } from '@/lib/types';

export async function getCurrentUserRole(): Promise<ActionResult<UserRole>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: roleData, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (error || !roleData) {
      // No role found, default to member
      return { success: true, data: 'member' };
    }

    return { success: true, data: roleData.role as UserRole };
  } catch (_error) {
    return { success: false, error: 'Failed to get user role' };
  }
}

export async function isAdmin(): Promise<boolean> {
  const result = await getCurrentUserRole();
  return result.success && result.data === 'admin';
}

export async function getMyPersonProfile(): Promise<ActionResult<{ id: string; full_name: string; email: string | null }>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: person, error } = await supabase
      .from('people')
      .select('id, full_name, email')
      .eq('user_id', user.id)
      .single();

    if (error || !person) {
      return { success: false, error: 'No person profile linked to your account' };
    }

    return { success: true, data: person };
  } catch (_error) {
    return { success: false, error: 'Failed to get person profile' };
  }
}

export async function setUserRole(userId: string, role: UserRole): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if current user is admin
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return { success: false, error: 'Only admins can set user roles' };
    }

    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: role,
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/people');
    return { success: true, data: undefined };
  } catch (_error) {
    return { success: false, error: 'Failed to set user role' };
  }
}

export async function linkPersonToUser(personId: string, email: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if current user is admin
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return { success: false, error: 'Only admins can link accounts' };
    }

    // Check if email is already linked to another person
    const { data: existingPerson } = await supabase
      .from('people')
      .select('id')
      .eq('email', email)
      .neq('id', personId)
      .single();

    if (existingPerson) {
      return { success: false, error: 'This email is already linked to another person' };
    }

    // Check if user exists with this email
    // Note: We just store the email, actual linking happens when user signs up with that email
    const { error } = await supabase
      .from('people')
      .update({ email: email })
      .eq('id', personId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/people');
    return { success: true, data: undefined };
  } catch (_error) {
    return { success: false, error: 'Failed to link person to user' };
  }
}

// This function is called on login to auto-link person by email
export async function autoLinkPersonOnLogin(): Promise<void> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;

    // Check if user already has a linked person
    const { data: existingLink } = await supabase
      .from('people')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingLink) return; // Already linked

    // Find person by email and link
    const { data: person } = await supabase
      .from('people')
      .select('id')
      .eq('email', user.email)
      .is('user_id', null)
      .single();

    if (person) {
      await supabase
        .from('people')
        .update({ user_id: user.id })
        .eq('id', person.id);
    }
  } catch (_error) {
    // Silently fail - this is a background operation
    console.error('Auto-link failed:', _error);
  }
}
