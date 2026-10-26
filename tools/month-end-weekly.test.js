/* node tools/month-end-weekly.test.js */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const storage={};
const c=vm.createContext({console,Date,Set,localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},HIST2_DATA:{}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/month-end-report.js'),'utf8'),c);
const run=s=>vm.runInContext(s,c);
const products=run('MER_PRODUCTS');
const dealer=(code,a)=>({kod:code,b:'Şube '+code,fullName:'Şirket',anaBayiKod:'900',prods:Object.fromEntries(products.map(p=>[p.key,{a,h:300}]))});
function source(date,a,closed=false){return {period:date.slice(0,7),ttm:{reportDate:date,bayiler:{'1':dealer('1',a)},cariBayiler:{'1':dealer('1',a)}},closed,sample:false};}
function setup(end,dates,scope='branch'){
 c.source=source(end,dates[end]);c.MER_DAILY={};c.MER_ARCHIVES={};c.HIST2_DATA={};
 for(const [date,a] of Object.entries(dates)){c.cut=source(date,a);run('merCaptureDaily(cut)');}
 c.ctx=run(`merContext(source,'${scope}','${scope==='account'?'code:900':'1'}')`);
 return run("merWeekly(ctx,MER_PRODUCTS[0],merWeeklySources(ctx))");
}
let result=setup('2026-10-21',{'2026-10-07':100,'2026-10-14':140,'2026-10-21':200});
assert.equal(result.current,60);assert.equal(result.previous,40);
assert.equal(run('merChange(60,40)'),50);
assert.ok(result.label.includes('2026-10-15–2026-10-21'));
// Stored snapshots contain actuals, with no personnel or sample data.
assert.equal(JSON.parse(storage.tt_month_end_daily_v1)['2026-10-14'].rows['TTM:1'].postpaid,140);
c.original=run('MER_LIVE');
c.parsed={donem:'202610',detay:source('2026-10-07',110).ttm,syData:{calismaGun:30,calisilanGun:7}};
run('merCaptureComparisonUpload(parsed,null,null)');
assert.equal(run('MER_LIVE'),c.original,'Previous upload must not replace current report');
assert.equal(run("MER_DAILY['2026-10-07'].rows['TTM:1'].postpaid"),110,'Same-date reupload replaces old actuals');
result=setup('2026-11-07',{'2026-10-24':250,'2026-10-31':300,'2026-11-07':60});
assert.equal(result.current,60);assert.equal(result.previous,50,'Month reset must not create a negative week');
result=setup('2027-01-07',{'2026-12-24':250,'2026-12-31':300,'2027-01-07':60});
assert.equal(result.current,60);assert.equal(result.previous,50,'Year boundary follows calendar days');
result=setup('2026-10-21',{'2026-10-07':100,'2026-10-14':100,'2026-10-21':105});
assert.equal(result.previous,0);assert.equal(run('merChange(5,0)'),null,'Zero sales preserve unit delta without an infinite percentage');
result=setup('2026-10-21',{'2026-10-07':100,'2026-10-21':200});
assert.equal(result.current,null);assert.equal(result.previous,null);assert.ok(result.reason.includes('2026-10-14'));
result=setup('2026-11-05',{'2026-10-22':200,'2026-10-29':260,'2026-11-05':40});
assert.equal(result.current,null,'Cross-month weeks require an exact month-end cut');
assert.ok(result.reason.includes('2026-10-31'));
result=setup('2026-10-21',{'2026-10-07':100,'2026-10-14':140,'2026-10-21':120});
assert.equal(result.current,null,'Negative cumulative corrections must not become sales');
result=setup('2026-10-21',{'2026-10-07':100,'2026-10-14':140,'2026-10-21':200},'account');
assert.equal(result.current,60);assert.equal(result.previous,40);
c.ctx.rows.push(Object.assign(dealer('2',50),{channel:'TTM'}));
assert.equal(run('merWeekly(ctx,MER_PRODUCTS[0],merWeeklySources(ctx)).current'),null,'Missing members must not silently change the comparison coverage');
// Regional and GM scopes retain EDM independently of TTM with identical codes.
c.MER_DAILY={};
for(const [date,a] of Object.entries({'2026-10-07':100,'2026-10-14':140,'2026-10-21':200})){
 c.cut=source(date,a);c.cut.edm={bayiler:{'1':dealer('1',a/2)}};
 c.cut.group={ttm:{bayiler:{N:dealer('N',a)}},edm:{bayiler:{N:dealer('N',a/2)}}};
 run('merCaptureDaily(cut)');
}
c.source=c.cut;c.MER_ARCHIVES={};
for(const scope of ['region','group']){
 c.ctx=run(`merContext(source,'${scope}','')`);
 const w=run('merWeekly(ctx,MER_PRODUCTS[0],merWeeklySources(ctx))');
 assert.equal(w.current,90,scope);assert.equal(w.previous,60,scope);
}
// New product rows and weekly column are shared by screen / PNG / PDF markup.
c.ctx=run("merContext(source,'branch','1')");
c.MER_DATE_COMPARE={mode:'week',from:'2026-10-14',to:'2026-10-21'};
c.ctx.products=products.map(p=>({...p,s:{pairA:400,pairB:300,ytdA:400,a:200,prevYearA:180,prevA:190,pairMonths:10}}));
const html=run('merYtdChart(ctx)');
assert.equal((html.match(/class="mer-compare-row"/g)||[]).length,8);
assert.equal((html.match(/class="mer-compare-cell /g)||[]).length,32);
assert.ok(html.includes('>Faturalı<')&&html.includes('>Faturasız<'));
assert.ok(html.includes('>Haftalık<')&&html.includes('+50,0%'));
assert.ok(html.includes('21.10.2026'));
c.source.sample=true;assert.equal(run('merReportDate(source)'),null);
c.source.sample=false;c.source.ttm.reportDate='2026-10-99';assert.equal(run('merReportDate(source)'),null);
console.log('PASS: 8 products, 4 comparisons, exact calendar weeks, month/year resets, zero/missing safety, scope coverage and saved upload cuts.');
