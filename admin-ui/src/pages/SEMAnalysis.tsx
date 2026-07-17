import React, { useState, useEffect } from 'react';
import {
  Card, Table, Tabs, Tag, Typography, Row, Col, Statistic, Button, Space, Progress, Empty, Spin, Alert, message,
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
import { useStore } from '@/store';
import { semAPI } from '@/services/sem';
import type { SEMKeyword, CompetitorAd, Opportunity } from '@/services/sem';
import PageHeader from '@/components/PageHeader';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text, Paragraph } = Typography;

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

const SEMAnalysis: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<SEMKeyword[]>([]);
  const [competitorAds, setCompetitorAds] = useState<CompetitorAd[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  const loadData = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [kwRes, adRes, oppRes] = await Promise.all([
        semAPI.getSEMKeywords(projectId),
        semAPI.getCompetitorAds(projectId),
        semAPI.getOpportunities(projectId),
      ]);

      const kwResult = (kwRes as any).data || kwRes;
      const adResult = (adRes as any).data || adRes;
      const oppResult = (oppRes as any).data || oppRes;

      setKeywords(Array.isArray(kwResult) ? kwResult : kwResult.data || []);
      setCompetitorAds(Array.isArray(adResult) ? adResult : adResult.data || []);
      setOpportunities(Array.isArray(oppResult) ? oppResult : oppResult.data || []);
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

  const handleRefresh = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      await semAPI.refreshSEMData(projectId);
      message.success('SEM 数据刷新成功');
      await loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '刷新失败';
      setError(msg);
      setLoading(false);
    }
  };

  if (!projectId) return <Empty description="请先选择一个项目" style={{ marginTop: 120 }} />;
  if (loading && !keywords.length && !competitorAds.length && !opportunities.length) {
    return <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />;
  }
  if (error && !keywords.length && !competitorAds.length && !opportunities.length) {
    return <Alert type="error" message="加载失败" description={error} showIcon style={{ margin: '20vh auto', maxWidth: 600 }} />;
  }

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
      {competitorAds.map((ad) => (
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
      data: opportunities.map((o) => o.keyword),
      axisLabel: { color: '#999', rotate: 20 },
    },
    yAxis: { type: 'value', name: '机会分数', axisLabel: { color: '#999' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [
      {
        type: 'bar',
        data: opportunities.map((o) => ({
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
          <Table columns={keywordColumns} dataSource={keywords} rowKey="id" scroll={{ x: 1200 }} pagination={{ pageSize: 10 }} size="middle" loading={loading} />
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
            {opportunities.map((opp) => (
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
  const totalCost = keywords.reduce((acc, k) => acc + k.cost, 0);
  const totalImpressions = keywords.reduce((acc, k) => acc + k.impressions, 0);
  const totalClicks = keywords.reduce((acc, k) => acc + k.clicks, 0);
  const totalConversions = keywords.reduce((acc, k) => acc + k.conversions, 0);

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