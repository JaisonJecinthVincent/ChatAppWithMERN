import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../lib/axios';

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
      const response = await axiosInstance.get('/auth/oauth/providers');
      const data = response.data;
      
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
    window.location.href = `http://localhost:5000/api/auth/oauth/${provider}`;
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
      <div className="space-y-3">
        {Object.entries(providers).map(([provider, config]) => {
          if (!config.enabled) return null;
          return (
            <button
              key={provider}
              onClick={() => handleOAuthLogin(provider)}
              disabled={loading}
              className="btn btn-outline w-full flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? 'Connecting...' : `Continue with ${config.name}`}
            </button>
          );
        })}
      </div>
      
      {/* Show setup message if no providers are enabled */}
      {setupRequired && (
        <div className="mt-4">
          <div className="alert alert-warning">
            <div className="text-sm">
              <p className="font-medium mb-2">OAuth Setup Required</p>
              <p className="text-xs">{message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OAuthLogin;
