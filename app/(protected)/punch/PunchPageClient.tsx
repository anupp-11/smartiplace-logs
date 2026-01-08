'use client';

import { useState, useEffect } from 'react';
import { getTodayPunchStatus, punchIn, punchOut } from '@/lib/actions/punch';
import { Button } from '@/components/Button';
import { Card, CardContent, CardHeader } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/Toast';
import type { TodayPunchStatus } from '@/lib/types';

export default function PunchPageClient() {
  const [status, setStatus] = useState<TodayPunchStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { showToast, ToastComponent } = useToast();

  const loadStatus = async () => {
    const result = await getTodayPunchStatus();
    if (result.success) {
      setStatus(result.data);
    } else {
      showToast(result.error, 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStatus();
    
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const handlePunchIn = async () => {
    setPunching(true);
    const result = await punchIn();
    if (result.success) {
      showToast('Punched in successfully!', 'success');
      loadStatus();
    } else {
      showToast(result.error, 'error');
    }
    setPunching(false);
  };

  const handlePunchOut = async () => {
    setPunching(true);
    const result = await punchOut();
    if (result.success) {
      showToast('Punched out successfully!', 'success');
      loadStatus();
    } else {
      showToast(result.error, 'error');
    }
    setPunching(false);
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const calculateWorkHours = () => {
    if (!status?.punchInTime) return null;
    
    const punchIn = new Date(status.punchInTime);
    const punchOut = status.punchOutTime ? new Date(status.punchOutTime) : new Date();
    
    const diffMs = punchOut.getTime() - punchIn.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {ToastComponent}
      
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Punch In / Out</h1>
        <p className="text-gray-500 mt-1">{today}</p>
      </div>

      {/* Current Time */}
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-gray-500 mb-2">Current Time</p>
          <p className="text-5xl font-mono font-bold text-gray-900">
            {currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Status</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            {status?.hasPunchedIn && status?.hasPunchedOut ? (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Day Complete
              </span>
            ) : status?.hasPunchedIn ? (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 mr-2 bg-green-500 rounded-full animate-pulse"></span>
                Currently Working
              </span>
            ) : (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Not Punched In
              </span>
            )}
          </div>

          {/* Punch Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Punch In</p>
              <p className="text-xl font-semibold text-gray-900">
                {status?.punchInTime ? formatTime(status.punchInTime) : '—'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Punch Out</p>
              <p className="text-xl font-semibold text-gray-900">
                {status?.punchOutTime ? formatTime(status.punchOutTime) : '—'}
              </p>
            </div>
          </div>

          {/* Work Hours */}
          {status?.hasPunchedIn && (
            <div className="bg-indigo-50 rounded-lg p-4 text-center">
              <p className="text-sm text-indigo-600 mb-1">
                {status.hasPunchedOut ? 'Total Work Time' : 'Working Time'}
              </p>
              <p className="text-2xl font-bold text-indigo-700">
                {calculateWorkHours()}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 pt-4">
            {!status?.hasPunchedIn ? (
              <Button
                onClick={handlePunchIn}
                loading={punching}
                size="lg"
                className="px-12 py-4 text-lg bg-green-600 hover:bg-green-700"
              >
                <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Punch In
              </Button>
            ) : !status?.hasPunchedOut ? (
              <Button
                onClick={handlePunchOut}
                loading={punching}
                size="lg"
                variant="danger"
                className="px-12 py-4 text-lg"
              >
                <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Punch Out
              </Button>
            ) : (
              <p className="text-gray-500 text-center">
                You&apos;ve completed your day. See you tomorrow! 👋
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
