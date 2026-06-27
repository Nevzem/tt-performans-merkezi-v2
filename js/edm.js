/* ════════════════════════════════════════════════════════════════════
   js/edm.js  —  EDM Kanal Yönetim Sistemi v2
   Temel fark: EDM'de HGO değil AKTİVASYON ADEDI önceliklidir.
   TTM sistemi aynen korunur; EDM_DATA ayrı tutulur.
   ════════════════════════════════════════════════════════════════════ */

/* ─── KANAL VE FİLTRE ─────────────────────────────────────────────── */

function setKanal(k) {
  KANAL = k;
  _kanalUI();
  if (navPage === 'ana') renderHome();
  else { buildTabs(); render(); }
}

function setEdmFilter(bt) {
  EDM_FILTER = bt;
  document.querySelectorAll('.edmf-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.bt === bt);
  });
  if (navPage === 'ana') renderHome();
  else { buildTabs(); render(); }
}

function setEdmSy(sy) {
  EDM_SY_FILTER = sy;
  if (navPage === 'ana') renderHome();
  else if (typeof buildFilterBar === 'function') buildFilterBar();
  else render();
}

function _kanalUI() {
  document.querySelectorAll('.ch-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.ch === KANAL);
  });
  var subEl = document.getElementById('edm-sub');
  if (subEl) subEl.style.display = KANAL === 'TTM' ? 'none' : '';
  updateKanalBadge();
}

function updateKanalBadge() {
  var badge = document.getElementById('edm-status-badge');
  if (!badge) return;
  if (KANAL === 'TTM') { badge.style.display = 'none'; return; }
  if (EDM_ERROR) {
    badge.textContent = '⚠️ ' + EDM_ERROR;
    badge.className = 'edm-badge edm-badge-err';
  } else if (EDM_DATA) {
    var cnt = (EDM_DATA.bayi['Toplam Mobil'] || []).length;
    badge.textContent = '✓ ' + cnt + ' EDM bayi';
    badge.className = 'edm-badge edm-badge-ok';
  } else {
    badge.textContent = 'EDM bekleniyor';
    badge.className = 'edm-badge edm-badge-warn';
  }
  badge.style.display = '';
}

/* ─── FİLTRE YARDIMCILARI ────────────────────────────────────────── */

function _edmFilt(recs) {
  var r = recs;
  if (EDM_FILTER !== 'Tümü')
    r = r.filter(function(x) { return x.bt === EDM_FILTER; });
  if (EDM_SY_FILTER && EDM_SY_FILTER !== 'Tümü')
    r = r.filter(function(x) { return x.sy === EDM_SY_FILTER; });
  return r;
}

function activeBayiData(prodKey) {
  if (KANAL === 'EDM')
    return _edmFilt((EDM_DATA && EDM_DATA.bayi && EDM_DATA.bayi[prodKey]) || []);
  return DATA.bayi ? (DATA.bayi[prodKey] || []) : [];
}

function activeDetay() {
  return KANAL === 'EDM' ? EDM_DETAY : DETAY;
}

/* ─── KPI HESAPLAMA — AKTİVASYON BAZLI ─────────────────────────── */

var _EDM_CARD_PRODS = [
  { icon: '📱', short: 'MOBİL',  dataKey: 'Toplam Mobil' },
  { icon: '🌐', short: 'DSL',    dataKey: 'DSL'           },
  { icon: '📺', short: 'TİVİBU', dataKey: 'Toplam TV'     },
  { icon: '📦', short: 'CİHAZ',  dataKey: 'Akıllı Cihaz'  },
];

function edmKPIs() {
  var f = fc();
  return _EDM_CARD_PRODS.map(function(pm) {
    var recs   = _edmFilt((EDM_DATA && EDM_DATA.bayi && EDM_DATA.bayi[pm.dataKey]) || []);
    var totalH = 0, totalA = 0;
    recs.forEach(function(r) { totalH += (r.h || 0); totalA += (r.a || 0); });
    var fcAktiv = (f && totalA > 0) ? Math.round(totalA * f.k) : null;
    var kalan   = Math.max(totalH - totalA, 0);
    return {
      key: pm.key, label: pm.short, icon: pm.icon,
      h: totalH, a: totalA, fcAktiv: fcAktiv, kalan: kalan,
      bayiSay: recs.length, f: f,
    };
  });
}

/* ─── ANA RENDER ─────────────────────────────────────────────────── */

function renderEDMHome(el) {
  if (!EDM_DATA) {
    el.innerHTML = '<div class="gecm-welcome"><div class="gecm-wl-icon">📊</div>' +
      '<div class="gecm-wl-title">EDM Verisi Yok</div>' +
      '<div class="gecm-wl-sub">' + (EDM_ERROR || 'Excel yüklenince EDM verisi otomatik okunur.') + '</div></div>';
    return;
  }
  var kpis = edmKPIs();
  el.innerHTML = [
    _edmPageHeader(),
    _edmSyFilterHTML(),
    _edmChips(kpis),
    _edmScorecard(kpis),
    _edmLeaders(),
    _edmRiskList(),
  ].join('');
}

/* ─── SAYFA BAŞLIĞI ─────────────────────────────────────────────── */

function _edmPageHeader() {
  var recs    = _edmFilt(EDM_DATA.bayi['Toplam Mobil'] || []);
  var btLabel = EDM_FILTER === 'Tümü' ? 'TTBN+ESN' : EDM_FILTER;
  var syLabel = EDM_SY_FILTER !== 'Tümü'
    ? ' · ' + EDM_SY_FILTER.split(' ').map(function(w,i){ return i===0?w.slice(0,1)+'.':w; }).join(' ')
    : '';
  return '<div class="hd-page-header">' +
    '<div class="hd-ph-left"><div class="hd-ph-mark">TT</div>' +
    '<div><div class="hd-ph-title">EDM Performans Merkezi' + syLabel + '</div>' +
    '<div class="hd-ph-sub">' + btLabel + ' · ' + recs.length + ' Bayi · ' + DONEM + '</div></div></div>' +
    '<div class="hd-ph-period">EDM</div></div>';
}

/* ─── SY FİLTRE ŞERİDİ ──────────────────────────────────────────── */

function _edmSyFilterHTML() {
  return '<div class="edm-sy-strip">' +
    '<span class="edm-sy-lbl">Satış Yön.</span>' +
    EDM_SY_NAMES.map(function(s) {
      var isOn  = EDM_SY_FILTER === s;
      var label = s === 'Tümü' ? 'Tümü'
        : s.split(' ')[0].slice(0, 1) + '. ' + s.split(' ').pop();
      return '<button class="edm-sy-btn' + (isOn ? ' active' : '') + '" onclick="setEdmSy(\'' + _escQ(s) + '\')">' + label + '</button>';
    }).join('') +
  '</div>';
}

function _escQ(s) { return s.replace(/'/g, "\\'"); }

/* ─── AKTİVASYON ÇİPLERİ ─────────────────────────────────────────── */

function _edmChips(kpis) {
  var mobKpi  = kpis[0];
  var recs    = _edmFilt(EDM_DATA.bayi['Toplam Mobil'] || []);
  var bayiSay = recs.length;
  var riskN   = recs.filter(function(r) { return r.h > 0 && r.a < r.h * 0.6; }).length;
  var dateStr = new Date().toLocaleDateString('tr-TR', {day:'2-digit',month:'2-digit',year:'numeric'});

  function chip(lbl, val, cls, sub) {
    return '<div class="hd-chip">' +
      '<div class="hd-chip-lbl">' + lbl + '</div>' +
      '<div class="hd-chip-val ' + cls + '">' + val + '</div>' +
      '<div class="hd-chip-sub">' + sub + '</div>' +
    '</div>';
  }

  var fcLbl = mobKpi.fcAktiv !== null ? mobKpi.fcAktiv.toLocaleString('tr-TR') : '—';
  var fcCls = mobKpi.fcAktiv !== null && mobKpi.h > 0 && mobKpi.fcAktiv >= mobKpi.h ? 'hdc-green' : 'hdc-amber';

  return '<div class="hd-chips">' +
    chip('MOBİL AKTİV',  mobKpi.a > 0 ? mobKpi.a.toLocaleString('tr-TR') : '—',  'hdc-xl hdc-neutral', 'gerçekleşen adet') +
    chip('HEDEF',        mobKpi.h > 0 ? mobKpi.h.toLocaleString('tr-TR') : '—',  'hdc-neutral',        'aylık hedef') +
    chip('FORECAST',     fcLbl, fcCls, 'tahmini ay sonu') +
    chip('KALAN ADET',   mobKpi.kalan > 0 ? mobKpi.kalan.toLocaleString('tr-TR') : '0', mobKpi.kalan === 0 ? 'hdc-green' : 'hdc-red', 'hedefe kalan') +
    chip('RİSKLİ BAYİ',  String(riskN), riskN > 0 ? 'hdc-red' : 'hdc-green', 'aktiv %60 altı') +
    chip('TOPLAM BAYİ',  String(bayiSay), 'hdc-neutral', (EDM_FILTER==='Tümü'?'TTBN+ESN':EDM_FILTER)) +
  '</div>';
}

/* ─── PERFORMANS ÖZETİ — HGO SATIRI YOK ────────────────────────── */

function _edmScorecard(kpis) {
  function fmtN(v) { return v > 0 ? v.toLocaleString('tr-TR') : '—'; }
  var hasF = !!(kpis[0].f);

  var headHTML = '<tr class="hd-sc-head-row"><th class="hd-sc-empty"></th>' +
    kpis.map(function(k) {
      return '<th class="hd-sc-prod-th"><span class="hd-sc-prod-icon">' + k.icon + '</span>' +
        '<span class="hd-sc-prod-name">' + k.label + '</span></th>';
    }).join('') + '</tr>';

  function row(label, cells, cls) {
    return '<tr class="hd-sc-row ' + (cls||'') + '"><td class="hd-sc-row-lbl">' + label + '</td>' +
      cells.map(function(c) { return '<td class="hd-sc-cell">' + c + '</td>'; }).join('') + '</tr>';
  }

  return '<div class="hd-section"><div class="hd-sec-title">EDM Performans Özeti · Aktivasyon Adedi</div>' +
    '<div class="hd-score-wrap"><table class="hd-score-tbl"><thead>' + headHTML + '</thead><tbody>' +
    row('Aktivasyon', kpis.map(function(k) { return '<strong>' + fmtN(k.a) + '</strong>'; }), 'hd-sc-row-val') +
    row('Hedef',      kpis.map(function(k) { return fmtN(k.h); }), 'hd-sc-row-muted') +
    (hasF ? row('Forecast', kpis.map(function(k) {
      if (!k.fcAktiv) return '—';
      var cls = k.fcAktiv >= k.h ? 'hd-g' : 'hd-y';
      return '<span class="' + cls + '">' + k.fcAktiv.toLocaleString('tr-TR') + '</span>';
    }), 'hd-sc-row-hgo') : '') +
    row('Kalan Adet', kpis.map(function(k) {
      return k.kalan > 0
        ? '<span class="hd-r">' + k.kalan.toLocaleString('tr-TR') + '</span>'
        : '<span class="hd-g">✓</span>';
    }), 'hd-sc-row-muted') +
    '</tbody></table></div></div>';
}

/* ─── ÜRÜN LİDERLERİ — AKTİVASYON BAZLI ──────────────────────── */

function _edmLeaders() {
  var f = fc();
  var cards = _EDM_CARD_PRODS.map(function(pm) {
    var recs = _edmFilt((EDM_DATA.bayi[pm.dataKey]) || []);
    return _edmPlCard(pm, recs[0] || null, true, f);
  }).join('');
  return '<div class="hd-section"><div class="hd-sec-title">EDM Ürün Liderleri · Aktivasyon</div>' +
    '<div class="pl-grid">' + cards + '</div></div>';
}

function _edmPlCard(pm, rec, isLeader, f) {
  if (!rec || !rec.h) {
    return '<div class="pl-card pl-empty"><span class="pl-empty-txt">Veri yok</span></div>';
  }
  var fcAktiv = (f && rec.a > 0) ? Math.round(rec.a * f.k) : null;
  var kalan   = Math.max((rec.h || 0) - (rec.a || 0), 0);
  var fcCls   = fcAktiv !== null && fcAktiv >= (rec.h||0) ? 'hd-g' : 'hd-y';

  var meta = ['H:&thinsp;<span class="pl-na">' + (rec.h||0).toLocaleString('tr-TR') + '</span>'];
  if (fcAktiv !== null) meta.push('F:&thinsp;<span class="' + fcCls + '">' + fcAktiv.toLocaleString('tr-TR') + '</span>');
  if (kalan > 0) meta.push('K:&thinsp;<span class="hd-r">' + kalan.toLocaleString('tr-TR') + '</span>');

  return '<div class="pl-card ' + (isLeader ? 'pl-leader' : 'pl-risk') + '">' +
    '<div class="pl-head"><span class="pl-icon">' + pm.icon + '</span><span class="pl-prod">' + pm.short + '</span>' +
    '<span class="pl-badge">' + (isLeader ? '🏆' : '⚠️') + '</span></div>' +
    '<div class="pl-name">' + rec.p + '</div>' +
    '<div class="pl-loc">' + rec.b +
      (rec.bt ? ' <span class="edm-bt-tag edm-bt-' + rec.bt.toLowerCase() + '">' + rec.bt + '</span>' : '') +
      (rec.sy ? '<span style="display:block;font-size:7.5px;color:var(--muted);margin-top:1px">' + rec.sy.split(' ')[0] + '</span>' : '') +
    '</div>' +
    '<div class="pl-hgo hd-g">' + (rec.a||0).toLocaleString('tr-TR') + '</div>' +
    '<div class="pl-hgo-lbl">AKTİVASYON</div>' +
    '<div class="pl-foot">' + meta.join('<span class="pl-sep">·</span>') + '</div>' +
  '</div>';
}

/* ─── RİSKLİ ÜRÜN BAYİLERİ — KALAN ADET BAZLI ─────────────────── */

var _edmRiskProd = 'Toplam Mobil';
function setEdmRiskProd(key) { _edmRiskProd = key; if (navPage === 'ana') renderHome(); }

function _edmRiskList() {
  var f     = fc();
  var recs  = _edmFilt((EDM_DATA.bayi[_edmRiskProd]) || []);
  /* Risk sıralaması: en yüksek kalan adet önce */
  var sorted = recs.slice().sort(function(a, b) {
    var ak = Math.max((a.h||0) - (a.a||0), 0);
    var bk = Math.max((b.h||0) - (b.a||0), 0);
    return bk - ak;
  }).slice(0, 5);

  var tabsHTML = '<div class="hp-tabs hp-tabs-scroll">' +
    _EDM_CARD_PRODS.map(function(pm) {
      return '<button class="hp-tab' + (pm.dataKey === _edmRiskProd ? ' hp-tab-on' : '') +
        '" onclick="setEdmRiskProd(\'' + pm.dataKey + '\')">' + pm.short + '</button>';
    }).join('') + '</div>';

  var rows = sorted.length ? sorted.map(function(r, i) {
    var kalan   = Math.max((r.h||0) - (r.a||0), 0);
    var fcAktiv = (f && r.a > 0) ? Math.round(r.a * f.k) : null;
    var fcCls   = fcAktiv !== null && r.h > 0 && fcAktiv < r.h ? 'hd-r' : (fcAktiv !== null ? 'hd-g' : '');
    return '<div class="hrl-row">' +
      '<span class="hrl-rank">' + (i+1) + '</span>' +
      '<div class="hrl-info">' +
        '<div class="hrl-name">' + r.p + (r.bt ? ' <span class="edm-bt-tag edm-bt-' + r.bt.toLowerCase() + '">' + r.bt + '</span>' : '') + '</div>' +
        '<div class="hrl-loc">' + r.b + (r.sy ? ' · ' + r.sy.split(' ')[0] : '') + '</div>' +
      '</div>' +
      '<div class="hrl-vals">' +
        '<div class="hrl-gain hd-r">' + kalan.toLocaleString('tr-TR') + ' kalan</div>' +
        '<div class="hrl-prev">' + (r.a||0).toLocaleString('tr-TR') + ' aktiv' +
          (fcAktiv !== null ? ' · F:<span class="' + fcCls + '">' + fcAktiv.toLocaleString('tr-TR') + '</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('') : '<div class="hrl-empty">Veri yok</div>';

  return '<div class="hd-section">' +
    '<div class="hd-sec-head"><div class="hd-sec-title">Riskli EDM Bayileri · Kalan Adet</div>' + tabsHTML + '</div>' +
    '<div class="hrl-card">' + rows + '</div></div>';
}

/* ─── EDM BAYİLER EKRANI ────────────────────────────────────────── */

function renderEDMBayi(prodKey) {
  if (!EDM_DATA) return _edmNoData();

  var recs = _edmFilt((EDM_DATA.bayi[prodKey]) || []);
  if (typeof compactListeN !== 'undefined' && compactListeN < 999) recs = recs.slice(0, compactListeN);

  var f       = fc();
  var PICO    = {'Toplam Mobil':'📱','DSL':'🌐','Toplam TV':'📺','Akıllı Cihaz':'📦','Diğer Cihaz':'🔌','Postpaid':'📋','Prepaid':'📲'};
  var icon    = PICO[prodKey] || '📊';
  var btLabel = EDM_FILTER === 'Tümü' ? 'TTBN+ESN' : EDM_FILTER;
  var syLabel = EDM_SY_FILTER !== 'Tümü' ? ' · ' + EDM_SY_FILTER.split(' ')[0] : '';
  var sub     = 'EDM · ' + btLabel + syLabel + ' · ' + recs.length + ' bayi · aktivasyon bazlı' + (f ? ' · Forecast ' + f.d + '/' + f.t : '');

  if (!recs.length) return hdrHTML(icon, prodKey + ' — EDM', 'Veri yok (' + btLabel + ')');

  var rows = '';
  recs.forEach(function(r, i) {
    var fcAktiv = (f && r.a > 0) ? Math.round(r.a * f.k) : null;
    var kalan   = Math.max((r.h||0) - (r.a||0), 0);
    var rk      = i < 3 ? '<span class="badge b' + (i+1) + '">' + (i+1) + '</span>' : '<span class="n">' + (i+1) + '</span>';
    var btTag   = r.bt ? '<span class="edm-bt-tag edm-bt-' + r.bt.toLowerCase() + '">' + r.bt + '</span>' : '';

    rows += '<div class="row' + (i<3 ? ' r'+(i+1) : '') + '">' +
      '<div class="rk">' + rk + '</div>' +
      '<div class="nm">' +
        '<div class="p">' + r.p + '&thinsp;' + btTag + '</div>' +
        '<div class="b">' + r.b + (r.sy ? ' · ' + r.sy.split(' ')[0] : '') + '</div>' +
      '</div>' +
      '<div class="edm-row-vals">' +
        '<div class="edm-rv-a">' + (r.a||0).toLocaleString('tr-TR') + '</div>' +
        '<div class="edm-rv-sub">' +
          'H:' + (r.h||0).toLocaleString('tr-TR') +
          (fcAktiv !== null ? ' · F:' + fcAktiv.toLocaleString('tr-TR') : '') +
          (kalan > 0 ? ' · K:' + kalan.toLocaleString('tr-TR') : '') +
        '</div>' +
      '</div>' +
    '</div>';
  });

  return hdrHTML(icon, prodKey + ' — EDM (' + btLabel + ')', sub) +
    '<div class="sec t"><span>🏢 EDM Bayileri</span><span class="cnt">Aktivasyon bazlı sıralama</span></div>' +
    rows +
    ftrHTML([[recs.length,'Bayi'],[(recs[0].a||0).toLocaleString('tr-TR'),'Lider Aktiv'],[recs[0].p.split(' ')[0],'Lider']]);
}

function _edmNoData() {
  return hdrHTML('📊','EDM Verisi','') +
    '<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px">' +
    (EDM_ERROR || 'Excel raporu yükleyince EDM verisi otomatik okunur.') + '</div>';
}

/* ─── EDM SY GÖRÜNÜMÜ ───────────────────────────────────────────── */

function renderEDMSY() {
  var cards = document.getElementById('cards');
  cards.className = 'cards single'; cards.style.maxWidth = '360px';

  if (!SYDATA || !SYDATA.sy) {
    cards.innerHTML = hdrHTML('👔','EDM · SY','') +
      '<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px">SY verisi yüklenmedi.</div>';
    return;
  }

  /* EDM SY isimlerini büyük harfle karşılaştır — APP_CONFIG.edmSY'dan türetilir */
  var edmTargets = APP_CONFIG.edmSY.map(function(n) { return n.toUpperCase(); });
  var found = Object.keys(SYDATA.sy).filter(function(nm) {
    return edmTargets.indexOf(nm.toUpperCase()) >= 0;
  });

  if (!found.length) {
    cards.innerHTML = hdrHTML('👔','EDM · Satış Yöneticisi','') +
      '<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px">' +
      'EDM SY isimleri SY ÖZET\'te bulunamadı.<br>Beklenen: ' + APP_CONFIG.edmSY.join(', ') + '</div>';
    return;
  }

  /* Mevcut renderSY ama EDM SY adlarıyla */
  renderSY();
}

/* ─── AYARLAR: EDM DURUM & DEBUG ────────────────────────────────── */

function renderEDMSettings() {
  var el = document.getElementById('edm-settings-content');
  if (!el) return;
  if (!EDM_DATA && !EDM_ERROR) {
    el.innerHTML = '<div class="hist-s-empty">Excel yüklenince EDM verisi otomatik parse edilir.</div>';
    return;
  }
  var bayiSay = EDM_DATA ? (EDM_DATA.bayi['Toplam Mobil'] || []).length : 0;
  var ttbnSay = EDM_DATA ? (EDM_DATA.bayi['Toplam Mobil'] || []).filter(function(r){return r.bt==='TTBN';}).length : 0;
  var esnSay  = EDM_DATA ? (EDM_DATA.bayi['Toplam Mobil'] || []).filter(function(r){return r.bt==='ESN';}).length : 0;

  var status = EDM_ERROR
    ? '<div class="hist-s-row"><span class="hist-s-icon">⚠️</span><div class="hist-s-info"><div class="hist-s-name">Hata</div><div class="hist-s-file">'+EDM_ERROR+'</div></div></div>'
    : '<div class="hist-s-row hist-s-active"><span class="hist-s-icon">✅</span><div class="hist-s-info">' +
        '<div class="hist-s-name">'+bayiSay+' EDM Bayi yüklü · Aktivasyon bazlı</div>' +
        '<div class="hist-s-file">TTBN: '+ttbnSay+' · ESN: '+esnSay+'</div></div>' +
        '<span class="hist-s-badge">Aktif</span></div>';

  var debugLog = EDM_COL_LOG
    ? '<div class="edm-debug-log">📋 Kolon Mapping:<br>' + EDM_COL_LOG.replace(/\n/g,'<br>') + '</div>'
    : '';

  el.innerHTML = status + debugLog;
}
