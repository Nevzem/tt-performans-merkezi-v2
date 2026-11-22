const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const read = file => readFileSync(join(__dirname, '..', file), 'utf8');
const host = { innerHTML: '', style: {}, className: '' };
const ctx = vm.createContext({
  document: { getElementById: () => host },
  DATA: { bayi: {
    DSL: [{b:'11 · Bayi',p:'Bayi & Ortak',g:58}],
    'Akıllı Cihaz': [{b:'12 · Bayi',p:'Cihaz Bayisi',g:52}],
    'Toplam TV': [{b:'13 · Bayi',p:'TV Bayisi',g:68}]
  }},
  DETAY: {bayiler:{}}, detayKod:'',
  DETAY_PRODS: ['Toplam Mobil','DSL'],
  fc: () => ({k:1.5,d:20,t:30}), gunInfo: () => ({kalanGun:10}),
  hgo3: () => 'y', hdrHTML: () => '', ftrHTML: parts => JSON.stringify(parts)
});
vm.runInContext(read('js/home.js'), ctx);
const sample = new Map([['mobil',101],['dsl',202],['tv',303],['cihaz',404]]);
for (const [input, code, risk] of [
  ['DSL','dsl','Bayi &amp; Ortak'],['Toplam TV','tv','TV Bayisi'],['Akıllı Cihaz','cihaz','Cihaz Bayisi']
]) {
  ctx.testProduct=input; ctx.kpis=Array.from(sample,([key,h])=>({key,h,a:20,hgo:10,kalan:h-20,gunluk:12,fcHgo:15,f:{k:1.5}}));
  const out=vm.runInContext('_hdInsightProd=testProduct; _hdPilotOverview(kpis)',ctx);
  assert.match(out,new RegExp('<strong>'+sample.get(code)+'</strong>'));
  assert.match(out,/<small>30 adet<\/small>/);
  assert(out.includes(risk));
}
assert.match(vm.runInContext("_hdHeroVK('')",ctx),/Örnek veri/);
ctx.DETAY.reportDate='2026-11-19';ctx.DETAY.closingDate='2026-11-30';
assert.match(vm.runInContext("_hdHeroVK('20.11.2026')",ctx),/Veri: 19\.11\.2026.*Kapanış: 30\.11\.2026/);

const dealer=read('js/render.js').split('function setDetayKod(k)')[1].split('/* ───── TREND')[0];
vm.runInContext('function setDetayKod(k)'+dealer,ctx);
vm.runInContext('renderDetay()',ctx);
assert.match(host.innerHTML,/bayi verisi yok/);
ctx.DETAY={bayiler:{99:{b:'Örnek',kod:'99',il:'Samsun',prods:{DSL:{h:100,a:0,g:0}}}},pers:{}};
vm.runInContext('renderDetay()',ctx);
assert.match(host.innerHTML,/id="detay-card"/);
assert.match(host.innerHTML,/Tahmini/);
assert.match(host.innerHTML,/"—","Mobil HGO"/);
assert.match(host.innerHTML,/personel verisi yok/);
assert(!host.innerHTML.includes('NaN'));
console.log('Premium pilot: product mapping, forecast quantity, date labels, empty states and dealer export anchor passed.');
