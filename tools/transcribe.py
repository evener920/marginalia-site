#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把抖音视频/音频转写成文字稿（语音转文字）。

流程：用 imageio-ffmpeg 把任意媒体抽成 16k 单声道 PCM → numpy 数组
→ faster-whisper 转写（彻底绕开 PyAV 的版本坑）。产出：
  - assets/transcripts/<id>.vtt   字幕文件（可挂播放器）
  - assets/transcripts/<id>.txt   纯文本文稿
并把这两者回写到对应 _videos/<slug>.md：
  - front matter 加 `transcript: /assets/transcripts/<id>.vtt`
  - 正文插入 <details class="transcript"> 可折叠文稿（无需 JS 即可读）

用法：
  python3 tools/transcribe.py <媒体文件> [--id 数字ID] [--model medium] [--no-patch]
  python3 tools/transcribe.py --id 6998446604684414222   # 仅重跑已落盘媒体的页（不推荐）

说明：
  - 模型默认 medium（中文效果好）；可用 --model small 提速、large-v3 提精度。
  - 首次运行会自动从 HuggingFace 下载模型权重（约 1.5GB for medium）。
"""
import sys
import os
import re
import subprocess
import datetime
import shutil

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEOS_DIR = os.path.join(REPO_ROOT, "_videos")
TRANS_DIR = os.path.join(REPO_ROOT, "assets", "transcripts")


def ffmpeg_exe():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        exe = shutil.which("ffmpeg")
        if exe:
            return exe
    raise RuntimeError("找不到 ffmpeg（imageio-ffmpeg 或系统 PATH 均无）")


def load_audio(media_path):
    """用 ffmpeg 把任意媒体抽成 16k 单声道 float32 numpy 数组（秒数×采样率）。"""
    import numpy as np
    ff = ffmpeg_exe()
    proc = subprocess.run(
        [ff, "-i", media_path, "-vn", "-ac", "1", "-ar", "16000",
         "-f", "s16le", "-loglevel", "error", "-"],
        capture_output=True,
    )
    if proc.returncode != 0 or not proc.stdout:
        raise RuntimeError("ffmpeg 抽音频失败: " + proc.stderr.decode("utf-8", "ignore")[:500])
    pcm = np.frombuffer(proc.stdout, dtype=np.int16).astype(np.float32) / 32768.0
    return pcm


def fmt_ts(sec):
    """秒 → HH:MM:SS.mmm（WebVTT 用）"""
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


_MODEL_CACHE = {}


def get_model(model_size="medium"):
    """按模型名缓存，批量转写时只加载一次（避免每个视频重载 1.5GB 权重）。"""
    if model_size not in _MODEL_CACHE:
        from faster_whisper import WhisperModel
        _MODEL_CACHE[model_size] = WhisperModel(model_size, device="cpu", compute_type="int8")
    return _MODEL_CACHE[model_size]


def transcribe(pcm, model_size="medium", language="zh"):
    model = get_model(model_size)
    segments, info = model.transcribe(
        pcm, language=language, beam_size=5,
        vad_filter=True, vad_parameters=dict(min_silence_duration_ms=500),
    )
    segs = []
    for s in segments:
        segs.append({"start": s.start, "end": s.end, "text": s.text.strip()})
    full = "".join(s["text"] for s in segs)
    return segs, full, info


def write_outputs(vid, segs, full):
    os.makedirs(TRANS_DIR, exist_ok=True)
    vtt_path = os.path.join(TRANS_DIR, f"{vid}.vtt")
    txt_path = os.path.join(TRANS_DIR, f"{vid}.txt")
    with open(vtt_path, "w", encoding="utf-8") as f:
        f.write("WEBVTT\n\n")
        for i, s in enumerate(segs, 1):
            f.write(f"{fmt_ts(s['start'])} --> {fmt_ts(s['end'])}\n{s['text']}\n\n")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(full + "\n")
    return vtt_path, txt_path


def find_md_by_id(vid):
    if not os.path.isdir(VIDEOS_DIR):
        return None
    for fn in os.listdir(VIDEOS_DIR):
        if not fn.endswith(".md") or fn == "_TEMPLATE.md":
            continue
        try:
            txt = open(os.path.join(VIDEOS_DIR, fn), encoding="utf-8").read(400)
        except Exception:
            continue
        if re.search(rf"douyin_id:\s*{re.escape(vid)}\b", txt):
            return os.path.join(VIDEOS_DIR, fn)
    return None


def patch_md(md_path, vid):
    """在视频页 front matter 加 transcript 字段，正文插入可折叠文稿。"""
    rel = f"/assets/transcripts/{vid}"
    txt_path = os.path.join(TRANS_DIR, f"{vid}.txt")
    if not os.path.exists(txt_path):
        return False
    text = open(txt_path, encoding="utf-8").read().strip()
    raw = open(md_path, encoding="utf-8").read()

    # 1) front matter: 加/改 transcript 字段
    if re.search(r"^transcript:\s*\S+", raw, re.M):
        raw = re.sub(r"^transcript:\s*\S+", f"transcript: {rel}.vtt", raw, flags=re.M)
    else:
        raw = re.sub(r"^(layout:\s*video\s*\n)",
                     r"\1transcript: " + rel + ".vtt\n", raw, count=1, flags=re.M)

    # 2) 正文: 用占位注释包住旧文稿，整体替换（幂等）
    block = (
        "\n<!-- transcript:start -->\n"
        "<details class=\"transcript\"><summary>字幕 / 文稿</summary>\n"
        "<div class=\"transcript-text\">\n\n"
        + text + "\n\n</div>\n"
        "</details>\n"
        "<!-- transcript:end -->\n"
    )
    if "<!-- transcript:start -->" in raw:
        raw = re.sub(r"<!-- transcript:start -->.*?<!-- transcript:end -->",
                     block.strip(), raw, flags=re.S)
    else:
        # 去掉结尾可能的空行后追加
        raw = raw.rstrip() + "\n" + block

    open(md_path, "w", encoding="utf-8").write(raw)
    return True


def main():
    args = sys.argv[1:]
    media = next((a for a in args if not a.startswith("--") and os.path.exists(a)), None)
    id_hint = None
    model = "medium"
    no_patch = "--no-patch" in args
    for i, a in enumerate(args):
        if a == "--id" and i + 1 < len(args):
            id_hint = args[i + 1]
        elif a == "--model" and i + 1 < len(args):
            model = args[i + 1]

    if not media:
        print("用法: transcribe.py <媒体文件> [--id ID] [--model medium] [--no-patch]")
        sys.exit(1)

    # 推断 id：显式 > 文件名数字
    vid = id_hint
    if not vid:
        m = re.search(r"(\d{15,})", os.path.basename(media))
        if m:
            vid = m.group(1)
    if not vid:
        vid = "local-" + datetime.datetime.now().strftime("%Y%m%d%H%M%S")

    print(f"加载音频: {media}")
    pcm = load_audio(media)
    print(f"音频采样: {pcm.shape[0]} 点 @16k；模型={model}（首次会下载权重）")
    segs, full, info = transcribe(pcm, model)
    print(f"识别语言: {info.language} (p={info.language_probability:.2f})；段落数: {len(segs)}")
    vtt, txt = write_outputs(vid, segs, full)
    print(f"✓ 字幕: {os.path.relpath(vtt, REPO_ROOT)}")
    print(f"✓ 文稿: {os.path.relpath(txt, REPO_ROOT)}  ({len(full)} 字)")

    if not no_patch:
        md = find_md_by_id(vid) if vid.startswith("local-") is False else None
        if not md and not vid.startswith("local-"):
            md = find_md_by_id(vid)
        if md:
            patch_md(md, vid)
            print(f"✓ 已回写视频页: {os.path.relpath(md, REPO_ROOT)}")
        else:
            print("（未找到对应 _videos/*.md，跳过回写；如需可手动指定）")


if __name__ == "__main__":
    main()
