'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CogIcon,
  ShareIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import Layout from '@/components/Layout';

interface Automation {
  id: string;
  name: string;
  platform: 'linkedin' | 'facebook';
  template: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AutomationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    
    if (status === 'authenticated') {
      fetchAutomations();
    }
  }, [status, router]);

  const fetchAutomations = async () => {
    try {
      const response = await fetch('/api/automations');
      if (response.ok) {
        const data = await response.json();
        setAutomations(data);
      }
    } catch (error) {
      console.error('Error fetching automations:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteAutomation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAutomations(prev => prev.filter(a => a.id !== id));
        alert('Automation deleted successfully!');
      } else {
        alert('Failed to delete automation');
      }
    } catch (error) {
      alert('Failed to delete automation');
    }
  };

  const toggleAutomation = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        setAutomations(prev => 
          prev.map(a => a.id === id ? { ...a, enabled } : a)
        );
      } else {
        alert('Failed to update automation');
      }
    } catch (error) {
      alert('Failed to update automation');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Content Automations
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Create custom templates for generating social media content from your meetings.
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Automation
            </button>
          </div>
        </div>
        {/* Automations List */}
        {automations.length === 0 ? (
          <div className="text-center py-12">
            <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No automations yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first content automation.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Automation
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {automations.map((automation) => (
                <li key={automation.id}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {automation.platform === 'linkedin' ? (
                          <div className="h-10 w-10 bg-blue-600 rounded flex items-center justify-center">
                            <span className="text-white font-bold text-sm">in</span>
                          </div>
                        ) : (
                          <div className="h-10 w-10 bg-blue-500 rounded flex items-center justify-center">
                            <span className="text-white font-bold text-sm">f</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <h3 className="text-sm font-medium text-gray-900">
                            {automation.name}
                          </h3>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            automation.enabled 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                          {automation.enabled ? 'Active' : 'Inactive'}
                        </span>
                        </div>
                        <p className="text-sm text-gray-500 capitalize">
                          {automation.platform} • Created {new Date(automation.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 max-w-md truncate">
                          {automation.template}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleAutomation(automation.id, !automation.enabled)}
                        className={`p-2 rounded-full ${
                          automation.enabled 
                            ? 'text-green-600 hover:bg-green-50' 
                            : 'text-gray-400 hover:bg-gray-50'
                        }`}
                        title={automation.enabled ? 'Disable automation' : 'Enable automation'}
                      >
                        {automation.enabled ? (
                          <CheckCircleIcon className="h-5 w-5" />
                        ) : (
                          <XCircleIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingAutomation(automation)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full"
                        title="Edit automation"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteAutomation(automation.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                        title="Delete automation"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Create/Edit Modal */}
        {(showCreateModal || editingAutomation) && (
          <AutomationModal
            automation={editingAutomation}
            onClose={() => {
              setShowCreateModal(false);
              setEditingAutomation(null);
            }}
            onSave={(automation) => {
              if (editingAutomation) {
                setAutomations(prev => 
                  prev.map(a => a.id === automation.id ? automation : a)
                );
              } else {
                setAutomations(prev => [...prev, automation]);
              }
              setShowCreateModal(false);
              setEditingAutomation(null);
            }}
          />
        )}
      </div>
    </Layout>
  );
}

interface AutomationModalProps {
  automation: Automation | null;
  onClose: () => void;
  onSave: (automation: Automation) => void;
}

function AutomationModal({ automation, onClose, onSave }: AutomationModalProps) {
  const [formData, setFormData] = useState({
    name: automation?.name || '',
    platform: automation?.platform || 'linkedin' as 'linkedin' | 'facebook',
    template: automation?.template || '',
    enabled: automation?.enabled ?? true,
  });
  const [saving, setSaving] = useState(false);

  const defaultTemplates = {
    linkedin: `Create a professional LinkedIn post (120-180 words) that:

1. Summarizes the key insights from this meeting in first person
2. Uses a warm, professional tone suitable for business networking
3. Highlights actionable takeaways or lessons learned
4. Ends with 2-3 relevant hashtags
5. Includes a question to encourage engagement

Return only the post text.`,
    facebook: `Create an engaging Facebook post (100-150 words) that:

1. Shares the meeting insights in a conversational, friendly tone
2. Uses storytelling to make it relatable and engaging
3. Includes an emotional hook or personal reflection
4. Ends with 1-2 relevant hashtags
5. Asks a question to encourage comments and discussion

Return only the post text.`
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = automation ? `/api/automations/${automation.id}` : '/api/automations';
      const method = automation ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const savedAutomation = await response.json();
        onSave(savedAutomation);
        alert(`Automation ${automation ? 'updated' : 'created'} successfully!`);
      } else {
        alert(`Failed to ${automation ? 'update' : 'create'} automation`);
      }
    } catch (error) {
      alert(`Failed to ${automation ? 'update' : 'create'} automation`);
    } finally {
      setSaving(false);
    }
  };

  const useDefaultTemplate = () => {
    setFormData(prev => ({
      ...prev,
      template: defaultTemplates[prev.platform]
    }));
  };

  return (
    <Layout>
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {automation ? 'Edit Automation' : 'Create New Automation'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., Generate LinkedIn post"
              />
            </div>

            <div>
              <label htmlFor="platform" className="block text-sm font-medium text-gray-700">
                Platform
              </label>
              <select
                id="platform"
                value={formData.platform}
                onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value as 'linkedin' | 'facebook' }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="linkedin">LinkedIn</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="template" className="block text-sm font-medium text-gray-700">
                  Template
                </label>
                <button
                  type="button"
                  onClick={useDefaultTemplate}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Use default template
                </button>
              </div>
              <textarea
                id="template"
                required
                rows={8}
                value={formData.template}
                onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter your custom prompt template..."
              />
              <p className="mt-1 text-xs text-gray-500">
                This template will be used to generate content. You can reference meeting data and customize the tone and style.
              </p>
            </div>

            <div className="flex items-center">
              <input
                id="enabled"
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
                Enable automation
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {saving ? 'Saving...' : (automation ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </Layout>
  );
}
