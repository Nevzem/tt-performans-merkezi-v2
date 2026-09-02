/* ════════════════════════════════════════════════════════════════════
   Gelişim Merkezi V2 — ürün bazlı bayi gelişim yönetimi
   Her görünüm yalnız seçilen ürünü analiz eder; ortak aylık veri
   history-loader.js üzerinden gelir.
   ════════════════════════════════════════════════════════════════════ */
var DEV_BAYI = null;
var DEV_PERIOD = null;
var DEV_PRODUCT = 'mobil';
var DEV_RANGE = 'ytd';

var DEV_MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
var DEV_SHORT = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
var DEV_PRODUCTS = [
  {key:'mobil', label:'Mobil', icon:'▯', color:'#1473E6', soft:'#EAF3FF'},
  {key:'dsl', label:'DSL', icon:'◉', color:'#7037D3', soft:'#F2EDFF'},
  {key:'tv', label:'Tivibu', icon:'▣', color:'#F06A27', soft:'#FFF1E8'},
  {key:'cihaz', label:'Cihaz', icon:'▱', color:'#12A887', soft:'#E8F8F4'}
];

function devPeriods() {
  return Object.keys(HIST2_DATA || {}).filter(function(p) { return !!HIST2_DATA[p]; }).sort();
}
function devDealers() {
  var periods = devPeriods();
  if (!periods.length) return [];
  return (HIST2_DATA[periods[periods.length - 1]].dealers || []).slice().sort(function(a,b) {
    return (a.bayiAdi || '').localeCompare(b.bayiAdi || '', 'tr');
  });
}
function devDealer(period, code) {
  var doc = HIST2_DATA[period];
  if (!doc) return null;
  return (doc.dealers || []).find(function(d) { return String(d.bayiKodu) === String(code); }) || null;
}
function devProduct() {
  return DEV_PRODUCTS.find(function(p) { return p.key === DEV_PRODUCT; }) || DEV_PRODUCTS[0];
}
function devAddMonths(period, delta) {
  var y = +period.slice(0,4), m = +period.slice(5) - 1 + delta;
  y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
  return y + '-' + String(m + 1).padStart(2, '0');
}
function devValue(period, code, key) {
  var d = devDealer(period, code), p = d && d[key];
  return p ? {adet:+p.adet || 0, hedef:+p.hedef || 0, hgo:p.hgo == null ? null : +p.hgo, forecast:p.forecast == null ? null : +p.forecast} : null;
}
function devTrHgo(period, key) {
  var doc = HIST2_DATA[period], tr = doc && doc.benchmarks && doc.benchmarks.tr;
  var value = tr && tr[key] && tr[key].hgo;
  return value == null || !isFinite(+value) ? null : +value;
}
function devYtd(code, period, key) {
  var year = period.slice(0,4), maxMonth = +period.slice(5), out = {adet:0, hedef:0, months:0};
  devPeriods().forEach(function(p) {
    if (p.slice(0,4) !== year || +p.slice(5) > maxMonth) return;
    var v = devValue(p, code, key); if (!v) return;
    out.adet += v.adet; out.hedef += v.hedef; out.months++;
  });
  out.hgo = out.hedef ? out.adet / out.hedef * 100 : null;
  return out;
}
function devPct(curr, prev) { return prev ? (curr - prev) / prev * 100 : null; }
function devFmt(n) { return Math.round(n || 0).toLocaleString('tr-TR'); }
function devSigned(n) { return (n >= 0 ? '+' : '') + devFmt(n); }
function devPctText(n) { return n == null || !isFinite(n) ? '—' : (n >= 0 ? '+' : '−') + '%' + Math.abs(n).toFixed(1).replace('.', ','); }
function devTone(n) { return n > 0 ? 'up' : n < 0 ? 'down' : 'flat'; }
function devStatus(hgo, yoy) {
  if ((hgo != null && hgo >= 100) && (yoy == null || yoy >= 0)) return {label:'Güçlü', cls:'strong'};
  if ((hgo != null && hgo < 85) || (yoy != null && yoy <= -10)) return {label:'Riskli', cls:'risk'};
  return {label:'Dengeli', cls:'balanced'};
}
function devEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

function devSetBayi(v) { DEV_BAYI = String(v); renderDevelopment(); }
function devSetPeriod(v) { DEV_PERIOD = v; renderDevelopment(); }
function devSetProduct(v) { DEV_PRODUCT = v; renderDevelopment(); }
function devSetRange(v) { DEV_RANGE = v; renderDevelopment(); }

function devTopFilters(dealers, periods) {
  var dealerOpts = dealers.map(function(d) {
    return '<option value="' + d.bayiKodu + '" ' + (String(d.bayiKodu) === String(DEV_BAYI) ? 'selected' : '') + '>' + devEsc(d.bayiAdi) + ' · ' + d.bayiKodu + '</option>';
  }).join('');
  var periodOpts = periods.slice().reverse().map(function(p) {
    return '<option value="' + p + '" ' + (p === DEV_PERIOD ? 'selected' : '') + '>' + p.slice(0,4) + ' ' + DEV_MONTHS[+p.slice(5)-1] + '</option>';
  }).join('');
  return '<div class="dv-filters">' +
    '<label><span>BAYİ</span><select onchange="devSetBayi(this.value)">' + dealerOpts + '</select></label>' +
    '<label><span>DÖNEM</span><select onchange="devSetPeriod(this.value)">' + periodOpts + '</select></label>' +
  '</div>';
}

function devOverviewCards() {
  return '<div class="dv-overview">' + DEV_PRODUCTS.map(function(p) {
    var curr = devYtd(DEV_BAYI, DEV_PERIOD, p.key);
    var prev = devYtd(DEV_BAYI, devAddMonths(DEV_PERIOD,-12), p.key);
    var month = devValue(DEV_PERIOD, DEV_BAYI, p.key) || {};
    var yoy = devPct(curr.adet, prev.adet), status = devStatus(month.hgo, yoy), trHgo = devTrHgo(DEV_PERIOD, p.key);
    return '<button class="dv-product-card ' + (DEV_PRODUCT === p.key ? 'selected' : '') + '" style="--p:' + p.color + ';--ps:' + p.soft + '" onclick="devSetProduct(\'' + p.key + '\')">' +
      '<div class="dv-pc-top"><span class="dv-pc-icon">' + p.icon + '</span><strong>' + p.label + '</strong><i class="' + status.cls + '">' + status.label + '</i></div>' +
      '<div class="dv-pc-value">' + devFmt(curr.adet) + '<small> YTD</small></div>' +
      '<div class="dv-pc-foot"><span class="' + devTone(yoy) + '">' + devPctText(yoy) + ' YoY</span><span>HGO ' + (month.hgo == null ? '—' : '%' + month.hgo.toFixed(1).replace('.',',')) + '</span><span class="dv-tr-rate ' + (trHgo == null ? 'flat' : devTone(trHgo - 100)) + '">TR ' + (trHgo == null ? '—' : '%' + trHgo.toFixed(1).replace('.',',')) + '</span><span>Fc ' + (month.forecast == null ? '—' : '%' + month.forecast.toFixed(0)) + '</span></div>' +
    '</button>';
  }).join('') + '</div>';
}

function devRangeTabs() {
  var tabs = [{k:'ytd',l:'YTD'},{k:'yoy',l:'YoY'},{k:'6m',l:'Son 6 Ay'},{k:'12m',l:'Son 12 Ay'},{k:'month',l:'Aylık'}];
  return '<div class="dv-range">' + tabs.map(function(t) { return '<button class="' + (DEV_RANGE === t.k ? 'on' : '') + '" onclick="devSetRange(\'' + t.k + '\')">' + t.l + '</button>'; }).join('') + '</div>';
}

function devHealthHero(info) {
  var p = devProduct(), curr = devYtd(DEV_BAYI, DEV_PERIOD, p.key), prev = devYtd(DEV_BAYI, devAddMonths(DEV_PERIOD,-12), p.key), trHgo = devTrHgo(DEV_PERIOD, p.key);
  var month = devValue(DEV_PERIOD, DEV_BAYI, p.key) || {}, diff = curr.adet - prev.adet, yoy = devPct(curr.adet, prev.adet), remaining = Math.max(0, curr.hedef - curr.adet), status = devStatus(month.hgo, yoy);
  return '<section class="dv-hero" style="--p:' + p.color + ';--ps:' + p.soft + '">' +
    '<div class="dv-hero-head"><div><span class="dv-hero-icon">' + p.icon + '</span><div><small>' + devEsc(info.bayiKodu) + ' · ' + devEsc(info.il || '') + '</small><h2>' + p.label + ' Gelişimi</h2></div></div><b class="' + status.cls + '">' + status.label + '</b></div>' +
    '<div class="dv-hero-main"><div><small>YTD ÜRETİM</small><strong>' + devFmt(curr.adet) + '</strong><span>adet</span></div><div class="dv-hero-change"><small>GEÇEN YIL ' + devFmt(prev.adet) + '</small><b class="' + devTone(diff) + '">' + devSigned(diff) + ' adet</b><span class="' + devTone(yoy) + '">' + devPctText(yoy) + '</span></div></div>' +
    '<div class="dv-hero-metrics"><div><span>HGO</span><b>' + (month.hgo == null ? '—' : '%' + month.hgo.toFixed(1).replace('.',',')) + '</b><small class="' + (trHgo == null ? 'flat' : devTone(trHgo - 100)) + '">TR ' + (trHgo == null ? '—' : '%' + trHgo.toFixed(1).replace('.',',')) + '</small></div><div><span>Forecast</span><b>' + (month.forecast == null ? '—' : '%' + month.forecast.toFixed(0)) + '</b></div><div><span>YTD Hedef</span><b>' + devFmt(curr.hedef) + '</b></div><div><span>Hedefe Kalan</span><b>' + devFmt(remaining) + '</b></div></div>' +
  '</section>';
}

function devChartPeriods() {
  var count = DEV_RANGE === '6m' ? 6 : DEV_RANGE === 'month' ? 1 : DEV_RANGE === 'ytd' || DEV_RANGE === 'yoy' ? +DEV_PERIOD.slice(5) : 12;
  var periods = [];
  if (DEV_RANGE === 'ytd' || DEV_RANGE === 'yoy') {
    for (var m=1; m<=count; m++) periods.push(DEV_PERIOD.slice(0,4) + '-' + String(m).padStart(2,'0'));
  } else {
    for (var i=count-1; i>=0; i--) periods.push(devAddMonths(DEV_PERIOD,-i));
  }
  return periods;
}
function devChart() {
  var p = devProduct(), periods = devChartPeriods(), rows = periods.map(function(period) {
    var c = devValue(period, DEV_BAYI, p.key), o = devValue(devAddMonths(period,-12), DEV_BAYI, p.key);
    return {period:period, curr:c ? c.adet : null, prev:o ? o.adet : null, target:c ? c.hedef : null};
  });
  var vals=[]; rows.forEach(function(r){['curr','prev','target'].forEach(function(k){if(r[k]!=null)vals.push(r[k]);});});
  var max=Math.max.apply(null,vals.concat([1])), w=340, left=24, right=330, top=18, bottom=126;
  function point(v,i){return{x:left+i*(right-left)/Math.max(rows.length-1,1),y:bottom-(v/max)*(bottom-top)};}
  function poly(key){return rows.map(function(r,i){if(r[key]==null)return null;var q=point(r[key],i);return q.x.toFixed(1)+','+q.y.toFixed(1);}).filter(Boolean).join(' ');}
  var labels=rows.map(function(r,i){var q=point(0,i);return '<text x="'+q.x+'" y="146" text-anchor="middle">'+DEV_SHORT[+r.period.slice(5)-1]+'</text>';}).join('');
  var dots=rows.map(function(r,i){if(r.curr==null)return'';var q=point(r.curr,i);return'<circle cx="'+q.x+'" cy="'+q.y+'" r="3"/><text class="value" x="'+q.x+'" y="'+(q.y-7)+'" text-anchor="middle">'+r.curr+'</text>';}).join('');
  return '<section class="dv-panel dv-chart-panel" style="--p:' + p.color + '"><div class="dv-panel-head"><div><h3>' + p.label + ' Adetsel Gelişim</h3><p>' + DEV_RANGE.toUpperCase() + ' · gerçekleşen, geçen yıl ve hedef</p></div></div>' +
    '<div class="dv-legend"><span><i class="current"></i>Bu dönem</span><span><i class="previous"></i>Geçen yıl</span><span><i class="target"></i>Hedef</span></div>' +
    '<svg class="dv-chart" viewBox="0 0 '+w+' 154" preserveAspectRatio="none"><g class="grid"><line x1="'+left+'" y1="18" x2="'+right+'" y2="18"/><line x1="'+left+'" y1="72" x2="'+right+'" y2="72"/><line x1="'+left+'" y1="126" x2="'+right+'" y2="126"/></g><polyline class="previous" points="'+poly('prev')+'"/><polyline class="target" points="'+poly('target')+'"/><polyline class="current" points="'+poly('curr')+'"/><g class="dots">'+dots+'</g><g class="labels">'+labels+'</g></svg></section>';
}

function devQuickMetrics() {
  var p=devProduct(), periods=devChartPeriods(), vals=periods.map(function(period){var v=devValue(period,DEV_BAYI,p.key);return{period:period,value:v?v.adet:0};});
  var valid=vals.filter(function(x){return x.value>0;}), best=valid.slice().sort(function(a,b){return b.value-a.value;})[0], weak=valid.slice().sort(function(a,b){return a.value-b.value;})[0];
  var last3=valid.slice(-3), trend=last3.length>1?devPct(last3[last3.length-1].value,last3[0].value):null;
  var ytd=devYtd(DEV_BAYI,DEV_PERIOD,p.key), remaining=Math.max(0,ytd.hedef-ytd.adet);
  function card(icon,label,value,sub,cls){return'<div class="dv-quick"><i>'+icon+'</i><span>'+label+'</span><b class="'+(cls||'')+'">'+value+'</b><small>'+sub+'</small></div>';}
  return '<div class="dv-quick-grid">'+
    card('↗','En güçlü ay',best?DEV_MONTHS[+best.period.slice(5)-1]:'—',best?devFmt(best.value)+' adet':'veri yok','up')+
    card('↘','En zayıf ay',weak?DEV_MONTHS[+weak.period.slice(5)-1]:'—',weak?devFmt(weak.value)+' adet':'veri yok','down')+
    card('≋','Son 3 ay',devPctText(trend),'üretim eğilimi',devTone(trend||0))+
    card('◎','Hedefe kalan',devFmt(remaining),'YTD adet','')+
  '</div>';
}

function devPeerComparison() {
  var p=devProduct(), doc=HIST2_DATA[DEV_PERIOD], list=(doc&&doc.dealers||[]).map(function(d){var x=d[p.key];return{name:d.bayiAdi,code:d.bayiKodu,value:x?+x.adet||0:0,hgo:x&&x.hgo!=null?+x.hgo:null};}).sort(function(a,b){return b.value-a.value;});
  var idx=list.findIndex(function(x){return String(x.code)===String(DEV_BAYI);}), current=idx>=0?list[idx]:{value:0}, leader=list[0]||{value:0,name:'—'}, avg=list.length?list.reduce(function(s,x){return s+x.value;},0)/list.length:0;
  var ratio=leader.value?Math.min(100,current.value/leader.value*100):0;
  return '<section class="dv-panel dv-peer"><div class="dv-panel-head"><div><h3>Bölge Karşılaştırması</h3><p>' + DEV_MONTHS[+DEV_PERIOD.slice(5)-1] + ' · ' + p.label + '</p></div><b>'+(idx>=0?idx+1:'—')+'. sıra</b></div>'+
    '<div class="dv-peer-scale"><div style="width:'+ratio.toFixed(1)+'%"></div></div><div class="dv-peer-values"><div><span>Seçili bayi</span><b>'+devFmt(current.value)+'</b></div><div><span>Bölge ort.</span><b>'+devFmt(avg)+'</b></div><div><span>Lider</span><b>'+devFmt(leader.value)+'</b><small>'+devEsc(leader.name)+'</small></div><div><span>Lidere fark</span><b class="down">−'+devFmt(Math.max(0,leader.value-current.value))+'</b></div></div></section>';
}

function devManagerSummary(info) {
  var p=devProduct(), curr=devYtd(DEV_BAYI,DEV_PERIOD,p.key), prev=devYtd(DEV_BAYI,devAddMonths(DEV_PERIOD,-12),p.key), month=devValue(DEV_PERIOD,DEV_BAYI,p.key)||{};
  var diff=curr.adet-prev.adet,yoy=devPct(curr.adet,prev.adet),remaining=Math.max(0,curr.hedef-curr.adet),status=devStatus(month.hgo,yoy);
  var text='<b>'+devEsc(info.bayiAdi)+'</b> '+p.label+' üretiminde geçen yılın aynı dönemine göre <strong class="'+devTone(diff)+'">'+devSigned(diff)+' adet ('+devPctText(yoy)+')</strong> değişim göstermiştir. ';
  if(status.cls==='strong')text+='Mevcut HGO ve gelişim yönü güçlü seviyededir.';
  else if(status.cls==='risk')text+='Mevcut sonuçlar müdahale gerektiren risk seviyesindedir.';
  else text+='Performans dengeli görünmekle birlikte yakın takip edilmelidir.';
  return '<section class="dv-manager" style="--p:'+p.color+'"><div class="dv-manager-icon">✦</div><div><h3>Yönetici Özeti</h3><p>'+text+'</p><div><span>HGO <b>'+(month.hgo==null?'—':'%'+month.hgo.toFixed(1).replace('.',','))+'</b></span><span>Forecast <b>'+(month.forecast==null?'—':'%'+month.forecast.toFixed(0))+'</b></span><span>Kalan <b>'+devFmt(remaining)+'</b></span></div></div></section>';
}

function devActions() {
  var p=devProduct(), curr=devYtd(DEV_BAYI,DEV_PERIOD,p.key), prev=devYtd(DEV_BAYI,devAddMonths(DEV_PERIOD,-12),p.key), month=devValue(DEV_PERIOD,DEV_BAYI,p.key)||{};
  var yoy=devPct(curr.adet,prev.adet),remaining=Math.max(0,curr.hedef-curr.adet),actions=[];
  if(yoy!=null&&yoy<0)actions.push('Geçen yılın gerisinde kalan '+devFmt(Math.abs(curr.adet-prev.adet))+' adetlik fark için şube bazlı telafi planı oluştur.');
  if(month.forecast!=null&&month.forecast<100)actions.push('Forecastı %100’e taşımak için kalan '+devFmt(remaining)+' adedi günlük görevlere böl.');
  if(p.key==='mobil')actions.push('Faturalı ve faturasız üretimi personel kırılımında kontrol et.');
  if(p.key==='dsl')actions.push('Mobil satışı olup DSL üretimi olmayan müşteri fırsatlarını değerlendir.');
  if(p.key==='tv')actions.push('DSL satışlarında Tivibu eşleşme oranını ve IPTV/Uydu dağılımını kontrol et.');
  if(p.key==='cihaz')actions.push('Cihaz üretimini stok, marka ve yaşlandırma kırılımıyla karşılaştır.');
  if(!actions.length)actions.push('Güçlü ivmeyi korumak için en başarılı personel uygulamasını ekibe yaygınlaştır.');
  return '<section class="dv-panel dv-actions"><div class="dv-panel-head"><div><h3>Önerilen Aksiyonlar</h3><p>Seçilen ürün için öncelikli yönetici adımları</p></div></div>'+actions.slice(0,3).map(function(a,i){return'<div class="dv-action"><b>'+(i+1)+'</b><span>'+a+'</span></div>';}).join('')+'</section>';
}

function devMonthlyDetails() {
  var p=devProduct(), rows='',year=DEV_PERIOD.slice(0,4),max=+DEV_PERIOD.slice(5);
  for(var m=1;m<=max;m++){
    var period=year+'-'+String(m).padStart(2,'0'),c=devValue(period,DEV_BAYI,p.key),o=devValue(devAddMonths(period,-12),DEV_BAYI,p.key);
    if(!c&&!o)continue;var ca=c?c.adet:0,oa=o?o.adet:0,diff=ca-oa;
    rows+='<tr><td>'+DEV_MONTHS[m-1]+'</td><td>'+devFmt(oa)+'</td><td>'+devFmt(ca)+'</td><td class="'+devTone(diff)+'">'+devSigned(diff)+'</td><td>'+(c&&c.hgo!=null?'%'+c.hgo.toFixed(1).replace('.',','):'—')+'</td><td>'+(c&&c.forecast!=null?'%'+c.forecast.toFixed(0):'—')+'</td></tr>';
  }
  return '<details class="dv-panel dv-monthly"><summary><span><b>Aylık Detay</b><small>Ay ay üretim, HGO ve forecast</small></span><i>⌄</i></summary><div class="dv-table-scroll"><table><thead><tr><th>Ay</th><th>Geçen yıl</th><th>Bu yıl</th><th>Fark</th><th>HGO</th><th>Fc</th></tr></thead><tbody>'+rows+'</tbody></table></div></details>';
}

async function renderDevelopment() {
  var cards=document.getElementById('cards'); if(!cards)return;
  cards.className='cards single'; cards.style.maxWidth='100%';
  if(!HIST2_LOADED){cards.innerHTML='<div class="dv-loading">Geçmiş veriler yükleniyor…</div>';await loadAllHistory();return renderDevelopment();}
  var periods=devPeriods(),dealers=devDealers();
  if(!periods.length||!dealers.length){cards.innerHTML='<div class="dv-loading">Gelişim analizi için geçmiş veri bulunamadı.</div>';return;}
  if(!DEV_PERIOD||periods.indexOf(DEV_PERIOD)<0)DEV_PERIOD=periods[periods.length-1];
  if(!DEV_BAYI||!dealers.some(function(d){return String(d.bayiKodu)===String(DEV_BAYI);}))DEV_BAYI=String(dealers[0].bayiKodu);
  var info=devDealer(DEV_PERIOD,DEV_BAYI)||dealers.find(function(d){return String(d.bayiKodu)===String(DEV_BAYI);})||dealers[0];
  cards.innerHTML='<div class="dv-page" id="development-card"><div class="dv-title"><div><h1>Gelişim Merkezi</h1><p>Ürün bazlı bayi performansı ve yönetici aksiyonları</p></div><button onclick="downloadCardPNG()">⌯ Paylaş</button></div>'+devTopFilters(dealers,periods)+devOverviewCards()+devHealthHero(info)+devRangeTabs()+devChart()+devManagerSummary(info)+devQuickMetrics()+'<div class="dv-two-col">'+devPeerComparison()+devActions()+'</div>'+devMonthlyDetails()+'</div>';
}
