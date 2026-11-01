// ==UserScript==
// @name         抖音收藏封面导出 · marginalia
// @namespace    https://marginalia.201573.xyz
// @version      1.2
// @description  在抖音收藏页注入浮动按钮：①「导出封面」导出当前已加载卡片；②「📜 滚动并导出」自动滚到底再导出全部；③「🎯 导出缺失封面」焦点模式——自动滚底后只抓取 marginalia 站点仍缺封面的视频（id 内嵌），逐张等懒加载完成，实时显示「已匹配 X/N」。纯本地 DOM，不受抖音 CSP 影响。
// @match        https://www.douyin.com/*
// @match        https://douyin.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // === 内嵌：marginalia 站点当前缺失封面的视频 id（由 fetch_covers 流程生成）===
  const TARGET_IDS = ['7122063277139561728',
  '7211850554014829836',
  '7293730851899198783',
  '7294814602922085669',
  '7421059765163347226',
  '7457126178004946216',
  '7524600861231975737',
  '7532864745775303971',
  '7533194974771399951',
  '7536866693575789878',
  '7538336658828152074',
  '7554937556514852134',
  '7574729688447208755',
  '7585056719342390547',
  '7595895179152887090',
  '7606919389925239780',
  '7611147538855089251',
  '7612311992154917440',
  '7613003779563019109',
  '7613884696062483706',
  '7616680592914074921',
  '7617377695857654874',
  '7618917691358087909',
  '7624906461545666169',
  '7634100656177007924',
  '7636035442853583077',
  '7638023784331768177',
  '7640722950077396980',
  '7642639322583158058',
  '7646421494525358195',
  '7649318278363483444',
  '7651228462161743138',
  '7652067298991618682',
  '7652512375048421049',
  '7654911476955999626',
  '7668181130974088083',
  '7672609087318376369',
  '7676695479275549897',
  '7679087461556833574',
  '7680357885699788058',
  '7684688241605491322',
  '7684760730989707371',
  '7686544306693955941',
  '7688690670274743222',
  '7691192213413309946',
  '7691870898333240937',
  '7692319419300597038',
  '7692995296918547365',
  '7693109188294536947',
  '7693435263065820454',
  '7695331866462670121',
  '7459322554898058548',
  '7584289750798978350',
  '7701948048470126002',
  '7072646578548264228',
  '7473433780095683855',
  '7518939730127867196',
  '7035554062481247518',
  '7046752821533855015',
  '7487889791380393256',
  '7599610052949065393',
  '7213942101678066978',
  '7632216271102233919',
  '7393270910456712488',
  '7551296315893255482',
  '7585209451914300730',
  '7468975066361941274',
  '7538736414276472079',
  '7392818768931523866',
  '7153462985627815182',
  '7479285536914459963',
  '7291658735305411892',
  '7515405033110768896',
  '7574637073722838322',
  '7620711268755705138',
  '7445984982583086370',
  '7702731675469500518',
  '7392567979466181929',
  '7598133654883274025',
  '7366087192516595007',
  '7589492176724233498',
  '7240402911853825280',
  '7219195234373193016',
  '7185322281663532347',
  '7195377400945954082',
  '7652197811265539363',
  '7159190210713095463',
  '7342094814004956431',
  '7351290833548692745',
  '7701877218657837523',
  '7471892238444858684',
  '7224498402858470717',
  '7446350446710508811',
  '7520171416537271587',
  '6915350090869656839',
  '7362121650080468233'];
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

  // 自动滚动到底部，触发抖音无限加载；高度连续 3 轮不再增长即视为到底
  function autoScroll(maxRounds, waitMs) {
    return new Promise(function (resolve) {
      var rounds = 0, stale = 0, lastH = -1;
      function scrollAll() {
        window.scrollTo(0, document.body.scrollHeight);
        var se = document.scrollingElement || document.documentElement;
        if (se) se.scrollTop = se.scrollHeight;
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
        if (stale >= 3 || rounds >= (maxRounds || 120)) {
          setTimeout(resolve, (waitMs || 700) + 600);
          return;
        }
        setTimeout(step, waitMs || 700);
      }
      step();
    });
  }

  function findCard(id) {
    return document.querySelector('a[href*="/video/' + id + '"], a[href*="/note/' + id + '"]');
  }

  // 焦点模式：只抓 TARGET_IDS 中能匹配到的卡片，逐张滚入视口等懒加载
  async function runFocus(btn, status) {
    if (btn.dataset.busy === '1') return;
    btn.dataset.busy = '1';
    var total = TARGET_IDS.length;
    status.textContent = '① 自动滚动加载全部卡片…';
    btn.textContent = '加载中…';
    btn.style.opacity = '0.75';
    await autoScroll(120, 700);
    window.scrollTo(0, 0);
    await sleep(400);

    var out = [], found = 0, notFound = [];
    for (var i = 0; i < TARGET_IDS.length; i++) {
      var id = TARGET_IDS[i];
      var a = findCard(id);
      if (!a) { notFound.push(id); status.textContent = '② 匹配中 ' + (i + 1) + '/' + total + ' · 已匹配 ' + found; await sleep(20); continue; }
      a.scrollIntoView({ block: 'center' });
      // 等懒加载：最多 2.5s 内 img 拿到真实封面
      var url = '';
      for (var w = 0; w < 5; w++) {
        await sleep(500);
        url = realCover(a);
        if (url) break;
      }
      if (url) { out.push(id + '|' + url); found++; }
      else { notFound.push(id); }
      status.textContent = '② 匹配中 ' + (i + 1) + '/' + total + ' · 已匹配 ' + found;
      await sleep(120);
    }

    var txt = out.join('\n');
    if (out.length) {
      var blob = new Blob([txt], { type: 'text/plain' });
      var u = URL.createObjectURL(blob);
      var x = document.createElement('a');
      x.href = u; x.download = 'covers.txt';
      document.body.appendChild(x); x.click();
      setTimeout(function () { try { URL.revokeObjectURL(u); } catch (e) {} if (x.parentNode) x.parentNode.removeChild(x); }, 1000);
    }
    var msg = '焦点模式完成：\n匹配到 ' + found + ' / ' + total + ' 个缺失封面并导出 covers.txt';
    if (notFound.length) msg += '\n\n未匹配 ' + notFound.length + ' 个——多半已不在当前收藏夹（或图文/note 类未渲染），这部分无法补。';
    alert(msg);
    status.textContent = '完成：匹配 ' + found + '/' + total + (notFound.length ? '，缺失 ' + notFound.length : '');
    btn.dataset.busy = '0';
    btn.textContent = '🎯 导出缺失封面';
    btn.style.opacity = '1';
  }

  function collectLines() {
    var qa = function (s) { return [].slice.call(document.querySelectorAll(s)); };
    var lines = [], seen = {};
    qa('a[href*="/video/"]').forEach(function (a) {
      var m = a.href.match(/video\/(\d+)/); if (!m) return;
      var id = m[1]; if (seen[id]) return; seen[id] = 1;
      var cov = realCover(a); if (cov) lines.push(id + '|' + cov);
    });
    qa('a[href*="/note/"]').forEach(function (a) {
      var m = a.href.match(/note\/(\d+)/); if (!m) return;
      var id = m[1]; if (seen[id]) return; seen[id] = 1;
      var cov = realCover(a); if (cov) lines.push(id + '|' + cov);
    });
    return lines;
  }

  function runExport(btn) {
    if (btn.dataset.busy === '1') return;
    btn.dataset.busy = '1';
    btn.textContent = '导出中 ⏳'; btn.style.opacity = '0.75';
    var lines = collectLines();
    var txt = lines.join('\n');
    var blob = new Blob([txt], { type: 'text/plain' });
    var u = URL.createObjectURL(blob);
    var x = document.createElement('a'); x.href = u; x.download = 'covers.txt';
    document.body.appendChild(x); x.click();
    setTimeout(function () { try { URL.revokeObjectURL(u); } catch (e) {} if (x.parentNode) x.parentNode.removeChild(x); }, 1000);
    alert('已导出 ' + lines.length + ' 条封面到 covers.txt');
    btn.dataset.busy = '0'; btn.textContent = '导出封面'; btn.style.opacity = '1';
  }

  function runAuto(btn) {
    if (btn.dataset.busy === '1') return;
    btn.dataset.busy = '1';
    btn.textContent = '滚动加载中…(0)'; btn.style.opacity = '0.75';
    var n = 0; var tip = setInterval(function () { btn.textContent = '滚动加载中…(' + (++n) + ')'; }, 1000);
    autoScroll(120, 700).then(function () {
      clearInterval(tip); btn.textContent = '导出中 ⏳';
      var lines = collectLines();
      var txt = lines.join('\n');
      var blob = new Blob([txt], { type: 'text/plain' });
      var u = URL.createObjectURL(blob);
      var x = document.createElement('a'); x.href = u; x.download = 'covers.txt';
      document.body.appendChild(x); x.click();
      setTimeout(function () { try { URL.revokeObjectURL(u); } catch (e) {} if (x.parentNode) x.parentNode.removeChild(x); }, 1000);
      alert('自动滚动完成，已导出 ' + lines.length + ' 条封面到 covers.txt');
      btn.dataset.busy = '0'; btn.textContent = '📜 滚动并导出'; btn.style.opacity = '1';
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
        if (!moved) { if (b.dataset.busy === '1') return; try { handler(b); } catch (err) { alert('操作出错：' + err.message); } }
      });
      document.body.appendChild(b);
      return b;
    }

    mkBtn('dyCoverBtn', '导出封面', 210, runExport);
    mkBtn('dyCoverAuto', '📜 滚动并导出', 154, runAuto);
    mkBtn('dyCoverFocus', '🎯 导出缺失封面', 98, function (b) { runFocus(b, status); });

    var status = document.createElement('div');
    status.id = 'dyCoverStatus';
    status.style.cssText = 'position:fixed;right:16px;bottom:60px;z-index:2147483646;max-width:260px;background:rgba(20,20,20,.88);color:#fff;padding:7px 10px;border-radius:8px;font:12px/1.5 monospace;box-shadow:0 4px 14px rgba(0,0,0,.35);pointer-events:none';
    status.textContent = '缺失封面目标：' + TARGET_IDS.length + ' 个';
    document.body.appendChild(status);
  }

  injectButton();
  var t = 0;
  var iv = setInterval(function () { injectButton(); if (++t > 60) clearInterval(iv); }, 500);
  try {
    var obs = new MutationObserver(function () { injectButton(); });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();
