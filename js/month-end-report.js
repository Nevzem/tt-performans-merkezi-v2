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
  var dealers={}; (doc.dealers||[]).forEach(function(d){var prods={};MER_PRODUCTS.forEach(function(p){if(d[p.hist])prods[p.key]={h:d[p.hist].hedef,a:d[p.hist].adet};});dealers[String(d.bayiKodu)]={kod:String(d.bayiKodu),b:d.bayiAdi,fullName:d.bayiAdi,anaBayiKod:d.anaBayiKodu||d.anaBayiKod||'',il:d.il,sy:d.sy,prods:prods};});
  return {period:doc.period,ttm:{bayiler:dealers,pers:{}},edm:null,matrix:null,benchmarks:doc.benchmarks,closed:true,sample:false,history:true};
}
function merSource(period){
  if(period==='current')return merCurrent();
  return MER_ARCHIVES[period]||merFromHistory(typeof HIST2_DATA!=='undefined'?HIST2_DATA[period]:null);
}
function merSourceAt(period){return MER_LIVE && MER_LIVE.period===period?MER_LIVE:merSource(period);}
function merRows(source,channel){return Object.values((source && source[channel.toLowerCase()] && source[channel.toLowerCase()].bayiler)||{}).map(function(d){return Object.assign({},d,{channel:channel,id:channel+':'+d.kod});});}
function merName(d){return d.fullName||d.b||d.kod;}
function merParent(d){
  if(MER_PARENTS[d.kod])return {id:'code:'+MER_PARENTS[d.kod],code:MER_PARENTS[d.kod],verified:true};
  if(d.anaBayiKod && d.anaBayiKod!=='-')return {id:'code:'+d.anaBayiKod,code:d.anaBayiKod,verified:true};
  var live=merCurrent(), other=live.ttm && live.ttm.bayiler && live.ttm.bayiler[d.kod];
  if(other && other.anaBayiKod)return {id:'code:'+other.anaBayiKod,code:other.anaBayiKod,verified:true};
  var name=merName(d);
  if(!d.fullName && typeof HIST2_DATA!=='undefined'){
    Object.keys(HIST2_DATA).sort().reverse().some(function(period){var doc=HIST2_DATA[period];var old=doc && doc.dealers && doc.dealers.find(function(x){return String(x.bayiKodu)===String(d.kod);});if(old){name=old.bayiAdi||name;}return !!old;});
  }
  return {id:'name:'+String(name).trim().replace(/\s+/g,' ').replace(/[.\s]+$/g,'').toLocaleUpperCase('tr-TR'),code:null,verified:false};
}
function merGroups(source){
  var groups={};merRows(source,'TTM').forEach(function(d){var parent=merParent(d);if(!groups[parent.id])groups[parent.id]={id:parent.id,code:parent.code,name:merName(d),verified:parent.verified,rows:[]};groups[parent.id].rows.push(d);});
  return Object.values(groups).sort(function(a,b){return a.name.localeCompare(b.name,'tr');});
}
function merAggregate(rows,key){
  if(!rows.length)return {a:null,h:null,g:null};
  var a=0,h=0,actualKnown=true,targetKnown=true;
  rows.forEach(function(d){var v=d.prods && d.prods[key];if(!v || v.a==null || !isFinite(v.a))actualKnown=false;else a+=Number(v.a);if(!v || v.h==null || !isFinite(v.h))targetKnown=false;else h+=Number(v.h);});
  a=actualKnown?a:null;h=targetKnown?h:null;return {a:a,h:h,g:merRate(a,h)};
}
function merContext(source,scope,selection){
  var rows=merRows(source,'TTM'),name='',code='',group=null;
  if(scope==='branch'){rows=rows.filter(function(d){return d.kod===selection;});name=rows.length?merName(rows[0]):'Şube bulunamadı';code=selection;}
  else if(scope==='account'){group=merGroups(source).find(function(g){return g.id===selection;});rows=group?group.rows:[];name=group?group.name:'Cari bulunamadı';code=group && group.code || 'Ana kod doğrulanmadı';}
  else{rows=rows.concat(merRows(source,'EDM'));name='Kuzey Anadolu Bölgesi';code='TTM + EDM';}
  return {source:source,scope:scope,selection:selection,rows:rows,name:name,code:code,group:group,channels:scope==='region' && source.edm?['TTM','EDM']:['TTM']};
}
/* Strict scope matching prevents a partial archive being compared with a full
 * combined region, or silently treating absent branches/products as zero. */
function merHistoricalValue(ctx,period,p){
  var src=merSourceAt(period);if(!src)return null;
  if(ctx.scope==='region'){
    if(!ctx.source.edm || !src.edm)return null;
    return merAggregate(merRows(src,'TTM').concat(merRows(src,'EDM')),p.key);
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
    if(value && value.a!=null && value.h!=null)series.push({period:dt,a:value.a,h:value.h});
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
  if(ctx.group && !ctx.group.verified)ctx.notes.push('Cari grubu şirket adıyla eşleştirildi. Ana cari kodunu eşleştirmelerden doğrulayın.');
  if(source.history)ctx.notes.push('Bu arşivde personel kırılımı bulunmuyor.');
  if(merStorageNote)ctx.notes.push(merStorageNote);
  return ctx;
}
function merInsights(ctx){
  var base=ctx.products.filter(function(p){return p.key!=='Toplam Mobil' && p.s.g!=null;}),gaps=base.filter(function(p){return p.s.gap<0;}).sort(function(a,b){return a.s.g-b.s.g;}),best=base.slice().sort(function(a,b){return b.s.g-a.s.g;})[0];
  var out=gaps.slice(0,2).map(function(p){return {tag:'ÖNCELİK',title:p.label+' · '+merN(-p.s.gap)+' adet açık',body:'Ay HGO '+merP(p.s.g)+'. Gelecek ay '+p.label+' satış planında bu açığı önceliklendirin.',tone:'low'};});
  if(best)out.push({tag:best.s.g>=100?'GÜÇLÜ ALAN':'GÖRECE GÜÇLÜ',title:best.label+' · '+merP(best.s.g),body:best.s.g>=100?'Hedef '+merN(best.s.gap)+' adet aşıldı. Başarılı satış uygulamasını diğer ürünlere taşıyın.':'En yüksek HGO bu üründe. Satış temposunu koruyup hedefin altındaki ürünlere destek verin.',tone:best.s.g>=100?'good':'watch'});
  return out.slice(0,3);
}
function merIcon(name){
  var paths={mobile:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4M11 19h2"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12L22 2m-5 0h5v5"/>',trend:'<path d="M3 19V9m7 10V5m7 14V2M2 22h20"/>',cup:'<path d="M7 3h10v7a5 5 0 0 1-10 0zM7 5H3v3a5 5 0 0 0 4 5m10-8h4v3a5 5 0 0 1-4 5M12 15v6m-4 0h8"/>',screen:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4m-5 0h10"/>',people:'<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3m1-16a3 3 0 0 1 0 6m2 3a6 6 0 0 1 3 5v2"/>'};
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.trend)+'</svg>';
}
function merHeader(ctx){
  var status=ctx.source.sample?'ÖRNEK VERİ':ctx.source.closed?'AY KAPANIŞI':'ARA DÖNEM';
  var name=ctx.name;var short=ctx.rows[0] && ctx.rows[0].b;
  if(short && short.length<name.length && ctx.scope!=='region')name=short;
  if(name.length>60)name=name.slice(0,57)+'…';
  var scope=ctx.scope==='branch'?'ŞUBE · '+ctx.code:ctx.scope==='account'?'CARİ TOPLAMI · '+ctx.rows.length+' ŞUBE':'TTM + EDM · '+ctx.rows.length+' BAYİ';
  return '<header class="mer-head"><div class="mer-wordmark">Türk Telekom<svg viewBox="0 0 55 55"><path d="M6 9L19 17 6 25Z" fill="#057cac"/><path d="M22 4L48 19 22 35Z" fill="#18b8db"/><path d="M13 30L34 42 13 54Z" fill="#00a8ca"/><path d="M38 1L49 7 38 14Z" fill="#e6007e"/></svg></div><div class="mer-head-main"><h1>AY SONU PERFORMANS KARNESİ</h1><p title="'+merEsc(ctx.name)+'">'+merEsc(name)+' <span>· '+merEsc(scope)+'</span></p></div><div class="mer-head-scopes">'+[['branch','Şube'],['account','Cari'],['region','Tüm Bölge']].map(function(v){return '<button class="'+(ctx.scope===v[0]?'active':'')+'" onclick="merSetScope(\''+v[0]+'\')">'+v[1]+'</button>';}).join('')+'</div><div class="mer-period"><strong>'+merEsc(merPeriodLabel(ctx.source.period).toLocaleUpperCase('tr-TR'))+'</strong><span class="mer-status">'+status+'</span></div></header>';
}
function merSignals(ctx){
  var base=ctx.products.filter(function(p){return p.key!=='Toplam Mobil' && p.s.g!=null;}),done=base.filter(function(p){return p.s.g>=100;});
  var mobile=ctx.products.find(function(p){return p.hist==='mobil';}),ip=ctx.products.find(function(p){return p.hist==='iptv';}),dsl=ctx.products.find(function(p){return p.hist==='dsl';});
  var data=[['TOPLAM MOBİL',merN(mobile.s.a),merP(mobile.s.g)+' HGO','mobile','',true],['HEDEF TAMAMLANAN',done.length+' / '+base.length,'ürün','target','',false],['ÖNCEKİ AYA GÖRE',merSigned(mobile.s.mom,'%'),mobile.s.mom==null?'Önceki ay verisi yok':'Mobil satış değişimi','trend',merDeltaTone(mobile.s.mom),false],[ctx.scope==='region'?'BÖLGE KAPSAMI':'BÖLGE SIRALAMASI',ctx.scope==='region'?ctx.rows.length:merRank(ctx,mobile)||'—',ctx.scope==='region'?(ctx.source.edm?'TTM + EDM':'Yalnız TTM'):ctx.scope==='account'?'Cari bazında':'Şube bazında','cup','',false],['IPTV / DSL',merP(merRate(ip.s.a,dsl.s.a)),'Satış oranı','screen','',false]];
  return '<div class="mer-signals">'+data.map(function(v,i){return '<div class="mer-signal"><i class="mer-signal-icon">'+merIcon(v[3])+'</i><div><small>'+v[0]+'</small><strong class="'+v[4]+'">'+v[1]+'</strong><span class="'+(v[5]?'mer-pill '+merTone(mobile.s.g):'')+'">'+v[2]+'</span></div><svg class="mer-kpi-decoration" viewBox="0 0 60 65"><path d="M8 40h10v18H8zm17-14h10v32H25zm17-14h10v46H42z" fill="'+(i===2?'#11bca2':'#6ca8ed')+'" opacity=".22"/></svg></div>';}).join('')+'</div>';
}
function merPerformanceTable(ctx){
  return '<table class="mer-data-table mer-closing-table"><thead><tr><th>Ürün</th><th>Hedef</th><th>Gerçekleşen</th><th>HGO</th><th>Fark</th><th>Aylık Δ</th><th>Yıllık Δ</th><th>Bölge Δ</th></tr></thead><tbody>'+ctx.products.map(function(p){var v=p.s,r=merBenchmark(ctx,p,'region'),diff=v.g==null||r==null?null:v.g-r;return '<tr class="'+(p.hist==='mobil'?'mer-mobile-row':'')+'"><th>'+p.label+'</th><td>'+merN(v.h)+'</td><td class="mer-actual">'+merN(v.a)+'</td><td><b class="mer-pill '+merTone(v.g)+'">'+merP(v.g)+'</b></td><td class="'+merDeltaTone(v.gap)+'">'+merGap(v.gap)+'</td><td class="'+merDeltaTone(v.mom)+'">'+merSigned(v.mom,'%')+'</td><td class="'+merDeltaTone(v.yoy)+'">'+merSigned(v.yoy,'%')+'</td><td class="'+merDeltaTone(diff)+'">'+merSigned(diff,' puan')+'</td></tr>';}).join('')+'</tbody></table>';
}
function merYtdTable(ctx,full){
  var list=full?ctx.products:ctx.products.filter(function(p){return ['mobil','dsl','iptv','akilliCihaz'].includes(p.hist);});
  return '<table class="mer-data-table mer-ytd-table"><thead><tr><th>Ürün</th><th>Gerçek. / Hedef</th><th>HGO</th>'+(full?'<th>Hedef farkı</th><th>Eşleşen ay kıyası</th>':'')+'<th>Yıllık Δ</th></tr></thead><tbody>'+list.map(function(p){var s=p.s;return '<tr><th>'+p.label+'</th><td>'+merN(s.ytdA)+' / '+merN(s.ytdH)+'<small>'+s.months+'/'+s.expectedMonths+' ay</small></td><td><b class="'+merTone(s.ytdG)+'">'+merP(s.ytdG)+'</b></td>'+(full?'<td class="'+merDeltaTone(s.ytdGap)+'">'+merGap(s.ytdGap)+'</td><td>'+merN(s.pairB)+' → '+merN(s.pairA)+'<small>'+s.pairMonths+' eşleşen ay</small></td>':'')+'<td class="'+merDeltaTone(s.ytdYoY)+'">'+merSigned(s.ytdYoY,'%')+'<small>'+s.pairMonths+' eşleşen ay</small></td></tr>';}).join('')+'</tbody></table>';
}
function merSpark(s,color,period){
  var vals=[];for(var i=5;i>=0;i--){var dt=merShift(period,-i);var found=s.series.find(function(v){return v.period===dt;});vals.push(found||{period:dt,a:null,h:null});}
  var max=Math.max.apply(null,[1].concat(vals.map(function(v){return Math.max(v.a||0,v.h||0);})));max=Math.ceil(max/Math.pow(10,Math.floor(Math.log10(max))))*Math.pow(10,Math.floor(Math.log10(max)));
  var X=function(i){return 39+i*42;},Y=function(v){return 77-v/max*60;};
  var path=function(key){var d='',open=false;vals.forEach(function(v,i){if(v[key]==null){open=false;return;}d+=(open?' L':' M')+X(i)+','+Y(v[key]);open=true;});return d;};
  var grid=[0,.5,1].map(function(f){return '<path d="M39 '+Y(max*f)+'H251" stroke="#e1eaf5" stroke-width=".8"/><text x="30" y="'+(Y(max*f)+3)+'" text-anchor="end" font-size="8" fill="#8193ae">'+merN(max*f)+'</text>';}).join('');
  return '<svg viewBox="0 0 264 101">'+grid+'<path d="'+path('h')+'" fill="none" stroke="#819bbb" stroke-width="1.4" stroke-dasharray="4 3"/><path d="'+path('a')+'" fill="none" stroke="'+color+'" stroke-width="2.5"/>'+vals.map(function(v,i){return (v.a==null?'':'<circle cx="'+X(i)+'" cy="'+Y(v.a)+'" r="2.7" fill="'+color+'"/>')+'<text x="'+X(i)+'" y="95" text-anchor="middle" fill="#788cab" font-size="8.5">'+merMonthShort(v.period)+'</text>';}).join('')+'</svg>';
}
function merTrends(ctx){
  var colors=['#087cf1','#e82587','#08a3bf','#8a41ed','#147ee0','#e92b90'];
  return '<div class="mer-trends">'+ctx.products.filter(function(p){return MER_TRENDS.some(function(t){return t.key===p.key;});}).map(function(p,i){return '<div class="mer-trend"><div class="mer-trend-h"><b>'+(p.hist==='mobil'?'Mobil':p.label)+'</b><div class="mer-trend-values"><strong>'+merN(p.s.a)+'</strong><span class="mer-pill '+merTone(p.s.g)+'">'+merP(p.s.g)+' HGO</span></div></div><div class="mer-chart-legend"><i style="background:'+colors[i]+'"></i>Gerçekleşen <i class="target"></i>Hedef</div>'+merSpark(p.s,colors[i],ctx.source.period)+'</div>';}).join('')+'</div>';
}
function merDetailTitle(ctx){return ctx.scope==='branch'?'PERSONEL PERFORMANSI':ctx.scope==='account'?'ŞUBE KARŞILAŞTIRMASI':'SATIŞ YÖNETİCİLERİ';}
function merDetailsTable(ctx,rows){
  var keys=['Toplam Mobil','DSL','IPTV','Akıllı Cihaz'],names=['Mobil','DSL','IPTV','Cihaz'];
  var n=rows.length,font=n<=5?11:n<=8?10:n<=12?9:8,rowHeight=n?Math.min(27,115/n):27;
  var totalMobile=merAggregate(ctx.rows,'Toplam Mobil').a;
  return '<table class="mer-data-table mer-details-table '+(n>5?'mer-compact':'')+'" style="--mer-detail-font:'+font+'px;--mer-detail-row:'+rowHeight+'px"><thead><tr><th>'+({branch:'Personel',account:'Şube',region:'Satış yöneticisi'}[ctx.scope])+'</th>'+names.map(function(x){return '<th>'+x+'</th>';}).join('')+'<th>Katkı</th></tr></thead><tbody>'+rows.map(function(r){var mobile=merAggregate([r],'Toplam Mobil'),contribution=merRate(mobile.a,totalMobile);var label=ctx.scope==='account'?r.sub:r.name;return '<tr><th title="'+merEsc(r.name)+'"><span class="mer-row-name">'+merEsc(label)+'</span></th>'+keys.map(function(key){var v=merAggregate([r],key);return '<td title="Hedef '+merN(v.h)+' · Gerçekleşen '+merN(v.a)+'"><b class="mer-pill '+merTone(v.g)+'">'+merP(v.g)+'</b><small>'+merN(v.a)+' adet</small></td>';}).join('')+'<td class="mer-contribution"><b>'+merP(contribution)+'</b><i><span style="width:'+Math.max(0,Math.min(100,contribution||0))+'%"></span></i></td></tr>';}).join('')+'</tbody></table>'+(rows.length?'':'<div class="mer-empty">Bu dönem için '+(ctx.scope==='branch'?'personel':'detay')+' verisi bulunamadı.</div>');
}
function merYtdChart(ctx){
  var list=ctx.products.filter(function(p){return ['mobil','dsl','iptv','uydu','akilliCihaz'].includes(p.hist);}),year=+ctx.source.period.slice(0,4),max=Math.max.apply(null,[1].concat(list.map(function(p){return Math.max(p.s.pairA||p.s.ytdA||0,p.s.pairB||0);}))),mobile=ctx.products.find(function(p){return p.hist==='mobil';}).s;
  var bars=list.map(function(p,i){var a=p.s.pairA!=null?p.s.pairA:p.s.ytdA,b=p.s.pairB,x=54+i*76,base=101,ha=a==null?0:a/max*76,hb=b==null?0:b/max*76;return '<rect x="'+x+'" y="'+(base-hb)+'" width="25" height="'+hb+'" rx="2" fill="#289df5"/><rect x="'+(x+28)+'" y="'+(base-ha)+'" width="25" height="'+ha+'" rx="2" fill="#ec2486"/><text x="'+(x+12)+'" y="'+(base-hb-5)+'" text-anchor="middle">'+merN(b)+'</text><text x="'+(x+40)+'" y="'+(base-ha-5)+'" text-anchor="middle">'+merN(a)+'</text><text x="'+(x+26)+'" y="120" text-anchor="middle" class="mer-bar-label">'+(p.hist==='mobil'?'Mobil':p.hist==='uydu'?'Uydu':p.label)+'</text>';}).join('');
  var axes=[0,.5,1].map(function(f){var y=101-f*76;return '<path d="M48 '+y+'H438" stroke="#e6edf6" stroke-width="1"/><text x="42" y="'+(y+3)+'" text-anchor="end" fill="#7c8ca6">'+merN(max*f)+'</text>';}).join('');
  return '<div class="mer-ytd-legend"><span><i></i>'+ (year-1)+'</span><span><i></i>'+year+'</span></div><svg class="mer-ytd-chart" viewBox="0 0 445 127">'+axes+bars+'</svg><div class="mer-ytd-chips"><div>'+merIcon('trend')+'<span>Mobil YTD HGO<strong class="'+merTone(mobile.ytdG)+'">'+merP(mobile.ytdG)+'</strong></span></div><div>'+merIcon('trend')+'<span>Mobil yıllık Δ<strong class="'+merDeltaTone(mobile.ytdYoY)+'">'+merSigned(mobile.ytdYoY,'%')+'</strong></span></div><div>'+merIcon('mobile')+'<span>Mobil birikim<strong>'+merN(mobile.ytdA)+'</strong></span></div></div><p class="mer-ytd-note">'+mobile.months+'/'+mobile.expectedMonths+' ay · Yıllık kıyas: '+mobile.pairMonths+' eşleşen ay</p>';
}
function merChannelTable(ctx){return '<table class="mer-data-table"><thead><tr><th>Ürün</th><th>TTM G / H</th><th>TTM HGO</th><th>EDM G / H</th><th>EDM HGO</th><th>Bölge G / H</th><th>Bölge HGO</th></tr></thead><tbody>'+ctx.products.map(function(p){var t=merAggregate(merRows(ctx.source,'TTM'),p.key),e=merAggregate(merRows(ctx.source,'EDM'),p.key);return '<tr><th>'+p.label+'</th><td>'+merN(t.a)+' / '+merN(t.h)+'</td><td>'+merP(t.g)+'</td><td>'+merN(e.a)+' / '+merN(e.h)+'</td><td>'+merP(e.g)+'</td><td>'+merN(p.s.a)+' / '+merN(p.s.h)+'</td><td>'+merP(p.s.g)+'</td></tr>';}).join('')+'</tbody></table>';}
function merContributionTable(ctx){
  return '<table class="mer-data-table"><thead><tr><th>Şube / Bayi kodu</th>'+MER_TRENDS.map(function(p){return '<th>'+p.label+' katkı</th>';}).join('')+'</tr></thead><tbody>'+ctx.rows.map(function(d){return '<tr><th>'+merEsc(merName(d))+'<small>'+merEsc(d.kod+' · '+(d.il||''))+'</small></th>'+MER_TRENDS.map(function(p){var v=merAggregate([d],p.key),all=merAggregate(ctx.rows,p.key);return '<td>'+merP(merRate(v.a,all.a))+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table>';
}
function merNotes(ctx){return '<div class="mer-notes">'+(ctx.notes.length?ctx.notes.map(merEsc).join(' · '):'Kapsam: '+(ctx.scope==='region'?'Kuzey Anadolu TTM + EDM':'Kuzey Anadolu TTM'))+'</div>';}
function merFooter(ctx){
  return '<footer class="mer-report-footer"><div><span>'+merEsc(ctx.notes.join(' · '))+'</span><span>Kuzey Anadolu · TTM Performans Merkezi</span></div><div><span>HGO = gerçekleşen / hedef · — veri yok · Bölge Δ: TTM HGO farkı · Katkı: Mobil adet payı</span><span>'+merEsc(ctx.source.uploadedAt?'Yükleme '+new Date(ctx.source.uploadedAt).toLocaleDateString('tr-TR'):'Dönem '+ctx.source.period)+'</span></div></footer>';
}
function merSummary(ctx){
  var insights=merInsights(ctx),mobile=ctx.products.find(function(p){return p.hist==='mobil';});
  if(insights.length<3)insights.push({title:'Mobil satış temposunu izle',body:mobile.s.mom==null?'Önceki ay dosyasını ekleyerek gelişimi karşılaştırın.':'Mobil satışlar önceki aya göre '+merSigned(mobile.s.mom,'%')+' değişti.',tone:merDeltaTone(mobile.s.mom)});
  return '<section class="mer-report mer-summary" id="month-end-report">'+merHeader(ctx)+merSignals(ctx)+'<div class="mer-main"><div class="mer-panel mer-performance-panel"><h2>'+merIcon('trend')+'ÜRÜN BAZLI AY KAPANIŞI</h2><p class="mer-subtitle">Hedef · Gerçekleşen · Kıyas</p>'+merPerformanceTable(ctx)+'</div><div class="mer-panel mer-trend-panel"><h2>'+merIcon('trend')+'ÜRÜN BAZLI TRENDLER</h2>'+merTrends(ctx)+'</div></div><div class="mer-bottom"><div class="mer-panel mer-actors-panel '+(ctx.details.length>5?'mer-dense':'')+'"><h2>'+merIcon('people')+merDetailTitle(ctx)+'<span>'+ctx.details.length+' '+(ctx.scope==='branch'?'personel':ctx.scope==='account'?'şube':'yönetici')+'</span></h2>'+merDetailsTable(ctx,ctx.details)+'<p class="mer-caption">HGO · gerçekleşen adet · Katkı: Mobil satış payı</p></div><div class="mer-panel mer-year-panel"><h2>'+merIcon('trend')+'YILIN BİRİKİMİ · OCAK–'+merEsc(merMonthShort(ctx.source.period).toLocaleUpperCase('tr-TR'))+'</h2>'+merYtdChart(ctx)+'</div><div class="mer-panel mer-focus"><h2>'+merIcon('target')+'GELECEK AYIN ODAĞI</h2>'+insights.slice(0,3).map(function(v,i){return '<article><span class="mer-focus-number '+v.tone+'">0'+(i+1)+'</span><div><strong>'+merEsc(v.title)+'</strong><p>'+merEsc(v.body)+'</p></div><span class="mer-focus-arrow '+v.tone+'">'+(v.tone==='low'?'↓':v.tone==='good'?'↑':'–')+'</span></article>';}).join('')+'</div></div>'+merFooter(ctx)+'</section>';
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
  return html2canvas(node,{scale:2.56,width:1600,height:900,windowWidth:1700,windowHeight:1100,backgroundColor:'#f3f6fa',logging:false});
}
async function merExportCanvases(includeDetails){
  await merEnsureHistory();var ctx=merModel(),host=document.createElement('div');host.className='mer-export-host';host.innerHTML=merSummary(ctx);

  document.body.appendChild(host);
  try{var canvases=[];for(var node of host.querySelectorAll('.mer-report'))canvases.push(await merRenderCanvas(node));return {canvases:canvases,ctx:ctx};}finally{host.remove();}
}
function merFileName(ctx,ext){return 'TT_Kapanis_'+ctx.scope+'_'+(ctx.scope==='branch'?ctx.code:ctx.scope==='account'?(ctx.group.code||'Cari'):'KuzeyAnadolu')+'_'+ctx.source.period+'.'+ext;}
function merExportBusy(busy){merExporting=busy;document.querySelectorAll('.mer-pdf-button,.mer-png-button').forEach(function(b){b.disabled=busy;});}
async function exportMonthEndPNG(){
  if(merExporting)return;merExportBusy(true);try{var out=await merExportCanvases(false);_openSharePreview(out.canvases[0].toDataURL('image/png'),merFileName(out.ctx,'png'));}catch(e){alert('Görsel oluşturulamadı: '+e.message);}finally{merExportBusy(false);}
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
    if(file && navigator.share && navigator.canShare && navigator.canShare({files:[file]}))await navigator.share({files:[file],title:'Ay Kapanış Performans Karnesi'});
    else{var url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(function(){URL.revokeObjectURL(url);},30000);}
  }catch(e){if(e.name!=='AbortError')alert('PDF oluşturulamadı: '+e.message);}finally{merExportBusy(false);}
}
