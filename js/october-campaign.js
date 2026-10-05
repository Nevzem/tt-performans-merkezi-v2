/* October 2026: fixed branch groups, actual quantities only, no projections. */
var OC_PERIOD = '2026-10';
var OC_GROUPS = [
  [['4100089','Kılavuzlar','Kırıkkale'],['4052718','Asis','Samsun'],['4100781','Asis','Çorum'],['4054927','Eymen','Çankırı'],['4036313','Bakan Telekom','Tokat']],
  [['4100729','Primetech','Samsun'],['4100778','Primetech','Tokat'],['4100760','Öztürk','Kırşehir'],['4057503','Öztürk','Kırşehir'],['4100676','Primetech','Samsun']],
  [['7000045','Gül Telekom','Çorum'],['7100063','Primetech','Samsun'],['4100641','Asis','Sinop'],['500733','Bıyıkoğlu','Samsun'],['4100785','Bakan Telekom','Amasya'],['4100784','Bakan Telekom','Amasya']],
  [['502046','İlk İletişim','Samsun'],['4100776','Yağmuroğlu','Tokat'],['4100087','Kılavuzlar','Kırıkkale'],['4100343','Yağmuroğlu','Tokat'],['501699','Taş-Ka','Yozgat'],['4100170','Asis','Samsun'],['4100990','Primetech','Samsun']]
];
var OC_RULES = [
  {key:'Toplam Mobil',label:'Mobil',points:5}, {key:'DSL',label:'DSL',points:6},
  {key:'IPTV',label:'IPTV',points:4}, {key:'Uydu',label:'Uydu',points:3},
  {key:'Akıllı Cihaz',label:'Akıllı cihaz',points:2}, {key:'Diğer Cihaz',label:'Diğer cihaz',points:2},
  {key:'mobil',label:'Mobil taahhüt',points:1,commitment:true},
  {key:'dsl',label:'DSL taahhüt',points:3,commitment:true}
];
var ocResizeObserver = null;
function ocEsc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function ocNumber(v) { return v == null ? '—' : Number(v).toLocaleString('tr-TR'); }
function ocPeriod(v) { var m=String(v||'').match(/^(\d{4})[/-]?(\d{2})$/); return m ? m[1]+'-'+m[2] : null; }
function ocValidDate(v) { return /^2026-10-\d{2}$/.test(v||'') && Number(v.slice(8))>=1 && Number(v.slice(8))<=31; }
function ocQuantity(v) { return typeof v==='number' && Number.isFinite(v) && v>=0 && Number.isInteger(v) ? v : null; }
function ocActual(dealer,key) {
  if (!dealer) return null;
  // Uploaded workbooks retain raw coverage; blanks must not become zero.
  var data=dealer.campaignActuals;
  if (data) {
    if(key==='Toplam Mobil') {
      var p=ocQuantity(data.Postpaid),q=ocQuantity(data.Prepaid);
      return p==null || q==null ? null : p+q;
    }
    return ocQuantity(data[key]);
  }
  var prods=dealer.prods||{};
  if(key==='Toplam Mobil') {
    var post=ocQuantity((prods.Postpaid||{}).a),pre=ocQuantity((prods.Prepaid||{}).a);
    if(post!=null && pre!=null) return post+pre;
  }
  return ocQuantity((prods[key]||{}).a);
}
function ocScore(dealer) {
  var missing=[],total=0,breakdown=[];
  OC_RULES.forEach(function(rule){
    var quantity=rule.commitment ? ocQuantity((dealer && dealer.commitments||{})[rule.key]) : ocActual(dealer,rule.key);
    if(quantity==null) missing.push(rule.label); else total+=quantity*rule.points;
    breakdown.push({label:rule.label,quantity:quantity,points:rule.points});
  });
  return {total:missing.length ? null : total,missing:missing,breakdown:breakdown};
}
function ocGroups(source,period) {
  var valid=source && ocPeriod(source.period||period)===OC_PERIOD;
  return OC_GROUPS.map(function(group){
    var rows=group.map(function(d,index){
      var score=ocScore(valid ? (source.bayiler||{})[d[0]] : null);
      return {code:d[0],name:d[1],city:d[2],index:index,total:score.total,missing:score.missing,breakdown:score.breakdown,rank:null};
    });
    rows.sort(function(a,b){return (a.total==null)-(b.total==null) || (b.total||0)-(a.total||0) || a.index-b.index;});
    var last=null,rank=null;
    rows.forEach(function(row,index){if(row.total!=null){if(last!==row.total)rank=index+1;row.rank=rank;last=row.total;}});
    return rows;
  });
}
function ocComparable(current,previous,period) {
  if(!current || !previous || ocPeriod(current.period||period)!==OC_PERIOD || ocPeriod(previous.period)!==OC_PERIOD) return false;
  if(!ocValidDate(current.reportDate) || !ocValidDate(previous.reportDate)) return false;
  return Date.parse(current.reportDate+'T00:00:00Z')-Date.parse(previous.reportDate+'T00:00:00Z')===86400000;
}
function ocModel(current,previous,period) {
  var groups=ocGroups(current,period),compare=ocComparable(current,previous,period),old=compare ? ocGroups(previous,previous.period) : [];
  var best=[];
  groups.forEach(function(rows,gi){
    var prev={};(old[gi]||[]).forEach(function(r){prev[r.code]=r;});
    // Rank movement requires the full same group on both days.
    var complete=rows.every(function(r){return r.total!=null;}) && (old[gi]||[]).length===rows.length && old[gi].every(function(r){return r.total!=null;});
    rows.forEach(function(r){
      var p=prev[r.code];r.delta=compare && r.total!=null && p && p.total!=null ? r.total-p.total : null;
      r.movement=complete ? p.rank-r.rank : null;
      if(r.delta>0) best.push(r);
    });
  });
  var fullComparison=compare && groups.flat().every(function(r){return r.delta!=null;});
  var max=best.length ? Math.max.apply(null,best.map(function(r){return r.delta;})) : null;
  return {groups:groups,compare:compare,fullComparison:fullComparison,best:fullComparison ? best.filter(function(r){return r.delta===max;}) : [],valid:!!current && ocPeriod(current.period||period)===OC_PERIOD};
}
function ocSigned(n) { return n==null ? '—' : (n>0?'+':'')+ocNumber(n); }
function ocRow(r) {
  var title=r.total==null ? 'Eksik veri: '+r.missing.join(', ') : r.breakdown.map(function(b){return b.label+': '+b.quantity+' × '+b.points;}).join(' · ');
  var movement=r.movement==null ? '—' : r.movement===0 ? '━' : (r.movement>0?'↑ ':'↓ ')+Math.abs(r.movement);
  var tone=function(n){return n==null||n===0?'oc-neutral':n>0?'oc-up':'oc-down';};
  return '<tr class="'+(r.rank===1?'oc-leader':'')+'" title="'+ocEsc(title)+'"><td>'+ocNumber(r.rank)+'</td><td>'+ocEsc(r.code)+'</td><td class="oc-dealer"><strong>'+ocEsc(r.name)+'</strong><small>'+ocEsc(r.city)+'</small></td><td class="oc-score">'+ocNumber(r.total)+'</td><td class="'+tone(r.delta)+'">'+ocSigned(r.delta)+'</td><td class="'+tone(r.movement)+'">'+movement+'</td></tr>';
}
function ocDateLabel(v) { return ocValidDate(v) ? new Date(v+'T12:00:00Z').toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'}) : '1–31 Ekim 2026'; }
function ocSetDate(previous,value) {
  var source=previous ? (typeof PREV_DETAY!=='undefined'?PREV_DETAY:null) : (typeof DETAY!=='undefined'?DETAY:null);
  if(source && ocPeriod(source.period||(previous?null:DONEM))===OC_PERIOD) source.reportDate=ocValidDate(value)?value:null;
  renderOctoberCampaign();
}
function ocFitCard() {
  var wrap=document.getElementById('oc-preview'),card=document.getElementById('october-campaign-card');
  if(!wrap || !card)return;
  var scale=Math.min(1,wrap.clientWidth/1024);
  card.style.transform='scale('+scale+')';wrap.style.height=(ocCardHeight(card)*scale)+'px';
}
// Two-line dealer names make table rows taller than their CSS minimum.
// Measure natural content for both the preview and exported image.
function ocCardHeight(card) { return Math.ceil(Math.max(1536,card.offsetHeight||0,card.scrollHeight||0)); }
function renderOctoberCampaign() {
  var cards=document.getElementById('cards');if(!cards)return;
  var current=typeof DETAY!=='undefined'?DETAY:null,previous=typeof PREV_DETAY!=='undefined'?PREV_DETAY:null,period=typeof DONEM!=='undefined'?DONEM:null;
  var model=ocModel(current,previous,period),missing=model.groups.flat().filter(function(r){return r.total==null;}).length;
  var date=current && current.reportDate,label=ocDateLabel(date);
  var status=!model.valid ? 'Ekim 2026 TTM raporunu Ayarlar’dan yükleyin.' : missing ? missing+' bayi için veri eksik. Eksik ürünler satır açıklamasında gösterilir.' : '23 bayinin Ekim puanları hesaplandı.';
  var compareHint=model.compare ? 'Son 24 saat: '+ocDateLabel(previous.reportDate)+' → '+label : 'Son 24 saat için ardışık iki Ekim raporu ve rapor tarihleri gerekli.';
  var best=model.best.length ? model.best.slice(0,2).map(function(r){return ocEsc(r.code)+' · '+ocEsc(r.name)+' ('+ocEsc(r.city)+') · <em>'+ocSigned(r.delta)+' puan</em>';}).join('<br>')+(model.best.length>2 ? '<br>+'+(model.best.length-2)+' bayi aynı artışı paylaşıyor.' : '') : model.fullComparison ? 'Pozitif artış kaydedilmedi.' : model.compare ? 'Eksik karşılaştırma verisi var.' : 'Karşılaştırma raporu bekleniyor.';
  cards.className='cards single oc-page';cards.style.maxWidth='1120px';
  cards.innerHTML='<div class="oc-actions"><div><b>Ekim Kampanyası · Günlük takip</b><small>'+ocEsc(status)+'</small><small>'+ocEsc(compareHint)+'</small></div><button id="oc-download" onclick="downloadOctoberCampaignPNG()">Görseli indir / paylaş</button></div>'+
    '<div class="oc-dates"><label>Güncel rapor tarihi<input type="date" min="2026-10-01" max="2026-10-31" value="'+ocEsc(ocValidDate(date)?date:'')+'" onchange="ocSetDate(false,this.value)"></label><label>Önceki rapor tarihi<input type="date" min="2026-10-01" max="2026-10-31" value="'+ocEsc(previous && ocValidDate(previous.reportDate)?previous.reportDate:'')+'" onchange="ocSetDate(true,this.value)"></label><small>Dosyaların kapsadığı son günü seçin. Eşit puanlar aynı sırayı paylaşır; “—” eksik veri veya karşılaştırma olmadığını gösterir.</small></div>'+
    '<div id="oc-preview" class="oc-preview"><section id="october-campaign-card" class="oc-card" aria-label="Ekim 2026 TTM günlük puan tablosu">'+
    '<header class="oc-hero"><span class="oc-region">KUZEY ANADOLU</span><h1>EKİM 2026</h1><h2>TTM GÜNLÜK PUAN TABLOSU</h2><div class="oc-date">▦ '+ocEsc(label)+'</div><p>'+(!model.valid?'Ekim raporu bekleniyor':!ocValidDate(date)?'Ekim birikimli puanlar · Rapor tarihi seçin':'1–'+Number(date.slice(8))+' Ekim birikimli puanlar')+'</p></header>'+
    '<main class="oc-tables">'+model.groups.map(function(rows,i){return '<section class="oc-group oc-group-'+(i+1)+'"><div class="oc-group-title"><b><span>❯❯</span> '+(i+1)+'. GRUP</b><strong>'+rows.length+' BAYİ</strong></div><table><colgroup><col class="oc-col-rank"><col class="oc-col-code"><col class="oc-col-dealer"><col class="oc-col-score"><col class="oc-col-delta"><col class="oc-col-move"></colgroup><thead><tr><th>Sıra</th><th>Bayi kodu</th><th>Bayi</th><th>Toplam puan</th><th>Son 24 saat</th><th>Sıra değişimi</th></tr></thead><tbody>'+rows.map(ocRow).join('')+'</tbody></table></section>';}).join('')+'</main>'+
    '<footer class="oc-footer"><div class="oc-best"><b>Günün en yüksek puan artışı</b><div>'+best+'</div></div><div class="oc-legend"><p><span class="oc-up">↑</span> Yükseldi <span class="oc-down">↓</span> Geriledi <span>━</span> Sırası aynı</p><small>Sıra değişimi, önceki güne göre grup içindeki değişimi gösterir.</small><div class="oc-weights">Adet başına: Mobil 5 · DSL 6 · IPTV 4 · Uydu 3<br>Akıllı cihaz 2 · Diğer cihaz 2 · Mobil taahhüt 1 · DSL taahhüt 3</div></div></footer></section></div>';
  if(ocResizeObserver)ocResizeObserver.disconnect();
  if(typeof ResizeObserver!=='undefined'){ocResizeObserver=new ResizeObserver(ocFitCard);ocResizeObserver.observe(document.getElementById('oc-preview'));}
  ocFitCard();
}
async function downloadOctoberCampaignPNG() {
  var button=document.getElementById('oc-download'),wrapper=null;
  try {
    if(button){button.disabled=true;button.textContent='Görsel hazırlanıyor…';}
    if(document.fonts && document.fonts.ready)await document.fonts.ready;
    var image=new Image();image.src='assets/october-campaign-reference.png';await image.decode();
    var result=await createCleanExportClone(document.getElementById('october-campaign-card'),1024);wrapper=result.wrapper;
    result.clone.style.width='1024px';result.clone.style.height='auto';result.clone.style.overflow='visible';result.clone.style.background='#fff';
    var height=ocCardHeight(result.clone);
    result.wrapper.style.height=height+'px';
    var canvas=await captureExportImage(result.clone,{scale:3,width:1024,height:height,backgroundColor:'#fff'});
    _openSharePreview(canvas.toDataURL('image/png'),'TT_Ekim_Kampanyasi_2026.png');
  } catch(error) { alert('Görsel oluşturulamadı: '+error.message); }
  finally {cleanupExportClone(wrapper);if(button){button.disabled=false;button.textContent='Görseli indir / paylaş';}}
}
