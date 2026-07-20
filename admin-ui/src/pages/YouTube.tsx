import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Modal, Input, Form, Typography, Row, Col,
  Space, Popconfirm, Tabs, Tag, message, Progress, Tooltip,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ReloadOutlined, EditOutlined,
  YoutubeOutlined, PlayCircleOutlined, EyeOutlined, LikeOutlined,
  CommentOutlined, RiseOutlined, BarChartOutlined, TrophyOutlined,
  StarFilled, TagOutlined, SearchOutlined, LinkOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { TrendChart, ComparisonChart } from '@/components/charts';
import type { TrendDataPoint, ComparisonDataPoint } from '@/components/charts';
import { useStore } from '@/store';
import { useProject } from '@/hooks';
import { youtubeAPI } from '@/services/youtube';
import type { YouTubeVideo } from '@/services/youtube';

const { Text, Paragraph } = Typography;

// ============================================================================
// Types
// ============================================================================

interface Channel {
  id: string;
  channelId: string;
  channelName: string;
  subscriberCount: number;
  videoCount: number;
  totalViews: number;
}

interface VideoAnalysis {
  id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  tags: string[];
  seo_score: number;
  channelName: string;
}

interface YouTubeSummary {
  viewsTrend: Array<{ date: string; value: number }>;
  subscribersTrend: Array<{ date: string; value: number }>;
  topVideos: Array<{ name: string; value: number }>;
}

const INITIAL_CHANNEL: Channel = {
  id: '',
  channelId: '',
  channelName: '',
  subscriberCount: 0,
  videoCount: 0,
  totalViews: 0,
};

// ============================================================================
// Helpers
// ============================================================================

const getSeoScoreColor = (score: number): string => {
  if (score >= 80) return '#52c41a';
  if (score >= 60) return '#faad14';
  return '#ff4d4f';
};

const getSeoScoreLabel = (score: number): string => {
  if (score >= 80) return '优秀';
  if (score >= 60) return '一般';
  return '需优化';
};

const formatNumber = (n: number): string => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};

const formatWatchTime = (seconds: number): string => {
  if (!seconds || seconds < 60) return `${seconds || 0}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}时${m}分`;
};

// ============================================================================
// Component
// ============================================================================

const YouTube: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const projectName = useStore((s) => s.currentProject?.name || '');
  const { hasProject } = useProject();

  // ---- State ----
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('channels');

  // Data
  const [channels, setChannels] = useState<Channel[]>([]);
  const [videos, setVideos] = useState<VideoAnalysis[]>([]);
  const [summary, setSummary] = useState<YouTubeSummary>({
    viewsTrend: [],
    subscribersTrend: [],
    topVideos: [],
  });

  // Video management
  const [videoList, setVideoList] = useState<YouTubeVideo[]>([]);
  const [videoListLoading, setVideoListLoading] = useState(false);

  // Channel modal
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel>(INITIAL_CHANNEL);
  const [channelSaving, setChannelSaving] = useState(false);
  const [channelForm] = Form.useForm();

  // Video management modal
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoSaving, setVideoSaving] = useState(false);
  const [videoForm] = Form.useForm();

  // Search
  const [videoSearchText, setVideoSearchText] = useState('');

  // ---- Data loading ----
  const loadChannels = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await youtubeAPI.getYouTubeKeywords(projectId);
      const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
      setChannels(list);
    } catch {
      setChannels([]);
    }
  }, [projectId]);

  const loadVideos = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await youtubeAPI.getYouTubeVideos(projectId);
      const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
      setVideos(list);
    } catch {
      setVideos([]);
    }
  }, [projectId]);

  const loadSummary = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await youtubeAPI.refreshYouTubeData(projectId);
      const data = res?.data !== undefined ? res.data : res;
      setSummary({
        viewsTrend: data?.viewsTrend ?? [],
        subscribersTrend: data?.subscribersTrend ?? [],
        topVideos: data?.topVideos ?? [],
      });
    } catch {
      setSummary({ viewsTrend: [], subscribersTrend: [], topVideos: [] });
    }
  }, [projectId]);

  const loadAll = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadChannels(), loadVideos(), loadSummary()]);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, loadChannels, loadVideos, loadSummary]);

  const loadVideosList = useCallback(async () => {
    if (!projectId) return;
    setVideoListLoading(true);
    try {
      const res: any = await youtubeAPI.getYouTubeVideos(projectId);
      const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
      setVideoList(list);
    } catch {
      setVideoList([]);
    } finally {
      setVideoListLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadAll();
  }, [projectId]);

  // ---- Channel CRUD ----
  const handleAddChannel = () => {
    setEditingChannel(INITIAL_CHANNEL);
    channelForm.resetFields();
    setChannelModalOpen(true);
  };

  const handleEditChannel = (ch: Channel) => {
    setEditingChannel(ch);
    channelForm.setFieldsValue(ch);
    setChannelModalOpen(true);
  };

  const handleSaveChannel = async () => {
    try {
      const values = await channelForm.validateFields();
      setChannelSaving(true);
      if (editingChannel.id) {
        await youtubeAPI.addYouTubeKeyword(projectId!, { ...values, id: editingChannel.id });
        message.success('频道已更新');
      } else {
        await youtubeAPI.addYouTubeKeyword(projectId!, values);
        message.success('频道已添加');
      }
      setChannelModalOpen(false);
      await loadChannels();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.error?.message || err?.message || '保存失败');
    } finally {
      setChannelSaving(false);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    try {
      await youtubeAPI.refreshYouTubeData(projectId!);
      message.success('频道已删除');
      await loadChannels();
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || '删除失败');
    }
  };

  // ---- Video Management CRUD ----
  const handleAddVideo = () => {
    videoForm.resetFields();
    setVideoModalOpen(true);
  };

  const handleSaveVideo = async () => {
    try {
      const values = await videoForm.validateFields();
      setVideoSaving(true);
      await youtubeAPI.addYouTubeVideo(projectId!, values.url);
      message.success('视频已添加');
      setVideoModalOpen(false);
      await loadVideosList();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.error?.message || err?.message || '添加失败');
    } finally {
      setVideoSaving(false);
    }
  };

  const handleVideoTabActivated = useCallback((key: string) => {
    setActiveTab(key);
    if (key === 'video-management' && videoList.length === 0) {
      loadVideosList();
    }
  }, [videoList.length, loadVideosList]);

  // ---- KPI calculations ----
  const channelsCount = channels.length;
  const totalVideos = channels.reduce((s, c) => s + (c.videoCount || 0), 0);
  const totalViews = channels.reduce((s, c) => s + (c.totalViews || 0), 0);
  const avgEngagement = videos.length > 0
    ? ((videos.reduce((s, v) => s + ((v.likes || 0) + (v.comments || 0)), 0) / videos.length) / 100).toFixed(1)
    : '0';

  // ---- Filtered videos ----
  const filteredVideos = videoSearchText
    ? videos.filter((v) => v.title.toLowerCase().includes(videoSearchText.toLowerCase()))
    : videos;

  // ---- Columns ----
  const videoColumns = [
    {
      title: '视频标题', dataIndex: 'title', key: 'title', width: 280, ellipsis: true,
      render: (t: string) => <Text strong>{t}</Text>,
    },
    {
      title: '频道', dataIndex: 'channelName', key: 'channelName', width: 120,
      render: (t: string) => <Tag color="blue">{t}</Tag>,
    },
    {
      title: '播放量', dataIndex: 'views', key: 'views', width: 100,
      sorter: (a: VideoAnalysis, b: VideoAnalysis) => (a.views || 0) - (b.views || 0),
      render: (v: number) => formatNumber(v ?? 0),
    },
    {
      title: '点赞', dataIndex: 'likes', key: 'likes', width: 90,
      render: (v: number) => (
        <Space size={4}><LikeOutlined style={{ color: '#1677ff' }} />{formatNumber(v ?? 0)}</Space>
      ),
    },
    {
      title: '评论', dataIndex: 'comments', key: 'comments', width: 90,
      render: (v: number) => (
        <Space size={4}><CommentOutlined style={{ color: '#52c41a' }} />{formatNumber(v ?? 0)}</Space>
      ),
    },
    {
      title: 'SEO 评分', dataIndex: 'seo_score', key: 'seo_score', width: 130,
      sorter: (a: VideoAnalysis, b: VideoAnalysis) => (a.seo_score || 0) - (b.seo_score || 0),
      render: (score: number) => (
        <Space size={8}>
          <Progress
            type="circle"
            percent={score ?? 0}
            size={28}
            strokeColor={getSeoScoreColor(score ?? 0)}
          />
          <Tag color={getSeoScoreColor(score ?? 0)}>{getSeoScoreLabel(score ?? 0)}</Tag>
        </Space>
      ),
    },
    {
      title: '标签', dataIndex: 'tags', key: 'tags', width: 200,
      render: (tags: string[]) => (
        <Space size={[4, 4]} wrap>
          {(tags || []).slice(0, 3).map((t, i) => (
            <Tag key={i} color="default" style={{ fontSize: 11 }}>{t}</Tag>
          ))}
          {(tags || []).length > 3 && (
            <Tooltip title={(tags || []).slice(3).join(', ')}>
              <Tag style={{ fontSize: 11 }}>+{tags.length - 3}</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const videoManagementColumns = [
    {
      title: '标题', dataIndex: 'title', key: 'title', width: 280, ellipsis: true,
      render: (t: string) => (
        <Space>
          <PlayCircleOutlined style={{ color: '#1677ff' }} />
          <Text strong>{t || '—'}</Text>
        </Space>
      ),
    },
    {
      title: '播放量', dataIndex: 'views', key: 'views', width: 110,
      sorter: (a: YouTubeVideo, b: YouTubeVideo) => (a.views || 0) - (b.views || 0),
      render: (v: number) => (
        <Space size={4}><EyeOutlined style={{ color: '#52c41a' }} />{formatNumber(v ?? 0)}</Space>
      ),
    },
    {
      title: '点赞', dataIndex: 'likes', key: 'likes', width: 100,
      sorter: (a: YouTubeVideo, b: YouTubeVideo) => (a.likes || 0) - (b.likes || 0),
      render: (v: number) => (
        <Space size={4}><LikeOutlined style={{ color: '#1677ff' }} />{formatNumber(v ?? 0)}</Space>
      ),
    },
    {
      title: '评论', dataIndex: 'comments', key: 'comments', width: 100,
      sorter: (a: YouTubeVideo, b: YouTubeVideo) => (a.comments || 0) - (b.comments || 0),
      render: (v: number) => (
        <Space size={4}><CommentOutlined style={{ color: '#fa8c16' }} />{formatNumber(v ?? 0)}</Space>
      ),
    },
    {
      title: '观看时长', dataIndex: 'watchTime', key: 'watchTime', width: 120,
      sorter: (a: YouTubeVideo, b: YouTubeVideo) => (a.watchTime || 0) - (b.watchTime || 0),
      render: (v: number) => <Text>{formatWatchTime(v ?? 0)}</Text>,
    },
    {
      title: '排名', dataIndex: 'position', key: 'position', width: 90,
      sorter: (a: YouTubeVideo, b: YouTubeVideo) => (a.position || 0) - (b.position || 0),
      render: (p: number) => {
        if (!p) return <Text type="secondary">—</Text>;
        return (
          <Tag color={p <= 3 ? '#ff4d4f' : p <= 10 ? '#fa8c16' : 'default'}>
            <TrophyOutlined style={{ marginRight: 4 }} />
            #{p}
          </Tag>
        );
      },
    },
  ];

  // ---- Chart data ----
  const viewsTrendData: TrendDataPoint[] = (summary.viewsTrend || []).map((d: any) => ({
    date: d.date || '',
    value: d.value || 0,
  }));

  const subscribersTrendData: TrendDataPoint[] = (summary.subscribersTrend || []).map((d: any) => ({
    date: d.date || '',
    value: d.value || 0,
  }));

  const topVideosComparisonData: ComparisonDataPoint[] = (summary.topVideos || []).map((v: any) => ({
    name: v.name || '',
    value: v.value || 0,
  }));

  // ---- State: no project ----
  if (!hasProject) {
    return (
      <div className="page-container">
        <PageHeader title="YouTube SEO" subtitle="请先选择项目" showCountrySelector />
        <EmptyState
          scene="data"
          title="请先选择项目"
          description="选择一个项目开始管理 YouTube SEO 数据"
        />
      </div>
    );
  }

  // ---- State: loading ----
  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="YouTube SEO"
          subtitle={`${projectName} - YouTube 视频优化`}
          showCountrySelector
          actions={<Button icon={<ReloadOutlined />} loading disabled>刷新</Button>}
        />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ---- State: error ----
  if (error && channels.length === 0 && videos.length === 0) {
    return (
      <div className="page-container">
        <PageHeader
          title="YouTube SEO"
          subtitle={`${projectName} - YouTube 视频优化`}
          showCountrySelector
        />
        <ErrorState message={error} onRetry={loadAll} />
      </div>
    );
  }

  // ---- Render ----
  return (
    <div className="page-container">
      <PageHeader
        title="YouTube SEO"
        subtitle={`${projectName} - ${channelsCount} 个频道 · ${totalVideos} 个视频`}
        showCountrySelector
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadAll}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddChannel}>
              添加频道
            </Button>
          </Space>
        }
      />

      {/* KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="追踪频道"
            value={channelsCount}
            icon={<YoutubeOutlined />}
            color="#ff4d4f"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="总视频数"
            value={totalVideos}
            icon={<PlayCircleOutlined />}
            color="#1677ff"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="总播放量"
            value={formatNumber(totalViews)}
            icon={<EyeOutlined />}
            color="#52c41a"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="平均互动率"
            value={`${avgEngagement}%`}
            icon={<BarChartOutlined />}
            color="#fa8c16"
          />
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={handleVideoTabActivated}
        style={{ marginTop: 8 }}
        items={[
          {
            key: 'channels',
            label: <span><YoutubeOutlined /> 频道管理</span>,
            children: (
              <>
                {channels.length === 0 ? (
                  <EmptyState
                    scene="data"
                    title="暂无频道"
                    description="添加您的 YouTube 频道，开始追踪视频 SEO 数据"
                    action={{ text: '添加频道', icon: <PlusOutlined />, onClick: handleAddChannel }}
                  />
                ) : (
                  <Row gutter={[16, 16]}>
                    {channels.map((ch) => (
                      <Col xs={24} sm={12} lg={8} key={ch.id}>
                        <Card
                          hoverable
                          style={{ borderRadius: 8 }}
                          actions={[
                            <Tooltip title="编辑" key="edit">
                              <EditOutlined onClick={() => handleEditChannel(ch)} />
                            </Tooltip>,
                            <Popconfirm
                              key="delete"
                              title="确定删除此频道？"
                              onConfirm={() => handleDeleteChannel(ch.id)}
                            >
                              <Tooltip title="删除">
                                <DeleteOutlined style={{ color: '#ff4d4f' }} />
                              </Tooltip>
                            </Popconfirm>,
                          ]}
                        >
                          <Card.Meta
                            avatar={
                              <div style={{
                                width: 48, height: 48, borderRadius: 12,
                                background: '#ff4d4f15', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontSize: 24, color: '#ff4d4f',
                              }}>
                                <YoutubeOutlined />
                              </div>
                            }
                            title={<Text strong>{ch.channelName}</Text>}
                            description={
                              <div>
                                <Paragraph style={{ marginBottom: 4, fontSize: 13 }}>
                                  <Text type="secondary">ID: </Text>
                                  <Text code style={{ fontSize: 11 }}>{ch.channelId}</Text>
                                </Paragraph>
                                <Row gutter={[12, 8]} style={{ marginTop: 8 }}>
                                  <Col span={8}>
                                    <Text type="secondary" style={{ fontSize: 11 }}>订阅</Text>
                                    <br />
                                    <Text strong>{formatNumber(ch.subscriberCount || 0)}</Text>
                                  </Col>
                                  <Col span={8}>
                                    <Text type="secondary" style={{ fontSize: 11 }}>视频</Text>
                                    <br />
                                    <Text strong>{ch.videoCount || 0}</Text>
                                  </Col>
                                  <Col span={8}>
                                    <Text type="secondary" style={{ fontSize: 11 }}>播放</Text>
                                    <br />
                                    <Text strong>{formatNumber(ch.totalViews || 0)}</Text>
                                  </Col>
                                </Row>
                              </div>
                            }
                          />
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </>
            ),
          },
          {
            key: 'video-management',
            label: <span><PlayCircleOutlined /> 视频管理</span>,
            children: (
              <Card
                style={{ borderRadius: 8 }}
                extra={
                  <Button type="primary" icon={<LinkOutlined />} onClick={handleAddVideo}>
                    添加视频
                  </Button>
                }
              >
                {videoListLoading ? (
                  <LoadingSkeleton type="table" />
                ) : videoList.length === 0 ? (
                  <EmptyState
                    scene="data"
                    title="暂无视频"
                    description="添加 YouTube 视频 URL，开始追踪视频数据"
                    action={{ text: '添加视频', icon: <LinkOutlined />, onClick: handleAddVideo }}
                  />
                ) : (
                  <Table
                    columns={videoManagementColumns}
                    dataSource={videoList}
                    rowKey={(record, index) => record.title || `video-${index}`}
                    size="middle"
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showTotal: (t) => `共 ${t} 个视频`,
                    }}
                    scroll={{ x: 900 }}
                  />
                )}
              </Card>
            ),
          },
          {
            key: 'videos',
            label: <span><SearchOutlined /> 视频分析</span>,
            children: (
              <Card style={{ borderRadius: 8 }}>
                <div style={{ marginBottom: 16 }}>
                  <Input.Search
                    placeholder="搜索视频标题..."
                    value={videoSearchText}
                    onChange={(e) => setVideoSearchText(e.target.value)}
                    onSearch={() => {}}
                    style={{ width: 320 }}
                    allowClear
                    prefix={<SearchOutlined />}
                  />
                </div>

                {filteredVideos.length === 0 ? (
                  <EmptyState
                    scene="data"
                    title="暂无视频数据"
                    description="添加频道后，系统将自动分析视频 SEO 表现"
                  />
                ) : (
                  <Table
                    columns={videoColumns}
                    dataSource={filteredVideos}
                    rowKey="id"
                    size="middle"
                    pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 个视频` }}
                    scroll={{ x: 1100 }}
                  />
                )}
              </Card>
            ),
          },
          {
            key: 'summary',
            label: <span><BarChartOutlined /> 趋势分析</span>,
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card
                    title={<><EyeOutlined /> 播放量趋势</>}
                    style={{ borderRadius: 8 }}
                  >
                    {viewsTrendData.length > 0 ? (
                      <TrendChart
                        data={viewsTrendData}
                        height={300}
                        smooth
                        showArea
                        color="#1677ff"
                        title="播放量"
                      />
                    ) : (
                      <EmptyState scene="data" title="暂无播放量趋势" />
                    )}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card
                    title={<><RiseOutlined /> 订阅者趋势</>}
                    style={{ borderRadius: 8 }}
                  >
                    {subscribersTrendData.length > 0 ? (
                      <TrendChart
                        data={subscribersTrendData}
                        height={300}
                        smooth
                        showArea
                        color="#52c41a"
                        title="订阅者"
                      />
                    ) : (
                      <EmptyState scene="data" title="暂无订阅者趋势" />
                    )}
                  </Card>
                </Col>
                <Col xs={24}>
                  <Card
                    title={<><TrophyOutlined /> 热门视频对比</>}
                    style={{ borderRadius: 8 }}
                  >
                    {topVideosComparisonData.length > 0 ? (
                      <ComparisonChart
                        data={topVideosComparisonData}
                        height={350}
                        title="播放量"
                      />
                    ) : (
                      <EmptyState scene="data" title="暂无热门视频数据" />
                    )}
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />

      {/* Channel Add/Edit Modal */}
      <Modal
        title={editingChannel.id ? '编辑频道' : '添加频道'}
        open={channelModalOpen}
        onOk={handleSaveChannel}
        onCancel={() => { setChannelModalOpen(false); channelForm.resetFields(); }}
        confirmLoading={channelSaving}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        width={520}
      >
        <Form
          form={channelForm}
          layout="vertical"
          style={{ marginTop: 16 }}
          initialValues={editingChannel}
        >
          <Form.Item
            name="channelId"
            label="频道 ID"
            rules={[{ required: true, message: '请输入频道 ID' }]}
          >
            <Input placeholder="如：UCxxxxxx" />
          </Form.Item>
          <Form.Item
            name="channelName"
            label="频道名称"
            rules={[{ required: true, message: '请输入频道名称' }]}
          >
            <Input placeholder="如：我的频道" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Video Add Modal */}
      <Modal
        title="添加视频"
        open={videoModalOpen}
        onOk={handleSaveVideo}
        onCancel={() => { setVideoModalOpen(false); videoForm.resetFields(); }}
        confirmLoading={videoSaving}
        okText="添加"
        cancelText="取消"
        destroyOnClose
        width={520}
      >
        <Form
          form={videoForm}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="url"
            label="视频URL"
            rules={[
              { required: true, message: '请输入视频 URL' },
              { type: 'url', message: '请输入有效的 URL' },
            ]}
          >
            <Input placeholder="https://www.youtube.com/watch?v=..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default YouTube;