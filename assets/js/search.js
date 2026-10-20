/* Marginalia 全站搜索 —— 无依赖客户端搜索。
 * 索引来自 Liquid 生成的 /search.json（首次打开时懒加载）。
 * 触发：header 搜索按钮 / Ctrl·⌘+K / 非输入态按 "/"。 */
(function () {
  'use strict';

  var BASE = document.documentElement.getAttribute('data-baseurl') || '';
  var TYPE_META = {
    'note':     { label: '批注',     cls: 'note' },
    'ai-hot':   { label: 'AI Hot',  cls: 'hot' },
    'video':    { label: '视频',     cls: 'video' },
    'game':     { label: '游戏',     cls: 'game' },
    'showcase': { label: 'Showcase', cls: 'show' },
    'app':      { label: 'App',      cls: 'app' }
  };
  var TYPE_ORDER = ['note', 'showcase', 'app', 'video', 'game', 'ai-hot'];

  var index = null, loading = null;
  var modal, input, results, hint;
  var activeIdx = -1, flatItems = [];
  var typeFilter = '';

  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (!loading) {
      loading = fetch(BASE + '/search.json')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          index = data.filter(Boolean).map(function (d) {
            d._title = (d.title || '').toLowerCase();
            d._tags = (d.tags || []).join(' ').toLowerCase();
            d._desc = (d.desc || '').toLowerCase();
            d._body = (d.body || '').toLowerCase();
            return d;
          });
          return index;
        });
    }
    return loading;
  }

  /* ---- scoring: all tokens must hit somewhere; weighted by field ---- */
  function scoreItem(item, tokens) {
    var total = 0;
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i], s = 0;
      var pt = item._title.indexOf(t);
      if (pt !== -1) s += 60 - Math.min(pt, 30);
      if (item._tags.indexOf(t) !== -1) s += 30;
      if (item._desc.indexOf(t) !== -1) s += 14;
      if (item._body.indexOf(t) !== -1) s += 7;
      if (!s) return 0;
      total += s;
    }
    return total;
  }

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function highlight(text, tokens) {
    if (!text) return '';
    var lower = text.toLowerCase(), marks = [];
    tokens.forEach(function (t) {
      var from = 0, p;
      while ((p = lower.indexOf(t, from)) !== -1 && marks.length < 40) {
        marks.push([p, p + t.length]); from = p + t.length;
      }
    });
    if (!marks.length) return esc(text);
    marks.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [marks[0]];
    for (var i = 1; i < marks.length; i++) {
      var last = merged[merged.length - 1];
      if (marks[i][0] <= last[1]) last[1] = Math.max(last[1], marks[i][1]);
      else merged.push(marks[i]);
    }
    var out = '', pos = 0;
    merged.forEach(function (m) {
      out += esc(text.slice(pos, m[0])) + '<mark>' + esc(text.slice(m[0], m[1])) + '</mark>';
      pos = m[1];
    });
    return out + esc(text.slice(pos));
  }

  /* body snippet centered on the first token hit */
  function snippet(item, tokens) {
    var body = item.body || '';
    if (!body) return item.desc || '';
    var lower = item._body, best = -1;
    for (var i = 0; i < tokens.length; i++) {
      var p = lower.indexOf(tokens[i]);
      if (p !== -1 && (best === -1 || p < best)) best = p;
    }
    if (best === -1) return item.desc || '';
    var start = Math.max(0, best - 40);
    var cut = body.slice(start, start + 140);
    return (start > 0 ? '…' : '') + cut + '…';
  }

  function render(query) {
    var q = query.trim().toLowerCase();
    activeIdx = -1; flatItems = [];
    if (!q) {
      results.innerHTML = '';
      hint.hidden = false;
      return;
    }
    var tokens = q.split(/\s+/).filter(Boolean).slice(0, 6);
    var scored = [];
    index.forEach(function (item) {
      if (typeFilter && item.type !== typeFilter) return;
      var s = scoreItem(item, tokens);
      if (s > 0) scored.push([s, item]);
    });
    scored.sort(function (a, b) { return b[0] - a[0] || (a[1].date < b[1].date ? 1 : -1); });
    scored = scored.slice(0, 50);

    hint.hidden = true;
    if (!scored.length) {
      results.innerHTML = '<p class="ms-empty">没有找到「' + esc(query) + '」。换个词试试？</p>';
      return;
    }

    var groups = {};
    scored.forEach(function (pair) { (groups[pair[1].type] = groups[pair[1].type] || []).push(pair[1]); });
    var html = '';
    TYPE_ORDER.forEach(function (type) {
      var list = groups[type];
      if (!list) return;
      var meta = TYPE_META[type];
      html += '<div class="ms-group"><div class="ms-group-label">' + meta.label +
              ' <span>' + list.length + '</span></div>';
      list.forEach(function (item) {
        var i = flatItems.length;
        flatItems.push(item);
        html += '<a class="ms-item" data-i="' + i + '" href="' + esc(item.url) + '">' +
          '<span class="ms-badge ms-badge--' + meta.cls + '">' + meta.label + '</span>' +
          '<span class="ms-item-main">' +
            '<span class="ms-item-title">' + highlight(item.title, tokens) + '</span>' +
            '<span class="ms-item-desc">' + highlight(snippet(item, tokens), tokens) + '</span>' +
          '</span>' +
          '<span class="ms-item-date">' + (item.date || '') + '</span>' +
        '</a>';
      });
      html += '</div>';
    });
    results.innerHTML = html;
  }

  function setActive(i) {
    var items = results.querySelectorAll('.ms-item');
    if (!items.length) return;
    if (activeIdx >= 0 && items[activeIdx]) items[activeIdx].classList.remove('active');
    activeIdx = (i + items.length) % items.length;
    items[activeIdx].classList.add('active');
    items[activeIdx].scrollIntoView({ block: 'nearest' });
  }

  /* ---- modal ---- */
  function buildModal() {
    modal = document.createElement('div');
    modal.className = 'ms-overlay';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="ms-modal" role="dialog" aria-modal="true" aria-label="全站搜索">' +
        '<div class="ms-head">' +
          '<span class="ms-glyph">¶</span>' +
          '<input class="ms-input" type="search" placeholder="搜索批注、晨报、视频、游戏、应用…" ' +
                 'autocomplete="off" autocorrect="off" spellcheck="false">' +
          '<button class="ms-close" aria-label="关闭">Esc</button>' +
        '</div>' +
        '<div class="ms-filters">' +
          '<button class="ms-chip active" data-type="">全部</button>' +
          TYPE_ORDER.map(function (t) {
            return '<button class="ms-chip" data-type="' + t + '">' + TYPE_META[t].label + '</button>';
          }).join('') +
        '</div>' +
        '<div class="ms-results"></div>' +
        '<p class="ms-hint">输入即搜 · <kbd>↑</kbd><kbd>↓</kbd> 选择 · <kbd>Enter</kbd> 打开 · <kbd>Esc</kbd> 关闭</p>' +
      '</div>';
    document.body.appendChild(modal);

    input = modal.querySelector('.ms-input');
    results = modal.querySelector('.ms-results');
    hint = modal.querySelector('.ms-hint');

    modal.addEventListener('mousedown', function (e) { if (e.target === modal) close(); });
    modal.querySelector('.ms-close').addEventListener('click', close);
    modal.querySelectorAll('.ms-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        modal.querySelectorAll('.ms-chip').forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        typeFilter = chip.getAttribute('data-type');
        render(input.value);
        input.focus();
      });
    });
    input.addEventListener('input', function () { render(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIdx + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIdx - 1); }
      else if (e.key === 'Enter') {
        var items = results.querySelectorAll('.ms-item');
        var el = items[activeIdx >= 0 ? activeIdx : 0];
        if (el) window.location.href = el.getAttribute('href');
      }
    });
  }

  function open() {
    if (!modal) buildModal();
    modal.hidden = false;
    document.body.classList.add('ms-lock');
    requestAnimationFrame(function () { modal.classList.add('in'); input.focus(); });
    loadIndex().then(function () { render(input.value); });
  }
  function close() {
    if (!modal) return;
    modal.classList.remove('in');
    document.body.classList.remove('ms-lock');
    setTimeout(function () { modal.hidden = true; }, 160);
  }

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); toggle(); return; }
    if (modal && !modal.hidden && e.key === 'Escape') { close(); return; }
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault(); open();
    }
  });
  function toggle() { (modal && !modal.hidden) ? close() : open(); }

  document.querySelectorAll('[data-search-open]').forEach(function (btn) {
    btn.addEventListener('click', function (e) { e.preventDefault(); open(); });
  });
})();
