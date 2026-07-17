import { apiGet, apiPost, apiPut, apiDelete } from './api';

export interface NotificationChannel {
  id: string;
  type: 'email' | 'dingtalk' | 'feishu' | 'slack';
  typeLabel: string;
  enabled: boolean;
  config: Record<string, string>;
  lastTestAt: string | null;
  lastTestStatus: 'success' | 'failed' | null;
  createdAt: string;
}

export interface SendRecord {
  id: string;
  channelId: string;
  channelType: string;
  recipient: string;
  subject: string;
  status: 'success' | 'failed' | 'pending';
  errorMessage: string | null;
  sentAt: string;
}

export const notificationsAPI = {
  getChannels: () =>
    apiGet<NotificationChannel[]>('/v1/notifications/channels'),

  createChannel: (data: Omit<NotificationChannel, 'id' | 'lastTestAt' | 'lastTestStatus' | 'createdAt'>) =>
    apiPost<NotificationChannel>('/v1/notifications/channels', data),

  updateChannel: (id: string, data: Partial<NotificationChannel>) =>
    apiPut<NotificationChannel>(`/v1/notifications/channels/${id}`, data),

  deleteChannel: (id: string) =>
    apiDelete<void>(`/v1/notifications/channels/${id}`),

  toggleChannel: (id: string, enabled: boolean) =>
    apiPut<NotificationChannel>(`/v1/notifications/channels/${id}/toggle`, { enabled }),

  testChannel: (id: string) =>
    apiPost<{ success: boolean; message: string }>(`/v1/notifications/channels/${id}/test`, {}),

  getSendRecords: (params?: { page?: number; pageSize?: number; channelId?: string }) =>
    apiGet<{ data: SendRecord[]; total: number }>('/v1/notifications/records', params),
};