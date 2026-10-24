# 回退指南：marginalia-proxy Worker 回源代理

部署时间：2026-10-24
账号：evener920 / 82129ffe005dfd5010505adf73de06cb

## 当前状态（部署后）
- 自定义域 `marginalia.201573.xyz` 经 **Worker `marginalia-proxy` 区域路由**接管，回源 `marginalia-blog.pages.dev`（~50s 生效）。
- `marginalia-git` 上的自定义域已解绑（删除于部署过程）。
- 验证：`curl -I https://marginalia.201573.xyz/` 出现 `x-proxied-by: marginalia-proxy`。

## 回退步骤
1. 撤掉 Worker 路由（任选其一）：
   - 删 `cdn-proxy/wrangler.toml` 里的 `routes`，再 `wrangler deploy`；或
   - `wrangler delete marginalia-proxy`。
2. 把自定义域重新挂回某个 Pages 项目（否则撤 Worker 后域名无服务）：
   - 推荐挂 `marginalia-blog`（最快，沿用 Actions 构建）：
     `POST /accounts/82129ffe…/pages/projects/marginalia-blog/domains`
     body: `{"name":"marginalia.201573.xyz"}`
   - 或挂回原 `marginalia-git`（慢，原状）：同上改 project 名。
   该操作仅需 `pages:write` 权限（当前 token 具备），无需 DNS 权限。

## 关键事实（部署前快照见同目录）
- `marginalia-git`：原生 Git 集成，慢，原持有自定义域。
- `marginalia-blog`：GitHub Actions 构建，~50s，CLOUDFLARE_PAGES_PROJECT 目标。
- token 仅有 `zone:read`，无 `dns_records:*`，故无法经 API 删 DNS 记录——这也是改用区域路由而非自定义域的原因。
