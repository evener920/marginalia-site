#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""批量把抖音视频搬进 Marginalia 站点。

读取一个纯文本链接清单（每行一条；可选前缀 "标题 | "），把每条解析成
抖音数字视频 ID，并在 _videos/ 下生成一篇 Jekyll 视频条目。
（站点在构建期已能自动把短链/整条链接解析成数字 ID，这里直接存干净的数字 ID。）

清单格式（每行）：
    https://v.douyin.com/xxxx/                   # 纯短链
    https://www.douyin.com/video/123456          # 完整链接
    我的标题 | https://v.douyin.com/xxxx/         # 标题 + 链接

用法：
    python3 tools/import_douyin.py [清单.txt] [--dry-run]

不传清单路径时默认读 douyin-import.txt。
--dry-run 只打印将要创建的文件，不真正写入。
"""
import sys
import os
import re
import datetime
import urllib.request

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEOS_DIR = os.path.join(REPO_ROOT, "_videos")
COVERS_DIR = os.path.join(REPO_ROOT, "assets", "img", "covers")
UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"


def fetch_final_url(url):
    """跟随重定向，返回最终 URL。"""
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.geturl()
    except Exception:
        return url


def extract_id(url):
    m = re.search(r"video/(\d+)", url)
    if m:
        return m.group(1)
    return None


def resolve_id(raw):
    raw = raw.strip()
    if re.fullmatch(r"\d{15,}", raw):
        return raw
    if "v.douyin.com" in raw or "douyin.com/share" in raw:
        return extract_id(fetch_final_url(raw)) or extract_id(raw)
    return extract_id(raw)


def slugify(title):
    # 旧版只去掉 \ / : * ? " < > | # 与空白，全角标点（，？！《》· 等）仍残留，
    # 而 Cloudflare Pages 无法路由含全角标点的路径，会回退到首页（SPA fallback）。
    # 改为白名单：仅保留 CJK、字母、数字、下划线，其余（含全角/半角标点、空格）统一替换为 -。
    import unicodedata
    s = unicodedata.normalize("NFC", title)
    s = re.sub(r"[^\w\u3400-\u9fff\uf900-\ufaff]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s[:60] or "douyin-video"


def existing_ids():
    """扫描 _videos 下已存在的 douyin_id，用于按视频去重。"""
    ids = set()
    if not os.path.isdir(VIDEOS_DIR):
        return ids
    for fn in os.listdir(VIDEOS_DIR):
        if not fn.endswith(".md"):
            continue
        try:
            txt = open(os.path.join(VIDEOS_DIR, fn), encoding="utf-8").read(400)
        except Exception:
            continue
        m = re.search(r"douyin_id:\s*(\d{15,})", txt)
        if m:
            ids.add(m.group(1))
    return ids


def download_cover(vid, url):
    """把封面图下载到 assets/img/covers/<vid>.jpg，返回站点相对路径；失败返回 None。"""
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
        return f"/assets/img/covers/{vid}.jpg"
    except Exception as e:
        print(f"  ! 封面下载失败 ({vid}): {e}")
        if os.path.exists(dest):
            try:
                os.remove(dest)
            except Exception:
                pass
        return None


def main():
    args = sys.argv[1:]
    list_file = next((a for a in args if not a.startswith("--")), "douyin-import.txt")
    dry = "--dry-run" in args

    if not os.path.exists(list_file):
        print(f"清单文件不存在: {list_file}")
        sys.exit(1)

    os.makedirs(VIDEOS_DIR, exist_ok=True)
    tz8 = datetime.timezone(datetime.timedelta(hours=8))
    now = datetime.datetime.now(tz8)
    date_str = now.strftime("%Y-%m-%d %H:%M:%S +08:00")
    seen = existing_ids()

    created = skipped = failed = 0
    for line in open(list_file, encoding="utf-8"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        # 字段：标题 | 链接 | 封面直链（后两者可选）
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 3:
            title, url, cover = parts[0], parts[1], parts[2]
        elif len(parts) == 2:
            title, url, cover = parts[0], parts[1], ""
        else:
            title, url, cover = "", parts[0], ""

        vid = resolve_id(url)
        if not vid:
            print(f"  ✗ 无法解析: {url}")
            failed += 1
            continue

        if vid in seen:
            print(f"  • 该视频已存在，跳过: {vid}")
            skipped += 1
            continue

        if not title:
            title = f"抖音视频 {vid}"

        slug = slugify(title)
        fname = f"{now.strftime('%Y-%m-%d')}-{slug}.md"
        fpath = os.path.join(VIDEOS_DIR, fname)

        # 下载封面（若有），存到 assets/img/covers/<vid>.jpg
        poster_field = ""
        if cover and not dry:
            local = download_cover(vid, cover)
            if local:
                poster_field = f"poster: {local}\n"
        elif cover and dry:
            poster_field = f"# poster: /assets/img/covers/{vid}.jpg  (dry-run，未下载)\n"

        content = (
            f"---\n"
            f"layout: video\n"
            f"title: {title}\n"
            f"date: {date_str}\n"
            f"douyin_id: {vid}\n"
            f"{poster_field}"
            f"---\n\n"
            f"（正文可选：可在此写几句推荐语、金句摘录等。）\n"
        )

        if dry:
            print(f"  + 将创建: {fname}  (id={vid})")
        else:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"  ✓ 创建: {fname}  (id={vid})")
        created += 1

    print(f"\n完成：新建 {created}，跳过 {skipped}，失败 {failed}")


if __name__ == "__main__":
    main()
