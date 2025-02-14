import axios from 'axios';

const axiosClient = axios.create({
  timeout: 12000, // 12 seconds in milliseconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor to handle timeouts gracefully
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      // Custom timeout error handling
      return Promise.reject({
        status: 408,
        message: 'Request timed out after 12 seconds'
      });
    }
    return Promise.reject(error);
  }
);

export default axiosClient; 