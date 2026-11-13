/* Bayi 360 - üç sayfalık kompakt PDF (Kuzey Anadolu / TTM).
   Veriler: history-loader.js HIST2_DATA ve manifest. Tüm sıralamalar
   belge bazındaki gerçek bayi kayıtlarından hesaplanır; boş ay sıfır sayılmaz. */
var B360_PRODUCTS=[
  {key:'postpaid',label:'Faturalı',short:'FATURALI',color:'#2285d3'},
  {key:'prepaid',label:'Faturasız',short:'FATURASIZ',color:'#18aabc'},
  {key:'mobil',label:'Toplam Mobil',short:'TOP. MOBİL',color:'#167bd2'},
  {key:'dsl',label:'DSL',short:'DSL',color:'#0baa9b'},
  {key:'iptv',label:'IPTV',short:'IPTV',color:'#e63e91'},
  {key:'uydu',label:'Uydu TV',short:'UYDU TV',color:'#8859db'},
  {key:'tv',label:'Toplam TV',short:'TOPLAM TV',color:'#c748ac'},
  {key:'akilliCihaz',label:'Cihaz',short:'CİHAZ',color:'#11a8ad'},
  {key:'digerCihaz',label:'Diğer Cihaz',short:'DİĞ. CİHAZ',color:'#d2a01e'},
  {key:'cihaz',label:'Toplam Cihaz',short:'TOP. CİHAZ',color:'#0a98a6'}
];
var B360_PERIOD='', B360_DEALER='4100089', B360_PAGE=1, B360_LOADING=null, B360_BUSY=false;
var B360_MONTHS=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
function b360Esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function b360N(n){return n==null||!isFinite(n)?'—':Math.round(n).toLocaleString('tr-TR');}
function b360Pct(n,plus){return n==null||!isFinite(n)?'—':(plus&&n>0?'+':'')+'%'+n.toFixed(1).replace('.',',');}
function b360Gap(n){return n==null||!isFinite(n)?'—':(n>0?'+':'')+b360N(n);}
function b360Cls(n,goal){return n==null?'dim':(goal?(n>=100?'good':n>=80?'warn':'bad'):(n>=0?'good':'bad'));}
function b360MonthName(p){return B360_MONTHS[Number(p.slice(5,7))-1]+' '+p.slice(0,4);}
function b360PeriodList(){return (HIST2_MANIFEST&&HIST2_MANIFEST.periods||[]).filter(function(p){return p.slice(0,4)>='2025'&&HIST2_DATA[p]&&Array.isArray(HIST2_DATA[p].dealers);}).sort();}
function b360Doc(p){return HIST2_DATA[p]&&Array.isArray(HIST2_DATA[p].dealers)?HIST2_DATA[p]:null;}
function b360Rows(p){return b360Doc(p)?b360Doc(p).dealers.filter(function(d){return d&&d.bayiKodu!=null;}):[];}
function b360Find(p,code){return b360Rows(p).find(function(d){return String(d.bayiKodu)===String(code);})||null;}
function b360Metric(d,key){var x=d&&d[key];if(!x||!isFinite(Number(x.adet))||!isFinite(Number(x.hedef)))return null;var h=Number(x.hedef),a=Number(x.adet);return {hedef:h,adet:a,hgo:h>0?a/h*100:null};}
function b360Periods(end){var year=end.slice(0,4),mm=Number(end.slice(5));return Array.from({length:mm},function(_,i){return year+'-'+String(i+1).padStart(2,'0');});}
function b360Agg(periods,code,key,strict){
  var h=0,a=0,found=0;
  periods.forEach(function(p){var x=b360Metric(b360Find(p,code),key);if(x){h+=x.hedef;a+=x.adet;found++;}});
  if(!found||(strict&&found!==periods.length))return null;
  return {hedef:h,adet:a,hgo:h>0?a/h*100:null,months:found,complete:found===periods.length};
}
function b360Rank(entries,code,mode){
  var scored=entries.filter(function(x){return x.data&&x.data[mode]!=null&&isFinite(x.data[mode]);});
  var mine=scored.find(function(x){return String(x.code)===String(code);});
  if(!mine)return null;
  return {rank:1+scored.filter(function(x){return x.data[mode]>mine.data[mode]+1e-9;}).length,count:scored.length};
}
function b360MonthRank(period,code,key,mode){
  var rows=b360Rows(period).map(function(d){return {code:String(d.bayiKodu),data:b360Metric(d,key)};});
  return b360Rank(rows,code,mode);
}
function b360YtdRank(periods,code,key,mode){
  if(periods.some(function(p){return !b360Doc(p);}))return null;
  var codes=b360Rows(periods[periods.length-1]).map(function(d){return String(d.bayiKodu);});
  var entries=codes.map(function(c){return {code:c,data:b360Agg(periods,c,key,true)};});
  return b360Rank(entries,code,mode);
}
function b360RankText(r){return r?r.rank+' / '+r.count:'—';}
function b360Model(){
  var period=B360_PERIOD,periods=b360Periods(period),prior=periods.map(function(p){return (+p.slice(0,4)-1)+p.slice(4);});
  var dealer=b360Find(period,B360_DEALER);if(!dealer)return null;
  var products=B360_PRODUCTS.map(function(p){
    var current=b360Agg(periods,B360_DEALER,p.key,false);
    var prev=b360Agg(prior,B360_DEALER,p.key,true);
    var yoy=current&&current.complete&&prev&&prev.adet>0?(current.adet-prev.adet)/prev.adet*100:null;
    return {p:p,now:current,old:prev,gap:current?current.adet-current.hedef:null,yoy:yoy,
      rankH:b360YtdRank(periods,B360_DEALER,p.key,'hgo'),
      rankA:b360YtdRank(periods,B360_DEALER,p.key,'adet')};
  });
  var months=periods.map(function(p,i){
    var old=prior[i];
    return {period:p,short:B360_MONTHS[Number(p.slice(5))-1].slice(0,3),data:B360_PRODUCTS.map(function(prod){
      var now=b360Metric(b360Find(p,B360_DEALER),prod.key),prev=b360Metric(b360Find(old,B360_DEALER),prod.key);
      return {now:now,old:prev,yoy:now&&prev&&prev.adet>0?(now.adet-prev.adet)/prev.adet*100:null,
       rankH:b360MonthRank(p,B360_DEALER,prod.key,'hgo'),rankA:b360MonthRank(p,B360_DEALER,prod.key,'adet')};
    })};
  });
  return {period:period,periods:periods,prior:prior,dealer:dealer,products:products,months:months,
    missing:periods.filter(function(p){return !b360Find(p,B360_DEALER);}),
    oldMissing:prior.filter(function(p){return !b360Find(p,B360_DEALER);})};
}
function b360Head(m,num,title,subtitle){
  var d=m.dealer;
  return '<header class="b360-sheet-head"><div class="b360-brand"><strong>Türk Telekom</strong><small>KUZEY ANADOLU  /  TTM</small></div>'+
    '<div class="b360-head-title"><b>'+b360Esc(title)+'</b><span>'+b360Esc(subtitle)+'</span></div>'+
    '<div class="b360-identity"><b>'+b360Esc(d.bayiAdi)+'</b><small>'+b360Esc(d.il||'KUZEY ANADOLU')+'  ·  ŞUBE '+b360Esc(d.bayiKodu)+'  ·  '+b360Esc(b360MonthName(m.period))+'</small></div></header>';
}
function b360Footer(num,m,text){
  return '<footer class="b360-footer"><span>'+b360Esc(text)+'</span><strong>'+num+' / 3</strong></footer>';
}
function b360Page1(m){
  var main=['mobil','postpaid','prepaid','dsl','iptv','akilliCihaz'];
  var cards=main.map(function(key){
    var v=m.products.find(function(p){return p.p.key===key;});var x=v.now||{};
    return '<div class="b360-kpi" style="--tone:'+v.p.color+'"><div class="b360-kpi-name">'+b360Esc(v.p.label.toLocaleUpperCase('tr-TR'))+'</div>'+
      '<div class="b360-kpi-core"><strong class="'+b360Cls(x.hgo,true)+'">'+b360Pct(x.hgo)+'</strong><span>HEDEF '+b360N(x.hedef)+'<br>AKT. '+b360N(x.adet)+'</span></div>'+
      '<div class="b360-kpi-bar"><i style="width:'+Math.min(100,Math.max(0,x.hgo||0))+'%"></i></div>'+
      '<small class="'+b360Cls(v.yoy,false)+'">2025 KIYASI '+b360Pct(v.yoy,true)+'</small></div>';
  }).join('');
  var tbody=m.products.map(function(v){
    var x=v.now||{};
    return '<tr><th><i class="b360-dot" style="background:'+v.p.color+'"></i>'+b360Esc(v.p.label)+'</th><td>'+b360N(x.hedef)+'</td><td>'+b360N(x.adet)+'</td>'+
      '<td class="'+b360Cls(x.hgo,true)+'"><b>'+b360Pct(x.hgo)+'</b></td><td class="'+b360Cls(v.gap,false)+'">'+b360Gap(v.gap)+'</td>'+
      '<td>'+b360N(v.old&&v.old.adet)+'</td><td class="'+b360Cls(v.yoy,false)+'"><b>'+b360Pct(v.yoy,true)+'</b></td>'+
      '<td>'+b360RankText(v.rankH)+'</td><td>'+b360RankText(v.rankA)+'</td></tr>';
  }).join('');
  var pick=function(k){return m.products.find(function(x){return x.p.key===k;});};
  var mobile=pick('mobil'),post=pick('postpaid'),iptv=pick('iptv');
  var insights=[['MOBİL YTD',b360N(mobile.now&&mobile.now.adet)+' adet','Hedef farkı '+b360Gap(mobile.gap),'#167bd2'],
    ['FATURALI HEDEF FARKI',b360Gap(post.gap)+' adet','HGO '+b360Pct(post.now&&post.now.hgo),'#d94c70'],
    ['IPTV PERFORMANSI',b360Pct(iptv.now&&iptv.now.hgo)+' HGO','2025 kıyası '+b360Pct(iptv.yoy,true),'#e63e91'],
    ['BÖLGEDE MOBİL',b360RankText(mobile.rankA),'Adet sırası · HGO '+b360RankText(mobile.rankH),'#14a5be']].map(function(v){
    return '<div class="b360-insight" style="--tone:'+v[3]+'"><small>'+v[0]+'</small><b>'+v[1]+'</b><span>'+v[2]+'</span></div>';
  }).join('');
  return '<article class="b360-sheet">'+b360Head(m,1,'BAYİ 360  /  YTD PERFORMANS KARNESİ','Yıllık hedef, gerçekleşen, büyüme ve bölge sıralaması')+
    '<div class="b360-kpis">'+cards+'</div><section class="b360-panel b360-ytd"><div class="b360-panel-head"><strong>YTD ÜRÜN BAZLI KARŞILAŞTIRMA</strong><span>Ocak–'+b360Esc(b360MonthName(m.period))+' · Kuzey Anadolu TTM</span></div>'+
    '<table class="b360-table"><thead><tr><th>ÜRÜN</th><th>HEDEF</th><th>AKTİVASYON</th><th>HGO</th><th>HEDEF FARKI</th><th>2025 AKT.</th><th>YOY</th><th>HGO SIRA</th><th>ADET SIRA</th></tr></thead><tbody>'+tbody+'</tbody></table></section>'+
    '<div class="b360-insights">'+insights+'</div>'+
    b360Footer(1,m,'YTD: yılbaşından seçili kapanış ayına kadar. Sıralama: eksiksiz dönem kaydı olan bayiler; eksik kayıtlar sıfır sayılmaz.')+'</article>';
}
function b360Page2(m){
  var th='<th>AY</th>'+B360_PRODUCTS.map(function(p){return '<th title="'+b360Esc(p.label)+'">'+b360Esc(p.short)+'</th>';}).join('');
  var main=m.months.map(function(month){return '<tr><th>'+b360Esc(month.short)+'</th>'+month.data.map(function(x){var v=x.now;return '<td>'+(v?'<span>'+b360N(v.hedef)+' / '+b360N(v.adet)+'</span><b class="'+b360Cls(v.hgo,true)+'">'+b360Pct(v.hgo)+'</b>':'<em>—</em>')+'</td>';}).join('')+'</tr>';}).join('');
  var yoy=m.months.map(function(month){return '<tr><th>'+b360Esc(month.short)+'</th>'+month.data.map(function(x){return '<td class="'+b360Cls(x.yoy,false)+'">'+b360Pct(x.yoy,true)+'</td>';}).join('')+'</tr>';}).join('');
  return '<article class="b360-sheet">'+b360Head(m,2,'AYLIK PERFORMANS  /  '+m.months.length+' AYLIK KARNE','Ürün bazında hedef, aktivasyon, HGO ve geçen yılın aynı ayı')+
    '<div class="b360-note"><b>HEDEF / AKTİVASYON + HGO</b><span>Her hücrede üstte hedef / gerçekleşen, altta hedef gerçekleştirme oranı</span></div>'+
    '<section class="b360-panel b360-matrix"><table class="b360-table"><thead><tr>'+th+'</tr></thead><tbody>'+main+'</tbody></table></section>'+
    '<div class="b360-note"><b>2025 AYNI AYINA GÖRE BÜYÜME / KÜÇÜLME</b><span>Yeşil büyüme · Kırmızı küçülme · — karşılaştırma verisi yok</span></div>'+
    '<section class="b360-panel b360-matrix b360-matrix-yoy"><table class="b360-table"><thead><tr>'+th+'</tr></thead><tbody>'+yoy+'</tbody></table></section>'+
    b360Footer(2,m,'2025 aynı ayı aktivasyonu sıfır veya kayıt eksikse yıllık değişim hesaplanmaz.')+'</article>';
}
function b360Page3(m){
  var th='<th>AY</th>'+B360_PRODUCTS.map(function(p){return '<th>'+b360Esc(p.short)+'</th>';}).join('');
  var matrix=function(mode){
    return m.months.map(function(month){return '<tr><th>'+b360Esc(month.short)+'</th>'+month.data.map(function(x){
      var rank=mode==='hgo'?x.rankH:x.rankA;
      return '<td class="'+(rank&&rank.rank<=3?'b360-rank-top':'')+'">'+b360RankText(rank)+'</td>';}).join('')+'</tr>';}).join('');
  };
  var mob=m.products.find(function(x){return x.p.key==='mobil';});
  var dsl=m.products.find(function(x){return x.p.key==='dsl';});
  return '<article class="b360-sheet">'+b360Head(m,3,'AYLIK BÖLGE SIRALAMALARI','Her ürün için iki ayrı başarı ölçütü: HGO ve aktivasyon adedi')+
    '<div class="b360-note"><b>HGO BÖLGE SIRALAMASI</b><span>Yüksek hedef gerçekleştirme oranı en üst sıradadır</span></div>'+
    '<section class="b360-panel b360-rank-matrix"><table class="b360-table"><thead><tr>'+th+'</tr></thead><tbody>'+matrix('hgo')+'</tbody></table></section>'+
    '<div class="b360-note"><b>ADETSEL BÖLGE SIRALAMASI</b><span>Aktivasyon hacmi yüksek olan bayi en üst sıradadır</span></div>'+
    '<section class="b360-panel b360-rank-matrix"><table class="b360-table"><thead><tr>'+th+'</tr></thead><tbody>'+matrix('adet')+'</tbody></table></section>'+
    '<div class="b360-last-insight"><span><b>YTD TOPLAM MOBİL</b> HGO '+b360RankText(mob.rankH)+' · Adet '+b360RankText(mob.rankA)+'</span>'+
    '<span><b>YTD DSL</b> HGO '+b360RankText(dsl.rankH)+' · Adet '+b360RankText(dsl.rankA)+'</span></div>'+
    b360Footer(3,m,'Sıralama her ay için veri bulunan Kuzey Anadolu TTM bayileri arasındadır. HGO sırasında hedef > 0 koşulu uygulanır.')+'</article>';
}
function b360Pages(m){return [b360Page1(m),b360Page2(m),b360Page3(m)];}
function b360RenderReady(){
  if(typeof section!=='undefined'&&section!=='bayi360')return;
  var cards=document.getElementById('cards');if(!cards)return;
  var periods=b360PeriodList();
  if(!periods.length){cards.innerHTML='<div class="b360-load">Arşivde geçerli kapanış bulunamadı. Önce geçmiş verilerin yüklenmesini kontrol edin.</div>';return;}
  if(!B360_PERIOD||periods.indexOf(B360_PERIOD)<0)B360_PERIOD=periods[periods.length-1];
  var dealers=b360Rows(B360_PERIOD).slice().sort(function(a,b){return String(a.bayiAdi).localeCompare(String(b.bayiAdi),'tr');});
  if(!dealers.some(function(d){return String(d.bayiKodu)===String(B360_DEALER);}))B360_DEALER=dealers.length?String(dealers[0].bayiKodu):'';
  var model=b360Model(),pages=model?b360Pages(model):[];
  cards.className='cards single b360-cards';cards.style.maxWidth='none';
  cards.innerHTML='<section class="b360-app"><header class="b360-toolbar"><div><h2>Bayi 360 PDF Raporu</h2><p>3 sayfa · TTM kapanışları · YTD / YoY / HGO ve adet sıralaması</p></div>'+
    '<div class="b360-controls"><label>Dönem <select aria-label="Kapanış dönemi" onchange="b360SetPeriod(this.value)">'+periods.slice().reverse().map(function(p){return '<option value="'+p+'" '+(p===B360_PERIOD?'selected':'')+'>'+b360Esc(b360MonthName(p))+'</option>';}).join('')+'</select></label>'+
    '<label>Bayi <select aria-label="Bayi seç" onchange="b360SetDealer(this.value)">'+dealers.map(function(d){var code=String(d.bayiKodu);return '<option value="'+b360Esc(code)+'" '+(code===String(B360_DEALER)?'selected':'')+'>'+b360Esc(code+' · '+d.bayiAdi)+'</option>';}).join('')+'</select></label>'+
    '<button class="b360-download" type="button" onclick="b360ExportPDF()" '+(B360_BUSY?'disabled':'')+'>'+(B360_BUSY?'PDF hazırlanıyor…':'↓ 3 Sayfalık PDF İndir')+'</button></div></header>'+
    (model?'<div class="b360-viewbar"><div class="b360-page-tabs">'+['YTD Karnesi','Aylık Performans','Bölge Sıralaması'].map(function(title,i){return '<button type="button" class="'+(B360_PAGE===i+1?'active':'')+'" onclick="b360SetPage('+(i+1)+')">'+(i+1)+'. '+title+'</button>';}).join('')+'</div><span>Önizleme · '+B360_PAGE+' / 3</span></div>'+
    '<div class="b360-preview"><div id="b360-visible-sheet">'+pages[B360_PAGE-1]+'</div></div>'+
    ((model.missing.length||model.oldMissing.length)?'<p class="b360-data-alert">Not: Bayi kaydı bulunmayan dönemler sıfır kabul edilmez. 2026: '+b360Esc(model.missing.join(', ')||'eksik yok')+' · Önceki yıl: '+b360Esc(model.oldMissing.join(', ')||'eksik yok')+'</p>':''):'<p class="b360-data-alert">Bu dönemde bayi kaydı bulunamadı.</p>')+
    '</section>';
}
function renderBayi360(){
  var cards=document.getElementById('cards');if(!cards)return;
  if(HIST2_LOADED){b360RenderReady();return;}
  cards.className='cards single b360-cards';cards.style.maxWidth='none';
  cards.innerHTML='<div class="b360-load" role="status">Bayi 360 için geçmiş kapanışlar yükleniyor…</div>';
  if(B360_LOADING)return;
  B360_LOADING=loadAllHistory().then(function(){B360_LOADING=null;b360RenderReady();}).catch(function(err){
    B360_LOADING=null;if(typeof section==='undefined'||section==='bayi360')cards.innerHTML='<div class="b360-load">Kapanışlar yüklenemedi: '+b360Esc(err.message)+' <button onclick="renderBayi360()">Tekrar dene</button></div>';
  });
}
function b360SetDealer(v){B360_DEALER=String(v);B360_PAGE=1;b360RenderReady();}
function b360SetPeriod(v){B360_PERIOD=String(v);B360_PAGE=1;b360RenderReady();}
function b360SetPage(v){B360_PAGE=Math.min(3,Math.max(1,Number(v)||1));b360RenderReady();}
function b360PdfBytes(canvases){
  var e=new TextEncoder(),chunks=[],offsets=[0],length=0;
  function add(v){var bytes=typeof v==='string'?e.encode(v):v;chunks.push(bytes);length+=bytes.length;}
  function obj(id,parts){offsets[id]=length;add(id+' 0 obj\n');parts.forEach(add);add('\nendobj\n');}
  add('%PDF-1.4\n');obj(1,['<< /Type /Catalog /Pages 2 0 R >>']);
  obj(2,['<< /Type /Pages /Kids ['+canvases.map(function(_,i){return (3+i*3)+' 0 R';}).join(' ')+'] /Count '+canvases.length+' >>']);
  canvases.forEach(function(canvas,i){
    var id=3+i*3,base=atob(canvas.toDataURL('image/jpeg',.93).split(',')[1]),bytes=new Uint8Array(base.length);
    for(var j=0;j<base.length;j++)bytes[j]=base.charCodeAt(j);
    var content='q\n1260 0 0 800 0 0 cm\n/Im0 Do\nQ\n';
    obj(id,['<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1260 800] /Resources << /XObject << /Im0 '+(id+1)+' 0 R >> >> /Contents '+(id+2)+' 0 R >>']);
    obj(id+1,['<< /Type /XObject /Subtype /Image /Width '+canvas.width+' /Height '+canvas.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+bytes.length+' >>\nstream\n',bytes,'\nendstream']);
    obj(id+2,['<< /Length '+e.encode(content).length+' >>\nstream\n'+content+'endstream']);
  });
  var xref=length,n=3+canvases.length*3;add('xref\n0 '+n+'\n0000000000 65535 f \n');
  for(var k=1;k<n;k++)add(String(offsets[k]).padStart(10,'0')+' 00000 n \n');
  add('trailer\n<< /Size '+n+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');
  var all=new Uint8Array(length),at=0;chunks.forEach(function(bytes){all.set(bytes,at);at+=bytes.length;});return all;
}
async function b360ExportPDF(){
  if(B360_BUSY||!HIST2_LOADED)return;
  var model=b360Model();if(!model)return;
  B360_BUSY=true;b360RenderReady();
  var host=document.createElement('div');host.className='b360-export-host';
  host.style.cssText='position:fixed;left:-20000px;top:0;width:1260px;z-index:-1;pointer-events:none';
  try{
    if(typeof ensureH2C==='function')await ensureH2C();
    if(typeof html2canvas!=='function')throw new Error('PDF çizim motoru yüklenemedi');
    if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    host.innerHTML=b360Pages(model).join('');document.body.appendChild(host);
    var nodes=host.querySelectorAll('.b360-sheet'),canvases=[];
    for(var i=0;i<nodes.length;i++){
      canvases.push(await html2canvas(nodes[i],{width:1260,height:800,windowWidth:1320,windowHeight:900,scale:Math.min(2,Math.max(1.35,window.devicePixelRatio||1.6)),backgroundColor:'#edf4f9',useCORS:true,logging:false}));
    }
    var pdf=b360PdfBytes(canvases),name='Bayi_360_'+String(B360_DEALER).replace(/[^0-9a-zA-Z_-]/g,'')+'_'+B360_PERIOD+'.pdf';
    var blob=new Blob([pdf],{type:'application/pdf'}),file=typeof File!=='undefined'?new File([blob],name,{type:'application/pdf'}):null;
    if(file&&navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Bayi 360 Performans Raporu'});}
    else{var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},30000);}
  }catch(err){if(err.name!=='AbortError')alert('PDF oluşturulamadı: '+(err.message||err));}
  finally{if(host.parentNode)host.remove();B360_BUSY=false;b360RenderReady();}
}
