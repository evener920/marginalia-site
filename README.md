# Marginalia

研究笔记 + 多页作品集站点。基于 Jekyll；GitHub Actions 构建后发布到 pyf nginx。

**站点**：https://jinzi.cyou/

## 目录结构

```
_posts/                         单篇文章（.md 或 .html，文件名 YYYY-MM-DD-slug.ext）
showcases/<slug>/               多页作品集，整目录原样发布，不被 Jekyll 模板包裹
_includes/custom-head.html      站点级 <head> 注入（含 noindex 元标记）
_includes/reactions.html        点赞/评论挂件（post/video 详情页 include）
comments-server/                自托管点赞/评论后端（FastAPI+SQLite，跑在 pyf，exclude 出构建；详见其 README）
assets/js/{reactions,filter}.js 互动层 + 分类筛选（无依赖）
_config.yml                     站点配置（含 comments_api: 后端地址，留空则互动层禁用）
index.md / about.md / showcases.md / notes.md   导航页（notes.md = /notes/ 研究报告，带分类筛选）
```

## 加文章

### 一键脚本（推荐）

```bash
scripts/publish.py path/to/some-note.md \
  --tags "tag1,tag2" \
  --description "1–2 句信息密度高的摘要，进搜索结果" \
  --keywords "逗号分隔关键词"
```

脚本会：
- 用第一行 `# title` 当作 post 标题（自动剥掉，避免重复 H1）
- 用紧跟其后的 blockquote 当作 description（除非 `--description` 显式给出）
- 用文件 mtime 当作 post 日期（除非 `--date` 给出，固定为 12:00 +0800 让 UTC 日期对齐）
- 用源文件名当作 slug（除非 `--slug`）
- 写到 `_posts/YYYY-MM-DD-slug.md`
- `git add` + `git commit` + `git push`（用 `~/.config/gh/org_pyf-labrary.token` 自动认证）

常用开关：`--no-push`（只 commit）、`--no-commit`（只写文件）、`--force`（覆盖已存在 post）、`--category`（研究报告分类：`Claude · LLM` / `Agent 工程` / `AIGC 工艺` / `基础设施`，供 `/notes/` 筛选）。

### 手工方式

也可以直接在 `_posts/` 建文件 `YYYY-MM-DD-some-title.md`，顶部写 front matter：
```yaml
---
layout: post
title: "标题"
date: 2026-05-01 12:00:00 +0800
description: "SEO 摘要"
tags: [tag1, tag2]
---
```
正文支持 `.md` 或 `.html`（扩展名分别）。push 到 `main`，约 30–90 秒上线。

## 加多页 showcase

整个目录扔到 `showcases/<slug>/` 下，包含 `index.html` + 子页 + `assets/`。然后到 `showcases.md` 加一条入口链接。

## SEO

启用了 `jekyll-seo-tag` + `jekyll-sitemap`：

- `<head>` 自动生成 OpenGraph / Twitter Card / canonical / `<meta description>` / JSON-LD（`BlogPosting` / `WebSite` schema）
- `/sitemap.xml` 由 jekyll-sitemap 自动生成，包含所有 posts 和 pages
- `/feed.xml` 由 jekyll-feed 提供
- `/robots.txt` 显式 `Allow: /` 并指向 sitemap

写新文章时，front matter 里加 `description:`（首选）或 `excerpt:` 给 SEO tag 用。`tags:` 和 `keywords:` 可选。

`showcases/<slug>/` 下的原始 HTML 文件 Jekyll 不处理，需在 `<head>` 里手动加 canonical / OG / description。模板见 `/tmp/inject-seo.py`（一次性脚本，按需重跑）。

## 读者互动 + 分类筛选

- **点赞 / 评论 / 消息盒子**：由自托管后端 `comments-server/`（`mg-api.panyifeng.xyz`，FastAPI+SQLite on pyf）驱动。`_config.yml` 的 `comments_api` 指向它；前端 `assets/js/reactions.js` 在 post/video 详情页挂完整态、在 showcase/game/note/video 卡片挂紧凑态 drawer，header「消息」slide-over 聚合全站最近评论。后端不可达时整层静默降级。部署/运维（含删垃圾评论命令）见 `comments-server/README.md`。
- **分类筛选**：`assets/js/filter.js`（复用 `.ms-chip`，`?cat=` 同步 URL）作用于 `/notes/`、`/showcases/`、`/videos/`、`/games/`。posts 用 `category` front matter、games 用 `category`（`add-game.py --category`）、videos 按 `weekly` tag 派生周报/专题、showcases 在 `showcases.md` 的 `data-cats` 上标注。

## 本地预览（可选）

```bash
bundle install
bundle exec jekyll serve
```

不安装也行——push `main` 后由 GitHub Actions 在线构建并以受限 rsync 发布。
