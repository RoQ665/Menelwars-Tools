const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const nodes=new Map();
const get=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,disabled:false,value:'',textContent:'',innerHTML:''});return nodes.get(id);};
const context={document:{readyState:'complete',getElementById:get},window:{},Date,console};
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../league-parser.js'),'utf8'),context);
(async()=>{
  let writes=0;
  const api=async(path,options)=>{if(options?.method==='POST')writes++;return {ok:true,permissions:{admin:false},matches:[]};};
  await context.window.LeagueView.open(api);
  assert.equal(get('league-import-panel').hidden,true);
  assert.equal(get('league-parse').disabled,true);
  await get('league-parse').onclick();
  assert.equal(writes,0);
  await context.window.LeagueView.open(async()=>({permissions:{admin:true},matches:[]}));
  assert.equal(get('league-import-panel').hidden,false);
  assert.equal(get('league-parse').disabled,false);
  await context.window.LeagueView.open(async()=>{throw Error('session expired');});
  assert.equal(get('league-import-panel').hidden,true);
  assert.equal(get('league-parse').disabled,true);
  await context.window.LeagueView.open(async path=>path.includes('/targets')?{
    player:'Tester',asOf:'2026-10-24',admin:false,opponents:['Other'],players:['Tester'],note:'Test',targets:[{
      name:'<img onerror=bad>',gang:'Other',category:'tested',label:'Sprawdzony',reason:'Dwie wygrane',lastXP:{value:230,date:'2026-10-24'},sampleDate:'2026-10-24',wins:2,losses:0,evidence:[],totalEvidence:2
    }]
  }:{permissions:{admin:false},matches:[]});
  assert.ok(get('league-targets').innerHTML.includes('&lt;img onerror=bad&gt;'));
  assert.ok(get('league-targets').innerHTML.includes('+230 XP'));
  assert.ok(!get('league-targets').innerHTML.includes('data-target-player'));
  console.log('League UI: member read-only, admin import, failed auth hides import — OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
