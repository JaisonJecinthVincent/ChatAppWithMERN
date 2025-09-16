import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthUser } = useAuthStore();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      const token = searchParams.get('token');
      const error = searchParams.get('error');
      const message = searchParams.get('message');

      if (error) {
        setStatus('error');
        setMessage(message || 'Authentication failed. Please try again.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
        return;
      }

      if (token) {
        // Store the token
        localStorage.setItem('token', token);
        
        // Fetch user data
        try {
          const response = await fetch('/api/auth/check', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const userData = await response.json();
            setAuthUser(userData);
            setStatus('success');
            setMessage('Authentication successful! Redirecting...');
            
            setTimeout(() => {
              navigate('/');
            }, 2000);
          } else {
            throw new Error('Failed to fetch user data');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setStatus('error');
          setMessage('Authentication successful but failed to load user data.');
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } else {
        setStatus('error');
        setMessage('No authentication token received.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      setStatus('error');
      setMessage('An unexpected error occurred during authentication.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">
            {getStatusIcon()}
          </div>
          
          <h2 className={`text-2xl font-bold ${getStatusColor()}`}>
            {status === 'success' ? 'Success!' : 
             status === 'error' ? 'Error' : 'Processing...'}
          </h2>
          
          <p className="mt-4 text-gray-600">
            {message}
          </p>

          {status === 'processing' && (
            <div className="mt-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-6">
              <button
                onClick={() => navigate('/login')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;



