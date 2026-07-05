/* ════════════════════════════════════════════════════════════════════
   js/history.js  —  Sprint 18 (Geçmiş): Geçmiş Performans Ekranı
   Bayi bazlı YTD · YoY · Aylık Trend.
   Veri katmanı: js/history-loader.js (manifest + aylık JSON dosyaları).
   Eski XLSX-kıyas ekranı bu sürümle emekliye ayrıldı (2026-07-05).
   Kullanılan mevcut altyapı: hgo3() (render.js), sparkline() (render.js),
   ensureH2C()/_openSharePreview() (parser/filters), bottom-sheet (filters.js).
   ════════════════════════════════════════════════════════════════════ */

/* ─── EKRAN STATE ─────────────────────────────────────────────────── */
var _h2Bayi  = null;      /* seçili bayi kodu                       */
var _h2Year  = null;      /* seçili yıl (manifest'ten en yenisi)    */
var _h2Prod  = 'all';     /* 'all' | 'mobil' | 'dsl' | 'tv' | 'cihaz' */
var _h2Kanal = 'Tümü';    /* 'Tümü' | 'TTM' | 'EDM'                 */
var _h2Sy    = 'Tümü';

var _H2_AYLAR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

/* ─── KANAL FİLTRELİ DÖNEM HARİTASI ──────────────────────────────── */
function _h2Map() {
  if (_h2Kanal === 'Tümü') return HIST2_DATA;
  var out = {};
  for (var p in HIST2_DATA) {
    var doc = HIST2_DATA[p];
    out[p] = (doc && doc.channel === _h2Kanal) ? doc : null;
  }
  return out;
}

/* Yüklü dönemler (kanal filtreli, dosyası var olanlar) */
function _h2Periods() {
  var map = _h2Map();
  return Object.keys(map).sort().filter(function(p) { return !!map[p]; });
}

function _h2Years() {
  var ys = {};
  ((HIST2_MANIFEST && HIST2_MANIFEST.periods) || []).forEach(function(p) { ys[p.slice(0, 4)] = 1; });
  return Object.keys(ys).sort();
}

/* Bayi listesi: kanal filtreli dönemlerin birleşimi, SY filtresi uygulanır.
   En güncel dönemdeki bilgi esas alınır. */
function _h2Dealers() {
  var map = _h2Map(), seen = {};
  Object.keys(map).sort().forEach(function(p) {
    var doc = map[p];
    if (!doc) return;
    doc.dealers.forEach(function(d) { seen[String(d.bayiKodu)] = d; });
  });
  var list = Object.keys(seen).map(function(k) { return seen[k]; });
  if (_h2Sy !== 'Tümü') list = list.filter(function(d) { return d.sy === _h2Sy; });
  list.sort(function(a, b) { return (a.bayiAdi || '').localeCompare(b.bayiAdi || '', 'tr'); });
  return list;
}

function _h2SyList() {
  var map = _h2Map(), s = {};
  for (var p in map) {
    if (!map[p]) continue;
    map[p].dealers.forEach(function(d) { if (d.sy) s[d.sy] = 1; });
  }
  return ['Tümü'].concat(Object.keys(s).sort(function(a, b) { return a.localeCompare(b, 'tr'); }));
}

function _h2ProdLabel() {
  if (_h2Prod === 'all') return 'Tüm Ürünler';
  var pm = HIST2_PRODS.find(function(x) { return x.key === _h2Prod; });
  return pm ? pm.label : _h2Prod;
}

/* Seçili yıl için verisi olan son dönem (YoY ve "Bu Ay" bunu kullanır) */
function _h2LastPeriodOfYear() {
  var ps = _h2Periods().filter(function(p) { return p.slice(0, 4) === String(_h2Year); });
  return ps.length ? ps[ps.length - 1] : null;
}

/* ─── SAYFA INIT (app.js navTo'dan çağrılır) ─────────────────────── */
async function initHistoryPage() {
  var loadEl = document.getElementById('gecm-loading');
  var contEl = document.getElementById('gecm-content');
  var emptEl = document.getElementById('gecm-empty');
  if (!HIST2_LOADED) {
    if (loadEl) loadEl.style.display = '';
    if (contEl) contEl.style.display = 'none';
    if (emptEl) emptEl.style.display = 'none';
    try { await loadAllHistory(); } catch (e) {}
    if (loadEl) loadEl.style.display = 'none';
  }
  /* Varsayılanlar */
  var years = _h2Years();
  if (!_h2Year) _h2Year = years.length ? years[years.length - 1] : String(new Date().getFullYear());
  if (!_h2Bayi) {
    var ds = _h2Dealers();
    if (ds.length) _h2Bayi = String(ds[0].bayiKodu);
  }
  renderGecmisPage();
}

/* app.js açılışta loadHistManifest() çağırır — arka planda tüm geçmişi ısıt */
function loadHistManifest() { return loadAllHistory(); }

/* ─── FİLTRE ÇUBUĞU ──────────────────────────────────────────────── */
function _h2FilterBar() {
  var bar = document.getElementById('gecm-filter-bar');
  if (!bar) return;
  var ds = _h2Dealers();
  var cur = ds.find(function(d) { return String(d.bayiKodu) === String(_h2Bayi); });
  function chip(type, lbl, val) {
    return '<button class="fbar-chip" onclick="openSheet(\'' + type + '\')">' +
      '<span class="fbar-chip-lbl">' + lbl + '</span>' +
      '<span class="fbar-chip-val">' + val + '</span></button>';
  }
  function tr9(s) { return s && s.length > 11 ? s.slice(0, 11) + '…' : (s || 'Seç'); }
  bar.innerHTML =
    chip('h2-bayi',  'Bayi',  tr9(cur ? cur.bayiAdi : null)) +
    chip('h2-yil',   'Yıl',   _h2Year || 'Seç') +
    chip('h2-prod',  'Ürün',  tr9(_h2ProdLabel())) +
    chip('h2-kanal', 'Kanal', _h2Kanal) +
    chip('h2-sy',    'SY',    _h2Sy === 'Tümü' ? 'Tümü' : tr9(_h2Sy.split(' ')[0])) +
    '<button class="fbar-chip fbar-dl" onclick="downloadGecmisPNG()">' +
      '<span class="fbar-chip-lbl">Görsel</span>' +
      '<span class="fbar-chip-val">Oluştur ↗</span></button>';
}

/* Filtre setter'ları (filters.js _pick çağırır) */
function h2SetBayi(k)  { _h2Bayi  = String(k); renderGecmisPage(); }
function h2SetYear(y)  { _h2Year  = String(y); renderGecmisPage(); }
function h2SetProd(p)  { _h2Prod  = p;         renderGecmisPage(); }
function h2SetKanal(k) { _h2Kanal = k; _h2Bayi = null; var d = _h2Dealers(); if (d.length) _h2Bayi = String(d[0].bayiKodu); renderGecmisPage(); }
function h2SetSy(s)    { _h2Sy    = s; var d = _h2Dealers(); if (!d.some(function(x){ return String(x.bayiKodu) === String(_h2Bayi); })) _h2Bayi = d.length ? String(d[0].bayiKodu) : null; renderGecmisPage(); }

/* ─── ANA RENDER ─────────────────────────────────────────────────── */
function renderGecmisPage() {
  _h2FilterBar();
  var contEl = document.getElementById('gecm-content');
  var emptEl = document.getElementById('gecm-empty');
  if (!contEl) return;

  var periods = _h2Periods();
  if (!periods.length) {
    contEl.style.display = 'none';
    if (emptEl) {
      emptEl.style.display = '';
      emptEl.innerHTML = '<div class="gecm-welcome"><div class="gecm-wl-icon">📊</div>' +
        '<div class="gecm-wl-title">Geçmiş Performans</div>' +
        '<div class="gecm-wl-sub">' + (_h2Kanal !== 'Tümü'
          ? _h2Kanal + ' kanalı için geçmiş veri bulunamadı.'
          : 'Bu dönem için geçmiş veri bulunamadı.') + '</div>' +
        '<div class="gecm-wl-hint">Aylık dosyaları <code>data/history/</code> klasörüne ekleyin ve <code>manifest.json</code> → <code>periods</code> listesini güncelleyin.</div></div>';
    }
    return;
  }
  if (emptEl) emptEl.style.display = 'none';
  contEl.style.display = '';

  if (!_h2Bayi) {
    contEl.innerHTML = '<div class="gecm-empty-msg">Seçilen filtrelerle bayi bulunamadı.</div>';
    return;
  }

  var map  = _h2Map();
  var hist = histCalcDealerHistory(map, _h2Bayi);
  if (!hist.length) {
    contEl.innerHTML = '<div class="gecm-empty-msg">Bu bayi için geçmiş veri bulunamadı.</div>';
    return;
  }

  var lastPer = _h2LastPeriodOfYear();
  var ytd     = histCalcYTD(map, _h2Bayi, _h2Year);
  var yoy     = lastPer ? histCalcYoY(map, _h2Bayi, lastPer) : null;
  var info    = hist[hist.length - 1].dealer;
  var isDemo  = periods.some(function(p) { return map[p] && map[p].demo; });

  contEl.innerHTML =
    '<div id="gecm-card" class="h2-wrap">' +
      (isDemo ? '<div class="h2-demo-note">Örnek geçmiş verisi görüntüleniyor — gerçek dosyaları <code>data/history/</code> klasörüne ekleyin.</div>' : '') +
      _h2DealerCard(info, ytd) +
      _h2CompareCards(hist, ytd, yoy, lastPer) +
      _h2TrendSection(hist) +
      _h2YoYSection(yoy) +
      _h2CommentSection(hist, ytd, yoy) +
    '</div>';
}

/* ─── 1. BAYİ ÖZET + YTD KARTI ───────────────────────────────────── */
function _h2DealerCard(info, ytd) {
  var head =
    '<div class="h2-dealer-head">' +
      '<div>' +
        '<div class="h2-dealer-name">' + (info.bayiAdi || _h2Bayi) + '</div>' +
        '<div class="h2-dealer-meta">' + info.bayiKodu +
          (info.il ? ' · ' + info.il : '') +
          (info.sy ? ' · SY: ' + info.sy : '') + '</div>' +
      '</div>' +
      '<div class="h2-dealer-year">' + _h2Year + '</div>' +
    '</div>';

  var body;
  if (!ytd) {
    body = '<div class="gecm-empty-msg">' + _h2Year + ' için geçmiş veri bulunamadı.</div>';
  } else {
    var cells = HIST2_PRODS.map(function(pm) {
      var d = ytd.prods[pm.key];
      var cls = d && d.hgo !== null ? hgo3(d.hgo) : '';
      return '<div class="h2-ytd-cell">' +
        '<div class="h2-ytd-lbl">' + pm.label + '</div>' +
        '<div class="h2-ytd-val ' + (cls ? 'hd-' + cls : '') + '">' +
          (d && d.hgo !== null ? '%' + d.hgo.toFixed(1) : '—') + '</div>' +
        '<div class="h2-ytd-sub">' + (d ? d.adet.toLocaleString('tr-TR') + '/' + d.hedef.toLocaleString('tr-TR') : '—') + '</div>' +
      '</div>';
    }).join('');
    var lastFc = ytd.prods.mobil ? ytd.prods.mobil.lastFc : null;
    body =
      '<div class="h2-ytd-title">' + _h2Year + ' YTD · ' + ytd.months.length + ' ay (' + ytd.months[0] + ' → ' + ytd.months[ytd.months.length - 1] + ')</div>' +
      '<div class="h2-ytd-grid">' + cells + '</div>' +
      '<div class="h2-ytd-tot">' +
        '<span>Toplam Hedef <strong>' + ytd.toplamHedef.toLocaleString('tr-TR') + '</strong></span>' +
        '<span>Gerçekleşen <strong>' + ytd.toplamAdet.toLocaleString('tr-TR') + '</strong></span>' +
        '<span>YTD HGO <strong class="' + (ytd.toplamHgo !== null ? 'hd-' + hgo3(ytd.toplamHgo) : '') + '">' +
          (ytd.toplamHgo !== null ? '%' + ytd.toplamHgo.toFixed(1) : '—') + '</strong></span>' +
        (lastFc !== null ? '<span>Son Dönem Mobil Fc <strong>%' + lastFc + '</strong></span>' : '') +
      '</div>';
  }

  return '<div class="h2-card">' + head + body + '</div>';
}

/* ─── Seçili ürün için dönem toplamı (all = 4 ürün toplamı) ─────── */
function _h2Agg(dealer) {
  if (!dealer) return null;
  if (_h2Prod !== 'all') {
    var d = dealer[_h2Prod];
    return d ? { hedef: d.hedef, adet: d.adet, hgo: d.hgo, fc: d.forecast } : null;
  }
  var h = 0, a = 0;
  HIST2_PRODS.forEach(function(pm) {
    var d = dealer[pm.key];
    if (d) { h += d.hedef || 0; a += d.adet || 0; }
  });
  return h > 0 ? { hedef: h, adet: a, hgo: Math.round(a / h * 1000) / 10, fc: null } : null;
}

/* ─── 2. KARŞILAŞTIRMA KARTLARI: Bu Ay · YTD · YoY · Son 3 Ay ────── */
function _h2CompareCards(hist, ytd, yoy, lastPer) {
  var yearHist = hist.filter(function(x) { return x.period.slice(0, 4) === String(_h2Year); });
  var pl = _h2ProdLabel();

  function card(lbl, val, cls, sub) {
    return '<div class="h2-cmp-card">' +
      '<div class="h2-cmp-lbl">' + lbl + '</div>' +
      '<div class="h2-cmp-val ' + (cls || '') + '">' + val + '</div>' +
      '<div class="h2-cmp-sub">' + sub + '</div></div>';
  }

  /* Bu Ay */
  var c1;
  var last = yearHist.length ? yearHist[yearHist.length - 1] : null;
  var lagg = last ? _h2Agg(last.dealer) : null;
  if (lagg && lagg.hgo !== null) {
    c1 = card('BU DÖNEM', '%' + lagg.hgo.toFixed(1), 'hd-' + hgo3(lagg.hgo),
      last.period + ' · ' + lagg.adet.toLocaleString('tr-TR') + '/' + lagg.hedef.toLocaleString('tr-TR'));
  } else c1 = card('BU DÖNEM', '—', '', 'veri yok');

  /* YTD (seçili ürün) */
  var c2;
  if (ytd) {
    var yagg;
    if (_h2Prod === 'all') yagg = { hgo: ytd.toplamHgo, adet: ytd.toplamAdet, hedef: ytd.toplamHedef };
    else { var pd = ytd.prods[_h2Prod]; yagg = pd ? { hgo: pd.hgo, adet: pd.adet, hedef: pd.hedef } : null; }
    c2 = (yagg && yagg.hgo !== null)
      ? card('YTD', '%' + yagg.hgo.toFixed(1), 'hd-' + hgo3(yagg.hgo),
          ytd.months.length + ' ay · ' + yagg.adet.toLocaleString('tr-TR') + '/' + yagg.hedef.toLocaleString('tr-TR'))
      : card('YTD', '—', '', 'veri yok');
  } else c2 = card('YTD', '—', '', _h2Year + ' verisi yok');

  /* YoY (seçili ürün; all → mobil temel gösterge) */
  var c3;
  var yKey = _h2Prod === 'all' ? 'mobil' : _h2Prod;
  var yp = yoy && yoy.prods[yKey];
  if (yp && yp.dHgo !== null) {
    var up = yp.dHgo >= 0;
    c3 = card('YoY' + (_h2Prod === 'all' ? ' · Mobil' : ''),
      (up ? '▲ +' : '▼ −') + Math.abs(yp.dHgo).toFixed(1) + ' pn',
      up ? 'hd-g' : 'hd-r',
      yoy.prevPeriod + ' %' + yp.prev.hgo.toFixed(0) + ' → ' + yoy.period + ' %' + yp.curr.hgo.toFixed(0));
  } else {
    c3 = card('YoY', '—', '', yoy && yoy.prevMissing ? 'önceki yıl verisi yok' : 'veri yok');
  }

  /* Son 3 Ay Trend: son 3 ay HGO ort. − önceki 3 ay HGO ort. */
  var c4;
  var series = yearHist.map(function(x) { var g = _h2Agg(x.dealer); return g ? g.hgo : null; })
                       .filter(function(v) { return v !== null; });
  if (series.length >= 4) {
    var last3 = series.slice(-3), prev3 = series.slice(-6, -3);
    var avg = function(arr) { return arr.reduce(function(s, v) { return s + v; }, 0) / arr.length; };
    var d34 = Math.round((avg(last3) - avg(prev3)) * 10) / 10;
    c4 = card('SON 3 AY', (d34 >= 0 ? '▲ +' : '▼ −') + Math.abs(d34).toFixed(1) + ' pn',
      d34 >= 0 ? 'hd-g' : 'hd-r', 'önceki 3 aya göre ort. HGO');
  } else if (series.length >= 2) {
    var dd = Math.round((series[series.length - 1] - series[series.length - 2]) * 10) / 10;
    c4 = card('SON DEĞİŞİM', (dd >= 0 ? '▲ +' : '▼ −') + Math.abs(dd).toFixed(1) + ' pn',
      dd >= 0 ? 'hd-g' : 'hd-r', 'bir önceki aya göre');
  } else c4 = card('SON 3 AY', '—', '', 'yeterli ay yok');

  return '<div class="h2-sec-title">' + pl + ' · Özet Karşılaştırma</div>' +
    '<div class="h2-cmp-grid">' + c1 + c2 + c3 + c4 + '</div>';
}

/* ─── 3. AYLIK TREND ─────────────────────────────────────────────── */
function _h2TrendSection(hist) {
  var yearHist = hist.filter(function(x) { return x.period.slice(0, 4) === String(_h2Year); });
  if (!yearHist.length) {
    return '<div class="h2-sec-title">Aylık Trend · ' + _h2Year + '</div>' +
      '<div class="gecm-empty-msg">Bu dönem için geçmiş veri bulunamadı.</div>';
  }

  /* Tüm Ürünler: ürün başına sparkline satırı */
  if (_h2Prod === 'all') {
    var rows = HIST2_PRODS.map(function(pm) {
      var pts = [];
      yearHist.forEach(function(x) {
        var d = x.dealer[pm.key];
        if (d && d.hgo !== null) pts.push({ d: x.period, v: d.hgo });
      });
      if (!pts.length) return '';
      var lastV = pts[pts.length - 1].v;
      var color = lastV >= 100 ? '#0E7A40' : lastV >= 70 ? '#B26B00' : '#C11421';
      return '<div class="h2-tr-row">' +
        '<div class="h2-tr-prod">' + pm.label + '</div>' +
        '<div class="h2-tr-spark">' + sparkline(pts, 120, 30, color) + '</div>' +
        '<div class="h2-tr-last hd-' + hgo3(lastV) + '">%' + lastV.toFixed(1) + '</div>' +
      '</div>';
    }).join('');
    return '<div class="h2-sec-title">Aylık HGO Trendi · ' + _h2Year + ' · 4 Ürün</div>' +
      '<div class="h2-card">' + rows + '</div>';
  }

  /* Tek ürün: aylık bar (adet) + HGO + Fc kolonları */
  var maxAdet = 1;
  yearHist.forEach(function(x) {
    var d = x.dealer[_h2Prod];
    if (d && d.adet > maxAdet) maxAdet = d.adet;
  });
  var cols = yearHist.map(function(x) {
    var d = x.dealer[_h2Prod];
    var m = parseInt(x.period.slice(5), 10);
    if (!d) return '<div class="h2-bar-col"><div class="h2-bar-empty">—</div>' +
      '<div class="h2-bar-ay">' + _H2_AYLAR[m - 1] + '</div></div>';
    var hPx = Math.max(Math.round(d.adet / maxAdet * 64), 3);
    return '<div class="h2-bar-col">' +
      '<div class="h2-bar-hgo hd-' + hgo3(d.hgo) + '">%' + Math.round(d.hgo) + '</div>' +
      '<div class="h2-bar-wrap"><div class="h2-bar hd-bar-' + hgo3(d.hgo) + '" style="height:' + hPx + 'px"></div></div>' +
      '<div class="h2-bar-adet">' + d.adet.toLocaleString('tr-TR') + '</div>' +
      '<div class="h2-bar-fc">F%' + (d.forecast != null ? d.forecast : '—') + '</div>' +
      '<div class="h2-bar-ay">' + _H2_AYLAR[m - 1] + '</div>' +
    '</div>';
  }).join('');
  return '<div class="h2-sec-title">Aylık Trend · ' + _h2ProdLabel() + ' · ' + _h2Year + '</div>' +
    '<div class="h2-card"><div class="h2-bars">' + cols + '</div>' +
    '<div class="h2-bars-legend">Sütun: gerçekleşen adet · Üst: HGO · Alt: ay sonu forecast</div></div>';
}

/* ─── 4. YoY DETAY ───────────────────────────────────────────────── */
function _h2YoYSection(yoy) {
  var title = '<div class="h2-sec-title">Geçen Yıl Aynı Dönem (YoY)</div>';
  if (!yoy) return title + '<div class="gecm-empty-msg">Bu dönem için geçmiş veri bulunamadı.</div>';
  if (yoy.prevMissing)
    return title + '<div class="gecm-empty-msg">YoY karşılaştırması için önceki yıl verisi bulunamadı (' + yoy.prevPeriod + ').</div>';

  var rows = HIST2_PRODS.map(function(pm) {
    var d = yoy.prods[pm.key];
    if (!d || !d.prev) return '';
    var up = d.dHgo !== null && d.dHgo >= 0;
    return '<div class="h2-yoy-row">' +
      '<div class="h2-yoy-prod">' + pm.label + '</div>' +
      '<div class="h2-yoy-flow">' +
        '<span class="h2-yoy-old">%' + d.prev.hgo.toFixed(1) + '</span>' +
        '<span class="h2-yoy-arr">→</span>' +
        '<span class="h2-yoy-new hd-' + hgo3(d.curr.hgo) + '">%' + d.curr.hgo.toFixed(1) + '</span>' +
      '</div>' +
      '<div class="h2-yoy-delta ' + (up ? 'hd-g' : 'hd-r') + '">' +
        (d.dHgo !== null ? (up ? '▲ +' : '▼ −') + Math.abs(d.dHgo).toFixed(1) + ' pn' : '—') + '</div>' +
      '<div class="h2-yoy-mini">' +
        'Adet ' + _h2Sgn(d.dAdet) + ' · Hedef ' + _h2Sgn(d.dHedef) + ' · Fc ' + _h2Sgn(d.dFc) +
      '</div>' +
    '</div>';
  }).join('');

  return title + '<div class="h2-card">' +
    '<div class="h2-yoy-head">' + yoy.prevPeriod + ' → ' + yoy.period + '</div>' + rows + '</div>';
}

function _h2Sgn(v) {
  if (v === null || v === undefined) return '—';
  return (v > 0 ? '+' : '') + v.toLocaleString('tr-TR');
}

/* ─── 5. OPERASYON YORUMU (kural tabanlı) ────────────────────────── */
function _h2CommentSection(hist, ytd, yoy) {
  var lines = [];

  /* YoY mobil gelişimi */
  var ym = yoy && yoy.prods.mobil;
  if (ym && ym.dHgo !== null) {
    if (ym.dHgo >= 3)       lines.push('Bayi mobil tarafta geçen yıla göre <strong>+' + ym.dHgo.toFixed(1) + ' puan</strong> gelişim göstermiştir.');
    else if (ym.dHgo <= -3) lines.push('Bayi mobil tarafta geçen yılın <strong>' + Math.abs(ym.dHgo).toFixed(1) + ' puan</strong> gerisindedir.');
    else                     lines.push('Mobil performans geçen yıl aynı dönemle benzer seviyededir (' + (ym.dHgo >= 0 ? '+' : '') + ym.dHgo.toFixed(1) + ' puan).');
  }

  /* YTD hedef altı ürünler */
  if (ytd) {
    var weak = HIST2_PRODS.filter(function(pm) {
      var d = ytd.prods[pm.key];
      return d && d.hgo !== null && d.hgo < 90;
    }).map(function(pm) { return pm.label; });
    if (weak.length) lines.push('<strong>' + weak.join(', ') + '</strong> tarafında YTD performansı hedefin altında kalmaktadır.');
    else if (ytd.toplamHgo !== null && ytd.toplamHgo >= 100) lines.push('Tüm ürünlerde YTD performans hedef seviyesinde veya üzerindedir.');
  }

  /* Son 3 ay eğilimi (ürün bazlı tarama) */
  var yearHist = hist.filter(function(x) { return x.period.slice(0, 4) === String(_h2Year); });
  if (yearHist.length >= 3) {
    HIST2_PRODS.forEach(function(pm) {
      var s = yearHist.map(function(x) { var d = x.dealer[pm.key]; return d ? d.hgo : null; })
                      .filter(function(v) { return v !== null; }).slice(-3);
      if (s.length === 3) {
        if (s[0] > s[1] && s[1] > s[2]) lines.push('<strong>' + pm.label + '</strong> tarafında son 3 ayda düşüş eğilimi vardır.');
        else if (s[0] < s[1] && s[1] < s[2] && s[2] - s[0] >= 5) lines.push('<strong>' + pm.label + '</strong> tarafında son 3 ayda güçlü yükseliş vardır.');
      }
    });
  }

  if (!lines.length) lines.push('Değerlendirme için yeterli geçmiş veri bulunmamaktadır.');

  return '<div class="h2-sec-title">Operasyon Yorumu</div>' +
    '<div class="h2-card h2-comment">' +
      lines.map(function(l) { return '<div class="h2-comment-line">• ' + l + '</div>'; }).join('') +
    '</div>';
}

/* ─── GÖRSEL OLUŞTUR ─────────────────────────────────────────────── */
async function downloadGecmisPNG() {
  try {
    await ensureH2C();
    var el = document.getElementById('gecm-card');
    if (!el) throw new Error('Geçmiş kartı bulunamadı');
    var ds  = _h2Dealers();
    var cur = ds.find(function(d) { return String(d.bayiKodu) === String(_h2Bayi); });
    var nm  = ((cur && cur.bayiAdi) || _h2Bayi || '').replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/g, '').slice(0, 15);
    var fname = 'TT_GecmisPerformans_' + nm + '_' + _h2Year + '.png';
    var canvas = await html2canvas(el, {
      scale: 2.5, backgroundColor: '#F0F3FA',
      useCORS: true, logging: false, scrollX: 0, scrollY: 0,
    });
    _openSharePreview(canvas.toDataURL('image/png'), fname);
  } catch (e) {
    alert('Görsel hatası: ' + e.message);
  }
}

/* ─── AYARLAR: GEÇMİŞ VERİ YÖNETİMİ ──────────────────────────────── */
function renderHistorySettings() {
  var el = document.getElementById('hist-settings-content');
  if (!el) return;
  var periods = (HIST2_MANIFEST && HIST2_MANIFEST.periods) || [];
  if (!periods.length) {
    el.innerHTML = '<div class="hist-s-empty">data/history/ klasöründe dönem bulunamadı.<br>manifest.json → periods listesine "YYYY-AA" ekleyin.</div>';
    return;
  }
  el.innerHTML = periods.map(function(p) {
    var doc = HIST2_DATA[p];
    var ok  = !!doc;
    return '<div class="hist-s-row' + (ok ? ' hist-s-active' : '') + '">' +
      '<span class="hist-s-icon">' + (ok ? '✅' : '⚠️') + '</span>' +
      '<div class="hist-s-info">' +
        '<div class="hist-s-name">' + p + (doc && doc.demo ? ' · örnek veri' : '') + '</div>' +
        '<div class="hist-s-file">' + (ok ? (doc.dealers.length + ' bayi · ' + (doc.channel || '—')) : 'dosya bulunamadı') + '</div>' +
      '</div>' +
      (ok ? '<span class="hist-s-badge">Yüklü</span>' : '') +
    '</div>';
  }).join('');
}
