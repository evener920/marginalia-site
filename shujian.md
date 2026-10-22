---
layout: page
title: 书笺
description: "Marginalia 书笺——读书笺注，写在书页边上的话。书目、资料与读后感，托管于本站。"
permalink: /shujian/
wide: true
---

<style scoped>
  .shujian-list { list-style: none; padding: 0; margin: 2.2rem 0 0; }
  .shujian-list > li {
    display: grid;
    grid-template-columns: minmax(160px, 200px) 1fr;
    gap: 1.4rem 1.8rem;
    padding: 1.6rem 0;
    border-bottom: 1px solid var(--rule);
  }
  .shujian-list > li:last-child { border-bottom: none; }
  .shujian-list .thumb {
    position: relative;
    aspect-ratio: 3 / 4;
    overflow: hidden;
    border: 1px solid var(--rule);
    background: var(--bg-tint);
    border-radius: 2px;
    display: flex; align-items: center; justify-content: center;
    color: var(--muted);
    font-size: 2.4rem;
  }
  .shujian-list .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .shujian-list .meta { display: flex; flex-direction: column; }
  .shujian-list .title {
    font-family: var(--serif);
    font-size: 1.45rem;
    line-height: 1.25;
    margin: 0 0 0.55rem;
    font-weight: 600;
  }
  .shujian-list .title a {
    color: var(--ink);
    text-decoration: none;
    background: none;
    border-bottom: 1px solid transparent;
    transition: color 0.2s, border-color 0.2s;
  }
  .shujian-list .title a:hover { color: var(--accent); border-bottom-color: var(--accent-soft); }
  .shujian-list .desc {
    font-size: 0.96rem;
    line-height: 1.65;
    color: var(--ink-soft);
    margin: 0 0 0.85rem;
  }
  .shujian-list .audio-mark {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 0.72rem; letter-spacing: 0.08em;
    color: var(--accent); font-family: var(--sans);
  }
  .shujian-empty {
    margin-top: 2rem;
    padding: 2rem;
    border: 1px dashed var(--rule);
    text-align: center;
    color: var(--muted);
    font-style: italic;
  }
  @media (max-width: 720px) {
    .shujian-list > li { grid-template-columns: 1fr; gap: 1rem; }
    .shujian-list .title { font-size: 1.25rem; }
  }

  /* —— 工具栏（筛选 + 视图切换）—— */
  .shujian-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .shujian-toolbar .mg-filter-bar { flex: 1 1 auto; }
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

  /* —— 网格视图（等高卡片，居中换行）—— */
  .shujian-list.is-grid {
    display: flex; flex-wrap: wrap; justify-content: center;
    gap: 1rem; margin-top: 1.4rem;
  }
  .shujian-list.is-grid > li {
    display: flex; flex-direction: column; padding: 0;
    flex: 0 0 auto; width: calc(25% - 0.75rem);
    border: 1px solid var(--rule); border-radius: 3px; overflow: hidden;
    background: var(--bg-tint); box-shadow: 0 3px 10px rgba(31, 29, 27, 0.05);
  }
  @media (max-width: 1200px) { .shujian-list.is-grid > li { width: calc(25% - 0.75rem); } }
  @media (max-width: 900px)  { .shujian-list.is-grid > li { width: calc(33.333% - 0.667rem); } }
  @media (max-width: 640px)  { .shujian-list.is-grid > li { width: calc(50% - 0.5rem); } }
  @media (max-width: 420px)  { .shujian-list.is-grid > li { width: 100%; } }
  .shujian-list.is-grid .thumb { width: 100%; aspect-ratio: 3 / 4; border: 0; border-radius: 0; font-size: 2rem; }
  .shujian-list.is-grid .meta { padding: 0.65rem 0.8rem 0.8rem; flex: 1; }
  .shujian-list.is-grid .title { font-size: 0.95rem; line-height: 1.3; margin-bottom: 0.25rem; min-height: 2.5em; }
  .shujian-list.is-grid .desc {
    font-size: .78rem; line-height: 1.5; min-height: 3em;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
</style>

你写下的书边批语、笺注与读后感。视频、文档之外，这一栏留给读书。

{% assign shujian = site.shujian | sort: 'date' | reverse %}
{% if shujian.size == 0 %}
<div class="shujian-empty">暂无书笺。第一条即将写下。</div>
{% else %}
<section data-filter data-filter-all="全部" data-filter-order="读书" data-page-size="20">
  <div class="shujian-toolbar">
    <div class="mg-filter-bar" data-filter-chips></div>
    <div class="mg-view-toggle" role="group" aria-label="视图切换">
      <button type="button" data-view="list" class="active" title="列表视图">☰ 列表</button>
      <button type="button" data-view="grid" title="网格视图">▦ 网格</button>
    </div>
  </div>
  <ul class="shujian-list">
  {% for s in shujian %}
  {% assign scat = '读书' %}
  {% if s.category %}{% assign scat = s.category %}{% endif %}
  <li data-cats="{{ scat }}">
    <a class="thumb" href="{{ s.url | relative_url }}" aria-label="{{ s.title }}">
      {% if s.cover %}<img src="{{ s.cover | relative_url }}" alt="" loading="lazy">{% else %}📖{% endif %}
    </a>
    <div class="meta">
      <h3 class="title"><a href="{{ s.url | relative_url }}">{{ s.title }}</a></h3>
      <p class="desc">{% if s.author %}<span class="shujian-author">{{ s.author }} · </span>{% endif %}{{ s.description }}{% if s.audio_url %} <span class="audio-mark">🎧 收听</span>{% endif %}</p>
    </div>
  </li>
  {% endfor %}
  </ul>
  <div data-filter-pager></div>
</section>
{% endif %}

<script>
/* 视图切换：列表 / 网格，localStorage 记住偏好（与 Videos 页同款） */
(function () {
  var KEY = 'shujian-view';
  var ul = document.querySelector('.shujian-list');
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
