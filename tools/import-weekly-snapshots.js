/* Import exact dated sales cuts, without publishing personnel records.
 * node tools/import-weekly-snapshots.js <workbook.xlsx> [more workbooks...] */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),XLSX=require(path.join(root,'js/vendor/xlsx.full.min.js'));
const {extractWorkbook,columns,quantity}=require('./import-comparison-data.js');
function extract(file){
 const c=vm.createContext({console:{log(){},warn(){}},XLSX,Date,Set,document:{},localStorage:{getItem:()=>null,setItem(){}}});
 for(const name of ['data','parser','month-end-report'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8').replace(/^wire\("drop.*$/gm,''),c);
 c.wb=XLSX.read(fs.readFileSync(file));c.filename=path.basename(file);
 const snap=vm.runInContext("parsed=parseWB(wb,{fileName:filename});regional=parseEDMSheet(wb,{region:true});group=parseEDMSheet(wb,{group:true});merCaptureComparisonUpload(parsed,regional.error?null:regional.detay,group.error?null:group.detay)",c);
 if(!snap)throw Error('Dated sales snapshot unavailable: '+file);
 if(c.regional.error||c.group.error)throw Error('EDM scope unavailable: '+file);
 const independent=extractWorkbook(file);
 if(snap.date!==independent.date)throw Error('Date cross-check failed: '+file);
 for(const dealer of independent.dealers)for(const [key,value] of Object.entries(dealer.values))if(snap.rows['TTM:'+dealer.code]?.[key]!==value)throw Error('Actual cross-check failed: '+dealer.code+' '+key);
 if(snap.days.total!==independent.total||snap.days.elapsed!==independent.elapsed)throw Error('Forecast-day cross-check failed');
 const rows=XLSX.utils.sheet_to_json(c.wb.Sheets['TTM BUAY'],{header:1,defval:null}),hi=rows.findIndex(r=>r[0]==='Ana Bölge'),cols=columns(rows,hi);
 for(const dealer of independent.dealers){
  const row=rows.slice(hi+1).find(r=>String(r[2])===dealer.code),expected={};
  for(const [key,col] of Object.entries(cols)){if(String(rows[hi][col-1]).trim().toUpperCase()!=='HEDEF')throw Error('Target header mismatch');expected[key]=quantity(row[col-1]);}
  expected.mobil=expected.postpaid==null||expected.prepaid==null?null:expected.postpaid+expected.prepaid;
  for(const [key,h] of Object.entries(expected))if(snap.targets['TTM:'+dealer.code][key]!==h)throw Error('Target cross-check failed: '+dealer.code+' '+key);
 }
 return {...JSON.parse(JSON.stringify(snap)),sourceFile:path.basename(file)};
}
if(require.main===module){
 const files=process.argv.slice(2);if(!files.length)throw Error('Provide XLSX workbooks');
 const snapshots=files.map(extract).sort((a,b)=>a.date.localeCompare(b.date));
 if(new Set(snapshots.map(s=>s.date)).size!==snapshots.length)throw Error('Duplicate dates');
 fs.writeFileSync(path.join(root,'data/history/month-end-daily.json'),JSON.stringify({version:1,snapshots})+'\n');
 snapshots.forEach(s=>console.log(s.date,Object.keys(s.rows).length,'sales rows; verified against workbook actual columns'));
}
module.exports={extract};
