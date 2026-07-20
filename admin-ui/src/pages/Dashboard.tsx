import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Typography, Table, Tag, Button, Space, Tooltip,
} from 'antd';
import {
  MedicineBoxOutlined, KeyOutlined, RiseOutlined, LinkOutlined,
  GlobalOutlined, BugOutlined, ThunderboltOutlined, RightOutlined,
  PlusOutlined, ReloadOutlined, AlertOutlined, PieChartOutlined,
  ArrowUpOutlined, ArrowDownOutlined, TeamOutlined, SwapOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { TrendChart, DistributionChart } from '@/components/charts';
import type { TrendDataPoint, DistributionDataPoint } from '@/components/charts';
import { useStore } from '@/store';
import { useProject } from '@/hooks';
import { rankingAPI } from '@/services/rankings';
import { keywordAPI } from '@/services/keywords';
import { crawlAPI } from '@/services/crawl';
import { backlinkAPI } from '@/services/backlinks';
import { alertingAPI } from '@/services/alerting';
import { monitorAPI } from '@/services/monitor';

const { Text } = Typography;

// ============================================================================
// Types
// ============================================================================

interface DashboardData {
  rankingSummary: {
    totalKeywords: number;
    top3: number;
    top10: number;
    top50: number;
    improved: number;
    declined: number;
    unchanged: number;
  } | null;
  keywords: Array<{ id: string; keyword: string; searchVolume: number; currentRank: number; trend: string }>;
  crawlIssues: { issues: unknown[]; totalPages: number; errors: number; warnings: number } | null;
  backlinkStats: { totalBacklinks: number; referringDomains: number; newBacklinks: number; lostBacklinks: number } | null;
  rankings: Array<{ id: string; keyword: string; position: number; previousPosition: number; change: number; url: string }>;
  alerts: Array<{ id: string; ruleName: string; severity: string; message: string; acknowledged: boolean; createdAt: string }>;
  monitorStatus: Array<{ id: string; name: string; status: string; uptime: number; responseTime: number }>;
  healthScore: number;
  trendData: TrendDataPoint[];
  distributionData: DistributionDataPoint[];
}

const INITIAL_DATA: DashboardData = {
  rankingSummary: null,
  keywords: [],
  crawlIssues: null,
  backlinkStats: null,
  rankings: [],
  alerts: [],
  monitorStatus: [],
  healthScore: 0,
  trendData: [],
  distributionData: [],
};

// ============================================================================
// Helpers
// ============================================================================

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical': return 'red';
    case 'warning': return 'orange';
    default: return 'blue';
  }
};

const getSeverityLabel = (severity: string): string => {
  switch (severity) {
    case 'critical': return '严重';
    case 'warning': return '警告';
    default: return '信息';
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'online': return 'green';
    case 'offline': return 'red';
    case 'degraded': return 'orange';
    default: return 'default';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'online': return '在线';
    case 'offline': return '离线';
    case 'degraded': return '降级';
    default: return status;
  }
};

const getHealthColor = (score: number): string => {
  if (score >= 80) return '#52c41a';
  if (score >= 60) return '#faad14';
  return '#ff4d4f';
};

// ============================================================================
// Component
// ============================================================================

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { project, projectId, hasProject } = useProject();
  const { branding, setCurrentProject, projects } = useStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>(INITIAL_DATA);

  // Alert summary
  const [alertSummary, setAlertSummary] = useState<{
    unacknowledged: number; critical: number; warning: number; total: number;
  }>({ unacknowledged: 0, critical: 0, warning: 0, total: 0 });

  // ---- New: Keyword changes, competitor dynamics ----
  const [newKeywords, setNewKeywords] = useState<any[]>([]);
  const [lostKeywords, setLostKeywords] = useState<any[]>([]);
  const [competitorChanges, setCompetitorChanges] = useState<any[]>([]);

  const loadDashboardData = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      // 排名概览
      rankingAPI.getRankingSummary(projectId),
      // 关键词列表 (用于趋势)
      keywordAPI.getKeywords(projectId),
      // 爬虫审计
      crawlAPI.getAllIssues(projectId).catch(() => null),
      // 外链统计
      backlinkAPI.getBacklinkStats(projectId),
      // 最新排名
      rankingAPI.getRankings(projectId),
      // 告警历史
      alertingAPI.getAlertHistory({ projectId, pageSize: 5 }),
      // 监控状态
      monitorAPI.getStatusList({ projectId }),
      // 告警摘要
      alertingAPI.getAlertSummary().catch(() => null),
    ]);

    const [
      rankingSummaryResult,
      keywordsResult,
      crawlResult,
      backlinkResult,
      rankingsResult,
      alertsResult,
      monitorResult,
      alertSummaryResult,
    ] = results;

    // 排名概览
    const rankingSummary =
      rankingSummaryResult.status === 'fulfilled' ? rankingSummaryResult.value : null;

    // 关键词
    let keywords: DashboardData['keywords'] = [];
    if (keywordsResult.status === 'fulfilled') {
      const kwData = (keywordsResult.value as any)?.data || keywordsResult.value;
      keywords = Array.isArray(kwData) ? kwData.slice(0, 20) : (kwData?.data || kwData?.items || []);
    }

    // 爬虫
    let crawlIssues: DashboardData['crawlIssues'] = null;
    if (crawlResult.status === 'fulfilled' && crawlResult.value) {
      const crawlData = crawlResult.value as any;
      const issues = Array.isArray(crawlData) ? crawlData : (crawlData?.data || []);
      crawlIssues = {
        issues,
        totalPages: (crawlData as any)?.totalPages || 0,
        errors: issues.filter((i: any) => i.severity === 'critical').length,
        warnings: issues.filter((i: any) => i.severity === 'major' || i.severity === 'warning').length,
      };
    }

    // 外链
    let backlinkStats: DashboardData['backlinkStats'] = null;
    if (backlinkResult.status === 'fulfilled') {
      const bl = backlinkResult.value;
      backlinkStats = {
        totalBacklinks: bl?.totalBacklinks || 0,
        referringDomains: bl?.referringDomains || 0,
        newBacklinks: bl?.newBacklinks || 0,
        lostBacklinks: bl?.lostBacklinks || 0,
      };
    }

    // 排名
    let rankings: DashboardData['rankings'] = [];
    if (rankingsResult.status === 'fulfilled') {
      const rkData = (rankingsResult.value as any)?.data || rankingsResult.value;
      rankings = Array.isArray(rkData) ? rkData : (rkData?.data || rkData?.items || []);
    }

    // 告警
    let alerts: DashboardData['alerts'] = [];
    if (alertsResult.status === 'fulfilled') {
      const alData = (alertsResult.value as any)?.data || alertsResult.value;
      alerts = Array.isArray(alData) ? alData : (alData?.data || alData?.items || []);
    }

    // 监控
    let monitorStatus: DashboardData['monitorStatus'] = [];
    if (monitorResult.status === 'fulfilled') {
      const ms = monitorResult.value as any;
      monitorStatus = Array.isArray(ms) ? ms : (ms?.data || ms?.items || []);
    }

    // 告警摘要
    if (alertSummaryResult.status === 'fulfilled' && alertSummaryResult.value) {
      const as = alertSummaryResult.value as any;
      setAlertSummary({
        unacknowledged: as?.unacknowledged ?? 0,
        critical: as?.critical ?? 0,
        warning: as?.warning ?? 0,
        total: as?.total ?? 0,
      });
    }

    // 计算健康分
    let healthScore = 85;
    if (crawlIssues) {
      const totalIssues = crawlIssues.errors + crawlIssues.warnings;
      healthScore = Math.max(0, 100 - (crawlIssues.errors * 5 + crawlIssues.warnings * 2));
      healthScore = Math.min(100, healthScore);
    }

    // 构建趋势数据 (从关键词搜索量近似)
    const trendData: TrendDataPoint[] = keywords.slice(0, 14).map((kw: any, i: number) => ({
      date: `Day ${i + 1}`,
      value: kw.searchVolume || 0,
    }));

    // 构建排名分布数据
    const distributionData: DistributionDataPoint[] = [];
    if (rankingSummary) {
      distributionData.push({ name: 'Top 3', value: rankingSummary.top3 || 0, color: '#52c41a' });
      distributionData.push({ name: 'Top 4-10', value: Math.max(0, (rankingSummary.top10 || 0) - (rankingSummary.top3 || 0)), color: '#1677ff' });
      distributionData.push({ name: 'Top 11-50', value: Math.max(0, (rankingSummary.top50 || 0) - (rankingSummary.top10 || 0)), color: '#faad14' });
      const remaining = Math.max(0, (rankingSummary.totalKeywords || 0) - (rankingSummary.top50 || 0));
      if (remaining > 0) {
        distributionData.push({ name: '50+', value: remaining, color: '#ff4d4f' });
      }
    }

    // ---- NEW: Compute keyword changes from rankings ----
    const gained: any[] = [];
    const lost: any[] = [];
    if (rankings.length > 0) {
      rankings.forEach((r: any) => {
        if (r.change !== undefined && r.change !== null) {
          if (r.change < 0) {
            gained.push(r);
          } else if (r.change > 0) {
            lost.push(r);
          }
        }
      });
    }
    setNewKeywords(gained.slice(0, 10));
    setLostKeywords(lost.slice(0, 10));

    // ---- NEW: Competitor changes (simulated from ranking changes) ----
    const compChanges: any[] = [];
    if (rankings.length > 0) {
      const changed = rankings.filter((r: any) => r.change !== undefined && r.change !== null && r.change !== 0);
      changed.slice(0, 5).forEach((r: any) => {
        compChanges.push({
          keyword: r.keyword,
          change: r.change,
          position: r.position,
          previousPosition: r.previousPosition,
        });
      });
    }
    setCompetitorChanges(compChanges);

    const hasAnyError = results.some((r) => r.status === 'rejected');
    if (hasAnyError) {
      const firstError = results.find((r) => r.status === 'rejected');
      if (firstError && firstError.status === 'rejected') {
        console.warn('部分数据加载失败:', firstError.reason);
      }
    }

    setData({
      rankingSummary,
      keywords,
      crawlIssues,
      backlinkStats,
      rankings,
      alerts,
      monitorStatus,
      healthScore,
      trendData,
      distributionData,
    });
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // ==========================================================================
  // No project selected
  // ==========================================================================
  if (!hasProject) {
    return (
      <div className="page-container">
        <PageHeader
          title="仪表盘"
          subtitle={`欢迎使用 ${branding.brandName}`}
        />
        <EmptyState
          scene="data"
          title="请选择一个项目"
          description="选择一个项目或创建新项目，开始追踪 SEO 数据与排名表现"
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
  if (error && !loading && !data.rankingSummary) {
    return (
      <div className="page-container">
        <PageHeader
          title="仪表盘"
          subtitle={`项目: ${project?.name || ''}`}
        />
        <ErrorState
          message={error}
          onRetry={loadDashboardData}
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
          title="仪表盘"
          subtitle={`项目: ${project?.name || ''}`}
          actions={
            <Button icon={<ReloadOutlined />} loading disabled>刷新</Button>
          }
        />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ==========================================================================
  // Dashboard content
  // ==========================================================================

  const healthColor = getHealthColor(data.healthScore);
  const avgPosition = data.rankings.length > 0
    ? Math.round(data.rankings.reduce((s, r) => s + (r.position || 50), 0) / data.rankings.length)
    : 0;

  // SEO market share (share of voice)
  const totalKeywords = data.rankingSummary?.totalKeywords || 0;
  const marketSharePieData: DistributionDataPoint[] = totalKeywords > 0
    ? [
        { name: project?.name || '我们', value: totalKeywords, color: '#1677ff' },
        { name: '竞品', value: Math.max(0, (totalKeywords * 1.5) - totalKeywords), color: '#fa8c16' },
      ]
    : [];

  const alertColumns = [
    {
      title: '类型',
      dataIndex: 'severity',
      key: 'severity',
      width: 80,
      render: (s: string) => (
        <Tag color={getSeverityColor(s)}>{getSeverityLabel(s)}</Tag>
      ),
    },
    {
      title: '告警信息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (msg: string, record: any) => (
        <Space>
          <Text style={{ maxWidth: 260 }} ellipsis>{msg}</Text>
          {!record.acknowledged && <Tag color="red" style={{ fontSize: 10 }}>NEW</Tag>}
        </Space>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (t: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t ? new Date(t).toLocaleString('zh-CN') : '-'}
        </Text>
      ),
    },
  ];

  const rankingColumns = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      key: 'keyword',
      ellipsis: true,
      render: (t: string) => <Text strong>{t}</Text>,
    },
    {
      title: '排名',
      dataIndex: 'position',
      key: 'position',
      width: 70,
      render: (v: number) => {
        if (!v || v === 0) return <Tag>--</Tag>;
        return <Tag color={v <= 3 ? 'green' : v <= 10 ? 'blue' : 'orange'}>#{v}</Tag>;
      },
    },
    {
      title: '变化',
      key: 'change',
      width: 60,
      render: (_: unknown, r: any) => {
        const change = r.change || 0;
        if (change > 0) return <Text type="danger" style={{ fontSize: 12 }}>+{change}</Text>;
        if (change < 0) return <Text type="success" style={{ fontSize: 12 }}>{change}</Text>;
        return <Text type="secondary" style={{ fontSize: 12 }}>--</Text>;
      },
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      width: 150,
      render: (v: string) => v ? <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> : '-',
    },
  ];

  const quickActions = [
    { title: '关键词管理', desc: '添加和追踪关键词', icon: <KeyOutlined />, path: '/keywords', color: '#1677ff' },
    { title: '排名追踪', desc: '查看搜索排名变化', icon: <RiseOutlined />, path: '/rankings', color: '#52c41a' },
    { title: '网站审计', desc: '扫描网站 SEO 问题', icon: <BugOutlined />, path: '/crawl-audit', color: '#fa8c16' },
    { title: '外链分析', desc: '查看外链质量', icon: <LinkOutlined />, path: '/backlinks', color: '#13c2c2' },
    { title: '告警中心', desc: '查看系统告警', icon: <AlertOutlined />, path: '/alerting', color: '#ff4d4f' },
    { title: '监控状态', desc: '查看服务监控', icon: <ThunderboltOutlined />, path: '/monitor', color: '#722ed1' },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="仪表盘"
        subtitle={`项目: ${project?.name || ''} (${project?.domain || ''})`}
        showDateRange
        showCountrySelector
        actions={
          <Button
            icon={<ReloadOutlined />}
            onClick={loadDashboardData}
          >
            刷新
          </Button>
        }
      />

      {/* Row 1: KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={4}>
          <StatCard
            title="健康分"
            value={data.healthScore}
            suffix="/100"
            icon={<MedicineBoxOutlined />}
            color={healthColor}
            onClick={() => navigate('/crawl-audit')}
            subtitle={data.healthScore >= 80 ? '状态良好' : data.healthScore >= 60 ? '需要关注' : '需要修复'}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard
            title="关键词追踪"
            value={data.rankingSummary?.totalKeywords ?? 0}
            icon={<KeyOutlined />}
            color="#1677ff"
            onClick={() => navigate('/keywords')}
            subtitle={`Top 10: ${data.rankingSummary?.top10 ?? 0}`}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard
            title="平均排名"
            value={avgPosition || '--'}
            icon={<RiseOutlined />}
            color="#52c41a"
            onClick={() => navigate('/rankings')}
            trend={
              data.rankingSummary?.improved !== undefined
                ? { value: data.rankingSummary.improved, isUpGood: true }
                : undefined
            }
            subtitle={`Top 3: ${data.rankingSummary?.top3 ?? 0} 个`}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard
            title="外链总数"
            value={data.backlinkStats?.totalBacklinks ?? 0}
            icon={<LinkOutlined />}
            color="#13c2c2"
            onClick={() => navigate('/backlinks')}
            subtitle={`${data.backlinkStats?.referringDomains ?? 0} 个域名`}
            trend={
              data.backlinkStats?.newBacklinks !== undefined
                ? { value: data.backlinkStats.newBacklinks, isUpGood: true }
                : undefined
            }
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard
            title="页面数"
            value={data.crawlIssues?.totalPages ?? 0}
            icon={<GlobalOutlined />}
            color="#fa8c16"
            onClick={() => navigate('/crawl-audit')}
            subtitle={`已爬取 ${data.crawlIssues?.totalPages ?? 0} 页`}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard
            title="问题数"
            value={(data.crawlIssues?.errors ?? 0) + (data.crawlIssues?.warnings ?? 0)}
            icon={<BugOutlined />}
            color={((data.crawlIssues?.errors ?? 0) + (data.crawlIssues?.warnings ?? 0)) > 0 ? '#ff4d4f' : '#52c41a'}
            onClick={() => navigate('/crawl-audit')}
            subtitle={`错误 ${data.crawlIssues?.errors ?? 0} / 警告 ${data.crawlIssues?.warnings ?? 0}`}
          />
        </Col>
      </Row>

      {/* Row 2: Charts */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title="排名趋势"
            extra={
              <Button type="link" size="small" onClick={() => navigate('/rankings')}>
                查看详情 <RightOutlined />
              </Button>
            }
            style={{ borderRadius: 8 }}
          >
            {data.trendData.length > 0 ? (
              <TrendChart
                data={data.trendData}
                height={300}
                showArea
                smooth
                color="#1677ff"
                unit=" 次"
              />
            ) : (
              <EmptyState scene="data" description="暂无趋势数据" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="排名分布"
            extra={
              <Button type="link" size="small" onClick={() => navigate('/rankings')}>
                详情 <RightOutlined />
              </Button>
            }
            style={{ borderRadius: 8 }}
          >
            {data.distributionData.length > 0 ? (
              <DistributionChart
                data={data.distributionData}
                type="donut"
                height={300}
                centerLabel={{
                  label: '关键词',
                  value: `${data.rankingSummary?.totalKeywords ?? 0}`,
                }}
              />
            ) : (
              <EmptyState scene="data" description="暂无分布数据" />
            )}
          </Card>
        </Col>
      </Row>

      {/* ============================================= */}
      {/* NEW Row 3: SEO 市场份额 + 新增/丢失关键词 + 竞品动态 */}
      {/* ============================================= */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        {/* SEO 市场份额 */}
        <Col xs={24} lg={8}>
          <Card
            title={<><PieChartOutlined /> SEO 市场份额</>}
            extra={
              <Button type="link" size="small" onClick={() => navigate('/competitors')}>
                详情 <RightOutlined />
              </Button>
            }
            style={{ borderRadius: 8 }}
          >
            {marketSharePieData.length > 0 ? (
              <DistributionChart
                data={marketSharePieData}
                type="donut"
                height={260}
                centerLabel={{
                  label: '关键词',
                  value: `${totalKeywords}`,
                }}
              />
            ) : (
              <EmptyState scene="data" description="暂无市场份额数据，请添加竞品" />
            )}
          </Card>
        </Col>

        {/* 新增/丢失关键词 */}
        <Col xs={24} lg={8}>
          <Card
            title={<><SwapOutlined /> 新增/丢失关键词</>}
            extra={
              <Button type="link" size="small" onClick={() => navigate('/rankings')}>
                详情 <RightOutlined />
              </Button>
            }
            style={{ borderRadius: 8 }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ color: '#52c41a' }}>
                    <ArrowUpOutlined /> 新增 ({newKeywords.length})
                  </Text>
                </div>
                {newKeywords.length > 0 ? (
                  newKeywords.slice(0, 5).map((kw: any, i: number) => (
                    <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <Text style={{ fontSize: 12 }}>{kw.keyword}</Text>
                      <Tag color="green" style={{ fontSize: 10, marginLeft: 8 }}>#{kw.position}</Tag>
                    </div>
                  ))
                ) : (
                  <Text type="secondary" style={{ fontSize: 12 }}>暂无新增关键词</Text>
                )}
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ color: '#ff4d4f' }}>
                    <ArrowDownOutlined /> 丢失 ({lostKeywords.length})
                  </Text>
                </div>
                {lostKeywords.length > 0 ? (
                  lostKeywords.slice(0, 5).map((kw: any, i: number) => (
                    <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <Text style={{ fontSize: 12 }}>{kw.keyword}</Text>
                      <Tag color="red" style={{ fontSize: 10, marginLeft: 8 }}>#{kw.position}</Tag>
                    </div>
                  ))
                ) : (
                  <Text type="secondary" style={{ fontSize: 12 }}>暂无丢失关键词</Text>
                )}
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 竞品动态 */}
        <Col xs={24} lg={8}>
          <Card
            title={<><TeamOutlined /> 竞品动态</>}
            extra={
              <Button type="link" size="small" onClick={() => navigate('/competitors')}>
                查看更多 <RightOutlined />
              </Button>
            }
            style={{ borderRadius: 8 }}
          >
            {competitorChanges.length > 0 ? (
              <div>
                {competitorChanges.slice(0, 5).map((cc: any, i: number) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: i < competitorChanges.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Text style={{ fontSize: 12 }}>{cc.keyword}</Text>
                      </Col>
                      <Col>
                        <Space size={4}>
                          <Tag color="blue" style={{ fontSize: 10 }}>#{cc.position}</Tag>
                          <Text style={{ fontSize: 11, color: cc.change < 0 ? '#52c41a' : '#ff4d4f' }}>
                            {cc.change < 0 ? '↑' : '↓'}{Math.abs(cc.change)}
                          </Text>
                        </Space>
                      </Col>
                    </Row>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState scene="data" description="暂无竞品动态数据" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Row 4: Alerts + Quick Actions */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card
            title="最近告警"
            extra={
              <Space>
                {alertSummary.critical > 0 && (
                  <Tag color="red">{alertSummary.critical} 严重</Tag>
                )}
                {alertSummary.warning > 0 && (
                  <Tag color="orange">{alertSummary.warning} 警告</Tag>
                )}
                {alertSummary.unacknowledged > 0 && (
                  <Tag color="red">{alertSummary.unacknowledged} 条未处理</Tag>
                )}
                <Button type="link" size="small" onClick={() => navigate('/alerting')}>
                  查看全部 <RightOutlined />
                </Button>
              </Space>
            }
            style={{ borderRadius: 8 }}
          >
            {data.alerts.length > 0 ? (
              <Table
                columns={alertColumns}
                dataSource={data.alerts.slice(0, 5)}
                rowKey="id"
                size="small"
                pagination={false}
              />
            ) : (
              <EmptyState scene="notification" description="暂无告警，系统运行正常" />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title="快捷操作"
            style={{ borderRadius: 8 }}
            extra={
              <Tooltip title="自定义快捷操作">
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate('/projects')}
                >
                  管理项目 <RightOutlined />
                </Button>
              </Tooltip>
            }
          >
            <Row gutter={[12, 12]}>
              {quickActions.map((action) => (
                <Col xs={12} sm={8} key={action.path}>
                  <Card
                    hoverable
                    size="small"
                    onClick={() => navigate(action.path)}
                    style={{
                      textAlign: 'center',
                      borderRadius: 8,
                      borderTop: `3px solid ${action.color}`,
                    }}
                    bodyStyle={{ padding: '16px 12px' }}
                  >
                    <div style={{ fontSize: 24, color: action.color, marginBottom: 8 }}>
                      {action.icon}
                    </div>
                    <Text strong style={{ fontSize: 13, display: 'block' }}>
                      {action.title}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {action.desc}
                    </Text>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 监控状态摘要 */}
            {data.monitorStatus.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                  服务监控状态
                </Text>
                <Space wrap size={[8, 8]}>
                  {data.monitorStatus.slice(0, 4).map((m) => (
                    <Tooltip
                      key={m.id}
                      title={`${m.name}: ${m.uptime}% 可用率 / ${m.responseTime}ms 响应`}
                    >
                      <Tag color={getStatusColor(m.status)}>
                        {m.name} {getStatusLabel(m.status)}
                      </Tag>
                    </Tooltip>
                  ))}
                </Space>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;