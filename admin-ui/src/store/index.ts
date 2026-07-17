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

interface AppState {
  // 当前项目
  currentProject: Project | null;
  // 项目列表
  projects: Project[];
  // 用户信息
  user: User | null;
  // 主题模式
  theme: 'light' | 'dark';

  // Actions
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  setUser: (user: User | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useStore = create<AppState>((set) => ({
  currentProject: null,
  projects: [],
  user: {
    id: '1',
    name: '管理员',
    email: 'admin@seo-platform.com',
    role: 'admin',
  },
  theme: 'light',

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
}));