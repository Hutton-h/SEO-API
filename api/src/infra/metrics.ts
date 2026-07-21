// ============================================================================
// 运行时指标 (Prometheus 格式)
// ============================================================================

import type { Request, Response, NextFunction } from 'express';

// ── 内存计数器 ────────────────────────────────────────────────────────────────

const counters: Record<string, number> = {
  http_requests_total: 0,
  http_errors_total: 0,
  api_calls_total: 0,
  api_failures_total: 0,
  circuit_opens_total: 0,
  cache_hits_total: 0,
  cache_misses_total: 0,
  queue_jobs_total: 0,
  ws_connections_total: 0,
  ws_messages_total: 0,
};

const gauges: Record<string, number> = {
  memory_rss_bytes: 0,
  memory_heap_used_bytes: 0,
  memory_heap_total_bytes: 0,
  db_pool_active: 0,
  db_pool_idle: 0,
  db_pool_waiting: 0,
};

const histograms: Record<string, number[]> = {
  http_request_duration_ms: [],
  api_response_time_ms: [],
};

// ── 指标更新函数 ──────────────────────────────────────────────────────────────

export function incCounter(name: string, by: number = 1): void {
  if (counters[name] !== undefined) {
    counters[name] += by;
  }
}

export function setGauge(name: string, value: number): void {
  if (gauges[name] !== undefined) {
    gauges[name] = value;
  }
}

export function observeHistogram(name: string, value: number): void {
  if (histograms[name] !== undefined) {
    histograms[name].push(value);
    // 只保留最近 1000 个样本
    if (histograms[name].length > 1000) {
      histograms[name] = histograms[name].slice(-1000);
    }
  }
}

// ── 系统指标采集 ──────────────────────────────────────────────────────────────

function collectSystemMetrics(): void {
  const mem = process.memoryUsage();
  gauges.memory_rss_bytes = mem.rss;
  gauges.memory_heap_used_bytes = mem.heapUsed;
  gauges.memory_heap_total_bytes = mem.heapTotal;
}

// 每 15s 采集一次
setInterval(collectSystemMetrics, 15000);

// ── HTTP 请求耗时中间件 ────────────────────────────────────────────────────────

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  incCounter('http_requests_total');

  res.on('finish', () => {
    const duration = Date.now() - start;
    observeHistogram('http_request_duration_ms', duration);

    if (res.statusCode >= 400) {
      incCounter('http_errors_total');
    }
  });

  next();
}

// ── Prometheus 格式输出 ───────────────────────────────────────────────────────

export function getMetricsText(): string {
  collectSystemMetrics();

  const lines: string[] = [];

  // 计数器
  for (const [name, value] of Object.entries(counters)) {
    lines.push(`# HELP ${name} Counter`);
    lines.push(`# TYPE ${name} counter`);
    lines.push(`${name} ${value}`);
  }

  // 仪表盘
  for (const [name, value] of Object.entries(gauges)) {
    lines.push(`# HELP ${name} Gauge`);
    lines.push(`# TYPE ${name} gauge`);
    lines.push(`${name} ${value}`);
  }

  // 直方图
  for (const [name, samples] of Object.entries(histograms)) {
    if (samples.length === 0) continue;
    const sorted = [...samples].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    lines.push(`# HELP ${name} Histogram`);
    lines.push(`# TYPE ${name} summary`);
    lines.push(`${name}{quantile="0.5"} ${p50}`);
    lines.push(`${name}{quantile="0.95"} ${p95}`);
    lines.push(`${name}{quantile="0.99"} ${p99}`);
    lines.push(`${name}_sum ${sum}`);
    lines.push(`${name}_count ${samples.length}`);
    lines.push(`${name}_avg ${avg}`);
  }

  return lines.join('\n') + '\n';
}

// ── 指标端点 ──────────────────────────────────────────────────────────────────

export function metricsEndpoint(req: Request, res: Response): void {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(getMetricsText());
}