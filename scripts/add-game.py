#!/usr/bin/env python3
"""add-game.py — drop a self-contained HTML game into the Marginalia gallery.

Usage:
    scripts/add-game.py <path/to/game-folder> [options]

What it does:
  1. Copies the source folder into marginalia/games/<slug>/.
  2. Parses index.html for <title> and <meta name="description">.
  3. Captures a cover screenshot via headless Chromium (Playwright); if that
     fails, falls back to a generated SVG poster.
  4. Writes _games/<slug>.md describing the entry (consumed by games.md).
  5. git add + commit + push (unless --no-push / --no-commit).

Drop-in workflow:
    scripts/add-game.py ~/claw/game/mario
    scripts/add-game.py ~/claw/game/* --no-push     # batch import

Options:
    --slug <slug>          override the slug (default: source dir name)
    --title <title>        override the auto-extracted title
    --description <desc>   override the auto-extracted description
    --cover <path>         use this image file as cover instead of capturing
    --shot-delay <secs>    wait N seconds before screenshot (default 2.0)
    --shot-wait-selector <css>  wait for this element before shooting
    --no-shot              skip Playwright; force SVG poster fallback
    --force                overwrite existing target
    --no-push / --no-commit
"""
from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
GAMES_DIR = REPO_ROOT / "games"
COLLECTION_DIR = REPO_ROOT / "_games"
COVER_DIR = REPO_ROOT / "assets" / "img" / "games"

SLUG_CLEAN_RE = re.compile(r"[^a-z0-9]+")


# ---------- helpers ----------------------------------------------------------

def slugify(name: str) -> str:
    s = name.lower()
    s = SLUG_CLEAN_RE.sub("-", s).strip("-")
    return s or "game"


def yaml_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def run(cmd: list[str], cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=cwd or REPO_ROOT, check=check, text=True, capture_output=True)


# ---------- index.html parsing ----------------------------------------------

class _MetaExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title: str | None = None
        self.description: str | None = None
        self._in_title = False
        self._title_buf: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "title":
            self._in_title = True
        elif tag == "meta":
            d = {k.lower(): (v or "") for k, v in attrs}
            name = d.get("name", "").lower()
            prop = d.get("property", "").lower()
            if not self.description and name == "description":
                self.description = d.get("content", "").strip() or None
            if not self.description and prop == "og:description":
                self.description = d.get("content", "").strip() or None

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
            t = "".join(self._title_buf).strip()
            if t:
                self.title = t

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self._title_buf.append(data)


def extract_meta(index_html: Path) -> tuple[str, str]:
    raw = index_html.read_text(encoding="utf-8", errors="replace")
    p = _MetaExtractor()
    p.feed(raw)
    title = (p.title or index_html.parent.name).strip()
    # Some games use "Game - Subtitle" — keep it as-is; user can override.
    description = (p.description or "").strip()
    return title, description


# ---------- cover ------------------------------------------------------------

def capture_screenshot(index_html: Path, out_path: Path, *, delay: float, wait_selector: str | None) -> bool:
    """Try to screenshot the game's start page. Returns True on success."""
    try:
        from playwright.sync_api import sync_playwright  # type: ignore
    except ImportError:
        print("!! playwright not installed; skipping screenshot")
        return False

    url = index_html.resolve().as_uri()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            ctx = browser.new_context(viewport={"width": 1600, "height": 1000}, device_scale_factor=2)
            page = ctx.new_page()
            page.goto(url, wait_until="load", timeout=20000)
            if wait_selector:
                try:
                    page.wait_for_selector(wait_selector, timeout=8000)
                except Exception:
                    pass
            # Let intro animations settle
            page.wait_for_timeout(int(delay * 1000))
            out_path.parent.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(out_path), full_page=False, type="jpeg", quality=88)
            browser.close()
        return out_path.exists() and out_path.stat().st_size > 4096
    except Exception as e:
        print(f"!! screenshot failed: {e}")
        return False


# Curated palette — every game gets a different one deterministically by slug.
_PALETTES = [
    ("#1a1410", "#e8c789", "#8b2e2a"),  # paper-noir
    ("#0a0e27", "#7ee7ff", "#ff5da2"),  # neon-cyber
    ("#101820", "#ffb84d", "#f5f5f5"),  # ember
    ("#1b1f3a", "#d4af37", "#c2185b"),  # gilded-bordeaux
    ("#0d1f1a", "#a8e6cf", "#ff8b94"),  # forest
    ("#1c1c2e", "#f8f3e6", "#6c5ce7"),  # bauhaus
    ("#000814", "#ffd60a", "#003566"),  # blueprint
    ("#1a0a0a", "#ff6b35", "#f7c59f"),  # pulp
]


def palette_for(slug: str) -> tuple[str, str, str]:
    return _PALETTES[sum(ord(c) for c in slug) % len(_PALETTES)]


def write_svg_poster(out_path: Path, title: str, slug: str, subtitle: str = "") -> None:
    bg, fg, accent = palette_for(slug)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    safe_title = (title or slug).replace("&", "&amp;").replace("<", "&lt;")
    safe_sub = (subtitle or slug).replace("&", "&amp;").replace("<", "&lt;")
    # Compose: bold typographic poster, big slug as background watermark, title on top.
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{bg}"/>
      <stop offset="1" stop-color="{accent}" stop-opacity="0.55"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="{fg}" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1600" height="1000" fill="url(#g)"/>
  <rect width="1600" height="1000" fill="url(#grid)"/>
  <text x="80" y="900" font-family="Georgia, 'Songti SC', serif" font-size="640"
        font-weight="900" fill="{fg}" fill-opacity="0.07" letter-spacing="-30">{slug[:1].upper()}</text>
  <g font-family="Georgia, 'Songti SC', serif" fill="{fg}">
    <text x="80" y="200" font-size="28" letter-spacing="8" fill-opacity="0.6">¶ MARGINALIA · GAMES</text>
    <text x="80" y="540" font-size="156" font-weight="700" letter-spacing="-3">{safe_title}</text>
    <line x1="80" y1="600" x2="280" y2="600" stroke="{accent}" stroke-width="6"/>
    <text x="80" y="680" font-size="36" fill-opacity="0.7" font-style="italic">{safe_sub}</text>
  </g>
</svg>
"""
    out_path.write_text(svg, encoding="utf-8")


# ---------- main op ----------------------------------------------------------

def add_game(src: Path, args) -> Path | None:
    if not src.is_dir():
        print(f"!! {src}: not a directory")
        return None
    index = src / "index.html"
    if not index.is_file():
        print(f"!! {src}: missing index.html")
        return None

    slug = args.slug or slugify(src.name)
    target_dir = GAMES_DIR / slug
    if target_dir.exists():
        if not args.force:
            print(f"== games/{slug}/ already exists, skip (use --force)")
            return None
        shutil.rmtree(target_dir)

    title_raw, description = extract_meta(index)
    title = args.title or title_raw
    description = args.description or description

    # 1. Copy game tree
    shutil.copytree(src, target_dir, ignore=shutil.ignore_patterns(
        ".git", ".DS_Store", "node_modules", "__pycache__", "*.pyc"
    ))
    print(f"++ copied {src} → games/{slug}/")

    # 2. Cover
    cover_rel: str
    if args.cover:
        ext = Path(args.cover).suffix.lower() or ".jpg"
        cover_path = COVER_DIR / f"{slug}{ext}"
        cover_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(args.cover, cover_path)
        cover_rel = f"/assets/img/games/{slug}{ext}"
        print(f"++ cover: copied {args.cover}")
    else:
        jpg_path = COVER_DIR / f"{slug}.jpg"
        ok = False
        if not args.no_shot:
            ok = capture_screenshot(
                target_dir / "index.html",
                jpg_path,
                delay=args.shot_delay,
                wait_selector=args.shot_wait_selector,
            )
        if ok:
            cover_rel = f"/assets/img/games/{slug}.jpg"
            print(f"++ cover: screenshot → assets/img/games/{slug}.jpg")
        else:
            svg_path = COVER_DIR / f"{slug}.svg"
            write_svg_poster(svg_path, title, slug, subtitle=description or src.name)
            cover_rel = f"/assets/img/games/{slug}.svg"
            print(f"++ cover: SVG poster → assets/img/games/{slug}.svg")

    # 3. Collection entry
    COLLECTION_DIR.mkdir(parents=True, exist_ok=True)
    entry = COLLECTION_DIR / f"{slug}.md"
    date_str = datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S %z") or \
        datetime.now().strftime("%Y-%m-%d 12:00:00 +0800")
    fm = [
        "---",
        f'slug: "{yaml_escape(slug)}"',
        f'title: "{yaml_escape(title)}"',
        f'description: "{yaml_escape(description)}"',
        f'category: "{yaml_escape(args.category)}"',
        f'cover: "{yaml_escape(cover_rel)}"',
        f'play_url: "/games/{slug}/"',
        f'date: "{date_str}"',
        "---",
        "",
    ]
    entry.write_text("\n".join(fm), encoding="utf-8")
    print(f"++ wrote _games/{slug}.md")

    return target_dir


def git_publish(message: str, push: bool) -> None:
    run(["git", "add", "-A", "games", "_games", "assets/img/games"])
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
        out = subprocess.run(["git", "push"], cwd=REPO_ROOT, env=env, capture_output=True, text=True)
        if out.returncode != 0:
            print("!! push failed:")
            print(out.stderr)
            sys.exit(1)
        print("++ pushed")


def main() -> None:
    ap = argparse.ArgumentParser(description="Add a self-contained HTML game to the Marginalia gallery.")
    ap.add_argument("sources", nargs="+", type=Path, help="game folder(s) — each must contain index.html")
    ap.add_argument("--slug", help="override slug (single source only)")
    ap.add_argument("--title", help="override title (single source only)")
    ap.add_argument("--description", help="override description (single source only)")
    ap.add_argument("--category", default="休闲 · 经典",
                    help="游戏分类 chip（games.md 筛选用），如 '3D · 沉浸' / 'AI · 多智能体' / "
                         "'卡牌 · Roguelike' / '叙事 · 模拟' / '休闲 · 经典'")
    ap.add_argument("--cover", help="use this image file as cover instead of capturing")
    ap.add_argument("--shot-delay", type=float, default=2.0, help="seconds to wait before screenshot")
    ap.add_argument("--shot-wait-selector", help="CSS selector to wait for before screenshot")
    ap.add_argument("--no-shot", action="store_true", help="skip Playwright; always use SVG poster")
    ap.add_argument("--force", action="store_true", help="overwrite existing target")
    ap.add_argument("--message", help="git commit message")
    ap.add_argument("--no-push", action="store_true")
    ap.add_argument("--no-commit", action="store_true")
    args = ap.parse_args()

    if (args.slug or args.title or args.description) and len(args.sources) > 1:
        print("!! --slug/--title/--description can only be used with a single source")
        sys.exit(1)

    added: list[str] = []
    for src in args.sources:
        try:
            t = add_game(src.resolve(), args)
            if t:
                added.append(t.name)
        except Exception as e:
            print(f"!! {src}: {e}", file=sys.stderr)

    if not added:
        print("== nothing added")
        return
    if args.no_commit:
        print(f"\n== added {len(added)} game(s); --no-commit, stopping here")
        return
    msg = args.message or f"games: add {', '.join(added)}"
    git_publish(msg, push=not args.no_push)


if __name__ == "__main__":
    main()
