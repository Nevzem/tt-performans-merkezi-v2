/* node tools/report-dates.test.js — real XLSX round trips, no upload-time guesses. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),XLSX=require(path.join(root,'js/vendor/xlsx.full.min.js'));
const ctx=vm.createContext({console,Date,Number,document:{},XLSX});
for(const file of ['js/data.js','js/parser.js','js/october-campaign.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8').replace(/^wire\("drop.*$/gm,''),ctx);
const run=code=>vm.runInContext(code,ctx);
function workbook(sheets){const wb=XLSX.utils.book_new();for(const name in sheets)XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(sheets[name]),name);return wb;}
function date(wb,fileName='',days={calismaGun:31,calisilanGun:5}){ctx.wb=wb;ctx.fileName=fileName;ctx.days=days;return run("workbookReportDate(wb,'2026/10',fileName,days)");}
const blank=workbook({'SY ÖZET':[['Çalışma Günü',31],['Çalışılan Gün',5]]});
for(const name of ['TTM 05.10.2026.xlsx','TTM 2026-10-05.xlsx','TTM 05102026.xlsx','TTM 20261005.xlsx','TTM 5 Ekim 2026.xlsx','TTM 05.10.xlsx'])assert.equal(date(blank,name).date,'2026-10-05',name);
assert.equal(date(blank,'TTM.xlsx').date,'2026-10-05','Calendar summary resolves unnamed daily files');
assert.equal(date(blank,'TTM.xlsx',{calismaGun:22,calisilanGun:5}).date,null,'Working-day counts must not be used as dates');
assert.equal(date(blank,'TTM.xlsx',{calismaGun:31,calisilanGun:32}).date,null);
assert.equal(date(blank,'TTM.xlsx',{calismaGun:31,calisilanGun:0}).date,null);
assert.equal(date(blank,'04.10.2026 - 05.10.2026.xlsx').date,null,'Ambiguous date ranges are not single report dates');
const meta=workbook({'SY ÖZET':[['Rapor Tarihi','04.10.2026'],['Veri Tarihi','03.10.2026']]});
assert.equal(date(meta,'05.10.2026.xlsx').date,'2026-10-03','Data date takes priority over creation date and filename');
assert.equal(date(workbook({'TTM BUAY':[['Rapor Tarihi: 04.10.2026']]}),'05.10.2026.xlsx').date,'2026-10-04');
assert.equal(date(workbook({'TTM BUAY':[['Rapor Tarihi'],[46300]]})).date,'2026-10-05','Excel date serial');
assert.equal(date(blank,'TTM 20102026.xlsx').date,'2026-10-20','Compact dates starting with 20 are also day-first');
assert.equal(date(workbook({'TTM BUAY':[['Rapor Tarihi','31.09.2026']]}),'05.10.2026.xlsx').date,'2026-10-05','Invalid or wrong-period dates are ignored');
assert.equal(date(workbook({'Bayi List':[['Sistem Kapanış Tarihi','05.10.2026']]}),'TTM.xlsx',{calismaGun:22,calisilanGun:5}).date,null,'Dealer closure dates are unrelated');
assert.equal(run('reportDateISO(2026,2,29)'),null);assert.equal(run('reportDateISO(2024,2,29)'),'2024-02-29');
const person=Array(96).fill(null);person[0]='ANADOLU';person[1]='KUZEY ANADOLU';person[2]='4100089';person[3]='Test bayi';person[6]='Test personel';person[7]='202610';
const productHeaders=Array(96).fill(null),headers=Array(96).fill(null);headers[0]='Ana Bölge';productHeaders[90]='DSL Taahhüt';headers[90]='Aktivasyon';productHeaders[92]='Mobil Taahhüt';headers[92]='Aktivasyon';
function report(day){const branches=run('OC_GROUPS').flat().map(d=>{const row=Array(96).fill(null);row[0]='ANADOLU';row[1]='KUZEY ANADOLU';row[2]=d[0];row[3]=d[1];row[5]=d[2];row[8]='202610';for(const col of [50,54,58,70,74,78,82,90,92])row[col]=day;return row;});return workbook({'ÇALIŞAN':[['Ana Bölge'],person],'TTM BUAY':[productHeaders,headers,...branches],'SY ÖZET':[['Çalışma Günü',31],['Çalışılan Gün',day]]});}
ctx.currentWB=XLSX.read(XLSX.write(report(5),{type:'buffer',bookType:'xlsx'}),{type:'buffer'});ctx.prevWB=XLSX.read(XLSX.write(report(4),{type:'buffer',bookType:'xlsx'}),{type:'buffer'});
run("current=parseWB(currentWB,{fileName:'guncel.xlsx'}).detay;previous=parseWB(prevWB,{fileName:'onceki.xlsx'}).detay");
assert.equal(run('current.reportDate'),'2026-10-05');assert.equal(run('previous.reportDate'),'2026-10-04');assert.equal(run('current.sourceFileName'),'guncel.xlsx');
assert.equal(run('ocModel(current,previous).compare'),true);assert.equal(run('ocModel(current,previous).groups[0][0].delta'),31);
assert.equal(run("ocReportDateInfo(current,'Güncel rapor').includes('<input')"),false,'Campaign no longer asks for manual dates');
// Optional browser fixtures are written only outside the repository.
if(process.argv[2]){const out=process.argv[2];fs.mkdirSync(out,{recursive:true});for(const day of [4,5])fs.writeFileSync(path.join(out,'test-report-'+day+'.xlsx'),XLSX.write(report(day),{type:'buffer',bookType:'xlsx'}));}
console.log('Automatic report dates: filename formats, metadata priority, calendar-day fallback, missing/ambiguous dates and two-report daily comparison passed.');
