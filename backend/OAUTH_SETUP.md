# OAuth 2.0 / OpenID Connect Setup Guide

This guide explains how to set up OAuth 2.0 authentication with Google, GitHub, Facebook, Twitter, and LinkedIn for your MERN chat application.

## Prerequisites

- Node.js and npm installed
- MongoDB database
- Redis server (for message queues)
- OAuth applications created with each provider

## Environment Variables

Add these variables to your `.env` file:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/chat-app

# JWT
JWT_SECRET=your_jwt_secret_here

# Session
SESSION_SECRET=your_session_secret_here

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# OAuth Providers

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/oauth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/oauth/github/callback

# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:5000/api/auth/oauth/facebook/callback

# Twitter OAuth
TWITTER_CONSUMER_KEY=your_twitter_consumer_key
TWITTER_CONSUMER_SECRET=your_twitter_consumer_secret
TWITTER_CALLBACK_URL=http://localhost:5000/api/auth/oauth/twitter/callback

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_CALLBACK_URL=http://localhost:5000/api/auth/oauth/linkedin/callback

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## OAuth Provider Setup

### 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/oauth/google/callback` (development)
   - `https://yourdomain.com/api/auth/oauth/google/callback` (production)
7. Copy Client ID and Client Secret to your `.env` file

### 2. GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the form:
   - Application name: Your app name
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5000/api/auth/oauth/github/callback`
4. Copy Client ID and Client Secret to your `.env` file

### 3. Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Go to Facebook Login → Settings
5. Add Valid OAuth Redirect URIs:
   - `http://localhost:5000/api/auth/oauth/facebook/callback`
6. Copy App ID and App Secret to your `.env` file

### 4. Twitter OAuth Setup

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app
3. Go to "Keys and tokens"
4. Generate Consumer Keys
5. Set Callback URL: `http://localhost:5000/api/auth/oauth/twitter/callback`
6. Copy Consumer Key and Consumer Secret to your `.env` file

### 5. LinkedIn OAuth Setup

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Create a new app
3. Go to "Auth" tab
4. Add redirect URL: `http://localhost:5000/api/auth/oauth/linkedin/callback`
5. Copy Client ID and Client Secret to your `.env` file

## API Endpoints

### OAuth Authentication

- `GET /api/auth/oauth/google` - Start Google OAuth flow
- `GET /api/auth/oauth/github` - Start GitHub OAuth flow
- `GET /api/auth/oauth/facebook` - Start Facebook OAuth flow
- `GET /api/auth/oauth/twitter` - Start Twitter OAuth flow
- `GET /api/auth/oauth/linkedin` - Start LinkedIn OAuth flow

### OAuth Callbacks

- `GET /api/auth/oauth/google/callback` - Google OAuth callback
- `GET /api/auth/oauth/github/callback` - GitHub OAuth callback
- `GET /api/auth/oauth/facebook/callback` - Facebook OAuth callback
- `GET /api/auth/oauth/twitter/callback` - Twitter OAuth callback
- `GET /api/auth/oauth/linkedin/callback` - LinkedIn OAuth callback

### OAuth Management

- `GET /api/auth/oauth/providers` - Get available OAuth providers
- `GET /api/auth/oauth/providers` - Get user's linked OAuth providers
- `POST /api/auth/oauth/link` - Link additional OAuth provider
- `DELETE /api/auth/oauth/unlink/:provider` - Unlink OAuth provider

## Frontend Integration

### 1. OAuth Login Buttons

```jsx
// OAuth login buttons
const OAuthLogin = () => {
  const handleOAuthLogin = (provider) => {
    window.location.href = `/api/auth/oauth/${provider}`;
  };

  return (
    <div className="oauth-buttons">
      <button onClick={() => handleOAuthLogin('google')}>
        Login with Google
      </button>
      <button onClick={() => handleOAuthLogin('github')}>
        Login with GitHub
      </button>
      <button onClick={() => handleOAuthLogin('facebook')}>
        Login with Facebook
      </button>
    </div>
  );
};
```

### 2. Handle OAuth Callbacks

```jsx
// Handle OAuth success/error
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const error = urlParams.get('error');
  
  if (token) {
    // Store token and redirect to dashboard
    localStorage.setItem('token', token);
    window.location.href = '/dashboard';
  } else if (error) {
    // Handle error
    console.error('OAuth error:', error);
  }
}, []);
```

### 3. Account Linking

```jsx
// Link additional OAuth providers
const linkOAuthProvider = async (provider) => {
  try {
    const response = await fetch(`/api/auth/oauth/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ provider, providerId, email, name, picture })
    });
    
    if (response.ok) {
      console.log(`${provider} account linked successfully`);
    }
  } catch (error) {
    console.error('Error linking provider:', error);
  }
};
```

## User Model Changes

The user model now supports OAuth providers:

```javascript
{
  email: String,
  fullName: String,
  password: String, // Optional for OAuth users
  profilePic: String,
  oauthProviders: {
    google: { id, email, name, picture },
    github: { id, username, email, name, avatar_url },
    facebook: { id, email, name, picture },
    twitter: { id, username, name, profile_image_url },
    linkedin: { id, email, name, picture }
  },
  isEmailVerified: Boolean,
  lastLogin: Date,
  loginCount: Number
}
```

## Security Considerations

1. **HTTPS in Production**: Always use HTTPS in production
2. **Secure Session Secret**: Use a strong, random session secret
3. **CORS Configuration**: Configure CORS properly for your domain
4. **Token Expiration**: Set appropriate JWT expiration times
5. **Rate Limiting**: Implement rate limiting for OAuth endpoints
6. **Input Validation**: Validate all OAuth callback data

## Testing

1. Start your application: `npm run dev`
2. Test each OAuth provider:
   - Visit `/api/auth/oauth/google` to test Google OAuth
   - Visit `/api/auth/oauth/github` to test GitHub OAuth
   - etc.
3. Check user creation in MongoDB
4. Verify JWT token generation
5. Test account linking/unlinking

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**: Ensure callback URLs match exactly
2. **CORS Errors**: Check CORS configuration
3. **Session Issues**: Verify session store configuration
4. **Token Issues**: Check JWT secret and expiration

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=passport:*
```

## Production Deployment

1. Update all callback URLs to use your production domain
2. Set `NODE_ENV=production`
3. Use HTTPS for all OAuth callbacks
4. Configure proper CORS origins
5. Use secure session secrets
6. Set up proper error monitoring

## Support

For issues or questions:
1. Check the console logs for errors
2. Verify OAuth provider configurations
3. Test with a single provider first
4. Check network requests in browser dev tools



