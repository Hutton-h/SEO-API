import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Button, Modal, Form, Select, Input, Switch, Space,
  Typography, message, Popconfirm, Tabs, Tag, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  PlayCircleOutlined, PauseCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ClockCircleOutlined, ScheduleOutlined,
  HistoryOutlined, SettingOutlined, SyncOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from '@/components/common';
import { useStore } from '@/store';
import { useProject } from '@/hooks';
import { scheduleAPI } from '@/services/schedule';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ============================================================================
// Types
// ============================================================================

interface ScheduleItem {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  cronExpression: string;
  status: 'active' | 'paused' | 'error';
  lastRunAt: string | null;
  lastRunStatus: 'success' | 'failed' | null;
  nextRunAt: string | null;
  config?: string;
  createdAt: string;
}

interface ExecutionLog {
  id: string;
  scheduleName: string;
  scheduleId: string;
  status: 'success' | 'failed' | 'running';
  startedAt: string;
  completedAt: string | null;
  duration: number;
  result: string;
}

// ============================================================================
// Constants
// ============================================================================

const TASK_TYPES = [
  { value: 'keyword_refresh', label: '关键词刷新', color: '#1677ff' },
  { value: 'ranking_check', label: '排名检测', color: '#52c41a' },
  { value: 'crawl', label: '网站爬取', color: '#fa8c16' },
  { value: 'sitemap', label: '站点地图', color: '#13c2c2' },
  { value: 'report', label: '报告生成', color: '#722ed1' },
  { value: 'backlink_refresh', label: '外链刷新', color: '#eb2f96' },
  { value: 'competitor_check', label: '竞品检测', color: '#ff4d4f' },
];

const CRON_PRESETS = [
  { label: '每天 0:00', value: '0 0 * * *', group: 'daily' },
  { label: '每天 8:00', value: '0 8 * * *', group: 'daily' },
  { label: '每天 18:00', value: '0 18 * * *', group: 'daily' },
  { label: '每周一 8:00', value: '0 8 * * 1', group: 'weekly' },
  { label: '每周五 18:00', value: '0 18 * * 5', group: 'weekly' },
  { label: '每月1日 8:00', value: '0 8 1 * *', group: 'monthly' },
  { label: '每6小时', value: '0 */6 * * *', group: 'custom' },
  { label: '每30分钟', value: '*/30 * * * *', group: 'custom' },
];

// ============================================================================
// Component
// ============================================================================

const Schedule: React.FC = () => {
  const { projectId, hasProject } = useProject();
  const { currentProject } = useStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('schedules');

  // Schedules
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [runningId, setRunningId] = useState<string | null>(null);

  // Execution logs
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // ==========================================================================
  // Data loading
  // ==========================================================================

  const loadSchedules = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await scheduleAPI.getTasks({ projectId });
      const data = Array.isArray(res) ? res : (res?.data || []);
      setSchedules(data);
    } catch (err: any) {
      const msg = err?.message || '加载定时任务失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadLogs = useCallback(async () => {
    if (!projectId) return;
    setLogsLoading(true);
    try {
      const res: any = await scheduleAPI.getTasks({ projectId });
      const data = Array.isArray(res) ? res : (res?.data || []);
      setLogs(data);
    } catch {
      // logs are optional
    } finally {
      setLogsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    loadSchedules();
    loadLogs();
  }, [projectId, loadSchedules, loadLogs]);

  // ==========================================================================
  // CRUD handlers
  // ==========================================================================

  const handleAdd = () => {
    setEditingSchedule(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active' });
    setModalOpen(true);
  };

  const handleEdit = (record: ScheduleItem) => {
    setEditingSchedule(record);
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      cronExpression: record.cronExpression,
      config: record.config || '',
      status: record.status === 'active',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const typeOption = TASK_TYPES.find((t) => t.value === values.type);
      const payload = {
        name: values.name,
        type: values.type,
        typeLabel: typeOption?.label || values.type,
        cronExpression: values.cronExpression,
        status: (values.status ? 'active' : 'paused') as 'active' | 'paused',
        projectId: projectId!,
        projectName: currentProject?.name || '',
      };

      if (editingSchedule) {
        await scheduleAPI.updateTask(editingSchedule.id, payload);
        message.success('任务已更新');
      } else {
        await scheduleAPI.createTask(payload);
        message.success('任务创建成功');
      }
      setModalOpen(false);
      await loadSchedules();
    } catch (err: any) {
      if (err?.errorFields) return;
      const msg = err?.message || '操作失败';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await scheduleAPI.deleteTask(id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      message.success('任务已删除');
    } catch (err: any) {
      const msg = err?.message || '删除失败';
      message.error(msg);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await scheduleAPI.toggleTask(id, enabled);
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: enabled ? 'active' : 'paused' } : s
        )
      );
      message.success(enabled ? '任务已启用' : '任务已暂停');
    } catch (err: any) {
      const msg = err?.message || '操作失败';
      message.error(msg);
    }
  };

  const handleRunNow = async (id: string) => {
    setRunningId(id);
    try {
      await scheduleAPI.runTaskNow(id);
      message.success('任务已触发执行');
      await loadSchedules();
      await loadLogs();
    } catch (err: any) {
      const msg = err?.message || '执行失败';
      message.error(msg);
    } finally {
      setRunningId(null);
    }
  };

  // ==========================================================================
  // Table columns
  // ==========================================================================

  const scheduleColumns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const opt = TASK_TYPES.find((t) => t.value === type);
        return <Tag color={opt?.color}>{opt?.label || type}</Tag>;
      },
    },
    {
      title: 'Cron 表达式',
      dataIndex: 'cronExpression',
      key: 'cronExpression',
      width: 140,
      render: (cron: string) => (
        <Tooltip title={cron}>
          <Tag color="geekblue" style={{ fontFamily: 'monospace', fontSize: 12 }}>
            {cron}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: ScheduleItem) => (
        <Switch
          checked={status === 'active'}
          onChange={(checked) => handleToggle(record.id, checked)}
          checkedChildren="启用"
          unCheckedChildren="暂停"
          size="small"
        />
      ),
    },
    {
      title: '上次运行',
      dataIndex: 'lastRunAt',
      key: 'lastRunAt',
      width: 150,
      render: (date: string | null, record: ScheduleItem) => (
        <Space size={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {date ? dayjs(date).format('MM-DD HH:mm') : '-'}
          </Text>
          {record.lastRunStatus === 'success' && (
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
          )}
          {record.lastRunStatus === 'failed' && (
            <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />
          )}
        </Space>
      ),
    },
    {
      title: '下次运行',
      dataIndex: 'nextRunAt',
      key: 'nextRunAt',
      width: 150,
      render: (date: string | null) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {date ? dayjs(date).format('MM-DD HH:mm') : '-'}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: ScheduleItem) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
            loading={runningId === record.id}
            onClick={() => handleRunNow(record.id)}
          >
            运行
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此任务？"
            onConfirm={() => handleDelete(record.id)}
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

  const logColumns = [
    {
      title: '任务名称',
      dataIndex: 'scheduleName',
      key: 'scheduleName',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; status: 'success' | 'error' | 'pending' }> = {
          success: { text: '成功', status: 'success' },
          failed: { text: '失败', status: 'error' },
          running: { text: '运行中', status: 'pending' },
        };
        const info = statusMap[status] || { text: status, status: 'pending' as const };
        return <StatusBadge status={info.status} text={info.text} />;
      },
    },
    {
      title: '开始时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 160,
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'}
        </Text>
      ),
    },
    {
      title: '完成时间',
      dataIndex: 'completedAt',
      key: 'completedAt',
      width: 160,
      render: (text: string | null) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'}
        </Text>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 80,
      render: (duration: number) => {
        if (duration == null) return '-';
        const seconds = Math.round(duration / 1000);
        if (seconds < 60) return `${seconds}s`;
        return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
      },
    },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      ellipsis: true,
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {text || '-'}
        </Text>
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
          title="定时任务"
          subtitle="管理自动化定时任务调度"
        />
        <EmptyState
          scene="data"
          title="请选择一个项目"
          description="选择一个项目后即可管理定时任务"
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
          title="定时任务"
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
          title="定时任务"
          subtitle={`项目: ${currentProject?.name || ''}`}
        />
        <ErrorState
          message={error}
          onRetry={loadSchedules}
        />
      </div>
    );
  }

  // ==========================================================================
  // Render: Main
  // ==========================================================================

  const activeCount = schedules.filter((s) => s.status === 'active').length;
  const pausedCount = schedules.filter((s) => s.status === 'paused').length;
  const lastRun = schedules
    .filter((s) => s.lastRunAt)
    .sort((a, b) => (dayjs(b.lastRunAt).isAfter(dayjs(a.lastRunAt)) ? 1 : -1))[0];
  const nextRun = schedules
    .filter((s) => s.nextRunAt)
    .sort((a, b) => (dayjs(a.nextRunAt).isAfter(dayjs(b.nextRunAt)) ? 1 : -1))[0];

  return (
    <div className="page-container">
      <PageHeader
        title="定时任务"
        subtitle={`项目: ${currentProject?.name || ''} - 自动化定时任务调度`}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadSchedules}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新建任务
            </Button>
          </Space>
        }
      />

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="任务总数"
            value={schedules.length}
            icon={<ScheduleOutlined />}
            color="#1677ff"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="活跃任务"
            value={activeCount}
            icon={<CheckCircleOutlined />}
            color="#52c41a"
            subtitle={`${schedules.length > 0 ? Math.round((activeCount / schedules.length) * 100) : 0}%`}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="上次运行"
            value={lastRun ? dayjs(lastRun.lastRunAt).format('MM-DD HH:mm') : '-'}
            icon={<ClockCircleOutlined />}
            color="#fa8c16"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="下次运行"
            value={nextRun ? dayjs(nextRun.nextRunAt).format('MM-DD HH:mm') : '-'}
            icon={<SyncOutlined />}
            color="#13c2c2"
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
              key: 'schedules',
              label: (
                <span>
                  <ScheduleOutlined /> 定时任务
                </span>
              ),
              children: (
                <div style={{ marginTop: 8 }}>
                  {schedules.length === 0 ? (
                    <EmptyState
                      scene="schedule"
                      title="暂无定时任务"
                      description="创建第一个定时任务，自动执行 SEO 工作"
                      action={{
                        text: '新建任务',
                        onClick: handleAdd,
                        icon: <PlusOutlined />,
                      }}
                    />
                  ) : (
                    <Table
                      columns={scheduleColumns}
                      dataSource={schedules}
                      rowKey="id"
                      pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 个任务` }}
                      size="middle"
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'logs',
              label: (
                <span>
                  <HistoryOutlined /> 执行日志
                </span>
              ),
              children: (
                <div style={{ marginTop: 8 }}>
                  {logs.length === 0 ? (
                    <EmptyState
                      scene="data"
                      title="暂无执行日志"
                      description="任务执行后将在此显示日志"
                    />
                  ) : (
                    <Table
                      columns={logColumns}
                      dataSource={logs}
                      rowKey="id"
                      loading={logsLoading}
                      pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条日志` }}
                      size="middle"
                    />
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        title={editingSchedule ? '编辑定时任务' : '新建定时任务'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText={editingSchedule ? '保存' : '创建'}
        cancelText="取消"
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="例如：每日关键词排名检测" />
          </Form.Item>

          <Form.Item
            name="type"
            label="任务类型"
            rules={[{ required: true, message: '请选择任务类型' }]}
          >
            <Select placeholder="选择任务类型">
              {TASK_TYPES.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  <Space>
                    <Tag color={opt.color}>{opt.label}</Tag>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="cronExpression"
            label="Cron 表达式"
            rules={[{ required: true, message: '请输入或选择 Cron 表达式' }]}
          >
            <Input
              placeholder="0 8 * * *"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item label="快速选择">
            <Space wrap>
              {CRON_PRESETS.map((preset) => (
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

          <Form.Item name="config" label="配置参数（可选）">
            <TextArea
              rows={3}
              placeholder='JSON 格式配置，例如 {"target": "keyword1,keyword2"}'
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="启用状态"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch checkedChildren="启用" unCheckedChildren="暂停" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Schedule;