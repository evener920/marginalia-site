---
layout: page
title: 文档
description: "Marginalia 文档库——书目、资料与 PDF 文档，内嵌翻阅，托管于 Cloudflare R2。"
permalink: /docs/
wide: true
---

<style scoped>
  .docs-list { list-style: none; padding: 0; margin: 2.2rem 0 0; }
  .docs-list > li {
    display: grid;
    grid-template-columns: minmax(160px, 200px) 1fr;
    gap: 1.4rem 1.8rem;
    padding: 1.6rem 0;
    border-bottom: 1px solid var(--rule);
  }
  .docs-list > li:last-child { border-bottom: none; }
  .docs-list .thumb {
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
  .docs-list .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .docs-list .meta { display: flex; flex-direction: column; }
  .docs-list .title {
    font-family: var(--serif);
    font-size: 1.45rem;
    line-height: 1.25;
    margin: 0 0 0.55rem;
    font-weight: 600;
  }
  .docs-list .title a {
    color: var(--ink);
    text-decoration: none;
    background: none;
    border-bottom: 1px solid transparent;
    transition: color 0.2s, border-color 0.2s;
  }
  .docs-list .title a:hover { color: var(--accent); border-bottom-color: var(--accent-soft); }
  .docs-list .desc {
    font-size: 0.96rem;
    line-height: 1.65;
    color: var(--ink-soft);
    margin: 0 0 0.85rem;
  }
  .docs-empty {
    margin-top: 2rem;
    padding: 2rem;
    border: 1px dashed var(--rule);
    text-align: center;
    color: var(--muted);
    font-style: italic;
  }
  @media (max-width: 720px) {
    .docs-list > li { grid-template-columns: 1fr; gap: 1rem; }
    .docs-list .title { font-size: 1.25rem; }
  }
</style>

你上传的书目、资料与 PDF 文档，页面内直接翻阅。文件托管在 Cloudflare R2，不进 git 仓库。

{% assign docs = site.docs | sort: 'date' | reverse %}
{% if docs.size == 0 %}
<div class="docs-empty">暂无文档。第一篇即将上传。</div>
{% else %}
<ul class="docs-list">
  {% for d in docs %}
  <li>
    <a class="thumb" href="{{ d.url | relative_url }}" aria-label="{{ d.title }}">
      {% if d.cover %}<img src="{{ d.cover | relative_url }}" alt="" loading="lazy">{% else %}📄{% endif %}
    </a>
    <div class="meta">
      <h3 class="title"><a href="{{ d.url | relative_url }}">{{ d.title }}</a></h3>
      <p class="desc">{{ d.description }}</p>
    </div>
  </li>
  {% endfor %}
</ul>
{% endif %}
