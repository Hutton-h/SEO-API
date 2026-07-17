-- =============================================================================
-- Crane SEO Platform - Database Initialization Script
-- PostgreSQL 15+
-- Usage: psql -U crane_user -d crane_seo -f init.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 01. projects - 项目表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(512) NOT NULL,
    user_id UUID NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_domain ON projects(domain);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- ---------------------------------------------------------------------------
-- 02. crawl_pages - 爬取页面表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crawl_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title VARCHAR(1024),
    status_code INTEGER,
    load_time_ms INTEGER,
    content_length INTEGER,
    meta_description TEXT,
    h1 VARCHAR(1024),
    h2_count INTEGER DEFAULT 0,
    has_schema BOOLEAN DEFAULT false,
    schema_types TEXT[],
    word_count INTEGER,
    internal_links_count INTEGER DEFAULT 0,
    external_links_count INTEGER DEFAULT 0,
    images_count INTEGER DEFAULT 0,
    images_without_alt INTEGER DEFAULT 0,
    canonical_url TEXT,
    mobile_friendly BOOLEAN,
    crawled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crawl_pages_project_id ON crawl_pages(project_id);
CREATE INDEX idx_crawl_pages_url ON crawl_pages(url);
CREATE INDEX idx_crawl_pages_status_code ON crawl_pages(status_code);
CREATE INDEX idx_crawl_pages_crawled_at ON crawl_pages(crawled_at DESC);

-- ---------------------------------------------------------------------------
-- 03. crawl_issues - 爬取问题表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crawl_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    page_id UUID REFERENCES crawl_pages(id) ON DELETE SET NULL,
    rule_id VARCHAR(255) NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('critical', 'error', 'warning', 'info')),
    category VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    element TEXT,
    url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'ignored')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_crawl_issues_project_id ON crawl_issues(project_id);
CREATE INDEX idx_crawl_issues_page_id ON crawl_issues(page_id);
CREATE INDEX idx_crawl_issues_severity ON crawl_issues(severity);
CREATE INDEX idx_crawl_issues_status ON crawl_issues(status);
CREATE INDEX idx_crawl_issues_rule_id ON crawl_issues(rule_id);
CREATE INDEX idx_crawl_issues_created_at ON crawl_issues(created_at DESC);

-- ---------------------------------------------------------------------------
-- 04. keywords - 关键词表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    keyword VARCHAR(1024) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    location_code INTEGER DEFAULT 0,
    search_volume INTEGER DEFAULT 0,
    competition FLOAT DEFAULT 0,
    cpc FLOAT DEFAULT 0,
    is_custom BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_keywords_project_id ON keywords(project_id);
CREATE INDEX idx_keywords_keyword ON keywords(keyword);
CREATE INDEX idx_keywords_is_custom ON keywords(is_custom);
CREATE INDEX idx_keywords_search_volume ON keywords(search_volume DESC);
CREATE UNIQUE INDEX idx_keywords_project_keyword ON keywords(project_id, keyword);

-- ---------------------------------------------------------------------------
-- 05. rankings - 排名追踪表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    keyword_id UUID REFERENCES keywords(id) ON DELETE SET NULL,
    position INTEGER,
    previous_position INTEGER,
    url TEXT,
    search_engine VARCHAR(50) DEFAULT 'google',
    location_code INTEGER DEFAULT 0,
    language VARCHAR(10) DEFAULT 'en',
    check_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rankings_project_id ON rankings(project_id);
CREATE INDEX idx_rankings_keyword_id ON rankings(keyword_id);
CREATE INDEX idx_rankings_check_date ON rankings(check_date DESC);
CREATE INDEX idx_rankings_search_engine ON rankings(search_engine);
CREATE INDEX idx_rankings_position ON rankings(position);

-- ---------------------------------------------------------------------------
-- 06. backlinks - 反向链接表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS backlinks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    target_url TEXT NOT NULL,
    anchor_text TEXT,
    domain_authority INTEGER,
    page_authority INTEGER,
    link_type VARCHAR(50) DEFAULT 'external',
    is_dofollow BOOLEAN DEFAULT true,
    first_seen DATE,
    last_seen DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_backlinks_project_id ON backlinks(project_id);
CREATE INDEX idx_backlinks_target_url ON backlinks(target_url);
CREATE INDEX idx_backlinks_source_url ON backlinks(source_url);
CREATE INDEX idx_backlinks_domain_authority ON backlinks(domain_authority DESC);
CREATE INDEX idx_backlinks_is_dofollow ON backlinks(is_dofollow);

-- ---------------------------------------------------------------------------
-- 07. sem_ads - SEM 广告表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sem_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    competitor_domain VARCHAR(512) NOT NULL,
    ad_title TEXT,
    ad_description TEXT,
    ad_url TEXT,
    keyword_targeted VARCHAR(1024),
    position INTEGER,
    last_seen DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sem_ads_project_id ON sem_ads(project_id);
CREATE INDEX idx_sem_ads_competitor_domain ON sem_ads(competitor_domain);
CREATE INDEX idx_sem_ads_keyword_targeted ON sem_ads(keyword_targeted);
CREATE INDEX idx_sem_ads_last_seen ON sem_ads(last_seen DESC);

-- ---------------------------------------------------------------------------
-- 08. sem_keyword_metrics - SEM 关键词指标表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sem_keyword_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    keyword VARCHAR(1024) NOT NULL,
    search_volume INTEGER DEFAULT 0,
    cpc FLOAT DEFAULT 0,
    competition FLOAT DEFAULT 0,
    competition_index INTEGER DEFAULT 0,
    monthly_searches JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sem_keyword_metrics_project_id ON sem_keyword_metrics(project_id);
CREATE INDEX idx_sem_keyword_metrics_keyword ON sem_keyword_metrics(keyword);
CREATE INDEX idx_sem_keyword_metrics_search_volume ON sem_keyword_metrics(search_volume DESC);

-- ---------------------------------------------------------------------------
-- 09. gmb_profiles - Google My Business 档案表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gmb_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    business_name VARCHAR(512) NOT NULL,
    address TEXT,
    rating FLOAT DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    categories TEXT[],
    website VARCHAR(1024),
    phone VARCHAR(100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gmb_profiles_project_id ON gmb_profiles(project_id);
CREATE INDEX idx_gmb_profiles_business_name ON gmb_profiles(business_name);
CREATE INDEX idx_gmb_profiles_rating ON gmb_profiles(rating DESC);

-- ---------------------------------------------------------------------------
-- 10. aso_rankings - ASO 排名表 (App Store Optimization)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aso_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    app_name VARCHAR(512) NOT NULL,
    app_id VARCHAR(255) NOT NULL,
    store VARCHAR(50) NOT NULL DEFAULT 'apple' CHECK (store IN ('apple', 'google_play')),
    keyword VARCHAR(1024) NOT NULL,
    position INTEGER,
    rating FLOAT DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    check_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aso_rankings_project_id ON aso_rankings(project_id);
CREATE INDEX idx_aso_rankings_app_id ON aso_rankings(app_id);
CREATE INDEX idx_aso_rankings_store ON aso_rankings(store);
CREATE INDEX idx_aso_rankings_keyword ON aso_rankings(keyword);
CREATE INDEX idx_aso_rankings_check_date ON aso_rankings(check_date DESC);

-- ---------------------------------------------------------------------------
-- 11. youtube_rankings - YouTube 排名表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS youtube_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    video_id VARCHAR(255) NOT NULL,
    title TEXT,
    channel VARCHAR(512),
    keyword VARCHAR(1024) NOT NULL,
    position INTEGER,
    views BIGINT DEFAULT 0,
    likes BIGINT DEFAULT 0,
    published_at TIMESTAMPTZ,
    check_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_youtube_rankings_project_id ON youtube_rankings(project_id);
CREATE INDEX idx_youtube_rankings_video_id ON youtube_rankings(video_id);
CREATE INDEX idx_youtube_rankings_keyword ON youtube_rankings(keyword);
CREATE INDEX idx_youtube_rankings_check_date ON youtube_rankings(check_date DESC);

-- ---------------------------------------------------------------------------
-- 12. competitor_domains - 竞品域名表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS competitor_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    domain VARCHAR(512) NOT NULL,
    name VARCHAR(512) NOT NULL,
    is_preset BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_competitor_domains_project_id ON competitor_domains(project_id);
CREATE INDEX idx_competitor_domains_domain ON competitor_domains(domain);
CREATE INDEX idx_competitor_domains_is_preset ON competitor_domains(is_preset);

-- ---------------------------------------------------------------------------
-- 13. competitor_traffic - 竞品流量表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS competitor_traffic (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    competitor_id UUID NOT NULL REFERENCES competitor_domains(id) ON DELETE CASCADE,
    total_visits INTEGER DEFAULT 0,
    organic_traffic INTEGER DEFAULT 0,
    paid_traffic INTEGER DEFAULT 0,
    top_keywords JSONB DEFAULT '[]'::jsonb,
    traffic_sources JSONB DEFAULT '{}'::jsonb,
    check_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_competitor_traffic_project_id ON competitor_traffic(project_id);
CREATE INDEX idx_competitor_traffic_competitor_id ON competitor_traffic(competitor_id);
CREATE INDEX idx_competitor_traffic_check_date ON competitor_traffic(check_date DESC);

-- ---------------------------------------------------------------------------
-- 14. tasks - 任务表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0,
    result JSONB DEFAULT '{}'::jsonb,
    error TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- ---------------------------------------------------------------------------
-- 15. users - 用户表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ---------------------------------------------------------------------------
-- 16. project_members - 项目成员表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- ---------------------------------------------------------------------------
-- 17. project_branding - 白标配置表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
    brand_name VARCHAR(255),
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#2563eb',
    custom_domain VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_branding_project_id ON project_branding(project_id);
CREATE INDEX idx_project_branding_custom_domain ON project_branding(custom_domain);

-- ---------------------------------------------------------------------------
-- 18. api_usage_logs - API 用量日志表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    cost DECIMAL(10, 6) DEFAULT 0,
    credits DECIMAL(10, 2) DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_usage_logs_service ON api_usage_logs(service);
CREATE INDEX idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX idx_api_usage_logs_created_at ON api_usage_logs(created_at DESC);

-- ---------------------------------------------------------------------------
-- 19. alert_rules - 告警规则表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(255) NOT NULL,
    threshold DECIMAL(10, 2) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    channels JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_rules_project_id ON alert_rules(project_id);
CREATE INDEX idx_alert_rules_type ON alert_rules(type);
CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled);

-- ---------------------------------------------------------------------------
-- 20. alert_history - 告警历史表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'warning' CHECK (severity IN ('critical', 'error', 'warning', 'info')),
    acknowledged BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_history_project_id ON alert_history(project_id);
CREATE INDEX idx_alert_history_rule_id ON alert_history(rule_id);
CREATE INDEX idx_alert_history_severity ON alert_history(severity);
CREATE INDEX idx_alert_history_created_at ON alert_history(created_at DESC);

-- ---------------------------------------------------------------------------
-- 21. uptime_logs - 宕机/可用性日志表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS uptime_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER DEFAULT 0,
    is_up BOOLEAN DEFAULT true,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_uptime_logs_project_id ON uptime_logs(project_id);
CREATE INDEX idx_uptime_logs_is_up ON uptime_logs(is_up);
CREATE INDEX idx_uptime_logs_checked_at ON uptime_logs(checked_at DESC);

-- ---------------------------------------------------------------------------
-- 22. schedules - 定时任务表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(255) NOT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    config JSONB DEFAULT '{}'::jsonb,
    enabled BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedules_project_id ON schedules(project_id);
CREATE INDEX idx_schedules_type ON schedules(type);
CREATE INDEX idx_schedules_enabled ON schedules(enabled);

-- ---------------------------------------------------------------------------
-- 23. notifications - 通知记录表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'dingtalk', 'feishu', 'slack', 'webhook')),
    recipient VARCHAR(512) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_project_id ON notifications(project_id);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ---------------------------------------------------------------------------
-- 24. roi_metrics - ROI 数据表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roi_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL,
    seo_spend DECIMAL(12, 2) DEFAULT 0,
    estimated_traffic_value DECIMAL(12, 2) DEFAULT 0,
    conversion_value DECIMAL(12, 2) DEFAULT 0,
    roi_percent DECIMAL(8, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, month)
);

CREATE INDEX idx_roi_metrics_project_id ON roi_metrics(project_id);
CREATE INDEX idx_roi_metrics_month ON roi_metrics(month DESC);

-- ---------------------------------------------------------------------------
-- 25. content_history - 内容变更追踪表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    field VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_history_project_id ON content_history(project_id);
CREATE INDEX idx_content_history_url ON content_history(url);
CREATE INDEX idx_content_history_field ON content_history(field);
CREATE INDEX idx_content_history_detected_at ON content_history(detected_at DESC);

-- =============================================================================
-- SEED DATA - 种子数据
-- =============================================================================

-- 预设竞品 (is_preset=true)
-- 注意：这些记录需要绑定到一个项目，此处使用一个占位 UUID 表示系统级预设数据
-- 实际使用时通过应用层插入到具体项目中

-- 由于 competitor_domains 需要有 project_id，预设竞品数据在实际部署时
-- 通过 API 种子脚本插入。这里仅提供 INSERT 语句作为参考。

-- 起重机行业默认关键词 (中文+英文，50个)
-- 同样需要 project_id，由应用层种子脚本负责插入。
-- 这里提供完整的 INSERT 参考语句，实际部署时 deploy.sh 会调用种子 API。

-- 创建一个系统级默认项目（用于承载预设数据）
INSERT INTO projects (id, name, domain, user_id, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'System Default',
    'crane-seo-platform.local',
    '00000000-0000-0000-0000-000000000000',
    '{"isSystem": true, "description": "System default project for preset data"}'
) ON CONFLICT (id) DO NOTHING;

-- 插入预设竞品
INSERT INTO competitor_domains (project_id, domain, name, is_preset)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'palfinger.com', 'Palfinger', true),
    ('00000000-0000-0000-0000-000000000001', 'fassi.com', 'Fassi', true),
    ('00000000-0000-0000-0000-000000000001', 'hiab.com', 'Hiab', true),
    ('00000000-0000-0000-0000-000000000001', 'xcmg.com', 'XCMG', true),
    ('00000000-0000-0000-0000-000000000001', 'sany.com', 'Sany', true),
    ('00000000-0000-0000-0000-000000000001', 'zoomlion.com', 'Zoomlion', true),
    ('00000000-0000-0000-0000-000000000001', 'tadano.com', 'Tadano', true),
    ('00000000-0000-0000-0000-000000000001', 'liebherr.com', 'Liebherr', true),
    ('00000000-0000-0000-0000-000000000001', 'manitowoc.com', 'Manitowoc', true),
    ('00000000-0000-0000-0000-000000000001', 'kato.com', 'Kato', true)
ON CONFLICT DO NOTHING;

-- 插入 50 个起重机行业默认关键词
INSERT INTO keywords (project_id, keyword, language, location_code, is_custom)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'truck mounted crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '随车起重机', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'loader crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'hydraulic crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'knuckle boom crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '折臂起重机', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'articulated crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'crane truck', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'mobile crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '汽车起重机', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'crawler crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '履带起重机', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'tower crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '塔式起重机', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'overhead crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '桥式起重机', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'gantry crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '门式起重机', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'marine crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '船用起重机', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'offshore crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'floating crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '浮式起重机', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'portal crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'jib crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '悬臂起重机', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'electric hoist', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '电动葫芦', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'wire rope hoist', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '钢丝绳电动葫芦', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'chain hoist', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '手动葫芦', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'lifting equipment', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '起重设备', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'crane parts', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '起重机配件', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'crane manufacturer', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '起重机制造商', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'crane for sale', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '起重机出售', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'used crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '二手起重机', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'small crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '小型起重机', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'mini crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '迷你起重机', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'heavy lift crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '重型起重机', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'construction crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '建筑起重机', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'industrial crane', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '工业起重机', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'crane service', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '起重机服务', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'crane rental', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '起重机租赁', 'zh', 0, false),
    ('00000000-0000-0000-0000-000000000001', 'crane maintenance', 'en', 0, false),
    ('00000000-0000-0000-0000-000000000001', '起重机维修', 'zh', 0, false)
ON CONFLICT DO NOTHING;

-- 验证种子数据
DO $$
BEGIN
    RAISE NOTICE 'Seed data initialized successfully.';
    RAISE NOTICE 'Projects: %', (SELECT COUNT(*) FROM projects);
    RAISE NOTICE 'Competitor domains: %', (SELECT COUNT(*) FROM competitor_domains WHERE is_preset = true);
    RAISE NOTICE 'Default keywords (is_custom=false): %', (SELECT COUNT(*) FROM keywords WHERE is_custom = false);
END $$;