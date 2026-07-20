import React from 'react';
import { Card, Statistic, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const { Text } = Typography;

// ============================================================================
// Types
// ============================================================================

export interface StatCardProps {
  /** 卡片标题 */
  title: string;
  /** 指标数值 */
  value: string | number;
  /** 标题旁的图标 */
  icon?: React.ReactNode;
  /** 趋势数据：百分比变化值 */
  trend?: {
    /** 变化百分比（正数表示上升，负数表示下降） */
    value: number;
    /** 上升是否代表好事（用于决定颜色） */
    isUpGood: boolean;
  };
  /** 迷你趋势图数据 */
  sparklineData?: number[];
  /** 主题色（顶部边框、图标背景） */
  color?: string;
  /** 加载中 */
  loading?: boolean;
  /** 数值前缀 */
  prefix?: string;
  /** 数值后缀 */
  suffix?: string;
  /** 点击回调 */
  onClick?: () => void;
  /** 副标题（显示在数值下方） */
  subtitle?: string;
}

// ============================================================================
// Sparkline SVG helper
// ============================================================================

const Sparkline: React.FC<{ data: number[]; width?: number; height?: number; color: string }> = ({
  data,
  width = 120,
  height = 36,
  color,
}) => {
  if (!data || data.length < 2) return null;

  const paddingX = 2;
  const paddingY = 4;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = paddingX + (i / (data.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - ((val - min) / range) * chartHeight;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];

  // 填充区域：在 polyline 首尾各加一个底部点
  const fillPoints = `${firstPoint} ${polyline} ${lastPoint.split(',')[0]},${height} ${firstPoint.split(',')[0]},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`sparkline-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {/* 填充区域 */}
      <polygon
        points={fillPoints}
        fill={`url(#sparkline-grad-${color.replace('#', '')})`}
        stroke="none"
      />
      {/* 折线 */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 终点圆点 */}
      <circle
        cx={lastPoint.split(',')[0]}
        cy={lastPoint.split(',')[1]}
        r={2.5}
        fill={color}
        stroke="#fff"
        strokeWidth={1}
      />
    </svg>
  );
};

// ============================================================================
// Component
// ============================================================================

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  sparklineData,
  color = '#1677ff',
  loading = false,
  prefix,
  suffix,
  onClick,
  subtitle,
}) => {
  // 根据 isUpGood 决定趋势颜色
  const getTrendColor = (): string => {
    if (!trend) return '';
    const isUp = trend.value > 0;
    if (isUp) {
      return trend.isUpGood ? '#52c41a' : '#ff4d4f';
    } else {
      return trend.isUpGood ? '#ff4d4f' : '#52c41a';
    }
  };

  const trendColor = getTrendColor();

  return (
    <Card
      className="stat-card"
      loading={loading}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        borderTop: `3px solid ${color}`,
        borderRadius: 8,
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.boxShadow =
            '0 4px 12px rgba(0,0,0,0.08)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.boxShadow = '';
          (e.currentTarget as HTMLElement).style.transform = '';
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* 左侧：标题 + 数值 + 趋势 + 副标题 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text
            type="secondary"
            style={{
              fontSize: 13,
              marginBottom: 8,
              display: 'block',
              lineHeight: '20px',
            }}
          >
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
              lineHeight: '36px',
            }}
          />

          {/* 趋势 */}
          {trend && trend.value !== 0 && (
            <div style={{ marginTop: 6 }}>
              <Text style={{ fontSize: 13, color: trendColor }}>
                {trend.value > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                <span style={{ marginLeft: 4 }}>
                  {Math.abs(trend.value).toFixed(1)}%
                </span>
              </Text>
            </div>
          )}

          {/* 副标题 */}
          {subtitle && (
            <Text
              type="secondary"
              style={{ fontSize: 12, marginTop: 4, display: 'block' }}
            >
              {subtitle}
            </Text>
          )}
        </div>

        {/* 右侧：图标 + 迷你趋势图 */}
        {icon && (
          <div style={{ marginLeft: 16, flexShrink: 0 }}>
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
            {/* 迷你趋势图 */}
            {sparklineData && sparklineData.length > 1 && (
              <div style={{ marginTop: 8 }}>
                <Sparkline
                  data={sparklineData}
                  color={trendColor || color}
                  width={48}
                  height={28}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatCard;