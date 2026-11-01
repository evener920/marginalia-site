// ==UserScript==
// @name         抖音收藏封面导出 · marginalia
// @namespace    https://marginalia.201573.xyz
// @version      1.6
// @description  在抖音收藏页注入【单个】浮动按钮「🎯 导出缺失封面」：自动滚动加载全部收藏卡片，边滚边抓取 marginalia 仍缺封面的视频（id 内嵌），实时显示「已抓 X/N」并导出 covers.txt。旧版三个封面按钮已合并为此一个。纯本地 DOM，不受抖音 CSP 影响。
// @match        https://www.douyin.com/*
// @match        https://douyin.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // === 内嵌：marginalia 站点当前缺失封面的视频 id（由 fetch_covers 流程生成）===
  const TARGET_IDS = [
  '7122063277139561728', '7211850554014829836', '7293730851899198783', '7294814602922085669', '7421059765163347226', '7457126178004946216',
  '7524600861231975737', '7532864745775303971', '7533194974771399951', '7538336658828152074', '7574729688447208755', '7595895179152887090',
  '7606919389925239780', '7612311992154917440', '7616680592914074921', '7624906461545666169', '7634100656177007924', '7636035442853583077',
  '7640722950077396980', '7642639322583158058', '7651228462161743138', '7654911476955999626', '7668181130974088083', '7672609087318376369',
  '7676695479275549897', '7679087461556833574', '7680357885699788058', '7684760730989707371', '7688690670274743222', '7692319419300597038',
  '7693435263065820454', '7695331866462670121', '7459322554898058548', '7584289750798978350', '7701948048470126002', '7072646578548264228',
  '7473433780095683855', '7518939730127867196', '7035554062481247518', '7046752821533855015', '7487889791380393256', '7599610052949065393',
  '7213942101678066978', '7632216271102233919', '7393270910456712488', '7551296315893255482', '7585209451914300730', '7468975066361941274',
  '7538736414276472079', '7392818768931523866', '7153462985627815182', '7479285536914459963', '7291658735305411892', '7515405033110768896',
  '7574637073722838322', '7620711268755705138', '7445984982583086370', '7702731675469500518', '7392567979466181929', '7598133654883274025',
  '7366087192516595007', '7589492176724233498', '7240402911853825280', '7219195234373193016', '7185322281663532347', '7195377400945954082',
  '7652197811265539363', '7159190210713095463', '7342094814004956431', '7351290833548692745', '7701877218657837523', '7471892238444858684',
  '7224498402858470717', '7446350446710508811', '7520171416537271587', '6915350090869656839',   '7362121650080468233'
  ];
  const TARGET_SET = new Set(TARGET_IDS);

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function realCover(a) {
    var img = a.querySelector('img'); if (!img) return '';
    var c = [];
    ['data-src', 'data-lazy-src', 'data-actualsrc', 'data-original', 'data-echo'].forEach(function (x) { var v = img.getAttribute(x); if (v) c.push(v); });
    if (img.getAttribute('srcset')) { var s = img.getAttribute('srcset').trim().split(/\s+/); c.push(s[0].split(' ')[0]); }
    if (img.currentSrc) c.push(img.currentSrc);
    c.push(img.src);
    var el = a; while (el) { var bi = ''; try { bi = getComputedStyle(el).backgroundImage; } catch (e) {}
      var mm = bi && bi.match(/url\(['"]?(https?:[^\s'"]+)/); if (mm) c.push(mm[1]); el = el.parentElement; }
    for (var i = 0; i < c.length; i++) { var u = (c[i] || '').trim(); if (!u) continue; if (u.indexOf('data:') === 0) continue; if (/placeholder|gray|1x1|blank|\/placeholder|\.gif|loading|spinner|lazy/i.test(u)) continue; return u.charAt(0) === '/' && u.charAt(1) === '/' ? 'https:' + u : u; }
    return '';
  }

  // 滚动：覆盖 window、document 与「所有可滚动元素」（抖音收藏页是 SPA，真正滚动容器在内部 div，
  // 旧版只滚 window 导致根本没滚到底、只加载了初始一屏）。
  function scrollAll() {
    try { window.scrollTo(0, document.body.scrollHeight); } catch (e) {}
    var se = document.scrollingElement || document.documentElement;
    if (se) { try { se.scrollTop = se.scrollHeight; } catch (e) {} }
    var all = document.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      try { if (el.scrollHeight > el.clientHeight + 4) el.scrollTop = el.scrollHeight; } catch (e) {}
    }
  }

  // （旧版「导出全部已加载卡片」用的 collectLines 已随多余按钮移除；封面抓取现全部在 runFocus 内完成。）

  // 焦点模式 v1.4：边滚动边抓取。
  // 抖音收藏页是懒加载 + 可能虚拟列表，不能「先滚完再扫全部」（滚完后 DOM 只剩视口附近卡片）。
  // 改为每轮滚动 → 扫描当前 DOM 中匹配目标的卡片 → 立即抓封面并记录；未加载的滚入视口触发懒加载下轮再试。
  async function runFocus(btn, status) {
    if (btn.dataset.busy === '1') return;
    btn.dataset.busy = '1';
    var total = TARGET_IDS.length;
    var captured = {};
    var remaining = new Set(TARGET_IDS);
    var rounds = 0, lastH = -1, stale = 0, maxStale = 16;
    var done = function () { return total - remaining.size; };
    btn.textContent = '抓取中…'; btn.style.opacity = '0.75';
    status.textContent = '开始：目标 ' + total + ' 个，已抓 0';

    while (remaining.size > 0 && rounds < 900) {
      scrollAll();
      rounds++;
      var nodes = document.querySelectorAll('a[href*="/video/"], a[href*="/note/"]');
      for (var i = 0; i < nodes.length; i++) {
        var a = nodes[i];
        var m = a.href.match(/video\/(\d+)/) || a.href.match(/note\/(\d+)/);
        if (!m) continue;
        var id = m[1];
        if (!remaining.has(id)) continue;
        var url = '';
        for (var w = 0; w < 4; w++) {
          url = realCover(a);
          if (url) break;
          a.scrollIntoView({ block: 'center' });
          await sleep(500);
        }
        if (url) { captured[id] = url; remaining.delete(id); }
      }
      status.textContent = '滚动第' + rounds + '轮 · 已抓 ' + done() + '/' + total + ' · 剩余 ' + remaining.size;
      var h = (document.scrollingElement || document.documentElement).scrollHeight;
      if (h === lastH) stale++; else stale = 0;
      lastH = h;
      if (stale >= maxStale) break;
      await sleep(1100);
    }

    var out = Object.keys(captured).map(function (id) { return id + '|' + captured[id]; });
    if (out.length) {
      var blob = new Blob([out.join('\n')], { type: 'text/plain' });
      var u = URL.createObjectURL(blob);
      var x = document.createElement('a'); x.href = u; x.download = 'covers.txt';
      document.body.appendChild(x); x.click();
      setTimeout(function () { try { URL.revokeObjectURL(u); } catch (e) {} if (x.parentNode) x.parentNode.removeChild(x); }, 1000);
    }
    var msg = '焦点模式完成：\n匹配到 ' + out.length + ' / ' + total + ' 个缺失封面' + (out.length ? '，已导出 covers.txt' : '（本次无导出）');
    if (remaining.size > 0) {
      msg += '\n\n仍未匹配 ' + remaining.size + ' 个：很可能已不在收藏夹（或图文/note 未渲染），服务端无法补，可保留占位卡。';
    } else {
      msg += '\n\n全部缺失封面已抓到！';
    }
    alert(msg);
    status.textContent = '完成：匹配 ' + out.length + '/' + total;
    btn.dataset.busy = '0'; btn.textContent = '🎯 导出缺失封面'; btn.style.opacity = '1';
  }

  // 仅保留「焦点模式」一个入口：自动滚动 + 边滚边抓缺失封面 + 导出。
  // （旧版的「导出封面」「📜 滚动并导出」两个按钮已合并进此模式，避免按钮过多。）

  var churnIv = null, churnObs = null;
  function stopChurn() {
    if (churnIv) { clearInterval(churnIv); churnIv = null; }
    if (churnObs) { try { churnObs.disconnect(); } catch (e) {} churnObs = null; }
  }

  function injectButton() {
    if (document.getElementById('dyCoverFocus')) { stopChurn(); return; }
    if (!document.body) return;
    var status = document.getElementById('dyCoverStatus');
    if (!status) {
      status = document.createElement('div');
      status.id = 'dyCoverStatus';
      status.style.cssText = 'position:fixed;right:16px;bottom:60px;z-index:2147483646;max-width:260px;background:rgba(20,20,20,.88);color:#fff;padding:7px 10px;border-radius:8px;font:12px/1.5 monospace;box-shadow:0 4px 14px rgba(0,0,0,.35);pointer-events:none';
      document.body.appendChild(status);
    }

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
        if (!moved) { if (b.dataset.busy === '1') return; try { handler(b, status); } catch (err) { alert('操作出错：' + err.message); } }
      });
      document.body.appendChild(b);
      return b;
    }

    mkBtn('dyCoverFocus', '🎯 导出缺失封面', 98, function (b) { runFocus(b, status); });

    status.textContent = '缺失封面目标：' + TARGET_IDS.length + ' 个 · 点按钮开始';
  }

  injectButton();
  var t = 0;
  churnIv = setInterval(function () { injectButton(); if (++t > 60) stopChurn(); }, 500);
  try {
    churnObs = new MutationObserver(function () { injectButton(); });
    churnObs.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();
