'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { CalendarIcon, CogIcon, DocumentTextIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { UpcomingMeetings } from '@/components/UpcomingMeetings';
import PastMeetings from '@/components/PastMeetings';
import Layout from '@/components/Layout';

export default function Home() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState({
    totalMeetings: 0,
    postsGenerated: 0,
    automations: 0
  });

  useEffect(() => {
    if (session) {
      fetchStats();
    }
  }, [session]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">JumpApp</h1>
            <p className="text-lg text-gray-600 mb-8">
              Transform your meeting insights into engaging social media content
            </p>
            
            <div className="space-y-4">
              <button
                onClick={() => signIn('google')}
                className="w-full flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
              
              <div className="text-sm text-gray-500 text-center">
                Connect your Google Calendar to get started
              </div>
            </div>
          </div>
          
          <div className="mt-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">How it works:</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CalendarIcon className="h-6 w-6 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Connect Calendar</p>
                  <p className="text-sm text-gray-600">Link your Google Calendar and enable AI notetaker</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <DocumentTextIcon className="h-6 w-6 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">AI Processing</p>
                  <p className="text-sm text-gray-600">Our AI analyzes meeting transcripts and generates content</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CogIcon className="h-6 w-6 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Auto-Post</p>
                  <p className="text-sm text-gray-600">Review and post to LinkedIn, Facebook automatically</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {session.user?.name}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalendarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Meetings
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalMeetings}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Posts Generated
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.postsGenerated}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CogIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Automations
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.automations}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Meetings */}
          <UpcomingMeetings />

          {/* Past Meetings */}
          <PastMeetings />
        </div>
      </div>
    </Layout>
  );
}
