// Regression test: the single-sheet 3-row TTM export must remain importable.
// Run: node tests/ttm-only-report.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const code = fs.readFileSync(path.join(__dirname, '../js/parser.js'), 'utf8');
const context = {
  APP_CONFIG: {bolge:'KUZEY ANADOLU',grup:'ANADOLU',ttmSY:['YUSUF DILKI','KORAY YEŞİLÖRDEK']},
  XLSX: {utils:{sheet_to_json:(sheet)=>sheet.rows}},
  document: {getElementById:()=>({addEventListener(){}})},
  console
};
vm.createContext(context);
vm.runInContext(code, context, {filename:'js/parser.js'});

const rows=[Array(85).fill(null),Array(85).fill(null),Array(85).fill(null)];
for(const [col,product] of [[49,'POSTPAID'],[53,'PREPAID'],[57,'DSL'],[69,'IPTV'],[73,'TİVİBU UYDU'],[77,'Akıllı Cihaz'],[81,'Diğer']])rows[1][col]=product;
for(const [col,label] of [[0,'Ana Bölge'],[1,'Bölge'],[2,'Bayi Kodu'],[3,'Bayi Adı'],[4,'Ana Bayi Kodu'],[5,'İl'],[6,'Bölge Müdürü'],[7,'Satış Yöneticisi'],[8,'Dönem']])rows[2][col]=label;
for(let col=9;col<85;col+=4)for(let k=0;k<4;k++)rows[2][col+k]=['Hedef','Aktivasyon','HGO','Bekleyen'][k];

function dealer(code,manager,region,factor){
  const r=Array(85).fill(null);
  Object.assign(r,{0:'ANADOLU',1:region,2:code,3:'Test Bayi '+code,4:code,5:'SAMSUN',6:'SADI UR',7:manager,8:'202611'});
  for(const [col,h,a] of [[49,20,10],[53,10,7],[57,8,4],[69,5,3],[73,3,1],[77,4,2],[81,6,3]]){
    r[col]=h*factor;r[col+1]=a*factor;
  }
  return r;
}
rows.push(dealer('500733','YUSUF DILKI','KUZEY ANADOLU',1));
rows.push(dealer('4100676','KORAY YEŞİLÖRDEK','KUZEY ANADOLU',2));
rows.push(dealer('987654','DIŞ BÖLGE','ORTA ANADOLU',3));

function parse(book){
  context.book=book;
  return vm.runInContext("parseWB(book, {fileName:'ttm-only.xlsx'})", context);
}
const single=parse({SheetNames:['Sheet1'],Sheets:{Sheet1:{rows}}});
assert.equal(single.partial.ttmOnly,true);
assert.equal(single.partial.hasEDMSheet,false);
assert.equal(single.donem,'2026/11');
assert.equal(single.bayiCount,2);
assert.equal(single.persCount,0);
assert.equal(Object.keys(single.detay.bayiler).length,2);
assert.equal(single.detay.bayiler['500733'].prods['Toplam Mobil'].h,30);
assert.equal(single.detay.bayiler['500733'].prods['Toplam Mobil'].a,17);
assert.equal(single.detay.bayiler['500733'].prods['DSL'].a,4);
assert.equal(single.detay.bayiler['500733'].prods['Toplam TV'].a,4);
assert.equal(single.syData.sy['YUSUF DILKI']['Mobil Toplam'].a,17);
assert.equal(single.syData.sy['KORAY YEŞİLÖRDEK']['Mobil Toplam'].a,34);

const named=parse({SheetNames:['TTM BUAY'],Sheets:{'TTM BUAY':{rows}}});
assert.equal(named.bayiCount,2);
const staffHead=Array(64).fill(null);staffHead[0]='Ana Bölge';
const staff=Array(64).fill(null);Object.assign(staff,{1:'KUZEY ANADOLU',3:'Test Bayi 500733',4:'YUSUF DILKI',5:'SAMSUN',6:'Personel A',7:'202611',38:10,39:5,41:5,42:3,44:3,45:2});
const full=parse({SheetNames:['ÇALIŞAN','TTM BUAY'],Sheets:{'ÇALIŞAN':{rows:[staffHead,staff]},'TTM BUAY':{rows}}});
assert.equal(full.partial.ttmOnly,false);
assert.equal(full.persCount,1);
assert.equal(full.bayiCount,2);
assert.throws(()=>parse({SheetNames:['Sheet1'],Sheets:{Sheet1:{rows:[['irrelevant']]}}}),/TTM/);

console.log('TTM-only and existing multi-sheet regression checks passed.');
