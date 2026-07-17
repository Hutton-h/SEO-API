import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Tag, Typography, Row, Col, Statistic, Space, message, Progress, Spin, Empty, Alert,
} from 'antd';
import {
  ReloadOutlined, LinkOutlined, TrophyOutlined,
  GlobalOutlined, RiseOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { backlinkAPI } from '@/services/backlink';

echarts.use([PieChart, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text } = Typography;

// 简单箭头图标组件
const ArrowDownIcon: React.FC = () => (
  <span style={{ fontSize: 14 }}>
    <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
      <path d="M862 465.3h-81c-4.6 0-9 2-12.1 5.5L550 723.1V160c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8v563.1L255.1 470.8c-3-3.5-7.4-5.5-12.1-5.5h-81c-6.8 0-10.5 8.1-6 13.2L487.9 861a31.96 31.96 0 0048.3 0L868 478.5c4.5-5.2.8-13.2-6-13.2z" />
    </svg>
  </span>
);

const Backlinks: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [backlinks, setBacklinks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalBacklinks: 0,
    referringDomains: 0,
    dofollowCount: 0,
    nofollowCount: 0,
    avgDomainAuthority: 0,
    avgPageAuthority: 0,
    newBacklinks: 0,
    lostBacklinks: 0,
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        backlinkAPI.getBacklinks(projectId!),
        backlinkAPI.getBacklinkStats(projectId!),
      ]);

      const extractArr = (result: PromiseSettledResult<any>): any[] => {
        if (result.status === 'fulfilled') {
          const res = result.value;
          const d = (res as any).data !== undefined ? (res as any).data : res;
          return Array.isArray(d) ? d : (d?.data || d?.backlinks || []);
        }
        return [];
      };

      const extractObj = (result: PromiseSettledResult<any>): any => {
        if (result.status === 'fulfilled') {
          const res = result.value;
          return (res as any).data !== undefined ? (res as any).data : res;
        }
        return {};
      };

      const backlinkList = extractArr(results[0]);
      const statsData = extractObj(results[1]);

      setBacklinks(backlinkList);

      const dofollowCount = statsData?.dofollowCount ?? backlinkList.filter((b: any) => b.type === 'dofollow').length;
      const nofollowCount = statsData?.nofollowCount ?? backlinkList.filter((b: any) => b.type === 'nofollow').length;

      setStats({
        totalBacklinks: statsData?.totalBacklinks ?? backlinkList.length,
        referringDomains: statsData?.referringDomains ?? 0,
        dofollowCount,
        nofollowCount,
        avgDomainAuthority: statsData?.avgDomainAuthority ?? 0,
        avgPageAuthority: statsData?.avgPageAuthority ?? 0,
        newBacklinks: statsData?.newBacklinks ?? 0,
        lostBacklinks: statsData?.lostBacklinks ?? 0,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    loadData();
  }, [projectId]);

  const handleRefresh = () => {
    loadData();
  };

  const handleRefreshBacklinks = async () => {
    setRefreshing(true);
    try {
      await backlinkAPI.refreshBacklinks(projectId!);
      message.success('外链数据已刷新');
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '刷新外链失败';
      message.error(msg);
    } finally {
      setRefreshing(false);
    }
  };

  // ---- 空状态 / 加载状态 / 错误状态 ----
  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="外链分析" subtitle="外链数据监控与分析" />
        <Empty description="请先选择一个项目" style={{ marginTop: 120 }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="外链分析" subtitle="外链数据监控与分析" />
        <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <PageHeader title="外链分析" subtitle="外链数据监控与分析" />
        <Alert
          type="error"
          message="加载失败"
          description={error}
          showIcon
          style={{ marginTop: 24 }}
          action={<Button size="small" onClick={handleRefresh}>重试</Button>}
        />
      </div>
    );
  }

  const dofollowPercent = stats.totalBacklinks > 0
    ? Math.round((stats.dofollowCount / stats.totalBacklinks) * 100)
    : 0;

  const pieOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
    },
    series: [
      {
        type: 'pie',
        radius: ['50%', '75%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 3,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 16, fontWeight: 'bold' },
        },
        data: [
          { value: stats.dofollowCount, name: 'Dofollow', itemStyle: { color: '#1677ff' } },
          { value: stats.nofollowCount, name: 'Nofollow', itemStyle: { color: '#ff7a45' } },
        ],
      },
    ],
  };

  const columns = [
    {
      title: '来源 URL',
      dataIndex: 'sourceUrl',
      key: 'sourceUrl',
      ellipsis: true,
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <LinkOutlined style={{ marginRight: 4 }} />
          {url}
        </a>
      ),
    },
    {
      title: '锚文本',
      dataIndex: 'anchorText',
      key: 'anchorText',
      width: 140,
      render: (text: string) => <Text>{text}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (type: string) => (
        <Tag color={type === 'dofollow' ? 'blue' : 'orange'}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'DA',
      dataIndex: 'domainAuthority',
      key: 'domainAuthority',
      width: 80,
      sorter: (a: any, b: any) => (a.domainAuthority || 0) - (b.domainAuthority || 0),
      render: (da: number) => {
        const d = da ?? 0;
        const color = d >= 50 ? '#52c41a' : d >= 30 ? '#faad14' : '#ff4d4f';
        return <Text strong style={{ color }}>{d}</Text>;
      },
    },
    {
      title: 'PA',
      dataIndex: 'pageAuthority',
      key: 'pageAuthority',
      width: 80,
      render: (pa: number) => <Text>{pa ?? 0}</Text>,
    },
    {
      title: '垃圾评分',
      dataIndex: 'spamScore',
      key: 'spamScore',
      width: 100,
      render: (score: number) => {
        const s = score ?? 0;
        const color = s <= 3 ? '#52c41a' : s <= 7 ? '#faad14' : '#ff4d4f';
        return <Progress percent={s} size="small" strokeColor={color} format={() => `${s}%`} />;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '活跃' : '丢失'}
        </Tag>
      ),
    },
    {
      title: '最后检测',
      dataIndex: 'lastSeen',
      key: 'lastSeen',
      width: 110,
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="外链分析"
        subtitle="外链数据监控与分析"
        actions={[
          { label: '刷新外链', type: 'primary', icon: <ReloadOutlined />, onClick: handleRefreshBacklinks, loading: refreshing },
        ]}
      />

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="外链总数"
              value={stats.totalBacklinks}
              prefix={<LinkOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="引用域名"
              value={stats.referringDomains}
              prefix={<GlobalOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="平均 DA"
              value={stats.avgDomainAuthority}
              prefix={<TrophyOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Dofollow 比例"
              value={dofollowPercent}
              suffix="%"
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 外链类型分布 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card title="外链类型分布">
            <ReactEChartsCore
              echarts={echarts}
              option={pieOption}
              style={{ height: 250 }}
              notMerge
            />
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card title="新增/丢失">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="新增外链（本月）"
                  value={stats.newBacklinks}
                  prefix={<RiseOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="丢失外链（本月）"
                  value={stats.lostBacklinks}
                  prefix={<ArrowDownIcon />}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 外链列表 */}
      <Card
        title="外链列表"
        extra={
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            刷新
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={backlinks}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
          size="middle"
          loading={loading}
        />
      </Card>
    </div>
  );
};

export default Backlinks;