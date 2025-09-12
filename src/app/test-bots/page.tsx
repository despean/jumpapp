'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';

export default function TestBots() {
  const { data: session, status } = useSession();
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testCreateBot = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/bots/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId: 'test-meeting-id', // This would be a real meeting ID
          joinMinutesBefore: 2,
        }),
      });
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testPollBots = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/bots/poll', {
        method: 'POST',
      });
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testBotStatus = async () => {
    const botId = prompt('Enter Bot ID to check:');
    if (!botId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/bots/${botId}`);
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to test bots</h1>
          <a href="/test-auth" className="text-blue-600 hover:underline">
            Go to authentication test
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Recall.ai Bot Testing
          </h1>

          {/* User Info */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Current User
            </h2>
            <div className="bg-gray-50 p-4 rounded-md">
              <p><strong>Name:</strong> {session.user?.name}</p>
              <p><strong>Email:</strong> {session.user?.email}</p>
            </div>
          </div>

          {/* Bot Testing */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Bot API Testing
            </h2>
            <div className="space-x-4 space-y-2">
              <button
                onClick={testCreateBot}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Create Bot'}
              </button>
              <button
                onClick={testPollBots}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Poll Bots'}
              </button>
              <button
                onClick={testBotStatus}
                disabled={loading}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Bot Status'}
              </button>
            </div>
          </div>

          {/* Results */}
          {testResult && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Test Results
              </h2>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 rounded-md">
            <h3 className="font-medium text-blue-900 mb-2">Testing Instructions:</h3>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>First, make sure you have calendar events with meeting links</li>
              <li>Go to the main dashboard and toggle "AI Notetaker" on a meeting</li>
              <li>This should create a bot and save the meeting to the database</li>
              <li>Use "Test Poll Bots" to check status of active bots</li>
              <li>Use "Test Bot Status" with a specific bot ID to get detailed info</li>
            </ol>
          </div>

          {/* API Info */}
          <div className="mt-8 p-4 bg-yellow-50 rounded-md">
            <h3 className="font-medium text-yellow-900 mb-2">Recall.ai API Info:</h3>
            <div className="text-sm text-yellow-800 space-y-1">
              <p><strong>API Key:</strong> {process.env.NEXT_PUBLIC_RECALL_AI_API_KEY ? '✅ Set' : '❌ Not set'}</p>
              <p><strong>Base URL:</strong> https://api.recall.ai/api/v1</p>
              <p><strong>Supported Platforms:</strong> Zoom, Google Meet, Microsoft Teams</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
