import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Switch, Form, Input, Button, Tag, Table, Typography,
  Space, message, Divider, Badge, Spin, Empty, Alert,
} from 'antd';
import {
  MailOutlined, SendOutlined, SettingOutlined, ReloadOutlined,
  CheckCircleOutlined, CloseCircleOutlined, DingtalkOutlined,
  SlackOutlined, WechatOutlined, PlusOutlined, ApiOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';
import { notificationsAPI } from '@/services/notifications';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

const channelIcons: Record<string, React.ReactNode> = {
  email: <MailOutlined style={{ fontSize: 28 }} />,
  dingtalk: <DingtalkOutlined style={{ fontSize: 28 }} />,
  feishu: <SendOutlined style={{ fontSize: 28 }} />,
  slack: <SlackOutlined style={{ fontSize: 28 }} />,
};

const channelColors: Record<string, string> = {
  email: '#1677ff',
  dingtalk: '#0089FF',
  feishu: '#3370ff',
  slack: '#4A154B',
};

const channelConfigFields: Record<string, { name: string; label: string; placeholder: string }[]> = {
  email: [
    { name: 'smtpHost', label: 'SMTP 服务器', placeholder: 'smtp.example.com' },
    { name: 'smtpPort', label: 'SMTP 端口', placeholder: '587' },
    { name: 'username', label: '邮箱账号', placeholder: 'admin@example.com' },
    { name: 'password', label: '邮箱密码/授权码', placeholder: '密码' },
    { name: 'fromName', label: '发件人名称', placeholder: 'SEO Platform' },
  ],
  dingtalk: [
    { name: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://oapi.dingtalk.com/robot/send?access_token=xxx' },
    { name: 'secret', label: '签名密钥', placeholder: 'SEC...' },
  ],
  feishu: [
    { name: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx' },
    { name: 'secret', label: '签名密钥', placeholder: '签名密钥' },
  ],
  slack: [
    { name: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/xxx' },
    { name: 'channel', label: '频道', placeholder: '#seo-alerts' },
  ],
};

interface ChannelItem {
  id: string;
  type: string;
  typeLabel: string;
  enabled: boolean;
  config: Record<string, string | undefined>;
  lastTestAt: string | null;
  lastTestStatus: string | null;
  createdAt: string;
}

interface SendRecord {
  id: string;
  channelId: string;
  channelType: string;
  recipient: string;
  subject: string;
  status: string;
  errorMessage: string | null;
  sentAt: string;
}

const Notifications: React.FC = () => {
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [sendRecords, setSendRecords] = useState<SendRecord[]>([]);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [channelsRes, recordsRes] = await Promise.all([
        notificationsAPI.getChannels(),
        notificationsAPI.getSendRecords(),
      ]);
      const channelsResult = (channelsRes as any).data || channelsRes;
      const recordsResult = (recordsRes as any).data || recordsRes;
      setChannels(Array.isArray(channelsResult) ? channelsResult : channelsResult.data || []);
      setSendRecords(Array.isArray(recordsResult) ? recordsResult : recordsResult.data || []);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => { loadData(); };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await notificationsAPI.toggleChannel(id, enabled);
      setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, enabled } : c)));
      message.success(enabled ? '渠道已启用' : '渠道已禁用');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '操作失败';
      message.error(msg);
    }
  };

  const handleEdit = (channel: any) => {
    setEditingChannelId(channel.id);
    configForm.setFieldsValue(channel.config);
  };

  const handleSaveConfig = async (channelId: string) => {
    try {
      const values = await configForm.validateFields();
      await notificationsAPI.updateChannel(channelId, { config: values });
      setChannels((prev) =>
        prev.map((c) => (c.id === channelId ? { ...c, config: { ...c.config, ...values } } : c))
      );
      setEditingChannelId(null);
      message.success('配置已保存');
    } catch (err: any) {
      if (err?.errorFields) return; // form validation error
      const msg = err?.response?.data?.error?.message || err?.message || '保存失败';
      message.error(msg);
    }
  };

  const handleTest = async (channelId: string) => {
    setTestLoading(channelId);
    try {
      await notificationsAPI.testChannel(channelId);
      setChannels((prev) =>
        prev.map((c) =>
          c.id === channelId
            ? { ...c, lastTestAt: dayjs().toISOString(), lastTestStatus: 'success' }
            : c
        )
      );
      message.success('测试发送成功');
    } catch (err: any) {
      setChannels((prev) =>
        prev.map((c) =>
          c.id === channelId
            ? { ...c, lastTestAt: dayjs().toISOString(), lastTestStatus: 'failed' }
            : c
        )
      );
      const msg = err?.response?.data?.error?.message || err?.message || '测试失败';
      message.error(msg);
    } finally {
      setTestLoading(null);
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />;
  if (error) return <Alert type="error" message="加载失败" description={error} showIcon />;

  const recordColumns = [
    { title: '渠道', dataIndex: 'channelType', key: 'channelType', render: (text: string) => <Tag>{text}</Tag> },
    { title: '接收方', dataIndex: 'recipient', key: 'recipient' },
    { title: '主题', dataIndex: 'subject', key: 'subject', render: (text: string) => <Text strong>{text}</Text> },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (status: string, record: any) => (
        <Space>
          {status === 'success' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
          <Text>{status === 'success' ? '成功' : '失败'}</Text>
          {record.errorMessage && <Text type="danger" style={{ fontSize: 12 }}>({record.errorMessage})</Text>}
        </Space>
      ),
    },
    { title: '时间', dataIndex: 'sentAt', key: 'sentAt', render: (date: string) => dayjs(date).format('MM-DD HH:mm:ss') },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="通知管理"
        subtitle="配置通知渠道与查看发送记录"
        actions={[{ label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading }]}
      />

      <Row gutter={[24, 24]}>
        {channels.map((channel) => {
          const isEditing = editingChannelId === channel.id;
          const fields = channelConfigFields[channel.type] || [];
          return (
            <Col xs={24} md={12} key={channel.id}>
              <Card
                title={
                  <Space>
                    <span style={{ color: channelColors[channel.type] }}>{channelIcons[channel.type]}</span>
                    <span>{channel.typeLabel}</span>
                    <Switch
                      checked={channel.enabled}
                      onChange={(checked) => handleToggle(channel.id, checked)}
                      size="small"
                    />
                    <Badge status={channel.enabled ? 'success' : 'default'} text={channel.enabled ? '已启用' : '已禁用'} />
                  </Space>
                }
                extra={
                  <Space>
                    {!isEditing && (
                      <Button size="small" icon={<SettingOutlined />} onClick={() => handleEdit(channel)}>配置</Button>
                    )}
                    <Button
                      size="small"
                      type="primary"
                      icon={<SendOutlined />}
                      loading={testLoading === channel.id}
                      onClick={() => handleTest(channel.id)}
                      disabled={!channel.enabled}
                    >
                      测试
                    </Button>
                  </Space>
                }
                style={{ borderTop: `3px solid ${channelColors[channel.type]}` }}
              >
                {isEditing ? (
                  <Form form={configForm} layout="vertical" size="small">
                    {fields.map((field) => (
                      <Form.Item
                        key={field.name}
                        name={field.name}
                        label={field.label}
                        rules={field.name === 'webhookUrl' || field.name === 'smtpHost' ? [{ required: true, message: `请输入${field.label}` }] : undefined}
                      >
                        {field.name === 'password' ? (
                          <Input.Password placeholder={field.placeholder} />
                        ) : field.name === 'webhookUrl' ? (
                          <TextArea rows={2} placeholder={field.placeholder} />
                        ) : (
                          <Input placeholder={field.placeholder} />
                        )}
                      </Form.Item>
                    ))}
                    <Space>
                      <Button type="primary" size="small" onClick={() => handleSaveConfig(channel.id)}>保存</Button>
                      <Button size="small" onClick={() => setEditingChannelId(null)}>取消</Button>
                    </Space>
                  </Form>
                ) : (
                  <div>
                    {channel.lastTestAt ? (
                      <div style={{ marginBottom: 12 }}>
                        <Space>
                          <Text type="secondary">上次测试:</Text>
                          <Text>{dayjs(channel.lastTestAt).format('MM-DD HH:mm')}</Text>
                          {channel.lastTestStatus === 'success' ? (
                            <Tag color="success" icon={<CheckCircleOutlined />}>成功</Tag>
                          ) : (
                            <Tag color="error" icon={<CloseCircleOutlined />}>失败</Tag>
                          )}
                        </Space>
                      </div>
                    ) : (
                      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>尚未测试</Text>
                    )}
                    <div style={{ background: '#fafafa', borderRadius: 8, padding: 12 }}>
                      {Object.entries(channel.config).map(([key, value]) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>{key}:</Text>
                          <Text style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {value || <Text type="secondary">未配置</Text>}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>

      <Card title="发送记录" style={{ marginTop: 24 }}>
        <Table columns={recordColumns} dataSource={sendRecords} rowKey="id" pagination={{ pageSize: 10 }} size="middle" />
      </Card>
    </div>
  );
};

export default Notifications;