import React from 'react';
import { Button, Typography, Collapse } from 'antd';
import {
  ExclamationCircleOutlined,
  ReloadOutlined,
  BugOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { message as antMessage } from 'antd';

const { Title, Text, Paragraph } = Typography;

// ============================================================================
// Types
// ============================================================================

export interface ErrorStateProps {
  /** 错误信息 */
  message?: string;
  /** 重试回调 */
  onRetry?: () => void;
  /** 详细错误信息（技术细节，可折叠） */
  details?: string;
  /** 自定义图标 */
  icon?: React.ReactNode;
  /** 错误代码 */
  errorCode?: string | number;
  /** 重试按钮文案 */
  retryText?: string;
  /** 是否显示复制错误详情按钮 */
  showCopyDetails?: boolean;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

// ============================================================================
// Component
// ============================================================================

const ErrorState: React.FC<ErrorStateProps> = ({
  message = '数据加载失败',
  onRetry,
  details,
  icon,
  errorCode,
  retryText = '重试',
  showCopyDetails = false,
  style,
}) => {
  const handleCopyDetails = () => {
    const text = [
      errorCode && `错误代码: ${errorCode}`,
      message && `错误信息: ${message}`,
      details && `详细: ${details}`,
    ]
      .filter(Boolean)
      .join('\n');

    if (text) {
      navigator.clipboard.writeText(text).then(
        () => antMessage.success('错误详情已复制到剪贴板'),
        () => antMessage.error('复制失败')
      );
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
        minHeight: 200,
        ...style,
      }}
    >
      {/* 图标 */}
      <div style={{ marginBottom: 16 }}>
        {icon ?? (
          <ExclamationCircleOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
        )}
      </div>

      {/* 错误代码 */}
      {errorCode && (
        <Text
          type="secondary"
          style={{ fontSize: 12, marginBottom: 4, fontFamily: 'monospace' }}
        >
          #{errorCode}
        </Text>
      )}

      {/* 标题 */}
      <Title level={5} style={{ margin: '0 0 8px', color: '#262626', fontWeight: 500 }}>
        出错了
      </Title>

      {/* 错误信息 */}
      <Text
        type="secondary"
        style={{
          fontSize: 14,
          maxWidth: 400,
          lineHeight: '22px',
          marginBottom: 20,
          display: 'block',
          wordBreak: 'break-word',
        }}
      >
        {message}
      </Text>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {onRetry && (
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={onRetry}
          >
            {retryText}
          </Button>
        )}

        {showCopyDetails && details && (
          <Button
            icon={<CopyOutlined />}
            onClick={handleCopyDetails}
          >
            复制详情
          </Button>
        )}
      </div>

      {/* 详细错误信息（可折叠） */}
      {details && (
        <div style={{ marginTop: 20, maxWidth: 500, width: '100%', textAlign: 'left' }}>
          <Collapse
            ghost
            size="small"
            items={[
              {
                key: 'error-details',
                label: (
                  <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                    <BugOutlined style={{ marginRight: 4 }} />
                    技术详情
                  </span>
                ),
                children: (
                  <Paragraph
                    copyable
                    style={{
                      fontSize: 12,
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      margin: 0,
                      color: '#595959',
                      background: '#fafafa',
                      padding: 8,
                      borderRadius: 4,
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    {details}
                  </Paragraph>
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
};

export default ErrorState;