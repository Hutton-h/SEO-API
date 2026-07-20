import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Button, Modal, Form, Input, Tag, Typography, Space, Popconfirm,
  Tabs, message, Tooltip, Select,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ReloadOutlined, TeamOutlined,
  AimOutlined, SwapOutlined, PercentageOutlined, GlobalOutlined,
  TrophyOutlined, RiseOutlined, EyeOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { RadarChart, ComparisonChart, DistributionChart } from '@/components/charts';
import type { RadarSeriesData, ComparisonDataPoint, DistributionDataPoint } from '@/components/charts';
import { useStore } from '@/store';
import { useProject } from '@/hooks';
import { competitorAPI } from '@/services/competitor';
import { domainOverviewAPI } from '@/services/domainOverview';
import { topPagesAPI } from '@/services/topPages';

const { Text } = Typography;

// ============================================================================
// Types
// ============================================================================

interface CompetitorItem {
  id: string;
  name: string;
  domain: string;
  keywords: number;
  traffic: number;
  domainAuthority: number;
  topKeywords: number;
  avgPosition: number;
  backlinks: number;
}

interface OverlapItem {
  keyword: string;
  ourRank: number;
  compARank: number;
  compBRank: number;
  compCRank: number;
  compDRank: number;
}

interface PageData {
  competitors: CompetitorItem[];
  keywordOverlap: OverlapItem[];
}

const INITIAL_DATA: PageData = {
  competitors: [],
  keywordOverlap: [],
};

// ============================================================================
// Helpers
// ============================================================================

const getDAColor = (da: number): string => {
  if (da >= 50) return '#52c41a';
  if (da >= 30) return '#faad14';
  return '#ff4d4f';
};

const getRankColor = (rank: number): string => {
  if (rank <= 3) return 'green';
  if (rank <= 10) return 'blue';
  return 'orange';
};

// ============================================================================
// Component
// ============================================================================

const Competitors: React.FC = () => {
  const navigate = useNavigate();
  const { project, projectId, hasProject } = useProject();
  const { projects } = useStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PageData>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState('overview');

  // Add competitor modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [adding, setAdding] = useState(false);

  // ---- New Tab State ----

  // Domain Overview
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [domainOverview, setDomainOverview] = useState<any>(null);
  const [domainOverviewLoading, setDomainOverviewLoading] = useState(false);

  // Top Pages
  const [topPagesDomain, setTopPagesDomain] = useState<string>('');
  const [topPages, setTopPages] = useState<any[]>([]);
  const [topPagesLoading, setTopPagesLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled([
        competitorAPI.getOverview(projectId),
        competitorAPI.getKeywordOverlap(projectId),
      ]);

      let competitors: CompetitorItem[] = [];
      if (results[0].status === 'fulfilled') {
        const res = results[0].value as any;
        const arr = Array.isArray(res) ? res : (res?.data || res?.competitors || []);
        competitors = arr;
      }

      let keywordOverlap: OverlapItem[] = [];
      if (results[1].status === 'fulfilled') {
        const res = results[1].value as any;
        const arr = Array.isArray(res) ? res : (res?.data || res?.overlap || []);
        keywordOverlap = arr;
      }

      const hasError = results.some((r) => r.status === 'rejected');
      if (hasError) {
        const firstErr = results.find((r) => r.status === 'rejected');
        if (firstErr && firstErr.status === 'rejected') {
          console.warn('Partial data load failed:', firstErr.reason);
        }
      }

      setData({ competitors, keywordOverlap });

      // Auto-select first competitor domain for new tabs
      if (competitors.length > 0 && !selectedDomain) {
        setSelectedDomain(competitors[0].domain);
        setTopPagesDomain(competitors[0].domain);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载竞品数据失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedDomain]);

  useEffect(() => {
    loadData();
  }, [projectId]);

  // ---- New Data Loading Functions ----

  const loadDomainOverview = useCallback(async (domain: string) => {
    if (!domain) return;
    setDomainOverviewLoading(true);
    try {
      const res: any = await domainOverviewAPI.getDomainOverview({ domain });
      const d = res?.data ?? res;
      setDomainOverview(d);
    } catch {
      setDomainOverview(null);
    } finally {
      setDomainOverviewLoading(false);
    }
  }, []);

  const loadTopPages = useCallback(async (domain: string) => {
    if (!domain) return;
    setTopPagesLoading(true);
    try {
      const res: any = await topPagesAPI.getTopPages({ domain });
      const list = Array.isArray(res) ? res : (res?.data || res?.pages || []);
      setTopPages(list);
    } catch {
      setTopPages([]);
    } finally {
      setTopPagesLoading(false);
    }
  }, []);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === 'domain-overview' && selectedDomain) {
      loadDomainOverview(selectedDomain);
    }
    if (key === 'top-pages' && topPagesDomain) {
      loadTopPages(topPagesDomain);
    }
  };

  // Add competitor
  const handleAddCompetitor = async () => {
    try {
      const values = await form.validateFields();
      setAdding(true);
      await competitorAPI.addCompetitor(projectId, values);
      message.success('竞品添加成功');
      form.resetFields();
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.error?.message || err?.message || '添加失败');
    } finally {
      setAdding(false);
    }
  };

  // Remove competitor
  const handleRemoveCompetitor = async (competitorId: string) => {
    try {
      await competitorAPI.removeCompetitor(projectId, competitorId);
      message.success('竞品已移除');
      loadData();
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || '移除失败');
    }
  };

  // ==========================================================================
  // No project selected
  // ==========================================================================
  if (!hasProject) {
    return (
      <div className="page-container">
        <PageHeader
          title="竞品分析"
          subtitle="竞争对手监控、关键词重叠分析与流量对比"
          showCountrySelector
        />
        <EmptyState
          scene="data"
          title="请先选择项目"
          description="选择一个项目或创建新项目，开始分析竞品数据"
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
  if (error && !loading && data.competitors.length === 0) {
    return (
      <div className="page-container">
        <PageHeader
          title="竞品分析"
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
          title="竞品分析"
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
  const { competitors, keywordOverlap } = data;
  const totalCompetitors = competitors.length;
  const sharedKeywords = keywordOverlap.length;
  const ourTotalTraffic = 50000; // placeholder; would come from project data
  const compTotalTraffic = competitors.reduce((sum, c) => sum + (c.traffic || 0), 0);
  const trafficGap = Math.max(0, compTotalTraffic - ourTotalTraffic);

  const overlapKeywords = keywordOverlap.filter(
    (k) => k.compARank > 0 || k.compBRank > 0 || k.compCRank > 0 || k.compDRank > 0
  );
  const overlapPct = keywordOverlap.length > 0
    ? Math.round((overlapKeywords.length / keywordOverlap.length) * 100)
    : 0;

  // Build radar data for competitor comparison
  const radarData: RadarSeriesData[] = [];
  if (competitors.length > 0) {
    const maxKw = Math.max(...competitors.map((c) => c.keywords || 0), 100);
    const maxTraffic = Math.max(...competitors.map((c) => c.traffic || 0), 1000);
    const maxBacklinks = Math.max(...competitors.map((c) => c.backlinks || 0), 100);

    radarData.push(
      ...competitors.map((c: any) => ({
        name: c.name || c.domain,
        data: [
          { name: 'DA', value: c.domainAuthority || 0 },
          { name: '外链', value: maxBacklinks > 0 ? Math.round((c.backlinks || 0) / maxBacklinks * 100) : 0 },
          { name: '流量', value: maxTraffic > 0 ? Math.round((c.traffic || 0) / maxTraffic * 100) : 0 },
          { name: '关键词', value: maxKw > 0 ? Math.round((c.keywords || 0) / maxKw * 100) : 0 },
          { name: '页面', value: Math.min(100, (c.topKeywords || 0)) },
        ],
      }))
    );
  }

  // Build traffic comparison data
  const trafficComparisonData: ComparisonDataPoint[] = [
    { name: project?.name || '我们', value: ourTotalTraffic, color: '#1677ff' },
    ...competitors.map((c: any) => ({
      name: c.name || c.domain,
      value: c.traffic || 0,
      color: undefined,
    })),
  ].sort((a, b) => b.value - a.value);

  // Build keyword overlap distribution data
  const overlapDistributionData: DistributionDataPoint[] = [
    { name: '独占关键词', value: keywordOverlap.filter((k) => k.ourRank > 0 &&
      k.compARank === 0 && k.compBRank === 0 && k.compCRank === 0 && k.compDRank === 0).length, color: '#1677ff' },
    { name: '共享关键词', value: overlapKeywords.length, color: '#52c41a' },
  ].filter((d) => d.value > 0);

  // Build overlap comparison chart data (for visual comparison)
  const overlapComparisonData: ComparisonDataPoint[] = [
    { name: '独占关键词', value: keywordOverlap.filter((k) => k.ourRank > 0 &&
      k.compARank === 0 && k.compBRank === 0 && k.compCRank === 0 && k.compDRank === 0).length, color: '#1677ff' },
    ...competitors.slice(0, 4).map((c: CompetitorItem, i: number) => {
      const dataKey = `comp${String.fromCharCode(65 + i)}Rank`;
      return {
        name: c.name || c.domain,
        value: keywordOverlap.filter((k: any) => (k[dataKey] || 0) > 0).length,
        color: undefined,
      };
    }),
  ].filter((d) => d.value > 0);

  // Competitor table columns
  const competitorColumns = [
    {
      title: '竞品', dataIndex: 'name', key: 'name', width: 160,
      render: (name: string, record: CompetitorItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{record.domain}</Text>
        </Space>
      ),
    },
    { title: '关键词', dataIndex: 'keywords', key: 'keywords', width: 90,
      sorter: (a: CompetitorItem, b: CompetitorItem) => (a.keywords || 0) - (b.keywords || 0),
    },
    { title: '预估流量', dataIndex: 'traffic', key: 'traffic', width: 100,
      render: (t: number) => t ? t.toLocaleString() : '-',
    },
    { title: 'DA', dataIndex: 'domainAuthority', key: 'domainAuthority', width: 80,
      render: (da: number) => {
        const color = getDAColor(da);
        return <Tag color={color}>{da || '-'}</Tag>;
      },
    },
    { title: '平均排名', dataIndex: 'avgPosition', key: 'avgPosition', width: 100,
      render: (pos: number) => pos ? <Tag color={getRankColor(pos)}>{pos.toFixed(1)}</Tag> : '-',
    },
    { title: '外链', dataIndex: 'backlinks', key: 'backlinks', width: 80,
      render: (v: number) => v?.toLocaleString() || '-',
    },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: unknown, record: CompetitorItem) => (
        <Popconfirm title="确认移除该竞品？" onConfirm={() => handleRemoveCompetitor(record.id)}>
          <Button type="link" danger size="small" icon={<DeleteOutlined />}>移除</Button>
        </Popconfirm>
      ),
    },
  ];

  // Overlap table columns
  const overlapColumns = [
    {
      title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 180,
      render: (kw: string) => <Text strong>{kw}</Text>,
    },
    {
      title: '我们', dataIndex: 'ourRank', key: 'ourRank', width: 80,
      render: (r: number) => <Tag color={r > 0 ? getRankColor(r) : 'default'}>{r > 0 ? r : '-'}</Tag>,
    },
    ...competitors.slice(0, 4).map((c: CompetitorItem, i: number) => {
      const dataKey = `comp${String.fromCharCode(65 + i)}Rank`;
      return {
        title: c.name || c.domain,
        dataIndex: dataKey,
        key: dataKey,
        width: 80,
        render: (r: number) => <Tag>{r > 0 ? r : '-'}</Tag>,
      };
    }),
  ];

  // Domain Overview - Top Keywords columns
  const domainTopKeywordsColumns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', ellipsis: true,
      render: (kw: string) => <Text strong>{kw}</Text> },
    { title: '排名', dataIndex: 'position', key: 'position', width: 80,
      render: (pos: number) => <Tag color={getRankColor(pos)}>{pos || '-'}</Tag> },
    { title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 100,
      render: (v: number) => v ? v.toLocaleString() : '-' },
    { title: '流量', dataIndex: 'traffic', key: 'traffic', width: 100,
      render: (v: number) => v ? v.toLocaleString() : '-' },
  ];

  // Top Pages columns
  const topPagesColumns = [
    { title: '页面URL', dataIndex: 'url', key: 'url', ellipsis: true,
      render: (u: string) => <Text code style={{ fontSize: 11 }}>{u}</Text> },
    { title: '预估流量', dataIndex: 'estimatedTraffic', key: 'estimatedTraffic', width: 120,
      render: (v: number) => v ? v.toLocaleString() : '-' },
    { title: '关键词数', dataIndex: 'keywordCount', key: 'keywordCount', width: 100,
      render: (v: number) => <Tag>{v ?? 0}</Tag> },
    { title: 'Top 关键词', dataIndex: 'topKeyword', key: 'topKeyword', width: 180, ellipsis: true,
      render: (kw: string) => kw ? <Text strong>{kw}</Text> : '-' },
  ];

  const tabItems = [
    {
      key: 'overview',
      label: <span><TrophyOutlined /> 竞品概览</span>,
      children: (
        <>
          {/* Competitor capability radar */}
          <Card title="竞品能力对比" style={{ marginBottom: 24, borderRadius: 8 }}>
            {radarData.length > 0 ? (
              <RadarChart
                data={radarData}
                height={380}
                maxValue={100}
                shape="polygon"
              />
            ) : (
              <EmptyState scene="data" description="暂无竞品数据，请添加竞品" />
            )}
          </Card>

          {/* Competitor table */}
          <Card
            title="竞品列表"
            style={{ borderRadius: 8 }}
            extra={
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                添加竞品
              </Button>
            }
          >
            {competitors.length > 0 ? (
              <Table
                columns={competitorColumns}
                dataSource={competitors}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                size="middle"
              />
            ) : (
              <EmptyState
                scene="data"
                description="暂无竞品，点击「添加竞品」开始监控"
                action={{
                  text: '添加竞品',
                  onClick: () => setModalOpen(true),
                  icon: <PlusOutlined />,
                }}
              />
            )}
          </Card>
        </>
      ),
    },
    {
      key: 'overlap',
      label: <span><SwapOutlined /> 关键词重叠</span>,
      children: (
        <>
          <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={10}>
              <Card title="关键词重叠分布" style={{ borderRadius: 8 }}>
                {overlapDistributionData.length > 0 ? (
                  <DistributionChart
                    data={overlapDistributionData}
                    type="donut"
                    height={320}
                    centerLabel={{
                      label: '总关键词',
                      value: `${keywordOverlap.length}`,
                    }}
                  />
                ) : (
                  <EmptyState scene="data" description="暂无重叠数据" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={14}>
              <Card title="共享关键词排名对比" style={{ borderRadius: 8 }}>
                {keywordOverlap.length > 0 ? (
                  <Table
                    columns={overlapColumns}
                    dataSource={keywordOverlap.slice(0, 10)}
                    rowKey={(r: OverlapItem) => r.keyword}
                    pagination={false}
                    size="small"
                  />
                ) : (
                  <EmptyState scene="data" description="暂无共享关键词数据" />
                )}
              </Card>
            </Col>
          </Row>

          {/* NEW: Visual keyword overlap comparison */}
          {overlapComparisonData.length > 0 && (
            <Card title={<><BarChartOutlined /> 关键词重叠对比</>} style={{ borderRadius: 8 }}>
              <ComparisonChart
                data={overlapComparisonData}
                height={300}
                title=""
                showLabel
              />
            </Card>
          )}
        </>
      ),
    },
    {
      key: 'traffic',
      label: <span><RiseOutlined /> 流量对比</span>,
      children: (
        <Card title="预估流量对比" style={{ borderRadius: 8 }}>
          {trafficComparisonData.length > 1 ? (
            <ComparisonChart
              data={trafficComparisonData}
              horizontal
              height={380}
              unit=" 次"
              showLabel
            />
          ) : (
            <EmptyState scene="data" description="暂无流量对比数据" />
          )}
        </Card>
      ),
    },
    // =============================================
    // NEW TAB: 域名总览
    // =============================================
    {
      key: 'domain-overview',
      label: <span><GlobalOutlined /> 域名总览</span>,
      children: (
        <>
          {competitors.length === 0 ? (
            <EmptyState
              scene="data"
              title="暂无竞品"
              description="请先添加竞品域名"
              action={{ text: '添加竞品', icon: <PlusOutlined />, onClick: () => setModalOpen(true) }}
            />
          ) : (
            <>
              <Card style={{ marginBottom: 24, borderRadius: 8 }}>
                <Row gutter={[16, 16]} align="middle">
                  <Col>
                    <Text strong style={{ marginRight: 8 }}>选择竞品域名：</Text>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Select
                      value={selectedDomain || undefined}
                      onChange={(v) => {
                        setSelectedDomain(v);
                        loadDomainOverview(v);
                      }}
                      style={{ width: '100%' }}
                      placeholder="选择竞品域名"
                      showSearch
                      optionFilterProp="label"
                      options={competitors.map((c) => ({
                        value: c.domain,
                        label: `${c.name} (${c.domain})`,
                      }))}
                    />
                  </Col>
                </Row>
              </Card>

              {domainOverviewLoading ? (
                <LoadingSkeleton type="page" />
              ) : domainOverview ? (
                <>
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={12} sm={6}>
                      <StatCard
                        title="总关键词"
                        value={domainOverview.totalKeywords || 0}
                        icon={<AimOutlined />}
                        color="#1677ff"
                      />
                    </Col>
                    <Col xs={12} sm={6}>
                      <StatCard
                        title="预估流量"
                        value={(domainOverview.estimatedTraffic || 0).toLocaleString()}
                        icon={<RiseOutlined />}
                        color="#52c41a"
                      />
                    </Col>
                    <Col xs={12} sm={6}>
                      <StatCard
                        title="Top 3"
                        value={domainOverview.rankingDistribution?.top3 || 0}
                        icon={<TrophyOutlined />}
                        color="#faad14"
                      />
                    </Col>
                    <Col xs={12} sm={6}>
                      <StatCard
                        title="Top 10"
                        value={domainOverview.rankingDistribution?.top10 || 0}
                        icon={<EyeOutlined />}
                        color="#722ed1"
                      />
                    </Col>
                  </Row>

                  {/* Ranking distribution for domain */}
                  {domainOverview.rankingDistribution && (
                    <Card title="排名分布" style={{ marginBottom: 24, borderRadius: 8 }}>
                      <ComparisonChart
                        data={[
                          { name: '1-3位', value: domainOverview.rankingDistribution.top3 || 0, color: '#52c41a' },
                          { name: '4-10位', value: domainOverview.rankingDistribution.top10 || 0, color: '#1677ff' },
                          { name: '11-20位', value: domainOverview.rankingDistribution.top20 || 0, color: '#faad14' },
                          { name: '21-50位', value: domainOverview.rankingDistribution.top50 || 0, color: '#fa8c16' },
                          { name: '50+', value: domainOverview.rankingDistribution.other || 0, color: '#ff4d4f' },
                        ]}
                        height={250}
                        title=""
                        showLabel
                      />
                    </Card>
                  )}

                  {/* Top Keywords */}
                  {domainOverview.topKeywords && domainOverview.topKeywords.length > 0 && (
                    <Card title="Top 关键词" style={{ borderRadius: 8 }}>
                      <Table
                        columns={domainTopKeywordsColumns}
                        dataSource={domainOverview.topKeywords}
                        rowKey="keyword"
                        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 个关键词` }}
                        size="middle"
                      />
                    </Card>
                  )}
                </>
              ) : (
                <EmptyState scene="data" title="暂无域名数据" description="选择竞品域名后点击查询" />
              )}
            </>
          )}
        </>
      ),
    },
    // =============================================
    // NEW TAB: 流量页面
    // =============================================
    {
      key: 'top-pages',
      label: <span><EyeOutlined /> 流量页面</span>,
      children: (
        <>
          {competitors.length === 0 ? (
            <EmptyState
              scene="data"
              title="暂无竞品"
              description="请先添加竞品域名"
              action={{ text: '添加竞品', icon: <PlusOutlined />, onClick: () => setModalOpen(true) }}
            />
          ) : (
            <>
              <Card style={{ marginBottom: 24, borderRadius: 8 }}>
                <Row gutter={[16, 16]} align="middle">
                  <Col>
                    <Text strong style={{ marginRight: 8 }}>选择竞品域名：</Text>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Select
                      value={topPagesDomain || undefined}
                      onChange={(v) => {
                        setTopPagesDomain(v);
                        loadTopPages(v);
                      }}
                      style={{ width: '100%' }}
                      placeholder="选择竞品域名"
                      showSearch
                      optionFilterProp="label"
                      options={competitors.map((c) => ({
                        value: c.domain,
                        label: `${c.name} (${c.domain})`,
                      }))}
                    />
                  </Col>
                </Row>
              </Card>

              {topPagesLoading ? (
                <LoadingSkeleton type="page" />
              ) : topPages.length > 0 ? (
                <Card title="Top 流量页面" style={{ borderRadius: 8 }}>
                  <Table
                    columns={topPagesColumns}
                    dataSource={topPages}
                    rowKey="url"
                    pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 个页面` }}
                    size="middle"
                    scroll={{ x: 700 }}
                  />
                </Card>
              ) : (
                <EmptyState scene="data" title="暂无流量页面数据" description="选择竞品域名后点击查询" />
              )}
            </>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="竞品分析"
        subtitle={`项目: ${project?.name || ''} (${project?.domain || ''})`}
        showCountrySelector
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              添加竞品
            </Button>
          </Space>
        }
      />

      {/* KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="竞品数量"
            value={totalCompetitors}
            icon={<TeamOutlined />}
            color="#1677ff"
            subtitle={`监控 ${totalCompetitors} 个竞品`}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="共享关键词"
            value={sharedKeywords}
            icon={<AimOutlined />}
            color="#52c41a"
            subtitle={`${overlapKeywords.length} 个重叠`}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="流量差距"
            value={trafficGap.toLocaleString()}
            icon={<SwapOutlined />}
            color="#fa8c16"
            subtitle="竞品总流量 - 我方流量"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="重叠率"
            value={`${overlapPct}%`}
            icon={<PercentageOutlined />}
            color="#722ed1"
            subtitle="关键词重叠占比"
          />
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        size="large"
        items={tabItems}
      />

      {/* Add competitor modal */}
      <Modal
        title="添加竞品"
        open={modalOpen}
        onOk={handleAddCompetitor}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={adding}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="竞品名称"
            rules={[{ required: true, message: '请输入竞品名称' }]}
          >
            <Input placeholder="例如 Competitor Inc." />
          </Form.Item>
          <Form.Item
            name="domain"
            label="竞品域名"
            rules={[{ required: true, message: '请输入竞品域名' }]}
          >
            <Input placeholder="例如 competitor.com" prefix={<GlobalOutlined />} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Competitors;