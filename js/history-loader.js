/* ════════════════════════════════════════════════════════════════════
   js/history-loader.js  —  Sprint 18 (Geçmiş): Aylık geçmiş veri katmanı
   Kaynak: data/history/manifest.json + data/history/{YYYY-AA}.json
   GitHub Pages alt dizininde çalışması için relative path kullanılır.
   Eksik dosya HATA DEĞİLDİR — null olarak işaretlenir, ekran mesaj basar.
   Saf hesap fonksiyonları (histCalc*) fetch'ten bağımsızdır; node ile
   birim test edilebilir.
   ════════════════════════════════════════════════════════════════════ */

/* ─── STATE ───────────────────────────────────────────────────────── */
var HIST2_MANIFEST = null;   /* { periods: ["2025-01", ...] }             */
var HIST2_DATA     = {};     /* period → dosya JSON'u | null (eksik)      */
var HIST2_LOADED   = false;  /* loadAllHistory tamamlandı mı              */
var HIST2_LOADING  = false;

var HIST2_PRODS = [
  { key: 'mobil', label: 'Mobil' },
  { key: 'dsl',   label: 'DSL'   },
  { key: 'tv',    label: 'TV'    },
  { key: 'cihaz', label: 'Cihaz' },
];

/* ─── YÜKLEYİCİLER ───────────────────────────────────────────────── */

async function loadHistoryManifest() {
  if (HIST2_MANIFEST) return HIST2_MANIFEST;
  try {
    var resp = await fetch('./data/history/manifest.json?_=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var j = await resp.json();
    var periods = Array.isArray(j.periods) ? j.periods.slice() : [];
    periods = periods.filter(function(p) { return /^\d{4}-\d{2}$/.test(p); }).sort();
    HIST2_MANIFEST = { periods: periods };
  } catch (e) {
    HIST2_MANIFEST = { periods: [] };
  }
  return HIST2_MANIFEST;
}

async function loadHistoryPeriod(period) {
  if (period in HIST2_DATA) return HIST2_DATA[period];
  try {
    var resp = await fetch('./data/history/' + period + '.json?_=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var j = await resp.json();
    HIST2_DATA[period] = (j && Array.isArray(j.dealers)) ? j : null;
  } catch (e) {
    HIST2_DATA[period] = null;   /* eksik dosya = sessizce null */
  }
  return HIST2_DATA[period];
}

async function loadAllHistory() {
  if (HIST2_LOADED || HIST2_LOADING) return;
  HIST2_LOADING = true;
  try {
    var mf = await loadHistoryManifest();
    await Promise.all(mf.periods.map(function(p) { return loadHistoryPeriod(p); }));
    HIST2_LOADED = true;
  } finally {
    HIST2_LOADING = false;
  }
}

/* ─── SAF HESAP YARDIMCILARI (test edilebilir) ───────────────────── */

/* periodMap içinden bayinin dönem kayıtlarını döndürür:
   [{ period, dealer }] — dönem sırasına göre artan */
function histCalcDealerHistory(periodMap, bayiKodu) {
  var out = [];
  Object.keys(periodMap).sort().forEach(function(p) {
    var doc = periodMap[p];
    if (!doc || !doc.dealers) return;
    for (var i = 0; i < doc.dealers.length; i++) {
      if (String(doc.dealers[i].bayiKodu) === String(bayiKodu)) {
        out.push({ period: p, dealer: doc.dealers[i] });
        break;
      }
    }
  });
  return out;
}

/* YTD = yıl başından, o yıl için mevcut son aya kadar Σadet / Σhedef.
   Dönüş: { months:[...], prods: { mobil:{hedef,adet,hgo,lastFc}, ... },
            toplamHedef, toplamAdet, toplamHgo } | null (hiç ay yoksa) */
function histCalcYTD(periodMap, bayiKodu, year) {
  var hist = histCalcDealerHistory(periodMap, bayiKodu)
    .filter(function(h) { return h.period.slice(0, 4) === String(year); });
  if (!hist.length) return null;

  var prods = {}, tH = 0, tA = 0;
  HIST2_PRODS.forEach(function(pm) {
    var h = 0, a = 0, lastFc = null;
    hist.forEach(function(x) {
      var d = x.dealer[pm.key];
      if (!d) return;
      h += d.hedef || 0;
      a += d.adet  || 0;
      if (d.forecast !== undefined && d.forecast !== null) lastFc = d.forecast;
    });
    prods[pm.key] = {
      hedef: h, adet: a,
      hgo: h > 0 ? Math.round(a / h * 1000) / 10 : null,
      lastFc: lastFc,
    };
    tH += h; tA += a;
  });

  return {
    months: hist.map(function(x) { return x.period; }),
    prods: prods,
    toplamHedef: tH,
    toplamAdet:  tA,
    toplamHgo:   tH > 0 ? Math.round(tA / tH * 1000) / 10 : null,
  };
}

/* YoY = currentPeriod (YYYY-AA) ile bir önceki yılın aynı ayı.
   Dönüş: { period, prevPeriod, prods: { mobil: {curr, prev, dHgo, dAdet,
   dHedef, dFc} | null(prev yok) } } — prev dosyası hiç yoksa prevMissing:true */
function histCalcYoY(periodMap, bayiKodu, currentPeriod) {
  var y = parseInt(currentPeriod.slice(0, 4), 10);
  var prevPeriod = (y - 1) + currentPeriod.slice(4);

  function grab(period) {
    var doc = periodMap[period];
    if (!doc || !doc.dealers) return null;
    for (var i = 0; i < doc.dealers.length; i++)
      if (String(doc.dealers[i].bayiKodu) === String(bayiKodu)) return doc.dealers[i];
    return null;
  }

  var curr = grab(currentPeriod);
  var prev = grab(prevPeriod);
  if (!curr) return null;

  var prods = {};
  HIST2_PRODS.forEach(function(pm) {
    var c = curr[pm.key], p = prev ? prev[pm.key] : null;
    if (!c) { prods[pm.key] = null; return; }
    prods[pm.key] = {
      curr: c,
      prev: p || null,
      dHgo:   (p && c.hgo   != null && p.hgo   != null) ? Math.round((c.hgo - p.hgo) * 10) / 10 : null,
      dAdet:  (p && c.adet  != null && p.adet  != null) ? c.adet  - p.adet  : null,
      dHedef: (p && c.hedef != null && p.hedef != null) ? c.hedef - p.hedef : null,
      dFc:    (p && c.forecast != null && p.forecast != null) ? c.forecast - p.forecast : null,
    };
  });

  return { period: currentPeriod, prevPeriod: prevPeriod,
           prevMissing: !prev, prods: prods };
}

/* ─── UYGULAMA SARMALAYICILARI (HIST2_DATA üstünde) ──────────────── */

function getDealerHistory(bayiKodu)        { return histCalcDealerHistory(HIST2_DATA, bayiKodu); }
function getDealerYTD(bayiKodu, year)      { return histCalcYTD(HIST2_DATA, bayiKodu, year); }
function getDealerYoY(bayiKodu, period)    { return histCalcYoY(HIST2_DATA, bayiKodu, period); }
