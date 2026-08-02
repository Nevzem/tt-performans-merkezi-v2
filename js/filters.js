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

  var isBayi       = (navPage === 'bayi');
  var isPers       = (navPage === 'pers');
  var isSY         = (navPage === 'sy');
  var isMatrix     = (navPage === 'perf' && typeof section !== 'undefined' && section === 'matrix');
  var isKupaOrRisk = (navPage === 'perf' && typeof section !== 'undefined' && (section === 'kupa' || section === 'risk'));
  var isDetay      = (navPage === 'perf' && typeof section !== 'undefined' && section === 'detay');

  if (!isBayi && !isPers && !isSY && !isMatrix && !isKupaOrRisk && !isDetay) { bar.innerHTML = ''; return; }

  if (isDetay) {
    bar.setAttribute('data-pg', 'detay');
    bar.innerHTML =
      '<button class="fbar-chip fbar-dl" id="fbar-dl-btn" onclick="downloadDetayCardPNG()">' +
        '<span class="fbar-chip-lbl">Görsel</span>' +
        '<span class="fbar-chip-val">Oluştur ↗</span>' +
      '</button>';
    return;
  }

  if (isKupaOrRisk) {
    bar.setAttribute('data-pg', section);
    bar.innerHTML =
      '<button class="fbar-chip fbar-dl" id="fbar-dl-btn" onclick="downloadCardPNG()">' +
        '<span class="fbar-chip-lbl">Görsel</span>' +
        '<span class="fbar-chip-val">Oluştur ↗</span>' +
      '</button>';
    return;
  }

  if (isMatrix) {
    /* Sprint 17: tek export butonu — Matrix Engine V2 (eski iki buton kaldırıldı) */
    bar.setAttribute('data-pg', 'matrix');
    bar.innerHTML =
      '<button class="fbar-chip fbar-dl" id="fbar-v2-btn" onclick="matrixExportV2()">' +
        '<span class="fbar-chip-lbl">Görsel</span>' +
        '<span class="fbar-chip-val">Oluştur ↗</span>' +
      '</button>';
    return;
  }

  var html = '';

  if (isSY) {
    /* ── Satış Yöneticisi filtre çubuğu — Sprint 27.3 ──
       Bu ekranın artık TEK bir görünümü var (v3, design-references/
       sy-dashboard-reference.png) — "Görünüm" seçici chip'i ve ona bağlı
       sy-prod/sy-liste/sym-prod/sym-sort chip'leri KALDIRILDI, kullanıcı
       görünüm değiştiremiyor. syViewMode değişkeni ve eski render
       fonksiyonları (renderSYSingle/renderSYMatrixView/renderSYReportV2)
       rollback için KOD OLARAK duruyor, yalnızca bu seçim UI'ı kaldırıldı.
       SY sayfasında dış filtre çubuğunda artık yalnızca (aşağıdaki ortak
       blokta eklenen) "Görsel Oluştur" butonu kalıyor. */

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

  /* Bayi seçimi için arama alanı göster (personel + geçmiş ekranı) */
  var _needsSearch = (type === 'bayi' && navPage === 'pers') || type === 'h2-bayi';
  if (_needsSearch) {
    searchW.style.display = '';
    searchI.oninput = function() { _renderOpts(type, this.value); };
  }

  _renderOpts(type, '');

  /* Aç */
  overlay.classList.add('open');
  sheet.classList.add('open');
  document.body.style.overflow = 'hidden';

  /* Arama alanına odaklan */
  if (_needsSearch && searchI) {
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

  /* ── SY görünüm modu — Sprint 27: varsayılan 'v3' (mobil ana ekran) ── */
  if (type === 'sy-view') {
    return {
      title: 'Görünüm',
      items: [
        { key: 'v3',     label: '📱 Mobil Ana Ekran' },
        { key: 'v2',     label: '🗂 Ürün Performans Raporu (v2)' },
        { key: 'matrix', label: '📊 Klasik Matris (v1)' },
        { key: 'single', label: '🔎 Tek Ürün Görünümü' },
      ],
      active: typeof syViewMode !== 'undefined' ? syViewMode : 'v3',
    };
  }

  /* ── SYM ürün filtresi — Sprint 24.1: sıralama her zaman TEK bir ürüne bağlı ── */
  if (type === 'sym-prod') {
    return {
      title: 'Ürün',
      items: (typeof SYM_PRODS !== 'undefined' ? SYM_PRODS : []).map(function(p) {
        return { key: p.key, label: p.icon + ' ' + p.label };
      }),
      active: typeof symSortProd !== 'undefined' ? symSortProd : 'mobil',
    };
  }

  /* ── SYM sıralama ölçütü — Sprint 24.1 ── */
  if (type === 'sym-sort') {
    return {
      title: 'Sıralama',
      items: (typeof SYM_SORT_METRICS !== 'undefined' ? SYM_SORT_METRICS : []).map(function(m) {
        return { key: m.key, label: m.label };
      }),
      active: typeof symSortMetric !== 'undefined' ? symSortMetric : 'hgo',
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

  /* ── Geçmiş Performans filtreleri (Sprint 18 Geçmiş) ── */
  if (type === 'h2-bayi') {
    var h2ds = (typeof _h2Dealers === 'function') ? _h2Dealers() : [];
    if (!h2ds.length) return { title: 'Bayi Seç', items: [{ key: '__none', label: 'Bayi bulunamadı' }], active: null };
    return {
      title: 'Bayi Seç',
      items: h2ds.map(function(d) {
        return { key: String(d.bayiKodu), label: d.bayiAdi + ' · ' + (d.il || '') };
      }),
      active: String(_h2Bayi),
    };
  }

  if (type === 'h2-yil') {
    var yrs = (typeof _h2Years === 'function') ? _h2Years() : [];
    return {
      title: 'Yıl Seç',
      items: (yrs.length ? yrs : [String(new Date().getFullYear())]).map(function(y) {
        return { key: y, label: y };
      }),
      active: String(_h2Year),
    };
  }

  if (type === 'h2-prod') {
    return {
      title: 'Ürün Seç',
      items: [{ key: 'all', label: 'Tüm Ürünler' }].concat(
        (typeof HIST2_PRODS !== 'undefined' ? HIST2_PRODS : []).map(function(p) {
          return { key: p.key, label: p.label };
        })),
      active: _h2Prod,
    };
  }

  if (type === 'h2-kanal') {
    return {
      title: 'Kanal',
      items: [
        { key: 'Tümü', label: 'Tümü' },
        { key: 'TTM',  label: 'TTM' },
        { key: 'EDM',  label: 'EDM' },
      ],
      active: _h2Kanal,
    };
  }

  if (type === 'h2-sy') {
    var h2sy = (typeof _h2SyList === 'function') ? _h2SyList() : ['Tümü'];
    return {
      title: 'Satış Yöneticisi',
      items: h2sy.map(function(s) {
        return { key: s, label: s === 'Tümü' ? '👥 Tümü' : '👔 ' + s };
      }),
      active: _h2Sy,
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

  /* ── Geçmiş Performans picks (Sprint 18 Geçmiş) ── */
  } else if (type === 'h2-bayi') {
    if (key !== '__none') h2SetBayi(key);

  } else if (type === 'h2-yil') {
    h2SetYear(key);

  } else if (type === 'h2-prod') {
    h2SetProd(key);

  } else if (type === 'h2-kanal') {
    h2SetKanal(key);

  } else if (type === 'h2-sy') {
    h2SetSy(key);

  } else if (type === 'sy-prod') {
    setSyProd(key);                    /* render() setSyProd içinde çağrılır */

  } else if (type === 'sy-liste') {
    _applySyListe(key);

  } else if (type === 'sy-view') {
    if (typeof setSyViewMode === 'function') setSyViewMode(key); /* render() içeride çağrılır */

  } else if (type === 'sym-prod') {
    if (typeof setSymSortProd === 'function') setSymSortProd(key);     /* render() içeride çağrılır */

  } else if (type === 'sym-sort') {
    if (typeof setSymSortMetric === 'function') setSymSortMetric(key); /* render() içeride çağrılır */

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
  /* Sprint 24.3: SY "Ürün Performans Raporu" (v2) paylaşım PNG'si artık
     js/sy-share.js içinde tamamen bağımsız bir şablondan üretiliyor
     (uygulama ekranının screenshot'ı DEĞİL, ayrı offscreen DOM + ayrı
     .sy-share-* CSS). Genel klon tabanlı akış yalnızca v1/matris,
     tek-ürün ve diğer sayfalar için geçerli kalır. */
  if (navPage === 'sy' && (typeof syViewMode === 'undefined' || syViewMode === 'v3' || syViewMode === 'v2') && typeof exportSYShareV3PNG === 'function') {
    return exportSYShareV3PNG();
  }

  var btn   = document.getElementById('fbar-dl-btn');
  var valEl = btn ? btn.querySelector('.fbar-chip-val') : null;
  var orig  = valEl ? valEl.textContent : 'Oluştur ↗';
  if (btn)   { btn.disabled = true; }
  if (valEl) { valEl.textContent = '⏳'; }

  var cloneWrapper = null;
  var hiddenEls    = [];
  try {
    /* — Doğru kartı bul — */
    var el = document.getElementById('sy-card')     ||
             document.getElementById('kupa-card')   ||
             document.getElementById('risk-card')   ||
             document.getElementById('card-main')   ||
             document.querySelector('#cards .card') ||
             document.querySelector('.card');
    if (!el) throw new Error('Kart bulunamadı');

    /* — Overlay ve SPM'yi geçici gizle — */
    var OVERLAY_SEL = '#detay-overlay,#sheet-overlay,#spm,.detay-overlay,.drawer-overlay,.modal-backdrop,.loading-overlay,.backdrop,.overlay';
    document.querySelectorAll(OVERLAY_SEL).forEach(function(ov) {
      hiddenEls.push({ el: ov, display: ov.style.display });
      ov.style.display = 'none';
    });
    document.body.classList.add('exporting');

    /* — Temiz clone — animasyon/opacity/filter reset, body dışı alanda —
       Sprint 24.1: SY "Klasik Matris" (v1, syViewMode==='matrix') telefon
       ekranında dar render edilir; container-query (.sym-page) sayesinde
       1440px'e sabitlenen export klonunda bölge + yönetici ürün grid'leri
       4 yan yana görünür (bkz. css/sy-matrix.css). syViewMode==='v2' bu
       noktaya hiç gelmez — downloadCardPNG() en başta exportSYSharePNG()'ye
       yönlendirir (kendi export DOM'unu kurar, bu klon akışını kullanmaz). */
    var isSyMatrix = navPage === 'sy' && syViewMode === 'matrix';
    var fixedW = isSyMatrix ? 1440 : undefined;
    var res  = await createCleanExportClone(el, fixedW);
    cloneWrapper = res.wrapper;

    /* — Dosya adı — */
    var scope = navPage === 'bayi' ? 'Bayi'
              : navPage === 'sy'   ? (isSyMatrix ? 'SYMatris' : 'SatisYoneticisi')
              : navPage === 'perf' && typeof section !== 'undefined' && section === 'kupa' ? 'KupaBende'
              : navPage === 'perf' && typeof section !== 'undefined' && section === 'risk' ? 'RiskRadari'
              : 'Personel';
    var rawProd = navPage === 'sy' ? (isSyMatrix ? '' : (typeof syProd !== 'undefined' ? syProd : '')) : (typeof prod !== 'undefined' ? prod : '');
    var prodKey = (rawProd || '').replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/g, '');
    var dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '');
    var fname   = 'TT_' + scope + (prodKey ? '_' + prodKey : '') + '_' + dateStr + '.png';

    /* — Capture — */
    var canvas = await captureExportImage(res.clone);
    cleanupExportClone(cloneWrapper); cloneWrapper = null;

    _openSharePreview(canvas.toDataURL('image/png'), fname);

  } catch (e) {
    alert('Görsel oluşturma hatası: ' + e.message);
  }

  /* — Her durumda temizle — */
  cleanupExportClone(cloneWrapper);
  document.body.classList.remove('exporting');
  hiddenEls.forEach(function(item) { item.el.style.display = item.display; });
  if (btn)   { btn.disabled = false; }
  if (valEl) { valEl.textContent = orig; }
}

/* Sprint 19: downloadMatrixPNG silindi — matris görseli tek motor: matrixExportV2() */

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

  /* Önce Web Share API ile dosya paylaşımı (iOS Safari ✓)
     Not: title/text bilinçli olarak YOK — WhatsApp bunları görselin yanına
     mesaj metni olarak ekliyordu; artık yalnızca görsel paylaşılır (2026-07-05). */
  if (navigator.share) {
    try {
      var blob = _spmBlob(dataUrl);
      var file = new File([blob], fname, { type: 'image/png' });
      var sharePayload = { files: [file] };

      if (navigator.canShare && navigator.canShare(sharePayload)) {
        await navigator.share(sharePayload);
        return;
      }
      /* Dosya paylaşımı desteklenmiyorsa indirme fallback'ine düş */
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
