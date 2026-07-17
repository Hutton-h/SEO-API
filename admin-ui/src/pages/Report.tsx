import React, { useState } from 'react';
import {
  Card, Row, Col, Statistic, Typography, Button, Table, Tag, Progress, Space, List, message, Spin,
} from 'antd';
import {
  FileTextOutlined, DownloadOutlined, ReloadOutlined, TrophyOutlined,
  CheckCircleOutlined, WarningOutlined, CloseCircleOutlined, ArrowUpOutlined,
  ArrowDownOutlined, MinusOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { GaugeChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';

echarts.use([GaugeChart, CanvasRenderer]);

const { Text, Title, Paragraph } = Typography;

const mockReportData = {
  seoHealthScore: 87,
  overview: {
    totalKeywords: 3845,
    totalPages: 56720,
    totalBacklinks: 1245,
    averageRank: 8.1,
    organicTraffic: 125000,
    organicTrafficChange: 12.5,
  },
  modules: [
    { name: '技术 SEO', score: 92, total: 100, issues: 3, status: 'good' },
    { name: '内容优化', score: 78, total: 100, issues: 12, status: 'warning' },
    { name: '外链分析', score: 85, total: 100, issues: 8, status: 'good' },
    { name: '关键词排名', score: 82, total: 100, issues: 15, status: 'warning' },
    { name: '移动端体验', score: 88, total: 100, issues: 5, status: 'good' },
    { name: '页面速度', score: 72, total: 100, issues: 18, status: 'critical' },
  ],
  topKeywords: [
    { keyword: 'SEO优化服务', position: 3, change: 2, searchVolume: 12000 },
    { keyword: '搜索引擎优化', position: 2, change: 1, searchVolume: 15000 },
    { keyword: 'SEO审计', position: 4, change: 0, searchVolume: 4800 },
    { keyword: '内容营销策略', position: 5, change: 1, searchVolume: 9200 },
    { keyword: '外链建设', position: 8, change: 7, searchVolume: 5400 },
  ],
  recommendations: [
    { priority: 'high', title: '修复页面速度问题', description: 'LCP 超过 2.5 秒，影响排名和用户体验', impact: '高' },
    { priority: 'high', title: '添加 FAQ 结构化数据', description: 'TOP 页面缺少 FAQ schema', impact: '高' },
    { priority: 'medium', title: '扩展长尾关键词覆盖', description: '23 个高潜力长尾关键词待覆盖', impact: '中' },
    { priority: 'medium', title: '增加高质量外链', description: 'DA 值低于行业平均水平', impact: '中' },
    { priority: 'low', title: '优化图片 Alt 标签', description: '部分页面图片缺少 Alt 标签', impact: '低' },
  ],
};

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  good: { color: '#52c41a', icon: <CheckCircleOutlined /> },
  warning: { color: '#faad14', icon: <WarningOutlined /> },
  critical: { color: '#ff4d4f', icon: <CloseCircleOutlined /> },
};

const priorityConfig: Record<string, { color: string }> = {
  high: { color: '#ff4d4f' },
  medium: { color: '#faad14' },
  low: { color: '#1677ff' },
};

const Report: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      message.success('报告生成完成');
    }, 2000);
  };

  const handleExportPDF = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      message.success('PDF 报告已导出');
    }, 2000);
  };

  const gaugeOption = {
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        center: ['50%', '55%'],
        radius: '90%',
        min: 0,
        max: 100,
        axisLine: {
          show: true,
          lineStyle: {
            width: 20,
            color: [
              [0.3, '#ff4d4f'],
              [0.7, '#faad14'],
              [1, '#52c41a'],
            ],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 48,
          fontWeight: 'bold',
          color: '#1a1a1a',
          offsetCenter: [0, '60%'],
          formatter: '{value}',
        },
        title: {
          offsetCenter: [0, '90%'],
          fontSize: 14,
          color: '#999',
        },
        data: [{ value: mockReportData.seoHealthScore, name: 'SEO 健康评分' }],
      },
    ],
  };

  const keywordColumns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', render: (t: string) => <Text strong>{t}</Text> },
    {
      title: '排名', dataIndex: 'position', key: 'position', width: 80,
      render: (p: number) => <Tag color={p <= 3 ? '#52c41a' : '#1677ff'}>#{p}</Tag>,
    },
    {
      title: '变化', key: 'change', width: 80,
      render: (_: any, r: any) => {
        if (r.change > 0) return <Tag color="success" icon={<ArrowUpOutlined />}>+{r.change}</Tag>;
        if (r.change < 0) return <Tag color="error" icon={<ArrowDownOutlined />}>{r.change}</Tag>;
        return <Tag icon={<MinusOutlined />}>0</Tag>;
      },
    },
    { title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 100, render: (v: number) => v.toLocaleString() },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="综合报告"
        subtitle="SEO 健康评估与优化建议"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          { label: '生成报告', type: 'primary', icon: <FileTextOutlined />, onClick: handleGenerate, loading: generating },
          { label: '导出 PDF', icon: <DownloadOutlined />, onClick: handleExportPDF, loading: exporting },
        ]}
      />

      {/* SEO 健康评分仪表盘 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={10}>
          <Card title="SEO 健康评分" style={{ textAlign: 'center' }}>
            <ReactEChartsCore echarts={echarts} option={gaugeOption} style={{ height: 280 }} notMerge />
            <Text type="secondary">
              基于 {mockReportData.modules.length} 个维度的综合评估
            </Text>
          </Card>
        </Col>
        <Col xs={24} md={14}>
          <Card title="模块评分">
            {mockReportData.modules.map((mod) => (
              <div key={mod.name} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Space>
                    <span style={{ color: statusConfig[mod.status].color }}>
                      {statusConfig[mod.status].icon}
                    </span>
                    <Text>{mod.name}</Text>
                  </Space>
                  <Space>
                    <Text type="secondary">{mod.issues} 个问题</Text>
                    <Text strong style={{ color: statusConfig[mod.status].color }}>
                      {mod.score}/{mod.total}
                    </Text>
                  </Space>
                </div>
                <Progress
                  percent={mod.score}
                  strokeColor={statusConfig[mod.status].color}
                  showInfo={false}
                  size="small"
                />
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      {/* 概览数据 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="关键词" value={mockReportData.overview.totalKeywords.toLocaleString()} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="页面数" value={mockReportData.overview.totalPages.toLocaleString()} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="外链" value={mockReportData.overview.totalBacklinks.toLocaleString()} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="平均排名" value={mockReportData.overview.averageRank} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="自然流量" value={(mockReportData.overview.organicTraffic / 1000).toFixed(1)} suffix="k" /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small">
            <Statistic
              title="流量变化"
              value={mockReportData.overview.organicTrafficChange}
              suffix="%"
              prefix={<ArrowUpOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 关键词排名 & 建议 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="TOP 关键词排名">
            <Table columns={keywordColumns} dataSource={mockReportData.topKeywords} rowKey="keyword" pagination={false} size="small" />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="优化建议">
            <List
              dataSource={mockReportData.recommendations}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Tag color={priorityConfig[item.priority].color}>
                        {item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}
                      </Tag>
                    }
                    title={item.title}
                    description={item.description}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Report;