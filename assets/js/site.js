/* Marginalia 站点交互：夜读主题切换、滚动入场、阅读进度、夜读伴奏。无依赖。 */
(function () {
  'use strict';
  var root = document.documentElement;

  /* ---- 夜读主题 ---- */
  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('mg-theme', next); } catch (e) {}
      document.dispatchEvent(new CustomEvent('mg:theme', { detail: next }));
    });
  });

  /* ---- 首页：header 滚动后落回纸面底 ---- */
  var header = document.querySelector('.site-header');
  if (header && document.body.classList.contains('has-hero')) {
    var hTick = false;
    function paintHeader() {
      header.classList.toggle('scrolled', window.scrollY > 40);
      hTick = false;
    }
    window.addEventListener('scroll', function () {
      if (!hTick) { hTick = true; requestAnimationFrame(paintHeader); }
    }, { passive: true });
    paintHeader();
  }

  /* ---- 滚动入场（reveal）---- */
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });
  }
  /* 降级保险：万一 observer 没触发，2s 后全部显示 */
  setTimeout(function () { reveals.forEach(function (el) { el.classList.add('in'); }); }, 2200);

  /* ---- 阅读进度条（文章类页面）---- */
  var layout = document.body.getAttribute('data-layout');
  var bar = document.querySelector('.read-progress span');
  if (bar && (layout === 'post' || layout === 'ai-hot' || layout === 'video')) {
    document.querySelector('.read-progress').classList.add('on');
    var ticking = false;
    function paint() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, h.scrollTop / max) : 0) + ')';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(paint); }
    }, { passive: true });
    paint();
  }

  /* ---- 夜读伴奏（ambient 播放列表；永不自动播放）----
     data-src 支持逗号分隔的多条音频，播完自动切下一首并循环到列表开头。 */
  var ambientPlaylist = [];
  var ambientTrack = 0;
  var ambientPlayer = null;

  function ambientSetPlaying(on) {
    document.querySelectorAll('[data-ambient]').forEach(function (b) {
      if (on) { b.classList.add('playing'); } else { b.classList.remove('playing'); }
    });
  }

  function ambientLoad(i) {
    if (!ambientPlayer || i < 0 || i >= ambientPlaylist.length) return;
    ambientTrack = i;
    ambientPlayer.src = ambientPlaylist[ambientTrack];
  }

  document.querySelectorAll('[data-ambient]').forEach(function (btn) {
    // 解析各按钮的 data-src（逗号分隔），合并去重成全局播放列表
    (btn.getAttribute('data-src') || '')
      .split(',').map(function (s) { return s.trim(); }).filter(Boolean)
      .forEach(function (u) { if (ambientPlaylist.indexOf(u) === -1) ambientPlaylist.push(u); });

    btn.addEventListener('click', function () {
      if (ambientPlaylist.length === 0) return;
      if (!ambientPlayer) {
        ambientPlayer = new Audio();
        ambientPlayer.volume = 0.55;
        ambientPlayer.addEventListener('ended', function () {
          // 播完自动切下一首，循环回列表开头
          ambientLoad((ambientTrack + 1) % ambientPlaylist.length);
          ambientPlayer.play().then(function () { ambientSetPlaying(true); }).catch(function () {});
        });
      }
      if (ambientPlayer.paused) {
        if (!ambientPlayer.src) ambientLoad(ambientTrack);
        ambientPlayer.play().then(function () { ambientSetPlaying(true); }).catch(function () {});
      } else {
        ambientPlayer.pause();
        ambientSetPlaying(false);
      }
    });
  });

  /* ---- hero 视频：纯氛围装饰层，有意豁免 prefers-reduced-motion ----
     Windows 关「动画效果」会让桌面浏览器报 reduce，若门控则首页水墨 loop 永远静止。
     位移类动画（.reveal）仍保持门控。autoplay 偶发被浏览器拦时手动补一次 play()。 */
  document.querySelectorAll('.hero-media').forEach(function (v) {
    if (v.paused && v.play) { v.play().catch(function () {}); }
  });
})();
