/* node tools/bayi-comparison.test.js */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),storage={};
const ctx=vm.createContext({console,Date,Set,localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},document:{},XLSX:{utils:{sheet_to_json:x=>x}}});
for(const file of ['js/data.js','js/history-loader.js','js/parser.js','js/month-end-report.js','js/bayi-comparison.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8').replace(/^wire\("drop.*$/gm,''),ctx);
const run=code=>vm.runInContext(code,ctx),equal=(expr,value,message)=>assert.equal(run(expr),value,message);
function snapshot(period,day,closed,a,b,tr){return {period,date:period+'-'+day,closed,dealers:[{code:'1',name:'Bayi A',region:'KUZEY ANADOLU',values:{mobil:a}},{code:'2',name:'Bayi B',region:'KUZEY ANADOLU',values:{mobil:b}},{code:'3',name:'Other region',region:'BAŞKA BÖLGE',values:{mobil:9999}}],tr:{mobil:tr}};}
ctx.sources=[snapshot('2025-01','31',true,100,900,10000),snapshot('2025-02','28',true,100,900,10000),snapshot('2026-01','31',true,200,800,15000),snapshot('2026-02','28',true,400,1600,20000)];ctx.current=ctx.sources[3];
assert.ok(Math.abs(run("bcMetric(sources,current,'dealer','1','KUZEY ANADOLU','mobil','YTD').value")-200)<1e-9);
equal("bcMetric(sources,current,'region','1','KUZEY ANADOLU','mobil','YoY').value",100,'Growth of summed activation, not average of branch growth');
equal("bcMetric(sources,current,'tr','1','KUZEY ANADOLU','mobil','MoM').value",(20000/15000-1)*100);
equal("bcValue(current,'region','1','KUZEY ANADOLU','mobil')",2000,'Other regions are excluded');
equal('bcGrowth(0,100).value',-100);equal('bcGrowth(100,0).value',null);equal('bcGrowth(0,0).value',null);
equal('bcGrowth(null,100).value',null);equal('bcQty(-1)',null);equal("bcQty('0')",null);equal('bcQty(0)',0);
ctx.partial=snapshot('2026-02','19',false,300,1200,18000);ctx.sources.push(ctx.partial);
equal("bcMetric(sources,partial,'dealer','1','KUZEY ANADOLU','mobil','MoM').value",null,'Never compare partial current with a full previous month');
equal("bcMetric(sources,partial,'dealer','1','KUZEY ANADOLU','mobil','YoY').value",null);
equal("bcMetric(sources,partial,'dealer','1','KUZEY ANADOLU','mobil','YTD').value",null,'YTD does not skip missing partial comparison month');
ctx.sources.push(snapshot('2025-02','19',false,150,800,10000),snapshot('2026-01','19',false,200,800,14000));
equal("bcMetric(sources,partial,'dealer','1','KUZEY ANADOLU','mobil','YoY').value",100);
equal("bcMetric(sources,partial,'dealer','1','KUZEY ANADOLU','mobil','MoM').value",50);
equal("bcMetric(sources,partial,'dealer','1','KUZEY ANADOLU','mobil','YTD').value",100,'YTD sums complete Jan and exact same-day Feb');
ctx.sources=ctx.sources.filter(s=>s.period!=='2025-01');
equal("bcMetric(sources,partial,'dealer','1','KUZEY ANADOLU','mobil','YTD').value",null,'Missing YTD month cannot silently disappear');
equal("bcAt([current],'2026-02',19)",null,'Month-end is not a daily snapshot');
equal("bcAt([current],'2026-02',31).date",'2026-02-28','Calendar-day cutoff caps at the last day of shorter months');
equal("bcValidDate('2026-02-29')",false);equal("bcValidDate('2024-02-29')",true);
ctx.raw={period:'2026-10',closed:false,sample:false,ttm:{reportDate:'2026-10-19',bayiler:{'1':{kod:'1',fullName:'<Test> LTD',bolge:'KUZEY ANADOLU',prods:{'Toplam Mobil':{a:100},'Akıllı Cihaz':{a:20},'Diğer Cihaz':{a:99}}}}},matrix:{turkiye:{mobil:105},regionBenchmarks:{tr:{mobil:110}}}};
equal('bcSnapshot(raw).tr.mobil',null,'HGO is never a national activation quantity');
equal('bcSnapshot(raw).dealers[0].values.akilliCihaz',20,'Cihaz is smart devices, not smart plus other');
run("raw.matrix.activationTotals={channel:'TTM',tr:{mobil:10000}};bcCaptureSource(raw)");
equal('bcSaved()["2026-10-19"].tr.mobil',10000);
assert.ok(storage.tt_bayi_comparison_snapshots_v1);
run("raw.sample=true");equal('bcSnapshot(raw)',null,'Built-in sample data cannot be a comparison source');
run("raw.sample=false;raw.ttm.reportDate=null");equal('bcSnapshot(raw)',null,'Do not guess a partial report date');
ctx.nationalRows=[Array(90).fill(null),Array(90).fill(null)];
for(const r of ctx.nationalRows){r[1]='TÜRKİYE';for(const col of [50,54,58,70,74,78,82])r[col]=100;}
equal('comparisonNationalActuals(nationalRows).tr.mobil',200,'Duplicate national summaries are counted once');
ctx.nationalRows[1][58]=200;equal('comparisonNationalActuals(nationalRows).tr.dsl',null,'Conflicting national summaries stay unknown');
ctx.nationalRows[0][74]=null;ctx.nationalRows[1][74]=null;equal('comparisonNationalActuals(nationalRows).tr.uydu',null,'Blank activations never become zero');
ctx.nationalRows[0][78]=0;ctx.nationalRows[1][78]=0;equal('comparisonNationalActuals(nationalRows).tr.akilliCihaz',0);
// Exercise the real workbook parser and upload hook, not just the extractor.
const headers=Array(90).fill(null);headers[0]='Ana Bölge';
const branch=Array(90).fill(null);Object.assign(branch,{0:'ANADOLU',1:'KUZEY ANADOLU',2:'1',3:'Bayi A',5:'SAMSUN',8:'202609'});
const nation=Array(90).fill(null);Object.assign(nation,{0:'Türkiye',1:'TÜRKİYE',2:'TÜRKİYE',3:'TÜRKİYE'});
for(const col of [50,54,58,70,74,78,82]){branch[col]=10;nation[col]=500;}
const person=Array(90).fill(null);Object.assign(person,{0:'ANADOLU',1:'KUZEY ANADOLU',2:'1',3:'Bayi A',6:'Personel',7:'202609'});
ctx.workbook={SheetNames:['ÇALIŞAN','TTM BUAY'],Sheets:{'ÇALIŞAN':[['Ana Bölge'],person],'TTM BUAY':[headers,branch,nation]}};
run('parsed=parseWB(workbook);parsed.syData={calismaGun:30,calisilanGun:30};merCaptureUpload(parsed,null)');
equal('MER_LIVE.matrix.activationTotals.tr.mobil',1000);
equal("bcSaved()['2026-09-30'].tr.dsl",500,'New uploads preserve actual national counts in daily comparison snapshots');
// Run the actual data loader with on-disk fixtures (including verified corrections).
ctx.fetch=async url=>{try{const content=fs.readFileSync(path.join(root,String(url).split('?')[0]),'utf8');return {ok:true,json:async()=>JSON.parse(content)};}catch(e){return {ok:false};}};
(async()=>{
 await run('loadAllHistory()');run("MER_LIVE=null;MER_ARCHIVES={};BC_SNAPSHOTS={};BC_PERIOD='2026-09';BC_DEALER='4057503'");
 const model=run('bcModel()');assert.equal(model.current.period,'2026-09');assert.equal(model.rows.length,8);assert.equal(model.dealers.length,23);
 const mobile=model.rows.find(r=>r.product.key==='mobil');assert.notEqual(mobile.metrics.YTD.dealer.value,null);assert.notEqual(mobile.metrics.YoY.region.value,null);
 assert.equal(mobile.metrics.YTD.tr.value,null,'Missing TR history is not replaced with HGO or account branches');
 const html=run('bcBody(bcModel())');assert.match(html,/Ürün Bazlı Büyüme/);assert.match(html,/Türkiye aktivasyon adetleri/);assert.doesNotMatch(html,/ÖRNEK VERİ/);
 const original=model.dealer.name;ctx.model=model;
 const rows=run('bcExcelRows(model)');assert.equal(rows.length,14);assert.equal(rows[0][2],original);assert.equal(rows[8][3],null,'Unknown national growth exports blank');
 equal("bcEsc('<x>')",'&lt;x&gt;');
 console.log('PASS: growth formulas, weighted region totals, exact daily alignment, full YTD coverage, missing/zero safety, national extraction, snapshots and real historical data.');
})().catch(e=>{console.error(e);process.exitCode=1;});
