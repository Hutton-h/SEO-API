import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Tag, Typography, Row, Col, Space,
  Input, Select, message, Tabs, Progress,
} from 'antd';
import {
  ReloadOutlined, LinkOutlined, GlobalOutlined, RiseOutlined,
  SearchOutlined, ThunderboltOutlined, TrophyOutlined,
  CheckCircleOutlined, CloseCircleOutlined, PieChartOutlined,
  LineChartOutlined, AimOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { TrendChart, DistributionChart } from '@/components/charts';
import { useStore } from '@/store';
import { backlinkAPI } from '@/services/backlinks';

const { Text } = Typography;

// ============================================================================
// Component
// ============================================================================

const Backlinks: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const projectName = useStore((s) => s.currentProject?.name || '');

  // ---- State ----
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Backlinks data
  const [backlinks, setBacklinks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Stats
  const [stats, setStats] = useState<any>({
    totalBacklinks: 0, referringDomains: 0, dofollowCount: 0, nofollowCount: 0,
    avgDomainAuthority: 0, avgPageAuthority: 0, newBacklinks: 0, lostBacklinks: 0,
  });

  // Filters
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();

  // Trends
  const [trends, setTrends] = useState<any[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);

  // Anchor distribution
  const [anchorDist, setAnchorDist] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState('overview');

  // ---- KPI stats ----
  const totalBacklinks = stats?.totalBacklinks || 0;
  const dofollowCount = stats?.dofollowCount || 0;
  const referringDomains = stats?.referringDomains || 0;
  const avgDA = stats?.avgDomainAuthority || 0;

  // ---- Data loading ----
  const loadBacklinks = useCallback(async (p?: number, ps?: number, search?: string, tp?: string) => {
    if (!projectId) return;
    try {
      const res: any = await backlinkAPI.getBacklinks(projectId, {
        page: p ?? page,
        pageSize: ps ?? pageSize,
        ...(tp ? { type: tp } : {}),
      });
      const list = Array.isArray(res) ? res : (res?.data || res?.backlinks || []);
      const t = res?.total || 0;
      setBacklinks(list);
      setTotal(t);
    } catch {
      // graceful
    }
  }, [projectId, page, pageSize]);

  const loadStats = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await backlinkAPI.getBacklinkStats(projectId);
      const data = res?.data !== undefined ? res.data : res;
      if (data && Object.keys(data).length > 0) setStats(data);
    } catch {
      // graceful
    }
  }, [projectId]);

  const loadTrends = useCallback(async () => {
    if (!projectId) return;
    setTrendsLoading(true);
    try {
      // Generate trend data from backlinks first_seen dates
      const dateMap: Record<string, number> = {};
      backlinks.forEach((bl: any) => {
        const date = bl.firstSeen?.split('T')[0] || '';
        if (date) dateMap[date] = (dateMap[date] || 0) + 1;
      });
      const trendData = Object.entries(dateMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, value: count }));
      setTrends(trendData);
    } catch {
      setTrends([]);
    } finally {
      setTrendsLoading(false);
    }
  }, [backlinks]);

  const loadAnchorDist = useCallback(() => {
    // Compute anchor text distribution from backlinks
    const anchorMap: Record<string, number> = {};
    backlinks.forEach((bl: any) => {
      const anchor = bl.anchorText || '(无锚文本)';
      anchorMap[anchor] = (anchorMap[anchor] || 0) + 1;
    });
    const dist = Object.entries(anchorMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
    setAnchorDist(dist);
  }, [backlinks]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadBacklinks(), loadStats()]);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [loadBacklinks, loadStats]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadAll();
  }, [projectId]);

  useEffect(() => {
    if (backlinks.length > 0) {
      loadTrends();
      loadAnchorDist();
    }
  }, [backlinks]);

  // ---- Actions ----
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await backlinkAPI.refreshBacklinks(projectId!);
      message.success('外链刷新任务已启动');
      setTimeout(() => { loadAll(); setRefreshing(false); }, 3000);
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || '刷新失败');
      setRefreshing(false);
    }
  };

  // ---- Columns ----
  const columns = [
    {
      title: '来源URL', dataIndex: 'sourceUrl', key: 'sourceUrl', width: 280, ellipsis: true,
      render: (url: string) => <Text code style={{ fontSize: 11 }}>{url}</Text>,
    },
    {
      title: '目标URL', dataIndex: 'targetUrl', key: 'targetUrl', width: 250, ellipsis: true,
      render: (url: string) => <Text code style={{ fontSize: 11 }}>{url}</Text>,
    },
    {
      title: '锚文本', dataIndex: 'anchorText', key: 'anchorText', width: 150, ellipsis: true,
      render: (text: string) => <Text strong>{text || '-'}</Text>,
    },
    {
      title: 'DA', dataIndex: 'domainAuthority', key: 'domainAuthority', width: 70,
      render: (da: number) => {
        const color = da >= 50 ? '#52c41a' : da >= 30 ? '#faad14' : '#ff4d4f';
        return <Tag color={color}>{da || '-'}</Tag>;
      },
    },
    {
      title: 'PA', dataIndex: 'pageAuthority', key: 'pageAuthority', width: 70,
      render: (pa: number) => <Tag>{pa || '-'}</Tag>,
    },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 90,
      render: (t: string) => (
        <Tag color={t === 'dofollow' ? 'green' : 'orange'} icon={t === 'dofollow' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {t || '-'}
        </Tag>
      ),
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (s: string) => {
        const config: Record<string, { color: string; text: string }> = {
          active: { color: 'green', text: '活跃' },
          lost: { color: 'red', text: '丢失' },
          new: { color: 'blue', text: '新增' },
        };
        const c = config[s] || { color: 'default', text: s || '未知' };
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
    {
      title: '首次发现', dataIndex: 'firstSeen', key: 'firstSeen', width: 140,
      render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-',
    },
    {
      title: '最近发现', dataIndex: 'lastSeen', key: 'lastSeen', width: 140,
      render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-',
    },
  ];

  // ---- State: no project ----
  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="外链分析" subtitle="请先选择项目" showCountrySelector showDateRange />
        <EmptyState scene="data" title="请先选择项目" description="请从顶部导航栏选择一个项目以开始外链分析" />
      </div>
    );
  }

  // ---- State: loading ----
  if (loading && backlinks.length === 0) {
    return (
      <div className="page-container">
        <PageHeader title="外链分析" subtitle={`${projectName} - 反向链接监控`} showCountrySelector showDateRange />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ---- State: error ----
  if (error && backlinks.length === 0) {
    return (
      <div className="page-container">
        <PageHeader title="外链分析" subtitle={`${projectName} - 反向链接监控`} showCountrySelector showDateRange />
        <ErrorState message={error} onRetry={() => loadAll()} />
      </div>
    );
  }

  // ---- Render ----
  return (
    <div className="page-container">
      <PageHeader
        title="外链分析"
        subtitle={`${projectName} - 共 ${totalBacklinks} 个外链 · ${referringDomains} 个引用域名`}
        showCountrySelector
        showDateRange
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadAll} loading={loading}>刷新</Button>
            <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleRefresh} loading={refreshing}>
              刷新外链
            </Button>
          </Space>
        }
      />

      {/* KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard title="总外链数" value={totalBacklinks} icon={<LinkOutlined />} color="#1677ff" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="Dofollow" value={dofollowCount} icon={<CheckCircleOutlined />} color="#52c41a" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="引用域名" value={referringDomains} icon={<GlobalOutlined />} color="#fa8c16" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="平均域名权重" value={avgDA} icon={<TrophyOutlined />} color="#722ed1" suffix="/100" />
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginTop: 8 }}
        items={[
          {
            key: 'overview',
            label: <span><LinkOutlined /> 外链概览</span>,
            children: (
              <>
                {/* Charts row */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={24} md={14}>
                    <Card title={<><LineChartOutlined /> 外链增长趋势</>} loading={trendsLoading}>
                      {trends.length > 0 ? (
                        <TrendChart data={trends} title="外链数量变化" height={350} smooth showArea color="#1677ff" />
                      ) : (
                        <EmptyState scene="data" title="暂无趋势数据" description="刷新外链数据后将显示增长趋势" />
                      )}
                    </Card>
                  </Col>
                  <Col xs={24} md={10}>
                    <Card title={<><PieChartOutlined /> 外链类型分布</>}>
                      <DistributionChart
                        data={[
                          { name: 'Dofollow', value: dofollowCount, color: '#52c41a' },
                          { name: 'Nofollow', value: (stats?.nofollowCount || 0), color: '#faad14' },
                        ].filter((d) => d.value > 0)}
                        type="donut"
                        height={350}
                        centerLabel={{ label: '总计', value: String(totalBacklinks) }}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Backlinks table */}
                <Card
                  title="外链详情"
                  extra={
                    <Space>
                      <Input.Search
                        placeholder="搜索URL..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        onSearch={() => { setPage(1); loadBacklinks(1, pageSize, searchFilter, typeFilter); }}
                        style={{ width: 220 }}
                        allowClear
                      />
                      <Select
                        placeholder="链接类型"
                        allowClear
                        style={{ width: 120 }}
                        value={typeFilter}
                        onChange={(v) => { setTypeFilter(v); setPage(1); loadBacklinks(1, pageSize, searchFilter, v); }}
                        options={[
                          { value: 'dofollow', label: 'Dofollow' },
                          { value: 'nofollow', label: 'Nofollow' },
                        ]}
                      />
                    </Space>
                  }
                >
                  {backlinks.length === 0 ? (
                    <EmptyState
                      scene="data"
                      title="暂无外链数据"
                      description="点击「刷新外链」按钮开始获取外链数据"
                      action={{ text: '刷新外链', icon: <ThunderboltOutlined />, onClick: handleRefresh, loading: refreshing }}
                    />
                  ) : (
                    <Table
                      columns={columns}
                      dataSource={backlinks}
                      rowKey="id"
                      pagination={{
                        current: page, pageSize, total, showSizeChanger: true,
                        showTotal: (t) => `共 ${t} 条外链`,
                        onChange: (p, ps) => { setPage(p); setPageSize(ps); loadBacklinks(p, ps, searchFilter, typeFilter); },
                      }}
                      size="middle"
                      scroll={{ x: 1400 }}
                    />
                  )}
                </Card>
              </>
            ),
          },
          {
            key: 'anchor',
            label: <span><AimOutlined /> 锚文本分布</span>,
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} md={14}>
                  <Card title="锚文本分布">
                    {anchorDist.length > 0 ? (
                      <DistributionChart
                        data={anchorDist}
                        type="donut"
                        height={400}
                      />
                    ) : (
                      <EmptyState scene="data" title="暂无锚文本数据" description="获取外链数据后将显示锚文本分布" />
                    )}
                  </Card>
                </Col>
                <Col xs={24} md={10}>
                  <Card title="锚文本列表">
                    {anchorDist.length > 0 ? (
                      <div style={{ maxHeight: 400, overflow: 'auto' }}>
                        {anchorDist.map((item, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                            <Text ellipsis style={{ maxWidth: 200 }}>{item.name}</Text>
                            <Tag color="blue">{item.value}</Tag>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState scene="data" title="暂无数据" />
                    )}
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'trends',
            label: <span><LineChartOutlined /> 增长趋势</span>,
            children: (
              <Card loading={trendsLoading}>
                {trends.length > 0 ? (
                  <TrendChart data={trends} title="外链增长趋势" height={400} smooth showArea color="#1677ff" />
                ) : (
                  <EmptyState scene="data" title="暂无趋势数据" description="刷新外链数据后将显示增长趋势" />
                )}
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};

export default Backlinks;