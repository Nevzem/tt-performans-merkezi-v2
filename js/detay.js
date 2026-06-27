/* ════════════════════════════════════════════
   js/detay.js — Sprint 5: Detay Çekmecesi
   Bayi / Personel tıklama → slide-up panel
   ════════════════════════════════════════════ */

/* ─── DOM oluşturma (lazy) ─── */
function _ensureDetayDOM() {
  if (document.getElementById('detay-overlay')) return;
  var o = document.createElement('div');
  o.id = 'detay-overlay'; o.className = 'detay-overlay';
  o.setAttribute('onclick', 'closeDetay()');
  var p = document.createElement('div');
  p.id = 'detay-panel'; p.className = 'detay-panel';
  document.body.appendChild(o);
  document.body.appendChild(p);
}

/* ─── API ─── */
function openDetay(type, id, id2) {
  _ensureDetayDOM();
  var panel = document.getElementById('detay-panel');
  panel.innerHTML = _detayHTML(type, id, id2);
  document.getElementById('detay-overlay').classList.add('open');
  panel.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDetay() {
  var o = document.getElementById('detay-overlay');
  var p = document.getElementById('detay-panel');
  if (o) o.classList.remove('open');
  if (p) p.classList.remove('open');
  document.body.style.overflow = '';
}

/* Convenience: home.js chgRow → kod doğrudan geçilir */
function _detayFromB(b) {
  var m = b && b.match(/^(\d+)/);
  if (m) openDetay('bayi', m[1]);
}

function _detayPers(p, b) { openDetay('pers', p, b); }

/* ─── Yardımcılar ─── */
function _dKalanGun() {
  if (typeof SYDATA !== 'undefined' && SYDATA && SYDATA.calismaGun && SYDATA.calisilanGun) {
    var ay = Math.max(SYDATA.calismaGun, SYDATA.calisilanGun);
    var gc = Math.min(SYDATA.calismaGun, SYDATA.calisilanGun);
    if (ay > gc) return ay - gc;
  }
  var dn = document.getElementById('day-now');
  var dt = document.getElementById('day-total');
  if (dn && dt && dn.value && dt.value) {
    var k = parseInt(dt.value) - parseInt(dn.value);
    if (k > 0) return k;
  }
  return null;
}

var _DICONS = {
  'Toplam Mobil':'📱','Postpaid':'📄','Faturalı':'📄','Prepaid':'📲','Faturasız':'📲',
  'DSL':'🌐','Evde İnternet':'🌐','Toplam TV':'📺','IPTV':'📺','Uydu':'📡',
  'Akıllı Cihaz':'📦','Toplam Cihaz':'📦','Cihaz':'📦','Diğer Cihaz':'🔌'
};
function _dIcon(pk) { return _DICONS[pk] || '📊'; }
function _dCls(g)   { return g >= 100 ? 'g' : g >= 70 ? 'y' : 'r'; }

/* ─── Router ─── */
function _detayHTML(type, id, id2) {
  if (type === 'bayi') return _detayBayiHTML(id);
  if (type === 'pers') return _detayPersHTML(id, id2);
  return _detayNoData('?');
}

/* ══════════════════════════════════════════════
   BAYİ DETAY
   ══════════════════════════════════════════════ */
function _detayBayiHTML(kod) {
  var det     = (typeof DETAY     !== 'undefined' && DETAY     && DETAY.bayiler)     ? DETAY.bayiler[kod]     : null;
  var prevDet = (typeof PREV_DETAY !== 'undefined' && PREV_DETAY && PREV_DETAY.bayiler) ? PREV_DETAY.bayiler[kod] : null;
  var isEDM   = false;

  /* EDM fallback */
  if (!det && typeof EDM_DATA !== 'undefined' && EDM_DATA && EDM_DATA.bayi) {
    var ep = {}, em = null;
    Object.keys(EDM_DATA.bayi).forEach(function(pk) {
      (EDM_DATA.bayi[pk] || []).forEach(function(r) {
        var m = r.b && r.b.match(/^(\d+)/);
        if (m && m[1] === kod) {
          if (!em) em = r;
          ep[pk] = { h: r.h || 0, a: r.a || 0, g: r.g || 0 };
        }
      });
    });
    if (em) { det = { b: em.p, il: em.il || '', sy: em.sy || '', prods: ep }; isEDM = true; }
  }

  if (!det) return _detayNoData('Bayi #' + kod);

  var kalanGun = _dKalanGun();
  var prods    = det.prods || {};
  var prodKeys = Object.keys(prods).filter(function(pk) { return prods[pk] && prods[pk].h > 0; });

  /* Header */
  var html = '<div class="detay-hdr">' +
    '<div class="detay-hdr-row">' +
      '<div class="detay-hdr-name">' + (det.b || kod) + '</div>' +
      '<button class="detay-close" onclick="closeDetay()">✕</button>' +
    '</div>' +
    '<div class="detay-hdr-meta">' +
      (det.il  ? '<span>' + det.il + '</span>' : '') +
      (det.sy  ? '<span>' + det.sy + '</span>' : '') +
      (isEDM   ? '<span class="detay-edm-badge">EDM</span>' : '') +
      ((typeof DONEM !== 'undefined' && DONEM) ? '<span>' + DONEM + '</span>' : '') +
    '</div>' +
  '</div>';

  /* Ürün Performansı */
  if (prodKeys.length) {
    html += '<div class="detay-section">' +
      '<div class="detay-sec-title">Ürün Performansı</div>';
    prodKeys.forEach(function(pk) {
      var pv = prods[pk];
      var g  = pv.a / pv.h * 100;
      var w  = Math.min(g, 100);
      var c  = _dCls(g);
      var kalan  = Math.max(Math.round(pv.h - pv.a), 0);
      var gunluk = (kalanGun && kalanGun > 0 && kalan > 0) ? Math.ceil(kalan / kalanGun) : null;
      html += '<div class="detay-prod-row">' +
        '<div class="detay-prod-lbl">' + _dIcon(pk) + ' ' + pk + '</div>' +
        '<div class="detay-prod-nums">' +
          '<span class="dp-n">H:' + pv.h + '</span>' +
          '<span class="dp-n">A:' + pv.a + '</span>' +
          '<span class="dp-n dp-k">K:' + kalan + (gunluk ? ' <small>(' + gunluk + '/gün)</small>' : '') + '</span>' +
        '</div>' +
        '<div class="detay-bar-row">' +
          '<div class="detay-bar-bg"><div class="detay-bar-fill dp-' + c + '" style="width:' + w + '%"></div></div>' +
          '<span class="chip ' + c + '" style="font-size:10px;padding:1px 5px;min-width:38px;text-align:center">%' + g.toFixed(1) + '</span>' +
        '</div>' +
      '</div>';
    });
    html += '</div>';
  }

  /* Dönem Karşılaştırma */
  if (prevDet && prevDet.prods) {
    var kRows = '';
    prodKeys.forEach(function(pk) {
      var cp = prods[pk], pp = prevDet.prods[pk];
      if (!cp || !pp || !pp.h || !cp.h) return;
      var cur   = cp.a / cp.h * 100;
      var prv   = pp.a / pp.h * 100;
      var delta = cur - prv;
      var dc = delta >  0.05 ? 'hd-g' : delta < -0.05 ? 'hd-r' : 'hd-y';
      var ds = delta >  0.05 ? '▲'    : delta < -0.05 ? '▼'    : '—';
      kRows += '<div class="detay-kiyas-row">' +
        '<span class="detay-kiyas-pk">' + _dIcon(pk) + ' ' + pk + '</span>' +
        '<span class="detay-kiyas-prv">%' + prv.toFixed(1) + '</span>' +
        '<span class="detay-kiyas-delta ' + dc + '">' + ds + '%' + Math.abs(delta).toFixed(1) + '</span>' +
        '<span class="detay-kiyas-cur">%' + cur.toFixed(1) + '</span>' +
      '</div>';
    });
    if (kRows) {
      html += '<div class="detay-section">' +
        '<div class="detay-sec-title">Dönem Karşılaştırma</div>' +
        '<div class="detay-kiyas-hdr">' +
          '<span></span><span>Önceki</span><span>Δ</span><span>Bu Ay</span>' +
        '</div>' + kRows + '</div>';
    }
  }

  return html;
}

/* ══════════════════════════════════════════════
   PERSONEL DETAY
   ══════════════════════════════════════════════ */
function _detayPersHTML(persName, bayiName) {
  var prods = (typeof PRODS !== 'undefined' && PRODS && PRODS.pers) ? PRODS.pers : [];
  var prodMap = {};
  prods.forEach(function(p) {
    var recs = (typeof DATA !== 'undefined' && DATA.pers && DATA.pers[p.key]) || [];
    recs.forEach(function(r) {
      if (r.p === persName && (!bayiName || r.b === bayiName)) {
        prodMap[p.key] = { g: r.g || 0 };
      }
    });
  });

  var prodKeys = Object.keys(prodMap).filter(function(pk) { return prodMap[pk].g != null; });
  if (!prodKeys.length) return _detayNoData(persName);

  var maxG = Math.max.apply(null, prodKeys.map(function(pk) { return prodMap[pk].g; }));

  var html = '<div class="detay-hdr">' +
    '<div class="detay-hdr-row">' +
      '<div class="detay-hdr-name">' + persName + '</div>' +
      '<button class="detay-close" onclick="closeDetay()">✕</button>' +
    '</div>' +
    '<div class="detay-hdr-meta">' +
      (bayiName ? '<span>' + bayiName + '</span>' : '') +
      ((typeof DONEM !== 'undefined' && DONEM) ? '<span>' + DONEM + '</span>' : '') +
    '</div>' +
  '</div>';

  html += '<div class="detay-section">' +
    '<div class="detay-sec-title">Ürün HGO Performansı</div>';
  prodKeys.forEach(function(pk) {
    var g = prodMap[pk].g;
    var w = maxG > 0 ? Math.min(g / maxG * 100, 100) : 0;
    var c = _dCls(g);
    html += '<div class="detay-prod-row">' +
      '<div class="detay-prod-lbl">' + _dIcon(pk) + ' ' + pk + '</div>' +
      '<div class="detay-bar-row">' +
        '<div class="detay-bar-bg"><div class="detay-bar-fill dp-' + c + '" style="width:' + w + '%"></div></div>' +
        '<span class="chip ' + c + '" style="font-size:10px;padding:1px 5px;min-width:38px;text-align:center">%' + g.toFixed(1) + '</span>' +
      '</div>' +
    '</div>';
  });
  html += '</div>';

  return html;
}

/* ─── Veri yok ─── */
function _detayNoData(label) {
  return '<div class="detay-hdr">' +
    '<div class="detay-hdr-row">' +
      '<div class="detay-hdr-name">' + label + '</div>' +
      '<button class="detay-close" onclick="closeDetay()">✕</button>' +
    '</div>' +
  '</div>' +
  '<div class="detay-empty">Detay verisi bulunamadı.<br><small>Excel yüklendikten sonra tekrar deneyin.</small></div>';
}
