'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  CogIcon, 
  LinkIcon, 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Layout from '@/components/Layout';

interface UserSettings {
  botJoinMinutes: number;
  defaultNotetaker: boolean;
  notifications: boolean;
}

interface SocialAccount {
  id: string;
  platform: 'linkedin' | 'facebook';
  connected: boolean;
  email?: string;
  expiresAt?: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [settings, setSettings] = useState<UserSettings>({
    botJoinMinutes: 2,
    defaultNotetaker: true,
    notifications: true
  });
  
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState<{[key: string]: boolean}>({});
  const [oauthStatus, setOauthStatus] = useState<{linkedin: boolean; facebook: boolean}>({
    linkedin: false,
    facebook: false
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    
    if (status === 'authenticated') {
      fetchSettings();
      fetchSocialAccounts();
      fetchOAuthStatus();
      
      // Handle URL parameters for success/error messages
      const success = searchParams.get('success');
      const error = searchParams.get('error');
      
      if (success === 'linkedin_connected') {
        alert('LinkedIn account connected successfully!');
        // Clean up URL
        router.replace('/settings');
      } else if (success === 'facebook_connected') {
        alert('Facebook account connected successfully!');
        // Clean up URL
        router.replace('/settings');
      } else if (error) {
        const errorMessages: {[key: string]: string} = {
          'linkedin_not_configured': 'LinkedIn OAuth is not configured. Please follow the setup guide in SOCIAL_MEDIA_SETUP.md to configure your LinkedIn credentials.',
          'facebook_not_configured': 'Facebook OAuth is not configured. Please follow the setup guide in SOCIAL_MEDIA_SETUP.md to configure your Facebook credentials.',
          'oauth_error': 'OAuth authentication failed. Please try again.',
          'unauthorized': 'You must be logged in to connect social accounts.',
          'token_exchange_failed': 'Failed to exchange OAuth token. Please try again.',
          'profile_fetch_failed': 'Failed to fetch profile information. Please try again.',
          'oauth_callback_error': 'OAuth callback error. Please try again.'
        };
        
        alert(errorMessages[error] || 'An error occurred during OAuth authentication.');
        // Clean up URL
        router.replace('/settings');
      }
    }
  }, [status, router, searchParams]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchSocialAccounts = async () => {
    try {
      const response = await fetch('/api/settings/social-accounts');
      if (response.ok) {
        const data = await response.json();
        setSocialAccounts(data);
      }
    } catch (error) {
      console.error('Error fetching social accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOAuthStatus = async () => {
    try {
      const response = await fetch('/api/oauth/status');
      if (response.ok) {
        const data = await response.json();
        setOauthStatus(data);
      }
    } catch (error) {
      console.error('Error fetching OAuth status:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Check if OAuth is configured for a platform
  const isOAuthConfigured = (platform: 'linkedin' | 'facebook') => {
    return oauthStatus[platform];
  };

  const connectSocialAccount = async (platform: 'linkedin' | 'facebook') => {
    // Check if OAuth is configured
    if (!isOAuthConfigured(platform)) {
      alert(`${platform.charAt(0).toUpperCase() + platform.slice(1)} OAuth is not yet configured. Please follow the setup guide in SOCIAL_MEDIA_SETUP.md to add your OAuth credentials to the environment variables.`);
      return;
    }

    setConnecting(prev => ({ ...prev, [platform]: true }));
    
    try {
      // Redirect to OAuth flow
      window.location.href = `/api/auth/oauth/${platform}`;
    } catch (error) {
      console.error(`Error connecting ${platform}:`, error);
      setConnecting(prev => ({ ...prev, [platform]: false }));
    }
  };

  const disconnectSocialAccount = async (platform: 'linkedin' | 'facebook') => {
    if (!confirm(`Are you sure you want to disconnect your ${platform} account?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/social-accounts/${platform}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSocialAccounts(prev => 
          prev.map(account => 
            account.platform === platform 
              ? { ...account, connected: false, email: undefined, expiresAt: undefined }
              : account
          )
        );
        alert(`${platform} account disconnected successfully!`);
      } else {
        alert(`Failed to disconnect ${platform} account`);
      }
    } catch (error) {
      alert(`Failed to disconnect ${platform} account`);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const getAccountStatus = (account: SocialAccount) => {
    if (!account.connected) {
      return { status: 'disconnected', color: 'text-gray-500', icon: XCircleIcon };
    }
    
    if (account.expiresAt && new Date(account.expiresAt) < new Date()) {
      return { status: 'expired', color: 'text-red-500', icon: ExclamationTriangleIcon };
    }
    
    return { status: 'connected', color: 'text-green-500', icon: CheckCircleIcon };
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Settings
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage your account preferences, social media connections, and bot configuration.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Bot Configuration */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center mb-4">
                <ClockIcon className="h-5 w-5 text-indigo-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Bot Configuration</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="botJoinMinutes" className="block text-sm font-medium text-gray-700">
                    Bot Join Time
                  </label>
                  <div className="mt-1 flex items-center">
                    <input
                      type="number"
                      id="botJoinMinutes"
                      min="1"
                      max="15"
                      value={settings.botJoinMinutes}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        botJoinMinutes: parseInt(e.target.value) || 2 
                      }))}
                      className="block w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <span className="ml-2 text-sm text-gray-500">
                      minutes before meeting starts
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    How many minutes before the meeting starts should the bot join? (1-15 minutes)
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    id="defaultNotetaker"
                    type="checkbox"
                    checked={settings.defaultNotetaker}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      defaultNotetaker: e.target.checked 
                    }))}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="defaultNotetaker" className="ml-2 block text-sm text-gray-900">
                    Enable notetaker by default for new meetings
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="notifications"
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      notifications: e.target.checked 
                    }))}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="notifications" className="ml-2 block text-sm text-gray-900">
                    Enable email notifications for meeting updates
                  </label>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>

          {/* Social Media Connections */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center mb-4">
                <LinkIcon className="h-5 w-5 text-indigo-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Social Media Connections</h3>
              </div>
              
              <p className="text-sm text-gray-500 mb-6">
                Connect your social media accounts to enable direct posting of AI-generated content.
              </p>

              <div className="space-y-4">
                {/* LinkedIn */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-sm">in</span>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900">LinkedIn</h4>
                      {socialAccounts.find(acc => acc.platform === 'linkedin')?.connected ? (
                        <div className="flex items-center">
                          {(() => {
                            const account = socialAccounts.find(acc => acc.platform === 'linkedin');
                            const { status, color, icon: StatusIcon } = getAccountStatus(account!);
                            return (
                              <>
                                <StatusIcon className={`h-4 w-4 ${color} mr-1`} />
                                <span className={`text-xs ${color}`}>
                                  {status === 'connected' && 'Connected'}
                                  {status === 'expired' && 'Token Expired'}
                                  {status === 'disconnected' && 'Disconnected'}
                                </span>
                                {account?.email && (
                                  <span className="text-xs text-gray-500 ml-2">• {account.email}</span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Not connected</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {socialAccounts.find(acc => acc.platform === 'linkedin')?.connected ? (
                      <>
                        <button
                          onClick={() => connectSocialAccount('linkedin')}
                          disabled={connecting.linkedin}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          {connecting.linkedin ? 'Reconnecting...' : 'Reconnect'}
                        </button>
                        <button
                          onClick={() => disconnectSocialAccount('linkedin')}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => connectSocialAccount('linkedin')}
                        disabled={connecting.linkedin}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {connecting.linkedin ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Facebook */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-blue-500 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-sm">f</span>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900">Facebook</h4>
                      {socialAccounts.find(acc => acc.platform === 'facebook')?.connected ? (
                        <div className="flex items-center">
                          {(() => {
                            const account = socialAccounts.find(acc => acc.platform === 'facebook');
                            const { status, color, icon: StatusIcon } = getAccountStatus(account!);
                            return (
                              <>
                                <StatusIcon className={`h-4 w-4 ${color} mr-1`} />
                                <span className={`text-xs ${color}`}>
                                  {status === 'connected' && 'Connected'}
                                  {status === 'expired' && 'Token Expired'}
                                  {status === 'disconnected' && 'Disconnected'}
                                </span>
                                {account?.email && (
                                  <span className="text-xs text-gray-500 ml-2">• {account.email}</span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Not connected</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {socialAccounts.find(acc => acc.platform === 'facebook')?.connected ? (
                      <>
                        <button
                          onClick={() => connectSocialAccount('facebook')}
                          disabled={connecting.facebook}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          {connecting.facebook ? 'Reconnecting...' : 'Reconnect'}
                        </button>
                        <button
                          onClick={() => disconnectSocialAccount('facebook')}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => connectSocialAccount('facebook')}
                        disabled={connecting.facebook}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
                      >
                        {connecting.facebook ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
