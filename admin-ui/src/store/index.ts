import { create } from 'zustand';

interface Project {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'paused' | 'archived';
  createdAt: string;
  settings?: Record<string, unknown>;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'editor' | 'viewer';
}

interface ApiUsage {
  monthlyCost: number;
  totalCalls: number;
  lastMonthCost: number;
  costChange: number;
}

interface Branding {
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  customDomain: string;
}

interface AppState {
  // 当前项目
  currentProject: Project | null;
  // 项目列表
  projects: Project[];
  // 用户信息
  user: User | null;
  // 主题模式
  theme: 'light' | 'dark';
  // 是否已登录
  isAuthenticated: boolean;
  // API 用量
  apiUsage: ApiUsage;
  // 白标配置
  branding: Branding;

  // Actions
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  setUser: (user: User | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setAuthenticated: (auth: boolean) => void;
  setApiUsage: (usage: Partial<ApiUsage>) => void;
  setBranding: (branding: Partial<Branding>) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  currentProject: null,
  projects: [],
  user: null,
  theme: 'light',
  isAuthenticated: !!localStorage.getItem('access_token'),
  apiUsage: {
    monthlyCost: 0,
    totalCalls: 0,
    lastMonthCost: 0,
    costChange: 0,
  },
  branding: {
    brandName: 'Crane SEO Platform',
    logoUrl: '',
    primaryColor: '#1677ff',
    customDomain: '',
  },

  setCurrentProject: (project) => set({ currentProject: project }),
  setProjects: (projects) => set({ projects }),
  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    })),
  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
      currentProject:
        state.currentProject?.id === id
          ? { ...state.currentProject, ...updates }
          : state.currentProject,
    })),
  setUser: (user) => set({ user }),
  setTheme: (theme) => set({ theme }),
  setAuthenticated: (auth) => set({ isAuthenticated: auth }),
  setApiUsage: (usage) =>
    set((state) => ({ apiUsage: { ...state.apiUsage, ...usage } })),
  setBranding: (branding) =>
    set((state) => ({ branding: { ...state.branding, ...branding } })),
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false });
  },
}));