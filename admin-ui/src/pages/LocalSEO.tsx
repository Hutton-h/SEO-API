import React, { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Typography, Row, Col, Statistic, Button, Space, Select, Descriptions, Progress, Empty, Spin, Alert, message,
} from 'antd';
import {
  EnvironmentOutlined, PhoneOutlined, StarOutlined, ReloadOutlined,
  ArrowUpOutlined, ArrowDownOutlined, MinusOutlined,
} from '@ant-design/icons';
import { useStore } from '@/store';
import { geoAPI } from '@/services/geo';
import type { GMBProfile, LocalRanking } from '@/services/geo';
import PageHeader from '@/components/PageHeader';

const { Text } = Typography;

const locations = [
  { label: '上海市', value: 'shanghai' },
  { label: '北京市', value: 'beijing' },
  { label: '广州市', value: 'guangzhou' },
  { label: '深圳市', value: 'shenzhen' },
];

const LocalSEO: React.FC = () => {
  const projectId = useStore((s) => s.currentProject?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gmbProfile, setGmbProfile] = useState<GMBProfile | null>(null);
  const [localRankings, setLocalRankings] = useState<LocalRanking[]>([]);
  const [compareLocation, setCompareLocation] = useState<string>('beijing');

  const loadData = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [profileRes, rankingsRes] = await Promise.all([
        geoAPI.getGMBProfile(projectId),
        geoAPI.getLocalRankings(projectId),
      ]);

      const profileResult = (profileRes as any).data || profileRes;
      const rankingsResult = (rankingsRes as any).data || rankingsRes;

      setGmbProfile(profileResult);
      setLocalRankings(Array.isArray(rankingsResult) ? rankingsResult : rankingsResult.data || []);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    loadData();
  }, [projectId]);

  const handleRefresh = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      await geoAPI.refreshLocalSEO(projectId);
      message.success('本地 SEO 数据刷新成功');
      await loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || '刷新失败';
      setError(msg);
      setLoading(false);
    }
  };

  if (!projectId) return <Empty description="请先选择一个项目" style={{ marginTop: 120 }} />;
  if (loading && !gmbProfile && !localRankings.length) {
    return <Spin size="large" style={{ display: 'block', margin: '40vh auto' }} />;
  }
  if (error && !gmbProfile && !localRankings.length) {
    return <Alert type="error" message="加载失败" description={error} showIcon style={{ margin: '20vh auto', maxWidth: 600 }} />;
  }

  const columns = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      key: 'keyword',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '本地排名',
      dataIndex: 'position',
      key: 'position',
      width: 100,
      render: (pos: number) => {
        const color = pos <= 3 ? '#52c41a' : pos <= 10 ? '#1677ff' : '#faad14';
        return <Tag color={color} style={{ fontWeight: 600 }}>#{pos}</Tag>;
      },
    },
    {
      title: '变化',
      key: 'change',
      width: 80,
      render: (_: any, record: any) => {
        if (record.change > 0) return <Tag color="success" icon={<ArrowUpOutlined />}>+{record.change}</Tag>;
        if (record.change < 0) return <Tag color="error" icon={<ArrowDownOutlined />}>{record.change}</Tag>;
        return <Tag icon={<MinusOutlined />}>0</Tag>;
      },
    },
    {
      title: 'Map Pack',
      dataIndex: 'mapPack',
      key: 'mapPack',
      width: 90,
      render: (inMap: boolean) => (
        <Tag color={inMap ? 'green' : 'default'}>
          {inMap ? '在 Map Pack' : '不在'}
        </Tag>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="本地 SEO"
        subtitle="Google My Business 与本地排名管理"
        actions={[
          { label: '刷新', icon: <ReloadOutlined />, onClick: handleRefresh, loading },
        ]}
      />

      {/* GMB 档案卡片 */}
      {gmbProfile && (
        <Card title="Google My Business 档案" style={{ marginBottom: 24 }}>
          <Row gutter={[24, 16]}>
            <Col xs={24} md={12}>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="商家名称">{gmbProfile.businessName}</Descriptions.Item>
                <Descriptions.Item label="类别">{gmbProfile.category}</Descriptions.Item>
                <Descriptions.Item label="地址">
                  <Space>
                    <EnvironmentOutlined />
                    {gmbProfile.address}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="电话">
                  <Space>
                    <PhoneOutlined />
                    {gmbProfile.phone}
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </Col>
            <Col xs={24} md={12}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card size="small">
                    <Statistic
                      title="评分"
                      value={gmbProfile.rating}
                      prefix={<StarOutlined style={{ color: '#faad14' }} />}
                      precision={1}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small">
                    <Statistic title="评论数" value={gmbProfile.reviewCount} />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small">
                    <Statistic
                      title="状态"
                      value=" "
                      prefix={<Tag color="green">已验证</Tag>}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small">
                    <Statistic
                      title="完整度"
                      value={92}
                      suffix="%"
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>
      )}

      {/* 位置对比 */}
      <Card
        title="本地排名"
        style={{ marginBottom: 24 }}
        extra={
          <Space>
            <Text type="secondary">对比位置：</Text>
            <Select
              defaultValue="beijing"
              style={{ width: 120 }}
              onChange={setCompareLocation}
              options={locations}
            />
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={localRankings}
          rowKey="id"
          pagination={false}
          size="middle"
          loading={loading}
        />
      </Card>
    </div>
  );
};

export default LocalSEO;