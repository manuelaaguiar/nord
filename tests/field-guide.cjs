const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const window={};vm.runInNewContext(fs.readFileSync('public/nord/field-guide-content.js','utf8'),{window});
vm.runInNewContext(fs.readFileSync('public/nord/field-guide.js','utf8'),{window,encodeURIComponent,URL,Blob,Error,JSON});
const D=window.NordFieldGuideData,G=window.NordFieldGuide;
assert.ok(D&&G);
assert.equal(D.checkedAt,'2026-10-10');
assert.ok(D.essentials.length>=8);
assert.ok(D.routes.length>=6);
assert.ok(D.packing.length>=3);
assert.ok(D.moments.length>=1);
assert.ok(D.faq.length>=1);
assert.equal(new Set(D.essentials.map(x=>x.id)).size,D.essentials.length);
assert.ok(Object.values(D.sources).every(s=>/^https:\/\//.test(s.url)));

const home=G.render(()=>null);
assert.match(home,/Baixar guia de bolso/);
assert.match(home,/Essenciais/);
assert.match(home,/Roteiros/);
assert.match(home,/Malas/);
assert.match(home,/Embarque com o básico/);
assert.match(home,/10\/10\/2026/);
assert.doesNotMatch(home,/undefined|NaN|<script/i);
assert.doesNotMatch(home,/2026-10-10/);

G.select('query','passaporte');
const search=G.render(()=>null);
assert.match(search,/resultado/);
assert.match(search,/Passaporte/i);
assert.ok((search.match(/data-field-section/g)||[]).length>=1);

G.select('query','');
G.select('section','start');
G.select('priority','1');
const p1=G.render(()=>null);
assert.match(p1,/Passaporte em mãos/);
assert.match(p1,/P1 · Indispensável/);
assert.doesNotMatch(p1,/Escolher uma experiência principal por dia/);

G.select('priority','3');
const p3=G.render(()=>null);
assert.match(p3,/experiência principal/);
assert.doesNotMatch(p3,/Passaporte em mãos/);

G.select('priority','all');
G.select('section','routes');
const routes=G.render(()=>null);
assert.match(routes,/Círculo Dourado|Madrid/);
G.select('region','Islândia');
assert.match(G.render(()=>null),/Islândia|Reykjav/);
assert.doesNotMatch(G.render(()=>null),/Plaza Mayor/);

const state={tasks:[],route:[],archivedRoute:[],bags:[]};
assert.equal(G.addToState(state,'tasks','passport'),true);
assert.equal(state.tasks[0].id,'guide-passport');
assert.equal(G.addToState(state,'tasks','passport'),false);
const pocket=G.offlineHTML();
assert.match(pocket,/lang="pt-BR"/);
assert.match(pocket,/10\/10\/2026/);
assert.doesNotMatch(pocket,/<script/i);

const src=fs.readFileSync('public/nord/field-guide.js','utf8');
assert.doesNotMatch(src,/\bfetch\(|XMLHttpRequest|localStorage|\/api\//);
assert.doesNotMatch(fs.readFileSync('public/nord/field-guide-content.js','utf8'),/@gmail|drive\.google\.com\/file/);
console.log('PASS: field guide content loads, search returns matches, priority/region filters apply, pocket copy uses pt-BR dates, no private markers or network calls.');
