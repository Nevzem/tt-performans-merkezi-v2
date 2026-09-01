/* ════════════════════════════════════════════════════════════════════
   tools/excel-to-history.js — Yıllık TTM Excel → data/history/*.json
   Kullanım:
     node tools/excel-to-history.js "C:/yol/2025 TTM.xlsx"
   Beklenen Excel yapısı (Sheet1):
     r0: ürün grubu · r1: ürün adı · r2: başlıklar
     Sabit kolonlar: Ana Bölge, Bölge, Bayi Kodu, Bayi Adı, Ana Bayi Kodu,
                     İl, Bölge Müdürü, Satış Yöneticisi, Dönem(YYYYAA)
     Ürün blokları: [Hedef, Aktivasyon, HGO, Bekleyen] × N
   Yalnız Bölge = KUZEY ANADOLU satırları alınır.
   Ürün eşlemesi (uygulamayla aynı):
     mobil = POSTPAID + PREPAID · dsl = DSL (Sabit İnternet)
     tv    = IPTV + TİVİBU UYDU · cihaz = Akıllı Cihaz + Diğer
   Kapanmış ay dosyası olduğundan forecast = HGO (ay sonu gerçekleşmesi).
   Çıktı: data/history/YYYY-AA.json (+ manifest.json periods güncellenir)
   ════════════════════════════════════════════════════════════════════ */

const fs   = require('fs');
const path = require('path');
const XLSX = require(path.join(__dirname, '..', 'js', 'vendor', 'xlsx.full.min.js'));

const BOLGE   = 'KUZEY ANADOLU';
const OUT_DIR = path.join(__dirname, '..', 'data', 'history');

const src = process.argv[2];
if (!src) { console.error('Kullanım: node tools/excel-to-history.js <xlsx-yolu>'); process.exit(1); }

const wb = XLSX.read(fs.readFileSync(src), { type: 'buffer' });
/* Kapanış paketlerinde özet sayfaları ilk sırada gelebiliyor. Geçmiş veri
   için bayi/ürün bloklarını içeren TTM BUAY sayfasını önceliklendir. */
const sheetName = wb.SheetNames.includes('TTM BUAY') ? 'TTM BUAY' : wb.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
console.log('Kaynak sayfa:', sheetName);
if (rows.length < 4) { console.error('Beklenen yapı bulunamadı (satır < 4)'); process.exit(1); }

const grpRow = rows[0], prodRow = rows[1], hdrRow = rows[2];

/* Ürün bloklarını bul: "Hedef" başlıklı kolonlar blok başlangıcıdır */
const blocks = {};   /* 'Mobil|POSTPAID' → hedefCol */
let lastG = '', lastP = '';
for (let c = 9; c < hdrRow.length; c++) {
  if (grpRow[c])  lastG = String(grpRow[c]).trim();
  if (prodRow[c]) lastP = String(prodRow[c]).trim();
  if (String(hdrRow[c] || '').trim() === 'Hedef')
    blocks[(lastG + '|' + lastP).toUpperCase()] = c;
}

function findBlock() {
  for (const name of arguments) {
    const key = Object.keys(blocks).find(k => k.includes(name.toUpperCase()));
    if (key !== undefined) return blocks[key];
  }
  return -1;
}

/* Hedef kolonu → {h: hedefCol, a: aktivasyonCol} */
const MAP = {
  post:  findBlock('POSTPAID'),
  pre:   findBlock('PREPAID'),
  dsl:   findBlock('SABIT İNTERNET|DSL', 'SABİT İNTERNET|DSL', '|DSL'),
  iptv:  findBlock('IPTV'),
  uydu:  findBlock('UYDU'),
  cihazA:findBlock('AKILLI CİHAZ', 'AKILLI CIHAZ'),
  cihazD:findBlock('CİHAZ|DİĞER', 'CIHAZ|DIĞER', '|DİĞER'),
};
console.log('Kolon eşlemesi:', JSON.stringify(MAP));
for (const k in MAP) if (MAP[k] < 0) { console.error('EKSİK ÜRÜN BLOĞU: ' + k); process.exit(1); }

const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };

/* Dönem bazında KUZEY ANADOLU bayilerini topla */
const byPeriod = {};
for (let i = 3; i < rows.length; i++) {
  const r = rows[i];
  if (!r || !r[2]) continue;
  if (String(r[1] || '').trim().toUpperCase() !== BOLGE) continue;
  const dRaw = String(r[8] || '').trim();          /* 202511 */
  if (!/^\d{6}$/.test(dRaw)) continue;
  const period = dRaw.slice(0, 4) + '-' + dRaw.slice(4);

  function prod(cols) {
    let h = 0, a = 0;
    cols.forEach(c => { h += num(r[c]); a += num(r[c + 1]); });
    const hgo = h > 0 ? Math.round(a / h * 1000) / 10 : null;
    return { hedef: Math.round(h), adet: Math.round(a), hgo: hgo,
             forecast: hgo !== null ? Math.round(hgo) : null };
  }

  (byPeriod[period] = byPeriod[period] || []).push({
    bayiKodu: String(r[2]).trim(),
    bayiAdi:  String(r[3] || '').trim(),
    il:       String(r[5] || '').trim(),
    sy:       String(r[7] || '').trim(),
    mobil: prod([MAP.post, MAP.pre]),
    dsl:   prod([MAP.dsl]),
    tv:    prod([MAP.iptv, MAP.uydu]),
    cihaz: prod([MAP.cihazA, MAP.cihazD]),
  });
}

const periods = Object.keys(byPeriod).sort();
if (!periods.length) { console.error(BOLGE + ' verisi bulunamadı.'); process.exit(1); }

/* Dönem dosyalarını yaz */
periods.forEach(p => {
  const [y, m] = p.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const doc = {
    period: p,
    reportDate: p + '-' + String(lastDay).padStart(2, '0'),
    channel: 'TTM',
    dealers: byPeriod[p],
  };
  fs.writeFileSync(path.join(OUT_DIR, p + '.json'),
    JSON.stringify(doc, null, 1) + '\n', 'utf8');
  console.log('yazıldı: ' + p + '.json (' + doc.dealers.length + ' bayi)');
});

/* Manifest'i birleştirerek güncelle (mevcut dönemler + yeniler) */
const mfPath = path.join(OUT_DIR, 'manifest.json');
let mf = { periods: [] };
try { mf = JSON.parse(fs.readFileSync(mfPath, 'utf8')); } catch (e) {}
const merged = Array.from(new Set([].concat(mf.periods || [], periods))).sort();
fs.writeFileSync(mfPath, JSON.stringify({ periods: merged }, null, 2) + '\n', 'utf8');
console.log('manifest güncellendi: ' + merged.length + ' dönem');
