/* Aylık Prim & Kazanç ekranı */
var earningsState={month:null,code:null,query:""};

function _earnFmt(n){return new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(Number(n||0));}
function _earnPct(n,t){return t?((n/t)*100).toFixed(1).replace(".",",")+"%":"—";}
function _earnEsc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];});}
function _earnReports(){return (window.EARNINGS_REPORTS||[]).slice().sort(function(a,b){return a.id.localeCompare(b.id);});}
function _earnCurrentReport(){
  var rs=_earnReports(); if(!rs.length)return null;
  if(!earningsState.month) earningsState.month=rs[rs.length-1].id;
  return rs.find(function(r){return r.id===earningsState.month;})||rs[rs.length-1];
}
function earningsSelectMonth(v){earningsState.month=v; earningsState.code=null; renderEarningsPage();}
function earningsSearch(v){earningsState.query=(v||"").trim().toLocaleLowerCase("tr-TR"); renderEarningsPage();}
function earningsSelectDealer(code){earningsState.code=Number(code); renderEarningsPage(); var el=document.getElementById("earn-detail"); if(el) el.scrollIntoView({behavior:"smooth",block:"start"});}

function renderEarningsPage(){
  var root=document.getElementById("earnings-app"); if(!root)return;
  var report=_earnCurrentReport();
  if(!report){root.innerHTML='<div class="earn-empty">Henüz prim raporu eklenmedi.</div>';return;}
  var dealers=report.dealers||[];
  var q=earningsState.query;
  var filtered=dealers.filter(function(d){return !q||String(d.code).indexOf(q)>=0||d.name.toLocaleLowerCase("tr-TR").indexOf(q)>=0||d.city.toLocaleLowerCase("tr-TR").indexOf(q)>=0;});
  var selected=dealers.find(function(d){return d.code===earningsState.code;});
  if(!selected) selected=filtered[0]||dealers[0]||null;
  if(selected) earningsState.code=selected.code;

  var grand=dealers.reduce(function(s,d){return s+(d.totals.total||0);},0);
  var avg=dealers.length?grand/dealers.length:0;
  var rs=_earnReports();
  var monthOpts=rs.map(function(r){return '<option value="'+r.id+'"'+(r.id===report.id?' selected':'')+'>'+_earnEsc(r.label)+'</option>';}).join("");

  var list=filtered.slice().sort(function(a,b){return b.totals.total-a.totals.total;}).map(function(d){
    return '<button class="earn-row '+(selected&&selected.code===d.code?'active':'')+'" onclick="earningsSelectDealer('+d.code+')">'+
      '<div><strong>'+d.code+'</strong><span>'+_earnEsc(d.name)+'</span><small>'+_earnEsc(d.city)+' · '+_earnEsc(d.manager)+'</small></div>'+
      '<b>'+_earnFmt(d.totals.total)+'</b></button>';
  }).join("");

  var detail="";
  if(selected){
    var cats=Object.keys(selected.categories||{}).map(function(k){return [k,selected.categories[k]];}).filter(function(x){return x[1]>0;}).sort(function(a,b){return b[1]-a[1];});
    var catHtml=cats.map(function(x){
      var pct=Math.min(100,(x[1]/selected.totals.total)*100);
      return '<div class="earn-prod"><div class="earn-prod-top"><span>'+_earnEsc(x[0])+'</span><strong>'+_earnFmt(x[1])+'</strong></div>'+
        '<div class="earn-prod-meta"><span>'+_earnPct(x[1],selected.totals.total)+' toplam pay</span></div>'+
        '<div class="earn-bar"><i style="width:'+pct.toFixed(1)+'%"></i></div></div>';
    }).join("");
    detail='<section class="earn-detail" id="earn-detail">'+
      '<div class="earn-detail-head"><div><span class="earn-code">'+selected.code+'</span><h2>'+_earnEsc(selected.name)+'</h2><p>'+_earnEsc(selected.city)+' · '+_earnEsc(selected.region)+' · '+_earnEsc(selected.manager)+'</p></div><div class="earn-total"><small>Toplam Hakediş</small><strong>'+_earnFmt(selected.totals.total)+'</strong></div></div>'+
      '<div class="earn-split"><div><span>TT Mobil</span><b>'+_earnFmt(selected.totals.mobile)+'</b></div><div><span>TTNET</span><b>'+_earnFmt(selected.totals.ttnet)+'</b></div><div><span>Türk Telekom</span><b>'+_earnFmt(selected.totals.tt)+'</b></div></div>'+
      '<div class="earn-section-title"><span>Ürün / Prim Dağılımı</span><small>yüksekten düşüğe</small></div>'+
      '<div class="earn-products">'+catHtml+'</div>'+
      '<div class="earn-note">BPP ve YPP satış ürünü değil, performansa bağlı prim kalemleridir. “Toplam Hakediş” rapordaki resmi toplam tutardır; ürün kartları analiz için gruplandırılmıştır.</div>'+
      '</section>';
  }

  root.innerHTML='<div class="earn-toolbar">'+
    '<label><span>Dönem</span><select onchange="earningsSelectMonth(this.value)">'+monthOpts+'</select></label>'+
    '<label class="earn-search"><span>Bayi ara</span><input value="'+_earnEsc(earningsState.query)+'" oninput="earningsSearch(this.value)" placeholder="Kod veya bayi adı"></label>'+
    '</div>'+
    '<div class="earn-kpis"><div><span>Toplam Hakediş</span><strong>'+_earnFmt(grand)+'</strong></div><div><span>Bayi</span><strong>'+dealers.length+'</strong></div><div><span>Bayi Ortalaması</span><strong>'+_earnFmt(avg)+'</strong></div></div>'+
    '<div class="earn-layout"><section class="earn-list"><div class="earn-list-title"><span>'+_earnEsc(report.label)+'</span><small>'+filtered.length+' bayi</small></div>'+list+'</section>'+detail+'</div>';
}