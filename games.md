---
layout: default
title: Games
description: "Marginalia 的游戏画廊——每一个都是 AI 协作写出来的独立可玩 HTML 小品。点开即玩，不需要安装。"
permalink: /games/
---

<style>
  /* —— dark-mode site chrome (only on this page) —— */
  /* full-bleed shell uses 100vw, which overflows by the scrollbar width → clamp */
  html, body { overflow-x: hidden; }
  body { background: #0c0c10; }
  body::before {
    background: linear-gradient(90deg, #8b2e2a 0, #8b2e2a 28%, #1a1a22 28%) !important;
  }
  .site-header {
    background: rgba(12, 12, 16, 0.78) !important;
    border-bottom-color: rgba(245, 239, 225, 0.08) !important;
  }
  .site-header .brand { color: #f5efe1 !important; }
  .site-header .brand-mark { color: #d97570 !important; }
  .site-header .brand-tag { color: rgba(245, 239, 225, 0.55) !important; }
  .site-header .site-nav a { color: rgba(245, 239, 225, 0.78) !important; }
  .site-header .site-nav a:hover { color: #d97570 !important; }
  .site-header .nav-btn {
    color: rgba(245, 239, 225, 0.78) !important;
    border-color: rgba(245, 239, 225, 0.25) !important;
    background: transparent !important;
  }
  .site-header .nav-btn:hover {
    color: #d97570 !important;
    border-color: #d97570 !important;
    background: rgba(245, 239, 225, 0.06) !important;
  }
  .site-header .nav-search kbd {
    background: transparent !important;
    border-color: rgba(245, 239, 225, 0.25) !important;
    color: rgba(245, 239, 225, 0.55) !important;
  }
  .site-footer {
    background: #0c0c10;
    color: rgba(245, 239, 225, 0.55);
    border-top: 1px solid rgba(245, 239, 225, 0.08);
  }
  .site-footer a { color: rgba(245, 239, 225, 0.85); border-bottom-color: rgba(245, 239, 225, 0.25); }
  .site-footer .muted { color: rgba(245, 239, 225, 0.4); }

  /* —— full-bleed dark gallery shell —— */
  .games-shell {
    position: relative;
    width: 100vw;
    left: 50%;
    right: 50%;
    margin-left: -50vw;
    margin-right: -50vw;
    margin-top: -3.5rem;          /* cancel .site-main top padding */
    margin-bottom: -4rem;          /* cancel .site-main bottom padding */
    padding: 5rem 0 6rem;
    background: transparent;
    color: #ece6d8;
    font-family: var(--serif);
    overflow: hidden;
  }
  /* —— ink-wash backdrop (fixed: no stretch on tall pages, no iOS quirk) —— */
  .games-bgimg {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
      linear-gradient(to bottom, rgba(12,12,16,0.22), rgba(12,12,16,0.04) 38%, rgba(12,12,16,0.5)),
      url('{{ "/assets/img/games-bg.jpg" | relative_url }}') center / cover no-repeat;
  }
  #games-fx {
    position: fixed;
    inset: 0;
    z-index: 3;   /* embers drift over the gallery; pointer-events:none keeps it inert */
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .games-shell::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    background:
      radial-gradient(1200px 600px at 15% -10%, rgba(139, 46, 42, 0.35), transparent 60%),
      radial-gradient(800px 400px at 95% 110%, rgba(232, 199, 137, 0.18), transparent 60%);
    pointer-events: none;
  }
  .games-inner {
    position: relative;
    z-index: 2;
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 2rem;
  }
  /* —— nonlinear entrances —— */
  @keyframes rise {
    from { opacity: 0; transform: translateY(26px); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes ruleGrow {
    from { width: 0; opacity: 0; }
    60%  { opacity: 1; }
    to   { width: 60px; }
  }
  .games-eyebrow { animation: rise 0.9s cubic-bezier(.16,.84,.3,1) both; }
  .games-title   { animation: rise 1.0s cubic-bezier(.16,.84,.3,1) 0.08s both; }
  .games-rule    { animation: ruleGrow 1.1s cubic-bezier(.16,.84,.3,1.06) 0.22s both; }
  .games-lede    { animation: rise 1.0s cubic-bezier(.16,.84,.3,1) 0.3s both; }
  .game-card {
    opacity: 0;
    transform: translateY(34px) scale(0.975);
  }
  .game-card.in {
    opacity: 1;
    transform: none;
    transition:
      opacity 0.9s cubic-bezier(.22,.9,.3,1),
      transform 0.95s cubic-bezier(.16,.84,.28,1.06);   /* slight overshoot */
    transition-delay: calc(var(--d, 0) * 95ms);
  }
  @media (prefers-reduced-motion: reduce) {
    .games-eyebrow, .games-title, .games-rule, .games-lede { animation: none; }
    .game-card { opacity: 1; transform: none; transition: none; }
  }

  .games-eyebrow {
    font-family: var(--sans);
    font-size: 0.78rem;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: #b8615c;
    margin: 0 0 1rem;
  }
  .games-title {
    font-size: clamp(3rem, 8vw, 5.5rem);
    line-height: 0.95;
    letter-spacing: -0.02em;
    margin: 0 0 1.2rem;
    color: #f5efe1;
    font-weight: 700;
  }
  .games-lede {
    max-width: 640px;
    font-size: 1.05rem;
    line-height: 1.7;
    color: #b8b1a3;
    margin: 0 0 4rem;
    font-style: italic;
  }
  .games-rule {
    width: 60px;
    height: 3px;
    background: #8b2e2a;
    margin: 0 0 4rem;
    border: 0;
  }

  /* —— gallery grid —— */
  .games-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    align-items: start;        /* honor each frame's aspect ratio, don't stretch */
    gap: 2.2rem 2rem;
  }
  .game-card {
    position: relative;
    grid-column: span 6;       /* uniform 2-up → every cover keeps its native 16:9 */
    text-decoration: none;
    color: inherit;
    display: flex;
    flex-direction: column;
    isolation: isolate;
  }
  /* —— featured hero: the newest game runs full width —— */
  .game-card.is-hero { grid-column: span 12; }
  .game-card.is-hero .game-name { font-size: clamp(2rem, 3.4vw, 2.8rem); }
  .game-card.is-hero .game-meta { left: 2rem; right: 2rem; bottom: 1.8rem; }
  .game-card.is-hero .game-desc {   /* hero shows its blurb without needing hover */
    display: -webkit-box;
    -webkit-line-clamp: 3;          /* bound the height — ellipsis, never a hard mid-line cut */
    -webkit-box-orient: vertical;
    overflow: hidden;
    max-height: none;
    opacity: 1;
    margin-top: 0.5rem;
    max-width: 54ch;
  }
  .game-card.is-hero .game-frame::after { opacity: 0.82; }

  .game-frame {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;      /* matches the source covers → object-fit:cover never crops */
    overflow: hidden;
    border-radius: 2px;
    background: #1a1410;
    box-shadow:
      0 1px 0 rgba(255,255,255,0.04) inset,
      0 30px 60px -30px rgba(0,0,0,0.7),
      0 8px 24px -8px rgba(0,0,0,0.5);
    transition: transform 0.5s cubic-bezier(.2,.8,.2,1), box-shadow 0.5s;
  }

  .game-frame img,
  .game-frame .svg-cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.8s cubic-bezier(.2,.8,.2,1), filter 0.5s;
  }
  .game-frame::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(12,12,16,0.85) 0%, rgba(12,12,16,0) 45%);
    opacity: 0.6;
    transition: opacity 0.5s;
    pointer-events: none;
  }
  .game-card:hover .game-frame { transform: translateY(-4px); }
  .game-card:hover .game-frame img,
  .game-card:hover .game-frame .svg-cover { transform: scale(1.04); filter: brightness(1.05); }
  .game-card:hover .game-frame::after { opacity: 0.9; }

  .game-meta {
    position: absolute;
    left: 1.4rem;
    right: 1.4rem;
    bottom: 1.2rem;
    z-index: 2;
  }
  .game-name {
    font-family: var(--serif);
    font-size: 1.6rem;
    line-height: 1.2;
    color: #f5efe1;
    margin: 0;
    letter-spacing: -0.005em;
    font-weight: 600;
  }
  .game-desc {
    margin: 0.4rem 0 0;
    font-family: var(--sans);
    font-size: 0.88rem;
    line-height: 1.5;
    color: rgba(245, 239, 225, 0.72);
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    transition: max-height 0.4s ease, opacity 0.4s ease, margin 0.4s ease;
  }
  .game-card:hover .game-desc {
    max-height: 5em;
    opacity: 1;
    margin-top: 0.5rem;
  }
  .game-play {
    position: absolute;
    top: 1.2rem;
    right: 1.2rem;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.8rem;
    background: rgba(12,12,16,0.6);
    backdrop-filter: blur(6px);
    border: 1px solid rgba(245,239,225,0.18);
    border-radius: 999px;
    font-family: var(--sans);
    font-size: 0.74rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #f5efe1;
    opacity: 0;
    transform: translateY(-4px);
    transition: opacity 0.4s, transform 0.4s;
  }
  .game-card:hover .game-play {
    opacity: 1;
    transform: translateY(0);
  }

  .games-empty {
    padding: 4rem 0;
    color: #8a7f73;
    font-style: italic;
  }

  /* —— card link wrapper (card became a <div> so reactions can live outside the <a>) —— */
  .game-link { display: block; color: inherit; text-decoration: none; position: relative; }

  /* —— compact reactions over each cover (top-left, mirrors ▶ Play top-right) —— */
  .game-react {
    position: absolute; top: 1.1rem; left: 1.1rem; z-index: 4;
    display: inline-flex; gap: .4rem; opacity: .85; transition: opacity .3s;
  }
  .game-card:hover .game-react { opacity: 1; }
  .game-react .mg-mini {
    background: rgba(12,12,16,0.58); backdrop-filter: blur(6px);
    border: 1px solid rgba(245,239,225,0.18); color: #f5efe1;
  }
  .game-react .mg-mini:hover { border-color: #d97570; color: #d97570; }
  .game-react .mg-heart { color: rgba(245,239,225,0.6); }
  .game-react .mg-like.liked { color: #d97570; border-color: #d97570; }
  .game-react .mg-like.liked .mg-heart { color: #d97570; }

  /* —— filter chips tuned for the dark gallery shell —— */
  .games-inner .mg-filter-bar { margin: 0 0 2.6rem; }
  .games-inner .ms-chip {
    color: rgba(245,239,225,0.78); border-color: rgba(245,239,225,0.22); background: transparent;
  }
  .games-inner .ms-chip span { color: rgba(245,239,225,0.5); }
  .games-inner .ms-chip:hover { border-color: #d97570; color: #d97570; }
  .games-inner .ms-chip.active { background: #8b2e2a; border-color: #8b2e2a; color: #f5efe1; }
  .games-inner .ms-chip.active span { color: rgba(245,239,225,0.7); }
  .games-inner .mg-filter-empty { color: #8a7f73; }

  @media (max-width: 800px) {
    .games-shell { padding: 3rem 0 4rem; }
    .games-inner { padding: 0 1.2rem; }
    .games-grid { gap: 1.5rem; }
    .game-card { grid-column: span 12; }
    /* short 16:9 frames have no room for a hero blurb on phones — title only */
    .game-card.is-hero .game-desc { display: none; }
    .game-card.is-hero .game-name { font-size: 1.6rem; }
  }
</style>

<div class="games-shell">
  <div class="games-bgimg" aria-hidden="true"></div>
  <canvas id="games-fx" aria-hidden="true"></canvas>
  <div class="games-inner">
    <p class="games-eyebrow">¶ The Arcade Wing</p>
    <h1 class="games-title">Games</h1>
    <hr class="games-rule">
    <p class="games-lede">
      用 AI 协作写出来的可玩 HTML 小品。每一个都是单文件即开即玩——没有安装、没有账号、没有广告。把封面看成一张展厅里的海报，点进去就是开始。
    </p>

    {% assign games = site.games | sort: "date" | reverse %}
    {% if games.size == 0 %}
      <p class="games-empty">展厅暂时空着——下一局正在装裱。</p>
    {% else %}
    <section data-filter data-filter-all="全部" data-filter-order="3D · 沉浸,AI · 多智能体,卡牌 · Roguelike,叙事 · 模拟,休闲 · 经典">
      <div class="mg-filter-bar" data-filter-chips></div>
      <div class="games-grid">
        {% for g in games %}
          {% assign is_external = false %}
          {% if g.play_url contains '://' %}{% assign is_external = true %}{% endif %}
          <div class="game-card{% if forloop.first %} is-hero{% endif %}" data-cats="{{ g.category | escape }}">
            <a class="game-link" href="{% if is_external %}{{ g.play_url }}{% else %}{{ g.play_url | relative_url }}{% endif %}"{% if is_external %} target="_blank" rel="noopener"{% endif %}>
              <div class="game-frame">
                {% if g.cover contains '.svg' %}
                  <img class="svg-cover" src="{{ g.cover | relative_url }}" alt="{{ g.title | escape }}" loading="lazy">
                {% else %}
                  <img src="{{ g.cover | relative_url }}" alt="{{ g.title | escape }}" loading="lazy">
                {% endif %}
              </div>
              <span class="game-play">▶ Play</span>
              <div class="game-meta">
                <h2 class="game-name">{{ g.title }}</h2>
                {% if g.description and g.description != "" %}
                  <p class="game-desc">{{ g.description }}</p>
                {% endif %}
              </div>
            </a>
            <div class="mg-card-react game-react" data-mg-react data-mode="compact"
                 data-slug="game:{{ g.slug }}" data-title="{{ g.title | escape }}"
                 data-url="{% if is_external %}{{ g.play_url }}{% else %}{{ g.play_url | relative_url }}{% endif %}"></div>
          </div>
        {% endfor %}
      </div>
    </section>
    {% endif %}
  </div>
</div>

<script>
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* —— staggered card entrances (nonlinear, scroll-triggered) —— */
  const cards = document.querySelectorAll(".game-card");
  cards.forEach((c, i) => c.style.setProperty("--d", i % 4));
  if (reduced || !("IntersectionObserver" in window)) {
    cards.forEach((c) => c.classList.add("in"));
  } else {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -4% 0px" });
    cards.forEach((c) => io.observe(c));
  }

  /* —— drifting embers: prerendered sprites + additive compositing ——
     deliberately NOT gated on prefers-reduced-motion: ambient backdrop, runs always */
  const cv = document.getElementById("games-fx");
  const ctx = cv.getContext("2d");
  const DPR = Math.min(devicePixelRatio || 1, 1.5);
  let W = 0, H = 0;

  // sprite factory: soft radial glow baked once (no per-frame shadowBlur)
  function sprite(r, g, b) {
    const s = document.createElement("canvas");
    s.width = s.height = 64;
    const c = s.getContext("2d");
    const grad = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(0.25, `rgba(${r},${g},${b},0.55)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    c.fillStyle = grad;
    c.fillRect(0, 0, 64, 64);
    return s;
  }
  const GOLD = sprite(232, 199, 137);
  const EMBER = sprite(217, 117, 112);

  const ps = [];
  function spawn(p, fresh) {
    p.x = Math.random() * W;
    p.y = fresh ? Math.random() * H : H + 20;
    p.size = 2.0 + Math.random() * 4.2;            // px radius at DPR 1
    p.vy = 9 + Math.random() * 22;                 // px/s upward
    p.swayAmp = 14 + Math.random() * 30;
    p.swayFreq = 0.25 + Math.random() * 0.5;
    p.phase = Math.random() * Math.PI * 2;
    p.alpha = 0.32 + Math.random() * 0.5;
    p.twFreq = 0.6 + Math.random() * 1.8;          // twinkle
    p.img = Math.random() < 0.22 ? EMBER : GOLD;
    return p;
  }
  function resize() {
    W = innerWidth; H = innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const want = Math.round(Math.min(120, (W * H) / 21000)); // density-scaled, capped
    while (ps.length < want) ps.push(spawn({}, true));
    ps.length = want;
  }
  resize();
  addEventListener("resize", resize);

  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    const tt = t / 1000;
    for (const p of ps) {
      p.y -= p.vy * dt;
      if (p.y < -20) spawn(p, false);
      const x = p.x + Math.sin(tt * p.swayFreq * Math.PI * 2 + p.phase) * p.swayAmp;
      const tw = 0.65 + 0.35 * Math.sin(tt * p.twFreq * Math.PI * 2 + p.phase * 1.7);
      ctx.globalAlpha = p.alpha * tw;
      const d = p.size * 8;                        // sprite is mostly halo — draw big
      ctx.drawImage(p.img, x - d / 2, p.y - d / 2, d, d);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  requestAnimationFrame(frame);
})();
</script>

<script src="{{ '/assets/js/filter.js' | relative_url }}" defer></script>
