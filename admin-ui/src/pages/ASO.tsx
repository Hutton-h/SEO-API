import React, { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Typography, Row, Col, Statistic, Button, Space, Select, Progress, Empty, Spin, Alert, message,
  Modal, Input, Form,
} from 'antd';
import {
  AppleOutlined, AndroidOutlined, ReloadOutlined, ArrowUpOutlined,
  ArrowDownOutlined, MinusOutlined, StarOutlined, DownloadOutlined, PlusOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useStore } from '@/store';
import { asoAPI } from '@/services/aso';
import type { ASOKeyword, ASOTrend } from '@/services/aso';
import PageHeader from '@/components/PageHeader';

echarts.use([LineChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text } = Typography;

const ASO: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asoKeywords, setAsoKeywords] = useState<ASOKeyword[]>([]);
  const [trend, setTrend] = useState<ASOTrend[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [platform, setPlatform] = useState('all');

  const loadData = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [kwRes, trendRes] = await Promise.all([
        asoAPI.getASOKeywords(projectId),
        asoAPI.getASOTrend(projectId),
      ]);

      const kwResult = (kwRes as any).data || kwRes;
      const trendResult = (trendRes as any).data || trendRes;

      setAsoKeywords(Array.isArray(kwResult) ? kwResult : kwResult.data || []);
      setTrend(Array.isArray(trendResult) ? trendResult : trendResult.data || []);
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
    try {
      await asoAPI.refreshASOData(projectId);
      message.success('ASO 数据刷新成功');
      await loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '刷新失败';
      setError(msg);
      setLoading(false);
    }
  };

  const handleAddKeyword = () => {
    addForm.resetFields();
    setAddModalVisible(true);
  };

  const handleAddSubmit = async () => {
    const values = await addForm.validateFields();
    setSubmitting(true);
    try {
      await asoAPI.addASOKeyword(projectId!, values.keyword);
      message.success('关键词已添加');
      setAddModalVisible(false);
      await loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '添加失败';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!projectId) return <Empty description="请先选择一个项目" style={{ marginTop: 120 }} />;
  if (loading && !asoKeywords.length && !trend.length) {
    return <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />;
  }
  if (error && !asoKeywords.length && !trend.length) {
    return <Alert type="error" message="加载失败" description={error} showIcon style={{ margin: '20vh auto', maxWidth: 600 }} />;
  }

  const trendOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['App Store', 'Google Play'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: trend.map((d) => d.date), axisLabel: { color: '#999' } },
    yAxis: { type: 'value', name: '排名', inverse: true, axisLabel: { color: '#999' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [
      {
        name: 'App Store', type: 'line', data: trend.map((d) => d.appStore),
        smooth: true, lineStyle: { color: '#1677ff', width: 3 }, itemStyle: { color: '#1677ff' }, symbol: 'circle', symbolSize: 6,
      },
      {
        name: 'Google Play', type: 'line', data: trend.map((d) => d.googlePlay),
        smooth: true, lineStyle: { color: '#52c41a', width: 3 }, itemStyle: { color: '#52c41a' }, symbol: 'circle', symbolSize: 6,
      },
    ],
  };

  const columns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', render: (t: string) => <Text strong>{t}</Text> },
    {
      title: 'App Store 排名', key: 'appStore', width: 140,
      render: (_: any, r: any) => (
        <Space>
          <Tag color={r.appStore.position <= 3 ? '#52c41a' : '#1677ff'}>#{r.appStore.position}</Tag>
          {r.appStore.change > 0 ? <ArrowUpOutlined style={{ color: '#52c41a' }} /> : r.appStore.change < 0 ? <ArrowDownOutlined style={{ color: '#ff4d4f' }} /> : <MinusOutlined />}
        </Space>
      ),
    },
    {
      title: 'Google Play 排名', key: 'googlePlay', width: 140,
      render: (_: any, r: any) => (
        <Space>
          <Tag color={r.googlePlay.position <= 3 ? '#52c41a' : '#1677ff'}>#{r.googlePlay.position}</Tag>
          {r.googlePlay.change > 0 ? <ArrowUpOutlined style={{ color: '#52c41a' }} /> : r.googlePlay.change < 0 ? <ArrowDownOutlined style={{ color: '#ff4d4f' }} /> : <MinusOutlined />}
        </Space>
      ),
    },
    { title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 100, render: (v: number) => v.toLocaleString() },
    {
      title: '难度', dataIndex: 'difficulty', key: 'difficulty', width: 90,
      render: (d: string) => {
        const colors: Record<string, string> = { high: '#ff4d4f', medium: '#faad14', low: '#52c41a' };
        const labels: Record<string, string> = { high: '高', medium: '中', low: '低' };
        return <Tag color={colors[d]}>{labels[d]}</Tag>;
      },
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="ASO 排名"
        subtitle="App Store & Google Play 关键词排名监控"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          { label: '添加关键词', icon: <PlusOutlined />, onClick: handleAddKeyword },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="App Store 关键词" value={asoKeywords.length} prefix={<AppleOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="Google Play 关键词" value={asoKeywords.length} prefix={<AndroidOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="App Store 评分" value={4.6} prefix={<StarOutlined style={{ color: '#faad14' }} />} precision={1} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="总下载量" value="12.5k" prefix={<DownloadOutlined />} /></Card>
        </Col>
      </Row>

      <Card title="排名趋势" className="chart-card" style={{ marginBottom: 24 }}>
        <ReactEChartsCore echarts={echarts} option={trendOption} style={{ height: 300 }} notMerge />
      </Card>

      <Card
        title="关键词排名"
        extra={
          <Select defaultValue="all" style={{ width: 140 }} onChange={setPlatform} options={[
            { value: 'all', label: '全部' },
            { value: 'appstore', label: 'App Store' },
            { value: 'googleplay', label: 'Google Play' },
          ]} />
        }
      >
        <Table columns={columns} dataSource={asoKeywords} rowKey="id" pagination={false} size="middle" loading={loading} />
      </Card>
    </div>
  );
};

export default ASO;