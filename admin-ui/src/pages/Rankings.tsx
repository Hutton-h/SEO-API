import React, { useState } from 'react';
import {
  Card, Table, Button, Tag, Space, Typography, Select, Row, Col, Statistic, message,
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

echarts.use([LineChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text } = Typography;

// 模拟排名历史
const mockRankingHistory = [
  { date: '01-07', 'SEO优化服务': 12, '网站排名提升': 15, '搜索引擎优化': 8 },
  { date: '01-14', 'SEO优化服务': 10, '网站排名提升': 14, '搜索引擎优化': 7 },
  { date: '01-21', 'SEO优化服务': 8, '网站排名提升': 13, '搜索引擎优化': 6 },
  { date: '01-28', 'SEO优化服务': 7, '网站排名提升': 12, '搜索引擎优化': 5 },
  { date: '02-04', 'SEO优化服务': 6, '网站排名提升': 10, '搜索引擎优化': 4 },
  { date: '02-11', 'SEO优化服务': 5, '网站排名提升': 9, '搜索引擎优化': 3 },
  { date: '02-18', 'SEO优化服务': 4, '网站排名提升': 8, '搜索引擎优化': 3 },
  { date: '02-25', 'SEO优化服务': 3, '网站排名提升': 7, '搜索引擎优化': 2 },
];

const mockRankings = [
  { id: '1', keyword: 'SEO优化服务', position: 3, previousPosition: 5, change: 2, url: '/services/seo', searchEngine: 'google', device: 'desktop' },
  { id: '2', keyword: '网站排名提升', position: 7, previousPosition: 4, change: -3, url: '/blog/ranking-tips', searchEngine: 'google', device: 'desktop' },
  { id: '3', keyword: '搜索引擎优化', position: 2, previousPosition: 3, change: 1, url: '/', searchEngine: 'google', device: 'desktop' },
  { id: '4', keyword: '内容营销策略', position: 5, previousPosition: 6, change: 1, url: '/blog/content-strategy', searchEngine: 'google', device: 'mobile' },
  { id: '5', keyword: 'SEO审计', position: 4, previousPosition: 4, change: 0, url: '/services/audit', searchEngine: 'google', device: 'desktop' },
  { id: '6', keyword: '外链建设', position: 8, previousPosition: 15, change: 7, url: '/services/backlinks', searchEngine: 'google', device: 'mobile' },
  { id: '7', keyword: '本地SEO', position: 15, previousPosition: 10, change: -5, url: '/services/local-seo', searchEngine: 'google', device: 'desktop' },
  { id: '8', keyword: '关键词研究工具', position: 12, previousPosition: 12, change: 0, url: '/tools/keyword', searchEngine: 'google', device: 'desktop' },
];

const Rankings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  const handleRefreshRankings = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      message.success('排名数据已刷新');
    }, 2000);
  };

  // 统计
  const top3 = mockRankings.filter((r) => r.position <= 3).length;
  const top10 = mockRankings.filter((r) => r.position <= 10).length;
  const improved = mockRankings.filter((r) => r.change > 0).length;
  const declined = mockRankings.filter((r) => r.change < 0).length;

  const chartOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e8e8e8',
      textStyle: { color: '#333' },
    },
    legend: {
      data: ['SEO优化服务', '网站排名提升', '搜索引擎优化'],
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
      data: mockRankingHistory.map((d) => d.date),
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
    series: [
      {
        name: 'SEO优化服务',
        type: 'line',
        data: mockRankingHistory.map((d) => d['SEO优化服务']),
        smooth: true,
        lineStyle: { width: 3, color: '#1677ff' },
        itemStyle: { color: '#1677ff' },
        symbol: 'circle',
        symbolSize: 6,
      },
      {
        name: '网站排名提升',
        type: 'line',
        data: mockRankingHistory.map((d) => d['网站排名提升']),
        smooth: true,
        lineStyle: { width: 3, color: '#52c41a' },
        itemStyle: { color: '#52c41a' },
        symbol: 'circle',
        symbolSize: 6,
      },
      {
        name: '搜索引擎优化',
        type: 'line',
        data: mockRankingHistory.map((d) => d['搜索引擎优化']),
        smooth: true,
        lineStyle: { width: 3, color: '#fa8c16' },
        itemStyle: { color: '#fa8c16' },
        symbol: 'circle',
        symbolSize: 6,
      },
    ],
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
      sorter: (a: any, b: any) => a.position - b.position,
      render: (pos: number) => {
        const color = pos <= 3 ? '#52c41a' : pos <= 10 ? '#1677ff' : '#faad14';
        return (
          <Tag color={color} style={{ fontSize: 14, fontWeight: 600 }}>
            #{pos}
          </Tag>
        );
      },
    },
    {
      title: '变化',
      key: 'change',
      width: 100,
      render: (_: any, record: any) => {
        if (record.change > 0) {
          return (
            <Tag color="success" icon={<ArrowUpOutlined />}>
              +{record.change}
            </Tag>
          );
        }
        if (record.change < 0) {
          return (
            <Tag color="error" icon={<ArrowDownOutlined />}>
              {record.change}
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
      render: (val: string) => <Tag>{val}</Tag>,
    },
    {
      title: '设备',
      dataIndex: 'device',
      key: 'device',
      width: 90,
      render: (val: string) => <Tag>{val === 'desktop' ? '桌面端' : '移动端'}</Tag>,
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
              value={top3}
              prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="TOP 10"
              value={top10}
              prefix={<RiseOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="上升"
              value={improved}
              prefix={<ArrowUpOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="下降"
              value={declined}
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
          dataSource={mockRankings}
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