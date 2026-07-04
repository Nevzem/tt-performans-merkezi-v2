/* ════════════════════════════════════════════════════════════════════
   js/matrix-v2.js  —  Matrix Engine V2 (Premium Excel Edition)
   Sprint 16  |  Sprint 19'dan itibaren matrisin TEK motoru.
   Sprint 22  |  WhatsApp Premium Redesign:
     · Benchmark satırları (Kuzey Anadolu / Anadolu) heatmap DIŞI —
       ürün başlık renk ailesinin açık tonuyla boyanır (benchBg/subBg).
     · Belirgin grid (#8EA0B8) + ürün grupları arası kalın ayırıcı (#5E7191).
     · Soft/premium heatmap skalası (eşikler: 110/100/90/80).
     · WhatsApp okunabilirliği için büyütülmüş fontlar ve satır yükseklikleri.
   NOT: Stiller bilinçli olarak inline — html2canvas export'unda birebir
   aynı görünümü garanti eder. Veri/hesap/sıralama mantığı değişmemiştir.
   ════════════════════════════════════════════════════════════════════ */

/* ─── ÜRÜN TANIMI ─────────────────────────────────────────────────── */
/* İP/DSL kolonu kullanıcı isteğiyle çıkarıldı (2026-07-04)
   thBg  : ürün başlığı (koyu kurumsal)
   subBg : HGO/Fc alt başlık zemini (çok açık ton)
   subFg : alt başlık yazısı (koyu ürün rengi)
   benchBg: KUZEY ANADOLU benchmark hücre zemini (kontrollü açık ton) */
var MV2_COLS = [
  { key:'mobil', label:'MOBİL',  thBg:'#0C2860', subBg:'#E8EEFC', subFg:'#0C2860', benchBg:'#CBD8F2' },
  { key:'dsl',   label:'DSL',    thBg:'#1A5E38', subBg:'#E8F5EC', subFg:'#1A5E38', benchBg:'#C9E6D3' },
  { key:'iptv',  label:'İP TV',  thBg:'#3D1A78', subBg:'#EDE8FC', subFg:'#3D1A78', benchBg:'#DACFF0' },
  { key:'uydu',  label:'UYDU',   thBg:'#1A4D3D', subBg:'#E8F5F0', subFg:'#1A4D3D', benchBg:'#C7E1D7' },
  { key:'tv',    label:'TV',     thBg:'#0A3D6B', subBg:'#E8F0FC', subFg:'#0A3D6B', benchBg:'#C8DCF0' },
  { key:'cihaz', label:'CİHAZ', thBg:'#2D5A1A', subBg:'#EDF5E8', subFg:'#2D5A1A', benchBg:'#D4E4C6' },
];

/* ─── GRID ÇİZGİ SİSTEMİ ──────────────────────────────────────────── */
var MV2_GRID        = '#8EA0B8';  /* standart hücre çizgisi — WhatsApp'ta kaybolmaz   */
var MV2_GRID_STRONG = '#5E7191';  /* ürün grubu / isim kolonu / başlık altı ayırıcısı */
var MV2_BENCH_SEP   = '#0C2860';  /* benchmark bölümü üstü kalın koyu çizgi           */

/* İn-app sütun px genişlikleri — toplam 918px (yatay scroll) */
var MV2_W = { sira:36, kod:64, ad:170, hgo:56, fc:52 };
/* 36+64+170 + 6*(56+52) = 270+648 = 918 */

/* Export şablon genişlikleri — toplam 1800px, scale:2 → 3600px çıktı */
var MV2_WE = { sira:46, kod:86, ad:240, hgo:120, fc:118 };
/* 46+86+240 + 6*(120+118) = 372+1428 = 1800 */

/* ─── RENK SKALASI — soft / premium heatmap ────────────────────────── */
/* Eşikler: ≥110 güçlü soft yeşil · 100-109 açık yeşil · 90-99 açık sarı
   · 80-89 pastel turuncu · <80 pastel kırmızı. Yazılar zeminin koyu ailesinden. */
function matrixColorScale(v) {
  if (v === null || v === undefined) return { bg:'#F5F6FA', fg:'#9AA4B4' };
  if (v >= 110) return { bg:'#AFD8B5', fg:'#1E5B2E' };
  if (v >= 100) return { bg:'#D6ECD9', fg:'#256B38' };
  if (v >= 90)  return { bg:'#F4EFD0', fg:'#6E5D14' };
  if (v >= 80)  return { bg:'#F8E3C8', fg:'#8A5A16' };
  return         { bg:'#F5D5D5', fg:'#8E2B2B' };
}

/* ─── İN-APP HÜCRE ─────────────────────────────────────────────────── */

function matrixCell(v, fs, extra) {
  var c   = matrixColorScale(v);
  var str = (v !== null && v !== undefined) ? '%' + Math.round(v) : '—';
  return '<td style="background:' + c.bg + ';color:' + c.fg + ';' +
    'text-align:center;font-size:' + (fs || 14) + 'px;font-weight:800;' +
    'border:1px solid ' + MV2_GRID + ';padding:0 3px;height:42px;' +
    'vertical-align:middle;white-space:nowrap;' + (extra || '') + '">' + str + '</td>';
}

/* ─── İN-APP BAŞLIK ─────────────────────────────────────────────────── */

function buildMatrixHeader() {
  var bNav = '1px solid rgba(255,255,255,0.14)';
  var thS  = 'background:#0C2860;color:#fff;border:' + bNav + ';' +
             'padding:9px 4px;text-align:center;font-weight:900;white-space:nowrap;vertical-align:middle;';

  /* Satır 1: sabit başlıklar + ürün grup adları */
  var r1 = '<tr>' +
    '<th rowspan="2" style="' + thS + 'font-size:11.5px;width:' + MV2_W.sira + 'px;">Sıra</th>' +
    '<th rowspan="2" style="' + thS + 'font-size:11.5px;width:' + MV2_W.kod  + 'px;">Kodu</th>' +
    '<th rowspan="2" style="' + thS + 'font-size:11.5px;width:' + MV2_W.ad   + 'px;text-align:left;padding-left:8px;' +
      'border-right:2px solid ' + MV2_GRID_STRONG + ';">Bayi Adı</th>';

  MV2_COLS.forEach(function(col) {
    /* Aktif sıralama kolonu altın alt çizgiyle vurgulanır */
    var on = (typeof matrixSort !== 'undefined' && matrixSort === col.key);
    r1 += '<th colspan="2" style="background:' + col.thBg + ';color:#fff;' +
      'border:' + bNav + ';border-left:2px solid rgba(255,255,255,0.35);' +
      'padding:9px 4px;font-size:13px;font-weight:900;text-align:center;' +
      'letter-spacing:0.4px;cursor:pointer;' +
      (on ? 'border-bottom:3px solid #C9A227;' : '') +
      '" onclick="setMatrixSort(\'' + col.key + '\')">' + col.label + '</th>';
  });
  r1 += '</tr>';

  /* Satır 2: HGO / Fc alt başlıkları — gövdeden güçlü çizgiyle ayrılır */
  var r2 = '<tr>';
  MV2_COLS.forEach(function(col) {
    var sS = 'background:' + col.subBg + ';color:' + col.subFg + ';' +
      'border:1px solid ' + MV2_GRID + ';border-bottom:2px solid ' + MV2_GRID_STRONG + ';' +
      'padding:6px 3px;font-size:11px;font-weight:800;text-align:center;vertical-align:middle;';
    r2 += '<th style="' + sS + 'border-left:2px solid ' + MV2_GRID_STRONG + ';width:' + MV2_W.hgo + 'px;">HGO</th>';
    r2 += '<th style="' + sS + 'width:' + MV2_W.fc  + 'px;">Fc</th>';
  });
  r2 += '</tr>';

  return r1 + r2;
}

/* ─── İN-APP VERİ SATIRLARI ────────────────────────────────────────── */

function buildMatrixGrid() {
  var M = (typeof MATRIX !== 'undefined') ? MATRIX : null;
  if (!M || !M.rows) return '';
  var f    = (typeof fc === 'function') ? fc() : null;
  var fcV  = function(v) { return (f && v !== null && v !== undefined) ? Math.round(v * f.k) : null; };
  var sKey = (typeof matrixSort !== 'undefined') ? matrixSort : 'mobil';

  var rows = M.rows.slice().sort(function(a, b) {
    return ((b[sKey] == null ? -Infinity : b[sKey]) - (a[sKey] == null ? -Infinity : a[sKey]));
  });

  return rows.map(function(r, i) {
    var rowBg  = i % 2 === 0 ? '#FFFFFF' : '#F5F8FC';
    var tdBase = 'height:42px;border:1px solid ' + MV2_GRID + ';vertical-align:middle;';
    var html   = '<tr style="background:' + rowBg + ';">' +
      '<td style="' + tdBase + 'text-align:center;font-size:14px;font-weight:800;color:#0B1F4D;">' + (i + 1) + '</td>' +
      '<td style="' + tdBase + 'text-align:center;font-size:11px;font-weight:600;color:#64748B;">' + (r.kod || '') + '</td>' +
      '<td style="' + tdBase + 'padding:0 8px;max-width:' + MV2_W.ad + 'px;' +
        'border-right:2px solid ' + MV2_GRID_STRONG + ';">' +
        '<div style="font-size:13px;color:#0B1F4D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
          '<span style="font-weight:800;">' + (r.b || '') + '</span>' +
          (r.il ? '<span style="color:#7A869A;font-weight:500;font-size:11px;"> · ' + r.il + '</span>' : '') +
        '</div>' +
      '</td>';

    MV2_COLS.forEach(function(col) {
      var raw = (r[col.key] !== undefined) ? r[col.key] : null;
      html += matrixCell(raw, 14, 'border-left:2px solid ' + MV2_GRID_STRONG + ';');
      html += matrixCell(fcV(raw), 12.5);
    });

    return html + '</tr>';
  }).join('');
}

/* ─── İN-APP BENCHMARK SATIRLARI (Kuzey Anadolu / Anadolu) ─────────── */
/* Performans heatmap'i UYGULANMAZ. Sol etiket koyu lacivert + beyaz;
   değer hücreleri ürün başlığının renk ailesinden açık tonda,
   yazılar koyu ürün renginde. KUZEY satırı biraz daha dolgun tonda. */

function buildMatrixFooter() {
  var M  = (typeof MATRIX !== 'undefined') ? MATRIX : null;
  if (!M) return '';
  var f   = (typeof fc === 'function') ? fc() : null;
  var fcV = function(v) { return (f && v !== null && v !== undefined) ? Math.round(v * f.k) : null; };

  function benchRow(totData, label, isPrimary) {
    var lblBg  = isPrimary ? '#0C2860' : '#1A3A70';
    var topSep = isPrimary ? 'border-top:3px solid ' + MV2_BENCH_SEP + ';' : '';
    var html   = '<tr>' +
      '<td colspan="3" style="background:' + lblBg + ';color:#fff;' +
        'border:1px solid rgba(255,255,255,0.18);' + topSep +
        'border-right:2px solid ' + MV2_GRID_STRONG + ';' +
        'height:50px;vertical-align:middle;padding:0 10px;' +
        'font-size:12.5px;font-weight:900;text-align:left;letter-spacing:0.5px;">' +
        '&#9646; ' + label + '</td>';

    MV2_COLS.forEach(function(col) {
      var raw    = (totData && totData[col.key] !== undefined) ? totData[col.key] : null;
      var fv     = raw !== null ? fcV(raw) : null;
      var cellBg = isPrimary ? col.benchBg : col.subBg;
      var cellFg = col.thBg;
      var base   = 'background:' + cellBg + ';color:' + cellFg + ';' +
        'border:1px solid ' + MV2_GRID + ';' + topSep +
        'height:50px;vertical-align:middle;text-align:center;white-space:nowrap;';
      html += '<td style="' + base + 'border-left:2px solid ' + MV2_GRID_STRONG + ';' +
        'font-size:14.5px;font-weight:800;">' +
        ((raw !== null && raw !== undefined) ? '%' + Math.round(raw) : '—') + '</td>';
      html += '<td style="' + base + 'font-size:12.5px;font-weight:700;opacity:0.85;">' +
        (fv !== null ? '%' + fv : '—') + '</td>';
    });

    return html + '</tr>';
  }

  return benchRow(M.kuzey   || null, 'KUZEY ANADOLU', true) +
         benchRow(M.anadolu || null, 'ANADOLU',        false);
}

/* ─── ÖZET ─────────────────────────────────────────────────────────── */

function matrixSummary() {
  var M = (typeof MATRIX !== 'undefined') ? MATRIX : null;
  var f = (typeof fc === 'function') ? fc() : null;
  return {
    bayiCount: M && M.rows ? M.rows.length : 0,
    urunCount: MV2_COLS.length,
    forecast:  f,
    donem:     (typeof DONEM !== 'undefined') ? DONEM : '',
  };
}

/* ─── İN-APP RENDER ─────────────────────────────────────────────────── */

function renderMatrixV2() {
  var cards = document.getElementById('cards');
  if (!cards) return;

  var M = (typeof MATRIX !== 'undefined') ? MATRIX : null;
  if (!M || !M.rows || !M.rows.length) {
    cards.innerHTML = '<div style="padding:40px;text-align:center;color:#94A3B8;">Matris verisi yok.</div>';
    return;
  }

  var summ  = matrixSummary();
  var f     = summ.forecast;
  var donem = summ.donem;

  /* Kompakt bilgi başlığı */
  var infoBar =
    '<div style="background:linear-gradient(135deg,#001E5A,#0A1840);' +
      'padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<div style="background:#E30613;border-radius:8px;width:38px;height:38px;flex-shrink:0;' +
          'display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#fff;">TT</div>' +
        '<div>' +
          '<div style="color:#fff;font-size:13px;font-weight:800;line-height:1.2;">Türk Telekom</div>' +
          '<div style="color:rgba(255,255,255,0.55);font-size:9px;font-weight:700;letter-spacing:1px;">KUZEY ANADOLU BÖLGE</div>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:center;">' +
        '<div style="color:#fff;font-size:11.5px;font-weight:900;letter-spacing:0.4px;">PERFORMANS MATRİS RAPORU</div>' +
        '<div style="color:rgba(255,255,255,0.5);font-size:9px;font-weight:600;margin-top:2px;">' +
          summ.bayiCount + ' Bayi &nbsp;·&nbsp; ' + summ.urunCount + ' Ürün' +
        '</div>' +
      '</div>' +
      '<div style="text-align:right;">' +
        '<div style="color:#fff;font-size:15px;font-weight:900;">' + donem + '</div>' +
        (f ? '<div style="color:#A8E6C2;font-size:9px;font-weight:700;margin-top:2px;">&#9889; ' + f.d + '/' + f.t + '. gün</div>' : '') +
      '</div>' +
    '</div>';

  /* Colgroup */
  var colgroup = '<colgroup>' +
    '<col style="width:' + MV2_W.sira + 'px">' +
    '<col style="width:' + MV2_W.kod  + 'px">' +
    '<col style="width:' + MV2_W.ad   + 'px">' +
    MV2_COLS.map(function(col) {
      return '<col style="width:' + MV2_W.hgo + 'px"><col style="width:' + MV2_W.fc + 'px">';
    }).join('') +
  '</colgroup>';

  var table =
    '<table style="border-collapse:collapse;' +
      'font-family:-apple-system,BlinkMacSystemFont,\'Inter\',\'Roboto Condensed\',Arial,sans-serif;' +
      'background:#fff;table-layout:fixed;">' +
      colgroup +
      '<thead id="mv2-thead">' + buildMatrixHeader() + '</thead>' +
      '<tbody id="mv2-tbody">' + buildMatrixGrid()   + '</tbody>' +
      '<tfoot id="mv2-tfoot">' + buildMatrixFooter() + '</tfoot>' +
    '</table>';

  cards.style.maxWidth = '100%';
  cards.innerHTML =
    '<div id="matrix-card" style="width:100%;background:#fff;border-radius:12px;' +
      'overflow:hidden;box-shadow:0 2px 16px rgba(10,31,92,0.12);">' +
      infoBar +
      '<div class="mv2-scroll">' + table + '</div>' +
    '</div>';
}

/* ─── EXPORT DOM ŞABLONU (1800px → scale:2 → 3600px çıktı) ─────────── */

function _buildMatrixExportDOM() {
  var M = (typeof MATRIX !== 'undefined') ? MATRIX : null;
  if (!M || !M.rows) return null;

  var f     = (typeof fc === 'function') ? fc() : null;
  var fcV   = function(v) { return (f && v !== null && v !== undefined) ? Math.round(v * f.k) : null; };
  var summ  = matrixSummary();
  var donem = summ.donem;
  var today = new Date().toLocaleDateString('tr-TR');
  var sKey  = (typeof matrixSort !== 'undefined') ? matrixSort : 'mobil';
  var W     = MV2_WE;
  var bOrd  = '1px solid ' + MV2_GRID;
  var bNav  = '1px solid rgba(255,255,255,0.14)';

  var rows = M.rows.slice().sort(function(a, b) {
    return ((b[sKey] == null ? -Infinity : b[sKey]) - (a[sKey] == null ? -Infinity : a[sKey]));
  });

  /* Export hücresi — WhatsApp okunabilirliği: büyük, kalın rakamlar */
  function eCell(v, fs, h, extra) {
    var c   = matrixColorScale(v);
    var str = (v !== null && v !== undefined) ? '%' + Math.round(v) : '—';
    return '<td style="background:' + c.bg + ';color:' + c.fg + ';' +
      'text-align:center;font-size:' + (fs || 26) + 'px;font-weight:800;' +
      'border:' + bOrd + ';padding:0 6px;height:' + (h || 52) + 'px;' +
      'vertical-align:middle;white-space:nowrap;' + (extra || '') + '">' + str + '</td>';
  }

  /* Başlık Satır 1: ürün grup adları */
  var thS = 'background:#0C2860;color:#fff;border:' + bNav + ';padding:14px 6px;' +
    'text-align:center;font-weight:900;vertical-align:middle;';
  var h1 =
    '<tr>' +
    '<th rowspan="2" style="' + thS + 'font-size:19px;width:' + W.sira + 'px;">Sıra</th>' +
    '<th rowspan="2" style="' + thS + 'font-size:19px;width:' + W.kod  + 'px;">Kodu</th>' +
    '<th rowspan="2" style="' + thS + 'font-size:19px;width:' + W.ad + 'px;text-align:left;padding-left:16px;' +
      'border-right:3px solid ' + MV2_GRID_STRONG + ';">Bayi Adı</th>';
  MV2_COLS.forEach(function(col) {
    var on = (col.key === sKey);
    h1 += '<th colspan="2" style="background:' + col.thBg + ';color:#fff;' +
      'border:' + bNav + ';border-left:3px solid rgba(255,255,255,0.4);' +
      'padding:14px 6px;font-size:26px;font-weight:900;' +
      'text-align:center;letter-spacing:0.5px;' +
      (on ? 'border-bottom:5px solid #C9A227;' : '') +
      '">' + col.label + '</th>';
  });
  h1 += '</tr>';

  /* Başlık Satır 2: HGO / Forecast — gövdeden kalın çizgiyle ayrılır */
  var h2 = '<tr>';
  MV2_COLS.forEach(function(col) {
    var sS = 'background:' + col.subBg + ';color:' + col.subFg + ';' +
      'border:' + bOrd + ';border-bottom:3px solid ' + MV2_GRID_STRONG + ';' +
      'padding:9px 6px;font-size:15px;font-weight:900;text-align:center;vertical-align:middle;' +
      'letter-spacing:0.5px;';
    h2 += '<th style="' + sS + 'border-left:3px solid ' + MV2_GRID_STRONG + ';width:' + W.hgo + 'px;">HGO</th>';
    h2 += '<th style="' + sS + 'width:' + W.fc  + 'px;">FORECAST</th>';
  });
  h2 += '</tr>';

  /* Veri satırları */
  var body = rows.map(function(r, i) {
    var rowBg = i % 2 === 0 ? '#FFFFFF' : '#F5F8FC';
    var tdH   = 52;
    var tdBase = 'height:' + tdH + 'px;border:' + bOrd + ';vertical-align:middle;';
    var html  = '<tr style="background:' + rowBg + ';">' +
      '<td style="' + tdBase + 'text-align:center;' +
        'font-size:24px;font-weight:800;color:#0B1F4D;">' + (i + 1) + '</td>' +
      '<td style="' + tdBase + 'text-align:center;' +
        'font-size:16px;font-weight:600;color:#64748B;">' + (r.kod || '') + '</td>' +
      '<td style="' + tdBase + 'padding:0 16px;max-width:' + W.ad + 'px;' +
        'border-right:3px solid ' + MV2_GRID_STRONG + ';">' +
        '<div style="font-size:23px;color:#0B1F4D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
          '<span style="font-weight:800;">' + (r.b || '') + '</span>' +
          (r.il ? '<span style="color:#7A869A;font-weight:500;font-size:16px;"> · ' + r.il + '</span>' : '') +
        '</div>' +
      '</td>';
    MV2_COLS.forEach(function(col) {
      var raw = (r[col.key] !== undefined) ? r[col.key] : null;
      html += eCell(raw, 26, tdH, 'border-left:3px solid ' + MV2_GRID_STRONG + ';');
      html += eCell(fcV(raw), 22, tdH);
    });
    return html + '</tr>';
  }).join('');

  /* Benchmark satırları (export) — heatmap yok, ürün renk ailesi zemin */
  function eBenchRow(totData, label, isPrimary) {
    var lblBg  = isPrimary ? '#0C2860' : '#1A3A70';
    var topSep = isPrimary ? 'border-top:4px solid ' + MV2_BENCH_SEP + ';' : '';
    var tdH    = 62;
    var html   = '<tr>' +
      '<td colspan="3" style="background:' + lblBg + ';color:#fff;' +
        'border:1px solid rgba(255,255,255,0.18);' + topSep +
        'border-right:3px solid ' + MV2_GRID_STRONG + ';' +
        'height:' + tdH + 'px;vertical-align:middle;padding:0 16px;' +
        'font-size:22px;font-weight:900;text-align:left;letter-spacing:0.8px;">' +
        '&#9646; ' + label + '</td>';
    MV2_COLS.forEach(function(col) {
      var raw    = (totData && totData[col.key] !== undefined) ? totData[col.key] : null;
      var fv     = raw !== null ? fcV(raw) : null;
      var cellBg = isPrimary ? col.benchBg : col.subBg;
      var base   = 'background:' + cellBg + ';color:' + col.thBg + ';' +
        'border:' + bOrd + ';' + topSep +
        'height:' + tdH + 'px;vertical-align:middle;text-align:center;white-space:nowrap;';
      html += '<td style="' + base + 'border-left:3px solid ' + MV2_GRID_STRONG + ';' +
        'font-size:27px;font-weight:900;">' +
        ((raw !== null && raw !== undefined) ? '%' + Math.round(raw) : '—') + '</td>';
      html += '<td style="' + base + 'font-size:23px;font-weight:800;opacity:0.85;">' +
        (fv !== null ? '%' + fv : '—') + '</td>';
    });
    return html + '</tr>';
  }

  /* Colgroup */
  var colgroup = '<colgroup>' +
    '<col style="width:' + W.sira + 'px">' +
    '<col style="width:' + W.kod  + 'px">' +
    '<col style="width:' + W.ad   + 'px">' +
    MV2_COLS.map(function(col) {
      return '<col style="width:' + W.hgo + 'px"><col style="width:' + W.fc + 'px">';
    }).join('') +
  '</colgroup>';

  /* Premium başlık bandı (export) */
  var header =
    '<div style="background:linear-gradient(135deg,#001E5A 0%,#0A1840 100%);' +
      'padding:30px 44px;display:flex;align-items:center;justify-content:space-between;">' +
      '<div style="display:flex;align-items:center;gap:20px;">' +
        '<div style="background:#E30613;border-radius:14px;width:70px;height:70px;flex-shrink:0;' +
          'display:flex;align-items:center;justify-content:center;' +
          'font-size:25px;font-weight:900;color:#fff;">TT</div>' +
        '<div>' +
          '<div style="color:#fff;font-size:23px;font-weight:900;line-height:1.2;">Türk Telekom</div>' +
          '<div style="color:rgba(255,255,255,0.62);font-size:13px;font-weight:700;' +
            'letter-spacing:2.2px;margin-top:5px;">KUZEY ANADOLU BÖLGE</div>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:center;">' +
        '<div style="color:rgba(255,255,255,0.55);font-size:12px;font-weight:800;' +
          'letter-spacing:3.5px;margin-bottom:8px;">RAPORLAMA DÖNEMİ</div>' +
        '<div style="color:#fff;font-size:38px;font-weight:900;letter-spacing:0.3px;line-height:1.1;">' +
          'PERFORMANS MATRİS RAPORU</div>' +
        '<div style="color:rgba(255,255,255,0.55);font-size:13px;font-weight:700;' +
          'letter-spacing:2px;margin-top:8px;">' + rows.length + ' Bayi &nbsp;·&nbsp; ' + MV2_COLS.length + ' Ürün</div>' +
      '</div>' +
      '<div style="text-align:right;">' +
        '<div style="color:#fff;font-size:33px;font-weight:900;">' + donem + '</div>' +
        '<div style="color:rgba(255,255,255,0.6);font-size:14px;font-weight:600;margin-top:6px;">' +
          'Rapor Tarihi: ' + today + '</div>' +
        (f ? '<div style="color:#A8E6C2;font-size:14px;font-weight:700;margin-top:5px;">' +
          '&#9889; ' + f.d + '/' + f.t + '. gün &nbsp;&#183;&nbsp; Forecast aktif</div>' : '') +
      '</div>' +
    '</div>';

  /* Alt şerit (export) — sade ve premium */
  var footer2 =
    '<div style="background:#0C2860;padding:16px 44px;' +
      'display:flex;justify-content:space-between;align-items:center;">' +
      '<div style="color:rgba(255,255,255,0.6);font-size:13px;font-weight:700;letter-spacing:1.8px;">' +
        'TT KUZEY ANADOLU BÖLGE &nbsp;&#183;&nbsp; PERFORMANS MERKEZİ</div>' +
      '<div style="color:rgba(255,255,255,0.6);font-size:13px;font-weight:700;">' +
        'Hedefe Birlikte &nbsp;&#183;&nbsp; ' + today + '</div>' +
    '</div>';

  return '<div id="matrix-export" style="width:1800px;background:#ffffff;' +
    'padding:0;box-sizing:border-box;' +
    'font-family:-apple-system,BlinkMacSystemFont,\'Inter\',\'Roboto Condensed\',Arial,sans-serif;' +
    '-webkit-font-smoothing:antialiased;">' +
    header +
    '<table style="border-collapse:collapse;width:100%;table-layout:fixed;">' +
      colgroup +
      '<thead>' + h1 + h2 + '</thead>' +
      '<tbody>' + body + '</tbody>' +
      '<tfoot>' +
        eBenchRow(M.kuzey   || null, 'KUZEY ANADOLU', true)  +
        eBenchRow(M.anadolu || null, 'ANADOLU',        false) +
      '</tfoot>' +
    '</table>' +
    footer2 +
  '</div>';
}

/* ─── EXPORT FONKSİYONU ─────────────────────────────────────────────── */

async function matrixExportV2() {
  var btn   = document.getElementById('fbar-v2-btn');
  var valEl = btn ? btn.querySelector('.fbar-chip-val') : null;
  var orig  = valEl ? valEl.textContent : 'Oluştur ↗';
  if (btn)   btn.disabled = true;
  if (valEl) valEl.textContent = '⏳';

  var cloneWrapper = null;
  try {
    var html = _buildMatrixExportDOM();
    if (!html) throw new Error('Matris verisi yok');

    var tpl     = document.createElement('div');
    tpl.innerHTML = html;
    var content = tpl.firstChild;

    var wrapper = document.createElement('div');
    wrapper.className = 'mv2-export-wrap';
    wrapper.appendChild(content);
    document.body.appendChild(wrapper);
    cloneWrapper = wrapper;

    /* html2canvas'ın DOM'u okuyabilmesi için bir frame bekle */
    await new Promise(function(r) { requestAnimationFrame(function() { setTimeout(r, 150); }); });

    var elW = content.scrollWidth || content.offsetWidth || 1800;
    var elH = content.scrollHeight || content.offsetHeight;

    var donem2 = (typeof DONEM !== 'undefined' && DONEM) ? DONEM.replace('/', '') : '';
    var fname  = 'TT_MatrisV2_' + donem2 + '.png';

    var canvas = await captureExportImage(content, {
      scale:        2,       /* 1800 × 2 = 3600px genişlik */
      width:        elW,
      height:       elH,
      windowWidth:  elW + 50,
      windowHeight: elH + 50,
    });
    cleanupExportClone(cloneWrapper); cloneWrapper = null;
    _openSharePreview(canvas.toDataURL('image/png'), fname);

  } catch (e) {
    alert('Matris V2 görsel hatası: ' + e.message);
  }

  if (cloneWrapper) cleanupExportClone(cloneWrapper);
  if (btn)   btn.disabled = false;
  if (valEl) valEl.textContent = orig;
}

/* Sprint 19: render override kaldırıldı — render.js'in matrix dalı
   renderMatrixV2()'yi doğrudan çağırır. */
