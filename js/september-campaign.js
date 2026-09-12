/* Kuzey Anadolu TTM Mağaza Müdürleri — Eylül 2026 Performans Kampanyası
 * Müdürler Ligi ve Kupa Bende modüllerinden tamamen bağımsızdır.
 */
var SEP_CAMPAIGN_EXPECTED_DEALERS = 24;
var SEP_CAMPAIGN_RULES = [
  { key: 'Toplam Mobil', label: 'Mobil', weight: 3, icon: '▯' },
  { key: 'DSL', label: 'DSL', weight: 4, icon: '⌁' },
  { key: 'IPTV', label: 'IP TV', weight: 2, icon: '▣' },
  { key: 'Uydu', label: 'Uydu TV', weight: 1, icon: '◉' },
  { key: 'Akıllı Cihaz', label: 'Cihaz', weight: 3, icon: '⌁' }
];

function sepCampaignNum(value, decimals) {
  if (value == null || !isFinite(value)) return '—';
  return Number(value).toLocaleString('tr-TR', {
    minimumFractionDigits: decimals || 0,
    maximumFractionDigits: decimals || 0
  });
}
function sepCampaignEscape(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
  });
}
function sepCampaignProductPoints(metric, rule) {
  var hgo = metric && isFinite(Number(metric.g)) ? Number(metric.g) : 0;
  if (rule.key === 'Akıllı Cihaz') return hgo > 100 ? hgo * rule.weight : 0;
  return hgo >= 90 ? hgo * rule.weight : 0;
}
function sepCampaignDealerScore(dealer) {
  if (!dealer || !dealer.prods) return null;
  var breakdown = {}, total = 0;
  SEP_CAMPAIGN_RULES.forEach(function (rule) {
    var metric = dealer.prods[rule.key] || null;
    var points = sepCampaignProductPoints(metric, rule);
    breakdown[rule.key] = { hgo: metric ? Number(metric.g || 0) : 0, points: points };
    total += points;
  });
  var dsl = dealer.prods.DSL || {}, iptv = dealer.prods.IPTV || {};
  var ipDsl = Number(dsl.a || 0) > 0 ? Number(iptv.a || 0) / Number(dsl.a) * 100 : 0;
  var mobile = dealer.prods['Toplam Mobil'] || {};
  var mobileBonus = Math.max(0, Math.floor((Number(mobile.a || 0) - 300) / 50)) * 5;
  total += ipDsl + mobileBonus;
  return {
    total: Math.round(total * 10) / 10,
    ratio: Math.round(ipDsl * 10) / 10,
    bonus: mobileBonus,
    breakdown: breakdown
  };
}
function sepCampaignRows(source) {
  var dealers = source && source.bayiler ? source.bayiler : {};
  return Object.keys(dealers).map(function (code) {
    var dealer = dealers[code], score = sepCampaignDealerScore(dealer);
    return score ? {
      code: String(code), name: dealer.b || '—', city: dealer.il || '', score: score
    } : null;
  }).filter(Boolean).sort(function (a, b) {
    return b.score.total - a.score.total ||
      b.score.breakdown['Akıllı Cihaz'].hgo - a.score.breakdown['Akıllı Cihaz'].hgo ||
      b.score.breakdown.DSL.hgo - a.score.breakdown.DSL.hgo ||
      a.code.localeCompare(b.code, 'tr');
  }).slice(0, SEP_CAMPAIGN_EXPECTED_DEALERS);
}
function sepCampaignPreviousMap() {
  var rows = (typeof PREV_DETAY !== 'undefined' && PREV_DETAY && PREV_DETAY.bayiler)
    ? sepCampaignRows(PREV_DETAY) : [];
  var map = {};
  rows.forEach(function (row, index) { map[row.code] = { rank: index + 1, total: row.score.total }; });
  return map;
}
function sepCampaignDelta(value, kind) {
  if (value == null) return '<span class="sc-delta sc-none">—</span>';
  if (Math.abs(value) < 0.05) return '<span class="sc-delta sc-flat">— 0</span>';
  var positive = value > 0;
  return '<span class="sc-delta ' + (positive ? 'sc-up' : 'sc-down') + '">' +
    (positive ? '▲ +' : '▼ -') + sepCampaignNum(Math.abs(value), kind === 'point' ? 1 : 0) + '</span>';
}
function sepCampaignBreakdownTitle(row) {
  var parts = SEP_CAMPAIGN_RULES.map(function (rule) {
    var value = row.score.breakdown[rule.key];
    return rule.label + ': HGO %' + sepCampaignNum(value.hgo, 1) + ' → ' + sepCampaignNum(value.points, 1) + ' puan';
  });
  parts.push('IPTV/DSL: %' + sepCampaignNum(row.score.ratio, 1));
  parts.push('Mobil bonus: +' + sepCampaignNum(row.score.bonus, 0));
  return parts.join(' | ');
}
function sepCampaignRow(row, index, previousMap) {
  var previous = previousMap[row.code];
  var pointDelta = previous ? row.score.total - previous.total : null;
  var rankDelta = previous ? previous.rank - (index + 1) : null;
  var rank = index + 1, podium = rank <= 4 ? ' sc-podium sc-podium-' + rank : '';
  return '<div class="sc-row' + podium + '" title="' + sepCampaignEscape(sepCampaignBreakdownTitle(row)) + '">' +
    '<div class="sc-rank"><b>' + rank + '</b></div>' +
    '<div class="sc-code">' + sepCampaignEscape(row.code) + '</div>' +
    '<div class="sc-dealer"><strong>' + sepCampaignEscape(row.name) + '</strong><small>' + sepCampaignEscape(row.city) + '</small></div>' +
    '<div class="sc-score">' + sepCampaignNum(row.score.total, 1) + '</div>' +
    '<div>' + sepCampaignDelta(pointDelta, 'point') + '</div>' +
    '<div>' + sepCampaignDelta(rankDelta, 'rank') + '</div>' +
  '</div>';
}
function sepCampaignUpdateLabel() {
  var now = new Date();
  return now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }) +
    ' · ' + now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}
function sepCampaignRuleChips() {
  return SEP_CAMPAIGN_RULES.map(function (rule) {
    return '<span><b>' + rule.label + '</b> ×' + rule.weight + '</span>';
  }).join('') + '<span><b>IPTV / DSL</b> ×1</span>';
}
function renderSeptemberCampaign() {
  var cards = document.getElementById('cards');
  var rows = sepCampaignRows(typeof DETAY !== 'undefined' ? DETAY : null);
  var previousMap = sepCampaignPreviousMap();
  cards.className = 'cards single sc-page';
  cards.style.maxWidth = '1120px';
  cards.innerHTML =
    '<div class="sc-actions"><div><b>24 bayi için bağımsız kampanya alanı</b><small>Günlük değişimler için Ayarlar’dan önceki raporu yükleyin.</small></div><button type="button" onclick="downloadSeptemberCampaignPNG()">Yüksek Kalite Görsel Oluştur</button></div>' +
    '<section id="september-campaign-card" class="sc-card">' +
      '<div class="sc-glow sc-glow-one"></div><div class="sc-glow sc-glow-two"></div>' +
      '<header class="sc-hero"><div class="sc-trophy">🏆</div><div class="sc-heading"><small>KUZEY ANADOLU BÖLGE</small><h1>TTM MAĞAZA MÜDÜRLERİ</h1><h2>EYLÜL PERFORMANS KAMPANYASI</h2><p>1–30 Eylül 2026 · Performans Zirvede Başlar</p></div><div class="sc-awards"><small>TOPLAM ÖDÜL</small><strong>20.000 TL</strong><span>1. 8.000 · 2. 5.000 · 3. 4.000 · 4. 3.000 TL</span></div></header>' +
      '<div class="sc-summary"><div><small>KAMPANYA KAPSAMI</small><strong>' + SEP_CAMPAIGN_EXPECTED_DEALERS + ' BAYİ</strong><span>Güncel raporda ' + rows.length + ' bayi</span></div><div><small>PUAN KURALI</small><strong>HGO × KATSAYI</strong><span>%90 altındaki üründen puan yok</span></div><div><small>GÜNCELLEME</small><strong>' + sepCampaignEscape(sepCampaignUpdateLabel()) + '</strong><span>Gerçek veri</span></div></div>' +
      '<div class="sc-rules">' + sepCampaignRuleChips() + '<em>Cihaz HGO &gt; %100 · 300 mobil sonrası her +50 adet = +5 puan</em></div>' +
      '<div class="sc-table"><div class="sc-row sc-head"><div>SIRA</div><div>BAYİ KODU</div><div>BAYİ ADI</div><div>TOPLAM PUAN</div><div>GÜNLÜK PUAN ARTIŞI</div><div>DÜNE GÖRE SIRA</div></div>' +
        (rows.length ? rows.map(function (row, index) { return sepCampaignRow(row, index, previousMap); }).join('') : '<div class="sc-empty">Kampanya verisi için güncel TTM raporunu yükleyin.</div>') +
      '</div>' +
      '<footer class="sc-footer"><b>Başarı, insanla mümkün.</b><span>DAHA GÜÇLÜ PERFORMANS · DAHA GÜÇLÜ EKİP · DAHA GÜÇLÜ TÜRK TELEKOM</span><strong>Türk Telekom</strong></footer>' +
    '</section>';
}
async function downloadSeptemberCampaignPNG() {
  var button = document.querySelector('.sc-actions button'), original = button ? button.textContent : '';
  var wrapper = null;
  try {
    if (button) { button.disabled = true; button.textContent = 'Hazırlanıyor…'; }
    var card = document.getElementById('september-campaign-card');
    if (!card) throw new Error('Eylül Kampanyası kartı bulunamadı');
    var result = await createCleanExportClone(card, 1120); wrapper = result.wrapper;
    result.clone.style.width = '1120px'; result.clone.style.maxWidth = 'none';
    result.wrapper.style.background = '#031637';
    result.clone.style.background = 'radial-gradient(circle at 50% -10%,#197ad0 0,transparent 35%),linear-gradient(145deg,#031637,#063d7c 48%,#031637)';
    var canvas = await captureExportImage(result.clone, { scale: 3, backgroundColor: '#031637' });
    cleanupExportClone(wrapper); wrapper = null;
    _openSharePreview(canvas.toDataURL('image/png'), 'TT_Eylul_Magaza_Mudurleri_2026.png');
  } catch (error) { alert('Görsel oluşturma hatası: ' + error.message); }
  cleanupExportClone(wrapper);
  if (button) { button.disabled = false; button.textContent = original; }
}
