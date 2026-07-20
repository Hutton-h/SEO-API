import React, { Suspense, lazy, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from '@/layouts/MainLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useStore } from '@/store';

// 懒加载页面组件
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Projects = lazy(() => import('@/pages/Projects'));
const CrawlAudit = lazy(() => import('@/pages/CrawlAudit'));
const Keywords = lazy(() => import('@/pages/Keywords'));
const Rankings = lazy(() => import('@/pages/Rankings'));
const Backlinks = lazy(() => import('@/pages/Backlinks'));
const SEMAnalysis = lazy(() => import('@/pages/SEMAnalysis'));
const LocalSEO = lazy(() => import('@/pages/LocalSEO'));
const ASO = lazy(() => import('@/pages/ASO'));
const YouTube = lazy(() => import('@/pages/YouTube'));
const AIOptimization = lazy(() => import('@/pages/AIOptimization'));
const Competitors = lazy(() => import('@/pages/Competitors'));
const Report = lazy(() => import('@/pages/Report'));
const Login = lazy(() => import('@/pages/Login'));
const Alerting = lazy(() => import('@/pages/Alerting'));
const Monitor = lazy(() => import('@/pages/Monitor'));
const ROIAnalysis = lazy(() => import('@/pages/ROIAnalysis'));
const WhiteLabel = lazy(() => import('@/pages/WhiteLabel'));
const Schedule = lazy(() => import('@/pages/Schedule'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const SerpFeatures = lazy(() => import('@/pages/SerpFeatures'));
const Sitemap = lazy(() => import('@/pages/Sitemap'));
const ContentAnalysis = lazy(() => import('@/pages/ContentAnalysis'));
const DomainHealth = lazy(() => import('@/pages/DomainHealth'));
const CompetitorChanges = lazy(() => import('@/pages/CompetitorChanges'));
const ApiUsage = lazy(() => import('@/pages/ApiUsage'));

const PageLoading = () => <LoadingSpinner fullPage />;

// 登录保护组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const appTheme = useStore((state) => state.theme);
  const branding = useStore((state) => state.branding);

  const themeConfig = useMemo(() => ({
    token: {
      colorPrimary: branding.primaryColor || '#1677ff',
      borderRadius: 6,
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans CJK SC', sans-serif",
    },
    algorithm: appTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
  }), [appTheme, branding.primaryColor]);

  return (
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <AntApp>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="crawl-audit" element={<CrawlAudit />} />
              <Route path="keywords" element={<Keywords />} />
              <Route path="rankings" element={<Rankings />} />
              <Route path="backlinks" element={<Backlinks />} />
              <Route path="sem-analysis" element={<SEMAnalysis />} />
              <Route path="local-seo" element={<LocalSEO />} />
              <Route path="aso" element={<ASO />} />
              <Route path="youtube" element={<YouTube />} />
              <Route path="ai-optimization" element={<AIOptimization />} />
              <Route path="competitors" element={<Competitors />} />
              <Route path="report" element={<Report />} />
              <Route path="alerting" element={<Alerting />} />
              <Route path="monitor" element={<Monitor />} />
              <Route path="roi-analysis" element={<ROIAnalysis />} />
              <Route path="white-label" element={<WhiteLabel />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="serp-features" element={<SerpFeatures />} />
              <Route path="sitemap" element={<Sitemap />} />
              <Route path="content-analysis" element={<ContentAnalysis />} />
              <Route path="domain-health" element={<DomainHealth />} />
              <Route path="competitor-changes" element={<CompetitorChanges />} />
              <Route path="api-usage" element={<ApiUsage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AntApp>
    </ConfigProvider>
  );
};

export default App;