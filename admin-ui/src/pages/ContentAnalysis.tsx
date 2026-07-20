import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Button, Tag, Typography, Space, Input, Tabs,
  Descriptions, List, Progress, message, Form, Select, Divider,
} from 'antd';
import {
  ReloadOutlined, SearchOutlined, ThunderboltOutlined, FileTextOutlined,
  ReadOutlined, StarOutlined, BulbOutlined, RobotOutlined,
  GlobalOutlined, LinkOutlined, PlusOutlined, CheckCircleOutlined,
  AimOutlined, EditOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { GaugeChart, ComparisonChart } from '@/components/charts';
import type { ComparisonDataPoint } from '@/components/charts';
import { useStore } from '@/store';
import { useProject } from '@/hooks';
import { contentAPI } from '@/services/content';

const { Text, Paragraph, Title } = Typography;

// ============================================================================
// Types
// ============================================================================

interface ContentAnalysisResult {
  id: string;
  url: string;
  qualityScore: number;
  readabilityScore: number;
  keywordDensity: { keyword: string; density: number; count: number }[];
  entityCoverage: { name: string; type: string; importance: number }[];
  structureScore: number;
  sentiment: { positive: number; negative: number; neutral: number };
  suggestions: { title: string; description: string; priority: 'high' | 'medium' | 'low' }[];
  analyzedAt: string;
}

interface QualityScore {
  overallScore: number;
  readabilityScore: number;
  structureScore: number;
  seoScore: number;
}

interface PageData {
  history: ContentAnalysisResult[];
  historyTotal: number;
  qualityScore: QualityScore | null;
  analysisResult: ContentAnalysisResult | null;
}

const INITIAL_DATA: PageData = {
  history: [],
  historyTotal: 0,
  qualityScore: null,
  analysisResult: null,
};

// ============================================================================
// Helpers
// ============================================================================

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#52c41a';
  if (score >= 60) return '#faad14';
  return '#ff4d4f';
};

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'high': return { color: '#ff4d4f', label: '高优' };
    case 'medium': return { color: '#faad14', label: '中优' };
    default: return { color: '#1677ff', label: '低优' };
  }
};

// ============================================================================
// Component
// ============================================================================

const ContentAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { project, projectId, hasProject } = useProject();
  const { projects } = useStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PageData>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState('analysis');

  const [analyzeUrl, setAnalyzeUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const loadData = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled([
        contentAPI.getAnalysisHistory({ projectId, page: historyPage, pageSize: 10 }),
        contentAPI.getQualityScore(projectId),
      ]);

      let history: ContentAnalysisResult[] = [];
      let historyTotal = 0;
      if (results[0].status === 'fulfilled') {
        const res = results[0].value as any;
        const d = res?.data ?? res;
        history = Array.isArray(d) ? d : (d?.data || d?.history || []);
        historyTotal = d?.total || d?.pagination?.total || history.length;
      }

      let qualityScore: QualityScore | null = null;
      if (results[1].status === 'fulfilled') {
        const res = results[1].value as any;
        const qs = res?.data ?? res;
        if (qs) {
          qualityScore = {
            overallScore: qs.overallScore || qs.qualityScore || 0,
            readabilityScore: qs.readabilityScore || 0,
            structureScore: qs.structureScore || 0,
            seoScore: qs.seoScore || 0,
          };
        }
      }

      const hasError = results.some((r) => r.status === 'rejected');
      if (hasError) {
        const firstErr = results.find((r) => r.status === 'rejected');
        if (firstErr && firstErr.status === 'rejected') {
          console.warn('Partial data load failed:', firstErr.reason);
        }
      }

      setData((prev) => ({ ...prev, history, historyTotal, qualityScore }));
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载内容分析数据失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, historyPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAnalyze = async () => {
    if (!analyzeUrl.trim()) {
      message.warning('请输入要分析的页面 URL');
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const res: any = await contentAPI.analyzeUrl(analyzeUrl.trim(), projectId || undefined);
      const result = res?.data ?? res;
      setData((prev) => ({ ...prev, analysisResult: result }));
      message.success('内容分析完成');
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '分析失败';
      setError(msg);
      message.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleHistoryPageChange = (p: number) => {
    setHistoryPage(p);
  };

  // ==========================================================================
  // No project selected
  // ==========================================================================
  if (!hasProject) {
    return (
      <div className="page-container">
        <PageHeader
          title="内容分析"
          subtitle="AI 驱动的页面内容质量分析与优化建议"
          showCountrySelector
        />
        <EmptyState
          scene="data"
          title="请先选择项目"
          description="选择一个项目或创建新项目，开始分析页面内容"
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
  if (error && !loading && !data.analysisResult && data.history.length === 0) {
    return (
      <div className="page-container">
        <PageHeader
          title="内容分析"
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
          title="内容分析"
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
  const { history, historyTotal, qualityScore, analysisResult } = data;
  const pagesAnalyzed = historyTotal;
  const avgContentScore = qualityScore?.overallScore || 0;
  const avgReadability = qualityScore?.readabilityScore || 0;
  const seoScore = qualityScore?.seoScore || 0;

  // SEO score vs readability comparison data
  const seoReadabilityComparison: ComparisonDataPoint[] = [];
  if (history.length > 0) {
    history.slice(0, 10).forEach((item) => {
      const shortUrl = item.url.replace(/^https?:\/\//, '').substring(0, 30);
      seoReadabilityComparison.push({
        name: shortUrl,
        value: item.qualityScore || 0,
      });
    });
  }

  // History table columns
  const historyColumns = [
    {
      title: 'URL', dataIndex: 'url', key: 'url', width: 280, ellipsis: true,
      render: (u: string) => <Text code style={{ fontSize: 11 }}>{u}</Text>,
    },
    {
      title: '质量评分', dataIndex: 'qualityScore', key: 'qualityScore', width: 130,
      render: (score: number) => (
        <Progress
          percent={score}
          size="small"
          strokeColor={getScoreColor(score)}
          format={() => `${score}分`}
        />
      ),
    },
    {
      title: '可读性', dataIndex: 'readabilityScore', key: 'readabilityScore', width: 100,
      render: (s: number) => <Tag color={s >= 70 ? 'green' : 'orange'}>{s || '-'}</Tag>,
    },
    {
      title: '结构分', dataIndex: 'structureScore', key: 'structureScore', width: 100,
      render: (s: number) => <Tag color={s >= 70 ? 'green' : 'orange'}>{s || '-'}</Tag>,
    },
    {
      title: '分析时间', dataIndex: 'analyzedAt', key: 'analyzedAt', width: 160,
      render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: unknown, record: ContentAnalysisResult) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            setAnalyzeUrl(record.url);
            setActiveTab('analysis');
          }}
        >
          分析
        </Button>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'analysis',
      label: <span><SearchOutlined /> 内容分析</span>,
      children: (
        <>
          {/* URL input */}
          <Card title={<><FileTextOutlined /> 页面内容分析</>} style={{ marginBottom: 24, borderRadius: 8 }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={18}>
                <Input.Search
                  placeholder="输入要分析的页面 URL，如 https://example.com/blog/seo-guide"
                  prefix={<LinkOutlined />}
                  value={analyzeUrl}
                  onChange={(e) => setAnalyzeUrl(e.target.value)}
                  onSearch={handleAnalyze}
                  enterButton={
                    <Button type="primary" icon={<ThunderboltOutlined />} loading={analyzing}>
                      开始分析
                    </Button>
                  }
                  size="large"
                  disabled={analyzing}
                />
              </Col>
              <Col xs={24} md={6}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  支持分析标题、描述、关键词密度、实体识别、AI 优化建议
                </Text>
              </Col>
            </Row>
          </Card>

          {/* Analyzing */}
          {analyzing && (
            <Card style={{ marginBottom: 24, borderColor: '#1677ff', borderRadius: 8 }}>
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Progress type="circle" percent={70} status="active" />
                <Paragraph style={{ marginTop: 16 }}>
                  <Text strong>AI 正在分析页面内容...</Text>
                </Paragraph>
              </div>
            </Card>
          )}

          {/* Analysis result */}
          {analysisResult && !analyzing && (
            <>
              <Card title="页面分析结果" style={{ marginBottom: 24, borderRadius: 8 }}>
                <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                  <Descriptions.Item label="URL">
                    <Text code>{analysisResult.url}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="分析时间">
                    {analysisResult.analyzedAt ? new Date(analysisResult.analyzedAt).toLocaleString('zh-CN') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="质量评分">
                    <Tag color={getScoreColor(analysisResult.qualityScore)}>
                      {analysisResult.qualityScore}/100
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="可读性评分">
                    <Tag color={getScoreColor(analysisResult.readabilityScore)}>
                      {analysisResult.readabilityScore}/100
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="结构完整性">
                    <Tag color={getScoreColor(analysisResult.structureScore)}>
                      {analysisResult.structureScore}/100
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="关键词密度项">
                    {analysisResult.keywordDensity?.length || 0} 个
                  </Descriptions.Item>
                  <Descriptions.Item label="实体覆盖">
                    {analysisResult.entityCoverage?.length || 0} 个
                  </Descriptions.Item>
                  <Descriptions.Item label="情感分析">
                    <Space>
                      <Tag color="green">正面 {analysisResult.sentiment?.positive || 0}%</Tag>
                      <Tag color="blue">中性 {analysisResult.sentiment?.neutral || 0}%</Tag>
                      <Tag color="red">负面 {analysisResult.sentiment?.negative || 0}%</Tag>
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* Suggestions */}
              {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                <Card title={<><BulbOutlined /> AI 优化建议</>} style={{ borderRadius: 8 }}>
                  <List
                    dataSource={analysisResult.suggestions}
                    renderItem={(item) => {
                      const cfg = getPriorityConfig(item.priority);
                      return (
                        <List.Item>
                          <List.Item.Meta
                            avatar={<Tag color={cfg.color}>{cfg.label}</Tag>}
                            title={item.title}
                            description={item.description}
                          />
                        </List.Item>
                      );
                    }}
                  />
                </Card>
              )}
            </>
          )}

          {!analysisResult && !analyzing && (
            <EmptyState
              scene="search"
              description="输入页面 URL，点击「开始分析」获取 AI 内容分析报告"
            />
          )}
        </>
      ),
    },
    {
      key: 'suggestions',
      label: <span><BulbOutlined /> 优化建议</span>,
      children: (
        <Card title="历史优化建议汇总" style={{ borderRadius: 8 }}>
          {history.length > 0 ? (
            <List
              dataSource={history
                .filter((h) => h.suggestions && h.suggestions.length > 0)
                .flatMap((h) =>
                  h.suggestions.map((s) => ({ ...s, url: h.url }))
                )
                .slice(0, 20)}
              renderItem={(item: any) => {
                const cfg = getPriorityConfig(item.priority);
                return (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Tag color={cfg.color}>{cfg.label}</Tag>}
                      title={item.title}
                      description={
                        <Space direction="vertical" size={2}>
                          <Text>{item.description}</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            来源: {item.url}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          ) : (
            <EmptyState scene="data" description="暂无优化建议，请先分析内容" />
          )}
        </Card>
      ),
    },
    {
      key: 'optimization',
      label: <span><RobotOutlined /> 内容优化</span>,
      children: (
        <Card title="AI 内容优化" style={{ borderRadius: 8 }}>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Card title="SEO 评分 vs 可读性" size="small" style={{ borderRadius: 8 }}>
                {seoReadabilityComparison.length > 0 ? (
                  <ComparisonChart
                    data={seoReadabilityComparison}
                    horizontal
                    height={340}
                    unit=" 分"
                    showLabel
                  />
                ) : (
                  <EmptyState scene="data" description="暂无对比数据" />
                )}
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="内容质量仪表盘" size="small" style={{ borderRadius: 8 }}>
                <GaugeChart
                  value={avgContentScore}
                  title="平均内容质量"
                  height={340}
                  max={100}
                  unit="分"
                  thresholds={[
                    { value: 50, color: '#ff4d4f' },
                    { value: 75, color: '#faad14' },
                    { value: 100, color: '#52c41a' },
                  ]}
                />
              </Card>
            </Col>
          </Row>
          <Divider />
          <Text type="secondary">
            上传内容或粘贴文本，让 AI 生成优化后的版本。包含关键词优化、可读性提升、结构改进等。
          </Text>
        </Card>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="内容分析"
        subtitle={`项目: ${project?.name || ''} (${project?.domain || ''})`}
        showCountrySelector
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
          </Space>
        }
      />

      {/* KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="已分析页面"
            value={pagesAnalyzed}
            icon={<FileTextOutlined />}
            color="#1677ff"
            subtitle={`共 ${pagesAnalyzed} 个页面`}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="平均内容评分"
            value={avgContentScore}
            suffix="/100"
            icon={<StarOutlined />}
            color={getScoreColor(avgContentScore)}
            subtitle={avgContentScore >= 80 ? '状态良好' : avgContentScore >= 60 ? '需要关注' : '需要优化'}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="平均可读性"
            value={avgReadability}
            suffix="/100"
            icon={<ReadOutlined />}
            color={getScoreColor(avgReadability)}
            subtitle="内容可读性评分"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="SEO 评分"
            value={seoScore}
            suffix="/100"
            icon={<AimOutlined />}
            color={getScoreColor(seoScore)}
            subtitle="综合 SEO 评分"
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

export default ContentAnalysis;