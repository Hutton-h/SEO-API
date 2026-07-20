import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Typography, Row, Col, Space,
  Tabs, Select, Tag, message, Input,
} from 'antd';
import {
  ReloadOutlined, SearchOutlined, BarChartOutlined,
  LineChartOutlined, ThunderboltOutlined, FileTextOutlined,
  BulbOutlined, QuestionCircleOutlined, EnvironmentOutlined,
  DatabaseOutlined, PieChartOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { TrendChart, DistributionChart } from '@/components/charts';
import type { TrendDataPoint, DistributionDataPoint } from '@/components/charts';
import { useStore } from '@/store';
import { useProject } from '@/hooks';
import { serpFeaturesAPI } from '@/services/serpFeatures';

const { Text } = Typography;
const { Option } = Select;

// ============================================================================
// Types
// ============================================================================

interface FeatureRecord {
  id: string;
  keyword: string;
  feature_type: string;
  position: number;
  title: string;
  url: string;
  detected_at: string;
}

interface FeatureSummary {
  totalKeywords: number;
  features: Array<{ name: string; key: string; count: number; percentage: number }>;
}

interface FeatureTrend {
  date: string;
  featured_snippet: number;
  knowledge_panel: number;
  people_also_ask: number;
  local_pack: number;
  image_pack: number;
  video_carousel: number;
  top_stories: number;
  site_links: number;
}

// ============================================================================
// Helpers
// ============================================================================

const FEATURE_TYPE_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  featured_snippet: { label: '精选摘要', color: '#1677ff', icon: <FileTextOutlined /> },
  knowledge_panel: { label: '知识面板', color: '#52c41a', icon: <DatabaseOutlined /> },
  people_also_ask: { label: '大家还在问', color: '#fa8c16', icon: <QuestionCircleOutlined /> },
  local_pack: { label: '本地包', color: '#13c2c2', icon: <EnvironmentOutlined /> },
  image_pack: { label: '图片包', color: '#722ed1', icon: <ThunderboltOutlined /> },
  video_carousel: { label: '视频轮播', color: '#eb2f96', icon: <ThunderboltOutlined /> },
  top_stories: { label: '热门新闻', color: '#ff4d4f', icon: <ThunderboltOutlined /> },
  site_links: { label: '站点链接', color: '#faad14', icon: <ThunderboltOutlined /> },
};

const getFeatureLabel = (type: string): string => {
  return FEATURE_TYPE_MAP[type]?.label || type;
};

const getFeatureColor = (type: string): string => {
  return FEATURE_TYPE_MAP[type]?.color || '#d9d9d9';
};

// ============================================================================
// Component
// ============================================================================

const SerpFeatures: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const projectName = useStore((s) => s.currentProject?.name || '');
  const { hasProject } = useProject();

  // ---- State ----
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Data
  const [features, setFeatures] = useState<FeatureRecord[]>([]);
  const [summary, setSummary] = useState<FeatureSummary | null>(null);
  const [trends, setTrends] = useState<FeatureTrend[]>([]);

  // Filters
  const [featureTypeFilter, setFeatureTypeFilter] = useState<string | undefined>();
  const [searchText, setSearchText] = useState('');

  // ---- Data loading ----
  const loadFeatures = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await serpFeaturesAPI.getFeatureStats(projectId);
      const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
      setFeatures(list);
    } catch {
      setFeatures([]);
    }
  }, [projectId]);

  const loadSummary = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await serpFeaturesAPI.getFeatureStats(projectId);
      const data = res?.data !== undefined ? res.data : res;
      setSummary(data);
    } catch {
      setSummary(null);
    }
  }, [projectId]);

  const loadTrends = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await serpFeaturesAPI.getFeatureDetails(projectId!, 'overview');
      const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
      setTrends(list);
    } catch {
      setTrends([]);
    }
  }, [projectId]);

  const loadAll = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadFeatures(), loadSummary(), loadTrends()]);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, loadFeatures, loadSummary, loadTrends]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadAll();
  }, [projectId]);

  // ---- KPI calculations ----
  const keywordsWithFeatures = summary?.totalKeywords ?? 0;
  const featuredSnippetsCount = summary?.features?.find((f) => f.key === 'featured_snippet')?.count ?? 0;
  const knowledgePanelsCount = summary?.features?.find((f) => f.key === 'knowledge_panel')?.count ?? 0;
  const peopleAlsoAskCount = summary?.features?.find((f) => f.key === 'people_also_ask')?.count ?? 0;

  // ---- Filtered features ----
  const filteredFeatures = features.filter((f) => {
    if (featureTypeFilter && f.feature_type !== featureTypeFilter) return false;
    if (searchText && !f.keyword.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  // ---- Distribution data ----
  const distributionData: DistributionDataPoint[] = (summary?.features || []).map((f) => ({
    name: getFeatureLabel(f.key),
    value: f.count,
    color: getFeatureColor(f.key),
  }));

  // ---- Trend data ----
  const trendData: TrendDataPoint[] = trends.map((t) => ({
    date: t.date || '',
    value:
      (t.featured_snippet || 0) +
      (t.knowledge_panel || 0) +
      (t.people_also_ask || 0) +
      (t.local_pack || 0),
  }));

  // ---- Columns ----
  const featureColumns = [
    {
      title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 180,
      render: (t: string) => <Text strong>{t}</Text>,
    },
    {
      title: 'SERP 特性', dataIndex: 'feature_type', key: 'feature_type', width: 130,
      render: (type: string) => (
        <Tag color={getFeatureColor(type)}>{getFeatureLabel(type)}</Tag>
      ),
    },
    {
      title: '排名', dataIndex: 'position', key: 'position', width: 80,
      render: (v: number) => {
        if (!v) return <Tag>--</Tag>;
        const color = v <= 3 ? '#52c41a' : v <= 10 ? '#1677ff' : '#faad14';
        return <Tag color={color} style={{ fontWeight: 600 }}>#{v}</Tag>;
      },
    },
    {
      title: '标题', dataIndex: 'title', key: 'title', width: 250, ellipsis: true,
      render: (t: string) => <Text>{t || '-'}</Text>,
    },
    {
      title: 'URL', dataIndex: 'url', key: 'url', width: 220, ellipsis: true,
      render: (u: string) => u ? <Text type="secondary" style={{ fontSize: 12 }}>{u}</Text> : '-',
    },
    {
      title: '检测时间', dataIndex: 'detected_at', key: 'detected_at', width: 150,
      render: (t: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t ? new Date(t).toLocaleString('zh-CN') : '-'}
        </Text>
      ),
    },
  ];

  // ---- State: no project ----
  if (!hasProject) {
    return (
      <div className="page-container">
        <PageHeader title="SERP 特性分析" subtitle="请先选择项目" showCountrySelector />
        <EmptyState
          scene="data"
          title="请先选择项目"
          description="选择一个项目开始分析 SERP 特性数据"
        />
      </div>
    );
  }

  // ---- State: loading ----
  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="SERP 特性分析"
          subtitle={`${projectName} - SERP 特性监控`}
          showCountrySelector
          actions={<Button icon={<ReloadOutlined />} loading disabled>刷新</Button>}
        />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ---- State: error ----
  if (error && features.length === 0 && !summary) {
    return (
      <div className="page-container">
        <PageHeader
          title="SERP 特性分析"
          subtitle={`${projectName} - SERP 特性监控`}
          showCountrySelector
        />
        <ErrorState message={error} onRetry={loadAll} />
      </div>
    );
  }

  // ---- Render ----
  return (
    <div className="page-container">
      <PageHeader
        title="SERP 特性分析"
        subtitle={`${projectName} - ${keywordsWithFeatures} 个关键词拥有 SERP 特性`}
        showCountrySelector
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadAll}>刷新</Button>
          </Space>
        }
      />

      {/* KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="拥有特性的关键词"
            value={keywordsWithFeatures}
            icon={<BarChartOutlined />}
            color="#1677ff"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="精选摘要"
            value={featuredSnippetsCount}
            icon={<FileTextOutlined />}
            color="#52c41a"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="知识面板"
            value={knowledgePanelsCount}
            icon={<DatabaseOutlined />}
            color="#fa8c16"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="大家还在问"
            value={peopleAlsoAskCount}
            icon={<QuestionCircleOutlined />}
            color="#722ed1"
          />
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ marginTop: 8 }}
        items={[
          {
            key: 'overview',
            label: <span><PieChartOutlined /> 特性分布</span>,
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} md={14}>
                  <Card title="SERP 特性类型分布" style={{ borderRadius: 8 }}>
                    {distributionData.length > 0 ? (
                      <DistributionChart
                        data={distributionData}
                        type="donut"
                        height={400}
                        centerLabel={{ label: '特性总数', value: String(distributionData.reduce((s, d) => s + d.value, 0)) }}
                      />
                    ) : (
                      <EmptyState scene="data" title="暂无分布数据" description="暂无 SERP 特性分布数据" />
                    )}
                  </Card>
                </Col>
                <Col xs={24} md={10}>
                  <Card title="特性类型列表" style={{ borderRadius: 8 }}>
                    {distributionData.length > 0 ? (
                      <div style={{ maxHeight: 400, overflow: 'auto' }}>
                        {distributionData.map((item, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex', justifyContent: 'space-between',
                              alignItems: 'center', padding: '10px 12px',
                              borderBottom: '1px solid #f0f0f0',
                            }}
                          >
                            <Space>
                              <div style={{
                                width: 10, height: 10, borderRadius: '50%',
                                background: item.color || '#d9d9d9',
                              }} />
                              <Text>{item.name}</Text>
                            </Space>
                            <Space>
                              <Text strong>{item.value}</Text>
                              <Tag color="blue">
                                {summary?.features?.[i]?.percentage
                                  ? `${summary.features[i].percentage}%`
                                  : ''}
                              </Tag>
                            </Space>
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
            label: <span><LineChartOutlined /> 特性趋势</span>,
            children: (
              <Card style={{ borderRadius: 8 }}>
                {trendData.length > 0 ? (
                  <TrendChart
                    data={trendData}
                    height={400}
                    smooth
                    showArea
                    color="#1677ff"
                    title="SERP 特性出现频率趋势"
                  />
                ) : (
                  <EmptyState scene="data" title="暂无趋势数据" description="添加关键词并刷新数据后将显示 SERP 特性趋势" />
                )}
              </Card>
            ),
          },
          {
            key: 'features',
            label: <span><ThunderboltOutlined /> 特性详情</span>,
            children: (
              <Card style={{ borderRadius: 8 }}>
                {/* Filters */}
                <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Input.Search
                    placeholder="搜索关键词..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onSearch={() => {}}
                    style={{ width: 260 }}
                    allowClear
                    prefix={<SearchOutlined />}
                  />
                  <Select
                    placeholder="特性类型筛选"
                    allowClear
                    style={{ width: 180 }}
                    value={featureTypeFilter}
                    onChange={setFeatureTypeFilter}
                  >
                    {Object.entries(FEATURE_TYPE_MAP).map(([key, { label, color }]) => (
                      <Option key={key} value={key}>
                        <Tag color={color}>{label}</Tag>
                      </Option>
                    ))}
                  </Select>
                </div>

                {filteredFeatures.length === 0 ? (
                  <EmptyState
                    scene="data"
                    title="暂无 SERP 特性"
                    description="添加关键词后，系统将自动检测 SERP 特性"
                  />
                ) : (
                  <Table
                    columns={featureColumns}
                    dataSource={filteredFeatures}
                    rowKey="id"
                    size="middle"
                    pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 条记录` }}
                    scroll={{ x: 1100 }}
                  />
                )}
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};

export default SerpFeatures;