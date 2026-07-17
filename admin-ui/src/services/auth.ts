import { apiPost, apiGet } from './api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: 'admin' | 'editor' | 'viewer';
  };
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: string;
  lastLoginAt: string;
  twoFactorEnabled: boolean;
}

export const authAPI = {
  login: (data: LoginRequest) =>
    apiPost<LoginResponse>('/v1/auth/login', data),

  register: (data: RegisterRequest) =>
    apiPost<LoginResponse>('/v1/auth/register', data),

  logout: () =>
    apiPost<void>('/v1/auth/logout', {}),

  refreshToken: (refreshToken: string) =>
    apiPost<{ accessToken: string; expiresIn: number }>('/v1/auth/refresh', { refreshToken }),

  getProfile: () =>
    apiGet<UserProfile>('/v1/auth/profile'),

  updateProfile: (data: Partial<UserProfile>) =>
    apiPost<UserProfile>('/v1/auth/profile', data),

  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    apiPost<void>('/v1/auth/change-password', data),
};