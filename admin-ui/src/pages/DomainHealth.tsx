import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Typography, Button, Space, message, Tag,
  Input, Descriptions, Progress, List, Tabs, Divider, Badge,
} from 'antd';
import {
  ReloadOutlined, SearchOutlined, GlobalOutlined, SafetyCertificateOutlined,
  ClockCircleOutlined, DashboardOutlined, CheckCircleOutlined, WarningOutlined,
  CloseCircleOutlined, InfoCircleOutlined, ThunderboltOutlined, HistoryOutlined,
  LinkOutlined, CloudServerOutlined, MailOutlined, SecurityScanOutlined,
  FundOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from '@/components/common';
import { TrendChart, GaugeChart } from '@/components/charts';
import type { TrendDataPoint } from '@/components/charts';
import { useStore } from '@/store';
import { domainHealthAPI } from '@/services/domainHealth';

const { Text } = Typography;

// ============================================================================
// Types
// ============================================================================

interface HealthResult {
  domain: string;
  overallScore: number;
  seoScore: number;
  securityScore: number;
  performanceScore: number;
  emailScore: number;
  domainInfo: {
    registrar: string;
    creationDate: string;
    expiryDate: string;
    domainAge: number;
    nameservers: string[];
  };
  sslInfo: {
    issuer: string;
    validFrom: string;
    validTo: string;
    daysRemaining: number;
    status: string;
  };
  issues: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
}

interface HistoryItem {
  id: string;
  domain: string;
  overallScore: number;
  checkedAt: string;
  date: string;
}

// ============================================================================
// Helpers
// ============================================================================

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#52c41a';
  if (score >= 60) return '#faad14';
  return '#ff4d4f';
};

const getSeverityConfig = (severity: string): { color: string; icon: React.ReactNode; label: string } => {
  switch (severity) {
    case 'critical':
    case 'error':
      return { color: '#ff4d4f', icon: <CloseCircleOutlined />, label: '严重' };
    case 'major':
    case 'warning':
      return { color: '#fa8c16', icon: <WarningOutlined />, label: '警告' };
    case 'minor':
    case 'info':
      return { color: '#1677ff', icon: <InfoCircleOutlined />, label: '信息' };
    default:
      return { color: '#52c41a', icon: <CheckCircleOutlined />, label: '正常' };
  }
};

// ============================================================================
// Component
// ============================================================================

const DomainHealth: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const projectName = useStore((s) => s.currentProject?.name);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<HealthResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('check');

  // ==========================================================================
  // Load history
  // ==========================================================================

  const loadHistory = useCallback(async () => {
    if (!projectId || !domain) return;
    setHistoryLoading(true);
    try {
      const res: any = await domainHealthAPI.getHealthHistory(domain, projectId);
      const arr = Array.isArray(res) ? res : (res?.data || res?.history || []);
      const historyData: HistoryItem[] = arr.map((h: any, idx: number) => ({
        id: h.id || `hist-${idx}`,
        domain: h.domain || domain,
        overallScore: h.overallScore || h.score || 0,
        checkedAt: h.checkedAt || h.date || '',
        date: h.checkedAt || h.date || '',
      }));
      setHistory(historyData);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, [projectId, domain]);

  useEffect(() => {
    if (!projectId) return;
    if (domain) loadHistory();
  }, [projectId, loadHistory]);

  // ==========================================================================
  // Check domain
  // ==========================================================================

  const handleCheck = async () => {
    if (!domain.trim()) {
      message.warning('请输入要检测的域名');
      return;
    }
    setChecking(true);
    setResult(null);
    setError(null);
    try {
      const res: any = await domainHealthAPI.checkDomain(domain.trim(), projectId);
      const data = res?.data !== undefined ? res.data : res;
      const mapped: HealthResult = {
        domain: data?.domain || domain.trim(),
        overallScore: data?.overallScore || 0,
        seoScore: data?.seoScore || data?.pageSpeed?.desktop?.score || 0,
        securityScore: data?.sslStatus?.daysRemaining ? Math.min(100, (data.sslStatus.daysRemaining / 365) * 100) : 0,
        performanceScore: data?.pageSpeed?.mobile?.score || 0,
        emailScore: data?.emailScore || 70,
        domainInfo: {
          registrar: data?.domainInfo?.registrar || '-',
          creationDate: data?.domainInfo?.creationDate || '-',
          expiryDate: data?.domainInfo?.expirationDate || '-',
          domainAge: data?.domainInfo?.domainAge || 0,
          nameservers: data?.domainInfo?.nameservers || [],
        },
        sslInfo: {
          issuer: data?.sslStatus?.issuer || '-',
          validFrom: data?.sslStatus?.validFrom || '-',
          validTo: data?.sslStatus?.validTo || '-',
          daysRemaining: data?.sslStatus?.daysRemaining || 0,
          status: data?.sslStatus?.status || (data?.sslStatus?.valid ? 'valid' : 'invalid'),
        },
        issues: (data?.issues || []).map((issue: any) => ({
          type: issue.type || issue.severity || 'info',
          severity: issue.severity || 'info',
          description: issue.description || issue.title || '',
        })),
      };
      setResult(mapped);
      message.success('域名健康检测完成');
      loadHistory();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '检测失败';
      setError(msg);
    } finally {
      setChecking(false);
    }
  };

  const handleRefresh = () => {
    if (domain) handleCheck();
  };

  // ==========================================================================
  // History trend data
  // ==========================================================================

  const historyTrendData: TrendDataPoint[] = history.map((h) => ({
    date: h.checkedAt ? new Date(h.checkedAt).toLocaleDateString('zh-CN') : h.date,
    value: h.overallScore,
  }));

  // ==========================================================================
  // No project
  // ==========================================================================

  if (!projectId) {
    return (
      <div className="page-container">
        <PageHeader title="域名健康" subtitle="域名 WHOIS、DNS、SSL 证书、PageSpeed 综合检测" />
        <EmptyState scene="data" title="请先选择项目" description="选择一个项目以进行域名健康检测" />
      </div>
    );
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="page-container">
      <PageHeader
        title="域名健康"
        subtitle={`项目: ${projectName || ''} - 域名 WHOIS、DNS、SSL 证书、PageSpeed 综合检测`}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} disabled={!domain}>刷新</Button>
          </Space>
        }
      />

      {/* Domain input */}
      <Card
        title={<><GlobalOutlined /> 域名健康检测</>}
        style={{ borderRadius: 8, marginBottom: 24 }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={16}>
            <Input.Search
              placeholder="输入域名，如 example.com"
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
          <Col xs={24} md={8}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              检测 WHOIS、DNS 解析、SSL 证书、PageSpeed 性能
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Checking state */}
      {checking && (
        <Card style={{ borderRadius: 8, marginBottom: 24, borderColor: '#1677ff' }}>
          <LoadingSkeleton type="page" />
        </Card>
      )}

      {/* Error state */}
      {error && !checking && (
        <ErrorState message={error} onRetry={handleCheck} />
      )}

      {/* No result yet */}
      {!result && !checking && !error && (
        <EmptyState
          scene="search"
          title="输入域名开始检测"
          description="输入域名，点击「开始检测」获取 WHOIS/DNS/SSL/PageSpeed 综合报告"
        />
      )}

      {/* Results */}
      {result && !checking && (
        <>
          {/* KPI Stats + Gauge */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={6}>
              <Card style={{ borderRadius: 8, textAlign: 'center' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>健康评分</Text>
                <GaugeChart
                  value={result.overallScore}
                  max={100}
                  height={160}
                  unit="分"
                  thresholds={[
                    { value: 60, color: '#ff4d4f' },
                    { value: 80, color: '#faad14' },
                    { value: 100, color: '#52c41a' },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} sm={18}>
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="健康评分"
                    value={result.overallScore}
                    suffix="分"
                    icon={<DashboardOutlined />}
                    color={getScoreColor(result.overallScore)}
                    subtitle={result.overallScore >= 80 ? '状态良好' : result.overallScore >= 60 ? '需要关注' : '需要修复'}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="域名年龄"
                    value={result.domainInfo.domainAge}
                    suffix="年"
                    icon={<ClockCircleOutlined />}
                    color="#1677ff"
                    subtitle={`注册商: ${result.domainInfo.registrar}`}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="SSL 状态"
                    value={result.sslInfo.daysRemaining}
                    suffix="天"
                    icon={<SafetyCertificateOutlined />}
                    color={result.sslInfo.daysRemaining > 30 ? '#52c41a' : '#ff4d4f'}
                    subtitle={result.sslInfo.status === 'valid' ? '有效' : '即将到期'}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <StatCard
                    title="DNS 服务器"
                    value={result.domainInfo.nameservers.length}
                    suffix="个"
                    icon={<CloudServerOutlined />}
                    color="#722ed1"
                    subtitle="名称服务器"
                  />
                </Col>
              </Row>
            </Col>
          </Row>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            size="large"
            items={[
              {
                key: 'check',
                label: <span><SearchOutlined /> 检测详情</span>,
                children: (
                  <>
                    {/* Score Progress Bars */}
                    <Card title={<><FundOutlined /> 评分详情</>} style={{ borderRadius: 8, marginBottom: 24 }}>
                      <Row gutter={[24, 16]}>
                        <Col xs={24} sm={12}>
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text>SEO 评分</Text>
                              <Text strong style={{ color: getScoreColor(result.seoScore) }}>{result.seoScore}/100</Text>
                            </div>
                            <Progress percent={result.seoScore} strokeColor={getScoreColor(result.seoScore)} />
                          </div>
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text>安全评分</Text>
                              <Text strong style={{ color: getScoreColor(result.securityScore) }}>{result.securityScore}/100</Text>
                            </div>
                            <Progress percent={result.securityScore} strokeColor={getScoreColor(result.securityScore)} />
                          </div>
                        </Col>
                        <Col xs={24} sm={12}>
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text>性能评分</Text>
                              <Text strong style={{ color: getScoreColor(result.performanceScore) }}>{result.performanceScore}/100</Text>
                            </div>
                            <Progress percent={result.performanceScore} strokeColor={getScoreColor(result.performanceScore)} />
                          </div>
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text>邮件评分</Text>
                              <Text strong style={{ color: getScoreColor(result.emailScore) }}>{result.emailScore}/100</Text>
                            </div>
                            <Progress percent={result.emailScore} strokeColor={getScoreColor(result.emailScore)} />
                          </div>
                        </Col>
                      </Row>
                    </Card>

                    {/* Domain Info */}
                    <Card title={<><GlobalOutlined /> 域名信息</>} style={{ borderRadius: 8, marginBottom: 24 }}>
                      <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small">
                        <Descriptions.Item label="域名">{result.domain}</Descriptions.Item>
                        <Descriptions.Item label="注册商">{result.domainInfo.registrar}</Descriptions.Item>
                        <Descriptions.Item label="域名年龄">{result.domainInfo.domainAge} 年</Descriptions.Item>
                        <Descriptions.Item label="注册日期">{result.domainInfo.creationDate}</Descriptions.Item>
                        <Descriptions.Item label="到期日期">
                          <Text type={result.domainInfo.expiryDate ? undefined : 'warning'}>
                            {result.domainInfo.expiryDate || '未知'}
                          </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="状态">
                          <StatusBadge status="active" text="正常" />
                        </Descriptions.Item>
                        <Descriptions.Item label="DNS 服务器" span={3}>
                          {result.domainInfo.nameservers.length > 0
                            ? result.domainInfo.nameservers.map((ns: string, i: number) => (
                              <Tag key={i} style={{ marginBottom: 4 }}>{ns}</Tag>
                            ))
                            : '-'}
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>

                    {/* SSL Info */}
                    <Card title={<><SafetyCertificateOutlined /> SSL 证书</>} style={{ borderRadius: 8, marginBottom: 24 }}>
                      <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small">
                        <Descriptions.Item label="状态">
                          <StatusBadge
                            status={result.sslInfo.status === 'valid' ? 'active' : result.sslInfo.status === 'expiring' ? 'warning' : 'error'}
                            text={result.sslInfo.status === 'valid' ? '有效' : result.sslInfo.status === 'expiring' ? '即将到期' : '已过期'}
                          />
                        </Descriptions.Item>
                        <Descriptions.Item label="颁发者">{result.sslInfo.issuer}</Descriptions.Item>
                        <Descriptions.Item label="剩余天数">
                          <Text strong style={{ color: result.sslInfo.daysRemaining > 30 ? '#52c41a' : '#ff4d4f' }}>
                            {result.sslInfo.daysRemaining} 天
                          </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="生效日期">{result.sslInfo.validFrom}</Descriptions.Item>
                        <Descriptions.Item label="到期日期">{result.sslInfo.validTo}</Descriptions.Item>
                        <Descriptions.Item label="证书类型">
                          <Tag color="blue">DV</Tag>
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>

                    {/* Issues */}
                    {result.issues.length > 0 && (
                      <Card title={<><WarningOutlined /> 检测问题</>} style={{ borderRadius: 8 }}>
                        <List
                          dataSource={result.issues}
                          renderItem={(item: any, idx: number) => {
                            const cfg = getSeverityConfig(item.severity);
                            return (
                              <List.Item key={idx}>
                                <List.Item.Meta
                                  avatar={
                                    <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>
                                  }
                                  title={item.type || item.description}
                                  description={item.description}
                                />
                              </List.Item>
                            );
                          }}
                        />
                      </Card>
                    )}
                  </>
                ),
              },
              {
                key: 'history',
                label: <span><HistoryOutlined /> 检测历史</span>,
                children: (
                  <>
                    {historyTrendData.length > 0 && (
                      <Card title="健康评分趋势" style={{ borderRadius: 8, marginBottom: 24 }}>
                        <TrendChart
                          data={historyTrendData}
                          height={300}
                          showArea
                          smooth
                          color="#1677ff"
                          unit="分"
                        />
                      </Card>
                    )}
                    <Card title="检测记录" style={{ borderRadius: 8 }}>
                      <Table
                        columns={[
                          {
                            title: '域名', dataIndex: 'domain', key: 'domain', width: 200,
                            render: (v: string) => <Text strong>{v}</Text>,
                          },
                          {
                            title: '健康评分', dataIndex: 'overallScore', key: 'overallScore', width: 150,
                            render: (s: number) => (
                              <Progress percent={s} size="small" strokeColor={getScoreColor(s)} format={() => `${s}分`} />
                            ),
                          },
                          {
                            title: '检测时间', dataIndex: 'checkedAt', key: 'checkedAt', width: 180,
                            render: (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-',
                          },
                        ]}
                        dataSource={history}
                        rowKey="id"
                        loading={historyLoading}
                        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条记录` }}
                        size="middle"
                      />
                    </Card>
                  </>
                ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
};

export default DomainHealth;