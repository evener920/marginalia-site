#!/bin/bash
# disk_guard.sh — VPS 磁盘守卫
# 背景：磁盘写满(>92%)会让 DTK 主动暂停下载并返回 503，导致转写任务集体失败被误判"永久跳过"。
# 作用：磁盘使用率高时自动清理安全缓存，防止再次写满。
# 部署：scp 到 /opt/douyin-api/disk_guard.sh，挂 root cron 每小时执行：
#   0 * * * * /bin/bash /opt/douyin-api/disk_guard.sh
#
# 清理分三档，全部不碰文字稿(transcripts/)和服务数据：
#   1) >=85%：Docker 构建缓存（纯中间层，绝对安全）
#   2) >=85%：journal 旧日志（保留 7 天）
#   3) >=93%：DTK 媒体缓存里 7 天前的视频文件（转写早已完成，DTK 自己也会清）

set -u
LOG=/opt/douyin-api/disk_guard.log
THRESH=85
HARD=93

pct=$(df -h / | awk 'NR==2{gsub("%","",$5);print $5}')
if [ "$pct" -lt "$THRESH" ]; then
  exit 0
fi

echo "$(date "+%F %T") 磁盘 ${pct}% >= ${THRESH}%，开始清理" >> "$LOG"
sudo /usr/bin/docker builder prune -f >> "$LOG" 2>&1
sudo /usr/bin/journalctl --vacuum-time=7d >> "$LOG" 2>&1

pct2=$(df -h / | awk 'NR==2{gsub("%","",$5);print $5}')
if [ "$pct2" -ge "$HARD" ]; then
  sudo /usr/bin/find /var/lib/docker/volumes/dtk_media-data/_data/douyin -type f -mtime +7 -delete >> "$LOG" 2>&1
  echo "$(date "+%F %T") 硬清理：删除 7 天前的 DTK 媒体缓存" >> "$LOG"
fi

echo "$(date "+%F %T") 清理后磁盘：$(df -h / | awk 'NR==2{print $5}')" >> "$LOG"
