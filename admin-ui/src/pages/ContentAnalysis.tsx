import React, { useState, useEffect } from "react";
import {
  Card, Row, Col, Input, Button, Typography, Space, Progress, Tag, Statistic,
  , Collapse, Divider, Empty, Badge, message, Descriptions, Spin, Alert,
} from "antd";
import {
  SearchOutlined, ReloadOutlined, TrophyOutlined, ReadOutlined,
  PercentageOutlined, NodeIndexOutlined, BuildOutlined, SmileOutlined,
  MehOutlined, FrownOutlined, BulbOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { GaugeChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import PageHeader from "@/components/PageHeader";
import { contentAPI } from "@/services/content";

echarts.use([GaugeChart, CanvasRenderer]);

const { Text, Title, Paragraph } = Typography;

const ContentAnalysis: React.FC = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await contentAPI.getAnalysisHistory();
      const data = (res as any).data || res;
      setHistory(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      // silently fail for history
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!url) { message.warning("请输入URL"); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await contentAPI.analyzeUrl(url);
      const data = (res as any).data || res;
      setResult(data.data || data);
      message.success("分析完成");
      loadHistory();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || "分析失败";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const gaugeOption = (value: number, name: string) => ({
    series: [{
      type: "gauge", radius: "85%", center: ["50%", "55%"],
      startAngle: 210, endAngle: -30, min: 0, max: 100,
      axisLine: { show: true, lineStyle: { width: 16, color: [[0.3, "#ff4d4f"], [0.6, "#faad14"], [1, "#52c41a"]] } },
      axisTick: { show: false }, splitLine: { show: false },
      axisLabel: { show: false },
      detail: { valueAnimation: true, fontSize: 24, fontWeight: "bold", offsetCenter: [0, "55%"], formatter: "{value}", color: "#333" },
      title: { offsetCenter: [0, "80%"], fontSize: 12, color: "#999" },
      data: [{ value, name }],
    }],
  });

  const priorityColor = { high: "#ff4d4f", medium: "#faad14", low: "#1677ff" };
  const priorityLabel = { high: "高", medium: "中", low: "低" };

  const handleRefresh = () => { setResult(null); setError(null); };

  return (
    <div className="page-container">
      <PageHeader
        title="内容分析"
        subtitle="AI 驱动的网页内容评估与优化"
        actions={[{ label: "刷新",: <ReloadOutlined />, onClick: handleRefresh, loading: false }]}
      />

      <Card style={{ margin: 24 }}>
        <Space.Compact style={{ width: "100%" }}>
          <Input
            size="large"
            placeholder="要分析的页面 URL，例如 https://example.com/blog/seo-guide"
            prefix={<SearchOutlined />}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPressEnter={handleAnalyze}
          />
          <Button type="primary" size="large" loading={loading} icon={<ThunderboltOutlined />} onClick={handleAnalyze}>
            分析
          </Button>
        </Space.Compact>
      </Card>

      {error && <Alert type="error" message="分析失败" description={error} showIcon style={{ margin: 24 }} />}
      {loading && <Spin size="large" style={{ display: "block", margin: "40vh auto" }} />}
      {!result && !loading && !error ? (
        <Empty description="请输入 URL 并点击分析按钮" style={{ padding: 60 }} />
      ) : result ? (
        <>
          <Row gutter={[16, 16]} style={{ margin: 24 }}>
            <Col xs={12} sm={6}>
              <Card><Statistic title="内容评分" value={result.qualityScore} suffix="/100" valueStyle={{ color: result.qualityScore >= 70 ? "#52c41a" : "#faad14" }} prefix={<TrophyOutlined />} /></Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card><Statistic title="可读性" value={result.readabilityScore} suffix="/100" valueStyle={{ color: "#1677ff" }} prefix={<ReadOutlined />} /></Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card><Statistic title="结构完整性" value={result.structureScore} suffix="/100" valueStyle={{ color: "#722ed1" }} prefix={<BuildOutlined />} /></Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card><Statistic title="实体覆盖" value={result.entityCoverage?.length || 0} suffix="个" valueStyle={{ color: "#13c2c2" }} prefix={<NodeIndexOutlined />} /></Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Card title="内容评分" className="chart-card">
                <ReactEChartsCore echarts={echarts} option={gaugeOption(result.qualityScore, "分")} style={{ height: 280 }} notMerge />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card title="可读性评分" className="chart-card">
                <ReactEChartsCore echarts={echarts} option={gaugeOption(result.readabilityScore, "可读性")} style={{ height: 280 }} notMerge />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card title="结构完整性" className="chart-card">
                <ReactEChartsCore echarts={echarts} option={gaugeOption(result.structureScore, "结构")} style={{ height: 280 }} notMerge />
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            <Col xs={24} md={12}>
              <Card title="关键词密度分析">
                {(result.keywordDensity || []).map((item: any) => (
                  <div key={item.keyword} style={{ margin: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", margin: 4 }}>
                      <Text strong>{item.keyword}</Text>
                      <Space>
                        <Text type="secondary">{item.count}次</Text>
                        <Tag color={item.density > 2.5 ? "orange" : item.density > 2 ? "blue" : "green"}>
                          {item.density}%
                        </Tag>
                      </Space>
                    </div>
                    <Progress
                      percent={item.density * 30}
                      showInfo={false}
                      strokeColor={item.density > 2.5 ? "#faad14" : item.density > 2 ? "#1677ff" : "#52c41a"}
                      size="small"
                    />
                  </div>
                ))}
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="NLP 实体识别">
                <List
                  dataSource={result.entityCoverage || []}
                  renderItem={(item: any) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<div style={{ width: 36, height: 36, borderRadius: 8, background: `${item.importance > 0.8 ? "#52c41a" : "#1677ff"}15`, display: "flex", alignItems: "center", justifyContent: "center", color: item.importance > 0.8 ? "#52c41a" : "#1677ff", fontWeight: "bold", fontSize: 12 }}>{item.importance?.toFixed(1)}</div>}
                        title={<Text strong>{item.name}</Text>}
                        description={<Tag>{item.type}</Tag>}
                      />
                    </List.Item>
                  )}
                  size="small"
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            <Col xs={24} md={12}>
              <Card title="情感分析">
                {result.sentiment && (
                  <>
                    <div style={{ margin: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", margin: 4 }}>
                        <Space><SmileOutlined style={{ color: "#52c41a" }} /><Text>正面</Text></Space>
                        <Text strong>{result.sentiment.positive}%</Text>
                      </div>
                      <Progress percent={result.sentiment.positive} strokeColor="#52c41a" size="small" />
                    </div>
                    <div style={{ margin: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", margin: 4 }}>
                        <Space><MehOutlined style={{ color: "#1677ff" }} /><Text>中性</Text></Space>
                        <Text strong>{result.sentiment.neutral}%</Text>
                      </div>
                      <Progress percent={result.sentiment.neutral} strokeColor="#1677ff" size="small" />
                    </div>
                    <div style={{ margin: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", margin: 4 }}>
                        <Space><FrownOutlined style={{ color: "#ff4d4f" }} /><Text>负面</Text></Space>
                        <Text strong>{result.sentiment.negative}%</Text>
                      </div>
                      <Progress percent={result.sentiment.negative} strokeColor="#ff4d4f" size="small" />
                    </div>
                    <Divider style={{ margin: "12px 0" }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      整体情感倾向: {result.sentiment.positive > 60 ? "积极正面" : result.sentiment.negative > 30 ? "偏负面" : "中性"}
                    </Text>
                  </>
                )}
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card
                title={<Space><BulbOutlined style={{ color: "#faad14" }} />AI 优化</Space>}
                extra={<Text type="secondary">{(result.suggestions || []).length} 条</Text>}
              >
                <List
                  dataSource={result.suggestions || []}
                  renderItem={(item: { title: string; description: string; priority: "high" | "medium" | "low" }) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <Tag color={priorityColor[item.priority]} style={{ marginRight: 0 }}>
                            {priorityLabel[item.priority]}优先
                          </Tag>
                        }
                        title={<Text>{item.title}</Text>}
                        description={<Text type="secondary">{item.description}</Text>}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </>
      ) : null}
    </div>
  );
};

export default ContentAnalysis;
