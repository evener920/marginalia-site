#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""给已有视频批量补封面。

输入一份映射：douyin_id -> 封面直链（JSON 字典，或 TSV：id\turl）。
封面下载到 assets/img/covers/<douyin_id>.jpg，并在对应 _videos/*.md 的
front matter 里写入 `poster: /assets/img/covers/<id>.jpg`（已有 poster 则跳过，除非 --force）。

映射通常由浏览器（已登录态）抓取抖音收藏/视频页得到，因为服务端无法直连抖音。

用法：
    python3 tools/fetch_covers.py covers.json [--dry-run] [--force]
    python3 tools/fetch_covers.py covers.tsv [--dry-run] [--force]
"""
import sys
import os
import re
import json
import urllib.request

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEOS_DIR = os.path.join(REPO_ROOT, "_videos")
COVERS_DIR = os.path.join(REPO_ROOT, "assets", "img", "covers")
UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"


def load_map(path):
    if path.endswith(".json"):
        return json.load(open(path, encoding="utf-8"))
    # TSV（tab）或书签导出的「id|url」（竖线）均支持
    m = {}
    for ln in open(path, encoding="utf-8"):
        ln = ln.strip()
        if not ln or ln.startswith("#"):
            continue
        parts = re.split(r"[|\t]", ln, maxsplit=1)
        if len(parts) >= 2:
            m[parts[0].strip()] = parts[1].strip()
    return m


def find_md(vid):
    for fn in os.listdir(VIDEOS_DIR):
        if not fn.endswith(".md"):
            continue
        try:
            txt = open(os.path.join(VIDEOS_DIR, fn), encoding="utf-8").read(400)
        except Exception:
            continue
        if re.search(r"douyin_id:\s*" + re.escape(vid) + r"\b", txt):
            return os.path.join(VIDEOS_DIR, fn)
    return None


def has_poster(md):
    txt = open(md, encoding="utf-8").read()
    # 非注释的 poster: 行
    return re.search(r"(?m)^(?!#)\s*poster:\s*\S", txt) is not None


def add_poster(md, rel):
    txt = open(md, encoding="utf-8").read()
    # 插在 douyin_id: 行之后
    txt2 = re.sub(
        r"(?m)^(douyin_id:\s*\d+\s*)$",
        lambda m: m.group(1) + f"\nposter: {rel}",
        txt,
        count=1,
    )
    if txt2 == txt:  # 没匹配到就追加到 front matter 末尾（--- 前一行）
        txt2 = re.sub(r"(?m)(\n---\n)", f"\nposter: {rel}\n\\1", txt, count=1)
    open(md, "w", encoding="utf-8").write(txt2)


def download(vid, url):
    if url.startswith("//"):
        url = "https:" + url
    os.makedirs(COVERS_DIR, exist_ok=True)
    dest = os.path.join(COVERS_DIR, f"{vid}.jpg")
    req = urllib.request.Request(
        url, headers={"User-Agent": UA, "Referer": "https://www.douyin.com/"}
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r, open(dest, "wb") as f:
            f.write(r.read())
        return True
    except Exception as e:
        print(f"  ! 下载失败 {vid}: {e}")
        if os.path.exists(dest):
            try:
                os.remove(dest)
            except Exception:
                pass
        return False


def main():
    args = sys.argv[1:]
    if not args:
        print("用法: fetch_covers.py <covers.json|covers.tsv> [--dry-run] [--force]")
        sys.exit(1)
    mapping = load_map(args[0])
    dry = "--dry-run" in args
    force = "--force" in args
    print(f"映射条目: {len(mapping)}")

    done = skip = fail = 0
    for vid, url in mapping.items():
        md = find_md(vid)
        if not md:
            print(f"  ? 找不到 douyin_id={vid} 对应的 md，跳过")
            fail += 1
            continue
        if has_poster(md) and not force:
            skip += 1
            continue
        rel = f"/assets/img/covers/{vid}.jpg"
        if dry:
            print(f"  + 将补封面: {vid}  <-  {url[:60]}...")
            done += 1
            continue
        if download(vid, url):
            add_poster(md, rel)
            print(f"  ✓ 封面已补: {vid}")
            done += 1
        else:
            fail += 1
    print(f"\n完成：补封面 {done}，跳过(已有) {skip}，失败 {fail}")


if __name__ == "__main__":
    main()
