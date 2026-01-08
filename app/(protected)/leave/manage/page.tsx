import { redirect } from 'next/navigation';
import { getCurrentUserRole } from '@/lib/actions/roles';
import ManageLeavePageClient from './ManageLeavePageClient';

export default async function ManageLeavePage() {
  const roleResult = await getCurrentUserRole();
  const role = roleResult.success ? roleResult.data : 'member';
  
  if (role !== 'admin') {
    redirect('/');
  }

  return <ManageLeavePageClient />;
}
