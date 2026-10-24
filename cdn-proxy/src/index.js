/**
 * marginalia-proxy
 * 把自定义域 marginalia.201573.xyz 的所有请求回源到 marginalia-blog.pages.dev
 * （由 GitHub Actions 构建、约 50 秒生效的项目），使自定义域跟随其快速更新，
 * 绕开 marginalia-git（原生 Git 集成）的 ~4 分钟自定义域推广延迟。
 *
 * 回退：删掉 wrangler.toml 里的 routes 条目（或 `wrangler route delete`）即可，
 * 自定义域立即恢复直连 marginalia-git，无需改动任何 DNS 或 Pages 配置。
 */

const ORIGIN = 'https://marginalia-blog.pages.dev';

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      url.hostname = 'marginalia-blog.pages.dev';
      url.protocol = 'https:';

      // 复制原始请求，但去掉 host（让 fetch 用目标主机名），保留方法/头/正文/查询串
      const headers = new Headers(request.headers);
      headers.delete('host');

      const upstream = new Request(url.toString(), {
        method: request.method,
        headers,
        body: request.body,
        redirect: 'follow',
      });

      // cacheTtl:0 关闭边缘缓存，确保每次都拉 pages.dev 最新内容（这正是「快」的关键）
      const resp = await fetch(upstream, { cf: { cacheTtl: 0 } });

      const out = new Headers(resp.headers);
      // 剥掉 CF 内部头，避免泄露 + 防止某些逐跳头干扰客户端
      ['server', 'cf-cache-status', 'cf-ray', 'cf-request-id', 'x-request-id'].forEach((h) => out.delete(h));
      // 标记，便于确认代理是否生效（curl -I 自定义域能看到这一行）
      out.set('x-proxied-by', 'marginalia-proxy');

      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: out,
      });
    } catch (e) {
      return new Response('502 Bad Gateway (marginalia-proxy): ' + (e && e.message ? e.message : e), {
        status: 502,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
  },
};
