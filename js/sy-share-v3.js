/* ════════════════════════════════════════════════════════════════════
   js/sy-share-v3.js — Satış Yöneticisi PAYLAŞIM PNG şablonu v3 (Sprint 25.1)

   Referans görsele ("design-references/sy-share-target.jpeg") piksel
   ölçümüyle eşleştirilmiş yeniden yapım. js/sy-share.js (v1 paylaşım
   şablonu) DEĞİŞTİRİLMEDİ / SİLİNMEDİ — bu dosya ondan tamamen bağımsız,
   kendi .sy-share-v3-* sınıflarını ve kendi offscreen export DOM'unu
   kurar. "Görsel Oluştur" butonu artık bu dosyadaki exportSYShareV3PNG()
   fonksiyonunu çağırır (bkz. js/filters.js).

   Hesaplama katmanı DEĞİŞMEDİ — js/sy-matrix.js'teki symBuildRows/
   symBuildRegionCols/SYM_PRODS/_symBand/_symN/_symPct1/_symPct0,
   render.js'teki hgoBand/gunInfo AYNEN kullanılır. HGO ve Forecast
   renkleri mevcut merkezi hgoBand() eşiklerinden gelir — burada YENİ
   RENK EŞİĞİ ÜRETİLMEDİ.
   ════════════════════════════════════════════════════════════════════ */

var SYV3_ACCENT = { mobil: '#16A34A', dsl: '#2563EB', tv: '#EA580C', cihaz: '#7C3AED' };
var SYV3_SHAPE  = { mobil: 'square', dsl: 'circle', tv: 'square', cihaz: 'square' };

/* ─── İKONLAR — beyaz stroke, düz renkli rozet üzerinde (referanstaki
   "solid renkli kare/daire + beyaz glif" stiliyle eşleşir). ─────────── */
var SYV3_ICONS = {
  mobil: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><line x1="10.5" y1="18.5" x2="13.5" y2="18.5"/></svg>',
  dsl:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><line x1="2.5" y1="12" x2="21.5" y2="12"/><path d="M12 2.5c2.6 2.6 4 6 4 9.5s-1.4 6.9-4 9.5"/><path d="M12 2.5c-2.6 2.6-4 6-4 9.5s1.4 6.9 4 9.5"/></svg>',
  tv:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17.5" x2="12" y2="21"/></svg>',
  cihaz: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5 21 7.5v9L12 21.5 3 16.5v-9z"/><path d="M3 7.5 12 12.5 21 7.5"/><line x1="12" y1="12.5" x2="12" y2="21.5"/></svg>',
};

function _v3Icon(key) { return SYV3_ICONS[key] || ''; }

function _v3Trophy(color) {
  return '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M8 21h8"/><path d="M12 17v4"/>' +
    '<path d="M7 4h10v5a5 5 0 0 1-10 0V4z" fill="' + color + '22"/>' +
    '<path d="M7 5H4.5A1.5 1.5 0 0 0 3 6.5 4 4 0 0 0 7 10"/>' +
    '<path d="M17 5h2.5A1.5 1.5 0 0 1 21 6.5 4 4 0 0 1 17 10"/>' +
  '</svg>';
}

/* ─── MİNİ DONUT — sy-share.js'teki _sysDonut ile aynı çizim, kasıtlı
   tekrar (dosya bağımsızlığı için). ──────────────────────────────────── */
function _v3Donut(pct, size, colorHex) {
  var sw  = Math.max(4, Math.round(size * 0.15));
  var r   = (size - sw) / 2;
  var c   = 2 * Math.PI * r;
  var p   = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  var off = c * (1 - p / 100);
  var mid = size / 2;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" class="sy-share-v3-donut" aria-hidden="true">' +
    '<circle cx="' + mid + '" cy="' + mid + '" r="' + r + '" fill="none" stroke="#E7EBF3" stroke-width="' + sw + '"/>' +
    (p > 0
      ? '<circle cx="' + mid + '" cy="' + mid + '" r="' + r + '" fill="none" stroke="' + colorHex + '" stroke-width="' + sw +
        '" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" stroke-linecap="round" transform="rotate(-90 ' + mid + ' ' + mid + ')"/>'
      : '') +
  '</svg>';
}

function _v3Trend(delta, suffix, isHgo) {
  if (delta == null || delta === 0) return '<span class="eq">— ' + (suffix || '') + '</span>';
  var txt = isHgo ? delta.toFixed(1).replace('.', ',') : _symN(delta);
  return delta > 0
    ? '<span class="up">▲ +' + txt + (suffix ? ' ' + suffix : '') + '</span>'
    : '<span class="dn">▼ ' + txt + (suffix ? ' ' + suffix : '') + '</span>';
}

/* ─── HEDEF / KALAN-FAZLA — referanstaki işaretli tek satır biçimi
   ("-54  Kalan" kırmızı / "+40  Fazla" yeşil). c.kalan/c.fazla DEĞERLERİ
   symBuildRow()'dan (js/sy-matrix.js) AYNEN gelir — burada yalnızca
   işaret + renk eklenerek gösterim biçimlendirilir, hesap değişmez. ──── */
function _v3KalanFazlaHTML(c) {
  if (!c.hasTarget) return '<span class="kv"><span class="val">—</span></span>';
  if (c.over) return '<span class="kv plus"><span class="val">+' + _symN(c.fazla) + '</span> Fazla</span>';
  return '<span class="kv minus"><span class="val">-' + _symN(c.kalan) + '</span> Kalan</span>';
}
function _v3KalanFazlaRightRow(c) {
  if (!c.hasTarget) return '<div class="sy-share-v3-rc-right-row"><small>—</small></div>';
  if (c.over) return '<div class="sy-share-v3-rc-right-row plus">+' + _symN(c.fazla) + '<small>Fazla</small></div>';
  return '<div class="sy-share-v3-rc-right-row minus">-' + _symN(c.kalan) + '<small>Kalan</small></div>';
}

/* ─── KURUMSAL BAŞLIK — referansta kırmızı alt çizgi YOK, "Paylaş"
   butonu final PNG'ye girmez (yalnızca uygulama önizlemesinde anlamlı
   olurdu — statik export'a etkileşimli buton konmaz). ────────────────── */
function renderSYShareV3Header(donemTxt, gunTxt, fcTag, cmpTag) {
  var dateStr = new Date().toLocaleDateString('tr-TR');
  return '<div class="sy-share-v3-header">' +
    '<div class="sy-share-v3-hdr-l">' +
      '<img class="sy-share-v3-logo" src="icons/icon-180.png" alt="TT">' +
      '<div class="sy-share-v3-hdr-brand"><b>Türk Telekom</b><span>Kuzey Anadolu Bölge</span></div>' +
    '</div>' +
    '<div class="sy-share-v3-hdr-c">' +
      '<div class="sy-share-v3-hdr-title">SATIŞ YÖNETİCİSİ ÜRÜN PERFORMANS RAPORU</div>' +
      '<div class="sy-share-v3-hdr-sub">Mobil · DSL · TV · Cihaz&nbsp;&nbsp;|&nbsp;&nbsp;' + (gunTxt || '—') + '&nbsp;&nbsp;|&nbsp;&nbsp;' + fcTag.replace(/^\s*·\s*/, '') + (cmpTag ? '&nbsp;&nbsp;|&nbsp;&nbsp;' + cmpTag.replace(/^\s*·\s*/, '') : '') + '</div>' +
    '</div>' +
    '<div class="sy-share-v3-hdr-r">' +
      '<div class="sy-share-v3-hdr-donem">📅 ' + (donemTxt || '—') + '</div>' +
      '<div class="sy-share-v3-hdr-date">Rapor Tarihi: ' + dateStr + '</div>' +
    '</div>' +
  '</div>';
}

/* ─── KUZEY ANADOLU BÖLGE PERFORMANSI — 4 eşit yatay kart ────────────── */
function renderSYShareV3RegionCard(p, c, kalanGun, monthDone, edmMode) {
  var band  = c.hgo != null ? _symBand(c.hgo) : null;
  var fBand = c.f   != null ? _symBand(c.f)   : null;
  var color = SYV3_ACCENT[p.key];
  var shape = SYV3_SHAPE[p.key] === 'circle' ? ' circle' : '';
  var donutPct = c.hasTarget ? Math.min(c.hgo || 0, 100) : 0;

  var gunlukVal = (c.hasTarget && !monthDone && kalanGun && kalanGun > 0 && !c.over && c.kalan > 0)
    ? Math.ceil(c.kalan / kalanGun) : null;

  return '<div class="sy-share-v3-rc">' +
    '<div class="sy-share-v3-rc-top">' +
      '<span class="sy-share-v3-rc-ic' + shape + '" style="background:' + color + '">' + _v3Icon(p.key) + '</span>' +
      '<span class="sy-share-v3-rc-name">' + (edmMode ? p.edmLabel : p.label) + '</span>' +
    '</div>' +
    '<div class="sy-share-v3-rc-mid">' +
      '<div class="sy-share-v3-rc-left">' +
        '<div class="sy-share-v3-rc-hgo' + (band ? ' b-' + band : '') + '">' + _symPct1(c.hgo) + '<small>HGO</small></div>' +
        '<div class="sy-share-v3-rc-akt"><b>' + _symN(c.a) + '</b> Aktivasyon</div>' +
      '</div>' +
      '<div class="sy-share-v3-rc-donutwrap">' + _v3Donut(donutPct, 109, color) + '</div>' +
      '<div class="sy-share-v3-rc-right">' +
        '<div class="sy-share-v3-rc-right-row">' + (c.hasTarget ? _symN(c.h) : '—') + '<small>Hedef</small></div>' +
        _v3KalanFazlaRightRow(c) +
        '<div class="sy-share-v3-rc-fc' + (fBand ? ' b-' + fBand : ' b-off') + '">F ' + _symPct0(c.f) + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="sy-share-v3-rc-div">' +
      '<span class="sy-share-v3-rc-daily">Günlük ' + (gunlukVal != null ? _symN(gunlukVal) : '—') + '</span>' +
      '<span class="sy-share-v3-rc-sep"></span>' +
      '<span class="sy-share-v3-rc-tr">' + _v3Trend(c.dA, 'adet', false) + '</span>' +
      '<span class="sy-share-v3-rc-sep"></span>' +
      '<span class="sy-share-v3-rc-tr">' + _v3Trend(c.dHgo, 'HGO', true) + '</span>' +
    '</div>' +
  '</div>';
}

function renderSYShareV3RegionSummary(regionCols, kalanGun, monthDone, edmMode) {
  var cardsHTML = SYM_PRODS.map(function(p) {
    return renderSYShareV3RegionCard(p, regionCols[p.key], kalanGun, monthDone, edmMode);
  }).join('');
  return '<div class="sy-share-v3-sec">Kuzey Anadolu Bölge Performansı</div>' +
    '<div class="sy-share-v3-region">' + cardsHTML + '</div>';
}

/* ─── ÜRÜN HÜCRESİ — tablo satırındaki 4 üründen biri ────────────────── */
function renderSYShareV3ProductCell(p, c) {
  var color = SYV3_ACCENT[p.key];
  var band  = c.hgo != null ? _symBand(c.hgo) : null;
  var fBand = c.f   != null ? _symBand(c.f)   : null;
  var donutPct = c.hasTarget ? Math.min(c.hgo || 0, 100) : 0;

  return '<div class="sy-share-v3-cell">' +
    '<div class="sy-share-v3-cell-fc' + (fBand ? ' b-' + fBand : ' b-off') + '">F ' + _symPct0(c.f) + '</div>' +
    '<div class="sy-share-v3-cell-donut">' + _v3Donut(donutPct, 51, color) + '</div>' +
    '<div class="sy-share-v3-cell-body">' +
      '<div class="sy-share-v3-cell-hgo' + (band ? ' b-' + band : '') + '">' + _symPct1(c.hgo) + '<small>HGO</small></div>' +
      '<div class="sy-share-v3-cell-akt">' + _symN(c.a) + ' Aktivasyon</div>' +
      '<div class="sy-share-v3-cell-line">' +
        '<span class="kv">Hedef <span class="val">' + (c.hasTarget ? _symN(c.h) : '—') + '</span></span>' +
        _v3KalanFazlaHTML(c) +
      '</div>' +
      '<div class="sy-share-v3-cell-trend">' + _v3Trend(c.dA, 'adet', false) + _v3Trend(c.dHgo, 'HGO', true) + '</div>' +
    '</div>' +
  '</div>';
}

/* ─── ANA TABLO — Sıra+Yönetici (tek kolon) | Mobil | DSL | TV | Cihaz ── */
function renderSYShareV3ManagerRow(row, i) {
  var cellsHTML = SYM_PRODS.map(function(p) {
    return '<div class="sy-share-v3-td">' + renderSYShareV3ProductCell(p, row.cols[p.key]) + '</div>';
  }).join('');

  return '<div class="sy-share-v3-trow">' +
    '<div class="sy-share-v3-td sy-share-v3-td-nm">' +
      '<span class="sy-share-v3-rk">' + (i + 1) + '</span>' +
      '<span class="sy-share-v3-nm">' + row.nm + '</span>' +
    '</div>' +
    cellsHTML +
  '</div>';
}

function renderSYShareV3Table(rows, edmMode) {
  var headCells = SYM_PRODS.map(function(p) {
    return '<div class="sy-share-v3-th"><span class="sy-share-v3-th-dot" style="background:' + SYV3_ACCENT[p.key] + '"></span>' + (edmMode ? p.edmLabel : p.label) + '</div>';
  }).join('');
  var headHTML = '<div class="sy-share-v3-trow sy-share-v3-thead">' +
    '<div class="sy-share-v3-th name"><span style="opacity:.6;margin-right:8px">#</span>Satış Yöneticisi</div>' +
    headCells +
  '</div>';

  var bodyHTML = rows.map(function(r, i) { return renderSYShareV3ManagerRow(r, i); }).join('');

  return '<div class="sy-share-v3-sec">Satış Yöneticileri</div>' +
    '<div class="sy-share-v3-table">' + headHTML + '<div class="sy-share-v3-tbody">' + bodyHTML + '</div></div>';
}

/* ─── ÜRÜN LİDERLERİ — genel lider YOK, kupa ürün rengiyle ───────────── */
function renderSYShareV3Leaders(rows, edmMode) {
  var cardsHTML = SYM_PRODS.map(function(p) {
    var best = null;
    rows.forEach(function(row) {
      var c = row.cols[p.key];
      if (c && c.hgo != null && (!best || c.hgo > best.hgo)) best = { nm: row.nm, hgo: c.hgo };
    });
    var band  = best ? _symBand(best.hgo) : null;
    var color = SYV3_ACCENT[p.key];
    var shape = SYV3_SHAPE[p.key] === 'circle' ? ' circle' : '';
    return '<div class="sy-share-v3-ldr">' +
      '<span class="sy-share-v3-ldr-ic' + shape + '" style="background:' + color + '">' + _v3Icon(p.key) + '</span>' +
      '<div class="sy-share-v3-ldr-body">' +
        '<div class="sy-share-v3-ldr-title">' + (edmMode ? p.edmLabel : p.label) + ' Lideri</div>' +
        (best
          ? '<div class="sy-share-v3-ldr-nm">' + best.nm + '</div><div class="sy-share-v3-ldr-v' + (band ? ' b-' + band : '') + '">' + _symPct1(best.hgo) + ' HGO</div>'
          : '<div class="sy-share-v3-ldr-nm">—</div>') +
      '</div>' +
      '<span class="sy-share-v3-ldr-cup">' + _v3Trophy(color) + '</span>' +
    '</div>';
  }).join('');

  return '<div class="sy-share-v3-sec">Ürün Liderleri (HGO)</div>' +
    '<div class="sy-share-v3-leaders">' + cardsHTML + '</div>';
}

/* ─── LEJANT + FOOTER — mevcut hgoBand() bantlarının özet açıklaması,
   YENİ EŞİK DEĞİL (yalnızca 4 kategori halinde okunur açıklama). ────── */
function renderSYShareV3Legend() {
  return '<div class="sy-share-v3-legend">' +
    '<div class="sy-share-v3-legend-l">' +
      '<span class="sy-share-v3-legend-item"><span style="color:var(--green)">▲</span> Hedef Üzerinde</span>' +
      '<span class="sy-share-v3-legend-item"><span style="color:var(--amber)">—</span> Hedefe Yakın (±%10)</span>' +
      '<span class="sy-share-v3-legend-item"><span style="color:var(--crimson)">▼</span> Hedefin Altında</span>' +
      '<span class="sy-share-v3-legend-item"><span style="color:var(--muted)">—</span> Veri Yok</span>' +
    '</div>' +
    '<div class="sy-share-v3-legend-r">♥ Hedefe Birlikte</div>' +
  '</div>';
}

/* ─── TAM PAYLAŞIM RAPORU — ortak veri modelini (symBuildRows/
   symBuildRegionCols) alfabetik sıraya (tr-TR) dizip tüm bölümleri
   birleştirir. Hesap DEĞİŞMEZ, yalnızca görünüm. ────────────────────── */
function buildSYShareReportV3(onlyNames) {
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
  var cmpTag    = (typeof SYPREV !== 'undefined' && SYPREV) ? ' · Önceki raporla karşılaştırma' : '';
  var donemTxt  = (typeof DONEM !== 'undefined' ? DONEM : '—');

  return '<div class="sy-share-v3">' +
    renderSYShareV3Header(donemTxt, gunTxt, fcTag, cmpTag) +
    renderSYShareV3RegionSummary(regionCols, kalanGun, monthDone, edmMode) +
    renderSYShareV3Table(rows, edmMode) +
    renderSYShareV3Leaders(rows, edmMode) +
    renderSYShareV3Legend() +
  '</div>';
}

/* ─── EXPORT — kendi offscreen kaynak düğümünü kurar (uygulama ekranının
   screenshot'ı DEĞİL), mevcut createCleanExportClone/captureExportImage/
   cleanupExportClone/_openSharePreview altyapısı (export.js, filters.js)
   AYNEN kullanılır. Sabit 1920px genişlik — referansın ölçülen 3:2
   oranına göre yükseklik otomatik oluşur. ────────────────────────────── */
var SY_SHARE_V3_EXPORT_WIDTH = 1920;

async function exportSYShareV3PNG() {
  var btn   = document.getElementById('fbar-dl-btn');
  var valEl = btn ? btn.querySelector('.fbar-chip-val') : null;
  var orig  = valEl ? valEl.textContent : 'Oluştur ↗';
  if (btn)   { btn.disabled = true; }
  if (valEl) { valEl.textContent = '⏳'; }

  var cloneWrapper = null;
  try {
    var onlyNames = (typeof _sy2LastNames !== 'undefined') ? _sy2LastNames : null;
    var html = buildSYShareReportV3(onlyNames);
    if (!html) throw new Error('SY verisi yok');

    var srcEl = document.createElement('div');
    srcEl.innerHTML = html;
    srcEl = srcEl.firstElementChild; /* .sy-share-v3 kökü doğrudan klonlanır */

    var res = await createCleanExportClone(srcEl, SY_SHARE_V3_EXPORT_WIDTH);
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
