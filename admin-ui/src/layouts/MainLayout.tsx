import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Typography, Button, Space, Select, Badge, theme } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined, ProjectOutlined, BugOutlined, KeyOutlined,
  RiseOutlined, LinkOutlined, DollarOutlined, EnvironmentOutlined,
  AppleOutlined, YoutubeOutlined, RobotOutlined, TeamOutlined,
  FileTextOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  UserOutlined, LogoutOutlined, SettingOutlined, HomeOutlined,
  BellOutlined, CloudServerOutlined, ScheduleOutlined, SendOutlined,
  GlobalOutlined, ApartmentOutlined, ReadOutlined, VerifiedOutlined,
  SwapOutlined, ApiOutlined, PieChartOutlined, SafetyCertificateOutlined,
  FundOutlined, PlusOutlined, SunOutlined, MoonOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useStore } from '@/store';
import { CountrySelector } from '@/components/common';
import { projectAPI } from '@/services/project';
import { apiUsageAPI } from '@/services/apiUsage';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token: themeToken } = theme.useToken();

  const {
    user, projects, currentProject, setCurrentProject, setProjects,
    branding, apiUsage, setApiUsage, logout,
    sidebarCollapsed, toggleSidebar, theme: appTheme, setTheme,
  } = useStore();

  // 加载项目列表
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await projectAPI.getProjects();
        const d = (res as any).data || res;
        const list = Array.isArray(d) ? d : (d?.data || []);
        setProjects(list);
        if (!currentProject && list.length > 0) {
          setCurrentProject(list[0]);
        }
      } catch { /* silent */ }
    };
    loadProjects();
  }, []);

  // 加载API用量
  useEffect(() => {
    const loadUsage = async () => {
      try {
        const res = await apiUsageAPI.getStats();
        const d = (res as any)?.data || res;
        setApiUsage({
          monthlyCost: d?.totalCost || 0,
          totalCalls: d?.totalCalls || 0,
          lastMonthCost: d?.lastMonthCost || 0,
          costChange: d?.costChange || 0,
        });
      } catch { /* silent */ }
    };
    loadUsage();
    const timer = setInterval(loadUsage, 60000);
    return () => clearInterval(timer);
  }, []);

  const selectedKey = '/' + location.pathname.split('/').filter(Boolean)[0] || '/dashboard';

  // 菜单配置
  const menuItems: MenuProps['items'] = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/projects', icon: <ProjectOutlined />, label: '项目管理' },
    { type: 'divider' },
    { key: '/keywords', icon: <KeyOutlined />, label: '关键词研究' },
    { key: '/rankings', icon: <RiseOutlined />, label: '排名追踪' },
    { key: '/crawl-audit', icon: <BugOutlined />, label: '网站审计' },
    { key: '/competitors', icon: <TeamOutlined />, label: '竞品分析' },
    { key: '/content-analysis', icon: <ReadOutlined />, label: '内容优化' },
    { key: '/backlinks', icon: <LinkOutlined />, label: '外链分析' },
    { type: 'divider' },
    {
      key: 'seo-group', icon: <PieChartOutlined />, label: '扩展工具',
      children: [
        { key: '/sem-analysis', icon: <DollarOutlined />, label: 'SEM 分析' },
        { key: '/local-seo', icon: <EnvironmentOutlined />, label: '本地 SEO' },
        { key: '/aso', icon: <AppleOutlined />, label: 'ASO' },
        { key: '/youtube', icon: <YoutubeOutlined />, label: 'YouTube' },
        { key: '/ai-optimization', icon: <RobotOutlined />, label: 'AI 优化' },
        { key: '/serp-features', icon: <GlobalOutlined />, label: 'SERP 特性' },
      ],
    },
    {
      key: 'monitor-group', icon: <CloudServerOutlined />, label: '监控与报告',
      children: [
        { key: '/report', icon: <FileTextOutlined />, label: 'SEO 报告' },
        { key: '/monitor', icon: <CloudServerOutlined />, label: '网站监控' },
        { key: '/alerting', icon: <BellOutlined />, label: '告警中心' },
        { key: '/notifications', icon: <SendOutlined />, label: '通知管理' },
        { key: '/schedule', icon: <ScheduleOutlined />, label: '定时任务' },
      ],
    },
    {
      key: 'tools-group', icon: <SettingOutlined />, label: '工具与配置',
      children: [
        { key: '/roi-analysis', icon: <FundOutlined />, label: 'ROI 分析' },
        { key: '/domain-health', icon: <VerifiedOutlined />, label: '域名健康' },
        { key: '/competitor-changes', icon: <SwapOutlined />, label: '竞品变更' },
        { key: '/sitemap', icon: <ApartmentOutlined />, label: 'Sitemap' },
        { key: '/api-usage', icon: <ApiOutlined />, label: 'API 用量' },
        { key: '/white-label', icon: <SafetyCertificateOutlined />, label: '白标配置' },
      ],
    },
  ];

  const getOpenKeys = () => {
    const path = '/' + location.pathname.split('/').filter(Boolean)[0];
    const submenuMap: Record<string, string> = {
      '/sem-analysis': 'seo-group', '/local-seo': 'seo-group', '/aso': 'seo-group',
      '/youtube': 'seo-group', '/ai-optimization': 'seo-group', '/serp-features': 'seo-group',
      '/report': 'monitor-group', '/monitor': 'monitor-group', '/alerting': 'monitor-group',
      '/notifications': 'monitor-group', '/schedule': 'monitor-group',
      '/roi-analysis': 'tools-group', '/domain-health': 'tools-group',
      '/competitor-changes': 'tools-group', '/sitemap': 'tools-group',
      '/api-usage': 'tools-group', '/white-label': 'tools-group',
    };
    return submenuMap[path] ? [submenuMap[path]] : [];
  };

  const breadcrumbMap: Record<string, string> = {
    '/dashboard': '仪表盘', '/projects': '项目管理', '/crawl-audit': '网站审计',
    '/keywords': '关键词研究', '/rankings': '排名追踪', '/backlinks': '外链分析',
    '/sem-analysis': 'SEM 分析', '/local-seo': '本地 SEO', '/aso': 'ASO',
    '/youtube': 'YouTube', '/ai-optimization': 'AI 优化', '/competitors': '竞品分析',
    '/report': 'SEO 报告', '/alerting': '告警中心', '/monitor': '网站监控',
    '/roi-analysis': 'ROI 分析', '/white-label': '白标配置', '/schedule': '定时任务',
    '/notifications': '通知管理', '/serp-features': 'SERP 特性', '/sitemap': 'Sitemap',
    '/content-analysis': '内容优化', '/domain-health': '域名健康',
    '/competitor-changes': '竞品变更', '/api-usage': 'API 用量',
  };

  const currentPage = breadcrumbMap[selectedKey] || '';

  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: '个人信息' },
    { key: 'api-usage', icon: <ApiOutlined />, label: 'API 用量' },
    { type: 'divider' },
    {
      key: 'theme',
      icon: appTheme === 'dark' ? <SunOutlined /> : <MoonOutlined />,
      label: appTheme === 'dark' ? '浅色模式' : '深色模式',
    },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => navigate(key);
  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') { logout(); navigate('/login'); }
    else if (key === 'api-usage') navigate('/api-usage');
    else if (key === 'profile') navigate('/dashboard');
    else if (key === 'theme') setTheme(appTheme === 'dark' ? 'light' : 'dark');
  };

  const siderBg = appTheme === 'dark' ? '#141414' : '#001529';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ================================================================ */}
      {/* 侧边栏 */}
      {/* ================================================================ */}
      <Sider
        trigger={null}
        collapsible
        collapsed={sidebarCollapsed}
        width={220}
        style={{
          background: siderBg,
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          borderRight: appTheme === 'dark' ? '1px solid #303030' : 'none',
        }}
      >
        {/* Logo */}
        <div style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: `1px solid ${appTheme === 'dark' ? '#303030' : 'rgba(255,255,255,0.1)'}`,
          padding: '0 16px',
        }}>
          {!sidebarCollapsed ? (
            <Text strong style={{ color: '#fff', fontSize: 16, whiteSpace: 'nowrap' }}>
              {branding.brandName}
            </Text>
          ) : (
            <Text strong style={{ color: '#fff', fontSize: 18 }}>SEO</Text>
          )}
        </div>

        <Menu
          theme={appTheme === 'dark' ? 'dark' : 'dark'}
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0, marginTop: 4 }}
        />
      </Sider>

      {/* ================================================================ */}
      {/* 主内容区 */}
      {/* ================================================================ */}
      <Layout style={{
        marginLeft: sidebarCollapsed ? 80 : 220,
        transition: 'margin-left 0.2s',
        background: appTheme === 'dark' ? '#141414' : '#f5f5f5',
      }}>
        {/* 顶部栏 */}
        <Header style={{
          position: 'sticky', top: 0, zIndex: 99,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px',
          background: appTheme === 'dark' ? '#1f1f1f' : '#fff',
          borderBottom: `1px solid ${appTheme === 'dark' ? '#303030' : '#f0f0f0'}`,
          height: 56,
        }}>
          {/* 左侧：折叠按钮 + 面包屑 + 项目选择器 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              type="text"
              icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleSidebar}
              style={{ fontSize: 16, width: 36, height: 36 }}
            />
            <Text type="secondary" style={{ fontSize: 13 }}>{currentPage}</Text>

            {/* 项目选择器 */}
            <Select
              value={currentProject?.id || undefined}
              onChange={(val) => {
                const p = projects.find((p) => p.id === val);
                setCurrentProject(p || null);
              }}
              placeholder="选择项目"
              style={{ minWidth: 180, marginLeft: 8 }}
              size="small"
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
              notFoundContent={
                <div style={{ padding: 8, textAlign: 'center' }}>
                  <Text type="secondary">暂无项目</Text>
                  <br />
                  <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => navigate('/projects')}>
                    创建项目
                  </Button>
                </div>
              }
            />

            {/* 全局国家/地区选择器 */}
            <CountrySelector size="small" style={{ minWidth: 160 }} />
          </div>

          {/* 右侧：API用量 + 通知 + 用户菜单 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* API 用量指示 */}
            <Space size={4} style={{ cursor: 'pointer' }} onClick={() => navigate('/api-usage')}>
              <ApiOutlined style={{ color: themeToken.colorTextSecondary, fontSize: 14 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                ${apiUsage.monthlyCost.toFixed(2)}
              </Text>
            </Space>

            {/* 通知 */}
            <Badge count={0} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                onClick={() => navigate('/notifications')}
                style={{ fontSize: 16 }}
              />
            </Badge>

            {/* 用户菜单 */}
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar size={28} icon={<UserOutlined />} style={{ backgroundColor: branding.primaryColor }} />
                <Text style={{ fontSize: 13 }}>{user?.name || '管理员'}</Text>
              </Space>
            </Dropdown>
          </div>
        </Header>

        {/* 页面内容 */}
        <Content style={{ margin: '16px 24px', minHeight: 280 }}>
          <Outlet />
        </Content>

        {/* 页脚 */}
        <Footer style={{
          textAlign: 'center',
          padding: '12px 50px',
          color: themeToken.colorTextSecondary,
          fontSize: 12,
          background: appTheme === 'dark' ? '#141414' : '#f5f5f5',
        }}>
          {branding.brandName} &copy; {new Date().getFullYear()} - 企业级 SEO 管理平台
        </Footer>
      </Layout>
    </Layout>
  );
};

export default MainLayout;