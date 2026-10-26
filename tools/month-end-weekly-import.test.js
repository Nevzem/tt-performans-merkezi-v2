/* node tools/month-end-weekly-import.test.js */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),storage={};
const c=vm.createContext({console,Date,Set,Uint8Array,localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v}});
vm.runInContext(fs.readFileSync(path.join(root,'js/month-end-report.js'),'utf8'),c);
const run=s=>vm.runInContext(s,c),products=run('MER_PRODUCTS');
function detail(date,a){return {reportDate:date,bayiler:{'1':{kod:'1',b:'Bayi',prods:Object.fromEntries(products.map(p=>[p.key,{a,h:400}]))}}};}
c.current={period:'2026-09',closed:true,sample:false,ttm:detail('2026-09-30',350)};
c.MER_LIVE=c.current;c.MER_ARCHIVES={'2026-09':c.current};c.merPeriodSelection='2026-09';c.merScope='branch';c.merSelection='1';
c.ctx=run("merContext(current,'branch','1')");
c.MER_DATE_COMPARE={mode:'week',from:'2026-09-23',to:'2026-09-30'};
assert.deepEqual(Array.from(run('merWeeklyStatus(ctx,merWeeklySources(ctx)).missing')),['2026-09-16','2026-09-23']);
let html=run('merWeeklyTools(ctx)');
assert.ok(html.includes('16.09.2026')&&html.includes('23.09.2026'),'Missing dates must be visible outside scaled report');
assert.ok(html.includes('multiple')&&html.includes('Kıyas raporlarını yükle'));
// Import both required dated cuts without switching the active month / dealer.
const parsed={16:{donem:'202609',detay:detail('2026-09-16',100),syData:{calismaGun:30,calisilanGun:16}},23:{donem:'202609',detay:detail('2026-09-23',200),syData:{calismaGun:30,calisilanGun:23}}};
c.ensureXLSX=async()=>{};c.renderMonthEndReport=()=>{};c.XLSX={read:data=>({id:data[0]})};c.parseWB=wb=>{if(!parsed[wb.id])throw Error('Geçersiz dosya');return parsed[wb.id];};c.parseEDMSheet=()=>({error:'EDM sheet absent'});
function file(id,name){return {name,arrayBuffer:async()=>new Uint8Array([id]).buffer};}
(async()=>{
 c.files=[file(16,'16Eylul.xlsx'),file(0,'bozuk.xlsx'),file(23,'23Eylul.xlsx')];
 await run('merImportWeeklyFiles(files)');
 assert.equal(c.MER_LIVE,c.current);assert.equal(c.merPeriodSelection,'2026-09');assert.equal(c.merSelection,'1');
 assert.equal(c.merWeeklyImportBusy,false);assert.ok(c.merWeeklyImportMessage.includes('bozuk.xlsx'));
 assert.ok(c.merWeeklyImportMessage.includes('16.09.2026')&&c.merWeeklyImportMessage.includes('23.09.2026'));
 const status=run('merWeeklyStatus(ctx,merWeeklySources(ctx))');assert.equal(status.ready,true);assert.equal(status.missing.length,0);
 const week=run('merWeekly(ctx,MER_PRODUCTS[0],merWeeklySources(ctx))');assert.equal(week.current,150);assert.equal(week.previous,100);
 assert.ok(run('merWeeklyTools(ctx)').includes('Seçilen tarihlerin kıyas verileri hazır.'));
 assert.ok(JSON.parse(storage.tt_month_end_daily_v1)['2026-09-23']);
 // Real published cuts include all scopes; loading requires no prior file upload.
 const pack=JSON.parse(fs.readFileSync(path.join(root,'data/history/month-end-daily.json'),'utf8'));
 assert.deepEqual(pack.snapshots.map(s=>s.date),['2026-10-07','2026-10-12']);
 for(const s of pack.snapshots){assert.equal(Object.keys(s.rows).length,278);assert.ok(s.rows['TTM:4057503']);assert.ok(Object.keys(s.rows).some(k=>k.startsWith('EDM:')));assert.ok(Object.keys(s.rows).some(k=>k.startsWith('GROUP:EDM:')));}
 c.fetch=async()=>({ok:true,json:async()=>pack});await run('merLoadDaily()');assert.equal(c.MER_PUBLISHED_DAILY.length,2);
 assert.equal(run("merWeeklySources(ctx)['2026-10-07']['TTM:4057503'].postpaid"),pack.snapshots[0].rows['TTM:4057503'].postpaid);
 // A corrupted/out-of-period workbook cannot report import success.
 c.files=[file(0,'bozuk.xlsx')];await run('merImportWeeklyFiles(files)');assert.ok(!c.merWeeklyImportMessage.includes('Yüklenen rapor tarihleri:'));
 console.log('PASS: missing-date guidance, multiple-file import, partial failure recovery, real published cuts, persistence and unchanged active report.');
})().catch(e=>{console.error(e);process.exitCode=1;});
