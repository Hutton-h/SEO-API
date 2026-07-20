import React, { useState, useCallback, useEffect } from 'react';
import {
  Card, Row, Col, Table, Button, Form, Input, Typography, Space,
  Tag, Progress, message, Divider, Descriptions, List, Tooltip,
} from 'antd';
import {
  GlobalOutlined, SearchOutlined, RiseOutlined, DollarOutlined,
  TrophyOutlined, HistoryOutlined, ReloadOutlined, SafetyCertificateOutlined,
  MobileOutlined, CodeOutlined, KeyOutlined, PieChartOutlined,
  ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { useStore } from '@/store';
import { useProject } from '@/hooks';
import { domainOverviewAPI } from '@/services/domainOverview';
import type { DomainOverviewData, DomainOverviewHistory } from '@/services/domainOverview';

const { Text, Title, Paragraph } = Typography;

// ============================================================================
// Types
// ============================================================================

interface TopKeyword {
  keyword: string;
  position: number;
  searchVolume: number;
  url: string;
}

// ============================================================================
// Constants
// ============================================================================

const getRankColor = (position: number): string => {
  if (position <= 3) return 'green';
  if (position <= 10) return 'blue';
  if (position <= 20) return 'orange';
  return 'red';
};

const getRankLabel = (position: number): string => {
  if (position <= 3) return 'Top 3';
  if (position <= 10) return 'Top 10';
  if (position <= 20) return 'Top 20';
  if (position <= 50) return 'Top 50';
  if (position <= 100) return 'Top 100';
  return '100+';
};

const formatTrafficValue = (cost: number): string => {
  if (cost >= 1000000) return `$${(cost / 1000000).toFixed(2)}M`;
  if (cost >= 1000) return `$${(cost / 1000).toFixed(1)}K`;
  return `$${cost.toFixed(0)}`;
};

// ============================================================================
// Component
// ============================================================================

const DomainOverview: React.FC = () => {
  const { hasProject, project, projectId } = useProject();
  const selectedCountry = useStore((s) => s.selectedCountry);

  // ---- Form state ----
  const [form] = Form.useForm();
  const [domain, setDomain] = useState('');

  // ---- Main data state ----
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<DomainOverviewData | null>(null);

  // ---- History state ----
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<DomainOverviewHistory[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(5);

  // ==========================================================================
  // Data loading
  // ==========================================================================

  const loadDomainOverview = useCallback(async (domainName: string) => {
    if (!domainName.trim()) {
      message.warning('请输入域名');
      return;
    }

    setLoading(true);
    setError(null);
    setOverview(null);

    try {
      const res = await domainOverviewAPI.getDomainOverview({
        domain: domainName.trim(),
        locationCode: selectedCountry ? Number(selectedCountry.code) : undefined,
      });
      setOverview(res);
      message.success(`域名 ${domainName} 分析完成`);

      // Refresh history after successful lookup
      loadHistory(1, historyPageSize);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '域名分析失败';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry, historyPageSize]);

  const loadHistory = useCallback(async (page: number, pageSize: number) => {
    setHistoryLoading(true);
    try {
      const res = await domainOverviewAPI.getOverviewHistory({ page, pageSize });
      const list = res?.data || [];
      const total = res?.total || list.length;
      setHistoryData(list);
      setHistoryTotal(total);
    } catch {
      setHistoryData([]);
      setHistoryTotal(0);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasProject) {
      loadHistory(1, historyPageSize);
    }
  }, [hasProject, loadHistory, historyPageSize]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleQuery = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const domainName = values.domain;
      setDomain(domainName);
      await loadDomainOverview(domainName);
    } catch (err: any) {
      if (err?.errorFields) return;
    }
  }, [form, loadDomainOverview]);

  const handleReset = useCallback(() => {
    form.resetFields();
    setDomain('');
    setOverview(null);
    setError(null);
  }, [form]);

  const handleHistoryItemClick = useCallback((item: DomainOverviewHistory) => {
    form.setFieldsValue({ domain: item.domain });
    setDomain(item.domain);
    loadDomainOverview(item.domain);
  }, [form, loadDomainOverview]);

  const handleHistoryTableChange = (pagination: any) => {
    setHistoryPage(pagination.current);
    setHistoryPageSize(pagination.pageSize);
    loadHistory(pagination.current, pagination.pageSize);
  };

  // ==========================================================================
  // Ranking distribution progress data
  // ==========================================================================

  const rankingDistribution = overview?.rankingDistribution;
  const maxRankingCount = rankingDistribution
    ? Math.max(rankingDistribution.top3, rankingDistribution.top10, rankingDistribution.top50, rankingDistribution.top100, 1)
    : 1;

  const rankingItems = rankingDistribution ? [
    { label: 'Top 3', count: rankingDistribution.top3, color: '#52c41a' },
    { label: 'Top 10', count: rankingDistribution.top10, color: '#1677ff' },
    { label: 'Top 50', count: rankingDistribution.top50, color: '#faad14' },
    { label: 'Top 100', count: rankingDistribution.top100, color: '#ff4d4f' },
  ] : [];

  // ==========================================================================
  // Top keywords columns
  // ==========================================================================

  const topKeywordColumns = [
    {
      title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 200,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '排名', dataIndex: 'position', key: 'position', width: 80,
      sorter: (a: TopKeyword, b: TopKeyword) => (a.position || 0) - (b.position || 0),
      render: (pos: number) => {
        const color = getRankColor(pos);
        const label = getRankLabel(pos);
        return <Tag color={color}>{pos}</Tag>;
      },
    },
    {
      title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 100,
      sorter: (a: TopKeyword, b: TopKeyword) => (a.searchVolume || 0) - (b.searchVolume || 0),
      render: (val: number) => (val ?? 0).toLocaleString(),
    },
    {
      title: 'URL', dataIndex: 'url', key: 'url', ellipsis: true,
      render: (url: string) => (
        <Tooltip title={url}>
          <Text type="secondary" style={{ fontSize: 12, maxWidth: 300 }} ellipsis>
            {url}
          </Text>
        </Tooltip>
      ),
    },
  ];

  // ==========================================================================
  // History columns
  // ==========================================================================

  const historyColumns = [
    {
      title: '域名', dataIndex: 'domain', key: 'domain', width: 200,
      render: (text: string) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => {
          const item = historyData.find((h) => h.domain === text);
          if (item) handleHistoryItemClick(item);
        }}>
          <GlobalOutlined style={{ marginRight: 6 }} />
          {text}
        </Button>
      ),
    },
    {
      title: '关键词数', dataIndex: 'totalKeywords', key: 'totalKeywords', width: 100,
      render: (val: number) => (val ?? 0).toLocaleString(),
    },
    {
      title: '预估流量', dataIndex: 'estimatedTraffic', key: 'estimatedTraffic', width: 110,
      render: (val: number) => (val ?? 0).toLocaleString(),
    },
    {
      title: '分析时间', dataIndex: 'analyzedAt', key: 'analyzedAt', width: 160,
      render: (val: string) => (
        <Text type="secondary">
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          {val ? new Date(val).toLocaleString('zh-CN') : '--'}
        </Text>
      ),
    },
  ];

  // ==========================================================================
  // State: no project
  // ==========================================================================

  if (!hasProject) {
    return (
      <div className="page-container">
        <PageHeader
          title="域名总览"
          subtitle="查询任意域名的完整SEO画像"
          showCountrySelector
        />
        <EmptyState
          scene="data"
          title="请先选择项目"
          description="选择一个项目或创建新项目，开始域名分析"
        />
      </div>
    );
  }

  // ==========================================================================
  // State: loading
  // ==========================================================================

  if (loading && !overview) {
    return (
      <div className="page-container">
        <PageHeader
          title="域名总览"
          subtitle={`项目: ${project?.name || ''}`}
          showCountrySelector
        />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ==========================================================================
  // State: error
  // ==========================================================================

  if (error && !overview) {
    return (
      <div className="page-container">
        <PageHeader
          title="域名总览"
          subtitle={`项目: ${project?.name || ''}`}
          showCountrySelector
        />
        <ErrorState message={error} onRetry={() => domain && loadDomainOverview(domain)} />
      </div>
    );
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="page-container">
      <PageHeader
        title="域名总览"
        subtitle={`项目: ${project?.name || ''} (${project?.domain || ''})`}
        showCountrySelector
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Space>
        }
      />

      {/* ---- Form Section ---- */}
      <Card style={{ marginBottom: 24, borderRadius: 8 }}>
        <Title level={5} style={{ marginBottom: 16 }}>
          <SearchOutlined style={{ marginRight: 8 }} />
          查询域名SEO画像
        </Title>
        <Form form={form} layout="vertical">
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="domain"
                label="域名"
                rules={[{ required: true, message: '请输入域名' }]}
              >
                <Input
                  placeholder="例如 example.com"
                  prefix={<GlobalOutlined />}
                  size="middle"
                  onPressEnter={handleQuery}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="locationCode" label="地区代码（可选）">
                <Input
                  placeholder={`当前: ${selectedCountry?.name || 'United States'} (${selectedCountry?.code || '2840'})`}
                  size="middle"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={8} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 24 }}>
              <Space>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleQuery}
                  loading={loading}
                  size="middle"
                >
                  查询
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset} disabled={loading}>
                  重置
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* ---- History List ---- */}
      {historyData.length > 0 && (
        <Card
          title={<span><HistoryOutlined /> 最近查询记录</span>}
          style={{ marginBottom: 24, borderRadius: 8 }}
          size="small"
        >
          <Table
            columns={historyColumns}
            dataSource={historyData}
            rowKey="id"
            loading={historyLoading}
            onChange={handleHistoryTableChange}
            pagination={{
              current: historyPage,
              pageSize: historyPageSize,
              total: historyTotal,
              showSizeChanger: false,
              size: 'small',
              showTotal: (t) => `共 ${t} 条记录`,
            }}
            size="small"
            scroll={{ x: 600 }}
          />
        </Card>
      )}

      {/* ---- Empty State (no results yet) ---- */}
      {!overview && !loading && !error && (
        <EmptyState
          scene="search"
          title="开始域名分析"
          description="输入一个域名并点击「查询」，获取该域名的完整SEO画像，包括关键词、流量、排名分布和域名指标"
        />
      )}

      {/* ---- Results ---- */}
      {overview && !loading && (
        <div>
          {/* Domain Info Header */}
          <div style={{ marginBottom: 24 }}>
            <Title level={4} style={{ margin: 0 }}>
              <GlobalOutlined style={{ marginRight: 8, color: '#1677ff' }} />
              {overview.domain}
            </Title>
            <Text type="secondary">
              分析时间: {overview.analyzedAt ? new Date(overview.analyzedAt).toLocaleString('zh-CN') : '--'}
            </Text>
          </div>

          {/* KPI StatCards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <StatCard
                title="总关键词数"
                value={(overview.totalKeywords || 0).toLocaleString()}
                icon={<KeyOutlined />}
                color="#1677ff"
                subtitle="该域名的有机关键词总数"
              />
            </Col>
            <Col xs={12} sm={6}>
              <StatCard
                title="预估流量"
                value={(overview.estimatedTraffic || 0).toLocaleString()}
                icon={<RiseOutlined />}
                color="#52c41a"
                suffix=" 次/月"
                subtitle="基于关键词排名估算的月流量"
              />
            </Col>
            <Col xs={12} sm={6}>
              <StatCard
                title="流量价值"
                value={formatTrafficValue(overview.trafficValue || 0)}
                icon={<DollarOutlined />}
                color="#fa8c16"
                subtitle="等价于PPC广告的月支出"
              />
            </Col>
            <Col xs={12} sm={6}>
              <StatCard
                title="排名分布"
                value={`${rankingDistribution?.top3 || 0}`}
                icon={<TrophyOutlined />}
                color="#722ed1"
                subtitle="Top 3 关键词"
              />
            </Col>
          </Row>

          <Divider />

          <Row gutter={[16, 16]}>
            {/* ---- Left Column ---- */}
            <Col xs={24} lg={14}>
              {/* 排名分布 */}
              <Card
                title={<span><PieChartOutlined /> 排名分布</span>}
                style={{ marginBottom: 16, borderRadius: 8 }}
              >
                {rankingItems.length > 0 ? (
                  <div style={{ padding: '8px 0' }}>
                    {rankingItems.map((item) => (
                      <div key={item.label} style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text strong>{item.label}</Text>
                          <Text>{item.count.toLocaleString()} 个关键词</Text>
                        </div>
                        <Progress
                          percent={Math.round((item.count / maxRankingCount) * 100)}
                          strokeColor={item.color}
                          showInfo={false}
                          size="small"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState scene="data" description="暂无排名分布数据" />
                )}
              </Card>

              {/* 顶级关键词 */}
              <Card
                title={<span><TrophyOutlined /> 顶级关键词</span>}
                style={{ borderRadius: 8 }}
              >
                {overview.topKeywords && overview.topKeywords.length > 0 ? (
                  <Table
                    columns={topKeywordColumns}
                    dataSource={overview.topKeywords}
                    rowKey="keyword"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showTotal: (t) => `共 ${t} 个顶级关键词`,
                    }}
                    size="middle"
                    scroll={{ x: 600 }}
                  />
                ) : (
                  <EmptyState scene="data" description="暂无顶级关键词数据" />
                )}
              </Card>
            </Col>

            {/* ---- Right Column ---- */}
            <Col xs={24} lg={10}>
              {/* 域名指标 */}
              <Card
                title={<span><CodeOutlined /> 域名指标</span>}
                style={{ borderRadius: 8 }}
              >
                {overview.domainMetrics ? (
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label={<><SafetyCertificateOutlined /> SSL</>}> 
                      <Tag color={overview.domainMetrics.ssl ? 'green' : 'red'} icon={overview.domainMetrics.ssl ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
                        {overview.domainMetrics.ssl ? '已启用' : '未启用'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={<><MobileOutlined /> 响应式</>}>
                      <Tag color={overview.domainMetrics.responsive ? 'green' : 'red'} icon={overview.domainMetrics.responsive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
                        {overview.domainMetrics.responsive ? '是' : '否'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="技术栈">
                      {overview.domainMetrics.technologies && overview.domainMetrics.technologies.length > 0 ? (
                        <Space wrap size={[4, 4]}>
                          {overview.domainMetrics.technologies.map((tech: string) => (
                            <Tag key={tech} color="blue">{tech}</Tag>
                          ))}
                        </Space>
                      ) : (
                        <Text type="secondary">未检测到</Text>
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                ) : (
                  <EmptyState
                    scene="data"
                    description="暂无域名指标数据"
                    style={{ minHeight: 120, padding: '20px' }}
                  />
                )}
              </Card>

              {/* Domain quick stats */}
              {overview.totalKeywords > 0 && (
                <Card style={{ marginTop: 16, borderRadius: 8 }}>
                  <Title level={5} style={{ marginBottom: 16 }}>
                    <RiseOutlined style={{ marginRight: 8 }} />
                    概览统计
                  </Title>
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="总关键词">
                      <Text strong>{(overview.totalKeywords || 0).toLocaleString()}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="月度流量">
                      <Text strong>{(overview.estimatedTraffic || 0).toLocaleString()} 次</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="流量价值">
                      <Text strong>{formatTrafficValue(overview.trafficValue || 0)}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Top 3 关键词">
                      <Tag color="green">{rankingDistribution?.top3 || 0}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Top 10 关键词">
                      <Tag color="blue">{rankingDistribution?.top10 || 0}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="分析时间">
                      <Text type="secondary">
                        {overview.analyzedAt ? new Date(overview.analyzedAt).toLocaleString('zh-CN') : '--'}
                      </Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              )}
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
};

export default DomainOverview;