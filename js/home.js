/* ════════════════════════════════════════════
   js/home.js — Ana Sayfa Executive Dashboard
   Veri işleme mantığını değiştirmez;
   DATA / MATRIX / DETAY / PREV / SYDATA okur.
   ════════════════════════════════════════════ */

/* Önceki raporun DETAY verisi (parser.js tarafından set edilir) */
var PREV_DETAY = null;

/* Ana Sayfa SY filtresi */
var _homeSY = 'Tümü';

function setHomeSyFilter(key) {
  _homeSY = key;
  renderHome();
}

/* Kayıt dizisini _homeSY'ye göre filtreler (DATA.bayi / DATA.pers kayıtları) */
function _hdFilterBySY(recs) {
  if (_homeSY === 'Tümü') return recs;
  return (recs || []).filter(function(r) { return r.sy === _homeSY; });
}

/* DETAY.bayiler nesnesini _homeSY'ye göre filtreler */
function _hdDetayFiltered() {
  var bayiler = (typeof DETAY !== 'undefined' && DETAY && DETAY.bayiler) ? DETAY.bayiler : {};
  if (_homeSY === 'Tümü') return bayiler;
  var result = {};
  for (var k in bayiler) {
    if (bayiler[k].sy === _homeSY) result[k] = bayiler[k];
  }
  return result;
}

/* Ana Sayfa içi ürün filtresi state'leri */
var _homePersRankProd = 'Toplam Mobil';
var _homeBayiRankProd = 'Toplam Mobil';
var _hdInsightProd   = 'Toplam Mobil';

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

function setHomePersRankProd(k) { _homePersRankProd = k; renderHome(); }
function setHomeBayiRankProd(k) { _homeBayiRankProd = k; renderHome(); }
function setHdInsightProd(k)    { _hdInsightProd   = k; renderHome(); }

/* ── SY Filtre Çubuğu (Ana Sayfa) ── */
function _hdSyFilter() {
  var list = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.homeSY) ? APP_CONFIG.homeSY : [];
  if (!list.length) return '';
  var activeLabel = _homeSY === 'Tümü' ? 'Tümü'
    : (list.find(function(t) { return t.key === _homeSY; }) || { label: _homeSY }).label;
  return '<div class="hd-sy-filter hd-anim" style="--i:0.5">' +
    '<span class="hd-sy-label">SY</span>' +
    '<div class="hd-sy-tabs">' +
      '<button class="hd-sy-tab' + (_homeSY === 'Tümü' ? ' hd-sy-on' : '') + '" onclick="setHomeSyFilter(\'Tümü\')">Tümü</button>' +
      list.map(function(t) {
        var on = (_homeSY === t.key);
        return '<button class="hd-sy-tab' + (on ? ' hd-sy-on' : '') + '" onclick="setHomeSyFilter(\'' + t.key.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + '\')">' + t.label + '</button>';
      }).join('') +
    '</div>' +
    (_homeSY !== 'Tümü' ? '<span class="hd-sy-badge">' + activeLabel + '</span>' : '') +
  '</div>';
}

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
  /* Sprint 18: sadeleştirilmiş executive akış —
     Hero → SY → 4 Çip → Günlük Hedef → Performans Özeti → Executive Görünüm → Top3 sıralamalar */
  el.innerHTML = [
    _hdHero(),
    _hdSyFilter(),
    _hdChips(kpis),
    _hdDailyTarget(kpis),
    _hdScorecard(kpis),
    _hdExecutiveInsights(),
    _hdPersRanking(),
    _hdBayiRanking(),
  ].join('');
}

/* ══════════════════════════════════════════
   2. ÖZET ÇİPLER — 2×3 grid, 6 metrik
   Görsel öncelik: Ort.HGO → Riskli → Elite
   → T.Bayi → T.Pers → Tarih
   ══════════════════════════════════════════ */
function _hdChips(kpis) {
  var recs    = _hdFilterBySY(DATA.bayi['Toplam Mobil'] || []);
  var bayiSay = recs.length;
  var riskliN = recs.filter(function(r) { return r.g < 60; }).length;
  var eliteN  = recs.filter(function(r) { return r.g >= 100; }).length;

  /* Kritik Bayi: herhangi bir üründe HGO %70 altı */
  var kritikSet = {};
  [DATA.bayi['Toplam Mobil']||[], DATA.bayi['DSL']||[], DATA.bayi['Toplam TV']||[], DATA.bayi['Akıllı Cihaz']||[]].forEach(function(arr) {
    _hdFilterBySY(arr).forEach(function(r) { if (r.g < 70) { var _k = (r.b||'').split(' · ')[0].trim(); if (_k) kritikSet[_k] = 1; } });
  });
  var kritikN = Object.keys(kritikSet).length;

  /* Operasyon Skoru: Mobil%40 + DSL%25 + TV%20 + Cihaz%15 − riskli ceza − veri cezası */
  var _wts = [0.40, 0.25, 0.20, 0.15];
  var _base = 0;
  kpis.forEach(function(k, i) { if (k.hgo !== null) _base += k.hgo * _wts[i]; });
  var _riskP = Math.min(riskliN, 15);
  var _dataP = (typeof DATA_HEALTH !== 'undefined' && DATA_HEALTH && !DATA_HEALTH.ok) ? 3 : 0;
  var _opsScore = Math.min(Math.max(Math.round(_base - _riskP - _dataP), 0), 100);
  var _opsCls   = 'hdc-xl ' + (_opsScore >= 95 ? 'hdc-ops-elite' : _opsScore >= 90 ? 'hdc-ops-good' : _opsScore >= 80 ? 'hdc-ops-amber' : 'hdc-ops-red');

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

  /* Sprint 18: 6 çip → 4 çip.
     Toplam Personel hero'daki veri kutusunda; Riskli Bayi, Kritik Bayi ile birleşti. */
  return (
    '<div class="hd-chips hd-chips-4 hd-anim" style="--i:1">' +
      chip('OPERASYON SKORU', String(_opsScore),
                              _opsCls, 'M40·D25·TV20·C15 − risk cezası') +
      chip('KRİTİK BAYİ',    String(kritikN),
                              kritikN > 0 ? 'hdc-red' : 'hdc-green', 'herhangi bir ürün <%70') +
      chip('ELİTE BAYİ',     String(eliteN),
                              eliteN  > 0 ? 'hdc-gold' : 'hdc-neutral', 'HGO %100 üstü') +
      chip('TOPLAM BAYİ',    String(bayiSay),
                              'hdc-neutral', 'aktif TTM bayisi') +
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
  { key: 'cihaz', label: 'Cihaz',        dataKey: 'Toplam Cihaz',  altDataKey: 'Akıllı Cihaz', mxKey: 'cihaz', icon: '📦', short: 'CİHAZ'  },
];

function _hdKPIs() {
  var f        = fc();
  var _gA      = (SYDATA && SYDATA.calismaGun)  || 0;
  var _gB      = (SYDATA && SYDATA.calisilanGun) || 0;
  var ayGun    = Math.max(_gA, _gB);
  var gecenGun = Math.min(_gA, _gB);
  var kalanGun = (ayGun > 0 && gecenGun > 0 && ayGun > gecenGun) ? ayGun - gecenGun : null;
  var _filteredBayiler = _hdDetayFiltered();
  var hasDetay = DETAY && Object.keys(_filteredBayiler).length > 0;

  return _HD_PRODS.map(function(pm) {
    var totalH = 0, totalA = 0;
    if (hasDetay) {
      for (var kod in _filteredBayiler) {
        var d = _filteredBayiler[kod].prods[pm.dataKey];
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
      var precs = _hdFilterBySY(PREV.bayi[pm.dataKey] || (pm.altDataKey ? PREV.bayi[pm.altDataKey] : null) || []);
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
  function hgoCls(v) { var b = hgo3(v); return b ? 'hd-' + b : ''; }
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
      (hasF ? '<div class="hd-fc-note">Forecast, mevcut tempoya göre doğrusal ay sonu tahminidir (HGO × ay günü ÷ geçen gün).</div>' : '') +
    '</div>'
  );
}

/* ══════════════════════════════════════════
   4. AI OPERASYON ÖZETİ
   ══════════════════════════════════════════ */
function _hdGetAksiyon(key, h) {
  if (h === null) return 'Excel yüklendikten sonra öneri oluşturulacak.';
  if (key === 'mobil') {
    if (h >= 100) return 'İvme korunmalı, kapanışa kadar ziyaretler sürdürülmeli.';
    if (h >= 85)  return 'Satış temsilcisi ziyaretleri artırılmalı.';
    if (h >= 65)  return 'Günlük kota takibi yoğunlaştırılmalı.';
    return 'Acil saha desteği, SY devreye girmeli.';
  }
  if (key === 'dsl') {
    if (h >= 95) return 'Fiber dönüşüm takipte tutulmalı.';
    if (h >= 65) return 'Fiber kampanya teklifleri artırılmalı.';
    return 'DSL alarm durumu, satış ekibi yönlendirilmeli.';
  }
  if (key === 'tv') {
    if (h >= 90) return 'Paket satışı sürdürülmeli.';
    if (h >= 60) return 'TV+İnternet paket kampanyası önerilmeli.';
    return 'Tivibu farkındalığı artırılmalı.';
  }
  if (h >= 95) return 'Premium cihaz satışı desteklenmeli.';
  if (h >= 65) return 'Taksit kampanyaları tanıtılmalı.';
  return 'Cihaz satış eğitimi verilmeli.';
}

/* Sprint 18: "Operasyon Notları" bölümü kaldırıldı — aksiyon önerileri
   artık Günlük Hedef Takibi kartlarının içinde tek satır olarak yaşıyor.
   Ölü kod temizliği: _hdAutoSummary, _hdLeaders, _plCard, _detayProd,
   _CARD_PRODS, _hdRiskList, _hdRiskCenter, _hdAdetGrowth silindi. */

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

/* ══════════════════════════════════════════
   7. PERSONEL ÜRÜN SIRALAMASI
   ══════════════════════════════════════════ */
function _hdPersRanking() {
  var prodKey  = _homePersRankProd;
  var recs     = _hdFilterBySY((DATA.pers && DATA.pers[prodKey]) || []);
  /* Sprint 18: ana sayfada ilk 3 — tam liste Personel sekmesinde */
  var top10    = recs.slice(0, 3);

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
    var hgoCls = 'hd-' + (hgo3(r.g) || 'r');
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
          '<div class="rnk-bar-wrap"><div class="rnk-bar ' + hgoCls + '" style="width:' + Math.min(r.g, 100).toFixed(0) + '%"></div></div>' +
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
      '<button class="rnk-more" onclick="navTo(\'pers\')">Tüm Personel Sıralaması →</button>' +
    '</div>'
  );
}

/* ══════════════════════════════════════════
   8. BAYİ ÜRÜN SIRALAMASI
   ══════════════════════════════════════════ */
function _hdBayiRanking() {
  var prodKey = _homeBayiRankProd;
  var recs    = _hdFilterBySY((DATA.bayi && DATA.bayi[prodKey]) || []);
  /* Sprint 18: ana sayfada ilk 3 — tam liste Bayiler sekmesinde */
  var top5    = recs.slice(0, 3);

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
    var hgoCls = 'hd-' + (hgo3(r.g) || 'r');
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
          '<div class="rnk-bar-wrap"><div class="rnk-bar ' + hgoCls + '" style="width:' + Math.min(r.g, 100).toFixed(0) + '%"></div></div>' +
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
      '<button class="rnk-more" onclick="navTo(\'bayi\')">Tüm Bayi Sıralaması →</button>' +
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
  var dh   = (typeof DATA_HEALTH !== 'undefined' && DATA_HEALTH) ? DATA_HEALTH : null;
  var isOk = !dh || dh.ok;
  return '<div class="hd-vkutu">' +
    '<div class="hd-vk-status"><span class="hd-vk-dot ' + (isOk ? 'vk-ok' : 'vk-warn') + '"></span>' + (isOk ? 'Güncel Veri' : 'Kolon Uyarısı') + (dh && dh.warnings && dh.warnings.length ? ' (' + dh.warnings.length + ')' : '') + '</div>' +
    (dh ? '<div class="hd-vk-compact">' + dh.persCount + ' Personel · ' + dh.bayiCount + ' Bayi</div>' : '') +
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
    var hgoCls = k.hgo !== null ? 'hd-' + (hgo3(k.hgo) || 'r') : '';
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
          '<span class="hd-dt-lbl">Hedef<strong>' + (k.h > 0 ? k.h.toLocaleString('tr-TR') : '—') + '</strong></span>' +
          '<span class="hd-dt-lbl">Gerçekleşen<strong>' + (k.a > 0 ? k.a.toLocaleString('tr-TR') : '—') + '</strong></span>' +
          '<span class="hd-dt-lbl">Kalan<strong class="hd-r">' + (k.kalan !== null ? k.kalan.toLocaleString('tr-TR') : '—') + '</strong></span>' +
          (k.gunluk !== null ? '<div class="hd-dt-gunluk"><div class="hd-dt-gv">' + k.gunluk + '</div><div class="hd-dt-gl">GÜNLÜK</div></div>' : '') +
        '</div>' +
        '<div class="hd-dt-aksiyon">→ ' + _hdGetAksiyon(k.key, k.hgo) + '</div>' +
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
  var _ipm    = _HP_PRODS.filter(function(p) { return p.key === _hdInsightProd; })[0] || _HP_PRODS[0];
  var dataKey  = _ipm.key;
  var detayKey = _ipm.detayKey;
  var recs     = _hdFilterBySY((typeof DATA !== 'undefined' && DATA.bayi && DATA.bayi[dataKey]) || []);
  var top5     = recs.slice(0, 5);
  var risk5    = recs.slice(-5).slice().reverse();

  function insRow(r, i, isPod) {
    var cls    = 'hd-' + (hgo3(r.g) || 'r');
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
    var _filteredForInsights = _hdDetayFiltered();
    for (var eKod in _filteredForInsights) {
      var eCurr = _filteredForInsights[eKod], ePrev = PREV_DETAY.bayiler[eKod];
      if (!ePrev) continue;
      var ecp = eCurr.prods[detayKey], epp = ePrev.prods[detayKey];
      if (!ecp || !epp || !epp.h || !ecp.h) continue;
      changes.push({ name: eCurr.b, sub: eCurr.il || '', delta: Math.round((ecp.g - epp.g) * 10) / 10, hgo: ecp.g, kod: eKod });
    }
    changes.sort(function(a, b) { return b.delta - a.delta; });
    function chgRow(c, i) {
      var isDrop = c.delta < 0;
      var hgoCls = 'hd-' + (hgo3(c.hgo) || 'r');
      var oc     = c.kod ? ' onclick="openDetay(\'bayi\',\'' + c.kod + '\')" style="cursor:pointer"' : '';
      return '<div class="hd-ins-row"' + oc + '>' +
        '<span class="hd-ins-n">' + (i + 1) + '</span>' +
        '<div class="hd-ins-name">' + c.name + '<div class="hd-ins-sub">' + c.sub + '</div></div>' +
        '<div class="hd-ins-right">' +
          '<span class="hd-ins-delta ' + (isDrop ? 'hd-r' : 'hd-g') + '">' + (isDrop ? '▼ ' : '▲ +') + Math.abs(c.delta).toFixed(1) + ' HGO</span>' +
          '<span class="hd-ins-hgo ' + hgoCls + '">%' + c.hgo.toFixed(1) + '</span>' +
        '</div>' +
      '</div>';
    }
    var rising  = changes.filter(function(c) { return c.delta > 0; }).slice(0, 5);
    /* Sprint 17: yalnızca gerçekten düşenler listelenir (başlıkla tutarlı) */
    var falling = changes.slice().reverse().filter(function(c) { return c.delta < 0; }).slice(0, 5);
    risingHTML  = rising.length  ? rising.map(function(c, i)  { return chgRow(c, i); }).join('') : '<div class="hd-ins-empty">Artış bulunamadı.</div>';
    fallingHTML = falling.length ? falling.map(function(c, i) { return chgRow(c, i); }).join('') : '<div class="hd-ins-empty">Düşüş yok — tüm bayiler artıda.</div>';
  }

  function panel(title, rows, idx) {
    return '<div class="hd-ins-panel hd-anim" style="--i:' + idx + '">' +
      '<div class="hd-ins-title">' + title + '</div>' +
      '<div class="hd-ins-body">' + rows + '</div>' +
    '</div>';
  }

  return (
    '<div class="hd-section" style="padding-top:8px">' +
      '<div class="hd-sec-head">' +
        '<div class="hd-sec-title hd-anim" style="--i:3">Executive Görünüm</div>' +
        _hpTabs(_hdInsightProd, 'setHdInsightProd', true) +
      '</div>' +
      '<div class="hd-insights-grid">' +
        panel('🔥 En İyi 5 Bayi',    top5HTML,    4) +
        panel('⚠️ Riskli 5 Bayi',   risk5HTML,   5) +
        panel('📈 En Çok Yükselen', risingHTML,  6) +
        panel('📉 En Çok Düşen',    fallingHTML, 7) +
      '</div>' +
    '</div>'
  );
}
