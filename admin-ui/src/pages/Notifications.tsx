import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Tag, Typography, Row, Col, Statistic, Space, message, Spin, Empty, Alert, Input, Modal, Form, Select, Switch, Popconfirm, Tabs } from 'antd';
import { ReloadOutlined, PlusOutlined, SendOutlined, MailOutlined, BellOutlined, SlackOutlined, WechatOutlined, DeleteOutlined, EditOutlined, CheckCircleOutlined, CloseCircleOutlined, HistoryOutlined } from '@ant-design/icons';
import { useStore } from '@/store';
import { notificationsAPI } from '@/services/notifications';
import PageHeader from '@/components/PageHeader';

const { Text } = Typography;

const Notifications: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<any>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!projectId) return; setLoading(true); setError(null);
    try {
      const [chRes, recRes] = await Promise.allSettled([
        notificationsAPI.getChannels(),
        notificationsAPI.getSendRecords(),
      ]);
      const extractArr = (r: PromiseSettledResult<any>) => { if (r.status === 'fulfilled') { const d = (r.value as any).data !== undefined ? (r.value as any).data : r.value; return Array.isArray(d) ? d : (d?.data || []); } return []; };
      setChannels(extractArr(chRes));
      setRecords(extractArr(recRes));
    } catch (e: any) { setError(e?.message || '加载失败'); } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { if (!projectId) { setLoading(false); return; } loadData(); }, [projectId]);

  const handleSave = async () => { try { const values = await form.validateFields(); setSaving(true);
    if (editingChannel) { await notificationsAPI.updateChannel(editingChannel.id, values); message.success('已更新'); }
    else { await notificationsAPI.createChannel(values); message.success('已创建'); }
    form.resetFields(); setModalOpen(false); setEditingChannel(null); loadData();
  } catch (e: any) { if (e?.errorFields) return; message.error(e?.message || '保存失败'); } finally { setSaving(false); } };

  const handleToggle = async (ch: any) => { try { await notificationsAPI.toggleChannel(ch.id, !ch.enabled); message.success(ch.enabled ? '已禁用' : '已启用'); loadData(); } catch (e: any) { message.error(e?.message || '操作失败'); } };
  const handleDelete = async (id: string) => { try { await notificationsAPI.deleteChannel(id); message.success('已删除'); loadData(); } catch (e: any) { message.error(e?.message || '删除失败'); } };
  const handleTest = async (ch: any) => { setTesting(ch.id); try { await notificationsAPI.testChannel(ch.id); message.success('测试消息已发送'); } catch (e: any) { message.error(e?.message || '测试失败'); } finally { setTesting(null); } };

  if (!projectId) return <div className="page-container"><PageHeader title="通知管理" /><Empty description="请先选择一个项目" style={{ marginTop: 120 }} /></div>;
  if (loading) return <div className="page-container"><PageHeader title="通知管理" /><Spin size="large" style={{ display: 'block', margin: '40vh auto' }} /></div>;
  if (error) return <div className="page-container"><PageHeader title="通知管理" /><Alert type="error" message="加载失败" description={error} showIcon style={{ marginTop: 24 }} action={<Button size="small" onClick={loadData}>重试</Button>} /></div>;

  const channelIcons: Record<string, React.ReactNode> = { email: <MailOutlined />, dingtalk: <BellOutlined />, feishu: <SendOutlined />, slack: <SlackOutlined /> };

  const chColumns = [
    { title: '渠道', dataIndex: 'type', key: 'type', width: 100, render: (t: string) => <Space>{channelIcons[t] || <BellOutlined />}<Text>{t}</Text></Space> },
    { title: '标签', dataIndex: 'typeLabel', key: 'typeLabel', width: 100, render: (l: string) => l || '-' },
    { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 80, render: (e: boolean) => <Switch checked={e} onChange={() => handleToggle(channels.find((c: any) => c.enabled === e))} /> },
    { title: '最后测试', dataIndex: 'lastTestAt', key: 'lastTestAt', width: 150, render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-' },
    { title: '测试状态', dataIndex: 'lastTestStatus', key: 'lastTestStatus', width: 90, render: (s: string) => s === 'success' ? <Tag color="green">成功</Tag> : s === 'failed' ? <Tag color="red">失败</Tag> : '-' },
    { title: '操作', key: 'action', width: 180, render: (_: any, r: any) => (
      <Space>
        <Button size="small" onClick={() => handleTest(r)} loading={testing === r.id}>测试</Button>
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingChannel(r); form.setFieldsValue(r); setModalOpen(true); }} />
        <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
      </Space>
    )},
  ];

  const recColumns = [
    { title: '渠道', dataIndex: 'channelType', key: 'channelType', width: 90 },
    { title: '收件人', dataIndex: 'recipient', key: 'recipient', width: 150 },
    { title: '主题', dataIndex: 'subject', key: 'subject', ellipsis: true },
    { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (s: string) => s === 'sent' ? <Tag color="green" icon={<CheckCircleOutlined />}>已发送</Tag> : s === 'failed' ? <Tag color="red" icon={<CloseCircleOutlined />}>失败</Tag> : <Tag>待发送</Tag> },
    { title: '发送时间', dataIndex: 'sentAt', key: 'sentAt', width: 150, render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-' },
    { title: '错误', dataIndex: 'errorMessage', key: 'errorMessage', width: 150, ellipsis: true, render: (e: string) => e ? <Text type="danger">{e}</Text> : '-' },
  ];

  return (
    <div className="page-container">
      <PageHeader title="通知管理" subtitle="多渠道通知配置与发送记录管理"
        actions={[{ label: '刷新', icon: <ReloadOutlined />, onClick: loadData, loading }, { label: '添加渠道', type: 'primary', icon: <PlusOutlined />, onClick: () => { setEditingChannel(null); form.resetFields(); setModalOpen(true); } }]} />
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="通知渠道" value={channels.length} prefix={<BellOutlined />} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="已启用" value={channels.filter((c: any) => c.enabled).length} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="发送记录" value={records.length} prefix={<SendOutlined />} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="发送成功" value={records.filter((r: any) => r.status === 'sent').length} valueStyle={{ color: '#52c41a' }} /></Card></Col>
      </Row>
      <Tabs size="large" items={[
        { key: 'channels', label: <span><BellOutlined /> 通知渠道</span>, children: <Card><Table columns={chColumns} dataSource={channels} rowKey="id" pagination={{ pageSize: 10 }} size="middle" /></Card> },
        { key: 'records', label: <span><HistoryOutlined /> 发送记录</span>, children: <Card><Table columns={recColumns} dataSource={records} rowKey="id" pagination={{ pageSize: 10 }} size="middle" /></Card> },
      ]} />
      <Modal title={editingChannel ? '编辑渠道' : '添加渠道'} open={modalOpen} onOk={handleSave} onCancel={() => { setModalOpen(false); setEditingChannel(null); form.resetFields(); }} confirmLoading={saving} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="渠道类型" rules={[{ required: true }]}>
            <Select options={[{ value: 'email', label: '邮件' }, { value: 'dingtalk', label: '钉钉' }, { value: 'feishu', label: '飞书' }, { value: 'slack', label: 'Slack' }]} />
          </Form.Item>
          <Form.Item name="typeLabel" label="标签"><Input placeholder="例如：运维通知" /></Form.Item>
          <Form.Item name="config" label="配置">
            <Input.TextArea rows={3} placeholder='JSON 配置，例如 {"webhook_url": "...", "to": "..."}' />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Notifications;