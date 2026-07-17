import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, List, Tag, Typography, Row, Col, Statistic, Button, Space, Progress, Collapse, Spin, message,
  Input, Empty, Alert,
} from 'antd';
import {
  RobotOutlined, BulbOutlined, ThunderboltOutlined, CheckCircleOutlined,
  ReloadOutlined, ArrowRightOutlined, TrophyOutlined, ExperimentOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { aiAPI, AIOptimizationRecommendation } from '@/services/ai';

const { Text, Paragraph, Title } = Typography;

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
};

const AIOptimization: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<AIOptimizationRecommendation[]>([]);
  const [summary, setSummary] = useState<{ total: number; highPriority: number; mediumPriority: number; lowPriority: number; confidence: number } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [inputUrl, setInputUrl] = useState('');

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      // 初始加载：不带参数获取已有建议
      const res = await aiAPI.optimize(projectId, {});
      const result = (res as any).data || res;
      const recs = result.recommendations || [];
      setRecommendations(recs);
      setSummary(result.summary || {
        total: recs.length,
        highPriority: recs.filter((r: AIOptimizationRecommendation) => r.priority === 'high').length,
        mediumPriority: recs.filter((r: AIOptimizationRecommendation) => r.priority === 'medium').length,
        lowPriority: recs.filter((r: AIOptimizationRecommendation) => r.priority === 'low').length,
        confidence: 0,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载AI优化建议失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    loadData();
  }, [projectId, loadData]);

  const handleAnalyze = async () => {
    if (!projectId) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await aiAPI.optimize(projectId, {
        url: inputUrl || undefined,
      });
      const result = (res as any).data || res;
      const recs = result.recommendations || [];
      setRecommendations(recs);
      setSummary(result.summary || {
        total: recs.length,
        highPriority: recs.filter((r: AIOptimizationRecommendation) => r.priority === 'high').length,
        mediumPriority: recs.filter((r: AIOptimizationRecommendation) => r.priority === 'medium').length,
        lowPriority: recs.filter((r: AIOptimizationRecommendation) => r.priority === 'low').length,
        confidence: 0,
      });
      message.success(`AI 分析完成，生成 ${recs.length} 条优化建议`);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'AI分析失败';
      message.error(msg);
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRefresh = async () => {
    await loadData();
  };

  // ---- 渲染 ----

  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader
          title="AI 优化建议"
          subtitle="AI 驱动的 SEO 优化建议与分析"
        />
        <Empty description="请先选择一个项目" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="AI 优化建议"
          subtitle="AI 驱动的 SEO 优化建议与分析"
        />
        <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <PageHeader
          title="AI 优化建议"
          subtitle="AI 驱动的 SEO 优化建议与分析"
          actions={[
            { label: '重试', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          ]}
        />
        <Alert type="error" message="加载失败" description={error} showIcon />
      </div>
    );
  }

  const highCount = summary?.highPriority ?? recommendations.filter((r) => r.priority === 'high').length;
  const mediumCount = summary?.mediumPriority ?? recommendations.filter((r) => r.priority === 'medium').length;
  const lowCount = summary?.lowPriority ?? recommendations.filter((r) => r.priority === 'low').length;
  const confidence = summary?.confidence ?? 0;

  const collapseItems = recommendations.map((rec) => ({
    key: rec.id,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
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
            <Statistic title="影响程度" value={rec.impact} valueStyle={{ color: rec.priority === 'high' ? '#ff4d4f' : '#1677ff', fontSize: 20 }} />
          </Col>
          <Col span={8}>
            <Statistic title="实施难度" value={rec.effort} valueStyle={{ fontSize: 20 }} />
          </Col>
          <Col span={8}>
            <Statistic title="预估流量增长" value={rec.estimatedTrafficIncrease} valueStyle={{ color: '#52c41a', fontSize: 20 }} />
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
        <Button type="primary" size="small" style={{ marginTop: 12 }} icon={<ArrowRightOutlined />}>
          查看详细方案
        </Button>
      </div>
    ),
  }));

  return (
    <div className="page-container">
      <PageHeader
        title="AI 优化建议"
        subtitle="AI 驱动的 SEO 优化建议与分析"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          { label: 'AI 分析', type: 'primary', icon: <ExperimentOutlined />, onClick: handleAnalyze, loading: analyzing },
        ]}
      />

      {/* 输入区域 */}
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>输入URL或内容，让AI分析并给出优化建议：</Text>
          <Input.Search
            placeholder="输入网站URL，例如：https://example.com"
            enterButton={<><SearchOutlined /> 分析</>}
            size="large"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onSearch={handleAnalyze}
            loading={analyzing}
          />
        </Space>
      </Card>

      {analyzing && (
        <Card style={{ marginBottom: 24, borderColor: '#1677ff', textAlign: 'center' }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: 16 }}>
            <Text strong>AI 正在分析您的网站数据...</Text>
          </Paragraph>
          <Text type="secondary">正在扫描页面、关键词、外链和竞品数据</Text>
        </Card>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="优化建议总数" value={recommendations.length} prefix={<BulbOutlined style={{ color: '#faad14' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="高优先级" value={highCount} valueStyle={{ color: '#ff4d4f' }} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="中优先级" value={mediumCount} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="AI 分析置信度" value={confidence} suffix="%" prefix={<RobotOutlined />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
      </Row>

      {recommendations.length === 0 ? (
        <Empty description="暂无优化建议，请点击「AI 分析」按钮开始分析" />
      ) : (
        <Card title="优化建议列表">
          <Collapse
            items={collapseItems}
            defaultActiveKey={recommendations.filter((r) => r.priority === 'high').map((r) => r.id)}
            expandIconPosition="end"
            size="large"
          />
        </Card>
      )}
    </div>
  );
};

export default AIOptimization;