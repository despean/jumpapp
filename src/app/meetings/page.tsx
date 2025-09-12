'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePastMeetings, useMeetingTranscript } from '@/hooks/usePastMeetings';
import { 
  CalendarIcon, 
  ClockIcon, 
  UsersIcon,
  DocumentTextIcon,
  PlayIcon,
  XMarkIcon
} from '@heroicons/react/20/solid';
import Link from 'next/link';

// Platform logos/icons
function PlatformIcon({ platform }: { platform: string }) {
  switch (platform) {
    case 'zoom':
      return <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">Z</div>;
    case 'teams':
      return <div className="w-5 h-5 bg-purple-500 rounded flex items-center justify-center text-white text-xs font-bold">T</div>;
    case 'meet':
      return <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center text-white text-xs font-bold">M</div>;
    default:
      return <div className="w-5 h-5 bg-gray-500 rounded flex items-center justify-center text-white text-xs font-bold">?</div>;
  }
}

function TranscriptModal({ meetingId, onClose }: { meetingId: string; onClose: () => void }) {
  const { data: transcriptData, isLoading, error } = useMeetingTranscript(meetingId);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading transcript...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !transcriptData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Error</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <p className="text-red-600">Failed to load transcript. The meeting may not have been recorded or the transcript is not ready yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{transcriptData.meeting.title}</h3>
            <p className="text-sm text-gray-500">
              {new Date(transcriptData.meeting.startTime).toLocaleDateString()} • 
              {transcriptData.transcript.attendees.length} attendees • 
              {transcriptData.transcript.duration || 0} minutes
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Summary if available */}
          {transcriptData.transcript.summary && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
              <p className="text-blue-800">{transcriptData.transcript.summary}</p>
            </div>
          )}

          {/* Attendees */}
          {transcriptData.transcript.attendees.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Attendees</h4>
              <div className="flex flex-wrap gap-2">
                {transcriptData.transcript.attendees.map((attendee) => (
                  <span 
                    key={attendee.id} 
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    {attendee.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Transcript */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Transcript</h4>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                {transcriptData.transcript.content}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PastMeetingsPage() {
  const { data: session, status } = useSession();
  const { data, isLoading, error, refetch } = usePastMeetings();
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

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
          <h1 className="text-2xl font-bold mb-4">Please sign in to view past meetings</h1>
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
              <h1 className="text-2xl font-bold text-gray-900">Past Meetings</h1>
              <p className="text-gray-600">View transcripts and recordings from your meetings</p>
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading past meetings...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading meetings</h3>
                <p className="text-sm text-red-700 mt-1">
                  {error.message}
                </p>
                <button 
                  onClick={() => refetch()}
                  className="mt-2 text-sm text-red-800 underline hover:text-red-900"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {data && (
          <>
            {/* Summary */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{data.summary.total}</div>
                  <div className="text-sm text-gray-500">Total Meetings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{data.summary.withTranscripts}</div>
                  <div className="text-sm text-gray-500">With Transcripts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-400">{data.summary.withoutTranscripts}</div>
                  <div className="text-sm text-gray-500">No Transcript</div>
                </div>
              </div>
            </div>

            {/* Meetings List */}
            {data.meetings.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No past meetings</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your completed meetings will appear here once they finish.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.meetings.map((meeting) => (
                  <div key={meeting.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <PlatformIcon platform={meeting.platform} />
                            <h3 className="text-lg font-medium text-gray-900">{meeting.title}</h3>
                            {meeting.hasTranscript && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Transcript Available
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                            <div className="flex items-center space-x-1">
                              <CalendarIcon className="h-4 w-4" />
                              <span>{new Date(meeting.startTime).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <ClockIcon className="h-4 w-4" />
                              <span>{meeting.duration} min</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <UsersIcon className="h-4 w-4" />
                              <span>{meeting.attendeesCount} attendees</span>
                            </div>
                          </div>

                          {meeting.transcript?.attendees && meeting.transcript.attendees.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {meeting.transcript.attendees.slice(0, 3).map((attendee) => (
                                <span 
                                  key={attendee.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                                >
                                  {attendee.name}
                                </span>
                              ))}
                              {meeting.transcript.attendees.length > 3 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                  +{meeting.transcript.attendees.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          {meeting.hasTranscript ? (
                            <button
                              onClick={() => setSelectedMeetingId(meeting.id)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                            >
                              <DocumentTextIcon className="h-4 w-4 mr-1" />
                              View Transcript
                            </button>
                          ) : (
                            <span className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-500 bg-gray-50">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              Processing...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Transcript Modal */}
      {selectedMeetingId && (
        <TranscriptModal 
          meetingId={selectedMeetingId} 
          onClose={() => setSelectedMeetingId(null)} 
        />
      )}
    </div>
  );
}
