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
</style>

你写下的书边批语、笺注与读后感。视频、文档之外，这一栏留给读书。

{% assign shujian = site.shujian | sort: 'date' | reverse %}
{% if shujian.size == 0 %}
<div class="shujian-empty">暂无书笺。第一条即将写下。</div>
{% else %}
<ul class="shujian-list">
  {% for s in shujian %}
  <li>
    <a class="thumb" href="{{ s.url | relative_url }}" aria-label="{{ s.title }}">
      {% if s.cover %}<img src="{{ s.cover | relative_url }}" alt="" loading="lazy">{% else %}📖{% endif %}
    </a>
    <div class="meta">
      <h3 class="title"><a href="{{ s.url | relative_url }}">{{ s.title }}</a></h3>
      <p class="desc">{% if s.author %}<span class="shujian-author">{{ s.author }} · </span>{% endif %}{{ s.description }}</p>
    </div>
  </li>
  {% endfor %}
</ul>
{% endif %}
