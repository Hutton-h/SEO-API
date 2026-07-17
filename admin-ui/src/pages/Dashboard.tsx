import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Tag, Progress, Typography, Space, Badge, Button, Spin, Empty, Alert } from 'antd';
import {
  ProjectOutlined,
  KeyOutlined,
  FileTextOutlined,
  HeartOutlined,
  ReloadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  RightOutlined,
  BellOutlined,
  DollarOutlined,
  CloudServerOutlined,
  ReadOutlined,
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
import { useStore } from '@/store';
import { projectAPI } from '@/services/project';
import { keywordAPI } from '@/services/keyword';
import { crawlAPI } from '@/services/crawl';
import { apiUsageAPI } from '@/services/apiUsage';
import { monitorAPI } from '@/services/monitor';
import { alertingAPI } from '@/services/alerting';
import { contentAPI } from '@/services/content';
import { rankingAPI } from '@/services/ranking';
import { scheduleAPI } from '@/services/schedule';
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

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [projectCount, setProjectCount] = useState(0);
  const [keywordCount, setKeywordCount] = useState(0);
  const [pagesCrawled, setPagesCrawled] = useState(0);
  const [seoHealthScore, setSeoHealthScore] = useState(0);
  const [alertSummary, setAlertSummary] = useState({ unacknowledged: 0, critical: 0 });
  const [apiCost, setApiCost] = useState({ monthlyCost: 0, change: 0 });
  const [sla, setSla] = useState({ uptime: 0 });
  const [contentScore, setContentScore] = useState({ average: 0 });
  const [rankingTrend, setRankingTrend] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [issueDistribution, setIssueDistribution] = useState<any[]>([]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        projectAPI.getProjects(),
        keywordAPI.getKeywords ? keywordAPI.getKeywords(projectId!) : Promise.resolve({ data: [] }),
        crawlAPI.getPages(projectId!),
        crawlAPI.getAllIssues ? crawlAPI.getAllIssues(projectId!) : Promise.resolve({ data: [] }),
        apiUsageAPI.getStats ? apiUsageAPI.getStats(projectId!) : Promise.resolve({ data: {} }),
        monitorAPI.getSLAInfo ? monitorAPI.getSLAInfo(projectId!) : Promise.resolve({ data: {} }),
        alertingAPI.getAlertSummary ? alertingAPI.getAlertSummary(projectId!) : Promise.resolve({ data: {} }),
        contentAPI.getAnalysisHistory ? contentAPI.getAnalysisHistory(projectId!) : Promise.resolve({ data: [] }),
        rankingAPI.getRankings ? rankingAPI.getRankings(projectId!) : Promise.resolve({ data: { trend: [] } }),
        scheduleAPI.getTasks ? scheduleAPI.getTasks(projectId!) : Promise.resolve({ data: [] }),
      ]);

      const extractData = (result: PromiseSettledResult<any>, defaultValue: any = null) => {
        if (result.status === 'fulfilled') {
          const res = result.value;
          const d = (res as any).data !== undefined ? (res as any).data : res;
          return d;
        }
        return defaultValue;
      };

      // Projects
      const projectsData = extractData(results[0], []);
      const projects = Array.isArray(projectsData) ? projectsData : (projectsData?.data || projectsData?.projects || []);
      setProjectCount(Array.isArray(projects) ? projects.length : 0);

      // Keywords
      const keywordsData = extractData(results[1], []);
      const keywords = Array.isArray(keywordsData) ? keywordsData : (keywordsData?.data || keywordsData?.keywords || []);
      setKeywordCount(Array.isArray(keywords) ? keywords.length : 0);

      // Pages crawled
      const pagesData = extractData(results[2], []);
      const pages = Array.isArray(pagesData) ? pagesData : (pagesData?.data || pagesData?.pages || []);
      setPagesCrawled(Array.isArray(pages) ? pages.length : 0);

      // Issues for SEO health score and distribution
      const issuesData = extractData(results[3], []);
      const issues = Array.isArray(issuesData) ? issuesData : (issuesData?.data || issuesData?.issues || []);
      if (Array.isArray(issues) && issues.length > 0) {
        const totalPages = Array.isArray(pages) ? pages.length : 1;
        const totalIssues = issues.length;
        const score = Math.max(0, Math.round(100 - (totalIssues / Math.max(totalPages, 1)) * 20));
        setSeoHealthScore(Math.min(100, score));

        const critical = issues.filter((i: any) => i.severity === 'critical').length;
        const major = issues.filter((i: any) => i.severity === 'major').length;
        const minor = issues.filter((i: any) => i.severity === 'minor').length;
        const info = issues.filter((i: any) => i.severity === 'info').length;
        setIssueDistribution([
          { name: '严重', value: critical, color: '#ff4d4f' },
          { name: '重要', value: major, color: '#faad14' },
          { name: '次要', value: minor, color: '#1677ff' },
          { name: '提示', value: info, color: '#52c41a' },
        ]);
      }

      // API usage
      const apiUsageData = extractData(results[4], {});
      const cost = (apiUsageData as any)?.monthlyCost ?? (apiUsageData as any)?.cost ?? 0;
      const change = (apiUsageData as any)?.change ?? (apiUsageData as any)?.monthlyChange ?? 0;
      setApiCost({ monthlyCost: cost, change });

      // SLA
      const slaData = extractData(results[5], {});
      setSla({ uptime: (slaData as any)?.uptime ?? (slaData as any)?.availability ?? 99.9 });

      // Alert summary
      const alertData = extractData(results[6], {});
      setAlertSummary({
        unacknowledged: (alertData as any)?.unacknowledged ?? (alertData as any)?.pending ?? 0,
        critical: (alertData as any)?.critical ?? 0,
      });

      // Content score
      const contentData = extractData(results[7], []);
      const analyses = Array.isArray(contentData) ? contentData : (contentData?.data || contentData?.analyses || []);
      if (Array.isArray(analyses) && analyses.length > 0) {
        const avg = analyses.reduce((acc: number, item: any) => acc + (item.score || item.quality || 0), 0) / analyses.length;
        setContentScore({ average: Math.round(avg) });
      }

      // Ranking trend
      const rankingData = extractData(results[8], {});
      const trend = (rankingData as any)?.trend ?? (rankingData as any)?.rankingHistory ?? [];
      setRankingTrend(Array.isArray(trend) ? trend : []);

      // Recent tasks
      const tasksData = extractData(results[9], []);
      const tasks = Array.isArray(tasksData) ? tasksData : (tasksData?.data || tasksData?.tasks || []);
      setRecentTasks(Array.isArray(tasks) ? tasks.slice(0, 5) : []);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载数据失败';
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
    loadAllData();
  }, [projectId]);

  const handleRefresh = () => {
    loadAllData();
  };

  // ---- 空状态 / 加载状态 / 错误状态 ----
  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="仪表盘" subtitle="SEO 运营数据总览" />
        <Empty description="请先选择一个项目" style={{ marginTop: 120 }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="仪表盘" subtitle="SEO 运营数据总览" />
        <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <PageHeader title="仪表盘" subtitle="SEO 运营数据总览" />
        <Alert
          type="error"
          message="加载失败"
          description={error}
          showIcon
          style={{ marginTop: 24 }}
          action={
            <Button size="small" onClick={handleRefresh}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  // ---- 图表配置 ----
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
      data: rankingTrend.map((d: any) => (d.date || d.month || '').slice(-5)),
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
        data: rankingTrend.map((d: any) => d.avgPosition ?? d.averagePosition ?? 0),
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
        data: rankingTrend.map((d: any) => d.top10 ?? d.top10Count ?? 0),
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
        data: issueDistribution.map((item) => ({
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
      render: (pages: number) => (pages ?? 0).toLocaleString(),
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

      {/* 主统计卡片 */}
      <div className="dashboard-stats">
        <StatCard
          title="项目总数"
          value={projectCount}
          icon={<ProjectOutlined />}
          color="#1677ff"
          trend={8}
          onClick={() => navigate('/projects')}
        />
        <StatCard
          title="关键词总数"
          value={keywordCount.toLocaleString()}
          icon={<KeyOutlined />}
          color="#52c41a"
          trend={12}
          onClick={() => navigate('/keywords')}
        />
        <StatCard
          title="爬取页面数"
          value={pagesCrawled.toLocaleString()}
          icon={<FileTextOutlined />}
          color="#722ed1"
          trend={15}
          onClick={() => navigate('/crawl-audit')}
        />
        <StatCard
          title="SEO 健康分"
          value={seoHealthScore}
          suffix="分"
          icon={<HeartOutlined />}
          color="#fa8c16"
          trend={5}
        />
      </div>

      {/* 告警/API/SLA/内容质量卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card
            hoverable
            style={{ borderTop: '3px solid #ff4d4f', cursor: 'pointer' }}
            onClick={() => navigate('/alerting')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>未处理告警</Text>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#ff4d4f' }}>
                  {alertSummary.unacknowledged}
                  <Text type="secondary" style={{ fontSize: 13, marginLeft: 4 }}>条</Text>
                </div>
                {alertSummary.critical > 0 && (
                  <Badge status="error" text={`${alertSummary.critical} 条严重`} style={{ fontSize: 12 }} />
                )}
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#ff4d4f15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BellOutlined style={{ fontSize: 22, color: '#ff4d4f' }} />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            hoverable
            style={{ borderTop: '3px solid #52c41a', cursor: 'pointer' }}
            onClick={() => navigate('/api-usage')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>API 费用 (本月)</Text>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#52c41a' }}>
                  ${apiCost.monthlyCost.toLocaleString()}
                </div>
                <Text style={{ fontSize: 12, color: apiCost.change >= 0 ? '#ff4d4f' : '#52c41a' }}>
                  {apiCost.change >= 0 ? '+' : ''}{apiCost.change}% vs 上月
                </Text>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#52c41a15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarOutlined style={{ fontSize: 22, color: '#52c41a' }} />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            hoverable
            style={{ borderTop: '3px solid #1677ff', cursor: 'pointer' }}
            onClick={() => navigate('/monitor')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>SLA 可用率</Text>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1677ff' }}>
                  {sla.uptime}%
                </div>
                <Text style={{ fontSize: 12, color: '#52c41a' }}>正常运行</Text>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#1677ff15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CloudServerOutlined style={{ fontSize: 22, color: '#1677ff' }} />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            hoverable
            style={{ borderTop: '3px solid #fa8c16', cursor: 'pointer' }}
            onClick={() => navigate('/content-analysis')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>内容质量 (平均分)</Text>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#fa8c16' }}>
                  {contentScore.average}
                  <Text type="secondary" style={{ fontSize: 13, marginLeft: 4 }}>/100</Text>
                </div>
                <Text style={{ fontSize: 12, color: '#52c41a' }}>良好</Text>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fa8c1615', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ReadOutlined style={{ fontSize: 22, color: '#fa8c16' }} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

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
          dataSource={recentTasks}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default Dashboard;