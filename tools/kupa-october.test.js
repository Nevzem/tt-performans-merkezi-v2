/* Run: node tools/kupa-october.test.js */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ctx = vm.createContext({
  console, DONEM: '2026/10', DETAY: {reportDate:'2026-10-08'},
  DATA: {bayi:{'Akıllı Cihaz':[]}}, KUPA: [], KUPA_PREV:null, PREV_DETAY:null,
  localStorage: {values:{},getItem(k){return this.values[k]||null;},
    setItem(k,v){this.values[k]=v;}},
  document: {getElementById(){return {className:'',style:{},innerHTML:''};}}
});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/kupa-v2.js'),'utf8'),ctx);
const run = js => vm.runInContext(js,ctx);
const rows=[
  {kod:'1',b:'A',il:'Samsun',dsl:100,mob:90,iptv:105,cihaz:25},
  {kod:'2',b:'B',il:'Sinop',dsl:160,mob:80,iptv:104.9,cihaz:140},
  {kod:'3',b:'C',il:'Tokat',dsl:120,mob:110,iptv:106,cihaz:50},
  {kod:'4',b:'D',il:'Çorum',dsl:null,mob:95,iptv:105,cihaz:150}
];
ctx.rawRows=rows;
const october=Array.from(run('kupaApplyPeriodRules(rawRows.map(x=>({...x})))'));
assert.deepEqual(october.map(r=>r.kod),['2','3','1','4']);
assert.equal(october.find(r=>r.kod==='1').toplam,1150);
assert.equal(october.find(r=>r.kod==='2').toplam,1520);
assert.equal(october.find(r=>r.kod==='3').toplam,1390);
assert.equal(october.find(r=>r.kod==='4').toplam,null);
assert.equal(october.find(r=>r.kod==='2').pDsl,1120,'No 130% ceiling in October');
assert.ok(october.every(r=>r.pIptv===0),'IPTV is bonus only');
assert.equal(october.find(r=>r.kod==='1').bonus,true);
assert.equal(october.find(r=>r.kod==='2').bonus,false);
assert.equal(october.find(r=>r.kod==='4').bonus,true,'IPTV condition independent of score completeness');
assert.match(run('renderKupaRules()'),/2\.250 TL/);
assert.match(run('renderKupaRules()'),/1\.250 TL/);
assert.match(run('renderKupaHeader()'),/EKİM 2026/);
const tierHtml=run('renderKupaMovers(kupaApplyPeriodRules(rawRows.map(x=>({...x}))).filter(x=>x.toplam!=null),null,kupaApplyPeriodRules(rawRows.map(x=>({...x}))))');
assert.match(tierHtml,/IPTV HGO %105/);
assert.match(tierHtml,/3 BAYİ/,'Bonus counts all 4 rows, even an incomplete score');
assert.equal(run('kupaSnapKey()'),'tt_kuzey_kupa_snap_2026_10_v1');
ctx.DONEM='2026/09';
const september=Array.from(run('kupaApplyPeriodRules(rawRows.map(x=>({...x})))'));
assert.equal(september.find(r=>r.kod==='2').pDsl,1040,'Old September cap retained');
assert.equal(september.find(r=>r.kod==='2').bonus,true,'September cihaz bonus retained');
assert.equal(september.find(r=>r.kod==='1').bonus,false);
assert.match(run('renderKupaRules()'),/DSL ×8/);
assert.match(run('renderKupaHeader()'),/EYLÜL 2026/);
assert.equal(run('kupaSnapKey()'),'tt_kuzey_kupa_snap_2026_09_v1');
ctx.DONEM='2026/06';
assert.equal(run('kupaApplyPeriodRules(rawRows.map(x=>({...x}))).length'),0);
console.log('Kupa October: 2-product points, IPTV bonus, prizes, missing data, and September isolation passed.');
