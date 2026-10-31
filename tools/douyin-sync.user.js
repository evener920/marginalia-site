// ==UserScript==
// @name         抖音收藏同步 · marginalia
// @namespace    https://marginalia.201573.xyz
// @version      1.3
// @description  在抖音收藏页注入可拖动的「抖音收藏同步」浮动按钮：点击立即给反馈、扫描实时可见、自动跳过已收录、自动拉文字稿；结束弹出明确总结。不依赖 javascript: 书签。
// @match        https://www.douyin.com/*
// @match        https://douyin.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // 如需更换入库 Worker，改这一行即可（与书签生成器预填地址保持一致）
  const WORKER = 'https://marginalia-douyin-ingest.evener920.workers.dev';

  function runSync(btn) {
    if (btn.dataset.busy === '1') return; // 防重复点击
    btn.dataset.busy = '1';
    btn.textContent = '同步中 ⏳';
    btn.style.opacity = '0.75';
    btn.style.cursor = 'default';

    var W = WORKER;
    if (!W) { alert('Worker 地址未配置'); restoreBtn(); return; }

    function qa(s) { return [].slice.call(document.querySelectorAll(s)); }

    // —— 顶部状态条（立即出现，实时更新）——
    var bar = document.createElement('div');
    bar.id = 'dySyncBar';
    bar.style.cssText = 'position:fixed;left:0;right:0;z-index:2147483647;background:#7a2e2e;color:#fff;padding:10px 18px;font:14px/1.4 sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.3);width:100%;text-align:center';
    document.body.appendChild(bar);
    function setStatus(t) { bar.textContent = t; }

    // 先把状态条 dock 到抖音头部正下方（避免压住浏览器 UI / 被头部遮挡）
    setStatus('正在准备同步，马上开始扫描…');
    try {
      var _b = 0;
      qa('header,nav,[class*=header],[class*=Header],[class*=nav],[class*=Nav],[class*=top],[class*=Top]').forEach(function (el) {
        var r = el.getBoundingClientRect(); if (r.top <= 2 && r.height > 15 && r.bottom > _b) _b = r.bottom;
      });
      bar.style.top = (_b > 0 ? _b + 6 : 64) + 'px';
    } catch (e) { bar.style.top = '64px'; }

    function restoreBtn() {
      btn.dataset.busy = '0';
      btn.textContent = '抖音收藏同步';
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
    function closeBar(delay) {
      setTimeout(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }, delay || 6000);
    }

    var store = {}, order = [], known = null, knownResolved = false, knownStreak = 0, totalSeen = 0, finishDeferred = false;

    function realCover(a) {
      var img = a.querySelector('img'); if (!img) return '';
      var c = [];
      ['data-src', 'data-lazy-src', 'data-actualsrc', 'data-original'].forEach(function (x) { var v = img.getAttribute(x); if (v) c.push(v); });
      if (img.getAttribute('srcset')) { var s = img.getAttribute('srcset').trim().split(/\s+/); c.push(s[0].split(' ')[0]); }
      if (img.currentSrc) c.push(img.currentSrc);
      c.push(img.src);
      var el = a; while (el) { var bi = ''; try { bi = getComputedStyle(el).backgroundImage; } catch (e) {}
        var mm = bi && bi.match(/url\(['"]?(https?:[^\s'"]+)/); if (mm) c.push(mm[1]); el = el.parentElement; }
      for (var i = 0; i < c.length; i++) { var u = (c[i] || '').trim(); if (!u) continue; if (u.indexOf('data:') === 0) continue; if (/placeholder|gray|1x1|blank/i.test(u)) continue; return u.charAt(0) === '/' && u.charAt(1) === '/' ? 'https:' + u : u; }
      return '';
    }

    function collect() {
      qa('a[href*="/video/"]').forEach(function (a) {
        var m = a.href.match(/video\/(\d+)/); if (!m) return;
        var id = m[1]; if (store[id]) return;
        order.push(id); totalSeen++;
        if (known && known.has(id)) { knownStreak++; } else { knownStreak = 0; }
        var img = a.querySelector('img');
        store[id] = { id: id, title: (img && img.alt) || a.getAttribute('title') || a.textContent.trim().slice(0, 80) || '', url: a.href, cover: realCover(a) };
      });
    }

    function cacheKnown(ids) { try { localStorage.setItem('dyKnown', JSON.stringify(ids)); } catch (e) {} }
    function loadCachedKnown() { try { var s = localStorage.getItem('dyKnown'); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
    function fetchKnown() {
      return fetch(W + '/known', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
        if (d && Array.isArray(d.ids) && d.ids.length) { cacheKnown(d.ids); return new Set(d.ids); } throw 0;
      }).catch(function () { var c = loadCachedKnown(); return c ? new Set(c) : null; });
    }

    function scrollAll() {
      var k = 0;
      function nudge() {
        if (k++ > 12) return;
        window.scrollBy(0, 1200);
        window.scrollTo(0, document.body.scrollHeight);
        try { document.documentElement.scrollTop = document.documentElement.scrollHeight; } catch (e) {}
        qa('*').forEach(function (el) { var oy = getComputedStyle(el).overflowY; if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 10) { try { el.scrollTop = el.scrollHeight; } catch (e) {} } });
        try { window.dispatchEvent(new Event('scroll', { bubbles: true })); document.dispatchEvent(new Event('scroll', { bubbles: true })); } catch (e) {}
        setTimeout(nudge, 120);
      }
      nudge();
      qa('button,a').forEach(function (b) {
        var t = (b.textContent || '').replace(/\s/g, '');
        if (t.indexOf('加载更多') >= 0 || t.indexOf('查看全部') >= 0 || t.indexOf('点击加载') >= 0) { try { b.click(); } catch (e) {} }
      });
    }

    var tries = 0, stable = 0, MAX = 120, last = 0;
    function step() {
      collect(); var total = Object.keys(store).length;
      setStatus('已扫描 ' + total + (known ? (' 条，自动跳过已收录内容，滚动到新内容…') : ' 条（正在确认已收录，先扫描）') + '（第 ' + (tries + 1) + ' 轮）');
      scrollAll();
      setTimeout(function () {
        collect(); var now = Object.keys(store).length;
        tries++;
        if (now > last) { stable = 0; } else { stable++; }
        last = now;
        if (knownStreak >= 10 || stable >= 3 || tries >= MAX) { finish(); } else { step(); }
      }, 900);
    }

    function finish() {
      // known 还没回来就先等一下，避免把已收录的全量重发
      if (!knownResolved && !finishDeferred) {
        finishDeferred = true;
        setStatus('正在确认已收录内容…');
        setTimeout(finish, 700);
        return;
      }
      var entries = order.map(function (k) { return store[k]; }).filter(Boolean);
      var skippedKnown = 0;
      if (known) { var before = entries.length; entries = entries.filter(function (e) { return !known.has(e.id); }); skippedKnown = before - entries.length; }
      entries.forEach(function (e, i) { e.idx = i; });

      // 没有任何可同步内容
      if (entries.length === 0) {
        if (skippedKnown > 0) {
          var msg0 = '✅ 没有新内容\n\n已自动跳过 ' + skippedKnown + ' 条已收录的视频。\n收藏夹有新增时，再点我同步即可。';
          setStatus('没有新内容（已自动跳过 ' + skippedKnown + ' 条已收录）。收藏有更新时点我再同步。');
          alert(msg0);
        } else {
          var msg1 = '⚠️ 没找到视频\n\n请在抖音「收藏列表页」或「单个视频页」使用本按钮。';
          setStatus('没找到视频。请在抖音收藏列表页或单个视频页使用。');
          alert(msg1);
        }
        restoreBtn(); closeBar(5000); return;
      }

      // 有内容，推送
      setStatus('发现 ' + entries.length + ' 条新内容（已自动跳过 ' + skippedKnown + ' 条已有），正在推送到入库 Worker…');
      fetch(W + '/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entries: entries }) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var queued = (d.queued != null) ? d.queued : (d.created || 0);
          var skipped = (d.queued != null) ? (d.skipped || 0) : (d.skipped || 0);
          var updated = (d.updated || 0);
          var summary =
            '✅ 同步完成\n\n' +
            '• 新增收录：' + queued + ' 条\n' +
            '• 自动跳过已收录：' + (skippedKnown + skipped) + ' 条\n' +
            (updated ? ('• 更新顺序/封面：' + updated + ' 条\n') : '') +
            '\n接下来会自动发生：\n' +
            '1. 视频页约 1–3 分钟上线（Worker 后台建页并部署）\n' +
            '2. 文字稿由守护进程在几分钟内自动转写并回填，无需再操作';
          setStatus('已接收 ' + queued + ' 条（跳过 ' + (skippedKnown + skipped) + ' 条已收录），视频页约 1-3 分钟上线，文字稿自动回填');
          alert(summary);
        })
        .catch(function (e) {
          var msgErr = '❌ 同步失败\n\n' + e.message + '\n\n可能是抖音 CSP 拦截了跨域请求。\n可改用「抖音封面导出」书签导出 covers.txt 发我跑脚本。';
          setStatus('同步失败：' + e.message + '（可能是抖音 CSP 拦截，改用 covers 书签导出后发我）');
          alert(msgErr);
        })
        .then(function () { restoreBtn(); closeBar(8000); });
    }

    // 关键：先立即开始扫描（消除"点了没反应"的空窗），known 在后台解析后用于跳过
    step();
    fetchKnown().then(function (set) { known = set; knownResolved = true; }).catch(function () { knownResolved = true; });
  }

  // 注入可拖动的浮动按钮（抖音是 SPA，轮询 + MutationObserver 兜底）
  function injectButton() {
    if (document.getElementById('dySyncBtn')) return;
    if (!document.body) return;
    var b = document.createElement('button');
    b.id = 'dySyncBtn';
    b.textContent = '抖音收藏同步';
    b.style.cssText = 'position:fixed;right:16px;bottom:84px;z-index:2147483647;background:#7a2e2e;color:#fff;border:none;padding:11px 16px;border-radius:10px;font:14px/1.4 sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35);user-select:none;touch-action:none';

    // 拖动 vs 点击 区分：移动超过 4px 视为拖动，否则视为点击
    var down = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    b.addEventListener('pointerdown', function (e) {
      down = true; moved = false; sx = e.clientX; sy = e.clientY;
      var r = b.getBoundingClientRect(); ox = r.left; oy = r.top;
      try { b.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });
    b.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) > 4) moved = true;
      if (moved) {
        b.style.right = 'auto'; b.style.bottom = 'auto';
        b.style.left = (ox + dx) + 'px'; b.style.top = (oy + dy) + 'px';
      }
    });
    b.addEventListener('pointerup', function (e) {
      if (!down) return; down = false;
      if (!moved) { try { runSync(b); } catch (err) { alert('同步出错：' + err.message); } }
    });

    document.body.appendChild(b);
  }

  injectButton();
  var t = 0;
  var iv = setInterval(function () { injectButton(); if (++t > 60) clearInterval(iv); }, 500);
  try {
    var obs = new MutationObserver(function () { injectButton(); });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();
