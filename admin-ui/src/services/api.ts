import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const API_KEY = import.meta.env.VITE_API_KEY || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 用于刷新 token 的锁，避免并发刷新
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 请求拦截器
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 添加 API Key
    if (API_KEY) {
      config.headers['X-API-Key'] = API_KEY;
    }

    // 添加 Bearer Token（从 localStorage 获取）
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const data = error.response?.data as any;

    // 401 处理：尝试刷新 token 或跳转登录
    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/v1/auth/refresh`, {
            refreshToken,
          });
          const { data: { accessToken } } = response.data;
          localStorage.setItem('access_token', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          processQueue(null, accessToken);
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError as AxiosError, null);
          message.error('登录已过期，请重新登录');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        isRefreshing = false;
        message.error('认证失败，请重新登录');
        localStorage.removeItem('access_token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    // 其他错误处理
    switch (status) {
      case 403:
        message.error('没有权限访问该资源');
        break;
      case 404:
        message.error('请求的资源不存在');
        break;
      case 429:
        message.error('请求过于频繁，请稍后再试');
        break;
      case 500:
        message.error('服务器内部错误，请稍后再试');
        break;
      case 502:
        message.error('网关错误，服务暂时不可用');
        break;
      case 503:
        message.error('服务维护中，请稍后重试');
        break;
      default:
        if (data?.message) {
          message.error(data.message);
        } else if (data?.error) {
          message.error(data.error);
        } else if (error.message === 'Network Error') {
          message.error('网络连接失败，请检查网络');
        } else {
          message.error('请求失败，请稍后再试');
        }
    }

    return Promise.reject(error);
  }
);

export default api;

// 通用请求方法
export const apiGet = <T = any>(url: string, params?: Record<string, unknown>) =>
  api.get<any, T>(url, { params });

export const apiPost = <T = any>(url: string, data?: unknown) =>
  api.post<any, T>(url, data);

export const apiPut = <T = any>(url: string, data?: unknown) =>
  api.put<any, T>(url, data);

export const apiDelete = <T = any>(url: string) =>
  api.delete<any, T>(url);

export const apiPatch = <T = any>(url: string, data?: unknown) =>
  api.patch<any, T>(url, data);