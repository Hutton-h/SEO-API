import React, { useState } from 'react';
import {
  Card, Row, Col, Table, Progress, Typography, Space, Statistic, Button, Tag, Select,
  Input,
} from 'antd';
import {
  SearchOutlined, RiseOutlined, ReloadOutlined, CheckCircleOutlined,
  GlobalOutlined, VideoCameraOutlined, PictureOutlined, StarOutlined,
  ReadOutlined, EnvironmentOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';

echarts.use([PieChart, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text, Title } = Typography;

const featureConfig = [
  { key: 'featuredSnippet', name: 'Featured Snippet', icon: <StarOutlined />, color: '#1677ff', description: '精选摘要' },
  { key: 'knowledgeGraph', name: 'Knowledge Graph', icon: <GlobalOutlined />, color: '#52c41a', description: '知识图谱' },
  { key: 'peopleAlsoAsk', name: 'People Also Ask', icon: <SearchOutlined />, color: '#fa8c16', description: '用户还问' },
  { key: 'videoCarousel', name: 'Video Carousel', icon: <VideoCameraOutlined />, color: '#eb2f96', description: '视频轮播' },
  { key: 'localPack', name: 'Local Pack', icon: <EnvironmentOutlined />, color: '#722ed1', description: '本地包' },
  { key: 'imagePack', name: 'Image Pack', icon: <PictureOutlined />, color: '#13c2c2', description: '图片包' },
  { key: 'topStories', name: 'Top Stories', icon: <ThunderboltOutlined />, color: '#faad14', description: '头条新闻' },
  { key: 'siteLinks', name: 'Sitelinks', icon: <RiseOutlined />, color: '#2f54eb', description: '站点链接' },
  { key: 'reviewStars', name: 'Review Stars', icon: <StarOutlined />, color: '#f5222d', description: '评价星级' },
];

const mockStats = {
  totalKeywords: 1250,
  features: featureConfig.map((f) => ({
    ...f,
    count: Math.floor(Math.random() * 400) + 50,
    percentage: Math.floor(Math.random() * 50) + 10,
  })),
};

const mockKeywords = [
  { keyword: 'SEO优化', featuredSnippet: true, knowledgeGraph: true, peopleAlsoAsk: true, videoCarousel: false, localPack: false, imagePack: true, topStories: false, siteLinks: true, reviewStars: false },
  { keyword: '网站排名', featuredSnippet: false, knowledgeGraph: false, peopleAlsoAsk: true, videoCarousel: true, localPack: false, imagePack: false, topStories: false, siteLinks: false, reviewStars: true },
  { keyword: '关键词研究', featuredSnippet: true, knowledgeGraph: false, peopleAlsoAsk: true, videoCarousel: false, localPack: false, imagePack: true, topStories: false, siteLinks: true, reviewStars: false },
  { keyword: '外链建设', featuredSnippet: false, knowledgeGraph: false, peopleAlsoAsk: false, videoCarousel: true, localPack: false, imagePack: false, topStories: true, siteLinks: false, reviewStars: false },
  { keyword: '内容营销', featuredSnippet: true, knowledgeGraph: true, peopleAlsoAsk: true, videoCarousel: true, localPack: false, imagePack: true, topStories: true, siteLinks: true, reviewStars: true },
  { keyword: '本地SEO', featuredSnippet: false, knowledgeGraph: true, peopleAlsoAsk: true, videoCarousel: false, localPack: true, imagePack: false, topStories: false, siteLinks: false, reviewStars: true },
  { keyword: '技术SEO', featuredSnippet: true, knowledgeGraph: false, peopleAlsoAsk: false, videoCarousel: false, localPack: false, imagePack: false, topStories: false, siteLinks: true, reviewStars: false },
  { keyword: '移动端优化', featuredSnippet: false, knowledgeGraph: true, peopleAlsoAsk: true, videoCarousel: false, localPack: false, imagePack: true, topStories: false, siteLinks: false, reviewStars: false },
];

const SerpFeatures: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const handleRefresh = () => { setLoading(true); setTimeout(() => setLoading(false), 800); };

  const filteredKeywords = mockKeywords.filter((k) =>
    k.keyword.toLowerCase().includes(searchText.toLowerCase())
  );

  const pieData = mockStats.features.map((f) => ({ name: f.name, value: f.count, itemStyle: { color: f.color } }));

  const pieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: '5%', top: 'center', itemGap: 12, textStyle: { fontSize: 12 } },
    series: [{
      type: 'pie', radius: ['45%', '75%'], center: ['35%', '50%'],
      avoidLabelOverlap: false, itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: false }, emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: pieData,
    }],
  };

  const featureTableColumns = [
    {
      title: '特性名称', dataIndex: 'name', key: 'name',
      render: (text: string, record: any) => (
        <Space>
          <span style={{ color: record.color }}>{record.icon}</span>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>({record.description})</Text>
        </Space>
      ),
    },
    { title: '出现次数', dataIndex: 'count', key: 'count', render: (v: number) => <Text strong>{v.toLocaleString()}</Text>, sorter: (a: any, b: any) => a.count - b.count },
    {
      title: '出现率', dataIndex: 'percentage', key: 'percentage',
      render: (pct: number, record: any) => (
        <Progress
          percent={pct}
          strokeColor={record.color}
          size="small"
          format={(p) => `${p}%`}
          style={{ minWidth: 120 }}
        />
      ),
      sorter: (a: any, b: any) => a.percentage - b.percentage,
    },
  ];

  const keywordColumns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', render: (text: string) => <Text strong>{text}</Text>, filteredValue: searchText ? [searchText] : null, onFilter: (value: any, record: any) => record.keyword.includes(value) },
    ...featureConfig.map((f) => ({
      title: f.name,
      dataIndex: f.key,
      key: f.key,
      width: 100,
      render: (val: boolean) => val ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} /> : <Text type="secondary">-</Text>,
    })),
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="SERP 特性分析"
        subtitle="分析关键词在搜索结果中的特性展示分布"
        actions={[{ label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading }]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card><Statistic title="关键词总数" value={mockStats.totalKeywords} valueStyle={{ color: '#1677ff' }} prefix={<SearchOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="SERP 特性种类" value={featureConfig.length} valueStyle={{ color: '#52c41a' }} prefix={<GlobalOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="平均特性数/词" value={3.2} precision={1} valueStyle={{ color: '#fa8c16' }} prefix={<RiseOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="覆盖率最高" value="Featured Snippet" valueStyle={{ color: '#1677ff', fontSize: 16 }} prefix={<StarOutlined />} /></Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card title="特性出现率统计" className="chart-card">
            <Table
              columns={featureTableColumns}
              dataSource={mockStats.features}
              rowKey="key"
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="特性类型分布" className="chart-card">
            <ReactEChartsCore echarts={echarts} option={pieOption} style={{ height: 380 }} notMerge />
          </Card>
        </Col>
      </Row>

      <Card
        title="关键词 SERP 特性详情"
        style={{ marginTop: 24 }}
        extra={
          <Input
            placeholder="搜索关键词"
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
          />
        }
      >
        <Table
          columns={keywordColumns}
          dataSource={filteredKeywords}
          rowKey="keyword"
          pagination={{ pageSize: 10 }}
          size="middle"
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default SerpFeatures;