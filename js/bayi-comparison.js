/* Bayi / TTM region / TTM Türkiye activation growth. Never derive growth from HGO.
 * Partial months require an exact calendar-day snapshot; missing data stays null. */
var BC_PRODUCTS=[
  {key:'postpaid',source:'Postpaid',name:'Faturalı',color:'#1684ed'},
  {key:'prepaid',source:'Prepaid',name:'Faturasız',color:'#8152dc'},
  {key:'mobil',source:'Toplam Mobil',name:'Toplam Mobil',color:'#09b9dc'},
  {key:'dsl',source:'DSL',name:'DSL',color:'#f08c24'},
  {key:'iptv',source:'IPTV',name:'IPTV',color:'#7b43d7'},
  {key:'uydu',source:'Uydu',name:'Uydu TV',color:'#eab021'},
  {key:'akilliCihaz',source:'Akıllı Cihaz',name:'Cihaz',color:'#09a9a7'},
  {key:'digerCihaz',source:'Diğer Cihaz',name:'Diğer Cihaz',color:'#647a9a'}
];
var BC_PERIOD='',BC_DEALER='',BC_PRODUCT='mobil',BC_BUSY=false,BC_READY=false,BC_LOADING=null;
var BC_DATA=null,BC_DATA_PROMISE=null,BC_BASIS='actual';
var BC_STORE='tt_bayi_comparison_snapshots_v1',BC_SNAPSHOTS=null,BC_STORAGE_NOTE='';
function bcEsc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function bcQty(v){return typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?v:null;}
function bcNorm(v){return String(v||'').trim().toLocaleUpperCase('tr-TR');}
function bcEnd(period){return period+'-'+String(new Date(Date.UTC(+period.slice(0,4),+period.slice(5),0)).getUTCDate()).padStart(2,'0');}
function bcValidDate(date){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date)))return false;
  var d=new Date(date+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===date;
}
function bcShort(name){return String(name||'').trim().split(/\s+/).slice(0,2).join(' ');}
function bcPeriodName(period){return merPeriodLabel(period);}
function bcDateName(date){return new Date(date+'T12:00:00Z').toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});}
function bcSnapshot(source,reportDate){
  if(!source||source.sample||!source.ttm||!/^\d{4}-\d{2}$/.test(source.period||''))return null;
  var date=source.closed?bcEnd(source.period):(source.ttm.reportDate||reportDate);
  if(!bcValidDate(date)||date.slice(0,7)!==source.period)return null;
  var seen=new Set(),dealers=[];
  Object.values(source.ttm.bayiler||{}).forEach(function(d){
    var code=String(d.kod||'');if(!/^\d+$/.test(code)||seen.has(code))return;seen.add(code);
    var values={};BC_PRODUCTS.forEach(function(p){values[p.key]=bcQty(d.prods&&d.prods[p.source]&&d.prods[p.source].a);});
    dealers.push({code:code,name:String(d.fullName||d.b||code),region:String(d.bolge||'KUZEY ANADOLU'),values:values});
  });
  if(!dealers.length)return null;
  var totals=source.matrix&&source.matrix.activationTotals,tr={};
  BC_PRODUCTS.forEach(function(p){tr[p.key]=totals&&totals.channel==='TTM'?bcQty(totals.tr&&totals.tr[p.key]):null;});
  var sy=source.sy||{},elapsed=bcQty(sy.calisilanGun),total=bcQty(sy.calismaGun);
  return {period:source.period,date:date,closed:!!source.closed,dealers:dealers,tr:tr,forecastFactor:elapsed>0&&total>=elapsed?total/elapsed:null};
}
async function bcLoadData(){
  if(BC_DATA)return BC_DATA;if(BC_DATA_PROMISE)return BC_DATA_PROMISE;
  BC_DATA_PROMISE=(async function(){
    try{var response=await fetch('./data/history/bayi-comparison-data.json?v=20261021-bc2',{cache:'no-cache'});if(!response.ok)throw Error('Comparison history unavailable');var data=await response.json();if(data.channel!=='TTM'||!Array.isArray(data.snapshots))throw Error('Invalid comparison history');BC_DATA=data;return data;}
    catch(e){return null;}finally{BC_DATA_PROMISE=null;}
  })();return BC_DATA_PROMISE;
}
function bcSaved(){
  if(BC_SNAPSHOTS!==null)return BC_SNAPSHOTS;
  try{BC_SNAPSHOTS=JSON.parse(localStorage.getItem(BC_STORE)||'{}')||{};}catch(e){BC_SNAPSHOTS={};}
  return BC_SNAPSHOTS;
}
function bcCaptureSource(source){
  var snap=bcSnapshot(source);if(!snap)return;
  var saved=bcSaved();saved[snap.date]=snap;
  Object.keys(saved).sort().slice(0,-400).forEach(function(date){delete saved[date];});
  try{localStorage.setItem(BC_STORE,JSON.stringify(saved));BC_STORAGE_NOTE='';}
  catch(e){BC_STORAGE_NOTE='Günlük karşılaştırma kesiti bu cihazda saklanamadı.';}
}
function bcMergeSnapshot(snap,previous){
  if(!previous||previous.date!==snap.date)return snap;
  var tr=Object.assign({},snap.tr);BC_PRODUCTS.forEach(function(p){if(tr[p.key]==null)tr[p.key]=bcQty(previous.tr&&previous.tr[p.key]);});
  return Object.assign({},snap,{tr:tr,forecastFactor:snap.forecastFactor||previous.forecastFactor||null});
}
function bcSources(){
  var byDate={};
  if(BC_DATA&&BC_DATA.channel==='TTM')BC_DATA.snapshots.forEach(function(s){if(s&&bcValidDate(s.date)&&Array.isArray(s.dealers)&&s.period===s.date.slice(0,7))byDate[s.date]=s;});
  Object.values(bcSaved()).forEach(function(s){if(s&&bcValidDate(s.date)&&Array.isArray(s.dealers)&&s.period===s.date.slice(0,7))byDate[s.date]=bcMergeSnapshot(s,byDate[s.date]);});
  var periods=new Set(Object.keys(typeof HIST2_DATA==='undefined'?{}:HIST2_DATA).concat(Object.keys(MER_ARCHIVES||{})));
  if(MER_LIVE&&!MER_LIVE.sample)periods.add(MER_LIVE.period);
  periods.forEach(function(period){
    var source=merSourceAt(period),doc=typeof HIST2_DATA==='undefined'?null:HIST2_DATA[period];
    var snap=bcSnapshot(source,doc&&doc.reportDate);if(snap){
      // A published exact-day national count can complete an older local upload.
      byDate[snap.date]=bcMergeSnapshot(snap,byDate[snap.date]);
    }
  });
  if(BC_DATA&&BC_DATA.channel==='TTM')Object.values(byDate).forEach(function(s){
    var national=BC_DATA.periods&&BC_DATA.periods[s.period];
    if(national&&national.channel==='TTM'&&national.reportDate===s.date){var tr=Object.assign({},s.tr);BC_PRODUCTS.forEach(function(p){if(tr[p.key]==null)tr[p.key]=bcQty(national.values&&national.values[p.key]);});byDate[s.date]=Object.assign({},s,{tr:tr});}
  });
  return Object.values(byDate).sort(function(a,b){return a.date.localeCompare(b.date);});
}
function bcAt(sources,period,day){
  var date=day==null?bcEnd(period):period+'-'+String(Math.min(day,+bcEnd(period).slice(8))).padStart(2,'0');
  return sources.find(function(s){return s.date===date&&(day!=null||s.closed);})||null;
}
function bcValue(snapshot,scope,code,region,key){
  if(!snapshot)return null;
  if(scope==='tr')return bcQty(snapshot.tr&&snapshot.tr[key]);
  var rows=snapshot.dealers.filter(function(d){return scope==='dealer'?d.code===code:bcNorm(d.region)===bcNorm(region);});
  if(!rows.length)return null;
  var total=0;
  for(var i=0;i<rows.length;i++){var value=bcQty(rows[i].values&&rows[i].values[key]);if(value===null)return null;total+=value;}
  return Number.isSafeInteger(total)?total:null;
}
function bcGrowth(current,previous,reason){
  if(current==null||previous==null)return {value:null,current:current,previous:previous,reason:reason||'Aktivasyon adedi bulunamadı.'};
  if(previous===0)return {value:null,current:current,previous:previous,reason:'Önceki dönem 0; yüzde değişim hesaplanamaz.'};
  return {value:(current/previous-1)*100,current:current,previous:previous,reason:''};
}
function bcMetric(sources,current,scope,code,region,key,metric,basis){
  var estimated=basis==='forecast'&&!current.closed;
  if(estimated&&!(typeof current.forecastFactor==='number'&&isFinite(current.forecastFactor)&&current.forecastFactor>=1))return bcGrowth(null,null,'Ay sonu tahmini için raporun çalışılan/toplam gün bilgisi yok.');
  var year=+current.period.slice(0,4),month=+current.period.slice(5),day=current.closed||estimated?null:+current.date.slice(8);
  var now=bcValue(current,scope,code,region,key),before,previous,currentTotal=0,previousTotal=0;
  if(estimated&&now!=null)now=Math.round(now*current.forecastFactor);
  if(metric!=='YTD'){
    before=merShift(current.period,metric==='YoY'?-12:-1);previous=bcAt(sources,before,day);
    return Object.assign(bcGrowth(now,bcValue(previous,scope,code,region,key),previous?'Aktivasyon adedi bulunamadı.':(day==null?'Dönem kapanış verisi yok: ':'Aynı gün kesiti yok: ')+before),{estimated:estimated});
  }
  for(var i=1;i<=month;i++){
    var suffix='-'+String(i).padStart(2,'0'),a=i===month?current:bcAt(sources,year+suffix,null);
    var b=bcAt(sources,(year-1)+suffix,i===month?day:null);
    var av=i===month?now:bcValue(a,scope,code,region,key),bv=bcValue(b,scope,code,region,key);
    if(av==null||bv==null)return bcGrowth(null,null,'YTD için '+(av==null?year:year-1)+suffix+' aktivasyon verisi veya aynı gün kesiti eksik.');
    currentTotal+=av;previousTotal+=bv;
  }
  return Object.assign(bcGrowth(currentTotal,previousTotal),{estimated:estimated});
}
function bcModel(){
  var sources=bcSources(),periods=Array.from(new Set(sources.map(function(s){return s.period;}))).sort().reverse();
  if(!periods.includes(BC_PERIOD)){
    // Start with usable closing comparisons, rather than an unaligned daily report.
    var closing=sources.filter(function(s){return s.closed;});BC_PERIOD=closing.length?closing[closing.length-1].period:periods[0]||'';
  }
  var options=sources.filter(function(s){return s.period===BC_PERIOD;}),current=options[options.length-1];
  if(!current)return {sources:sources,periods:periods,current:null,dealers:[],rows:[]};
  var dealers=current.dealers.slice().sort(function(a,b){return bcShort(a.name).localeCompare(bcShort(b.name),'tr')||a.code.localeCompare(b.code);});
  if(!dealers.some(function(d){return d.code===BC_DEALER;}))BC_DEALER=dealers.some(function(d){return d.code==='4057503';})?'4057503':dealers[0].code;
  var dealer=dealers.find(function(d){return d.code===BC_DEALER;});
  var rows=BC_PRODUCTS.map(function(p){var metrics={};['YTD','YoY','MoM'].forEach(function(metric){metrics[metric]={};['dealer','region','tr'].forEach(function(scope){metrics[metric][scope]=bcMetric(sources,current,scope,dealer.code,dealer.region,p.key,metric,BC_BASIS);});});return {product:p,metrics:metrics};});
  return {sources:sources,periods:periods,current:current,dealers:dealers,dealer:dealer,rows:rows,estimated:BC_BASIS==='forecast'&&!current.closed};
}
function bcPercent(value){return value==null?'—':(value>0?'+':value<0?'−':'')+'%'+Math.abs(value).toFixed(1).replace('.',',');}
function bcTone(value){return value==null?'bc-muted':value>0?'bc-positive':value<0?'bc-negative':'bc-neutral';}
function bcTitle(cell){return cell.value==null?cell.reason:(cell.estimated?'Tahmini kapanış: ':'Güncel: ')+cell.current.toLocaleString('tr-TR')+' adet · Önceki: '+cell.previous.toLocaleString('tr-TR')+' adet';}
function bcRange(model,metric){
  var c=model.current,y=c.period.slice(0,4),month=merMonthShort(c.period),cut=c.closed?'':'1–'+Number(c.date.slice(8))+' ';
  if(model.estimated){if(metric==='YTD')return '1 Oca–'+Number(bcEnd(c.period).slice(8))+' '+month+' · '+y+' tahmini / '+(+y-1);if(metric==='YoY')return month+' '+y+' tahmini / '+(+y-1);return month+' tahmini / '+merMonthShort(merShift(c.period,-1))+' · '+y;}
  if(metric==='YTD')return '1 Oca–'+(c.closed?Number(c.date.slice(8))+' ':Number(c.date.slice(8))+' ')+month+' · '+y+' / '+(+y-1);
  if(metric==='YoY')return cut+month+' · '+y+' / '+(+y-1);
  return cut+month+' / '+(c.closed?'':('1–'+Math.min(+c.date.slice(8),+bcEnd(merShift(c.period,-1)).slice(8))+' '))+merMonthShort(merShift(c.period,-1))+' · '+y+(c.period.slice(5)==='01'?' / '+(+y-1):'');
}
function bcCards(model){
  var row=model.rows.find(function(r){return r.product.key===BC_PRODUCT;})||model.rows[2];
  return '<section class="bc-overview" aria-label="Seçilen ürün karşılaştırması"><div class="bc-selected-label">SEÇİLİ ÜRÜN: '+bcEsc(row.product.name.toLocaleUpperCase('tr-TR'))+'</div><div class="bc-cards-grid">'+['YTD','YoY','MoM'].map(function(metric){
    var values=row.metrics[metric],gap=values.dealer.value==null||values.tr.value==null?null:values.dealer.value-values.tr.value;
    return '<article class="bc-summary"><h3>'+metric+'</h3><p>'+bcEsc(bcRange(model,metric))+'</p><div class="bc-three">'+[['dealer','BAYİ'],['region','BÖLGE'],['tr','TÜRKİYE']].map(function(pair){var cell=values[pair[0]];return '<div title="'+bcEsc(bcTitle(cell))+'"><span>'+pair[1]+'</span><strong class="'+bcTone(cell.value)+'">'+bcPercent(cell.value)+'</strong></div>';}).join('')+'</div><div class="bc-gap '+bcTone(gap)+'">'+(gap==null?'Türkiye farkı: Veri yok':'Türkiye farkı: '+(gap>0?'+':gap<0?'−':'')+Math.abs(gap).toFixed(1).replace('.',',')+' puan')+'</div></article>';
  }).join('')+'</div></section>';
}
function bcTable(model){
  return '<section class="bc-matrix"><h3>Ürün Bazlı Büyüme / Küçülme</h3><div class="bc-table-scroll"><table class="bc-table"><thead><tr><th rowspan="2" scope="col">Ürün</th>'+['YTD','YoY','MoM'].map(function(metric){return '<th colspan="3" scope="colgroup">'+metric+'</th>';}).join('')+'</tr><tr>'+[1,2,3].map(function(){return '<th scope="col" class="bc-dealer-col">Bayi</th><th scope="col">Bölge</th><th scope="col">TR</th>';}).join('')+'</tr></thead><tbody>'+model.rows.map(function(row){
    return '<tr class="'+(row.product.key===BC_PRODUCT?'bc-active':'')+'"><th scope="row"><button type="button" aria-pressed="'+String(row.product.key===BC_PRODUCT)+'" onclick="bcSelectProduct(\''+row.product.key+'\')"><i style="background:'+row.product.color+'"></i>'+row.product.name+'</button></th>'+['YTD','YoY','MoM'].map(function(metric){return ['dealer','region','tr'].map(function(scope){var cell=row.metrics[metric][scope];return '<td class="'+bcTone(cell.value)+(scope==='dealer'?' bc-dealer-col':'')+'" title="'+bcEsc(bcTitle(cell))+'">'+bcPercent(cell.value)+'</td>';}).join('');}).join('')+'</tr>';
  }).join('')+'</tbody></table></div></section>';
}
function bcBody(model){
  if(!model.current)return '<div class="bc-empty">Karşılaştırılacak rapor bulunamadı. Ayarlar bölümünden TTM satış raporu yükleyin.</div>';
  var missingTr=model.rows.some(function(r){return ['YTD','YoY','MoM'].some(function(metric){return r.metrics[metric].tr.value==null;});});
  return '<div class="bc-report"><header class="bc-report-heading"><div><h2>Bayi • Bölge • Türkiye</h2><p>Ürün bazında büyüme ve küçülme karşılaştırması</p></div><span class="bc-channel">TTM KANALI</span></header><div class="bc-export-meta">'+bcEsc(model.dealer.code+' · '+bcShort(model.dealer.name)+' · '+model.dealer.region)+'<br>'+bcEsc(bcPeriodName(model.current.period)+' · Rapor: '+bcDateName(model.current.date))+'</div>'+bcCards(model)+bcTable(model)+'<footer class="bc-foot"><span>YTD: Yılbaşından rapor gününe kadar geçen yılın aynı dönemiyle kıyas · YoY: Geçen yılın aynı ayı · MoM: Önceki ay</span><span class="bc-legend"><b class="bc-positive">● Büyüme</b><b class="bc-negative">● Küçülme</b></span></footer>'+
    '<p class="bc-data-note">'+(model.current.closed?'Ay kapanışları karşılaştırılıyor.':model.estimated?'AY SONU TAHMİNİ: Güncel adet × rapordaki toplam gün / çalışılan gün. YTD, kapanmış ayların gerçekleşenleri ile güncel ayın tahminini toplar. Geçmiş dönemler gerçek ay kapanışlarıdır.':'Açık ay: Aynı takvim günü kesiti arşivde yoksa değişim hesaplanamaz. Ay sonu tahmini seçeneğiyle geçmiş kapanışlarla tahmini kıyas yapabilirsiniz.')+' “—”: Eksik veri veya önceki dönemin sıfır olması nedeniyle hesaplanamayan değişim.'+(missingTr?' Türkiye aktivasyon adetleri bulunmayan dönemlerde TR kıyası gösterilmez; HGO büyüme olarak kullanılmaz.':'')+'</p></div>';
}
function bcSetPeriod(value){BC_PERIOD=value;BC_DEALER='';bcRenderReady();}
function bcSetDealer(value){BC_DEALER=value;bcRenderReady();}
function bcSetBasis(value){BC_BASIS=value==='forecast'?'forecast':'actual';bcRenderReady();}
function bcSelectProduct(value){if(BC_PRODUCTS.some(function(p){return p.key===value;})){BC_PRODUCT=value;bcRenderReady();}}
function bcRenderReady(){
  var cards=document.getElementById('cards');if(!cards)return;
  cards.className='cards single bc-cards';cards.style.maxWidth='1600px';
  var model=bcModel();
  cards.innerHTML='<section class="bc-page" aria-label="Bayi Karşılaştırma"><div class="bc-heading"><h2>Bayi • Bölge • Türkiye</h2><p>Ürün bazında büyüme ve küçülme karşılaştırması</p></div><div class="bc-toolbar"><label>Bayi<select id="bc-dealer" onchange="bcSetDealer(this.value)" '+(!model.current?'disabled':'')+'>'+model.dealers.map(function(d){return '<option value="'+bcEsc(d.code)+'" '+(d.code===BC_DEALER?'selected':'')+'>'+bcEsc(d.code+' · '+bcShort(d.name))+'</option>';}).join('')+'</select></label><label>Bölge<input aria-label="Bayi bölgesi" value="'+bcEsc(model.dealer?model.dealer.region:'—')+'" readonly></label><label>Dönem<select id="bc-period" onchange="bcSetPeriod(this.value)">'+model.periods.map(function(period){return '<option value="'+period+'" '+(period===BC_PERIOD?'selected':'')+'>'+bcEsc(bcPeriodName(period))+'</option>';}).join('')+'</select></label><div class="bc-actions"><button type="button" onclick="bcSharePNG()" '+(!model.current||BC_BUSY?'disabled':'')+'>↗ PNG Paylaş</button><button type="button" onclick="bcExcel()" '+(!model.current||BC_BUSY?'disabled':'')+'>▧ Excel</button></div></div>'+
    (model.current?'<div class="bc-statusbar">'+(!model.current.closed?'<label>Karşılaştırma <select id="bc-basis" onchange="bcSetBasis(this.value)"><option value="actual" '+(BC_BASIS==='actual'?'selected':'')+'>Gerçekleşen · aynı gün</option><option value="forecast" '+(BC_BASIS==='forecast'?'selected':'')+'>Ay sonu tahmini</option></select></label>':'<span class="bc-history-ready">Kapanış arşivi yüklü · Bayi / Bölge / TR</span>')+'<div class="bc-report-date">Rapor: '+bcEsc(bcDateName(model.current.date))+' · TTM · '+(model.current.closed?'Kapanmış dönem':model.estimated?'AY SONU TAHMİNİ':'Aynı gün aralığı')+'</div></div>':'')+bcBody(model)+(BC_STORAGE_NOTE?'<p class="bc-data-note">'+bcEsc(BC_STORAGE_NOTE)+'</p>':'')+'</section>';
}
function renderBayiComparison(){
  var cards=document.getElementById('cards');if(!cards)return;
  if(BC_READY){bcRenderReady();return;}
  cards.className='cards single bc-cards';cards.style.maxWidth='1600px';cards.innerHTML='<section class="bc-page bc-empty" role="status">Bayi karşılaştırması için geçmiş dönemler yükleniyor…</section>';
  if(!BC_LOADING)BC_LOADING=(async function(){
    try{
      // The compact shared comparison pack renders immediately, even on a clean
      // phone. Older history loads independently and enriches earlier periods.
      var history=loadAllHistory().then(function(){if(BC_READY&&(typeof section==='undefined'||section==='bayiComparison'))bcRenderReady();}).catch(function(){});
      var published=await bcLoadData();if(!published)await history;BC_READY=true;
    }catch(e){BC_READY=false;}
    finally{BC_LOADING=null;}
    if(typeof section!=='undefined'&&section!=='bayiComparison')return;
    if(BC_READY)bcRenderReady();else cards.innerHTML='<section class="bc-page bc-empty">Geçmiş veriler yüklenemedi. <button onclick="renderBayiComparison()">Yeniden dene</button></section>';
  })();
}
async function bcSharePNG(){
  if(BC_BUSY)return;var model=bcModel();if(!model.current)return;
  BC_BUSY=true;bcRenderReady();var host=null;
  try{
    host=document.createElement('div');host.className='bc-export-host';host.style.cssText='position:fixed;left:-20000px;top:0;width:1560px;z-index:-1;pointer-events:none;';
    host.innerHTML='<div class="bc-page bc-export">'+bcBody(model)+'</div>';document.body.appendChild(host);
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    var target=host.firstElementChild,height=Math.ceil(target.scrollHeight);
    var canvas=await captureExportImage(target,{width:1560,height:height,scale:Math.min(2,Math.sqrt(15000000/(1560*height))),windowWidth:1600,windowHeight:height,backgroundColor:'#f1f7fd'});
    _openSharePreview(canvas.toDataURL('image/png'),'Bayi_Karsilastirma_'+model.dealer.code+'_'+model.current.date+'.png',{text:model.dealer.code+' · '+bcShort(model.dealer.name)+' · YTD / YoY / MoM · '+model.current.date});
  }catch(e){alert('PNG oluşturulamadı: '+e.message);}
  finally{if(host&&host.parentNode)host.parentNode.removeChild(host);BC_BUSY=false;bcRenderReady();}
}
function bcExcelRows(model){
  var rows=[['Bayi',model.dealer.code,model.dealer.name],['Bölge',model.dealer.region,'Kanal: TTM'],['Dönem',model.current.period,'Rapor: '+model.current.date],['Ölçüm',model.estimated?'AY SONU TAHMİNİ · Aktivasyon adedi değişimi (%)':'Gerçekleşen aktivasyon adedi değişimi (%)'],['Not',model.estimated?'Güncel ay toplam gün / çalışılan gün ile tahmin edilir; geçmiş dönemler gerçek kapanıştır.':'Boş hücre: Eksik veri veya önceki dönem 0'],['Ürün','YTD Bayi','YTD Bölge','YTD TR','YoY Bayi','YoY Bölge','YoY TR','MoM Bayi','MoM Bölge','MoM TR']];
  model.rows.forEach(function(row){var cells=[row.product.name];['YTD','YoY','MoM'].forEach(function(metric){['dealer','region','tr'].forEach(function(scope){var v=row.metrics[metric][scope].value;cells.push(v==null?null:v/100);});});rows.push(cells);});
  return rows;
}
async function bcExcel(){
  if(BC_BUSY)return;var model=bcModel();if(!model.current)return;BC_BUSY=true;bcRenderReady();
  try{
    await ensureXLSX();var rows=bcExcelRows(model);
    // Spreadsheet strings cannot be interpreted as formula cells by sheet_from_array.
    var sheet=XLSX.utils.aoa_to_sheet(rows);sheet['!cols']=[{wch:25}].concat(Array.from({length:9},function(){return {wch:16};}));
    for(var r=6;r<rows.length;r++)for(var c=1;c<=9;c++){var cell=sheet[XLSX.utils.encode_cell({r:r,c:c})];if(cell&&cell.t==='n')cell.z='+0.0%;-0.0%;0.0%';}
    var book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'Bayi Karşılaştırma');XLSX.writeFile(book,'Bayi_Karsilastirma_'+model.dealer.code+'_'+model.current.date+'.xlsx');
  }catch(e){alert('Excel oluşturulamadı: '+e.message);}
  finally{BC_BUSY=false;bcRenderReady();}
}
