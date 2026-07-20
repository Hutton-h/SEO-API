import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card, Table, Button, Tag, Typography, Row, Col, Space,
  Input, Select, Modal, InputNumber, Progress, message, Tabs, Switch, Drawer, Collapse,
} from 'antd';
import {
  PlayCircleOutlined, ReloadOutlined, BugOutlined, WarningOutlined,
  InfoCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ThunderboltOutlined, SearchOutlined, AuditOutlined, GlobalOutlined,
  SettingOutlined, PieChartOutlined, BarChartOutlined, DashboardOutlined,
  LinkOutlined, AimOutlined, FileSearchOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { TrendChart, DistributionChart, ComparisonChart, GaugeChart } from '@/components/charts';
import { useStore } from '@/store';
import { crawlAPI } from '@/services/crawl';

const { Text, Paragraph } = Typography;

// ============================================================================
// Severity Config
// ============================================================================

const severityConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  critical: { color: '#ff4d4f', icon: <CloseCircleOutlined />, label: '严重' },
  major: { color: '#fa8c16', icon: <WarningOutlined />, label: '重要' },
  minor: { color: '#1677ff', icon: <InfoCircleOutlined />, label: '次要' },
  info: { color: '#52c41a', icon: <CheckCircleOutlined />, label: '提示' },
};

// ============================================================================
// Component
// ============================================================================

const CrawlAudit: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const projectName = useStore((s) => s.currentProject?.name || '');

  // ---- State ----
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Crawl state
  const [crawling, setCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState(0);
  const [crawlTaskId, setCrawlTaskId] = useState<string | null>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [pageTotal, setPageTotal] = useState(0);
  const [pagePage, setPagePage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Issues state
  const [issues, setIssues] = useState<any[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string | undefined>();
  const [issueSourceFilter, setIssueSourceFilter] = useState<string | undefined>();

  // Page filters
  const [searchFilter, setSearchFilter] = useState('');
  const [statusCodeFilter, setStatusCodeFilter] = useState<number | undefined>();

  // Crawl config
  const [crawlUrl, setCrawlUrl] = useState('');
  const [maxPages, setMaxPages] = useState(500);
  const [concurrency, setConcurrency] = useState(5);

  // Detail drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- KPI calculation ----
  const pagesCount = pageTotal || pages.length;
  const totalIssues = issues.length;
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const healthScore = pagesCount > 0
    ? Math.round(pages.reduce((acc, p) => acc + (p.seoScore || 0), 0) / pages.length)
    : 0;

  // ---- Data loading ----
  const loadPages = useCallback(async (p?: number, ps?: number, sc?: number, search?: string) => {
    if (!projectId) return;
    try {
      const res: any = await crawlAPI.getPages(projectId, {
        page: p ?? pagePage,
        pageSize: ps ?? pageSize,
        ...(sc ? { statusCode: sc } : {}),
        ...(search ? { search } : {}),
      });
      const list = Array.isArray(res) ? res : (res?.data || res?.pages || []);
      const t = res?.total || 0;
      setPages(list);
      setPageTotal(t);
    } catch {
      // graceful
    }
  }, [projectId, pagePage, pageSize]);

  const loadIssues = useCallback(async (sev?: string, src?: string) => {
    if (!projectId) return;
    try {
      const res: any = await crawlAPI.getAllIssues(projectId, {
        ...(sev ? { severity: sev } : {}),
        ...(src && src !== 'all' ? { source: src } : {}),
      });
      const list = Array.isArray(res) ? res : (res?.data || res?.issues || []);
      setIssues(list);
    } catch {
      // graceful
    }
  }, [projectId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadPages(), loadIssues()]);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [loadPages, loadIssues]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadAll();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [projectId]);

  // ---- Actions ----
  const handleStartCrawl = async () => {
    if (!crawlUrl.trim()) { message.warning('请输入要爬取的网站URL'); return; }
    setCrawling(true);
    setCrawlProgress(0);
    try {
      const res: any = await crawlAPI.startCrawl(projectId!, {
        url: crawlUrl.trim(),
        maxPages,
        concurrency,
      });
      const taskId = res?.id || res?.data?.id;
      setCrawlTaskId(taskId);
      message.success('爬虫任务已启动，正在爬取中...');

      pollingRef.current = setInterval(async () => {
        try {
          if (!taskId) return;
          const statusRes: any = await crawlAPI.getTaskStatus(projectId!, taskId);
          const task = statusRes?.data || statusRes;
          const prog = task?.progress || (task?.pagesCrawled / Math.max(task?.totalPages || 1, 1) * 100);
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
      message.error(err?.response?.data?.error?.message || err?.message || '启动爬虫失败');
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

  const handleRefresh = () => loadAll();

  // ---- Issue distribution ----
  const issueDistData = [
    { name: '严重', value: criticalCount, color: '#ff4d4f' },
    { name: '重要', value: issues.filter((i) => i.severity === 'major').length, color: '#fa8c16' },
    { name: '次要', value: issues.filter((i) => i.severity === 'minor').length, color: '#1677ff' },
    { name: '提示', value: issues.filter((i) => i.severity === 'info').length, color: '#52c41a' },
  ].filter((d) => d.value > 0);

  // Issue category distribution
  const categoryMap: Record<string, number> = {};
  issues.forEach((i) => {
    const cat = i.type || i.category || '其他';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const categoryDistData = Object.entries(categoryMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  // ---- Page Columns ----
  const pageColumns = [
    {
      title: 'URL', dataIndex: 'url', key: 'url', width: 300, ellipsis: true,
      render: (url: string) => <Text code style={{ fontSize: 12 }}>{url}</Text>,
    },
    {
      title: '状态码', dataIndex: 'statusCode', key: 'statusCode', width: 90,
      render: (code: number) => {
        const color = code >= 200 && code < 300 ? 'green' : code >= 300 && code < 400 ? 'blue' : 'red';
        return <Tag color={color}>{code}</Tag>;
      },
    },
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true, width: 200 },
    { title: 'Meta描述', dataIndex: 'meta_description', key: 'meta_description', ellipsis: true, width: 180,
      render: (val: string) => val ? <Text type="secondary" ellipsis style={{ maxWidth: 160 }}>{val}</Text> : <Tag>未设置</Tag>,
    },
    { title: 'H1', dataIndex: 'h1', key: 'h1', ellipsis: true, width: 120,
      render: (val: string) => val || <Tag>未设置</Tag>,
    },
    { title: '字数', dataIndex: 'word_count', key: 'word_count', width: 80,
      render: (val: number) => val ?? '-',
    },
    {
      title: '加载时间', dataIndex: 'loadTime', key: 'loadTime', width: 100,
      render: (time: number) => {
        const color = time < 1 ? '#52c41a' : time < 2 ? '#faad14' : '#ff4d4f';
        return <Text style={{ color }}>{time ?? '-'}{time ? 's' : ''}</Text>;
      },
    },
    {
      title: 'SEO分数', dataIndex: 'seoScore', key: 'seoScore', width: 140,
      render: (score: number) => {
        const color = score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f';
        return <Progress percent={score || 0} size="small" strokeColor={color} />;
      },
    },
    {
      title: '最后爬取', dataIndex: 'lastCrawled', key: 'lastCrawled', width: 150,
      render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
  ];

  // ---- Issue Columns ----
  const issueColumns = [
    {
      title: '级别', dataIndex: 'severity', key: 'severity', width: 90,
      render: (severity: string) => {
        const config = severityConfig[severity];
        return <Tag color={config?.color} icon={config?.icon}>{config?.label || severity}</Tag>;
      },
    },
    {
      title: '问题', dataIndex: 'title', key: 'title',
      render: (title: string, record: any) => (
        <a onClick={() => { setSelectedIssue(record); setDrawerOpen(true); }}>{title}</a>
      ),
    },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100, render: (type: string) => <Tag>{type}</Tag> },
    { title: 'URL', dataIndex: 'url', key: 'url', width: 200, ellipsis: true, render: (url: string) => <Text code style={{ fontSize: 11 }}>{url}</Text> },
    {
      title: '来源', dataIndex: 'source', key: 'source', width: 100,
      render: (src: string) => {
        const labels: Record<string, string> = { crawl: '爬虫', lighthouse: 'Lighthouse', psi: 'PageSpeed' };
        const colors: Record<string, string> = { crawl: 'blue', lighthouse: 'purple', psi: 'cyan' };
        return <Tag color={colors[src] || 'default'}>{labels[src] || src}</Tag>;
      },
    },
  ];

  // ---- State: no project ----
  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="网站审计" subtitle="请先选择项目" showCountrySelector showDateRange />
        <EmptyState scene="data" title="请先选择项目" description="请从顶部导航栏选择一个项目以开始网站审计" />
      </div>
    );
  }

  // ---- State: loading ----
  if (loading && pages.length === 0 && issues.length === 0) {
    return (
      <div className="page-container">
        <PageHeader title="网站审计" subtitle={`${projectName} - SEO爬虫检测与问题分析`} showCountrySelector showDateRange />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ---- State: error ----
  if (error && pages.length === 0 && issues.length === 0) {
    return (
      <div className="page-container">
        <PageHeader title="网站审计" subtitle={`${projectName} - SEO爬虫检测与问题分析`} showCountrySelector showDateRange />
        <ErrorState message={error} onRetry={() => loadAll()} />
      </div>
    );
  }

  // ---- Render ----
  return (
    <div className="page-container">
      <PageHeader
        title="网站审计"
        subtitle={`${projectName} - ${pagesCount} 个页面 · ${totalIssues} 个问题`}
        showCountrySelector
        showDateRange
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>刷新</Button>
          </Space>
        }
      />

      {/* Crawl Config Card */}
      <Card title={<><SettingOutlined /> 爬虫配置</>} style={{ marginBottom: 24 }}>
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="输入要爬取的网站 URL，如 https://example.com"
                prefix={<LinkOutlined />}
                value={crawlUrl}
                onChange={(e) => setCrawlUrl(e.target.value)}
                disabled={crawling}
                size="large"
                onPressEnter={handleStartCrawl}
              />
            </Space.Compact>
          </Col>
          <Col xs={12} md={6}>
            <InputNumber
              addonBefore="最大页数"
              min={10} max={5000} step={10}
              value={maxPages} onChange={(v) => setMaxPages(v || 500)}
              disabled={crawling} style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} md={6}>
            <Space>
              <Button type="primary" size="large" icon={<PlayCircleOutlined />} onClick={handleStartCrawl} disabled={crawling}>
                开始爬取
              </Button>
              {crawling && (
                <Button danger icon={<CloseCircleOutlined />} onClick={handleStopCrawl}>停止</Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Crawl Progress */}
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

      {/* KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard title="已爬取页面" value={pagesCount} icon={<FileSearchOutlined />} color="#1677ff" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="总问题数" value={totalIssues} icon={<BugOutlined />} color="#fa8c16" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="严重问题" value={criticalCount} icon={<WarningOutlined />} color="#ff4d4f" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="健康评分" value={`${healthScore}`} icon={<DashboardOutlined />} color="#52c41a" suffix="/100" />
        </Col>
      </Row>

      {/* Health Score Gauge */}
      {pagesCount > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} md={8}>
            <Card title="网站健康评分">
              <GaugeChart
                value={healthScore}
                max={100}
                unit="分"
                height={280}
                thresholds={[
                  { value: 50, color: '#ff4d4f' },
                  { value: 75, color: '#faad14' },
                  { value: 100, color: '#52c41a' },
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title={<><PieChartOutlined /> 问题严重性分布</>}>
              {issueDistData.length > 0 ? (
                <DistributionChart data={issueDistData} type="donut" height={280} />
              ) : (
                <EmptyState scene="data" title="暂无问题" />
              )}
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title={<><BarChartOutlined /> 问题类别分布</>}>
              {categoryDistData.length > 0 ? (
                <ComparisonChart data={categoryDistData} horizontal height={280} />
              ) : (
                <EmptyState scene="data" title="暂无数据" />
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* Tabs: Pages / Issues */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginTop: 8 }}
        items={[
          {
            key: 'overview',
            label: <span><GlobalOutlined /> 概览</span>,
            children: (
              <>
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Card title="页面列表"
                      extra={
                        <Space>
                          <Input.Search
                            placeholder="搜索URL..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            onSearch={() => { setPagePage(1); loadPages(1, pageSize, statusCodeFilter, searchFilter); }}
                            style={{ width: 220 }}
                            allowClear
                          />
                          <Select placeholder="状态码" allowClear style={{ width: 130 }}
                            value={statusCodeFilter}
                            onChange={(v) => { setStatusCodeFilter(v); setPagePage(1); loadPages(1, pageSize, v, searchFilter); }}
                            options={[
                              { value: 200, label: '200 正常' },
                              { value: 301, label: '301 重定向' },
                              { value: 404, label: '404 未找到' },
                              { value: 500, label: '500 服务错误' },
                            ]}
                          />
                        </Space>
                      }
                    >
                      {pages.length === 0 ? (
                        <EmptyState
                          scene="data"
                          title="暂无页面数据"
                          description="配置URL并点击「开始爬取」按钮获取页面数据"
                          action={{ text: '开始爬取', icon: <PlayCircleOutlined />, onClick: handleStartCrawl, loading: crawling }}
                        />
                      ) : (
                        <Table columns={pageColumns} dataSource={pages} rowKey="id"
                          pagination={{ current: pagePage, pageSize, total: pageTotal, showSizeChanger: true,
                            showTotal: (t) => `共 ${t} 个页面`,
                            onChange: (p, ps) => { setPagePage(p); setPageSize(ps); loadPages(p, ps, statusCodeFilter, searchFilter); },
                          }}
                          size="middle" scroll={{ x: 1400 }}
                        />
                      )}
                    </Card>
                  </Col>
                </Row>
              </>
            ),
          },
          {
            key: 'pages',
            label: <span><FileSearchOutlined /> 页面详情</span>,
            children: (
              <Card
                extra={
                  <Space>
                    <Input.Search
                      placeholder="搜索URL..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      onSearch={() => { setPagePage(1); loadPages(1, pageSize, statusCodeFilter, searchFilter); }}
                      style={{ width: 220 }}
                      allowClear
                    />
                    <Select placeholder="状态码" allowClear style={{ width: 130 }}
                      value={statusCodeFilter}
                      onChange={(v) => { setStatusCodeFilter(v); setPagePage(1); loadPages(1, pageSize, v, searchFilter); }}
                      options={[
                        { value: 200, label: '200 正常' },
                        { value: 301, label: '301 重定向' },
                        { value: 404, label: '404 未找到' },
                        { value: 500, label: '500 服务错误' },
                      ]}
                    />
                  </Space>
                }
              >
                {pages.length === 0 ? (
                  <EmptyState scene="data" title="暂无页面数据" description="开始爬取后将在此显示页面详情" />
                ) : (
                  <Table columns={pageColumns} dataSource={pages} rowKey="id"
                    pagination={{ current: pagePage, pageSize, total: pageTotal, showSizeChanger: true,
                      showTotal: (t) => `共 ${t} 个页面`,
                      onChange: (p, ps) => { setPagePage(p); setPageSize(ps); loadPages(p, ps, statusCodeFilter, searchFilter); },
                    }}
                    size="middle" scroll={{ x: 1400 }}
                  />
                )}
              </Card>
            ),
          },
          {
            key: 'issues',
            label: <span><BugOutlined /> 问题列表</span>,
            children: (
              <Card
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
                {issues.length === 0 ? (
                  <EmptyState scene="data" title="暂无问题" description="爬取页面后将检测并显示SEO问题" />
                ) : (
                  <Table columns={issueColumns} dataSource={issues} rowKey="id"
                    pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 个问题` }}
                    size="middle"
                  />
                )}
              </Card>
            ),
          },
        ]}
      />

      {/* Issue Detail Drawer */}
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
              <Paragraph style={{ marginTop: 4 }}>{selectedIssue.description || '暂无描述'}</Paragraph>
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
                {selectedIssue.suggestion || '暂无修复建议'}
              </Paragraph>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default CrawlAudit;