'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '@/components/Layout';

interface PollingStatus {
  running: boolean;
  intervalMs: number;
}

interface PollingResponse {
  polling: PollingStatus;
  message: string;
}

interface Meeting {
  id: string;
  title: string;
  botId?: string | null;
  status: string;
}

export default function TestPollingPage() {
  const { status } = useSession();
  const [pollingStatus, setPollingStatus] = useState<PollingResponse | null>(null);
  const [activeMeetings, setActiveMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]); // Keep last 10 logs
  };

  // Fetch current polling status
  const fetchPollingStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/polling/status');
      const data = await response.json();
      
      if (response.ok) {
        setPollingStatus(data);
        addLog(`Polling status: ${data.polling?.running ? 'Running' : 'Stopped'}`);
      } else {
        setError(data.error || 'Failed to fetch polling status');
      }
    } catch {
      setError('Network error fetching polling status');
    }
  }, []);

  // Fetch active meetings
  const fetchActiveMeetings = useCallback(async () => {
    try {
      const response = await fetch('/api/meetings/past');
      const data = await response.json();
      
      if (response.ok) {
        setActiveMeetings(data.meetings || []);
        addLog(`Fetched ${data.meetings?.length || 0} meetings`);
      } else {
        setError(data.error || 'Failed to fetch meetings');
      }
    } catch {
      setError('Network error fetching meetings');
    }
  }, []);

  // Start polling
  const startPolling = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/polling/start', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        setPollingStatus(data);
        addLog('Polling started successfully');
      } else {
        setError(data.error || 'Failed to start polling');
      }
    } catch {
      setError('Network error starting polling');
    } finally {
      setLoading(false);
    }
  };

  // Stop polling
  const stopPolling = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/polling/stop', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        setPollingStatus(data);
        addLog('Polling stopped successfully');
      } else {
        setError(data.error || 'Failed to stop polling');
      }
    } catch {
      setError('Network error stopping polling');
    } finally {
      setLoading(false);
    }
  };

  // Manual poll
  const manualPoll = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/bots/poll', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        addLog(`Manual poll completed: ${data.results?.length || 0} bots processed`);
        // Refresh meetings after polling
        fetchActiveMeetings();
      } else {
        setError(data.error || 'Failed to poll bots');
      }
    } catch {
      setError('Network error during manual poll');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPollingStatus();
      fetchActiveMeetings();
    }
  }, [status, fetchPollingStatus, fetchActiveMeetings]);

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Please sign in to access polling controls.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Polling Test & Control</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and control the bot polling service for testing purposes.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}

        {/* Polling Status */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Polling Status</h3>
            
            {pollingStatus ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-500">Status:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    pollingStatus.polling?.running 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {pollingStatus.polling?.running ? 'Running' : 'Stopped'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-500">Interval:</span>
                  <span className="text-sm text-gray-900">{pollingStatus.polling?.intervalMs}ms</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Loading polling status...</p>
            )}

            <div className="mt-4 flex space-x-3">
              <button
                onClick={startPolling}
                disabled={loading || pollingStatus?.polling?.running}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading ? 'Starting...' : 'Start Polling'}
              </button>
              <button
                onClick={stopPolling}
                disabled={loading || !pollingStatus?.polling?.running}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {loading ? 'Stopping...' : 'Stop Polling'}
              </button>
              <button
                onClick={manualPoll}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Polling...' : 'Manual Poll'}
              </button>
              <button
                onClick={() => {
                  fetchPollingStatus();
                  fetchActiveMeetings();
                }}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Log</h3>
            <div className="bg-gray-50 rounded-md p-4 max-h-64 overflow-y-auto">
              {logs.length > 0 ? (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="text-sm font-mono text-gray-700">
                      {log}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No activity logged yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Active Meetings */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Meetings</h3>
            {activeMeetings.length > 0 ? (
              <div className="space-y-3">
                {activeMeetings.slice(0, 5).map((meeting) => (
                  <div key={meeting.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{meeting.title}</p>
                      <p className="text-xs text-gray-500">ID: {meeting.id}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        meeting.botId 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {meeting.botId ? 'Has Bot' : 'No Bot'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        meeting.status === 'completed' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {meeting.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No meetings found.</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}