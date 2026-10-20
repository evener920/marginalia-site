/* Marginalia 通用分类筛选 —— 作用于已渲染的 DOM 列表（研究报告 / Showcases / Videos / Games）。
 * 用法：一个根容器 [data-filter] 内含
 *   - 一个 chip 条容器 [data-filter-chips]（JS 填充，复用 .ms-chip 样式）
 *   - 若干带 data-cats="分类A,分类B" 的条目元素
 * 可选：根上 data-filter-order="A,B,C" 指定 chip 顺序；data-filter-all 改「全部」文案。
 * 点 chip → 显隐 + 更新 URL ?cat=。零依赖，参照 archive.js 的过滤思路。 */
(function () {
  'use strict';

  function norm(s) { return String(s).trim(); }

  document.querySelectorAll('[data-filter]').forEach(function (root) {
    var chipsEl = root.querySelector('[data-filter-chips]');
    if (!chipsEl) return;
    var items = Array.prototype.slice.call(root.querySelectorAll('[data-cats]'));
    if (!items.length) return;

    var allLabel = root.getAttribute('data-filter-all') || '全部';

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
    }

    function escHtml(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
    function escAttr(s) { return String(s).replace(/"/g, '&quot;'); }

    renderChips();
    if (state) apply(state);
  });
})();
