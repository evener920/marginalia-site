/* Marginalia 通用分类筛选 + 可选分页 —— 作用于已渲染的 DOM 列表（研究报告 / Showcases / Videos / Games）。
 * 筛选：根容器 [data-filter] 内含
 *   - 一个 chip 条容器 [data-filter-chips]（JS 填充，复用 .ms-chip 样式）
 *   - 若干带 data-cats="分类A,分类B" 的条目元素
 * 可选：根上 data-filter-order="A,B,C" 指定 chip 顺序；data-filter-all 改「全部」文案。
 * 可选分页：根上设 data-page-size="18" 且内含 [data-filter-pager] 容器即启用分页。
 *   分页只在「筛选后可见」的条目上生效，切换分类时回到第 1 页。
 * 点 chip → 显隐 + 更新 URL ?cat=；点页码 → 更新 URL ?page=。零依赖。 */
(function () {
  'use strict';

  function norm(s) { return String(s).trim(); }

  document.querySelectorAll('[data-filter]').forEach(function (root) {
    var chipsEl = root.querySelector('[data-filter-chips]');
    if (!chipsEl) return;
    var items = Array.prototype.slice.call(root.querySelectorAll('[data-cats]'));
    if (!items.length) return;

    var allLabel = root.getAttribute('data-filter-all') || '全部';

    /* 分页配置：仅当根上显式设了 data-page-size 且存在 pager 容器时启用 */
    var pageSize = parseInt(root.getAttribute('data-page-size'), 10);
    var pagerEl = root.querySelector('[data-filter-pager]');
    var paginateOn = !!(pageSize > 0 && pagerEl);

    /* gather categories (+counts), preserve a stable order */
    var order = (root.getAttribute('data-filter-order') || '')
      .split(',').map(norm).filter(Boolean);
    var counts = {};
    items.forEach(function (it) {
      catsOf(it).forEach(function (c) { counts[c] = (counts[c] || 0) + 1; });
    });
    var cats = order.filter(function (c) { return counts[c]; });
    Object.keys(counts).forEach(function (c) { if (cats.indexOf(c) < 0) cats.push(c); });

    /* state from URL */
    var state = '';
    (function () {
      var p = new URLSearchParams(location.search).get('cat');
      if (p && counts[p]) state = p;
    })();
    var page = 1;
    if (paginateOn) {
      var pInit = parseInt(new URLSearchParams(location.search).get('page'), 10);
      if (pInit > 0) page = pInit;
    }

    var emptyEl = document.createElement('p');
    emptyEl.className = 'mg-filter-empty';
    emptyEl.textContent = '这个分类下暂时没有内容。';
    emptyEl.hidden = true;
    (items[0].parentNode || root).appendChild(emptyEl);

    function catsOf(it) {
      return (it.getAttribute('data-cats') || '').split(',').map(norm).filter(Boolean);
    }

    function renderChips() {
      var html = chip('', allLabel, items.length);
      cats.forEach(function (c) { html += chip(c, c, counts[c]); });
      chipsEl.innerHTML = html;
      chipsEl.querySelectorAll('.ms-chip').forEach(function (b) {
        b.addEventListener('click', function () { apply(b.getAttribute('data-cat')); });
      });
    }
    function chip(val, label, n) {
      return '<button class="ms-chip' + (state === val ? ' active' : '') +
        '" data-cat="' + escAttr(val) + '">' + escHtml(label) + ' <span>' + n + '</span></button>';
    }

    function apply(cat) {
      state = cat || '';
      var shown = 0;
      items.forEach(function (it) {
        var ok = !state || catsOf(it).indexOf(state) >= 0;
        if (ok) { it.removeAttribute('data-filter-hidden'); shown++; }
        else { it.setAttribute('data-filter-hidden', ''); }
      });
      emptyEl.hidden = shown !== 0;
      chipsEl.querySelectorAll('.ms-chip').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-cat') === state);
      });
      var p = new URLSearchParams(location.search);
      if (state) p.set('cat', state); else p.delete('cat');
      var qs = p.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);

      if (paginateOn) { page = 1; paginate(); }
    }

    /* ---- 分页 ---- */
    function paginate() {
      if (!paginateOn) return;
      var visible = items.filter(function (it) { return !it.hasAttribute('data-filter-hidden'); });
      var total = visible.length;
      var pages = Math.max(1, Math.ceil(total / pageSize));
      if (page > pages) page = pages;
      if (page < 1) page = 1;
      visible.forEach(function (it, i) {
        var onPage = i >= (page - 1) * pageSize && i < page * pageSize;
        if (onPage) it.removeAttribute('data-page-hidden');
        else it.setAttribute('data-page-hidden', '');
      });
      renderPager(total, pages);
    }

    function renderPager(total, pages) {
      if (!pagerEl) return;
      if (!total || pages <= 1) { pagerEl.innerHTML = ''; return; }
      var html = '<nav class="videos-pager" aria-label="分页">';
      html += pagerBtn('prev', page > 1, '‹ 上一页');
      pageWindow(page, pages).forEach(function (n) {
        if (n === '…') html += '<span class="v-pager-gap">…</span>';
        else html += '<button class="v-pager-num' + (n === page ? ' active' : '') + '" data-page="' + n + '">' + n + '</button>';
      });
      html += pagerBtn('next', page < pages, '下一页 ›');
      html += '<span class="v-pager-info">' + total + ' 条 · 第 ' + page + '/' + pages + ' 页</span>';
      html += '</nav>';
      pagerEl.innerHTML = html;
      pagerEl.querySelectorAll('[data-page]').forEach(function (b) {
        b.addEventListener('click', function () {
          var np = parseInt(b.getAttribute('data-page'), 10);
          if (np) goPage(np);
        });
      });
    }
    function pagerBtn(kind, enabled, label) {
      var target = kind === 'prev' ? page - 1 : page + 1;
      return '<button class="v-pager-btn' + (enabled ? '' : ' disabled') + '" data-page="' + target + '"' +
        (enabled ? '' : ' disabled') + '>' + label + '</button>';
    }
    function pageWindow(cur, pages) {
      if (pages <= 7) {
        var all = [];
        for (var i = 1; i <= pages; i++) all.push(i);
        return all;
      }
      var out = [1];
      if (cur - 2 > 2) out.push('…');
      for (var j = Math.max(2, cur - 2); j <= Math.min(pages - 1, cur + 2); j++) out.push(j);
      if (cur + 2 < pages - 1) out.push('…');
      out.push(pages);
      return out;
    }
    function goPage(p) {
      page = p || 1;
      paginate();
      var q = new URLSearchParams(location.search);
      if (page > 1) q.set('page', page); else q.delete('page');
      var qs = q.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    }

    function escHtml(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
    function escAttr(s) { return String(s).replace(/"/g, '&quot;'); }

    renderChips();
    if (state) apply(state);
    else if (paginateOn) paginate();
  });
})();
