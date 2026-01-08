import { redirect } from 'next/navigation';
import { getCurrentUserRole } from '@/lib/actions/roles';
import LeavePageClient from './LeavePageClient';

export default async function LeavePage() {
  const roleResult = await getCurrentUserRole();
  const role = roleResult.success ? roleResult.data : 'member';
  
  // Only members can apply for leave
  if (role !== 'member') {
    redirect('/');
  }

  return <LeavePageClient />;
}
