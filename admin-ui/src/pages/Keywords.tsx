import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Button, Modal, Input, Form, Typography, Row, Col,
  Space, Popconfirm, Tabs, Select, Tag, Progress, Upload, message,
  List, Descriptions, Divider, Tooltip,
} from 'antd';
import type { TableRowSelection } from 'antd/es/table/interface';
import {
  PlusOutlined, DeleteOutlined, ReloadOutlined, SearchOutlined,
  ImportOutlined, ExportOutlined, BulbOutlined, LineChartOutlined,
  KeyOutlined, RiseOutlined, DollarOutlined, BarChartOutlined,
  UploadOutlined, DownloadOutlined, ArrowUpOutlined, ArrowDownOutlined,
  MinusOutlined, TagsOutlined, ExperimentOutlined, ThunderboltOutlined,
  QuestionCircleOutlined, FallOutlined, GlobalOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { TrendChart, ComparisonChart, DistributionChart } from '@/components/charts';
import { useStore } from '@/store';
import { keywordAPI } from '@/services/keywords';
import type { Keyword, KeywordSuggestion, KeywordResearch, SearchVolumeTrend } from '@/services/keywords';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

// ============================================================================
// Constants
// ============================================================================

const INTENT_COLORS: Record<string, string> = {
  informational: '#1677ff',
  commercial: '#faad14',
  transactional: '#ff4d4f',
  navigational: '#52c41a',
};

const INTENT_LABELS: Record<string, string> = {
  informational: '信息型',
  commercial: '商业型',
  transactional: '交易型',
  navigational: '导航型',
};

// ============================================================================
// Component
// ============================================================================

const Keywords: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const projectName = useStore((s) => s.currentProject?.name || '');

  // ---- State ----
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('');
  const [activeTab, setActiveTab] = useState('all');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addKeywords, setAddKeywords] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  // Batch tag
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchTagModalOpen, setBatchTagModalOpen] = useState(false);
  const [batchTagInput, setBatchTagInput] = useState('');
  const [batchTagLoading, setBatchTagLoading] = useState(false);

  // Research
  const [researchKeyword0, setResearchKeyword0] = useState('');
  const [researchResult, setResearchResult] = useState<KeywordResearch | null>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);

  // Suggestions
  const [seedKeyword, setSeedKeyword] = useState('');
  const [suggestCount, setSuggestCount] = useState(30);
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Trends
  const [trends, setTrends] = useState<SearchVolumeTrend[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);

  // ---- KPI stats ----
  const totalKeywords = total;
  const avgSearchVolume = keywords.length > 0
    ? Math.round(keywords.reduce((s: number, k: any) => s + (k.searchVolume || 0), 0) / keywords.length)
    : 0;
  const avgDifficulty = keywords.length > 0
    ? Math.round(keywords.reduce((s: number, k: any) => s + ((k.competition || 0) * 100), 0) / keywords.length)
    : 0;
  const avgCPC = keywords.length > 0
    ? keywords.reduce((s: number, k: any) => s + (k.cpc || 0), 0) / keywords.length
    : 0;

  // ---- Data loading ----
  const loadKeywords = useCallback(async (p?: number, ps?: number, search?: string) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await keywordAPI.getKeywords(projectId, {
        page: p ?? page,
        pageSize: ps ?? pageSize,
        ...(search !== undefined ? { search: search || undefined } : {}),
      });
      const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
      const t = res?.total ?? list.length;
      setKeywords(list);
      setTotal(t);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || '加载关键词失败');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, page, pageSize]);

  const loadSuggestions = useCallback(async () => {
    if (!projectId || !seedKeyword.trim()) return;
    setSuggestionsLoading(true);
    try {
      const res: any = await keywordAPI.recommendKeywords(projectId, seedKeyword.trim(), suggestCount);
      const list = res?.suggestions || res?.data?.suggestions || [];
      setSuggestions(list);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, [projectId, seedKeyword, suggestCount]);

  const loadTrends = useCallback(async () => {
    if (!projectId) return;
    setTrendsLoading(true);
    try {
      const res: any = await keywordAPI.getSearchVolumeTrend(projectId, '');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setTrends(list);
    } catch {
      setTrends([]);
    } finally {
      setTrendsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadKeywords();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (projectId && activeTab === 'trends') {
      loadTrends();
    }
  }, [projectId, activeTab, loadTrends]);

  // ---- Actions ----
  const handleAddKeywords = async () => {
    const lines = addKeywords.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) { message.warning('请输入关键词'); return; }
    setAddLoading(true);
    try {
      await keywordAPI.batchAddKeywords(projectId!, lines);
      message.success(`成功添加 ${lines.length} 个关键词`);
      setAddModalOpen(false);
      setAddKeywords('');
      loadKeywords(1, pageSize, searchText);
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || '添加失败');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await keywordAPI.deleteKeyword(projectId!, id);
      message.success('已删除');
      loadKeywords(page, pageSize, searchText);
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || '删除失败');
    }
  };

  const handleRefresh = async (id: string) => {
    try {
      await keywordAPI.updateKeyword(projectId!, id, {});
      message.success('已刷新');
      loadKeywords(page, pageSize, searchText);
    } catch (err: any) {
      message.error(err?.message || '刷新失败');
    }
  };

  const handleImport = async () => {
    if (!importFile) { message.warning('请选择文件'); return; }
    setImportLoading(true);
    try {
      const lines = await importFile.text();
      const keywords = lines.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      const res: any = await keywordAPI.batchImport(projectId!, keywords);
      message.success(`成功导入 ${res?.imported || keywords.length} 个关键词`);
      setImportModalOpen(false);
      setImportFile(null);
      loadKeywords(1, pageSize, searchText);
    } catch (err: any) {
      message.error(err?.message || '导入失败');
    } finally {
      setImportLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      message.info('导出功能开发中');
    } catch {
      message.error('导出失败');
    }
  };

  const handleImportDefault = async () => {
    if (!projectId) return;
    try {
      const res: any = await keywordAPI.importDefaultKeywords(projectId);
      message.success(`成功导入默认关键词 ${res?.imported || 0} 个`);
      loadKeywords(1, pageSize, searchText);
    } catch (err: any) {
      message.error(err?.message || '导入默认关键词失败');
    }
  };

  const handleBatchTag = async () => {
    if (selectedRowKeys.length === 0) { message.warning('请先选择关键词'); return; }
    const tags = batchTagInput.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean);
    if (tags.length === 0) { message.warning('请输入标签'); return; }
    setBatchTagLoading(true);
    try {
      const res: any = await keywordAPI.batchTag(projectId!, selectedRowKeys as string[], tags);
      message.success(`已为 ${res?.updated || selectedRowKeys.length} 个关键词设置标签`);
      setBatchTagModalOpen(false);
      setBatchTagInput('');
      setSelectedRowKeys([]);
      loadKeywords(page, pageSize, searchText);
    } catch (err: any) {
      message.error(err?.message || '批量标签失败');
    } finally {
      setBatchTagLoading(false);
    }
  };

  const handleResearch = async () => {
    if (!projectId || !researchKeyword0.trim()) {
      message.warning('请输入关键词');
      return;
    }
    setResearchLoading(true);
    setResearchError(null);
    setResearchResult(null);
    try {
      const res: any = await keywordAPI.researchKeyword(projectId, researchKeyword0.trim());
      setResearchResult(res);
    } catch (err: any) {
      setResearchError(err?.message || '深度研究失败');
    } finally {
      setResearchLoading(false);
    }
  };

  const handleSaveSuggestion = async (kw: KeywordSuggestion) => {
    try {
      await keywordAPI.addKeyword(projectId!, kw.keyword);
      message.success(`已添加: ${kw.keyword}`);
    } catch {
      message.warning(`添加失败: ${kw.keyword}`);
    }
  };

  // ---- Trend chart data ----
  const trendChartData = trends.map((t: any) => ({
    date: t.month || t.date || '',
    value: t.volume || 0,
  }));

  // ---- Research seasonal trend data ----
  const researchSeasonalData = useMemo(() => {
    if (!researchResult?.seasonalTrend) return [];
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    return researchResult.seasonalTrend.map((item) => ({
      date: monthNames[(item.month - 1) % 12],
      value: item.volume,
    }));
  }, [researchResult]);

  // ---- Research intent distribution data ----
  const researchIntentData = useMemo(() => {
    if (!researchResult?.searchIntent) return [];
    return Object.entries(researchResult.searchIntent).map(([name, value]) => ({
      name: INTENT_LABELS[name] || name,
      value,
      color: INTENT_COLORS[name] || '#1677ff',
    }));
  }, [researchResult]);

  // ---- Row selection ----
  const rowSelection: TableRowSelection<any> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  // ---- Columns ----
  const columns = [
    {
      title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 200,
      sorter: true,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 110,
      sorter: true,
      render: (val: number) => (val ?? 0).toLocaleString(),
    },
    {
      title: '难度', dataIndex: 'competition', key: 'competition', width: 110,
      sorter: true,
      render: (val: number) => {
        const pct = Math.round((val ?? 0) * 100);
        const color = pct > 60 ? '#ff4d4f' : pct > 30 ? '#faad14' : '#52c41a';
        return <Progress percent={pct} size="small" strokeColor={color} />;
      },
    },
    {
      title: 'CPC', dataIndex: 'cpc', key: 'cpc', width: 90,
      sorter: true,
      render: (val: number) => `¥${(val ?? 0).toFixed(2)}`,
    },
    {
      title: '竞争度', dataIndex: 'competition', key: 'competition_index', width: 90,
      sorter: true,
      render: (val: number) => {
        const level = (val ?? 0) > 0.6 ? '高' : (val ?? 0) > 0.3 ? '中' : '低';
        const color = (val ?? 0) > 0.6 ? '#ff4d4f' : (val ?? 0) > 0.3 ? '#faad14' : '#52c41a';
        return <Tag color={color}>{level}</Tag>;
      },
    },
    {
      title: '意图', dataIndex: 'intent', key: 'intent', width: 90,
      render: (intent: string) => {
        if (!intent) return <Tag>--</Tag>;
        const label = INTENT_LABELS[intent] || intent;
        const color = INTENT_COLORS[intent] || '#d9d9d9';
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: '标签', dataIndex: 'tags', key: 'tags', width: 150,
      render: (tags: string[]) => {
        if (!tags || tags.length === 0) return <Text type="secondary">--</Text>;
        return (
          <Space size={[0, 4]} wrap>
            {tags.map((t, i) => (
              <Tag key={i} color="blue">{t}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '趋势', dataIndex: 'trend', key: 'trend', width: 70,
      render: (trend: string) => {
        if (trend === 'up') return <ArrowUpOutlined style={{ color: '#52c41a', fontSize: 16 }} />;
        if (trend === 'down') return <ArrowDownOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />;
        return <MinusOutlined style={{ color: '#d9d9d9', fontSize: 16 }} />;
      },
    },
    {
      title: '排名', dataIndex: 'currentRank', key: 'currentRank', width: 80,
      render: (val: number) => {
        if (!val) return <Tag>未收录</Tag>;
        const color = val <= 3 ? '#52c41a' : val <= 10 ? '#1677ff' : val <= 20 ? '#faad14' : '#ff4d4f';
        return <Tag color={color} style={{ fontWeight: 600 }}>#{val}</Tag>;
      },
    },
    {
      title: '操作', key: 'actions', width: 160, fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="link" size="small" icon={<ReloadOutlined />} onClick={() => handleRefresh(record.id)}>刷新</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const suggestionColumns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', render: (t: string) => <Text strong>{t}</Text> },
    { title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 90, render: (v: number) => (v ?? 0).toLocaleString() },
    {
      title: '难度', dataIndex: 'difficulty', key: 'difficulty', width: 80,
      render: (v: number) => <Tag color={v > 60 ? '#ff4d4f' : v > 30 ? '#faad14' : '#52c41a'}>{v ?? '-'}</Tag>,
    },
    { title: 'CPC', dataIndex: 'cpc', key: 'cpc', width: 80, render: (v: string) => v ? `¥${parseFloat(v).toFixed(2)}` : '-' },
    {
      title: '意图', dataIndex: 'intent', key: 'intent', width: 80,
      render: (intent: string) => {
        if (!intent) return <Tag>--</Tag>;
        const label = INTENT_LABELS[intent] || intent;
        return <Tag color={INTENT_COLORS[intent] || '#d9d9d9'}>{label}</Tag>;
      },
    },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, record: KeywordSuggestion) => (
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleSaveSuggestion(record)}>保存</Button>
      ),
    },
  ];

  const researchRelatedColumns = [
    {
      title: '关键词', dataIndex: 'keyword', key: 'keyword',
      render: (t: string) => <Text strong>{t}</Text>,
    },
    {
      title: '搜索量', dataIndex: 'volume', key: 'volume', width: 100,
      render: (v: number) => (v ?? 0).toLocaleString(),
    },
    {
      title: '竞争度', dataIndex: 'competition', key: 'competition', width: 90,
      render: (v: number) => {
        const pct = Math.round((v ?? 0) * 100);
        const color = pct > 60 ? '#ff4d4f' : pct > 30 ? '#faad14' : '#52c41a';
        return <Progress percent={pct} size="small" strokeColor={color} />;
      },
    },
    {
      title: 'CPC', dataIndex: 'cpc', key: 'cpc', width: 90,
      render: (v: number) => `¥${(v ?? 0).toFixed(2)}`,
    },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, record: any) => (
        <Button type="primary" size="small" icon={<PlusOutlined />}
          onClick={async () => {
            try {
              await keywordAPI.addKeyword(projectId!, record.keyword);
              message.success(`已添加: ${record.keyword}`);
            } catch {
              message.warning(`添加失败: ${record.keyword}`);
            }
          }}
        >
          添加
        </Button>
      ),
    },
  ];

  // ---- Table change ----
  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    setPage(pagination.current);
    setPageSize(pagination.pageSize);
    if (sorter.field) {
      setSortBy(sorter.field);
      setSortOrder(sorter.order === 'ascend' ? 'asc' : sorter.order === 'descend' ? 'desc' : '');
    }
  };

  // ---- State: no project ----
  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="关键词研究" subtitle="请先选择项目" showCountrySelector showDateRange />
        <EmptyState scene="data" title="请先选择项目" description="请从顶部导航栏选择一个项目以开始关键词研究" />
      </div>
    );
  }

  // ---- State: loading ----
  if (loading && keywords.length === 0) {
    return (
      <div className="page-container">
        <PageHeader title="关键词研究" subtitle={`${projectName} - 关键词管理`} showCountrySelector showDateRange />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ---- State: error ----
  if (error && keywords.length === 0) {
    return (
      <div className="page-container">
        <PageHeader title="关键词研究" subtitle={`${projectName} - 关键词管理`} showCountrySelector showDateRange />
        <ErrorState message={error} onRetry={() => loadKeywords()} />
      </div>
    );
  }

  // ---- State: empty ----
  const isEmpty = !loading && keywords.length === 0;

  // ---- Tab items ----
  const tabItems = [
    // ========================================================================
    // TAB 1: 全部关键词
    // ========================================================================
    {
      key: 'all',
      label: <span><KeyOutlined /> 全部关键词</span>,
      children: (
        <>
          {/* Search / Filter row */}
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Input.Search
              placeholder="搜索关键词..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={() => { setPage(1); loadKeywords(1, pageSize, searchText); }}
              style={{ width: 300 }}
              allowClear
              prefix={<SearchOutlined />}
            />
          </div>

          {isEmpty ? (
            <EmptyState
              scene="data"
              title="暂无关键词"
              description="点击「添加关键词」按钮或导入CSV文件开始关键词研究"
              action={{ text: '添加关键词', icon: <PlusOutlined />, onClick: () => { setAddKeywords(''); setAddModalOpen(true); } }}
            />
          ) : (
            <Table
              rowSelection={rowSelection}
              columns={columns}
              dataSource={keywords}
              rowKey="id"
              loading={loading}
              onChange={handleTableChange}
              pagination={{
                current: page, pageSize, total, showSizeChanger: true, showQuickJumper: true,
                showTotal: (t) => `共 ${t} 个关键词`,
              }}
              size="middle"
              scroll={{ x: 1300 }}
            />
          )}
        </>
      ),
    },

    // ========================================================================
    // TAB 2: 关键词研究 (NEW - researchKeyword)
    // ========================================================================
    {
      key: 'research',
      label: <span><ExperimentOutlined /> 关键词研究</span>,
      children: (
        <div>
          {/* Research input */}
          <Card style={{ marginBottom: 24 }}>
            <Space.Compact style={{ width: '100%', maxWidth: 600 }}>
              <Input
                placeholder="输入关键词进行深度研究，如：truck crane"
                value={researchKeyword0}
                onChange={(e) => setResearchKeyword0(e.target.value)}
                onPressEnter={handleResearch}
                prefix={<SearchOutlined />}
                size="large"
              />
              <Button
                type="primary"
                size="large"
                icon={<ExperimentOutlined />}
                onClick={handleResearch}
                loading={researchLoading}
              >
                深度研究
              </Button>
            </Space.Compact>
          </Card>

          {/* Research loading */}
          {researchLoading && (
            <LoadingSkeleton type="page" />
          )}

          {/* Research error */}
          {researchError && !researchLoading && (
            <ErrorState message={researchError} onRetry={handleResearch} />
          )}

          {/* Research empty */}
          {!researchResult && !researchLoading && !researchError && (
            <EmptyState
              scene="search"
              title="开始关键词研究"
              description="输入一个关键词并点击「深度研究」，获取搜索量、竞争度、相关关键词、季节性趋势和搜索意图分布等详细数据"
            />
          )}

          {/* Research results */}
          {researchResult && !researchLoading && (
            <div>
              {/* Overview StatCards */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="搜索量"
                    value={(researchResult.overview?.searchVolume ?? 0).toLocaleString()}
                    icon={<SearchOutlined />}
                    color="#1677ff"
                    suffix="/月"
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="竞争度"
                    value={researchResult.overview?.competition ?? '--'}
                    icon={<BarChartOutlined />}
                    color="#fa8c16"
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="CPC"
                    value={researchResult.overview?.cpc ? `¥${parseFloat(researchResult.overview.cpc).toFixed(2)}` : '--'}
                    icon={<DollarOutlined />}
                    color="#722ed1"
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="趋势方向"
                    value={researchResult.overview?.trend === 'up' ? '上升' : researchResult.overview?.trend === 'down' ? '下降' : '稳定'}
                    icon={researchResult.overview?.trend === 'up' ? <RiseOutlined /> : researchResult.overview?.trend === 'down' ? <FallOutlined /> : <MinusOutlined />}
                    color={researchResult.overview?.trend === 'up' ? '#52c41a' : researchResult.overview?.trend === 'down' ? '#ff4d4f' : '#d9d9d9'}
                  />
                </Col>
              </Row>

              {/* SERP Features */}
              {researchResult.serpFeatures && Object.keys(researchResult.serpFeatures).length > 0 && (
                <Card title={<span><GlobalOutlined /> SERP 特征</span>} style={{ marginBottom: 24 }}>
                  <Space wrap>
                    {Object.entries(researchResult.serpFeatures).map(([feature, present]) => (
                      <Tag key={feature} color={present ? '#1677ff' : '#d9d9d9'} style={{ fontSize: 13, padding: '4px 12px' }}>
                        {feature} {present ? '有' : '无'}
                      </Tag>
                    ))}
                  </Space>
                </Card>
              )}

              {/* Related Keywords Table */}
              {researchResult.relatedKeywords && researchResult.relatedKeywords.length > 0 && (
                <Card title={<span><KeyOutlined /> 相关关键词</span>} style={{ marginBottom: 24 }}>
                  <Table
                    columns={researchRelatedColumns}
                    dataSource={researchResult.relatedKeywords}
                    rowKey="keyword"
                    size="middle"
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                    scroll={{ x: 500 }}
                  />
                </Card>
              )}

              {/* Questions */}
              {researchResult.questions && researchResult.questions.length > 0 && (
                <Card title={<span><QuestionCircleOutlined /> 相关问题</span>} style={{ marginBottom: 24 }}>
                  <List
                    dataSource={researchResult.questions}
                    renderItem={(item: any) => (
                      <List.Item>
                        <Space>
                          <QuestionCircleOutlined style={{ color: '#1677ff' }} />
                          <Text>{item.question}</Text>
                          <Tag color="blue">{item.volume?.toLocaleString() || 0} 搜索量</Tag>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              )}

              {/* Seasonal Trend + Search Intent */}
              <Row gutter={[16, 16]}>
                {researchSeasonalData.length > 0 && (
                  <Col xs={24} lg={12}>
                    <Card title="季节性趋势" style={{ height: '100%' }}>
                      <TrendChart
                        data={researchSeasonalData}
                        height={320}
                        smooth
                        showArea
                        color="#1677ff"
                      />
                    </Card>
                  </Col>
                )}
                {researchIntentData.length > 0 && (
                  <Col xs={24} lg={researchSeasonalData.length > 0 ? 12 : 24}>
                    <Card title="搜索意图分布" style={{ height: '100%' }}>
                      <DistributionChart
                        data={researchIntentData}
                        type="donut"
                        height={320}
                        centerLabel={{ label: '意图', value: `${researchIntentData.reduce((s, d) => s + d.value, 0)}` }}
                      />
                    </Card>
                  </Col>
                )}
              </Row>
            </div>
          )}
        </div>
      ),
    },

    // ========================================================================
    // TAB 3: 关键词建议 (recommendKeywords)
    // ========================================================================
    {
      key: 'suggestions',
      label: <span><BulbOutlined /> 关键词建议</span>,
      children: (
        <>
          <div style={{ marginBottom: 16 }}>
            <Space.Compact style={{ width: '100%', maxWidth: 600 }}>
              <Input
                placeholder="输入种子关键词，如：起重机、crane..."
                value={seedKeyword}
                onChange={(e) => setSeedKeyword(e.target.value)}
                onPressEnter={loadSuggestions}
                prefix={<SearchOutlined />}
                size="large"
              />
              <Select
                value={suggestCount}
                onChange={(v) => setSuggestCount(v)}
                size="large"
                style={{ width: 100 }}
                options={[
                  { value: 10, label: '10条' },
                  { value: 20, label: '20条' },
                  { value: 30, label: '30条' },
                  { value: 50, label: '50条' },
                ]}
              />
              <Button type="primary" size="large" icon={<BulbOutlined />} onClick={loadSuggestions} loading={suggestionsLoading}>
                获取建议
              </Button>
            </Space.Compact>
          </div>
          {suggestions.length > 0 ? (
            <Table columns={suggestionColumns} dataSource={suggestions} rowKey="keyword"
              size="middle" pagination={{ pageSize: 10, showSizeChanger: true }}
              scroll={{ x: 600 }}
            />
          ) : (
            <EmptyState
              scene="search"
              title="暂无建议"
              description="输入种子关键词后点击「获取建议」，系统将推荐相关关键词"
            />
          )}
        </>
      ),
    },

    // ========================================================================
    // TAB 4: 搜索趋势 (getSearchVolumeTrend)
    // ========================================================================
    {
      key: 'trends',
      label: <span><LineChartOutlined /> 搜索趋势</span>,
      children: (
        <Card loading={trendsLoading}>
          {trends.length > 0 ? (
            <TrendChart data={trendChartData} title="关键词搜索量趋势" height={400} smooth showArea />
          ) : (
            <EmptyState scene="data" title="暂无趋势数据" description="添加关键词后，可在关键词列表中刷新获取趋势数据" />
          )}
        </Card>
      ),
    },
  ];

  // ---- Render ----
  return (
    <div className="page-container">
      <PageHeader
        title="关键词研究"
        subtitle={`${projectName} - 共 ${total} 个关键词 · 平均搜索量 ${avgSearchVolume.toLocaleString()}/月`}
        showCountrySelector
        showDateRange
        actions={
          <Space>
            {selectedRowKeys.length > 0 && (
              <Button icon={<TagsOutlined />} onClick={() => { setBatchTagInput(''); setBatchTagModalOpen(true); }}>
                批量标签 ({selectedRowKeys.length})
              </Button>
            )}
            <Button icon={<ImportOutlined />} onClick={() => setImportModalOpen(true)}>导入CSV</Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>导出</Button>
            <Button icon={<ThunderboltOutlined />} onClick={handleImportDefault}>
              导入默认
            </Button>
            <Button type="primary" icon={<PlusOutlined />}
              onClick={() => { setAddKeywords(''); setAddModalOpen(true); }}
            >
              添加关键词
            </Button>
          </Space>
        }
      />

      {/* KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard title="关键词总数" value={totalKeywords} icon={<KeyOutlined />} color="#1677ff" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="平均搜索量" value={avgSearchVolume.toLocaleString()} icon={<SearchOutlined />} color="#52c41a" suffix="/月" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="平均难度" value={`${avgDifficulty}%`} icon={<BarChartOutlined />} color="#fa8c16" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="平均CPC" value={`¥${avgCPC.toFixed(2)}`} icon={<DollarOutlined />} color="#722ed1" />
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginTop: 8 }} items={tabItems} />

      {/* ================================================================== */}
      {/* Add Keywords Modal */}
      {/* ================================================================== */}
      <Modal
        title="添加关键词"
        open={addModalOpen}
        onOk={handleAddKeywords}
        onCancel={() => { setAddModalOpen(false); setAddKeywords(''); }}
        confirmLoading={addLoading}
        okText="添加"
        cancelText="取消"
        destroyOnClose
      >
        <div style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>每行一个关键词，或用逗号分隔</Text>
          <TextArea
            rows={8}
            value={addKeywords}
            onChange={(e) => setAddKeywords(e.target.value)}
            placeholder={`crane for sale\ntruck mounted crane\nmobile crane\nhydraulic crane manufacturer`}
          />
        </div>
      </Modal>

      {/* ================================================================== */}
      {/* Import CSV Modal */}
      {/* ================================================================== */}
      <Modal
        title="导入CSV关键词"
        open={importModalOpen}
        onOk={handleImport}
        onCancel={() => { setImportModalOpen(false); setImportFile(null); }}
        confirmLoading={importLoading}
        okText="导入"
        cancelText="取消"
        destroyOnClose
      >
        <div style={{ marginTop: 16 }}>
          <Upload.Dragger
            accept=".csv,.txt"
            maxCount={1}
            beforeUpload={(file) => { setImportFile(file); return false; }}
            onRemove={() => setImportFile(null)}
          >
            <p className="ant-upload-drag-icon"><UploadOutlined style={{ fontSize: 32, color: '#1677ff' }} /></p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">支持 CSV 或 TXT 文件，每行一个关键词</p>
          </Upload.Dragger>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/* Batch Tag Modal (NEW) */}
      {/* ================================================================== */}
      <Modal
        title="批量设置标签"
        open={batchTagModalOpen}
        onOk={handleBatchTag}
        onCancel={() => { setBatchTagModalOpen(false); setBatchTagInput(''); }}
        confirmLoading={batchTagLoading}
        okText="应用"
        cancelText="取消"
        destroyOnClose
      >
        <div style={{ marginTop: 16 }}>
          <Text style={{ display: 'block', marginBottom: 8 }}>
            已选择 <Text strong>{selectedRowKeys.length}</Text> 个关键词
          </Text>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            输入标签，多个标签用逗号或空格分隔
          </Text>
          <Input
            placeholder="例如：热门, 长尾, 品牌词"
            value={batchTagInput}
            onChange={(e) => setBatchTagInput(e.target.value)}
            onPressEnter={handleBatchTag}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Keywords;