import React, { useState } from 'react';
import {
  Card, Table, Tabs, Tag, Typography, Row, Col, Statistic, Button, Space, Progress, Empty,
} from 'antd';
import {
  DollarOutlined, RiseOutlined, TeamOutlined, BulbOutlined,
  ReloadOutlined, ArrowUpOutlined, ArrowDownOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text, Paragraph } = Typography;

// 模拟数据
const mockSEMKeywords = [
  { id: '1', keyword: 'SEO优化服务', searchVolume: 12000, competition: 'high', cpc: 45.5, qualityScore: 8, impressions: 85000, clicks: 3200, ctr: 3.76, avgPosition: 2.3, cost: 145600, conversions: 128, conversionRate: 4.0 },
  { id: '2', keyword: '网站排名提升', searchVolume: 8800, competition: 'medium', cpc: 32.8, qualityScore: 7, impressions: 62000, clicks: 2100, ctr: 3.39, avgPosition: 3.1, cost: 68880, conversions: 84, conversionRate: 4.0 },
  { id: '3', keyword: '搜索引擎优化', searchVolume: 15000, competition: 'high', cpc: 52.0, qualityScore: 9, impressions: 120000, clicks: 4800, ctr: 4.0, avgPosition: 1.8, cost: 249600, conversions: 192, conversionRate: 4.0 },
  { id: '4', keyword: '内容营销策略', searchVolume: 9200, competition: 'medium', cpc: 38.2, qualityScore: 7, impressions: 55000, clicks: 1800, ctr: 3.27, avgPosition: 3.5, cost: 68760, conversions: 72, conversionRate: 4.0 },
  { id: '5', keyword: 'SEO审计', searchVolume: 4800, competition: 'low', cpc: 28.5, qualityScore: 8, impressions: 32000, clicks: 1400, ctr: 4.38, avgPosition: 2.1, cost: 39900, conversions: 56, conversionRate: 4.0 },
];

const mockCompetitorAds = [
  { id: '1', competitor: '竞品A', headline: '专业SEO优化服务 | 排名提升保证', description: '10年SEO经验，500+客户信赖', displayUrl: 'competitor-a.com/seo', finalUrl: 'https://competitor-a.com/seo', extensions: ['电话', '地址', '评价'], lastSeen: '2024-07-14' },
  { id: '2', competitor: '竞品B', headline: 'SEO服务 - 快速提升网站排名', description: '免费网站分析，定制化优化方案', displayUrl: 'competitor-b.com', finalUrl: 'https://competitor-b.com', extensions: ['网站链接', '促销'], lastSeen: '2024-07-14' },
  { id: '3', competitor: '竞品A', headline: '关键词优化 | 搜索引擎排名', description: '数据驱动SEO策略，ROI最大化', displayUrl: 'competitor-a.com/keywords', finalUrl: 'https://competitor-a.com/keywords', extensions: ['电话', '评价'], lastSeen: '2024-07-13' },
  { id: '4', competitor: '竞品C', headline: '一站式SEO解决方案', description: '从审计到执行，全流程覆盖', displayUrl: 'competitor-c.com', finalUrl: 'https://competitor-c.com', extensions: ['网站链接'], lastSeen: '2024-07-12' },
];

const mockOpportunities = [
  { id: '1', keyword: 'AI SEO工具', searchVolume: 6500, competition: 'low', cpc: 18.5, opportunityScore: 92, recommendation: '低竞争高搜索量，建议优先投放' },
  { id: '2', keyword: '电商SEO优化', searchVolume: 7800, competition: 'medium', cpc: 35.0, opportunityScore: 78, recommendation: '中等竞争，ROI潜力较高' },
  { id: '3', keyword: 'SEO培训课程', searchVolume: 4200, competition: 'low', cpc: 25.0, opportunityScore: 85, recommendation: '内容营销与SEM结合投放' },
  { id: '4', keyword: '外贸SEO', searchVolume: 5600, competition: 'low', cpc: 22.0, opportunityScore: 88, recommendation: '精准定位外贸客户群体' },
  { id: '5', keyword: 'SEO报告工具', searchVolume: 3800, competition: 'low', cpc: 15.0, opportunityScore: 90, recommendation: '工具类关键词，转化率较高' },
];

const SEMAnalysis: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  const competitionColor: Record<string, string> = {
    high: '#ff4d4f',
    medium: '#faad14',
    low: '#52c41a',
  };

  const competitionLabel: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  };

  // 关键词指标表格列
  const keywordColumns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', render: (t: string) => <Text strong>{t}</Text> },
    { title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 100, sorter: (a: any, b: any) => a.searchVolume - b.searchVolume, render: (v: number) => v.toLocaleString() },
    { title: '竞争度', dataIndex: 'competition', key: 'competition', width: 90, render: (v: string) => <Tag color={competitionColor[v]}>{competitionLabel[v]}</Tag> },
    { title: 'CPC', dataIndex: 'cpc', key: 'cpc', width: 80, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '质量分', dataIndex: 'qualityScore', key: 'qualityScore', width: 80, render: (v: number) => <Progress percent={v * 10} size="small" /> },
    { title: '展示', dataIndex: 'impressions', key: 'impressions', width: 100, render: (v: number) => (v / 1000).toFixed(1) + 'k' },
    { title: '点击', dataIndex: 'clicks', key: 'clicks', width: 80, render: (v: number) => v.toLocaleString() },
    { title: 'CTR', dataIndex: 'ctr', key: 'ctr', width: 80, render: (v: number) => v.toFixed(2) + '%' },
    { title: '平均排名', dataIndex: 'avgPosition', key: 'avgPosition', width: 90, render: (v: number) => <Tag color={v <= 2 ? '#52c41a' : '#1677ff'}>{v}</Tag> },
    { title: '花费', dataIndex: 'cost', key: 'cost', width: 100, render: (v: number) => `¥${v.toLocaleString()}` },
    { title: '转化', dataIndex: 'conversions', key: 'conversions', width: 70 },
    { title: '转化率', dataIndex: 'conversionRate', key: 'conversionRate', width: 80, render: (v: number) => v.toFixed(2) + '%' },
  ];

  // 竞品广告卡片
  const renderCompetitorAds = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
      {mockCompetitorAds.map((ad) => (
        <Card
          key={ad.id}
          size="small"
          title={
            <Space>
              <Tag color="blue">{ad.competitor}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>{ad.lastSeen}</Text>
            </Space>
          }
        >
          <Text strong style={{ fontSize: 15, color: '#1677ff', display: 'block', marginBottom: 4 }}>
            {ad.headline}
          </Text>
          <Paragraph type="secondary" style={{ marginBottom: 8 }}>{ad.description}</Paragraph>
          <Text type="success" style={{ fontSize: 13 }}>{ad.displayUrl}</Text>
          <div style={{ marginTop: 8 }}>
            {ad.extensions.map((ext) => (
              <Tag key={ext} style={{ marginBottom: 4 }}>{ext}</Tag>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );

  // 机会分析图表
  const opportunityOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      data: mockOpportunities.map((o) => o.keyword),
      axisLabel: { color: '#999', rotate: 20 },
    },
    yAxis: { type: 'value', name: '机会分数', axisLabel: { color: '#999' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [
      {
        type: 'bar',
        data: mockOpportunities.map((o) => ({
          value: o.opportunityScore,
          itemStyle: {
            color: o.opportunityScore >= 85 ? '#52c41a' : o.opportunityScore >= 70 ? '#1677ff' : '#faad14',
            borderRadius: [6, 6, 0, 0],
          },
        })),
        barWidth: '50%',
        label: { show: true, position: 'top', color: '#333' },
      },
    ],
  };

  const tabItems = [
    {
      key: 'keywords',
      label: '关键词指标',
      children: (
        <Card
          title="SEM 关键词指标"
          extra={<Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>刷新</Button>}
        >
          <Table columns={keywordColumns} dataSource={mockSEMKeywords} rowKey="id" scroll={{ x: 1200 }} pagination={{ pageSize: 10 }} size="middle" />
        </Card>
      ),
    },
    {
      key: 'competitor-ads',
      label: '竞品广告',
      children: (
        <Card
          title="竞品广告监控"
          extra={<Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>刷新</Button>}
        >
          {renderCompetitorAds()}
        </Card>
      ),
    },
    {
      key: 'opportunities',
      label: '机会分析',
      children: (
        <>
          <Card title="机会分析图表" className="chart-card" style={{ marginBottom: 24 }}>
            <ReactEChartsCore echarts={echarts} option={opportunityOption} style={{ height: 350 }} notMerge />
          </Card>
          <Card title="机会详情">
            {mockOpportunities.map((opp) => (
              <Card key={opp.id} size="small" style={{ marginBottom: 12 }} type="inner">
                <Row gutter={16} align="middle">
                  <Col flex="auto">
                    <Text strong>{opp.keyword}</Text>
                    <div style={{ marginTop: 4 }}>
                      <Space size={16}>
                        <Text type="secondary">搜索量: {opp.searchVolume.toLocaleString()}</Text>
                        <Tag color={competitionColor[opp.competition]}>竞争: {competitionLabel[opp.competition]}</Tag>
                        <Text type="secondary">CPC: ¥{opp.cpc}</Text>
                      </Space>
                    </div>
                    <Paragraph type="success" style={{ marginTop: 8, marginBottom: 0 }}>
                      <BulbOutlined /> {opp.recommendation}
                    </Paragraph>
                  </Col>
                  <Col>
                    <Progress type="circle" percent={opp.opportunityScore} size={60} strokeColor={opp.opportunityScore >= 80 ? '#52c41a' : '#1677ff'} />
                  </Col>
                </Row>
              </Card>
            ))}
          </Card>
        </>
      ),
    },
  ];

  // 统计总览
  const totalCost = mockSEMKeywords.reduce((acc, k) => acc + k.cost, 0);
  const totalImpressions = mockSEMKeywords.reduce((acc, k) => acc + k.impressions, 0);
  const totalClicks = mockSEMKeywords.reduce((acc, k) => acc + k.clicks, 0);
  const totalConversions = mockSEMKeywords.reduce((acc, k) => acc + k.conversions, 0);

  return (
    <div className="page-container">
      <PageHeader
        title="SEM 分析"
        subtitle="搜索引擎营销数据分析"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="总花费" value={totalCost} prefix="¥" precision={0} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="总展示" value={(totalImpressions / 1000).toFixed(0)} suffix="k" prefix={<RiseOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="总点击" value={totalClicks} prefix={<TeamOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="总转化" value={totalConversions} prefix={<DollarOutlined />} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="keywords" items={tabItems} size="large" />
    </div>
  );
};

export default SEMAnalysis;