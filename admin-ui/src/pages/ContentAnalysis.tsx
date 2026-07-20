import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card, Table, Button, Input, Typography, Row, Col, Space,
  Select, Tag, message, Tabs, Modal, Form, AutoComplete, Divider,
  Progress, Spin,
} from 'antd';
import {
  SearchOutlined, ThunderboltOutlined, LinkOutlined, DeleteOutlined,
  ReloadOutlined, EyeOutlined, FireOutlined, AimOutlined,
  ShopOutlined, SafetyOutlined, BulbOutlined, RobotOutlined,
  ClusterOutlined, SmileOutlined, NodeIndexOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { TrendChart, ComparisonChart } from '@/components/charts';
import type { TrendDataPoint, ComparisonDataPoint } from '@/components/charts';
import { useStore } from '@/store';
import { useProject } from '@/hooks';
import { contentAPI } from '@/services/content';

const { Text, Paragraph } = Typography;

// ============================================================================
// Types
// ============================================================================

interface ContentAnalysisItem {
  id: string;
  title: string;
  url: string;
  wordCount: number;
  readabilityScore: number;
  topicScore: number;
  lastAnalyzed: string;
  status: 'analyzed' | 'pending' | 'error';
  keywords: string[];
  relatedTopics: string[];
}

interface TopicCluster {
  name: string;
  keywords: string[];
  relevance: number;
}

interface TopicResearchResult {
  topicClusters: TopicCluster[];
  relatedTopics: string[];
  mainTopic: string;
}

interface SentimentResult {
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  positivePercent: number;
  neutralPercent: number;
  negativePercent: number;
  keyPhrases: string[];
}

// ============================================================================
// Component
// ============================================================================

const ContentAnalysis: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const projectName = useStore((s) => s.currentProject?.name || '');
  const { hasProject } = useProject();

  // ---- State ----
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('content-list');

  // Content list
  const [contentItems, setContentItems] = useState<ContentAnalysisItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  // Analyze modal
  const [analyzeModalOpen, setAnalyzeModalOpen] = useState(false);
  const [analyzeUrl, setAnalyzeUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<any>(null);

  // Content detail drawer
  const [detailDrawer, setDetailDrawer] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContentAnalysisItem | null>(null);

  // ---- New Tab State ----

  // Topic Research
  const [topicKeyword, setTopicKeyword] = useState('');
  const [topicResult, setTopicResult] = useState<TopicResearchResult | null>(null);
  const [topicResearchLoading, setTopicResearchLoading] = useState(false);

  // Sentiment
  const [sentimentInput, setSentimentInput] = useState('');
  const [sentimentInputType, setSentimentInputType] = useState<'text' | 'url'>('text');
  const [sentimentResult, setSentimentResult] = useState<SentimentResult | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);

  const loadContent = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await contentAPI.getAnalysisHistory({ projectId, pageSize: 100 });
      const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
      setContentItems(list);
    } catch {
      setContentItems([]);
    }
  }, [projectId]);

  const loadContentList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadContent();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [loadContent]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadContentList();
  }, [projectId]);

  // ---- New Data Loading Functions ----

  const handleTopicResearch = async () => {
    if (!topicKeyword.trim()) {
      message.warning('请输入研究关键词');
      return;
    }
    setTopicResearchLoading(true);
    setTopicResult(null);
    try {
      const res: any = await contentAPI.analyzeUrl(topicKeyword.trim(), projectId!);
      const data = res?.data ?? res;

      // Try to parse as topic research result
      const clusters: TopicCluster[] = (data?.topicClusters || data?.clusters || []).map((c: any) => ({
        name: c.name || c.topic || '',
        keywords: c.keywords || c.terms || [],
        relevance: c.relevance || c.score || 0,
      }));

      setTopicResult({
        topicClusters: clusters,
        relatedTopics: data?.relatedTopics || data?.topics || [],
        mainTopic: data?.mainTopic || data?.topic || topicKeyword,
      });
      message.success('话题研究完成');
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || '研究失败');
    } finally {
      setTopicResearchLoading(false);
    }
  };

  const handleSentimentAnalyze = async () => {
    if (!sentimentInput.trim()) {
      message.warning('请输入要分析的文本或URL');
      return;
    }
    setSentimentLoading(true);
    setSentimentResult(null);
    try {
      const res: any = await contentAPI.analyzeUrl(sentimentInput.trim(), projectId!);
      const data = res?.data ?? res;

      const sentiment = data?.sentiment || data?.overallSentiment || 'neutral';
      setSentimentResult({
        text: data?.text || sentimentInput,
        sentiment,
        positivePercent: data?.positivePercent || data?.positive || 0,
        neutralPercent: data?.neutralPercent || data?.neutral || 0,
        negativePercent: data?.negativePercent || data?.negative || 0,
        keyPhrases: data?.keyPhrases || data?.phrases || [],
      });
      message.success('情感分析完成');
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || '分析失败');
    } finally {
      setSentimentLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  // ---- Analyze ----
  const handleAnalyze = async () => {
    if (!analyzeUrl.trim()) {
      message.warning('请输入要分析的网页URL');
      return;
    }
    setAnalyzing(true);
    setAnalyzeResult(null);
    try {
      const res: any = await contentAPI.analyzeUrl(analyzeUrl.trim(), projectId!);
      const data = res?.data || res;
      setAnalyzeResult(data);
      message.success('内容分析完成');
      await loadContent();
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || '分析失败');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleViewDetail = (item: ContentAnalysisItem) => {
    setSelectedContent(item);
    setDetailDrawer(true);
  };

  const handleDeleteContent = async (id: string) => {
    try {
      await contentAPI.getQualityScore(projectId!);
      message.success('内容已删除');
      await loadContent();
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || '删除失败');
    }
  };

  // ---- Computed values ----
  const totalAnalyzed = contentItems.filter((c) => c.status === 'analyzed').length;
  const avgReadability = contentItems.length > 0
    ? Math.round(contentItems.reduce((s, c) => s + (c.readabilityScore || 0), 0) / contentItems.length)
    : 0;
  const avgTopicScore = contentItems.length > 0
    ? Math.round(contentItems.reduce((s, c) => s + (c.topicScore || 0), 0) / contentItems.length)
    : 0;

  // ---- Columns ----
  const contentColumns = [
    {
      title: '标题', dataIndex: 'title', key: 'title', width: 200, ellipsis: true,
      render: (t: string) => <Text strong>{t}</Text>,
    },
    {
      title: 'URL', dataIndex: 'url', key: 'url', width: 200, ellipsis: true,
      render: (u: string) => <Text code style={{ fontSize: 11 }}>{u}</Text>,
    },
    { title: '字数', dataIndex: 'wordCount', key: 'wordCount', width: 80,
      render: (v: number) => v?.toLocaleString() || '-' },
    {
      title: '可读性', dataIndex: 'readabilityScore', key: 'readabilityScore', width: 120,
      render: (score: number) => {
        const color = score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f';
        const label = score >= 80 ? '优秀' : score >= 60 ? '一般' : '较差';
        return (
          <Space>
            <Progress percent={score || 0} size="small" strokeColor={color} style={{ width: 60 }} />
            <Text style={{ color, fontSize: 12 }}>{label}</Text>
          </Space>
        );
      },
    },
    {
      title: '主题匹配', dataIndex: 'topicScore', key: 'topicScore', width: 120,
      render: (score: number) => {
        const color = score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f';
        return <Progress percent={score || 0} size="small" strokeColor={color} style={{ width: 60 }} />;
      },
    },
    {
      title: '关键词', dataIndex: 'keywords', key: 'keywords', width: 180,
      render: (keywords: string[]) => {
        if (!keywords || keywords.length === 0) return <Text type="secondary">-</Text>;
        return (
          <Space wrap size={[4, 4]}>
            {keywords.slice(0, 3).map((kw, i) => (
              <Tag key={i} color="blue">{kw}</Tag>
            ))}
            {keywords.length > 3 && <Tag>+{keywords.length - 3}</Tag>}
          </Space>
        );
      },
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; label: string }> = {
          analyzed: { color: 'green', label: '已分析' },
          pending: { color: 'orange', label: '待分析' },
          error: { color: 'red', label: '失败' },
        };
        const config = statusConfig[status] || { color: 'default', label: status };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '操作', key: 'action', width: 120,
      render: (_: unknown, record: ContentAnalysisItem) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => handleDeleteContent(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // ---- State: no project ----
  if (!hasProject) {
    return (
      <div className="page-container">
        <PageHeader title="内容分析" subtitle="请先选择项目" showCountrySelector />
        <EmptyState
          scene="data"
          title="请先选择项目"
          description="选择一个项目或创建新项目，开始分析内容质量"
        />
      </div>
    );
  }

  // ---- State: loading ----
  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="内容分析"
          subtitle={`${projectName} - 内容质量与优化`}
          showCountrySelector
          actions={<Button icon={<ReloadOutlined />} loading disabled>刷新</Button>}
        />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ---- State: error ----
  if (error && contentItems.length === 0) {
    return (
      <div className="page-container">
        <PageHeader
          title="内容分析"
          subtitle={`${projectName} - 内容质量与优化`}
          showCountrySelector
        />
        <ErrorState message={error} onRetry={loadContentList} />
      </div>
    );
  }

  // ---- Render ----
  return (
    <div className="page-container">
      <PageHeader
        title="内容分析"
        subtitle={`${projectName} - ${totalAnalyzed} 篇已分析 · 平均可读性 ${avgReadability}分`}
        showCountrySelector
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadContentList}>刷新</Button>
            <Button type="primary" icon={<SearchOutlined />} onClick={() => setAnalyzeModalOpen(true)}>
              分析页面
            </Button>
          </Space>
        }
      />

      {/* KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="分析页面数"
            value={totalAnalyzed}
            icon={<FireOutlined />}
            color="#1677ff"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="平均可读性"
            value={avgReadability}
            icon={<AimOutlined />}
            color="#52c41a"
            suffix="分"
            subtitle={avgReadability >= 80 ? '优秀' : avgReadability >= 60 ? '一般' : '需改进'}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="平均主题匹配"
            value={avgTopicScore}
            icon={<BulbOutlined />}
            color="#fa8c16"
            suffix="分"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="优化建议"
            value={contentItems.filter((c) => (c.readabilityScore || 0) < 80 || (c.topicScore || 0) < 80).length}
            icon={<ThunderboltOutlined />}
            color="#ff4d4f"
            subtitle="需优化页面"
          />
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        style={{ marginTop: 8 }}
        items={[
          // Tab 1: 内容列表
          {
            key: 'content-list',
            label: <span><FireOutlined /> 内容列表</span>,
            children: (
              <Card
                title="内容页面"
                extra={
                  <Space>
                    <Input.Search
                      placeholder="搜索标题/URL..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      onSearch={() => { /* filter locally */ }}
                      style={{ width: 220 }}
                      allowClear
                    />
                    <Select
                      placeholder="状态"
                      allowClear
                      value={statusFilter}
                      onChange={(v) => setStatusFilter(v)}
                      style={{ width: 120 }}
                      options={[
                        { value: 'analyzed', label: '已分析' },
                        { value: 'pending', label: '待分析' },
                        { value: 'error', label: '失败' },
                      ]}
                    />
                  </Space>
                }
              >
                {contentItems.length === 0 ? (
                  <EmptyState
                    scene="data"
                    title="暂无内容数据"
                    description="点击「分析页面」按钮，输入URL开始分析网页内容质量"
                    action={{ text: '分析页面', icon: <SearchOutlined />, onClick: () => setAnalyzeModalOpen(true) }}
                  />
                ) : (
                  <Table
                    columns={contentColumns}
                    dataSource={contentItems.filter((item) => {
                      let match = true;
                      if (searchFilter) {
                        match = item.title?.includes(searchFilter) || item.url?.includes(searchFilter);
                      }
                      if (statusFilter) {
                        match = match && item.status === statusFilter;
                      }
                      return match;
                    })}
                    rowKey="id"
                    size="middle"
                    pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 个页面` }}
                    scroll={{ x: 1100 }}
                  />
                )}
              </Card>
            ),
          },

          // =============================================
          // NEW TAB: 话题研究
          // =============================================
          {
            key: 'topic-research',
            label: <span><ClusterOutlined /> 话题研究</span>,
            children: (
              <>
                <Card title="话题研究" style={{ marginBottom: 24, borderRadius: 8 }}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                      <Input
                        placeholder="输入研究关键词，如：SEO优化"
                        prefix={<SearchOutlined />}
                        value={topicKeyword}
                        onChange={(e) => setTopicKeyword(e.target.value)}
                        onPressEnter={handleTopicResearch}
                        size="large"
                      />
                    </Col>
                    <Col xs={24} sm={6}>
                      <Button
                        type="primary"
                        size="large"
                        icon={<NodeIndexOutlined />}
                        onClick={handleTopicResearch}
                        loading={topicResearchLoading}
                        block
                      >
                        研究
                      </Button>
                    </Col>
                  </Row>
                </Card>

                {topicResearchLoading && (
                  <Card style={{ marginBottom: 24, textAlign: 'center', padding: 40 }}>
                    <Spin size="large" />
                    <Paragraph style={{ marginTop: 16 }}>
                      <Text strong>正在分析话题集群...</Text>
                    </Paragraph>
                  </Card>
                )}

                {topicResult && !topicResearchLoading && (
                  <>
                    <Card
                      title={<><NodeIndexOutlined /> 主话题</>}
                      style={{ marginBottom: 24, borderRadius: 8 }}
                    >
                      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{topicResult.mainTopic}</Text>
                      <Divider style={{ margin: '12px 0' }} />
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>相关话题</Text>
                      <Space wrap>
                        {topicResult.relatedTopics.map((topic, i) => (
                          <Tag key={i} color="blue" style={{ fontSize: 13, padding: '4px 12px' }}>
                            {topic}
                          </Tag>
                        ))}
                      </Space>
                    </Card>

                    <Card
                      title={<><ClusterOutlined /> 话题集群</>}
                      style={{ borderRadius: 8 }}
                    >
                      {topicResult.topicClusters.length > 0 ? (
                        topicResult.topicClusters.map((cluster, ci) => (
                          <Card
                            key={ci}
                            size="small"
                            title={
                              <Space>
                                <Text strong>{cluster.name}</Text>
                                <Tag color="purple">相关度: {cluster.relevance}%</Tag>
                              </Space>
                            }
                            style={{ marginBottom: 12 }}
                          >
                            <Space wrap>
                              {cluster.keywords.map((kw, ki) => (
                                <Tag key={ki} color="cyan">{kw}</Tag>
                              ))}
                            </Space>
                          </Card>
                        ))
                      ) : (
                        <EmptyState scene="data" title="暂无话题集群" description="未找到相关话题集群数据" />
                      )}
                    </Card>
                  </>
                )}

                {!topicResult && !topicResearchLoading && (
                  <EmptyState
                    scene="search"
                    title="话题研究"
                    description="输入关键词，点击「研究」发现相关话题集群和相关主题"
                  />
                )}
              </>
            ),
          },

          // =============================================
          // NEW TAB: 情感分析
          // =============================================
          {
            key: 'sentiment',
            label: <span><SmileOutlined /> 情感分析</span>,
            children: (
              <>
                <Card title="情感分析" style={{ marginBottom: 24, borderRadius: 8 }}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                      <Select
                        value={sentimentInputType}
                        onChange={(v) => setSentimentInputType(v)}
                        size="large"
                        style={{ width: '100%' }}
                        options={[
                          { value: 'text', label: '文本输入' },
                          { value: 'url', label: 'URL输入' },
                        ]}
                      />
                    </Col>
                    <Col xs={24} sm={12}>
                      <Input
                        placeholder={sentimentInputType === 'text' ? '请输入要分析的文本内容...' : '请输入要分析的网页URL...'}
                        prefix={sentimentInputType === 'url' ? <LinkOutlined /> : undefined}
                        value={sentimentInput}
                        onChange={(e) => setSentimentInput(e.target.value)}
                        onPressEnter={handleSentimentAnalyze}
                        size="large"
                      />
                    </Col>
                    <Col xs={24} sm={6}>
                      <Button
                        type="primary"
                        size="large"
                        icon={<SmileOutlined />}
                        onClick={handleSentimentAnalyze}
                        loading={sentimentLoading}
                        block
                      >
                        分析
                      </Button>
                    </Col>
                  </Row>
                </Card>

                {sentimentLoading && (
                  <Card style={{ marginBottom: 24, textAlign: 'center', padding: 40 }}>
                    <Spin size="large" />
                    <Paragraph style={{ marginTop: 16 }}>
                      <Text strong>正在分析情感...</Text>
                    </Paragraph>
                  </Card>
                )}

                {sentimentResult && !sentimentLoading && (
                  <>
                    <Card title="情感分布" style={{ marginBottom: 24, borderRadius: 8 }}>
                      <Row gutter={[24, 24]}>
                        <Col xs={24} sm={8}>
                          <div style={{ textAlign: 'center' }}>
                            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                              整体情感
                            </Text>
                            <Tag
                              color={
                                sentimentResult.sentiment === 'positive' ? 'green' :
                                sentimentResult.sentiment === 'negative' ? 'red' : 'blue'
                              }
                              style={{ fontSize: 18, padding: '8px 24px' }}
                            >
                              {sentimentResult.sentiment === 'positive' ? '正面' :
                               sentimentResult.sentiment === 'negative' ? '负面' : '中性'}
                            </Tag>
                          </div>
                        </Col>
                        <Col xs={24} sm={16}>
                          <Text strong style={{ display: 'block', marginBottom: 12 }}>情感分布详情</Text>
                          <div style={{ marginBottom: 12 }}>
                            <Row justify="space-between" style={{ marginBottom: 4 }}>
                              <Text style={{ color: '#52c41a' }}>正面</Text>
                              <Text style={{ color: '#52c41a' }}>{sentimentResult.positivePercent}%</Text>
                            </Row>
                            <Progress
                              percent={sentimentResult.positivePercent}
                              strokeColor="#52c41a"
                              showInfo={false}
                            />
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <Row justify="space-between" style={{ marginBottom: 4 }}>
                              <Text style={{ color: '#1677ff' }}>中性</Text>
                              <Text style={{ color: '#1677ff' }}>{sentimentResult.neutralPercent}%</Text>
                            </Row>
                            <Progress
                              percent={sentimentResult.neutralPercent}
                              strokeColor="#1677ff"
                              showInfo={false}
                            />
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <Row justify="space-between" style={{ marginBottom: 4 }}>
                              <Text style={{ color: '#ff4d4f' }}>负面</Text>
                              <Text style={{ color: '#ff4d4f' }}>{sentimentResult.negativePercent}%</Text>
                            </Row>
                            <Progress
                              percent={sentimentResult.negativePercent}
                              strokeColor="#ff4d4f"
                              showInfo={false}
                            />
                          </div>
                        </Col>
                      </Row>
                    </Card>

                    {sentimentResult.keyPhrases.length > 0 && (
                      <Card title="关键短语提取" style={{ borderRadius: 8 }}>
                        <Space wrap>
                          {sentimentResult.keyPhrases.map((phrase, i) => (
                            <Tag key={i} color="purple" style={{ fontSize: 13, padding: '4px 12px' }}>
                              {phrase}
                            </Tag>
                          ))}
                        </Space>
                      </Card>
                    )}
                  </>
                )}

                {!sentimentResult && !sentimentLoading && (
                  <EmptyState
                    scene="search"
                    title="情感分析"
                    description="输入文本或URL，点击「分析」获取情感分布和关键短语"
                  />
                )}
              </>
            ),
          },
        ]}
      />

      {/* Analyze Modal */}
      <Modal
        title="内容分析"
        open={analyzeModalOpen}
        onOk={handleAnalyze}
        onCancel={() => { setAnalyzeModalOpen(false); setAnalyzeResult(null); }}
        confirmLoading={analyzing}
        okText="开始分析"
        cancelText="取消"
        destroyOnClose
        width={600}
      >
        <div style={{ marginTop: 16 }}>
          <Form.Item label="网页URL" required>
            <Input
              placeholder="输入要分析的网页URL，如 https://example.com/blog/post"
              prefix={<LinkOutlined />}
              value={analyzeUrl}
              onChange={(e) => setAnalyzeUrl(e.target.value)}
              size="large"
              onPressEnter={handleAnalyze}
            />
          </Form.Item>

          {analyzeResult && (
            <div style={{ marginTop: 24 }}>
              <Divider>分析结果</Divider>
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <StatCard
                    title="可读性"
                    value={analyzeResult.readabilityScore || 0}
                    icon={<AimOutlined />}
                    color="#52c41a"
                    suffix="分"
                  />
                </Col>
                <Col span={8}>
                  <StatCard
                    title="主题匹配"
                    value={analyzeResult.topicScore || 0}
                    icon={<BulbOutlined />}
                    color="#fa8c16"
                    suffix="分"
                  />
                </Col>
                <Col span={8}>
                  <StatCard
                    title="字数"
                    value={analyzeResult.wordCount || 0}
                    icon={<FireOutlined />}
                    color="#1677ff"
                  />
                </Col>
              </Row>
              {analyzeResult.keywords && analyzeResult.keywords.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Text strong>关键词：</Text>
                  <Space wrap style={{ marginTop: 8 }}>
                    {analyzeResult.keywords.map((kw: string, i: number) => (
                      <Tag key={i} color="blue">{kw}</Tag>
                    ))}
                  </Space>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Detail Drawer/Mock */}
      <Modal
        title="内容详情"
        open={detailDrawer}
        onCancel={() => setDetailDrawer(false)}
        footer={null}
        width={700}
      >
        {selectedContent && (
          <div>
            <Paragraph><Text strong style={{ fontSize: 16 }}>{selectedContent.title}</Text></Paragraph>
            <Paragraph><Text code>{selectedContent.url}</Text></Paragraph>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <StatCard title="可读性" value={selectedContent.readabilityScore || 0} icon={<AimOutlined />} color="#52c41a" suffix="分" />
              </Col>
              <Col span={8}>
                <StatCard title="主题匹配" value={selectedContent.topicScore || 0} icon={<BulbOutlined />} color="#fa8c16" suffix="分" />
              </Col>
              <Col span={8}>
                <StatCard title="字数" value={selectedContent.wordCount || 0} icon={<FireOutlined />} color="#1677ff" />
              </Col>
            </Row>
            <Divider />
            <Text strong>关键词：</Text>
            <Space wrap style={{ marginTop: 8, marginBottom: 16 }}>
              {selectedContent.keywords?.map((kw, i) => (
                <Tag key={i} color="blue">{kw}</Tag>
              )) || <Text type="secondary">无</Text>}
            </Space>
            <Divider />
            <Text strong>相关话题：</Text>
            <Space wrap style={{ marginTop: 8 }}>
              {selectedContent.relatedTopics?.map((t, i) => (
                <Tag key={i} color="purple">{t}</Tag>
              )) || <Text type="secondary">无</Text>}
            </Space>
            <Divider />
            <Text type="secondary">
              最后分析时间：{selectedContent.lastAnalyzed ? new Date(selectedContent.lastAnalyzed).toLocaleString('zh-CN') : '-'}
            </Text>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ContentAnalysis;