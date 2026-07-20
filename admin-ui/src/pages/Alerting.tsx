import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Typography, Button, Space, Tag, Select,
  message, Modal, Form, Input, InputNumber, Switch, Popconfirm, Tabs, Badge,
} from 'antd';
import {
  ReloadOutlined, PlusOutlined, BellOutlined, WarningOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined,
  DeleteOutlined, EditOutlined, HistoryOutlined, AlertOutlined,
  MailOutlined, DingtalkOutlined, SlackOutlined, ThunderboltOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from '@/components/common';
import { useStore } from '@/store';
import { alertingAPI } from '@/services/alerting';

const { Text } = Typography;
const { Option } = Select;

// ============================================================================
// Types
// ============================================================================

interface AlertRuleItem {
  id: string;
  name: string;
  type: string;
  condition: string;
  threshold: number;
  channels: string[];
  enabled: boolean;
  createdAt: string;
}

interface AlertHistoryItem {
  id: string;
  alert_name: string;
  ruleName: string;
  severity: string;
  message: string;
  triggered_at: string;
  createdAt: string;
  acknowledged: boolean;
}

interface SummaryData {
  activeAlerts: number;
  triggeredToday: number;
  acknowledged: number;
  avgResponseTime: number;
}

// ============================================================================
// Constants
// ============================================================================

const ALERT_TYPES = [
  { value: 'ranking_drop', label: '排名下降' },
  { value: 'traffic_drop', label: '流量下降' },
  { value: 'crawl_error', label: '爬虫错误' },
  { value: 'backlink_loss', label: '外链丢失' },
  { value: 'ssl_expiry', label: 'SSL 到期' },
];

const CHANNEL_OPTIONS = [
  { value: 'email', label: '邮件', icon: <MailOutlined /> },
  { value: 'dingtalk', label: '钉钉', icon: <DingtalkOutlined /> },
  { value: 'feishu', label: '飞书', icon: <ThunderboltOutlined /> },
  { value: 'slack', label: 'Slack', icon: <SlackOutlined /> },
];

const SEVERITY_MAP: Record<string, { color: string; label: string; status: 'error' | 'warning' | 'active' }> = {
  critical: { color: 'red', label: '严重', status: 'error' },
  warning: { color: 'orange', label: '警告', status: 'warning' },
  info: { color: 'blue', label: '信息', status: 'active' },
};

// ============================================================================
// Component
// ============================================================================

const Alerting: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const projectName = useStore((s) => s.currentProject?.name);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<AlertRuleItem[]>([]);
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    activeAlerts: 0, triggeredToday: 0, acknowledged: 0, avgResponseTime: 0,
  });
  const [activeTab, setActiveTab] = useState('rules');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRuleItem | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // ==========================================================================
  // Data loading
  // ==========================================================================

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [rulesRes, historyRes, summaryRes] = await Promise.allSettled([
        alertingAPI.getAlertRules({ projectId }),
        alertingAPI.getAlertHistory({ projectId }),
        alertingAPI.getAlertSummary(),
      ]);

      // Process rules
      let rulesData: AlertRuleItem[] = [];
      if (rulesRes.status === 'fulfilled') {
        const rd: any = rulesRes.value;
        const arr = Array.isArray(rd) ? rd : (rd?.data || []);
        rulesData = arr.map((r: any, idx: number) => ({
          id: r.id || `rule-${idx}`,
          name: r.name || '',
          type: r.type || 'ranking_drop',
          condition: r.condition?.operator || '>=',
          threshold: r.condition?.threshold || r.threshold || 0,
          channels: r.channel || r.channels || ['email'],
          enabled: r.enabled !== false,
          createdAt: r.createdAt || '',
        }));
        setRules(rulesData);
      }

      // Process history
      let historyData: AlertHistoryItem[] = [];
      if (historyRes.status === 'fulfilled') {
        const hd: any = historyRes.value;
        const arr = Array.isArray(hd) ? hd : (hd?.data || []);
        historyData = arr.map((h: any, idx: number) => ({
          id: h.id || `hist-${idx}`,
          alert_name: h.ruleName || h.alert_name || '',
          ruleName: h.ruleName || '',
          severity: h.severity || 'info',
          message: h.message || '',
          triggered_at: h.createdAt || h.triggered_at || '',
          createdAt: h.createdAt || '',
          acknowledged: h.acknowledged || false,
        }));
        setHistory(historyData);
      }

      // Process summary
      if (summaryRes.status === 'fulfilled') {
        const sd: any = summaryRes.value;
        const s = sd?.data !== undefined ? sd.data : sd;
        setSummary({
          activeAlerts: s?.total || rulesData.filter((r) => r.enabled).length,
          triggeredToday: s?.unacknowledged || historyData.filter((h) => !h.acknowledged).length,
          acknowledged: s?.acknowledged || historyData.filter((h) => h.acknowledged).length,
          avgResponseTime: s?.avgResponseTime || 0,
        });
      } else {
        setSummary({
          activeAlerts: rulesData.filter((r) => r.enabled).length,
          triggeredToday: historyData.filter((h) => !h.acknowledged).length,
          acknowledged: historyData.filter((h) => h.acknowledged).length,
          avgResponseTime: 0,
        });
      }
    } catch (e: any) {
      setError(e?.message || '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadData();
  }, [loadData, projectId]);

  // ==========================================================================
  // CRUD operations
  // ==========================================================================

  const handleSaveRule = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        name: values.name,
        type: values.type,
        typeLabel: ALERT_TYPES.find((t) => t.value === values.type)?.label || values.type,
        condition: { operator: '>=', threshold: values.threshold },
        threshold: values.threshold,
        channel: values.channels || ['email'],
        enabled: values.enabled !== false,
        projectId,
      };
      if (editingRule) {
        await alertingAPI.updateAlertRule(editingRule.id, payload as any);
        message.success('告警规则已更新');
      } else {
        await alertingAPI.createAlertRule(payload as any);
        message.success('告警规则已创建');
      }
      form.resetFields();
      setModalOpen(false);
      setEditingRule(null);
      loadData();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRule = async (rule: AlertRuleItem) => {
    try {
      await alertingAPI.toggleAlertRule(rule.id, !rule.enabled);
      message.success(rule.enabled ? '已禁用' : '已启用');
      loadData();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await alertingAPI.deleteAlertRule(id);
      message.success('已删除');
      loadData();
    } catch (e: any) {
      message.error(e?.message || '删除失败');
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await alertingAPI.acknowledgeAlert(id);
      message.success('已确认');
      loadData();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  const openCreate = () => {
    setEditingRule(null);
    form.resetFields();
    form.setFieldsValue({ enabled: true, channels: ['email'] });
    setModalOpen(true);
  };

  const openEdit = (rule: AlertRuleItem) => {
    setEditingRule(rule);
    form.setFieldsValue({
      name: rule.name,
      type: rule.type,
      threshold: rule.threshold,
      channels: rule.channels,
      enabled: rule.enabled,
    });
    setModalOpen(true);
  };

  // ==========================================================================
  // No project
  // ==========================================================================

  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="告警中心" subtitle="SEO 指标异常告警规则配置与历史查询" />
        <EmptyState scene="data" title="请先选择项目" description="选择一个项目以查看和管理告警规则与历史记录" />
      </div>
    );
  }

  // ==========================================================================
  // Loading state
  // ==========================================================================

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="告警中心"
          subtitle={`项目: ${projectName || ''}`}
          actions={<Button icon={<ReloadOutlined />} loading disabled>刷新</Button>}
        />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ==========================================================================
  // Error state
  // ==========================================================================

  if (error) {
    return (
      <div className="page-container">
        <PageHeader title="告警中心" subtitle={`项目: ${projectName || ''}`} />
        <ErrorState message={error} onRetry={loadData} />
      </div>
    );
  }

  // ==========================================================================
  // Table columns
  // ==========================================================================

  const ruleColumns = [
    {
      title: '规则名称', dataIndex: 'name', key: 'name',
      render: (n: string) => <Text strong>{n}</Text>,
    },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 120,
      render: (t: string) => {
        const typeInfo = ALERT_TYPES.find((at) => at.value === t);
        return <Tag color="blue">{typeInfo?.label || t}</Tag>;
      },
    },
    {
      title: '条件', dataIndex: 'condition', key: 'condition', width: 100,
      render: (_: string, r: AlertRuleItem) => (
        <Text code>{r.condition} {r.threshold}</Text>
      ),
    },
    {
      title: '通知渠道', dataIndex: 'channels', key: 'channels', width: 180,
      render: (chs: string[]) => (
        <Space size={4}>
          {chs.map((ch) => {
            const opt = CHANNEL_OPTIONS.find((o) => o.value === ch);
            return <Tag key={ch} icon={opt?.icon}>{opt?.label || ch}</Tag>;
          })}
        </Space>
      ),
    },
    {
      title: '状态', dataIndex: 'enabled', key: 'enabled', width: 80,
      render: (e: boolean) => <StatusBadge status={e ? 'active' : 'paused'} text={e ? '启用' : '禁用'} />,
    },
    {
      title: '操作', key: 'action', width: 160,
      render: (_: any, r: AlertRuleItem) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除此规则？" onConfirm={() => handleDeleteRule(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const historyColumns = [
    {
      title: '告警名称', dataIndex: 'alert_name', key: 'alert_name',
      render: (n: string, r: AlertHistoryItem) => <Text strong>{n || r.ruleName}</Text>,
    },
    {
      title: '严重程度', dataIndex: 'severity', key: 'severity', width: 100,
      render: (s: string) => {
        const cfg = SEVERITY_MAP[s] || SEVERITY_MAP.info;
        return <StatusBadge status={cfg.status} text={cfg.label} />;
      },
    },
    {
      title: '告警消息', dataIndex: 'message', key: 'message', ellipsis: true,
      render: (m: string) => <Text>{m}</Text>,
    },
    {
      title: '触发时间', dataIndex: 'triggered_at', key: 'triggered_at', width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '确认状态', dataIndex: 'acknowledged', key: 'acknowledged', width: 100,
      render: (a: boolean) => (
        <Tag color={a ? 'green' : 'orange'} icon={a ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}>
          {a ? '已确认' : '未确认'}
        </Tag>
      ),
    },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, r: AlertHistoryItem) =>
        !r.acknowledged ? (
          <Popconfirm title="确认已处理此告警？" onConfirm={() => handleAcknowledge(r.id)}>
            <Button size="small" type="primary" icon={<CheckCircleOutlined />}>确认</Button>
          </Popconfirm>
        ) : null,
    },
  ];

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="page-container">
      <PageHeader
        title="告警中心"
        subtitle={`项目: ${projectName || ''} - SEO 指标异常告警规则配置与历史查询`}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              创建规则
            </Button>
          </Space>
        }
      />

      {/* KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="活跃告警"
            value={summary.activeAlerts}
            suffix="条"
            icon={<BellOutlined />}
            color="#1677ff"
            subtitle="已启用规则数"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="今日触发"
            value={summary.triggeredToday}
            suffix="次"
            icon={<WarningOutlined />}
            color={summary.triggeredToday > 0 ? '#ff4d4f' : '#52c41a'}
            subtitle="待处理告警"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="已确认"
            value={summary.acknowledged}
            suffix="条"
            icon={<CheckCircleOutlined />}
            color="#52c41a"
            subtitle="已处理告警"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="平均响应时间"
            value={summary.avgResponseTime}
            suffix="分钟"
            icon={<ClockCircleOutlined />}
            color="#722ed1"
            subtitle="告警确认耗时"
          />
        </Col>
      </Row>

      {/* Tabs: Alert Rules / Alert History */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="large"
        items={[
          {
            key: 'rules',
            label: (
              <span>
                <BellOutlined /> 告警规则
                <Badge count={rules.length} style={{ marginLeft: 8 }} overflowCount={99} />
              </span>
            ),
            children: (
              <Card style={{ borderRadius: 8 }}>
                {rules.length > 0 ? (
                  <Table
                    columns={ruleColumns}
                    dataSource={rules}
                    rowKey="id"
                    pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条规则` }}
                    size="middle"
                    scroll={{ x: 900 }}
                  />
                ) : (
                  <EmptyState
                    scene="data"
                    title="暂无告警规则"
                    description="点击「创建规则」按钮添加第一条告警规则"
                    action={{ text: '创建规则', icon: <PlusOutlined />, onClick: openCreate }}
                  />
                )}
              </Card>
            ),
          },
          {
            key: 'history',
            label: (
              <span>
                <HistoryOutlined /> 告警历史
                <Badge
                  count={history.filter((h) => !h.acknowledged).length}
                  style={{ marginLeft: 8 }}
                  overflowCount={99}
                  color="#ff4d4f"
                />
              </span>
            ),
            children: (
              <Card style={{ borderRadius: 8 }}>
                {history.length > 0 ? (
                  <Table
                    columns={historyColumns}
                    dataSource={history}
                    rowKey="id"
                    pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条记录` }}
                    size="middle"
                    scroll={{ x: 900 }}
                  />
                ) : (
                  <EmptyState scene="notification" title="暂无告警历史" description="系统运行正常，尚未触发任何告警" />
                )}
              </Card>
            ),
          },
        ]}
      />

      {/* Create/Edit Alert Modal */}
      <Modal
        title={editingRule ? '编辑告警规则' : '创建告警规则'}
        open={modalOpen}
        onOk={handleSaveRule}
        onCancel={() => { setModalOpen(false); setEditingRule(null); form.resetFields(); }}
        confirmLoading={saving}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="例如：核心关键词排名下降告警" />
          </Form.Item>
          <Form.Item
            name="type"
            label="告警类型"
            rules={[{ required: true, message: '请选择告警类型' }]}
          >
            <Select placeholder="选择告警类型" options={ALERT_TYPES} />
          </Form.Item>
          <Form.Item
            name="threshold"
            label="触发阈值"
            rules={[{ required: true, message: '请输入触发阈值' }]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="例如：10" min={0} />
          </Form.Item>
          <Form.Item
            name="channels"
            label="通知渠道"
            rules={[{ required: true, message: '请选择至少一个通知渠道' }]}
          >
            <Select
              mode="multiple"
              placeholder="选择通知渠道"
              options={CHANNEL_OPTIONS.map((o) => ({
                value: o.value,
                label: (
                  <Space>
                    {o.icon}
                    <span>{o.label}</span>
                  </Space>
                ),
              }))}
            />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Alerting;