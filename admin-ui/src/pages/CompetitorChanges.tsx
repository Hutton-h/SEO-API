import React, { useState } from 'react';
import {
  Card, Row, Col, Table, Button, Tag, Typography, Space, Statistic,
  message, DatePicker, Select,
} from 'antd';
import {
  ReloadOutlined, ThunderboltOutlined, RiseOutlined, FallOutlined,
  SwapOutlined, EditOutlined, DeleteOutlined, PlusOutlined, MinusOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import dayjs from 'dayjs';

echarts.use([PieChart, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text } = Typography;

const mockChanges = [
  { id: '1', competitorName: '竞品A', competitorUrl: 'https://competitor-a.com', pageUrl: '/blog/seo-guide', field: '标题', oldValue: 'SEO Guide', newValue: 'The Ultimate SEO Guide 2024', changeType: 'modified' as const, detectedAt: '2024-07-15T09:00:00', projectId: 'p1' },
  { id: '2', competitorName: '竞品B', competitorUrl: 'https://competitor-b.com', pageUrl: '/pricing', field: '价格', oldValue: '$99/mo', newValue: '$79/mo', changeType: 'modified' as const, detectedAt: '2024-07-15T08:30:00', projectId: 'p1' },
  { id: '3', competitorName: '竞品A', competitorUrl: 'https://competitor-a.com', pageUrl: '/new-feature', field: '新页面', oldValue: '', newValue: 'https://competitor-a.com/ai-tools', changeType: 'added' as const, detectedAt: '2024-07-14T16:00:00', projectId: 'p1' },
  { id: '4', competitorName: '竞品C', competitorUrl: 'https://competitor-c.com', pageUrl: '/old-page', field: '页面', oldValue: 'https://competitor-c.com/old-page', newValue: '', changeType: 'removed' as const, detectedAt: '2024-07-14T14:00:00', projectId: 'p2' },
  { id: '5', competitorName: '竞品B', competitorUrl: 'https://competitor-b.com', pageUrl: '/about', field: 'Meta Description', oldValue: 'Learn about our company', newValue: 'Leading SEO platform trusted by 10000+ businesses worldwide', changeType: 'modified' as const, detectedAt: '2024-07-14T10:00:00', projectId: 'p1' },
  { id: '6', competitorName: '竞品A', competitorUrl: 'https://competitor-a.com', pageUrl: '/services', field: 'H1标签', oldValue: 'Services', newValue: 'Professional SEO Services', changeType: 'modified' as const, detectedAt: '2024-07-13T22:00:00', projectId: 'p1' },
  { id: '7', competitorName: '竞品D', competitorUrl: 'https://competitor-d.com', pageUrl: '/blog/', field: '新增博客', oldValue: '', newValue: 'https://competitor-d.com/blog/10-new-posts', changeType: 'added' as const, detectedAt: '2024-07-13T18:00:00', projectId: 'p2' },
  { id: '8', competitorName: '竞品C', competitorUrl: 'https://competitor-c.com', pageUrl: '/contact', field: '联系表单', oldValue: 'https://competitor-c.com/contact', newValue: '', changeType: 'removed' as const, detectedAt: '2024-07-13T12:00:00', projectId: 'p2' },
];

const CompetitorChanges: React.FC = () => {
  const [changes, setChanges] = useState(mockChanges);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const handleRefresh = () => { setLoading(true); setTimeout(() => setLoading(false), 800); };

  const handleDetect = () => {
    setDetecting(true);
    message.loading({ content: '正在检测竞品变更...', key: 'detect' });
    setTimeout(() => {
      setDetecting(false);
      message.success({ content: '检测完成，发现 3 处变更', key: 'detect' });
    }, 2500);
  };

  const changeTypeConfig: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
    added: { color: '#52c41a', text: '新增', icon: <PlusOutlined /> },
    modified: { color: '#1677ff', text: '修改', icon: <EditOutlined /> },
    removed: { color: '#ff4d4f', text: '删除', icon: <DeleteOutlined /> },
  };

  const addedCount = changes.filter((c) => c.changeType === 'added').length;
  const modifiedCount = changes.filter((c) => c.changeType === 'modified').length;
  const removedCount = changes.filter((c) => c.changeType === 'removed').length;

  const pieData = [
    { name: '新增', value: addedCount, itemStyle: { color: '#52c41a' } },
    { name: '修改', value: modifiedCount, itemStyle: { color: '#1677ff' } },
    { name: '删除', value: removedCount, itemStyle: { color: '#ff4d4f' } },
  ];

  const pieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: '10%', top: 'center', itemGap: 16 },
    series: [{
      type: 'pie', radius: ['50%', '75%'], center: ['35%', '50%'],
      avoidLabelOverlap: false, itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 3 },
      label: { show: false }, emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: pieData,
    }],
  };

  const columns = [
    { title: '竞品', dataIndex: 'competitorName', key: 'competitorName', render: (text: string, record: any) => <Text strong>{text}</Text> },
    { title: '页面', dataIndex: 'pageUrl', key: 'pageUrl', ellipsis: true, render: (text: string) => <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{text}</Text> },
    { title: '字段', dataIndex: 'field', key: 'field', render: (text: string) => <Tag>{text}</Tag> },
    {
      title: '变更', key: 'change',
      render: (_: any, record: any) => (
        <Space direction="vertical" size={0}>
          <Text type="secondary" style={{ fontSize: 11, textDecoration: 'line-through', color: '#ff4d4f' }}>{record.oldValue || '(空)'}</Text>
          <Space size={4}>
            <SwapOutlined style={{ color: '#1677ff', fontSize: 12 }} />
            <Text style={{ color: '#52c41a', fontSize: 12 }}>{record.newValue || '(空)'}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: '类型', dataIndex: 'changeType', key: 'changeType',
      render: (type: string) => {
        const config = changeTypeConfig[type];
        return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
      },
    },
    { title: '检测时间', dataIndex: 'detectedAt', key: 'detectedAt', render: (date: string) => dayjs(date).format('MM-DD HH:mm'), sorter: (a: any, b: any) => dayjs(a.detectedAt).unix() - dayjs(b.detectedAt).unix() },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="竞品变更追踪"
        subtitle="实时监控竞品网站内容与结构变化"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          { label: '手动检测', type: 'primary', icon: <ThunderboltOutlined />, onClick: handleDetect, loading: detecting },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card><Statistic title="总变更数" value={changes.length} valueStyle={{ color: '#1677ff' }} prefix={<SwapOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="新增" value={addedCount} valueStyle={{ color: '#52c41a' }} prefix={<PlusOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="修改" value={modifiedCount} valueStyle={{ color: '#1677ff' }} prefix={<EditOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="删除" value={removedCount} valueStyle={{ color: '#ff4d4f' }} prefix={<DeleteOutlined />} /></Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title="变更列表" className="chart-card">
            <Table columns={columns} dataSource={changes} rowKey="id" pagination={{ pageSize: 10 }} size="middle" scroll={{ x: 900 }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="变更类型分布" className="chart-card">
            <ReactEChartsCore echarts={echarts} option={pieOption} style={{ height: 350 }} notMerge />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CompetitorChanges;