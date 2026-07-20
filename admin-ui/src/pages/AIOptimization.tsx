import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Button, Tag, Typography, Space, Input, Tabs,
  Form, Select, List, message, Divider, Collapse, Descriptions,
} from 'antd';
import {
  ReloadOutlined, ThunderboltOutlined, RobotOutlined,
  BulbOutlined, EditOutlined, ExperimentOutlined,
  PlusOutlined, CheckCircleOutlined, ArrowRightOutlined,
  FileTextOutlined, RiseOutlined, SettingOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { useStore } from '@/store';
import { useProject } from '@/hooks';
import { aiAPI } from '@/services/ai';

const { Text, Paragraph, Title } = Typography;
const { TextArea } = Input;

// ============================================================================
// Types
// ============================================================================

interface AIRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: string;
  estimatedTrafficIncrease: string;
  steps: string[];
}

interface AISummary {
  total: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  confidence: number;
}

interface PageData {
  recommendations: AIRecommendation[];
  summary: AISummary | null;
}

const INITIAL_DATA: PageData = {
  recommendations: [],
  summary: null,
};

// ============================================================================
// Helpers
// ============================================================================

const priorityConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  high: { color: '#ff4d4f', label: '高优先级', icon: <ThunderboltOutlined /> },
  medium: { color: '#faad14', label: '中优先级', icon: <BulbOutlined /> },
  low: { color: '#1677ff', label: '低优先级', icon: <CheckCircleOutlined /> },
};

const categoryColors: Record<string, string> = {
  '内容优化': 'blue',
  '速度优化': 'purple',
  '外链建设': 'green',
  '关键词优化': 'orange',
  '技术优化': 'cyan',
  '移动端优化': 'magenta',
  '结构优化': 'geekblue',
  '元数据优化': 'lime',
};

const CONTENT_TYPES = [
  { value: 'blog', label: '博客文章' },
  { value: 'article', label: '文章' },
  { value: 'meta', label: 'Meta 标签' },
  { value: 'product', label: '产品描述' },
  { value: 'landing', label: '落地页' },
];

// ============================================================================
// Component
// ============================================================================

const AIOptimization: React.FC = () => {
  const navigate = useNavigate();
  const { project, projectId, hasProject } = useProject();
  const { projects } = useStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PageData>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState('suggestions');
  const [analyzing, setAnalyzing] = useState(false);

  // Analysis input
  const [inputUrl, setInputUrl] = useState('');

  // Generate Content form
  const [genType, setGenType] = useState('blog');
  const [genKeywords, setGenKeywords] = useState('');
  const [genPrompt, setGenPrompt] = useState('');
  const [genLength, setGenLength] = useState('medium');
  const [genResult, setGenResult] = useState('');
  const [generating, setGenerating] = useState(false);

  // Optimize Content form
  const [optContent, setOptContent] = useState('');
  const [optKeywords, setOptKeywords] = useState('');
  const [optBefore, setOptBefore] = useState('');
  const [optAfter, setOptAfter] = useState('');
  const [optimizing, setOptimizing] = useState(false);

  const loadData = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const res: any = await aiAPI.optimize(projectId, {});
      const result = res?.data ?? res;
      const recommendations = result.recommendations || [];
      const summary = result.summary || {
        total: recommendations.length,
        highPriority: recommendations.filter((r: any) => r.priority === 'high').length,
        mediumPriority: recommendations.filter((r: any) => r.priority === 'medium').length,
        lowPriority: recommendations.filter((r: any) => r.priority === 'low').length,
        confidence: 0,
      };

      setData({ recommendations, summary });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载AI优化建议失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAnalyze = async () => {
    if (!projectId) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res: any = await aiAPI.optimize(projectId, { url: inputUrl || undefined });
      const result = res?.data ?? res;
      const recommendations = result.recommendations || [];
      const summary = result.summary || {
        total: recommendations.length,
        highPriority: recommendations.filter((r: any) => r.priority === 'high').length,
        mediumPriority: recommendations.filter((r: any) => r.priority === 'medium').length,
        lowPriority: recommendations.filter((r: any) => r.priority === 'low').length,
        confidence: 0,
      };
      setData({ recommendations, summary });
      message.success(`AI 分析完成，生成 ${recommendations.length} 条优化建议`);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'AI分析失败';
      message.error(msg);
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!genKeywords.trim()) {
      message.warning('请输入目标关键词');
      return;
    }
    setGenerating(true);
    try {
      const res: any = await aiAPI.optimize(projectId, {
        content: genPrompt || undefined,
        category: genType,
      });
      const result = res?.data ?? res;
      const generated = result.content || result.recommendations?.[0]?.description || 'AI 内容生成完成，请查看结果。';
      setGenResult(typeof generated === 'string' ? generated : JSON.stringify(generated, null, 2));
      message.success('内容生成完成');
    } catch (err: any) {
      message.error(err?.message || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleOptimizeContent = async () => {
    if (!optContent.trim()) {
      message.warning('请粘贴需要优化的内容');
      return;
    }
    setOptimizing(true);
    try {
      setOptBefore(optContent);
      const res: any = await aiAPI.optimize(projectId, { content: optContent });
      const result = res?.data ?? res;
      const optimized = result.optimized || result.recommendations?.[0]?.description ||
        `优化建议已生成。原始内容长度: ${optContent.length} 字符。`;
      setOptAfter(typeof optimized === 'string' ? optimized : JSON.stringify(optimized, null, 2));
      message.success('内容优化完成');
    } catch (err: any) {
      message.error(err?.message || '优化失败');
    } finally {
      setOptimizing(false);
    }
  };

  // ==========================================================================
  // No project selected
  // ==========================================================================
  if (!hasProject) {
    return (
      <div className="page-container">
        <PageHeader
          title="AI 优化"
          subtitle="AI 驱动的 SEO 优化建议、内容生成与内容优化"
          showCountrySelector
        />
        <EmptyState
          scene="data"
          title="请先选择项目"
          description="选择一个项目或创建新项目，开始 AI 优化"
          action={{
            text: projects.length > 0 ? '选择项目' : '创建项目',
            onClick: () => navigate('/projects'),
            icon: <PlusOutlined />,
          }}
        />
      </div>
    );
  }

  // ==========================================================================
  // Error state
  // ==========================================================================
  if (error && !loading && data.recommendations.length === 0) {
    return (
      <div className="page-container">
        <PageHeader
          title="AI 优化"
          subtitle={`项目: ${project?.name || ''}`}
          showCountrySelector
        />
        <ErrorState
          message={error}
          onRetry={loadData}
        />
      </div>
    );
  }

  // ==========================================================================
  // Loading state
  // ==========================================================================
  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="AI 优化"
          subtitle={`项目: ${project?.name || ''}`}
          showCountrySelector
          actions={
            <Button icon={<ReloadOutlined />} loading disabled>刷新</Button>
          }
        />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ==========================================================================
  // Computed values
  // ==========================================================================
  const { recommendations, summary } = data;
  const highCount = summary?.highPriority ?? recommendations.filter((r) => r.priority === 'high').length;
  const mediumCount = summary?.mediumPriority ?? recommendations.filter((r) => r.priority === 'medium').length;
  const lowCount = summary?.lowPriority ?? recommendations.filter((r) => r.priority === 'low').length;
  const confidence = summary?.confidence ?? 0;

  // Recommendation table columns
  const suggestionColumns = [
    {
      title: '优先级', dataIndex: 'priority', key: 'priority', width: 100,
      render: (p: string) => {
        const cfg = priorityConfig[p] || { color: 'default', label: p, icon: null };
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>;
      },
    },
    {
      title: '类型', dataIndex: 'category', key: 'category', width: 100,
      render: (cat: string) => (
        <Tag color={categoryColors[cat] || 'default'}>{cat}</Tag>
      ),
    },
    {
      title: '标题', dataIndex: 'title', key: 'title', width: 220,
      render: (t: string) => <Text strong>{t}</Text>,
    },
    {
      title: '描述', dataIndex: 'description', key: 'description', ellipsis: true,
      render: (d: string) => <Text type="secondary">{d}</Text>,
    },
    {
      title: '影响', dataIndex: 'impact', key: 'impact', width: 80,
      render: (v: string) => v ? <Tag color={v === '高' ? 'red' : 'blue'}>{v}</Tag> : '-',
    },
    {
      title: '预估流量增长', dataIndex: 'estimatedTrafficIncrease', key: 'estimatedTrafficIncrease', width: 120,
      render: (v: string) => v ? <Text style={{ color: '#52c41a' }}>{v}</Text> : '-',
    },
  ];

  // Collapse items for list view
  const collapseItems = recommendations.map((rec) => ({
    key: rec.id,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', flexWrap: 'wrap' }}>
        <Tag color={priorityConfig[rec.priority].color} icon={priorityConfig[rec.priority].icon}>
          {priorityConfig[rec.priority].label}
        </Tag>
        <Tag color={categoryColors[rec.category] || 'default'}>{rec.category}</Tag>
        <Text strong>{rec.title}</Text>
        <div style={{ flex: 1 }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          预期流量增长: <Text style={{ color: '#52c41a' }}>{rec.estimatedTrafficIncrease}</Text>
        </Text>
      </div>
    ),
    children: (
      <div style={{ padding: '8px 0' }}>
        <Paragraph>{rec.description}</Paragraph>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="影响程度">{rec.impact}</Descriptions.Item>
            </Descriptions>
          </Col>
          <Col span={8}>
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="实施难度">{rec.effort}</Descriptions.Item>
            </Descriptions>
          </Col>
          <Col span={8}>
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="预估流量增长">{rec.estimatedTrafficIncrease}</Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
        <div>
          <Text strong>实施步骤：</Text>
          <ol style={{ marginTop: 8, paddingLeft: 20 }}>
            {rec.steps.map((step, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                <Text>{step}</Text>
              </li>
            ))}
          </ol>
        </div>
      </div>
    ),
  }));

  const tabItems = [
    {
      key: 'suggestions',
      label: <span><BulbOutlined /> AI 建议</span>,
      children: (
        <>
          {/* Input card */}
          <Card style={{ marginBottom: 24, borderRadius: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>输入 URL 或内容，让 AI 分析并给出优化建议：</Text>
              <Input.Search
                placeholder="输入网站 URL，例如：https://example.com"
                enterButton={<><SearchOutlined /> 分析</>}
                size="large"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onSearch={handleAnalyze}
                loading={analyzing}
              />
            </Space>
          </Card>

          {/* Analyzing */}
          {analyzing && (
            <Card style={{ marginBottom: 24, borderColor: '#1677ff', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ padding: 40 }}>
                <Text strong style={{ fontSize: 16 }}>AI 正在分析您的网站数据...</Text>
                <br />
                <Text type="secondary">正在扫描页面、关键词、外链和竞品数据</Text>
              </div>
            </Card>
          )}

          {/* Recommendations list */}
          <Card
            title={`优化建议列表 (${recommendations.length})`}
            style={{ borderRadius: 8 }}
          >
            {recommendations.length > 0 ? (
              <Collapse
                items={collapseItems}
                defaultActiveKey={recommendations.filter((r) => r.priority === 'high').map((r) => r.id)}
                expandIconPosition="end"
                size="large"
              />
            ) : (
              <EmptyState
                scene="data"
                description="暂无优化建议，请点击「分析」按钮开始分析"
                action={{
                  text: 'AI 分析',
                  onClick: handleAnalyze,
                  icon: <ExperimentOutlined />,
                  loading: analyzing,
                }}
              />
            )}
          </Card>
        </>
      ),
    },
    {
      key: 'generate',
      label: <span><EditOutlined /> 生成内容</span>,
      children: (
        <Row gutter={[24, 24]}>
          <Col xs={24} md={10}>
            <Card title="AI 内容生成器" style={{ borderRadius: 8 }}>
              <Form layout="vertical">
                <Form.Item label="内容类型">
                  <Select
                    value={genType}
                    onChange={setGenType}
                    options={CONTENT_TYPES}
                  />
                </Form.Item>
                <Form.Item label="目标关键词">
                  <Input
                    placeholder="例如: SEO优化, 搜索引擎排名"
                    value={genKeywords}
                    onChange={(e) => setGenKeywords(e.target.value)}
                  />
                </Form.Item>
                <Form.Item label="生成提示（可选）">
                  <TextArea
                    placeholder="描述你想要的内容主题、风格或特定要求..."
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    rows={3}
                  />
                </Form.Item>
                <Form.Item label="内容长度">
                  <Select
                    value={genLength}
                    onChange={setGenLength}
                    options={[
                      { value: 'short', label: '短文 (300-500字)' },
                      { value: 'medium', label: '中等 (800-1200字)' },
                      { value: 'long', label: '长文 (1500-2500字)' },
                    ]}
                  />
                </Form.Item>
                <Button
                  type="primary"
                  icon={<RobotOutlined />}
                  onClick={handleGenerateContent}
                  loading={generating}
                  block
                  size="large"
                >
                  生成内容
                </Button>
              </Form>
            </Card>
          </Col>
          <Col xs={24} md={14}>
            <Card title="生成结果" style={{ borderRadius: 8 }}>
              {genResult ? (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  <Text>{genResult}</Text>
                </div>
              ) : (
                <EmptyState
                  scene="document"
                  description="设置参数并点击「生成内容」，AI 将为您创建高质量内容"
                />
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'optimize',
      label: <span><SettingOutlined /> 优化内容</span>,
      children: (
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card title="原始内容" style={{ borderRadius: 8 }}>
              <Form layout="vertical">
                <Form.Item label="粘贴需要优化的内容">
                  <TextArea
                    placeholder="粘贴您的文章、产品描述或任何文本内容..."
                    value={optContent}
                    onChange={(e) => setOptContent(e.target.value)}
                    rows={10}
                  />
                </Form.Item>
                <Form.Item label="目标关键词（可选）">
                  <Input
                    placeholder="例如: 最佳SEO工具, 网站优化"
                    value={optKeywords}
                    onChange={(e) => setOptKeywords(e.target.value)}
                  />
                </Form.Item>
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  onClick={handleOptimizeContent}
                  loading={optimizing}
                  block
                  size="large"
                >
                  优化内容
                </Button>
              </Form>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="优化结果" style={{ borderRadius: 8 }}>
              {optAfter ? (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  <Text>{optAfter}</Text>
                </div>
              ) : (
                <EmptyState
                  scene="document"
                  description="粘贴内容并点击「优化内容」，AI 将提供优化后的版本"
                />
              )}
            </Card>
          </Col>
          {optBefore && optAfter && (
            <Col span={24}>
              <Card title="优化前后对比" style={{ borderRadius: 8 }}>
                <Row gutter={[24, 24]}>
                  <Col xs={24} md={12}>
                    <Card title="优化前" size="small" style={{ background: '#fff7f7', borderRadius: 8 }}>
                      <Text style={{ whiteSpace: 'pre-wrap' }}>{optBefore.substring(0, 500)}{optBefore.length > 500 ? '...' : ''}</Text>
                      <Divider />
                      <Text type="secondary">字符数: {optBefore.length}</Text>
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card title="优化后" size="small" style={{ background: '#f6ffed', borderRadius: 8 }}>
                      <Text style={{ whiteSpace: 'pre-wrap' }}>{optAfter.substring(0, 500)}{optAfter.length > 500 ? '...' : ''}</Text>
                      <Divider />
                      <Text type="secondary">字符数: {optAfter.length}</Text>
                    </Card>
                  </Col>
                </Row>
              </Card>
            </Col>
          )}
        </Row>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="AI 优化"
        subtitle={`项目: ${project?.name || ''} (${project?.domain || ''})`}
        showCountrySelector
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
            <Button
              type="primary"
              icon={<ExperimentOutlined />}
              onClick={handleAnalyze}
              loading={analyzing}
            >
              AI 分析
            </Button>
          </Space>
        }
      />

      {/* KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="建议生成数"
            value={recommendations.length}
            icon={<BulbOutlined />}
            color="#faad14"
            subtitle={`${highCount} 个高优先级`}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="内容已生成"
            value={genResult ? 1 : 0}
            icon={<FileTextOutlined />}
            color="#1677ff"
            subtitle="AI 生成内容数"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="优化已应用"
            value={optAfter ? 1 : 0}
            icon={<SettingOutlined />}
            color="#52c41a"
            subtitle="AI 优化内容数"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="AI 置信度"
            value={`${confidence}%`}
            icon={<RobotOutlined />}
            color="#722ed1"
            subtitle="分析置信度"
          />
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="large"
        items={tabItems}
      />
    </div>
  );
};

export default AIOptimization;