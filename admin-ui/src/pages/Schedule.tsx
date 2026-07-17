import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Modal, Form, Select, Input, Switch, Tag, Space,
  Typography, message, Popconfirm, Tooltip, Row, Col, Statistic, Spin, Empty, Alert,
} from 'antd';
import {
  PlusOutlined, PlayCircleOutlined, PauseCircleOutlined, DeleteOutlined,
  EditOutlined, ReloadOutlined, ClockCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined, SyncOutlined, ScheduleOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { scheduleAPI, ScheduledTask } from '@/services/schedule';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Option } = Select;

const taskTypeOptions = [
  { value: 'crawler', label: '爬虫任务', color: '#1677ff' },
  { value: 'ranking', label: '排名检测', color: '#52c41a' },
  { value: 'backlink', label: '外链检查', color: '#fa8c16' },
  { value: 'weekly_report', label: '周报生成', color: '#722ed1' },
  { value: 'competitor_check', label: '竞品检测', color: '#eb2f96' },
  { value: 'downtime_check', label: '宕机检查', color: '#ff4d4f' },
];

const cronPresets = [
  { label: '每小时', value: '0 * * * *' },
  { label: '每6小时', value: '0 */6 * * *' },
  { label: '每天 0:00', value: '0 0 * * *' },
  { label: '每天 8:00', value: '0 8 * * *' },
  { label: '每周一 8:00', value: '0 8 * * 1' },
  { label: '每月1日 8:00', value: '0 8 1 * *' },
  { label: '每30分钟', value: '*/30 * * * *' },
];

const Schedule: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [form] = Form.useForm();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await scheduleAPI.getTasks();
      const result = (res as any).data || res;
      setTasks(Array.isArray(result) ? result : result.data || []);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载任务列表失败';
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
    loadTasks();
  }, [projectId, loadTasks]);

  const handleRefresh = async () => {
    await loadTasks();
  };

  const handleAdd = () => {
    setEditingTask(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active' });
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingTask(record);
    form.setFieldsValue({
      ...record,
      status: record.status === 'active',
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const typeOption = taskTypeOptions.find((t) => t.value === values.type);
      const payload = {
        ...values,
        status: values.status ? 'active' : 'paused',
        typeLabel: typeOption?.label || values.type,
        projectId: projectId || '',
      };

      if (editingTask) {
        await scheduleAPI.updateTask(editingTask.id, payload);
        message.success('任务更新成功');
      } else {
        await scheduleAPI.createTask(payload);
        message.success('任务创建成功');
      }
      setModalVisible(false);
      await loadTasks();
    } catch (err: any) {
      if (err?.response) {
        const msg = err?.response?.data?.error?.message || err?.message || '操作失败';
        message.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await scheduleAPI.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      message.success('任务已删除');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '删除失败';
      message.error(msg);
    }
  };

  const handleToggle = async (id: string, checked: boolean) => {
    try {
      await scheduleAPI.toggleTask(id, checked);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: checked ? 'active' : 'paused' } : t
        )
      );
      message.success(checked ? '任务已启用' : '任务已暂停');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '操作失败';
      message.error(msg);
    }
  };

  const handleRunNow = async (id: string) => {
    setRunningId(id);
    try {
      await scheduleAPI.runTaskNow(id);
      message.success('任务执行完成');
      // 刷新任务列表以更新状态
      await loadTasks();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '执行失败';
      message.error(msg);
    } finally {
      setRunningId(null);
    }
  };

  const columns = [
    { title: '任务名称', dataIndex: 'name', key: 'name', render: (text: string) => <Text strong>{text}</Text> },
    { title: '项目', dataIndex: 'projectName', key: 'projectName' },
    {
      title: '类型', dataIndex: 'type', key: 'type',
      render: (type: string) => {
        const opt = taskTypeOptions.find((o) => o.value === type);
        return <Tag color={opt?.color}>{opt?.label}</Tag>;
      },
    },
    {
      title: 'Cron', dataIndex: 'cronExpression', key: 'cronExpression',
      render: (cron: string) => <Tooltip title={cron}><Tag color="geekblue" style={{ fontFamily: 'monospace' }}>{cron}</Tag></Tooltip>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (status: string, record: any) => (
        <Switch
          checked={status === 'active'}
          onChange={(checked) => handleToggle(record.id, checked)}
          checkedChildren="启用"
          unCheckedChildren="暂停"
        />
      ),
    },
    {
      title: '上次运行', dataIndex: 'lastRunAt', key: 'lastRunAt',
      render: (date: string | null, record: any) => (
        <Space>
          {date ? dayjs(date).format('MM-DD HH:mm') : <Text type="secondary">-</Text>}
          {record.lastRunStatus === 'success' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
          {record.lastRunStatus === 'failed' && <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
        </Space>
      ),
    },
    {
      title: '下次运行', dataIndex: 'nextRunAt', key: 'nextRunAt',
      render: (date: string | null) => date ? dayjs(date).format('MM-DD HH:mm') : <Text type="secondary">-</Text>,
    },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<PlayCircleOutlined />} loading={runningId === record.id} onClick={() => handleRunNow(record.id)}>运行</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除此任务？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ---- 渲染 ----

  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader
          title="定时任务"
          subtitle="管理自动化定时任务调度"
        />
        <Empty description="请先选择一个项目" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="定时任务"
          subtitle="管理自动化定时任务调度"
        />
        <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <PageHeader
          title="定时任务"
          subtitle="管理自动化定时任务调度"
          actions={[
            { label: '重试', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          ]}
        />
        <Alert type="error" message="加载失败" description={error} showIcon />
      </div>
    );
  }

  const activeCount = tasks.filter((t) => t.status === 'active').length;
  const pausedCount = tasks.filter((t) => t.status === 'paused').length;
  const failedCount = tasks.filter((t) => t.lastRunStatus === 'failed').length;

  return (
    <div className="page-container">
      <PageHeader
        title="定时任务"
        subtitle="管理自动化定时任务调度"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          { label: '新增任务', type: 'primary', icon: <PlusOutlined />, onClick: handleAdd },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card><Statistic title="活跃任务" value={activeCount} suffix={`/ ${tasks.length}`} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="暂停任务" value={pausedCount} valueStyle={{ color: '#faad14' }} prefix={<PauseCircleOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="失败任务" value={failedCount} valueStyle={{ color: failedCount > 0 ? '#ff4d4f' : '#52c41a' }} prefix={<CloseCircleOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="今日执行" value={tasks.filter((t) => t.lastRunAt && dayjs(t.lastRunAt).isSame(dayjs(), 'day')).length} prefix={<PlayCircleOutlined style={{ color: '#1677ff' }} />} /></Card>
        </Col>
      </Row>

      <Card title="任务列表">
        {tasks.length === 0 ? (
          <Empty description="暂无定时任务，点击「新增任务」开始创建" />
        ) : (
          <Table columns={columns} dataSource={tasks} rowKey="id" pagination={{ pageSize: 10 }} size="middle" />
        )}
      </Card>

      <Modal
        title={editingTask ? '编辑定时任务' : '新增定时任务'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}>
            <Input placeholder="例如：主站每日爬虫" />
          </Form.Item>
          <Form.Item name="type" label="任务类型" rules={[{ required: true, message: '请选择任务类型' }]}>
            <Select placeholder="选择任务类型">
              {taskTypeOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  <Space><Tag color={opt.color}>{opt.label}</Tag></Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="projectName" label="所属项目">
            <Input placeholder="项目名称" />
          </Form.Item>
          <Form.Item name="cronExpression" label="Cron 表达式" rules={[{ required: true, message: '请输入或选择 Cron 表达式' }]}>
            <Input placeholder="0 8 * * *" style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item label="Cron 表达式辅助">
            <Space wrap>
              {cronPresets.map((preset) => (
                <Button
                  key={preset.value}
                  size="small"
                  onClick={() => form.setFieldValue('cronExpression', preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </Space>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                格式: 分 时 日 月 周 (0-59 0-23 1-31 1-12 0-6)
              </Text>
            </div>
          </Form.Item>
          <Form.Item name="status" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="暂停" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Schedule;