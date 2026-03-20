/**
 * Core type definitions for the Error Tracker dashboard
 */

export interface Project {
  id: string;
  name: string;
  apiKey: string;
  createdAt: string;
  userId: string;
  errorCount: number;
  lastSeen: string | null;
}

export interface Error {
  fingerprint: string;
  message?: string;
  stack?: string;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  errorType?: string;
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
  request?: {
    url: string;
    method: string;
    payload?: Record<string, any>;
  };
  response?: {
    status: number;
    data?: any;
  };
  client?: {
    url: string;
    browser: string;
  };
  payload?: Record<string, any>;
}

export interface ErrorDetail extends Error {
  projectId: string;
  screenshot_url?: string;
  performance?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface Session {
  user: User;
  expires: string;
}

export interface CreateProjectRequest {
  name: string;
}

export interface CreateProjectResponse {
  id: string;
  name: string;
  apiKey: string;
  createdAt: string;
}
