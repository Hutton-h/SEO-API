import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Typography, Row, Col, Statistic, Space, message, Spin, Empty, Alert, Input, Select, Descriptions, Tabs } from 'antd';
import { ReloadOutlined, PlusOutlined, ThunderboltOutlined, AimOutlined, EnvironmentOutlined, StarOutlined, PhoneOutlined, SwapOutlined, ShopOutlined, GlobalOutlined } from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { localSEOAPI } from '@/services/localSeo';

const { Text } = Typography;

const LocalSEO: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rankings, setRankings] = useState<any[]>([]);
  const [gmbProfile, setGmbProfile] = useState<any>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>();
  const [compareResult, setCompareResult] = useState<any[]>([]);
  const [location1, setLocation1] = useState('');
  const [location2, setLocation2] = useState('');

  const loadData = async () => {
    if (!projectId) return; setLoading(true); setError(null);
    try {
      const [rankRes, gmbRes] = await Promise.allSettled([
        localSEOAPI.getRankings(projectId, { locationCode: locationFilter }),
        localSEOAPI.getGMBProfile(projectId),
      ]);
      const extractArr = (r: PromiseSettledResult<any>) => { if (r.status === 'fulfilled') { const d = (r.value as any).data !== undefined ? (r.value as any).data : r.value; return Array.isArray(d) ? d : (d?.data || []); } return []; };
      setRankings(extractArr(rankRes));
      if (gmbRes.status === 'fulfilled') { const d = (gmbRes.value as any).data !== undefined ? (gmbRes.value as any).data : gmbRes.value; setGmbProfile(d || null); }
    } catch (e: any) { setError(e?.message || '加载失败'); } finally { setLoading(false); }
  };

  useEffect(() => { if (!projectId) { setLoading(false); return; } loadData(); }, [projectId, locationFilter]);

  const handleRefresh = async () => { setRefreshing(true); try { await localSEOAPI.refreshData(projectId!); message.success('数据刷新中'); setTimeout(() => { loadData(); setRefreshing(false); }, 3000); } catch (e: any) { message.error(e?.message || '刷新失败'); setRefreshing(false); } };
  const handleAddKeyword = async () => { if (!newKeyword.trim()) { message.warning('请输入关键词'); return; } try { await localSEOAPI.addKeyword(projectId!, newKeyword.trim()); message.success('已添加'); setNewKeyword(''); loadData(); } catch (e: any) { message.error(e?.message || '添加失败'); } };
  const handleCompare = async () => { if (!location1.trim() || !location2.trim()) { message.warning('请输入两个地点'); return; } try { const res = await localSEOAPI.compareLocations(projectId!, location1.trim(), location2.trim()); const data = (res as any).data !== undefined ? (res as any).data : res; setCompareResult(Array.isArray(data) ? data : (data?.data || [])); message.success('对比完成'); } catch (e: any) { message.error(e?.message || '对比失败'); } };

  if (!projectId) return <div className="page-container"><PageHeader title="本地SEO" /><Empty description="请先选择一个项目" style={{ marginTop: 120 }} /></div>;
  if (loading) return <div className="page-container"><PageHeader title="本地SEO" /><Spin size="large" style={{ display: 'block', margin: '40vh auto' }} /></div>;
  if (error) return <div className="page-container"><PageHeader title="本地SEO" /><Alert type="error" message="加载失败" description={error} showIcon style={{ marginTop: 24 }} action={<Button size="small" onClick={loadData}>重试</Button>} /></div>;

  const columns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', render: (kw: string) => <Text strong>{kw}</Text> },
    { title: '排名', dataIndex: 'position', key: 'position', width: 80, render: (p: number) => <Tag color={p <= 3 ? 'green' : p <= 10 ? 'blue' : 'orange'}>{p || '-'}</Tag> },
    { title: '变化', dataIndex: 'change', key: 'change', width: 80, render: (c: number) => c ? <Text type={c > 0 ? 'success' : 'danger'}>{c > 0 ? '+' : ''}{c}</Text> : '-' },
    { title: 'Map Pack', dataIndex: 'mapPack', key: 'mapPack', width: 90, render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag> },
  ];

  const compareColumns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword' },
    { title: location1, dataIndex: 'rank1', key: 'rank1', render: (r: number) => r ? <Tag color={r <= 3 ? 'green' : 'orange'}>{r}</Tag> : '-' },
    { title: location2, dataIndex: 'rank2', key: 'rank2', render: (r: number) => r ? <Tag color={r <= 3 ? 'green' : 'orange'}>{r}</Tag> : '-' },
  ];

  return (
    <div className="page-container">
      <PageHeader title="本地 SEO" subtitle="Google My Business 档案管理与本地排名追踪"
        actions={[{ label: '刷新', icon: <ReloadOutlined />, onClick: loadData, loading }, { label: '刷新排名', type: 'primary', icon: <ThunderboltOutlined />, onClick: handleRefresh, loading: refreshing }]} />
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="本地关键词" value={rankings.length} prefix={<AimOutlined />} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="Map Pack" value={rankings.filter((r: any) => r.mapPack).length} prefix={<EnvironmentOutlined />} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="GMB评分" value={gmbProfile?.rating || '-'} prefix={<StarOutlined />} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="评价数" value={gmbProfile?.reviewCount || 0} /></Card></Col>
      </Row>
      {gmbProfile && (
        <Card title={<><ShopOutlined /> GMB 档案</>} style={{ marginBottom: 24 }}>
          <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label="商家名称">{gmbProfile.businessName || '-'}</Descriptions.Item>
            <Descriptions.Item label="类别">{gmbProfile.category || '-'}</Descriptions.Item>
            <Descriptions.Item label="地址">{gmbProfile.address || '-'}</Descriptions.Item>
            <Descriptions.Item label="电话">{gmbProfile.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="评分"><Text strong style={{ color: '#fa8c16' }}>{gmbProfile.rating || '-'}</Text></Descriptions.Item>
            <Descriptions.Item label="评价数">{gmbProfile.reviewCount || 0}</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={gmbProfile.status === 'active' ? 'green' : 'orange'}>{gmbProfile.status || '未知'}</Tag></Descriptions.Item>
          </Descriptions>
        </Card>
      )}
      <Tabs size="large" items={[
        { key: 'rankings', label: <span><AimOutlined /> 本地排名</span>, children: (
          <Card title="本地排名" extra={<Space>
            <Input.Search placeholder="添加关键词" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} onSearch={handleAddKeyword} enterButton={<PlusOutlined />} style={{ width: 220 }} />
            <Select placeholder="地区" allowClear style={{ width: 150 }} value={locationFilter} onChange={setLocationFilter}
              options={[{ value: '2152', label: '美国' }, { value: '2840', label: '中国' }, { value: '2826', label: '英国' }]} />
          </Space>}>
            <Table columns={columns} dataSource={rankings} rowKey="id" pagination={{ pageSize: 10 }} size="middle" />
          </Card>
        )},
        { key: 'compare', label: <span><SwapOutlined /> 地点对比</span>, children: (
          <Card title="地理位置对比">
            <Space style={{ marginBottom: 16 }}>
              <Input placeholder="地点1" value={location1} onChange={(e) => setLocation1(e.target.value)} style={{ width: 150 }} />
              <SwapOutlined />
              <Input placeholder="地点2" value={location2} onChange={(e) => setLocation2(e.target.value)} style={{ width: 150 }} />
              <Button type="primary" onClick={handleCompare}>对比</Button>
            </Space>
            {compareResult.length > 0 && <Table columns={compareColumns} dataSource={compareResult} rowKey="keyword" pagination={{ pageSize: 10 }} size="middle" />}
          </Card>
        )},
      ]} />
    </div>
  );
};

export default LocalSEO;