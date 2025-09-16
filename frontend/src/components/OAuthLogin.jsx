import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const OAuthLogin = ({ onSuccess, onError }) => {
  const [providers, setProviders] = useState({});
  const [loading, setLoading] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchOAuthProviders();
  }, []);

  const fetchOAuthProviders = async () => {
    try {
      const response = await fetch('/api/auth/oauth/providers');
      const data = await response.json();
      setProviders(data.providers);
      setSetupRequired(data.setupRequired);
      setMessage(data.message);
    } catch (error) {
      console.error('Error fetching OAuth providers:', error);
      setSetupRequired(true);
      setMessage('Error loading OAuth providers');
    }
  };

  const handleOAuthLogin = (provider) => {
    setLoading(true);
    // Redirect to OAuth provider
    window.location.href = `/api/auth/oauth/${provider}`;
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

  const getProviderColor = (provider) => {
    const colors = {
      google: '#4285F4',
      github: '#333',
      facebook: '#1877F2',
      twitter: '#1DA1F2',
      linkedin: '#0077B5'
    };
    return colors[provider] || '#6B7280';
  };

  return (
    <div className="oauth-login-container">
      <div className="oauth-header">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Or continue with
        </h3>
      </div>
      <div className="oauth-buttons space-y-3">
        {Object.entries(providers).map(([provider, config]) => {
          if (provider !== 'google' || !config.enabled) return null;
          return (
            <button
              key={provider}
              onClick={() => handleOAuthLogin(provider)}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              style={{ borderColor: getProviderColor(provider) }}
            >
              <span className="mr-3 text-xl">
                {getProviderIcon(provider)}
              </span>
              {loading ? 'Connecting...' : `Continue with ${config.name}`}
            </button>
          );
        })}
      </div>
      {/* Only show setupRequired if Google is not enabled */}
      {setupRequired && !providers.google?.enabled && (
        <div className="text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-yellow-800 text-sm">
              <p className="font-medium mb-2">OAuth Setup Required</p>
              <p className="text-xs">{message}</p>
              <div className="mt-3 text-xs text-yellow-700">
                <p>To enable OAuth login:</p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Create OAuth apps with providers (Google, GitHub, etc.)</li>
                  <li>Add credentials to your .env file</li>
                  <li>Restart the server</li>
                </ol>
                <p className="mt-2">
                  <a 
                    href="https://github.com/your-repo#oauth-setup" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-yellow-900"
                  >
                    View setup guide
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OAuthLogin;
