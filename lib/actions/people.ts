'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Person, ActionResult } from '@/lib/types';

export async function getPeople(): Promise<ActionResult<Person[]>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (_error) {
    return { success: false, error: 'Failed to fetch people' };
  }
}

export async function getPerson(id: string): Promise<ActionResult<Person>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (_error) {
    return { success: false, error: 'Failed to fetch person' };
  }
}

export async function createPerson(formData: FormData): Promise<ActionResult<Person>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const fullName = formData.get('full_name') as string;
    const role = formData.get('role') as string || null;
    const phone = formData.get('phone') as string || null;
    const email = formData.get('email') as string || null;
    const password = formData.get('password') as string || null;

    if (!fullName || fullName.trim() === '') {
      return { success: false, error: 'Full name is required' };
    }

    let newUserId: string | null = null;

    // If email and password provided, create user account using admin API
    if (email && email.trim() && password && password.trim()) {
      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' };
      }

      try {
        const adminClient = createAdminClient();
        
        // Create user with admin API (no email confirmation required)
        const { data: createUserData, error: createUserError } = await adminClient.auth.admin.createUser({
          email: email.trim(),
          password: password.trim(),
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: fullName.trim(),
          },
        });

        if (createUserError) {
          console.error('Admin createUser error:', createUserError);
          return { success: false, error: `Failed to create account: ${createUserError.message}` };
        }

        newUserId = createUserData.user?.id || null;

        // Add the new user as a member in user_roles
        if (newUserId) {
          const { error: roleError } = await adminClient.from('user_roles').insert({
            user_id: newUserId,
            role: 'member',
          });
          if (roleError) {
            console.error('Role insert error:', roleError);
          }
        }
      } catch (err) {
        console.error('Create user exception:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to create user account';
        return { success: false, error: errorMessage };
      }
    }

    // Create the person record
    const { data, error } = await supabase
      .from('people')
      .insert({
        full_name: fullName.trim(),
        role: role?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        user_id: newUserId,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/people');
    revalidatePath('/attendance');
    return { success: true, data };
  } catch {
    return { success: false, error: 'Failed to create person' };
  }
}

export async function updatePerson(id: string, formData: FormData): Promise<ActionResult<Person>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const fullName = formData.get('full_name') as string;
    const role = formData.get('role') as string || null;
    const phone = formData.get('phone') as string || null;
    const email = formData.get('email') as string || null;

    if (!fullName || fullName.trim() === '') {
      return { success: false, error: 'Full name is required' };
    }

    const { data, error } = await supabase
      .from('people')
      .update({
        full_name: fullName.trim(),
        role: role?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/people');
    revalidatePath(`/people/${id}`);
    revalidatePath('/attendance');
    revalidatePath('/logs');
    return { success: true, data };
  } catch (_error) {
    return { success: false, error: 'Failed to update person' };
  }
}

export async function deletePerson(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('people')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/people');
    revalidatePath('/attendance');
    revalidatePath('/logs');
    return { success: true, data: undefined };
  } catch (_error) {
    return { success: false, error: 'Failed to delete person' };
  }
}
