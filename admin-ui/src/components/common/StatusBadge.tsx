import React from 'react';
import { Tag, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  PauseCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  StopOutlined,
  SyncOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';

// ============================================================================
// Types
// ============================================================================

export type StatusType =
  | 'active'
  | 'paused'
  | 'error'
  | 'warning'
  | 'success'
  | 'pending'
  | 'archived';

export interface StatusBadgeProps {
  /** 状态类型 */
  status: StatusType;
  /** 自定义文本，不传则使用默认文案 */
  text?: string;
  /** 是否显示图标 */
  showIcon?: boolean;
  /** 是否显示为圆点 + 文字（无边框背景） */
  dot?: boolean;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

// ============================================================================
// Status config
// ============================================================================

interface StatusConfig {
  color: string;
  icon: React.ReactNode;
  defaultText: string;
}

const STATUS_CONFIG: Record<StatusType, StatusConfig> = {
  active: {
    color: 'green',
    icon: <CheckCircleOutlined />,
    defaultText: '运行中',
  },
  paused: {
    color: 'orange',
    icon: <PauseCircleOutlined />,
    defaultText: '已暂停',
  },
  error: {
    color: 'red',
    icon: <CloseCircleOutlined />,
    defaultText: '异常',
  },
  warning: {
    color: 'gold',
    icon: <WarningOutlined />,
    defaultText: '警告',
  },
  success: {
    color: 'green',
    icon: <CheckCircleOutlined />,
    defaultText: '成功',
  },
  pending: {
    color: 'blue',
    icon: <ClockCircleOutlined />,
    defaultText: '待处理',
  },
  archived: {
    color: 'default',
    icon: <StopOutlined />,
    defaultText: '已归档',
  },
};

// ============================================================================
// Dot style
// ============================================================================

const DOT_COLORS: Record<StatusType, string> = {
  active: '#52c41a',
  paused: '#fa8c16',
  error: '#ff4d4f',
  warning: '#faad14',
  success: '#52c41a',
  pending: '#1677ff',
  archived: '#bfbfbf',
};

// ============================================================================
// Component
// ============================================================================

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  showIcon = true,
  dot = false,
  style,
}) => {
  const config = STATUS_CONFIG[status];
  const displayText = text ?? config.defaultText;

  // 圆点模式
  if (dot) {
    return (
      <Tooltip title={displayText}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'default',
            ...style,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: DOT_COLORS[status],
              flexShrink: 0,
              ...(status === 'active' || status === 'pending'
                ? {
                    boxShadow: `0 0 0 2px ${DOT_COLORS[status]}33`,
                    animation: 'statusPulse 2s ease-in-out infinite',
                  }
                : {}),
            }}
          />
          <span style={{ fontSize: 13, color: '#595959' }}>{displayText}</span>
        </span>
      </Tooltip>
    );
  }

  // Tag 模式
  return (
    <Tooltip title={displayText}>
      <Tag
        color={config.color}
        icon={showIcon ? config.icon : undefined}
        style={{
          margin: 0,
          borderRadius: 6,
          padding: showIcon ? '2px 10px' : '2px 10px',
          fontSize: 12,
          lineHeight: '20px',
          ...style,
        }}
      >
        {displayText}
      </Tag>
    </Tooltip>
  );
};

export default StatusBadge;