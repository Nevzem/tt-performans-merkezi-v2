/* TTM Şampiyonlar Ligi · Kasım 2026
 * Veri yalnızca cihazda (localStorage) tutulur; adetler paylaşım görseline girmez.
 * Tam günlük raporlar olmadan eleme sonucu veya şampiyon ilan edilmez.
 */
var LEAGUE_CODES=['4052718','4057503','4100087','4100089','4100170','4100641','4100760','4100990','500733','501699','502046'];
var LEAGUE_STAGES=[
 {title:'İlk Eleme',start:16,end:19,base:15,n:11,advance:8},
 {title:'Çeyrek Final',start:20,end:23,base:19,n:8,advance:4},
 {title:'Yarı Final',start:24,end:27,base:23,n:4,advance:2},
 {title:'Büyük Final',start:28,end:30,base:27,n:2,advance:1}
];
var LEAGUE_KEY='ttm_champions_nov2026_snapshots_v1';
var leagueStage=0,leagueStageTouched=false,leagueNotice='';
function lgDate(day){return '2026-11-'+String(day).padStart(2,'0');}
function lgEsc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function lgFmt(v,n){return v==null||!Number.isFinite(v)?'—':Number(v).toLocaleString('tr-TR',{minimumFractionDigits:n||0,maximumFractionDigits:n||0});}
function lgPct(v){return v==null?'—':'%'+lgFmt(v,1);}
function lgRead(){try{var o=JSON.parse(localStorage.getItem(LEAGUE_KEY)||'{}');return o&&typeof o==='object'&&!Array.isArray(o)?o:{};}catch(_){return {};}}
function lgWrite(o){localStorage.setItem(LEAGUE_KEY,JSON.stringify(o));}
function lgNorm(v){return String(v||'').toLocaleUpperCase('tr-TR').replace(/İ/g,'I').replace(/ı/g,'I').trim();}
function lgMetric(b,p){var x=b&&b.prods&&b.prods[p];return x&&Number.isFinite(Number(x.a))&&Number.isFinite(Number(x.h))?{a:Number(x.a),h:Number(x.h)}:null;}
function lgSnapshot(parsed,manualDate){
 if(!parsed||String(parsed.donem).replace('/','-')!=='2026-11'||!parsed.detay||!parsed.detay.bayiler)throw Error('Kasım 2026 TTM satış raporu gerekli.');
 var detected=parsed.detay.reportDate;
 if(detected&&manualDate&&detected!==manualDate)throw Error('Seçilen gün ('+manualDate+') raporun içindeki tarihle ('+detected+') uyuşmuyor.');
 var date=detected||manualDate;
 if(!/^2026-11-(1[5-9]|2[0-9]|30)$/.test(date||''))throw Error('15–30 Kasım arası rapor kapanış tarihini seçin.');
 var dealers={};
 LEAGUE_CODES.forEach(function(code){
  var b=parsed.detay.bayiler[code];
  if(!b||lgNorm(b.sy)!=='YUSUF DILKI')throw Error(code+' kodlu bayi bu raporda Yusuf Dilki TTM listesinde bulunamadı.');
  var m=lgMetric(b,'Toplam Mobil'),d=lgMetric(b,'DSL'),t=lgMetric(b,'Toplam TV');
  if(!m||!d||!t||m.h<=0||d.h<=0||t.h<=0)throw Error(code+' kodlu bayinin Mobil, DSL veya TV verisi eksik.');
  dealers[code]={name:b.b,city:b.il,mobil:m,dsl:d,tv:t};
 });
 return {date:date,dealers:dealers,source:parsed.detay.sourceFileName||'Excel',dateSource:detected?parsed.detay.reportDateSource:'Elle seçilen kapanış günü'};
}
function lgCapture(parsed,manualDate,silent){
 var entry=lgSnapshot(parsed,manualDate),saved=lgRead(),old=saved[entry.date];
 if(old&&JSON.stringify(old.dealers)!==JSON.stringify(entry.dealers)&&!silent&&!confirm(entry.date+' tarihi için kayıtlı veriyi değiştirmek istiyor musunuz?'))return false;
 // Otomatik yükleme, aynı tarih için daha önce elle kaydedilmiş veriyi değiştirmez.
 if(old&&JSON.stringify(old.dealers)!==JSON.stringify(entry.dealers)&&silent)return false;
 saved[entry.date]=entry;lgWrite(saved);
 leagueNotice='✓ '+entry.date+' kapanışı kaydedildi (11 bayi).';
 return true;
}
function leagueCaptureCurrentUpload(parsed){
 try{if(parsed&&parsed.detay&&parsed.detay.reportDate&&String(parsed.donem).replace('/','-')==='2026-11')lgCapture(parsed,null,true);}catch(e){console.warn('[Lig] Güncel rapor kaydedilemedi:',e.message);}
}
function leagueMsg(message){leagueNotice=message; if(typeof renderLeague==='function'&&typeof section!=='undefined'&&section==='championsLeague')renderLeague();}
async function leagueUpload(input){
 var file=input.files&&input.files[0];if(!file)return;
 try{
  var picked=document.getElementById('lg-report-date'),date=picked&&picked.value;
  await ensureXLSX();
  var buf=await file.arrayBuffer(),wb=XLSX.read(new Uint8Array(buf),{type:'array'});
  var parsed=parseWB(wb,{fileName:file.name});
  if(!parsed.detay.reportDate&&!date)throw Error('Raporda tarih bulunamadı. Önce rapor kapanış tarihini seçin.');
  lgCapture(parsed,date||null,false);
  if(!leagueStageTouched){var n=Number((parsed.detay.reportDate||date).slice(-2));leagueStage=LEAGUE_STAGES.findIndex(function(s){return n<=s.end;});leagueStage=Math.max(0,leagueStage);}
  renderLeague();
 }catch(e){leagueMsg('⚠ '+e.message);}
 finally{input.value='';}
}
function leagueSetStage(i){leagueStage=Math.max(0,Math.min(3,Number(i)||0));leagueStageTouched=true;renderLeague();}
function lgLatestDate(saved,s,through){
 return Object.keys(saved).filter(function(d){return /^2026-11-\d\d$/.test(d)&&Number(d.slice(-2))>=s.start&&Number(d.slice(-2))<=Math.min(s.end,through||s.end);}).sort().pop()||null;
}
function lgRows(saved,i,codes,through){
 var s=LEAGUE_STAGES[i],base=saved[lgDate(s.base)],date=lgLatestDate(saved,s,through);
 if(!base||!date)return {rows:[],date:date,missing:!base?'Başlangıç kapanışı ('+lgDate(s.base)+') eksik.':'Bu turda henüz kapanış raporu yok.'};
 var curr=saved[date],days=Number(date.slice(-2))-s.start+1,rows=[];
 for(var k=0;k<codes.length;k++){
  var code=codes[k],b=base.dealers[code],n=curr.dealers[code];
  if(!b||!n){return {rows:[],date:date,missing:code+' için veri bulunamadı.'};}
  var ratios={},counts={},valid=true;
  ['mobil','dsl','tv'].forEach(function(p){
   var target=b[p].h*days/30,delta=n[p].a-b[p].a;counts[p]=delta;
   ratios[p]=target>0&&Number.isFinite(delta)?Math.max(0,delta/target*100):null;
   if(ratios[p]==null)valid=false;
  });
  var score=valid?Math.round((Math.min(200,ratios.mobil)*.3+Math.min(200,ratios.dsl)*.5+Math.min(200,ratios.tv)*.2)*10)/10:null;
  rows.push({code:code,name:n.name,city:n.city,mobil:ratios.mobil,dsl:ratios.dsl,tv:ratios.tv,score:score,counts:counts});
 }
 return {rows:rows,date:date,days:days,missing:null};
}
function lgCompare(a,b){
 return (b.score-a.score)||(b.dsl-a.dsl)||(b.mobil-a.mobil)||(b.tv-a.tv)||
  (b.counts.dsl-a.counts.dsl)||(b.counts.mobil-a.counts.mobil)||(b.counts.tv-a.counts.tv)||a.code.localeCompare(b.code,'tr');
}
function lgEndRows(saved,i,codes){
 var end=lgDate(LEAGUE_STAGES[i].end);if(!saved[end])return null;
 var pack=lgRows(saved,i,codes,LEAGUE_STAGES[i].end);
 return pack.date===end&&!pack.missing&&pack.rows.every(function(r){return r.score!=null;})?pack.rows.sort(lgCompare):null;
}
function lgPairs(i,roster){if(i===1)return [[roster[0],roster[7]],[roster[3],roster[4]],[roster[1],roster[6]],[roster[2],roster[5]]];if(i===2||i===3)return [[roster[0],roster[1]],...(i===2?[[roster[2],roster[3]]]:[])];return [];}
function lgSeed(saved){
 var first=lgEndRows(saved,0,LEAGUE_CODES);
 return first?first.slice(0,8).map(function(r){return r.code;}):null;
}
function lgRoster(saved,i){
 if(i===0)return LEAGUE_CODES.slice();
 var seed=lgSeed(saved);if(!seed)return null;
 if(i===1)return seed;
 var quarter=lgEndRows(saved,1,seed);if(!quarter)return null;
 var map={};quarter.forEach(function(r){map[r.code]=r;});
 var semis=lgPairs(1,seed).map(function(p){return lgCompare(map[p[0]],map[p[1]])<=0?p[0]:p[1];});
 if(i===2)return semis;
 var semiRows=lgEndRows(saved,2,semis);if(!semiRows)return null;
 var sm={};semiRows.forEach(function(r){sm[r.code]=r;});
 return lgPairs(2,semis).map(function(p){return lgCompare(sm[p[0]],sm[p[1]])<=0?p[0]:p[1];});
}
function lgSnapshotRank(saved,i,roster,through){
 var pack=lgRows(saved,i,roster,through);
 if(pack.missing)return pack;
 pack.rows.sort(lgCompare);pack.rows.forEach(function(r,x){r.rank=x+1;});
 var prevDates=Object.keys(saved).filter(function(d){return d>=lgDate(LEAGUE_STAGES[i].start)&&d<pack.date;}).sort();
 if(prevDates.length){var prev=lgRows(saved,i,roster,Number(prevDates[prevDates.length-1].slice(-2)));if(!prev.missing){prev.rows.sort(lgCompare);var prevRanks={};prev.rows.forEach(function(r,x){prevRanks[r.code]=x+1;});pack.rows.forEach(function(r){r.change=prevRanks[r.code]-r.rank;});}}
 return pack;
}
function lgTable(rows,first,hasFinal){
 return '<div class="lg-table-scroll"><table class="lg-table"><thead><tr><th>Sıra</th><th>Bayi / Kod</th><th>Mobil<br>HGO</th><th>DSL<br>HGO</th><th>TV<br>HGO</th><th>Lig puanı</th><th>Trend</th></tr></thead><tbody>'+
  rows.map(function(r,i){
   var risk=first&&i>=8,cls=risk?'lg-risk':i===0?'lg-first':'';
   var trend=r.change==null?'↔':r.change>0?'↑'+r.change:r.change<0?'↓'+Math.abs(r.change):'→';
   return '<tr class="'+cls+'"><td><b>'+(i===0?'🏆 ':i===1?'🥈 ':i===2?'🥉 ':'')+(i+1)+'</b></td>'+
    '<td class="lg-dealer"><b>'+lgEsc(r.name)+'</b><small>'+lgEsc(r.code)+' · '+lgEsc(r.city)+'</small></td>'+
    '<td>'+lgPct(r.mobil)+'</td><td>'+lgPct(r.dsl)+'</td><td>'+lgPct(r.tv)+'</td>'+
    '<td class="lg-score">'+lgFmt(r.score,1)+'</td><td class="'+(r.change>0?'lg-up':r.change<0?'lg-down':'')+'">'+trend+'</td></tr>'+
    (first&&i===7?'<tr class="lg-cut"><td colspan="7">ELEME ÇİZGİSİ · İLK 8 DEVAM EDER</td></tr>':'');
  }).join('')+'</tbody></table></div>';
}
function lgMatches(saved,i,roster,pack){
 if(i===0||!roster||!pack.rows.length)return '';
 var dict={};pack.rows.forEach(function(r){dict[r.code]=r;});
 var closed=pack.date===lgDate(LEAGUE_STAGES[i].end),pairs=lgPairs(i,roster);
 return '<div class="lg-matches">'+pairs.map(function(p,j){
  var a=dict[p[0]],b=dict[p[1]],winner=closed?(lgCompare(a,b)<=0?a.code:b.code):null;
  function item(r){return '<div class="lg-contender'+(winner===r.code?' lg-winner':'')+'"><span>'+lgEsc(r.name)+' <small>'+lgEsc(r.code)+'</small></span><b>'+lgFmt(r.score,1)+'</b></div>';}
  return '<div class="lg-match"><span class="lg-match-label">MAÇ '+(j+1)+(closed?' · TAMAMLANDI':' · DEVAM EDİYOR')+'</span>'+item(a)+item(b)+'</div>';
 }).join('')+'</div>';
}
function lgPoster(rows,stage,pack,closed){
 var leader=rows[0],first=stage===LEAGUE_STAGES[0],cut=first?8:null,n=rows.length;
 return '<div class="lg-poster" id="lg-poster"><div class="lg-p-top">TÜRK TELEKOM <span>🏆 ŞAMPİYONLAR LİGİ</span></div>'+
  '<div class="lg-p-title">GÜNLÜK PERFORMANS TAKİBİ</div><div class="lg-p-sub">'+lgEsc(stage.title)+' · '+stage.start+'–'+stage.end+' Kasım 2026 <span>Güncelleme: '+pack.date.slice(-2)+' Kasım</span></div>'+
  '<div class="lg-p-stats"><div><strong>'+n+'</strong><small>BAYİ YARIŞIYOR</small></div><div><strong>'+stage.advance+'</strong><small>TUR ATLAYACAK</small></div><div><strong>'+((stage.n)-(stage.advance))+'</strong><small>ELENECEK</small></div><div><strong>30</strong><small>KASIM FİNAL</small></div></div>'+
  '<div class="lg-p-weight"><span>%30 MOBİL</span><span>%50 DSL</span><span>%20 TV</span></div>'+
  '<table><thead><tr><th>#</th><th>BAYİ / KOD</th><th>MOBİL<br>HGO</th><th>DSL<br>HGO</th><th>TV<br>HGO</th><th>LİG<br>PUANI</th><th>↕</th></tr></thead><tbody>'+
  rows.map(function(r,i){var status=first&&i>=8?'lg-p-risk':i===0?'lg-p-gold':'';
   return '<tr class="'+status+'"><td>'+(i+1)+'</td><td><strong>'+lgEsc(r.name)+'</strong><small>'+lgEsc(r.code)+'</small></td><td>'+lgPct(r.mobil)+'</td><td>'+lgPct(r.dsl)+'</td><td>'+lgPct(r.tv)+'</td><td><b>'+lgFmt(r.score,1)+'</b></td><td>'+((r.change||0)>0?'↑'+r.change:(r.change||0)<0?'↓'+Math.abs(r.change):'–')+'</td></tr>'+
   (first&&i===7?'<tr class="lg-p-cut"><td colspan="7">ELEME ÇİZGİSİ – İLK 8 DEVAM EDER</td></tr>':'');
  }).join('')+'</tbody></table>'+
  '<div class="lg-p-bottom"><div>🏆 '+(closed&&stage.advance===1?'ŞAMPİYON':'GÜNÜN LİDERİ')+'<strong>'+lgEsc(leader.name)+'</strong><small>LİG PUANI: '+lgFmt(leader.score,1)+'</small></div>'+
  '<div>SON TUR TARİHİ <strong>'+stage.end+' KASIM</strong><small>16–30 Kasım 2026</small></div></div>'+
  '<footer>HGO: Turun hedef gerçekleşme oranı · Puan: %30 Mobil + %50 DSL + %20 TV (ürün başına %200 tavan).<br>15 Kasım öncesindeki aktivasyonlar puana dahil değildir. Her tur sıfırlanır.</footer></div>';
}
function leagueBackup(){
 var data=lgRead(),blob=new Blob([JSON.stringify({version:1,snapshots:data},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='TTM_Lig_Kasim_2026_Yedek.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
}
async function leagueRestore(input){
 var file=input.files&&input.files[0];if(!file)return;
 try{if(file.size>3000000)throw Error('Yedek dosyası çok büyük.');
  var obj=JSON.parse(await file.text());if(obj.version!==1||!obj.snapshots||typeof obj.snapshots!=='object')throw Error('Yedek formatı geçersiz.');
  var current=lgRead(),incoming=obj.snapshots;
  Object.keys(incoming).forEach(function(date){
   if(!/^2026-11-(1[5-9]|2[0-9]|30)$/.test(date))throw Error('Geçersiz tarih: '+date);
   var r=incoming[date];if(!r||!r.dealers||LEAGUE_CODES.some(function(k){return !r.dealers[k]||['mobil','dsl','tv'].some(function(p){var x=r.dealers[k][p];return !x||!Number.isFinite(x.a)||!Number.isFinite(x.h)||x.h<=0;});}))throw Error(date+' kaydı eksik veya hatalı.');
  });
  if(!confirm(Object.keys(incoming).length+' günlük yedeği bu cihaza aktarmak istiyor musunuz?'))return;
  Object.assign(current,incoming);lgWrite(current);leagueMsg('✓ Yedek içe aktarıldı.');
 }catch(e){leagueMsg('⚠ '+e.message);}finally{input.value='';}
}
async function leagueDownloadPNG(){
 var node=document.getElementById('lg-poster');if(!node){alert('Önce tur için geçerli performans raporlarını yükleyin.');return;}
 try{await ensureH2C();var canvas=await html2canvas(node,{backgroundColor:'#061932',scale:2,useCORS:true,windowWidth:1100,scrollX:0,scrollY:0,onclone:function(doc){var host=doc.getElementById('lg-poster-host');if(host){host.style.position='absolute';host.style.top='0';host.style.left='0';}}});
  canvas.toBlob(function(blob){if(!blob){alert('Görsel üretilemedi.');return;}var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='TTM_Sampiyonlar_Ligi_'+(node.getAttribute('data-day')||'Kasim')+'.png';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1500);},'image/png');
 }catch(e){alert('Görsel oluşturulamadı: '+e.message);}
}
function renderLeague(){
 var cards=document.getElementById('cards');if(!cards)return;
 var saved=lgRead();
 if(!leagueStageTouched){var last=Object.keys(saved).filter(function(k){return /^2026-11-\d\d$/.test(k);}).sort().pop();if(last){var d=Number(last.slice(-2)),idx=LEAGUE_STAGES.findIndex(function(s){return d<=s.end;});leagueStage=Math.max(0,idx);}}
 var s=LEAGUE_STAGES[leagueStage],roster=lgRoster(saved,leagueStage);
 cards.className='cards single lg-page';cards.style.maxWidth='1180px';
 var dates=Object.keys(saved).sort(),pack=roster?lgSnapshotRank(saved,leagueStage,roster):{rows:[],date:null,missing:'Önceki turun kesin kapanış raporu gerekli.'};
 var ready=roster&&pack.rows.length===roster.length&&!pack.missing,closed=ready&&pack.date===lgDate(s.end),rows=ready?pack.rows:[];
 var content='<section class="lg-shell"><header class="lg-hero"><span class="lg-eyebrow">KUZEY ANADOLU · TTM</span><h2>🏆 ŞAMPİYONLAR LİGİ</h2><p>11 bayi · 16–30 Kasım 2026 · Her tur yeni mücadele</p></header>'+
  '<div class="lg-rounds">'+LEAGUE_STAGES.map(function(x,i){return '<button class="'+(i===leagueStage?'active':'')+'" onclick="leagueSetStage('+i+')">'+(i+1)+'. '+lgEsc(x.title)+'<small>'+x.start+'–'+x.end+' Kasım</small></button>';}).join('')+'</div>'+
  '<div class="lg-stats"><div><small>TURDAKİ BAYİ</small><b>'+s.n+'</b></div><div><small>DEVAM EDECEK</small><b>'+s.advance+'</b></div><div><small>ELEME</small><b>'+(s.n-s.advance)+'</b></div><div><small>PUANLAMA</small><b>%30 / %50 / %20</b></div></div>'+
  '<div class="lg-weight"><span>📱 Mobil <b>%30</b></span><span>🌐 DSL <b>%50</b></span><span>📺 TV <b>%20</b></span></div>'+
  '<div class="lg-main-header"><div><h3>'+lgEsc(s.title)+' · '+s.start+'–'+s.end+' Kasım</h3><p>'+(pack.date?'Son kayıt: '+lgEsc(pack.date)+' · '+(closed?'Tur kapanışı alındı':'Geçici sıralama'):'Bekleyen raporlar')+'</p></div>'+
  '<button class="lg-png" '+(!ready?'disabled ':'')+'onclick="leagueDownloadPNG()">⬇ Günlük görsel (PNG)</button></div>';
 if(ready){content+=lgMatches(saved,leagueStage,roster,pack)+lgTable(rows,leagueStage===0,closed);
  content+='<div class="lg-leader">🏆 '+(closed&&leagueStage===3?'ŞAMPİYON':'GÜNÜN LİDERİ')+': <b>'+lgEsc(rows[0].name)+'</b><span>'+lgFmt(rows[0].score,1)+' puan</span></div>';
 }else content+='<div class="lg-empty"><b>Henüz puan hesaplanamıyor</b><p>'+lgEsc(pack.missing||'Gerekli kapanış verisi bulunamadı.')+'</p><small>İlk tur için 15 Kasım başlangıç raporu ve 16–19 Kasım güncel raporları gerekir. Sonraki turlarda 19, 23 ve 27 Kasım kesin kapanışları zorunludur.</small></div>';
 content+='<div class="lg-upload"><h3>📂 Rapor ve günlük veri kaydı</h3><p>15 Kasım raporunu bir kez kaydet. Sonraki günlerin Anadolu GM raporlarını ekleyince lig kendiliğinden güncellenir. Kapanış günü Excel içinden doğrulanamıyorsa tarih seçimi zorunludur.</p>'+
  '<div class="lg-input-row"><label>Rapor kapanış tarihi <input id="lg-report-date" type="date" min="2026-11-15" max="2026-11-30"></label><label class="lg-file-label">Excel raporu ekle<input type="file" accept=".xlsx,.xls" onchange="leagueUpload(this)"></label></div>'+
  '<div class="lg-saved"><b>Kaydedilen günler:</b> '+(dates.length?dates.map(function(x){return '<span>'+x.slice(-2)+' Kas</span>';}).join(''):'Henüz kayıt bulunmuyor')+'</div>'+
  '<div class="lg-backup"><button onclick="leagueBackup()">↓ Günlük veri yedeği (.json)</button><label>↑ Yedek içe aktar<input type="file" accept=".json" onchange="leagueRestore(this)"></label></div>'+
  '<small class="lg-privacy">⚠ Yedek dosyası gerçek aktivasyon adetlerini içerir; yalnız yetkili kişilerle paylaşın. Paylaşım PNG görselinde adetler yer almaz. Veriler bu cihazda saklanır, GitHub’a gönderilmez.</small></div>'+
  '<footer class="lg-foot">Lig HGO = (Tur içinde yeni net aktivasyon / aylık hedef × 30 / turda geçen gün) × 100. Her ürün puanı %200 tavanlıdır. Tur sonunda puanlar sıfırlanır. Eşitlikte sırasıyla DSL HGO, Mobil HGO, TV HGO, DSL/Mobil/TV net adetleri ve bayi kodu kullanılır. Kesin tur sonucu için kapanış raporu zorunludur.</footer>'+
  (leagueNotice?'<div class="lg-notice">'+lgEsc(leagueNotice)+'</div>':'')+'</section>';
 if(ready)content+='<div id="lg-poster-host" class="lg-poster-host">'+lgPoster(rows,s,pack,closed)+'</div>';
 cards.innerHTML=content;
 var poster=document.getElementById('lg-poster');if(poster&&pack.date)poster.setAttribute('data-day',pack.date);
}
