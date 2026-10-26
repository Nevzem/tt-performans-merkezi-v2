/* node tools/month-end-date-compare.test.js */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),storage={};
const c=vm.createContext({console,Date,Set,localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v,removeItem:k=>delete storage[k]}});
vm.runInContext(fs.readFileSync(path.join(root,'js/month-end-report.js'),'utf8'),c);
const run=s=>vm.runInContext(s,c),products=run('MER_PRODUCTS');
const row={kod:'4057503',channel:'TTM'};
c.ctx={scope:'branch',rows:[row],source:{period:'2026-09',closed:true,sample:false}};
c.MER_PUBLISHED_DAILY=JSON.parse(fs.readFileSync(path.join(root,'data/history/month-end-daily.json'),'utf8')).snapshots;
c.cuts=run('merWeeklySources(ctx)');
// Compare two actual available dates, independent of the main closing month.
c.MER_DATE_COMPARE={mode:'report',from:'2026-10-07',to:'2026-10-12'};
c.plan=run('merComparePlan(ctx,cuts)');assert.equal(c.plan.valid,true);
for(const p of products){c.p=p;const value=run('merDateMetric(ctx,p,cuts,plan)');assert.equal(value.previous,c.cuts['2026-10-07']['TTM:4057503'][p.hist]);assert.equal(value.current,c.cuts['2026-10-12']['TTM:4057503'][p.hist]);assert.equal(value.missing.length,0);}
assert.equal(run('merDateCompareStatus(ctx,cuts,plan).ready'),true);
// Date selections survive dealer/scope/month changes and are persisted.
c.merModel=()=>c.ctx;c.renderMonthEndReport=()=>{};
run("merSetCompare('from','2026-10-08')");assert.equal(JSON.parse(storage.tt_month_end_date_compare_v1).from,'2026-10-08');
c.ctx={...c.ctx,scope:'region',source:{period:'2026-08',closed:true,sample:false}};
assert.equal(run('merComparePlan(ctx,cuts).to'),'2026-10-12');assert.equal(run('merComparePlan(ctx,cuts).from'),'2026-10-08');
assert.deepEqual(Array.from(run('merDateMetric(ctx,MER_PRODUCTS[0],cuts,merComparePlan(ctx,cuts)).missing')),['2026-10-08'],'An unavailable day must never use the closest report');
// Invalid dates / reversed ranges stay invalid, with no fabricated result.
for(const pair of [['2026-10-12','2026-10-07'],['2026-10-12','2026-10-12'],['2026-02-30','2026-10-12'],['','2026-10-12']]){
 c.MER_DATE_COMPARE={mode:'report',from:pair[0],to:pair[1]};assert.equal(run('merComparePlan(ctx,cuts).valid'),false);assert.equal(run('merDateMetric(ctx,MER_PRODUCTS[0],cuts,merComparePlan(ctx,cuts)).current'),null);
}
// Two independently selected seven-day periods, not forced to adjacent weeks.
c.ctx.scope='branch';c.ctx.rows=[row];c.cuts={};
function cut(date,n){c.cuts[date]={'TTM:4057503':Object.fromEntries(products.map(p=>[p.hist,n]))};}
cut('2026-09-24',200);cut('2026-09-30',300);cut('2026-10-01',10);cut('2026-10-12',70);cut('2026-10-19',150);
c.MER_DATE_COMPARE={mode:'week',from:'2026-10-01',to:'2026-10-19'};c.plan=run('merComparePlan(ctx,cuts)');
let v=run('merDateMetric(ctx,MER_PRODUCTS[0],cuts,plan)');assert.equal(v.previous,110,'Previous chosen week crosses month end');assert.equal(v.current,80,'Current chosen week ends on the selected date');assert.equal(v.missing.length,0);
delete c.cuts['2026-09-30'];v=run('merDateMetric(ctx,MER_PRODUCTS[0],cuts,plan)');assert.equal(v.previous,null);assert.deepEqual(Array.from(v.missing),['2026-09-30']);
// Report mode compares cumulative totals; it does not bridge month resets.
cut('2026-09-30',300);c.MER_DATE_COMPARE={mode:'report',from:'2026-09-30',to:'2026-10-01'};
v=run('merDateMetric(ctx,MER_PRODUCTS[0],cuts,merComparePlan(ctx,cuts))');assert.equal(v.previous,300);assert.equal(v.current,10);
// Reset restores defaults anchored to the active report; zero remains known.
run('merResetCompare()');c.plan=run('merComparePlan(ctx,cuts)');assert.equal(c.plan.mode,'report');assert.equal(c.plan.to,'2026-08-31');assert.equal(storage.tt_month_end_date_compare_v1,undefined);
c.ctx.source={period:'2026-10',closed:false,sample:false,ttm:{reportDate:'2026-10-19'}};
cut('2026-10-07',0);c.MER_DATE_COMPARE={mode:'report',from:'2026-10-07',to:'2026-10-12'};
v=run('merDateMetric(ctx,MER_PRODUCTS[0],cuts,merComparePlan(ctx,cuts))');assert.equal(v.previous,0);assert.equal(run('merChange(70,0)'),null);
const html=run('merWeeklyTools(ctx)');assert.ok(html.includes('id="mer-compare-from"')&&html.includes('id="mer-compare-to"')&&html.includes('7 günlük satış'));
c.ctx.products=products.map(p=>({...p,s:{pairA:300,pairB:200,ytdA:300,a:150,prevYearA:140,prevA:160,pairMonths:10}}));
const report=run('merYtdChart(ctx)');assert.ok(report.includes('07.10.2026 → 12.10.2026'));assert.ok(report.includes('Rapor toplamları:'));
console.log('PASS: chosen report dates, arbitrary week endings, real archive actuals, exact missing dates, month resets, zero/invalid safety and saved preferences.');
