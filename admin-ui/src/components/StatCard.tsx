import React from 'react';
import { Card, Statistic, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface StatCardProps {
  title: string;
  value: number | string;
  prefix?: React.ReactNode;
  suffix?: string;
  icon?: React.ReactNode;
  color?: string;
  trend?: number; // 正数上升，负数下降
  loading?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  prefix,
  suffix,
  icon,
  color = '#1677ff',
  trend,
  loading = false,
  onClick,
  style,
}) => {
  return (
    <Card
      className="stat-card"
      loading={loading}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        borderTop: `3px solid ${color}`,
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>
            {title}
          </Text>
          <Statistic
            value={value}
            prefix={prefix}
            suffix={suffix}
            valueStyle={{
              fontSize: 28,
              fontWeight: 700,
              color: '#1a1a1a',
            }}
          />
          {trend !== undefined && (
            <div style={{ marginTop: 8 }}>
              <Text
                type={trend >= 0 ? 'success' : 'danger'}
                style={{ fontSize: 13 }}
              >
                {trend >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                <span style={{ marginLeft: 4 }}>
                  {Math.abs(trend)}% vs 上月
                </span>
              </Text>
            </div>
          )}
        </div>
        {icon && (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              color: color,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatCard;