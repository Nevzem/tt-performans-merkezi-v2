/* Şampiyonlar Ligi premium SVG görünümü. Ekran ve PNG aynı 1024×1536 kaynağı gösterir. */
(function(){
const E=v=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
function T(x,y,t,sz=17,fill='#fff',weight=700,anchor='start',extra=''){
 return '<text x="'+x+'" y="'+y+'" font-family="Arial,Helvetica,sans-serif" font-size="'+sz+
 '" font-weight="'+weight+'" fill="'+fill+'" text-anchor="'+anchor+'" '+extra+'>'+E(t)+'</text>';
}
function R(x,y,w,h,r,fill,stroke='',sw=1.5,more=''){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+fill+'"'+(stroke?' stroke="'+stroke+'" stroke-width="'+sw+'"':'')+' '+more+'/>';}
function L(x,y,x2,y2,color='#29819e',width=1,opacity=1){return '<path d="M'+x+' '+y+'L'+x2+' '+y2+'" fill="none" stroke="'+color+'" stroke-width="'+width+'" opacity="'+opacity+'"/>';}
function medallion(x,y){return '<g transform="translate('+x+' '+y+')" fill="none" stroke="#ffdfa3" stroke-width="2.5" stroke-linejoin="round">'+
 '<circle cy="5" r="20" fill="url(#gold)"/><path d="M-20 -31L-6 -11M20 -31L6 -11M-7 -29V-14M7 -29V-14" stroke="#34f4ff" stroke-width="6"/>'+
 '<path d="M0 -7L5 0L14 1L8 7L10 16L0 11L-10 16L-8 7L-14 1L-5 0Z" fill="#fff2b6"/></g>';}
function cup(x,y,z=1){return '<g transform="translate('+x+' '+y+') scale('+z+')" stroke="#ffe795" stroke-width="2.3" stroke-linejoin="round" fill="none">'+
 '<path d="M-17 -15H17L13 4Q9 13 0 14Q-9 13 -13 4Z" fill="url(#gold)"/>'+
 '<path d="M-17 -10H-25Q-25 7 -11 7M17 -10H25Q25 7 11 7"/>'+
 '<path d="M0 14V25M-13 31H13" stroke-width="4"/></g>';}
function icon(k,x,y){
 let inside='';
 if(k==='users')inside='<circle cx="0" cy="-10" r="6"/><circle cx="-14" cy="-4" r="4"/><circle cx="14" cy="-4" r="4"/><path d="M-11 14V8Q-11 1 0 1Q11 1 11 8V14M-23 14V10Q-23 3 -15 3M23 14V10Q23 3 15 3"/>';
 if(k==='next')inside='<path d="M-17 -13L0 0L-17 13ZM1 -13L18 0L1 13Z"/>';
 if(k==='cross')inside='<circle r="18"/><path d="M-8 -8L8 8M8 -8L-8 8"/>';
 if(k==='mobile')inside='<rect x="-10" y="-18" width="20" height="36" rx="3"/><path d="M-4 -14H4M-1 13H1"/>';
 if(k==='dsl')inside='<path d="M-17 -13Q0 -28 17 -13M-11 -6Q0 -17 11 -6M-4 0Q0 -4 4 0"/><rect x="-21" y="6" width="42" height="16" rx="4"/><path d="M8 15H12M16 15H17"/>';
 if(k==='tv')inside='<rect x="-23" y="-17" width="46" height="29" rx="2"/><path d="M0 12V20M-12 20H12"/>';
 return '<g transform="translate('+x+' '+y+')" fill="none" stroke="'+(k==='cross'?'#ff839a':'#8cf8ff')+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'+inside+'</g>';
}
function laurel(x,y,flip=1){
 let o='<g transform="translate('+x+' '+y+') scale('+flip+' 1)" stroke="#ffd672" fill="url(#gold)">';
 [[-4,19,-48],[-13,11,-37],[-20,1,-25],[-23,-11,-16],[-21,-23,0],[-15,-34,11],[-6,-41,20]].forEach(a=>{
 o+='<ellipse cx="'+a[0]+'" cy="'+a[1]+'" rx="3.8" ry="10" transform="rotate('+a[2]+' '+a[0]+' '+a[1]+')"/>';});
 return o+'</g>';
}
const nfmt=v=>v==null||!Number.isFinite(v)?'—':Number(v).toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1});
const pfmt=v=>v==null?'—':'%'+nfmt(v);
const short=(v,n=28)=>{v=String(v||'');return v.length>n?v.slice(0,n-1)+'…':v;};
function headStat(x,w,color,n,label,ico){
 let fill=color==='cyan'?'url(#statBlue)':color==='mint'?'url(#statMint)':color==='pink'?'url(#statPink)':'url(#statGold)';
 let border=color==='cyan'?'#11d9fe':color==='mint'?'#0ee8d9':color==='pink'?'#ff5b82':'#ffdc79';
 return R(x,245,w,101,17,fill,border,2)+
 (ico==='cup'?cup(x+53,285,.95):icon(ico,x+48,285))+
 L(x+86,264,x+86,305,border,1.4)+T(x+150,297,n,43,'#fff',900,'middle')+
 T(x+w/2+37,325,label,14,'#f7ffff',700,'middle');
}
function weight(x,w,kind,label){
 let active=kind==='dsl';
 return R(x,363,w,68,15,active?'url(#weightTeal)':'url(#weightBlue)',active?'#42fef2':'#1ddcf5',2)+
 icon(kind,x+70,396)+T(x+w/2+39,408,label,25,'#fff',900,'middle');
}
function leaderBox(x,award,name,points,goldBox){
 let edge=goldBox?'#ffe07d':'#16e5f1';
 let out=R(x,1166,478,167,18,goldBox?'url(#awardGold)':'url(#awardBlue)',edge,2.4);
 out+=goldBox?cup(x+78,1245,1.5):medallion(x+79,1251);
 out+=L(x+124,1204,x+124,1294,edge,1.3,.8);
 out+=T(x+299,1215,award,22,goldBox?'#ffe28c':'#4bf9fc',900,'middle');
 out+=T(x+299,1265,short(name,25),name.length>22?23:31,'#fff',900,'middle');
 out+=T(x+299,1304,points,18,goldBox?'#ffe18d':'#55fff9',900,'middle');
 return out;
}
function lgPremiumSvg(rows,stage,pack,closed,awards,saved){
 const first=stage===LEAGUE_STAGES[0];
 const date=pack&&pack.date?Number(pack.date.slice(-2))+' Kasım':'Rapor bekleniyor';
 const base=saved&&saved[lgDate(15)]&&saved[lgDate(15)].dealers||{};
 let list=rows&&rows.length?rows:first?LEAGUE_CODES.map(c=>({code:c,name:base[c]?base[c].name:'Bayi verisi bekleniyor',mobil:null,dsl:null,tv:null,score:null,change:null})):[];
 let leader=rows&&rows.length?rows[0]:null;
 let general=awards&&awards.final&&awards.performance?awards.performance:awards&&awards.leader;
 let svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536" role="img" aria-label="Şampiyonlar Ligi günlük performans takip tablosu">',
 '<defs>',
 '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#011829"/><stop offset=".45" stop-color="#072b49"/><stop offset=".75" stop-color="#001829"/><stop offset="1" stop-color="#071e32"/></linearGradient>',
 '<radialGradient id="halo" cx=".5" cy=".16" r=".8"><stop stop-color="#076a99" stop-opacity=".27"/><stop offset="1" stop-color="#001527" stop-opacity="0"/></radialGradient>',
 '<linearGradient id="gold" x1="0" x2="1"><stop stop-color="#a77825"/><stop offset=".23" stop-color="#ffed9c"/><stop offset=".5" stop-color="#c69224"/><stop offset=".8" stop-color="#ffec96"/><stop offset="1" stop-color="#b67b1f"/></linearGradient>',
 '<linearGradient id="title" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#001b30"/><stop offset=".52" stop-color="#0b4e68"/><stop offset="1" stop-color="#001a2d"/></linearGradient>',
 '<linearGradient id="statBlue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#074e73"/><stop offset="1" stop-color="#061e34"/></linearGradient>',
 '<linearGradient id="statMint" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#006b74"/><stop offset="1" stop-color="#092c3b"/></linearGradient>',
 '<linearGradient id="statPink" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#49243d"/><stop offset="1" stop-color="#112137"/></linearGradient>',
 '<linearGradient id="statGold" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#6a5a34"/><stop offset="1" stop-color="#12303e"/></linearGradient>',
 '<linearGradient id="weightBlue" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#063a58"/><stop offset="1" stop-color="#0b385b"/></linearGradient>',
 '<linearGradient id="weightTeal" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#078b92"/><stop offset="1" stop-color="#08a8a5"/></linearGradient>',
 '<linearGradient id="goldRow" x1="0" x2="1" y1="0" y2=".5"><stop stop-color="#67501f"/><stop offset=".55" stop-color="#44311d"/><stop offset="1" stop-color="#755922"/></linearGradient>',
 '<linearGradient id="riskRow" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#521c2b"/><stop offset="1" stop-color="#391226"/></linearGradient>',
 '<linearGradient id="awardGold" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#665024"/><stop offset=".55" stop-color="#1c2228"/><stop offset="1" stop-color="#6a4e24"/></linearGradient>',
 '<linearGradient id="awardBlue" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#073751"/><stop offset=".5" stop-color="#042137"/><stop offset="1" stop-color="#054965"/></linearGradient>',
 '<filter id="neon" x="-50%" y="-60%" width="200%" height="220%"><feGaussianBlur stdDeviation="5"/></filter>',
 '<filter id="spark" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.2"/></filter>',
 '</defs>',
 R(0,0,1024,1536,0,'url(#bg)'),R(0,0,1024,1536,0,'url(#halo)'),
 '<path d="M362 0H463L350 110H259Z" fill="#1282ab" opacity=".22"/>',
 L(456,0,351,105,'#04c3f2',2,.75),
 '<path d="M823 1536L1024 1330V1390L880 1536Z" fill="#14b6e9" opacity=".25"/>',
 L(801,1536,1024,1339,'#06dfff',2,.6),
 L(35,23,35,57,'#48f9ff',5),
 T(57,51,'TÜRK TELEKOM',29,'#fff',900),
 cup(669,39,.9),T(697,51,'ŞAMPİYONLAR LİGİ',30,'#ffda80',900),
 R(30,81,964,95,22,'url(#title)','#15f9ff',5,'filter="url(#neon)"'),
 R(30,81,964,95,22,'url(#title)','#11e9f2',2.4),
 laurel(117,127,1),laurel(907,127,-1),
 T(512,146,'GÜNLÜK PERFORMANS TAKİBİ',45,'#fff',900,'middle'),
 T(31,216,stage.title+' · '+stage.start+'–'+stage.end+' Kasım 2026',21,'#fff',800),
 T(994,216,'Güncelleme: '+date,21,'#fff',800,'end'),
 L(353,214,661,214,'#277a99',1,.55),
 headStat(24,236,'cyan',stage.n,'BAYİ YARIŞIYOR','users'),
 headStat(264,241,'mint',stage.advance,'TUR ATLAYACAK','next'),
 headStat(518,233,'pink',stage.n-stage.advance,'ELENECEK','cross'),
 headStat(764,236,'gold','30','KASIM FİNAL','cup'),
 weight(24,316,'mobile','%30 MOBİL'),
 weight(354,316,'dsl','%50 DSL'),
 weight(685,315,'tv','%20 TV'),
 R(24,452,976,682,10,'#032136','#267a9d',1.5),
 R(24,452,976,59,10,'#06334f','#2b8db2',1.4),
 T(59,486,'#',17,'#fff',900,'middle'),
 T(237,486,'BAYİ / KOD',17,'#fff',900,'middle'),
 T(455,476,'MOBİL',16,'#fff',900,'middle'),T(455,495,'HGO',16,'#fff',900,'middle'),
 T(597,476,'DSL',16,'#fff',900,'middle'),T(597,495,'HGO',16,'#fff',900,'middle'),
 T(741,476,'TV',16,'#fff',900,'middle'),T(741,495,'HGO',16,'#fff',900,'middle'),
 T(884,476,'LİG',16,'#fff',900,'middle'),T(884,495,'PUANI',16,'#fff',900,'middle'),
 T(979,486,'↕',21,'#fff',900,'middle')].join('');
 const colX=[91,382,526,668,812,957];
 for(let i=0;i<11;i++){
  let r=list[i],y=i<8?511+i*51.5:973+(i-8)*54,h=i<8?51.5:54,flag=i===0&&r&&r.score!=null,risk=first&&i>=8;
  svg+=R(25,y,975,h,0,flag?'url(#goldRow)':risk?'url(#riskRow)':i%2===0?'#072b43':'#05263d');
  svg+=L(24,y+h,1000,y+h,flag?'#e2b756':risk?'#ad556f':'#286787',1.1);
  colX.forEach(x=>svg+=L(x,y,x,y+h,flag?'#c29f61':risk?'#8f4e64':'#26728e',1));
  if(flag){svg+=R(24,y,976,h,4,'none','#ffd87a',5,'filter="url(#spark)"')+R(24,y,976,h,4,'none','#ffe17c',2);}
  svg+=T(59,y+33,i+1,19,'#fff',800,'middle');
  if(r){
   let name=short(r.name,29),font=name.length>24?14:name.length>19?16:18;
   svg+=T(113,y+23,name,font,'#fff',900)+T(114,y+42,r.code||'—',12,'#bbd4e0',500);
  }
  svg+=T(455,y+33,r?pfmt(r.mobil):'—',17,'#fff',500,'middle')+
       T(597,y+33,r?pfmt(r.dsl):'—',17,'#fff',500,'middle')+
       T(741,y+33,r?pfmt(r.tv):'—',17,'#fff',500,'middle')+
       T(884,y+34,r?nfmt(r.score):'—',24,flag?'#ffe18c':risk?'#ffa0ae':'#64fff4',900,'middle')+
       T(979,y+33,r&&r.change!=null?(r.change>0?'↑'+r.change:r.change<0?'↓'+Math.abs(r.change):'→'):'–',19,'#fff',800,'middle');
 }
 svg+=R(24,923,976,50,0,first?'#067d96':'#0b3854');
 if(first){
  svg+=L(30,946,268,946,'#10eeed',2,.5)+L(748,946,994,946,'#10eeed',2,.5);
  svg+=T(512,955,'ELEME ÇİZGİSİ – İLK 8 DEVAM EDER',21,'#fff',900,'middle');
 }else svg+=T(512,955,'BU TURDA '+stage.n+' BAYİ YARIŞIYOR · '+stage.advance+' BAYİ TUR ATLAYACAK',19,'#fff',900,'middle');
 svg+=leaderBox(24,closed&&stage.advance===1?'LİG ŞAMPİYONU':'TUR LİDERİ',
  leader?leader.name:'Rapor bekleniyor','LİG PUANI: '+(leader?nfmt(leader.score):'—'),true);
 svg+=leaderBox(522,awards&&awards.final?'PERFORMANS ŞAMPİYONU':'GENEL PUAN LİDERİ',
  general?general.name:'Rapor bekleniyor',general?'16–30 KASIM · '+nfmt(general.score)+' PUAN'+(awards&&awards.final?'':' (GEÇİCİ)'):'16–30 KASIM · VERİ BEKLENİYOR',false);
 svg+=R(24,1370,976,100,13,'#052940','#41b9dc',1.3);
 svg+='<g transform="translate(74 1419)" stroke="#8df7ff" fill="none" stroke-width="3"><circle r="18"/><path d="M0 -5V11M0 -12V-9"/></g>';
 svg+=L(110,1391,110,1451,'#2dabc5',1);
 svg+=T(130,1405,'HGO: Turun hedef gerçekleşme oranı · Puan: %30 Mobil + %50 DSL + %20 TV (ürün başına %200 tavan).',17,'#e4f6ff',500);
 svg+=T(130,1443,'15 Kasım öncesindeki aktivasyonlar puana dahil değildir. Her tur sıfırlanır.',17,'#ecf6fc',500);
 return svg+'</svg>';
}
window.leaguePremiumSvg=lgPremiumSvg;
})();