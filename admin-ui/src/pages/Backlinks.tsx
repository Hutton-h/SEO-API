import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Tag, Typography, Row, Col, Statistic, Space, message, Spin, Empty, Alert,
  Input, Select, Progress, Tabs, Tooltip, Badge,
} from 'antd';
import {
  ReloadOutlined, LinkOutlined, TrophyOutlined, GlobalOutlined, RiseOutlined,
  SearchOutlined, ThunderboltOutlined, InfoCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined, WarningOutlined, AimOutlined, HistoryOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { PieChart, BarChart } from 'echarts/charts';
import { TooltipComponent, TitleComponent, LegendComponent, GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { backlinkAPI } from '@/services/backlinks';

echarts.use([PieChart, BarChart, TooltipComponent, TitleComponent, LegendComponent, GridComponent, CanvasRenderer]);

const { Text } = Typography;

const Backlinks: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [backlinks, setBacklinks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalBacklinks: 0, referringDomains: 0, dofollowCount: 0, nofollowCount: 0,
    avgDomainAuthority: 0, avgPageAuthority: 0, newBacklinks: 0, lostBacklinks: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 筛选
  const [searchFilter, setSearchFilter] = useState('');
  const [dofollowFilter, setDofollowFilter] = useState<string | undefined>();

  const loadData = async (p?: number, ps?: number, search?: string, linkType?: string) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [blRes, statsRes] = await Promise.all([
        backlinkAPI.getBacklinks(projectId, {
          page: p || page, pageSize: ps || pageSize,
          ...(search ? { search } : {}),
          ...(linkType ? { type: linkType } : {}),
        }),
        backlinkAPI.getBacklinkStats(projectId),
      ]);

      const blData = (blRes as any).data !== undefined ? (blRes as any).data : blRes;
      setBacklinks(Array.isArray(blData) ? blData : (blData?.data || blData?.backlinks || []));
      setTotal(blData?.total || 0);

      const statsData = (statsRes as any).data !== undefined ? (statsRes as any).data : statsRes;
      if (statsData && Object.keys(statsData).length > 0) {
        setStats(statsData);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadData();
  }, [projectId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await backlinkAPI.refreshBacklinks(projectId!);
      message.success('外链刷新任务已启动');
      setTimeout(() => { loadData(); setRefreshing(false); }, 3000);
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || '刷新失败');
      setRefreshing(false);
    }
  };

  // ====== 空/加载/错误 ======
  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="外链分析" subtitle="网站反向链接监控与分析" />
        <Empty description="请先选择一个项目" style={{ marginTop: 120 }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="外链分析" subtitle="网站反向链接监控与分析" />
        <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <PageHeader title="外链分析" subtitle="网站反向链接监控与分析" />
        <Alert type="error" message="加载失败" description={error} showIcon style={{ marginTop: 24 }}
          action={<Button size="small" onClick={() => loadData()}>重试</Button>} />
      </div>
    );
  }

  // 外链类型分布
  const typeChartOption = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      data: [
        { value: stats?.dofollowCount || 0, name: 'Dofollow', itemStyle: { color: '#52c41a' } },
        { value: stats?.nofollowCount || 0, name: 'Nofollow', itemStyle: { color: '#faad14' } },
      ],
    }],
  };

  const columns = [
    { title: '来源URL', dataIndex: 'sourceUrl', key: 'sourceUrl', width: 280, ellipsis: true,
      render: (url: string) => <Text code style={{ fontSize: 11 }}>{url}</Text>,
    },
    { title: '目标URL', dataIndex: 'targetUrl', key: 'targetUrl', width: 250, ellipsis: true,
      render: (url: string) => <Text code style={{ fontSize: 11 }}>{url}</Text>,
    },
    { title: '锚文本', dataIndex: 'anchorText', key: 'anchorText', width: 150, ellipsis: true,
      render: (text: string) => <Text strong>{text || '-'}</Text>,
    },
    { title: '类型', dataIndex: 'type', key: 'type', width: 90,
      render: (t: string) => <Tag color={t === 'dofollow' ? 'green' : 'orange'}>{t}</Tag>,
    },
    { title: 'DA', dataIndex: 'domainAuthority', key: 'domainAuthority', width: 70,
      render: (da: number) => {
        const color = da >= 50 ? '#52c41a' : da >= 30 ? '#faad14' : '#ff4d4f';
        return <Tag color={color}>{da || '-'}</Tag>;
      },
    },
    { title: 'PA', dataIndex: 'pageAuthority', key: 'pageAuthority', width: 70,
      render: (pa: number) => <Tag>{pa || '-'}</Tag>,
    },
    { title: '垃圾评分', dataIndex: 'spamScore', key: 'spamScore', width: 90,
      render: (score: number) => {
        if (score === undefined || score === null) return '-';
        const color = score <= 3 ? '#52c41a' : score <= 7 ? '#faad14' : '#ff4d4f';
        return <Progress percent={score * 10} size="small" strokeColor={color} format={() => `${score}/10`} />;
      },
    },
    { title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (s: string) => {
        const config: Record<string, { color: string; text: string }> = {
          active: { color: 'green', text: '活跃' },
          lost: { color: 'red', text: '丢失' },
          new: { color: 'blue', text: '新增' },
        };
        const c = config[s] || { color: 'default', text: s || '未知' };
        return <Tag color={c.color}>{c.text}</Tag>;
      },
    },
    { title: '发现时间', dataIndex: 'firstSeen', key: 'firstSeen', width: 140,
      render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-',
    },
  ];

  return (
    <div className="page-container">
      <PageHeader title="外链分析" subtitle="网站反向链接监控、质量评估与趋势分析"
        actions={[
          { label: '刷新数据', icon: <ReloadOutlined />, onClick: () => loadData(), loading },
          { label: '刷新外链', type: 'primary', icon: <ThunderboltOutlined />, onClick: handleRefresh, loading: refreshing },
        ]}
      />

      {/* 统计概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="总外链数" value={stats?.totalBacklinks || 0} prefix={<LinkOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="引用域名" value={stats?.referringDomains || 0} prefix={<GlobalOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="Dofollow" value={stats?.dofollowCount || 0} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="Nofollow" value={stats?.nofollowCount || 0} valueStyle={{ color: '#faad14' }} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="新增外链" value={stats?.newBacklinks || 0} valueStyle={{ color: '#1677ff' }}
            prefix={<RiseOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="丢失外链" value={stats?.lostBacklinks || 0} valueStyle={{ color: '#ff4d4f' }} /></Card>
        </Col>
      </Row>

      {/* 图表 + 表格 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card title="外链类型分布" size="small">
            <ReactEChartsCore echarts={echarts} option={typeChartOption} style={{ height: 250 }} />
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card title="域名权重分布" size="small">
            <Row gutter={[16, 16]}>
              <Col span={8}><Statistic title="平均域名权重" value={stats?.avgDomainAuthority || 0} suffix="/100" /></Col>
              <Col span={8}><Statistic title="平均页面权重" value={stats?.avgPageAuthority || 0} suffix="/100" /></Col>
              <Col span={8}><Statistic title="引用域名数" value={stats?.referringDomains || 0} /></Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 外链列表 */}
      <Card title="外链详情"
        extra={
          <Space>
            <Input
              placeholder="搜索URL..."
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 200 }}
              value={searchFilter}
              onChange={(e) => { setSearchFilter(e.target.value); loadData(1, pageSize, e.target.value, dofollowFilter); }}
            />
            <Select placeholder="链接类型" allowClear style={{ width: 120 }}
              value={dofollowFilter}
              onChange={(v) => { setDofollowFilter(v); loadData(1, pageSize, searchFilter, v); }}
              options={[
                { value: 'dofollow', label: 'Dofollow' },
                { value: 'nofollow', label: 'Nofollow' },
              ]}
            />
          </Space>
        }
      >
        <Table columns={columns} dataSource={backlinks} rowKey="id"
          pagination={{ current: page, pageSize, total, showSizeChanger: true,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); loadData(p, ps, searchFilter, dofollowFilter); },
          }}
          scroll={{ x: 1300 }} size="middle"
        />
      </Card>
    </div>
  );
};

export default Backlinks;