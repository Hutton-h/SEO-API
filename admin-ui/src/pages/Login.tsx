import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Space, Divider } from 'antd';
import {
  UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone,
  GithubOutlined, GoogleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleLogin = async (values: { username: string; password: string; remember: boolean }) => {
    setLoading(true);
    // 模拟登录
    setTimeout(() => {
      if (values.username === 'admin' && values.password === 'admin123') {
        message.success('登录成功');
        localStorage.setItem('access_token', 'mock-token-12345');
        navigate('/dashboard', { replace: true });
      } else {
        message.error('用户名或密码错误');
      }
      setLoading(false);
    }, 1000);
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

        <Form
          form={form}
          onFinish={handleLogin}
          size="large"
          initialValues={{ username: 'admin', password: 'admin123', remember: true }}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="用户名"
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
              提示：用户名 admin / 密码 admin123
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