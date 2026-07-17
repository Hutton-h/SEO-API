import React, { useState } from 'react';
import {
  Card, Row, Col, Button, Typography, Space, message, Result, Tree, Collapse,
  Tag, Table, Statistic, Divider, Descriptions, Alert,
} from 'antd';
import {
  ReloadOutlined, FileTextOutlined, CheckCircleOutlined, WarningOutlined,
  CloseCircleOutlined, DownloadOutlined, CloudUploadOutlined, ClockCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;

const mockSitemapData = {
  lastGenerated: '2024-07-15T06:00:00',
  totalUrls: 2547,
  xmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2024-07-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2024-07-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://example.com/blog/</loc>
    <lastmod>2024-07-14</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://example.com/blog/seo-tips</loc>
    <lastmod>2024-07-13</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://example.com/services/seo-audit</loc>
    <lastmod>2024-07-12</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://example.com/contact</loc>
    <lastmod>2024-06-01</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`,
  validationErrors: [
    { type: 'missing_lastmod', message: 'URL /products 缺少 lastmod 标签', line: 128 },
    { type: 'invalid_freq', message: 'URL /blog/old-post 的 changefreq 值无效', line: 340 },
  ],
  validationWarnings: [
    { type: 'low_priority', message: 'URL /archive 的 priority 值过低 (0.1)', line: 520 },
    { type: 'orphan_url', message: 'URL /hidden-page 不在站点导航中', line: 680 },
    { type: 'large_size', message: 'Sitemap 文件超过 50MB 建议拆分', line: 0 },
  ],
};

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

const Sitemap: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sitemapData, setSitemapData] = useState(mockSitemapData);
  const [validating, setValidating] = useState(false);

  const handleRefresh = () => { setLoading(true); setTimeout(() => setLoading(false), 800); };

  const handleGenerate = () => {
    setGenerating(true);
    message.loading({ content: '正在生成 Sitemap...', key: 'gen' });
    setTimeout(() => {
      setGenerating(false);
      setSitemapData({ ...sitemapData, lastGenerated: dayjs().format('YYYY-MM-DDTHH:mm:ss') });
      message.success({ content: 'Sitemap 生成成功', key: 'gen' });
    }, 2000);
  };

  const handleValidate = () => {
    setValidating(true);
    message.loading({ content: '正在验证 Sitemap...', key: 'val' });
    setTimeout(() => {
      setValidating(false);
      message.success({ content: '验证完成', key: 'val' });
    }, 1500);
  };

  const handleDownload = () => {
    message.success('Sitemap 下载已开始');
  };

  const urls = parseXmlToTree(sitemapData.xmlContent);
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

  const hasErrors = sitemapData.validationErrors.length > 0;
  const validationStatus = hasErrors ? 'error' : sitemapData.validationWarnings.length > 0 ? 'warning' : 'success';

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
          <Card><Statistic title="Sitemap URL 数" value={sitemapData.totalUrls} valueStyle={{ color: '#1677ff' }} prefix={<FileTextOutlined />} /></Card>
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
          <Card><Statistic title="错误数" value={sitemapData.validationErrors.length} valueStyle={{ color: sitemapData.validationErrors.length > 0 ? '#ff4d4f' : '#52c41a' }} prefix={<CloseCircleOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="上次生成" value={sitemapData.lastGenerated ? dayjs(sitemapData.lastGenerated).format('MM-DD HH:mm') : '未生成'} valueStyle={{ fontSize: 16 }} prefix={<ClockCircleOutlined />} />
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
                {sitemapData.xmlContent}
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
            {sitemapData.validationErrors.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ color: '#ff4d4f' }}>
                  <CloseCircleOutlined /> 错误 ({sitemapData.validationErrors.length})
                </Text>
                {sitemapData.validationErrors.map((err, i) => (
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

            {sitemapData.validationWarnings.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ color: '#faad14' }}>
                  <WarningOutlined /> 警告 ({sitemapData.validationWarnings.length})
                </Text>
                {sitemapData.validationWarnings.map((warn, i) => (
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

            {sitemapData.validationErrors.length === 0 && sitemapData.validationWarnings.length === 0 && (
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