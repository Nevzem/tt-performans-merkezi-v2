# Kasım 2026 TTM Kampanya Takibi

## Kapsam
- Ekim yatırımcı / Ekim grup kampanyalarının sekmeleri ve aktif yüklemeleri devre dışı.
- Geçmiş Ekim hesaplama dosyaları repo geçmişinde ve kaynakta korunur, **aktif sayfada çalıştırılmaz**.
- Ekim kurallarına bağlı Kupa Bende sekmesi, yeni dönem ödül/puan kuralı açıklanıncaya kadar aktif menüden gizlidir.
- Performans > Kasım Kampanyaları: DSL adet, DSL/Mobil HGO, ay sonu forecast; şube bazında paket yükleme payı, Ekim bazına göre yüzde puan değişimi; CSV dışa aktarma.

## Veri kaynağı
- HGO ve DSL adetleri **sadece 2026/11** dönemine ait kullanıcı tarafından yüklenen Excel raporundan alınır. Önceki dönem ya da örnek veriler sonuç olarak kullanılmaz.
- Forecast, geçerli Kasım raporunun çalışma günü bilgisi veya manuel çalışma günleri girilmişse görünür.
- Özel paket Kasım adetleri ve Ekim ayı payı raporun standart kolonlarında bulunmadığından **manuel** girilir, sadece aynı tarayıcıdaki localStorage'da saklanır. Cihazlar arasında eşitleme yoktur, CSV ile dışarı alınmalıdır.
- Geçmiş Ekim paket satış payı, Ekim kampanya puanlarından türetilemez; ayrı veri gerektirir.

## Güvenlik / hak ediş
Depo herkese açık. Şirket içi kampanya tabloları, ödül şartları, PRM/personel listeleri, ticari veriler bu repoda paylaşılmamalıdır. Ekran yalnızca **ön takip** gösterir. Nihai hak ediş için gün/PRM uygunluğu, çalışan-şube eşleşmesi, kampanya kapsamı ve resmî mutabakat ayrıca doğrulanmalıdır. Kesin ödül vaat edilmez.

## Kasım sonrası
- Yetkili ve erişim kontrollü ortama resmi barem kuralları girilmesi.
- Ekim baz ve Kasım özel paket adetlerinin düzenli veri kaynağına bağlanması.
- Rol/kullanıcı bazlı ödül takip ve resmî kapanış iş akışı.
