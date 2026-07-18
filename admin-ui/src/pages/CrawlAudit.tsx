import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card, Table, Button, Tag, Progress, Space, Drawer, Select, Typography, Badge, Row, Col, Statistic, message, Spin, Empty, Alert,
  Input, Form, Switch, Slider, InputNumber, Tabs, Divider, Tooltip, Collapse, Descriptions, Segmented,
} from 'antd';
import {
  PlayCircleOutlined, ReloadOutlined, BugOutlined, WarningOutlined,
  InfoCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ThunderboltOutlined, ClockCircleOutlined, FileSearchOutlined,
  AuditOutlined, GlobalOutlined, SettingOutlined, DashboardOutlined,
  SearchOutlined, LinkOutlined, AimOutlined, ExperimentOutlined,
  MobileOutlined, DesktopOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { crawlAPI } from '@/services/crawl';

echarts.use([BarChart, PieChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

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
  const [activeTab, setActiveTab] = useState<string>('crawl');

  // 爬虫状态
  const [crawling, setCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState(0);
  const [crawlTaskId, setCrawlTaskId] = useState<string | null>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [pageTotal, setPageTotal] = useState(0);
  const [pagePage, setPagePage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusCodeFilter, setStatusCodeFilter] = useState<number | undefined>();
  const [searchFilter, setSearchFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string | undefined>();
  const [issueSourceFilter, setIssueSourceFilter] = useState<string | undefined>();

  // 审计状态
  const [auditing, setAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [auditTaskId, setAuditTaskId] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<any>(null);

  // 爬虫配置
  const [crawlUrl, setCrawlUrl] = useState('');
  const [maxPages, setMaxPages] = useState(500);
  const [concurrency, setConcurrency] = useState(5);
  const [respectRobots, setRespectRobots] = useState(true);
  const [followRedirects, setFollowRedirects] = useState(true);

  // 审计配置
  const [auditUrl, setAuditUrl] = useState('');
  const [auditType, setAuditType] = useState<string>('full');
  const [includePSI, setIncludePSI] = useState(true);
  const [psiUrls, setPsiUrls] = useState('');

  // 详情抽屉
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 加载数据
  const loadPages = useCallback(async (p?: number, ps?: number, sc?: number, search?: string) => {
    if (!projectId) return;
    try {
      const res = await crawlAPI.getPages(projectId, {
        page: p || pagePage,
        pageSize: ps || pageSize,
        ...(sc ? { statusCode: sc } : {}),
        ...(search ? { search } : {}),
      });
      const data = (res as any).data !== undefined ? (res as any).data : res;
      setPages(Array.isArray(data) ? data : (data?.data || data?.pages || []));
      setPageTotal(data?.total || 0);
    } catch (err: any) {
      // silent
    }
  }, [projectId, pagePage, pageSize]);

  const loadIssues = useCallback(async (sev?: string, src?: string) => {
    if (!projectId) return;
    try {
      const res = await crawlAPI.getAllIssues(projectId, {
        ...(sev ? { severity: sev } : {}),
        ...(src ? { source: src } : {}),
      });
      const data = (res as any).data !== undefined ? (res as any).data : res;
      setIssues(Array.isArray(data) ? data : (data?.data || data?.issues || []));
    } catch (err: any) {
      // silent
    }
  }, [projectId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadPages(), loadIssues()]);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [loadPages, loadIssues]);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    loadAll();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [projectId]);

  // ====== 爬虫操作 ======
  const handleStartCrawl = async () => {
    if (!crawlUrl.trim()) {
      message.warning('请输入要爬取的网站URL');
      return;
    }
    setCrawling(true);
    setCrawlProgress(0);
    try {
      const res = await crawlAPI.startCrawl(projectId!, {
        maxPages,
        crawlDepth: 3,
        respectRobots,
        followRedirects,
        userAgent: 'CraneSEO-Bot/1.0',
      } as any);
      const taskId = (res as any)?.data?.id || (res as any)?.id;
      setCrawlTaskId(taskId);
      message.success('爬虫任务已启动，正在爬取中...');

      // 轮询进度
      pollingRef.current = setInterval(async () => {
        try {
          if (!taskId) return;
          const statusRes = await crawlAPI.getTaskStatus(projectId!, taskId);
          const task = (statusRes as any)?.data || statusRes;
          const prog = task?.progress || task?.pagesCrawled / Math.max(task?.totalPages || 1, 1) * 100;
          setCrawlProgress(Math.min(prog, 100));
          if (task?.status === 'completed' || task?.status === 'failed' || prog >= 100) {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setCrawling(false);
            if (task?.status === 'completed' || prog >= 100) {
              message.success('爬虫任务完成！');
            } else {
              message.error('爬虫任务失败');
            }
            loadAll();
          }
        } catch {
          // polling error, continue
        }
      }, 2000);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '启动爬虫失败';
      message.error(msg);
      setCrawling(false);
    }
  };

  const handleStopCrawl = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setCrawling(false);
    message.info('已停止轮询');
  };

  // ====== 审计操作 ======
  const handleStartAudit = async () => {
    if (!auditUrl.trim()) {
      message.warning('请输入要审计的网站URL');
      return;
    }
    setAuditing(true);
    setAuditProgress(0);
    try {
      const res = await crawlAPI.startCrawl(projectId!, {
        maxPages: 50,
        crawlDepth: 2,
        respectRobots: true,
        followRedirects: true,
        userAgent: 'CraneSEO-Audit/1.0',
      } as any);
      // 同时触发审计
      const auditRes = await crawlAPI.startAudit(projectId!, {
        auditType: auditType as any,
        includePSI,
        psiUrls: psiUrls ? psiUrls.split(',').map((s: string) => s.trim()) : undefined,
      });
      const taskId = (auditRes as any)?.data?.id || (auditRes as any)?.id;
      setAuditTaskId(taskId);
      message.success('审计任务已启动');

      pollingRef.current = setInterval(async () => {
        try {
          if (!taskId) return;
          const statusRes = await crawlAPI.getAuditStatus(projectId!, taskId);
          const task = (statusRes as any)?.data || statusRes;
          const prog = task?.progress || 0;
          setAuditProgress(Math.min(prog, 100));
          if (task?.status === 'completed' || task?.status === 'failed' || prog >= 100) {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setAuditing(false);
            if (task?.status === 'completed' || prog >= 100) {
              message.success('审计完成！');
              setAuditResult(task?.result || task);
            } else {
              message.error('审计任务失败');
            }
            loadAll();
          }
        } catch {
          // polling error
        }
      }, 2000);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '启动审计失败';
      message.error(msg);
      setAuditing(false);
    }
  };

  const handleRefresh = () => loadAll();

  // ====== 空/加载/错误状态 ======
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
        <Alert type="error" message="加载失败" description={error} showIcon style={{ marginTop: 24 }}
          action={<Button size="small" onClick={handleRefresh}>重试</Button>} />
      </div>
    );
  }

  // ====== 数据处理 ======
  const filteredIssues = issues.filter((i) => {
    if (severityFilter && i.severity !== severityFilter) return false;
    if (issueSourceFilter && issueSourceFilter !== 'all' && i.source !== issueSourceFilter) return false;
    return true;
  });

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const majorCount = issues.filter((i) => i.severity === 'major').length;
  const minorCount = issues.filter((i) => i.severity === 'minor').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;
  const avgScore = pages.length > 0
    ? Math.round(pages.reduce((acc, p) => acc + (p.seoScore || 0), 0) / pages.length)
    : 0;

  // 问题分布图
  const issueChartOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: [
        { value: criticalCount, name: '严重', itemStyle: { color: '#ff4d4f' } },
        { value: majorCount, name: '重要', itemStyle: { color: '#fa8c16' } },
        { value: minorCount, name: '次要', itemStyle: { color: '#1677ff' } },
        { value: infoCount, name: '提示', itemStyle: { color: '#52c41a' } },
      ].filter((d) => d.value > 0),
    }],
  };

  // 页面SEO分数分布
  const scoreChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['0-20', '20-40', '40-60', '60-80', '80-100'] },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar',
      data: [
        pages.filter((p) => (p.seoScore || 0) < 20).length,
        pages.filter((p) => (p.seoScore || 0) >= 20 && (p.seoScore || 0) < 40).length,
        pages.filter((p) => (p.seoScore || 0) >= 40 && (p.seoScore || 0) < 60).length,
        pages.filter((p) => (p.seoScore || 0) >= 60 && (p.seoScore || 0) < 80).length,
        pages.filter((p) => (p.seoScore || 0) >= 80).length,
      ],
      itemStyle: {
        color: (params: any) => {
          const colors = ['#ff4d4f', '#fa8c16', '#faad14', '#1677ff', '#52c41a'];
          return colors[params.dataIndex];
        },
      },
    }],
  };

  const pageColumns = [
    { title: 'URL', dataIndex: 'url', key: 'url', width: 300, render: (url: string) => <Text code style={{ fontSize: 12 }}>{url}</Text> },
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true, width: 200 },
    { title: '状态码', dataIndex: 'statusCode', key: 'statusCode', width: 90,
      render: (code: number) => {
        const color = code >= 200 && code < 300 ? 'green' : code >= 300 && code < 400 ? 'blue' : 'red';
        return <Tag color={color}>{code}</Tag>;
      },
    },
    { title: '加载时间', dataIndex: 'loadTime', key: 'loadTime', width: 100,
      render: (time: number) => {
        const color = time < 1 ? '#52c41a' : time < 2 ? '#faad14' : '#ff4d4f';
        return <Text style={{ color }}>{time}s</Text>;
      },
    },
    { title: 'SEO 分数', dataIndex: 'seoScore', key: 'seoScore', width: 140,
      render: (score: number) => {
        const color = score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f';
        return <Progress percent={score} size="small" strokeColor={color} />;
      },
    },
    { title: '问题数', key: 'issueCount', width: 80,
      render: (_: any, record: any) => {
        const count = record.issues?.length || 0;
        return count > 0 ? <Badge count={count} size="small" style={{ backgroundColor: '#ff4d4f' }} /> : <Text type="secondary">0</Text>;
      },
    },
    { title: '最后爬取', dataIndex: 'lastCrawled', key: 'lastCrawled', width: 150,
      render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
  ];

  const issueColumns = [
    { title: '级别', dataIndex: 'severity', key: 'severity', width: 90,
      render: (severity: string) => {
        const config = severityConfig[severity];
        return <Tag color={config?.color} icon={config?.icon}>{config?.label || severity}</Tag>;
      },
    },
    { title: '问题', dataIndex: 'title', key: 'title',
      render: (title: string, record: any) => <a onClick={() => { setSelectedIssue(record); setDrawerOpen(true); }}>{title}</a>,
    },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100, render: (type: string) => <Tag>{type}</Tag> },
    { title: '来源', dataIndex: 'source', key: 'source', width: 100,
      render: (src: string) => {
        const labels: Record<string, string> = { crawl: '爬虫', lighthouse: 'Lighthouse', psi: 'PageSpeed' };
        const colors: Record<string, string> = { crawl: 'blue', lighthouse: 'purple', psi: 'cyan' };
        return <Tag color={colors[src] || 'default'}>{labels[src] || src}</Tag>;
      },
    },
    { title: 'URL', dataIndex: 'url', key: 'url', width: 200, render: (url: string) => <Text code style={{ fontSize: 11 }}>{url}</Text> },
  ];

  // ====== 渲染 ======
  return (
    <div className="page-container">
      <PageHeader title="爬虫审计" subtitle="网站 SEO 爬虫检测、性能审计与问题分析"
        actions={[
          { label: '刷新数据', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
        ]}
      />

      <Tabs activeKey={activeTab} onChange={setActiveTab} size="large"
        items={[
          {
            key: 'crawl',
            label: <span><GlobalOutlined /> 网站爬虫</span>,
            children: (
              <>
                {/* 爬虫配置面板 */}
                <Card title={<><SettingOutlined /> 爬虫配置</>} style={{ marginBottom: 24 }}>
                  <Row gutter={[24, 16]}>
                    <Col xs={24} md={12}>
                      <Form.Item label="网站URL" required style={{ marginBottom: 0 }}>
                        <Input
                          placeholder="输入要爬取的网站 URL，如 https://example.com"
                          prefix={<LinkOutlined />}
                          value={crawlUrl}
                          onChange={(e) => setCrawlUrl(e.target.value)}
                          disabled={crawling}
                          size="large"
                          onPressEnter={handleStartCrawl}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Item label="最大页面数" style={{ marginBottom: 0 }}>
                        <InputNumber
                          min={10} max={5000} step={10}
                          value={maxPages} onChange={(v) => setMaxPages(v || 500)}
                          disabled={crawling} style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Item label="并发数" style={{ marginBottom: 0 }}>
                        <InputNumber
                          min={1} max={20} step={1}
                          value={concurrency} onChange={(v) => setConcurrency(v || 5)}
                          disabled={crawling} style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={8} md={8}>
                      <Space>
                        <span>尊重 robots.txt</span>
                        <Switch checked={respectRobots} onChange={setRespectRobots} disabled={crawling} />
                        <span>跟随重定向</span>
                        <Switch checked={followRedirects} onChange={setFollowRedirects} disabled={crawling} />
                      </Space>
                    </Col>
                    <Col xs={16} md={16} style={{ textAlign: 'right' }}>
                      <Space>
                        {crawling ? (
                          <Button danger icon={<CloseCircleOutlined />} onClick={handleStopCrawl}>停止</Button>
                        ) : (
                          <Button type="primary" size="large" icon={<PlayCircleOutlined />} onClick={handleStartCrawl}>
                            开始爬取
                          </Button>
                        )}
                      </Space>
                    </Col>
                  </Row>
                </Card>

                {/* 爬虫进度 */}
                {crawling && (
                  <Card style={{ marginBottom: 24, borderColor: '#1677ff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <ThunderboltOutlined style={{ fontSize: 28, color: '#1677ff' }} />
                      <div style={{ flex: 1 }}>
                        <Text strong>正在爬取网站页面...</Text>
                        <Progress percent={Math.round(crawlProgress)} status="active" strokeColor={{ from: '#1677ff', to: '#52c41a' }} />
                      </div>
                      <Text type="secondary" style={{ fontSize: 18, fontWeight: 'bold' }}>{Math.round(crawlProgress)}%</Text>
                    </div>
                  </Card>
                )}

                {/* 统计概览 */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={12} sm={4}>
                    <Card size="small"><Statistic title="页面总数" value={pages.length} prefix={<FileSearchOutlined />} /></Card>
                  </Col>
                  <Col xs={12} sm={4}>
                    <Card size="small"><Statistic title="平均 SEO 分数" value={avgScore} suffix="分"
                      valueStyle={{ color: avgScore >= 80 ? '#52c41a' : avgScore >= 60 ? '#faad14' : '#ff4d4f' }} /></Card>
                  </Col>
                  <Col xs={12} sm={4}>
                    <Card size="small"><Statistic title="严重" value={criticalCount} valueStyle={{ color: '#ff4d4f' }}
                      prefix={<BugOutlined />} /></Card>
                  </Col>
                  <Col xs={12} sm={4}>
                    <Card size="small"><Statistic title="重要" value={majorCount} valueStyle={{ color: '#fa8c16' }} /></Card>
                  </Col>
                  <Col xs={12} sm={4}>
                    <Card size="small"><Statistic title="次要" value={minorCount} valueStyle={{ color: '#1677ff' }} /></Card>
                  </Col>
                  <Col xs={12} sm={4}>
                    <Card size="small"><Statistic title="提示" value={infoCount} valueStyle={{ color: '#52c41a' }} /></Card>
                  </Col>
                </Row>

                {/* 图表区 */}
                {pages.length > 0 && (
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} md={12}>
                      <Card title="SEO 分数分布" size="small">
                        <ReactEChartsCore echarts={echarts} option={scoreChartOption} style={{ height: 250 }} />
                      </Card>
                    </Col>
                    <Col xs={24} md={12}>
                      <Card title="问题分布" size="small">
                        <ReactEChartsCore echarts={echarts} option={issueChartOption} style={{ height: 250 }} />
                      </Card>
                    </Col>
                  </Row>
                )}

                {/* 页面列表 */}
                <Card title="已爬取页面" style={{ marginBottom: 24 }}
                  extra={
                    <Space>
                      <Input
                        placeholder="搜索URL..."
                        prefix={<SearchOutlined />}
                        allowClear
                        style={{ width: 200 }}
                        value={searchFilter}
                        onChange={(e) => { setSearchFilter(e.target.value); loadPages(1, pageSize, statusCodeFilter, e.target.value); }}
                      />
                      <Select placeholder="状态码" allowClear style={{ width: 130 }}
                        value={statusCodeFilter}
                        onChange={(v) => { setStatusCodeFilter(v); loadPages(1, pageSize, v, searchFilter); }}
                        options={[
                          { value: 200, label: '200 正常' },
                          { value: 301, label: '301 重定向' },
                          { value: 302, label: '302 临时重定向' },
                          { value: 404, label: '404 未找到' },
                          { value: 500, label: '500 服务器错误' },
                        ]}
                      />
                    </Space>
                  }
                >
                  <Table columns={pageColumns} dataSource={pages} rowKey="id"
                    pagination={{ current: pagePage, pageSize, total: pageTotal, showSizeChanger: true,
                      onChange: (p, ps) => { setPagePage(p); setPageSize(ps); loadPages(p, ps, statusCodeFilter, searchFilter); },
                    }}
                    size="middle" loading={loading}
                  />
                </Card>

                {/* 问题列表 */}
                <Card title="检测问题"
                  extra={
                    <Space>
                      <Select placeholder="来源" allowClear style={{ width: 120 }}
                        value={issueSourceFilter}
                        onChange={(v) => { setIssueSourceFilter(v); loadIssues(severityFilter, v); }}
                        options={[
                          { value: 'all', label: '全部来源' },
                          { value: 'crawl', label: '爬虫检测' },
                          { value: 'lighthouse', label: 'Lighthouse' },
                          { value: 'psi', label: 'PageSpeed' },
                        ]}
                      />
                      <Select placeholder="严重级别" allowClear style={{ width: 120 }}
                        value={severityFilter}
                        onChange={(v) => { setSeverityFilter(v); loadIssues(v, issueSourceFilter); }}
                        options={[
                          { value: 'critical', label: '严重' },
                          { value: 'major', label: '重要' },
                          { value: 'minor', label: '次要' },
                          { value: 'info', label: '提示' },
                        ]}
                      />
                    </Space>
                  }
                >
                  <Table columns={issueColumns} dataSource={filteredIssues} rowKey="id"
                    pagination={{ pageSize: 10 }} size="middle" loading={loading}
                  />
                </Card>
              </>
            ),
          },
          {
            key: 'audit',
            label: <span><AuditOutlined /> SEO 审计</span>,
            children: (
              <>
                {/* 审计配置面板 */}
                <Card title={<><ExperimentOutlined /> SEO 审计配置</>} style={{ marginBottom: 24 }}>
                  <Row gutter={[24, 16]}>
                    <Col xs={24} md={12}>
                      <Form.Item label="网站URL" required style={{ marginBottom: 0 }}>
                        <Input
                          placeholder="输入要审计的网站 URL"
                          prefix={<LinkOutlined />}
                          value={auditUrl}
                          onChange={(e) => setAuditUrl(e.target.value)}
                          disabled={auditing}
                          size="large"
                          onPressEnter={handleStartAudit}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item label="审计类型" style={{ marginBottom: 0 }}>
                        <Select value={auditType} onChange={setAuditType} disabled={auditing} style={{ width: '100%' }}
                          options={[
                            { value: 'full', label: '全面审计' },
                            { value: 'seo', label: '仅 SEO' },
                            { value: 'performance', label: '仅性能' },
                            { value: 'accessibility', label: '仅可访问性' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space>
                          <span>包含 PageSpeed 检测</span>
                          <Switch checked={includePSI} onChange={setIncludePSI} disabled={auditing} />
                        </Space>
                        {includePSI && (
                          <Input
                            placeholder="额外 PageSpeed URL（逗号分隔）"
                            value={psiUrls}
                            onChange={(e) => setPsiUrls(e.target.value)}
                            disabled={auditing}
                            size="small"
                          />
                        )}
                      </Space>
                    </Col>
                    <Col xs={24} style={{ textAlign: 'right' }}>
                      <Space>
                        {auditing ? (
                          <Button danger icon={<CloseCircleOutlined />} onClick={handleStopCrawl}>停止</Button>
                        ) : (
                          <Button type="primary" size="large" icon={<AuditOutlined />} onClick={handleStartAudit}>
                            开始审计
                          </Button>
                        )}
                      </Space>
                    </Col>
                  </Row>
                </Card>

                {/* 审计进度 */}
                {auditing && (
                  <Card style={{ marginBottom: 24, borderColor: '#722ed1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <ExperimentOutlined style={{ fontSize: 28, color: '#722ed1' }} />
                      <div style={{ flex: 1 }}>
                        <Text strong>正在执行 SEO 审计...</Text>
                        <Progress percent={Math.round(auditProgress)} status="active" strokeColor="#722ed1" />
                      </div>
                      <Text type="secondary" style={{ fontSize: 18, fontWeight: 'bold' }}>{Math.round(auditProgress)}%</Text>
                    </div>
                  </Card>
                )}

                {/* 审计结果 */}
                {auditResult ? (
                  <>
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                      <Col xs={24} sm={8}>
                        <Card>
                          <Statistic title="SEO 健康评分" value={auditResult?.seoScore || auditResult?.overallScore || 0}
                            suffix="/ 100" valueStyle={{ color: (auditResult?.seoScore || 0) >= 80 ? '#52c41a' : '#faad14' }} />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card>
                          <Statistic title="性能评分" value={auditResult?.performanceScore || 0}
                            suffix="/ 100" valueStyle={{ color: (auditResult?.performanceScore || 0) >= 80 ? '#52c41a' : '#faad14' }} />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card>
                          <Statistic title="可访问性评分" value={auditResult?.accessibilityScore || 0}
                            suffix="/ 100" valueStyle={{ color: (auditResult?.accessibilityScore || 0) >= 80 ? '#52c41a' : '#faad14' }} />
                        </Card>
                      </Col>
                    </Row>

                    {/* PageSpeed 结果 */}
                    {auditResult?.pageSpeed && (
                      <Card title={<><DashboardOutlined /> PageSpeed Insights</>} style={{ marginBottom: 24 }}>
                        <Row gutter={[16, 16]}>
                          <Col xs={24} md={12}>
                            <Card size="small" title={<><MobileOutlined /> 移动端</>}>
                              <Row gutter={16}>
                                <Col span={8}><Statistic title="性能" value={auditResult.pageSpeed?.mobile?.performance || '-'} suffix="/100" /></Col>
                                <Col span={8}><Statistic title="FCP" value={auditResult.pageSpeed?.mobile?.fcp || '-'} suffix="s" /></Col>
                                <Col span={8}><Statistic title="LCP" value={auditResult.pageSpeed?.mobile?.lcp || '-'} suffix="s" /></Col>
                                <Col span={8}><Statistic title="TBT" value={auditResult.pageSpeed?.mobile?.tbt || '-'} suffix="ms" /></Col>
                                <Col span={8}><Statistic title="CLS" value={auditResult.pageSpeed?.mobile?.cls || '-'} /></Col>
                                <Col span={8}><Statistic title="SI" value={auditResult.pageSpeed?.mobile?.si || '-'} suffix="s" /></Col>
                              </Row>
                            </Card>
                          </Col>
                          <Col xs={24} md={12}>
                            <Card size="small" title={<><DesktopOutlined /> 桌面端</>}>
                              <Row gutter={16}>
                                <Col span={8}><Statistic title="性能" value={auditResult.pageSpeed?.desktop?.performance || '-'} suffix="/100" /></Col>
                                <Col span={8}><Statistic title="FCP" value={auditResult.pageSpeed?.desktop?.fcp || '-'} suffix="s" /></Col>
                                <Col span={8}><Statistic title="LCP" value={auditResult.pageSpeed?.desktop?.lcp || '-'} suffix="s" /></Col>
                              </Row>
                            </Card>
                          </Col>
                        </Row>
                      </Card>
                    )}
                  </>
                ) : (
                  !auditing && (
                    <Empty description="尚未进行审计，请配置并点击「开始审计」" style={{ marginTop: 60 }} />
                  )
                )}
              </>
            ),
          },
        ]}
      />

      {/* 问题详情 Drawer */}
      <Drawer title="问题详情" placement="right" width={480} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {selectedIssue && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <Tag color={severityConfig[selectedIssue.severity]?.color} icon={severityConfig[selectedIssue.severity]?.icon}
                style={{ fontSize: 14, padding: '4px 12px' }}>
                {severityConfig[selectedIssue.severity]?.label}
              </Tag>
              <Tag style={{ marginLeft: 8 }}>{selectedIssue.type}</Tag>
              {selectedIssue.source && <Tag style={{ marginLeft: 8 }} color="purple">{selectedIssue.source}</Tag>}
            </div>
            <Paragraph><Text strong style={{ fontSize: 16 }}>{selectedIssue.title}</Text></Paragraph>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">描述</Text>
              <Paragraph style={{ marginTop: 4 }}>{selectedIssue.description}</Paragraph>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">影响页面</Text>
              <Paragraph style={{ marginTop: 4 }}><Text code>{selectedIssue.url}</Text></Paragraph>
            </div>
            {selectedIssue.element && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">相关元素</Text>
                <Paragraph style={{ marginTop: 4 }}><Text code>{selectedIssue.element}</Text></Paragraph>
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