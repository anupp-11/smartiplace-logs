import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/Card';
import { getDashboardStats, getTodayAttendanceWithLocation } from '@/lib/actions/attendance';
import { getCurrentUserRole } from '@/lib/actions/roles';
import { getAllLeaveRequests } from '@/lib/actions/leave';
import MemberDashboardClient from './MemberDashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const roleResult = await getCurrentUserRole();
  const userRole = roleResult.success ? roleResult.data : 'member';
  
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (userRole === 'admin') {
    return <AdminDashboard today={today} />;
  } else {
    return <MemberDashboardClient today={today} />;
  }
}

async function AdminDashboard({ today }: { today: string }) {
  const [statsResult, pendingLeavesResult, todayPunchesResult] = await Promise.all([
    getDashboardStats(),
    getAllLeaveRequests('pending'),
    getTodayAttendanceWithLocation(),
  ]);
  
  const stats = statsResult.success ? statsResult.data : {
    totalPeople: 0,
    todayPresent: 0,
    todayAbsent: 0,
    todayPending: 0,
  };

  const pendingLeaves = pendingLeavesResult.success ? pendingLeavesResult.data : [];
  const todayPunches = todayPunchesResult.success ? todayPunchesResult.data : [];

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getGoogleMapsUrl = (lat: number | null, lng: number | null) => {
    if (!lat || !lng) return null;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">{today}</p>
      </div>

      {!statsResult.success && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Failed to load dashboard stats. Please refresh the page.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total People</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalPeople}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Present Today</p>
                <p className="text-2xl font-semibold text-green-600">{stats.todayPresent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Absent Today</p>
                <p className="text-2xl font-semibold text-red-600">{stats.todayAbsent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Today</p>
                <p className="text-2xl font-semibold text-yellow-600">{stats.todayPending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/people"
              className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-indigo-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span className="font-medium text-indigo-700">Manage People</span>
              </div>
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            
            <Link
              href="/logs"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-gray-700">Attendance Logs</span>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/leave/manage"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium text-gray-700">Leave Requests</span>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Summary</h2>
          </CardHeader>
          <CardContent>
            {stats.totalPeople === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No people added yet.</p>
                <Link
                  href="/people"
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Add Your First Person
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Attendance Rate</span>
                  <span className="font-semibold text-gray-900">
                    {stats.totalPeople > 0
                      ? Math.round(((stats.todayPresent + stats.todayAbsent) / stats.totalPeople) * 100)
                      : 0}
                    % recorded
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all"
                    style={{
                      width: `${stats.totalPeople > 0 ? ((stats.todayPresent + stats.todayAbsent) / stats.totalPeople) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.todayPresent}</p>
                    <p className="text-xs text-gray-500">Present</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{stats.todayAbsent}</p>
                    <p className="text-xs text-gray-500">Absent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{stats.todayPending}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Leave Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Pending Leave Requests</h2>
            {pendingLeaves.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {pendingLeaves.length} pending
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingLeaves.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No pending leave requests</p>
          ) : (
            <div className="space-y-3">
              {pendingLeaves.slice(0, 5).map((leave) => {
                const fromDate = new Date(leave.start_date);
                const toDate = new Date(leave.end_date);
                const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                
                return (
                  <div key={leave.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-yellow-700 font-medium text-sm">
                          {leave.people.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{leave.people.full_name}</p>
                        <p className="text-sm text-gray-500">
                          {leave.leave_type.replace('_', ' ')} • {days} day{days > 1 ? 's' : ''} • {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/leave/manage"
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      Review
                    </Link>
                  </div>
                );
              })}
              {pendingLeaves.length > 5 && (
                <Link
                  href="/leave/manage"
                  className="block text-center text-sm text-indigo-600 hover:text-indigo-800 py-2"
                >
                  View all {pendingLeaves.length} pending requests →
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Punches with Location */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Punches</h2>
            {todayPunches.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {todayPunches.length} checked in
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {todayPunches.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No punches recorded today</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Punch In</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">In Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Punch Out</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Out Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {todayPunches.slice(0, 10).map((punch) => (
                    <tr key={punch.id}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 flex-shrink-0 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-700 font-medium text-xs">
                              {punch.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">{punch.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatTime(punch.punch_in_time)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {punch.punch_in_latitude && punch.punch_in_longitude ? (
                          <a
                            href={getGoogleMapsUrl(punch.punch_in_latitude, punch.punch_in_longitude) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            View Map
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatTime(punch.punch_out_time)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {punch.punch_out_latitude && punch.punch_out_longitude ? (
                          <a
                            href={getGoogleMapsUrl(punch.punch_out_latitude, punch.punch_out_longitude) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            View Map
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {todayPunches.length > 10 && (
                <Link
                  href="/logs"
                  className="block text-center text-sm text-indigo-600 hover:text-indigo-800 py-3 border-t"
                >
                  View all {todayPunches.length} punches →
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
