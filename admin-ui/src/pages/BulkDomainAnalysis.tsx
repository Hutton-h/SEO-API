import React, { useState, useCallback, useMemo } from 'react';
import {
  Card, Table, Button, Tag, Typography, Row, Col,
  Space, Input, Select, message, Progress, Tooltip,
  Divider, Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import {
  ThunderboltOutlined, DownloadOutlined, BarChartOutlined,
  GlobalOutlined, LinkOutlined, SearchOutlined,
  TrophyOutlined, RiseOutlined, FireOutlined,
  ArrowUpOutlined, ArrowDownOutlined, CheckCircleOutlined,
  LoadingOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { ComparisonChart } from '@/components/charts';
import { useStore } from '@/store';
import { bulkAnalysisAPI } from '@/services/bulkAnalysis';
import type { BulkDomainItem, BulkDomainResult } from '@/services/bulkAnalysis';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

// ============================================================================
// Constants
// ============================================================================

const LOCATION_OPTIONS = [
  { value: 2840, label: '美国 (US)' },
  { value: 2826, label: '英国 (GB)' },
  { value: 2276, label: '德国 (DE)' },
  { value: 2152, label: '中国 (CN)' },
  { value: 2392, label: '日本 (JP)' },
  { value: 2356, label: '印度 (IN)' },
  { value: 2076, label: '巴西 (BR)' },
  { value: 2250, label: '法国 (FR)' },
  { value: 2380, label: '加拿大 (CA)' },
  { value: 2036, label: '澳大利亚 (AU)' },
];

const MAX_DOMAINS = 50;

const COLOR_PALETTE = [
  '#1677ff', '#52c41a', '#faad14', '#ff4d4f',
  '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16',
];

// ============================================================================
// Helpers
// ============================================================================

const formatNumber = (n: number | undefined | null): string => {
  if (n === undefined || n === null) return '--';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
};

const getDAcolor = (da: number | undefined): string => {
  if (!da) return '#d9d9d9';
  if (da >= 50) return '#52c41a';
  if (da >= 30) return '#faad14';
  return '#ff4d4f';
};

// ============================================================================
// Component
// ============================================================================

const BulkDomainAnalysis: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const projectName = useStore((s) => s.currentProject?.name || '');
  const selectedCountry = useStore((s) => s.selectedCountry);

  // ---- State ----
  const [domainsInput, setDomainsInput] = useState('');
  const [locationCode, setLocationCode] = useState<number>(2840);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkDomainResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressInterval, setProgressInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // ---- Table sort state ----
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('');

  // ---- Derived: parsed domains ----
  const parsedDomains = useMemo(() => {
    return domainsInput
      .split(/[\n,;]+/)
      .map((s) => s.trim().replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, ''))
      .filter(Boolean);
  }, [domainsInput]);

  const domainCount = parsedDomains.length;
  const isOverLimit = domainCount > MAX_DOMAINS;

  // ---- KPI stats ----
  const totalKeywords = useMemo(() => {
    if (!result?.domains) return 0;
    return result.domains.reduce((sum, d) => sum + (d.totalKeywords || 0), 0);
  }, [result]);

  const totalTraffic = useMemo(() => {
    if (!result?.domains) return 0;
    return result.domains.reduce((sum, d) => sum + (d.estimatedTraffic || 0), 0);
  }, [result]);

  const totalBacklinks = useMemo(() => {
    if (!result?.domains) return 0;
    return result.domains.reduce((sum, d) => sum + (d.backlinks || 0), 0);
  }, [result]);

  const avgDA = useMemo(() => {
    if (!result?.domains || result.domains.length === 0) return 0;
    const domainsWithDA = result.domains.filter((d) => d.domainAuthority !== undefined && d.domainAuthority !== null);
    if (domainsWithDA.length === 0) return 0;
    return Math.round(domainsWithDA.reduce((sum, d) => sum + (d.domainAuthority || 0), 0) / domainsWithDA.length);
  }, [result]);

  // ---- Actions ----
  const handleAnalyze = useCallback(async () => {
    if (parsedDomains.length === 0) {
      message.warning('请输入至少一个域名');
      return;
    }
    if (isOverLimit) {
      message.warning(`最多支持 ${MAX_DOMAINS} 个域名同时分析`);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          if (interval) clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 600);
    setProgressInterval(interval);

    try {
      const res: any = await bulkAnalysisAPI.bulkAnalyzeDomains({
        domains: parsedDomains,
        locationCode,
      });
      const data: BulkDomainResult = res?.data !== undefined ? res.data : res;
      setResult(data);
      setProgress(100);
      if (data?.domains?.length === 0) {
        message.info('分析完成，但未获取到数据');
      } else {
        message.success(`成功分析 ${data?.domains?.length ?? 0} 个域名`);
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.error?.message || err?.message || '批量分析请求失败';
      setError(errMsg);
      setProgress(0);
      message.error(errMsg);
    } finally {
      if (interval) clearInterval(interval);
      setProgressInterval(null);
      setLoading(false);
    }
  }, [parsedDomains, isOverLimit, locationCode]);

  // Cleanup interval on unmount
  React.useEffect(() => {
    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [progressInterval]);

  const handleDownloadCSV = useCallback(() => {
    if (!result?.domains || result.domains.length === 0) {
      message.warning('没有数据可下载');
      return;
    }

    const headers = [
      'domain', 'totalKeywords', 'estimatedTraffic', 'backlinks',
      'referringDomains', 'domainAuthority', 'topKeyword', 'topKeywordVolume',
    ];
    const rows = result.domains.map((d) => [
      d.domain,
      d.totalKeywords,
      d.estimatedTraffic,
      d.backlinks,
      d.referringDomains,
      d.domainAuthority ?? '',
      d.topKeyword,
      d.topKeywordVolume,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bulk-domain-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('CSV 文件已下载');
  }, [result]);

  const handleReset = useCallback(() => {
    setDomainsInput('');
    setResult(null);
    setError(null);
    setProgress(0);
    setSortField('');
    setSortOrder('');
  }, []);

  // ---- Comparison chart data ----
  const keywordComparisonData = useMemo(() => {
    if (!result?.domains) return [];
    return result.domains.map((d, idx) => ({
      name: d.domain,
      value: d.totalKeywords || 0,
      color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
    }));
  }, [result]);

  const trafficComparisonData = useMemo(() => {
    if (!result?.domains) return [];
    return result.domains.map((d, idx) => ({
      name: d.domain,
      value: d.estimatedTraffic || 0,
      color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
    }));
  }, [result]);

  // ---- Table columns ----
  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, any>,
    sorter: SorterResult<BulkDomainItem> | SorterResult<BulkDomainItem>[],
  ) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    if (s.field) {
      setSortField(s.field as string);
      setSortOrder(s.order === 'ascend' ? 'asc' : s.order === 'descend' ? 'desc' : '');
    } else {
      setSortField('');
      setSortOrder('');
    }
  };

  const columns: ColumnsType<BulkDomainItem> = useMemo(() => [
    {
      title: '域名', dataIndex: 'domain', key: 'domain', width: 220, fixed: 'left',
      sorter: true,
      render: (domain: string) => (
        <Space>
          <GlobalOutlined style={{ color: '#1677ff' }} />
          <Text strong>{domain}</Text>
        </Space>
      ),
    },
    {
      title: '关键词数', dataIndex: 'totalKeywords', key: 'totalKeywords', width: 120,
      sorter: true,
      render: (val: number) => (
        <Text strong style={{ color: '#1677ff' }}>{formatNumber(val)}</Text>
      ),
    },
    {
      title: '预估流量', dataIndex: 'estimatedTraffic', key: 'estimatedTraffic', width: 130,
      sorter: true,
      render: (val: number) => (
        <Text strong style={{ color: '#52c41a' }}>{formatNumber(val)}</Text>
      ),
    },
    {
      title: '外链数', dataIndex: 'backlinks', key: 'backlinks', width: 110,
      sorter: true,
      render: (val: number) => formatNumber(val),
    },
    {
      title: '引用域名', dataIndex: 'referringDomains', key: 'referringDomains', width: 110,
      sorter: true,
      render: (val: number) => formatNumber(val),
    },
    {
      title: 'DA', dataIndex: 'domainAuthority', key: 'domainAuthority', width: 80,
      sorter: true,
      render: (da: number | undefined) => {
        if (da === undefined || da === null) return <Tag>--</Tag>;
        const color = getDAcolor(da);
        return <Tag color={color}>{da}</Tag>;
      },
    },
    {
      title: 'Top关键词', dataIndex: 'topKeyword', key: 'topKeyword', width: 180, ellipsis: true,
      render: (text: string) => text ? <Text code>{text}</Text> : <Text type="secondary">--</Text>,
    },
    {
      title: 'Top关键词流量', dataIndex: 'topKeywordVolume', key: 'topKeywordVolume', width: 140,
      sorter: true,
      render: (val: number) => formatNumber(val),
    },
  ], []);

  // ---- Sorted data ----
  const sortedData = useMemo(() => {
    if (!result?.domains) return [];
    const data = [...result.domains];
    if (sortField && sortOrder) {
      data.sort((a: any, b: any) => {
        const aVal = a[sortField] ?? 0;
        const bVal = b[sortField] ?? 0;
        if (typeof aVal === 'string') {
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    return data;
  }, [result, sortField, sortOrder]);

  // ============================================================================
  // State: no project
  // ============================================================================
  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader
          title="批量域名分析"
          subtitle="一次性分析多个域名的SEO数据"
          showCountrySelector
          showDateRange
        />
        <EmptyState
          scene="data"
          title="请先选择项目"
          description="请从顶部导航栏选择一个项目以开始批量域名分析"
        />
      </div>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="page-container">
      <PageHeader
        title="批量域名分析"
        subtitle={`${projectName} - 批量分析域名的关键词、流量、外链等数据`}
        showCountrySelector
        showDateRange
        actions={
          <Space>
            {result && result.domains && result.domains.length > 0 && (
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadCSV}
              >
                下载CSV
              </Button>
            )}
            <Button icon={<GlobalOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Space>
        }
      />

      {/* Input section */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 15 }}>
            <ThunderboltOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            输入域名
          </Text>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            每行一个域名，最多 {MAX_DOMAINS} 个。支持带或不带 http(s):// 前缀
          </Text>
          <TextArea
            rows={8}
            value={domainsInput}
            onChange={(e) => setDomainsInput(e.target.value)}
            placeholder={`example.com\ncompetitor1.com\ncompetitor2.com\nblog.example.org`}
            disabled={loading}
            style={{ fontFamily: 'monospace', fontSize: 13 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Select
              value={locationCode}
              onChange={setLocationCode}
              options={LOCATION_OPTIONS}
              style={{ width: 180 }}
              prefix={<GlobalOutlined />}
              disabled={loading}
            />
          </div>
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={handleAnalyze}
            loading={loading}
            disabled={parsedDomains.length === 0 || isOverLimit}
          >
            开始分析
          </Button>
          {domainCount > 0 && (
            <Tag
              color={isOverLimit ? 'red' : 'blue'}
              style={{ fontSize: 13, padding: '2px 10px' }}
            >
              {domainCount} / {MAX_DOMAINS} 个域名
              {isOverLimit && ' (超出限制)'}
            </Tag>
          )}
          {result?.analyzedAt && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              分析时间: {new Date(result.analyzedAt).toLocaleString('zh-CN')}
            </Text>
          )}
        </div>
      </Card>

      {/* Loading with progress */}
      {loading && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <LoadingOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 16 }} />
            <Title level={4} style={{ marginBottom: 8 }}>正在分析域名...</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              正在获取 {parsedDomains.length} 个域名的SEO数据，请稍候
            </Text>
            <div style={{ maxWidth: 400, margin: '0 auto' }}>
              <Progress
                percent={Math.round(progress)}
                status="active"
                strokeColor={{ from: '#1677ff', to: '#52c41a' }}
                format={(pct) => `${pct}%`}
              />
            </div>
            <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
              正在分析: {parsedDomains.slice(0, 3).join(', ')}{parsedDomains.length > 3 ? ` ...等${parsedDomains.length}个域名` : ''}
            </Text>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && !loading && (
        <ErrorState
          message={error}
          onRetry={handleAnalyze}
          retryText="重新分析"
        />
      )}

      {/* Empty before analysis */}
      {!result && !loading && !error && (
        <EmptyState
          scene="search"
          title="开始批量域名分析"
          description="在上方输入框中输入域名（每行一个），选择地区，点击「开始分析」获取多个域名的SEO指标对比"
        />
      )}

      {/* Results */}
      {result && !loading && (
        <>
          {/* KPI StatCards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <StatCard
                title="分析域名数"
                value={result.domains?.length ?? 0}
                icon={<GlobalOutlined />}
                color="#1677ff"
              />
            </Col>
            <Col xs={12} sm={6}>
              <StatCard
                title="总关键词"
                value={formatNumber(totalKeywords)}
                icon={<SearchOutlined />}
                color="#52c41a"
              />
            </Col>
            <Col xs={12} sm={6}>
              <StatCard
                title="总预估流量"
                value={formatNumber(totalTraffic)}
                icon={<RiseOutlined />}
                color="#fa8c16"
              />
            </Col>
            <Col xs={12} sm={6}>
              <StatCard
                title="平均DA"
                value={avgDA || '--'}
                icon={<TrophyOutlined />}
                color="#722ed1"
                suffix={avgDA ? '/100' : undefined}
              />
            </Col>
          </Row>

          {/* Comparison Charts */}
          {result.domains && result.domains.length > 0 && (
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} lg={12}>
                <Card
                  title={<span><BarChartOutlined /> 关键词数量对比</span>}
                >
                  {keywordComparisonData.length > 0 ? (
                    <ComparisonChart
                      data={keywordComparisonData}
                      height={380}
                      horizontal
                      showLabel
                      unit=" KW"
                    />
                  ) : (
                    <EmptyState scene="data" title="暂无对比数据" />
                  )}
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card
                  title={<span><BarChartOutlined /> 预估流量对比</span>}
                >
                  {trafficComparisonData.length > 0 ? (
                    <ComparisonChart
                      data={trafficComparisonData}
                      height={380}
                      horizontal
                      showLabel
                      unit=" visits"
                    />
                  ) : (
                    <EmptyState scene="data" title="暂无对比数据" />
                  )}
                </Card>
              </Col>
            </Row>
          )}

          {/* Domain Details Table */}
          <Card
            title={
              <span>
                <GlobalOutlined style={{ marginRight: 8 }} />
                域名分析详情
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
                  ({result.domains?.length ?? 0} 个域名)
                </Text>
              </span>
            }
          >
            {result.domains && result.domains.length > 0 ? (
              <Table
                columns={columns}
                dataSource={sortedData.map((d, idx) => ({ ...d, key: d.domain || idx }))}
                onChange={handleTableChange as any}
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showTotal: (t: number) => `共 ${t} 个域名`,
                  pageSizeOptions: ['10', '20', '50', '100'],
                }}
                size="middle"
                scroll={{ x: 1100 }}
                rowClassName={(record, idx) => idx % 2 === 0 ? '' : 'table-row-alt'}
              />
            ) : (
              <EmptyState
                scene="data"
                title="未获取到域名数据"
                description="分析完成但未返回有效数据，请检查域名是否正确"
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default BulkDomainAnalysis;