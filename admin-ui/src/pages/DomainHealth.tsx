import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Button, Tag, Typography, Row, Col, Statistic, Space, message, Spin, Empty, Alert,
  Input, Form, Table, List, Descriptions, Progress, Tabs, Divider, Badge, Collapse,
} from 'antd';
import {
  ReloadOutlined, SearchOutlined, GlobalOutlined, SafetyCertificateOutlined,
  ClockCircleOutlined, DashboardOutlined, CheckCircleOutlined, WarningOutlined,
  CloseCircleOutlined, InfoCircleOutlined, ThunderboltOutlined, HistoryOutlined,
  LinkOutlined, MobileOutlined, DesktopOutlined, CloudServerOutlined,
  FileProtectOutlined, AimOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart, GaugeChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { domainHealthAPI } from '@/services/domainHealth';

echarts.use([LineChart, GaugeChart, GridComponent, TooltipComponent, TitleComponent, CanvasRenderer]);

const { Text, Paragraph } = Typography;

const DomainHealth: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 检测
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('check');

  // 历史
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!projectId) return;
    setHistoryLoading(true);
    try {
      const res = await domainHealthAPI.getHealthHistory(domain, projectId);
      const data = (res as any).data !== undefined ? (res as any).data : res;
      setHistory(Array.isArray(data) ? data : (data?.data || data?.history || []));
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, [projectId, domain]);

  useEffect(() => {
    if (!projectId) return;
    if (domain) loadHistory();
  }, [projectId]);

  // 检测域名
  const handleCheck = async () => {
    if (!domain.trim()) { message.warning('请输入要检测的域名'); return; }
    setChecking(true);
    setResult(null);
    setError(null);
    try {
      const res = await domainHealthAPI.checkDomain(domain.trim(), projectId);
      const data = (res as any).data !== undefined ? (res as any).data : res;
      setResult(data);
      message.success('域名健康检测完成');
      loadHistory();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '检测失败';
      setError(msg);
    } finally {
      setChecking(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass': case 'valid': case 'active': return <Badge status="success" text="正常" />;
      case 'warning': case 'expiring': return <Badge status="warning" text="警告" />;
      case 'fail': case 'invalid': case 'expired': return <Badge status="error" text="异常" />;
      default: return <Badge status="default" text={status || '未知'} />;
    }
  };

  // 仪表盘
  const gaugeOption = (score: number, title: string) => ({
    series: [{
      type: 'gauge',
      startAngle: 210, endAngle: -30,
      min: 0, max: 100,
      axisLine: { lineStyle: { width: 20, color: [[0.6, '#ff4d4f'], [0.8, '#faad14'], [1, '#52c41a']] } },
      pointer: { length: '60%', width: 6, itemStyle: { color: 'auto' } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: { valueAnimation: true, fontSize: 20, offsetCenter: [0, '60%'], formatter: '{value}分' },
      data: [{ value: score, name: title }],
    }],
  });

  // 历史趋势图
  const historyChartOption = history.length > 0 ? {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: history.map((h: any) => h.checkedAt || h.date) },
    yAxis: { type: 'value', min: 0, max: 100, name: '评分' },
    series: [{
      type: 'line',
      data: history.map((h: any) => h.overallScore || h.score || 0),
      smooth: true,
      areaStyle: { opacity: 0.2 },
      itemStyle: { color: '#1677ff' },
    }],
  } : null;

  const historyColumns = [
    { title: '域名', dataIndex: 'domain', key: 'domain', width: 200 },
    { title: '健康评分', dataIndex: 'overallScore', key: 'overallScore', width: 120,
      render: (s: number) => <Progress percent={s} size="small" strokeColor={getScoreColor(s)} />,
    },
    { title: 'SSL', dataIndex: 'sslStatus', key: 'sslStatus', width: 100,
      render: (ssl: any) => getStatusBadge(ssl?.status || (ssl?.valid ? 'valid' : 'invalid')),
    },
    { title: '检测时间', dataIndex: 'checkedAt', key: 'checkedAt', width: 160,
      render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-',
    },
  ];

  return (
    <div className="page-container">
      <PageHeader title="域名健康" subtitle="域名 WHOIS 信息、DNS 解析、SSL 证书、PageSpeed 综合检测"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: () => { if (domain) handleCheck(); } },
        ]}
      />

      <Tabs activeKey={activeTab} onChange={setActiveTab} size="large"
        items={[
          {
            key: 'check',
            label: <span><SearchOutlined /> 健康检测</span>,
            children: (
              <>
                {/* 检测输入 */}
                <Card title={<><GlobalOutlined /> 域名健康检测</>} style={{ marginBottom: 24 }}>
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={18}>
                      <Input.Search
                        placeholder="输入要检测的域名，如 example.com"
                        prefix={<LinkOutlined />}
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        onSearch={handleCheck}
                        enterButton={
                          <Button type="primary" icon={<ThunderboltOutlined />} loading={checking}>
                            开始检测
                          </Button>
                        }
                        size="large"
                        disabled={checking}
                      />
                    </Col>
                    <Col xs={24} md={6}>
                      <Text type="secondary">检测 WHOIS、DNS、SSL证书、PageSpeed 性能</Text>
                    </Col>
                  </Row>
                </Card>

                {/* 检测中 */}
                {checking && (
                  <Card style={{ marginBottom: 24, borderColor: '#1677ff' }}>
                    <Spin tip="正在检测域名健康状态，查询 WHOIS / DNS / SSL / PageSpeed...">
                      <div style={{ padding: 40 }} />
                    </Spin>
                  </Card>
                )}

                {/* 错误 */}
                {error && (
                  <Alert type="error" message="检测失败" description={error} showIcon closable style={{ marginBottom: 24 }}
                    onClose={() => setError(null)} />
                )}

                {/* 检测结果 */}
                {result && (
                  <>
                    {/* 评分卡片 */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                      <Col xs={24} sm={6}>
                        <Card size="small">
                          <ReactEChartsCore echarts={echarts} option={gaugeOption(result?.overallScore || 0, '健康评分')} style={{ height: 180 }} />
                        </Card>
                      </Col>
                      <Col xs={24} sm={18}>
                        <Row gutter={[16, 16]}>
                          <Col xs={12} sm={6}>
                            <Card size="small">
                              <Statistic title="域名年龄" value={result?.domainInfo?.domainAge || '-'} suffix="年"
                                prefix={<ClockCircleOutlined />} />
                            </Card>
                          </Col>
                          <Col xs={12} sm={6}>
                            <Card size="small">
                              <Statistic title="SSL 剩余" value={result?.sslStatus?.daysRemaining || 0} suffix="天"
                                valueStyle={{ color: (result?.sslStatus?.daysRemaining || 0) > 30 ? '#52c41a' : '#ff4d4f' }}
                                prefix={<SafetyCertificateOutlined />} />
                            </Card>
                          </Col>
                          <Col xs={12} sm={6}>
                            <Card size="small">
                              <Statistic title="PageSpeed 移动" value={result?.pageSpeed?.mobile || '-'} suffix="/100"
                                valueStyle={{ color: getScoreColor(result?.pageSpeed?.mobile || 0) }}
                                prefix={<MobileOutlined />} />
                            </Card>
                          </Col>
                          <Col xs={12} sm={6}>
                            <Card size="small">
                              <Statistic title="PageSpeed 桌面" value={result?.pageSpeed?.desktop || '-'} suffix="/100"
                                valueStyle={{ color: getScoreColor(result?.pageSpeed?.desktop || 0) }}
                                prefix={<DesktopOutlined />} />
                            </Card>
                          </Col>
                        </Row>
                      </Col>
                    </Row>

                    {/* WHOIS 信息 */}
                    {result?.domainInfo && (
                      <Card title={<><GlobalOutlined /> WHOIS 域名信息</>} style={{ marginBottom: 24 }}>
                        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small">
                          <Descriptions.Item label="域名">{result.domain}</Descriptions.Item>
                          <Descriptions.Item label="注册商">{result.domainInfo.registrar || '-'}</Descriptions.Item>
                          <Descriptions.Item label="域名年龄">{result.domainInfo.domainAge || '-'} 年</Descriptions.Item>
                          <Descriptions.Item label="注册日期">{result.domainInfo.creationDate || '-'}</Descriptions.Item>
                          <Descriptions.Item label="到期日期">
                            <Text type={result.domainInfo.expirationDate ? undefined : 'warning'}>
                              {result.domainInfo.expirationDate || '未知'}
                            </Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="状态">
                            {getStatusBadge(result.domainInfo.status || 'active')}
                          </Descriptions.Item>
                          <Descriptions.Item label="DNS 服务器" span={3}>
                            {result.domainInfo.nameservers?.length > 0
                              ? result.domainInfo.nameservers.map((ns: string, i: number) => (
                                <Tag key={i} style={{ marginBottom: 4 }}>{ns}</Tag>
                              ))
                              : '-'}
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>
                    )}

                    {/* SSL 证书 */}
                    {result?.sslStatus && (
                      <Card title={<><SafetyCertificateOutlined /> SSL 证书</>} style={{ marginBottom: 24 }}>
                        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small">
                          <Descriptions.Item label="状态">
                            {getStatusBadge(result.sslStatus.status || (result.sslStatus.valid ? 'valid' : 'invalid'))}
                          </Descriptions.Item>
                          <Descriptions.Item label="颁发者">{result.sslStatus.issuer || '-'}</Descriptions.Item>
                          <Descriptions.Item label="剩余天数">
                            <Text strong style={{ color: (result.sslStatus.daysRemaining || 0) > 30 ? '#52c41a' : '#ff4d4f' }}>
                              {result.sslStatus.daysRemaining || 0} 天
                            </Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="生效日期">{result.sslStatus.validFrom || '-'}</Descriptions.Item>
                          <Descriptions.Item label="到期日期">{result.sslStatus.validTo || '-'}</Descriptions.Item>
                          <Descriptions.Item label="证书类型">
                            <Tag>{result.sslStatus.type || 'DV'}</Tag>
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>
                    )}

                    {/* PageSpeed */}
                    {result?.pageSpeed && (
                      <Card title={<><DashboardOutlined /> PageSpeed Insights</>} style={{ marginBottom: 24 }}>
                        <Row gutter={[16, 16]}>
                          <Col xs={24} md={12}>
                            <Card size="small" title={<><MobileOutlined /> 移动端</>}>
                              <Row gutter={16}>
                                <Col span={12}>
                                  <Statistic title="性能评分" value={result.pageSpeed?.mobile || '-'}
                                    valueStyle={{ color: getScoreColor(result.pageSpeed?.mobile || 0) }} />
                                </Col>
                                <Col span={12}>
                                  <Statistic title="FCP" value={result.pageSpeed?.mobileFcp || '-'} suffix="s" />
                                </Col>
                                <Col span={12}>
                                  <Statistic title="LCP" value={result.pageSpeed?.mobileLcp || '-'} suffix="s" />
                                </Col>
                                <Col span={12}>
                                  <Statistic title="CLS" value={result.pageSpeed?.mobileCls || '-'} />
                                </Col>
                              </Row>
                            </Card>
                          </Col>
                          <Col xs={24} md={12}>
                            <Card size="small" title={<><DesktopOutlined /> 桌面端</>}>
                              <Row gutter={16}>
                                <Col span={12}>
                                  <Statistic title="性能评分" value={result.pageSpeed?.desktop || '-'}
                                    valueStyle={{ color: getScoreColor(result.pageSpeed?.desktop || 0) }} />
                                </Col>
                                <Col span={12}>
                                  <Statistic title="FCP" value={result.pageSpeed?.desktopFcp || '-'} suffix="s" />
                                </Col>
                                <Col span={12}>
                                  <Statistic title="LCP" value={result.pageSpeed?.desktopLcp || '-'} suffix="s" />
                                </Col>
                                <Col span={12}>
                                  <Statistic title="CLS" value={result.pageSpeed?.desktopCls || '-'} />
                                </Col>
                              </Row>
                            </Card>
                          </Col>
                        </Row>
                      </Card>
                    )}

                    {/* 问题列表 */}
                    {result?.issues && result.issues.length > 0 && (
                      <Card title="检测问题" style={{ marginBottom: 24 }}>
                        <List
                          dataSource={result.issues}
                          renderItem={(item: any) => {
                            const severityConfig: Record<string, { color: string; icon: React.ReactNode }> = {
                              critical: { color: '#ff4d4f', icon: <CloseCircleOutlined /> },
                              major: { color: '#fa8c16', icon: <WarningOutlined /> },
                              minor: { color: '#1677ff', icon: <InfoCircleOutlined /> },
                              info: { color: '#52c41a', icon: <CheckCircleOutlined /> },
                            };
                            const config = severityConfig[item.severity] || severityConfig.info;
                            return (
                              <List.Item>
                                <List.Item.Meta
                                  avatar={<Tag color={config.color} icon={config.icon}>{item.severity}</Tag>}
                                  title={item.title}
                                  description={item.suggestion || item.description}
                                />
                              </List.Item>
                            );
                          }}
                        />
                      </Card>
                    )}
                  </>
                )}

                {!result && !checking && !error && (
                  <Empty description="输入域名，点击「开始检测」获取 WHOIS / DNS / SSL / PageSpeed 综合报告" style={{ marginTop: 60 }} />
                )}
              </>
            ),
          },
          {
            key: 'history',
            label: <span><HistoryOutlined /> 检测历史</span>,
            children: (
              <>
                {historyChartOption && (
                  <Card title="健康评分趋势" style={{ marginBottom: 24 }}>
                    <ReactEChartsCore echarts={echarts} option={historyChartOption} style={{ height: 300 }} />
                  </Card>
                )}
                <Card title="检测记录">
                  <Table columns={historyColumns} dataSource={history} rowKey="id"
                    loading={historyLoading} pagination={{ pageSize: 10 }} size="middle"
                  />
                </Card>
              </>
            ),
          },
        ]}
      />
    </div>
  );
};

export default DomainHealth;