import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Breadcrumb, Typography, Button, Space, Badge, Statistic } from 'antd';
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
} from '@ant-design/icons';
import { useStore } from '@/store';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

const menuItems: MenuProps['items'] = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: '/projects',
    icon: <ProjectOutlined />,
    label: '项目管理',
  },
  {
    key: '/crawl-audit',
    icon: <BugOutlined />,
    label: '爬虫审计',
  },
  {
    key: '/keywords',
    icon: <KeyOutlined />,
    label: '关键词',
  },
  {
    key: '/rankings',
    icon: <RiseOutlined />,
    label: '排名',
  },
  {
    key: '/backlinks',
    icon: <LinkOutlined />,
    label: '外链',
  },
  {
    key: '/sem-analysis',
    icon: <DollarOutlined />,
    label: 'SEM 分析',
  },
  {
    key: '/local-seo',
    icon: <EnvironmentOutlined />,
    label: '本地 SEO',
  },
  {
    key: '/aso',
    icon: <AppleOutlined />,
    label: 'ASO',
  },
  {
    key: '/youtube',
    icon: <YoutubeOutlined />,
    label: 'YouTube',
  },
  {
    key: '/ai-optimization',
    icon: <RobotOutlined />,
    label: 'AI 优化',
  },
  {
    key: '/competitors',
    icon: <TeamOutlined />,
    label: '竞品分析',
  },
  {
    key: '/report',
    icon: <FileTextOutlined />,
    label: '报告',
  },
  {
    type: 'divider',
  },
  {
    key: 'monitor-group',
    icon: <CloudServerOutlined />,
    label: '监控与告警',
    children: [
      {
        key: '/alerting',
        icon: <BellOutlined />,
        label: '告警中心',
      },
      {
        key: '/monitor',
        icon: <CloudServerOutlined />,
        label: '系统监控',
      },
      {
        key: '/notifications',
        icon: <SendOutlined />,
        label: '通知管理',
      },
    ],
  },
  {
    key: 'analysis-group',
    icon: <PieChartOutlined />,
    label: '数据分析',
    children: [
      {
        key: '/roi-analysis',
        icon: <FundOutlined />,
        label: 'ROI 分析',
      },
      {
        key: '/serp-features',
        icon: <GlobalOutlined />,
        label: 'SERP 特性',
      },
      {
        key: '/content-analysis',
        icon: <ReadOutlined />,
        label: '内容分析',
      },
      {
        key: '/domain-health',
        icon: <VerifiedOutlined />,
        label: '域名健康',
      },
      {
        key: '/competitor-changes',
        icon: <SwapOutlined />,
        label: '竞品变更',
      },
    ],
  },
  {
    key: 'tools-group',
    icon: <SettingOutlined />,
    label: '工具与配置',
    children: [
      {
        key: '/sitemap',
        icon: <ApartmentOutlined />,
        label: 'Sitemap',
      },
      {
        key: '/schedule',
        icon: <ScheduleOutlined />,
        label: '定时任务',
      },
      {
        key: '/white-label',
        icon: <SafetyCertificateOutlined />,
        label: '白标配置',
      },
    ],
  },
];

// 面包屑映射
const breadcrumbMap: Record<string, string> = {
  '/dashboard': '仪表盘',
  '/projects': '项目管理',
  '/crawl-audit': '爬虫审计',
  '/keywords': '关键词管理',
  '/rankings': '排名追踪',
  '/backlinks': '外链分析',
  '/sem-analysis': 'SEM 分析',
  '/local-seo': '本地 SEO',
  '/aso': 'ASO 排名',
  '/youtube': 'YouTube 排名',
  '/ai-optimization': 'AI 优化',
  '/competitors': '竞品分析',
  '/report': '综合报告',
  '/alerting': '告警中心',
  '/monitor': '系统监控',
  '/roi-analysis': 'ROI 分析',
  '/white-label': '白标配置',
  '/schedule': '定时任务',
  '/notifications': '通知管理',
  '/serp-features': 'SERP 特性',
  '/sitemap': 'Sitemap 管理',
  '/content-analysis': '内容分析',
  '/domain-health': '域名健康',
  '/competitor-changes': '竞品变更',
  '/api-usage': 'API 用量',
};

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, theme: themeMode, branding, apiUsage, logout } = useStore();

  const selectedKey = '/' + location.pathname.split('/').filter(Boolean)[0] || '/dashboard';
  const currentPage = breadcrumbMap[selectedKey] || '';

  // 查找父级展开的 key
  const getOpenKeys = () => {
    for (const item of menuItems) {
      if (item && 'children' in item && item.children) {
        for (const child of item.children) {
          if (child && 'key' in child && child.key === selectedKey) {
            return [item.key as string];
          }
        }
      }
    }
    return [];
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    {
      key: 'api-usage',
      icon: <ApiOutlined />,
      label: 'API 用量',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
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
        {!collapsed && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '12px 16px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/api-usage')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ApiOutlined style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }} />
              <div style={{ flex: 1 }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>API 用量</Text>
                <div style={{ color: '#52c41a', fontSize: 14, fontWeight: 600 }}>
                  ${apiUsage.monthlyCost.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s' }}>
        <Header
          className="header-bar"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 99,
          }}
        >
          <div className="header-left">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, width: 40, height: 40 }}
            />
            <Breadcrumb
              style={{ marginLeft: 16 }}
              items={[
                { title: <HomeOutlined /> },
                { title: currentPage },
              ]}
            />
          </div>
          <div className="header-right">
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