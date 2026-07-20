import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Modal, Input, Form, Typography, Row, Col,
  Space, Popconfirm, Tabs, Select, Tag, message, Descriptions, Tooltip,
  Slider, InputNumber, Progress,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ReloadOutlined, EditOutlined,
  EnvironmentOutlined, StarOutlined, PhoneOutlined, SwapOutlined,
  ShopOutlined, GlobalOutlined, RiseOutlined, EyeOutlined,
  AimOutlined, CompassOutlined, TrophyOutlined,
  CommentOutlined, SearchOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { TrendChart, ComparisonChart } from '@/components/charts';
import type { TrendDataPoint, ComparisonDataPoint } from '@/components/charts';
import { useStore } from '@/store';
import { useProject } from '@/hooks';
import { localSEOAPI } from '@/services/localSeo';
import { geoGridAPI } from '@/services/geoGrid';
const { Text, Paragraph } = Typography;

// Types
interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  lat: number;
  lng: number;
}
interface Ranking {
  id: string;
  keyword: string;
  locationName: string;
  position: number;
  previousPosition: number;
  change: number;
  mapPack: boolean;
}
interface GBPInsight {
  date: string;
  views: number;
  clicks: number;
  calls: number;
  directionRequests: number;
}

interface GMBProfileData {
  businessName: string;
  category: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  status: string;
}

interface ComparisonMetric {
  metric: string;
  value1: string | number;
  value2: string | number;
}

interface ReviewItem {
  id: string;
  author: string;
  rating: number;
  text: string;
  time: string;
  response: string;
}

interface ReviewData {
  businessName: string;
  overallRating: number;
  totalReviews: number;
  ratingDistribution: { stars: number; count: number }[];
  reviews: ReviewItem[];
}

interface GeoGridPoint {
  lat: number;
  lng: number;
  rank: number;
}

interface GeoGridResult {
  averageRank: number;
  bestRank: number;
  worstRank: number;
  gridPoints: GeoGridPoint[];
}

const INITIAL_LOCATION: Location = {
  id: '',
  name: '',
  address: '',
  city: '',
  state: '',
  country: '',
  phone: '',
  lat: 0,
  lng: 0,
};

// ---- Helpers ----
const getRankColor = (pos: number): string => {
  if (!pos || pos === 0) return 'default';
  if (pos <= 3) return '#52c41a';
  if (pos <= 10) return '#1677ff';
  if (pos <= 20) return '#faad14';
  return '#ff4d4f';
};

const getChangeText = (change: number): { text: string; color: string } => {
  if (change > 0) return { text: `+${change}`, color: '#ff4d4f' };
  if (change < 0) return { text: String(change), color: '#52c41a' };
  return { text: '--', color: '#d9d9d9' };
};

const getStatusColor = (status: string): string => {
  const s = status?.toLowerCase() || '';
  if (s === 'verified' || s === 'active') return 'green';
  if (s === 'pending') return 'orange';
  if (s === 'unverified' || s === 'suspended') return 'red';
  return 'default';
};

// ---- Component ----
const LocalSEO: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const projectName = useStore((s) => s.currentProject?.name || '');
  const { hasProject } = useProject();

  // ---- State ----
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('locations');

  // Data
  const [locations, setLocations] = useState<Location[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [gbpInsights, setGbpInsights] = useState<GBPInsight[]>([]);
  const [gmbProfile, setGmbProfile] = useState<GMBProfileData | null>(null);

  // Location modal
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location>(INITIAL_LOCATION);
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationForm] = Form.useForm();

  // Comparison
  const [compareLoc1, setCompareLoc1] = useState<string>('');
  const [compareLoc2, setCompareLoc2] = useState<string>('');
  const [compareResult, setCompareResult] = useState<ComparisonMetric[] | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // ---- New Tab State ----

  // Reviews
  const [reviews, setReviews] = useState<ReviewData | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Geo Grid
  const [geoLat, setGeoLat] = useState<number>(31.2304);
  const [geoLng, setGeoLng] = useState<number>(121.4737);
  const [geoRadius, setGeoRadius] = useState<number>(5);
  const [geoGridSize, setGeoGridSize] = useState<number>(3);
  const [geoGridResult, setGeoGridResult] = useState<GeoGridResult | null>(null);
  const [geoGridLoading, setGeoGridLoading] = useState(false);

  // ---- Data loading ----
  const loadLocations = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await localSEOAPI.getRankings(projectId);
      const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
      setLocations(list);
    } catch {
      setLocations([]);
    }
  }, [projectId]);

  const loadRankings = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await localSEOAPI.getRankings(projectId);
      const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
      setRankings(list);
    } catch {
      setRankings([]);
    }
  }, [projectId]);

  const loadGbpInsights = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await localSEOAPI.getGMBProfile(projectId);
      const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
      setGbpInsights(list);
    } catch {
      setGbpInsights([]);
    }
  }, [projectId]);

  const loadGMBProfile = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await localSEOAPI.getGMBProfile(projectId);
      const data = res?.data || res;
      if (data && !Array.isArray(data) && typeof data === 'object') {
        setGmbProfile(data as GMBProfileData);
      } else {
        setGmbProfile(null);
      }
    } catch {
      setGmbProfile(null);
    }
  }, [projectId]);

  const loadAll = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadLocations(), loadRankings(), loadGbpInsights(), loadGMBProfile()]);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, loadLocations, loadRankings, loadGbpInsights, loadGMBProfile]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadAll();
  }, [projectId]);

  // ---- New Data Loading ----

  const loadReviews = useCallback(async () => {
    if (!projectId) return;
    setReviewsLoading(true);
    try {
      const res: any = await geoGridAPI.getReviews(projectId);
      const data = res?.data ?? res;
      if (data) {
        const ratingDist: { stars: number; count: number }[] = [];
        if (data.ratingDistribution) {
          for (let i = 5; i >= 1; i--) {
            ratingDist.push({
              stars: i,
              count: data.ratingDistribution[i] || data.ratingDistribution[`${i}star`] || 0,
            });
          }
        }
        setReviews({
          businessName: data.businessName || '',
          overallRating: data.overallRating || data.rating || 0,
          totalReviews: data.totalReviews || data.reviewCount || 0,
          ratingDistribution: ratingDist,
          reviews: Array.isArray(data.reviews) ? data.reviews : (data.items || []),
        });
      } else {
        setReviews(null);
      }
    } catch {
      setReviews(null);
    } finally {
      setReviewsLoading(false);
    }
  }, [projectId]);

  const handleGeoGridQuery = async () => {
    if (!projectId) return;
    setGeoGridLoading(true);
    setGeoGridResult(null);
    try {
      const res: any = await geoGridAPI.getGeoGrid(projectId, {
        lat: geoLat,
        lng: geoLng,
        radius: geoRadius,
        gridSize: geoGridSize,
      });
      const data = res?.data ?? res;
      if (data) {
        const points = Array.isArray(data.gridPoints) ? data.gridPoints : (data.points || []);
        setGeoGridResult({
          averageRank: data.averageRank || data.avgRank || 0,
          bestRank: data.bestRank || 0,
          worstRank: data.worstRank || 0,
          gridPoints: points,
        });
      } else {
        setGeoGridResult(null);
      }
      message.success('Geo Grid 查询完成');
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || '查询失败');
    } finally {
      setGeoGridLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === 'reviews' && !reviews) loadReviews();
  };

  // ---- Location CRUD ----
  const handleAddLocation = () => {
    setEditingLocation(INITIAL_LOCATION);
    locationForm.resetFields();
    setLocationModalOpen(true);
  };

  const handleEditLocation = (loc: Location) => {
    setEditingLocation(loc);
    locationForm.setFieldsValue(loc);
    setLocationModalOpen(true);
  };

  const handleSaveLocation = async () => {
    try {
      const values = await locationForm.validateFields();
      setLocationSaving(true);
      if (editingLocation.id) {
        await localSEOAPI.addKeyword(projectId!, { ...values, id: editingLocation.id });
        message.success('位置信息已更新');
      } else {
        await localSEOAPI.addKeyword(projectId!, values);
        message.success('位置已添加');
      }
      setLocationModalOpen(false);
      await loadLocations();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.error?.message || err?.message || '保存失败');
    } finally {
      setLocationSaving(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      await localSEOAPI.refreshData(projectId!);
      message.success('位置已删除');
      await loadLocations();
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || '删除失败');
    }
  };

  // ---- Comparison ----
  const handleCompare = async () => {
    if (!compareLoc1 || !compareLoc2) {
      message.warning('请选择两个位置进行对比');
      return;
    }
    if (compareLoc1 === compareLoc2) {
      message.warning('请选择两个不同的位置');
      return;
    }
    setCompareLoading(true);
    setCompareResult(null);
    try {
      const res: any = await localSEOAPI.compareLocations(projectId!, compareLoc1, compareLoc2);
      const data = res?.data || res;
      const metrics = data?.metrics || data?.comparison || (Array.isArray(data) ? data : []);
      setCompareResult(metrics);
      message.success('对比完成');
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || '对比失败');
    } finally {
      setCompareLoading(false);
    }
  };

  // ---- KPI calculations ----
  const locationsCount = locations.length;
  const avgRanking = rankings.length > 0
    ? Math.round(rankings.reduce((s, r) => s + (r.position || 50), 0) / rankings.length)
    : 0;

  const totalGbpViews = gbpInsights.reduce((s, i) => s + (i.views || 0), 0);
  const totalGbpClicks = gbpInsights.reduce((s, i) => s + (i.clicks || 0), 0);
  const totalGbpCalls = gbpInsights.reduce((s, i) => s + (i.calls || 0), 0);
  const totalGbpDirections = gbpInsights.reduce((s, i) => s + (i.directionRequests || 0), 0);
  const totalReviews = gmbProfile?.reviewCount || 0;

  // ---- Columns ----
  const rankingColumns = [
    {
      title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 180,
      render: (t: string) => <Text strong>{t}</Text>,
    },
    {
      title: '位置', dataIndex: 'locationName', key: 'locationName', width: 140,
      render: (t: string) => (
        <Tag icon={<EnvironmentOutlined />} color="blue">{t}</Tag>
      ),
    },
    {
      title: '排名', dataIndex: 'position', key: 'position', width: 80,
      render: (v: number) => {
        if (!v) return <Tag>--</Tag>;
        return <Tag color={getRankColor(v)} style={{ fontWeight: 600 }}>#{v}</Tag>;
      },
    },
    {
      title: '变化', key: 'change', width: 70,
      render: (_: unknown, r: Ranking) => {
        const { text, color } = getChangeText(r.change || 0);
        return <Text style={{ color, fontWeight: 500 }}>{text}</Text>;
      },
    },
    {
      title: 'Map Pack', dataIndex: 'mapPack', key: 'mapPack', width: 90,
      render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag>,
    },
  ];

  const comparisonColumns = [
    {
      title: '指标', dataIndex: 'metric', key: 'metric', width: 160,
      render: (t: string) => <Text strong>{t}</Text>,
    },
    {
      title: (
        <span>
          <EnvironmentOutlined style={{ marginRight: 4 }} />
          {compareLoc1 || '位置1'}
        </span>
      ),
      dataIndex: 'value1', key: 'value1',
      render: (v: string | number) => <Text>{v}</Text>,
    },
    {
      title: (
        <span>
          <EnvironmentOutlined style={{ marginRight: 4 }} />
          {compareLoc2 || '位置2'}
        </span>
      ),
      dataIndex: 'value2', key: 'value2',
      render: (v: string | number) => <Text>{v}</Text>,
    },
  ];

  const reviewsColumns = [
    {
      title: '作者', dataIndex: 'author', key: 'author', width: 120,
      render: (t: string) => <Text strong>{t}</Text>,
    },
    {
      title: '评分', dataIndex: 'rating', key: 'rating', width: 80,
      render: (r: number) => {
        const stars = [];
        for (let i = 0; i < r; i++) {
          stars.push(<StarOutlined key={i} style={{ color: '#faad14', fontSize: 12 }} />);
        }
        return <Space size={0}>{stars}</Space>;
      },
    },
    {
      title: '评论内容', dataIndex: 'text', key: 'text', ellipsis: true,
      render: (t: string) => <Text style={{ fontSize: 12 }}>{t}</Text>,
    },
    {
      title: '时间', dataIndex: 'time', key: 'time', width: 140,
      render: (t: string) => t ? new Date(t).toLocaleString('zh-CN') : '-',
    },
    {
      title: '回复', dataIndex: 'response', key: 'response', width: 150, ellipsis: true,
      render: (t: string) => t ? <Text type="secondary" style={{ fontSize: 11 }}>{t}</Text> : <Tag>未回复</Tag>,
    },
  ];

  const geoGridColumns = [
    {
      title: '纬度', dataIndex: 'lat', key: 'lat', width: 120,
      render: (v: number) => <Tag color="blue">{v?.toFixed(6)}</Tag>,
    },
    {
      title: '经度', dataIndex: 'lng', key: 'lng', width: 120,
      render: (v: number) => <Tag color="green">{v?.toFixed(6)}</Tag>,
    },
    {
      title: '排名', dataIndex: 'rank', key: 'rank', width: 100,
      render: (v: number) => {
        if (!v) return <Tag>--</Tag>;
        return <Tag color={getRankColor(v)} style={{ fontWeight: 600 }}>#{v}</Tag>;
      },
    },
  ];

  // ---- Chart data ----
  const rankingComparisonData: ComparisonDataPoint[] = locations.map((loc) => {
    const locRankings = rankings.filter((r) => r.locationName === loc.name);
    const avg = locRankings.length > 0
      ? Math.round(locRankings.reduce((s, r) => s + (r.position || 50), 0) / locRankings.length)
      : 0;
    return { name: loc.name, value: avg };
  });

  const viewsTrendData: TrendDataPoint[] = gbpInsights.map((i) => ({
    date: i.date || '',
    value: i.views || 0,
  }));

  const clicksTrendData: TrendDataPoint[] = gbpInsights.map((i) => ({
    date: i.date || '',
    value: i.clicks || 0,
  }));

  const callsTrendData: TrendDataPoint[] = gbpInsights.map((i) => ({
    date: i.date || '',
    value: i.calls || 0,
  }));

  const directionsTrendData: TrendDataPoint[] = gbpInsights.map((i) => ({
    date: i.date || '',
    value: i.directionRequests || 0,
  }));

  const compareChartData: ComparisonDataPoint[] = (compareResult || []).map((m) => ({
    name: m.metric,
    value: typeof m.value1 === 'number' ? m.value1 : parseFloat(String(m.value1)) || 0,
  }));

  const compareChartData2: ComparisonDataPoint[] = (compareResult || []).map((m) => ({
    name: `${m.metric} (${compareLoc2})`,
    value: typeof m.value2 === 'number' ? m.value2 : parseFloat(String(m.value2)) || 0,
  }));

  // ---- State: no project ----
  if (!hasProject) {
    return (
      <div className="page-container">
        <PageHeader title="本地SEO" subtitle="请先选择项目" showCountrySelector />
        <EmptyState
          scene="data"
          title="请先选择项目"
          description="选择一个项目或创建新项目，开始管理本地 SEO 数据"
        />
      </div>
    );
  }

  // ---- State: loading ----
  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="本地SEO"
          subtitle={`${projectName} - 本地搜索优化`}
          showCountrySelector
          actions={<Button icon={<ReloadOutlined />} loading disabled>刷新</Button>}
        />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ---- State: error ----
  if (error && locations.length === 0 && rankings.length === 0) {
    return (
      <div className="page-container">
        <PageHeader
          title="本地SEO"
          subtitle={`${projectName} - 本地搜索优化`}
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
        title="本地SEO"
        subtitle={`${projectName} - ${locationsCount} 个位置 · 平均排名 #${avgRanking || '--'}`}
        showCountrySelector
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadAll}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddLocation}>
              添加位置
            </Button>
          </Space>
        }
      />

      {/* KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="位置管理数"
            value={locationsCount}
            icon={<ShopOutlined />}
            color="#1677ff"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="平均本地排名"
            value={avgRanking || '--'}
            icon={<TrophyOutlined />}
            color="#52c41a"
            subtitle={avgRanking <= 3 ? '表现优秀' : avgRanking <= 10 ? '良好' : '需优化'}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="GBP 浏览"
            value={totalGbpViews.toLocaleString()}
            icon={<EyeOutlined />}
            color="#fa8c16"
            suffix=" 次"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="评价数"
            value={totalReviews}
            icon={<StarOutlined />}
            color="#13c2c2"
          />
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        style={{ marginTop: 8 }}
        items={[
          // Tab 1: 位置管理
          {
            key: 'locations',
            label: <span><EnvironmentOutlined /> 位置管理</span>,
            children: (
              <>
                {locations.length === 0 ? (
                  <EmptyState
                    scene="data"
                    title="暂无位置"
                    description="添加您的业务位置，开始追踪本地搜索排名"
                    action={{ text: '添加位置', icon: <PlusOutlined />, onClick: handleAddLocation }}
                  />
                ) : (
                  <Row gutter={[16, 16]}>
                    {locations.map((loc) => (
                      <Col xs={24} sm={12} lg={8} key={loc.id}>
                        <Card
                          hoverable
                          style={{ borderRadius: 8 }}
                          actions={[
                            <Tooltip title="编辑" key="edit">
                              <EditOutlined onClick={() => handleEditLocation(loc)} />
                            </Tooltip>,
                            <Popconfirm
                              key="delete"
                              title="确定删除此位置？"
                              onConfirm={() => handleDeleteLocation(loc.id)}
                            >
                              <Tooltip title="删除">
                                <DeleteOutlined style={{ color: '#ff4d4f' }} />
                              </Tooltip>
                            </Popconfirm>,
                          ]}
                        >
                          <Card.Meta
                            avatar={
                              <div style={{
                                width: 40, height: 40, borderRadius: 8,
                                background: '#1677ff15', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontSize: 20, color: '#1677ff',
                              }}>
                                <ShopOutlined />
                              </div>
                            }
                            title={<Text strong>{loc.name}</Text>}
                            description={
                              <div>
                                <Paragraph ellipsis style={{ marginBottom: 4, fontSize: 13 }}>
                                  <EnvironmentOutlined style={{ marginRight: 4 }} />
                                  {loc.address}, {loc.city}, {loc.state}
                                </Paragraph>
                                <Paragraph style={{ marginBottom: 4, fontSize: 13 }}>
                                  <PhoneOutlined style={{ marginRight: 4 }} />
                                  {loc.phone || '--'}
                                </Paragraph>
                                <Paragraph style={{ marginBottom: 0, fontSize: 13 }}>
                                  <GlobalOutlined style={{ marginRight: 4 }} />
                                  {loc.country || '--'}
                                </Paragraph>
                                <div style={{ marginTop: 8 }}>
                                  <Tag color="blue">{loc.lat?.toFixed(4)}</Tag>
                                  <Tag color="green">{loc.lng?.toFixed(4)}</Tag>
                                </div>
                              </div>
                            }
                          />
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </>
            ),
          },

          // Tab 2: 排名数据
          {
            key: 'rankings',
            label: <span><RiseOutlined /> 排名数据</span>,
            children: (
              <>
                {rankingComparisonData.length > 0 && (
                  <Card
                    title={<><SwapOutlined /> 各位置排名对比</>}
                    style={{ marginBottom: 24, borderRadius: 8 }}
                  >
                    <ComparisonChart
                      data={rankingComparisonData}
                      height={300}
                      title="平均排名"
                    />
                  </Card>
                )}

                <Card
                  title="关键词排名详情"
                  style={{ borderRadius: 8 }}
                >
                  {rankings.length === 0 ? (
                    <EmptyState scene="data" title="暂无排名数据" description="添加位置后，系统将自动追踪本地搜索排名" />
                  ) : (
                    <Table
                      columns={rankingColumns}
                      dataSource={rankings}
                      rowKey="id"
                      size="middle"
                      pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 条排名` }}
                      scroll={{ x: 600 }}
                    />
                  )}
                </Card>
              </>
            ),
          },

          // Tab 3: GMB 档案
          {
            key: 'gbp-insights',
            label: <span><AimOutlined /> GMB 档案</span>,
            children: (
              <>
                {/* GMB Profile Descriptions */}
                {gmbProfile && (
                  <Card
                    title={<><ShopOutlined /> GMB 商家档案</>}
                    style={{ marginBottom: 24, borderRadius: 8 }}
                  >
                    <Descriptions
                      bordered
                      size="small"
                      column={{ xs: 1, sm: 2, lg: 3 }}
                    >
                      <Descriptions.Item label="商家名称">
                        <Text strong>{gmbProfile.businessName || '--'}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="类别">
                        <Tag color="blue">{gmbProfile.category || '--'}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="状态">
                        <Tag color={getStatusColor(gmbProfile.status)}>
                          {gmbProfile.status || '--'}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="地址" span={2}>
                        <Text><EnvironmentOutlined style={{ marginRight: 4 }} />{gmbProfile.address || '--'}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="电话">
                        <Text><PhoneOutlined style={{ marginRight: 4 }} />{gmbProfile.phone || '--'}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="评分">
                        <Text style={{ color: '#fa8c16', fontWeight: 600 }}>
                          <StarOutlined style={{ marginRight: 4 }} />
                          {gmbProfile.rating != null ? gmbProfile.rating.toFixed(1) : '--'}
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="评价数">
                        <Text strong>{gmbProfile.reviewCount != null ? gmbProfile.reviewCount.toLocaleString() : '--'}</Text>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                )}

                {/* GBP Insight StatCards */}
                {gbpInsights.length > 0 && (
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={12} sm={6}>
                      <StatCard
                        title="浏览数"
                        value={totalGbpViews.toLocaleString()}
                        icon={<EyeOutlined />}
                        color="#1677ff"
                        suffix=" 次"
                      />
                    </Col>
                    <Col xs={12} sm={6}>
                      <StatCard
                        title="点击数"
                        value={totalGbpClicks.toLocaleString()}
                        icon={<AimOutlined />}
                        color="#52c41a"
                        suffix=" 次"
                      />
                    </Col>
                    <Col xs={12} sm={6}>
                      <StatCard
                        title="来电数"
                        value={totalGbpCalls.toLocaleString()}
                        icon={<PhoneOutlined />}
                        color="#fa8c16"
                        suffix=" 次"
                      />
                    </Col>
                    <Col xs={12} sm={6}>
                      <StatCard
                        title="路线请求"
                        value={totalGbpDirections.toLocaleString()}
                        icon={<CompassOutlined />}
                        color="#13c2c2"
                        suffix=" 次"
                      />
                    </Col>
                  </Row>
                )}

                {/* Trend Charts */}
                {gbpInsights.length === 0 && !gmbProfile ? (
                  <EmptyState scene="data" title="暂无 GMB 数据" description="连接 Google Business Profile 后将显示档案与洞察数据" />
                ) : (
                  gbpInsights.length > 0 && (
                    <Row gutter={[16, 16]}>
                      <Col xs={24} lg={12}>
                        <Card title={<><EyeOutlined /> 浏览次数</>} style={{ borderRadius: 8 }}>
                          <TrendChart data={viewsTrendData} height={280} smooth showArea color="#1677ff" />
                        </Card>
                      </Col>
                      <Col xs={24} lg={12}>
                        <Card title={<><AimOutlined /> 点击次数</>} style={{ borderRadius: 8 }}>
                          <TrendChart data={clicksTrendData} height={280} smooth showArea color="#52c41a" />
                        </Card>
                      </Col>
                      <Col xs={24} lg={12}>
                        <Card title={<><PhoneOutlined /> 来电次数</>} style={{ borderRadius: 8 }}>
                          <TrendChart data={callsTrendData} height={280} smooth showArea color="#fa8c16" />
                        </Card>
                      </Col>
                      <Col xs={24} lg={12}>
                        <Card title={<><CompassOutlined /> 路线请求</>} style={{ borderRadius: 8 }}>
                          <TrendChart data={directionsTrendData} height={280} smooth showArea color="#13c2c2" />
                        </Card>
                      </Col>
                    </Row>
                  )
                )}
              </>
            ),
          },

          // Tab 4: 位置对比
          {
            key: 'compare',
            label: <span><SwapOutlined /> 位置对比</span>,
            children: (
              <>
                <Card style={{ borderRadius: 8, marginBottom: 24 }}>
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={10}>
                      <Select
                        placeholder="选择位置 1"
                        value={compareLoc1 || undefined}
                        onChange={(val) => setCompareLoc1(val)}
                        style={{ width: '100%' }}
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        options={locations.map((loc) => ({
                          value: loc.name,
                          label: loc.name,
                        }))}
                      />
                    </Col>
                    <Col xs={24} sm={4} style={{ textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 18 }}>
                        <SwapOutlined /> VS
                      </Text>
                    </Col>
                    <Col xs={24} sm={10}>
                      <Select
                        placeholder="选择位置 2"
                        value={compareLoc2 || undefined}
                        onChange={(val) => setCompareLoc2(val)}
                        style={{ width: '100%' }}
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        options={locations.map((loc) => ({
                          value: loc.name,
                          label: loc.name,
                        }))}
                      />
                    </Col>
                  </Row>
                  <Row style={{ marginTop: 16 }} justify="center">
                    <Button
                      type="primary"
                      icon={<SwapOutlined />}
                      onClick={handleCompare}
                      loading={compareLoading}
                      disabled={!compareLoc1 || !compareLoc2}
                      size="large"
                    >
                      开始对比
                    </Button>
                  </Row>
                </Card>

                {compareResult && compareResult.length > 0 && (
                  <>
                    <Card
                      title="对比详情"
                      style={{ borderRadius: 8, marginBottom: 24 }}
                    >
                      <Table
                        columns={comparisonColumns}
                        dataSource={compareResult.map((m, i) => ({ ...m, key: i }))}
                        pagination={false}
                        size="middle"
                        bordered
                      />
                    </Card>

                    <Card
                      title={<><SwapOutlined /> 指标对比图</>}
                      style={{ borderRadius: 8 }}
                    >
                      <ComparisonChart
                        data={[...compareChartData, ...compareChartData2]}
                        height={350}
                        horizontal
                        title=""
                      />
                    </Card>
                  </>
                )}

                {compareResult && compareResult.length === 0 && (
                  <EmptyState
                    scene="data"
                    title="暂无对比数据"
                    description="所选位置暂无可用对比数据，请尝试其他位置组合"
                  />
                )}

                {!compareResult && !compareLoading && (
                  <EmptyState
                    scene="data"
                    title="位置对比"
                    description="选择两个位置，点击「开始对比」查看并排比较数据"
                  />
                )}
              </>
            ),
          },

          // =============================================
          // NEW TAB: 评论分析
          // =============================================
          {
            key: 'reviews',
            label: <span><CommentOutlined /> 评论分析</span>,
            children: (
              <>
                {reviewsLoading ? (
                  <LoadingSkeleton type="page" />
                ) : reviews ? (
                  <>
                    {/* Business Info & Rating Card */}
                    <Card style={{ marginBottom: 24, borderRadius: 8 }}>
                      <Row gutter={[24, 16]} align="middle">
                        <Col xs={24} sm={8}>
                          <div style={{ textAlign: 'center' }}>
                            <Text strong style={{ fontSize: 16 }}>{reviews.businessName}</Text>
                            <div style={{ marginTop: 12 }}>
                              <Text style={{ fontSize: 48, fontWeight: 'bold', color: '#fa8c16' }}>
                                {reviews.overallRating.toFixed(1)}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 16, marginLeft: 4 }}>/ 5</Text>
                            </div>
                            <div style={{ marginTop: 4 }}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <StarOutlined
                                  key={star}
                                  style={{
                                    color: star <= Math.round(reviews.overallRating) ? '#faad14' : '#d9d9d9',
                                    fontSize: 18,
                                    marginRight: 2,
                                  }}
                                />
                              ))}
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <Text type="secondary">共 {reviews.totalReviews} 条评论</Text>
                            </div>
                          </div>
                        </Col>
                        <Col xs={24} sm={16}>
                          <Text strong style={{ display: 'block', marginBottom: 12 }}>评分分布</Text>
                          {reviews.ratingDistribution.length > 0 ? (
                            reviews.ratingDistribution.map((rd) => {
                              const maxCount = Math.max(...reviews.ratingDistribution.map((d) => d.count), 1);
                              const pct = Math.round((rd.count / maxCount) * 100);
                              return (
                                <Row key={rd.stars} align="middle" style={{ marginBottom: 6 }}>
                                  <Col style={{ width: 60 }}>
                                    <Text style={{ fontSize: 12 }}>
                                      {rd.stars} <StarOutlined style={{ color: '#faad14', fontSize: 10 }} />
                                    </Text>
                                  </Col>
                                  <Col flex="auto">
                                    <Progress
                                      percent={rd.count > 0 ? Math.round((rd.count / reviews.totalReviews) * 100) : 0}
                                      size="small"
                                      strokeColor="#faad14"
                                      showInfo={false}
                                    />
                                  </Col>
                                  <Col style={{ width: 40, textAlign: 'right' }}>
                                    <Text type="secondary" style={{ fontSize: 11 }}>{rd.count}</Text>
                                  </Col>
                                </Row>
                              );
                            })
                          ) : (
                            <Text type="secondary">暂无评分分布数据</Text>
                          )}
                        </Col>
                      </Row>
                    </Card>

                    {/* Reviews Table */}
                    <Card title="评论列表" style={{ borderRadius: 8 }}>
                      {reviews.reviews.length > 0 ? (
                        <Table
                          columns={reviewsColumns}
                          dataSource={reviews.reviews}
                          rowKey="id"
                          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条评论` }}
                          size="middle"
                          scroll={{ x: 800 }}
                        />
                      ) : (
                        <EmptyState scene="data" title="暂无评论" description="暂无用户评论数据" />
                      )}
                    </Card>
                  </>
                ) : (
                  <EmptyState
                    scene="data"
                    title="暂无评论数据"
                    description="连接 Google Business Profile 后将显示评论分析"
                  />
                )}
              </>
            ),
          },

          // =============================================
          // NEW TAB: Geo Grid 排名
          // =============================================
          {
            key: 'geo-grid',
            label: <span><CompassOutlined /> Geo Grid 排名</span>,
            children: (
              <>
                <Card title="Geo Grid 查询配置" style={{ marginBottom: 24, borderRadius: 8 }}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>中心纬度</Text>
                      <InputNumber
                        value={geoLat}
                        onChange={(v) => setGeoLat(v || 31.2304)}
                        style={{ width: '100%' }}
                        step={0.0001}
                        placeholder="纬度"
                      />
                    </Col>
                    <Col xs={24} sm={6}>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>中心经度</Text>
                      <InputNumber
                        value={geoLng}
                        onChange={(v) => setGeoLng(v || 121.4737)}
                        style={{ width: '100%' }}
                        step={0.0001}
                        placeholder="经度"
                      />
                    </Col>
                    <Col xs={24} sm={6}>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>半径 (km): {geoRadius}</Text>
                      <Slider
                        min={1}
                        max={50}
                        value={geoRadius}
                        onChange={(v) => setGeoRadius(v)}
                        marks={{ 1: '1', 10: '10', 25: '25', 50: '50' }}
                      />
                    </Col>
                    <Col xs={24} sm={6}>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>网格大小</Text>
                      <Select
                        value={geoGridSize}
                        onChange={(v) => setGeoGridSize(v)}
                        style={{ width: '100%' }}
                        options={[
                          { value: 3, label: '3x3' },
                          { value: 5, label: '5x5' },
                          { value: 7, label: '7x7' },
                          { value: 9, label: '9x9' },
                        ]}
                      />
                    </Col>
                  </Row>
                  <Row style={{ marginTop: 16 }} justify="center">
                    <Button
                      type="primary"
                      size="large"
                      icon={<SearchOutlined />}
                      onClick={handleGeoGridQuery}
                      loading={geoGridLoading}
                    >
                      查询
                    </Button>
                  </Row>
                </Card>

                {geoGridLoading && <LoadingSkeleton type="page" />}

                {geoGridResult && !geoGridLoading && (
                  <>
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                      <Col xs={12} sm={8}>
                        <StatCard
                          title="平均排名"
                          value={geoGridResult.averageRank || '--'}
                          icon={<AimOutlined />}
                          color="#1677ff"
                          subtitle={geoGridResult.averageRank <= 3 ? '表现优秀' : geoGridResult.averageRank <= 10 ? '良好' : '需优化'}
                        />
                      </Col>
                      <Col xs={12} sm={8}>
                        <StatCard
                          title="最佳排名"
                          value={geoGridResult.bestRank || '--'}
                          icon={<TrophyOutlined />}
                          color="#52c41a"
                        />
                      </Col>
                      <Col xs={12} sm={8}>
                        <StatCard
                          title="最差排名"
                          value={geoGridResult.worstRank || '--'}
                          icon={<CompassOutlined />}
                          color="#ff4d4f"
                        />
                      </Col>
                    </Row>

                    <Card
                      title={`网格点排名 (${geoGridResult.gridPoints.length} 个点)`}
                      style={{ borderRadius: 8 }}
                    >
                      {geoGridResult.gridPoints.length > 0 ? (
                        <Table
                          columns={geoGridColumns}
                          dataSource={geoGridResult.gridPoints.map((p, i) => ({ ...p, key: i }))}
                          pagination={{ pageSize: 25, showSizeChanger: true, showTotal: (t) => `共 ${t} 个网格点` }}
                          size="middle"
                          scroll={{ x: 400 }}
                        />
                      ) : (
                        <EmptyState scene="data" title="暂无网格点数据" />
                      )}
                    </Card>
                  </>
                )}

                {!geoGridResult && !geoGridLoading && (
                  <EmptyState
                    scene="search"
                    title="Geo Grid 排名"
                    description="配置坐标和半径，点击「查询」查看网格化的本地排名数据"
                  />
                )}
              </>
            ),
          },
        ]}
      />

      {/* Location Add/Edit Modal */}
      <Modal
        title={editingLocation.id ? '编辑位置' : '添加位置'}
        open={locationModalOpen}
        onOk={handleSaveLocation}
        onCancel={() => { setLocationModalOpen(false); locationForm.resetFields(); }}
        confirmLoading={locationSaving}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        width={600}
      >
        <Form
          form={locationForm}
          layout="vertical"
          style={{ marginTop: 16 }}
          initialValues={editingLocation}
        >
          <Form.Item
            name="name"
            label="位置名称"
            rules={[{ required: true, message: '请输入位置名称' }]}
          >
            <Input placeholder="如：上海浦东旗舰店" />
          </Form.Item>
          <Form.Item
            name="address"
            label="详细地址"
            rules={[{ required: true, message: '请输入详细地址' }]}
          >
            <Input placeholder="如：浦东新区陆家嘴环路1000号" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="city" label="城市" rules={[{ required: true, message: '请输入城市' }]}>
                <Input placeholder="如：上海" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="state" label="省份/州" rules={[{ required: true, message: '请输入省份' }]}>
                <Input placeholder="如：上海" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="country" label="国家" rules={[{ required: true, message: '请输入国家' }]}>
                <Input placeholder="如：中国" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="电话" rules={[{ required: true, message: '请输入电话' }]}>
                <Input placeholder="如：021-5888-8888" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="lat" label="纬度" rules={[{ required: true, message: '请输入纬度' }]}>
                <Input placeholder="如：31.2357" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lng" label="经度" rules={[{ required: true, message: '请输入经度' }]}>
                <Input placeholder="如：121.4912" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default LocalSEO;