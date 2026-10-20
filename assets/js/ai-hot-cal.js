/* AI Hot 晨报日历：按月网格，有报的日子可点（跳详情页），热度由条数深浅表示。
 * 数据来自页内 #hot-days（Liquid 构建期生成）。 */
(function () {
  'use strict';
  var raw = document.getElementById('hot-days');
  var box = document.getElementById('hot-calendar');
  if (!raw || !box) return;
  var days = JSON.parse(raw.textContent).filter(Boolean);
  if (!days.length) return;

  var byDate = {};
  var maxN = 1;
  days.forEach(function (d) { byDate[d.date] = d; if (d.n > maxN) maxN = d.n; });

  /* 月份范围：最早一期 → 最晚一期 */
  var dates = days.map(function (d) { return d.date; }).sort();
  var first = dates[0], last = dates[dates.length - 1];
  var fy = +first.slice(0, 4), fm = +first.slice(5, 7);
  var ly = +last.slice(0, 4), lm = +last.slice(5, 7);

  var months = [];
  for (var y = ly, m = lm; y > fy || (y === fy && m >= fm); ) {
    months.push([y, m]);
    if (--m === 0) { m = 12; y--; }
  }

  var WD = ['一', '二', '三', '四', '五', '六', '日'];
  var html = '';
  months.forEach(function (ym) {
    var y = ym[0], m = ym[1];
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var daysInMonth = new Date(y, m, 0).getDate();
    var firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7;  /* 周一=0 */
    html += '<div class="hot-month"><div class="hot-month-name">' + y + ' 年 ' + m + ' 月</div>';
    html += '<div class="hot-grid">';
    WD.forEach(function (w) { html += '<span class="hot-wd">' + w + '</span>'; });
    for (var i = 0; i < firstDow; i++) html += '<span class="hot-cell hot-cell--pad"></span>';
    for (var d = 1; d <= daysInMonth; d++) {
      var key = y + '-' + pad(m) + '-' + pad(d);
      var hit = byDate[key];
      if (hit) {
        var heat = Math.min(3, Math.ceil(hit.n / (maxN / 3 || 1)));
        html += '<a class="hot-cell hot-cell--on heat-' + heat + '" href="' + hit.url +
                '" title="' + key + ' · ' + hit.n + ' 条">' + d + '</a>';
      } else {
        html += '<span class="hot-cell">' + d + '</span>';
      }
    }
    html += '</div></div>';
  });
  box.innerHTML = '<div class="hot-cal-scroll">' + html + '</div>' +
    '<p class="hot-cal-legend">共 <b>' + days.length + '</b> 期 · 颜色越深当天条数越多 · 左右滑动看更早月份</p>';
})();
