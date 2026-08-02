/* ════════════════════════════════════════════
   js/app.js
   Navigasyon koordinatörü.
   data.js → parser.js → render.js → export.js
   → home.js → history.js → filters.js → app.js
   ════════════════════════════════════════════ */

let navPage      = 'ana';
let _perfSection = 'matrix';

/* ─── SY MOBİL v3 KROM GİZLEME (Sprint 27 → 27.1 → 27.2) ───
   Satış Yöneticisi mobil ekranı (v3) kendi birleşik başlığını içeriyor
   (js/sy-report-v3.js: .sy3-header) — genel topbar, kanal şeridi
   (TTM/EDM) VE sayfa başlığı (.page-hdr) bu ekranda YALNIZCA görsel
   olarak gizlenir (display:none). Sprint 27.2: design-references/
   sy-dashboard-reference.png açıkça "Kanal seçimini tamamen kaldır,
   bu sayfada artık görünmeyecek" dediği için .channel-strip TEKRAR
   gizleniyor (Sprint 27.1'de EDM erişimi için geçici olarak geri
   getirilmişti — bu karar bu sprintte kullanıcı talimatıyla tersine
   çevrildi). navTo('sy') VE setSyViewMode() (js/sy-matrix.js) İKİSİ de
   bunu çağırır. Diğer tüm sayfalarda (ana/bayi/pers/perf/geçmiş/
   ayarlar) davranış BİREBİR aynı kalır — navPage!=='sy' olduğunda her
   zaman '' (görünür) döner. */
function syncSYChrome() {
  var _topbar  = document.querySelector('.topbar');
  var _chStrip = document.querySelector('.channel-strip');
  var _pageHdr = document.querySelector('.page-hdr');
  var _scroll  = document.querySelector('.scroll-area');
  var _app     = document.querySelector('.app');
  var _hide = (navPage === 'sy' && (typeof syViewMode === 'undefined' || syViewMode === 'v3'));
  if (_topbar)  _topbar.style.display  = _hide ? 'none' : '';
  if (_chStrip) _chStrip.style.display = _hide ? 'none' : '';
  if (_pageHdr) _pageHdr.style.display = _hide ? 'none' : '';
  /* .scroll-area normalde sabit (fixed) topbar+kanal şeridi için üstte boşluk
     (padding-top) ayırır — ikisi de gizlenince o boşluk tamamen kaldırılır. */
  if (_scroll)  _scroll.classList.toggle('sy3-no-chrome', _hide);
  if (_app)     _app.classList.toggle('sy3-active', _hide);
}

/* ─── SAYFA GEÇİŞİ ───────────────────────── */
function navTo(page) {
  navPage = page;

  /* Alt nav aktif güncelle */
  document.querySelectorAll('.nav-item').forEach(function(b) {
    b.classList.toggle('active', b.dataset.nav === page);
  });

  syncSYChrome();

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
    _setDataHeader('Satış Yöneticisi', 'Mobil · DSL · TV · Cihaz — Performans Matrisi');
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
  if (fbar) fbar.style.display = (sec === 'matrix' || sec === 'kupa' || sec === 'risk' || sec === 'detay') ? '' : 'none';
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

/* ─── SÜRÜM & GÜNCELLEME ─────────────────── */
/* Güncelle butonu: SW kaydını ve tüm önbellekleri temizler,
   benzersiz sorgu ile sayfayı yeniden yükler — CDN/tarayıcı
   önbelleğini atlayıp en son yayını garanti eder. */
async function forceUpdate() {
  try {
    if ('serviceWorker' in navigator) {
      var regs = await navigator.serviceWorker.getRegistrations();
      for (var i = 0; i < regs.length; i++) await regs[i].unregister();
    }
    if (window.caches) {
      var keys = await caches.keys();
      for (var j = 0; j < keys.length; j++) await caches.delete(keys[j]);
    }
  } catch (e) {}
  location.replace(location.origin + location.pathname + '?upd=' + Date.now());
}

/* ─── BAŞLANGIÇ ──────────────────────────── */
/* Sürüm damgası — Ayarlar > Sürüm kartı */
(function() {
  var v = document.getElementById('version-info');
  if (v && typeof APP_BUILD !== 'undefined') v.textContent = APP_BUILD;
})();
buildTabs();
try { trendCapture(); } catch(e) {}
render();
navTo('ana');
/* Geçmiş rapor manifest'ini arka planda yükle */
if (typeof loadHistManifest === 'function') loadHistManifest();
