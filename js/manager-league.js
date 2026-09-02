/* Eylül Mağaza Müdürleri Yarışması — günlük Excel verisinden otomatik skor */
var MANAGER_LEAGUE_MATCHES = [
  [{ code: '4052718', name: 'Asis İletişim' },       { code: '4100676', name: 'Primetech Bilişim' }],
  [{ code: '4100641', name: 'Asis İletişim' },       { code: '4100729', name: 'Primetech' }],
  [{ code: '4100170', name: 'Asis İletişim' },       { code: '71000990', name: 'Primetech Bilişim' }],
  [{ code: '4100781', name: 'Asis İletişim' },       { code: '4100778', name: 'Primetech Bilişim' }],
  [{ code: '4100089', name: 'Kılavuzlar İletişim' }, { code: '4057503', name: 'Öztürk İletişim' }],
  [{ code: '4100087', name: 'Kılavuzlar İletişim' }, { code: '4100760', name: 'Öztürk İletişim' }]
];

var MANAGER_LEAGUE_WEIGHTS = [
  { product: 'Toplam Mobil', weight: 3 },
  { product: 'DSL',          weight: 4 },
  { product: 'IPTV',         weight: 3 },
  { product: 'Uydu',         weight: 2 },
  { product: 'Akıllı Cihaz', weight: 2 }
];

function managerLeagueScore(code) {
  var dealer = typeof DETAY !== 'undefined' && DETAY && DETAY.bayiler ? DETAY.bayiler[code] : null;
  if (!dealer || !dealer.prods) return null;
  var total = 0;
  MANAGER_LEAGUE_WEIGHTS.forEach(function(rule) {
    var metric = dealer.prods[rule.product];
    var hgo = metric && Number.isFinite(Number(metric.g)) ? Number(metric.g) : 0;
    total += hgo * rule.weight;
  });
  return total;
}

function managerLeagueDate() {
  return new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }).toLocaleUpperCase('tr-TR');
}

function managerLeagueNumber(value) { return Math.round(value).toLocaleString('tr-TR'); }

function managerLeagueSide(team, score, side, winner, difference, tied) {
  var missing = score === null;
  return '<div class="ml-team ml-team-' + side + (winner ? ' ml-winner' : '') + '">' +
    (winner ? '<div class="ml-leading">ÖNDE</div>' : tied ? '<div class="ml-leading ml-draw">BERABERE</div>' : '') +
    '<div class="ml-team-name">' + team.name + '</div>' +
    '<div class="ml-team-code">' + team.code + '</div>' +
    (missing ? '<div class="ml-missing">RAPORDA VERİ YOK</div>' : '<div class="ml-score">' + managerLeagueNumber(score) + '<small> PUAN</small></div>') +
    (winner ? '<div class="ml-difference">+' + managerLeagueNumber(difference) + '</div>' : '') +
  '</div>';
}

function managerLeagueMatch(pair, index) {
  var leftScore = managerLeagueScore(pair[0].code);
  var rightScore = managerLeagueScore(pair[1].code);
  var comparable = leftScore !== null && rightScore !== null;
  var delta = comparable ? Math.abs(leftScore - rightScore) : null;
  var tied = comparable && delta < 0.05;
  var leftWins = comparable && !tied && leftScore > rightScore;
  var rightWins = comparable && !tied && rightScore > leftScore;
  return '<article class="ml-match">' +
    '<div class="ml-round">' + (index + 1) + '</div>' +
    '<div class="ml-versus">' +
      managerLeagueSide(pair[0], leftScore, 'left', leftWins, delta, tied) +
      '<div class="ml-vs">VS</div>' +
      managerLeagueSide(pair[1], rightScore, 'right', rightWins, delta, false) +
    '</div>' +
  '</article>';
}

function renderManagerLeague() {
  var cards = document.getElementById('cards');
  cards.className = 'cards single ml-page';
  cards.style.maxWidth = '560px';
  cards.innerHTML =
    '<div class="ml-actions"><button type="button" onclick="downloadManagerLeaguePNG()">Paylaşılabilir Görsel Oluştur</button></div>' +
    '<section id="manager-league-card" class="ml-card">' +
      '<div class="ml-date"><span>' + managerLeagueDate() + '</span><b>GÜNCEL VERİ</b></div>' +
      '<div class="ml-matches">' + MANAGER_LEAGUE_MATCHES.map(managerLeagueMatch).join('') + '</div>' +
    '</section>';
}

async function downloadManagerLeaguePNG() {
  var button = document.querySelector('.ml-actions button');
  var original = button ? button.textContent : '';
  var wrapper = null;
  try {
    if (button) { button.disabled = true; button.textContent = 'Hazırlanıyor…'; }
    var card = document.getElementById('manager-league-card');
    if (!card) throw new Error('Müdürler Ligi kartı bulunamadı');
    var result = await createCleanExportClone(card, 1024);
    wrapper = result.wrapper;
    result.wrapper.style.containerType = 'inline-size';
    result.clone.style.width = '1024px';
    result.clone.style.maxWidth = 'none';
    var canvas = await captureExportImage(result.clone, { scale: 2.5 });
    cleanupExportClone(wrapper); wrapper = null;
    var period = (typeof DONEM !== 'undefined' && DONEM ? DONEM : 'Eylul').replace(/[^0-9A-Za-z]/g, '');
    _openSharePreview(canvas.toDataURL('image/png'), 'TT_Magaza_Mudurleri_' + period + '.png');
  } catch (error) {
    alert('Görsel oluşturma hatası: ' + error.message);
  }
  cleanupExportClone(wrapper);
  if (button) { button.disabled = false; button.textContent = original; }
}
