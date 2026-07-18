import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Statistic, Typography, Button, Space, Tag, Table, Spin, Empty, Alert,
  Tooltip, Progress,
} from 'antd';
import {
  ArrowUpOutlined, ArrowDownOutlined, PlusOutlined, ProjectOutlined,
  KeyOutlined, RiseOutlined, BugOutlined, TeamOutlined, ReloadOutlined,
  ReadOutlined, LinkOutlined, FileTextOutlined, RightOutlined, DashboardOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store';
import { projectAPI } from '@/services/project';
import { keywordAPI } from '@/services/keywords';
import { rankingAPI } from '@/services/rankings';
import { crawlAPI } from '@/services/crawl';
import { competitorAPI } from '@/services/competitor';
import PageHeader from '@/components/PageHeader';

const { Text, Title, Paragraph } = Typography;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { projects, currentProject, setCurrentProject, setProjects } = useStore();
  const projectId = currentProject?.id;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 仪表盘数据
  const [keywords, setKeywords] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [crawlIssues, setCrawlIssues] = useState<any>(null);
  const [competitors, setCompetitors] = useState<any[]>([]);

  // 加载项目列表
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await projectAPI.getProjects();
        const d = (res as any).data || res;
        const list = Array.isArray(d) ? d : (d?.data || []);
        setProjects(list);
        if (!currentProject && list.length > 0) {
          setCurrentProject(list[0]);
        }
      } catch {}
    };
    if (projects.length === 0) loadProjects();
  }, []);

  // 加载仪表盘数据
  useEffect(() => {
    if (!projectId) return;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.allSettled([
          keywordAPI.getKeywords(projectId, { pageSize: 5 }),
          rankingAPI.getRankings(projectId, { pageSize: 5 }),
          crawlAPI.getAllIssues(projectId).catch(() => null),
          competitorAPI.getOverview(projectId).catch(() => []),
        ]);

        const kwRes = results[0].status === 'fulfilled' ? results[0].value : null;
        const rkRes = results[1].status === 'fulfilled' ? results[1].value : null;
        const crawlRes = results[2].status === 'fulfilled' ? results[2].value : null;
        const compRes = results[3].status === 'fulfilled' ? results[3].value : [];

        const kwData = kwRes ? ((kwRes as any).data || kwRes) : null;
        const rkData = rkRes ? ((rkRes as any).data || rkRes) : null;
        const crawlData = crawlRes ? ((crawlRes as any).data || crawlRes) : null;
        const compData = compRes ? ((compRes as any).data || compRes) : [];

        setKeywords(Array.isArray(kwData) ? kwData : (kwData?.data || kwData?.items || []));
        setRankings(Array.isArray(rkData) ? rkData : (rkData?.data || rkData?.items || []));
        setCrawlIssues(crawlData);
        setCompetitors(Array.isArray(compData) ? compData : (compData?.data || []));
      } catch (err: any) {
        setError(err?.message || '加载失败');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [projectId]);

  // 快捷操作卡片
  const quickActions = [
    { title: '关键词管理', desc: '添加和追踪关键词', icon: <KeyOutlined />, path: '/keywords', color: '#1677ff' },
    { title: '排名追踪', desc: '查看搜索排名变化', icon: <RiseOutlined />, path: '/rankings', color: '#52c41a' },
    { title: '网站审计', desc: '扫描网站 SEO 问题', icon: <BugOutlined />, path: '/crawl-audit', color: '#fa8c16' },
    { title: '竞品分析', desc: '监控竞争对手动态', icon: <TeamOutlined />, path: '/competitors', color: '#722ed1' },
    { title: '内容优化', desc: '分析和优化内容', icon: <ReadOutlined />, path: '/content-analysis', color: '#eb2f96' },
    { title: '外链分析', desc: '查看外链质量', icon: <LinkOutlined />, path: '/backlinks', color: '#13c2c2' },
    { title: 'SEO 报告', desc: '生成专业报告', icon: <FileTextOutlined />, path: '/report', color: '#faad14' },
    { title: '项目管理', desc: '管理你的 SEO 项目', icon: <ProjectOutlined />, path: '/projects', color: '#2f54eb' },
  ];

  // 无项目时的欢迎页
  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="仪表盘" subtitle="欢迎使用 Crane SEO Platform" />

        <div style={{ textAlign: 'center', padding: '60px 0 40px' }}>
          <DashboardOutlined style={{ fontSize: 64, color: '#d9d9d9', marginBottom: 24 }} />
          <Title level={3}>开始你的 SEO 优化之旅</Title>
          <Paragraph type="secondary" style={{ maxWidth: 500, margin: '0 auto 32px' }}>
            选择一个项目或创建新项目，开始追踪关键词排名、审计网站、分析竞争对手
          </Paragraph>

          {projects.length > 0 ? (
            <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'left' }}>
              <Title level={5} style={{ marginBottom: 16 }}>选择项目</Title>
              <Row gutter={[16, 16]}>
                {projects.map((p) => (
                  <Col xs={24} sm={12} key={p.id}>
                    <Card
                      hoverable
                      onClick={() => { setCurrentProject(p); }}
                      size="small"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong style={{ fontSize: 15 }}>{p.name}</Text>
                          <br />
                          <Text type="secondary">{p.domain}</Text>
                        </div>
                        <Tag color={p.status === 'active' ? 'green' : 'orange'}>
                          {p.status === 'active' ? '运行中' : p.status === 'paused' ? '已暂停' : '已归档'}
                        </Tag>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          ) : (
            <div>
              <Empty description="还没有项目" style={{ marginBottom: 24 }} />
              <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => navigate('/projects')}>
                创建第一个项目
              </Button>
            </div>
          )}
        </div>

        {/* 快捷操作 */}
        <div style={{ maxWidth: 900, margin: '40px auto 0' }}>
          <Title level={5} style={{ marginBottom: 16 }}>快速导航</Title>
          <Row gutter={[16, 16]}>
            {quickActions.map((action) => (
              <Col xs={12} sm={8} md={6} key={action.path}>
                <Card
                  hoverable
                  onClick={() => navigate(action.path)}
                  size="small"
                  style={{ textAlign: 'center' }}
                >
                  <div style={{ fontSize: 28, color: action.color, marginBottom: 8 }}>
                    {action.icon}
                  </div>
                  <Text strong>{action.title}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>{action.desc}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>
    );
  }

  // 有项目时的仪表盘
  const stats = {
    keywordCount: keywords.length,
    top10Count: rankings.filter((r: any) => (r.currentRank || r.position || 999) <= 10).length,
    issuesCount: crawlIssues?.totalIssues || crawlIssues?.issues?.length || 0,
    competitorCount: competitors.length,
    healthScore: crawlIssues?.healthScore || crawlIssues?.score || 85,
    avgRank: rankings.length > 0
      ? Math.round(rankings.reduce((s: number, r: any) => s + (r.currentRank || r.position || 50), 0) / rankings.length)
      : 0,
  };

  const keywordColumns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', ellipsis: true, render: (t: string) => <Text strong>{t}</Text> },
    {
      title: '搜索量', dataIndex: 'searchVolume', key: 'searchVolume', width: 80,
      render: (v: number) => (v ?? 0).toLocaleString(),
    },
    {
      title: '排名', dataIndex: 'currentRank', key: 'currentRank', width: 70,
      render: (v: number, r: any) => {
        const rank = v || r.position || 0;
        if (!rank) return <Tag>未收录</Tag>;
        return <Tag color={rank <= 3 ? 'green' : rank <= 10 ? 'blue' : 'orange'}>#{rank}</Tag>;
      },
    },
    {
      title: '趋势', dataIndex: 'trend', key: 'trend', width: 60,
      render: (t: string) => {
        if (t === 'up') return <ArrowUpOutlined style={{ color: '#52c41a' }} />;
        if (t === 'down') return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />;
        return <span style={{ color: '#999' }}>—</span>;
      },
    },
  ];

  const rankingColumns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', ellipsis: true },
    {
      title: '当前排名', dataIndex: 'currentRank', key: 'currentRank', width: 80,
      render: (v: number, r: any) => {
        const rank = v || r.position || 0;
        if (!rank) return <Tag>未收录</Tag>;
        return <Tag color={rank <= 3 ? 'green' : rank <= 10 ? 'blue' : 'orange'}>#{rank}</Tag>;
      },
    },
    {
      title: '变化', key: 'change', width: 60,
      render: (_: any, r: any) => {
        const change = r.change || (r.currentRank - r.previousRank) || 0;
        if (change > 0) return <Text type="danger"><ArrowDownOutlined /> {change}</Text>;
        if (change < 0) return <Text type="success"><ArrowUpOutlined /> {Math.abs(change)}</Text>;
        return <Text type="secondary">—</Text>;
      },
    },
    { title: 'URL', dataIndex: 'url', key: 'url', ellipsis: true, width: 150, render: (v: string) => v ? <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> : '-' },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="仪表盘"
        subtitle={`项目: ${currentProject.name} (${currentProject.domain})`}
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: () => window.location.reload(), loading },
        ]}
      />

      {error && (
        <Alert type="warning" message="部分数据加载失败" description={error} showIcon closable style={{ marginBottom: 16 }} />
      )}

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={4}>
          <Card hoverable onClick={() => navigate('/keywords')}>
            <Statistic title="关键词" value={stats.keywordCount} prefix={<KeyOutlined />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card hoverable onClick={() => navigate('/rankings')}>
            <Statistic title="TOP 10" value={stats.top10Count} prefix={<RiseOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card hoverable onClick={() => navigate('/crawl-audit')}>
            <Statistic title="SEO 问题" value={stats.issuesCount} prefix={<BugOutlined />} valueStyle={{ color: stats.issuesCount > 0 ? '#ff4d4f' : '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card hoverable onClick={() => navigate('/competitors')}>
            <Statistic title="竞品数" value={stats.competitorCount} prefix={<TeamOutlined />} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title="健康分"
              value={stats.healthScore}
              suffix="/100"
              valueStyle={{ color: stats.healthScore >= 80 ? '#52c41a' : stats.healthScore >= 60 ? '#faad14' : '#ff4d4f' }}
            />
            <Progress percent={stats.healthScore} size="small" showInfo={false} strokeColor={stats.healthScore >= 80 ? '#52c41a' : '#faad14'} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic title="平均排名" value={stats.avgRank || '—'} prefix={<RiseOutlined />} valueStyle={{ color: stats.avgRank <= 10 ? '#52c41a' : '#faad14' }} />
          </Card>
        </Col>
      </Row>

      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          {/* 关键词概览 */}
          <Col xs={24} lg={12}>
            <Card
              title="关键词概览"
              extra={<Button type="link" size="small" onClick={() => navigate('/keywords')}>查看全部 <RightOutlined /></Button>}
            >
              {keywords.length > 0 ? (
                <Table columns={keywordColumns} dataSource={keywords.slice(0, 5)} rowKey="id" size="small" pagination={false} />
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Empty description="还没有关键词" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                    <Button type="primary" onClick={() => navigate('/keywords')}>添加关键词</Button>
                  </Empty>
                </div>
              )}
            </Card>
          </Col>

          {/* 排名追踪 */}
          <Col xs={24} lg={12}>
            <Card
              title="最新排名"
              extra={<Button type="link" size="small" onClick={() => navigate('/rankings')}>查看全部 <RightOutlined /></Button>}
            >
              {rankings.length > 0 ? (
                <Table columns={rankingColumns} dataSource={rankings.slice(0, 5)} rowKey="id" size="small" pagination={false} />
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Empty description="还没有排名数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
              )}
            </Card>
          </Col>

          {/* 网站审计 */}
          <Col xs={24} lg={12}>
            <Card
              title="网站审计"
              extra={<Button type="link" size="small" onClick={() => navigate('/crawl-audit')}>查看详情 <RightOutlined /></Button>}
            >
              {crawlIssues ? (
                <div style={{ padding: 8 }}>
                  <Row gutter={[16, 16]}>
                    <Col span={8}><Statistic title="页面数" value={crawlIssues.totalPages || crawlIssues.pagesCount || 0} /></Col>
                    <Col span={8}><Statistic title="错误" value={crawlIssues.errors || crawlIssues.errorCount || 0} valueStyle={{ color: '#ff4d4f' }} /></Col>
                    <Col span={8}><Statistic title="警告" value={crawlIssues.warnings || crawlIssues.warningCount || 0} valueStyle={{ color: '#faad14' }} /></Col>
                  </Row>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Empty description="还没有审计数据" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                    <Button type="primary" onClick={() => navigate('/crawl-audit')}>开始审计</Button>
                  </Empty>
                </div>
              )}
            </Card>
          </Col>

          {/* 竞品概览 */}
          <Col xs={24} lg={12}>
            <Card
              title="竞品概览"
              extra={<Button type="link" size="small" onClick={() => navigate('/competitors')}>查看全部 <RightOutlined /></Button>}
            >
              {competitors.length > 0 ? (
                <div>
                  {competitors.map((c: any) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div>
                        <Text strong>{c.name || c.domain || c.url}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{c.domain || c.url}</Text>
                      </div>
                      <Space>
                        <Tag>{c.keywordCount || c.overlapCount || 0} 个共同关键词</Tag>
                      </Space>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Empty description="还没有添加竞品" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                    <Button type="primary" onClick={() => navigate('/competitors')}>添加竞品</Button>
                  </Empty>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default Dashboard;