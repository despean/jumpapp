'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  ArrowLeftIcon, 
  DocumentTextIcon, 
  ClockIcon, 
  UserGroupIcon,
  EnvelopeIcon,
  ShareIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import Layout from '@/components/Layout';
import { PlatformLogo } from '@/components/PlatformLogos';
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

interface Attendee {
  id: string;
  name: string;
}


export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'transcript' | 'email' | 'social'>('transcript');
  
  // AI Content State
  const [aiEmail, setAiEmail] = useState<any>(null);
  const [aiSocialPosts, setAiSocialPosts] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState<{[key: string]: boolean}>({});
  const [aiErrors, setAiErrors] = useState<{[key: string]: string}>({});
  const [postingLoading, setPostingLoading] = useState<{[key: string]: boolean}>({});
  const [automations, setAutomations] = useState<any[]>([]);
  const [selectedAutomation, setSelectedAutomation] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated' && params.id) {
      fetchMeetingDetails();
      fetchAutomations();
    }
  }, [status, params.id, router]);

  const fetchMeetingDetails = async () => {
    try {
      const response = await fetch(`/api/meetings/details?id=${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setMeeting(data.meeting);
      } else {
        setError(data.error || 'Failed to fetch meeting details');
      }
    } catch (err) {
      setError('Failed to load meeting details');
    } finally {
      setLoading(false);
    }
  };

  // AI Content Generation Functions
  const generateAIEmail = async (tone: 'professional' | 'casual' | 'formal' = 'professional') => {
    if (!params.id) return;
    
    setAiLoading(prev => ({ ...prev, email: true }));
    setAiErrors(prev => ({ ...prev, email: '' }));
    
    try {
      const response = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meetingId: params.id, tone }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setAiEmail(data.email);
      } else {
        setAiErrors(prev => ({ ...prev, email: data.error || 'Failed to generate email' }));
      }
    } catch (err) {
      setAiErrors(prev => ({ ...prev, email: 'Failed to generate email' }));
    } finally {
      setAiLoading(prev => ({ ...prev, email: false }));
    }
  };

  const generateAISocialPosts = async () => {
    if (!params.id) return;
    
    setAiLoading(prev => ({ ...prev, social: true }));
    setAiErrors(prev => ({ ...prev, social: '' }));
    
    try {
      const response = await fetch('/api/ai/generate-social-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meetingId: params.id }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setAiSocialPosts(data.posts);
      } else {
        setAiErrors(prev => ({ ...prev, social: data.error || 'Failed to generate social posts' }));
      }
    } catch (err) {
      setAiErrors(prev => ({ ...prev, social: 'Failed to generate social posts' }));
    } finally {
      setAiLoading(prev => ({ ...prev, social: false }));
    }
  };

  const generateAISummary = async () => {
    if (!params.id) return;
    
    setAiLoading(prev => ({ ...prev, summary: true }));
    setAiErrors(prev => ({ ...prev, summary: '' }));
    
    try {
      const response = await fetch('/api/ai/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meetingId: params.id }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setAiSummary(data.summary);
      } else {
        setAiErrors(prev => ({ ...prev, summary: data.error || 'Failed to generate summary' }));
      }
    } catch (err) {
      setAiErrors(prev => ({ ...prev, summary: 'Failed to generate summary' }));
    } finally {
      setAiLoading(prev => ({ ...prev, summary: false }));
    }
  };

  const fetchAutomations = async () => {
    try {
      const response = await fetch('/api/automations');
      if (response.ok) {
        const data = await response.json();
        setAutomations(data.filter((a: any) => a.enabled));
      }
    } catch (error) {
      console.error('Error fetching automations:', error);
    }
  };

  const generateWithAutomation = async () => {
    if (!selectedAutomation) {
      alert('Please select an automation first');
      return;
    }

    setAiLoading(prev => ({ ...prev, automation: true }));
    setAiErrors(prev => ({ ...prev, automation: '' }));
    
    try {
      const response = await fetch('/api/ai/generate-with-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId: params.id,
          automationId: selectedAutomation,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Add the generated post to the existing posts
        setAiSocialPosts(prev => [...prev, data.post]);
        alert(`Post generated successfully using "${data.automation.name}" automation!`);
      } else {
        setAiErrors(prev => ({ ...prev, automation: data.error || 'Failed to generate post' }));
      }
    } catch (err) {
      setAiErrors(prev => ({ ...prev, automation: 'Failed to generate post with automation' }));
    } finally {
      setAiLoading(prev => ({ ...prev, automation: false }));
    }
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
      alert('Content copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy content');
    }
  };

  // Post to social media function
  const postToSocialMedia = async (platform: 'linkedin' | 'facebook', content: string) => {
    setPostingLoading(prev => ({ ...prev, [platform]: true }));
    
    try {
      const response = await fetch(`/api/social/${platform}/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.success) {
          alert(`Successfully posted to ${platform.charAt(0).toUpperCase() + platform.slice(1)}!`);
        } else {
          alert(data.message || `Posting to ${platform} is not yet configured.`);
        }
      } else {
        alert(data.error || `Failed to post to ${platform}`);
      }
    } catch (err) {
      alert(`Failed to post to ${platform}`);
    } finally {
      setPostingLoading(prev => ({ ...prev, [platform]: false }));
    }
  };

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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parseAttendees = (attendeesJson?: string): Attendee[] => {
    if (!attendeesJson) return [];
    try {
      const parsed = JSON.parse(attendeesJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };


  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Error loading meeting</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Meeting not found</h3>
            <p className="mt-1 text-sm text-gray-500">{"The meeting you're looking for doesn't exist."}</p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const attendees = parseAttendees(meeting.transcript?.attendees || meeting.attendees);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
              </div>
            </div>
            
            <div className="mt-4 flex items-center space-x-4">
              <PlatformLogo platform={meeting.platform} className="h-12 w-12" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
                <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {formatDate(meeting.startTime)}
                  </span>
                  
                  {(meeting.transcript?.duration || meeting.duration) && (
                    <span className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      Duration: {formatDuration(meeting.transcript?.duration || meeting.duration)}
                    </span>
                  )}
                  
                  {attendees.length > 0 && (
                    <span className="flex items-center">
                      <UserGroupIcon className="h-4 w-4 mr-1" />
                      {attendees.length} attendee{attendees.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('transcript')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transcript'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DocumentTextIcon className="h-5 w-5 inline mr-2" />
              Full Transcript
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'email'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <EnvelopeIcon className="h-5 w-5 inline mr-2" />
              Follow-up Email
            </button>
            <button
              onClick={() => setActiveTab('social')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'social'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ShareIcon className="h-5 w-5 inline mr-2" />
              Social Media Posts
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'transcript' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Meeting Transcript</h3>
              {attendees.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">Attendees:</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {attendees.map((attendee, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {attendee.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-6">
              {meeting.transcript?.content ? (
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                    {meeting.transcript.content}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No transcript available</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    The transcript for this meeting is still being processed or is not available.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">AI-Generated Follow-up Email</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Draft email based on meeting transcript and key discussion points
                  </p>
                </div>
                {meeting?.transcript?.content && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => generateAIEmail('professional')}
                      disabled={aiLoading.email}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      {aiLoading.email ? 'Generating...' : 'Generate Email'}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-6">
              {meeting?.transcript?.content ? (
                <div className="space-y-4">
                  {aiErrors.email && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <DocumentTextIcon className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">Error</h3>
                          <div className="mt-2 text-sm text-red-700">
                            <p>{aiErrors.email}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {aiLoading.email && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">Generating AI Email...</h3>
                          <div className="mt-2 text-sm text-blue-700">
                            <p>Analyzing meeting transcript and creating personalized follow-up email.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {aiEmail ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <div className="mb-4">
                        <label className="text-sm font-medium text-gray-700">Subject:</label>
                        <div className="mt-1 p-3 bg-white border border-gray-300 rounded-md">
                          <p className="text-sm text-gray-900">{aiEmail.subject}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Email Body:</label>
                        <div className="mt-1 p-4 bg-white border border-gray-300 rounded-md">
                          <div className="whitespace-pre-wrap text-sm text-gray-900">
                            {aiEmail.body}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : !aiLoading.email && !aiErrors.email && (
                    <div className="text-center py-12">
                      <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-lg font-medium text-gray-900">Ready to Generate Email</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {'Click "Generate Email" to create an AI-powered follow-up email based on your meeting transcript.'}
                      </p>
                    </div>
                  )}
                  
                  {aiEmail && (
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => generateAIEmail('professional')}
                        disabled={aiLoading.email}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Regenerate
                      </button>
                      <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                        Copy to Clipboard
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No transcript available</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    A transcript is needed to generate the follow-up email.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'social' && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ShareIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      AI-Generated Social Media Posts
                    </h3>
                    <div className="mt-1 text-sm text-gray-500">
                      <p>Create engaging posts for LinkedIn and Facebook based on your meeting content.</p>
                    </div>
                  </div>
                </div>
                {meeting?.transcript?.content && (
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={generateAISocialPosts}
                      disabled={aiLoading.social}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      {aiLoading.social ? 'Generating...' : 'Generate Posts'}
                    </button>
                    
                    {automations.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <select
                          value={selectedAutomation}
                          onChange={(e) => setSelectedAutomation(e.target.value)}
                          className="block px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Select automation...</option>
                          {automations.map((automation) => (
                            <option key={automation.id} value={automation.id}>
                              {automation.name} ({automation.platform})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={generateWithAutomation}
                          disabled={aiLoading.automation || !selectedAutomation}
                          className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          {aiLoading.automation ? 'Generating...' : 'Use Automation'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {aiErrors.social && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <DocumentTextIcon className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{aiErrors.social}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {aiErrors.automation && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <DocumentTextIcon className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Automation Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{aiErrors.automation}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {aiLoading.social && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Generating Social Media Posts...</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Creating engaging posts for LinkedIn and Facebook.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!aiLoading.social && !aiErrors.social && aiSocialPosts.length === 0 && meeting?.transcript?.content && (
              <div className="text-center py-12">
                <ShareIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">Ready to Generate Posts</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {'Click "Generate Posts" to create AI-powered social media content for LinkedIn and Facebook.'}
                </p>
              </div>
            )}

            {aiSocialPosts.map((post, index) => (
              <div key={index} className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {post.platform === 'linkedin' && (
                          <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">in</span>
                          </div>
                        )}
                        {post.platform === 'facebook' && (
                          <div className="h-8 w-8 bg-blue-500 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">f</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 capitalize">{post.platform}</h4>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          AI Generated
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => copyToClipboard(post.content)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Copy
                      </button>
                      <button
                        onClick={() => postToSocialMedia(post.platform, post.content)}
                        disabled={postingLoading[post.platform]}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {postingLoading[post.platform] ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="px-6 py-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{post.content}</p>
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {post.hashtags.map((hashtag: string, hashIndex: number) => (
                          <span key={hashIndex} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {hashtag}
                          </span>
                        ))}
                      </div>
                    )}
                    {post.engagement_hook && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-xs text-yellow-800">
                          <strong>Engagement Hook:</strong> {post.engagement_hook}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {aiSocialPosts.length > 0 && (
              <div className="text-center">
                <button
                  onClick={generateAISocialPosts}
                  disabled={aiLoading.social}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Regenerate All Posts
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
