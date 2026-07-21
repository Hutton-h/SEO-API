-- =============================================================================
-- Crane SEO Platform — 高级索引、全文搜索、向量索引
-- 文件: db/migrations/004_indexes.sql
-- 前置依赖: 001_core.sql, 002_analytics.sql, 003_operations.sql 已执行
-- =============================================================================

-- 启用扩展
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- 全文搜索索引
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_keywords_fts
    ON keywords USING gin (to_tsvector('english', keyword));

-- =============================================================================
-- 向量索引 (pgvector ivfflat)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_keywords_embedding
    ON keywords USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_crawl_pages_embedding
    ON crawl_pages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_keyword_clusters_centroid
    ON keyword_clusters USING ivfflat (centroid_vector vector_cosine_ops) WITH (lists = 100);

-- =============================================================================
-- 复合索引（高频查询优化）
-- =============================================================================
-- rankings: 按项目+关键词+时间查询排名历史
CREATE INDEX IF NOT EXISTS idx_rankings_composite
    ON rankings (project_id, keyword_id, tracked_at DESC);

-- backlinks: 按项目+状态+最后发现时间查询外链
CREATE INDEX IF NOT EXISTS idx_backlinks_composite
    ON backlinks (project_id, status, last_seen DESC);

-- crawl_issues: 按项目+分类+严重程度查询问题
CREATE INDEX IF NOT EXISTS idx_crawl_issues_composite
    ON crawl_issues (task_id, category, severity);

-- =============================================================================
-- 部分索引（仅索引活跃数据，减少索引大小）
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_keywords_active
    ON keywords (project_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_ils_pending
    ON internal_link_suggestions (project_id) WHERE status = 'pending';

-- =============================================================================
-- pg_trgm 模糊搜索索引（用于页面标题和 URL 搜索）
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_crawl_pages_title_trgm
    ON crawl_pages USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_crawl_pages_url_trgm
    ON crawl_pages USING gin (url gin_trgm_ops);