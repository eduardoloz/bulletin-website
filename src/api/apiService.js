import axios from 'axios';

// Base configuration
// Use a relative base URL by default so CRA dev server proxy can forward requests.
// Set REACT_APP_API_URL to override (e.g., for production builds).
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API Service Class
class ApiService {
  // Professor-related endpoints
  static async getProfessors() {
    try {
      const response = await apiClient.get('/profs');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch professors: ${error.message}`);
    }
  }

  static async getProfessorSummary(profId) {
    try {
      const response = await apiClient.get(`/summary/${profId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch professor summary: ${error.message}`);
    }
  }

  static async sendChatMessage(profId, question) {
    try {
      const response = await apiClient.post('/chat', {
        prof_id: profId,
        question: question
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send chat message: ${error.message}`);
    }
  }

  // Authentication endpoints
  // Note: Google auth implementation will be handled by your teammate
  // This method is ready for when the backend endpoint is implemented
  static async authenticateWithGoogle(token) {
    try {
      const response = await apiClient.post('/api/auth/google', {
        token: token
      });
      return response.data;
    } catch (error) {
      throw new Error(`Google authentication failed: ${error.message}`);
    }
  }

  // Health check
  static async healthCheck() {
    try {
      const response = await apiClient.get('/');
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }
}

export default ApiService;
