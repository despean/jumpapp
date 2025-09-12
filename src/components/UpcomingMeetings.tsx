'use client';

import { useState, useEffect } from 'react';
import { useUpcomingMeetings, ProcessedCalendarEvent } from '@/hooks/useCalendarEvents';
import { 
  CalendarIcon, 
  UsersIcon, 
  ClockIcon,
  LinkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Switch } from '@headlessui/react';

function MeetingPlatformIcon({ platform }: { platform: string }) {
  const iconClass = "h-5 w-5";
  
  switch (platform) {
    case 'zoom':
      return (
        <div className="bg-blue-100 p-1 rounded">
          <div className={`${iconClass} bg-blue-600`} style={{
            mask: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 24 24\' fill=\'currentColor\'%3E%3Cpath d=\'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z\'/%3E%3C/svg%3E") center/contain',
            WebkitMask: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 24 24\' fill=\'currentColor\'%3E%3Cpath d=\'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z\'/%3E%3C/svg%3E") center/contain'
          }} />
        </div>
      );
    case 'teams':
      return (
        <div className="bg-purple-100 p-1 rounded">
          <UsersIcon className={`${iconClass} text-purple-600`} />
        </div>
      );
    case 'meet':
      return (
        <div className="bg-green-100 p-1 rounded">
          <LinkIcon className={`${iconClass} text-green-600`} />
        </div>
      );
    default:
      return (
        <div className="bg-gray-100 p-1 rounded">
          <LinkIcon className={`${iconClass} text-gray-600`} />
        </div>
      );
  }
}

function MeetingCard({ event, onToggleNotetaker }: { 
  event: ProcessedCalendarEvent;
  onToggleNotetaker: (meetingId: string, enabled: boolean) => void;
}) {
  const [notetakerEnabled, setNotetakerEnabled] = useState(event.notetakerEnabled || false);
  const [botStatus, setBotStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check bot status when component mounts if bot exists
  useEffect(() => {
    if (event.botId && notetakerEnabled) {
      checkBotStatus(event.botId);
    }
  }, [event.botId, notetakerEnabled]);

  const checkBotStatus = async (botId: string) => {
    try {
      const response = await fetch(`/api/bots/${botId}`);
      const data = await response.json();
      if (response.ok) {
        setBotStatus(data.bot.status);
        return data.bot.status;
      }
    } catch (error) {
      console.error('❌ Error checking bot status:', error);
    }
    return null;
  };

  const handleToggle = async (enabled: boolean) => {
    setIsLoading(true);
    
    if (enabled) {
      // Check if bot already exists
      if (event.botId) {
        console.log('🤖 Bot already exists, checking status...');
        const status = await checkBotStatus(event.botId);
        if (status) {
          setNotetakerEnabled(true);
          setBotStatus(status);
          setIsLoading(false);
          return;
        }
      }
    }
    
    try {
      await onToggleNotetaker(event.meetingId, enabled);
      // Success - the refetch in onToggleNotetaker will update the data
      // Keep the current toggle state until refetch completes
    } catch (error) {
      console.error('❌ Toggle failed:', error);
      // Revert the toggle state on error
      setNotetakerEnabled(!enabled);
      // TODO: Show error message to user
    } finally {
      setIsLoading(false);
    }
  };

  const startTime = event.start.dateTime ? new Date(event.start.dateTime) : null;
  const isToday = startTime ? startTime.toDateString() === new Date().toDateString() : false;
  const isTomorrow = startTime ? 
    startTime.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString() : false;

  const getDateLabel = () => {
    if (!startTime) return '';
    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';
    return startTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
      event.isStartingSoon ? 'border-orange-200 bg-orange-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            {event.meetingPlatform && (
              <MeetingPlatformIcon platform={event.meetingPlatform.platform} />
            )}
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {event.summary}
            </h3>
            {event.isStartingSoon && (
              <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />
            )}
          </div>
          
          <div className="space-y-1 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <CalendarIcon className="h-3 w-3" />
              <span>{getDateLabel()}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <ClockIcon className="h-3 w-3" />
              <span>{event.formattedTime}</span>
              {event.duration > 0 && (
                <span>({event.duration} min)</span>
              )}
            </div>
            
            {event.attendeeCount > 0 && (
              <div className="flex items-center space-x-1">
                <UsersIcon className="h-3 w-3" />
                <span>{event.attendeeCount} attendee{event.attendeeCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        <div className="ml-4 flex-shrink-0">
          <div className="flex flex-col items-end">
            <div className="flex items-center">
              <label className="text-xs text-gray-600 mr-2">AI Notetaker</label>
              <Switch
                checked={notetakerEnabled}
                onChange={handleToggle}
                disabled={isLoading}
                className={`${
                  notetakerEnabled ? 'bg-blue-600' : 'bg-gray-200'
                } ${isLoading ? 'opacity-50' : ''} relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75`}
              >
                <span
                  aria-hidden="true"
                  className={`${
                    notetakerEnabled ? 'translate-x-3' : 'translate-x-0'
                  } pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
                />
              </Switch>
            </div>
            {(event.botId || botStatus) && (
              <div className="mt-1 text-right">
                <div className="text-xs text-gray-500">
                  Bot: {event.botId?.substring(0, 8)}...
                </div>
                {botStatus && (
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                    botStatus === 'done' ? 'bg-green-100 text-green-800' :
                    botStatus === 'in_call_recording' ? 'bg-blue-100 text-blue-800' :
                    botStatus === 'joining_call' ? 'bg-yellow-100 text-yellow-800' :
                    botStatus === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {botStatus}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {event.meetingPlatform && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <a
            href={event.meetingPlatform.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
          >
            <LinkIcon className="h-3 w-3 mr-1" />
            Join {event.meetingPlatform.platform} meeting
          </a>
        </div>
      )}
    </div>
  );
}

export function UpcomingMeetings() {
  const { data, isLoading, error, refetch } = useUpcomingMeetings();

  const handleToggleNotetaker = async (meetingId: string, enabled: boolean) => {
    console.log(`Toggle notetaker for meeting ${meetingId}: ${enabled}`);
    
    try {
      if (enabled) {
        console.log('🤖 Creating bot for meeting ID:', meetingId);
        
        // Create bot for this meeting
        const response = await fetch('/api/bots/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            meetingId: meetingId,
            joinMinutesBefore: 2, // TODO: Make this configurable
          }),
        });

        const result = await response.json();
        console.log('🔍 Bot creation response:', result);

        if (response.ok) {
          console.log('✅ Bot created successfully:', result.bot.id);
          // Refetch calendar events to update UI with bot info
          refetch();
        } else if (result.error?.includes('Bot already exists')) {
          console.log('ℹ️ Bot already exists for this meeting:', result.botId);
          // This is actually fine - the bot is already created
          // Refetch to update UI with existing bot info
          refetch();
        } else {
          console.error('❌ Failed to create bot:', result.error);
          console.error('❌ Full response:', result);
          throw new Error(result.error || 'Failed to create bot');
        }
      } else {
        // Handle bot removal
        const meetingData = data?.events.find(e => e.meetingId === meetingId);
        if (meetingData?.botId) {
          console.log('🔄 Removing bot tracking for meeting:', meetingId);
          
          const response = await fetch(`/api/bots/${meetingData.botId}/remove`, {
            method: 'DELETE',
          });

          const result = await response.json();
          console.log('🔍 Bot removal response:', result);

          if (response.ok) {
            console.log('✅ Bot tracking removed successfully');
            // Refetch calendar events to update UI
            refetch();
          } else {
            console.error('❌ Failed to remove bot:', result.error);
            throw new Error(result.error || 'Failed to remove bot');
          }
        } else {
          console.log('ℹ️ No bot to remove for this meeting');
          // No bot exists, just refetch to update UI state
          refetch();
        }
      }
    } catch (error) {
      console.error('❌ Error in handleToggleNotetaker:', error);
      throw error; // Re-throw so the MeetingCard can handle it
    }
  };

  const handleConnectCalendar = () => {
    // TODO: Implement Google Calendar connection flow
    window.location.href = '/api/auth/signin/google';
  };

  if (isLoading) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Upcoming Meetings
          </h3>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-20 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Upcoming Meetings
          </h3>
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Connection Error</h3>
            <p className="mt-1 text-sm text-gray-500">
              {error.message.includes('not connected') 
                ? 'Google Calendar not connected' 
                : 'Failed to load calendar events'
              }
            </p>
            <div className="mt-6 space-x-3">
              <button
                onClick={() => refetch()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Retry
              </button>
              {error.message.includes('not connected') && (
                <button
                  onClick={handleConnectCalendar}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Connect Calendar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const events = data?.events || [];

  if (events.length === 0) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Upcoming Meetings
          </h3>
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming meetings</h3>
            <p className="mt-1 text-sm text-gray-500">
              No meetings with video links found in your calendar.
            </p>
            <div className="mt-6">
              <button
                onClick={() => refetch()}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Refresh Calendar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Upcoming Meetings
          </h3>
          <button
            onClick={() => refetch()}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>
        
        <div className="space-y-3">
          {events.map((event) => (
            <MeetingCard
              key={event.id}
              event={event}
              onToggleNotetaker={handleToggleNotetaker}
            />
          ))}
        </div>

        {events.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              Showing meetings with video conference links only
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
