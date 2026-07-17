#!/usr/bin/env bash
# =============================================================================
#  Crane SEO Platform — 统一智能部署脚本
#  =============================================================================
#  自动检测环境 → 交互式配置 → 一键部署
#  · 检测到 kejilion 环境 → 复用其 Nginx + Redis
#  · 未检测到 kejilion → 使用独立 Docker Compose 全套环境
#  =============================================================================
set -euo pipefail

# ── 颜色 ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; WHITE='\033[1;37m'; NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[ OK ]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERR ]${NC} $*"; }
log_step()  { echo -e "\n${CYAN}━━━ $* ━━━${NC}"; }
banner()    { echo -e "${WHITE}$*${NC}"; }

# ── 路径 ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE="$SCRIPT_DIR/.env"
ENV_EXAMPLE="$SCRIPT_DIR/.env.example"
INIT_SQL="$SCRIPT_DIR/init.sql"
FRONTEND_DIR="$SCRIPT_DIR/admin-ui"
FRONTEND_DIST="$FRONTEND_DIR/dist"
NGINX_CONF_SRC="$SCRIPT_DIR/nginx/conf.d/seo-platform.conf"
NGINX_STANDALONE_CONF="$SCRIPT_DIR/nginx/conf.d/default.conf"

# kejilion 路径
KEJILION_CONF_DIR="/home/web/conf.d"
KEJILION_HTML_DIR="/home/web/html"
KEJILION_CERTS_DIR="/home/web/certs"
KEJILION_NGINX_CONF="/home/web/nginx.conf"
KEJILION_DOCKER_COMPOSE="/home/web/docker-compose.yml"

# ── 全局变量 ─────────────────────────────────────────────────────────────────
DETECTED_KEJILION=false
DOMAIN=""
SSL_MODE="http"
COMPOSE_FILE=""
NGINX_MODE="standalone"           # standalone | kejilion

# ═══════════════════════════════════════════════════════════════════════════════
#  1. 环境检测
# ═══════════════════════════════════════════════════════════════════════════════
detect_environment() {
    log_step "环境检测"

    # 检查 Docker
    if ! command -v docker &>/dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        log_info "Ubuntu/Debian: curl -fsSL https://get.docker.com | bash"
        exit 1
    fi
    log_ok "Docker $(docker --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+')"

    # 检查 Docker Compose
    if ! docker compose version &>/dev/null 2>&1; then
        log_error "Docker Compose v2 不可用"
        exit 1
    fi
    log_ok "Docker Compose v2"

    # 检测 kejilion 环境
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'nginx' \
       && [ -d "$KEJILION_CONF_DIR" ] \
       && [ -f "$KEJILION_NGINX_CONF" ]; then
        DETECTED_KEJILION=true
        COMPOSE_FILE="$SCRIPT_DIR/docker-compose.kejilion.yml"
        NGINX_MODE="kejilion"
        log_ok "检测到 kejilion 环境 → 将复用 Nginx + Redis"

        # 检查 Redis
        if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'redis'; then
            log_ok "Redis 容器运行中 → 复用 kejilion Redis"
        else
            log_warn "Redis 容器未运行，队列功能可能受限"
        fi
    else
        DETECTED_KEJILION=false
        COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
        NGINX_MODE="standalone"
        log_info "未检测到 kejilion → 使用独立 Docker Compose 全套环境"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
#  2. 交互式配置（API 密钥等）
# ═══════════════════════════════════════════════════════════════════════════════
interactive_config() {
    log_step "交互式配置"

    echo ""
    banner " 请输入部署信息（直接回车使用默认值）："
    echo ""

    # ── 域名 ──
    read -r -p "  域名 (如 seo.example.com): " DOMAIN
    DOMAIN="${DOMAIN:-localhost}"
    if [ "$DOMAIN" = "localhost" ]; then
        SSL_MODE="http"
    else
        read -r -p "  是否启用 HTTPS? [y/N]: " ssl_choice
        if [[ "$ssl_choice" =~ ^[Yy]$ ]]; then
            SSL_MODE="https"
        else
            SSL_MODE="http"
        fi
    fi

    echo ""

    # ── DataForSEO（必填）──
    banner "  【DataForSEO API】（必填 — 用于关键词/排名/SERP）"
    read -r -p "    邮箱: " df_email
    read -r -p "    API Key: " df_key
    DATAFORSEO_EMAIL="${df_email:-}"
    DATAFORSEO_API_KEY="${df_key:-}"

    echo ""

    # ── OpenAI（可选）──
    banner "  【OpenAI API】（可选 — 用于 AI 内容优化建议）"
    read -r -p "    API Key (留空跳过): " oai_key
    OPENAI_API_KEY="${oai_key:-}"

    echo ""

    # ── Majestic（可选）──
    banner "  【Majestic SEO API】（可选 — 用于外链分析）"
    read -r -p "    API Key (留空跳过): " mj_key
    MAJESTIC_API_KEY="${mj_key:-}"

    echo ""

    # ── 数据库密码 ──
    read -r -p "  PostgreSQL 密码 (默认 crane_password): " pg_pass
    POSTGRES_PASSWORD="${pg_pass:-crane_password}"

    # ── JWT 密钥 ──
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "change_me_in_production_$(date +%s)")

    read -r -p "  管理员登录密码 (默认 admin123): " admin_pass
    ADMIN_PASSWORD="${admin_pass:-admin123}"

    echo ""
    log_ok "配置采集完成"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  3. 生成 .env 文件
# ═══════════════════════════════════════════════════════════════════════════════
generate_env_file() {
    log_step "生成 .env 配置文件"

    local redis_url=""
    local cors_origin=""
    local proto="http"

    if [ "$SSL_MODE" = "https" ]; then
        proto="https"
    fi
    cors_origin="${proto}://${DOMAIN}"

    if [ "$DETECTED_KEJILION" = true ]; then
        local redis_pw=""
        # 尝试从 kejilion 的 docker-compose 中读取 Redis 密码
        if [ -f "$KEJILION_DOCKER_COMPOSE" ]; then
            redis_pw=$(grep -oP 'REDIS_PASSWORD:\s*\K.*' "$KEJILION_DOCKER_COMPOSE" 2>/dev/null | tr -d '[:space:]' || echo "")
        fi
        redis_url="redis://${redis_pw:+${redis_pw}@}host.docker.internal:6379/1"
    else
        redis_url="redis://redis:6379/0"
    fi

    cat > "$ENV_FILE" <<ENVEOF
# =============================================================================
# Crane SEO Platform — 自动生成的 .env 文件
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')
# 部署模式: $( [ "$DETECTED_KEJILION" = true ] && echo 'kejilion' || echo 'standalone' )
# =============================================================================

# --- DataForSEO API (必填) ---
DATAFORSEO_EMAIL=${DATAFORSEO_EMAIL}
DATAFORSEO_API_KEY=${DATAFORSEO_API_KEY}

# --- Majestic SEO API (可选) ---
MAJESTIC_API_KEY=${MAJESTIC_API_KEY}

# --- OpenAI API (可选) ---
OPENAI_API_KEY=${OPENAI_API_KEY}
OPENAI_MODEL=gpt-4o-mini

# --- Database ---
DATABASE_URL=postgresql://crane_user:${POSTGRES_PASSWORD}@postgres:5432/crane_seo
POSTGRES_USER=crane_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=crane_seo

# --- Redis ---
REDIS_URL=${redis_url}
REDIS_PASSWORD=
KEJILION_REDIS_PASSWORD=

# --- JWT Authentication ---
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# --- API Server ---
API_PORT=8080
API_HOST=0.0.0.0
NODE_ENV=$( [ "$DETECTED_KEJILION" = true ] && echo 'production' || echo 'development' )

# --- CORS ---
CORS_ORIGIN=${cors_origin}

# --- Crawler ---
CRAWLER_CONCURRENCY=5
CRAWLER_MAX_REQUESTS_PER_MINUTE=60
CRAWLER_USER_AGENT=Mozilla/5.0 (compatible; CraneSEOBot/1.0)
CRAWLER_RESPECT_ROBOTS_TXT=true

# --- Admin UI ---
ADMIN_UI_PORT=3000

# --- Nginx ---
NGINX_PORT=80
NGINX_SSL_PORT=443

# --- Logging ---
LOG_LEVEL=info
LOG_FORMAT=$( [ "$DETECTED_KEJILION" = true ] && echo 'json' || echo 'pretty' )

# --- 第三方 API (可选) ---
GMB_CLIENT_ID=
GMB_CLIENT_SECRET=
GMB_REFRESH_TOKEN=
YOUTUBE_API_KEY=
APPLE_STORE_CONNECT_KEY_ID=
APPLE_STORE_CONNECT_ISSUER_ID=
APPLE_STORE_CONNECT_PRIVATE_KEY_PATH=

# --- Rate Limiting ---
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# --- 部署域名 ---
DOMAIN=${DOMAIN}
SSL_MODE=${SSL_MODE}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ENVEOF

    log_ok ".env 已生成"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  4. 构建前端
# ═══════════════════════════════════════════════════════════════════════════════
build_frontend() {
    log_step "构建前端"

    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "admin-ui 目录不存在"
        exit 1
    fi

    cd "$FRONTEND_DIR"

    if [ ! -d "node_modules" ]; then
        log_info "安装前端依赖..."
        npm install --legacy-peer-deps 2>&1 | tail -3
    fi

    log_info "编译生产版本..."
    npm run build 2>&1 | tail -5

    if [ ! -f "$FRONTEND_DIST/index.html" ]; then
        log_error "前端构建失败"
        exit 1
    fi

    log_ok "前端构建完成 ($(du -sh "$FRONTEND_DIST" | cut -f1))"
    cd "$SCRIPT_DIR"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  5. 部署 Nginx 配置
# ═══════════════════════════════════════════════════════════════════════════════
deploy_nginx_kejilion() {
    log_step "部署 Nginx 配置 → kejilion 模式"

    local target_conf="$KEJILION_CONF_DIR/seo-platform.conf"
    local target_html="$KEJILION_HTML_DIR/seo-platform"

    # 复制前端静态文件
    rm -rf "$target_html"
    mkdir -p "$target_html"
    cp -r "$FRONTEND_DIST/"* "$target_html/"
    chmod -R 755 "$target_html"
    log_ok "前端文件 → $target_html"

    # 生成 Nginx 配置
    if [ ! -f "$NGINX_CONF_SRC" ]; then
        log_error "Nginx 配置模板不存在: $NGINX_CONF_SRC"
        exit 1
    fi
    cp "$NGINX_CONF_SRC" "$target_conf"
    sed -i "s|{YOUR_DOMAIN}|${DOMAIN}|g" "$target_conf"

    if [ "$SSL_MODE" = "http" ]; then
        # 注释掉 HTTPS 强制跳转
        sed -i 's|return 301 https://$host$request_uri;|# return 301 https://$host$request_uri;|' "$target_conf"
        log_info "HTTP 模式（无 SSL 跳转）"
    else
        # 检查证书
        local cert_file="$KEJILION_CERTS_DIR/${DOMAIN}_cert.pem"
        local key_file="$KEJILION_CERTS_DIR/${DOMAIN}_key.pem"
        if [ ! -f "$cert_file" ] || [ ! -f "$key_file" ]; then
            log_warn "SSL 证书不存在: ${DOMAIN}_cert.pem"
            log_info "请先通过 kejilion.sh 申请 SSL 证书，或手动放置证书到 $KEJILION_CERTS_DIR/"
            log_info "本次将以 HTTP 模式启动"
            sed -i 's|return 301 https://$host$request_uri;|# return 301 https://$host$request_uri;|' "$target_conf"
        else
            log_ok "SSL 证书已就绪"
        fi
    fi

    # 验证 & 重载
    if docker exec nginx nginx -t 2>&1 | tail -3; then
        docker exec nginx nginx -s reload 2>/dev/null || true
        log_ok "Nginx 配置已生效"
    else
        log_error "Nginx 配置验证失败"
        exit 1
    fi
}

deploy_nginx_standalone() {
    log_step "部署 Nginx 配置 → 独立模式"

    if [ -f "$NGINX_STANDALONE_CONF" ]; then
        sed -i "s|__DOMAIN__|${DOMAIN}|g" "$NGINX_STANDALONE_CONF"
        log_ok "独立 Nginx 配置已更新（域名: ${DOMAIN}）"
    else
        log_warn "default.conf 不存在，将在 docker-compose 启动时使用默认配置"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
#  6. Docker 服务管理
# ═══════════════════════════════════════════════════════════════════════════════
build_and_start() {
    log_step "构建 & 启动 Docker 服务"

    log_info "构建镜像..."
    docker compose -f "$COMPOSE_FILE" build --parallel 2>&1 | tail -5

    log_info "启动容器..."
    docker compose -f "$COMPOSE_FILE" up -d

    # 等待 PostgreSQL
    log_info "等待 PostgreSQL 就绪..."
    local pg_container="crane-seo-postgres"
    local max=30; local i=1
    while [ $i -le $max ]; do
        if docker exec "$pg_container" pg_isready -U crane_user -d crane_seo &>/dev/null; then
            log_ok "PostgreSQL 就绪"
            break
        fi
        sleep 2; i=$((i+1))
    done
    [ $i -gt $max ] && { log_error "PostgreSQL 启动超时"; exit 1; }

    log_ok "所有服务已启动"
}

run_init_sql() {
    log_step "初始化数据库（14 张表 + 种子数据）"

    if [ ! -f "$INIT_SQL" ]; then
        log_error "init.sql 不存在"
        exit 1
    fi

    docker exec -i crane-seo-postgres psql -U crane_user -d crane_seo < "$INIT_SQL" 2>&1 | tail -5
    log_ok "数据库初始化完成（50 个默认关键词 + 10 个预设竞品）"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  7. 状态 & 辅助命令
# ═══════════════════════════════════════════════════════════════════════════════
show_status() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║           Crane SEO Platform — 部署状态                      ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  部署模式:   ${GREEN}$( [ "$DETECTED_KEJILION" = true ] && echo 'kejilion 环境' || echo '独立环境' )${NC}"
    echo -e "  域名:       ${WHITE}${DOMAIN:-未设置}${NC}"
    echo -e "  SSL:        ${WHITE}${SSL_MODE:-http}${NC}"
    echo ""

    docker compose -f "$COMPOSE_FILE" ps 2>/dev/null || echo "  服务未运行"

    echo ""
    echo -e "  API 健康检查:"
    curl -s http://localhost:8080/health 2>/dev/null | python3 -m json.tool 2>/dev/null \
        || echo "    API 不可达"

    echo ""
    echo -e "  ${GREEN}访问地址:${NC}"
    if [ "$NGINX_MODE" = "kejilion" ]; then
        echo -e "    前端:      ${CYAN}${SSL_MODE}://${DOMAIN}${NC}"
        echo -e "    API 文档:  ${CYAN}${SSL_MODE}://${DOMAIN}/api-docs${NC}"
    else
        echo -e "    前端:      ${CYAN}http://localhost${NC}"
        echo -e "    API 文档:  ${CYAN}http://localhost:8080/api-docs${NC}"
    fi
    echo -e "    登录:      ${YELLOW}admin / ${ADMIN_PASSWORD:-admin123}${NC}"
    echo ""
}

stop_services() {
    log_step "停止服务"
    docker compose -f "$COMPOSE_FILE" down
    log_ok "已停止"
}

show_logs() {
    docker compose -f "$COMPOSE_FILE" logs -f --tail=100
}

# ═══════════════════════════════════════════════════════════════════════════════
#  8. 主流程
# ═══════════════════════════════════════════════════════════════════════════════
main_deploy() {
    clear 2>/dev/null || true

    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                            ║${NC}"
    echo -e "${CYAN}║       🏗️   Crane SEO Platform — 统一部署                    ║${NC}"
    echo -e "${CYAN}║           起重机行业 SEO 全栈管理平台                         ║${NC}"
    echo -e "${CYAN}║                                                            ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # 1
    detect_environment

    # 2
    interactive_config

    # 3
    generate_env_file

    # 4
    build_frontend

    # 5 — nginx
    if [ "$DETECTED_KEJILION" = true ]; then
        deploy_nginx_kejilion
    else
        deploy_nginx_standalone
    fi

    # 6
    build_and_start

    # 7
    run_init_sql

    # 8
    show_status

    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  部署完成！${NC}"
    echo ""
    if [ "$DETECTED_KEJILION" = true ]; then
        echo -e "  访问: ${CYAN}${SSL_MODE}://${DOMAIN}${NC}"
    else
        echo -e "  访问: ${CYAN}http://localhost${NC}"
    fi
    echo -e "  登录: ${YELLOW}admin / ${ADMIN_PASSWORD:-admin123}${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
#  入口
# ═══════════════════════════════════════════════════════════════════════════════
CMD="${1:-deploy}"

case "$CMD" in
    deploy)
        main_deploy
        ;;
    update)
        detect_environment
        # 重新加载 .env
        if [ -f "$ENV_FILE" ]; then
            set -a; source "$ENV_FILE" 2>/dev/null || true; set +a
            DOMAIN="${DOMAIN:-localhost}"
            SSL_MODE="${SSL_MODE:-http}"
        fi
        build_frontend
        if [ "$DETECTED_KEJILION" = true ]; then
            local target_html="$KEJILION_HTML_DIR/seo-platform"
            rm -rf "$target_html"
            mkdir -p "$target_html"
            cp -r "$FRONTEND_DIST/"* "$target_html/"
            docker exec nginx nginx -s reload 2>/dev/null || true
        fi
        docker compose -f "$COMPOSE_FILE" build --parallel 2>&1 | tail -3
        docker compose -f "$COMPOSE_FILE" up -d --force-recreate
        run_init_sql
        log_ok "更新完成"
        ;;
    status)
        if [ -f "$ENV_FILE" ]; then
            set -a; source "$ENV_FILE" 2>/dev/null || true; set +a
            DOMAIN="${DOMAIN:-localhost}"
            SSL_MODE="${SSL_MODE:-http}"
            ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
        fi
        detect_environment
        show_status
        ;;
    stop)
        detect_environment
        stop_services
        ;;
    logs)
        detect_environment
        show_logs
        ;;
    restart)
        detect_environment
        docker compose -f "$COMPOSE_FILE" restart
        if [ "$DETECTED_KEJILION" = true ]; then
            docker exec nginx nginx -s reload 2>/dev/null || true
        fi
        log_ok "已重启"
        ;;
    help|--help|-h)
        echo ""
        echo "Crane SEO Platform — 部署脚本"
        echo ""
        echo "用法: bash deploy.sh [命令]"
        echo ""
        echo "命令:"
        echo "  deploy     首次部署（交互式配置 + 构建 + 启动）"
        echo "  update     更新代码并重启"
        echo "  status     查看服务状态"
        echo "  stop       停止服务"
        echo "  logs       查看日志"
        echo "  restart    重启服务"
        echo ""
        echo "示例: bash deploy.sh          # 首次部署"
        echo "      bash deploy.sh update   # 更新代码"
        ;;
    *)
        echo "未知命令: $CMD"
        echo "用法: bash deploy.sh [deploy|update|status|stop|logs|restart]"
        exit 1
        ;;
esac