/* ════════════════════════════════════════════════════════════════════
   js/sy-report-v3.js — Satış Yöneticisi MOBİL ANA EKRAN v3 (Sprint 27)

   Referans (Sprint 27.2 — güncel): design-references/
   sy-dashboard-reference.png — 2×2 KPI kart grid (Sprint 27.3: 4'lü tek
   satırda HGO/ürün adı kırpılıyordu, 2x2'ye dönüldü), tinted ürün
   pilleri (başlıksız), "Yöneticiler" başlığı ve bayi/personel meta
   satırı kaldırıldı, liste kolonları SY/Hedef/Aktv./HGO/Forecast/Kalan/
   D. Adet, kanal şeridi (TTM/EDM) VE görünüm seçici tamamen gizli —
   ekranın tek bir görünümü var (js/filters.js).
   Önceki referanslar (Sprint 27 → 27.2): sy-mobile-target.png,
   sy-managers-mobile-reference-v1.png (aynı dosya, kart düzeni
   iterasyonları).
   Bu dosya js/sy-report-v2.js'teki HESAPLAMA/STATE katmanını
   (_sy2PrepareState, sy2SortProd/sy2SortMetric, setSy2SortProd/
   setSy2SortMetric, SYM_PRODS, SY2_ACCENT, _symN/_symPct1/_symPct0/
   _symBand, ayrıca render.js'teki hgoBand/gunInfo) DEĞİŞTİRMEDEN
   yeniden kullanır — hesap iki kez yazılmadı. Yalnızca GÖRÜNÜM katmanı
   sıfırdan, .sy3-* sınıflarıyla (css/sy-report-v3.css) yazıldı.

   js/sy-report-v2.js (.sy2-*) SİLİNMEDİ — rollback için korunuyor.
   PNG export (js/sy-share-v3.js, .sy-share-v3-*) bu dosyadan tamamen
   bağımsızdır, hiç etkilenmez.
   ════════════════════════════════════════════════════════════════════ */

/* ─── İKONLAR ─────────────────────────────────────────────────────────── */
var SY3_ICONS = {
  mobil: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><line x1="10.5" y1="18.5" x2="13.5" y2="18.5"/></svg>',
  dsl:   '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><line x1="2.5" y1="12" x2="21.5" y2="12"/><path d="M12 2.5c2.6 2.6 4 6 4 9.5s-1.4 6.9-4 9.5"/><path d="M12 2.5c-2.6 2.6-4 6-4 9.5s1.4 6.9 4 9.5"/></svg>',
  tv:    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17.5" x2="12" y2="21"/></svg>',
  cihaz: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5 21 7.5v9L12 21.5 3 16.5v-9z"/><path d="M3 7.5 12 12.5 21 7.5"/><line x1="12" y1="12.5" x2="12" y2="21.5"/></svg>',
};
var SY3_ICONS_INK = {
  mobil: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><line x1="10.5" y1="18.5" x2="13.5" y2="18.5"/></svg>',
  dsl:   '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><line x1="2.5" y1="12" x2="21.5" y2="12"/><path d="M12 2.5c2.6 2.6 4 6 4 9.5s-1.4 6.9-4 9.5"/><path d="M12 2.5c-2.6 2.6-4 6-4 9.5s1.4 6.9 4 9.5"/></svg>',
  tv:    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17.5" x2="12" y2="21"/></svg>',
  cihaz: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5 21 7.5v9L12 21.5 3 16.5v-9z"/><path d="M3 7.5 12 12.5 21 7.5"/><line x1="12" y1="12.5" x2="12" y2="21.5"/></svg>',
};
var SY3_CAL_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2.5"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
var SY3_CHEV_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>';
var SY3_CHEVDOWN_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
var SY3_INFO_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="7.8" r="0.5" fill="currentColor" stroke="none"/></svg>';

/* ─── MİNİ DONUT — sy-report-v2.js'teki _sy2Donut ile aynı çizim, kasıtlı
   tekrar (dosya bağımsızlığı için). ──────────────────────────────────── */
function _sy3Donut(pct, size, colorHex) {
  var sw  = Math.max(4, Math.round(size * 0.16));
  var r   = (size - sw) / 2;
  var c   = 2 * Math.PI * r;
  var p   = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  var off = c * (1 - p / 100);
  var mid = size / 2;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" class="sy3-donut" aria-hidden="true">' +
    '<circle cx="' + mid + '" cy="' + mid + '" r="' + r + '" fill="none" stroke="#E7EBF3" stroke-width="' + sw + '"/>' +
    (p > 0
      ? '<circle cx="' + mid + '" cy="' + mid + '" r="' + r + '" fill="none" stroke="' + colorHex + '" stroke-width="' + sw +
        '" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" stroke-linecap="round" transform="rotate(-90 ' + mid + ' ' + mid + ')"/>'
      : '') +
  '</svg>';
}

function _sy3Trend(delta, suffix, isHgo) {
  if (delta == null || delta === 0) return '<span class="tr eq">— ' + (suffix || '') + '</span>';
  var txt = isHgo ? delta.toFixed(1).replace('.', ',') : _symN(delta);
  return delta > 0
    ? '<span class="tr up">▲ +' + txt + (suffix ? ' ' + suffix : '') + '</span>'
    : '<span class="tr dn">▼ ' + txt + (suffix ? ' ' + suffix : '') + '</span>';
}

/* ─── BİRLEŞİK KURUMSAL BAŞLIK (Sprint 27.1: design-references/
   sy-managers-mobile-reference-v1.png) — açık/beyaz zemin, logo kartı,
   dönem kutusu + altında rapor tarihi. TTM/EDM burada YOK (referansta
   yok); genel .channel-strip bu sayfada tekrar görünür kalır (bkz.
   js/app.js:syncSYChrome() — yalnızca .topbar/.page-hdr gizlenir). ──── */
function renderSY3Header(donemTxt) {
  var dateStr = new Date().toLocaleDateString('tr-TR');
  return '<div class="sy3-header">' +
    '<div class="sy3-hdr-top">' +
      '<div class="sy3-logo-card"><img class="sy3-logo" src="icons/icon-180.png" alt="TT"></div>' +
      '<div class="sy3-hdr-brand">' +
        '<div class="sy3-hdr-brand-t">Kuzey Anadolu Bölge</div>' +
        '<div class="sy3-hdr-brand-s">Satış Yöneticisi Performans</div>' +
      '</div>' +
      '<div class="sy3-hdr-donem">' +
        '<span class="sy3-hdr-donem-ic">' + SY3_CAL_ICON + '</span>' +
        '<span class="sy3-hdr-donem-v">' + (donemTxt || '—') + '</span>' +
        '<span class="sy3-hdr-donem-chev">' + SY3_CHEVDOWN_ICON + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="sy3-hdr-date">Rapor Tarihi: ' + dateStr + '</div>' +
  '</div>';
}

/* ─── KUZEY ANADOLU BÖLGE — 4'lü TEK SATIR KPI KART GRID (Sprint 27.2:
   design-references/sy-dashboard-reference.png) ──────────────────────
   Referansta trio (Hedef/Fazla-Kalan/Mevcut HGO) değerleri DÜZ (renksiz/
   rozetsiz) — önceki sürümdeki yeşil "Mevcut HGO" rozeti kaldırıldı,
   yalnızca metin. Değerler (c.h/c.kalan/c.fazla/c.f) DEĞİŞMEDİ, sadece
   gösterim sadeleşti. HGO değeri hâlâ ürün rengiyle boyalı, donut aynen
   korunuyor. Günlük artık kendi satırında, trend'ler onun altında. */
function renderSY3Card(p, c, kalanGun, monthDone, edmMode) {
  var color = SY2_ACCENT[p.key];
  var donutPct = c.hasTarget ? Math.min(c.hgo || 0, 100) : 0;

  var gunlukVal = (c.hasTarget && !monthDone && kalanGun && kalanGun > 0 && !c.over && c.kalan > 0)
    ? Math.ceil(c.kalan / kalanGun) : null;

  return '<div class="sy3-card">' +
    '<div class="sy3-card-top">' +
      '<span class="sy3-card-ic" style="background:' + color + '">' + SY3_ICONS[p.key] + '</span>' +
      '<span class="sy3-card-name">' + (edmMode ? p.edmLabel : p.label) + '</span>' +
    '</div>' +
    '<div class="sy3-card-hgorow">' +
      '<div class="sy3-card-hgowrap">' +
        '<div class="sy3-card-hgo" style="color:' + color + '">' + _symPct0(c.hgo) + '</div>' +
        '<div class="sy3-card-hgolbl">HGO</div>' +
      '</div>' +
      '<div class="sy3-card-donut">' + _sy3Donut(donutPct, 46, color) + '</div>' +
    '</div>' +
    '<div class="sy3-card-akt">' + _symN(c.a) + ' Aktv.</div>' +
    '<div class="sy3-card-hr"></div>' +
    '<div class="sy3-card-trio">' +
      '<div class="sy3-card-trioitem"><div class="v">' + (c.hasTarget ? _symN(c.h) : '—') + '</div><div class="l">Hedef</div></div>' +
      '<div class="sy3-card-trioitem"><div class="v">' +
        (c.hasTarget ? (c.over ? '+' + _symN(c.fazla) : _symN(c.kalan)) : '—') +
      '</div><div class="l">' + (c.over ? 'Fazla' : 'Kalan') + '</div></div>' +
      '<div class="sy3-card-trioitem"><div class="v">' + _symPct0(c.f) + '</div><div class="l">Mevcut HGO</div></div>' +
    '</div>' +
    '<div class="sy3-card-hr"></div>' +
    '<div class="sy3-card-daily-lbl">Günlük</div>' +
    '<div class="sy3-card-trendrow">' +
      _sy3Trend(c.dA, 'adet', false) +
      _sy3Trend(c.dHgo, 'HGO', true) +
    '</div>' +
  '</div>';
}

function renderSY3KpiGrid(regionCols, kalanGun, monthDone, edmMode) {
  var cardsHTML = SYM_PRODS.map(function(p) {
    return renderSY3Card(p, regionCols[p.key], kalanGun, monthDone, edmMode);
  }).join('');
  return '<div class="sy3-kpi">' + cardsHTML + '</div>';
}

/* ─── FİLTRELER — yalnızca ÜRÜN pilleri (Sprint 27.2: design-references/
   sy-dashboard-reference.png). "Ürün" başlığı VE alt bilgi satırı
   ("Mobil · HGO — Yüksekten Düşüğe") kaldırıldı — yalnızca pil satırı
   kalıyor. Aktif pil artık dolu değil, ürün rengiyle TİNTED (açık tonlu
   zemin + renkli border + renkli ikon/metin). Sıralama HER ZAMAN HGO'ya
   göre (sabit; sy2SortMetric 'hgo', seçim UI'ı Sprint 27.1'de kaldırıldı).
   Yönetici listesi seçilen ürüne göre değişmeye DEVAM eder (sy2SortProd,
   mevcut mekanizma, değişmedi). ──────────────────────────────────────── */
function renderSY3Filters(prodObj, edmMode) {
  var prodBtns = SYM_PRODS.map(function(p) {
    var on = p.key === sy2SortProd;
    var color = SY2_ACCENT[p.key];
    var style = on ? ' style="background:' + color + '14;border-color:' + color + ';color:' + color + '"' : '';
    var icon = '<span class="ic" style="color:' + (on ? color : color) + '">' + SY3_ICONS_INK[p.key] + '</span>';
    return '<button class="sy3-pill' + (on ? ' on-prod' : '') + '"' + style + ' onclick="setSy2SortProd(\'' + p.key + '\')">' +
      icon + (edmMode ? p.edmLabel : p.label) + '</button>';
  }).join('');

  return '<div class="sy3-filters"><div class="sy3-pillrow">' + prodBtns + '</div></div>';
}

/* ─── YÖNETİCİLER LİSTESİ (Sprint 27.2: design-references/
   sy-dashboard-reference.png) — kolonlar TAM OLARAK referanstaki sırada:
   SY | Hedef | Aktv. | HGO | Forecast | Kalan | D. Adet.
   - Hedef  = c.h (düz)
   - Aktv.  = c.a (düz)
   - HGO    = c.hgo (mevcut hgoBand renk eşiği, YENİ EŞİK YOK)
   - Forecast = c.f (mevcut hgoBand renk eşiği — aynı fonksiyon, iki kez
     yazılmadı)
   - Kalan  = işaretli tek değer: hedef üstündeyse '+fazla' yeşil, altındaysa
     '-kalan' kırmızı (c.kalan/c.fazla/c.over DEĞİŞMEDİ, yalnızca gösterim)
   - D. Adet = c.dA (önceki rapora göre adet trendi, mevcut alan)
   "Yöneticiler" başlığı VE bayi/personel meta satırı KALDIRILDI. ──────── */
function renderSY3ManagerRow(row, i, sortProdKey) {
  var c = row.cols[sortProdKey] || {};
  var band  = c.hgo != null ? _symBand(c.hgo) : null;
  var fBand = c.f   != null ? _symBand(c.f)   : null;
  var warnHTML = row.matchWarn ? ' <span class="warn">⚠</span>' : '';
  var kalanCls = c.hasTarget ? (c.over ? ' up' : ' dn') : '';
  var kalanTxt = c.hasTarget ? (c.over ? '+' + _symN(c.fazla) : '-' + _symN(c.kalan)) : '—';
  var dAcls = c.dA > 0 ? ' up' : c.dA < 0 ? ' dn' : '';
  var dAtxt = c.dA == null ? '—' : (c.dA > 0 ? '+' : '') + _symN(c.dA);

  return '<div class="sy3-row">' +
    '<span class="sy3-rk">' + (i + 1) + '</span>' +
    '<div class="sy3-nmwrap">' +
      '<div class="sy3-nm">' + row.nm + warnHTML + '</div>' +
    '</div>' +
    '<div class="sy3-metrics">' +
      '<div class="sy3-metric"><div class="v">' + (c.hasTarget ? _symN(c.h) : '—') + '</div></div>' +
      '<div class="sy3-metric"><div class="v">' + _symN(c.a) + '</div></div>' +
      '<div class="sy3-metric"><div class="v' + (band ? ' b-' + band : '') + '">' + _symPct0(c.hgo) + '</div></div>' +
      '<div class="sy3-metric"><div class="v' + (fBand ? ' b-' + fBand : '') + '">' + _symPct0(c.f) + '</div></div>' +
      '<div class="sy3-metric"><div class="v' + kalanCls + '">' + kalanTxt + '</div></div>' +
      '<div class="sy3-metric"><div class="v' + dAcls + '">' + dAtxt + '</div></div>' +
    '</div>' +
    '<span class="sy3-chev">' + SY3_CHEV_ICON + '</span>' +
  '</div>';
}

function renderSY3ListHead() {
  return '<div class="sy3-listhead">' +
      '<span class="sy3-listhead-rk"></span>' +
      '<span class="sy3-listhead-nm">SY</span>' +
      '<div class="sy3-metrics">' +
        '<span class="sy3-metric">Hedef</span>' +
        '<span class="sy3-metric">Aktv.</span>' +
        '<span class="sy3-metric">HGO</span>' +
        '<span class="sy3-metric">Forecast</span>' +
        '<span class="sy3-metric">Kalan</span>' +
        '<span class="sy3-metric">D. Adet</span>' +
      '</div>' +
      '<span class="sy3-listhead-chev"></span>' +
    '</div>';
}

function renderSY3ManagerList(rows, sortProdKey) {
  var rowsHTML = rows.map(function(r, i) { return renderSY3ManagerRow(r, i, sortProdKey); }).join('');
  return renderSY3ListHead() + '<div class="sy3-list">' + rowsHTML + '</div>';
}

/* ─── HGO AÇIKLAMA KUTUSU (Sprint 27.1) ──────────────────────────────── */
function renderSY3InfoBox() {
  return '<div class="sy3-infobox">' + SY3_INFO_ICON + '<span>HGO: Hedef Gerçekleşme Oranı</span></div>';
}

/* ─── TAM İÇERİK — ortak state hazırlığı sy-report-v2.js:_sy2PrepareState
   ile AYNEN paylaşılır (hesap iki kez yazılmaz). Ürün Liderleri bölümü
   bu ekranda YOK (referansta yok — kasıtlı). ─────────────────────────── */
function _sy3BuildInnerHTML(state) {
  return renderSY3Header(state.donemTxt) +
    renderSY3KpiGrid(state.regionCols, state.kalanGun, state.monthDone, state.edmMode) +
    renderSY3Filters(state.prodObj, state.edmMode) +
    renderSY3ManagerList(state.rows, state.sortProdKey) +
    renderSY3InfoBox();
}

function renderSYReportV3(onlyNames) {
  _sy2LastNames = onlyNames || null;

  var cards = document.getElementById('cards');
  cards.className = 'cards single';

  var state = (typeof _sy2PrepareState === 'function') ? _sy2PrepareState(onlyNames) : null;
  if (!state) {
    cards.style.maxWidth = '440px';
    cards.innerHTML =
      '<div class="card" id="sy-card">' +
      hdrHTML('👔', 'Satış Yöneticisi Performans', 'SY verisi yüklenmedi') +
      '<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px">SY ÖZET verisi bulunamadı — Excel raporu yükleyin.</div>' +
      '</div>';
    return;
  }

  cards.style.maxWidth = '480px';
  cards.innerHTML = '<div class="sy3-page" id="sy-card">' + _sy3BuildInnerHTML(state) + '</div>';
}
