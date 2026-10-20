/**
 * Marginalia comments / likes / recent feed — Cloudflare Worker + D1
 * 与仓库内 comments-server/app.py 接口 100% 兼容，供前端 reactions.js 直接调用。
 * 前端读取 <meta name="mg-api">（来自 _config.yml 的 comments_api）作为 API 基址。
 *
 * 端点：
 *   GET  /api/health
 *   POST /api/like            { slug }                       -> { slug, likes, liked }
 *   GET  /api/stats?slug=x&slugs=a,b,c -> { slug: {likes,comments,liked} }
 *   GET  /api/comments?slug=x -> { slug, count, comments:[...] }
 *   POST /api/comments        { slug, body, name?, title?, url?, website? } -> { ok, comment, comments }
 *   GET  /api/recent?limit=20 -> { comments:[...] }
 *   DELETE /api/comments/:id  (Authorization: Bearer <ADMIN_TOKEN>) -> 软删
 */

const NAME_MAX = 40;
const BODY_MAX = 2000;
const SLUG_MAX = 300;
const MAX_LINKS = 3;
const STATS_SLUG_CAP = 80;
const RATE_MAX = 3;
const RATE_WINDOW = 60; // 秒
const LINK_RE = /https?:\/\//i;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function clientIp(req) {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}

function ipHash(req, salt) {
  const data = salt + clientIp(req);
  // Web Crypto SHA-256 -> hex, 取前 16 位
  return crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(data))
    .then((buf) => {
      const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
      return hex.slice(0, 16);
    });
}

function serialize(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    url: row.url,
    name: row.name || "匿名",
    body: row.body,
    ts: row.ts,
  };
}

function corsHeaders(req, env) {
  const origin = req.headers.get("origin");
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  let allow = "*";
  if (origin) {
    allow = allowed.length && !allowed.includes("*") && !allowed.includes(origin) ? "" : origin;
  }
  const h = {
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (allow) h["Access-Control-Allow-Origin"] = allow;
  return h;
}

async function initDb(db) {
  await db.exec(
    `CREATE TABLE IF NOT EXISTS likes (
       slug TEXT NOT NULL, ip_hash TEXT NOT NULL, ts INTEGER NOT NULL,
       PRIMARY KEY (slug, ip_hash));
     CREATE TABLE IF NOT EXISTS comments (
       id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL, title TEXT NOT NULL DEFAULT '',
       url TEXT NOT NULL DEFAULT '', name TEXT NOT NULL DEFAULT '', body TEXT NOT NULL,
       ip_hash TEXT NOT NULL DEFAULT '', ts INTEGER NOT NULL, hidden INTEGER NOT NULL DEFAULT 0);
     CREATE INDEX IF NOT EXISTS idx_comments_slug ON comments(slug, hidden, id);
     CREATE INDEX IF NOT EXISTS idx_comments_recent ON comments(hidden, id);`
  );
}

async function likeCount(db, slug) {
  const r = await db.prepare("SELECT COUNT(*) c FROM likes WHERE slug=?").bind(slug).first();
  return r ? r.c : 0;
}
async function commentCount(db, slug) {
  const r = await db
    .prepare("SELECT COUNT(*) c FROM comments WHERE slug=? AND hidden=0")
    .bind(slug)
    .first();
  return r ? r.c : 0;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const p = url.pathname;
    const db = env.marginalia_comments;

    // 懒初始化表（首次访问自动建表）
    try {
      await initDb(db);
    } catch (_) {}

    // CORS 预检
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(req, env) });
    }
    if (!p.startsWith("/api/")) {
      return json({ ok: true, service: "marginalia-comments" });
    }

    const cors = corsHeaders(req, env);

    try {
      // ---- health ----
      if (p === "/api/health" && req.method === "GET") {
        return json({ ok: true }, 200, cors);
      }

      // ---- like (toggle) ----
      if (p === "/api/like" && req.method === "POST") {
        const { slug } = await req.json().catch(() => ({}));
        const s = (slug || "").toString().trim().slice(0, SLUG_MAX);
        if (!s) return json({ error: "missing slug" }, 400, cors);
        const h = await ipHash(req, env.IP_SALT || "marginalia");
        const existing = await db
          .prepare("SELECT 1 FROM likes WHERE slug=? AND ip_hash=?")
          .bind(s, h)
          .first();
        let liked;
        if (existing) {
          await db.prepare("DELETE FROM likes WHERE slug=? AND ip_hash=?").bind(s, h).run();
          liked = false;
        } else {
          await db
            .prepare("INSERT INTO likes(slug, ip_hash, ts) VALUES(?,?,?)")
            .bind(s, h, Math.floor(Date.now() / 1000))
            .run();
          liked = true;
        }
        return json({ slug: s, likes: await likeCount(db, s), liked }, 200, cors);
      }

      // ---- stats (batch) ----
      if (p === "/api/stats" && req.method === "GET") {
        const keys = [];
        const slug = url.searchParams.get("slug");
        const slugs = url.searchParams.get("slugs");
        if (slug) keys.push(slug.trim().slice(0, SLUG_MAX));
        if (slugs) for (const s of slugs.split(",")) { const t = s.trim().slice(0, SLUG_MAX); if (t) keys.push(t); }
        const uniq = [...new Set(keys.filter(Boolean))].slice(0, STATS_SLUG_CAP);
        if (!uniq.length) return json({}, 200, cors);
        const h = await ipHash(req, env.IP_SALT || "marginalia");
        const out = {};
        for (const k of uniq) {
          const liked = !!(await db
            .prepare("SELECT 1 FROM likes WHERE slug=? AND ip_hash=?")
            .bind(k, h)
            .first());
          out[k] = { likes: await likeCount(db, k), comments: await commentCount(db, k), liked };
        }
        return json(out, 200, cors);
      }

      // ---- list comments ----
      if (p === "/api/comments" && req.method === "GET") {
        const slug = (url.searchParams.get("slug") || "").trim().slice(0, SLUG_MAX);
        if (!slug) return json({ error: "missing slug" }, 400, cors);
        const rows = await db
          .prepare("SELECT * FROM comments WHERE slug=? AND hidden=0 ORDER BY id DESC LIMIT 200")
          .bind(slug)
          .all();
        const list = (rows.results || []).map(serialize);
        return json({ slug, count: list.length, comments: list }, 200, cors);
      }

      // ---- add comment ----
      if (p === "/api/comments" && req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        if ((body.website || "").toString().trim()) return json({ ok: true, skipped: true }, 200, cors); // 蜜罐
        const slug = (body.slug || "").toString().trim().slice(0, SLUG_MAX);
        const text = (body.body || "").toString();
        const name = (body.name || "").toString().trim().slice(0, NAME_MAX) || "匿名";
        const title = (body.title || "").toString().trim().slice(0, 200);
        const urlv = (body.url || "").toString().trim().slice(0, 300);
        if (!slug) return json({ error: "missing slug" }, 400, cors);
        if (!text.trim()) return json({ error: "empty comment" }, 400, cors);
        if (text.length > BODY_MAX) return json({ error: `comment too long (>${BODY_MAX})` }, 400, cors);
        if ((text.match(LINK_RE) || []).length > MAX_LINKS)
          return json({ error: "too many links" }, 400, cors);
        const h = await ipHash(req, env.IP_SALT || "marginalia");
        const now = Math.floor(Date.now() / 1000);
        const recent = await db
          .prepare("SELECT COUNT(*) c FROM comments WHERE ip_hash=? AND ts > ?")
          .bind(h, now - RATE_WINDOW)
          .first();
        if (recent && recent.c >= RATE_MAX) return json({ error: "评论太频繁，稍后再试" }, 429, cors);
        const dup = await db
          .prepare("SELECT 1 FROM comments WHERE ip_hash=? AND slug=? AND body=? AND ts > ?")
          .bind(h, slug, text, now - RATE_WINDOW)
          .first();
        if (dup) return json({ error: "重复评论" }, 409, cors);
        const res = await db
          .prepare(
            "INSERT INTO comments(slug,title,url,name,body,ip_hash,ts) VALUES(?,?,?,?,?,?,?)"
          )
          .bind(slug, title, urlv, name, text, h, now)
          .run();
        const id = res.meta?.last_row_id;
        const row = id
          ? await db.prepare("SELECT * FROM comments WHERE id=?").bind(id).first()
          : null;
        return json(
          { ok: true, comment: row ? serialize(row) : null, comments: await commentCount(db, slug) },
          200,
          cors
        );
      }

      // ---- recent ----
      if (p === "/api/recent" && req.method === "GET") {
        const limit = Math.max(1, Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 50));
        const rows = await db
          .prepare("SELECT * FROM comments WHERE hidden=0 ORDER BY id DESC LIMIT ?")
          .bind(limit)
          .all();
        return json({ comments: (rows.results || []).map(serialize) }, 200, cors);
      }

      // ---- admin soft-delete ----
      if (p.startsWith("/api/comments/") && req.method === "DELETE") {
        if (!env.ADMIN_TOKEN) return json({ error: "delete disabled" }, 503, cors);
        const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
        if (token !== env.ADMIN_TOKEN) return json({ error: "bad token" }, 401, cors);
        const cid = parseInt(p.split("/").pop(), 10);
        if (!cid) return json({ error: "bad id" }, 400, cors);
        await db.prepare("UPDATE comments SET hidden=1 WHERE id=?").bind(cid).run();
        return json({ ok: true, id: cid }, 200, cors);
      }

      return json({ error: "not found" }, 404, cors);
    } catch (e) {
      return json({ error: String(e && e.message ? e.message : e) }, 500, cors);
    }
  },
};
