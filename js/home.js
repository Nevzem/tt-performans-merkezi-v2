/* ════════════════════════════════════════════
   js/home.js — Ana Sayfa Executive Dashboard
   Veri işleme mantığını değiştirmez;
   DATA / MATRIX / DETAY / PREV / SYDATA okur.
   ════════════════════════════════════════════ */

/* Önceki raporun DETAY verisi (parser.js tarafından set edilir) */
var PREV_DETAY = null;

/* Ana Sayfa içi ürün filtresi state'leri */
var _homeRiskProd    = 'Toplam Mobil';
var _homeAdetProd    = 'Toplam Mobil';
var _homePersRankProd = 'Toplam Mobil';
var _homeBayiRankProd = 'Toplam Mobil';

/* Risk & Yüksek Adet filtresi (4 ürün) */
var _HP_PRODS = [
  { label: 'Mobil',  key: 'Toplam Mobil', detayKey: 'Toplam Mobil' },
  { label: 'DSL',    key: 'DSL',           detayKey: 'DSL'          },
  { label: 'Tivibu', key: 'Toplam TV',     detayKey: 'Toplam TV'    },
  { label: 'Cihaz',  key: 'Akıllı Cihaz',  detayKey: 'Akıllı Cihaz' },
];

/* Personel sıralama ürünleri (DATA.pers anahtarları) */
var _PERS_RANK_PRODS = [
  { label: 'Toplam Mobil', key: 'Toplam Mobil', detayKey: 'Toplam Mobil' },
  { label: 'Faturalı',     key: 'Faturalı',      detayKey: 'Postpaid'     },
  { label: 'Faturasız',    key: 'Faturasız',      detayKey: 'Prepaid'      },
  { label: 'DSL',          key: 'DSL',            detayKey: 'DSL'          },
  { label: 'Tivibu',       key: 'Toplam TV',      detayKey: 'Toplam TV'    },
  { label: 'IPTV',         key: 'IPTV',           detayKey: 'IPTV'         },
  { label: 'Uydu TV',      key: 'Uydu',           detayKey: 'Uydu'         },
  { label: 'Cihaz',        key: 'Cihaz',          detayKey: 'Toplam Cihaz' },
];

/* Bayi sıralama ürünleri (DATA.bayi anahtarları) */
var _BAYI_RANK_PRODS = [
  { label: 'Toplam Mobil', key: 'Toplam Mobil', detayKey: 'Toplam Mobil' },
  { label: 'Faturalı',     key: 'Postpaid',      detayKey: 'Postpaid'     },
  { label: 'Faturasız',    key: 'Prepaid',        detayKey: 'Prepaid'      },
  { label: 'DSL',          key: 'DSL',            detayKey: 'DSL'          },
  { label: 'Tivibu',       key: 'Toplam TV',      detayKey: 'Toplam TV'    },
  { label: 'Cihaz',        key: 'Akıllı Cihaz',   detayKey: 'Akıllı Cihaz' },
];

function setHomeRiskProd(k)     { _homeRiskProd    = k; renderHome(); }
function setHomeAdetProd(k)     { _homeAdetProd    = k; renderHome(); }
function setHomePersRankProd(k) { _homePersRankProd = k; renderHome(); }
function setHomeBayiRankProd(k) { _homeBayiRankProd = k; renderHome(); }

/* ─── ANA RENDER ─────────────────────────── */
function renderHome() {
  var el = document.getElementById('home-dashboard');
  if (!el) return;
  /* EDM kanalı için ayrı render */
  if (typeof KANAL !== 'undefined' && KANAL === 'EDM') {
    if (typeof renderEDMHome === 'function') renderEDMHome(el);
    return;
  }
  var kpis = _hdKPIs();
  el.innerHTML = [
    _hdHero(),
    _hdChips(kpis),
    _hdDailyTarget(kpis),
    _hdExecutiveInsights(),
    _hdScorecard(kpis),
    _hdAutoSummary(kpis),
    _hdPersRanking(),
    _hdBayiRanking(),
    _hdRiskCenter(kpis),
  ].join('');
}

/* ══════════════════════════════════════════
   1. SAYFA BAŞLIĞI — sade, beyaz
   ══════════════════════════════════════════ */
function _hdPageHeader() {
  var today = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  var loadTs = '';
  try {
    var ts = (typeof LOAD_KEY_TTM !== 'undefined') ? localStorage.getItem(LOAD_KEY_TTM) : null;
    if (ts) {
      var d = new Date(ts);
      loadTs = d.toLocaleString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    }
  } catch(_e) {}
  return (
    '<div class="hd-page-header">' +
      '<div class="hd-ph-left">' +
        '<div class="hd-ph-mark">TT</div>' +
        '<div>' +
          '<div class="hd-ph-title">Kuzey Anadolu Performans Merkezi</div>' +
          '<div class="hd-ph-sub">Bayi Satış Kanalı &nbsp;·&nbsp; ' + today + '</div>' +
          (loadTs ? '<div class="hd-ph-load">Son yükleme: ' + loadTs + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="hd-ph-period">' + DONEM + '</div>' +
    '</div>'
  );
}

function _hdDataHealth() {
  if (typeof DATA_HEALTH === 'undefined' || !DATA_HEALTH) return '';
  var dh = DATA_HEALTH;
  var cls = dh.ok ? 'dh-ok' : 'dh-warn';
  var icon = dh.ok ? '✅' : '⚠️';
  var msg = icon + ' ' + dh.persCount + ' personel · ' + dh.bayiCount + ' bayi · ' + dh.syCount + ' SY';
  if (!dh.ok && dh.warnings && dh.warnings.length) msg += ' · ' + dh.warnings.length + ' kolon uyarısı';
  return '<div class="hd-data-health ' + cls + '">' + msg + '</div>';
}

/* ══════════════════════════════════════════
   2. ÖZET ÇİPLER — 2×3 grid, 6 metrik
   Görsel öncelik: Ort.HGO → Riskli → Elite
   → T.Bayi → T.Pers → Tarih
   ══════════════════════════════════════════ */
function _hdChips(kpis) {
  var recs    = DATA.bayi['Toplam Mobil'] || [];
  var bayiSay = recs.length;
  var persSay = (DATA.pers['Toplam Mobil'] || []).length;
  var riskliN = recs.filter(function(r) { return r.g < 60; }).length;
  var eliteN  = recs.filter(function(r) { return r.g >= 100; }).length;

  /* Genel HGO: 4 ürün toplam gerçekleşen / toplam hedef (ağırlıklı) */
  var _totalH4 = kpis.reduce(function(s, k) { return s + (k.h || 0); }, 0);
  var _totalA4 = kpis.reduce(function(s, k) { return s + (k.a || 0); }, 0);
  var ortHGO = _totalH4 > 0
    ? Math.round(_totalA4 / _totalH4 * 1000) / 10
    : (function() {
        var v = kpis.map(function(k){return k.hgo;}).filter(function(x){return x!==null;});
        return v.length ? Math.round(v.reduce(function(s,x){return s+x;},0)/v.length*10)/10 : null;
      }());

  var ortCls = ortHGO === null ? 'hdc-neutral'
             : ortHGO >= 100  ? 'hdc-green'
             : ortHGO >= 70   ? 'hdc-amber'
             : 'hdc-red';

  var dateStr = new Date().toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  function chip(lbl, val, valCls, sub) {
    return (
      '<div class="hd-chip">' +
        '<div class="hd-chip-accent"></div>' +
        '<div class="hd-chip-lbl">' + lbl + '</div>' +
        '<div class="hd-chip-val ' + valCls + '">' + val + '</div>' +
        '<div class="hd-chip-sub">' + sub + '</div>' +
      '</div>'
    );
  }

  return (
    '<div class="hd-chips hd-anim" style="--i:1">' +
      chip('GENEL HGO',         ortHGO !== null ? '%' + ortHGO.toFixed(1) : '—',
                               'hdc-xl ' + ortCls,  '4 ürün toplam gerçekleşme') +
      chip('RİSKLİ BAYİ',      String(riskliN),
                               riskliN > 0 ? 'hdc-red' : 'hdc-green', 'HGO %60 altı') +
      chip('ELİTE BAYİ',       String(eliteN),
                               eliteN  > 0 ? 'hdc-gold' : 'hdc-neutral', 'HGO %100 üstü') +
      chip('TOPLAM BAYİ',      String(bayiSay),
                               'hdc-neutral', 'aktif TTM bayisi') +
      chip('TOPLAM PERSONEL',  String(persSay),
                               'hdc-neutral', 'hedefli personel') +
      chip('RAPOR TARİHİ',     dateStr,
                               'hdc-date',    DONEM + ' dönemi') +
    '</div>'
  );
}

/* ══════════════════════════════════════════
   3. YATAY SCORECARD TABLOSU (McKinsey)
   Satırlar: Gerçekleşen · Hedef · HGO %
             Forecast (fc varsa) · Önceki Gün (PREV varsa)
   ══════════════════════════════════════════ */
var _HD_PRODS = [
  { key: 'mobil', label: 'Toplam Mobil', dataKey: 'Toplam Mobil', mxKey: 'mobil', icon: '📱', short: 'MOBİL'  },
  { key: 'dsl',   label: 'DSL',          dataKey: 'DSL',           mxKey: 'dsl',   icon: '🌐', short: 'DSL'    },
  { key: 'tv',    label: 'Tivibu / TV',  dataKey: 'Toplam TV',     mxKey: 'tv',    icon: '📺', short: 'TV'     },
  { key: 'cihaz', label: 'Cihaz',        dataKey: 'Toplam Cihaz',  mxKey: 'cihaz', icon: '📦', short: 'CİHAZ'  },
];

function _hdKPIs() {
  var f        = fc();
  var _gA      = (SYDATA && SYDATA.calismaGun)  || 0;
  var _gB      = (SYDATA && SYDATA.calisilanGun) || 0;
  var ayGun    = Math.max(_gA, _gB);
  var gecenGun = Math.min(_gA, _gB);
  var kalanGun = (ayGun > 0 && gecenGun > 0 && ayGun > gecenGun) ? ayGun - gecenGun : null;
  var hasDetay = DETAY && Object.keys(DETAY.bayiler).length > 0;

  return _HD_PRODS.map(function(pm) {
    var totalH = 0, totalA = 0;
    if (hasDetay) {
      for (var kod in DETAY.bayiler) {
        var d = DETAY.bayiler[kod].prods[pm.dataKey];
        if (d) { totalH += d.h; totalA += d.a; }
      }
    }
    var hgo = totalH > 0
      ? Math.round(totalA / totalH * 1000) / 10
      : (MATRIX && MATRIX.kuzey ? (MATRIX.kuzey[pm.mxKey] || null) : null);
    var kalan  = totalH > 0 ? Math.max(totalH - totalA, 0) : null;
    var fcHgo  = (f && hgo !== null) ? Math.round(hgo * f.k * 10) / 10 : null;
    var gunluk = (kalanGun && kalanGun > 0 && kalan) ? Math.ceil(kalan / kalanGun) : null;

    var prevHgo = null, delta = null;
    if (PREV && PREV.bayi) {
      var precs = PREV.bayi[pm.dataKey] || [];
      if (precs.length) {
        var sum = 0;
        for (var i = 0; i < precs.length; i++) sum += precs[i].g;
        prevHgo = Math.round(sum / precs.length * 10) / 10;
        if (hgo !== null) delta = Math.round((hgo - prevHgo) * 10) / 10;
      }
    }
    return {
      key: pm.key, label: pm.label, short: pm.short, icon: pm.icon,
      h: totalH, a: totalA, hgo: hgo, kalan: kalan, fcHgo: fcHgo,
      gunluk: gunluk, delta: delta, hasDetay: hasDetay, f: f,
    };
  });
}

function _hdScorecard(kpis) {
  function hgoCls(v) { return v===null?'':v>=100?'hd-g':v>=70?'hd-y':'hd-r'; }
  function fmtN(v)   { return (v > 0) ? v.toLocaleString('tr-TR') : '—'; }

  var hasDetay = kpis[0].hasDetay;
  var hasF     = !!(kpis[0].f);
  var hasPrev  = !!PREV;

  /* Ürün başlıkları */
  var headHTML = '<tr class="hd-sc-head-row">' +
    '<th class="hd-sc-lbl-cell"></th>' +
    kpis.map(function(k) {
      return '<th class="hd-sc-prod-th">' +
        '<span class="hd-sc-prod-icon">' + k.icon + '</span>' +
        '<span class="hd-sc-prod-name">' + k.short + '</span>' +
      '</th>';
    }).join('') +
  '</tr>';

  function row(label, cells, rowCls) {
    return '<tr class="hd-sc-row ' + (rowCls||'') + '">' +
      '<td class="hd-sc-row-lbl">' + label + '</td>' +
      cells.map(function(c) { return '<td class="hd-sc-cell">' + c + '</td>'; }).join('') +
    '</tr>';
  }

  /* Satır: Gerçekleşen */
  var rowGer = row('Gerçekleşen',
    kpis.map(function(k){ return hasDetay ? fmtN(k.a) : '—'; }),
    'hd-sc-row-val');

  /* Satır: Hedef */
  var rowHdf = row('Hedef',
    kpis.map(function(k){ return hasDetay ? fmtN(k.h) : '—'; }),
    'hd-sc-row-muted');

  /* Satır: HGO % — renkli, büyük */
  var rowHgo = row('HGO&nbsp;%',
    kpis.map(function(k){
      return '<span class="hd-sc-hgo-val ' + hgoCls(k.hgo) + '">' +
        (k.hgo !== null ? '%' + k.hgo.toFixed(1) : '—') +
      '</span>';
    }),
    'hd-sc-row-hgo');

  /* Satır: Forecast (yalnızca fc() varsa) */
  var rowFc = hasF ? row('Forecast',
    kpis.map(function(k){
      return '<span class="hd-sc-hgo-val ' + hgoCls(k.fcHgo) + '">' +
        (k.fcHgo !== null ? '%' + Math.round(k.fcHgo) : '—') +
      '</span>';
    }),
    'hd-sc-row-fc') : '';

  /* Satır: Kalan Adet (yalnızca fc() varsa, ek bağlam) */
  var rowKalan = (hasF && hasDetay) ? row('Kalan Adet',
    kpis.map(function(k){ return k.kalan !== null ? fmtN(k.kalan) : '—'; }),
    'hd-sc-row-muted') : '';

  /* Satır: Önceki Güne Göre (yalnızca PREV varsa) */
  var rowDelta = hasPrev ? row('Önceki Gün',
    kpis.map(function(k) {
      if (k.delta === null) return '<span class="hd-td-eq">—</span>';
      if (k.delta > 0) return '<span class="hd-td-up">▲&thinsp;' + k.delta.toFixed(1) + '</span>';
      if (k.delta < 0) return '<span class="hd-td-dn">▼&thinsp;' + Math.abs(k.delta).toFixed(1) + '</span>';
      return '<span class="hd-td-eq">—</span>';
    }),
    'hd-sc-row-delta') : '';

  return (
    '<div class="hd-section">' +
      '<div class="hd-sec-title">Performans Özeti</div>' +
      '<div class="hd-score-wrap">' +
        '<table class="hd-score-tbl">' +
          '<thead>' + headHTML + '</thead>' +
          '<tbody>' +
            rowGer + rowHdf + rowHgo + rowFc + rowKalan + rowDelta +
          '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>'
  );
}

/* ══════════════════════════════════════════
   4. AI OPERASYON ÖZETİ
   ══════════════════════════════════════════ */
function _hdAutoSummary(kpis) {
  function aiCard(k) {
    var h = k.hgo, fc = k.fcHgo;
    var icon, msg, acCls;
    if (h === null) {
      icon = '📊'; msg = 'Veri bekleniyor.'; acCls = 'ai-neutral';
    } else if (k.key === 'mobil') {
      if      (h >= 100) { icon = '✅'; msg = 'Hedefe ulaşıldı.';                        acCls = 'ai-ok'; }
      else if (h >= 85)  { icon = '📈'; msg = 'Güçlü seyrediyor, kapanış potansiyeli yüksek.'; acCls = 'ai-ok'; }
      else if (h >= 65)  { icon = '⚠️'; msg = 'Tempo artırılmalı.';                      acCls = 'ai-warn'; }
      else               { icon = '🔴'; msg = 'Kritik. Acil aksiyon gerekiyor.';         acCls = 'ai-risk'; }
    } else if (k.key === 'dsl') {
      if      (h >= 95) { icon = '✅'; msg = 'Hedefine yakın.';                           acCls = 'ai-ok'; }
      else if (h >= 65) { icon = '📊'; msg = 'Tempo korunursa ay sonuna yaklaşılır.';    acCls = 'ai-warn'; }
      else              { icon = '⚠️'; msg = 'Riskli. Destek önlemi önerilir.';           acCls = 'ai-risk'; }
    } else if (k.key === 'tv') {
      if      (h >= 90) { icon = '✅'; msg = 'Hedefine yakın.';                           acCls = 'ai-ok'; }
      else if (h >= 60) { icon = '📊'; msg = 'Ek satış fırsatları değerlendirilebilir.'; acCls = 'ai-warn'; }
      else              { icon = '⚠️'; msg = 'Zayıf. Odak artırılmalı.';                 acCls = 'ai-risk'; }
    } else {
      if      (h >= 95) { icon = '✅'; msg = 'Hedef üzerinde, ivme korunmalı.';           acCls = 'ai-ok'; }
      else if (h >= 65) { icon = '📊'; msg = 'Makul düzeyde.';                            acCls = 'ai-warn'; }
      else              { icon = '⚠️'; msg = 'Riskli.';                                   acCls = 'ai-risk'; }
    }
    var hgoStr = h !== null ? '%' + h.toFixed(1) : '';
    var fcStr  = fc !== null ? '<span class="ai-fc">Forecast %' + Math.round(fc) + '</span>' : '';
    return '<div class="hd-ai-card ' + acCls + '">' +
      '<div class="hd-ai-head">' +
        '<span class="hd-ai-icon">' + k.icon + '</span>' +
        '<span class="hd-ai-prod">' + k.short + '</span>' +
        (hgoStr ? '<span class="hd-ai-hgo">' + hgoStr + '</span>' : '') +
      '</div>' +
      '<div class="hd-ai-msg">' + icon + ' ' + msg + '</div>' +
      (fcStr ? '<div class="hd-ai-fcrow">' + fcStr + '</div>' : '') +
    '</div>';
  }

  return (
    '<div class="hd-section">' +
      '<div class="hd-sec-title">AI Operasyon Özeti</div>' +
      '<div class="hd-ai-grid">' + kpis.map(aiCard).join('') + '</div>' +
    '</div>'
  );
}

/* ══════════════════════════════════════════
   5. ÜRÜN LİDERLERİ & RİSKLİ BAYİLER
   McKinsey Executive · Bloomberg Terminal
   ══════════════════════════════════════════ */

/* 4 kart için ürün tanımları */
var _CARD_PRODS = [
  { icon: '📱', short: 'MOBİL',  dataKey: 'Toplam Mobil', detayKey: 'Toplam Mobil' },
  { icon: '🌐', short: 'DSL',    dataKey: 'DSL',           detayKey: 'DSL'          },
  { icon: '📺', short: 'TİVİBU', dataKey: 'Toplam TV',     detayKey: 'Toplam TV'    },
  { icon: '📦', short: 'CİHAZ',  dataKey: 'Akıllı Cihaz',  detayKey: 'Akıllı Cihaz' },
];

/* DETAY'dan h/a çek (bayi kodu r.b'den ayıklanır: "4100343 · TOKAT") */
function _detayProd(rec, detayKey) {
  if (!DETAY || !rec || !rec.b) return null;
  var kod  = rec.b.split(' · ')[0].trim();
  var bayi = DETAY.bayiler[kod];
  return bayi ? (bayi.prods[detayKey] || null) : null;
}

/* Tek kart HTML'i — kompakt (lider kartları için) */
function _plCard(pm, rec, isLeader, f) {
  if (!rec) {
    return '<div class="pl-card pl-empty"><span class="pl-empty-txt">Veri yok</span></div>';
  }
  var hgoCls = rec.g >= 100 ? 'hd-g' : rec.g >= 70 ? 'hd-y' : 'hd-r';
  var dp     = _detayProd(rec, pm.detayKey);
  var fcHgo  = (f && rec.g !== null) ? rec.g * f.k : null;
  var fcCls  = fcHgo === null ? '' : fcHgo >= 100 ? 'hd-g' : fcHgo >= 70 ? 'hd-y' : 'hd-r';

  var meta = [];
  meta.push('F&thinsp;<span class="' + fcCls + '">' + (fcHgo !== null ? '%' + Math.round(fcHgo) : '—') + '</span>');
  if (dp && dp.h > 0)
    meta.push('<span class="pl-na">' + dp.a.toLocaleString('tr-TR') + '/' + dp.h.toLocaleString('tr-TR') + '</span>');

  return (
    '<div class="pl-card ' + (isLeader ? 'pl-leader' : 'pl-risk') + '">' +
      '<div class="pl-head">' +
        '<span class="pl-icon">' + pm.icon + '</span>' +
        '<span class="pl-prod">' + pm.short + '</span>' +
        '<span class="pl-badge">' + (isLeader ? '🏆' : '⚠️') + '</span>' +
      '</div>' +
      '<div class="pl-name">' + rec.p + '</div>' +
      '<div class="pl-loc">' + rec.b + '</div>' +
      '<div class="pl-hgo ' + hgoCls + '">%' + rec.g.toFixed(1) + '</div>' +
      '<div class="pl-foot">' + meta.join('<span class="pl-sep">·</span>') + '</div>' +
    '</div>'
  );
}

/* Bölüm: Ürün Liderleri (2×2 kompakt grid) */
function _hdLeaders() {
  var f     = fc();
  var cards = _CARD_PRODS.map(function(pm) {
    var recs = (DATA.bayi && DATA.bayi[pm.dataKey]) || [];
    return _plCard(pm, recs[0] || null, true, f);
  }).join('');
  return (
    '<div class="hd-section">' +
      '<div class="hd-sec-title">Ürün Liderleri</div>' +
      '<div class="pl-grid">' + cards + '</div>' +
    '</div>'
  );
}

/* ── Yardımcı: ürün filtresi sekme HTML'i ── */
/* prods parametresi verilmezse varsayılan _HP_PRODS kullanılır */
function _hpTabs(activeKey, setter, small, prods) {
  var list = prods || _HP_PRODS;
  var cls  = 'hp-tab' + (small ? ' hp-tab-sm' : '');
  return '<div class="hp-tabs hp-tabs-scroll">' +
    list.map(function(p) {
      var on = activeKey === p.key;
      return '<button class="' + cls + (on ? ' hp-tab-on' : '') + '" ' +
        'onclick="' + setter + '(\'' + p.key + '\')">' + p.label + '</button>';
    }).join('') +
  '</div>';
}

/* Bölüm: Riskli Ürün Bayileri (filtrelenebilir liste) */
function _hdRiskList() {
  var f      = fc();
  var recs   = (DATA.bayi && DATA.bayi[_homeRiskProd]) || [];
  var worst5 = recs.slice(-5).slice().reverse(); // en düşük HGO önce

  var rows = worst5.length
    ? worst5.map(function(r, i) {
        var rank   = recs.length - i;
        var hgoCls = r.g >= 100 ? 'hd-g' : r.g >= 70 ? 'hd-y' : 'hd-r';
        var fcHgo  = (f && r.g !== null) ? r.g * f.k : null;
        var fcCls  = fcHgo === null ? '' : fcHgo >= 100 ? 'hd-g' : fcHgo >= 70 ? 'hd-y' : 'hd-r';
        return (
          '<div class="hrl-row">' +
            '<span class="hrl-rank">' + rank + '</span>' +
            '<div class="hrl-info">' +
              '<div class="hrl-name">' + r.p + '</div>' +
              '<div class="hrl-loc">' + r.b + '</div>' +
            '</div>' +
            '<div class="hrl-vals">' +
              '<div class="hrl-fc ' + fcCls + '">F&thinsp;' + (fcHgo !== null ? '%' + Math.round(fcHgo) : '—') + '</div>' +
              '<div class="hrl-hgo ' + hgoCls + '">%' + r.g.toFixed(1) + '</div>' +
            '</div>' +
          '</div>'
        );
      }).join('')
    : '<div class="hrl-empty">Veri yok</div>';

  return (
    '<div class="hd-section">' +
      '<div class="hd-sec-head">' +
        '<div class="hd-sec-title">Riskli Ürün Bayileri</div>' +
        _hpTabs(_homeRiskProd, 'setHomeRiskProd', false) +
      '</div>' +
      '<div class="hrl-card">' + rows + '</div>' +
    '</div>'
  );
}

/* ══════════════════════════════════════════
   7. PERSONEL ÜRÜN SIRALAMASI
   ══════════════════════════════════════════ */
function _hdPersRanking() {
  var prodKey  = _homePersRankProd;
  var recs     = (DATA.pers && DATA.pers[prodKey]) || [];
  var top10    = recs.slice(0, 10);

  /* DETAY.pers'den h ve a lookup map'i oluştur */
  var pm = _PERS_RANK_PRODS.find(function(p) { return p.key === prodKey; });
  var detayKey = pm ? pm.detayKey : prodKey;
  var detMap = {};
  if (DETAY && DETAY.pers) {
    for (var kod in DETAY.pers) {
      var arr = DETAY.pers[kod];
      for (var i = 0; i < arr.length; i++) {
        var pd = arr[i].prods[detayKey];
        if (pd) detMap[arr[i].p] = pd;
      }
    }
  }

  function rkBadge(i) {
    if (i === 0) return '<span class="rnk-badge">🥇</span>';
    if (i === 1) return '<span class="rnk-badge">🥈</span>';
    if (i === 2) return '<span class="rnk-badge">🥉</span>';
    return '<span class="rnk-n">' + (i + 1) + '</span>';
  }

  var rows = top10.length ? top10.map(function(r, i) {
    var hgoCls = r.g >= 100 ? 'hd-g' : r.g >= 70 ? 'hd-y' : 'hd-r';
    var d      = detMap[r.p];
    var meta   = d && d.h > 0
      ? d.a.toLocaleString('tr-TR') + '/' + d.h.toLocaleString('tr-TR')
      : '';
    return (
      '<div class="rnk-row' + (i < 3 ? ' rnk-pod rnk-p' + (i + 1) : '') + '">' +
        '<div class="rnk-lft">' +
          rkBadge(i) +
          '<div class="rnk-txt">' +
            '<div class="rnk-name">' + r.p + '</div>' +
            '<div class="rnk-sub">' + r.b + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="rnk-rgt">' +
          '<div class="rnk-hgo ' + hgoCls + '">%' + r.g.toFixed(1) + '</div>' +
          (meta ? '<div class="rnk-meta">' + meta + '</div>' : '') +
        '</div>' +
      '</div>'
    );
  }).join('')
  : '<div class="hrl-empty">Seçilen ürün için veri bulunamadı.</div>';

  return (
    '<div class="hd-section">' +
      '<div class="hd-sec-head">' +
        '<div class="hd-sec-title">Personel Ürün Sıralaması</div>' +
        _hpTabs(_homePersRankProd, 'setHomePersRankProd', false, _PERS_RANK_PRODS) +
      '</div>' +
      '<div class="rnk-card">' + rows + '</div>' +
    '</div>'
  );
}

/* ══════════════════════════════════════════
   8. BAYİ ÜRÜN SIRALAMASI
   ══════════════════════════════════════════ */
function _hdBayiRanking() {
  var prodKey = _homeBayiRankProd;
  var recs    = (DATA.bayi && DATA.bayi[prodKey]) || [];
  var top5    = recs.slice(0, 5);

  /* DETAY.bayiler'den h ve a çek */
  function getDetay(rec) {
    if (!DETAY || !rec.b) return null;
    var kod  = rec.b.split(' · ')[0].trim();
    var bayi = DETAY.bayiler[kod];
    if (!bayi) return null;
    var pm = _BAYI_RANK_PRODS.find(function(p) { return p.key === prodKey; });
    var dk = pm ? pm.detayKey : prodKey;
    return bayi.prods[dk] || null;
  }

  function rkBadge(i) {
    if (i === 0) return '<span class="rnk-badge">🥇</span>';
    if (i === 1) return '<span class="rnk-badge">🥈</span>';
    if (i === 2) return '<span class="rnk-badge">🥉</span>';
    return '<span class="rnk-n">' + (i + 1) + '</span>';
  }

  var rows = top5.length ? top5.map(function(r, i) {
    var hgoCls = r.g >= 100 ? 'hd-g' : r.g >= 70 ? 'hd-y' : 'hd-r';
    var d      = getDetay(r);
    var meta   = d && d.h > 0
      ? d.a.toLocaleString('tr-TR') + '/' + d.h.toLocaleString('tr-TR')
      : '';
    return (
      '<div class="rnk-row' + (i < 3 ? ' rnk-pod rnk-p' + (i + 1) : '') + '">' +
        '<div class="rnk-lft">' +
          rkBadge(i) +
          '<div class="rnk-txt">' +
            '<div class="rnk-name">' + r.p + '</div>' +
            '<div class="rnk-sub">' + r.b + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="rnk-rgt">' +
          '<div class="rnk-hgo ' + hgoCls + '">%' + r.g.toFixed(1) + '</div>' +
          (meta ? '<div class="rnk-meta">' + meta + '</div>' : '') +
        '</div>' +
      '</div>'
    );
  }).join('')
  : '<div class="hrl-empty">Seçilen ürün için veri bulunamadı.</div>';

  return (
    '<div class="hd-section">' +
      '<div class="hd-sec-head">' +
        '<div class="hd-sec-title">Bayi Ürün Sıralaması</div>' +
        _hpTabs(_homeBayiRankProd, 'setHomeBayiRankProd', false, _BAYI_RANK_PRODS) +
      '</div>' +
      '<div class="rnk-card">' + rows + '</div>' +
    '</div>'
  );
}

/* ══════════════════════════════════════════
   9. RİSK MERKEZİ
   ══════════════════════════════════════════ */

/* Önceki raporla adet büyümesi hesaplama */
function _hdAdetGrowth() {
  var hasPrev = (typeof PREV_DETAY !== "undefined" && PREV_DETAY && DETAY);
  if (!hasPrev) return null; // null = önceki rapor yok

  var items = [];
  for (var kod in DETAY.bayiler) {
    var curr = DETAY.bayiler[kod];
    var prev = PREV_DETAY.bayiler[kod];
    if (!prev) continue;
    var cProd = curr.prods[_homeAdetProd];
    var pProd = prev.prods[_homeAdetProd];
    if (!cProd || !pProd) continue;
    var delta = cProd.a - pProd.a;
    if (delta > 0) {
      items.push({
        name: curr.b,
        loc: (curr.kod || '') + (curr.il ? ' · ' + curr.il : ''),
        delta: delta, prevA: pProd.a, currA: cProd.a,
      });
    }
  }
  items.sort(function(a, b) { return b.delta - a.delta; });
  return items.slice(0, 5);
}

function _hdRiskCenter(kpis) {
  /* Sadece "Yüksek Adet" bölümü kalıyor. */
  var adetGrowth = _hdAdetGrowth();
  var adetTabs   = _hpTabs(_homeAdetProd, 'setHomeAdetProd', true);

  var adetRows = '';
  if (adetGrowth === null) {
    adetRows = '<div class="hrl-empty">Önceki rapor yüklenince adetsel büyüme analizi gösterilir.</div>';
  } else if (!adetGrowth.length) {
    adetRows = '<div class="hrl-empty">Önceki rapora göre adet artışı bulunamadı.</div>';
  } else {
    adetRows = adetGrowth.map(function(r, i) {
      return (
        '<div class="hrl-row">' +
          '<span class="hrl-rank">' + (i + 1) + '</span>' +
          '<div class="hrl-info">' +
            '<div class="hrl-name">' + r.name + '</div>' +
            '<div class="hrl-loc">' + r.loc + '</div>' +
          '</div>' +
          '<div class="hrl-vals">' +
            '<div class="hrl-gain hd-g">+' + r.delta.toLocaleString('tr-TR') + '</div>' +
            '<div class="hrl-prev">' + r.prevA.toLocaleString('tr-TR') + '→' + r.currA.toLocaleString('tr-TR') + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  return (
    '<div class="hd-section">' +
      '<div class="hd-sec-head">' +
        '<div class="hd-sec-title">Yüksek Adet</div>' +
        adetTabs +
      '</div>' +
      '<div class="hrl-card">' + adetRows + '</div>' +
    '</div>'
  );
}

/* ══════════════════════════════════════════
   Sprint 4 — EXECUTIVE HERO
   ══════════════════════════════════════════ */
function _hdHero() {
  var today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  var loadTs = '';
  try {
    var _ts = (typeof LOAD_KEY_TTM !== 'undefined') ? localStorage.getItem(LOAD_KEY_TTM) : null;
    if (_ts) { var _d = new Date(_ts); loadTs = _d.toLocaleString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
  } catch(_e) {}

  var kalanGun = null;
  var _gA = (typeof SYDATA !== 'undefined' && SYDATA && SYDATA.calismaGun)  || 0;
  var _gB = (typeof SYDATA !== 'undefined' && SYDATA && SYDATA.calisilanGun) || 0;
  if (_gA > 0 && _gB > 0) kalanGun = Math.max(_gA - _gB, 0);
  if (kalanGun === null) {
    try {
      var _dnEl = document.getElementById('day-now');
      var _dtEl = document.getElementById('day-total');
      if (_dnEl && _dtEl && _dnEl.value && _dtEl.value) kalanGun = Math.max(parseInt(_dtEl.value) - parseInt(_dnEl.value), 0);
    } catch(_e2) {}
  }

  var dhHtml = '';
  if (typeof DATA_HEALTH !== 'undefined' && DATA_HEALTH) {
    var dh = DATA_HEALTH;
    dhHtml = '<span class="hd-hero-dh ' + (dh.ok ? 'hero-dh-ok' : 'hero-dh-warn') + '">' +
      (dh.ok ? '✅' : '⚠️') + ' Veri Sağlığı' + (dh.warnings && dh.warnings.length ? ' (' + dh.warnings.length + ')' : '') + '</span>';
  }

  var kalanBlock = kalanGun !== null
    ? '<div class="hd-hero-kalan"><div class="hd-hero-kalan-val">' + kalanGun + '</div><div class="hd-hero-kalan-lbl">Kalan Gün</div></div>'
    : '<div class="hd-hero-period">' + DONEM + '</div>';

  return (
    '<div class="hd-hero hd-anim" style="--i:0">' +
      '<div class="hd-hero-main">' +
        '<div class="hd-hero-head">' +
          '<div class="hd-ph-mark">TT</div>' +
          '<div class="hd-hero-ch-badge">TTM</div>' +
          '<div class="hd-hero-titles">' +
            '<div class="hd-hero-title">Kuzey Anadolu Performans Merkezi</div>' +
            '<div class="hd-hero-sub">Bayi Satış Kanalı &nbsp;·&nbsp; ' + today + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="hd-hero-meta">' +
          _hdHeroVK(loadTs) +
        '</div>' +
      '</div>' +
      kalanBlock +
    '</div>'
  );
}

function _hdHeroVK(loadTs) {
  var dh    = (typeof DATA_HEALTH !== 'undefined' && DATA_HEALTH) ? DATA_HEALTH : null;
  var isOk  = !dh || dh.ok;
  var sayiTxt = dh ? (dh.persCount + ' Personel · ' + dh.bayiCount + ' Bayi') : '';
  var tsTxt   = loadTs || ((typeof DONEM !== 'undefined' && DONEM) ? DONEM : '');
  return '<div class="hd-vkutu">' +
    '<div class="hd-vk-status">' +
      '<span class="hd-vk-dot ' + (isOk ? 'vk-ok' : 'vk-warn') + '"></span>' +
      (isOk ? 'Güncel Veri' : 'Kolon Uyarısı') +
    '</div>' +
    (sayiTxt ? '<div class="hd-vk-sayi">' + sayiTxt + '</div>' : '') +
    (tsTxt   ? '<div class="hd-vk-ts">'   + tsTxt   + '</div>' : '') +
  '</div>';
}

/* ══════════════════════════════════════════
   Sprint 4 — GÜNLÜK HEDEF MOTORU (progress bar)
   ══════════════════════════════════════════ */
function _hdDailyTarget(kpis) {
  if (!kpis[0].hasDetay) return '';
  var cards = kpis.map(function(k) {
    var pct = k.hgo !== null ? Math.min(Math.round(k.hgo), 100) : 0;
    var barCls = pct >= 100 ? 'bar-green' : pct >= 70 ? 'bar-amber' : 'bar-red';
    var hgoCls = k.hgo !== null ? (k.hgo >= 100 ? 'hd-g' : k.hgo >= 70 ? 'hd-y' : 'hd-r') : '';
    return (
      '<div class="hd-dt-card">' +
        '<div class="hd-dt-head">' +
          '<span class="hd-dt-icon">' + k.icon + '</span>' +
          '<span class="hd-dt-prod">' + k.short + '</span>' +
          '<span class="hd-dt-hgo ' + hgoCls + '">' + (k.hgo !== null ? '%' + k.hgo.toFixed(1) : '—') + '</span>' +
          (k.fcHgo !== null ? '<span class="hd-dt-fc-bdg">F %' + Math.round(k.fcHgo) + '</span>' : '') +
        '</div>' +
        '<div class="hd-dt-bar-wrap"><div class="hd-dt-bar ' + barCls + '" style="width:' + pct + '%"></div></div>' +
        '<div class="hd-dt-nums">' +
          '<span class="hd-dt-lbl">H<strong>' + (k.h > 0 ? k.h.toLocaleString('tr-TR') : '—') + '</strong></span>' +
          '<span class="hd-dt-lbl">A<strong>' + (k.a > 0 ? k.a.toLocaleString('tr-TR') : '—') + '</strong></span>' +
          '<span class="hd-dt-lbl">K<strong class="hd-r">' + (k.kalan !== null ? k.kalan.toLocaleString('tr-TR') : '—') + '</strong></span>' +
          (k.gunluk !== null ? '<div class="hd-dt-gunluk"><div class="hd-dt-gv">' + k.gunluk + '</div><div class="hd-dt-gl">GÜNLÜK</div></div>' : '') +
        '</div>' +
      '</div>'
    );
  }).join('');
  return (
    '<div class="hd-section hd-anim" style="--i:2">' +
      '<div class="hd-sec-title">Günlük Hedef Takibi</div>' +
      '<div class="hd-dt-grid">' + cards + '</div>' +
    '</div>'
  );
}

/* ══════════════════════════════════════════
   Sprint 4 — EXECUTIVE INSIGHTS (4 panel: Top5 / Risk5 / Rising / Falling)
   ══════════════════════════════════════════ */
function _hdExecutiveInsights() {
  var mobRecs = (typeof DATA !== 'undefined' && DATA.bayi && DATA.bayi['Toplam Mobil']) || [];
  var top5  = mobRecs.slice(0, 5);
  var risk5 = mobRecs.slice(-5).slice().reverse();

  function insRow(r, i, isPod) {
    var cls    = r.g >= 100 ? 'hd-g' : r.g >= 70 ? 'hd-y' : 'hd-r';
    var podCls = isPod && i < 3 ? ' hd-ins-p' + (i + 1) : '';
    var km     = r.b && r.b.match(/^(\d+)/);
    var oc     = km ? ' onclick="openDetay(\'bayi\',\'' + km[1] + '\')" style="cursor:pointer"' : '';
    return '<div class="hd-ins-row' + podCls + '"' + oc + '>' +
      '<span class="hd-ins-n">' + (i + 1) + '</span>' +
      '<div class="hd-ins-name">' + r.p + '<div class="hd-ins-sub">' + r.b + '</div></div>' +
      '<span class="hd-ins-hgo ' + cls + '">%' + r.g.toFixed(1) + '</span>' +
    '</div>';
  }

  var top5HTML  = top5.length  ? top5.map(function(r, i) { return insRow(r, i, true);  }).join('') : '<div class="hd-ins-empty">Veri yok</div>';
  var risk5HTML = risk5.length ? risk5.map(function(r, i) { return insRow(r, i, false); }).join('') : '<div class="hd-ins-empty">Veri yok</div>';

  var risingHTML  = '<div class="hd-ins-empty">Önceki rapor yüklenmedi.</div>';
  var fallingHTML = '<div class="hd-ins-empty">Önceki rapor yüklenmedi.</div>';

  var hasPrev = (typeof PREV_DETAY !== 'undefined' && PREV_DETAY &&
                 typeof DETAY !== 'undefined' && DETAY && Object.keys(DETAY.bayiler).length);
  if (hasPrev) {
    var changes = [];
    for (var kod in DETAY.bayiler) {
      var curr = DETAY.bayiler[kod], prev = PREV_DETAY.bayiler[kod];
      if (!prev) continue;
      var cp = curr.prods['Toplam Mobil'], pp = prev.prods['Toplam Mobil'];
      if (!cp || !pp || !pp.h || !cp.h) continue;
      changes.push({ name: curr.b, sub: curr.il || '', delta: Math.round((cp.g - pp.g) * 10) / 10, hgo: cp.g, kod: kod });
    }
    changes.sort(function(a, b) { return b.delta - a.delta; });
    function chgRow(c, i) {
      var isPos  = c.delta > 0;
      var hgoCls = c.hgo >= 100 ? 'hd-g' : c.hgo >= 70 ? 'hd-y' : 'hd-r';
      var oc     = c.kod ? ' onclick="openDetay(\'bayi\',\'' + c.kod + '\')" style="cursor:pointer"' : '';
      return '<div class="hd-ins-row"' + oc + '>' +
        '<span class="hd-ins-n">' + (i + 1) + '</span>' +
        '<div class="hd-ins-name">' + c.name + '<div class="hd-ins-sub">' + c.sub + '</div></div>' +
        '<div class="hd-ins-right">' +
          '<span class="hd-ins-delta ' + (isPos ? 'hd-g' : 'hd-r') + '">' + (isPos ? '▲' : '▼') + Math.abs(c.delta).toFixed(1) + '</span>' +
          '<span class="hd-ins-hgo ' + hgoCls + '">%' + c.hgo.toFixed(1) + '</span>' +
        '</div>' +
      '</div>';
    }
    var rising  = changes.filter(function(c) { return c.delta > 0; }).slice(0, 5);
    var falling = changes.filter(function(c) { return c.delta < 0; }).slice(-5).reverse();
    risingHTML  = rising.length  ? rising.map(chgRow).join('')  : '<div class="hd-ins-empty">Artış bulunamadı.</div>';
    fallingHTML = falling.length ? falling.map(chgRow).join('') : '<div class="hd-ins-empty">Düşüş bulunamadı.</div>';
  }

  function panel(title, rows, idx) {
    return '<div class="hd-ins-panel hd-anim" style="--i:' + idx + '">' +
      '<div class="hd-ins-title">' + title + '</div>' +
      '<div class="hd-ins-body">' + rows + '</div>' +
    '</div>';
  }

  return (
    '<div class="hd-section" style="padding-top:8px">' +
      '<div class="hd-sec-title hd-anim" style="--i:3">Executive Görünüm &nbsp;·&nbsp; Toplam Mobil</div>' +
      '<div class="hd-insights-grid">' +
        panel('🔥 En İyi 5 Bayi',    top5HTML,    4) +
        panel('⚠️ Riskli 5 Bayi',   risk5HTML,   5) +
        panel('📈 En Çok Yükselen', risingHTML,  6) +
        panel('📉 En Çok Düşen',    fallingHTML, 7) +
      '</div>' +
    '</div>'
  );
}
