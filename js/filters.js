/* ════════════════════════════════════════════
   js/filters.js
   Kompakt filtre çubuğu + Bottom Sheet modal
   Bayi ve Personel ekranları için.
   ════════════════════════════════════════════ */

/* ─── DURUM DEĞİŞKENLERİ ─────────────────── */
var bayiFilter    = "Tümü";   // Personel: hangi bayiye ait
var riskOnly      = false;    // Sadece HGO < 60 olanlar
var compactListeN = 999;      // Bayi listesi sınırı

var _sheetType    = null;     // Açık sheet tipi
var _listeLabel   = "Tüm Liste";   // Liste buton etiketi
var _prevNavPage  = null;     // Sayfa geçişi takibi

/* ─── FİLTRE ÇUBUĞU OLUŞTURUCUsu ──────────── */
function buildFilterBar() {
  var bar = document.getElementById('compact-filter-bar');
  if (!bar) return;

  var isBayi = (navPage === 'bayi');
  var isPers  = (navPage === 'pers');
  if (!isBayi && !isPers) { bar.innerHTML = ''; return; }

  /* Mevcut seçili değerlerin etiketleri */
  var prodLabel = _fbarProdLabel();
  var syLabel   = (sy === "Tümü") ? "Tümü" : _truncate(sy.split(" ")[0], 10);

  var html = '';

  /* Ürün */
  html += _fbarChip('prod', 'Ürün', prodLabel);
  /* SY */
  html += _fbarChip('sy', 'Satış Yön.', syLabel);
  /* Bayi (sadece personel) */
  if (isPers) {
    var bLabel = (bayiFilter === "Tümü") ? "Tümü" : _truncate(bayiFilter, 11);
    html += _fbarChip('bayi', 'Bayi', bLabel);
  }
  /* Liste */
  html += _fbarChip('liste', 'Liste', _listeLabel);
  /* İndir */
  html += '<button class="fbar-chip fbar-dl" id="fbar-dl-btn" onclick="downloadCardPNG()">' +
    '<span class="fbar-chip-lbl">İndir</span>' +
    '<span class="fbar-chip-val">PNG ↓</span>' +
  '</button>';

  bar.innerHTML = html;
}

function _fbarChip(type, label, value) {
  return '<button class="fbar-chip" onclick="openSheet(\'' + type + '\')">' +
    '<span class="fbar-chip-lbl">' + label + '</span>' +
    '<span class="fbar-chip-val" id="fc-' + type + '">' + value + '</span>' +
  '</button>';
}

function _fbarProdLabel() {
  var prods = (navPage === 'bayi') ? PRODS.bayi : PRODS.pers;
  var found = prods.find(function(p) { return p.key === prod; });
  return found ? _truncate(found.key, 12) : _truncate(prod, 12);
}

function _truncate(str, n) {
  return str && str.length > n ? str.slice(0, n) + '…' : str;
}

/* ─── BOTTOM SHEET AÇMA / KAPATMA ──────────── */
function openSheet(type) {
  _sheetType = type;

  var overlay = document.getElementById('sheet-overlay');
  var sheet   = document.getElementById('bottom-sheet');
  var titleEl = document.getElementById('sheet-title');
  var searchW = document.getElementById('sheet-search-wrap');
  var searchI = document.getElementById('sheet-search');

  /* Arama alanını sıfırla */
  if (searchI) searchI.value = '';
  searchW.style.display = 'none';

  /* Başlık */
  var cfg = _sheetConfig(type);
  titleEl.textContent = cfg.title;

  /* Bayi seçimi için arama alanı göster */
  if (type === 'bayi' && navPage === 'pers') {
    searchW.style.display = '';
    searchI.oninput = function() { _renderOpts(type, this.value); };
  }

  _renderOpts(type, '');

  /* Aç */
  overlay.classList.add('open');
  sheet.classList.add('open');
  document.body.style.overflow = 'hidden';

  /* Arama alanına odaklan */
  if (type === 'bayi' && searchI) {
    setTimeout(function() { searchI.focus(); }, 350);
  }
}

function closeSheet() {
  document.getElementById('sheet-overlay').classList.remove('open');
  document.getElementById('bottom-sheet').classList.remove('open');
  document.body.style.overflow = '';
  _sheetType = null;
}

/* ─── SHEET OPSİYON YAPILANDIRMASI ─────────── */
function _sheetConfig(type) {
  if (type === 'prod') {
    var prods = (navPage === 'bayi') ? PRODS.bayi : PRODS.pers;
    return {
      title: 'Ürün Seç',
      items: prods.map(function(p) {
        return { key: p.key, label: p.icon + ' ' + p.key };
      }),
      active: prod,
    };
  }

  if (type === 'sy') {
    return {
      title: 'Satış Yöneticisi',
      items: syList().map(function(s) {
        return { key: s, label: s === "Tümü" ? "👥 Tümü" : "👔 " + s };
      }),
      active: sy,
    };
  }

  if (type === 'bayi') {
    /* Tüm personel kayıtlarından bayi adlarını topla */
    var bayiSet = new Set(['Tümü']);
    PRODS.pers.forEach(function(p) {
      (DATA.pers[p.key] || []).forEach(function(r) { if (r.b) bayiSet.add(r.b); });
    });
    var bayiList = Array.from(bayiSet).sort(function(a, b) {
      if (a === "Tümü") return -1; if (b === "Tümü") return 1;
      return a.localeCompare(b, 'tr');
    });
    return {
      title: 'Bayi Seç',
      items: bayiList.map(function(b) {
        return { key: b, label: b === "Tümü" ? "🏢 Tümü" : b };
      }),
      active: bayiFilter,
    };
  }

  if (type === 'liste') {
    var items;
    if (navPage === 'bayi') {
      items = [
        { key: 'all',    label: 'Tüm Liste' },
        { key: 'top10',  label: 'İlk 10' },
        { key: 'top20',  label: 'İlk 20' },
        { key: 'risk',   label: '🔴 Riskli Bayiler — HGO %60 altı' },
      ];
    } else {
      items = [
        { key: 'both15', label: 'İlk / Son 15' },
        { key: 'top10',  label: 'İlk 10' },
        { key: 'bot10',  label: 'Son 10' },
        { key: 'both20', label: 'İlk / Son 20' },
        { key: 'all',    label: 'Tüm Liste' },
        { key: 'risk',   label: '🔴 Riskli Personeller — HGO %60 altı' },
      ];
    }
    return { title: 'Liste Seçenekleri', items: items, active: _currentListeKey() };
  }

  return { title: '', items: [], active: null };
}

function _currentListeKey() {
  if (riskOnly) return 'risk';
  if (navPage === 'bayi') {
    if (compactListeN === 10)  return 'top10';
    if (compactListeN === 20)  return 'top20';
    return 'all';
  }
  var nsel = document.getElementById('nsel');
  var n = nsel ? parseInt(nsel.value) : 15;
  if (view === 'top'  && n === 10)  return 'top10';
  if (view === 'bot'  && n === 10)  return 'bot10';
  if (view === 'both' && n === 20)  return 'both20';
  if (n >= 999)                     return 'all';
  return 'both15';
}

/* ─── OPSİYONLARI RENDER ET ─────────────────── */
function _renderOpts(type, query) {
  var cfg  = _sheetConfig(type);
  var q    = (query || '').toLowerCase().trim();
  var list = cfg.items.filter(function(it) {
    return !q || it.label.toLowerCase().indexOf(q) !== -1;
  });
  var opts = document.getElementById('sheet-options');
  if (!opts) return;
  opts.innerHTML = list.map(function(it) {
    var active = (it.key === cfg.active);
    return '<div class="sheet-opt' + (active ? ' sheet-opt-on' : '') + '" ' +
      'onclick="_pick(\'' + type + '\',\'' + _esc(it.key) + '\')">' +
      '<span class="sheet-opt-txt">' + it.label + '</span>' +
      (active ? '<span class="sheet-opt-chk">✓</span>' : '') +
    '</div>';
  }).join('');
}

function _esc(s) { return s.replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }

/* ─── OPSİYON SEÇİMİ ───────────────────────── */
function _pick(type, key) {
  if (type === 'prod') {
    setProd(key);

  } else if (type === 'sy') {
    setSy(key);

  } else if (type === 'bayi') {
    bayiFilter = key;
    render();

  } else if (type === 'liste') {
    _applyListe(key);
  }

  closeSheet();
}

function _applyListe(key) {
  riskOnly = false;
  var nsel = document.getElementById('nsel');

  if (navPage === 'bayi') {
    if      (key === 'top10') { compactListeN = 10;  _listeLabel = 'İlk 10'; }
    else if (key === 'top20') { compactListeN = 20;  _listeLabel = 'İlk 20'; }
    else if (key === 'risk')  { compactListeN = 999; riskOnly = true; _listeLabel = 'Riskli'; }
    else                      { compactListeN = 999; _listeLabel = 'Tüm Liste'; }
    render();

  } else {
    /* Personel */
    if      (key === 'top10')  { setView('top');  if (nsel) nsel.value = 10;  _listeLabel = 'İlk 10'; }
    else if (key === 'bot10')  { setView('bot');  if (nsel) nsel.value = 10;  _listeLabel = 'Son 10'; }
    else if (key === 'both20') { setView('both'); if (nsel) nsel.value = 20;  _listeLabel = 'İlk/Son 20'; }
    else if (key === 'all')    { setView('both'); if (nsel) nsel.value = 999; _listeLabel = 'Tüm Liste'; }
    else if (key === 'risk')   { riskOnly = true; if (nsel) nsel.value = 999; setView('both'); _listeLabel = 'Riskli'; }
    else                       { setView('both'); if (nsel) nsel.value = 15;  _listeLabel = 'İlk/Son 15'; }
    /* setView() zaten render() çağırır */
  }
}

/* ─── SAYFA GEÇİŞİNDE SIFIRLA ──────────────── */
function resetFiltersForPage(page) {
  if (page === _prevNavPage) return;
  _prevNavPage = page;

  if (page === 'bayi') {
    riskOnly = false; compactListeN = 999; _listeLabel = 'Tüm Liste';
    bayiFilter = "Tümü";
  } else if (page === 'pers') {
    riskOnly = false; compactListeN = 999; _listeLabel = 'İlk/Son 15';
    bayiFilter = "Tümü";
    var nsel = document.getElementById('nsel');
    if (nsel) nsel.value = 15;
    view = 'top';
  }
}

/* ─── PNG İNDİR ─────────────────────────────── */
async function downloadCardPNG() {
  var btn = document.getElementById('fbar-dl-btn');
  var valEl = btn ? btn.querySelector('.fbar-chip-val') : null;
  var orig = valEl ? valEl.textContent : 'PNG ↓';
  if (btn) { btn.disabled = true; if (valEl) valEl.textContent = '⏳'; }

  try {
    await ensureH2C();

    /* Hedef element: mevcut kart */
    var el = document.getElementById('card-main') ||
             document.querySelector('#cards .card') ||
             document.querySelector('.card');
    if (!el) throw new Error('Kart bulunamadı');

    var scope   = (navPage === 'bayi') ? 'Bayi' : 'Personel';
    var prodKey = prod.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/g, '');
    var dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '');
    var fname   = 'TT_' + scope + '_Siralama_' + prodKey + '_' + dateStr + '.png';

    var canvas = await html2canvas(el, {
      scale: 2.5,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      scrollX: 0, scrollY: 0,
    });

    showModal(canvas.toDataURL('image/png'), fname);
  } catch (e) {
    alert('PNG hatası: ' + e.message);
  }

  if (btn) { btn.disabled = false; }
  if (valEl) valEl.textContent = orig;
}
