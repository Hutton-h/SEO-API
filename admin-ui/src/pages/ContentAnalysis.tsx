import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Button, Tag, Typography, Row, Col, Statistic, Space, message, Spin, Empty, Alert,
  Input, Form, Progress, Table, List, Divider, Descriptions, Tabs, Collapse,
} from 'antd';
import {
  ReloadOutlined, SearchOutlined, ThunderboltOutlined, FileTextOutlined,
  ReadOutlined, TagsOutlined, RobotOutlined, BulbOutlined, StarOutlined,
  GlobalOutlined, LinkOutlined, CheckCircleOutlined, WarningOutlined,
  CloseCircleOutlined, InfoCircleOutlined, HistoryOutlined, AimOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { contentAPI } from '@/services/content';

echarts.use([BarChart, PieChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, CanvasRenderer]);

const { Text, Paragraph, Title } = Typography;

const ContentAnalysis: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 分析
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('analyze');

  // 历史
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  // 质量评分
  const [qualityScore, setQualityScore] = useState<any>(null);

  const loadHistory = useCallback(async (p = 1) => {
    if (!projectId) return;
    setHistoryLoading(true);
    try {
      const res = await contentAPI.getAnalysisHistory({ page: p, pageSize: 10, projectId });
      const data = (res as any).data !== undefined ? (res as any).data : res;
      const arr = Array.isArray(data) ? data : (data?.data || data?.history || []);
      setHistory(arr);
      setHistoryTotal(data?.total || data?.pagination?.total || arr.length);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, [projectId]);

  const loadQualityScore = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await (contentAPI as any).getQualityScore?.(projectId);
      const data = (res as any).data !== undefined ? (res as any).data : res;
      setQualityScore(data || {});
    } catch {
      // silent
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    loadHistory();
    loadQualityScore();
  }, [projectId]);

  // 分析URL
  const handleAnalyze = async () => {
    if (!url.trim()) { message.warning('请输入要分析的页面URL'); return; }
    setAnalyzing(true);
    setResult(null);
    setError(null);
    try {
      const res = await contentAPI.analyzeUrl(url.trim(), projectId);
      const data = (res as any).data !== undefined ? (res as any).data : res;
      setResult(data);
      message.success('内容分析完成');
      loadHistory(); // 刷新历史
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '分析失败';
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  // 质量评分颜色
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  // 关键词密度图
  const densityChartOption = result?.keywordDensity ? {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: result.keywordDensity.slice(0, 15).map((k: any) => k.keyword || k.term) },
    yAxis: { type: 'value', name: '密度 %' },
    series: [{
      type: 'bar',
      data: result.keywordDensity.slice(0, 15).map((k: any) => ({
        value: parseFloat((k.density || k.percentage || 0).toFixed(2)),
        itemStyle: { color: (k.density || k.percentage || 0) > 3 ? '#ff4d4f' : '#1677ff' },
      })),
    }],
  } : null;

  // 情感分布图
  const sentimentChartOption = result?.sentiment ? {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      data: [
        { value: result.sentiment?.positive || 0, name: '正面', itemStyle: { color: '#52c41a' } },
        { value: result.sentiment?.neutral || 0, name: '中性', itemStyle: { color: '#1677ff' } },
        { value: result.sentiment?.negative || 0, name: '负面', itemStyle: { color: '#ff4d4f' } },
      ].filter((d) => d.value > 0),
    }],
  } : null;

  const historyColumns = [
    { title: 'URL', dataIndex: 'url', key: 'url', width: 300, ellipsis: true,
      render: (u: string) => <Text code style={{ fontSize: 11 }}>{u}</Text>,
    },
    { title: '质量评分', dataIndex: 'qualityScore', key: 'qualityScore', width: 120,
      render: (score: number) => (
        <Progress percent={score} size="small" strokeColor={getScoreColor(score)} format={() => `${score}分`} />
      ),
    },
    { title: '可读性', dataIndex: 'readabilityScore', key: 'readabilityScore', width: 100,
      render: (s: number) => <Tag color={s >= 70 ? 'green' : 'orange'}>{s || '-'}</Tag>,
    },
    { title: '分析时间', dataIndex: 'analyzedAt', key: 'analyzedAt', width: 160,
      render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-',
    },
    { title: '操作', key: 'action', width: 80,
      render: (_: any, record: any) => (
        <Button type="link" size="small" onClick={() => { setUrl(record.url); setActiveTab('analyze'); }}>
          分析
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader title="内容分析" subtitle="AI 驱动的页面内容质量分析与优化建议"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: () => { loadHistory(); loadQualityScore(); } },
        ]}
      />

      <Tabs activeKey={activeTab} onChange={setActiveTab} size="large"
        items={[
          {
            key: 'analyze',
            label: <span><SearchOutlined /> 内容分析</span>,
            children: (
              <>
                {/* 分析输入 */}
                <Card title={<><FileTextOutlined /> 页面内容分析</>} style={{ marginBottom: 24 }}>
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={18}>
                      <Input.Search
                        placeholder="输入要分析的页面 URL，如 https://example.com/blog/seo-guide"
                        prefix={<LinkOutlined />}
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onSearch={handleAnalyze}
                        enterButton={
                          <Button type="primary" icon={<ThunderboltOutlined />} loading={analyzing}>
                            开始分析
                          </Button>
                        }
                        size="large"
                        disabled={analyzing}
                      />
                    </Col>
                    <Col xs={24} md={6}>
                      <Text type="secondary">支持分析页面标题、描述、关键词密度、实体识别、情感分析、AI优化建议</Text>
                    </Col>
                  </Row>
                </Card>

                {/* 分析中 */}
                {analyzing && (
                  <Card style={{ marginBottom: 24, borderColor: '#1677ff' }}>
                    <Spin tip="正在分析页面内容，调用 AI 模型进行深度分析...">
                      <div style={{ padding: 40 }} />
                    </Spin>
                  </Card>
                )}

                {/* 错误 */}
                {error && (
                  <Alert type="error" message="分析失败" description={error} showIcon closable style={{ marginBottom: 24 }}
                    onClose={() => setError(null)} />
                )}

                {/* 分析结果 */}
                {result && (
                  <>
                    {/* 评分卡片 */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                      <Col xs={12} sm={6}>
                        <Card size="small">
                          <Statistic title="内容质量" value={result?.qualityScore || 0} suffix="/ 100"
                            valueStyle={{ color: getScoreColor(result?.qualityScore || 0) }} />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card size="small">
                          <Statistic title="可读性" value={result?.readabilityScore || 0} suffix="/ 100"
                            valueStyle={{ color: getScoreColor(result?.readabilityScore || 0) }} />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card size="small">
                          <Statistic title="结构完整性" value={result?.structureScore || 0} suffix="/ 100"
                            valueStyle={{ color: getScoreColor(result?.structureScore || 0) }} />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card size="small">
                          <Statistic title="实体覆盖" value={result?.entityCoverage?.length || 0} suffix="个"
                            prefix={<TagsOutlined />} />
                        </Card>
                      </Col>
                    </Row>

                    {/* 图表区 */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                      {densityChartOption && (
                        <Col xs={24} md={12}>
                          <Card title="关键词密度分析" size="small">
                            <ReactEChartsCore echarts={echarts} option={densityChartOption} style={{ height: 300 }} />
                          </Card>
                        </Col>
                      )}
                      {sentimentChartOption && (
                        <Col xs={24} md={12}>
                          <Card title="情感分析" size="small">
                            <ReactEChartsCore echarts={echarts} option={sentimentChartOption} style={{ height: 300 }} />
                          </Card>
                        </Col>
                      )}
                    </Row>

                    {/* 关键词密度表 */}
                    {result?.keywordDensity && result.keywordDensity.length > 0 && (
                      <Card title="关键词密度详情" size="small" style={{ marginBottom: 24 }}>
                        <Table
                          dataSource={result.keywordDensity}
                          rowKey={(r: any, i?: number) => `${r.keyword || r.term}-${i}`}
                          columns={[
                            { title: '关键词/短语', dataIndex: 'keyword', key: 'keyword',
                              render: (v: any, r: any) => <Text strong>{v || r.term}</Text>,
                            },
                            { title: '密度', dataIndex: 'density', key: 'density', width: 120,
                              render: (v: any, r: any) => {
                                const val = parseFloat((v || r.percentage || 0).toFixed(2));
                                return <Progress percent={val * 10} size="small" strokeColor={val > 3 ? '#ff4d4f' : '#1677ff'} format={() => `${val}%`} />;
                              },
                            },
                            { title: '出现次数', dataIndex: 'count', key: 'count', width: 80 },
                            { title: '状态', key: 'status', width: 80,
                              render: (_: any, r: any) => {
                                const val = parseFloat((r.density || r.percentage || 0).toFixed(2));
                                if (val > 5) return <Tag color="red">过度</Tag>;
                                if (val < 1) return <Tag color="orange">不足</Tag>;
                                return <Tag color="green">正常</Tag>;
                              },
                            },
                          ]}
                          size="small"
                          pagination={{ pageSize: 10 }}
                        />
                      </Card>
                    )}

                    {/* 实体识别 */}
                    {result?.entityCoverage && result.entityCoverage.length > 0 && (
                      <Card title={<><RobotOutlined /> NLP 实体识别</>} size="small" style={{ marginBottom: 24 }}>
                        <List
                          dataSource={result.entityCoverage}
                          renderItem={(item: any) => (
                            <List.Item>
                              <Space>
                                <Tag color="blue">{item.type || item.entity}</Tag>
                                <Text strong>{item.name || item.entity}</Text>
                                {item.importance !== undefined && (
                                  <Progress percent={item.importance * 100} size="small" style={{ width: 100 }} />
                                )}
                              </Space>
                            </List.Item>
                          )}
                        />
                      </Card>
                    )}

                    {/* AI 优化建议 */}
                    {result?.suggestions && result.suggestions.length > 0 && (
                      <Card title={<><BulbOutlined /> AI 优化建议</>} style={{ marginBottom: 24 }}>
                        <List
                          dataSource={result.suggestions}
                          renderItem={(item: any, i: number) => (
                            <List.Item>
                              <List.Item.Meta
                                avatar={
                                  <Tag color={item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'orange' : 'blue'}>
                                    {item.priority === 'high' ? '高优' : item.priority === 'medium' ? '中优' : '低优'}
                                  </Tag>
                                }
                                title={item.title || item.suggestion}
                                description={item.description || item.detail}
                              />
                            </List.Item>
                          )}
                        />
                      </Card>
                    )}
                  </>
                )}

                {!result && !analyzing && !error && (
                  <Empty description="输入页面URL，点击「开始分析」获取AI内容分析报告" style={{ marginTop: 60 }} />
                )}
              </>
            ),
          },
          {
            key: 'history',
            label: <span><HistoryOutlined /> 分析历史</span>,
            children: (
              <Card title="历史分析记录">
                <Table columns={historyColumns} dataSource={history} rowKey="id"
                  loading={historyLoading}
                  pagination={{
                    current: historyPage, pageSize: 10, total: historyTotal,
                    onChange: (p) => { setHistoryPage(p); loadHistory(p); },
                  }}
                  size="middle"
                />
              </Card>
            ),
          },
          {
            key: 'quality',
            label: <span><StarOutlined /> 质量概览</span>,
            children: (
              qualityScore ? (
                <Card title="内容质量总览">
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Statistic title="平均质量评分" value={qualityScore?.average || 0} suffix="/ 100"
                        valueStyle={{ color: getScoreColor(qualityScore?.average || 0) }} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="已分析页面" value={qualityScore?.totalPages || 0} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="需优化页面" value={qualityScore?.needsOptimization || 0}
                        valueStyle={{ color: '#ff4d4f' }} />
                    </Col>
                  </Row>
                </Card>
              ) : (
                <Empty description="暂无质量数据" style={{ marginTop: 60 }} />
              )
            ),
          },
        ]}
      />
    </div>
  );
};

export default ContentAnalysis;