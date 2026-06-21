/* ════════════════════════════════════════════════════════════════════
   js/history.js  —  Geçmiş Kıyas ve Trend Merkezi
   Mevcut: parseWB(), ensureXLSX(), ensureH2C(), trendCapture(),
           _openSharePreview(), DATA, SYDATA, DETAY  kullanılır.
   ════════════════════════════════════════════════════════════════════ */

/* ─── STATE ───────────────────────────────────────────────────────── */
var HIST_DATA       = null;   /* Geçmiş Excel'den elde edilen DATA     */
var HIST_SYDATA     = null;   /* Geçmiş Excel'den elde edilen SYDATA   */
var HIST_DETAY      = null;   /* Geçmiş Excel'den elde edilen DETAY    */
var HIST_DONEM      = null;   /* Geçmiş dönem string'i                 */
var HIST_DATE_LABEL = null;   /* Görüntüleme için tarih etiketi        */
var HIST_FNAME      = null;   /* Seçilen dosya adı                     */
var _histManifest   = null;   /* data/history/manifest.json içeriği    */

var _gecmKiyas   = 'bayi';
var _gecmProd    = 'Toplam Mobil';
var _gecmGorunum = 'all';     /* 'all' | 'growth' | 'decline' */
var _gecmView    = 'kiyas';   /* 'kiyas' | 'trend' */

/* ─── ÜRÜN TANIMLARI ──────────────────────────────────────────────── */
var _GECM_PRODS = [
  { label: 'Toplam Mobil', key: 'Toplam Mobil', bayiKey: 'Toplam Mobil', syKey: 'Mobil Toplam',  detayKey: 'Toplam Mobil' },
  { label: 'DSL',          key: 'DSL',           bayiKey: 'DSL',           syKey: 'Evde İnternet', detayKey: 'DSL'           },
  { label: 'Toplam TV',    key: 'Toplam TV',     bayiKey: 'Toplam TV',     syKey: 'Tivibu Toplam', detayKey: 'Toplam TV'     },
  { label: 'Akıllı Cihaz', key: 'Akıllı Cihaz',  bayiKey: 'Akıllı Cihaz',  syKey: 'Cihaz',         detayKey: 'Akıllı Cihaz'  },
  { label: 'Diğer Cihaz',  key: 'Diğer Cihaz',   bayiKey: 'Diğer Cihaz',   syKey: 'Cihaz Diğer',   detayKey: 'Diğer Cihaz'   },
];

function _gecmPM() {
  return _GECM_PRODS.find(function(p) { return p.key === _gecmProd; }) || _GECM_PRODS[0];
}

/* ─── MANİFEST YÜKLEME ────────────────────────────────────────────── */
async function loadHistManifest() {
  try {
    var resp = await fetch('data/history/manifest.json?_=' + Date.now());
    if (!resp.ok) { _histManifest = { files: [] }; return; }
    _histManifest = await resp.json();
    if (!Array.isArray(_histManifest.files)) _histManifest.files = [];
    /* Dosyaları baştaki sayıya göre sırala */
    _histManifest.files.sort(function(a, b) {
      var dA = parseInt((a.match(/^(\d+)/) || [0, 999])[1]);
      var dB = parseInt((b.match(/^(\d+)/) || [0, 999])[1]);
      return dA - dB;
    });
  } catch (e) {
    _histManifest = { files: [] };
  }
}

/* ─── GEÇMİŞ DOSYA YÜKLEME ───────────────────────────────────────── */
async function loadHistFile(filename) {
  var loadEl  = document.getElementById('gecm-loading');
  var contEl  = document.getElementById('gecm-content');
  var emptyEl = document.getElementById('gecm-empty');

  if (loadEl)  { loadEl.style.display = ''; }
  if (contEl)  { contEl.style.display = 'none'; }
  if (emptyEl) { emptyEl.style.display = 'none'; }

  try {
    await ensureXLSX();
    var resp = await fetch('data/history/' + encodeURIComponent(filename));
    if (!resp.ok) throw new Error(filename + ' yüklenemedi (HTTP ' + resp.status + ')');

    var buf    = await resp.arrayBuffer();
    var wb     = XLSX.read(new Uint8Array(buf), { type: 'array' });
    var parsed = parseWB(wb);

    HIST_DATA       = parsed.data;
    HIST_SYDATA     = parsed.syData;
    HIST_DETAY      = parsed.detay;
    HIST_DONEM      = parsed.donem;
    HIST_FNAME      = filename;
    HIST_DATE_LABEL = _histLabel(wb, filename, parsed.donem);

    /* Geçmiş veriyi trend deposuna ekle */
    try { trendCapture(_histISODate(wb, filename, parsed.donem), parsed.data, parsed.donem); } catch (e) {}

    /* Tarih filtre butonunu güncelle */
    var tv = document.getElementById('gecm-tarih-val');
    if (tv) tv.textContent = _truncGecm(HIST_DATE_LABEL, 13);

    renderGecmisPage();

  } catch (e) {
    if (emptyEl) {
      emptyEl.style.display = '';
      emptyEl.innerHTML = '<div class="gecm-err">⚠️ ' + e.message + '</div>';
    }
  } finally {
    if (loadEl) loadEl.style.display = 'none';
    if (contEl) contEl.style.display = '';
  }
}

/* ─── TARİH YARDIMCILARI ──────────────────────────────────────────── */
function _histLabel(wb, filename, donem) {
  /* 1. Excel metadata */
  if (wb.Props && wb.Props.ModifiedDate) {
    try {
      var d = new Date(wb.Props.ModifiedDate);
      if (!isNaN(d.getTime()) && d.getFullYear() > 2020)
        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {}
  }
  /* 2. Dosya adından gün numarası + donem */
  var m = filename.match(/^(\d{1,2})\s/);
  if (m && donem && /\d{4}\/\d{2}/.test(donem)) {
    try {
      var pts = donem.split('/');
      var d2  = new Date(parseInt(pts[0]), parseInt(pts[1]) - 1, parseInt(m[1]));
      if (!isNaN(d2.getTime()))
        return d2.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {}
  }
  /* 3. Dosya adı */
  return filename.replace(/\.xlsx?$/i, '');
}

function _histISODate(wb, filename, donem) {
  if (wb.Props && wb.Props.ModifiedDate) {
    try {
      var d = new Date(wb.Props.ModifiedDate);
      if (!isNaN(d.getTime()) && d.getFullYear() > 2020) return d.toISOString().slice(0, 10);
    } catch (e) {}
  }
  var m = filename.match(/^(\d{1,2})\s/);
  if (m && donem && /\d{4}\/\d{2}/.test(donem)) {
    try {
      var pts = donem.split('/');
      var d2  = new Date(parseInt(pts[0]), parseInt(pts[1]) - 1, parseInt(m[1]));
      if (!isNaN(d2.getTime())) return d2.toISOString().slice(0, 10);
    } catch (e) {}
  }
  return new Date().toISOString().slice(0, 10);
}

function _truncGecm(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : (s || ''); }

/* ─── ANA RENDER ──────────────────────────────────────────────────── */
function renderGecmisPage() {
  var contEl  = document.getElementById('gecm-content');
  var emptyEl = document.getElementById('gecm-empty');

  if (!HIST_DATA) {
    if (contEl)  contEl.style.display  = 'none';
    if (emptyEl) { emptyEl.style.display = ''; emptyEl.innerHTML = _gecmWelcomeHTML(); }
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  if (contEl)  contEl.style.display  = '';

  if (_gecmView === 'trend') {
    contEl.innerHTML = _renderTrendView();
  } else {
    contEl.innerHTML = _renderKiyasView();
  }
}

/* ─── KIYAŞ GÖRÜNÜMÜ ─────────────────────────────────────────────── */
function _renderKiyasView() {
  var rows = _gecmKiyas === 'sy' ? _buildSYComp() : _buildBayiComp();

  /* Görünüm filtresi */
  if (_gecmGorunum === 'growth')  rows = rows.filter(function(r) { return r.hgoDiff !== null && r.hgoDiff > 0; });
  else if (_gecmGorunum === 'decline') rows = rows.filter(function(r) { return r.hgoDiff !== null && r.hgoDiff < 0; });

  /* Sıralama */
  rows.sort(function(a, b) {
    var aD = a.hgoDiff !== null ? a.hgoDiff : 0;
    var bD = b.hgoDiff !== null ? b.hgoDiff : 0;
    return _gecmGorunum === 'decline' ? aD - bD : bD - aD;
  });

  return _renderSummary(rows) + _renderCompCard(rows) + _renderExportBtn();
}

/* ─── BAYİ KARŞILAŞTIRMA VERİSİ ──────────────────────────────────── */
function _buildBayiComp() {
  var pm      = _gecmPM();
  var currRec = (DATA.bayi && DATA.bayi[pm.bayiKey]) || [];
  var histRec = (HIST_DATA && HIST_DATA.bayi && HIST_DATA.bayi[pm.bayiKey]) || [];

  /* İsme göre geçmiş harita */
  var histByName = {};
  histRec.forEach(function(r) { histByName[r.p] = r; });

  /* Detay h/a lookup'ları */
  var currDet = _detayLookup(DETAY, pm.detayKey);
  var histDet = _detayLookup(HIST_DETAY, pm.detayKey);

  return currRec.map(function(r) {
    var h       = histByName[r.p];
    var cD      = currDet[r.b];
    var hD      = h ? histDet[r.b] : null;

    var currA   = cD ? cD.a : null;
    var histA   = hD ? hD.a : null;
    var aDiff   = (currA !== null && histA !== null) ? currA - histA : null;
    var hgoDiff = h !== undefined ? Math.round((r.g - h.g) * 10) / 10 : null;

    return {
      name: r.p, sub: r.b, sy: r.sy,
      currHgo: r.g, histHgo: h ? h.g : null, hgoDiff: hgoDiff,
      currA: currA, histA: histA, aDiff: aDiff,
    };
  });
}

/* ─── SY KARŞILAŞTIRMA VERİSİ ────────────────────────────────────── */
function _buildSYComp() {
  if (!SYDATA || !SYDATA.sy) return [];
  var pm     = _gecmPM();
  var syKey  = pm.syKey;
  var currSY = SYDATA.sy;
  var histSY = (HIST_SYDATA && HIST_SYDATA.sy) ? HIST_SYDATA.sy : {};

  return Object.keys(currSY).map(function(nm) {
    var cur = currSY[nm][syKey] || {};
    var hst = (histSY[nm] && histSY[nm][syKey]) || null;

    var currA   = cur.a || 0;
    var histA   = hst ? (hst.a || 0) : null;
    var aDiff   = histA !== null ? currA - histA : null;
    var currH   = cur.h || 0;
    var currHgo = currH > 0 ? Math.round(currA / currH * 1000) / 10 : null;
    var histHgo = (hst && hst.h > 0) ? Math.round(hst.a / hst.h * 1000) / 10 : null;
    var hgoDiff = (currHgo !== null && histHgo !== null) ? Math.round((currHgo - histHgo) * 10) / 10 : null;

    return {
      name: nm, sub: '', sy: '',
      currHgo: currHgo, histHgo: histHgo, hgoDiff: hgoDiff,
      currA: currA, histA: histA, aDiff: aDiff,
    };
  });
}

function _detayLookup(detay, detayKey) {
  var map = {};
  if (!detay || !detay.bayiler) return map;
  for (var kod in detay.bayiler) {
    var b  = detay.bayiler[kod];
    var pd = b.prods[detayKey];
    if (pd) map[b.b] = pd; /* b.b = "4100343 · TOKAT" */
  }
  return map;
}

/* ─── EXECUTIVE ÖZET ─────────────────────────────────────────────── */
function _renderSummary(rows) {
  var pm        = _gecmPM();
  var label     = HIST_DATE_LABEL || (HIST_FNAME || '').replace(/\.xlsx?$/i, '');
  var today     = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  var entity    = _gecmKiyas === 'sy' ? 'satış yöneticisi' : 'bayi';

  var growing   = rows.filter(function(r) { return r.hgoDiff !== null && r.hgoDiff > 0; });
  var declining = rows.filter(function(r) { return r.hgoDiff !== null && r.hgoDiff < 0; });

  var bestRow = rows.reduce(function(max, r) {
    return (r.hgoDiff !== null && r.hgoDiff > (max.hgoDiff || -Infinity)) ? r : max;
  }, rows[0] || {});
  var worstRow = rows.reduce(function(min, r) {
    return (r.hgoDiff !== null && r.hgoDiff < (min.hgoDiff || Infinity)) ? r : min;
  }, rows[0] || {});

  var lines = [];
  lines.push(pm.label + ' ürününde <strong>' + label + '</strong> ile <strong>' + today + '</strong> arasında ' + rows.length + ' ' + entity + ' analiz edilmiştir.');

  if (growing.length > 0) {
    var l2 = '<span class="gecm-pos-txt">▲ ' + growing.length + ' ' + entity + ' büyüme göstermiştir.</span>';
    if (bestRow && bestRow.name && bestRow.aDiff > 0) {
      l2 += ' En yüksek artış <strong>' + bestRow.name + '</strong> için +' + bestRow.aDiff.toLocaleString('tr-TR') + ' adet olarak gerçekleşmiştir.';
    } else if (bestRow && bestRow.name && bestRow.hgoDiff > 0) {
      l2 += ' En yüksek HGO artışı <strong>' + bestRow.name + '</strong> için +%' + bestRow.hgoDiff.toFixed(1) + ' olmuştur.';
    }
    lines.push(l2);
  }

  if (declining.length > 0) {
    var l3 = '<span class="gecm-neg-txt">▼ ' + declining.length + ' ' + entity + ' gerileme yaşamıştır.</span>';
    if (worstRow && worstRow.name && worstRow.hgoDiff < 0) {
      l3 += ' En belirgin düşüş <strong>' + worstRow.name + '</strong> için -%' + Math.abs(worstRow.hgoDiff).toFixed(1) + ' HGO kaybı şeklindedir.';
    }
    lines.push(l3);
  }

  if (!growing.length && !declining.length) lines.push('Anlamlı bir değişim tespit edilememiştir.');

  return (
    '<div class="gecm-summary-card">' +
      '<div class="gecm-sum-hdr">Executive Özet &nbsp;·&nbsp; ' + pm.label + '</div>' +
      lines.map(function(l) { return '<div class="gecm-sum-line">' + l + '</div>'; }).join('') +
      '<div class="gecm-sum-meta">' + label + ' → ' + today + ' · ' + rows.length + ' ' + entity + '</div>' +
    '</div>'
  );
}

/* ─── KARŞILAŞTIRMA KARTI ─────────────────────────────────────────── */
function _renderCompCard(rows) {
  var pm    = _gecmPM();
  var kiyas = _gecmKiyas === 'sy' ? 'Satış Yöneticisi' : 'Bayi';
  var label = HIST_DATE_LABEL || '';

  var html = '<div class="gecm-comp-card" id="gecm-card">' +
    '<div class="gecm-comp-hdr">' +
      '<div class="gecm-ch-title">' + kiyas + ' Kıyası &nbsp;·&nbsp; ' + pm.label + '</div>' +
      '<div class="gecm-ch-sub">' + label + ' → Güncel</div>' +
    '</div>';

  if (!rows.length) {
    html += '<div class="gecm-empty-msg">Seçilen ürün için kıyas verisi bulunamadı.</div>';
    return html + '</div>';
  }

  rows.forEach(function(r, i) {
    var hgoCls  = r.hgoDiff === null ? '' : r.hgoDiff > 0 ? 'gecm-pos' : r.hgoDiff < 0 ? 'gecm-neg' : '';
    var aCls    = r.aDiff === null   ? '' : r.aDiff > 0   ? 'gecm-pos' : r.aDiff < 0   ? 'gecm-neg' : '';

    function fmtDiff(v, isHgo) {
      if (v === null) return '—';
      var prefix = v > 0 ? '+' : '';
      return prefix + (isHgo ? '%' + Math.abs(v).toFixed(1) : Math.abs(v).toLocaleString('tr-TR'));
    }
    function arrow(v) { return v === null ? '' : v > 0 ? ' ▲' : v < 0 ? ' ▼' : ''; }

    var podCls = (i < 3 && _gecmGorunum !== 'decline') ? ' gecm-row-p' + (i + 1) : '';

    html += '<div class="gecm-row' + podCls + '">' +
      '<div class="gecm-row-lft">' +
        '<span class="gecm-row-rank">' + (i + 1) + '</span>' +
        '<div class="gecm-row-info">' +
          '<div class="gecm-row-name">' + r.name + '</div>' +
          (r.sub ? '<div class="gecm-row-sub">' + r.sub + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="gecm-row-rgt">' +
        /* Aktivasyon */
        '<div class="gecm-metric">' +
          '<div class="gecm-m-flow">' +
            '<span class="gecm-m-h">' + (r.histA !== null ? r.histA.toLocaleString('tr-TR') : '—') + '</span>' +
            '<span class="gecm-m-arr">→</span>' +
            '<span class="gecm-m-c">' + (r.currA !== null ? r.currA.toLocaleString('tr-TR') : '—') + '</span>' +
          '</div>' +
          '<div class="gecm-m-diff ' + aCls + '">' + fmtDiff(r.aDiff, false) + arrow(r.aDiff) + '</div>' +
          '<div class="gecm-m-lbl">Aktiv.</div>' +
        '</div>' +
        /* HGO */
        '<div class="gecm-metric">' +
          '<div class="gecm-m-flow">' +
            '<span class="gecm-m-h">' + (r.histHgo !== null ? '%' + r.histHgo.toFixed(1) : '—') + '</span>' +
            '<span class="gecm-m-arr">→</span>' +
            '<span class="gecm-m-c ' + hgoCls + '">' + (r.currHgo !== null ? '%' + r.currHgo.toFixed(1) : '—') + '</span>' +
          '</div>' +
          '<div class="gecm-m-diff ' + hgoCls + '">' + fmtDiff(r.hgoDiff, true) + arrow(r.hgoDiff) + '</div>' +
          '<div class="gecm-m-lbl">HGO</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  });

  html += '</div>'; /* gecm-comp-card */
  return html;
}

/* ─── TREND GÖRÜNÜMÜ ─────────────────────────────────────────────── */
function _renderTrendView() {
  var pm    = _gecmPM();
  var store = trendLoad();
  var days  = Object.keys(store).sort();

  if (days.length < 2) {
    return '<div class="gecm-empty-msg">Trend için en az 2 günlük veri gerekiyor. Geçmiş raporları yükleyerek trend verisini zenginleştirin.</div>';
  }

  /* Bayi bazında son değişim */
  var scope  = _gecmKiyas === 'sy' ? 'bayi' : 'bayi'; /* her ikisi de bayi trend kullanır */
  var prodKey = pm.bayiKey;

  var entities = {};
  days.forEach(function(d) {
    var src = store[d] && store[d].bayi;
    if (!src) return;
    for (var nm in src) {
      if (src[nm][prodKey] !== undefined) {
        if (!entities[nm]) entities[nm] = [];
        entities[nm].push({ d: d, v: src[nm][prodKey] });
      }
    }
  });

  var items = Object.keys(entities).map(function(nm) {
    var pts   = entities[nm];
    var first = pts[0].v, last = pts[pts.length - 1].v;
    return { name: nm, first: first, last: last, diff: Math.round((last - first) * 10) / 10 };
  }).sort(function(a, b) { return b.diff - a.diff; });

  var top5    = items.slice(0, 5);
  var bottom5 = items.slice(-5).reverse();

  function tRow(r, i) {
    var cls = r.diff > 0 ? 'gecm-pos' : r.diff < 0 ? 'gecm-neg' : '';
    var arrow = r.diff > 0 ? '▲' : r.diff < 0 ? '▼' : '—';
    return '<div class="gecm-t-row">' +
      '<span class="gecm-t-rank">' + (i + 1) + '</span>' +
      '<div class="gecm-t-nm">' + r.name + '</div>' +
      '<div class="gecm-t-val ' + cls + '">' + arrow + '&thinsp;' + (r.diff > 0 ? '+' : '') + '%' + Math.abs(r.diff).toFixed(1) + '</div>' +
    '</div>';
  }

  var firstDay = days[0], lastDay = days[days.length - 1];

  return (
    '<div class="gecm-trend-info">' +
      '<span class="gecm-t-period">' + firstDay + ' → ' + lastDay + '</span>' +
      '<span class="gecm-t-cnt">' + days.length + ' gün &nbsp;·&nbsp; ' + pm.label + '</span>' +
    '</div>' +
    '<div class="gecm-comp-card">' +
      '<div class="gecm-comp-hdr"><div class="gecm-ch-title">▲ En Çok Büyüyen</div></div>' +
      top5.map(tRow).join('') +
    '</div>' +
    '<div class="gecm-comp-card" style="margin-top:8px">' +
      '<div class="gecm-comp-hdr"><div class="gecm-ch-title">▼ En Çok Düşen</div></div>' +
      bottom5.map(tRow).join('') +
    '</div>' +
    _renderExportBtn()
  );
}

/* ─── EXPORT BUTONU ───────────────────────────────────────────────── */
function _renderExportBtn() {
  var shareIco = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';
  return (
    '<div class="gecm-export-row">' +
      '<button class="gecm-export-btn" onclick="downloadGecmisPNG()">' +
        shareIco + '&nbsp;Paylaşım Görseli Oluştur' +
      '</button>' +
    '</div>'
  );
}

/* ─── PNG EXPORT ──────────────────────────────────────────────────── */
async function downloadGecmisPNG() {
  var btn = document.querySelector('.gecm-export-btn');
  var origHTML = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Oluşturuluyor…'; }

  try {
    await ensureH2C();
    var el = document.getElementById('gecm-card') || document.getElementById('gecm-content');
    if (!el) throw new Error('Kıyas kartı bulunamadı');

    var pm      = _gecmPM();
    var kiyas   = _gecmKiyas === 'sy' ? 'SY' : 'Bayi';
    var prodKey = pm.key.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/g, '');
    var dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '');
    var fname   = 'TT_GecmisKiyas_' + kiyas + '_' + prodKey + '_' + dateStr + '.png';

    var canvas = await html2canvas(el, {
      scale: 2.5, backgroundColor: '#ffffff',
      useCORS: true, logging: false, scrollX: 0, scrollY: 0,
    });

    _openSharePreview(canvas.toDataURL('image/png'), fname);
  } catch (e) {
    alert('Görsel hatası: ' + e.message);
  }

  if (btn) { btn.disabled = false; btn.innerHTML = origHTML; }
}

/* ─── WELCOME EKRANI ─────────────────────────────────────────────── */
function _gecmWelcomeHTML() {
  var files = (_histManifest && _histManifest.files) || [];
  var hasFiles = files.length > 0;

  return (
    '<div class="gecm-welcome">' +
      '<div class="gecm-wl-icon">📊</div>' +
      '<div class="gecm-wl-title">Geçmiş Kıyas ve Trend Merkezi</div>' +
      (hasFiles
        ? '<div class="gecm-wl-sub">' + files.length + ' geçmiş rapor mevcut. Üstteki <strong>Tarih</strong> filtresinden bir rapor seçin.</div>'
        : '<div class="gecm-wl-sub">Karşılaştırma için geçmiş rapor bulunamadı.</div>' +
          '<div class="gecm-wl-hint">' +
            'Günlük raporları <code>data/history/</code> klasörüne ekleyin, ardından <code>manifest.json</code> dosyasında dosya adını listeleyin.' +
          '</div>') +
    '</div>'
  );
}

/* ─── AYARLAR: GEÇMİŞ RAPOR YÖNETİMİ ────────────────────────────── */
function renderHistorySettings() {
  var el = document.getElementById('hist-settings-content');
  if (!el) return;

  var files = (_histManifest && _histManifest.files) || [];

  if (!files.length) {
    el.innerHTML = '<div class="hist-s-empty">data/history/ klasöründe rapor bulunamadı.<br>manifest.json dosyasına dosya adlarını ekleyin.</div>';
    return;
  }

  el.innerHTML = files.map(function(fname) {
    var isLoaded = HIST_FNAME === fname;
    var label    = fname.replace(/\.xlsx?$/i, '');
    return (
      '<div class="hist-s-row' + (isLoaded ? ' hist-s-active' : '') + '">' +
        '<span class="hist-s-icon">' + (isLoaded ? '✅' : '📄') + '</span>' +
        '<div class="hist-s-info">' +
          '<div class="hist-s-name">' + label + '</div>' +
          '<div class="hist-s-file">' + fname + '</div>' +
        '</div>' +
        (isLoaded ? '<span class="hist-s-badge">Yüklü</span>' : '') +
      '</div>'
    );
  }).join('');
}

/* ─── SAYFA INIT ──────────────────────────────────────────────────── */
async function initHistoryPage() {
  if (!_histManifest) await loadHistManifest();
  renderGecmisPage();
}
