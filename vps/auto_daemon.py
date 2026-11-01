#!/usr/bin/env python3
"""常驻守护：抓取后自动出文字稿，零点击。

每 INTERVAL 秒一轮：
  1. 刷新 fav_order.json / douyin_index.json（GitHub raw，公开可读）
  2. 枚举 todo（在 douyin_index 全集中、本地无 transcripts/<id>.txt、未被永久跳过）
     → 并发转写；单条超时/失败累计 MAX_FAIL 次则写空稿永久跳过
  3. 对每个 transcripts/<id>.txt（非空、未发送）POST {id,file,text} 给 Worker /transcript
  4. ok/skipped 记入 sent.json（幂等），pending/出错留待下轮重试

注意：todo 取 douyin_index 全集（站点在册全部视频），不取 fav_order（仅书签同步
过的子集，历史上会漏掉大量条目，导致进度分母偏小、部分视频永远不转写）。

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
WORKER_REPORT = "https://marginalia-douyin-ingest.evener920.workers.dev/skip-report"
TOKEN_FILE = pathlib.Path(f"{API_ROOT}/transcript_token.txt")
FAV = pathlib.Path(f"{API_ROOT}/fav_order.json")
INDEX = pathlib.Path(f"{API_ROOT}/douyin_index.json")
SENT = pathlib.Path(f"{API_ROOT}/sent_transcripts.json")
SKIP = pathlib.Path(f"{API_ROOT}/skipped_transcripts.json")
FAILS = pathlib.Path(f"{API_ROOT}/transcribe_fails.json")
INTERVAL = 40
SEND_WORKERS = 5
TRANSCRIBE_WORKERS = 5
# 转写节奏控制。超长视频（数十小时）下载+ASR 会拖垮整轮，所以：
#   BATCH_SIZE    每轮最多处理多少条（其余下一轮继续，避免单轮无限拉长）
#   ROUND_BUDGET  本轮转写阶段的时间窗（秒），到点未完成的一律计一次失败
#   MAX_FAIL      同一条累计失败 N 次即写空稿永久跳过，不再占主循环
BATCH_SIZE = 25
ROUND_BUDGET = 600
MAX_FAIL = 2
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


def report_status(transcribed, skipped, token):
    """把「已转写 / 永久跳过」数上报给 Worker，供站点 /stats 如实标注不可自动转写数。

    仅在数值变化时才上报，避免每轮空打 Worker。
    """
    try:
        url = f"{WORKER_REPORT}?t={token}"
        st, resp = http_post_json(url, {"transcribed": transcribed, "skipped": skipped})
        log(f"上报进度：已转写 {transcribed} · 跳过 {skipped} -> http{st}")
    except Exception as e:
        log(f"上报进度失败: {e}")


def run_transcribe(todo, fails, skip):
    """并发转写；本轮时间窗内未完成的计一次失败，累计 MAX_FAIL 次写空稿永久跳过。

    线程池用 shutdown(wait=False, cancel_futures=True) 而非 with：卡住的超长视频线程
    无法被 Python 强杀，若等待 join 会重新阻塞主循环。未启动的任务取消，已启动的
    留在后台自生自灭（进程常驻，泄漏线程数有限）。
    """
    batch = todo[:BATCH_SIZE]
    ex = concurrent.futures.ThreadPoolExecutor(max_workers=TRANSCRIBE_WORKERS)
    futs = {ex.submit(bt.transcribe_one, vid): vid for vid in batch}
    done, _ = concurrent.futures.wait(futs, timeout=ROUND_BUDGET)
    for f, vid in futs.items():
        if f not in done:
            log(f"  本轮时间窗({ROUND_BUDGET}s)内未完成: {vid}")
            fails[vid] = fails.get(vid, 0) + 1
            continue
        try:
            f.result(timeout=0)
        except Exception as e:
            log(f"  转写异常 {vid}: {e}")
            fails[vid] = fails.get(vid, 0) + 1
            continue
        # bt.transcribe_one 对下载失败/转写失败只写 transcripts/_log.jsonl、不抛异常，
        # 因此必须以「是否真的产出文稿文件」判定成败，否则失败条目会被误判成功而无限重试。
        if (bt.OUT / f"{vid}.txt").exists():
            fails.pop(vid, None)
        else:
            log(f"  未产出文稿: {vid}")
            fails[vid] = fails.get(vid, 0) + 1
    try:
        ex.shutdown(wait=False, cancel_futures=True)
    except TypeError:  # Python < 3.9 无 cancel_futures
        ex.shutdown(wait=False)

    newly = []
    for vid, n in list(fails.items()):
        if n >= MAX_FAIL and vid not in skip:
            (bt.OUT / f"{vid}.txt").write_text("", encoding="utf-8")
            skip.add(vid)
            newly.append(vid)
    if newly:
        log(f"永久跳过（超时/失败 {MAX_FAIL} 次）{len(newly)} 条: {newly}")


def loop_once(token):
    refresh()
    fav = load_json(FAV, {})
    idx = load_json(INDEX, {})
    skip = set(load_json(SKIP, []))
    fails = load_json(FAILS, {})
    # todo 取索引全集（含未进 fav_order 的历史条目），fav_order 仅用于排序权重
    order = {k: v for k, v in sorted(fav.items(), key=lambda kv: kv[1])}
    ids = sorted(set(idx) | set(fav), key=lambda i: order.get(i, 10**9))
    todo = [
        i for i in ids
        if i not in skip and not (bt.OUT / f"{i}.txt").exists()
    ]
    if todo:
        log(f"转写 todo={len(todo)}（在册 {len(ids)}）")
        run_transcribe(todo, fails, skip)

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
    json.dump(sorted(skip), open(SKIP, "w"), ensure_ascii=False)
    json.dump(fails, open(FAILS, "w"), ensure_ascii=False)
    log(f"本轮结束，已发送 {len(sent)} 条 · 永久跳过 {len(skip)} 条")
    # sent 含「成功转写」与「空文本永久跳过」两类；真实已转写 = 总数 − 跳过数
    return len(sent), len(skip)


def main():
    token = TOKEN_FILE.read_text().strip()
    if not token:
        log("缺少 transcript token，退出")
        raise SystemExit(1)
    last = None  # 仅当 (已转写, 跳过) 变化时才上报，避免每轮空打 Worker
    while True:
        try:
            sent_n, skip_n = loop_once(token)
            transcribed_n = sent_n - skip_n
            key = (transcribed_n, skip_n)
            if key != last:
                report_status(transcribed_n, skip_n, token)
                last = key
        except Exception as e:
            log(f"loop error: {e}")
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
