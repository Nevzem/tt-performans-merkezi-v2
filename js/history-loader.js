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
var HIST2_CORRECTIONS = null;
var HIST2_CORRECTIONS_PROMISE = null;
var HIST2_CORRECTION_FILES = [
  './data/history/corrections/g01.json',
  './data/history/corrections/g02.json',
  './data/history/corrections/g03.json',
  './data/history/corrections/g04.json',
  './data/history/corrections/g05.json',
  './data/history/corrections/g06.json',
  './data/history/corrections/g07.json',
  './data/history/corrections/g08.json',
  './data/history/corrections/g09.json',
  './data/history/corrections/g10.json',
  './data/history/corrections/g11.json'
];

function hist2CorrectionProduct(hedef, adet) {
  hedef = Number(hedef) || 0;
  adet = Number(adet) || 0;
  var hgo = hedef > 0 ? Math.round(adet / hedef * 1000) / 10 : null;
  return { hedef: Math.round(hedef), adet: Math.round(adet), hgo: hgo,
           forecast: hgo !== null ? Math.round(hgo) : null };
}

function hist2ExpandCorrectionRow(r, strings) {
  var post = hist2CorrectionProduct(r[6], r[7]);
  var pre  = hist2CorrectionProduct(r[8], r[9]);
  var dsl  = hist2CorrectionProduct(r[10], r[11]);
  var iptv = hist2CorrectionProduct(r[12], r[13]);
  var uydu = hist2CorrectionProduct(r[14], r[15]);
  var ak   = hist2CorrectionProduct(r[16], r[17]);
  var dig  = hist2CorrectionProduct(r[18], r[19]);
  return {
    bayiKodu: String(r[0] || ''),
    bayiAdi: strings[r[1]] || '',
    anaBayiKodu: String(r[2] || ''),
    bolge: strings[r[3]] || '',
    il: strings[r[4]] || '',
    sy: strings[r[5]] || '',
    postpaid: post,
    prepaid: pre,
    mobil: hist2CorrectionProduct(post.hedef + pre.hedef, post.adet + pre.adet),
    dsl: dsl,
    iptv: iptv,
    uydu: uydu,
    tv: hist2CorrectionProduct(iptv.hedef + uydu.hedef, iptv.adet + uydu.adet),
    akilliCihaz: ak,
    digerCihaz: dig,
    cihaz: hist2CorrectionProduct(ak.hedef + dig.hedef, ak.adet + dig.adet)
  };
}

async function loadHistoryCorrections() {
  if (HIST2_CORRECTIONS) return HIST2_CORRECTIONS;
  if (HIST2_CORRECTIONS_PROMISE) return HIST2_CORRECTIONS_PROMISE;
  HIST2_CORRECTIONS_PROMISE = (async function() {
    try {
      var sr = await fetch('./data/history/corrections/strings.json');
      if (!sr.ok) throw new Error('correction strings HTTP ' + sr.status);
      var strings = await sr.json();
      var periods = {};
      await Promise.all(HIST2_CORRECTION_FILES.map(async function(file) {
        try {
          var resp = await fetch(file);
          if (!resp.ok) return;
          var pack = await resp.json();
          Object.keys(pack || {}).forEach(function(period) {
            var pair = pack[period] || [];
            periods[period] = {
              dealers: Array.isArray(pair[0]) ? pair[0].map(function(row) {
                return hist2ExpandCorrectionRow(row, strings);
              }) : [],
              accountDealers: Array.isArray(pair[1]) ? pair[1].map(function(row) {
                return hist2ExpandCorrectionRow(row, strings);
              }) : []
            };
          });
        } catch (e) {}
      }));
      HIST2_CORRECTIONS = periods;
    } catch (e) {
      HIST2_CORRECTIONS = {};
    }
    return HIST2_CORRECTIONS;
  })();
  return HIST2_CORRECTIONS_PROMISE;
}

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
  var corrections = await loadHistoryCorrections();
  try {
    var resp = await fetch('./data/history/' + period + '.json?_=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var j = await resp.json();
    if (j && corrections[period]) {
      j.dealers = corrections[period].dealers;
      j.accountDealers = corrections[period].accountDealers;
      j.sourceRevision = '2026-10-03-verified-closing-files';
    }
    HIST2_DATA[period] = (j && Array.isArray(j.dealers)) ? j : null;
  } catch (e) {
    if (corrections[period]) {
      var ym = period.split('-').map(Number);
      var lastDay = new Date(ym[0], ym[1], 0).getDate();
      HIST2_DATA[period] = {
        period: period,
        reportDate: period + '-' + String(lastDay).padStart(2, '0'),
        channel: 'TTM',
        dealers: corrections[period].dealers,
        accountDealers: corrections[period].accountDealers,
        sourceRevision: '2026-10-03-verified-closing-files'
      };
    } else {
      HIST2_DATA[period] = null;
    }
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
