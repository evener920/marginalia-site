# VPS 侧组件（oci-yishan · Oracle Cloud Tokyo）

本目录存放运行在 VPS 上的两个配套组件的**当前生产版本**，用于版本化留存。
VPS 重装后可由此恢复，避免参数回到默认值或配置丢失。

> 安全说明：本目录**不含任何明文凭据**。转写 token、API key 等凭据均保存在
> VPS 上独立文件中（未纳入仓库），脚本只读取其路径。

---

## 1. 抖音转写守护进程 `auto_daemon.py`

- **部署路径**：`/opt/douyin-api/auto_daemon.py`
- **systemd 单元**：`/etc/systemd/system/douyin-transcribe.service`（enabled，开机自启、崩溃重启）
- **每轮做的事**：
  1. 刷新 `fav_order.json` / `douyin_index.json`（GitHub raw）；
  2. 取 **索引全集**（`douyin_index` 527 条，非 `fav_order` 子集）中缺 `transcripts/<id>.txt`
     且未被永久跳过的条目，每轮最多转写 `BATCH_SIZE` 条；
  3. 对每个非空文稿 `POST /transcript`，由 Worker 写回 `_videos/*.md`；
  4. 成功/已存在记入 `sent_transcripts.json`；超时/失败累计 `MAX_FAIL` 次的写空稿
     记入 `skipped_transcripts.json` 永久跳过（幂等）。

### 已调过的参数（重装后务必恢复）

| 参数 | 原默认值 | 当前值 | 说明 |
|---|---|---|---|
| `INTERVAL`（每轮间隔秒） | `120` | **40** | 进下一轮更快 |
| `TRANSCRIBE_WORKERS` | `2` | **5** | 转写并发 |
| `SEND_WORKERS`（回填并发） | `5` | `5`（未改） | |
| `BATCH_SIZE` | —（无，全量） | **25** | 每轮最多处理条数，避免单轮被拖垮 |
| `ROUND_BUDGET`（秒） | —（无限等待） | **600** | 转写阶段时间窗，到点未完成计一次失败 |
| `MAX_FAIL` | —（无限重试） | **2** | 累计失败次数达上限即写空稿永久跳过 |

调参原因：
- 原先 2 并发 + 120s 间隔消化上百条待转写视频过慢；
- **超长视频（数十小时）会拖死整轮**：单轮曾耗时 35 分钟且进度停滞。改为分批 +
  固定时间窗，卡住的条目累计 2 次失败后写空稿跳过，不再占用主循环。

### todo 来源必须是索引全集，不能用 fav_order

`douyin_index.json` 有 527 条，而 `fav_order.json` 只有 440 条（`fav_order` 仅记录
书签同步过的条目）。早期版本按 `fav_order` 枚举 todo，导致 87 条视频**从未进入处理
范围**，站点进度分母（526）与守护进程口径（440）长期对不上、看起来像卡住。
现值已改为 `set(idx) | set(fav)`，`fav_order` 仅用于排序权重。

### 恢复命令

```bash
scp vps/auto_daemon.py oci-yishan:/opt/douyin-api/auto_daemon.py
ssh oci-yishan 'sudo systemctl restart douyin-transcribe'
```

VPS 本地另留有改动前的备份 `/opt/douyin-api/auto_daemon.py.bak`。

### 常用运维

```bash
ssh oci-yishan 'systemctl status douyin-transcribe'
ssh oci-yishan 'journalctl -u douyin-transcribe -f'
```

---

## 2. nginx 反代配置 `nginx-douyin.conf`

- **部署路径**：`/etc/nginx/sites-available/douyin`（已 `sites-enabled` 软链）
- **用途**：为站点 `transcribe.201573.xyz` 提供两条代理：
  - `/douyin-ingest/` → `https://marginalia-douyin-ingest.evener920.workers.dev/`
  - `/douyin-ingest`（**无尾斜杠，精确匹配**）→ 同上

### 为什么要这条无尾斜杠 location

原本只有 `/douyin-ingest/`（带斜杠），导致请求无尾斜杠的 `/douyin-ingest`
被 nginx **301 重定向**到带斜杠版本。部分客户端（如 Python `urllib` 的 POST）
不会跟随重定向，造成请求静默失败。加入 `location = /douyin-ingest` 精确匹配后，
无尾斜杠直接返回 200，不再重定向。

### 恢复命令

```bash
scp vps/nginx-douyin.conf oci-yishan:/etc/nginx/sites-available/douyin
ssh oci-yishan 'sudo nginx -t && sudo systemctl reload nginx'
```

VPS 本地备份：`/etc/nginx/sites-available/douyin.bak`。

### 验证

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://transcribe.201573.xyz/douyin-ingest        # 期望 200
curl -s https://transcribe.201573.xyz/douyin-ingest/stats                                   # 期望返回 JSON
```
