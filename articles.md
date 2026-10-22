---
layout: page
title: 文章
description: "Marginalia 文章——你写下的每一篇文章与随笔。"
permalink: /articles/
wide: true
---

<style scoped>
  .articles-list { list-style: none; padding: 0; margin: 2.2rem 0 0; }
  .articles-list > li {
    display: grid;
    grid-template-columns: minmax(220px, 300px) 1fr;
    gap: 1.6rem 1.8rem;
    padding: 1.6rem 0;
    border-bottom: 1px solid var(--rule);
  }
  .articles-list > li:last-child { border-bottom: none; }
  .articles-list .thumb {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border: 1px solid var(--rule);
    background: var(--bg-tint);
    border-radius: 2px;
    display: flex; align-items: center; justify-content: center;
    color: var(--muted);
    font-size: 2.2rem;
  }
  .articles-list .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .articles-list .meta { display: flex; flex-direction: column; }
  .articles-list .date {
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 0.5rem;
    font-family: var(--sans);
  }
  .articles-list .title {
    font-family: var(--serif);
    font-size: 1.4rem;
    line-height: 1.25;
    margin: 0 0 0.55rem;
    font-weight: 600;
  }
  .articles-list .title a {
    color: var(--ink);
    text-decoration: none;
    background: none;
    border-bottom: 1px solid transparent;
    transition: color 0.2s, border-color 0.2s;
  }
  .articles-list .title a:hover { color: var(--accent); border-bottom-color: var(--accent-soft); }
  .articles-list .desc {
    font-size: 0.96rem;
    line-height: 1.65;
    color: var(--ink-soft);
    margin: 0 0 0.85rem;
  }
  .articles-list .pills {
    display: flex; flex-wrap: wrap; gap: 6px;
    margin-top: auto;
    padding-top: 0.4rem;
  }
  .articles-list .pills span {
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    color: var(--muted);
    border: 1px solid var(--rule);
    padding: 3px 9px;
    border-radius: 2px;
    font-family: var(--sans);
    background: var(--bg-tint);
  }
  .articles-empty {
    margin-top: 2rem;
    padding: 2rem;
    border: 1px dashed var(--rule);
    text-align: center;
    color: var(--muted);
    font-style: italic;
  }
  @media (max-width: 720px) {
    .articles-list > li { grid-template-columns: 1fr; gap: 1rem; }
    .articles-list .title { font-size: 1.25rem; }
  }

  /* —— 工具栏（筛选 + 视图切换）—— */
  .articles-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .articles-toolbar .mg-filter-bar { flex: 1 1 auto; }
  .mg-view-toggle { display: inline-flex; gap: 6px; margin-top: 1.6rem; }
  .mg-view-toggle button {
    font: inherit; cursor: pointer; border: 1px solid var(--rule);
    background: var(--bg-tint); color: var(--muted);
    padding: 5px 12px; border-radius: 2px; font-size: .82rem; letter-spacing: .04em;
    transition: border-color .2s, color .2s, background .2s; font-family: var(--sans);
  }
  .mg-view-toggle button:hover { color: var(--accent); border-color: var(--accent-soft); }
  .mg-view-toggle button.active { background: var(--accent); color: #fbf8f1; border-color: var(--accent); }

  /* —— 分页 —— */
  .videos-pager {
    display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: center;
    margin: 2.4rem 0 0.5rem; font-family: var(--sans);
  }
  .videos-pager button {
    font: inherit; cursor: pointer; border: 1px solid var(--rule);
    background: var(--bg-tint); color: var(--ink);
    padding: 7px 13px; border-radius: 2px; transition: border-color .2s, color .2s, background .2s;
  }
  .videos-pager button:hover:not(.disabled) { border-color: var(--accent-soft); color: var(--accent); }
  .videos-pager .active { background: var(--accent); color: #fbf8f1; border-color: var(--accent); }
  .videos-pager .disabled { opacity: .4; cursor: default; }
  .v-pager-gap { color: var(--muted); padding: 0 4px; }
  .v-pager-info { margin-left: auto; font-size: .8rem; color: var(--muted); letter-spacing: .05em; }
  @media (max-width: 720px) { .v-pager-info { margin-left: 0; width: 100%; text-align: center; } }

  /* —— 网格视图（16:9 题图 + 等高卡片，居中换行）—— */
  .articles-list.is-grid {
    display: flex; flex-wrap: wrap; justify-content: center;
    gap: 1rem; margin-top: 1.4rem;
  }
  .articles-list.is-grid > li {
    display: flex; flex-direction: column; padding: 0;
    flex: 0 0 auto; width: calc(25% - 0.75rem);
    border: 1px solid var(--rule); border-radius: 3px; overflow: hidden;
    background: var(--bg-tint); box-shadow: 0 3px 10px rgba(31, 29, 27, 0.05);
  }
  @media (max-width: 1200px) { .articles-list.is-grid > li { width: calc(25% - 0.75rem); } }
  @media (max-width: 900px)  { .articles-list.is-grid > li { width: calc(33.333% - 0.667rem); } }
  @media (max-width: 640px)  { .articles-list.is-grid > li { width: calc(50% - 0.5rem); } }
  @media (max-width: 420px)  { .articles-list.is-grid > li { width: 100%; } }
  .articles-list.is-grid .thumb { width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 0; font-size: 1.8rem; }
  .articles-list.is-grid .meta { padding: 0.6rem 0.8rem 0.8rem; flex: 1; }
  .articles-list.is-grid .date { margin-bottom: 0.3rem; font-size: .68rem; }
  .articles-list.is-grid .title { font-size: 0.95rem; line-height: 1.3; margin-bottom: 0.25rem; min-height: 2.4em; }
  .articles-list.is-grid .desc {
    font-size: .78rem; line-height: 1.5; min-height: 3em;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .articles-list.is-grid .pills span { font-size: .66rem; padding: 2px 7px; }
</style>

你写下的每一篇文章与随笔，按时间倒序排列。

{% assign posts = site.posts | sort: 'date' | reverse %}
{% if posts.size == 0 %}
<div class="articles-empty">暂无文章。第一篇即将写下。</div>
{% else %}
<section data-filter data-filter-all="全部" data-page-size="20">
  <div class="articles-toolbar">
    <div class="mg-filter-bar" data-filter-chips></div>
    <div class="mg-view-toggle" role="group" aria-label="视图切换">
      <button type="button" data-view="list" class="active" title="列表视图">☰ 列表</button>
      <button type="button" data-view="grid" title="网格视图">▦ 网格</button>
    </div>
  </div>
  <ul class="articles-list">
  {% for p in posts %}
  {% assign pcat = '随笔' %}
  {% if p.category %}{% assign pcat = p.category %}{% endif %}
  <li data-cats="{{ pcat }}">
    <a class="thumb" href="{{ p.url | relative_url }}" aria-label="{{ p.title }}">
      {% if p.cover %}<img src="{{ p.cover | relative_url }}" alt="" loading="lazy">{% else %}✒️{% endif %}
    </a>
    <div class="meta">
      <div class="date">{{ p.date | date: '%Y-%m-%d' }}{% if p.author %} · {{ p.author }}{% endif %}</div>
      <h3 class="title"><a href="{{ p.url | relative_url }}">{{ p.title }}</a></h3>
      <p class="desc">{{ p.description | default: p.excerpt }}</p>
      <div class="pills"><span>{{ pcat }}</span></div>
    </div>
  </li>
  {% endfor %}
  </ul>
  <div data-filter-pager></div>
</section>
{% endif %}

<script>
/* 视图切换：列表 / 网格，localStorage 记住偏好 */
(function () {
  var KEY = 'articles-view';
  var ul = document.querySelector('.articles-list');
  var tg = document.querySelector('.mg-view-toggle');
  if (!ul || !tg) return;
  function set(v) {
    ul.classList.toggle('is-grid', v === 'grid');
    tg.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === v);
    });
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }
  tg.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) set(b.getAttribute('data-view'));
  });
  var saved = 'list';
  try { saved = localStorage.getItem(KEY) || 'list'; } catch (e) {}
  set(saved);
})();
</script>
<script src="{{ '/assets/js/filter.js' | relative_url }}?v=20261022" defer></script>
