import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Space, Divider, Alert } from 'antd';
import {
  UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone,
  GithubOutlined, GoogleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/services/auth';
import { useStore } from '@/store';
import axios from 'axios';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, setAuthenticated } = useStore();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [form] = Form.useForm();

  const handleLogin = async (values: { email: string; password: string; remember: boolean }) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await authAPI.login({
        email: values.email,
        password: values.password,
      });
      // 响应格式: { success: true, data: { user, token }, message: '...' }
      const result = (response as any).data || response;
      localStorage.setItem('access_token', result.token);
      // 更新状态
      setUser(result.user);
      setAuthenticated(true);
      message.success('登录成功');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      const errData = error?.response?.data;
      const errMsg = errData?.error?.message || errData?.message || error?.message || '登录失败，请检查用户名和密码';
      setErrorMsg(errMsg);
      // 开发环境回退：模拟登录
      if (import.meta.env.DEV && values.email === 'admin@crane-seo.com' && values.password === 'admin123') {
        localStorage.setItem('access_token', 'dev-token-' + Date.now());
        localStorage.setItem('refresh_token', 'dev-refresh-token-' + Date.now());
        setUser({
          id: '1',
          name: '管理员',
          email: 'admin@crane-seo.com',
          role: 'admin',
        });
        setAuthenticated(true);
        message.success('登录成功 (开发模式)');
        navigate('/dashboard', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" bordered={false}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <Title level={3} style={{ margin: 0 }}>
            Crane SEO Platform
          </Title>
          <Text type="secondary">专业 SEO 管理平台</Text>
        </div>

        {errorMsg && (
          <Alert
            message={errorMsg}
            type="error"
            showIcon
            closable
            onClose={() => setErrorMsg(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={form}
          onFinish={handleLogin}
          size="large"
          initialValues={{ email: 'admin@crane-seo.com', password: 'admin123', remember: true }}
        >
          <Form.Item
            name="email"
            rules={[{ required: true, message: '请输入邮箱' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="邮箱"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="密码"
              iconRender={(visible) =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: 44, fontSize: 15 }}
            >
              登录
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              提示：邮箱 admin@crane-seo.com / 密码 admin123
            </Text>
          </div>

          <Divider plain>
            <Text type="secondary" style={{ fontSize: 12 }}>其他登录方式</Text>
          </Divider>

          <Space style={{ width: '100%', justifyContent: 'center' }}>
            <Button shape="circle" icon={<GithubOutlined />} size="large" />
            <Button shape="circle" icon={<GoogleOutlined />} size="large" />
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default Login;