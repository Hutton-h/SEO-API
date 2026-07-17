import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Tag, Space, Typography, Select, Row, Col, Statistic, message, Spin, Empty, Alert,
} from 'antd';
import {
  ReloadOutlined, ArrowUpOutlined, ArrowDownOutlined, MinusOutlined,
  TrophyOutlined, RiseOutlined, FallOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { rankingAPI } from '@/services/ranking';

echarts.use([LineChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text } = Typography;

const Rankings: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [rankings, setRankings] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ top3: 0, top10: 0, improved: 0, declined: 0 });
  const [rankingHistory, setRankingHistory] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        rankingAPI.getRankings(projectId!),
        rankingAPI.getRankingSummary(projectId!),
      ]);

      const extractArr = (result: PromiseSettledResult<any>): any[] => {
        if (result.status === 'fulfilled') {
          const res = result.value;
          const d = (res as any).data !== undefined ? (res as any).data : res;
          return Array.isArray(d) ? d : (d?.data || d?.rankings || []);
        }
        return [];
      };

      const extractObj = (result: PromiseSettledResult<any>): any => {
        if (result.status === 'fulfilled') {
          const res = result.value;
          return (res as any).data !== undefined ? (res as any).data : res;
        }
        return {};
      };

      const rankingList = extractArr(results[0]);
      const summaryData = extractObj(results[1]);

      setRankings(rankingList);

      setSummary({
        top3: summaryData?.top3 ?? rankingList.filter((r: any) => (r.position || r.currentRank) <= 3).length,
        top10: summaryData?.top10 ?? rankingList.filter((r: any) => (r.position || r.currentRank) <= 10).length,
        improved: summaryData?.improved ?? rankingList.filter((r: any) => (r.change ?? 0) > 0).length,
        declined: summaryData?.declined ?? rankingList.filter((r: any) => (r.change ?? 0) < 0).length,
      });

      // Derive ranking history from the data or use provided history
      const history = summaryData?.history ?? summaryData?.rankingHistory ?? rankingList.slice(0, 8).map((r: any) => ({
        date: r.date || r.lastChecked || '',
        keyword: r.keyword || '',
        position: r.position || r.currentRank || 0,
      }));
      setRankingHistory(Array.isArray(history) ? history : []);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    loadData();
  }, [projectId]);

  const handleRefresh = () => {
    loadData();
  };

  const handleRefreshRankings = async () => {
    setRefreshing(true);
    try {
      await rankingAPI.refreshRankings(projectId!);
      message.success('排名数据已刷新');
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '刷新排名失败';
      message.error(msg);
    } finally {
      setRefreshing(false);
    }
  };

  // ---- 空状态 / 加载状态 / 错误状态 ----
  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="排名追踪" subtitle="关键词排名变化监控" />
        <Empty description="请先选择一个项目" style={{ marginTop: 120 }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="排名追踪" subtitle="关键词排名变化监控" />
        <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <PageHeader title="排名追踪" subtitle="关键词排名变化监控" />
        <Alert
          type="error"
          message="加载失败"
          description={error}
          showIcon
          style={{ marginTop: 24 }}
          action={<Button size="small" onClick={handleRefresh}>重试</Button>}
        />
      </div>
    );
  }

  // Build chart data from rankingHistory
  const chartDates = rankingHistory.length > 0
    ? [...new Set(rankingHistory.map((d: any) => d.date || d.month || ''))]
    : [];
  const chartKeywords = rankingHistory.length > 0
    ? [...new Set(rankingHistory.map((d: any) => d.keyword || d.name || ''))]
    : [];

  const chartOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e8e8e8',
      textStyle: { color: '#333' },
    },
    legend: {
      data: chartKeywords.slice(0, 3),
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '12%',
      top: '8%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: chartDates,
      axisLabel: { color: '#999' },
    },
    yAxis: {
      type: 'value',
      name: '排名',
      inverse: true,
      min: 1,
      axisLabel: { color: '#999' },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    },
    series: chartKeywords.slice(0, 3).map((kw: string, idx: number) => {
      const colors = ['#1677ff', '#52c41a', '#fa8c16'];
      return {
        name: kw,
        type: 'line',
        data: chartDates.map((date: string) => {
          const entry = rankingHistory.find((d: any) => (d.date || d.month) === date && (d.keyword || d.name) === kw);
          return entry ? (entry.position || entry.rank || 0) : null;
        }),
        smooth: true,
        lineStyle: { width: 3, color: colors[idx] },
        itemStyle: { color: colors[idx] },
        symbol: 'circle',
        symbolSize: 6,
      };
    }),
  };

  const columns = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      key: 'keyword',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '当前位置',
      dataIndex: 'position',
      key: 'position',
      width: 100,
      sorter: (a: any, b: any) => (a.position || 0) - (b.position || 0),
      render: (pos: number) => {
        const p = pos ?? 0;
        const color = p <= 3 ? '#52c41a' : p <= 10 ? '#1677ff' : '#faad14';
        return (
          <Tag color={color} style={{ fontSize: 14, fontWeight: 600 }}>
            #{p}
          </Tag>
        );
      },
    },
    {
      title: '变化',
      key: 'change',
      width: 100,
      render: (_: any, record: any) => {
        const change = record.change ?? 0;
        if (change > 0) {
          return (
            <Tag color="success" icon={<ArrowUpOutlined />}>
              +{change}
            </Tag>
          );
        }
        if (change < 0) {
          return (
            <Tag color="error" icon={<ArrowDownOutlined />}>
              {change}
            </Tag>
          );
        }
        return (
          <Tag icon={<MinusOutlined />} color="default">
            0
          </Tag>
        );
      },
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
    },
    {
      title: '搜索引擎',
      dataIndex: 'searchEngine',
      key: 'searchEngine',
      width: 110,
      render: (val: string) => <Tag>{val || 'google'}</Tag>,
    },
    {
      title: '设备',
      dataIndex: 'device',
      key: 'device',
      width: 90,
      render: (val: string) => <Tag>{val === 'desktop' ? '桌面端' : val === 'mobile' ? '移动端' : val || '桌面端'}</Tag>,
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="排名追踪"
        subtitle="关键词排名变化监控"
        actions={[
          { label: '刷新排名', type: 'primary', icon: <ReloadOutlined />, onClick: handleRefreshRankings, loading: refreshing },
        ]}
      />

      {/* 排名统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="TOP 3"
              value={summary.top3}
              prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="TOP 10"
              value={summary.top10}
              prefix={<RiseOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="上升"
              value={summary.improved}
              prefix={<ArrowUpOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="下降"
              value={summary.declined}
              prefix={<ArrowDownOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 排名历史折线图 */}
      <Card title="排名历史趋势" className="chart-card" style={{ marginBottom: 24 }}>
        <ReactEChartsCore
          echarts={echarts}
          option={chartOption}
          style={{ height: 350 }}
          notMerge
        />
      </Card>

      {/* 排名表格 */}
      <Card
        title="排名详情"
        extra={
          <Space>
            <Select
              defaultValue="google"
              style={{ width: 120 }}
              options={[
                { value: 'google', label: 'Google' },
                { value: 'bing', label: 'Bing' },
                { value: 'baidu', label: '百度' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={rankings}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          size="middle"
          loading={loading}
        />
      </Card>
    </div>
  );
};

export default Rankings;