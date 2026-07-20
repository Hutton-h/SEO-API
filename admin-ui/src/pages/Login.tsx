import React, { useState, useEffect } from 'react';
import {
  Form, Input, Button, Typography, message, Divider, Card, Space,
} from 'antd';
import {
  MailOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone,
  RiseOutlined, ThunderboltOutlined, GlobalOutlined, TeamOutlined,
  SecurityScanOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '@/services/auth';
import { useStore } from '@/store';

const { Title, Text } = Typography;

// ============================================================================
// Constants
// ============================================================================

const FEATURES = [
  {
    icon: <RiseOutlined />,
    title: '关键词排名追踪',
    desc: '实时追踪 Google、Bing、百度等多搜索引擎排名',
  },
  {
    icon: <ThunderboltOutlined />,
    title: '网站健康审计',
    desc: '自动扫描 SEO 问题，生成可操作的优化建议',
  },
  {
    icon: <GlobalOutlined />,
    title: '多地区支持',
    desc: '覆盖 15+ 国家/地区，精准分析本地化 SEO',
  },
  {
    icon: <TeamOutlined />,
    title: '竞品分析',
    desc: '对比竞争对手表现，发现市场机会',
  },
  {
    icon: <SecurityScanOutlined />,
    title: '智能告警',
    desc: '实时监控排名波动，异常情况及时通知',
  },
  {
    icon: <BarChartOutlined />,
    title: '数据报告',
    desc: '一键生成专业 SEO 报告，支持白标定制',
  },
];

// ============================================================================
// Responsive CSS injection
// ============================================================================

const RESPONSIVE_CSS = `
  .crane-login-container {
    min-height: 100vh;
    display: flex;
    background: #f0f2f5;
  }
  .crane-login-split {
    display: flex;
    width: 100%;
    min-height: 100vh;
  }
  .crane-login-brand {
    flex: 0 0 42%;
    background: linear-gradient(135deg, #1677ff 0%, #0958d9 50%, #003eb3 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }
  .crane-login-brand-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px 48px;
    max-width: 520px;
    width: 100%;
    position: relative;
    z-index: 1;
  }
  .crane-login-logo-area {
    text-align: center;
    margin-bottom: 48px;
  }
  .crane-login-logo-icon {
    width: 72px;
    height: 72px;
    border-radius: 18px;
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(10px);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  }
  .crane-login-features {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 48px;
  }
  .crane-login-feature-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 12px 16px;
    border-radius: 12px;
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(5px);
    transition: background 0.2s;
  }
  .crane-login-feature-icon {
    font-size: 22px;
    color: rgba(255,255,255,0.9);
    margin-top: 2px;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(255,255,255,0.12);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .crane-login-feature-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .crane-login-brand-footer {
    text-align: center;
  }
  .crane-login-form-panel {
    flex: 0 0 58%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f2f5;
    padding: 24px;
  }
  .crane-login-form-wrapper {
    width: 100%;
    max-width: 440px;
    min-width: 360px;
  }
  .crane-login-form-card {
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.06);
  }
  .crane-login-mobile-brand {
    display: none;
    text-align: center;
    margin-bottom: 32px;
  }
  .crane-login-form-header {
    margin-bottom: 32px;
  }

  @media (max-width: 992px) {
    .crane-login-split {
      flex-direction: column;
    }
    .crane-login-brand {
      flex: 0 0 auto;
      padding: 40px 24px;
      min-height: auto;
    }
    .crane-login-brand-inner {
      padding: 20px 16px;
    }
    .crane-login-logo-area {
      margin-bottom: 16px;
    }
    .crane-login-features {
      display: none;
    }
    .crane-login-brand-footer {
      display: none;
    }
    .crane-login-form-panel {
      flex: 1;
      padding: 24px 16px;
    }
    .crane-login-mobile-brand {
      display: block;
    }
    .crane-login-form-card {
      box-shadow: none;
    }
  }
`;

// ============================================================================
// Component
// ============================================================================

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, setAuthenticated, setToken, branding } = useStore();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const brandName = branding.brandName || 'Crane SEO Platform';

  // 注入响应式 CSS
  useEffect(() => {
    const styleId = 'crane-login-styles';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = RESPONSIVE_CSS;
      document.head.appendChild(styleEl);
    }
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await authAPI.login({
        email: values.email,
        password: values.password,
      });

      // 响应拦截器已返回 response.data，res 即 { token, user }
      const result = res as any;
      const token = result.token || result.accessToken;
      const user = result.user;

      if (!token || !user) {
        throw new Error('登录响应数据不完整');
      }

      setToken(token);
      setUser({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role || 'admin',
      });
      setAuthenticated(true);

      message.success('登录成功');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        '登录失败，请检查邮箱和密码';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="crane-login-container">
      <div className="crane-login-split">
        {/* ================================================================ */}
        {/* 左侧：品牌介绍 */}
        {/* ================================================================ */}
        <div className="crane-login-brand">
          <div className="crane-login-brand-inner">
            {/* Logo */}
            <div className="crane-login-logo-area">
              <div className="crane-login-logo-icon">
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <Title level={2} style={{ color: '#fff', margin: '16px 0 8px', fontWeight: 700 }}>
                {brandName}
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16 }}>
                企业级 SEO 管理平台
              </Text>
            </div>

            {/* 功能列表 */}
            <div className="crane-login-features">
              {FEATURES.map((feature, index) => (
                <div key={index} className="crane-login-feature-item">
                  <div className="crane-login-feature-icon">{feature.icon}</div>
                  <div className="crane-login-feature-text">
                    <Text strong style={{ color: '#fff', fontSize: 14, display: 'block' }}>
                      {feature.title}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                      {feature.desc}
                    </Text>
                  </div>
                </div>
              ))}
            </div>

            {/* 版权 */}
            <div className="crane-login-brand-footer">
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                &copy; {new Date().getFullYear()} {brandName}. All rights reserved.
              </Text>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* 右侧：登录表单 */}
        {/* ================================================================ */}
        <div className="crane-login-form-panel">
          <div className="crane-login-form-wrapper">
            <Card
              bordered={false}
              className="crane-login-form-card"
              styles={{ body: { padding: '40px 40px 32px' } }}
            >
              {/* 移动端品牌标题 */}
              <div className="crane-login-mobile-brand">
                <Title level={3} style={{ marginBottom: 4, fontWeight: 600 }}>
                  {brandName}
                </Title>
                <Text type="secondary">企业级 SEO 管理平台</Text>
              </div>

              {/* 表单标题 */}
              <div className="crane-login-form-header">
                <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
                  登录
                </Title>
                <Text type="secondary" style={{ fontSize: 14 }}>
                  欢迎回来，请登录您的账户
                </Text>
              </div>

              <Form
                form={form}
                onFinish={handleLogin}
                size="large"
                layout="vertical"
                initialValues={{ email: '', password: '' }}
              >
                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: '请输入邮箱地址' },
                    { type: 'email', message: '请输入有效的邮箱地址' },
                  ]}
                >
                  <Input
                    prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="请输入邮箱地址"
                    autoComplete="email"
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  rules={[{ required: true, message: '请输入密码' }]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="请输入密码"
                    autoComplete="current-password"
                    iconRender={(visible) =>
                      visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                    }
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 12 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    style={{
                      height: 46,
                      fontSize: 15,
                      fontWeight: 500,
                      borderRadius: 8,
                    }}
                  >
                    登录
                  </Button>
                </Form.Item>

                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <Space size={4}>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      还没有账户？
                    </Text>
                    <Link to="/register" style={{ fontSize: 13 }}>
                      立即注册
                    </Link>
                  </Space>
                </div>

                <Divider plain style={{ margin: '0 0 20px' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    其他登录方式
                  </Text>
                </Divider>

                <Space style={{ width: '100%', justifyContent: 'center' }}>
                  <Button
                    shape="circle"
                    size="large"
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12c6.627 0 12-5.373 12-12S18.627 0 12 0zm.14 19.018c-3.868 0-7-3.14-7-7.018 0-3.878 3.132-7.018 7-7.018 1.89 0 3.47.696 4.682 1.829l-1.974 1.978v-.004c-.735-.702-1.667-1.062-2.708-1.062-2.31 0-4.187 1.956-4.187 4.273 0 2.315 1.877 4.277 4.187 4.277 2.662 0 3.655-1.912 3.81-2.898h-3.81v-2.578h6.354c.062.34.1.68.1 1.078 0 3.966-2.654 7.125-6.454 7.125z" />
                      </svg>
                    }
                  />
                  <Button
                    shape="circle"
                    size="large"
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                      </svg>
                    }
                  />
                  <Button
                    shape="circle"
                    size="large"
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
                      </svg>
                    }
                  />
                </Space>
              </Form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;