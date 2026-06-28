/* ════════════════════════════════════════════
   js/filters.js
   Kompakt filtre çubuğu + Bottom Sheet modal
   Bayi ve Personel ekranları için.
   ════════════════════════════════════════════ */

/* ─── DURUM DEĞİŞKENLERİ ─────────────────── */
var bayiFilter    = "Tümü";
var riskOnly      = false;
var compactListeN = 999;
var syListMode    = 'all';   // SY liste modu

var _sheetType    = null;
var _listeLabel   = "Tüm Liste";
var _syListeLabel = 'Tümü';
var _prevNavPage  = null;

/* ─── SPRINT 9: Personel ek durum ───────── */
var perfFilter  = 'all';
var persSearch  = '';
var _perfLabel  = 'Hepsi';
var _fcSort     = false;

/* SY ürün görüntü isimleri */
var _SY_DISPLAY = {
  'Mobil Toplam':  '📱 Toplam Mobil',
  'Faturalı':      '📋 Faturalı (Postpaid)',
  'Faturasız':     '📲 Faturasız (Prepaid)',
  'Evde İnternet': '🌐 DSL / Evde İnternet',
  'IPTV':          '📺 IPTV',
  'Uydu':          '📡 Uydu TV',
  'Tivibu Toplam': '📺 Tivibu Toplam',
  'Cihaz':         '📦 Akıllı Cihaz',
  'Cihaz Diğer':   '🔌 Diğer Cihaz',
};
var _SY_SHORT = {
  'Mobil Toplam':  'Toplam Mobil',
  'Faturalı':      'Faturalı',
  'Faturasız':     'Faturasız',
  'Evde İnternet': 'DSL',
  'IPTV':          'IPTV',
  'Uydu':          'Uydu TV',
  'Tivibu Toplam': 'Tivibu',
  'Cihaz':         'Akıllı Cihaz',
  'Cihaz Diğer':   'Diğer Cihaz',
};

/* ─── FİLTRE ÇUBUĞU OLUŞTURUCUsu ──────────── */
function buildFilterBar() {
  var bar = document.getElementById('compact-filter-bar');
  if (!bar) return;

  var isBayi   = (navPage === 'bayi');
  var isPers   = (navPage === 'pers');
  var isSY     = (navPage === 'sy');
  var isMatrix = (navPage === 'perf' && typeof section !== 'undefined' && section === 'matrix');

  if (!isBayi && !isPers && !isSY && !isMatrix) { bar.innerHTML = ''; return; }

  if (isMatrix) {
    bar.setAttribute('data-pg', 'matrix');
    bar.innerHTML =
      '<button class="fbar-chip fbar-dl" id="fbar-dl-btn" onclick="downloadMatrixPNG()">' +
        '<span class="fbar-chip-lbl">Görsel</span>' +
        '<span class="fbar-chip-val">Oluştur ↗</span>' +
      '</button>';
    return;
  }

  var html = '';

  if (isSY) {
    /* ── Satış Yöneticisi filtre çubuğu ── */
    var syProdShort = _SY_SHORT[syProd] || _truncate(syProd, 12) || 'Seç';
    html += _fbarChip('sy-prod',  'Ürün',  syProdShort);
    html += _fbarChip('sy-liste', 'Liste', _syListeLabel);

  } else if (isBayi && typeof KANAL !== 'undefined' && KANAL === 'EDM') {
    /* ── EDM Bayiler filtre çubuğu (aktivasyon bazlı) ── */
    var edmProdLabel = _fbarProdLabel();
    var edmSyLabel   = (typeof EDM_SY_FILTER !== 'undefined' && EDM_SY_FILTER !== 'Tümü')
      ? _truncate(EDM_SY_FILTER.split(' ')[0], 9) : 'Tümü';
    var edmIlLabel   = (typeof EDM_IL_FILTER !== 'undefined' && EDM_IL_FILTER !== 'Tümü')
      ? _truncate(EDM_IL_FILTER, 9) : 'Tümü';
    html += _fbarChip('prod',      'Ürün',        edmProdLabel);
    html += _fbarChip('edm-sy',    'Satış Yön.',  edmSyLabel);
    html += _fbarChip('edm-bt',    'Bayi Tipi',   typeof EDM_FILTER !== 'undefined' ? EDM_FILTER : 'Tümü');
    html += _fbarChip('edm-il',    'İl',          edmIlLabel);
    html += _fbarChip('liste',     'Liste',        _listeLabel);

  } else if (isPers && typeof KANAL !== 'undefined' && KANAL === 'EDM') {
    /* ── EDM Personel filtre çubuğu (satış temsilcisi bazlı) ── */
    var edmPersProdLabel = _fbarProdLabel();
    var edmPersSyLabel   = (typeof EDM_SY_FILTER !== 'undefined' && EDM_SY_FILTER !== 'Tümü')
      ? _truncate(EDM_SY_FILTER.split(' ')[0], 9) : 'Tümü';
    var edmPersIlLabel   = (typeof EDM_IL_FILTER !== 'undefined' && EDM_IL_FILTER !== 'Tümü')
      ? _truncate(EDM_IL_FILTER, 9) : 'Tümü';
    html += _fbarChip('prod',   'Ürün',       edmPersProdLabel);
    html += _fbarChip('edm-sy', 'Satış Yön.', edmPersSyLabel);
    html += _fbarChip('edm-bt', 'Bayi Tipi',  typeof EDM_FILTER !== 'undefined' ? EDM_FILTER : 'Tümü');
    html += _fbarChip('edm-il', 'İl',         edmPersIlLabel);
    html += _fbarChip('liste',  'Liste',       _listeLabel);

  } else {
    /* ── Bayi / Personel filtre çubuğu ── */
    var prodLabel = _fbarProdLabel();
    var syLabel   = (sy === "Tümü") ? "Tümü" : _truncate(sy.split(" ")[0], 10);

    html += _fbarChip('prod', 'Ürün', prodLabel);
    html += _fbarChip('sy', 'Satış Yön.', syLabel);
    if (isPers) {
      var bLabel = (bayiFilter === "Tümü") ? "Tümü" : _truncate(bayiFilter, 11);
      html += _fbarChip('bayi', 'Bayi', bLabel);
      html += _fbarChip('perf', 'Performans', _perfLabel);
      html += _fbarChip('pers-sort', 'Sıralama', _fcSort ? 'Forecast' : 'HGO');
    }
    html += _fbarChip('liste', 'Liste', _listeLabel);
  }

  /* Görsel Oluştur — tüm ekranlarda */
  html += '<button class="fbar-chip fbar-dl" id="fbar-dl-btn" onclick="downloadCardPNG()">' +
    '<span class="fbar-chip-lbl">Görsel</span>' +
    '<span class="fbar-chip-val">Oluştur ↗</span>' +
  '</button>';

  /* Personel arama kutusu — TTM pers için, EDM pers için gösterilmez */
  var isEdmPers = isPers && typeof KANAL !== 'undefined' && KANAL === 'EDM';
  if (isPers && !isEdmPers) {
    html = '<div class="fbar-chips-wrap">' + html + '</div>' +
      '<div class="fbar-search-row">' +
      '<input type="text" class="fbar-search-inp" id="fbar-search-inp" ' +
      'placeholder="🔍 Personel ara..." oninput="setPersonelSearch(this.value)"' +
      (persSearch ? ' value="' + persSearch.replace(/"/g, '&quot;') + '"' : '') + '>' +
      '</div>';
  }

  bar.setAttribute('data-pg',
    (isBayi && (typeof KANAL === 'undefined' || KANAL !== 'EDM')) ? 'bayi' :
    isPers ? 'pers' : ''
  );
  bar.innerHTML = html;
  _updateBayiSub();
  _updatePersSub();
}

function _updateBayiSub() {
  if (typeof navPage === 'undefined' || navPage !== 'bayi') return;
  var sub = document.getElementById('data-page-sub');
  if (!sub) return;
  var isEDM = typeof KANAL !== 'undefined' && KANAL === 'EDM';
  var prodKey = (typeof prod !== 'undefined' && prod) ? prod : 'Toplam Mobil';
  var syName  = (typeof sy !== 'undefined' && sy !== 'Tümü') ? ' · ' + sy.split(' ')[0] : '';
  var riskTag = (typeof riskOnly !== 'undefined' && riskOnly) ? ' · Riskli' : '';
  var arr = isEDM
    ? (typeof EDM_DATA !== 'undefined' && EDM_DATA && EDM_DATA.bayi ? (EDM_DATA.bayi[prodKey] || []) : [])
    : (typeof DATA !== 'undefined' && DATA && DATA.bayi ? (DATA.bayi[prodKey] || []) : []);
  var n = (typeof compactListeN !== 'undefined' && compactListeN < 999) ? Math.min(arr.length, compactListeN) : arr.length;
  sub.textContent = (isEDM ? 'EDM' : 'TTM') + ' · ' + prodKey + syName + riskTag + ' · ' + n + ' Bayi';
}

function _updatePersSub() {
  if (typeof navPage === 'undefined' || navPage !== 'pers') return;
  var sub = document.getElementById('data-page-sub');
  if (!sub) return;
  var prodKey = (typeof prod !== 'undefined' && prod) ? prod : 'Toplam Mobil';
  var isEDM = typeof KANAL !== 'undefined' && KANAL === 'EDM';
  if (isEDM) {
    var _PERS_TO_EDM = { 'Faturalı': 'Postpaid', 'Faturasız': 'Prepaid', 'Cihaz': 'Akıllı Cihaz' };
    var edmKey  = _PERS_TO_EDM[prodKey] || prodKey;
    var edmRecs = (typeof EDM_DATA !== 'undefined' && EDM_DATA && EDM_DATA.bayi) ? (EDM_DATA.bayi[edmKey] || []) : [];
    var btTag   = (typeof EDM_FILTER !== 'undefined' && EDM_FILTER !== 'Tümü') ? ' · ' + EDM_FILTER : '';
    var syTag   = (typeof EDM_SY_FILTER !== 'undefined' && EDM_SY_FILTER !== 'Tümü') ? ' · ' + EDM_SY_FILTER.split(' ')[0] : '';
    sub.textContent = 'EDM · ' + edmKey + btTag + syTag + ' · ' + edmRecs.length + ' bayi';
    return;
  }
  var arr = (typeof DATA !== 'undefined' && DATA && DATA.pers) ? (DATA.pers[prodKey] || []) : [];
  var n = (typeof filt === 'function') ? filt(arr).length : arr.length;
  var syName = (typeof sy !== 'undefined' && sy !== 'Tümü') ? sy : '';
  var perfTag = (perfFilter && perfFilter !== 'all') ? ' · ' + _perfLabel : '';
  var searchTag = persSearch ? ' · "' + persSearch + '"' : '';
  if (syName) {
    sub.textContent = prodKey + ' · ' + syName.split(' ')[0] + ' · ' + n + ' Personel' + perfTag + searchTag;
  } else {
    sub.textContent = prodKey + ' · ' + n + ' Personel' + perfTag + searchTag;
  }
}

function setPersonelSearch(val) {
  persSearch = (val || '').trim();
  render();
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

  /* ── SY ürün filtresi ── */
  if (type === 'sy-prod') {
    var syProds = (SYDATA && SYDATA.products && SYDATA.products.length)
      ? SYDATA.products
      : ['Mobil Toplam'];
    return {
      title: 'Ürün Seç',
      items: syProds.map(function(p) {
        return { key: p, label: _SY_DISPLAY[p] || p };
      }),
      active: syProd,
    };
  }

  /* ── SY liste filtresi ── */
  if (type === 'sy-liste') {
    return {
      title: 'Liste Seçenekleri',
      items: [
        { key: 'all',  label: 'Tümü' },
        { key: 'top10', label: 'En Yüksek 10' },
        { key: 'bot10', label: 'En Düşük 10' },
        { key: 'risk',  label: '🔴 Riskli Yöneticiler — HGO %80 altı' },
      ],
      active: syListMode,
    };
  }

  if (type === 'liste') {
    var items;
    var isEdmPersList = navPage === 'pers' && typeof KANAL !== 'undefined' && KANAL === 'EDM';
    if (navPage === 'bayi' || isEdmPersList) {
      items = [
        { key: 'all',    label: 'Tüm Liste' },
        { key: 'top10',  label: 'İlk 10' },
        { key: 'top20',  label: 'İlk 20' },
        { key: 'risk',   label: '🔴 Riskli Bayiler — HGO %60 altı' },
      ];
      if (isEdmPersList) items = items.filter(function(it) { return it.key !== 'risk'; });
    } else {
      items = [
        { key: 'top10',  label: 'İlk 10' },
        { key: 'top15',  label: 'İlk 15' },
        { key: 'bot10',  label: 'Son 10' },
        { key: 'bot15',  label: 'Son 15' },
        { key: 'all',    label: 'Tüm Liste' },
      ];
    }
    return { title: 'Liste Seçenekleri', items: items, active: _currentListeKey() };
  }

  /* ── Sprint 9: Performans filtresi ── */
  if (type === 'perf') {
    return {
      title: 'Performans Filtresi',
      items: [
        { key: 'all',     label: '👥 Hepsi' },
        { key: '120p',    label: '🔥 %120 ve üstü — Üst Performans' },
        { key: '100p',    label: '🚀 %100 ve üstü — Hedef Üstü' },
        { key: '80-100',  label: '👍 %80–100 — Stabil' },
        { key: '70-80',   label: '⚠ %70–80 — Risk Bölgesi' },
        { key: '70m',     label: '🔴 %70 altı — Kritik' },
      ],
      active: perfFilter,
    };
  }

  /* ── Sprint 9: Sıralama (HGO / Forecast) ── */
  if (type === 'pers-sort') {
    return {
      title: 'Sıralama',
      items: [
        { key: 'hgo', label: '📊 HGO Sıralaması' },
        { key: 'fc',  label: '🔮 Forecast Sıralaması' },
      ],
      active: _fcSort ? 'fc' : 'hgo',
    };
  }

  /* ── EDM Bayiler SY filtresi ── */
  if (type === 'edm-sy') {
    return {
      title: 'Satış Yöneticisi (EDM)',
      items: (typeof EDM_SY_NAMES !== 'undefined' ? EDM_SY_NAMES : ['Tümü']).map(function(s) {
        return { key: s, label: s === 'Tümü' ? '👥 Tümü' : '👔 ' + s };
      }),
      active: typeof EDM_SY_FILTER !== 'undefined' ? EDM_SY_FILTER : 'Tümü',
    };
  }

  /* ── EDM Bayi Tipi filtresi ── */
  if (type === 'edm-bt') {
    return {
      title: 'Bayi Tipi',
      items: [
        { key: 'Tümü', label: '🏢 Tümü (TTBN + ESN)' },
        { key: 'TTBN', label: '🔵 TTBN' },
        { key: 'ESN',  label: '🟣 ESN' },
      ],
      active: EDM_FILTER,
    };
  }

  /* ── EDM İl filtresi ── */
  if (type === 'edm-il') {
    var ilSet = new Set(['Tümü']);
    if (typeof EDM_DATA !== 'undefined' && EDM_DATA && EDM_DATA.bayi) {
      var ilRecs = EDM_DATA.bayi['Toplam Mobil'] || [];
      ilRecs.forEach(function(r) { if (r.il) ilSet.add(r.il); });
    }
    var ilList = Array.from(ilSet).sort(function(a, b) {
      if (a === 'Tümü') return -1; if (b === 'Tümü') return 1;
      return a.localeCompare(b, 'tr');
    });
    return {
      title: 'İl Seç',
      items: ilList.map(function(il) {
        return { key: il, label: il === 'Tümü' ? '📍 Tümü' : '📍 ' + il };
      }),
      active: typeof EDM_IL_FILTER !== 'undefined' ? EDM_IL_FILTER : 'Tümü',
    };
  }

  /* ── Geçmiş Kıyas filtreleri ── */
  if (type === 'gecm-tarih') {
    var files = (_histManifest && _histManifest.files) || [];
    if (!files.length) return { title: 'Geçmiş Rapor Seç', items: [{ key: '__none', label: 'Henüz rapor yüklenmedi' }], active: HIST_FNAME };
    return {
      title: 'Geçmiş Rapor Seç',
      items: files.map(function(f) {
        var lbl = f.replace(/\.xlsx?$/i, '');
        return { key: f, label: '📄 ' + lbl };
      }),
      active: HIST_FNAME,
    };
  }

  if (type === 'gecm-kiyas') {
    return {
      title: 'Kıyas Türü',
      items: [
        { key: 'bayi', label: '🏢 Bayi' },
        { key: 'sy',   label: '👔 Satış Yöneticisi' },
      ],
      active: _gecmKiyas,
    };
  }

  if (type === 'gecm-prod') {
    return {
      title: 'Ürün Seç',
      items: (typeof _GECM_PRODS !== 'undefined' ? _GECM_PRODS : []).map(function(p) {
        return { key: p.key, label: p.label };
      }),
      active: _gecmProd,
    };
  }

  if (type === 'gecm-gorunum') {
    return {
      title: 'Görünüm',
      items: [
        { key: 'all',     label: 'Tümü' },
        { key: 'growth',  label: '▲ En Çok Büyüyen' },
        { key: 'decline', label: '▼ En Çok Düşen' },
      ],
      active: _gecmGorunum,
    };
  }

  if (type === 'gecm-view') {
    return {
      title: 'Mod',
      items: [
        { key: 'kiyas', label: '⚖️ Kıyas (2 rapor karşılaştırma)' },
        { key: 'trend', label: '📈 Trend Merkezi (günlük trend)' },
      ],
      active: _gecmView,
    };
  }

  return { title: '', items: [], active: null };
}

function _currentListeKey() {
  if (riskOnly) return 'risk';
  var isEdmPers = navPage === 'pers' && typeof KANAL !== 'undefined' && KANAL === 'EDM';
  if (navPage === 'bayi' || isEdmPers) {
    if (compactListeN === 10)  return 'top10';
    if (compactListeN === 20)  return 'top20';
    return 'all';
  }
  var nsel = document.getElementById('nsel');
  var n = nsel ? parseInt(nsel.value) : 15;
  if (view === 'top'  && n === 10)  return 'top10';
  if (view === 'top'  && n === 15)  return 'top15';
  if (view === 'bot'  && n === 10)  return 'bot10';
  if (view === 'bot'  && n === 15)  return 'bot15';
  if (view === 'both' && n === 20)  return 'both20';
  if (n >= 999)                     return 'all';
  return 'top15';
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

  /* ── EDM picks ── */
  } else if (type === 'edm-sy') {
    if (typeof setEdmSy === 'function') setEdmSy(key);
    render();

  } else if (type === 'edm-bt') {
    if (typeof setEdmFilter === 'function') setEdmFilter(key);

  } else if (type === 'edm-il') {
    if (typeof setEdmIl === 'function') setEdmIl(key);

  /* ── Geçmiş Kıyas picks ── */
  } else if (type === 'gecm-tarih') {
    if (key !== '__none') loadHistFile(key);

  } else if (type === 'gecm-kiyas') {
    _gecmKiyas = key;
    var kv = document.getElementById('gecm-kiyas-val');
    if (kv) kv.textContent = key === 'sy' ? 'Sat. Yön.' : 'Bayi';
    if (typeof renderGecmisPage === 'function') renderGecmisPage();

  } else if (type === 'gecm-prod') {
    _gecmProd = key;
    var pv = document.getElementById('gecm-prod-val');
    if (pv) pv.textContent = _truncate(key, 12);
    if (typeof renderGecmisPage === 'function') renderGecmisPage();

  } else if (type === 'gecm-gorunum') {
    _gecmGorunum = key;
    var gv = document.getElementById('gecm-gorunum-val');
    if (gv) gv.textContent = key === 'growth' ? 'Büyüyen' : key === 'decline' ? 'Düşen' : 'Tümü';
    if (typeof renderGecmisPage === 'function') renderGecmisPage();

  } else if (type === 'gecm-view') {
    _gecmView = key;
    var vv = document.getElementById('gecm-view-val');
    if (vv) vv.textContent = key === 'trend' ? 'Trend' : 'Kıyas';
    if (typeof renderGecmisPage === 'function') renderGecmisPage();

  } else if (type === 'sy-prod') {
    setSyProd(key);                    /* render() setSyProd içinde çağrılır */

  } else if (type === 'sy-liste') {
    _applySyListe(key);

  } else if (type === 'bayi') {
    bayiFilter = key;
    render();

  } else if (type === 'perf') {
    perfFilter = key;
    _perfLabel = key === 'all' ? 'Hepsi' : key === '120p' ? '%120+' : key === '100p' ? '%100+' :
                 key === '80-100' ? '%80-100' : key === '70-80' ? '%70-80' : '%70 Altı';
    render();

  } else if (type === 'pers-sort') {
    _fcSort = (key === 'fc');
    render();

  } else if (type === 'liste') {
    _applyListe(key);
  }

  closeSheet();
}

function _applyListe(key) {
  riskOnly = false;
  var nsel = document.getElementById('nsel');
  var isEdmPers = navPage === 'pers' && typeof KANAL !== 'undefined' && KANAL === 'EDM';

  if (navPage === 'bayi' || isEdmPers) {
    if      (key === 'top10') { compactListeN = 10;  _listeLabel = 'İlk 10'; }
    else if (key === 'top20') { compactListeN = 20;  _listeLabel = 'İlk 20'; }
    else if (key === 'risk')  { compactListeN = 999; riskOnly = true; _listeLabel = 'Riskli'; }
    else                      { compactListeN = 999; _listeLabel = 'Tüm Liste'; }
    render();

  } else {
    /* Personel — Sprint 9 liste modları */
    riskOnly = false;
    if      (key === 'top10')  { setView('top');  if (nsel) nsel.value = 10;  _listeLabel = 'İlk 10'; }
    else if (key === 'top15')  { setView('top');  if (nsel) nsel.value = 15;  _listeLabel = 'İlk 15'; }
    else if (key === 'bot10')  { setView('bot');  if (nsel) nsel.value = 10;  _listeLabel = 'Son 10'; }
    else if (key === 'bot15')  { setView('bot');  if (nsel) nsel.value = 15;  _listeLabel = 'Son 15'; }
    else if (key === 'all')    { setView('both'); if (nsel) nsel.value = 999; _listeLabel = 'Tüm Liste'; }
    else                       { setView('top');  if (nsel) nsel.value = 15;  _listeLabel = 'İlk 15'; }
    /* setView() zaten render() çağırır */
  }
}

function _applySyListe(key) {
  syListMode = key;
  _syListeLabel = key === 'all' ? 'Tümü'
               : key === 'top10' ? 'En Yüksek 10'
               : key === 'bot10' ? 'En Düşük 10'
               : 'Riskli';
  render();
}

/* ─── SAYFA GEÇİŞİNDE SIFIRLA ──────────────── */
function resetFiltersForPage(page) {
  if (page === _prevNavPage) return;
  _prevNavPage = page;

  if (page === 'bayi') {
    riskOnly = false; compactListeN = 999; _listeLabel = 'Tüm Liste';
    bayiFilter = "Tümü";
  } else if (page === 'pers') {
    riskOnly = false; compactListeN = 999; _listeLabel = 'İlk 15';
    bayiFilter = "Tümü"; perfFilter = 'all'; _perfLabel = 'Hepsi';
    persSearch = ''; _fcSort = false;
    var nsel = document.getElementById('nsel');
    if (nsel) nsel.value = 15;
    view = 'top';
  } else if (page === 'sy') {
    syListMode = 'all'; _syListeLabel = 'Tümü';
  }
}

/* ─── PNG İNDİR ─────────────────────────────── */
/* ─── GÖRSEL OLUŞTUR ─────────────────────────────────────────────── */

async function downloadCardPNG() {
  var btn   = document.getElementById('fbar-dl-btn');
  var valEl = btn ? btn.querySelector('.fbar-chip-val') : null;
  var orig  = valEl ? valEl.textContent : 'Oluştur ↗';
  if (btn)   { btn.disabled = true; }
  if (valEl) { valEl.textContent = '⏳'; }

  var wrapper   = null;
  var hiddenEls = [];
  try {
    await ensureH2C();

    var el = document.getElementById('sy-card') ||
             document.getElementById('card-main') ||
             document.querySelector('#cards .card') ||
             document.querySelector('.card');
    if (!el) throw new Error('Kart bulunamadı');

    /* — overlay'leri gizle, body.exporting ekle — */
    var OVERLAY_SEL = '#detay-overlay, #sheet-overlay, .detay-overlay, .drawer-overlay, .modal-backdrop, .loading-overlay, .backdrop, .overlay';
    document.querySelectorAll(OVERLAY_SEL).forEach(function(ov) {
      hiddenEls.push({ el: ov, display: ov.style.display });
      ov.style.display = 'none';
    });
    document.body.classList.add('exporting');

    /* ── Temiz klon: animasyon/opacity sorununu tamamen bertaraf et ──
       Clone #cards dışında olduğundan s9cardFade animasyonu başlamaz.
       Inline stil ile filter/opacity/transform sıfırlanır. */
    var elW = Math.ceil(el.offsetWidth || el.getBoundingClientRect().width || 360);
    wrapper  = document.createElement('div');
    wrapper.style.cssText =
      'position:fixed;left:-9999px;top:0;width:' + elW + 'px;' +
      'background:#ffffff;z-index:-1;pointer-events:none;overflow:visible;';

    var clone = el.cloneNode(true);
    clone.style.cssText =
      (clone.getAttribute('style') || '') +
      ';opacity:1;filter:none;-webkit-filter:none;' +
      'backdrop-filter:none;-webkit-backdrop-filter:none;' +
      'mix-blend-mode:normal;transform:none;' +
      'animation:none;-webkit-animation:none;';

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    /* — RAF: klon layout'u yerleşsin — */
    await new Promise(function(resolve) {
      requestAnimationFrame(function() { setTimeout(resolve, 60); });
    });

    var scope   = navPage === 'bayi' ? 'Bayi'
                : navPage === 'sy'   ? 'SatisYoneticisi'
                : 'Personel';
    var rawProd = navPage === 'sy' ? (syProd || '') : prod;
    var prodKey = rawProd.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/g, '');
    var dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '');
    var fname   = 'TT_' + scope + '_Siralama_' + prodKey + '_' + dateStr + '.png';

    var canvas  = await html2canvas(clone, {
      scale: 2.5, backgroundColor: '#ffffff',
      useCORS: true, logging: false, scrollX: 0, scrollY: 0,
    });

    /* klon DOM'dan çıkar, sonra modal aç */
    if (wrapper && wrapper.parentNode) { wrapper.parentNode.removeChild(wrapper); wrapper = null; }

    _openSharePreview(canvas.toDataURL('image/png'), fname);

  } catch (e) {
    alert('Görsel oluşturma hatası: ' + e.message);
  }

  /* — her zaman restore — */
  if (wrapper && wrapper.parentNode) { wrapper.parentNode.removeChild(wrapper); }
  document.body.classList.remove('exporting');
  hiddenEls.forEach(function(item) { item.el.style.display = item.display; });

  if (btn)   { btn.disabled = false; }
  if (valEl) { valEl.textContent = orig; }
}

/* ─── MATRİS GÖRSEL OLUŞTUR ─────────────────────────────────────── */

async function downloadMatrixPNG() {
  var btn   = document.getElementById('fbar-dl-btn');
  var valEl = btn ? btn.querySelector('.fbar-chip-val') : null;
  var orig  = valEl ? valEl.textContent : 'Oluştur ↗';
  if (btn)   { btn.disabled = true; }
  if (valEl) { valEl.textContent = '⏳'; }

  var wrapper = null;
  try {
    await ensureH2C();

    var M = (typeof MATRIX !== 'undefined') ? MATRIX : null;
    if (!M || !M.rows || !M.rows.length) throw new Error('Matris verisi yok');

    var f = (typeof fc === 'function') ? fc() : null;
    var k = f ? f.k : null;

    var PCOLS = [
      { key: 'mobil', lbl: 'MOBİL',  bg: '#16295C' },
      { key: 'dsl',   lbl: 'DSL',    bg: '#7A6A1E' },
      { key: 'iptv',  lbl: 'İP TV',  bg: '#5B54A8' },
      { key: 'ipdsl', lbl: 'İP/DSL', bg: '#B5836B' },
      { key: 'uydu',  lbl: 'UYDU',   bg: '#4E854E' },
      { key: 'tv',    lbl: 'TV',      bg: '#1C8CC4' },
      { key: 'cihaz', lbl: 'CİHAZ',  bg: '#7E8A3E' },
    ];

    var EXPORT_WIDTH = 1240;
    var W_RANK = 40, W_KOD = 72, W_BAYI = 224;
    var W_VAL  = Math.floor((EXPORT_WIDTH - W_RANK - W_KOD - W_BAYI) / (PCOLS.length * 2));

    var fcVal = function(v) {
      return (k && v !== null && v !== undefined) ? Math.round(v * k) : null;
    };

    var sortLbl = (PCOLS.find(function(p) { return p.key === matrixSort; }) || {lbl:'MOBİL'}).lbl;

    var sortedRows = M.rows.slice().sort(function(a, b) {
      var av = a[matrixSort], bv = b[matrixSort];
      return ((bv == null ? -1 : bv) - (av == null ? -1 : av));
    });

    function heatCell(v, fontSize, extraStyle) {
      if (v === null || v === undefined) {
        return 'background:#F4F6FA;color:#B0B8C8;font-size:' + fontSize + ';font-weight:700;text-align:center;padding:5px 2px;border:1px solid rgba(0,0,0,0.07);' + (extraStyle || '');
      }
      var s = (typeof heat === 'function') ? heat(v) : 'background:#E8F5E9;color:#1B5E20';
      return s + ';font-size:' + fontSize + ';font-weight:700;text-align:center;padding:5px 2px;border:1px solid rgba(0,0,0,0.07);' + (extraStyle || '');
    }

    /* Başlık satırı 1: ürün grupları */
    var fixedHd = 'background:#0A1733;color:#fff;font-weight:800;text-align:center;padding:7px 4px;border:1px solid rgba(255,255,255,0.15);';
    var thead1  = '<tr>' +
      '<th colspan="3" style="' + fixedHd + 'font-size:10.5px;letter-spacing:0.5px">' + sortLbl + ' SIRALI — KUZEY ANADOLU</th>';
    PCOLS.forEach(function(p) {
      thead1 += '<th colspan="2" style="background:' + p.bg + ';color:#fff;font-weight:800;font-size:10.5px;letter-spacing:0.5px;text-align:center;padding:6px 3px;border:1px solid rgba(255,255,255,0.15)">' + p.lbl + '</th>';
    });
    thead1 += '</tr>';

    /* Başlık satırı 2: alt sütun isimleri */
    var subHd = 'background:#EBEEF5;color:#5A6A8A;font-size:8.5px;font-weight:700;text-align:center;padding:4px 2px;border:1px solid #D5DAE8;letter-spacing:0.2px;width:' + W_VAL + 'px;';
    var fixedSubHd = 'background:#F0F3FA;color:#3A4A6A;font-size:9px;font-weight:700;text-align:center;padding:4px 2px;border:1px solid #D5DAE8;';
    var thead2 = '<tr>' +
      '<th style="' + fixedSubHd + 'width:' + W_RANK + 'px">#</th>' +
      '<th style="' + fixedSubHd + 'width:' + W_KOD  + 'px">Kod</th>' +
      '<th style="' + fixedSubHd + 'width:' + W_BAYI + 'px;text-align:left;padding-left:8px">Bayi · İl</th>';
    PCOLS.forEach(function() {
      thead2 += '<th style="' + subHd + '">Fc%</th><th style="' + subHd + '">HGO%</th>';
    });
    thead2 += '</tr>';

    /* Gövde satırları */
    var tbody = '';
    sortedRows.forEach(function(r, i) {
      var rowBg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFF';
      var tds =
        '<td style="background:#F7F9FC;color:#0A1F5C;font-weight:800;font-size:11px;text-align:center;padding:5px 3px;border:1px solid #DCE2EC">' + (i + 1) + '</td>' +
        '<td style="color:#6A7A9A;font-size:9.5px;font-weight:600;text-align:center;padding:5px 2px;border:1px solid #DCE2EC;font-variant-numeric:tabular-nums">' + r.kod + '</td>' +
        '<td style="color:#1A2A4A;font-size:11px;font-weight:700;text-align:left;padding:5px 8px;border:1px solid #DCE2EC;background:' + rowBg + '">' +
          r.b + '<span style="color:#8A9AB4;font-size:8.5px;font-weight:600"> · ' + r.il + '</span>' +
        '</td>';

      PCOLS.forEach(function(p) {
        var raw = r[p.key];
        var fv  = fcVal(raw);
        /* Fc% hücresi */
        var fcDisplay = fv !== null ? fv : (raw !== null && raw !== undefined ? Math.round(raw) : null);
        tds += '<td style="' + heatCell(fv !== null ? fv : raw, '11px', 'font-variant-numeric:tabular-nums') + '">' +
          (fcDisplay !== null ? '%' + fcDisplay : '—') + '</td>';
        /* HGO% hücresi */
        tds += '<td style="' + heatCell(raw, '9.5px', 'opacity:0.82;font-variant-numeric:tabular-nums') + '">' +
          (raw !== null && raw !== undefined ? '%' + Math.round(raw) : '—') + '</td>';
      });

      tbody += '<tr>' + tds + '</tr>';
    });

    /* Alt toplam satırları */
    function totRow(t, lbl, bg) {
      var tds = '<td colspan="3" style="background:' + bg + ';color:#fff;font-weight:800;font-size:10.5px;text-align:center;padding:7px 4px;border:1px solid rgba(255,255,255,0.15);letter-spacing:1.5px">' + lbl + '</td>';
      PCOLS.forEach(function(p) {
        var raw = t[p.key];
        var fv  = fcVal(raw);
        var fcDisp = fv !== null ? fv : (raw !== null && raw !== undefined ? Math.round(raw) : null);
        tds += '<td style="background:' + bg + ';color:#fff;font-weight:800;font-size:11.5px;text-align:center;padding:7px 2px;border:1px solid rgba(255,255,255,0.15)">' +
          (fcDisp !== null ? '%' + fcDisp : '—') + '</td>';
        tds += '<td style="background:' + bg + ';color:rgba(255,255,255,0.68);font-size:9.5px;font-weight:700;text-align:center;padding:7px 2px;border:1px solid rgba(255,255,255,0.15)">' +
          (raw !== null && raw !== undefined ? '%' + Math.round(raw) : '—') + '</td>';
      });
      return '<tr>' + tds + '</tr>';
    }

    var dateStr = new Date().toLocaleDateString('tr-TR');
    var fcNote  = f ? (f.d + '/' + f.t + '. gün · ay sonu tahmini') : 'Forecast bilgisi girilmemiş';
    var donem   = (typeof DONEM !== 'undefined') ? DONEM : '';

    var exportHTML =
      '<div style="background:#fff;padding:0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;">' +
        '<div style="background:linear-gradient(140deg,#0A1733,#1A3568);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;">' +
          '<div>' +
            '<div style="color:#fff;font-size:17px;font-weight:800;letter-spacing:-0.3px">📋 Konsolide Forecast Matrisi</div>' +
            '<div style="color:rgba(201,162,39,0.9);font-size:9px;font-weight:600;letter-spacing:2px;margin-top:3px;text-transform:uppercase">KUZEY ANADOLU · TÜM ÜRÜNLER · ' + fcNote + '</div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">' +
            '<div style="color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border:1px solid rgba(201,162,39,0.5);background:rgba(201,162,39,0.1);border-radius:6px">' + donem + '</div>' +
            '<div style="color:rgba(255,255,255,0.55);font-size:8px;font-weight:600">' + dateStr + '</div>' +
          '</div>' +
        '</div>' +
        '<table style="border-collapse:collapse;width:100%;table-layout:fixed;font-size:11px;">' +
          '<thead>' + thead1 + thead2 + '</thead>' +
          '<tbody>' + tbody + '</tbody>' +
          '<tfoot>' + totRow(M.kuzey, 'KUZEY ANADOLU', '#2C4A8A') + totRow(M.anadolu, 'ANADOLU', '#0A1733') + '</tfoot>' +
        '</table>' +
        '<div style="background:#F7F9FC;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #DCE2EC;">' +
          '<span style="color:#3A4A6A;font-size:9px;font-weight:700;letter-spacing:0.5px">TT KUZEY ANADOLU PERFORMANS MERKEZİ</span>' +
          '<span style="color:#8A9AB4;font-size:8px;font-weight:600">' + M.rows.length + ' bayi · ' + dateStr + '</span>' +
        '</div>' +
      '</div>';

    wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:' + EXPORT_WIDTH + 'px;' +
      'background:#fff;z-index:-1;pointer-events:none;overflow:visible;';
    wrapper.innerHTML = exportHTML;
    document.body.appendChild(wrapper);

    await new Promise(function(resolve) {
      requestAnimationFrame(function() { setTimeout(resolve, 100); });
    });

    var dateFile = new Date().toLocaleDateString('tr-TR').replace(/\./g, '');
    var fname    = 'TT_Matris_' + donem.replace('/', '-') + '_' + dateFile + '.png';

    var canvas = await html2canvas(wrapper, {
      scale: 2, backgroundColor: '#ffffff',
      useCORS: true, logging: false, scrollX: 0, scrollY: 0,
      width:  EXPORT_WIDTH,
      height: wrapper.scrollHeight,
    });

    if (wrapper && wrapper.parentNode) { wrapper.parentNode.removeChild(wrapper); wrapper = null; }

    _openSharePreview(canvas.toDataURL('image/png'), fname);

  } catch (e) {
    alert('Matris görseli oluşturma hatası: ' + e.message);
  }

  if (wrapper && wrapper.parentNode) { wrapper.parentNode.removeChild(wrapper); }
  if (btn)   { btn.disabled = false; }
  if (valEl) { valEl.textContent = orig; }
}

/* ─── PAYLAŞIM ÖNİZLEME MODALI ──────────────────────────────────── */

function _openSharePreview(dataUrl, fname) {
  var existing = document.getElementById('spm');
  if (existing) existing.remove();

  var shareIcon = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';

  var m = document.createElement('div');
  m.id = 'spm';
  m.innerHTML =
    '<div class="spm-toolbar">' +
      '<button class="spm-btn spm-close-btn" onclick="_closeSPM()">✕&nbsp;Kapat</button>' +
      '<span class="spm-title">Önizleme</span>' +
      '<button class="spm-btn spm-share-btn" onclick="_shareSPM()">' + shareIcon + '&nbsp;Paylaş</button>' +
    '</div>' +
    '<div class="spm-body">' +
      '<img src="' + dataUrl + '" class="spm-img" alt="Performans görseli">' +
    '</div>';

  m._spmData  = dataUrl;
  m._spmFname = fname;

  document.body.appendChild(m);
  document.body.style.overflow = 'hidden';
}

function _closeSPM() {
  var m = document.getElementById('spm');
  if (m) { m.remove(); document.body.style.overflow = ''; }
}

async function _shareSPM() {
  var m = document.getElementById('spm');
  if (!m) return;

  var dataUrl = m._spmData;
  var fname   = m._spmFname;

  /* Önce Web Share API ile dosya paylaşımı (iOS Safari ✓) */
  if (navigator.share) {
    try {
      var blob = _spmBlob(dataUrl);
      var file = new File([blob], fname, { type: 'image/png' });
      var sharePayload = { files: [file], title: 'TT Kuzey Anadolu', text: 'Performans raporu' };

      if (navigator.canShare && navigator.canShare(sharePayload)) {
        await navigator.share(sharePayload);
        return;
      }
      /* Dosya paylaşımı desteklenmiyorsa başlık+metin ile dene */
      await navigator.share({ title: 'TT Kuzey Anadolu', text: 'Performans raporu' });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return; /* Kullanıcı iptal etti */
      /* Diğer hatalarda dosya indirmeye düş */
    }
  }

  /* Fallback: dosya indir */
  _spmDownload(dataUrl, fname);
}

function _spmBlob(dataUrl) {
  var parts = dataUrl.split(',');
  var mime  = parts[0].match(/:(.*?);/)[1];
  var raw   = atob(parts[1]);
  var n     = raw.length;
  var buf   = new Uint8Array(n);
  while (n--) buf[n] = raw.charCodeAt(n);
  return new Blob([buf], { type: mime });
}

function _spmDownload(url, name) {
  var a = document.createElement('a');
  a.download = name; a.href = url;
  document.body.appendChild(a); a.click(); a.remove();
}
