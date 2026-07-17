import React, { useState } from 'react';
import {
  Card, Row, Col, Form, InputNumber, Button, Statistic, Table, Typography, Space, message, DatePicker, Divider,
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
import dayjs from 'dayjs';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text, Title } = Typography;

const mockROIData = [
  { month: '2024-01', seoCost: 5000, apiCost: 1200, toolCost: 800, estimatedTrafficValue: 12000, conversionValue: 8000, roi: 2.86, roiPercent: 286 },
  { month: '2024-02', seoCost: 5200, apiCost: 1350, toolCost: 800, estimatedTrafficValue: 13500, conversionValue: 9500, roi: 3.13, roiPercent: 313 },
  { month: '2024-03', seoCost: 5500, apiCost: 1500, toolCost: 800, estimatedTrafficValue: 15000, conversionValue: 11000, roi: 3.33, roiPercent: 333 },
  { month: '2024-04', seoCost: 5300, apiCost: 1400, toolCost: 800, estimatedTrafficValue: 14500, conversionValue: 10500, roi: 3.33, roiPercent: 333 },
  { month: '2024-05', seoCost: 5600, apiCost: 1600, toolCost: 800, estimatedTrafficValue: 16000, conversionValue: 12000, roi: 3.50, roiPercent: 350 },
  { month: '2024-06', seoCost: 5800, apiCost: 1700, toolCost: 800, estimatedTrafficValue: 17500, conversionValue: 13500, roi: 3.76, roiPercent: 376 },
  { month: '2024-07', seoCost: 6000, apiCost: 1800, toolCost: 800, estimatedTrafficValue: 19000, conversionValue: 15000, roi: 3.95, roiPercent: 395 },
];

const mockApiCosts = [
  { service: 'DataForSEO', cost: 800, calls: 45000 },
  { service: 'OpenAI', cost: 500, calls: 12000 },
  { service: 'ValueSERP', cost: 300, calls: 8000 },
  { service: 'Google API', cost: 150, calls: 3000 },
  { service: '其他', cost: 50, calls: 1000 },
];

const ROIAnalysis: React.FC = () => {
  const [form] = Form.useForm();
  const [roiData, setRoiData] = useState(mockROIData);
  const [loading, setLoading] = useState(false);

  const latestData = roiData[roiData.length - 1];
  const prevData = roiData[roiData.length - 2];
  const totalCost = roiData.reduce((a, b) => a + b.seoCost + b.apiCost + b.toolCost, 0);
  const totalValue = roiData.reduce((a, b) => a + b.estimatedTrafficValue + b.conversionValue, 0);
  const overallROI = totalValue > 0 ? ((totalValue - totalCost) / totalCost * 100) : 0;
  const totalApiCost = roiData.reduce((a, b) => a + b.apiCost, 0);

  const handleRefresh = () => { setLoading(true); setTimeout(() => setLoading(false), 800); };

  const handleAddEntry = () => {
    form.validateFields().then((values) => {
      const entry = {
        month: values.month ? values.month.format('YYYY-MM') : dayjs().format('YYYY-MM'),
        seoCost: values.seoCost || 0,
        apiCost: totalApiCost / roiData.length,
        toolCost: values.toolCost || 800,
        estimatedTrafficValue: values.trafficValue || 0,
        conversionValue: values.conversionValue || 0,
        roi: ((values.trafficValue + values.conversionValue) - (values.seoCost + totalApiCost / roiData.length + (values.toolCost || 800))) / (values.seoCost + totalApiCost / roiData.length + (values.toolCost || 800)) + 1,
        roiPercent: 0,
      };
      entry.roiPercent = Math.round(entry.roi * 100);
      setRoiData([...roiData, entry]);
      message.success('ROI 数据已添加');
      form.resetFields();
    });
  };

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

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
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
              value={overallROI}
              suffix="%"
              precision={1}
              valueStyle={{ color: overallROI >= 0 ? '#52c41a' : '#ff4d4f' }}
              prefix={overallROI >= 0 ? <RiseOutlined /> : <FallOutlined />}
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
          <Card title="新增 ROI 记录" style={{ marginBottom: 24 }}>
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
            <Table columns={apiCostColumns} dataSource={mockApiCosts} rowKey="service" pagination={false} size="small" />
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