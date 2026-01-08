import { redirect } from 'next/navigation';
import { getCurrentUserRole } from '@/lib/actions/roles';
import LogsPageClient from './LogsPageClient';

export default async function LogsPage() {
  const roleResult = await getCurrentUserRole();
  const role = roleResult.success ? roleResult.data : 'member';
  
  if (role !== 'admin') {
    redirect('/');
  }

  return <LogsPageClient />;
}
