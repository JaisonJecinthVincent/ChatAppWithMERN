import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development" ? "http://localhost:5000/api" : "/api",
  withCredentials: true,
  timeout: 30000, // 30 second timeout
});

// Add response interceptor for better error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle connection reset errors
    if (error.code === 'ECONNRESET' || error.message?.includes('ECONNRESET')) {
      console.warn('🔄 Connection reset, retrying request...');
      
      // Retry once on connection reset
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        try {
          return await axiosInstance(originalRequest);
        } catch (retryError) {
          console.error('❌ Retry failed:', retryError.message);
        }
      }
    }
    
    // Handle network errors
    if (error.code === 'ERR_NETWORK' || !error.response) {
      console.error('❌ Network Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);
