---
layout: page
title: 歌本
description: "Marginalia 歌本——一首首歌，配上原唱视频与音频，随时听、随时看。"
permalink: /songs/
wide: true
---

<style scoped>
  .songs-list { list-style: none; padding: 0; margin: 2.2rem 0 0; }
  .songs-list > li {
    display: grid;
    grid-template-columns: minmax(160px, 200px) 1fr;
    gap: 1.4rem 1.8rem;
    padding: 1.6rem 0;
    border-bottom: 1px solid var(--rule);
  }
  .songs-list > li:last-child { border-bottom: none; }
  .songs-list .thumb {
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
  .songs-list .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .songs-list .meta { display: flex; flex-direction: column; }
  .songs-list .title {
    font-family: var(--serif);
    font-size: 1.45rem;
    line-height: 1.25;
    margin: 0 0 0.55rem;
    font-weight: 600;
  }
  .songs-list .title a {
    color: var(--ink);
    text-decoration: none;
    background: none;
    border-bottom: 1px solid transparent;
    transition: color 0.2s, border-color 0.2s;
  }
  .songs-list .title a:hover { color: var(--accent); border-bottom-color: var(--accent-soft); }
  .songs-list .desc {
    font-size: 0.96rem;
    line-height: 1.65;
    color: var(--ink-soft);
    margin: 0 0 0.85rem;
  }
  .songs-author { color: var(--muted); }
  .media-mark {
    display: inline-flex; align-items: center; gap: 3px;
    margin-left: 6px;
    font-size: 0.72rem; letter-spacing: 0.06em; padding: 2px 8px; border-radius: 2px;
    font-family: var(--sans);
  }
  .media-mark--video { color: var(--accent); border: 1px solid rgba(139, 46, 42, 0.3); background: rgba(139, 46, 42, 0.06); }
  .media-mark--audio { color: #3f5a4c; border: 1px solid rgba(63, 90, 76, 0.3); background: rgba(63, 90, 76, 0.07); }
  .songs-empty {
    margin-top: 2rem; padding: 2rem;
    border: 1px dashed var(--rule); text-align: center; color: var(--muted); font-style: italic;
  }
  @media (max-width: 720px) {
    .songs-list > li { grid-template-columns: 1fr; gap: 1rem; }
    .songs-list .title { font-size: 1.25rem; }
  }

  .songs-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .songs-toolbar .mg-filter-bar { flex: 1 1 auto; }
  .mg-view-toggle { display: inline-flex; gap: 6px; margin-top: 1.6rem; }
  .mg-view-toggle button {
    font: inherit; cursor: pointer; border: 1px solid var(--rule);
    background: var(--bg-tint); color: var(--muted);
    padding: 5px 12px; border-radius: 2px; font-size: .82rem; letter-spacing: .04em;
    transition: border-color .2s, color .2s, background .2s; font-family: var(--sans);
  }
  .mg-view-toggle button:hover { color: var(--accent); border-color: var(--accent-soft); }
  .mg-view-toggle button.active { background: var(--accent); color: #fbf8f1; border-color: var(--accent); }

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

  .songs-list.is-grid {
    display: flex; flex-wrap: wrap; justify-content: flex-start;
    gap: 0.9rem; margin-top: 1.4rem;
  }
  .songs-list.is-grid > li {
    display: flex; flex-direction: column; padding: 0;
    flex: 0 0 auto; width: calc(16.666% - 0.75rem);
    border: 1px solid var(--rule); border-radius: 3px; overflow: hidden;
    background: var(--bg-tint); box-shadow: 0 3px 10px rgba(31, 29, 27, 0.05);
  }
  @media (max-width: 1200px) { .songs-list.is-grid > li { width: calc(20% - 0.72rem); } }
  @media (max-width: 900px)  { .songs-list.is-grid > li { width: calc(25% - 0.675rem); } }
  @media (max-width: 640px)  { .songs-list.is-grid > li { width: calc(33.333% - 0.6rem); } }
  @media (max-width: 420px)  { .songs-list.is-grid > li { width: calc(50% - 0.45rem); } }
  .songs-list.is-grid .thumb {
    width: 100%; height: 150px; aspect-ratio: auto;
    border: 0; border-radius: 0; font-size: 1.6rem;
    display: flex; align-items: center; justify-content: center;
    border-bottom: 1px solid var(--rule);
  }
  .songs-list.is-grid .thumb img {
    width: auto; height: auto; max-width: 72%; max-height: 84%;
    object-fit: contain; display: block; box-shadow: 0 2px 8px rgba(31, 29, 27, 0.18);
  }
  .songs-list.is-grid .meta { padding: 0.55rem 0.65rem 0.65rem; flex: 1; }
  .songs-list.is-grid .title { font-size: 0.85rem; line-height: 1.3; margin-bottom: 0.2rem; min-height: 2.3em; }
  .songs-list.is-grid .desc {
    font-size: .72rem; line-height: 1.5; min-height: 2.7em;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .songs-list.is-grid .media-mark { margin-left: 0; }
</style>

一首首歌，配上原唱视频与音频，随时听、随时看。

{% assign songs = site.songs | sort: 'date' | reverse %}
{% if songs.size == 0 %}
<div class="songs-empty">暂无歌曲。第一首即将添上。</div>
{% else %}
<section data-filter data-filter-all="全部" data-filter-order="歌本" data-page-size="20">
  <div class="songs-toolbar">
    <div class="mg-filter-bar" data-filter-chips></div>
    <div class="mg-view-toggle" role="group" aria-label="视图切换">
      <button type="button" data-view="list" class="active" title="列表视图">☰ 列表</button>
      <button type="button" data-view="grid" title="网格视图">▦ 网格</button>
    </div>
  </div>
  <ul class="songs-list">
  {% for s in songs %}
  <li data-cats="歌本">
    <a class="thumb" href="{{ s.url | relative_url }}" aria-label="{{ s.title | escape }}">
      {% if s.cover %}<img src="{{ s.cover | relative_url }}" alt="" loading="lazy">{% else %}🎵{% endif %}
    </a>
    <div class="meta">
      <h3 class="title"><a href="{{ s.url | relative_url }}">{{ s.title }}</a></h3>
      <p class="desc">{% if s.author %}<span class="songs-author">{{ s.author }} · </span>{% endif %}{{ s.description }}
        {% if (s.bvid and s.bvid != "") or (s.video_url and s.video_url != "") or (s.douyin_id and s.douyin_id != "") or (s.video and s.video != "") %}<span class="media-mark media-mark--video">🎬 视频</span>{% endif %}
        {% if s.audio_url and s.audio_url != "" %}<span class="media-mark media-mark--audio">🎧 音频</span>{% endif %}
      </p>
    </div>
  </li>
  {% endfor %}
  </ul>
  <div data-filter-pager></div>
</section>
{% endif %}

<script>
(function () {
  var KEY = 'songs-view';
  var ul = document.querySelector('.songs-list');
  var tg = document.querySelector('.mg-view-toggle');
  if (!ul || !tg) return;
  function set(v) {
    ul.classList.toggle('is-grid', v === 'grid');
    tg.querySelectorAll('button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-view') === v); });
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }
  tg.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) set(b.getAttribute('data-view')); });
  var saved = 'list'; try { saved = localStorage.getItem(KEY) || 'list'; } catch (e) {}
  set(saved);
})();
</script>
<script src="{{ '/assets/js/filter.js' | relative_url }}?v=20261022" defer></script>
