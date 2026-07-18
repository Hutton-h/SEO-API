import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Typography, Row, Col, Statistic, Space, message, Spin, Empty, Alert, Input, Tabs } from 'antd';
import { ReloadOutlined, ThunderboltOutlined, PlusOutlined, YoutubeOutlined, AimOutlined, EyeOutlined, LikeOutlined, PlaySquareOutlined } from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { youtubeAPI } from '@/services/youtube';

const { Text } = Typography;

const YouTube: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');

  const loadData = async () => {
    if (!projectId) return; setLoading(true); setError(null);
    try {
      const [kwRes, vidRes] = await Promise.allSettled([youtubeAPI.getYouTubeKeywords(projectId), youtubeAPI.getYouTubeVideos(projectId)]);
      const extractArr = (r: PromiseSettledResult<any>) => { if (r.status === 'fulfilled') { const d = (r.value as any).data !== undefined ? (r.value as any).data : r.value; return Array.isArray(d) ? d : (d?.data || []); } return []; };
      setKeywords(extractArr(kwRes)); setVideos(extractArr(vidRes));
    } catch (e: any) { setError(e?.message || '加载失败'); } finally { setLoading(false); }
  };

  useEffect(() => { if (!projectId) { setLoading(false); return; } loadData(); }, [projectId]);

  const handleRefresh = async () => { setRefreshing(true); try { await youtubeAPI.refreshYouTubeData(projectId!); message.success('数据刷新中'); setTimeout(() => { loadData(); setRefreshing(false); }, 3000); } catch (e: any) { message.error(e?.message || '刷新失败'); setRefreshing(false); } };
  const handleAddKeyword = async () => { if (!newKeyword.trim()) { message.warning('请输入关键词'); return; } try { await youtubeAPI.addYouTubeKeyword(projectId!, newKeyword.trim()); message.success('已添加'); setNewKeyword(''); loadData(); } catch (e: any) { message.error(e?.message || '添加失败'); } };
  const handleAddVideo = async () => { if (!newVideoUrl.trim()) { message.warning('请输入视频URL'); return; } try { await youtubeAPI.addYouTubeVideo(projectId!, newVideoUrl.trim()); message.success('已添加'); setNewVideoUrl(''); loadData(); } catch (e: any) { message.error(e?.message || '添加失败'); } };

  if (!projectId) return <div className="page-container"><PageHeader title="YouTube分析" /><Empty description="请先选择一个项目" style={{ marginTop: 120 }} /></div>;
  if (loading) return <div className="page-container"><PageHeader title="YouTube分析" /><Spin size="large" style={{ display: 'block', margin: '40vh auto' }} /></div>;
  if (error) return <div className="page-container"><PageHeader title="YouTube分析" /><Alert type="error" message="加载失败" description={error} showIcon style={{ marginTop: 24 }} action={<Button size="small" onClick={loadData}>重试</Button>} /></div>;

  const kwColumns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', render: (kw: string) => <Text strong>{kw}</Text> },
    { title: '排名', dataIndex: 'position', key: 'position', width: 80, render: (p: number) => <Tag color={p <= 3 ? 'green' : p <= 10 ? 'blue' : 'orange'}>{p || '-'}</Tag> },
    { title: '变化', dataIndex: 'change', key: 'change', width: 80, render: (c: number) => c ? <Text type={c > 0 ? 'success' : 'danger'}>{c > 0 ? '+' : ''}{c}</Text> : '-' },
    { title: '观看量', dataIndex: 'views', key: 'views', width: 100, render: (v: number) => v?.toLocaleString() || '-' },
    { title: '平均观看', dataIndex: 'avgViews', key: 'avgViews', width: 100, render: (v: number) => v?.toLocaleString() || '-' },
    { title: '竞争度', dataIndex: 'competition', key: 'competition', width: 90, render: (c: string) => <Tag>{c || '-'}</Tag> },
  ];

  const vidColumns = [
    { title: '视频标题', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: '观看量', dataIndex: 'views', key: 'views', width: 100, render: (v: number) => v?.toLocaleString() || '-' },
    { title: '点赞', dataIndex: 'likes', key: 'likes', width: 80, render: (v: number) => v?.toLocaleString() || '-' },
    { title: '评论', dataIndex: 'comments', key: 'comments', width: 80, render: (v: number) => v?.toLocaleString() || '-' },
    { title: '观看时长', dataIndex: 'watchTime', key: 'watchTime', width: 100, render: (v: string) => v || '-' },
  ];

  return (
    <div className="page-container">
      <PageHeader title="YouTube 分析" subtitle="YouTube 关键词排名与视频表现分析"
        actions={[{ label: '刷新', icon: <ReloadOutlined />, onClick: loadData, loading }, { label: '刷新数据', type: 'primary', icon: <ThunderboltOutlined />, onClick: handleRefresh, loading: refreshing }]} />
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="追踪关键词" value={keywords.length} prefix={<AimOutlined />} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="追踪视频" value={videos.length} prefix={<PlaySquareOutlined />} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="总观看量" value={videos.reduce((s, v) => s + (v.views || 0), 0)} prefix={<EyeOutlined />} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="总点赞" value={videos.reduce((s, v) => s + (v.likes || 0), 0)} prefix={<LikeOutlined />} /></Card></Col>
      </Row>
      <Tabs size="large" items={[
        { key: 'keywords', label: <span><AimOutlined /> 关键词排名</span>, children: (
          <Card title="YouTube 关键词" extra={<Input.Search placeholder="添加关键词" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} onSearch={handleAddKeyword} enterButton={<PlusOutlined />} style={{ width: 250 }} />}>
            <Table columns={kwColumns} dataSource={keywords} rowKey="id" pagination={{ pageSize: 10 }} size="middle" />
          </Card>
        )},
        { key: 'videos', label: <span><PlaySquareOutlined /> 视频表现</span>, children: (
          <Card title="视频列表" extra={<Input.Search placeholder="添加视频URL" value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} onSearch={handleAddVideo} enterButton={<PlusOutlined />} style={{ width: 300 }} />}>
            <Table columns={vidColumns} dataSource={videos} rowKey="title" pagination={{ pageSize: 10 }} size="middle" />
          </Card>
        )},
      ]} />
    </div>
  );
};

export default YouTube;