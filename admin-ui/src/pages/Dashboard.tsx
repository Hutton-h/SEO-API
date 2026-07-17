import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Tag, Progress, Typography, Space, Badge, Button } from 'antd';
import {
  ProjectOutlined,
  KeyOutlined,
  FileTextOutlined,
  HeartOutlined,
  ReloadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import StatCard from '@/components/StatCard';
import PageHeader from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

echarts.use([
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  CanvasRenderer,
]);

const { Text } = Typography;

// 模拟数据
const mockStats = {
  projects: 12,
  keywords: 3845,
  pagesCrawled: 56720,
  seoHealthScore: 87,
};

const mockRankingTrend = [
  { date: '2024-01', avgPosition: 12.5, top10: 45 },
  { date: '2024-02', avgPosition: 11.8, top10: 48 },
  { date: '2024-03', avgPosition: 10.3, top10: 52 },
  { date: '2024-04', avgPosition: 9.8, top10: 55 },
  { date: '2024-05', avgPosition: 9.2, top10: 58 },
  { date: '2024-06', avgPosition: 8.5, top10: 62 },
  { date: '2024-07', avgPosition: 8.1, top10: 65 },
];

const mockRecentTasks = [
  { id: '1', project: '主站优化', pages: 2500, status: 'completed', date: '2024-07-14', issues: 45 },
  { id: '2', project: '电商平台', pages: 1800, status: 'running', date: '2024-07-14', issues: 12 },
  { id: '3', project: '博客站', pages: 890, status: 'completed', date: '2024-07-13', issues: 23 },
  { id: '4', project: '企业官网', pages: 1200, status: 'failed', date: '2024-07-13', issues: 0 },
  { id: '5', project: '移动端优化', pages: 1500, status: 'completed', date: '2024-07-12', issues: 67 },
];

const mockIssueDistribution = [
  { name: '严重', value: 45, color: '#ff4d4f' },
  { name: '重要', value: 128, color: '#faad14' },
  { name: '次要', value: 256, color: '#1677ff' },
  { name: '提示', value: 89, color: '#52c41a' },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const rankingOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e8e8e8',
      textStyle: { color: '#333' },
    },
    legend: {
      data: ['平均排名', 'TOP10 关键词数'],
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '12%',
      top: '8%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: mockRankingTrend.map((d) => d.date.slice(5)),
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisLabel: { color: '#999' },
    },
    yAxis: [
      {
        type: 'value',
        name: '排名',
        inverse: true,
        min: 0,
        max: 20,
        axisLabel: { color: '#999' },
        splitLine: { lineStyle: { color: '#f0f0f0' } },
      },
      {
        type: 'value',
        name: '数量',
        axisLabel: { color: '#999' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '平均排名',
        type: 'line',
        data: mockRankingTrend.map((d) => d.avgPosition),
        smooth: true,
        lineStyle: { color: '#1677ff', width: 3 },
        itemStyle: { color: '#1677ff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(22,119,255,0.2)' },
              { offset: 1, color: 'rgba(22,119,255,0.02)' },
            ],
          },
        },
        symbol: 'circle',
        symbolSize: 6,
      },
      {
        name: 'TOP10 关键词数',
        type: 'line',
        yAxisIndex: 1,
        data: mockRankingTrend.map((d) => d.top10),
        smooth: true,
        lineStyle: { color: '#52c41a', width: 3 },
        itemStyle: { color: '#52c41a' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(82,196,26,0.2)' },
              { offset: 1, color: 'rgba(82,196,26,0.02)' },
            ],
          },
        },
        symbol: 'circle',
        symbolSize: 6,
      },
    ],
  };

  const issueOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      itemGap: 16,
    },
    series: [
      {
        type: 'pie',
        radius: ['55%', '80%'],
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
        data: mockIssueDistribution.map((item) => ({
          ...item,
          itemStyle: { color: item.color },
        })),
      },
    ],
  };

  const taskColumns = [
    {
      title: '项目',
      dataIndex: 'project',
      key: 'project',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '页面数',
      dataIndex: 'pages',
      key: 'pages',
      render: (pages: number) => pages.toLocaleString(),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          completed: { color: 'success', text: '已完成' },
          running: { color: 'processing', text: '进行中' },
          failed: { color: 'error', text: '失败' },
          pending: { color: 'default', text: '等待中' },
        };
        return <Badge status={config[status]?.color as any} text={config[status]?.text} />;
      },
    },
    {
      title: '问题数',
      dataIndex: 'issues',
      key: 'issues',
      render: (issues: number) => (
        <Space>
          {issues > 0 ? <WarningOutlined style={{ color: '#faad14' }} /> : <CheckCircleOutlined style={{ color: '#52c41a' }} />}
          <Text>{issues}</Text>
        </Space>
      ),
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('MM-DD HH:mm'),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="仪表盘"
        subtitle="SEO 运营数据总览"
        actions={[
          {
            label: '刷新数据',
            icon: <ReloadOutlined />,
            onClick: handleRefresh,
            loading,
          },
        ]}
      />

      {/* 统计卡片 */}
      <div className="dashboard-stats">
        <StatCard
          title="项目总数"
          value={mockStats.projects}
          icon={<ProjectOutlined />}
          color="#1677ff"
          trend={8}
          onClick={() => navigate('/projects')}
        />
        <StatCard
          title="关键词总数"
          value={mockStats.keywords.toLocaleString()}
          icon={<KeyOutlined />}
          color="#52c41a"
          trend={12}
          onClick={() => navigate('/keywords')}
        />
        <StatCard
          title="爬取页面数"
          value={mockStats.pagesCrawled.toLocaleString()}
          icon={<FileTextOutlined />}
          color="#722ed1"
          trend={15}
          onClick={() => navigate('/crawl-audit')}
        />
        <StatCard
          title="SEO 健康分"
          value={mockStats.seoHealthScore}
          suffix="分"
          icon={<HeartOutlined />}
          color="#fa8c16"
          trend={5}
        />
      </div>

      {/* 图表区域 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title="排名趋势"
            className="chart-card"
            extra={
              <Button type="link" onClick={() => navigate('/rankings')}>
                查看详情 <RightOutlined />
              </Button>
            }
          >
            <ReactEChartsCore
              echarts={echarts}
              option={rankingOption}
              style={{ height: 350 }}
              notMerge
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="问题概览" className="chart-card">
            <ReactEChartsCore
              echarts={echarts}
              option={issueOption}
              style={{ height: 350 }}
              notMerge
            />
          </Card>
        </Col>
      </Row>

      {/* 最近爬虫任务 */}
      <Card
        title="最近爬虫任务"
        style={{ marginTop: 24 }}
        extra={
          <Button type="link" onClick={() => navigate('/crawl-audit')}>
            查看全部 <RightOutlined />
          </Button>
        }
      >
        <Table
          columns={taskColumns}
          dataSource={mockRecentTasks}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default Dashboard;