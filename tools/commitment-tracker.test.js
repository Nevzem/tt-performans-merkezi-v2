/* Run with: node tools/commitment-tracker.test.js */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../js/commitment-tracker.js'),'utf8');
const page={className:'',style:{},innerHTML:''};
const dom={cards:page,'ct-summary':{innerHTML:''},'ct-results':{innerHTML:''},'ct-count':{textContent:''}};
const document={getElementById:id=>dom[id]||null,querySelectorAll:()=>[]};
const ctx=vm.createContext({console,document,MER_ARCHIVES:{},MER_LIVE:null});
vm.runInContext(src,ctx);
const run=x=>vm.runInContext(x,ctx);
const r=(code,mobile,dsl,kind='TTM',city='Samsun')=>({
  kod:code,fullName:code==='1'?'<Deneme> Telekom':'Şube '+code,
  il:city,bolge:'KUZEY ANADOLU',sy:'Yönetici 1',bt:kind,
  commitments:kind==='TTM'?{mobil, dsl}:{mobilUpsell:mobile,dsl}
});
ctx.MER_LIVE={
  period:'2026-10',ttm:{reportDate:'2026-10-13',bayiler:{
    '1':r('1',400,40), '2':r('2',543,94)}},
  edm:{bayiler:{
    '3':r('3',100,116,'TTBN','Tokat'), '4':r('4',34,0,'ESN','Amasya'),
    '5':r('5',1,0,'OTHER','Sinop'), '6':Object.assign({},r('6',9,9,'TTBN'),{bolge:'GÜNEY ANADOLU'})
  }}
};
assert.equal(run('ctSource().value.period'),'2026-10');
assert.equal(run('ctRows(ctSource().value).length'),5,'Only Kuzey Anadolu branch rows');
assert.equal(run('ctTotal(ctRows(ctSource().value).filter(x=>x.kind==="TTM"),"mobileTTM").value'),943,
 'TTM mobile quantity is sum of exact mobil activation field, not upsell');
assert.equal(run('ctTotal(ctRows(ctSource().value).filter(x=>x.kind==="TTM"),"dsl").value'),134);
assert.equal(run('ctTotal(ctRows(ctSource().value).filter(x=>x.kind!=="TTM"),"mobileUpsell").value'),135);
assert.equal(run('ctTotal(ctRows(ctSource().value),"dsl").value'),250);
assert.equal(run('ctViewRows().length'),2,'Default TTM only');
assert.equal(run('ctViewRows()[0].code'),'2','Sort mobile descending');
run("CT_CHANNEL='TTBN'"); assert.equal(run('ctViewRows().length'),1);
run("CT_CHANNEL='ALL'"); assert.equal(run('ctViewRows().length'),5);
run("CT_SORT='dsl'"); assert.equal(run('ctViewRows()[0].code'),'3');
run("CT_QUERY='tokat'");assert.equal(run('ctViewRows().length'),1);
run("CT_QUERY='';CT_CITY='Amasya'");assert.equal(run('ctViewRows().length'),1);
run("CT_CITY='all';CT_CHANNEL='TTM';CT_SORT='mobile'");
assert.equal(run("ctRows(ctSource().value).find(r=>r.code==='1').mobileUpsell"),null);
assert.equal(run("ctRows(ctSource().value).find(r=>r.code==='3').mobileTTM"),null);
const all=run('ctRows(ctSource().value)');
assert.equal(all.filter(r=>r.code==='6').length,0);
assert.equal(run('ctQuantity(null)'),null);
assert.equal(run('ctQuantity(0)'),0);
assert.equal(run('ctQuantity(1.5)'),null);
assert.equal(run('ctTotal([{dsl:3},{dsl:null}],"dsl").covered'),1);
assert.match(run('ctSummary(ctRows(ctSource().value))'),/943/);
assert.match(run('ctTable(ctRows(ctSource().value))'),/&lt;Deneme&gt;/,'Escape untrusted branch names');
run('renderCommitmentTracker()');
assert.match(page.innerHTML,/Şube Bazlı Taahhüt Takibi/);
assert.match(page.innerHTML,/13\.10\.2026/);
assert.match(page.innerHTML,/Mobil Taahhüt Upsell/);
assert.match(dom['ct-summary'].innerHTML,/943/);
assert.equal(dom['ct-count'].textContent,'2 şube gösteriliyor · 5 kayıt');
ctx.MER_LIVE=null;ctx.MER_ARCHIVES={};
assert.equal(run('ctRows(ctSource().value).length'),0,'No synthetic default quantities');
run('renderCommitmentTracker()');
assert.match(page.innerHTML,/Örnek veriden taahhüt adedi üretilmez/);
console.log('PASS: TTM + EDM TTBN/ESN segmentation, quantity totals, filters, escaping, source safety and UI.');
