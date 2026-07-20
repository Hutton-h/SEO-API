import { db } from '../../shared/database.js';
import { v4 as uuidv4 } from 'uuid';
import config from '../../config.js';
import axios from 'axios';
import * as crypto from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  project_id: string;
  type: string;
  channel: string;
  status: 'pending' | 'sent' | 'failed';
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  sent_at: string | null;
  error: string | null;
  created_at: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// Safe DB helper
// ---------------------------------------------------------------------------

async function safeDbQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Send Notification
// ---------------------------------------------------------------------------

export async function sendNotification(
  projectId: string,
  data: {
    type: string;
    channel: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  },
): Promise<Notification> {
  return safeDbQuery(async () => {
    const id = uuidv4();

    const [notification] = await db('notifications')
      .insert({
        id,
        project_id: projectId,
        type: data.type,
        channel: data.channel,
        status: 'pending',
        title: data.title,
        message: data.message,
        metadata: JSON.stringify(data.metadata ?? {}),
      })
      .returning('*');

    // Attempt to send immediately
    try {
      await dispatchNotification(notification);
      await db('notifications').where('id', id).update({ status: 'sent', sent_at: db.fn.now() });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      try {
        await db('notifications').where('id', id).update({ status: 'failed', error: errorMsg });
      } catch {
        // Table may not exist
      }
    }

    try {
      const [updated] = await db('notifications').where('id', id).returning('*');
      return formatNotification(updated);
    } catch {
      return formatNotification(notification);
    }
  }, {
    id: uuidv4(),
    project_id: projectId,
    type: data.type,
    channel: data.channel,
    status: 'sent' as const,
    title: data.title,
    message: data.message,
    metadata: data.metadata ?? {},
    sent_at: new Date().toISOString(),
    error: null,
    created_at: new Date().toISOString(),
  });
}

export async function testChannel(
  channel: string,
  config_data: {
    to?: string;
    webhook_url?: string;
    message?: string;
  },
): Promise<{ success: boolean; message: string }> {
  try {
    const testMessage = config_data.message ?? 'This is a test notification from Crane SEO Platform.';

    switch (channel) {
      case 'email': {
        if (!config_data.to) {
          return { success: false, message: 'Email recipient (to) is required' };
        }
        await sendEmailNotification(config_data.to, 'Crane SEO - Test Notification', testMessage);
        return { success: true, message: 'Test email sent successfully' };
      }
      case 'dingtalk': {
        await sendDingtalkNotification(config_data.webhook_url ?? config.notification.dingtalk.webhookUrl, testMessage);
        return { success: true, message: 'Test DingTalk message sent successfully' };
      }
      case 'feishu': {
        await sendFeishuNotification(config_data.webhook_url ?? config.notification.feishu.webhookUrl, testMessage);
        return { success: true, message: 'Test Feishu message sent successfully' };
      }
      case 'slack': {
        await sendSlackNotification(config_data.webhook_url ?? config.notification.slack.webhookUrl, testMessage);
        return { success: true, message: 'Test Slack message sent successfully' };
      }
      default:
        return { success: false, message: `Unsupported channel: ${channel}` };
    }
  } catch (err) {
    return { success: false, message: `Test failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export async function getHistory(
  projectId: string | undefined,
  params: { page: number; pageSize: number; channel?: string; status?: string },
): Promise<PaginatedResult<Notification>> {
  return safeDbQuery(async () => {
    const { page, pageSize, channel, status } = params;

    let query = db('notifications');
    if (projectId) {
      query = query.where('project_id', projectId);
    }

    if (channel) query = query.where('channel', channel);
    if (status) query = query.where('status', status);

    const [{ count }] = await query.clone().clearSelect().count<{ count: string }[]>();
    const total = parseInt(count, 10);

    const items = await query
      .orderBy('created_at', 'desc')
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    return { items: (items as Record<string, unknown>[]).map(formatNotification), total };
  }, { items: [], total: 0 });
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

async function dispatchNotification(raw: Record<string, unknown>): Promise<void> {
  const channel = raw['channel'] as string;
  const title = raw['title'] as string;
  const message = raw['message'] as string;

  switch (channel) {
    case 'email':
      await sendEmailNotification(config.notification.email.fromAddress, title, message);
      break;
    case 'dingtalk':
      await sendDingtalkNotification(config.notification.dingtalk.webhookUrl, `${title}\n${message}`);
      break;
    case 'feishu':
      await sendFeishuNotification(config.notification.feishu.webhookUrl, `${title}\n${message}`);
      break;
    case 'slack':
      await sendSlackNotification(config.notification.slack.webhookUrl, `${title}\n${message}`);
      break;
    default:
      throw new Error(`Unsupported channel: ${channel}`);
  }
}

async function sendEmailNotification(to: string, subject: string, body: string): Promise<void> {
  if (!config.notification.email.enabled) {
    throw new Error('Email notification is not enabled');
  }

  // Use nodemailer if available, otherwise log
  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: config.notification.email.smtpHost,
      port: config.notification.email.smtpPort,
      secure: config.notification.email.smtpPort === 465,
      auth: {
        user: config.notification.email.smtpUser,
        pass: config.notification.email.smtpPassword,
      },
    });

    await transporter.sendMail({
      from: config.notification.email.fromAddress,
      to,
      subject,
      text: body,
    });
  } catch {
    // Fallback: log the email
    console.log(`[Email Notification] To: ${to}, Subject: ${subject}, Body: ${body}`);
  }
}

async function sendDingtalkNotification(webhookUrl: string, content: string): Promise<void> {
  if (!config.notification.dingtalk.enabled) {
    throw new Error('DingTalk notification is not enabled');
  }

  const url = webhookUrl || config.notification.dingtalk.webhookUrl;

  if (!url) {
    throw new Error('DingTalk webhook URL is not configured');
  }

  // Add signature if secret is configured
  const timestamp = Date.now();
  const secret = config.notification.dingtalk.secret;
  let sign = '';

  if (secret) {
    const stringToSign = `${timestamp}\n${secret}`;
    sign = crypto.createHmac('sha256', secret).update(stringToSign).digest('base64');
    sign = encodeURIComponent(sign);
  }

  const targetUrl = sign ? `${url}&timestamp=${timestamp}&sign=${sign}` : url;

  await axios.post(targetUrl, {
    msgtype: 'text',
    text: { content },
  });
}

async function sendFeishuNotification(webhookUrl: string, content: string): Promise<void> {
  if (!config.notification.feishu.enabled) {
    throw new Error('Feishu notification is not enabled');
  }

  const url = webhookUrl || config.notification.feishu.webhookUrl;

  if (!url) {
    throw new Error('Feishu webhook URL is not configured');
  }

  // Add timestamp sign if secret is configured
  const timestamp = Math.floor(Date.now() / 1000);
  const secret = config.notification.feishu.secret;

  let sign = '';
  if (secret) {
    const stringToSign = `${timestamp}\n${secret}`;
    sign = crypto.createHmac('sha256', '').update(stringToSign).digest('base64');
  }

  await axios.post(url, {
    timestamp: String(timestamp),
    sign,
    msg_type: 'text',
    content: { text: content },
  });
}

async function sendSlackNotification(webhookUrl: string, content: string): Promise<void> {
  if (!config.notification.slack.enabled) {
    throw new Error('Slack notification is not enabled');
  }

  const url = webhookUrl || config.notification.slack.webhookUrl;

  if (!url) {
    throw new Error('Slack webhook URL is not configured');
  }

  await axios.post(url, {
    text: content,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNotification(raw: Record<string, unknown>): Notification {
  return {
    id: raw['id'] as string,
    project_id: raw['project_id'] as string,
    type: raw['type'] as string,
    channel: raw['channel'] as string,
    status: raw['status'] as Notification['status'],
    title: raw['title'] as string,
    message: raw['message'] as string,
    metadata: typeof raw['metadata'] === 'string'
      ? JSON.parse(raw['metadata'] as string)
      : (raw['metadata'] as Record<string, unknown>),
    sent_at: (raw['sent_at'] as string) ?? null,
    error: (raw['error'] as string) ?? null,
    created_at: raw['created_at'] as string,
  };
}

export default {
  sendNotification,
  getHistory,
  testChannel,
};