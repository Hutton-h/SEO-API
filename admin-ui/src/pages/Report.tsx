import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Tag, Typography, Row, Col, Statistic, Space, message, Spin, Empty, Alert, Tabs, Progress, List } from 'antd';
import { ReloadOutlined, ThunderboltOutlined, FilePdfOutlined, TrophyOutlined, RiseOutlined, WarningOutlined, BulbOutlined, FileTextOutlined, CheckCircleOutlined, AimOutlined } from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { reportAPI } from '@/services/report';

echarts.use([BarChart, GridComponent, TooltipComponent, TitleComponent, CanvasRenderer]);

const { Text, Paragraph } = Typography;

const Report: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);

  const loadData = useCallback(async () => {
    if (!projectId) return; setLoading(true); setError(null);
    try {
      const res = await reportAPI.getReport(projectId);
      const data = (res as any).data !== undefined ? (res as any).data : res;
      setReport(data || null);
    } catch (e: any) { setError(e?.message || '加载失败'); } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { if (!projectId) { setLoading(false); return; } loadData(); }, [projectId]);

  const handleGenerate = async () => { setGenerating(true); try { await reportAPI.generateReport(projectId!); message.success('报告生成中'); setTimeout(() => { loadData(); setGenerating(false); }, 3000); } catch (e: any) { message.error(e?.message || '生成失败'); setGenerating(false); } };
  const handleExportPDF = async () => { try { await reportAPI.exportPDF(projectId!); message.success('PDF导出中'); } catch (e: any) { message.error(e?.message || '导出失败'); } };

  if (!projectId) return <div className="page-container"><PageHeader title="SEO报告" /><Empty description="请先选择一个项目" style={{ marginTop: 120 }} /></div>;
  if (loading) return <div className="page-container"><PageHeader title="SEO报告" /><Spin size="large" style={{ display: 'block', margin: '40vh auto' }} /></div>;
  if (error) return <div className="page-container"><PageHeader title="SEO报告" /><Alert type="error" message="加载失败" description={error} showIcon style={{ marginTop: 24 }} action={<Button size="small" onClick={loadData}>重试</Button>} /></div>;

  const overview = report?.overview || {};

  const scoreChartOption = report?.seoHealthScore ? {
    tooltip: { trigger: 'axis' }, xAxis: { type: 'category', data: ['SEO健康'] }, yAxis: { type: 'value', min: 0, max: 100 },
    series: [{ type: 'bar', data: [{ value: report.seoHealthScore, itemStyle: { color: report.seoHealthScore >= 80 ? '#52c41a' : '#faad14' } }], barWidth: 60 }],
  } : null;

  return (
    <div className="page-container">
      <PageHeader title="SEO 报告" subtitle="SEO 综合报告生成与导出"
        actions={[{ label: '刷新', icon: <ReloadOutlined />, onClick: loadData, loading }, { label: '生成报告', type: 'primary', icon: <ThunderboltOutlined />, onClick: handleGenerate, loading: generating }, { label: '导出PDF', icon: <FilePdfOutlined />, onClick: handleExportPDF }]} />
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="SEO健康分" value={report?.seoHealthScore || 0} suffix="/100" valueStyle={{ color: (report?.seoHealthScore || 0) >= 80 ? '#52c41a' : '#faad14' }} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="关键词" value={overview?.totalKeywords || 0} prefix={<AimOutlined />} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="页面数" value={overview?.totalPages || 0} prefix={<FileTextOutlined />} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="外链数" value={overview?.totalBacklinks || 0} prefix={<TrophyOutlined />} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="自然流量" value={overview?.organicTraffic || 0} prefix={<RiseOutlined />} /></Card></Col>
        <Col xs={12} sm={4}><Card size="small"><Statistic title="生成时间" value={report?.generatedAt ? new Date(report.generatedAt).toLocaleDateString('zh-CN') : '-'} /></Card></Col>
      </Row>
      {scoreChartOption && <Card style={{ marginBottom: 24 }}><ReactEChartsCore echarts={echarts} option={scoreChartOption} style={{ height: 200 }} /></Card>}
      {report?.topKeywords && report.topKeywords.length > 0 && (
        <Card title="热门关键词" style={{ marginBottom: 24 }}>
          <Table dataSource={report.topKeywords} rowKey={(r: any, i?: number) => r.keyword || i} columns={[
            { title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 200 },
            { title: '排名', dataIndex: 'position', key: 'position', width: 80, render: (p: number) => <Tag color={p <= 3 ? 'green' : p <= 10 ? 'blue' : 'orange'}>{p}</Tag> },
            { title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 100, render: (v: number) => v?.toLocaleString() || '-' },
          ]} pagination={{ pageSize: 10 }} size="small" />
        </Card>
      )}
      {report?.recommendations && report.recommendations.length > 0 && (
        <Card title={<><BulbOutlined /> 优化建议</>}>
          <List dataSource={report.recommendations} renderItem={(item: any, i: number) => (
            <List.Item><List.Item.Meta avatar={<Tag color="blue">{i + 1}</Tag>} title={item.title || item.recommendation} description={item.description || item.detail} /></List.Item>
          )} />
        </Card>
      )}
      {!report && <Empty description="暂无报告数据，点击「生成报告」创建" style={{ marginTop: 60 }} />}
    </div>
  );
};

export default Report;