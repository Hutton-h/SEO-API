import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Statistic, Typography, Button, Table, Tag, Progress, Space, List, message, Spin, Empty, Alert,
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
import { useStore } from '@/store';
import { reportAPI, ReportData } from '@/services/report';
import dayjs from 'dayjs';

echarts.use([GaugeChart, CanvasRenderer]);

const { Text, Title, Paragraph } = Typography;

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
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadReport = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await reportAPI.getReport(projectId);
      const result = (res as any).data || res;
      setReportData(result);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载报告失败';
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
    loadReport();
  }, [projectId, loadReport]);

  const handleRefresh = async () => {
    await loadReport();
  };

  const handleGenerate = async () => {
    if (!projectId) return;
    setGenerating(true);
    try {
      const res = await reportAPI.generateReport(projectId);
      const result = (res as any).data || res;
      setReportData(result);
      message.success('报告生成完成');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '生成报告失败';
      message.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!projectId) return;
    setExporting(true);
    try {
      const res = await reportAPI.exportPDF(projectId);
      // 创建 Blob 并触发下载
      const blob = new Blob([res as any], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SEO报告_${dayjs().format('YYYYMMDD')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('PDF 报告已导出');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '导出PDF失败';
      message.error(msg);
    } finally {
      setExporting(false);
    }
  };

  // ---- 渲染 ----

  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader
          title="综合报告"
          subtitle="SEO 健康评估与优化建议"
        />
        <Empty description="请先选择一个项目" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="综合报告"
          subtitle="SEO 健康评估与优化建议"
        />
        <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <PageHeader
          title="综合报告"
          subtitle="SEO 健康评估与优化建议"
          actions={[
            { label: '重试', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          ]}
        />
        <Alert type="error" message="加载失败" description={error} showIcon />
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="page-container">
        <PageHeader
          title="综合报告"
          subtitle="SEO 健康评估与优化建议"
          actions={[
            { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
            { label: '生成报告', type: 'primary', icon: <FileTextOutlined />, onClick: handleGenerate, loading: generating },
          ]}
        />
        <Empty description="暂无报告数据，请点击「生成报告」按钮" />
      </div>
    );
  }

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
        data: [{ value: reportData.seoHealthScore, name: 'SEO 健康评分' }],
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
              基于 {reportData.modules.length} 个维度的综合评估
            </Text>
          </Card>
        </Col>
        <Col xs={24} md={14}>
          <Card title="模块评分">
            {reportData.modules.map((mod) => (
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
          <Card size="small"><Statistic title="关键词" value={reportData.overview.totalKeywords.toLocaleString()} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="页面数" value={reportData.overview.totalPages.toLocaleString()} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="外链" value={reportData.overview.totalBacklinks.toLocaleString()} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="平均排名" value={reportData.overview.averageRank} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="自然流量" value={(reportData.overview.organicTraffic / 1000).toFixed(1)} suffix="k" /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small">
            <Statistic
              title="流量变化"
              value={reportData.overview.organicTrafficChange}
              suffix="%"
              prefix={reportData.overview.organicTrafficChange >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              valueStyle={{ color: reportData.overview.organicTrafficChange >= 0 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 关键词排名 & 建议 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="TOP 关键词排名">
            <Table columns={keywordColumns} dataSource={reportData.topKeywords} rowKey="keyword" pagination={false} size="small" />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="优化建议">
            <List
              dataSource={reportData.recommendations}
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