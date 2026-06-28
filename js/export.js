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

  var COLS = [
    { key:'mobil', label:'MOBİL',  hdr:'#0F2D6B', lt:'#DBEAFE', single:false },
    { key:'dsl',   label:'DSL',    hdr:'#14532D', lt:'#DCFCE7', single:false },
    { key:'iptv',  label:'İP TV',  hdr:'#4C1D95', lt:'#EDE9FE', single:false },
    { key:'ipdsl', label:'İP/DSL', hdr:'#881337', lt:'#FFE4E6', single:true  },
    { key:'uydu',  label:'UYDU',   hdr:'#064E3B', lt:'#D1FAE5', single:false },
    { key:'tv',    label:'TV',     hdr:'#0C4A6E', lt:'#BAE6FD', single:false },
    { key:'cihaz', label:'CİHAZ', hdr:'#166534', lt:'#BBF7D0', single:false },
  ];

  /* Heatmap renkleri */
  function hm(v) {
    if (v === null || v === undefined) return { bg:'#F1F5F9', fg:'#94A3B8' };
    if (v >= 120) return { bg:'#14532D', fg:'#FFFFFF' };
    if (v >= 100) return { bg:'#16A34A', fg:'#FFFFFF' };
    if (v >= 90)  return { bg:'#86EFAC', fg:'#14532D' };
    if (v >= 80)  return { bg:'#FDE047', fg:'#713F12' };
    if (v >= 70)  return { bg:'#FB923C', fg:'#7C2D12' };
    return         { bg:'#EF4444', fg:'#FFFFFF' };
  }

  function hgoCell(v) {
    var c   = hm(v);
    var str = (v !== null && v !== undefined) ? '%' + Math.round(v) : '—';
    return '<td style="background:' + c.bg + ';color:' + c.fg + ';text-align:center;padding:7px 4px;font-size:12px;font-weight:800;border:1px solid rgba(0,0,0,0.08);">' + str + '</td>';
  }

  function barCell(fv) {
    if (fv === null) return '<td style="background:#F8FAFF;text-align:center;padding:7px 4px;font-size:11px;color:#94A3B8;border:1px solid rgba(0,0,0,0.08);">—</td>';
    var c   = hm(fv);
    var pct = Math.min(Math.max(fv, 0), 130) / 130 * 100;
    return '<td style="padding:0;border:1px solid rgba(0,0,0,0.08);overflow:hidden;">' +
      '<div style="min-height:30px;display:flex;align-items:center;justify-content:center;' +
        'background:linear-gradient(to right,' + c.bg + ' ' + pct.toFixed(0) + '%,#F0F4FF ' + pct.toFixed(0) + '%);' +
        'padding:7px 4px;">' +
        '<span style="font-size:11px;font-weight:800;color:' + c.fg + ';">%' + fv + '</span>' +
      '</div>' +
    '</td>';
  }

  /* Toplam satırı */
  function totRow(totData, label, dark) {
    var rowBg = dark ? '#0F2D6B' : '#1E3A6E';
    var r = '<tr>';
    r += '<td colspan="3" style="background:' + rowBg + ';color:#fff;padding:10px 10px;font-size:12px;font-weight:900;border:1px solid rgba(255,255,255,0.15);">&#9646; ' + label + '</td>';
    COLS.forEach(function(col) {
      var raw = (totData && totData[col.key] !== undefined) ? totData[col.key] : null;
      var fv  = (!col.single && raw !== null) ? fcVal(raw) : null;
      var c   = hm(raw);
      var str = (raw !== null && raw !== undefined) ? '%' + Math.round(raw) : '—';
      r += '<td style="background:' + (raw !== null ? c.bg : 'rgba(255,255,255,0.08)') + ';color:' + (raw !== null ? c.fg : '#94A3B8') + ';text-align:center;padding:10px 4px;font-size:13px;font-weight:900;border:1px solid rgba(255,255,255,0.12);">' + str + '</td>';
      if (!col.single) {
        var fc2  = fv !== null ? hm(fv) : { bg:'rgba(255,255,255,0.08)', fg:'#94A3B8' };
        var fs   = fv !== null ? '%' + fv : '—';
        r += '<td style="background:' + fc2.bg + ';color:' + fc2.fg + ';text-align:center;padding:10px 4px;font-size:13px;font-weight:900;border:1px solid rgba(255,255,255,0.12);">' + fs + '</td>';
      }
    });
    r += '</tr>';
    return r;
  }

  /* Başlık satırı 1 – ürün grupları */
  var h1 = '<tr>' +
    '<th rowspan="2" style="background:#0F2D6B;color:#fff;text-align:center;padding:10px 4px;font-size:10px;border:1px solid #1E3A6E;width:46px;">Sıra</th>' +
    '<th rowspan="2" style="background:#0F2D6B;color:#fff;text-align:center;padding:10px 4px;font-size:10px;border:1px solid #1E3A6E;width:82px;">Kodu</th>' +
    '<th rowspan="2" style="background:#0F2D6B;color:#fff;text-align:left;padding:10px 8px;font-size:10px;border:1px solid #1E3A6E;width:250px;">Bayi Adı</th>';
  COLS.forEach(function(col) {
    var span = col.single ? 1 : 2;
    h1 += '<th colspan="' + span + '" style="background:' + col.hdr + ';color:#fff;text-align:center;padding:10px 4px;font-size:12px;font-weight:900;letter-spacing:0.5px;border:1px solid rgba(255,255,255,0.18);">' + col.label + '</th>';
  });
  h1 += '</tr>';

  /* Başlık satırı 2 – HGO / FC */
  var h2 = '<tr>';
  COLS.forEach(function(col) {
    if (col.single) {
      h2 += '<th style="background:' + col.lt + ';color:' + col.hdr + ';text-align:center;padding:6px 4px;font-size:9px;font-weight:900;border:1px solid #E2E8F0;width:130px;">ORAN</th>';
    } else {
      h2 += '<th style="background:' + col.lt + ';color:' + col.hdr + ';text-align:center;padding:6px 4px;font-size:9px;font-weight:900;border:1px solid #E2E8F0;width:102px;">HGO</th>';
      h2 += '<th style="background:' + col.lt + ';color:' + col.hdr + ';text-align:center;padding:6px 4px;font-size:9px;font-weight:900;border:1px solid #E2E8F0;width:130px;">' + (f ? 'FORECAST' : 'FC?') + '</th>';
    }
  });
  h2 += '</tr>';

  /* Veri satırları */
  var body = '';
  rows.forEach(function(r, i) {
    var bg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFF';
    body += '<tr style="background:' + bg + ';">' +
      '<td style="text-align:center;padding:7px 4px;font-size:12px;font-weight:800;color:#374151;border:1px solid #E2E8F0;">' + (i + 1) + '</td>' +
      '<td style="text-align:center;padding:7px 4px;font-size:10px;font-weight:700;color:#64748B;border:1px solid #E2E8F0;">' + (r.kod || '') + '</td>' +
      '<td style="padding:7px 8px;font-size:11px;font-weight:700;color:#1E293B;border:1px solid #E2E8F0;line-height:1.3;">' +
        (r.b || '') +
        (r.il ? '<br><span style="font-size:9px;color:#94A3B8;font-weight:600;">' + r.il + '</span>' : '') +
      '</td>';
    COLS.forEach(function(col) {
      var raw = r[col.key];
      body += hgoCell(raw);
      if (!col.single) body += barCell(fcVal(raw));
    });
    body += '</tr>';
  });

  /* Tam şablon */
  return (
    '<div style="width:1900px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;">' +

    /* Üst başlık */
    '<div style="background:linear-gradient(135deg,#002B6B 0%,#0D1E4D 100%);padding:22px 30px;display:flex;align-items:center;justify-content:space-between;">' +
      '<div style="display:flex;align-items:center;gap:14px;">' +
        '<div style="background:#E30613;border-radius:10px;width:52px;height:52px;min-width:52px;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:900;color:#fff;flex-shrink:0;">TT</div>' +
        '<div>' +
          '<div style="color:#fff;font-size:17px;font-weight:900;line-height:1.2;">Türk Telekom</div>' +
          '<div style="color:rgba(255,255,255,0.5);font-size:10px;font-weight:700;letter-spacing:1.5px;">KUZEY ANADOLU BÖLGE</div>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:center;">' +
        '<div style="color:rgba(255,255,255,0.45);font-size:9px;font-weight:700;letter-spacing:2px;margin-bottom:5px;">RAPORLAMA DÖNEMİ</div>' +
        '<div style="color:#fff;font-size:24px;font-weight:900;letter-spacing:0.5px;">PERFORMANS MATRİS RAPORU</div>' +
        '<div style="color:rgba(255,255,255,0.45);font-size:9px;font-weight:700;letter-spacing:2px;margin-top:5px;">' + rows.length + ' Bayi · 7 Ürün</div>' +
      '</div>' +
      '<div style="text-align:right;">' +
        '<div style="color:#fff;font-size:24px;font-weight:900;">' + donem + '</div>' +
        '<div style="color:rgba(255,255,255,0.5);font-size:11px;font-weight:600;margin-top:5px;">Rapor Tarihi: ' + today + '</div>' +
        (f ? '<div style="color:#86EFAC;font-size:10px;font-weight:700;margin-top:4px;">&#9889; ' + f.d + '/' + f.t + '. gün &#183; Forecast aktif</div>' : '') +
      '</div>' +
    '</div>' +

    /* Tablo */
    '<table style="border-collapse:collapse;width:100%;table-layout:fixed;">' +
    '<colgroup>' +
      '<col style="width:46px"><col style="width:82px"><col style="width:250px">' +
      COLS.map(function(col) {
        if (col.single) return '<col style="width:130px">';
        return '<col style="width:102px"><col style="width:130px">';
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
    '<div style="background:#0F2D6B;padding:10px 30px;display:flex;justify-content:space-between;align-items:center;">' +
      '<div style="color:rgba(255,255,255,0.55);font-size:9px;font-weight:700;letter-spacing:1px;">TT KUZEY ANADOLU BÖLGE &#183; PERFORMANS MERKEZİ</div>' +
      '<div style="color:rgba(255,255,255,0.55);font-size:9px;font-weight:700;">Hedefe Birlikte &#183; ' + today + '</div>' +
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

    var elW = content.scrollWidth || content.offsetWidth || 1900;
    var elH = content.scrollHeight || content.offsetHeight;

    var donem2 = (typeof DONEM !== 'undefined' && DONEM) ? DONEM.replace('/', '') : '';
    var fname2 = 'TT_ExcelMatris_' + donem2 + '.png';

    var canvas = await captureExportImage(content, {
      scale:        1.5,
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
