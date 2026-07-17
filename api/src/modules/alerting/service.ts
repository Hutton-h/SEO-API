import { db } from '../../shared/database.js';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AlertRule {
  id: string;
  project_id: string;
  name: string;
  type: 'ranking_drop' | 'traffic_drop' | 'backlink_loss' | 'crawl_error' | 'downtime';
  condition: {
    metric: string;
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
    threshold: number;
    window_minutes: number;
  };
  channels: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertHistory {
  id: string;
  project_id: string;
  rule_id: string;
  rule_name: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  details: Record<string, unknown>;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// CRUD: Alert Rules
// ---------------------------------------------------------------------------

export async function createRule(
  projectId: string,
  data: {
    name: string;
    type: AlertRule['type'];
    condition: AlertRule['condition'];
    channels?: string[];
    enabled?: boolean;
  },
): Promise<AlertRule> {
  const id = uuidv4();
  const [rule] = await db('alert_rules')
    .insert({
      id,
      project_id: projectId,
      name: data.name,
      type: data.type,
      condition: JSON.stringify(data.condition),
      channels: JSON.stringify(data.channels ?? ['email']),
      enabled: data.enabled ?? true,
    })
    .returning('*');

  return formatRule(rule);
}

export async function getRules(
  projectId: string,
  params: { page: number; pageSize: number; type?: string; enabled?: boolean },
): Promise<PaginatedResult<AlertRule>> {
  const { page, pageSize, type, enabled } = params;

  let query = db('alert_rules').where('project_id', projectId);

  if (type) {
    query = query.where('type', type);
  }
  if (enabled !== undefined) {
    query = query.where('enabled', enabled);
  }

  const [{ count }] = await query.clone().clearSelect().count<{ count: string }[]>();
  const total = parseInt(count, 10);

  const items = await query
    .orderBy('created_at', 'desc')
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  return { items: (items as Record<string, unknown>[]).map(formatRule), total };
}

export async function updateRule(
  ruleId: string,
  data: {
    name?: string;
    type?: AlertRule['type'];
    condition?: AlertRule['condition'];
    channels?: string[];
    enabled?: boolean;
  },
): Promise<AlertRule | null> {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData['name'] = data.name;
  if (data.type !== undefined) updateData['type'] = data.type;
  if (data.condition !== undefined) updateData['condition'] = JSON.stringify(data.condition);
  if (data.channels !== undefined) updateData['channels'] = JSON.stringify(data.channels);
  if (data.enabled !== undefined) updateData['enabled'] = data.enabled;

  if (Object.keys(updateData).length === 0) return null;

  updateData['updated_at'] = db.fn.now();

  const [rule] = await db('alert_rules')
    .where('id', ruleId)
    .update(updateData)
    .returning('*');

  return rule ? formatRule(rule) : null;
}

export async function deleteRule(ruleId: string): Promise<boolean> {
  const deleted = await db('alert_rules').where('id', ruleId).del();
  return deleted > 0;
}

// ---------------------------------------------------------------------------
// Alert History
// ---------------------------------------------------------------------------

export async function getAlertHistory(
  projectId: string,
  params: {
    page: number;
    pageSize: number;
    type?: string;
    severity?: string;
    acknowledged?: boolean;
  },
): Promise<PaginatedResult<AlertHistory>> {
  const { page, pageSize, type, severity, acknowledged } = params;

  let query = db('alert_history').where('project_id', projectId);

  if (type) query = query.where('type', type);
  if (severity) query = query.where('severity', severity);
  if (acknowledged !== undefined) query = query.where('acknowledged', acknowledged);

  const [{ count }] = await query.clone().clearSelect().count<{ count: string }[]>();
  const total = parseInt(count, 10);

  const items = await query
    .orderBy('created_at', 'desc')
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  return {
    items: (items as Record<string, unknown>[]).map(formatHistory),
    total,
  };
}

export async function acknowledgeAlert(
  alertId: string,
  userId: string,
): Promise<AlertHistory | null> {
  const [alert] = await db('alert_history')
    .where('id', alertId)
    .update({
      acknowledged: true,
      acknowledged_by: userId,
      acknowledged_at: db.fn.now(),
    })
    .returning('*');

  return alert ? formatHistory(alert) : null;
}

// ---------------------------------------------------------------------------
// Detection: Check alert conditions
// ---------------------------------------------------------------------------

export async function checkAlertConditions(projectId: string): Promise<void> {
  const rules = await db('alert_rules')
    .where('project_id', projectId)
    .where('enabled', true);

  if (!rules.length) return;

  const project = await db('projects').where('id', projectId).first();
  if (!project) return;

  const domain = (project as { domain: string }).domain;

  for (const rawRule of rules) {
    const rule = formatRule(rawRule as Record<string, unknown>);

    let triggered = false;
    let severity: 'critical' | 'warning' | 'info' = 'info';
    let message = '';
    const details: Record<string, unknown> = {};

    switch (rule.type) {
      case 'ranking_drop': {
        const result = await checkRankingDrop(projectId, rule);
        triggered = result.triggered;
        severity = result.severity;
        message = result.message;
        details.rankingData = result.details;
        break;
      }
      case 'traffic_drop': {
        const result = await checkTrafficDrop(projectId, rule);
        triggered = result.triggered;
        severity = result.severity;
        message = result.message;
        details.trafficData = result.details;
        break;
      }
      case 'backlink_loss': {
        const result = await checkBacklinkLoss(projectId, rule);
        triggered = result.triggered;
        severity = result.severity;
        message = result.message;
        details.backlinkData = result.details;
        break;
      }
      case 'crawl_error': {
        const result = await checkCrawlError(projectId, rule);
        triggered = result.triggered;
        severity = result.severity;
        message = result.message;
        details.crawlData = result.details;
        break;
      }
      case 'downtime': {
        const result = await checkDowntime(projectId, rule);
        triggered = result.triggered;
        severity = result.severity;
        message = result.message;
        details.downtimeData = result.details;
        break;
      }
    }

    if (triggered) {
      await createAlertHistory(projectId, rule, severity, message, details);
    }
  }
}

async function checkRankingDrop(
  projectId: string,
  rule: AlertRule,
): Promise<{ triggered: boolean; severity: 'critical' | 'warning' | 'info'; message: string; details: Record<string, unknown> }> {
  const windowMinutes = rule.condition.window_minutes ?? 1440;
  const threshold = rule.condition.threshold;

  const recentRankings = await db('rankings')
    .where('project_id', projectId)
    .where('check_date', '>=', db.raw(`NOW() - INTERVAL '${windowMinutes} minutes'`))
    .orderBy('check_date', 'desc')
    .limit(50);

  if (recentRankings.length < 2) {
    return { triggered: false, severity: 'info', message: '', details: {} };
  }

  // Calculate average position drop
  let totalDrop = 0;
  let dropCount = 0;

  for (const ranking of recentRankings) {
    const r = ranking as { position: number | null; previous_position: number | null };
    if (r.position !== null && r.previous_position !== null) {
      const drop = r.position - r.previous_position;
      if (drop > 0) {
        totalDrop += drop;
        dropCount++;
      }
    }
  }

  const avgDropRatio = dropCount > 0 ? totalDrop / dropCount : 0;

  if (avgDropRatio >= threshold) {
    return {
      triggered: true,
      severity: avgDropRatio >= threshold * 2 ? 'critical' : 'warning',
      message: `Average ranking drop of ${avgDropRatio.toFixed(1)} positions detected (threshold: ${threshold})`,
      details: { avgDropRatio, dropCount, threshold },
    };
  }

  return { triggered: false, severity: 'info', message: '', details: {} };
}

async function checkTrafficDrop(
  projectId: string,
  rule: AlertRule,
): Promise<{ triggered: boolean; severity: 'critical' | 'warning' | 'info'; message: string; details: Record<string, unknown> }> {
  const windowMinutes = rule.condition.window_minutes ?? 1440;
  const threshold = rule.condition.threshold;

  // Check recent crawl stats for traffic indicators
  const recentPages = await db('crawl_pages')
    .where('project_id', projectId)
    .where('crawled_at', '>=', db.raw(`NOW() - INTERVAL '${windowMinutes} minutes'`))
    .count<{ count: string }[]>('* as count');

  const totalPages = parseInt(recentPages[0]?.count ?? '0', 10);

  // Check ga4_traffic table if available
  const trafficData = await db('ga4_traffic')
    .where('project_id', projectId)
    .where('date', '>=', db.raw(`NOW() - INTERVAL '${windowMinutes} minutes'`))
    .orderBy('date', 'desc')
    .limit(2);

  if (trafficData.length >= 2) {
    const current = trafficData[0] as { sessions: number };
    const previous = trafficData[1] as { sessions: number };
    const dropPercent = previous.sessions > 0
      ? ((previous.sessions - current.sessions) / previous.sessions) * 100
      : 0;

    if (dropPercent >= threshold) {
      return {
        triggered: true,
        severity: dropPercent >= threshold * 2 ? 'critical' : 'warning',
        message: `Traffic drop of ${dropPercent.toFixed(1)}% detected (threshold: ${threshold}%)`,
        details: { currentSessions: current.sessions, previousSessions: previous.sessions, dropPercent, threshold },
      };
    }
  }

  return { triggered: false, severity: 'info', message: '', details: { totalPages } };
}

async function checkBacklinkLoss(
  projectId: string,
  rule: AlertRule,
): Promise<{ triggered: boolean; severity: 'critical' | 'warning' | 'info'; message: string; details: Record<string, unknown> }> {
  const threshold = rule.condition.threshold;

  const recentBacklinks = await db('backlinks')
    .where('project_id', projectId)
    .where('check_date', '>=', db.raw("NOW() - INTERVAL '7 days'"))
    .count<{ count: string }[]>('* as count');

  const previousBacklinks = await db('backlinks')
    .where('project_id', projectId)
    .where('check_date', '<', db.raw("NOW() - INTERVAL '7 days'"))
    .where('check_date', '>=', db.raw("NOW() - INTERVAL '14 days'"))
    .count<{ count: string }[]>('* as count');

  const current = parseInt(recentBacklinks[0]?.count ?? '0', 10);
  const previous = parseInt(previousBacklinks[0]?.count ?? '0', 10);

  const lossPercent = previous > 0 ? ((previous - current) / previous) * 100 : 0;

  if (lossPercent >= threshold) {
    return {
      triggered: true,
      severity: lossPercent >= threshold * 2 ? 'critical' : 'warning',
      message: `Backlink loss of ${lossPercent.toFixed(1)}% detected (threshold: ${threshold}%)`,
      details: { currentBacklinks: current, previousBacklinks: previous, lossPercent, threshold },
    };
  }

  return { triggered: false, severity: 'info', message: '', details: {} };
}

async function checkCrawlError(
  projectId: string,
  rule: AlertRule,
): Promise<{ triggered: boolean; severity: 'critical' | 'warning' | 'info'; message: string; details: Record<string, unknown> }> {
  const threshold = rule.condition.threshold;
  const windowMinutes = rule.condition.window_minutes ?? 1440;

  const errors = await db('crawl_issues')
    .where('project_id', projectId)
    .whereIn('severity', ['critical', 'error'])
    .where('created_at', '>=', db.raw(`NOW() - INTERVAL '${windowMinutes} minutes'`))
    .count<{ count: string }[]>('* as count');

  const errorCount = parseInt(errors[0]?.count ?? '0', 10);

  if (errorCount >= threshold) {
    return {
      triggered: true,
      severity: errorCount >= threshold * 2 ? 'critical' : 'warning',
      message: `${errorCount} crawl errors detected (threshold: ${threshold})`,
      details: { errorCount, threshold, windowMinutes },
    };
  }

  return { triggered: false, severity: 'info', message: '', details: { errorCount } };
}

async function checkDowntime(
  projectId: string,
  _rule: AlertRule,
): Promise<{ triggered: boolean; severity: 'critical' | 'warning' | 'info'; message: string; details: Record<string, unknown> }> {
  const recentDowntime = await db('uptime_logs')
    .where('project_id', projectId)
    .where('checked_at', '>=', db.raw("NOW() - INTERVAL '1 hour'"))
    .where('status_code', '>=', 500)
    .count<{ count: string }[]>('* as count');

  const downtimeCount = parseInt(recentDowntime[0]?.count ?? '0', 10);

  if (downtimeCount > 0) {
    return {
      triggered: true,
      severity: downtimeCount >= 3 ? 'critical' : 'warning',
      message: `${downtimeCount} downtime events detected in the last hour`,
      details: { downtimeCount },
    };
  }

  return { triggered: false, severity: 'info', message: '', details: {} };
}

// ---------------------------------------------------------------------------
// Create alert history
// ---------------------------------------------------------------------------

async function createAlertHistory(
  projectId: string,
  rule: AlertRule,
  severity: 'critical' | 'warning' | 'info',
  message: string,
  details: Record<string, unknown>,
): Promise<void> {
  const id = uuidv4();

  await db('alert_history').insert({
    id,
    project_id: projectId,
    rule_id: rule.id,
    rule_name: rule.name,
    type: rule.type,
    severity,
    message,
    details: JSON.stringify(details),
    acknowledged: false,
  });

  // Trigger notification
  await triggerNotification(projectId, rule, severity, message, details);
}

async function triggerNotification(
  projectId: string,
  rule: AlertRule,
  severity: string,
  message: string,
  details: Record<string, unknown>,
): Promise<void> {
  // Insert into notifications table for async processing
  for (const channel of rule.channels) {
    await db('notifications').insert({
      id: uuidv4(),
      project_id: projectId,
      type: 'alert',
      channel,
      status: 'pending',
      title: `[${severity.toUpperCase()}] ${rule.name}`,
      message,
      metadata: JSON.stringify({ ruleId: rule.id, ruleType: rule.type, details }),
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRule(raw: Record<string, unknown>): AlertRule {
  return {
    id: raw['id'] as string,
    project_id: raw['project_id'] as string,
    name: raw['name'] as string,
    type: raw['type'] as AlertRule['type'],
    condition: typeof raw['condition'] === 'string'
      ? JSON.parse(raw['condition'] as string)
      : (raw['condition'] as AlertRule['condition']),
    channels: typeof raw['channels'] === 'string'
      ? JSON.parse(raw['channels'] as string)
      : (raw['channels'] as string[]),
    enabled: Boolean(raw['enabled']),
    created_at: raw['created_at'] as string,
    updated_at: raw['updated_at'] as string,
  };
}

function formatHistory(raw: Record<string, unknown>): AlertHistory {
  return {
    id: raw['id'] as string,
    project_id: raw['project_id'] as string,
    rule_id: raw['rule_id'] as string,
    rule_name: raw['rule_name'] as string,
    type: raw['type'] as string,
    severity: raw['severity'] as AlertHistory['severity'],
    message: raw['message'] as string,
    details: typeof raw['details'] === 'string'
      ? JSON.parse(raw['details'] as string)
      : (raw['details'] as Record<string, unknown>),
    acknowledged: Boolean(raw['acknowledged']),
    acknowledged_by: (raw['acknowledged_by'] as string) ?? null,
    acknowledged_at: (raw['acknowledged_at'] as string) ?? null,
    created_at: raw['created_at'] as string,
  };
}

export default {
  createRule,
  getRules,
  updateRule,
  deleteRule,
  getAlertHistory,
  acknowledgeAlert,
  checkAlertConditions,
};