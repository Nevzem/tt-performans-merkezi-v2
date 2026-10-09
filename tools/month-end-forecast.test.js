/* Run with: node tools/month-end-forecast.test.js */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ctx=vm.createContext({
  console,Date,localStorage:{getItem:()=>null,setItem(){}},document:{}
});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/month-end-report.js'),'utf8'),ctx);
const run=js=>vm.runInContext(js,ctx);
run(`
var mk=(code,actual,target)=>({kod:code,b:code,prods:Object.fromEntries(MER_PRODUCTS.map(p=>[p.key,{a:actual,h:target}]))});
var sample={period:'2026-10',closed:false,sy:{calismaGun:31,calisilanGun:7},
  ttm:{bayiler:{'1':mk('1',20,100)}},edm:{bayiler:{'2':mk('2',20,100)}},
  matrix:{regionBenchmarks:{gm:{dsl:88,mobil:90},tr:{dsl:91,mobil:92}}}};
var region=merContext(sample,'region',''),p=MER_PRODUCTS.find(p=>p.key==='DSL');
region.products=MER_PRODUCTS.map(p=>Object.assign({},p,{s:merStats(region,p)}));
`);
assert.equal(run('merAggregate(region.rows,"DSL").g'),20,'Region current HGO is not forecast');
assert.ok(Math.abs(run('merClosingHgo(region,20)')-20*31/7)<1e-9,'Region closing forecast uses worked-day factor');
assert.equal(run('merClosingBenchmark(region,p,"gm")'),88,'GM forecast benchmark');
assert.equal(run('merClosingBenchmark(region,p,"tr")'),91,'Türkiye forecast benchmark');
const html=run('merPerformanceTable(region)');
assert.ok(html.includes('F. HGO'),'Current and forecast HGO both shown');
assert.ok(html.includes('%20,0')&&html.includes('%88,6'),'Both current and forecast visible');
assert.ok(html.includes('+0,6 puan')&&html.includes('-2,4 puan'),'GM and TR compare region forecast, not current');
assert.ok(!html.includes('-68,0 puan'),'No current-versus-forecast mismatch');
run('var closed=Object.assign({},sample,{closed:true,sy:null}); var closedCtx=merContext(closed,"region","")');
assert.equal(run('merClosingHgo(closedCtx,105)'),105,'Already closed month is not multiplied again');
run('var noDays=Object.assign({},sample,{sy:null});var noDaysCtx=merContext(noDays,"region","")');
assert.equal(run('merClosingHgo(noDaysCtx,20)'),null,'Do not guess forecast without days');
run('var noBench=Object.assign({},sample,{matrix:{anadolu:{dsl:85},turkiye:{dsl:88}}});var noBenchCtx=merContext(noBench,"region","")');
assert.equal(run('merClosingBenchmark(noBenchCtx,p,"gm")'),null,'Do not compare region all channels to TTM-only fallback');
run('var noEdm=Object.assign({},sample,{edm:null});var noEdmCtx=merContext(noEdm,"region","")');
assert.equal(run('merClosingBenchmark(noEdmCtx,p,"gm")'),null,'Do not use GM+TR benchmarks without EDM regional coverage');
run('var incomplete=Object.assign({},sample,{ttm:{bayiler:{"1":mk("1",null,100)}}});var missingCtx=merContext(incomplete,"region","")');
assert.equal(run('merAggregate(missingCtx.rows,"DSL").g'),null,'Missing activations do not become zero');
assert.equal(run('merClosingHgo(missingCtx,merAggregate(missingCtx.rows,"DSL").g)'),null);
run('var groupSource=Object.assign({},sample,{group:{ttm:{bayiler:{"1":mk("1",20,100)}},edm:{bayiler:{"2":mk("2",20,100)}}}});var groupCtx=merContext(groupSource,"group","")');
assert.equal(run('merClosingBenchmark(groupCtx,p,"tr")'),91,'Group Directorate comparison also uses closing benchmarks');
assert.ok(Math.abs(run('merClosingHgo(groupCtx,20)')-20*31/7)<1e-9);
console.log('PASS: closing HGO comparable across region/GM/TR, missing data, channel coverage, archived month.');
