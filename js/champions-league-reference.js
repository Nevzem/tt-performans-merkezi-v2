/* ORIGINAL APPROVED 1024x1536 IMAGE + live metrics.
 * Does NOT redraw the reference design. Paints the attached original JPEG pixel-for-pixel,
 * then replaces only text/content regions with the latest real dealer values.
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
/* Replace reference text while retaining each original cell's background gradient.
 * Uses a blank 8px strip from the SAME row in the source photo. Cell borders stay intact. */
function lgPatchFromSource(ctx,img,x1,x2,top,h,sourceX){
 var y=top+3,height=h-6,w=x2-x1-3;
 if(w<=0||height<=0)return;
 ctx.drawImage(img,sourceX,y,7,height,x1+2,y,w,height);
}
function lgLiveMaskArea(ctx,img,x,y,w,h,srcX){
 ctx.drawImage(img,srcX,y,7,h,x,y,w,h);
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
  lgLiveMaskArea(ctx,img,30,191,336,36,370);
  lgLiveDrawText(ctx,phase,30,216,'700 22px Arial','#f5f9ff','left',340);
 }
 if(date!=='17 Kasım'){
  lgLiveMaskArea(ctx,img,761,191,241,37,745);
  lgLiveDrawText(ctx,'Güncelleme: '+date,993,216,'700 22px Arial','#f5f9ff','right',245);
 }
 if(!first){
  // Counts: preserve glass panels, borders and icons, update number only.
  [[140,254,79,61,stage.n,187],[365,254,83,61,stage.advance,409],[602,254,78,61,stage.n-stage.advance,646]].forEach(function(a){
   lgLiveMaskArea(ctx,img,a[0],a[1],a[2],a[3],a[0]-11);
   lgLiveDrawText(ctx,a[4],a[5],298,'900 43px Arial','#fff','center');
  });
 }
 // Actual source photograph's grid is aligned: x 91,382,526,668,812,957,1000.
 var cols=[[93,380,98],[384,524,392],[528,666,536],[670,810,679],[814,955,821],[959,999,962]];
 for(var i=0;i<11;i++){
  var top=i<8?511+i*51.5:973+(i-8)*54;
  var h=i<8?51.5:54;
  var r=shown[i]||null;
  cols.forEach(function(c){lgPatchFromSource(ctx,img,c[0],c[1],top,h,c[2]);});
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
 // Centre left card x 180..470 and right card x 690..985.
 [[174,1228,321,45,153],[170,1272,321,48,151],[682,1228,311,45,667],[664,1272,328,48,665]].forEach(function(a){
  lgLiveMaskArea(ctx,img,a[0],a[1],a[2],a[3],a[4]);
 });
 lgLiveDrawText(ctx,leader?leader.name:'Rapor bekleniyor',333,1262,'900 30px Arial','#fff','center',302);
 lgLiveDrawText(ctx,'LİG PUANI: '+(leader?lgLiveNum(leader.score):'—'),333,1301,'900 23px Arial','#ffe28b','center',303);
 lgLiveDrawText(ctx,award?award.name:'Rapor bekleniyor',827,1262,'900 29px Arial','#fff','center',309);
 var generalText=award?'16–30 KASIM · '+lgLiveNum(award.score)+' PUAN'+(awards&&awards.final?'':' (GEÇİCİ)'):'16–30 KASIM · VERİ BEKLENİYOR';
 lgLiveDrawText(ctx,generalText,829,1301,'900 19px Arial','#48f5f2','center',321);
 // If a round is final, winner labels need to be accurate instead of the static example.
 if(closed&&stage.advance===1){
  lgLiveMaskArea(ctx,img,182,1179,304,45,162);
  lgLiveDrawText(ctx,'LİG ŞAMPİYONU',333,1213,'900 22px Arial','#ffdb83','center',303);
 }
 if(awards&&awards.final){
  lgLiveMaskArea(ctx,img,694,1180,294,43,667);
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
 lgReferenceImage().then(function(img){
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
}
window.leagueDrawApprovedPhoto=leagueDrawApprovedPhoto;
window.leagueApprovedImageLoaded=lgReferenceImage;
})();