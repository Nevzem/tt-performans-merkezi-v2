/* Monthly closing reports. One model drives screen, PNG and single-page PDF.
 * All HGO values use sum(actual) / sum(target); products are never added.
 * Archives contain report data only, scoped by reporting month. */
var MER_PRODUCTS = [
  {label:'Faturalı',key:'Postpaid',hist:'postpaid',color:'#df237c'},
  {label:'Faturasız',key:'Prepaid',hist:'prepaid',color:'#079fc6'},
  {label:'Toplam Mobil',key:'Toplam Mobil',hist:'mobil',color:'#23558d'},
  {label:'DSL',key:'DSL',hist:'dsl',color:'#148668'},
  {label:'IPTV',key:'IPTV',hist:'iptv',color:'#7755bb'},
  {label:'Uydu TV',key:'Uydu',hist:'uydu',color:'#c97525'},
  {label:'Cihaz',key:'Akıllı Cihaz',hist:'akilliCihaz',color:'#aa8500'},
  {label:'Diğer Cihaz',key:'Diğer Cihaz',hist:'digerCihaz',color:'#57748b'}
];
var MER_CORE = MER_PRODUCTS.filter(function(p){return p.key !== 'Toplam Mobil';});
var MER_TRENDS = MER_PRODUCTS.filter(function(p){return p.key !== 'Postpaid' && p.key !== 'Prepaid';});
var MER_SY_KEYS = {'Postpaid':'Faturalı','Prepaid':'Faturasız','Toplam Mobil':'Mobil Toplam','DSL':'Evde İnternet','IPTV':'IPTV','Uydu':'Uydu','Akıllı Cihaz':'Cihaz','Diğer Cihaz':'Cihaz Diğer'};
var MER_STORE = 'tt_month_end_archives_v1', MER_MAPPING_STORE = 'tt_month_end_parents_v1';
function merReadStore(key){try{return JSON.parse(localStorage.getItem(key)||'{}')||{};}catch(e){return {};}}
var MER_ARCHIVES = merReadStore(MER_STORE), MER_PARENTS = merReadStore(MER_MAPPING_STORE);
var MER_LIVE = null, merScope = 'branch', merSelection = '', merPeriodSelection = 'current', merDealerCode = null, merHistoryPromise = null, merExporting = false, merStorageNote = '';
function merEsc(v){return String(v == null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function merN(v){return v == null || !isFinite(v)?'—':Math.round(v).toLocaleString('tr-TR');}
function merP(v){return v == null || !isFinite(v)?'—':'%'+Number(v).toFixed(1).replace('.',',');}
function merSigned(v,suffix){return v == null || !isFinite(v)?'—':(v>0?'+':'')+Number(v).toFixed(1).replace('.',',')+(suffix||'');}
function merGap(v){return v == null?'—':(v>0?'+':'')+merN(v);}
function merRate(a,h){return a == null || h == null || h <= 0?null:a/h*100;}
function merChange(a,b){return a == null || b == null || b === 0?null:(a-b)/b*100;}
function merPeriodKey(v){var m=String(v||'').match(/^(\d{4})[/-]?(\d{2})$/);return m && +m[2]>=1 && +m[2]<=12?m[1]+'-'+m[2]:null;}
function merShift(period,n){var d=new Date(Date.UTC(+period.slice(0,4),+period.slice(5)-1+n,1));return d.toISOString().slice(0,7);}
function merPeriodLabel(period){return period?new Date(period+'-01T12:00:00Z').toLocaleDateString('tr-TR',{month:'long',year:'numeric',timeZone:'UTC'}):'Dönem bulunamadı';}
function merMonthShort(period){return new Date(period+'-01T12:00:00Z').toLocaleDateString('tr-TR',{month:'short',timeZone:'UTC'});}
function merTone(v){return v == null?'neutral':v>=100?'good':v>=80?'watch':'low';}
function merDeltaTone(v){return v == null?'neutral':v>=0?'good':'low';}
function merCaptureUpload(parsed,edm){
  var period=merPeriodKey(parsed.donem); if(!period)return;
  var days=parsed.syData||{};
  MER_LIVE={period:period,ttm:parsed.detay,edm:edm,matrix:parsed.matrix,sy:parsed.syData,uploadedAt:new Date().toISOString(),sample:false,closed:!!(days.calismaGun>0 && days.calisilanGun>=days.calismaGun)};
  MER_ARCHIVES[period]=MER_LIVE;
  try{localStorage.setItem(MER_STORE,JSON.stringify(MER_ARCHIVES));merStorageNote='';}catch(e){merStorageNote='Bu ayın raporu cihazda saklanamadı. Ayrıntılı PDF’yi indirin.';}
  merPeriodSelection='current';
}
function merCurrent(){return MER_LIVE||{period:merPeriodKey(typeof DONEM!=='undefined'?DONEM:null),ttm:typeof DETAY!=='undefined'?DETAY:null,edm:null,matrix:typeof MATRIX!=='undefined'?MATRIX:null,sy:typeof SYDATA!=='undefined'?SYDATA:null,sample:true,closed:false};}
function merFromHistory(doc){
  if(!doc)return null;
  if(doc.monthEnd)return Object.assign({},doc.monthEnd,{period:doc.period,sample:false,closed:true,history:false});
  function convert(records){var dealers={};(records||[]).forEach(function(d){var prods={};MER_PRODUCTS.forEach(function(p){if(d[p.hist])prods[p.key]={h:d[p.hist].hedef,a:d[p.hist].adet};});dealers[String(d.bayiKodu)]={kod:String(d.bayiKodu),b:d.bayiAdi,fullName:d.bayiAdi,anaBayiKod:d.anaBayiKodu||d.anaBayiKod||'',bolge:d.bolge||'KUZEY ANADOLU',il:d.il,sy:d.sy,prods:prods};});return dealers;}
  return {period:doc.period,ttm:{bayiler:convert(doc.dealers),cariBayiler:convert(doc.accountDealers),pers:{}},edm:null,matrix:null,benchmarks:doc.benchmarks,closed:true,sample:false,history:true};
}
function merSource(period){
  if(period==='current')return merCurrent();
  var doc=typeof HIST2_DATA!=='undefined'?HIST2_DATA[period]:null,local=MER_ARCHIVES[period];
  if(doc && doc.monthEnd && (!local || !local.closed || !local.uploadedAt || local.uploadedAt<=doc.monthEnd.publishedAt))return merFromHistory(doc);
  return local||merFromHistory(doc);
}
function merSourceAt(period){return MER_LIVE && MER_LIVE.period===period?MER_LIVE:merSource(period);}
function merRows(source,channel){return Object.values((source && source[channel.toLowerCase()] && source[channel.toLowerCase()].bayiler)||{}).map(function(d){return Object.assign({},d,{channel:channel,id:channel+':'+d.kod});});}
/* National branches are available only to cari reports. Uploaded rows win;
 * closed legacy archives can recover matching-month external history. */
function merAccountRows(source){
  var ttm=source && source.ttm||{},extra=ttm.cariBayiler;
  if(extra==null && source && (source.closed||source.sample) && typeof HIST2_DATA!=='undefined'){
    var historic=merFromHistory(HIST2_DATA[source.period]);extra=historic && historic.ttm.cariBayiler;
  }
  return Object.values(Object.assign({},extra||{},ttm.bayiler||{})).map(function(d){return Object.assign({},d,{channel:'TTM',id:'TTM:'+d.kod});});
}
function merName(d){return d.fullName||d.b||d.kod;}
function merParent(d){
  if(MER_PARENTS[d.kod])return {id:'code:'+MER_PARENTS[d.kod],code:MER_PARENTS[d.kod],verified:true};
  if(d.anaBayiKod && d.anaBayiKod!=='-')return {id:'code:'+d.anaBayiKod,code:d.anaBayiKod,verified:true};
  var live=merCurrent(), other=live.ttm && live.ttm.bayiler && live.ttm.bayiler[d.kod];
  if(other && other.anaBayiKod)return {id:'code:'+other.anaBayiKod,code:other.anaBayiKod,verified:true};
  var name=merName(d),historyParent=null;
  if(!d.fullName && typeof HIST2_DATA!=='undefined'){
    Object.keys(HIST2_DATA).sort().reverse().some(function(period){var doc=HIST2_DATA[period];var old=doc && doc.dealers && doc.dealers.find(function(x){return String(x.bayiKodu)===String(d.kod);});if(old){name=old.bayiAdi||name;historyParent=old.anaBayiKodu||old.anaBayiKod;}return !!old;});
  }
  if(historyParent)return {id:'code:'+historyParent,code:historyParent,verified:true};
  return {id:'name:'+String(name).trim().replace(/\s+/g,' ').replace(/[.\s]+$/g,'').toLocaleUpperCase('tr-TR'),code:null,verified:false};
}
function merGroups(source){
  var groups={};merRows(source,'TTM').forEach(function(d){var parent=merParent(d);if(!groups[parent.id])groups[parent.id]={id:parent.id,code:parent.code,name:merName(d),verified:parent.verified,rows:[]};groups[parent.id].rows.push(d);});
  merAccountRows(source).forEach(function(d){var parent=merParent(d),g=groups[parent.id];if(g && !g.rows.some(function(r){return r.kod===d.kod;}))g.rows.push(d);});
  return Object.values(groups).sort(function(a,b){return a.name.localeCompare(b.name,'tr');});
}
function merAggregate(rows,key){
  if(!rows.length)return {a:null,h:null,g:null};
  var a=0,h=0,actualKnown=true,targetKnown=true;
  rows.forEach(function(d){var v=d.prods && d.prods[key];if(!v && key==='Toplam TV' && d.prods){var ip=d.prods.IPTV,tv=d.prods.Uydu;v={a:ip&&tv&&ip.a!=null&&tv.a!=null?Number(ip.a)+Number(tv.a):null,h:ip&&tv&&ip.h!=null&&tv.h!=null?Number(ip.h)+Number(tv.h):null};}if(!v || v.a==null || !isFinite(v.a))actualKnown=false;else a+=Number(v.a);if(!v || v.h==null || !isFinite(v.h))targetKnown=false;else h+=Number(v.h);});
  a=actualKnown?a:null;h=targetKnown?h:null;return {a:a,h:h,g:merRate(a,h)};
}
function merContext(source,scope,selection){
  var rows=merRows(source,'TTM'),name='',code='',group=null;
  if(scope==='branch'){rows=rows.filter(function(d){return d.kod===selection;});name=rows.length?merName(rows[0]):'Şube bulunamadı';code=selection;}
  else if(scope==='account'){group=merGroups(source).find(function(g){return g.id===selection;});rows=group?group.rows:[];name=group?group.name:'Cari bulunamadı';code=group && group.code || 'Ana kod doğrulanmadı';}
  else{rows=rows.concat(merRows(source,'EDM'));name='Kuzey Anadolu Bölgesi';code='TTM + EDM';}
  return {source:source,scope:scope,selection:selection,rows:rows,name:name,code:code,group:group,channels:scope==='region' && source.edm?['TTM','EDM']:['TTM']};
}
/* Cari histories use each month's reported branch membership. A missing
 * branch never becomes a zero record, and missing individual branches stay null. */
function merAccountMonthRows(ctx,src){
  var codes=new Set(ctx.rows.map(function(d){return String(d.kod);}));
  function legalName(d){return merName(d).trim().replace(/\s+/g,' ').replace(/[.\s]+$/g,'').toLocaleUpperCase('tr-TR');}
  var names=new Set(ctx.rows.filter(function(d){return d.fullName;}).map(legalName));
  return merAccountRows(src).filter(function(d){
    var parent=MER_PARENTS[d.kod]||d.anaBayiKod;
    if(parent && parent!=='-' && ctx.group && ctx.group.code)return String(parent)===String(ctx.group.code);
    if(MER_PARENTS[d.kod])return 'code:'+MER_PARENTS[d.kod]===ctx.selection;
    return codes.has(String(d.kod)) || names.has(legalName(d));
  });
}
function merHistoricalValue(ctx,period,p){
  var src=merSourceAt(period);if(!src)return null;
  if(ctx.scope==='region'){
    if(!ctx.source.edm || !src.edm)return null;
    return merAggregate(merRows(src,'TTM').concat(merRows(src,'EDM')),p.key);
  }
  if(ctx.scope==='account'){
    var members=merAccountMonthRows(ctx,src);if(!members.length)return null;
    return Object.assign(merAggregate(members,p.key),{rowCount:members.length});
  }
  var all=merRows(src,'TTM'),rows=ctx.rows.map(function(d){return all.find(function(x){return x.kod===d.kod;});});
  if(rows.some(function(d){return !d;}))return null;
  return merAggregate(rows,p.key);
}
function merStats(ctx,p){
  var current=merAggregate(ctx.rows,p.key),period=ctx.source.period;
  var series=[],pairs=[],year=period && period.slice(0,4),month=period && +period.slice(5);
  if(period)for(var i=1;i<=month;i++){
    var dt=year+'-'+String(i).padStart(2,'0'),value=dt===period?current:merHistoricalValue(ctx,dt,p);
    if(value && value.a!=null && value.h!=null)series.push({period:dt,a:value.a,h:value.h,rowCount:dt===period?ctx.rows.length:value.rowCount});
    var old=merHistoricalValue(ctx,(+year-1)+'-'+String(i).padStart(2,'0'),p);
    if(value && value.a!=null && old && old.a!=null)pairs.push({period:dt,a:value.a,b:old.a});
  }
  var prev=period?merHistoricalValue(ctx,merShift(period,-1),p):null,prevYear=period?merHistoricalValue(ctx,merShift(period,-12),p):null;
  var ytdA=series.length?series.reduce(function(a,v){return a+v.a;},0):null,ytdH=series.length?series.reduce(function(a,v){return a+v.h;},0):null;
  var pairA=pairs.length?pairs.reduce(function(a,v){return a+v.a;},0):null,pairB=pairs.length?pairs.reduce(function(a,v){return a+v.b;},0):null;
  return Object.assign({},current,{gap:current.a==null || current.h==null || current.h<=0?null:current.a-current.h,mom:merChange(current.a,prev&&prev.a),yoy:merChange(current.a,prevYear&&prevYear.a),series:series,ytdA:ytdA,ytdH:ytdH,ytdG:merRate(ytdA,ytdH),ytdGap:ytdA==null||ytdH==null||ytdH<=0?null:ytdA-ytdH,ytdYoY:merChange(pairA,pairB),pairA:pairA,pairB:pairB,months:series.length,pairMonths:pairs.length,expectedMonths:month||0});
}
function merBenchmark(ctx,p,kind){
  if(ctx.scope==='region')return null; // TTM benchmarks do not describe EDM.
  if(kind==='region')return merAggregate(merRows(ctx.source,'TTM'),p.key).g;
  var matrix=ctx.source.matrix;
  if(matrix && matrix.turkiye && typeof matrix.turkiye[p.hist]==='number')return matrix.turkiye[p.hist];
  var tr=ctx.source.benchmarks && ctx.source.benchmarks.turkiye;
  return tr && tr[p.hist] && typeof tr[p.hist].hgo==='number'?tr[p.hist].hgo:null;
}
function merRank(ctx,p){
  if(ctx.scope==='region')return null;
  var entries=ctx.scope==='account'?merGroups(ctx.source).map(function(g){return {id:g.id,rows:g.rows};}):merRows(ctx.source,'TTM').map(function(d){return {id:d.kod,rows:[d]};});
  entries=entries.map(function(e){return {id:e.id,v:merAggregate(e.rows,p.key)};}).filter(function(e){return e.v.g!=null;}).sort(function(a,b){return b.v.g-a.v.g || b.v.a-a.v.a || a.id.localeCompare(b.id);});
  var ix=entries.findIndex(function(e){return e.id===ctx.selection;});return ix<0?null:(ix+1)+' / '+entries.length;
}
function merDetailRows(ctx){
  if(ctx.scope==='branch')return ((ctx.source.ttm.pers||{})[ctx.selection]||[]).map(function(p){return {name:p.p,sub:'Personel',prods:p.prods};}).sort(function(a,b){var aa=merAggregate([a],'Toplam Mobil').a,bb=merAggregate([b],'Toplam Mobil').a;return (bb||0)-(aa||0)||a.name.localeCompare(b.name,'tr');});
  if(ctx.scope==='account')return ctx.rows.map(function(d){return {name:merName(d),sub:d.kod+' · '+(d.il||''),prods:d.prods};});
  var grouped={};ctx.rows.forEach(function(d){var name=d.sy||'Yönetici bilgisi yok',id=typeof normalizeSyName==='function'?normalizeSyName(name):name.toLocaleUpperCase('tr-TR');if(!grouped[id])grouped[id]={name:name,sub:'TTM + EDM',members:[]};grouped[id].members.push(d);});
  return Object.values(grouped).map(function(g){var prods={};MER_PRODUCTS.forEach(function(p){prods[p.key]=merAggregate(g.members,p.key);});return {name:g.name,sub:g.members.length+' bayi · '+Array.from(new Set(g.members.map(function(d){return d.channel;}))).join(' + '),prods:prods};}).sort(function(a,b){return (b.prods['Toplam Mobil'].a||0)-(a.prods['Toplam Mobil'].a||0);});
}
function merModel(){
  var source=merSource(merPeriodSelection)||merCurrent(),options;
  if(merScope==='branch')options=merRows(source,'TTM').sort(function(a,b){return merName(a).localeCompare(merName(b),'tr');}).map(function(d){return {id:d.kod,label:merName(d)+' · '+d.kod};});
  else if(merScope==='account')options=merGroups(source).map(function(g){return {id:g.id,label:g.name+' · '+g.rows.length+' şube'+(g.code?' · '+g.code:'')};});
  else options=[];
  if(options.length && !options.some(function(o){return o.id===merSelection;}))merSelection=options[0].id;
  merDealerCode=merScope==='branch'?merSelection:merScope;
  var ctx=merContext(source,merScope,merSelection);
  ctx.options=options;ctx.products=MER_PRODUCTS.map(function(p){return Object.assign({},p,{s:merStats(ctx,p)});});ctx.details=merDetailRows(ctx);
  ctx.notes=[];
  if(source.sample)ctx.notes.push('Örnek veri; güncel kapanış Excel’ini yükleyin.');
  if(!source.closed)ctx.notes.push('Ara dönem verisi; ay kapanışı henüz doğrulanmadı.');
  if(ctx.scope==='region' && !source.edm)ctx.notes.push('EDM bölge verisi bulunamadı; yalnız TTM gösteriliyor.');
  if(ctx.scope==='account')ctx.notes.push('Cari: diğer bölgelerdeki bağlı şubeler dahil; geçmişte her ayın raporlanan şubeleri toplanır.');
  if(ctx.scope==='account' && ctx.group && ctx.group.code==='7000514' && source.period>='2025-07' && ctx.rows.length<4 && !source.ttm.cariBayiler)ctx.notes.push('Öztürk’ün tüm şubeleri için güncel TTM Excel’ini yeniden yükleyin.');
  if(ctx.group && !ctx.group.verified)ctx.notes.push('Cari grubu şirket adıyla eşleştirildi. Ana cari kodunu eşleştirmelerden doğrulayın.');
  if(source.history)ctx.notes.push('Bu arşivde personel kırılımı bulunmuyor.');
  if(merStorageNote)ctx.notes.push(merStorageNote);
  return ctx;
}
function merIcon(name){
  var paths={wifi:'<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r="1"/>',satellite:'<path d="M5 7a12 12 0 0 0 12 12L5 7zM10 12l6-6m-2-3 7 7M3 22h15M8 19l-2 3M17 2a8 8 0 0 1 5 5"/>',box:'<path d="M3 6l9-4 9 4v12l-9 4-9-4zM3 6l9 5 9-5M12 11v11M8 4l9 5"/>',mobile:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4M11 19h2"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12L22 2m-5 0h5v5"/>',trend:'<path d="M3 19V9m7 10V5m7 14V2M2 22h20"/>',cup:'<path d="M7 3h10v7a5 5 0 0 1-10 0zM7 5H3v3a5 5 0 0 0 4 5m10-8h4v3a5 5 0 0 1-4 5M12 15v6m-4 0h8"/>',screen:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4m-5 0h10"/>',people:'<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3m1-16a3 3 0 0 1 0 6m2 3a6 6 0 0 1 3 5v2"/>'};
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.trend)+'</svg>';
}
function merProductDesign(hist){
  var styles={mobil:['Mobil','Faturalı + Faturasız','#087cfa','mobile'],dsl:['DSL','İnternet','#00b6a6','wifi'],iptv:['IPTV','TV Platformu','#ef007e','screen'],uydu:['Uydu TV','Uydu Platformu','#9332f5','satellite'],akilliCihaz:['Cihaz','Terminal ve Aksesuar','#00acc4','mobile'],digerCihaz:['Diğer Cihaz','Diğer Ürünler','#efa000','box']};
  return styles[hist]||styles.mobil;
}
function merHgoRing(value,color,id){
  var progress=value==null?0:Math.min(100,Math.max(0,value)),circumference=2*Math.PI*46,label=value!=null&&Number.isInteger(value)?'%'+value:merP(value);
  return '<svg class="mer-hgo-ring" viewBox="0 0 112 112" role="img" aria-label="HGO '+merP(value)+'"><defs><linearGradient id="mer-ring-'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+color+'"/><stop offset="1" stop-color="'+color+'" stop-opacity=".72"/></linearGradient></defs><circle cx="56" cy="56" r="46" fill="none" stroke="#dbe9f7" stroke-width="11"/><circle cx="56" cy="56" r="46" fill="none" stroke="url(#mer-ring-'+id+')" stroke-width="11" stroke-linecap="round" stroke-dasharray="'+circumference+'" stroke-dashoffset="'+(circumference*(1-progress/100))+'" transform="rotate(-90 56 56)"/><text x="56" y="57" text-anchor="middle" class="mer-ring-value" style="font-size:'+(label.length>6?17:label.length>5?19:23)+'px">'+label+'</text><text x="56" y="75" text-anchor="middle" class="mer-ring-label">HGO</text></svg>';
}
function merHeader(ctx){
  var status=ctx.source.sample?'ÖRNEK VERİ':ctx.source.closed?'AY KAPANIŞI':'ARA DÖNEM';
  var name=ctx.name;var short=ctx.rows[0] && ctx.rows[0].b;
  if(short && short.length<name.length && ctx.scope!=='region')name=short;
  if(name.length>60)name=name.slice(0,57)+'…';
  var scope=ctx.scope==='branch'?'ŞUBE · '+ctx.code:ctx.scope==='account'?'CARİ TOPLAMI · '+ctx.rows.length+' ŞUBE':'TTM + EDM · '+ctx.rows.length+' BAYİ';
  return '<header class="mer-head"><svg class="mer-header-art" viewBox="0 0 340 100" fill="none"><path d="M10 95L90 45 155 15 228 51 335 80M10 98L145 94 155 15 175 96 228 51 277 96M38 95L90 45 145 94 155 15 228 51 335 80" stroke="#00baff" stroke-width="1.2"/><path d="M145 96L155 15 175 96" stroke="#ed0789" stroke-width="2"/><path d="M10 90L90 40 155 10 228 46 335 75M10 100L90 50 155 20 228 56 335 85" stroke="#1264e2" opacity=".6"/></svg><div class="mer-wordmark">Türk Telekom<svg viewBox="0 0 55 55"><path d="M6 9L19 17 6 25Z" fill="#057cac"/><path d="M22 4L48 19 22 35Z" fill="#18b8db"/><path d="M13 30L34 42 13 54Z" fill="#00a8ca"/><path d="M38 1L49 7 38 14Z" fill="#e6007e"/></svg></div><div class="mer-head-main"><h1>AY SONU PERFORMANS KARNESİ</h1><p title="'+merEsc(ctx.name)+'">'+merEsc(name)+' <span>· '+merEsc(scope)+'</span></p></div><div class="mer-head-scopes">'+[['branch','Şube'],['account','Cari'],['region','Tüm Bölge']].map(function(v){return '<button class="'+(ctx.scope===v[0]?'active':'')+'" onclick="merSetScope(\''+v[0]+'\')">'+v[1]+'</button>';}).join('')+'</div><div class="mer-period"><strong>'+merEsc(merPeriodLabel(ctx.source.period).toLocaleUpperCase('tr-TR'))+'</strong><span class="mer-status">'+status+'</span></div></header>';
}
function merSignals(ctx){
  return '<div class="mer-signals">'+ctx.products.filter(function(p){return MER_TRENDS.some(function(t){return t.key===p.key;});}).map(function(p){var d=merProductDesign(p.hist),v=p.s,known=v.gap!=null,label=!known?'VERİ YOK':v.gap>0?'HEDEF ÜSTÜ':v.gap===0?'HEDEF TAMAM':'KALAN',tone=!known?'neutral':v.gap>=0?'good':'low';return '<article class="mer-signal" style="--mer-product:'+d[2]+'"><div class="mer-signal-title">'+merIcon(d[3])+'<div><h3>'+d[0].toLocaleUpperCase('tr-TR')+'</h3><p>'+d[1]+'</p></div></div><div class="mer-signal-body">'+merHgoRing(v.g,d[2],p.hist)+'<dl><dt>HEDEF</dt><dd>'+merN(v.h)+'</dd><dt>GERÇEKLEŞEN</dt><dd>'+merN(v.a)+'</dd></dl></div><div class="mer-signal-gap '+tone+'"><span>'+merIcon(known&&v.gap>=0?'trend':'box')+label+'</span><strong>'+(known?(v.gap>0?'+':'')+merN(Math.abs(v.gap))+' <small>adet</small>':'—')+'</strong></div></article>';}).join('')+'</div>';
}
function merPerformanceTable(ctx){
  return '<table class="mer-data-table mer-closing-table"><thead><tr><th>Ürün</th><th>Hedef</th><th>Gerçekleşen</th><th>HGO</th><th>Fark</th><th>Aylık Δ</th><th>Yıllık Δ</th><th>Bölge Δ</th></tr></thead><tbody>'+ctx.products.map(function(p){var v=p.s,r=merBenchmark(ctx,p,'region'),diff=v.g==null||r==null?null:v.g-r;return '<tr class="'+(p.hist==='mobil'?'mer-mobile-row':'')+'"><th><span class="mer-product-name" style="color:'+merProductDesign(p.hist)[2]+'">'+merIcon(merProductDesign(p.hist)[3])+'</span>'+p.label+'</th><td>'+merN(v.h)+'</td><td class="mer-actual">'+merN(v.a)+'</td><td><b class="mer-pill '+merTone(v.g)+'">'+merP(v.g)+'</b></td><td class="'+merDeltaTone(v.gap)+'">'+merGap(v.gap)+'</td><td class="'+merDeltaTone(v.mom)+'">'+merSigned(v.mom,'%')+'</td><td class="'+merDeltaTone(v.yoy)+'">'+merSigned(v.yoy,'%')+'</td><td class="'+merDeltaTone(diff)+'">'+merSigned(diff,' puan')+'</td></tr>';}).join('')+'</tbody></table>';
}
function merCommitmentTotal(rows,key){
  if(!rows.length)return null;
  var total=0;for(var i=0;i<rows.length;i++){var value=rows[i].commitments&&rows[i].commitments[key];if(value==null||!isFinite(value))return null;total+=Number(value);}return total;
}
function merCommitments(ctx){
  var list=[{label:'DSL TAAHHÜT',key:'dsl',rows:ctx.rows,color:'#00a99b'},{label:ctx.scope==='region'?'MOBİL TAAHHÜT · TTM':'MOBİL TAAHHÜT',key:'mobil',rows:ctx.rows.filter(function(r){return r.channel!=='EDM';}),color:'#087cfa'}];
  if(ctx.scope==='region')list.push({label:'MOBİL TAAHHÜT UPSELL · EDM',key:'mobilUpsell',rows:ctx.rows.filter(function(r){return r.channel==='EDM';}),color:'#9332f5'});
  return '<div class="mer-commitments">'+list.map(function(p){return '<article style="--mer-product:'+p.color+'"><span>'+p.label+'</span><strong>'+merN(merCommitmentTotal(p.rows,p.key))+' <small>adet</small></strong></article>';}).join('')+'</div>';
}
function merYtdTable(ctx,full){
  var list=full?ctx.products:ctx.products.filter(function(p){return ['mobil','dsl','iptv','akilliCihaz'].includes(p.hist);});
  return '<table class="mer-data-table mer-ytd-table"><thead><tr><th>Ürün</th><th>Gerçek. / Hedef</th><th>HGO</th>'+(full?'<th>Hedef farkı</th><th>Eşleşen ay kıyası</th>':'')+'<th>Yıllık Δ</th></tr></thead><tbody>'+list.map(function(p){var s=p.s;return '<tr><th>'+p.label+'</th><td>'+merN(s.ytdA)+' / '+merN(s.ytdH)+'<small>'+s.months+'/'+s.expectedMonths+' ay</small></td><td><b class="'+merTone(s.ytdG)+'">'+merP(s.ytdG)+'</b></td>'+(full?'<td class="'+merDeltaTone(s.ytdGap)+'">'+merGap(s.ytdGap)+'</td><td>'+merN(s.pairB)+' → '+merN(s.pairA)+'<small>'+s.pairMonths+' eşleşen ay</small></td>':'')+'<td class="'+merDeltaTone(s.ytdYoY)+'">'+merSigned(s.ytdYoY,'%')+'<small>'+s.pairMonths+' eşleşen ay</small></td></tr>';}).join('')+'</tbody></table>';
}
function merSpark(s,color,period,account){
  var vals=[];for(var i=5;i>=0;i--){var dt=merShift(period,-i);var found=s.series.find(function(v){return v.period===dt;});vals.push(found||{period:dt,a:null,h:null});}
  var max=Math.max.apply(null,[1].concat(vals.map(function(v){return Math.max(v.a||0,v.h||0);})));max=Math.ceil(max/Math.pow(10,Math.floor(Math.log10(max))))*Math.pow(10,Math.floor(Math.log10(max)));
  var X=function(i){return 30+i*62;},Y=function(v){return 54-v/max*37;};
  var path=function(key){var d='',open=false;vals.forEach(function(v,i){if(v[key]==null){open=false;return;}d+=(open?' L':' M')+X(i)+','+Y(v[key]);open=true;});return d;};
  var grid=[0,.5,1].map(function(f){return '<path d="M30 '+Y(max*f)+'H340" stroke="#e1eaf5" stroke-width=".8"/><text x="24" y="'+(Y(max*f)+3)+'" text-anchor="end" font-size="8" fill="#8193ae">'+merN(max*f)+'</text>';}).join('');
  var areas='',segment=[];function closeArea(){if(segment.length>1){areas+='<path d="M'+X(segment[0])+',54 '+segment.map(function(i){return 'L'+X(i)+','+Y(vals[i].a);}).join(' ')+' L'+X(segment[segment.length-1])+',54Z" fill="'+color+'" opacity=".10"/>';}segment=[];}vals.forEach(function(v,i){if(v.a==null)closeArea();else segment.push(i);});closeArea();
  return '<svg viewBox="0 0 350 84">'+grid+areas+'<path d="'+path('h')+'" fill="none" stroke="'+color+'" stroke-width="1.4" stroke-dasharray="4 3"/><path d="'+path('a')+'" fill="none" stroke="'+color+'" stroke-width="2.5"/>'+vals.map(function(v,i){return (v.a==null?'':'<circle cx="'+X(i)+'" cy="'+Y(v.a)+'" r="2.5" fill="white" stroke="'+color+'" stroke-width="1.5"><title>'+merEsc(merPeriodLabel(v.period)+' · '+merN(v.a)+' adet'+(v.rowCount!=null?' · '+v.rowCount+' şube':''))+'</title></circle><text class="mer-trend-count" x="'+X(i)+'" y="'+(Y(v.a)-7)+'" text-anchor="'+(i===0?'start':i===vals.length-1?'end':'middle')+'" font-size="9" font-weight="700" fill="'+color+'" stroke="#f8fcff" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke">'+merN(v.a)+'</text>')+'<text x="'+X(i)+'" y="70" text-anchor="middle" fill="#788cab" font-size="8">'+merMonthShort(v.period)+'</text>'+(account?'<text x="'+X(i)+'" y="81" text-anchor="middle" fill="#8193ae" font-size="7">'+(v.rowCount!=null?v.rowCount+' şb':'—')+'</text>':'');}).join('')+'</svg>';
}
function merTrends(ctx){
  return '<div class="mer-trends">'+ctx.products.filter(function(p){return MER_TRENDS.some(function(t){return t.key===p.key;});}).map(function(p){var d=merProductDesign(p.hist);return '<div class="mer-trend" style="--mer-product:'+d[2]+'"><div class="mer-trend-h"><b>'+d[0].toLocaleUpperCase('tr-TR')+'</b><div class="mer-trend-values">Hedef: '+merN(p.s.h)+' <i>│</i> <strong>Gerçekleşen: '+merN(p.s.a)+'</strong></div></div>'+merSpark(p.s,d[2],ctx.source.period,ctx.scope==='account')+'</div>';}).join('')+'</div>';
}
function merDetailTitle(ctx){return ctx.scope==='branch'?'PERSONEL PERFORMANSI':ctx.scope==='account'?'ŞUBE KARŞILAŞTIRMASI':'SATIŞ YÖNETİCİLERİ';}
function merDetailsTable(ctx,rows){
  var keys=['Toplam Mobil','DSL','IPTV','Uydu','Akıllı Cihaz','Diğer Cihaz'],names=['Mobil','DSL','IPTV','Uydu TV','Cihaz','Diğer Cihaz'];
  var n=rows.length,font=n<=5?11:n<=8?10:n<=12?9:8,rowHeight=n?Math.min(27,115/n):27;
  return '<table class="mer-data-table mer-details-table '+(n>5?'mer-compact':'')+'" style="--mer-detail-font:'+font+'px;--mer-detail-row:'+rowHeight+'px"><thead><tr><th>'+({branch:'Personel',account:'Şube',region:'Satış yöneticisi'}[ctx.scope])+'</th>'+names.map(function(x){return '<th>'+x+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(r){var label=ctx.scope==='account'?r.sub:r.name;return '<tr><th title="'+merEsc(r.name)+'"><span class="mer-row-name">'+merEsc(label)+'</span></th>'+keys.map(function(key){var v=merAggregate([r],key);return '<td title="Hedef '+merN(v.h)+' · Gerçekleşen '+merN(v.a)+'"><b class="mer-pill '+merTone(v.g)+'">'+merP(v.g)+'</b><small>'+merN(v.a)+'</small></td>';}).join('')+'</tr>';}).join('')+'</tbody></table>'+(rows.length?'':'<div class="mer-empty">Bu dönem için '+(ctx.scope==='branch'?'personel':'detay')+' verisi bulunamadı.</div>');
}
function merYtdMini(p){
  var a=p.s.pairA!=null?p.s.pairA:p.s.ytdA,b=p.s.pairB,max=Math.max(1,a||0,b||0),base=60;
  function bar(value,x,color){var h=value==null?0:value/max*46;return (value==null?'':'<rect x="'+x+'" y="'+(base-h)+'" width="23" height="'+h+'" rx="2" fill="'+color+'"/>')+'<text x="'+(x+11.5)+'" y="'+(base-h-5)+'" text-anchor="middle">'+merN(value)+'</text>';}
  return '<div class="mer-ytd-mini" data-product="'+p.hist+'"><h3>'+merEsc(p.hist==='mobil'?'Mobil':p.hist==='uydu'?'Uydu':p.label)+'</h3><svg viewBox="0 0 160 70" role="img" aria-label="'+merEsc(p.label+' yıllık birikim: önceki yıl '+merN(b)+', bu yıl '+merN(a))+'"><path d="M26 14H144M26 37H144M26 60H144" fill="none" stroke="#e6edf6" stroke-width="1"/>'+bar(b,46,'#289df5')+bar(a,91,'#ec2486')+'</svg></div>';
}
function merYtdChart(ctx){
  var list=ctx.products.filter(function(p){return MER_TRENDS.some(function(t){return t.key===p.key;});}),year=+ctx.source.period.slice(0,4),partial=list.some(function(p){return p.s.months<p.s.expectedMonths;});
  return '<div class="mer-ytd-legend"><span><i></i>'+(year-1)+'</span><span><i></i>'+year+'</span><small>Her ürün kendi ölçeğinde</small></div><div class="mer-ytd-grid">'+list.map(merYtdMini).join('')+'</div><p class="mer-ytd-note">'+(partial?'Birikim eksik · kayıtlı aylar':'Eşleşen aylar üzerinden yıllık kıyas')+' · — veri yok</p>';
}
function merYtdPerformance(ctx){
  var coverage=[];
  var list=[{label:'Mobil',key:'Toplam Mobil',hist:'mobil'},{label:'DSL',key:'DSL',hist:'dsl'},{label:'TV',key:'Toplam TV',hist:'tv'},{label:'Cihaz',key:'Akıllı Cihaz',hist:'akilliCihaz'}];
  return '<div class="mer-ytd-performance-grid">'+list.map(function(p){var v=merStats(ctx,p),color=p.hist==='tv'?'#ef007e':merProductDesign(p.hist)[2],known=v.ytdGap!=null,tone=!known?'neutral':v.ytdGap>=0?'good':'low',label=!known?'Veri yok':v.ytdGap>0?'Fazla':v.ytdGap===0?'Tamam':'Eksik',max=Math.max(120,v.ytdG||0),width=v.ytdG==null?0:Math.max(0,Math.min(100,v.ytdG/max*100));if(v.months<v.expectedMonths)coverage.push(p.label+' '+v.months+'/'+v.expectedMonths+' ay');return '<article style="--mer-product:'+color+'" title="'+merEsc(p.label+' · '+v.months+'/'+v.expectedMonths+' ay')+'"><div class="mer-ytd-metric"><h3>'+p.label+'</h3><b class="'+merTone(v.ytdG)+'">'+merP(v.ytdG)+' <small>HGO</small></b><span class="'+tone+'">'+(known?(v.ytdGap>0?'+':'')+merN(Math.abs(v.ytdGap))+' adet · '+label:'—')+'</span></div><div class="mer-ytd-counts"><span>Hedef <b>'+merN(v.ytdH)+'</b></span><span>Aktivasyon <b>'+merN(v.ytdA)+'</b></span></div><div class="mer-ytd-bullet" role="img" aria-label="'+merEsc(p.label+' YTD HGO '+merP(v.ytdG))+'"><i style="width:'+width+'%"></i><em style="left:'+(100/max*100)+'%" title="%100 hedef"></em></div></article>';}).join('')+'</div><p class="mer-caption">Ocak–'+merEsc(merMonthShort(ctx.source.period))+' · TV: IPTV + Uydu TV'+(coverage.length?' · Eksik kapsam: '+merEsc(coverage.join(', ')):'')+'</p>';
}
function merChannelTable(ctx){return '<table class="mer-data-table"><thead><tr><th>Ürün</th><th>TTM G / H</th><th>TTM HGO</th><th>EDM G / H</th><th>EDM HGO</th><th>Bölge G / H</th><th>Bölge HGO</th></tr></thead><tbody>'+ctx.products.map(function(p){var t=merAggregate(merRows(ctx.source,'TTM'),p.key),e=merAggregate(merRows(ctx.source,'EDM'),p.key);return '<tr><th>'+p.label+'</th><td>'+merN(t.a)+' / '+merN(t.h)+'</td><td>'+merP(t.g)+'</td><td>'+merN(e.a)+' / '+merN(e.h)+'</td><td>'+merP(e.g)+'</td><td>'+merN(p.s.a)+' / '+merN(p.s.h)+'</td><td>'+merP(p.s.g)+'</td></tr>';}).join('')+'</tbody></table>';}
function merContributionTable(ctx){
  return '<table class="mer-data-table"><thead><tr><th>Şube / Bayi kodu</th>'+MER_TRENDS.map(function(p){return '<th>'+p.label+' katkı</th>';}).join('')+'</tr></thead><tbody>'+ctx.rows.map(function(d){return '<tr><th>'+merEsc(merName(d))+'<small>'+merEsc(d.kod+' · '+(d.il||''))+'</small></th>'+MER_TRENDS.map(function(p){var v=merAggregate([d],p.key),all=merAggregate(ctx.rows,p.key);return '<td>'+merP(merRate(v.a,all.a))+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table>';
}
function merNotes(ctx){return '<div class="mer-notes">'+(ctx.notes.length?ctx.notes.map(merEsc).join(' · '):'Kapsam: '+(ctx.scope==='region'?'Kuzey Anadolu TTM + EDM':'Kuzey Anadolu TTM'))+'</div>';}
function merFooter(ctx){
  return '<footer class="mer-report-footer"><div><span>'+merEsc(ctx.notes.join(' · '))+'</span><span>Kuzey Anadolu · TTM Performans Merkezi</span></div><div><span>HGO = gerçekleşen / hedef · — veri yok · Bölge Δ: TTM HGO farkı</span><span>'+merEsc(ctx.source.uploadedAt?'Yükleme '+new Date(ctx.source.uploadedAt).toLocaleDateString('tr-TR'):'Dönem '+ctx.source.period)+'</span></div></footer>';
}
function merSummary(ctx){
  return '<section class="mer-report mer-summary" id="month-end-report">'+merHeader(ctx)+merSignals(ctx)+'<div class="mer-main"><div class="mer-panel mer-performance-panel"><h2>'+merIcon('trend')+'ÜRÜN BAZLI AY KAPANIŞI</h2>'+merPerformanceTable(ctx)+merCommitments(ctx)+'</div><div class="mer-panel mer-trend-panel"><h2>'+merIcon('trend')+'ÜRÜN BAZLI TRENDLER<span class="mer-trend-key">● Gerçekleşen <i></i> Hedef</span></h2>'+merTrends(ctx)+'</div></div><div class="mer-bottom"><div class="mer-panel mer-actors-panel '+(ctx.details.length>5?'mer-dense':'')+'"><h2>'+merIcon('people')+merDetailTitle(ctx)+'<span>'+ctx.details.length+' '+(ctx.scope==='branch'?'personel':ctx.scope==='account'?'şube':'yönetici')+'</span></h2>'+merDetailsTable(ctx,ctx.details)+'<p class="mer-caption">HGO · gerçekleşen adet</p></div><div class="mer-panel mer-year-panel"><h2>'+merIcon('trend')+'YILIN BİRİKİMİ · OCAK–'+merEsc(merMonthShort(ctx.source.period).toLocaleUpperCase('tr-TR'))+'</h2>'+merYtdChart(ctx)+'</div><div class="mer-panel mer-ytd-performance"><h2>'+merIcon('target')+'YTD PERFORMANSI</h2>'+merYtdPerformance(ctx)+'</div></div>'+merFooter(ctx)+'</section>';
}
function merSetScope(value){merScope=value;merSelection='';renderMonthEndReport();}
function merSetPeriod(value){merPeriodSelection=value;merSelection='';renderMonthEndReport();}
function merSetSelection(value){merSelection=value;renderMonthEndReport();}
function merMappingUI(source){
  return '<details class="mer-mapping"><summary>Cari eşleştirmeleri</summary><p>Excel’deki ana bayi kodu önceliklidir. Eski raporda kod yoksa aynı şirket adıyla geçici gruplama yapılır. Düzeltmek için şubelerin bağlı olduğu ana kodu yazın.</p><div>'+merRows(source,'TTM').map(function(d){return '<label><span>'+merEsc(merName(d))+' <small>'+merEsc(d.kod)+'</small></span><input data-mer-parent="'+merEsc(d.kod)+'" value="'+merEsc(MER_PARENTS[d.kod]||d.anaBayiKod||'')+'" placeholder="Ana cari kodu" inputmode="numeric"></label>';}).join('')+'</div><button onclick="merSaveParents()">Eşleştirmeleri kaydet</button></details>';
}
function merSaveParents(){
  var next=Object.assign({},MER_PARENTS);document.querySelectorAll('[data-mer-parent]').forEach(function(el){var val=el.value.trim();if(val)next[el.dataset.merParent]=val;else delete next[el.dataset.merParent];});
  try{localStorage.setItem(MER_MAPPING_STORE,JSON.stringify(next));MER_PARENTS=next;merSelection='';renderMonthEndReport();}catch(e){alert('Cari eşleştirmeleri kaydedilemedi.');}
}
function merFit(){
  var wrap=document.querySelector('.mer-scroll'),report=document.getElementById('month-end-report');if(!wrap||!report)return;
  var scale=Math.min(1,Math.max(0.15,(wrap.clientWidth-16)/1600));report.style.transform='scale('+scale+')';report.style.marginBottom=(900*(scale-1))+'px';
}
if(typeof window!=='undefined')window.addEventListener('resize',merFit);
function merEnsureHistory(){
  if(!merHistoryPromise && typeof loadAllHistory==='function')merHistoryPromise=(async function(){
    if(typeof HIST2_LOADING!=='undefined' && HIST2_LOADING){while(HIST2_LOADING)await new Promise(function(r){setTimeout(r,50);});}
    if(!HIST2_LOADED)await loadAllHistory();
    if(merPeriodSelection==='current' && !MER_LIVE && merCurrent().sample){var saved=Object.keys(HIST2_DATA).filter(function(p){return HIST2_DATA[p] && HIST2_DATA[p].monthEnd;}).sort().reverse()[0];if(saved)merPeriodSelection=saved;}
  })();
  return merHistoryPromise||Promise.resolve();
}
function renderMonthEndReport(){
  var cards=document.getElementById('cards');cards.className='cards single';cards.style.maxWidth='none';var ctx=merModel();
  if(!ctx.source.period){cards.innerHTML='<div class="mer-empty">Rapor dönemi bulunamadı. Güncel Excel raporunu yükleyin.</div>';return;}
  var periods=Array.from(new Set(Object.keys(MER_ARCHIVES).concat(typeof HIST2_DATA!=='undefined'?Object.keys(HIST2_DATA).filter(function(p){return HIST2_DATA[p];}):[]))).sort().reverse();
  var po='<option value="current" '+(merPeriodSelection==='current'?'selected':'')+'>Güncel · '+merPeriodLabel(merCurrent().period)+'</option>'+periods.map(function(p){return '<option value="'+p+'" '+(merPeriodSelection===p?'selected':'')+'>'+merPeriodLabel(p)+'</option>';}).join('');
  cards.innerHTML='<div class="mer-toolbar"><div class="mer-scope-toggle">'+[['branch','Şube'],['account','Cari'],['region','Tüm Bölge']].map(function(v){return '<button class="'+(merScope===v[0]?'active':'')+'" onclick="merSetScope(\''+v[0]+'\')">'+v[1]+'</button>';}).join('')+'</div><select aria-label="Rapor dönemi" onchange="merSetPeriod(this.value)">'+po+'</select>'+(ctx.options.length?'<select class="mer-dealer-select" aria-label="Bayi veya cari" onchange="merSetSelection(this.value)">'+ctx.options.map(function(o){return '<option value="'+merEsc(o.id)+'" '+(o.id===merSelection?'selected':'')+'>'+merEsc(o.label)+'</option>';}).join('')+'</select>':'')+'<button class="mer-pdf-button" onclick="exportMonthEndPDF()">Tek Sayfa PDF</button><button class="mer-png-button" onclick="exportMonthEndPNG()">PNG Paylaş</button></div><div class="mer-scroll">'+merSummary(ctx)+'</div>'+merMappingUI(ctx.source);
  merFit();
  merEnsureHistory().then(function(){if(typeof section==='undefined'||section==='monthEnd'){if(!document.querySelector('.mer-toolbar'))return;var all=typeof HIST2_DATA!=='undefined'?Object.keys(HIST2_DATA).length:0;if(cards.dataset.merHistory!==String(all)){cards.dataset.merHistory=String(all);renderMonthEndReport();}}});
}
async function merRenderCanvas(node){
  await ensureH2C();if(document.fonts && document.fonts.ready)await document.fonts.ready;
  return html2canvas(node,{scale:2.56,width:1600,height:900,windowWidth:1700,windowHeight:1100,backgroundColor:'#f1f8ff',logging:false});
}
async function merExportCanvases(includeDetails){
  await merEnsureHistory();var ctx=merModel(),host=document.createElement('div');host.className='mer-export-host';host.innerHTML=merSummary(ctx);

  document.body.appendChild(host);
  try{var canvases=[];for(var node of host.querySelectorAll('.mer-report'))canvases.push(await merRenderCanvas(node));return {canvases:canvases,ctx:ctx};}finally{host.remove();}
}
function merFileName(ctx,ext){
  var code=ctx.scope==='account'?(ctx.group && ctx.group.code||'Cari'):ctx.scope==='branch'?ctx.code:'',name=ctx.rows && ctx.rows[0] && ctx.rows[0].b||ctx.name;
  if(ctx.scope==='region')name=ctx.name;
  var base=(code?code+' - ':'')+name;
  return base.replace(/[<>:"/\\|?*\u0000-\u001f]/g,' ').replace(/\s+/g,' ').replace(/[.\s]+$/g,'').trim()+'.'+ext;
}
function merShareText(ctx){
  var month=new Date(ctx.source.period+'-01T12:00:00Z').toLocaleDateString('tr-TR',{month:'long',timeZone:'UTC'}),code=ctx.scope==='account'?(ctx.group && ctx.group.code||'Cari'):ctx.scope==='branch'?ctx.code:'Kuzey Anadolu';
  return month.charAt(0).toLocaleUpperCase('tr-TR')+month.slice(1)+' Kapanış - '+code;
}
function merExportBusy(busy){merExporting=busy;document.querySelectorAll('.mer-pdf-button,.mer-png-button').forEach(function(b){b.disabled=busy;});}
async function exportMonthEndPNG(){
  if(merExporting)return;merExportBusy(true);try{var out=await merExportCanvases(false);_openSharePreview(out.canvases[0].toDataURL('image/png'),merFileName(out.ctx,'png'),{text:merShareText(out.ctx)});}catch(e){alert('Görsel oluşturulamadı: '+e.message);}finally{merExportBusy(false);}
}
/* The dashboard exports to one 16:9 PDF page. */
function merCanvasToPdfBytes(canvases){
  if(!Array.isArray(canvases))canvases=[canvases];var encoder=new TextEncoder(),chunks=[],offsets=[0],len=0;
  function push(v){var b=typeof v==='string'?encoder.encode(v):v;chunks.push(b);len+=b.length;}
  function obj(n,parts){offsets[n]=len;push(n+' 0 obj\n');parts.forEach(push);push('\nendobj\n');}
  push('%PDF-1.4\n');obj(1,['<< /Type /Catalog /Pages 2 0 R >>']);var kids=canvases.map(function(c,i){return (3+i*3)+' 0 R';});obj(2,['<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+canvases.length+' >>']);
  canvases.forEach(function(canvas,i){var n=3+i*3,binary=atob(canvas.toDataURL('image/jpeg',0.98).split(',')[1]),bytes=new Uint8Array(binary.length);for(var j=0;j<binary.length;j++)bytes[j]=binary.charCodeAt(j);
    var w=1190.55,h=w*9/16,dw=Math.min(w,h*canvas.width/canvas.height),dh=dw*canvas.height/canvas.width,content='q\n'+dw.toFixed(2)+' 0 0 '+dh.toFixed(2)+' '+((w-dw)/2).toFixed(2)+' '+((h-dh)/2).toFixed(2)+' cm\n/Im0 Do\nQ\n';
    obj(n,['<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+w+' '+h+'] /Resources << /XObject << /Im0 '+(n+1)+' 0 R >> >> /Contents '+(n+2)+' 0 R >>']);obj(n+1,['<< /Type /XObject /Subtype /Image /Width '+canvas.width+' /Height '+canvas.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+bytes.length+' >>\nstream\n',bytes,'\nendstream']);obj(n+2,['<< /Length '+encoder.encode(content).length+' >>\nstream\n'+content+'endstream']);
  });var count=3+canvases.length*3,xref=len;push('xref\n0 '+count+'\n0000000000 65535 f \n');for(var k=1;k<count;k++)push(String(offsets[k]).padStart(10,'0')+' 00000 n \n');push('trailer\n<< /Size '+count+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');var pdf=new Uint8Array(len),at=0;chunks.forEach(function(c){pdf.set(c,at);at+=c.length;});return pdf;
}
async function exportMonthEndPDF(){
  if(merExporting)return;merExportBusy(true);try{var out=await merExportCanvases(false),blob=new Blob([merCanvasToPdfBytes(out.canvases)],{type:'application/pdf'}),name=merFileName(out.ctx,'pdf'),file=typeof File!=='undefined'?new File([blob],name,{type:'application/pdf'}):null;
    if(file && navigator.share && navigator.canShare && navigator.canShare({files:[file]}))await navigator.share({files:[file],text:merShareText(out.ctx)});
    else{var url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(function(){URL.revokeObjectURL(url);},30000);}
  }catch(e){if(e.name!=='AbortError')alert('PDF oluşturulamadı: '+e.message);}finally{merExportBusy(false);}
}
