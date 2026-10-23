const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const window={};
vm.runInNewContext(fs.readFileSync('public/nord/local-travel.js','utf8'),{window,crypto,TextEncoder,Date,Promise,Error,JSON});
vm.runInNewContext(fs.readFileSync('public/nord/field-guide-content.js','utf8'),{window});
vm.runInNewContext(fs.readFileSync('public/nord/planner.js','utf8'),{window});
const P=window.NordPlanner,N=window.NordLocal;
assert.equal(P.matchGuide('madrid','').id,'madrid');
assert.equal(P.matchGuide('Madri','ES').id,'madrid');
assert.equal(P.matchGuide('Espanha','MAD').id,'madrid');
assert.equal(P.matchGuide('Spain','world-ESP').id,'madrid');
assert.equal(P.matchGuide('Islândia','IS').id,'iceland');
assert.equal(P.matchGuide('Reykjavik','REK').id,'iceland');
assert.equal(P.matchGuide('Oslo',''),null);
assert.equal(P.matchGuide('Destino de teste',''),null);

const madrid5=P.generate({name:'Outono em Madrid',destination:'Madrid',start:'2026-11-10'},{...P.defaults(),origin:'São Paulo',people:2,days:5,bags:2,pace:'balanced',climate:'mixed',interests:['art','food'],country:'MAD'});
assert.equal(N.valid(madrid5),true);
assert.equal(madrid5.route.length,5);
assert.equal(madrid5.trip.end,'2026-11-14');
assert.match(madrid5.route[0].title,/Chegada|Ópera|Palácio|Plaza/i);
assert.match(madrid5.route[0].notes,/Guia de campo · madrid-arrival/);
assert.ok(madrid5.route.some(x=>/Prado/i.test(x.title+' '+x.notes)),'5-day Madrid includes the Prado');
assert.ok(madrid5.route.some(x=>/Plaza Mayor/i.test(x.title+' '+x.notes)),'5-day Madrid includes Plaza Mayor');
assert.match(madrid5.route[4].title,/Partida/i);
assert.match(madrid5.route[4].notes,/Dia de partida|voo é a prioridade/);
assert.doesNotMatch(madrid5.route.map(x=>x.title).join(' '),/Dia 2 · Arte/);
assert.ok(madrid5.budget.some(x=>x.currency==='EUR'&&x.amount==='33'));
assert.ok(madrid5.bags.some(x=>/Mochila|Mala/i.test(x.label)));
assert.ok(madrid5.bags.length>5);
assert.equal(madrid5.profile.country,'MAD');

const madrid2=P.generate({name:'Fim de semana',destination:'Espanha',start:'2026-11-10',end:'2026-11-11'},{...P.defaults(),days:2,bags:1,pace:'relaxed',interests:['art'],country:'ES'});
assert.equal(N.valid(madrid2),true);
assert.equal(madrid2.route.length,2);
assert.match(madrid2.route[0].notes,/Guia de campo/);
assert.ok(madrid2.route.some(x=>/Prado|Ópera|Plaza|Palácio/i.test(x.title+' '+x.notes)));
const stops=notes=> (notes.match(/ — /g)||[]).length;
assert.ok(stops(madrid2.route[0].notes)<=stops(madrid5.route.find(x=>/Prado/i.test(x.notes)).notes),'relaxed/short days keep fewer stops than the 5-day art day');
assert.ok(madrid2.bags.length<madrid5.bags.length,'one bag and two days pack less than two bags and five days');

const iceland=P.generate({name:'Semana islandesa',destination:'Reykjavík',start:'2026-11-01'},{...P.defaults(),people:2,days:7,bags:3,pace:'active',climate:'cold',interests:['nature','history'],country:'IS'});
assert.equal(N.valid(iceland),true);
assert.equal(iceland.route.length,7);
assert.ok(iceland.route.some(x=>/Reykjav/i.test(x.title+' '+x.notes)));
assert.ok(iceland.route.some(x=>/Þingvellir|Thingvellir|Geysir|Gullfoss|Círculo Dourado/i.test(x.title+' '+x.notes)));
assert.ok(iceland.route.some(x=>/Seljalandsfoss|Skógafoss|Silfra|Costa Sul/i.test(x.title+' '+x.notes)));
assert.match(iceland.route[6].title,/Partida/i);
assert.ok(iceland.budget.every(x=>x.currency==='ISK'));
assert.ok(iceland.budget.every(x=>x.amount===''),'Iceland guide has no numeric prices to invent');
assert.ok(iceland.bags.some(x=>/térmica|vento|camada/i.test(x.label)));

const unknown=P.generate({name:'Oslo livre',destination:'Oslo',start:'2026-06-01'},{...P.defaults(),days:4,bags:1,pace:'balanced',interests:['art']});
assert.equal(N.valid(unknown),true);
assert.equal(unknown.route.length,4);
assert.match(unknown.route[0].title,/Chegar em Oslo/);
assert.match(unknown.route[1].title,/Dia 2 · Arte e cultura/);
assert.equal(unknown.budget.length,0);
assert.doesNotMatch(unknown.route.map(x=>x.notes).join(' '),/Prado|Plaza Mayor|Silfra/);

const active=P.generate({name:'Madrid ativo',destination:'Madrid',start:'2026-11-10'},{...P.defaults(),days:5,bags:2,pace:'active',interests:['art']});
const relaxed=P.generate({name:'Madrid leve',destination:'Madrid',start:'2026-11-10'},{...P.defaults(),days:5,bags:2,pace:'relaxed',interests:['art']});
const artActive=active.route.find(x=>/Prado/i.test(x.notes));
const artRelaxed=relaxed.route.find(x=>/Prado|madrid-art| Palácio/i.test(x.notes));
assert.ok(artActive&&artRelaxed);
assert.ok(stops(artActive.notes)>stops(artRelaxed.notes),'active pace keeps more Field Guide stops than relaxed');

assert.doesNotMatch(fs.readFileSync('public/nord/planner.js','utf8'),/\bfetch\(|XMLHttpRequest|\/api\//);
console.log('PASS: Field Guide itineraries for Madrid/Iceland, generic fallback for unknown cities, pace/bags/currency from real guide data.');
