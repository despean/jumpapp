'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface PollingStatus {
  running: boolean;
  intervalMs: number;
}

export default function PollingStatus() {
  const { data: session, status } = useSession();
  const [pollingStatus, setPollingStatus] = useState<PollingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const fetchPollingStatus = async () => {
    if (status !== 'authenticated') return;

    try {
      const response = await fetch('/api/bots/polling');
      if (response.ok) {
        const data = await response.json();
        setPollingStatus(data.polling);
        setLastCheck(new Date());
      }
    } catch (error) {
      console.error('Error fetching polling status:', error);
    } finally {
      setLoading(false);
    }
  };

  const controlPolling = async (action: 'start' | 'stop' | 'force-poll') => {
    try {
      const response = await fetch('/api/bots/polling', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const data = await response.json();
        setPollingStatus(data.status);
        setLastCheck(new Date());
      }
    } catch (error) {
      console.error(`Error ${action} polling:`, error);
    }
  };

  useEffect(() => {
    fetchPollingStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(fetchPollingStatus, 30000);
    return () => clearInterval(interval);
  }, [status]);

  if (status === 'loading' || loading) {
    return null;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${pollingStatus?.running ? 'bg-green-500' : 'bg-gray-400'}`} />
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              Bot Polling Service
            </h3>
            <p className="text-xs text-gray-500">
              {pollingStatus?.running 
                ? `Active (checks every ${Math.round((pollingStatus.intervalMs || 30000) / 1000)}s)`
                : 'Stopped'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!pollingStatus?.running && (
            <button
              onClick={() => controlPolling('start')}
              className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200"
            >
              Start
            </button>
          )}
          
          {pollingStatus?.running && (
            <>
              <button
                onClick={() => controlPolling('force-poll')}
                className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
              >
                Poll Now
              </button>
              <button
                onClick={() => controlPolling('stop')}
                className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
              >
                Stop
              </button>
            </>
          )}
        </div>
      </div>
      
      {lastCheck && (
        <p className="text-xs text-gray-400 mt-2">
          Last checked: {lastCheck.toLocaleTimeString()}
        </p>
      )}
      
      <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
        <strong>Note:</strong> Since we use a shared Recall.ai account, we can't receive webhooks. 
        This service polls your active bots every 30 seconds to check for completed transcripts.
      </div>
    </div>
  );
}
