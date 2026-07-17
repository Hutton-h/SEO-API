import React, { useState } from 'react';
import {
  Card, Button, Modal, Form, Input, Select, Space, Tag, Dropdown, Typography, message, Popconfirm, Empty,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, MoreOutlined,
  GlobalOutlined, SettingOutlined, EllipsisOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

interface ProjectFormData {
  name: string;
  domain: string;
  description?: string;
  crawlFrequency?: 'daily' | 'weekly' | 'monthly';
}

const statusColors: Record<string, string> = {
  active: 'green',
  paused: 'orange',
  archived: 'default',
};

const statusLabels: Record<string, string> = {
  active: '运行中',
  paused: '已暂停',
  archived: '已归档',
};

const Projects: React.FC = () => {
  const { projects, addProject, removeProject, updateProject } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<ProjectFormData>();

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
        description: (project as any).description,
        crawlFrequency: (project as any).settings?.crawlFrequency,
      });
      setModalOpen(true);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      if (editingProject) {
        updateProject(editingProject, {
          name: values.name,
          domain: values.domain,
        });
        message.success('项目已更新');
      } else {
        addProject({
          id: Date.now().toString(),
          name: values.name,
          domain: values.domain,
          status: 'active',
          createdAt: new Date().toISOString(),
          settings: {
            crawlFrequency: values.crawlFrequency || 'weekly',
          },
        });
        message.success('项目创建成功');
      }
      setModalOpen(false);
    } catch {
      // form validation error
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    removeProject(id);
    message.success('项目已删除');
  };

  const handleStatusChange = (id: string, status: 'active' | 'paused' | 'archived') => {
    updateProject(id, { status });
    message.success(`项目状态已更新为 ${statusLabels[status]}`);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="项目管理"
        subtitle={`共 ${projects.length} 个项目`}
        actions={[
          { label: '新建项目', type: 'primary', icon: <PlusOutlined />, onClick: handleAdd },
        ]}
      />

      <div className="project-grid">
        {projects.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '80px 0' }}>
            <Empty description="暂无项目">
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                创建第一个项目
              </Button>
            </Empty>
          </div>
        )}
        {projects.map((project) => (
          <Card
            key={project.id}
            hoverable
            style={{ borderTop: `3px solid ${project.status === 'active' ? '#1677ff' : project.status === 'paused' ? '#faad14' : '#d9d9d9'}` }}
            actions={[
              <EditOutlined key="edit" onClick={() => handleEdit(project.id)} />,
              <Popconfirm
                key="delete"
                title="确定删除此项目？"
                description="删除后数据不可恢复"
                onConfirm={() => handleDelete(project.id)}
                okText="确定"
                cancelText="取消"
              >
                <DeleteOutlined style={{ color: '#ff4d4f' }} />
              </Popconfirm>,
              <Dropdown
                key="more"
                menu={{
                  items: [
                    {
                      key: 'active',
                      label: '设为运行中',
                      icon: <span style={{ color: '#52c41a' }}>&#9679;</span>,
                      disabled: project.status === 'active',
                      onClick: () => handleStatusChange(project.id, 'active'),
                    },
                    {
                      key: 'paused',
                      label: '设为暂停',
                      icon: <span style={{ color: '#faad14' }}>&#9679;</span>,
                      disabled: project.status === 'paused',
                      onClick: () => handleStatusChange(project.id, 'paused'),
                    },
                    {
                      key: 'archived',
                      label: '设为归档',
                      icon: <span style={{ color: '#d9d9d9' }}>&#9679;</span>,
                      disabled: project.status === 'archived',
                      onClick: () => handleStatusChange(project.id, 'archived'),
                    },
                  ],
                }}
                trigger={['click']}
              >
                <EllipsisOutlined />
              </Dropdown>,
            ]}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: '#1677ff15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  color: '#1677ff',
                  flexShrink: 0,
                }}
              >
                <GlobalOutlined />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong style={{ fontSize: 16 }}>
                    {project.name}
                  </Text>
                  <Tag color={statusColors[project.status]}>{statusLabels[project.status]}</Tag>
                </div>
                <Paragraph
                  type="secondary"
                  style={{ margin: '4px 0', fontSize: 13 }}
                  ellipsis
                >
                  {project.domain}
                </Paragraph>
                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <SettingOutlined /> {(project as any).settings?.crawlFrequency || 'weekly'} 爬取
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    创建于 {dayjs(project.createdAt).format('YYYY-MM-DD')}
                  </Text>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        title={editingProject ? '编辑项目' : '新建项目'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={loading}
        okText={editingProject ? '保存' : '创建'}
        cancelText="取消"
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="例如：主站优化" />
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
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="项目描述（可选）" />
          </Form.Item>
          <Form.Item name="crawlFrequency" label="爬取频率">
            <Select placeholder="选择爬取频率">
              <Select.Option value="daily">每天</Select.Option>
              <Select.Option value="weekly">每周</Select.Option>
              <Select.Option value="monthly">每月</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Projects;