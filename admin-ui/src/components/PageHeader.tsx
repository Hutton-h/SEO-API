import React from 'react';
import { Typography, Space, Button } from 'antd';
import type { ButtonProps } from 'antd';

const { Title, Text } = Typography;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
  actions?: {
    label: string;
    type?: ButtonProps['type'];
    icon?: React.ReactNode;
    onClick?: () => void;
    loading?: boolean;
    danger?: boolean;
  }[];
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, extra, actions }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16,
      }}
    >
      <div>
        <Title level={3} style={{ margin: 0, marginBottom: 4 }}>
          {title}
        </Title>
        {subtitle && (
          <Text type="secondary" style={{ fontSize: 14 }}>
            {subtitle}
          </Text>
        )}
      </div>
      <Space wrap>
        {extra}
        {actions?.map((action, index) => (
          <Button
            key={index}
            type={action.type || 'default'}
            icon={action.icon}
            onClick={action.onClick}
            loading={action.loading}
            danger={action.danger}
          >
            {action.label}
          </Button>
        ))}
      </Space>
    </div>
  );
};

export default PageHeader;