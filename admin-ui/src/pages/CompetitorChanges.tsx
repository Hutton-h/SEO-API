import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Button, Tag, Typography, Space, Statistic,
  message, Alert, Spin, Empty,
} from 'antd';
import {
  ReloadOutlined, ThunderboltOutlined,
  SwapOutlined, EditOutlined, DeleteOutlined, PlusOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { competitorChangeAPI } from '@/services/competitorChange';
import dayjs from 'dayjs';

echarts.use([PieChart, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text } = Typography;

interface ChangeItem {
  id: string;
  competitorName: string;
  competitorUrl: string;
  pageUrl: string;
  field: string;
  oldValue: string;
  newValue: string;
  changeType: 'added' | 'modified' | 'removed';
  detectedAt: string;
  projectId: string;
}

const CompetitorChanges: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  const loadData = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await competitorChangeAPI.getChanges({ projectId });
      const result = (res as any).data || res;
      const data = Array.isArray(result) ? result : result.data || [];
      setChanges(data);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    loadData();
  };

  const handleDetect = async () => {
    if (!projectId) return;
    setDetecting(true);
    message.loading({ content: '正在检测竞品变更...', key: 'detect' });
    try {
      const res = await competitorChangeAPI.runDetection(projectId);
      const result = (res as any).data || res;
      const newChanges = Array.isArray(result) ? result : result.data || [];
      const count = newChanges.length;
      message.success({ content: `检测完成，发现 ${count} 处变更`, key: 'detect' });
      await loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '检测失败';
      message.error({ content: msg, key: 'detect' });
    } finally {
      setDetecting(false);
    }
  };

  const changeTypeConfig: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
    added: { color: '#52c41a', text: '新增', icon: <PlusOutlined /> },
    modified: { color: '#1677ff', text: '修改', icon: <EditOutlined /> },
    removed: { color: '#ff4d4f', text: '删除', icon: <DeleteOutlined /> },
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="竞品变更追踪"
          subtitle="实时监控竞品网站内容与结构变化"
        />
        <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="page-container">
        <PageHeader
          title="竞品变更追踪"
          subtitle="实时监控竞品网站内容与结构变化"
        />
        <Alert
          type="error"
          message="加载失败"
          description={error}
          showIcon
          action={
            <Button onClick={handleRefresh} size="small">
              重试
            </Button>
          }
        />
      </div>
    );
  }

  // ---- Empty state (no project selected) ----
  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader
          title="竞品变更追踪"
          subtitle="实时监控竞品网站内容与结构变化"
        />
        <Empty description="请先选择一个项目" />
      </div>
    );
  }

  const addedCount = changes.filter((c) => c.changeType === 'added').length;
  const modifiedCount = changes.filter((c) => c.changeType === 'modified').length;
  const removedCount = changes.filter((c) => c.changeType === 'removed').length;

  const pieData = [
    { name: '新增', value: addedCount, itemStyle: { color: '#52c41a' } },
    { name: '修改', value: modifiedCount, itemStyle: { color: '#1677ff' } },
    { name: '删除', value: removedCount, itemStyle: { color: '#ff4d4f' } },
  ];

  const pieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: '10%', top: 'center', itemGap: 16 },
    series: [{
      type: 'pie', radius: ['50%', '75%'], center: ['35%', '50%'],
      avoidLabelOverlap: false, itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 3 },
      label: { show: false }, emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: pieData,
    }],
  };

  const columns = [
    { title: '竞品', dataIndex: 'competitorName', key: 'competitorName', render: (text: string) => <Text strong>{text}</Text> },
    { title: '页面', dataIndex: 'pageUrl', key: 'pageUrl', ellipsis: true, render: (text: string) => <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{text}</Text> },
    { title: '字段', dataIndex: 'field', key: 'field', render: (text: string) => <Tag>{text}</Tag> },
    {
      title: '变更', key: 'change',
      render: (_: any, record: any) => (
        <Space direction="vertical" size={0}>
          <Text type="secondary" style={{ fontSize: 11, textDecoration: 'line-through', color: '#ff4d4f' }}>{record.oldValue || '(空)'}</Text>
          <Space size={4}>
            <SwapOutlined style={{ color: '#1677ff', fontSize: 12 }} />
            <Text style={{ color: '#52c41a', fontSize: 12 }}>{record.newValue || '(空)'}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: '类型', dataIndex: 'changeType', key: 'changeType',
      render: (type: string) => {
        const config = changeTypeConfig[type];
        return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
      },
    },
    { title: '检测时间', dataIndex: 'detectedAt', key: 'detectedAt', render: (date: string) => dayjs(date).format('MM-DD HH:mm'), sorter: (a: any, b: any) => dayjs(a.detectedAt).unix() - dayjs(b.detectedAt).unix() },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="竞品变更追踪"
        subtitle="实时监控竞品网站内容与结构变化"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          { label: '手动检测', type: 'primary', icon: <ThunderboltOutlined />, onClick: handleDetect, loading: detecting },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card><Statistic title="总变更数" value={changes.length} valueStyle={{ color: '#1677ff' }} prefix={<SwapOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="新增" value={addedCount} valueStyle={{ color: '#52c41a' }} prefix={<PlusOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="修改" value={modifiedCount} valueStyle={{ color: '#1677ff' }} prefix={<EditOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="删除" value={removedCount} valueStyle={{ color: '#ff4d4f' }} prefix={<DeleteOutlined />} /></Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title="变更列表" className="chart-card">
            {changes.length === 0 ? (
              <Empty description="暂无变更记录" />
            ) : (
              <Table columns={columns} dataSource={changes} rowKey="id" pagination={{ pageSize: 10 }} size="middle" scroll={{ x: 900 }} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="变更类型分布" className="chart-card">
            {changes.length === 0 ? (
              <Empty description="暂无变更数据" />
            ) : (
              <ReactEChartsCore echarts={echarts} option={pieOption} style={{ height: 350 }} notMerge />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CompetitorChanges;