/* Şube bazlı taahhüt takibi — only uploaded Kuzey Anadolu reports.
 * TTM Mobil Taahhüt and EDM Mobil Taahhüt Upsell are different KPIs.
 * All figures are reported actuals, never forecasts. */
var CT_CHANNEL='TTM', CT_QUERY='', CT_CITY='all', CT_SORT='mobile', CT_PNG_PAGE=1, CT_PNG_PAGE_SIZE=24;
var CT_SORT_OPTIONS=[['mobile','Mobil taahhüt: çoktan aza'],['mobileAsc','Mobil taahhüt: azdan çoğa'],['dsl','DSL taahhüt: çoktan aza'],['dslAsc','DSL taahhüt: azdan çoğa'],['name','Bayi adı: A → Z'],['city','İle göre'],['code','Bayi koduna göre']];
function ctEsc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function ctNorm(s){return String(s==null?'':s).toLocaleUpperCase('tr-TR').trim();}
function ctN(n){return n==null?'—':n.toLocaleString('tr-TR');}
function ctShortName(name){
  var short=String(name==null?'—':name).trim().split(/\s+/).slice(0,2).join(' '),chars=Array.from(short);
  return chars.length>26?chars.slice(0,25).join('')+'…':short;
}
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
  return ctSortRows(filtered);
}
function ctSortRows(rows){
  function sortNumber(r){return CT_SORT==='dsl'||CT_SORT==='dslAsc'?r.dsl:r.kind==='TTM'?r.mobileTTM:r.mobileUpsell;}
  return rows.slice().sort(function(a,b){
    if(CT_SORT==='name')return ctShortName(a.name).localeCompare(ctShortName(b.name),'tr')||a.code.localeCompare(b.code,'tr');
    if(CT_SORT==='city')return a.city.localeCompare(b.city,'tr')||ctShortName(a.name).localeCompare(ctShortName(b.name),'tr')||a.code.localeCompare(b.code,'tr');
    if(CT_SORT==='code')return a.code.localeCompare(b.code,'tr',{numeric:true});
    var av=sortNumber(a),bv=sortNumber(b);
    var ascending=CT_SORT==='mobileAsc'||CT_SORT==='dslAsc';
    return (av==null)-(bv==null)||(ascending?(av||0)-(bv||0):(bv||0)-(av||0))||a.name.localeCompare(b.name,'tr')||a.code.localeCompare(b.code,'tr');
  });
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
    rows.map(function(r,i){return '<tr><td>'+(i+1)+'</td><td class="ct-name"><strong title="'+ctEsc(r.name)+'">'+ctEsc(ctShortName(r.name))+'</strong><small>'+ctEsc(r.code)+(r.manager?' · '+ctEsc(r.manager):'')+'</small></td><td>'+ctEsc(r.city)+'<small>'+ctEsc(r.kind==='TTM'?'TTM':r.kind==='OTHER'?'EDM · Diğer':'EDM · '+r.kind)+'</small></td><td class="ct-amount">'+ctN(r.dsl)+'</td><td class="ct-amount">'+ctN(r.mobileTTM)+'</td><td class="ct-amount">'+ctN(r.mobileUpsell)+'</td></tr>';}).join('')+
    '</tbody></table></div>';
}
function ctPngPageCount(rows){return Math.max(1,Math.ceil((rows||[]).length/CT_PNG_PAGE_SIZE));}
function ctPngSlice(rows,page){
  var n=ctPngPageCount(rows),p=Math.min(n,Math.max(1,Math.floor(Number(page)||1)));
  return {rows:rows.slice((p-1)*CT_PNG_PAGE_SIZE,p*CT_PNG_PAGE_SIZE),page:p,pages:n,from:(p-1)*CT_PNG_PAGE_SIZE+1,to:Math.min(p*CT_PNG_PAGE_SIZE,rows.length)};
}
function ctSetPngPage(v){CT_PNG_PAGE=Math.max(1,Math.floor(Number(v)||1));ctUpdateResults();}
function ctPngControls(){
  var rows=ctPngRows(ctRows(ctSource().value));
  var sort=(CT_SORT_OPTIONS.find(function(option){return option[0]===CT_SORT;})||CT_SORT_OPTIONS[0])[1];
  return '<span>PNG paylaşımı: Yalnızca TTM · Tüm '+rows.length+' bayi · '+ctEsc(sort)+'</span>';
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
  if(pngButton)pngButton.disabled=!ctPngRows(all).length;
  document.querySelectorAll('.ct-tab').forEach(function(b){b.classList.toggle('active',b.dataset.ctChannel===CT_CHANNEL);b.setAttribute('aria-pressed',String(b.dataset.ctChannel===CT_CHANNEL));});
}
function ctSetChannel(v){CT_CHANNEL=v;CT_CITY='all';CT_PNG_PAGE=1;renderCommitmentTracker();}
function ctSetSearch(v){CT_QUERY=v;CT_PNG_PAGE=1;ctUpdateResults();}
function ctSetCity(v){CT_CITY=v;CT_PNG_PAGE=1;ctUpdateResults();}
function ctSetSort(v){CT_SORT=CT_SORT_OPTIONS.some(function(option){return option[0]===v;})?v:'mobile';CT_PNG_PAGE=1;ctUpdateResults();}
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

/* Approved clean share report: all TTM branches, two totals, one table.
 * Screen filters do not hide TTM branches from the shared image. */
function ctPngRows(rows){
  return ctSortRows(rows.filter(function(r){return r.kind==='TTM';}));
}
function ctPngDate(source){
  var date=source&&source.ttm&&source.ttm.reportDate;
  return date&&/^\d{4}-\d{2}-\d{2}$/.test(date)?date.split('-').reverse().join('.'):
    String(source&&source.period||'Dönem bilinmiyor');
}
function ctPngStats(rows){
  var ttm=ctPngRows(rows);
  return [
    {label:'Mobil Taahhüt',value:ctTotal(ttm,'mobileTTM')},
    {label:'DSL Taahhüt',value:ctTotal(ttm,'dsl')}
  ].map(function(card){
    var stat=card.value,coverage=stat.size&&stat.covered!==stat.size?'<small class="ct-png-coverage">'+stat.covered+'/'+stat.size+' bayi verisi</small>':'';
    return '<div class="ct-png-stat"><span>'+card.label+'</span><strong>'+ctN(stat.value)+'</strong>'+coverage+'</div>';
  }).join('');
}
function ctPngDisplayDate(source){
  var date=source&&source.ttm&&source.ttm.reportDate;
  if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return ctPngDate(source);
  var parts=date.split('-'),months=['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
  return Number(parts[2])+' '+months[Number(parts[1])-1]+' '+parts[0];
}
function ctPngPanel(rows){
  var ttm=ctPngRows(rows);
  var list=ttm.map(function(row){
    return '<tr><td class="ct-png-code">'+ctEsc(row.code)+'</td><td class="ct-png-branch">'+ctEsc(ctShortName(row.name))+'</td>'+
      '<td class="ct-png-quantity">'+ctN(row.mobileTTM)+'</td><td class="ct-png-quantity">'+ctN(row.dsl)+'</td></tr>';
  }).join('');
  return '<div class="ct-png-table-wrap"><table class="ct-png-table"><colgroup><col style="width:18%"><col style="width:50%"><col style="width:17%"><col style="width:15%"></colgroup>'+
    '<thead><tr><th scope="col">Bayi Kodu</th><th scope="col">Bayi Adı</th><th scope="col">Mobil</th><th scope="col">DSL</th></tr></thead><tbody>'+list+'</tbody>'+
    '<tfoot><tr><th scope="row">TOPLAM</th><td>'+ttm.length+' TTM</td><td class="ct-png-quantity">'+ctN(ctTotal(ttm,'mobileTTM').value)+'</td><td class="ct-png-quantity">'+ctN(ctTotal(ttm,'dsl').value)+'</td></tr></tfoot></table></div>';
}
function ctPngMarkup(rows,pageInfo,source,stored){
  var ttm=ctPngRows(rows),missing=ttm.some(function(r){return r.mobileTTM==null||r.dsl==null;});
  return '<article class="ct-png-sheet" aria-label="TTM Taahhüt Takibi Paylaşım Raporu">'+
    '<header class="ct-png-topbar"><span>TT PERFORMANS MERKEZİ</span><span>'+ctEsc(ctPngDisplayDate(source))+'</span></header>'+
    '<div class="ct-png-main"><h1>TTM Taahhüt Takibi</h1><div class="ct-png-stats">'+ctPngStats(ttm)+'</div>'+ctPngPanel(ttm)+'</div>'+
    '<footer class="ct-png-footer">'+ctEsc(stored?'Son yüklenen rapor':'Güncel satış raporu')+' · '+ctEsc(ctPngDate(source))+
    (missing?' · — : Raporda veri yok. Toplamlar mevcut verilerden hesaplanır.':'')+'</footer></article>';
}
async function ctSharePNG(){
  var sourceInfo=ctSource(),source=sourceInfo.value,rows=ctPngRows(ctRows(source));
  if(!source||!rows.length){alert('Paylaşılacak TTM bayisi bulunamadı. Önce geçerli TTM satış raporunu yükleyin.');return;}
  if(typeof captureExportImage!=='function'||typeof _openSharePreview!=='function'){
    alert('PNG paylaşım bileşenleri yüklenmedi. Sayfayı yenileyip yeniden deneyin.');return;
  }
  var button=document.getElementById('ct-png-button'),original=button?button.textContent:'';
  var host=null;
  if(button){button.disabled=true;button.textContent='PNG hazırlanıyor…';}
  try{
    // Export every TTM branch, regardless of the on-screen channel/search.
    var page={rows:rows,page:1,pages:1};
    host=document.createElement('div');host.className='ct-png-host';
    host.style.cssText='position:fixed;left:-20000px;top:0;width:1120px;z-index:-1;pointer-events:none;overflow:visible;background:#ffffff;';
    host.innerHTML=ctPngMarkup(rows,page,source,sourceInfo.saved);
    document.body.appendChild(host);
    var sheet=host.firstElementChild;
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    // Keep complete long lists within iOS canvas pixel and dimension limits.
    var height=Math.ceil(sheet.scrollHeight||sheet.offsetHeight||1400);
    var scale=Math.min(2,Math.sqrt(15000000/(1120*height)),16000/height);
    var canvas=await captureExportImage(sheet,{scale:scale,backgroundColor:'#ffffff',width:1120,height:height,windowWidth:1240,windowHeight:height});
    var fileDate=ctPngDate(source).replace(/[^0-9]/g,'');
    var fileName='TTM_Taahhut_Takibi_'+fileDate+'.png';
    var dataUrl=canvas.toDataURL('image/png');
    _openSharePreview(dataUrl,fileName,{text:'TTM Taahhüt Takibi · '+ctPngDate(source)});
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
    '<div class="ct-hero"><div><span class="ct-eyebrow">KUZEY ANADOLU · TAAHHÜT PERFORMANSI</span><h2>Şube Bazlı Taahhüt Takibi</h2><p>Mobil ve DSL aktivasyonlarının şube bazlı dökümü · '+ctEsc(when)+'</p></div><div class="ct-hero-actions"><button class="ct-png-button" id="ct-png-button" onclick="ctSharePNG()" '+(!ctPngRows(all).length?'disabled':'')+'>↗ PNG Paylaş</button><button class="ct-export" onclick="ctCsv()" '+(!all.length?'disabled':'')+'>CSV indir <span aria-hidden="true">↓</span></button></div></div>'+
    '<p class="ct-notice">'+ctEsc(note)+'</p>'+
    '<nav class="ct-channels" aria-label="Kanal seçimi">'+channels.map(function(a){var n=a[0]==='ALL'?all.length:count(a[0]);return '<button class="ct-tab'+(CT_CHANNEL===a[0]?' active':'')+'" data-ct-channel="'+a[0]+'" aria-pressed="'+String(CT_CHANNEL===a[0])+'" onclick="ctSetChannel(\''+a[0]+'\')">'+a[1]+' <span>'+n+'</span></button>';}).join('')+'</nav>'+
    '<div class="ct-filters"><label>Şube ara<input type="search" placeholder="Bayi, kod, il veya yönetici" value="'+ctEsc(CT_QUERY)+'" oninput="ctSetSearch(this.value)"></label>'+
    '<label>İl<select onchange="ctSetCity(this.value)"><option value="all">Tüm iller</option>'+options.map(function(c){return '<option value="'+ctEsc(c)+'"'+(CT_CITY===c?' selected':'')+'>'+ctEsc(c)+'</option>';}).join('')+'</select></label>'+
    '<label>Sırala · Liste ve PNG<select id="ct-sort" onchange="ctSetSort(this.value)">'+CT_SORT_OPTIONS.map(function(x){return '<option value="'+x[0]+'"'+(CT_SORT===x[0]?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></label></div>'+
    '<div class="ct-summary" id="ct-summary"></div><div class="ct-png-controls" id="ct-png-controls"></div><div class="ct-count" id="ct-count"></div><div id="ct-results"></div>'+
    '<footer class="ct-foot">TTM Mobil Taahhüt ile EDM Mobil Taahhüt Upsell farklı göstergelerdir; birbirine eklenmez. “—” veri olmadığını veya KPI’ın bu kanala uygulanmadığını gösterir. Toplamlar mevcut arama ve filtreye göre güncellenir.</footer>'+
    '</section>';
  ctUpdateResults();
}
