/* Build comparison-only TTM national actuals from original closing workbooks.
 * Usage: node tools/import-comparison-data.js <directory> [additional-directory...]
 * Keeps existing branch histories unchanged. Header labels identify actuals,
 * national summary rows are deduplicated, and period/day metadata is verified. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),XLSX=require(path.join(root,'js/vendor/xlsx.full.min.js'));
const aliases={postpaid:['POSTPAID'],prepaid:['PREPAID'],dsl:['DSL'],iptv:['IPTV'],uydu:['TIVIBU UYDU','UYDU'],akilliCihaz:['AKILLI CIHAZ'],digerCihaz:['DIGER','DIGER CIHAZ']};
function norm(value){return String(value||'').replace(/ı/g,'i').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim().replace(/\s+/g,' ');}
function quantity(value){if(value==='-')return 0;if(value==null||String(value).trim()==='')return null;const n=typeof value==='number'?value:/^\d+$/.test(String(value).trim())?Number(value):NaN;const rounded=Math.round(n);return Number.isSafeInteger(rounded)&&rounded>=0&&Math.abs(n-rounded)<1e-6?rounded:null;}
function columns(rows,hi){
 const out={};let product='';for(let col=0;col<(rows[hi]||[]).length;col++){
  if(rows[hi-1]?.[col])product=norm(rows[hi-1][col]);
  else if(norm(rows[hi][col])==='HEDEF')product='';
  if(!/^(AKTIVASYON|GERCEKLESEN|AKT|AKT\.)$/.test(norm(rows[hi][col])))continue;
  for(const [key,names] of Object.entries(aliases))if(names.includes(product)){if(out[key]!=null)throw Error('Ambiguous actual column: '+key);out[key]=col;}
 }
 for(const key in aliases)if(out[key]==null)throw Error('Missing actual column: '+key);
 return out;
}
function values(row,cols){const result={};for(const key in cols)result[key]=quantity(row[cols[key]]);result.mobil=result.postpaid==null||result.prepaid==null?null:result.postpaid+result.prepaid;return result;}
function national(rows,cols){const nationalRows=rows.filter(r=>['TURKIYE'].includes(norm(r[1])));if(!nationalRows.length)throw Error('TTM national actuals missing');const result={};for(const key of [...Object.keys(aliases),'mobil']){const list=nationalRows.map(r=>values(r,cols)[key]).filter(v=>v!=null);if(!list.length||new Set(list).size!==1)throw Error('Missing/conflicting national actual: '+key);result[key]=list[0];}return result;}
function verifyNational(wb,expected){
 const name=wb.SheetNames.find(n=>norm(n)==='SY-BAYI TTM');if(!name||!wb.Sheets[name])throw Error('Independent TTM summary missing');
 const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:null}),header=rows[3]||[],groups=rows[2]||[];
 const map={},names={FATURALI:'postpaid',FATURASIZ:'prepaid','MOBIL TOPLAM':'mobil',DSL:'dsl',CIHAZ:'akilliCihaz','CIHAZ DIGER TERMINAL GRUP':'digerCihaz'};
 let group='';for(let i=0;i<header.length;i++){if(groups[i])group=norm(groups[i]);const h=norm(header[i]);if(h==='SATIS'&&names[group]&&map[names[group]]==null)map[names[group]]=i;if(h==='IPTV'||h==='IPTV AKT')map.iptv=i;if(h==='UYDU'||h==='UYDU AKT')map.uydu=i;}
 const entries=rows.filter(r=>norm(r[1])==='TURKIYE');
 for(const key of Object.keys(expected))if(map[key]==null)throw Error('Independent product column missing: '+key);
 const first=entries.find(r=>Object.keys(expected).every(key=>quantity(r[map[key]])!=null));
 if(!first)throw Error('Independent national summary missing');
 // Later SY blocks can repeat different header layouts; verify the first global
 // summary against its own top-of-sheet header, never mix those later blocks.
 for(const key of Object.keys(expected))if(quantity(first[map[key]])!==expected[key])throw Error('National summary cross-check failed: '+key);
}
function extractWorkbook(file){
 const wb=XLSX.read(fs.readFileSync(file),{sheets:['TTM BUAY','Kokpitt Data TTM','SY ÖZET','SY-BAYİ TTM','SY-BAYİ TTM ']});
 const name=wb.SheetNames.find(n=>['TTM BUAY','KOKPITT DATA TTM'].includes(norm(n)));
 if(!name||!wb.Sheets[name])throw Error('TTM actuals sheet missing');
 const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:null}),hi=rows.findIndex(r=>norm(r[0])==='ANA BOLGE');
 if(hi<1)throw Error('TTM header missing');const cols=columns(rows,hi),body=rows.slice(hi+1);
 const periods=[...new Set(body.map(r=>String(r[8]||'').replace('/','')).filter(v=>/^20\d{2}(0[1-9]|1[012])$/.test(v)))];if(periods.length!==1)throw Error('Mixed/unknown reporting periods');
 const period=periods[0].slice(0,4)+'-'+periods[0].slice(4),syName=wb.SheetNames.find(n=>norm(n)==='SY OZET');
 const summary=XLSX.utils.sheet_to_json(wb.Sheets[syName],{header:1,defval:null});
 const dayRow=summary.find(r=>norm(r[0])==='CALISILAN GUN'),totalRow=summary.find(r=>norm(r[0])==='CALISMA GUNU');
 const elapsed=quantity(dayRow?.[1]),total=quantity(totalRow?.[1]);
 if(!(elapsed>0&&total>0&&elapsed<=total))throw Error('Report-day metadata missing');
 const closed=elapsed===total,lastDay=new Date(Date.UTC(+period.slice(0,4),+period.slice(5),0)).getUTCDate();
 const context=vm.createContext({XLSX,console,Date,document:{},localStorage:{getItem:()=>null}});
 vm.runInContext(fs.readFileSync(path.join(root,'js/parser.js'),'utf8').replace(/^wire\("drop.*$/gm,''),context);
 context.workbook=wb;context.period=period;context.filename=path.basename(file);context.days={calismaGun:total,calisilanGun:elapsed};
 const info=vm.runInContext('workbookReportDate(workbook,period,filename,days)',context);
 const reportDate=closed?period+'-'+String(lastDay).padStart(2,'0'):info.date;
 if(!reportDate)throw Error('Partial report date missing');
 const tr=national(body,cols),seen=new Set(),dealers=[];verifyNational(wb,tr);
 for(const r of body){const code=String(r[2]||'');if(norm(r[1])!=='KUZEY ANADOLU'||!/^\d+$/.test(code)||seen.has(code))continue;seen.add(code);dealers.push({code,name:String(r[3]||code),region:String(r[1]),values:values(r,cols)});}
 return {period,date:reportDate,closed,sourceFile:path.basename(file),sourceSheet:name,channel:'TTM',values:tr,dealers,forecastFactor:total/elapsed,elapsed,total};
}
function build(directories){
 const result={version:1,channel:'TTM',source:'Original monthly closing workbooks: TTM national activation summary rows',periods:{},snapshots:[]};
 const files=directories.flatMap(dir=>fs.readdirSync(dir).filter(f=>f.endsWith('.xlsx')).map(f=>path.join(dir,f))).sort();
 for(const file of files){
  const item=extractWorkbook(file);if(item.closed){
   const entry={reportDate:item.date,channel:'TTM',values:item.values,sourceFile:item.sourceFile,sourceSheet:item.sourceSheet};
   if(result.periods[item.period]&&JSON.stringify(result.periods[item.period].values)!==JSON.stringify(item.values))throw Error('Conflicting workbooks for '+item.period);
   result.periods[item.period]=entry;
  }
  result.snapshots.push({period:item.period,date:item.date,closed:item.closed,dealers:item.dealers,tr:item.values,forecastFactor:item.forecastFactor,sourceFile:item.sourceFile});
  console.log(item.period,item.date,item.closed?'closing':'partial','TTM',item.values.mobil,'mobile',item.dealers.length,'regional dealers');
 }
 result.periods=Object.fromEntries(Object.entries(result.periods).sort(([a],[b])=>a.localeCompare(b)));
 return result;
}
if(require.main===module){const dirs=process.argv.slice(2);if(!dirs.length)throw Error('Provide workbook directories');const output=build(dirs);for(const year of [2025,2026])for(let m=1;m<=(year===2025?12:9);m++){const key=year+'-'+String(m).padStart(2,'0');if(!output.periods[key])throw Error('Closing month missing: '+key);}fs.writeFileSync(path.join(root,'data/history/bayi-comparison-data.json'),JSON.stringify(output,null,1)+'\n');console.log('Saved',Object.keys(output.periods).length,'national closing months and',output.snapshots.length,'daily snapshots');}
module.exports={quantity,columns,values,national,verifyNational,extractWorkbook,build};
