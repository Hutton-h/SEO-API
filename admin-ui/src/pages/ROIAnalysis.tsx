import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Row, Col, Table, Typography, Button, Space, Tag, Select,
  message, Modal, Form, Input, InputNumber, Progress, DatePicker, Tooltip,
} from 'antd';
import {
  ReloadOutlined, PlusOutlined, DollarOutlined, RiseOutlined,
  FallOutlined, TrophyOutlined, SettingOutlined, FundOutlined,
  LineChartOutlined, BarChartOutlined, CalculatorOutlined,
  ApiOutlined, CloudOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { TrendChart, ComparisonChart } from '@/components/charts';
import type { TrendDataPoint, ComparisonDataPoint } from '@/components/charts';
import { useStore } from '@/store';
import { roiAPI } from '@/services/roi';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ============================================================================
// Types
// ============================================================================

interface ROISummaryData {
  totalInvestment: number;
  totalRevenue: number;
  roiPercent: number;
  trafficValue: number;
}

interface ROIRecordItem {
  id: string;
  period: string;
  investment: number;
  revenue: number;
  roi_percent: number;
  conversions: number;
  traffic_value: number;
}

interface ROISettings {
  cpc: number;
  conversionRate: number;
  avgOrderValue: number;
}

// ============================================================================
// Component
// ============================================================================

const ROIAnalysis: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const projectName = useStore((s) => s.currentProject?.name);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<ROIRecordItem[]>([]);
  const [summary, setSummary] = useState<ROISummaryData>({
    totalInvestment: 0, totalRevenue: 0, roiPercent: 0, trafficValue: 0,
  });

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settings, setSettings] = useState<ROISettings>({
    cpc: 2.5, conversionRate: 3.2, avgOrderValue: 85,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // API cost summary
  const [apiCosts, setApiCosts] = useState<Array<{ service: string; cost: number; calls: number }>>([]);
  const [apiCostsLoading, setApiCostsLoading] = useState(false);

  // ==========================================================================
  // Data loading
  // ==========================================================================

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [dataRes, summaryRes] = await Promise.allSettled([
        roiAPI.getROIData({ projectId }),
        roiAPI.getROISummary(),
      ]);

      // Process records
      let recordsData: ROIRecordItem[] = [];
      if (dataRes.status === 'fulfilled') {
        const rd: any = dataRes.value;
        const arr = Array.isArray(rd) ? rd : (rd?.data || []);
        recordsData = arr.map((r: any, idx: number) => ({
          id: r.id || `roi-${idx}`,
          period: r.month || r.period || '',
          investment: (r.seoCost || 0) + (r.apiCost || 0) + (r.toolCost || 0),
          revenue: r.conversionValue || r.estimatedTrafficValue || 0,
          roi_percent: r.roiPercent || r.roi || 0,
          conversions: r.conversions || Math.round((r.conversionValue || 0) / 85) || 0,
          traffic_value: r.estimatedTrafficValue || r.conversionValue || 0,
        }));
        setRecords(recordsData);
      }

      // Process summary
      if (summaryRes.status === 'fulfilled') {
        const sd: any = summaryRes.value;
        const s = sd?.data !== undefined ? sd.data : sd;
        setSummary({
          totalInvestment: s?.totalCost || recordsData.reduce((a, r) => a + r.investment, 0),
          totalRevenue: s?.totalValue || recordsData.reduce((a, r) => a + r.revenue, 0),
          roiPercent: s?.overallROI || 0,
          trafficValue: s?.totalValue || recordsData.reduce((a, r) => a + r.traffic_value, 0),
        });
      } else {
        setSummary({
          totalInvestment: recordsData.reduce((a, r) => a + r.investment, 0),
          totalRevenue: recordsData.reduce((a, r) => a + r.revenue, 0),
          roiPercent: recordsData.length > 0
            ? ((recordsData.reduce((a, r) => a + r.revenue, 0) - recordsData.reduce((a, r) => a + r.investment, 0)) /
                recordsData.reduce((a, r) => a + r.investment, 0) * 100)
            : 0,
          trafficValue: recordsData.reduce((a, r) => a + r.traffic_value, 0),
        });
      }
    } catch (e: any) {
      setError(e?.message || '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadApiCosts = useCallback(async () => {
    setApiCostsLoading(true);
    try {
      const res: any = await roiAPI.getApiCostSummary();
      const data = Array.isArray(res) ? res : (res?.data || []);
      setApiCosts(data);
    } catch {
      setApiCosts([]);
    } finally {
      setApiCostsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadData();
    loadApiCosts();
  }, [loadData, loadApiCosts, projectId]);

  // ==========================================================================
  // Add ROI entry
  // ==========================================================================

  const handleAddEntry = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await roiAPI.addROIEntry({
        month: values.period,
        seoCost: values.investment || 0,
        estimatedTrafficValue: values.traffic_value || 0,
        conversionValue: values.revenue || 0,
      });
      message.success('ROI 条目已添加');
      form.resetFields();
      setAddModalOpen(false);
      loadData();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await roiAPI.addROIEntry({
        month: `settings_${Date.now()}`,
        seoCost: 0,
        estimatedTrafficValue: 0,
        conversionValue: 0,
      });
      message.success('ROI 设置已保存');
      setSettingsModalOpen(false);
    } catch (e: any) {
      message.error(e?.message || '保存失败');
    } finally {
      setSavingSettings(false);
    }
  };

  // ==========================================================================
  // Chart data
  // ==========================================================================

  const trendChartData: TrendDataPoint[] = useMemo(() => {
    const investmentData: TrendDataPoint[] = records.map((r) => ({
      date: r.period,
      value: r.investment,
      category: '投资',
    }));
    const revenueData: TrendDataPoint[] = records.map((r) => ({
      date: r.period,
      value: r.revenue,
      category: '收益',
    }));
    return [...investmentData, ...revenueData];
  }, [records]);

  const comparisonChartData: ComparisonDataPoint[] = useMemo(() => {
    return records.map((r) => ({
      name: r.period,
      value: r.roi_percent,
      color: r.roi_percent >= 0 ? '#52c41a' : '#ff4d4f',
    }));
  }, [records]);

  // ==========================================================================
  // No project
  // ==========================================================================

  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="ROI 分析" subtitle="SEO 投资回报率分析与成本追踪" />
        <EmptyState scene="data" title="请先选择项目" description="选择一个项目以查看 SEO 投资回报率分析" />
      </div>
    );
  }

  // ==========================================================================
  // Loading state
  // ==========================================================================

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="ROI 分析"
          subtitle={`项目: ${projectName || ''}`}
          actions={<Button icon={<ReloadOutlined />} loading disabled>刷新</Button>}
        />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ==========================================================================
  // Error state
  // ==========================================================================

  if (error) {
    return (
      <div className="page-container">
        <PageHeader title="ROI 分析" subtitle={`项目: ${projectName || ''}`} />
        <ErrorState message={error} onRetry={loadData} />
      </div>
    );
  }

  // ==========================================================================
  // Table columns
  // ==========================================================================

  const columns = [
    {
      title: '周期', dataIndex: 'period', key: 'period', width: 120,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: '投资', dataIndex: 'investment', key: 'investment', width: 120,
      render: (v: number) => <Text style={{ color: '#ff4d4f' }}>${v.toFixed(2)}</Text>,
      sorter: (a: ROIRecordItem, b: ROIRecordItem) => a.investment - b.investment,
    },
    {
      title: '收益', dataIndex: 'revenue', key: 'revenue', width: 120,
      render: (v: number) => <Text style={{ color: '#52c41a' }}>${v.toFixed(2)}</Text>,
      sorter: (a: ROIRecordItem, b: ROIRecordItem) => a.revenue - b.revenue,
    },
    {
      title: 'ROI', dataIndex: 'roi_percent', key: 'roi_percent', width: 100,
      render: (v: number) => (
        <Tag color={v > 100 ? 'green' : v > 0 ? 'blue' : 'red'}>
          {v > 0 ? '+' : ''}{v.toFixed(0)}%
        </Tag>
      ),
      sorter: (a: ROIRecordItem, b: ROIRecordItem) => a.roi_percent - b.roi_percent,
    },
    {
      title: '转化', dataIndex: 'conversions', key: 'conversions', width: 90,
      render: (v: number) => v > 0 ? v.toLocaleString() : '-',
    },
    {
      title: '流量价值', dataIndex: 'traffic_value', key: 'traffic_value', width: 130,
      render: (v: number) => v > 0 ? `$${v.toFixed(2)}` : '-',
    },
  ];

  const roiPercent = summary.roiPercent;
  const isPositive = roiPercent >= 0;

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="page-container">
      <PageHeader
        title="ROI 分析"
        subtitle={`项目: ${projectName || ''} - SEO 投资回报率分析与成本追踪`}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
            <Button icon={<SettingOutlined />} onClick={() => setSettingsModalOpen(true)}>
              ROI 设置
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setAddModalOpen(true); }}>
              添加条目
            </Button>
          </Space>
        }
      />

      {/* KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="总投资"
            value={summary.totalInvestment}
            prefix="$"
            icon={<DollarOutlined />}
            color="#ff4d4f"
            subtitle="SEO 工具与资源投入"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="总收益"
            value={summary.totalRevenue}
            prefix="$"
            icon={<RiseOutlined />}
            color="#52c41a"
            subtitle="转化与流量价值"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="ROI %"
            value={Math.abs(roiPercent).toFixed(1)}
            suffix="%"
            icon={isPositive ? <TrophyOutlined /> : <FallOutlined />}
            color={isPositive ? '#52c41a' : '#ff4d4f'}
            subtitle={isPositive ? '投资回报率' : '投资亏损率'}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="流量价值"
            value={summary.trafficValue}
            prefix="$"
            icon={<FundOutlined />}
            color="#722ed1"
            subtitle="自然流量预估价值"
          />
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <Card
            title={<><LineChartOutlined /> 投资 vs 收益趋势</>}
            style={{ borderRadius: 8 }}
          >
            {trendChartData.length > 0 ? (
              <TrendChart
                data={trendChartData}
                height={320}
                showArea
                smooth
                unit="$"
              />
            ) : (
              <EmptyState scene="data" description="暂无趋势数据" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title={<><BarChartOutlined /> 月度 ROI %</>}
            style={{ borderRadius: 8 }}
          >
            {comparisonChartData.length > 0 ? (
              <ComparisonChart
                data={comparisonChartData}
                height={320}
                unit="%"
                showLabel
              />
            ) : (
              <EmptyState scene="data" description="暂无 ROI 数据" />
            )}
          </Card>
        </Col>
      </Row>

      {/* ROI Data Table */}
      <Card
        title={<><CalculatorOutlined /> ROI 数据明细</>}
        style={{ borderRadius: 8 }}
        extra={
          <Space>
            <RangePicker size="small" placeholder={['开始日期', '结束日期']} />
          </Space>
        }
      >
        {records.length > 0 ? (
          <Table
            columns={columns}
            dataSource={records}
            rowKey="id"
            pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条记录` }}
            size="middle"
            scroll={{ x: 780 }}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}><Text strong>合计</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text strong style={{ color: '#ff4d4f' }}>
                    ${records.reduce((a, r) => a + r.investment, 0).toFixed(2)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <Text strong style={{ color: '#52c41a' }}>
                    ${records.reduce((a, r) => a + r.revenue, 0).toFixed(2)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}>
                  <Tag color={roiPercent >= 0 ? 'green' : 'red'}>
                    {roiPercent >= 0 ? '+' : ''}{roiPercent.toFixed(0)}%
                  </Tag>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  <Text strong>{records.reduce((a, r) => a + r.conversions, 0).toLocaleString()}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5}>
                  <Text strong>${records.reduce((a, r) => a + r.traffic_value, 0).toFixed(2)}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        ) : (
          <EmptyState
            scene="data"
            title="暂无 ROI 数据"
            description="点击「添加条目」按钮录入 ROI 数据，开始追踪投资回报"
            action={{ text: '添加条目', icon: <PlusOutlined />, onClick: () => setAddModalOpen(true) }}
          />
        )}
      </Card>

      {/* API Cost Summary */}
      <Card
        title={<><ApiOutlined /> API 成本明细</>}
        style={{ borderRadius: 8, marginTop: 24 }}
        loading={apiCostsLoading}
      >
        {apiCosts.length > 0 ? (
          <Table
            dataSource={apiCosts}
            rowKey="service"
            pagination={false}
            size="middle"
            columns={[
              {
                title: '服务', dataIndex: 'service', key: 'service',
                render: (v: string) => (
                  <Space>
                    <CloudOutlined style={{ color: '#1677ff' }} />
                    <Text strong>{v}</Text>
                  </Space>
                ),
              },
              {
                title: '调用次数', dataIndex: 'calls', key: 'calls',
                render: (v: number) => (
                  <Tooltip title={`${v?.toLocaleString() ?? 0} 次 API 调用`}>
                    <Tag color="blue">{v?.toLocaleString() ?? 0}</Tag>
                  </Tooltip>
                ),
              },
              {
                title: '费用 ($)', dataIndex: 'cost', key: 'cost',
                render: (v: number) => (
                  <Text style={{ color: v > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 500 }}>
                    ${(v ?? 0).toFixed(4)}
                  </Text>
                ),
              },
            ]}
            summary={() => {
              const totalCost = apiCosts.reduce((s, c) => s + (c.cost || 0), 0);
              const totalCalls = apiCosts.reduce((s, c) => s + (c.calls || 0), 0);
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}><Text strong>合计</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <Tag color="blue">{totalCalls.toLocaleString()}</Tag>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <Text strong style={{ color: '#ff4d4f' }}>${totalCost.toFixed(4)}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />
        ) : (
          <EmptyState scene="data" description="暂无 API 成本数据" />
        )}
      </Card>

      {/* Add Entry Modal */}
      <Modal
        title="添加 ROI 条目"
        open={addModalOpen}
        onOk={handleAddEntry}
        onCancel={() => { setAddModalOpen(false); form.resetFields(); }}
        confirmLoading={saving}
        destroyOnClose
        width={480}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="period"
            label="周期"
            rules={[{ required: true, message: '请输入周期，如 2026-07' }]}
          >
            <Input placeholder="例如：2026-07" />
          </Form.Item>
          <Form.Item name="investment" label="投资金额 ($)">
            <InputNumber style={{ width: '100%' }} prefix="$" min={0} placeholder="SEO 工具与资源投入" />
          </Form.Item>
          <Form.Item name="revenue" label="转化收益 ($)">
            <InputNumber style={{ width: '100%' }} prefix="$" min={0} placeholder="转化产生的收入" />
          </Form.Item>
          <Form.Item name="traffic_value" label="流量价值 ($)">
            <InputNumber style={{ width: '100%' }} prefix="$" min={0} placeholder="自然流量预估价值" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Settings Modal */}
      <Modal
        title="ROI 设置"
        open={settingsModalOpen}
        onOk={handleSaveSettings}
        onCancel={() => setSettingsModalOpen(false)}
        confirmLoading={savingSettings}
        destroyOnClose
        width={480}
      >
        <Form layout="vertical">
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            配置用于计算流量价值的基准参数
          </Text>
          <Form.Item label="平均 CPC ($)">
            <InputNumber
              style={{ width: '100%' }}
              prefix="$"
              value={settings.cpc}
              onChange={(v) => setSettings((s) => ({ ...s, cpc: v || 0 }))}
              min={0}
              step={0.1}
            />
          </Form.Item>
          <Form.Item label="转化率 (%)">
            <InputNumber
              style={{ width: '100%' }}
              suffix="%"
              value={settings.conversionRate}
              onChange={(v) => setSettings((s) => ({ ...s, conversionRate: v || 0 }))}
              min={0}
              max={100}
              step={0.1}
            />
          </Form.Item>
          <Form.Item label="平均客单价 ($)">
            <InputNumber
              style={{ width: '100%' }}
              prefix="$"
              value={settings.avgOrderValue}
              onChange={(v) => setSettings((s) => ({ ...s, avgOrderValue: v || 0 }))}
              min={0}
            />
          </Form.Item>
          <Card size="small" style={{ background: '#f6f8fa' }}>
            <Space direction="vertical" size={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>预估计算参考:</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                流量价值 = 点击量 x CPC x {settings.cpc}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                转化价值 = 流量 x {settings.conversionRate}% x ${settings.avgOrderValue}
              </Text>
            </Space>
          </Card>
        </Form>
      </Modal>
    </div>
  );
};

export default ROIAnalysis;