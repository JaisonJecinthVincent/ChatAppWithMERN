import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';

const OAuthAccountManager = () => {
  const { authUser } = useAuthStore();
  const [linkedProviders, setLinkedProviders] = useState({});
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchLinkedProviders();
  }, []);

  const fetchLinkedProviders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/oauth/providers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLinkedProviders(data.linkedProviders);
        setHasPassword(data.hasPassword);
      }
    } catch (error) {
      console.error('Error fetching linked providers:', error);
    }
  };

  const unlinkProvider = async (provider) => {
    if (!hasPassword && Object.keys(linkedProviders).length <= 1) {
      setMessage('Cannot unlink the only authentication method. Please set a password first.');
      return;
    }

    if (!confirm(`Are you sure you want to unlink your ${provider} account?`)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/auth/oauth/unlink/${provider}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setMessage(`${provider} account unlinked successfully`);
        fetchLinkedProviders(); // Refresh the list
      } else {
        const error = await response.json();
        setMessage(error.message || 'Failed to unlink account');
      }
    } catch (error) {
      console.error('Error unlinking provider:', error);
      setMessage('Failed to unlink account');
    } finally {
      setLoading(false);
    }
  };

  const getProviderIcon = (provider) => {
    const icons = {
      google: '🔍',
      github: '🐙',
      facebook: '📘',
      twitter: '🐦',
      linkedin: '💼'
    };
    return icons[provider] || '🔐';
  };

  const getProviderName = (provider) => {
    const names = {
      google: 'Google',
      github: 'GitHub',
      facebook: 'Facebook',
      twitter: 'Twitter',
      linkedin: 'LinkedIn'
    };
    return names[provider] || provider;
  };

  return (
    <div className="oauth-account-manager">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Connected Accounts
        </h3>

        {message && (
          <div className={`mb-4 p-3 rounded-md ${
            message.includes('successfully') 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <div className="space-y-3">
          {/* Password Account */}
          {hasPassword && (
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <span className="text-xl mr-3">🔑</span>
                <div>
                  <p className="font-medium text-gray-900">Password</p>
                  <p className="text-sm text-gray-500">Email: {authUser?.email}</p>
                </div>
              </div>
              <span className="text-sm text-green-600 font-medium">Active</span>
            </div>
          )}

          {/* OAuth Providers */}
          {Object.entries(linkedProviders).map(([provider, data]) => (
            <div key={provider} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <span className="text-xl mr-3">
                  {getProviderIcon(provider)}
                </span>
                <div>
                  <p className="font-medium text-gray-900">
                    {getProviderName(provider)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {data.email || data.username || data.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-green-600 font-medium">Connected</span>
                <button
                  onClick={() => unlinkProvider(provider)}
                  disabled={loading}
                  className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  Unlink
                </button>
              </div>
            </div>
          ))}

          {Object.keys(linkedProviders).length === 0 && !hasPassword && (
            <div className="text-center text-gray-500 py-4">
              No connected accounts
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            You can link multiple accounts to your profile for easier access.
            {!hasPassword && ' We recommend setting a password as a backup authentication method.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OAuthAccountManager;



