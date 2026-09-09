/* Ay Sonu Bayi Performans Karnesi V2
 * Ürünler birbirine eklenmez; yalnızca "Mobil" görünümü Postpaid + Prepaid
 * kaynağındaki hazır "Toplam Mobil" satırını kullanır.
 */
var MER_TABLE_PRODUCTS = [
  { label: 'Faturalı', key: 'Postpaid', hist: 'postpaid', region: 'postpaid', color: '#f20a7a' },
  { label: 'Faturasız', key: 'Prepaid', hist: 'prepaid', region: 'prepaid', color: '#16c7ee' },
  { label: 'Toplam Mobil', key: 'Toplam Mobil', hist: 'mobil', region: 'mobil', color: '#315a87' },
  { label: 'DSL', key: 'DSL', hist: 'dsl', region: 'dsl', color: '#42c966' },
  { label: 'IPTV', key: 'IPTV', hist: 'iptv', region: 'iptv', color: '#9c55dd' },
  { label: 'Uydu TV', key: 'Uydu', hist: 'uydu', region: 'uydu', color: '#ff7b17' },
  { label: 'Cihaz', key: 'Akıllı Cihaz', hist: 'akilliCihaz', region: 'akilliCihaz', color: '#f5c400' }
];

var MER_TREND_PRODUCTS = [
  { label: 'Mobil', key: 'Toplam Mobil', hist: 'mobil', region: 'mobil', color: '#f20a7a' },
  { label: 'DSL', key: 'DSL', hist: 'dsl', region: 'dsl', color: '#42c966' },
  { label: 'IPTV', key: 'IPTV', hist: 'iptv', region: 'iptv', color: '#9c55dd' },
  { label: 'Uydu TV', key: 'Uydu', hist: 'uydu', region: 'uydu', color: '#ff7b17' },
  { label: 'Cihaz', key: 'Akıllı Cihaz', hist: 'akilliCihaz', region: 'akilliCihaz', color: '#f5c400' },
  { label: 'Diğer Cihaz', key: 'Diğer Cihaz', hist: 'digerCihaz', region: 'digerCihaz', color: '#3e72a5' }
];

var MER_YTD_PRODUCTS = MER_TABLE_PRODUCTS.filter(function (p) { return p.label !== 'Toplam Mobil'; });
var MER_STAFF_PRODUCTS = [
  { label: 'Mobil', key: 'Toplam Mobil' },
  { label: 'DSL', key: 'DSL' },
  { label: 'IPTV', key: 'IPTV' },
  { label: 'Uydu', key: 'Uydu' },
  { label: 'Cihaz', key: 'Akıllı Cihaz' },
  { label: 'Diğer', key: 'Diğer Cihaz' }
];

var merDealerCode = null;

function merN(v) { return v == null ? '—' : Math.round(v).toLocaleString('tr-TR'); }
function merP(v) { return v == null || !isFinite(v) ? '—' : '%' + Number(v).toFixed(v % 1 ? 1 : 0).replace('.', ','); }
function merSignedP(v) { return v == null || !isFinite(v) ? '—' : (v >= 0 ? '+' : '-') + '%' + Math.abs(v).toFixed(Math.abs(v) % 1 ? 1 : 0).replace('.', ','); }
function merMonthShort(period) {
  var months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return months[Number(String(period || '').slice(5, 7)) - 1] || '';
}
function merPeriod() {
  var d = (typeof DONEM !== 'undefined' && DONEM) || '';
  return d || new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }).toLocaleUpperCase('tr-TR');
}
function merReportYear() {
  return Number(String((typeof DONEM !== 'undefined' && DONEM) || new Date().getFullYear()).slice(0, 4));
}
function merCodes() {
  return Object.keys((typeof DETAY !== 'undefined' && DETAY.bayiler) || {}).sort(function (a, b) {
    return DETAY.bayiler[a].b.localeCompare(DETAY.bayiler[b].b, 'tr');
  });
}
function merHistoryValue(code, pm, period) {
  var doc = typeof HIST2_DATA !== 'undefined' ? HIST2_DATA[period] : null;
  if (!doc || !doc.dealers) return null;
  var dealer = doc.dealers.find(function (x) { return String(x.bayiKodu) === String(code); });
  if (!dealer) return null;
  return dealer[pm.hist] || null;
}
function merSeries(code, pm) {
  var reportPeriod = String((typeof DONEM !== 'undefined' && DONEM) || '').replace('/', '-');
  var year = reportPeriod.slice(0, 4) || String(new Date().getFullYear());
  var out = [];
  if (typeof HIST2_DATA !== 'undefined') {
    Object.keys(HIST2_DATA).sort().forEach(function (period) {
      if (period.slice(0, 4) !== year || (reportPeriod && period > reportPeriod)) return;
      var x = merHistoryValue(code, pm, period);
      if (x) out.push({ period: period, a: x.adet || 0, h: x.hedef || 0 });
    });
  }
  return out.slice(-12);
}
function merStats(code, pm, current) {
  var series = merSeries(code, pm);
  var a = current ? Number(current.a || 0) : 0;
  var h = current ? Number(current.h || 0) : 0;
  var g = h ? a / h * 100 : null;
  var days = (typeof SYDATA !== 'undefined' && SYDATA.calisilanGun) || 30;
  var reportPeriod = String((typeof DONEM !== 'undefined' && DONEM) || '').replace('/', '-');
  var refPeriod = reportPeriod || ((series.length && series[series.length - 1].period) || '');
  var prevMonth = refPeriod ? merHistoryValue(code, pm, String(Number(refPeriod.slice(0, 4)) - 1) + refPeriod.slice(4)) : null;

  /* Geçmişte rapor ayı varsa son noktayı güncel gerçekleşen/hedef ile değiştir. */
  if (refPeriod && current) {
    var currentIndex = series.findIndex(function (x) { return x.period === refPeriod; });
    var currentPoint = { period: refPeriod, a: a, h: h };
    if (currentIndex >= 0) series[currentIndex] = currentPoint;
    else series.push(currentPoint);
    series.sort(function (x, y) { return x.period.localeCompare(y.period); });
  }

  var ytdA = series.length ? series.reduce(function (sum, x) { return sum + x.a; }, 0) : null;
  var ytdTarget = series.length ? series.reduce(function (sum, x) { return sum + x.h; }, 0) : null;
  var ytdGap = ytdA == null || ytdTarget == null ? null : ytdA - ytdTarget;
  var ytdHgo = ytdTarget ? ytdA / ytdTarget * 100 : null;
  var prevYear = refPeriod ? String(Number(refPeriod.slice(0, 4)) - 1) : '';
  var prevEnd = prevYear + (refPeriod ? refPeriod.slice(4) : '');
  var ytdPrev = null;
  if (prevYear && typeof HIST2_DATA !== 'undefined') {
    var prevValues = [];
    Object.keys(HIST2_DATA).sort().forEach(function (period) {
      if (period.slice(0, 4) !== prevYear || period > prevEnd) return;
      var x = merHistoryValue(code, pm, period);
      if (x) prevValues.push(x.adet || 0);
    });
    if (prevValues.length) ytdPrev = prevValues.reduce(function (sum, value) { return sum + value; }, 0);
  }
  var ytdDiff = ytdA == null || ytdPrev == null ? null : ytdA - ytdPrev;
  var ytdYoY = ytdPrev ? ytdDiff / ytdPrev * 100 : null;
  var yoy = prevMonth && prevMonth.adet ? (a - prevMonth.adet) / prevMonth.adet * 100 : null;
  return {
    a: a, h: h, g: g, daily: a / days, ytd: ytdA, ytdTarget: ytdTarget,
    ytdGap: ytdGap, ytdHgo: ytdHgo, ytdPrev: ytdPrev, ytdDiff: ytdDiff,
    ytdYoY: ytdYoY, yoy: yoy, series: series
  };
}
function merProductData(dealer, definitions) {
  return definitions.map(function (pm) {
    return Object.assign({}, pm, { stats: merStats(dealer.kod, pm, dealer.prods[pm.key]) });
  });
}
function merRegionHgo(pm) {
  var region = typeof MATRIX !== 'undefined' && MATRIX && MATRIX.kuzey;
  if (!region) return null;
  var value = region[pm.region];
  return typeof value === 'number' ? value : null;
}
function merRegionRank(pm, code) {
  var rows = [];
  var dealers = (typeof DETAY !== 'undefined' && DETAY.bayiler) || {};
  Object.keys(dealers).forEach(function (dealerCode) {
    var value = dealers[dealerCode].prods && dealers[dealerCode].prods[pm.key];
    if (!value || !value.h) return;
    rows.push({ code: String(dealerCode), g: Number(value.g != null ? value.g : value.a / value.h * 100), a: Number(value.a || 0) });
  });
  rows.sort(function (x, y) { return y.g - x.g || y.a - x.a || x.code.localeCompare(y.code); });
  var position = rows.findIndex(function (x) { return x.code === String(code); });
  return position < 0 ? '—' : (position + 1) + '/' + rows.length;
}
function merGap(v) { return v == null ? '—' : v === 0 ? 'Tam' : (v > 0 ? '+' : '') + merN(v); }

function merSpark(stats, color) {
  var entries = stats.series.length ? stats.series.map(function (x) { return { a: x.a, period: x.period }; }) : [{ a: stats.a, period: '' }, { a: stats.a, period: '' }];
  while (entries.length < 8) entries.unshift({ a: null, period: '' });
  entries = entries.slice(-8);
  var values = entries.map(function (x) { return x.a; });
  var numbers = values.filter(function (v) { return v != null; });
  var max = Math.max.apply(null, numbers.concat([stats.h, 1]));
  var min = Math.min.apply(null, numbers.concat([stats.h]));
  var span = max - min || 1;
  var points = values.map(function (v, i) { return v == null ? null : [i * 250 / 7, 61 - (v - min) / span * 43, v]; }).filter(Boolean);
  var line = points.map(function (p) { return p[0] + ',' + p[1]; }).join(' ');
  var targetY = 61 - (stats.h - min) / span * 43;
  return '<svg viewBox="0 0 250 88" preserveAspectRatio="none">' +
    '<line x1="0" y1="' + targetY + '" x2="250" y2="' + targetY + '" stroke="' + color + '" stroke-dasharray="4 3" opacity=".72"/>' +
    '<polyline points="' + line + '" fill="none" stroke="' + color + '" stroke-width="3"/>' +
    points.map(function (p, i) {
      var anchor = p[0] < 10 ? 'start' : p[0] > 240 ? 'end' : 'middle';
      return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" fill="' + color + '"/>' +
        '<text x="' + p[0] + '" y="' + Math.max(8, p[1] - 6 - (i % 2 ? 1 : 0)) + '" text-anchor="' + anchor + '" fill="#53657a" font-size="7.5" font-weight="700">' + merN(p[2]) + '</text>';
    }).join('') +
    entries.map(function (entry, i) {
      if (!entry.period) return '';
      var anchor = i === 0 ? 'start' : i === 7 ? 'end' : 'middle';
      return '<text x="' + (i * 250 / 7) + '" y="86" text-anchor="' + anchor + '" fill="#64748b" font-size="7" font-weight="700">' + merMonthShort(entry.period) + '</text>';
    }).join('') + '</svg>';
}
function merTrendCard(p, code, index) {
  var s = p.stats;
  var region = merRegionHgo(p);
  var rank = merRegionRank(p, code);
  var yoyColor = s.yoy != null && s.yoy < 0 ? '#dc2638' : '#20a65a';
  return '<div class="mer-trend">' +
    '<div class="mer-trend-h" style="color:' + p.color + '"><b>' + (index + 1) + '. ' + p.label + '</b><b>Güncel ' + merN(s.a) + '</b></div>' +
    '<div class="mer-chart">' + merSpark(s, p.color) + '</div>' +
    '<div class="mer-trend-side">' +
      '<span class="mer-target" style="color:' + p.color + '">Hedef ' + merN(s.h) + '</span>' +
      '<span class="mer-hgo" style="border-color:' + p.color + '">' +
        '<span><small>Bayi HGO</small><b style="color:' + p.color + '">' + merP(s.g) + '</b></span>' +
        '<span><small>Bölge HGO</small><b>' + merP(region) + '</b></span>' +
        '<span><small>Bölge Sıra</small><b>' + rank + '</b></span>' +
      '</span>' +
      '<span class="mer-yoy" style="color:' + yoyColor + '">Aylık YoY ' + (s.yoy == null ? 'veri yok' : merSignedP(s.yoy)) + '</span>' +
    '</div></div>';
}
function merTable(products) {
  var headers = ['Ürün', 'Ay Hdf.', 'Gerçek.', 'Ay HGO', 'Günlük', 'YTD G / H', 'YTD HGO', 'YTD Fark', 'Aylık YoY'];
  var html = headers.map(function (x) { return '<div class="mer-th">' + x + '</div>'; }).join('');
  products.forEach(function (p) {
    var s = p.stats;
    var values = [p.label, merN(s.h), merN(s.a), merP(s.g), s.daily.toFixed(1).replace('.', ','), merN(s.ytd) + ' / ' + merN(s.ytdTarget), merP(s.ytdHgo), merGap(s.ytdGap), s.yoy == null ? 'Veri yok' : merSignedP(s.yoy)];
    values.forEach(function (value, i) {
      var cls = 'mer-td';
      if (i === 0) cls += ' prod';
      if (i === 3 || i === 6) cls += ' perf';
      if (i === 7) cls += s.ytdGap < 0 ? ' gap-neg' : ' gap-pos';
      var style = (i === 0 || i === 3 || i === 6) ? 'color:' + p.color : '';
      html += '<div class="' + cls + '" style="' + style + '">' + value + '</div>';
    });
  });
  return html;
}
function merBars(products) {
  var max = Math.max.apply(null, products.reduce(function (all, p) { return all.concat([p.stats.ytd || 0, p.stats.ytdPrev || 0]); }, [1]));
  return products.map(function (p) {
    var s = p.stats;
    var current = s.ytd || 0;
    var previous = s.ytdPrev || 0;
    var previousHeight = Math.min(108, Math.max(0, previous / max * 108));
    var currentHeight = Math.min(108, Math.max(0, current / max * 108));
    var color = s.ytdYoY != null && s.ytdYoY < 0 ? '#dc2638' : '#20a65a';
    return '<div class="mer-bar-group"><div class="mer-bar-wrap"><span>' + merN(previous) + '</span><div class="mer-bar" style="height:' + previousHeight + 'px;background:#00a6d6"></div></div>' +
      '<div class="mer-bar-wrap"><span>' + merN(current) + '</span><div class="mer-bar" style="height:' + currentHeight + 'px;background:#e6007e"></div></div>' +
      '<span class="mer-bar-name">' + p.label + '</span><span class="mer-bar-yoy" style="color:' + color + '">' + (s.ytdYoY == null ? '—' : merSignedP(s.ytdYoY)) + '</span></div>';
  }).join('');
}
function merStaffRows(code) {
  var people = (typeof DETAY !== 'undefined' && DETAY.pers && DETAY.pers[code]) || [];
  return people.slice().sort(function (a, b) { return String(a.p || '').localeCompare(String(b.p || ''), 'tr'); });
}
function merStaffTone(value) {
  if (!value || !value.h) return 'staff-empty';
  var pct = Number(value.a || 0) / Number(value.h) * 100;
  return pct >= 100 ? 'staff-good' : pct >= 80 ? 'staff-watch' : 'staff-low';
}
function merStaffTable(code) {
  var rows = merStaffRows(code);
  var html = '<div class="mer-staff-head"><span>Personel</span>' + MER_STAFF_PRODUCTS.map(function (p) { return '<span>' + p.label + '</span>'; }).join('') + '</div>';
  if (!rows.length) return html + '<div class="mer-staff-empty">Personel kırılımı bulunamadı.</div>';
  rows.slice(0, 5).forEach(function (person) {
    html += '<div class="mer-staff-row"><b title="' + String(person.p || '').replace(/"/g, '&quot;') + '">' + (person.p || '—') + '</b>';
    MER_STAFF_PRODUCTS.forEach(function (product) {
      var value = person.prods && person.prods[product.key];
      html += '<span class="' + merStaffTone(value) + '">' + (value && value.h ? merN(value.h) + '/' + merN(value.a) : '—') + '</span>';
    });
    html += '</div>';
  });
  if (rows.length > 5) html += '<div class="mer-staff-note">İlk 5 personel gösteriliyor • Toplam ' + rows.length + ' personel</div>';
  else html += '<div class="mer-staff-note">Değerler hedef / gerçekleşen adedidir.</div>';
  return html;
}

function merCanvasReport() {
  var dealer = DETAY.bayiler[merDealerCode];
  var tableProducts = merProductData(dealer, MER_TABLE_PRODUCTS);
  var trendProducts = merProductData(dealer, MER_TREND_PRODUCTS);
  var ytdProducts = merProductData(dealer, MER_YTD_PRODUCTS);
  var ratio = dealer.prods.DSL && dealer.prods.DSL.a ? dealer.prods.IPTV.a / dealer.prods.DSL.a * 100 : null;
  var canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 2731;
  var c = canvas.getContext('2d');
  c.scale(8 / 3, 8 / 3);

  var navy = '#10243e', panel = '#ffffff', soft = '#f8fafc', border = '#d7e0ea', muted = '#64748b';
  var pink = '#e6007e', cyan = '#00a6d6', green = '#20a65a', red = '#dc2638', purple = '#7046b3', orange = '#f47b20';
  function rr(x, y, w, h, r, fill, stroke) { c.beginPath(); c.roundRect(x, y, w, h, r); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); } }
  function txt(t, x, y, size, color, weight, align) { c.font = (weight || '600') + ' ' + size + 'px Arial, sans-serif'; c.fillStyle = color || navy; c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.fillText(String(t), x, y); }
  function fitTxt(t, x, y, maxWidth, size, minSize, color, weight, align) { var s = size; while (s > minSize) { c.font = (weight || '600') + ' ' + s + 'px Arial, sans-serif'; if (c.measureText(String(t)).width <= maxWidth) break; s -= 1; } txt(t, x, y, s, color, weight, align); }
  function line(x1, y1, x2, y2, color, width, dash) { c.beginPath(); c.strokeStyle = color; c.lineWidth = width || 1; c.setLineDash(dash || []); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.setLineDash([]); }
  function ring(x, y, color, label) { c.beginPath(); c.arc(x, y, 36, 0, Math.PI * 2); c.strokeStyle = color; c.lineWidth = 2; c.stroke(); txt(label, x, y, 21, color, '800', 'center'); }
  function staffFill(value) { if (!value || !value.h) return { bg: '#eef2f6', fg: muted }; var pct = Number(value.a || 0) / Number(value.h) * 100; return pct >= 100 ? { bg: '#dff5e7', fg: '#16864a' } : pct >= 80 ? { bg: '#fff0cd', fg: '#a56c00' } : { bg: '#fde3e6', fg: red }; }

  c.fillStyle = '#f4f7fb'; c.fillRect(0, 0, 1536, 1024);
  txt('AY SONU BAYİ PERFORMANS KARNESİ', 31, 37, 38, navy, '900');
  txt(merPeriod() + ' • GERÇEK VERİ', 31, 80, 22, pink, '900');
  line(849, 20, 849, 84, pink, 2);
  fitTxt(dealer.b, 884, 41, 410, 29, 20, navy, '900');
  txt('Bayi Kodu: ' + dealer.kod, 884, 72, 14, muted, '700');
  rr(1352, 26, 166, 42, 8, null, navy); txt('YATIRIMCI RAPORU', 1435, 47, 14, navy, '700', 'center');

  var over = tableProducts.filter(function (p) { return p.label !== 'Toplam Mobil' && p.stats.g >= 100; });
  var ytdOver = tableProducts.filter(function (p) { return p.label !== 'Toplam Mobil' && p.stats.ytdHgo >= 100; });
  var best = tableProducts.filter(function (p) { return p.label !== 'Toplam Mobil'; }).sort(function (a, b) { return (b.stats.g || 0) - (a.stats.g || 0); })[0];
  var yoyBest = tableProducts.filter(function (p) { return p.label !== 'Toplam Mobil' && p.stats.yoy != null; }).sort(function (a, b) { return b.stats.yoy - a.stats.yoy; })[0];
  var signals = [
    ['YTD HEDEF ÜSTÜ', ytdOver.length + ' / 6 ÜRÜN', ytdOver.map(function (p) { return p.label; }).join(' • ') || 'Henüz yok', pink, '▦'],
    ['AY HEDEF ÜSTÜ', over.length + ' / 6 ÜRÜN', over.map(function (p) { return p.label; }).join(' • ') || 'Henüz yok', cyan, '◎'],
    ['EN GÜÇLÜ ÜRÜN', best.label + ' ' + merP(best.stats.g), 'Ay Performansı', purple, '★'],
    ['EN YÜKSEK AYLIK YOY', yoyBest ? yoyBest.label + ' ' + merSignedP(yoyBest.stats.yoy) : 'Veri yok', 'Geçen Yılın Aynı Ayına Göre', green, '↗'],
    ['IPTV • DSL', merP(ratio), 'Dönüşüm Oranı', orange, '◉']
  ];
  signals.forEach(function (signal, i) {
    var x = 15 + i * 302;
    rr(x, 106, 291, 123, 10, panel, border); ring(x + 56, 168, signal[3], signal[4]);
    txt(signal[0], x + 111, 137, 12, navy, '700');
    fitTxt(signal[1], x + 111, 174, 165, 27, 19, navy, '900');
    fitTxt(signal[2], x + 111, 207, 166, 11, 8, muted, '600');
  });

  rr(15, 243, 785, 493, 10, panel, border); txt('ÜRÜN BAZLI TRENDLER', 33, 266, 18, navy, '900');
  trendProducts.forEach(function (p, i) {
    var col = i % 2, row = Math.floor(i / 2), x = 27 + col * 386, y = 280 + row * 154, w = 372, h = 144, s = p.stats;
    var regionHgo = merRegionHgo(p), rank = merRegionRank(p, dealer.kod);
    rr(x, y, w, h, 10, soft, border);
    txt((i + 1) + '. ' + p.label, x + 14, y + 23, 14, p.color, '800');
    txt('Güncel ' + merN(s.a), x + w - 14, y + 23, 16, navy, '900', 'right');
    var sx = x + 14, sy = y + 53, sw = 232, sh = 43;
    var vals = s.series.map(function (v) { return v.a; }); if (!vals.length) vals = [s.a, s.a];
    var max = Math.max.apply(null, vals.concat([s.h || 0, 1])), min = Math.min.apply(null, vals.concat([s.h || 0])), span = max - min || 1;
    var targetY = sy + sh - (s.h - min) / span * sh; line(sx, targetY, sx + sw, targetY, p.color, 1, [4, 3]);
    c.beginPath(); vals.forEach(function (v, j) { var px = sx + (vals.length === 1 ? sw : sw * j / (vals.length - 1)), py = sy + sh - (v - min) / span * sh; if (j) c.lineTo(px, py); else c.moveTo(px, py); }); c.strokeStyle = p.color; c.lineWidth = 3; c.stroke();
    vals.forEach(function (v, j) { var px = sx + (vals.length === 1 ? sw : sw * j / (vals.length - 1)), py = sy + sh - (v - min) / span * sh; c.beginPath(); c.arc(px, py, 3.5, 0, Math.PI * 2); c.fillStyle = p.color; c.fill(); txt(merN(v), px, Math.max(sy - 2, py - 9), 8, muted, '700', j === 0 ? 'left' : j === vals.length - 1 ? 'right' : 'center'); });
    s.series.slice(-8).forEach(function (entry, j, arr) { var px = sx + (arr.length === 1 ? sw : sw * j / (arr.length - 1)); txt(merMonthShort(entry.period), px, y + 110, 7, muted, '700', j === 0 ? 'left' : j === arr.length - 1 ? 'right' : 'center'); });
    txt('Hedef ' + merN(s.h), x + w - 14, y + 46, 11, p.color, '700', 'right');
    rr(x + w - 111, y + 53, 97, 66, 8, '#ffffff', p.color);
    [['Bayi HGO', merP(s.g), p.color], ['Bölge HGO', merP(regionHgo), navy], ['Bölge Sıra', rank, navy]].forEach(function (rowData, r) { var yy = y + 64 + r * 20; if (r) line(x + w - 104, yy - 10, x + w - 21, yy - 10, border, 1); txt(rowData[0], x + w - 103, yy, 7.5, muted, '700'); txt(rowData[1], x + w - 21, yy, 9.5, rowData[2], '900', 'right'); });
    txt('Aylık YoY ' + (s.yoy == null ? 'veri yok' : merSignedP(s.yoy)), x + w - 14, y + 132, 9, s.yoy != null && s.yoy < 0 ? red : green, '800', 'right');
  });

  rr(812, 243, 709, 493, 10, panel, border); txt('ÜRÜN BAZLI PERFORMANS', 830, 266, 18, navy, '900');
  var tx = 820, ty = 282, tw = 693, rowHeight = 54, widths = [96, 61, 65, 66, 58, 115, 74, 78, 80];
  var heads = ['Ürün', 'Ay Hdf.', 'Gerçek.', 'Ay HGO', 'Günlük', 'YTD G / H', 'YTD HGO', 'YTD Fark', 'Aylık YoY'];
  var columnX = tx; heads.forEach(function (head, i) { fitTxt(head, columnX + widths[i] / 2, ty + 20, widths[i] - 5, 11, 9.5, muted, '800', 'center'); columnX += widths[i]; });
  tableProducts.forEach(function (p, row) {
    var yy = ty + 40 + row * rowHeight, cx = tx, s = p.stats;
    rr(tx, yy, tw, rowHeight, 0, soft, border);
    var values = [p.label, merN(s.h), merN(s.a), merP(s.g), s.daily.toFixed(1).replace('.', ','), merN(s.ytd) + ' / ' + merN(s.ytdTarget), merP(s.ytdHgo), merGap(s.ytdGap), s.yoy == null ? 'Veri yok' : merSignedP(s.yoy)];
    values.forEach(function (value, i) { if (i) line(cx, yy, cx, yy + rowHeight, border, 1); var color = i === 0 || i === 3 || i === 6 ? p.color : i === 7 ? (s.ytdGap < 0 ? red : green) : navy; fitTxt(value, cx + widths[i] / 2, yy + rowHeight / 2, widths[i] - 7, i === 0 ? 13.5 : i === 3 || i === 6 ? 13 : 12.5, 9.5, color, i === 0 || i === 3 || i === 6 || i === 7 ? '800' : '700', 'center'); cx += widths[i]; });
  });
  txt('YTD HGO = YTD gerçekleşen / YTD hedef', 1511, 719, 9.5, muted, '700', 'right');

  var reportYear = merReportYear();
  rr(15, 746, 662, 244, 10, panel, border); txt((reportYear - 1) + '–' + reportYear + ' YTD AKTİVASYON KIYASI', 33, 770, 19, navy, '900');
  txt('Sütunlar YTD adedi • Alt oran güncel YTD’nin önceki yıl YTD’ye göre değişimidir.', 33, 794, 10.5, muted, '650');
  txt('■', 400, 770, 14, cyan, '700'); txt(String(reportYear - 1), 416, 770, 12, muted, '700'); txt('■', 472, 770, 14, pink, '700'); txt(String(reportYear), 488, 770, 12, muted, '700');
  var ytdMax = Math.max.apply(null, ytdProducts.reduce(function (all, p) { return all.concat([p.stats.ytd || 0, p.stats.ytdPrev || 0]); }, [1]));
  ytdProducts.forEach(function (p, i) { var x = 54 + i * 101, baseY = 925, current = p.stats.ytd || 0, previous = p.stats.ytdPrev || 0; var prevHeight = Math.min(106, Math.max(2, previous / ytdMax * 106)), currentHeight = Math.min(106, Math.max(2, current / ytdMax * 106)); c.fillStyle = cyan; c.fillRect(x, baseY - prevHeight, 27, prevHeight); c.fillStyle = pink; c.fillRect(x + 33, baseY - currentHeight, 27, currentHeight); fitTxt(merN(previous), x + 13.5, baseY - prevHeight - 10, 45, 11.5, 9.5, muted, '800', 'center'); fitTxt(merN(current), x + 46.5, baseY - currentHeight - 10, 45, 11.5, 9.5, muted, '800', 'center'); fitTxt(p.label, x + 30, 946, 86, 12, 10, navy, '700', 'center'); txt(p.stats.ytdYoY == null ? '—' : merSignedP(p.stats.ytdYoY), x + 30, 971, 11.5, p.stats.ytdYoY != null && p.stats.ytdYoY < 0 ? red : green, '900', 'center'); });

  rr(689, 746, 325, 244, 10, panel, border); txt('IPTV / DSL ORANI', 710, 773, 18, navy, '900');
  var rx = 793, ry = 865, radius = 65; c.beginPath(); c.arc(rx, ry, radius, 0, Math.PI * 2); c.strokeStyle = '#dce5ee'; c.lineWidth = 22; c.stroke(); c.beginPath(); c.arc(rx, ry, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, (ratio || 0) / 100)); c.strokeStyle = purple; c.lineWidth = 22; c.stroke(); txt(merP(ratio), rx, ry, 29, navy, '900', 'center');
  txt('●  Bayi ' + merP(ratio), 886, 832, 16, purple, '800'); txt('●  Bölge ' + (MATRIX && MATRIX.kuzey ? merP(MATRIX.kuzey.ipdsl) : '—'), 886, 871, 16, green, '800'); txt('●  Anadolu ' + (MATRIX && MATRIX.anadolu ? merP(MATRIX.anadolu.ipdsl) : '—'), 886, 910, 16, cyan, '800'); txt('Her 100 DSL satışındaki IPTV eşleşmesini gösterir.', 708, 971, 10, muted, '600');

  rr(1027, 746, 494, 244, 10, panel, border); txt('PERSONEL AY SONU PERFORMANSI', 1055, 773, 18, navy, '900'); line(1055, 792, 1494, 792, pink, 2);
  var people = merStaffRows(dealer.kod), visiblePeople = people.slice(0, 5), staffX = 1045, staffWidths = [109, 59, 57, 57, 55, 57, 65];
  var staffHeads = ['Personel', 'Mobil', 'DSL', 'IPTV', 'Uydu', 'Cihaz', 'Diğer'], scx = staffX;
  staffHeads.forEach(function (head, i) { txt(head, scx + staffWidths[i] / 2, 810, 9, muted, '700', 'center'); scx += staffWidths[i]; });
  if (!visiblePeople.length) txt('Personel kırılımı bulunamadı.', 1270, 881, 13, muted, '600', 'center');
  visiblePeople.forEach(function (person, row) { var yy = 828 + row * 27, cx = staffX; if (row % 2 === 0) rr(staffX, yy - 12, 459, 25, 4, soft, null); fitTxt(person.p || '—', cx + staffWidths[0] / 2, yy, staffWidths[0] - 8, 10, 7, navy, '800', 'center'); cx += staffWidths[0]; MER_STAFF_PRODUCTS.forEach(function (product, i) { var value = person.prods && person.prods[product.key], tone = staffFill(value), display = value && value.h ? merN(value.h) + '/' + merN(value.a) : '—'; rr(cx + 3, yy - 10, staffWidths[i + 1] - 6, 20, 5, tone.bg, null); fitTxt(display, cx + staffWidths[i + 1] / 2, yy, staffWidths[i + 1] - 10, 9.5, 7, tone.fg, '800', 'center'); cx += staffWidths[i + 1]; }); });
  txt(people.length > 5 ? 'İlk 5 personel • Toplam ' + people.length : 'Değerler hedef / gerçekleşen adedidir.', 1055, 974, 8.5, muted, '600');
  return canvas;
}

async function exportMonthEndPNG() {
  if (!document.getElementById('month-end-report')) return;
  try {
    var canvas = merCanvasReport();
    _openSharePreview(canvas.toDataURL('image/png'), 'TT_AySonu_' + merDealerCode + '_' + String(merPeriod()).replace(/[^0-9A-Za-zÇĞİÖŞÜçğıöşü]/g, '') + '.png');
  } catch (error) {
    alert('Görsel oluşturma hatası: ' + error.message);
  }
}

/* 4096x2731 JPEG'i tek sayfalık A3 yatay PDF içine kayıpsız ölçekte
 * yerleştirir. A3 baskıda yaklaşık 248 DPI, A4 baskıda yaklaşık 350 DPI
 * netlik sağlar. Harici PDF kütüphanesi gerektirmez. */
function merCanvasToPdfBytes(canvas) {
  var jpegUrl = canvas.toDataURL('image/jpeg', 0.98);
  var binary = atob(jpegUrl.split(',')[1]);
  var imageBytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) imageBytes[i] = binary.charCodeAt(i);

  var encoder = new TextEncoder();
  var chunks = [];
  var offsets = [0];
  var totalLength = 0;
  function push(value) {
    var bytes = typeof value === 'string' ? encoder.encode(value) : value;
    chunks.push(bytes); totalLength += bytes.length;
  }
  function object(number, parts) {
    offsets[number] = totalLength;
    push(number + ' 0 obj\n');
    parts.forEach(push);
    push('\nendobj\n');
  }

  /* ISO A3 yatay: 420 x 297 mm. Görsel 3:2 oranında ortalanır. */
  var pageWidth = 1190.55;
  var pageHeight = 841.89;
  var drawWidth = pageWidth;
  var drawHeight = drawWidth * canvas.height / canvas.width;
  var drawY = (pageHeight - drawHeight) / 2;
  var content = 'q\n' + drawWidth.toFixed(2) + ' 0 0 ' + drawHeight.toFixed(2) + ' 0 ' + drawY.toFixed(2) + ' cm\n/Im0 Do\nQ\n';

  push(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 226, 227, 207, 211, 10]));
  object(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
  object(2, ['<< /Type /Pages /Kids [3 0 R] /Count 1 >>']);
  object(3, ['<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageWidth + ' ' + pageHeight + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>']);
  object(4, ['<< /Type /XObject /Subtype /Image /Width ' + canvas.width + ' /Height ' + canvas.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + imageBytes.length + ' >>\nstream\n', imageBytes, '\nendstream']);
  object(5, ['<< /Length ' + encoder.encode(content).length + ' >>\nstream\n' + content + 'endstream']);

  var xrefOffset = totalLength;
  push('xref\n0 6\n0000000000 65535 f \n');
  for (var n = 1; n <= 5; n++) push(String(offsets[n]).padStart(10, '0') + ' 00000 n \n');
  push('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF');

  var pdf = new Uint8Array(totalLength);
  var cursor = 0;
  chunks.forEach(function (chunk) { pdf.set(chunk, cursor); cursor += chunk.length; });
  return pdf;
}

async function exportMonthEndPDF() {
  var button = document.querySelector('.mer-pdf-button');
  var original = button ? button.textContent : '';
  if (button) { button.disabled = true; button.textContent = 'PDF Hazırlanıyor…'; }
  try {
    var canvas = merCanvasReport();
    var bytes = merCanvasToPdfBytes(canvas);
    var blob = new Blob([bytes], { type: 'application/pdf' });
    var fileName = 'TT_AySonu_' + merDealerCode + '_' + String(merPeriod()).replace(/[^0-9A-Za-zÇĞİÖŞÜçğıöşü]/g, '') + '_A3.pdf';
    var file = typeof File !== 'undefined' ? new File([blob], fileName, { type: 'application/pdf' }) : null;

    if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Ay Sonu Bayi Performans Karnesi' });
    } else {
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url; link.download = fileName; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
    }
  } catch (error) {
    if (error && error.name !== 'AbortError') alert('PDF oluşturma hatası: ' + error.message);
  } finally {
    if (button) { button.disabled = false; button.textContent = original; }
  }
}

function renderMonthEndReport() {
  var cards = document.getElementById('cards');
  cards.className = 'cards single'; cards.style.maxWidth = 'none';
  var codes = merCodes();
  if (!codes.length) { cards.innerHTML = '<div class="mer-empty">Bayi verisi bulunamadı. Güncel Excel raporunu yükleyin.</div>'; return; }
  if (!merDealerCode || !DETAY.bayiler[merDealerCode]) merDealerCode = codes[0];
  var dealer = DETAY.bayiler[merDealerCode];
  var tableProducts = merProductData(dealer, MER_TABLE_PRODUCTS);
  var trendProducts = merProductData(dealer, MER_TREND_PRODUCTS);
  var ytdProducts = merProductData(dealer, MER_YTD_PRODUCTS);
  var baseProducts = tableProducts.filter(function (p) { return p.label !== 'Toplam Mobil'; });
  var over = baseProducts.filter(function (p) { return p.stats.g >= 100; });
  var ytdOver = baseProducts.filter(function (p) { return p.stats.ytdHgo >= 100; });
  var best = baseProducts.slice().sort(function (a, b) { return (b.stats.g || 0) - (a.stats.g || 0); })[0];
  var yoyBest = baseProducts.filter(function (p) { return p.stats.yoy != null; }).sort(function (a, b) { return b.stats.yoy - a.stats.yoy; })[0];
  var ratio = dealer.prods.DSL && dealer.prods.DSL.a ? dealer.prods.IPTV.a / dealer.prods.DSL.a * 100 : null;
  var reportYear = merReportYear();
  var options = codes.map(function (code) { var x = DETAY.bayiler[code]; return '<option value="' + code + '" ' + (code === merDealerCode ? 'selected' : '') + '>' + x.b + ' · ' + x.il + ' · ' + code + '</option>'; }).join('');
  var signals = [
    ['YTD HEDEF ÜSTÜ', ytdOver.length + ' / 6 ÜRÜN', ytdOver.map(function (p) { return p.label; }).join(' • ') || 'Henüz yok', '#e6007e', '▦'],
    ['AY HEDEF ÜSTÜ', over.length + ' / 6 ÜRÜN', over.map(function (p) { return p.label; }).join(' • ') || 'Henüz yok', '#00a6d6', '◎'],
    ['EN GÜÇLÜ ÜRÜN', best.label + ' ' + merP(best.stats.g), 'Ay performansı', '#7046b3', '★'],
    ['EN YÜKSEK AYLIK YOY', yoyBest ? yoyBest.label + ' ' + merSignedP(yoyBest.stats.yoy) : 'Veri bekleniyor', 'Geçen yılın aynı ayına göre', '#20a65a', '↗'],
    ['IPTV • DSL', merP(ratio), 'Dönüşüm oranı', '#f47b20', '◉']
  ];
  cards.innerHTML = '<div class="mer-toolbar"><span class="mer-print-note">Ürün adetleri birbirine eklenmez.</span><select onchange="merDealerCode=this.value;renderMonthEndReport()">' + options + '</select><button class="mer-pdf-button" onclick="exportMonthEndPDF()">Yüksek Kalite PDF</button><button onclick="downloadCardPNG()">Yüksek Kalite PNG Paylaş</button></div>' +
    '<div class="mer-scroll"><section class="mer-report" id="month-end-report">' +
      '<header class="mer-head"><div><h1>AY SONU BAYİ PERFORMANS KARNESİ</h1><p>' + merPeriod() + ' • GERÇEK VERİ</p></div><i class="mer-divider"></i><div class="mer-dealer"><strong>' + dealer.b + '</strong><span>Bayi Kodu: ' + dealer.kod + '</span></div><div class="mer-draft">YATIRIMCI RAPORU</div></header>' +
      '<div class="mer-signals">' + signals.map(function (x) { return '<div class="mer-signal"><i class="mer-signal-icon" style="color:' + x[3] + '">' + x[4] + '</i><div><small>' + x[0] + '</small><strong>' + x[1] + '</strong><span>' + x[2] + '</span></div></div>'; }).join('') + '</div>' +
      '<div class="mer-main"><div class="mer-panel"><h2 class="mer-title">ÜRÜN BAZLI TRENDLER</h2><div class="mer-trends">' + trendProducts.map(function (p, i) { return merTrendCard(p, dealer.kod, i); }).join('') + '</div></div>' +
      '<div class="mer-panel"><h2 class="mer-title">ÜRÜN BAZLI PERFORMANS</h2><div class="mer-table">' + merTable(tableProducts) + '</div><span class="mer-table-note">YTD HGO = gerçekleşen / hedef</span></div></div>' +
      '<div class="mer-bottom"><div class="mer-panel"><h2 class="mer-title">' + (reportYear - 1) + '–' + reportYear + ' YTD AKTİVASYON KIYASI <span class="mer-legend"><b style="color:#00a6d6">■</b> ' + (reportYear - 1) + ' &nbsp; <b style="color:#e6007e">■</b> ' + reportYear + '</span><small class="mer-title-note">Sütunlar YTD adedi, alt oran güncel YTD’nin önceki yıl YTD’ye göre değişimidir.</small></h2><div class="mer-bars">' + merBars(ytdProducts) + '</div></div>' +
      '<div class="mer-panel"><h2 class="mer-title">IPTV / DSL ORANI</h2><div class="mer-ratio"><div class="mer-big-ring"><b>' + merP(ratio) + '</b></div><div class="mer-ratio-list"><div style="color:#a65ae8">Bayi ' + merP(ratio) + '</div><div style="color:#53d769">Bölge ' + (MATRIX && MATRIX.kuzey ? merP(MATRIX.kuzey.ipdsl) : '—') + '</div><div style="color:#16c7ee">Anadolu ' + (MATRIX && MATRIX.anadolu ? merP(MATRIX.anadolu.ipdsl) : '—') + '</div></div></div><div class="mer-ratio-note">Her 100 DSL satışının kaçının IPTV ile eşleştiğini gösterir.</div></div>' +
      '<div class="mer-panel"><h2 class="mer-title">PERSONEL AY SONU PERFORMANSI</h2><div class="mer-staff-table">' + merStaffTable(dealer.kod) + '</div></div></div>' +
    '</section></div>';
  if (typeof loadAllHistory === 'function' && !HIST2_LOADED && !HIST2_LOADING) loadAllHistory().then(renderMonthEndReport);
}
