import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card, Table, Button, Tag, Typography, Row, Col, Statistic, Space, message, Spin, Empty, Alert,
  Input, Form, Select, InputNumber, Progress, Tabs, Tooltip, Drawer, Badge, DatePicker,
} from 'antd';
import {
  ReloadOutlined, SearchOutlined, RiseOutlined, FallOutlined, MinusOutlined,
  TrophyOutlined, GlobalOutlined, AimOutlined, ThunderboltOutlined,
  ArrowUpOutlined, ArrowDownOutlined, LineChartOutlined, FilterOutlined,
  PlusOutlined, DeleteOutlined, HistoryOutlined, MobileOutlined, DesktopOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent, DataZoomComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { rankingAPI } from '@/services/rankings';

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, DataZoomComponent, CanvasRenderer]);

const { Text } = Typography;

const Rankings: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 排名数据
  const [rankings, setRankings] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalKeywords: 0, top3: 0, top10: 0, top50: 0, improved: 0, declined: 0, unchanged: 0,
  });
  const [rankingTotal, setRankingTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 筛选
  const [keywordFilter, setKeywordFilter] = useState('');
  const [sortBy, setSortBy] = useState<string>('position');
  const [sortOrder, setSortOrder] = useState<string>('asc');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // 关键词输入
  const [newKeyword, setNewKeyword] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [locationCode, setLocationCode] = useState(2152); // 美国
  const [includeGSC, setIncludeGSC] = useState(true);

  // 历史
  const [historyDrawer, setHistoryDrawer] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRankings = useCallback(async (p?: number, ps?: number, kw?: string, sb?: string, so?: string, src?: string) => {
    if (!projectId) return;
    try {
      const res = await rankingAPI.getRankings(projectId, {
        page: p || page,
        pageSize: ps || pageSize,
        ...(kw ? { keyword: kw } : {}),
        ...(sb ? { sortBy: sb } : {}),
        ...(so ? { sortOrder: so } : {}),
        ...(src && src !== 'all' ? { source: src } : {}),
      });
      const data = (res as any).data !== undefined ? (res as any).data : res;
      setRankings(Array.isArray(data) ? data : (data?.data || data?.rankings || []));
      setRankingTotal(data?.total || data?.pagination?.total || 0);
    } catch (err: any) {
      // silent
    }
  }, [projectId, page, pageSize]);

  const loadSummary = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await rankingAPI.getRankingSummary(projectId);
      const data = (res as any).data !== undefined ? (res as any).data : res;
      setSummary(data || {});
    } catch {
      // silent
    }
  }, [projectId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadRankings(), loadSummary()]);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [loadRankings, loadSummary]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadAll();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [projectId]);

  // 刷新排名
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await rankingAPI.refreshRankings(projectId!, {
        keywords: newKeywords ? newKeywords.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined,
        locationCode,
        includeGSC,
      });
      message.success('排名刷新任务已启动，请稍后刷新页面查看结果');
      // 轮询等待
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
      const msg = err?.response?.data?.error?.message || err?.message || '刷新失败';
      message.error(msg);
      setRefreshing(false);
    }
  };

  // 添加关键词
  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) { message.warning('请输入关键词'); return; }
    try {
      await rankingAPI.refreshRankings(projectId!, {
        keywords: [newKeyword.trim()],
        locationCode,
        includeGSC,
      });
      message.success(`关键词 "${newKeyword.trim()}" 已添加，正在获取排名`);
      setNewKeyword('');
      setTimeout(() => loadAll(), 2000);
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || '添加失败');
    }
  };

  // 查看历史
  const handleViewHistory = async (record: any) => {
    setSelectedKeyword(record);
    setHistoryDrawer(true);
    setHistoryLoading(true);
    try {
      const res = await rankingAPI.getRankingHistory(projectId!, record.keywordId || record.id);
      const data = (res as any).data !== undefined ? (res as any).data : res;
      setHistoryData(Array.isArray(data) ? data : (data?.data || data?.history || []));
    } catch {
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ====== 空/加载/错误 ======
  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="排名追踪" subtitle="关键词搜索引擎排名追踪与分析" />
        <Empty description="请先选择一个项目" style={{ marginTop: 120 }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="排名追踪" subtitle="关键词搜索引擎排名追踪与分析" />
        <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <PageHeader title="排名追踪" subtitle="关键词搜索引擎排名追踪与分析" />
        <Alert type="error" message="加载失败" description={error} showIcon style={{ marginTop: 24 }}
          action={<Button size="small" onClick={loadAll}>重试</Button>} />
      </div>
    );
  }

  // 排名变化箭头
  const renderChange = (change: number) => {
    if (change > 0) return <Tag color="green" icon={<ArrowUpOutlined />}>+{change}</Tag>;
    if (change < 0) return <Tag color="red" icon={<ArrowDownOutlined />}>{change}</Tag>;
    return <Tag icon={<MinusOutlined />}>0</Tag>;
  };

  // 排名趋势图
  const trendChartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: rankings.slice(0, 5).map((r: any) => r.keyword), top: 0 },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: historyData.map((h: any) => h.date || h.checkedAt) },
    yAxis: { type: 'value', inverse: true, name: '排名', min: 1 },
    series: rankings.slice(0, 5).map((r: any, i: number) => ({
      name: r.keyword,
      type: 'line',
      data: historyData.map((h: any) => h.position),
      smooth: true,
    })),
  };

  const columns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 200, fixed: 'left' as const,
      render: (kw: string) => <Text strong>{kw}</Text>,
    },
    { title: '当前位置', dataIndex: 'position', key: 'position', width: 100,
      render: (pos: number) => {
        const color = pos <= 3 ? '#52c41a' : pos <= 10 ? '#1677ff' : pos <= 50 ? '#faad14' : '#ff4d4f';
        return <Tag color={color} style={{ fontWeight: 'bold' }}>{pos}</Tag>;
      },
    },
    { title: '变化', dataIndex: 'change', key: 'change', width: 80,
      render: (change: number) => renderChange(change),
    },
    { title: 'URL', dataIndex: 'url', key: 'url', width: 200, ellipsis: true,
      render: (url: string) => url ? <Text code style={{ fontSize: 11 }}>{url}</Text> : <Text type="secondary">-</Text>,
    },
    { title: '搜索引擎', dataIndex: 'searchEngine', key: 'searchEngine', width: 90,
      render: (se: string) => <Tag>{se || 'Google'}</Tag>,
    },
    { title: '设备', dataIndex: 'device', key: 'device', width: 80,
      render: (d: string) => d === 'mobile' ? <><MobileOutlined /> 移动</> : <><DesktopOutlined /> 桌面</>,
    },
    { title: '地区', dataIndex: 'location', key: 'location', width: 100 },
    { title: '检查时间', dataIndex: 'checkedAt', key: 'checkedAt', width: 150,
      render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    { title: '操作', key: 'action', width: 100, fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Button type="link" size="small" icon={<HistoryOutlined />} onClick={() => handleViewHistory(record)}>
          历史
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader title="排名追踪" subtitle="关键词搜索引擎排名追踪与实时刷新"
        actions={[
          { label: '刷新数据', icon: <ReloadOutlined />, onClick: loadAll, loading },
          { label: '获取排名', type: 'primary', icon: <ThunderboltOutlined />, onClick: handleRefresh, loading: refreshing },
        ]}
      />

      {/* 操作面板 */}
      <Card title={<><AimOutlined /> 排名操作</>} style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Form.Item label="添加关键词" style={{ marginBottom: 0 }}>
              <Input.Search
                placeholder="输入关键词，回车添加"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onSearch={handleAddKeyword}
                enterButton={<PlusOutlined />}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="批量关键词（逗号分隔）" style={{ marginBottom: 0 }}>
              <Input
                placeholder="关键词1, 关键词2, 关键词3..."
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
              />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label="地区代码" style={{ marginBottom: 0 }}>
              <InputNumber value={locationCode} onChange={(v) => setLocationCode(v || 2152)} style={{ width: '100%' }}
                placeholder="2152=美国" />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space><span>包含 GSC 数据</span><Badge status={includeGSC ? 'success' : 'default'} text={includeGSC ? '开' : '关'} /></Space>
              <Button size="small" onClick={() => setIncludeGSC(!includeGSC)}>{includeGSC ? '关闭' : '开启'}</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 统计概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="追踪关键词" value={summary?.totalKeywords || 0} prefix={<AimOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="TOP 3" value={summary?.top3 || 0} valueStyle={{ color: '#52c41a' }} prefix={<TrophyOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="TOP 10" value={summary?.top10 || 0} valueStyle={{ color: '#1677ff' }} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="上升" value={summary?.improved || 0} valueStyle={{ color: '#52c41a' }}
            prefix={<RiseOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="下降" value={summary?.declined || 0} valueStyle={{ color: '#ff4d4f' }}
            prefix={<FallOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="不变" value={summary?.unchanged || 0} prefix={<MinusOutlined />} /></Card>
        </Col>
      </Row>

      {/* 排名表格 */}
      <Card title="排名详情"
        extra={
          <Space>
            <Input
              placeholder="搜索关键词..."
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 180 }}
              value={keywordFilter}
              onChange={(e) => { setKeywordFilter(e.target.value); loadRankings(1, pageSize, e.target.value, sortBy, sortOrder, sourceFilter); }}
            />
            <Select value={sortBy} style={{ width: 100 }}
              onChange={(v) => { setSortBy(v); loadRankings(page, pageSize, keywordFilter, v, sortOrder, sourceFilter); }}
              options={[
                { value: 'position', label: '按排名' },
                { value: 'check_date', label: '按时间' },
              ]}
            />
            <Select value={sortOrder} style={{ width: 80 }}
              onChange={(v) => { setSortOrder(v); loadRankings(page, pageSize, keywordFilter, sortBy, v, sourceFilter); }}
              options={[
                { value: 'asc', label: '升序' },
                { value: 'desc', label: '降序' },
              ]}
            />
            <Select value={sourceFilter} style={{ width: 120 }}
              onChange={(v) => { setSourceFilter(v); loadRankings(page, pageSize, keywordFilter, sortBy, sortOrder, v); }}
              options={[
                { value: 'all', label: '全部来源' },
                { value: 'dataforseo', label: 'DataForSEO' },
                { value: 'gsc', label: 'GSC' },
              ]}
            />
          </Space>
        }
      >
        <Table columns={columns} dataSource={rankings} rowKey="id"
          pagination={{ current: page, pageSize, total: rankingTotal, showSizeChanger: true,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); loadRankings(p, ps, keywordFilter, sortBy, sortOrder, sourceFilter); },
          }}
          scroll={{ x: 1100 }} size="middle"
        />
      </Card>

      {/* 排名历史 Drawer */}
      <Drawer title={`排名历史 - ${selectedKeyword?.keyword || ''}`} placement="right" width={600}
        open={historyDrawer} onClose={() => setHistoryDrawer(false)} loading={historyLoading}>
        {historyData.length > 0 ? (
          <>
            <ReactEChartsCore echarts={echarts} option={trendChartOption} style={{ height: 350, marginBottom: 24 }} />
            <Table
              dataSource={historyData}
              rowKey={(r: any, i?: number) => `${r.date}-${i}`}
              columns={[
                { title: '日期', dataIndex: 'date', key: 'date', render: (d: string) => d || '-' },
                { title: '排名', dataIndex: 'position', key: 'position',
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
          <Empty description="暂无历史数据" />
        )}
      </Drawer>
    </div>
  );
};

export default Rankings;