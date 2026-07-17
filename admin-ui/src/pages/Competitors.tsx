import React, { useState } from 'react';
import {
  Card, Table, Tag, Typography, Row, Col, Statistic, Button, Modal, Form, Input, Space, Progress, message, Popconfirm,
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
import PageHeader from '@/components/PageHeader';

echarts.use([BarChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text, Paragraph } = Typography;

const mockCompetitors = [
  { id: '1', name: '本站', domain: 'example.com', keywords: 3845, traffic: 125000, domainAuthority: 52, topKeywords: 245, avgPosition: 8.5, backlinks: 1245 },
  { id: '2', name: '竞品A', domain: 'competitor-a.com', keywords: 5200, traffic: 210000, domainAuthority: 68, topKeywords: 380, avgPosition: 5.2, backlinks: 3200 },
  { id: '3', name: '竞品B', domain: 'competitor-b.com', keywords: 3100, traffic: 95000, domainAuthority: 45, topKeywords: 180, avgPosition: 10.8, backlinks: 890 },
  { id: '4', name: '竞品C', domain: 'competitor-c.com', keywords: 2800, traffic: 78000, domainAuthority: 38, topKeywords: 120, avgPosition: 12.5, backlinks: 650 },
  { id: '5', name: '竞品D', domain: 'competitor-d.com', keywords: 4500, traffic: 180000, domainAuthority: 58, topKeywords: 310, avgPosition: 6.8, backlinks: 2100 },
];

const mockKeywordOverlap = [
  { keyword: 'SEO优化', ourRank: 3, compARank: 2, compBRank: 5, compCRank: 8, compDRank: 1 },
  { keyword: '网站排名', ourRank: 7, compARank: 4, compBRank: 12, compCRank: 15, compDRank: 6 },
  { keyword: '搜索引擎优化', ourRank: 2, compARank: 1, compBRank: 3, compCRank: 7, compDRank: 4 },
  { keyword: '关键词研究', ourRank: 5, compARank: 3, compBRank: 8, compCRank: 10, compDRank: 5 },
  { keyword: 'SEO工具', ourRank: 4, compARank: 6, compBRank: 9, compCRank: 11, compDRank: 3 },
  { keyword: '外链建设', ourRank: 8, compARank: 5, compBRank: 10, compCRank: 13, compDRank: 7 },
];

const Competitors: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  const handleAddCompetitor = async () => {
    try {
      const values = await form.validateFields();
      message.success(`成功添加竞品: ${values.name}`);
      setModalOpen(false);
      form.resetFields();
    } catch {
      // validation error
    }
  };

  const overlapOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['本站', '竞品A', '竞品B', '竞品C', '竞品D'], top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: { type: 'category', data: mockKeywordOverlap.map((k) => k.keyword), axisLabel: { color: '#999', rotate: 20 } },
    yAxis: { type: 'value', name: '排名', inverse: true, axisLabel: { color: '#999' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [
      { name: '本站', type: 'bar', data: mockKeywordOverlap.map((k) => k.ourRank), itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] } },
      { name: '竞品A', type: 'bar', data: mockKeywordOverlap.map((k) => k.compARank), itemStyle: { color: '#52c41a', borderRadius: [4, 4, 0, 0] } },
      { name: '竞品B', type: 'bar', data: mockKeywordOverlap.map((k) => k.compBRank), itemStyle: { color: '#fa8c16', borderRadius: [4, 4, 0, 0] } },
      { name: '竞品C', type: 'bar', data: mockKeywordOverlap.map((k) => k.compCRank), itemStyle: { color: '#ff4d4f', borderRadius: [4, 4, 0, 0] } },
      { name: '竞品D', type: 'bar', data: mockKeywordOverlap.map((k) => k.compDRank), itemStyle: { color: '#722ed1', borderRadius: [4, 4, 0, 0] } },
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
        <Popconfirm title="确定移除此竞品？" okText="确定" cancelText="取消">
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
          <Card size="small"><Statistic title="追踪竞品" value={mockCompetitors.length - 1} prefix={<TeamOutlined style={{ color: '#1677ff' }} />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="关键词重叠" value={mockKeywordOverlap.length} prefix={<TrophyOutlined style={{ color: '#faad14' }} />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="领先关键词" value={2} suffix={`/ ${mockKeywordOverlap.length}`} prefix={<RiseOutlined style={{ color: '#52c41a' }} />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="竞品平均 DA" value={52} prefix={<GlobalOutlined style={{ color: '#722ed1' }} />} /></Card>
        </Col>
      </Row>

      <Card title="竞品概览" style={{ marginBottom: 24 }}>
        <Table columns={columns} dataSource={mockCompetitors} rowKey="id" pagination={false} size="middle" loading={loading} />
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