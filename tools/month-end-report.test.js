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
ctx.HIST2_DATA['2026-02'].dealers.pop();assert.equal(run("merHistoricalValue(C,'2026-02',P).a"),60,'Cari month uses branches actually reported that month');
assert.equal(run("merHistoricalValue(C,'2026-02',P).rowCount"),1,'Cari reports month-specific coverage');
run("BC=merContext(source,'branch','2')");assert.equal(run("merHistoricalValue(BC,'2026-02',P)"),null,'Missing individual branch is not zero');
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
// Independent product scales keep lower-volume products readable.
ctx.ytdFixture={products:['mobil','dsl','iptv','uydu','akilliCihaz','digerCihaz'].map((hist,i)=>({hist,key:['Toplam Mobil','DSL','IPTV','Uydu','Akıllı Cihaz','Diğer Cihaz'][i],label:hist,s:{pairB:[6636,569,208,111,733,720][i],pairA:[5014,485,256,68,779,930][i]}})),source:{period:'2026-09'}};
const minis=run('ytdFixture.products.map(merYtdMini)');
for(const mini of minis){const heights=[...mini.matchAll(/height="([\d.]+)" rx/g)].map(m=>+m[1]);assert.equal(Math.max(...heights),46,'Each product has its own maximum');assert.ok(Math.min(...heights)>20,'Both years remain visible despite different product volumes');}
assert.equal((run('merYtdChart(ytdFixture)').match(/class="mer-ytd-mini"/g)||[]).length,6);
ctx.emptyProduct={hist:'dsl',label:'DSL',s:{pairA:0,pairB:null,ytdA:999}};
const emptyMini=run('merYtdMini(emptyProduct)');assert.ok(emptyMini.includes('height="0"'),'Zero matched sales must remain zero');assert.ok(emptyMini.includes('—'),'Missing previous year must remain missing');assert.ok(!emptyMini.includes('999'),'Matched zero must not fall back to full-year total');
// A full ring caps its fill at 100%, while retaining the real HGO label.
assert.ok(run("merHgoRing(112,'#00b6a6','test')").includes('stroke-dashoffset="0"'));
assert.ok(run("merHgoRing(112,'#00b6a6','test')").includes('>%112</text>'));
assert.ok(run("merHgoRing(null,'#00b6a6','missing')").includes('>—</text>'));
ctx.cardFixture={products:[{key:'DSL',hist:'dsl',s:{g:112,a:112,h:100,gap:12}},{key:'IPTV',hist:'iptv',s:{g:80,a:64,h:80,gap:-16}},{key:'Uydu',hist:'uydu',s:{g:null,a:null,h:null,gap:null}}]};
const cards=run('merSignals(cardFixture)');assert.ok(cards.includes('HEDEF ÜSTÜ'));assert.ok(cards.includes('+12 <small>adet</small>'));assert.ok(cards.includes('KALAN'));assert.ok(cards.includes('16 <small>adet</small>'));assert.ok(cards.includes('VERİ YOK'));
// Real archives: Primetech opened a new branch; Asis has month-specific coverage.
ctx.HIST2_DATA=Object.fromEntries(fs.readdirSync(path.join(root,'data/history')).filter(f=>/^20.*\.json$/.test(f)).map(f=>[f.slice(0,7),JSON.parse(fs.readFileSync(path.join(root,'data/history',f),'utf8'))]));
run("MER_LIVE=null;MER_ARCHIVES={};MER_PARENTS={};HS=merFromHistory(HIST2_DATA['2026-08']);PG=merGroups(HS).find(g=>g.name.includes('PRİMETECH'));PC=merContext(HS,'account',PG.id);AG=merGroups(HS).find(g=>g.name.includes('ASİS'));AC=merContext(HS,'account',AG.id)");
assert.equal(run("merStats(PC,MER_TRENDS[0]).months"),8,'New branch must not blank prior cari months');
assert.equal(run("merStats(AC,MER_TRENDS[0]).months"),8,'All available Asis monthly totals are plotted');
assert.equal(run("merHistoricalValue(AC,'2026-06',MER_TRENDS[0]).rowCount"),3);
assert.equal(run("merHistoricalValue(AC,'2026-06',MER_TRENDS[0]).a"),1373);
assert.equal(run("merHistoricalValue(AC,'2026-06',MER_TRENDS[0]).h"),1564);
const tvStats=run("merStats(AC,{key:'Toplam TV',hist:'tv'})");assert.equal(tvStats.months,8);
const tvExpected=run("merStats(AC,MER_PRODUCTS.find(p=>p.hist==='iptv')).ytdA+merStats(AC,MER_PRODUCTS.find(p=>p.hist==='uydu')).ytdA");assert.equal(tvStats.ytdA,tvExpected,'TV combines IPTV and Uydu for the same months');
ctx.tvIncomplete={prods:{IPTV:{h:10,a:8}}};assert.equal(run("merAggregate([tvIncomplete],'Toplam TV').g"),null,'Missing TV split cannot become zero');
const ytdPanel=run('merYtdPerformance(AC)');assert.equal((ytdPanel.match(/<article/g)||[]).length,4);assert.ok(!ytdPanel.includes('Diğer'));assert.ok(ytdPanel.includes('HGO'));assert.ok(ytdPanel.includes('adet ·'));
// Explicit parent changes take precedence over current branch membership.
ctx.transfer={period:'2026-01',ttm:{bayiler:{'1':dealer('1',100,90,'999')},pers:{}}};
run("TC=merContext(source,'account','code:900')");assert.equal(run('merAccountMonthRows(TC,transfer).length'),0);
run("MER_PARENTS['1']='900'");assert.equal(run('merAccountMonthRows(TC,transfer).length'),1);run('MER_PARENTS={}');
// Cari includes national sibling branches; regional screens keep their boundary.
const foreign=Object.assign([],ttm,{1:'ORTA ANADOLU',2:'23',5:'ANKARA'});
const unrelated=Object.assign([],ttm,{1:'BATI ANADOLU',2:'24',4:'888'});
ctx.ttmWB.Sheets['TTM BUAY'].push(foreign,unrelated);
ctx.national=run('parseWB(ttmWB)');
assert.equal(Object.keys(ctx.national.detay.bayiler).length,1);
assert.equal(Object.keys(ctx.national.detay.cariBayiler).length,2,'Only national siblings of regional caris are kept');
ctx.national.syData={calismaGun:30,calisilanGun:30};run('merCaptureUpload(national,null)');
assert.equal(run('merGroups(MER_LIVE)[0].rows.length'),2);
assert.equal(run("merContext(MER_LIVE,'region','').rows.length"),1);
assert.equal(run("merAggregate(merContext(MER_LIVE,'account','code:4100170').rows,'DSL').a"),160);
run('MER_LIVE=null;MER_ARCHIVES={};OS=merFromHistory(HIST2_DATA["2026-08"]);OC=merContext(OS,"account","code:7000514")');
assert.deepEqual(Array.from(run('OC.rows.map(d=>d.kod).sort()')),['4057503','4100756','4100760','7000514']);
assert.equal(run("merContext(OS,'region','').rows.length"),ctx.HIST2_DATA['2026-08'].dealers.length);
assert.equal(run('merStats(OC,MER_TRENDS[0]).ytdA'),10403);
assert.equal(run('merHistoricalValue(OC,"2025-04",MER_TRENDS[0]).rowCount'),2,'Later openings are not fabricated in older months');
assert.equal(run('merHistoricalValue(OC,"2025-05",MER_TRENDS[0]).rowCount'),3);
assert.equal(run('merHistoricalValue(OC,"2025-07",MER_TRENDS[0]).rowCount'),4);
ctx.legacy=JSON.parse(JSON.stringify(run('OS')));delete ctx.legacy.ttm.cariBayiler;
assert.equal(run('merGroups(legacy).find(g=>g.code==="7000514").rows.length'),4,'Closed legacy archive recovers matching-month external rows');
ctx.partial=JSON.parse(JSON.stringify(ctx.legacy));ctx.partial.closed=false;ctx.partial.sample=false;
assert.equal(run('merGroups(partial).find(g=>g.code==="7000514").rows.length'),2,'Closing history must not be mixed with an intra-month upload');
console.log('PASS: weighted totals, missing values, account grouping, aligned YoY, channel coverage, workbook imports, archives, multi-page PDF.');
