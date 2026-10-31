#!/usr/bin/env python3
"""常驻守护：抓取后自动出文字稿，零点击。

每 INTERVAL 秒一轮：
  1. 刷新 fav_order.json / douyin_index.json（GitHub raw，公开可读）
  2. 枚举 todo（在 fav_order 但本地无 transcripts/<id>.txt）→ 并发转写
  3. 对每个 transcripts/<id>.txt（非空、未发送）POST {id,file,text} 给 Worker /transcript
  4. ok/skipped 记入 sent.json（幂等），pending/出错留待下轮重试

复用 batch_transcribe 的转写引擎（transcribe_one / API / KEY / OUT）。
"""
import json
import time
import pathlib
import datetime
import urllib.request
import urllib.error
import concurrent.futures

import batch_transcribe as bt

API_ROOT = "/opt/douyin-api"
RAW = "https://raw.githubusercontent.com/evener920/marginalia-site/main"
WORKER = "https://marginalia-douyin-ingest.evener920.workers.dev/transcript"
TOKEN_FILE = pathlib.Path(f"{API_ROOT}/transcript_token.txt")
FAV = pathlib.Path(f"{API_ROOT}/fav_order.json")
INDEX = pathlib.Path(f"{API_ROOT}/douyin_index.json")
SENT = pathlib.Path(f"{API_ROOT}/sent_transcripts.json")
INTERVAL = 40
SEND_WORKERS = 5
# Cloudflare 会拦截 Python-urllib 默认 UA（403/1010），必须用浏览器 UA 打 Worker。
UA = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
}


def log(msg):
    print(f"[{datetime.datetime.now():%Y-%m-%d %H:%M:%S}] {msg}", flush=True)


def load_json(p, default):
    try:
        return json.load(open(p))
    except Exception:
        return default


def refresh():
    for name, url in [
        ("fav_order.json", f"{RAW}/_data/douyin_fav_order.json"),
        ("douyin_index.json", f"{RAW}/data/douyin_index.json"),
    ]:
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                open(f"{API_ROOT}/{name}", "wb").write(r.read())
        except Exception as e:
            log(f"refresh {name} 失败: {e}")


def http_post_json(url, body, timeout=30):
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", **UA},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, json.load(r)


def send_one(args):
    vid, fname, text, token = args
    if not fname:
        return vid, "nopending"  # 索引里还没有文件名，下轮再试
    url = f"{WORKER}?t={token}"
    try:
        st, resp = http_post_json(url, {"id": vid, "file": fname, "text": text})
        return vid, resp.get("status", f"http{st}")
    except Exception as e:
        return vid, f"err:{e}"


def loop_once(token):
    refresh()
    fav = load_json(FAV, {})
    idx = load_json(INDEX, {})
    ids = [k for k, _ in sorted(fav.items(), key=lambda kv: kv[1])]
    todo = [i for i in ids if not (bt.OUT / f"{i}.txt").exists()]
    if todo:
        log(f"转写 todo={len(todo)}")
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
            list(ex.map(bt.transcribe_one, todo))

    sent = set(load_json(SENT, []))
    jobs = []
    for p in bt.OUT.glob("*.txt"):
        vid = p.stem
        if vid in sent:
            continue
        text = p.read_text(encoding="utf-8").strip()
        if not text:
            sent.add(vid)  # 空文本（视频无音轨/已失效）永久跳过
            continue
        jobs.append((vid, idx.get(vid), text, token))

    if jobs:
        log(f"回填 jobs={len(jobs)}")
        with concurrent.futures.ThreadPoolExecutor(max_workers=SEND_WORKERS) as ex:
            for vid, status in ex.map(send_one, jobs):
                if status in ("ok", "skipped"):
                    sent.add(vid)
                else:
                    log(f"  {vid} -> {status} (留待下轮)")
    json.dump(sorted(sent), open(SENT, "w"), ensure_ascii=False)
    log(f"本轮结束，已发送 {len(sent)} 条")


def main():
    token = TOKEN_FILE.read_text().strip()
    if not token:
        log("缺少 transcript token，退出")
        raise SystemExit(1)
    while True:
        try:
            loop_once(token)
        except Exception as e:
            log(f"loop error: {e}")
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
