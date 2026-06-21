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

function parseWB(wb) {
  const out = { pers: { "Toplam Mobil": [], "Faturalı": [], "Faturasız": [], "DSL": [], "Toplam TV": [], "IPTV": [], "Uydu": [], "Cihaz": [] },
                bayi: { "Postpaid": [], "Prepaid": [], "Toplam Mobil": [], "DSL": [], "Toplam TV": [], "Akıllı Cihaz": [], "Diğer Cihaz": [] } };
  const mxRows = [];
  const kupaRows = [];
  const acc = () => ({ mobil:[0,0], dsl:[0,0], iptv:[0,0], uydu:[0,0], tv:[0,0], cihaz:[0,0] });
  const kuzeyTot = acc(), anadoluTot = acc();
  let donem = null, persCount = 0, bayiCount = 0;

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
    const ph = num(r[38]) || 0, pa = num(r[39]) || 0, rh = num(r[41]) || 0, ra = num(r[42]) || 0;
    const dh = num(r[44]) || 0, da = num(r[45]) || 0;
    const ih = num(r[53]) || 0, ia = num(r[54]) || 0, uh = num(r[56]) || 0, ua = num(r[57]) || 0;
    const ch = num(r[59]) || 0, ca = num(r[60]) || 0, gh = num(r[62]) || 0, ga = num(r[63]) || 0;
    const pushP = (key, h, a) => { if (h > 0) out.pers[key].push({ b, p, sy: sy_, g: Math.round(a / h * 1000) / 10 }); };
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
    const TGT = ["KORAY YEŞİLÖRDEK","YUSUF DILKI","MUHAMMET ARSLAN","MUSTAFA KAYIKÇI","EMRE FİLİZ","AHMET ÇELİK"];
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
  return { data: out, donem: dfmt, persCount, bayiCount, matrix, kupa: kupaRows, detay: { bayiler: detayBayiler, pers: detayPers }, syData: { calismaGun: syToplamGun, calisilanGun: syGun, sy: syOut, products: Object.keys(syOut).length ? Object.keys(syOut[Object.keys(syOut)[0]]) : [] } };
}

/* ───── EDM PARSER — Dinamik kolon tespiti ───── */
function parseEDMSheet(wb) {
  const EDM_ANA_KOD = '507868';
  const wsName = wb.SheetNames.find(s => s.trim().toUpperCase() === 'EDM BUAY');
  if (!wsName) return { error: "EDM BUAY sheet'i bulunamadı.", data: null, detay: null };

  const allRows = XLSX.utils.sheet_to_json(wb.Sheets[wsName], { header: 1, defval: null });
  let log = [];

  /* ── 1. Başlık satırını bul ── */
  let hi = -1, hdrs = [];
  // "Ana Bölge" ilk sütun
  let tmp = allRows.findIndex(r => r && r[0] && String(r[0]).trim() === "Ana Bölge");
  if (tmp >= 0) { hi = tmp; hdrs = allRows[tmp].map(c => c ? String(c).trim() : ''); }

  if (hi === -1) {
    // bayi + hedef/tip/mobil içeren satır tara
    for (let i = 0; i < Math.min(allRows.length, 20); i++) {
      if (!allRows[i]) continue;
      const rowStr = allRows[i].map(c => c ? String(c).trim() : '').join(' ').toLowerCase();
      if (rowStr.includes('bayi') && (rowStr.includes('hedef') || rowStr.includes('tipi') || rowStr.includes('mobil'))) {
        hi = i; hdrs = allRows[i].map(c => c ? String(c).trim() : ''); break;
      }
    }
  }

  if (hi === -1) return { error: "EDM BUAY: Başlık satırı bulunamadı.", data: null, detay: null };

  log.push('Başlık satırı: ' + hi + '. satır');
  log.push('Sütunlar: ' + hdrs.map((h,i) => h ? i+':'+h : null).filter(Boolean).join(', '));

  /* ── 2. Kolon eşleme (fuzzy) ── */
  const ci = function(/* ...names */) {
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

  const C = {
    anaBayiKod: ci('Ana Bayi Kodu','Ana Bayi No','Üst Bayi Kodu','Ana Bayi'),
    bayiTipi:   ci('Bayi Tipi','Kanal Tipi','Segment','Tip','Kanal'),
    bayiAdi:    ci('Bayi Adı','Bayi Ad','Bayi Adi','Bayi Unvan','Acenta Adı','Acenta Ad'),
    bayiKod:    ci('Bayi Kodu','Bayi No','Bayi Kod','Acenta Kodu','Acenta No'),
    il:         ci('İl','Şehir','City','Province'),
    sy:         ci('Satış Yöneticisi','SM','SY','Satis Yoneticisi'),
    bolge:      ci('Bölge','Ana Bölge','Region'),
    /* Toplam Mobil */
    mobH:   ci('Toplam Mobil Hedef','Mobil Hedef','GSM Hedef','Mobil H'),
    mobA:   ci('Toplam Mobil Gerçekleşen','Toplam Mobil Grc','Mobil Gerçekleşen','Mobil Grc','Mobil G'),
    mobHGO: ci('Toplam Mobil HGO','Mobil HGO','Mobil %','Mobil Hgo'),
    mobFC:  ci('Toplam Mobil Forecast','Mobil Forecast','Mobil FC'),
    /* Postpaid (Faturalı) */
    ppH: ci('Postpaid Hedef','Faturalı Hedef','Faturai Hedef','PP Hedef'),
    ppA: ci('Postpaid Gerçekleşen','Postpaid Grc','Faturalı Gerçekleşen','Faturalı Grc','PP Grc'),
    /* Prepaid (Faturasız) */
    fpH: ci('Prepaid Hedef','Faturasız Hedef','FP Hedef'),
    fpA: ci('Prepaid Gerçekleşen','Prepaid Grc','Faturasız Gerçekleşen','Faturasız Grc'),
    /* DSL */
    dslH:   ci('DSL Hedef','Evde İnternet Hedef','ADSL Hedef','Dsl Hedef'),
    dslA:   ci('DSL Gerçekleşen','DSL Grc','Evde İnternet Gerçekleşen','Evde Internet Grc'),
    dslHGO: ci('DSL HGO','Evde İnternet HGO','Dsl Hgo'),
    dslFC:  ci('DSL Forecast','DSL FC'),
    /* IPTV */
    iptvH: ci('IPTV Hedef','Tivibu IPTV Hedef'),
    iptvA: ci('IPTV Gerçekleşen','IPTV Grc','Tivibu IPTV Grc'),
    /* Uydu */
    uydH: ci('Uydu Hedef','Uydu TV Hedef'),
    uydA: ci('Uydu Gerçekleşen','Uydu Grc'),
    /* Tivibu/TV (toplam veya ayrı) */
    tvH:   ci('Tivibu Hedef','Toplam TV Hedef','TV Hedef','Tivibu Toplam Hedef'),
    tvA:   ci('Tivibu Gerçekleşen','Tivibu Grc','Toplam TV Gerçekleşen','TV Grc'),
    tvHGO: ci('Tivibu HGO','Toplam TV HGO','TV HGO'),
    tvFC:  ci('Tivibu Forecast','TV Forecast'),
    /* Cihaz */
    cihH:   ci('Akıllı Cihaz Hedef','Cihaz Hedef','Smart Cihaz Hedef','Toplam Cihaz Hedef'),
    cihA:   ci('Akıllı Cihaz Gerçekleşen','Akıllı Cihaz Grc','Cihaz Gerçekleşen','Cihaz Grc'),
    cihHGO: ci('Akıllı Cihaz HGO','Cihaz HGO'),
    cihFC:  ci('Cihaz Forecast','Akıllı Cihaz Forecast'),
    /* Diğer Cihaz */
    cihDH: ci('Diğer Cihaz Hedef'),
    cihDA: ci('Diğer Cihaz Gerçekleşen','Diğer Cihaz Grc'),
  };

  /* Mapping raporu */
  const mappingLines = [
    'Ana Bayi Kodu -> ' + (C.anaBayiKod>=0 ? '"'+hdrs[C.anaBayiKod]+'" (sütun '+C.anaBayiKod+')' : 'BULUNAMADI'),
    'Bayi Adı      -> ' + (C.bayiAdi>=0    ? '"'+hdrs[C.bayiAdi]+'" (sütun '+C.bayiAdi+')' : 'BULUNAMADI'),
    'Bayi Kodu     -> ' + (C.bayiKod>=0    ? '"'+hdrs[C.bayiKod]+'" (sütun '+C.bayiKod+')' : 'BULUNAMADI'),
    'Bayi Tipi     -> ' + (C.bayiTipi>=0   ? '"'+hdrs[C.bayiTipi]+'" (sütun '+C.bayiTipi+')' : 'BULUNAMADI'),
    'İl            -> ' + (C.il>=0          ? '"'+hdrs[C.il]+'" (sütun '+C.il+')' : 'BULUNAMADI'),
    'Mobil H/A     -> ' + C.mobH+'/'+C.mobA + (C.mobH<0&&C.ppH>=0?' (PP+FP ile hesaplanacak)':''),
    'Postpaid H/A  -> ' + C.ppH+'/'+C.ppA,
    'Prepaid H/A   -> ' + C.fpH+'/'+C.fpA,
    'DSL H/A       -> ' + C.dslH+'/'+C.dslA,
    'IPTV H/A      -> ' + C.iptvH+'/'+C.iptvA,
    'Uydu H/A      -> ' + C.uydH+'/'+C.uydA,
    'Tivibu H/A    -> ' + C.tvH+'/'+C.tvA,
    'Cihaz H/A     -> ' + C.cihH+'/'+C.cihA,
    'Diğer C H/A   -> ' + C.cihDH+'/'+C.cihDA,
  ];
  log.push(...mappingLines);
  mappingLines.forEach(l => console.log('[EDM] ' + l));

  /* ── 3. Ana Bayi Kodu sütununu değer taramasıyla da dene ── */
  if (C.anaBayiKod < 0) {
    for (let ci2 = 0; ci2 < Math.min(hdrs.length, 30); ci2++) {
      const vals = allRows.slice(hi+1, hi+8).map(r => r && r[ci2] != null ? String(r[ci2]).trim() : '');
      if (vals.some(v => v === EDM_ANA_KOD)) {
        C.anaBayiKod = ci2;
        log.push('Ana Bayi Kodu değer taramasıyla bulundu: sütun ' + ci2);
        break;
      }
    }
  }

  /* ── 4. Ürün kolonu bulunamadıysa TTM BUAY fallback ── */
  const hasProd = C.mobH>=0 || C.ppH>=0 || C.dslH>=0 || C.tvH>=0 || C.iptvH>=0 || C.cihH>=0;
  if (!hasProd) {
    log.push('Ürün sütunları adla bulunamadı → TTM BUAY konum fallback (49,50,53,54,57,58,69,70,73,74,77,78,81,82)');
    console.log('[EDM] TTM fallback aktif');
    C.ppH=49; C.ppA=50; C.fpH=53; C.fpA=54;
    C.dslH=57; C.dslA=58;
    C.iptvH=69; C.iptvA=70; C.uydH=73; C.uydA=74;
    C.cihH=77; C.cihA=78; C.cihDH=81; C.cihDA=82;
  }

  /* ── 5. Veri satırlarını parse et ── */
  const out = { bayi: {"Postpaid":[],"Prepaid":[],"Toplam Mobil":[],"DSL":[],"Toplam TV":[],"Akıllı Cihaz":[],"Diğer Cihaz":[]} };
  const detayBayiler = {};
  let bayiCount = 0;

  const gs = (r, col) => (col >= 0 && r && r[col] != null) ? String(r[col]).trim() : '';
  const gn = (r, col) => (col >= 0 && r && r[col] != null) ? num(r[col]) : null;
  const hg = (a, h, preHgo) => {
    if (preHgo !== null && preHgo !== undefined && !isNaN(preHgo)) return Math.round(preHgo * 10) / 10;
    return (a !== null && h && h > 0) ? Math.round(a/h*1000)/10 : null;
  };

  for (const r of allRows.slice(hi + 1)) {
    if (!r) continue;

    /* Ana Bayi Kodu filtresi */
    if (C.anaBayiKod >= 0) {
      const ank = gs(r, C.anaBayiKod);
      if (ank !== EDM_ANA_KOD) continue;
    } else {
      /* Kolon bilinmiyorsa atlat — tüm satırları al (risk ama olmazsa olmaz) */
    }

    const bayiAdi = gs(r, C.bayiAdi) || (r[3] ? String(r[3]).trim() : '');
    const bayiKod = gs(r, C.bayiKod) || (r[2] ? String(r[2]).trim() : '');
    if (!bayiAdi && !bayiKod) continue;

    const b   = shortB(bayiAdi || bayiKod);
    const bt  = gs(r, C.bayiTipi);
    const il  = gs(r, C.il);
    const sy_ = gs(r, C.sy);
    const sub = bayiKod && il ? bayiKod + ' · ' + il : (bayiKod || il || '');

    /* Ürün verileri */
    const ppH = gn(r,C.ppH)||0, ppA = gn(r,C.ppA)||0;
    const fpH = gn(r,C.fpH)||0, fpA = gn(r,C.fpA)||0;
    let mobH, mobA;
    if (C.mobH >= 0) { mobH = gn(r,C.mobH)||0; mobA = gn(r,C.mobA)||0; }
    else              { mobH = ppH+fpH; mobA = ppA+fpA; }
    const mobHGO  = gn(r, C.mobHGO);
    const dslH = gn(r,C.dslH)||0, dslA = gn(r,C.dslA)||0, dslHGO = gn(r,C.dslHGO);
    let tvH, tvA;
    if (C.tvH >= 0) { tvH = gn(r,C.tvH)||0; tvA = gn(r,C.tvA)||0; }
    else            { tvH = (gn(r,C.iptvH)||0)+(gn(r,C.uydH)||0); tvA = (gn(r,C.iptvA)||0)+(gn(r,C.uydA)||0); }
    const tvHGO = gn(r, C.tvHGO);
    const cihH = gn(r,C.cihH)||0, cihA = gn(r,C.cihA)||0, cihHGO = gn(r,C.cihHGO);
    const cihDH = gn(r,C.cihDH)||0, cihDA = gn(r,C.cihDA)||0;

    if (ppH>0)  out.bayi["Postpaid"].push({p:b,b:sub,sy:sy_,bt,g:hg(ppA,ppH,null)});
    if (fpH>0)  out.bayi["Prepaid"].push({p:b,b:sub,sy:sy_,bt,g:hg(fpA,fpH,null)});
    if (mobH>0||mobHGO!==null) out.bayi["Toplam Mobil"].push({p:b,b:sub,sy:sy_,bt,g:hg(mobA,mobH,mobHGO)});
    if (dslH>0||dslHGO!==null) out.bayi["DSL"].push({p:b,b:sub,sy:sy_,bt,g:hg(dslA,dslH,dslHGO)});
    if (tvH>0||tvHGO!==null)   out.bayi["Toplam TV"].push({p:b,b:sub,sy:sy_,bt,g:hg(tvA,tvH,tvHGO)});
    if (cihH>0||cihHGO!==null) out.bayi["Akıllı Cihaz"].push({p:b,b:sub,sy:sy_,bt,g:hg(cihA,cihH,cihHGO)});
    if (cihDH>0) out.bayi["Diğer Cihaz"].push({p:b,b:sub,sy:sy_,bt,g:hg(cihDA,cihDH,null)});

    const pr = {
      "Postpaid":    {h:Math.round(ppH), a:Math.round(ppA), g:hg(ppA,ppH,null)},
      "Prepaid":     {h:Math.round(fpH), a:Math.round(fpA), g:hg(fpA,fpH,null)},
      "Toplam Mobil":{h:Math.round(mobH),a:Math.round(mobA),g:hg(mobA,mobH,mobHGO)},
      "DSL":         {h:Math.round(dslH),a:Math.round(dslA),g:hg(dslA,dslH,dslHGO)},
      "Toplam TV":   {h:Math.round(tvH), a:Math.round(tvA), g:hg(tvA,tvH,tvHGO)},
      "Akıllı Cihaz":{h:Math.round(cihH),a:Math.round(cihA),g:hg(cihA,cihH,cihHGO)},
      "Diğer Cihaz": {h:Math.round(cihDH),a:Math.round(cihDA),g:hg(cihDA,cihDH,null)},
      "Toplam Cihaz":{h:Math.round(cihH+cihDH),a:Math.round(cihA+cihDA),g:hg(cihA+cihDA,cihH+cihDH,null)},
    };
    detayBayiler[bayiKod || b] = {kod:bayiKod, b, il, bt, sy:sy_, prods:pr};
    bayiCount++;
  }

  log.push('Parse edilen EDM bayi sayısı: ' + bayiCount);
  if (typeof EDM_COL_LOG !== 'undefined') EDM_COL_LOG = log.join('\n');

  if (bayiCount === 0) {
    const msg = C.anaBayiKod >= 0
      ? "507868 Ana Bayi koduna bağlı EDM verisi bulunamadı."
      : "Ana Bayi Kodu sütunu bulunamadı. Konsol loguna bakın.";
    return { error: msg, data: out, detay: { bayiler: detayBayiler, pers: {} }, bayiCount: 0 };
  }

  for (const k in out.bayi) out.bayi[k].sort((a,c) => (c.g||0)-(a.g||0));
  return { data: out, detay: { bayiler: detayBayiler, pers: {} }, error: null, bayiCount };
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
          /* EDM BUAY parse (mevcut Excel'den) */
          try {
            const wb2 = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
            const edm = parseEDMSheet(wb2);
            EDM_DATA  = edm.data;
            EDM_DETAY = edm.detay;
            EDM_ERROR = edm.error;
            if (typeof updateKanalBadge === 'function') updateKanalBadge();
          } catch(edmErr) { EDM_ERROR = "EDM parse hatası: " + edmErr.message; }
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
