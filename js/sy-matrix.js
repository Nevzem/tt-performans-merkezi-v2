/* ════════════════════════════════════════════════════════════════════
   js/sy-matrix.js  —  Satış Yöneticisi Ürün Performans Raporu (Sprint 24.1)
   Ürün bazlı performans yönetimi: Mobil/DSL/TV/Cihaz HER ZAMAN ayrı ayrı
   izlenir. Bu ekranda "Genel HGO / Genel Forecast / Toplam Aktivasyon /
   Genel Performans" gibi ürünlerin toplamından üretilen birleşik
   metrikler YOKTUR — kasıtlı olarak kaldırıldı (bkz. Sprint 24.1 speci).
   Veri kaynağı DEĞİŞMEDİ: SYDATA (SY ÖZET), SYPREV, DATA.bayi/pers.
   Eski tek-ürün kart görünümü render.js içinde renderSYSingle() olarak
   korunur — "Tek Ürün Görünümü" ikincil seçenek (Görünüm filtresi).
   ════════════════════════════════════════════════════════════════════ */

/* ─── TTM ÜRÜN EŞLEŞTİRME — 4 kolon ───────────────────────────────────
   src: SYDATA.sy[nm][...] anahtarı (SY ÖZET sayfasından, parser.js).
   TV kolonu "Tivibu Toplam" kullanır — SY ÖZET'te IPTV+Uydu'nun ayrı
   satırları da var ama Tivibu Toplam zaten konsolide değeri taşıyor,
   bu yüzden IPTV+Uydu ayrıca toplanmıyor (çift sayım olmasın diye).
   EDM aynı SYDATA.sy kaynağını kullanır (renderEDMSY → renderSY(found));
   ürün taksonomisi TTM/EDM için ortaktır, ayrıca zorlama yok. */
var SYM_PRODS = [
  { key: 'mobil', src: 'Mobil Toplam',  label: 'MOBİL', edmLabel: 'MOBİL',   icon: '📱' },
  { key: 'dsl',   src: 'Evde İnternet', label: 'DSL',   edmLabel: 'DSL',     icon: '🌐' },
  { key: 'tv',    src: 'Tivibu Toplam', label: 'TV',    edmLabel: 'TİVİBU',  icon: '📺' },
  { key: 'cihaz', src: 'Cihaz',         label: 'CİHAZ', edmLabel: 'CİHAZ',   icon: '📦' },
];

/* Kart üzerinde HGO rengine göre ince vurgu — merkezi hgoBand() bantlarıyla eşleşir */
var SYM_BAND_COLOR = { gg: '#059669', g: '#0E7A40', y: '#B26B00', o: '#ea8000', r: '#C11421' };

/* ─── GÖRÜNÜM MODU + ÜRÜN BAZLI SIRALAMA STATE ──────────────────────
   Sprint 24.1: tek bir "genel performans" sıralaması YOK. Sıralama
   HER ZAMAN bir ürüne (symSortProd) ve bir ölçüte (symSortMetric)
   bağlıdır — varsayılan Mobil / HGO. */
var syViewMode     = 'matrix';   /* 'matrix' (Ürün Performansı, varsayılan) | 'single' (Tek Ürün) */
var symSortProd    = 'mobil';    /* mobil|dsl|tv|cihaz */
var symSortMetric  = 'hgo';      /* hgo|forecast|aktivasyon|deltaA|deltaHgo */

var SYM_SORT_METRICS = [
  { key: 'hgo',        label: 'HGO' },
  { key: 'forecast',   label: 'Forecast' },
  { key: 'aktivasyon', label: 'Aktivasyon' },
  { key: 'deltaA',     label: 'Önceki Rapora Göre Adet Artışı' },
  { key: 'deltaHgo',   label: 'Önceki Rapora Göre HGO Artışı' },
];

function setSyViewMode(m) {
  syViewMode = m;
  if (typeof buildFilterBar === 'function') buildFilterBar();
  render();
}
function setSymSortProd(k)   { symSortProd = k;   if (typeof buildFilterBar === 'function') buildFilterBar(); render(); }
function setSymSortMetric(k) { symSortMetric = k; if (typeof buildFilterBar === 'function') buildFilterBar(); render(); }

/* ─── AD NORMALİZASYONU — Sprint 24.1 madde 11 ────────────────────────
   SY ÖZET (SYDATA.sy anahtarları) ile Bayi/Personel detay sayfalarındaki
   "sy" alanı arasında Türkçe karakter/büyük-küçük harf/boşluk farkı
   yüzünden sessizce 0 bayi/0 personel görünmesin diye normalize edilip
   eşleştirilir. */
function _symNormName(s) {
  return (s || '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('tr-TR');
}

/* ─── TEK SY İÇİN ÜRÜN BAZLI HESAP — genel/birleşik alan YOK ────────── */
function symBuildRow(nm, bayiCount, persCount) {
  var S      = SYDATA;
  var cur    = (S && S.sy && S.sy[nm]) || {};
  var prevSy = (typeof SYPREV !== 'undefined' && SYPREV && SYPREV.sy) ? SYPREV.sy[nm] : null;

  var cols = {};

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
  });

  return { nm: nm, cols: cols, bayiCount: bayiCount, persCount: persCount };
}

function symBuildRows(names) {
  var bayiCounts = {}, persCounts = {};
  (DATA.bayi['Toplam Mobil'] || []).forEach(function(r) {
    if (r.sy) { var k = _symNormName(r.sy); bayiCounts[k] = (bayiCounts[k] || 0) + 1; }
  });
  (DATA.pers['Toplam Mobil'] || []).forEach(function(r) {
    if (r.sy) { var k = _symNormName(r.sy); persCounts[k] = (persCounts[k] || 0) + 1; }
  });

  var syRec = (SYDATA && SYDATA.sy) || {};

  return names.map(function(nm) {
    var k   = _symNormName(nm);
    var bC  = bayiCounts[k] || 0;
    var pC  = persCounts[k] || 0;
    var row = symBuildRow(nm, bC, pC);

    /* Gerçekten hedefi/aktivasyonu olan ama eşleşen bayi/personeli hiç
       bulunmayan yönetici şüphelidir — sessizce 0 göstermek yerine
       console uyarısı + görünür etiket. */
    var mgrProds     = syRec[nm] || {};
    var hasActivity  = SYM_PRODS.some(function(p) {
      var rec = mgrProds[p.src];
      return rec && ((rec.h || 0) > 0 || (rec.a || 0) > 0);
    });
    if (hasActivity && bC === 0 && pC === 0) {
      console.warn('[SY Ürün Performans Raporu] "' + nm + '" için bayi/personel eşleşmesi bulunamadı ' +
        '(normalize ad: "' + k + '"). DATA.bayi/DATA.pers içindeki "sy" alanlarını kontrol edin.');
      row.matchWarn = true;
    }
    return row;
  });
}

/* ─── KUZEY ANADOLU BÖLGE — ürün bazlı toplam (SY'ler arası TOPLAM,
   ürünler arası TOPLAM DEĞİL) ───────────────────────────────────────
   Her ürün için: Hedef/Aktivasyon = tüm SY'lerin toplamı; Forecast =
   Hedef-ağırlıklı ortalama (managerlar arası — symBuildRow'daki tek-SY
   ürünler-arası ağırlıklı ortalamayla AYNI teknik, burada tek bir ürün
   için managerlar arası uygulanıyor). onlyNames (EDM alt kümesi)
   BURADA KULLANILMAZ — bölge toplamı her zaman TÜM SYDATA.sy'dir. */
function symBuildRegionCols(allNames) {
  var cur    = (SYDATA && SYDATA.sy) || {};
  var prevSy = (typeof SYPREV !== 'undefined' && SYPREV && SYPREV.sy) ? SYPREV.sy : null;
  var cols   = {};

  SYM_PRODS.forEach(function(p) {
    var h = 0, a = 0, fH = 0, fHDen = 0, ph = 0, pa = 0, hasPrevAny = false;

    allNames.forEach(function(nm) {
      var rec = cur[nm] && cur[nm][p.src];
      if (rec) {
        h += rec.h || 0; a += rec.a || 0;
        if ((rec.h || 0) > 0) {
          var hgoNm = (rec.a || 0) / rec.h * 100;
          var fUse  = (rec.f != null) ? rec.f : hgoNm;
          fH += fUse * rec.h; fHDen += rec.h;
        }
      }
      if (prevSy) {
        var prevRec = prevSy[nm] && prevSy[nm][p.src];
        if (prevRec) { ph += prevRec.h || 0; pa += prevRec.a || 0; hasPrevAny = true; }
      }
    });

    var hgo     = h > 0 ? (a / h * 100) : null;
    var f       = fHDen > 0 ? (fH / fHDen) : null;
    var prevHgo = (hasPrevAny && ph > 0) ? (pa / ph * 100) : null;
    var dA      = hasPrevAny ? (a - pa) : null;
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
  });

  return cols;
}

/* ─── ÜRÜN BAZLI SIRALAMA — tek bir "genel performans" sıralaması YOK.
   Her zaman: seçili ürün (prodKey) + seçili ölçüt (metricKey). ────── */
function symSortRows(rows, prodKey, metricKey) {
  function v(r) {
    var c = r.cols[prodKey];
    if (!c) return -Infinity;
    if (metricKey === 'forecast')   return c.f    != null ? c.f    : -Infinity;
    if (metricKey === 'aktivasyon') return c.a    != null ? c.a    : -Infinity;
    if (metricKey === 'deltaA')     return c.dA   != null ? c.dA   : -Infinity;
    if (metricKey === 'deltaHgo')   return c.dHgo != null ? c.dHgo : -Infinity;
    return c.hgo != null ? c.hgo : -Infinity;
  }
  return rows.slice().sort(function(a, b) {
    var d = v(b) - v(a);
    if (d) return d;
    /* Eşitlik: 1) seçili üründe aktivasyon  2) ada göre */
    var ca = a.cols[prodKey] || {}, cb = b.cols[prodKey] || {};
    var ad = (cb.a || 0) - (ca.a || 0);
    if (ad) return ad;
    return (a.nm || '').localeCompare(b.nm || '', 'tr');
  });
}

/* ─── BİÇİMLENDİRME YARDIMCILARI ──────────────────────────────────── */
function _symN(n)     { return Math.round(n || 0).toLocaleString('tr-TR'); }
function _symPct1(v)  { return v == null ? '—' : ('%' + v.toFixed(1).replace('.', ',')); }
function _symPct0(v)  { return v == null ? '—' : ('%' + Math.round(v)); }
function _symBand(v)  { return (typeof hgoBand === 'function') ? (hgoBand(v) || 'r') : 'r'; }

/* ─── ÜRÜN HÜCRESİ — HGO / Forecast / Aktivasyon / Hedef / Kalan-Fazla /
   Günlük / (Bölge farkı) / Önceki rapora göre değişim ────────────────
   regionC verilirse (yönetici kartlarında) kompakt bölge karşılaştırma
   satırı eklenir; bölge kartının kendisinde regionC=null geçilir. */
function _symCellHTML(p, c, kalanGun, monthDone, edmMode, regionC) {
  var band  = c.hgo != null ? _symBand(c.hgo) : null;
  var fBand = c.f   != null ? _symBand(c.f)   : null;

  var gunlukVal = (c.hasTarget && !monthDone && kalanGun && kalanGun > 0 && !c.over && c.kalan > 0)
    ? Math.ceil(c.kalan / kalanGun) : null;

  /* Hedef / Kalan-Fazla / Günlük — kompakt üçlü satır (Sprint 24.1 madde 7) */
  var trioHTML =
    '<div class="sym-c-trio">' +
      '<div class="sym-c-trioitem"><div class="v">' + (c.hasTarget ? _symN(c.h) : '—') + '</div><div class="l">Hedef</div></div>' +
      '<div class="sym-c-trioitem"><div class="v' + (c.over ? ' plus' : '') + '">' +
        (c.hasTarget ? (c.over ? '+' + _symN(c.fazla) : _symN(c.kalan)) : '—') +
      '</div><div class="l">' + (c.over ? 'Fazla' : 'Kalan') + '</div></div>' +
      '<div class="sym-c-trioitem"><div class="v">' + (gunlukVal != null ? _symN(gunlukVal) : '—') + '</div><div class="l">Günlük</div></div>' +
    '</div>';

  /* Bölge ile karşılaştırma — yalnızca HGO puanı üzerinden, kompakt tek satır */
  var cmpHTML = '';
  if (regionC && regionC.hgo != null && c.hgo != null) {
    var diff = Math.round((c.hgo - regionC.hgo) * 10) / 10;
    var dCls = diff > 0 ? 'up' : diff < 0 ? 'dn' : 'eq';
    var dTxt = diff > 0 ? ('▲ +' + diff.toFixed(1).replace('.', ',') + ' p')
             : diff < 0 ? ('▼ ' + diff.toFixed(1).replace('.', ',') + ' p')
             : '—';
    cmpHTML = '<div class="sym-c-cmp"><span>Bölge ' + _symPct1(regionC.hgo) + '</span><span class="d ' + dCls + '">' + dTxt + '</span></div>';
  }

  /* Önceki rapora göre değişim — kartın en altında tek satır (adet + HGO puanı) */
  var trendHTML = '';
  if ((c.dA !== undefined && c.dA !== null) || (c.dHgo !== undefined && c.dHgo !== null)) {
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
    trioHTML +
    cmpHTML +
    trendHTML +
  '</div>';
}

/* ─── SY KARTI — yalnızca sıra/ad/bayi-personel; genel HGO/Forecast YOK ── */
function _symMedal(i) {
  return i === 0 ? '<span class="badge b1">1</span>'
       : i === 1 ? '<span class="badge b2">2</span>'
       : i === 2 ? '<span class="badge b3">3</span>'
       : '<span class="n">' + (i + 1) + '</span>';
}

function _symManagerCardHTML(row, i, kalanGun, monthDone, edmMode, regionCols) {
  var cellsHTML = SYM_PRODS.map(function(p) {
    return _symCellHTML(p, row.cols[p.key], kalanGun, monthDone, edmMode, regionCols[p.key]);
  }).join('');

  var warnHTML = row.matchWarn ? ' <span class="sym-warn">⚠ Eşleşme kontrol edilmeli</span>' : '';

  return '<div class="sym-card">' +
    '<div class="sym-card-top">' +
      '<div class="sym-rk">' + _symMedal(i) + '</div>' +
      '<div class="sym-id">' +
        '<div class="sym-nm">' + row.nm + '</div>' +
        '<div class="sym-meta">' + row.bayiCount + ' bayi · ' + row.persCount + ' personel' + warnHTML + '</div>' +
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
      hdrHTML('👔', 'Satış Yöneticisi Ürün Performans Raporu', 'SY verisi yüklenmedi') +
      '<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px">SY ÖZET verisi bulunamadı — Excel raporu yükleyin.</div>' +
      '</div>';
    return;
  }

  var edmMode  = typeof KANAL !== 'undefined' && KANAL === 'EDM';
  var allNames = Object.keys(S.sy);
  var names    = (onlyNames && onlyNames.length) ? onlyNames : allNames;

  /* Bölge toplamı HER ZAMAN tüm SY'lerden — EDM alt kümesi yalnızca
     aşağıdaki yönetici listesini filtreler, bölge kartlarını değil. */
  var regionCols = symBuildRegionCols(allNames);

  var rows = symBuildRows(names);
  rows = symSortRows(rows, symSortProd, symSortMetric);

  var gi        = (typeof gunInfo === 'function') ? gunInfo() : { ayGun: 0, gecenGun: 0, kalanGun: null };
  var kalanGun  = gi.kalanGun;
  var monthDone = gi.ayGun > 0 && gi.gecenGun > 0 && gi.ayGun <= gi.gecenGun;
  var gunTxt    = (gi.ayGun && gi.gecenGun) ? gi.gecenGun + '/' + gi.ayGun + '. gün' : '';

  var prodObj   = SYM_PRODS.filter(function(p) { return p.key === symSortProd; })[0] || SYM_PRODS[0];
  var metricObj = SYM_SORT_METRICS.filter(function(m) { return m.key === symSortMetric; })[0] || SYM_SORT_METRICS[0];
  var cmpTag    = (typeof SYPREV !== 'undefined' && SYPREV) ? ' · önceki raporla karşılaştırma' : '';

  var subtitle = 'Mobil · DSL · TV · Cihaz' + (gunTxt ? ' · ' + gunTxt : '') +
    ' · Ürün: ' + (edmMode ? prodObj.edmLabel : prodObj.label) + ' · Sıralama: ' + metricObj.label +
    (monthDone ? ' · Ay Sonu Sonucu' : '') + cmpTag;

  var regionCellsHTML = SYM_PRODS.map(function(p) {
    return _symCellHTML(p, regionCols[p.key], kalanGun, monthDone, edmMode, null);
  }).join('');

  var cardsHTML = rows.map(function(r, i) {
    return _symManagerCardHTML(r, i, kalanGun, monthDone, edmMode, regionCols);
  }).join('');

  /* Ürün bazlı liderler — genel/birleşik skor DEĞİL, her ürün kendi HGO'suna göre */
  var leadersHTML = SYM_PRODS.map(function(p) {
    var best = null;
    rows.forEach(function(row) {
      var c = row.cols[p.key];
      if (c && c.hgo != null && (!best || c.hgo > best.hgo)) best = { nm: row.nm, hgo: c.hgo };
    });
    var bBand = best ? _symBand(best.hgo) : null;
    return '<div class="sym-ldr-card">' +
      '<div class="sym-ldr-hdr"><span>' + p.icon + '</span><span>' + (edmMode ? p.edmLabel : p.label) + ' LİDERİ</span></div>' +
      (best
        ? '<div class="sym-ldr-nm">' + best.nm + '</div><div class="sym-ldr-v' + (bBand ? ' b-' + bBand : '') + '">' + _symPct1(best.hgo) + '</div>'
        : '<div class="sym-ldr-nm">—</div>') +
    '</div>';
  }).join('');

  cards.style.maxWidth = '980px';
  cards.innerHTML =
    '<div class="card sym-page" id="sy-card">' +
    hdrHTML('👔', 'Satış Yöneticisi Ürün Performans Raporu', subtitle) +
    '<div class="sec t"><span>📊 Kuzey Anadolu Bölge Performansı</span></div>' +
    '<div class="symr-wrap"><div class="sym-grid">' + regionCellsHTML + '</div></div>' +
    '<div class="sec t"><span>👔 Yöneticiler</span><span class="cnt">' + rows.length + ' SY</span></div>' +
    '<div class="sym-list">' + cardsHTML + '</div>' +
    '<div class="sec t"><span>🏆 Ürün Liderleri</span></div>' +
    '<div class="sym-ldr-grid">' + leadersHTML + '</div>' +
    ftrHTML([]) +
    '</div>';
}
