import React, { useState } from 'react';
import {
  Card, Row, Col, Input, Button, Typography, Space, Progress, Tag, Statistic,
  Descriptions, List, Collapse, Divider, Result, Badge, message, Empty,
} from 'antd';
import {
  GlobalOutlined, SafetyCertificateOutlined, ThunderboltOutlined,
  CheckCircleOutlined, CloseCircleOutlined, WarningOutlined,
  ClockCircleOutlined, SearchOutlined, ReloadOutlined,
  DesktopOutlined, MobileOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { GaugeChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import dayjs from 'dayjs';

echarts.use([GaugeChart, CanvasRenderer]);

const { Text, Title } = Typography;

const mockHealthData = {
  domain: 'example.com',
  overallScore: 87,
  domainInfo: {
    registrar: 'Namecheap, Inc.',
    creationDate: '2015-03-15',
    expirationDate: '2027-03-15',
    domainAge: 9.3,
    nameservers: ['ns1.example.com', 'ns2.example.com'],
  },
  sslStatus: {
    valid: true,
    issuer: "Let's Encrypt",
    validFrom: '2024-06-01',
    validTo: '2024-09-01',
    daysRemaining: 46,
    status: 'valid' as const,
  },
  pageSpeed: {
    desktop: { score: 92, fcp: 1.2, lcp: 2.1, cls: 0.05, tbt: 45 },
    mobile: { score: 74, fcp: 2.8, lcp: 4.2, cls: 0.08, tbt: 180 },
  },
  issues: [
    { title: '移动端性能偏低', description: 'Mobile LCP 超过 4秒，建议优化图片和JS加载', severity: 'warning' as const },
    { title: 'SSL证书即将过期', description: 'SSL证书将在 46 天后过期，建议提前续期', severity: 'warning' as const },
    { title: '缺少HSTS头', description: '未配置 HTTP Strict-Transport-Security 响应头', severity: 'info' as const },
    { title: 'DNS 预解析未启用', description: '建议启用 DNS prefetch 以提升第三方资源加载速度', severity: 'info' as const },
  ],
  checkedAt: '2024-07-15T10:00:00',
};

const DomainHealth: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCheck = () => {
    if (!domain) { message.warning('请输入域名'); return; }
    setLoading(true);
    setTimeout(() => {
      setResult({ ...mockHealthData, domain });
      setLoading(false);
      message.success('检测完成');
    }, 2000);
  };

  const healthGaugeOption = (score: number) => ({
    series: [{
      type: 'gauge', radius: '90%', center: ['50%', '55%'],
      startAngle: 210, endAngle: -30, min: 0, max: 100,
      axisLine: { show: true, lineStyle: { width: 20, color: [[0.3, '#ff4d4f'], [0.6, '#faad14'], [1, '#52c41a']] } },
      axisTick: { show: false }, splitLine: { show: false },
      axisLabel: { show: false },
      detail: { valueAnimation: true, fontSize: 36, fontWeight: 'bold', offsetCenter: [0, '50%'], formatter: '{value}', color: score >= 70 ? '#52c41a' : score >= 40 ? '#faad14' : '#ff4d4f' },
      title: { offsetCenter: [0, '80%'], fontSize: 13, color: '#999' },
      data: [{ value: score, name: '健康分' }],
    }],
  });

  const sslStatusConfig: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
    valid: { color: '#52c41a', text: '有效', icon: <CheckCircleOutlined /> },
    expiring: { color: '#faad14', text: '即将过期', icon: <WarningOutlined /> },
    expired: { color: '#ff4d4f', text: '已过期', icon: <CloseCircleOutlined /> },
  };

  const issueSeverityConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    critical: { color: '#ff4d4f', icon: <CloseCircleOutlined /> },
    warning: { color: '#faad14', icon: <WarningOutlined /> },
    info: { color: '#1677ff', icon: <ThunderboltOutlined /> },
  };

  return (
    <div className="page-container">
      <PageHeader
        title="域名健康"
        subtitle="综合域名健康检查与性能分析"
        actions={[{ label: '刷新', icon: <ReloadOutlined />, onClick: () => setResult(null), loading: false }]}
      />

      <Card style={{ marginBottom: 24 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            size="large"
            placeholder="输入域名，例如 example.com"
            prefix={<GlobalOutlined />}
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onPressEnter={handleCheck}
          />
          <Button type="primary" size="large" loading={loading} icon={<SearchOutlined />} onClick={handleCheck}>
            检测
          </Button>
        </Space.Compact>
      </Card>

      {!result ? (
        <Empty description="请输入域名并点击检测按钮" style={{ padding: 60 }} />
      ) : (
        <>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Card title="综合健康评分" className="chart-card">
                <ReactEChartsCore echarts={echarts} option={healthGaugeOption(result.overallScore)} style={{ height: 300 }} notMerge />
                <div style={{ textAlign: 'center', marginTop: -20 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>检测时间: {dayjs(result.checkedAt).format('MM-DD HH:mm')}</Text>
                </div>
              </Card>
            </Col>
            <Col xs={24} md={16}>
              <Card title="域名信息" style={{ marginBottom: 24 }}>
                <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                  <Descriptions.Item label="域名">{result.domain}</Descriptions.Item>
                  <Descriptions.Item label="注册商">{result.domainInfo.registrar}</Descriptions.Item>
                  <Descriptions.Item label="创建日期">{result.domainInfo.creationDate}</Descriptions.Item>
                  <Descriptions.Item label="过期日期">
                    <Text style={{ color: dayjs(result.domainInfo.expirationDate).diff(dayjs(), 'day') < 90 ? '#faad14' : '#52c41a' }}>
                      {result.domainInfo.expirationDate}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="域名年龄">{result.domainInfo.domainAge} 年</Descriptions.Item>
                  <Descriptions.Item label="域名服务器">
                    {result.domainInfo.nameservers.join(', ')}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            <Col xs={24} md={12}>
              <Card title="SSL 证书状态">
                {result.sslStatus.valid ? (
                  <Result
                    icon={<SafetyCertificateOutlined style={{ color: sslStatusConfig[result.sslStatus.status].color }} />}
                    title={<Text style={{ color: sslStatusConfig[result.sslStatus.status].color }}>{sslStatusConfig[result.sslStatus.status].text}</Text>}
                    subTitle={`颁发者: ${result.sslStatus.issuer}`}
                  >
                    <Descriptions column={2} size="small" bordered>
                      <Descriptions.Item label="有效期起">{result.sslStatus.validFrom}</Descriptions.Item>
                      <Descriptions.Item label="有效期止">{result.sslStatus.validTo}</Descriptions.Item>
                      <Descriptions.Item label="剩余天数" span={2}>
                        <Badge
                          count={`${result.sslStatus.daysRemaining} 天`}
                          style={{
                            backgroundColor: result.sslStatus.daysRemaining > 30 ? '#52c41a' : result.sslStatus.daysRemaining > 14 ? '#faad14' : '#ff4d4f',
                          }}
                        />
                      </Descriptions.Item>
                    </Descriptions>
                  </Result>
                ) : (
                  <Result status="error" title="SSL 证书已过期" subTitle="请立即续期 SSL 证书" />
                )}
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="PageSpeed 性能评分">
                <Row gutter={[16, 16]}>
                  <Col span={12} style={{ textAlign: 'center' }}>
                    <DesktopOutlined style={{ fontSize: 24, color: '#1677ff', marginBottom: 8 }} />
                    <div style={{ fontSize: 28, fontWeight: 700, color: result.pageSpeed.desktop.score >= 90 ? '#52c41a' : '#faad14' }}>
                      {result.pageSpeed.desktop.score}
                    </div>
                    <Text type="secondary">桌面端</Text>
                    <div style={{ marginTop: 8, textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><Text type="secondary">FCP</Text><Text>{result.pageSpeed.desktop.fcp}s</Text></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><Text type="secondary">LCP</Text><Text>{result.pageSpeed.desktop.lcp}s</Text></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><Text type="secondary">CLS</Text><Text>{result.pageSpeed.desktop.cls}</Text></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><Text type="secondary">TBT</Text><Text>{result.pageSpeed.desktop.tbt}ms</Text></div>
                    </div>
                  </Col>
                  <Col span={12} style={{ textAlign: 'center', borderLeft: '1px solid #f0f0f0' }}>
                    <MobileOutlined style={{ fontSize: 24, color: '#722ed1', marginBottom: 8 }} />
                    <div style={{ fontSize: 28, fontWeight: 700, color: result.pageSpeed.mobile.score >= 90 ? '#52c41a' : result.pageSpeed.mobile.score >= 50 ? '#faad14' : '#ff4d4f' }}>
                      {result.pageSpeed.mobile.score}
                    </div>
                    <Text type="secondary">移动端</Text>
                    <div style={{ marginTop: 8, textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><Text type="secondary">FCP</Text><Text>{result.pageSpeed.mobile.fcp}s</Text></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><Text type="secondary">LCP</Text><Text>{result.pageSpeed.mobile.lcp}s</Text></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><Text type="secondary">CLS</Text><Text>{result.pageSpeed.mobile.cls}</Text></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><Text type="secondary">TBT</Text><Text>{result.pageSpeed.mobile.tbt}ms</Text></div>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          <Card title="问题清单" style={{ marginTop: 24 }}>
            <List
              dataSource={result.issues}
              renderItem={(item: any) => {
                const config = issueSeverityConfig[item.severity];
                return (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Tag color={config.color} icon={config.icon}>
                          {item.severity === 'critical' ? '严重' : item.severity === 'warning' ? '警告' : '信息'}
                        </Tag>
                      }
                      title={<Text strong>{item.title}</Text>}
                      description={item.description}
                    />
                  </List.Item>
                );
              }}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default DomainHealth;