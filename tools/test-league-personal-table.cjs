const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const nodes=new Map(),get=id=>{
  if(!nodes.has(id))nodes.set(id,{value:'',hidden:false,innerHTML:'',textContent:'',showModal(){this.open=true;},close(){this.open=false;}});
  return nodes.get(id);
};
const context={document:{readyState:'complete',getElementById:get},window:{},Date};
vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../league-parser.js'),'utf8'),context);
const player=(name,gang)=>({name,gang,attacks:1,defenses:1,attackXP:100,defenseXP:-100,xp:0,attackWins:1,attackLosses:0,defenseWins:0,defenseLosses:1,pendingAttack:0,pendingDefense:0});
const data={date:'2026-10-24',gangA:'Own',gangB:'Enemy',xp:0,fights:[],warnings:[],players:[player('RoQ','Own'),player('Target','Enemy'),player('Other','Enemy'),player('Unknown','Enemy')]};
let admin=false,me='RoQ',fail=false;
const target=(name,value,confidence)=>({name,gang:'Enemy',rating:{value,basis:'Test'},category:'limited',label:'Test',reason:'Test',wins:1,losses:0,evidence:[],totalEvidence:0,analysis:{confidence,confidenceLabel:confidence==='medium'?'Średnia pewność':'Niska pewność',commonOpponents:0,independentPeers:0,independentEvidence:1,reasons:['Wyniki, nie przewaga HP.']}});
const api=async path=>{
  if(path.includes('/targets')){
    if(fail)throw Error('network failed');
    const selected=path.includes('player=Someone')?'Someone':me;
    return {me,player:selected,ownGang:'Own',asOf:'2026-10-25',admin,players:['RoQ','Someone'],opponents:['Enemy'],targets:[target('Target',selected==='RoQ'?98:22,'medium'),target('Other',75,'low')],note:'Test'};
  }
  if(path.includes('?match='))return {data,updatedAt:0,updatedBy:'Tester'};
  return {permissions:{admin},matches:[{id:'one',date:data.date,gangA:'Own',gangB:'Enemy',fightCount:0}]};
};
const click=(selector,dataset)=>get('league-result').onclick({target:{closest:s=>s===selector?{dataset}:null}});
(async()=>{
  await context.window.LeagueView.open(api);
  assert.equal(get('league-target-drawer').hidden,true);assert.equal(get('league-targets').innerHTML,'');
  assert.ok(!get('league-result').innerHTML.includes('data-label="Siła rekomendacji"'));
  click('[data-league-team]',{leagueTeam:'Enemy'});
  let html=get('league-result').innerHTML;
  for(const text of ['98%','75%','Brak oceny','Oceny dla: <b>RoQ</b>','stan na 2026-10-25'])assert.ok(html.includes(text),text);
  assert.ok(html.includes('Rekomendacja silnika'));
  assert.ok(!html.includes('data-league-sort="certainty"'));
  assert.ok(!html.includes('Dla Ciebie'));
  click('[data-league-sort]',{leagueSort:'recommendation'});
  html=get('league-result').innerHTML;assert.ok(html.indexOf('<strong>Target</strong>')<html.indexOf('<strong>Other</strong>'));
  click('[data-league-sort]',{leagueSort:'recommendation'});
  html=get('league-result').innerHTML;assert.ok(html.indexOf('<strong>Other</strong>')<html.indexOf('<strong>Target</strong>'));
  assert.ok(html.indexOf('<strong>Unknown</strong>')>html.indexOf('<strong>Target</strong>')); // null always last
  click('[data-league-target]',{leagueTarget:'0'});
  assert.equal(get('league-target-dialog').open,true);assert.ok(get('league-target-dialog').innerHTML.includes('Target — dla RoQ'));
  assert.ok(get('league-target-dialog').innerHTML.includes('Średnia pewność'));
  const modal=get('league-target-dialog');modal.getBoundingClientRect=()=>({left:10,top:10,right:200,bottom:200});
  const inside={target:modal,clientX:50,clientY:50};modal.onpointerdown(inside);modal.onclick(inside);assert.equal(modal.open,true);
  const outside={target:modal,clientX:250,clientY:250};modal.onpointerdown(inside);modal.onclick(outside);assert.equal(modal.open,true); // dragging out does not close
  modal.onpointerdown(outside);modal.onclick(outside);assert.equal(modal.open,false); // mouse/touch use identical pointer path
  admin=true;await context.window.LeagueView.open(api);assert.equal(get('league-target-drawer').hidden,false);
  get('league-targets').onchange({target:{matches:()=>true,value:'Someone'}});
  await new Promise(resolve=>setImmediate(resolve));
  click('[data-league-team]',{leagueTeam:'Enemy'});
  html=get('league-result').innerHTML;
  assert.ok(html.includes('98%'));assert.ok(!html.includes('22%'));assert.ok(get('league-targets').innerHTML.includes('22%'));
  admin=false;me='Someone';await context.window.LeagueView.open(api);click('[data-league-team]',{leagueTeam:'Enemy'});
  html=get('league-result').innerHTML;assert.ok(html.includes('22%'));assert.ok(!html.includes('98%'));assert.equal(get('league-target-drawer').hidden,true);
  fail=true;await context.window.LeagueView.open(api);click('[data-league-team]',{leagueTeam:'Enemy'});
  assert.ok(!get('league-result').innerHTML.includes('22%'));assert.equal(get('league-target-dialog').open,false);
  console.log('Personal table: two separate metrics, member-only personal context, admin-only drawer, admin preview does not change own table, account changes clear state, failed requests clear scores, date context, null-last sorting and detail dialog — OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
