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
  (error: AxiosError) => {
    const status = error.response?.status;
    const data = error.response?.data as any;

    switch (status) {
      case 401:
        message.error('认证失败，请重新登录');
        localStorage.removeItem('access_token');
        // 跳转到登录页
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        break;
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
        message.error('服务器内部错误');
        break;
      default:
        if (data?.message) {
          message.error(data.message);
        } else if (error.message === 'Network Error') {
          message.error('网络连接失败，请检查网络');
        } else {
          message.error('请求失败');
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