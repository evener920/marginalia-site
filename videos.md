---
layout: page
title: Videos
description: "Marginalia 视频专栏——AI 周报与解释类视频。脚本生成、TTS 配音、Remotion 动效、AI B-roll，电视新闻播报感。"
permalink: /videos/
wide: true
---

<style scoped>
  .videos-list { list-style: none; padding: 0; margin: 2.2rem 0 0; }
  .videos-list > li {
    display: grid;
    grid-template-columns: minmax(240px, 320px) 1fr;
    gap: 1.6rem 1.8rem;
    padding: 1.6rem 0;
    border-bottom: 1px solid var(--rule);
  }
  .videos-list > li:last-child { border-bottom: none; }
  .videos-list .poster {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border: 1px solid var(--rule);
    background: var(--bg-tint);
    border-radius: 2px;
    display: block;
  }
  .videos-list .poster img {
    width: 100%; height: 100%; object-fit: cover;
    display: block;
    transition: transform 0.5s ease, opacity 0.3s ease;
  }
  .videos-list .poster:hover img { transform: scale(1.025); }
  .videos-list .poster .play {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none;
  }
  .videos-list .poster .play::before {
    content: "";
    width: 56px; height: 56px;
    border-radius: 50%;
    background: rgba(31, 29, 27, 0.62);
    backdrop-filter: blur(4px);
    transition: background 0.25s ease;
  }
  .videos-list .poster:hover .play::before {
    background: var(--accent);
  }
  .videos-list .poster .play::after {
    content: "";
    position: absolute;
    width: 0; height: 0;
    border-left: 16px solid #fbf8f1;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
    margin-left: 4px;
  }
  .videos-list .poster .duration {
    position: absolute; right: 8px; bottom: 8px;
    font-size: 0.74rem;
    padding: 3px 8px;
    background: rgba(31, 29, 27, 0.78);
    color: #fbf8f1;
    border-radius: 2px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.05em;
    font-family: var(--sans);
  }

  .videos-list .meta { display: flex; flex-direction: column; }
  .videos-list .vol {
    font-size: 0.72rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 0.5rem;
    font-family: var(--sans);
  }
  .videos-list .title {
    font-family: var(--serif);
    font-size: 1.45rem;
    line-height: 1.25;
    margin: 0 0 0.55rem;
    font-weight: 600;
  }
  .videos-list .title a {
    color: var(--ink);
    text-decoration: none;
    background: none;
    border-bottom: 1px solid transparent;
    transition: color 0.2s, border-color 0.2s;
  }
  .videos-list .title a:hover {
    color: var(--accent);
    border-bottom-color: var(--accent-soft);
  }
  .videos-list .desc {
    font-size: 0.96rem;
    line-height: 1.65;
    color: var(--ink-soft);
    margin: 0 0 0.85rem;
  }
  .videos-list .pills {
    display: flex; flex-wrap: wrap; gap: 6px;
    margin-top: auto;
    padding-top: 0.4rem;
  }
  .videos-list .pills span {
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    border: 1px solid var(--rule);
    padding: 3px 9px;
    border-radius: 2px;
    font-family: var(--sans);
    background: var(--bg-tint);
  }
  .videos-list .pills span.brand-claude { color: var(--accent); border-color: rgba(139, 46, 42, 0.25); }
  .videos-list .pills span.brand-openai { color: #8a5a1f; border-color: rgba(138, 90, 31, 0.28); }

  .videos-empty {
    margin-top: 2rem;
    padding: 2rem;
    border: 1px dashed var(--rule);
    text-align: center;
    color: var(--muted);
    font-style: italic;
  }

  @media (max-width: 720px) {
    .videos-list > li {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    .videos-list .title { font-size: 1.25rem; }
  }
</style>

每周一条，把全球 AI 大事讲给一线工程师听。脚本生成 — MiniMax TTS 主播口播 + Hailuo AI B-roll + Remotion 动效 + 字幕条 + 背景音乐。不复述新闻，只挑会改变你写代码方式的更新。

{% assign videos = site.videos | sort: 'date' | reverse %}
{% if videos.size == 0 %}
<div class="videos-empty">暂无视频。第一条周报即将上线。</div>
{% else %}
<section data-filter data-filter-all="全部" data-filter-order="AI 周报,专题">
  <div class="mg-filter-bar" data-filter-chips></div>
  <ul class="videos-list">
    {% for v in videos %}
    {% if v.tags contains 'weekly' %}{% assign vcat = 'AI 周报' %}{% else %}{% assign vcat = '专题' %}{% endif %}
    <li data-cats="{{ vcat }}">
      <a class="poster" href="{{ v.url | relative_url }}" aria-label="{{ v.title }}">
        {% if v.poster %}<img src="{{ v.poster | relative_url }}" alt="" loading="lazy">{% endif %}
        <span class="play"></span>
        {% if v.duration %}<span class="duration">{{ v.duration }}</span>{% endif %}
      </a>
      <div class="meta">
        {% if v.vol %}<div class="vol">{{ v.vol }}</div>{% endif %}
        <h3 class="title"><a href="{{ v.url | relative_url }}">{{ v.title }}</a></h3>
        <p class="desc">{{ v.description }}</p>
        <div class="pills">
          {% for tag in v.pills %}
            <span class="brand-{{ tag.brand }}">{{ tag.label }}</span>
          {% endfor %}
        </div>
        <div class="mg-card-react" data-mg-react data-mode="compact"
             data-slug="{{ v.url }}" data-title="{{ v.title | escape }}" data-url="{{ v.url | relative_url }}"></div>
      </div>
    </li>
    {% endfor %}
  </ul>
</section>
{% endif %}

<script src="{{ '/assets/js/filter.js' | relative_url }}" defer></script>
