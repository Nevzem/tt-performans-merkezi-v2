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
