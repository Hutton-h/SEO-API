import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Button, Tag, Typography, Space, Select,
  message, Tabs,
} from 'antd';
import {
  ReloadOutlined, ThunderboltOutlined, SwapOutlined,
  PlusOutlined, FileTextOutlined, DeleteOutlined, EditOutlined,
  ExclamationCircleOutlined, WarningOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from '@/components/common';
import { DistributionChart } from '@/components/charts';
import type { DistributionDataPoint } from '@/components/charts';
import { useStore } from '@/store';
import { useProject } from '@/hooks';
import { competitorChangeAPI } from '@/services/competitorChange';

const { Text } = Typography;

// ============================================================================
// Types
// ============================================================================

interface ChangeItem {
  id: string;
  competitorName: string;
  competitorUrl: string;
  pageUrl: string;
  field: string;
  oldValue: string;
  newValue: string;
  changeType: 'added' | 'modified' | 'removed';
  detectedAt: string;
  projectId: string;
}

interface ChangeDistribution {
  type: string;
  count: number;
}

interface PageData {
  changes: ChangeItem[];
  total: number;
  distribution: ChangeDistribution[];
}

const INITIAL_DATA: PageData = {
  changes: [],
  total: 0,
  distribution: [],
};

// ============================================================================
// Helpers
// ============================================================================

const changeTypeConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  added: { color: '#52c41a', label: '新增', icon: <PlusOutlined /> },
  modified: { color: '#1677ff', label: '修改', icon: <EditOutlined /> },
  removed: { color: '#ff4d4f', label: '删除', icon: <DeleteOutlined /> },
};

const severityConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  high: { color: '#ff4d4f', label: '高', icon: <ExclamationCircleOutlined /> },
  medium: { color: '#faad14', label: '中', icon: <WarningOutlined /> },
  low: { color: '#1677ff', label: '低', icon: <InfoCircleOutlined /> },
};

const PAGE_SIZE = 10;

// ============================================================================
// Component
// ============================================================================

const CompetitorChanges: React.FC = () => {
  const navigate = useNavigate();
  const { project, projectId, hasProject } = useProject();
  const { projects } = useStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PageData>(INITIAL_DATA);
  const [detecting, setDetecting] = useState(false);

  const [page, setPage] = useState(1);
  const [changeTypeFilter, setChangeTypeFilter] = useState<string | undefined>();
  const [severityFilter, setSeverityFilter] = useState<string | undefined>();
  const [daysFilter, setDaysFilter] = useState<number>(30);

  const loadData = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled([
        competitorChangeAPI.getChanges({
          projectId,
          page,
          pageSize: PAGE_SIZE,
          days: daysFilter,
          changeType: changeTypeFilter || undefined,
        }),
        competitorChangeAPI.getChangeDistribution(projectId),
      ]);

      let changes: ChangeItem[] = [];
      let total = 0;
      if (results[0].status === 'fulfilled') {
        const res = results[0].value as any;
        const data = res?.data ?? res;
        changes = Array.isArray(data) ? data : (data?.data || data?.changes || []);
        total = data?.total || data?.pagination?.total || changes.length;
      }

      let distribution: ChangeDistribution[] = [];
      if (results[1].status === 'fulfilled') {
        const res = results[1].value as any;
        const arr = Array.isArray(res) ? res : (res?.data || []);
        distribution = arr;
      }

      const hasError = results.some((r) => r.status === 'rejected');
      if (hasError) {
        const firstErr = results.find((r) => r.status === 'rejected');
        if (firstErr && firstErr.status === 'rejected') {
          console.warn('Partial data load failed:', firstErr.reason);
        }
      }

      setData({ changes, total, distribution });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载变更数据失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, page, changeTypeFilter, daysFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunDetection = async () => {
    if (!projectId) return;
    setDetecting(true);
    try {
      const res: any = await competitorChangeAPI.runDetection(projectId);
      const detected = res?.changesDetected ?? 0;
      message.success(`检测完成，发现 ${detected} 处变更`);
      setPage(1);
      loadData();
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || '检测失败');
    } finally {
      setDetecting(false);
    }
  };

  const handlePageChange = (p: number) => {
    setPage(p);
  };

  const handleTypeFilterChange = (v: string | undefined) => {
    setChangeTypeFilter(v);
    setPage(1);
  };

  const handleDaysFilterChange = (v: number) => {
    setDaysFilter(v);
    setPage(1);
  };

  // ==========================================================================
  // No project selected
  // ==========================================================================
  if (!hasProject) {
    return (
      <div className="page-container">
        <PageHeader
          title="竞品变更追踪"
          subtitle="实时监控竞品网站内容与结构变化"
          showCountrySelector
        />
        <EmptyState
          scene="data"
          title="请先选择项目"
          description="选择一个项目或创建新项目，开始追踪竞品变更"
          action={{
            text: projects.length > 0 ? '选择项目' : '创建项目',
            onClick: () => navigate('/projects'),
            icon: <PlusOutlined />,
          }}
        />
      </div>
    );
  }

  // ==========================================================================
  // Error state
  // ==========================================================================
  if (error && !loading && data.changes.length === 0) {
    return (
      <div className="page-container">
        <PageHeader
          title="竞品变更追踪"
          subtitle={`项目: ${project?.name || ''}`}
          showCountrySelector
        />
        <ErrorState
          message={error}
          onRetry={loadData}
        />
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
          title="竞品变更追踪"
          subtitle={`项目: ${project?.name || ''}`}
          showCountrySelector
          actions={
            <Button icon={<ReloadOutlined />} loading disabled>刷新</Button>
          }
        />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ==========================================================================
  // Computed values
  // ==========================================================================
  const { changes, total, distribution } = data;
  const addedCount = changes.filter((c) => c.changeType === 'added').length;
  const removedCount = changes.filter((c) => c.changeType === 'removed').length;
  const modifiedCount = changes.filter((c) => c.changeType === 'modified').length;

  const totalAdded = distribution.find((d) => d.type === 'added')?.count || addedCount;
  const totalRemoved = distribution.find((d) => d.type === 'removed')?.count || removedCount;
  const totalModified = distribution.find((d) => d.type === 'modified')?.count || modifiedCount;

  // Build distribution chart data
  const distributionData: DistributionDataPoint[] = [
    { name: '新增', value: totalAdded, color: '#52c41a' },
    { name: '修改', value: totalModified, color: '#1677ff' },
    { name: '删除', value: totalRemoved, color: '#ff4d4f' },
  ].filter((d) => d.value > 0);

  // Changes table columns
  const changeColumns = [
    {
      title: '竞品', dataIndex: 'competitorName', key: 'competitorName', width: 130,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '变更类型', dataIndex: 'changeType', key: 'changeType', width: 100,
      render: (t: string) => {
        const cfg = changeTypeConfig[t] || { color: 'default', label: t, icon: null };
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>;
      },
    },
    {
      title: '变更字段', dataIndex: 'field', key: 'field', width: 100,
      render: (f: string) => <Tag>{f}</Tag>,
    },
    {
      title: '变更描述', key: 'changeDesc', width: 280,
      render: (_: unknown, record: ChangeItem) => (
        <Space direction="vertical" size={2}>
          <Text type="secondary" style={{ fontSize: 11, textDecoration: 'line-through', color: '#ff4d4f' }}>
            {record.oldValue || '(空)'}
          </Text>
          <Space size={4}>
            <SwapOutlined style={{ color: '#1677ff', fontSize: 12 }} />
            <Text style={{ color: '#52c41a', fontSize: 12 }}>{record.newValue || '(空)'}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: '页面', dataIndex: 'pageUrl', key: 'pageUrl', width: 180, ellipsis: true,
      render: (url: string) => (
        <Text code style={{ fontSize: 11 }}>{url}</Text>
      ),
    },
    {
      title: '检测时间', dataIndex: 'detectedAt', key: 'detectedAt', width: 160,
      render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-',
      sorter: (a: ChangeItem, b: ChangeItem) =>
        new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime(),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="竞品变更追踪"
        subtitle={`项目: ${project?.name || ''} (${project?.domain || ''})`}
        showCountrySelector
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleRunDetection}
              loading={detecting}
            >
              立即检测
            </Button>
          </Space>
        }
      />

      {/* KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="总变更数"
            value={total}
            icon={<SwapOutlined />}
            color="#1677ff"
            subtitle={`共 ${total} 处变更`}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="新增页面"
            value={totalAdded}
            icon={<PlusOutlined />}
            color="#52c41a"
            subtitle="新发现页面"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="删除页面"
            value={totalRemoved}
            icon={<DeleteOutlined />}
            color="#ff4d4f"
            subtitle="已移除页面"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="内容变更"
            value={totalModified}
            icon={<EditOutlined />}
            color="#faad14"
            subtitle="内容修改"
          />
        </Col>
      </Row>

      {/* Content: Distribution chart + Changes table */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card title="变更类型分布" style={{ borderRadius: 8 }}>
            {distributionData.length > 0 ? (
              <DistributionChart
                data={distributionData}
                type="donut"
                height={340}
                centerLabel={{
                  label: '总变更',
                  value: `${total}`,
                }}
              />
            ) : (
              <EmptyState scene="data" description="暂无变更分布数据" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card
            title="变更列表"
            style={{ borderRadius: 8 }}
            extra={
              <Space>
                <Select
                  placeholder="变更类型"
                  allowClear
                  style={{ width: 120 }}
                  value={changeTypeFilter}
                  onChange={handleTypeFilterChange}
                  options={[
                    { value: 'added', label: '新增' },
                    { value: 'modified', label: '修改' },
                    { value: 'removed', label: '删除' },
                  ]}
                />
                <Select
                  placeholder="时间范围"
                  style={{ width: 120 }}
                  value={daysFilter}
                  onChange={handleDaysFilterChange}
                  options={[
                    { value: 7, label: '最近7天' },
                    { value: 30, label: '最近30天' },
                    { value: 90, label: '最近90天' },
                  ]}
                />
              </Space>
            }
          >
            {changes.length > 0 ? (
              <Table
                columns={changeColumns}
                dataSource={changes}
                rowKey="id"
                pagination={{
                  current: page,
                  pageSize: PAGE_SIZE,
                  total,
                  onChange: handlePageChange,
                  showSizeChanger: false,
                }}
                scroll={{ x: 950 }}
                size="middle"
              />
            ) : (
              <EmptyState
                scene="data"
                description="暂无变更记录"
                action={{
                  text: '立即检测',
                  onClick: handleRunDetection,
                  icon: <ThunderboltOutlined />,
                  loading: detecting,
                }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CompetitorChanges;