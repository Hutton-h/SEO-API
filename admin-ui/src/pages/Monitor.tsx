import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Tag, Button, Statistic, Badge, Space, Typography, message, Progress,
  Spin, Empty, Alert,
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, SyncOutlined, ReloadOutlined,
  ClockCircleOutlined, ThunderboltOutlined, CloudServerOutlined, DashboardOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart, GaugeChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { monitorAPI, MonitorStatus, ResponseTimePoint, SLAInfo, DowntimeRecord } from '@/services/monitor';
import dayjs from 'dayjs';

echarts.use([LineChart, GaugeChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text } = Typography;

const statusConfig: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
  online: { color: '#52c41a', text: '在线', icon: <CheckCircleOutlined /> },
  offline: { color: '#ff4d4f', text: '离线', icon: <CloseCircleOutlined /> },
  degraded: { color: '#faad14', text: '降级', icon: <SyncOutlined spin /> },
};

const Monitor: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusList, setStatusList] = useState<MonitorStatus[]>([]);
  const [responseTimeData, setResponseTimeData] = useState<ResponseTimePoint[]>([]);
  const [slaInfo, setSlaInfo] = useState<SLAInfo | null>(null);
  const [downtimeRecords, setDowntimeRecords] = useState<DowntimeRecord[]>([]);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [statusRes, trendRes, slaRes, downtimeRes] = await Promise.all([
        monitorAPI.getStatusList(),
        monitorAPI.getResponseTimeTrend(),
        monitorAPI.getSLAInfo(),
        monitorAPI.getDowntimeRecords(),
      ]);
      const statusData = (statusRes as any).data || statusRes;
      const trendData = (trendRes as any).data || trendRes;
      const slaData = (slaRes as any).data || slaRes;
      const downtimeData = (downtimeRes as any).data || downtimeRes;

      setStatusList(Array.isArray(statusData) ? statusData : statusData.data || []);
      setResponseTimeData(Array.isArray(trendData) ? trendData : trendData.data || []);
      setSlaInfo(slaData);
      setDowntimeRecords(Array.isArray(downtimeData) ? downtimeData : downtimeData.data || []);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载监控数据失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    loadData();
  }, [projectId, loadData]);

  const handleRefresh = async () => {
    await loadData();
  };

  const handleManualCheck = async (serviceId: string) => {
    setCheckingId(serviceId);
    try {
      await monitorAPI.runManualCheck(serviceId === 'all' ? undefined : serviceId);
      message.success('检测完成');
      // 刷新数据
      await loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '检测失败';
      message.error(msg);
    } finally {
      setCheckingId(null);
    }
  };

  // ---- 渲染 ----

  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader
          title="系统监控"
          subtitle="实时服务状态、响应时间与 SLA 监控"
        />
        <Empty description="请先选择一个项目" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="系统监控"
          subtitle="实时服务状态、响应时间与 SLA 监控"
        />
        <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <PageHeader
          title="系统监控"
          subtitle="实时服务状态、响应时间与 SLA 监控"
          actions={[
            { label: '重试', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          ]}
        />
        <Alert type="error" message="加载失败" description={error} showIcon />
      </div>
    );
  }

  const onlineCount = statusList.filter((s) => s.status === 'online').length;
  const offlineCount = statusList.filter((s) => s.status === 'offline').length;
  const degradedCount = statusList.filter((s) => s.status === 'degraded').length;
  const avgResponseTime = Math.round(
    statusList.filter((s) => s.responseTime > 0).reduce((a, b) => a + b.responseTime, 0) /
    statusList.filter((s) => s.responseTime > 0).length || 0
  );

  const responseTimeOption = {
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e8e8e8', textStyle: { color: '#333' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: responseTimeData.map((d) => d.time), axisLine: { lineStyle: { color: '#e8e8e8' } }, axisLabel: { color: '#999' } },
    yAxis: { type: 'value', name: 'ms', axisLabel: { color: '#999' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [{
      type: 'line', data: responseTimeData.map((d) => d.value), smooth: true,
      lineStyle: { color: '#1677ff', width: 2 }, itemStyle: { color: '#1677ff' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(22,119,255,0.2)' }, { offset: 1, color: 'rgba(22,119,255,0.02)' }] } },
      symbol: 'none', markLine: { silent: true, data: [{ yAxis: 300, lineStyle: { color: '#faad14', type: 'dashed' }, label: { formatter: '阈值: 300ms' } }] },
    }],
  };

  const monthlySLA = slaInfo?.monthly ?? 99.87;

  const gaugeOption = {
    series: [{
      type: 'gauge', radius: '90%', center: ['50%', '55%'],
      startAngle: 210, endAngle: -30,
      min: 95, max: 100, splitNumber: 10,
      axisLine: { show: true, lineStyle: { width: 18, color: [[0.3, '#ff4d4f'], [0.7, '#faad14'], [1, '#52c41a']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: { valueAnimation: true, fontSize: 28, fontWeight: 'bold', offsetCenter: [0, '60%'], formatter: '{value}%', color: '#333' },
      title: { offsetCenter: [0, '85%'], fontSize: 13, color: '#999' },
      data: [{ value: monthlySLA, name: '月度可用率' }],
    }],
  };

  const downtimeColumns = [
    { title: '服务', dataIndex: 'serviceName', key: 'serviceName', render: (text: string) => <Text strong>{text}</Text> },
    { title: '开始时间', dataIndex: 'startedAt', key: 'startedAt', render: (date: string) => dayjs(date).format('MM-DD HH:mm') },
    { title: '结束时间', dataIndex: 'endedAt', key: 'endedAt', render: (date: string) => dayjs(date).format('MM-DD HH:mm') },
    { title: '持续时长', dataIndex: 'duration', key: 'duration', render: (d: number) => <Tag color={d > 10 ? 'error' : 'warning'}>{d} 分钟</Tag> },
    { title: '原因', dataIndex: 'cause', key: 'cause', ellipsis: true },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="系统监控"
        subtitle="实时服务状态、响应时间与 SLA 监控"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          { label: '手动检查全部', type: 'primary', icon: <ThunderboltOutlined />, onClick: () => handleManualCheck('all'), loading: checkingId === 'all' },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card><Statistic title="在线服务" value={onlineCount} suffix={`/ ${statusList.length}`} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="离线/降级" value={offlineCount + degradedCount} valueStyle={{ color: offlineCount > 0 ? '#ff4d4f' : '#faad14' }} prefix={<CloseCircleOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="平均响应" value={avgResponseTime} suffix="ms" valueStyle={{ color: avgResponseTime > 300 ? '#faad14' : '#52c41a' }} prefix={<ClockCircleOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="月度 SLA" value={monthlySLA} suffix="%" precision={2} valueStyle={{ color: '#52c41a' }} prefix={<DashboardOutlined />} /></Card>
        </Col>
      </Row>

      {statusList.length === 0 ? (
        <Empty description="暂无服务监控数据" style={{ marginBottom: 24 }} />
      ) : (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {statusList.map((item) => {
            const config = statusConfig[item.status];
            return (
              <Col xs={24} sm={12} md={8} lg={4} key={item.id}>
                <Card
                  hoverable
                  style={{ borderTop: `3px solid ${config.color}` }}
                  actions={[
                    <Button type="link" size="small" icon={<ThunderboltOutlined />} loading={checkingId === item.id} onClick={() => handleManualCheck(item.id)}>检查</Button>,
                  ]}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, color: config.color, marginBottom: 8 }}>{config.icon}</div>
                    <Text strong style={{ fontSize: 15, display: 'block' }}>{item.name}</Text>
                    <Tag color={config.color} style={{ marginTop: 8 }}>{config.text}</Tag>
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{item.url}</Text>
                      <Text style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
                        {item.responseTime > 0 ? `${item.responseTime} ms` : 'N/A'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                        可用率: {item.uptime}%
                      </Text>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title="24小时响应时间趋势" className="chart-card">
            {responseTimeData.length === 0 ? (
              <Empty description="暂无响应时间数据" />
            ) : (
              <ReactEChartsCore echarts={echarts} option={responseTimeOption} style={{ height: 350 }} notMerge />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="SLA 可用率" className="chart-card">
            <ReactEChartsCore echarts={echarts} option={gaugeOption} style={{ height: 350 }} notMerge />
          </Card>
        </Col>
      </Row>

      <Card title="最近宕机记录" style={{ marginTop: 24 }}>
        {downtimeRecords.length === 0 ? (
          <Empty description="暂无宕机记录" />
        ) : (
          <Table columns={downtimeColumns} dataSource={downtimeRecords} rowKey="id" pagination={false} size="middle" />
        )}
      </Card>
    </div>
  );
};

export default Monitor;