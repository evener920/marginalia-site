// ==UserScript==
// @name         抖音收藏导出（Marginalia 用）
// @namespace    https://marginalia.201573.xyz
// @version      1.0
// @description  在抖音收藏页右下角显示「导出抖音收藏」按钮，一键导出所有视频链接为 txt
// @match        https://www.douyin.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  async function exportFav() {
    const btn = document.getElementById('dy-export-btn');
    const ids = new Set();
    const grab = () => {
      document.querySelectorAll('a[href*="/video/"]').forEach((a) => {
        const m = a.href.match(/video\/(\d+)/);
        if (m) ids.add('https://www.douyin.com/video/' + m[1]);
      });
    };
    if (btn) btn.textContent = '收集中 0';
    // 收藏页是无限滚动：边滚边抓，直到到底
    for (let i = 0; i < 300; i++) {
      grab();
      if (btn) btn.textContent = '收集中 ' + ids.size;
      const sc = document.scrollingElement || document.body;
      sc.scrollTop = sc.scrollHeight;
      await new Promise((r) => setTimeout(r, 800));
      if (sc.scrollTop + window.innerHeight >= sc.scrollHeight - 200 && i > 5) break;
    }
    grab();
    const blob = new Blob([...ids].join('\n'), { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'douyin-favorites.txt';
    a.click();
    if (btn) btn.textContent = '导出抖音收藏';
    alert('已导出 ' + ids.size + ' 个视频链接');
  }

  function addBtn() {
    if (document.getElementById('dy-export-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'dy-export-btn';
    btn.textContent = '导出抖音收藏';
    btn.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:99999;padding:10px 16px;' +
      'background:#fe2c55;color:#fff;border:none;border-radius:8px;font-size:14px;' +
      'cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3)';
    btn.onclick = exportFav;
    document.body.appendChild(btn);
  }

  // 抖音是 SPA，等页面稳定后再挂按钮，并周期性兜底
  window.addEventListener('load', () => setTimeout(addBtn, 1500));
  setInterval(addBtn, 3000);
})();
