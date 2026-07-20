import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Button, Tag, Typography, Row, Col, Space,
  Input, Select, message, Tabs, Progress, Divider, Tooltip,
} from 'antd';
import {
  ReloadOutlined, LinkOutlined, GlobalOutlined, RiseOutlined,
  SearchOutlined, ThunderboltOutlined, TrophyOutlined,
  CheckCircleOutlined, CloseCircleOutlined, PieChartOutlined,
  LineChartOutlined, AimOutlined, FallOutlined,
  PlusOutlined, MinusOutlined, WarningOutlined,
  NodeIndexOutlined, SwapOutlined, ApartmentOutlined,
  FontSizeOutlined, BarChartOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { TrendChart, DistributionChart, ComparisonChart } from '@/components/charts';
import { useStore } from '@/store';
import { backlinkAPI } from '@/services/backlinks';
import type {
  ReferringDomain, AnchorTextItem, LinkGapItem, LinkGapResult, Backlink, AnchorTextResult,
} from '@/services/backlinks';

const { Text, Title } = Typography;

// ============================================================================
// Constants
// ============================================================================

const OPPORTUNITY_COLORS: Record<string, string> = {
  high: '#ff4d4f',
  medium: '#faad14',
  low: '#52c41a',
};

const OPPORTUNITY_LABELS: Record<string, string> = {
  high: '高价值',
  medium: '中价值',
  low: '低价值',
};

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

  // ============================================================================
  // NEW TAB STATES
  // ============================================================================

  // ---- 引用域 (referring-domains) ----
  const [refDomains, setRefDomains] = useState<ReferringDomain[]>([]);
  const [refDomainsTotal, setRefDomainsTotal] = useState(0);
  const [refDomainsPage, setRefDomainsPage] = useState(1);
  const [refDomainsPageSize, setRefDomainsPageSize] = useState(10);
  const [refDomainsLoading, setRefDomainsLoading] = useState(false);
  const [refDomainsError, setRefDomainsError] = useState<string | null>(null);

  // ---- 锚文本 (anchor-text) ----
  const [anchorTextResult, setAnchorTextResult] = useState<AnchorTextResult | null>(null);
  const [anchorTextLoading, setAnchorTextLoading] = useState(false);
  const [anchorTextError, setAnchorTextError] = useState<string | null>(null);

  // ---- 新增/丢失 (new-lost) ----
  const [newBacklinks, setNewBacklinks] = useState<Backlink[]>([]);
  const [lostBacklinks, setLostBacklinks] = useState<Backlink[]>([]);
  const [newLostLoading, setNewLostLoading] = useState(false);
  const [newLostError, setNewLostError] = useState<string | null>(null);
  const [newLostSubTab, setNewLostSubTab] = useState('new');

  // ---- 外链差距 (link-gap) ----
  const [competitorDomains, setCompetitorDomains] = useState<string[]>([]);
  const [competitorInput, setCompetitorInput] = useState('');
  const [linkGapResult, setLinkGapResult] = useState<LinkGapResult | null>(null);
  const [linkGapLoading, setLinkGapLoading] = useState(false);
  const [linkGapError, setLinkGapError] = useState<string | null>(null);

  // ============================================================================
  // ORIGINAL DATA LOADING
  // ============================================================================

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

  // ============================================================================
  // NEW TAB DATA LOADING
  // ============================================================================

  // ---- 引用域 ----
  const loadReferringDomains = useCallback(async (p?: number, ps?: number) => {
    if (!projectId) return;
    setRefDomainsLoading(true);
    setRefDomainsError(null);
    try {
      const res: any = await backlinkAPI.getReferringDomains(projectId, {
        page: p ?? refDomainsPage,
        pageSize: ps ?? refDomainsPageSize,
      });
      const list = Array.isArray(res) ? res : (res?.data || []);
      const t = res?.total ?? list.length;
      setRefDomains(list);
      setRefDomainsTotal(t);
    } catch (err: any) {
      setRefDomainsError(err?.response?.data?.error?.message || err?.message || '加载引用域失败');
    } finally {
      setRefDomainsLoading(false);
    }
  }, [projectId, refDomainsPage, refDomainsPageSize]);

  // ---- 锚文本 ----
  const loadAnchorText = useCallback(async () => {
    if (!projectId) return;
    setAnchorTextLoading(true);
    setAnchorTextError(null);
    try {
      const res: any = await backlinkAPI.getAnchorText(projectId);
      const data = res?.data !== undefined ? res.data : res;
      setAnchorTextResult(data);
    } catch (err: any) {
      setAnchorTextError(err?.response?.data?.error?.message || err?.message || '加载锚文本失败');
    } finally {
      setAnchorTextLoading(false);
    }
  }, [projectId]);

  // ---- 新增/丢失 ----
  const loadNewLost = useCallback(async () => {
    if (!projectId) return;
    setNewLostLoading(true);
    setNewLostError(null);
    try {
      const [newRes, lostRes] = await Promise.all([
        backlinkAPI.getNewBacklinks(projectId),
        backlinkAPI.getLostBacklinks(projectId),
      ]);
      const newList = Array.isArray(newRes) ? newRes as Backlink[] : ((newRes as any)?.data || []);
      const lostList = Array.isArray(lostRes) ? lostRes as Backlink[] : ((lostRes as any)?.data || []);
      setNewBacklinks(newList);
      setLostBacklinks(lostList);
    } catch (err: any) {
      setNewLostError(err?.response?.data?.error?.message || err?.message || '加载外链变更失败');
    } finally {
      setNewLostLoading(false);
    }
  }, [projectId]);

  // ---- 外链差距 ----
  const handleAddCompetitor = useCallback(() => {
    const trimmed = competitorInput.trim().replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '');
    if (!trimmed) return;
    if (competitorDomains.includes(trimmed)) {
      message.warning('该域名已存在');
      return;
    }
    if (competitorDomains.length >= 10) {
      message.warning('最多支持10个竞品域名');
      return;
    }
    setCompetitorDomains((prev) => [...prev, trimmed]);
    setCompetitorInput('');
  }, [competitorInput, competitorDomains]);

  const handleRemoveCompetitor = useCallback((domain: string) => {
    setCompetitorDomains((prev) => prev.filter((d) => d !== domain));
  }, []);

  const handleLinkGap = useCallback(async () => {
    if (!projectId || competitorDomains.length === 0) {
      message.warning('请至少添加一个竞品域名');
      return;
    }
    setLinkGapLoading(true);
    setLinkGapError(null);
    setLinkGapResult(null);
    try {
      const res: any = await backlinkAPI.getLinkGap(projectId, competitorDomains);
      const data = res?.data !== undefined ? res.data : res;
      setLinkGapResult(data);
      if (data && !data.missingSources?.length) {
        message.info('未发现外链差距，所有竞品的外链都已覆盖');
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.error?.message || err?.message || '外链差距分析失败';
      setLinkGapError(errMsg);
      message.error(errMsg);
    } finally {
      setLinkGapLoading(false);
    }
  }, [projectId, competitorDomains]);

  // Load data when tab switches
  useEffect(() => {
    if (activeTab === 'referring-domains' && refDomains.length === 0 && !refDomainsLoading && !refDomainsError) {
      loadReferringDomains();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'anchor-text' && !anchorTextResult && !anchorTextLoading && !anchorTextError) {
      loadAnchorText();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'new-lost' && newBacklinks.length === 0 && lostBacklinks.length === 0 && !newLostLoading && !newLostError) {
      loadNewLost();
    }
  }, [activeTab]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

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

  // ============================================================================
  // COLUMNS
  // ============================================================================

  // ---- Original backlinks columns ----
  const backlinkColumns = [
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

  // ---- Referring domains columns ----
  const refDomainColumns = [
    {
      title: '域名', dataIndex: 'domain', key: 'domain', width: 250, ellipsis: true,
      render: (domain: string) => (
        <Space>
          <GlobalOutlined style={{ color: '#1677ff' }} />
          <Text strong>{domain}</Text>
        </Space>
      ),
    },
    {
      title: '外链数', dataIndex: 'backlinks', key: 'backlinks', width: 110,
      sorter: (a: any, b: any) => (a.backlinks || 0) - (b.backlinks || 0),
      render: (val: number) => <Text strong style={{ color: '#1677ff' }}>{(val ?? 0).toLocaleString()}</Text>,
    },
    {
      title: '首次发现', dataIndex: 'firstSeen', key: 'firstSeen', width: 140,
      render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-',
    },
    {
      title: '最近发现', dataIndex: 'lastSeen', key: 'lastSeen', width: 140,
      render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-',
    },
    {
      title: 'DA', dataIndex: 'domainAuthority', key: 'domainAuthority', width: 80,
      render: (da: number | undefined) => {
        if (da === undefined || da === null) return <Tag>--</Tag>;
        const color = da >= 50 ? '#52c41a' : da >= 30 ? '#faad14' : '#ff4d4f';
        return <Tag color={color}>{da}</Tag>;
      },
    },
    {
      title: 'Dofollow', dataIndex: 'isDofollow', key: 'isDofollow', width: 90,
      render: (isDofollow: boolean) => (
        <Tag color={isDofollow ? 'green' : 'orange'} icon={isDofollow ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {isDofollow ? 'Dofollow' : 'Nofollow'}
        </Tag>
      ),
    },
  ];

  // ---- Anchor text columns ----
  const anchorTextColumns = [
    {
      title: '锚文本', dataIndex: 'text', key: 'text', width: 200, ellipsis: true,
      render: (text: string) => <Text strong>{text || '(无锚文本)'}</Text>,
    },
    {
      title: '数量', dataIndex: 'count', key: 'count', width: 100,
      sorter: (a: any, b: any) => (a.count || 0) - (b.count || 0),
      render: (val: number) => <Text strong>{(val ?? 0).toLocaleString()}</Text>,
    },
    {
      title: '占比', dataIndex: 'percentage', key: 'percentage', width: 200,
      sorter: (a: any, b: any) => (a.percentage || 0) - (b.percentage || 0),
      render: (pct: number) => {
        const val = pct ?? 0;
        const color = val > 30 ? '#1677ff' : val > 10 ? '#52c41a' : '#faad14';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Progress
              percent={Math.round(val)}
              size="small"
              strokeColor={color}
              style={{ flex: 1, margin: 0 }}
            />
            <Text style={{ minWidth: 45, textAlign: 'right' }}>{val.toFixed(1)}%</Text>
          </div>
        );
      },
    },
  ];

  // ---- Link gap columns ----
  const linkGapColumns = [
    {
      title: '域名', dataIndex: 'domain', key: 'domain', width: 220, ellipsis: true,
      render: (domain: string) => (
        <Space>
          <GlobalOutlined style={{ color: '#1677ff' }} />
          <Text strong>{domain}</Text>
        </Space>
      ),
    },
    {
      title: 'DA', dataIndex: 'domainAuthority', key: 'domainAuthority', width: 80,
      render: (da: number | undefined) => {
        if (da === undefined || da === null) return <Tag>--</Tag>;
        const color = da >= 50 ? '#52c41a' : da >= 30 ? '#faad14' : '#ff4d4f';
        return <Tag color={color}>{da}</Tag>;
      },
    },
    {
      title: '外链数', dataIndex: 'backlinks', key: 'backlinks', width: 100,
      render: (val: number) => <Text strong>{(val ?? 0).toLocaleString()}</Text>,
    },
    {
      title: '竞品使用', dataIndex: 'competitorsUsing', key: 'competitorsUsing', width: 200,
      render: (competitors: string[]) => {
        if (!competitors || competitors.length === 0) return <Text type="secondary">--</Text>;
        return (
          <Space wrap size={[0, 4]}>
            {competitors.map((c, i) => (
              <Tag key={i} color="blue">{c}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '机会等级', dataIndex: 'opportunity', key: 'opportunity', width: 100,
      render: (opp: string) => {
        const color = OPPORTUNITY_COLORS[opp] || '#d9d9d9';
        const label = OPPORTUNITY_LABELS[opp] || opp || '--';
        return <Tag color={color}>{label}</Tag>;
      },
    },
  ];

  // ============================================================================
  // STATE: no project
  // ============================================================================
  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="外链分析" subtitle="请先选择项目" showCountrySelector showDateRange />
        <EmptyState scene="data" title="请先选择项目" description="请从顶部导航栏选择一个项目以开始外链分析" />
      </div>
    );
  }

  // ============================================================================
  // STATE: loading
  // ============================================================================
  if (loading && backlinks.length === 0) {
    return (
      <div className="page-container">
        <PageHeader title="外链分析" subtitle={`${projectName} - 反向链接监控`} showCountrySelector showDateRange />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ============================================================================
  // STATE: error
  // ============================================================================
  if (error && backlinks.length === 0) {
    return (
      <div className="page-container">
        <PageHeader title="外链分析" subtitle={`${projectName} - 反向链接监控`} showCountrySelector showDateRange />
        <ErrorState message={error} onRetry={() => loadAll()} />
      </div>
    );
  }

  // ============================================================================
  // TAB ITEMS
  // ============================================================================

  const tabItems = [
    // ========================================================================
    // TAB 1: 外链概览 (original)
    // ========================================================================
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
                columns={backlinkColumns}
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

    // ========================================================================
    // TAB 2: 锚文本分布 (original)
    // ========================================================================
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

    // ========================================================================
    // TAB 3: 增长趋势 (original)
    // ========================================================================
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

    // ========================================================================
    // TAB 4: 引用域 (NEW)
    // ========================================================================
    {
      key: 'referring-domains',
      label: <span><ApartmentOutlined /> 引用域</span>,
      children: (
        <>
          {refDomainsLoading && refDomains.length === 0 && (
            <LoadingSkeleton type="table" />
          )}

          {refDomainsError && !refDomainsLoading && (
            <ErrorState message={refDomainsError} onRetry={() => loadReferringDomains()} />
          )}

          {!refDomainsLoading && !refDomainsError && refDomains.length === 0 && (
            <EmptyState
              scene="data"
              title="暂无引用域数据"
              description="刷新外链数据后将显示引用域名列表"
              action={{ text: '点击加载', icon: <ReloadOutlined />, onClick: () => loadReferringDomains() }}
            />
          )}

          {(refDomainsLoading || refDomains.length > 0) && (
            <Card
              title={
                <span>
                  <GlobalOutlined style={{ marginRight: 8 }} />
                  引用域名列表
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
                    (共 {refDomainsTotal} 个引用域)
                  </Text>
                </span>
              }
              extra={
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => loadReferringDomains(refDomainsPage, refDomainsPageSize)}
                  loading={refDomainsLoading}
                >
                  刷新
                </Button>
              }
            >
              <Table
                columns={refDomainColumns}
                dataSource={refDomains}
                rowKey="domain"
                loading={refDomainsLoading}
                pagination={{
                  current: refDomainsPage,
                  pageSize: refDomainsPageSize,
                  total: refDomainsTotal,
                  showSizeChanger: true,
                  showTotal: (t) => `共 ${t} 个引用域`,
                  onChange: (p, ps) => {
                    setRefDomainsPage(p);
                    setRefDomainsPageSize(ps);
                    loadReferringDomains(p, ps);
                  },
                }}
                size="middle"
                scroll={{ x: 850 }}
              />
            </Card>
          )}
        </>
      ),
    },

    // ========================================================================
    // TAB 5: 锚文本 (NEW)
    // ========================================================================
    {
      key: 'anchor-text',
      label: <span><FontSizeOutlined /> 锚文本</span>,
      children: (
        <>
          {anchorTextLoading && (
            <LoadingSkeleton type="page" />
          )}

          {anchorTextError && !anchorTextLoading && (
            <ErrorState message={anchorTextError} onRetry={loadAnchorText} />
          )}

          {!anchorTextLoading && !anchorTextError && !anchorTextResult && (
            <EmptyState
              scene="data"
              title="暂无锚文本数据"
              description="点击加载按钮获取锚文本分析数据"
              action={{ text: '加载数据', icon: <ReloadOutlined />, onClick: loadAnchorText, loading: anchorTextLoading }}
            />
          )}

          {anchorTextResult && !anchorTextLoading && (
            <>
              {/* Summary Stats */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="总锚文本数"
                    value={anchorTextResult.total ?? 0}
                    icon={<FontSizeOutlined />}
                    color="#1677ff"
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="品牌词数量"
                    value={anchorTextResult.brandedCount ?? 0}
                    icon={<TrophyOutlined />}
                    color="#52c41a"
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="品牌词占比"
                    value={`${(anchorTextResult.brandedPercentage ?? 0).toFixed(1)}%`}
                    icon={<BarChartOutlined />}
                    color="#fa8c16"
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="非品牌词数量"
                    value={(anchorTextResult.total ?? 0) - (anchorTextResult.brandedCount ?? 0)}
                    icon={<AimOutlined />}
                    color="#722ed1"
                  />
                </Col>
              </Row>

              {/* Anchor Text Table */}
              <Card
                title={
                  <span>
                    <FontSizeOutlined style={{ marginRight: 8 }} />
                    锚文本详情
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
                      (共 {anchorTextResult.anchors?.length ?? 0} 条)
                    </Text>
                  </span>
                }
                extra={
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={loadAnchorText}
                    loading={anchorTextLoading}
                  >
                    刷新
                  </Button>
                }
              >
                {anchorTextResult.anchors && anchorTextResult.anchors.length > 0 ? (
                  <Table
                    columns={anchorTextColumns}
                    dataSource={anchorTextResult.anchors.map((item: any, idx: number) => ({
                      ...item,
                      key: item.text || idx,
                    }))}
                    pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条锚文本` }}
                    size="middle"
                    scroll={{ x: 500 }}
                  />
                ) : (
                  <EmptyState scene="data" title="暂无锚文本数据" />
                )}
              </Card>
            </>
          )}
        </>
      ),
    },

    // ========================================================================
    // TAB 6: 新增/丢失 (NEW)
    // ========================================================================
    {
      key: 'new-lost',
      label: <span><SwapOutlined /> 新增/丢失</span>,
      children: (
        <>
          {newLostLoading && (
            <LoadingSkeleton type="page" />
          )}

          {newLostError && !newLostLoading && (
            <ErrorState message={newLostError} onRetry={loadNewLost} />
          )}

          {!newLostLoading && !newLostError && newBacklinks.length === 0 && lostBacklinks.length === 0 && (
            <EmptyState
              scene="data"
              title="暂无外链变更数据"
              description="点击加载按钮获取新增和丢失的外链数据"
              action={{ text: '加载数据', icon: <ReloadOutlined />, onClick: loadNewLost, loading: newLostLoading }}
            />
          )}

          {!newLostLoading && !newLostError && (newBacklinks.length > 0 || lostBacklinks.length > 0) && (
            <>
              {/* Summary Cards */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={8}>
                  <StatCard
                    title="新增外链"
                    value={newBacklinks.length}
                    icon={<PlusOutlined />}
                    color="#52c41a"
                    trend={{ value: newBacklinks.length, isUpGood: true }}
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <StatCard
                    title="丢失外链"
                    value={lostBacklinks.length}
                    icon={<MinusOutlined />}
                    color="#ff4d4f"
                    trend={{ value: -lostBacklinks.length, isUpGood: false }}
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <StatCard
                    title="净变化"
                    value={newBacklinks.length - lostBacklinks.length}
                    icon={<SwapOutlined />}
                    color={newBacklinks.length - lostBacklinks.length >= 0 ? '#1677ff' : '#ff4d4f'}
                    prefix={newBacklinks.length - lostBacklinks.length >= 0 ? '+' : ''}
                  />
                </Col>
              </Row>

              {/* Sub-tabs */}
              <Tabs
                activeKey={newLostSubTab}
                onChange={setNewLostSubTab}
                items={[
                  {
                    key: 'new',
                    label: <span><PlusOutlined /> 新增外链 ({newBacklinks.length})</span>,
                    children: (
                      <Card>
                        {newBacklinks.length > 0 ? (
                          <Table
                            columns={backlinkColumns}
                            dataSource={newBacklinks}
                            rowKey="id"
                            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条新增外链` }}
                            size="middle"
                            scroll={{ x: 1400 }}
                          />
                        ) : (
                          <EmptyState
                            scene="data"
                            title="暂无新增外链"
                            description="当前时间段内没有发现新的外链"
                          />
                        )}
                      </Card>
                    ),
                  },
                  {
                    key: 'lost',
                    label: <span><MinusOutlined /> 丢失外链 ({lostBacklinks.length})</span>,
                    children: (
                      <Card>
                        {lostBacklinks.length > 0 ? (
                          <Table
                            columns={backlinkColumns}
                            dataSource={lostBacklinks}
                            rowKey="id"
                            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条丢失外链` }}
                            size="middle"
                            scroll={{ x: 1400 }}
                          />
                        ) : (
                          <EmptyState
                            scene="data"
                            title="暂无丢失外链"
                            description="当前时间段内没有发现丢失的外链"
                          />
                        )}
                      </Card>
                    ),
                  },
                ]}
              />
            </>
          )}
        </>
      ),
    },

    // ========================================================================
    // TAB 7: 外链差距 (NEW)
    // ========================================================================
    {
      key: 'link-gap',
      label: <span><NodeIndexOutlined /> 外链差距</span>,
      children: (
        <div>
          {/* Form */}
          <Card style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 15 }}>
                <NodeIndexOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                竞品域名
              </Text>
              <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                添加竞品域名，分析哪些外链来源被竞品使用但你的项目尚未获得
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, maxWidth: 500 }}>
                  <Input
                    placeholder="输入竞品域名，如：competitor.com"
                    value={competitorInput}
                    onChange={(e) => setCompetitorInput(e.target.value)}
                    onPressEnter={handleAddCompetitor}
                    prefix={<GlobalOutlined />}
                    disabled={competitorDomains.length >= 10}
                    suffix={
                      competitorInput.trim() ? (
                        <Button
                          type="link"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={handleAddCompetitor}
                          style={{ padding: 0 }}
                          disabled={competitorDomains.length >= 10}
                        >
                          添加
                        </Button>
                      ) : null
                    }
                  />
                </div>
                <Button
                  type="primary"
                  icon={<BarChartOutlined />}
                  onClick={handleLinkGap}
                  loading={linkGapLoading}
                  disabled={competitorDomains.length === 0}
                >
                  分析
                </Button>
              </div>
            </div>

            {/* Competitor tags */}
            {competitorDomains.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Space wrap size={[4, 8]}>
                  {competitorDomains.map((domain) => (
                    <Tag
                      key={domain}
                      closable
                      onClose={() => handleRemoveCompetitor(domain)}
                      color="blue"
                      style={{ fontSize: 13, padding: '2px 10px', margin: 0 }}
                    >
                      {domain}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
          </Card>

          {/* Loading */}
          {linkGapLoading && <LoadingSkeleton type="page" />}

          {/* Error */}
          {linkGapError && !linkGapLoading && (
            <ErrorState message={linkGapError} onRetry={handleLinkGap} />
          )}

          {/* Empty before analysis */}
          {!linkGapResult && !linkGapLoading && !linkGapError && (
            <EmptyState
              scene="search"
              title="开始外链差距分析"
              description="添加竞品域名后点击「分析」，发现你的项目尚未获得但被竞品使用的外链来源"
            />
          )}

          {/* Results */}
          {linkGapResult && !linkGapLoading && (
            <>
              {/* Stats */}
              {linkGapResult.totalMissing !== undefined && (
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={24} sm={8}>
                    <StatCard
                      title="缺失外链来源"
                      value={linkGapResult.totalMissing}
                      icon={<WarningOutlined />}
                      color="#ff4d4f"
                    />
                  </Col>
                  <Col xs={24} sm={8}>
                    <StatCard
                      title="分析竞品数"
                      value={linkGapResult.competitors?.length ?? 0}
                      icon={<GlobalOutlined />}
                      color="#1677ff"
                    />
                  </Col>
                  <Col xs={24} sm={8}>
                    <StatCard
                      title="项目域名"
                      value={linkGapResult.projectDomain || '--'}
                      icon={<LinkOutlined />}
                      color="#52c41a"
                    />
                  </Col>
                </Row>
              )}

              {/* Missing Sources Table */}
              <Card
                title={
                  <span>
                    <NodeIndexOutlined style={{ marginRight: 8 }} />
                    缺失外链来源
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
                      (共 {linkGapResult.missingSources?.length ?? 0} 条)
                    </Text>
                  </span>
                }
              >
                {linkGapResult.missingSources && linkGapResult.missingSources.length > 0 ? (
                  <Table
                    columns={linkGapColumns}
                    dataSource={linkGapResult.missingSources.map((item: any, idx: number) => ({
                      ...item,
                      key: item.domain || idx,
                    }))}
                    pagination={{
                      pageSize: 15,
                      showSizeChanger: true,
                      showTotal: (t: number) => `共 ${t} 个缺失来源`,
                    }}
                    size="middle"
                    scroll={{ x: 700 }}
                    locale={{ emptyText: '暂无缺失外链来源' }}
                  />
                ) : (
                  <EmptyState
                    scene="data"
                    title="未发现外链差距"
                    description="所有竞品使用的外链来源你的项目都已覆盖，继续保持！"
                  />
                )}
              </Card>
            </>
          )}
        </div>
      ),
    },
  ];

  // ============================================================================
  // RENDER
  // ============================================================================
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
      <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginTop: 8 }} items={tabItems} />
    </div>
  );
};

export default Backlinks;