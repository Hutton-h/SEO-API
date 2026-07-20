import React from 'react';
import { Typography, Space, Breadcrumb, Divider, Tooltip } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import CountrySelector from './CountrySelector';
import DateRangePicker from './DateRangePicker';

const { Title, Text } = Typography;

// ============================================================================
// Types
// ============================================================================

export interface PageHeaderProps {
  /** 页面标题 */
  title: string;
  /** 副标题/描述 */
  subtitle?: string;
  /** 面包屑 */
  breadcrumb?: Array<{ title: string; path?: string }>;
  /** 右侧操作区域 */
  actions?: React.ReactNode;
  /** 是否显示国家/地区选择器 */
  showCountrySelector?: boolean;
  /** 是否显示日期范围选择器 */
  showDateRange?: boolean;
  /** 是否同时显示搜索引擎选择器 */
  showSearchEngine?: boolean;
  /** 额外内容（渲染在标题行下方） */
  extra?: React.ReactNode;
}

// ============================================================================
// Component
// ============================================================================

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumb,
  actions,
  showCountrySelector = false,
  showDateRange = false,
  showSearchEngine = false,
  extra,
}) => {
  // 是否显示筛选栏（有任意筛选器开启时）
  const showFilters = showCountrySelector || showDateRange;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* 面包屑 */}
      {breadcrumb && breadcrumb.length > 0 && (
        <Breadcrumb
          style={{ marginBottom: 12 }}
          items={[
            {
              title: (
                <Tooltip title="首页">
                  <HomeOutlined />
                </Tooltip>
              ),
            },
            ...breadcrumb.map((item) => ({
              title: item.path ? (
                <a href={item.path} style={{ color: 'inherit' }}>
                  {item.title}
                </a>
              ) : (
                item.title
              ),
            })),
          ]}
        />
      )}

      {/* 标题行 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {/* 左侧：标题 + 副标题 */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <Title level={3} style={{ margin: 0, marginBottom: 4, fontWeight: 600 }}>
            {title}
          </Title>
          {subtitle && (
            <Text type="secondary" style={{ fontSize: 14, display: 'block' }}>
              {subtitle}
            </Text>
          )}
        </div>

        {/* 右侧：操作区 */}
        <div style={{ flexShrink: 0 }}>
          <Space wrap size={12}>
            {actions}
          </Space>
        </div>
      </div>

      {/* 筛选栏：国家选择 + 日期范围 */}
      {showFilters && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginTop: 16,
          }}
        >
          {showCountrySelector && (
            <CountrySelector showSearchEngine={showSearchEngine} />
          )}
          {showDateRange && (
            <DateRangePicker presets={['7d', '30d', '90d']} />
          )}
        </div>
      )}

      {/* 额外内容 */}
      {extra && (
        <>
          <Divider style={{ margin: '16px 0 0' }} />
          <div style={{ marginTop: 12 }}>{extra}</div>
        </>
      )}
    </div>
  );
};

export default PageHeader;