const fs=require('fs'),ts=require('typescript'),vm=require('vm'),assert=require('node:assert/strict');

function loadBoundary(){
  const code=ts.transpileModule(fs.readFileSync('lib/demo-boundary.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const moduleFixture={exports:{}};
  new Function('module','exports',code)(moduleFixture,moduleFixture.exports);
  return moduleFixture.exports.demoBoundary;
}

function dashboardHtml(){
  return JSON.parse(fs.readFileSync('data/dashboard-html.ts','utf8').split('\n')[0].slice('const html = '.length,-1));
}

(async()=>{
  const demoBoundary=loadBoundary();
  const html=dashboardHtml();
  assert.doesNotMatch(html,/<script(?![^>]*\bsrc=)[^>]*>/i);
  assert.match(html,/\/nord\/startup\.js\?v=1/);
  assert.match(html,/id="app-load-error"/);
  const route=fs.readFileSync('app/dashboard/route.ts','utf8');
  assert.match(route,/script-src 'self'/);
  assert.doesNotMatch(route,/script-src[^"']*'unsafe-inline'/);
  const startup=fs.readFileSync('public/nord/startup.js','utf8');
  assert.match(startup,/window\.NordBoot=/);
  assert.match(startup,/ready\(/);
  assert.doesNotMatch(startup,/<script/);
  new Function(startup);
  const visitor=fs.readFileSync('public/nord/visitor.js','utf8');
  assert.match(visitor,/window\.NordBoot\?\.ready\(\)/);
  assert.match(visitor,/window\.NordBoot\?\.fail\(\)/);
  assert.match(visitor,/fmtDate\(M\.data\.date\)/);
  assert.match(visitor,/fmtDate\(x\.checkedAt\)/);
  assert.doesNotMatch(visitor,/\?M\.data\.date:'Referência diária'/);

  for(const path of ['/login','/signin','/nope','/unknown-page']){
    const r=demoBoundary(new Request('https://nord.test'+path,{method:'GET',headers:{Accept:'text/html,application/xhtml+xml'}}));
    assert.equal(r.status,404,path);
    assert.match(r.headers.get('content-type')||'',/text\/html/);
    assert.equal(r.headers.get('Cache-Control'),'no-store');
    assert.match(r.headers.get('Content-Security-Policy')||'',/script-src 'self'/);
    const body=await r.text();
    assert.match(body,/lang="pt-BR"/);
    assert.match(body,/não existe/i);
    assert.match(body,/\/dashboard#explore/);
    assert.match(body,/NÓRD/);
    assert.doesNotMatch(body,/demonstration/);
    assert.doesNotMatch(body,/<script(?![^>]*\bsrc=)[^>]*>/i);
  }

  const head=demoBoundary(new Request('https://nord.test/login',{method:'HEAD',headers:{Accept:'text/html'}}));
  assert.equal(head.status,404);
  assert.equal(await head.text(),'');

  for(const path of ['/api/state','/api/history','/api/export','/api/journal','/api/media','/api/assistant','/API/STATE']){
    const r=demoBoundary(new Request('https://nord.test'+path,{method:'GET',headers:{Accept:'text/html,application/xhtml+xml'}}));
    assert.equal(r.status,403,path);
    assert.match(await r.text(),/demonstration/);
  }

  const post=demoBoundary(new Request('https://nord.test/login',{method:'POST',headers:{Accept:'text/html'}}));
  assert.equal(post.status,403);
  assert.match(await post.text(),/demonstration/);

  const bare=demoBoundary(new Request('https://nord.test/login',{method:'GET'}));
  assert.equal(bare.status,403);
  assert.match(await bare.text(),/demonstration/);

  const publicGet=demoBoundary(new Request('https://nord.test/dashboard',{method:'GET',headers:{Accept:'text/html'}}));
  assert.equal(publicGet,null);

  const boot={window:{},document:{querySelector:()=>({hidden:true}),addEventListener(){}},setTimeout,clearTimeout};
  const bootCtx=vm.createContext(boot);
  vm.runInContext(startup,bootCtx);
  assert.equal(typeof boot.window.NordBoot.ready,'function');
  boot.window.NordBoot.ready();

  const fmt=visitor.match(/fmtDate=d=>\{.*?\},money=/);
  assert.ok(fmt);
  const fmtDate=new Function('return ('+fmt[0].slice('fmtDate='.length,-',money='.length)+')')();
  assert.equal(fmtDate('2026-10-23'),'23/10/2026');
  assert.equal(fmtDate('2026-10-10'),'10/10/2026');
  assert.equal(fmtDate('10/10/2026'),'10/10/2026');
  assert.equal(fmtDate(''),'Datas flexíveis');

  console.log('PASS: branded HTML 404 for browser navigations, JSON denial for APIs/mutations, no inline dashboard scripts, external boot runs, user-facing dates in pt-BR.');
})().catch(e=>{console.error(e);process.exit(1)});
