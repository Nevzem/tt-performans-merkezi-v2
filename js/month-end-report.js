/* Ay Sonu Bayi Performans Karnesi - ürünler asla birbirine toplanmaz. */
var MER_PRODUCTS=[
 {label:'Faturalı',key:'Postpaid',hist:'postpaid',color:'#f20a7a'},
 {label:'Faturasız',key:'Prepaid',hist:'prepaid',color:'#16c7ee'},
 {label:'DSL',key:'DSL',hist:'dsl',color:'#53d769'},
 {label:'IPTV',key:'IPTV',hist:'iptv',color:'#a65ae8'},
 {label:'Uydu TV',key:'Uydu',hist:'uydu',color:'#ff851b'},
 {label:'Cihaz',key:'Akıllı Cihaz',hist:'cihaz',color:'#ffd21e'}
];
var merDealerCode=null;
function merN(v){return v==null?'—':Math.round(v).toLocaleString('tr-TR')}
function merP(v){return v==null?'—':'%'+Number(v).toFixed(v%1?1:0).replace('.',',')}
function merPeriod(){var d=(typeof DONEM!=='undefined'&&DONEM)||'';return d||new Date().toLocaleDateString('tr-TR',{month:'long',year:'numeric'}).toLocaleUpperCase('tr-TR')}
function merCodes(){return Object.keys((typeof DETAY!=='undefined'&&DETAY.bayiler)||{}).sort(function(a,b){return DETAY.bayiler[a].b.localeCompare(DETAY.bayiler[b].b,'tr')})}
function merHistoryValue(code,pm,period){
 var doc=typeof HIST2_DATA!=='undefined'?HIST2_DATA[period]:null;if(!doc||!doc.dealers)return null;
 var d=doc.dealers.find(function(x){return String(x.bayiKodu)===String(code)});if(!d)return null;
 var x=d[pm.hist];if(!x&&pm.hist==='cihaz')x=d.cihaz;return x||null;
}
function merSeries(code,pm){
 var out=[];if(typeof HIST2_DATA!=='undefined')Object.keys(HIST2_DATA).sort().forEach(function(period){if(period.slice(0,4)!=='2026')return;var x=merHistoryValue(code,pm,period);if(x)out.push({period:period,a:x.adet||0,h:x.hedef||0})});return out.slice(-8);
}
function merStats(code,pm,current){
 var series=merSeries(code,pm),a=current?current.a:0,h=current?current.h:0,g=h?a/h*100:null;
 var days=(typeof SYDATA!=='undefined'&&SYDATA.calisilanGun)||30;
 var ytdA=series.length?series.reduce(function(s,x){return s+x.a},0):null;
 var p=series.length?merHistoryValue(code,pm,String(Number(series[series.length-1].period.slice(0,4))-1)+series[series.length-1].period.slice(4)):null;
 var yoy=p&&p.adet?((a-p.adet)/p.adet*100):null;
 return {a:a,h:h,g:g,daily:a/days,ytd:ytdA,yoy:yoy,series:series};
}
function merSpark(stats,color){
 var s=stats.series.length?stats.series.map(function(x){return x.a}):[stats.a];while(s.length<8)s.unshift(null);
 var nums=s.filter(function(v){return v!=null});var max=Math.max.apply(null,nums.concat([stats.h,1])),min=Math.min.apply(null,nums.concat([stats.h]));var span=max-min||1;
 var pts=s.map(function(v,i){return v==null?null:[i*250/7,68-(v-min)/span*55]}).filter(Boolean);
 var line=pts.map(function(p){return p.join(',')}).join(' ');var ty=68-(stats.h-min)/span*55;
 return '<svg viewBox="0 0 250 78" preserveAspectRatio="none"><line x1="0" y1="'+ty+'" x2="250" y2="'+ty+'" stroke="'+color+'" stroke-dasharray="4 3" opacity=".9"/><polyline points="'+line+'" fill="none" stroke="'+color+'" stroke-width="3"/>'+pts.map(function(p){return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3" fill="'+color+'"/>'}).join('')+'</svg>';
}
function merProductData(dealer){return MER_PRODUCTS.map(function(pm){return Object.assign({},pm,{stats:merStats(dealer.kod,pm,dealer.prods[pm.key])})})}
function merTrendCard(p){var s=p.stats,up=s.yoy==null?null:s.yoy>=0;return '<div class="mer-trend"><div class="mer-trend-h" style="color:'+p.color+'"><b>'+p.label+'</b><b>Güncel '+merN(s.a)+'</b></div><div class="mer-chart">'+merSpark(s,p.color)+'</div><div class="mer-trend-side"><span class="mer-target" style="color:'+p.color+'">Hedef '+merN(s.h)+'</span><span class="mer-ring" style="color:'+p.color+'">'+merP(s.g)+'</span><span class="mer-yoy" style="color:'+(up===false?'#ff4d62':'#53d769')+'">YoY '+(s.yoy==null?'veri yok':(up?'+':'')+merP(s.yoy))+'</span></div></div>'}
function merTable(products){var h=['Ürün','Hedef','Gerçekleşen','Performans','Günlük Ort.','YTD','YoY'];var html=h.map(function(x){return '<div class="mer-th">'+x+'</div>'}).join('');products.forEach(function(p){var s=p.stats;[p.label,merN(s.h),merN(s.a),merP(s.g),s.daily.toFixed(1).replace('.',','),merN(s.ytd),s.yoy==null?'Veri yok':(s.yoy>=0?'+':'')+merP(s.yoy)].forEach(function(v,i){html+='<div class="mer-td '+(i===0?'prod ':'')+(i===3?'perf':'')+'" style="'+(i===0||i===3?'color:'+p.color:'')+'">'+v+'</div>'})});return html}
function merBars(products){var max=Math.max.apply(null,products.map(function(p){return p.stats.ytd||0}).concat([1]));return products.map(function(p){var s=p.stats,y=s.ytd||0,prev=s.yoy==null?null:y/(1+s.yoy/100);return '<div class="mer-bar-group"><div class="mer-bar" style="height:'+((prev||0)/max*118)+'px;background:#16c7ee"></div><div class="mer-bar" style="height:'+(y/max*118)+'px;background:#f20a7a"></div><span class="mer-bar-name">'+p.label+'</span><span class="mer-bar-yoy" style="color:'+(s.yoy!=null&&s.yoy<0?'#ff4d62':'#53d769')+'">'+(s.yoy==null?'—':(s.yoy>=0?'+':'')+merP(s.yoy))+'</span></div>'}).join('')}
async function exportMonthEndPNG(){
 var el=document.getElementById('month-end-report');if(!el)return;
 var host=null;
 try{
  await ensureH2C();
  host=document.createElement('div');host.className='mer-export-host';
  var clone=el.cloneNode(true);clone.removeAttribute('id');clone.classList.add('mer-export-canvas');
  host.appendChild(clone);document.body.appendChild(host);
  if(document.fonts&&document.fonts.ready)await document.fonts.ready;
  await new Promise(function(resolve){requestAnimationFrame(function(){requestAnimationFrame(resolve)})});
  var cv=await html2canvas(clone,{scale:1,backgroundColor:'#061528',useCORS:true,logging:false,width:1536,height:1024,windowWidth:1536,windowHeight:1024,scrollX:0,scrollY:0});
  _openSharePreview(cv.toDataURL('image/png'),'TT_AySonu_'+merDealerCode+'_'+String(merPeriod()).replace(/[^0-9A-Za-zÇĞİÖŞÜçğıöşü]/g,'')+'.png');
 }catch(e){alert('Görsel oluşturma hatası: '+e.message)}finally{if(host&&host.parentNode)host.parentNode.removeChild(host)}
}
function renderMonthEndReport(){
 var cards=document.getElementById('cards');cards.className='cards single';cards.style.maxWidth='none';var codes=merCodes();if(!codes.length){cards.innerHTML='<div class="mer-empty">Bayi verisi bulunamadı. Güncel Excel raporunu yükleyin.</div>';return}
 if(!merDealerCode||!DETAY.bayiler[merDealerCode])merDealerCode=codes[0];var d=DETAY.bayiler[merDealerCode],ps=merProductData(d),over=ps.filter(function(p){return p.stats.g>=100}),best=ps.slice().sort(function(a,b){return(b.stats.g||0)-(a.stats.g||0)})[0],ybest=ps.filter(function(p){return p.stats.yoy!=null}).sort(function(a,b){return b.stats.yoy-a.stats.yoy})[0];var ratio=(d.prods.DSL&&d.prods.DSL.a)?(d.prods.IPTV.a/d.prods.DSL.a*100):null;
 var options=codes.map(function(k){var x=DETAY.bayiler[k];return '<option value="'+k+'" '+(k===merDealerCode?'selected':'')+'>'+x.b+' · '+x.il+' · '+k+'</option>'}).join('');
 var sig=[['RAPOR KAPSAMI','6 ÜRÜN','Ayrı analiz','#f20a7a','▦'],['HEDEF ÜSTÜ',over.length+' / 6 ÜRÜN',over.map(function(x){return x.label}).join(' • ')||'Henüz yok','#16c7ee','◎'],['EN GÜÇLÜ ÜRÜN',best.label+' '+merP(best.stats.g),'Ay kapanışı','#a65ae8','★'],['EN YÜKSEK YOY',ybest?ybest.label+' +'+merP(ybest.stats.yoy):'Veri bekleniyor','Yıllık değişim','#53d769','↗'],['IPTV • DSL',merP(ratio),'Dönüşüm oranı','#ff851b','◉']];
 cards.innerHTML='<div class="mer-toolbar"><span class="mer-print-note">Ürün adetleri birbirine eklenmez.</span><select onchange="merDealerCode=this.value;renderMonthEndReport()">'+options+'</select><button onclick="window.print()">PDF Kaydet</button><button onclick="downloadCardPNG()">PNG Paylaş</button></div><div class="mer-scroll"><section class="mer-report" id="month-end-report"><header class="mer-head"><div><h1>AY SONU BAYİ PERFORMANS KARNESİ</h1><p>'+merPeriod()+' • GERÇEK VERİ</p></div><i class="mer-divider"></i><div class="mer-dealer">'+d.b+'</div><div class="mer-draft">YATIRIMCI RAPORU</div></header><div class="mer-signals">'+sig.map(function(x){return '<div class="mer-signal"><i class="mer-signal-icon" style="color:'+x[3]+'">'+x[4]+'</i><div><small>'+x[0]+'</small><strong>'+x[1]+'</strong><span>'+x[2]+'</span></div></div>'}).join('')+'</div><div class="mer-main"><div class="mer-panel"><h2 class="mer-title">ÜRÜN BAZLI TRENDLER</h2><div class="mer-trends">'+ps.map(merTrendCard).join('')+'</div></div><div class="mer-panel"><h2 class="mer-title">ÜRÜN BAZLI PERFORMANS</h2><div class="mer-table">'+merTable(ps)+'</div></div></div><div class="mer-bottom"><div class="mer-panel"><h2 class="mer-title">YTD / YOY KARŞILAŞTIRMA <span class="mer-legend"><b style="color:#16c7ee">■</b> Önceki yıl &nbsp; <b style="color:#f20a7a">■</b> Güncel YTD</span></h2><div class="mer-bars">'+merBars(ps)+'</div></div><div class="mer-panel"><h2 class="mer-title">IPTV / DSL ORANI</h2><div class="mer-ratio"><div class="mer-big-ring"><b>'+merP(ratio)+'</b></div><div class="mer-ratio-list"><div style="color:#a65ae8">Bayi '+merP(ratio)+'</div><div style="color:#53d769">Bölge '+(MATRIX&&MATRIX.kuzey?merP(MATRIX.kuzey.ipdsl):'—')+'</div><div style="color:#16c7ee">Anadolu '+(MATRIX&&MATRIX.anadolu?merP(MATRIX.anadolu.ipdsl):'—')+'</div></div></div><div class="mer-ratio-note">Her 100 DSL satışının kaçının IPTV ile eşleştiğini gösterir.</div></div><div class="mer-panel"><h2 class="mer-title">YATIRIMCI İÇGÖRÜLERİ</h2><div class="mer-insights"><div class="mer-insight"><span class="mer-tag" style="background:#53d769">GÜÇLÜ</span><div><b>'+best.label+' ayın en güçlü ürünü</b><small>'+merP(best.stats.g)+' performans</small></div></div><div class="mer-insight"><span class="mer-tag" style="background:#a65ae8">FIRSAT</span><div><b>IPTV / DSL dönüşümü '+merP(ratio)+'</b><small>Bölge '+(MATRIX&&MATRIX.kuzey?merP(MATRIX.kuzey.ipdsl):'—')+' seviyesinde</small></div></div><div class="mer-insight"><span class="mer-tag" style="background:#ff851b">AKSİYON</span><div><b>'+ps.slice().sort(function(a,b){return(a.stats.g||0)-(b.stats.g||0)})[0].label+' gelişim alanı</b><small>Ürün bazlı aksiyon planı gerekli</small></div></div></div></div></div></section></div>';
 var toolbarButtons=cards.querySelectorAll('.mer-toolbar button');
 if(toolbarButtons.length>1)toolbarButtons[0].remove();
 toolbarButtons=cards.querySelectorAll('.mer-toolbar button');
 if(toolbarButtons[0])toolbarButtons[0].textContent='Yüksek Kalite PNG Paylaş';
 if(typeof loadAllHistory==='function'&&!HIST2_LOADED&&!HIST2_LOADING)loadAllHistory().then(renderMonthEndReport);
}
