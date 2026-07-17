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
# NGINX_CONF_SRC removed — config generated dynamically in kejilion mode
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
        # 自动检测已有证书
        local auto_cert="/home/web/certs/${DOMAIN}_cert.pem"
        local auto_key="/home/web/certs/${DOMAIN}_key.pem"
        if [ -f "$auto_cert" ] && [ -f "$auto_key" ]; then
            echo -e "  ${GREEN}✓ 检测到已有 SSL 证书: ${DOMAIN}_cert.pem${NC}"
            read -r -p "  是否启用 HTTPS? [Y/n]: " ssl_choice
            if [[ "$ssl_choice" =~ ^[Nn]$ ]]; then
                SSL_MODE="http"
            else
                SSL_MODE="https"
            fi
        else
            read -r -p "  是否启用 HTTPS? [y/N]: " ssl_choice
            if [[ "$ssl_choice" =~ ^[Yy]$ ]]; then
                SSL_MODE="https"
            else
                SSL_MODE="http"
            fi
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

    # ── AI 模型（可选）──
    banner "  【AI 模型 API】（可选 — 支持 OpenAI 兼容接口，用于 AI 内容优化建议）"
    echo -e "  ${YELLOW}  支持 OpenAI / DeepSeek / Moonshot / 智谱 / 通义千问 / Ollama 等${NC}"
    read -r -p "    API Key (留空跳过): " oai_key
    read -r -p "    API 地址 (默认 https://api.openai.com/v1): " oai_base
    read -r -p "    模型名称 (默认 gpt-4o-mini): " oai_model
    OPENAI_API_KEY="${oai_key:-}"
    OPENAI_BASE_URL="${oai_base:-https://api.openai.com/v1}"
    OPENAI_MODEL="${oai_model:-gpt-4o-mini}"

    echo ""

    # ── Google Cloud（可选）──
    banner "  【Google Cloud APIs】（可选 — 全部免费额度内）"
    read -r -p "    PageSpeed Insights API Key (留空跳过): " psi_key
    PAGESPEED_API_KEY="${psi_key:-}"
    read -r -p "    GSC Client ID (留空跳过): " gsc_cid
    GSC_CLIENT_ID="${gsc_cid:-}"
    read -r -p "    GSC Client Secret (留空跳过): " gsc_cs
    GSC_CLIENT_SECRET="${gsc_cs:-}"
    read -r -p "    GSC Refresh Token (留空跳过): " gsc_rt
    GSC_REFRESH_TOKEN="${gsc_rt:-}"
    read -r -p "    GA4 Property ID (留空跳过): " ga4_pid
    GA4_PROPERTY_ID="${ga4_pid:-}"

    echo ""

    # ── Bing（可选）──
    banner "  【Bing Webmaster API】（可选 — 免费，外链交叉验证）"
    read -r -p "    API Key (留空跳过): " bing_key
    BING_API_KEY="${bing_key:-}"

    echo ""

    # ── WhoisJSON（可选）──
    banner "  【WhoisJSON API】（可选 — 免费 1000次/月，域名健康检测）"
    read -r -p "    API Key (留空跳过): " whois_key
    WHOIS_API_KEY="${whois_key:-}"

    echo ""

    # ── ValueSERP（可选）──
    banner "  【ValueSERP API】（可选 — 按量付费，SERP 备用）"
    read -r -p "    API Key (留空跳过): " vserp_key
    VALUESERP_API_KEY="${vserp_key:-}"

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

# --- AI 模型 (OpenAI 兼容 API，可选) ---
# 支持 OpenAI / DeepSeek / Moonshot / 智谱 / 通义千问 / Ollama 等
OPENAI_API_KEY=${OPENAI_API_KEY}
OPENAI_BASE_URL=${OPENAI_BASE_URL}
OPENAI_MODEL=${OPENAI_MODEL}

# --- Google Cloud APIs (可选，免费额度内) ---
GCP_PROJECT_ID=${GCP_PROJECT_ID:-}
GCP_KEY_FILE=${GCP_KEY_FILE:-}
GSC_CLIENT_ID=${GSC_CLIENT_ID:-}
GSC_CLIENT_SECRET=${GSC_CLIENT_SECRET:-}
GSC_REFRESH_TOKEN=${GSC_REFRESH_TOKEN:-}
PAGESPEED_API_KEY=${PAGESPEED_API_KEY:-}
GA4_PROPERTY_ID=${GA4_PROPERTY_ID:-}
GA4_CLIENT_EMAIL=${GA4_CLIENT_EMAIL:-}
GA4_PRIVATE_KEY=${GA4_PRIVATE_KEY:-}
INDEXING_SERVICE_ACCOUNT_KEY=${INDEXING_SERVICE_ACCOUNT_KEY:-}

# --- Bing Webmaster Tools API (可选，免费) ---
BING_API_KEY=${BING_API_KEY:-}
BING_SITE_URL=${BING_SITE_URL:-}

# --- WhoisJSON API (可选) ---
WHOIS_API_KEY=${WHOIS_API_KEY:-}

# --- ValueSERP API (可选，按量付费) ---
VALUESERP_API_KEY=${VALUESERP_API_KEY:-}

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
API_PORT=48080
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

# 申请 SSL 证书（完全对齐 kejilion.sh install_ssltls 逻辑）
auto_ssl_kejilion() {
    local domain="$1"
    log_step "申请 SSL 证书 → ${domain}"

    # 1. 暂停 nginx（certbot 需要 80 端口）
    docker stop nginx > /dev/null 2>&1 || true

    # 2. 如果 /etc/letsencrypt/live 下已有证书，跳过申请直接复制
    if [ -f "/etc/letsencrypt/live/${domain}/fullchain.pem" ]; then
        log_info "Let's Encrypt 证书已存在，跳过申请"
    else
        log_info "运行 certbot standalone 申请证书..."
        docker run --rm \
            -p 80:80 \
            -v /etc/letsencrypt/:/etc/letsencrypt \
            certbot/certbot certonly \
            --standalone \
            -d "$domain" \
            --email your@email.com \
            --agree-tos \
            --no-eff-email \
            --force-renewal \
            --key-type ecdsa 2>&1 | tail -5
    fi

    # 3. 恢复 nginx
    docker start nginx > /dev/null 2>&1 || true

    # 4. 复制证书到 kejilion 标准路径（和 kejilion 完全一致）
    if [ -f "/etc/letsencrypt/live/${domain}/fullchain.pem" ]; then
        mkdir -p /home/web/certs
        cp "/etc/letsencrypt/live/${domain}/fullchain.pem" "/home/web/certs/${domain}_cert.pem"
        cp "/etc/letsencrypt/live/${domain}/privkey.pem" "/home/web/certs/${domain}_key.pem"
        log_ok "SSL 证书已就绪: ${domain}"
        return 0
    else
        log_error "SSL 证书申请失败"
        log_info "请确认域名 ${domain} 已解析到本机 IP，且 80 端口可公网访问"
        return 1
    fi
}


# 设置 Let's Encrypt 自动续签
setup_auto_renewal() {
    local domain="$1"
    log_info "设置证书自动续签（每天 00:00 检查）..."

    # 下载 kejilion 的 auto_cert_renewal.sh 续签脚本
    cd ~
    local renew_script="$HOME/auto_cert_renewal.sh"
    if [ ! -f "$renew_script" ]; then
        curl -sS -o "$renew_script" \
            https://raw.githubusercontent.com/kejilion/sh/main/auto_cert_renewal.sh 2>/dev/null || true
        chmod +x "$renew_script" 2>/dev/null || true
    fi

    # 添加 cron 任务（去重）
    local cron_job="0 0 * * * ~/auto_cert_renewal.sh"
    if ! crontab -l 2>/dev/null | grep -qF "$cron_job"; then
        (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
        log_ok "自动续签已配置"
    else
        log_info "自动续签任务已存在，跳过"
    fi
}

# 查找证书并推断域名（kejilion 路径 + certbot 原路径双兜底）
find_certs_and_domain() {
    local domain="$1"
    # 已有有效域名 → 只检查该域名的证书，绝不扫描其他域名
    if [ -n "$domain" ] && [ "$domain" != "localhost" ]; then
        ensure_cert_exists "$domain" && echo "$domain" && return 0
        return 1
    fi
    # 域名空或 localhost → 不扫描，返回空让调用方处理
    return 1
}

# 检查证书是否存在（kejilion 路径 + Let's Encrypt 原路径，不做有效性验证）
ensure_cert_exists() {
    local domain="$1"
    if [ -f "/home/web/certs/${domain}_cert.pem" ] && [ -f "/home/web/certs/${domain}_key.pem" ]; then
        return 0
    fi
    if [ -f "/etc/letsencrypt/live/${domain}/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/${domain}/privkey.pem" ]; then
        mkdir -p /home/web/certs
        cp "/etc/letsencrypt/live/${domain}/fullchain.pem" "/home/web/certs/${domain}_cert.pem"
        cp "/etc/letsencrypt/live/${domain}/privkey.pem" "/home/web/certs/${domain}_key.pem"
        chmod 644 "/home/web/certs/${domain}_cert.pem"
        chmod 600 "/home/web/certs/${domain}_key.pem"
        log_ok "从 Let's Encrypt 路径恢复证书: ${domain}"
        return 0
    fi
    return 1
}

deploy_nginx_kejilion() {
    log_step "部署 Nginx 配置 → kejilion 模式"

    # 1. 复制前端静态文件
    rm -rf "$KEJILION_HTML_DIR/seo-platform"
    mkdir -p "$KEJILION_HTML_DIR/seo-platform"
    cp -r "$FRONTEND_DIST/"* "$KEJILION_HTML_DIR/seo-platform/"
    chmod -R 755 "$KEJILION_HTML_DIR/seo-platform"
    log_ok "前端文件 → $KEJILION_HTML_DIR/seo-platform"

    # 2. SSL 证书
    if [ "$SSL_MODE" = "https" ]; then
        auto_ssl_kejilion "$DOMAIN" || true
    fi

    # 3. 下载 map.conf（kejilion 依赖）
    local gh_proxy=""
    [ -n "${GITHUB_PROXY:-}" ] && gh_proxy="$GITHUB_PROXY"
    if [ ! -f "$KEJILION_CONF_DIR/map.conf" ]; then
        wget -q -O "$KEJILION_CONF_DIR/map.conf" ${gh_proxy}raw.githubusercontent.com/kejilion/nginx/main/map.conf 2>/dev/null || true
    fi

    # 4. 选择模板并替换占位符
    local backend_name
    backend_name=$(tr -dc 'A-Za-z' < /dev/urandom | head -c 8)
    local has_cert=false
    local cert_file="/home/web/certs/${DOMAIN}_cert.pem"
    local key_file="/home/web/certs/${DOMAIN}_key.pem"
    if [ -f "$cert_file" ] && [ -f "$key_file" ]; then
        # 验证证书: 非自签名 + 未过期
        issuer=$(openssl x509 -in "$cert_file" -noout -issuer 2>/dev/null | sed 's/issuer= //')
        subject=$(openssl x509 -in "$cert_file" -noout -subject 2>/dev/null | sed 's/subject= //')
        if [ "$issuer" != "$subject" ] && openssl x509 -in "$cert_file" -noout -checkend 86400 2>/dev/null; then
            has_cert=true
        else
            log_warn "证书无效（自签名或已过期），降级 HTTP 模式"
            log_info "提示: 请在 Cloudflare 将 SSL/TLS 设为 Flexible，或重新申请证书"
            SSL_MODE="http"
        fi
    fi

    local template
    if [ "$has_cert" = true ] && [ "$SSL_MODE" = "https" ]; then
        template="$SCRIPT_DIR/nginx/conf.d/kejilion-reverse-proxy-https.conf"
        log_info "生成 HTTPS 配置 → ${DOMAIN}.conf"
    else
        template="$SCRIPT_DIR/nginx/conf.d/kejilion-reverse-proxy.conf"
        log_info "生成 HTTP 配置 → ${DOMAIN}.conf"
    fi

    cp "$template" "$KEJILION_CONF_DIR/${DOMAIN}.conf"
    sed -i "s/__DOMAIN__/${DOMAIN}/g" "$KEJILION_CONF_DIR/${DOMAIN}.conf"
    sed -i "s/__BACKEND__/backend_${backend_name}/g" "$KEJILION_CONF_DIR/${DOMAIN}.conf"
    sed -i "s/__DATE__/$(date '+%Y-%m-%d %H:%M:%S')/g" "$KEJILION_CONF_DIR/${DOMAIN}.conf"

    log_ok "Nginx 配置已生成 → ${DOMAIN}.conf"

    # 5. 清理旧配置
    rm -f "$KEJILION_CONF_DIR/seo-platform.conf"

    # 6. 验证 & 重载
    if docker exec nginx nginx -t 2>&1 | tail -5; then
        docker exec nginx nginx -s reload 2>/dev/null || true
        log_ok "Nginx 配置已生效 → ${DOMAIN}.conf"
    else
        log_error "Nginx 配置验证失败"
        exit 1
    fi
}


# ═══════════════════════════════════════════════════════════════════════════════
#  首次部署
# ═══════════════════════════════════════════════════════════════════════════════
main_deploy() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════════╗"
    echo "║          Crane SEO Platform — 首次部署                              ║"
    echo "╚══════════════════════════════════════════════════════════════════════╝"
    echo ""

    detect_environment

    if [ -f "$ENV_FILE" ]; then
        log_info "检测到已有 .env，跳过交互式配置"
        set -a; source "$ENV_FILE" 2>/dev/null || true; set +a
        DOMAIN="${DOMAIN:-localhost}"
        SSL_MODE="${SSL_MODE:-http}"
        if [ "$DOMAIN" != "localhost" ] && [ -n "$DOMAIN" ]; then
            if [ "$SSL_MODE" = "http" ] && ensure_cert_exists "$DOMAIN"; then
                log_ok "检测到 SSL 证书，自动启用 HTTPS"
                SSL_MODE="https"
                sed -i 's/^SSL_MODE=.*/SSL_MODE=https/' "$ENV_FILE"
            fi
        fi
    else
        interactive_config
    fi

    generate_env_file
    build_frontend

    if [ "$DETECTED_KEJILION" = true ]; then
        deploy_nginx_kejilion
    fi

    log_step "构建 & 启动 Docker 服务"
    log_info "构建镜像...（首次约 3-5 分钟，请耐心等待）"
    docker compose -f "$COMPOSE_FILE" build --parallel 2>&1
    log_info "启动容器..."
    docker compose -f "$COMPOSE_FILE" up -d --force-recreate

    run_init_sql

    echo ""
    echo "╔══════════════════════════════════════════════════════════════════════╗"
    echo "║                    部署完成！                                       ║"
    echo "╠══════════════════════════════════════════════════════════════════════╣"
    if [ "$SSL_MODE" = "https" ] && [ "$DOMAIN" != "localhost" ]; then
        echo "║  https://${DOMAIN}                                                  ║"
    else
        echo "║  http://${DOMAIN}                                                   ║"
    fi
    echo "║  API:  http://localhost:48080/api-docs                             ║"
    echo "╚══════════════════════════════════════════════════════════════════════╝"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
#  一键清理
# ═══════════════════════════════════════════════════════════════════════════════
clean_all() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════════╗"
    echo "║  ⚠  警告：此操作将删除所有容器、数据、配置和前端文件！             ║"
    echo "╚══════════════════════════════════════════════════════════════════════╝"
    echo ""
    read -r -p "  输入 DELETE 确认删除: " confirm
    if [ "$confirm" != "DELETE" ]; then
        log_info "已取消"
        exit 0
    fi

    log_step "开始清理..."

    # 1. 停止并删除项目容器
    log_info "停止项目容器..."
    docker compose -f "$COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true
    docker rm -f crane-seo-api crane-seo-crawler crane-seo-postgres 2>/dev/null || true

    # 2. 删除 Docker 卷
    docker volume rm seo-api_postgres_data 2>/dev/null || true

    # 3. 删除 .env
    rm -f "$ENV_FILE"

    # 4. 删除 Nginx 配置和前端文件
    if [ -d "$KEJILION_CONF_DIR" ]; then
        for f in "$KEJILION_CONF_DIR/seo-platform.conf" "$KEJILION_CONF_DIR/${DOMAIN}.conf"; do
            if [ -f "$f" ]; then
                rm -f "$f"
                log_ok "已删除: $(basename "$f")"
            fi
        done
        if [ -d "$KEJILION_HTML_DIR/seo-platform" ]; then
            rm -rf "$KEJILION_HTML_DIR/seo-platform"
            log_ok "已删除前端文件"
        fi
        docker exec nginx nginx -s reload 2>/dev/null || true
    fi

    # 5. 删除证书
    if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "localhost" ]; then
        rm -f "/home/web/certs/${DOMAIN}_cert.pem" "/home/web/certs/${DOMAIN}_key.pem" 2>/dev/null
    fi

    # 6. 删除 Docker 镜像
    docker rmi seo-api-api seo-api-crawler 2>/dev/null || true

    echo ""
    log_ok "清理完成！运行 bash deploy.sh 重新部署"
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
        # 如果已有有效域名，校验证书
        if [ "$DOMAIN" != "localhost" ] && [ -n "$DOMAIN" ]; then
            if [ "$SSL_MODE" = "http" ] && ensure_cert_exists "$DOMAIN"; then
                log_ok "检测到 SSL 证书，自动启用 HTTPS"
                SSL_MODE="https"
                sed -i 's/^SSL_MODE=.*/SSL_MODE=https/' "$ENV_FILE" 2>/dev/null || true
            fi
        else
            log_warn "未设置域名，请重新输入"
            read -r -p "  域名 (如 seo.hutton.dpdns.org): " DOMAIN
            DOMAIN="${DOMAIN:-localhost}"
            sed -i "s/^DOMAIN=.*/DOMAIN=${DOMAIN}/" "$ENV_FILE"
            if [ "$DOMAIN" != "localhost" ] && ensure_cert_exists "$DOMAIN"; then
                SSL_MODE="https"
                sed -i 's/^SSL_MODE=.*/SSL_MODE=https/' "$ENV_FILE" 2>/dev/null || true
            fi
        fi
        build_frontend
        if [ "$DETECTED_KEJILION" = true ]; then
            deploy_nginx_kejilion
        fi
        docker compose -f "$COMPOSE_FILE" build --parallel 2>&1
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
    clean)
        detect_environment
        if [ -f "$ENV_FILE" ]; then
            set -a; source "$ENV_FILE" 2>/dev/null || true; set +a
            DOMAIN="${DOMAIN:-localhost}"
        fi
        clean_all
        ;;
    ssl)
        detect_environment
        if [ -f "$ENV_FILE" ]; then
            set -a; source "$ENV_FILE" 2>/dev/null || true; set +a
            DOMAIN="${DOMAIN:-localhost}"
            SSL_MODE="${SSL_MODE:-http}"
        fi
        if [ "$DETECTED_KEJILION" = true ]; then
            auto_ssl_kejilion "$DOMAIN"
        else
            log_error "SSL 自动申请仅支持 kejilion 环境"
            log_info "请手动申请证书后更新 Nginx 配置"
        fi
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
        echo "  stop       停止服务（保留数据）"
        echo "  clean      一键删除所有容器/数据/配置（输入 DELETE 确认）"
        echo "  logs       查看日志"
        echo "  restart    重启服务"
        echo "  ssl        手动申请 SSL 证书（kejilion 环境）"
        echo ""
        echo "示例: bash deploy.sh          # 首次部署"
        echo "      bash deploy.sh update   # 更新代码"
        echo "      bash deploy.sh clean    # 一键彻底删除"
        ;;
    *)
        echo "未知命令: $CMD"
        echo "用法: bash deploy.sh [deploy|update|status|stop|logs|restart|clean|ssl]"
        exit 1
        ;;
esac