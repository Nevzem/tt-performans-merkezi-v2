/* Run with: node tools/commitment-png.test.js */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'js/commitment-tracker.js'),'utf8');
const makeRow=(code,mob,dsl,kind)=>({
  kod:String(code),fullName:code===1?'<&> Mağazası':'Bayi '+code,
  il:'SAMSUN',sy:'Yönetici',bolge:'KUZEY ANADOLU',bt:kind||'',
  commitments:kind?{mobilUpsell:mob,dsl}:{mobil:mob,dsl}
});
let exportCount=0,shareCount=0,cleanupCount=0,outputName='';
const parent={
  appendChild(el){el.parentNode=this;this.last=el;},
  removeChild(el){assert.equal(el,this.last);this.last=null;cleanupCount++;}
};
const controls={
  'ct-png-button':{disabled:false,textContent:'↗ PNG Paylaş'},
  'ct-png-controls':{innerHTML:''}
};
const document={
  body:parent,
  getElementById:k=>controls[k]||null,
  querySelectorAll:()=>[],
  createElement:tag=>{
    const el={tagName:tag,className:'',style:{}};
    Object.defineProperty(el,'innerHTML',{set(str){this.markup=str;this.firstElementChild={markup:str}},get(){return this.markup}});
    return el;
  }
};
const ctx=vm.createContext({
  console,document,MER_LIVE:null,MER_ARCHIVES:{},
  captureExportImage:async(target,opts)=>{
    exportCount++;assert.match(target.markup,/Şube Bazlı/);
    assert.equal(opts.scale,2);assert.equal(opts.width,1120);
    return {toDataURL:()=> 'data:image/png;base64,eA=='};
  },
  _openSharePreview:(data,name,meta)=>{
    shareCount++;outputName=name;
    assert.equal(data,'data:image/png;base64,eA==');
    assert.match(meta.text,/Kuzey Anadolu/);
  },
  alert:msg=>{throw new Error(msg)}
});
vm.runInContext(source,ctx);
const run=str=>vm.runInContext(str,ctx);
const ttm={},edm={};
for(let i=1;i<=23;i++)ttm[i]=makeRow(i,i*3,i);
for(let i=24;i<=78;i++)edm[i]=makeRow(i,i*2,i,'TTBN');
edm[79]=makeRow(79,3,0,'ESN');
ctx.MER_LIVE={period:'2026-10',ttm:{reportDate:'2026-10-13',bayiler:ttm},edm:{bayiler:edm}};
assert.equal(run('ctViewRows().length'),23);
assert.equal(run('ctPngPageCount(ctViewRows())'),1);
const html=run('ctPngMarkup(ctViewRows(),ctPngSlice(ctViewRows(),1),ctSource().value,false)');
assert.match(html,/13\.10\.2026/);
assert.match(html,/Şube Bazlı/);
assert.match(html,/FORECAST DEĞİL/);
assert.match(html,/23 şubeyi kapsar/);
assert.match(html,/&lt;&amp;&gt; Mağazası/);
assert.match(html,/SAYFA 1 \/ 1/);
run("CT_CHANNEL='TTBN';CT_PNG_PAGE=2;");
assert.equal(run('ctViewRows().length'),55);
assert.equal(run('ctPngPageCount(ctViewRows())'),3);
assert.equal(run('ctPngSlice(ctViewRows(),2).rows.length'),24);
assert.equal(run('ctPngSlice(ctViewRows(),3).rows.length'),7);
assert.match(run('ctPngControls(ctViewRows())'),/Sayfa 2 \/ 3/);
assert.match(run('ctPngMarkup(ctViewRows(),ctPngSlice(ctViewRows(),2),ctSource().value,false)'),/25–48 \/ 55 şube/);
run("CT_CHANNEL='TTM';CT_PNG_PAGE=1;");
(async()=>{
  await run('ctSharePNG()');
  assert.equal(exportCount,1);
  assert.equal(shareCount,1);
  assert.equal(cleanupCount,1);
  assert.equal(outputName,'TT_Taahhut_TTM_13102026_Sayfa1.png');
  assert.equal(controls['ct-png-button'].disabled,false);
  assert.equal(controls['ct-png-button'].textContent,'↗ PNG Paylaş');
  console.log('PASS: premium PNG exports current filtered branch data, paginates EDM, escapes names, shares and cleans up.');
})().catch(e=>{console.error(e);process.exitCode=1;});
