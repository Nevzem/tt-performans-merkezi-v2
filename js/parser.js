/* ════════════════════════════════════════════
   js/parser.js
   Excel okuma, veri dönüştürme ve kütüphane
   tembel yükleme (XLSX, html2canvas) + dosya
   seçim/drag-drop bağlama.
   ════════════════════════════════════════════ */

/* ───── TEMBEL KÜTÜPHANE YÜKLEME ───── */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.__loaded && window.__loaded[src]) return resolve();
    const s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload = () => { window.__loaded = window.__loaded || {}; window.__loaded[src] = 1; resolve(); };
    s.onerror = () => reject(new Error("Kütüphane yüklenemedi (internet gerekli): " + src));
    document.head.appendChild(s);
  });
}
async function ensureXLSX() {
  if (typeof XLSX !== "undefined") return;
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
}
async function ensureH2C() {
  if (typeof html2canvas !== "undefined") return;
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
}

/* ───── PARSER ───── */
function shortB(n) { return String(n).trim().split(/\s+/).slice(0, 2).join(" ").substring(0, 22); }
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };

/* Bir başlık dizisinde kolon adı arar; önce tam eşleşme, sonra içerme.
   TTM parser'ı için yardımcı — sabit indekslerden bağımsız alternatif kontrol sağlar. */
function findColByName(headers, ...names) {
  for (let pass = 0; pass < 2; pass++) {
    for (const name of names) {
      const nl = name.toLowerCase();
      const idx = headers.findIndex(h =>
        pass === 0
          ? String(h || '').trim().toLowerCase() === nl
          : String(h || '').trim().toLowerCase().includes(nl)
      );
      if (idx >= 0) return idx;
    }
  }
  return -1;
}

function parseWB(wb) {
  const out = { pers: { "Toplam Mobil": [], "Faturalı": [], "Faturasız": [], "DSL": [], "Toplam TV": [], "IPTV": [], "Uydu": [], "Cihaz": [] },
                bayi: { "Postpaid": [], "Prepaid": [], "Toplam Mobil": [], "DSL": [], "Toplam TV": [], "Akıllı Cihaz": [], "Diğer Cihaz": [] } };
  const mxRows = [];
  const kupaRows = [];
  const acc = () => ({ mobil:[0,0], dsl:[0,0], iptv:[0,0], uydu:[0,0], tv:[0,0], cihaz:[0,0] });
  const kuzeyTot = acc(), anadoluTot = acc();
  let donem = null, persCount = 0, bayiCount = 0;
  const warnings = [];

  const wsName = wb.SheetNames.find(s => s.trim().toUpperCase() === "ÇALIŞAN");
  if (!wsName) throw new Error("'ÇALIŞAN' sheet'i bulunamadı.");
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wsName], { header: 1, defval: null });
  let hi = rows.findIndex(r => r && String(r[0]).trim() === "Ana Bölge");
  if (hi === -1) throw new Error("ÇALIŞAN: 'Ana Bölge' başlığı bulunamadı.");
  for (const r of rows.slice(hi + 1)) {
    if (!r || !r[1] || String(r[1]).trim().toUpperCase() !== "KUZEY ANADOLU") continue;
    if (!r[6] || ["-", ""].includes(String(r[6]).trim())) continue;
    if (!donem && r[7]) donem = String(r[7]);
    persCount++;
    const b = shortB(r[3]), p = String(r[6]).trim();
    const sy_ = r[4] && String(r[4]).trim() !== "-" ? String(r[4]).trim() : "";
    const il_ = r[5] && String(r[5]).trim() !== "-" ? String(r[5]).trim() : "";
    const ph = num(r[38]) || 0, pa = num(r[39]) || 0, rh = num(r[41]) || 0, ra = num(r[42]) || 0;
    const dh = num(r[44]) || 0, da = num(r[45]) || 0;
    const ih = num(r[53]) || 0, ia = num(r[54]) || 0, uh = num(r[56]) || 0, ua = num(r[57]) || 0;
    const ch = num(r[59]) || 0, ca = num(r[60]) || 0, gh = num(r[62]) || 0, ga = num(r[63]) || 0;
    const pushP = (key, h, a) => { if (h > 0) out.pers[key].push({ b, p, sy: sy_, il: il_, h: Math.round(h), a: Math.round(a), g: Math.round(a / h * 1000) / 10 }); };
    pushP("Toplam Mobil", ph + rh, pa + ra);
    pushP("Faturalı", ph, pa);
    pushP("Faturasız", rh, ra);
    pushP("DSL", dh, da);
    pushP("Toplam TV", ih + uh, ia + ua);
    pushP("IPTV", ih, ia);
    pushP("Uydu", uh, ua);
    pushP("Cihaz", ch + gh, ca + ga);
  }

  const wsB = wb.SheetNames.find(s => s.trim().toUpperCase() === "TTM BUAY");
  if (!wsB) throw new Error("'TTM BUAY' sheet'i bulunamadı.");
  const rowsB = XLSX.utils.sheet_to_json(wb.Sheets[wsB], { header: 1, defval: null });
  let hib = rowsB.findIndex(r => r && String(r[0]).trim() === "Ana Bölge");
  if (hib === -1) throw new Error("TTM BUAY: 'Ana Bölge' başlığı bulunamadı.");
  /* Sprint 3: TTM BUAY kolon kayması kontrolü */
  { const bh = rowsB[hib].map(c => c ? String(c).trim() : '');
    [['Postpaid Hedef',49,['Postpaid Hedef','Faturalı Hedef','PP Hedef']],
     ['DSL Hedef',57,['DSL Hedef','Evde İnternet Hedef','ADSL Hedef']],
     ['IPTV Hedef',69,['IPTV Hedef']],
     ['Akıllı Cihaz Hedef',77,['Akıllı Cihaz Hedef','Cihaz Hedef']]
    ].forEach(([nm,exp,aliases]) => {
      const found = findColByName(bh, ...aliases);
      if (found >= 0 && found !== exp) {
        const w = 'TTM BUAY kolon kayması: "'+nm+'" beklenen='+exp+', bulunan='+found;
        console.warn('[TTM] '+w); warnings.push(w);
      }
    });
  }
  for (const r of rowsB.slice(hib + 1)) {
    if (!r || !r[3]) continue;
    const bolge_ = r[1] ? String(r[1]).trim().toUpperCase() : "";
    // ── Matris: tüm Anadolu + Kuzey toplamları ve Kuzey satırları ──
    {
      const ph_ = num(r[49]) || 0, pa_ = num(r[50]) || 0, rh_ = num(r[53]) || 0, ra_ = num(r[54]) || 0;
      const dh_ = num(r[57]) || 0, da_ = num(r[58]) || 0;
      const ih_ = num(r[69]) || 0, ia_ = num(r[70]) || 0, uh_ = num(r[73]) || 0, ua_ = num(r[74]) || 0;
      const ch_ = num(r[77]) || 0, ca_ = num(r[78]) || 0, gh_ = num(r[81]) || 0, ga_ = num(r[82]) || 0;
      const mh = ph_+rh_, ma = pa_+ra_, th = ih_+uh_, ta = ia_+ua_, xh = ch_+gh_, xa = ca_+ga_;
      const addTo = (A) => { A.mobil[0]+=mh; A.mobil[1]+=ma; A.dsl[0]+=dh_; A.dsl[1]+=da_; A.iptv[0]+=ih_; A.iptv[1]+=ia_; A.uydu[0]+=uh_; A.uydu[1]+=ua_; A.tv[0]+=th; A.tv[1]+=ta; A.cihaz[0]+=xh; A.cihaz[1]+=xa; };
      addTo(anadoluTot);
      if (bolge_ === "KUZEY ANADOLU") {
        addTo(kuzeyTot);
        const hg = (a,h) => h>0 ? Math.round(a/h*1000)/10 : null;
        mxRows.push({
          kod: r[2] ? String(r[2]).trim() : "", b: shortB(r[3]), il: r[5] ? String(r[5]).trim() : "",
          mobil: hg(ma,mh), dsl: hg(da_,dh_), iptv: hg(ia_,ih_),
          ipdsl: da_>0 ? Math.round(ia_/da_*1000)/10 : null,
          uydu: hg(ua_,uh_), tv: hg(ta,th), cihaz: hg(xa,xh),
        });
        // ── Kupa Bende kampanyası ──
        const fat = mh>0 ? Math.round(pa_/ph_*1000)/10 : 0;
        const fsz = rh_>0 ? Math.round(ra_/rh_*1000)/10 : 0;
        const dslh = dh_>0 ? Math.round(da_/dh_*1000)/10 : 0;
        const iptvh = ih_>0 ? Math.round(ia_/ih_*1000)/10 : 0;
        const mobh = mh>0 ? Math.round(ma/mh*1000)/10 : 0;
        const pFat = Math.min(fat*6, 780), pDsl = Math.min(dslh*5, 650), pFsz = Math.min(fsz*4, 520);
        kupaRows.push({
          kod: r[2] ? String(r[2]).trim() : "", b: shortB(r[3]), il: r[5] ? String(r[5]).trim() : "",
          fat, fsz, dsl: dslh, iptv: iptvh, mob: mobh,
          pFat: Math.round(pFat*10)/10, pDsl: Math.round(pDsl*10)/10, pFsz: Math.round(pFsz*10)/10,
          toplam: Math.round((pFat+pDsl+pFsz)*10)/10, bonus: iptvh >= 100,
        });
      }
    }
    if (bolge_ !== "KUZEY ANADOLU") continue;
    bayiCount++;
    const b = shortB(r[3]);
    const kod = r[2] ? String(r[2]).trim() : "";
    const il = r[5] ? String(r[5]).trim() : "";
    const sub = kod && il ? kod + " · " + il : (kod || il);
    const sy_ = r[7] && String(r[7]).trim() !== "-" ? String(r[7]).trim() : "";
    const ph = num(r[49]) || 0, pa = num(r[50]) || 0, rh = num(r[53]) || 0, ra = num(r[54]) || 0;
    const dh = num(r[57]) || 0, da = num(r[58]) || 0;
    const ih = num(r[69]) || 0, ia = num(r[70]) || 0, uh = num(r[73]) || 0, ua = num(r[74]) || 0;
    const ch = num(r[77]) || 0, ca = num(r[78]) || 0, gh = num(r[81]) || 0, ga = num(r[82]) || 0;
    if (ph > 0) out.bayi["Postpaid"].push({ p: b, b: sub, sy: sy_, g: Math.round(pa / ph * 1000) / 10 });
    if (rh > 0) out.bayi["Prepaid"].push({ p: b, b: sub, sy: sy_, g: Math.round(ra / rh * 1000) / 10 });
    if (ph + rh > 0) out.bayi["Toplam Mobil"].push({ p: b, b: sub, sy: sy_, g: Math.round((pa + ra) / (ph + rh) * 1000) / 10 });
    if (dh > 0) out.bayi["DSL"].push({ p: b, b: sub, sy: sy_, g: Math.round(da / dh * 1000) / 10 });
    if (ih + uh > 0) out.bayi["Toplam TV"].push({ p: b, b: sub, sy: sy_, g: Math.round((ia + ua) / (ih + uh) * 1000) / 10 });
    if (ch > 0) out.bayi["Akıllı Cihaz"].push({ p: b, b: sub, sy: sy_, g: Math.round(ca / ch * 1000) / 10 });
    if (gh > 0) out.bayi["Diğer Cihaz"].push({ p: b, b: sub, sy: sy_, g: Math.round(ga / gh * 1000) / 10 });
  }

  for (const k in out.pers) out.pers[k].sort((a, c) => c.g - a.g);
  for (const k in out.bayi) out.bayi[k].sort((a, c) => c.g - a.g);
  mxRows.sort((a, c) => (c.mobil == null ? -1 : c.mobil) - (a.mobil == null ? -1 : a.mobil));
  const totHgo = (T) => ({
    mobil: T.mobil[0] ? Math.round(T.mobil[1]/T.mobil[0]*1000)/10 : null,
    dsl: T.dsl[0] ? Math.round(T.dsl[1]/T.dsl[0]*1000)/10 : null,
    iptv: T.iptv[0] ? Math.round(T.iptv[1]/T.iptv[0]*1000)/10 : null,
    ipdsl: T.dsl[1] ? Math.round(T.iptv[1]/T.dsl[1]*1000)/10 : null,
    uydu: T.uydu[0] ? Math.round(T.uydu[1]/T.uydu[0]*1000)/10 : null,
    tv: T.tv[0] ? Math.round(T.tv[1]/T.tv[0]*1000)/10 : null,
    cihaz: T.cihaz[0] ? Math.round(T.cihaz[1]/T.cihaz[0]*1000)/10 : null,
  });

  // ── Bayi Detayı ──
  const detayBayiler = {}, detayPers = {};
  {
    const BP = {Postpaid:[49,50],Prepaid:[53,54],DSL:[57,58],IPTV:[69,70],Uydu:[73,74],"Akıllı Cihaz":[77,78],"Diğer Cihaz":[81,82]};
    for (const r of rowsB.slice(hib + 1)) {
      if (!r || !r[3] || !r[1] || String(r[1]).trim().toUpperCase() !== "KUZEY ANADOLU") continue;
      const kod = r[2] ? String(r[2]).trim() : "";
      const pr = {};
      for (const pn in BP) { const h = num(r[BP[pn][0]])||0, a = num(r[BP[pn][1]])||0; pr[pn] = {h:Math.round(h),a:Math.round(a),g:h>0?Math.round(a/h*1000)/10:null}; }
      const ph=num(r[49])||0,pa=num(r[50])||0,rh=num(r[53])||0,ra=num(r[54])||0,ih=num(r[69])||0,ia=num(r[70])||0,uh=num(r[73])||0,ua=num(r[74])||0,ch=num(r[77])||0,ca=num(r[78])||0,gh=num(r[81])||0,ga=num(r[82])||0;
      pr["Toplam Mobil"]={h:Math.round(ph+rh),a:Math.round(pa+ra),g:(ph+rh)>0?Math.round((pa+ra)/(ph+rh)*1000)/10:null};
      pr["Toplam TV"]={h:Math.round(ih+uh),a:Math.round(ia+ua),g:(ih+uh)>0?Math.round((ia+ua)/(ih+uh)*1000)/10:null};
      pr["Toplam Cihaz"]={h:Math.round(ch+gh),a:Math.round(ca+ga),g:(ch+gh)>0?Math.round((ca+ga)/(ch+gh)*1000)/10:null};
      detayBayiler[kod] = {kod, b: shortB(r[3]), il: r[5]?String(r[5]).trim():"", sy: r[7]&&String(r[7]).trim()!=="-"?String(r[7]).trim():"", prods: pr};
    }
    const PP = {Postpaid:[38,39],Prepaid:[41,42],DSL:[44,45],IPTV:[53,54],Uydu:[56,57],"Akıllı Cihaz":[59,60],"Diğer Cihaz":[62,63]};
    for (const r of rows.slice(hi + 1)) {
      if (!r || !r[1] || String(r[1]).trim().toUpperCase() !== "KUZEY ANADOLU") continue;
      if (!r[6] || ["-",""].includes(String(r[6]).trim())) continue;
      const kod = r[2] ? String(r[2]).trim() : "";
      const pr = {};
      for (const pn in PP) { const h = num(r[PP[pn][0]])||0, a = num(r[PP[pn][1]])||0; pr[pn] = {h:Math.round(h),a:Math.round(a),g:h>0?Math.round(a/h*1000)/10:null}; }
      const ph=num(r[38])||0,pa=num(r[39])||0,rh=num(r[41])||0,ra=num(r[42])||0,ih=num(r[53])||0,ia=num(r[54])||0,uh=num(r[56])||0,ua=num(r[57])||0,ch=num(r[59])||0,ca=num(r[60])||0,gh=num(r[62])||0,ga=num(r[63])||0;
      pr["Toplam Mobil"]={h:Math.round(ph+rh),a:Math.round(pa+ra),g:(ph+rh)>0?Math.round((pa+ra)/(ph+rh)*1000)/10:null};
      pr["Toplam TV"]={h:Math.round(ih+uh),a:Math.round(ia+ua),g:(ih+uh)>0?Math.round((ia+ua)/(ih+uh)*1000)/10:null};
      pr["Toplam Cihaz"]={h:Math.round(ch+gh),a:Math.round(ca+ga),g:(ch+gh)>0?Math.round((ca+ga)/(ch+gh)*1000)/10:null};
      (detayPers[kod] = detayPers[kod] || []).push({p: String(r[6]).trim(), prods: pr});
    }
  }
  kupaRows.sort((a,b) => (b.toplam - a.toplam) || (b.iptv - a.iptv) || (b.mob - a.mob));
  const matrix = { rows: mxRows, kuzey: totHgo(kuzeyTot), anadolu: totHgo(anadoluTot) };

  // ── SY ÖZET ──
  const syOut = {};
  let syGun = null, syToplamGun = null;
  const wsSY = wb.SheetNames.find(s => s.trim().toUpperCase().replace(/\s+/g,' ') === "SY ÖZET");
  if (wsSY) {
    const sr = XLSX.utils.sheet_to_json(wb.Sheets[wsSY], { header: 1, defval: null });
    const g1 = sr.find(r => r && String(r[0]).trim() === "Çalışma Günü");
    const g2 = sr.find(r => r && String(r[0]).trim() === "Çalışılan Gün");
    syToplamGun = g1 ? num(g1[1]) : null; syGun = g2 ? num(g2[1]) : null;
    const TGT = APP_CONFIG.ttmSY;
    const PC = { "Mobil Toplam":[4,5,6], "Faturalı":[7,8,9], "Faturasız":[10,11,12], "Evde İnternet":[18,19,20], "IPTV":[27,28,29], "Uydu":[30,31,32], "Tivibu Toplam":[33,34,35], "Cihaz":[36,37,38], "Cihaz Diğer":[39,40,41] };
    for (const r of sr) {
      if (!r || !r[3]) continue;
      const nm = String(r[3]).trim();
      if (!TGT.includes(nm.toUpperCase())) continue;
      const rec = {};
      for (const p in PC) {
        const h = num(r[PC[p][0]]), a = num(r[PC[p][1]]), f = num(r[PC[p][2]]);
        rec[p] = { h: h ? Math.round(h) : 0, a: a ? Math.round(a) : 0, f: f !== null ? Math.round(f*1000)/10 : null };
      }
      syOut[nm] = rec;
    }
  }
  const dfmt = donem && donem.length === 6 ? donem.slice(0,4) + "/" + donem.slice(4) : (donem || "—");
  return { data: out, donem: dfmt, persCount, bayiCount, warnings, matrix, kupa: kupaRows, detay: { bayiler: detayBayiler, pers: detayPers }, syData: { calismaGun: syToplamGun, calisilanGun: syGun, sy: syOut, products: Object.keys(syOut).length ? Object.keys(syOut[Object.keys(syOut)[0]]) : [] } };
}

/* ───── EDM PARSER — Dinamik kolon tespiti ───── */
function parseEDMSheet(wb) {
  /* ═══════════════════════════════════════════════════════
     EDM BUAY Parser — Dinamik kolon tespiti v2
     Aktivasyon kolonunu ad + komşu-sütun taramasıyla bulur.
     ═══════════════════════════════════════════════════════ */
  const EDM_ANA_KOD = APP_CONFIG.edmAnaBayiKod;
  const wsName = wb.SheetNames.find(s => s.trim().toUpperCase() === 'EDM BUAY');
  if (!wsName) return { error: "EDM BUAY sheet'i bulunamadı.", data: null, detay: null };

  const allRows = XLSX.utils.sheet_to_json(wb.Sheets[wsName], { header: 1, defval: null });
  const log = [];

  /* ── 1. Tek veya çift başlık satırı tespiti ── */
  let hi = -1, hdrs = [], hdrs2 = []; // hdrs = asıl başlık, hdrs2 = üst (ürün grubu) başlık

  // "Ana Bölge" olan satır
  let t1 = allRows.findIndex(r => r && r[0] && String(r[0]).trim() === "Ana Bölge");
  if (t1 >= 0) { hi = t1; hdrs = allRows[t1].map(c => c ? String(c).trim() : ''); }

  if (hi === -1) {
    // bayi + hedef/tipi/mobil içeren satır
    for (let i = 0; i < Math.min(allRows.length, 20); i++) {
      if (!allRows[i]) continue;
      const rs = allRows[i].map(c => c ? String(c).trim() : '').join(' ').toLowerCase();
      if (rs.includes('bayi') && (rs.includes('hedef') || rs.includes('tipi') || rs.includes('mobil'))) {
        hi = i; hdrs = allRows[i].map(c => c ? String(c).trim() : ''); break;
      }
    }
  }

  if (hi === -1) return { error: "EDM BUAY: Başlık satırı bulunamadı.", data: null, detay: null };

  /* Önceki satır ürün grubu başlığı mı? (ör. "Mobil | | DSL | | Tivibu | |") */
  if (hi > 0 && allRows[hi-1]) {
    const prevRow = allRows[hi-1].map(c => c ? String(c).trim() : '');
    const prevStr = prevRow.join(' ').toLowerCase();
    if (prevStr.includes('mobil') || prevStr.includes('dsl') || prevStr.includes('tivibu') || prevStr.includes('cihaz')) {
      hdrs2 = prevRow;
      log.push('Çift başlık tespit edildi: ürün grubu satırı=' + (hi-1));
    }
  }

  /* Çift başlık varsa birleştir: "Mobil" + "Hedef" → "Mobil Hedef" */
  if (hdrs2.length) {
    let lastProd = '';
    hdrs = hdrs.map((h, i) => {
      const p = hdrs2[i] || '';
      if (p) lastProd = p;
      if (lastProd && h && h.toLowerCase() !== lastProd.toLowerCase()) return lastProd + ' ' + h;
      return h || lastProd;
    });
    log.push('Birleştirilmiş başlıklar: ' + hdrs.map((h,i)=>h?i+':"'+h+'"':null).filter(Boolean).join(', '));
  }

  log.push('Başlık satırı: ' + hi + ' | Sütun sayısı: ' + hdrs.length);
  log.push('Tüm sütunlar: ' + hdrs.map((h,i)=>h?i+':"'+h+'"':null).filter(Boolean).join(', '));

  /* ── 2. Fuzzy kolon bulucu ── */
  const ci = function() {
    const names = Array.prototype.slice.call(arguments);
    for (let pass = 0; pass < 2; pass++) {
      for (let ni = 0; ni < names.length; ni++) {
        const nl = names[ni].toLowerCase();
        const idx = hdrs.findIndex(h => pass === 0 ? h.toLowerCase() === nl : h.toLowerCase().includes(nl));
        if (idx >= 0) return idx;
      }
    }
    return -1;
  };

  /* ── 3. Aktivasyon kolonu yoksa Hedef'e komşu sütunları dene ── */
  const tryAkt = (hedefCol, foundAktCol) => {
    if (foundAktCol >= 0) return foundAktCol;
    if (hedefCol < 0) return -1;
    /* Hedef'ten sonraki 1-3 sütuna bak */
    for (let off = 1; off <= 3; off++) {
      const nc = hedefCol + off;
      if (nc >= hdrs.length) break;
      const hl = hdrs[nc].toLowerCase();
      /* Başka bir Hedef/HGO/FC ise dur */
      if (hl.includes('hedef') || hl.includes('hgo') || hl.includes('%hgo') ||
          hl.includes('forecast') || hl.includes(' fc')) break;
      /* Aktivasyon işareti varsa kullan */
      if (hl.includes('aktiv') || hl.includes('aktv') || hl.includes('gerç') ||
          hl.includes('grc') || hl.includes('satış') || hl.includes('sat.') ||
          hl === 'a' || hl === 'g' || hl === 'gerç.' || hl === 'satış' ||
          hl.includes('gerçekleşen') || hl.includes('adet') || hl === '') {
        return nc;
      }
    }
    /* Son çare: Hedef+1 (boş/belirsiz başlık ise de olabilir) */
    if (hedefCol+1 < hdrs.length) return hedefCol+1;
    return -1;
  };

  /* ── 4. Kolon haritası ── */
  const C = {
    anaBayiKod: ci('Ana Bayi Kodu','Ana Bayi No','Üst Bayi Kodu','Ana Bayi'),
    bayiTipi:   ci('Bayi Tipi','Kanal Tipi','Segment','Tip','Kanal'),
    bayiAdi:    ci('Bayi Adı','Bayi Ad','Bayi Adi','Bayi Unvan','Acenta Adı','Acenta Ad'),
    bayiKod:    ci('Bayi Kodu','Bayi No','Bayi Kod','Acenta Kodu','Acenta No'),
    il:         ci('İl','Şehir','City','Province'),
    sy:         ci('Satış Yöneticisi','Satis Yoneticisi','SM','SY','Yönetici'),
    /* Hedef kolonu — aktivasyon tryAkt ile bulunacak */
    ppH:  ci('Postpaid Hedef','Faturalı Hedef','Faturai Hedef','PP Hedef'),
    ppA:  -1,
    fpH:  ci('Prepaid Hedef','Faturasız Hedef','FP Hedef'),
    fpA:  -1,
    mobH: ci('Toplam Mobil Hedef','Mobil Hedef','GSM Hedef','Mobil H'),
    mobA: ci('Toplam Mobil Gerçekleşen','Toplam Mobil Grc','Toplam Mobil Aktv','Mobil Gerçekleşen','Mobil Grc','Mobil Aktv','Mobil G','Mobil A'),
    mobHGO: ci('Toplam Mobil HGO','Mobil HGO','Mobil %','Mobil Hgo'),
    dslH: ci('DSL Hedef','Evde İnternet Hedef','ADSL Hedef','Dsl Hedef'),
    dslA: ci('DSL Gerçekleşen','DSL Grc','DSL Aktv','Evde İnternet Gerçekleşen','Evde İnternet Grc','Evde İnternet Aktv','Dsl Grc','Dsl Aktv'),
    dslHGO: ci('DSL HGO','Evde İnternet HGO','Dsl Hgo'),
    iptvH: ci('IPTV Hedef'),
    iptvA: ci('IPTV Gerçekleşen','IPTV Grc','IPTV Aktv'),
    uydH:  ci('Uydu Hedef','Uydu TV Hedef'),
    uydA:  ci('Uydu Gerçekleşen','Uydu Grc','Uydu Aktv'),
    tvH:  ci('Tivibu Hedef','Toplam TV Hedef','TV Hedef','Tivibu Toplam Hedef'),
    tvA:  ci('Tivibu Gerçekleşen','Tivibu Grc','Tivibu Aktv','Toplam TV Gerçekleşen','TV Grc','TV Aktv'),
    tvHGO: ci('Tivibu HGO','Toplam TV HGO','TV HGO'),
    cihH: ci('Akıllı Cihaz Hedef','Cihaz Hedef','Toplam Cihaz Hedef','Smart Cihaz Hedef'),
    cihA: ci('Akıllı Cihaz Gerçekleşen','Akıllı Cihaz Grc','Akıllı Cihaz Aktv','Cihaz Gerçekleşen','Cihaz Grc','Cihaz Aktv'),
    cihHGO: ci('Akıllı Cihaz HGO','Cihaz HGO'),
    cihDH: ci('Diğer Cihaz Hedef'),
    cihDA: ci('Diğer Cihaz Gerçekleşen','Diğer Cihaz Grc','Diğer Cihaz Aktv'),
  };

  /* Aktivasyon bulunamadıysa komşu sütundan türet */
  C.ppA  = tryAkt(C.ppH,  C.ppA);
  C.fpA  = tryAkt(C.fpH,  C.fpA);
  C.mobA = tryAkt(C.mobH, C.mobA);
  C.dslA = tryAkt(C.dslH, C.dslA);
  C.tvA  = tryAkt(C.tvH,  C.tvA);
  C.iptvA= tryAkt(C.iptvH,C.iptvA);
  C.uydA = tryAkt(C.uydH, C.uydA);
  C.cihA = tryAkt(C.cihH, C.cihA);
  C.cihDA= tryAkt(C.cihDH,C.cihDA);

  /* ── 5. Mapping raporu ── */
  const mapln = (lbl, hc, ac) =>
    lbl + ' -> H:' + hc + '(' + (hc>=0 ? '"'+hdrs[hc]+'"' : 'YOK') + ')' +
    '  A:' + ac + '(' + (ac>=0 ? '"'+hdrs[ac]+'"' : 'YOK') + ')';
  const mappingLines = [
    '=== Kolon Mapping ===',
    'Ana Bayi Kodu -> sütun ' + C.anaBayiKod + ' (' + (C.anaBayiKod>=0?'"'+hdrs[C.anaBayiKod]+'"':'BULUNAMADI') + ')',
    'Bayi Adı      -> sütun ' + C.bayiAdi    + ' (' + (C.bayiAdi>=0?'"'+hdrs[C.bayiAdi]+'"':'BULUNAMADI') + ')',
    'Bayi Kodu     -> sütun ' + C.bayiKod    + ' (' + (C.bayiKod>=0?'"'+hdrs[C.bayiKod]+'"':'BULUNAMADI') + ')',
    'Bayi Tipi     -> sütun ' + C.bayiTipi   + ' (' + (C.bayiTipi>=0?'"'+hdrs[C.bayiTipi]+'"':'BULUNAMADI') + ')',
    'İl            -> sütun ' + C.il          + ' (' + (C.il>=0?'"'+hdrs[C.il]+'"':'BULUNAMADI') + ')',
    mapln('Postpaid    ', C.ppH,   C.ppA),
    mapln('Prepaid     ', C.fpH,   C.fpA),
    mapln('Toplam Mobil', C.mobH,  C.mobA),
    mapln('DSL         ', C.dslH,  C.dslA),
    mapln('IPTV        ', C.iptvH, C.iptvA),
    mapln('Uydu        ', C.uydH,  C.uydA),
    mapln('TV/Tivibu   ', C.tvH,   C.tvA),
    mapln('Akıllı Cihaz', C.cihH,  C.cihA),
    mapln('Diğer Cihaz ', C.cihDH, C.cihDA),
  ];
  log.push(...mappingLines);
  mappingLines.forEach(l => console.log('[EDM] ' + l));

  /* ── 5b. SY sütunu bulunamadıysa J (0-tabanlı 9.) sütunu dene ── */
  if (C.sy < 0 && hdrs.length > 9) {
    C.sy = 9;
    log.push('SY sütunu isimle bulunamadı → J sütunu (indeks 9) deneniyor: "' + (hdrs[9]||'') + '"');
  }

  /* ── 6. Ana Bayi Kodu değer taraması ── */
  if (C.anaBayiKod < 0) {
    for (let ci2 = 0; ci2 < Math.min(hdrs.length, 40); ci2++) {
      const vals = allRows.slice(hi+1, hi+10).map(r => r && r[ci2] != null ? String(r[ci2]).trim() : '');
      if (vals.some(v => v === EDM_ANA_KOD)) {
        C.anaBayiKod = ci2;
        log.push('Ana Bayi Kodu değer taramayla bulundu: sütun ' + ci2 + ' ("' + hdrs[ci2] + '")');
        break;
      }
    }
  }

  /* ── 7. Ürün kolonu fallback (hiç bulunamazsa TTM BUAY pozisyonları) ── */
  const hasProd = C.mobH>=0||C.ppH>=0||C.dslH>=0||C.tvH>=0||C.iptvH>=0||C.cihH>=0;
  if (!hasProd) {
    log.push('!!! Ürün sütunları hiç bulunamadı → TTM BUAY pozisyon fallback !!!');
    console.warn('[EDM] Ürün sütunları bulunamadı, TTM BUAY konum tahmini kullanılıyor');
    C.ppH=49;C.ppA=50;C.fpH=53;C.fpA=54;
    C.dslH=57;C.dslA=58;
    C.iptvH=69;C.iptvA=70;C.uydH=73;C.uydA=74;
    C.cihH=77;C.cihA=78;C.cihDH=81;C.cihDA=82;
  }

  /* ── 8. Veri satırlarını parse et ── */
  const out = { bayi:{"Postpaid":[],"Prepaid":[],"Toplam Mobil":[],"DSL":[],"Toplam TV":[],"Akıllı Cihaz":[],"Diğer Cihaz":[]} };
  const detayBayiler = {};
  let bayiCount = 0;
  const debugSmp = {TTBN:[], ESN:[], OTHER:[]};

  const gs = (r,col) => (col>=0&&r&&r[col]!=null)?String(r[col]).trim():'';
  const gn = (r,col) => { if(col<0||!r||r[col]==null)return null; const v=num(r[col]); return v; };
  const hg = (a,h,pre) => {
    if(pre!==null&&pre!==undefined&&!isNaN(pre)&&pre>0)return Math.round(pre*10)/10;
    return (a!==null&&h&&h>0)?Math.round(a/h*1000)/10:null;
  };

  for (const r of allRows.slice(hi+1)) {
    if (!r) continue;

    /* Ana Bayi Kodu filtresi */
    if (C.anaBayiKod >= 0 && gs(r, C.anaBayiKod) !== EDM_ANA_KOD) continue;

    const bayiAdi = gs(r,C.bayiAdi)||(r[3]?String(r[3]).trim():'');
    const bayiKod = gs(r,C.bayiKod)||(r[2]?String(r[2]).trim():'');
    if (!bayiAdi && !bayiKod) continue;

    const b   = shortB(bayiAdi||bayiKod);
    const bt  = gs(r,C.bayiTipi);
    const il  = gs(r,C.il);
    const sy_ = gs(r,C.sy);
    const sub = bayiKod&&il ? bayiKod+' · '+il : (bayiKod||il||'');

    const ppH=gn(r,C.ppH)||0, ppA=gn(r,C.ppA)||0;
    const fpH=gn(r,C.fpH)||0, fpA=gn(r,C.fpA)||0;
    let mobH, mobA;
    if(C.mobH>=0){ mobH=gn(r,C.mobH)||0; mobA=gn(r,C.mobA)||0; }
    else          { mobH=ppH+fpH; mobA=ppA+fpA; }
    const mobHGO=gn(r,C.mobHGO);
    const dslH=gn(r,C.dslH)||0, dslA=gn(r,C.dslA)||0, dslHGO=gn(r,C.dslHGO);
    let tvH,tvA;
    if(C.tvH>=0){ tvH=gn(r,C.tvH)||0; tvA=gn(r,C.tvA)||0; }
    else        { tvH=(gn(r,C.iptvH)||0)+(gn(r,C.uydH)||0); tvA=(gn(r,C.iptvA)||0)+(gn(r,C.uydA)||0); }
    const tvHGO=gn(r,C.tvHGO);
    const cihH=gn(r,C.cihH)||0, cihA=gn(r,C.cihA)||0, cihHGO=gn(r,C.cihHGO);
    const cihDH=gn(r,C.cihDH)||0, cihDA=gn(r,C.cihDA)||0;

    /* Debug örnek */
    const smpKey = bt==='TTBN'?'TTBN':bt==='ESN'?'ESN':'OTHER';
    if(debugSmp[smpKey].length<5) debugSmp[smpKey].push({
      bayiKod,name:b,bt,il,mobH,mobA,dslH,dslA,tvH,tvA,cihH,cihA,
      rawMobA:r[C.mobA],rawDslA:r[C.dslA],rawCihA:r[C.cihA]
    });

    /* h ve a alanları EDM'de aktivasyon bazlı sıralama ve gösterim için gerekli */
    if(ppH>0)  out.bayi["Postpaid"].push({p:b,b:sub,sy:sy_,bt,il,g:hg(ppA,ppH,null),h:Math.round(ppH),a:Math.round(ppA)});
    if(fpH>0)  out.bayi["Prepaid"].push({p:b,b:sub,sy:sy_,bt,il,g:hg(fpA,fpH,null),h:Math.round(fpH),a:Math.round(fpA)});
    if(mobH>0||mobHGO!==null) out.bayi["Toplam Mobil"].push({p:b,b:sub,sy:sy_,bt,il,g:hg(mobA,mobH,mobHGO),h:Math.round(mobH),a:Math.round(mobA)});
    if(dslH>0||dslHGO!==null) out.bayi["DSL"].push({p:b,b:sub,sy:sy_,bt,il,g:hg(dslA,dslH,dslHGO),h:Math.round(dslH),a:Math.round(dslA)});
    if(tvH>0||tvHGO!==null)   out.bayi["Toplam TV"].push({p:b,b:sub,sy:sy_,bt,il,g:hg(tvA,tvH,tvHGO),h:Math.round(tvH),a:Math.round(tvA)});
    if(cihH>0||cihHGO!==null) out.bayi["Akıllı Cihaz"].push({p:b,b:sub,sy:sy_,bt,il,g:hg(cihA,cihH,cihHGO),h:Math.round(cihH),a:Math.round(cihA)});
    if(cihDH>0) out.bayi["Diğer Cihaz"].push({p:b,b:sub,sy:sy_,bt,il,g:hg(cihDA,cihDH,null),h:Math.round(cihDH),a:Math.round(cihDA)});

    const pr={
      "Postpaid":    {h:Math.round(ppH), a:Math.round(ppA), g:hg(ppA,ppH,null)},
      "Prepaid":     {h:Math.round(fpH), a:Math.round(fpA), g:hg(fpA,fpH,null)},
      "Toplam Mobil":{h:Math.round(mobH),a:Math.round(mobA),g:hg(mobA,mobH,mobHGO)},
      "DSL":         {h:Math.round(dslH),a:Math.round(dslA),g:hg(dslA,dslH,dslHGO)},
      "Toplam TV":   {h:Math.round(tvH), a:Math.round(tvA), g:hg(tvA,tvH,tvHGO)},
      "Akıllı Cihaz":{h:Math.round(cihH),a:Math.round(cihA),g:hg(cihA,cihH,cihHGO)},
      "Diğer Cihaz": {h:Math.round(cihDH),a:Math.round(cihDA),g:hg(cihDA,cihDH,null)},
      "Toplam Cihaz":{h:Math.round(cihH+cihDH),a:Math.round(cihA+cihDA),g:hg(cihA+cihDA,cihH+cihDH,null)},
    };
    detayBayiler[bayiKod||b]={kod:bayiKod,b,il,bt,sy:sy_,prods:pr};
    bayiCount++;
  }

  /* ── 9. Debug: İlk 5 TTBN / ESN satırı ── */
  ['TTBN','ESN','OTHER'].forEach(bk => {
    if(!debugSmp[bk].length) return;
    log.push('=== İlk '+debugSmp[bk].length+' '+bk+' satırı ===');
    debugSmp[bk].forEach((s,i)=>{
      log.push((i+1)+'. Kod:'+s.bayiKod+' Ad:'+s.name+' İl:'+s.il);
      log.push('   Mob H:'+s.mobH+' A:'+s.mobA+' (raw:'+s.rawMobA+') | DSL H:'+s.dslH+' A:'+s.dslA+' (raw:'+s.rawDslA+') | TV H:'+s.tvH+' A:'+s.tvA+' | Cih H:'+s.cihH+' A:'+s.cihA+' (raw:'+s.rawCihA+')');
    });
  });
  log.push('=== TOPLAM: '+bayiCount+' EDM bayi parse edildi ===');

  log.forEach(l=>console.log('[EDM] '+l));
  if(typeof EDM_COL_LOG!=='undefined') EDM_COL_LOG=log.join('\n');

  if(bayiCount===0){
    const msg = C.anaBayiKod>=0
      ? APP_CONFIG.edmAnaBayiKod + " Ana Bayi koduna bağlı EDM verisi bulunamadı."
      : "Ana Bayi Kodu sütunu bulunamadı. Ayarlar→EDM bölümünde log'u inceleyin.";
    return {error:msg,data:out,detay:{bayiler:detayBayiler,pers:{}},bayiCount:0};
  }

  /* EDM sıralaması: aktivasyon adedi öncelikli */
  for(const k in out.bayi) out.bayi[k].sort((a,c)=>(c.a||c.g||0)-(a.a||a.g||0));
  return {data:out,detay:{bayiler:detayBayiler,pers:{}},error:null,bayiCount};
}

/* ───── DOSYA ───── */
function wire(boxId, inputId, isPrev) {
  const box = document.getElementById(boxId), inp = document.getElementById(inputId);
  const handle = f => {
    const rd = new FileReader();
    rd.onload = async e => {
      const msg = document.getElementById("pmsg");
      try {
        await ensureXLSX();
        const parsed = parseWB(XLSX.read(new Uint8Array(e.target.result), { type: "array" }));
        const _setBoxLabel = (b, name) => {
          const el = b.querySelector(".drop-sub") || b.querySelector(".t2");
          if (el) el.textContent = "✅ " + name;
        };
        if (isPrev) {
          PREV = parsed.data;
          if (typeof PREV_DETAY !== "undefined") PREV_DETAY = parsed.detay || null;
          if (parsed.syData && Object.keys(parsed.syData.sy).length) SYPREV = parsed.syData; box.classList.add("loaded");
          _setBoxLabel(box, f.name);
          msg.className = "pmsg ok show"; msg.textContent = "✅ Karşılaştırma yüklendi (" + parsed.donem + ")";
        } else {
          DATA = parsed.data; DONEM = parsed.donem; MATRIX = parsed.matrix; if (parsed.kupa && parsed.kupa.length) KUPA = parsed.kupa; if (parsed.detay && Object.keys(parsed.detay.bayiler).length) { DETAY = parsed.detay; detayKod = null; }
          try { trendCapture(); } catch(e) {} if (parsed.syData && Object.keys(parsed.syData.sy).length) SYDATA = parsed.syData; box.classList.add("loaded");
          _setBoxLabel(box, f.name);
          document.getElementById("status").textContent = "📊 " + parsed.persCount + " personel · " + parsed.bayiCount + " bayi · " + parsed.donem;
          msg.className = "pmsg ok show"; msg.textContent = "✅ " + parsed.persCount + " personel + " + parsed.bayiCount + " bayi işlendi";
          sy = "Tümü";
          /* Sprint 3: TTM son yükleme zaman damgası */
          try { localStorage.setItem(LOAD_KEY_TTM, new Date().toISOString()); } catch(_e) {}
          /* Sprint 3: Kalan Gün auto-fill — SY ÖZET verisinden day-now/day-total doldur */
          if (parsed.syData && parsed.syData.calisilanGun && parsed.syData.calismaGun) {
            var _dnEl = document.getElementById('day-now');
            var _dtEl = document.getElementById('day-total');
            if (_dnEl && _dtEl && !_dnEl.value) { _dnEl.value = parsed.syData.calisilanGun; _dtEl.value = parsed.syData.calismaGun; }
          }
          /* EDM BUAY parse (mevcut Excel'den) */
          try {
            const wb2 = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
            const edm = parseEDMSheet(wb2);
            EDM_DATA  = edm.data;
            EDM_DETAY = edm.detay;
            EDM_ERROR = edm.error;
            if (typeof updateKanalBadge === 'function') updateKanalBadge();
          } catch(edmErr) { EDM_ERROR = "EDM parse hatası: " + edmErr.message; }
          /* Sprint 3: EDM son yükleme + DATA_HEALTH */
          try { if (!EDM_ERROR) localStorage.setItem(LOAD_KEY_EDM, new Date().toISOString()); } catch(_e) {}
          DATA_HEALTH = { bayiCount: parsed.bayiCount, persCount: parsed.persCount, syCount: parsed.syData ? Object.keys(parsed.syData.sy).length : 0, warnings: parsed.warnings || [], ok: (parsed.warnings || []).length === 0 };
        }
        buildTabs(); render();
      } catch (err) { msg.className = "pmsg err show"; msg.textContent = "❌ " + err.message; }
    };
    rd.readAsArrayBuffer(f);
  };
  inp.addEventListener("change", e => { if (e.target.files[0]) handle(e.target.files[0]); });
  ["dragover","dragenter"].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.add("drag"); }));
  ["dragleave","drop"].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.remove("drag"); }));
  box.addEventListener("drop", e => { if (e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); });
}
wire("drop-today", "f-today", false);
wire("drop-prev", "f-prev", true);
