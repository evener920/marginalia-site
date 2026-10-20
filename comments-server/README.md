# Marginalia comments-server

Tiny FastAPI + SQLite backend that gives the static Marginalia site (GitHub
Pages) reader interaction: **likes**, **comments**, and a sitewide **recent
comments** feed for the header 消息盒子. Runs on the pyf server (广州), exposed
over HTTPS at `mg-api.panyifeng.xyz`.

Excluded from the Jekyll build (`exclude: comments-server` in `_config.yml`),
so it ships in the repo but is never served by Pages.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/health` | liveness |
| `POST` | `/api/like` `{slug}` | toggle like (per IP); → `{likes, liked}` |
| `GET`  | `/api/stats?slugs=a,b,c` | batch `{slug: {likes, comments, liked}}` |
| `GET`  | `/api/comments?slug=a` | comments for one slug (newest first) |
| `POST` | `/api/comments` `{slug,body,name,title,url,website}` | post a comment |
| `GET`  | `/api/recent?limit=20` | newest comments sitewide (message box) |
| `DELETE` | `/api/comments/{id}` | soft-delete spam (Bearer `MG_ADMIN_TOKEN`) |

Anti-spam on `POST /api/comments`: `website` is a honeypot (must be empty —
non-empty is silently dropped); `name`≤40, `body`≤2000; ≤3 links; per-IP sliding
rate limit (`MG_RATE_MAX` per `MG_RATE_WINDOW`s); exact-duplicate body blocked.

IPs are never stored in plaintext — only a salted SHA-256 prefix (`MG_IP_SALT`),
used for like-dedupe and rate-limiting.

## Environment (`/etc/mg-comments.env`)

```ini
MG_DB_PATH=/opt/mg-comments/mg-comments.db
MG_IP_SALT=<random-long-string>
MG_ADMIN_TOKEN=<random-long-string>     # for DELETE; unset → delete disabled
MG_ALLOW_ORIGIN=https://jinzi.cyou,https://pyf-labrary.github.io
MG_RATE_MAX=3
MG_RATE_WINDOW=60
```

## Deploy (pyf)

```bash
# 1. DNS: alidns add A record mg-api.panyifeng.xyz -> pyf
# 2. ship code
ssh pyf 'sudo mkdir -p /opt/mg-comments && sudo chown $USER /opt/mg-comments'
scp -r app.py requirements.txt pyf:/opt/mg-comments/
# 3. venv
ssh pyf 'cd /opt/mg-comments && python3 -m venv venv && venv/bin/pip install -r requirements.txt'
# 4. env + systemd
ssh pyf 'sudo tee /etc/mg-comments.env < ... ; sudo cp mg-comments.service /etc/systemd/system/'
ssh pyf 'sudo systemctl daemon-reload && sudo systemctl enable --now mg-comments'
# 5. acme cert + nginx vhost reverse-proxy 127.0.0.1:8790 (see pyf-server-deploy skill)
# 6. verify
curl https://mg-api.panyifeng.xyz/api/health
```

## Local dev

```bash
python3 -m venv venv && venv/bin/pip install -r requirements.txt
MG_ALLOW_ORIGIN='*' venv/bin/uvicorn app:app --port 8790
curl -s localhost:8790/api/health
```

## Moderation

```bash
# delete a spam comment by id
curl -X DELETE https://mg-api.panyifeng.xyz/api/comments/42 \
  -H "Authorization: Bearer $MG_ADMIN_TOKEN"
```
