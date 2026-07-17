import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Tag, Progress, Space, Drawer, Select, Typography, Badge, Row, Col, Statistic, message, Spin, Empty, Alert,
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
import { useStore } from '@/store';
import { crawlAPI } from '@/services/crawl';

echarts.use([BarChart, GridComponent, TooltipComponent, TitleComponent, CanvasRenderer]);

const { Text, Paragraph } = Typography;

const severityConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  critical: { color: '#ff4d4f', icon: <CloseCircleOutlined />, label: '严重' },
  major: { color: '#fa8c16', icon: <WarningOutlined />, label: '重要' },
  minor: { color: '#1677ff', icon: <InfoCircleOutlined />, label: '次要' },
  info: { color: '#52c41a', icon: <CheckCircleOutlined />, label: '提示' },
};

const CrawlAudit: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [crawling, setCrawling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [severityFilter, setSeverityFilter] = useState<string | undefined>();

  const [pages, setPages] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        crawlAPI.getPages(projectId!),
        crawlAPI.getAllIssues(projectId!),
      ]);

      const extractArr = (result: PromiseSettledResult<any>): any[] => {
        if (result.status === 'fulfilled') {
          const res = result.value;
          const d = (res as any).data !== undefined ? (res as any).data : res;
          return Array.isArray(d) ? d : (d?.data || d?.pages || d?.issues || []);
        }
        return [];
      };

      setPages(extractArr(results[0]));
      setIssues(extractArr(results[1]));
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

  const handleStartCrawl = async () => {
    setCrawling(true);
    setProgress(0);
    try {
      const res = await crawlAPI.startCrawl(projectId!);
      message.success('爬虫任务已启动');
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setCrawling(false);
            loadData();
            message.success('爬虫任务完成');
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 500);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '启动爬虫失败';
      message.error(msg);
      setCrawling(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  // ---- 空状态 / 加载状态 / 错误状态 ----
  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="爬虫审计" subtitle="网站 SEO 爬虫检测与问题分析" />
        <Empty description="请先选择一个项目" style={{ marginTop: 120 }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="爬虫审计" subtitle="网站 SEO 爬虫检测与问题分析" />
        <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <PageHeader title="爬虫审计" subtitle="网站 SEO 爬虫检测与问题分析" />
        <Alert
          type="error"
          message="加载失败"
          description={error}
          showIcon
          style={{ marginTop: 24 }}
          action={<Button size="small" onClick={handleRefresh}>重试</Button>}
        />
      </div>
    );
  }

  const filteredIssues = severityFilter ? issues.filter((i) => i.severity === severityFilter) : issues;

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
          <Tag color={config?.color} icon={config?.icon}>
            {config?.label || severity}
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

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const majorCount = issues.filter((i) => i.severity === 'major').length;
  const minorCount = issues.filter((i) => i.severity === 'minor').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;
  const avgScore = pages.length > 0
    ? Math.round(pages.reduce((acc, p) => acc + (p.seoScore || 0), 0) / pages.length)
    : 0;

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
            <Statistic title="页面总数" value={pages.length} prefix={<FileSearchOutlined />} />
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
            <Statistic title="总问题数" value={issues.length} prefix={<WarningOutlined />} />
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
            onChange={(val) => {
              // 状态码筛选可以在这里通过 state 实现
            }}
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
          dataSource={pages}
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