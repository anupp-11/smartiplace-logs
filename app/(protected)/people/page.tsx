import { redirect } from 'next/navigation';
import { getCurrentUserRole } from '@/lib/actions/roles';
import PeoplePageClient from './PeoplePageClient';

export default async function PeoplePage() {
  const roleResult = await getCurrentUserRole();
  const role = roleResult.success ? roleResult.data : 'member';
  
  if (role !== 'admin') {
    redirect('/');
  }

  return <PeoplePageClient />;
}
