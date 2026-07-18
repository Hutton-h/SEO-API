import { apiGet, apiPost, apiPut, apiDelete } from './api';

export interface Project {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'paused' | 'archived';
  createdAt: string;
  updatedAt: string;
  description?: string;
  settings?: {
    crawlFrequency?: 'daily' | 'weekly' | 'monthly';
    targetKeywords?: number;
    notifications?: boolean;
  };
}

export interface CreateProjectParams {
  name: string;
  domain: string;
  status?: Project['status'];
  description?: string;
  settings?: Project['settings'];
}

export const projectAPI = {
  // 获取项目列表
  getProjects: () => apiGet<Project[]>('/v1/projects'),

  // 获取单个项目
  getProject: (id: string) => apiGet<Project>(`/v1/projects/${id}`),

  // 创建项目
  createProject: (data: CreateProjectParams) =>
    apiPost<Project>('/v1/projects', data),

  // 更新项目
  updateProject: (id: string, data: Partial<CreateProjectParams>) =>
    apiPut<Project>(`/v1/projects/${id}`, data),

  // 删除项目
  deleteProject: (id: string) => apiDelete<void>(`/v1/projects/${id}`),
};