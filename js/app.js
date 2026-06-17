/* ════════════════════════════════════════════
   js/app.js
   Uygulama giriş noktası. Tüm script'ler (data.js,
   parser.js, render.js, export.js) yüklendikten
   sonra çalışır: sekmeleri kurar, varsa bugünün
   trend kaydını alır, ilk ekranı render eder.
   ════════════════════════════════════════════ */

buildTabs(); try { trendCapture(); } catch(e) {} render();
