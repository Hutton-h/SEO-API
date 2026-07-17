import React, { useState } from 'react';
import {
  Card, Row, Col, Switch, Form, Input, Button, Tag, Table, Typography,
  Space, message, Divider, Modal, Result, Badge,
} from 'antd';
import {
  MailOutlined, SendOutlined, SettingOutlined, ReloadOutlined,
  CheckCircleOutlined, CloseCircleOutlined, DingtalkOutlined,
  SlackOutlined, WechatOutlined, PlusOutlined, ApiOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';
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
    { name: 'password', label: '邮箱密码/授权码', placeholder: '输入密码' },
    { name: 'fromName', label: '发件人名称', placeholder: 'SEO Platform' },
  ],
  dingtalk: [
    { name: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://oapi.dingtalk.com/robot/send?access_token=xxx' },
    { name: 'secret', label: '签名密钥', placeholder: 'SEC...' },
  ],
  feishu: [
    { name: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx' },
    { name: 'secret', label: '签名密钥', placeholder: '输入签名密钥' },
  ],
  slack: [
    { name: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/xxx' },
    { name: 'channel', label: '频道', placeholder: '#seo-alerts' },
  ],
};

const mockChannels = [
  { id: 'c1', type: 'email', typeLabel: '邮件', enabled: true, config: { smtpHost: 'smtp.example.com', smtpPort: '587', username: 'admin@example.com', fromName: 'SEO Platform' }, lastTestAt: '2024-07-15T10:00:00', lastTestStatus: 'success', createdAt: '2024-06-01' },
  { id: 'c2', type: 'dingtalk', typeLabel: '钉钉', enabled: true, config: { webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=xxx', secret: 'SEC***' }, lastTestAt: null, lastTestStatus: null, createdAt: '2024-06-15' },
  { id: 'c3', type: 'feishu', typeLabel: '飞书', enabled: false, config: { webhookUrl: '', secret: '' }, lastTestAt: null, lastTestStatus: null, createdAt: '2024-07-01' },
  { id: 'c4', type: 'slack', typeLabel: 'Slack', enabled: true, config: { webhookUrl: 'https://hooks.slack.com/services/xxx', channel: '#seo-alerts' }, lastTestAt: '2024-07-14T15:00:00', lastTestStatus: 'success', createdAt: '2024-07-10' },
];

const mockSendRecords = [
  { id: 's1', channelId: 'c1', channelType: '邮件', recipient: 'admin@example.com', subject: '告警: 主站排名骤降', status: 'success', errorMessage: null, sentAt: '2024-07-15T09:30:00' },
  { id: 's2', channelId: 'c2', channelType: '钉钉', recipient: 'SEO群组', subject: '流量暴跌预警', status: 'success', errorMessage: null, sentAt: '2024-07-15T08:15:00' },
  { id: 's3', channelId: 'c4', channelType: 'Slack', recipient: '#seo-alerts', subject: '爬虫异常通知', status: 'failed', errorMessage: 'Rate limit exceeded', sentAt: '2024-07-14T15:30:00' },
  { id: 's4', channelId: 'c1', channelType: '邮件', recipient: 'admin@example.com', subject: '周报已生成', status: 'success', errorMessage: null, sentAt: '2024-07-14T09:00:00' },
  { id: 's5', channelId: 'c2', channelType: '钉钉', recipient: 'SEO群组', subject: '宕机检测通知', status: 'success', errorMessage: null, sentAt: '2024-07-14T22:00:00' },
];

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
const Notifications: React.FC = () => {
  const [channels, setChannels] = useState<ChannelItem[]>(mockChannels as ChannelItem[]);
  const [sendRecords] = useState(mockSendRecords);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [configForm] = Form.useForm();

  const handleRefresh = () => { setLoading(true); setTimeout(() => setLoading(false), 800); };

  const handleToggle = (id: string, enabled: boolean) => {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, enabled } : c)));
    message.success(enabled ? '渠道已启用' : '渠道已禁用');
  };

  const handleEdit = (channel: any) => {
    setEditingChannelId(channel.id);
    configForm.setFieldsValue(channel.config);
  };

  const handleSaveConfig = (channelId: string) => {
    configForm.validateFields().then((values) => {
      setChannels((prev) =>
        prev.map((c) => (c.id === channelId ? { ...c, config: { ...c.config, ...values } } : c))
      );
      setEditingChannelId(null);
      message.success('配置已保存');
    });
  };

  const handleTest = (channelId: string) => {
    setTestLoading(channelId);
    setTimeout(() => {
      setChannels((prev) =>
        prev.map((c) =>
          c.id === channelId
            ? { ...c, lastTestAt: dayjs().toISOString(), lastTestStatus: 'success' }
            : c
        )
      );
      setTestLoading(null);
      message.success('测试发送成功');
    }, 1500);
  };

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