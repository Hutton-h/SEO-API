import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Modal, Form, Select, Input, InputNumber, Switch,
  Tag, Badge, Timeline, Space, Typography, message, Row, Col, Statistic, Popconfirm,
  Spin, Empty, Alert,
} from 'antd';
import {
  PlusOutlined, BellOutlined, DeleteOutlined, EditOutlined,
  CheckCircleOutlined, WarningOutlined, CloseCircleOutlined,
  ExclamationCircleOutlined, InfoCircleOutlined, ReloadOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { alertingAPI, AlertRule, AlertHistory } from '@/services/alerting';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Option } = Select;

const alertTypeOptions = [
  { value: 'ranking_drop', label: '排名骤降', color: '#ff4d4f', icon: <CloseCircleOutlined /> },
  { value: 'traffic_drop', label: '流量暴跌', color: '#fa8c16', icon: <WarningOutlined /> },
  { value: 'backlink_loss', label: '外链丢失', color: '#faad14', icon: <ExclamationCircleOutlined /> },
  { value: 'crawl_error', label: '爬虫异常', color: '#722ed1', icon: <InfoCircleOutlined /> },
  { value: 'downtime', label: '宕机', color: '#eb2f96', icon: <CloseCircleOutlined /> },
];

const channelOptions = [
  { value: 'email', label: '邮件' },
  { value: 'dingtalk', label: '钉钉' },
  { value: 'feishu', label: '飞书' },
  { value: 'slack', label: 'Slack' },
  { value: 'sms', label: '短信' },
];

const severityConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  critical: { color: '#ff4d4f', icon: <CloseCircleOutlined /> },
  warning: { color: '#faad14', icon: <WarningOutlined /> },
  info: { color: '#1677ff', icon: <InfoCircleOutlined /> },
};

const Alerting: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [summary, setSummary] = useState<{ unacknowledged: number; critical: number; warning: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ruleModalVisible, setRuleModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [ruleForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [rulesRes, historyRes, summaryRes] = await Promise.all([
        alertingAPI.getAlertRules(),
        alertingAPI.getAlertHistory(),
        alertingAPI.getAlertSummary(),
      ]);
      const rulesData = (rulesRes as any).data || rulesRes;
      const historyData = (historyRes as any).data || historyRes;
      const summaryData = (summaryRes as any).data || summaryRes;
      setRules(Array.isArray(rulesData) ? rulesData : rulesData.data || []);
      setHistory(Array.isArray(historyData) ? historyData : historyData.data || []);
      setSummary(summaryData);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载告警数据失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    loadData();
  }, [projectId, loadData]);

  const handleRefresh = async () => {
    await loadData();
  };

  const handleAddRule = () => {
    setEditingRule(null);
    ruleForm.resetFields();
    ruleForm.setFieldsValue({ enabled: true, channel: ['email'] });
    setRuleModalVisible(true);
  };

  const handleEditRule = (record: any) => {
    setEditingRule(record);
    ruleForm.setFieldsValue(record);
    setRuleModalVisible(true);
  };

  const handleRuleSubmit = async () => {
    try {
      const values = await ruleForm.validateFields();
      setSubmitting(true);
      const typeOption = alertTypeOptions.find((t) => t.value === values.type);
      const payload = {
        ...values,
        typeLabel: typeOption?.label || values.type,
      };

      if (editingRule) {
        await alertingAPI.updateAlertRule(editingRule.id, payload);
        message.success('规则更新成功');
      } else {
        await alertingAPI.createAlertRule(payload);
        message.success('规则创建成功');
      }
      setRuleModalVisible(false);
      await loadData();
    } catch (err: any) {
      if (err?.response) {
        const msg = err?.response?.data?.error?.message || err?.message || '操作失败';
        message.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await alertingAPI.deleteAlertRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      message.success('规则已删除');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '删除失败';
      message.error(msg);
    }
  };

  const handleToggleRule = async (id: string, checked: boolean) => {
    try {
      await alertingAPI.toggleAlertRule(id, checked);
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled: checked } : r))
      );
      message.success(checked ? '规则已启用' : '规则已禁用');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '操作失败';
      message.error(msg);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await alertingAPI.acknowledgeAlert(id);
      setHistory((prev) =>
        prev.map((h) => (h.id === id ? { ...h, acknowledged: true } : h))
      );
      message.success('告警已确认');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '确认失败';
      message.error(msg);
    }
  };

  const ruleColumns = [
    { title: '规则名称', dataIndex: 'name', key: 'name', render: (text: string) => <Text strong>{text}</Text> },
    {
      title: '类型', dataIndex: 'type', key: 'type',
      render: (type: string) => {
        const opt = alertTypeOptions.find((o) => o.value === type);
        return <Tag color={opt?.color} icon={opt?.icon}>{opt?.label}</Tag>;
      },
    },
    {
      title: '阈值', dataIndex: 'threshold', key: 'threshold',
      render: (threshold: number, record: any) => {
        const unitMap: Record<string, string> = {
          ranking_drop: '位', traffic_drop: '%', backlink_loss: '个', crawl_error: '次', downtime: '次',
        };
        return <Text>{threshold} {unitMap[record.type] || ''}</Text>;
      },
    },
    {
      title: '通知渠道', dataIndex: 'channel', key: 'channel',
      render: (channels: string[]) => (
        <Space>
          {channels.map((ch) => {
            const opt = channelOptions.find((o) => o.value === ch);
            return <Tag key={ch}>{opt?.label || ch}</Tag>;
          })}
        </Space>
      ),
    },
    {
      title: '状态', dataIndex: 'enabled', key: 'enabled',
      render: (enabled: boolean, record: any) => (
        <Switch checked={enabled} onChange={(checked) => handleToggleRule(record.id, checked)} size="small" />
      ),
    },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', render: (date: string) => dayjs(date).format('YYYY-MM-DD') },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditRule(record)}>编辑</Button>
          <Popconfirm title="确定删除此规则？" onConfirm={() => handleDeleteRule(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const historyTimelineItems = history.map((item) => {
    const config = severityConfig[item.severity];
    return {
      color: config.color,
      dot: config.icon,
      children: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Tag color={config.color}>{item.severity === 'critical' ? '严重' : item.severity === 'warning' ? '警告' : '信息'}</Tag>
              <Text strong>{item.ruleName}</Text>
              <Text type="secondary">- {item.projectName}</Text>
            </div>
            <Text style={{ color: '#595959' }}>{item.message}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
          </div>
          {!item.acknowledged && (
            <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleAcknowledge(item.id)}>
              确认
            </Button>
          )}
          {item.acknowledged && <Tag color="success">已确认</Tag>}
        </div>
      ),
    };
  });

  // ---- 渲染 ----

  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader
          title="告警中心"
          subtitle="监控告警规则管理与历史记录"
        />
        <Empty description="请先选择一个项目" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="告警中心"
          subtitle="监控告警规则管理与历史记录"
        />
        <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <PageHeader
          title="告警中心"
          subtitle="监控告警规则管理与历史记录"
          actions={[
            { label: '重试', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          ]}
        />
        <Alert type="error" message="加载失败" description={error} showIcon />
      </div>
    );
  }

  const unacknowledgedCount = summary?.unacknowledged ?? history.filter((h) => !h.acknowledged).length;
  const criticalCount = summary?.critical ?? history.filter((h) => h.severity === 'critical' && !h.acknowledged).length;

  return (
    <div className="page-container">
      <PageHeader
        title="告警中心"
        subtitle="监控告警规则管理与历史记录"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          { label: '新增规则', type: 'primary', icon: <PlusOutlined />, onClick: handleAddRule },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="未处理告警" value={unacknowledgedCount} prefix={<Badge status="error" />} valueStyle={{ color: unacknowledgedCount > 0 ? '#ff4d4f' : '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="严重告警" value={criticalCount} prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />} valueStyle={{ color: criticalCount > 0 ? '#ff4d4f' : '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="活跃规则" value={rules.filter((r) => r.enabled).length} suffix={`/ ${rules.length}`} prefix={<BellOutlined style={{ color: '#1677ff' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="今日告警" value={history.filter((h) => dayjs(h.createdAt).isSame(dayjs(), 'day')).length} prefix={<WarningOutlined style={{ color: '#faad14' }} />} />
          </Card>
        </Col>
      </Row>

      <Card title="告警规则" style={{ marginBottom: 24 }} extra={<Text type="secondary">共 {rules.length} 条规则</Text>}>
        {rules.length === 0 ? (
          <Empty description="暂无告警规则，点击「新增规则」开始创建" />
        ) : (
          <Table columns={ruleColumns} dataSource={rules} rowKey="id" pagination={{ pageSize: 10 }} size="middle" />
        )}
      </Card>

      <Card title="告警历史" extra={<Text type="secondary">最近 {history.length} 条记录</Text>}>
        {history.length === 0 ? (
          <Empty description="暂无告警历史" />
        ) : (
          <Timeline items={historyTimelineItems} />
        )}
      </Card>

      <Modal
        title={editingRule ? '编辑告警规则' : '新增告警规则'}
        open={ruleModalVisible}
        onCancel={() => setRuleModalVisible(false)}
        onOk={handleRuleSubmit}
        confirmLoading={submitting}
        width={600}
        destroyOnClose
      >
        <Form form={ruleForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="规则名称" rules={[{ required: true, message: '请输入规则名称' }]}>
            <Input placeholder="例如：主站排名骤降监控" />
          </Form.Item>
          <Form.Item name="type" label="告警类型" rules={[{ required: true, message: '请选择告警类型' }]}>
            <Select placeholder="选择告警类型">
              {alertTypeOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  <Space>{opt.icon} {opt.label}</Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="threshold" label="阈值" rules={[{ required: true, message: '请输入阈值' }]}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} placeholder="触发告警的阈值" />
          </Form.Item>
          <Form.Item name="channel" label="通知渠道" rules={[{ required: true, message: '请选择通知渠道' }]}>
            <Select mode="multiple" placeholder="选择通知渠道">
              {channelOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="enabled" label="启用状态" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Alerting;