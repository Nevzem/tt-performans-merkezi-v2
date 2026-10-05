/* ════════════════════════════════════════════
   sw.js — Service Worker (Sprint 20: Mobil Premium)
   Strateji: NETWORK-FIRST — her istek önce ağdan denenir,
   başarılıysa önbellek güncellenir; ağ yoksa önbellekten servis edilir.
   Böylece autopush sonrası içerik bayat kalmaz, çevrimdışında uygulama açılır.
   ════════════════════════════════════════════ */

const CACHE = 'ttpm-investor-20261005d';

const ASSETS = [
  '.',
  'index.html',
  'manifest.webmanifest',
  'js/version.js',
  'css/style.css',
  'css/development.css',
  'css/investor-campaign.css',
  'css/month-end-report.css',
  'css/october-campaign.css',
  'assets/october-campaign-reference.png',
  'css/matrix-v2.css',
  'js/data.js',
  'js/parser.js',
  'js/render.js',
  'js/export.js',
  'js/home.js',
  'js/edm.js',
  'js/detay.js',
  'js/history-loader.js',
  'js/history.js',
  'data/history/corrections/strings.json',
  'data/history/corrections/g01.json',
  'data/history/corrections/g02.json',
  'data/history/corrections/g03.json',
  'data/history/corrections/g04.json',
  'data/history/corrections/g05.json',
  'data/history/corrections/g06.json',
  'data/history/corrections/g07.json',
  'data/history/corrections/g08.json',
  'data/history/corrections/g09.json',
  'data/history/corrections/g10.json',
  'data/history/corrections/g11.json',
  'data/history/channel-activation-summary.json',
  'data/history/region-benchmarks.json',
  'js/development.js',
  'js/investor-campaign.js',
  'js/october-campaign.js',
  'js/month-end-report.js',
  'js/filters.js',
  'js/app.js',
  'js/matrix-v2.js',
  'js/vendor/xlsx.full.min.js',
  'js/vendor/html2canvas.min.js',
  'icons/icon-180.png',
  'icons/icon-512.png',
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    /* cache:'no-cache' — tarayıcının HTTP disk önbelleğini atlayıp sunucuyla
       doğrular (ETag ile ucuz). GitHub Pages'in 10 dakikalık max-age'i yüzünden
       güncellemelerin geç görünmesini engeller. */
    fetch(e.request, { cache: 'no-cache' })
      .then(function (res) {
        /* Aynı origin'den başarılı yanıtları önbelleğe yaz */
        if (res.ok && e.request.url.indexOf(self.location.origin) === 0) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(e.request).then(function (m) {
          return m || caches.match('index.html');
        });
      })
  );
});
