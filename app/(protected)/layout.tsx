import { Navbar } from '@/components/Navbar';
import { getCurrentUserRole } from '@/lib/actions/roles';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const roleResult = await getCurrentUserRole();
  const userRole = roleResult.success ? roleResult.data : 'member';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userRole={userRole} />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
