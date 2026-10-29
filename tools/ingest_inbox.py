#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 _inbox/ 里书签下载的视频批量转写并入库（本地运行，非云端 CI）。

书签会把 <id>.mp4 + <id>.json（标题/封面/链接）放进 _inbox/。本脚本：
  1. 抽音频 → faster-whisper 转写（中文） → assets/transcripts/<id>.vtt + .txt
  2. 若 _videos/ 已有该 douyin_id 的页 → 仅补 transcript 字段与文稿块
  3. 否则新建一篇 _videos/<slug>.md（标题/封面来自 json；封面下载到 assets/img/covers/）
  4. 媒体文件移出仓库到 ../_video_archive/（避免 git 膨胀）
  5. 可选 --push：自动 git add/commit/push，触发 Cloudflare Pages 上线

注意：转写依赖本机 ffmpeg + faster-whisper 模型，GitHub Actions 云端没有，
      故本脚本只能在本机跑（双击 tools/一键转写入库.command）。

用法：
  python3 tools/ingest_inbox.py [--inbox _inbox] [--model medium] [--keep] [--push] [--dry-run]
  --inbox DIR  指定收件箱目录（默认仓库内 _inbox/）
  --keep       不移动/删除 _inbox 里的媒体文件
  --push       处理完自动 git 提交并推送（触发线上构建）
  --dry-run    只预览将处理哪些文件，不转写/不改动
"""
import sys
import os
import re
import json
import shutil
import datetime
import subprocess

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO_ROOT, "tools"))
import transcribe
import import_douyin

VIDEOS_DIR = os.path.join(REPO_ROOT, "_videos")
INBOX_DIR = os.path.join(REPO_ROOT, "_inbox")
ARCHIVE_DIR = os.path.join(REPO_ROOT, "..", "_video_archive")
MEDIA_EXT = (".mp4", ".mov", ".m4a", ".webm", ".mp3", ".mkv", ".flv")


def discover(inbox_dir):
    """返回 [(media_path, id, json_path)] 列表。"""
    items = []
    if not os.path.isdir(inbox_dir):
        return items
    for fn in sorted(os.listdir(inbox_dir)):
        low = fn.lower()
        if not low.endswith(MEDIA_EXT):
            continue
        media = os.path.join(inbox_dir, fn)
        m = re.search(r"(\d{15,})", fn)
        vid = m.group(1) if m else None
        jp = os.path.join(inbox_dir, re.sub(r"\.[^.]+$", ".json", fn))
        jpath = jp if os.path.exists(jp) else None
        items.append((media, vid, jpath))
    return items


def collect_from_downloads(inbox_dir):
    """兜底：_inbox 为空时，从 ~/Downloads 收集书签下载的「纯数字 ID 命名」媒体。

    只复制（不删/不移动用户下载目录原件），且文件名必须形如 <15位以上ID>.<视频扩展名>，
    与书签导出命名一致，避免误收用户其它文件。返回复制到 _inbox 的文件数。
    """
    dl = os.path.join(os.path.expanduser("~"), "Downloads")
    if not os.path.isdir(dl):
        return 0
    os.makedirs(inbox_dir, exist_ok=True)
    picked = []
    for fn in sorted(os.listdir(dl)):
        if not re.match(r"^\d{15,}\.(mp4|mov|m4a|webm|mp3|mkv|flv)$", fn, re.I):
            continue
        picked.append(fn)
    if not picked:
        return 0
    print(f"从下载目录找到 {len(picked)} 个书签视频，复制到收件箱（下载目录原件保留）：")
    n = 0
    for fn in picked:
        src = os.path.join(dl, fn)
        dst = os.path.join(inbox_dir, fn)
        if os.path.exists(dst):
            continue
        shutil.copy2(src, dst)
        json_src = os.path.join(dl, re.sub(r"\.[^.]+$", ".json", fn))
        if os.path.exists(json_src):
            shutil.copy2(json_src, os.path.join(inbox_dir, os.path.basename(json_src)))
        print(f"  + {fn}")
        n += 1
    return n


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


def git_push():
    """自动提交并推送转写产物，触发 Cloudflare Pages 构建。"""
    def run(*args):
        return subprocess.run(args, cwd=REPO_ROOT, capture_output=True, text=True)
    run("git", "add", "-A", "_videos", "assets/transcripts", "assets/img/covers")
    diff = run("git", "diff", "--cached", "--quiet")
    if diff.returncode == 0:
        print("（无新变更，跳过提交）")
        return True
    c = run("git", "commit", "-m", "chore(ingest): 语音转写入库")
    if c.returncode != 0:
        print("! git commit 失败:", (c.stderr or c.stdout)[-300:])
        return False
    p = run("git", "push")
    if p.returncode != 0:
        print("! git push 失败:", (p.stderr or p.stdout)[-300:])
        return False
    print("✓ 已提交并推送，Cloudflare Pages 将自动构建上线")
    return True


def main():
    args = sys.argv[1:]
    inbox = next((a for a in args if not a.startswith("--")), INBOX_DIR)
    model = "medium"
    keep = "--keep" in args
    dry = "--dry-run" in args
    push = "--push" in args
    for i, a in enumerate(args):
        if a == "--inbox" and i + 1 < len(args):
            inbox = args[i + 1]
        elif a == "--model" and i + 1 < len(args):
            model = args[i + 1]

    # 未显式指定 --inbox 且默认收件箱为空时，自动从下载目录收集书签视频
    explicit_inbox = any(a == "--inbox" for a in args)
    if not explicit_inbox and not discover(inbox):
        collect_from_downloads(inbox)

    items = discover(inbox)
    if not items:
        print(f"收件箱里没有待处理视频：{inbox}")
        print("把书签下载的 <ID>.mp4 和 <ID>.json 放进该目录后再运行。")
        return
    print(f"待处理 {len(items)} 个视频（目录：{inbox}）")
    if dry:
        for media, vid, jpath in items:
            print(f"  - {os.path.basename(media)}  id={vid}  json={'有' if jpath else '无'}")
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
        try:
            pcm = transcribe.load_audio(media)
            segs, full, info = transcribe.transcribe(pcm, model)
        except Exception as e:
            print(f"  ✗ 转写失败: {e}")
            failed += 1
            continue
        transcribe.write_outputs(vid, segs, full)
        rel = f"/assets/transcripts/{vid}.vtt"
        print(f"  ✓ 转写 {len(segs)} 段 / {len(full)} 字；语言 {info.language}")

        md = transcribe.find_md_by_id(vid)
        if md:
            transcribe.patch_md(md, vid)
            print(f"  ✓ 已补文稿到现有页: {os.path.relpath(md, REPO_ROOT)}")
        else:
            title = (meta.get("title") or "").strip() or f"抖音视频 {vid}"
            poster_field = ""
            cover = meta.get("cover")
            if cover:
                local = import_douyin.download_cover(vid, cover)
                if local:
                    poster_field = f"poster: {local}\n"
            md = make_md(vid, title, "", poster_field, rel)
            transcribe.patch_md(md, vid)
            print(f"  ✓ 新建视频页: {os.path.relpath(md, REPO_ROOT)}")

        if not keep:
            try:
                shutil.move(media, os.path.join(ARCHIVE_DIR, os.path.basename(media)))
                if jpath:
                    shutil.move(jpath, os.path.join(ARCHIVE_DIR, os.path.basename(jpath)))
                print(f"  → 媒体已归档到 {os.path.relpath(ARCHIVE_DIR, REPO_ROOT)}/")
            except Exception as e:
                print(f"  ! 归档失败（不影响入库）: {e}")
        done += 1

    print(f"\n完成：入库 {done}，失败 {failed}。")
    if push and done > 0:
        git_push()
    elif not push:
        print("（未加 --push，产物在本地，需手动提交；加 --push 可自动上线）")


if __name__ == "__main__":
    main()
