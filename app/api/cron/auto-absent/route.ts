import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// This endpoint marks users as absent if they haven't punched in by 1 PM
// Can be triggered by Vercel Cron, external cron service, or manually

export async function GET(request: Request) {
  try {
    // Verify the request is from a cron job (optional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // If CRON_SECRET is set, verify the authorization header
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    
    // Get current time in the server's timezone
    const now = new Date();
    const currentHour = now.getHours();
    
    // Only run if it's 1 PM or later (13:00+)
    if (currentHour < 13) {
      return NextResponse.json({
        success: true,
        message: `It's ${currentHour}:00, before 1 PM. No action needed.`,
        markedAbsent: 0,
      });
    }

    const today = now.toISOString().split('T')[0];

    // Get all people who are linked to user accounts (members)
    const { data: allPeople, error: peopleError } = await supabase
      .from('people')
      .select('id, full_name, user_id')
      .not('user_id', 'is', null);

    if (peopleError) {
      console.error('Error fetching people:', peopleError);
      return NextResponse.json({ error: peopleError.message }, { status: 500 });
    }

    if (!allPeople || allPeople.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No members found to process',
        markedAbsent: 0,
      });
    }

    // Get today's attendance records for all people
    const { data: existingAttendance, error: attendanceError } = await supabase
      .from('attendance_logs')
      .select('person_id, status, punch_in_time')
      .eq('attendance_date', today);

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
      return NextResponse.json({ error: attendanceError.message }, { status: 500 });
    }

    // Create a map of existing attendance
    const attendanceMap = new Map(
      (existingAttendance || []).map(a => [a.person_id, a])
    );

    // Find people who haven't punched in and don't have an attendance record yet
    const toMarkAbsent: { person_id: string; full_name: string }[] = [];

    for (const person of allPeople) {
      const attendance = attendanceMap.get(person.id);
      
      // Skip if:
      // - Already has a punch_in_time (they punched in)
      // - Already marked with a status (present, absent, leave, half-day)
      if (attendance?.punch_in_time || attendance?.status) {
        continue;
      }

      // This person hasn't punched in and doesn't have a status - mark them absent
      toMarkAbsent.push({
        person_id: person.id,
        full_name: person.full_name,
      });
    }

    if (toMarkAbsent.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All members have already punched in or have attendance recorded',
        markedAbsent: 0,
      });
    }

    // Insert/upsert absent records for these people
    const absentRecords = toMarkAbsent.map(person => ({
      person_id: person.person_id,
      attendance_date: today,
      status: 'absent' as const,
      notes: 'Auto-marked absent - no punch in before 1 PM',
      recorded_by: null, // System-generated
    }));

    const { error: upsertError } = await supabase
      .from('attendance_logs')
      .upsert(absentRecords, {
        onConflict: 'person_id,attendance_date',
      });

    if (upsertError) {
      console.error('Error marking absent:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    const markedNames = toMarkAbsent.map(p => p.full_name);

    return NextResponse.json({
      success: true,
      message: `Marked ${toMarkAbsent.length} member(s) as absent`,
      markedAbsent: toMarkAbsent.length,
      members: markedNames,
      executedAt: now.toISOString(),
    });

  } catch (error) {
    console.error('Auto-absent cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
