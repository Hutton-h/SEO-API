# Crane SEO Platform

起重机行业 SEO 全栈管理平台，专为起重机/随车吊/吊车企业打造的一站式 SEO 优化工具。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Node.js 20 + Express + TypeScript (ESM) |
| 数据库 | PostgreSQL 15 |
| 缓存/队列 | Redis 7 + BullMQ |
| 爬虫 | Crawlee + Playwright + Lighthouse CI |
| 外部 API | DataForSEO / Majestic / OpenAI |
| 前端 | React 18 + Vite + Ant Design 5 + ECharts |
| 部署 | Docker Compose + Nginx（兼容 kejilion 环境） |

## 功能模块

- **仪表盘** — SEO 健康分、排名趋势、爬虫概览
- **项目管理** — 多项目 CRUD，域名管理
- **爬虫审计** — 自动爬取 + 17 条 SEO 规则检测 + Lighthouse 审计
- **关键词管理** — 50 个起重机行业预设关键词 + DataForSEO 搜索量
- **排名追踪** — 历史排名、变化趋势、定时刷新
- **外链分析** — 外链统计、DA/PA、来源分析
- **SEM 分析** — 竞品广告、关键词指标、机会分析
- **本地 SEO** — GMB 档案、本地排名对比
- **ASO / YouTube** — 应用商店排名 + YouTube 视频排名
- **AI 优化** — OpenAI 驱动的内容优化建议
- **竞品分析** — 预设 Palfinger/Fassi/Hiab 等 10 个竞品
- **综合报告** — 多模块汇总 + PDF 导出

## 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/your-org/crane-seo-platform.git
cd crane-seo-platform

# 2. 一键部署（自动检测环境 + 交互式配置）
bash deploy.sh

# 3. 访问
# 前端: http://localhost (或你的域名)
# API 文档: http://localhost:8080/api-docs
# 默认登录: admin / admin123
```

## 部署脚本说明

`deploy.sh` 会**自动检测运行环境**：

- **检测到 kejilion 环境**（nginx 容器 + `/home/web/`）→ 复用 kejilion 的 Nginx + Redis
- **未检测到** → 使用独立 Docker Compose 全套环境

脚本支持交互式配置 API 密钥（DataForSEO、OpenAI、Majestic），无需手动编辑 `.env`。

```bash
bash deploy.sh          # 首次部署（交互式）
bash deploy.sh update   # 更新代码
bash deploy.sh status   # 查看状态
bash deploy.sh stop     # 停止服务
bash deploy.sh logs     # 查看日志
```

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATAFORSEO_EMAIL` | 是 | DataForSEO 账户邮箱 |
| `DATAFORSEO_API_KEY` | 是 | DataForSEO API 密钥 |
| `OPENAI_API_KEY` | 否 | OpenAI API 密钥（AI 优化） |
| `MAJESTIC_API_KEY` | 否 | Majestic API 密钥（外链分析） |
| `POSTGRES_PASSWORD` | 否 | 数据库密码（默认 crane_password） |

## 项目结构

```
crane-seo-platform/
├── api/                    # Express REST API (13 个业务模块)
│   ├── src/
│   │   ├── config.ts
│   │   ├── app.ts          # Express + Swagger
│   │   ├── server.ts
│   │   ├── shared/         # database, redis, queue, middleware
│   │   ├── services/       # dataforseo, majestic, openai
│   │   ├── modules/        # project, crawl, keywords, rankings...
│   │   └── jobs/           # BullMQ workers + processors
│   ├── Dockerfile
│   └── package.json
├── crawler/                # 爬虫服务 (Crawlee + Playwright + Lighthouse)
│   ├── src/
│   │   ├── index.ts        # 队列监听入口
│   │   ├── crawler.ts      # PlaywrightCrawler
│   │   ├── rules.ts        # 17 条 SEO 检测规则
│   │   ├── lighthouse.ts   # Lighthouse CI
│   │   └── db.ts
│   ├── Dockerfile
│   └── package.json
├── admin-ui/               # React 前端 (14 个页面)
│   ├── src/
│   │   ├── layouts/
│   │   ├── pages/          # Dashboard, Projects, CrawlAudit, Keywords...
│   │   ├── services/       # API 封装
│   │   ├── components/     # StatCard, PageHeader, LoadingSpinner
│   │   └── store/          # Zustand
│   ├── package.json
│   └── vite.config.ts
├── nginx/conf.d/           # Nginx 配置
│   ├── default.conf        # 独立部署
│   └── seo-platform.conf   # kejilion 环境
├── docker-compose.yml      # 独立部署
├── docker-compose.kejilion.yml  # kejilion 环境
├── docker-compose.prod.yml      # 生产环境覆盖
├── init.sql                # 14 张表 + 种子数据
├── deploy.sh               # 统一智能部署脚本
├── .env.example
└── .gitignore
```

## 数据库

14 张表：projects, crawl_pages, crawl_issues, keywords, rankings, backlinks, sem_ads, sem_keyword_metrics, gmb_profiles, aso_rankings, youtube_rankings, competitor_domains, competitor_traffic, tasks

种子数据：50 个中英文起重机关键词 + 10 个预设竞品（Palfinger, Fassi, Hiab, XCMG, Sany 等）

## License

MIT