#!/usr/bin/env python3
"""Publish a weekly AI video to Bilibili and wire it into Marginalia.

Usage:
    publish-video.py <build-dir>            # dry-run, prints upload args
    publish-video.py <build-dir> --upload   # actually upload to B 站
    publish-video.py <build-dir> --upload --no-purge   # keep local mp4 in repo

`<build-dir>` example: ~/claw/video/ai-weekly-2026-05-05

What it does
  1. Reads script.json + (if present) existing _videos/<slug>.md front-matter
  2. Picks the final mp4 from <build-dir>/out (largest -final.mp4 wins)
  3. Builds biliup args (title, desc, tag, cover, tid)
  4. Dry-run: prints command. Upload: runs biliup, parses BV id from output
  5. Rewrites _videos/<slug>.md front-matter: drops `video:`, adds `bvid:`
  6. Removes assets/videos/<slug>.mp4 (unless --no-purge); keeps poster jpg
"""
from __future__ import annotations

import argparse
import json
import re
import secrets
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
VIDEOS_DIR = REPO / "_videos"
ASSETS_VIDEOS = REPO / "assets" / "videos"
BILIUP = Path.home() / ".local" / "bin" / "biliup"
COOKIES = Path.home() / ".biliup" / "cookies.json"

# 知识 → 科学科普
DEFAULT_TID = 201
DEFAULT_TAGS = "AI,Claude,GPT,周报,LLM,Anthropic,OpenAI"


def slug_from_build_dir(build_dir: Path) -> str:
    # ai-weekly-2026-05-05 → 2026-05-05-ai-weekly-w<NN>
    m = re.match(r"ai-weekly-(\d{4}-\d{2}-\d{2})$", build_dir.name)
    if not m:
        sys.exit(f"build dir name not recognised: {build_dir.name}")
    date = m.group(1)
    # Prefer matching an existing post (slug uses "report-week" not ISO-week,
    # so we don't recompute it).
    existing = sorted(VIDEOS_DIR.glob(f"{date}-ai-weekly-w*.md"))
    if existing:
        return existing[0].stem
    iso_week = datetime.strptime(date, "%Y-%m-%d").isocalendar().week
    return f"{date}-ai-weekly-w{iso_week:02d}"


def find_final_mp4(build_dir: Path) -> Path:
    """Pick the newest mp4 in <build>/out — the Remotion render (largest, latest)."""
    out = build_dir / "out"
    candidates = sorted(out.glob("*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not candidates:
        # fall back to remotion's own out/
        candidates = sorted((build_dir / "remotion" / "out").glob("*.mp4"),
                            key=lambda p: p.stat().st_mtime, reverse=True)
    if not candidates:
        sys.exit(f"no mp4 found in {out}")
    return candidates[0]


def parse_frontmatter(md_path: Path) -> tuple[dict, str]:
    """Very small YAML-ish front-matter parser; preserves body verbatim."""
    text = md_path.read_text()
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---\n", 4)
    if end < 0:
        return {}, text
    fm_raw = text[4:end]
    body = text[end + 5 :]
    # We don't need to parse it deeply — we'll do textual edits.
    return {"_raw": fm_raw}, body


SUMMARY_HEADERS = ("## 本期速览", "## 速览", "## 本周速览")


def extract_summary_bullets(post_body: str) -> list[str]:
    """Pull the first ordered/unordered list under a `## 本期速览` heading."""
    lines = post_body.splitlines()
    in_section = False
    bullets: list[str] = []
    for ln in lines:
        s = ln.strip()
        if not in_section:
            if any(s.startswith(h) for h in SUMMARY_HEADERS):
                in_section = True
            continue
        if s.startswith("##"):
            break
        m = re.match(r"^(?:[-*+]\s+|\d+\.\s+)(.+)", s)
        if m:
            # drop bold/italic markers, keep content
            text = re.sub(r"\*\*(.+?)\*\*", r"\1", m.group(1))
            text = re.sub(r"[*_`]", "", text)
            bullets.append(text)
    return bullets


# B 站「简介」上限约 250 字；更关键的是 biliup 在 cookies 缺 buvid3 时会回落到
# **APP 投稿接口**，该接口会把超过 ~250 字的 desc 直接**清空发布**（前端预览仍显示，
# 但公开页 desc / desc_v2 为空）。所以这里给一个硬上限，确保简介一定发得出去；
# 完整速览与文字稿放 marginalia 文字稿页（desc 里留链接指过去）。
BILI_DESC_MAX = 240


def render_desc(script_json: dict, fm_lede: str | None, post_body: str, transcript_url: str | None = None) -> str:
    url = transcript_url or "https://jinzi.cyou/videos/"
    # URL 去掉 https:// 前缀更省字、且 B 站对裸链接更宽容
    url_text = re.sub(r"^https?://", "", url)
    tail = f"\n完整文字稿与来源：{url_text}"
    budget = BILI_DESC_MAX - len(tail)

    lede = (fm_lede or "").strip()
    if not lede:
        # 兜底：用首条速览
        bl = extract_summary_bullets(post_body)
        lede = bl[0] if bl else "本期 AI 周报。"
    if len(lede) > budget:
        lede = lede[: max(0, budget - 1)].rstrip("，。、；：— ") + "…"
    return (lede + tail).strip()


def build_biliup_args(
    *,
    video: Path,
    cover: Path | None,
    title: str,
    desc: str,
    tags: str,
    tid: int,
) -> list[str]:
    args = [
        str(BILIUP),
        "-u", str(COOKIES),
        "upload",
        "--copyright", "1",
        "--tid", str(tid),
        "--title", title,
        "--desc", desc,
        "--tag", tags,
        # `web` submit mode is materially more lenient than `client` for
        # unverified / low-trust accounts — fewer 601 风控 hits.
        "--submit", "web",
    ]
    if cover and cover.exists():
        args += ["--cover", str(cover)]
    args.append(str(video))
    return args


BV_RE = re.compile(r"BV[0-9A-Za-z]{10}")


def extract_bvid(stdout: str) -> str | None:
    matches = BV_RE.findall(stdout)
    return matches[-1] if matches else None


def update_post(md_path: Path, bvid: str) -> None:
    text = md_path.read_text()
    # Replace `video: /assets/videos/...mp4` with `bvid: BV...`
    new, n = re.subn(
        r"^video:\s*\S+\s*$",
        f"bvid: {bvid}",
        text,
        count=1,
        flags=re.MULTILINE,
    )
    if n == 0:
        # No existing video: line — inject after poster: line, or after `description:`
        anchor = re.search(r"^poster:.*$", text, flags=re.MULTILINE) or re.search(
            r"^description:.*$", text, flags=re.MULTILINE
        )
        if not anchor:
            sys.exit(f"can't find a place to insert bvid in {md_path}")
        new = text[: anchor.end()] + f"\nbvid: {bvid}" + text[anchor.end() :]
    md_path.write_text(new)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("build_dir", type=Path)
    ap.add_argument("--upload", action="store_true", help="actually upload (default: dry-run)")
    ap.add_argument("--no-purge", action="store_true", help="keep assets/videos/*.mp4")
    ap.add_argument("--tid", type=int, default=DEFAULT_TID)
    ap.add_argument("--tags", default=DEFAULT_TAGS)
    args = ap.parse_args()

    build_dir = args.build_dir.expanduser().resolve()
    if not build_dir.is_dir():
        sys.exit(f"not a dir: {build_dir}")

    slug = slug_from_build_dir(build_dir)
    md_path = VIDEOS_DIR / f"{slug}.md"
    if not md_path.exists():
        sys.exit(f"post not found: {md_path} (create it first or extend this script)")

    script_json = json.loads((build_dir / "script.json").read_text())
    video = find_final_mp4(build_dir)
    cover = ASSETS_VIDEOS / f"{slug}.jpg"
    if not cover.exists():
        cover = None

    # pull title + lede out of front-matter (fast textual grep), body for summary
    full_md = md_path.read_text()
    fm_text, _, post_body = full_md.partition("\n---\n")
    title_m = re.search(r'^title:\s*"?([^"\n]+)"?', fm_text, flags=re.MULTILINE)
    vol_m = re.search(r'^vol:\s*"?([^"\n]+)"?', fm_text, flags=re.MULTILINE)
    lede_m = re.search(r'^lede:\s*"?([^"\n]+)"?', fm_text, flags=re.MULTILINE)
    title_core = title_m.group(1).strip() if title_m else slug
    vol = vol_m.group(1).strip() if vol_m else ""
    bili_title = f"【AI 周报 W{slug.split('-w')[-1]}】{title_core}"[:80]
    transcript_url = f"https://jinzi.cyou/videos/{slug}/"
    desc = render_desc(script_json, lede_m.group(1).strip() if lede_m else None, post_body, transcript_url)

    cmd = build_biliup_args(
        video=video,
        cover=cover,
        title=bili_title,
        desc=desc,
        tags=args.tags,
        tid=args.tid,
    )

    print("=" * 60)
    print(f"slug:    {slug}")
    print(f"video:   {video}  ({video.stat().st_size // 1024 // 1024} MB)")
    print(f"cover:   {cover}")
    print(f"post:    {md_path}")
    print(f"title:   {bili_title}")
    print(f"tid:     {args.tid}  (知识/科学科普=201, 科技/计算机技术=188)")
    print(f"tags:    {args.tags}")
    print("desc:")
    for line in desc.splitlines():
        print(f"  {line}")
    print("-" * 60)
    print("biliup cmd:")
    print("  " + " ".join(repr(c) if " " in c or "\n" in c else c for c in cmd))
    print("=" * 60)

    if not args.upload:
        print("\n[DRY RUN] re-run with --upload to actually publish.")
        return 0

    # Hand B 站 a fresh-looking filename each upload to dodge dedup heuristics
    # that flag "重复内容" when the same basename appears across attempts.
    upload_alias = Path(tempfile.gettempdir()) / (
        f"ai-weekly-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        f"-{secrets.token_hex(3)}.mp4"
    )
    upload_alias.symlink_to(video.resolve())
    cmd = [c if c != str(video) else str(upload_alias) for c in cmd]
    print(f"\n>>> alias: {upload_alias.name}")
    print(">>> uploading to Bilibili (this can take a few minutes)...\n")
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True)
    finally:
        upload_alias.unlink(missing_ok=True)
    sys.stdout.write(proc.stdout)
    sys.stderr.write(proc.stderr)
    if proc.returncode != 0:
        sys.exit(f"\nbiliup failed (exit {proc.returncode})")

    bvid = extract_bvid(proc.stdout + "\n" + proc.stderr)
    if not bvid:
        print("\n!!! upload finished but BV id not found in output.")
        print("    Inspect output above and add bvid to the post manually.")
        return 1

    print(f"\n>>> uploaded as {bvid}")
    update_post(md_path, bvid)
    print(f">>> updated {md_path.relative_to(REPO)} (video → bvid)")

    if not args.no_purge:
        local_mp4 = ASSETS_VIDEOS / f"{slug}.mp4"
        if local_mp4.exists():
            local_mp4.unlink()
            print(f">>> removed {local_mp4.relative_to(REPO)}")

    print("\nDone. Review, then commit:")
    print(f"  cd {REPO} && git add -A && git status")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
