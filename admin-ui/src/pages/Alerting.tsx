import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Typography, Row, Col, Statistic, Space, message, Spin, Empty, Alert, Input, Select, Modal, Form, Switch, InputNumber, Popconfirm, Tabs } from 'antd';
import { ReloadOutlined, PlusOutlined, BellOutlined, WarningOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, DeleteOutlined, EditOutlined, HistoryOutlined } from '@ant-design/icons';
import { useStore } from '@/store';
import { alertingAPI } from '@/services/alerting';
import PageHeader from '@/components/PageHeader';

const { Text } = Typography;
const { Option } = Select;

const Alerting: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ total: 0, critical: 0, warning: 0, info: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!projectId) return; setLoading(true); setError(null);
    try {
      const [rulesRes, historyRes, summaryRes] = await Promise.allSettled([
        alertingAPI.getAlertRules({ projectId }),
        alertingAPI.getAlertHistory({ projectId }),
        alertingAPI.getAlertSummary(),
      ]);
      const extractArr = (r: PromiseSettledResult<any>) => { if (r.status === 'fulfilled') { const d = (r.value as any).data !== undefined ? (r.value as any).data : r.value; return Array.isArray(d) ? d : (d?.data || []); } return []; };
      setRules(extractArr(rulesRes));
      setHistory(extractArr(historyRes));
      if (summaryRes.status === 'fulfilled') { const d = (summaryRes.value as any).data !== undefined ? (summaryRes.value as any).data : summaryRes.value; if (d) setSummary(d); }
    } catch (e: any) { setError(e?.message || '加载失败'); } finally { setLoading(false); }
  };

  useEffect(() => { if (!projectId) { setLoading(false); return; } loadData(); }, [projectId]);

  const handleSaveRule = async () => {
    try { const values = await form.validateFields(); setSaving(true);
      if (editingRule) { await alertingAPI.updateAlertRule(editingRule.id, { ...values, projectId }); message.success('规则已更新'); }
      else { await alertingAPI.createAlertRule({ ...values, projectId }); message.success('规则已创建'); }
      form.resetFields(); setModalOpen(false); setEditingRule(null); loadData();
    } catch (e: any) { if (e?.errorFields) return; message.error(e?.message || '保存失败'); } finally { setSaving(false); }
  };

  const handleToggleRule = async (rule: any) => { try { await alertingAPI.toggleAlertRule(rule.id, !rule.enabled); message.success(rule.enabled ? '已禁用' : '已启用'); loadData(); } catch (e: any) { message.error(e?.message || '操作失败'); } };
  const handleDeleteRule = async (id: string) => { try { await alertingAPI.deleteAlertRule(id); message.success('已删除'); loadData(); } catch (e: any) { message.error(e?.message || '删除失败'); } };
  const handleAcknowledge = async (id: string) => { try { await alertingAPI.acknowledgeAlert(id); message.success('已确认'); loadData(); } catch (e: any) { message.error(e?.message || '操作失败'); } };

  const openEdit = (rule: any) => { setEditingRule(rule); form.setFieldsValue(rule); setModalOpen(true); };
  const openCreate = () => { setEditingRule(null); form.resetFields(); setModalOpen(true); };

  if (!projectId) return <div className="page-container"><PageHeader title="告警管理" /><Empty description="请先选择一个项目" style={{ marginTop: 120 }} /></div>;
  if (loading) return <div className="page-container"><PageHeader title="告警管理" /><Spin size="large" style={{ display: 'block', margin: '40vh auto' }} /></div>;
  if (error) return <div className="page-container"><PageHeader title="告警管理" /><Alert type="error" message="加载失败" description={error} showIcon style={{ marginTop: 24 }} action={<Button size="small" onClick={loadData}>重试</Button>} /></div>;

  const ruleColumns = [
    { title: '规则名称', dataIndex: 'name', key: 'name', render: (n: string) => <Text strong>{n}</Text> },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100, render: (t: string) => { const labels: Record<string, string> = { ranking_drop: '排名下降', traffic_drop: '流量下降', backlink_loss: '外链丢失', crawl_error: '爬虫错误', downtime: '宕机' }; return <Tag>{labels[t] || t}</Tag>; } },
    { title: '阈值', dataIndex: 'threshold', key: 'threshold', width: 120, render: (v: any, r: any) => <Text>{r.condition?.operator} {r.condition?.threshold}</Text> },
    { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 80, render: (e: boolean, r: any) => <Switch checked={e} onChange={() => handleToggleRule(r)} /> },
    { title: '操作', key: 'action', width: 160, render: (_: any, r: any) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
        <Popconfirm title="确认删除？" onConfirm={() => handleDeleteRule(r.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
      </Space>
    )},
  ];

  const historyColumns = [
    { title: '规则', dataIndex: 'ruleName', key: 'ruleName' },
    { title: '级别', dataIndex: 'severity', key: 'severity', width: 80, render: (s: string) => { const colors: Record<string, string> = { critical: 'red', warning: 'orange', info: 'blue' }; return <Tag color={colors[s] || 'default'}>{s}</Tag>; } },
    { title: '消息', dataIndex: 'message', key: 'message', ellipsis: true },
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 150, render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-' },
    { title: '状态', dataIndex: 'acknowledged', key: 'acknowledged', width: 80, render: (a: boolean) => a ? <Tag color="green">已确认</Tag> : <Tag color="orange">未确认</Tag> },
    { title: '操作', key: 'action', width: 80, render: (_: any, r: any) => !r.acknowledged ? <Button size="small" onClick={() => handleAcknowledge(r.id)}>确认</Button> : null },
  ];

  return (
    <div className="page-container">
      <PageHeader title="告警管理" subtitle="SEO 指标异常告警规则配置与历史查询"
        actions={[{ label: '刷新', icon: <ReloadOutlined />, onClick: loadData, loading }, { label: '创建规则', type: 'primary', icon: <PlusOutlined />, onClick: openCreate }]} />
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="告警规则" value={rules.length} prefix={<BellOutlined />} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="严重" value={summary?.critical || 0} valueStyle={{ color: '#ff4d4f' }} prefix={<ExclamationCircleOutlined />} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="警告" value={summary?.warning || 0} valueStyle={{ color: '#fa8c16' }} prefix={<WarningOutlined />} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="通知" value={summary?.info || 0} valueStyle={{ color: '#1677ff' }} /></Card></Col>
      </Row>
      <Tabs size="large" items={[
        { key: 'rules', label: <span><BellOutlined /> 告警规则</span>, children: <Card><Table columns={ruleColumns} dataSource={rules} rowKey="id" pagination={{ pageSize: 10 }} size="middle" /></Card> },
        { key: 'history', label: <span><HistoryOutlined /> 告警历史</span>, children: <Card><Table columns={historyColumns} dataSource={history} rowKey="id" pagination={{ pageSize: 10 }} size="middle" /></Card> },
      ]} />
      <Modal title={editingRule ? '编辑规则' : '创建规则'} open={modalOpen} onOk={handleSaveRule} onCancel={() => { setModalOpen(false); setEditingRule(null); form.resetFields(); }} confirmLoading={saving} destroyOnClose width={500}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="规则名称" rules={[{ required: true }]}><Input placeholder="例如：排名下降告警" /></Form.Item>
          <Form.Item name="type" label="告警类型" rules={[{ required: true }]}>
            <Select placeholder="选择类型" options={[
              { value: 'ranking_drop', label: '排名下降' }, { value: 'traffic_drop', label: '流量下降' },
              { value: 'backlink_loss', label: '外链丢失' }, { value: 'crawl_error', label: '爬虫错误' }, { value: 'downtime', label: '宕机' },
            ]} />
          </Form.Item>
          <Form.Item name="condition" label="触发条件" rules={[{ required: true }]}>
            <Input.Group compact>
              <Form.Item name={['condition', 'operator']} noStyle><Select style={{ width: 70 }} options={[{ value: '>', label: '>' }, { value: '<', label: '<' }, { value: '>=', label: '>=' }, { value: '<=', label: '<=' }, { value: '=', label: '=' }]} /></Form.Item>
              <Form.Item name={['condition', 'threshold']} noStyle><InputNumber style={{ width: 100 }} placeholder="阈值" /></Form.Item>
            </Input.Group>
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Alerting;