// ==UserScript==
// @name         抖音收藏封面导出 · marginalia
// @namespace    https://marginalia.201573.xyz
// @version      1.0
// @description  在抖音收藏页注入可拖动的「导出封面」浮动按钮：点击把页面所有视频的 视频ID|封面URL 导出为 covers.txt，用于补全 marginalia 站点缺失的封面。纯本地 DOM 操作，无需跨域请求，不受抖音 CSP 影响。
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

  function runExport(btn) {
    if (btn.dataset.busy === '1') return;
    btn.dataset.busy = '1';
    btn.textContent = '导出中 ⏳';
    btn.style.opacity = '0.75';

    var qa = function (s) { return [].slice.call(document.querySelectorAll(s)); };
    var lines = [];
    qa('a[href*="/video/"]').forEach(function (a) {
      var m = a.href.match(/video\/(\d+)/); if (!m) return;
      var id = m[1];
      var cov = realCover(a);
      if (cov) lines.push(id + '|' + cov);
    });

    var txt = lines.join('\n');
    var blob = new Blob([txt], { type: 'text/plain' });
    var u = URL.createObjectURL(blob);
    var x = document.createElement('a');
    x.href = u; x.download = 'covers.txt';
    document.body.appendChild(x); x.click();
    setTimeout(function () { try { URL.revokeObjectURL(u); } catch (e) {} if (x.parentNode) x.parentNode.removeChild(x); }, 1000);

    alert('已导出 ' + lines.length + ' 条封面到 covers.txt\n\n（若为 0 条，说明页面还没滚到底、视频卡片尚未加载，请滚动到底部后再点一次）');

    btn.dataset.busy = '0';
    btn.textContent = '导出封面';
    btn.style.opacity = '1';
  }

  // 注入可拖动的浮动按钮（抖音是 SPA，轮询 + MutationObserver 兜底）
  function injectButton() {
    if (document.getElementById('dyCoverBtn')) return;
    if (!document.body) return;
    var b = document.createElement('button');
    b.id = 'dyCoverBtn';
    b.textContent = '导出封面';
    b.style.cssText = 'position:fixed;right:16px;bottom:148px;z-index:2147483647;background:#7a2e2e;color:#fff;border:none;padding:11px 16px;border-radius:10px;font:14px/1.4 sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35);user-select:none;touch-action:none';

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
    b.addEventListener('pointerup', function () {
      if (!down) return; down = false;
      if (!moved) { try { runExport(b); } catch (err) { alert('导出出错：' + err.message); } }
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
