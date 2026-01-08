'use client';

import { useState, useEffect } from 'react';
import { getAllLeaveRequests, reviewLeaveRequest } from '@/lib/actions/leave';
import { Button } from '@/components/Button';
import { Select } from '@/components/Select';
import { Card, CardContent, CardHeader } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/Toast';
import type { LeaveRequestWithPerson } from '@/lib/types';

const statusFilterOptions = [
  { value: 'all', label: 'All Requests' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const leaveTypeLabels: Record<string, string> = {
  sick: 'Sick Leave',
  casual: 'Casual Leave',
  annual: 'Annual Leave',
  emergency: 'Emergency Leave',
  other: 'Other',
};

export default function ManageLeavePageClient() {
  const [requests, setRequests] = useState<LeaveRequestWithPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const { showToast, ToastComponent } = useToast();

  const loadRequests = async () => {
    setLoading(true);
    const result = await getAllLeaveRequests(statusFilter);
    if (result.success) {
      setRequests(result.data);
    } else {
      showToast(result.error, 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const handleReview = async (id: string, action: 'approved' | 'rejected') => {
    setProcessing(true);
    const result = await reviewLeaveRequest(id, action, reviewNotes);
    if (result.success) {
      showToast(`Leave request ${action}`, 'success');
      setReviewingId(null);
      setReviewNotes('');
      loadRequests();
    } else {
      showToast(result.error, 'error');
    }
    setProcessing(false);
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

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {ToastComponent}
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Leave Requests</h1>
          <p className="text-gray-500 mt-1">
            Review and approve leave requests from team members
            {statusFilter === 'pending' && pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                {pendingCount} pending
              </span>
            )}
          </p>
        </div>
        <div className="w-48">
          <Select
            options={statusFilterOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12">
              <LoadingSpinner />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No leave requests</h3>
              <p className="mt-1 text-sm text-gray-500">
                {statusFilter === 'pending' 
                  ? 'No pending requests to review.'
                  : 'No requests match your filter.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {requests.map((request) => (
                <div key={request.id} className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 flex-shrink-0 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 font-medium">
                          {request.people.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{request.people.full_name}</h3>
                        <p className="text-sm text-gray-500">{request.people.role || 'Team Member'}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-600">
                            {leaveTypeLabels[request.leave_type]}
                          </span>
                          <span className="inline-flex items-center text-gray-500">
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
                          </span>
                          <span className="text-gray-400">
                            ({calculateDays(request.start_date, request.end_date)} day{calculateDays(request.start_date, request.end_date) > 1 ? 's' : ''})
                          </span>
                        </div>
                        {request.reason && (
                          <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            &ldquo;{request.reason}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(request.status)}
                      <span className="text-xs text-gray-400">
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Review Section for Pending Requests */}
                  {request.status === 'pending' && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      {reviewingId === request.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="Add notes (optional)..."
                            rows={2}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setReviewingId(null);
                                setReviewNotes('');
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              loading={processing}
                              onClick={() => handleReview(request.id, 'rejected')}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              loading={processing}
                              onClick={() => handleReview(request.id, 'approved')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Approve
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setReviewingId(request.id)}
                          >
                            Review Request
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Review Notes for Reviewed Requests */}
                  {request.status !== 'pending' && request.review_notes && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">Review notes:</span> {request.review_notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
