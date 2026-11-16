/* Koray Yeşilördek · TTM Zirve Yarışı 2026
 * 16–30 Kasım, eleme yok. 15 Kasım bazlı 12 bayi, 4 ürün.
 * Satış adetleri paylaşımlarda gösterilmez, yalnız cihazda saklanır.
 */
var KZ_CODES=['4036313','4054927','4100343','4100676','4100729','4100776','4100778','4100781','4100784','4100785','7000045','7100063'];
var KZ_MONTH='2026-11',KZ_START='2026-11-15',KZ_FINISH='2026-11-30';
var KZ_STORE='ttm_zirve_koray_202611_snapshots_v1';
var KZ_WEIGHTS={mobil:0.40,dsl:0.40,iptv:0.10,uydu:0.10};
var kzNotice='',kzView='ranking';

function kzEsc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function kzFmt(v,d){return v==null||!Number.isFinite(v)?'—':Number(v).toLocaleString('tr-TR',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});}
function kzPct(n){return n==null?'—':'%'+kzFmt(n,1);}
function kzName(v){return String(v||'').toLocaleUpperCase('tr-TR').replace(/İ/g,'I').replace(/Ş/g,'S').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ö/g,'O').replace(/Ç/g,'C').replace(/ı/g,'I').replace(/\s+/g,' ').trim();}
function kzRead(){try{var obj=JSON.parse(localStorage.getItem(KZ_STORE)||'{}');return obj&&typeof obj==='object'&&!Array.isArray(obj)?obj:{};}catch(_){return {};}}
function kzSave(data){localStorage.setItem(KZ_STORE,JSON.stringify(data));}
function kzMetric(b,prod){
 var targets=b.campaignTargets,acts=b.campaignActuals,products=b.prods||{};
 function part(key){
  var obj=products[key],h=targets&&Object.prototype.hasOwnProperty.call(targets,key)?targets[key]:obj&&obj.h;
  var a=acts&&Object.prototype.hasOwnProperty.call(acts,key)?acts[key]:obj&&obj.a;
  return Number.isFinite(Number(h))&&h!==null&&h!==''&&Number(h)>0&&
         Number.isFinite(Number(a))&&a!==null&&a!==''?{h:Number(h),a:Number(a)}:null;
 }
 if(prod==='mobil'){var a=part('Postpaid'),b2=part('Prepaid');return a&&b2?{h:a.h+b2.h,a:a.a+b2.a}:null;}
 return part(prod==='uydu'?'Uydu':prod==='dsl'?'DSL':'IPTV');
}
function kzSnapshot(parsed,manual){
 if(!parsed||String(parsed.donem||'').replace('/','-')!==KZ_MONTH||!parsed.detay||!parsed.detay.bayiler)throw Error('Kasım 2026 TTM satış raporu yüklenmelidir.');
 var detected=parsed.detay.reportDate;
 if(manual&&detected&&manual!==detected)throw Error('Seçilen gün ('+manual+') Excel rapor tarihiyle ('+detected+') uyuşmuyor.');
 var date=detected||manual;
 if(!/^2026-11-(15|1[6-9]|2[0-9]|30)$/.test(date||''))throw Error('15–30 Kasım 2026 kapanış tarihi gerekli.');
 var dealers={};
 KZ_CODES.forEach(function(code){
  var b=parsed.detay.bayiler[code];
  if(!b||kzName(b.sy)!=='KORAY YESILORDEK')throw Error(code+' kodlu bayi Koray Yeşilördek TTM listesinde bulunamadı.');
  var products={};
  [['mobil','mobil'],['dsl','dsl'],['iptv','iptv'],['uydu','uydu']].forEach(function(pair){
   var m=kzMetric(b,pair[1]);if(!m)throw Error(code+' bayi kodunda '+pair[0]+' hedef/aktivasyon verisi eksik veya geçersiz.');
   products[pair[0]]=m;
  });
  dealers[code]={name:String(b.b||code),city:String(b.il||''),products:products};
 });
 return {date:date,dealers:dealers,source:String(parsed.detay.sourceFileName||'Excel'),dateSource:detected?parsed.detay.reportDateSource:'Manuel seçilen rapor tarihi'};
}
function kzCapture(parsed,manual,silent){
 var snap=kzSnapshot(parsed,manual),data=kzRead(),old=data[snap.date];
 if(old&&JSON.stringify(old.dealers)!==JSON.stringify(snap.dealers)){
  if(silent)return false;
  if(!confirm(snap.date+' tarihinde kayıtlı Koray Zirve Yarışı verisini değiştirmek istiyor musunuz?'))return false;
 }
 data[snap.date]=snap;kzSave(data);
 kzNotice='✓ '+snap.date+' tarihi için Koray’ın 12 bayisi kaydedildi.';
 return true;
}
function korayCaptureCurrentUpload(parsed){
 try{if(parsed&&parsed.detay&&parsed.detay.reportDate&&String(parsed.donem||'').replace('/','-')===KZ_MONTH)kzCapture(parsed,null,true);}catch(e){console.warn('[Zirve Yarışı] Otomatik kayıt atlandı:',e.message);}
}
async function kzUpload(input){
 var f=input.files&&input.files[0];if(!f)return;
 try{
  var dateEl=document.getElementById('kz-report-date'),manual=dateEl&&dateEl.value;
  await ensureXLSX();
  var buf=await f.arrayBuffer(),wb=XLSX.read(new Uint8Array(buf),{type:'array'});
  var parsed=parseWB(wb,{fileName:f.name});
  if(!parsed.detay.reportDate&&!manual)throw Error('Dosyada rapor tarihi bulunamadı. Kapanış tarihini seçip yeniden yükleyin.');
  kzCapture(parsed,manual||null,false);renderKorayZirve();
 }catch(e){kzNotice='⚠ '+e.message;renderKorayZirve();}
 finally{input.value='';}
}
function kzCompare(a,b){
 return (b.score-a.score)||(b.dsl-a.dsl)||(b.mobil-a.mobil)||(b.iptv-a.iptv)||
  (b.uydu-a.uydu)||(b.counts.dsl-a.counts.dsl)||(b.counts.mobil-a.counts.mobil)||
  (b.counts.iptv-a.counts.iptv)||(b.counts.uydu-a.counts.uydu)||a.code.localeCompare(b.code,'tr');
}
function kzRank(data,until){
 var base=data[KZ_START];
 if(!base)return {date:null,rows:[],missing:'15 Kasım kapanış raporu başlangıç bazı olarak kaydedilmemiş.'};
 var dates=Object.keys(data).filter(function(d){return /^2026-11-(1[6-9]|2[0-9]|30)$/.test(d)&&(!until||d<=until);}).sort();
 var day=dates.pop();
 if(!day)return {date:null,rows:[],missing:'16–30 Kasım dönemine ait güncel rapor bekleniyor.'};
 var current=data[day],count=Number(day.slice(-2))-15,rows=[];
 for(var i=0;i<KZ_CODES.length;i++){
  var code=KZ_CODES[i],start=base.dealers&&base.dealers[code],end=current.dealers&&current.dealers[code];
  if(!start||!end)return {date:day,rows:[],missing:code+' kodlu bayi verisi eksik.'};
  var ratios={},counts={},score=0;
  for(var j=0;j<4;j++){
   var p=['mobil','dsl','iptv','uydu'][j],b=start.products&&start.products[p],n=end.products&&end.products[p];
   if(!b||!n||!Number.isFinite(b.h)||b.h<=0||!Number.isFinite(b.a)||!Number.isFinite(n.a))
    return {date:day,rows:[],missing:code+' kodlu bayinin '+p+' ölçümü geçersiz.'};
   counts[p]=n.a-b.a;
   ratios[p]=Math.max(0,counts[p]/(b.h*count/30)*100);
   score+=Math.min(200,ratios[p])*KZ_WEIGHTS[p];
  }
  rows.push({code:code,name:end.name,city:end.city,mobil:ratios.mobil,dsl:ratios.dsl,
   iptv:ratios.iptv,uydu:ratios.uydu,counts:counts,score:Math.round(score*10)/10});
 }
 rows.sort(kzCompare);rows.forEach(function(r,i){r.rank=i+1;});
 var prevDate=dates.pop();
 if(prevDate){
  var earlier=kzRank(data,prevDate);
  if(!earlier.missing){var rankMap={};earlier.rows.forEach(function(r){rankMap[r.code]=r.rank;});rows.forEach(function(r){r.change=rankMap[r.code]-r.rank;});}
 }
 return {date:day,days:count,rows:rows,final:day===KZ_FINISH,missing:null};
}
function kzTrend(t){return t==null?'—':t>0?'↑'+t:t<0?'↓'+Math.abs(t):'→';}
function kzTable(pack){
 return '<div class="kz-table-scroll"><table class="kz-table"><thead><tr><th>#</th><th>Bayi / Kod</th><th>Mobil<br>HGO</th><th>DSL<br>HGO</th><th>IPTV<br>HGO</th><th>Uydu<br>HGO</th><th>Puan</th><th>Trend</th></tr></thead><tbody>'+
 pack.rows.map(function(r,i){return '<tr class="'+(i<3?'kz-top kz-top-'+(i+1):'')+'"><td><strong>'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1)+'</strong></td>'+
 '<td class="kz-name"><b>'+kzEsc(r.name)+'</b><small>'+kzEsc(r.code)+' · '+kzEsc(r.city)+'</small></td>'+
 '<td>'+kzPct(r.mobil)+'</td><td>'+kzPct(r.dsl)+'</td><td>'+kzPct(r.iptv)+'</td><td>'+kzPct(r.uydu)+'</td>'+
 '<td class="kz-pts">'+kzFmt(r.score,1)+'</td><td class="'+(r.change>0?'kz-rise':r.change<0?'kz-fall':'')+'">'+kzTrend(r.change)+'</td></tr>';
 }).join('')+'</tbody></table></div>';
}
function kzPoster(pack){
 var first=pack.rows[0];
 return '<div id="kz-poster" class="kz-poster" data-date="'+kzEsc(pack.date)+'">'+
  '<div class="kz-p-meta"><span>TTM · KUZEY ANADOLU</span><b>16–30 KASIM 2026</b></div>'+
  '<div class="kz-p-heading"><small>12 BAYİ · ELEME YOK</small><h1>ZİRVE YARIŞI</h1><p>GÜNLÜK HGO PERFORMANS TABLOSU</p></div>'+
  '<div class="kz-p-prizes"><div>🏆 '+(pack.final?'ŞAMPİYON':'GÜNCEL LİDER')+'<strong>'+kzEsc(first.name)+'</strong><small>'+kzEsc(first.code)+' · '+kzFmt(first.score,1)+' PUAN</small></div>'+
  '<div>📅 RAPOR TARİHİ<strong>'+pack.date.slice(-2)+' KASIM</strong><small>16–30 KASIM BİRİKİMLİ</small></div></div>'+
  '<div class="kz-p-weight"><span>📱 MOBİL <b>%40</b></span><span>🌐 DSL <b>%40</b></span><span>📺 IPTV <b>%10</b></span><span>📡 UYDU <b>%10</b></span></div>'+
  '<table><thead><tr><th>#</th><th>BAYİ / KOD</th><th>MOBİL<br>HGO</th><th>DSL<br>HGO</th><th>IPTV<br>HGO</th><th>UYDU<br>HGO</th><th>PUAN</th><th>↕</th></tr></thead><tbody>'+
  pack.rows.map(function(r,i){return '<tr class="'+(i<3?'kz-p-podium':'')+'"><td>'+(i+1)+'</td><td><b>'+kzEsc(r.name)+'</b><small>'+kzEsc(r.code)+'</small></td><td>'+kzPct(r.mobil)+'</td><td>'+kzPct(r.dsl)+'</td><td>'+kzPct(r.iptv)+'</td><td>'+kzPct(r.uydu)+'</td><td><strong>'+kzFmt(r.score,1)+'</strong></td><td>'+kzTrend(r.change)+'</td></tr>';}).join('')+
  '</tbody></table><div class="kz-p-footer">ELENME YOK · TÜM BAYİLER 30 KASIM’A KADAR YARIŞTA<br>HGO bazlı puan = %40 Mobil + %40 DSL + %10 IPTV + %10 Uydu · Her ürünün puanı %200 HGO ile sınırlıdır.</div></div>';
}
async function kzDownloadPNG(){
 var node=document.getElementById('kz-poster');
 if(!node){alert('Önce 15 Kasım başlangıç ve güncel raporları yükleyin.');return;}
 try{
  await ensureH2C();
  var canvas=await html2canvas(node,{backgroundColor:'#061e36',scale:2,useCORS:true,
   scrollX:0,scrollY:0,windowWidth:1050,onclone:function(doc){
    var holder=doc.getElementById('kz-poster-holder');
    if(holder){holder.style.position='absolute';holder.style.top='0';holder.style.left='0';}
   }});
  canvas.toBlob(function(blob){
   if(!blob){alert('Görsel oluşturulamadı.');return;}
   var url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='TTM_Zirve_Yarisi_'+node.getAttribute('data-date')+'.png';
   document.body.appendChild(a);a.click();a.remove();
   setTimeout(function(){URL.revokeObjectURL(url);},1500);
  },'image/png');
 }catch(e){alert('PNG oluşturulamadı: '+e.message);}
}
function kzBackup(){
 var data=kzRead(),blob=new Blob([JSON.stringify({version:1,snapshots:data},null,2)],{type:'application/json'});
 var u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='Koray_TTM_Zirve_Yarisi_2026_Yedek.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},1000);
}
async function kzRestore(input){
 var file=input.files&&input.files[0];if(!file)return;
 try{
  if(file.size>3000000)throw Error('Yedek dosyası çok büyük.');
  var doc=JSON.parse(await file.text());
  if(doc.version!==1||!doc.snapshots||typeof doc.snapshots!=='object'||Array.isArray(doc.snapshots))throw Error('Geçersiz yedek formatı.');
  Object.keys(doc.snapshots).forEach(function(date){
   if(!/^2026-11-(15|1[6-9]|2[0-9]|30)$/.test(date))throw Error('Yedekte geçersiz gün: '+date);
   var row=doc.snapshots[date];
   if(!row||!row.dealers||KZ_CODES.some(function(code){
    var b=row.dealers[code];
    return !b||!b.products||['mobil','dsl','iptv','uydu'].some(function(p){
     var d=b.products[p];return !d||!Number.isFinite(d.h)||d.h<=0||!Number.isFinite(d.a);
    });
   }))throw Error(date+' gününde eksik bayi/ürün verisi.');
  });
  if(!confirm(Object.keys(doc.snapshots).length+' günlük Zirve Yarışı yedeğini içe aktarmak istiyor musunuz?'))return;
  var data=kzRead();Object.assign(data,doc.snapshots);kzSave(data);
  kzNotice='✓ Koray Yarışması yedeği aktarıldı.';renderKorayZirve();
 }catch(e){kzNotice='⚠ '+e.message;renderKorayZirve();}
 finally{input.value='';}
}
function renderKorayZirve(){
 var cards=document.getElementById('cards');if(!cards)return;
 var saved=kzRead(),pack=kzRank(saved),ready=pack.rows.length===KZ_CODES.length&&!pack.missing,
  leader=ready?pack.rows[0]:null,dates=Object.keys(saved).filter(function(d){return /^2026-11-\d\d$/.test(d);}).sort();
 cards.className='cards single kz-page';cards.style.maxWidth='1200px';
 var html='<section class="kz-shell"><div class="kz-hero"><span>TTM · KORAY YEŞİLÖRDEK</span>'+
  '<h2>🏆 ZİRVE YARIŞI</h2><p>16–30 Kasım 2026 · 12 bayi · 15 gün · Eleme yok</p>'+
  '<div class="kz-hero-tag">HER GÜN YENİ BİR ZİRVE FIRSATI</div></div>'+
  '<div class="kz-stats"><div><small>YARIŞAN BAYİ</small><strong>12</strong></div>'+
  '<div><small>KAMPANYA DÖNEMİ</small><strong>16–30 KASIM</strong></div>'+
  '<div><small>MEVCUT LİDER</small><strong>'+(leader?kzEsc(leader.name):'—')+'</strong></div>'+
  '<div><small>DÖNEM PUANI</small><strong>'+(leader?kzFmt(leader.score,1):'—')+'</strong></div></div>'+
  '<div class="kz-weights"><div>📱 MOBİL <b>%40</b></div><div>🌐 DSL <b>%40</b></div>'+
  '<div>📺 IPTV <b>%10</b></div><div>📡 UYDU <b>%10</b></div></div>'+
  '<div class="kz-title"><div><h3>Genel Performans Sıralaması</h3><p>'+
   (ready?pack.date+' kapanışı · '+(pack.final?'Kesin sonuç':'Geçici günlük sıralama'):'15 Kasım bazı ve güncel raporlar bekleniyor')+
  '</p></div><button '+(!ready?'disabled ':'')+'onclick="kzDownloadPNG()">↓ Günlük görsel (PNG)</button></div>';
 if(ready){
  html+='<div class="kz-medals"><div><small>🥇 1. SIRA</small><strong>'+kzEsc(pack.rows[0].name)+'</strong><span>'+kzFmt(pack.rows[0].score,1)+' PUAN</span></div>'+
  '<div><small>🥈 2. SIRA</small><strong>'+kzEsc(pack.rows[1].name)+'</strong><span>'+kzFmt(pack.rows[1].score,1)+' PUAN</span></div>'+
  '<div><small>🥉 3. SIRA</small><strong>'+kzEsc(pack.rows[2].name)+'</strong><span>'+kzFmt(pack.rows[2].score,1)+' PUAN</span></div></div>';
  html+=kzTable(pack);
  html+='<div class="kz-result">🏆 '+(pack.final?'KAMPANYA ŞAMPİYONU':'GÜNCEL LİDER')+
  ' <b>'+kzEsc(leader.name)+'</b><span>'+kzFmt(leader.score,1)+' puan'+(!pack.final?' · geçici':' · kesin')+'</span></div>';
 }else html+='<div class="kz-empty"><strong>Henüz puan hesaplanamıyor</strong><p>'+kzEsc(pack.missing||'Güncel veri bekleniyor.')+'</p>'+
  '<small>15 Kasım kapanışını baz olarak kaydedin. 16–30 Kasım raporları yüklendikçe 12 bayi sıralanır. Örnek veriden kazanan ilan edilmez.</small></div>';
 html+='<div class="kz-import"><h3>📂 Rapor Yükle ve Güncelle</h3>'+
  '<p>15 Kasım başlangıç verisini bir kez yükleyin. Sonraki günlerin kapanış raporlarını ekledikçe puanlar otomatik güncellenir. Veriler yalnızca bu cihazda kaydedilir.</p>'+
  '<div class="kz-inputs"><label>Rapor kapanış tarihi <input id="kz-report-date" type="date" min="2026-11-15" max="2026-11-30"></label>'+
  '<label class="kz-upload">Excel dosyası seç<input type="file" accept=".xlsx,.xls" onchange="kzUpload(this)"></label></div>'+
  '<div class="kz-dates"><b>Kaydedilen günler:</b> '+(dates.length?dates.map(function(d){return '<span>'+d.slice(-2)+' Kas</span>';}).join(''):'Henüz veri yok')+'</div>'+
  '<div class="kz-tools"><button onclick="kzBackup()">↓ Verileri yedekle</button>'+
  '<label>↑ Yedeği içe aktar<input type="file" accept=".json" onchange="kzRestore(this)"></label></div>'+
  '<small class="kz-privacy">Yedek JSON gerçek aktivasyon sayılarını içerir, yalnız yetkili kişilerle paylaşın. PNG görselinde aktivasyon adetleri bulunmaz.</small></div>'+
  '<div class="kz-rules"><b>PUANLAMA KURALLARI</b>'+
  '<p>Günlük kümülatif yarış puanı = Mobil HGO × 0,40 + DSL HGO × 0,40 + IPTV HGO × 0,10 + Uydu HGO × 0,10. Her ürünün katkısı en fazla %200 HGO üzerinden hesaplanır. 15 Kasım kapanışı başlangıç bazıdır, puanlara yalnızca 16–30 Kasım net performansı girer. HGO, döneme düşen aylık hedefe göre hesaplanır. Her günün puanı birikimli toplam performansı gösterir; günlük puanlar birbirine eklenmez. 30 Kasım kapanışına kadar tüm 12 bayi yarıştadır. Eşitlikte DSL, Mobil, IPTV, Uydu HGO, ardından bu ürünlerin net satış adetleri ve bayi kodu kullanılır.</p></div>'+
  (kzNotice?'<div class="kz-notice">'+kzEsc(kzNotice)+'</div>':'')+
  '</section>';
 if(ready)html+='<div id="kz-poster-holder" class="kz-poster-holder">'+kzPoster(pack)+'</div>';
 cards.innerHTML=html;
}
