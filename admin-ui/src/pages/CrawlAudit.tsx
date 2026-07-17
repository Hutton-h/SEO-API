import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Tag, Progress, Space, Drawer, Select, Typography, Badge, Row, Col, Statistic, message,
} from 'antd';
import {
  PlayCircleOutlined, ReloadOutlined, BugOutlined, WarningOutlined,
  InfoCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ThunderboltOutlined, ClockCircleOutlined, FileSearchOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';

echarts.use([BarChart, GridComponent, TooltipComponent, TitleComponent, CanvasRenderer]);

const { Text, Paragraph } = Typography;

// 模拟数据
const mockPages = [
  { id: '1', url: '/', title: '首页 - SEO Platform', statusCode: 200, loadTime: 1.2, seoScore: 92, lastCrawled: '2024-07-14T10:30:00' },
  { id: '2', url: '/products', title: '产品中心', statusCode: 200, loadTime: 2.1, seoScore: 78, lastCrawled: '2024-07-14T10:30:00' },
  { id: '3', url: '/blog', title: '博客', statusCode: 200, loadTime: 1.8, seoScore: 85, lastCrawled: '2024-07-14T10:30:00' },
  { id: '4', url: '/about', title: '关于我们', statusCode: 200, loadTime: 0.9, seoScore: 88, lastCrawled: '2024-07-14T10:30:00' },
  { id: '5', url: '/contact', title: '联系我们', statusCode: 301, loadTime: 0.5, seoScore: 65, lastCrawled: '2024-07-14T10:30:00' },
  { id: '6', url: '/old-page', title: 'Not Found', statusCode: 404, loadTime: 0.3, seoScore: 30, lastCrawled: '2024-07-14T10:30:00' },
  { id: '7', url: '/services/seo', title: 'SEO 服务', statusCode: 200, loadTime: 3.2, seoScore: 72, lastCrawled: '2024-07-14T10:30:00' },
  { id: '8', url: '/pricing', title: '价格方案', statusCode: 500, loadTime: 5.1, seoScore: 25, lastCrawled: '2024-07-14T10:30:00' },
];

const mockIssues = [
  { id: '1', type: 'meta', severity: 'critical', title: '缺少 Meta Description', description: '首页缺少 meta description 标签', url: '/', element: '<head>', suggestion: '添加 120-155 字符的描述标签' },
  { id: '2', type: 'heading', severity: 'major', title: '缺少 H1 标签', description: '页面没有 H1 标题', url: '/products', element: '<body>', suggestion: '每个页面应有且仅有一个 H1 标签' },
  { id: '3', type: 'image', severity: 'major', title: '图片缺少 Alt 属性', description: '3 张图片没有 alt 属性', url: '/products', element: '<img>', suggestion: '为所有图片添加描述性 alt 属性' },
  { id: '4', type: 'speed', severity: 'critical', title: '页面加载速度慢', description: '加载时间超过 3 秒', url: '/services/seo', element: 'N/A', suggestion: '优化图片大小，启用压缩和缓存' },
  { id: '5', type: 'canonical', severity: 'minor', title: '缺少 Canonical 标签', description: '建议添加 canonical 标签', url: '/about', element: '<head>', suggestion: '添加 canonical 标签避免重复内容' },
  { id: '6', type: 'status', severity: 'critical', title: '404 错误页面', description: '页面返回 404 状态码', url: '/old-page', element: 'N/A', suggestion: '设置 301 重定向到相关页面' },
  { id: '7', type: 'status', severity: 'critical', title: '500 服务器错误', description: '服务器内部错误', url: '/pricing', element: 'N/A', suggestion: '检查服务器配置和应用日志' },
  { id: '8', type: 'meta', severity: 'minor', title: 'Title 标签过长', description: 'Title 超过 60 字符', url: '/blog', element: '<title>', suggestion: '将 Title 控制在 50-60 字符' },
  { id: '9', type: 'schema', severity: 'info', title: '缺少结构化数据', description: '建议添加结构化数据', url: '/', element: '<head>', suggestion: '添加 JSON-LD 格式的结构化数据' },
  { id: '10', type: 'mobile', severity: 'major', title: '移动端适配问题', description: '页面在移动端显示异常', url: '/products', element: 'N/A', suggestion: '使用响应式设计优化移动端体验' },
];

const severityConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  critical: { color: '#ff4d4f', icon: <CloseCircleOutlined />, label: '严重' },
  major: { color: '#fa8c16', icon: <WarningOutlined />, label: '重要' },
  minor: { color: '#1677ff', icon: <InfoCircleOutlined />, label: '次要' },
  info: { color: '#52c41a', icon: <CheckCircleOutlined />, label: '提示' },
};

const CrawlAudit: React.FC = () => {
  const [crawling, setCrawling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [severityFilter, setSeverityFilter] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleStartCrawl = () => {
    setCrawling(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setCrawling(false);
          message.success('爬虫任务完成');
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 500);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  const filteredIssues = severityFilter
    ? mockIssues.filter((i) => i.severity === severityFilter)
    : mockIssues;

  const showIssueDetail = (issue: any) => {
    setSelectedIssue(issue);
    setDrawerOpen(true);
  };

  const pageColumns = [
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      render: (url: string) => <Text code>{url}</Text>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '状态码',
      dataIndex: 'statusCode',
      key: 'statusCode',
      width: 90,
      render: (code: number) => {
        const color = code >= 200 && code < 300 ? 'green' : code >= 300 && code < 400 ? 'blue' : 'red';
        return <Tag color={color}>{code}</Tag>;
      },
    },
    {
      title: '加载时间',
      dataIndex: 'loadTime',
      key: 'loadTime',
      width: 100,
      render: (time: number) => {
        const color = time < 1 ? '#52c41a' : time < 2 ? '#faad14' : '#ff4d4f';
        return <Text style={{ color }}>{time}s</Text>;
      },
    },
    {
      title: 'SEO 分数',
      dataIndex: 'seoScore',
      key: 'seoScore',
      width: 120,
      render: (score: number) => {
        const color = score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f';
        return <Progress percent={score} size="small" strokeColor={color} />;
      },
    },
    {
      title: '最后爬取',
      dataIndex: 'lastCrawled',
      key: 'lastCrawled',
      width: 140,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
  ];

  const issueColumns = [
    {
      title: '严重级别',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => {
        const config = severityConfig[severity];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: '问题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: any) => (
        <a onClick={() => showIssueDetail(record)}>{title}</a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      width: 150,
      render: (url: string) => <Text code>{url}</Text>,
    },
  ];

  // 统计
  const criticalCount = mockIssues.filter((i) => i.severity === 'critical').length;
  const majorCount = mockIssues.filter((i) => i.severity === 'major').length;
  const minorCount = mockIssues.filter((i) => i.severity === 'minor').length;
  const infoCount = mockIssues.filter((i) => i.severity === 'info').length;
  const avgScore = Math.round(mockPages.reduce((acc, p) => acc + p.seoScore, 0) / mockPages.length);

  return (
    <div className="page-container">
      <PageHeader
        title="爬虫审计"
        subtitle="网站 SEO 爬虫检测与问题分析"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          { label: '开始爬取', type: 'primary', icon: <PlayCircleOutlined />, onClick: handleStartCrawl, loading: crawling },
        ]}
      />

      {/* 爬虫进度 */}
      {crawling && (
        <Card style={{ marginBottom: 24, borderColor: '#1677ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ThunderboltOutlined style={{ fontSize: 24, color: '#1677ff' }} />
            <div style={{ flex: 1 }}>
              <Text strong>正在爬取网站...</Text>
              <Progress percent={Math.round(progress)} status="active" strokeColor="#1677ff" />
            </div>
            <Text type="secondary">{Math.round(progress)}%</Text>
          </div>
        </Card>
      )}

      {/* 统计概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="页面总数" value={mockPages.length} prefix={<FileSearchOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="平均 SEO 分数" value={avgScore} suffix="分" valueStyle={{ color: avgScore >= 80 ? '#52c41a' : '#faad14' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="严重问题" value={criticalCount} valueStyle={{ color: '#ff4d4f' }} prefix={<BugOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="总问题数" value={mockIssues.length} prefix={<WarningOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* 页面列表 */}
      <Card
        title="页面列表"
        style={{ marginBottom: 24 }}
        extra={
          <Select
            placeholder="筛选状态码"
            allowClear
            style={{ width: 140 }}
            onChange={(val) => {}}
            options={[
              { value: 200, label: '200 正常' },
              { value: 301, label: '301 重定向' },
              { value: 404, label: '404 未找到' },
              { value: 500, label: '500 错误' },
            ]}
          />
        }
      >
        <Table
          columns={pageColumns}
          dataSource={mockPages}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="middle"
          loading={loading}
        />
      </Card>

      {/* 问题列表 */}
      <Card
        title="检测问题"
        extra={
          <Select
            placeholder="筛选严重级别"
            allowClear
            style={{ width: 140 }}
            value={severityFilter}
            onChange={(val) => setSeverityFilter(val)}
            options={[
              { value: 'critical', label: '严重' },
              { value: 'major', label: '重要' },
              { value: 'minor', label: '次要' },
              { value: 'info', label: '提示' },
            ]}
          />
        }
      >
        <Table
          columns={issueColumns}
          dataSource={filteredIssues}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="middle"
          loading={loading}
        />
      </Card>

      {/* 问题详情 Drawer */}
      <Drawer
        title="问题详情"
        placement="right"
        width={480}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {selectedIssue && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <Tag
                color={severityConfig[selectedIssue.severity]?.color}
                icon={severityConfig[selectedIssue.severity]?.icon}
                style={{ fontSize: 14, padding: '4px 12px' }}
              >
                {severityConfig[selectedIssue.severity]?.label}
              </Tag>
              <Tag style={{ marginLeft: 8 }}>{selectedIssue.type}</Tag>
            </div>

            <Paragraph>
              <Text strong style={{ fontSize: 16 }}>{selectedIssue.title}</Text>
            </Paragraph>

            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">描述</Text>
              <Paragraph style={{ marginTop: 4 }}>{selectedIssue.description}</Paragraph>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">影响页面</Text>
              <Paragraph style={{ marginTop: 4 }}>
                <Text code>{selectedIssue.url}</Text>
              </Paragraph>
            </div>

            {selectedIssue.element && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">相关元素</Text>
                <Paragraph style={{ marginTop: 4 }}>
                  <Text code>{selectedIssue.element}</Text>
                </Paragraph>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">修复建议</Text>
              <Paragraph style={{ marginTop: 4, padding: 12, background: '#f6ffed', borderRadius: 6, border: '1px solid #b7eb8f' }}>
                {selectedIssue.suggestion}
              </Paragraph>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default CrawlAudit;