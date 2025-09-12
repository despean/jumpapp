'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function TestAuth() {
  const { data: session, status } = useSession();
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testCalendarAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/calendar/events?maxResults=5');
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Authentication & Calendar API Test
          </h1>

          {/* Authentication Status */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Authentication Status
            </h2>
            <div className="bg-gray-50 p-4 rounded-md">
              <p><strong>Status:</strong> {status}</p>
              {session && (
                <>
                  <p><strong>User:</strong> {session.user?.name}</p>
                  <p><strong>Email:</strong> {session.user?.email}</p>
                  <p><strong>Provider:</strong> {session.provider || 'N/A'}</p>
                  <p><strong>Access Token:</strong> {session.accessToken ? '✅ Present' : '❌ Missing'}</p>
                </>
              )}
            </div>
          </div>

          {/* Authentication Actions */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Authentication Actions
            </h2>
            <div className="space-x-4">
              {!session ? (
                <button
                  onClick={() => signIn('google')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Sign In with Google
                </button>
              ) : (
                <button
                  onClick={() => signOut()}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>

          {/* Calendar API Test */}
          {session && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Calendar API Test
              </h2>
              <button
                onClick={testCalendarAPI}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Calendar API'}
              </button>
              
              {testResult && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-900 mb-2">API Response:</h3>
                  <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Environment Check */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Environment Check
            </h2>
            <div className="bg-gray-50 p-4 rounded-md">
              <p><strong>NEXTAUTH_URL:</strong> {process.env.NEXT_PUBLIC_NEXTAUTH_URL || 'Not set (using default)'}</p>
              <p><strong>Google Client ID:</strong> {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Not set'}</p>
            </div>
          </div>

          {/* Debug Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Debug Information
            </h2>
            <div className="bg-gray-50 p-4 rounded-md">
              <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Server-side'}</p>
              <p><strong>User Agent:</strong> {typeof navigator !== 'undefined' ? navigator.userAgent : 'Server-side'}</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 rounded-md">
            <h3 className="font-medium text-blue-900 mb-2">Setup Instructions:</h3>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>Complete Google OAuth setup (see GOOGLE_OAUTH_SETUP.md)</li>
              <li>Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env</li>
              <li>Restart the development server</li>
              <li>Click "Sign In with Google" above</li>
              <li>Grant calendar permissions</li>
              <li>Test the Calendar API</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
