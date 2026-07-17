import React, { useState } from 'react';
import {
  Card, Table, Tag, Typography, Row, Col, Statistic, Button, Space, Select, Descriptions, Progress,
} from 'antd';
import {
  EnvironmentOutlined, PhoneOutlined, StarOutlined, ReloadOutlined,
  ArrowUpOutlined, ArrowDownOutlined, MinusOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';

const { Text } = Typography;

const mockGMBProfile = {
  businessName: 'Crane SEO 优化服务',
  category: 'SEO 服务机构',
  address: '上海市浦东新区张江高科技园区',
  phone: '+86 400-123-4567',
  rating: 4.8,
  reviewCount: 256,
  status: 'verified',
};

const mockLocalRankings = [
  { id: '1', keyword: 'SEO公司 上海', position: 2, previousPosition: 3, change: 1, mapPack: true },
  { id: '2', keyword: '网站优化 上海', position: 5, previousPosition: 4, change: -1, mapPack: true },
  { id: '3', keyword: '搜索引擎优化公司', position: 3, previousPosition: 5, change: 2, mapPack: false },
  { id: '4', keyword: '上海SEO服务', position: 1, previousPosition: 1, change: 0, mapPack: true },
  { id: '5', keyword: '网站排名优化', position: 7, previousPosition: 8, change: 1, mapPack: false },
  { id: '6', keyword: '本地SEO优化', position: 4, previousPosition: 2, change: -2, mapPack: true },
  { id: '7', keyword: 'SEO外包', position: 9, previousPosition: 12, change: 3, mapPack: false },
  { id: '8', keyword: 'Google排名', position: 6, previousPosition: 6, change: 0, mapPack: true },
];

const locations = [
  { label: '上海市', value: 'shanghai' },
  { label: '北京市', value: 'beijing' },
  { label: '广州市', value: 'guangzhou' },
  { label: '深圳市', value: 'shenzhen' },
];

const LocalSEO: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [compareLocation, setCompareLocation] = useState<string>('beijing');

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

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
      <Card title="Google My Business 档案" style={{ marginBottom: 24 }}>
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="商家名称">{mockGMBProfile.businessName}</Descriptions.Item>
              <Descriptions.Item label="类别">{mockGMBProfile.category}</Descriptions.Item>
              <Descriptions.Item label="地址">
                <Space>
                  <EnvironmentOutlined />
                  {mockGMBProfile.address}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="电话">
                <Space>
                  <PhoneOutlined />
                  {mockGMBProfile.phone}
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
                    value={mockGMBProfile.rating}
                    prefix={<StarOutlined style={{ color: '#faad14' }} />}
                    precision={1}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Statistic title="评论数" value={mockGMBProfile.reviewCount} />
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
          dataSource={mockLocalRankings}
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