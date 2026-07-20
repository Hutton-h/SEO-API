import React from 'react';
import { Skeleton, Card, Row, Col, Space } from 'antd';

// ============================================================================
// Types
// ============================================================================

export interface LoadingSkeletonProps {
  /** 骨架类型 */
  type?: 'card' | 'table' | 'chart' | 'page';
  /** 卡片数量（type='card' 时有效） */
  count?: number;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

// ============================================================================
// Card Skeleton
// ============================================================================

const CardSkeleton: React.FC<{ count: number }> = ({ count }) => {
  const cols = count > 3 ? 6 : 24 / count; // 每行最多 4 个，超过则用 2 列
  const colSpan = Math.min(24, Math.max(6, Math.floor(24 / Math.min(count, 4))));

  return (
    <Row gutter={[16, 16]}>
      {Array.from({ length: count }).map((_, i) => (
        <Col key={i} span={colSpan}>
          <Card
            style={{
              borderTop: '3px solid #f0f0f0',
              borderRadius: 8,
            }}
          >
            <Skeleton active paragraph={{ rows: 2 }} />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

// ============================================================================
// Table Skeleton
// ============================================================================

const TableSkeleton: React.FC = () => {
  return (
    <Card style={{ borderRadius: 8 }}>
      <div style={{ padding: '8px 0' }}>
        {/* 表头模拟 */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            padding: '12px 0',
            borderBottom: '1px solid #f0f0f0',
            marginBottom: 8,
          }}
        >
          <Skeleton.Input active size="small" style={{ width: 40 }} />
          <Skeleton.Input active size="small" style={{ width: 120 }} />
          <Skeleton.Input active size="small" style={{ width: 100 }} />
          <Skeleton.Input active size="small" style={{ width: 80 }} />
          <Skeleton.Input active size="small" style={{ width: 60, marginLeft: 'auto' }} />
        </div>

        {/* 行数据模拟 */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 16,
              padding: '10px 0',
              borderBottom: '1px solid #fafafa',
              alignItems: 'center',
            }}
          >
            <Skeleton.Input active size="small" style={{ width: 40 }} />
            <Skeleton.Input active size="small" style={{ width: 120 }} />
            <Skeleton.Input active size="small" style={{ width: 100 }} />
            <Skeleton.Input active size="small" style={{ width: 80 }} />
            <Skeleton.Button active size="small" style={{ width: 60, marginLeft: 'auto' }} />
          </div>
        ))}
      </div>
    </Card>
  );
};

// ============================================================================
// Chart Skeleton
// ============================================================================

const ChartSkeleton: React.FC = () => {
  return (
    <Card style={{ borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Skeleton.Input active size="small" style={{ width: 120 }} />
        <Space>
          <Skeleton.Button active size="small" style={{ width: 60 }} />
          <Skeleton.Button active size="small" style={{ width: 60 }} />
          <Skeleton.Button active size="small" style={{ width: 60 }} />
        </Space>
      </div>

      {/* 图表区域模拟 */}
      <div
        style={{
          position: 'relative',
          height: 280,
          background: '#fafafa',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'flex-end',
          padding: '20px 40px',
          gap: '4%',
          overflow: 'hidden',
        }}
      >
        {/* Y 轴标签 */}
        <div
          style={{
            position: 'absolute',
            left: 8,
            top: 20,
            bottom: 20,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton.Input
              key={i}
              active
              size="small"
              style={{ width: 30, height: 12, display: 'block' }}
            />
          ))}
        </div>

        {/* 柱状图模拟 */}
        {Array.from({ length: 12 }).map((_, i) => {
          const height = 30 + Math.sin(i * 0.8) * 20 + Math.random() * 50;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 40,
                  height: `${height}%`,
                  background: 'linear-gradient(180deg, #e6f0ff 0%, #bae0ff 100%)',
                  borderRadius: '4px 4px 0 0',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              <Skeleton.Input active size="small" style={{ width: 24, height: 10 }} />
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <Skeleton.Input active size="small" style={{ width: 200 }} />
      </div>
    </Card>
  );
};

// ============================================================================
// Page Skeleton
// ============================================================================

const PageSkeleton: React.FC = () => {
  return (
    <div>
      {/* 页面头部 */}
      <div style={{ marginBottom: 24 }}>
        <Skeleton.Input active style={{ width: 200, height: 28, marginBottom: 8 }} />
        <Skeleton.Input active size="small" style={{ width: 320, display: 'block' }} />
      </div>

      {/* 统计卡片行 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Col key={i} span={6}>
            <Card style={{ borderTop: '3px solid #f0f0f0', borderRadius: 8 }}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]}>
        <Col span={16}>
          <ChartSkeleton />
        </Col>
        <Col span={8}>
          <Card style={{ borderRadius: 8 }}>
            <Skeleton.Input active size="small" style={{ width: 100, marginBottom: 16 }} />
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// ============================================================================
// Component
// ============================================================================

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'card',
  count = 4,
  style,
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return <CardSkeleton count={count} />;
      case 'table':
        return <TableSkeleton />;
      case 'chart':
        return <ChartSkeleton />;
      case 'page':
        return <PageSkeleton />;
      default:
        return <CardSkeleton count={count} />;
    }
  };

  return <div style={style}>{renderSkeleton()}</div>;
};

export default LoadingSkeleton;