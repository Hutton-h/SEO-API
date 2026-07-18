import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Breadcrumb, Typography, Button, Space, Select } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  ProjectOutlined,
  BugOutlined,
  KeyOutlined,
  RiseOutlined,
  LinkOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  AppleOutlined,
  YoutubeOutlined,
  RobotOutlined,
  TeamOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  HomeOutlined,
  BellOutlined,
  CloudServerOutlined,
  ScheduleOutlined,
  SendOutlined,
  GlobalOutlined,
  ApartmentOutlined,
  ReadOutlined,
  VerifiedOutlined,
  SwapOutlined,
  ApiOutlined,
  PieChartOutlined,
  SafetyCertificateOutlined,
  FundOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useStore } from '@/store';
import { projectAPI } from '@/services/project';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user, projects, currentProject, setCurrentProject, setProjects,
    branding, apiUsage, logout,
  } = useStore();

  // 加载项目列表
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await projectAPI.getProjects();
        const d = (res as any).data || res;
        const list = Array.isArray(d) ? d : (d?.data || []);
        setProjects(list);
        // 如果还没选项目，自动选第一个
        if (!currentProject && list.length > 0) {
          setCurrentProject(list[0]);
        }
      } catch {}
    };
    loadProjects();
  }, []);

  const selectedKey = '/' + location.pathname.split('/').filter(Boolean)[0] || '/dashboard';

  // ---- 精简版菜单 ----
  const menuItems: MenuProps['items'] = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/projects', icon: <ProjectOutlined />, label: '项目管理' },
    { type: 'divider' },
    { key: '/keywords', icon: <KeyOutlined />, label: '关键词管理' },
    { key: '/rankings', icon: <RiseOutlined />, label: '排名追踪' },
    { key: '/crawl-audit', icon: <BugOutlined />, label: '网站审计' },
    { key: '/competitors', icon: <TeamOutlined />, label: '竞品分析' },
    { key: '/content-analysis', icon: <ReadOutlined />, label: '内容优化' },
    { key: '/backlinks', icon: <LinkOutlined />, label: '外链分析' },
    { type: 'divider' },
    {
      key: 'seo-group',
      icon: <PieChartOutlined />,
      label: '扩展工具',
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
      key: 'monitor-group',
      icon: <CloudServerOutlined />,
      label: '监控与报告',
      children: [
        { key: '/report', icon: <FileTextOutlined />, label: 'SEO 报告' },
        { key: '/monitor', icon: <CloudServerOutlined />, label: '网站监控' },
        { key: '/alerting', icon: <BellOutlined />, label: '告警中心' },
        { key: '/notifications', icon: <SendOutlined />, label: '通知管理' },
        { key: '/schedule', icon: <ScheduleOutlined />, label: '定时任务' },
      ],
    },
    {
      key: 'tools-group',
      icon: <SettingOutlined />,
      label: '工具与配置',
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
    '/sem-analysis': 'seo-group',
    '/local-seo': 'seo-group',
    '/aso': 'seo-group',
    '/youtube': 'seo-group',
    '/ai-optimization': 'seo-group',
    '/serp-features': 'seo-group',
    '/report': 'monitor-group',
    '/monitor': 'monitor-group',
    '/alerting': 'monitor-group',
    '/notifications': 'monitor-group',
    '/schedule': 'monitor-group',
    '/roi-analysis': 'tools-group',
    '/domain-health': 'tools-group',
    '/competitor-changes': 'tools-group',
    '/sitemap': 'tools-group',
    '/api-usage': 'tools-group',
    '/white-label': 'tools-group',
  };
  return submenuMap[path] ? [submenuMap[path]] : [];
};

const breadcrumbMap: Record<string, string> = {
    '/dashboard': '仪表盘', '/projects': '项目管理', '/crawl-audit': '网站审计',
    '/keywords': '关键词管理', '/rankings': '排名追踪', '/backlinks': '外链分析',
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
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    } else if (key === 'api-usage') {
      navigate('/api-usage');
    } else if (key === 'profile') {
      navigate('/dashboard');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{
          background: '#001529',
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div className="sider-logo">
          {!collapsed && <h2>{branding.brandName}</h2>}
          {collapsed && <h2 style={{ fontSize: 14 }}>SEO</h2>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s' }}>
        <Header
          className="header-bar"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 99,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, width: 40, height: 40 }}
            />
            <Breadcrumb items={[{ title: <HomeOutlined /> }, { title: currentPage }]} />

            {/* 项目选择器 */}
            <Select
              value={currentProject?.id || undefined}
              onChange={(val) => {
                const p = projects.find((p) => p.id === val);
                setCurrentProject(p || null);
                if (location.pathname === '/dashboard') {
                  // 切换项目时刷新 dashboard
                  window.location.reload();
                }
              }}
              placeholder="选择项目"
              style={{ minWidth: 200, marginLeft: 16 }}
              options={projects.map((p) => ({
                label: p.name,
                value: p.id,
              }))}
              notFoundContent={
                <div style={{ padding: 8, textAlign: 'center' }}>
                  <Text type="secondary">暂无项目</Text>
                  <br />
                  <Button
                    type="link"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => navigate('/projects')}
                  >
                    创建项目
                  </Button>
                </div>
              }
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: branding.primaryColor }} />
                <Text>{user?.name || '管理员'}</Text>
              </Space>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ margin: '16px 24px', minHeight: 280 }}>
          <Outlet />
        </Content>

        <Footer className="footer-bar">
          {branding.brandName} &copy; {new Date().getFullYear()} - 专业 SEO 管理平台
        </Footer>
      </Layout>
    </Layout>
  );
};

export default MainLayout;