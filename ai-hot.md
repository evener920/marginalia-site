---
layout: page
title: AI Hot · 每日 AI 晨报
description: "Marginalia 的每日 AI 新闻汇编。每天 06:00 自动汇集前 24 小时的全网 AI 动态——模型发布、公司动态、研究论文、应用产品、行业观点、开源工具，分板块成稿。"
permalink: /ai-hot/
wide: true
---

每天清晨 06:00 自动汇集前 24 小时的全网 AI 动态——来自官方博客、arXiv、Reddit、Hacker News、X，由大模型聚类去重、分板块成稿。点日历跳到某一天，点板块 pill 直达那期的对应板块。

{% assign ai_hot_posts = site.posts | where_exp: "p", "p.tags contains 'ai-hot'" %}
{% if ai_hot_posts.size == 0 %}
还没有发布过 AI 晨报。第一篇会在明天清晨自动出现。
{% else %}

<div id="hot-calendar" class="hot-calendar" aria-label="晨报日历"></div>

{% if site.data.hot_topics and site.data.hot_topics.topics.size > 0 %}
{% assign topmax = site.data.hot_topics.topics[0].score %}
<section class="hot-topics" aria-label="话题热度榜">
  <header class="hot-topics-head">
    <h2 class="hot-topics-title">话题热度榜 <span class="ht-sub">近 {{ site.data.hot_topics.window_days }} 天 · 点话题直达最新报道</span></h2>
    <span class="ht-stamp">更新于 {{ site.data.hot_topics.generated }}</span>
  </header>
  <ol class="ht-board" role="list">
    {% for t in site.data.hot_topics.topics %}
    {% assign pct = t.score | times: 100.0 | divided_by: topmax | round %}
    <li class="ht-row">
      <span class="ht-rank{% if forloop.index <= 3 %} ht-rank--top{% endif %}">{{ forloop.index }}</span>
      <div class="ht-main">
        <div class="ht-line">
          <a class="ht-name" href="{{ t.latest.url | relative_url }}" title="{{ t.latest.title | escape }}">{{ t.name }}</a>
          <span class="ht-meta">{{ t.days }} 天在榜</span>
        </div>
        <div class="ht-bar"><span style="width: {{ pct }}%"></span></div>
        <div class="ht-dates">
          {% for l in t.links limit: 5 %}<a href="{{ l.url | relative_url }}" title="{{ l.title | escape }}">{{ l.date | slice: 5, 5 | replace: '-', '·' }}</a>{% endfor %}
        </div>
      </div>
    </li>
    {% endfor %}
  </ol>
</section>
{% endif %}

<ol class="posts hot-list" role="list">
  {% for post in ai_hot_posts %}
  <li class="post-item" id="d{{ post.date | date: '%Y-%m-%d' }}">
    <aside class="margin-note">
      <time datetime="{{ post.date | date_to_xmlschema }}">
        <span class="m-y">{{ post.date | date: '%Y' }}</span>
        <span class="m-md">{{ post.date | date: '%m · %d' }}</span>
      </time>
    </aside>
    <article class="post-summary">
      <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
      {% if post.excerpt %}<p class="excerpt">{{ post.excerpt | strip_html | strip_newlines | truncate: 200 }}</p>{% endif %}
      {% if post.sections %}
      <p class="hot-sections">
        {% for s in post.sections %}<a class="hot-pill" href="{{ post.url | relative_url }}#{{ s.id }}"><span aria-hidden="true">{{ s.emoji }}</span>{{ s.name }}<b>{{ s.count }}</b></a>{% endfor %}
      </p>
      {% endif %}
    </article>
  </li>
  {% endfor %}
</ol>

{% capture hotdays %}{% for post in ai_hot_posts %}{% assign total = 0 %}{% if post.sections %}{% for s in post.sections %}{% assign total = total | plus: s.count %}{% endfor %}{% endif %}{ "date": "{{ post.date | date: '%Y-%m-%d' }}", "url": {{ post.url | relative_url | jsonify }}, "n": {{ total }} },{% endfor %}{% endcapture %}
<script type="application/json" id="hot-days">[{{ hotdays | strip }} null]</script>
<script src="{{ '/assets/js/ai-hot-cal.js' | relative_url }}" defer></script>
{% endif %}
