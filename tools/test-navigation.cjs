const assert=require('node:assert/strict');
const {routes,create}=require('../navigation.js');
let url=new URL('https://example.test/tools/#liga'),allowed=false,opened=[],gates=0,errors=[],checks=[],router;
const location={get hash(){return url.hash;},get href(){return url.href;},get pathname(){return url.pathname;},get search(){return url.search;}};
const history={pushState:(_state,_title,path)=>{url=new URL(path,url);}};
router=create({location,history,authorize:async route=>{checks.push(route);return allowed;},open:async route=>{opened.push(route.view);router.showView(route.view);},onLoginRequired:async()=>{gates++;router.showView('account-view');},onError:error=>errors.push(error)});
(async()=>{
  await router.start();assert.equal(gates,1);assert.deepEqual(opened,[]);assert.equal(url.hash,'#liga');
  await router.resume();assert.equal(gates,2);assert.deepEqual(opened,[]);
  allowed=true;await router.resume();assert.deepEqual(opened,['league-view']);assert.equal(url.hash,'#liga');
  for(const slug of ['wplaty','spolka','operacje','ogrod','destylarnia']){
    url.hash=slug;await router.start();assert.equal(opened.at(-1),routes[slug].view);assert.equal(url.hash,'#'+slug);
  }
  router.showView('payments-view');assert.equal(url.hash,'#wplaty');
  const before=checks.length;router.showView('module-loading-view');assert.equal(url.hash,'#wplaty');
  url.hash='spolka';router.changed();router.changed();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(checks.length,before+1);assert.equal(opened.at(-1),'company-view');
  const count=opened.length;url.hash='admin-view';await router.start();assert.equal(opened.length,count);
  url.hash='<script>';await router.start();assert.equal(opened.length,count);
  assert.equal(Object.values(routes).some(r=>r.view==='admin-view'||r.view==='distillery-admin-view'),false);
  assert.equal(errors.length,0);
  allowed=false;url.hash='liga';await router.start();router.showView('garden-view');allowed=true;
  const lastCount=opened.length;await router.resume();assert.equal(opened.length,lastCount);assert.equal(url.hash,'#ogrod');
  const failing=create({location,history,authorize:async()=>{throw Error('Session check failed');},open:async()=>assert.fail('must not expose view'),onLoginRequired:async()=>{},onError:error=>errors.push(error)});
  await failing.start();assert.equal(errors.at(-1).message,'Session check failed');
  console.log('Navigation: direct destinations, access gate, login continuation, hash/history, menu URL, unknown/admin rejection, authorization failure — OK');
})().catch(error=>{console.error(error);process.exitCode=1;});
