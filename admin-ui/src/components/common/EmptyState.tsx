import React from 'react';
import { Button, Typography } from 'antd';
import {
  InboxOutlined,
  FileSearchOutlined,
  DatabaseOutlined,
  ShoppingCartOutlined,
  MessageOutlined,
  TeamOutlined,
  FileTextOutlined,
  BellOutlined,
  ScheduleOutlined,
  SearchOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

// ============================================================================
// Types
// ============================================================================

export interface EmptyStateProps {
  /** 自定义图标，不传则使用默认图标 */
  icon?: React.ReactNode;
  /** 标题 */
  title?: string;
  /** 描述文本 */
  description?: string;
  /** 操作按钮配置 */
  action?: {
    /** 按钮文案 */
    text: string;
    /** 点击回调 */
    onClick?: () => void;
    /** 按钮图标 */
    icon?: React.ReactNode;
    /** 按钮类型 */
    type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
    /** 是否加载中 */
    loading?: boolean;
  };
  /** 预设场景，快速匹配图标和文案 */
  scene?: 'data' | 'search' | 'notification' | 'message' | 'team' | 'document' | 'schedule';
  /** 自定义样式 */
  style?: React.CSSProperties;
}

// ============================================================================
// 预设场景配置
// ============================================================================

const SCENE_PRESETS: Record<
  string,
  { icon: React.ReactNode; title: string; description: string }
> = {
  data: {
    icon: <DatabaseOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
    title: '暂无数据',
    description: '当前没有可显示的数据，请稍后再试',
  },
  search: {
    icon: <SearchOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
    title: '未找到结果',
    description: '没有找到符合条件的内容，请尝试调整筛选条件',
  },
  notification: {
    icon: <BellOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
    title: '暂无通知',
    description: '目前没有新的通知消息',
  },
  message: {
    icon: <MessageOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
    title: '暂无消息',
    description: '目前没有新的消息',
  },
  team: {
    icon: <TeamOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
    title: '暂无成员',
    description: '团队还没有成员，邀请成员加入吧',
  },
  document: {
    icon: <FileTextOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
    title: '暂无文档',
    description: '还没有创建任何文档',
  },
  schedule: {
    icon: <ScheduleOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
    title: '暂无日程',
    description: '当前没有安排任何日程',
  },
};

// ============================================================================
// Component
// ============================================================================

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  scene,
  style,
}) => {
  // 确定最终使用的图标、标题、描述
  const sceneConfig = scene ? SCENE_PRESETS[scene] : null;

  const finalIcon = icon ?? sceneConfig?.icon ?? (
    <InboxOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />
  );
  const finalTitle = title ?? sceneConfig?.title ?? '暂无数据';
  const finalDescription =
    description ?? sceneConfig?.description ?? '当前没有可显示的内容';

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
      <div style={{ marginBottom: 16, opacity: 0.6 }}>{finalIcon}</div>

      {/* 标题 */}
      <Title level={5} style={{ margin: '0 0 8px', color: '#595959', fontWeight: 500 }}>
        {finalTitle}
      </Title>

      {/* 描述 */}
      {finalDescription && (
        <Text
          type="secondary"
          style={{
            fontSize: 14,
            maxWidth: 360,
            lineHeight: '22px',
            marginBottom: action ? 20 : 0,
            display: 'block',
          }}
        >
          {finalDescription}
        </Text>
      )}

      {/* 操作按钮 */}
      {action && (
        <Button
          type={action.type ?? 'primary'}
          icon={action.icon}
          onClick={action.onClick}
          loading={action.loading}
        >
          {action.text}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;