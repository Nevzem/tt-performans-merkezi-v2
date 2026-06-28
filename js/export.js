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

function _dexpCls(g) {
  if (g === null || g === undefined)
    return { bg:'#F4F6FA', border:'#C8D0E0', text:'#8C96A8', badge:'Veri Yok', tBg:'rgba(0,0,0,0.06)' };
  if (g >= 100) return { bg:'#d1fae5', border:'#15803d', text:'#14532d', badge:'Hedefte ✓',  tBg:'#bbf7d0' };
  if (g >= 90)  return { bg:'#dcfce7', border:'#16a34a', text:'#166534', badge:'İyi',         tBg:'#bbf7d0' };
  if (g >= 80)  return { bg:'#fef9c3', border:'#ca8a04', text:'#854d0e', badge:'Orta',        tBg:'#fde68a' };
  if (g >= 70)  return { bg:'#ffedd5', border:'#f97316', text:'#9a3412', badge:'Düşük',       tBg:'#fed7aa' };
  return         { bg:'#fee2e2', border:'#dc2626', text:'#991b1b', badge:'Kritik ⚠',        tBg:'#fecaca' };
}

function _dexpTag(text) {
  return '<span style="background:rgba(255,255,255,0.13);color:rgba(255,255,255,0.88);' +
    'padding:4px 11px;border-radius:20px;font-size:9.5px;font-weight:700;white-space:nowrap;">' + text + '</span>';
}

function _dexpMetric(label, val, valColor) {
  return '<div style="text-align:center;">' +
    '<div style="font-size:15px;font-weight:900;color:' + valColor + ';line-height:1.1;">' + val + '</div>' +
    '<div style="font-size:7.5px;font-weight:700;color:#9BA8BD;text-transform:uppercase;letter-spacing:0.6px;margin-top:3px;">' + label + '</div>' +
  '</div>';
}

function _buildDetayExportHTML(bayi, kod, f, kalanGun) {
  var GROUPS = [
    { label:'📱 Toplam Mobil', keys:['Toplam Mobil'] },
    { label:'🌐 DSL',          keys:['DSL'] },
    { label:'📺 TV',           keys:['Toplam TV','IPTV','Uydu'] },
    { label:'📦 Cihaz',        keys:['Toplam Cihaz','Akıllı Cihaz'] },
  ];
  var prods = bayi.prods || {};
  var donem = (typeof DONEM !== 'undefined' && DONEM) ? DONEM : '';

  var groupData = [];
  GROUPS.forEach(function(g) {
    for (var i = 0; i < g.keys.length; i++) {
      var pv = prods[g.keys[i]];
      if (pv && (pv.h > 0 || pv.a > 0)) {
        groupData.push({ label: g.label, key: g.keys[i], val: pv }); break;
      }
    }
  });

  /* Özet hesapla */
  var allG = groupData.filter(function(g) { return g.val.g !== null && g.val.g !== undefined; });
  var best  = allG.length ? allG.reduce(function(a,b){ return a.val.g >= b.val.g ? a : b; }) : null;
  var worst = allG.length ? allG.reduce(function(a,b){ return a.val.g <= b.val.g ? a : b; }) : null;
  var avgG  = allG.length ? allG.reduce(function(s,g){ return s + g.val.g; }, 0) / allG.length : 0;
  var opS   = avgG >= 95 ? { txt:'Güçlü', c:'#16a34a' }
            : avgG >= 80 ? { txt:'Normal', c:'#d97706' }
            : avgG >= 70 ? { txt:'Riskli', c:'#f97316' }
            :              { txt:'Kritik', c:'#dc2626' };

  /* Ürün kartları */
  var prodCards = '';
  groupData.forEach(function(g) {
    var pv = g.val;
    var gv = (pv.h > 0) ? (pv.a / pv.h * 100) : pv.g;
    if (gv === null || gv === undefined) gv = pv.g;
    var c      = _dexpCls(gv);
    var kalan  = pv.h > 0 ? Math.max(Math.round(pv.h - pv.a), 0) : null;
    var gunluk = (kalanGun && kalanGun > 0 && kalan !== null && kalan > 0) ? Math.ceil(kalan / kalanGun) : null;
    var fcv    = (f && gv !== null) ? Math.round(gv * f.k) : null;
    var fcCls  = fcv !== null ? _dexpCls(fcv) : null;

    /* Delta (önceki rapor) */
    var prevDet = (typeof PREV_DETAY !== 'undefined' && PREV_DETAY && PREV_DETAY.bayiler) ? PREV_DETAY.bayiler[typeof detayKod !== 'undefined' ? detayKod : ''] : null;
    var prevPv  = prevDet && prevDet.prods ? prevDet.prods[g.key] : null;
    var deltaHTML = '';
    if (prevPv && prevPv.h > 0 && pv.h > 0) {
      var prevG = prevPv.a / prevPv.h * 100;
      var delta = gv - prevG;
      var dArrow = delta > 0.05 ? '▲' : delta < -0.05 ? '▼' : '—';
      var dCol   = delta > 0.05 ? '#16a34a' : delta < -0.05 ? '#dc2626' : '#9BA8BD';
      deltaHTML = '<div style="font-size:9.5px;font-weight:700;color:' + dCol + ';margin-top:6px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.08);">' +
        'Önceki rapora göre: ' + dArrow + ' %' + Math.abs(delta).toFixed(1) + '</div>';
    }

    prodCards +=
      '<div style="background:' + c.bg + ';border-left:4px solid ' + c.border + ';border-radius:10px;padding:14px 15px;margin-bottom:10px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
          '<div style="font-size:13px;font-weight:800;color:#1a2744;">' + g.label + '</div>' +
          '<div style="display:flex;align-items:center;gap:7px;">' +
            '<div style="font-size:20px;font-weight:900;color:' + c.text + ';">%' + (gv !== null ? gv.toFixed(1) : '—') + '</div>' +
            '<div style="font-size:9px;font-weight:800;color:' + c.text + ';background:' + c.tBg + ';padding:3px 8px;border-radius:7px;">' + c.badge + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(' + (fcv !== null ? 4 : 3) + ',1fr);gap:8px;">' +
          _dexpMetric('Hedef',      pv.h !== undefined ? pv.h.toLocaleString('tr-TR') : '—', '#1a2744') +
          _dexpMetric('Adet',       pv.a !== undefined ? pv.a.toLocaleString('tr-TR') : '—', '#1a2744') +
          (fcv !== null ? _dexpMetric('Forecast', '%' + fcv, fcCls ? fcCls.text : c.text) : '') +
          _dexpMetric('Kalan',      kalan !== null ? kalan.toLocaleString('tr-TR') : '—', c.text) +
        '</div>' +
        (gunluk !== null ?
          '<div style="margin-top:8px;padding:5px 10px;background:rgba(0,0,0,0.05);border-radius:6px;font-size:10px;font-weight:700;color:' + c.text + ';">' +
            '⏱ Günlük gereken: <b>' + gunluk + ' adet/gün</b>' + (kalanGun ? ' (' + kalanGun + ' gün kaldı)' : '') +
          '</div>' : '') +
        deltaHTML +
      '</div>';
  });

  /* Tam template */
  return (
    '<div style="width:440px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;color:#1a2744;">' +

    /* Header */
    '<div style="background:linear-gradient(145deg,#002B6B 0%,#0A1A3D 65%,#001845 100%);padding:26px 22px 22px;">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">' +
        '<div style="background:#E30613;border-radius:10px;width:48px;height:48px;min-width:48px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:17px;">TT</div>' +
        '<div style="flex:1;">' +
          '<div style="color:#fff;font-size:15px;font-weight:800;">Türk Telekom</div>' +
          '<div style="color:rgba(255,255,255,0.5);font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">KUZEY ANADOLU BÖLGE</div>' +
        '</div>' +
        '<div style="color:rgba(255,255,255,0.5);font-size:10px;font-weight:700;white-space:nowrap;">' + donem + '</div>' +
      '</div>' +
      '<div style="color:rgba(255,255,255,0.4);font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">BAYİ DETAY PERFORMANS KARTI</div>' +
      '<div style="color:#fff;font-size:21px;font-weight:900;line-height:1.2;margin-bottom:12px;">' + (bayi.b || kod) + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;">' +
        _dexpTag(kod || '—') +
        (bayi.il ? _dexpTag(bayi.il) : '') +
        (bayi.sy ? _dexpTag('SY: ' + bayi.sy) : '') +
      '</div>' +
    '</div>' +

    /* Özet */
    '<div style="background:#F4F7FD;padding:14px 18px;border-bottom:2px solid #E4EAF5;">' +
      '<div style="font-size:7.5px;font-weight:800;color:#6B87AA;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">OPERASYON ÖZETİ</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr ' + (best ? '1fr' : '') + (worst ? ' 1fr' : '') + ';gap:12px;">' +
        '<div><div style="font-size:8px;color:#9BA8BD;font-weight:600;margin-bottom:2px;">Durum</div>' +
          '<div style="font-size:14px;font-weight:900;color:' + opS.c + ';">' + opS.txt + '</div></div>' +
        '<div><div style="font-size:8px;color:#9BA8BD;font-weight:600;margin-bottom:2px;">Ort. HGO</div>' +
          '<div style="font-size:14px;font-weight:900;color:' + _dexpCls(avgG).text + ';">%' + avgG.toFixed(1) + '</div></div>' +
        (best  ? '<div><div style="font-size:8px;color:#9BA8BD;font-weight:600;margin-bottom:2px;">En Güçlü</div>' +
          '<div style="font-size:11px;font-weight:800;color:#16a34a;">' + best.label + '<br><span style="font-size:13px;">%' + best.val.g.toFixed(1) + '</span></div></div>' : '') +
        (worst ? '<div><div style="font-size:8px;color:#9BA8BD;font-weight:600;margin-bottom:2px;">En Zayıf</div>' +
          '<div style="font-size:11px;font-weight:800;color:' + _dexpCls(worst.val.g).text + ';">' + worst.label + '<br><span style="font-size:13px;">%' + worst.val.g.toFixed(1) + '</span></div></div>' : '') +
      '</div>' +
      (worst && worst.val.g < 90 ?
        '<div style="background:#FFF3CD;border:1px solid #FFC107;border-radius:8px;padding:8px 12px;margin-top:10px;font-size:10px;font-weight:700;color:#856404;">' +
          '⚡ Kritik Aksiyon: ' + worst.label.replace(/^[^\w\sçğıöşüÇĞİÖŞÜ]*/,'') + ' satışına odaklanılmalı' +
        '</div>' : '') +
    '</div>' +

    /* Ürün kartları */
    '<div style="padding:16px 16px 10px;">' +
      '<div style="font-size:7.5px;font-weight:800;color:#6B87AA;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;">ÜRÜN BAZLI PERFORMANS</div>' +
      prodCards +
    '</div>' +

    /* Footer */
    '<div style="background:#002B6B;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">' +
      '<div style="color:rgba(255,255,255,0.6);font-size:9px;font-weight:700;">Hedefe Birlikte</div>' +
      '<div style="width:30px;height:30px;background:#E30613;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#fff;">TT</div>' +
      '<div style="color:rgba(255,255,255,0.6);font-size:9px;font-weight:700;">' + new Date().toLocaleDateString('tr-TR') + '</div>' +
    '</div>' +
    '</div>'
  );
}

async function downloadDetayCardPNG() {
  var btn   = document.getElementById('fbar-dl-btn');
  var valEl = btn ? btn.querySelector('.fbar-chip-val') : null;
  var orig  = valEl ? valEl.textContent : 'Oluştur ↗';
  if (btn)   btn.disabled = true;
  if (valEl) valEl.textContent = '⏳';

  var cloneWrapper = null;
  try {
    var kod  = typeof detayKod !== 'undefined' ? detayKod : null;
    var bayi = (kod && typeof DETAY !== 'undefined' && DETAY && DETAY.bayiler) ? DETAY.bayiler[kod] : null;
    if (!bayi) throw new Error('Bayi verisi bulunamadı');

    var f    = (typeof fc === 'function') ? fc() : null;
    var _gA  = (typeof SYDATA !== 'undefined' && SYDATA && SYDATA.calismaGun)  || 0;
    var _gB  = (typeof SYDATA !== 'undefined' && SYDATA && SYDATA.calisilanGun) || 0;
    var ayGun    = Math.max(_gA, _gB);
    var gecenGun = Math.min(_gA, _gB);
    var kalanGun = (ayGun > 0 && gecenGun > 0 && ayGun > gecenGun) ? ayGun - gecenGun : null;

    var tpl     = document.createElement('div');
    tpl.innerHTML = _buildDetayExportHTML(bayi, kod, f, kalanGun);
    var content = tpl.firstChild;

    var wrapper = document.createElement('div');
    wrapper.className = 'export-clone';
    wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;pointer-events:none;overflow:visible;';
    wrapper.appendChild(content);
    document.body.appendChild(wrapper);
    cloneWrapper = wrapper;

    await new Promise(function(r) { requestAnimationFrame(function() { setTimeout(r, 80); }); });

    var donem   = (typeof DONEM !== 'undefined' && DONEM) ? DONEM.replace('/', '') : '';
    var bayiKey = (bayi.b || kod || '').replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/g, '').slice(0, 15);
    var fname   = 'TT_BayiDetay_' + bayiKey + '_' + donem + '.png';

    var canvas = await captureExportImage(content);
    cleanupExportClone(cloneWrapper); cloneWrapper = null;
    _openSharePreview(canvas.toDataURL('image/png'), fname);

  } catch (e) {
    alert('Görsel oluşturma hatası: ' + e.message);
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
