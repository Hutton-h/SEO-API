import React, { useState, useCallback, useMemo } from 'react';
import {
  Card, Row, Col, Table, Button, Form, Input, InputNumber, Typography, Space,
  Tag, message, Divider, Modal, Descriptions, Tooltip,
} from 'antd';
import {
  FileTextOutlined, LinkOutlined, RiseOutlined, EyeOutlined,
  SearchOutlined, ReloadOutlined, GlobalOutlined, TrophyOutlined,
  KeyOutlined, BarChartOutlined, ArrowUpOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { useStore } from '@/store';
import { useProject } from '@/hooks';
import { topPagesAPI } from '@/services/topPages';
import type { TopPageItem, TopPagesResult } from '@/services/topPages';

const { Text, Title, Paragraph } = Typography;

// ============================================================================
// Types
// ============================================================================

interface PageDetail extends TopPageItem {
  domain: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LIMIT = 50;

const getPositionColor = (position: number): string => {
  if (position <= 3) return 'green';
  if (position <= 10) return 'blue';
  if (position <= 20) return 'orange';
  return 'red';
};

const getPositionLabel = (position: number): string => {
  if (position <= 3) return 'Top 3';
  if (position <= 10) return 'Top 10';
  if (position <= 20) return 'Top 20';
  if (position <= 50) return 'Top 50';
  return '100+';
};

const formatUrl = (url: string): string => {
  if (!url) return '--';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.pathname + parsed.search || '/';
  } catch {
    return url;
  }
};

const formatFullUrl = (url: string): string => {
  if (!url) return '--';
  return url.startsWith('http') ? url : `https://${url}`;
};

// ============================================================================
// Component
// ============================================================================

const TopPages: React.FC = () => {
  const { hasProject, project, projectId } = useProject();
  const selectedCountry = useStore((s) => s.selectedCountry);

  // ---- Form state ----
  const [form] = Form.useForm();
  const [domain, setDomain] = useState('');

  // ---- Main data state ----
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TopPagesResult | null>(null);
  const [sortField, setSortField] = useState<string>('estimatedTraffic');
  const [sortOrder, setSortOrder] = useState<string>('descend');

  // ---- Detail modal state ----
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<PageDetail | null>(null);

  // ==========================================================================
  // Data loading
  // ==========================================================================

  const loadTopPages = useCallback(async (domainName: string, limit: number) => {
    if (!domainName.trim()) {
      message.warning('请输入域名');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await topPagesAPI.getTopPages({
        domain: domainName.trim(),
        locationCode: selectedCountry ? Number(selectedCountry.code) : undefined,
        limit,
      });
      setResult(res);
      message.success(`成功获取 ${res.pages?.length || 0} 个流量页面`);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '获取流量页面失败';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedCountry]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleQuery = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const domainName = values.domain;
      const limit = values.limit || DEFAULT_LIMIT;
      setDomain(domainName);
      await loadTopPages(domainName, limit);
    } catch (err: any) {
      if (err?.errorFields) return;
    }
  }, [form, loadTopPages]);

  const handleReset = useCallback(() => {
    form.resetFields();
    setDomain('');
    setResult(null);
    setError(null);
  }, [form]);

  const handleRowClick = useCallback((record: TopPageItem) => {
    setSelectedPage({
      ...record,
      domain: domain || result?.domain || '',
    });
    setDetailModalOpen(true);
  }, [domain, result]);

  const handleTableChange = (_pagination: any, _filters: any, sorter: any) => {
    if (sorter.field) {
      setSortField(sorter.field);
      setSortOrder(sorter.order || '');
    }
  };

  // ==========================================================================
  // Computed stats
  // ==========================================================================

  const pages = result?.pages || [];
  const totalPages = result?.totalPages || pages.length;

  const totalTraffic = useMemo(() => {
    return pages.reduce((sum: number, page: TopPageItem) => sum + (page.estimatedTraffic || 0), 0);
  }, [pages]);

  const totalKeywords = useMemo(() => {
    return pages.reduce((sum: number, page: TopPageItem) => sum + (page.keywordCount || 0), 0);
  }, [pages]);

  const avgPosition = useMemo(() => {
    if (pages.length === 0) return 0;
    const sum = pages.reduce((s: number, page: TopPageItem) => s + (page.avgPosition || 0), 0);
    return sum / pages.length;
  }, [pages]);

  const topTrafficPage = useMemo(() => {
    if (pages.length === 0) return null;
    return pages.reduce((best: TopPageItem, page: TopPageItem) =>
      (page.estimatedTraffic || 0) > (best.estimatedTraffic || 0) ? page : best
    );
  }, [pages]);

  // ==========================================================================
  // Columns
  // ==========================================================================

  const columns = [
    {
      title: 'URL', dataIndex: 'url', key: 'url', width: 280,
      render: (url: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LinkOutlined style={{ color: '#1677ff', flexShrink: 0 }} />
          <Tooltip title={formatFullUrl(url)}>
            <a
              href={formatFullUrl(url)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#1677ff',
                fontSize: 13,
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 240,
                display: 'inline-block',
              }}
            >
              {formatUrl(url)}
            </a>
          </Tooltip>
        </div>
      ),
    },
    {
      title: '关键词数', dataIndex: 'keywordCount', key: 'keywordCount', width: 100,
      sorter: (a: TopPageItem, b: TopPageItem) => (a.keywordCount || 0) - (b.keywordCount || 0),
      render: (val: number) => <Text strong>{(val ?? 0).toLocaleString()}</Text>,
    },
    {
      title: '预估流量', dataIndex: 'estimatedTraffic', key: 'estimatedTraffic', width: 120,
      sorter: (a: TopPageItem, b: TopPageItem) => (a.estimatedTraffic || 0) - (b.estimatedTraffic || 0),
      defaultSortOrder: 'descend' as const,
      render: (val: number) => {
        const formatted = (val ?? 0).toLocaleString();
        return (
          <Text strong style={{ color: '#1677ff' }}>
            <RiseOutlined style={{ marginRight: 4 }} />
            {formatted}
          </Text>
        );
      },
    },
    {
      title: '顶级关键词', dataIndex: 'topKeyword', key: 'topKeyword', width: 180,
      render: (text: string) => text ? <Text>{text}</Text> : <Text type="secondary">--</Text>,
    },
    {
      title: '顶级词排名', dataIndex: 'topKeywordPosition', key: 'topKeywordPosition', width: 110,
      sorter: (a: TopPageItem, b: TopPageItem) => (a.topKeywordPosition || 0) - (b.topKeywordPosition || 0),
      render: (pos: number) => {
        if (!pos) return <Tag>--</Tag>;
        const color = getPositionColor(pos);
        const label = getPositionLabel(pos);
        return <Tag color={color}>{pos}</Tag>;
      },
    },
    {
      title: '顶级词搜索量', dataIndex: 'topKeywordVolume', key: 'topKeywordVolume', width: 120,
      sorter: (a: TopPageItem, b: TopPageItem) => (a.topKeywordVolume || 0) - (b.topKeywordVolume || 0),
      render: (val: number) => (val ?? 0).toLocaleString(),
    },
    {
      title: '平均排名', dataIndex: 'avgPosition', key: 'avgPosition', width: 100,
      sorter: (a: TopPageItem, b: TopPageItem) => (a.avgPosition || 0) - (b.avgPosition || 0),
      render: (pos: number) => {
        if (!pos) return <Tag>--</Tag>;
        const color = getPositionColor(Math.round(pos));
        return <Tag color={color}>{pos.toFixed(1)}</Tag>;
      },
    },
    {
      title: '操作', key: 'actions', width: 80, fixed: 'right' as const,
      render: (_: any, record: TopPageItem) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(record);
          }}
        >
          详情
        </Button>
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
          title="流量页面"
          subtitle="查看域名下流量最高的页面"
          showCountrySelector
        />
        <EmptyState
          scene="data"
          title="请先选择项目"
          description="选择一个项目或创建新项目，开始分析流量页面"
        />
      </div>
    );
  }

  // ==========================================================================
  // State: loading
  // ==========================================================================

  if (loading && !result) {
    return (
      <div className="page-container">
        <PageHeader
          title="流量页面"
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

  if (error && !result) {
    return (
      <div className="page-container">
        <PageHeader
          title="流量页面"
          subtitle={`项目: ${project?.name || ''}`}
          showCountrySelector
        />
        <ErrorState message={error} onRetry={() => domain && loadTopPages(domain, DEFAULT_LIMIT)} />
      </div>
    );
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="page-container">
      <PageHeader
        title="流量页面"
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
          查询域名流量页面
        </Title>
        <Form form={form} layout="vertical" initialValues={{ limit: DEFAULT_LIMIT }}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={10} md={8}>
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
            <Col xs={12} sm={6} md={6}>
              <Form.Item name="locationCode" label="地区代码（可选）">
                <Input
                  placeholder={`当前: ${selectedCountry?.code || '2840'}`}
                  size="middle"
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={4} md={4}>
              <Form.Item
                name="limit"
                label="返回数量"
                rules={[{ type: 'number', min: 1, max: 500, message: '1-500' }]}
              >
                <InputNumber
                  placeholder={`默认 ${DEFAULT_LIMIT}`}
                  min={1}
                  max={500}
                  style={{ width: '100%' }}
                  size="middle"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={4} md={6} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 24 }}>
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

      {/* ---- Empty State (no results yet) ---- */}
      {!result && !loading && !error && (
        <EmptyState
          scene="search"
          title="开始流量页面分析"
          description="输入一个域名并点击「查询」，获取该域名下流量最高的页面列表，包括各页面的关键词数、预估流量、顶级关键词和平均排名"
        />
      )}

      {/* ---- Results ---- */}
      {result && !loading && (
        <div>
          {/* Domain Info */}
          <div style={{ marginBottom: 24 }}>
            <Title level={4} style={{ margin: 0 }}>
              <GlobalOutlined style={{ marginRight: 8, color: '#1677ff' }} />
              {result.domain || domain}
            </Title>
            <Text type="secondary">
              分析时间: {result.analyzedAt ? new Date(result.analyzedAt).toLocaleString('zh-CN') : '--'}
              {' '}|{' '}
              共 {totalPages} 个页面
            </Text>
          </div>

          {/* KPI StatCards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <StatCard
                title="页面总数"
                value={totalPages}
                icon={<FileTextOutlined />}
                color="#1677ff"
                subtitle="分析的流量页面数"
              />
            </Col>
            <Col xs={12} sm={6}>
              <StatCard
                title="总流量"
                value={totalTraffic.toLocaleString()}
                icon={<RiseOutlined />}
                color="#52c41a"
                suffix=" 次/月"
                subtitle="所有页面预估月流量之和"
              />
            </Col>
            <Col xs={12} sm={6}>
              <StatCard
                title="总关键词"
                value={totalKeywords.toLocaleString()}
                icon={<KeyOutlined />}
                color="#fa8c16"
                subtitle="所有页面覆盖的关键词总数"
              />
            </Col>
            <Col xs={12} sm={6}>
              <StatCard
                title="平均排名"
                value={avgPosition.toFixed(1)}
                icon={<BarChartOutlined />}
                color="#722ed1"
                subtitle="所有页面关键词的平均排名"
              />
            </Col>
          </Row>

          {/* Top Traffic Page Highlight */}
          {topTrafficPage && (
            <Card style={{ marginBottom: 24, borderRadius: 8, borderLeft: '4px solid #1677ff' }}>
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={16}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrophyOutlined style={{ color: '#faad14', fontSize: 20 }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>最高流量页面</Text>
                      <br />
                      <a
                        href={formatFullUrl(topTrafficPage.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 15, fontWeight: 600, color: '#1677ff' }}
                      >
                        <LinkOutlined style={{ marginRight: 6 }} />
                        {formatUrl(topTrafficPage.url)}
                      </a>
                    </div>
                  </div>
                </Col>
                <Col xs={12} sm={4}>
                  <StatisticItem label="预估流量" value={topTrafficPage.estimatedTraffic.toLocaleString()} suffix="次/月" />
                </Col>
                <Col xs={12} sm={4}>
                  <StatisticItem label="关键词数" value={topTrafficPage.keywordCount.toLocaleString()} />
                </Col>
              </Row>
            </Card>
          )}

          <Divider />

          {/* Pages Table */}
          <Card
            title={<span><FileTextOutlined /> 流量页面列表 ({totalPages})</span>}
            style={{ borderRadius: 8 }}
          >
            {pages.length > 0 ? (
              <Table
                columns={columns}
                dataSource={pages}
                rowKey="url"
                onChange={handleTableChange}
                onRow={(record) => ({
                  onClick: () => handleRowClick(record),
                  style: { cursor: 'pointer' },
                })}
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (t) => `共 ${t} 个页面`,
                  pageSizeOptions: ['10', '20', '50', '100'],
                }}
                size="middle"
                scroll={{ x: 1100 }}
              />
            ) : (
              <EmptyState scene="data" description="该域名下暂无流量页面数据" />
            )}
          </Card>
        </div>
      )}

      {/* ---- Detail Modal ---- */}
      <Modal
        title={
          <span>
            <FileTextOutlined style={{ marginRight: 8 }} />
            页面详情
          </span>
        }
        open={detailModalOpen}
        onCancel={() => { setDetailModalOpen(false); setSelectedPage(null); }}
        footer={
          <Button onClick={() => { setDetailModalOpen(false); setSelectedPage(null); }}>
            关闭
          </Button>
        }
        width={640}
        destroyOnClose
      >
        {selectedPage && (
          <div>
            {/* URL */}
            <div style={{ marginBottom: 20, padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>URL</Text>
              <a
                href={formatFullUrl(selectedPage.url)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 14, fontFamily: 'monospace', wordBreak: 'break-all' }}
              >
                <LinkOutlined style={{ marginRight: 6 }} />
                {formatFullUrl(selectedPage.url)}
              </a>
            </div>

            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="关键词数">
                <Text strong style={{ fontSize: 16 }}>{(selectedPage.keywordCount || 0).toLocaleString()}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="预估流量">
                <Text strong style={{ fontSize: 16, color: '#1677ff' }}>
                  <RiseOutlined style={{ marginRight: 4 }} />
                  {(selectedPage.estimatedTraffic || 0).toLocaleString()} 次/月
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="顶级关键词">
                <Text strong>{selectedPage.topKeyword || '--'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="顶级关键词排名">
                {selectedPage.topKeywordPosition ? (
                  <Tag color={getPositionColor(selectedPage.topKeywordPosition)}>
                    {selectedPage.topKeywordPosition}
                  </Tag>
                ) : (
                  <Tag>--</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="顶级关键词搜索量">
                <Text strong>{(selectedPage.topKeywordVolume || 0).toLocaleString()}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="平均排名">
                {selectedPage.avgPosition ? (
                  <Tag color={getPositionColor(Math.round(selectedPage.avgPosition))}>
                    {selectedPage.avgPosition.toFixed(1)}
                  </Tag>
                ) : (
                  <Tag>--</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>

            {/* Navigate to page */}
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <Button
                type="primary"
                icon={<LinkOutlined />}
                href={formatFullUrl(selectedPage.url)}
                target="_blank"
                rel="noopener noreferrer"
              >
                在新标签页中打开
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ============================================================================
// Helper: Inline statistic display
// ============================================================================

const StatisticItem: React.FC<{ label: string; value: string | number; suffix?: string }> = ({
  label,
  value,
  suffix,
}) => (
  <div style={{ textAlign: 'center' }}>
    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>
      {label}
    </Text>
    <Text strong style={{ fontSize: 18, color: '#1a1a1a' }}>
      {value}
      {suffix && <Text type="secondary" style={{ fontSize: 12, marginLeft: 2 }}>{suffix}</Text>}
    </Text>
  </div>
);

export default TopPages;