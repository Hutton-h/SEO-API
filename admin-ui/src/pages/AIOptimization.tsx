import React, { useState } from 'react';
import {
  Card, List, Tag, Typography, Row, Col, Statistic, Button, Space, Progress, Collapse, Spin, message,
} from 'antd';
import {
  RobotOutlined, BulbOutlined, ThunderboltOutlined, CheckCircleOutlined,
  ReloadOutlined, ArrowRightOutlined, TrophyOutlined, ExperimentOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';

const { Text, Paragraph, Title } = Typography;

const mockRecommendations = [
  {
    id: '1',
    priority: 'high',
    category: '内容优化',
    title: '为 TOP 10 页面添加 FAQ 结构化数据',
    description: '您的 TOP 10 页面缺少 FAQ 结构化数据。添加后预期提升搜索结果中的富文本展示率 35%，提高点击率 15-20%。',
    impact: '高',
    effort: '低',
    estimatedTrafficIncrease: '15-20%',
    steps: ['使用 Schema.org FAQ 格式', '针对每个页面添加 3-5 个常见问题', '通过 Google 结构化数据测试工具验证'],
  },
  {
    id: '2',
    priority: 'high',
    category: '速度优化',
    title: '优化 Core Web Vitals - LCP 指标',
    description: '首页 LCP (Largest Contentful Paint) 为 3.8 秒，超过 Google 推荐的 2.5 秒。这直接影响排名和用户体验。',
    impact: '高',
    effort: '中',
    estimatedTrafficIncrease: '10-15%',
    steps: ['压缩和优化主图', '启用 CDN 加速', '优化关键 CSS 内联', '延迟加载非关键资源'],
  },
  {
    id: '3',
    priority: 'medium',
    category: '外链建设',
    title: '获取行业权威网站外链',
    description: 'AI 分析发现 5 个潜在的高质量外链来源，DA 值均超过 60，且与您的行业高度相关。',
    impact: '中',
    effort: '中',
    estimatedTrafficIncrease: '8-12%',
    steps: ['联系行业博客进行客座投稿', '参与行业论坛讨论', '创建可分享的信息图表', '修复失效的 404 外链'],
  },
  {
    id: '4',
    priority: 'medium',
    category: '关键词优化',
    title: '扩展长尾关键词覆盖',
    description: 'AI 识别出 23 个高潜力长尾关键词，搜索量中等但竞争度低，转化意图强。',
    impact: '中',
    effort: '低',
    estimatedTrafficIncrease: '12-18%',
    steps: ['创建针对长尾关键词的专题页面', '在博客中自然融入长尾关键词', '优化现有页面标题和描述'],
  },
  {
    id: '5',
    priority: 'low',
    category: '技术优化',
    title: '优化内部链接结构',
    description: 'AI 分析发现部分重要页面内部链接较少，建议增加相关页面的交叉链接。',
    impact: '低',
    effort: '低',
    estimatedTrafficIncrease: '3-5%',
    steps: ['分析网站内部链接分布', '为孤岛页面添加链接', '优化面包屑导航', '增加相关文章推荐模块'],
  },
  {
    id: '6',
    priority: 'high',
    category: '移动端优化',
    title: '修复移动端可用性问题',
    description: '移动端检测到 12 个可用性问题，包括点击目标过小、视口配置不当等。',
    impact: '高',
    effort: '中',
    estimatedTrafficIncrease: '10-15%',
    steps: ['调整按钮和链接的点击区域', '优化移动端字体大小', '确保视口正确配置', '移除 interstitial 弹窗'],
  },
];

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
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      message.success('AI 分析完成，生成 6 条优化建议');
    }, 3000);
  };

  const highCount = mockRecommendations.filter((r) => r.priority === 'high').length;
  const mediumCount = mockRecommendations.filter((r) => r.priority === 'medium').length;
  const lowCount = mockRecommendations.filter((r) => r.priority === 'low').length;

  const collapseItems = mockRecommendations.map((rec) => ({
    key: rec.id,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
        <Tag color={priorityConfig[rec.priority].color} icon={priorityConfig[rec.priority].icon}>
          {priorityConfig[rec.priority].label}
        </Tag>
        <Tag color={categoryColors[rec.category]}>{rec.category}</Tag>
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
            <Statistic title="优化建议总数" value={mockRecommendations.length} prefix={<BulbOutlined style={{ color: '#faad14' }} />} />
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
            <Statistic title="AI 分析置信度" value={94} suffix="%" prefix={<RobotOutlined />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
      </Row>

      <Card title="优化建议列表">
        <Collapse
          items={collapseItems}
          defaultActiveKey={['1', '2', '6']}
          expandIconPosition="end"
          size="large"
        />
      </Card>
    </div>
  );
};

export default AIOptimization;