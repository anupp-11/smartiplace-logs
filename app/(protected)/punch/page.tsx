import { redirect } from 'next/navigation';
import { getCurrentUserRole } from '@/lib/actions/roles';
import PunchPageClient from './PunchPageClient';

export default async function PunchPage() {
  const roleResult = await getCurrentUserRole();
  const role = roleResult.success ? roleResult.data : 'member';
  
  // Only members can access punch page
  if (role !== 'member') {
    redirect('/');
  }

  return <PunchPageClient />;
}
