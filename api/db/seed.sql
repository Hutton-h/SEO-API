-- =============================================================================
-- Crane SEO Platform — 种子数据
-- 文件: db/seed.sql
-- 用途: 初始化管理员用户、示例项目、预设关键词和默认告警规则
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. 管理员用户
-- 密码: admin123 (bcrypt hash, 10 rounds)
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO users (id, email, password_hash, name, role, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@craneseo.com',
    '$2b$10$rQZ4Y5oXqK8V7L9mN2pO3eF6gH1iJ4kL5mN6oP7qR8sT9uV0wX1y',
    'Admin',
    'admin',
    true
) ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. 示例项目
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO projects (id, user_id, name, domain, industry, target_country, target_language, status)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Crane Manufacturer Demo',
    'www.example-crane.com',
    'crane_manufacturing',
    'us',
    'en',
    'active'
) ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. 预设关键词（起重机行业）
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO keywords (project_id, keyword, source, status)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'overhead crane manufacturer', 'manual', 'active'),
    ('b0000000-0000-0000-0000-000000000001', 'gantry crane price', 'manual', 'active'),
    ('b0000000-0000-0000-0000-000000000001', 'bridge crane supplier', 'manual', 'active'),
    ('b0000000-0000-0000-0000-000000000001', 'jib crane for sale', 'manual', 'active'),
    ('b0000000-0000-0000-0000-000000000001', 'electric hoist crane', 'manual', 'active'),
    ('b0000000-0000-0000-0000-000000000001', 'crane maintenance service', 'manual', 'active'),
    ('b0000000-0000-0000-0000-000000000001', 'industrial crane solutions', 'manual', 'active'),
    ('b0000000-0000-0000-0000-000000000001', 'mobile crane rental', 'manual', 'active'),
    ('b0000000-0000-0000-0000-000000000001', 'tower crane parts', 'manual', 'active'),
    ('b0000000-0000-0000-0000-000000000001', 'crane safety inspection', 'manual', 'active')
ON CONFLICT (project_id, keyword) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. 默认告警规则
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO alert_rules (project_id, name, conditions, logic, severity, cooldown_minutes)
VALUES
    (
        'b0000000-0000-0000-0000-000000000001',
        '排名下降超过 3 位',
        '{"metric": "rank_change", "operator": "gt", "threshold": 3}',
        'AND',
        'high',
        60
    ),
    (
        'b0000000-0000-0000-0000-000000000001',
        '流量下降超过 20%',
        '{"metric": "traffic_change", "operator": "lt", "threshold": -20}',
        'AND',
        'critical',
        120
    ),
    (
        'b0000000-0000-0000-0000-000000000001',
        '外链丢失超过 5 条',
        '{"metric": "backlink_lost", "operator": "gt", "threshold": 5}',
        'AND',
        'high',
        60
    )
ON CONFLICT DO NOTHING;