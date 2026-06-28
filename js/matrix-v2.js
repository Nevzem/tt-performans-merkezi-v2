/* ════════════════════════════════════════════════════════════════════
   js/matrix-v2.js  —  Matrix Engine V2 (Premium Excel Edition)
   Sprint 16  |  Eski renderMatrix() koduna dokunulmaz.
   ════════════════════════════════════════════════════════════════════ */

/* ─── ÜRÜN TANIMI ─────────────────────────────────────────────────── */

var MV2_COLS = [
  { key:'mobil', label:'MOBİL',  thBg:'#0C2860', subBg:'#E8EEFC', subFg:'#0C2860', single:false },
  { key:'dsl',   label:'DSL',    thBg:'#1A5E38', subBg:'#E8F5EC', subFg:'#1A5E38', single:false },
  { key:'iptv',  label:'İP TV',  thBg:'#3D1A78', subBg:'#EDE8FC', subFg:'#3D1A78', single:false },
  { key:'ipdsl', label:'İP/DSL', thBg:'#8B1A1A', subBg:'#FCE8E8', subFg:'#8B1A1A', single:true  },
  { key:'uydu',  label:'UYDU',   thBg:'#1A4D3D', subBg:'#E8F5F0', subFg:'#1A4D3D', single:false },
  { key:'tv',    label:'TV',     thBg:'#0A3D6B', subBg:'#E8F0FC', subFg:'#0A3D6B', single:false },
  { key:'cihaz', label:'CİHAZ', thBg:'#2D5A1A', subBg:'#EDF5E8', subFg:'#2D5A1A', single:false },
];

/* İn-app sütun px genişlikleri — toplam 952px (yatay scroll) */
var MV2_W = { sira:34, kod:68, ad:168, hgo:54, fc:50, ipdsl:58 };
/* 34+68+168 + 6*(54+50) + 58 = 270+624+58 = 952 */

/* Export şablon genişlikleri — toplam 2048px, scale:2 → 4096px çıktı */
var MV2_WE = { sira:44, kod:84, ad:220, hgo:106, fc:136, ipdsl:248 };
/* 44+84+220 + 6*(106+136) + 248 = 348+1452+248 = 2048 */

/* ─── RENK SKALASI ─────────────────────────────────────────────────── */

function matrixColorScale(v) {
  if (v === null || v === undefined) return { bg:'#F5F5F5', fg:'#9E9E9E' };
  if (v >= 120) return { bg:'#A9D18E', fg:'#1A4D16' };
  if (v >= 100) return { bg:'#C6EFCE', fg:'#276221' };
  if (v >= 90)  return { bg:'#E2F0D9', fg:'#375623' };
  if (v >= 80)  return { bg:'#FFF2CC', fg:'#7D6608' };
  if (v >= 70)  return { bg:'#FCE5CD', fg:'#833C00' };
  if (v >= 60)  return { bg:'#F4CCCC', fg:'#9C0006' };
  return         { bg:'#FFC7CE', fg:'#9C0006' };
}

/* ─── İN-APP HÜCRE ─────────────────────────────────────────────────── */

function matrixCell(v, fs) {
  var c   = matrixColorScale(v);
  var str = (v !== null && v !== undefined) ? '%' + Math.round(v) : '—';
  return '<td style="background:' + c.bg + ';color:' + c.fg + ';' +
    'text-align:center;font-size:' + (fs || 13) + 'px;font-weight:700;' +
    'border:1px solid #D8DEE9;padding:0 3px;height:40px;' +
    'vertical-align:middle;white-space:nowrap;">' + str + '</td>';
}

/* ─── İN-APP BAŞLIK ─────────────────────────────────────────────────── */

function buildMatrixHeader() {
  var f    = (typeof fc === 'function') ? fc() : null;
  var bNav = '1px solid rgba(255,255,255,0.12)';
  var bOrd = '1px solid #D8DEE9';
  var thS  = 'background:#0C2860;color:#fff;border:' + bNav + ';' +
             'padding:7px 4px;text-align:center;font-weight:900;white-space:nowrap;vertical-align:middle;';

  /* Satır 1: sabit başlıklar + ürün grup adları */
  var r1 = '<tr>' +
    '<th rowspan="2" style="' + thS + 'font-size:11px;width:' + MV2_W.sira + 'px;">Sıra</th>' +
    '<th rowspan="2" style="' + thS + 'font-size:11px;width:' + MV2_W.kod  + 'px;">Kodu</th>' +
    '<th rowspan="2" style="' + thS + 'font-size:11px;width:' + MV2_W.ad   + 'px;text-align:left;padding-left:8px;">Bayi Adı</th>';

  MV2_COLS.forEach(function(col) {
    var span = col.single ? 1 : 2;
    r1 += '<th colspan="' + span + '" style="background:' + col.thBg + ';color:#fff;' +
      'border:' + bNav + ';padding:7px 4px;font-size:12px;font-weight:900;text-align:center;' +
      'letter-spacing:0.3px;cursor:pointer;" onclick="setMatrixSort(\'' + col.key + '\')">' +
      col.label + '</th>';
  });
  r1 += '</tr>';

  /* Satır 2: HGO / Fc alt başlıkları */
  var r2 = '<tr>';
  MV2_COLS.forEach(function(col) {
    var sS = 'background:' + col.subBg + ';color:' + col.subFg + ';border:' + bOrd + ';' +
      'padding:5px 3px;font-size:10px;font-weight:800;text-align:center;vertical-align:middle;';
    if (col.single) {
      r2 += '<th style="' + sS + 'width:' + MV2_W.ipdsl + 'px;">ORAN</th>';
    } else {
      r2 += '<th style="' + sS + 'width:' + MV2_W.hgo + 'px;">HGO</th>';
      r2 += '<th style="' + sS + 'width:' + MV2_W.fc  + 'px;">' + (f ? 'Fc' : 'Fc') + '</th>';
    }
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
  var bOrd = '1px solid #D8DEE9';

  var rows = M.rows.slice().sort(function(a, b) {
    return ((b[sKey] == null ? -Infinity : b[sKey]) - (a[sKey] == null ? -Infinity : a[sKey]));
  });

  return rows.map(function(r, i) {
    var rowBg = i % 2 === 0 ? '#FFFFFF' : '#F7F9FC';
    var tdBase = 'height:38px;border:' + bOrd + ';vertical-align:middle;';
    var html   = '<tr style="background:' + rowBg + ';">' +
      '<td style="' + tdBase + 'text-align:center;font-size:13px;font-weight:800;color:#0B1F4D;">' + (i + 1) + '</td>' +
      '<td style="' + tdBase + 'text-align:center;font-size:11px;color:#64748B;">' + (r.kod || '') + '</td>' +
      '<td style="' + tdBase + 'padding:0 8px;max-width:' + MV2_W.ad + 'px;">' +
        '<div style="font-size:12px;color:#0B1F4D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
          '<span style="font-weight:700;">' + (r.b || '') + '</span>' +
          (r.il ? '<span style="color:#7A869A;font-weight:400;"> · ' + r.il + '</span>' : '') +
        '</div>' +
      '</td>';

    MV2_COLS.forEach(function(col) {
      var raw = (r[col.key] !== undefined) ? r[col.key] : null;
      html += matrixCell(raw, 13);
      if (!col.single) html += matrixCell(fcV(raw), 12);
    });

    return html + '</tr>';
  }).join('');
}

/* ─── İN-APP TOPLAM SATIRLARI ──────────────────────────────────────── */

function buildMatrixFooter() {
  var M  = (typeof MATRIX !== 'undefined') ? MATRIX : null;
  if (!M) return '';
  var f  = (typeof fc === 'function') ? fc() : null;
  var fcV = function(v) { return (f && v !== null && v !== undefined) ? Math.round(v * f.k) : null; };

  function totRow(totData, label, isDark) {
    var rowBg = isDark ? '#0C2860' : '#1A3A70';
    var bOrd  = '1px solid rgba(255,255,255,0.12)';
    var tdBase = 'background:' + rowBg + ';border:' + bOrd + ';height:45px;vertical-align:middle;';
    var html   = '<tr>' +
      '<td colspan="3" style="' + tdBase + 'padding:0 10px;font-size:12px;font-weight:900;' +
        'color:#fff;text-align:left;">&#9646; ' + label + '</td>';

    MV2_COLS.forEach(function(col) {
      var raw = (totData && totData[col.key] !== undefined) ? totData[col.key] : null;
      var fv  = (!col.single && raw !== null) ? fcV(raw) : null;
      var c   = matrixColorScale(raw);
      var cs  = matrixColorScale(fv);
      var str = (raw !== null && raw !== undefined) ? '%' + Math.round(raw) : '—';
      var fs  = fv !== null ? '%' + fv : '—';

      html += '<td style="' + tdBase + 'background:' + (raw !== null ? c.bg : 'rgba(255,255,255,0.06)') + ';' +
        'color:' + (raw !== null ? c.fg : '#8899B4') + ';' +
        'text-align:center;font-size:13px;font-weight:800;">' + str + '</td>';
      if (!col.single) {
        html += '<td style="' + tdBase + 'background:' + (fv !== null ? cs.bg : 'rgba(255,255,255,0.06)') + ';' +
          'color:' + (fv !== null ? cs.fg : '#8899B4') + ';' +
          'text-align:center;font-size:12px;font-weight:700;">' + fs + '</td>';
      }
    });

    return html + '</tr>';
  }

  return totRow(M.kuzey   || null, 'KUZEY ANADOLU', true) +
         totRow(M.anadolu || null, 'ANADOLU',        false);
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
          '<div style="color:rgba(255,255,255,0.45);font-size:9px;font-weight:700;letter-spacing:1px;">KUZEY ANADOLU BÖLGE</div>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:center;">' +
        '<div style="color:#fff;font-size:11px;font-weight:900;letter-spacing:0.4px;">PERFORMANS MATRİS RAPORU</div>' +
        '<div style="color:rgba(255,255,255,0.4);font-size:9px;font-weight:600;margin-top:2px;">' +
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
      if (col.single) return '<col style="width:' + MV2_W.ipdsl + 'px">';
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

/* ─── EXPORT DOM ŞABLONU (2048px → scale:2 → 4096px çıktı) ─────────── */

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
  var bOrd  = '1px solid #D8DEE9';
  var bNav  = '1px solid rgba(255,255,255,0.12)';

  var rows = M.rows.slice().sort(function(a, b) {
    return ((b[sKey] == null ? -Infinity : b[sKey]) - (a[sKey] == null ? -Infinity : a[sKey]));
  });

  /* Export hücresi (satır içi kullanım) */
  function eCell(v, fs, h) {
    var c   = matrixColorScale(v);
    var str = (v !== null && v !== undefined) ? '%' + Math.round(v) : '—';
    return '<td style="background:' + c.bg + ';color:' + c.fg + ';' +
      'text-align:center;font-size:' + (fs || 22) + 'px;font-weight:700;' +
      'border:' + bOrd + ';padding:0 6px;height:' + (h || 48) + 'px;' +
      'vertical-align:middle;white-space:nowrap;">' + str + '</td>';
  }

  /* Başlık Satır 1: ürün grup adları */
  var thS = 'background:#0C2860;color:#fff;border:' + bNav + ';padding:12px 6px;' +
    'text-align:center;font-weight:900;vertical-align:middle;';
  var h1 =
    '<tr>' +
    '<th rowspan="2" style="' + thS + 'font-size:18px;width:' + W.sira + 'px;">Sıra</th>' +
    '<th rowspan="2" style="' + thS + 'font-size:18px;width:' + W.kod  + 'px;">Kodu</th>' +
    '<th rowspan="2" style="' + thS + 'font-size:18px;width:' + W.ad + 'px;text-align:left;padding-left:14px;">Bayi Adı</th>';
  MV2_COLS.forEach(function(col) {
    h1 += '<th colspan="' + (col.single ? 1 : 2) + '" style="background:' + col.thBg + ';color:#fff;' +
      'border:' + bNav + ';padding:12px 6px;font-size:24px;font-weight:900;' +
      'text-align:center;letter-spacing:0.3px;">' + col.label + '</th>';
  });
  h1 += '</tr>';

  /* Başlık Satır 2: HGO / FC */
  var h2 = '<tr>';
  MV2_COLS.forEach(function(col) {
    var sS = 'background:' + col.subBg + ';color:' + col.subFg + ';border:' + bOrd + ';' +
      'padding:8px 6px;font-size:18px;font-weight:800;text-align:center;vertical-align:middle;';
    if (col.single) {
      h2 += '<th style="' + sS + 'width:' + W.ipdsl + 'px;">ORAN</th>';
    } else {
      h2 += '<th style="' + sS + 'width:' + W.hgo + 'px;">HGO</th>';
      h2 += '<th style="' + sS + 'width:' + W.fc  + 'px;">Forecast</th>';
    }
  });
  h2 += '</tr>';

  /* Veri satırları */
  var body = rows.map(function(r, i) {
    var rowBg = i % 2 === 0 ? '#FFFFFF' : '#F7F9FC';
    var tdH   = 44;
    var html  = '<tr style="background:' + rowBg + ';">' +
      '<td style="height:' + tdH + 'px;border:' + bOrd + ';text-align:center;' +
        'font-size:22px;font-weight:800;color:#0B1F4D;vertical-align:middle;">' + (i + 1) + '</td>' +
      '<td style="height:' + tdH + 'px;border:' + bOrd + ';text-align:center;' +
        'font-size:16px;color:#64748B;vertical-align:middle;">' + (r.kod || '') + '</td>' +
      '<td style="height:' + tdH + 'px;border:' + bOrd + ';padding:0 14px;vertical-align:middle;max-width:' + W.ad + 'px;">' +
        '<div style="font-size:22px;color:#0B1F4D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
          '<span style="font-weight:700;">' + (r.b || '') + '</span>' +
          (r.il ? '<span style="color:#7A869A;font-weight:400;"> · ' + r.il + '</span>' : '') +
        '</div>' +
      '</td>';
    MV2_COLS.forEach(function(col) {
      var raw = (r[col.key] !== undefined) ? r[col.key] : null;
      html += eCell(raw, 22, tdH);
      if (!col.single) html += eCell(fcV(raw), 20, tdH);
    });
    return html + '</tr>';
  }).join('');

  /* Toplam satırları (export) */
  function eTotRow(totData, label, isDark) {
    var rowBg  = isDark ? '#0C2860' : '#1A3A70';
    var bOrd2  = '1px solid rgba(255,255,255,0.12)';
    var tdH    = 56;
    var tdBase = 'border:' + bOrd2 + ';height:' + tdH + 'px;vertical-align:middle;';
    var html   = '<tr>' +
      '<td colspan="3" style="background:' + rowBg + ';' + tdBase + ';' +
        'padding:0 14px;font-size:20px;font-weight:900;color:#fff;text-align:left;">' +
        '&#9646; ' + label + '</td>';
    MV2_COLS.forEach(function(col) {
      var raw = (totData && totData[col.key] !== undefined) ? totData[col.key] : null;
      var fv  = (!col.single && raw !== null) ? fcV(raw) : null;
      var c   = matrixColorScale(raw);
      var cs  = matrixColorScale(fv);
      var str = (raw !== null && raw !== undefined) ? '%' + Math.round(raw) : '—';
      var fs  = fv !== null ? '%' + fv : '—';
      html += '<td style="background:' + (raw !== null ? c.bg : 'rgba(255,255,255,0.06)') + ';' +
        'color:' + (raw !== null ? c.fg : '#8899B4') + ';' +
        'text-align:center;font-size:24px;font-weight:900;' + tdBase + '">' + str + '</td>';
      if (!col.single) {
        html += '<td style="background:' + (fv !== null ? cs.bg : 'rgba(255,255,255,0.06)') + ';' +
          'color:' + (fv !== null ? cs.fg : '#8899B4') + ';' +
          'text-align:center;font-size:22px;font-weight:800;' + tdBase + '">' + fs + '</td>';
      }
    });
    return html + '</tr>';
  }

  /* Colgroup */
  var colgroup = '<colgroup>' +
    '<col style="width:' + W.sira + 'px">' +
    '<col style="width:' + W.kod  + 'px">' +
    '<col style="width:' + W.ad   + 'px">' +
    MV2_COLS.map(function(col) {
      if (col.single) return '<col style="width:' + W.ipdsl + 'px">';
      return '<col style="width:' + W.hgo + 'px"><col style="width:' + W.fc + 'px">';
    }).join('') +
  '</colgroup>';

  /* Premium header (export) */
  var header =
    '<div style="background:linear-gradient(135deg,#001E5A 0%,#0A1840 100%);' +
      'padding:28px 40px;display:flex;align-items:center;justify-content:space-between;">' +
      '<div style="display:flex;align-items:center;gap:18px;">' +
        '<div style="background:#E30613;border-radius:14px;width:68px;height:68px;flex-shrink:0;' +
          'display:flex;align-items:center;justify-content:center;' +
          'font-size:24px;font-weight:900;color:#fff;">TT</div>' +
        '<div>' +
          '<div style="color:#fff;font-size:22px;font-weight:900;line-height:1.2;">Türk Telekom</div>' +
          '<div style="color:rgba(255,255,255,0.45);font-size:13px;font-weight:700;' +
            'letter-spacing:2px;margin-top:4px;">KUZEY ANADOLU BÖLGE</div>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:center;">' +
        '<div style="color:rgba(255,255,255,0.35);font-size:11px;font-weight:700;' +
          'letter-spacing:3px;margin-bottom:8px;">RAPORLAMA DÖNEMİ</div>' +
        '<div style="color:#fff;font-size:36px;font-weight:900;letter-spacing:0.3px;line-height:1.1;">' +
          'PERFORMANS MATRİS RAPORU</div>' +
        '<div style="color:rgba(255,255,255,0.35);font-size:12px;font-weight:700;' +
          'letter-spacing:2px;margin-top:8px;">' + rows.length + ' Bayi &nbsp;·&nbsp; 7 Ürün</div>' +
      '</div>' +
      '<div style="text-align:right;">' +
        '<div style="color:#fff;font-size:32px;font-weight:900;">' + donem + '</div>' +
        '<div style="color:rgba(255,255,255,0.45);font-size:14px;font-weight:600;margin-top:6px;">' +
          'Rapor Tarihi: ' + today + '</div>' +
        (f ? '<div style="color:#A8E6C2;font-size:13px;font-weight:700;margin-top:5px;">' +
          '&#9889; ' + f.d + '/' + f.t + '. gün &nbsp;&#183;&nbsp; Forecast aktif</div>' : '') +
      '</div>' +
    '</div>';

  /* Alt şerit (export) */
  var footer2 =
    '<div style="background:#0C2860;padding:14px 40px;' +
      'display:flex;justify-content:space-between;align-items:center;">' +
      '<div style="color:rgba(255,255,255,0.4);font-size:12px;font-weight:700;letter-spacing:1.5px;">' +
        'TT KUZEY ANADOLU BÖLGE &nbsp;&#183;&nbsp; PERFORMANS MERKEZİ</div>' +
      '<div style="color:rgba(255,255,255,0.4);font-size:12px;font-weight:700;">' +
        'Hedefe Birlikte &nbsp;&#183;&nbsp; ' + today + '</div>' +
    '</div>';

  return '<div id="matrix-export" style="width:2048px;background:#ffffff;' +
    'font-family:-apple-system,BlinkMacSystemFont,\'Inter\',\'Roboto Condensed\',Arial,sans-serif;">' +
    header +
    '<table style="border-collapse:collapse;width:100%;table-layout:fixed;">' +
      colgroup +
      '<thead>' + h1 + h2 + '</thead>' +
      '<tbody>' + body + '</tbody>' +
      '<tfoot>' +
        eTotRow(M.kuzey   || null, 'KUZEY ANADOLU', true)  +
        eTotRow(M.anadolu || null, 'ANADOLU',        false) +
      '</tfoot>' +
    '</table>' +
    footer2 +
  '</div>';
}

/* ─── EXPORT FONKSİYONU ─────────────────────────────────────────────── */

async function matrixExportV2() {
  var btn   = document.getElementById('fbar-v2-btn');
  var valEl = btn ? btn.querySelector('.fbar-chip-val') : null;
  var orig  = valEl ? valEl.textContent : 'Rapor ↗';
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

    var elW = content.scrollWidth || content.offsetWidth || 2048;
    var elH = content.scrollHeight || content.offsetHeight;

    var donem2 = (typeof DONEM !== 'undefined' && DONEM) ? DONEM.replace('/', '') : '';
    var fname  = 'TT_MatrisV2_' + donem2 + '.png';

    var canvas = await captureExportImage(content, {
      scale:        2,       /* 2048 × 2 = 4096px genişlik */
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

/* ─── RENDER OVERRIDE ─────────────────────────────────────────────── */

(function() {
  /* render() app.js tarafından zaten sarmalanmış; üzerine bir kat daha */
  var __prevRender = render;
  render = function() {
    if ((typeof section !== 'undefined') && section === 'matrix') {
      var cards = document.getElementById('cards');
      if (cards) cards.style.maxWidth = '100%';
      renderMatrixV2();
      if (typeof buildFilterBar === 'function') buildFilterBar();
      return;
    }
    __prevRender();
  };
})();
