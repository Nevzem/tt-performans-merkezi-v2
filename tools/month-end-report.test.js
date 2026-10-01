/* Run with: node tools/month-end-report.test.js */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const storage = {};
const ctx = vm.createContext({console:{log(){},warn(){}},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>{storage[k]=v;}},TextEncoder,Uint8Array,atob,Set,Date,document:{},XLSX:{utils:{sheet_to_json:s=>s}}});
vm.runInContext(fs.readFileSync(path.join(root,'js/data.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'js/parser.js'),'utf8').replace(/^wire\("drop.*$/gm,''),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'js/month-end-report.js'),'utf8'),ctx);
function run(code){return vm.runInContext(code,ctx);}
function dealer(code,h,a,parent='900'){return {kod:code,fullName:'Şirket '+code,anaBayiKod:parent,sy:'Yusuf Dilki',prods:Object.fromEntries(run('MER_PRODUCTS').map(p=>[p.key,{h,a}]))};}
ctx.A=dealer('1',100,100);ctx.B=dealer('2',900,450);
assert.ok(Math.abs(run("merAggregate([A,B],'DSL').g")-55)<1e-9,'HGO must be weighted by target');
ctx.B.prods.DSL.a=null;
assert.equal(run("merAggregate([A,B],'DSL').a"),null,'Missing actual is not zero');
ctx.B.prods.DSL.a=450;ctx.B.prods.DSL.h=null;
assert.equal(run("merAggregate([A,B],'DSL').g"),null,'Missing target cannot produce HGO');
ctx.B.prods.DSL.h=900;
ctx.source={period:'2026-03',ttm:{bayiler:{'1':ctx.A,'2':ctx.B},pers:{}},edm:null,closed:true};
assert.equal(run('merGroups(source).length'),1,'Group by main account code, regardless of branch names');
assert.equal(run('merGroups(source)[0].rows.length'),2);
run("MER_PARENTS['2']='901'");assert.equal(run('merGroups(source).length'),2);run('MER_PARENTS={}');
ctx.A.anaBayiKod='';ctx.B.anaBayiKod='';ctx.A.fullName='A şirket';ctx.B.fullName='B şirket';
assert.equal(run('merGroups(source).length'),2,'Similar short names must not silently merge legal entities');
ctx.A.anaBayiKod='900';ctx.B.anaBayiKod='900';
ctx.hist={};for(const year of [2025,2026])for(const month of [1,2,3]){if(year===2025&&month===2)continue;const period=year+'-'+String(month).padStart(2,'0');ctx.hist[period]={period,channel:'TTM',dealers:[{bayiKodu:'1',bayiAdi:'A',dsl:{hedef:100,adet:year===2025?40:60}},{bayiKodu:'2',bayiAdi:'B',dsl:{hedef:900,adet:year===2025?160:240}}]};}
ctx.HIST2_DATA=ctx.hist;run("MER_LIVE=null;MER_ARCHIVES={};C=merContext(source,'account','code:900');P=MER_PRODUCTS.find(p=>p.key==='DSL');S=merStats(C,P)");
assert.equal(run('S.months'),3);assert.equal(run('S.pairMonths'),2,'Only same months in both years participate');
assert.equal(run('S.pairB'),400);assert.equal(run('S.pairA'),850);assert.equal(run('S.ytdYoY'),112.5);
assert.equal(run("merHistoricalValue(C,'2026-02',P).a"),300,'Embedded sample must not override historical closure');
ctx.HIST2_DATA['2026-02'].dealers.pop();assert.equal(run("merHistoricalValue(C,'2026-02',P)"),null,'Absent branch is not treated as zero');
ctx.source.edm={bayiler:{'3':dealer('3',500,250)},pers:{}};
run("R=merContext(source,'region','')");assert.equal(run("merAggregate(R.rows,'DSL').g"),800/1500*100);
assert.equal(run("merHistoricalValue(R,'2026-01',P)"),null,'Combined region cannot use TTM-only history');
// Workbook fixtures: exact metadata, two EDM parents, another region and rollups.
const heads=['Ana Bölge','Bölge','Bayi Kodu','Bayi Adı','Ana Bayi Kodu','İl','Satış Yöneticisi'];
for(const p of ['Postpaid','Prepaid','Toplam Mobil','DSL','IPTV','Uydu','Akıllı Cihaz','Diğer Cihaz'])heads.push(p+' Hedef',p+' Gerçekleşen');
const edmRow=(code,parent,region='KUZEY ANADOLU')=>['ANADOLU',region,code,'EDM '+code,parent,'SAMSUN','Yusuf Dilki',...Array(8).fill([100,70]).flat()];
ctx.wb={SheetNames:['EDM BUAY'],Sheets:{'EDM BUAY':[heads,edmRow('10','507868'),edmRow('11','507999'),edmRow('12','507868','BATI ANADOLU'),edmRow('','507868')]}};
assert.equal(run("Object.keys(parseEDMSheet(wb,{region:true}).detay.bayiler).length"),2,'Region includes all parents, excludes other region and rollup');
assert.equal(run("parseEDMSheet(wb,{region:true}).detay.bayiler['11'].prods.IPTV.a"),70);
assert.equal(run("parseEDMSheet(wb,{region:true}).detay.bayiler['11'].anaBayiKod"),'507999');
assert.equal(run("Object.keys(parseEDMSheet(wb).detay.bayiler).includes('11')"),false,'Existing EDM screen keeps its parent filter');
const noUydu=heads.slice(0,heads.indexOf('Uydu Hedef')).concat(heads.slice(heads.indexOf('Uydu Gerçekleşen')+1));
ctx.noUydu={SheetNames:['EDM BUAY'],Sheets:{'EDM BUAY':[noUydu,edmRow('10','507868').slice(0,heads.indexOf('Uydu Hedef')).concat(edmRow('10','507868').slice(heads.indexOf('Uydu Gerçekleşen')+1))]}};
assert.equal(run("parseEDMSheet(noUydu,{region:true}).detay.bayiler['10'].prods.Uydu"),undefined,'Do not fabricate absent IPTV/TV split');
const ttmHeader=Array(90).fill('');ttmHeader[0]='Ana Bölge';
const ttm=Array(90).fill(0);Object.assign(ttm,{0:'ANADOLU',1:'KUZEY ANADOLU',2:'22',3:'Uzun Şirket Tam Ticari Unvan',4:'4100170',5:'SAMSUN',7:'Yusuf Dilki'});for(const i of [49,53,57,69,73,77,81]){ttm[i]=100;ttm[i+1]=80;}
const emp=Array(70).fill(0);Object.assign(emp,{0:'ANADOLU',1:'KUZEY ANADOLU',2:'22',3:ttm[3],4:'Yusuf Dilki',5:'SAMSUN',6:'Personel',7:'202609'});
ctx.ttmWB={SheetNames:['ÇALIŞAN','TTM BUAY'],Sheets:{'ÇALIŞAN':[['Ana Bölge'],emp],'TTM BUAY':[ttmHeader,ttm]}};
assert.equal(run("parseWB(ttmWB).detay.bayiler['22'].anaBayiKod"),'4100170');
assert.equal(run("parseWB(ttmWB).detay.bayiler['22'].fullName"),'Uzun Şirket Tam Ticari Unvan');
ctx.parsed=run('parseWB(ttmWB)');ctx.parsed.syData={calismaGun:30,calisilanGun:10};run('merCaptureUpload(parsed,null)');assert.equal(run('MER_LIVE.closed'),false);assert.equal(run('MER_LIVE.sample'),false);
ctx.parsed.syData.calisilanGun=30;run('merCaptureUpload(parsed,null)');assert.equal(run('MER_LIVE.closed'),true);assert.ok(storage.tt_month_end_archives_v1);
ctx.fakeCanvas={width:4096,height:3072,toDataURL:()=> 'data:image/jpeg;base64,/9j/2Q=='};
const bytes=run('merCanvasToPdfBytes([fakeCanvas,fakeCanvas])');const pdf=Buffer.from(bytes).toString('latin1');assert.ok(pdf.includes('/Count 2'));assert.ok(pdf.includes('xref\n0 9'));for(const offset of pdf.matchAll(/(\d{10}) 00000 n/g))assert.ok(/^\d+ 0 obj/.test(pdf.slice(+offset[1])),'PDF xref points to object');
console.log('PASS: weighted totals, missing values, account grouping, aligned YoY, channel coverage, workbook imports, archives, multi-page PDF.');
