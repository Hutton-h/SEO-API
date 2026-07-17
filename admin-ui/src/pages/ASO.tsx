import React, { useState } from 'react';
import {
  Card, Table, Tag, Typography, Row, Col, Statistic, Button, Space, Select, Progress,
} from 'antd';
import {
  AppleOutlined, AndroidOutlined, ReloadOutlined, ArrowUpOutlined,
  ArrowDownOutlined, MinusOutlined, StarOutlined, DownloadOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';

echarts.use([LineChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text } = Typography;

const mockASOKeywords = [
  { id: '1', keyword: 'SEO工具', appStore: { position: 3, change: 1 }, googlePlay: { position: 5, change: 2 }, searchVolume: 8500, difficulty: 'medium' },
  { id: '2', keyword: '网站优化', appStore: { position: 7, change: -1 }, googlePlay: { position: 4, change: 0 }, searchVolume: 6200, difficulty: 'low' },
  { id: '3', keyword: 'SEO排名', appStore: { position: 2, change: 1 }, googlePlay: { position: 3, change: 1 }, searchVolume: 9800, difficulty: 'high' },
  { id: '4', keyword: '关键词分析', appStore: { position: 5, change: 0 }, googlePlay: { position: 8, change: -2 }, searchVolume: 5400, difficulty: 'medium' },
  { id: '5', keyword: 'SEO审计', appStore: { position: 4, change: 2 }, googlePlay: { position: 6, change: 1 }, searchVolume: 4800, difficulty: 'low' },
  { id: '6', keyword: '网站分析', appStore: { position: 9, change: -3 }, googlePlay: { position: 12, change: 4 }, searchVolume: 7200, difficulty: 'medium' },
];

const mockTrend = [
  { date: '01-07', appStore: 8, googlePlay: 10 },
  { date: '01-14', appStore: 7, googlePlay: 9 },
  { date: '01-21', appStore: 6, googlePlay: 7 },
  { date: '01-28', appStore: 5, googlePlay: 6 },
  { date: '02-04', appStore: 4, googlePlay: 5 },
  { date: '02-11', appStore: 4, googlePlay: 4 },
  { date: '02-18', appStore: 3, googlePlay: 4 },
];

const ASO: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState('all');

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  const trendOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['App Store', 'Google Play'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: mockTrend.map((d) => d.date), axisLabel: { color: '#999' } },
    yAxis: { type: 'value', name: '排名', inverse: true, axisLabel: { color: '#999' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [
      {
        name: 'App Store', type: 'line', data: mockTrend.map((d) => d.appStore),
        smooth: true, lineStyle: { color: '#1677ff', width: 3 }, itemStyle: { color: '#1677ff' }, symbol: 'circle', symbolSize: 6,
      },
      {
        name: 'Google Play', type: 'line', data: mockTrend.map((d) => d.googlePlay),
        smooth: true, lineStyle: { color: '#52c41a', width: 3 }, itemStyle: { color: '#52c41a' }, symbol: 'circle', symbolSize: 6,
      },
    ],
  };

  const columns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', render: (t: string) => <Text strong>{t}</Text> },
    {
      title: 'App Store 排名', key: 'appStore', width: 140,
      render: (_: any, r: any) => (
        <Space>
          <Tag color={r.appStore.position <= 3 ? '#52c41a' : '#1677ff'}>#{r.appStore.position}</Tag>
          {r.appStore.change > 0 ? <ArrowUpOutlined style={{ color: '#52c41a' }} /> : r.appStore.change < 0 ? <ArrowDownOutlined style={{ color: '#ff4d4f' }} /> : <MinusOutlined />}
        </Space>
      ),
    },
    {
      title: 'Google Play 排名', key: 'googlePlay', width: 140,
      render: (_: any, r: any) => (
        <Space>
          <Tag color={r.googlePlay.position <= 3 ? '#52c41a' : '#1677ff'}>#{r.googlePlay.position}</Tag>
          {r.googlePlay.change > 0 ? <ArrowUpOutlined style={{ color: '#52c41a' }} /> : r.googlePlay.change < 0 ? <ArrowDownOutlined style={{ color: '#ff4d4f' }} /> : <MinusOutlined />}
        </Space>
      ),
    },
    { title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 100, render: (v: number) => v.toLocaleString() },
    {
      title: '难度', dataIndex: 'difficulty', key: 'difficulty', width: 90,
      render: (d: string) => {
        const colors: Record<string, string> = { high: '#ff4d4f', medium: '#faad14', low: '#52c41a' };
        const labels: Record<string, string> = { high: '高', medium: '中', low: '低' };
        return <Tag color={colors[d]}>{labels[d]}</Tag>;
      },
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="ASO 排名"
        subtitle="App Store & Google Play 关键词排名监控"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="App Store 关键词" value={mockASOKeywords.length} prefix={<AppleOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="Google Play 关键词" value={mockASOKeywords.length} prefix={<AndroidOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="App Store 评分" value={4.6} prefix={<StarOutlined style={{ color: '#faad14' }} />} precision={1} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="总下载量" value="12.5k" prefix={<DownloadOutlined />} /></Card>
        </Col>
      </Row>

      <Card title="排名趋势" className="chart-card" style={{ marginBottom: 24 }}>
        <ReactEChartsCore echarts={echarts} option={trendOption} style={{ height: 300 }} notMerge />
      </Card>

      <Card
        title="关键词排名"
        extra={
          <Select defaultValue="all" style={{ width: 140 }} onChange={setPlatform} options={[
            { value: 'all', label: '全部' },
            { value: 'appstore', label: 'App Store' },
            { value: 'googleplay', label: 'Google Play' },
          ]} />
        }
      >
        <Table columns={columns} dataSource={mockASOKeywords} rowKey="id" pagination={false} size="middle" loading={loading} />
      </Card>
    </div>
  );
};

export default ASO;