---
layout: page
title: Videos
description: "Marginalia 视频专栏——AI 周报与解释类视频，以及从抖音收藏迁移过来的知识类短片。"
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
  .videos-list .poster .src-mark {
    position: absolute; left: 8px; bottom: 8px;
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    padding: 3px 8px;
    background: rgba(31, 29, 27, 0.7);
    color: #fbf8f1;
    border-radius: 2px;
    font-family: var(--sans);
  }
  .videos-list .poster--source { background: var(--bg-tint); }
  /* 本地封面卡：真首帧未抓到时的占位（标题首字 + 固定渐变），抓到 poster 后自动替换 */
  .videos-list .poster .frame-cover {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.55rem;
  }
  .videos-list .poster .frame-cover-char {
    font-family: var(--serif);
    font-size: 2.3rem; line-height: 1;
    color: rgba(31, 29, 27, 0.52);
  }
  .videos-list .poster .frame-cover-tag {
    font-size: 0.66rem; letter-spacing: 0.18em;
    color: rgba(31, 29, 27, 0.4);
    font-family: var(--sans);
  }
  .videos-list .poster .frame-cover--0 { background: linear-gradient(135deg, #f5efe3 0%, #e9dfc9 100%); }
  .videos-list .poster .frame-cover--1 { background: linear-gradient(135deg, #eef0e9 0%, #dde3d4 100%); }
  .videos-list .poster .frame-cover--2 { background: linear-gradient(135deg, #f7ece5 0%, #ecd7c7 100%); }
  .videos-list .poster .frame-cover--3 { background: linear-gradient(135deg, #f3f0e9 0%, #e3ded1 100%); }
  .videos-list .poster .frame-cover--4 { background: linear-gradient(135deg, #f1ede5 0%, #e7dcc6 100%); }

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
  .videos-list .pills span.brand-douyin { color: #1f1d1b; border-color: rgba(31, 29, 27, 0.2); }

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

  /* —— 视图切换（列表 / 网格）—— */
  .videos-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .videos-toolbar .mg-filter-bar { flex: 1 1 auto; }
  .mg-view-toggle { display: inline-flex; gap: 6px; margin-top: 1.6rem; }
  .mg-view-toggle button {
    font: inherit; cursor: pointer; border: 1px solid var(--rule);
    background: var(--bg-tint); color: var(--muted);
    padding: 5px 12px; border-radius: 2px; font-size: .82rem; letter-spacing: .04em;
    transition: border-color .2s, color .2s, background .2s; font-family: var(--sans);
  }
  .mg-view-toggle button:hover { color: var(--accent); border-color: var(--accent-soft); }
  .mg-view-toggle button.active { background: var(--accent); color: #fbf8f1; border-color: var(--accent); }

  .videos-list.is-grid {
    display: flex; flex-wrap: wrap; justify-content: flex-start;
    align-items: stretch;
    gap: 0.9rem; margin-top: 1.4rem;
  }
  .videos-list.is-grid > li {
    display: flex; flex-direction: column; padding: 0;
    flex: 0 0 auto; width: calc(20% - 0.72rem);
    border: 1px solid var(--rule); border-radius: 3px; overflow: hidden;
    background: var(--bg-tint); box-shadow: 0 3px 10px rgba(31, 29, 27, 0.05);
  }
  @media (max-width: 1200px) { .videos-list.is-grid > li { width: calc(25% - 0.675rem); } }
  @media (max-width: 900px)  { .videos-list.is-grid > li { width: calc(33.333% - 0.6rem); } }
  @media (max-width: 640px)  { .videos-list.is-grid > li { width: calc(50% - 0.45rem); } }
  @media (max-width: 420px)  { .videos-list.is-grid > li { width: 100%; } }
  .videos-list.is-grid .poster { width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 0; }
  .videos-list.is-grid .poster img { object-fit: cover; }
  .videos-list.is-grid .meta {
    padding: 0.6rem 0.75rem 0.7rem; flex: 1 1 auto;
    display: flex; flex-direction: column;
  }
  /* 网格标题统一两行，超出以省略号隐藏，保证卡片等高、底部标签对齐 */
  .videos-list.is-grid .title {
    font-size: 0.9rem; line-height: 1.3; margin-bottom: 0.35rem;
    min-height: 2.6em;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden; text-overflow: ellipsis;
  }
  /* 网格视图隐藏描述：空描述会撑出大块留白并破坏对齐，列表/详情视图仍保留 */
  .videos-list.is-grid .desc { display: none; }
  .videos-list.is-grid .pills { margin-top: auto; padding-top: .5rem; }
  .videos-list.is-grid .pills span { font-size: .66rem; padding: 2px 7px; }
  .videos-list.is-grid .mg-card-react { display: none; }

  /* —— 弹窗播放（点击封面/播放键，原地弹窗，不跳页）—— */
  .video-modal { position: fixed; inset: 0; z-index: 1000; display: none; }
  .video-modal.is-open { display: block; }
  .video-modal__backdrop {
    position: absolute; inset: 0;
    background: rgba(20, 18, 16, 0.84);
    backdrop-filter: blur(6px);
    animation: vm-fade .18s ease;
  }
  .video-modal__dialog {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: min(92vw, 1080px);
    animation: vm-pop .2s ease;
  }
  .video-modal__dialog::before { content: ""; display: block; padding-top: 56.25%; }
  .video-modal__stage { position: absolute; inset: 0; background: #000; }
  .video-modal__stage iframe,
  .video-modal__stage video {
    position: absolute; inset: 0; width: 100%; height: 100%;
    border: 0; background: #000;
  }
  .video-modal__close {
    position: absolute; top: -42px; right: 0;
    width: 36px; height: 36px; border-radius: 50%;
    border: 1px solid rgba(251, 248, 241, 0.4);
    background: rgba(31, 29, 27, 0.6); color: #fbf8f1;
    font-size: 1.25rem; line-height: 1; cursor: pointer;
    transition: background .2s, border-color .2s;
  }
  .video-modal__close:hover { background: var(--accent); border-color: var(--accent); }
  .video-modal__title {
    position: absolute; bottom: -34px; left: 0;
    color: #fbf8f1; font-family: var(--serif);
    font-size: 0.95rem; opacity: 0.86; max-width: 92%;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  @keyframes vm-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes vm-pop { from { opacity: 0; transform: translate(-50%, -46%) scale(.97); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
  @media (max-width: 640px) { .video-modal__dialog { width: 96vw; } .video-modal__title { display: none; } }
</style>

这里收录从抖音收藏夹迁来的哲学、认知、科普与传统文化短片。

{% assign videos = site.videos | sort: 'date' | reverse %}
{% if videos.size == 0 %}
<div class="videos-empty">暂无视频。第一条周报即将上线。</div>
{% else %}
<section data-filter data-filter-all="全部" data-filter-order="AI 周报,抖音收藏,专题" data-page-size="20">
  <div class="videos-toolbar">
    <div class="mg-filter-bar" data-filter-chips></div>
    <div class="mg-view-toggle" role="group" aria-label="视图切换">
      <button type="button" data-view="list" class="active" title="列表视图">☰ 列表</button>
      <button type="button" data-view="grid" title="网格视图">▦ 网格</button>
    </div>
  </div>
  <ul class="videos-list">
    {% for v in videos %}
    {% if v.tags contains 'weekly' %}{% assign vcat = 'AI 周报' %}{% elsif v.tags contains 'douyin' %}{% assign vcat = '抖音收藏' %}{% else %}{% assign vcat = '专题' %}{% endif %}
    <li data-cats="{{ vcat }}">
      <a class="poster{% unless v.poster %} poster--source{% endunless %}" href="{{ v.url | relative_url }}" aria-label="{{ v.title | escape }}" data-modal="douyin" data-douyin-id="{{ v.douyin_id }}" data-title="{{ v.title | escape }}">
        {% if v.poster %}<img src="{{ v.poster | relative_url }}" alt="" loading="lazy">
        {% elsif v.tags contains 'douyin' %}{% assign gidx = v.title | size | modulo: 5 %}<span class="frame-cover frame-cover--{{ gidx }}"><span class="frame-cover-char">{{ v.title | slice: 0, 1 }}</span><span class="frame-cover-tag">抖音收藏</span></span>{% endif %}
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
          {% if v.tags contains 'douyin' %}<span class="brand-douyin">抖音收藏</span>{% endif %}
        </div>
        <div class="mg-card-react" data-mg-react data-mode="compact"
             data-slug="{{ v.url }}" data-title="{{ v.title | escape }}" data-url="{{ v.url | relative_url }}"></div>
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
  var KEY = 'videos-view';
  var ul = document.querySelector('.videos-list');
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

<!-- 视频弹窗播放器：点击列表封面/播放键原地弹出，不跳转到详情页 -->
<div class="video-modal" id="videoModal" aria-hidden="true" role="dialog" aria-modal="true" aria-label="视频播放">
  <div class="video-modal__backdrop" data-vm-close></div>
  <div class="video-modal__dialog">
    <button class="video-modal__close" type="button" data-vm-close aria-label="关闭">×</button>
    <div class="video-modal__stage" id="videoModalStage"></div>
    <div class="video-modal__title" id="videoModalTitle"></div>
  </div>
</div>
<script>
(function () {
  var modal = document.getElementById('videoModal');
  if (!modal) return;
  var stage = document.getElementById('videoModalStage');
  var titleEl = document.getElementById('videoModalTitle');
  var lastFocus = null;

  function build(anchor) {
    var type = anchor.getAttribute('data-modal');
    var title = anchor.getAttribute('data-title') || '';
    titleEl.textContent = title;
    stage.innerHTML = '';
    if (type === 'douyin') {
      var id = anchor.getAttribute('data-douyin-id');
      if (!id) return false;
      var f = document.createElement('iframe');
      f.src = 'https://open.douyin.com/player/video?vid=' + encodeURIComponent(id) + '&autoplay=1';
      f.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('referrerpolicy', 'no-referrer');
      stage.appendChild(f);
      return true;
    }
    if (type === 'file') {
      var src = anchor.getAttribute('data-video-src');
      if (!src) return false;
      var v = document.createElement('video');
      v.src = src; v.controls = true; v.autoplay = true; v.playsInline = true;
      stage.appendChild(v);
      return true;
    }
    return false;
  }

  function openModal(anchor) {
    if (!build(anchor)) return false;
    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var c = modal.querySelector('.video-modal__close');
    if (c) c.focus();
    return true;
  }
  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    stage.innerHTML = ''; // 停止播放，释放 iframe
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    var card = e.target.closest('[data-modal]');
    if (card) {
      e.preventDefault();
      openModal(card);
      return;
    }
    if (e.target.closest('[data-vm-close]')) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });
})();
</script>
