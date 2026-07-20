import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Button, Tabs, Form, Select, Input, Switch, Space,
  Typography, message, Popconfirm, Tag, Badge, List, Modal,
} from 'antd';
import {
  ReloadOutlined, DeleteOutlined, MailOutlined, BellOutlined,
  SlackOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined,
  InboxOutlined, SettingOutlined, ExperimentOutlined, CheckOutlined,
  RobotOutlined, NotificationOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from '@/components/common';
import { useStore } from '@/store';
import { useProject } from '@/hooks';
import { notificationsAPI } from '@/services/notifications';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ============================================================================
// Types
// ============================================================================

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  channel: string;
  status: 'sent' | 'failed' | 'pending';
  read: boolean;
  sentAt: string;
}

interface NotificationSettings {
  email: { enabled: boolean; webhookUrl: string };
  dingtalk: { enabled: boolean; webhookUrl: string };
  feishu: { enabled: boolean; webhookUrl: string };
  slack: { enabled: boolean; webhookUrl: string };
}

// ============================================================================
// Constants
// ============================================================================

const CHANNELS = [
  { key: 'email', label: '邮件', icon: <MailOutlined />, color: '#1677ff' },
  { key: 'dingtalk', label: '钉钉', icon: <BellOutlined />, color: '#0089ff' },
  { key: 'feishu', label: '飞书', icon: <SendOutlined />, color: '#3370ff' },
  { key: 'slack', label: 'Slack', icon: <SlackOutlined />, color: '#4a154b' },
];

const INITIAL_SETTINGS: NotificationSettings = {
  email: { enabled: false, webhookUrl: '' },
  dingtalk: { enabled: false, webhookUrl: '' },
  feishu: { enabled: false, webhookUrl: '' },
  slack: { enabled: false, webhookUrl: '' },
};

// ============================================================================
// Component
// ============================================================================

const Notifications: React.FC = () => {
  const { projectId, hasProject } = useProject();
  const { currentProject } = useStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('inbox');

  // Inbox
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filterChannel, setFilterChannel] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);

  // Settings
  const [settings, setSettings] = useState<NotificationSettings>(INITIAL_SETTINGS);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Send Test
  const [testForm] = Form.useForm();
  const [sendingTest, setSendingTest] = useState(false);

  // Send Notification
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendForm] = Form.useForm();
  const [sending, setSending] = useState(false);

  // ==========================================================================
  // Data loading
  // ==========================================================================

  const loadNotifications = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await notificationsAPI.getSendRecords({});
      const data = Array.isArray(res) ? res : (res?.data || []);
      setNotifications(data);
    } catch (err: any) {
      const msg = err?.message || '加载通知列表失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadSettings = useCallback(async () => {
    try {
      const res: any = await notificationsAPI.getChannels();
      const data = res || {};
      setSettings({
        email: {
          enabled: data.email?.enabled ?? false,
          webhookUrl: data.email?.webhookUrl || '',
        },
        dingtalk: {
          enabled: data.dingtalk?.enabled ?? false,
          webhookUrl: data.dingtalk?.webhookUrl || '',
        },
        feishu: {
          enabled: data.feishu?.enabled ?? false,
          webhookUrl: data.feishu?.webhookUrl || '',
        },
        slack: {
          enabled: data.slack?.enabled ?? false,
          webhookUrl: data.slack?.webhookUrl || '',
        },
      });
    } catch {
      // settings are optional
    }
  }, []);

  useEffect(() => {
    if (!projectId) return;
    loadNotifications();
    loadSettings();
  }, [projectId, loadNotifications, loadSettings]);

  // ==========================================================================
  // Inbox handlers
  // ==========================================================================

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsAPI.toggleChannel(id, true);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err: any) {
      const msg = err?.message || '操作失败';
      message.error(msg);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.toggleChannel('all', true);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      message.success('已全部标记为已读');
    } catch (err: any) {
      const msg = err?.message || '操作失败';
      message.error(msg);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await notificationsAPI.deleteChannel(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      message.success('通知已删除');
    } catch (err: any) {
      const msg = err?.message || '删除失败';
      message.error(msg);
    }
  };

  // ==========================================================================
  // Settings handlers
  // ==========================================================================

  const handleToggleChannel = async (channel: string, enabled: boolean) => {
    try {
      setSettingsSaving(true);
      await notificationsAPI.toggleChannel(channel, enabled);
      setSettings((prev) => ({
        ...prev,
        [channel]: { ...prev[channel as keyof NotificationSettings], enabled },
      }));
      message.success(enabled ? `${channel} 已启用` : `${channel} 已禁用`);
    } catch (err: any) {
      const msg = err?.message || '操作失败';
      message.error(msg);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSaveWebhook = async (channel: string, webhookUrl: string) => {
    try {
      setSettingsSaving(true);
      await notificationsAPI.updateChannel(channel, { config: { webhookUrl } });
      setSettings((prev) => ({
        ...prev,
        [channel]: { ...prev[channel as keyof NotificationSettings], webhookUrl },
      }));
      message.success(`${channel} Webhook 已保存`);
    } catch (err: any) {
      const msg = err?.message || '保存失败';
      message.error(msg);
    } finally {
      setSettingsSaving(false);
    }
  };

  // ==========================================================================
  // Send test handlers
  // ==========================================================================

  const handleSendTest = async () => {
    try {
      const values = await testForm.validateFields();
      setSendingTest(true);
      await notificationsAPI.testChannel(values.channel);
      message.success('测试消息已发送');
      testForm.resetFields();
    } catch (err: any) {
      if (err?.errorFields) return;
      const msg = err?.message || '发送失败';
      message.error(msg);
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendNotification = async () => {
    try {
      const values = await sendForm.validateFields();
      setSending(true);
      await notificationsAPI.sendNotification({
        channel: values.channel,
        title: values.title,
        message: values.message,
      });
      message.success('通知已发送');
      sendForm.resetFields();
      setSendModalOpen(false);
      loadNotifications();
    } catch (err: any) {
      if (err?.errorFields) return;
      const msg = err?.message || '发送失败';
      message.error(msg);
    } finally {
      setSending(false);
    }
  };

  // ==========================================================================
  // Filtered notifications
  // ==========================================================================

  const filteredNotifications = notifications.filter((n) => {
    if (filterChannel && n.channel !== filterChannel) return false;
    if (filterStatus && n.status !== filterStatus) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const sentCount = notifications.filter((n) => n.status === 'sent').length;
  const failedCount = notifications.filter((n) => n.status === 'failed').length;

  // ==========================================================================
  // Table columns
  // ==========================================================================

  const inboxColumns = [
    {
      title: '',
      dataIndex: 'read',
      key: 'read',
      width: 40,
      render: (read: boolean) => (
        <Badge dot={!read} offset={[-4, 0]}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: read ? 'transparent' : '#1677ff' }} />
        </Badge>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: NotificationItem) => (
        <Text strong={!record.read}>{text}</Text>
      ),
    },
    {
      title: '消息内容',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {text || '-'}
        </Text>
      ),
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      key: 'channel',
      width: 90,
      render: (channel: string) => {
        const ch = CHANNELS.find((c) => c.key === channel);
        return (
          <Tag icon={ch?.icon} color={ch?.color}>
            {ch?.label || channel}
          </Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; status: 'success' | 'error' | 'pending' }> = {
          sent: { text: '已发送', status: 'success' },
          failed: { text: '失败', status: 'error' },
          pending: { text: '待发送', status: 'pending' },
        };
        const info = statusMap[status] || { text: status, status: 'pending' as const };
        return <StatusBadge status={info.status} text={info.text} />;
      },
    },
    {
      title: '发送时间',
      dataIndex: 'sentAt',
      key: 'sentAt',
      width: 160,
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: NotificationItem) => (
        <Space size="small">
          {!record.read && (
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleMarkAsRead(record.id)}
            >
              已读
            </Button>
          )}
          <Popconfirm
            title="确定删除此通知？"
            onConfirm={() => handleDeleteNotification(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ==========================================================================
  // Render: No project
  // ==========================================================================

  if (!hasProject) {
    return (
      <div className="page-container">
        <PageHeader
          title="通知中心"
          subtitle="管理通知渠道、查看通知记录"
        />
        <EmptyState
          scene="data"
          title="请选择一个项目"
          description="选择一个项目后即可查看通知"
        />
      </div>
    );
  }

  // ==========================================================================
  // Render: Loading
  // ==========================================================================

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="通知中心"
          subtitle={`项目: ${currentProject?.name || ''}`}
        />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ==========================================================================
  // Render: Error
  // ==========================================================================

  if (error) {
    return (
      <div className="page-container">
        <PageHeader
          title="通知中心"
          subtitle={`项目: ${currentProject?.name || ''}`}
        />
        <ErrorState
          message={error}
          onRetry={loadNotifications}
        />
      </div>
    );
  }

  // ==========================================================================
  // Render: Main
  // ==========================================================================

  return (
    <div className="page-container">
      <PageHeader
        title="通知中心"
        subtitle={`项目: ${currentProject?.name || ''} - 多渠道通知管理`}
        actions={
          <Space>
            <Button icon={<SendOutlined />} type="primary" onClick={() => { sendForm.resetFields(); setSendModalOpen(true); }}>
              发送通知
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadNotifications}>
              刷新
            </Button>
          </Space>
        }
      />

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="总通知数"
            value={notifications.length}
            icon={<NotificationOutlined />}
            color="#1677ff"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="未读"
            value={unreadCount}
            icon={<Badge dot><InboxOutlined /></Badge>}
            color={unreadCount > 0 ? '#ff4d4f' : '#52c41a'}
            subtitle={unreadCount > 0 ? '有待处理通知' : '全部已读'}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="已发送"
            value={sentCount}
            icon={<CheckCircleOutlined />}
            color="#52c41a"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="失败"
            value={failedCount}
            icon={<CloseCircleOutlined />}
            color={failedCount > 0 ? '#ff4d4f' : '#52c41a'}
          />
        </Col>
      </Row>

      {/* Tabs */}
      <Card style={{ borderRadius: 8 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
          items={[
            {
              key: 'inbox',
              label: (
                <span>
                  <InboxOutlined /> 收件箱
                  {unreadCount > 0 && (
                    <Badge count={unreadCount} size="small" style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <div style={{ marginTop: 8 }}>
                  {/* Filters + Actions */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16,
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <Space wrap>
                      <Select
                        placeholder="渠道筛选"
                        allowClear
                        style={{ width: 130 }}
                        value={filterChannel}
                        onChange={setFilterChannel}
                      >
                        {CHANNELS.map((ch) => (
                          <Option key={ch.key} value={ch.key}>
                            {ch.label}
                          </Option>
                        ))}
                      </Select>
                      <Select
                        placeholder="状态筛选"
                        allowClear
                        style={{ width: 130 }}
                        value={filterStatus}
                        onChange={setFilterStatus}
                      >
                        <Option value="sent">已发送</Option>
                        <Option value="failed">失败</Option>
                        <Option value="pending">待发送</Option>
                      </Select>
                    </Space>
                    {unreadCount > 0 && (
                      <Button
                        type="primary"
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={handleMarkAllAsRead}
                      >
                        全部已读
                      </Button>
                    )}
                  </div>

                  {/* Notification List */}
                  {filteredNotifications.length === 0 ? (
                    <EmptyState
                      scene="notification"
                      title="暂无通知"
                      description={
                        filterChannel || filterStatus
                          ? '当前筛选条件下没有通知'
                          : '还没有任何通知消息'
                      }
                    />
                  ) : (
                    <Table
                      columns={inboxColumns}
                      dataSource={filteredNotifications}
                      rowKey="id"
                      pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条通知` }}
                      size="middle"
                      rowClassName={(record) => (!record.read ? 'notification-unread-row' : '')}
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'settings',
              label: (
                <span>
                  <SettingOutlined /> 通知设置
                </span>
              ),
              children: (
                <div style={{ marginTop: 8, maxWidth: 600 }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    配置各渠道的通知开关和 Webhook 地址
                  </Text>

                  {CHANNELS.map((ch) => {
                    const channelSettings = settings[ch.key as keyof NotificationSettings];
                    return (
                      <Card
                        key={ch.key}
                        size="small"
                        style={{ marginBottom: 12, borderRadius: 8 }}
                        title={
                          <Space>
                            {ch.icon}
                            <Text strong>{ch.label}</Text>
                          </Space>
                        }
                        extra={
                          <Switch
                            checked={channelSettings.enabled}
                            onChange={(checked) => handleToggleChannel(ch.key, checked)}
                            loading={settingsSaving}
                            checkedChildren="启用"
                            unCheckedChildren="禁用"
                          />
                        }
                      >
                        <Form layout="inline" style={{ width: '100%' }}>
                          <Form.Item label="Webhook URL" style={{ flex: 1 }}>
                            <Input
                              placeholder={`输入 ${ch.label} Webhook 地址`}
                              value={channelSettings.webhookUrl}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  [ch.key]: {
                                    ...prev[ch.key as keyof NotificationSettings],
                                    webhookUrl: e.target.value,
                                  },
                                }))
                              }
                              style={{ width: 320 }}
                            />
                          </Form.Item>
                          <Form.Item>
                            <Button
                              type="primary"
                              size="small"
                              loading={settingsSaving}
                              onClick={() =>
                                handleSaveWebhook(ch.key, channelSettings.webhookUrl)
                              }
                            >
                              保存
                            </Button>
                          </Form.Item>
                        </Form>
                      </Card>
                    );
                  })}
                </div>
              ),
            },
            {
              key: 'send-test',
              label: (
                <span>
                  <ExperimentOutlined /> 发送测试
                </span>
              ),
              children: (
                <div style={{ marginTop: 8, maxWidth: 500 }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    发送一条测试消息到指定渠道，验证通知配置是否正确
                  </Text>

                  <Form
                    form={testForm}
                    layout="vertical"
                    initialValues={{ channel: 'email' }}
                  >
                    <Form.Item
                      name="channel"
                      label="通知渠道"
                      rules={[{ required: true, message: '请选择渠道' }]}
                    >
                      <Select placeholder="选择渠道">
                        {CHANNELS.map((ch) => (
                          <Option key={ch.key} value={ch.key}>
                            <Space>
                              {ch.icon}
                              {ch.label}
                            </Space>
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="recipient"
                      label="接收人 / Webhook"
                      rules={[{ required: true, message: '请输入接收人地址或 Webhook URL' }]}
                    >
                      <Input placeholder="user@example.com 或 https://hooks.example.com/..." />
                    </Form.Item>

                    <Form.Item
                      name="message"
                      label="测试消息"
                      rules={[{ required: true, message: '请输入测试消息内容' }]}
                    >
                      <TextArea
                        rows={3}
                        placeholder="这是一条来自 Crane SEO 平台的测试消息"
                      />
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        loading={sendingTest}
                        onClick={handleSendTest}
                        block
                      >
                        发送测试消息
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Send Notification Modal */}
      <Modal
        title="发送通知"
        open={sendModalOpen}
        onOk={handleSendNotification}
        onCancel={() => { setSendModalOpen(false); sendForm.resetFields(); }}
        confirmLoading={sending}
        okText="发送"
        cancelText="取消"
        width={520}
        destroyOnClose
      >
        <Form form={sendForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="channel"
            label="通知渠道"
            rules={[{ required: true, message: '请选择渠道' }]}
          >
            <Select placeholder="选择通知渠道">
              {CHANNELS.map((ch) => (
                <Option key={ch.key} value={ch.key}>
                  <Space>
                    {ch.icon}
                    {ch.label}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="title"
            label="通知标题"
            rules={[{ required: true, message: '请输入通知标题' }]}
          >
            <Input placeholder="请输入通知标题" />
          </Form.Item>
          <Form.Item
            name="message"
            label="通知内容"
            rules={[{ required: true, message: '请输入通知内容' }]}
          >
            <TextArea rows={4} placeholder="请输入通知内容" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Notifications;