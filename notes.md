---
layout: default
title: 研究报告 · Notes
description: "Marginalia 的研究报告与技术拆解——Claude/LLM 实战、Agent 工程、AIGC 工艺、基础设施。按分类筛选。"
permalink: /notes/
---
<div class="wrap wrap--wide">
  <header class="page-header">
    <h1>研究报告 <span class="archive-en">Notes</span></h1>
    <p class="archive-lede">研究笔记与技术拆解——写清楚一件事。点分类筛选，<kbd>Ctrl</kbd>+<kbd>K</kbd> 全文搜索。</p>
  </header>

  <section data-filter data-filter-all="全部" data-filter-order="Claude · LLM,Agent 工程,AIGC 工艺,基础设施">
    <div class="mg-filter-bar" data-filter-chips></div>

    {% assign hot_posts = site.posts | where_exp: "p", "p.tags contains 'ai-hot'" %}
    {% assign note_count = site.posts.size | minus: hot_posts.size %}
    {% if note_count == 0 %}
      <p class="empty-state">还没有研究报告。</p>
    {% else %}
    <ol class="posts" role="list">
      {% for post in site.posts %}
      {% unless post.tags contains 'ai-hot' %}
      <li class="post-item reveal" data-cats="{{ post.category | escape }}">
        <aside class="margin-note">
          <time datetime="{{ post.date | date_to_xmlschema }}">
            <span class="m-y">{{ post.date | date: '%Y' }}</span>
            <span class="m-md">{{ post.date | date: '%m · %d' }}</span>
          </time>
          {% if post.category %}<p class="note-cat">{{ post.category }}</p>{% endif %}
          {% if post.tags and post.tags.size > 0 %}
          <ul class="tags" role="list">
            {% for t in post.tags %}<li><a href="{{ '/archive/' | relative_url }}?tag={{ t | uri_escape }}">#{{ t }}</a></li>{% endfor %}
          </ul>
          {% endif %}
        </aside>
        <article class="post-summary{% if post.cover %} has-cover{% endif %}">
          <div class="post-summary-text">
            <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
            {% if post.excerpt %}<p class="excerpt">{{ post.excerpt | strip_html | strip_newlines | truncate: 200 }}</p>{% endif %}
            <div class="mg-card-react" data-mg-react data-mode="compact"
                 data-slug="{{ post.url }}" data-title="{{ post.title | escape }}" data-url="{{ post.url | relative_url }}"></div>
          </div>
          {% if post.cover %}
          <a class="post-thumb" href="{{ post.url | relative_url }}" aria-hidden="true" tabindex="-1">
            <img src="{{ post.cover | relative_url }}" alt="" loading="lazy">
          </a>
          {% endif %}
        </article>
      </li>
      {% endunless %}
      {% endfor %}
    </ol>
    {% endif %}
  </section>
</div>

<script src="{{ '/assets/js/filter.js' | relative_url }}" defer></script>
