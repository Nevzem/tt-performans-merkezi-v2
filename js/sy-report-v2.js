/* ════════════════════════════════════════════════════════════════════
   js/sy-report-v2.js  —  Satış Yöneticisi Ürün Performans Raporu v2
   (Sprint 24.2 — sıfırdan kompakt "yönetici karşılaştırma tablosu")

   Bu dosya Sprint 24.1'in js/sy-matrix.js dosyasındaki HESAPLAMA
   katmanını (symBuildRow/symBuildRows/symBuildRegionCols/_symNormName/
   _symN/_symPct1/_symPct0/_symBand, ayrıca render.js'teki hgoBand/
   gunInfo) DEĞİŞTİRMEDEN yeniden kullanır — yalnızca GÖRÜNÜM katmanı
   sıfırdan yazıldı. Eski sy-matrix.js renderer'ı SİLİNMEDİ; "Görünüm"
   filtresinden hâlâ erişilebilir (geri dönüş / karşılaştırma amaçlı).

   Bu ekranda da "Genel HGO / Genel Forecast / Toplam Performans" gibi
   ürünlerin toplamından üretilen birleşik metrik YOKTUR.

   Sprint 24.3: Bu dosya artık YALNIZCA uygulama içi mobil/canlı ekranı
   üretir (.sy2-* sınıfları). "Görsel Oluştur" PNG export'u tamamen
   ayrı bir dosyaya taşındı — js/sy-share.js (.sy-share-* sınıfları,
   bağımsız CSS: css/sy-share.css). Bu ekran ile paylaşım PNG'si aynı
   hesap katmanını (sy-matrix.js) kullanır ama görünüm/DOM/CSS olarak
   birbirinden tamamen bağımsızdır — bkz. js/sy-share.js üst yorumu.
   ════════════════════════════════════════════════════════════════════ */

/* ─── ÜRÜN KİMLİK RENKLERİ — yalnızca ikon/donut vurgusu, performans
   rengi DEĞİL (performans her zaman merkezi hgoBand()'dan gelir). ──── */
var SY2_ACCENT = { mobil: '#16A34A', dsl: '#2563EB', tv: '#EA580C', cihaz: '#7C3AED' };

/* ─── SIRALAMA STATE — minimal, ürün + ölçüt (Sprint 24.1'deki
   symSortProd/symSortMetric ile KARIŞTIRILMASIN; bu ekran bağımsız). ── */
var sy2SortProd   = 'mobil';
var sy2SortMetric = 'hgo';
var _sy2LastNames = null;   /* en son render'daki onlyNames (EDM alt kümesi) — export için hatırlanır */

var SY2_SORT_METRICS = [
  { key: 'hgo',        label: 'HGO' },
  { key: 'forecast',   label: 'Forecast' },
  { key: 'aktivasyon', label: 'Aktivasyon' },
  { key: 'deltaA',     label: 'Adet Artışı' },
  { key: 'deltaHgo',   label: 'HGO Artışı' },
];

function setSy2SortProd(k)   { sy2SortProd = k;   render(); }
function setSy2SortMetric(k) { sy2SortMetric = k; render(); }

/* ─── VERİ ERİŞİMİ — mevcut sy-matrix.js hesaplarını SARAR, tekrar
   yazmaz (Sprint 24.2 madde 18). ────────────────────────────────────── */
function getSYProductData(names)  { return symBuildRows(names); }               /* yönetici satırları (normalize + matchWarn dahil) */
function getSYRegionProductData(allNames) { return symBuildRegionCols(allNames); } /* Kuzey Anadolu Bölge ürün toplamı */

/* ─── SIRALAMA — Sprint 24.2 madde 17: eşitlikte 1) Forecast 2) Aktivasyon
   3) Adet trendi 4) ad alfabetik. Sprint 24.1'in symSortRows'undan farklı
   eşitlik kuralı olduğu için ayrı fonksiyon (eskiyi bozma). ──────────── */
function getSYSortValue(row, prodKey, metricKey) {
  var c = row.cols[prodKey];
  if (!c) return -Infinity;
  if (metricKey === 'forecast')   return c.f    != null ? c.f    : -Infinity;
  if (metricKey === 'aktivasyon') return c.a    != null ? c.a    : -Infinity;
  if (metricKey === 'deltaA')     return c.dA   != null ? c.dA   : -Infinity;
  if (metricKey === 'deltaHgo')   return c.dHgo != null ? c.dHgo : -Infinity;
  return c.hgo != null ? c.hgo : -Infinity;
}
function _sy2SortRows(rows, prodKey, metricKey) {
  return rows.slice().sort(function(a, b) {
    var d = getSYSortValue(b, prodKey, metricKey) - getSYSortValue(a, prodKey, metricKey);
    if (d) return d;
    var ca = a.cols[prodKey] || {}, cb = b.cols[prodKey] || {};
    var fd = (cb.f  || 0) - (ca.f  || 0); if (fd) return fd;   /* 1) Forecast */
    var ad = (cb.a  || 0) - (ca.a  || 0); if (ad) return ad;   /* 2) Aktivasyon */
    var td = (cb.dA || 0) - (ca.dA || 0); if (td) return td;   /* 3) Adet trendi */
    return (a.nm || '').localeCompare(b.nm || '', 'tr');       /* 4) ad alfabetik */
  });
}

/* ─── BİÇİMLENDİRME — sy-matrix.js'deki _symN/_symPct1/_symPct0/_symBand
   doğrudan kullanılır (aşağıda yeniden tanımlanmaz). ──────────────────── */

/* ─── MİNİ DONUT — hedefe ulaşma oranını temsil eder, 100'de tavanlanır;
   merkezinde metin YOK (HGO zaten metin olarak ayrı gösteriliyor). ──── */
function _sy2Donut(pct, size, colorHex) {
  var sw  = Math.max(3, Math.round(size * 0.16));
  var r   = (size - sw) / 2;
  var c   = 2 * Math.PI * r;
  var p   = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  var off = c * (1 - p / 100);
  var mid = size / 2;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" class="sy2-donut" aria-hidden="true">' +
    '<circle cx="' + mid + '" cy="' + mid + '" r="' + r + '" fill="none" stroke="#E7EBF3" stroke-width="' + sw + '"/>' +
    (p > 0
      ? '<circle cx="' + mid + '" cy="' + mid + '" r="' + r + '" fill="none" stroke="' + colorHex + '" stroke-width="' + sw +
        '" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" stroke-linecap="round" transform="rotate(-90 ' + mid + ' ' + mid + ')"/>'
      : '') +
  '</svg>';
}

/* ─── KOMPAKT KURUMSAL BAŞLIK (madde 3) ──────────────────────────────── */
function _sy2HeaderHTML(subtitle, donemTxt) {
  var dateStr = new Date().toLocaleDateString('tr-TR');
  return '<div class="sy2-hdr">' +
    '<div class="sy2-hdr-l">' +
      '<img class="sy2-logo" src="icons/icon-180.png" alt="TT">' +
      '<div class="sy2-hdr-brand"><b>Türk Telekom</b><span>Kuzey Anadolu Bölge</span></div>' +
    '</div>' +
    '<div class="sy2-hdr-c">' +
      '<div class="sy2-hdr-title">📋 Satış Yöneticisi Ürün Performans Raporu</div>' +
      '<div class="sy2-hdr-sub">' + subtitle + '</div>' +
    '</div>' +
    '<div class="sy2-hdr-r">' +
      '<div class="sy2-hdr-donem">' + (donemTxt || '—') + '</div>' +
      '<div class="sy2-hdr-date">' + dateStr + '</div>' +
    '</div>' +
  '</div>';
}

/* ─── KUZEY ANADOLU BÖLGE PERFORMANSI (madde 4) ─────────────────────── */
function buildSYRegionSummary(regionCols, kalanGun, monthDone, edmMode) {
  var cardsHTML = SYM_PRODS.map(function(p) {
    var c     = regionCols[p.key];
    var band  = c.hgo != null ? _symBand(c.hgo) : null;
    var fBand = c.f   != null ? _symBand(c.f)   : null;
    var donutPct = c.hasTarget ? Math.min(c.hgo || 0, 100) : 0;

    var gunlukVal = (c.hasTarget && !monthDone && kalanGun && kalanGun > 0 && !c.over && c.kalan > 0)
      ? Math.ceil(c.kalan / kalanGun) : null;

    var trendHTML = '';
    if ((c.dA !== undefined && c.dA !== null) || (c.dHgo !== undefined && c.dHgo !== null)) {
      var trendA = (c.dA == null || c.dA === 0) ? '<span class="sy2-tr eq">—</span>'
        : c.dA > 0 ? '<span class="sy2-tr up">▲ +' + _symN(c.dA) + ' adet</span>'
        : '<span class="sy2-tr dn">▼ ' + _symN(c.dA) + ' adet</span>';
      var trendH = (c.dHgo == null || c.dHgo === 0) ? '<span class="sy2-tr eq">—</span>'
        : c.dHgo > 0 ? '<span class="sy2-tr up">▲ +' + c.dHgo.toFixed(1).replace('.', ',') + ' HGO</span>'
        : '<span class="sy2-tr dn">▼ ' + c.dHgo.toFixed(1).replace('.', ',') + ' HGO</span>';
      trendHTML = '<div class="sy2-rc-trend2">' + trendA + trendH + '</div>';
    }

    return '<div class="sy2-rc">' +
      '<div class="sy2-rc-top">' +
        '<div class="sy2-rc-lbl"><span class="sy2-ic" style="background:' + SY2_ACCENT[p.key] + '22;color:' + SY2_ACCENT[p.key] + '">' + p.icon + '</span>' + (edmMode ? p.edmLabel : p.label) + '</div>' +
        '<div class="sy2-rc-hgowrap">' +
          '<div class="sy2-rc-hgo' + (band ? ' b-' + band : '') + '">' + _symPct1(c.hgo) + ' <small>HGO</small></div>' +
          '<div class="sy2-rc-akt">' + _symN(c.a) + ' Aktivasyon</div>' +
        '</div>' +
      '</div>' +
      '<div class="sy2-rc-mid">' +
        _sy2Donut(donutPct, 40, SY2_ACCENT[p.key]) +
        '<div class="sy2-rc-stats">' +
          '<div class="sy2-rc-line">' + (c.hasTarget ? _symN(c.h) : '—') + ' <small>Hedef</small></div>' +
          '<div class="sy2-rc-line">' + (c.hasTarget ? (c.over ? '<span class="plus">+' + _symN(c.fazla) + ' Fazla</span>' : _symN(c.kalan) + ' Kalan') : '—') + '</div>' +
          '<div class="sy2-rc-line"><span class="sy2-rc-fc' + (fBand ? ' b-' + fBand : ' b-off') + '">' + _symPct0(c.f) + ' Forecast</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="sy2-rc-daily">Günlük ' + (gunlukVal != null ? _symN(gunlukVal) : '—') + '</div>' +
      trendHTML +
    '</div>';
  }).join('');

  return '<div class="sec t"><span>📊 Kuzey Anadolu Bölge Performansı</span></div>' +
    '<div class="sy2-region-grid">' + cardsHTML + '</div>';
}

/* ─── ÜRÜN VE SIRALAMA KONTROLLERİ (madde 5) ─────────────────────────
   Sprint 24.3: yalnızca canlı/uygulama ekranında kullanılır — paylaşım
   PNG'sinde (js/sy-share.js) bu kontroller hiç render edilmez. */
function buildSYFilters(prodObj, metricObj, edmMode) {
  var dirTxt = (sy2SortMetric === 'deltaA' || sy2SortMetric === 'deltaHgo' || sy2SortMetric === 'hgo' || sy2SortMetric === 'forecast' || sy2SortMetric === 'aktivasyon')
    ? 'Yüksekten Düşüğe' : 'Yüksekten Düşüğe';

  var prodBtns = SYM_PRODS.map(function(p) {
    return '<button class="sy2-pill' + (p.key === sy2SortProd ? ' on' : '') + '" onclick="setSy2SortProd(\'' + p.key + '\')">' +
      p.icon + ' ' + (edmMode ? p.edmLabel : p.label) + '</button>';
  }).join('');
  var metricBtns = SY2_SORT_METRICS.map(function(m) {
    return '<button class="sy2-pill' + (m.key === sy2SortMetric ? ' on' : '') + '" onclick="setSy2SortMetric(\'' + m.key + '\')">' + m.label + '</button>';
  }).join('');

  return '<div class="sy2-filters">' +
    '<div class="sy2-filters-row"><span class="sy2-filters-lbl">Ürün</span><div class="sy2-pillrow">' + prodBtns + '</div></div>' +
    '<div class="sy2-filters-row"><span class="sy2-filters-lbl">Sıralama</span><div class="sy2-pillrow">' + metricBtns + '</div></div>' +
    '<div class="sy2-filters-info">' + (edmMode ? prodObj.edmLabel : prodObj.label) + ' · ' + metricObj.label + ' — ' + dirTxt + '</div>' +
  '</div>';
}

/* ─── ÜRÜN MİNİ KARTI — yönetici satırındaki 4 üründen biri (madde 7) ── */
function buildSYProductMiniCard(p, c, kalanGun, monthDone, edmMode) {
  var band  = c.hgo != null ? _symBand(c.hgo) : null;
  var fBand = c.f   != null ? _symBand(c.f)   : null;
  var donutPct = c.hasTarget ? Math.min(c.hgo || 0, 100) : 0;

  var hedefKalanLine = c.hasTarget
    ? ('Hedef ' + _symN(c.h) + ' · ' + (c.over ? '<span class="plus">+' + _symN(c.fazla) + ' Fazla</span>' : _symN(c.kalan) + ' Kalan'))
    : 'Hedef —';

  /* Ay bitmemişse ve kalan varsa Günlük satırı; aksi halde TAMAMEN kaldırılır (madde 7) */
  var gunlukVal = (c.hasTarget && !monthDone && kalanGun && kalanGun > 0 && !c.over && c.kalan > 0)
    ? Math.ceil(c.kalan / kalanGun) : null;
  var dailyHTML = gunlukVal != null ? '<div class="sy2-mc-line">Günlük ' + _symN(gunlukVal) + '</div>' : '';

  var trendHTML = '';
  if ((c.dA !== undefined && c.dA !== null) || (c.dHgo !== undefined && c.dHgo !== null)) {
    var trendA = (c.dA == null || c.dA === 0) ? '<span class="sy2-tr eq">—</span>'
      : c.dA > 0 ? '<span class="sy2-tr up">▲ +' + _symN(c.dA) + ' adet</span>'
      : '<span class="sy2-tr dn">▼ ' + _symN(c.dA) + ' adet</span>';
    var trendH = (c.dHgo == null || c.dHgo === 0) ? '<span class="sy2-tr eq">—</span>'
      : c.dHgo > 0 ? '<span class="sy2-tr up">▲ +' + c.dHgo.toFixed(1).replace('.', ',') + ' HGO</span>'
      : '<span class="sy2-tr dn">▼ ' + c.dHgo.toFixed(1).replace('.', ',') + ' HGO</span>';
    trendHTML = '<div class="sy2-mc-trend">' + trendA + trendH + '</div>';
  }

  return '<div class="sy2-mc">' +
    '<div class="sy2-mc-top">' +
      '<div class="sy2-mc-lbl"><span class="sy2-ic sm" style="background:' + SY2_ACCENT[p.key] + '22;color:' + SY2_ACCENT[p.key] + '">' + p.icon + '</span>' + (edmMode ? p.edmLabel : p.label) + '</div>' +
      _sy2Donut(donutPct, 34, SY2_ACCENT[p.key]) +
    '</div>' +
    '<div class="sy2-mc-hgo-row"><span class="sy2-mc-hgo' + (band ? ' b-' + band : '') + '">' + _symPct1(c.hgo) + ' HGO</span>' +
      '<span class="sy2-mc-fc' + (fBand ? ' b-' + fBand : ' b-off') + '">F ' + _symPct0(c.f) + '</span></div>' +
    '<div class="sy2-mc-akt">' + _symN(c.a) + ' Aktivasyon</div>' +
    '<div class="sy2-mc-line">' + hedefKalanLine + '</div>' +
    dailyHTML +
    trendHTML +
  '</div>';
}

/* ─── BÖLGEYE GÖRE FARK — yalnızca SEÇİLİ ürün için (madde 8) ────────── */
function buildSYRegionDiff(prodLabel, mgrHgoVal, regionHgoVal) {
  if (mgrHgoVal == null || regionHgoVal == null) {
    return '<div class="sy2-diff">' +
      '<div class="sy2-diff-lbl">Bölgeye Göre<br>' + prodLabel + '</div>' +
      '<div class="sy2-diff-region">Bölge —</div>' +
      '<div class="sy2-diff-val eq">—</div>' +
    '</div>';
  }
  var diff = Math.round((mgrHgoVal - regionHgoVal) * 10) / 10;
  var dCls = diff > 0 ? 'up' : diff < 0 ? 'dn' : 'eq';
  var dTxt = diff > 0 ? ('▲ +' + diff.toFixed(1).replace('.', ',')) : diff < 0 ? ('▼ ' + diff.toFixed(1).replace('.', ',')) : '—';
  return '<div class="sy2-diff">' +
    '<div class="sy2-diff-lbl">Bölgeye Göre<br>' + prodLabel + '</div>' +
    '<div class="sy2-diff-region">Bölge ' + _symPct1(regionHgoVal) + '</div>' +
    '<div class="sy2-diff-val ' + dCls + '">' + dTxt + '</div>' +
    '<div class="sy2-diff-sub">HGO puan farkı</div>' +
  '</div>';
}

/* ─── YÖNETİCİ SATIRI (madde 6-8) ─────────────────────────────────────
   Geniş/export: [Yönetici][Mobil][DSL][TV][Cihaz][Bölge Farkı] tek satır.
   Mobil (container <760px): yönetici üstte, altında 2×2, en altta fark. */
function buildSYManagerRow(row, i, regionCols, kalanGun, monthDone, edmMode, sortProdKey, sortProdObj) {
  var cellsHTML = SYM_PRODS.map(function(p) {
    return buildSYProductMiniCard(p, row.cols[p.key], kalanGun, monthDone, edmMode);
  }).join('');

  var mgrHgo    = row.cols[sortProdKey] ? row.cols[sortProdKey].hgo : null;
  var regionHgo = regionCols[sortProdKey] ? regionCols[sortProdKey].hgo : null;
  var diffHTML  = buildSYRegionDiff(edmMode ? sortProdObj.edmLabel : sortProdObj.label, mgrHgo, regionHgo);

  var warnHTML = row.matchWarn ? ' <span class="sy2-warn">⚠</span>' : '';

  return '<div class="sy2-row">' +
    '<div class="sy2-row-id">' +
      '<div class="sy2-rk">' + (i + 1) + '</div>' +
      '<div class="sy2-nm">' + row.nm + warnHTML + '</div>' +
      '<div class="sy2-meta">' + row.bayiCount + ' bayi<br>' + row.persCount + ' personel</div>' +
    '</div>' +
    '<div class="sy2-row-prods">' + cellsHTML + '</div>' +
    diffHTML +
  '</div>';
}

function buildSYManagerRows(rows, regionCols, kalanGun, monthDone, edmMode, sortProdKey, sortProdObj) {
  return rows.map(function(r, i) {
    return buildSYManagerRow(r, i, regionCols, kalanGun, monthDone, edmMode, sortProdKey, sortProdObj);
  }).join('');
}

/* ─── ÜRÜN LİDERLERİ (madde 12) — genel lider YOK ─────────────────────── */
function buildSYLeaders(rows, edmMode) {
  var cardsHTML = SYM_PRODS.map(function(p) {
    var best = null;
    rows.forEach(function(row) {
      var c = row.cols[p.key];
      if (c && c.hgo != null && (!best || c.hgo > best.hgo)) best = { nm: row.nm, hgo: c.hgo };
    });
    var band = best ? _symBand(best.hgo) : null;
    return '<div class="sy2-ldr">' +
      '<div class="sy2-ldr-top"><span class="sy2-ic sm" style="background:' + SY2_ACCENT[p.key] + '22;color:' + SY2_ACCENT[p.key] + '">' + p.icon + '</span>' + (edmMode ? p.edmLabel : p.label) + ' Lideri <span class="sy2-ldr-cup">🏆</span></div>' +
      (best
        ? '<div class="sy2-ldr-nm">' + best.nm + '</div><div class="sy2-ldr-v' + (band ? ' b-' + band : '') + '">' + _symPct1(best.hgo) + ' HGO</div>'
        : '<div class="sy2-ldr-nm">—</div>') +
    '</div>';
  }).join('');

  return '<div class="sec t"><span>🏆 Ürün Liderleri</span></div>' +
    '<div class="sy2-ldr-grid">' + cardsHTML + '</div>';
}

/* ─── TAM RAPOR İÇERİĞİ — uygulama içi CANLI ekran için (Sprint 24.3'ten
   itibaren export bu fonksiyonu kullanmaz; bkz. js/sy-share.js). ───── */
function _sy2BuildInnerHTML(opts) {
  var regionCols = opts.regionCols, rows = opts.rows, kalanGun = opts.kalanGun,
      monthDone = opts.monthDone, edmMode = opts.edmMode, prodObj = opts.prodObj,
      metricObj = opts.metricObj, subtitle = opts.subtitle, donemTxt = opts.donemTxt;

  return _sy2HeaderHTML(subtitle, donemTxt) +
    buildSYRegionSummary(regionCols, kalanGun, monthDone, edmMode) +
    buildSYFilters(prodObj, metricObj, edmMode) +
    '<div class="sec t"><span>👔 Yöneticiler</span><span class="cnt">' + rows.length + ' SY</span></div>' +
    '<div class="sy2-rows">' + buildSYManagerRows(rows, regionCols, kalanGun, monthDone, edmMode, opts.sortProdKey, prodObj) + '</div>' +
    buildSYLeaders(rows, edmMode) +
    '<div class="sy2-ftr"><span>Hedefe Birlikte</span><span class="dot">◆</span><span>' + new Date().toLocaleDateString('tr-TR') + '</span></div>';
}

/* Ortak state hazırlığı — canlı render ve export İKİSİ de bunu kullanır,
   böylece iki yerde aynı hesap tekrar yazılmaz. */
function _sy2PrepareState(onlyNames) {
  var S = (typeof SYDATA !== 'undefined') ? SYDATA : null;
  if (!S || !S.sy || !Object.keys(S.sy).length) return null;

  var edmMode  = typeof KANAL !== 'undefined' && KANAL === 'EDM';
  var allNames = Object.keys(S.sy);
  var names    = (onlyNames && onlyNames.length) ? onlyNames : allNames;

  var regionCols = getSYRegionProductData(allNames); /* her zaman TAM bölge */
  var rows = getSYProductData(names);
  rows = _sy2SortRows(rows, sy2SortProd, sy2SortMetric);

  var gi        = (typeof gunInfo === 'function') ? gunInfo() : { ayGun: 0, gecenGun: 0, kalanGun: null };
  var kalanGun  = gi.kalanGun;
  var monthDone = gi.ayGun > 0 && gi.gecenGun > 0 && gi.ayGun <= gi.gecenGun;
  var gunTxt    = (gi.ayGun && gi.gecenGun) ? gi.gecenGun + '/' + gi.ayGun + '. gün' : '';

  var prodObj   = SYM_PRODS.filter(function(p) { return p.key === sy2SortProd; })[0] || SYM_PRODS[0];
  var metricObj = SY2_SORT_METRICS.filter(function(m) { return m.key === sy2SortMetric; })[0] || SY2_SORT_METRICS[0];
  var cmpTag    = (typeof SYPREV !== 'undefined' && SYPREV) ? ' · önceki raporla karşılaştırma' : '';
  var fcTag     = monthDone ? ' · Ay Sonu Sonucu' : ' · Forecast Aktif';

  var subtitle = 'Mobil · DSL · TV · Cihaz' + (gunTxt ? ' · ' + gunTxt : '') + fcTag + cmpTag;

  return {
    regionCols: regionCols, rows: rows, kalanGun: kalanGun, monthDone: monthDone,
    edmMode: edmMode, prodObj: prodObj, metricObj: metricObj, subtitle: subtitle,
    donemTxt: (typeof DONEM !== 'undefined' ? DONEM : '—'), sortProdKey: sy2SortProd,
  };
}

/* ─── SAYFA RENDER (canlı) ─────────────────────────────────────────── */
function renderSYReportV2(onlyNames) {
  _sy2LastNames = onlyNames || null;

  var cards = document.getElementById('cards');
  cards.className = 'cards single';

  var state = _sy2PrepareState(onlyNames);
  if (!state) {
    cards.style.maxWidth = '440px';
    cards.innerHTML =
      '<div class="card" id="sy-card">' +
      hdrHTML('👔', 'Satış Yöneticisi Ürün Performans Raporu', 'SY verisi yüklenmedi') +
      '<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px">SY ÖZET verisi bulunamadı — Excel raporu yükleyin.</div>' +
      '</div>';
    return;
  }

  cards.style.maxWidth = '1080px';
  cards.innerHTML = '<div class="card sy2-page" id="sy-card">' + _sy2BuildInnerHTML(state) + '</div>';
}
