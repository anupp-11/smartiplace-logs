'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { getPerson, updatePerson, deletePerson } from '@/lib/actions/people';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card, CardContent, CardHeader } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Person } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditPersonPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast, ToastComponent } = useToast();

  const loadPerson = useCallback(async () => {
    const result = await getPerson(id);
    if (result.success) {
      setPerson(result.data);
    } else {
      showToast(result.error, 'error');
      router.push('/people');
    }
    setLoading(false);
  }, [id, router, showToast]);

  useEffect(() => {
    loadPerson();
  }, [loadPerson]);

  const handleUpdate = async (formData: FormData) => {
    setSaving(true);
    const result = await updatePerson(id, formData);
    if (result.success) {
      showToast('Person updated successfully', 'success');
      router.push('/people');
    } else {
      showToast(result.error, 'error');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deletePerson(id);
    if (result.success) {
      showToast('Person deleted successfully', 'success');
      router.push('/people');
    } else {
      showToast(result.error, 'error');
    }
    setDeleting(false);
    setShowDeleteConfirm(false);
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Person not found</h2>
        <Button onClick={() => router.push('/people')} className="mt-4">
          Back to People
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {ToastComponent}
      
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/people')}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Person</h1>
          <p className="text-gray-500 mt-1">Update information for {person.full_name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Person Details</h2>
        </CardHeader>
        <CardContent>
          <form action={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                id="full_name"
                name="full_name"
                label="Full Name"
                placeholder="John Doe"
                defaultValue={person.full_name}
                required
              />
              <Input
                id="role"
                name="role"
                label="Role (optional)"
                placeholder="Developer"
                defaultValue={person.role || ''}
              />
              <Input
                id="phone"
                name="phone"
                label="Phone (optional)"
                placeholder="+1234567890"
                defaultValue={person.phone || ''}
              />
              <Input
                id="email"
                name="email"
                type="email"
                label="Email"
                placeholder="john@example.com"
                defaultValue={person.email || ''}
              />
              <div className="flex items-center">
                {person.user_id ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    ✓ Has Login Account
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                    No Login Account
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Person
              </Button>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={() => router.push('/people')}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Person"
        message={`Are you sure you want to delete "${person.full_name}"? This will also delete all their attendance records. This action cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
      />
    </div>
  );
}
