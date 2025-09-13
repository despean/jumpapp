'use client';

import { useState, useEffect } from 'react';
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
  botId: string | null;
  status: string;
}

export default function TestPollingPage() {
  const { data: session, status } = useSession();
  const [pollingStatus, setPollingStatus] = useState<PollingResponse | null>(null);
  const [activeMeetings, setActiveMeetings] = useState<Meeting[]>([]);
  const [pollResults, setPollResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]); // Keep last 20 logs
  };

  // Fetch current polling status
  const fetchPollingStatus = async () => {
    try {
      addLog('Fetching polling status...');
      const response = await fetch('/api/bots/polling');
      const data = await response.json();
      
      if (response.ok) {
        setPollingStatus(data);
        addLog(`Polling status: ${data.polling.running ? 'RUNNING' : 'STOPPED'}`);
      } else {
        setError(`Error fetching status: ${data.error}`);
        addLog(`Error: ${data.error}`);
      }
    } catch (err) {
      const errorMsg = `Failed to fetch polling status: ${err}`;
      setError(errorMsg);
      addLog(errorMsg);
    }
  };

  // Control polling service
  const controlPolling = async (action: 'start' | 'stop' | 'force-poll') => {
    try {
      setLoading(true);
      addLog(`Sending ${action} command...`);
      
      const response = await fetch('/api/bots/polling', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setPollingStatus({ polling: data.status, message: data.message });
        addLog(`Success: ${data.message}`);
        
        if (action === 'force-poll') {
          addLog('Force poll completed - check server logs for details');
        }
      } else {
        setError(`Error ${action}: ${data.error}`);
        addLog(`Error: ${data.error}`);
      }
    } catch (err) {
      const errorMsg = `Failed to ${action}: ${err}`;
      setError(errorMsg);
      addLog(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Fetch active meetings with bots
  const fetchActiveMeetings = async () => {
    try {
      addLog('Fetching active meetings...');
      const response = await fetch('/api/debug/meetings');
      const data = await response.json();
      
      if (response.ok) {
        const meetings = data.meetings.filter((m: any) => m.hasBot && m.timeStatus !== 'PAST');
        setActiveMeetings(meetings);
        addLog(`Found ${meetings.length} active meetings with bots`);
      } else {
        addLog(`Error fetching meetings: ${data.error}`);
      }
    } catch (err) {
      addLog(`Failed to fetch meetings: ${err}`);
    }
  };

  // Test the manual poll endpoint
  const testManualPoll = async () => {
    try {
      setLoading(true);
      addLog('Testing manual poll endpoint...');
      
      const response = await fetch('/api/bots/poll', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (response.ok) {
        setPollResults(data.results || []);
        addLog(`Manual poll completed: ${data.results?.length || 0} results`);
        addLog(`Summary: ${data.summary || 'No summary'}`);
      } else {
        addLog(`Manual poll error: ${data.error}`);
      }
    } catch (err) {
      addLog(`Manual poll failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Test individual bot status
  const testBotStatus = async (botId: string) => {
    try {
      addLog(`Testing bot status for ${botId}...`);
      
      // Test both the regular endpoint and the debug endpoint
      const [regularResponse, debugResponse] = await Promise.all([
        fetch(`/api/bots/${botId}`),
        fetch(`/api/debug/bot/${botId}`)
      ]);
      
      if (regularResponse.ok) {
        const regularData = await regularResponse.json();
        addLog(`Regular API - Status: ${regularData.status}, HasTranscript: ${regularData.hasTranscript}`);
      }
      
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        addLog(`Debug API - Bot Status: ${debugData.rawBot.status}`);
        addLog(`Debug API - Readiness: ${JSON.stringify(debugData.readinessCheck)}`);
        addLog(`Debug API - Transcript Available: ${debugData.transcript.available}`);
        addLog(`Debug API - Analysis: ${JSON.stringify(debugData.analysis)}`);
        
        if (debugData.transcript.error) {
          addLog(`Transcript Error: ${debugData.transcript.error}`);
        }
      }
      
    } catch (err) {
      addLog(`Bot ${botId} failed: ${err}`);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPollingStatus();
      fetchActiveMeetings();
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to test polling</h1>
          <Link href="/api/auth/signin" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Polling Test Page</h1>
              <p className="text-gray-600">Debug and test the bot polling system</p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Polling Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Polling Service Status</h2>
            
            {pollingStatus && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${pollingStatus.polling.running ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">
                    {pollingStatus.polling.running ? 'RUNNING' : 'STOPPED'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Interval: {pollingStatus.polling.intervalMs}ms ({Math.round(pollingStatus.polling.intervalMs / 1000)}s)
                </p>
                <p className="text-sm text-gray-600 mt-1">{pollingStatus.message}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => controlPolling('start')}
                disabled={loading}
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Start Polling
              </button>
              <button
                onClick={() => controlPolling('stop')}
                disabled={loading}
                className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Stop Polling
              </button>
              <button
                onClick={() => controlPolling('force-poll')}
                disabled={loading}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Force Poll Now
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={fetchPollingStatus}
                disabled={loading}
                className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                Refresh Status
              </button>
              <button
                onClick={testManualPoll}
                disabled={loading}
                className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                Test Manual Poll
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Active Meetings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Active Meetings with Bots</h2>
              <button
                onClick={fetchActiveMeetings}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Refresh
              </button>
            </div>

            {activeMeetings.length === 0 ? (
              <p className="text-gray-500 text-sm">No active meetings with bots found</p>
            ) : (
              <div className="space-y-3">
                {activeMeetings.map((meeting) => (
                  <div key={meeting.id} className="border border-gray-200 rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-sm">{meeting.title}</h3>
                        <p className="text-xs text-gray-500">Status: {meeting.status}</p>
                        <p className="text-xs text-gray-500">Bot ID: {meeting.botId}</p>
                      </div>
                      {meeting.botId && (
                        <button
                          onClick={() => testBotStatus(meeting.botId!)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Test Bot
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Poll Results */}
          {pollResults.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Latest Poll Results</h2>
              <div className="space-y-2">
                {pollResults.map((result, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded text-sm">
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Activity Log</h2>
              <button
                onClick={() => setLogs([])}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Clear
              </button>
            </div>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-xs max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p>No activity yet...</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
