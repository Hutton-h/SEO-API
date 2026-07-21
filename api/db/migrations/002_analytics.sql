-- =============================================================================
-- Crane SEO Platform — 分析数据表迁移
-- 文件: db/migrations/002_analytics.sql
-- 前置依赖: 001_core.sql 已执行（users, projects, keywords, crawl_tasks, crawl_pages, crawl_issues 表已存在）
-- =============================================================================

-- =============================================================================
-- 1. rankings — 排名历史表
-- =============================================================================
CREATE TABLE IF NOT EXISTS rankings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    keyword_id      UUID REFERENCES keywords(id) ON DELETE SET NULL,
    position        INT,
    previous_position INT,
    change          INT,
    url             TEXT,
    serp_features   JSONB DEFAULT '[]'::jsonb,
    engine          TEXT NOT NULL DEFAULT 'google' CHECK (engine IN ('google', 'bing', 'baidu')),
    device          TEXT NOT NULL DEFAULT 'desktop' CHECK (device IN ('desktop', 'mobile')),
    location        TEXT,
    tracked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  rankings                   IS '排名历史记录表';
COMMENT ON COLUMN rankings.id                IS '记录唯一标识';
COMMENT ON COLUMN rankings.project_id        IS '所属项目 ID';
COMMENT ON COLUMN rankings.keyword_id        IS '关联关键词 ID';
COMMENT ON COLUMN rankings.position          IS '当前排名位置';
COMMENT ON COLUMN rankings.previous_position  IS '上次排名位置';
COMMENT ON COLUMN rankings.change            IS '排名变化（正数=下降，负数=上升）';
COMMENT ON COLUMN rankings.url               IS '排名 URL';
COMMENT ON COLUMN rankings.serp_features     IS 'SERP 特征 JSON（featured_snippet, local_pack 等）';
COMMENT ON COLUMN rankings.engine            IS '搜索引擎: google | bing | baidu';
COMMENT ON COLUMN rankings.device            IS '设备: desktop | mobile';
COMMENT ON COLUMN rankings.location          IS '排名地区';
COMMENT ON COLUMN rankings.tracked_at        IS '追踪时间';
COMMENT ON COLUMN rankings.created_at        IS '创建时间';

CREATE INDEX IF NOT EXISTS idx_rankings_project_kw_tracked ON rankings (project_id, keyword_id, tracked_at DESC);

-- =============================================================================
-- 2. backlinks — 外链表
-- =============================================================================
CREATE TABLE IF NOT EXISTS backlinks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_url      TEXT NOT NULL,
    target_url      TEXT NOT NULL,
    anchor_text     TEXT,
    link_type       TEXT DEFAULT 'dofollow' CHECK (link_type IN ('dofollow', 'nofollow', 'sponsored', 'ugc')),
    domain_rating   INT,
    page_rating     INT,
    first_seen      TIMESTAMPTZ,
    last_seen       TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'lost')),
    quality_score   DECIMAL(5, 2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  backlinks                 IS '外链表';
COMMENT ON COLUMN backlinks.id              IS '外链唯一标识';
COMMENT ON COLUMN backlinks.project_id      IS '所属项目 ID';
COMMENT ON COLUMN backlinks.source_url      IS '来源页面 URL';
COMMENT ON COLUMN backlinks.target_url      IS '目标页面 URL';
COMMENT ON COLUMN backlinks.anchor_text     IS '锚文本';
COMMENT ON COLUMN backlinks.link_type       IS '链接类型: dofollow | nofollow | sponsored | ugc';
COMMENT ON COLUMN backlinks.domain_rating   IS '来源域名评分';
COMMENT ON COLUMN backlinks.page_rating     IS '来源页面评分';
COMMENT ON COLUMN backlinks.first_seen      IS '首次发现时间';
COMMENT ON COLUMN backlinks.last_seen       IS '最后发现时间';
COMMENT ON COLUMN backlinks.status          IS '状态: active | lost';
COMMENT ON COLUMN backlinks.quality_score   IS '质量评分';
COMMENT ON COLUMN backlinks.created_at      IS '创建时间';

CREATE INDEX IF NOT EXISTS idx_backlinks_project_status ON backlinks (project_id, status, last_seen DESC);

-- =============================================================================
-- 3. competitor_domains — 竞品域名表
-- =============================================================================
CREATE TABLE IF NOT EXISTS competitor_domains (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    domain          TEXT NOT NULL,
    name            TEXT,
    notes           TEXT,
    traffic_estimate INT,
    keyword_count   INT,
    backlink_count  INT,
    last_snapshot_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  competitor_domains              IS '竞品域名表';
COMMENT ON COLUMN competitor_domains.id           IS '竞品唯一标识';
COMMENT ON COLUMN competitor_domains.project_id   IS '所属项目 ID';
COMMENT ON COLUMN competitor_domains.domain       IS '竞品域名';
COMMENT ON COLUMN competitor_domains.name         IS '竞品名称';
COMMENT ON COLUMN competitor_domains.notes        IS '备注';
COMMENT ON COLUMN competitor_domains.traffic_estimate IS '估计流量';
COMMENT ON COLUMN competitor_domains.keyword_count   IS '关键词数量';
COMMENT ON COLUMN competitor_domains.backlink_count  IS '外链数量';
COMMENT ON COLUMN competitor_domains.last_snapshot_at IS '上次快照时间';
COMMENT ON COLUMN competitor_domains.created_at    IS '创建时间';
COMMENT ON COLUMN competitor_domains.updated_at    IS '更新时间';

CREATE UNIQUE INDEX IF NOT EXISTS idx_competitor_domains_project_domain ON competitor_domains (project_id, domain);

-- =============================================================================
-- 4. competitor_traffic — 竞品流量表
-- =============================================================================
CREATE TABLE IF NOT EXISTS competitor_traffic (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_id   UUID NOT NULL REFERENCES competitor_domains(id) ON DELETE CASCADE,
    month           TEXT NOT NULL,
    organic_traffic INT,
    paid_traffic    INT,
    top_keywords    JSONB DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  competitor_traffic                 IS '竞品流量月度数据表';
COMMENT ON COLUMN competitor_traffic.id              IS '记录唯一标识';
COMMENT ON COLUMN competitor_traffic.competitor_id   IS '竞品域名 ID';
COMMENT ON COLUMN competitor_traffic.month           IS '月份 (YYYY-MM)';
COMMENT ON COLUMN competitor_traffic.organic_traffic IS '自然流量';
COMMENT ON COLUMN competitor_traffic.paid_traffic    IS '付费流量';
COMMENT ON COLUMN competitor_traffic.top_keywords    IS '热门关键词 JSON';
COMMENT ON COLUMN competitor_traffic.created_at      IS '创建时间';

CREATE INDEX IF NOT EXISTS idx_competitor_traffic_competitor ON competitor_traffic (competitor_id, month);

-- =============================================================================
-- 5. serp_snapshots — SERP 快照表（按月分区）
-- =============================================================================
CREATE TABLE IF NOT EXISTS serp_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    keyword_id      UUID REFERENCES keywords(id) ON DELETE SET NULL,
    engine          TEXT NOT NULL DEFAULT 'google' CHECK (engine IN ('google', 'bing')),
    device          TEXT NOT NULL DEFAULT 'desktop' CHECK (device IN ('desktop', 'mobile')),
    location        TEXT,
    results         JSONB DEFAULT '[]'::jsonb,
    features        JSONB DEFAULT '[]'::jsonb,
    snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (snapshot_at);

COMMENT ON TABLE  serp_snapshots              IS 'SERP 快照表（按月分区）';
COMMENT ON COLUMN serp_snapshots.id           IS '快照唯一标识';
COMMENT ON COLUMN serp_snapshots.project_id   IS '所属项目 ID';
COMMENT ON COLUMN serp_snapshots.keyword_id   IS '关联关键词 ID';
COMMENT ON COLUMN serp_snapshots.engine       IS '搜索引擎: google | bing';
COMMENT ON COLUMN serp_snapshots.device       IS '设备: desktop | mobile';
COMMENT ON COLUMN serp_snapshots.location     IS '搜索地区';
COMMENT ON COLUMN serp_snapshots.results      IS 'SERP 结果 JSON';
COMMENT ON COLUMN serp_snapshots.features     IS 'SERP 特征 JSON';
COMMENT ON COLUMN serp_snapshots.snapshot_at  IS '快照时间';
COMMENT ON COLUMN serp_snapshots.created_at   IS '创建时间';

-- 创建当月分区
DO $$
DECLARE
    current_start DATE := date_trunc('month', NOW())::date;
    current_end   DATE := (date_trunc('month', NOW()) + INTERVAL '1 month')::date;
    next_start    DATE := (date_trunc('month', NOW()) + INTERVAL '1 month')::date;
    next_end      DATE := (date_trunc('month', NOW()) + INTERVAL '2 months')::date;
    current_name  TEXT := 'serp_snapshots_' || to_char(NOW(), 'YYYY_MM');
    next_name     TEXT := 'serp_snapshots_' || to_char(NOW() + INTERVAL '1 month', 'YYYY_MM');
BEGIN
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF serp_snapshots FOR VALUES FROM (%L) TO (%L)',
        current_name, current_start, current_end
    );
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF serp_snapshots FOR VALUES FROM (%L) TO (%L)',
        next_name, next_start, next_end
    );
END $$;

CREATE INDEX IF NOT EXISTS idx_serp_snapshots_project_kw ON serp_snapshots (project_id, keyword_id, snapshot_at DESC);

-- =============================================================================
-- 6. serp_features — SERP 特征表
-- =============================================================================
CREATE TABLE IF NOT EXISTS serp_features (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id     UUID NOT NULL REFERENCES serp_snapshots(id) ON DELETE CASCADE,
    keyword_id      UUID REFERENCES keywords(id) ON DELETE SET NULL,
    feature_type    TEXT NOT NULL CHECK (feature_type IN ('featured_snippet', 'paa', 'knowledge_panel', 'local_pack', 'video', 'sitelinks', 'image_pack', 'shopping', 'ads')),
    position        INT,
    url             TEXT,
    data            JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  serp_features                IS 'SERP 特征详情表';
COMMENT ON COLUMN serp_features.id             IS '特征唯一标识';
COMMENT ON COLUMN serp_features.snapshot_id    IS '关联快照 ID';
COMMENT ON COLUMN serp_features.keyword_id     IS '关联关键词 ID';
COMMENT ON COLUMN serp_features.feature_type   IS '特征类型: featured_snippet | paa | knowledge_panel | local_pack | video | sitelinks | image_pack | shopping | ads';
COMMENT ON COLUMN serp_features.position       IS '特征在 SERP 中的位置';
COMMENT ON COLUMN serp_features.url            IS '特征来源 URL';
COMMENT ON COLUMN serp_features.data           IS '特征详细数据 JSON';
COMMENT ON COLUMN serp_features.created_at     IS '创建时间';

CREATE INDEX IF NOT EXISTS idx_serp_features_snapshot ON serp_features (snapshot_id);

-- =============================================================================
-- 7. keyword_clusters — 关键词聚类表
-- =============================================================================
CREATE TABLE IF NOT EXISTS keyword_clusters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            TEXT,
    keyword_count   INT DEFAULT 0,
    avg_volume      INT,
    avg_difficulty  INT,
    top_keyword     TEXT,
    centroid_vector vector(1536),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  keyword_clusters                IS '关键词聚类表';
COMMENT ON COLUMN keyword_clusters.id             IS '聚类唯一标识';
COMMENT ON COLUMN keyword_clusters.project_id     IS '所属项目 ID';
COMMENT ON COLUMN keyword_clusters.name           IS '聚类名称';
COMMENT ON COLUMN keyword_clusters.keyword_count  IS '聚类内关键词数量';
COMMENT ON COLUMN keyword_clusters.avg_volume     IS '平均搜索量';
COMMENT ON COLUMN keyword_clusters.avg_difficulty IS '平均难度';
COMMENT ON COLUMN keyword_clusters.top_keyword    IS '代表关键词';
COMMENT ON COLUMN keyword_clusters.centroid_vector IS '聚类中心向量 (1536维)';
COMMENT ON COLUMN keyword_clusters.created_at     IS '创建时间';
COMMENT ON COLUMN keyword_clusters.updated_at     IS '更新时间';

CREATE INDEX IF NOT EXISTS idx_keyword_clusters_project ON keyword_clusters (project_id);