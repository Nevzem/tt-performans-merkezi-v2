/* ════════════════════════════════════════════
   js/app.js
   Navigasyon koordinatörü.
   data.js → parser.js → render.js → export.js
   → home.js → history.js → filters.js → app.js
   ════════════════════════════════════════════ */

let navPage      = 'ana';
let _perfSection = 'matrix';

/* ─── SAYFA GEÇİŞİ ───────────────────────── */
function navTo(page) {
  navPage = page;

  /* Alt nav aktif güncelle */
  document.querySelectorAll('.nav-item').forEach(function(b) {
    b.classList.toggle('active', b.dataset.nav === page);
  });

  /* Sayfaları göster / gizle */
  _setVisible('page-ana',    page === 'ana');
  _setVisible('page-data',   page === 'bayi' || page === 'pers' || page === 'sy' || page === 'perf');
  _setVisible('page-gecmis', page === 'gecmis');
  _setVisible('page-ayar',   page === 'ayar');

  var fbar         = document.getElementById('compact-filter-bar');
  var perfSubStrip = document.getElementById('perf-sub-strip');

  if (typeof resetFiltersForPage === 'function') resetFiltersForPage(page);

  if (page === 'ana') {
    renderHome();

  } else if (page === 'bayi') {
    _setDataHeader('Bayiler', 'TTM Bayi Sıralamas · HGO Bazlı');
    fbar.style.display = ''; perfSubStrip.style.display = 'none';
    setSec('bayi');

  } else if (page === 'pers') {
    var isEDMPers = typeof KANAL !== 'undefined' && KANAL === 'EDM';
    _setDataHeader(
      isEDMPers ? 'Satış Temsilcisi' : 'Personel',
      isEDMPers ? 'Satış Temsilcisi Sıralaması · Aktivasyon Bazlı' : 'Personel Sıralaması · HGO Bazlı'
    );
    fbar.style.display = ''; perfSubStrip.style.display = 'none';
    setSec('pers');

  } else if (page === 'sy') {
    _setDataHeader('Satış Yöneticisi', 'SY Bazlı Performans · HGO Sıralaması');
    fbar.style.display = ''; perfSubStrip.style.display = 'none';
    setSec('sy');

  } else if (page === 'perf') {
    _setDataHeader('Performans', 'Detaylı Analiz ve Raporlar');
    perfSubStrip.style.display = '';
    perfSec(_perfSection); /* perfSec fbar'ı yönetir */

  } else if (page === 'gecmis') {
    fbar.style.display = 'none'; perfSubStrip.style.display = 'none';
    if (typeof initHistoryPage === 'function') initHistoryPage();

  } else if (page === 'ayar') {
    if (typeof renderHistorySettings === 'function') renderHistorySettings();
    if (typeof renderEDMSettings === 'function') renderEDMSettings();
  }

  var sa = document.querySelector('.scroll-area');
  if (sa) sa.scrollTop = 0;
}

/* ─── PERFORMANS ALT BÖLÜMÜ ─────────────── */
function perfSec(sec) {
  _perfSection = sec;
  document.querySelectorAll('.psub-tab').forEach(function(b) {
    b.classList.toggle('active', b.dataset.sec === sec);
  });
  var fbar = document.getElementById('compact-filter-bar');
  if (fbar) fbar.style.display = (sec === 'matrix' || sec === 'kupa' || sec === 'risk') ? '' : 'none';
  setSec(sec);
}

/* ─── YARDIMCILAR ────────────────────────── */
function _setVisible(id, show) {
  var el = document.getElementById(id);
  if (el) el.style.display = show ? 'block' : 'none';
}
function _setDataHeader(title, sub) {
  var t = document.getElementById('data-page-title');
  var s = document.getElementById('data-page-sub');
  if (t) t.textContent = title;
  if (s) s.textContent = sub;
}

/* ─── RENDER SARMALA ─────────────────────── */
(function() {
  var _orig = render;
  render = function() {
    _orig();
    if (navPage === 'ana' && typeof renderHome === 'function') renderHome();
    if (typeof buildFilterBar === 'function') buildFilterBar();
  };
})();

/* ─── BAŞLANGIÇ ──────────────────────────── */
buildTabs();
try { trendCapture(); } catch(e) {}
render();
navTo('ana');
/* Geçmiş rapor manifest'ini arka planda yükle */
if (typeof loadHistManifest === 'function') loadHistManifest();
