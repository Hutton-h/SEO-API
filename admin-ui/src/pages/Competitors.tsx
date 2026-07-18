import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Typography, Row, Col, Statistic, Button, Modal, Form, Input, Space, Progress, message, Popconfirm, Empty, Spin, Alert, Tabs, Tooltip, Select,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ReloadOutlined, TeamOutlined, TrophyOutlined,
  RiseOutlined, GlobalOutlined, SearchOutlined, ThunderboltOutlined, SwapOutlined,
  BulbOutlined, AimOutlined, HistoryOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart, RadarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent, RadarComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useStore } from '@/store';
import { competitorAPI } from '@/services/competitor';
import { competitorChangeAPI } from '@/services/competitorChange';
import PageHeader from '@/components/PageHeader';

echarts.use([BarChart, RadarChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, RadarComponent, CanvasRenderer]);

const { Text, Paragraph } = Typography;

const Competitors: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const [competitors, setCompetitors] = useState<any[]>([]);
  const [keywordOverlap, setKeywordOverlap] = useState<any[]>([]);
  const [changes, setChanges] = useState<any[]>([]);
  const [changesTotal, setChangesTotal] = useState(0);
  const [changesPage, setChangesPage] = useState(1);
  const [changeDistribution, setChangeDistribution] = useState<any[]>([]);

  // 添加竞品
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [adding, setAdding] = useState(false);
  const [detecting, setDetecting] = useState(false);

  // 筛选
  const [changeTypeFilter, setChangeTypeFilter] = useState<string | undefined>();
  const [changeDaysFilter, setChangeDaysFilter] = useState<number>(30);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        competitorAPI.getOverview(projectId),
        competitorAPI.getKeywordOverlap(projectId),
        competitorChangeAPI.getChanges({ projectId, page: changesPage, pageSize: 10, days: changeDaysFilter, changeType: changeTypeFilter }),
        competitorChangeAPI.getChangeDistribution(projectId),
      ]);

      const extractArr = (result: PromiseSettledResult<any>): any[] => {
        if (result.status === 'fulfilled') {
          const data = (result.value as any).data !== undefined ? (result.value as any).data : result.value;
          return Array.isArray(data) ? data : (data?.data || []);
        }
        return [];
      };

      setCompetitors(extractArr(results[0]));
      setKeywordOverlap(extractArr(results[1]));

      if (results[2].status === 'fulfilled') {
        const chData = (results[2].value as any).data !== undefined ? (results[2].value as any).data : results[2].value;
        setChanges(Array.isArray(chData) ? chData : (chData?.data || chData?.changes || []));
        setChangesTotal(chData?.total || chData?.pagination?.total || 0);
      }

      if (results[3].status === 'fulfilled') {
        const distData = (results[3].value as any).data !== undefined ? (results[3].value as any).data : results[3].value;
        setChangeDistribution(Array.isArray(distData) ? distData : (distData?.data || []));
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, changesPage, changeTypeFilter, changeDaysFilter]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadData();
  }, [projectId]);

  // 添加竞品
  const handleAddCompetitor = async () => {
    try {
      const values = await form.validateFields();
      setAdding(true);
      await competitorAPI.addCompetitor(projectId!, values);
      message.success('竞品添加成功');
      form.resetFields();
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.error?.message || '添加失败');
    } finally {
      setAdding(false);
    }
  };

  // 移除竞品
  const handleRemoveCompetitor = async (competitorId: string) => {
    try {
      await competitorAPI.removeCompetitor(projectId!, competitorId);
      message.success('竞品已移除');
      loadData();
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || '移除失败');
    }
  };

  // 触发变更检测
  const handleDetect = async () => {
    setDetecting(true);
    try {
      await competitorChangeAPI.runDetection(projectId!);
      message.success('变更检测已启动');
      setTimeout(() => { loadData(); setDetecting(false); }, 3000);
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || '检测失败');
      setDetecting(false);
    }
  };

  // ====== 空/加载/错误 ======
  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="竞品分析" subtitle="竞争对手监控、关键词重叠分析与变更检测" />
        <Empty description="请先选择一个项目" style={{ marginTop: 120 }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="竞品分析" subtitle="竞争对手监控、关键词重叠分析与变更检测" />
        <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <PageHeader title="竞品分析" subtitle="竞争对手监控、关键词重叠分析与变更检测" />
        <Alert type="error" message="加载失败" description={error} showIcon style={{ marginTop: 24 }}
          action={<Button size="small" onClick={loadData}>重试</Button>} />
      </div>
    );
  }

  // 竞品对比雷达图
  const radarOption = competitors.length > 0 ? {
    tooltip: {},
    legend: { data: ['我们'].concat(competitors.map((c: any) => c.name || c.domain)), bottom: 0 },
    radar: {
      indicator: [
        { name: '关键词数', max: Math.max(...competitors.map((c: any) => c.keywords || 0), 100) },
        { name: '流量', max: Math.max(...competitors.map((c: any) => c.traffic || 0), 1000) },
        { name: 'DA', max: 100 },
        { name: '平均排名', max: 100 },
        { name: '外链数', max: Math.max(...competitors.map((c: any) => c.backlinks || 0), 100) },
      ],
    },
    series: [{
      type: 'radar',
      data: [
        { value: [50, 500, 40, 30, 200], name: '我们', itemStyle: { color: '#1677ff' } },
        ...competitors.map((c: any, i: number) => ({
          value: [c.keywords || 0, c.traffic || 0, c.domainAuthority || 0, c.avgPosition || 50, c.backlinks || 0],
          name: c.name || c.domain,
        })),
      ],
    }],
  } : null;

  // 关键词重叠柱状图
  const overlapChartOption = keywordOverlap.length > 0 ? {
    tooltip: { trigger: 'axis' },
    legend: { data: ['我们', ...(competitors.map((c: any) => c.name || c.domain))], bottom: 0 },
    xAxis: { type: 'category', data: keywordOverlap.slice(0, 10).map((k: any) => k.keyword) },
    yAxis: { type: 'value', name: '排名', inverse: true },
    series: [
      { name: '我们', type: 'bar', data: keywordOverlap.slice(0, 10).map((k: any) => k.ourRank), itemStyle: { color: '#1677ff' } },
      ...competitors.slice(0, 4).map((c: any, i: number) => ({
        name: c.name || c.domain,
        type: 'bar',
        data: keywordOverlap.slice(0, 10).map((k: any) => k[`comp${String.fromCharCode(65 + i)}Rank`] || 0),
      })),
    ],
  } : null;

  const competitorColumns = [
    { title: '竞品', dataIndex: 'name', key: 'name', width: 150,
      render: (name: string, record: any) => (
        <Space>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{record.domain}</Text>
        </Space>
      ),
    },
    { title: '关键词', dataIndex: 'keywords', key: 'keywords', width: 90, sorter: (a: any, b: any) => (a.keywords || 0) - (b.keywords || 0) },
    { title: '预估流量', dataIndex: 'traffic', key: 'traffic', width: 100,
      render: (t: number) => t ? t.toLocaleString() : '-',
    },
    { title: 'DA', dataIndex: 'domainAuthority', key: 'domainAuthority', width: 80,
      render: (da: number) => {
        const color = da >= 50 ? '#52c41a' : da >= 30 ? '#faad14' : '#ff4d4f';
        return <Tag color={color}>{da || '-'}</Tag>;
      },
    },
    { title: '平均排名', dataIndex: 'avgPosition', key: 'avgPosition', width: 100,
      render: (pos: number) => pos ? <Tag color={pos <= 10 ? 'green' : 'orange'}>{pos.toFixed(1)}</Tag> : '-',
    },
    { title: '外链', dataIndex: 'backlinks', key: 'backlinks', width: 80 },
    { title: '操作', key: 'action', width: 80,
      render: (_: any, record: any) => (
        <Popconfirm title="确认移除该竞品？" onConfirm={() => handleRemoveCompetitor(record.id)}>
          <Button type="link" danger size="small" icon={<DeleteOutlined />}>移除</Button>
        </Popconfirm>
      ),
    },
  ];

  const changeColumns = [
    { title: '竞品', dataIndex: 'competitorName', key: 'competitorName', width: 120 },
    { title: '页面', dataIndex: 'pageUrl', key: 'pageUrl', width: 200, ellipsis: true,
      render: (url: string) => <Text code style={{ fontSize: 11 }}>{url}</Text>,
    },
    { title: '变更类型', dataIndex: 'changeType', key: 'changeType', width: 100,
      render: (t: string) => {
        const labels: Record<string, string> = { title: 'Title', meta: 'Meta', h1: 'H1', structure: '结构', content: '内容', new_page: '新页面', removed_page: '删除' };
        return <Tag>{labels[t] || t}</Tag>;
      },
    },
    { title: '变更字段', dataIndex: 'field', key: 'field', width: 100 },
    { title: '旧值', dataIndex: 'oldValue', key: 'oldValue', width: 150, ellipsis: true,
      render: (v: string) => <Text type="secondary" delete>{v || '-'}</Text>,
    },
    { title: '新值', dataIndex: 'newValue', key: 'newValue', width: 150, ellipsis: true,
      render: (v: string) => <Text style={{ color: '#52c41a' }}>{v || '-'}</Text>,
    },
    { title: '检测时间', dataIndex: 'detectedAt', key: 'detectedAt', width: 150,
      render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-',
    },
  ];

  return (
    <div className="page-container">
      <PageHeader title="竞品分析" subtitle="竞争对手监控、关键词重叠分析与变更检测"
        actions={[
          { label: '刷新数据', icon: <ReloadOutlined />, onClick: loadData, loading },
          { label: '添加竞品', type: 'primary', icon: <PlusOutlined />, onClick: () => setModalOpen(true) },
        ]}
      />

      {/* 统计概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="竞品数量" value={competitors.length} prefix={<TeamOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="重叠关键词" value={keywordOverlap.length} prefix={<AimOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="竞品变更" value={changesTotal} prefix={<SwapOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="变更类型" value={changeDistribution.length} prefix={<BulbOutlined />} /></Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab} size="large"
        items={[
          {
            key: 'overview',
            label: <span><TrophyOutlined /> 竞品概览</span>,
            children: (
              <>
                <Card title="竞品列表" style={{ marginBottom: 24 }}
                  extra={
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                      添加竞品
                    </Button>
                  }
                >
                  <Table columns={competitorColumns} dataSource={competitors} rowKey="id"
                    pagination={{ pageSize: 10 }} size="middle"
                  />
                </Card>

                {radarOption && (
                  <Card title="竞品能力对比" style={{ marginBottom: 24 }}>
                    <ReactEChartsCore echarts={echarts} option={radarOption} style={{ height: 350 }} />
                  </Card>
                )}

                {overlapChartOption && (
                  <Card title="关键词重叠分析">
                    <ReactEChartsCore echarts={echarts} option={overlapChartOption} style={{ height: 350 }} />
                    <Table
                      dataSource={keywordOverlap}
                      rowKey={(r: any) => r.keyword}
                      columns={[
                        { title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 200 },
                        { title: '我们', dataIndex: 'ourRank', key: 'ourRank', width: 80,
                          render: (r: number) => <Tag color={r <= 3 ? 'green' : r <= 10 ? 'blue' : 'orange'}>{r}</Tag>,
                        },
                        ...competitors.slice(0, 4).map((c: any, i: number) => ({
                          title: c.name || c.domain,
                          dataIndex: `comp${String.fromCharCode(65 + i)}Rank`,
                          key: `comp${String.fromCharCode(65 + i)}Rank`,
                          width: 80,
                          render: (r: number) => <Tag>{r || '-'}</Tag>,
                        })),
                      ]}
                      pagination={{ pageSize: 10 }}
                      size="small"
                      style={{ marginTop: 16 }}
                    />
                  </Card>
                )}
              </>
            ),
          },
          {
            key: 'changes',
            label: <span><SwapOutlined /> 变更检测</span>,
            children: (
              <>
                <Card title="竞品变更检测" style={{ marginBottom: 24 }}
                  extra={
                    <Space>
                      <Select placeholder="变更类型" allowClear style={{ width: 120 }}
                        value={changeTypeFilter}
                        onChange={(v) => { setChangeTypeFilter(v); loadData(); }}
                        options={[
                          { value: 'title', label: 'Title' },
                          { value: 'meta', label: 'Meta' },
                          { value: 'h1', label: 'H1' },
                          { value: 'structure', label: '结构' },
                          { value: 'content', label: '内容' },
                          { value: 'new_page', label: '新页面' },
                          { value: 'removed_page', label: '删除' },
                        ]}
                      />
                      <Select value={changeDaysFilter} style={{ width: 100 }}
                        onChange={(v) => { setChangeDaysFilter(v); loadData(); }}
                        options={[
                          { value: 7, label: '最近7天' },
                          { value: 30, label: '最近30天' },
                          { value: 90, label: '最近90天' },
                        ]}
                      />
                      <Button icon={<ThunderboltOutlined />} onClick={handleDetect} loading={detecting}>
                        立即检测
                      </Button>
                    </Space>
                  }
                >
                  <Table columns={changeColumns} dataSource={changes} rowKey="id"
                    pagination={{ current: changesPage, pageSize: 10, total: changesTotal,
                      onChange: (p) => { setChangesPage(p); loadData(); },
                    }}
                    scroll={{ x: 900 }} size="middle"
                  />
                </Card>

                {changeDistribution.length > 0 && (
                  <Card title="变更类型分布">
                    <Row gutter={[16, 16]}>
                      {changeDistribution.map((item: any, i: number) => (
                        <Col xs={12} sm={4} key={i}>
                          <Card size="small">
                            <Statistic title={item.type || item.name} value={item.count || item.value} />
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </Card>
                )}
              </>
            ),
          },
        ]}
      />

      {/* 添加竞品 Modal */}
      <Modal title="添加竞品" open={modalOpen} onOk={handleAddCompetitor}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={adding} destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="domain" label="竞品域名" rules={[{ required: true, message: '请输入竞品域名' }]}>
            <Input placeholder="例如 competitor.com" prefix={<GlobalOutlined />} />
          </Form.Item>
          <Form.Item name="name" label="竞品名称" rules={[{ required: true, message: '请输入竞品名称' }]}>
            <Input placeholder="例如 Competitor Inc." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Competitors;