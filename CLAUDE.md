# marginalia · 常用命令

> 本文件由 `~/claw/CLAUDE.md` 拆出（2026-07-09 doctor 迁移，原文件全局常驻改为按需加载）。跨项目背景/子项目地图/契约见根 [`../CLAUDE.md`](../CLAUDE.md)。

```bash
# 单文 / 多文一键发布草稿到站点（自动写 front-matter + git push）
~/claw/marginalia/scripts/publish.py path/to/draft.md \
  --tags "tag1,tag2" --description "1–2 句摘要"

# 把 ~/claw/game/<name>/ 整目录灌进 /games/（含 Playwright 自动截图）
~/claw/marginalia/scripts/add-game.py ~/claw/game/<slug>

# 周报视频上 B 站并改写 _videos/<slug>.md（drop video:, 写 bvid:）
~/claw/marginalia/scripts/publish-video.py ~/claw/video/<build-dir> --upload

# 本地预览（可选；push main 后 Actions 构建并以受限 rsync 发布到 pyf）
cd ~/claw/marginalia && bundle exec jekyll serve
```

发布脚本依赖 `~/.config/gh/org_pyf-labrary.token`（org-scoped PAT，见 MEMORY）。

生产站点：`https://jinzi.cyou/`。`panyifeng.xyz`、`www.panyifeng.xyz`、
`www.jinzi.cyou` 均由 pyf nginx 301 到主域并保留路径与 query。部署 workflow：
`.github/workflows/pages.yml`；GitHub Pages custom domain 已停用。
