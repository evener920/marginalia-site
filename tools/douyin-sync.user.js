// ==UserScript==
// @name         抖音收藏同步 · marginalia
// @namespace    https://marginalia.201573.xyz
// @version      1.2
// @description  在抖音收藏页注入「抖音收藏同步」按钮，一键增量同步到 marginalia 站点（自动跳过已收录、自动拉文字稿）。不依赖 javascript: 书签，避免 Chrome 剥协议导致点击无反应。
// @match        https://www.douyin.com/*
// @match        https://douyin.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // 如需更换入库 Worker，改这一行即可（与书签生成器预填地址保持一致）
  const WORKER = 'https://marginalia-douyin-ingest.evener920.workers.dev';

  function runSync() {
    var W = WORKER;
    if (!W) { alert('Worker 地址未配置'); return; }
    function qa(s) { return [].slice.call(document.querySelectorAll(s)); }
    var store = {}, order = [], known = null, knownStreak = 0, totalSeen = 0;

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

    var btn = document.createElement('div');
    btn.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:2147483647;background:#7a2e2e;color:#fff;padding:10px 18px;border-radius:0;font:14px/1.4 sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.3);width:100%;text-align:center';
    document.body.appendChild(btn);
    try {
      var _b = 0;
      qa('header,nav,[class*=header],[class*=Header],[class*=nav],[class*=Nav],[class*=top],[class*=Top]').forEach(function (el) {
        var r = el.getBoundingClientRect(); if (r.top <= 2 && r.height > 15 && r.bottom > _b) _b = r.bottom;
      });
      btn.style.top = (_b > 0 ? _b + 6 : 64) + 'px';
    } catch (e) { btn.style.top = '64px'; }

    function setStatus(t) { btn.textContent = t; }

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
      setStatus('已扫描 ' + total + (known ? (' 条，自动跳过已收录内容，滚动到新内容…') : ' 条（首次全量同步）') + '（' + (tries + 1) + '）');
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
      var entries = order.map(function (k) { return store[k]; }).filter(Boolean);
      var skippedKnown = 0;
      if (known) { var before = entries.length; entries = entries.filter(function (e) { return !known.has(e.id); }); skippedKnown = before - entries.length; }
      entries.forEach(function (e, i) { e.idx = i; });
      if (entries.length === 0 && skippedKnown > 0) { setStatus('没有新内容（已自动跳过 ' + skippedKnown + ' 条已收录）。收藏有更新时点我再同步。'); setTimeout(function () { if (btn.parentNode) btn.parentNode.removeChild(btn); }, 5000); return; }
      if (entries.length === 0) {
        var idm = location.href.match(/(?:video|note)\/(\d+)/);
        if (idm) {
          var v = document.querySelector('video');
          var cov = document.querySelector('meta[property="og:image"]') ? document.querySelector('meta[property="og:image"]').content : (v && v.poster || '');
          var ti = document.querySelector('meta[property="og:title"]') ? document.querySelector('meta[property="og:title"]').content : document.title;
          entries.push({ id: idm[1], idx: 0, title: ti, url: location.href, cover: cov });
        }
      }
      if (entries.length === 0) { setStatus('没找到视频。请在抖音收藏列表页或单个视频页使用。'); setTimeout(function () { if (btn.parentNode) btn.parentNode.removeChild(btn); }, 5000); return; }
      setStatus('发现 ' + entries.length + ' 条新内容（已自动跳过 ' + skippedKnown + ' 条已有），正在推送到入库 Worker…');
      fetch(W + '/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entries: entries }) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.queued != null) { setStatus('已接收 ' + d.queued + ' 条（新增 ' + (d.queued || 0) + '，跳过 ' + (d.skipped || 0) + '，更新顺序/封面 ' + (d.updated || 0) + ' 条），约 1-3 分钟后刷新站点查看'); }
          else { setStatus('完成：新增 ' + (d.created || 0) + ' 条，跳过 ' + (d.skipped || 0) + ' 条' + (d.error ? ('，错误：' + d.error) : '') + '，网站正在部署…'); }
          setTimeout(function () { if (btn.parentNode) btn.parentNode.removeChild(btn); }, 6000);
        })
        .catch(function (e) { setStatus('同步失败：' + e.message + '（可能是抖音 CSP 拦截，改用 covers 书签导出后发我）'); setTimeout(function () { if (btn.parentNode) btn.parentNode.removeChild(btn); }, 7000); });
    }

    fetchKnown().then(function (set) { known = set; step(); });
  }

  // 注入常驻按钮（抖音是 SPA，用轮询 + MutationObserver 兜底）
  function inject() {
    if (document.getElementById('dySyncBtn')) return;
    if (!document.body) return;
    var b = document.createElement('button');
    b.id = 'dySyncBtn';
    b.textContent = '抖音收藏同步';
    b.style.cssText = 'position:fixed;right:16px;bottom:84px;z-index:2147483647;background:#7a2e2e;color:#fff;border:none;padding:11px 16px;border-radius:10px;font:14px/1.4 sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35)';
    b.addEventListener('click', function () { try { runSync(); } catch (e) { alert('同步出错：' + e.message); } });
    document.body.appendChild(b);
  }

  inject();
  var t = 0;
  var iv = setInterval(function () { inject(); if (++t > 60) clearInterval(iv); }, 500);
  try {
    var obs = new MutationObserver(function () { inject(); });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();
