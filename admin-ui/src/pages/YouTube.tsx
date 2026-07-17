import React, { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Typography, Row, Col, Statistic, Button, Space, Progress, Empty, Spin, Alert, message,
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
import { useStore } from '@/store';
import { youtubeAPI } from '@/services/youtube';
import type { YouTubeKeyword, YouTubeVideo } from '@/services/youtube';
import PageHeader from '@/components/PageHeader';

echarts.use([BarChart, GridComponent, TooltipComponent, TitleComponent, CanvasRenderer]);

const { Text } = Typography;

const YouTube: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<YouTubeKeyword[]>([]);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);

  const loadData = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [kwRes, vidRes] = await Promise.all([
        youtubeAPI.getYouTubeKeywords(projectId),
        youtubeAPI.getYouTubeVideos(projectId),
      ]);

      const kwResult = (kwRes as any).data || kwRes;
      const vidResult = (vidRes as any).data || vidRes;

      setKeywords(Array.isArray(kwResult) ? kwResult : kwResult.data || []);
      setVideos(Array.isArray(vidResult) ? vidResult : vidResult.data || []);
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
      await youtubeAPI.refreshYouTubeData(projectId);
      message.success('YouTube 数据刷新成功');
      await loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '刷新失败';
      setError(msg);
      setLoading(false);
    }
  };

  if (!projectId) return <Empty description="请先选择一个项目" style={{ marginTop: 120 }} />;
  if (loading && !keywords.length && !videos.length) {
    return <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />;
  }
  if (error && !keywords.length && !videos.length) {
    return <Alert type="error" message="加载失败" description={error} showIcon style={{ margin: '20vh auto', maxWidth: 600 }} />;
  }

  const totalViews = keywords.reduce((acc, k) => acc + k.views, 0);
  const totalLikes = videos.reduce((acc, v) => acc + v.likes, 0);
  const totalComments = videos.reduce((acc, v) => acc + v.comments, 0);

  const viewsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      data: videos.map((v) => v.title.length > 10 ? v.title.slice(0, 10) + '...' : v.title),
      axisLabel: { color: '#999', rotate: 15 },
    },
    yAxis: { type: 'value', name: '观看量', axisLabel: { color: '#999', formatter: (v: number) => (v / 1000).toFixed(0) + 'k' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [
      {
        type: 'bar', data: videos.map((v) => v.views),
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
          <Card size="small"><Statistic title="追踪关键词" value={keywords.length} prefix={<YoutubeOutlined style={{ color: '#ff0000' }} />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="总观看量" value={(totalViews / 1000).toFixed(0) + 'k'} prefix={<EyeOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="总点赞" value={(totalLikes / 1000).toFixed(1) + 'k'} prefix={<LikeOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="总评论" value={(totalComments / 1000).toFixed(2) + 'k'} prefix={<CommentOutlined />} /></Card>
        </Col>
      </Row>

      <Card title="视频观看量" className="chart-card" style={{ marginBottom: 24 }}>
        <ReactEChartsCore echarts={echarts} option={viewsOption} style={{ height: 300 }} notMerge />
      </Card>

      <Card title="视频排名" style={{ marginBottom: 24 }}>
        <Table columns={videoColumns} dataSource={videos} rowKey="title" pagination={false} size="middle" loading={loading} />
      </Card>

      <Card title="关键词排名">
        <Table columns={keywordColumns} dataSource={keywords} rowKey="id" pagination={false} size="middle" loading={loading} />
      </Card>
    </div>
  );
};

export default YouTube;