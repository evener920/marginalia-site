// marginalia-douyin-ingest
// 接收书签 POST 来的抖音收藏列表，自动建视频页 + 拉封面 + 提交到 GitHub
// （提交触发 pages.yml 自动构建部署）。
//
// 设计要点（针对大批量，如一次 400+ 条）：
//   - 接受请求后立即返回 202，重活在 ctx.waitUntil 后台跑，避免书签 fetch 超时。
//   - 批量并发创建 blob（不再串行），大幅压缩墙钟时间。
//   - 每批单独提交一次 commit + 更新索引，所以中途被平台掐断也能「断点续传」：
//     重跑书签会把已入库的 id 去重跳过，只补剩下的。

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
  const now = new Date();
  const tz = "Asia/Shanghai";
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  // en-GB + hour12:false 直接给出 24 小时制 "HH:MM:SS"，无需再 new Date() 解析（那会产出 NaN）
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(now);
  return { date, datetime: `${date} ${time} +08:00` };
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

async function getBaseTreeSha(env, commitSha) {
  const tree = await ghFetch(env, `/git/trees/${commitSha}`);
  if (!tree.ok) throw new Error(`读树失败: ${tree.status}`);
  const treeData = await tree.json();
  return treeData.sha;
}

async function createBlob(env, contentBase64) {
  const r = await ghFetch(env, `/git/blobs`, "POST", {
    content: contentBase64,
    encoding: "base64",
  });
  if (!r.ok) throw new Error(`建 blob 失败: ${r.status}`);
  return (await r.json()).sha;
}

// 注意：抖音封面带防盗链/签名，Worker 服务端 fetch 拿不到真图（常返回极小占位响应）。
// 因此不再在服务端拉图，而是把书签抓到的「抖音原始封面 URL」直接写进视频页，
// 由用户浏览器直连抖音 CDN 加载（浏览器上下文通常能绕过服务端拉不到的防盗链）。
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

const CHUNK = 20; // 每批提交条数

// 处理一批（上限 CHUNK 条）：并发建 blob → 建树 → 提交 → 更新 ref，并把索引写进本次树。
async function processChunk(env, chunk, index, baseCommitSha, date) {
  const baseTreeSha = await getBaseTreeSha(env, baseCommitSha);

  // 每条视频独立并发：拉封面 + 建视频页 blob
  const tasks = chunk.map(async (e) => {
    const vid = String(e.id || "").match(/\d{15,}/)?.[0];
    if (!vid) return null;
    if (index[vid]) return null; // 已被更早批次写入，跳过
    const title = (e.title || `抖音视频 ${vid}`).slice(0, 120);
    const slug = slugify(title);
    const fname = `${date}-${slug}.md`;
    // 直接采用书签传来的抖音原始封面 URL（http(s)），不再服务端拉图
    let posterRel = "";
    const coverRaw = (e.cover || "").toString().trim();
    if (coverRaw.startsWith("//")) posterRel = "https:" + coverRaw;
    else if (/^https?:\/\//.test(coverRaw)) posterRel = coverRaw;
    const mdSha = await createBlob(env, utf8ToBase64(buildMd(title, vid, posterRel)));
    const parts = [{ path: `_videos/${fname}`, mode: "100644", type: "blob", sha: mdSha }];
    index[vid] = fname; // 写入索引（内存），后续批次据此去重
    return parts;
  });

  const results = await Promise.all(tasks);
  const treeEntries = results.filter(Boolean).flat();
  if (treeEntries.length === 0) return baseCommitSha; // 整批都跳过了

  // 把最新索引一并提交，保证进度持久化（中途被掐也能续传）
  const idxSha = await createBlob(env, utf8ToBase64(JSON.stringify(index, null, 2)));
  treeEntries.push({ path: env.INDEX_PATH, mode: "100644", type: "blob", sha: idxSha });

  const treeR = await ghFetch(env, `/git/trees`, "POST", {
    base_tree: baseTreeSha,
    tree: treeEntries,
  });
  if (!treeR.ok) throw new Error(`建树失败: ${treeR.status}`);
  const treeSha = (await treeR.json()).sha;

  const commitR = await ghFetch(env, `/git/commits`, "POST", {
    message: `chore: 自动导入 ${treeEntries.length - 1} 条抖音视频 (via douyin-ingest)`,
    tree: treeSha,
    parents: [baseCommitSha],
  });
  if (!commitR.ok) throw new Error(`建提交失败: ${commitR.status}`);
  const newCommit = (await commitR.json()).sha;

  // force:false → 若期间分支被别人（或上一次重试）推动，会非快进失败，安全不覆盖
  const refR = await ghFetch(env, `/git/refs/heads/${env.BRANCH}`, "PATCH", {
    sha: newCommit,
    force: false,
  });
  if (!refR.ok) throw new Error(`更新分支失败: ${refR.status}`);
  return newCommit;
}

async function processAll(env, toProcess, index) {
  const { date } = todayStamp();
  const refR = await ghFetch(env, `/git/refs/heads/${env.BRANCH}`);
  if (!refR.ok) throw new Error(`读分支失败: ${refR.status}`);
  let baseSha = (await refR.json()).object.sha;
  let done = 0;
  for (let i = 0; i < toProcess.length; i += CHUNK) {
    const chunk = toProcess.slice(i, i + CHUNK);
    baseSha = await processChunk(env, chunk, index, baseSha, date);
    done += chunk.length;
    console.log(`[douyin-ingest] 进度 ${done}/${toProcess.length}`);
  }
  console.log(`[douyin-ingest] 完成，共导入 ${Object.keys(index).length} 条索引`);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors() });
    }
    if (url.pathname === "/ingest" && request.method === "POST") {
      try {
        const body = await request.json();
        const entries = body.entries || [];
        if (!Array.isArray(entries) || entries.length === 0) {
          return new Response(JSON.stringify({ created: 0, skipped: 0, error: "空列表" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...cors() },
          });
        }

        const index = await getIndex(env);

        // 先去重：已在索引里的 + 非法 id 都算 skipped
        const toProcess = [];
        let skipped = 0;
        for (const e of entries) {
          const vid = String(e.id || "").match(/\d{15,}/)?.[0];
          if (!vid || index[vid]) {
            skipped++;
            continue;
          }
          toProcess.push(e);
        }

        if (toProcess.length === 0) {
          return new Response(JSON.stringify({ created: 0, skipped }), {
            headers: { "Content-Type": "application/json", ...cors() },
          });
        }

        // 立刻回 202，重活在后台跑；书签不会因等待而超时
        ctx.waitUntil(
          processAll(env, toProcess, index).catch((err) => {
            console.error("[douyin-ingest] 后台导入失败:", err.message);
          })
        );

        return new Response(
          JSON.stringify({
            queued: toProcess.length,
            skipped,
            message: "已接收，正在后台分批导入，约 1-3 分钟后刷新站点查看",
          }),
          { status: 202, headers: { "Content-Type": "application/json", ...cors() } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ created: 0, skipped: 0, error: String(err.message || err) }),
          { status: 500, headers: { "Content-Type": "application/json", ...cors() } }
        );
      }
    }
    return new Response("marginalia-douyin-ingest alive", {
      headers: { "Content-Type": "text/plain" },
    });
  },
};
