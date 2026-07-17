import { db } from '../../shared/database.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Uptime Processor
// Scheduled task: check all project domains for uptime
// ---------------------------------------------------------------------------

export interface UptimeProcessorJob {
  taskId?: string;
  projectId?: string;
}

export async function processUptimeCheck(job: UptimeProcessorJob): Promise<void> {
  console.log('[UptimeProcessor] Starting uptime check...');

  try {
    // Get all active projects
    const projects = job.projectId
      ? await db('projects').where('id', job.projectId)
      : await db('projects').where('status', 'active');

    if (!projects.length) {
      console.log('[UptimeProcessor] No projects to check');
      return;
    }

    let checkedCount = 0;
    let errorCount = 0;

    for (const project of projects as Array<{ id: string; domain: string }>) {
      try {
        const domain = project.domain;
        const url = domain.startsWith('http') ? domain : `https://${domain}`;

        const startTime = Date.now();

        const response = await axios.get(url, {
          timeout: 30000,
          validateStatus: () => true,
          headers: {
            'User-Agent': 'CraneSEO-UptimeMonitor/1.0',
          },
        });

        const responseTimeMs = Date.now() - startTime;
        const statusCode = response.status;
        const isUp = statusCode >= 200 && statusCode < 500;

        await db('uptime_logs').insert({
          id: uuidv4(),
          project_id: project.id,
          url,
          status_code: statusCode,
          response_time_ms: responseTimeMs,
          is_up: isUp,
          error_message: isUp ? null : `HTTP ${statusCode}`,
        });

        // If the site is down, create an alert
        if (!isUp) {
          await db('alert_history').insert({
            id: uuidv4(),
            project_id: project.id,
            rule_id: 'uptime-check',
            rule_name: 'Automated Uptime Check',
            type: 'downtime',
            severity: statusCode >= 500 ? 'critical' : 'warning',
            message: `Site ${domain} returned HTTP ${statusCode}`,
            acknowledged: false,
          });
        }

        checkedCount++;
      } catch (err) {
        errorCount++;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';

        await db('uptime_logs').insert({
          id: uuidv4(),
          project_id: project.id,
          url: `https://${project.domain}`,
          status_code: 0,
          response_time_ms: 0,
          is_up: false,
          error_message: errorMessage,
        });

        // Alert for downtime
        await db('alert_history').insert({
          id: uuidv4(),
          project_id: project.id,
          rule_id: 'uptime-check',
          rule_name: 'Automated Uptime Check',
          type: 'downtime',
          severity: 'critical',
          message: `Site ${project.domain} is unreachable: ${errorMessage}`,
          acknowledged: false,
        });
      }

      // Small delay between checks to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`[UptimeProcessor] Check complete: ${checkedCount} checked, ${errorCount} errors`);

    // Update task if provided
    if (job.taskId) {
      await db('tasks')
        .where('id', job.taskId)
        .update({
          status: 'completed',
          progress: 100,
          completed_at: db.fn.now(),
          result: JSON.stringify({ checkedCount, errorCount }),
        });
    }
  } catch (err) {
    console.error('[UptimeProcessor] Fatal error:', err);

    if (job.taskId) {
      await db('tasks')
        .where('id', job.taskId)
        .update({
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
          completed_at: db.fn.now(),
        });
    }

    throw err;
  }
}

export default {
  processUptimeCheck,
};