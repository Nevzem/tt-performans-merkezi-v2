/* ORIGINAL APPROVED 1024x1536 IMAGE + live metrics.
 * Keeps the approved original JPEG as the source artwork and repaints only dynamic
 * text regions with clean gradients; no old lettering or stretch artifacts.
 * Screen/PNG: same HTMLCanvasElement. No second export template.
 */
(function(){
var lgOriginalImageCache=null,lgOriginalImagePromise=null;
function lgReferenceImage(){
 if(lgOriginalImagePromise)return lgOriginalImagePromise;
 lgOriginalImagePromise=new Promise(function(resolve,reject){
  var image=new Image();
  image.onload=function(){if(image.naturalWidth===1024&&image.naturalHeight===1536){lgOriginalImageCache=image;resolve(image);}
   else reject(Error('Orijinal görsel 1024×1536 ölçülerinde yüklenemedi.'));};
  image.onerror=function(){reject(Error('Kampanya referans görseli yüklenemedi.'))};
  image.src='assets/champions-league-approved-reference.jpg';
 });
 return lgOriginalImagePromise;
}
function lgLiveDrawText(ctx,str,x,y,font,color,align,maxWidth){
 ctx.font=font||'700 17px Arial';ctx.fillStyle=color||'#fff';ctx.textAlign=align||'left';ctx.textBaseline='alphabetic';
 ctx.shadowColor='transparent';ctx.shadowBlur=0;
 if(maxWidth)ctx.fillText(String(str),x,y,maxWidth);else ctx.fillText(String(str),x,y);
}
function lgLivePercent(v){return v==null||!Number.isFinite(v)?'—':'%'+Number(v).toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1});}
function lgLiveNum(v){return v==null||!Number.isFinite(v)?'—':Number(v).toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1});}
/* CLEAN TEXT PLATES: never stretch a slice of the reference photograph.
 * A stretched slice causes the visible streaks and duplicated lettering.
 * Keep all decorative outlines, glowing borders, icons, row borders from the original.
 * Fill ONLY the bounded text areas with smooth gradients. */
function lgPlate(ctx,x,y,w,h,colors,vertical){
 var g=ctx.createLinearGradient(x,y,vertical?x:x+w,vertical?y+h:y);
 if(colors.length===2){g.addColorStop(0,colors[0]);g.addColorStop(1,colors[1]);}
 else{g.addColorStop(0,colors[0]);g.addColorStop(.5,colors[1]);g.addColorStop(1,colors[2]);}
 ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
}
function lgRowPlate(ctx,top,height,index,first){
 var gold=first&&index===0,red=first&&index>=8,odd=index%2;
 var colors=gold?['#3a2915','#6d4c1f','#4c3419']:
  red?['#4a1727','#4b1828','#3b1222']:
  odd?['#06273d','#062a42','#05263d']:['#072b44','#082a40','#05283f'];
 var y=top+2,h=height-4;
 // Whole row is replaced in ONE paint pass. This removes original sample texts
 // AND leaves no stretching artefacts or patch seams across cells.
 lgPlate(ctx,93,y,905,h,colors,false);
 var strokes=gold?'rgba(234,192,92,.72)':red?'rgba(158,65,95,.80)':'rgba(47,112,144,.82)';
 ctx.beginPath();[382,526,668,812,957].forEach(function(x){ctx.moveTo(x,y);ctx.lineTo(x,y+h);});
 ctx.strokeStyle=strokes;ctx.lineWidth=1;ctx.stroke();
 if(gold){
  ctx.save();ctx.shadowBlur=7;ctx.shadowColor='rgba(255,201,73,.85)';
  ctx.strokeStyle='#ffdf79';ctx.lineWidth=1.6;
  ctx.strokeRect(24,top+.8,976,height-1.5);ctx.restore();
 }
}
function lgPanelTextPlate(ctx,gold){
 // Gold or cyan CONTENT ONLY. Do not overpaint neon card outlines, medals or gold corner motif.
 if(gold){lgPlate(ctx,174,1224,321,85,['#1c211f','#252926','#343122'],false);}
 else{lgPlate(ctx,681,1224,312,85,['#062b43','#05263d','#073a52'],false);}
}
function lgTitleTextPlate(ctx,gold){
 if(gold)lgPlate(ctx,173,1185,321,39,['#1a221f','#232924','#2e2a21'],false);
 else lgPlate(ctx,686,1186,307,38,['#062c44','#062940','#07384e'],false);
}
function lgSmallStatPlate(ctx,x,y,w,h,colorA,colorB){lgPlate(ctx,x,y,w,h,[colorA,colorB],false);}
function lgDatePlate(ctx,left){
 if(left)lgPlate(ctx,29,191,333,34,['#021a2d','#02223a'],false);
 else lgPlate(ctx,760,191,239,36,['#021f34','#02233c'],false);
}
function lgLiveBoard(ctx,img,rows,stage,pack,closed,awards,saved){
 var first=stage===LEAGUE_STAGES[0];
 var baseline=(saved&&saved[lgDate(15)]&&saved[lgDate(15)].dealers)||{};
 var shown=rows&&rows.length?rows:(first?LEAGUE_CODES.map(function(code){var d=baseline[code];
  return {code:code,name:d?d.name:'Veri bekleniyor',mobil:null,dsl:null,tv:null,score:null,change:null};}):[]);
 // Original JPEG is always the sole background layer.
 ctx.clearRect(0,0,1024,1536);ctx.drawImage(img,0,0,1024,1536);
 ctx.save();
 // Campaign phase and report date, placed exactly on the photo's existing labels.
 var phase=stage.title+' · '+stage.start+'–'+stage.end+' Kasım 2026';
 var date=pack&&pack.date?String(Number(pack.date.slice(-2)))+' Kasım':'Rapor bekleniyor';
 if(!first || phase!=='İlk Eleme · 16–19 Kasım 2026'){
  lgDatePlate(ctx,true);
  lgLiveDrawText(ctx,phase,30,216,'700 22px Arial','#f5f9ff','left',340);
 }
 if(date!=='17 Kasım'){
  lgDatePlate(ctx,false);
  lgLiveDrawText(ctx,'Güncelleme: '+date,993,216,'700 22px Arial','#f5f9ff','right',245);
 }
 if(!first){
  // Counts: preserve glass panels, borders and icons, update number only.
  [[142,253,77,62,stage.n,187,'#043752','#0a4058'],
    [368,253,80,62,stage.advance,409,'#07575b','#073e4a'],
    [606,253,75,62,stage.n-stage.advance,646,'#322739','#292538']].forEach(function(a){
    lgSmallStatPlate(ctx,a[0],a[1],a[2],a[3],a[6],a[7]);
    lgLiveDrawText(ctx,a[4],a[5],298,'900 43px Arial','#fff','center');
  });
 }
 // Grid x coordinates match the approved 1024×1536 photograph.
 for(var i=0;i<11;i++){
  var top=i<8?511+i*51.5:973+(i-8)*54;
  var h=i<8?51.5:54;
  var r=shown[i]||null;
  lgRowPlate(ctx,top,h,i,first);
  if(!r)continue;
  var firstLine=r.name||'Veri bekleniyor';
  var fontSize=firstLine.length>27?13:firstLine.length>21?14:firstLine.length>16?15:17;
  lgLiveDrawText(ctx,firstLine,113,top+23,'900 '+fontSize+'px Arial','#fff','left',264);
  lgLiveDrawText(ctx,r.code||'—',114,top+42,'400 12px Arial','#b8cbd7','left');
  lgLiveDrawText(ctx,lgLivePercent(r.mobil),455,top+33,'400 17px Arial','#f6faff','center',136);
  lgLiveDrawText(ctx,lgLivePercent(r.dsl),597,top+33,'400 17px Arial','#f6faff','center',135);
  lgLiveDrawText(ctx,lgLivePercent(r.tv),741,top+33,'400 17px Arial','#f6faff','center',137);
  var red=first&&i>=8,firstRank=i===0&&r.score!=null;
  lgLiveDrawText(ctx,lgLiveNum(r.score),884,top+35,'900 25px Arial',firstRank?'#ffe08a':red?'#fba0ae':'#65fff1','center',131);
  var delta=r.change==null?'–':r.change>0?'↑'+r.change:r.change<0?'↓'+Math.abs(r.change):'→';
  lgLiveDrawText(ctx,delta,978,top+34,'700 18px Arial','#f8fdff','center',36);
 }
 // Bottom award panels: replace names & metrics; preserve gold/blue borders, medals, glow.
 var leader=rows&&rows.length?rows[0]:null;
 var award=awards&&awards.final&&awards.performance?awards.performance:awards&&awards.leader;
 // Clear each dynamic text zone ONCE, using clean gradient plates rather than
 // stretching pixels containing the old letters; this fixes the screenshot ghosting.
 lgPanelTextPlate(ctx,true);
 lgPanelTextPlate(ctx,false);
 lgLiveDrawText(ctx,leader?leader.name:'Rapor bekleniyor',333,1262,'900 30px Arial','#fff','center',302);
 lgLiveDrawText(ctx,'LİG PUANI: '+(leader?lgLiveNum(leader.score):'—'),333,1301,'900 23px Arial','#ffe28b','center',303);
 lgLiveDrawText(ctx,award?award.name:'Rapor bekleniyor',827,1262,'900 29px Arial','#fff','center',309);
 var generalText=award?'16–30 KASIM · '+lgLiveNum(award.score)+' PUAN'+(awards&&awards.final?'':' (GEÇİCİ)'):'16–30 KASIM · VERİ BEKLENİYOR';
 lgLiveDrawText(ctx,generalText,829,1301,'900 19px Arial','#48f5f2','center',321);
 // If a round is final, winner labels need to be accurate instead of the static example.
 if(closed&&stage.advance===1){
  lgTitleTextPlate(ctx,true);
  lgLiveDrawText(ctx,'LİG ŞAMPİYONU',333,1213,'900 22px Arial','#ffdb83','center',303);
 }
 if(awards&&awards.final){
  lgTitleTextPlate(ctx,false);
  lgLiveDrawText(ctx,'PERFORMANS ŞAMPİYONU',827,1214,'900 21px Arial','#59f5ef','center',305);
 }
 ctx.restore();
}
function leagueDrawApprovedPhoto(rows,stage,pack,closed,awards,saved){
 var canvas=document.getElementById('lg-poster-canvas');
 if(!canvas)return;
 canvas.width=1024;canvas.height=1536;
 var ctx=canvas.getContext('2d');
 if(!ctx)return;
 var paint=lgReferenceImage().then(function(img){
  if(document.getElementById('lg-poster-canvas')!==canvas)return;
  lgLiveBoard(ctx,img,rows,stage,pack,closed,awards,saved);
  canvas.setAttribute('data-ready','1');
 }).catch(function(error){
  console.error('[Champions League photo template]',error);
  if(document.getElementById('lg-poster-canvas')!==canvas)return;
  ctx.fillStyle='#041d35';ctx.fillRect(0,0,1024,1536);
  ctx.font='700 28px Arial';ctx.fillStyle='#fff';ctx.fillText('Referans görseli yüklenemedi.',65,130);
  canvas.setAttribute('data-ready','0');
 });
 window.lgPosterPaintPromise=paint;
 return paint;
}
window.leagueDrawApprovedPhoto=leagueDrawApprovedPhoto;
window.leagueApprovedImageLoaded=lgReferenceImage;
})();