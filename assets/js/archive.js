/* Marginalia 索引页 —— 标签词云（canvas 螺旋布局）+ 类型/标签过滤 + 按年时间线。
 * 数据来自页内 #archive-data（Liquid 构建期生成），零网络请求、零依赖。 */
(function () {
  'use strict';

  var raw = document.getElementById('archive-data');
  if (!raw) return;
  var items = JSON.parse(raw.textContent).filter(Boolean);
  items.sort(function (a, b) { return a.date < b.date ? 1 : -1; });

  var TYPE_META = {
    'note':     { label: '批注',     cls: 'note' },
    'ai-hot':   { label: 'AI Hot',  cls: 'hot' },
    'video':    { label: '视频',     cls: 'video' },
    'game':     { label: '游戏',     cls: 'game' },
    'showcase': { label: 'Showcase', cls: 'show' },
    'app':      { label: 'App',      cls: 'app' }
  };
  var TYPE_ORDER = ['note', 'ai-hot', 'video', 'game', 'showcase', 'app'];
  var HOUSEKEEPING = { 'ai-hot': 1, 'ai-morning-post': 1, 'daily': 1 };

  var state = { type: '', tag: '' };
  (function fromURL() {
    var p = new URLSearchParams(location.search);
    state.type = p.get('type') || '';
    state.tag = p.get('tag') || '';
  })();

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function normTag(t) { return String(t).toLowerCase().replace(/\s+/g, '-'); }

  /* ---- tag aggregation ---- */
  var tagMap = {};   // key -> {display, count, key}
  items.forEach(function (it) {
    (it.tags || []).forEach(function (t) {
      var key = normTag(t);
      if (HOUSEKEEPING[key]) return;
      if (!tagMap[key]) tagMap[key] = { key: key, display: t, count: 0 };
      tagMap[key].count++;
    });
  });
  var words = Object.keys(tagMap).map(function (k) { return tagMap[k]; });
  words.sort(function (a, b) { return b.count - a.count; });
  words = words.slice(0, 64);

  /* =====================  word cloud  ===================== */
  var canvas = document.getElementById('tag-cloud');
  var boxes = [];        // {x,y,w,h, word, size, color, vertical}
  var hoverKey = null;

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  /* deterministic pseudo-random so the cloud is stable between paints */
  function lcg(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function layoutCloud() {
    if (!canvas) return;
    var wrap = canvas.parentElement;
    var W = wrap.clientWidth;
    var H = Math.max(260, Math.min(420, Math.round(W * 0.38)));
    var dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var ink = cssVar('--ink') || '#1f1d1b';
    var soft = cssVar('--ink-soft') || '#4a443e';
    var muted = cssVar('--muted') || '#8a7f73';
    var accent = cssVar('--accent') || '#8b2e2a';
    var serif = 'Georgia, "Songti SC", "Noto Serif CJK SC", serif';

    var maxC = words.length ? words[0].count : 1;
    var minC = words.length ? words[words.length - 1].count : 1;
    var minS = W < 560 ? 13 : 15;
    var maxS = W < 560 ? 38 : 52;
    var rnd = lcg(words.length * 2654435761 + W);

    boxes = [];
    ctx.clearRect(0, 0, W, H);
    var cx = W / 2, cy = H / 2;

    words.forEach(function (w, idx) {
      var t = maxC === minC ? 1 : (w.count - minC) / (maxC - minC);
      var size = Math.round(minS + (maxS - minS) * Math.sqrt(t));
      var vertical = /^[一-鿿·]+$/.test(w.display) && w.display.length <= 5 && rnd() < 0.22 && idx > 2;
      ctx.font = (idx < 3 ? '700 ' : '400 ') + size + 'px ' + serif;
      var m = ctx.measureText(w.display);
      var tw = m.width, th = size * 1.12;
      var bw = vertical ? th : tw, bh = vertical ? tw : th;

      /* archimedean spiral placement */
      var placed = false, theta = rnd() * 6.28, step = 0.32, r = 0;
      for (var i = 0; i < 900 && !placed; i++) {
        theta += step; r = 2.2 * theta;
        var x = cx + r * 1.55 * Math.cos(theta) - bw / 2;
        var y = cy + r * 0.85 * Math.sin(theta) - bh / 2;
        if (x < 4 || y < 4 || x + bw > W - 4 || y + bh > H - 4) continue;
        var hit = false;
        for (var j = 0; j < boxes.length; j++) {
          var b = boxes[j];
          if (x < b.x + b.w + 5 && x + bw + 5 > b.x && y < b.y + b.h + 5 && y + bh + 5 > b.y) { hit = true; break; }
        }
        if (!hit) {
          var color = idx < 3 ? accent : (w.count > 1 ? (idx % 3 ? soft : ink) : muted);
          boxes.push({ x: x, y: y, w: bw, h: bh, word: w, size: size, color: color, bold: idx < 3, vertical: vertical });
          placed = true;
        }
      }
    });
    drawCloud();
  }

  function drawCloud() {
    var dpr = window.devicePixelRatio || 1;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    var accentSoft = cssVar('--accent-soft') || '#b8615c';
    var accent = cssVar('--accent') || '#8b2e2a';
    var serif = 'Georgia, "Songti SC", "Noto Serif CJK SC", serif';
    boxes.forEach(function (b) {
      var active = state.tag && normTag(state.tag) === b.word.key;
      var hovered = hoverKey === b.word.key;
      ctx.save();
      ctx.font = (b.bold || active ? '700 ' : '400 ') + b.size + 'px ' + serif;
      ctx.fillStyle = active ? accent : hovered ? accentSoft : b.color;
      ctx.textBaseline = 'top';
      if (b.vertical) {
        ctx.translate(b.x + b.w, b.y);
        ctx.rotate(Math.PI / 2);
        ctx.fillText(b.word.display, 0, 0);
      } else {
        ctx.fillText(b.word.display, b.x, b.y + b.h * 0.06);
      }
      if (active || hovered) {
        ctx.strokeStyle = accent; ctx.lineWidth = 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + b.h + 2.5); ctx.lineTo(b.x + b.w, b.y + b.h + 2.5);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  function cloudHit(e) {
    var r = canvas.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    for (var i = boxes.length - 1; i >= 0; i--) {
      var b = boxes[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  }

  if (canvas) {
    canvas.addEventListener('mousemove', function (e) {
      var b = cloudHit(e);
      var key = b ? b.word.key : null;
      canvas.style.cursor = b ? 'pointer' : 'default';
      if (key !== hoverKey) { hoverKey = key; drawCloud(); }
    });
    canvas.addEventListener('mouseleave', function () { if (hoverKey) { hoverKey = null; drawCloud(); } });
    canvas.addEventListener('click', function (e) {
      var b = cloudHit(e);
      if (!b) return;
      state.tag = state.tag && normTag(state.tag) === b.word.key ? '' : b.word.display;
      update();
    });
    var rTimer;
    window.addEventListener('resize', function () { clearTimeout(rTimer); rTimer = setTimeout(layoutCloud, 180); });
    document.addEventListener('mg:theme', layoutCloud);
  }

  /* =====================  filters + list  ===================== */
  var chipsEl = document.getElementById('type-chips');
  var activeEl = document.getElementById('active-filters');
  var listEl = document.getElementById('archive-list');

  var counts = { '': items.length };
  items.forEach(function (it) { counts[it.type] = (counts[it.type] || 0) + 1; });

  function renderChips() {
    var html = '<button class="ms-chip' + (state.type === '' ? ' active' : '') + '" data-type="">全部 <span>' + counts[''] + '</span></button>';
    TYPE_ORDER.forEach(function (t) {
      if (!counts[t]) return;
      html += '<button class="ms-chip' + (state.type === t ? ' active' : '') + '" data-type="' + t + '">' +
              TYPE_META[t].label + ' <span>' + counts[t] + '</span></button>';
    });
    chipsEl.innerHTML = html;
    chipsEl.querySelectorAll('.ms-chip').forEach(function (c) {
      c.addEventListener('click', function () {
        state.type = c.getAttribute('data-type');
        update();
      });
    });
  }

  function renderActive() {
    if (!state.tag) { activeEl.hidden = true; activeEl.innerHTML = ''; return; }
    activeEl.hidden = false;
    activeEl.innerHTML = '过滤标签：<button class="archive-tagpill">#' + esc(state.tag) + ' <span aria-hidden="true">×</span></button>';
    activeEl.querySelector('button').addEventListener('click', function () { state.tag = ''; update(); });
  }

  function matches(it) {
    if (state.type && it.type !== state.type) return false;
    if (state.tag) {
      var k = normTag(state.tag), ok = false;
      (it.tags || []).forEach(function (t) { if (normTag(t) === k) ok = true; });
      if (!ok) return false;
    }
    return true;
  }

  function renderList() {
    var filtered = items.filter(matches);
    if (!filtered.length) {
      listEl.innerHTML = '<p class="empty-state">这个组合下没有内容。清掉一个过滤条件试试。</p>';
      return;
    }
    var html = '', curYear = '';
    filtered.forEach(function (it) {
      var y = it.date.slice(0, 4);
      if (y !== curYear) {
        if (curYear) html += '</ol>';
        curYear = y;
        html += '<h2 class="archive-year">' + y + '</h2><ol class="archive-rows" role="list">';
      }
      var meta = TYPE_META[it.type];
      var ext = /^https?:/.test(it.url) ? ' target="_blank" rel="noopener"' : '';
      html += '<li class="archive-row">' +
        '<span class="archive-date">' + it.date.slice(5).replace('-', '·') + '</span>' +
        '<span class="ms-badge ms-badge--' + meta.cls + '">' + meta.label + '</span>' +
        '<span class="archive-main">' +
          '<a class="archive-title" href="' + esc(it.url) + '"' + ext + '>' + esc(it.title) + '</a>' +
          (it.desc && it.type !== 'ai-hot' ? '<span class="archive-desc">' + esc(it.desc) + '</span>' : '') +
          tagsInline(it) +
        '</span>' +
      '</li>';
    });
    html += '</ol>';
    listEl.innerHTML = html;
    listEl.querySelectorAll('[data-tag]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.tag = b.getAttribute('data-tag');
        update();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function tagsInline(it) {
    var ts = (it.tags || []).filter(function (t) { return !HOUSEKEEPING[normTag(t)]; });
    if (!ts.length) return '';
    return '<span class="archive-tags">' + ts.slice(0, 6).map(function (t) {
      return '<button data-tag="' + esc(t) + '">#' + esc(t) + '</button>';
    }).join('') + '</span>';
  }

  function syncURL() {
    var p = new URLSearchParams();
    if (state.type) p.set('type', state.type);
    if (state.tag) p.set('tag', state.tag);
    var qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  function update() {
    renderChips(); renderActive(); renderList(); syncURL();
    if (canvas) drawCloud();
  }

  update();
  layoutCloud();
})();
