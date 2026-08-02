/* ════════════════════════════════════════════════════════════════════
   js/kupa-v2.js — Kupa Bende ekranı v2 (Sprint 28)

   Referans: design-references/kupa-bende-final-reference.png (kullanıcı
   onaylı, tek tasarım kaynağı). Eski js/render.js:renderKupa() (.kp-*
   sınıfları) SİLİNMEDİ — rollback için korunuyor, artık çağrılmıyor.

   Bu dosya iki bölümden oluşur:
   1) KUPA GÜNLÜK ANLIK GÖRÜNTÜ (snapshot) — js/render.js'teki
      trendCapture()/trendLoad()/trendSave() ile AYNI desen: her Excel
      yüklemesinde/açılışta KUPA toplam puan + sıra localStorage'a
      günlük anahtarla kaydedilir. Referans görseldeki "SON 24 SAAT" /
      "X SIRA YÜKSELDİ-GERİLEDİ" alanları için önceki gün karşılaştırması
      GEREKİYORDU ama mevcut veri modelinde hiç yoktu (KUPA_PREV benzeri
      bir kaynak yok) — kullanıcı onayıyla bu YENİ ama küçük ve mevcut
      trend deposu deseniyle tutarlı altyapı eklendi. İlk kullanımda
      (önceki gün kaydı yokken) tüm "SON 24 SAAT" alanları '—' gösterir,
      sessizce veri uydurulmaz.
   2) GÖRÜNÜM — referans görsele göre: trophy header, 2-1-3 podyum,
      ilk 10 sıralama tablosu, Günün Yükseleni/Düşeni/Bonus kartları,
      alt motivasyon banner'ı.

   Hesaplama: KUPA dizisindeki toplam/fat/dsl/fsz/iptv/mob/bonus alanları
   DEĞİŞMEDİ (js/parser.js). "Lidere fark" ve "Bonus Durumu" tier'ları
   bu alanlardan türetilen SUNUM hesaplarıdır (yeni iş mantığı değil —
   var olan toplam/iptv alanlarının basit karşılaştırma/gruplama).
   ════════════════════════════════════════════════════════════════════ */

/* ─── 1) GÜNLÜK ANLIK GÖRÜNTÜ DEPOSU ──────────────────────────────────── */
const KUPA_SNAP_KEY = "tt_kuzey_kupa_snap_v1";
let _kupaSnapMem = null;

function kupaSnapLoad() {
  if (_kupaSnapMem) return _kupaSnapMem;
  try { const s = localStorage.getItem(KUPA_SNAP_KEY); _kupaSnapMem = s ? JSON.parse(s) : {}; }
  catch (e) { _kupaSnapMem = {}; }
  return _kupaSnapMem;
}
function kupaSnapSave(obj) {
  _kupaSnapMem = obj;
  try { localStorage.setItem(KUPA_SNAP_KEY, JSON.stringify(obj)); return true; }
  catch (e) { return false; }
}
/* Her güncel rapor yüklendiğinde / açılışta bugünün KUPA anlık görüntüsünü
   kaydeder — js/render.js:trendCapture() ile aynı çağrı noktalarından
   tetiklenir (js/app.js ilk yükleme, js/parser.js Excel yükleme sonrası). */
function kupaSnapCapture(forceDate) {
  const K = KUPA || [];
  if (!K.length) return;
  const store = kupaSnapLoad();
  const today = forceDate || new Date().toISOString().slice(0, 10);
  const snap = {};
  K.forEach(function(r, i) { snap[r.kod] = { toplam: r.toplam, rank: i + 1 }; });
  store[today] = snap;
  const days = Object.keys(store).sort();
  const maxDays = 14;
  if (days.length > maxDays) { days.slice(0, days.length - maxDays).forEach(function(d) { delete store[d]; }); }
  kupaSnapSave(store);
}
/* Bugünden ÖNCEKİ en yakın anlık görüntüyü döndürür (karşılaştırma
   referansı) — hiç yoksa null (SON 24 SAAT alanları '—' gösterir). */
function kupaSnapPrev() {
  const store = kupaSnapLoad();
  const today = new Date().toISOString().slice(0, 10);
  const days = Object.keys(store).filter(function(d) { return d < today; }).sort();
  if (!days.length) return null;
  return store[days[days.length - 1]];
}

/* ─── BİÇİMLENDİRME ────────────────────────────────────────────────────── */
function _kbN1(n) { return n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function _kbTrendHTML(delta) {
  if (delta == null) return '<span class="kb-tr eq">—</span>';
  var r = Math.round(delta * 10) / 10;
  if (r === 0) return '<span class="kb-tr eq">— 0,0</span>';
  return r > 0
    ? '<span class="kb-tr up">▲ ' + _kbN1(r) + '</span>'
    : '<span class="kb-tr dn">▼ ' + _kbN1(Math.abs(r)) + '</span>';
}

/* ─── İKONLAR ──────────────────────────────────────────────────────────── */
var KB_CAL_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2.5"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
var KB_CROWN_ICON = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M3 19h18l-1.5-9-5 4-2.5-6-2.5 6-5-4L3 19z"/></svg>';
var KB_BARS_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="6"/><line x1="18" y1="20" x2="18" y2="15"/></svg>';
var KB_ROCKET_ICON = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 19 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>';
var KB_DOWN_ICON = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 7 10 14 14 10 21 17"/><polyline points="21 10 21 17 14 17"/></svg>';
var KB_GIFT_ICON = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="12" rx="1.5"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="12" y1="9" x2="12" y2="21"/><path d="M12 9C9 9 7 7.5 7 5.5A2.5 2.5 0 0 1 9.5 3C11.5 3 12 6 12 9z"/><path d="M12 9c3 0 5-1.5 5-3.5A2.5 2.5 0 0 0 14.5 3C12.5 3 12 6 12 9z"/></svg>';
var KB_BOLT_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>';
var KB_TARGET_ICON = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.2"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><line x1="19" y1="5" x2="22" y2="2" stroke="#D64545"/><path d="M22 2l-2 .3.7 1.7L22 2z" fill="#D64545" stroke="none"/></svg>';

/* Rank-1 rozeti — emoji font'a göre değişken/güvenilmez göründüğü için
   (bazı ortamlarda altın değil, donuk mavi/bronz render ediliyor) sabit
   SVG kurdele madalya kullanılır. */
function _kbGoldRibbonSVG() {
  return '<svg width="26" height="30" viewBox="0 0 26 30" class="kb-pod-medal1-svg" aria-hidden="true">' +
    '<path d="M6 12 L2 26 L9 22 L13 28 L17 22 L24 26 L20 12 Z" fill="#C9821E"/>' +
    '<circle cx="13" cy="11" r="11" fill="url(#kbGoldSm)" stroke="#F6DE8C" stroke-width="1.5"/>' +
    '<circle cx="13" cy="11" r="7" fill="none" stroke="#7A5A12" stroke-width="1"/>' +
    '<defs><linearGradient id="kbGoldSm" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#FCE7A0"/><stop offset="100%" stop-color="#C9A227"/>' +
    '</linearGradient></defs>' +
  '</svg>';
}

function _kbTrophySVG() {
  return '<svg width="118" height="150" viewBox="0 0 200 240" class="kb-trophy-svg" aria-hidden="true">' +
    '<defs><linearGradient id="kbGold" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#FCE7A0"/><stop offset="45%" stop-color="#E8B93D"/><stop offset="100%" stop-color="#9C6F14"/>' +
    '</linearGradient></defs>' +
    '<path d="M50 34 C14 34 10 88 52 100" fill="none" stroke="url(#kbGold)" stroke-width="11" stroke-linecap="round"/>' +
    '<path d="M150 34 C186 34 190 88 148 100" fill="none" stroke="url(#kbGold)" stroke-width="11" stroke-linecap="round"/>' +
    '<path d="M52 28 h96 v46 a48 48 0 0 1 -96 0 z" fill="url(#kbGold)"/>' +
    '<circle cx="100" cy="58" r="25" fill="#7A5A12" stroke="#F6DE8C" stroke-width="3"/>' +
    '<text x="100" y="68" font-size="26" font-weight="900" fill="#F9E7AE" text-anchor="middle" font-family="inherit">1</text>' +
    '<rect x="88" y="118" width="24" height="34" fill="url(#kbGold)"/>' +
    '<path d="M62 152 h76 l-10 22 h-56 z" fill="url(#kbGold)"/>' +
    '<rect x="46" y="178" width="108" height="30" rx="4" fill="#0A0E16" stroke="#C9A227" stroke-width="1.5"/>' +
    '<text x="100" y="198" font-size="11" font-weight="800" fill="#D9BC5E" text-anchor="middle" letter-spacing="1.5" font-family="inherit">TTM PERFORMANS</text>' +
  '</svg>';
}

/* ─── PODYUM (2 · 1 · 3) ───────────────────────────────────────────────── */
function _kbPodiumCard(row, rank, prevSnap) {
  var prev = prevSnap ? prevSnap[row.kod] : null;
  var delta = prev ? (row.toplam - prev.toplam) : null;
  var medal = rank === 1
    ? '<span class="kb-pod-medal kb-pod-medal1">' + _kbGoldRibbonSVG() + '</span>'
    : '<span class="kb-pod-medal kb-pod-medal' + rank + '">' + rank + '</span>';
  return '<div class="kb-pod-card kb-pod-r' + rank + '">' +
    '<div class="kb-pod-top">' + medal +
      '<div class="kb-pod-id"><div class="kb-pod-nm">' + row.b + '</div><div class="kb-pod-il">' + row.il + '</div></div>' +
    '</div>' +
    '<div class="kb-pod-pts">' + _kbN1(row.toplam) + '</div>' +
    '<div class="kb-pod-lbl">PUAN</div>' +
    '<div class="kb-pod-trendrow">' + _kbTrendHTML(delta) + '<span class="kb-pod-trendlbl">SON 24 SAAT</span></div>' +
  '</div>';
}
function renderKupaPodium(K, prevSnap) {
  if (K.length < 3) return '';
  var order = [K[1], K[0], K[2]];
  var ranks = [2, 1, 3];
  var html = order.map(function(row, i) { return _kbPodiumCard(row, ranks[i], prevSnap); }).join('');
  return '<div class="kb-podium">' + html + '</div>';
}

/* ─── İLK 10 SIRALAMA TABLOSU ──────────────────────────────────────────── */
function _kbRankBadge(rank) {
  if (rank <= 3) return '<span class="kb-rk kb-rk' + rank + '">' + rank + '</span>';
  return '<span class="kb-rk kb-rk-n">' + rank + '</span>';
}
function _kbTableRow(row, rank, leaderToplam, prevSnap) {
  var prev = prevSnap ? prevSnap[row.kod] : null;
  var delta = prev ? (row.toplam - prev.toplam) : null;
  var fark = rank === 1 ? '–' : _kbN1(leaderToplam - row.toplam);
  return '<div class="kb-trow">' +
    _kbRankBadge(rank) +
    '<span class="kb-trow-crown">' + KB_CROWN_ICON + '</span>' +
    '<div class="kb-trow-id"><span class="kb-trow-nm">' + row.b + '</span><span class="kb-trow-il">' + row.il + '</span></div>' +
    '<span class="kb-trow-puan">' + _kbN1(row.toplam) + '</span>' +
    '<span class="kb-trow-fark">' + fark + '</span>' +
    '<span class="kb-trow-trend">' + _kbTrendHTML(delta) + '</span>' +
  '</div>';
}
function renderKupaTable(K, prevSnap) {
  var top10 = K.slice(0, 10);
  var leaderToplam = K[0].toplam;
  var rows = top10.map(function(r, i) { return _kbTableRow(r, i + 1, leaderToplam, prevSnap); }).join('');
  return '<div class="kb-table">' +
    '<div class="kb-table-head">' +
      '<span class="kb-table-title">' + KB_BARS_ICON + ' İLK 10 SIRALAMA</span>' +
      '<span class="kb-table-cols"><span>PUAN</span><span>LİDERE FARK</span><span>SON 24 SAAT</span></span>' +
    '</div>' +
    rows +
  '</div>';
}

/* ─── GÜNÜN EN HIZLI YÜKSELENİ / EN ÇOK DÜŞENİ ──────────────────────────
   TÜM KUPA listesi taranır (yalnızca ilk 10 değil) — en büyük pozitif ve
   en büyük negatif günlük puan değişimine sahip bayi bulunur. Önceki
   anlık görüntü yoksa boş durum gösterilir (veri uydurulmaz). ────────── */
function _kbBiggestMovers(K, prevSnap) {
  if (!prevSnap) return { up: null, down: null };
  var up = null, down = null;
  K.forEach(function(row, i) {
    var prev = prevSnap[row.kod];
    if (!prev) return;
    var delta = Math.round((row.toplam - prev.toplam) * 10) / 10;
    var rankChange = prev.rank - (i + 1); /* pozitif = yükseldi */
    if (delta > 0 && (!up || delta > up.delta)) up = { row: row, delta: delta, rankChange: rankChange };
    if (delta < 0 && (!down || delta < down.delta)) down = { row: row, delta: delta, rankChange: rankChange };
  });
  return { up: up, down: down };
}
function renderKupaMovers(K, prevSnap) {
  var m = _kbBiggestMovers(K, prevSnap);

  var upHTML = m.up
    ? '<div class="kb-mini-nm">' + m.up.row.b + '</div><div class="kb-mini-il">' + m.up.row.il + '</div>' +
      '<div class="kb-mini-val up">+' + _kbN1(m.up.delta) + '<small>PUAN</small></div>' +
      '<div class="kb-mini-sub up">' + (m.up.rankChange > 0 ? m.up.rankChange + ' SIRA YÜKSELDİ ▲' : '—') + '</div>'
    : '<div class="kb-mini-empty">Henüz karşılaştırma verisi yok</div>';

  var downHTML = m.down
    ? '<div class="kb-mini-nm">' + m.down.row.b + '</div><div class="kb-mini-il">' + m.down.row.il + '</div>' +
      '<div class="kb-mini-val dn">' + _kbN1(m.down.delta) + '<small>PUAN</small></div>' +
      '<div class="kb-mini-sub dn">' + (m.down.rankChange < 0 ? Math.abs(m.down.rankChange) + ' SIRA GERİLEDİ ▼' : '—') + '</div>'
    : '<div class="kb-mini-empty">Henüz karşılaştırma verisi yok</div>';

  /* ── Bonus Durumu (IPTV HGO %100+) — mevcut r.iptv/r.bonus alanlarından
     3 kademeli sayım (yeni hesap DEĞİL, var olan alanların gruplanması):
     bonus aldı (iptv≥100, r.bonus ile birebir) · yakın (95-99) · dışı (<95) */
  var aldiN = 0, yakinN = 0, disiN = 0;
  K.forEach(function(r) {
    if (r.iptv >= 100) aldiN++; else if (r.iptv >= 95) yakinN++; else disiN++;
  });

  return '<div class="kb-bottom-grid">' +
    '<div class="kb-mini kb-mini-up"><div class="kb-mini-title">' + KB_ROCKET_ICON.replace('width="26" height="26"', 'width="15" height="15"') + ' GÜNÜN EN HIZLI YÜKSELENİ</div>' +
      '<div class="kb-mini-body"><span class="kb-mini-ic up">' + KB_ROCKET_ICON + '</span><div class="kb-mini-txt">' + upHTML + '</div></div>' +
    '</div>' +
    '<div class="kb-mini kb-mini-dn"><div class="kb-mini-title">' + KB_DOWN_ICON.replace('width="26" height="26"', 'width="15" height="15"') + ' GÜNÜN EN ÇOK DÜŞENİ</div>' +
      '<div class="kb-mini-body"><span class="kb-mini-ic dn">' + KB_DOWN_ICON + '</span><div class="kb-mini-txt">' + downHTML + '</div></div>' +
    '</div>' +
    '<div class="kb-mini kb-mini-bonus"><div class="kb-mini-title">' + KB_GIFT_ICON.replace('width="26" height="26"', 'width="15" height="15"') + ' BONUS DURUMU <small>(IPTV HGO %100+)</small></div>' +
      '<div class="kb-mini-body"><span class="kb-mini-ic bonus">' + KB_GIFT_ICON + '</span>' +
        '<div class="kb-mini-tiers">' +
          '<div class="kb-tier"><span class="kb-dot g"></span><b>' + aldiN + ' BAYİ</b><small>BONUS ALDI</small></div>' +
          '<div class="kb-tier"><span class="kb-dot y"></span><b>' + yakinN + ' BAYİ</b><small>%95 - %99 ARASI</small></div>' +
          '<div class="kb-tier"><span class="kb-dot r"></span><b>' + disiN + ' BAYİ</b><small>BONUS DIŞI</small></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

/* ─── HEADER + BANNER ──────────────────────────────────────────────────── */
function renderKupaHeader() {
  var dateStr = new Date().toLocaleDateString('tr-TR');
  return '<div class="kb-hero">' +
    '<div class="kb-hero-trophy">' + _kbTrophySVG() + '</div>' +
    '<div class="kb-hero-txt">' +
      '<div class="kb-title"><span class="w">KUPA</span> <span class="g">BENDE</span></div>' +
      '<div class="kb-subtitle">KUZEY ANADOLU GÜNLÜK SIRALAMA</div>' +
      '<div class="kb-date-pill">' + KB_CAL_ICON + '<span>' + dateStr + '</span></div>' +
    '</div>' +
  '</div>';
}
function renderKupaBanner() {
  return '<div class="kb-banner">' +
    '<span class="kb-banner-ic">' + KB_BOLT_ICON + '</span>' +
    '<div class="kb-banner-txt"><div class="kb-banner-h">YARIŞ DEVAM EDİYOR, <span>FARKI KAPAT!</span></div><div class="kb-banner-s">HER PUAN ÖNEMLİ!</div></div>' +
    '<span class="kb-banner-target">' + KB_TARGET_ICON + '</span>' +
  '</div>';
}

/* ─── SAYFA RENDER ──────────────────────────────────────────────────────
   id="kupa-card" KORUNUR — js/filters.js:downloadCardPNG() ve
   js/export.js bu id'yi arıyor, PNG export bu sayede değişmeden çalışır. */
function renderKupaV2() {
  var K = KUPA || [];
  var cards = document.getElementById('cards');
  cards.className = 'cards single';
  cards.style.maxWidth = '420px';

  if (!K.length) {
    cards.innerHTML = '<div class="kb-page" id="kupa-card">' +
      renderKupaHeader() +
      '<div class="kb-empty">Veri yok</div>' +
      '</div>';
    return;
  }

  var prevSnap = kupaSnapPrev();

  cards.innerHTML = '<div class="kb-page" id="kupa-card">' +
    renderKupaHeader() +
    renderKupaPodium(K, prevSnap) +
    renderKupaTable(K, prevSnap) +
    renderKupaMovers(K, prevSnap) +
    renderKupaBanner() +
  '</div>';
}
