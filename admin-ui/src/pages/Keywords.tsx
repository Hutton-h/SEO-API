import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Tag, Space, Modal, Input, Form, Typography, message, InputNumber, Popconfirm, Spin, Empty, Alert,
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
import { useStore } from '@/store';
import { keywordAPI } from '@/services/keyword';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text } = Typography;

const defaultKeywords = [
  '品牌词', '产品词', '行业词', '长尾关键词', '竞品词',
  '地域词', '问题类关键词', '对比类关键词', '教程类关键词',
];

const Keywords: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [searchVolumeTrend, setSearchVolumeTrend] = useState<any[]>([]);
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [form] = Form.useForm();

  const loadKeywords = async () => {
    try {
      const res = await keywordAPI.getKeywords(projectId!);
      const d = (res as any).data !== undefined ? (res as any).data : res;
      const list = Array.isArray(d) ? d : (d?.data || d?.keywords || []);
      setKeywords(list);
      return list;
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载关键词失败';
      throw new Error(msg);
    }
  };

  const loadSearchVolumeTrend = async (keywordId: string) => {
    try {
      const res = await keywordAPI.getSearchVolumeTrend(projectId!, keywordId);
      const d = (res as any).data !== undefined ? (res as any).data : res;
      const trend = Array.isArray(d) ? d : (d?.trend || d?.data || []);
      setSearchVolumeTrend(trend);
    } catch {
      setSearchVolumeTrend([]);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await loadKeywords();
      if (list.length > 0) {
        setSelectedKeywordId(list[0].id);
        await loadSearchVolumeTrend(list[0].id);
      }
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    loadAllData();
  }, [projectId]);

  const handleAddKeyword = async () => {
    try {
      const values = await form.validateFields();
      if (editingKeyword) {
        await keywordAPI.updateKeyword(projectId!, editingKeyword.id, values);
        message.success('关键词已更新');
      } else {
        await keywordAPI.addKeyword(projectId!, values);
        message.success(`成功添加关键词: ${values.keyword}`);
      }
      setModalOpen(false);
      form.resetFields();
      setEditingKeyword(null);
      loadKeywords();
    } catch (err: any) {
      if (err?.errorFields) return;
      const msg = err?.response?.data?.error?.message || err?.message || '操作失败';
      message.error(msg);
    }
  };

  const handleEditKeyword = (record: any) => {
    setEditingKeyword(record);
    form.setFieldsValue({ keyword: record.keyword, url: record.url });
    setModalOpen(true);
  };

  const handleDeleteKeyword = async (id: string) => {
    try {
      await keywordAPI.deleteKeyword(projectId!, id);
      message.success('关键词已删除');
      loadKeywords();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '删除失败';
      message.error(msg);
    }
  };

  const handleImportDefault = async () => {
    setImportLoading(true);
    try {
      for (const kw of defaultKeywords) {
        try {
          await keywordAPI.addKeyword(projectId!, { keyword: kw });
        } catch {
          // 跳过重复或失败的
        }
      }
      message.success(`成功导入 ${defaultKeywords.length} 个默认关键词`);
      loadKeywords();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '导入失败';
      message.error(msg);
    } finally {
      setImportLoading(false);
    }
  };

  const handleRefresh = () => {
    loadAllData();
  };

  const handleSelectKeyword = (keywordId: string) => {
    setSelectedKeywordId(keywordId);
    loadSearchVolumeTrend(keywordId);
  };

  const trendRender = (trend: string) => {
    if (trend === 'up') return <ArrowUpOutlined style={{ color: '#52c41a' }} />;
    if (trend === 'down') return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />;
    return <MinusOutlined style={{ color: '#d9d9d9' }} />;
  };

  // ---- 空状态 / 加载状态 / 错误状态 ----
  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="关键词管理" subtitle="请先选择一个项目" />
        <Empty description="请先选择一个项目" style={{ marginTop: 120 }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="关键词管理" subtitle="加载中..." />
        <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <PageHeader title="关键词管理" subtitle="加载出错" />
        <Alert
          type="error"
          message="加载失败"
          description={error}
          showIcon
          style={{ marginTop: 24 }}
          action={<Button size="small" onClick={handleRefresh}>重试</Button>}
        />
      </div>
    );
  }

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
      sorter: (a: any, b: any) => (a.searchVolume || 0) - (b.searchVolume || 0),
      render: (val: number) => (val ?? 0).toLocaleString(),
    },
    {
      title: '竞争度',
      dataIndex: 'competition',
      key: 'competition',
      width: 120,
      sorter: (a: any, b: any) => (a.competition || 0) - (b.competition || 0),
      render: (val: number) => {
        const v = val ?? 0;
        const color = v > 0.8 ? '#ff4d4f' : v > 0.5 ? '#faad14' : '#52c41a';
        const label = v > 0.8 ? '高' : v > 0.5 ? '中' : '低';
        return <Tag color={color}>{label} ({(v * 100).toFixed(0)}%)</Tag>;
      },
    },
    {
      title: 'CPC',
      dataIndex: 'cpc',
      key: 'cpc',
      width: 100,
      render: (val: number) => `¥${(val ?? 0).toFixed(2)}`,
    },
    {
      title: '当前排名',
      dataIndex: 'currentRank',
      key: 'currentRank',
      width: 100,
      render: (val: number) => {
        const v = val ?? 0;
        const color = v <= 3 ? '#52c41a' : v <= 10 ? '#1677ff' : '#faad14';
        return <Tag color={color}>{v}</Tag>;
      },
    },
    {
      title: '变化',
      key: 'change',
      width: 80,
      render: (_: any, record: any) => {
        const diff = (record.previousRank || 0) - (record.currentRank || 0);
        const trend = record.trend || (diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable');
        return (
          <Space>
            {trendRender(trend)}
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
      width: 140,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEditKeyword(record)}
          />
          <Button
            type="link"
            icon={<SearchOutlined />}
            size="small"
            onClick={() => handleSelectKeyword(record.id)}
          >
            趋势
          </Button>
          <Popconfirm
            title="确定删除此关键词？"
            okText="确定"
            cancelText="取消"
            onConfirm={() => handleDeleteKeyword(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
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
      data: searchVolumeTrend.map((d: any) => d.month || d.date || d.label || ''),
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
        data: searchVolumeTrend.map((d: any) => d.volume || d.value || 0),
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
        data: searchVolumeTrend.map((d: any) => d.volume || d.value || 0),
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
        subtitle={`共 ${keywords.length} 个关键词`}
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          { label: '导入默认', icon: <ImportOutlined />, onClick: handleImportDefault, loading: importLoading },
          {
            label: '添加关键词',
            type: 'primary',
            icon: <PlusOutlined />,
            onClick: () => {
              setEditingKeyword(null);
              form.resetFields();
              setModalOpen(true);
            },
          },
        ]}
      />

      {/* 搜索量趋势图 */}
      <Card title="搜索量趋势 (近7个月)" className="chart-card" style={{ marginBottom: 24 }}>
        {searchVolumeTrend.length > 0 ? (
          <ReactEChartsCore
            echarts={echarts}
            option={chartOption}
            style={{ height: 300 }}
            notMerge
          />
        ) : (
          <Empty description="请选择一个关键词查看趋势" style={{ padding: '60px 0' }} />
        )}
      </Card>

      {/* 关键词表格 */}
      <Card title="关键词列表">
        <Table
          columns={columns}
          dataSource={keywords}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
          size="middle"
          loading={loading}
        />
      </Card>

      {/* 添加/编辑关键词 Modal */}
      <Modal
        title={editingKeyword ? '编辑关键词' : '添加关键词'}
        open={modalOpen}
        onOk={handleAddKeyword}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
          setEditingKeyword(null);
        }}
        okText={editingKeyword ? '保存' : '添加'}
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