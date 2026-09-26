/* YD Performans · Prim & Kazanç · Eylül 2026 snapshot */
window.YD_PRIM_DATA = {
  period: '2026-09',
  periodLabel: 'Eylül 2026',
  asOf: '26 Eylül 2026',
  ruleset: 'Eylül 2026 v1',
  portfolio: {
    hgo: 82.36,
    points: 46891,
    bpp: 537745.68,
    ypp: 169375,
    protectedBpp: 697745.68,
    base: 1349344,
    hgoCats: { mobil:84.52, dsl:81.60, iptv:92.98, dth:70.37, smart:75.00, other:77.92 }
  },
  investors: [
    {
      id:'500733', name:'Bıyıkoğlu', fullName:'İbrahim Bıyık · Bıyıkoğlu İletişim',
      hgo:47.75, points:3674, bpp:0, ypp:0, base:96000, bppRate:0, yppRate:0,
      hgoCats:{mobil:85.51,dsl:62.86,iptv:100.00,dth:16.67,smart:78.21,other:38.81},
      branches:[{code:'500733',name:'Bıyıkoğlu İletişim',base:96000,source:'Resmî rapor'}]
    },
    {
      id:'501699', name:'Taş-Ka', fullName:'Taş-Ka İletişim',
      hgo:87.65, points:3889, bpp:45000, ypp:24375, base:56250, bppRate:80, yppRate:75,
      hgoCats:{mobil:80.92,dsl:100.00,iptv:105.26,dth:16.67,smart:73.02,other:150.00},
      branches:[{code:'501699',name:'Taş-Ka İletişim',base:56250,source:'Resmî rapor'}]
    },
    {
      id:'502046', name:'İlk İletişim', fullName:'İlk İletişim Hizmetleri',
      hgo:36.43, points:3302, bpp:0, ypp:0, base:69000, bppRate:0, yppRate:0,
      hgoCats:{mobil:89.81,dsl:48.98,iptv:66.67,dth:100.00,smart:68.25,other:63.33},
      branches:[{code:'502046',name:'İlk İletişim',base:69000,source:'Resmî rapor'}]
    },
    {
      id:'7000311', name:'Asis', fullName:'Asis Telekom',
      hgo:84.11, points:13921, bpp:244660, ypp:70000, base:376400, bppRate:65, yppRate:70,
      hgoCats:{mobil:96.31,dsl:88.97,iptv:84.15,dth:36.84,smart:72.29,other:72.43},
      branches:[
        {code:'4052718',name:'Asis Samsun',base:94500,source:'Resmî rapor'},
        {code:'4100170',name:'Asis Yeni Şube',base:200000,source:'Manuel',protected:true},
        {code:'4100641',name:'Asis Sinop',base:81900,source:'Resmî rapor'}
      ]
    },
    {
      id:'7000514', name:'Öztürk', fullName:'Öztürk Gıda · İletişim',
      hgo:58.95, points:8672, bpp:0, ypp:0, base:351586.90, bppRate:0, yppRate:0,
      hgoCats:{mobil:65.81,dsl:87.13,iptv:96.55,dth:111.76,smart:73.37,other:117.58},
      branches:[
        {code:'4057503',name:'Öztürk Kırşehir',base:148027.52,source:'Resmî rapor'},
        {code:'4100760',name:'Öztürk Kırşehir 2',base:203559.38,source:'Resmî rapor'}
      ]
    },
    {
      id:'500617', name:'Kılavuzlar', fullName:'Kılavuzlar İletişim',
      hgo:86.04, points:10968, bpp:248085.68, ypp:75000, base:310107.10, bppRate:80, yppRate:75,
      hgoCats:{mobil:84.30,dsl:91.82,iptv:112.12,dth:109.52,smart:77.06,other:68.47},
      branches:[
        {code:'4100087',name:'Kılavuzlar Kırıkkale',base:58000,source:'Resmî rapor'},
        {code:'4100089',name:'Kılavuzlar Kırıkkale 2',base:252107.10,source:'Resmî rapor'}
      ]
    },
    {
      id:'7100063', name:'Primetech', fullName:'Primetech Bilişim',
      hgo:54.82, points:2465, bpp:0, ypp:0, base:90000, bppRate:0, yppRate:0,
      hgoCats:{mobil:112.35,dsl:50.00,iptv:61.11,dth:0.00,smart:90.00,other:158.82},
      branches:[{code:'4100990',name:'Primetech Yeni Şube',base:90000,source:'Manuel',protected:true}]
    }
  ],
  yppBarems:[
    {points:3500,amount:32500},{points:7000,amount:65000},{points:10500,amount:100000},
    {points:14000,amount:200000},{points:17500,amount:280000},{points:21000,amount:410000},
    {points:24500,amount:610000},{points:28000,amount:800000},{points:31500,amount:1000000},
    {points:35000,amount:1300000},{points:38500,amount:1600000}
  ],
  bppBarems:[
    {min:70,max:74.999,rate:50},{min:75,max:79.999,rate:60},{min:80,max:84.999,rate:65},
    {min:85,max:89.999,rate:80},{min:90,max:94.999,rate:90},{min:95,max:99.999,rate:95},{min:100,max:999,rate:100}
  ],
  pointRules:[
    ['DSL >100 Mbps',21],['DSL 100 Mbps',18],['DSL <100 Mbps',15],['DSL Taahhüt Upselli',15],
    ['DSL Taahhüt Upsellsiz',10],['Faturalı Aktivasyon',9],['Odak Cihaz',9],['Faturalı Taahhüt',7],
    ['Akıllı Premium',7],['Faturalı Upsell',6],['Faturasız',6],['Pure Upsell',5],['IPTV Spor/Sinema/Süper',8]
  ],
  sources:[
    {name:'Mobil Detay',status:'Hazır',detail:'26 Eylül · aktif/deaktif + tarife/işlem'},
    {name:'DSL Detay',status:'Hazır',detail:'26 Eylül · hız + taahhüt + upsell + spin'},
    {name:'TV Detay',status:'Hazır',detail:'26 Eylül · IPTV / DTH + paket'},
    {name:'Cihaz Detay',status:'Hazır',detail:'26 Eylül · Akıllı / Tablet / Diğer'},
    {name:'Hedef & Performans',status:'Hazır',detail:'Eylül 2026 · hedef + gerçekleşen'},
    {name:'BPP Baz Tutar',status:'Hazır',detail:'Önceki rapor + manuel iki şube'},
    {name:'Cihaz Sınıflandırması',status:'Hazır',detail:'Eylül Odak / Premium / Standart'},
    {name:'Gelir Paylaşımı',status:'Sonraki faz',detail:'Tarife fiyatı / ARPU verisi gerekli'}
  ]
};
