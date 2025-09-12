import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

export interface PastMeeting {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  platform: 'zoom' | 'teams' | 'meet' | 'other';
  meetingUrl: string;
  attendeesCount: number;
  status: string;
  hasTranscript: boolean;
  botInfo?: {
    id: string;
    status: string;
    createdAt: string;
  };
  transcript?: {
    id: string;
    hasContent: boolean;
    contentLength: number;
    summary?: string;
    attendees: Array<{
      id: string;
      name: string;
    }>;
    duration?: number;
    processedAt: string;
  };
  createdAt: string;
}

export interface PastMeetingsResponse {
  meetings: PastMeeting[];
  summary: {
    total: number;
    withTranscripts: number;
    withoutTranscripts: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface MeetingTranscript {
  meeting: {
    id: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    platform: string;
    attendeesCount: number;
  };
  transcript: {
    id: string;
    content: string;
    summary?: string;
    attendees: Array<{
      id: string;
      name: string;
    }>;
    duration?: number;
    processedAt: string;
    createdAt: string;
  };
}

export function usePastMeetings(limit: number = 20, offset: number = 0) {
  const { data: session, status } = useSession();

  return useQuery<PastMeetingsResponse>({
    queryKey: ['pastMeetings', limit, offset],
    queryFn: async () => {
      const response = await fetch(`/api/meetings/past?limit=${limit}&offset=${offset}`);
      if (!response.ok) {
        throw new Error('Failed to fetch past meetings');
      }
      return response.json();
    },
    enabled: status === 'authenticated' && !!session,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useMeetingTranscript(meetingId: string | null) {
  const { data: session, status } = useSession();

  return useQuery<MeetingTranscript>({
    queryKey: ['meetingTranscript', meetingId],
    queryFn: async () => {
      if (!meetingId) throw new Error('Meeting ID is required');
      
      const response = await fetch(`/api/meetings/${meetingId}/transcript`);
      if (!response.ok) {
        throw new Error('Failed to fetch transcript');
      }
      return response.json();
    },
    enabled: status === 'authenticated' && !!session && !!meetingId,
    staleTime: 10 * 60 * 1000, // 10 minutes (transcripts don't change often)
    refetchOnWindowFocus: false,
  });
}
