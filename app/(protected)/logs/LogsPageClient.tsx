'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAttendanceLogs, getAllFilteredLogs } from '@/lib/actions/attendance';
import { getPeople } from '@/lib/actions/people';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Card, CardContent, CardHeader } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Pagination } from '@/components/Pagination';
import { useToast } from '@/components/Toast';
import type { AttendanceLogWithPerson, Person, LogFilters } from '@/lib/types';

const ITEMS_PER_PAGE = 50;

export default function LogsPageClient() {
  const [logs, setLogs] = useState<AttendanceLogWithPerson[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { showToast, ToastComponent } = useToast();

  const [filters, setFilters] = useState<LogFilters>({
    dateFrom: '',
    dateTo: '',
    personId: '',
    status: '',
    page: 1,
    limit: ITEMS_PER_PAGE,
  });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const result = await getAttendanceLogs(filters);
    if (result.success) {
      setLogs(result.data.data);
      setTotalPages(result.data.totalPages);
      setTotalCount(result.data.count);
    } else {
      showToast(result.error, 'error');
    }
    setLoading(false);
  }, [filters]);

  const loadPeople = async () => {
    const result = await getPeople();
    if (result.success) {
      setPeople(result.data);
    }
  };

  useEffect(() => {
    loadPeople();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleFilterChange = (key: keyof LogFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? (value as number) : 1, // Reset page when other filters change
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      personId: '',
      status: '',
      page: 1,
      limit: ITEMS_PER_PAGE,
    });
  };

  const handleExportCSV = async () => {
    setExporting(true);
    
    // Get all filtered logs (without pagination)
    const result = await getAllFilteredLogs({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      personId: filters.personId,
      status: filters.status as 'present' | 'absent' | '',
    });

    if (!result.success) {
      showToast(result.error, 'error');
      setExporting(false);
      return;
    }

    const allLogs = result.data;

    // Create CSV content
    const headers = ['Date', 'Person', 'Role', 'Status', 'Punch In', 'In Location', 'Punch Out', 'Out Location', 'Notes', 'Recorded At'];
    const rows = allLogs.map(log => [
      log.attendance_date,
      log.people.full_name,
      log.people.role || '',
      log.status,
      log.punch_in_time ? new Date(log.punch_in_time).toLocaleTimeString() : '',
      log.punch_in_latitude && log.punch_in_longitude 
        ? `https://www.google.com/maps?q=${log.punch_in_latitude},${log.punch_in_longitude}` 
        : '',
      log.punch_out_time ? new Date(log.punch_out_time).toLocaleTimeString() : '',
      log.punch_out_latitude && log.punch_out_longitude 
        ? `https://www.google.com/maps?q=${log.punch_out_latitude},${log.punch_out_longitude}` 
        : '',
      log.notes || '',
      new Date(log.created_at).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    // Download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${allLogs.length} records to CSV`, 'success');
    setExporting(false);
  };

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.personId || filters.status;

  const personOptions = [
    { value: '', label: 'All People' },
    ...people.map(p => ({ value: p.id, label: p.full_name })),
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'present', label: 'Present' },
    { value: 'absent', label: 'Absent' },
  ];

  return (
    <div className="space-y-6">
      {ToastComponent}
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Logs</h1>
          <p className="text-gray-500 mt-1">View and export attendance records</p>
        </div>
        <Button onClick={handleExportCSV} loading={exporting} disabled={logs.length === 0}>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
              <Input
                type="date"
                label="From Date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
              <Input
                type="date"
                label="To Date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
              <Select
                label="Person"
                options={personOptions}
                value={filters.personId}
                onChange={(e) => handleFilterChange('personId', e.target.value)}
              />
              <Select
                label="Status"
                options={statusOptions}
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12">
              <LoadingSpinner />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No attendance logs found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {hasActiveFilters ? 'Try adjusting your filters.' : 'Start taking attendance to see logs here.'}
              </p>
            </div>
          ) : (
            <>
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-sm text-gray-500">
                  Showing {logs.length} of {totalCount} records
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Person
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Punch In
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        In Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Punch Out
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Out Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(log.attendance_date + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 flex-shrink-0 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-indigo-600 font-medium text-xs">
                                {log.people.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{log.people.full_name}</div>
                              {log.people.role && (
                                <div className="text-xs text-gray-500">{log.people.role}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            log.status === 'present'
                              ? 'bg-green-100 text-green-800'
                              : log.status === 'leave'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.punch_in_time 
                            ? new Date(log.punch_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {log.punch_in_latitude && log.punch_in_longitude ? (
                            <a
                              href={`https://www.google.com/maps?q=${log.punch_in_latitude},${log.punch_in_longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              View
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.punch_out_time 
                            ? new Date(log.punch_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {log.punch_out_latitude && log.punch_out_longitude ? (
                            <a
                              href={`https://www.google.com/maps?q=${log.punch_out_latitude},${log.punch_out_longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              View
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {log.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={filters.page}
                totalPages={totalPages}
                onPageChange={(page) => handleFilterChange('page', page)}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
