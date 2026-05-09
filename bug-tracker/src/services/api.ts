import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { useAuthStore } from '../store/auth';

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

    // Add request interceptor to include auth token and org id
    this.client.interceptors.request.use((config) => {
      const { currentOrgId } = useAuthStore.getState();
      
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      
      if (currentOrgId) {
        config.headers['x-org-id'] = currentOrgId;
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
 * Get all organizations for the current user
 */
export const getOrganizations = async (token: string) => {
  apiClient.setToken(token);
  const response = await apiClient.getClient().get('/orgs');
  return response.data;
};

/**
 * Get all projects for the current organization
 */
export const getProjects = async (token: string) => {
  apiClient.setToken(token);
  const response = await apiClient.getClient().get('/projects');
  return response.data;
};

/**
 * Create a new project in the current organization
 */
export const createProject = async (
  data: { name: string },
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
