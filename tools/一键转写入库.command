#!/bin/bash
# ============================================================
#  抖音视频 · 一键转写入库（macOS 双击运行）
#  作用：把书签下载的视频自动 转写语音 → 生成/更新视频页 → 提交上线
#  前置：先在抖音视频页点「抖音视频抓取」书签下载视频（可留在下载目录）
# ============================================================
set -u
cd "$(dirname "$0")/.." || { echo "找不到项目目录"; read -r; exit 1; }

PY="/Users/evener920/.workbuddy/binaries/python/envs/default/bin/python"
if [ ! -x "$PY" ]; then
  echo "✗ 找不到 Python 环境：$PY"
  echo "  请改用系统 python3 并先安装 faster-whisper、imageio-ffmpeg"
  read -r; exit 1
fi

echo "============================================================"
echo "  抖音视频 · 一键转写入库"
echo "  模型：medium（首次运行会下载约 1.5GB 权重，请耐心）"
echo "============================================================"
echo

# 先拉取远端，避免本地落后导致 push 被拒
git pull --rebase --quiet 2>/dev/null || git pull --quiet 2>/dev/null

# 自动入库并推送上线（--push 触发 Cloudflare Pages 构建）
"$PY" tools/ingest_inbox.py --model medium --push
RC=$?

echo
echo "============================================================"
if [ "$RC" -eq 0 ]; then
  echo "  处理结束。稍候 1 分钟线上即可看到文稿："
  echo "  https://marginalia.201573.xyz/videos/"
else
  echo "  出错啦（代码 $RC），把上面的红字截图发我。"
fi
echo "============================================================"
echo "按回车键关闭窗口…"
read -r
