/* Kasım 2026 TTM kampanya takibi.
 * Yalnızca gerçekleşen/forecast performans göstergeleri; resmî ödül baremleri
 * ve PRM hakediş kontrolleri kamuya açık kod deposunda tutulmaz.
 * Özel paket adetleri cihaz üzerinde (localStorage) saklanır.
 */
var novCampaignTab = 'hgo';
var NOV_CAMPAIGN_MONTH = '2026-11';
var NOV_PACKET_KEY = 'ttpm_nov2026_packet_v1';

function novEsc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
    return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c];
  });
}
function novNum(value) {
  var num = Number(value);
  return value == null || value === '' || !Number.isFinite(num) || num < 0 ? null : num;
}
function novInt(value) {
  var n = novNum(value);
  return n != null && Number.isInteger(n) ? n : null;
}
function novFormat(value, digits) {
  return value == null || !Number.isFinite(value) ? '—' :
    Number(value).toLocaleString('tr-TR', {minimumFractionDigits:digits||0, maximumFractionDigits:digits||0});
}
function novPct(value) { return value == null ? '—' : '%' + novFormat(value, 1); }
function novValidPeriod() {
  var report = typeof DETAY !== 'undefined' && DETAY ? DETAY : null;
  var period = typeof DONEM !== 'undefined' ? DONEM : '';
  return !!report && String(report.period||period).replace('/', '-') === NOV_CAMPAIGN_MONTH &&
    String(period).replace('/', '-') === NOV_CAMPAIGN_MONTH;
}
function novMetric(dealer, key) {
  if (!dealer) return {a:null, h:null, ratio:null};
  var actuals = dealer.campaignActuals, targets = dealer.campaignTargets;
  var products = dealer.prods || {};
  function part(k) {
    var p = products[k] || {};
    return {
      a: novNum(actuals ? actuals[k] : p.a),
      h: novNum(targets ? targets[k] : p.h)
    };
  }
  var result;
  if (key === 'Toplam Mobil') {
    var f = part('Postpaid'), s = part('Prepaid');
    result = {a:f.a==null||s.a==null?null:f.a+s.a, h:f.h==null||s.h==null?null:f.h+s.h};
    if (!actuals && !targets && !products.Postpaid && !products.Prepaid) result = part('Toplam Mobil');
  } else result = part(key);
  result.ratio = result.a!=null && result.h>0 ? result.a/result.h*100 : null;
  return result;
}
function novDays() {
  if (!novValidPeriod()) return null;
  var days = typeof DETAY !== 'undefined' && DETAY ? DETAY.forecastDays : null;
  if (!days || !novNum(days.d) || !novNum(days.t) || Number(days.d)>Number(days.t)) {
    days = typeof fc === 'function' ? fc() : null;
  }
  var d = novNum(days && days.d), t = novNum(days && days.t);
  return d>0 && t>=d ? {d:d,t:t,factor:t/d} : null;
}
function novDealers() {
  var source = typeof DETAY !== 'undefined' && DETAY && DETAY.bayiler ? DETAY.bayiler : {};
  var valid = novValidPeriod();
  var days = novDays();
  return Object.keys(source).map(function(code) {
    var dealer = source[code];
    var dsl = novMetric(valid ? dealer : null, 'DSL');
    var mobil = novMetric(valid ? dealer : null, 'Toplam Mobil');
    return {
      code:String(code), name:String(dealer.b||'—'), city:String(dealer.il||''),
      dsl:dsl, mobil:mobil,
      dslForecast:days && dsl.ratio!=null ? dsl.ratio*days.factor : null,
      mobilForecast:days && mobil.ratio!=null ? mobil.ratio*days.factor : null
    };
  }).sort(function(a,b) {return a.city.localeCompare(b.city,'tr') || a.code.localeCompare(b.code,'tr');});
}
function novPacketRead() {
  try {
    var r = JSON.parse(localStorage.getItem(NOV_PACKET_KEY)||'{}');
    return r && typeof r === 'object' && !Array.isArray(r) ? r : {};
  } catch(e) {return {};}
}
function novPacketUpdate(code, field, raw) {
  if (!['special','total','octShare'].includes(field)) return;
  var n = raw.trim() === '' ? null : novNum(raw);
  if (n != null && (field === 'octShare' ? n>100 : !Number.isInteger(n))) {
    alert('Lütfen geçerli bir sayı girin.'); renderNovemberCampaign(); return;
  }
  if (raw.trim() !== '' && n == null) {
    alert('Negatif veya geçersiz sayı girilemez.'); renderNovemberCampaign(); return;
  }
  var data = novPacketRead();
  if (!data[code]) data[code] = {};
  if (n == null) delete data[code][field];
  else data[code][field] = n;
  try {localStorage.setItem(NOV_PACKET_KEY, JSON.stringify(data));}
  catch(e) {alert('Bu cihazda veri saklanamadı.');}
  renderNovemberCampaign();
}
function novPacketStats(packet) {
  var s = novInt(packet.special), t = novInt(packet.total), old = novNum(packet.octShare);
  var valid = s != null && t != null && t > 0 && s <= t;
  var share = valid ? Math.round((s/t*100 + Number.EPSILON)*100)/100 : null;
  return {share:share, diff:share!=null && old!=null ? share-old : null,
    warning:s!=null && t!=null && s>t ? 'Adetleri kontrol edin' : null};
}
function novPacketInput(code,field,value,label) {
  var step = field==='octShare' ? '0.01' : '1';
  return '<input class="nv-input" type="number" inputmode="decimal" min="0" '+(field==='octShare'?'max="100" ':'')+
    'step="'+step+'" aria-label="'+novEsc(label)+'" placeholder="—" value="'+
    (value == null ? '' : novEsc(value))+'" onchange="novPacketUpdate(\''+novEsc(code)+'\',\''+field+'\',this.value)">';
}
function novHgoTable(rows) {
  return '<div class="nv-table-wrap"><table class="nv-table"><thead><tr><th>TTM / Şube</th><th>DSL<br>Adet</th><th>DSL<br>HGO</th><th>Mobil<br>HGO</th><th>DSL<br>Forecast</th><th>Mobil<br>Forecast</th></tr></thead><tbody>'+
    rows.map(function(r){
      return '<tr><td class="nv-branch"><b>'+novEsc(r.name)+'</b><small>'+novEsc(r.code)+' · '+novEsc(r.city)+'</small></td>'+
      '<td>'+novFormat(r.dsl.a)+'</td><td>'+novPct(r.dsl.ratio)+'</td><td>'+novPct(r.mobil.ratio)+
      '</td><td>'+novPct(r.dslForecast)+'</td><td>'+novPct(r.mobilForecast)+'</td></tr>';
    }).join('')+'</tbody></table></div>';
}
function novPacketTable(rows) {
  var saved=novPacketRead();
  var ordered=rows.slice().sort(function(a,b){
    var x=novPacketStats(saved[a.code]||{}).share, y=novPacketStats(saved[b.code]||{}).share;
    return (x==null)-(y==null) || (y||0)-(x||0) || a.code.localeCompare(b.code,'tr');
  });
  return '<div class="nv-table-wrap"><table class="nv-table nv-packet-table"><thead><tr><th>TTM / Şube</th><th>Kasım<br>Özel Adet</th><th>Kasım<br>Toplam Adet</th><th>Ekim<br>Pay %</th><th>Kasım<br>Pay %</th><th>Değişim<br>yp</th></tr></thead><tbody>'+
    ordered.map(function(r){
      var v=saved[r.code]||{}, st=novPacketStats(v);
      var diff=st.diff==null?'—':(st.diff>0?'+':'')+novFormat(st.diff,2);
      return '<tr><td class="nv-branch"><b>'+novEsc(r.name)+'</b><small>'+novEsc(r.code)+' · '+novEsc(r.city)+'</small></td>'+
        '<td>'+novPacketInput(r.code,'special',v.special,r.code+' Kasım özel paket adedi')+'</td>'+
        '<td>'+novPacketInput(r.code,'total',v.total,r.code+' Kasım toplam paket adedi')+'</td>'+
        '<td>'+novPacketInput(r.code,'octShare',v.octShare,r.code+' Ekim özel paket payı')+'</td>'+
        '<td><b>'+novPct(st.share)+'</b></td><td class="'+(st.diff==null?'':st.diff>=0?'nv-positive':'nv-negative')+'">'+(st.warning?novEsc(st.warning):diff)+'</td></tr>';
    }).join('')+'</tbody></table></div>';
}
function novSetCampaignTab(tab) {
  novCampaignTab = tab==='packet' ? 'packet' : 'hgo';
  renderNovemberCampaign();
}
function novCSVCell(value) {return '"'+String(value == null ? '' : value).replace(/"/g,'""')+'"';}
function novExportCSV() {
  var rows=novDealers(), cells=[];
  if (novCampaignTab==='packet') {
    var packets=novPacketRead();
    cells.push(['Bayi Kodu','Bayi','İl','Kasım Özel Paket','Kasım Toplam Paket','Ekim Pay %','Kasım Pay %','Fark yp']);
    rows.forEach(function(r){var p=packets[r.code]||{}, s=novPacketStats(p);
      cells.push([r.code,r.name,r.city,p.special,p.total,p.octShare,s.share,s.diff]);});
  } else {
    cells.push(['Bayi Kodu','Bayi','İl','DSL Adet','DSL Hedef','DSL HGO %','Mobil Adet','Mobil Hedef','Mobil HGO %','DSL Forecast %','Mobil Forecast %']);
    rows.forEach(function(r){cells.push([r.code,r.name,r.city,r.dsl.a,r.dsl.h,r.dsl.ratio,r.mobil.a,r.mobil.h,r.mobil.ratio,r.dslForecast,r.mobilForecast]);});
  }
  var csv='\uFEFF'+cells.map(function(row){return row.map(novCSVCell).join(';');}).join('\r\n');
  var url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  var link=document.createElement('a');
  link.href=url; link.download='TTM_Kasim_2026_'+(novCampaignTab==='packet'?'Ozel_Paket':'HGO')+'.csv';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},1000);
}
function renderNovemberCampaign() {
  var cards=document.getElementById('cards');
  if (!cards) return;
  var rows=novDealers(),days=novDays(),valid=novValidPeriod();
  var ready=rows.filter(function(r){return r.dsl.ratio!=null && r.mobil.ratio!=null;}).length;
  var packetRecords=novPacketRead();
  var packetReady=rows.filter(function(r){return novPacketStats(packetRecords[r.code]||{}).share!=null;}).length;
  var current=novCampaignTab==='packet'?'packet':'hgo';
  cards.className='cards single nv-page';cards.style.maxWidth='1200px';
  cards.innerHTML='<section class="nv-shell">'+
    '<header class="nv-hero"><div class="nv-eyebrow">KUZEY ANADOLU · TTM</div><h2>KASIM 2026 <span>KAMPANYA TAKİBİ</span></h2>'+
    '<p>Şube performansı, hedef gerçekleşme oranları ve özel paket payı</p></header>'+
    '<div class="nv-stats"><div class="nv-stat"><small>ŞUBE</small><strong>'+novFormat(rows.length)+'</strong></div>'+
    '<div class="nv-stat"><small>HGO VERİSİ HAZIR</small><strong>'+novFormat(ready)+' / '+novFormat(rows.length)+'</strong></div>'+
    '<div class="nv-stat"><small>ÖZEL PAKET VERİSİ</small><strong>'+novFormat(packetReady)+' / '+novFormat(rows.length)+'</strong></div>'+
    '<div class="nv-stat"><small>FORECAST GÜNLERİ</small><strong>'+(days?days.d+' / '+days.t:'—')+'</strong></div></div>'+
    '<div class="nv-tabs" role="group" aria-label="Kasım kampanya takip bölümü">'+
    '<button type="button" class="'+(current==='hgo'?'nv-selected':'')+'" onclick="novSetCampaignTab(\'hgo\')">HGO &amp; DSL Adet</button>'+
    '<button type="button" class="'+(current==='packet'?'nv-selected':'')+'" onclick="novSetCampaignTab(\'packet\')">Özel Paket Payı</button></div>'+
    '<div class="nv-description"><div><h3>'+(current==='hgo'?'Mobil / DSL Performansı':'Müşteriye Özel Paket Takibi')+'</h3>'+
    '<p>'+(current==='hgo'?
      (valid?'Kasım raporu üzerinden gerçekleşen ve ay sonu tahmini HGO ayrı gösterilir.':'Kasım 2026 satış raporu yüklenmedi. Eski dönem verisi Kasım puanı gibi kullanılmaz.') :
      'Kasım özel ve toplam yükleme adetlerini, Ekim payı ile birlikte girin. Veriler yalnızca bu tarayıcıda saklanır.')+
    '</p></div><button type="button" class="nv-export" onclick="novExportCSV()">CSV dışa aktar</button></div>'+
    (current==='hgo'?novHgoTable(rows):novPacketTable(rows))+
    '<footer class="nv-foot"><b>Önemli:</b> Bu ekran ön takip içindir; ödül/hakediş kesinleştirmez. Personelin çalışma günü, PRM durumu, bayi uygunluğu ve resmî mutabakat ayrıca kontrol edilmelidir.'+
    '<div>Kaynak rapor: '+(valid?'Kasım 2026':'Kasım 2026 bekleniyor')+' · Tahmin yalnızca çalışma günü verisi varsa hesaplanır.</div></footer>'+
    '</section>';
}
