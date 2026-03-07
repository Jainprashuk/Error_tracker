import axios from 'axios';
import type { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://bugtracker.jainprashuk.in';

/**
 * API client instance with axios
 */
class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Redirect to login on unauthorized
          window.location.href = '/';
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
  }

  getClient() {
    return this.client;
  }
}

export const apiClient = new ApiClient();

/**
 * Get all projects for a user
 */
export const getProjects = async (userId: string, token: string) => {
  apiClient.setToken(token);
  const response = await apiClient.getClient().get(`/projects/${userId}`);
  return response.data;
};

/**
 * Create a new project
 */
export const createProject = async (
  data: { name: string; userId: string },
  token: string
) => {
  apiClient.setToken(token);
  const response = await apiClient.getClient().post('/projects', data);
  return response.data;
};

/**
 * Get errors for a project
 */
export const getProjectErrors = async (
  projectId: string,
  token: string
) => {
  apiClient.setToken(token);
  const response = await apiClient.getClient().get(
    `/projects/${projectId}/errors`
  );
  return response.data;
};

/**
 * Get error detail by fingerprint
 */
export const getErrorDetail = async (
  fingerprint: string,
  token: string
) => {
  apiClient.setToken(token);
  const response = await apiClient.getClient().get(`/errors/${fingerprint}`);
  return response.data;
};
