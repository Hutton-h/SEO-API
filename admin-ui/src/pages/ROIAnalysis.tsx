import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Typography, Row, Col, Statistic, Space, message, Spin, Empty, Alert, Input, InputNumber, Modal, Form, Select, DatePicker, Tabs } from 'antd';
import { ReloadOutlined, PlusOutlined, DollarOutlined, RiseOutlined, FallOutlined, TrophyOutlined, ApiOutlined } from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { roiAPI } from '@/services/roi';

echarts.use([LineChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text } = Typography;

const ROIAnalysis: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ totalCost: 0, totalValue: 0, overallROI: 0, averageMonthlyROI: 0, bestMonth: '', worstMonth: '' });
  const [apiCosts, setApiCosts] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!projectId) return; setLoading(true); setError(null);
    try {
      const [dataRes, summaryRes, apiRes] = await Promise.allSettled([
        roiAPI.getROIData({ projectId }),
        roiAPI.getROISummary(),
        roiAPI.getApiCostSummary(),
      ]);
      const extractArr = (r: PromiseSettledResult<any>) => { if (r.status === 'fulfilled') { const d = (r.value as any).data !== undefined ? (r.value as any).data : r.value; return Array.isArray(d) ? d : (d?.data || []); } return []; };
      setData(extractArr(dataRes));
      if (summaryRes.status === 'fulfilled') { const d = (summaryRes.value as any).data !== undefined ? (summaryRes.value as any).data : summaryRes.value; if (d) setSummary(d); }
      setApiCosts(extractArr(apiRes));
    } catch (e: any) { setError(e?.message || '加载失败'); } finally { setLoading(false); }
  };

  useEffect(() => { if (!projectId) { setLoading(false); return; } loadData(); }, [projectId]);

  const handleSave = async () => { try { const values = await form.validateFields(); setSaving(true); await roiAPI.addROIEntry({ ...values, projectId }); message.success('ROI条目已保存'); form.resetFields(); setModalOpen(false); loadData(); } catch (e: any) { if (e?.errorFields) return; message.error(e?.message || '保存失败'); } finally { setSaving(false); } };

  if (!projectId) return <div className="page-container"><PageHeader title="ROI分析" /><Empty description="请先选择一个项目" style={{ marginTop: 120 }} /></div>;
  if (loading) return <div className="page-container"><PageHeader title="ROI分析" /><Spin size="large" style={{ display: 'block', margin: '40vh auto' }} /></div>;
  if (error) return <div className="page-container"><PageHeader title="ROI分析" /><Alert type="error" message="加载失败" description={error} showIcon style={{ marginTop: 24 }} action={<Button size="small" onClick={loadData}>重试</Button>} /></div>;

  const roiChartOption = data.length > 0 ? {
    tooltip: { trigger: 'axis' }, legend: { data: ['成本', '收益', 'ROI%'], bottom: 0 },
    xAxis: { type: 'category', data: data.map((d: any) => d.month || d.period) },
    yAxis: [{ type: 'value', name: '金额' }, { type: 'value', name: 'ROI %' }],
    series: [
      { name: '成本', type: 'line', data: data.map((d: any) => (d.seoCost || 0) + (d.apiCost || 0) + (d.toolCost || 0)), smooth: true, itemStyle: { color: '#ff4d4f' } },
      { name: '收益', type: 'line', data: data.map((d: any) => d.conversionValue || d.estimatedTrafficValue || 0), smooth: true, itemStyle: { color: '#52c41a' } },
      { name: 'ROI%', type: 'line', yAxisIndex: 1, data: data.map((d: any) => d.roiPercent || d.roi || 0), smooth: true, itemStyle: { color: '#1677ff' } },
    ],
  } : null;

  const columns = [
    { title: '月份', dataIndex: 'month', key: 'month', render: (v: any, r: any) => r.period || v || '-' },
    { title: 'SEO成本', dataIndex: 'seoCost', key: 'seoCost', render: (v: number) => v ? `$${v.toFixed(2)}` : '-' },
    { title: 'API成本', dataIndex: 'apiCost', key: 'apiCost', render: (v: number) => v ? `$${v.toFixed(2)}` : '-' },
    { title: '工具成本', dataIndex: 'toolCost', key: 'toolCost', render: (v: number) => v ? `$${v.toFixed(2)}` : '-' },
    { title: '预估流量价值', dataIndex: 'estimatedTrafficValue', key: 'estimatedTrafficValue', render: (v: number) => v ? `$${v.toFixed(2)}` : '-' },
    { title: '转化价值', dataIndex: 'conversionValue', key: 'conversionValue', render: (v: number) => v ? `$${v.toFixed(2)}` : '-' },
    { title: 'ROI', dataIndex: 'roiPercent', key: 'roiPercent', render: (v: number) => <Tag color={v > 100 ? 'green' : v > 0 ? 'blue' : 'red'}>{v?.toFixed(0)}%</Tag> },
  ];

  const apiColumns = [
    { title: '服务', dataIndex: 'service', key: 'service' },
    { title: '成本', dataIndex: 'cost', key: 'cost', render: (v: number) => v ? `$${v.toFixed(2)}` : '-' },
    { title: '调用次数', dataIndex: 'calls', key: 'calls', render: (v: number) => v?.toLocaleString() || '-' },
  ];

  return (
    <div className="page-container">
      <PageHeader title="ROI 分析" subtitle="SEO 投资回报率分析与API成本追踪"
        actions={[{ label: '刷新', icon: <ReloadOutlined />, onClick: loadData, loading }, { label: '添加条目', type: 'primary', icon: <PlusOutlined />, onClick: () => setModalOpen(true) }]} />
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="总成本" value={summary?.totalCost || 0} precision={2} prefix={<DollarOutlined />} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="总收益" value={summary?.totalValue || 0} precision={2} prefix={<RiseOutlined />} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="总体ROI" value={summary?.overallROI || 0} suffix="%" valueStyle={{ color: summary?.overallROI > 0 ? '#52c41a' : '#ff4d4f' }} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="平均月ROI" value={summary?.averageMonthlyROI || 0} suffix="%" /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="最佳月份" value={summary?.bestMonth || '-'} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="API成本" value={apiCosts.reduce((s: number, c: any) => s + (c.cost || 0), 0)} precision={2} prefix={<ApiOutlined />} /></Card></Col>
      </Row>
      {roiChartOption && <Card title="ROI 趋势" style={{ marginBottom: 24 }}><ReactEChartsCore echarts={echarts} option={roiChartOption} style={{ height: 300 }} /></Card>}
      <Tabs size="large" items={[
        { key: 'data', label: <span><DollarOutlined /> ROI数据</span>, children: <Card><Table columns={columns} dataSource={data} rowKey="id" pagination={{ pageSize: 10 }} size="middle" /></Card> },
        { key: 'api', label: <span><ApiOutlined /> API成本</span>, children: <Card><Table columns={apiColumns} dataSource={apiCosts} rowKey="service" pagination={{ pageSize: 10 }} size="middle" /></Card> },
      ]} />
      <Modal title="添加ROI条目" open={modalOpen} onOk={handleSave} onCancel={() => { setModalOpen(false); form.resetFields(); }} confirmLoading={saving} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="period" label="周期" rules={[{ required: true }]}><Input placeholder="例如 2026-07" /></Form.Item>
          <Form.Item name="seo_investment" label="SEO投入"><InputNumber style={{ width: '100%' }} prefix="$" min={0} /></Form.Item>
          <Form.Item name="organic_traffic_value" label="自然流量价值"><InputNumber style={{ width: '100%' }} prefix="$" min={0} /></Form.Item>
          <Form.Item name="tool_costs" label="工具成本"><InputNumber style={{ width: '100%' }} prefix="$" min={0} /></Form.Item>
          <Form.Item name="total_revenue" label="总收入"><InputNumber style={{ width: '100%' }} prefix="$" min={0} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ROIAnalysis;