import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Input, Button, Typography, Space, Progress, Tag, Statistic,
  Descriptions, Divider, Empty, message, Spin, Alert, List,
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, TrophyOutlined, ReadOutlined,
  PercentageOutlined, NodeIndexOutlined, BuildOutlined, SmileOutlined,
  MehOutlined, FrownOutlined, BulbOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { GaugeChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { domainHealthAPI } from '@/services/domainHealth';

echarts.use([GaugeChart, CanvasRenderer]);

const { Text, Title, Paragraph } = Typography;

const DomainHealth: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await domainHealthAPI.getHealthHistory(domain);
      const data = (res as any).data || res;
      setHistory(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      // silently fail for history
    }
  };

  const handleCheck = async () => {
    if (!domain) { message.warning('请输入域名');; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await domainHealthAPI.checkDomain(domain);
      const data = (res as any).data || res;
      setResult(data.data || data);
      message.success('检测完成');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '检测失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => { setResult(null); setError(null); };

  const gaugeOption = (value: number, name: string, color: string) => ({
    series: [{
      type: 'gauge', radius: '85%', center: ['50%', '55%'],
      startAngle: 210, endAngle: -30, min: 0, max: 100,
      axisLine: { show: true, lineStyle: { width: 16, color: [[0.3, '#ff4d4f'], [0.6, '#faad14'], [1, color]] } },
      axisTick: { show: false }, splitLine: { show: false },
      axisLabel: { show: false },
      detail: { valueAnimation: true, fontSize: 24, fontWeight: 'bold', offsetCenter: [0, '55%'], formatter: '{value}', color: '#333' },
      title: { offsetCenter: [0, '80%'], fontSize: 12, color: '#999' },
      data: [{ value, name }],
    }],
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      'good': { color: '#52c41a', text: '良好' },
      'warning': { color: '#faad14', text: '警告' },
      'error': { color: '#ff4d4f', text: '错误' },
      'unknown': { color: '#999', text: '未知' },
    };
    const info = statusMap[status.toLowerCase()] || statusMap['unknown'];
    return <Badge color={info.color} text={info.text} />;
  };

  return (
    <div className="page-container">
      <PageHeader
        title="域名健康检查"
        subtitle="检测域名的 SEO 健康状态与技术指标"
        actions={[{ label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading: false }]}
      />

      <Card style={{ margin: 24 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            size="large"
            placeholder="要检测的域名，例如 example.com"
            prefix={<SearchOutlined />}
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onPressEnter={handleCheck}
          />
          <Button type="primary" size="large" loading={loading} icon={<ThunderboltOutlined />} onClick={handleCheck}>
            检测
          </Button>
        </Space.Compact>
      </Card>

      {error && <Alert type="error" message="检测失败" description={error} showIcon style={{ margin: 24 }} />}
      {loading && <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />}
      {!result && !loading && !error ? (
        <Empty description="请输入域名并点击检测按钮" style={{ padding: 60 }} />
      ) : result ? (
        <>
          <Row gutter={[16, 16]} style={{ margin: 24 }}>
            <Col xs={12} sm={6}>
              <Card><Statistic title="健康评分" value={result.healthScore} suffix="/100" valueStyle={{ color: getScoreColor(result.healthScore) }} prefix={<TrophyOutlined />} /></Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card><Statistic title="SEO 得分" value={result.seoScore} suffix="/100" valueStyle={{ color: getScoreColor(result.seoScore) }} prefix={<ReadOutlined />} /></Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card><Statistic title="性能得分" value={result.performanceScore} suffix="/100" valueStyle={{ color: getScoreColor(result.performanceScore) }} prefix={<BuildOutlined />} /></Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card><Statistic title="安全检查" value={result.securityScore} suffix="/100" valueStyle={{ color: getScoreColor(result.securityScore) }} prefix={<PercentageOutlined />} /></Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Card title="健康评分" className="chart-card">
                <ReactEChartsCore echarts={echarts} option={gaugeOption(result.healthScore, '健康分', getScoreColor(result.healthScore))} style={{ height: 280 }} notMerge />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card title="SEO 评分" className="chart-card">
                <ReactEChartsCore echarts={echarts} option={gaugeOption(result.seoScore, 'SEO', getScoreColor(result.seoScore))} style={{ height: 280 }} notMerge />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card title="安全评分" className="chart-card">
                <ReactEChartsCore echarts={echarts} option={gaugeOption(result.securityScore, '安全', getScoreColor(result.securityScore))} style={{ height: 280 }} notMerge />
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            <Col xs={24} md={12}>
              <Card title="基本信息">
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="域名">{result.domain}</Descriptions.Item>
                  <Descriptions.Item label="IP 地址">{result.ip}</Descriptions.Item>
                  <Descriptions.Item label="服务器">{result.server}</Descriptions.Item>
                  <Descriptions.Item label="响应时间">{result.responseTime}ms</Descriptions.Item>
                  <Descriptions.Item label="SSL 证书">
                    {result.sslValid ? <Tag color="green">有效</Tag> : <Tag color="red">无效</Tag>}
                  </Descriptions.Item>
                  <Descriptions.Item label="HTTPS 重定向">
                    {result.httpsRedirect ? <Tag color="green">已启用</Tag> : <Tag color="red">未启用</Tag>}
                  </Descriptions.Item>
                  <Descriptions.Item label="Robots.txt">{result.hasRobotsTxt ? <Tag color="green">存在</Tag> : <Tag color="red">不存在</Tag>}</Descriptions.Item>
                  <Descriptions.Item label="Sitemap">{result.hasSitemap ? <Tag color="green">存在</Tag> : <Tag color="red">不存在</Tag>}</Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="状态检查">
                {(result.checks || []).map((check: any) => (
                  <div key={check.name} style={{ margin: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: 4 }}>
                      <Space>
                        {getStatusBadge(check.status)}
                        <Text strong>{check.name}</Text>
                      </Space>
                      <Text type="secondary">{check.score}%</Text>
                    </div>
                    <Progress
                      percent={check.score}
                      strokeColor={check.status === 'good' ? '#52c41a' : check.status === 'warning' ? '#faad14' : '#ff4d4f'}
                      size="small"
                    />
                  </div>
                ))}
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            <Col xs={24} md={12}>
              <Card title="SEO 检查详情">
                <List
                  dataSource={result.seoDetails || []}
                  renderItem={(item: any) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <Tag color={item.status === 'good' ? 'green' : item.status === 'warning' ? 'orange' : 'red'}>
                            {item.status === 'good' ? '通过' : item.status === 'warning' ? '警告' : '失败'}
                          </Tag>
                        }
                        title={<Text strong>{item.name}</Text>}
                        description={<Text type="secondary">{item.description}</Text>}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="安全与性能">
                <List
                  dataSource={result.securityDetails || []}
                  renderItem={(item: any) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <Tag color={item.status === 'good' ? 'green' : item.status === 'warning' ? 'orange' : 'red'}>
                            {item.status === 'good' ? '安全' : item.status === 'warning' ? '注意' : '危险'}
                          </Tag>
                        }
                        title={<Text strong>{item.name}</Text>}
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

export default DomainHealth;