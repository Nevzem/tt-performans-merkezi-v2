/* Run with: node tools/commitment-png.test.js */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/commitment-tracker.js'),'utf8');
const makeRow=(code,mob,dsl,kind)=>({
  kod:String(code),fullName:code===1?'<&> Mağazası':'Bayi '+code,
  il:'SAMSUN',sy:'Yönetici',bolge:'KUZEY ANADOLU',bt:kind||'',
  commitments:kind?{mobilUpsell:mob,dsl}:{mobil:mob,dsl}
});
let exportCount=0,shareCount=0,cleanupCount=0,outputName='',failCapture=false;
const alerts=[];
const parent={
  appendChild(el){el.parentNode=this;this.last=el;},
  removeChild(el){assert.equal(el,this.last);this.last=null;cleanupCount++;}
};
const controls={
  'ct-png-button':{disabled:false,textContent:'↗ PNG Paylaş'},
  'ct-png-controls':{innerHTML:''}
};
const document={
  body:parent,fonts:{ready:Promise.resolve()},
  getElementById:k=>controls[k]||null,
  querySelectorAll:()=>[],
  createElement:tag=>{
    const el={tagName:tag,className:'',style:{}};
    Object.defineProperty(el,'innerHTML',{set(str){this.markup=str;this.firstElementChild={markup:str,scrollHeight:2100}},get(){return this.markup}});
    return el;
  }
};
const ctx=vm.createContext({
  console,document,MER_LIVE:null,MER_ARCHIVES:{},
  captureExportImage:async(target,opts)=>{
    exportCount++;
    assert.match(target.markup,/TTM Taahhüt Takibi/);
    assert.match(target.markup,/23 TTM/);
    for(let code=1;code<=23;code++)assert.ok(target.markup.includes('class="ct-png-code">'+code+'</td>'), 'Every TTM included: '+code);
    for(let code=24;code<=79;code++)assert.ok(!target.markup.includes('class="ct-png-code">'+code+'</td>'), 'EDM excluded: '+code);
    assert.doesNotMatch(target.markup,/EDM|Upsell|Yönetici|ct-png-rank|ct-png-growth/);
    assert.equal((target.markup.match(/class="ct-png-stat"/g)||[]).length,2);
    assert.match(target.markup,/<strong>828<\/strong>/);
    assert.match(target.markup,/<strong>276<\/strong>/);
    assert.match(target.markup,/<tfoot>.*>828<\/td>.*>276<\/td><\/tr><\/tfoot>/);
    assert.equal(opts.scale,2);assert.equal(opts.width,1120);
    assert.equal(opts.height,2100);assert.equal(opts.backgroundColor,'#ffffff');
    if(failCapture)throw new Error('capture failed');
    return {toDataURL:()=> 'data:image/png;base64,eA=='};
  },
  _openSharePreview:(data,name,meta)=>{
    shareCount++;outputName=name;
    assert.equal(data,'data:image/png;base64,eA==');
    assert.equal(meta.text,'TTM Taahhüt Takibi · 13.10.2026');
  },
  alert:msg=>alerts.push(msg)
});
vm.runInContext(source,ctx);
const run=str=>vm.runInContext(str,ctx);
const ttm={},edm={};
for(let i=1;i<=23;i++)ttm[i]=makeRow(i,i*3,i);
for(let i=24;i<=78;i++)edm[i]=makeRow(i,9000,8000,'TTBN');
edm[79]=makeRow(79,9000,8000,'ESN');
ctx.MER_LIVE={period:'2026-10',ttm:{reportDate:'2026-10-13',bayiler:ttm},edm:{bayiler:edm}};
assert.equal(run('ctViewRows().length'),23);
const html=run('ctPngMarkup(ctRows(ctSource().value),null,ctSource().value,false)');
assert.match(html,/13 EKİM 2026/);
assert.match(html,/13\.10\.2026/);
assert.match(html,/&lt;&amp;&gt; Mağazası/);
assert.doesNotMatch(html,/EDM|Upsell|SAYFA|Yönetici/);
assert.ok(html.indexOf('class="ct-png-code">23</td>')<html.indexOf('class="ct-png-code">1</td>'),'Sort by TTM mobile descending');
const missing=run("ctPngMarkup([{kind:'TTM',code:'111',name:'Eksik',mobileTTM:null,dsl:0},{kind:'TTM',code:'222',name:'Sıfır',mobileTTM:0,dsl:null}],null,ctSource().value,true)");
assert.match(missing,/1\/2 bayi verisi/);
assert.match(missing,/<strong>0<\/strong>/);
assert.match(missing,/>—<\/td>/);
assert.match(missing,/Son yüklenen rapor/);
assert.match(missing,/Raporda veri yok/);
assert.equal(run("ctPngDate({period:'2026-10',ttm:{}})"),'2026-10');
(async()=>{
  // Sharing must include all TTM even while screen filters select EDM or no rows.
  run("CT_CHANNEL='TTBN';CT_QUERY='does not match any branch';CT_CITY='TOKAT';CT_PNG_PAGE=2");
  assert.match(run('ctPngControls()'),/Yalnızca TTM · Tüm 23 bayi/);
  await run('ctSharePNG()');
  assert.equal(exportCount,1);assert.equal(shareCount,1);assert.equal(cleanupCount,1);
  assert.equal(outputName,'TTM_Taahhut_Takibi_13102026.png');
  assert.equal(controls['ct-png-button'].disabled,false);
  assert.equal(controls['ct-png-button'].textContent,'↗ PNG Paylaş');
  assert.equal(alerts.length,0);
  failCapture=true;
  await run('ctSharePNG()');
  assert.equal(cleanupCount,2);assert.equal(shareCount,1);
  assert.equal(controls['ct-png-button'].disabled,false);
  assert.match(alerts.pop(),/PNG oluşturulamadı: capture failed/);
  ctx.MER_LIVE.ttm.bayiler={};
  run('ctUpdateResults()');
  assert.equal(controls['ct-png-button'].disabled,true,'EDM-only source cannot enable TTM sharing');
  await run('ctSharePNG()');
  assert.equal(exportCount,2,'Do not export EDM when TTM is absent');
  assert.match(alerts.pop(),/TTM bayisi bulunamadı/);
  assert.equal(parent.last,null);
  console.log('PASS: TTM-only PNG, exact totals, complete list despite screen filters, missing/zero values, escaped names, sharing and failure cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1;});
