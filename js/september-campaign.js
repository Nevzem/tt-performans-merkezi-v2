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
function sepCampaignFactor(isPrevious) {
  var src = isPrevious && typeof SYPREV !== 'undefined' ? SYPREV : (typeof SYDATA !== 'undefined' ? SYDATA : null);
  var total = src && Number(src.calismaGun || 0), elapsed = src && Number(src.calisilanGun || 0);
  return total > 0 && elapsed > 0 && total >= elapsed ? total / elapsed : 1;
}
function sepCampaignProductPoints(metric, rule, factor) {
  var hgo = metric && isFinite(Number(metric.g)) ? Number(metric.g) * (factor || 1) : 0;
  if (rule.key === 'Akıllı Cihaz') return hgo > 100 ? hgo * rule.weight : 0;
  return hgo >= 90 ? hgo * rule.weight : 0;
}
function sepCampaignDealerScore(dealer, factor) {
  if (!dealer || !dealer.prods) return null;
  var breakdown = {}, total = 0;
  SEP_CAMPAIGN_RULES.forEach(function (rule) {
    var metric = dealer.prods[rule.key] || null;
    var projectedHgo = metric ? Number(metric.g || 0) * (factor || 1) : 0;
    var points = sepCampaignProductPoints(metric, rule, factor);
    breakdown[rule.key] = { hgo: projectedHgo, points: points };
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
function sepCampaignRows(source, factor) {
  var dealers = source && source.bayiler ? source.bayiler : {};
  return Object.keys(dealers).map(function (code) {
    var dealer = dealers[code], score = sepCampaignDealerScore(dealer, factor);
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
    ? sepCampaignRows(PREV_DETAY, sepCampaignFactor(true)) : [];
  var map = {};
  rows.forEach(function (row, index) { map[row.code] = { rank: index + 1, total: row.score.total }; });
  return map;
}
function sepCampaignDelta(value, kind) {
  if (value == null) return '<span class="sc-delta sc-none">—</span>';
  if (Math.abs(value) < 0.05) return '<span class="sc-delta sc-flat">' + (kind === 'rank' ? '— 0' : '0') + '</span>';
  var positive = value > 0;
  return '<span class="sc-delta ' + (positive ? 'sc-up' : 'sc-down') + '">' +
    (kind === 'rank' ? (positive ? '▲ +' : '▼ -') : (positive ? '+' : '-')) +
    sepCampaignNum(Math.abs(value), kind === 'point' && Math.abs(value) % 1 ? 1 : 0) + '</span>';
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
    '<div class="sc-dealer"><strong>' + sepCampaignEscape(row.name) + '</strong></div>' +
    '<div class="sc-score">' + sepCampaignNum(row.score.total, row.score.total % 1 ? 1 : 0) + '</div>' +
    '<div>' + sepCampaignDelta(pointDelta, 'point') + '</div>' +
    '<div>' + sepCampaignDelta(rankDelta, 'rank') + '</div>' +
  '</div>';
}
function sepCampaignPlaceholder(index) {
  return '<div class="sc-row sc-placeholder"><div class="sc-rank"><b>' + (index + 1) + '</b></div><div>—</div><div class="sc-dealer"><strong>RAPORDA BAYİ VERİSİ BEKLENİYOR</strong></div><div>—</div><div>—</div><div>—</div></div>';
}
function sepCampaignUpdateLabel() {
  var now = new Date();
  return now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }) +
    ' · ' + now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}
function sepCampaignTrophy() {
  return '<svg viewBox="0 0 220 245" aria-hidden="true"><defs><linearGradient id="scGold" x1="0" x2="1"><stop stop-color="#a85d05"/><stop offset=".28" stop-color="#ffe37c"/><stop offset=".55" stop-color="#d99712"/><stop offset=".78" stop-color="#fff0a0"/><stop offset="1" stop-color="#9e5200"/></linearGradient><filter id="scShadow"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-opacity=".55"/></filter></defs><g fill="url(#scGold)" stroke="#6f3900" stroke-width="3" filter="url(#scShadow)"><path d="M62 27h96v25c0 52-18 83-48 96-30-13-48-44-48-96z"/><path d="M62 42H27c0 48 17 70 55 76l-8-22C51 89 43 75 42 58h20z"/><path d="M158 42h35c0 48-17 70-55 76l8-22c23-7 31-21 32-38h-20z"/><path d="M99 143h22v34h-22zM76 176h68v19H76zM55 193h110v25H55z"/></g><path d="m110 53 11 22 25 4-18 18 4 25-22-12-22 12 4-25-18-18 25-4z" fill="#fff1a2" stroke="#9c5e05" stroke-width="3"/><rect x="43" y="211" width="134" height="28" rx="5" fill="#061f47" stroke="#efbe3e" stroke-width="3"/><text x="110" y="230" text-anchor="middle" fill="#ffe681" font-size="13" font-weight="900">PERFORMANS</text></svg>';
}
function renderSeptemberCampaign() {
  var cards = document.getElementById('cards');
  var rows = sepCampaignRows(typeof DETAY !== 'undefined' ? DETAY : null, sepCampaignFactor(false));
  var previousMap = sepCampaignPreviousMap();
  var tableRows = rows.map(function (row, index) { return sepCampaignRow(row, index, previousMap); });
  while (tableRows.length < SEP_CAMPAIGN_EXPECTED_DEALERS) tableRows.push(sepCampaignPlaceholder(tableRows.length));
  cards.className = 'cards single sc-page';
  cards.style.maxWidth = '1120px';
  cards.innerHTML =
    '<div class="sc-actions"><div><b>24 bayi için bağımsız kampanya alanı</b><small>Günlük değişimler için Ayarlar’dan önceki raporu yükleyin.</small></div><button type="button" onclick="downloadSeptemberCampaignPNG()">Yüksek Kalite Görsel Oluştur</button></div>' +
    '<section id="september-campaign-card" class="sc-card">' +
      '<svg class="sc-mountains" viewBox="0 0 1024 280" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="scMountain" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#1685d6"/><stop offset="1" stop-color="#032a62"/></linearGradient></defs><path d="M0 250 95 176 165 220 252 113 330 200 420 151 500 219 602 112 690 205 764 144 840 212 925 125 1024 214V280H0Z" fill="url(#scMountain)" opacity=".85"/><path d="m190 201 62-88 32 83-32-35-19 25-18-9zM558 166l44-54 29 65-29-27-17 20zM884 176l41-51 27 63-27-25-15 19z" fill="#d7efff" opacity=".85"/></svg>' +
      '<header class="sc-hero"><div class="sc-brand"><b>Türk Telekom</b><small>Değerli Hissettirir</small><i><u></u><u></u><u></u></i></div><div class="sc-heading"><small>KUZEY ANADOLU BÖLGE</small><h1>TTM MAĞAZA MÜDÜRLERİ</h1><h2>EYLÜL PERFORMANS KAMPANYASI</h2><p>▣ &nbsp; 1 – 30 Eylül 2026</p><em>Hedef Daha Güçlü Yarınlar</em></div><div class="sc-slogan">Birlikte<br>Daha Fazlası<br>Mümkün</div><div class="sc-trophy">' + sepCampaignTrophy() + '</div></header>' +
      '<div class="sc-summary"><div><i>♟</i><small>TOPLAM BAYİ</small><strong>' + SEP_CAMPAIGN_EXPECTED_DEALERS + '</strong></div><div><i>◎</i><small>KAMPANYA SÜRESİ</small><strong>1 – 30<br>Eylül 2026</strong></div><div><i>▥</i><small>GÜNCELLEME</small><strong>' + sepCampaignEscape(sepCampaignUpdateLabel()).replace(' · ', '<br>') + '</strong></div></div>' +
      '<div class="sc-table"><div class="sc-row sc-head"><div>SIRA</div><div>BAYİ KODU</div><div>BAYİ ADI</div><div>TOPLAM<br>PUAN</div><div>GÜNLÜK<br>PUAN ARTIŞI</div><div>DÜNE GÖRE<br>SIRA DEĞİŞİMİ</div></div>' +
        tableRows.join('') +
      '</div>' +
      '<footer class="sc-footer"><b>Başarı,<br>insanla mümkün.</b><div><span>▥</span> DAHA GÜÇLÜ<br>PERFORMANS</div><div><span>♟</span> DAHA GÜÇLÜ<br>EKİP</div><div><span>★</span> DAHA GÜÇLÜ<br>TÜRK TELEKOM</div><strong>Türk Telekom<small>Değerli Hissettirir</small></strong></footer>' +
    '</section>';
}
async function downloadSeptemberCampaignPNG() {
  var button = document.querySelector('.sc-actions button'), original = button ? button.textContent : '';
  var wrapper = null;
  try {
    if (button) { button.disabled = true; button.textContent = 'Hazırlanıyor…'; }
    var card = document.getElementById('september-campaign-card');
    if (!card) throw new Error('Eylül Kampanyası kartı bulunamadı');
    var result = await createCleanExportClone(card, 1024); wrapper = result.wrapper;
    result.clone.style.width = '1024px'; result.clone.style.height = '1536px'; result.clone.style.maxWidth = 'none';
    result.wrapper.style.background = '#031637';
    result.clone.style.background = 'radial-gradient(circle at 50% -10%,#197ad0 0,transparent 35%),linear-gradient(145deg,#031637,#063d7c 48%,#031637)';
    var canvas = await captureExportImage(result.clone, { scale: 3, backgroundColor: '#031637' });
    cleanupExportClone(wrapper); wrapper = null;
    _openSharePreview(canvas.toDataURL('image/png'), 'TT_Eylul_Magaza_Mudurleri_2026.png');
  } catch (error) { alert('Görsel oluşturma hatası: ' + error.message); }
  cleanupExportClone(wrapper);
  if (button) { button.disabled = false; button.textContent = original; }
}
