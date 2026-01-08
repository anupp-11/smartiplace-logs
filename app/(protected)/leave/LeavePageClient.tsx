'use client';

import { useState, useEffect } from 'react';
import { getMyLeaveRequests, createLeaveRequest, cancelLeaveRequest } from '@/lib/actions/leave';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Card, CardContent, CardHeader } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { LeaveRequestWithPerson } from '@/lib/types';

const leaveTypeOptions = [
  { value: 'sick', label: 'Sick Leave' },
  { value: 'casual', label: 'Casual Leave' },
  { value: 'annual', label: 'Annual Leave' },
  { value: 'emergency', label: 'Emergency Leave' },
  { value: 'other', label: 'Other' },
];

export default function LeavePageClient() {
  const [requests, setRequests] = useState<LeaveRequestWithPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<LeaveRequestWithPerson | null>(null);
  const { showToast, ToastComponent } = useToast();

  const loadRequests = async () => {
    const result = await getMyLeaveRequests();
    if (result.success) {
      setRequests(result.data);
    } else {
      showToast(result.error, 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleSubmit = async (formData: FormData) => {
    setSaving(true);
    const result = await createLeaveRequest(formData);
    if (result.success) {
      showToast('Leave request submitted successfully', 'success');
      setShowForm(false);
      loadRequests();
    } else {
      showToast(result.error, 'error');
    }
    setSaving(false);
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    const result = await cancelLeaveRequest(cancelTarget.id);
    if (result.success) {
      showToast('Leave request cancelled', 'success');
      loadRequests();
    } else {
      showToast(result.error, 'error');
    }
    setCancelTarget(null);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getLeaveTypeLabel = (type: string) => {
    return leaveTypeOptions.find(o => o.value === type)?.label || type;
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Get today's date for min date validation
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {ToastComponent}
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
          <p className="text-gray-500 mt-1">Apply for leave and track your requests</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Apply for Leave'}
        </Button>
      </div>

      {/* Leave Application Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">New Leave Request</h2>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  label="Start Date"
                  min={today}
                  required
                />
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  label="End Date"
                  min={today}
                  required
                />
                <Select
                  id="leave_type"
                  name="leave_type"
                  label="Leave Type"
                  options={leaveTypeOptions}
                  required
                />
              </div>
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Briefly describe the reason for your leave..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  Submit Request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Requests List */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Your Leave Requests</h2>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12">
              <LoadingSpinner />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No leave requests</h3>
              <p className="mt-1 text-sm text-gray-500">Apply for leave to see your requests here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(request.start_date + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                        {request.start_date !== request.end_date && (
                          <>
                            {' → '}
                            {new Date(request.end_date + 'T00:00:00').toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getLeaveTypeLabel(request.leave_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {calculateDays(request.start_date, request.end_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {request.reason || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {request.status === 'pending' && (
                          <button
                            onClick={() => setCancelTarget(request)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        )}
                        {request.status === 'rejected' && request.review_notes && (
                          <span className="text-gray-500 text-xs" title={request.review_notes}>
                            View reason
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={!!cancelTarget}
        title="Cancel Leave Request"
        message="Are you sure you want to cancel this leave request?"
        confirmLabel="Yes, Cancel"
        cancelLabel="No, Keep"
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
        variant="danger"
      />
    </div>
  );
}
