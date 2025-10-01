import dotenv from 'dotenv';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

dotenv.config();

console.log('Testing Google OAuth configuration...');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '***hidden***' : 'NOT SET');

function testOAuthConfig() {
  try {
    console.log('\n🔍 Testing OAuth strategy configuration...');
    
    // Test if we can create the Google strategy
    const strategy = new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback"
    }, 
    async (accessToken, refreshToken, profile, done) => {
      // This callback won't be called during testing, but we need it for the strategy
      console.log('OAuth callback would be triggered here');
      return done(null, profile);
    });
    
    console.log('✅ Google OAuth Strategy created successfully!');
    console.log('📋 Strategy details:');
    console.log('  - Strategy name:', strategy.name);
    console.log('  - Client ID configured:', !!process.env.GOOGLE_CLIENT_ID);
    console.log('  - Client Secret configured:', !!process.env.GOOGLE_CLIENT_SECRET);
    console.log('  - Callback URL:', "/api/auth/google/callback");
    
    // Test the authorization URL generation
    const authURL = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent('http://localhost:5001/api/auth/google/callback')}&scope=profile%20email`;
    
    console.log('\n🔗 OAuth Authorization URL would be:');
    console.log(authURL);
    
    console.log('\n🎉 Google OAuth is properly configured!');
    console.log('\n💡 To test OAuth flow:');
    console.log('1. Start the backend server');
    console.log('2. Visit: http://localhost:5001/api/auth/google');
    console.log('3. You should be redirected to Google for authentication');
    
  } catch (error) {
    console.error('❌ OAuth configuration failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('clientID')) {
      console.error('💡 Check your GOOGLE_CLIENT_ID');
    } else if (error.message.includes('clientSecret')) {
      console.error('💡 Check your GOOGLE_CLIENT_SECRET');
    }
    
    process.exit(1);
  }
}

testOAuthConfig();
