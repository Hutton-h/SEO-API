import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Modal, Typography, Row, Col, Space,
  Tabs, Select, Tag, message, Input, Form, Descriptions, Tooltip,
  Progress, List, Badge, Divider,
} from 'antd';
import {
  ReloadOutlined, PlusOutlined, DownloadOutlined,
  CheckCircleOutlined, CloseCircleOutlined, WarningOutlined,
  FileTextOutlined, BugOutlined, SafetyCertificateOutlined,
  LinkOutlined, CalendarOutlined, CloudUploadOutlined,
  ApartmentOutlined, SearchOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { useStore } from '@/store';
import { useProject } from '@/hooks';
import { sitemapAPI } from '@/services/sitemap';

const { Text, Paragraph } = Typography;
const { Option } = Select;

// ============================================================================
// Types
// ============================================================================

interface SitemapRecord {
  id: string;
  url: string;
  type: 'xml' | 'html' | 'txt';
  urlCount: number;
  generatedAt: string;
  downloadUrl: string;
}

interface SitemapIssue {
  id: string;
  url: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

interface ValidationResult {
  status: string;
  totalUrls: number;
  validUrls: number;
  issues: SitemapIssue[];
}

// ============================================================================
// Helpers
// ============================================================================

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'error': return '#ff4d4f';
    case 'warning': return '#faad14';
    case 'info': return '#1677ff';
    default: return '#d9d9d9';
  }
};

const getSeverityLabel = (severity: string): string => {
  switch (severity) {
    case 'error': return '错误';
    case 'warning': return '警告';
    case 'info': return '信息';
    default: return severity;
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'error': return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    case 'warning': return <WarningOutlined style={{ color: '#faad14' }} />;
    case 'info': return <CheckCircleOutlined style={{ color: '#1677ff' }} />;
    default: return <CheckCircleOutlined />;
  }
};

const getTypeTag = (type: string) => {
  switch (type) {
    case 'xml': return <Tag color="blue">XML</Tag>;
    case 'html': return <Tag color="green">HTML</Tag>;
    case 'txt': return <Tag color="orange">TXT</Tag>;
    default: return <Tag>{type}</Tag>;
  }
};

// ============================================================================
// Component
// ============================================================================

const Sitemap: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const projectName = useStore((s) => s.currentProject?.name || '');
  const { hasProject } = useProject();

  // ---- State ----
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('sitemaps');

  // Data
  const [sitemaps, setSitemaps] = useState<SitemapRecord[]>([]);
  const [issues, setIssues] = useState<SitemapIssue[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Generate modal
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateForm] = Form.useForm();

  // Validate form
  const [validateUrl, setValidateUrl] = useState('');
  const [validateLoading, setValidateLoading] = useState(false);

  // Downloading
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // ---- Data loading ----
  const loadSitemaps = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await sitemapAPI.getSitemapInfo(projectId);
      const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
      setSitemaps(list);
    } catch {
      setSitemaps([]);
    }
  }, [projectId]);

  const loadIssues = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await sitemapAPI.getSitemapInfo(projectId);
      const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
      setIssues(list);
    } catch {
      setIssues([]);
    }
  }, [projectId]);

  const loadAll = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadSitemaps(), loadIssues()]);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, loadSitemaps, loadIssues]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadAll();
  }, [projectId]);

  // ---- Actions ----
  const handleGenerateSitemap = async () => {
    try {
      await generateForm.validateFields();
      setGenerateLoading(true);
      await sitemapAPI.generateSitemap(projectId!);
      message.success('站点地图生成成功');
      setGenerateModalOpen(false);
      generateForm.resetFields();
      await loadSitemaps();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.error?.message || err?.message || '生成失败');
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleDownload = async (record: SitemapRecord) => {
    setDownloadingId(record.id);
    try {
      const res: any = await sitemapAPI.downloadSitemap(projectId!);
      const url = res?.downloadUrl || res?.url || res;
      if (url) {
        window.open(url, '_blank');
      }
      message.success('下载已开始');
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || '下载失败');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleValidate = async () => {
    if (!validateUrl.trim()) {
      message.warning('请输入要验证的 URL');
      return;
    }
    setValidateLoading(true);
    try {
      const res: any = await sitemapAPI.validateSitemap(projectId!);
      const data = res?.data !== undefined ? res.data : res;
      setValidationResult({
        status: data?.status || 'completed',
        totalUrls: data?.totalUrls ?? 0,
        validUrls: data?.validUrls ?? 0,
        issues: data?.issues || data?.errors || [],
      });
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || '验证失败');
    } finally {
      setValidateLoading(false);
    }
  };

  // ---- KPI calculations ----
  const sitemapsCount = sitemaps.length;
  const totalUrls = sitemaps.reduce((s, sm) => s + (sm.urlCount || 0), 0);
  const issuesCount = issues.length;
  const lastGenerated = sitemaps.length > 0
    ? sitemaps.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0]?.generatedAt
    : null;

  // ---- Columns ----
  const issueColumns = [
    {
      title: 'URL', dataIndex: 'url', key: 'url', width: 280, ellipsis: true,
      render: (u: string) => <Text code style={{ fontSize: 12 }}>{u}</Text>,
    },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 100,
      render: (t: string) => <Tag>{t}</Tag>,
    },
    {
      title: '严重程度', dataIndex: 'severity', key: 'severity', width: 100,
      render: (s: string) => (
        <Tag color={getSeverityColor(s)} icon={getSeverityIcon(s)}>
          {getSeverityLabel(s)}
        </Tag>
      ),
    },
    {
      title: '描述', dataIndex: 'message', key: 'message', ellipsis: true,
      render: (m: string) => <Text>{m}</Text>,
    },
  ];

  // ---- State: no project ----
  if (!hasProject) {
    return (
      <div className="page-container">
        <PageHeader title="站点地图管理" subtitle="请先选择项目" showCountrySelector />
        <EmptyState
          scene="data"
          title="请先选择项目"
          description="选择一个项目开始管理站点地图"
        />
      </div>
    );
  }

  // ---- State: loading ----
  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="站点地图管理"
          subtitle={`${projectName} - 站点地图`}
          showCountrySelector
          actions={<Button icon={<ReloadOutlined />} loading disabled>刷新</Button>}
        />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ---- State: error ----
  if (error && sitemaps.length === 0 && issues.length === 0) {
    return (
      <div className="page-container">
        <PageHeader
          title="站点地图管理"
          subtitle={`${projectName} - 站点地图`}
          showCountrySelector
        />
        <ErrorState message={error} onRetry={loadAll} />
      </div>
    );
  }

  // ---- Render ----
  return (
    <div className="page-container">
      <PageHeader
        title="站点地图管理"
        subtitle={`${projectName} - ${sitemapsCount} 个站点地图 · ${totalUrls} 个 URL`}
        showCountrySelector
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadAll}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { generateForm.resetFields(); setGenerateModalOpen(true); }}>
              生成站点地图
            </Button>
          </Space>
        }
      />

      {/* KPI StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="已生成"
            value={sitemapsCount}
            icon={<FileTextOutlined />}
            color="#1677ff"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="总 URL 数"
            value={totalUrls.toLocaleString()}
            icon={<LinkOutlined />}
            color="#52c41a"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="发现问题"
            value={issuesCount}
            icon={<BugOutlined />}
            color={issuesCount > 0 ? '#ff4d4f' : '#52c41a'}
            subtitle={issuesCount > 0 ? `${issues.filter((i) => i.severity === 'error').length} 个错误` : '无问题'}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="最近生成"
            value={lastGenerated ? new Date(lastGenerated).toLocaleDateString('zh-CN') : '--'}
            icon={<CalendarOutlined />}
            color="#fa8c16"
          />
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ marginTop: 8 }}
        items={[
          {
            key: 'sitemaps',
            label: <span><FileTextOutlined /> 站点地图</span>,
            children: (
              <>
                {sitemaps.length === 0 ? (
                  <EmptyState
                    scene="data"
                    title="暂无站点地图"
                    description="点击「生成站点地图」按钮创建您的第一个站点地图"
                    action={{ text: '生成站点地图', icon: <PlusOutlined />, onClick: () => { generateForm.resetFields(); setGenerateModalOpen(true); } }}
                  />
                ) : (
                  <div>
                    {sitemaps.map((sitemap) => (
                      <Card
                        key={sitemap.id}
                        style={{ marginBottom: 16, borderRadius: 8 }}
                        hoverable
                      >
                        <Row align="middle" gutter={[16, 16]}>
                          <Col xs={24} md={14}>
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                              <Space>
                                <ApartmentOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                                <Text strong style={{ fontSize: 16 }}>{sitemap.url}</Text>
                                {getTypeTag(sitemap.type)}
                              </Space>
                              <Space size={16}>
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                  <LinkOutlined /> {sitemap.urlCount ?? 0} 个 URL
                                </Text>
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                  <CalendarOutlined /> {sitemap.generatedAt ? new Date(sitemap.generatedAt).toLocaleString('zh-CN') : '--'}
                                </Text>
                              </Space>
                            </Space>
                          </Col>
                          <Col xs={24} md={10} style={{ textAlign: 'right' }}>
                            <Space>
                              <Button
                                type="primary"
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownload(sitemap)}
                                loading={downloadingId === sitemap.id}
                              >
                                下载
                              </Button>
                            </Space>
                          </Col>
                        </Row>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ),
          },
          {
            key: 'validate',
            label: <span><SafetyCertificateOutlined /> 验证</span>,
            children: (
              <>
                <Card style={{ marginBottom: 24, borderRadius: 8 }}>
                  <Space.Compact style={{ width: '100%', maxWidth: 600 }}>
                    <Input
                      placeholder="输入站点地图 URL 进行验证，如：https://example.com/sitemap.xml"
                      value={validateUrl}
                      onChange={(e) => setValidateUrl(e.target.value)}
                      onPressEnter={handleValidate}
                      size="large"
                      prefix={<SearchOutlined />}
                    />
                    <Button
                      type="primary"
                      size="large"
                      icon={<SafetyCertificateOutlined />}
                      onClick={handleValidate}
                      loading={validateLoading}
                    >
                      验证
                    </Button>
                  </Space.Compact>
                </Card>

                {validationResult ? (
                  <>
                    {/* Validation summary */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                      <Col xs={12} sm={6}>
                        <Card style={{ borderRadius: 8, textAlign: 'center' }}>
                          <StatCard
                            title="总 URL 数"
                            value={validationResult.totalUrls}
                            color="#1677ff"
                          />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card style={{ borderRadius: 8, textAlign: 'center' }}>
                          <StatCard
                            title="有效 URL"
                            value={validationResult.validUrls}
                            color="#52c41a"
                          />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card style={{ borderRadius: 8, textAlign: 'center' }}>
                          <StatCard
                            title="问题数"
                            value={validationResult.issues?.length ?? 0}
                            color={(validationResult.issues?.length ?? 0) > 0 ? '#ff4d4f' : '#52c41a'}
                          />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card style={{ borderRadius: 8, textAlign: 'center' }}>
                          <StatCard
                            title="状态"
                            value={validationResult.status === 'completed' ? '通过' : '待处理'}
                            color={validationResult.status === 'completed' ? '#52c41a' : '#faad14'}
                          />
                        </Card>
                      </Col>
                    </Row>

                    {/* Validation issues */}
                    {validationResult.issues && validationResult.issues.length > 0 && (
                      <Card
                        title={<><BugOutlined /> 验证问题</>}
                        style={{ borderRadius: 8 }}
                      >
                        <Table
                          columns={issueColumns}
                          dataSource={validationResult.issues}
                          rowKey="id"
                          size="middle"
                          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 个问题` }}
                          scroll={{ x: 700 }}
                        />
                      </Card>
                    )}

                    {(!validationResult.issues || validationResult.issues.length === 0) && (
                      <Card style={{ borderRadius: 8 }}>
                        <EmptyState
                          scene="data"
                          title="验证通过"
                          description="未发现任何问题，站点地图格式正确"
                        />
                      </Card>
                    )}
                  </>
                ) : (
                  <EmptyState
                    scene="data"
                    title="输入 URL 开始验证"
                    description="输入站点地图 URL 后点击验证按钮，系统将检查站点地图的格式和内容"
                  />
                )}
              </>
            ),
          },
          {
            key: 'issues',
            label: (
              <span>
                <BugOutlined /> 问题列表
                {issuesCount > 0 && (
                  <Badge count={issuesCount} size="small" style={{ marginLeft: 8 }} />
                )}
              </span>
            ),
            children: (
              <Card style={{ borderRadius: 8 }}>
                {issues.length === 0 ? (
                  <EmptyState
                    scene="data"
                    title="暂无问题"
                    description="站点地图检查未发现问题，系统运行正常"
                  />
                ) : (
                  <Table
                    columns={issueColumns}
                    dataSource={issues}
                    rowKey="id"
                    size="middle"
                    pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 个问题` }}
                    scroll={{ x: 700 }}
                  />
                )}
              </Card>
            ),
          },
        ]}
      />

      {/* Generate Sitemap Modal */}
      <Modal
        title="生成站点地图"
        open={generateModalOpen}
        onOk={handleGenerateSitemap}
        onCancel={() => { setGenerateModalOpen(false); generateForm.resetFields(); }}
        confirmLoading={generateLoading}
        okText="生成"
        cancelText="取消"
        destroyOnClose
        width={520}
      >
        <Form
          form={generateForm}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="url"
            label="网站 URL"
            rules={[{ required: true, message: '请输入网站 URL' }, { type: 'url', message: '请输入有效的 URL' }]}
          >
            <Input placeholder="https://example.com" prefix={<LinkOutlined />} />
          </Form.Item>
          <Form.Item
            name="type"
            label="站点地图类型"
            rules={[{ required: true, message: '请选择站点地图类型' }]}
            initialValue="xml"
          >
            <Select placeholder="选择类型">
              <Option value="xml">XML Sitemap</Option>
              <Option value="html">HTML Sitemap</Option>
              <Option value="txt">TXT Sitemap</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Sitemap;