import React, { useState } from 'react';
import {
  Card, Table, Button, Tag, Space, Modal, Input, Form, Typography, message, InputNumber, Popconfirm,
} from 'antd';
import {
  PlusOutlined, ImportOutlined, DeleteOutlined, ReloadOutlined,
  ArrowUpOutlined, ArrowDownOutlined, MinusOutlined,
  SearchOutlined, EditOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text } = Typography;

// 模拟数据
const mockKeywords = [
  { id: '1', keyword: 'SEO优化服务', searchVolume: 12000, competition: 0.85, cpc: 45.5, currentRank: 3, previousRank: 5, trend: 'up', url: '/services/seo' },
  { id: '2', keyword: '网站排名提升', searchVolume: 8800, competition: 0.72, cpc: 32.8, currentRank: 7, previousRank: 4, trend: 'down', url: '/blog/ranking-tips' },
  { id: '3', keyword: '关键词研究工具', searchVolume: 6600, competition: 0.65, cpc: 28.0, currentRank: 12, previousRank: 12, trend: 'stable', url: '/tools/keyword' },
  { id: '4', keyword: '搜索引擎优化', searchVolume: 15000, competition: 0.92, cpc: 52.0, currentRank: 2, previousRank: 3, trend: 'up', url: '/' },
  { id: '5', keyword: '外链建设', searchVolume: 5400, competition: 0.58, cpc: 22.5, currentRank: 8, previousRank: 15, trend: 'up', url: '/services/backlinks' },
  { id: '6', keyword: '内容营销策略', searchVolume: 9200, competition: 0.78, cpc: 38.2, currentRank: 5, previousRank: 6, trend: 'up', url: '/blog/content-strategy' },
  { id: '7', keyword: '本地SEO', searchVolume: 3700, competition: 0.45, cpc: 18.0, currentRank: 15, previousRank: 10, trend: 'down', url: '/services/local-seo' },
  { id: '8', keyword: 'SEO审计', searchVolume: 4800, competition: 0.62, cpc: 28.5, currentRank: 4, previousRank: 4, trend: 'stable', url: '/services/audit' },
];

const mockSearchVolumeTrend = [
  { month: '1月', volume: 8500 },
  { month: '2月', volume: 9200 },
  { month: '3月', volume: 8800 },
  { month: '4月', volume: 10200 },
  { month: '5月', volume: 11500 },
  { month: '6月', volume: 10800 },
  { month: '7月', volume: 12000 },
];

const defaultKeywords = [
  '品牌词', '产品词', '行业词', '长尾关键词', '竞品词',
  '地域词', '问题类关键词', '对比类关键词', '教程类关键词',
];

const Keywords: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleAddKeyword = async () => {
    try {
      const values = await form.validateFields();
      message.success(`成功添加关键词: ${values.keyword}`);
      setModalOpen(false);
      form.resetFields();
    } catch {
      // validation error
    }
  };

  const handleImportDefault = () => {
    setImportLoading(true);
    setTimeout(() => {
      setImportLoading(false);
      message.success(`成功导入 ${defaultKeywords.length} 个默认关键词`);
    }, 1500);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  const trendRender = (trend: string) => {
    if (trend === 'up') return <ArrowUpOutlined style={{ color: '#52c41a' }} />;
    if (trend === 'down') return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />;
    return <MinusOutlined style={{ color: '#d9d9d9' }} />;
  };

  const columns = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      key: 'keyword',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '搜索量',
      dataIndex: 'searchVolume',
      key: 'searchVolume',
      width: 120,
      sorter: (a: any, b: any) => a.searchVolume - b.searchVolume,
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: '竞争度',
      dataIndex: 'competition',
      key: 'competition',
      width: 120,
      sorter: (a: any, b: any) => a.competition - b.competition,
      render: (val: number) => {
        const color = val > 0.8 ? '#ff4d4f' : val > 0.5 ? '#faad14' : '#52c41a';
        const label = val > 0.8 ? '高' : val > 0.5 ? '中' : '低';
        return <Tag color={color}>{label} ({(val * 100).toFixed(0)}%)</Tag>;
      },
    },
    {
      title: 'CPC',
      dataIndex: 'cpc',
      key: 'cpc',
      width: 100,
      render: (val: number) => `¥${val.toFixed(2)}`,
    },
    {
      title: '当前排名',
      dataIndex: 'currentRank',
      key: 'currentRank',
      width: 100,
      render: (val: number) => {
        const color = val <= 3 ? '#52c41a' : val <= 10 ? '#1677ff' : '#faad14';
        return <Tag color={color}>{val}</Tag>;
      },
    },
    {
      title: '变化',
      key: 'change',
      width: 80,
      render: (_: any, record: any) => {
        const diff = record.previousRank - record.currentRank;
        return (
          <Space>
            {trendRender(record.trend)}
            <Text style={{ color: diff > 0 ? '#52c41a' : diff < 0 ? '#ff4d4f' : '#999' }}>
              {diff > 0 ? `+${diff}` : diff}
            </Text>
          </Space>
        );
      },
    },
    {
      title: '目标 URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: () => (
        <Popconfirm title="确定删除此关键词？" okText="确定" cancelText="取消">
          <Button type="link" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ];

  const chartOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '8%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: mockSearchVolumeTrend.map((d) => d.month),
      axisLabel: { color: '#999' },
    },
    yAxis: {
      type: 'value',
      name: '搜索量',
      axisLabel: {
        color: '#999',
        formatter: (val: number) => (val / 1000).toFixed(0) + 'k',
      },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    },
    series: [
      {
        type: 'bar',
        data: mockSearchVolumeTrend.map((d) => d.volume),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#1677ff' },
              { offset: 1, color: '#69b1ff' },
            ],
          },
          borderRadius: [6, 6, 0, 0],
        },
        barWidth: '50%',
      },
      {
        type: 'line',
        data: mockSearchVolumeTrend.map((d) => d.volume),
        smooth: true,
        lineStyle: { color: '#ff7a45', width: 2 },
        itemStyle: { color: '#ff7a45' },
        symbol: 'circle',
        symbolSize: 8,
      },
    ],
  };

  return (
    <div className="page-container">
      <PageHeader
        title="关键词管理"
        subtitle={`共 ${mockKeywords.length} 个关键词`}
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          { label: '导入默认', icon: <ImportOutlined />, onClick: handleImportDefault, loading: importLoading },
          { label: '添加关键词', type: 'primary', icon: <PlusOutlined />, onClick: () => setModalOpen(true) },
        ]}
      />

      {/* 搜索量趋势图 */}
      <Card title="搜索量趋势 (近7个月)" className="chart-card" style={{ marginBottom: 24 }}>
        <ReactEChartsCore
          echarts={echarts}
          option={chartOption}
          style={{ height: 300 }}
          notMerge
        />
      </Card>

      {/* 关键词表格 */}
      <Card title="关键词列表">
        <Table
          columns={columns}
          dataSource={mockKeywords}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
          size="middle"
          loading={loading}
        />
      </Card>

      {/* 添加关键词 Modal */}
      <Modal
        title="添加关键词"
        open={modalOpen}
        onOk={handleAddKeyword}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        okText="添加"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="keyword"
            label="关键词"
            rules={[{ required: true, message: '请输入关键词' }]}
          >
            <Input placeholder="输入关键词" prefix={<SearchOutlined />} />
          </Form.Item>
          <Form.Item name="url" label="目标 URL">
            <Input placeholder="https://example.com/page" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Keywords;