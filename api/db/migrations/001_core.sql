-- =============================================================================
-- Crane SEO Platform — 核心业务表迁移
-- 文件: db/migrations/001_core.sql
-- 依赖: PostgreSQL 16 + pgvector 扩展
-- =============================================================================

-- 确保 pgvector 扩展已启用（正式启用见 004_indexes.sql）
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- 1. users — 用户表
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    name            TEXT NOT NULL DEFAULT '',
    role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    avatar_url      TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users                    IS '用户表';
COMMENT ON COLUMN users.id                 IS '用户唯一标识';
COMMENT ON COLUMN users.email              IS '登录邮箱，唯一';
COMMENT ON COLUMN users.password_hash      IS 'bcrypt 加密密码';
COMMENT ON COLUMN users.name               IS '用户显示名称';
COMMENT ON COLUMN users.role               IS '角色: admin | user';
COMMENT ON COLUMN users.avatar_url         IS '头像 URL';
COMMENT ON COLUMN users.is_active          IS '是否启用';
COMMENT ON COLUMN users.created_at         IS '创建时间';
COMMENT ON COLUMN users.updated_at         IS '更新时间';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- =============================================================================
-- 2. projects — 项目表
-- =============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    domain          TEXT NOT NULL,
    industry        TEXT NOT NULL DEFAULT 'crane_manufacturing',
    target_country  TEXT,
    target_language TEXT,
    settings        JSONB DEFAULT '{}'::jsonb,
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  projects                 IS 'SEO 项目表';
COMMENT ON COLUMN projects.id              IS '项目唯一标识';
COMMENT ON COLUMN projects.user_id         IS '所属用户 ID';
COMMENT ON COLUMN projects.name            IS '项目名称';
COMMENT ON COLUMN projects.domain          IS '目标域名';
COMMENT ON COLUMN projects.industry        IS '行业分类，默认 crane_manufacturing';
COMMENT ON COLUMN projects.target_country  IS '目标国家';
COMMENT ON COLUMN projects.target_language IS '目标语言';
COMMENT ON COLUMN projects.settings        IS '项目设置 JSON';
COMMENT ON COLUMN projects.status          IS '状态: active | paused | archived';
COMMENT ON COLUMN projects.created_at      IS '创建时间';
COMMENT ON COLUMN projects.updated_at      IS '更新时间';

-- =============================================================================
-- 3. keywords — 关键词表
-- =============================================================================
CREATE TABLE IF NOT EXISTS keywords (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    keyword         TEXT NOT NULL,
    search_volume   INT,
    cpc             DECIMAL(10, 2),
    difficulty      INT,
    search_intent   TEXT CHECK (search_intent IN ('informational', 'commercial', 'transactional', 'navigational')),
    priority_score  DECIMAL(5, 2),
    cluster_id      UUID,
    embedding       vector(1536),
    best_position   INT,
    current_position INT,
    trend_direction TEXT CHECK (trend_direction IN ('up', 'down', 'stable')),
    source          TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'gsc', 'competitor', 'suggestion')),
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  keywords                     IS '关键词表';
COMMENT ON COLUMN keywords.id                  IS '关键词唯一标识';
COMMENT ON COLUMN keywords.project_id          IS '所属项目 ID';
COMMENT ON COLUMN keywords.keyword             IS '关键词文本';
COMMENT ON COLUMN keywords.search_volume       IS '月搜索量';
COMMENT ON COLUMN keywords.cpc                 IS '单次点击成本';
COMMENT ON COLUMN keywords.difficulty          IS '关键词难度 (0-100)';
COMMENT ON COLUMN keywords.search_intent       IS '搜索意图: informational | commercial | transactional | navigational';
COMMENT ON COLUMN keywords.priority_score      IS '优先级评分';
COMMENT ON COLUMN keywords.cluster_id          IS '所属关键词聚类 ID';
COMMENT ON COLUMN keywords.embedding           IS '1536 维向量 (text-embedding-3-small)';
COMMENT ON COLUMN keywords.best_position       IS '历史最佳排名';
COMMENT ON COLUMN keywords.current_position    IS '当前排名';
COMMENT ON COLUMN keywords.trend_direction     IS '排名趋势: up | down | stable';
COMMENT ON COLUMN keywords.source              IS '来源: manual | gsc | competitor | suggestion';
COMMENT ON COLUMN keywords.status              IS '状态: active | paused | archived';
COMMENT ON COLUMN keywords.created_at          IS '创建时间';
COMMENT ON COLUMN keywords.updated_at          IS '更新时间';

CREATE UNIQUE INDEX IF NOT EXISTS idx_keywords_project_keyword ON keywords (project_id, keyword);
CREATE INDEX IF NOT EXISTS idx_keywords_project_id ON keywords (project_id);

-- =============================================================================
-- 4. crawl_tasks — 爬取任务表
-- =============================================================================
CREATE TABLE IF NOT EXISTS crawl_tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type            TEXT NOT NULL DEFAULT 'quick' CHECK (type IN ('quick', 'full', 'owner')),
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    config          JSONB DEFAULT '{}'::jsonb,
    total_pages     INT DEFAULT 0,
    crawled_pages   INT DEFAULT 0,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  crawl_tasks                 IS '爬取任务表';
COMMENT ON COLUMN crawl_tasks.id              IS '任务唯一标识';
COMMENT ON COLUMN crawl_tasks.project_id      IS '所属项目 ID';
COMMENT ON COLUMN crawl_tasks.type            IS '类型: quick | full | owner';
COMMENT ON COLUMN crawl_tasks.status          IS '状态: pending | running | completed | failed';
COMMENT ON COLUMN crawl_tasks.config          IS '任务配置 JSON';
COMMENT ON COLUMN crawl_tasks.total_pages     IS '总页面数';
COMMENT ON COLUMN crawl_tasks.crawled_pages   IS '已爬取页面数';
COMMENT ON COLUMN crawl_tasks.started_at      IS '开始时间';
COMMENT ON COLUMN crawl_tasks.completed_at    IS '完成时间';
COMMENT ON COLUMN crawl_tasks.error_message   IS '错误信息';
COMMENT ON COLUMN crawl_tasks.created_at      IS '创建时间';

CREATE INDEX IF NOT EXISTS idx_crawl_tasks_project ON crawl_tasks (project_id);

-- =============================================================================
-- 5. crawl_pages — 爬取页面表
-- =============================================================================
CREATE TABLE IF NOT EXISTS crawl_pages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES crawl_tasks(id) ON DELETE CASCADE,
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    status_code     INT,
    title           TEXT,
    meta_description TEXT,
    h1              TEXT,
    content         TEXT,
    word_count      INT,
    seo_score       INT,
    audit_data      JSONB DEFAULT '{}'::jsonb,
    parsed_data     JSONB DEFAULT '{}'::jsonb,
    content_hash    TEXT,
    embedding       vector(1536),
    screenshot_path TEXT,
    performance_data JSONB DEFAULT '{}'::jsonb,
    response_time_ms INT,
    crawled_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  crawl_pages                    IS '爬取页面表';
COMMENT ON COLUMN crawl_pages.id                 IS '页面唯一标识';
COMMENT ON COLUMN crawl_pages.task_id            IS '所属爬取任务 ID';
COMMENT ON COLUMN crawl_pages.project_id         IS '所属项目 ID';
COMMENT ON COLUMN crawl_pages.url                IS '页面 URL';
COMMENT ON COLUMN crawl_pages.status_code        IS 'HTTP 状态码';
COMMENT ON COLUMN crawl_pages.title              IS '页面标题';
COMMENT ON COLUMN crawl_pages.meta_description   IS 'Meta Description';
COMMENT ON COLUMN crawl_pages.h1                 IS '第一个 H1 标签内容';
COMMENT ON COLUMN crawl_pages.content            IS '页面正文内容';
COMMENT ON COLUMN crawl_pages.word_count         IS '正文字数';
COMMENT ON COLUMN crawl_pages.seo_score          IS 'SEO 综合评分 (0-100)';
COMMENT ON COLUMN crawl_pages.audit_data         IS '审计原始数据 JSON';
COMMENT ON COLUMN crawl_pages.parsed_data        IS '解析后的结构化数据 JSON';
COMMENT ON COLUMN crawl_pages.content_hash       IS '内容哈希 (用于变更检测)';
COMMENT ON COLUMN crawl_pages.embedding          IS '1536 维向量';
COMMENT ON COLUMN crawl_pages.screenshot_path    IS '页面截图路径';
COMMENT ON COLUMN crawl_pages.performance_data   IS '性能数据 JSON (LCP/CLS/INP/TTFB)';
COMMENT ON COLUMN crawl_pages.response_time_ms   IS '响应时间 (毫秒)';
COMMENT ON COLUMN crawl_pages.crawled_at         IS '爬取时间';
COMMENT ON COLUMN crawl_pages.created_at         IS '创建时间';

CREATE UNIQUE INDEX IF NOT EXISTS idx_crawl_pages_task_url ON crawl_pages (task_id, url);
CREATE INDEX IF NOT EXISTS idx_crawl_pages_task_id ON crawl_pages (task_id);

-- =============================================================================
-- 6. crawl_issues — 爬取问题表
-- =============================================================================
CREATE TABLE IF NOT EXISTS crawl_issues (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id         UUID NOT NULL REFERENCES crawl_pages(id) ON DELETE CASCADE,
    task_id         UUID NOT NULL REFERENCES crawl_tasks(id) ON DELETE CASCADE,
    rule_id         TEXT NOT NULL,
    category        TEXT NOT NULL CHECK (category IN ('on_page', 'technical', 'performance', 'content', 'ux', 'off_page', 'mobile', 'accessibility')),
    severity        TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    message         TEXT NOT NULL,
    suggestion      TEXT,
    element         TEXT,
    snippet         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  crawl_issues                IS '爬取发现的问题表';
COMMENT ON COLUMN crawl_issues.id             IS '问题唯一标识';
COMMENT ON COLUMN crawl_issues.page_id        IS '问题所在页面 ID';
COMMENT ON COLUMN crawl_issues.task_id         IS '所属爬取任务 ID';
COMMENT ON COLUMN crawl_issues.rule_id         IS '触发规则 ID';
COMMENT ON COLUMN crawl_issues.category        IS '问题分类: on_page | technical | performance | content | ux | off_page | mobile | accessibility';
COMMENT ON COLUMN crawl_issues.severity        IS '严重程度: critical | high | medium | low';
COMMENT ON COLUMN crawl_issues.message         IS '问题描述';
COMMENT ON COLUMN crawl_issues.suggestion      IS '修复建议';
COMMENT ON COLUMN crawl_issues.element         IS '问题元素';
COMMENT ON COLUMN crawl_issues.snippet         IS '问题代码片段';
COMMENT ON COLUMN crawl_issues.created_at      IS '创建时间';

CREATE INDEX IF NOT EXISTS idx_crawl_issues_page_id ON crawl_issues (page_id);
CREATE INDEX IF NOT EXISTS idx_crawl_issues_rule_id ON crawl_issues (rule_id);