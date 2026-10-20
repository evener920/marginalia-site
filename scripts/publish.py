#!/usr/bin/env python3
"""publish.py — convert a plain Markdown file into a Marginalia Jekyll post.

Usage:
    scripts/publish.py <src.md> [src2.md ...] [options]

What it does for each input file:
  1. Reads the file. Extracts the first H1 (`# ...`) as the post title.
  2. Extracts the leading blockquote (consecutive `> ...` lines after the H1)
     as the description, unless --description is given.
  3. Computes a slug from the source filename (or --slug).
  4. Computes a date from the source file's mtime, set to 12:00 +0800 so the
     UTC date matches (or --date).
  5. Writes _posts/<YYYY-MM-DD>-<slug>.md with proper YAML front matter,
     stripped of the now-redundant H1 and blockquote.
  6. git add + git commit (signed) + git push, unless --no-push.

Examples:
    scripts/publish.py ../report/foo.md \\
        --tags claude,llm --keywords "Claude, agents, MCP"

    scripts/publish.py ../report/*.md --no-push

Run from anywhere — the script locates the repo via its own path.
"""
from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = REPO_ROOT / "_posts"

H1_RE = re.compile(r"^#\s+(.+?)\s*$", re.M)
SLUG_CLEAN_RE = re.compile(r"[^a-z0-9]+")


def slugify(name: str) -> str:
    s = name.lower()
    s = SLUG_CLEAN_RE.sub("-", s).strip("-")
    return s or "untitled"


def extract_title_and_strip(text: str) -> tuple[str, str]:
    m = H1_RE.search(text)
    if not m:
        raise ValueError("no top-level H1 (`# title`) found in source")
    title = m.group(1).strip()
    body = text[: m.start()] + text[m.end() :]
    return title, body.lstrip("\n")


def extract_blockquote_and_strip(text: str) -> tuple[str, str]:
    lines = text.split("\n")
    i = 0
    while i < len(lines) and lines[i].strip() == "":
        i += 1
    if i >= len(lines) or not lines[i].lstrip().startswith(">"):
        return "", text
    quote_lines = []
    start = i
    while i < len(lines) and (lines[i].lstrip().startswith(">") or lines[i].strip() == ""):
        if lines[i].lstrip().startswith(">"):
            quote_lines.append(re.sub(r"^\s*>\s?", "", lines[i]))
        else:
            if not quote_lines:
                break
            lookahead = i + 1
            while lookahead < len(lines) and lines[lookahead].strip() == "":
                lookahead += 1
            if lookahead < len(lines) and lines[lookahead].lstrip().startswith(">"):
                quote_lines.append("")
                i = lookahead
                continue
            else:
                break
        i += 1
    if not quote_lines:
        return "", text
    description = " ".join(s.strip() for s in quote_lines if s.strip())
    rest_start = i
    new_body = "\n".join(lines[:start] + lines[rest_start:]).lstrip("\n")
    return description, new_body


def first_paragraph(text: str, limit: int = 200) -> str:
    for chunk in re.split(r"\n\s*\n", text.strip()):
        chunk = chunk.strip()
        if not chunk or chunk.startswith(("#", "---", "```", "|", ">")):
            continue
        chunk = re.sub(r"\s+", " ", chunk)
        return chunk[:limit].rstrip()
    return ""


def shorten(s: str, n: int) -> str:
    s = s.strip()
    if len(s) <= n:
        return s
    cut = s[:n]
    for sep in ["。", "；", "，", "、", " "]:
        idx = cut.rfind(sep)
        if idx > n * 0.6:
            return cut[: idx + 1].rstrip("，、 ；")
    return cut + "…"


def yaml_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def build_front_matter(meta: dict) -> str:
    lines = ["---"]
    for k, v in meta.items():
        if v is None or v == "":
            continue
        if isinstance(v, list):
            inner = ", ".join(v)
            lines.append(f"{k}: [{inner}]")
        else:
            lines.append(f'{k}: "{yaml_escape(str(v))}"')
    lines.append("---\n")
    return "\n".join(lines)


def run(cmd: list[str], cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=cwd or REPO_ROOT, check=check, text=True, capture_output=True)


def convert_file(src: Path, args) -> Path | None:
    if not src.is_file():
        print(f"!! {src}: not a file", file=sys.stderr)
        return None

    raw = src.read_text(encoding="utf-8")
    title, body = extract_title_and_strip(raw)

    if args.description:
        description = args.description
        _, body_after_quote = extract_blockquote_and_strip(body)
        if args.strip_blockquote:
            body = body_after_quote
    else:
        description, body = extract_blockquote_and_strip(body)
        if not description:
            description = first_paragraph(body, limit=200)

    description = description.strip()
    excerpt = args.excerpt or shorten(description, 120)

    # A markdown report typically starts: H1, blockquote, ---, H2 ...
    # After we strip the H1 and (optionally) the blockquote, an orphan
    # horizontal rule may remain at the very top. Drop it so the post body
    # doesn't render with a leading <hr>.
    body = re.sub(r"\A\s*-{3,}\s*\n", "", body, count=1).lstrip("\n")

    slug = args.slug or slugify(src.stem)
    # source filenames often already carry a date prefix; the target filename
    # re-adds post_date, so strip it here to avoid YYYY-MM-DD-YYYY-MM-DD-slug
    slug = re.sub(r"^\d{4}-\d{2}-\d{2}-", "", slug)
    if args.date:
        date_str = args.date if " " in args.date else f"{args.date} 12:00:00 +0800"
        post_date = args.date.split()[0] if " " in args.date else args.date
    else:
        mtime = datetime.fromtimestamp(src.stat().st_mtime)
        post_date = mtime.strftime("%Y-%m-%d")
        date_str = f"{post_date} 12:00:00 +0800"

    target = POSTS_DIR / f"{post_date}-{slug}.md"
    if target.exists() and not args.force:
        print(f"== {target.relative_to(REPO_ROOT)} already exists, skip (use --force to overwrite)")
        return None

    meta = {
        "layout": "post",
        "title": title,
        "date": date_str,
        "author": "Marginalia",
        "description": description,
        "excerpt": excerpt,
    }
    if args.category:
        meta["category"] = args.category
    if args.tags:
        meta["tags"] = [t.strip() for t in args.tags.split(",") if t.strip()]
    if args.keywords:
        meta["keywords"] = args.keywords

    # cover: first site-hosted image in the body (markdown image, <video poster>
    # or <img>); used by the home post list as a thumbnail
    m = (re.search(r"!\[[^\]]*\]\(([^)\s]+)\)", body)
         or re.search(r'poster="([^"]+)"', body)
         or re.search(r'<img[^>]+src="([^"]+)"', body))
    if m:
        cover = m.group(1)
        # Keep accepting legacy drafts generated before the custom-domain move.
        if cover.startswith("/marginalia/"):
            cover = cover[len("/marginalia"):]
        if cover.startswith("/assets/"):
            meta["cover"] = cover

    front = build_front_matter(meta)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(front + "\n" + body.lstrip("\n"), encoding="utf-8")

    print(f"++ wrote {target.relative_to(REPO_ROOT)}")
    print(f"   title:       {title}")
    print(f"   description: {shorten(description, 90)}")
    print(f"   tags:        {meta.get('tags', [])}")
    return target


def git_publish(targets: list[Path], message: str, push: bool) -> None:
    rels = [str(t.relative_to(REPO_ROOT)) for t in targets]
    run(["git", "add", *rels])
    status = run(["git", "diff", "--cached", "--name-only"]).stdout.strip()
    if not status:
        print("== no staged changes, nothing to commit")
        return
    run(["git", "commit", "-q", "-m", message])
    sha = run(["git", "rev-parse", "--short", "HEAD"]).stdout.strip()
    print(f"++ committed {sha}: {message}")
    if push:
        env = os.environ.copy()
        token_path = Path.home() / ".config/gh/org_pyf-labrary.token"
        if "GH_TOKEN" not in env and token_path.exists():
            env["GH_TOKEN"] = token_path.read_text().strip()
        out = subprocess.run(
            ["git", "push"],
            cwd=REPO_ROOT,
            env=env,
            capture_output=True,
            text=True,
        )
        if out.returncode != 0:
            print("!! push failed:")
            print(out.stderr)
            sys.exit(1)
        print(f"++ pushed to {out.stderr.strip().splitlines()[-1] if out.stderr else 'remote'}")


def main():
    ap = argparse.ArgumentParser(description="Convert plain markdown into a Marginalia Jekyll post.")
    ap.add_argument("sources", nargs="+", type=Path, help="input .md file(s)")
    ap.add_argument("--tags", help='comma-separated tags, e.g. "claude,agents"')
    ap.add_argument("--category", default="",
                    help="研究报告分类 chip（/notes/ 筛选用）：'Claude · LLM' / 'Agent 工程' / "
                         "'AIGC 工艺' / '基础设施'")
    ap.add_argument("--keywords", help="free-form keywords meta for SEO")
    ap.add_argument("--description", help="override the auto-extracted description")
    ap.add_argument("--excerpt", help="override the auto-derived excerpt")
    ap.add_argument("--slug", help="override the slug (default: source filename stem)")
    ap.add_argument("--date", help='YYYY-MM-DD or "YYYY-MM-DD HH:MM:SS +0800"; default: file mtime')
    ap.add_argument("--strip-blockquote", action="store_true",
                    help="when --description is given, also strip the leading blockquote from body")
    ap.add_argument("--message", help="git commit message (default: derived from titles)")
    ap.add_argument("--no-push", action="store_true", help="commit but do not push")
    ap.add_argument("--no-commit", action="store_true", help="write files only; no git ops")
    ap.add_argument("--force", action="store_true", help="overwrite existing target file")
    args = ap.parse_args()

    targets: list[Path] = []
    titles: list[str] = []
    for src in args.sources:
        try:
            t = convert_file(src.resolve(), args)
            if t:
                targets.append(t)
                titles.append(t.stem)
        except Exception as e:
            print(f"!! {src}: {e}", file=sys.stderr)

    if not targets:
        print("== nothing to publish")
        return

    if args.no_commit:
        print(f"\n== wrote {len(targets)} file(s); --no-commit, stopping here")
        return

    msg = args.message or f"post: publish {', '.join(titles)}"
    git_publish(targets, msg, push=not args.no_push)


if __name__ == "__main__":
    main()
