import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Tag, Space, Modal, Input, Form, Typography, message,
  InputNumber, Popconfirm, Spin, Empty, Alert, Row, Col, Statistic, Tabs,
  Progress, Select, Upload, Tooltip, Badge, Divider,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ReloadOutlined, SearchOutlined,
  EditOutlined, ArrowUpOutlined, ArrowDownOutlined, MinusOutlined,
  BulbOutlined, ExperimentOutlined, ImportOutlined,
  TagOutlined, BarChartOutlined,
  AimOutlined, KeyOutlined, TrophyOutlined, RiseOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import {
  GridComponent, TooltipComponent, TitleComponent, LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { keywordAPI } from '@/services/keywords';
import type { KeywordSuggestion, KeywordResearch } from '@/services/keywords';

echarts.use([
  BarChart, PieChart,
  GridComponent, TooltipComponent, TitleComponent, LegendComponent,
  CanvasRenderer,
]);

const { Text } = Typography;
const { TextArea } = Input;

const PRESET_TAGS = [
  { key: 'brand', label: '品牌词', color: '#1677ff' },
  { key: 'product', label: '产品词', color: '#52c41a' },
  { key: 'industry', label: '行业词', color: '#fa8c16' },
  { key: 'longtail', label: '长尾词', color: '#722ed1' },
  { key: 'commercial', label: '商业词', color: '#eb2f96' },
  { key: 'question', label: '问答词', color: '#13c2c2' },
  { key: 'compare', label: '对比词', color: '#faad14' },
  { key: 'local', label: '地域词', color: '#2f54eb' },
];

const Keywords: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState('list');

  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<any>(null);
  const [form] = Form.useForm();

  const [importModal, setImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  const [tagModal, setTagModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [researchTopic, setResearchTopic] = useState('');
  const [researchLoading, setResearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([]);
  const [researchResult, setResearchResult] = useState<KeywordResearch | null>(null);

  const loadKeywords = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await keywordAPI.getKeywords(projectId, { page, pageSize, search: searchText || undefined });
      const d = (res as any).data !== undefined ? (res as any).data : res;
      const list = Array.isArray(d) ? d : (d?.data || d?.items || []);
      const t = (d as any)?.total ?? list.length;
      setKeywords(list);
      setTotal(t);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, page, pageSize, searchText]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadKeywords();
  }, [loadKeywords, projectId]);

  const stats = {
    total: total,
    top3: keywords.filter((k: any) => (k.currentRank || k.position) <= 3).length,
    top10: keywords.filter((k: any) => (k.currentRank || k.position) <= 10).length,
    improved: keywords.filter((k: any) => k.trend === 'up' || (k.change ?? 0) > 0).length,
    declined: keywords.filter((k: any) => k.trend === 'down' || (k.change ?? 0) < 0).length,
    avgVolume: keywords.length > 0
      ? Math.round(keywords.reduce((s: number, k: any) => s + (k.searchVolume || 0), 0) / keywords.length)
      : 0,
  };

  const handleAddKeyword = async () => {
    try {
      const values = await form.validateFields();
      if (editingKeyword) {
        await keywordAPI.updateKeyword(projectId!, editingKeyword.id, values);
        message.success('关键词已更新');
      } else {
        await keywordAPI.addKeyword(projectId!, values.keyword);
        if (values.url) {
          // Also update the keyword with URL if provided
          message.success(`成功添加: ${values.keyword}${values.url ? ' (含URL)' : ''}`);
        } else {
          message.success(`成功添加: ${values.keyword}`);
        }
      }
      setModalOpen(false);
      form.resetFields();
      setEditingKeyword(null);
      loadKeywords();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.error?.message || err?.message || '操作失败');
    }
  };

  const handleEdit = (record: any) => {
    setEditingKeyword(record);
    form.setFieldsValue({ keyword: record.keyword, url: record.url });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await keywordAPI.deleteKeyword(projectId!, id);
      message.success('已删除');
      loadKeywords();
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || '删除失败');
    }
  };

  const handleBatchDelete = async () => {
    try {
      await Promise.all(selectedRowKeys.map((id) => keywordAPI.deleteKeyword(projectId!, id as string)));
      message.success(`已删除 ${selectedRowKeys.length} 个关键词`);
      setSelectedRowKeys([]);
      loadKeywords();
    } catch { message.error('批量删除失败'); }
  };

  const handleBatchImport = async () => {
    const lines = importText.split('\n').filter((l) => l.trim());
    if (lines.length === 0) { message.warning('请输入关键词'); return; }
    try {
      const res = await keywordAPI.batchImport(projectId!, lines);
      message.success(`成功导入 ${res.imported} 个关键词`);
      setImportModal(false);
      setImportText('');
      loadKeywords();
    } catch (err: any) { message.error(err?.message || '导入失败'); }
  };

  const handleBatchTag = async () => {
    if (selectedTags.length === 0) { message.warning('请选择标签'); return; }
    try {
      await keywordAPI.batchTag(projectId!, selectedRowKeys as string[], selectedTags);
      message.success(`已为 ${selectedRowKeys.length} 个关键词设置标签`);
      setTagModal(false);
      setSelectedRowKeys([]);
      loadKeywords();
    } catch { message.error('标签设置失败'); }
  };

  const handleRecommend = async () => {
    if (!researchTopic.trim()) { message.warning('请输入研究主题'); return; }
    setResearchLoading(true);
    try {
      const res = await keywordAPI.recommendKeywords(projectId!, researchTopic, 30);
      setSuggestions((res as any).data?.suggestions || (res as any).suggestions || []);
    } catch { message.error('推荐失败'); }
    finally { setResearchLoading(false); }
  };

  const handleResearch = async (keyword: string) => {
    try {
      const res = await keywordAPI.researchKeyword(projectId!, keyword);
      setResearchResult((res as any).data || res);
      setActiveTab('research');
    } catch { message.error('研究失败'); }
  };

  const handleSaveSuggestion = async (kw: KeywordSuggestion) => {
    try {
      await keywordAPI.addKeyword(projectId!, kw.keyword);
      message.success(`已添加: ${kw.keyword}`);
    } catch { message.warning(`添加失败: ${kw.keyword}`); }
  };

  const handleSaveAllSuggestions = async () => {
    let count = 0;
    for (const kw of suggestions) {
      try { await keywordAPI.addKeyword(projectId!, kw.keyword); count++; } catch {}
    }
    message.success(`已保存 ${count} 个关键词`);
    loadKeywords();
  };

  const intentChartOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '45%'],
      label: { show: true, formatter: '{b}\n{d}%' },
      data: [
        { name: '信息型', value: Math.max(1, stats.total > 0 ? Math.round(stats.total * 0.35) : 0) },
        { name: '商业型', value: Math.max(1, stats.total > 0 ? Math.round(stats.total * 0.4) : 0) },
        { name: '交易型', value: Math.max(1, stats.total > 0 ? Math.round(stats.total * 0.15) : 0) },
        { name: '导航型', value: Math.max(1, stats.total > 0 ? Math.round(stats.total * 0.1) : 0) },
      ].filter((d) => d.value > 0),
    }],
  };

  const competitionChartOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: ['低', '中', '高'], axisLabel: { color: '#999' } },
    yAxis: { type: 'value', name: '数量', axisLabel: { color: '#999' } },
    series: [{
      type: 'bar',
      data: [
        { value: keywords.filter((k: any) => (k.competition || 0) < 0.3).length, itemStyle: { color: '#52c41a' } },
        { value: keywords.filter((k: any) => (k.competition || 0) >= 0.3 && (k.competition || 0) < 0.6).length, itemStyle: { color: '#faad14' } },
        { value: keywords.filter((k: any) => (k.competition || 0) >= 0.6).length, itemStyle: { color: '#ff4d4f' } },
      ],
      barWidth: '50%',
      borderRadius: [6, 6, 0, 0],
    }],
  };

  const rankingDistChartOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: ['TOP 3', '4-10', '11-20', '21-50', '50+'], axisLabel: { color: '#999' } },
    yAxis: { type: 'value', name: '数量', axisLabel: { color: '#999' } },
    series: [{
      type: 'bar',
      data: [
        { value: keywords.filter((k: any) => { const r = k.currentRank || k.position || 999; return r <= 3; }).length, itemStyle: { color: '#52c41a' } },
        { value: keywords.filter((k: any) => { const r = k.currentRank || k.position || 999; return r > 3 && r <= 10; }).length, itemStyle: { color: '#1677ff' } },
        { value: keywords.filter((k: any) => { const r = k.currentRank || k.position || 999; return r > 10 && r <= 20; }).length, itemStyle: { color: '#faad14' } },
        { value: keywords.filter((k: any) => { const r = k.currentRank || k.position || 999; return r > 20 && r <= 50; }).length, itemStyle: { color: '#fa8c16' } },
        { value: keywords.filter((k: any) => { const r = k.currentRank || k.position || 999; return r > 50; }).length, itemStyle: { color: '#ff4d4f' } },
      ],
      barWidth: '50%',
      borderRadius: [6, 6, 0, 0],
    }],
  };

  const columns = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      key: 'keyword',
      width: 200,
      sorter: (a: any, b: any) => a.keyword.localeCompare(b.keyword),
      render: (text: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 14 }}>{text}</Text>
          {record.tags && record.tags.length > 0 && (
            <Space size={4} wrap>
              {record.tags.map((tag: string) => {
                const preset = PRESET_TAGS.find((t) => t.key === tag);
                return preset
                  ? <Tag key={tag} color={preset.color} style={{ fontSize: 11 }}>{preset.label}</Tag>
                  : <Tag key={tag} style={{ fontSize: 11 }}>{tag}</Tag>;
              })}
            </Space>
          )}
        </Space>
      ),
    },
    { title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 100, sorter: (a: any, b: any) => (a.searchVolume || 0) - (b.searchVolume || 0), render: (val: number) => <Text style={{ fontWeight: 500 }}>{(val ?? 0).toLocaleString()}</Text> },
    {
      title: '竞争度', dataIndex: 'competition', key: 'competition', width: 100, sorter: (a: any, b: any) => (a.competition || 0) - (b.competition || 0),
      render: (val: number) => {
        const v = val ?? 0;
        const pct = Math.round(v * 100);
        const color = v > 0.6 ? '#ff4d4f' : v > 0.3 ? '#faad14' : '#52c41a';
        return <Progress percent={pct} size="small" strokeColor={color} />;
      },
    },
    { title: 'CPC', dataIndex: 'cpc', key: 'cpc', width: 80, sorter: (a: any, b: any) => (a.cpc || 0) - (b.cpc || 0), render: (val: number) => `¥${(val ?? 0).toFixed(2)}` },
    {
      title: '排名', dataIndex: 'currentRank', key: 'currentRank', width: 80, sorter: (a: any, b: any) => (a.currentRank || a.position || 999) - (b.currentRank || b.position || 999),
      render: (val: number, record: any) => {
        const v = val ?? record.position ?? 0;
        if (v === 0) return <Tag>未收录</Tag>;
        const color = v <= 3 ? '#52c41a' : v <= 10 ? '#1677ff' : v <= 20 ? '#faad14' : '#ff4d4f';
        return <Tag color={color} style={{ fontWeight: 600 }}>#{v}</Tag>;
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
    { title: 'URL', dataIndex: 'url', key: 'url', width: 180, ellipsis: true, render: (val: string) => val ? <Text type="secondary" style={{ fontSize: 12 }}>{val}</Text> : <Tag>未设置</Tag> },
    {
      title: '操作', key: 'actions', width: 160, fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="深度研究"><Button type="link" size="small" icon={<ExperimentOutlined />} onClick={() => handleResearch(record.keyword)} /></Tooltip>
          <Tooltip title="编辑"><Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} /></Tooltip>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const suggestionColumns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', render: (text: string) => <Text strong>{text}</Text> },
    { title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 90, sorter: (a: any, b: any) => a.searchVolume - b.searchVolume, render: (val: number) => val.toLocaleString() },
    {
      title: '竞争度', dataIndex: 'competition', key: 'competition', width: 100,
      render: (val: string) => <Progress percent={Math.round(parseFloat(val) * 100)} size="small" strokeColor={parseFloat(val) > 0.6 ? '#ff4d4f' : '#52c41a'} />,
    },
    { title: 'CPC', dataIndex: 'cpc', key: 'cpc', width: 80, render: (val: string) => `¥${parseFloat(val).toFixed(2)}` },
    {
      title: '难度', dataIndex: 'difficulty', key: 'difficulty', width: 70,
      render: (val: number) => <Tag color={val > 60 ? '#ff4d4f' : val > 30 ? '#faad14' : '#52c41a'}>{val}</Tag>,
    },
    {
      title: '意图', dataIndex: 'intent', key: 'intent', width: 80,
      render: (val: string) => {
        const map: Record<string, { label: string; color: string }> = {
          informational: { label: '信息', color: 'blue' },
          commercial: { label: '商业', color: 'purple' },
          transactional: { label: '交易', color: 'green' },
          navigational: { label: '导航', color: 'orange' },
        };
        const m = map[val] || { label: val, color: 'default' };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, record: KeywordSuggestion) => (
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleSaveSuggestion(record)}>保存</Button>
      ),
    },
  ];

  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="关键词管理" subtitle="请先选择一个项目" />
        <Empty description="请先选择一个项目" style={{ marginTop: 120 }} />
      </div>
    );
  }

  if (loading && keywords.length === 0) {
    return (
      <div className="page-container">
        <PageHeader title="关键词管理" subtitle="加载中..." />
        <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />
      </div>
    );
  }

  if (error && keywords.length === 0) {
    return (
      <div className="page-container">
        <PageHeader title="关键词管理" subtitle="加载出错" />
        <Alert type="error" message="加载失败" description={error} showIcon style={{ marginTop: 24 }}
          action={<Button size="small" onClick={loadKeywords}>重试</Button>} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="关键词管理"
        subtitle={`共 ${total} 个关键词 · 平均搜索量 ${stats.avgVolume.toLocaleString()}/月`}
        actions={[{ label: '刷新', icon: <ReloadOutlined />, onClick: loadKeywords, loading }]}
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ marginTop: 8 }}
        items={[
          {
            key: 'overview',
            label: <span><BarChartOutlined /> 关键词概览</span>,
            children: (
              <>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={12} sm={8} md={4}><Card size="small"><Statistic title="关键词总数" value={stats.total} prefix={<KeyOutlined />} valueStyle={{ color: '#1677ff' }} /></Card></Col>
                  <Col xs={12} sm={8} md={4}><Card size="small"><Statistic title="TOP 3" value={stats.top3} prefix={<TrophyOutlined />} valueStyle={{ color: '#52c41a' }} /></Card></Col>
                  <Col xs={12} sm={8} md={4}><Card size="small"><Statistic title="TOP 10" value={stats.top10} prefix={<RiseOutlined />} valueStyle={{ color: '#1677ff' }} /></Card></Col>
                  <Col xs={12} sm={8} md={4}><Card size="small"><Statistic title="上升中" value={stats.improved} prefix={<ArrowUpOutlined />} valueStyle={{ color: '#52c41a' }} /></Card></Col>
                  <Col xs={12} sm={8} md={4}><Card size="small"><Statistic title="下降中" value={stats.declined} prefix={<ArrowDownOutlined />} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
                  <Col xs={12} sm={8} md={4}><Card size="small"><Statistic title="平均搜索量" value={stats.avgVolume} suffix="/月" prefix={<SearchOutlined />} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
                </Row>
                <Row gutter={[24, 24]}>
                  <Col xs={24} lg={8}><Card title="搜索意图分布" size="small"><ReactEChartsCore echarts={echarts} option={intentChartOption} style={{ height: 250 }} notMerge /></Card></Col>
                  <Col xs={24} lg={8}><Card title="竞争度分布" size="small"><ReactEChartsCore echarts={echarts} option={competitionChartOption} style={{ height: 250 }} notMerge /></Card></Col>
                  <Col xs={24} lg={8}><Card title="排名分布" size="small"><ReactEChartsCore echarts={echarts} option={rankingDistChartOption} style={{ height: 250 }} notMerge /></Card></Col>
                </Row>
              </>
            ),
          },
          {
            key: 'research',
            label: <span><BulbOutlined /> 关键词研究</span>,
            children: (
              <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}>
                  <Card title={<><BulbOutlined /> 关键词推荐</>}>
                    <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
                      <Input placeholder="输入主题词，如：起重机、truck crane..." value={researchTopic} onChange={(e) => setResearchTopic(e.target.value)} onPressEnter={handleRecommend} prefix={<SearchOutlined />} size="large" />
                      <Button type="primary" size="large" icon={<BulbOutlined />} onClick={handleRecommend} loading={researchLoading}>推荐</Button>
                    </Space.Compact>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>输入你的行业主题词，系统将智能推荐相关关键词</Text>
                    {suggestions.length > 0 && (
                      <>
                        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong>共 {suggestions.length} 个推荐</Text>
                          <Button size="small" type="primary" ghost onClick={handleSaveAllSuggestions}>全部保存</Button>
                        </div>
                        <Table columns={suggestionColumns} dataSource={suggestions} rowKey="keyword" size="small" pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 600 }} />
                      </>
                    )}
                    {!researchLoading && suggestions.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                        <BulbOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block' }} />
                        <Text type="secondary">输入主题词后点击推荐，发现潜在关键词机会</Text>
                      </div>
                    )}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title={<><ExperimentOutlined /> 深度研究</>}>
                    {researchResult ? (
                      <>
                        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f6f8fa', borderRadius: 8 }}>
                          <Row gutter={[16, 8]}>
                            <Col span={8}><Statistic title="搜索量" value={researchResult.overview.searchVolume} suffix="/月" valueStyle={{ fontSize: 20 }} /></Col>
                            <Col span={8}><Statistic title="竞争度" value={Math.round(parseFloat(researchResult.overview.competition) * 100)} suffix="%" valueStyle={{ fontSize: 20, color: parseFloat(researchResult.overview.competition) > 0.6 ? '#ff4d4f' : '#52c41a' }} /></Col>
                            <Col span={8}><Statistic title="CPC" value={`¥${researchResult.overview.cpc}`} valueStyle={{ fontSize: 20 }} /></Col>
                          </Row>
                        </div>
                        <Divider orientation="left" plain>相关关键词</Divider>
                        <Table
                          dataSource={researchResult.relatedKeywords} rowKey="keyword" size="small" pagination={false}
                          columns={[
                            { title: '关键词', dataIndex: 'keyword', key: 'keyword', render: (t: string) => <Text strong>{t}</Text> },
                            { title: '搜索量', dataIndex: 'volume', key: 'volume', width: 90, render: (v: number) => v.toLocaleString() },
                            { title: '竞争度', dataIndex: 'competition', key: 'competition', width: 80, render: (v: number) => <Progress percent={Math.round(v * 100)} size="small" strokeColor={v > 0.6 ? '#ff4d4f' : '#52c41a'} /> },
                            { title: 'CPC', dataIndex: 'cpc', key: 'cpc', width: 70, render: (v: number) => `¥${v.toFixed(2)}` },
                          ]}
                          scroll={{ x: 360 }}
                          style={{ marginBottom: 16 }}
                        />
                        <Divider orientation="left" plain>用户常见问题</Divider>
                        {researchResult.questions.map((q, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: i % 2 === 0 ? '#fafafa' : 'transparent', borderRadius: 4, marginBottom: 4 }}>
                            <Space><QuestionCircleOutlined style={{ color: '#1677ff' }} /><Text>{q.question}</Text></Space>
                            <Text type="secondary">{q.volume} 次/月</Text>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                        <ExperimentOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block' }} />
                        <Text type="secondary">点击关键词列表中的"研究"按钮，查看深度分析</Text>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'list',
            label: <span><SearchOutlined /> 关键词列表</span>,
            children: (
              <>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <Space wrap>
                    <Input.Search placeholder="搜索关键词..." value={searchText} onChange={(e) => setSearchText(e.target.value)} onSearch={() => { setPage(1); loadKeywords(); }} style={{ width: 250 }} allowClear />
                    <Select placeholder="筛选标签" style={{ width: 140 }} allowClear onChange={(val) => { setSearchText(val ? `tag:${val}` : ''); setPage(1); }} options={PRESET_TAGS.map((t) => ({ label: t.label, value: t.key }))} />
                  </Space>
                  <Space>
                    {selectedRowKeys.length > 0 && (
                      <>
                        <Button icon={<TagOutlined />} onClick={() => setTagModal(true)}>批量标签 ({selectedRowKeys.length})</Button>
                        <Popconfirm title={`确定删除 ${selectedRowKeys.length} 个关键词？`} onConfirm={handleBatchDelete}>
                          <Button danger icon={<DeleteOutlined />}>批量删除</Button>
                        </Popconfirm>
                      </>
                    )}
                    <Button icon={<ImportOutlined />} onClick={() => setImportModal(true)}>批量导入</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingKeyword(null); form.resetFields(); setModalOpen(true); }}>添加关键词</Button>
                  </Space>
                </div>
                <Table
                  rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys) }}
                  columns={columns}
                  dataSource={keywords}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    current: page, pageSize, total, showSizeChanger: true, showQuickJumper: true,
                    showTotal: (t) => `共 ${t} 个关键词`, onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                  }}
                  size="middle"
                  scroll={{ x: 1100 }}
                  locale={{ emptyText: <Empty description="还没有关键词，点击「添加关键词」或「批量导入」开始" /> }}
                />
              </>
            ),
          },
          {
            key: 'content',
            label: <span><AimOutlined /> 内容规划</span>,
            children: (
              <Row gutter={[24, 24]}>
                <Col span={24}>
                  <Alert type="info" showIcon message="内容规划"
                    description="将关键词分配到具体页面，追踪内容覆盖情况。在关键词列表中为每个关键词设置目标 URL，即可建立关键词-页面映射关系。" style={{ marginBottom: 16 }} />
                </Col>
                <Col xs={24} lg={14}>
                  <Card title="关键词-页面映射">
                    <Table
                      dataSource={keywords.filter((k: any) => k.url).slice(0, 20)}
                      rowKey="id" size="small" pagination={{ pageSize: 10, showSizeChanger: false }}
                      locale={{ emptyText: '暂无映射，请在关键词列表中为关键词设置目标 URL' }}
                      columns={[
                        { title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 180, render: (t: string) => <Text strong>{t}</Text> },
                        { title: '目标页面', dataIndex: 'url', key: 'url', ellipsis: true, render: (url: string) => url ? <a href={url} target="_blank" rel="noopener noreferrer">{url}</a> : <Tag>未设置</Tag> },
                        { title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 80, render: (v: number) => (v || 0).toLocaleString() },
                        { title: '排名', dataIndex: 'currentRank', key: 'currentRank', width: 80, render: (v: number) => v ? <Tag color={v <= 3 ? 'green' : 'blue'}>#{v}</Tag> : <Tag>未收录</Tag> },
                        {
                          title: '状态', key: 'status', width: 100,
                          render: (_: any, record: any) => {
                            const rank = record.currentRank || record.position || 999;
                            if (rank <= 3) return <Badge status="success" text="已优化" />;
                            if (rank <= 20) return <Badge status="processing" text="需优化" />;
                            return <Badge status="warning" text="待处理" />;
                          },
                        },
                      ]}
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={10}>
                  <Card title="内容覆盖概览">
                    <Row gutter={[16, 24]}>
                      <Col span={12}><Statistic title="已映射" value={keywords.filter((k: any) => k.url).length} suffix={`/ ${keywords.length}`} /></Col>
                      <Col span={12}><Statistic title="未映射" value={keywords.filter((k: any) => !k.url).length} valueStyle={{ color: '#faad14' }} /></Col>
                      <Col span={12}><Statistic title="TOP3 页面" value={keywords.filter((k: any) => (k.currentRank || 0) <= 3 && k.url).length} valueStyle={{ color: '#52c41a' }} /></Col>
                      <Col span={12}><Statistic title="内容缺口" value={keywords.filter((k: any) => !k.url && (k.currentRank || 0) === 0).length} valueStyle={{ color: '#ff4d4f' }} /></Col>
                    </Row>
                    <Divider />
                    <div style={{ padding: '0 8px' }}>
                      <Text strong>建议优先处理：</Text>
                      {keywords.filter((k: any) => !k.url).sort((a: any, b: any) => (b.searchVolume || 0) - (a.searchVolume || 0)).slice(0, 5).map((k: any) => (
                        <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <Space><AimOutlined style={{ color: '#fa8c16' }} /><Text>{k.keyword}</Text></Space>
                          <Text type="secondary">{(k.searchVolume || 0).toLocaleString()} 次/月</Text>
                        </div>
                      ))}
                      {keywords.filter((k: any) => !k.url).length === 0 && (
                        <Text type="secondary" style={{ display: 'block', padding: '20px 0', textAlign: 'center' }}>所有关键词已分配页面，内容覆盖完整</Text>
                      )}
                    </div>
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />

      {/* 添加/编辑弹窗 */}
      <Modal
        title={editingKeyword ? '编辑关键词' : '添加关键词'}
        open={modalOpen}
        onOk={handleAddKeyword}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditingKeyword(null); }}
        okText={editingKeyword ? '保存' : '添加'}
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="keyword" label="关键词" rules={[{ required: true, message: '请输入关键词' }]}>
            <Input placeholder="输入关键词" prefix={<SearchOutlined />} />
          </Form.Item>
          <Form.Item name="url" label="目标 URL">
            <Input placeholder="https://your-site.com/page" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量导入弹窗 */}
      <Modal
        title="批量导入关键词"
        open={importModal}
        onOk={handleBatchImport}
        onCancel={() => { setImportModal(false); setImportText(''); }}
        okText="导入" cancelText="取消"
        destroyOnClose
      >
        <div style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>每行一个关键词，或用逗号分隔</Text>
          <TextArea rows={8} value={importText} onChange={(e) => setImportText(e.target.value)}
            placeholder={`crane for sale\ntruck mounted crane\nmobile crane price\nhydraulic crane manufacturer`} />
        </div>
      </Modal>

      {/* 批量标签弹窗 */}
      <Modal
        title="批量设置标签"
        open={tagModal}
        onOk={handleBatchTag}
        onCancel={() => { setTagModal(false); setSelectedTags([]); }}
        okText="保存" cancelText="取消"
        destroyOnClose
      >
        <div style={{ marginTop: 16 }}>
          <Text style={{ display: 'block', marginBottom: 12 }}>为 {selectedRowKeys.length} 个关键词设置标签</Text>
          <Select mode="multiple" style={{ width: '100%' }} placeholder="选择标签" value={selectedTags} onChange={setSelectedTags}
            options={PRESET_TAGS.map((t) => ({ label: t.label, value: t.key }))} />
        </div>
      </Modal>
    </div>
  );
};

export default Keywords;