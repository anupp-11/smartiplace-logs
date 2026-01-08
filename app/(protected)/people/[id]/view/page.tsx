'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPerson } from '@/lib/actions/people';
import { getPersonAttendanceLogs, getPersonLeaveStats } from '@/lib/actions/admin';
import { Card, CardContent, CardHeader } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/Toast';
import type { Person, AttendanceLogWithPerson, LeaveRequest } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface LeaveStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  requests: LeaveRequest[];
}

export default function ViewPersonPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [person, setPerson] = useState<Person | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLogWithPerson[]>([]);
  const [leaveStats, setLeaveStats] = useState<LeaveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    
    const [personResult, logsResult, leaveResult] = await Promise.all([
      getPerson(id),
      getPersonAttendanceLogs(id),
      getPersonLeaveStats(id),
    ]);

    if (personResult.success) {
      setPerson(personResult.data);
    } else {
      showToast(personResult.error, 'error');
      router.push('/people');
      return;
    }

    if (logsResult.success) {
      setAttendanceLogs(logsResult.data);
    }

    if (leaveResult.success) {
      setLeaveStats(leaveResult.data);
    }

    setLoading(false);
  }, [id, router, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!person) {
    return null;
  }

  // Calculate attendance stats
  const presentDays = attendanceLogs.filter(l => l.status === 'present').length;
  const absentDays = attendanceLogs.filter(l => l.status === 'absent').length;
  const leaveDays = attendanceLogs.filter(l => l.status === 'leave').length;

  return (
    <div className="space-y-6">
      {ToastComponent}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 flex-shrink-0 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-indigo-600 font-bold text-xl">
              {person.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{person.full_name}</h1>
            <p className="text-gray-500">{person.role || 'No role assigned'}</p>
            {person.email && <p className="text-sm text-gray-400">{person.email}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/people/${id}`}>
            <Button variant="secondary">Edit</Button>
          </Link>
          <Link href="/people">
            <Button variant="ghost">Back to People</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{attendanceLogs.length}</p>
            <p className="text-xs text-gray-500">Total Records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-green-600">{presentDays}</p>
            <p className="text-xs text-gray-500">Present Days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-red-600">{absentDays}</p>
            <p className="text-xs text-gray-500">Absent Days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{leaveDays}</p>
            <p className="text-xs text-gray-500">Leave Days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{leaveStats?.pending || 0}</p>
            <p className="text-xs text-gray-500">Pending Leaves</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-green-600">{leaveStats?.approved || 0}</p>
            <p className="text-xs text-gray-500">Approved Leaves</p>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Leave Requests</h2>
        </CardHeader>
        <CardContent>
          {!leaveStats || leaveStats.requests.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No leave requests found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaveStats.requests.map((leave) => {
                    const fromDate = new Date(leave.start_date);
                    const toDate = new Date(leave.end_date);
                    const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    
                    return (
                      <tr key={leave.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                          {leave.leave_type.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(leave.start_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(leave.end_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {days}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                            leave.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {leave.reason || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Logs */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Recent Attendance Logs</h2>
        </CardHeader>
        <CardContent>
          {attendanceLogs.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No attendance records found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Punch In</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Punch Out</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceLogs.slice(0, 30).map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.attendance_date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.status === 'present' ? 'bg-green-100 text-green-800' :
                          log.status === 'leave' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(log.punch_in_time)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(log.punch_out_time)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {log.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
