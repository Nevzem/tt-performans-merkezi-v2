// Run: node tests/ttm-upload-dates.test.cjs
// Tests one-sheet imports, date entry, forecast propagation and cancellation.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function element(){
  return {value:'',textContent:'',hidden:true,onclick:null,events:{},
    addEventListener(type,cb){this.events[type]=cb;},
    removeEventListener(type){delete this.events[type];},
    focus(){this.focused=true;},
    querySelector(){return {textContent:''};}};
}
const nodes={};
const doc={
  getElementById(id){return nodes[id]||(nodes[id]=element());},
  addEventListener(){},removeEventListener(){}
};
const env={document:doc,console,APP_CONFIG:{
  bolge:'KUZEY ANADOLU',grup:'ANADOLU',
  ttmSY:['YUSUF DILKI','KORAY YEŞİLÖRDEK']
},XLSX:{utils:{sheet_to_json:sheet=>sheet.rows}}};
vm.createContext(env);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/parser.js'),'utf8'),env);

const rows=[Array(85).fill(null),Array(85).fill(null),Array(85).fill(null)];
for(const [index,product] of [[49,'POSTPAID'],[53,'PREPAID'],[57,'DSL'],[69,'IPTV'],[73,'TİVİBU UYDU'],[77,'Akıllı Cihaz']])rows[1][index]=product;
for(const [index,label] of [[0,'Ana Bölge'],[1,'Bölge'],[2,'Bayi Kodu'],[3,'Bayi Adı'],[4,'Ana Bayi Kodu'],[5,'İl'],[6,'Bölge Müdürü'],[7,'Satış Yöneticisi'],[8,'Dönem']])rows[2][index]=label;
function dealer(code,sy){
  const row=Array(85).fill(null);
  Object.assign(row,{0:'ANADOLU',1:'KUZEY ANADOLU',2:code,3:'TEST BAYİ '+code,4:code,5:'SAMSUN',6:'SADI UR',7:sy,8:'202611'});
  for(const [index,h,a] of [[49,100,50],[53,50,25],[57,40,20],[69,20,10],[73,10,5],[77,15,8]]){row[index]=h;row[index+1]=a;}
  return row;
}
rows.push(dealer('500733','YUSUF DILKI'));
rows.push(dealer('4036313','KORAY YEŞİLÖRDEK'));
const book={SheetNames:['Sheet1'],Sheets:{Sheet1:{rows}}};
const parsed=vm.runInContext("parseWB(book, {fileName:'ttm-only.xlsx'})",Object.assign(env,{book}));
assert.equal(parsed.donem,'2026/11');
assert.equal(parsed.bayiCount,2);
assert.equal(parsed.partial.ttmOnly,true);
assert.equal(parsed.detay.reportDate,null);

(async()=>{
  const pending=env.promptUploadDates(parsed);
  assert.equal(nodes['upload-date-overlay'].hidden,false);
  assert.equal(nodes['upload-close-date'].value,'2026-11-30');
  nodes['upload-data-date'].value='2026-11-17';
  nodes['upload-data-date'].events.input();
  assert.match(nodes['upload-date-summary'].textContent,/17 gün verisi \/ 30 gün kapanış/);
  nodes['upload-date-confirm'].onclick();
  const selected=await pending;
  assert.equal(selected.elapsed,17);
  assert.equal(selected.total,30);
  assert.equal(nodes['upload-date-overlay'].hidden,true);

  env.applyUploadDates(parsed,selected);
  assert.equal(parsed.detay.reportDate,'2026-11-17');
  assert.equal(parsed.detay.closingDate,'2026-11-30');
  assert.equal(parsed.detay.reportDateSource,'Yükleme sırasında seçilen veri tarihi');
  assert.equal(parsed.syData.calisilanGun,17);
  assert.equal(parsed.syData.calismaGun,30);
  const expected=88.2; // 75 / 150 * (30/17) * 100, one decimal.
  assert.equal(parsed.syData.sy['YUSUF DILKI']['Mobil Toplam'].f,expected);

  for(const pair of [
    ['2026-11-31','2026-11-30'],
    ['2026-11-30','2026-11-17'],
    ['2026-12-01','2026-12-31'],
    ['','2026-11-30'],
    ['2026-11-17','2026-12-01']]){
    assert.throws(()=>env.validateUploadDates('2026/11',...pair));
  }
  const again=env.promptUploadDates(parsed);
  nodes['upload-date-cancel'].onclick();
  await assert.rejects(again,/Tarih seçimi iptal edildi/);
  assert.equal(nodes['upload-date-overlay'].hidden,true);
  console.log('Single sheet TTM date entry & forecast regression passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
