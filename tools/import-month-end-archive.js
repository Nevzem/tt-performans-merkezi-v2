/* Save a verified closing workbook as a shared, complete monthly archive.
 * Usage: node tools/import-month-end-archive.js <xlsx-path> */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const root=path.join(__dirname,'..'),input=process.argv[2];
if(!input)throw Error('Provide a closing XLSX path');
const XLSX=require(path.join(root,'js/vendor/xlsx.full.min.js'));
const wb=XLSX.read(fs.readFileSync(input),{type:'buffer'});
const context=vm.createContext({console:{log(){},warn:console.warn},XLSX,localStorage:{getItem:()=>null},Set,Date,document:{}});
vm.runInContext(fs.readFileSync(path.join(root,'js/data.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'js/parser.js'),'utf8').replace(/^wire\("drop.*$/gm,''),context);
context.workbook=wb;
const parsed=vm.runInContext('parseWB(workbook)',context);
const period=parsed.donem.replace('/','-'),days=parsed.syData;
if(!/^\d{4}-\d{2}$/.test(period))throw Error('Invalid reporting period');
if(parsed.warnings.length)throw Error(parsed.warnings.join('\n'));
if(!(days.calismaGun>0 && days.calisilanGun>=days.calismaGun))throw Error('Workbook is not a verified month-end closing');
const edm=vm.runInContext('parseEDMSheet(workbook,{region:true})',context);
if(wb.SheetNames.some(n=>n.trim().toUpperCase()==='EDM BUAY') && edm.error)throw Error(edm.error);
cp.execFileSync(process.execPath,[path.join(__dirname,'excel-to-history.js'),input],{stdio:'inherit'});
const output=path.join(root,'data/history',period+'.json'),doc=JSON.parse(fs.readFileSync(output,'utf8'));
if(doc.dealers.length!==Object.keys(parsed.detay.bayiler).length)throw Error('Regional branch count mismatch');
const productMap={postpaid:'Postpaid',prepaid:'Prepaid',mobil:'Toplam Mobil',dsl:'DSL',iptv:'IPTV',uydu:'Uydu',akilliCihaz:'Akıllı Cihaz',digerCihaz:'Diğer Cihaz'};
for(const d of doc.dealers)for(const [hist,key] of Object.entries(productMap)){
  const value=parsed.detay.bayiler[d.bayiKodu].prods[key];
  if(d[hist].hedef!==value.h || d[hist].adet!==value.a)throw Error('Mismatch: '+d.bayiKodu+' '+key);
}
doc.monthEnd={period,ttm:parsed.detay,edm:edm.error?null:edm.detay,matrix:parsed.matrix,sy:parsed.syData,publishedAt:new Date().toISOString(),sourceFile:path.basename(input),sample:false,closed:true,history:false};
fs.writeFileSync(output,JSON.stringify(doc,null,1)+'\n');
console.log('Saved complete archive:',period,'·',doc.dealers.length,'TTM branches ·',parsed.persCount,'personnel');
