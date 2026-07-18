import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Table, Progress, Typography, Space, Statistic, Button, Input, Spin, Empty, Alert, Modal, Form, message,
} from 'antd';
import {
  SearchOutlined, RiseOutlined, ReloadOutlined, CheckCircleOutlined,
  GlobalOutlined, VideoCameraOutlined, PictureOutlined, StarOutlined,
  ReadOutlined, EnvironmentOutlined, ThunderboltOutlined, PlusOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { serpFeaturesAPI } from '@/services/serpFeatures';

echarts.use([PieChart, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text } = Typography;

const featureConfig = [
  { key: 'featuredSnippet', name: 'Featured Snippet', icon: <StarOutlined />, color: '#1677ff', description: '精选摘要' },
  { key: 'knowledgeGraph', name: 'Knowledge Graph', icon: <GlobalOutlined />, color: '#52c41a', description: '知识图谱' },
  { key: 'peopleAlsoAsk', name: 'People Also Ask', icon: <SearchOutlined />, color: '#fa8c16', description: '用户还问' },
  { key: 'videoCarousel', name: 'Video Carousel', icon: <VideoCameraOutlined />, color: '#eb2f96', description: '视频轮播' },
  { key: 'localPack', name: 'Local Pack', icon: <EnvironmentOutlined />, color: '#722ed1', description: '本地包' },
  { key: 'imagePack', name: 'Image Pack', icon: <PictureOutlined />, color: '#13c2c2', description: '图片包' },
  { key: 'topStories', name: 'Top Stories', icon: <ThunderboltOutlined />, color: '#faad14', description: '头条新闻' },
  { key: 'siteLinks', name: 'Sitelinks', icon: <RiseOutlined />, color: '#2f54eb', description: '站点链接' },
  { key: 'reviewStars', name: 'Review Stars', icon: <StarOutlined />, color: '#f5222d', description: '评价星级' },
];

interface FeatureStat {
  key: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  count: number;
  percentage: number;
}

interface KeywordItem {
  keyword: string;
  [key: string]: any;
}

const SerpFeatures: React.FC = () => {
  const projectId = useStore(s => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<FeatureStat[]>([]);
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [totalKeywords, setTotalKeywords] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await serpFeaturesAPI.getFeatureStats(projectId!);
      const result = (res as any).data || res;
      const data = result.data || result;
      if (data) {
        setTotalKeywords(data.totalKeywords || 0);
        const featureStats = featureConfig.map((f) => {
          const found = (data.features || []).find((item: any) => item.key === f.key);
          return {
            ...f,
            count: found?.count || 0,
            percentage: found?.percentage || 0,
          };
        });
        setStats(featureStats);
      }
      const detailsRes = await serpFeaturesAPI.getFeatureDetails(projectId!, '');
      const detailsResult = (detailsRes as any).data || detailsRes;
      const keywordData = Array.isArray(detailsResult) ? detailsResult : detailsResult.data || [];
      setKeywords(keywordData);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => { loadData(); };

  const handleAddKeyword = () => {
    addForm.resetFields();
    setAddModalVisible(true);
  };

  const handleAddSubmit = async (values: { keyword: string }) => {
    if (!projectId) return;
    setSubmitting(true);
    try {
      await serpFeaturesAPI.addKeyword(projectId, values.keyword);
      message.success('关键词添加成功');
      setAddModalVisible(false);
      addForm.resetFields();
      await loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '添加失败';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!projectId) return <Empty description="请先选择一个项目" />;
  if (loading) return <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />;
  if (error) return <Alert type="error" message="加载失败" description={error} showIcon />;

  const filteredKeywords = keywords.filter((k) =>
    k.keyword.toLowerCase().includes(searchText.toLowerCase())
  );

  const pieData = stats.map((f) => ({ name: f.name, value: f.count, itemStyle: { color: f.color } }));

  const pieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: '5%', top: 'center', itemGap: 12, textStyle: { fontSize: 12 } },
    series: [{
      type: 'pie', radius: ['45%', '75%'], center: ['35%', '50%'],
      avoidLabelOverlap: false, itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: false }, emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: pieData,
    }],
  };

  const featureTableColumns = [
    {
      title: '特性名称', dataIndex: 'name', key: 'name',
      render: (text: string, record: any) => (
        <Space>
          <span style={{ color: record.color }}>{record.icon}</span>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>({record.description})</Text>
        </Space>
      ),
    },
    { title: '出现次数', dataIndex: 'count', key: 'count', render: (v: number) => <Text strong>{v.toLocaleString()}</Text>, sorter: (a: any, b: any) => a.count - b.count },
    {
      title: '出现率', dataIndex: 'percentage', key: 'percentage',
      render: (pct: number, record: any) => (
        <Progress
          percent={pct}
          strokeColor={record.color}
          size="small"
          format={(p) => `${p}%`}
          style={{ minWidth: 120 }}
        />
      ),
      sorter: (a: any, b: any) => a.percentage - b.percentage,
    },
  ];

  const keywordColumns = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword', render: (text: string) => <Text strong>{text}</Text>, filteredValue: searchText ? [searchText] : null, onFilter: (value: any, record: any) => record.keyword.includes(value) },
    ...featureConfig.map((f) => ({
      title: f.name,
      dataIndex: f.key,
      key: f.key,
      width: 100,
      render: (val: boolean) => val ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} /> : <Text type="secondary">-</Text>,
    })),
  ];

  const avgFeaturesPerKeyword = keywords.length > 0
    ? (keywords.reduce((sum, k) => sum + featureConfig.filter((f) => k[f.key]).length, 0) / keywords.length)
    : 0;

  const topFeature = stats.length > 0
    ? stats.reduce((max, f) => (f.count > max.count ? f : max), stats[0])
    : null;

  return (
    <div className="page-container">
      <PageHeader
        title="SERP 特性分析"
        subtitle="分析关键词在搜索结果中的特性展示分布"
        actions={[
          { label: '添加关键词', icon: <PlusOutlined />, onClick: handleAddKeyword },
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
        ]}
      />

      <Row gutter={[16, 16]} style={{ margin: 24 }}>
        <Col xs={12} sm={6}>
          <Card><Statistic title="关键词总数" value={totalKeywords} valueStyle={{ color: '#1677ff' }} prefix={<SearchOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="SERP 特性种类" value={featureConfig.length} valueStyle={{ color: '#52c41a' }} prefix={<GlobalOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="平均特性数/词" value={avgFeaturesPerKeyword} precision={1} valueStyle={{ color: '#fa8c16' }} prefix={<RiseOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="覆盖率最高" value={topFeature?.name || '-'} valueStyle={{ color: '#1677ff', fontSize: 16 }} prefix={<StarOutlined />} /></Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card title="特性出现率统计" className="chart-card">
            <Table
              columns={featureTableColumns}
              dataSource={stats}
              rowKey="key"
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="特性类型分布" className="chart-card">
            <ReactEChartsCore echarts={echarts} option={pieOption} style={{ height: 380 }} notMerge />
          </Card>
        </Col>
      </Row>

      <Card
        title="关键词 SERP 特性详情"
        style={{ marginTop: 24 }}
        extra={
          <Input
            placeholder="搜索关键词"
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
          />
        }
      >
        <Table
          columns={keywordColumns}
          dataSource={filteredKeywords}
          rowKey="keyword"
          pagination={{ pageSize: 10 }}
          size="middle"
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title="添加 SERP 关键词"
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" onFinish={handleAddSubmit}>
          <Form.Item
            name="keyword"
            label="关键词"
            rules={[{ required: true, message: '请输入关键词' }]}
          >
            <Input placeholder="请输入关键词" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                提交
              </Button>
              <Button onClick={() => setAddModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SerpFeatures;
