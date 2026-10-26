/* node tools/month-end-region-compare.test.js */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const c=vm.createContext({console,Date,Set,localStorage:{getItem:()=>null,setItem(){}}});
vm.runInContext(fs.readFileSync(path.join(root,'js/month-end-report.js'),'utf8'),c);
const run=s=>vm.runInContext(s,c),products=run('MER_PRODUCTS');
c.HIST2_DATA=Object.fromEntries(['2026-08','2026-09'].map(period=>[period,JSON.parse(fs.readFileSync(path.join(root,'data/history',period+'.json'),'utf8'))]));
c.MER_PUBLISHED_DAILY=JSON.parse(fs.readFileSync(path.join(root,'data/history/month-end-daily.json'),'utf8')).snapshots;
c.source=run("merSource('2026-09')");c.ctx=run("merContext(source,'region','')");c.cuts=run('merWeeklySources(ctx)');
assert.equal(c.ctx.rows.filter(r=>r.channel==='EDM').length,243);
c.plan={valid:true,mode:'report',from:'2026-10-07',to:'2026-10-12'};
for(const date of [c.plan.from,c.plan.to]){
 const snap=c.MER_PUBLISHED_DAILY.find(s=>s.date===date),edm=Object.keys(snap.rows).filter(id=>id.startsWith('EDM:'));
 assert.equal(edm.length,236,'October report membership differs from the September screen');
 const missing=c.ctx.rows.filter(r=>!snap.rows[r.channel+':'+r.kod]);assert.equal(missing.length,7);
 const regionalTtm=c.ctx.rows.filter(r=>r.channel==='TTM').map(r=>'TTM:'+r.kod);
 assert.equal(regionalTtm.length,23);assert.equal(Object.keys(snap.rows).filter(id=>id.startsWith('TTM:')).length,36,'Snapshot also contains out-of-region cari siblings');
 for(const p of products){
  const expected=regionalTtm.concat(edm).reduce((sum,id)=>sum+snap.rows[id][p.hist],0);
  c.p=p;c.date=date;assert.equal(run('merCompareCut(ctx,p,cuts,date)'),expected,p.hist+' regional total must follow the selected date');
  assert.equal(snap.rows['GROUP:TTM:KUZEY ANADOLU'][p.hist]+snap.rows['GROUP:EDM:KUZEY ANADOLU'][p.hist],expected,'Independent exact-date regional rollups reconcile with regional branch rows');
 }
}
assert.equal(run('merDateCompareStatus(ctx,cuts,plan).ready'),true,'All eight regional products are available');
// Changing the open month must not change selected-date regional totals.
const oldValues=products.map(p=>{c.p=p;return run("merCompareCut(ctx,p,cuts,'2026-10-12')");});
c.ctx=run("merContext(merSource('2026-08'),'region','')");
products.forEach((p,i)=>{c.p=p;assert.equal(run("merCompareCut(ctx,p,cuts,'2026-10-12')"),oldValues[i]);});
// Month closing comparisons use each period's own TTM + EDM membership too.
for(const period of ['2026-08','2026-09']){
 const src=run(`merSource('${period}')`);c.date=period+(period.endsWith('08')?'-31':'-30');
 for(const p of products){c.p=p;const expected=Object.values(src.ttm.bayiler).concat(Object.values(src.edm.bayiler)).reduce((n,r)=>n+r.prods[p.key].a,0);assert.equal(run('merCompareCut(ctx,p,cuts,date)'),expected);}
}
// Regional totals must not become partial TTM-only totals or invented zeros.
const day=c.cuts['2026-10-12'],saved=day['REGION:EDM:KUZEY ANADOLU'];
delete day['REGION:EDM:KUZEY ANADOLU'];assert.equal(run("merCompareCut(ctx,MER_PRODUCTS[0],cuts,'2026-10-12')"),null);
day['REGION:EDM:KUZEY ANADOLU']={...saved,postpaid:null};assert.equal(run("merCompareCut(ctx,MER_PRODUCTS[0],cuts,'2026-10-12')"),null);
day['REGION:EDM:KUZEY ANADOLU']={...saved,postpaid:0};assert.equal(run("merCompareCut(ctx,MER_PRODUCTS[0],cuts,'2026-10-12')"),day['REGION:TTM:KUZEY ANADOLU'].postpaid);
day['REGION:EDM:KUZEY ANADOLU']=saved;
// New captures retain explicit scope totals while excluding foreign siblings.
function row(code,a){return {kod:code,prods:Object.fromEntries(products.map(p=>[p.key,{a,h:100}]))};}
c.partial={period:'2026-10',sample:false,closed:false,ttm:{reportDate:'2026-10-21',bayiler:{'1':row('1',20)},cariBayiler:{'1':row('1',20),'99':row('99',900)}},edm:{bayiler:{'2':row('2',30)}}};
let snap=run('merDailySnapshot(partial)');assert.equal(snap.rows['REGION:TTM:KUZEY ANADOLU'].postpaid,20);assert.equal(snap.rows['TTM:99'].postpaid,900);assert.equal(snap.rows['REGION:EDM:KUZEY ANADOLU'].postpaid,30);
// Membership changes also work for weekly intervals, without reusing September codes.
c.MER_DAILY={};
for(const [date,ttm,edm,code] of [['2026-10-07',100,200,'2'],['2026-10-14',150,300,'3'],['2026-10-21',300,400,'4']]){
 c.partial.ttm.reportDate=date;c.partial.ttm.bayiler={'1':row('1',ttm)};c.partial.edm.bayiler={[code]:row(code,edm)};run('merCaptureDaily(partial)');
}
c.cuts=run('merWeeklySources(ctx)');c.plan={valid:true,mode:'week',from:'2026-10-14',to:'2026-10-21'};
const week=run('merDateMetric(ctx,MER_PRODUCTS[0],cuts,plan)');assert.equal(week.current,250);assert.equal(week.previous,150);assert.equal(week.missing.length,0);
console.log('PASS: actual dated regional totals across changed EDM membership, all 8 products, monthly/daily/week comparisons, no foreign cari leakage and strict channel coverage.');
