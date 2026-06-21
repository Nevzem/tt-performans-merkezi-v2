/* ════════════════════════════════════════════
   js/home.js — Ana Sayfa Executive Dashboard
   Veri işleme mantığını değiştirmez;
   DATA / MATRIX / DETAY / PREV / SYDATA okur.
   ════════════════════════════════════════════ */

/* ─── ANA RENDER ─────────────────────────── */
function renderHome() {
  var el = document.getElementById('home-dashboard');
  if (!el) return;
  var kpis = _hdKPIs();
  el.innerHTML = [
    _hdPageHeader(),
    _hdChips(kpis),
    _hdScorecard(kpis),
    _hdAutoSummary(kpis),
    _hdTopBayiler(),
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
  return (
    '<div class="hd-page-header">' +
      '<div class="hd-ph-left">' +
        '<div class="hd-ph-mark">TT</div>' +
        '<div>' +
          '<div class="hd-ph-title">Kuzey Anadolu Performans Merkezi</div>' +
          '<div class="hd-ph-sub">Bayi Satış Kanalı &nbsp;·&nbsp; ' + today + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="hd-ph-period">' + DONEM + '</div>' +
    '</div>'
  );
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

  /* Ortalama HGO: mevcut 4 ürün HGO değerlerinin ortalaması */
  var hgoVals = kpis.map(function(k) { return k.hgo; })
                    .filter(function(v) { return v !== null; });
  var ortHGO = hgoVals.length
    ? Math.round(hgoVals.reduce(function(s, v) { return s + v; }, 0) / hgoVals.length * 10) / 10
    : null;

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
        '<div class="hd-chip-lbl">' + lbl + '</div>' +
        '<div class="hd-chip-val ' + valCls + '">' + val + '</div>' +
        '<div class="hd-chip-sub">' + sub + '</div>' +
      '</div>'
    );
  }

  return (
    '<div class="hd-chips">' +
      chip('ORT. HGO',         ortHGO !== null ? '%' + ortHGO.toFixed(1) : '—',
                               'hdc-xl ' + ortCls,  '4 ürün ortalaması') +
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
   4. OTOMATİK BÖLGE ÖZETİ
   ══════════════════════════════════════════ */
function _hdAutoSummary(kpis) {
  var mob   = kpis[0], dsl = kpis[1], tv = kpis[2], cihaz = kpis[3];
  var lines = [];

  function fc2(k) { return k.fcHgo !== null ? ' Forecast %' + Math.round(k.fcHgo) + '.' : ''; }

  if (mob.hgo !== null) {
    if      (mob.hgo >= 100) lines.push({ icon: '✅', text: 'Mobil kanalı hedefe ulaştı (%' + mob.hgo.toFixed(1) + ').' + fc2(mob) });
    else if (mob.hgo >= 85)  lines.push({ icon: '📈', text: 'Mobil güçlü seyrediyor (%' + mob.hgo.toFixed(1) + '). Kapanış potansiyeli yüksek.' + fc2(mob) });
    else if (mob.hgo >= 65)  lines.push({ icon: '⚠️', text: 'Mobil hedefin gerisinde (%' + mob.hgo.toFixed(1) + '). Tempo artırılmalı.' + fc2(mob) });
    else                      lines.push({ icon: '🔴', text: 'Mobil kritik seviyede (%' + mob.hgo.toFixed(1) + '). Acil aksiyon gerekiyor.' + fc2(mob) });
  }
  if (dsl.hgo !== null) {
    if      (dsl.hgo >= 95) lines.push({ icon: '✅', text: 'DSL hedefine yakın (%' + dsl.hgo.toFixed(1) + ').' + fc2(dsl) });
    else if (dsl.hgo >= 65) lines.push({ icon: '📊', text: 'DSL tarafında tempo korunursa ay sonu hedefe yaklaşılabilir (%' + dsl.hgo.toFixed(1) + ').' + fc2(dsl) });
    else                     lines.push({ icon: '⚠️', text: 'DSL riskli görünmektedir (%' + dsl.hgo.toFixed(1) + '). Destek önlemi önerilir.' + fc2(dsl) });
  }
  if (tv.hgo !== null) {
    if      (tv.hgo >= 90)  lines.push({ icon: '✅', text: 'TV/Tivibu hedefine yakın (%' + tv.hgo.toFixed(1) + ').' });
    else if (tv.hgo >= 60)  lines.push({ icon: '📊', text: 'TV/Tivibu orta düzeyde (%' + tv.hgo.toFixed(1) + '). Ek satış fırsatları değerlendirilebilir.' });
    else                     lines.push({ icon: '⚠️', text: 'TV/Tivibu zayıf seyrediyor (%' + tv.hgo.toFixed(1) + '). Odak artırılmalı.' });
  }
  if (cihaz.hgo !== null) {
    if      (cihaz.hgo >= 95) lines.push({ icon: '✅', text: 'Cihaz hedef üzerinde (%' + cihaz.hgo.toFixed(1) + '). İvme korunmalı.' });
    else if (cihaz.hgo >= 65) lines.push({ icon: '📊', text: 'Cihaz makul düzeyde (%' + cihaz.hgo.toFixed(1) + ').' });
    else                       lines.push({ icon: '⚠️', text: 'Cihaz riskli görünmektedir (%' + cihaz.hgo.toFixed(1) + ').' });
  }

  if (!lines.length) lines.push({ icon: '📊', text: 'Rapor yüklendikten sonra bölge özeti burada otomatik oluşturulacak.' });

  return (
    '<div class="hd-section">' +
      '<div class="hd-sec-title">Bölge Özeti</div>' +
      '<div class="hd-summary-card">' +
        lines.map(function(l) {
          return '<div class="hd-summary-line">' +
            '<span class="hd-sum-icon">' + l.icon + '</span>' +
            '<span class="hd-sum-text">' + l.text + '</span>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>'
  );
}

/* ══════════════════════════════════════════
   5. İLK 5 / SON 5 BAYİ LİSTESİ
   ══════════════════════════════════════════ */
function _hdTopBayiler() {
  var recs = (DATA.bayi && DATA.bayi['Toplam Mobil']) || [];
  if (!recs.length) return '';

  var top5 = recs.slice(0, 5);
  var bot5 = recs.slice(-5).slice().reverse();
  var prevRecs = (PREV && PREV.bayi && PREV.bayi['Toplam Mobil']) || null;

  function deltaTag(r, curIdx) {
    if (!prevRecs) return '';
    var pi = prevRecs.findIndex(function(x) { return x.p === r.p; });
    if (pi === -1) return '<span class="hd-bdelta hd-bd-new">YENİ</span>';
    var d = pi - curIdx;
    if (d > 0) return '<span class="hd-bdelta hd-bd-up">▲' + d + '</span>';
    if (d < 0) return '<span class="hd-bdelta hd-bd-dn">▼' + Math.abs(d) + '</span>';
    return '<span class="hd-bdelta hd-bd-eq">—</span>';
  }

  function bRow(r, dispRank, isTop) {
    var ci  = recs.findIndex(function(x) { return x.p === r.p; });
    var medal = dispRank === 1 ? '🥇' : dispRank === 2 ? '🥈' : dispRank === 3 ? '🥉' : null;
    var rkHTML = medal
      ? '<span class="hd-medal">' + medal + '</span>'
      : '<span class="hd-rank-n">' + dispRank + '</span>';
    var hgoCls  = r.g >= 100 ? 'hd-g' : r.g >= 60 ? 'hd-y' : 'hd-r';
    var podCls  = (isTop && dispRank <= 3) ? ' hd-pod' + dispRank : '';
    return (
      '<div class="hd-brow' + podCls + '">' +
        '<div class="hd-brk">' + rkHTML + '</div>' +
        deltaTag(r, ci) +
        '<div class="hd-bnm">' +
          '<div class="hd-bp">' + r.p + '</div>' +
          '<div class="hd-bb">' + r.b + '</div>' +
        '</div>' +
        '<div class="hd-bhgo ' + hgoCls + '">%' + r.g.toFixed(1) + '</div>' +
      '</div>'
    );
  }

  return (
    '<div class="hd-section">' +
      '<div class="hd-sec-title">Bayi Sıralaması &nbsp;·&nbsp; Toplam Mobil</div>' +
      '<div class="hd-bl-card">' +
        '<div class="hd-bl-head hd-bl-top">🏆 İLK 5</div>' +
        top5.map(function(r, i) { return bRow(r, i + 1, true);  }).join('') +
        '<div class="hd-bl-divider"></div>' +
        '<div class="hd-bl-head hd-bl-bot">📉 SON 5</div>' +
        bot5.map(function(r, i) { return bRow(r, recs.length - i, false); }).join('') +
      '</div>' +
    '</div>'
  );
}

/* ══════════════════════════════════════════
   6. RİSK MERKEZİ
   ══════════════════════════════════════════ */
function _hdRiskCenter(kpis) {
  var f        = fc();
  var _gA      = (SYDATA && SYDATA.calismaGun)  || 0;
  var _gB      = (SYDATA && SYDATA.calisilanGun) || 0;
  var ayGun    = Math.max(_gA, _gB);
  var gecenGun = Math.min(_gA, _gB);
  var kalanGun = (ayGun > 0 && gecenGun > 0 && ayGun > gecenGun) ? ayGun - gecenGun : null;

  var recs     = (DATA.bayi && DATA.bayi['Toplam Mobil']) || [];
  var prevRecs = (PREV && PREV.bayi && PREV.bayi['Toplam Mobil']) || null;

  /* 1. Kritik (HGO < 60) */
  var kritik = recs.filter(function(r) { return r.g < 60; });

  /* 2. Sıra kaybeden bayiler */
  var dususte = [];
  if (prevRecs) {
    dususte = recs.filter(function(r, ci) {
      var pi = prevRecs.findIndex(function(x) { return x.p === r.p; });
      return pi !== -1 && pi > ci;
    }).slice(0, 5);
  }

  /* 3. Forecast riski (ay sonu < %85) */
  var fcRisk = [];
  if (f) fcRisk = recs.filter(function(r) { return r.g * f.k < 85; }).slice(0, 5);

  /* 4. Günlük yükü yüksek (≥ 5 adet/gün) */
  var gunlukYuksek = [];
  if (kalanGun && DETAY && Object.keys(DETAY.bayiler).length) {
    var items = [];
    for (var kod in DETAY.bayiler) {
      var b  = DETAY.bayiler[kod];
      var pm = b.prods['Toplam Mobil'];
      if (!pm || pm.h === 0) continue;
      var kalan  = Math.max(pm.h - pm.a, 0);
      var gunluk = Math.ceil(kalan / kalanGun);
      if (gunluk >= 5) items.push({ name: b.b, gunluk: gunluk });
    }
    items.sort(function(a, b) { return b.gunluk - a.gunluk; });
    gunlukYuksek = items.slice(0, 5);
  }

  var hasAny = kritik.length || dususte.length || fcRisk.length || gunlukYuksek.length;
  if (!hasAny) return '';

  function rCard(accentCls, icon, title, cnt, rows) {
    return (
      '<div class="hd-rc-card ' + accentCls + '">' +
        '<div class="hd-rc-head">' +
          '<span>' + icon + '&nbsp;' + title + '</span>' +
          '<span class="hd-rc-cnt">' + cnt + '</span>' +
        '</div>' +
        rows +
      '</div>'
    );
  }
  function rRow(name, valHTML) {
    return '<div class="hd-rc-row"><span class="hd-rc-name">' + name + '</span>' + valHTML + '</div>';
  }

  var html = '<div class="hd-section"><div class="hd-sec-title">Risk Merkezi</div><div class="hd-rc-list">';

  if (kritik.length)
    html += rCard('hd-rc-hi', '🔴', 'Kritik Bayiler',
      kritik.length + ' bayi · HGO %60 altı',
      kritik.slice(0, 5).map(function(r) {
        return rRow(r.p, '<span class="hd-rc-val hd-r">%' + r.g.toFixed(1) + '</span>');
      }).join(''));

  if (dususte.length)
    html += rCard('hd-rc-md', '🟡', 'Sıra Kaybeden',
      dususte.length + ' bayi · önceki güne göre',
      dususte.map(function(r) {
        return rRow(r.p, '<span class="hd-rc-val hd-y">%' + r.g.toFixed(1) + '&nbsp;▼</span>');
      }).join(''));

  if (fcRisk.length)
    html += rCard('hd-rc-fc', '⚠️', 'Forecast Riski',
      fcRisk.length + ' bayi · ay sonu %85 altı',
      fcRisk.map(function(r) {
        return rRow(r.p, '<span class="hd-rc-val hd-y">F&nbsp;%' + Math.round(r.g * f.k) + '</span>');
      }).join(''));

  if (gunlukYuksek.length)
    html += rCard('hd-rc-gn', '📌', 'Günlük Yük Yüksek',
      gunlukYuksek.length + ' bayi · ≥5 adet/gün',
      gunlukYuksek.map(function(r) {
        return rRow(r.name, '<span class="hd-rc-val hd-navy">' + r.gunluk.toLocaleString('tr-TR') + '&nbsp;adet/gün</span>');
      }).join(''));

  html += '</div></div>';
  return html;
}
