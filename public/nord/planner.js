/* Deterministic suggestions from the Field Guide when the destination matches. No network. */
(()=>{'use strict';
const defaults=()=>({origin:'',country:'',people:1,days:7,bags:1,pace:'balanced',climate:'unknown',interests:['history','food']});
const interestNames={history:'História',food:'Gastronomia',nature:'Natureza',art:'Arte e cultura',shopping:'Compras',rest:'Descanso'};
const fold=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();
const GUIDES=[
  {id:'madrid',region:'Madrid',currency:'EUR',aliases:['madrid','madri','espanha','spain','es','mad','world-esp','esp'],arrival:'madrid-arrival'},
  {id:'iceland',region:'Islândia',currency:'ISK',aliases:['islandia','iceland','is','reykjavik','reykjavík','rek','world-isl','isl'],arrival:'reykjavik'}
];

function matchGuide(dest,country){
  const D=window.NordFieldGuideData;
  if(!D?.routes)return null;
  const keys=[fold(dest),fold(country)].filter(Boolean);
  if(!keys.length)return null;
  return GUIDES.find(g=>{
    const region=fold(g.region);
    return keys.some(k=>g.aliases.includes(k)||k===region||(k.length>=5&&(k.includes(region)||region.includes(k)))||g.aliases.some(a=>a.length>=4&&(k===a||k.includes(a)||(a.length>=5&&a.includes(k)))));
  })||null;
}

function seasonOf(start,climate){
  if(climate==='cold')return 'cold';
  if(climate==='warm')return 'warm';
  const m=Number(String(start||'').slice(5,7));
  if(!m)return climate==='mixed'?'shoulder':'unknown';
  if(m>=11||m<=3)return 'cold';
  if(m>=6&&m<=8)return 'warm';
  return 'shoulder';
}

function scoreRoute(route,interests){
  const hay=fold([route.title,route.subtitle,route.tag,route.intro,...route.stops.map(s=>s.title+' '+s.text)].join(' '));
  let n=0;
  for(const i of interests){
    if(i==='art'&&/prado|arte|museu|palacio|velazquez|goya/.test(hay))n+=4;
    if(i==='history'&&/palacio|plaza mayor|historico|thingvellir|parlamento|oriente/.test(hay))n+=3;
    if(i==='food'&&/almoco|mesa|ciriaco|sandholt|jantar|padaria|refeicao/.test(hay))n+=3;
    if(i==='nature'&&/retiro|cachoeira|costa|geysir|gullfoss|orla|paisagem|silfra|seljalandsfoss|skogafoss/.test(hay))n+=4;
    if(i==='rest'&&/leve|chegada|cidade|adapta/.test(hay))n+=2;
    if(i==='shopping'&&/bairro|letras|malasana|laugavegur/.test(hay))n+=1;
  }
  if(/chegada|primeiro encontro/.test(hay))n-=1;
  return n;
}

function takeStops(stops,pace,role){
  const optional=s=>/opcional|somente com tempo|se houver margem|se ainda tiver energia/i.test(`${s.time} ${s.title} ${s.text}`);
  if(role==='departure')return stops.slice(0,1);
  if(role==='arrival'||pace==='relaxed')return stops.filter((s,i)=>i===0||(!optional(s)&&i<2)).slice(0,pace==='active'?3:2);
  if(pace==='active')return stops.slice();
  return stops.filter((s,i)=>i===0||!optional(s)).slice(0,3);
}

function fmtChecked(at){const m=String(at||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:String(at||'');}

function routeNotes(D,route,stops,role,pace){
  const variant=pace==='relaxed'?route.rest:route.rain;
  const urls=route.sources.map(k=>D.sources[k]?.url).filter(Boolean);
  const lines=[
    `Guia de campo · ${route.id} · ${route.region} · consulta ${fmtChecked(D.checkedAt)}`,
    route.subtitle,
    route.intro,
    ...stops.map(s=>`${s.time} — ${s.title}\n${s.text}`),
    role==='departure'?'Dia de partida: o voo é a prioridade. Não preencha com um passeio distante.':'',
    pace==='relaxed'?`POUCA ENERGIA\n${route.rest}`:`PLANO B\n${variant}`,
    `CONFERIR\n${route.practical}`,
    ...urls
  ].filter(Boolean);
  return lines.join('\n\n').slice(0,5000);
}

function extraModules(D,guide,used){
  const extras=[];
  const byId=id=>D.routes.find(r=>r.id===id);
  if(guide.id==='madrid'){
    const arrival=byId('madrid-arrival'),art=byId('madrid-art'),book=D.essentials.find(x=>x.id==='bookings');
    if(arrival)extras.push({...arrival,id:'madrid-palace',title:'Palácio e centro histórico',tag:'Âncora do guia · história',stops:arrival.stops.filter(s=>/Palácio|Plaza Mayor|Ópera|Oriente/.test(s.title+s.text))});
    if(art)extras.push({...art,id:'madrid-retiro',title:'Retiro, Letras e uma boa mesa',tag:'Dia livre no eixo leste',stops:art.stops.filter(s=>/Retiro|Letras|Jerónimos|Malasaña|Ardosa/.test(s.title+s.text))});
    if(book)extras.push({id:'madrid-free',region:'Madrid',title:'Uma experiência principal',subtitle:book.title,duration:'1 dia',effort:'Leve',tag:'Dia livre sugerido pelo guia',intro:book.why,stops:book.steps.map((text,i)=>({time:`Bloco ${i+1}`,title:text.slice(0,80),text})),practical:book.proof,rain:D.faq.find(x=>x.id==='rain')?.a||book.why,rest:book.why,reserve:book.proof,sources:book.sources||[],map:'Madrid'});
  }
  if(guide.id==='iceland'){
    const city=byId('reykjavik'),weather=D.essentials.find(x=>x.id==='weather-check');
    if(city)extras.push({...city,id:'iceland-city-alt',title:'Reykjavík quando a estrada espera',tag:'Alternativa de cidade',stops:city.stops});
    if(weather)extras.push({id:'iceland-weather',region:'Islândia',title:'Dia para decidir pela estrada',subtitle:weather.title,duration:'Conforme o alerta',effort:'Leve',tag:'Clima e vias',intro:weather.why,stops:weather.steps.map((text,i)=>({time:`Antes de sair · ${i+1}`,title:text.slice(0,90),text})),practical:weather.proof,rain:weather.why,rest:weather.why,reserve:weather.proof,sources:weather.sources||[],map:'Reykjavik'});
  }
  return extras.filter(x=>!used.has(x.id)&&x.stops?.length);
}

function pickSequence(D,guide,span,interests){
  const regionRoutes=D.routes.filter(r=>r.region===guide.region);
  const arrival=regionRoutes.find(r=>r.id===guide.arrival)||regionRoutes[0];
  const ranked=regionRoutes.filter(r=>r.id!==arrival?.id).sort((a,b)=>scoreRoute(b,interests)-scoreRoute(a,interests)||a.title.localeCompare(b.title,'pt-BR'));
  const used=new Set();
  const days=Array.from({length:span},()=>null);
  if(arrival){days[0]={route:arrival,role:'arrival'};used.add(arrival.id);}
  if(span>=2)days[span-1]={route:arrival,role:'departure'};
  const pool=[...ranked];
  for(let i=1;i<span-1;i++){
    const next=pool.find(r=>!used.has(r.id));
    if(next){days[i]={route:next,role:'day'};used.add(next.id);}
  }
  const extras=extraModules(D,guide,used);
  for(let i=1;i<span-1;i++){
    if(days[i])continue;
    const extra=extras.shift();
    if(extra){days[i]={route:extra,role:'extra'};used.add(extra.id);}
    else if(ranked[0])days[i]={route:ranked[0],role:'free'};
    else days[i]={route:arrival,role:'free'};
  }
  if(span===1&&arrival)days[0]={route:ranked[0]||arrival,role:'arrival'};
  if(span===2&&ranked[0])days[1]={route:ranked[0],role:'departure'};
  return days;
}

function extractEuro(D){
  const blob=[...D.routes,...D.moments].map(x=>[x.practical,x.tip,...(x.steps||[])].filter(Boolean).join(' ')).join(' ');
  const m=blob.match(/€\s*(\d+)/);
  return m?m[1]:'';
}

function fillGuideRoute(s,D,guide,span,dates,p){
  const interests=p.interests.length?p.interests:['rest'];
  const seq=pickSequence(D,guide,span,interests);
  seq.forEach((slot,i)=>{
    if(!slot?.route)return;
    const stops=takeStops(slot.route.stops,p.pace,slot.role);
    const place=stops[0]?.title||slot.route.subtitle;
    const title=slot.role==='arrival'?`Chegada em ${guide.region} · ${place}`.slice(0,180)
      :slot.role==='departure'?`Partida · ${slot.route.title}`.slice(0,180)
      :slot.route.title.slice(0,180);
    s.route.push({id:`guide-${slot.route.id}-${i}`.slice(0,80),title,date:dates[i]||'',notes:routeNotes(D,slot.route,stops,slot.role,p.pace)});
  });
}

function fillGuideBags(s,D,guide,p,span,season){
  const N=window.NordLocal;
  const packs=Object.fromEntries(D.packing.map(b=>[b.id,b]));
  const add=(label)=>{if(label&&!s.bags.some(x=>x.label===label)&&s.bags.length<100)s.bags.push({id:N.id(),label:label.slice(0,180),done:false});};
  const take=(bag,n)=>{if(!bag)return;bag.items.slice(0,n).forEach(item=>add(`${bag.title}: ${item}`));};
  const backpack=packs.backpack,cabin=packs.cabin,checked=packs.checked;
  take(backpack,p.bags<=1&&span<=3?3:backpack.items.length);
  if(p.bags>=1&&span>=3)take(cabin,p.bags>=2?cabin.items.length:2);
  if(p.bags>=2)take(cabin,cabin.items.length);
  const cold=season==='cold'||guide.id==='iceland'||p.climate==='cold';
  if(p.bags>=3||span>=8||(cold&&p.bags>=2))take(checked,cold?checked.items.length:4);
  if(cold)add('Camadas: base térmica, fleece e proteção contra vento e água');
  if(span>=7)add('Roupa extra para lavar e alternar em viagem longa');
  if(p.bags>=2)add(`${p.bags} volumes planejados · conferir franquia de cada trecho`);
}

function fillGuideBudget(s,guide,D){
  const N=window.NordLocal;
  if(guide.currency==='EUR'){
    const taxi=extractEuro(D);
    if(taxi)s.budget.push({id:N.id(),title:'Táxi oficial MAD · tarifa Aena até a M-30',currency:'EUR',amount:taxi});
    s.budget.push({id:N.id(),title:'Hospedagem, refeições e ingressos oficiais',currency:'EUR',amount:''});
  }
  if(guide.currency==='ISK'){
    s.budget.push({id:N.id(),title:'Gastos do dia em coroa islandesa (ISK)',currency:'ISK',amount:''});
    s.budget.push({id:N.id(),title:'Segundo meio de pagamento · conferir no emissor',currency:'ISK',amount:''});
  }
}

function generate(trip,p){
  const N=window.NordLocal,s=N.blank();
  s.trip={...s.trip,...trip};s.profile={...defaults(),...p};
  let span=s.profile.days;
  if(s.trip.start&&s.trip.end)span=Math.round((Date.parse(s.trip.end)-Date.parse(s.trip.start))/86400000)+1;
  if(!Number.isInteger(span)||span<1)span=1;if(span>365)span=365;
  s.profile.days=span;
  if(s.trip.start&&!s.trip.end){const last=new Date(s.trip.start+'T12:00:00Z');last.setUTCDate(last.getUTCDate()+span-1);s.trip.end=last.toISOString().slice(0,10);}
  const dest=String(s.trip.destination||'').trim(),where=dest?` em ${dest}`:'';
  const guide=matchGuide(dest,s.profile.country);
  if(guide&&!s.profile.country)s.profile.country=guide.id==='madrid'?'ES':'IS';
  const task=(title,notes,phase='before')=>s.tasks.push({id:N.id(),title,notes,status:'todo',phase});
  task('Conferir documentos e regras de entrada',`Verifique passaporte, visto ou autorização, trânsito e permanência nas fontes oficiais${dest?' de '+dest:' do destino'}.`);
  task('Conferir bilhetes e deslocamento ao aeroporto',`Saída: ${p.origin||'a definir'}${dest?' → '+dest:''}. Inclua margem para check-in e trânsito, sem presumir horários.`);
  task('Comparar hospedagem e deslocamentos',`Confirme localização${where}, cancelamento e o custo total antes de reservar.`);
  task('Simular orçamento e meios de pagamento',guide?`Na ${guide.region}, planeje a cobrança em ${guide.currency}. Prefira a moeda local se o terminal oferecer conversão.`:'Escolha as moedas, preencha seus valores e considere impostos e tarifas separadamente.');
  task('Revisar bagagem e franquias',`${p.bags} volume(s) planejado(s) para ${p.people} pessoa(s). A franquia válida é a do seu bilhete.`);
  task('Baixar cópias e contatos importantes','Guarde sua cópia do planejamento em local protegido e salve os contatos que poderá precisar.');
  task('Separar o que precisa ficar à mão','Documentos, carregadores e itens pessoais essenciais em local acessível.','flight');
  task('Conferir conexão e fuso na passagem','Confirme portão, horário local e necessidade de controle migratório nos canais oficiais.','flight');
  task('Dar espaço ao descanso','Organize pausas e siga as orientações da tripulação.','flight');
  task('Confirmar o caminho até a hospedagem',`Compare transporte autorizado e o endereço${where}, e salve uma alternativa.`,'arrival');
  task('Conferir conexão e forma de pagamento','Teste acesso à internet e confira a moeda da cobrança antes de pagar.','arrival');
  task('Começar com uma agenda leve',`Reserve margem para deslocamento, alimentação e adaptação ao horário${where}.`,'arrival');
  if(p.people>1)task('Combinar o ritmo do grupo',`São ${p.people} pessoas. Combine encontros, prioridades e divisão de gastos.`);
  if(p.climate==='cold')task('Conferir previsão e camadas de roupa',`Sua preferência informada foi frio${where}. Isso não substitui uma previsão real para as datas.`);
  if(p.climate==='warm')task('Conferir calor e proteção para o destino',`Sua preferência informada foi calor${where}. Confira previsão e condições locais perto da partida.`);
  const days=Math.min(span,14);
  const dates=Array.from({length:days},(_,i)=>{if(!s.trip.start)return '';const d=new Date(s.trip.start+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);});
  const D=window.NordFieldGuideData;
  if(guide&&D?.routes){
    fillGuideRoute(s,D,guide,days,dates,p);
    fillGuideBags(s,D,guide,p,span,seasonOf(s.trip.start,p.climate));
    fillGuideBudget(s,guide,D);
    return s;
  }
  const interests=p.interests.length?p.interests:['rest'];
  for(let i=0;i<days;i++){
    const focus=interestNames[interests[(i===0?0:i-1)%interests.length]];
    s.route.push({id:N.id(),title:i===0?(dest?`Chegar em ${dest}, se instalar e reconhecer o entorno`:'Chegar, se instalar e reconhecer o entorno'):`Dia ${i+1} · ${focus}`,date:dates[i],notes:i===0?`Sugestão de ritmo${where}, sem reservas: deixe espaço para deslocamento e descanso.`:`Sugestão baseada no seu perfil: ${focus.toLowerCase()}. ${p.pace==='relaxed'?'Uma atividade principal e boas pausas.':p.pace==='active'?'Agrupe atividades próximas e confira trajetos e horários.':'Uma atividade principal, uma alternativa e tempo livre.'} Escolha locais reais${where} e confira abertura, ingressos e deslocamentos.`});
  }
  for(const label of ['Documentos e comprovantes','Carregadores e adaptadores','Itens pessoais de uso habitual','Roupa e calçado para as atividades',...(p.climate==='cold'?['Camadas de roupa e proteção para frio']:p.climate==='warm'?['Roupas leves e proteção para o sol']:['Conferir a previsão antes de fechar a mala'])])s.bags.push({id:N.id(),label,done:false});
  return s;
}
window.NordPlanner={defaults,generate,interestNames,matchGuide};})();
