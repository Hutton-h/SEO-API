import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface LoadingSpinnerProps {
  fullPage?: boolean;
  tip?: string;
  size?: 'small' | 'default' | 'large';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  fullPage = false,
  tip = '加载中...',
  size = 'large',
}) => {
  if (fullPage) {
    return (
      <div className="loading-overlay" style={{ minHeight: '100vh' }}>
        <Spin
          indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
          tip={tip}
          size={size}
        >
          <div style={{ padding: 50 }} />
        </Spin>
      </div>
    );
  }

  return (
    <div className="loading-overlay">
      <Spin
        indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />}
        tip={tip}
        size={size}
      >
        <div style={{ padding: 30 }} />
      </Spin>
    </div>
  );
};

export default LoadingSpinner;