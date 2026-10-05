/* node tools/investor-campaign.test.js [optional fixture directory] */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),XLSX=require(path.join(root,'js/vendor/xlsx.full.min.js'));
const ctx=vm.createContext({console,Date,Number,document:{},XLSX});
for(const file of ['js/data.js','js/parser.js','js/investor-campaign.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8').replace(/^wire\("drop.*$/gm,''),ctx);
const run=s=>vm.runInContext(s,ctx);
const reward=(q,d,m)=>{ctx.q=q;ctx.d=d;ctx.m=m;return run('icReward(q,d,m)');};
assert.equal(run('IC_BRANCHES.length'),23);assert.equal(new Set(run('IC_BRANCHES').map(b=>b[0])).size,23);
for(let i=0;i<3;i++)for(let j=0;j<3;j++)assert.equal(reward([40,50,60][i],[100,110,120][j],100).reward,30000+5000*(i+j),'All nine official reward cells');
for(const [q,d,m,amount] of [[77,120,112,50000],[60,110,121,45000],[49,115,104,35000],[53,105,110,35000],[41,95,100,15000],[39,105,110,0],[55,112,95,0],[40,105,93,0]])assert.equal(reward(q,d,m).reward,amount,'Official notice examples');
assert.equal(reward(38,95,100).reward,15000,'Incentive has no separate minimum DSL quantity');
assert.equal(reward(80,94,120).reward,0);assert.equal(reward(80,150,99).reward,0);assert.equal(reward(null,100,100).reward,null);
function dealer(a=12,h=60,ma=18,mh=100){return {bolge:'KUZEY ANADOLU',prods:{DSL:{a,h,g:a/h*100},Postpaid:{a:ma,h:mh,g:ma/mh*100},Prepaid:{a:0,h:0,g:null}}};}
const source={period:'2026/10',reportDate:'2026-10-05',forecastDays:{d:5,t:31},bayiler:Object.fromEntries(run('IC_BRANCHES').map(b=>[b[0],dealer()]))};
ctx.source=source;
assert.equal(run('icModel(source,null,{d:1,t:31}).rows[0].dsl'),124,'Use uploaded report days, not stale manual forecast days');
assert.equal(run('icModel(source).rows[0].mobil'),112);assert.equal(run('icModel(source).rows[0].reward'),50000,'Projected DSL quantity sets reward tier');
source.forecastDays.d=6;
assert.equal(run('icModel(source,null,{d:5,t:31}).rows[0].dsl'),103,'Next daily report updates projection automatically');
assert.equal(run('icModel(source).rows[0].reward'),0,'Mobil forecast below100 blocks reward');
source.forecastDays={d:31,t:31};source.bayiler['4100089']=dealer(39.5,39.5/0.995,100,100);
assert.equal(run('icModel(source).rows[0].dsl'),100);assert.equal(run('icModel(source).rows[0].reward'),30000,'99.5% HGO and39.5 DSL round up only once');
source.bayiler['4100089']=dealer(49.5,49.5,100,100);assert.equal(run('icModel(source).rows[0].reward'),35000,'49.5 quantity reaches50 tier');
source.bayiler['4100089']=dealer(59.5,59.5,100,100);assert.equal(run('icModel(source).rows[0].reward'),40000,'59.5 quantity reaches60 tier');
source.bayiler['4100089']=dealer(40,40,99.49,100);assert.equal(run('icModel(source).rows[0].reward'),0);
source.bayiler['4100089']=dealer(40,40,99.5,100);assert.equal(run('icModel(source).rows[0].reward'),30000);
source.bayiler['4100089'].campaignActuals={DSL:null,Postpaid:100,Prepaid:0};assert.equal(run('icModel(source).rows[0].reward'),null,'Blank raw activations are not zero');
source.bayiler['4100089']=dealer(40,40,100,100);source.bayiler['4100089'].campaignTargets={DSL:40,Postpaid:100,Prepaid:null};assert.equal(run('icModel(source).rows[0].mobil'),null,'Blank component target prevents incomplete Mobil HGO');
source.bayiler['4100089']=dealer(0,0);assert.equal(run('icModel(source).rows[0].dsl'),null,'No target means noHGO or reward');
delete source.bayiler['4100089'];assert.equal(run('icModel(source).rows.length'),23,'Missing branch stays visible');
source.bayiler['4100089']={...dealer(),bolge:'BAŞKENT'};assert.equal(run('icModel(source).rows[0].dsl'),null,'Do not include outside-region branch');
source.period='2026/09';assert.equal(run('icModel(source,"2026/10").valid'),false);assert.equal(run('icModel(source).rows.every(r=>r.reward===null)'),true);
source.period='2026/10';source.forecastDays=null;assert.equal(run('icModel(source).forecast'),null);assert.equal(run('icModel(source).rows[0].status'),'Forecast gerekli');
assert.equal(run('icModel(source,null,{d:5,t:31}).forecast.k'),6.2,'Explicit settings fallback is available');
assert.equal(run('icDays({d:32,t:31})'),null);assert.equal(run('icDays({d:0,t:31})'),null);
// Real XLSX parser/forecast metadata contract, including changing daily reports.
function workbook(day=5){
  const wb=XLSX.utils.book_new(),person=Array(96).fill(null);person[0]='ANADOLU';person[1]='KUZEY ANADOLU';person[2]='4100089';person[3]='Kılavuzlar';person[6]='Test personel';person[7]='202610';
  const heads=Array(96).fill(null);heads[0]='Ana Bölge';
  const branches=run('IC_BRANCHES').map((b,i)=>{const row=Array(96).fill(null);row[0]='ANADOLU';row[1]='KUZEY ANADOLU';row[2]=b[0];row[3]=b[1];row[5]=b[2];row[7]='YUSUF DILKI';row[8]='202610';row[49]=90;row[50]=15-i%4;row[53]=10;row[54]=3;row[57]=60;row[58]=12-i%7;for(const col of [69,73,77,81])row[col]=100;for(const col of [70,74,78,82])row[col]=1;return row;});
  for(const [name,rows] of Object.entries({'ÇALIŞAN':[['Ana Bölge'],person],'TTM BUAY':[heads,...branches],'SY ÖZET':[['Çalışma Günü',31],['Çalışılan Gün',day]]}))XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),name);
  return wb;
}
ctx.wb=XLSX.read(XLSX.write(workbook(),{type:'buffer',bookType:'xlsx'}),{type:'buffer'});
run("parsed=parseWB(wb,{fileName:'TTM 05.10.2026.xlsx'});source=parsed.detay");
assert.equal(run('source.forecastDays.d'),5);assert.equal(run('source.forecastDays.t'),31);assert.equal(run('source.reportDate'),'2026-10-05');assert.equal(run('icModel(source).rows[0].reward'),50000);
const html=run('icCardHTML(icModel(source),source)');
assert.equal((html.match(/<tbody>/g)||[]).length,1);assert.equal((html.match(/<tr>/g)||[]).length,24,'Oneheader plus23 complete dealer rows');
for(const b of run('IC_BRANCHES'))assert.ok(html.includes(b[0]),b[0]);
assert.ok(!/adet|hedef say|title=|data-(target|quantity)|72\s*\/\s*60/i.test(html),'No private quantities or goals in shared HTML/attributes');
assert.ok(html.includes('Forecast'));assert.ok(html.includes('4100990'));assert.ok(!html.includes('ÖRNEK'),'Real UI never embeds sample data');
const elements={cards:{style:{}},'ic-preview':{clientWidth:390,style:{}},'investor-campaign-card':{style:{},offsetHeight:1640,scrollHeight:1640}};
ctx.document={getElementById:id=>elements[id]};run('DETAY=source;DONEM="2026/10";renderInvestorCampaign()');
assert.equal(elements['ic-preview'].style.height,(1640*390/1024)+'px','Natural height preserved in mobile preview');
assert.equal(run('icCardHeight(document.getElementById("investor-campaign-card"))'),1640);
if(process.argv[2]){fs.mkdirSync(process.argv[2],{recursive:true});for(const day of [5,6])fs.writeFileSync(path.join(process.argv[2],'investor-report-'+day+'.xlsx'),XLSX.write(workbook(day),{type:'buffer',bookType:'xlsx'}));}
console.log('Investor campaign passed: all reward tiers and official examples, forecast projection, rounding boundaries, missing data,23branches, privacy and realXLSX uploads.');
