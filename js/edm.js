/* ════════════════════════════════════════════════════════════════════
   js/edm.js  —  EDM Kanal Yönetim Sistemi
   TTM parser ve render altyapısını mümkün olduğunca yeniden kullanır.
   Mevcut DATA / DETAY / SYDATA değiştirilmez; EDM_ önekli globals kullanılır.
   ════════════════════════════════════════════════════════════════════ */

/* ─── KANAL DEĞİŞTİRİCİ ────────────────────────────────────────────── */

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

function _kanalUI() {
  var isTTM = (KANAL === 'TTM');
  document.querySelectorAll('.ch-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.ch === KANAL);
  });
  var subEl = document.getElementById('edm-sub');
  if (subEl) subEl.style.display = isTTM ? 'none' : '';
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
    badge.textContent = 'EDM verisi bekleniyor';
    badge.className = 'edm-badge edm-badge-warn';
  }
  badge.style.display = '';
}

/* ─── EDM VERİ ERİŞİM YARDIMCILARI ─────────────────────────────────── */

/* Geçerli kanala göre bayi listesi döndür */
function activeBayiData(prodKey) {
  if (KANAL === 'EDM') {
    var recs = (EDM_DATA && EDM_DATA.bayi && EDM_DATA.bayi[prodKey]) || [];
    return _edmBtFilt(recs);
  }
  return DATA.bayi ? (DATA.bayi[prodKey] || []) : [];
}

/* Geçerli kanala göre DETAY döndür */
function activeDetay() {
  return KANAL === 'EDM' ? EDM_DETAY : DETAY;
}

/* Bayi Tipi filtresi */
function _edmBtFilt(recs) {
  if (EDM_FILTER === 'Tümü') return recs;
  return recs.filter(function(r) { return r.bt === EDM_FILTER; });
}

/* ─── EDM ANASAYFASı KPI HESAPLAMA ─────────────────────────────────── */

var _EDM_CARD_PRODS = [
  { icon: '📱', short: 'MOBİL',  dataKey: 'Toplam Mobil', detayKey: 'Toplam Mobil' },
  { icon: '🌐', short: 'DSL',    dataKey: 'DSL',           detayKey: 'DSL'          },
  { icon: '📺', short: 'TİVİBU', dataKey: 'Toplam TV',     detayKey: 'Toplam TV'    },
  { icon: '📦', short: 'CİHAZ',  dataKey: 'Akıllı Cihaz',  detayKey: 'Akıllı Cihaz' },
];

function edmKPIs() {
  var f = fc();
  var hasDetay = EDM_DETAY && Object.keys(EDM_DETAY.bayiler).length > 0;

  return _EDM_CARD_PRODS.map(function(pm) {
    var recs = _edmBtFilt((EDM_DATA && EDM_DATA.bayi && EDM_DATA.bayi[pm.dataKey]) || []);
    var totalH = 0, totalA = 0;
    if (hasDetay) {
      for (var kod in EDM_DETAY.bayiler) {
        var bayiEntry = EDM_DETAY.bayiler[kod];
        /* Apply BT filter */
        if (EDM_FILTER !== 'Tümü' && bayiEntry.bt !== EDM_FILTER) continue;
        var d = bayiEntry.prods[pm.detayKey];
        if (d) { totalH += d.h; totalA += d.a; }
      }
    }
    var hgo   = totalH > 0 ? Math.round(totalA / totalH * 1000) / 10 : (recs.length ? recs.reduce(function(s,r){return s+r.g;},0)/recs.length : null);
    var kalan = totalH > 0 ? Math.max(totalH - totalA, 0) : null;
    var fcHgo = (f && hgo !== null) ? Math.round(hgo * f.k * 10) / 10 : null;
    return { key: pm.key, label: pm.short, icon: pm.icon, h: totalH, a: totalA, hgo: hgo, kalan: kalan, fcHgo: fcHgo, hasDetay: hasDetay, f: f };
  });
}

/* ─── EDM ANA SAYFA ─────────────────────────────────────────────────── */

function renderEDMHome(el) {
  if (!EDM_DATA) {
    var msg = EDM_ERROR || 'Excel yüklendikten sonra EDM verisi otomatik okunur.';
    el.innerHTML = '<div class="gecm-welcome"><div class="gecm-wl-icon">📊</div>' +
      '<div class="gecm-wl-title">EDM Verisi Yok</div>' +
      '<div class="gecm-wl-sub">' + msg + '</div></div>';
    return;
  }

  var kpis = edmKPIs();
  el.innerHTML = [
    _edmPageHeader(),
    _edmChips(kpis),
    _edmScorecard(kpis),
    _edmLeaders(),
    _edmRiskList(),
  ].join('');
}

function _edmPageHeader() {
  var recs = _edmBtFilt((EDM_DATA.bayi['Toplam Mobil'] || []));
  var cnt  = recs.length;
  var subtitle = EDM_FILTER === 'Tümü' ? 'TTBN + ESN · ' + cnt + ' Bayi' : EDM_FILTER + ' · ' + cnt + ' Bayi';
  return '<div class="hd-page-header">' +
    '<div class="hd-ph-left"><div class="hd-ph-mark">TT</div>' +
    '<div><div class="hd-ph-title">Kuzey Anadolu EDM Merkezi</div>' +
    '<div class="hd-ph-sub">' + subtitle + ' · ' + DONEM + '</div></div></div>' +
    '<div class="hd-ph-period">EDM</div></div>';
}

function _edmChips(kpis) {
  var recs    = _edmBtFilt(EDM_DATA.bayi['Toplam Mobil'] || []);
  var bayiSay = recs.length;
  var riskliN = recs.filter(function(r) { return r.g < 60; }).length;
  var eliteN  = recs.filter(function(r) { return r.g >= 100; }).length;
  var hgoVals = kpis.map(function(k) { return k.hgo; }).filter(function(v) { return v !== null; });
  var ortHGO  = hgoVals.length ? Math.round(hgoVals.reduce(function(s,v){return s+v;},0)/hgoVals.length*10)/10 : null;
  var ortCls  = ortHGO===null?'hdc-neutral':ortHGO>=100?'hdc-green':ortHGO>=70?'hdc-amber':'hdc-red';
  var dateStr = new Date().toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'});

  function chip(lbl,val,valCls,sub) {
    return '<div class="hd-chip"><div class="hd-chip-lbl">'+lbl+'</div><div class="hd-chip-val '+valCls+'">'+val+'</div><div class="hd-chip-sub">'+sub+'</div></div>';
  }
  return '<div class="hd-chips">' +
    chip('ORT. HGO', ortHGO!==null?'%'+ortHGO.toFixed(1):'—', 'hdc-xl '+ortCls, '4 ürün ortalaması') +
    chip('RİSKLİ BAYİ', String(riskliN), riskliN>0?'hdc-red':'hdc-green', 'HGO %60 altı') +
    chip('ELİTE BAYİ', String(eliteN), eliteN>0?'hdc-gold':'hdc-neutral', 'HGO %100 üstü') +
    chip('TOPLAM BAYİ', String(bayiSay), 'hdc-neutral', EDM_FILTER+' bayi') +
    chip('BAYI TİPİ', EDM_FILTER==='Tümü'?'TTBN+ESN':EDM_FILTER, 'hdc-neutral', 'aktif filtre') +
    chip('RAPOR TARİHİ', dateStr, 'hdc-date', DONEM+' dönemi') +
  '</div>';
}

function _edmScorecard(kpis) {
  function hgoCls(v){return v===null?'':v>=100?'hd-g':v>=70?'hd-y':'hd-r';}
  function fmtN(v){return (v>0)?v.toLocaleString('tr-TR'):'—';}

  var headHTML = '<tr class="hd-sc-head-row"><th class="hd-sc-empty"></th>' +
    kpis.map(function(k){return '<th class="hd-sc-prod-th"><span class="hd-sc-prod-icon">'+k.icon+'</span><span class="hd-sc-prod-name">'+k.label+'</span></th>';}).join('')+'</tr>';

  function row(label,cells,cls){
    return '<tr class="hd-sc-row '+(cls||'')+'"><td class="hd-sc-row-lbl">'+label+'</td>'+cells.map(function(c){return '<td class="hd-sc-cell">'+c+'</td>';}).join('')+'</tr>';
  }

  var hasDetay = kpis[0].hasDetay;
  var hasF     = !!(kpis[0].f);

  return '<div class="hd-section"><div class="hd-sec-title">EDM Performans Özeti</div>' +
    '<div class="hd-score-wrap"><table class="hd-score-tbl"><thead>'+headHTML+'</thead><tbody>' +
    row('Gerçekleşen', kpis.map(function(k){return hasDetay?fmtN(k.a):'—';}), 'hd-sc-row-val') +
    row('Hedef',       kpis.map(function(k){return hasDetay?fmtN(k.h):'—';}), 'hd-sc-row-muted') +
    row('HGO&nbsp;%',  kpis.map(function(k){return '<span class="hd-sc-hgo-val '+hgoCls(k.hgo)+'">'+(k.hgo!==null?'%'+k.hgo.toFixed(1):'—')+'</span>';}), 'hd-sc-row-hgo') +
    (hasF?row('Forecast',kpis.map(function(k){return '<span class="hd-sc-hgo-val '+hgoCls(k.fcHgo)+'">'+(k.fcHgo!==null?'%'+Math.round(k.fcHgo):'—')+'</span>';}), 'hd-sc-row-fc'):'') +
    '</tbody></table></div></div>';
}

function _edmLeaders() {
  var f = fc();
  var cards = _EDM_CARD_PRODS.map(function(pm) {
    var recs = _edmBtFilt((EDM_DATA.bayi[pm.dataKey])||[]);
    return _edmPlCard(pm, recs[0]||null, true, f);
  }).join('');
  return '<div class="hd-section"><div class="hd-sec-title">EDM Ürün Liderleri</div><div class="pl-grid">'+cards+'</div></div>';
}

function _edmRiskList() {
  var f     = fc();
  var recs  = _edmBtFilt((EDM_DATA.bayi[_edmRiskProd])||[]);
  var worst5 = recs.slice(-5).slice().reverse();

  var tabsHTML = '<div class="hp-tabs hp-tabs-scroll">' +
    _EDM_CARD_PRODS.map(function(pm){
      return '<button class="hp-tab'+(pm.dataKey===_edmRiskProd?' hp-tab-on':'')+'" onclick="setEdmRiskProd(\''+pm.dataKey+'\')">'+pm.short+'</button>';
    }).join('') + '</div>';

  var rows = worst5.length ? worst5.map(function(r,i){
    var rank   = recs.length - i;
    var hgoCls = r.g>=100?'hd-g':r.g>=70?'hd-y':'hd-r';
    var fcHgo  = (f&&r.g!==null)?r.g*f.k:null;
    var fcCls  = fcHgo===null?'':fcHgo>=100?'hd-g':fcHgo>=70?'hd-y':'hd-r';
    return '<div class="hrl-row"><span class="hrl-rank">'+rank+'</span>' +
      '<div class="hrl-info"><div class="hrl-name">'+r.p+'</div><div class="hrl-loc">'+r.b+(r.bt?' · '+r.bt:'')+'</div></div>' +
      '<div class="hrl-vals"><div class="hrl-fc '+fcCls+'">F&thinsp;'+(fcHgo!==null?'%'+Math.round(fcHgo):'—')+'</div>' +
      '<div class="hrl-hgo '+hgoCls+'">%'+r.g.toFixed(1)+'</div></div></div>';
  }).join('') : '<div class="hrl-empty">Veri yok</div>';

  return '<div class="hd-section"><div class="hd-sec-head"><div class="hd-sec-title">Riskli EDM Bayileri</div>'+tabsHTML+'</div><div class="hrl-card">'+rows+'</div></div>';
}

var _edmRiskProd = 'Toplam Mobil';
function setEdmRiskProd(key) { _edmRiskProd = key; if (navPage==='ana') renderHome(); }

function _edmPlCard(pm, rec, isLeader, f) {
  if (!rec) return '<div class="pl-card pl-empty"><span class="pl-empty-txt">Veri yok</span></div>';
  var hgoCls = rec.g>=100?'hd-g':rec.g>=70?'hd-y':'hd-r';
  var dp     = null;
  if (EDM_DETAY && EDM_DETAY.bayiler) {
    var k2 = rec.b ? rec.b.split(' · ')[0].trim() : '';
    var bx = EDM_DETAY.bayiler[k2];
    if (bx) dp = bx.prods[pm.detayKey];
  }
  var fcHgo = (f&&rec.g!==null)?rec.g*f.k:null;
  var fcCls = fcHgo===null?'':fcHgo>=100?'hd-g':fcHgo>=70?'hd-y':'hd-r';
  var meta = ['F&thinsp;<span class="'+fcCls+'">'+(fcHgo!==null?'%'+Math.round(fcHgo):'—')+'</span>'];
  if (dp&&dp.h>0) meta.push('<span class="pl-na">'+dp.a.toLocaleString('tr-TR')+'/'+dp.h.toLocaleString('tr-TR')+'</span>');
  return '<div class="pl-card '+(isLeader?'pl-leader':'pl-risk')+'">' +
    '<div class="pl-head"><span class="pl-icon">'+pm.icon+'</span><span class="pl-prod">'+pm.short+'</span>' +
    '<span class="pl-badge">'+(isLeader?'🏆':'⚠️')+'</span></div>' +
    '<div class="pl-name">'+rec.p+'</div>' +
    '<div class="pl-loc">'+rec.b+(rec.bt?' · <span style="font-size:7.5px;font-weight:800;color:var(--navy-3)">'+rec.bt+'</span>':'')+'</div>' +
    '<div class="pl-hgo '+hgoCls+'">%'+rec.g.toFixed(1)+'</div>' +
    '<div class="pl-foot">'+meta.join('<span class="pl-sep">·</span>')+'</div></div>';
}

/* ─── EDM BAYİ KARTI (Bayiler ekranı) ──────────────────────────────── */

function renderEDMBayi(prodKey) {
  if (!EDM_DATA) return _edmNoData();
  var recs = _edmBtFilt((EDM_DATA.bayi[prodKey])||[]);

  /* compactListeN ve riskOnly desteği */
  if (typeof riskOnly !== 'undefined' && riskOnly) recs = recs.filter(function(r){return r.g!==null&&r.g<60;});
  if (typeof compactListeN !== 'undefined' && compactListeN < 999) recs = recs.slice(0, compactListeN);

  var f    = fc();
  var maxV = recs.length ? Math.max.apply(null, recs.map(function(r){return r.g;})) : 1;
  var PICO = {'Toplam Mobil':'📱','DSL':'🌐','Toplam TV':'📺','Akıllı Cihaz':'📦','Diğer Cihaz':'🔌','Postpaid':'📋','Prepaid':'📲'};
  var icon = PICO[prodKey] || '📊';
  var btLabel = EDM_FILTER === 'Tümü' ? 'TTBN+ESN' : EDM_FILTER;
  var sub  = 'EDM Bayi HGO · ' + btLabel + ' · ' + recs.length + ' bayi' + (f?' · Forecast '+f.d+'/'+f.t:'');

  if (!recs.length) return hdrHTML(icon, prodKey+' — EDM Bayi', 'Veri yok ('+btLabel+')');

  var rows = '';
  recs.forEach(function(r,i){
    var fhtml = '';
    if (f) { var fv=r.g*f.k; fhtml='<span class="fchip'+(fv>=100?' ok':'')+'">F %'+fv.toFixed(0)+'</span>'; }
    var w   = maxV>0?Math.min(r.g/maxV*100,100):0;
    var cls_ = r.g>=100?'g':r.g>=60?'y':'r';
    var rk  = i<3?'<span class="badge b'+(i+1)+'">'+(i+1)+'</span>':'<span class="n">'+(i+1)+'</span>';
    var btTag = r.bt ? '<span style="font-size:7px;font-weight:800;background:'+(r.bt==='TTBN'?'#EDF4FD':'#F4EDF9')+';color:'+(r.bt==='TTBN'?'#1A3A8A':'#6B3A8A')+';padding:1px 4px;border-radius:3px;margin-left:3px">'+r.bt+'</span>' : '';
    rows += '<div class="row'+(i<3?' r'+(i+1):'')+'"><div class="rk">'+rk+'</div>' +
      '<div class="nm"><div class="p">'+r.p+btTag+'</div><div class="b">'+r.b+'</div></div>' +
      '<div class="br"><div class="br-top">'+fhtml+'<span class="chip '+cls_+'">%'+r.g.toFixed(1)+'</span></div>' +
      '<div class="track"><div class="fill '+cls_+'" style="width:'+w+'%"></div></div></div></div>';
  });

  return hdrHTML(icon, prodKey+' — EDM Bayi ('+btLabel+')', sub) +
    '<div class="sec t"><span>🏢 EDM Bayileri</span><span class="cnt">HGO bazlı</span></div>' +
    rows +
    ftrHTML([[recs.length,'Bayi'],['%'+recs[0].g.toFixed(1),'Lider HGO'],[recs[0].p.split(' ')[0],'Lider']]);
}

function _edmNoData() {
  return hdrHTML('📊','EDM Verisi','') +
    '<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px">' +
    (EDM_ERROR || 'Excel raporu yükleyince EDM verisi otomatik okunur.') + '</div>';
}

/* ─── EDM SY GÖRÜNÜMÜ ───────────────────────────────────────────────── */

function renderEDMSY() {
  var cards = document.getElementById('cards');
  cards.className = 'cards single'; cards.style.maxWidth = '360px';
  cards.innerHTML = hdrHTML('👔','EDM · Satış Yöneticisi','') +
    '<div style="padding:20px;text-align:center;color:var(--muted);font-size:12px">' +
    'EDM kanalında satış yöneticisi verisi şu anda desteklenmemektedir.' +
    '</div>';
}
