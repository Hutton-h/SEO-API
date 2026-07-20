import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export interface Project {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'paused' | 'archived';
  createdAt: string;
  settings?: Record<string, unknown>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'editor' | 'viewer';
}

export interface ApiUsage {
  monthlyCost: number;
  totalCalls: number;
  lastMonthCost: number;
  costChange: number;
}

export interface Branding {
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  customDomain: string;
}

export interface Country {
  code: string;       // DataForSEO location_code (e.g. "2840")
  name: string;       // Country name (e.g. "United States")
  isoCode: string;    // ISO 2-letter country code (e.g. "US") — used for flag emoji
  language: string;   // Primary language code (e.g. "en")
}

export interface SearchEngine {
  code: string;
  name: string;
  country: string;
}

export interface DateRange {
  start: string;
  end: string;
  label: string;
}

// ============================================================================
// State
// ============================================================================

interface AppState {
  // 认证
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;

  // 项目
  currentProject: Project | null;
  projects: Project[];

  // 地区/国家/搜索引擎 — 全局维度
  selectedCountry: Country;
  selectedSearchEngine: SearchEngine;
  availableCountries: Country[];
  availableSearchEngines: SearchEngine[];
  countriesLoaded: boolean; // 是否已从API加载全部国家

  // 时间范围
  dateRange: DateRange;

  // 主题
  theme: 'light' | 'dark';

  // API 用量
  apiUsage: ApiUsage;

  // 白标配置
  branding: Branding;

  // 侧边栏
  sidebarCollapsed: boolean;

  // ==========================================================================
  // Actions
  // ==========================================================================

  // 认证
  setUser: (user: User | null) => void;
  setAuthenticated: (auth: boolean) => void;
  setToken: (token: string | null) => void;
  logout: () => void;

  // 项目
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;

  // 地区
  setSelectedCountry: (country: Country) => void;
  setSelectedSearchEngine: (engine: SearchEngine) => void;
  setAvailableCountries: (countries: Country[]) => void;
  setAvailableSearchEngines: (engines: SearchEngine[]) => void;
  setCountriesLoaded: (loaded: boolean) => void;

  // 时间
  setDateRange: (range: DateRange) => void;

  // 主题
  setTheme: (theme: 'light' | 'dark') => void;

  // API 用量
  setApiUsage: (usage: Partial<ApiUsage>) => void;

  // 白标
  setBranding: (branding: Partial<Branding>) => void;

  // 侧边栏
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_COUNTRY: Country = {
  code: '2840',
  name: 'United States',
  isoCode: 'US',
  language: 'en',
};

const DEFAULT_SEARCH_ENGINE: SearchEngine = {
  code: 'google',
  name: 'Google',
  country: '2840',
};

const getDefaultDateRange = (): DateRange => {
  const end = new Date().toISOString().split('T')[0];
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return { start, end, label: '30d' };
};

// 精简默认列表 — 仅作为API加载前的后备
const FALLBACK_COUNTRIES: Country[] = [
  { code: '2840', name: 'United States', isoCode: 'US', language: 'en' },
];

const DEFAULT_SEARCH_ENGINES: SearchEngine[] = [
  { code: 'google', name: 'Google', country: '2840' },
  { code: 'bing', name: 'Bing', country: '2840' },
  { code: 'yahoo', name: 'Yahoo', country: '2840' },
  { code: 'baidu', name: 'Baidu', country: '2152' },
  { code: 'yandex', name: 'Yandex', country: '2643' },
  { code: 'naver', name: 'Naver', country: '2720' },
  { code: 'duckduckgo', name: 'DuckDuckGo', country: '2840' },
];

// ============================================================================
// Store
// ============================================================================

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // 认证
      user: null,
      isAuthenticated: !!localStorage.getItem('access_token'),
      token: localStorage.getItem('access_token'),

      // 项目
      currentProject: null,
      projects: [],

      // 地区
      selectedCountry: DEFAULT_COUNTRY,
      selectedSearchEngine: DEFAULT_SEARCH_ENGINE,
      availableCountries: FALLBACK_COUNTRIES,
      availableSearchEngines: DEFAULT_SEARCH_ENGINES,
      countriesLoaded: false,

      // 时间
      dateRange: getDefaultDateRange(),

      // 主题
      theme: 'light',

      // API 用量
      apiUsage: {
        monthlyCost: 0,
        totalCalls: 0,
        lastMonthCost: 0,
        costChange: 0,
      },

      // 白标
      branding: {
        brandName: 'Crane SEO Platform',
        logoUrl: '',
        primaryColor: '#1677ff',
        customDomain: '',
      },

      // 侧边栏
      sidebarCollapsed: false,

      // ====================================================================
      // Actions
      // ====================================================================

      setUser: (user) => set({ user }),
      setAuthenticated: (auth) => set({ isAuthenticated: auth }),
      setToken: (token) => {
        if (token) {
          localStorage.setItem('access_token', token);
        } else {
          localStorage.removeItem('access_token');
        }
        set({ token });
      },
      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, isAuthenticated: false, token: null, currentProject: null, projects: [] });
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
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
          currentProject:
            state.currentProject?.id === id
              ? { ...state.currentProject, ...updates }
              : state.currentProject,
        })),

      setSelectedCountry: (country) => set({ selectedCountry: country }),
      setSelectedSearchEngine: (engine) => set({ selectedSearchEngine: engine }),
      setAvailableCountries: (countries) => set({ availableCountries: countries }),
      setAvailableSearchEngines: (engines) => set({ availableSearchEngines: engines }),
      setCountriesLoaded: (loaded) => set({ countriesLoaded: loaded }),

      setDateRange: (range) => set({ dateRange: range }),

      setTheme: (theme) => set({ theme }),
      setApiUsage: (usage) => set((state) => ({ apiUsage: { ...state.apiUsage, ...usage } })),
      setBranding: (branding) =>
        set((state) => ({ branding: { ...state.branding, ...branding } })),

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'crane-seo-store',
      partialize: (state) => ({
        theme: state.theme,
        selectedCountry: state.selectedCountry,
        selectedSearchEngine: state.selectedSearchEngine,
        sidebarCollapsed: state.sidebarCollapsed,
        branding: state.branding,
      }),
    }
  )
);