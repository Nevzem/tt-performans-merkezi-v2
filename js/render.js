/* ════════════════════════════════════════════
   js/render.js
   Trend deposu (localStorage) + tüm ekran
   üretim (render) katmanı: personel, bayi,
   matris, SY, kupa, bayi detayı, trend, risk
   radarı ve sekme/görünüm yönetimi.
   ════════════════════════════════════════════ */

function trendLoad() {
  try { const s = localStorage.getItem(TREND_KEY); return s ? JSON.parse(s) : {}; }
  catch(e) { return {}; }
}
function trendSave(obj) {
  try { localStorage.setItem(TREND_KEY, JSON.stringify(obj)); return true; }
  catch(e) { return false; }
}
// Her güncel rapor yüklendiğinde o günün özetini kaydet (gün anahtarı = bugünün tarihi)
function trendCapture(forceDate, srcData, srcDonem) {
  const store = trendLoad();
  const today = forceDate || new Date().toISOString().slice(0,10); // YYYY-MM-DD
  const D = srcData || DATA;
  const snap = { donem: srcDonem || DONEM, pers: {}, bayi: {} };
  // Personel: tüm ürünler
  for (const prod of ["Toplam Mobil","Faturalı","Faturasız","DSL","Toplam TV","IPTV","Uydu","Cihaz"]) {
    for (const r of ((D.pers[prod])||[])) {
      (snap.pers[r.p] = snap.pers[r.p] || {})[prod] = r.g;
    }
  }
  // Bayi: ürünler
  for (const prod of ["Toplam Mobil","DSL","Toplam TV","Toplam Cihaz"]) {
    for (const r of ((D.bayi[prod])||[])) {
      (snap.bayi[r.p] = snap.bayi[r.p] || {})[prod] = r.g;
    }
  }
  store[today] = snap;
  // Son 30 günü tut
  const days = Object.keys(store).sort();
  if (days.length > 30) for (const d of days.slice(0, days.length-30)) delete store[d];
  trendSave(store);
}
// Bir kişi/bayi için ürün bazlı tarihsel seri döndür
function trendSeries(scope, name, prod) {
  const store = trendLoad();
  const days = Object.keys(store).sort();
  const pts = [];
  for (const d of days) {
    const v = store[d] && store[d][scope] && store[d][scope][name] && store[d][scope][name][prod];
    if (v !== undefined && v !== null) pts.push({ d, v });
  }
  return pts;
}
// İvme: son iki nokta farkı
function trendDelta(scope, name, prod) {
  const s = trendSeries(scope, name, prod);
  if (s.length < 2) return null;
  return Math.round((s[s.length-1].v - s[s.length-2].v)*10)/10;
}
// SVG sparkline üret
function sparkline(pts, w, h, color) {
  if (!pts.length) return '';
  if (pts.length === 1) return '<svg width="'+w+'" height="'+h+'"><circle cx="'+(w/2)+'" cy="'+(h/2)+'" r="2.5" fill="'+color+'"/></svg>';
  const vals = pts.map(p=>p.v);
  const mn = Math.min(...vals), mx = Math.max(...vals), rng = (mx-mn)||1;
  const step = w/(pts.length-1);
  const pad = 3;
  const coords = pts.map((p,i)=>{ const x=i*step; const y=pad+(h-2*pad)*(1-(p.v-mn)/rng); return [x,y]; });
  const path = coords.map((c,i)=>(i?'L':'M')+c[0].toFixed(1)+' '+c[1].toFixed(1)).join(' ');
  const last = coords[coords.length-1];
  const area = 'M0 '+h+' ' + coords.map(c=>'L'+c[0].toFixed(1)+' '+c[1].toFixed(1)).join(' ') + ' L'+w+' '+h+' Z';
  return '<svg width="'+w+'" height="'+h+'" style="display:block">' +
    '<path d="'+area+'" fill="'+color+'22"/>' +
    '<path d="'+path+'" fill="none" stroke="'+color+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="'+last[0].toFixed(1)+'" cy="'+last[1].toFixed(1)+'" r="2.4" fill="'+color+'"/></svg>';
}

function syList() {
  const s = new Set(); const src = DATA[section] || {};
  for (const k in src) for (const r of src[k]) if (r.sy) s.add(r.sy);
  return ["Tümü", ...[...s].sort()];
}
function filt(recs) {
  var r = sy === "Tümü" ? recs : recs.filter(function(x) { return x.sy === sy; });
  if (typeof bayiFilter !== "undefined" && bayiFilter !== "Tümü")
    r = r.filter(function(x) { return x.b === bayiFilter; });
  if (typeof riskOnly !== "undefined" && riskOnly)
    r = r.filter(function(x) { return x.g !== null && x.g < 60; });
  return r;
}
function setSy(s) { sy = s; buildTabs(); render(); }

/* ───── YARDIMCILAR ───── */
const cls = g => g >= 100 ? "g" : g >= 60 ? "y" : "r";
function fc() {
  const d = parseInt(document.getElementById("day-now").value);
  const t = parseInt(document.getElementById("day-total").value);
  return (d > 0 && t > 0 && d <= t) ? { d, t, k: t / d } : null;
}
function deltaHTML(rec, prodKey) {
  if (!PREV) return "";
  const list = PREV[section] && PREV[section][prodKey] ? filt(PREV[section][prodKey]) : null;
  if (!list) return "";
  const pi = list.findIndex(x => x.p === rec.p);
  if (pi === -1) return '<div class="delta new">YENİ</div>';
  const curr = filt(DATA[section][prodKey]).findIndex(x => x.p === rec.p);
  const d = pi - curr;
  if (d > 0) return '<div class="delta up">▲' + d + '</div>';
  if (d < 0) return '<div class="delta dn">▼' + (-d) + '</div>';
  return '<div class="delta eq">—</div>';
}
function rkHTML(rank) { return rank <= 3 ? '<span class="badge b' + rank + '">' + rank + '</span>' : '<span class="n">' + rank + '</span>'; }
function rowHTML(rec, rank, maxV, podium, withFc, prodKey) {
  const f = withFc ? fc() : null;
  let fhtml = "";
  if (f) { const fv = rec.g * f.k; fhtml = '<span class="fchip' + (fv >= 100 ? " ok" : "") + '">F %' + fv.toFixed(0) + '</span>'; }
  const w = maxV > 0 ? Math.min(rec.g / maxV * 100, 100) : 0;
  const tick = maxV > 100 ? '<div class="tick" style="left:' + (100 / maxV * 100) + '%"></div>' : "";
  return '<div class="row' + (podium && rank <= 3 ? " r" + rank : "") + '">' +
    '<div class="rk">' + rkHTML(rank) + '</div>' + deltaHTML(rec, prodKey) +
    '<div class="nm"><div class="p">' + rec.p + '</div><div class="b">' + rec.b + '</div></div>' +
    '<div class="br"><div class="br-top">' + fhtml + '<span class="chip ' + cls(rec.g) + '">%' + rec.g.toFixed(1) + '</span></div>' +
    '<div class="track"><div class="fill ' + cls(rec.g) + '" style="width:' + w + '%"></div>' + tick + '</div></div></div>';
}
function hdrHTML(icon, t, sub) {
  return '<div class="hdr"><div class="hdr-stripe"></div><div class="hdr-gold"></div><div class="hdr-body">' +
    '<div class="hdr-row"><div class="brand"><div class="brand-mark">TT</div>' +
    '<div class="brand-txt">Türk Telekom<small>KUZEY ANADOLU BÖLGESİ</small></div></div>' +
    '<div class="donem">' + DONEM + '</div></div>' +
    '<div class="title">' + icon + ' ' + t + '</div><div class="subtitle">' + sub + '</div></div></div>';
}
function ftrHTML(items) {
  return '<div class="ftr">' + items.map((it, i) => (i ? '<div class="fsep"></div>' : '') +
    '<div class="fs"><div class="v">' + it[0] + '</div><div class="l">' + it[1] + '</div></div>').join("") + '</div>' +
    '<div class="tagline"><span>Hedefe Birlikte</span><span class="dot">◆</span><span>' + new Date().toLocaleDateString("tr-TR") + '</span></div>';
}

/* ───── KART İÇERİĞİ (tek ürün) ───── */
function cardHTML(prodKey) {
  const N = parseInt(document.getElementById("nsel").value);
  const syTag = sy === "Tümü" ? "" : " · SY: " + sy.split(" ")[0];

  /* EDM kanalı için ayrı render */
  if (typeof KANAL !== "undefined" && KANAL === "EDM" && section === "bayi") {
    return typeof renderEDMBayi === "function" ? renderEDMBayi(prodKey) : "";
  }
  if (typeof KANAL !== "undefined" && KANAL === "EDM" && section === "sy") {
    if (typeof renderEDMSY === "function") renderEDMSY();
    return "";
  }

  if (section === "bayi") {
    let recs = filt(DATA.bayi[prodKey] || []);
    if (typeof compactListeN !== "undefined" && compactListeN < 999) recs = recs.slice(0, compactListeN);
    const icon = PRODS.bayi.find(p => p.key === prodKey).icon;
    if (!recs.length) return hdrHTML(icon, prodKey + " — Bayi", "Veri yok" + syTag);
    const maxV = Math.max(...recs.map(r => r.g)); const f = fc();
    let rows = ""; recs.forEach((r, i) => rows += rowHTML(r, i + 1, maxV, true, true, prodKey));
    const sub = "Bayi HGO sıralaması · " + recs.length + " bayi" + syTag + (f ? " · Forecast " + f.d + "/" + f.t : "");
    return hdrHTML(icon, prodKey + " — Bayi Sıralaması", sub) +
      '<div class="sec t"><span>🏢 TTM Bayileri</span><span class="cnt">' + (f ? "F = ay sonu forecast" : "HGO bazlı") + '</span></div>' +
      rows + ftrHTML([[recs.length, "Bayi"], ["%" + recs[0].g.toFixed(1), "Lider HGO"], [recs[0].p.split(" ")[0], "Lider"]]);
  }

  const icon = PRODS.pers.find(p => p.key === prodKey).icon;
  if (view === "stars") {
    let rows = "";
    for (const p of STAR_PRODS) {
      const r = filt(DATA.pers[p.key] || [])[0]; if (!r) continue;
      rows += '<div class="star-row"><div class="pic">' + p.icon + '</div><div class="info"><div class="prod">' + p.key + '</div>' +
        '<div class="who">' + r.p + '</div><div class="where">' + r.b + '</div></div>' +
        '<span class="chip ' + cls(r.g) + '" style="font-size:11.5px">%' + r.g.toFixed(1) + '</span></div>';
    }
    return hdrHTML("⭐", "Günün Yıldızları", "3 üründe zirvedeki isimler · HGO bazlı" + syTag) + rows + ftrHTML([[STAR_PRODS.length, "Ürün Lideri"], ["⭐", "Tebrikler"]]);
  }
  const recs = filt(DATA.pers[prodKey] || []);
  if (!recs.length) return hdrHTML(icon, prodKey, "Veri yok" + syTag);
  const showT = view === "top" || view === "both", showB = view === "bot" || view === "both";
  const top = recs.slice(0, N), bot = recs.slice(-N).reverse();
  const tMax = Math.max(...top.map(r => r.g)), bMax = Math.max(...bot.map(r => r.g), 1);
  let body = "";
  if (showT) { body += '<div class="sec t"><span>İlk ' + (N>900?"":N+" ") + '— Zirvedekiler</span><span class="cnt">HGO bazlı</span></div>'; top.forEach((r, i) => body += rowHTML(r, i + 1, tMax, true, false, prodKey)); }
  if (showT && showB) body += '<div class="divider"></div>';
  if (showB) { body += '<div class="sec b"><span>Son ' + (N>900?"":N+" ") + '— Gelişim Fırsatı</span><span class="cnt">HGO bazlı</span></div>'; bot.forEach((r, i) => body += rowHTML(r, recs.length - i, bMax, false, false, prodKey)); }
  return hdrHTML(icon, prodKey + " Personel Sıralaması", "HGO bazlı · " + recs.length + " hedefli personel" + syTag) +
    body + ftrHTML([[recs.length, "Personel"], ["%" + recs[0].g.toFixed(1), "En Yüksek"], [recs[0].p.split(" ")[0], "Lider"]]);
}


/* ───── MATRİS RENK + RENDER ───── */
function heat(v) {
  if (v === null || v === undefined) return "background:#F4F6FA;color:#B0B8C8";
  // 0..150 arası yeşil-sarı-kırmızı skala (100 = nötr yeşilimsi)
  let h;
  if (v >= 100) h = 130;
  else if (v >= 80) h = 90 + (v - 80);
  else if (v >= 60) h = 45 + (v - 60) * 2.25;
  else if (v >= 40) h = 20 + (v - 40) * 1.25;
  else h = Math.max(0, v * 0.5);
  const sat = 62, lig = v >= 100 ? 70 : 72;
  const txt = (h < 30 && v < 55) ? "#7A1212" : "#143A1E";
  return "background:hsl(" + h + "," + sat + "%," + lig + "%);color:" + txt;
}
function mxCell(v, isFc) {
  if (v === null || v === undefined) return '<td class="val" style="' + heat(null) + '">—</td>';
  return '<td class="val" style="' + heat(v) + '">%' + Math.round(v) + '</td>';
}
function setMatrixSort(p) { matrixSort = p; render(); }
function renderMatrix() {
  const M = MATRIX;
  const f = fc();
  const k = f ? f.k : null;
  const PCOLS = [
    { key: "mobil", lbl: "MOBİL", c: "grp-mobil" },
    { key: "dsl", lbl: "DSL", c: "grp-dsl" },
    { key: "iptv", lbl: "İP TV", c: "grp-iptv" },
    { key: "ipdsl", lbl: "İP/DSL", c: "grp-ipdsl" },
    { key: "uydu", lbl: "UYDU", c: "grp-uydu" },
    { key: "tv", lbl: "TV", c: "grp-tv" },
    { key: "cihaz", lbl: "CİHAZ", c: "grp-cihaz" },
  ];
  const sortLbl = (PCOLS.find(p => p.key === matrixSort) || {lbl:"MOBİL"}).lbl;
  let head1 = '<th colspan="3" style="background:#0A1733;color:#fff" class="grp">' + sortLbl + ' SIRALAMA</th>';
  let head2 = '<th class="sub">Sıra</th><th class="sub">Bayi Kodu</th><th class="sub">Bayi Adı</th>';
  for (const p of PCOLS) {
    head1 += '<th class="grp ' + p.c + '">' + p.lbl + '</th>';
    head2 += '<th class="sub">Forecast</th>';
  }
  const fcVal = (v) => (k && v !== null && v !== undefined) ? v * k : null;
  const sortedRows = M.rows.slice().sort((a, b) => {
    const av = a[matrixSort], bv = b[matrixSort];
    return (bv == null ? -1 : bv) - (av == null ? -1 : av);
  });
  let body = "";
  sortedRows.forEach((r, i) => {
    let tds = '<td class="idx">' + (i + 1) + '</td><td class="kod">' + r.kod + '</td>' +
      '<td class="bn">' + r.b + '<small> · ' + r.il + '</small></td>';
    for (const p of PCOLS) {
      const raw = r[p.key];
      const fv = fcVal(raw);
      if (fv === null) tds += '<td class="val" style="' + heat(raw) + '">' + (raw === null ? "—" : "%" + Math.round(raw)) + '<div class="raw">HGO</div></td>';
      else tds += '<td class="val" style="' + heat(fv) + '">%' + Math.round(fv) + '<div class="raw">HGO %' + Math.round(raw) + '</div></td>';
    }
    body += '<tr>' + tds + '</tr>';
  });
  function totRow(t, lbl, klass) {
    let tds = '<td class="lbl" colspan="3">' + lbl + '</td>';
    for (const p of PCOLS) {
      const raw = t[p.key];
      const fv = fcVal(raw);
      const st = fv === null ? "background:rgba(255,255,255,0.1)" : "";
      tds += '<td style="' + st + '">' + (fv === null ? (raw === null ? "—" : "%" + Math.round(raw)) : "%" + Math.round(fv)) + '<div style="font-size:7.5px;opacity:0.7;font-weight:600">' + (raw === null ? "" : "HGO %" + Math.round(raw)) + '</div></td>';
    }
    return '<tr class="mx-foot ' + klass + '">' + tds + '</tr>';
  }
  const sub = sortLbl + " HGO sıralaması · " + M.rows.length + " bayi · Forecast HGO" + (f ? " · " + f.d + "/" + f.t + ". gün" : " — gün bilgisi girilmeli");
  document.getElementById("cards").className = "cards";
  document.getElementById("cards").style.maxWidth = "1500px";
  const sortSel = '<div class="mx-sortbar">📊 Sıralama: ' + PCOLS.map(p =>
    '<button class="tab' + (p.key === matrixSort ? " on-prod" : "") + '" onclick="setMatrixSort(\'' + p.key + '\')">' + p.lbl + '</button>').join("") + '</div>';
  document.getElementById("cards").innerHTML = sortSel +
    '<div class="matrix-wrap" id="matrix-card"><div class="matrix-hd"><div class="ttl">📋 Konsolide Forecast Matrisi<small>Kuzey Anadolu · Tüm Ürünler · Ay Sonu Tahmini</small></div><div class="dn">' + DONEM + '</div></div>' +
    (f ? '' : '<div style="background:#FBF2E2;color:#B26B00;font-size:11px;font-weight:600;padding:8px 16px;border-bottom:1px solid #EFDCB8">⚠️ Forecast için sol panele "Geçen gün" ve "Ay toplam" bilgisini girin</div>') +
    '<div style="overflow-x:auto"><table class="mx"><thead><tr>' + head1 + '</tr><tr>' + head2 + '</tr></thead>' +
    '<tbody>' + body + '</tbody>' +
    '<tfoot>' + totRow(M.kuzey, "KUZEY ANADOLU", "kuzey") + totRow(M.anadolu, "ANADOLU", "anadolu") + '</tfoot>' +
    '</table></div></div>';
}


/* ───── SY GÖRÜNÜMÜ (mobil kart) ───── */
function renderSY() {
  const S = SYDATA;
  const prods = S.products && S.products.length ? S.products : ["Mobil Toplam"];
  if (!prods.includes(syProd)) syProd = prods[0];
  const names = Object.keys(S.sy);

  const PICO = { "Mobil Toplam":"📱","Faturalı":"📄","Faturasız":"📲","Evde İnternet":"🌐","IPTV":"📺","Uydu":"📡","Tivibu Toplam":"📺","Cihaz":"📦","Cihaz Diğer":"🔌" };
  const cls = g => g === null ? "" : g >= 100 ? "g" : g >= 80 ? "y" : "r";

  /* HGO'ya göre sırala */
  let ranked = names
    .map(nm => ({ nm, ...S.sy[nm][syProd] }))
    .filter(x => x && x.h != null)
    .map(x => ({...x, _hgo: x.h > 0 ? x.a / x.h * 100 : 0}))
    .sort((a, b) => b._hgo - a._hgo);

  /* Liste modu filtresi (filters.js tarafından yönetilir) */
  if (typeof syListMode !== "undefined") {
    if      (syListMode === 'top10') ranked = ranked.slice(0, 10);
    else if (syListMode === 'bot10') ranked = ranked.slice(-10).reverse();
    else if (syListMode === 'risk')  ranked = ranked.filter(r => r._hgo < 80);
  }

  /* Bayi ve personel sayıları (SY bazında) */
  const bayiCounts = {}, persCounts = {};
  (DATA.bayi['Toplam Mobil'] || []).forEach(r => {
    if (r.sy) bayiCounts[r.sy] = (bayiCounts[r.sy] || 0) + 1;
  });
  (DATA.pers['Toplam Mobil'] || []).forEach(r => {
    if (r.sy) persCounts[r.sy] = (persCounts[r.sy] || 0) + 1;
  });

  function chgHTML(nm) {
    if (!SYPREV || !SYPREV.sy[nm] || !SYPREV.sy[nm][syProd]) return "";
    const cur = S.sy[nm][syProd], prv = SYPREV.sy[nm][syProd];
    const dA = cur.a - prv.a;
    const dF = (cur.f !== null && prv.f !== null) ? Math.round((cur.f - prv.f)*10)/10 : null;
    let h = '<div class="sy-chg">';
    h += '<span class="cg ' + (dA>0?"up":dA<0?"dn":"eq") + '">' + (dA>0?"▲":dA<0?"▼":"—") + " " + Math.abs(dA) + ' adet</span>';
    if (dF !== null) h += '<span class="cg ' + (dF>0?"up":dF<0?"dn":"eq") + '">' + (dF>0?"▲":dF<0?"▼":"—") + " %" + Math.abs(dF) + ' fc</span>';
    h += '</div>';
    return h;
  }

  let rows = "";
  const _gA = S.calismaGun || 0, _gB = S.calisilanGun || 0;
  const ayGun = Math.max(_gA, _gB), gecenGun = Math.min(_gA, _gB);
  const kalanGun = (ayGun > 0 && gecenGun > 0 && ayGun > gecenGun) ? (ayGun - gecenGun) : null;

  ranked.forEach((r, i) => {
    const hgo     = r.h > 0 ? Math.round(r.a / r.h * 1000) / 10 : null;
    const kalan   = Math.max(Math.round(r.h - r.a), 0);
    const gunluk  = (kalanGun && kalanGun > 0) ? Math.ceil(kalan / kalanGun) : null;
    const bayiC   = bayiCounts[r.nm] || 0;
    const persC   = persCounts[r.nm] || 0;
    const medal   = i===0?'<span class="badge b1">1</span>':i===1?'<span class="badge b2">2</span>':i===2?'<span class="badge b3">3</span>':'<span class="n">'+(i+1)+'</span>';

    rows += '<div class="sy-card">' +
      '<div class="sy-top">' +
        '<div class="sy-rk">' + medal + '</div>' +
        '<div class="sy-name">' + r.nm + '</div>' +
        '<div class="chip ' + cls(hgo) + '" style="font-size:12.5px">' + (hgo===null?"—":"%"+hgo.toFixed(1)) + '</div>' +
      '</div>' +
      (bayiC || persC
        ? '<div class="sy-meta">' +
            (bayiC ? '<span class="sy-mc">🏢 ' + bayiC + ' bayi</span>' : '') +
            (persC ? '<span class="sy-mc">👤 ' + persC + ' pers.</span>' : '') +
          '</div>'
        : '') +
      '<div class="sy-metrics">' +
        '<div class="sy-m"><div class="sy-mv">' + r.h.toLocaleString("tr-TR") + '</div><div class="sy-ml">HEDEF</div></div>' +
        '<div class="sy-m"><div class="sy-mv">' + r.a.toLocaleString("tr-TR") + '</div><div class="sy-ml">ADET</div></div>' +
        '<div class="sy-m"><div class="sy-mv ' + cls(r.f) + '-t">' + (r.f===null?"—":"%"+Math.round(r.f)) + '</div><div class="sy-ml">FORECAST</div></div>' +
      '</div>' +
      '<div class="sy-need">' +
        '<div class="sy-n"><span class="sy-nv">' + kalan.toLocaleString("tr-TR") + '</span><span class="sy-nl">HEDEFE KALAN</span></div>' +
        '<div class="sy-n accent-box"><span class="sy-nv accent">' + (gunluk===null?"—":gunluk.toLocaleString("tr-TR")) + '</span><span class="sy-nl">GÜNLÜK' + (kalanGun?" ("+kalanGun+"g)":"") + '</span></div>' +
      '</div>' +
      chgHTML(r.nm) +
    '</div>';
  });

  const f = (ayGun && gecenGun) ? gecenGun + "/" + ayGun + ". gün" : "";
  const cmp = SYPREV ? " · önceki raporla karşılaştırma" : "";
  document.getElementById("cards").className = "cards single";
  document.getElementById("cards").style.maxWidth = "360px";
  document.getElementById("cards").innerHTML =
    '<div class="card" id="sy-card">' +
    hdrHTML((PICO[syProd]||"👔"), syProd + " · Satış Yöneticisi",
      "HGO sıralaması" + (f?" · "+f:"") + cmp) +
    '<div class="sec t"><span>👔 Yöneticiler</span><span class="cnt">' + ranked.length + ' SY</span></div>' +
    rows +
    ftrHTML([[ranked.length, "Yönetici"],
             [ranked[0]?("%"+(ranked[0]._hgo||0).toFixed(0)):"—", "En Yüksek HGO"],
             [ranked[0]?ranked[0].nm.split(" ")[0]:"—", "Lider"]]) +
    '</div>';
}
function setSyProd(p) { syProd = p; render(); }


/* ───── KUPA BENDE ───── */
function renderKupa() {
  const K = KUPA || [];
  if (!K.length) { document.getElementById("cards").innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)">Veri yok</div>'; return; }

  let rows = "";
  K.forEach((r, i) => {
    const rank = i + 1;
    const medalBig = rank===1?'🏆':rank===2?'🥈':rank===3?'🥉':null;
    const rkBadge = rank<=3 ? '<span class="badge b'+rank+'">'+rank+'</span>' : '<span class="kp-n">'+rank+'</span>';
    const podium = rank<=3 ? ' kp-pod kp-p'+rank : '';
    rows += '<div class="kp-card'+podium+'">' +
      '<div class="kp-top">' +
        '<div class="kp-rk">' + (medalBig?'<span class="kp-medal">'+medalBig+'</span>':rkBadge) + '</div>' +
        '<div class="kp-name">' + r.b + '<small>' + r.kod + ' · ' + r.il + '</small></div>' +
        '<div class="kp-pts"><span class="kp-pv">' + r.toplam.toLocaleString("tr-TR") + '</span><span class="kp-pl">PUAN</span></div>' +
      '</div>' +
      (r.bonus ? '<div class="kp-bonus">🎁 IPTV %' + r.iptv.toFixed(1) + ' · BONUS ÖDÜLE HAK KAZANDI</div>' : '') +
      '<div class="kp-break">' +
        '<div class="kp-b"><span class="kp-bv">%' + r.fat.toFixed(1) + '</span><span class="kp-bl">Faturalı ×6</span><span class="kp-bp">' + r.pFat.toFixed(0) + ' p</span></div>' +
        '<div class="kp-b"><span class="kp-bv">%' + r.dsl.toFixed(1) + '</span><span class="kp-bl">DSL ×5</span><span class="kp-bp">' + r.pDsl.toFixed(0) + ' p</span></div>' +
        '<div class="kp-b"><span class="kp-bv">%' + r.fsz.toFixed(1) + '</span><span class="kp-bl">Faturasız ×4</span><span class="kp-bp">' + r.pFsz.toFixed(0) + ' p</span></div>' +
      '</div>' +
      '<div class="kp-foot"><span>🎯 Odak: Mobil %' + r.mob.toFixed(1) + '</span><span>🎁 Bonus: IPTV %' + r.iptv.toFixed(1) + '</span></div>' +
    '</div>';
  });

  const champ = K[0];
  document.getElementById("cards").className = "cards single";
  document.getElementById("cards").style.maxWidth = "330px";
  document.getElementById("cards").innerHTML =
    '<div class="card" id="kupa-card">' +
    '<div class="kp-hero"><div class="kp-hero-stripe"></div><div class="kp-hero-gold"></div>' +
      '<div class="kp-hero-body">' +
        '<div class="kp-hero-top"><div class="brand"><div class="brand-mark">TT</div>' +
        '<div class="brand-txt">Türk Telekom<small>TTM İŞ ORTAKLARI</small></div></div>' +
        '<div class="donem">' + DONEM + '</div></div>' +
        '<div class="kp-trophy">🏆</div>' +
        '<div class="kp-title">KUPA BENDE</div>' +
        '<div class="kp-sub">En Başarılı Bayi Yarışması · Kuzey Anadolu</div>' +
        '<div class="kp-champ">👑 Lider: <b>' + champ.b + '</b> · ' + champ.toplam.toLocaleString("tr-TR") + ' puan</div>' +
      '</div>' +
    '</div>' +
    '<div class="kp-rules">Her %1: Faturalı=6p · DSL=5p · Faturasız=4p · IPTV %100+ = Bonus</div>' +
    rows +
    ftrHTML([[K.length, "Bayi"], [champ.toplam.toLocaleString("tr-TR"), "Lider Puan"], [champ.b.split(" ")[0], "Şampiyon"]]) +
    '</div>';
}


/* ───── BAYİ DETAYI ───── */
function setDetayKod(k) { detayKod = k; render(); }
function renderDetay() {
  const D = DETAY;
  const kodlar = Object.keys(D.bayiler);
  if (!kodlar.length) { document.getElementById("cards").innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)">Veri yok</div>'; return; }
  if (!detayKod || !D.bayiler[detayKod]) detayKod = kodlar[0];
  const bayi = D.bayiler[detayKod];
  const f = fc();

  // Bayi seçici (açılır liste)
  const sel = '<select class="detay-sel" onchange="setDetayKod(this.value)">' +
    kodlar.map(k => '<option value="' + k + '"' + (k === detayKod ? " selected" : "") + '>' + D.bayiler[k].b + ' · ' + D.bayiler[k].il + '</option>').join("") + '</select>';

  const cls = g => g===null?"":g>=100?"g":g>=60?"y":"r";
  // Çalışma günü (SY ÖZET'ten)
  const _gA = (SYDATA.calismaGun)||0, _gB = (SYDATA.calisilanGun)||0;
  const ayGun = Math.max(_gA,_gB), gecenGun = Math.min(_gA,_gB);
  const kalanGun = (ayGun>0 && gecenGun>0 && ayGun>gecenGun) ? ayGun-gecenGun : null;

  // Bayi ürün satırları
  let prows = "";
  for (const pn of DETAY_PRODS) {
    const d = bayi.prods[pn]; if (!d || d.h === 0) continue;
    const kalan = Math.max(d.h - d.a, 0);
    const gunluk = (kalanGun && kalanGun>0) ? Math.ceil(kalan/kalanGun) : null;
    const fcv = (f && d.g !== null) ? Math.round(d.g*f.k) : null;
    prows += '<div class="dt-row">' +
      '<div class="dt-pn">' + pn + '</div>' +
      '<div class="dt-cells">' +
        '<div class="dt-c"><span class="dt-cv">' + d.h.toLocaleString("tr-TR") + '</span><span class="dt-cl">Hedef</span></div>' +
        '<div class="dt-c"><span class="dt-cv">' + d.a.toLocaleString("tr-TR") + '</span><span class="dt-cl">Adet</span></div>' +
        '<div class="dt-c"><span class="dt-cv ' + cls(d.g) + '-t">' + (d.g===null?"—":"%"+d.g.toFixed(1)) + '</span><span class="dt-cl">HGO</span></div>' +
        '<div class="dt-c"><span class="dt-cv accent">' + (fcv===null?"—":"%"+fcv) + '</span><span class="dt-cl">Forecast</span></div>' +
        '<div class="dt-c"><span class="dt-cv">' + kalan.toLocaleString("tr-TR") + '</span><span class="dt-cl">Kalan</span></div>' +
        '<div class="dt-c"><span class="dt-cv hot">' + (gunluk===null?"—":gunluk.toLocaleString("tr-TR")) + '</span><span class="dt-cl">Günlük</span></div>' +
      '</div></div>';
  }

  // Personeller — 4 ürün HGO yan yana (Toplam Mobil'e göre sıralı, seçici yok)
  const persList = (D.pers[detayKod] || []).slice();
  const DCOLS = ["Toplam Mobil","DSL","Toplam TV","Toplam Cihaz"];
  const DCOLS_SHORT = {"Toplam Mobil":"Mobil","DSL":"DSL","Toplam TV":"TV","Toplam Cihaz":"Cihaz"};
  persList.sort((a,b) => { const ga = a.prods["Toplam Mobil"]?.g ?? -1, gb = b.prods["Toplam Mobil"]?.g ?? -1; return gb - ga; });
  // Başlık satırı
  let phead = '<div class="dt-prow dt-phead"><div class="dt-prk"></div><div class="dt-pname"></div><div class="dt-pgrid">' +
    DCOLS.map(pn => '<span class="dt-gh">' + DCOLS_SHORT[pn] + '</span>').join("") + '</div></div>';
  let plist = "";
  persList.forEach((p, i) => {
    const rk = i<3 ? '<span class="badge b'+(i+1)+'">'+(i+1)+'</span>' : '<span class="dt-pn-rk">'+(i+1)+'</span>';
    let cells = "";
    for (const pn of DCOLS) {
      const d = p.prods[pn] || {g:null,h:0,a:0};
      const ha = (d.h||d.a) ? (d.a||0)+'/'+(d.h||0) : '';
      cells += '<span class="dt-gc ' + cls(d.g) + '-bg">' + (d.g===null?"—":"%"+Math.round(d.g)) + '<small>' + ha + '</small></span>';
    }
    plist += '<div class="dt-prow">' + '<div class="dt-prk">'+rk+'</div>' +
      '<div class="dt-pname">' + p.p + '</div>' +
      '<div class="dt-pgrid">' + cells + '</div></div>';
  });
  plist = phead + plist;
  const detayProd = "Toplam Mobil";

  const sub = "Tüm ürünler · " + (persList.length) + " personel" + (f?" · Forecast "+f.d+"/"+f.t+". gün":"");
  document.getElementById("cards").className = "cards single";
  document.getElementById("cards").style.maxWidth = "490px";
  document.getElementById("cards").innerHTML =
    '<div style="width:100%;margin-bottom:10px">' + sel + '</div>' +
    '<div class="card" id="detay-card">' +
    hdrHTML("🔍", bayi.b, bayi.kod + " · " + bayi.il + (bayi.sy?" · SY: "+bayi.sy.split(" ")[0]:"")) +
    '<div class="sec t"><span>📊 Ürün Performansı</span><span class="cnt">' + sub + '</span></div>' +
    prows +
    '<div class="sec t" style="margin-top:2px"><span>👥 Personeller</span><span class="cnt">Mobil · DSL · TV · Cihaz HGO</span></div>' +
    plist +
    ftrHTML([[persList.length, "Personel"], [bayi.prods["Toplam Mobil"].g!==null?"%"+bayi.prods["Toplam Mobil"].g.toFixed(0):"—", "Mobil HGO"], [bayi.il||"—", "İl"]]) +
    '</div>';
}


/* ───── TREND GÖRÜNÜMÜ ───── */
function setTrendScope(s){ trendScope = s; trendProd = "Toplam Mobil"; render(); }
function setTrendProd(p){ trendProd = p; render(); }
function renderTrend() {
  const store = trendLoad();
  const days = Object.keys(store).sort();
  const cards = document.getElementById("cards");
  cards.className = "cards single"; cards.style.maxWidth = "440px";

  const prods = trendScope === "pers" ? ["Toplam Mobil","DSL","Toplam TV"] : ["Toplam Mobil","DSL","Toplam TV","Toplam Cihaz"];
  if (!prods.includes(trendProd)) trendProd = prods[0];

  const scopeSel = '<div class="tr-tabs">' +
    '<button class="tab' + (trendScope==="pers"?" on-sec":"") + '" onclick="setTrendScope(\'pers\')">👤 Personel</button>' +
    '<button class="tab' + (trendScope==="bayi"?" on-sec":"") + '" onclick="setTrendScope(\'bayi\')">🏢 Bayi</button></div>';
  const prodSel = '<div class="tr-tabs">' + prods.map(p =>
    '<button class="tab' + (p===trendProd?" on-prod":"") + '" onclick="setTrendProd(\'' + p + '\')">' + p + '</button>').join("") + '</div>';

  // Mevcut günkü liste (DATA'dan) + her birinin trendi
  const list = (DATA[trendScope][trendProd] || []).slice();
  const cls = g => g===null?"":g>=100?"g":g>=60?"y":"r";

  let rows = "";
  const infoBar = days.length < 2
    ? '<div class="tr-info">📅 <b>' + days.length + '</b> gün kayıtlı · Gelişim çizgileri 2. günden itibaren belirir. Her gün raporu yükledikçe trend zenginleşir.</div>'
    : '';
  list.forEach((r, i) => {
    const nm = r.p;
    const series = trendSeries(trendScope, nm, trendProd);
    const delta = trendDelta(trendScope, nm, trendProd);
    const arrow = delta===null ? '<span class="tr-d eq">yeni</span>'
      : delta>0 ? '<span class="tr-d up">▲ '+delta.toFixed(1)+'</span>'
      : delta<0 ? '<span class="tr-d dn">▼ '+Math.abs(delta).toFixed(1)+'</span>'
      : '<span class="tr-d eq">●</span>';
    const sparkColor = delta===null||delta===0 ? "#8C96A8" : delta>0 ? "#0E7A40" : "#C11421";
    // Tek gün varsa seri tek nokta; yine de mevcut HGO'yu çiz
    const drawSeries = series.length ? series : [{d:"",v:r.g||0}];
    rows += '<div class="tr-row">' +
      '<div class="tr-rk">' + (i<3?'<span class="badge b'+(i+1)+'">'+(i+1)+'</span>':'<span class="tr-n">'+(i+1)+'</span>') + '</div>' +
      '<div class="tr-nm">' + nm + '<small>' + (series.length||1) + ' gün</small></div>' +
      '<div class="tr-spark">' + sparkline(drawSeries, 64, 26, sparkColor) + '</div>' +
      '<div class="tr-now"><span class="chip ' + cls(r.g) + '">%' + (r.g===null?"—":r.g.toFixed(0)) + '</span>' + arrow + '</div>' +
    '</div>';
  });
  rows = infoBar + rows;

  cards.innerHTML = scopeSel + prodSel +
    '<div class="card" id="trend-card">' +
    hdrHTML("📈", trendProd + " · Trend", (trendScope==="pers"?"Personel":"Bayi") + " gelişim takibi · " + days.length + " gün kayıtlı") +
    '<div class="sec t"><span>📈 Gelişim Çizgileri</span><span class="cnt">son→ivme</span></div>' +
    rows +
    ftrHTML([[days.length, "Gün Kayıtlı"], [list.length, (trendScope==="pers"?"Personel":"Bayi")], ["📈", "Trend"]]) +
    '</div>';
}

/* ───── RİSK RADARI ───── */
function renderRisk() {
  const cards = document.getElementById("cards");
  cards.className = "cards single"; cards.style.maxWidth = "440px";
  const f = fc();
  const _gA=(SYDATA.calismaGun)||0,_gB=(SYDATA.calisilanGun)||0;
  const ayGun=Math.max(_gA,_gB),gecenGun=Math.min(_gA,_gB);
  const kalanGun=(ayGun>0&&gecenGun>0&&ayGun>gecenGun)?ayGun-gecenGun:null;

  // Hem personel hem bayi, tüm ana ürünlerde forecast<100 + düşüş trendi olanları topla
  const PRD = ["Toplam Mobil","DSL","Toplam TV"];
  const risks = [];
  for (const scope of ["pers","bayi"]) {
    const plist = scope==="bayi" ? [...PRD,"Toplam Cihaz"] : PRD;
    for (const prod of plist) {
      for (const r of (DATA[scope][prod]||[])) {
        if (r.g === null) continue;
        const fcv = f ? r.g*f.k : r.g; // gün bilgisi yoksa HGO'nun kendisini baz al
        const delta = trendDelta(scope, r.p, prod);
        const dusus = delta !== null && delta < 0;
        // Risk: forecast (veya HGO) %100 altında olan herkes. Düşüş trendi varsa öncelik kazanır.
        if (fcv < 100) {
          risks.push({ scope, prod, name: r.p, hgo: r.g, fcv: Math.round(fcv), delta, dusus, hasFc: !!f });
        }
      }
    }
  }
  // En kritik önce: düşüş trendi olanlar üstte, sonra en düşük forecast
  risks.sort((a,b) => (b.dusus - a.dusus) || (a.fcv - b.fcv));
  const top = risks.slice(0, 40);

  const PICO = {"Toplam Mobil":"📱","DSL":"🌐","Toplam TV":"📺","Toplam Cihaz":"📦"};
  let rows = "";
  if (!top.length) {
    rows = '<div class="tr-empty">✅ Risk işareti yok.<br>%100 altında kimse bulunmuyor.</div>';
  } else {
    top.forEach(r => {
      const sev = r.fcv < 60 ? "rk-hi" : r.fcv < 85 ? "rk-md" : "rk-lo";
      const dtxt = r.delta===null ? "" : r.dusus ? '<span class="rk-dn">▼ '+Math.abs(r.delta).toFixed(1)+' düşüş</span>' : '';
      rows += '<div class="rk-row ' + sev + '">' +
        '<div class="rk-ico">' + (r.scope==="bayi"?"🏢":"👤") + '</div>' +
        '<div class="rk-info"><div class="rk-nm">' + r.name + '</div>' +
        '<div class="rk-meta">' + PICO[r.prod] + ' ' + r.prod + ' · HGO %' + (r.hgo===null?"—":r.hgo.toFixed(0)) + ' ' + dtxt + '</div></div>' +
        '<div class="rk-fc"><span class="rk-fcv">' + (r.hasFc?"F ":"") + '%' + r.fcv + '</span><span class="rk-fcl">' + (r.hasFc?"forecast":"HGO") + '</span></div>' +
      '</div>';
    });
  }
  const hiN = top.filter(r=>r.fcv<60).length, mdN = top.filter(r=>r.fcv>=60&&r.fcv<85).length;
  cards.innerHTML =
    '<div class="card" id="risk-card">' +
    hdrHTML("🚨", "Risk Radarı", (f?"Forecast %100 altı · "+f.d+"/"+f.t+". gün":"HGO %100 altı · gün bilgisi girilince forecast bazlı olur")) +
    '<div class="sec b"><span>🚨 Aksiyon Gerekenler</span><span class="cnt">' + top.length + ' uyarı</span></div>' +
    rows +
    ftrHTML([[hiN, "Kritik <%60"], [mdN, "Orta %60-85"], [top.length, "Toplam"]]) +
    '</div>';
}

/* ───── RENDER ───── */
function buildTabs() {
  const isMatrix = section === "matrix";
  const isSY = section === "sy";
  const isKupa = section === "kupa";
  const isDetay = section === "detay";
  const isTrend = section === "trend";
  const isRisk = section === "risk";
  document.getElementById("sec-tabs").innerHTML = SECTIONS.map(s =>
    '<button class="tab' + (s.key === section ? " on-sec" : "") + '" onclick="setSec(\'' + s.key + '\')">' + s.label + '</button>').join("");
  document.getElementById("prod-tabs").innerHTML = isTrend ? '<span style="font-size:10.5px;color:var(--muted)">Seçim kartın üstünde</span>' : isRisk ? '<span style="font-size:10.5px;color:var(--muted)">Tüm ürünler taranıyor</span>' : isDetay ? '<span style="font-size:10.5px;color:var(--muted)">Bayi seçimi kartın üstünde</span>' : isKupa ? '<span style="font-size:10.5px;color:var(--muted)">Kampanya puanı: Faturalı+DSL+Faturasız</span>' : isSY ? '<span style="font-size:10.5px;color:var(--muted)">Ürün seçimi kartın üstünde</span>' : isMatrix ? '<span style="font-size:10.5px;color:var(--muted)">Tüm ürünler tek tabloda</span>' : PRODS[section].map(p =>
    '<button class="tab' + (p.key === prod ? " on-prod" : "") + '" onclick="setProd(\'' + p.key + '\')">' + p.icon + ' ' + p.key + '</button>').join("");
  document.getElementById("sy-tabs").innerHTML = (isMatrix || isSY || isKupa || isDetay || isTrend || isRisk) ? '<span style="font-size:10.5px;color:var(--muted)">—</span>' : syList().map(s =>
    '<button class="tab' + (s === sy ? " on-sec" : "") + '" onclick="setSy(\'' + s.replace(/'/g, "\\'") + '\')">' + (s === "Tümü" ? "👥 Tümü" : "👔 " + s) + '</button>').join("");
  const vt = document.getElementById("view-tabs"), vl = document.getElementById("view-label");
  const showViews = section === "pers" && layout === "single" && !isMatrix && !isSY && !isKupa && !isDetay && !isTrend && !isRisk;
  vt.style.display = showViews ? "" : "none"; vl.style.display = showViews ? "" : "none";
  if (showViews) vt.innerHTML = VIEWS.map(v => '<button class="tab' + (v.key === view ? " on-view" : "") + '" onclick="setView(\'' + v.key + '\')">' + v.label + '</button>').join("");
}
function setSec(s) { section = s; if (["pers","bayi"].includes(s)) prod = PRODS[s][s === "bayi" ? 2 : 0].key; sy = "Tümü";
  const lt = document.querySelector(".layout-toggle"); if (lt) lt.style.display = (s === "matrix" || s === "sy" || s === "kupa" || s === "detay" || s === "trend" || s === "risk") ? "none" : "";
  buildTabs(); render(); }
function setProd(p) { prod = p; buildTabs(); render(); }
function setView(v) { view = v; buildTabs(); render(); }
function setLayout(l) {
  layout = l;
  document.getElementById("lay-single").classList.toggle("on", l === "single");
  document.getElementById("lay-grid").classList.toggle("on", l === "grid");
  buildTabs(); render();
}

function render() {
  const cards = document.getElementById("cards");
  if (section === "matrix") { cards.style.maxWidth = "1500px"; renderMatrix(); return; }
  if (section === "sy") { renderSY(); return; }
  if (section === "kupa") { cards.style.maxWidth = "330px"; renderKupa(); return; }
  if (section === "detay") { cards.style.maxWidth = "490px"; renderDetay(); return; }
  if (section === "trend") { cards.style.maxWidth = "440px"; renderTrend(); return; }
  if (section === "risk") { cards.style.maxWidth = "440px"; renderRisk(); return; }
  cards.style.maxWidth = "";
  if (layout === "grid") {
    cards.className = "cards grid";
    const keys = PRODS[section].map(p => p.key);
    cards.innerHTML = keys.map(k => '<div class="card-unit"><div class="card" id="card-' + k.replace(/[^a-zA-Z]/g,"") + '">' + cardHTML(k) + '</div></div>').join("");
  } else {
    cards.className = "cards single";
    cards.innerHTML = '<div id="cardWrap"><div class="card" id="card-main">' + cardHTML(prod) + '</div></div>';
  }
}

