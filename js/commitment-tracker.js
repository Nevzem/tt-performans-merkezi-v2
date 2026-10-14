/* Şube bazlı taahhüt takibi — only uploaded Kuzey Anadolu reports.
 * TTM Mobil Taahhüt and EDM Mobil Taahhüt Upsell are different KPIs.
 * All figures are reported actuals, never forecasts. */
var CT_CHANNEL='TTM', CT_QUERY='', CT_CITY='all', CT_SORT='mobile', CT_PNG_PAGE=1, CT_PNG_PAGE_SIZE=24;
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
function ctPngPageCount(rows){return Math.max(1,Math.ceil((rows||[]).length/CT_PNG_PAGE_SIZE));}
function ctPngSlice(rows,page){
  var n=ctPngPageCount(rows),p=Math.min(n,Math.max(1,Math.floor(Number(page)||1)));
  return {rows:rows.slice((p-1)*CT_PNG_PAGE_SIZE,p*CT_PNG_PAGE_SIZE),page:p,pages:n,from:(p-1)*CT_PNG_PAGE_SIZE+1,to:Math.min(p*CT_PNG_PAGE_SIZE,rows.length)};
}
function ctSetPngPage(v){CT_PNG_PAGE=Math.max(1,Math.floor(Number(v)||1));ctUpdateResults();}
function ctPngControls(){
  var rows=ctRows(ctSource().value);
  return '<span>TTM + EDM · Tüm '+rows.length+' bayi aynı PNG’de</span>';
}
function ctUpdateResults(){
  var source=ctSource().value,all=ctRows(source),rows=ctViewRows(all);
  var summary=document.getElementById('ct-summary'),result=document.getElementById('ct-results'),counter=document.getElementById('ct-count');
  if(summary)summary.innerHTML=ctSummary(rows);
  if(result)result.innerHTML=ctTable(rows);
  if(counter)counter.textContent=rows.length+' şube gösteriliyor · '+all.length+' kayıt';
  CT_PNG_PAGE=Math.min(CT_PNG_PAGE,ctPngPageCount(rows));
  var pagePicker=document.getElementById('ct-png-controls');
  if(pagePicker)pagePicker.innerHTML=ctPngControls(rows);
  var pngButton=document.getElementById('ct-png-button');
  if(pngButton)pngButton.disabled=!all.length;
  document.querySelectorAll('.ct-tab').forEach(function(b){b.classList.toggle('active',b.dataset.ctChannel===CT_CHANNEL);b.setAttribute('aria-pressed',String(b.dataset.ctChannel===CT_CHANNEL));});
}
function ctSetChannel(v){CT_CHANNEL=v;CT_CITY='all';CT_PNG_PAGE=1;renderCommitmentTracker();}
function ctSetSearch(v){CT_QUERY=v;CT_PNG_PAGE=1;ctUpdateResults();}
function ctSetCity(v){CT_CITY=v;CT_PNG_PAGE=1;ctUpdateResults();}
function ctSetSort(v){CT_SORT=v;CT_PNG_PAGE=1;ctUpdateResults();}
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

/* Approved premium report includes all TTM and EDM branches in one image.
 * Actual quantities stay separate; canvas scale adapts to full list height. */
function ctPngChannelLabel(){
  return {TTM:'TTM',TTBN:'EDM · TTBN',ESN:'EDM · ESN',OTHER:'EDM · Diğer',ALL:'Tüm kanallar'}[CT_CHANNEL]||'TTM';
}
function ctPngDate(source){
  var date=source&&source.ttm&&source.ttm.reportDate;
  return date&&/^\d{4}-\d{2}-\d{2}$/.test(date)?date.split('-').reverse().join('.'):
    String(source&&source.period||'Dönem bilinmiyor');
}
function ctPngStats(rows){
  var ttm=rows.filter(function(r){return r.kind==='TTM';});
  var edm=rows.filter(function(r){return r.kind!=='TTM';});
  return [
    {channel:'TTM',label:'Mobil Taahhüt',value:ctTotal(ttm,'mobileTTM'),tone:'mobile'},
    {channel:'TTM',label:'DSL Taahhüt',value:ctTotal(ttm,'dsl'),tone:'dsl'},
    {channel:'EDM',label:'Mobil Taahhüt Upsell',value:ctTotal(edm,'mobileUpsell'),tone:'upsell'},
    {channel:'EDM',label:'DSL Taahhüt',value:ctTotal(edm,'dsl'),tone:'edm-dsl'}
  ].map(function(card){
    var stat=card.value,coverage=stat.size&&stat.covered!==stat.size?'<small class="ct-png-coverage">'+stat.covered+'/'+stat.size+' bayi verisi</small>':'';
    return '<div class="ct-png-stat '+card.tone+'"><div class="ct-png-stat-label"><span class="ct-png-icon">'+ctPngIcon(card.tone.indexOf('dsl')!==-1?'wifi':'phone',card.tone)+'</span><div><b>'+card.channel+'</b><span>'+card.label+'</span></div></div><strong>'+ctN(stat.value)+'</strong>'+coverage+'<div class="ct-png-accent"></div></div>';
  }).join('');
}
function ctPngIcon(kind,tone){
  var color={mobile:'#37c4ff',dsl:'#3ee6ce',upsell:'#c782ff','edm-dsl':'#ffc05e'}[tone]||'#65daff';
  var path=kind==='phone'?'<rect x="8" y="3" width="16" height="26" rx="3"/><path d="M13 25h6"/>':kind==='wifi'?'<path d="M3 12c7-8 19-8 26 0M7 17c5-6 13-6 18 0M12 22c2-3 6-3 8 0"/><circle cx="16" cy="27" r="1"/>':'<path d="M5 27V18h4v9M14 27V10h4v17M23 27V3h4v24"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="'+color+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';
}
function ctPngPanel(rows,edm){
  var name=edm?'EDM':'TTM';
  var list=rows.map(function(row,index){
    return '<tr><td><span class="ct-png-rank rank-'+Math.min(index+1,4)+'">'+(index+1)+'</span></td>'+
      '<td class="ct-png-code">'+ctEsc(row.code)+'</td><td class="ct-png-branch">'+ctEsc(row.name)+'</td>'+
      '<td><span class="ct-png-quantity mobile">'+ctN(edm?row.mobileUpsell:row.mobileTTM)+'</span></td>'+
      '<td><span class="ct-png-quantity dsl">'+ctN(row.dsl)+'</span></td></tr>';
  }).join('');
  return '<section class="ct-png-panel '+(edm?'edm':'ttm')+'"><header><span class="ct-png-panel-icon">'+ctPngIcon('bars',edm?'upsell':'mobile')+'</span><h2><b>'+name+'</b> Şubeleri</h2><small>'+rows.length+' bayi</small></header>'+
    '<table class="ct-png-table"><colgroup><col style="width:9%"><col style="width:21%"><col style="width:36%"><col style="width:17%"><col style="width:17%"></colgroup><thead><tr><th>#</th><th>Bayi Kodu</th><th>Bayi Adı</th><th>Mobil'+(edm?'<small>Upsell</small>':'')+'</th><th>DSL</th></tr></thead><tbody>'+list+'</tbody></table>'+
    (!rows.length?'<div class="ct-png-no-data">'+name+' raporu yüklenmedi</div>':'')+'</section>';
}
function ctPngMarkup(rows,pageInfo,source,stored){
  var ttm=rows.filter(function(r){return r.kind==='TTM';}),edm=rows.filter(function(r){return r.kind!=='TTM';});
  return '<article class="ct-png-sheet" aria-label="Şube Bazlı Taahhüt Paylaşım Raporu">'+
    '<div class="ct-png-hero"><div class="ct-png-growth" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>'+
    '<div class="ct-png-date">'+ctEsc(ctPngDate(source))+'</div><h1>Şube Bazlı<br><span>Taahhüt Takibi</span></h1><p>KUZEY ANADOLU</p></div>'+
    '<div class="ct-png-main"><div class="ct-png-stats">'+ctPngStats(rows)+'</div>'+
    '<div class="ct-png-strip"><span>'+ctPngIcon('bars')+' Güncel gerçekleşen adetler</span><span>'+rows.length+' bayi</span></div>'+
    '<div class="ct-png-panels">'+ctPngPanel(ttm,false)+ctPngPanel(edm,true)+'</div></div>'+
    '<footer class="ct-png-footer"><b>TT PERFORMANS MERKEZİ</b><span>'+ctEsc(stored?'Son yüklenen rapor':'Güncel satış raporu')+' · '+ctEsc(ctPngDate(source))+'</span></footer></article>';
}
async function ctSharePNG(){
  var sourceInfo=ctSource(),source=sourceInfo.value,all=ctRows(source);
  if(!source||!all.length){alert('Önce geçerli satış raporu yükleyip paylaşılacak şubeleri seçin.');return;}
  if(typeof captureExportImage!=='function'||typeof _openSharePreview!=='function'){
    alert('PNG paylaşım bileşenleri yüklenmedi. Sayfayı yenileyip yeniden deneyin.');return;
  }
  var button=document.getElementById('ct-png-button'),original=button?button.textContent:'';
  var host=null;
  if(button){button.disabled=true;button.textContent='PNG hazırlanıyor…';}
  try{
    // Export both channels in full, regardless of the on-screen channel/search.
    var page={rows:all,page:1,pages:1};
    all.sort(function(a,b){
      var av=a.kind==='TTM'?a.mobileTTM:a.mobileUpsell,bv=b.kind==='TTM'?b.mobileTTM:b.mobileUpsell;
      return (av==null)-(bv==null)||(bv||0)-(av||0)||a.name.localeCompare(b.name,'tr')||a.code.localeCompare(b.code,'tr');
    });
    host=document.createElement('div');host.className='ct-png-host';
    host.style.cssText='position:fixed;left:-20000px;top:0;width:1120px;z-index:-1;pointer-events:none;overflow:visible;background:#03142f;';
    host.innerHTML=ctPngMarkup(all,page,source,sourceInfo.saved);
    document.body.appendChild(host);
    var sheet=host.firstElementChild;
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    // Keep complete long lists within iOS canvas pixel and dimension limits.
    var height=Math.ceil(sheet.scrollHeight||sheet.offsetHeight||1400);
    var scale=Math.min(2,Math.sqrt(15000000/(1120*height)),16000/height);
    var canvas=await captureExportImage(sheet,{scale:scale,backgroundColor:'#03142f',width:1120,height:height,windowWidth:1240,windowHeight:height});
    var fileDate=ctPngDate(source).replace(/[^0-9]/g,'');
    var fileName='TT_Taahhut_TTM_EDM_'+fileDate+'.png';
    var dataUrl=canvas.toDataURL('image/png');
    _openSharePreview(dataUrl,fileName,{text:'Kuzey Anadolu · TTM + EDM · Şube Bazlı Taahhüt · '+ctPngDate(source)});
  }catch(e){
    alert('PNG oluşturulamadı: '+(e&&e.message||e));
  }finally{
    if(host&&host.parentNode)host.parentNode.removeChild(host);
    if(button){button.disabled=false;button.textContent=original;}
  }
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
    '<div class="ct-hero"><div><span class="ct-eyebrow">KUZEY ANADOLU · TAAHHÜT PERFORMANSI</span><h2>Şube Bazlı Taahhüt Takibi</h2><p>Mobil ve DSL aktivasyonlarının şube bazlı dökümü · '+ctEsc(when)+'</p></div><div class="ct-hero-actions"><button class="ct-png-button" id="ct-png-button" onclick="ctSharePNG()" '+(!all.length?'disabled':'')+'>↗ PNG Paylaş</button><button class="ct-export" onclick="ctCsv()" '+(!all.length?'disabled':'')+'>CSV indir <span aria-hidden="true">↓</span></button></div></div>'+
    '<p class="ct-notice">'+ctEsc(note)+'</p>'+
    '<nav class="ct-channels" aria-label="Kanal seçimi">'+channels.map(function(a){var n=a[0]==='ALL'?all.length:count(a[0]);return '<button class="ct-tab'+(CT_CHANNEL===a[0]?' active':'')+'" data-ct-channel="'+a[0]+'" aria-pressed="'+String(CT_CHANNEL===a[0])+'" onclick="ctSetChannel(\''+a[0]+'\')">'+a[1]+' <span>'+n+'</span></button>';}).join('')+'</nav>'+
    '<div class="ct-filters"><label>Şube ara<input type="search" placeholder="Bayi, kod, il veya yönetici" value="'+ctEsc(CT_QUERY)+'" oninput="ctSetSearch(this.value)"></label>'+
    '<label>İl<select onchange="ctSetCity(this.value)"><option value="all">Tüm iller</option>'+options.map(function(c){return '<option value="'+ctEsc(c)+'"'+(CT_CITY===c?' selected':'')+'>'+ctEsc(c)+'</option>';}).join('')+'</select></label>'+
    '<label>Sırala<select onchange="ctSetSort(this.value)">'+[['mobile','Mobil taahhüt: çoktan aza'],['dsl','DSL taahhüt: çoktan aza'],['name','Şube adına göre'],['city','İle göre'],['code','Bayi koduna göre']].map(function(x){return '<option value="'+x[0]+'"'+(CT_SORT===x[0]?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></label></div>'+
    '<div class="ct-summary" id="ct-summary"></div><div class="ct-png-controls" id="ct-png-controls"></div><div class="ct-count" id="ct-count"></div><div id="ct-results"></div>'+
    '<footer class="ct-foot">TTM Mobil Taahhüt ile EDM Mobil Taahhüt Upsell farklı göstergelerdir; birbirine eklenmez. “—” veri olmadığını veya KPI’ın bu kanala uygulanmadığını gösterir. Toplamlar mevcut arama ve filtreye göre güncellenir.</footer>'+
    '</section>';
  ctUpdateResults();
}
