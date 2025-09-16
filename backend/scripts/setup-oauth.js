#!/usr/bin/env node

/**
 * OAuth Setup Helper Script
 * 
 * This script helps you set up OAuth providers for your chat application.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../../.env');

console.log('🔧 OAuth Setup Helper');
console.log('====================\n');

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  console.log('📝 Creating .env file from template...\n');
  
  const envTemplate = `# Database
MONGODB_URI=mongodb://localhost:27017/chat-app

# JWT
JWT_SECRET=your_jwt_secret_here_${Math.random().toString(36).substring(2, 15)}

# Session
SESSION_SECRET=your_session_secret_here_${Math.random().toString(36).substring(2, 15)}

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# OAuth Providers (Set these to enable OAuth)
# Uncomment and fill in the credentials for the providers you want to use

# Google OAuth
# GOOGLE_CLIENT_ID=your_google_client_id_here
# GOOGLE_CLIENT_SECRET=your_google_client_secret_here
# GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/oauth/google/callback

# GitHub OAuth
# GITHUB_CLIENT_ID=your_github_client_id_here
# GITHUB_CLIENT_SECRET=your_github_client_secret_here
# GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/oauth/github/callback

# Facebook OAuth
# FACEBOOK_APP_ID=your_facebook_app_id_here
# FACEBOOK_APP_SECRET=your_facebook_app_secret_here
# FACEBOOK_CALLBACK_URL=http://localhost:5000/api/auth/oauth/facebook/callback

# Twitter OAuth
# TWITTER_CONSUMER_KEY=your_twitter_consumer_key_here
# TWITTER_CONSUMER_SECRET=your_twitter_consumer_secret_here
# TWITTER_CALLBACK_URL=http://localhost:5000/api/auth/oauth/twitter/callback

# LinkedIn OAuth
# LINKEDIN_CLIENT_ID=your_linkedin_client_id_here
# LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret_here
# LINKEDIN_CALLBACK_URL=http://localhost:5000/api/auth/oauth/linkedin/callback

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Queue Admin
QUEUE_ADMIN_KEY=admin123
`;

  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ .env file created successfully!\n');
} else {
  console.log('✅ .env file found\n');
}

console.log('📋 OAuth Provider Setup Instructions:');
console.log('=====================================\n');

console.log('1. 🔍 Google OAuth Setup:');
console.log('   • Go to: https://console.cloud.google.com/');
console.log('   • Create a new project or select existing');
console.log('   • Enable Google+ API');
console.log('   • Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"');
console.log('   • Set application type to "Web application"');
console.log('   • Add authorized redirect URI: http://localhost:5000/api/auth/oauth/google/callback');
console.log('   • Copy Client ID and Client Secret to your .env file\n');

console.log('2. 🐙 GitHub OAuth Setup:');
console.log('   • Go to: https://github.com/settings/developers');
console.log('   • Click "New OAuth App"');
console.log('   • Fill in:');
console.log('     - Application name: Your app name');
console.log('     - Homepage URL: http://localhost:5173');
console.log('     - Authorization callback URL: http://localhost:5000/api/auth/oauth/github/callback');
console.log('   • Copy Client ID and Client Secret to your .env file\n');

console.log('3. 📘 Facebook OAuth Setup:');
console.log('   • Go to: https://developers.facebook.com/');
console.log('   • Create a new app');
console.log('   • Add Facebook Login product');
console.log('   • Go to Facebook Login → Settings');
console.log('   • Add Valid OAuth Redirect URIs: http://localhost:5000/api/auth/oauth/facebook/callback');
console.log('   • Copy App ID and App Secret to your .env file\n');

console.log('4. 🐦 Twitter OAuth Setup:');
console.log('   • Go to: https://developer.twitter.com/');
console.log('   • Create a new app');
console.log('   • Go to "Keys and tokens"');
console.log('   • Generate Consumer Keys');
console.log('   • Set Callback URL: http://localhost:5000/api/auth/oauth/twitter/callback');
console.log('   • Copy Consumer Key and Consumer Secret to your .env file\n');

console.log('5. 💼 LinkedIn OAuth Setup:');
console.log('   • Go to: https://www.linkedin.com/developers/');
console.log('   • Create a new app');
console.log('   • Go to "Auth" tab');
console.log('   • Add redirect URL: http://localhost:5000/api/auth/oauth/linkedin/callback');
console.log('   • Copy Client ID and Client Secret to your .env file\n');

console.log('📝 After setting up OAuth providers:');
console.log('=====================================');
console.log('1. Uncomment the provider lines in your .env file');
console.log('2. Replace the placeholder values with your actual credentials');
console.log('3. Restart your server: npm run dev');
console.log('4. Test OAuth login on your frontend\n');

console.log('🔗 Quick Test URLs:');
console.log('===================');
console.log('• Google: http://localhost:5000/api/auth/oauth/google');
console.log('• GitHub: http://localhost:5000/api/auth/oauth/github');
console.log('• Facebook: http://localhost:5000/api/auth/oauth/facebook');
console.log('• Twitter: http://localhost:5000/api/auth/oauth/twitter');
console.log('• LinkedIn: http://localhost:5000/api/auth/oauth/linkedin\n');

console.log('📚 For detailed instructions, see: backend/OAUTH_SETUP.md');
console.log('🎉 Happy coding!');



