const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const window={};vm.runInNewContext(fs.readFileSync('public/nord/local-travel.js','utf8'),{window,crypto,TextEncoder,Date,Promise,Error,JSON});
vm.runInNewContext(fs.readFileSync('public/nord/field-guide-content.js','utf8'),{window});
vm.runInNewContext(fs.readFileSync('public/nord/planner.js','utf8'),{window});
const P=window.NordPlanner,N=window.NordLocal;

const madrid={...P.defaults(),origin:'São Paulo',people:2,days:5,bags:2,pace:'balanced',climate:'mixed',interests:['art','food']};
const trip=P.generate({name:'Outono em Madrid',destination:'Madrid',start:'2026-11-10'},madrid);
assert.equal(N.valid(trip),true);
assert.equal(trip.trip.destination,'Madrid');
assert.equal(trip.trip.start,'2026-11-10');
assert.equal(trip.trip.end,'2026-11-14','start + 5 days fills the missing end date');
assert.equal(trip.route.length,5);
assert.match(trip.route[0].title,/Chegada em Madrid/);
assert.equal(trip.route[0].date,'2026-11-10');
assert.equal(trip.route[4].date,'2026-11-14');
assert.ok(trip.route.some(x=>/Prado|Plaza Mayor/i.test(x.title+' '+x.notes)));
assert.match(trip.tasks.find(x=>x.title==='Conferir documentos e regras de entrada').notes,/Madrid/);
assert.match(trip.tasks.find(x=>x.title==='Conferir bilhetes e deslocamento ao aeroporto').notes,/São Paulo → Madrid/);
assert.ok(trip.tasks.some(x=>x.title==='Combinar o ritmo do grupo'));
assert.equal(trip.tasks.some(x=>/camadas de roupa|calor e proteção/.test(x.title)),false,'mixed climate has no extra weather task');
assert.ok(trip.budget.some(x=>x.currency==='EUR'));
assert.equal(trip.journal.length,0);
assert.equal(trip.profile.country,'ES');

const ranged=P.generate({name:'Datas curtas',destination:'Madrid',start:'2026-11-10',end:'2026-11-12'},{...madrid,days:10});
assert.equal(ranged.trip.end,'2026-11-12');
assert.equal(ranged.profile.days,3,'start/end span wins over a leftover days field');
assert.equal(ranged.route.length,3);
assert.equal(ranged.route[0].date,'2026-11-10');
assert.equal(ranged.route[2].date,'2026-11-12');

const long=P.generate({name:'Longa',destination:'Madrid',start:'2026-11-01',end:'2026-11-30'},{...madrid,days:30});
assert.equal(long.route.length,14);
assert.equal(long.trip.end,'2026-11-30');

const generic=P.generate({name:'Sem destino',destination:'',start:''},{...P.defaults(),days:3,interests:[]});
assert.equal(generic.trip.end,'');
assert.equal(generic.route[0].title,'Chegar, se instalar e reconhecer o entorno');
assert.equal(generic.route[0].date,'');
assert.match(generic.route[1].title,/Descanso/);

assert.doesNotMatch(fs.readFileSync('public/nord/planner.js','utf8'),/\bfetch\(|XMLHttpRequest|\/api\//);
console.log('PASS: questionnaire maps days/dates/destination/interests/people; missing end is filled; Madrid uses the Field Guide when content is loaded.');
