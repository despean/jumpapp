import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

export interface ProcessedCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  htmlLink: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  meetingPlatform?: {
    platform: 'zoom' | 'teams' | 'meet' | 'other';
    url: string;
    meetingId?: string;
  } | null;
  attendeeCount: number;
  duration: number;
  formattedTime: string;
  isStartingSoon: boolean;
}

interface CalendarEventsResponse {
  events: ProcessedCalendarEvent[];
}

interface CalendarEventsError {
  error: string;
  needsConnection?: boolean;
}

async function fetchCalendarEvents(maxResults: number = 10): Promise<CalendarEventsResponse> {
  const response = await fetch(`/api/calendar/events?maxResults=${maxResults}`);
  
  if (!response.ok) {
    const errorData: CalendarEventsError = await response.json();
    throw new Error(errorData.error || 'Failed to fetch calendar events');
  }
  
  return response.json();
}

export function useCalendarEvents(maxResults: number = 10) {
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: ['calendar-events', maxResults],
    queryFn: () => fetchCalendarEvents(maxResults),
    enabled: status === 'authenticated' && !!session,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if it's an auth error
      if (error.message.includes('not connected') || error.message.includes('expired')) {
        return false;
      }
      return failureCount < 3;
    }
  });
}

export function useUpcomingMeetings() {
  const query = useCalendarEvents(20); // Get more events to filter

  return {
    ...query,
    data: query.data ? {
      ...query.data,
      events: query.data.events.filter(event => 
        event.meetingPlatform && // Only events with meeting links
        event.start.dateTime && // Only events with specific times
        new Date(event.start.dateTime) > new Date() // Only future events
      )
    } : undefined
  };
}
