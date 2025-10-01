// Simple performance test to debug 400 errors
const axios = require('axios');

const testAuth = async () => {
  try {
    console.log('Testing authentication endpoint...');
    
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'slanesh@gmail.com',
      password: 'Slanesh@5002'
    });
    
    console.log('✅ Auth successful:', response.status);
    console.log('User data received:', !!response.data._id);
    console.log('Token received:', !!response.data.token);
    
    // Test auth check with the token
    const checkResponse = await axios.get('http://localhost:5000/api/auth/check', {
      headers: {
        Cookie: `jwt=${response.data.token}`
      }
    });
    
    console.log('✅ Auth check successful:', checkResponse.status);
    console.log('User from auth check:', checkResponse.data.email);
    return response.data.token;
    
  } catch (error) {
    console.error('❌ Auth failed:', error.response?.status, error.response?.data);
    return null;
  }
};

const testMessages = async (token) => {
  try {
    console.log('Testing messages endpoint...');
    
    const response = await axios.get('http://localhost:5000/api/messages/users', {
      headers: {
        Cookie: `jwt=${token}`
      }
    });
    
    console.log('✅ Messages fetch successful:', response.status);
    console.log('Messages count:', response.data?.length || 0);
    
  } catch (error) {
    console.error('❌ Messages failed:', error.response?.status, error.response?.data);
  }
};

const runTest = async () => {
  console.log('🧪 Running performance diagnostics...\n');
  
  const token = await testAuth();
  if (token) {
    await testMessages(token);
  }
  
  console.log('\n🏁 Test completed');
};

runTest();