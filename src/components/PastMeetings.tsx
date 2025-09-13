'use client';

import { useState, useEffect } from 'react';
import { DocumentTextIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { PlatformLogo } from './PlatformLogos';
import Link from 'next/link';

interface Meeting {
  id: string;
  title: string;
  platform?: string;
  startTime: string;
  duration?: number;
  attendees?: string;
  transcript?: {
    content: string;
    duration: number;
    attendees: string;
  };
  status: string;
}

export default function PastMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const response = await fetch('/api/meetings/past');
        const data = await response.json();
        
        if (response.ok) {
          setMeetings(data.meetings || []);
        } else {
          setError(data.error || 'Failed to fetch meetings');
        }
      } catch (err) {
        setError('Failed to load meetings');
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parseAttendees = (attendeesJson?: string) => {
    if (!attendeesJson) return [];
    try {
      const parsed = JSON.parse(attendeesJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Past Meetings
          </h3>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex space-x-4">
                <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
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
            Past Meetings
          </h3>
          <div className="text-center py-8">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-red-400" />
            <p className="mt-2 text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Past Meetings
        </h3>
        
        {meetings.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No meetings yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your completed meetings with transcripts will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.slice(0, 5).map((meeting) => {
              const attendees = parseAttendees(meeting.transcript?.attendees || meeting.attendees);
              
              return (
                <div key={meeting.id} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex-shrink-0">
                    <PlatformLogo platform={meeting.platform} className="h-10 w-10" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {meeting.title}
                      </p>
                      <div className="flex items-center space-x-2">
                        {meeting.transcript ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <DocumentTextIcon className="h-3 w-3 mr-1" />
                            Transcript Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Processing...
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {formatDate(meeting.startTime)}
                      </span>
                      
                      {(meeting.transcript?.duration || meeting.duration) && (
                        <span className="flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {formatDuration(meeting.transcript?.duration || meeting.duration)}
                        </span>
                      )}
                      
                      {attendees.length > 0 && (
                        <span className="flex items-center">
                          <UserGroupIcon className="h-3 w-3 mr-1" />
                          {attendees.length} attendee{attendees.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <Link
                      href={`/meeting/${meeting.id}`}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
            
            {meetings.length > 5 && (
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Showing 5 of {meetings.length} meetings
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
