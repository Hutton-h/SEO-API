import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Modal, Input, Form, Typography, Row, Col,
  Space, Popconfirm, Tabs, Select, Tag, Progress, Upload, message,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ReloadOutlined, SearchOutlined,
  ImportOutlined, ExportOutlined, BulbOutlined, LineChartOutlined,
  KeyOutlined, RiseOutlined, DollarOutlined, BarChartOutlined,
  UploadOutlined, DownloadOutlined, ArrowUpOutlined, ArrowDownOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { TrendChart } from '@/components/charts';
import { useStore } from '@/store';
import { keywordAPI } from '@/services/keywords';

const { Text, Title } = Typography;
const { TextArea } = Input;

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

  // Suggestions
  const [seedKeyword, setSeedKeyword] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Trends
  const [trends, setTrends] = useState<any[]>([]);
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
  const loadKeywords = useCallback(async (p?: number, ps?: number, search?: string, sb?: string, so?: string) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await keywordAPI.getKeywords(projectId, {
        page: p ?? page,
        pageSize: ps ?? pageSize,
        ...(search !== undefined ? { search } : {}),
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
  }, [projectId, page, pageSize]);

  const loadSuggestions = useCallback(async () => {
    if (!projectId || !seedKeyword.trim()) return;
    setSuggestionsLoading(true);
    try {
      const res: any = await keywordAPI.recommendKeywords(projectId, seedKeyword.trim(), 30);
      const list = res?.suggestions || res?.data?.suggestions || [];
      setSuggestions(list);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, [projectId, seedKeyword]);

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
  }, [projectId]);

  useEffect(() => {
    if (projectId && activeTab === 'trends') {
      loadTrends();
    }
  }, [projectId, activeTab]);

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

  const handleSaveSuggestion = async (kw: any) => {
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
      title: '操作', key: 'action', width: 80,
      render: (_: any, record: any) => (
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleSaveSuggestion(record)}>保存</Button>
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
            <Button icon={<ImportOutlined />} onClick={() => setImportModalOpen(true)}>导入CSV</Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>导出</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setAddKeywords(''); setAddModalOpen(true); }}>添加关键词</Button>
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
      <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginTop: 8 }}
        items={[
          {
            key: 'all',
            label: <span><KeyOutlined /> 全部关键词</span>,
            children: (
              <>
                {/* Search / Filter */}
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
                    scroll={{ x: 1100 }}
                  />
                )}
              </>
            ),
          },
          {
            key: 'suggestions',
            label: <span><BulbOutlined /> 关键词建议</span>,
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Space.Compact style={{ width: '100%', maxWidth: 500 }}>
                    <Input
                      placeholder="输入种子关键词，如：起重机、crane..."
                      value={seedKeyword}
                      onChange={(e) => setSeedKeyword(e.target.value)}
                      onPressEnter={loadSuggestions}
                      prefix={<SearchOutlined />}
                      size="large"
                    />
                    <Button type="primary" size="large" icon={<BulbOutlined />} onClick={loadSuggestions} loading={suggestionsLoading}>
                      获取建议
                    </Button>
                  </Space.Compact>
                </div>
                {suggestions.length > 0 ? (
                  <Table columns={suggestionColumns} dataSource={suggestions} rowKey="keyword"
                    size="middle" pagination={{ pageSize: 10, showSizeChanger: false }}
                    scroll={{ x: 500 }}
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
        ]}
      />

      {/* Add Keywords Modal */}
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

      {/* Import CSV Modal */}
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
    </div>
  );
};

export default Keywords;