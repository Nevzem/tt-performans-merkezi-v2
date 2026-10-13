/* Şube bazlı taahhüt takibi — only uploaded Kuzey Anadolu reports.
 * TTM Mobil Taahhüt and EDM Mobil Taahhüt Upsell are different KPIs.
 * All figures are reported actuals, never forecasts. */
var CT_CHANNEL='TTM', CT_QUERY='', CT_CITY='all', CT_SORT='mobile';
function ctEsc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function ctNorm(s){return String(s==null?'':s).toLocaleUpperCase('tr-TR').trim();}
function ctN(n){return n==null?'—':n.toLocaleString('tr-TR');}
function ctQuantity(value){return typeof value==='number' && Number.isSafeInteger(value) && value>=0?value:null;}
function ctSource(){
  if(typeof MER_LIVE!=='undefined' && MER_LIVE && MER_LIVE.ttm)return {value:MER_LIVE,saved:false};
  if(typeof MER_ARCHIVES!=='undefined' && MER_ARCHIVES){
    var sources=Object.values(MER_ARCHIVES).filter(function(x){return x && x.ttm && !x.sample;});
    sources.sort(function(a,b){return String(b.uploadedAt||b.period||'').localeCompare(String(a.uploadedAt||a.period||''));});
    if(sources.length)return {value:sources[0],saved:true};
  }
  return {value:null,saved:false};
}
function ctRows(source){
  if(!source)return [];
  var rows=[];
  function add(bucket,channel){
    Object.values((bucket && bucket.bayiler)||{}).forEach(function(d){
      if(d.bolge && ctNorm(d.bolge)!=='KUZEY ANADOLU')return;
      var kind=channel==='TTM'?'TTM':ctNorm(d.bt)==='TTBN'?'TTBN':ctNorm(d.bt)==='ESN'?'ESN':'OTHER';
      var commitments=d.commitments||{};
      var row={id:channel+':'+String(d.kod||''),code:String(d.kod||''),name:String(d.fullName||d.b||d.kod||'—'),
        city:String(d.il||'—'),manager:String(d.sy||''),kind:kind,
        dsl:ctQuantity(commitments.dsl),
        mobileTTM:channel==='TTM'?ctQuantity(commitments.mobil):null,
        mobileUpsell:channel==='EDM'?ctQuantity(commitments.mobilUpsell):null};
      if(row.code && /^\d+$/.test(row.code))rows.push(row);
    });
  }
  add(source.ttm,'TTM');add(source.edm,'EDM');
  return rows;
}
function ctChannelRows(rows){
  return rows.filter(function(r){return CT_CHANNEL==='ALL'||r.kind===CT_CHANNEL;});
}
function ctViewRows(all){
  var source=all||ctRows(ctSource().value),q=ctNorm(CT_QUERY);
  var filtered=ctChannelRows(source).filter(function(r){
    return (CT_CITY==='all'||ctNorm(r.city)===ctNorm(CT_CITY))&&
      (!q||ctNorm([r.code,r.name,r.city,r.manager,r.kind].join(' ')).includes(q));
  });
  function sortNumber(r){return CT_SORT==='dsl'?r.dsl:r.kind==='TTM'?r.mobileTTM:r.mobileUpsell;}
  filtered.sort(function(a,b){
    if(CT_SORT==='name')return a.name.localeCompare(b.name,'tr')||a.code.localeCompare(b.code,'tr');
    if(CT_SORT==='city')return a.city.localeCompare(b.city,'tr')||a.name.localeCompare(b.name,'tr');
    if(CT_SORT==='code')return a.code.localeCompare(b.code,'tr');
    var av=sortNumber(a),bv=sortNumber(b);
    return (av==null)-(bv==null)||(bv||0)-(av||0)||a.name.localeCompare(b.name,'tr')||a.code.localeCompare(b.code,'tr');
  });
  return filtered;
}
function ctTotal(rows,key){
  if(!rows.length)return {value:null,covered:0,size:0};
  var covered=0,value=0;
  rows.forEach(function(r){if(r[key]!=null){value+=r[key];covered++;}});
  return {value:covered?value:null,covered:covered,size:rows.length};
}
function ctTotalCard(label,stat,note){
  var coverage=stat.size && stat.covered!==stat.size?' · '+stat.covered+'/'+stat.size+' veri':'';
  return '<article class="ct-kpi"><span>'+label+'</span><b>'+ctN(stat.value)+'</b><small>'+note+coverage+'</small></article>';
}
function ctSummary(rows){
  var ttm=rows.filter(function(r){return r.kind==='TTM';}),edm=rows.filter(function(r){return r.kind!=='TTM';});
  return ctTotalCard('DSL Taahhüt',ctTotal(rows,'dsl'),'Güncel toplam adet')+
    ctTotalCard('Mobil Taahhüt · TTM',ctTotal(ttm,'mobileTTM'),'Güncel aktivasyon')+
    ctTotalCard('Mobil Taahhüt Upsell · EDM',ctTotal(edm,'mobileUpsell'),'Güncel aktivasyon');
}
function ctTable(rows){
  if(!rows.length)return '<div class="ct-empty">Bu filtreye uygun şube bulunamadı. Kanal/şehir seçimini veya aramayı kontrol edin.</div>';
  return '<div class="ct-table-scroll"><table class="ct-table"><thead><tr><th>#</th><th>Bayi / şube</th><th>İl ve kanal</th><th>DSL Taahhüt</th><th>Mobil Taahhüt · TTM</th><th>Mobil Upsell · EDM</th></tr></thead><tbody>'+
    rows.map(function(r,i){return '<tr><td>'+(i+1)+'</td><td class="ct-name"><strong>'+ctEsc(r.name)+'</strong><small>'+ctEsc(r.code)+(r.manager?' · '+ctEsc(r.manager):'')+'</small></td><td>'+ctEsc(r.city)+'<small>'+ctEsc(r.kind==='TTM'?'TTM':r.kind==='OTHER'?'EDM · Diğer':'EDM · '+r.kind)+'</small></td><td class="ct-amount">'+ctN(r.dsl)+'</td><td class="ct-amount">'+ctN(r.mobileTTM)+'</td><td class="ct-amount">'+ctN(r.mobileUpsell)+'</td></tr>';}).join('')+
    '</tbody></table></div>';
}
function ctUpdateResults(){
  var source=ctSource().value,all=ctRows(source),rows=ctViewRows(all);
  var summary=document.getElementById('ct-summary'),result=document.getElementById('ct-results'),counter=document.getElementById('ct-count');
  if(summary)summary.innerHTML=ctSummary(rows);
  if(result)result.innerHTML=ctTable(rows);
  if(counter)counter.textContent=rows.length+' şube gösteriliyor · '+all.length+' kayıt';
  document.querySelectorAll('.ct-tab').forEach(function(b){b.classList.toggle('active',b.dataset.ctChannel===CT_CHANNEL);b.setAttribute('aria-pressed',String(b.dataset.ctChannel===CT_CHANNEL));});
}
function ctSetChannel(v){CT_CHANNEL=v;CT_CITY='all';renderCommitmentTracker();}
function ctSetSearch(v){CT_QUERY=v;ctUpdateResults();}
function ctSetCity(v){CT_CITY=v;ctUpdateResults();}
function ctSetSort(v){CT_SORT=v;ctUpdateResults();}
function ctCsv(){
  var rows=ctViewRows();
  if(!rows.length)return;
  function safe(v){
    if(v==null)return '';
    var s=String(v);
    if(/^[=+\-@\t\r]/.test(s))s="'"+s;
    return '"'+s.replace(/"/g,'""')+'"';
  }
  var csv=[['Kanal','Bayi kodu','Bayi adı','İl','Satış yöneticisi','DSL Taahhüt','Mobil Taahhüt TTM','Mobil Taahhüt Upsell EDM'].map(safe).join(';')].concat(
    rows.map(function(r){return [r.kind,r.code,r.name,r.city,r.manager,r.dsl,r.mobileTTM,r.mobileUpsell].map(safe).join(';');})
  ).join('\r\n');
  var blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='Kuzey_Anadolu_Taahhut_'+String((ctSource().value||{}).period||'rapor').replace(/[^0-9-]/g,'')+'.csv';
  document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
}
function renderCommitmentTracker(){
  var cards=document.getElementById('cards');if(!cards)return;
  cards.className='cards single ct-cards';cards.style.maxWidth='1180px';
  var data=ctSource(),src=data.value,all=ctRows(src);
  var date=src&&src.ttm&&src.ttm.reportDate||null;
  var when=date&&/^\d{4}-\d{2}-\d{2}$/.test(date)?date.split('-').reverse().join('.'):src&&src.period?src.period:'Güncel rapor bekleniyor';
  var count=function(x){return all.filter(function(r){return r.kind===x;}).length;};
  var channels=[['TTM','TTM'],['TTBN','EDM · TTBN'],['ESN','EDM · ESN'],['OTHER','EDM · Diğer'],['ALL','Tüm kanallar']];
  var options=Array.from(new Set(ctChannelRows(all).map(function(r){return r.city;}))).sort(function(a,b){return a.localeCompare(b,'tr');});
  if(CT_CITY!=='all'&&!options.includes(CT_CITY))CT_CITY='all';
  var note=!src?'Ayarlar bölümünden güncel TTM/EDM satış Excel’ini yükleyin. Örnek veriden taahhüt adedi üretilmez.'
    :data.saved?'Tarayıcıda saklanmış son yükleme gösteriliyor. En güncel adetler için yeni raporu yükleyin.'
    :!src.edm?'TTM yüklendi; EDM verisi henüz bulunamadı.':'Bu sayfadaki değerler ay başından itibaren gerçekleşen adetlerdir; forecast değildir.';
  cards.innerHTML='<section class="ct-page" aria-label="Kuzey Anadolu Şube Bazlı Taahhüt Takibi">'+
    '<div class="ct-hero"><div><span class="ct-eyebrow">KUZEY ANADOLU · TAAHHÜT PERFORMANSI</span><h2>Şube Bazlı Taahhüt Takibi</h2><p>Mobil ve DSL aktivasyonlarının şube bazlı dökümü · '+ctEsc(when)+'</p></div><button class="ct-export" onclick="ctCsv()" '+(!all.length?'disabled':'')+'>CSV indir <span aria-hidden="true">↓</span></button></div>'+
    '<p class="ct-notice">'+ctEsc(note)+'</p>'+
    '<nav class="ct-channels" aria-label="Kanal seçimi">'+channels.map(function(a){var n=a[0]==='ALL'?all.length:count(a[0]);return '<button class="ct-tab'+(CT_CHANNEL===a[0]?' active':'')+'" data-ct-channel="'+a[0]+'" aria-pressed="'+String(CT_CHANNEL===a[0])+'" onclick="ctSetChannel(\''+a[0]+'\')">'+a[1]+' <span>'+n+'</span></button>';}).join('')+'</nav>'+
    '<div class="ct-filters"><label>Şube ara<input type="search" placeholder="Bayi, kod, il veya yönetici" value="'+ctEsc(CT_QUERY)+'" oninput="ctSetSearch(this.value)"></label>'+
    '<label>İl<select onchange="ctSetCity(this.value)"><option value="all">Tüm iller</option>'+options.map(function(c){return '<option value="'+ctEsc(c)+'"'+(CT_CITY===c?' selected':'')+'>'+ctEsc(c)+'</option>';}).join('')+'</select></label>'+
    '<label>Sırala<select onchange="ctSetSort(this.value)">'+[['mobile','Mobil taahhüt: çoktan aza'],['dsl','DSL taahhüt: çoktan aza'],['name','Şube adına göre'],['city','İle göre'],['code','Bayi koduna göre']].map(function(x){return '<option value="'+x[0]+'"'+(CT_SORT===x[0]?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></label></div>'+
    '<div class="ct-summary" id="ct-summary"></div><div class="ct-count" id="ct-count"></div><div id="ct-results"></div>'+
    '<footer class="ct-foot">TTM Mobil Taahhüt ile EDM Mobil Taahhüt Upsell farklı göstergelerdir; birbirine eklenmez. “—” veri olmadığını veya KPI’ın bu kanala uygulanmadığını gösterir. Toplamlar mevcut arama ve filtreye göre güncellenir.</footer>'+
    '</section>';
  ctUpdateResults();
}
