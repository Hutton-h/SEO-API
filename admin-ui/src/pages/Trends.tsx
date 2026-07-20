import React, { useState, useCallback, useMemo } from 'react';
import {
  Card, Table, Button, Tag, Typography, Row, Col,
  Space, Input, Select, message, Tabs, Form, Tooltip,
} from 'antd';
import {
  LineChartOutlined, SearchOutlined, RiseOutlined,
  FireOutlined, GlobalOutlined, PlusOutlined,
  CloseOutlined, ArrowUpOutlined, ArrowDownOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { TrendChart } from '@/components/charts';
import { useStore } from '@/store';
import { trendsAPI } from '@/services/trends';
import type { TrendsComparisonResult, RelatedQueriesResult } from '@/services/trends';

const { Text, Title } = Typography;

// ============================================================================
// Constants
// ============================================================================

const TIMEFRAME_OPTIONS = [
  { value: '7d', label: '过去7天' },
  { value: '30d', label: '过去30天' },
  { value: '90d', label: '过去90天' },
  { value: '12m', label: '过去12个月' },
  { value: '5y', label: '过去5年' },
];

const GEO_OPTIONS = [
  { value: 'US', label: '美国' },
  { value: 'GLOBAL', label: '全球' },
  { value: 'CN', label: '中国' },
  { value: 'JP', label: '日本' },
  { value: 'GB', label: '英国' },
  { value: 'DE', label: '德国' },
  { value: 'IN', label: '印度' },
  { value: 'BR', label: '巴西' },
];

const COLOR_PALETTE = [
  '#1677ff', '#52c41a', '#faad14', '#ff4d4f',
  '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16',
];

// ============================================================================
// Component
// ============================================================================

const Trends: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const projectName = useStore((s) => s.currentProject?.name || '');

  // ---- Tab 1: 趋势对比 state ----
  const [compareKeywords, setCompareKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [timeframe, setTimeframe] = useState('30d');
  const [geo, setGeo] = useState('US');
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<TrendsComparisonResult | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  // ---- Tab 2: 相关查询 state ----
  const [relatedKeyword, setRelatedKeyword] = useState('');
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedResult, setRelatedResult] = useState<RelatedQueriesResult | null>(null);
  const [relatedError, setRelatedError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('compare');

  // ---- Tab 1: 趋势对比 actions ----
  const handleAddKeyword = useCallback(() => {
    const trimmed = keywordInput.trim();
    if (!trimmed) return;
    if (compareKeywords.includes(trimmed)) {
      message.warning('该关键词已存在');
      return;
    }
    if (compareKeywords.length >= 5) {
      message.warning('最多支持5个关键词同时对比');
      return;
    }
    setCompareKeywords((prev) => [...prev, trimmed]);
    setKeywordInput('');
  }, [keywordInput, compareKeywords]);

  const handleRemoveKeyword = useCallback((kw: string) => {
    setCompareKeywords((prev) => prev.filter((k) => k !== kw));
  }, []);

  const handleCompare = useCallback(async () => {
    if (compareKeywords.length === 0) {
      message.warning('请至少添加一个关键词');
      return;
    }
    setCompareLoading(true);
    setCompareError(null);
    setCompareResult(null);
    try {
      const res: any = await trendsAPI.compareTrends({
        keywords: compareKeywords,
        timeframe,
        geo,
      });
      const data = res?.data !== undefined ? res.data : res;
      setCompareResult(data);
      if (!data || !data.timeline || data.timeline.length === 0) {
        message.info('未获取到趋势数据，请尝试调整关键词或时间范围');
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.error?.message || err?.message || '趋势对比请求失败';
      setCompareError(errMsg);
      message.error(errMsg);
    } finally {
      setCompareLoading(false);
    }
  }, [compareKeywords, timeframe, geo]);

  // ---- Tab 2: 相关查询 actions ----
  const handleRelatedQuery = useCallback(async () => {
    if (!relatedKeyword.trim()) {
      message.warning('请输入关键词');
      return;
    }
    setRelatedLoading(true);
    setRelatedError(null);
    setRelatedResult(null);
    try {
      const res: any = await trendsAPI.getRelatedQueries({ keyword: relatedKeyword.trim() });
      const data = res?.data !== undefined ? res.data : res;
      setRelatedResult(data);
      if (data && !data.rising?.length && !data.top?.length) {
        message.info('未找到相关查询数据');
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.error?.message || err?.message || '相关查询请求失败';
      setRelatedError(errMsg);
      message.error(errMsg);
    } finally {
      setRelatedLoading(false);
    }
  }, [relatedKeyword]);

  // ---- Tab 1: Trend chart data ----
  const trendChartData = useMemo(() => {
    if (!compareResult?.timeline || compareResult.timeline.length === 0) return [];
    return compareResult.timeline.map((item) => {
      const point: any = { date: item.date };
      compareResult.keywords.forEach((kw) => {
        point[kw] = item.values?.[kw] ?? 0;
      });
      return point;
    });
  }, [compareResult]);

  // Multi-series data for TrendChart (uses category field)
  const multiSeriesTrendData = useMemo(() => {
    if (!compareResult?.timeline || compareResult.timeline.length === 0) return [];
    const result: any[] = [];
    compareResult.timeline.forEach((item) => {
      compareResult.keywords.forEach((kw) => {
        result.push({
          date: item.date,
          category: kw,
          value: item.values?.[kw] ?? 0,
        });
      });
    });
    return result;
  }, [compareResult]);

  // ---- Tab 2: Table columns ----
  const risingColumns = useMemo(() => [
    {
      title: '查询词', dataIndex: 'query', key: 'query', width: 200,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '增长值', dataIndex: 'value', key: 'value', width: 120,
      sorter: (a: any, b: any) => (a.value || 0) - (b.value || 0),
      render: (val: number) => {
        if (val === undefined || val === null) return <Text type="secondary">--</Text>;
        return (
          <Tag color="volcano" icon={<RiseOutlined />} style={{ fontSize: 13, padding: '2px 10px' }}>
            +{val}%
          </Tag>
        );
      },
    },
  ], []);

  const topColumns = useMemo(() => [
    {
      title: '查询词', dataIndex: 'query', key: 'query', width: 200,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '热度值', dataIndex: 'value', key: 'value', width: 120,
      sorter: (a: any, b: any) => (a.value || 0) - (b.value || 0),
      render: (val: number) => {
        if (val === undefined || val === null) return <Text type="secondary">--</Text>;
        return (
          <Tag color="blue" icon={<FireOutlined />} style={{ fontSize: 13, padding: '2px 10px' }}>
            {val}
          </Tag>
        );
      },
    },
  ], []);

  // ============================================================================
  // Tab Items
  // ============================================================================

  const tabItems = [
    // ========================================================================
    // TAB 1: 趋势对比
    // ========================================================================
    {
      key: 'compare',
      label: <span><LineChartOutlined /> 趋势对比</span>,
      children: (
        <div>
          {/* Form */}
          <Card style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                输入关键词进行搜索趋势对比（最多5个）
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 280, display: 'flex', alignItems: 'center' }}>
                  <Input
                    placeholder="输入关键词后按回车添加，如：crane, seo tools"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onPressEnter={handleAddKeyword}
                    prefix={<SearchOutlined />}
                    style={{ flex: 1 }}
                    disabled={compareKeywords.length >= 5}
                    suffix={
                      keywordInput.trim() ? (
                        <Button
                          type="link"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={handleAddKeyword}
                          style={{ padding: 0 }}
                          disabled={compareKeywords.length >= 5}
                        >
                          添加
                        </Button>
                      ) : null
                    }
                  />
                </div>
                <Select
                  value={timeframe}
                  onChange={setTimeframe}
                  options={TIMEFRAME_OPTIONS}
                  style={{ width: 140 }}
                />
                <Select
                  value={geo}
                  onChange={setGeo}
                  options={GEO_OPTIONS}
                  style={{ width: 120 }}
                  prefix={<GlobalOutlined />}
                />
                <Button
                  type="primary"
                  icon={<LineChartOutlined />}
                  onClick={handleCompare}
                  loading={compareLoading}
                  disabled={compareKeywords.length === 0}
                >
                  开始对比
                </Button>
              </div>
            </div>

            {/* Keyword tags */}
            {compareKeywords.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Space wrap size={[4, 8]}>
                  {compareKeywords.map((kw, idx) => (
                    <Tag
                      key={kw}
                      closable
                      onClose={() => handleRemoveKeyword(kw)}
                      color={COLOR_PALETTE[idx % COLOR_PALETTE.length]}
                      style={{ fontSize: 13, padding: '2px 10px', margin: 0 }}
                    >
                      {kw}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
          </Card>

          {/* Loading */}
          {compareLoading && <LoadingSkeleton type="chart" />}

          {/* Error */}
          {compareError && !compareLoading && (
            <ErrorState message={compareError} onRetry={handleCompare} />
          )}

          {/* Empty before search */}
          {!compareResult && !compareLoading && !compareError && (
            <EmptyState
              scene="search"
              title="开始趋势对比"
              description="添加关键词（最多5个），选择时间范围和地区，点击「开始对比」查看Google Trends数据"
            />
          )}

          {/* Results */}
          {compareResult && !compareLoading && (
            <>
              {/* Summary StatCards */}
              {compareResult.averages && Object.keys(compareResult.averages).length > 0 && (
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  {compareResult.keywords.map((kw, idx) => (
                    <Col xs={12} sm={8} md={Math.min(6, Math.floor(24 / Math.max(compareResult.keywords.length, 2)))} key={kw}>
                      <StatCard
                        title={`${kw} 平均热度`}
                        value={compareResult.averages?.[kw] ?? 0}
                        icon={<LineChartOutlined />}
                        color={COLOR_PALETTE[idx % COLOR_PALETTE.length]}
                      />
                    </Col>
                  ))}
                </Row>
              )}

              {/* Trend Chart */}
              <Card
                title={<span><LineChartOutlined /> 趋势对比图</span>}
                style={{ marginBottom: 24 }}
              >
                {multiSeriesTrendData.length > 0 ? (
                  <TrendChart
                    data={multiSeriesTrendData}
                    title="关键词搜索趋势对比"
                    height={450}
                    smooth
                    showArea
                  />
                ) : (
                  <EmptyState scene="data" title="暂无趋势数据" description="当前时间范围内没有足够的趋势数据" />
                )}
              </Card>

              {/* Data Table */}
              {compareResult.timeline && compareResult.timeline.length > 0 && (
                <Card title="趋势数据明细">
                  <Table
                    dataSource={compareResult.timeline.map((item: any, idx: number) => ({
                      key: idx,
                      date: item.date,
                      ...item.values,
                    }))}
                    columns={[
                      {
                        title: '日期', dataIndex: 'date', key: 'date', width: 140, fixed: 'left' as const,
                        render: (d: string) => <Text strong>{d}</Text>,
                      },
                      ...compareResult.keywords.map((kw, idx) => ({
                        title: kw,
                        dataIndex: kw,
                        key: kw,
                        width: 120,
                        render: (val: number) => (
                          <Text style={{ color: COLOR_PALETTE[idx % COLOR_PALETTE.length], fontWeight: 500 }}>
                            {val ?? '-'}
                          </Text>
                        ),
                      })),
                    ]}
                    pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条数据` }}
                    size="middle"
                    scroll={{ x: 140 + compareResult.keywords.length * 120 }}
                  />
                </Card>
              )}
            </>
          )}
        </div>
      ),
    },

    // ========================================================================
    // TAB 2: 相关查询
    // ========================================================================
    {
      key: 'related',
      label: <span><SearchOutlined /> 相关查询</span>,
      children: (
        <div>
          {/* Form */}
          <Card style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Input
                placeholder="输入关键词，如：crane"
                value={relatedKeyword}
                onChange={(e) => setRelatedKeyword(e.target.value)}
                onPressEnter={handleRelatedQuery}
                prefix={<SearchOutlined />}
                style={{ flex: 1, minWidth: 280, maxWidth: 500 }}
                size="large"
              />
              <Button
                type="primary"
                size="large"
                icon={<SearchOutlined />}
                onClick={handleRelatedQuery}
                loading={relatedLoading}
                disabled={!relatedKeyword.trim()}
              >
                查询
              </Button>
            </div>
          </Card>

          {/* Loading */}
          {relatedLoading && <LoadingSkeleton type="page" />}

          {/* Error */}
          {relatedError && !relatedLoading && (
            <ErrorState message={relatedError} onRetry={handleRelatedQuery} />
          )}

          {/* Empty before search */}
          {!relatedResult && !relatedLoading && !relatedError && (
            <EmptyState
              scene="search"
              title="查询相关搜索词"
              description="输入一个关键词，查看与其相关的上升趋势查询和热门查询"
            />
          )}

          {/* Results */}
          {relatedResult && !relatedLoading && (
            <Row gutter={[16, 16]}>
              {/* Rising queries */}
              <Col xs={24} lg={12}>
                <Card
                  title={
                    <span>
                      <RiseOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                      <Text strong>上升趋势</Text>
                      <Tag color="volcano" style={{ marginLeft: 8 }}>Breakout</Tag>
                    </span>
                  }
                  style={{ height: '100%' }}
                >
                  {relatedResult.rising && relatedResult.rising.length > 0 ? (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        <Text type="secondary">
                          共 <Text strong>{relatedResult.rising.length}</Text> 条上升趋势查询
                        </Text>
                      </div>
                      <Table
                        columns={risingColumns}
                        dataSource={relatedResult.rising.map((item: any, idx: number) => ({
                          ...item,
                          key: idx,
                        }))}
                        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` }}
                        size="middle"
                        scroll={{ x: 320 }}
                        locale={{ emptyText: '暂无上升趋势查询' }}
                      />
                    </>
                  ) : (
                    <EmptyState
                      scene="data"
                      title="暂无上升趋势数据"
                      description="当前关键词没有显著的上升趋势查询"
                    />
                  )}
                </Card>
              </Col>

              {/* Top queries */}
              <Col xs={24} lg={12}>
                <Card
                  title={
                    <span>
                      <FireOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
                      <Text strong>热门查询</Text>
                      <Tag color="orange" style={{ marginLeft: 8 }}>Top</Tag>
                    </span>
                  }
                  style={{ height: '100%' }}
                >
                  {relatedResult.top && relatedResult.top.length > 0 ? (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        <Text type="secondary">
                          共 <Text strong>{relatedResult.top.length}</Text> 条热门查询
                        </Text>
                      </div>
                      <Table
                        columns={topColumns}
                        dataSource={relatedResult.top.map((item: any, idx: number) => ({
                          ...item,
                          key: idx,
                        }))}
                        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` }}
                        size="middle"
                        scroll={{ x: 320 }}
                        locale={{ emptyText: '暂无热门查询' }}
                      />
                    </>
                  ) : (
                    <EmptyState
                      scene="data"
                      title="暂无热门查询数据"
                      description="当前关键词没有热门查询数据"
                    />
                  )}
                </Card>
              </Col>
            </Row>
          )}
        </div>
      ),
    },
  ];

  // ============================================================================
  // State: no project
  // ============================================================================
  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader
          title="趋势分析"
          subtitle="Google Trends 趋势分析"
          showCountrySelector
          showDateRange
        />
        <EmptyState
          scene="data"
          title="请先选择项目"
          description="请从顶部导航栏选择一个项目以开始趋势分析"
        />
      </div>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="page-container">
      <PageHeader
        title="趋势分析"
        subtitle={`${projectName} - Google Trends 趋势分析与相关查询`}
        showCountrySelector
        showDateRange
        actions={
          <Space>
            <Button
              icon={<GlobalOutlined />}
              onClick={() => {
                setCompareKeywords([]);
                setCompareResult(null);
                setCompareError(null);
                setRelatedKeyword('');
                setRelatedResult(null);
                setRelatedError(null);
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
        style={{ marginTop: 8 }}
        items={tabItems}
      />
    </div>
  );
};

export default Trends;