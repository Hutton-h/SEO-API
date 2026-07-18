import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Tag, Typography, Row, Col, Statistic, Space, message, Spin, Empty, Alert, Input, Progress } from 'antd';
import { ReloadOutlined, PlusOutlined, SearchOutlined, AimOutlined, StarOutlined, PictureOutlined, VideoCameraOutlined, EnvironmentOutlined, ReadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { serpFeaturesAPI } from '@/services/serpFeatures';

echarts.use([BarChart, GridComponent, TooltipComponent, TitleComponent, CanvasRenderer]);

const { Text } = Typography;

const featureIcons: Record<string, React.ReactNode> = {
  featuredSnippet: <StarOutlined />, knowledgeGraph: <ReadOutlined />, peopleAlsoAsk: <SearchOutlined />,
  videoCarousel: <VideoCameraOutlined />, localPack: <EnvironmentOutlined />, imagePack: <PictureOutlined />,
  topStories: <ThunderboltOutlined />, siteLinks: <AimOutlined />, reviewStars: <StarOutlined />,
};

const featureLabels: Record<string, string> = {
  featuredSnippet: '精选摘要', knowledgeGraph: '知识图谱', peopleAlsoAsk: '用户还问',
  videoCarousel: '视频轮播', localPack: '本地包', imagePack: '图片包',
  topStories: '热门新闻', siteLinks: '站点链接', reviewStars: '评价星级',
};

const SerpFeatures: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalKeywords: 0, features: [] });
  const [newKeyword, setNewKeyword] = useState('');

  const loadData = useCallback(async () => {
    if (!projectId) return; setLoading(true); setError(null);
    try {
      const res = await serpFeaturesAPI.getFeatureStats(projectId);
      const data = (res as any).data !== undefined ? (res as any).data : res;
      if (data?.features) {
        setStats(data);
        setFeatures(data?.keywords || data?.keywordData || []);
      } else if (Array.isArray(data)) {
        setFeatures(data);
      } else {
        setFeatures(data?.data || []);
        if (data?.totalKeywords) setStats({ totalKeywords: data.totalKeywords, features: data.features || [] });
      }
    } catch (e: any) { setError(e?.message || '加载失败'); } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { if (!projectId) { setLoading(false); return; } loadData(); }, [projectId]);

  const handleAddKeyword = async () => { if (!newKeyword.trim()) { message.warning('请输入关键词'); return; } try { await serpFeaturesAPI.addKeyword(projectId!, newKeyword.trim()); message.success('已添加'); setNewKeyword(''); loadData(); } catch (e: any) { message.error(e?.message || '添加失败'); } };

  if (!projectId) return <div className="page-container"><PageHeader title="SERP特征" /><Empty description="请先选择一个项目" style={{ marginTop: 120 }} /></div>;
  if (loading) return <div className="page-container"><PageHeader title="SERP特征" /><Spin size="large" style={{ display: 'block', margin: '40vh auto' }} /></div>;
  if (error) return <div className="page-container"><PageHeader title="SERP特征" /><Alert type="error" message="加载失败" description={error} showIcon style={{ marginTop: 24 }} action={<Button size="small" onClick={loadData}>重试</Button>} /></div>;

  const featureStats = stats?.features || [];
  const featureChartOption = featureStats.length > 0 ? {
    tooltip: { trigger: 'axis' }, xAxis: { type: 'category', data: featureStats.map((f: any) => featureLabels[f.key || f.name] || f.key || f.name) },
    yAxis: { type: 'value', name: '覆盖数' },
    series: [{ type: 'bar', data: featureStats.map((f: any) => ({ value: f.count || f.value || 0, itemStyle: { color: '#1677ff' } })), barWidth: 30 }],
  } : null;

  const featureColumns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 180, render: (kw: string) => <Text strong>{kw}</Text> },
    { title: '精选摘要', dataIndex: 'featuredSnippet', key: 'featuredSnippet', width: 90, render: (v: boolean) => v ? <Tag color="green">有</Tag> : <Tag>无</Tag> },
    { title: '知识图谱', dataIndex: 'knowledgeGraph', key: 'knowledgeGraph', width: 90, render: (v: boolean) => v ? <Tag color="green">有</Tag> : <Tag>无</Tag> },
    { title: '用户还问', dataIndex: 'peopleAlsoAsk', key: 'peopleAlsoAsk', width: 90, render: (v: boolean) => v ? <Tag color="green">有</Tag> : <Tag>无</Tag> },
    { title: '视频轮播', dataIndex: 'videoCarousel', key: 'videoCarousel', width: 90, render: (v: boolean) => v ? <Tag color="green">有</Tag> : <Tag>无</Tag> },
    { title: '本地包', dataIndex: 'localPack', key: 'localPack', width: 90, render: (v: boolean) => v ? <Tag color="green">有</Tag> : <Tag>无</Tag> },
    { title: '图片包', dataIndex: 'imagePack', key: 'imagePack', width: 90, render: (v: boolean) => v ? <Tag color="green">有</Tag> : <Tag>无</Tag> },
    { title: '站点链接', dataIndex: 'siteLinks', key: 'siteLinks', width: 90, render: (v: boolean) => v ? <Tag color="green">有</Tag> : <Tag>无</Tag> },
    { title: '评价星级', dataIndex: 'reviewStars', key: 'reviewStars', width: 90, render: (v: boolean) => v ? <Tag color="green">有</Tag> : <Tag>无</Tag> },
  ];

  return (
    <div className="page-container">
      <PageHeader title="SERP 特征" subtitle="搜索特征分析 - 精选摘要、知识图谱、People Also Ask 等"
        actions={[{ label: '刷新', icon: <ReloadOutlined />, onClick: loadData, loading }]} />
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="追踪关键词" value={stats?.totalKeywords || features.length} prefix={<AimOutlined />} /></Card></Col>
        {featureStats.slice(0, 5).map((f: any, i: number) => (
          <Col xs={12} sm={4} key={i}>
            <Card size="small"><Statistic title={featureLabels[f.key || f.name] || f.key || f.name} value={f.count || f.value || 0}
              prefix={featureIcons[f.key || f.name] || <StarOutlined />} /></Card>
          </Col>
        ))}
      </Row>
      {featureChartOption && <Card title="SERP 特征分布" style={{ marginBottom: 24 }}><ReactEChartsCore echarts={echarts} option={featureChartOption} style={{ height: 300 }} /></Card>}
      <Card title="关键词 SERP 特征"
        extra={<Input.Search placeholder="添加关键词" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} onSearch={handleAddKeyword} enterButton={<PlusOutlined />} style={{ width: 250 }} />}>
        <Table columns={featureColumns} dataSource={features} rowKey="keyword" scroll={{ x: 900 }} pagination={{ pageSize: 10 }} size="middle" />
      </Card>
    </div>
  );
};

export default SerpFeatures;