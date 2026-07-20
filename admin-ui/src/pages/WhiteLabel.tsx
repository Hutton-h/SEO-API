import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Form, Input, Button, ColorPicker, Typography,
  Space, message, Upload, Divider, Descriptions, Tag,
} from 'antd';
import {
  UploadOutlined, SaveOutlined, GlobalOutlined, ReloadOutlined,
  PictureOutlined, CheckCircleOutlined, InfoCircleOutlined,
  SettingOutlined, LinkOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/common';
import { useStore } from '@/store';
import { whitelabelAPI } from '@/services/whitelabel';

const { Text, Title } = Typography;

// ============================================================================
// Types
// ============================================================================

interface WhiteLabelFormData {
  brandName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  customDomain: string;
  footerText: string;
}

// ============================================================================
// Component
// ============================================================================

const WhiteLabel: React.FC = () => {
  const { branding, setBranding } = useStore();
  const [form] = Form.useForm<WhiteLabelFormData>();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const [previewConfig, setPreviewConfig] = useState({
    brandName: branding.brandName || 'Crane SEO Platform',
    logoUrl: branding.logoUrl || '',
    faviconUrl: '',
    primaryColor: branding.primaryColor || '#1677ff',
    customDomain: branding.customDomain || '',
    footerText: 'Powered by Crane SEO Platform',
  });

  const [savedConfig, setSavedConfig] = useState<WhiteLabelFormData | null>(null);

  // ==========================================================================
  // Data loading
  // ==========================================================================

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await whitelabelAPI.getConfig();
      const data = res || {};
      const cfg: WhiteLabelFormData = {
        brandName: data.brandName || branding.brandName || 'Crane SEO Platform',
        logoUrl: data.logoUrl || branding.logoUrl || '',
        faviconUrl: data.faviconUrl || '',
        primaryColor: data.primaryColor || branding.primaryColor || '#1677ff',
        customDomain: data.customDomain || branding.customDomain || '',
        footerText: data.footerText || '',
      };
      setSavedConfig(cfg);
      setPreviewConfig(cfg);
      form.setFieldsValue(cfg);
      setBranding({
        brandName: cfg.brandName,
        logoUrl: cfg.logoUrl,
        primaryColor: cfg.primaryColor,
        customDomain: cfg.customDomain,
      });
    } catch (err: any) {
      const msg = err?.message || '加载白标配置失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [form, setBranding, branding]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleFormChange = () => {
    const values = form.getFieldsValue();
    setPreviewConfig((prev) => ({
      ...prev,
      brandName: values.brandName ?? prev.brandName,
      logoUrl: values.logoUrl ?? prev.logoUrl,
      faviconUrl: values.faviconUrl ?? prev.faviconUrl,
      primaryColor:
        typeof values.primaryColor === 'string'
          ? values.primaryColor
          : (values.primaryColor as any)?.toHexString?.() ?? prev.primaryColor,
      customDomain: values.customDomain ?? prev.customDomain,
      footerText: values.footerText ?? prev.footerText,
    }));
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const primaryColor =
        typeof values.primaryColor === 'string'
          ? values.primaryColor
          : (values.primaryColor as any)?.toHexString?.() || '#1677ff';

      const payload = {
        brandName: values.brandName,
        logoUrl: values.logoUrl,
        faviconUrl: values.faviconUrl,
        primaryColor,
        customDomain: values.customDomain,
        footerText: values.footerText,
      };

      await whitelabelAPI.updateConfig(payload);
      setSavedConfig(payload);
      setPreviewConfig(payload);
      setBranding({
        brandName: payload.brandName,
        logoUrl: payload.logoUrl,
        primaryColor: payload.primaryColor,
        customDomain: payload.customDomain,
      });
      message.success('白标配置已保存');
    } catch (err: any) {
      if (err?.errorFields) return;
      const msg = err?.message || '保存失败';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLogo = async (file: File) => {
    setUploadingLogo(true);
    try {
      const res: any = await whitelabelAPI.uploadLogo(file);
      const url = res?.url || res?.logoUrl || '';
      if (url) {
        form.setFieldsValue({ logoUrl: url });
        setPreviewConfig((prev) => ({ ...prev, logoUrl: url }));
        message.success('Logo 上传成功');
      }
    } catch (err: any) {
      const msg = err?.message || '上传失败';
      message.error(msg);
    } finally {
      setUploadingLogo(false);
    }
    return false;
  };

  const handleUploadFavicon = async (file: File) => {
    setUploadingFavicon(true);
    try {
      const res: any = await whitelabelAPI.uploadLogo(file);
      const url = res?.url || res?.logoUrl || '';
      if (url) {
        form.setFieldsValue({ faviconUrl: url });
        setPreviewConfig((prev) => ({ ...prev, faviconUrl: url }));
        message.success('Favicon 上传成功');
      }
    } catch (err: any) {
      const msg = err?.message || '上传失败';
      message.error(msg);
    } finally {
      setUploadingFavicon(false);
    }
    return false;
  };

  // ==========================================================================
  // Render: Loading
  // ==========================================================================

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="白标配置"
          subtitle="自定义品牌标识与外观"
        />
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  // ==========================================================================
  // Render: Error
  // ==========================================================================

  if (error) {
    return (
      <div className="page-container">
        <PageHeader
          title="白标配置"
          subtitle="自定义品牌标识与外观"
        />
        <ErrorState
          message={error}
          onRetry={loadConfig}
        />
      </div>
    );
  }

  // ==========================================================================
  // Render: Main
  // ==========================================================================

  return (
    <div className="page-container">
      <PageHeader
        title="白标配置"
        subtitle="自定义品牌标识、域名与外观，打造专属 SEO 平台"
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadConfig}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              保存配置
            </Button>
          </Space>
        }
      />

      <Row gutter={[24, 24]}>
        {/* Left: Form */}
        <Col xs={24} lg={14}>
          <Card title="品牌配置" style={{ borderRadius: 8 }}>
            <Form
              form={form}
              layout="vertical"
              onValuesChange={handleFormChange}
              initialValues={savedConfig || {}}
              size="large"
            >
              <Form.Item
                name="brandName"
                label="品牌名称"
                rules={[{ required: true, message: '请输入品牌名称' }]}
              >
                <Input
                  placeholder="例如：我的 SEO 平台"
                  prefix={<InfoCircleOutlined />}
                />
              </Form.Item>

              <Form.Item name="logoUrl" label="Logo 图片 URL">
                <Input
                  placeholder="https://example.com/logo.png"
                  prefix={<PictureOutlined />}
                />
              </Form.Item>

              <Form.Item label="上传 Logo">
                <Upload
                  listType="picture-card"
                  maxCount={1}
                  beforeUpload={handleUploadLogo}
                  showUploadList={{ showPreviewIcon: true }}
                >
                  {uploadingLogo ? (
                    '上传中...'
                  ) : (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>上传</div>
                    </div>
                  )}
                </Upload>
                {previewConfig.logoUrl && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      当前 Logo 预览:
                    </Text>
                    <br />
                    <img
                      src={previewConfig.logoUrl}
                      alt="logo"
                      style={{
                        marginTop: 4,
                        maxHeight: 40,
                        maxWidth: 200,
                        borderRadius: 4,
                        border: '1px solid #f0f0f0',
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </Form.Item>

              <Form.Item name="faviconUrl" label="Favicon URL">
                <Input
                  placeholder="https://example.com/favicon.ico"
                  prefix={<LinkOutlined />}
                />
              </Form.Item>

              <Form.Item label="上传 Favicon">
                <Upload
                  listType="picture-card"
                  maxCount={1}
                  beforeUpload={handleUploadFavicon}
                  showUploadList={{ showPreviewIcon: true }}
                >
                  {uploadingFavicon ? (
                    '上传中...'
                  ) : (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>上传</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>

              <Form.Item name="primaryColor" label="主色调">
                <ColorPicker showText format="hex" />
              </Form.Item>

              <Form.Item name="customDomain" label="自定义域名">
                <Input
                  placeholder="app.yourcompany.com"
                  prefix={<GlobalOutlined />}
                />
              </Form.Item>

              <Form.Item name="footerText" label="页脚文本">
                <Input.TextArea
                  rows={2}
                  placeholder="页脚自定义文本，例如：© 2024 Your Company"
                />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Right: Preview */}
        <Col xs={24} lg={10}>
          <Card
            title="实时预览"
            style={{ borderRadius: 8, position: 'sticky', top: 80 }}
          >
            <div
              style={{
                border: '1px solid #e8e8e8',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              }}
            >
              {/* Preview Header */}
              <div
                style={{
                  background: previewConfig.primaryColor,
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {previewConfig.logoUrl ? (
                    <img
                      src={previewConfig.logoUrl}
                      alt="logo"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        objectFit: 'cover',
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 'bold',
                      }}
                    >
                      {(previewConfig.brandName || 'C')[0]}
                    </div>
                  )}
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
                    {previewConfig.brandName || 'Crane SEO Platform'}
                  </Text>
                </div>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 12,
                  }}
                >
                  U
                </div>
              </div>

              {/* Preview Body */}
              <div style={{ display: 'flex', minHeight: 220 }}>
                {/* Sidebar */}
                <div
                  style={{
                    width: 56,
                    background: '#fafafa',
                    borderRight: '1px solid #f0f0f0',
                    padding: '12px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: i === 1 ? `${previewConfig.primaryColor}20` : '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: i === 1 ? previewConfig.primaryColor : '#bfbfbf',
                        fontSize: 14,
                      }}
                    >
                      {i === 1 ? <SettingOutlined /> : null}
                    </div>
                  ))}
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: 16 }}>
                  <div
                    style={{
                      background: '#f5f5f5',
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        height: 8,
                        width: '60%',
                        background: '#e8e8e8',
                        borderRadius: 4,
                        marginBottom: 8,
                      }}
                    />
                    <div
                      style={{
                        height: 8,
                        width: '40%',
                        background: '#e8e8e8',
                        borderRadius: 4,
                      }}
                    />
                  </div>

                  {/* Stat Cards Preview */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          background: '#fff',
                          borderRadius: 8,
                          border: `1px solid #f0f0f0`,
                          borderTop: `3px solid ${previewConfig.primaryColor}`,
                          padding: 10,
                        }}
                      >
                        <div
                          style={{
                            height: 5,
                            width: 40,
                            background: '#e8e8e8',
                            borderRadius: 3,
                            marginBottom: 8,
                          }}
                        />
                        <div
                          style={{
                            fontSize: 20,
                            fontWeight: 700,
                            color: previewConfig.primaryColor,
                          }}
                        >
                          {i === 1 ? '87%' : '1,234'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Table Row Preview */}
                  <div
                    style={{
                      background: '#fff',
                      borderRadius: 8,
                      border: '1px solid #f0f0f0',
                      padding: '8px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div
                        style={{
                          height: 6,
                          width: 80,
                          background: '#e8e8e8',
                          borderRadius: 3,
                        }}
                      />
                      <div
                        style={{
                          height: 6,
                          width: 60,
                          background: '#e8e8e8',
                          borderRadius: 3,
                        }}
                      />
                      <div
                        style={{
                          height: 6,
                          width: 40,
                          background: `${previewConfig.primaryColor}40`,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Footer */}
              <div
                style={{
                  borderTop: '1px solid #f0f0f0',
                  padding: '10px 16px',
                  textAlign: 'center',
                  background: '#fafafa',
                }}
              >
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {previewConfig.footerText || 'Powered by Crane SEO Platform'}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 10 }}>
                  {previewConfig.customDomain
                    ? `https://${previewConfig.customDomain}`
                    : 'app.example.com'}
                </Text>
              </div>
            </div>

            <Divider />

            <Descriptions column={1} size="small" title="配置摘要">
              <Descriptions.Item label="品牌名称">
                <Text strong>{previewConfig.brandName || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="主色调">
                <Tag color={previewConfig.primaryColor}>
                  {previewConfig.primaryColor}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="自定义域名">
                {previewConfig.customDomain || '未设置'}
              </Descriptions.Item>
              <Descriptions.Item label="Logo">
                {previewConfig.logoUrl ? (
                  <Text type="success">
                    <CheckCircleOutlined /> 已设置
                  </Text>
                ) : (
                  <Text type="secondary">未设置</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Favicon">
                {previewConfig.faviconUrl ? (
                  <Text type="success">
                    <CheckCircleOutlined /> 已设置
                  </Text>
                ) : (
                  <Text type="secondary">未设置</Text>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default WhiteLabel;