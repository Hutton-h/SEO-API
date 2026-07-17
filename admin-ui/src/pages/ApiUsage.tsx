import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Statistic, Typography, Space, Button, Tag,
  Progress, Divider, Slider, Switch, Select, InputNumber, message, Alert, Spin, Empty,
} from 'antd';
import {
  DollarOutlined, ApiOutlined, RiseOutlined, FallOutlined,
  ReloadOutlined, SettingOutlined, ThunderboltOutlined,
  ArrowUpOutlined, ArrowDownOutlined, WarningOutlined,
  BarChartOutlined, LineChartOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { apiUsageAPI } from '@/services/apiUsage';
import dayjs from 'dayjs';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text, Title } = Typography;

interface StatsData {
  totalCalls: number;
  totalCost: number;
  dailyAvgCalls: number;
  estimatedMonthlyCost: number;
  lastMonthCost: number;
  costChange: number;
}

interface ServiceBreakdownItem {
  service: string;
  calls: number;
  cost: number;
  unitPrice: number;
  percentage: number;
}

interface DailyUsageItem {
  date: string;
  calls: number;
  cost: number;
}

interface UsageAlert {
  enabled: boolean;
  threshold: number;
  channels: string[];
}

const ApiUsage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [serviceBreakdown, setServiceBreakdown] = useState<ServiceBreakdownItem[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsageItem[]>([]);
  const [alertConfig, setAlertConfig] = useState<UsageAlert>({
    enabled: true,
    threshold: 80,
    channels: ['email', 'feishu'],
  });
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [alertChannels, setAlertChannels] = useState<string[]>(['email', 'feishu']);
  const [savingAlert, setSavingAlert] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, breakdownRes, dailyRes, alertRes] = await Promise.all([
        apiUsageAPI.getStats(),
        apiUsageAPI.getServiceBreakdown(),
        apiUsageAPI.getDailyUsage(),
        apiUsageAPI.getUsageAlert(),
      ]);

      const statsData = (statsRes as any).data || statsRes;
      const breakdownData = (breakdownRes as any).data || breakdownRes;
      const dailyData = (dailyRes as any).data || dailyRes;
      const alertData = (alertRes as any).data || alertRes;

      setStats(statsData);
      setServiceBreakdown(Array.isArray(breakdownData) ? breakdownData : breakdownData.data || []);
      setDailyUsage(Array.isArray(dailyData) ? dailyData : dailyData.data || []);

      const alertInfo = alertData || alertRes;
      setAlertConfig(alertInfo);
      setAlertEnabled(alertInfo.enabled ?? true);
      setAlertThreshold(alertInfo.threshold ?? 80);
      setAlertChannels(alertInfo.channels || ['email', 'feishu']);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    loadData();
  };

  const handleSaveAlert = async () => {
    setSavingAlert(true);
    try {
      await apiUsageAPI.updateUsageAlert({
        enabled: alertEnabled,
        threshold: alertThreshold,
        channels: alertChannels,
      });
      message.success('用量预警配置已保存');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '保存失败';
      message.error(msg);
    } finally {
      setSavingAlert(false);
    }
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="API 用量与计费"
          subtitle="监控 API 调用量、费用与成本趋势"
        />
        <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="page-container">
        <PageHeader
          title="API 用量与计费"
          subtitle="监控 API 调用量、费用与成本趋势"
        />
        <Alert
          type="error"
          message="加载失败"
          description={error}
          showIcon
          action={
            <Button onClick={handleRefresh} size="small">
              重试
            </Button>
          }
        />
      </div>
    );
  }

  // ---- Empty state ----
  if (!stats) {
    return (
      <div className="page-container">
        <PageHeader
          title="API 用量与计费"
          subtitle="监控 API 调用量、费用与成本趋势"
        />
        <Empty description="暂无 API 用量数据" />
      </div>
    );
  }

  const barOption = {
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e8e8e8', textStyle: { color: '#333' }, axisPointer: { type: 'shadow' } },
    legend: { data: ['调用次数', '费用'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: serviceBreakdown.map((d) => d.service), axisLabel: { color: '#999', rotate: 15 } },
    yAxis: [
      { type: 'value', name: '次', axisLabel: { color: '#999', formatter: (v: number) => `${(v / 1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
      { type: 'value', name: '$', axisLabel: { color: '#999', formatter: '${value}' }, splitLine: { show: false } },
    ],
    series: [
      { name: '调用次数', type: 'bar', data: serviceBreakdown.map((d) => d.calls), itemStyle: { color: '#1677ff', borderRadius: [6, 6, 0, 0] }, barGap: '20%' },
      { name: '费用', type: 'bar', yAxisIndex: 1, data: serviceBreakdown.map((d) => d.cost), itemStyle: { color: '#52c41a', borderRadius: [6, 6, 0, 0] } },
    ],
  };

  const lineOption = {
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e8e8e8', textStyle: { color: '#333' } },
    legend: { data: ['调用次数', '费用'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: dailyUsage.map((d) => d.date), axisLabel: { color: '#999', interval: 4 } },
    yAxis: [
      { type: 'value', name: '次', axisLabel: { color: '#999', formatter: (v: number) => `${(v / 1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
      { type: 'value', name: '$', axisLabel: { color: '#999', formatter: '${value}' }, splitLine: { show: false } },
    ],
    series: [
      { name: '调用次数', type: 'line', data: dailyUsage.map((d) => d.calls), smooth: true, lineStyle: { color: '#1677ff', width: 2 }, itemStyle: { color: '#1677ff' }, symbol: 'none', areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(22,119,255,0.15)' }, { offset: 1, color: 'rgba(22,119,255,0.02)' }] } } },
      { name: '费用', type: 'line', yAxisIndex: 1, data: dailyUsage.map((d) => d.cost), smooth: true, lineStyle: { color: '#52c41a', width: 2, type: 'dashed' }, itemStyle: { color: '#52c41a' }, symbol: 'none' },
    ],
  };

  const costColumns = [
    { title: '服务名', dataIndex: 'service', key: 'service', render: (text: string) => <Text strong>{text}</Text> },
    { title: '调用次数', dataIndex: 'calls', key: 'calls', render: (v: number) => v.toLocaleString(), sorter: (a: any, b: any) => a.calls - b.calls },
    { title: '单价', dataIndex: 'unitPrice', key: 'unitPrice', render: (v: number) => `$${v.toFixed(4)}` },
    { title: '总费用', dataIndex: 'cost', key: 'cost', render: (v: number) => <Text style={{ color: '#1677ff', fontWeight: 600 }}>${v.toFixed(2)}</Text>, sorter: (a: any, b: any) => a.cost - b.cost },
    {
      title: '占比', dataIndex: 'percentage', key: 'percentage',
      render: (pct: number) => (
        <div style={{ width: 120 }}>
          <Progress percent={pct} size="small" strokeColor={pct > 30 ? '#ff4d4f' : pct > 15 ? '#faad14' : '#1677ff'} format={(p) => `${p}%`} />
        </div>
      ),
    },
  ];

  const costChange = stats.costChange;
  const costChangeColor = costChange >= 0 ? '#ff4d4f' : '#52c41a';
  const costChangeIcon = costChange >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />;

  return (
    <div className="page-container">
      <PageHeader
        title="API 用量与计费"
        subtitle="监控 API 调用量、费用与成本趋势"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          { label: '计费设置', icon: <SettingOutlined /> },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card hoverable style={{ borderTop: '3px solid #1677ff' }}>
            <Statistic
              title="本月总调用次数"
              value={stats.totalCalls}
              valueStyle={{ color: '#1677ff', fontSize: 28 }}
              prefix={<ApiOutlined />}
              suffix={<Text type="secondary" style={{ fontSize: 13 }}>次</Text>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable style={{ borderTop: '3px solid #52c41a' }}>
            <Statistic
              title="本月总费用"
              value={stats.totalCost}
              precision={2}
              valueStyle={{ color: '#52c41a', fontSize: 28 }}
              prefix={<DollarOutlined />}
              suffix={<Text type="secondary" style={{ fontSize: 13 }}>USD</Text>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable style={{ borderTop: '3px solid #722ed1' }}>
            <Statistic
              title="日均调用"
              value={stats.dailyAvgCalls}
              valueStyle={{ color: '#722ed1', fontSize: 28 }}
              prefix={<BarChartOutlined />}
              suffix={<Text type="secondary" style={{ fontSize: 13 }}>次/天</Text>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable style={{ borderTop: `3px solid ${costChangeColor}` }}>
            <Statistic
              title="预估月费"
              value={stats.estimatedMonthlyCost}
              precision={2}
              valueStyle={{ color: costChangeColor, fontSize: 28 }}
              prefix={<DollarOutlined />}
              suffix={<Text type="secondary" style={{ fontSize: 13 }}>USD</Text>}
            />
            <div style={{ marginTop: 4 }}>
              <Text style={{ color: costChangeColor, fontSize: 12 }}>
                {costChangeIcon} {Math.abs(costChange)}% vs 上月
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card title="按服务分组的用量与费用" className="chart-card">
            <ReactEChartsCore echarts={echarts} option={barOption} style={{ height: 380 }} notMerge />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="费用对比" className="chart-card">
            <div style={{ padding: '0 20px' }}>
              <Row gutter={[16, 16]} style={{ textAlign: 'center' }}>
                <Col span={12}>
                  <div style={{ background: '#f5f5f5', borderRadius: 12, padding: '20px 16px' }}>
                    <Text type="secondary">上月费用</Text>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#595959', marginTop: 8 }}>
                      ${stats.lastMonthCost.toFixed(2)}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ background: `${costChangeColor}10`, borderRadius: 12, padding: '20px 16px', border: `1px solid ${costChangeColor}30` }}>
                    <Text type="secondary">本月预估</Text>
                    <div style={{ fontSize: 28, fontWeight: 700, color: costChangeColor, marginTop: 8 }}>
                      ${stats.estimatedMonthlyCost.toFixed(2)}
                    </div>
                  </div>
                </Col>
              </Row>
              <Divider />
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">预计超额</Text>
                <div style={{ fontSize: 32, fontWeight: 700, color: costChangeColor, marginTop: 4 }}>
                  ${((stats.estimatedMonthlyCost - stats.lastMonthCost).toFixed(2))}
                </div>
                <Text style={{ fontSize: 12, color: costChangeColor }}>
                  {costChangeIcon} {Math.abs(costChange)}% 变化
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="每日用量趋势" className="chart-card">
            <ReactEChartsCore echarts={echarts} option={lineOption} style={{ height: 380 }} notMerge />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="用量预警设置" className="chart-card">
            <div style={{ padding: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text>启用预警</Text>
                <Switch checked={alertEnabled} onChange={setAlertEnabled} />
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>费用阈值</Text>
                  <Text strong style={{ color: '#1677ff' }}>${alertThreshold}/月</Text>
                </div>
                <Slider
                  min={10}
                  max={500}
                  step={10}
                  value={alertThreshold}
                  onChange={setAlertThreshold}
                  marks={{ 10: '$10', 100: '$100', 200: '$200', 500: '$500' }}
                  disabled={!alertEnabled}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <Text style={{ display: 'block', marginBottom: 8 }}>通知渠道</Text>
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  value={alertChannels}
                  onChange={setAlertChannels}
                  options={[
                    { value: 'email', label: '邮件' },
                    { value: 'feishu', label: '飞书' },
                    { value: 'dingtalk', label: '钉钉' },
                    { value: 'slack', label: 'Slack' },
                  ]}
                  disabled={!alertEnabled}
                />
              </div>

              <Button
                type="primary"
                block
                icon={<ThunderboltOutlined />}
                onClick={handleSaveAlert}
                loading={savingAlert}
                disabled={!alertEnabled}
              >
                保存预警设置
              </Button>
            </div>
          </Card>

          <Card title="费用预估" style={{ marginTop: 16 }}>
            <Alert
              message={`按当前用量趋势，本月预估费用为 $${stats.estimatedMonthlyCost.toFixed(2)}`}
              type={costChange >= 0 ? 'warning' : 'success'}
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: 12 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text type="secondary">日预算</Text>
              <Text>${(stats.estimatedMonthlyCost / 30).toFixed(2)}</Text>
            </div>
            <Progress percent={72} strokeColor="#1677ff" size="small" format={() => '72%'} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 }}>
              <Text type="secondary">已使用天数</Text>
              <Text>17 / 31 天</Text>
            </div>
            <Progress percent={55} strokeColor="#52c41a" size="small" format={() => '55%'} />
          </Card>
        </Col>
      </Row>

      <Card title="费用明细" style={{ marginTop: 24 }}>
        <Table
          columns={costColumns}
          dataSource={serviceBreakdown}
          rowKey="service"
          pagination={false}
          size="middle"
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}><Text strong>合计</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={1}><Text strong>{serviceBreakdown.reduce((a, b) => a + b.calls, 0).toLocaleString()}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={2}><Text>-</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={3}><Text strong style={{ color: '#1677ff', fontSize: 16 }}>${serviceBreakdown.reduce((a, b) => a + b.cost, 0).toFixed(2)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={4}><Text strong>100%</Text></Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>
    </div>
  );
};

export default ApiUsage;