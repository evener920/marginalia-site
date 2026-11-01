// ==UserScript==
// @name         抖音收藏封面导出 · marginalia
// @namespace    https://marginalia.201573.xyz
// @version      1.1
// @description  在抖音收藏页注入浮动按钮：①「导出封面」导出当前已加载卡片；②「📜 滚动并导出」先自动无限滚动加载全部卡片再导出（解决手动滚不到底导致漏抓的问题）。纯本地 DOM 操作，不受抖音 CSP 影响。
// @match        https://www.douyin.com/*
// @match        https://douyin.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

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

  function collectLines() {
    var qa = function (s) { return [].slice.call(document.querySelectorAll(s)); };
    var lines = [];
    var seen = {};
    qa('a[href*="/video/"]').forEach(function (a) {
      var m = a.href.match(/video\/(\d+)/); if (!m) return;
      var id = m[1]; if (seen[id]) return; seen[id] = 1;
      var cov = realCover(a);
      if (cov) lines.push(id + '|' + cov);
    });
    // 抖音图文/note 类也可能用 /note/ 链接，一并尝试
    qa('a[href*="/note/"]').forEach(function (a) {
      var m = a.href.match(/note\/(\d+)/); if (!m) return;
      var id = m[1]; if (seen[id]) return; seen[id] = 1;
      var cov = realCover(a);
      if (cov) lines.push(id + '|' + cov);
    });
    return lines;
  }

  function runExport(btn) {
    if (btn.dataset.busy === '1') return;
    btn.dataset.busy = '1';
    btn.textContent = '导出中 ⏳';
    btn.style.opacity = '0.75';

    var lines = collectLines();
    var txt = lines.join('\n');
    var blob = new Blob([txt], { type: 'text/plain' });
    var u = URL.createObjectURL(blob);
    var x = document.createElement('a');
    x.href = u; x.download = 'covers.txt';
    document.body.appendChild(x); x.click();
    setTimeout(function () { try { URL.revokeObjectURL(u); } catch (e) {} if (x.parentNode) x.parentNode.removeChild(x); }, 1000);

    alert('已导出 ' + lines.length + ' 条封面到 covers.txt\n\n（若为 0 条，说明页面还没加载出视频卡片，请稍等或滚动一下再点）');

    btn.dataset.busy = '0';
    btn.textContent = '导出封面';
    btn.style.opacity = '1';
  }

  // 自动滚动到底部，触发抖音无限加载；高度连续 3 轮不再增长即视为到底
  function autoScroll(maxRounds, waitMs) {
    return new Promise(function (resolve) {
      var rounds = 0, stale = 0, lastH = -1;
      function scrollAll() {
        window.scrollTo(0, document.body.scrollHeight);
        var se = document.scrollingElement || document.documentElement;
        if (se) se.scrollTop = se.scrollHeight;
        // 尝试常见可滚动容器（抖音收藏页有时是内部 div 滚动）
        var cands = document.querySelectorAll('div, main, section, ul, [class*="scroll"], [class*="list"], [class*="container"], [class*="wrapper"]');
        for (var i = 0; i < cands.length; i++) {
          var el = cands[i];
          try { if (el.scrollHeight > el.clientHeight + 4) el.scrollTop = el.scrollHeight; } catch (e) {}
        }
      }
      function step() {
        scrollAll();
        rounds++;
        var h = (document.scrollingElement || document.documentElement).scrollHeight;
        if (h === lastH) stale++; else stale = 0;
        lastH = h;
        if (stale >= 3 || rounds >= (maxRounds || 80)) {
          setTimeout(resolve, (waitMs || 700) + 400); // 末轮多等，确保最后一批渲染
          return;
        }
        setTimeout(step, waitMs || 700);
      }
      step();
    });
  }

  function runAuto(btn) {
    if (btn.dataset.busy === '1') return;
    btn.dataset.busy = '1';
    btn.textContent = '滚动加载中…(0)';
    btn.style.opacity = '0.75';
    var n = 0;
    // 用一个小计时器更新计数提示
    var tip = setInterval(function () { btn.textContent = '滚动加载中…(' + (++n) + ')'; }, 1000);
    autoScroll(80, 700).then(function () {
      clearInterval(tip);
      btn.textContent = '导出中 ⏳';
      var lines = collectLines();
      var txt = lines.join('\n');
      var blob = new Blob([txt], { type: 'text/plain' });
      var u = URL.createObjectURL(blob);
      var x = document.createElement('a');
      x.href = u; x.download = 'covers.txt';
      document.body.appendChild(x); x.click();
      setTimeout(function () { try { URL.revokeObjectURL(u); } catch (e) {} if (x.parentNode) x.parentNode.removeChild(x); }, 1000);
      alert('自动滚动完成，已导出 ' + lines.length + ' 条封面到 covers.txt');
      btn.dataset.busy = '0';
      btn.textContent = '📜 滚动并导出';
      btn.style.opacity = '1';
    });
  }

  function injectButton() {
    if (document.getElementById('dyCoverBtn')) return;
    if (!document.body) return;

    function mkBtn(id, label, bottom, handler) {
      var b = document.createElement('button');
      b.id = id; b.textContent = label;
      b.style.cssText = 'position:fixed;right:16px;bottom:' + bottom + 'px;z-index:2147483647;background:#7a2e2e;color:#fff;border:none;padding:11px 16px;border-radius:10px;font:14px/1.4 sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35);user-select:none;touch-action:none';
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
        if (moved) { b.style.right = 'auto'; b.style.bottom = 'auto'; b.style.left = (ox + dx) + 'px'; b.style.top = (oy + dy) + 'px'; }
      });
      b.addEventListener('pointerup', function () {
        if (!down) return; down = false;
        if (!moved) { try { handler(b); } catch (err) { alert('操作出错：' + err.message); } }
      });
      document.body.appendChild(b);
      return b;
    }

    mkBtn('dyCoverBtn', '导出封面', 148, runExport);
    mkBtn('dyCoverAuto', '📜 滚动并导出', 92, runAuto);
  }

  injectButton();
  var t = 0;
  var iv = setInterval(function () { injectButton(); if (++t > 60) clearInterval(iv); }, 500);
  try {
    var obs = new MutationObserver(function () { injectButton(); });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();
