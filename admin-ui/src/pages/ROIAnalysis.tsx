import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Form, InputNumber, Button, Statistic, Table, Typography, Space, message, DatePicker, Divider,
  Spin, Empty, Alert,
} from 'antd';
import {
  DollarOutlined, RiseOutlined, FallOutlined, TrophyOutlined,
  ReloadOutlined, PlusOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { roiAPI } from '@/services/roi';
import dayjs from 'dayjs';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text, Title } = Typography;

interface ROIEntry {
  month: string;
  seoCost: number;
  apiCost: number;
  toolCost: number;
  estimatedTrafficValue: number;
  conversionValue: number;
  roi: number;
  roiPercent: number;
}

interface ApiCostItem {
  service: string;
  cost: number;
  calls: number;
}

const ROIAnalysis: React.FC = () => {
  const projectId = useStore(s => s.currentProject?.id);
  const [form] = Form.useForm();
  const [roiData, setRoiData] = useState<ROIEntry[]>([]);
  const [apiCostData, setApiCostData] = useState<ApiCostItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roiRes, summaryRes, apiCostRes] = await Promise.all([
        roiAPI.getROIData(),
        roiAPI.getROISummary(),
        roiAPI.getApiCostSummary(),
      ]);
      const roiResult = (roiRes as any).data || roiRes;
      const summaryResult = (summaryRes as any).data || summaryRes;
      const apiCostResult = (apiCostRes as any).data || apiCostRes;
      setRoiData(Array.isArray(roiResult) ? roiResult : roiResult.data || []);
      setSummary(summaryResult);
      setApiCostData(Array.isArray(apiCostResult) ? apiCostResult : apiCostResult.data || []);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => { loadData(); };

  const handleAddEntry = () => {
    form.validateFields().then((values) => {
      const avgApiCost = roiData.length > 0 ? roiData.reduce((a, b) => a + b.apiCost, 0) / roiData.length : 0;
      const entry: ROIEntry = {
        month: values.month ? values.month.format('YYYY-MM') : dayjs().format('YYYY-MM'),
        seoCost: values.seoCost || 0,
        apiCost: avgApiCost,
        toolCost: values.toolCost || 800,
        estimatedTrafficValue: values.trafficValue || 0,
        conversionValue: values.conversionValue || 0,
        roi: ((values.trafficValue + values.conversionValue) - (values.seoCost + avgApiCost + (values.toolCost || 800))) / (values.seoCost + avgApiCost + (values.toolCost || 800)) + 1,
        roiPercent: 0,
      };
      entry.roiPercent = Math.round(entry.roi * 100);
      setRoiData([...roiData, entry]);
      message.success('ROI 数据已添加');
      form.resetFields();
    });
  };

  if (!projectId) return <Empty description="请先选择一个项目" />;
  if (loading) return <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />;
  if (error) return <Alert type="error" message="加载失败" description={error} showIcon />;

  const latestData = roiData.length > 0 ? roiData[roiData.length - 1] : null;
  const prevData = roiData.length > 1 ? roiData[roiData.length - 2] : null;
  const totalCost = roiData.reduce((a, b) => a + b.seoCost + b.apiCost + b.toolCost, 0);
  const totalValue = roiData.reduce((a, b) => a + b.estimatedTrafficValue + b.conversionValue, 0);
  const overallROI = totalValue > 0 ? ((totalValue - totalCost) / totalCost * 100) : 0;
  const totalApiCost = roiData.reduce((a, b) => a + b.apiCost, 0);

  const barOption = {
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e8e8e8', textStyle: { color: '#333' } },
    legend: { data: ['SEO投入', 'API费用', '工具费用', '流量价值', '转化价值'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: roiData.map((d) => d.month.slice(5)), axisLabel: { color: '#999' } },
    yAxis: { type: 'value', name: '元', axisLabel: { color: '#999', formatter: (v: number) => `${(v / 1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [
      { name: 'SEO投入', type: 'bar', data: roiData.map((d) => d.seoCost), itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] }, barGap: '10%' },
      { name: 'API费用', type: 'bar', data: roiData.map((d) => d.apiCost), itemStyle: { color: '#faad14', borderRadius: [4, 4, 0, 0] } },
      { name: '工具费用', type: 'bar', data: roiData.map((d) => d.toolCost), itemStyle: { color: '#722ed1', borderRadius: [4, 4, 0, 0] } },
      { name: '流量价值', type: 'bar', data: roiData.map((d) => d.estimatedTrafficValue), itemStyle: { color: '#52c41a', borderRadius: [4, 4, 0, 0] } },
      { name: '转化价值', type: 'bar', data: roiData.map((d) => d.conversionValue), itemStyle: { color: '#13c2c2', borderRadius: [4, 4, 0, 0] } },
    ],
  };

  const trendOption = {
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e8e8e8', textStyle: { color: '#333' } },
    legend: { data: ['ROI倍数', 'ROI百分比'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: roiData.map((d) => d.month.slice(5)), axisLabel: { color: '#999' } },
    yAxis: [
      { type: 'value', name: '倍数', axisLabel: { color: '#999' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
      { type: 'value', name: '%', axisLabel: { color: '#999', formatter: '{value}%' }, splitLine: { show: false } },
    ],
    series: [
      { name: 'ROI倍数', type: 'line', data: roiData.map((d) => d.roi), smooth: true, lineStyle: { color: '#1677ff', width: 3 }, itemStyle: { color: '#1677ff' }, symbol: 'circle', symbolSize: 8, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(22,119,255,0.2)' }, { offset: 1, color: 'rgba(22,119,255,0.02)' }] } } },
      { name: 'ROI百分比', type: 'line', yAxisIndex: 1, data: roiData.map((d) => d.roiPercent), smooth: true, lineStyle: { color: '#52c41a', width: 3, type: 'dashed' }, itemStyle: { color: '#52c41a' }, symbol: 'diamond', symbolSize: 8 },
    ],
  };

  const apiCostColumns = [
    { title: '服务', dataIndex: 'service', key: 'service', render: (text: string) => <Text strong>{text}</Text> },
    { title: '调用次数', dataIndex: 'calls', key: 'calls', render: (v: number) => v.toLocaleString() },
    { title: '费用', dataIndex: 'cost', key: 'cost', render: (v: number) => <Text style={{ color: '#1677ff' }}>${v.toLocaleString()}</Text> },
    { title: '占比', key: 'percentage', render: (_: any, record: any) => <Text>{(record.cost / totalApiCost * 100).toFixed(1)}%</Text> },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="ROI 分析"
        subtitle="SEO 投入产出比分析与追踪"
        actions={[{ label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading }]}
      />

      <Row gutter={[16, 16]} style={{ margin: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="总投入" value={totalCost} prefix="$" precision={0} valueStyle={{ color: '#1677ff' }} suffix={<DollarOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="总产出价值" value={totalValue} prefix="$" precision={0} valueStyle={{ color: '#52c41a' }} suffix={<RiseOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="整体 ROI"
              value={overROI}
              suffix="%"
              precision={1}
              valueStyle={{ color: overallROI >= 0 ? '#52c41a' : '#ff4d4f' }}
              prefix={overROI >= 0 ? <RiseOutlined /> : <FallOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="本月 ROI"
              value={latestData?.roiPercent || 0}
              suffix="%"
              valueStyle={{ color: '#52c41a', fontSize: 32 }}
              prefix={<TrophyOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              vs 上月 {prevData ? `${prevData.roiPercent}%` : '-'}
            </Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card title="SEO 投入 vs 产出" className="chart-card">
            <ReactEChartsCore echarts={echarts} option={barOption} style={{ height: 380 }} notMerge />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="新增 ROI 记录" style={{ margin: 24 }}>
            <Form form={form} layout="vertical" size="middle">
              <Form.Item name="month" label="月份">
                <DatePicker picker="month" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="seoCost" label="SEO 月支出 ($)" rules={[{ required: true, message: '请输入SEO支出' }]}>
                <InputNumber min={0} style={{ width: '100%' }} placeholder="包括人力/工具/外链等" prefix="$" />
              </Form.Item>
              <Form.Item name="trafficValue" label="估算流量价值 ($)" rules={[{ required: true, message: '请输入流量价值' }]}>
                <InputNumber min={0} style={{ width: '100%' }} placeholder="自然流量xCPC" prefix="$" />
              </Form.Item>
              <Form.Item name="conversionValue" label="转化价值 ($)" rules={[{ required: true, message: '请输入转化价值' }]}>
                <InputNumber min={0} style={{ width: '100%' }} placeholder="转化带来的收入" prefix="$" />
              </Form.Item>
              <Form.Item name="toolCost" label="工具费用 ($)">
                <InputNumber min={0} style={{ width: '100%' }} prefix="$" placeholder="其他工具订阅费" />
              </Form.Item>
              <Button type="primary" icon={<PlusOutlined />} block onClick={handleAddEntry}>添加记录</Button>
            </Form>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="月度 ROI 趋势" className="chart-card">
            <ReactEChartsCore echarts={echarts} option={trendOption} style={{ height: 380 }} notMerge />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="API 费用汇总" className="chart-card">
            <Table columns={apiCostColumns} dataSource={apiCostData} rowKey="service" pagination={false} size="small" />
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>合计</Text>
              <Text strong style={{ color: '#1677ff', fontSize: 16 }}>${totalApiCost.toLocaleString()}</Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ROIAnalysis;