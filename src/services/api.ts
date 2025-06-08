
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { supabase } from '../lib/supabase';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ApiService {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://0.0.0.0:3000/api';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        try {
          if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.access_token) {
              config.headers.Authorization = `Bearer ${session.access_token}`;
            }
          }
        } catch (error) {
          console.error('Failed to get session:', error);
        }

        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        console.error('API Error:', error);
        
        if (error.response?.status === 401) {
          // Handle unauthorized access
          try {
            if (supabase) {
              await supabase.auth.signOut();
            }
            localStorage.removeItem('currentUser');
            localStorage.removeItem('authToken');
            window.location.href = '/';
          } catch (signOutError) {
            console.error('Error during sign out:', signOutError);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP methods
  async get<T>(endpoint: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get(endpoint, { params });
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post(endpoint, data);
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put(endpoint, data);
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete(endpoint);
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // Authentication endpoints
  async login(email: string, password: string): Promise<ApiResponse<any>> {
    return this.post('/auth/login', { email, password });
  }

  async register(userData: any): Promise<ApiResponse<any>> {
    return this.post('/auth/register', userData);
  }

  async verify2FA(email: string, code: string): Promise<ApiResponse<any>> {
    return this.post('/auth/verify-2fa', { email, code });
  }

  async refreshToken(): Promise<ApiResponse<any>> {
    return this.post('/auth/refresh');
  }

  async logout(): Promise<ApiResponse<any>> {
    return this.post('/auth/logout');
  }

  // User management endpoints
  async getUserProfile(): Promise<ApiResponse<any>> {
    return this.get('/user/profile');
  }

  async updateProfile(profileData: any): Promise<ApiResponse<any>> {
    return this.put('/user/profile', profileData);
  }

  async changePassword(passwordData: any): Promise<ApiResponse<any>> {
    return this.put('/user/password', passwordData);
  }

  async enable2FA(settings: any): Promise<ApiResponse<any>> {
    return this.post('/user/2fa', settings);
  }

  // Chat endpoints
  async sendMessage(message: string, sessionId?: string): Promise<ApiResponse<any>> {
    return this.post('/chat/message', { message, sessionId });
  }

  async getChatHistory(page: number = 1, limit: number = 20): Promise<PaginatedResponse<any>> {
    return this.get('/chat/history', { page, limit });
  }

  async createChatSession(): Promise<ApiResponse<any>> {
    return this.post('/chat/session');
  }

  async getChatSession(sessionId: string): Promise<ApiResponse<any>> {
    return this.get(`/chat/session/${sessionId}`);
  }

  async deleteChatSession(sessionId: string): Promise<ApiResponse<any>> {
    return this.delete(`/chat/session/${sessionId}`);
  }

  // Lawyer endpoints
  async getLawyers(filters?: any): Promise<PaginatedResponse<any>> {
    return this.get('/lawyers', filters);
  }

  async getLawyer(lawyerId: string): Promise<ApiResponse<any>> {
    return this.get(`/lawyers/${lawyerId}`);
  }

  async searchLawyers(query: string, filters?: any): Promise<PaginatedResponse<any>> {
    return this.get('/lawyers/search', { query, ...filters });
  }

  async applyAsLawyer(applicationData: any): Promise<ApiResponse<any>> {
    return this.post('/lawyers/apply', applicationData);
  }

  async updateLawyerProfile(profileData: any): Promise<ApiResponse<any>> {
    return this.put('/lawyers/profile', profileData);
  }

  // Rating endpoints
  async rateLawyer(lawyerId: string, rating: number, review?: string): Promise<ApiResponse<any>> {
    return this.post('/ratings', { lawyerId, rating, review });
  }

  async getLawyerRatings(lawyerId: string, page: number = 1): Promise<PaginatedResponse<any>> {
    return this.get(`/ratings/lawyer/${lawyerId}`, { page });
  }

  async getUserRatings(page: number = 1): Promise<PaginatedResponse<any>> {
    return this.get('/ratings/user', { page });
  }

  // Analytics endpoints
  async getSystemAnalytics(): Promise<ApiResponse<any>> {
    return this.get('/analytics/system');
  }

  async getUserAnalytics(): Promise<ApiResponse<any>> {
    return this.get('/analytics/user');
  }

  // Notification endpoints
  async getNotifications(page: number = 1): Promise<PaginatedResponse<any>> {
    return this.get('/notifications', { page });
  }

  async markNotificationRead(notificationId: string): Promise<ApiResponse<any>> {
    return this.put(`/notifications/${notificationId}/read`);
  }

  async getNotificationSettings(): Promise<ApiResponse<any>> {
    return this.get('/notifications/settings');
  }

  async updateNotificationSettings(settings: any): Promise<ApiResponse<any>> {
    return this.put('/notifications/settings', settings);
  }

  // File upload endpoints
  async uploadFile(file: File, type: string): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const response = await this.client.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // WebSocket connection for real-time features
  connectWebSocket(endpoint: string): WebSocket {
    const wsUrl = this.baseURL.replace('http', 'ws') + endpoint;
    return new WebSocket(wsUrl);
  }

  private handleError(error: any): ApiResponse {
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    const status = error.response?.status || 500;
    
    console.error('API Error:', {
      status,
      message,
      url: error.config?.url,
      method: error.config?.method,
    });

    return {
      success: false,
      error: message,
      message: `Request failed with status ${status}`,
    };
  }
}

export const apiService = new ApiService();
export default apiService;
