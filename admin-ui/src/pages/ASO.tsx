import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Tag, Typography, Row, Col, Statistic, Space, message, Spin, Empty, Alert, Input, Select, Progress } from 'antd';
import { ReloadOutlined, ThunderboltOutlined, PlusOutlined, AimOutlined, AppleOutlined, AndroidOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { asoAPI } from '@/services/aso';

echarts.use([LineChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text } = Typography;

const ASO: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [storeFilter, setStoreFilter] = useState<string | undefined>();

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true); setError(null);
    try {
      const [kwRes, trendRes] = await Promise.allSettled([
        asoAPI.getASOKeywords(projectId),
        asoAPI.getASOTrend(projectId),
      ]);
      const extractArr = (r: PromiseSettledResult<any>) => {
        if (r.status === 'fulfilled') { const d = (r.value as any).data !== undefined ? (r.value as any).data : r.value; return Array.isArray(d) ? d : (d?.data || []); }
        return [];
      };
      setKeywords(extractArr(kwRes));
      setTrend(extractArr(trendRes));
    } catch (e: any) { setError(e?.message || '加载失败'); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { if (!projectId) { setLoading(false); return; } loadData(); }, [projectId]);

  const handleRefresh = async () => { setRefreshing(true); try { await asoAPI.refreshASOData(projectId!); message.success('ASO数据刷新中'); setTimeout(() => { loadData(); setRefreshing(false); }, 3000); } catch (e: any) { message.error(e?.message || '刷新失败'); setRefreshing(false); } };
  const handleAddKeyword = async () => { if (!newKeyword.trim()) { message.warning('请输入关键词'); return; } try { await asoAPI.addASOKeyword(projectId!, newKeyword.trim()); message.success('已添加'); setNewKeyword(''); loadData(); } catch (e: any) { message.error(e?.message || '添加失败'); } };

  if (!projectId) return <div className="page-container"><PageHeader title="ASO优化" /><Empty description="请先选择一个项目" style={{ marginTop: 120 }} /></div>;
  if (loading) return <div className="page-container"><PageHeader title="ASO优化" /><Spin size="large" style={{ display: 'block', margin: '40vh auto' }} /></div>;
  if (error) return <div className="page-container"><PageHeader title="ASO优化" /><Alert type="error" message="加载失败" description={error} showIcon style={{ marginTop: 24 }} action={<Button size="small" onClick={loadData}>重试</Button>} /></div>;

  const filteredKw = storeFilter ? keywords.filter((k: any) => {
    if (storeFilter === 'apple') return k.appStore?.position !== undefined;
    if (storeFilter === 'google_play') return k.googlePlay?.position !== undefined;
    return true;
  }) : keywords;

  const trendChartOption = trend.length > 0 ? {
    tooltip: { trigger: 'axis' }, legend: { data: ['App Store', 'Google Play'], bottom: 0 },
    xAxis: { type: 'category', data: trend.map((t: any) => t.date) },
    yAxis: { type: 'value', inverse: true, name: '排名' },
    series: [
      { name: 'App Store', type: 'line', data: trend.map((t: any) => t.appStore), smooth: true, itemStyle: { color: '#1677ff' } },
      { name: 'Google Play', type: 'line', data: trend.map((t: any) => t.googlePlay), smooth: true, itemStyle: { color: '#52c41a' } },
    ],
  } : null;

  const columns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 180, render: (kw: string) => <Text strong>{kw}</Text> },
    { title: 'App Store', key: 'appStore', width: 120,
      render: (_: any, r: any) => r.appStore?.position ? <Space><Tag color={r.appStore.position <= 5 ? 'green' : 'orange'}>{r.appStore.position}</Tag>{r.appStore.change ? <Text type={r.appStore.change > 0 ? 'success' : 'danger'}>{r.appStore.change > 0 ? '+' : ''}{r.appStore.change}</Text> : null}</Space> : <Text type="secondary">-</Text>,
    },
    { title: 'Google Play', key: 'googlePlay', width: 120,
      render: (_: any, r: any) => r.googlePlay?.position ? <Space><Tag color={r.googlePlay.position <= 5 ? 'green' : 'orange'}>{r.googlePlay.position}</Tag>{r.googlePlay.change ? <Text type={r.googlePlay.change > 0 ? 'success' : 'danger'}>{r.googlePlay.change > 0 ? '+' : ''}{r.googlePlay.change}</Text> : null}</Space> : <Text type="secondary">-</Text>,
    },
    { title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 90, render: (v: number) => v?.toLocaleString() || '-' },
    { title: '难度', dataIndex: 'difficulty', key: 'difficulty', width: 100,
      render: (d: number) => d !== undefined ? <Progress percent={d} size="small" strokeColor={d <= 30 ? '#52c41a' : d <= 60 ? '#faad14' : '#ff4d4f'} /> : '-',
    },
  ];

  return (
    <div className="page-container">
      <PageHeader title="ASO 优化" subtitle="App Store / Google Play 关键词排名追踪与优化"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: loadData, loading },
          { label: '刷新排名', type: 'primary', icon: <ThunderboltOutlined />, onClick: handleRefresh, loading: refreshing },
        ]}
      />
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="ASO关键词" value={keywords.length} prefix={<AimOutlined />} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="App Store上榜" value={keywords.filter((k: any) => k.appStore?.position).length} prefix={<AppleOutlined />} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Google Play上榜" value={keywords.filter((k: any) => k.googlePlay?.position).length} prefix={<AndroidOutlined />} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="趋势数据" value={trend.length} suffix="天" /></Card></Col>
      </Row>
      {trendChartOption && <Card title="排名趋势" style={{ marginBottom: 24 }}><ReactEChartsCore echarts={echarts} option={trendChartOption} style={{ height: 300 }} /></Card>}
      <Card title="ASO关键词排名"
        extra={<Space>
          <Input.Search placeholder="添加关键词" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} onSearch={handleAddKeyword} enterButton={<PlusOutlined />} style={{ width: 220 }} />
          <Select placeholder="应用商店" allowClear style={{ width: 130 }} value={storeFilter} onChange={setStoreFilter}
            options={[{ value: 'apple', label: 'App Store' }, { value: 'google_play', label: 'Google Play' }]} />
        </Space>}
      >
        <Table columns={columns} dataSource={filteredKw} rowKey="id" pagination={{ pageSize: 10 }} size="middle" />
      </Card>
    </div>
  );
};

export default ASO;