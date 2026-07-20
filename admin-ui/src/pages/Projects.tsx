import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Button, Modal, Form, Input, Space, Typography,
  message, Popconfirm, Tag,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  GlobalOutlined, SettingOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { StatCard, PageHeader, EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from '@/components/common';
import { useStore } from '@/store';
import { useProject } from '@/hooks';
import { projectAPI } from '@/services/project';
import dayjs from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;

// ============================================================================
// Types
// ============================================================================

interface ProjectFormData {
  name: string;
  domain: string;
  competitors?: string;
  keywords?: string;
}

// ============================================================================
// Component
// ============================================================================

const Projects: React.FC = () => {
  const { projects, setProjects, setCurrentProject, currentProject } = useStore();
  const { hasProject } = useProject();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<ProjectFormData>();

  // ==========================================================================
  // Data loading
  // ==========================================================================

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await projectAPI.getProjects();
      const data = Array.isArray(res) ? res : (res?.data || []);
      setProjects(data);
    } catch (err: any) {
      const msg = err?.message || '加载项目列表失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [setProjects]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleAdd = () => {
    setEditingProject(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (project) {
      setEditingProject(id);
      form.setFieldsValue({
        name: project.name,
        domain: project.domain,
        competitors: (project as any).competitors || '',
        keywords: (project as any).keywords || '',
      });
      setModalOpen(true);
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();
      if (editingProject) {
        await projectAPI.updateProject(editingProject, {
          name: values.name,
          domain: values.domain,
        });
        message.success('项目已更新');
      } else {
        await projectAPI.createProject({
          name: values.name,
          domain: values.domain,
        });
        message.success('项目创建成功');
      }
      setModalOpen(false);
      await loadProjects();
    } catch (err: any) {
      if (err?.errorFields) return;
      const msg = err?.message || '操作失败';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await projectAPI.deleteProject(id);
      message.success('项目已删除');
      await loadProjects();
    } catch (err: any) {
      const msg = err?.message || '删除失败';
      message.error(msg);
    }
  };

  const handleSetCurrent = (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (project) {
      setCurrentProject(project);
      message.success(`已切换到项目: ${project.name}`);
    }
  };

  // ==========================================================================
  // Table columns
  // ==========================================================================

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Space>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#1677ff15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1677ff',
              flexShrink: 0,
            }}
          >
            <GlobalOutlined />
          </div>
          <div>
            <Text strong style={{ display: 'block' }}>{text}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.domain}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '域名',
      dataIndex: 'domain',
      key: 'domain',
      ellipsis: true,
      render: (text: string) => (
        <Text type="secondary" copyable>{text}</Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; status: 'active' | 'paused' | 'archived' }> = {
          active: { text: '运行中', status: 'active' },
          paused: { text: '已暂停', status: 'paused' },
          archived: { text: '已归档', status: 'archived' },
        };
        const info = statusMap[status] || { text: status, status: 'pending' as const };
        return <StatusBadge status={info.status} text={info.text} />;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {text ? dayjs(text).format('YYYY-MM-DD') : '-'}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      render: (_: unknown, record: any) => (
        <Space size="small">
          {currentProject?.id !== record.id && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleSetCurrent(record.id)}
            >
              设为当前
            </Button>
          )}
          {currentProject?.id === record.id && (
            <Tag color="blue" style={{ margin: 0 }}>当前项目</Tag>
          )}
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.id)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此项目？"
            description="删除后数据不可恢复"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ==========================================================================
  // Render: Loading
  // ==========================================================================

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="项目管理"
          subtitle="管理您的 SEO 项目"
        />
        <LoadingSkeleton type="table" />
      </div>
    );
  }

  // ==========================================================================
  // Render: Error
  // ==========================================================================

  if (error) {
    return (
      <div className="page-container">
        <PageHeader
          title="项目管理"
          subtitle="管理您的 SEO 项目"
        />
        <ErrorState
          message={error}
          onRetry={loadProjects}
        />
      </div>
    );
  }

  // ==========================================================================
  // Render: Main
  // ==========================================================================

  const activeCount = projects.filter((p) => p.status === 'active').length;
  const pausedCount = projects.filter((p) => p.status === 'paused').length;
  const archivedCount = projects.filter((p) => p.status === 'archived').length;

  return (
    <div className="page-container">
      <PageHeader
        title="项目管理"
        subtitle={`共 ${projects.length} 个项目`}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadProjects}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新建项目
            </Button>
          </Space>
        }
      />

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="项目总数"
            value={projects.length}
            icon={<GlobalOutlined />}
            color="#1677ff"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="运行中"
            value={activeCount}
            icon={<CheckCircleOutlined />}
            color="#52c41a"
            subtitle={`${projects.length > 0 ? Math.round((activeCount / projects.length) * 100) : 0}%`}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="已暂停"
            value={pausedCount}
            color="#faad14"
            subtitle="需要关注"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="已归档"
            value={archivedCount}
            color="#bfbfbf"
            subtitle="历史项目"
          />
        </Col>
      </Row>

      {/* Project Table */}
      <Card title="项目列表" style={{ borderRadius: 8 }}>
        {projects.length === 0 ? (
          <EmptyState
            scene="data"
            title="暂无项目"
            description="创建您的第一个 SEO 项目开始追踪数据"
            action={{
              text: '创建项目',
              onClick: handleAdd,
              icon: <PlusOutlined />,
            }}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={projects}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 个项目` }}
            size="middle"
          />
        )}
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        title={editingProject ? '编辑项目' : '新建项目'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText={editingProject ? '保存' : '创建'}
        cancelText="取消"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="例如：主站SEO优化" />
          </Form.Item>
          <Form.Item
            name="domain"
            label="域名"
            rules={[
              { required: true, message: '请输入域名' },
              { type: 'url', message: '请输入有效的 URL' },
            ]}
          >
            <Input placeholder="https://example.com" prefix={<GlobalOutlined />} />
          </Form.Item>
          <Form.Item
            name="competitors"
            label="竞品域名（可选）"
            extra="每行输入一个竞品域名"
          >
            <TextArea rows={3} placeholder="https://competitor1.com&#10;https://competitor2.com" />
          </Form.Item>
          <Form.Item
            name="keywords"
            label="目标关键词（可选）"
            extra="每行输入一个关键词"
          >
            <TextArea rows={3} placeholder="SEO工具&#10;关键词排名&#10;网站分析" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Projects;