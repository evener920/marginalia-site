---
layout: page
title: 读书
description: "Marginalia 读书——读书笔记与书评。一盏茶的时间，读完一整本书的批注。"
permalink: /dushu/
wide: true
---

<style scoped>
  .dushu-list { list-style: none; padding: 0; margin: 2.2rem 0 0; }
  .dushu-list > li {
    display: grid;
    grid-template-columns: minmax(160px, 200px) 1fr;
    gap: 1.4rem 1.8rem;
    padding: 1.6rem 0;
    border-bottom: 1px solid var(--rule);
  }
  .dushu-list > li:last-child { border-bottom: none; }
  .dushu-list .thumb {
    display: flex; align-items: center; justify-content: center;
    aspect-ratio: 3 / 4;
    overflow: hidden;
    border: 1px solid var(--rule);
    background: var(--bg-tint);
    border-radius: 2px;
    color: var(--muted);
    font-size: 2.4rem;
    text-decoration: none;
  }
  .dushu-list .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .dushu-list .meta { display: flex; flex-direction: column; }
  .dushu-list .title {
    font-family: var(--serif);
    font-size: 1.45rem;
    line-height: 1.25;
    margin: 0 0 0.55rem;
    font-weight: 600;
  }
  .dushu-list .title a {
    color: var(--ink);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: color 0.2s, border-color 0.2s;
  }
  .dushu-list .title a:hover { color: var(--accent); border-bottom-color: var(--accent-soft); }
  .dushu-list .desc {
    font-size: 0.96rem;
    line-height: 1.65;
    color: var(--ink-soft);
    margin: 0 0 0.85rem;
  }
  .dushu-list .dushu-date { font-size: 0.78rem; letter-spacing: 0.06em; color: var(--muted); }
  .dushu-empty {
    margin-top: 2rem;
    padding: 2rem;
    border: 1px dashed var(--rule);
    text-align: center;
    color: var(--muted);
    font-style: italic;
  }
  @media (max-width: 720px) {
    .dushu-list > li { grid-template-columns: 1fr; gap: 1rem; }
    .dushu-list .title { font-size: 1.25rem; }
  }
</style>

读书笔记与书评。文章之外的整本书，写在这里。

{% assign dushu = site.dushu | sort: 'date' | reverse %}
{% if dushu.size == 0 %}
<div class="dushu-empty">还没有读书笔记。第一条正在路上。</div>
{% else %}
<ul class="dushu-list">
  {% for d in dushu %}
  <li>
    <a class="thumb" href="{{ d.url | relative_url }}" aria-label="{{ d.title | escape }}">
      {% if d.cover %}<img src="{{ d.cover | relative_url }}" alt="" loading="lazy">{% else %}📖{% endif %}
    </a>
    <div class="meta">
      <h3 class="title"><a href="{{ d.url | relative_url }}">{{ d.title }}</a></h3>
      <p class="desc">{% if d.author %}<span class="dushu-author">{{ d.author }} · </span>{% endif %}{{ d.description }}</p>
      <span class="dushu-date">{{ d.date | date: '%Y-%m-%d' }}</span>
    </div>
  </li>
  {% endfor %}
</ul>
{% endif %}
