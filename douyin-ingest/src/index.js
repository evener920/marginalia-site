// marginalia-douyin-ingest
// 接收书签 POST 来的抖音收藏列表，自动建视频页 + 拉封面 + 提交到 GitHub
// （提交触发 pages.yml 自动构建部署）。

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  let out = "";
  for (let i = 0; i < bin.length; i += 3) {
    const a = bin.charCodeAt(i);
    const b = bin.charCodeAt(i + 1);
    const c = bin.charCodeAt(i + 2);
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | (b >> 4)];
    out += b ? B64[((b & 15) << 2) | (c >> 6)] : "=";
    out += c ? B64[c & 63] : "=";
  }
  return out;
}

function utf8ToBase64(str) {
  return bytesToBase64(new TextEncoder().encode(str));
}

// 与 tools/import_douyin.py 的 slugify 保持一致：白名单保留 CJK/字母/数字/_
function slugify(title) {
  const s = (title || "").normalize("NFC");
  let out = s.replace(/[^\w一-鿿豈-﫿]+/g, "-");
  out = out.replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
  return (out || "douyin-video").slice(0, 60);
}

function todayStamp() {
  // 上海时区 YYYY-MM-DD
  const d = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const now = new Date(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date())
  );
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return { date: d, datetime: `${d} ${hh}:${mm}:${ss} +08:00` };
}

function ghFetch(env, path, method = "GET", body) {
  const headers = {
    Authorization: `Bearer ${env.GH_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "marginalia-douyin-ingest",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (body) headers["Content-Type"] = "application/json";
  return fetch(`https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function getIndex(env) {
  const r = await ghFetch(env, `/contents/${env.INDEX_PATH}?ref=${env.BRANCH}`);
  if (r.status === 404) return {};
  if (!r.ok) throw new Error(`读索引失败: ${r.status}`);
  const data = await r.json();
  return JSON.parse(Buffer.from(data.content, "base64").toString("utf8"));
}

async function getBaseTreeSha(env) {
  const ref = await ghFetch(env, `/git/refs/heads/${env.BRANCH}`);
  if (!ref.ok) throw new Error(`读分支失败: ${ref.status}`);
  const refData = await ref.json();
  const commitSha = refData.object.sha;
  const tree = await ghFetch(env, `/git/trees/${commitSha}`);
  if (!tree.ok) throw new Error(`读树失败: ${tree.status}`);
  const treeData = await tree.json();
  return { commitSha, baseTreeSha: treeData.sha };
}

async function createBlob(env, contentBase64) {
  const r = await ghFetch(env, `/git/blobs`, "POST", {
    content: contentBase64,
    encoding: "base64",
  });
  if (!r.ok) throw new Error(`建 blob 失败: ${r.status}`);
  return (await r.json()).sha;
}

async function fetchCover(coverUrl) {
  if (!coverUrl) return null;
  let url = coverUrl;
  if (url.startsWith("//")) url = "https:" + url;
  try {
    const r = await fetch(url, {
      headers: { Referer: "https://www.douyin.com/", "User-Agent": "Mozilla/5.0" },
    });
    if (!r.ok) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    return bytesToBase64(buf);
  } catch {
    return null;
  }
}

function buildMd(title, vid, posterRel) {
  const { datetime } = todayStamp();
  const poster = posterRel ? `poster: ${posterRel}\n` : "";
  return (
    `---\n` +
    `layout: video\n` +
    `title: ${title}\n` +
    `date: ${datetime}\n` +
    `douyin_id: ${vid}\n` +
    `tags:\n  - douyin\n` +
    `${poster}` +
    `---\n\n` +
    `（正文可选：可在此写几句推荐语、金句摘录等。）\n`
  );
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function handleIngest(env, entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return new Response(JSON.stringify({ created: 0, skipped: 0, error: "空列表" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...cors() },
    });
  }

  const index = await getIndex(env);
  const { commitSha, baseTreeSha } = await getBaseTreeSha(env);
  const { date } = todayStamp();

  const treeEntries = [];
  let created = 0;
  let skipped = 0;

  for (const e of entries) {
    const vid = String(e.id || "").match(/\d{15,}/)?.[0];
    if (!vid) {
      skipped++;
      continue;
    }
    if (index[vid]) {
      skipped++;
      continue;
    }
    const title = (e.title || `抖音视频 ${vid}`).slice(0, 120);
    const slug = slugify(title);
    const fname = `${date}-${slug}.md`;

    let posterRel = "";
    const coverB64 = await fetchCover(e.cover);
    if (coverB64) {
      posterRel = `/assets/img/covers/${vid}.jpg`;
      treeEntries.push({
        path: `assets/img/covers/${vid}.jpg`,
        mode: "100644",
        type: "blob",
        sha: await createBlob(env, coverB64),
      });
    }

    const mdSha = await createBlob(env, utf8ToBase64(buildMd(title, vid, posterRel)));
    treeEntries.push({ path: `_videos/${fname}`, mode: "100644", type: "blob", sha: mdSha });
    index[vid] = fname;
    created++;
  }

  if (created === 0) {
    return new Response(JSON.stringify({ created: 0, skipped }), {
      headers: { "Content-Type": "application/json", ...cors() },
    });
  }

  // 更新索引文件本身
  const idxSha = await createBlob(env, utf8ToBase64(JSON.stringify(index, null, 2)));
  treeEntries.push({ path: env.INDEX_PATH, mode: "100644", type: "blob", sha: idxSha });

  const treeR = await ghFetch(env, `/git/trees`, "POST", {
    base_tree: baseTreeSha,
    tree: treeEntries,
  });
  if (!treeR.ok) throw new Error(`建树失败: ${treeR.status}`);
  const treeSha = (await treeR.json()).sha;

  const commitR = await ghFetch(env, `/git/commits`, "POST", {
    message: `chore: 自动导入 ${created} 条抖音视频 (via douyin-ingest)`,
    tree: treeSha,
    parents: [commitSha],
  });
  if (!commitR.ok) throw new Error(`建提交失败: ${commitR.status}`);
  const newCommit = (await commitR.json()).sha;

  const refR = await ghFetch(env, `/git/refs/heads/${env.BRANCH}`, "PATCH", {
    sha: newCommit,
    force: false,
  });
  if (!refR.ok) throw new Error(`更新分支失败: ${refR.status}`);

  return new Response(JSON.stringify({ created, skipped }), {
    headers: { "Content-Type": "application/json", ...cors() },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors() });
    }
    if (url.pathname === "/ingest" && request.method === "POST") {
      try {
        const body = await request.json();
        return await handleIngest(env, body.entries || []);
      } catch (err) {
        return new Response(JSON.stringify({ created: 0, skipped: 0, error: String(err.message || err) }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...cors() },
        });
      }
    }
    return new Response("marginalia-douyin-ingest alive", {
      headers: { "Content-Type": "text/plain" },
    });
  },
};
