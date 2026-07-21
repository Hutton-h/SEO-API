#!/usr/bin/env bash
# =============================================================================
# Crane SEO Platform — 数据库备份脚本
# 用法: bash db/backup.sh
# 环境变量:
#   S3_BUCKET        可选，S3 存储桶名（启用后备份自动上传到 S3）
#   PGHOST           默认 localhost
#   PGPORT           默认 5432
#   PGUSER           默认 crane_user
#   PGDATABASE       默认 crane_seo
#   PGPASSWORD       数据库密码
#   BACKUP_DIR       备份目录，默认 ./db/backups
#   RETENTION_DAYS   保留天数，默认 30
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="crane_seo_backup_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

START_TIME=$(date +%s)

echo "=== Crane SEO Platform — 数据库备份 ==="
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "备份文件: $BACKUP_DIR/$BACKUP_FILE"
echo ""

# 执行 pg_dump
echo "[1/2] 执行 pg_dump..."
PGPASSWORD="${PGPASSWORD:-}" pg_dump \
    --host="${PGHOST:-localhost}" \
    --port="${PGPORT:-5432}" \
    --username="${PGUSER:-crane_user}" \
    --dbname="${PGDATABASE:-crane_seo}" \
    --format=custom \
    --compress=9 \
    --file="$BACKUP_DIR/$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "备份大小: $BACKUP_SIZE"
echo "耗时: ${DURATION}s"

# 清理旧备份
echo ""
echo "[2/2] 清理 ${RETENTION_DAYS} 天前的旧备份..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "crane_seo_backup_*.dump" -type f -mtime +"$RETENTION_DAYS" -delete -print | wc -l)
echo "已删除 $DELETED_COUNT 个旧备份"

# 可选：上传到 S3
if [ -n "${S3_BUCKET:-}" ]; then
    echo ""
    echo "[可选] 上传到 S3: s3://${S3_BUCKET}/"
    if command -v aws &>/dev/null; then
        aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://${S3_BUCKET}/db-backups/${BACKUP_FILE}" --storage-class STANDARD_IA
        echo "S3 上传完成"
    else
        echo "警告: aws-cli 未安装，跳过 S3 上传"
    fi
fi

echo ""
echo "=== 备份完成 ==="
echo "完成时间: $(date '+%Y-%m-%d %H:%M:%S')"