'use client';

import { useState } from 'react';
import { login, signUp } from '@/lib/actions/auth';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card, CardContent } from '@/components/Card';
import { useToast } from '@/components/Toast';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast, ToastComponent } = useToast();

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const result = await signUp(formData);
        if (!result.success) {
          setError(result.error);
        } else {
          showToast('Account created! You can now log in.', 'success');
          setIsSignUp(false);
        }
        setLoading(false);
      } else {
        const result = await login(formData);
        // If we get here without redirect, there was an error
        if (!result.success) {
          setError(result.error);
          setLoading(false);
        }
        // If successful, the server action will redirect and we won't reach here
      }
    } catch (err) {
      // Check if this is a redirect (Next.js throws NEXT_REDIRECT)
      if (err && typeof err === 'object' && 'digest' in err && typeof (err as { digest: string }).digest === 'string' && (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')) {
        // This is a redirect, not an error - let it propagate
        throw err;
      }
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {ToastComponent}
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/images/smartiplacelogo.png"
              alt="SmartIPlace"
              className="h-16 w-auto"
            />
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form action={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Input
                id="email"
                name="email"
                type="email"
                label="Email address"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />

              <Input
                id="password"
                name="password"
                type="password"
                label="Password"
                placeholder="••••••••"
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />

              <Button type="submit" loading={loading} className="w-full">
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500">
          Track attendance for your team with ease.
        </p>
      </div>
    </div>
  );
}
