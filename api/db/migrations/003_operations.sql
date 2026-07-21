-- =============================================================================
-- Crane SEO Platform — 运营数据表迁移
-- 文件: db/migrations/003_operations.sql
-- 前置依赖: 001_core.sql 和 002_analytics.sql 已执行
-- =============================================================================

-- =============================================================================
-- 1. internal_link_suggestions — 内链建议表
-- =============================================================================
CREATE TABLE IF NOT EXISTS internal_link_suggestions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_page_id  UUID NOT NULL REFERENCES crawl_pages(id) ON DELETE CASCADE,
    target_page_id  UUID NOT NULL REFERENCES crawl_pages(id) ON DELETE CASCADE,
    anchor_text     TEXT,
    context         TEXT,
    similarity_score DECIMAL(5, 4),
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'implemented')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  internal_link_suggestions              IS '内链建议表';
COMMENT ON COLUMN internal_link_suggestions.id           IS '建议唯一标识';
COMMENT ON COLUMN internal_link_suggestions.project_id   IS '所属项目 ID';
COMMENT ON COLUMN internal_link_suggestions.source_page_id IS '来源页面 ID';
COMMENT ON COLUMN internal_link_suggestions.target_page_id IS '目标页面 ID';
COMMENT ON COLUMN internal_link_suggestions.anchor_text  IS '建议锚文本';
COMMENT ON COLUMN internal_link_suggestions.context      IS '内链建议上下文（来源页面中的段落）';
COMMENT ON COLUMN internal_link_suggestions.similarity_score IS '内容相似度评分 (0.0-1.0)';
COMMENT ON COLUMN internal_link_suggestions.status       IS '状态: pending | accepted | rejected | implemented';
COMMENT ON COLUMN internal_link_suggestions.created_at   IS '创建时间';
COMMENT ON COLUMN internal_link_suggestions.updated_at   IS '更新时间';

CREATE INDEX IF NOT EXISTS idx_ils_project_status ON internal_link_suggestions (project_id) WHERE status = 'pending';

-- =============================================================================
-- 2. link_graph — 链接图谱表
-- =============================================================================
CREATE TABLE IF NOT EXISTS link_graph (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_url      TEXT NOT NULL,
    target_url      TEXT NOT NULL,
    anchor_text     TEXT,
    rel             TEXT,
    is_internal     BOOLEAN NOT NULL DEFAULT true,
    depth           INT DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  link_graph                  IS '链接图谱表';
COMMENT ON COLUMN link_graph.id               IS '链接关系唯一标识';
COMMENT ON COLUMN link_graph.project_id       IS '所属项目 ID';
COMMENT ON COLUMN link_graph.source_url       IS '来源页面 URL';
COMMENT ON COLUMN link_graph.target_url       IS '目标页面 URL';
COMMENT ON COLUMN link_graph.anchor_text      IS '锚文本';
COMMENT ON COLUMN link_graph.rel              IS 'rel 属性';
COMMENT ON COLUMN link_graph.is_internal      IS '是否站内链接';
COMMENT ON COLUMN link_graph.depth            IS '链接深度（距首页的跳数）';
COMMENT ON COLUMN link_graph.created_at       IS '创建时间';

CREATE INDEX IF NOT EXISTS idx_link_graph_project ON link_graph (project_id, is_internal);

-- =============================================================================
-- 3. content_decay — 内容衰减表
-- =============================================================================
CREATE TABLE IF NOT EXISTS content_decay (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    page_id         UUID NOT NULL REFERENCES crawl_pages(id) ON DELETE CASCADE,
    decay_score     DECIMAL(5, 2),
    time_factor     DECIMAL(5, 2),
    traffic_factor  DECIMAL(5, 2),
    ranking_factor  DECIMAL(5, 2),
    competitor_factor DECIMAL(5, 2),
    depth_factor    DECIMAL(5, 2),
    last_updated    TIMESTAMPTZ,
    recommendation  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  content_decay                    IS '内容衰减分析表';
COMMENT ON COLUMN content_decay.id                 IS '记录唯一标识';
COMMENT ON COLUMN content_decay.project_id         IS '所属项目 ID';
COMMENT ON COLUMN content_decay.page_id            IS '关联页面 ID';
COMMENT ON COLUMN content_decay.decay_score        IS '综合衰减评分 (0-100，越高越需要更新)';
COMMENT ON COLUMN content_decay.time_factor        IS '时间因子（距上次更新天数的影响）';
COMMENT ON COLUMN content_decay.traffic_factor     IS '流量因子（流量下降的影响）';
COMMENT ON COLUMN content_decay.ranking_factor     IS '排名因子（排名下降的影响）';
COMMENT ON COLUMN content_decay.competitor_factor  IS '竞品因子（竞品内容更新的影响）';
COMMENT ON COLUMN content_decay.depth_factor       IS '深度因子（内容深度不足的影响）';
COMMENT ON COLUMN content_decay.last_updated       IS '页面最后更新时间';
COMMENT ON COLUMN content_decay.recommendation     IS '更新建议';
COMMENT ON COLUMN content_decay.created_at         IS '创建时间';
COMMENT ON COLUMN content_decay.updated_at         IS '更新时间';

CREATE INDEX IF NOT EXISTS idx_content_decay_project ON content_decay (project_id, decay_score DESC);

-- =============================================================================
-- 4. alert_rules — 告警规则表
-- =============================================================================
CREATE TABLE IF NOT EXISTS alert_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    conditions      JSONB NOT NULL DEFAULT '{}'::jsonb,
    logic           TEXT NOT NULL DEFAULT 'AND' CHECK (logic IN ('AND', 'OR')),
    severity        TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    is_enabled      BOOLEAN NOT NULL DEFAULT true,
    cooldown_minutes INT NOT NULL DEFAULT 60,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  alert_rules                    IS '告警规则表';
COMMENT ON COLUMN alert_rules.id                 IS '规则唯一标识';
COMMENT ON COLUMN alert_rules.project_id         IS '所属项目 ID';
COMMENT ON COLUMN alert_rules.name               IS '规则名称';
COMMENT ON COLUMN alert_rules.conditions         IS '触发条件 JSON (如 {"metric":"rank_change","threshold":3,"operator":"gt"})';
COMMENT ON COLUMN alert_rules.logic              IS '条件组合逻辑: AND | OR';
COMMENT ON COLUMN alert_rules.severity           IS '严重程度: critical | high | medium | low';
COMMENT ON COLUMN alert_rules.is_enabled         IS '是否启用';
COMMENT ON COLUMN alert_rules.cooldown_minutes   IS '冷却时间 (分钟)';
COMMENT ON COLUMN alert_rules.created_at         IS '创建时间';
COMMENT ON COLUMN alert_rules.updated_at         IS '更新时间';

-- =============================================================================
-- 5. alert_history — 告警历史表
-- =============================================================================
CREATE TABLE IF NOT EXISTS alert_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    rule_id         UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
    severity        TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    title           TEXT NOT NULL,
    message         TEXT NOT NULL,
    data            JSONB DEFAULT '{}'::jsonb,
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'ignored')),
    acknowledged_at TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  alert_history                  IS '告警历史表';
COMMENT ON COLUMN alert_history.id               IS '告警唯一标识';
COMMENT ON COLUMN alert_history.project_id       IS '所属项目 ID';
COMMENT ON COLUMN alert_history.rule_id          IS '触发规则 ID';
COMMENT ON COLUMN alert_history.severity         IS '严重程度';
COMMENT ON COLUMN alert_history.title            IS '告警标题';
COMMENT ON COLUMN alert_history.message          IS '告警详情';
COMMENT ON COLUMN alert_history.data             IS '告警相关数据 JSON';
COMMENT ON COLUMN alert_history.status           IS '状态: active | acknowledged | resolved | ignored';
COMMENT ON COLUMN alert_history.acknowledged_at  IS '确认时间';
COMMENT ON COLUMN alert_history.resolved_at      IS '解决时间';
COMMENT ON COLUMN alert_history.created_at       IS '创建时间';

CREATE INDEX IF NOT EXISTS idx_alert_history_project_status ON alert_history (project_id, status, created_at DESC);

-- =============================================================================
-- 6. notifications — 通知表
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    alert_id        UUID REFERENCES alert_history(id) ON DELETE SET NULL,
    channel         TEXT NOT NULL CHECK (channel IN ('email', 'dingtalk', 'feishu', 'slack', 'webhook')),
    recipient       TEXT NOT NULL,
    subject         TEXT,
    body            TEXT,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at         TIMESTAMPTZ,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  notifications                  IS '通知记录表';
COMMENT ON COLUMN notifications.id               IS '通知唯一标识';
COMMENT ON COLUMN notifications.project_id       IS '所属项目 ID';
COMMENT ON COLUMN notifications.alert_id         IS '关联告警 ID';
COMMENT ON COLUMN notifications.channel          IS '通知渠道: email | dingtalk | feishu | slack | webhook';
COMMENT ON COLUMN notifications.recipient        IS '接收人';
COMMENT ON COLUMN notifications.subject          IS '通知主题';
COMMENT ON COLUMN notifications.body             IS '通知正文';
COMMENT ON COLUMN notifications.status           IS '发送状态: pending | sent | failed';
COMMENT ON COLUMN notifications.sent_at          IS '发送时间';
COMMENT ON COLUMN notifications.error_message    IS '失败原因';
COMMENT ON COLUMN notifications.created_at       IS '创建时间';

-- =============================================================================
-- 7. webhooks — Webhook 配置表
-- =============================================================================
CREATE TABLE IF NOT EXISTS webhooks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    secret          TEXT,
    events          TEXT[] NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    failure_count   INT DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  webhooks                      IS 'Webhook 配置表';
COMMENT ON COLUMN webhooks.id                   IS 'Webhook 唯一标识';
COMMENT ON COLUMN webhooks.project_id           IS '所属项目 ID';
COMMENT ON COLUMN webhooks.url                  IS 'Webhook URL';
COMMENT ON COLUMN webhooks.secret               IS '签名密钥';
COMMENT ON COLUMN webhooks.events               IS '监听事件列表 (如 {rank_change,backlink_lost})';
COMMENT ON COLUMN webhooks.is_active            IS '是否启用';
COMMENT ON COLUMN webhooks.last_triggered_at    IS '上次触发时间';
COMMENT ON COLUMN webhooks.failure_count        IS '连续失败次数';
COMMENT ON COLUMN webhooks.created_at           IS '创建时间';
COMMENT ON COLUMN webhooks.updated_at           IS '更新时间';

-- =============================================================================
-- 8. job_history — 任务历史表
-- =============================================================================
CREATE TABLE IF NOT EXISTS job_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name        TEXT NOT NULL,
    queue           TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'failed')),
    data            JSONB DEFAULT '{}'::jsonb,
    result          JSONB DEFAULT '{}'::jsonb,
    error           TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_ms     INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  job_history                IS '后台任务执行历史表';
COMMENT ON COLUMN job_history.id             IS '记录唯一标识';
COMMENT ON COLUMN job_history.job_name       IS '任务名称';
COMMENT ON COLUMN job_history.queue          IS '队列名称';
COMMENT ON COLUMN job_history.status         IS '状态: pending | active | completed | failed';
COMMENT ON COLUMN job_history.data           IS '任务输入数据 JSON';
COMMENT ON COLUMN job_history.result         IS '任务执行结果 JSON';
COMMENT ON COLUMN job_history.error          IS '错误信息';
COMMENT ON COLUMN job_history.started_at     IS '开始时间';
COMMENT ON COLUMN job_history.completed_at   IS '完成时间';
COMMENT ON COLUMN job_history.duration_ms    IS '执行耗时 (毫秒)';
COMMENT ON COLUMN job_history.created_at     IS '创建时间';

CREATE INDEX IF NOT EXISTS idx_job_history_name_status ON job_history (job_name, status);

-- =============================================================================
-- 9. page_snapshots — 页面快照表（按月分区）
-- =============================================================================
CREATE TABLE IF NOT EXISTS page_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    page_id         UUID NOT NULL REFERENCES crawl_pages(id) ON DELETE CASCADE,
    title           TEXT,
    meta_description TEXT,
    content_hash    TEXT,
    word_count      INT,
    seo_score       INT,
    snapshot_data   JSONB DEFAULT '{}'::jsonb,
    snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (snapshot_at);

COMMENT ON TABLE  page_snapshots                 IS '页面变更快照表（按月分区）';
COMMENT ON COLUMN page_snapshots.id              IS '快照唯一标识';
COMMENT ON COLUMN page_snapshots.project_id      IS '所属项目 ID';
COMMENT ON COLUMN page_snapshots.page_id         IS '关联页面 ID';
COMMENT ON COLUMN page_snapshots.title           IS '快照时的页面标题';
COMMENT ON COLUMN page_snapshots.meta_description IS '快照时的 Meta Description';
COMMENT ON COLUMN page_snapshots.content_hash    IS '内容哈希';
COMMENT ON COLUMN page_snapshots.word_count      IS '正文字数';
COMMENT ON COLUMN page_snapshots.seo_score       IS 'SEO 评分';
COMMENT ON COLUMN page_snapshots.snapshot_data   IS '完整快照数据 JSON';
COMMENT ON COLUMN page_snapshots.snapshot_at     IS '快照时间';
COMMENT ON COLUMN page_snapshots.created_at      IS '创建时间';

-- 创建当月分区
DO $$
DECLARE
    ps_current_start DATE := date_trunc('month', NOW())::date;
    ps_current_end   DATE := (date_trunc('month', NOW()) + INTERVAL '1 month')::date;
    ps_next_start    DATE := (date_trunc('month', NOW()) + INTERVAL '1 month')::date;
    ps_next_end      DATE := (date_trunc('month', NOW()) + INTERVAL '2 months')::date;
    ps_current_name  TEXT := 'page_snapshots_' || to_char(NOW(), 'YYYY_MM');
    ps_next_name     TEXT := 'page_snapshots_' || to_char(NOW() + INTERVAL '1 month', 'YYYY_MM');
BEGIN
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF page_snapshots FOR VALUES FROM (%L) TO (%L)',
        ps_current_name, ps_current_start, ps_current_end
    );
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF page_snapshots FOR VALUES FROM (%L) TO (%L)',
        ps_next_name, ps_next_start, ps_next_end
    );
END $$;

-- =============================================================================
-- 10. dns_snapshots — DNS 快照表
-- =============================================================================
CREATE TABLE IF NOT EXISTS dns_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    domain          TEXT NOT NULL,
    records         JSONB DEFAULT '{}'::jsonb,
    ssl_expiry      TIMESTAMPTZ,
    ssl_issuer      TEXT,
    snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  dns_snapshots              IS 'DNS 快照表';
COMMENT ON COLUMN dns_snapshots.id           IS '快照唯一标识';
COMMENT ON COLUMN dns_snapshots.project_id   IS '所属项目 ID';
COMMENT ON COLUMN dns_snapshots.domain       IS '域名';
COMMENT ON COLUMN dns_snapshots.records      IS 'DNS 记录 JSON';
COMMENT ON COLUMN dns_snapshots.ssl_expiry   IS 'SSL 证书过期时间';
COMMENT ON COLUMN dns_snapshots.ssl_issuer   IS 'SSL 颁发机构';
COMMENT ON COLUMN dns_snapshots.snapshot_at  IS '快照时间';
COMMENT ON COLUMN dns_snapshots.created_at   IS '创建时间';

-- =============================================================================
-- 11. uptime_logs — 可用性监控表
-- =============================================================================
CREATE TABLE IF NOT EXISTS uptime_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    status_code     INT,
    response_time_ms INT,
    is_up           BOOLEAN NOT NULL DEFAULT true,
    error_message   TEXT,
    checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  uptime_logs                  IS '可用性监控日志表';
COMMENT ON COLUMN uptime_logs.id               IS '记录唯一标识';
COMMENT ON COLUMN uptime_logs.project_id       IS '所属项目 ID';
COMMENT ON COLUMN uptime_logs.url              IS '被监控 URL';
COMMENT ON COLUMN uptime_logs.status_code      IS 'HTTP 状态码';
COMMENT ON COLUMN uptime_logs.response_time_ms IS '响应时间 (毫秒)';
COMMENT ON COLUMN uptime_logs.is_up            IS '是否可用';
COMMENT ON COLUMN uptime_logs.error_message    IS '错误信息';
COMMENT ON COLUMN uptime_logs.checked_at       IS '检查时间';
COMMENT ON COLUMN uptime_logs.created_at       IS '创建时间';

CREATE INDEX IF NOT EXISTS idx_uptime_logs_project_checked ON uptime_logs (project_id, checked_at DESC);

-- =============================================================================
-- 12. api_usage_logs — API 用量日志表
-- =============================================================================
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
    provider        TEXT NOT NULL,
    method          TEXT,
    endpoint        TEXT,
    status          TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout', 'circuit_open')),
    response_time_ms INT,
    cost_usd        DECIMAL(10, 6) DEFAULT 0,
    request_data    JSONB DEFAULT '{}'::jsonb,
    response_summary TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  api_usage_logs                  IS 'API 用量日志表';
COMMENT ON COLUMN api_usage_logs.id               IS '记录唯一标识';
COMMENT ON COLUMN api_usage_logs.user_id          IS '用户 ID';
COMMENT ON COLUMN api_usage_logs.project_id       IS '项目 ID';
COMMENT ON COLUMN api_usage_logs.provider         IS 'API 供应商 (如 dataforseo, openai, majestic)';
COMMENT ON COLUMN api_usage_logs.method           IS '调用的方法名';
COMMENT ON COLUMN api_usage_logs.endpoint         IS 'API 端点';
COMMENT ON COLUMN api_usage_logs.status           IS '调用状态: success | error | timeout | circuit_open';
COMMENT ON COLUMN api_usage_logs.response_time_ms IS '响应时间 (毫秒)';
COMMENT ON COLUMN api_usage_logs.cost_usd         IS '调用费用 (美元)';
COMMENT ON COLUMN api_usage_logs.request_data     IS '请求数据 JSON';
COMMENT ON COLUMN api_usage_logs.response_summary IS '响应摘要';
COMMENT ON COLUMN api_usage_logs.created_at       IS '创建时间';

CREATE INDEX IF NOT EXISTS idx_api_usage_provider_date ON api_usage_logs (provider, created_at DESC);