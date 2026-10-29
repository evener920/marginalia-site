#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 _inbox/ 里书签下载的视频批量转写并入库。

书签会把 <id>.mp4 + <id>.json（标题/封面/链接）放进 _inbox/。本脚本：
  1. 抽音频 → faster-whisper 转写（中文） → assets/transcripts/<id>.vtt + .txt
  2. 若 _videos/ 已有该 douyin_id 的页 → 仅补 transcript 字段与文稿块
  3. 否则新建一篇 _videos/<slug>.md（标题/封面来自 json；封面下载到 assets/img/covers/）
  4. 媒体文件移出仓库到 ../_video_archive/（避免 git 膨胀）

用法：
  python3 tools/ingest_inbox.py [--inbox _inbox] [--model medium] [--keep] [--dry-run]
  --keep  不移动/删除 _inbox 里的媒体文件
"""
import sys
import os
import re
import json
import glob
import shutil
import datetime

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO_ROOT, "tools"))
import transcribe
import import_douyin

VIDEOS_DIR = os.path.join(REPO_ROOT, "_videos")
INBOX_DIR = os.path.join(REPO_ROOT, "_inbox")
ARCHIVE_DIR = os.path.join(REPO_ROOT, "..", "_video_archive")
MEDIA_EXT = (".mp4", ".mov", ".m4a", ".webm", ".mp3", ".mkv", ".flv")


def discover():
    """返回 [(media_path, id, json_path)] 列表。"""
    items = []
    if not os.path.isdir(INBOX_DIR):
        return items
    for fn in sorted(os.listdir(INBOX_DIR)):
        low = fn.lower()
        if not low.endswith(MEDIA_EXT):
            continue
        media = os.path.join(INBOX_DIR, fn)
        m = re.search(r"(\d{15,})", fn)
        vid = m.group(1) if m else None
        jp = os.path.join(INBOX_DIR, re.sub(r"\.[^.]+$", ".json", fn))
        jpath = jp if os.path.exists(jp) else None
        items.append((media, vid, jpath))
    return items


def make_md(vid, title, url, poster_field, transcript_rel):
    tz8 = datetime.timezone(datetime.timedelta(hours=8))
    now = datetime.datetime.now(tz8)
    date_str = now.strftime("%Y-%m-%d %H:%M:%S +08:00")
    slug = import_douyin.slugify(title or f"抖音视频 {vid}")
    fname = f"{now.strftime('%Y-%m-%d')}-{slug}.md"
    content = (
        f"---\n"
        f"layout: video\n"
        f"title: {title or f'抖音视频 {vid}'}\n"
        f"date: {date_str}\n"
        f"douyin_id: {vid}\n"
        f"tags:\n  - douyin\n"
        f"{poster_field}"
        f"transcript: {transcript_rel}\n"
        f"---\n\n"
        f"> 由抖音视频自动导入，文稿经语音识别生成，可能含识别误差。\n"
    )
    fpath = os.path.join(VIDEOS_DIR, fname)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)
    return fpath


def main():
    args = sys.argv[1:]
    inbox = next((a for a in args if not a.startswith("--")), INBOX_DIR)
    model = "medium"
    keep = "--keep" in args
    dry = "--dry-run" in args
    for i, a in enumerate(args):
        if a == "--inbox" and i + 1 < len(args):
            inbox = args[i + 1]
        elif a == "--model" and i + 1 < len(args):
            model = args[i + 1]
    INBOX_DIR_local = inbox

    items = discover()
    if not items:
        print(f"_inbox/ 下没有待处理视频（{INBOX_DIR_local}）")
        return

    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    done = skipped = failed = 0
    for media, vid, jpath in items:
        meta = {}
        if jpath:
            try:
                meta = json.load(open(jpath, encoding="utf-8"))
            except Exception:
                meta = {}
        vid = vid or meta.get("id")
        if not vid:
            print(f"  ✗ 无法从文件名/JSON 解析视频 ID，跳过: {media}")
            failed += 1
            continue

        print(f"\n▶ 处理 {os.path.basename(media)}  (id={vid})")
        # 1) 转写
        try:
            pcm = transcribe.load_audio(media)
            segs, full, info = transcribe.transcribe(pcm, model)
        except Exception as e:
            print(f"  ✗ 转写失败: {e}")
            failed += 1
            continue
        vtt, txt = transcribe.write_outputs(vid, segs, full)
        rel = f"/assets/transcripts/{vid}.vtt"
        print(f"  ✓ 转写 {len(segs)} 段 / {len(full)} 字；语言 {info.language}")

        # 2) 找/建视频页
        md = transcribe.find_md_by_id(vid)
        if md:
            transcribe.patch_md(md, vid)
            print(f"  ✓ 已补文稿到现有页: {os.path.relpath(md, REPO_ROOT)}")
        else:
            title = (meta.get("title") or "").strip() or f"抖音视频 {vid}"
            url = meta.get("url") or f"https://www.douyin.com/video/{vid}"
            poster_field = ""
            cover = meta.get("cover")
            if cover:
                local = import_douyin.download_cover(vid, cover)
                if local:
                    poster_field = f"poster: {local}\n"
            md = make_md(vid, title, url, poster_field, rel)
            # 再把文稿块补进新建的页
            transcribe.patch_md(md, vid)
            print(f"  ✓ 新建视频页: {os.path.relpath(md, REPO_ROOT)}")

        # 3) 归档媒体（默认移出仓库，避免 git 膨胀）
        if not keep:
            try:
                shutil.move(media, os.path.join(ARCHIVE_DIR, os.path.basename(media)))
                if jpath:
                    shutil.move(jpath, os.path.join(ARCHIVE_DIR, os.path.basename(jpath)))
                print(f"  → 媒体已归档到 {os.path.relpath(ARCHIVE_DIR, REPO_ROOT)}/")
            except Exception as e:
                print(f"  ! 归档失败（不影响入库）: {e}")
        done += 1

    print(f"\n完成：入库 {done}，失败 {failed}。待提交。")


if __name__ == "__main__":
    main()
