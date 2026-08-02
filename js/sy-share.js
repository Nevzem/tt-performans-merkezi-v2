/* ════════════════════════════════════════════════════════════════════
   js/sy-share.js  —  Satış Yöneticisi PAYLAŞIM PNG şablonu (Sprint 24.3)

   Bu dosya js/sy-report-v2.js'teki (uygulama içi CANLI mobil ekran)
   GÖRÜNÜM katmanından tamamen bağımsızdır:
   - Aynı hesaplama katmanını (js/sy-matrix.js — symBuildRows/
     symBuildRegionCols/SYM_PRODS/_symNormName/_symN/_symPct1/_symPct0/
     _symBand, ayrıca render.js'teki hgoBand/gunInfo) DEĞİŞTİRMEDEN
     yeniden kullanır — aynı hesap iki kez yazılmaz.
   - Kendi offscreen/gizli export DOM'unu (.sy-share-page) kurar;
     uygulama ekranının screenshot'ını almaz, uygulama DOM'unu mutate
     etmez.
   - Kendi bağımsız CSS dosyasını kullanır: css/sy-share.css
     (.sy-share-* sınıfları) — css/sy-report-v2.css'i (.sy2-*) hiç
     etkilemez, ondan etkilenmez.
   - Sıralama HER ZAMAN alfabetik (tr-TR) — canlı ekranın sy2SortProd/
     sy2SortMetric sıralama state'i export'a YANSIMAZ.
   - Bayi/personel sayıları, ürün/sıralama seçim kontrolleri ve
     "Bölgeye Göre Fark" kolonu bu şablonda YOKTUR (yalnızca canlı
     ekranda gösterilir).
   ════════════════════════════════════════════════════════════════════ */

/* ─── ÜRÜN KİMLİK RENKLERİ — sy-report-v2.js'teki SY2_ACCENT ile aynı
   değerler, kasıtlı tekrar (dosya bağımsızlığı için). ────────────────── */
var SYS_ACCENT = { mobil: '#16A34A', dsl: '#2563EB', tv: '#EA580C', cihaz: '#7C3AED' };

/* ─── MİNİ DONUT — sy-report-v2.js'teki _sy2Donut ile aynı çizim,
   kasıtlı tekrar (bu dosya sy-report-v2.js'e bağımlı olmasın diye). ─── */
function _sysDonut(pct, size, colorHex) {
  var sw  = Math.max(3, Math.round(size * 0.16));
  var r   = (size - sw) / 2;
  var c   = 2 * Math.PI * r;
  var p   = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  var off = c * (1 - p / 100);
  var mid = size / 2;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" class="sy-share-donut" aria-hidden="true">' +
    '<circle cx="' + mid + '" cy="' + mid + '" r="' + r + '" fill="none" stroke="#E7EBF3" stroke-width="' + sw + '"/>' +
    (p > 0
      ? '<circle cx="' + mid + '" cy="' + mid + '" r="' + r + '" fill="none" stroke="' + colorHex + '" stroke-width="' + sw +
        '" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" stroke-linecap="round" transform="rotate(-90 ' + mid + ' ' + mid + ')"/>'
      : '') +
  '</svg>';
}

function _sysTrend(delta, suffix, isHgo) {
  if (delta == null || delta === 0) return '<span class="sy-share-tr eq">—</span>';
  var txt = isHgo ? delta.toFixed(1).replace('.', ',') : _symN(delta);
  return delta > 0
    ? '<span class="sy-share-tr up">▲+' + txt + (suffix ? ' ' + suffix : '') + '</span>'
    : '<span class="sy-share-tr dn">▼' + txt + (suffix ? ' ' + suffix : '') + '</span>';
}

/* ─── KURUMSAL BAŞLIK ─────────────────────────────────────────────── */
function renderSYShareHeader(donemTxt, gunTxt, fcTag) {
  var dateStr = new Date().toLocaleDateString('tr-TR');
  return '<div class="sy-share-hdr">' +
    '<div class="sy-share-hdr-l">' +
      '<img class="sy-share-logo" src="icons/icon-180.png" alt="TT">' +
      '<div class="sy-share-hdr-brand"><b>Türk Telekom</b><span>Kuzey Anadolu Bölge</span></div>' +
    '</div>' +
    '<div class="sy-share-hdr-c">' +
      '<div class="sy-share-hdr-title">SATIŞ YÖNETİCİSİ ÜRÜN PERFORMANS RAPORU</div>' +
      '<div class="sy-share-hdr-sub">Mobil · DSL · TV · Cihaz' + (gunTxt ? ' · ' + gunTxt : '') + fcTag + '</div>' +
    '</div>' +
    '<div class="sy-share-hdr-r">' +
      '<div class="sy-share-hdr-donem">' + (donemTxt || '—') + '</div>' +
      '<div class="sy-share-hdr-date">' + dateStr + '</div>' +
    '</div>' +
  '</div>';
}

/* ─── KUZEY ANADOLU BÖLGE PERFORMANSI — 4 yatay ürün kartı ───────────── */
function renderSYShareRegionSummary(regionCols, kalanGun, monthDone, edmMode) {
  var cardsHTML = SYM_PRODS.map(function(p) {
    var c     = regionCols[p.key];
    var band  = c.hgo != null ? _symBand(c.hgo) : null;
    var fBand = c.f   != null ? _symBand(c.f)   : null;
    var donutPct = c.hasTarget ? Math.min(c.hgo || 0, 100) : 0;

    var gunlukVal = (c.hasTarget && !monthDone && kalanGun && kalanGun > 0 && !c.over && c.kalan > 0)
      ? Math.ceil(c.kalan / kalanGun) : null;

    return '<div class="sy-share-rc">' +
      '<div class="sy-share-rc-top">' +
        '<div class="sy-share-rc-lbl"><span class="sy-share-ic" style="background:' + SYS_ACCENT[p.key] + '22;color:' + SYS_ACCENT[p.key] + '">' + p.icon + '</span>' + (edmMode ? p.edmLabel : p.label) + '</div>' +
        _sysDonut(donutPct, 38, SYS_ACCENT[p.key]) +
      '</div>' +
      '<div class="sy-share-rc-hgo' + (band ? ' b-' + band : '') + '">' + _symPct1(c.hgo) + ' <small>HGO</small></div>' +
      '<div class="sy-share-rc-akt">' + _symN(c.a) + ' Aktivasyon</div>' +
      '<div class="sy-share-rc-stats">' +
        '<span>' + (c.hasTarget ? _symN(c.h) : '—') + ' <small>Hedef</small></span>' +
        '<span>' + (c.hasTarget ? (c.over ? '<span class="plus">+' + _symN(c.fazla) + ' Fazla</span>' : _symN(c.kalan) + ' Kalan') : '—') + '</span>' +
        '<span class="sy-share-rc-fc' + (fBand ? ' b-' + fBand : ' b-off') + '">' + _symPct0(c.f) + ' Forecast</span>' +
      '</div>' +
      '<div class="sy-share-rc-bot">' +
        '<span class="sy-share-rc-daily">Günlük ' + (gunlukVal != null ? _symN(gunlukVal) : '—') + '</span>' +
        '<span class="sy-share-rc-trend">' + _sysTrend(c.dA, 'adet', false) + _sysTrend(c.dHgo, 'HGO', true) + '</span>' +
      '</div>' +
    '</div>';
  }).join('');

  return '<div class="sy-share-sec"><span>📊 Kuzey Anadolu Bölge Performansı</span></div>' +
    '<div class="sy-share-region-grid">' + cardsHTML + '</div>';
}

/* ─── ÜRÜN HÜCRESİ — tablo satırındaki 4 üründen biri (madde 4) ──────── */
function renderSYShareProductCell(p, c) {
  var color = SYS_ACCENT[p.key];
  var band  = c.hgo != null ? _symBand(c.hgo) : null;
  var fBand = c.f   != null ? _symBand(c.f)   : null;
  var donutPct = c.hasTarget ? Math.min(c.hgo || 0, 100) : 0;

  var hedefKalanTxt = c.hasTarget
    ? ('Hedef ' + _symN(c.h) + ' · ' + (c.over ? '<span class="plus">+' + _symN(c.fazla) + ' Fazla</span>' : _symN(c.kalan) + ' Kalan'))
    : 'Hedef —';

  return '<div class="sy-share-cell">' +
    _sysDonut(donutPct, 28, color) +
    '<div class="sy-share-cell-mid">' +
      '<div class="sy-share-cell-hgo' + (band ? ' b-' + band : '') + '">' + _symPct1(c.hgo) + '</div>' +
      '<div class="sy-share-cell-fc' + (fBand ? ' b-' + fBand : ' b-off') + '">F ' + _symPct0(c.f) + '</div>' +
    '</div>' +
    '<div class="sy-share-cell-akt">' + _symN(c.a) + ' Aktv</div>' +
    '<div class="sy-share-cell-line">' + hedefKalanTxt + '</div>' +
    '<div class="sy-share-cell-trend">' + _sysTrend(c.dA, '', false) + _sysTrend(c.dHgo, '', true) + '</div>' +
  '</div>';
}

/* ─── ANA TABLO — Sıra | Satış Yöneticisi | Mobil | DSL | TV | Cihaz ──── */
function renderSYShareManagerRow(row, i) {
  var cellsHTML = SYM_PRODS.map(function(p) {
    return '<div class="sy-share-td sy-share-td-prod">' + renderSYShareProductCell(p, row.cols[p.key]) + '</div>';
  }).join('');

  return '<div class="sy-share-trow' + (i % 2 === 1 ? ' alt' : '') + '">' +
    '<div class="sy-share-td sy-share-td-rk">' + (i + 1) + '</div>' +
    '<div class="sy-share-td sy-share-td-nm">' + row.nm + '</div>' +
    cellsHTML +
  '</div>';
}

function renderSYShareTable(rows, edmMode) {
  var headCells = SYM_PRODS.map(function(p) {
    return '<div class="sy-share-th sy-share-td-prod"><span class="sy-share-th-dot" style="background:' + SYS_ACCENT[p.key] + '"></span>' + (edmMode ? p.edmLabel : p.label) + '</div>';
  }).join('');
  var headHTML = '<div class="sy-share-trow sy-share-thead">' +
    '<div class="sy-share-th sy-share-td-rk">Sıra</div>' +
    '<div class="sy-share-th sy-share-td-nm">Satış Yöneticisi</div>' +
    headCells +
  '</div>';

  var bodyHTML = rows.map(function(r, i) { return renderSYShareManagerRow(r, i); }).join('');

  return '<div class="sy-share-sec"><span>👔 Yöneticiler</span><span class="cnt">' + rows.length + ' SY</span></div>' +
    '<div class="sy-share-table">' + headHTML + '<div class="sy-share-tbody">' + bodyHTML + '</div></div>';
}

/* ─── ÜRÜN LİDERLERİ — genel lider YOK ───────────────────────────────── */
function renderSYShareLeaders(rows, edmMode) {
  var cardsHTML = SYM_PRODS.map(function(p) {
    var best = null;
    rows.forEach(function(row) {
      var c = row.cols[p.key];
      if (c && c.hgo != null && (!best || c.hgo > best.hgo)) best = { nm: row.nm, hgo: c.hgo };
    });
    var band = best ? _symBand(best.hgo) : null;
    return '<div class="sy-share-ldr">' +
      '<div class="sy-share-ldr-top"><span class="sy-share-ic sm" style="background:' + SYS_ACCENT[p.key] + '22;color:' + SYS_ACCENT[p.key] + '">' + p.icon + '</span>' + (edmMode ? p.edmLabel : p.label) + ' Lideri <span class="sy-share-ldr-cup">🏆</span></div>' +
      (best
        ? '<div class="sy-share-ldr-nm">' + best.nm + '</div><div class="sy-share-ldr-v' + (band ? ' b-' + band : '') + '">' + _symPct1(best.hgo) + ' HGO</div>'
        : '<div class="sy-share-ldr-nm">—</div>') +
    '</div>';
  }).join('');

  return '<div class="sy-share-sec"><span>🏆 Ürün Liderleri</span></div>' +
    '<div class="sy-share-ldr-grid">' + cardsHTML + '</div>';
}

/* ─── TAM PAYLAŞIM RAPORU — ortak veri modelini (symBuildRows/
   symBuildRegionCols) alfabetik sıraya (tr-TR) dizip tüm bölümleri
   birleştirir. onlyNames verilirse (EDM alt kümesi) yalnızca o kişiler
   listelenir — bölge kartları her zaman TÜM SY'lerden hesaplanır
   (symBuildRegionCols zaten böyle davranır). ─────────────────────────── */
function buildSYShareReport(onlyNames) {
  var S = (typeof SYDATA !== 'undefined') ? SYDATA : null;
  if (!S || !S.sy || !Object.keys(S.sy).length) return null;

  var edmMode  = typeof KANAL !== 'undefined' && KANAL === 'EDM';
  var allNames = Object.keys(S.sy);
  var names    = (onlyNames && onlyNames.length) ? onlyNames : allNames;

  var regionCols = symBuildRegionCols(allNames);
  var rows = symBuildRows(names);
  rows = rows.slice().sort(function(a, b) { return (a.nm || '').localeCompare(b.nm || '', 'tr-TR'); });

  var gi        = (typeof gunInfo === 'function') ? gunInfo() : { ayGun: 0, gecenGun: 0, kalanGun: null };
  var kalanGun  = gi.kalanGun;
  var monthDone = gi.ayGun > 0 && gi.gecenGun > 0 && gi.ayGun <= gi.gecenGun;
  var gunTxt    = (gi.ayGun && gi.gecenGun) ? gi.gecenGun + '/' + gi.ayGun + '. gün' : '';
  var fcTag     = monthDone ? ' · Ay Sonu Sonucu' : ' · Forecast Aktif';
  var donemTxt  = (typeof DONEM !== 'undefined' ? DONEM : '—');

  return renderSYShareHeader(donemTxt, gunTxt, fcTag) +
    renderSYShareRegionSummary(regionCols, kalanGun, monthDone, edmMode) +
    renderSYShareTable(rows, edmMode) +
    renderSYShareLeaders(rows, edmMode) +
    '<div class="sy-share-ftr"><span>Hedefe Birlikte</span><span class="dot">◆</span><span>' + donemTxt + '</span><span class="dot">◆</span><span>' + new Date().toLocaleDateString('tr-TR') + '</span></div>';
}

/* ─── EXPORT — kendi offscreen kaynak düğümünü kurar (uygulama ekranının
   screenshot'ı DEĞİL), mevcut createCleanExportClone/captureExportImage/
   cleanupExportClone/_openSharePreview altyapısı (export.js, filters.js)
   AYNEN kullanılır — export mekaniği yeniden yazılmaz. Sabit 1600px
   genişlik: içeriğe göre otomatik yükseklik, her zaman yatay/masaüstü
   düzen. ──────────────────────────────────────────────────────────── */
var SY_SHARE_EXPORT_WIDTH = 1600;

async function exportSYSharePNG() {
  var btn   = document.getElementById('fbar-dl-btn');
  var valEl = btn ? btn.querySelector('.fbar-chip-val') : null;
  var orig  = valEl ? valEl.textContent : 'Oluştur ↗';
  if (btn)   { btn.disabled = true; }
  if (valEl) { valEl.textContent = '⏳'; }

  var cloneWrapper = null;
  try {
    var onlyNames = (typeof _sy2LastNames !== 'undefined') ? _sy2LastNames : null;
    var html = buildSYShareReport(onlyNames);
    if (!html) throw new Error('SY verisi yok');

    var srcEl = document.createElement('div');
    srcEl.className = 'sy-share-page';
    srcEl.innerHTML = html;

    var res = await createCleanExportClone(srcEl, SY_SHARE_EXPORT_WIDTH);
    cloneWrapper = res.wrapper;

    var donem   = (typeof DONEM !== 'undefined' && DONEM) ? DONEM.replace('/', '') : '';
    var dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '');
    var fname   = 'TT_SYUrunRaporu_' + (donem ? donem + '_' : '') + dateStr + '.png';

    var canvas = await captureExportImage(res.clone, { scale: 2 });
    cleanupExportClone(cloneWrapper); cloneWrapper = null;

    _openSharePreview(canvas.toDataURL('image/png'), fname);
  } catch (e) {
    alert('Görsel oluşturma hatası: ' + e.message);
  }

  cleanupExportClone(cloneWrapper);
  if (btn)   { btn.disabled = false; }
  if (valEl) { valEl.textContent = orig; }
}
