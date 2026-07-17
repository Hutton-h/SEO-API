import React, { useState } from 'react';
import {
  Card, Table, Tag, Typography, Row, Col, Statistic, Button, Space, Progress,
} from 'antd';
import {
  YoutubeOutlined, ReloadOutlined, ArrowUpOutlined, ArrowDownOutlined,
  MinusOutlined, EyeOutlined, LikeOutlined, CommentOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';

echarts.use([BarChart, GridComponent, TooltipComponent, TitleComponent, CanvasRenderer]);

const { Text } = Typography;

const mockYouTubeKeywords = [
  { id: '1', keyword: 'SEO教程', position: 2, previousPosition: 3, change: 1, views: 125000, avgViews: 25000, competition: 'high' },
  { id: '2', keyword: '网站优化', position: 5, previousPosition: 4, change: -1, views: 89000, avgViews: 18000, competition: 'medium' },
  { id: '3', keyword: 'SEO入门', position: 1, previousPosition: 1, change: 0, views: 210000, avgViews: 42000, competition: 'high' },
  { id: '4', keyword: '关键词研究', position: 3, previousPosition: 6, change: 3, views: 67000, avgViews: 13500, competition: 'medium' },
  { id: '5', keyword: 'SEO工具推荐', position: 7, previousPosition: 5, change: -2, views: 45000, avgViews: 9000, competition: 'low' },
  { id: '6', keyword: 'Google排名', position: 4, previousPosition: 7, change: 3, views: 78000, avgViews: 15600, competition: 'medium' },
  { id: '7', keyword: 'SEO审计', position: 8, previousPosition: 9, change: 1, views: 32000, avgViews: 6400, competition: 'low' },
  { id: '8', keyword: '外链建设', position: 6, previousPosition: 8, change: 2, views: 55000, avgViews: 11000, competition: 'medium' },
];

const mockVideoStats = [
  { title: 'SEO完全指南2024', views: 125000, likes: 8500, comments: 1200, watchTime: 45000, position: 2 },
  { title: '网站排名提升10个技巧', views: 89000, likes: 6200, comments: 890, watchTime: 32000, position: 5 },
  { title: 'SEO入门教程', views: 210000, likes: 15000, comments: 2100, watchTime: 78000, position: 1 },
  { title: '关键词研究完整方法', views: 67000, likes: 4500, comments: 650, watchTime: 24000, position: 3 },
];

const YouTube: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  const viewsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      data: mockVideoStats.map((v) => v.title.length > 10 ? v.title.slice(0, 10) + '...' : v.title),
      axisLabel: { color: '#999', rotate: 15 },
    },
    yAxis: { type: 'value', name: '观看量', axisLabel: { color: '#999', formatter: (v: number) => (v / 1000).toFixed(0) + 'k' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [
      {
        type: 'bar', data: mockVideoStats.map((v) => v.views),
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#ff0000' }, { offset: 1, color: '#ff4444' }] }, borderRadius: [6, 6, 0, 0] },
        barWidth: '50%',
      },
    ],
  };

  const keywordColumns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', render: (t: string) => <Text strong>{t}</Text> },
    {
      title: '排名', dataIndex: 'position', key: 'position', width: 80,
      render: (p: number) => <Tag color={p <= 3 ? '#52c41a' : '#1677ff'}>#{p}</Tag>,
    },
    {
      title: '变化', key: 'change', width: 80,
      render: (_: any, r: any) => {
        if (r.change > 0) return <Tag color="success" icon={<ArrowUpOutlined />}>+{r.change}</Tag>;
        if (r.change < 0) return <Tag color="error" icon={<ArrowDownOutlined />}>{r.change}</Tag>;
        return <Tag icon={<MinusOutlined />}>0</Tag>;
      },
    },
    { title: '总观看', dataIndex: 'views', key: 'views', width: 100, render: (v: number) => (v / 1000).toFixed(1) + 'k' },
    { title: '平均观看', dataIndex: 'avgViews', key: 'avgViews', width: 100, render: (v: number) => (v / 1000).toFixed(1) + 'k' },
    {
      title: '竞争度', dataIndex: 'competition', key: 'competition', width: 90,
      render: (c: string) => {
        const colors: Record<string, string> = { high: '#ff4d4f', medium: '#faad14', low: '#52c41a' };
        const labels: Record<string, string> = { high: '高', medium: '中', low: '低' };
        return <Tag color={colors[c]}>{labels[c]}</Tag>;
      },
    },
  ];

  const videoColumns = [
    { title: '视频标题', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: '排名', dataIndex: 'position', key: 'position', width: 70, render: (p: number) => <Tag color={p <= 3 ? '#52c41a' : '#1677ff'}>#{p}</Tag> },
    { title: '观看量', dataIndex: 'views', key: 'views', width: 100, render: (v: number) => (v / 1000).toFixed(1) + 'k' },
    { title: '点赞', dataIndex: 'likes', key: 'likes', width: 90, render: (v: number) => v.toLocaleString() },
    { title: '评论', dataIndex: 'comments', key: 'comments', width: 80, render: (v: number) => v.toLocaleString() },
    { title: '观看时长(h)', dataIndex: 'watchTime', key: 'watchTime', width: 110, render: (v: number) => (v / 60).toFixed(0) },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="YouTube 排名"
        subtitle="YouTube 视频 SEO 排名追踪"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="追踪关键词" value={mockYouTubeKeywords.length} prefix={<YoutubeOutlined style={{ color: '#ff0000' }} />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="总观看量" value="701k" prefix={<EyeOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="总点赞" value="34.2k" prefix={<LikeOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="总评论" value="4.84k" prefix={<CommentOutlined />} /></Card>
        </Col>
      </Row>

      <Card title="视频观看量" className="chart-card" style={{ marginBottom: 24 }}>
        <ReactEChartsCore echarts={echarts} option={viewsOption} style={{ height: 300 }} notMerge />
      </Card>

      <Card title="视频排名" style={{ marginBottom: 24 }}>
        <Table columns={videoColumns} dataSource={mockVideoStats} rowKey="title" pagination={false} size="middle" loading={loading} />
      </Card>

      <Card title="关键词排名">
        <Table columns={keywordColumns} dataSource={mockYouTubeKeywords} rowKey="id" pagination={false} size="middle" loading={loading} />
      </Card>
    </div>
  );
};

export default YouTube;