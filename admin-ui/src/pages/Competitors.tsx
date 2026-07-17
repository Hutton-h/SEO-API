import React, { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Typography, Row, Col, Statistic, Button, Modal, Form, Input, Space, Progress, message, Popconfirm, Empty, Spin, Alert,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ReloadOutlined, TeamOutlined,
  TrophyOutlined, RiseOutlined, GlobalOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useStore } from '@/store';
import { competitorAPI } from '@/services/competitor';
import type { Competitor, KeywordOverlap } from '@/services/competitor';
import PageHeader from '@/components/PageHeader';

echarts.use([BarChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text, Paragraph } = Typography;

const Competitors: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [keywordOverlap, setKeywordOverlap] = useState<KeywordOverlap[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, overlapRes] = await Promise.all([
        competitorAPI.getOverview(projectId),
        competitorAPI.getKeywordOverlap(projectId),
      ]);

      const overviewResult = (overviewRes as any).data || overviewRes;
      const overlapResult = (overlapRes as any).data || overlapRes;

      setCompetitors(Array.isArray(overviewResult) ? overviewResult : overviewResult.data || []);
      setKeywordOverlap(Array.isArray(overlapResult) ? overlapResult : overlapResult.data || []);
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

  const handleRefresh = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    await loadData();
  };

  const handleAddCompetitor = async () => {
    if (!projectId) return;
    try {
      const values = await form.validateFields();
      setLoading(true);
      try {
        await competitorAPI.addCompetitor(projectId, values);
        message.success(`成功添加竞品: ${values.name}`);
        setModalOpen(false);
        form.resetFields();
        await loadData();
      } catch (err: any) {
        const msg = err?.response?.data?.error?.message || err?.message || '添加失败';
        message.error(msg);
      } finally {
        setLoading(false);
      }
    } catch {
      // validation error
    }
  };

  const handleRemoveCompetitor = async (competitorId: string) => {
    if (!projectId) return;
    try {
      setLoading(true);
      await competitorAPI.removeCompetitor(projectId, competitorId);
      message.success('竞品移除成功');
      await loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '移除失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!projectId) return <Empty description="请先选择一个项目" style={{ marginTop: 120 }} />;
  if (loading && !competitors.length && !keywordOverlap.length) {
    return <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />;
  }
  if (error && !competitors.length && !keywordOverlap.length) {
    return <Alert type="error" message="加载失败" description={error} showIcon style={{ margin: '20vh auto', maxWidth: 600 }} />;
  }

  // 计算统计数据
  const ourSite = competitors.find((c) => c.id === '1');
  const competitorCount = competitors.filter((c) => c.id !== '1').length;
  const avgDA = competitorCount > 0
    ? Math.round(competitors.filter((c) => c.id !== '1').reduce((acc, c) => acc + c.domainAuthority, 0) / competitorCount)
    : 0;
  const leadingKeywords = keywordOverlap.filter((k) => {
    const ourRank = k.ourRank;
    const otherRanks = [k.compARank, k.compBRank, k.compCRank, k.compDRank].filter((r) => r > 0);
    return otherRanks.length > 0 && ourRank <= Math.min(...otherRanks);
  }).length;

  // 动态生成竞品系列名称
  const competitorNames = competitors.filter((c) => c.id !== '1').map((c) => c.name);
  const allNames = ['本站', ...competitorNames];
  const colors = ['#1677ff', '#52c41a', '#fa8c16', '#ff4d4f', '#722ed1'];

  const overlapOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: allNames.slice(0, Math.min(competitors.length, 5)), top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: { type: 'category', data: keywordOverlap.map((k) => k.keyword), axisLabel: { color: '#999', rotate: 20 } },
    yAxis: { type: 'value', name: '排名', inverse: true, axisLabel: { color: '#999' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [
      { name: '本站', type: 'bar', data: keywordOverlap.map((k) => k.ourRank), itemStyle: { color: colors[0], borderRadius: [4, 4, 0, 0] } },
      ...competitors.filter((c) => c.id !== '1').slice(0, 4).map((comp, idx) => {
        const rankKey = `comp${String.fromCharCode(65 + idx)}Rank` as keyof KeywordOverlap;
        return {
          name: comp.name,
          type: 'bar' as const,
          data: keywordOverlap.map((k) => (k as any)[rankKey] || 0),
          itemStyle: { color: colors[idx + 1], borderRadius: [4, 4, 0, 0] as any },
        };
      }),
    ],
  };

  const columns = [
    {
      title: '竞品名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Space>
          <Text strong={record.id === '1'} style={{ color: record.id === '1' ? '#1677ff' : undefined }}>
            {text}
          </Text>
          {record.id === '1' && <Tag color="blue">本站</Tag>}
        </Space>
      ),
    },
    { title: '域名', dataIndex: 'domain', key: 'domain', render: (t: string) => <Text code>{t}</Text> },
    { title: '关键词数', dataIndex: 'keywords', key: 'keywords', width: 100, sorter: (a: any, b: any) => a.keywords - b.keywords, render: (v: number) => v.toLocaleString() },
    { title: '预估流量', dataIndex: 'traffic', key: 'traffic', width: 100, sorter: (a: any, b: any) => a.traffic - b.traffic, render: (v: number) => (v / 1000).toFixed(1) + 'k' },
    { title: 'DA', dataIndex: 'domainAuthority', key: 'domainAuthority', width: 70, sorter: (a: any, b: any) => a.domainAuthority - b.domainAuthority, render: (da: number) => <Text strong>{da}</Text> },
    { title: 'TOP10 关键词', dataIndex: 'topKeywords', key: 'topKeywords', width: 110, render: (v: number) => v.toLocaleString() },
    { title: '平均排名', dataIndex: 'avgPosition', key: 'avgPosition', width: 90, render: (p: number) => <Tag color={p <= 5 ? '#52c41a' : '#1677ff'}>{p}</Tag> },
    {
      title: '操作', key: 'actions', width: 80,
      render: (_: any, record: any) => record.id !== '1' ? (
        <Popconfirm title="确定移除此竞品？" okText="确定" cancelText="取消" onConfirm={() => handleRemoveCompetitor(record.id)}>
          <Button type="link" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ) : null,
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="竞品分析"
        subtitle="竞争对手 SEO 数据分析与对比"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          { label: '添加竞品', type: 'primary', icon: <PlusOutlined />, onClick: () => setModalOpen(true) },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="追踪竞品" value={competitorCount} prefix={<TeamOutlined style={{ color: '#1677ff' }} />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="关键词重叠" value={keywordOverlap.length} prefix={<TrophyOutlined style={{ color: '#faad14' }} />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="领先关键词" value={leadingKeywords} suffix={`/ ${keywordOverlap.length}`} prefix={<RiseOutlined style={{ color: '#52c41a' }} />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="竞品平均 DA" value={avgDA} prefix={<GlobalOutlined style={{ color: '#722ed1' }} />} /></Card>
        </Col>
      </Row>

      <Card title="竞品概览" style={{ marginBottom: 24 }}>
        <Table columns={columns} dataSource={competitors} rowKey="id" pagination={false} size="middle" loading={loading} />
      </Card>

      <Card title="关键词重叠矩阵">
        <ReactEChartsCore echarts={echarts} option={overlapOption} style={{ height: 400 }} notMerge />
      </Card>

      <Modal
        title="添加竞品"
        open={modalOpen}
        onOk={handleAddCompetitor}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        okText="添加"
        cancelText="取消"
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="竞品名称" rules={[{ required: true, message: '请输入竞品名称' }]}>
            <Input placeholder="例如：竞品A" />
          </Form.Item>
          <Form.Item name="domain" label="域名" rules={[{ required: true, message: '请输入域名' }, { type: 'url', message: '请输入有效URL' }]}>
            <Input placeholder="https://competitor.com" prefix={<GlobalOutlined />} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Competitors;