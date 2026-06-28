/* ════════════════════════════════════════════
   js/export.js
   WhatsApp metni kopyalama + PNG dışa aktarma
   (html2canvas tabanlı görsel üretimi).
   ════════════════════════════════════════════ */

/* ───── WHATSAPP METNİ ───── */
function copyText() {
  const N = parseInt(document.getElementById("nsel").value);
  const icon = (PRODS[section].find(p => p.key === prod) || {}).icon || "";
  const f = fc(); let t = ""; const syT = sy === "Tümü" ? "" : " · " + sy;
  const ml = i => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1) + ".";
  if (section === "bayi") {
    t = icon + " *" + prod.toUpperCase() + " BAYİ SIRALAMASI* · " + DONEM + syT + (f ? " (Gün " + f.d + "/" + f.t + ")" : "") + "\n\n";
    filt(DATA.bayi[prod]).forEach((r, i) => { t += ml(i) + " *" + r.p + "* (" + r.b + ") — %" + r.g.toFixed(1); if (f) t += " · F: %" + (r.g * f.k).toFixed(0); t += "\n"; });
  } else if (view === "stars") {
    t = "⭐ *GÜNÜN YILDIZLARI* · " + DONEM + syT + "\n\n";
    for (const p of STAR_PRODS) { const r = filt(DATA.pers[p.key] || [])[0]; if (r) t += p.icon + " *" + p.key + ":* " + r.p + " — %" + r.g.toFixed(1) + "\n"; }
  } else {
    const recs = filt(DATA.pers[prod]);
    if (view !== "bot") { t += icon + " *" + prod.toUpperCase() + " — İLK " + N + "* · " + DONEM + syT + "\n\n"; recs.slice(0, N).forEach((r, i) => t += ml(i) + " *" + r.p + "* (" + r.b + ") — %" + r.g.toFixed(1) + "\n"); }
    if (view === "both") t += "\n";
    if (view !== "top") { t += "📈 *GELİŞİM FIRSATI — SON " + N + "*\n\n"; recs.slice(-N).reverse().forEach((r, i) => t += (recs.length - i) + ". " + r.p + " (" + r.b + ") — %" + r.g.toFixed(1) + "\n"); }
  }
  t += "\n💪 Hedefe birlikte!";
  navigator.clipboard.writeText(t).then(() => { const m = document.getElementById("pmsg"); m.className = "pmsg ok show"; m.textContent = "✅ WhatsApp metni kopyalandı"; });
}

/* ─── ORTAK EXPORT ALTYAPISI ─────────────────────────────────────── */

async function createCleanExportClone(el, fixedWidth) {
  var elW = fixedWidth || Math.ceil(
    el.offsetWidth || (el.getBoundingClientRect ? el.getBoundingClientRect().width : 0) || 360
  );
  var wrapper = document.createElement('div');
  wrapper.className = 'export-clone';
  wrapper.style.cssText =
    'position:fixed;left:-9999px;top:0;width:' + elW + 'px;' +
    'background:#ffffff;z-index:-1;pointer-events:none;overflow:visible;';

  var clone = el.cloneNode(true);
  clone.style.cssText = (clone.getAttribute('style') || '') +
    ';opacity:1;filter:none;-webkit-filter:none;' +
    'backdrop-filter:none;-webkit-backdrop-filter:none;' +
    'mix-blend-mode:normal;transform:none;' +
    'animation:none;-webkit-animation:none;background:#ffffff;';

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  await new Promise(function(resolve) {
    requestAnimationFrame(function() { setTimeout(resolve, 80); });
  });

  return { wrapper: wrapper, clone: clone, width: elW };
}

async function captureExportImage(target, opts) {
  await ensureH2C();
  return html2canvas(target, Object.assign({
    scale: 2.5,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
  }, opts || {}));
}

function cleanupExportClone(wrapper) {
  if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
}

/* ─── BAYİ DETAY EXPORT ──────────────────────────────────────────── */

async function downloadDetayCardPNG() {
  var btn   = document.getElementById('fbar-dl-btn');
  var valEl = btn ? btn.querySelector('.fbar-chip-val') : null;
  var orig  = valEl ? valEl.textContent : 'Oluştur ↗';
  if (btn)   btn.disabled = true;
  if (valEl) valEl.textContent = '⏳';

  var cloneWrapper = null;
  try {
    var el = document.getElementById('detay-card');
    if (!el) throw new Error('Detay kartı bulunamadı (#detay-card)');

    /* Tam içerik yüksekliği (scroll altındaki personel listesi dahil) */
    var elH = Math.max(el.scrollHeight, el.offsetHeight);
    var elW = el.offsetWidth || 490;

    var res = await createCleanExportClone(el, elW);
    cloneWrapper = res.wrapper;

    /* Yükseklik kısıtlamasını kaldır — tüm içerik görünsün */
    res.clone.style.height    = 'auto';
    res.clone.style.maxHeight = 'none';
    res.clone.style.overflow  = 'visible';

    /* Dosya adı */
    var donem   = (typeof DONEM    !== 'undefined' && DONEM)    ? DONEM.replace('/', '')    : '';
    var bayiKey = '';
    if (typeof detayKod !== 'undefined' && typeof DETAY !== 'undefined'
        && DETAY && DETAY.bayiler && DETAY.bayiler[detayKod]) {
      bayiKey = (DETAY.bayiler[detayKod].b || detayKod || '')
                  .replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/g, '').slice(0, 15);
    }
    var fname = 'TT_BayiDetay_' + bayiKey + '_' + donem + '.png';

    var canvas = await captureExportImage(res.clone, { height: elH });
    cleanupExportClone(cloneWrapper); cloneWrapper = null;
    _openSharePreview(canvas.toDataURL('image/png'), fname);

  } catch (e) {
    alert('Görsel oluşturma hatası: ' + e.message);
  }

  cleanupExportClone(cloneWrapper);
  if (btn)   btn.disabled = false;
  if (valEl) valEl.textContent = orig;
}

/* ─── EXCEL MATRİS EXPORT ────────────────────────────────────────── */

function _buildExcelMatrisHTML() {
  var M = (typeof MATRIX !== 'undefined') ? MATRIX : null;
  if (!M || !M.rows) return '<div style="padding:40px;text-align:center;font-family:sans-serif;">Matris verisi yok</div>';

  var f      = (typeof fc === 'function') ? fc() : null;
  var fcVal  = function(v) { return (f && v !== null && v !== undefined) ? Math.round(v * f.k) : null; };
  var donem  = (typeof DONEM !== 'undefined' && DONEM) ? DONEM : '';
  var today  = new Date().toLocaleDateString('tr-TR');
  var sKey   = (typeof matrixSort !== 'undefined') ? matrixSort : 'mobil';

  var rows = M.rows.slice().sort(function(a, b) {
    var av = a[sKey], bv = b[sKey];
    return ((bv == null ? -Infinity : bv) - (av == null ? -Infinity : av));
  });

  /* Kolon genişlikleri — toplam 2600px */
  var W = { sira:64, kod:116, ad:340, hgo:134, fc:164, ipdsl:292 };
  /* Kontrol: 64+116+340 + 6*(134+164) + 292 = 520 + 1788 + 292 = 2600 ✓ */

  var COLS = [
    { key:'mobil', label:'MOBİL',  hdr:'#0C2860', lt:'#E8F0FF', single:false },
    { key:'dsl',   label:'DSL',    hdr:'#155724', lt:'#E8F5EC', single:false },
    { key:'iptv',  label:'İP TV',  hdr:'#3B1478', lt:'#EDE8FB', single:false },
    { key:'ipdsl', label:'İP/DSL', hdr:'#7A1020', lt:'#FDEAEC', single:true  },
    { key:'uydu',  label:'UYDU',   hdr:'#0A4233', lt:'#E6F4EF', single:false },
    { key:'tv',    label:'TV',     hdr:'#0A3D5C', lt:'#E4F2FA', single:false },
    { key:'cihaz', label:'CİHAZ', hdr:'#1A4A28', lt:'#E8F5E9', single:false },
  ];

  /* Pastel heatmap */
  function hm(v) {
    if (v === null || v === undefined) return { bg:'#F5F6FA', fg:'#94A3B8', bar:'#E8EAF0' };
    if (v >= 120) return { bg:'#BFE8CC', fg:'#146C43', bar:'#A8DDB8' };
    if (v >= 100) return { bg:'#DDF3E4', fg:'#146C43', bar:'#C4EAD0' };
    if (v >= 90)  return { bg:'#EEF7D6', fg:'#146C43', bar:'#DDF0BE' };
    if (v >= 80)  return { bg:'#FFF1C9', fg:'#9A6500', bar:'#FFE8A0' };
    if (v >= 70)  return { bg:'#FFE1C7', fg:'#9A6500', bar:'#FFD0A8' };
    return         { bg:'#F8C9C9', fg:'#B42318', bar:'#F4AAAA' };
  }

  var BD = '1px solid #D8DEE9';
  var P  = '16px 8px';  /* hücre padding — satır min ~58px */

  function hgoCell(v) {
    var c = hm(v);
    var str = (v !== null && v !== undefined) ? '%' + Math.round(v) : '—';
    return '<td style="background:' + c.bg + ';color:' + c.fg + ';text-align:center;' +
      'padding:' + P + ';font-size:22px;font-weight:800;border:' + BD + ';letter-spacing:-0.3px;">' +
      str + '</td>';
  }

  function barCell(fv) {
    if (fv === null) return '<td style="background:#FAFBFD;text-align:center;padding:' + P + ';font-size:18px;color:#B0BAC8;border:' + BD + ';">—</td>';
    var c   = hm(fv);
    var pct = Math.min(Math.max(fv, 0), 130) / 130 * 100;
    return '<td style="padding:0;border:' + BD + ';overflow:hidden;vertical-align:middle;">' +
      '<div style="height:100%;min-height:58px;display:flex;align-items:center;justify-content:center;' +
        'background:linear-gradient(to right,' + c.bar + '55 ' + pct.toFixed(0) + '%,#FAFBFD ' + pct.toFixed(0) + '%);' +
        'padding:' + P + ';">' +
        '<span style="font-size:18px;font-weight:700;color:' + c.fg + ';position:relative;z-index:1;">%' + fv + '</span>' +
      '</div>' +
    '</td>';
  }

  /* Toplam satırları */
  function totRow(totData, label, dark) {
    var rowBg   = dark ? '#0C2860' : '#1A3A70';
    var borderC = '1px solid rgba(255,255,255,0.12)';
    var r = '<tr>';
    r += '<td colspan="3" style="background:' + rowBg + ';color:#fff;padding:18px 14px;' +
      'font-size:16px;font-weight:900;border:' + borderC + ';letter-spacing:0.2px;">&#9646; ' + label + '</td>';
    COLS.forEach(function(col) {
      var raw = (totData && totData[col.key] !== undefined) ? totData[col.key] : null;
      var fv  = (!col.single && raw !== null) ? fcVal(raw) : null;
      var c   = hm(raw);
      var str = (raw !== null && raw !== undefined) ? '%' + Math.round(raw) : '—';
      r += '<td style="background:' + (raw !== null ? c.bg : 'rgba(255,255,255,0.06)') + ';' +
        'color:' + (raw !== null ? c.fg : '#8899B4') + ';text-align:center;' +
        'padding:18px 8px;font-size:24px;font-weight:900;border:' + borderC + ';">' + str + '</td>';
      if (!col.single) {
        var fc2 = fv !== null ? hm(fv) : { bg:'rgba(255,255,255,0.06)', fg:'#8899B4' };
        var fs  = fv !== null ? '%' + fv : '—';
        r += '<td style="background:' + fc2.bg + ';color:' + fc2.fg + ';text-align:center;' +
          'padding:18px 8px;font-size:20px;font-weight:800;border:' + borderC + ';">' + fs + '</td>';
      }
    });
    r += '</tr>';
    return r;
  }

  /* Başlık satırı 1 — ürün grupları */
  var thBase = 'background:#0C2860;color:#fff;border:' + BD + ';';
  var h1 = '<tr>' +
    '<th rowspan="2" style="' + thBase + 'text-align:center;padding:14px 6px;font-size:15px;font-weight:800;width:' + W.sira + 'px;">Sıra</th>' +
    '<th rowspan="2" style="' + thBase + 'text-align:center;padding:14px 6px;font-size:15px;font-weight:800;width:' + W.kod + 'px;">Kodu</th>' +
    '<th rowspan="2" style="' + thBase + 'text-align:left;padding:14px 12px;font-size:15px;font-weight:800;width:' + W.ad + 'px;">Bayi Adı</th>';
  COLS.forEach(function(col) {
    var span = col.single ? 1 : 2;
    h1 += '<th colspan="' + span + '" style="background:' + col.hdr + ';color:#fff;text-align:center;' +
      'padding:14px 8px;font-size:22px;font-weight:900;letter-spacing:0.3px;border:' + BD + ';">' + col.label + '</th>';
  });
  h1 += '</tr>';

  /* Başlık satırı 2 — HGO / FC */
  var h2 = '<tr>';
  COLS.forEach(function(col) {
    var ltStyle = 'background:' + col.lt + ';color:' + col.hdr + ';text-align:center;' +
      'padding:10px 6px;font-size:14px;font-weight:900;border:' + BD + ';';
    if (col.single) {
      h2 += '<th style="' + ltStyle + 'width:' + W.ipdsl + 'px;">ORAN</th>';
    } else {
      h2 += '<th style="' + ltStyle + 'width:' + W.hgo + 'px;">HGO</th>';
      h2 += '<th style="' + ltStyle + 'width:' + W.fc + 'px;">' + (f ? 'FORECAST' : 'FC') + '</th>';
    }
  });
  h2 += '</tr>';

  /* Veri satırları */
  var body = '';
  rows.forEach(function(r, i) {
    var bg = i % 2 === 0 ? '#FFFFFF' : '#F7F9FC';
    body += '<tr style="background:' + bg + ';">' +
      '<td style="text-align:center;padding:' + P + ';font-size:20px;font-weight:800;color:#0B1F4D;border:' + BD + ';">' + (i + 1) + '</td>' +
      '<td style="text-align:center;padding:' + P + ';font-size:15px;font-weight:700;color:#4A5A7A;border:' + BD + ';">' + (r.kod || '') + '</td>' +
      '<td style="padding:' + P + ';font-size:19px;font-weight:700;color:#0B1F4D;border:' + BD + ';line-height:1.35;">' +
        (r.b || '') +
        (r.il ? '<br><span style="font-size:13px;color:#7A8DAA;font-weight:600;">' + r.il + '</span>' : '') +
      '</td>';
    COLS.forEach(function(col) {
      var raw = r[col.key];
      body += hgoCell(raw);
      if (!col.single) body += barCell(fcVal(raw));
    });
    body += '</tr>';
  });

  /* Şablon — 2600px geniş */
  return (
    '<div style="width:2600px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;">' +

    /* Üst başlık */
    '<div style="background:linear-gradient(135deg,#001E5A 0%,#0A1840 100%);padding:28px 40px;display:flex;align-items:center;justify-content:space-between;">' +
      '<div style="display:flex;align-items:center;gap:18px;">' +
        '<div style="background:#E30613;border-radius:14px;width:68px;height:68px;min-width:68px;' +
          'display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#fff;flex-shrink:0;">TT</div>' +
        '<div>' +
          '<div style="color:#fff;font-size:22px;font-weight:900;line-height:1.2;">Türk Telekom</div>' +
          '<div style="color:rgba(255,255,255,0.5);font-size:13px;font-weight:700;letter-spacing:2px;margin-top:3px;">KUZEY ANADOLU BÖLGE</div>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:center;">' +
        '<div style="color:rgba(255,255,255,0.4);font-size:12px;font-weight:700;letter-spacing:3px;margin-bottom:8px;">RAPORLAMA DÖNEMİ</div>' +
        '<div style="color:#fff;font-size:38px;font-weight:900;letter-spacing:0.3px;line-height:1.1;">PERFORMANS MATRİS RAPORU</div>' +
        '<div style="color:rgba(255,255,255,0.4);font-size:12px;font-weight:700;letter-spacing:2px;margin-top:8px;">' + rows.length + ' Bayi &nbsp;·&nbsp; 7 Ürün</div>' +
      '</div>' +
      '<div style="text-align:right;">' +
        '<div style="color:#fff;font-size:32px;font-weight:900;letter-spacing:0.5px;">' + donem + '</div>' +
        '<div style="color:rgba(255,255,255,0.5);font-size:14px;font-weight:600;margin-top:6px;">Rapor Tarihi: ' + today + '</div>' +
        (f ? '<div style="color:#A8E6C2;font-size:13px;font-weight:700;margin-top:5px;">&#9889; ' + f.d + '/' + f.t + '. gün &nbsp;&#183;&nbsp; Forecast aktif</div>' : '') +
      '</div>' +
    '</div>' +

    /* Tablo */
    '<table style="border-collapse:collapse;width:100%;table-layout:fixed;">' +
    '<colgroup>' +
      '<col style="width:' + W.sira + 'px"><col style="width:' + W.kod + 'px"><col style="width:' + W.ad + 'px">' +
      COLS.map(function(col) {
        if (col.single) return '<col style="width:' + W.ipdsl + 'px">';
        return '<col style="width:' + W.hgo + 'px"><col style="width:' + W.fc + 'px">';
      }).join('') +
    '</colgroup>' +
    '<thead>' + h1 + h2 + '</thead>' +
    '<tbody>' + body + '</tbody>' +
    '<tfoot>' +
      totRow(M.kuzey   || null, 'KUZEY ANADOLU', true) +
      totRow(M.anadolu || null, 'ANADOLU',        false) +
    '</tfoot>' +
    '</table>' +

    /* Alt şerit */
    '<div style="background:#0C2860;padding:14px 40px;display:flex;justify-content:space-between;align-items:center;">' +
      '<div style="color:rgba(255,255,255,0.5);font-size:12px;font-weight:700;letter-spacing:1.5px;">TT KUZEY ANADOLU BÖLGE &nbsp;&#183;&nbsp; PERFORMANS MERKEZİ</div>' +
      '<div style="color:rgba(255,255,255,0.5);font-size:12px;font-weight:700;">Hedefe Birlikte &nbsp;&#183;&nbsp; ' + today + '</div>' +
    '</div>' +

    '</div>'
  );
}

async function downloadExcelMatrisPNG() {
  var btn   = document.getElementById('fbar-excel-btn');
  var valEl = btn ? btn.querySelector('.fbar-chip-val') : null;
  var orig  = valEl ? valEl.textContent : 'Matris ↗';
  if (btn)   btn.disabled = true;
  if (valEl) valEl.textContent = '⏳';

  var cloneWrapper = null;
  try {
    var html    = _buildExcelMatrisHTML();
    var tpl     = document.createElement('div');
    tpl.innerHTML = html;
    var content = tpl.firstChild;

    var wrapper = document.createElement('div');
    wrapper.className = 'export-clone';
    wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;pointer-events:none;overflow:visible;background:#fff;';
    wrapper.appendChild(content);
    document.body.appendChild(wrapper);
    cloneWrapper = wrapper;

    await new Promise(function(r) { requestAnimationFrame(function() { setTimeout(r, 120); }); });

    var elW = content.scrollWidth || content.offsetWidth || 2600;
    var elH = content.scrollHeight || content.offsetHeight;

    var donem2 = (typeof DONEM !== 'undefined' && DONEM) ? DONEM.replace('/', '') : '';
    var fname2 = 'TT_ExcelMatris_' + donem2 + '.png';

    var canvas = await captureExportImage(content, {
      scale:        2,
      width:        elW,
      height:       elH,
      windowWidth:  elW + 50,
      windowHeight: elH + 50,
    });
    cleanupExportClone(cloneWrapper); cloneWrapper = null;
    _openSharePreview(canvas.toDataURL('image/png'), fname2);

  } catch (e) {
    alert('Excel matris görseli oluşturma hatası: ' + e.message);
  }

  cleanupExportClone(cloneWrapper);
  if (btn)   btn.disabled = false;
  if (valEl) valEl.textContent = orig;
}

/* ───── PNG (Ayarlar sayfası eski butonlar için) ───── */
async function snap(el) { await ensureH2C(); const c = await html2canvas(el, { scale: 2.5, backgroundColor: '#ffffff', useCORS: true, logging: false }); return c.toDataURL("image/png"); }
function dl(url, name) { const a = document.createElement("a"); a.download = name; a.href = url; document.body.appendChild(a); a.click(); a.remove(); }
function fname(p) {
  const v = section === "bayi" ? "Bayi" : view === "top" ? "Ilk" : view === "bot" ? "Son" : view === "both" ? "Tam" : "Yildizlar";
  return "TT_" + (p || prod).replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/g, "") + "_" + v + "_" + DONEM.replace("/", "") + ".png";
}
function showModal(dataUrl, name) {
  let m = document.getElementById("png-modal");
  if (!m) { m = document.createElement("div"); m.id = "png-modal";
    m.style.cssText = "position:fixed;inset:0;background:radial-gradient(ellipse at 50% 0%, rgba(18,42,94,0.96), rgba(6,12,28,0.97));backdrop-filter:blur(8px);z-index:99;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:14px;overflow:auto";
    document.body.appendChild(m); }
  m.innerHTML = '<div style="width:100%;max-width:500px;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
    '<span style="color:#fff;font-size:11.5px;font-weight:700">📲 Görsele uzun bas → Kaydet / Paylaş</span>' +
    '<button onclick="document.getElementById(\'png-modal\').style.display=\'none\'" style="background:#D40511;color:#fff;border:none;border-radius:7px;padding:7px 14px;font-weight:800;font-size:12px;cursor:pointer;font-family:inherit">✕ Kapat</button></div>' +
    '<img src="' + dataUrl + '" style="width:100%;max-width:500px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.5)">';
  m.style.display = "flex";
  try { const a = document.createElement("a"); a.download = name; a.href = dataUrl; document.body.appendChild(a); a.click(); a.remove(); } catch (e) {}
}
async function downloadPNG() {
  const b = document.getElementById("btn-png"); b.disabled = true; const o = b.textContent; b.textContent = "⏳ Hazırlanıyor…";
  try {
    if (section === "matrix") { showModal(await snap(document.getElementById("matrix-card")), "TT_KonsolideMatris_" + DONEM.replace("/","") + ".png"); }
    else if (section === "kupa") { showModal(await snap(document.getElementById("kupa-card")), "TT_KupaBende_" + DONEM.replace("/","") + ".png"); }
    else if (section === "detay") { showModal(await snap(document.getElementById("detay-card")), "TT_BayiDetay_" + (detayKod||"") + ".png"); }
    else if (section === "trend") { showModal(await snap(document.getElementById("trend-card")), "TT_Trend_" + DONEM.replace("/","") + ".png"); }
    else if (section === "risk") { showModal(await snap(document.getElementById("risk-card")), "TT_RiskRadari_" + DONEM.replace("/","") + ".png"); }
    else if (section === "sy") { showModal(await snap(document.getElementById("sy-card")), "TT_SatisYoneticisi_" + syProd.replace(/[^a-zA-Z]/g,"") + "_" + DONEM.replace("/","") + ".png"); }
    else if (layout === "grid") { showModal(await snap(document.getElementById("card-" + PRODS[section][0].key.replace(/[^a-zA-Z]/g,""))), fname(PRODS[section][0].key)); }
    else { showModal(await snap(document.getElementById("card-main")), fname()); }
  } catch (e) { alert("Hata: " + e.message); }
  b.disabled = false; b.textContent = o;
}
async function downloadAll() {
  const b = document.getElementById("btn-all"); b.disabled = true; const o = b.textContent;
  const keys = PRODS[section].map(p => p.key); const origLayout = layout, origProd = prod;
  if (layout !== "grid") { layout = "grid"; buildTabs(); render(); await new Promise(r => setTimeout(r, 300)); }
  for (let i = 0; i < keys.length; i++) {
    b.textContent = "⏳ " + (i + 1) + "/" + keys.length;
    const el = document.getElementById("card-" + keys[i].replace(/[^a-zA-Z]/g,""));
    if (el) { try { dl(await snap(el), fname(keys[i])); } catch (e) {} await new Promise(r => setTimeout(r, 250)); }
  }
  layout = origLayout; prod = origProd; buildTabs(); render();
  b.disabled = false; b.textContent = o;
}
