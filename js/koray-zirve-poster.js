/* KUZEY ANADOLU · TTM ZİRVE YARIŞI · 1024 x 1536
 * Fixed premium SVG, shared by the on-screen dashboard and the downloaded PNG.
 * Pure SVG: no external fonts, bitmaps, or duplicate image-based labels.
 * User's daily campaign snapshots drive every name, HGO, rank, point, trend.
 */
(function () {
 'use strict';
 function e(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c];});}
 function txt(x,y,v,size,color,weight,anchor,more){
  return '<text x="'+x+'" y="'+y+'" fill="'+(color||'#fff')+'" font-family="Arial,Helvetica,sans-serif" font-size="'+(size||17)+
   '" font-weight="'+(weight||700)+'" text-anchor="'+(anchor||'start')+'"'+(more?' '+more:'')+'>'+e(v)+'</text>';
 }
 function rect(x,y,w,h,rad,fill,stroke,sw,ext){
  return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(rad||0)+'" fill="'+fill+'"'+
   (stroke?' stroke="'+stroke+'" stroke-width="'+(sw||1)+'"':'')+(ext?' '+ext:'')+'/>';
 }
 function line(x1,y1,x2,y2,color,width,opacity){
  return '<path d="M'+x1+' '+y1+'L'+x2+' '+y2+'" stroke="'+color+'" stroke-width="'+(width||1)+'" opacity="'+(opacity==null?1:opacity)+'" fill="none"/>';
 }
 function trophy(x,y,z){
  return '<g transform="translate('+x+' '+y+') scale('+(z||1)+')" stroke="#ffdc83" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" fill="none">'+
  '<path d="M-17 -15H17L13 4Q8 15 0 15Q-8 15 -13 4Z" fill="url(#kz-goldMetal)"/>'+
  '<path d="M-17 -10H-26Q-28 6 -11 9M17 -10H26Q28 6 11 9M0 15V27M-13 31H13" stroke-width="3.5"/></g>';
 }
 function ico(type,x,y,color){
  var i='';
  if(type==='people')i='<circle cx="0" cy="-10" r="6"/><circle cx="-13" cy="-4" r="4"/><circle cx="13" cy="-4" r="4"/><path d="M-12 15V8Q-12 1 0 1Q12 1 12 8V15M-24 14V9Q-24 3 -15 3M24 14V9Q24 3 15 3"/>';
  if(type==='calendar')i='<rect x="-19" y="-16" width="38" height="34" rx="3"/><path d="M-19 -7H19M-9 -20V-11M9 -20V-11M-10 2H-6M0 2H4M9 2H13M-10 10H-6M0 10H4"/>';
  if(type==='cross')i='<circle r="19"/><path d="M-8 -8L8 8M8 -8L-8 8"/>';
  if(type==='phone')i='<rect x="-10" y="-19" width="20" height="38" rx="3"/><path d="M-4 -15H4M-1 14H1"/>';
  if(type==='dsl')i='<path d="M-19 -12Q0 -28 19 -12M-12 -5Q0 -17 12 -5M-4 1Q0 -2 4 1"/><rect x="-22" y="7" width="44" height="14" rx="3"/><path d="M11 14H16"/>';
  if(type==='iptv')i='<rect x="-23" y="-17" width="46" height="30" rx="3"/><path d="M-5 -8L8 -2L-5 6ZM0 13V21M-12 21H12"/>';
  if(type==='satellite')i='<path d="M-19 -4Q-8 17 10 16Q2 0 -19 -4Z"/><path d="M-19 -4L-24 -11M10 16L19 24M-5 6L8 -7M6 -10Q18 -9 19 3M10 -16Q26 -14 28 5"/>';
  if(type==='mountain')i='<path d="M-30 18L-9 -13L2 0L13 -17L31 18Z"/><path d="M-15 -5L-9 1L-3 -7M8 -11L13 -5L17 -10"/>';
  return '<g transform="translate('+x+' '+y+')" fill="none" stroke="'+(color||'#8bfbff')+
    '" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">'+i+'</g>';
 }
 function wreath(x,y,scale){
  var a='<g transform="translate('+x+' '+y+') scale('+scale+' 1)" fill="url(#kz-goldMetal)" stroke="#ffe298" stroke-width=".6">';
  [[-5,23,-57],[-15,16,-46],[-23,6,-34],[-27,-6,-24],[-26,-20,-11],[-20,-34,2],[-9,-43,15]].forEach(function(p){
   a+='<ellipse cx="'+p[0]+'" cy="'+p[1]+'" rx="4" ry="11" transform="rotate('+p[2]+' '+p[0]+' '+p[1]+')"/>';
  });return a+'</g>';
 }
 function num(v){return v==null||!Number.isFinite(v)?'—':Number(v).toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1});}
 function percent(v){return v==null||!Number.isFinite(v)?'—':'%'+num(v);}
 function cut(v,n){v=String(v||'');return v.length>n?v.slice(0,n-1)+'…':v;}
 function card(x,width,value,label,kind,bg,border){
  return rect(x,247,width,101,16,bg,border,1.8)+
   (kind==='cup'?trophy(x+51,286,.85):ico(kind,x+54,288,border))+
   line(x+92,266,x+92,313,border,1.5,.8)+
   txt(x+width/2+37,296,value,42,'#fff',900,'middle')+
   txt(x+width/2+37,325,label,13,'#e9fbff',800,'middle');
 }
 function weight(x,width,kind,title,pct,isBold){
  return rect(x,366,width,69,15,isBold?'url(#kz-weightTeal)':'url(#kz-weightBlue)',isBold?'#09fff0':'#1dcff5',1.9)+
    ico(kind,x+43,403,isBold?'#bbffff':'#87eafa')+
    txt(x+width/2+26,403,title,18,'#fff',900,'middle')+
    txt(x+width/2+26,427,pct,19,isBold?'#ffe49c':'#d3faff',900,'middle');
 }
 function award(x,kind,title,name,sub,gold){
  var stroke=gold?'#ffe18a':'#0ce3f1',bg=gold?'url(#kz-awardGold)':'url(#kz-awardCyan)';
  var out=rect(x,1167,477,164,19,bg,stroke,2.2);
  out+=gold?trophy(x+73,1251,1.45):ico(kind,x+74,1252,'#70faff');
  out+=line(x+124,1192,x+124,1309,stroke,1.2,.8);
  out+=txt(x+295,1216,title,21,gold?'#ffe18e':'#5efcfb',900,'middle');
  out+=txt(x+295,1260,cut(name,24),name.length>19?23:29,'#fff',900,'middle','textLength="'+(name.length>29?298:Math.min(303,Math.max(170,name.length*15)))+'" lengthAdjust="spacingAndGlyphs"');
  out+=txt(x+295,1299,sub,17,gold?'#ffe08b':'#56fcfa',900,'middle','textLength="'+Math.min(299,Math.max(100,sub.length*10))+'" lengthAdjust="spacingAndGlyphs"');
  return out;
 }
 function imageSvg(pack){
  var rows=pack&&Array.isArray(pack.rows)?pack.rows:[];
  var valid=rows.length===12&&!pack.missing;
  var leader=valid?rows[0]:null;
  var pursuer=valid?rows[1]:null;
  var date=valid?Number(pack.date.slice(-2))+' Kasım':'Rapor bekleniyor';
  var src='<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536" role="img" aria-label="Koray Yeşilördek TTM Zirve Yarışı günlük HGO performans tablosu">'+
  '<defs>'+
  '<linearGradient id="kz-bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#031a2b"/><stop offset=".45" stop-color="#062b49"/><stop offset="1" stop-color="#021525"/></linearGradient>'+
  '<radialGradient id="kz-rad" cx=".81" cy=".1" r=".95"><stop stop-color="#0c7fa5" stop-opacity=".39"/><stop offset="1" stop-color="#073150" stop-opacity="0"/></radialGradient>'+
  '<linearGradient id="kz-title" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#001b2e"/><stop offset=".5" stop-color="#085474"/><stop offset="1" stop-color="#001b2e"/></linearGradient>'+
  '<linearGradient id="kz-goldMetal" x1="0" y1="0" x2="1"><stop stop-color="#a26c1b"/><stop offset=".22" stop-color="#ffe9a0"/><stop offset=".53" stop-color="#eab943"/><stop offset=".83" stop-color="#fff1ac"/><stop offset="1" stop-color="#a36b20"/></linearGradient>'+
  '<linearGradient id="kz-statBlue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0d6485"/><stop offset="1" stop-color="#06223d"/></linearGradient>'+
  '<linearGradient id="kz-statTeal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#007c79"/><stop offset="1" stop-color="#0b3345"/></linearGradient>'+
  '<linearGradient id="kz-statRed" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#325064"/><stop offset="1" stop-color="#193045"/></linearGradient>'+
  '<linearGradient id="kz-statGold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#716338"/><stop offset="1" stop-color="#122e44"/></linearGradient>'+
  '<linearGradient id="kz-weightBlue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#064665"/><stop offset="1" stop-color="#07263e"/></linearGradient>'+
  '<linearGradient id="kz-weightTeal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#048a88"/><stop offset="1" stop-color="#0db2a9"/></linearGradient>'+
  '<linearGradient id="kz-goldRow" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#71501c"/><stop offset=".5" stop-color="#382c1b"/><stop offset="1" stop-color="#765820"/></linearGradient>'+
  '<linearGradient id="kz-awardGold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#675320"/><stop offset=".5" stop-color="#222828"/><stop offset="1" stop-color="#674f20"/></linearGradient>'+
  '<linearGradient id="kz-awardCyan" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#083f57"/><stop offset=".5" stop-color="#07263d"/><stop offset="1" stop-color="#0a5a6b"/></linearGradient>'+
  '<filter id="kz-glow"><feGaussianBlur stdDeviation="4"/></filter>'+
  '</defs>'+
  rect(0,0,1024,1536,0,'url(#kz-bg)')+rect(0,0,1024,1536,0,'url(#kz-rad)')+
  '<path d="M355 0H465L350 110H254Z" fill="#058ab4" opacity=".21"/>'+
  line(465,0,359,105,'#04c0f0',2,.7)+
  '<path d="M828 1536L1024 1334V1401L890 1536Z" fill="#06b5ea" opacity=".23"/>'+
  line(808,1536,1024,1341,'#1adbf7',2,.65)+
  line(38,22,38,59,'#3df4ff',5)+txt(57,52,'TÜRK TELEKOM',29,'#fff',900)+
  trophy(735,40,.82)+txt(763,52,'ZİRVE YARIŞI',28,'#ffe091',900)+
  rect(30,82,964,98,22,'url(#kz-title)','#15eaf6',5,'filter="url(#kz-glow)"')+
  rect(30,82,964,98,22,'url(#kz-title)','#20eefd',2.2)+
  wreath(119,129,1)+wreath(907,129,-1)+
  txt(512,145,'GÜNLÜK PERFORMANS TAKİBİ',44,'#fff',900,'middle')+
  txt(32,215,'Zirve Yarışı · 16–30 Kasım 2026',22,'#fff',800)+
  txt(994,215,'Güncelleme: '+date,22,'#fff',800,'end')+
  card(24,234,'12','BAYİ YARIŞIYOR','people','url(#kz-statBlue)','#23dcfc')+
  card(269,234,'15','GÜN','calendar','url(#kz-statTeal)','#0ef1e0')+
  card(514,234,'0','ELENEN BAYİ','cross','url(#kz-statRed)','#6ae3ec')+
  card(759,241,'30','KASIM ŞAMPİYON','cup','url(#kz-statGold)','#ffdf7a')+
  weight(24,232,'phone','MOBİL','%40',false)+weight(269,231,'dsl','DSL','%40',true)+
  weight(512,231,'iptv','IPTV','%10',false)+weight(755,245,'satellite','UYDU TV','%10',false)+
  rect(24,454,976,675,12,'#05273e','#257e9e',1.4)+
  rect(24,454,976,65,11,'#06466a','#319ab6',1.2)+
  txt(49,492,'#',15,'#fff',900,'middle')+
  txt(208,492,'BAYİ / KOD',16,'#fff',900,'middle')+
  txt(409,482,'MOBİL',14,'#fff',900,'middle')+txt(409,501,'HGO',14,'#fff',900,'middle')+
  txt(517,482,'DSL',14,'#fff',900,'middle')+txt(517,501,'HGO',14,'#fff',900,'middle')+
  txt(627,482,'IPTV',14,'#fff',900,'middle')+txt(627,501,'HGO',14,'#fff',900,'middle')+
  txt(736,482,'UYDU',14,'#fff',900,'middle')+txt(736,501,'HGO',14,'#fff',900,'middle')+
  txt(859,482,'GENEL',14,'#fff',900,'middle')+txt(859,501,'PUAN',14,'#fff',900,'middle')+
  txt(964,492,'↕',20,'#fff',900,'middle');
  var xs=[73,351,462,572,682,789,929];
  for(var i=0;i<12;i++){
   var top=519+i*50.5;var item=valid?rows[i]:null;
   var gold=i===0&&!!item;
   var color=gold?'url(#kz-goldRow)':i===1||i===2?'#0b425b':i%2===0?'#082d45':'#06273c';
   src+=rect(25,top,975,50.5,0,color)+line(24,top+50.5,1000,top+50.5,gold?'#e6bb70':'#29617d',1.0);
   xs.forEach(function(x){src+=line(x,top,x,top+50.5,gold?'#d1aa6e':'#2c7390',1.0);});
   if(gold)src+=rect(24,top,976,50.5,4,'none','#ffdb76',2.2);
   src+=txt(49,top+32,String(i+1),18,'#fff',800,'middle');
   if(!item)continue;
   src+=txt(84,top+21,cut(item.name,30),item.name.length>25?12:item.name.length>19?14:16,'#fff',900);
   src+=txt(85,top+40,item.code,11,'#b9d1df',500);
   src+=txt(409,top+32,percent(item.mobil),15,'#fff',500,'middle');
   src+=txt(517,top+32,percent(item.dsl),15,'#fff',500,'middle');
   src+=txt(627,top+32,percent(item.iptv),15,'#fff',500,'middle');
   src+=txt(736,top+32,percent(item.uydu),15,'#fff',500,'middle','textLength="'+Math.min(92,Math.max(35,percent(item.uydu).length*9))+'" lengthAdjust="spacingAndGlyphs"');
   src+=txt(859,top+33,num(item.score),23,gold?'#ffe69a':i<=2?'#a2fff5':'#66f9ed',900,'middle');
   var trend=item.change==null?'–':item.change>0?'↑'+item.change:item.change<0?'↓'+Math.abs(item.change):'→';
   src+=txt(964,top+32,trend,16,item.change>0?'#8effdd':item.change<0?'#ff9a9d':'#dcf7fb',800,'middle');
  }
  src+=line(38,1144,986,1144,'#11bdcd',1,.68);
  src+=award(24,'cup',pack&&pack.final?'ZİRVE ŞAMPİYONU':'GÜNCEL LİDER',leader?leader.name:'Rapor bekleniyor',
   leader?leader.code+' · '+num(leader.score)+' PUAN':'15 KASIM BAZI BEKLENİYOR',true);
  src+=award(523,'mountain',pursuer?'EN YAKIN TAKİPÇİ':'HEDEF: ZİRVE',
   pursuer?pursuer.name:'TÜM BAYİLER YARIŞTA',
   pursuer?pursuer.code+' · '+num(pursuer.score)+' PUAN':'ELEME YOK · 30 KASIM',false);
  src+=rect(24,1366,976,109,14,'#082e45','#34c5e3',1.2)+
   ico('cross',77,1418,'#65fff4')+
   line(111,1387,111,1454,'#30baca',1)+
   txt(129,1404,'ELEME YOK · 12 BAYİ 30 KASIM’A KADAR YARIŞTA',20,'#edfdff',900)+
   txt(129,1436,'Puan: %40 Mobil + %40 DSL + %10 IPTV + %10 Uydu TV',17,'#d2faff',700)+
   txt(129,1462,'15 Kasım kapanışı baz alınır · Her üründe %200 HGO tavanı',15,'#b4dfee',500)+
   '</svg>';
  return src;
 }
 window.kzPremiumImageSvg=imageSvg;
})();