#!/usr/bin/env python3
"""话题热度聚类：扫近 30 天 AI 晨报，抽取话题实体、按时间衰减打分，
写 _data/hot_topics.json 供 /ai-hot/ 页静态渲染热度榜。

聚类口径（确定性，无 LLM、零成本）：
- 话题 = 故事标题（H3）里的实体短语
  * Latin：大写开头 token 连串（含版本号），如 "Claude Fable 5" / "Gemini 3.5 Flash"
  * 中文：维护一个公司/概念小词典
- 热度 = Σ 每次提及的时间权重（线性衰减：(31 - 距今天数) / 31）
- 门槛：≥2 次提及且跨 ≥2 天才算"话题"（单日单条只是新闻不是话题）
- 锚点：链到当天文章的所属板块 H2（板块 id 稳定；H3 的 kramdown 自动 id
  对中文不可靠，不用）

用法：python3 scripts/hot-topics.py [--days 30] [--top 12]
日更管线（ai-morning-post publish_marginalia）在发文后调它并一起 commit。
"""
from __future__ import annotations

import argparse
import json
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POSTS = ROOT / "_posts"
OUT = ROOT / "_data" / "hot_topics.json"

# Latin 实体短语：大写开头 token，后续可接大写 token 或版本号 token
LATIN = re.compile(
    r"\b[A-Z][A-Za-z0-9.+\-]*(?:[ ][A-Z][A-Za-z0-9.+\-]*|[ ]\d[\w.\-]*)*"
)
# 中文实体词典（公司 / 产品 / 概念）。命中即计一次。
ZH_ENTITIES = [
    "阿里巴巴", "阿里", "百度", "字节跳动", "字节", "腾讯", "华为", "小米",
    "智谱", "月之暗面", "面壁智能", "讯飞", "美团", "快手", "商汤",
    "零一万物", "阶跃星辰", "深度求索", "马斯克", "具身智能", "世界模型",
    "人形机器人", "自动驾驶", "算力", "芯片", "开源模型", "智能体",
]
# 单 token 太泛的词不算话题
STOP = {
    "AI", "LLM", "LLMs", "API", "APIs", "GPU", "GPUs", "CPU", "CEO", "CTO",
    "CFO", "IPO", "App", "Apps", "Web", "Pro", "Max", "Mini", "Plus",
    "Ultra", "Lite", "Beta", "Alpha", "New", "Top", "Open", "Code", "Chat",
    "Bot", "Dev", "Labs", "Lab", "Inc", "The", "Token", "Tokens", "A", "B", "C", "D", "I",
    "II", "III", "X", "V", "R", "S", "K", "M", "N", "Q", "T", "U",
}
# 大小写/别名归并
ALIAS = {
    "OPENAI": "OpenAI", "DEEPSEEK": "DeepSeek", "DEEPMIND": "DeepMind",
    "阿里巴巴": "阿里", "字节跳动": "字节", "深度求索": "DeepSeek",
    "智能体": "Agent", "AGENTS": "Agent", "AI Agent": "Agent",
}

FM_DATE = re.compile(
    r'^date:\s*"?(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})\s*([+-]\d{2}):?(\d{2})"?'
)
H2_ID = re.compile(r'<h2\s+id="([^"]+)"')
H3 = re.compile(r"^###\s+(.+)$")


def utc_url_date(f: Path, text: str) -> str:
    """Jekyll（site timezone=UTC，与 GH Pages 一致）的 date-based permalink
    用 front matter date 折算到 UTC 的日期——晨报 06:00+0800 → 前一天。
    解析失败就退回文件名日期。"""
    for line in text.splitlines()[:15]:
        m = FM_DATE.match(line.strip())
        if m:
            dt = datetime.fromisoformat(f"{m.group(1)}T{m.group(2)}{m.group(3)}:{m.group(4)}")
            return dt.astimezone(timezone.utc).date().isoformat()
    return f.name[:10]


def canon(name: str) -> str:
    name = name.strip().strip("·:：，,。.&")
    return ALIAS.get(name.upper(), ALIAS.get(name, name))


def extract_entities(title: str) -> set[str]:
    found = set()
    for m in LATIN.finditer(title):
        phrase = m.group(0).strip()
        # 去掉短语首尾的泛词；全泛词短语丢弃
        tokens = phrase.split(" ")
        while tokens and tokens[0] in STOP:
            tokens = tokens[1:]
        while tokens and tokens[-1] in STOP:
            tokens = tokens[:-1]
        if not tokens:
            continue
        phrase = " ".join(tokens)
        if len(phrase) < 2 or phrase in STOP:
            continue
        found.add(canon(phrase))
    for ent in ZH_ENTITIES:
        if ent in title:
            found.add(canon(ent))
    return found


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=30)
    ap.add_argument("--top", type=int, default=15)
    args = ap.parse_args()

    dailies = sorted(POSTS.glob("*-ai-morning-post.md"))
    if not dailies:
        raise SystemExit("no ai-morning-post posts found")

    # 以最新一期为"今天"，避免管线时差导致空窗
    latest = max(d.name[:10] for d in dailies)
    today = date.fromisoformat(latest)
    cutoff = today - timedelta(days=args.days - 1)

    topics: dict[str, dict] = {}
    for f in dailies:
        d = date.fromisoformat(f.name[:10])
        if d < cutoff:
            continue
        days_ago = (today - d).days
        weight = (args.days + 1 - days_ago) / (args.days + 1)
        text = f.read_text(encoding="utf-8")
        url = f"/posts/{utc_url_date(f, text)}-ai-morning-post/"
        section = ""
        for line in text.splitlines():
            m = H2_ID.search(line)
            if m:
                section = m.group(1)
                continue
            m = H3.match(line)
            if not m:
                continue
            title = m.group(1).strip()
            for ent in extract_entities(title):
                t = topics.setdefault(ent, {"score": 0.0, "links": {}})
                t["score"] += weight
                # 同一天同话题只留第一条链接（榜单直达即可）
                t["links"].setdefault(d.isoformat(), {
                    "date": d.isoformat(),
                    "url": url + (f"#{section}" if section else ""),
                    "title": title,
                })

    rows = []
    for name, t in topics.items():
        links = sorted(t["links"].values(), key=lambda x: x["date"], reverse=True)
        mentions = len(t["links"])  # 计天（同天多条算一次曝光日）
        if mentions < 2:
            continue
        rows.append({
            "name": name,
            "score": round(t["score"], 2),
            "days": mentions,
            "latest": links[0],
            "links": links[:8],
        })
    rows.sort(key=lambda r: (-r["score"], -r["days"], r["name"]))
    rows = rows[: args.top]

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps({
        "generated": today.isoformat(),
        "window_days": args.days,
        "topics": rows,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"hot-topics: {len(rows)} topics (window {cutoff} ~ {today}) → {OUT.relative_to(ROOT)}")
    for i, r in enumerate(rows, 1):
        print(f"  {i:2d}. {r['name']:<28} score={r['score']:<6} days={r['days']}")


if __name__ == "__main__":
    main()
