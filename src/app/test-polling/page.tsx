'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

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
  botInfo?: {
    id: string;
    status: string;
    createdAt: string;
  } | null;
  status: string;
  transcript?: unknown;
}

export default function TestPollingPage() {
  const { status } = useSession();
  const [pollingStatus, setPollingStatus] = useState<PollingResponse | null>(null);
  const [activeMeetings, setActiveMeetings] = useState<Meeting[]>([]);
  const [pollResults, setPollResults] = useState<unknown[]>([]);
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
        addLog(`Polling status: ${data.polling?.running ? 'RUNNING' : 'STOPPED'}`);
      }
    } catch (err) {
      addLog(`Failed to fetch polling status: ${err}`);
    }
  }, []);

  // Control polling service
  const controlPolling = async (action: 'start' | 'stop' | 'force-poll') => {
    try {
      setLoading(true);
      setError(null);
      addLog(`${action.toUpperCase()} polling...`);
      
      const response = await fetch('/api/polling/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setPollingStatus(data);
        addLog(`${action.toUpperCase()} successful: ${data.message}`);
        
        if (action === 'force-poll' && data.results) {
          setPollResults(data.results);
          addLog(`Polled ${data.results.length} meetings`);
        }
      } else {
        setError(`Error ${action}: ${data.error}`);
        addLog(`Error: ${data.error}`);
      }
    } catch (err) {
      setError(`Failed to ${action}`);
      addLog(`Failed to ${action}: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Test manual polling
  const testManualPoll = async () => {
    try {
      setLoading(true);
      setError(null);
      addLog('Testing manual poll...');
      
      const response = await fetch('/api/bots/poll', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (response.ok) {
        setPollResults(data.results || []);
        addLog(`Manual poll completed: ${data.polled} bots checked`);
        
        if (data.results) {
          data.results.forEach((result: { botId: string; transcriptReady: boolean; transcriptSaved: boolean }) => {
            addLog(`Bot ${result.botId}: ready=${result.transcriptReady}, saved=${result.transcriptSaved}`);
          });
        }
      } else {
        setError(`Manual poll failed: ${data.error}`);
        addLog(`Manual poll failed: ${data.error}`);
      }
    } catch (err) {
      setError('Failed to test manual poll');
      addLog(`Manual poll failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch active meetings
  const fetchActiveMeetings = useCallback(async () => {
    try {
      const response = await fetch('/api/meetings/past');
      const data = await response.json();
      
      if (response.ok) {
        setActiveMeetings(data.meetings || []);
        addLog(`Loaded ${data.meetings?.length || 0} meetings`);
      }
    } catch {
      setError('Failed to fetch meetings');
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPollingStatus();
      fetchActiveMeetings();
    }
  }, [status, fetchPollingStatus, fetchActiveMeetings]);

  if (status === 'loading') {
    return <div className="p-8">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="p-8">
        <p>Please sign in to access the polling test page.</p>
        <Link href="/" className="text-blue-600 hover:text-blue-800">
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            ← Back to Home
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Polling Service Test</h1>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Polling Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Polling Status</h2>
          
          {pollingStatus?.polling ? (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Status: <span className={`font-medium ${pollingStatus.polling.running ? 'text-green-600' : 'text-red-600'}`}>
                  {pollingStatus.polling.running ? 'Running' : 'Stopped'}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Interval: {pollingStatus.polling.intervalMs}ms ({Math.round(pollingStatus.polling.intervalMs / 1000)}s)
              </p>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-sm text-gray-600">Loading status...</p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => controlPolling('start')}
              disabled={loading || pollingStatus?.polling?.running}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Start Polling
            </button>
            
            <button
              onClick={() => controlPolling('stop')}
              disabled={loading || !pollingStatus?.polling?.running}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Stop Polling
            </button>
            
            <button
              onClick={() => controlPolling('force-poll')}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Force Poll Now
            </button>
            
            <button
              onClick={testManualPoll}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              Test Manual Poll
            </button>
            
            <button
              onClick={fetchPollingStatus}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              Refresh Status
            </button>
          </div>
        </div>

        {/* Activity Logs */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Activity Log</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-64 overflow-y-auto">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))
            ) : (
              <div className="text-gray-500">No activity yet...</div>
            )}
          </div>
        </div>

        {/* Active Meetings */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Active Meetings</h2>
            <button
              onClick={fetchActiveMeetings}
              disabled={loading}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
          
          {activeMeetings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meeting</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bot ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transcript</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeMeetings.map((meeting) => (
                    <tr key={meeting.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{meeting.title}</div>
                        <div className="text-sm text-gray-500">{meeting.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          meeting.status === 'completed' ? 'bg-green-100 text-green-800' :
                          meeting.status === 'active' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {meeting.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {meeting.botId ? (
                          <span className="font-mono text-xs">{meeting.botId.substring(0, 8)}...</span>
                        ) : (
                          <span className="text-gray-400">No bot</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {meeting.transcript ? (
                          <span className="text-green-600">Available</span>
                        ) : (
                          <span className="text-gray-400">Processing...</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No active meetings found.</p>
          )}
        </div>

        {/* Poll Results */}
        {pollResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Latest Poll Results</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meeting</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bot ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ready</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saved</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pollResults.map((result, index) => {
                    const typedResult = result as { meetingTitle?: string; meetingId?: string; botId?: string; transcriptReady?: boolean; transcriptSaved?: boolean };
                    return (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {typedResult.meetingTitle || typedResult.meetingId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                          {typedResult.botId?.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            typedResult.transcriptReady ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {typedResult.transcriptReady ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            typedResult.transcriptSaved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {typedResult.transcriptSaved ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}