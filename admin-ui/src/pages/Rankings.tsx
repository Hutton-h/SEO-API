import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card, Table, Button, Tag, Typography, Row, Col, Space,
  Input, Select, Popconfirm, message, Tabs, Drawer, Segmented, Radio,
} from 'antd';
import {
  ReloadOutlined, SearchOutlined, RiseOutlined, FallOutlined,
  TrophyOutlined, ThunderboltOutlined, ArrowUpOutlined, ArrowDownOutlined,
  MinusOutlined, AimOutlined, HistoryOutlined, LineChartOutlined,
  PieChartOutlined, GlobalOutlined, EyeOutlined, DesktopOutlined,
  MobileOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { TrendChart, DistributionChart, ComparisonChart } from '@/components/charts';
import { useStore } from '@/store';
import { rankingAPI } from '@/services/rankings';

const { Text } = Typography;

// ============================================================================
// CTR by position (approximate)
// ============================================================================
const CTR_BY_POSITION: Record<number, number> = {
  1: 0.32, 2: 0.18, 3: 0.12, 4: 0.08, 5: 0.06,
  6: 0.04, 7: 0.03, 8: 0.02, 9: 0.02, 10: 0.01,
};

// ============================================================================
// Component
// ============================================================================

const Rankings: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const projectName = useStore((s) => s.currentProject?.name || '');
  const selectedEngine = useStore((s) => s.selectedSearchEngine);

  // ---- State ----
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Device toggle
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop');

  // Rankings data
  const [rankings, setRankings] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Summary
  const [summary, setSummary] = useState<any>({
    totalKeywords: 0, top3: 0, top10: 0, top50: 0,
    improved: 0, declined: 0, unchanged: 0,
  });

  // Filters
  const [keywordFilter, setKeywordFilter] = useState('');
  const [sortBy, setSortBy] = useState<string>('position');
  const [sortOrder, setSortOrder] = useState<string>('asc');
  const [engineFilter, setEngineFilter] = useState<string>('');

  // History drawer
  const [historyDrawer, setHistoryDrawer] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Distribution
  const [distribution, setDistribution] = useState<any[]>([]);
  const [rankingDistribution, setRankingDistribution] = useState<any[]>([]);

  // Visibility
  const [visibilityScore, setVisibilityScore] = useState(0);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- KPI calculation ----
  const avgPosition = rankings.length > 0
    ? (rankings.reduce((s, r) => s + (r.position || 0), 0) / rankings.length).toFixed(1)
    : '0';
  const top10Count = summary?.top10 || 0;
  const top3Count = summary?.top3 || 0;
  const visibilityPercent = summary?.totalKeywords > 0
    ? Math.round(((summary?.top50 || 0) / summary.totalKeywords) * 100)
    : 0;

  // ---- Calculate visibility score ----
  const calculateVisibility = useCallback((rankingsList: any[]) => {
    const totalCTR = rankingsList.reduce((sum, r) => {
      const pos = r.position || 0;
      const ctr = CTR_BY_POSITION[pos] || 0;
      const sv = r.searchVolume || 0;
      return sum + ctr * sv;
    }, 0);
    setVisibilityScore(Math.round(totalCTR));
  }, []);

  // ---- Data loading ----
  const loadRankings = useCallback(async (p?: number, ps?: number, kw?: string, sb?: string, so?: string, eng?: string) => {
    if (!projectId) return;
    try {
      const res: any = await rankingAPI.getRankings(projectId, {
        page: p ?? page,
        pageSize: ps ?? pageSize,
        searchEngine: eng || engineFilter || undefined,
      });
      const list = Array.isArray(res) ? res : (res?.data || res?.rankings || []);
      const t = res?.total || res?.pagination?.total || 0;
      setRankings(list);
      setTotal(t);
      calculateVisibility(list);
    } catch {
      // graceful degradation
    }
  }, [projectId, page, pageSize, engineFilter, calculateVisibility]);

  const loadSummary = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await rankingAPI.getRankingSummary(projectId);
      const data = res?.data !== undefined ? res.data : res;
      if (data && Object.keys(data).length > 0) setSummary(data);
    } catch {
      // graceful
    }
  }, [projectId]);

  const loadDistribution = useCallback(async () => {
    if (!projectId) return;
    try {
      const posData = rankings.length > 0 ? rankings : [];
      const dist = [
        { name: '1-3位', value: posData.filter((r: any) => r.position <= 3).length, color: '#52c41a' },
        { name: '4-10位', value: posData.filter((r: any) => r.position > 3 && r.position <= 10).length, color: '#1677ff' },
        { name: '11-20位', value: posData.filter((r: any) => r.position > 10 && r.position <= 20).length, color: '#faad14' },
        { name: '21-50位', value: posData.filter((r: any) => r.position > 20 && r.position <= 50).length, color: '#fa8c16' },
        { name: '50+', value: posData.filter((r: any) => r.position > 50).length, color: '#ff4d4f' },
      ].filter((d) => d.value > 0);
      setDistribution(dist);

      // Ranking distribution for the new card
      const rankingDist = [
        { name: '1-3位', value: posData.filter((r: any) => r.position <= 3).length, color: '#52c41a' },
        { name: '4-10位', value: posData.filter((r: any) => r.position > 3 && r.position <= 10).length, color: '#1677ff' },
        { name: '11-20位', value: posData.filter((r: any) => r.position > 10 && r.position <= 20).length, color: '#faad14' },
        { name: '21-50位', value: posData.filter((r: any) => r.position > 20 && r.position <= 50).length, color: '#fa8c16' },
        { name: '51-100位', value: posData.filter((r: any) => r.position > 50 && r.position <= 100).length, color: '#ff4d4f' },
      ];
      setRankingDistribution(rankingDist);
    } catch {
      setDistribution([]);
      setRankingDistribution([]);
    }
  }, [rankings]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadRankings(), loadSummary()]);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [loadRankings, loadSummary]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadAll();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [projectId]);

  useEffect(() => {
    if (rankings.length > 0) loadDistribution();
  }, [rankings]);

  // ---- Actions ----
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await rankingAPI.refreshRankings(projectId!);
      message.success('排名刷新任务已启动，请稍后刷新页面查看结果');
      let count = 0;
      pollingRef.current = setInterval(async () => {
        count++;
        await loadAll();
        if (count >= 10) {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setRefreshing(false);
          message.success('排名数据已更新');
        }
      }, 3000);
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || '刷新失败');
      setRefreshing(false);
    }
  };

  const handleViewHistory = async (record: any) => {
    setSelectedKeyword(record);
    setHistoryDrawer(true);
    setHistoryLoading(true);
    try {
      const res: any = await rankingAPI.getRankingHistory(projectId!, record.keywordId || record.id);
      const data = Array.isArray(res) ? res : (res?.data || res?.history || []);
      setHistoryData(data);
    } catch {
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ---- Render helpers ----
  const renderChange = (change: number) => {
    if (change > 0) return <Tag color="green" icon={<ArrowUpOutlined />}>+{change}</Tag>;
    if (change < 0) return <Tag color="red" icon={<ArrowDownOutlined />}>{change}</Tag>;
    return <Tag icon={<MinusOutlined />}>0</Tag>;
  };

  // ---- Trend chart data ----
  const trendChartData = historyData.map((h: any) => ({
    date: h.date || h.checkedAt || '',
    value: h.position || 0,
  }));

  // ---- Columns ----
  const columns = [
    {
      title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 200, fixed: 'left' as const,
      render: (kw: string) => <Text strong>{kw}</Text>,
    },
    {
      title: '当前位置', dataIndex: 'position', key: 'position', width: 100,
      render: (pos: number) => {
        const color = pos <= 3 ? '#52c41a' : pos <= 10 ? '#1677ff' : pos <= 50 ? '#faad14' : '#ff4d4f';
        return <Tag color={color} style={{ fontWeight: 'bold' }}>{pos}</Tag>;
      },
    },
    {
      title: '上次排名', dataIndex: 'previousPosition', key: 'previousPosition', width: 100,
      render: (val: number) => val ? <Text type="secondary">#{val}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: '变化', dataIndex: 'change', key: 'change', width: 80,
      render: (change: number) => renderChange(change),
    },
    {
      title: '搜索引擎', dataIndex: 'searchEngine', key: 'searchEngine', width: 100,
      render: (se: string) => <Tag>{se || 'Google'}</Tag>,
    },
    {
      title: '检查时间', dataIndex: 'checkedAt', key: 'checkedAt', width: 150,
      render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: 'URL', dataIndex: 'url', key: 'url', width: 200, ellipsis: true,
      render: (url: string) => url ? <Text code style={{ fontSize: 11 }}>{url}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: '操作', key: 'action', width: 100, fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Button type="link" size="small" icon={<HistoryOutlined />} onClick={() => handleViewHistory(record)}>
          历史
        </Button>
      ),
    },
  ];

  // ---- State: no project ----
  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="排名追踪" subtitle="请先选择项目" showCountrySelector showDateRange showSearchEngine />
        <EmptyState scene="data" title="请先选择项目" description="请从顶部导航栏选择一个项目以开始排名追踪" />
      </div>
    );
  }

  // ---- State: loading ----
  if (loading && rankings.length === 0) {
    return (
      <div className="page-container">
        <PageHeader title="排名追踪" subtitle={`${projectName} - 搜索引擎排名追踪`} showCountrySelector showDateRange showSearchEngine />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ---- State: error ----
  if (error && rankings.length === 0) {
    return (
      <div className="page-container">
        <PageHeader title="排名追踪" subtitle={`${projectName} - 搜索引擎排名追踪`} showCountrySelector showDateRange showSearchEngine />
        <ErrorState message={error} onRetry={() => loadAll()} />
      </div>
    );
  }

  // ---- Render ----
  return (
    <div className="page-container">
      <PageHeader
        title="排名追踪"
        subtitle={`${projectName} - 追踪 ${total} 个关键词 · 搜索引擎: ${selectedEngine?.name || 'Google'}`}
        showCountrySelector
        showDateRange
        showSearchEngine
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadAll} loading={loading}>刷新</Button>
            <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleRefresh} loading={refreshing}>
              获取排名
            </Button>
          </Space>
        }
      />

      {/* ============================================= */}
      {/* NEW: Device Toggle */}
      {/* ============================================= */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Text strong style={{ marginRight: 12 }}>设备类型：</Text>
            <Radio.Group
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="desktop"><DesktopOutlined /> 桌面端</Radio.Button>
              <Radio.Button value="mobile"><MobileOutlined /> 移动端</Radio.Button>
            </Radio.Group>
          </Col>
        </Row>
      </Card>

      {/* ============================================= */}
      {/* NEW: 搜索可见度 + 排名分布 */}
      {/* ============================================= */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card
            title={<><EyeOutlined /> 搜索可见度</>}
            style={{ borderRadius: 8 }}
          >
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Text type="secondary" style={{ fontSize: 14 }}>可见度指数</Text>
              <div style={{ fontSize: 42, fontWeight: 'bold', color: '#722ed1', margin: '8px 0' }}>
                {visibilityScore.toLocaleString()}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                sum(CTR by position x search volume)
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card
            title={<><PieChartOutlined /> 排名分布</>}
            style={{ borderRadius: 8 }}
          >
            {rankingDistribution.length > 0 ? (
              <ComparisonChart
                data={rankingDistribution}
                height={220}
                title=""
                showLabel
              />
            ) : (
              <EmptyState scene="data" title="暂无分布数据" />
            )}
          </Card>
        </Col>
      </Row>

      {/* KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard title="平均排名" value={avgPosition} icon={<AimOutlined />} color="#1677ff" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="TOP 10 关键词" value={top10Count} icon={<RiseOutlined />} color="#52c41a" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="TOP 3 关键词" value={top3Count} icon={<TrophyOutlined />} color="#faad14" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="可见度" value={`${visibilityPercent}%`} icon={<EyeOutlined />} color="#722ed1" suffix="" />
        </Col>
      </Row>

      {/* Charts row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={14}>
          <Card title={<><LineChartOutlined /> 排名趋势</>} loading={historyLoading}>
            {historyData.length > 0 ? (
              <TrendChart
                data={trendChartData}
                title={selectedKeyword?.keyword || ''}
                height={350}
                smooth
                showArea
              />
            ) : (
              <EmptyState scene="data" title="暂无趋势数据" description="点击关键词列表中的「历史」按钮查看排名趋势" />
            )}
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card title={<><PieChartOutlined /> 排名分布</>}>
            {distribution.length > 0 ? (
              <DistributionChart
                data={distribution}
                type="donut"
                height={350}
                centerLabel={{ label: '总计', value: String(total) }}
              />
            ) : (
              <EmptyState scene="data" title="暂无分布数据" description="获取排名数据后将显示分布情况" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Rankings table */}
      <Card
        title="排名详情"
        extra={
          <Space>
            <Input.Search
              placeholder="搜索关键词..."
              value={keywordFilter}
              onChange={(e) => setKeywordFilter(e.target.value)}
              onSearch={() => { setPage(1); loadRankings(1, pageSize, keywordFilter, sortBy, sortOrder, engineFilter); }}
              style={{ width: 220 }}
              allowClear
            />
            <Select
              value={sortBy}
              style={{ width: 100 }}
              onChange={(v) => { setSortBy(v); loadRankings(page, pageSize, keywordFilter, v, sortOrder, engineFilter); }}
              options={[
                { value: 'position', label: '按排名' },
                { value: 'check_date', label: '按时间' },
              ]}
            />
            <Select
              value={sortOrder}
              style={{ width: 80 }}
              onChange={(v) => { setSortOrder(v); loadRankings(page, pageSize, keywordFilter, sortBy, v, engineFilter); }}
              options={[
                { value: 'asc', label: '升序' },
                { value: 'desc', label: '降序' },
              ]}
            />
          </Space>
        }
      >
        {rankings.length === 0 ? (
          <EmptyState
            scene="data"
            title="暂无排名数据"
            description="点击「获取排名」按钮开始追踪关键词排名"
            action={{ text: '获取排名', icon: <ThunderboltOutlined />, onClick: handleRefresh, loading: refreshing }}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={rankings}
            rowKey="id"
            pagination={{
              current: page, pageSize, total, showSizeChanger: true,
              showTotal: (t) => `共 ${t} 条记录`,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); loadRankings(p, ps, keywordFilter, sortBy, sortOrder, engineFilter); },
            }}
            size="middle"
            scroll={{ x: 1100 }}
          />
        )}
      </Card>

      {/* History Drawer */}
      <Drawer
        title={`排名历史 - ${selectedKeyword?.keyword || ''}`}
        placement="right"
        width={600}
        open={historyDrawer}
        onClose={() => setHistoryDrawer(false)}
        loading={historyLoading}
      >
        {historyData.length > 0 ? (
          <>
            <TrendChart data={trendChartData} title="排名变化趋势" height={300} smooth />
            <Table
              dataSource={historyData}
              rowKey={(r: any, i?: number) => `${r.date}-${i}`}
              columns={[
                { title: '日期', dataIndex: 'date', key: 'date', render: (d: string) => d || '-' },
                {
                  title: '排名', dataIndex: 'position', key: 'position',
                  render: (pos: number) => {
                    const color = pos <= 3 ? '#52c41a' : pos <= 10 ? '#1677ff' : '#ff4d4f';
                    return <Tag color={color}>{pos}</Tag>;
                  },
                },
                { title: '变化', dataIndex: 'change', key: 'change', render: (c: number) => renderChange(c) },
              ]}
              size="small"
              pagination={{ pageSize: 15 }}
            />
          </>
        ) : (
          <EmptyState scene="data" title="暂无历史数据" />
        )}
      </Drawer>
    </div>
  );
};

export default Rankings;