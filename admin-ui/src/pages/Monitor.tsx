import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Typography, Row, Col, Statistic, Space, message, Spin, Empty, Alert, Input, Progress, Tabs } from 'antd';
import { ReloadOutlined, ThunderboltOutlined, PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, CloudServerOutlined, DashboardOutlined } from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { monitorAPI } from '@/services/monitor';

echarts.use([LineChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text } = Typography;

const Monitor: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusList, setStatusList] = useState<any[]>([]);
  const [responseTime, setResponseTime] = useState<any[]>([]);
  const [sla, setSla] = useState<any>({ daily: 99.9, weekly: 99.8, monthly: 99.7, yearly: 99.5 });
  const [downtime, setDowntime] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [checking, setChecking] = useState(false);
  const [newTargetUrl, setNewTargetUrl] = useState('');

  const loadData = async () => {
    if (!projectId) return; setLoading(true); setError(null);
    try {
      const results = await Promise.allSettled([
        monitorAPI.getStatusList({ projectId }),
        monitorAPI.getResponseTimeTrend({ projectId }),
        monitorAPI.getSLAInfo(),
        monitorAPI.getDowntimeRecords({ projectId }),
        (monitorAPI as any).getTargets?.(projectId),
      ]);
      const extractArr = (r: PromiseSettledResult<any>, key?: string) => { if (r.status === 'fulfilled') { const d = (r.value as any).data !== undefined ? (r.value as any).data : r.value; return Array.isArray(d) ? d : (d?.data || d?.[key || 'data'] || []); } return []; };
      setStatusList(extractArr(results[0]));
      setResponseTime(extractArr(results[1]));
      if (results[2].status === 'fulfilled') { const d = (results[2].value as any).data !== undefined ? (results[2].value as any).data : results[2].value; if (d) setSla(d); }
      setDowntime(extractArr(results[3]));
      setTargets(extractArr(results[4]));
    } catch (e: any) { setError(e?.message || '加载失败'); } finally { setLoading(false); }
  };

  useEffect(() => { if (!projectId) { setLoading(false); return; } loadData(); }, [projectId]);

  const handleCheck = async () => { setChecking(true); try { await monitorAPI.runManualCheck(); message.success('手动检查已触发'); setTimeout(() => { loadData(); setChecking(false); }, 3000); } catch (e: any) { message.error(e?.message || '检查失败'); setChecking(false); } };

  if (!projectId) return <div className="page-container"><PageHeader title="网站监控" /><Empty description="请先选择一个项目" style={{ marginTop: 120 }} /></div>;
  if (loading) return <div className="page-container"><PageHeader title="网站监控" /><Spin size="large" style={{ display: 'block', margin: '40vh auto' }} /></div>;
  if (error) return <div className="page-container"><PageHeader title="网站监控" /><Alert type="error" message="加载失败" description={error} showIcon style={{ marginTop: 24 }} action={<Button size="small" onClick={loadData}>重试</Button>} /></div>;

  const responseTimeChart = responseTime.length > 0 ? {
    tooltip: { trigger: 'axis' }, xAxis: { type: 'category', data: responseTime.map((p: any) => p.time) },
    yAxis: { type: 'value', name: 'ms' },
    series: [{ type: 'line', data: responseTime.map((p: any) => p.value), smooth: true, areaStyle: { opacity: 0.3 }, itemStyle: { color: '#1677ff' } }],
  } : null;

  const statusColumns = [
    { title: '服务', dataIndex: 'name', key: 'name', render: (n: string, r: any) => <Space><Text strong>{n}</Text><Text type="secondary" style={{ fontSize: 11 }}>{r.url}</Text></Space> },
    { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (s: string) => <Tag color={s === 'up' ? 'green' : 'red'} icon={s === 'up' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>{s === 'up' ? '正常' : '故障'}</Tag> },
    { title: '响应时间', dataIndex: 'responseTime', key: 'responseTime', width: 100, render: (t: number) => <Text style={{ color: t < 200 ? '#52c41a' : t < 500 ? '#faad14' : '#ff4d4f' }}>{t}ms</Text> },
    { title: '可用率', dataIndex: 'uptime', key: 'uptime', width: 120, render: (u: number) => <Progress percent={u} size="small" strokeColor={u >= 99.9 ? '#52c41a' : '#faad14'} format={() => `${u}%`} /> },
    { title: '最后检查', dataIndex: 'lastChecked', key: 'lastChecked', width: 150, render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-' },
  ];

  const downtimeColumns = [
    { title: '服务', dataIndex: 'serviceName', key: 'serviceName' },
    { title: '开始时间', dataIndex: 'startedAt', key: 'startedAt', width: 160, render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-' },
    { title: '结束时间', dataIndex: 'endedAt', key: 'endedAt', width: 160, render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-' },
    { title: '持续时长', dataIndex: 'duration', key: 'duration', width: 100 },
    { title: '原因', dataIndex: 'cause', key: 'cause', ellipsis: true },
  ];

  return (
    <div className="page-container">
      <PageHeader title="网站监控" subtitle="网站可用性、响应时间与SLA监控"
        actions={[{ label: '刷新', icon: <ReloadOutlined />, onClick: loadData, loading }, { label: '手动检查', type: 'primary', icon: <ThunderboltOutlined />, onClick: handleCheck, loading: checking }]} />
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="监控服务" value={statusList.length} prefix={<CloudServerOutlined />} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="正常" value={statusList.filter((s: any) => s.status === 'up').length} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="故障" value={statusList.filter((s: any) => s.status === 'down').length} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="日SLA" value={sla?.daily || 99.9} suffix="%" precision={1} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="月SLA" value={sla?.monthly || 99.7} suffix="%" precision={1} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="宕机次数" value={downtime.length} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
      </Row>
      {responseTimeChart && <Card title="响应时间趋势" style={{ marginBottom: 24 }}><ReactEChartsCore echarts={echarts} option={responseTimeChart} style={{ height: 250 }} /></Card>}
      <Tabs size="large" items={[
        { key: 'status', label: <span><DashboardOutlined /> 可用性状态</span>, children: <Card><Table columns={statusColumns} dataSource={statusList} rowKey="id" pagination={{ pageSize: 10 }} size="middle" /></Card> },
        { key: 'downtime', label: <span><ClockCircleOutlined /> 宕机记录</span>, children: <Card><Table columns={downtimeColumns} dataSource={downtime} rowKey="id" pagination={{ pageSize: 10 }} size="middle" /></Card> },
      ]} />
    </div>
  );
};

export default Monitor;