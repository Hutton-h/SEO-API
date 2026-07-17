import React, { useState } from 'react';
import {
  Card, Table, Button, Tag, Typography, Row, Col, Statistic, Space, message, Progress,
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

echarts.use([PieChart, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text } = Typography;

const mockBacklinks = [
  { id: '1', sourceUrl: 'https://example-blog.com/seo-guide', targetUrl: '/', anchorText: 'SEO优化指南', type: 'dofollow', domainAuthority: 65, pageAuthority: 45, spamScore: 2, firstSeen: '2024-01-15', lastSeen: '2024-07-14', status: 'active' },
  { id: '2', sourceUrl: 'https://news-site.com/tech', targetUrl: '/blog/ranking-tips', anchorText: '排名提升技巧', type: 'dofollow', domainAuthority: 78, pageAuthority: 52, spamScore: 1, firstSeen: '2024-03-20', lastSeen: '2024-07-14', status: 'active' },
  { id: '3', sourceUrl: 'https://forum.example.com', targetUrl: '/services/seo', anchorText: 'SEO服务', type: 'nofollow', domainAuthority: 42, pageAuthority: 30, spamScore: 5, firstSeen: '2024-02-10', lastSeen: '2024-07-13', status: 'active' },
  { id: '4', sourceUrl: 'https://directory.com/listing', targetUrl: '/', anchorText: 'Crane SEO', type: 'dofollow', domainAuthority: 35, pageAuthority: 28, spamScore: 8, firstSeen: '2024-04-05', lastSeen: '2024-07-12', status: 'active' },
  { id: '5', sourceUrl: 'https://partner-site.com', targetUrl: '/tools/keyword', anchorText: '关键词工具', type: 'dofollow', domainAuthority: 55, pageAuthority: 40, spamScore: 3, firstSeen: '2024-05-18', lastSeen: '2024-07-14', status: 'active' },
  { id: '6', sourceUrl: 'https://old-blog.com/post', targetUrl: '/blog/content-strategy', anchorText: '内容策略', type: 'nofollow', domainAuthority: 30, pageAuthority: 22, spamScore: 12, firstSeen: '2023-11-20', lastSeen: '2024-06-01', status: 'lost' },
  { id: '7', sourceUrl: 'https://review-site.com', targetUrl: '/services/audit', anchorText: 'SEO审计', type: 'dofollow', domainAuthority: 50, pageAuthority: 38, spamScore: 4, firstSeen: '2024-06-10', lastSeen: '2024-07-14', status: 'active' },
  { id: '8', sourceUrl: 'https://social-platform.com', targetUrl: '/', anchorText: '点击这里', type: 'nofollow', domainAuthority: 88, pageAuthority: 60, spamScore: 1, firstSeen: '2024-01-05', lastSeen: '2024-07-14', status: 'active' },
];

const mockStats = {
  totalBacklinks: 1245,
  referringDomains: 387,
  dofollowCount: 856,
  nofollowCount: 389,
  avgDomainAuthority: 42,
  avgPageAuthority: 35,
  newBacklinks: 28,
  lostBacklinks: 5,
};

const Backlinks: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  const handleRefreshBacklinks = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      message.success('外链数据已刷新');
    }, 2000);
  };

  const dofollowPercent = Math.round((mockStats.dofollowCount / mockStats.totalBacklinks) * 100);

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
          { value: mockStats.dofollowCount, name: 'Dofollow', itemStyle: { color: '#1677ff' } },
          { value: mockStats.nofollowCount, name: 'Nofollow', itemStyle: { color: '#ff7a45' } },
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
      sorter: (a: any, b: any) => a.domainAuthority - b.domainAuthority,
      render: (da: number) => {
        const color = da >= 50 ? '#52c41a' : da >= 30 ? '#faad14' : '#ff4d4f';
        return <Text strong style={{ color }}>{da}</Text>;
      },
    },
    {
      title: 'PA',
      dataIndex: 'pageAuthority',
      key: 'pageAuthority',
      width: 80,
      render: (pa: number) => <Text>{pa}</Text>,
    },
    {
      title: '垃圾评分',
      dataIndex: 'spamScore',
      key: 'spamScore',
      width: 100,
      render: (score: number) => {
        const color = score <= 3 ? '#52c41a' : score <= 7 ? '#faad14' : '#ff4d4f';
        return <Progress percent={score} size="small" strokeColor={color} format={() => `${score}%`} />;
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
              value={mockStats.totalBacklinks}
              prefix={<LinkOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="引用域名"
              value={mockStats.referringDomains}
              prefix={<GlobalOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="平均 DA"
              value={mockStats.avgDomainAuthority}
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
          <Card
            title="新增/丢失"
          >
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="新增外链（本月）"
                  value={mockStats.newBacklinks}
                  prefix={<RiseOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="丢失外链（本月）"
                  value={mockStats.lostBacklinks}
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
          dataSource={mockBacklinks}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
          size="middle"
          loading={loading}
        />
      </Card>
    </div>
  );
};

// 简单箭头图标组件
const ArrowDownIcon: React.FC = () => (
  <span style={{ fontSize: 14 }}>
    <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
      <path d="M862 465.3h-81c-4.6 0-9 2-12.1 5.5L550 723.1V160c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8v563.1L255.1 470.8c-3-3.5-7.4-5.5-12.1-5.5h-81c-6.8 0-10.5 8.1-6 13.2L487.9 861a31.96 31.96 0 0048.3 0L868 478.5c4.5-5.2.8-13.2-6-13.2z" />
    </svg>
  </span>
);

export default Backlinks;