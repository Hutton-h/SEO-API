import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Breadcrumb, Typography, Button, Space } from 'antd';
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
};

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, theme: themeMode } = useStore();

  const selectedKey = '/' + location.pathname.split('/').filter(Boolean)[0] || '/dashboard';
  const currentPage = breadcrumbMap[selectedKey] || '';

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
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
      navigate('/login');
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
          {!collapsed && <h2>SEO Platform</h2>}
          {collapsed && <h2 style={{ fontSize: 14 }}>SEO</h2>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
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
                <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
                <Text>{user?.name || '管理员'}</Text>
              </Space>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: '16px 24px', minHeight: 280 }}>
          <Outlet />
        </Content>
        <Footer className="footer-bar">
          Crane SEO Platform &copy; {new Date().getFullYear()} - 专业 SEO 管理平台
        </Footer>
      </Layout>
    </Layout>
  );
};

export default MainLayout;