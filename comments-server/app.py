"""Marginalia comments-server — likes + comments + sitewide recent feed.

A tiny FastAPI + SQLite service that gives the static Marginalia site (GitHub
Pages, read-only) reader interaction:

  - likes        per (slug, ip_hash); toggle on/off, count = COUNT(*)
  - comments     anonymous, live-post + anti-spam (honeypot / length / rate / link cap)
  - stats        batch like/comment counts for a list of slugs (listing pages)
  - recent       newest comments sitewide → feeds the header "消息盒子" inbox
  - delete       token-gated soft-delete for spam removal

No secrets live in the repo — everything sensitive is read from the environment:

  MG_DB_PATH        sqlite file path           (default ./mg-comments.db)
  MG_IP_SALT        salt for hashing IPs       (default "marginalia" — SET THIS)
  MG_ADMIN_TOKEN    bearer token for DELETE    (unset → delete disabled)
  MG_ALLOW_ORIGIN   comma-sep CORS origins     (default jinzi.cyou + legacy Pages origin)
  MG_RATE_MAX       max comments / window      (default 3)
  MG_RATE_WINDOW    rate window seconds        (default 60)

Run:  uvicorn app:app --host 127.0.0.1 --port 8790
"""
from __future__ import annotations

import hashlib
import os
import re
import sqlite3
import time
from contextlib import contextmanager

from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ---------------------------------------------------------------- config
DB_PATH = os.environ.get("MG_DB_PATH", os.path.join(os.path.dirname(__file__), "mg-comments.db"))
IP_SALT = os.environ.get("MG_IP_SALT", "marginalia").encode("utf-8")
ADMIN_TOKEN = os.environ.get("MG_ADMIN_TOKEN", "")
ALLOW_ORIGINS = [o.strip() for o in os.environ.get(
    "MG_ALLOW_ORIGIN",
    "https://jinzi.cyou,https://pyf-labrary.github.io",
).split(",") if o.strip()]
RATE_MAX = int(os.environ.get("MG_RATE_MAX", "3"))
RATE_WINDOW = int(os.environ.get("MG_RATE_WINDOW", "60"))

NAME_MAX = 40
BODY_MAX = 2000
SLUG_MAX = 300
MAX_LINKS = 3
STATS_SLUG_CAP = 80
LINK_RE = re.compile(r"https?://", re.I)

# ---------------------------------------------------------------- db


@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS likes (
                slug    TEXT NOT NULL,
                ip_hash TEXT NOT NULL,
                ts      INTEGER NOT NULL,
                PRIMARY KEY (slug, ip_hash)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS comments (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                slug    TEXT NOT NULL,
                title   TEXT NOT NULL DEFAULT '',
                url     TEXT NOT NULL DEFAULT '',
                name    TEXT NOT NULL DEFAULT '',
                body    TEXT NOT NULL,
                ip_hash TEXT NOT NULL DEFAULT '',
                ts      INTEGER NOT NULL,
                hidden  INTEGER NOT NULL DEFAULT 0
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_comments_slug ON comments(slug, hidden, id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_comments_recent ON comments(hidden, id)")


# ---------------------------------------------------------------- helpers


def client_ip(req: Request) -> str:
    xff = req.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return req.headers.get("x-real-ip") or (req.client.host if req.client else "0.0.0.0")


def ip_hash(req: Request) -> str:
    return hashlib.sha256(IP_SALT + client_ip(req).encode("utf-8")).hexdigest()[:16]


def like_count(conn, slug: str) -> int:
    return conn.execute("SELECT COUNT(*) FROM likes WHERE slug=?", (slug,)).fetchone()[0]


def comment_count(conn, slug: str) -> int:
    return conn.execute(
        "SELECT COUNT(*) FROM comments WHERE slug=? AND hidden=0", (slug,)).fetchone()[0]


def serialize(row) -> dict:
    return {
        "id": row["id"],
        "slug": row["slug"],
        "title": row["title"],
        "url": row["url"],
        "name": row["name"] or "匿名",
        "body": row["body"],
        "ts": row["ts"],
    }


# ---------------------------------------------------------------- app

app = FastAPI(title="Marginalia comments-server", docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=86400,
)


@app.on_event("startup")
def _startup():
    init_db()


@app.get("/api/health")
def health():
    return {"ok": True}


# -------- likes --------

class LikeIn(BaseModel):
    slug: str


@app.post("/api/like")
def toggle_like(payload: LikeIn, request: Request):
    slug = (payload.slug or "").strip()[:SLUG_MAX]
    if not slug:
        raise HTTPException(400, "missing slug")
    h = ip_hash(request)
    with db() as conn:
        existing = conn.execute(
            "SELECT 1 FROM likes WHERE slug=? AND ip_hash=?", (slug, h)).fetchone()
        if existing:
            conn.execute("DELETE FROM likes WHERE slug=? AND ip_hash=?", (slug, h))
            liked = False
        else:
            conn.execute(
                "INSERT INTO likes(slug, ip_hash, ts) VALUES(?,?,?)", (slug, h, int(time.time())))
            liked = True
        return {"slug": slug, "likes": like_count(conn, slug), "liked": liked}


# -------- stats (batch) --------

@app.get("/api/stats")
def stats(slug: str | None = None, slugs: str | None = None, request: Request = None):
    keys = []
    if slug:
        keys.append(slug.strip()[:SLUG_MAX])
    if slugs:
        keys.extend(s.strip()[:SLUG_MAX] for s in slugs.split(",") if s.strip())
    keys = list(dict.fromkeys(k for k in keys if k))[:STATS_SLUG_CAP]
    if not keys:
        return {}
    h = ip_hash(request) if request else ""
    out = {}
    with db() as conn:
        for k in keys:
            liked = bool(conn.execute(
                "SELECT 1 FROM likes WHERE slug=? AND ip_hash=?", (k, h)).fetchone()) if h else False
            out[k] = {
                "likes": like_count(conn, k),
                "comments": comment_count(conn, k),
                "liked": liked,
            }
    return out


# -------- comments --------

class CommentIn(BaseModel):
    slug: str
    body: str
    name: str | None = ""
    title: str | None = ""
    url: str | None = ""
    website: str | None = ""   # honeypot — must stay empty


@app.get("/api/comments")
def list_comments(slug: str = Query(...)):
    slug = slug.strip()[:SLUG_MAX]
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM comments WHERE slug=? AND hidden=0 ORDER BY id DESC LIMIT 200",
            (slug,)).fetchall()
        return {"slug": slug, "count": len(rows), "comments": [serialize(r) for r in rows]}


@app.post("/api/comments")
def add_comment(payload: CommentIn, request: Request):
    # honeypot: pretend success, store nothing
    if (payload.website or "").strip():
        return {"ok": True, "skipped": True}

    slug = (payload.slug or "").strip()[:SLUG_MAX]
    body = (payload.body or "").strip()
    name = (payload.name or "").strip()[:NAME_MAX] or "匿名"
    title = (payload.title or "").strip()[:200]
    url = (payload.url or "").strip()[:300]
    if not slug:
        raise HTTPException(400, "missing slug")
    if not body:
        raise HTTPException(400, "empty comment")
    if len(body) > BODY_MAX:
        raise HTTPException(400, f"comment too long (>{BODY_MAX})")
    if len(LINK_RE.findall(body)) > MAX_LINKS:
        raise HTTPException(400, "too many links")

    h = ip_hash(request)
    now = int(time.time())
    with db() as conn:
        recent = conn.execute(
            "SELECT COUNT(*) FROM comments WHERE ip_hash=? AND ts > ?",
            (h, now - RATE_WINDOW)).fetchone()[0]
        if recent >= RATE_MAX:
            raise HTTPException(429, "评论太频繁，稍后再试")
        # block exact duplicate body from same IP within the window (double-submit)
        dup = conn.execute(
            "SELECT 1 FROM comments WHERE ip_hash=? AND slug=? AND body=? AND ts > ?",
            (h, slug, body, now - RATE_WINDOW)).fetchone()
        if dup:
            raise HTTPException(409, "重复评论")
        cur = conn.execute(
            "INSERT INTO comments(slug,title,url,name,body,ip_hash,ts) VALUES(?,?,?,?,?,?,?)",
            (slug, title, url, name, body, h, now))
        row = conn.execute("SELECT * FROM comments WHERE id=?", (cur.lastrowid,)).fetchone()
        return {"ok": True, "comment": serialize(row), "comments": comment_count(conn, slug)}


# -------- recent (message box) --------

@app.get("/api/recent")
def recent(limit: int = 20):
    limit = max(1, min(limit, 50))
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM comments WHERE hidden=0 ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        return {"comments": [serialize(r) for r in rows]}


# -------- admin soft-delete --------

@app.delete("/api/comments/{cid}")
def delete_comment(cid: int, authorization: str = Header("")):
    if not ADMIN_TOKEN:
        raise HTTPException(503, "delete disabled (no MG_ADMIN_TOKEN)")
    token = authorization.replace("Bearer ", "").strip()
    if token != ADMIN_TOKEN:
        raise HTTPException(401, "bad token")
    with db() as conn:
        conn.execute("UPDATE comments SET hidden=1 WHERE id=?", (cid,))
    return {"ok": True, "id": cid}


@app.exception_handler(HTTPException)
def _http_exc(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})
