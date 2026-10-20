/* Marginalia 互动层：点赞 + 评论 + 全站「消息盒子」。
 * 后端地址来自 <meta name="mg-api">（_config.yml: comments_api）。没有配置则整层静默禁用。
 * 无依赖。键(slug)：详情页用 page.url，列表卡片用 showcase:/game: 前缀。 */
(function () {
  'use strict';

  var metaEl = document.querySelector('meta[name="mg-api"]');
  var API = metaEl && metaEl.content ? metaEl.content.trim().replace(/\/+$/, '') : '';
  if (!API) return;

  /* ------------------------------------------------ utils */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function relTime(ts) {
    var d = Math.floor(Date.now() / 1000) - ts;
    if (d < 60) return '刚刚';
    if (d < 3600) return Math.floor(d / 60) + ' 分钟前';
    if (d < 86400) return Math.floor(d / 3600) + ' 小时前';
    if (d < 86400 * 30) return Math.floor(d / 86400) + ' 天前';
    var dt = new Date(ts * 1000);
    return dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + dt.getDate()).slice(-2);
  }
  function getJSON(path) {
    return fetch(API + path, { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r); });
  }
  function postJSON(path, body) {
    return fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (j) { return r.ok ? j : Promise.reject(j); });
    });
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ------------------------------------------------ overlay (shared slide-overs) */
  var backdrop = el('div', 'mg-backdrop');
  backdrop.hidden = true;
  document.body.appendChild(backdrop);
  var openPanel = null;
  function show(panel) {
    if (openPanel && openPanel !== panel) openPanel.classList.remove('open');
    openPanel = panel;
    backdrop.hidden = false;
    requestAnimationFrame(function () { backdrop.classList.add('on'); panel.classList.add('open'); });
    document.body.style.overflow = 'hidden';
  }
  function hide() {
    if (openPanel) openPanel.classList.remove('open');
    openPanel = null;
    backdrop.classList.remove('on');
    setTimeout(function () { if (!openPanel) backdrop.hidden = true; }, 280);
    document.body.style.overflow = '';
  }
  backdrop.addEventListener('click', hide);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openPanel) hide(); });

  /* ------------------------------------------------ comment thread (shared by full widget + drawer) */
  function commentNode(c) {
    var node = el('li', 'mg-comment');
    node.innerHTML =
      '<div class="mg-c-head"><span class="mg-c-name">' + esc(c.name || '匿名') + '</span>' +
      '<time class="mg-c-time">' + relTime(c.ts) + '</time></div>' +
      '<div class="mg-c-body">' + esc(c.body).replace(/\n/g, '<br>') + '</div>';
    return node;
  }

  function buildForm(slug, title, url, onPosted) {
    var form = el('form', 'mg-form');
    form.innerHTML =
      '<input class="mg-f-name" name="name" maxlength="40" placeholder="昵称（可选）" autocomplete="nickname">' +
      '<textarea class="mg-f-body" name="body" rows="3" maxlength="2000" placeholder="写下你的评论…" required></textarea>' +
      '<input class="mg-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="mg-f-row"><span class="mg-f-msg" role="status"></span>' +
      '<button class="mg-f-submit" type="submit">发表评论</button></div>';
    var msg = form.querySelector('.mg-f-msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('.mg-f-submit');
      var body = form.querySelector('.mg-f-body').value.trim();
      if (!body) return;
      btn.disabled = true; msg.textContent = '发送中…'; msg.className = 'mg-f-msg';
      postJSON('/api/comments', {
        slug: slug, title: title, url: url,
        name: form.querySelector('.mg-f-name').value.trim(),
        body: body,
        website: form.querySelector('.mg-hp').value
      }).then(function (res) {
        btn.disabled = false;
        form.querySelector('.mg-f-body').value = '';
        msg.textContent = '已发表 ✓'; msg.className = 'mg-f-msg ok';
        if (res.comment && onPosted) onPosted(res.comment, res.comments);
        setTimeout(function () { msg.textContent = ''; }, 2500);
      }).catch(function (err) {
        btn.disabled = false;
        msg.textContent = (err && err.error) ? err.error : '发送失败，稍后再试';
        msg.className = 'mg-f-msg err';
      });
    });
    return form;
  }

  /* renders: <count header> + <form> + <list> into `mount`. returns API to push new comments. */
  function renderThread(mount, slug, title, url, onCount) {
    mount.innerHTML = '';
    var head = el('div', 'mg-thread-head', '<span class="mg-thread-count">评论</span>');
    var countEl = head.querySelector('.mg-thread-count');
    var list = el('ul', 'mg-comment-list');
    var empty = el('p', 'mg-thread-empty', '还没有评论，来留下第一句吧。');
    function setCount(n) {
      countEl.textContent = n > 0 ? (n + ' 条评论') : '评论';
      empty.style.display = n > 0 ? 'none' : '';
      if (onCount) onCount(n);
    }
    var form = buildForm(slug, title, url, function (c, total) {
      list.insertBefore(commentNode(c), list.firstChild);
      setCount(typeof total === 'number' ? total : list.children.length);
      pushRecent(c);
    });
    mount.appendChild(head);
    mount.appendChild(form);
    mount.appendChild(empty);
    mount.appendChild(list);
    setCount(0);
    getJSON('/api/comments?slug=' + encodeURIComponent(slug)).then(function (data) {
      (data.comments || []).forEach(function (c) { list.appendChild(commentNode(c)); });
      setCount(data.count || (data.comments || []).length);
    }).catch(function () { empty.textContent = '评论服务暂不可用。'; });
  }

  /* ------------------------------------------------ like button */
  function bindLike(btn, slug) {
    var countEl = btn.querySelector('.mg-like-n');
    function paint(n, liked) {
      countEl.textContent = n;
      btn.classList.toggle('liked', !!liked);
      btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
    }
    btn.addEventListener('click', function () {
      btn.disabled = true;
      postJSON('/api/like', { slug: slug }).then(function (r) {
        paint(r.likes, r.liked);
        btn.disabled = false;
        if (r.liked) { btn.classList.remove('pulse'); void btn.offsetWidth; btn.classList.add('pulse'); }
      }).catch(function () { btn.disabled = false; });
    });
    return { paint: paint };
  }

  /* ------------------------------------------------ comment drawer (for compact cards) */
  var drawer = el('aside', 'mg-drawer');
  drawer.hidden = true;
  drawer.innerHTML =
    '<div class="mg-drawer-head"><h3 class="mg-drawer-title"></h3>' +
    '<button class="mg-x" type="button" aria-label="关闭">✕</button></div>' +
    '<div class="mg-drawer-body"></div>';
  document.body.appendChild(drawer);
  drawer.querySelector('.mg-x').addEventListener('click', hide);
  function openDrawer(slug, title, url, onCount) {
    drawer.hidden = false;
    drawer.querySelector('.mg-drawer-title').textContent = title || '评论';
    renderThread(drawer.querySelector('.mg-drawer-body'), slug, title, url, onCount);
    show(drawer);
  }

  /* ------------------------------------------------ widgets */
  var compactWidgets = [];   // {slug, likeApi, setComments}

  function mountFull(node) {
    var slug = node.getAttribute('data-slug');
    var title = node.getAttribute('data-title') || document.title;
    var url = node.getAttribute('data-url') || location.pathname;
    node.innerHTML =
      '<div class="mg-bar">' +
        '<button class="mg-like" type="button" aria-pressed="false" aria-label="点赞">' +
          '<span class="mg-heart" aria-hidden="true">♥</span><span class="mg-like-n">0</span>' +
        '</button>' +
        '<span class="mg-bar-label">喜欢这篇？点个赞，或在下面留言。</span>' +
      '</div>' +
      '<div class="mg-thread"></div>';
    var likeApi = bindLike(node.querySelector('.mg-like'), slug);
    renderThread(node.querySelector('.mg-thread'), slug, title, url);
    getJSON('/api/stats?slug=' + encodeURIComponent(slug)).then(function (d) {
      var s = d[slug]; if (s) likeApi.paint(s.likes, s.liked);
    }).catch(function () {});
  }

  function mountCompact(node) {
    var slug = node.getAttribute('data-slug');
    var title = node.getAttribute('data-title') || '';
    var url = node.getAttribute('data-url') || '';
    node.innerHTML =
      '<button class="mg-like mg-mini" type="button" aria-pressed="false" aria-label="点赞">' +
        '<span class="mg-heart" aria-hidden="true">♥</span><span class="mg-like-n">0</span></button>' +
      '<button class="mg-cbtn mg-mini" type="button" aria-label="评论">' +
        '<span aria-hidden="true">💬</span><span class="mg-c-n">0</span></button>';
    var likeApi = bindLike(node.querySelector('.mg-like'), slug);
    var cN = node.querySelector('.mg-c-n');
    node.querySelector('.mg-cbtn').addEventListener('click', function () {
      openDrawer(slug, title, url, function (n) { cN.textContent = n; });
    });
    compactWidgets.push({ slug: slug, likeApi: likeApi, setComments: function (n) { cN.textContent = n; } });
  }

  /* batch-fill all compact card counts in one request */
  function fillCompact() {
    if (!compactWidgets.length) return;
    var slugs = compactWidgets.map(function (w) { return w.slug; });
    getJSON('/api/stats?slugs=' + encodeURIComponent(slugs.join(','))).then(function (d) {
      compactWidgets.forEach(function (w) {
        var s = d[w.slug]; if (!s) return;
        w.likeApi.paint(s.likes, s.liked);
        w.setComments(s.comments);
      });
    }).catch(function () {});
  }

  /* ------------------------------------------------ message box (sitewide recent comments) */
  var msgbox = el('aside', 'mg-msgbox');
  msgbox.hidden = true;
  msgbox.innerHTML =
    '<div class="mg-drawer-head"><h3 class="mg-drawer-title">消息 · 最近评论</h3>' +
    '<button class="mg-x" type="button" aria-label="关闭">✕</button></div>' +
    '<div class="mg-msg-body"><p class="mg-thread-empty">加载中…</p></div>';
  document.body.appendChild(msgbox);
  msgbox.querySelector('.mg-x').addEventListener('click', hide);
  var msgBody = msgbox.querySelector('.mg-msg-body');
  var msgBtn = document.querySelector('[data-msgbox-open]');
  var msgBadge = msgBtn && msgBtn.querySelector('.mg-msg-badge');
  var recentCache = [];

  function seenTs() { try { return parseInt(localStorage.getItem('mg-msg-seen') || '0', 10) || 0; } catch (e) { return 0; } }
  function setSeen(ts) { try { localStorage.setItem('mg-msg-seen', String(ts)); } catch (e) {} }

  function paintBadge() {
    if (!msgBadge) return;
    var seen = seenTs();
    var unread = recentCache.filter(function (c) { return c.ts > seen; }).length;
    if (unread > 0) { msgBadge.textContent = unread > 99 ? '99+' : unread; msgBadge.hidden = false; }
    else { msgBadge.hidden = true; }
  }

  function renderRecent() {
    if (!recentCache.length) { msgBody.innerHTML = '<p class="mg-thread-empty">还没有评论。成为第一个留言的人。</p>'; return; }
    var seen = seenTs();
    var ul = el('ul', 'mg-msg-list');
    recentCache.forEach(function (c) {
      var li = el('li', 'mg-msg-item' + (c.ts > seen ? ' unread' : ''));
      var href = c.url || '#';
      li.innerHTML =
        '<a href="' + esc(href) + '">' +
        '<div class="mg-msg-top"><span class="mg-c-name">' + esc(c.name || '匿名') + '</span>' +
        '<time class="mg-c-time">' + relTime(c.ts) + '</time></div>' +
        '<div class="mg-msg-text">' + esc(c.body).slice(0, 140) + '</div>' +
        (c.title ? '<div class="mg-msg-src">在《' + esc(c.title) + '》下' + '</div>' : '') +
        '</a>';
      ul.appendChild(li);
    });
    msgBody.innerHTML = '';
    msgBody.appendChild(ul);
  }

  function loadRecent() {
    return getJSON('/api/recent?limit=20').then(function (d) {
      recentCache = d.comments || [];
      paintBadge();
    }).catch(function () { recentCache = []; });
  }

  /* optimistically surface a just-posted comment in the inbox */
  function pushRecent(c) {
    recentCache.unshift(c);
    if (recentCache.length > 20) recentCache.pop();
    if (openPanel === msgbox) renderRecent();
  }

  if (msgBtn) {
    msgBtn.addEventListener('click', function () {
      renderRecent();
      show(msgbox);
      if (recentCache.length) setSeen(Math.max.apply(null, recentCache.map(function (c) { return c.ts; })));
      else setSeen(Math.floor(Date.now() / 1000));
      paintBadge();
    });
  }

  /* ------------------------------------------------ boot */
  document.querySelectorAll('[data-mg-react]').forEach(function (node) {
    if (node.getAttribute('data-mode') === 'compact') mountCompact(node);
    else mountFull(node);
  });
  fillCompact();
  loadRecent();
})();
