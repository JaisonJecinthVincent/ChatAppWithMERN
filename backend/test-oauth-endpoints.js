import fetch from 'node-fetch';

console.log('Testing OAuth endpoints...');

async function testOAuthEndpoints() {
  const baseURL = 'http://localhost:5001';
  
  try {
    console.log('\n🔍 Testing OAuth info endpoint...');
    
    // Test the OAuth info endpoint
    const response = await fetch(`${baseURL}/api/auth/oauth/info`);
    const data = await response.json();
    
    console.log('✅ OAuth info endpoint response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.google && data.google.enabled) {
      console.log('✅ Google OAuth is enabled and configured!');
      console.log('🔗 Google OAuth login URL:', `${baseURL}/api/auth/google`);
    } else {
      console.log('❌ Google OAuth is not properly configured');
    }
    
  } catch (error) {
    console.error('❌ Failed to test OAuth endpoints:');
    console.error('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure the backend server is running on port 5001');
    }
  }
}

// Add a small delay to make sure server is ready
setTimeout(testOAuthEndpoints, 2000);
