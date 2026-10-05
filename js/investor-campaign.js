/* Duyuru 0023709 · October 2026 · branch-level, month-end forecast estimates.
   Quantities and targets are used only in calculations, never in shared markup. */
var IC_PERIOD = '2026-10';
var IC_BRANCHES = [
  ['4100089','Kılavuzlar','Kırıkkale'],['4052718','Asis','Samsun'],['4100781','Asis','Çorum'],['4054927','Eymen','Çankırı'],['4036313','Bakan Telekom','Tokat'],
  ['4100729','Primetech','Samsun'],['4100778','Primetech','Tokat'],['4100760','Öztürk','Kırşehir'],['4057503','Öztürk','Kırşehir'],['4100676','Primetech','Samsun'],
  ['7000045','Gül Telekom','Çorum'],['7100063','Primetech','Samsun'],['4100641','Asis','Sinop'],['500733','Bıyıkoğlu','Samsun'],['4100785','Bakan Telekom','Amasya'],['4100784','Bakan Telekom','Amasya'],
  ['502046','İlk İletişim','Samsun'],['4100776','Yağmuroğlu','Tokat'],['4100087','Kılavuzlar','Kırıkkale'],['4100343','Yağmuroğlu','Tokat'],['501699','Taş-Ka','Yozgat'],['4100170','Asis','Samsun'],['4100990','Primetech','Samsun']
];
var icResizeObserver = null;
function icEsc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function icPeriod(value) { var m=String(value||'').match(/^(\d{4})[/-]?(\d{2})$/);return m ? m[1]+'-'+m[2] : null; }
function icNumber(value) { return typeof value==='number' && Number.isFinite(value) && value>=0 ? value : null; }
function icDays(value) {
  var d=value && icNumber(value.d),t=value && icNumber(value.t);
  return d>0 && t>0 && d<=t ? {d:d,t:t,k:t/d} : null;
}
function icForecast(source,fallback) {
  var report=icDays(source && source.forecastDays);
  if(report) {report.source='Rapor';return report;}
  var manual=icDays(fallback);
  if(manual)manual.source='Ayarlar';
  return manual;
}
function icMetric(dealer,key) {
  if(!dealer)return null;
  var rawActual=dealer.campaignActuals,rawTarget=dealer.campaignTargets,prods=dealer.prods||{};
  function part(product) {
    var metric=prods[product]||{};
    return {a:icNumber(rawActual ? rawActual[product] : metric.a),h:icNumber(rawTarget ? rawTarget[product] : metric.h)};
  }
  if(key==='Toplam Mobil') {
    var p=part('Postpaid'),q=part('Prepaid');
    if(p.a!=null && q.a!=null && p.h!=null && q.h!=null && p.h+q.h>0)return {a:p.a+q.a,h:p.h+q.h};
    // Legacy detail snapshots may contain only the combined product.
    if(!rawActual && !rawTarget && !prods.Postpaid && !prods.Prepaid) {
      var combined=part(key);return combined.a!=null && combined.h>0 ? combined : null;
    }
    return null;
  }
  var metric=part(key);return metric.a!=null && metric.h>0 ? metric : null;
}
function icRound(value) { return Math.floor(value+0.5+1e-9); }
function icReward(quantity,dsl,mobil) {
  if(quantity==null || dsl==null || mobil==null)return {reward:null,status:'Veri eksik',tone:'pending'};
  if(mobil<100)return {reward:0,status:dsl<95?'DSL + Mobil eksik':'Mobil eksik',tone:'waiting'};
  if(dsl>=100) {
    if(quantity<40)return {reward:0,status:'Ön koşul eksik',tone:'waiting'};
    var quantityTier=quantity>=60?2:quantity>=50?1:0;
    var hgoTier=dsl>=120?2:dsl>=110?1:0;
    return {reward:30000+5000*(quantityTier+hgoTier),status:'Ödül',tone:'reward'};
  }
  // The notice's example B (39 DSL, 105%/110%) receives no award.
  // The incentive applies to the 95–99% DSL band, with Mobil at least 100%.
  if(dsl>=95)return {reward:15000,status:'Teşvik ödülü',tone:'incentive'};
  return {reward:0,status:'DSL eksik',tone:'waiting'};
}
function icModel(source,period,fallback) {
  var valid=!!source && icPeriod(source.period||period)===IC_PERIOD;
  var forecast=valid ? icForecast(source,fallback) : null;
  var rows=IC_BRANCHES.map(function(branch){
    var dealer=valid && (source.bayiler||{})[branch[0]];
    if(dealer && dealer.bolge && String(dealer.bolge).trim().toLocaleUpperCase('tr-TR')!=='KUZEY ANADOLU')dealer=null;
    var dsl=icMetric(dealer,'DSL'),mobil=icMetric(dealer,'Toplam Mobil');
    // Round HGO once, from exact activation/target ratios, after projecting.
    var dslHgo=forecast && dsl ? icRound(dsl.a/dsl.h*100*forecast.k) : null;
    var mobilHgo=forecast && mobil ? icRound(mobil.a/mobil.h*100*forecast.k) : null;
    var projectedDsl=forecast && dsl ? icRound(dsl.a*forecast.k) : null;
    var estimate=icReward(projectedDsl,dslHgo,mobilHgo);
    if(!valid)estimate={reward:null,status:'Rapor bekleniyor',tone:'pending'};
    else if(!forecast)estimate={reward:null,status:'Forecast gerekli',tone:'pending'};
    return {code:branch[0],name:branch[1],city:branch[2],dsl:dslHgo,mobil:mobilHgo,reward:estimate.reward,status:estimate.status,tone:estimate.tone};
  });
  rows.sort(function(a,b){
    return (a.reward==null)-(b.reward==null) || (b.reward||0)-(a.reward||0) ||
      (b.dsl==null?-1:b.dsl)-(a.dsl==null?-1:a.dsl) || (b.mobil==null?-1:b.mobil)-(a.mobil==null?-1:a.mobil);
  });
  return {valid:valid,forecast:forecast,rows:rows};
}
function icPercent(value) { return value==null?'—':'%'+value.toLocaleString('tr-TR'); }
function icMoney(value) { return value==null || value===0 ? '—' : value.toLocaleString('tr-TR')+' TL'; }
function icRow(row) {
  return '<tr><td class="ic-code">'+icEsc(row.code)+'</td><td class="ic-dealer"><strong>'+icEsc(row.name)+'</strong><small>'+icEsc(row.city)+'</small></td>'+
    '<td><span class="ic-percent">'+icPercent(row.dsl)+'</span></td><td><span class="ic-percent">'+icPercent(row.mobil)+'</span></td>'+
    '<td class="ic-money">'+icMoney(row.reward)+'</td><td><span class="ic-status ic-'+row.tone+'">'+icEsc(row.status)+'</span></td></tr>';
}
function icDateLabel(source,valid) {
  var date=valid && source && source.reportDate;
  return /^2026-10-(0[1-9]|[12]\d|3[01])$/.test(date||'') ? new Date(date+'T12:00:00Z').toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'}) : 'EKİM 2026';
}
function icCardHTML(model,source) {
  var date=icDateLabel(source,model.valid),reportState=!model.valid?'EKİM RAPORU BEKLENİYOR':!model.forecast?'FORECAST BEKLENİYOR':'AY SONU FORECAST';
  return '<section id="investor-campaign-card" class="ic-card" aria-label="Ekim Yatırımcı Kampanyası · 23 bayi">'+
    '<header class="ic-header"><div class="ic-heading"><span class="ic-region">KUZEY ANADOLU</span><h1>EKİM YATIRIMCI KAMPANYASI</h1><p>Şimdi İnternet Zamanı · Günlük Takip</p></div><div class="ic-meta"><strong>'+icEsc(date)+'</strong><span>'+reportState+'</span><small>23 BAYİ · ÖDÜLE GÖRE SIRALAMA</small></div></header>'+
    '<main class="ic-table-wrap"><table class="ic-table"><colgroup><col style="width:14%"><col style="width:22%"><col style="width:14%"><col style="width:14%"><col style="width:17%"><col style="width:19%"></colgroup><thead><tr><th>Bayi kodu</th><th>Bayi / İl</th><th>DSL HGO<small>Forecast</small></th><th>Mobil HGO<small>Forecast</small></th><th>Tahmini ödül</th><th>Durum</th></tr></thead><tbody>'+model.rows.map(icRow).join('')+'</tbody></table></main>'+
    '<footer class="ic-footer"><b>HGO: Hedef gerçekleştirme oranı.</b><span>Ay sonu forecastına göre tahmini ödül. Dönem sonu kampanya kontrollerine tabidir.</span></footer></section>';
}
function icCardHeight(card) { return Math.ceil(Math.max(1536,card.offsetHeight||0,card.scrollHeight||0)); }
function icFitCard() {
  var wrap=document.getElementById('ic-preview'),card=document.getElementById('investor-campaign-card');if(!wrap||!card)return;
  var scale=Math.min(1,wrap.clientWidth/1024);card.style.transform='scale('+scale+')';wrap.style.height=icCardHeight(card)*scale+'px';
}
function renderInvestorCampaign() {
  var cards=document.getElementById('cards');if(!cards)return;
  var source=typeof DETAY!=='undefined'?DETAY:null,period=typeof DONEM!=='undefined'?DONEM:null;
  var model=icModel(source,period,typeof fc==='function'?fc():null);
  var missing=model.rows.filter(function(row){return row.reward==null;}).length;
  var hint=!model.valid?'Ekim 2026 TTM raporunu Ayarlar’dan yükleyin.':!model.forecast?'Raporda çalışma günleri bulunamadı. Ayarlar’daki Forecast bilgilerini girin.':missing?missing+' bayi için veri eksik; eksik değerler tahmin edilmez.':'23 bayinin ay sonu forecastına göre tahmini ödülleri hesaplandı.';
  cards.className='cards single ic-page';cards.style.maxWidth='1120px';
  cards.innerHTML='<div class="ic-actions"><div><b>Ekim Yatırımcı Kampanyası</b><small>'+icEsc(hint)+'</small><small>HGO ve ödüller ay sonu forecastına göre hesaplanır. Adet ve hedef sayıları paylaşılmaz.</small></div><button id="ic-download" onclick="downloadInvestorCampaignPNG()">Görseli indir / paylaş</button></div>'+
    '<div id="ic-preview" class="ic-preview">'+icCardHTML(model,source)+'</div>';
  if(icResizeObserver)icResizeObserver.disconnect();
  if(typeof ResizeObserver!=='undefined'){icResizeObserver=new ResizeObserver(icFitCard);icResizeObserver.observe(document.getElementById('ic-preview'));}
  icFitCard();
}
async function downloadInvestorCampaignPNG() {
  var button=document.getElementById('ic-download'),wrapper=null;
  try {
    if(button){button.disabled=true;button.textContent='Görsel hazırlanıyor…';}
    if(document.fonts && document.fonts.ready)await document.fonts.ready;
    var card=document.getElementById('investor-campaign-card');if(!card)throw new Error('Kampanya görseli bulunamadı');
    var result=await createCleanExportClone(card,1024);wrapper=result.wrapper;
    result.clone.style.width='1024px';result.clone.style.height='auto';result.clone.style.overflow='visible';
    var height=icCardHeight(result.clone);wrapper.style.height=height+'px';
    var canvas=await captureExportImage(result.clone,{scale:3,width:1024,height:height,backgroundColor:'#fff'});
    var source=typeof DETAY!=='undefined'?DETAY:null,date=source && source.reportDate;
    var fileDate=/^2026-10-(0[1-9]|[12]\d|3[01])$/.test(date||'')?date:'2026-10';
    _openSharePreview(canvas.toDataURL('image/png'),'Ekim_Yatirimci_Kampanyasi_'+fileDate+'.png');
  } catch(error){alert('Görsel oluşturulamadı: '+error.message);}
  finally{cleanupExportClone(wrapper);if(button){button.disabled=false;button.textContent='Görseli indir / paylaş';}}
}
