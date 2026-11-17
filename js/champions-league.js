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

/* İkinci ödül: 16–30 Kasım boyunca, elense de tüm 11 bayinin 15 Kasım bazına
 * göre yeni aktivasyonlarından hesaplanan tek dönem HGO. Günlük kümülatif
 * puanlar TOPLANMAZ; aynı aktivasyonu iki defa saymamak için son rapor kullanılır. */
function lgOverallRank(saved,through){
 var base=saved[lgDate(15)];
 if(!base)return {rows:[],date:null,missing:'15 Kasım başlangıç kapanışı eksik.'};
 var dates=Object.keys(saved).filter(function(d){
  return /^2026-11-(1[6-9]|2[0-9]|30)$/.test(d)&&(!through||d<=through);
 }).sort();
 var date=dates.pop();
 if(!date)return {rows:[],date:null,missing:'16–30 Kasım güncel kapanış raporu bekleniyor.'};
 var current=saved[date],days=Number(date.slice(-2))-15,rows=[];
 for(var i=0;i<LEAGUE_CODES.length;i++){
  var code=LEAGUE_CODES[i],b=base.dealers&&base.dealers[code],n=current.dealers&&current.dealers[code];
  if(!b||!n)return {rows:[],date:date,missing:code+' kodlu bayi için eksik rapor verisi.'};
  var ratios={},counts={};
  for(var j=0;j<3;j++){
   var p=['mobil','dsl','tv'][j],start=b[p],now=n[p];
   if(!start||!now||!Number.isFinite(start.h)||start.h<=0||!Number.isFinite(start.a)||!Number.isFinite(now.a))
    return {rows:[],date:date,missing:code+' · '+p+' verisi geçersiz.'};
   var diff=now.a-start.a,target=start.h*days/30;
   counts[p]=diff;ratios[p]=Math.max(0,diff/target*100);
  }
  var score=Math.round((Math.min(200,ratios.mobil)*.30+
   Math.min(200,ratios.dsl)*.50+Math.min(200,ratios.tv)*.20)*10)/10;
  rows.push({code:code,name:n.name,city:n.city,mobil:ratios.mobil,dsl:ratios.dsl,
   tv:ratios.tv,score:score,counts:counts});
 }
 rows.sort(lgCompare);
 rows.forEach(function(r,i){r.rank=i+1;});
 return {rows:rows,date:date,days:days,missing:null};
}
function lgChampionCode(saved){
 var roster=lgRoster(saved,3);
 if(!roster)return null;
 var finalRows=lgEndRows(saved,3,roster);
 return finalRows&&finalRows.length===2?finalRows[0].code:null;
}
function lgAwardState(saved,through){
 var overall=lgOverallRank(saved,through);
 var champion=lgChampionCode(saved);
 var done=!!(champion&&overall.date===lgDate(30)&&!overall.missing&&overall.rows.length===11);
 // İki AYRI kazanan: Lig Şampiyonu aynı zamanda genel puan birincisiyse
 // Performans Ödülü genel sıralamadaki sonraki bayiye gider.
 var performance=done?overall.rows.find(function(r){return r.code!==champion;}):null;
 return {overall:overall,champion:done?champion:null,performance:performance,
  leader:overall.rows[0]||null,final:done};
}
function lgAwardCards(awards,saved){
 var name=function(code){
  if(!code)return '30 Kasım finali bekleniyor';
  var item=saved[lgDate(30)]&&saved[lgDate(30)].dealers&&saved[lgDate(30)].dealers[code];
  return item?lgEsc(item.name)+' · '+lgEsc(code):lgEsc(code);
 };
 var leader=awards.leader;
 return '<div class="lg-awards"><div class="lg-award lg-award-gold"><small>🏆 1. ÖDÜL</small>'+
  '<h3>LİG ŞAMPİYONU</h3><strong>'+name(awards.champion)+'</strong>'+
  '<p>Eleme turları · Büyük final 28–30 Kasım</p></div>'+
  '<div class="lg-award lg-award-turquoise"><small>🥇 2. ÖDÜL</small>'+
  '<h3>PERFORMANS ŞAMPİYONU</h3><strong>'+
  (awards.final?name(awards.performance.code):'16–30 Kasım genel puan sıralaması')+'</strong>'+
  '<p>'+(awards.final?'Kazanan puanı: '+lgFmt(awards.performance.score,1):
   leader?'Geçici lider: '+lgEsc(leader.name)+' · '+lgFmt(leader.score,1)+' puan':'Veriler bekleniyor')+
   '</p></div></div>';
}
function lgOverallTable(awards){
 var pack=awards.overall;
 if(pack.missing)return '<div class="lg-empty"><b>Genel puan tablosu bekleniyor</b><p>'+lgEsc(pack.missing)+'</p></div>';
 return '<div class="lg-table-scroll"><table class="lg-table"><thead><tr><th>Sıra</th><th>Bayi / Kod</th>'+
  '<th>Mobil<br>HGO</th><th>DSL<br>HGO</th><th>TV<br>HGO</th><th>Genel Puan</th><th>Durum</th></tr></thead><tbody>'+
  pack.rows.map(function(r,i){
   var champion=awards.final&&awards.champion===r.code,performance=awards.final&&awards.performance.code===r.code;
   var status=champion?'🏆 Lig Şampiyonu':performance?'🥇 Performans Şampiyonu':!awards.final&&i===0?'Genel Puan Lideri':'—';
   return '<tr class="'+(i===0?'lg-first':'')+'"><td>'+(i+1)+'</td>'+
    '<td class="lg-dealer"><b>'+lgEsc(r.name)+'</b><small>'+lgEsc(r.code)+' · '+lgEsc(r.city)+'</small></td>'+
    '<td>'+lgPct(r.mobil)+'</td><td>'+lgPct(r.dsl)+'</td><td>'+lgPct(r.tv)+'</td>'+
    '<td class="lg-score">'+lgFmt(r.score,1)+'</td><td>'+status+'</td></tr>';
  }).join('')+'</tbody></table></div>';
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
/* Tek kaynaklı premium poster: uygulamada canlı görünür, PNG'de aynı DOM çizilir. */
function lgPoster(rows,stage,pack,closed,awards,saved,roster){
 var first=stage===LEAGUE_STAGES[0],n=stage.n;
 var shown=rows&&rows.length?rows:(
  first?LEAGUE_CODES.map(function(code){
   var b=saved&&saved[lgDate(15)]&&saved[lgDate(15)].dealers&&saved[lgDate(15)].dealers[code];
   return {code:code,name:b?b.name:'Bayi verisi bekleniyor',mobil:null,dsl:null,tv:null,score:null,change:null,placeholder:true};
  }):Array.from({length:n},function(_,i){
   return {code:'',name:'Tur verisi bekleniyor',mobil:null,dsl:null,tv:null,score:null,change:null,placeholder:true};
  })
 );
 var leader=rows&&rows.length?rows[0]:null;
 var overall=awards&&awards.leader?awards.leader:null;
 var overallWinner=awards&&awards.final&&awards.performance?awards.performance:null;
 var regular=awards&&awards.final&&awards.champion;
 var scoreTitle=regular?'PERFORMANS ŞAMPİYONU':'GENEL PUAN LİDERİ';
 var scoreRow=overallWinner||overall;
 var date=pack&&pack.date?pack.date:null;
 var prettyDate=date?String(Number(date.slice(-2)))+' Kasım':'Rapor bekleniyor';
 var out='<div class="lg-poster" id="lg-poster"'+(date?' data-day="'+lgEsc(date)+'"':'')+'>'+
  '<div class="lg-p-top"><div class="lg-p-brand">TÜRK TELEKOM</div><div class="lg-p-brand-right">🏆 ŞAMPİYONLAR LİGİ</div></div>'+
  '<div class="lg-p-title"><span class="lg-p-laurel">❧</span>GÜNLÜK PERFORMANS TAKİBİ<span class="lg-p-laurel lg-p-laurel-right">❧</span></div>'+
  '<div class="lg-p-sub"><b>'+lgEsc(stage.title)+' · '+stage.start+'–'+stage.end+' Kasım 2026</b>'+
    '<b>Güncelleme: '+prettyDate+'</b></div>'+
  '<div class="lg-p-stats">'+
    '<div class="lg-p-stat lg-p-blue"><span class="lg-p-stat-icon">♙</span><strong>'+n+'</strong><small>BAYİ YARIŞIYOR</small></div>'+
    '<div class="lg-p-stat lg-p-teal"><span class="lg-p-stat-icon">»</span><strong>'+stage.advance+'</strong><small>TUR ATLAYACAK</small></div>'+
    '<div class="lg-p-stat lg-p-red"><span class="lg-p-stat-icon">⊗</span><strong>'+(stage.n-stage.advance)+'</strong><small>ELENECEK</small></div>'+
    '<div class="lg-p-stat lg-p-gold"><span class="lg-p-stat-icon">🏆</span><strong>30</strong><small>KASIM FİNAL</small></div>'+
  '</div>'+
  '<div class="lg-p-weight"><span>♧ &nbsp; %30 MOBİL</span><span>⌁ &nbsp; %50 DSL</span><span>▣ &nbsp; %20 TV</span></div>'+
  '<table class="lg-p-board"><colgroup><col style="width:7%"><col style="width:30%"><col style="width:14%"><col style="width:14%"><col style="width:14%"><col style="width:16%"><col style="width:5%"></colgroup>'+
  '<thead><tr><th>#</th><th>BAYİ / KOD</th><th>MOBİL<br>HGO</th><th>DSL<br>HGO</th><th>TV<br>HGO</th><th>LİG<br>PUANI</th><th>↕</th></tr></thead><tbody>'+
  shown.map(function(r,i){
   var klass=r.placeholder?'lg-p-pending':first&&i>=8?'lg-p-risk':i===0?'lg-p-gold':'';
   var trend=r.change==null?'–':r.change>0?'↑'+r.change:r.change<0?'↓'+Math.abs(r.change):'→';
   var score=r.placeholder?'—':lgFmt(r.score,1);
   var title=lgEsc(r.name||'Bayi verisi bekleniyor');
   return '<tr class="'+klass+'"><td class="lg-p-rank">'+(i+1)+'</td>'+
    '<td class="lg-p-dealer"><strong>'+title+'</strong><small>'+lgEsc(r.code||'—')+'</small></td>'+
    '<td>'+lgPct(r.mobil)+'</td><td>'+lgPct(r.dsl)+'</td><td>'+lgPct(r.tv)+'</td>'+
    '<td class="lg-p-score"><b>'+score+'</b></td><td class="lg-p-trend">'+trend+'</td></tr>'+
    (first&&i===7?'<tr class="lg-p-cut"><td colspan="7">ELEME ÇİZGİSİ – İLK 8 DEVAM EDER</td></tr>':'');
  }).join('')+'</tbody></table>'+
  '<div class="lg-p-bottom">'+
   '<div class="lg-p-award lg-p-award-gold"><span class="lg-p-award-icon">🏆</span><div>'+
     '<h3>'+(closed&&stage.advance===1?'LİG ŞAMPİYONU':'TUR LİDERİ')+'</h3>'+
     '<strong>'+lgEsc(leader?leader.name:'Rapor bekleniyor')+'</strong>'+
     '<small>LİG PUANI: '+(leader?lgFmt(leader.score,1):'—')+'</small></div></div>'+
   '<div class="lg-p-award lg-p-award-blue"><span class="lg-p-award-icon">🥇</span><div>'+
     '<h3>'+scoreTitle+'</h3>'+
     '<strong>'+lgEsc(scoreRow?scoreRow.name:'Rapor bekleniyor')+'</strong>'+
     '<small>16–30 KASIM · '+(scoreRow?lgFmt(scoreRow.score,1)+' PUAN'+(awards.final?'':' (GEÇİCİ)'):'VERİ BEKLENİYOR')+'</small>'+
    '</div></div></div>'+
  '<footer class="lg-p-legend"><span class="lg-p-legend-i">ⓘ</span><div>HGO: Turun hedef gerçekleşme oranı · Puan: %30 Mobil + %50 DSL + %20 TV (ürün başına %200 tavan).'+
    '<br>15 Kasım öncesindeki aktivasyonlar puana dahil değildir. Her tur sıfırlanır.</div></footer>'+
  '</div>';
 return out;
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
/* Paylaş ve PNG aynı canlı poster DOM'unu kullanır; ayrı bir görsel şablonu yoktur. */
async function leagueDownloadPNG(){
 var node=document.getElementById('lg-poster');
 if(!node||!node.getAttribute('data-day')){
  alert('Önce başlangıç ve güncel performans raporlarını yükleyin.');return;
 }
 var btn=document.getElementById('lg-share-btn');
 if(btn){btn.disabled=true;btn.textContent='Görsel hazırlanıyor…';}
 try{
  await ensureH2C();
  var canvas=await html2canvas(node,{
   backgroundColor:'#041a30',scale:2,useCORS:true,windowWidth:1200,scrollX:0,scrollY:0,
   onclone:function(doc){
    var el=doc.getElementById('lg-poster');
    if(el){el.classList.add('lg-for-export');el.style.width='980px';el.style.maxWidth='none';}
    var host=doc.getElementById('lg-visual-host');
    if(host){host.style.width='980px';host.style.maxWidth='none';host.style.overflow='visible';}
   }
  });
  var blob=await new Promise(function(resolve){canvas.toBlob(resolve,'image/png');});
  if(!blob)throw Error('PNG üretilemedi.');
  var fileName='TTM_Sampiyonlar_Ligi_'+node.getAttribute('data-day')+'.png';
  var file=typeof File!=='undefined'?new File([blob],fileName,{type:'image/png'}):null;
  if(file&&navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
   try{await navigator.share({files:[file],title:'TTM Şampiyonlar Ligi Günlük Performans'});return;}
   catch(e){if(e.name==='AbortError')return;/* desteklenmeyen paylaşımda PNG indir */}
  }
  var url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=fileName;document.body.appendChild(link);link.click();link.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},1500);
 }catch(e){alert('Görsel paylaşılamadı: '+e.message);}
 finally{if(btn){btn.disabled=false;btn.textContent='↗ Paylaş / PNG';}}
}
function renderLeague(){
 var cards=document.getElementById('cards');if(!cards)return;
 var saved=lgRead();
 if(!leagueStageTouched){var last=Object.keys(saved).filter(function(k){return /^2026-11-\d\d$/.test(k);}).sort().pop();if(last){var d=Number(last.slice(-2)),idx=LEAGUE_STAGES.findIndex(function(s){return d<=s.end;});leagueStage=Math.max(0,idx);}}
 var s=LEAGUE_STAGES[leagueStage],roster=lgRoster(saved,leagueStage);
 cards.className='cards single lg-page';cards.style.maxWidth='1180px';
 var dates=Object.keys(saved).sort(),pack=roster?lgSnapshotRank(saved,leagueStage,roster):{rows:[],date:null,missing:'Önceki turun kesin kapanış raporu gerekli.'};
 var ready=roster&&pack.rows.length===roster.length&&!pack.missing,closed=ready&&pack.date===lgDate(s.end),rows=ready?pack.rows:[];
 var awards=lgAwardState(saved);
 var content='<section class="lg-shell lg-shell-live">'+
  '<div class="lg-live-toolbar"><div class="lg-live-toolbar-label"><h2>🏆 Şampiyonlar Ligi</h2>'+
   '<p>Günlük HGO tablosu · Ekrandaki tasarım paylaşımda aynen korunur</p></div>'+
   '<button id="lg-share-btn" class="lg-png" '+(!ready?'disabled ':'')+
     'onclick="leagueDownloadPNG()">↗ Paylaş / PNG</button></div>'+
  '<div class="lg-rounds">'+LEAGUE_STAGES.map(function(x,i){
   return '<button class="'+(i===leagueStage?'active':'')+'" onclick="leagueSetStage('+i+')">'+
    (i+1)+'. '+lgEsc(x.title)+'<small>'+x.start+'–'+x.end+' Kasım</small></button>';
  }).join('')+'</div>'+
  '<div id="lg-visual-host" class="lg-visual-host">'+
   lgPoster(rows,s,pack,closed,lgAwardState(saved,pack.date||null),saved,roster)+
  '</div>';
 if(!ready){
  content+='<div class="lg-empty"><b>Canlı görünüm hazır · Veri bekleniyor</b>'+
   '<p>'+lgEsc(pack.missing||'Gerekli kapanış raporu bulunamadı.')+'</p>'+
   '<small>15 Kasım başlangıç raporunu ve güncel kapanış raporunu yüklediğinde tablo dolacaktır. Eksik veri için sonuç veya şampiyon oluşturulmaz.</small></div>';
 }
 if(ready&&leagueStage>0){
  content+='<div class="lg-match-panel"><h3>⚔️ Tur eşleşmeleri</h3>'+lgMatches(saved,leagueStage,roster,pack)+'</div>';
 }
 content+='<div class="lg-overall"><div class="lg-overall-head"><h3>🥇 16–30 Kasım Genel Puan Yarışı</h3><p>Tüm 11 bayi yarışır; ligden elenen bayiler de bu sıralamada kalır. 15 Kasım bazından itibaren tek dönem HGO hesaplanır, günlük puanlar toplanmaz. '+(awards.overall.date?'Son güncelleme: '+awards.overall.date+' · '+(awards.final?'Kesin sonuç':'Geçici puanlar'):'Rapor bekleniyor')+'</p></div>'+lgOverallTable(awards)+
  '<p class="lg-award-note">İki ayrı kazanan kuralı: Lig Şampiyonu genel puan sıralamasında da birinciyse Performans Şampiyonluğu ödülü diğer bayiler arasındaki en yüksek puanlı bayiye verilir. Sonuç 30 Kasım kapanış raporuyla kesinleşir.</p></div>';
 content+='<div class="lg-upload"><h3>📂 Rapor ve günlük veri kaydı</h3><p>15 Kasım raporunu bir kez kaydet. Sonraki günlerin Anadolu GM raporlarını ekleyince lig kendiliğinden güncellenir. Kapanış günü Excel içinden doğrulanamıyorsa tarih seçimi zorunludur.</p>'+
  '<div class="lg-input-row"><label>Rapor kapanış tarihi <input id="lg-report-date" type="date" min="2026-11-15" max="2026-11-30"></label><label class="lg-file-label">Excel raporu ekle<input type="file" accept=".xlsx,.xls" onchange="leagueUpload(this)"></label></div>'+
  '<div class="lg-saved"><b>Kaydedilen günler:</b> '+(dates.length?dates.map(function(x){return '<span>'+x.slice(-2)+' Kas</span>';}).join(''):'Henüz kayıt bulunmuyor')+'</div>'+
  '<div class="lg-backup"><button onclick="leagueBackup()">↓ Günlük veri yedeği (.json)</button><label>↑ Yedek içe aktar<input type="file" accept=".json" onchange="leagueRestore(this)"></label></div>'+
  '<small class="lg-privacy">⚠ Yedek dosyası gerçek aktivasyon adetlerini içerir; yalnız yetkili kişilerle paylaşın. Paylaşım PNG görselinde adetler yer almaz. Veriler bu cihazda saklanır, GitHub’a gönderilmez.</small></div>'+
  '<footer class="lg-foot">Lig HGO = (Tur içinde yeni net aktivasyon / aylık hedef × 30 / turda geçen gün) × 100. Genel Puan aynı hesapla 16 Kasım’dan itibaren birikimli olarak 15 Kasım bazıyla hesaplanır, her günlük puan ayrı ayrı toplanmaz. Her ürün puanı %200 tavanlıdır. Eşitlikte sırasıyla DSL HGO, Mobil HGO, TV HGO, DSL/Mobil/TV net adetleri ve bayi kodu kullanılır. Kesin ödüller için 30 Kasım kapanış raporu zorunludur.</footer>'+
  (leagueNotice?'<div class="lg-notice">'+lgEsc(leagueNotice)+'</div>':'')+'</section>';

 cards.innerHTML=content;

}
