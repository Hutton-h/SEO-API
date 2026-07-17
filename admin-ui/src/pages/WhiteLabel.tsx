import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Form, Input, Button, ColorPicker, Switch, Typography,
  Space, message, Upload, Divider, Descriptions, Tag, Alert, Spin, Empty,
} from 'antd';
import {
  UploadOutlined, SaveOutlined, GlobalOutlined, ReloadOutlined,
  PictureOutlined, CheckCircleOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { useStore } from '@/store';
import { whitelabelAPI } from '@/services/whitelabel';
import PageHeader from '@/components/PageHeader';

const { Text, Title } = Typography;

interface WhitelabelConfig {
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  customDomain: string;
  enabled?: boolean;
}

const WhiteLabel: React.FC = () => {
  const { setBranding } = useStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [domainVerified, setDomainVerified] = useState<boolean | null>(null);
  const [config, setConfig] = useState<WhitelabelConfig>({
    brandName: '',
    logoUrl: '',
    primaryColor: '#1677ff',
    customDomain: '',
    enabled: false,
  });
  const [previewConfig, setPreviewConfig] = useState<WhitelabelConfig>({
    brandName: '',
    logoUrl: '',
    primaryColor: '#1677ff',
    customDomain: '',
  });

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await whitelabelAPI.getConfig();
      const data = (res as any).data || res;
      const cfg: WhitelabelConfig = {
        brandName: data.brandName || '',
        logoUrl: data.logoUrl || '',
        primaryColor: data.primaryColor || '#1677ff',
        customDomain: data.customDomain || '',
        enabled: data.enabled ?? false,
      };
      setConfig(cfg);
      setPreviewConfig(cfg);
      form.setFieldsValue({
        brandName: cfg.brandName,
        logoUrl: cfg.logoUrl,
        primaryColor: cfg.primaryColor,
        customDomain: cfg.customDomain,
        enabled: cfg.enabled,
      });
      setBranding?.(cfg);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [form, setBranding]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleRefresh = () => {
    loadConfig();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload: WhitelabelConfig = {
        brandName: values.brandName,
        logoUrl: values.logoUrl,
        primaryColor: typeof values.primaryColor === 'string' ? values.primaryColor : values.primaryColor?.toHexString?.() || '#1677ff',
        customDomain: values.customDomain,
        enabled: values.enabled,
      };
      await whitelabelAPI.updateConfig(payload);
      setConfig(payload);
      setPreviewConfig(payload);
      setBranding?.(payload);
      message.success('白标配置已保存');
    } catch (err: any) {
      if (err?.errorFields) {
        // form validation error - do nothing
        return;
      }
      const msg = err?.response?.data?.error?.message || err?.message || '保存失败';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = () => {
    const values = form.getFieldsValue();
    setPreviewConfig({
      brandName: values.brandName || config.brandName,
      logoUrl: values.logoUrl || config.logoUrl,
      primaryColor: typeof values.primaryColor === 'string' ? values.primaryColor : values.primaryColor?.toHexString?.() || config.primaryColor,
      customDomain: values.customDomain || config.customDomain,
    });
  };

  const handleUploadLogo = async (file: File) => {
    try {
      const res = await whitelabelAPI.uploadLogo(file);
      const data = (res as any).data || res;
      const url = data.url || data.logoUrl || '';
      if (url) {
        form.setFieldsValue({ logoUrl: url });
        setPreviewConfig((prev) => ({ ...prev, logoUrl: url }));
        message.success('Logo 上传成功');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '上传失败';
      message.error(msg);
    }
    return false; // prevent default upload behavior
  };

  const handleVerifyDomain = async () => {
    const domain = form.getFieldValue('customDomain');
    if (!domain) {
      message.warning('请先输入自定义域名');
      return;
    }
    setVerifyingDomain(true);
    setDomainVerified(null);
    try {
      const res = await whitelabelAPI.verifyDomain(domain);
      const data = (res as any).data || res;
      const valid = data.valid ?? data.success ?? false;
      setDomainVerified(valid);
      if (valid) {
        message.success('域名验证通过');
      } else {
        message.warning('域名验证未通过，请检查 DNS 配置');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '验证失败';
      message.error(msg);
      setDomainVerified(false);
    } finally {
      setVerifyingDomain(false);
    }
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="白标配置"
          subtitle="自定义品牌标识与外观"
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
          title="白标配置"
          subtitle="自定义品牌标识与外观"
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

  return (
    <div className="page-container">
      <PageHeader
        title="白标配置"
        subtitle="自定义品牌标识与外观"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
          { label: '保存配置', type: 'primary', icon: <SaveOutlined />, onClick: handleSave, loading: saving },
        ]}
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card title="品牌配置">
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                brandName: config.brandName,
                logoUrl: config.logoUrl,
                primaryColor: config.primaryColor,
                customDomain: config.customDomain,
                enabled: config.enabled,
              }}
              onValuesChange={handleFormChange}
              size="large"
            >
              <Form.Item
                name="brandName"
                label="品牌名称"
                rules={[{ required: true, message: '请输入品牌名称' }]}
              >
                <Input placeholder="例如：我的SEO平台" prefix={<InfoCircleOutlined />} />
              </Form.Item>

              <Form.Item
                name="logoUrl"
                label="Logo URL"
                rules={[{ type: 'url', message: '请输入有效的URL' }]}
              >
                <Input placeholder="https://example.com/logo.png" prefix={<PictureOutlined />} />
              </Form.Item>

              <Form.Item name="logoFile" label="上传 Logo">
                <Upload
                  listType="picture-card"
                  maxCount={1}
                  beforeUpload={handleUploadLogo}
                  showUploadList={{ showPreviewIcon: true }}
                >
                  <div>
                    <UploadOutlined />
                    <div style={{ marginTop: 8 }}>上传</div>
                  </div>
                </Upload>
              </Form.Item>

              <Form.Item name="primaryColor" label="主色调">
                <ColorPicker showText format="hex" />
              </Form.Item>

              <Form.Item
                label="自定义域名"
              >
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item name="customDomain" noStyle>
                    <Input placeholder="app.yourcompany.com" prefix={<GlobalOutlined />} />
                  </Form.Item>
                  <Button
                    icon={<CheckCircleOutlined />}
                    onClick={handleVerifyDomain}
                    loading={verifyingDomain}
                  >
                    验证
                  </Button>
                </Space.Compact>
                {domainVerified === true && (
                  <Text type="success" style={{ fontSize: 12 }}>
                    <CheckCircleOutlined /> 域名验证通过
                  </Text>
                )}
                {domainVerified === false && (
                  <Text type="danger" style={{ fontSize: 12 }}>
                    域名验证失败，请检查配置
                  </Text>
                )}
              </Form.Item>

              <Divider />

              <Form.Item name="enabled" label="启用白标" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="实时预览" style={{ position: 'sticky', top: 80 }}>
            <div
              style={{
                border: '1px solid #e8e8e8',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              }}
            >
              {/* 预览 Header */}
              <div
                style={{
                  background: previewConfig.primaryColor,
                  padding: '16px 20px',
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
                      style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 32, height: 32, borderRadius: 6,
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 14, fontWeight: 'bold',
                      }}
                    >
                      {previewConfig.brandName.charAt(0)}
                    </div>
                  )}
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
                    {previewConfig.brandName || '平台名称'}
                  </Text>
                </div>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
              </div>

              {/* 预览 Sidebar */}
              <div style={{ display: 'flex', minHeight: 200 }}>
                <div style={{ width: 60, background: '#fafafa', borderRight: '1px solid #f0f0f0', padding: '12px 8px' }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      style={{
                        height: 8, borderRadius: 4, marginBottom: 12,
                        background: i === 1 ? previewConfig.primaryColor : '#e8e8e8',
                      }}
                    />
                  ))}
                </div>

                {/* 预览 Content */}
                <div style={{ flex: 1, padding: 16 }}>
                  <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                    <div style={{ height: 8, width: '60%', background: '#e8e8e8', borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ height: 8, width: '40%', background: '#e8e8e8', borderRadius: 4 }} />
                  </div>

                  {/* 预览卡片 */}
                  <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', padding: 12, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ height: 6, width: 60, background: '#e8e8e8', borderRadius: 3, marginBottom: 6 }} />
                        <div style={{ fontSize: 22, fontWeight: 700, color: previewConfig.primaryColor }}>87%</div>
                      </div>
                      <div
                        style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: `${previewConfig.primaryColor}15`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <CheckCircleOutlined style={{ color: previewConfig.primaryColor, fontSize: 18 }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 预览 Footer */}
              <div style={{ borderTop: '1px solid #f0f0f0', padding: '10px 16px', textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {previewConfig.customDomain ? `https://${previewConfig.customDomain}` : 'app.example.com'}
                </Text>
              </div>
            </div>

            <Divider />

            <Descriptions column={1} size="small" title="配置摘要">
              <Descriptions.Item label="品牌名称">{previewConfig.brandName}</Descriptions.Item>
              <Descriptions.Item label="主色调">
                <Tag color={previewConfig.primaryColor}>{previewConfig.primaryColor}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="自定义域名">
                {previewConfig.customDomain || '未设置'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default WhiteLabel;