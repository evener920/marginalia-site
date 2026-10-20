// Marginalia · Decap CMS OAuth 代理（GitHub 后端，免官方代理）
// Decap 的 NetlifyAuthenticator 用「弹窗 + postMessage 握手」协议：
//   1) Decap 主窗口开 popup → Worker /auth → 302 GitHub 授权(scope=repo)
//   2) GitHub 回调 /callback?code=... → 这里用 client_secret 换 access_token
//   3) Worker 在 popup 内返回一个握手 HTML：
//      popup 先 postMessage('authorizing:github') → 等 opener 回同消息
//      → popup postMessage('authorization:github:success:{token,provider}')
//      → Decap 收到即登录完成，popup 自动关闭
//   （注意：不能 302 回 admin 页——Decap 的 hash 路由会把 #access_token
//    改写成 #/access_token，主窗口永远等不到握手。）
//
// 机密（务必 wrangler secret put，不进仓库）：
//   GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET

const GITHUB_AUTH = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN = "https://github.com/login/oauth/access_token";

const PROTOCOL_PAGE = (token, errorMsg) => `<!DOCTYPE html>
<html lang="zh">
<head><meta charset="utf-8"><title>Marginalia CMS · 授权中</title></head>
<body style="font-family:-apple-system,sans-serif;color:#333;text-align:center;padding-top:40vh">
<p id="msg">${errorMsg ? errorMsg : "授权成功，正在返回后台…"}</p>
<script>
(function () {
  var TOKEN = ${token ? JSON.stringify(token) : "null"};
  var ERROR = ${errorMsg ? JSON.stringify(errorMsg) : "null"};

  if (ERROR) {
    try { window.opener.postMessage("authorization:github:error:" + JSON.stringify({ error: ERROR, provider: "github" }), "*"); } catch (e) {}
    return;
  }

  function finish() {
    var payload = "authorization:github:success:" + JSON.stringify({ token: TOKEN, provider: "github" });
    try { window.opener.postMessage(payload, "*"); } catch (e) {}
    document.getElementById("msg").textContent = "授权完成，本窗口可关闭。";
    setTimeout(function () { window.close(); }, 300);
  }

  if (!window.opener) {
    document.getElementById("msg").textContent = "没有检测到后台窗口（opener）。请从 /admin 页重新点击登录。";
    return;
  }

  // 第一步：向 opener 打招呼（Decap 的 handshakeCallback 监听 'authorizing:github'）
  window.opener.postMessage("authorizing:github", "*");

  // 第二步：等 opener 回同名消息，再回 success 载荷（Netlify widget 协议）
  window.addEventListener("message", function (e) {
    if (e.data === "authorizing:github") {
      finish();
    }
  });

  // 兜底：个别环境 opener 可能不回，直接尝试完成
  setTimeout(finish, 2000);
})();
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // —— 2) GitHub 回调：用 code 换 token，然后在 popup 内做 postMessage 握手 ——
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) {
        return new Response("Missing ?code from GitHub", { status: 400 });
      }
      const resp = await fetch(GITHUB_TOKEN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const data = await resp.json();
      const token = data.access_token;
      if (!token) {
        return new Response(
          PROTOCOL_PAGE(null, "GitHub 未返回 access_token：" + JSON.stringify(data)),
          { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
        );
      }
      return new Response(PROTOCOL_PAGE(token, null), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // —— 1) 默认入口（含 /auth）：发起 GitHub OAuth 授权 ——
    if (!env.GITHUB_CLIENT_ID) {
      return new Response("Worker 未配置 GITHUB_CLIENT_ID（请 wrangler secret put）", {
        status: 500,
      });
    }
    const redirectUri = url.origin + "/callback";
    const authUrl = new URL(GITHUB_AUTH);
    authUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "repo");
    return Response.redirect(authUrl.toString(), 302);
  },
};
