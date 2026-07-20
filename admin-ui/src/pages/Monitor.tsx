import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Button, Typography, Space, Modal, Form, Input, Select,
  message, Tag, Spin, Divider, Tabs, Tooltip, Statistic,
} from 'antd';
import {
  ReloadOutlined, ThunderboltOutlined, CloudServerOutlined,
  ClockCircleOutlined, SafetyCertificateOutlined, WarningOutlined,
  CheckCircleOutlined, CloseCircleOutlined, SyncOutlined,
  DashboardOutlined, LineChartOutlined, FileTextOutlined,
  PlusOutlined, ExclamationCircleOutlined, FieldTimeOutlined,
  AimOutlined, GlobalOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from '@/components/common';
import { TrendChart, GaugeChart } from '@/components/charts';
import type { TrendDataPoint } from '@/components/charts';
import type { StatusType } from '@/components/common';
import { useStore } from '@/store';
import { monitorAPI } from '@/services/monitor';
import type {
  MonitorStatus, ResponseTimePoint, SLAInfo,
  DowntimeRecord, MonitorLog, MonitorTarget,
} from '@/services/monitor';

const { Text } = Typography;
const { Option } = Select;

// ============================================================================
// Helpers
// ============================================================================

/** 将 monitor 状态映射到 StatusBadge 的 StatusType */
function mapStatus(status: string): StatusType {
  if (status === 'up' || status === 'online') return 'active';
  if (status === 'degraded') return 'warning';
  if (status === 'down' || status === 'offline') return 'error';
  return 'pending';
}

/** 格式化持续时间（分钟 -> 可读字符串） */
function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 分钟';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h} 小时 ${m} 分钟`;
  if (h > 0) return `${h} 小时`;
  return `${m} 分钟`;
}

/** 格式化日期 */
function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
}

// ============================================================================
// Component
// ============================================================================

const Monitor: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const projectName = useStore((s) => s.currentProject?.name);

  // ==========================================================================
  // Tab 1 - 概览 state
  // ==========================================================================

  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [uptime, setUptime] = useState(0);
  const [avgResponseTime, setAvgResponseTime] = useState(0);
  const [downtimeCount, setDowntimeCount] = useState(0);
  const [targetsCount, setTargetsCount] = useState(0);
  const [currentStatus, setCurrentStatus] = useState<string>('unknown');
  const [responseTimeData, setResponseTimeData] = useState<TrendDataPoint[]>([]);
  const [slaInfo, setSlaInfo] = useState<SLAInfo | null>(null);
  const [checking, setChecking] = useState(false);

  // ==========================================================================
  // Tab 2 - 停机记录 state
  // ==========================================================================

  const [downtimeLoading, setDowntimeLoading] = useState(false);
  const [downtimeError, setDowntimeError] = useState<string | null>(null);
  const [downtimeRecords, setDowntimeRecords] = useState<DowntimeRecord[]>([]);
  const [downtimeTotal, setDowntimeTotal] = useState(0);
  const [downtimePage, setDowntimePage] = useState(1);
  const [downtimePageSize, setDowntimePageSize] = useState(10);

  // ==========================================================================
  // Tab 3 - 监控日志 state
  // ==========================================================================

  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logs, setLogs] = useState<MonitorLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPageSize, setLogsPageSize] = useState(15);

  // ==========================================================================
  // Tab 4 - 监控目标 state
  // ==========================================================================

  const [targetsLoading, setTargetsLoading] = useState(false);
  const [targetsError, setTargetsError] = useState<string | null>(null);
  const [targets, setTargets] = useState<MonitorTarget[]>([]);
  const [addTargetVisible, setAddTargetVisible] = useState(false);
  const [addTargetLoading, setAddTargetLoading] = useState(false);
  const [addTargetForm] = Form.useForm();

  // ==========================================================================
  // Tab 1 - 概览 data loading
  // ==========================================================================

  const loadOverview = useCallback(async () => {
    if (!projectId) return;
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const [statusRes, trendRes, slaRes, targetsRes] = (await Promise.allSettled([
        monitorAPI.getStatusList({ projectId }),
        monitorAPI.getResponseTimeTrend({ projectId }),
        monitorAPI.getSLAInfo(),
        monitorAPI.getTargets({ projectId }),
      ])) as [PromiseSettledResult<any>, PromiseSettledResult<any>, PromiseSettledResult<any>, PromiseSettledResult<any>];

      // Process status data
      let ut = 0;
      let avgRt = 0;
      let dCount = 0;
      let cStatus = 'unknown';
      if (statusRes.status === 'fulfilled') {
        const list: any[] = Array.isArray(statusRes.value) ? statusRes.value : (statusRes.value?.data || []);
        const total = list.length || 1;
        ut = list.reduce((s: number, i: any) => s + (i.uptime || 0), 0) / total;
        avgRt = list.reduce((s: number, i: any) => s + (i.responseTime || 0), 0) / total;
        dCount = list.filter((i: any) => i.status === 'offline' || i.status === 'down').length;
        const allOnline = list.every((i: any) => i.status === 'online' || i.status === 'up');
        cStatus = allOnline ? 'up' : (list.some((i: any) => i.status === 'online' || i.status === 'up') ? 'degraded' : 'down');
      }
      setUptime(ut || 99.9);
      setAvgResponseTime(Math.round(avgRt));
      setDowntimeCount(dCount);
      setCurrentStatus(cStatus);

      // Process response time trend
      let rtTrend: TrendDataPoint[] = [];
      if (trendRes.status === 'fulfilled') {
        const arr: any[] = Array.isArray(trendRes.value) ? trendRes.value : (trendRes.value?.data || []);
        rtTrend = arr.map((p: any) => ({
          date: p.time || p.date || '',
          value: p.value || p.responseTime || 0,
        }));
      }
      setResponseTimeData(rtTrend);

      // Process SLA info
      if (slaRes.status === 'fulfilled' && slaRes.value) {
        setSlaInfo(slaRes.value as SLAInfo);
      } else {
        setSlaInfo(null);
      }

      // Process targets count
      if (targetsRes.status === 'fulfilled') {
        const tList: any[] = Array.isArray(targetsRes.value) ? targetsRes.value : (targetsRes.value?.data || []);
        setTargetsCount(tList.length);
      } else {
        setTargetsCount(0);
      }
    } catch (e: any) {
      setOverviewError(e?.message || '数据加载失败');
    } finally {
      setOverviewLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) { setOverviewLoading(false); return; }
    loadOverview();
  }, [loadOverview, projectId]);

  // ==========================================================================
  // Tab 2 - 停机记录 data loading
  // ==========================================================================

  const loadDowntimeRecords = useCallback(async () => {
    if (!projectId) return;
    setDowntimeLoading(true);
    setDowntimeError(null);
    try {
      const res: any = await monitorAPI.getDowntimeRecords({
        projectId,
        page: downtimePage,
        pageSize: downtimePageSize,
      });
      setDowntimeRecords(res.data || []);
      setDowntimeTotal(res.total || 0);
    } catch (e: any) {
      setDowntimeError(e?.message || '加载停机记录失败');
    } finally {
      setDowntimeLoading(false);
    }
  }, [projectId, downtimePage, downtimePageSize]);

  useEffect(() => {
    if (projectId) loadDowntimeRecords();
  }, [loadDowntimeRecords, projectId]);

  // ==========================================================================
  // Tab 3 - 监控日志 data loading
  // ==========================================================================

  const loadLogs = useCallback(async () => {
    if (!projectId) return;
    setLogsLoading(true);
    setLogsError(null);
    try {
      const res: any = await monitorAPI.getLogs({
        projectId,
        page: logsPage,
        pageSize: logsPageSize,
      });
      setLogs(res.data || []);
      setLogsTotal(res.total || 0);
    } catch (e: any) {
      setLogsError(e?.message || '加载监控日志失败');
    } finally {
      setLogsLoading(false);
    }
  }, [projectId, logsPage, logsPageSize]);

  useEffect(() => {
    if (projectId) loadLogs();
  }, [loadLogs, projectId]);

  // ==========================================================================
  // Tab 4 - 监控目标 data loading
  // ==========================================================================

  const loadTargets = useCallback(async () => {
    if (!projectId) return;
    setTargetsLoading(true);
    setTargetsError(null);
    try {
      const res: any = await monitorAPI.getTargets({ projectId });
      const list = Array.isArray(res) ? res : (res?.data || []);
      setTargets(list);
    } catch (e: any) {
      setTargetsError(e?.message || '加载监控目标失败');
    } finally {
      setTargetsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) loadTargets();
  }, [loadTargets, projectId]);

  // ==========================================================================
  // Manual check
  // ==========================================================================

  const handleCheck = async () => {
    setChecking(true);
    try {
      await monitorAPI.runManualCheck();
      message.success('手动检查已触发，请稍后刷新查看结果');
      setTimeout(() => { loadOverview(); setChecking(false); }, 3000);
    } catch (e: any) {
      message.error(e?.message || '检查失败');
      setChecking(false);
    }
  };

  // ==========================================================================
  // Add target
  // ==========================================================================

  const handleAddTarget = async () => {
    try {
      const values = await addTargetForm.validateFields();
      setAddTargetLoading(true);
      await monitorAPI.addTarget({ url: values.url, name: values.name });
      message.success('监控目标添加成功');
      addTargetForm.resetFields();
      setAddTargetVisible(false);
      loadTargets();
      loadOverview(); // refresh target count
    } catch (e: any) {
      if (e?.errorFields) return; // form validation error
      message.error(e?.message || '添加失败');
    } finally {
      setAddTargetLoading(false);
    }
  };

  // ==========================================================================
  // Status display helpers
  // ==========================================================================

  const statusLabel = currentStatus === 'up' ? '运行正常' : currentStatus === 'degraded' ? '部分降级' : '服务中断';
  const statusType: StatusType = currentStatus === 'up' ? 'active' : currentStatus === 'degraded' ? 'warning' : 'error';

  const responseTimeColor =
    avgResponseTime < 200 ? '#52c41a' : avgResponseTime < 500 ? '#faad14' : '#ff4d4f';

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
  // Columns
  // ==========================================================================

  const downtimeColumns = [
    {
      title: '服务名称', dataIndex: 'serviceName', key: 'serviceName', width: 160,
      render: (v: string) => <Text strong>{v || '-'}</Text>,
    },
    {
      title: '开始时间', dataIndex: 'startedAt', key: 'startedAt', width: 180,
      render: (v: string) => formatDate(v),
    },
    {
      title: '结束时间', dataIndex: 'endedAt', key: 'endedAt', width: 180,
      render: (v: string) => v ? formatDate(v) : <Tag color="processing">进行中</Tag>,
    },
    {
      title: '持续时长', dataIndex: 'duration', key: 'duration', width: 130,
      sorter: (a: DowntimeRecord, b: DowntimeRecord) => (a.duration || 0) - (b.duration || 0),
      render: (v: number) => (
        <Text style={{ color: v > 60 ? '#ff4d4f' : v > 10 ? '#faad14' : '#52c41a' }}>
          {formatDuration(v)}
        </Text>
      ),
    },
    {
      title: '原因', dataIndex: 'cause', key: 'cause', ellipsis: true,
      render: (v: string) => v ? <Text type="secondary">{v}</Text> : <Text type="secondary">--</Text>,
    },
  ];

  const logColumns = [
    {
      title: '时间', dataIndex: 'timestamp', key: 'timestamp', width: 180,
      render: (v: string) => formatDate(v),
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (s: string) => <StatusBadge status={mapStatus(s)} text={s === 'up' ? '正常' : '故障'} />,
    },
    {
      title: '响应时间', dataIndex: 'responseTime', key: 'responseTime', width: 110,
      sorter: (a: MonitorLog, b: MonitorLog) => (a.responseTime || 0) - (b.responseTime || 0),
      render: (v: number) => (
        <Text style={{ color: v < 200 ? '#52c41a' : v < 500 ? '#faad14' : '#ff4d4f' }}>
          {v}ms
        </Text>
      ),
    },
    {
      title: 'HTTP 状态码', dataIndex: 'statusCode', key: 'statusCode', width: 110,
      render: (v: number) => (
        <Tag color={v >= 200 && v < 300 ? 'green' : v >= 300 && v < 400 ? 'blue' : 'red'}>
          {v || '-'}
        </Tag>
      ),
    },
    {
      title: '错误信息', dataIndex: 'errorMessage', key: 'errorMessage', ellipsis: true,
      render: (v: string) => v ? <Text type="danger">{v}</Text> : <Text type="secondary">--</Text>,
    },
  ];

  const targetColumns = [
    {
      title: '名称', dataIndex: 'name', key: 'name', width: 160,
      render: (v: string) => <Text strong>{v || '-'}</Text>,
    },
    {
      title: 'URL', dataIndex: 'url', key: 'url', width: 260, ellipsis: true,
      render: (v: string) => (
        <a href={v} target="_blank" rel="noopener noreferrer">
          <GlobalOutlined style={{ marginRight: 4 }} />{v}
        </a>
      ),
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (s: string) => {
        const label = s === 'up' ? '在线' : s === 'down' ? '离线' : '降级';
        return <StatusBadge status={mapStatus(s)} text={label} />;
      },
    },
    {
      title: '响应时间', dataIndex: 'responseTime', key: 'responseTime', width: 110,
      sorter: (a: MonitorTarget, b: MonitorTarget) => (a.responseTime || 0) - (b.responseTime || 0),
      render: (v: number) => (
        <Text style={{ color: v < 200 ? '#52c41a' : v < 500 ? '#faad14' : '#ff4d4f' }}>
          {v}ms
        </Text>
      ),
    },
    {
      title: '在线率', dataIndex: 'uptime', key: 'uptime', width: 100,
      sorter: (a: MonitorTarget, b: MonitorTarget) => (a.uptime || 0) - (b.uptime || 0),
      render: (v: number) => (
        <Text style={{ color: v >= 99 ? '#52c41a' : v >= 95 ? '#faad14' : '#ff4d4f' }}>
          {v != null ? `${v}%` : '-'}
        </Text>
      ),
    },
    {
      title: '最近检查', dataIndex: 'lastChecked', key: 'lastChecked', width: 180,
      render: (v: string) => formatDate(v),
    },
  ];

  // ==========================================================================
  // Tab items
  // ==========================================================================

  const tabItems = [
    // ========================================================================
    // Tab 1 - 概览
    // ========================================================================
    {
      key: 'overview',
      label: <span><DashboardOutlined /> 概览</span>,
      children: (
        <div>
          {overviewLoading ? (
            <LoadingSkeleton type="page" />
          ) : overviewError ? (
            <ErrorState message={overviewError} onRetry={loadOverview} />
          ) : (
            <>
              {/* KPI StatCards */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="可用率"
                    value={uptime}
                    suffix="%"
                    icon={<CloudServerOutlined />}
                    color="#52c41a"
                    subtitle={statusLabel}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="平均响应时间"
                    value={avgResponseTime}
                    suffix="ms"
                    icon={<ClockCircleOutlined />}
                    color={responseTimeColor}
                    subtitle="所有目标平均"
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="停机事件"
                    value={downtimeCount}
                    suffix="次"
                    icon={<WarningOutlined />}
                    color={downtimeCount > 0 ? '#ff4d4f' : '#52c41a'}
                    subtitle="当前在线状态"
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="监控目标"
                    value={targetsCount}
                    suffix="个"
                    icon={<AimOutlined />}
                    color="#1677ff"
                    subtitle="当前监控站点"
                  />
                </Col>
              </Row>

              {/* GaugeChart + SLA Info */}
              <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                  <Card style={{ borderRadius: 8, textAlign: 'center' }}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>当前状态</Text>
                    <StatusBadge status={statusType} text={statusLabel} />
                    <div style={{ marginTop: 12 }}>
                      <GaugeChart
                        value={uptime}
                        max={100}
                        height={200}
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
                <Col xs={24} sm={16}>
                  <Card title={<><SafetyCertificateOutlined /> SLA 可用率</>} style={{ borderRadius: 8 }}>
                    {slaInfo ? (
                      <Row gutter={[16, 16]}>
                        <Col xs={12} sm={6}>
                          <Card size="small" style={{ borderRadius: 8, textAlign: 'center', background: '#f6ffed' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>日可用率</Text>
                            <div style={{ fontSize: 28, fontWeight: 700, color: '#52c41a', marginTop: 4 }}>
                              {slaInfo.daily}%
                            </div>
                          </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                          <Card size="small" style={{ borderRadius: 8, textAlign: 'center', background: '#e6f7ff' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>周可用率</Text>
                            <div style={{ fontSize: 28, fontWeight: 700, color: '#1677ff', marginTop: 4 }}>
                              {slaInfo.weekly}%
                            </div>
                          </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                          <Card size="small" style={{ borderRadius: 8, textAlign: 'center', background: '#fff7e6' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>月可用率</Text>
                            <div style={{ fontSize: 28, fontWeight: 700, color: '#fa8c16', marginTop: 4 }}>
                              {slaInfo.monthly}%
                            </div>
                          </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                          <Card size="small" style={{ borderRadius: 8, textAlign: 'center', background: '#f9f0ff' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>年可用率</Text>
                            <div style={{ fontSize: 28, fontWeight: 700, color: '#722ed1', marginTop: 4 }}>
                              {slaInfo.yearly}%
                            </div>
                          </Card>
                        </Col>
                      </Row>
                    ) : (
                      <EmptyState scene="data" description="暂无 SLA 数据" />
                    )}
                  </Card>
                </Col>
              </Row>

              {/* Response Time Trend */}
              <Card
                title={<><LineChartOutlined /> 响应时间趋势</>}
                style={{ borderRadius: 8 }}
              >
                {responseTimeData.length > 0 ? (
                  <TrendChart
                    data={responseTimeData}
                    height={300}
                    showArea
                    smooth
                    color="#1677ff"
                    unit=" ms"
                  />
                ) : (
                  <EmptyState scene="data" description="暂无响应时间趋势数据" />
                )}
              </Card>
            </>
          )}
        </div>
      ),
    },

    // ========================================================================
    // Tab 2 - 停机记录
    // ========================================================================
    {
      key: 'downtime',
      label: <span><ExclamationCircleOutlined /> 停机记录</span>,
      children: (
        <div>
          {downtimeLoading ? (
            <LoadingSkeleton type="table" />
          ) : downtimeError ? (
            <ErrorState message={downtimeError} onRetry={loadDowntimeRecords} />
          ) : (
            <Card style={{ borderRadius: 8 }}>
              {downtimeRecords.length > 0 ? (
                <Table
                  columns={downtimeColumns}
                  dataSource={downtimeRecords}
                  rowKey="id"
                  size="middle"
                  scroll={{ x: 900 }}
                  pagination={{
                    current: downtimePage,
                    pageSize: downtimePageSize,
                    total: downtimeTotal,
                    showSizeChanger: true,
                    showTotal: (t) => `共 ${t} 条`,
                    onChange: (page, pageSize) => {
                      setDowntimePage(page);
                      setDowntimePageSize(pageSize);
                    },
                  }}
                />
              ) : (
                <EmptyState scene="data" title="暂无停机记录" description="当前没有停机事件记录，系统运行良好" />
              )}
            </Card>
          )}
        </div>
      ),
    },

    // ========================================================================
    // Tab 3 - 监控日志
    // ========================================================================
    {
      key: 'logs',
      label: <span><FileTextOutlined /> 监控日志</span>,
      children: (
        <div>
          {logsLoading ? (
            <LoadingSkeleton type="table" />
          ) : logsError ? (
            <ErrorState message={logsError} onRetry={loadLogs} />
          ) : (
            <Card style={{ borderRadius: 8 }}>
              {logs.length > 0 ? (
                <Table
                  columns={logColumns}
                  dataSource={logs}
                  rowKey="id"
                  size="middle"
                  scroll={{ x: 900 }}
                  pagination={{
                    current: logsPage,
                    pageSize: logsPageSize,
                    total: logsTotal,
                    showSizeChanger: true,
                    showTotal: (t) => `共 ${t} 条`,
                    onChange: (page, pageSize) => {
                      setLogsPage(page);
                      setLogsPageSize(pageSize);
                    },
                  }}
                />
              ) : (
                <EmptyState scene="data" title="暂无监控日志" description="当前没有监控日志记录" />
              )}
            </Card>
          )}
        </div>
      ),
    },

    // ========================================================================
    // Tab 4 - 监控目标
    // ========================================================================
    {
      key: 'targets',
      label: <span><AimOutlined /> 监控目标</span>,
      children: (
        <div>
          {targetsLoading ? (
            <LoadingSkeleton type="table" />
          ) : targetsError ? (
            <ErrorState message={targetsError} onRetry={loadTargets} />
          ) : (
            <Card
              style={{ borderRadius: 8 }}
              title="监控目标列表"
              extra={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    addTargetForm.resetFields();
                    setAddTargetVisible(true);
                  }}
                >
                  添加目标
                </Button>
              }
            >
              {targets.length > 0 ? (
                <Table
                  columns={targetColumns}
                  dataSource={targets}
                  rowKey="id"
                  size="middle"
                  scroll={{ x: 1000 }}
                  pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 个目标` }}
                />
              ) : (
                <EmptyState
                  scene="data"
                  title="暂无监控目标"
                  description="还没有添加任何监控目标，点击上方按钮添加"
                  action={{
                    text: '添加目标',
                    icon: <PlusOutlined />,
                    onClick: () => setAddTargetVisible(true),
                  }}
                />
              )}
            </Card>
          )}
        </div>
      ),
    },
  ];

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="page-container">
      <PageHeader
        title="网站监控"
        subtitle={`项目: ${projectName || ''}`}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadOverview}>刷新</Button>
            <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleCheck} loading={checking}>
              立即检查
            </Button>
          </Space>
        }
      />

      <Tabs
        defaultActiveKey="overview"
        items={tabItems}
        size="large"
        style={{ marginTop: -8 }}
      />

      {/* Add Target Modal */}
      <Modal
        title="添加监控目标"
        open={addTargetVisible}
        onOk={handleAddTarget}
        onCancel={() => {
          addTargetForm.resetFields();
          setAddTargetVisible(false);
        }}
        confirmLoading={addTargetLoading}
        okText="添加"
        cancelText="取消"
        destroyOnClose
      >
        <Form
          form={addTargetForm}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="url"
            label="监控 URL"
            rules={[
              { required: true, message: '请输入监控 URL' },
              { type: 'url', message: '请输入有效的 URL' },
            ]}
          >
            <Input placeholder="https://example.com" prefix={<GlobalOutlined />} />
          </Form.Item>
          <Form.Item
            name="name"
            label="目标名称"
            rules={[{ required: true, message: '请输入目标名称' }]}
          >
            <Input placeholder="例如：官方网站" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Monitor;