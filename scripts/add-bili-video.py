#!/usr/bin/env python3
"""Scaffold a Marginalia video post from a Bilibili video (no re-upload).

Use this to "照搬" a B 站 video: given its BV id, fetch title/duration/cover
and generate `_videos/<slug>.md` wired with `bvid:`. The video layout renders
a Bilibili iframe — no file hosting needed.

Usage
-----
    python3 add-bili-video.py --bvid BV1xx411c7mD --slug 2026-10-20-my-clip
    python3 add-bili-video.py --bvid BV1xx411c7mD --slug 2026-10-20-my-clip \
        --transcript my-clip.md --date 2026-10-20 --tags "video,AI,短片"

Network is best-effort: if the B 站 API is unreachable, it falls back to
placeholders you can fill in by hand.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from datetime import date as date_cls
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
VIDEOS_DIR = REPO / "_videos"
ASSETS_VIDEOS = REPO / "assets" / "videos"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")


def fetch_view(bvid: str) -> dict | None:
    url = f"https://api.bilibili.com/x/web-interface/view?bvid={bvid}"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://www.bilibili.com/"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode())
    except Exception as e:  # noqa: BLE001
        print(f"[warn] B 站 API 拉取失败：{e}")
        return None
    if data.get("code") != 0:
        print(f"[warn] B 站返回 code={data.get('code')}：{data.get('message')}")
        return None
    return data.get("data", {})


def download_cover(pic_url: str, slug: str) -> str | None:
    if not pic_url:
        return None
    pic_url = pic_url.split("@")[0]
    dest = ASSETS_VIDEOS / f"{slug}.jpg"
    ASSETS_VIDEOS.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(pic_url, headers={"User-Agent": UA, "Referer": "https://www.bilibili.com/"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r, open(dest, "wb") as f:
            f.write(r.read())
        return f"/assets/videos/{slug}.jpg"
    except Exception as e:  # noqa: BLE001
        print(f"[warn] 封面下载失败：{e}")
        return None


def fmt_duration(sec: int) -> str:
    sec = int(sec or 0)
    h, rem = divmod(sec, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bvid", required=True, help="B 站 BV 号，如 BV1xx411c7mD（也接受完整链接）")
    ap.add_argument("--slug", required=True, help="_videos/<slug>.md 的文件名（不含 .md）")
    ap.add_argument("--transcript", type=Path, default=None, help="正文 markdown 文件路径")
    ap.add_argument("--date", default=date_cls.today().isoformat(), help="发布日期 YYYY-MM-DD")
    ap.add_argument("--tags", default="video,bilibili", help="逗号分隔的标签")
    args = ap.parse_args()

    bvid = args.bvid.strip()
    if not bvid.upper().startswith("BV"):
        m = re.search(r"BV[0-9A-Za-z]{10}", bvid)  # accept full URL
        if not m:
            sys.exit("无法从输入解析出 BV 号")
        bvid = m.group(0)

    view = fetch_view(bvid)
    title = (view.get("title") if view else "") or "请填写标题"
    duration = fmt_duration(view.get("duration")) if view else "00:00"
    poster = download_cover(view.get("pic"), args.slug) if view else None

    body = ""
    if args.transcript and args.transcript.exists():
        body = args.transcript.read_text().strip() + "\n"

    tag_list = ", ".join(t.strip() for t in args.tags.split(",") if t.strip())
    fm = [
        "---",
        "layout: video",
        f'title: "{title}"',
        'vol: "B 站 · 照搬"',
        f"date: {args.date} 16:30:00 +0800",
        'description: "请填写一句话摘要（进搜索与 SEO）"',
        f"poster: {poster or '/assets/videos/%s.jpg' % args.slug}",
        f"bvid: {bvid}",
        f'duration: "{duration}"',
        f"tags: [{tag_list}]",
        "---",
        "",
    ]
    out = VIDEOS_DIR / f"{args.slug}.md"
    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(fm) + "\n" + body)
    print(f">>> 已生成 {out.relative_to(REPO)}")
    print(f"    bvid={bvid}  title={title!r}  duration={duration}  poster={poster}")
    print("    如标题/时长是占位，请手改；加正文后 git add + commit 即可上线。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
