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
  transcript?: any;
}

export default function TestPollingPage() {
  const { data: session, status } = useSession();
  const [pollingStatus, setPollingStatus] = useState<PollingResponse | null>(null);
  const [activeMeetings, setActiveMeetings] = useState<Meeting[]>([]);
  const [pollResults, setPollResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [meetingsDebug, setMeetingsDebug] = useState<any>(null);
  const [transcriptDebug, setTranscriptDebug] = useState<any>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]); // Keep last 10 logs
  };

  // Fetch current polling status
  const fetchPollingStatus = async () => {
    try {
      const response = await fetch('/api/bots/polling');
      const data = await response.json();
      
      if (response.ok) {
        setPollingStatus(data);
        addLog(`Polling status: ${data.polling?.running ? 'RUNNING' : 'STOPPED'}`);
      } else {
        setError(`Error fetching status: ${data.error}`);
      }
    } catch (err) {
      setError('Failed to fetch polling status');
    }
  };

  // Control polling service
  const controlPolling = async (action: 'start' | 'stop' | 'force-poll') => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/bots/polling', {
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
          data.results.forEach((result: any) => {
            addLog(`Bot ${result.botId}: ready=${result.transcriptReady}, saved=${result.transcriptSaved}`);
          });
        }
      } else {
        setError(`Manual poll error: ${data.error}`);
        addLog(`Manual poll error: ${data.error}`);
      }
    } catch (err) {
      setError('Manual poll failed');
      addLog(`Manual poll failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch active meetings
  const fetchActiveMeetings = async () => {
    try {
      const response = await fetch('/api/meetings/past');
      const data = await response.json();
      
      if (response.ok) {
        setActiveMeetings(data.meetings || []);
        const withTranscripts = data.meetings?.filter((m: Meeting) => m.transcript) || [];
        addLog(`Found ${data.meetings?.length || 0} meetings, ${withTranscripts.length} with transcripts`);
      } else {
        setError(`Error fetching meetings: ${data.error}`);
      }
    } catch (err) {
      setError('Failed to fetch meetings');
    }
  };

  // Debug transcript data for a specific bot
  const debugTranscriptData = async (botId: string) => {
    try {
      setLoading(true);
      addLog(`Debugging transcript data for bot ${botId.substring(0, 8)}...`);
      
      const response = await fetch(`/api/debug/transcript-data?botId=${botId}`);
      const data = await response.json();
      
      if (response.ok) {
        setTranscriptDebug(data);
        addLog(`Debug complete - DB transcript: ${data.databaseTranscript.exists ? 'EXISTS' : 'MISSING'}`);
        addLog(`Recall transcript: ${data.recallTranscript ? 'AVAILABLE' : 'NOT_AVAILABLE'}`);
        if (data.recallTranscript) {
          addLog(`Content length: ${data.recallTranscript.contentLength} chars`);
        }
      } else {
        setError(`Debug error: ${data.error}`);
        addLog(`Debug failed: ${data.error}`);
      }
    } catch (err) {
      setError('Failed to debug transcript data');
      addLog(`Debug failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPollingStatus();
      fetchActiveMeetings();
    }
  }, [status]);

  if (status === 'loading') {
    return <div className="p-8">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="p-8">
        <p>Please sign in to access the polling test page.</p>
        <Link href="/" className="text-blue-600 hover:underline">
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Polling Service Test Page</h1>
          <p className="text-gray-600 mt-2">
            Test and monitor the bot polling service for transcript detection.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Polling Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Polling Service Control</h2>
            
            {pollingStatus?.polling ? (
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="text-sm">
                  <span className="font-medium">Status:</span>{' '}
                  <span className={pollingStatus.polling.running ? 'text-green-600' : 'text-red-600'}>
                    {pollingStatus.polling.running ? 'RUNNING' : 'STOPPED'}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium">Interval:</span> {pollingStatus.polling.intervalMs / 1000}s
                </p>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-gray-100 rounded">
                <p className="text-sm text-gray-600">Loading polling status...</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => controlPolling('start')}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Start Polling
              </button>
              <button
                onClick={() => controlPolling('stop')}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
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
              <button
                onClick={testManualPoll}
                disabled={loading}
                className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                Test Manual Poll
              </button>
              <button
                onClick={fetchActiveMeetings}
                disabled={loading}
                className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                Refresh Meetings
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Activity Log</h2>
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">No activity yet...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Active Meetings */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Meetings</h2>
          {activeMeetings.length === 0 ? (
            <p className="text-gray-500">No meetings found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Meeting
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bot ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transcript
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Debug
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeMeetings.map((meeting) => (
                    <tr key={meeting.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {meeting.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          meeting.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : meeting.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {meeting.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {meeting.botId ? meeting.botId.substring(0, 8) + '...' : 'No bot'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          meeting.transcript 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {meeting.transcript ? 'Available' : 'Processing'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {meeting.botId && (
                          <button
                            onClick={() => debugTranscriptData(meeting.botId!)}
                            disabled={loading}
                            className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                          >
                            Debug
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Poll Results */}
        {pollResults.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Latest Poll Results</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bot ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transcript Ready
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transcript Saved
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pollResults.map((result, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {result.botId?.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.transcriptReady 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {result.transcriptReady ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.transcriptSaved 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {result.transcriptSaved ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.status || 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transcript Debug Results */}
        {transcriptDebug && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Transcript Debug Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Database Status */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Database Status</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p><strong>Transcript Exists:</strong> {transcriptDebug.databaseTranscript.exists ? 'Yes' : 'No'}</p>
                  <p><strong>Content Length:</strong> {transcriptDebug.databaseTranscript.contentLength} chars</p>
                  <p><strong>Duration:</strong> {transcriptDebug.databaseTranscript.duration || 'N/A'} minutes</p>
                  <p><strong>Attendees:</strong> {transcriptDebug.databaseTranscript.attendees || 'N/A'}</p>
                </div>
              </div>

              {/* Recall.ai Status */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Recall.ai Status</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p><strong>Bot Status:</strong> {transcriptDebug.recallBotData.status || 'Unknown'}</p>
                  <p><strong>Is Ready:</strong> {transcriptDebug.recallReadiness.isReady ? 'Yes' : 'No'}</p>
                  <p><strong>Has Transcript:</strong> {transcriptDebug.recallReadiness.hasTranscript ? 'Yes' : 'No'}</p>
                  <p><strong>Recordings:</strong> {transcriptDebug.recallBotData.recordings.length}</p>
                </div>
              </div>

              {/* Transcript Content */}
              {transcriptDebug.recallTranscript && (
                <div className="md:col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Transcript Content</h3>
                  <div className="bg-gray-50 p-4 rounded">
                    <p><strong>Content Length:</strong> {transcriptDebug.recallTranscript.contentLength} chars</p>
                    <p><strong>Words Count:</strong> {transcriptDebug.recallTranscript.wordsCount}</p>
                    <p><strong>Speakers Count:</strong> {transcriptDebug.recallTranscript.speakersCount}</p>
                    {transcriptDebug.recallTranscript.sampleContent && (
                      <div className="mt-2">
                        <p><strong>Sample Content:</strong></p>
                        <div className="bg-white p-2 rounded border text-sm font-mono">
                          {transcriptDebug.recallTranscript.sampleContent}...
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Raw Debug Data */}
              <div className="md:col-span-2">
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
                    Show Raw Debug Data
                  </summary>
                  <pre className="mt-2 bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto max-h-96">
                    {JSON.stringify(transcriptDebug, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}