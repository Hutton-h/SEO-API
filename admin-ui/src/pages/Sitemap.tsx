import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Button, Typography, Space, message, Result, Tree, Collapse,
  Tag, Table, Statistic, Divider, Descriptions, Alert, Spin, Empty,
} from 'antd';
import {
  ReloadOutlined, FileTextOutlined, CheckCircleOutlined, WarningOutlined,
  CloseCircleOutlined, DownloadOutlined, CloudUploadOutlined, ClockCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import { sitemapAPI } from '@/services/sitemap';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;

const parseXmlToTree = (xml: string) => {
  const urls: { loc: string; lastmod: string; changefreq: string; priority: string }[] = [];
  const regex = /<url>([\s\S]*?)<\/url>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const block = match[1];
    const loc = block.match(/<loc>(.*?)<\/loc>/)?.[1] || '';
    const lastmod = block.match(/<lastmod>(.*?)<\/lastmod>/)?.[1] || '';
    const changefreq = block.match(/<changefreq>(.*?)<\/changefreq>/)?.[1] || '';
    const priority = block.match(/<priority>(.*?)<\/priority>/)?.[1] || '';
    urls.push({ loc, lastmod, changefreq, priority });
  }
  return urls;
};

interface ValidationIssue {
  type: string;
  message: string;
  line: number;
}

interface SitemapInfo {
  lastGenerated: string | null;
  totalUrls: number;
  xmlContent: string;
}

const Sitemap: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sitemapInfo, setSitemapInfo] = useState<SitemapInfo | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationIssue[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<ValidationIssue[]>([]);
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);

  const loadSitemapData = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [infoRes, validationRes] = await Promise.all([
        sitemapAPI.getSitemapInfo(projectId),
        sitemapAPI.validateSitemap(projectId),
      ]);
      const info = (infoRes as any).data || infoRes;
      const validation = (validationRes as any).data || validationRes;
      setSitemapInfo({
        lastGenerated: info.lastGenerated || null,
        totalUrls: info.totalUrls || 0,
        xmlContent: info.xmlContent || '',
      });
      setValidationErrors(validation.errors || []);
      setValidationWarnings(validation.warnings || []);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSitemapData();
  }, [loadSitemapData]);

  const handleRefresh = () => {
    loadSitemapData();
  };

  const handleGenerate = async () => {
    if (!projectId) return;
    setGenerating(true);
    message.loading({ content: '正在生成 Sitemap...', key: 'gen' });
    try {
      await sitemapAPI.generateSitemap(projectId);
      message.success({ content: 'Sitemap 生成成功', key: 'gen' });
      await loadSitemapData();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '生成失败';
      message.error({ content: msg, key: 'gen' });
    } finally {
      setGenerating(false);
    }
  };

  const handleValidate = async () => {
    if (!projectId) return;
    setValidating(true);
    message.loading({ content: '正在验证 Sitemap...', key: 'val' });
    try {
      const res = await sitemapAPI.validateSitemap(projectId);
      const validation = (res as any).data || res;
      setValidationErrors(validation.errors || []);
      setValidationWarnings(validation.warnings || []);
      message.success({ content: '验证完成', key: 'val' });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '验证失败';
      message.error({ content: msg, key: 'val' });
    } finally {
      setValidating(false);
    }
  };

  const handleDownload = async () => {
    if (!projectId) return;
    try {
      await sitemapAPI.downloadSitemap(projectId);
      message.success('Sitemap 下载已开始');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '下载失败';
      message.error(msg);
    }
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="Sitemap 管理"
          subtitle="生成、预览和验证 XML Sitemap"
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
          title="Sitemap 管理"
          subtitle="生成、预览和验证 XML Sitemap"
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
          title="Sitemap 管理"
          subtitle="生成、预览和验证 XML Sitemap"
        />
        <Empty description="请先选择一个项目" />
      </div>
    );
  }

  // ---- Empty state (no sitemap data) ----
  if (!sitemapInfo) {
    return (
      <div className="page-container">
        <PageHeader
          title="Sitemap 管理"
          subtitle="生成、预览和验证 XML Sitemap"
          actions={[
            { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh },
            { label: '生成 Sitemap', type: 'primary', icon: <CloudUploadOutlined />, onClick: handleGenerate, loading: generating },
          ]}
        />
        <Empty description="暂无 Sitemap 数据">
          <Button type="primary" icon={<CloudUploadOutlined />} onClick={handleGenerate} loading={generating}>
            生成 Sitemap
          </Button>
        </Empty>
      </div>
    );
  }

  const urls = parseXmlToTree(sitemapInfo.xmlContent);
  const treeData = urls.map((url, idx) => ({
    title: (
      <Space size="small">
        <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>{url.loc}</Text>
        <Tag color="blue" style={{ fontSize: 10 }}>{url.changefreq}</Tag>
        <Tag color="green" style={{ fontSize: 10 }}>P{url.priority}</Tag>
      </Space>
    ),
    key: `url-${idx}`,
    children: [
      { title: <Text type="secondary" style={{ fontSize: 11 }}>lastmod: {url.lastmod}</Text>, key: `url-${idx}-1`, isLeaf: true },
    ],
  }));

  const hasErrors = validationErrors.length > 0;
  const validationStatus = hasErrors ? 'error' : validationWarnings.length > 0 ? 'warning' : 'success';

  return (
    <div className="page-container">
      <PageHeader
        title="Sitemap 管理"
        subtitle="生成、预览和验证 XML Sitemap"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          { label: '生成 Sitemap', type: 'primary', icon: <CloudUploadOutlined />, onClick: handleGenerate, loading: generating },
          { label: '验证', icon: <CheckCircleOutlined />, onClick: handleValidate, loading: validating },
          { label: '下载', icon: <DownloadOutlined />, onClick: handleDownload },
        ]}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card><Statistic title="Sitemap URL 数" value={sitemapInfo.totalUrls} valueStyle={{ color: '#1677ff' }} prefix={<FileTextOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="验证状态"
              value={validationStatus === 'success' ? '通过' : validationStatus === 'warning' ? '警告' : '错误'}
              valueStyle={{ color: validationStatus === 'success' ? '#52c41a' : validationStatus === 'warning' ? '#faad14' : '#ff4d4f' }}
              prefix={validationStatus === 'success' ? <CheckCircleOutlined /> : validationStatus === 'warning' ? <WarningOutlined /> : <CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="错误数" value={validationErrors.length} valueStyle={{ color: validationErrors.length > 0 ? '#ff4d4f' : '#52c41a' }} prefix={<CloseCircleOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="上次生成" value={sitemapInfo.lastGenerated ? dayjs(sitemapInfo.lastGenerated).format('MM-DD HH:mm') : '未生成'} valueStyle={{ fontSize: 16 }} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card
            title="Sitemap 内容预览"
            extra={<Text type="secondary">{urls.length} 个 URL</Text>}
          >
            <div style={{ maxHeight: 500, overflow: 'auto', background: '#fafafa', borderRadius: 8, padding: 16 }}>
              <pre style={{ margin: 0, fontSize: 11, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {sitemapInfo.xmlContent}
              </pre>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="URL 树形结构" style={{ marginBottom: 24 }}>
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              <Tree
                treeData={treeData}
                defaultExpandAll
                showLine={{ showLeafIcon: false }}
              />
            </div>
          </Card>

          <Card title="验证结果">
            {validationErrors.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ color: '#ff4d4f' }}>
                  <CloseCircleOutlined /> 错误 ({validationErrors.length})
                </Text>
                {validationErrors.map((err, i) => (
                  <Alert
                    key={i}
                    message={`第 ${err.line} 行: ${err.message}`}
                    type="error"
                    showIcon
                    style={{ marginTop: 8 }}
                  />
                ))}
              </div>
            )}

            {validationWarnings.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ color: '#faad14' }}>
                  <WarningOutlined /> 警告 ({validationWarnings.length})
                </Text>
                {validationWarnings.map((warn, i) => (
                  <Alert
                    key={i}
                    message={`第 ${warn.line} 行: ${warn.message}`}
                    type="warning"
                    showIcon
                    style={{ marginTop: 8 }}
                  />
                ))}
              </div>
            )}

            {validationErrors.length === 0 && validationWarnings.length === 0 && (
              <Result
                status="success"
                title="Sitemap 验证通过"
                subTitle="所有 URL 格式正确，无错误或警告"
                icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Sitemap;