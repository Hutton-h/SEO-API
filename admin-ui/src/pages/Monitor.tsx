import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Row, Col, Table, Typography, Button, Space, Select, Tag,
  message, Tooltip, Divider,
} from 'antd';
import {
  ReloadOutlined, ThunderboltOutlined, CloudServerOutlined,
  ClockCircleOutlined, SafetyCertificateOutlined, WarningOutlined,
  CheckCircleOutlined, CloseCircleOutlined, SyncOutlined,
  DashboardOutlined, LineChartOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from '@/components/common';
import { TrendChart, GaugeChart } from '@/components/charts';
import type { TrendDataPoint } from '@/components/charts';
import { useStore } from '@/store';
import { monitorAPI } from '@/services/monitor';

const { Text } = Typography;
const { Option } = Select;

// ============================================================================
// Types
// ============================================================================

interface MonitorLogItem {
  id: string;
  timestamp: string;
  status: string;
  response_time: number;
  status_code: number;
  error_message: string;
}

interface MetricsData {
  uptime_percent: number;
  avg_response_time: number;
  downtime_incidents: number;
  ssl_days_left: number;
  status: string;
}

type MetricFilter = 'uptime' | 'response_time' | 'ssl' | 'all';
type PeriodFilter = '24h' | '7d' | '30d' | '90d';

// ============================================================================
// Component
// ============================================================================

const Monitor: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const projectName = useStore((s) => s.currentProject?.name);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [logs, setLogs] = useState<MonitorLogItem[]>([]);
  const [responseTimeData, setResponseTimeData] = useState<TrendDataPoint[]>([]);
  const [uptimeTrendData, setUptimeTrendData] = useState<TrendDataPoint[]>([]);

  const [metricFilter, setMetricFilter] = useState<MetricFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('24h');
  const [checking, setChecking] = useState(false);

  // ==========================================================================
  // Data loading
  // ==========================================================================

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [statusRes, metricsRes, logsRes] = await Promise.allSettled([
        monitorAPI.getStatusList({ projectId }),
        monitorAPI.getResponseTimeTrend({ projectId, period: periodFilter }),
        monitorAPI.getSLAInfo(),
      ]);

      // Process status data
      let uptime = 0;
      let avgRt = 0;
      let incidents = 0;
      let currentStatus = 'unknown';
      if (statusRes.status === 'fulfilled') {
        const statusData: any = statusRes.value;
        const list = Array.isArray(statusData) ? statusData : (statusData?.data || []);
        const total = list.length || 1;
        uptime = list.reduce((s: number, i: any) => s + (i.uptime || 0), 0) / total;
        avgRt = list.reduce((s: number, i: any) => s + (i.responseTime || 0), 0) / total;
        incidents = list.filter((i: any) => i.status === 'offline' || i.status === 'down').length;
        const allOnline = list.every((i: any) => i.status === 'online' || i.status === 'up');
        currentStatus = allOnline ? 'up' : (list.some((i: any) => i.status === 'online') ? 'degraded' : 'down');
      }

      // Process response time trend
      let rtTrend: TrendDataPoint[] = [];
      if (metricsRes.status === 'fulfilled') {
        const rtData: any = metricsRes.value;
        const arr = Array.isArray(rtData) ? rtData : (rtData?.data || []);
        rtTrend = arr.map((p: any) => ({
          date: p.time || p.date || '',
          value: p.value || p.responseTime || 0,
        }));
        if (rtTrend.length > 0 && avgRt === 0) {
          avgRt = rtTrend.reduce((s, d) => s + d.value, 0) / rtTrend.length;
        }
      }

      // Process SLA info
      let sslDays = 0;
      let slaDaily = 0;
      if (metricsRes.status === 'fulfilled') {
        const slaData: any = metricsRes.value;
        if (slaData) {
          slaDaily = slaData.daily || slaData.uptime || 0;
          sslDays = slaData.sslDaysLeft || slaData.ssl_days || 90;
        }
      }

      setMetrics({
        uptime_percent: uptime || slaDaily || 99.9,
        avg_response_time: Math.round(avgRt),
        downtime_incidents: incidents,
        ssl_days_left: sslDays || 90,
        status: currentStatus,
      });

      setResponseTimeData(rtTrend);

      // Build uptime trend for gauge context
      if (rtTrend.length > 0) {
        setUptimeTrendData(rtTrend.map((d, i) => ({
          date: d.date,
          value: uptime || 99.9,
        })));
      }

      // Build mock logs from status data
      if (statusRes.status === 'fulfilled') {
        const statusData: any = statusRes.value;
        const list = Array.isArray(statusData) ? statusData : (statusData?.data || []);
        const mockLogs: MonitorLogItem[] = list.map((item: any, idx: number) => ({
          id: item.id || `log-${idx}`,
          timestamp: item.lastChecked || new Date().toISOString(),
          status: item.status === 'online' || item.status === 'up' ? 'up' : 'down',
          response_time: item.responseTime || 0,
          status_code: item.status === 'online' || item.status === 'up' ? 200 : 503,
          error_message: item.status === 'online' || item.status === 'up' ? '' : (item.cause || '服务不可用'),
        }));
        setLogs(mockLogs);
      }
    } catch (e: any) {
      setError(e?.message || '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, periodFilter]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadData();
  }, [loadData, projectId]);

  // ==========================================================================
  // Manual check
  // ==========================================================================

  const handleCheck = async () => {
    setChecking(true);
    try {
      await monitorAPI.runManualCheck();
      message.success('手动检查已触发，请稍后刷新查看结果');
      setTimeout(() => { loadData(); setChecking(false); }, 3000);
    } catch (e: any) {
      message.error(e?.message || '检查失败');
      setChecking(false);
    }
  };

  // ==========================================================================
  // No project
  // ==========================================================================

  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="网站监控" subtitle="网站可用性、响应时间与 SSL 证书监控" />
        <EmptyState scene="data" title="请先选择项目" description="选择一个项目以查看网站监控数据和运行状态" />
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
          title="网站监控"
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
        <PageHeader
          title="网站监控"
          subtitle={`项目: ${projectName || ''}`}
        />
        <ErrorState message={error} onRetry={loadData} />
      </div>
    );
  }

  // ==========================================================================
  // Filtered logs
  // ==========================================================================

  const filteredLogs = useMemo(() => {
    if (metricFilter === 'all') return logs;
    if (metricFilter === 'uptime') return logs.filter((l) => l.status === 'down');
    if (metricFilter === 'response_time') return logs.filter((l) => l.response_time > 500);
    if (metricFilter === 'ssl') return logs.filter((l) => l.status_code === 526);
    return logs;
  }, [logs, metricFilter]);

  // ==========================================================================
  // Status display
  // ==========================================================================

  const statusLabel = metrics?.status === 'up' ? '运行正常' : metrics?.status === 'degraded' ? '部分降级' : '服务中断';
  const statusType = metrics?.status === 'up' ? 'active' : metrics?.status === 'degraded' ? 'warning' : 'error';

  // ==========================================================================
  // Table columns
  // ==========================================================================

  const logColumns = [
    {
      title: '时间', dataIndex: 'timestamp', key: 'timestamp', width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (s: string) => (
        <Tag color={s === 'up' ? 'green' : 'red'} icon={s === 'up' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {s === 'up' ? '正常' : '故障'}
        </Tag>
      ),
    },
    {
      title: '响应时间', dataIndex: 'response_time', key: 'response_time', width: 110,
      render: (v: number) => (
        <Text style={{ color: v < 200 ? '#52c41a' : v < 500 ? '#faad14' : '#ff4d4f' }}>
          {v}ms
        </Text>
      ),
      sorter: (a: MonitorLogItem, b: MonitorLogItem) => a.response_time - b.response_time,
    },
    {
      title: '状态码', dataIndex: 'status_code', key: 'status_code', width: 90,
      render: (v: number) => (
        <Tag color={v >= 200 && v < 300 ? 'green' : v >= 300 && v < 400 ? 'blue' : 'red'}>
          {v || '-'}
        </Tag>
      ),
    },
    {
      title: '错误信息', dataIndex: 'error_message', key: 'error_message', ellipsis: true,
      render: (v: string) => v ? <Text type="danger">{v}</Text> : <Text type="secondary">--</Text>,
    },
  ];

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="page-container">
      <PageHeader
        title="网站监控"
        subtitle={`项目: ${projectName || ''} - 网站可用性、响应时间与 SSL 证书监控`}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
            <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleCheck} loading={checking}>
              手动检查
            </Button>
          </Space>
        }
      />

      {/* KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="可用率"
            value={metrics?.uptime_percent ?? 99.9}
            suffix="%"
            icon={<CloudServerOutlined />}
            color="#52c41a"
            subtitle={statusLabel}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="平均响应时间"
            value={metrics?.avg_response_time ?? 0}
            suffix="ms"
            icon={<ClockCircleOutlined />}
            color={(metrics?.avg_response_time ?? 0) < 200 ? '#1677ff' : (metrics?.avg_response_time ?? 0) < 500 ? '#faad14' : '#ff4d4f'}
            subtitle="近24小时"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="宕机事件"
            value={metrics?.downtime_incidents ?? 0}
            suffix="次"
            icon={<WarningOutlined />}
            color={(metrics?.downtime_incidents ?? 0) > 0 ? '#ff4d4f' : '#52c41a'}
            subtitle="本月累计"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="SSL 剩余天数"
            value={metrics?.ssl_days_left ?? 0}
            suffix="天"
            icon={<SafetyCertificateOutlined />}
            color={(metrics?.ssl_days_left ?? 0) > 30 ? '#52c41a' : (metrics?.ssl_days_left ?? 0) > 7 ? '#faad14' : '#ff4d4f'}
            subtitle={(metrics?.ssl_days_left ?? 0) > 30 ? '安全' : '即将到期'}
          />
        </Col>
      </Row>

      {/* Status overview */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card style={{ borderRadius: 8, textAlign: 'center' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>当前状态</Text>
            <StatusBadge status={statusType} text={statusLabel} />
            <div style={{ marginTop: 12 }}>
              <GaugeChart
                value={metrics?.uptime_percent ?? 99.9}
                max={100}
                height={180}
                unit="%"
                thresholds={[
                  { value: 95, color: '#ff4d4f' },
                  { value: 99, color: '#faad14' },
                  { value: 100, color: '#52c41a' },
                ]}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={18}>
          <Card
            title={<><LineChartOutlined /> 响应时间趋势</>}
            style={{ borderRadius: 8 }}
          >
            {responseTimeData.length > 0 ? (
              <TrendChart
                data={responseTimeData}
                height={260}
                showArea
                smooth
                color="#1677ff"
                unit=" ms"
              />
            ) : (
              <EmptyState scene="data" description="暂无响应时间趋势数据" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Filter bar */}
      <Card style={{ borderRadius: 8, marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col>
            <Text strong style={{ marginRight: 8 }}>筛选:</Text>
          </Col>
          <Col>
            <Select
              value={metricFilter}
              onChange={setMetricFilter}
              style={{ width: 150 }}
              options={[
                { value: 'all', label: '全部指标' },
                { value: 'uptime', label: '可用率' },
                { value: 'response_time', label: '响应时间' },
                { value: 'ssl', label: 'SSL' },
              ]}
            />
          </Col>
          <Col>
            <Select
              value={periodFilter}
              onChange={setPeriodFilter}
              style={{ width: 120 }}
              options={[
                { value: '24h', label: '最近24小时' },
                { value: '7d', label: '最近7天' },
                { value: '30d', label: '最近30天' },
                { value: '90d', label: '最近90天' },
              ]}
            />
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Text type="secondary">
              共 {filteredLogs.length} 条监控记录
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Monitor logs table */}
      <Card
        title={<><FileTextOutlined /> 监控日志</>}
        style={{ borderRadius: 8 }}
      >
        {filteredLogs.length > 0 ? (
          <Table
            columns={logColumns}
            dataSource={filteredLogs}
            rowKey="id"
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
            size="middle"
            scroll={{ x: 800 }}
          />
        ) : (
          <EmptyState scene="data" description="当前筛选条件下暂无监控日志" />
        )}
      </Card>
    </div>
  );
};

export default Monitor;