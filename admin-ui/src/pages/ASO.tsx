import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Modal, Input, Form, Typography, Row, Col,
  Space, Popconfirm, Tabs, Select, Tag, message, Progress,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ReloadOutlined, EditOutlined,
  AppleOutlined, AndroidOutlined, StarOutlined, RiseOutlined,
  KeyOutlined, BarChartOutlined, DashboardOutlined, AppstoreOutlined,
  SearchOutlined, DownloadOutlined, TrophyOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { TrendChart, GaugeChart } from '@/components/charts';
import type { TrendDataPoint, GaugeThreshold } from '@/components/charts';
import { useStore } from '@/store';
import { useProject } from '@/hooks';
import { asoAPI } from '@/services/aso';

const { Text, Paragraph } = Typography;
const { Option } = Select;

// ============================================================================
// Types
// ============================================================================

interface App {
  id: string;
  appName: string;
  appId: string;
  platform: 'ios' | 'android';
  rating: number;
  reviewCount: number;
}

interface KeywordRanking {
  id: string;
  keyword: string;
  position: number;
  change: number;
  volume: number;
  difficulty: number;
  platform: string;
}

interface ASOSummary {
  visibilityScore: number;
  downloadsTrend: Array<{ date: string; value: number }>;
  ratingTrend: Array<{ date: string; value: number }>;
}

const INITIAL_APP: App = {
  id: '',
  appName: '',
  appId: '',
  platform: 'ios',
  rating: 0,
  reviewCount: 0,
};

// ============================================================================
// Helpers
// ============================================================================

const getPlatformIcon = (platform: string) =>
  platform === 'ios' ? <AppleOutlined /> : <AndroidOutlined />;

const getPlatformColor = (platform: string) =>
  platform === 'ios' ? '#1677ff' : '#52c41a';

const getRankColor = (pos: number): string => {
  if (!pos || pos === 0) return 'default';
  if (pos <= 3) return '#52c41a';
  if (pos <= 10) return '#1677ff';
  if (pos <= 20) return '#faad14';
  return '#ff4d4f';
};

const getDifficultyColor = (diff: number): string => {
  if (diff > 60) return '#ff4d4f';
  if (diff > 30) return '#faad14';
  return '#52c41a';
};

// ============================================================================
// Component
// ============================================================================

const ASO: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const projectName = useStore((s) => s.currentProject?.name || '');
  const { hasProject } = useProject();

  // ---- State ----
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('apps');

  // Data
  const [apps, setApps] = useState<App[]>([]);
  const [keywords, setKeywords] = useState<KeywordRanking[]>([]);
  const [summary, setSummary] = useState<ASOSummary>({
    visibilityScore: 0,
    downloadsTrend: [],
    ratingTrend: [],
  });

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string | undefined>();
  const [searchText, setSearchText] = useState('');

  // App modal
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<App>(INITIAL_APP);
  const [appSaving, setAppSaving] = useState(false);
  const [appForm] = Form.useForm();

  // ---- Data loading ----
  const loadApps = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await asoAPI.getASOKeywords(projectId);
      const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
      setApps(list);
    } catch {
      setApps([]);
    }
  }, [projectId]);

  const loadKeywords = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await asoAPI.getASOKeywords(projectId);
      const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
      setKeywords(list);
    } catch {
      setKeywords([]);
    }
  }, [projectId]);

  const loadSummary = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await asoAPI.getASOTrend(projectId);
      const data = res?.data !== undefined ? res.data : res;
      setSummary({
        visibilityScore: data?.visibilityScore ?? 0,
        downloadsTrend: data?.downloadsTrend ?? [],
        ratingTrend: data?.ratingTrend ?? [],
      });
    } catch {
      setSummary({ visibilityScore: 0, downloadsTrend: [], ratingTrend: [] });
    }
  }, [projectId]);

  const loadAll = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadApps(), loadKeywords(), loadSummary()]);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, loadApps, loadKeywords, loadSummary]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadAll();
  }, [projectId]);

  // ---- App CRUD ----
  const handleAddApp = () => {
    setEditingApp(INITIAL_APP);
    appForm.resetFields();
    setAppModalOpen(true);
  };

  const handleSaveApp = async () => {
    try {
      const values = await appForm.validateFields();
      setAppSaving(true);
      if (editingApp.id) {
        await asoAPI.addASOKeyword(projectId!, { ...values, id: editingApp.id });
        message.success('应用已更新');
      } else {
        await asoAPI.addASOKeyword(projectId!, values);
        message.success('应用已添加');
      }
      setAppModalOpen(false);
      await loadApps();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.error?.message || err?.message || '保存失败');
    } finally {
      setAppSaving(false);
    }
  };

  const handleDeleteApp = async (id: string) => {
    try {
      await asoAPI.refreshASOData(projectId!);
      message.success('应用已删除');
      await loadApps();
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || '删除失败');
    }
  };

  // ---- KPI calculations ----
  const appsCount = apps.length;
  const avgRating = apps.length > 0
    ? (apps.reduce((s, a) => s + (a.rating || 0), 0) / apps.length).toFixed(1)
    : '0';
  const totalReviews = apps.reduce((s, a) => s + (a.reviewCount || 0), 0);
  const keywordCount = keywords.length;

  // ---- Filtered keywords ----
  const filteredKeywords = keywords.filter((kw) => {
    if (platformFilter && kw.platform !== platformFilter) return false;
    if (searchText && !kw.keyword.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  // ---- Columns ----
  const keywordColumns = [
    {
      title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 180,
      render: (t: string) => <Text strong>{t}</Text>,
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
      render: (_: unknown, r: KeywordRanking) => {
        const c = r.change || 0;
        if (c > 0) return <Text type="danger">+{c}</Text>;
        if (c < 0) return <Text type="success">{c}</Text>;
        return <Text type="secondary">--</Text>;
      },
    },
    {
      title: '搜索量', dataIndex: 'volume', key: 'volume', width: 100,
      render: (v: number) => (v ?? 0).toLocaleString(),
    },
    {
      title: '难度', dataIndex: 'difficulty', key: 'difficulty', width: 100,
      render: (v: number) => (
        <Progress percent={v ?? 0} size="small" strokeColor={getDifficultyColor(v ?? 0)} />
      ),
    },
    {
      title: '平台', dataIndex: 'platform', key: 'platform', width: 80,
      render: (p: string) => (
        <Tag icon={getPlatformIcon(p)} color={getPlatformColor(p)}>
          {p === 'ios' ? 'iOS' : 'Android'}
        </Tag>
      ),
    },
  ];

  // ---- Chart data ----
  const downloadsTrendData: TrendDataPoint[] = (summary.downloadsTrend || []).map((d: any) => ({
    date: d.date || '',
    value: d.value || 0,
  }));

  const gaugeThresholds: GaugeThreshold[] = [
    { value: 30, color: '#ff4d4f' },
    { value: 60, color: '#faad14' },
    { value: 100, color: '#52c41a' },
  ];

  // ---- State: no project ----
  if (!hasProject) {
    return (
      <div className="page-container">
        <PageHeader title="应用商店优化(ASO)" subtitle="请先选择项目" showCountrySelector />
        <EmptyState
          scene="data"
          title="请先选择项目"
          description="选择一个项目开始管理应用商店优化数据"
        />
      </div>
    );
  }

  // ---- State: loading ----
  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="应用商店优化(ASO)"
          subtitle={`${projectName} - ASO 数据管理`}
          showCountrySelector
          actions={<Button icon={<ReloadOutlined />} loading disabled>刷新</Button>}
        />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ---- State: error ----
  if (error && apps.length === 0 && keywords.length === 0) {
    return (
      <div className="page-container">
        <PageHeader
          title="应用商店优化(ASO)"
          subtitle={`${projectName} - ASO 数据管理`}
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
        title="应用商店优化(ASO)"
        subtitle={`${projectName} - ${appsCount} 个应用 · ${keywordCount} 个关键词`}
        showCountrySelector
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadAll}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddApp}>
              添加应用
            </Button>
          </Space>
        }
      />

      {/* KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="追踪应用"
            value={appsCount}
            icon={<AppstoreOutlined />}
            color="#1677ff"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="平均评分"
            value={avgRating}
            icon={<StarOutlined />}
            color="#fa8c16"
            suffix=" / 5"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="总评价数"
            value={totalReviews.toLocaleString()}
            icon={<TrophyOutlined />}
            color="#13c2c2"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="关键词排名"
            value={keywordCount}
            icon={<KeyOutlined />}
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
            key: 'apps',
            label: <span><AppstoreOutlined /> 应用管理</span>,
            children: (
              <>
                {apps.length === 0 ? (
                  <EmptyState
                    scene="data"
                    title="暂无应用"
                    description="添加您的 iOS 或 Android 应用，开始追踪 ASO 数据"
                    action={{ text: '添加应用', icon: <PlusOutlined />, onClick: handleAddApp }}
                  />
                ) : (
                  <Row gutter={[16, 16]}>
                    {apps.map((app) => (
                      <Col xs={24} sm={12} lg={8} key={app.id}>
                        <Card
                          hoverable
                          style={{ borderRadius: 8 }}
                          actions={[
                            <Popconfirm
                              key="delete"
                              title="确定删除此应用？"
                              onConfirm={() => handleDeleteApp(app.id)}
                            >
                              <DeleteOutlined style={{ color: '#ff4d4f' }} />
                            </Popconfirm>,
                          ]}
                        >
                          <Card.Meta
                            avatar={
                              <div style={{
                                width: 48, height: 48, borderRadius: 12,
                                background: `${getPlatformColor(app.platform)}15`,
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: 24,
                                color: getPlatformColor(app.platform),
                              }}>
                                {getPlatformIcon(app.platform)}
                              </div>
                            }
                            title={
                              <Space>
                                <Text strong>{app.appName}</Text>
                                <Tag color={getPlatformColor(app.platform)}>
                                  {app.platform === 'ios' ? 'iOS' : 'Android'}
                                </Tag>
                              </Space>
                            }
                            description={
                              <div>
                                <Paragraph style={{ marginBottom: 4, fontSize: 13 }}>
                                  <Text type="secondary">App ID: </Text>
                                  <Text code>{app.appId}</Text>
                                </Paragraph>
                                <Space size={16}>
                                  <span>
                                    <StarOutlined style={{ color: '#faad14' }} />
                                    <Text style={{ marginLeft: 4 }}>{app.rating?.toFixed(1) || '--'}</Text>
                                  </span>
                                  <span>
                                    <Text type="secondary">{app.reviewCount ?? 0} 条评价</Text>
                                  </span>
                                </Space>
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
          {
            key: 'keywords',
            label: <span><KeyOutlined /> 关键词排名</span>,
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
                    placeholder="平台筛选"
                    allowClear
                    style={{ width: 140 }}
                    value={platformFilter}
                    onChange={setPlatformFilter}
                  >
                    <Option value="ios"><AppleOutlined /> iOS</Option>
                    <Option value="android"><AndroidOutlined /> Android</Option>
                  </Select>
                </div>

                {filteredKeywords.length === 0 ? (
                  <EmptyState
                    scene="data"
                    title="暂无关键词排名"
                    description="添加应用后，系统将自动追踪关键词排名数据"
                  />
                ) : (
                  <Table
                    columns={keywordColumns}
                    dataSource={filteredKeywords}
                    rowKey="id"
                    size="middle"
                    pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 个关键词` }}
                    scroll={{ x: 700 }}
                  />
                )}
              </Card>
            ),
          },
          {
            key: 'summary',
            label: <span><DashboardOutlined /> ASO 概览</span>,
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} md={10}>
                  <Card title={<><BarChartOutlined /> 可见度评分</>} style={{ borderRadius: 8 }}>
                    <GaugeChart
                      value={summary.visibilityScore}
                      max={100}
                      thresholds={gaugeThresholds}
                      height={300}
                      title="可见度"
                    />
                  </Card>
                </Col>
                <Col xs={24} md={14}>
                  <Card title={<><DownloadOutlined /> 下载趋势</>} style={{ borderRadius: 8 }}>
                    {downloadsTrendData.length > 0 ? (
                      <TrendChart
                        data={downloadsTrendData}
                        height={300}
                        smooth
                        showArea
                        color="#1677ff"
                        title="预估下载量"
                      />
                    ) : (
                      <EmptyState scene="data" title="暂无下载趋势数据" description="添加应用后系统将追踪下载趋势" />
                    )}
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />

      {/* App Add Modal */}
      <Modal
        title="添加应用"
        open={appModalOpen}
        onOk={handleSaveApp}
        onCancel={() => { setAppModalOpen(false); appForm.resetFields(); }}
        confirmLoading={appSaving}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        width={520}
      >
        <Form
          form={appForm}
          layout="vertical"
          style={{ marginTop: 16 }}
          initialValues={editingApp}
        >
          <Form.Item
            name="appName"
            label="应用名称"
            rules={[{ required: true, message: '请输入应用名称' }]}
          >
            <Input placeholder="如：我的应用" />
          </Form.Item>
          <Form.Item
            name="appId"
            label="应用 ID"
            rules={[{ required: true, message: '请输入应用 ID' }]}
          >
            <Input placeholder="如：com.example.app" />
          </Form.Item>
          <Form.Item
            name="platform"
            label="平台"
            rules={[{ required: true, message: '请选择平台' }]}
          >
            <Select placeholder="选择平台">
              <Option value="ios">
                <Space><AppleOutlined /> iOS App Store</Space>
              </Option>
              <Option value="android">
                <Space><AndroidOutlined /> Google Play</Space>
              </Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ASO;