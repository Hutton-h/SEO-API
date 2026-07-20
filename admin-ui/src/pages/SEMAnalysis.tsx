import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Button, Tag, Typography, Space, Input, Select,
  Tabs, Progress, message,
} from 'antd';
import {
  ReloadOutlined, ThunderboltOutlined, DollarOutlined, RiseOutlined,
  AimOutlined, GlobalOutlined, BulbOutlined, PlusOutlined,
  SearchOutlined, SwapOutlined, FundOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { TrendChart, ComparisonChart } from '@/components/charts';
import type { TrendDataPoint, ComparisonDataPoint } from '@/components/charts';
import { useStore } from '@/store';
import { useProject, useDateRange } from '@/hooks';
import { semAPI } from '@/services/sem';

const { Text } = Typography;

// ============================================================================
// Types
// ============================================================================

interface SEMKeyword {
  id: string;
  keyword: string;
  searchVolume: number;
  competition: 'low' | 'medium' | 'high';
  cpc: number;
  qualityScore: number;
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
  cost: number;
  conversions: number;
  conversionRate: number;
}

interface CompetitorAd {
  id: string;
  competitor: string;
  headline: string;
  description: string;
  displayUrl: string;
  finalUrl: string;
  extensions: string[];
  lastSeen: string;
}

interface Opportunity {
  id: string;
  keyword: string;
  searchVolume: number;
  competition: 'low' | 'medium' | 'high';
  cpc: number;
  opportunityScore: number;
  recommendation: string;
}

interface PageData {
  keywords: SEMKeyword[];
  keywordTotal: number;
  ads: CompetitorAd[];
  opportunities: Opportunity[];
}

const INITIAL_DATA: PageData = {
  keywords: [],
  keywordTotal: 0,
  ads: [],
  opportunities: [],
};

// ============================================================================
// Helpers
// ============================================================================

const getCompetitionColor = (comp: string): string => {
  switch (comp) {
    case 'low': return 'green';
    case 'medium': return 'orange';
    case 'high': return 'red';
    default: return 'default';
  }
};

const getCompetitionLabel = (comp: string): string => {
  switch (comp) {
    case 'low': return '低';
    case 'medium': return '中';
    case 'high': return '高';
    default: return comp;
  }
};

// ============================================================================
// Component
// ============================================================================

const SEMAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { project, projectId, hasProject } = useProject();
  const { projects } = useStore();
  const { dateRange } = useDateRange();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PageData>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState('keywords');
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const [newKeyword, setNewKeyword] = useState('');
  const [adding, setAdding] = useState(false);

  const loadData = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled([
        semAPI.getSEMKeywords(projectId, { page, pageSize: 10 }),
        semAPI.getCompetitorAds(projectId),
        semAPI.getOpportunities(projectId),
      ]);

      let keywords: SEMKeyword[] = [];
      let keywordTotal = 0;
      if (results[0].status === 'fulfilled') {
        const res = results[0].value as any;
        const d = res?.data ?? res;
        keywords = Array.isArray(d) ? d : (d?.data || d?.keywords || []);
        keywordTotal = d?.total || d?.pagination?.total || keywords.length;
      }

      let ads: CompetitorAd[] = [];
      if (results[1].status === 'fulfilled') {
        const res = results[1].value as any;
        const arr = Array.isArray(res) ? res : (res?.data || []);
        ads = arr;
      }

      let opportunities: Opportunity[] = [];
      if (results[2].status === 'fulfilled') {
        const res = results[2].value as any;
        const arr = Array.isArray(res) ? res : (res?.data || []);
        opportunities = arr;
      }

      const hasError = results.some((r) => r.status === 'rejected');
      if (hasError) {
        const firstErr = results.find((r) => r.status === 'rejected');
        if (firstErr && firstErr.status === 'rejected') {
          console.warn('Partial data load failed:', firstErr.reason);
        }
      }

      setData({ keywords, keywordTotal, ads, opportunities });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载SEM数据失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    if (!projectId) return;
    setRefreshing(true);
    try {
      await semAPI.refreshSEMData(projectId);
      message.success('SEM 数据刷新中');
      setTimeout(() => {
        setRefreshing(false);
        loadData();
      }, 3000);
    } catch (err: any) {
      message.error(err?.message || '刷新失败');
      setRefreshing(false);
    }
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) {
      message.warning('请输入关键词');
      return;
    }
    setAdding(true);
    try {
      await semAPI.addSEMKeyword(projectId, newKeyword.trim());
      message.success('关键词已添加');
      setNewKeyword('');
      loadData();
    } catch (err: any) {
      message.error(err?.message || '添加失败');
    } finally {
      setAdding(false);
    }
  };

  // ==========================================================================
  // No project selected
  // ==========================================================================
  if (!hasProject) {
    return (
      <div className="page-container">
        <PageHeader
          title="SEM 分析"
          subtitle="搜索引擎营销关键词分析、竞品广告监控与机会挖掘"
          showCountrySelector
        />
        <EmptyState
          scene="data"
          title="请先选择项目"
          description="选择一个项目或创建新项目，开始 SEM 分析"
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
  if (error && !loading && data.keywords.length === 0) {
    return (
      <div className="page-container">
        <PageHeader
          title="SEM 分析"
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
          title="SEM 分析"
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
  const { keywords, keywordTotal, ads, opportunities } = data;
  const totalAds = ads.length;
  const totalSpend = keywords.reduce((sum, k) => sum + (k.cost || 0), 0);
  const totalClicks = keywords.reduce((sum, k) => sum + (k.clicks || 0), 0);
  const totalImpressions = keywords.reduce((sum, k) => sum + (k.impressions || 0), 0);
  const totalConversions = keywords.reduce((sum, k) => sum + (k.conversions || 0), 0);
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  // Build trend data from keywords
  const trendData: TrendDataPoint[] = keywords.slice(0, 30).map((kw, i) => ({
    date: `Day ${i + 1}`,
    value: kw.cost || 0,
    category: '花费',
  })).concat(
    keywords.slice(0, 30).map((kw, i) => ({
      date: `Day ${i + 1}`,
      value: kw.conversions || 0,
      category: '转化',
    }))
  );

  // Build competitor ad spend comparison
  const adSpendComparison: ComparisonDataPoint[] = [];
  const competitorSpendMap: Record<string, number> = {};
  ads.forEach((ad) => {
    competitorSpendMap[ad.competitor] = (competitorSpendMap[ad.competitor] || 0) + 1;
  });
  Object.entries(competitorSpendMap).forEach(([name, count]) => {
    adSpendComparison.push({ name, value: count * 100 }); // estimated spend
  });

  // Keyword table columns
  const keywordColumns = [
    {
      title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 160,
      render: (kw: string) => <Text strong>{kw}</Text>,
    },
    {
      title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 90,
      render: (v: number) => v?.toLocaleString() || '-',
    },
    {
      title: 'CPC', dataIndex: 'cpc', key: 'cpc', width: 80,
      render: (v: number) => v ? <Text style={{ color: '#fa8c16' }}>${v.toFixed(2)}</Text> : '-',
    },
    {
      title: '竞争度', dataIndex: 'competition', key: 'competition', width: 80,
      render: (c: string) => <Tag color={getCompetitionColor(c)}>{getCompetitionLabel(c)}</Tag>,
    },
    {
      title: '质量分', dataIndex: 'qualityScore', key: 'qualityScore', width: 100,
      render: (s: number) => (
        <Progress
          percent={s * 10}
          size="small"
          strokeColor={s >= 7 ? '#52c41a' : s >= 5 ? '#faad14' : '#ff4d4f'}
          format={() => `${s}/10`}
        />
      ),
    },
    { title: '展示', dataIndex: 'impressions', key: 'impressions', width: 90,
      render: (v: number) => v?.toLocaleString() || '0',
    },
    { title: '点击', dataIndex: 'clicks', key: 'clicks', width: 80,
      render: (v: number) => v?.toLocaleString() || '0',
    },
    {
      title: 'CTR', dataIndex: 'ctr', key: 'ctr', width: 80,
      render: (v: number) => v ? <Tag color={v > 5 ? 'green' : 'orange'}>{v.toFixed(1)}%</Tag> : '-',
    },
    {
      title: '花费', dataIndex: 'cost', key: 'cost', width: 90,
      render: (v: number) => v ? <Text style={{ color: '#ff4d4f' }}>${v.toFixed(2)}</Text> : '$0',
    },
    { title: '转化', dataIndex: 'conversions', key: 'conversions', width: 80,
      render: (v: number) => v || '0',
    },
  ];

  // Ad table columns
  const adColumns = [
    { title: '竞品', dataIndex: 'competitor', key: 'competitor', width: 120,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    { title: '标题', dataIndex: 'headline', key: 'headline', ellipsis: true },
    { title: '描述', dataIndex: 'description', key: 'description', width: 200, ellipsis: true },
    {
      title: '显示URL', dataIndex: 'displayUrl', key: 'displayUrl', width: 150,
      render: (u: string) => <Text code style={{ fontSize: 11 }}>{u}</Text>,
    },
    {
      title: '最近发现', dataIndex: 'lastSeen', key: 'lastSeen', width: 150,
      render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-',
    },
  ];

  // Opportunity table columns
  const oppColumns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 160 },
    { title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 90,
      render: (v: number) => v?.toLocaleString() || '-',
    },
    { title: 'CPC', dataIndex: 'cpc', key: 'cpc', width: 80,
      render: (v: number) => v ? `$${v.toFixed(2)}` : '-',
    },
    {
      title: '机会评分', dataIndex: 'opportunityScore', key: 'opportunityScore', width: 120,
      render: (s: number) => (
        <Progress percent={s} size="small" strokeColor={s >= 70 ? '#52c41a' : '#faad14'} />
      ),
    },
    { title: '建议', dataIndex: 'recommendation', key: 'recommendation', ellipsis: true },
  ];

  const tabItems = [
    {
      key: 'keywords',
      label: <span><AimOutlined /> SEM 关键词</span>,
      children: (
        <>
          <Card title="花费与转化趋势" style={{ marginBottom: 24, borderRadius: 8 }}>
            {trendData.length > 0 ? (
              <TrendChart
                data={trendData}
                height={320}
                showArea
                smooth
                unit=""
              />
            ) : (
              <EmptyState scene="data" description="暂无趋势数据" />
            )}
          </Card>

          {/* CPC 趋势图 */}
          <Card title="CPC 趋势" style={{ marginBottom: 24, borderRadius: 8 }}>
            {keywords.length > 0 ? (
              <TrendChart
                data={keywords
                  .filter(k => k.cpc != null)
                  .slice(0, 20)
                  .map(k => ({ date: k.keyword || '', value: k.cpc || 0 }))}
                height={320}
                showArea
                smooth
                unit="$"
              />
            ) : (
              <EmptyState scene="data" description="暂无 CPC 数据" />
            )}
          </Card>

          {/* 商业意图评分 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12}>
              <Card title="商业意图评分" style={{ borderRadius: 8 }}>
                {keywords.length > 0 ? (
                  <Table
                    dataSource={[...keywords]
                      .sort((a, b) => ((b.cpc || 0) * (b.searchVolume || 0)) - ((a.cpc || 0) * (a.searchVolume || 0)))
                      .slice(0, 10)
                      .map((k, i) => ({ ...k, key: i }))}
                    pagination={false}
                    size="small"
                    columns={[
                      { title: '关键词', dataIndex: 'keyword', key: 'keyword', ellipsis: true },
                      { title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', render: (v: number) => v?.toLocaleString() ?? '--' },
                      { title: 'CPC', dataIndex: 'cpc', key: 'cpc', render: (v: number) => v != null ? `$${v.toFixed(2)}` : '--' },
                      { title: '商业价值', key: 'value', render: (_: unknown, r: any) => {
                        const score = (r.cpc || 0) * (r.searchVolume || 0);
                        const level = score > 1000 ? '高' : score > 100 ? '中' : '低';
                        const color = score > 1000 ? '#ff4d4f' : score > 100 ? '#fa8c16' : '#52c41a';
                        return <Tag color={color}>{level} ({score.toFixed(0)})</Tag>;
                      }},
                    ]}
                  />
                ) : (
                  <EmptyState scene="data" description="暂无数据" />
                )}
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card title="广告竞争概览" style={{ borderRadius: 8 }}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <StatCard
                      title="平均 CPC"
                      value={keywords.length > 0 ? `$${(keywords.reduce((s, k) => s + (k.cpc || 0), 0) / keywords.length).toFixed(2)}` : '--'}
                      icon={<DollarOutlined />}
                      color="#fa8c16"
                    />
                  </Col>
                  <Col span={12}>
                    <StatCard
                      title="高商业价值词"
                      value={keywords.filter(k => (k.cpc || 0) * (k.searchVolume || 0) > 1000).length}
                      icon={<RiseOutlined />}
                      color="#ff4d4f"
                    />
                  </Col>
                  <Col span={12}>
                    <StatCard
                      title="平均竞争度"
                      value={keywords.length > 0 ? keywords.filter(k => (k.competition || '').toUpperCase() === 'HIGH').length : 0}
                      suffix=" 个 HIGH"
                      icon={<FundOutlined />}
                      color="#1677ff"
                    />
                  </Col>
                  <Col span={12}>
                    <StatCard
                      title="总搜索量"
                      value={keywords.reduce((s, k) => s + (k.searchVolume || 0), 0).toLocaleString()}
                      icon={<SearchOutlined />}
                      color="#52c41a"
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          <Card
            title="SEM 关键词列表"
            style={{ borderRadius: 8 }}
            extra={
              <Space>
                <Input.Search
                  placeholder="添加关键词"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onSearch={handleAddKeyword}
                  enterButton={<PlusOutlined />}
                  style={{ width: 250 }}
                  loading={adding}
                />
              </Space>
            }
          >
            {keywords.length > 0 ? (
              <Table
                columns={keywordColumns}
                dataSource={keywords}
                rowKey="id"
                scroll={{ x: 1000 }}
                pagination={{
                  current: page,
                  pageSize: 10,
                  total: keywordTotal,
                  onChange: (p) => setPage(p),
                }}
                size="middle"
              />
            ) : (
              <EmptyState
                scene="data"
                description="暂无 SEM 关键词数据"
                action={{
                  text: '添加关键词',
                  onClick: () => {},
                  icon: <PlusOutlined />,
                }}
              />
            )}
          </Card>
        </>
      ),
    },
    {
      key: 'ads',
      label: <span><GlobalOutlined /> 竞品广告</span>,
      children: (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={14}>
            <Card title="竞品广告监控" style={{ borderRadius: 8 }}>
              {ads.length > 0 ? (
                <Table
                  columns={adColumns}
                  dataSource={ads}
                  rowKey="id"
                  scroll={{ x: 750 }}
                  pagination={{ pageSize: 10 }}
                  size="middle"
                />
              ) : (
                <EmptyState scene="data" description="暂无竞品广告数据" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title="竞品广告花费对比" style={{ borderRadius: 8 }}>
              {adSpendComparison.length > 0 ? (
                <ComparisonChart
                  data={adSpendComparison}
                  horizontal
                  height={360}
                  unit=" USD"
                  showLabel
                />
              ) : (
                <EmptyState scene="data" description="暂无竞品对比数据" />
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'opportunities',
      label: <span><BulbOutlined /> 机会挖掘</span>,
      children: (
        <Card title="SEM 机会关键词" style={{ borderRadius: 8 }}>
          {opportunities.length > 0 ? (
            <Table
              columns={oppColumns}
              dataSource={opportunities}
              rowKey="id"
              scroll={{ x: 650 }}
              pagination={{ pageSize: 10 }}
              size="middle"
            />
          ) : (
            <EmptyState scene="data" description="暂无机会关键词数据" />
          )}
        </Card>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="SEM 分析"
        subtitle={`项目: ${project?.name || ''} (${project?.domain || ''})`}
        showCountrySelector
        showDateRange
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleRefresh}
              loading={refreshing}
            >
              刷新数据
            </Button>
          </Space>
        }
      />

      {/* KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="SEM 广告数"
            value={totalAds}
            icon={<GlobalOutlined />}
            color="#1677ff"
            subtitle={`监控 ${totalAds} 个广告`}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="平均 CPC"
            value={`$${avgCPC.toFixed(2)}`}
            icon={<DollarOutlined />}
            color="#fa8c16"
            subtitle="每次点击成本"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="总花费"
            value={`$${totalSpend.toFixed(2)}`}
            icon={<SwapOutlined />}
            color="#ff4d4f"
            subtitle={`${totalClicks.toLocaleString()} 次点击`}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="转化数"
            value={totalConversions}
            icon={<RiseOutlined />}
            color="#52c41a"
            subtitle={`CTR ${avgCTR.toFixed(1)}%`}
          />
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="large"
        items={tabItems}
      />
    </div>
  );
};

export default SEMAnalysis;