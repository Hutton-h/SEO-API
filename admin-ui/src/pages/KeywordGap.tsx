import React, { useState, useCallback, useMemo } from 'react';
import {
  Card, Row, Col, Table, Button, Form, Input, Select, Typography, Space,
  Tabs, Tag, Progress, message, Divider,
} from 'antd';
import {
  SwapOutlined, InteractionOutlined, SearchOutlined,
  ThunderboltOutlined, TrophyOutlined, PlusOutlined,
  MinusCircleOutlined, ReloadOutlined, AimOutlined,
  PercentageOutlined, RiseOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { ComparisonChart } from '@/components/charts';
import type { ComparisonDataPoint } from '@/components/charts';
import { useStore } from '@/store';
import { useProject } from '@/hooks';
import { keywordGapAPI } from '@/services/keywordGap';
import type { KeywordGapResult, DomainIntersectionResult } from '@/services/keywordGap';

const { Text, Title } = Typography;

// ============================================================================
// Types
// ============================================================================

interface MissingKeyword {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: string;
  competitorCount: number;
  opportunityScore: number;
}

interface SharedKeyword {
  keyword: string;
  competitorCount: number;
}

interface CommonKeyword {
  keyword: string;
  searchVolume: number;
  positions: Record<string, number>;
}

interface VennItem {
  domain: string;
  uniqueKeywords: number;
  sharedKeywords: number;
}

// ============================================================================
// Constants
// ============================================================================

const COMPETITION_COLORS: Record<string, string> = {
  LOW: 'green',
  MEDIUM: 'orange',
  HIGH: 'red',
  low: 'green',
  medium: 'orange',
  high: 'red',
};

const COMPETITION_LABELS: Record<string, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  low: '低',
  medium: '中',
  high: '高',
};

const OPPORTUNITY_COLORS: Record<string, string> = {
  LOW: '#52c41a',
  MEDIUM: '#faad14',
  HIGH: '#ff4d4f',
  low: '#52c41a',
  medium: '#faad14',
  high: '#ff4d4f',
};

const getOpportunityColor = (score: number): string => {
  if (score >= 80) return '#52c41a';
  if (score >= 50) return '#faad14';
  return '#ff4d4f';
};

const getPositionColor = (pos: number): string => {
  if (pos <= 3) return 'green';
  if (pos <= 10) return 'blue';
  if (pos <= 20) return 'orange';
  return 'red';
};

// ============================================================================
// Component
// ============================================================================

const KeywordGap: React.FC = () => {
  const { hasProject, project, projectId } = useProject();
  const selectedCountry = useStore((s) => s.selectedCountry);

  // ---- Tab state ----
  const [activeTab, setActiveTab] = useState('gap');

  // ---- Tab 1: 关键词差距 ----
  const [gapForm] = Form.useForm();
  const [gapLoading, setGapLoading] = useState(false);
  const [gapError, setGapError] = useState<string | null>(null);
  const [gapResult, setGapResult] = useState<KeywordGapResult | null>(null);
  const [gapSortField, setGapSortField] = useState<string>('opportunityScore');
  const [gapSortOrder, setGapSortOrder] = useState<string>('descend');

  // ---- Tab 2: 域名交叉 ----
  const [intersectionForm] = Form.useForm();
  const [intersectionLoading, setIntersectionLoading] = useState(false);
  const [intersectionError, setIntersectionError] = useState<string | null>(null);
  const [intersectionResult, setIntersectionResult] = useState<DomainIntersectionResult | null>(null);

  // ==========================================================================
  // Tab 1: 关键词差距分析
  // ==========================================================================

  const handleAnalyzeGap = useCallback(async () => {
    try {
      const values = await gapForm.validateFields();
      const targetDomain = values.targetDomain;
      const competitorDomains = values.competitorDomains || [];
      if (!targetDomain || competitorDomains.length === 0) {
        message.warning('请输入目标域名和至少一个竞品域名');
        return;
      }

      setGapLoading(true);
      setGapError(null);
      setGapResult(null);

      const res = await keywordGapAPI.analyzeKeywordGap({
        targetDomain,
        competitorDomains,
        locationCode: selectedCountry ? Number(selectedCountry.code) : undefined,
      });
      setGapResult(res);
      message.success('关键词差距分析完成');
    } catch (err: any) {
      if (err?.errorFields) return;
      const msg = err?.response?.data?.error?.message || err?.message || '关键词差距分析失败';
      setGapError(msg);
      message.error(msg);
    } finally {
      setGapLoading(false);
    }
  }, [gapForm, selectedCountry]);

  const handleResetGap = useCallback(() => {
    gapForm.resetFields();
    setGapResult(null);
    setGapError(null);
  }, [gapForm]);

  // ==========================================================================
  // Tab 2: 域名交叉分析
  // ==========================================================================

  const handleAnalyzeIntersection = useCallback(async () => {
    try {
      const values = await intersectionForm.validateFields();
      const domains = values.domains || [];
      if (domains.length < 2) {
        message.warning('请至少选择2个域名');
        return;
      }

      setIntersectionLoading(true);
      setIntersectionError(null);
      setIntersectionResult(null);

      const res = await keywordGapAPI.getDomainIntersection({
        domains,
        locationCode: selectedCountry ? Number(selectedCountry.code) : undefined,
      });
      setIntersectionResult(res);
      message.success('域名交叉分析完成');
    } catch (err: any) {
      if (err?.errorFields) return;
      const msg = err?.response?.data?.error?.message || err?.message || '域名交叉分析失败';
      setIntersectionError(msg);
      message.error(msg);
    } finally {
      setIntersectionLoading(false);
    }
  }, [intersectionForm, selectedCountry]);

  const handleResetIntersection = useCallback(() => {
    intersectionForm.resetFields();
    setIntersectionResult(null);
    setIntersectionError(null);
  }, [intersectionForm]);

  // ==========================================================================
  // Top opportunity score from missing keywords
  // ==========================================================================

  const topOpportunityScore = useMemo(() => {
    if (!gapResult?.missingKeywords || gapResult.missingKeywords.length === 0) return 0;
    return Math.max(...gapResult.missingKeywords.map((k) => k.opportunityScore || 0));
  }, [gapResult]);

  // ==========================================================================
  // Comparison chart data for domain intersection
  // ==========================================================================

  const vennComparisonData: ComparisonDataPoint[] = useMemo(() => {
    if (!intersectionResult?.vennData) return [];
    return intersectionResult.vennData.map((item: VennItem) => ({
      name: item.domain,
      value: item.uniqueKeywords,
    }));
  }, [intersectionResult]);

  const vennSharedData: ComparisonDataPoint[] = useMemo(() => {
    if (!intersectionResult?.vennData) return [];
    return intersectionResult.vennData.map((item: VennItem) => ({
      name: item.domain,
      value: item.sharedKeywords,
    }));
  }, [intersectionResult]);

  // ==========================================================================
  // Tab 1: Missing keywords columns
  // ==========================================================================

  const missingColumns = [
    {
      title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 200,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 100,
      sorter: (a: MissingKeyword, b: MissingKeyword) => (a.searchVolume || 0) - (b.searchVolume || 0),
      render: (val: number) => (val ?? 0).toLocaleString(),
    },
    {
      title: 'CPC', dataIndex: 'cpc', key: 'cpc', width: 90,
      sorter: (a: MissingKeyword, b: MissingKeyword) => (a.cpc || 0) - (b.cpc || 0),
      render: (val: number) => `¥${(val ?? 0).toFixed(2)}`,
    },
    {
      title: '竞争度', dataIndex: 'competition', key: 'competition', width: 90,
      render: (val: string) => {
        const level = (val || '').toUpperCase();
        const label = COMPETITION_LABELS[level] || val || '--';
        const color = COMPETITION_COLORS[level] || 'default';
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: '竞品数', dataIndex: 'competitorCount', key: 'competitorCount', width: 80,
      sorter: (a: MissingKeyword, b: MissingKeyword) => (a.competitorCount || 0) - (b.competitorCount || 0),
      render: (val: any) => {
        if (!val) return <Tag>--</Tag>;
        const color = val >= 3 ? '#ff4d4f' : val >= 2 ? '#faad14' : '#52c41a';
        return <Tag color={color}>{val}</Tag>;
      },
    },
    {
      title: '机会分数', dataIndex: 'opportunityScore', key: 'opportunityScore', width: 150,
      sorter: (a: MissingKeyword, b: MissingKeyword) => (a.opportunityScore || 0) - (b.opportunityScore || 0),
      defaultSortOrder: 'descend' as const,
      render: (val: number) => {
        const pct = Math.round(val || 0);
        const color = getOpportunityColor(pct);
        return (
          <div style={{ minWidth: 100 }}>
            <Progress
              percent={pct}
              size="small"
              strokeColor={color}
              format={() => `${pct}%`}
            />
          </div>
        );
      },
    },
  ];

  // ==========================================================================
  // Tab 1: Shared keywords columns
  // ==========================================================================

  const sharedColumns = [
    {
      title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 250,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '竞品数', dataIndex: 'competitorCount', key: 'competitorCount', width: 100,
      render: (val: number) => {
        const color = val >= 3 ? '#1677ff' : val >= 2 ? '#52c41a' : '#faad14';
        return <Tag color={color}>{val} 个竞品</Tag>;
      },
    },
  ];

  // ==========================================================================
  // Tab 2: Common keywords columns
  // ==========================================================================

  const commonColumns = useMemo(() => {
    const baseColumns = [
      {
        title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 200,
        render: (text: string) => <Text strong>{text}</Text>,
      },
      {
        title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 100,
        sorter: (a: CommonKeyword, b: CommonKeyword) => (a.searchVolume || 0) - (b.searchVolume || 0),
        render: (val: number) => (val ?? 0).toLocaleString(),
      },
    ];

    // Add position columns per domain
    if (intersectionResult?.domains) {
      intersectionResult.domains.forEach((domain: string) => {
        baseColumns.push({
          title: domain,
          dataIndex: ['positions', domain] as any,
          key: `pos_${domain}`,
          width: 90,
          render: (_val: any) => {
            const val = _val as number;
            if (!val) return <Tag>--</Tag>;
            const color = getPositionColor(val);
            return <Tag color={color}>{val}</Tag>;
          },
        });
      });
    }

    return baseColumns;
  }, [intersectionResult]);

  // ==========================================================================
  // Tab 1: Handle table change
  // ==========================================================================

  const handleGapTableChange = (_pagination: any, _filters: any, sorter: any) => {
    if (sorter.field) {
      setGapSortField(sorter.field);
      setGapSortOrder(sorter.order || '');
    }
  };

  // ==========================================================================
  // State: no project
  // ==========================================================================

  if (!hasProject) {
    return (
      <div className="page-container">
        <PageHeader
          title="关键词差距分析"
          subtitle="发现竞品排名但你的网站未覆盖的关键词机会"
          showCountrySelector
        />
        <EmptyState
          scene="data"
          title="请先选择项目"
          description="选择一个项目或创建新项目，开始关键词差距分析"
        />
      </div>
    );
  }

  // ==========================================================================
  // Tab definitions
  // ==========================================================================

  const tabItems = [
    // ======================================================================
    // TAB 1: 关键词差距
    // ======================================================================
    {
      key: 'gap',
      label: <span><SwapOutlined /> 关键词差距</span>,
      children: (
        <div>
          {/* ---- Form Section ---- */}
          <Card style={{ marginBottom: 24, borderRadius: 8 }}>
            <Title level={5} style={{ marginBottom: 16 }}>
              <SwapOutlined style={{ marginRight: 8 }} />
              输入域名进行关键词差距分析
            </Title>
            <Form form={gapForm} layout="vertical">
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    name="targetDomain"
                    label="目标域名"
                    rules={[{ required: true, message: '请输入目标域名' }]}
                  >
                    <Input
                      placeholder="例如 yoursite.com"
                      prefix={<AimOutlined />}
                      size="middle"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={16}>
                  <Form.Item
                    name="competitorDomains"
                    label="竞品域名"
                    rules={[{ required: true, type: 'array', min: 1, message: '请至少添加一个竞品域名' }]}
                  >
                    <Select
                      mode="tags"
                      placeholder="输入竞品域名后按回车添加，例如 competitor.com"
                      tokenSeparators={[',', ' ']}
                      style={{ width: '100%' }}
                      open={false}
                      size="middle"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 0]} style={{ marginTop: 8 }}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="locationCode" label="地区代码（可选）">
                    <Input
                      placeholder={`当前: ${selectedCountry?.name || 'United States'} (${selectedCountry?.code || '2840'})`}
                      size="middle"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={16} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 24 }}>
                  <Space>
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      onClick={handleAnalyzeGap}
                      loading={gapLoading}
                      size="middle"
                    >
                      开始分析
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={handleResetGap} disabled={gapLoading}>
                      重置
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Form>
          </Card>

          {/* ---- Loading State ---- */}
          {gapLoading && <LoadingSkeleton type="page" />}

          {/* ---- Error State ---- */}
          {gapError && !gapLoading && !gapResult && (
            <ErrorState message={gapError} onRetry={handleAnalyzeGap} />
          )}

          {/* ---- Empty State ---- */}
          {!gapResult && !gapLoading && !gapError && (
            <EmptyState
              scene="search"
              title="开始关键词差距分析"
              description="输入目标域名和竞品域名，点击「开始分析」发现关键词差距与机会"
            />
          )}

          {/* ---- Results ---- */}
          {gapResult && !gapLoading && (
            <div>
              {/* StatCards */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="缺失关键词"
                    value={gapResult.totalMissing}
                    icon={<SearchOutlined />}
                    color="#ff4d4f"
                    subtitle="竞品有但你没有的关键词"
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="共享关键词"
                    value={gapResult.totalShared}
                    icon={<PercentageOutlined />}
                    color="#52c41a"
                    subtitle="与竞品共同覆盖的关键词"
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="竞品数量"
                    value={gapResult.competitorDomains?.length || 0}
                    icon={<SwapOutlined />}
                    color="#1677ff"
                    subtitle="分析的竞品域名总数"
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="最高机会分数"
                    value={`${Math.round(topOpportunityScore)}%`}
                    icon={<TrophyOutlined />}
                    color="#fa8c16"
                    subtitle="最有价值的缺失关键词"
                  />
                </Col>
              </Row>

              <Divider />

              {/* Missing Keywords Table */}
              <Card
                title={<span><SearchOutlined /> 缺失关键词 ({gapResult.totalMissing})</span>}
                style={{ marginBottom: 24, borderRadius: 8 }}
              >
                {gapResult.missingKeywords && gapResult.missingKeywords.length > 0 ? (
                  <Table
                    columns={missingColumns}
                    dataSource={gapResult.missingKeywords}
                    rowKey="keyword"
                    onChange={handleGapTableChange}
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (t) => `共 ${t} 个缺失关键词`,
                    }}
                    size="middle"
                    scroll={{ x: 800 }}
                  />
                ) : (
                  <EmptyState scene="data" description="未发现缺失关键词，你的网站在关键词覆盖上表现良好" />
                )}
              </Card>

              {/* Shared Keywords Table */}
              <Card
                title={<span><PercentageOutlined /> 共享关键词 ({gapResult.totalShared})</span>}
                style={{ borderRadius: 8 }}
              >
                {gapResult.sharedKeywords && gapResult.sharedKeywords.length > 0 ? (
                  <Table
                    columns={sharedColumns}
                    dataSource={gapResult.sharedKeywords}
                    rowKey="keyword"
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (t) => `共 ${t} 个共享关键词`,
                    }}
                    size="middle"
                    scroll={{ x: 400 }}
                  />
                ) : (
                  <EmptyState scene="data" description="暂无共享关键词数据" />
                )}
              </Card>
            </div>
          )}
        </div>
      ),
    },

    // ======================================================================
    // TAB 2: 域名交叉
    // ======================================================================
    {
      key: 'intersection',
      label: <span><InteractionOutlined /> 域名交叉</span>,
      children: (
        <div>
          {/* ---- Form Section ---- */}
          <Card style={{ marginBottom: 24, borderRadius: 8 }}>
            <Title level={5} style={{ marginBottom: 16 }}>
              <InteractionOutlined style={{ marginRight: 8 }} />
              选择多个域名进行关键词交叉分析
            </Title>
            <Form form={intersectionForm} layout="vertical">
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={16} md={18}>
                  <Form.Item
                    name="domains"
                    label="域名列表"
                    rules={[{ required: true, type: 'array', min: 2, message: '请至少选择2个域名' }]}
                  >
                    <Select
                      mode="tags"
                      placeholder="输入域名后按回车添加，例如 domain1.com, domain2.com"
                      tokenSeparators={[',', ' ']}
                      style={{ width: '100%' }}
                      open={false}
                      size="middle"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8} md={6}>
                  <Form.Item name="locationCode" label="地区代码（可选）">
                    <Input
                      placeholder={`当前: ${selectedCountry?.code || '2840'}`}
                      size="middle"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 0]} style={{ marginTop: 8 }}>
                <Col span={24} style={{ display: 'flex', alignItems: 'flex-start', paddingBottom: 24 }}>
                  <Space>
                    <Button
                      type="primary"
                      icon={<InteractionOutlined />}
                      onClick={handleAnalyzeIntersection}
                      loading={intersectionLoading}
                      size="middle"
                    >
                      开始分析
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={handleResetIntersection} disabled={intersectionLoading}>
                      重置
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Form>
          </Card>

          {/* ---- Loading State ---- */}
          {intersectionLoading && <LoadingSkeleton type="page" />}

          {/* ---- Error State ---- */}
          {intersectionError && !intersectionLoading && !intersectionResult && (
            <ErrorState message={intersectionError} onRetry={handleAnalyzeIntersection} />
          )}

          {/* ---- Empty State ---- */}
          {!intersectionResult && !intersectionLoading && !intersectionError && (
            <EmptyState
              scene="search"
              title="开始域名交叉分析"
              description="选择至少2个域名，点击「开始分析」发现它们之间的关键词重叠关系"
            />
          )}

          {/* ---- Results ---- */}
          {intersectionResult && !intersectionLoading && (
            <div>
              {/* StatCards */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="公共关键词"
                    value={intersectionResult.totalCommon}
                    icon={<InteractionOutlined />}
                    color="#1677ff"
                    subtitle="所有域名共同覆盖的关键词"
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="域名数"
                    value={intersectionResult.domains?.length || 0}
                    icon={<SwapOutlined />}
                    color="#52c41a"
                    subtitle="参与分析的域名总数"
                  />
                </Col>
                {intersectionResult.vennData && intersectionResult.vennData.slice(0, 2).map((item: VennItem, idx: number) => (
                  <Col xs={12} sm={6} key={item.domain}>
                    <StatCard
                      title={`${item.domain} 独占关键词`}
                      value={item.uniqueKeywords}
                      icon={<TrophyOutlined />}
                      color={idx === 0 ? '#fa8c16' : '#722ed1'}
                      subtitle={`共享: ${item.sharedKeywords}`}
                    />
                  </Col>
                ))}
              </Row>

              <Divider />

              {/* Comparison Charts */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={12}>
                  <Card title="独占关键词对比" style={{ borderRadius: 8 }}>
                    {vennComparisonData.length > 0 ? (
                      <ComparisonChart
                        data={vennComparisonData}
                        horizontal
                        height={320}
                        unit=" 个"
                        showLabel
                      />
                    ) : (
                      <EmptyState scene="data" description="暂无对比数据" />
                    )}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="共享关键词对比" style={{ borderRadius: 8 }}>
                    {vennSharedData.length > 0 ? (
                      <ComparisonChart
                        data={vennSharedData}
                        horizontal
                        height={320}
                        unit=" 个"
                        showLabel
                      />
                    ) : (
                      <EmptyState scene="data" description="暂无对比数据" />
                    )}
                  </Card>
                </Col>
              </Row>

              {/* Common Keywords Table */}
              <Card
                title={<span><InteractionOutlined /> 公共关键词 ({intersectionResult.totalCommon})</span>}
                style={{ borderRadius: 8 }}
              >
                {intersectionResult.commonKeywords && intersectionResult.commonKeywords.length > 0 ? (
                  <Table
                    columns={commonColumns}
                    dataSource={intersectionResult.commonKeywords}
                    rowKey="keyword"
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (t) => `共 ${t} 个公共关键词`,
                    }}
                    size="middle"
                    scroll={{ x: 600 }}
                  />
                ) : (
                  <EmptyState scene="data" description="未发现公共关键词，这些域名之间没有关键词重叠" />
                )}
              </Card>
            </div>
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
        title="关键词差距分析"
        subtitle={`项目: ${project?.name || ''} (${project?.domain || ''})`}
        showCountrySelector
        actions={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                if (activeTab === 'gap') {
                  handleResetGap();
                } else {
                  handleResetIntersection();
                }
              }}
            >
              重置
            </Button>
          </Space>
        }
      />

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

export default KeywordGap;