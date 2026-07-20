import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Button, Tabs, Form, Select, Space, Typography,
  message, Popconfirm, Tag, Input, DatePicker, TimePicker, Modal,
} from 'antd';
import {
  ReloadOutlined, ThunderboltOutlined, DownloadOutlined, DeleteOutlined,
  FileTextOutlined, ScheduleOutlined, HistoryOutlined, FilePdfOutlined,
  FileExcelOutlined, FileOutlined, ClockCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined, PlusOutlined, SendOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from '@/components/common';
import { useStore } from '@/store';
import { useProject } from '@/hooks';
import { reportAPI } from '@/services/report';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// ============================================================================
// Types
// ============================================================================

interface ReportItem {
  id: string;
  name: string;
  type: string;
  format: string;
  status: 'completed' | 'generating' | 'failed';
  createdAt: string;
  downloadUrl?: string;
}

interface ScheduleItem {
  id: string;
  type: string;
  frequency: string;
  recipients: string;
  format: string;
  status: 'active' | 'paused';
  nextRunAt: string;
  createdAt: string;
}

// ============================================================================
// Constants
// ============================================================================

const REPORT_TYPES = [
  { value: 'comprehensive', label: '综合报告' },
  { value: 'keyword', label: '关键词报告' },
  { value: 'ranking', label: '排名报告' },
  { value: 'backlink', label: '外链报告' },
  { value: 'competitor', label: '竞品报告' },
  { value: 'audit', label: '审计报告' },
];

const REPORT_FORMATS = [
  { value: 'pdf', label: 'PDF', icon: <FilePdfOutlined /> },
  { value: 'html', label: 'HTML', icon: <FileOutlined /> },
  { value: 'csv', label: 'CSV', icon: <FileExcelOutlined /> },
];

const FREQUENCIES = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
];

// ============================================================================
// Component
// ============================================================================

const Report: React.FC = () => {
  const { projectId, hasProject } = useProject();
  const { currentProject } = useStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('generate');
  const [generating, setGenerating] = useState(false);

  // Report history
  const [reports, setReports] = useState<ReportItem[]>([]);

  // Scheduled reports
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleForm] = Form.useForm();

  // Generate form
  const [generateForm] = Form.useForm();

  // ==========================================================================
  // Data loading
  // ==========================================================================

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await reportAPI.getReport(projectId);
      const data = Array.isArray(res) ? res : (res?.data || []);
      setReports(data);
    } catch (err: any) {
      const msg = err?.message || '加载报告列表失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadSchedules = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await reportAPI.getReport(projectId);
      const data = Array.isArray(res) ? res : (res?.data || []);
      setSchedules(data);
    } catch {
      // schedules are optional, silently fail
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    loadData();
    loadSchedules();
  }, [projectId, loadData, loadSchedules]);

  // ==========================================================================
  // Generate report
  // ==========================================================================

  const handleGenerate = async () => {
    try {
      const values = await generateForm.validateFields();
      setGenerating(true);
      await reportAPI.generateReport(projectId!);
      message.success('报告生成任务已提交');
      generateForm.resetFields();
      await loadData();
    } catch (err: any) {
      if (err?.errorFields) return;
      const msg = err?.message || '生成报告失败';
      message.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  // ==========================================================================
  // Download / Delete report
  // ==========================================================================

  const handleDownload = async (id: string) => {
    try {
      await reportAPI.exportPDF(id);
      message.success('报告下载中');
    } catch (err: any) {
      const msg = err?.message || '下载失败';
      message.error(msg);
    }
  };

  const handleDeleteReport = async (id: string) => {
    try {
      await reportAPI.generateReport(projectId!);
      message.success('报告已删除');
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      const msg = err?.message || '删除失败';
      message.error(msg);
    }
  };

  // ==========================================================================
  // Schedule
  // ==========================================================================

  const handleCreateSchedule = async () => {
    try {
      const values = await scheduleForm.validateFields();
      setScheduleSaving(true);
      await reportAPI.generateReport(projectId!);
      message.success('定时报告已创建');
      setScheduleModalOpen(false);
      scheduleForm.resetFields();
      await loadSchedules();
    } catch (err: any) {
      if (err?.errorFields) return;
      const msg = err?.message || '创建失败';
      message.error(msg);
    } finally {
      setScheduleSaving(false);
    }
  };

  // ==========================================================================
  // Table columns
  // ==========================================================================

  const historyColumns = [
    {
      title: '报告名称',
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
        const opt = REPORT_TYPES.find((t) => t.value === type);
        return <Tag>{opt?.label || type}</Tag>;
      },
    },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      width: 80,
      render: (fmt: string) => {
        const opt = REPORT_FORMATS.find((f) => f.value === fmt);
        return (
          <Space size={4}>
            {opt?.icon}
            <Text>{opt?.label || fmt?.toUpperCase()}</Text>
          </Space>
        );
      },
    },
    {
      title: '生成时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; status: 'success' | 'pending' | 'error' }> = {
          completed: { text: '已完成', status: 'success' },
          generating: { text: '生成中', status: 'pending' },
          failed: { text: '失败', status: 'error' },
        };
        const info = statusMap[status] || { text: status, status: 'pending' as const };
        return <StatusBadge status={info.status} text={info.text} />;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_: unknown, record: ReportItem) => (
        <Space size="small">
          {record.status === 'completed' && (
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record.id)}
            >
              下载
            </Button>
          )}
          <Popconfirm
            title="确定删除此报告？"
            onConfirm={() => handleDeleteReport(record.id)}
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

  const scheduleColumns = [
    {
      title: '报告类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const opt = REPORT_TYPES.find((t) => t.value === type);
        return <Tag color="blue">{opt?.label || type}</Tag>;
      },
    },
    {
      title: '频率',
      dataIndex: 'frequency',
      key: 'frequency',
      width: 80,
      render: (freq: string) => {
        const opt = FREQUENCIES.find((f) => f.value === freq);
        return <Text>{opt?.label || freq}</Text>;
      },
    },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      width: 80,
      render: (fmt: string) => {
        const opt = REPORT_FORMATS.find((f) => f.value === fmt);
        return <Text>{opt?.label || fmt?.toUpperCase()}</Text>;
      },
    },
    {
      title: '收件人',
      dataIndex: 'recipients',
      key: 'recipients',
      ellipsis: true,
      render: (text: string) => <Text type="secondary">{text || '-'}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; status: 'active' | 'paused' }> = {
          active: { text: '运行中', status: 'active' },
          paused: { text: '已暂停', status: 'paused' },
        };
        const info = statusMap[status] || { text: status, status: 'paused' as const };
        return <StatusBadge status={info.status} text={info.text} />;
      },
    },
    {
      title: '下次运行',
      dataIndex: 'nextRunAt',
      key: 'nextRunAt',
      width: 160,
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'}
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
          title="SEO 报告"
          subtitle="生成和管理 SEO 分析报告"
        />
        <EmptyState
          scene="data"
          title="请选择一个项目"
          description="选择一个项目后即可生成 SEO 报告"
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
          title="SEO 报告"
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
          title="SEO 报告"
          subtitle={`项目: ${currentProject?.name || ''}`}
        />
        <ErrorState
          message={error}
          onRetry={loadData}
        />
      </div>
    );
  }

  // ==========================================================================
  // Render: Main
  // ==========================================================================

  const completedReports = reports.filter((r) => r.status === 'completed').length;
  const activeSchedules = schedules.filter((s) => s.status === 'active').length;
  const lastReport = reports.length > 0
    ? dayjs(reports[0].createdAt).format('YYYY-MM-DD HH:mm')
    : '-';
  const downloadCount = reports.filter((r) => r.status === 'completed').length;

  return (
    <div className="page-container">
      <PageHeader
        title="SEO 报告"
        subtitle={`项目: ${currentProject?.name || ''} - 报告生成与定时调度`}
        actions={
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新
          </Button>
        }
      />

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="已生成报告"
            value={reports.length}
            icon={<FileTextOutlined />}
            color="#1677ff"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="定时报告"
            value={activeSchedules}
            icon={<ScheduleOutlined />}
            color="#52c41a"
            subtitle={`共 ${schedules.length} 个`}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="最近生成"
            value={lastReport}
            icon={<ClockCircleOutlined />}
            color="#fa8c16"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="可下载"
            value={downloadCount}
            icon={<DownloadOutlined />}
            color="#13c2c2"
            subtitle="已完成报告"
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
              key: 'generate',
              label: (
                <span>
                  <ThunderboltOutlined /> 生成报告
                </span>
              ),
              children: (
                <div style={{ padding: '16px 0', maxWidth: 600 }}>
                  <Form
                    form={generateForm}
                    layout="vertical"
                    initialValues={{ type: 'comprehensive', format: 'pdf' }}
                  >
                    <Form.Item
                      name="type"
                      label="报告类型"
                      rules={[{ required: true, message: '请选择报告类型' }]}
                    >
                      <Select placeholder="选择报告类型">
                        {REPORT_TYPES.map((t) => (
                          <Option key={t.value} value={t.value}>
                            {t.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item name="dateRange" label="时间范围（可选）">
                      <RangePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                      name="format"
                      label="输出格式"
                      rules={[{ required: true, message: '请选择输出格式' }]}
                    >
                      <Select placeholder="选择格式">
                        {REPORT_FORMATS.map((f) => (
                          <Option key={f.value} value={f.value}>
                            <Space>{f.icon} {f.label}</Space>
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        size="large"
                        icon={<ThunderboltOutlined />}
                        loading={generating}
                        onClick={handleGenerate}
                        block
                      >
                        生成报告
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              ),
            },
            {
              key: 'history',
              label: (
                <span>
                  <HistoryOutlined /> 报告历史
                </span>
              ),
              children: (
                <div style={{ marginTop: 8 }}>
                  {reports.length === 0 ? (
                    <EmptyState
                      scene="document"
                      title="暂无报告"
                      description="生成您的第一份 SEO 报告"
                      action={{
                        text: '生成报告',
                        onClick: () => setActiveTab('generate'),
                        icon: <ThunderboltOutlined />,
                      }}
                    />
                  ) : (
                    <Table
                      columns={historyColumns}
                      dataSource={reports}
                      rowKey="id"
                      pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 份报告` }}
                      size="middle"
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'schedules',
              label: (
                <span>
                  <ScheduleOutlined /> 定时报告
                </span>
              ),
              children: (
                <div style={{ marginTop: 8 }}>
                  <div style={{ marginBottom: 16, textAlign: 'right' }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        scheduleForm.resetFields();
                        setScheduleModalOpen(true);
                      }}
                    >
                      创建定时报告
                    </Button>
                  </div>
                  {schedules.length === 0 ? (
                    <EmptyState
                      scene="schedule"
                      title="暂无定时报告"
                      description="创建定时报告，自动发送到指定邮箱"
                      action={{
                        text: '创建定时报告',
                        onClick: () => setScheduleModalOpen(true),
                        icon: <PlusOutlined />,
                      }}
                    />
                  ) : (
                    <Table
                      columns={scheduleColumns}
                      dataSource={schedules}
                      rowKey="id"
                      pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 个定时任务` }}
                      size="middle"
                    />
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Schedule Modal */}
      <Modal
        title="创建定时报告"
        open={scheduleModalOpen}
        onOk={handleCreateSchedule}
        onCancel={() => setScheduleModalOpen(false)}
        confirmLoading={scheduleSaving}
        okText="创建"
        cancelText="取消"
        width={520}
        destroyOnClose
      >
        <Form
          form={scheduleForm}
          layout="vertical"
          style={{ marginTop: 16 }}
          initialValues={{ type: 'comprehensive', frequency: 'weekly', format: 'pdf' }}
        >
          <Form.Item
            name="type"
            label="报告类型"
            rules={[{ required: true, message: '请选择报告类型' }]}
          >
            <Select placeholder="选择报告类型">
              {REPORT_TYPES.map((t) => (
                <Option key={t.value} value={t.value}>
                  {t.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="frequency"
            label="发送频率"
            rules={[{ required: true, message: '请选择发送频率' }]}
          >
            <Select placeholder="选择频率">
              {FREQUENCIES.map((f) => (
                <Option key={f.value} value={f.value}>
                  {f.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="recipients"
            label="收件人邮箱"
            rules={[{ required: true, message: '请输入收件人邮箱' }]}
            extra="多个邮箱用逗号分隔"
          >
            <Input placeholder="user@example.com, admin@example.com" />
          </Form.Item>

          <Form.Item
            name="format"
            label="输出格式"
            rules={[{ required: true, message: '请选择格式' }]}
          >
            <Select placeholder="选择格式">
              {REPORT_FORMATS.map((f) => (
                <Option key={f.value} value={f.value}>
                  <Space>{f.icon} {f.label}</Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Report;