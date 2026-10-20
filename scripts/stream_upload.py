#!/usr/bin/env python3
"""Upload a local video to Cloudflare Stream and print ready-to-paste Markdown.

Self-hosted video pipeline for Marginalia (replaces the old Bilibili-only flow).
Uses the Cloudflare Stream *direct upload* (TUS) API — no third-party deps,
only the Python standard library.

Usage
-----
    # dry-run: show the API call + what would be printed
    stream_upload.py VIDEO.mp4 --dry-run

    # real upload; prints the Stream UID (stream_id)
    stream_upload.py VIDEO.mp4

    # upload AND inject `stream_id:` into an existing post, drop the old `video:`
    stream_upload.py VIDEO.mp4 --post _videos/2026-10-20-my-video.md

Environment
-----------
    CF_ACCOUNT_ID   Cloudflare account ID (Required)
    CF_API_TOKEN    API token with **Stream:Edit** permission (Required)

After upload, write the front matter like:

    ---
    layout: video
    title: "……"
    vol: "……"
    date: 2026-10-20 16:30:00 +0800
    description: "……"
    lede: "……"
    poster: /assets/videos/2026-10-20-my-video.jpg   # optional, your own jpg
    stream_id: <UID returned by this script>
    duration: "12:30"
    tags: [video, …]
    ---

The video layout (`_layouts/video.html`) prefers `stream_id`, then `bvid`
(Bilibili fallback), then a self-hosted `video:` mp4 — so old posts keep working.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

API_BASE = "https://api.cloudflare.com/client/v4/accounts"
CHUNK = 20 * 1024 * 1024  # 20 MB TUS chunks


def env_or_die(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        sys.exit(f"[stream_upload] missing env var: {name}")
    return val


def api_request(method: str, url: str, token: str, body: dict | None = None,
                headers: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        sys.exit(f"[stream_upload] HTTP {e.code} {method} {url}\n{detail}")
    if not payload.get("success"):
        sys.exit(f"[stream_upload] API error: {payload.get('errors')}")
    return payload


def create_direct_upload(account: str, token: str, max_duration: int) -> tuple[str, str]:
    url = f"{API_BASE}/{account}/stream/direct_upload"
    body = {"maxDurationSeconds": max_duration}
    res = api_request("POST", url, token, body=body)
    r = res["result"]
    return r["uploadURL"], r["uid"]


def tus_upload(upload_url: str, file_path: Path) -> None:
    """PATCH the file to the TUS endpoint in CHUNK-sized pieces."""
    size = file_path.stat().st_size
    offset = 0
    with open(file_path, "rb") as f:
        while offset < size:
            chunk = f.read(CHUNK)
            if not chunk:
                break
            req = urllib.request.Request(upload_url, data=chunk, method="PATCH")
            req.add_header("Tus-Resumable", "1.0.0")
            req.add_header("Upload-Offset", str(offset))
            req.add_header("Upload-Length", str(size))
            req.add_header("Content-Type", "application/offset+octet-stream")
            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    new_offset = int(resp.headers.get("Upload-Offset", offset + len(chunk)))
            except urllib.error.HTTPError as e:
                sys.exit(f"[stream_upload] TUS PATCH failed {e.code}: {e.read().decode(errors='replace')}")
            offset = new_offset
            pct = offset * 100 // size if size else 100
            print(f"  uploaded {offset // 1024 // 1024} MB ({pct}%)", flush=True)
    if offset != size:
        sys.exit(f"[stream_upload] upload incomplete: {offset}/{size}")


def poll_ready(account: str, token: str, uid: str, timeout: int = 180) -> str:
    """Wait for Cloudflare to finish transcoding; return the playback status."""
    url = f"{API_BASE}/{account}/stream/{uid}"
    deadline = time.time() + timeout
    while time.time() < deadline:
        res = api_request("GET", url, token)
        status = res["result"].get("status", {})
        state = status.get("state") if isinstance(status, dict) else status
        if state in ("ready", "published"):
            return state
        if state in ("error", "failed"):
            return state
        time.sleep(5)
    return "pending"


def inject_stream_id(post_path: Path, uid: str) -> None:
    text = post_path.read_text()
    if not text.startswith("---\n"):
        sys.exit(f"[stream_upload] {post_path} has no front matter")
    end = text.find("\n---\n", 4)
    if end < 0:
        sys.exit(f"[stream_upload] can't find front-matter end in {post_path}")
    fm = text[4:end]
    # drop old self-hosted `video:` line (superseded by Stream)
    fm = re.sub(r"^video:\s*\S+\s*$", "", fm, flags=re.MULTILINE)
    fm = fm.rstrip("\n") + f"\nstream_id: {uid}\n"
    post_path.write_text(text[:4] + fm + text[end:])
    print(f">>> injected stream_id into {post_path}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("video", type=Path, help="local .mp4 to upload")
    ap.add_argument("--post", type=Path, default=None,
                    help="existing _videos/<slug>.md to inject stream_id into")
    ap.add_argument("--max-duration", type=int, default=3600,
                    help="max video length in seconds (default 3600)")
    ap.add_argument("--dry-run", action="store_true", help="print plan, do not upload")
    args = ap.parse_args()

    video = args.video.expanduser().resolve()
    if not video.is_file():
        sys.exit(f"not a file: {video}")

    account = env_or_die("CF_ACCOUNT_ID")
    token = env_or_die("CF_API_TOKEN")

    print("=" * 60)
    print(f"file:   {video}  ({video.stat().st_size // 1024 // 1024} MB)")
    print(f"account: {account}")
    print(f"maxDurationSeconds: {args.max_duration}")
    print("=" * 60)

    if args.dry_run:
        print("\n[DRY RUN] would create a Stream direct-upload session and TUS-PATCH the file.")
        print("Set CF_ACCOUNT_ID + CF_API_TOKEN and drop --dry-run to actually upload.")
        return 0

    print("\n>>> creating Stream direct-upload session …")
    upload_url, uid = create_direct_upload(account, token, args.max_duration)
    print(f">>> uid = {uid}")
    print(">>> uploading (TUS) …")
    tus_upload(upload_url, video)

    state = poll_ready(account, token, uid)
    print(f">>> transcoding state: {state}")

    print("\n--- paste this into the post front matter ---")
    print(f"stream_id: {uid}")
    print("---------------------------------------------\n")

    if args.post:
        inject_stream_id(args.post.expanduser().resolve(), uid)
        print("Done. Review, then commit:")
        print("  git add -A && git status")
    else:
        print("Tip: re-run with --post _videos/<slug>.md to auto-inject stream_id.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
