import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from '@/layouts/MainLayout';
import LoadingSpinner from '@/components/LoadingSpinner';

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

const PageLoading = () => <LoadingSpinner fullPage />;

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          colorBgContainer: '#ffffff',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        },
        algorithm: theme.defaultAlgorithm,
      }}
    >
      <AntApp>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<MainLayout />}>
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
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AntApp>
    </ConfigProvider>
  );
};

export default App;