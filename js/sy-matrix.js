/* ════════════════════════════════════════════════════════════════════
   js/sy-matrix.js  —  Satış Yöneticisi Performans Matrisi (Sprint 24)
   Mobil, DSL, TV ve Cihaz'ı tek SY kartında birlikte gösteren
   kompakt/paylaşılabilir yönetici raporu.
   Veri kaynağı DEĞİŞMEDİ: SYDATA (SY ÖZET), SYPREV, DATA.bayi/pers
   (bayi ve personel sayımı) — render.js'teki renderSY() aynı kaynakları
   zaten kullanıyordu. Bu dosya yalnızca görsel sunumu/hesap katmanını
   ekliyor; TTM/EDM parse mantığı, HGO/forecast hesapları değişmedi.
   Eski tek-ürün kart görünümü render.js içinde renderSYSingle() olarak
   korunur — "Tek Ürün Görünümü" ikincil seçenek.
   ════════════════════════════════════════════════════════════════════ */

/* ─── TTM ÜRÜN EŞLEŞTİRME — 4 kolon ───────────────────────────────────
   src: SYDATA.sy[nm][...] anahtarı (SY ÖZET sayfasından, parser.js).
   TV kolonu "Tivibu Toplam" kullanır — SY ÖZET'te IPTV+Uydu'nun ayrı
   satırları da var ama Tivibu Toplam zaten konsolide değeri taşıyor,
   bu yüzden IPTV+Uydu ayrıca toplanmıyor (çift sayım olmasın diye). */
var SYM_PRODS = [
  { key: 'mobil', src: 'Mobil Toplam',  label: 'MOBİL', edmLabel: 'MOBİL',   icon: '📱' },
  { key: 'dsl',   src: 'Evde İnternet', label: 'DSL',   edmLabel: 'DSL',     icon: '🌐' },
  { key: 'tv',    src: 'Tivibu Toplam', label: 'TV',    edmLabel: 'TİVİBU',  icon: '📺' },
  { key: 'cihaz', src: 'Cihaz',         label: 'CİHAZ', edmLabel: 'CİHAZ',   icon: '📦' },
];

/* Kart üzerinde HGO rengine göre ince vurgu — merkezi hgoBand() bantlarıyla eşleşir */
var SYM_BAND_COLOR = { gg: '#059669', g: '#0E7A40', y: '#B26B00', o: '#ea8000', r: '#C11421' };

/* ─── GÖRÜNÜM MODU + SIRALAMA STATE ──────────────────────────────── */
var syViewMode = 'matrix';   /* 'matrix' (Tüm Ürünler, varsayılan) | 'single' (Tek Ürün) */
var symSort    = 'genel';    /* genel|mobil|dsl|tv|cihaz|forecast|up|down */

var SYM_SORTS = [
  { key: 'genel',    label: 'Genel Performans' },
  { key: 'mobil',    label: 'Mobil HGO' },
  { key: 'dsl',      label: 'DSL HGO' },
  { key: 'tv',       label: 'TV HGO' },
  { key: 'cihaz',    label: 'Cihaz HGO' },
  { key: 'forecast', label: 'Genel Forecast' },
  { key: 'up',       label: 'En Çok Yükselen' },
  { key: 'down',     label: 'En Çok Gerileyen' },
];

function setSyViewMode(m) {
  syViewMode = m;
  if (typeof buildFilterBar === 'function') buildFilterBar();
  render();
}
function setSymSort(k) { symSort = k; render(); }

/* ─── TEK SY İÇİN HESAP ──────────────────────────────────────────────
   Genel HGO / Genel Forecast: hedef büyüklüğüne göre ağırlıklı —
   düz ürün ortalaması DEĞİL. Σ gerçekleşen / Σ hedef × 100. */
function symBuildRow(nm, bayiCounts, persCounts) {
  var S      = SYDATA;
  var cur    = (S && S.sy && S.sy[nm]) || {};
  var prevSy = (typeof SYPREV !== 'undefined' && SYPREV && SYPREV.sy) ? SYPREV.sy[nm] : null;

  var cols = {}, sumH = 0, sumA = 0, sumFH = 0, sumFHDen = 0, sumDeltaHgo = 0, deltaCount = 0, sumDeltaA = 0;

  SYM_PRODS.forEach(function(p) {
    var rec = cur[p.src] || null;
    var h   = rec ? (rec.h || 0) : 0;
    var a   = rec ? (rec.a || 0) : 0;
    var f   = rec ? rec.f : null;          /* SY ÖZET'ten hazır forecast %'si */
    var hgo = h > 0 ? (a / h * 100) : null;

    var prevRec = prevSy ? prevSy[p.src] : null;
    var prevHgo = (prevRec && prevRec.h > 0) ? (prevRec.a / prevRec.h * 100) : null;
    var dA      = prevRec ? (a - (prevRec.a || 0)) : null;
    var dHgo    = (hgo != null && prevHgo != null) ? Math.round((hgo - prevHgo) * 10) / 10 : null;

    var kalanRaw = h - a;
    var over     = h > 0 && kalanRaw <= 0;

    cols[p.key] = {
      h: h, a: a, hgo: hgo, f: f,
      hasTarget: h > 0,
      kalan: (h > 0 && !over) ? kalanRaw : 0,
      fazla: over ? Math.abs(kalanRaw) : 0,
      over: over,
      dA: dA, dHgo: dHgo,
    };

    if (h > 0) {
      sumH += h; sumA += a;
      var fUse = (f != null) ? f : (hgo != null ? hgo : 0);
      sumFH += fUse * h; sumFHDen += h;
    }
    if (dHgo != null) { sumDeltaHgo += dHgo; deltaCount++; }
    if (dA   != null) { sumDeltaA   += dA; }
  });

  return {
    nm: nm, cols: cols,
    genelHGO:      sumH > 0 ? (sumA / sumH * 100) : null,
    genelForecast: sumFHDen > 0 ? (sumFH / sumFHDen) : null,
    bayiCount: bayiCounts[nm] || 0,
    persCount: persCounts[nm] || 0,
    sumA: sumA,
    avgDeltaHgo: deltaCount ? (sumDeltaHgo / deltaCount) : null,
    sumDeltaA: sumDeltaA,
    hasPrev: !!prevSy,
  };
}

function symBuildRows(names) {
  var bayiCounts = {}, persCounts = {};
  (DATA.bayi['Toplam Mobil'] || []).forEach(function(r) { if (r.sy) bayiCounts[r.sy] = (bayiCounts[r.sy] || 0) + 1; });
  (DATA.pers['Toplam Mobil'] || []).forEach(function(r) { if (r.sy) persCounts[r.sy] = (persCounts[r.sy] || 0) + 1; });
  return names.map(function(nm) { return symBuildRow(nm, bayiCounts, persCounts); });
}

function symSortRows(rows, key) {
  function v(r) {
    if (key === 'mobil' || key === 'dsl' || key === 'tv' || key === 'cihaz') {
      var c = r.cols[key];
      return (c && c.hgo != null) ? c.hgo : -Infinity;
    }
    if (key === 'forecast') return r.genelForecast != null ? r.genelForecast : -Infinity;
    if (key === 'up')       return r.avgDeltaHgo    != null ? r.avgDeltaHgo    : -Infinity;
    if (key === 'down')     return r.avgDeltaHgo    != null ? -r.avgDeltaHgo   : -Infinity;
    return r.genelHGO != null ? r.genelHGO : -Infinity;
  }
  return rows.slice().sort(function(a, b) {
    var d = v(b) - v(a);
    if (d) return d;
    /* Eşitlik: 1) Genel Forecast  2) Toplam aktivasyon  3) önceki rapora göre HGO artışı */
    var fd = (b.genelForecast || 0) - (a.genelForecast || 0); if (fd) return fd;
    var ad = (b.sumA || 0) - (a.sumA || 0); if (ad) return ad;
    return (b.avgDeltaHgo || 0) - (a.avgDeltaHgo || 0);
  });
}

/* ─── BİÇİMLENDİRME YARDIMCILARI ──────────────────────────────────── */
function _symN(n)     { return Math.round(n || 0).toLocaleString('tr-TR'); }
function _symPct1(v)  { return v == null ? '—' : ('%' + v.toFixed(1).replace('.', ',')); }
function _symPct0(v)  { return v == null ? '—' : ('%' + Math.round(v)); }
function _symBand(v)  { return (typeof hgoBand === 'function') ? (hgoBand(v) || 'r') : 'r'; }

/* ─── ÜRÜN HÜCRESİ ─────────────────────────────────────────────────── */
function _symCellHTML(p, c, kalanGun, monthDone, edmMode) {
  var band  = c.hgo != null ? _symBand(c.hgo) : null;
  var fBand = c.f   != null ? _symBand(c.f)   : null;

  var tgtLine = '<div class="sym-c-tgt">Hedef ' + (c.hasTarget ? _symN(c.h) : '—') + '</div>';

  var secondary;
  if (!c.hasTarget) {
    secondary = '<div class="sym-c-sub">Kalan —</div><div class="sym-c-sub2">Günlük —</div>';
  } else {
    var mainLine = c.over
      ? ('<span class="sym-c-plus">+' + _symN(c.fazla) + '</span> Fazla')
      : ('Kalan ' + _symN(c.kalan));
    var gunlukVal = (!monthDone && kalanGun && kalanGun > 0 && !c.over && c.kalan > 0)
      ? Math.ceil(c.kalan / kalanGun) : null;
    secondary = '<div class="sym-c-sub">' + mainLine + '</div>' +
      '<div class="sym-c-sub2">Günlük ' + (gunlukVal != null ? _symN(gunlukVal) : '—') + '</div>';
  }

  var trendHTML = '';
  if (c.dA !== undefined && c.dA !== null || c.dHgo !== undefined && c.dHgo !== null) {
    var trendA = (c.dA == null || c.dA === 0) ? '<span class="sym-tr eq">—</span>'
      : c.dA > 0 ? '<span class="sym-tr up">▲ +' + _symN(c.dA) + ' adet</span>'
      : '<span class="sym-tr dn">▼ ' + _symN(c.dA) + ' adet</span>';
    var trendH = (c.dHgo == null || c.dHgo === 0) ? '<span class="sym-tr eq">—</span>'
      : c.dHgo > 0 ? '<span class="sym-tr up">▲ +' + c.dHgo.toFixed(1).replace('.', ',') + ' HGO</span>'
      : '<span class="sym-tr dn">▼ ' + c.dHgo.toFixed(1).replace('.', ',') + ' HGO</span>';
    trendHTML = '<div class="sym-c-trend">' + trendA + trendH + '</div>';
  }

  return '<div class="sym-cell">' +
    '<div class="sym-c-hdr"><span class="sym-c-ic">' + p.icon + '</span><span class="sym-c-lbl">' + (edmMode ? p.edmLabel : p.label) + '</span></div>' +
    '<div class="sym-c-hgo' + (band ? ' b-' + band : '') + '">' + _symPct1(c.hgo) + '</div>' +
    '<div class="sym-c-row2">' +
      '<span class="sym-c-fc' + (fBand ? ' b-' + fBand : ' b-off') + '">F ' + _symPct0(c.f) + '</span>' +
      '<span class="sym-c-akt">' + _symN(c.a) + ' Aktv</span>' +
    '</div>' +
    tgtLine +
    secondary +
    trendHTML +
  '</div>';
}

/* ─── SY KARTI ─────────────────────────────────────────────────────── */
function _symMedal(i) {
  return i === 0 ? '<span class="badge b1">1</span>'
       : i === 1 ? '<span class="badge b2">2</span>'
       : i === 2 ? '<span class="badge b3">3</span>'
       : '<span class="n">' + (i + 1) + '</span>';
}

function _symManagerCardHTML(row, i, kalanGun, monthDone, edmMode) {
  var hgoBnd = row.genelHGO      != null ? _symBand(row.genelHGO)      : null;
  var fcBnd  = row.genelForecast != null ? _symBand(row.genelForecast) : null;
  var accent = SYM_BAND_COLOR[hgoBnd] || '#AEBAD0';

  var cellsHTML = SYM_PRODS.map(function(p) {
    return _symCellHTML(p, row.cols[p.key], kalanGun, monthDone, edmMode);
  }).join('');

  return '<div class="sym-card" style="border-left:4px solid ' + accent + '">' +
    '<div class="sym-card-top">' +
      '<div class="sym-rk">' + _symMedal(i) + '</div>' +
      '<div class="sym-id">' +
        '<div class="sym-nm">' + row.nm + '</div>' +
        '<div class="sym-meta">' + row.bayiCount + ' bayi · ' + row.persCount + ' personel</div>' +
      '</div>' +
      '<div class="sym-gen">' +
        '<div class="sym-gen-hgo' + (hgoBnd ? ' b-' + hgoBnd : '') + '">' + _symPct1(row.genelHGO) + '</div>' +
        '<div class="sym-gen-lbl">Genel HGO</div>' +
        (row.genelForecast != null
          ? '<div class="sym-gen-fc' + (fcBnd ? ' b-' + fcBnd : '') + '">' + (monthDone ? 'Sonuç ' : 'F ') + _symPct0(row.genelForecast) + '</div>'
          : '') +
      '</div>' +
    '</div>' +
    '<div class="sym-grid">' + cellsHTML + '</div>' +
  '</div>';
}

/* ─── SAYFA RENDER ─────────────────────────────────────────────────── */
function renderSYMatrixView(onlyNames) {
  var S     = (typeof SYDATA !== 'undefined') ? SYDATA : null;
  var cards = document.getElementById('cards');
  cards.className = 'cards single';

  if (!S || !S.sy || !Object.keys(S.sy).length) {
    cards.style.maxWidth = '440px';
    cards.innerHTML =
      '<div class="card" id="sy-card">' +
      hdrHTML('👔', 'Satış Yöneticisi Performans Matrisi', 'SY verisi yüklenmedi') +
      '<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px">SY ÖZET verisi bulunamadı — Excel raporu yükleyin.</div>' +
      '</div>';
    return;
  }

  var edmMode = typeof KANAL !== 'undefined' && KANAL === 'EDM';
  var names   = (onlyNames && onlyNames.length) ? onlyNames : Object.keys(S.sy);

  var rows = symBuildRows(names);
  rows = symSortRows(rows, symSort);

  var gi        = (typeof gunInfo === 'function') ? gunInfo() : { ayGun: 0, gecenGun: 0, kalanGun: null };
  var kalanGun  = gi.kalanGun;
  var monthDone = gi.ayGun > 0 && gi.gecenGun > 0 && gi.ayGun <= gi.gecenGun;
  var gunTxt    = (gi.ayGun && gi.gecenGun) ? gi.gecenGun + '/' + gi.ayGun + '. gün' : '';

  var sortLabel = (SYM_SORTS.filter(function(s) { return s.key === symSort; })[0] || {}).label || 'Genel Performans';
  var cmpTag    = (typeof SYPREV !== 'undefined' && SYPREV) ? ' · önceki raporla karşılaştırma' : '';

  var cardsHTML = rows.map(function(r, i) { return _symManagerCardHTML(r, i, kalanGun, monthDone, edmMode); }).join('');

  var best     = rows[0] || null;
  var bestNm   = best ? best.nm.split(' ')[0] : '—';
  var bestHgo  = best && best.genelHGO != null ? _symPct0(best.genelHGO) : '—';

  cards.style.maxWidth = '980px';
  cards.innerHTML =
    '<div class="card sym-page" id="sy-card">' +
    hdrHTML('👔', 'Satış Yöneticisi Performans Matrisi',
      'Mobil · DSL · TV · Cihaz birlikte' + (gunTxt ? ' · ' + gunTxt : '') + ' · Sıralama: ' + sortLabel +
      (monthDone ? ' · Ay Sonu Sonucu' : '') + cmpTag) +
    '<div class="sec t"><span>👔 Yöneticiler</span><span class="cnt">' + rows.length + ' SY</span></div>' +
    '<div class="sym-list">' + cardsHTML + '</div>' +
    ftrHTML([[rows.length, 'Yönetici'], [bestHgo, 'En Yüksek HGO'], [bestNm, 'Lider']]) +
    '</div>';
}
