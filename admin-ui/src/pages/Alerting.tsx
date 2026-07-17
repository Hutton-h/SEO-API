import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Select, Input, InputNumber, Switch,
  Tag, Badge, Timeline, Space, Typography, message, Row, Col, Statistic, Popconfirm,
} from 'antd';
import {
  PlusOutlined, BellOutlined, DeleteOutlined, EditOutlined,
  CheckCircleOutlined, WarningOutlined, CloseCircleOutlined,
  ExclamationCircleOutlined, InfoCircleOutlined, ReloadOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';
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

const mockRules = [
  { id: '1', name: '主站排名骤降', type: 'ranking_drop', typeLabel: '排名骤降', threshold: 10, channel: ['email', 'feishu'], enabled: true, createdAt: '2024-06-01', updatedAt: '2024-07-10' },
  { id: '2', name: '流量暴跌预警', type: 'traffic_drop', typeLabel: '流量暴跌', threshold: 20, channel: ['email'], enabled: true, createdAt: '2024-06-15', updatedAt: '2024-07-12' },
  { id: '3', name: '外链丢失检测', type: 'backlink_loss', typeLabel: '外链丢失', threshold: 5, channel: ['slack'], enabled: false, createdAt: '2024-07-01', updatedAt: '2024-07-01' },
  { id: '4', name: '爬虫异常监控', type: 'crawl_error', typeLabel: '爬虫异常', threshold: 3, channel: ['dingtalk'], enabled: true, createdAt: '2024-07-05', updatedAt: '2024-07-14' },
  { id: '5', name: '网站宕机检测', type: 'downtime', typeLabel: '宕机', threshold: 1, channel: ['email', 'sms'], enabled: true, createdAt: '2024-07-10', updatedAt: '2024-07-15' },
];

const mockHistory = [
  { id: 'h1', ruleId: '1', ruleName: '主站排名骤降', severity: 'critical' as const, severityColor: '#ff4d4f', message: '关键词"SEO优化"排名从第3位降至第15位，超过阈值', projectName: '主站优化', acknowledged: false, createdAt: '2024-07-15T09:30:00' },
  { id: 'h2', ruleId: '2', ruleName: '流量暴跌预警', severity: 'warning' as const, severityColor: '#faad14', message: '当日流量下降25%，超过20%阈值', projectName: '电商平台', acknowledged: false, createdAt: '2024-07-15T08:15:00' },
  { id: 'h3', ruleId: '5', ruleName: '网站宕机检测', severity: 'critical' as const, severityColor: '#ff4d4f', message: '主站响应超时，可能已宕机', projectName: '主站优化', acknowledged: true, createdAt: '2024-07-14T22:00:00' },
  { id: 'h4', ruleId: '4', ruleName: '爬虫异常监控', severity: 'warning' as const, severityColor: '#faad14', message: '爬虫返回5次503错误，超过3次阈值', projectName: '博客站', acknowledged: true, createdAt: '2024-07-14T15:30:00' },
  { id: 'h5', ruleId: '3', ruleName: '外链丢失检测', severity: 'info' as const, severityColor: '#1677ff', message: '检测到3个外链被移除', projectName: '企业官网', acknowledged: false, createdAt: '2024-07-14T10:00:00' },
  { id: 'h6', ruleId: '1', ruleName: '主站排名骤降', severity: 'warning' as const, severityColor: '#faad14', message: '关键词"SEO服务"排名从第5位降至第12位', projectName: '主站优化', acknowledged: true, createdAt: '2024-07-13T14:20:00' },
];

const Alerting: React.FC = () => {
  const [rules, setRules] = useState(mockRules);
  const [history, setHistory] = useState(mockHistory);
  const [ruleModalVisible, setRuleModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [ruleForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const unacknowledgedCount = history.filter((h) => !h.acknowledged).length;
  const criticalCount = history.filter((h) => h.severity === 'critical' && !h.acknowledged).length;

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
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

  const handleRuleSubmit = () => {
    ruleForm.validateFields().then((values) => {
      const typeOption = alertTypeOptions.find((t) => t.value === values.type);
      if (editingRule) {
        setRules((prev) =>
          prev.map((r) =>
            r.id === editingRule.id
              ? { ...r, ...values, typeLabel: typeOption?.label || values.type, updatedAt: dayjs().format('YYYY-MM-DD') }
              : r
          )
        );
        message.success('规则更新成功');
      } else {
        const newRule = {
          id: Date.now().toString(),
          ...values,
          typeLabel: typeOption?.label || values.type,
          createdAt: dayjs().format('YYYY-MM-DD'),
          updatedAt: dayjs().format('YYYY-MM-DD'),
        };
        setRules((prev) => [newRule, ...prev]);
        message.success('规则创建成功');
      }
      setRuleModalVisible(false);
    });
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    message.success('规则已删除');
  };

  const handleToggleRule = (id: string, checked: boolean) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: checked } : r))
    );
    message.success(checked ? '规则已启用' : '规则已禁用');
  };

  const handleAcknowledge = (id: string) => {
    setHistory((prev) =>
      prev.map((h) => (h.id === id ? { ...h, acknowledged: true } : h))
    );
    message.success('告警已确认');
  };

  const severityConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    critical: { color: '#ff4d4f', icon: <CloseCircleOutlined /> },
    warning: { color: '#faad14', icon: <WarningOutlined /> },
    info: { color: '#1677ff', icon: <InfoCircleOutlined /> },
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
            <Statistic title="未处理告警" value={unacknowledgedCount} prefix={<Badge status="error" />} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="严重告警" value={criticalCount} prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />} valueStyle={{ color: '#ff4d4f' }} />
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
        <Table columns={ruleColumns} dataSource={rules} rowKey="id" pagination={{ pageSize: 10 }} size="middle" />
      </Card>

      <Card title="告警历史" extra={<Text type="secondary">最近 {history.length} 条记录</Text>}>
        <Timeline items={historyTimelineItems} />
      </Card>

      <Modal
        title={editingRule ? '编辑告警规则' : '新增告警规则'}
        open={ruleModalVisible}
        onCancel={() => setRuleModalVisible(false)}
        onOk={handleRuleSubmit}
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