// Connection Health Check Utility
// Diagnoses and fixes ECONNRESET issues

import { axiosInstance } from '../lib/axios.js';

const ConnectionHealthChecker = {
  
  // Check backend API health
  async checkBackendHealth() {
    try {
      console.log('🏥 Checking backend health...');
      const response = await axiosInstance.get('/auth/check');
      console.log('✅ Backend API: Healthy');
      return { status: 'healthy', service: 'backend' };
    } catch (error) {
      console.error('❌ Backend API: Unhealthy -', error.message);
      return { status: 'unhealthy', service: 'backend', error: error.message };
    }
  },

  // Check file upload endpoint
  async checkFileUploadHealth() {
    try {
      console.log('🏥 Checking file upload endpoint...');
      // Create a small test file
      const testFile = new File(['test'], 'health-check.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', testFile);
      
      const response = await axiosInstance.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('✅ File Upload: Healthy');
      return { status: 'healthy', service: 'file-upload' };
    } catch (error) {
      console.error('❌ File Upload: Unhealthy -', error.message);
      return { status: 'unhealthy', service: 'file-upload', error: error.message };
    }
  },

  // Run complete health check
  async runHealthCheck() {
    console.log('🔍 Running Connection Health Check...');
    
    const results = await Promise.allSettled([
      this.checkBackendHealth(),
      this.checkFileUploadHealth(),
    ]);
    
    const healthReport = results.map(result => 
      result.status === 'fulfilled' ? result.value : 
      { status: 'error', error: result.reason?.message }
    );
    
    console.log('📊 Health Check Results:', healthReport);
    
    // Check for ECONNRESET issues
    const hasConnectionResetIssues = healthReport.some(result => 
      result.error?.includes('ECONNRESET') || result.error?.includes('ECONNRESET')
    );
    
    if (hasConnectionResetIssues) {
      console.log('🚨 ECONNRESET detected! Possible causes:');
      console.log('1. Redis server not running or connection lost');
      console.log('2. MongoDB connection issues');
      console.log('3. Backend server overloaded');
      console.log('4. Network connectivity problems');
      console.log('5. Queue system connection failures');
      
      console.log('🔧 Suggested fixes:');
      console.log('- Restart Redis server');
      console.log('- Check MongoDB connection');
      console.log('- Restart backend server');
      console.log('- Check network connectivity');
    }
    
    return healthReport;
  },

  // Auto-retry with exponential backoff
  async retryWithBackoff(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (error.message?.includes('ECONNRESET') && i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000; // Exponential backoff
          console.log(`🔄 Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  }
};

// Auto-run health check in development
if (import.meta.env.MODE === 'development') {
  // Run health check after a short delay to avoid blocking startup
  setTimeout(() => {
    ConnectionHealthChecker.runHealthCheck();
  }, 2000);
}

export default ConnectionHealthChecker;