import axios from 'axios';

// Set base URL for Flask backend
axios.defaults.baseURL = 'https://interview-bot-1-3ddc.onrender.com';

// Add request interceptor for comprehensive debugging
axios.interceptors.request.use(
  (config) => {
    console.log('🚀 API REQUEST START:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: config.headers,
      data: config.data ? 'Data present' : 'No data',
      timestamp: new Date().toISOString()
    });
    return config;
  },
  (error) => {
    console.error('❌ REQUEST INTERCEPTOR ERROR:', {
      message: error.message,
      stack: error.stack,
      config: error.config,
      timestamp: new Date().toISOString()
    });
    return Promise.reject(error);
  }
);

// Add response interceptor for comprehensive error handling
axios.interceptors.response.use(
  (response) => {
    console.log('✅ API RESPONSE SUCCESS:', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
      data: response.data,
      headers: response.headers,
      timestamp: new Date().toISOString()
    });
    return response;
  },
  (error) => {
    console.error('❌ API RESPONSE ERROR:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      responseData: error.response?.data,
      requestData: error.config?.data ? 'Request had data' : 'No request data',
      headers: error.response?.headers,
      isNetworkError: !error.response,
      isTimeoutError: error.code === 'ECONNABORTED',
      timestamp: new Date().toISOString()
    });

    // Enhanced error handling with specific error types
    if (!error.response) {
      console.error('🔌 NETWORK ERROR: Backend server might be down or unreachable');
      console.error('Check if Flask server is running on http://localhost:5000');
    } else if (error.response.status >= 500) {
      console.error('🔥 SERVER ERROR: Internal server error occurred');
    } else if (error.response.status >= 400) {
      console.error('📝 CLIENT ERROR: Bad request or client-side issue');
    }

    return Promise.reject(error);
  }
);

// Add timeout for requests
axios.defaults.timeout = 120000; // 2 minutes for video processing

export default axios;