import React, { useState } from 'react';
import {
  Card, Row, Col, Form, Input, Button, ColorPicker, Switch, Typography,
  Space, message, Upload, Divider, Descriptions, Tag,
} from 'antd';
import {
  UploadOutlined, SaveOutlined, GlobalOutlined, ReloadOutlined,
  PictureOutlined, CheckCircleOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { useStore } from '@/store';
import PageHeader from '@/components/PageHeader';

const { Text, Title } = Typography;

const WhiteLabel: React.FC = () => {
  const { branding, setBranding } = useStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewConfig, setPreviewConfig] = useState({
    brandName: branding.brandName,
    logoUrl: branding.logoUrl,
    primaryColor: branding.primaryColor,
    customDomain: branding.customDomain,
  });

  const handleSave = () => {
    form.validateFields().then((values) => {
      setSaving(true);
      const config = {
        brandName: values.brandName,
        logoUrl: values.logoUrl,
        primaryColor: typeof values.primaryColor === 'string' ? values.primaryColor : values.primaryColor?.toHexString?.() || '#1677ff',
        customDomain: values.customDomain,
      };
      setTimeout(() => {
        setBranding(config);
        setPreviewConfig(config);
        setSaving(false);
        message.success('白标配置已保存');
      }, 800);
    });
  };

  const handleRefresh = () => {
    setLoading(true);
    form.setFieldsValue({
      brandName: branding.brandName,
      logoUrl: branding.logoUrl,
      primaryColor: branding.primaryColor,
      customDomain: branding.customDomain,
    });
    setPreviewConfig({
      brandName: branding.brandName,
      logoUrl: branding.logoUrl,
      primaryColor: branding.primaryColor,
      customDomain: branding.customDomain,
    });
    setTimeout(() => setLoading(false), 500);
  };

  const handleFormChange = () => {
    const values = form.getFieldsValue();
    setPreviewConfig({
      brandName: values.brandName || branding.brandName,
      logoUrl: values.logoUrl || branding.logoUrl,
      primaryColor: typeof values.primaryColor === 'string' ? values.primaryColor : values.primaryColor?.toHexString?.() || branding.primaryColor,
      customDomain: values.customDomain || branding.customDomain,
    });
  };

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
                brandName: branding.brandName,
                logoUrl: branding.logoUrl,
                primaryColor: branding.primaryColor,
                customDomain: branding.customDomain,
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
                  beforeUpload={() => false}
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

              <Form.Item name="customDomain" label="自定义域名">
                <Input placeholder="app.yourcompany.com" prefix={<GlobalOutlined />} />
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