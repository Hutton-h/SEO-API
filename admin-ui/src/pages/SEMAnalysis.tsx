import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Tag, Typography, Row, Col, Statistic, Space, message, Spin, Empty, Alert, Input, Select, Tabs, Progress, Tooltip,
} from 'antd';
import { ReloadOutlined, ThunderboltOutlined, SearchOutlined, DollarOutlined, RiseOutlined, AimOutlined, PlusOutlined, GlobalOutlined, BulbOutlined } from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart, ScatterChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { semAPI } from '@/services/sem';

echarts.use([BarChart, ScatterChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text } = Typography;

const SEMAnalysis: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('keywords');
  const [refreshing, setRefreshing] = useState(false);

  const [keywords, setKeywords] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [keywordTotal, setKeywordTotal] = useState(0);
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        semAPI.getSEMKeywords(projectId, { page, pageSize: 10 }),
        semAPI.getCompetitorAds(projectId),
        semAPI.getOpportunities(projectId),
      ]);

      const extractArr = (r: PromiseSettledResult<any>) => {
        if (r.status === 'fulfilled') {
          const d = (r.value as any).data !== undefined ? (r.value as any).data : r.value;
          return Array.isArray(d) ? d : (d?.data || d?.keywords || d?.ads || []);
        }
        return [];
      };

      const kwRes = extractArr(results[0]);
      setKeywords(kwRes);
      setKeywordTotal((results[0].status === 'fulfilled' ? (results[0].value as any).data?.total || (results[0].value as any).total : 0) || 0);
      setAds(extractArr(results[1]));
      setOpportunities(extractArr(results[2]));
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, page]);

  useEffect(() => { if (!projectId) { setLoading(false); return; } loadData(); }, [projectId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await semAPI.refreshSEMData(projectId!); message.success('SEM数据刷新中'); setTimeout(() => { loadData(); setRefreshing(false); }, 3000); }
    catch (e: any) { message.error(e?.message || '刷新失败'); setRefreshing(false); }
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) { message.warning('请输入关键词'); return; }
    try { await semAPI.addSEMKeyword(projectId!, newKeyword.trim()); message.success('关键词已添加'); setNewKeyword(''); loadData(); }
    catch (e: any) { message.error(e?.message || '添加失败'); }
  };

  if (!projectId) return <div className="page-container"><PageHeader title="SEM分析" /><Empty description="请先选择一个项目" style={{ marginTop: 120 }} /></div>;
  if (loading) return <div className="page-container"><PageHeader title="SEM分析" /><Spin size="large" style={{ display: 'block', margin: '40vh auto' }} /></div>;
  if (error) return <div className="page-container"><PageHeader title="SEM分析" /><Alert type="error" message="加载失败" description={error} showIcon style={{ marginTop: 24 }} action={<Button size="small" onClick={loadData}>重试</Button>} /></div>;

  const totalCost = keywords.reduce((s, k) => s + (k.cost || 0), 0);
  const totalClicks = keywords.reduce((s, k) => s + (k.clicks || 0), 0);
  const totalImpressions = keywords.reduce((s, k) => s + (k.impressions || 0), 0);
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0';

  const kwColumns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 180, render: (kw: string) => <Text strong>{kw}</Text> },
    { title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 90, render: (v: number) => v?.toLocaleString() || '-' },
    { title: 'CPC', dataIndex: 'cpc', key: 'cpc', width: 80, render: (v: number) => v ? <Text style={{ color: '#fa8c16' }}>${v.toFixed(2)}</Text> : '-' },
    { title: '质量分', dataIndex: 'qualityScore', key: 'qualityScore', width: 90,
      render: (s: number) => <Progress percent={s * 10} size="small" strokeColor={s >= 7 ? '#52c41a' : s >= 5 ? '#faad14' : '#ff4d4f'} format={() => `${s}/10`} />,
    },
    { title: '展示', dataIndex: 'impressions', key: 'impressions', width: 90, render: (v: number) => v?.toLocaleString() || '0' },
    { title: '点击', dataIndex: 'clicks', key: 'clicks', width: 80, render: (v: number) => v?.toLocaleString() || '0' },
    { title: 'CTR', dataIndex: 'ctr', key: 'ctr', width: 80, render: (v: number) => v ? <Tag color={v > 5 ? 'green' : 'orange'}>{v.toFixed(1)}%</Tag> : '-' },
    { title: '花费', dataIndex: 'cost', key: 'cost', width: 90, render: (v: number) => v ? <Text style={{ color: '#ff4d4f' }}>${v.toFixed(2)}</Text> : '$0' },
    { title: '转化', dataIndex: 'conversions', key: 'conversions', width: 80, render: (v: number) => v || '0' },
  ];

  const adColumns = [
    { title: '竞品', dataIndex: 'competitor', key: 'competitor', width: 120 },
    { title: '标题', dataIndex: 'headline', key: 'headline', ellipsis: true },
    { title: '描述', dataIndex: 'description', key: 'description', width: 200, ellipsis: true },
    { title: '显示URL', dataIndex: 'displayUrl', key: 'displayUrl', width: 150, render: (u: string) => <Text code style={{ fontSize: 11 }}>{u}</Text> },
    { title: '最近发现', dataIndex: 'lastSeen', key: 'lastSeen', width: 140, render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-' },
  ];

  const oppColumns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 180 },
    { title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 90, render: (v: number) => v?.toLocaleString() || '-' },
    { title: 'CPC', dataIndex: 'cpc', key: 'cpc', width: 80, render: (v: number) => v ? `$${v.toFixed(2)}` : '-' },
    { title: '机会评分', dataIndex: 'opportunityScore', key: 'opportunityScore', width: 110,
      render: (s: number) => <Progress percent={s} size="small" strokeColor={s >= 70 ? '#52c41a' : '#faad14'} />,
    },
    { title: '建议', dataIndex: 'recommendation', key: 'recommendation', ellipsis: true },
  ];

  return (
    <div className="page-container">
      <PageHeader title="SEM 分析" subtitle="搜索引擎营销关键词分析、竞品广告监控与机会挖掘"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: loadData, loading },
          { label: '刷新数据', type: 'primary', icon: <ThunderboltOutlined />, onClick: handleRefresh, loading: refreshing },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="SEM关键词" value={keywords.length} prefix={<AimOutlined />} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="总花费" value={totalCost} prefix={<DollarOutlined />} precision={2} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="总点击" value={totalClicks} prefix={<RiseOutlined />} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="平均CTR" value={avgCTR} suffix="%" /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="竞品广告" value={ads.length} prefix={<GlobalOutlined />} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="机会词" value={opportunities.length} prefix={<BulbOutlined />} /></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab} size="large"
        items={[
          {
            key: 'keywords', label: <span><AimOutlined /> 关键词</span>,
            children: (
              <Card title="SEM 关键词"
                extra={
                  <Space>
                    <Input.Search placeholder="添加关键词" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
                      onSearch={handleAddKeyword} enterButton={<PlusOutlined />} style={{ width: 250 }} />
                  </Space>
                }
              >
                <Table columns={kwColumns} dataSource={keywords} rowKey="id" scroll={{ x: 900 }}
                  pagination={{ current: page, pageSize: 10, total: keywordTotal, onChange: (p) => setPage(p) }} size="middle" />
              </Card>
            ),
          },
          {
            key: 'ads', label: <span><GlobalOutlined /> 竞品广告</span>,
            children: (
              <Card title="竞品广告监控">
                <Table columns={adColumns} dataSource={ads} rowKey="id" scroll={{ x: 700 }} pagination={{ pageSize: 10 }} size="middle" />
              </Card>
            ),
          },
          {
            key: 'opportunities', label: <span><BulbOutlined /> 机会挖掘</span>,
            children: (
              <Card title="SEM 机会关键词">
                <Table columns={oppColumns} dataSource={opportunities} rowKey="id" scroll={{ x: 600 }} pagination={{ pageSize: 10 }} size="middle" />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};

export default SEMAnalysis;