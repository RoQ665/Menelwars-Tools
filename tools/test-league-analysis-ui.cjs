const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',innerHTML:''});return nodes.get(id);};
const context={document:{readyState:'complete',getElementById:get},window:{},Date};
vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../league-parser.js'),'utf8'),context);
const analysis={confidenceLabel:'Średnia pewność',favorability:'favorable',commonOpponents:3,independentPeers:2,independentEvidence:11,
  chains:[{direction:'positive',hops:3,route:[{name:'RoQ',gang:'Own'},{name:'<script>bad</script>',gang:'Other'},{name:'Bridge',gang:'Third'},{name:'Target',gang:'Other'}],weight:.03,rawWeight:.04,edges:[{date:'2026-10-24',wins:2,losses:0,winsInAttack:2,historyConflict:false}]}],
  reasons:['Dwie zgodne wskazówki.'],peers:[{name:'<img onerror=bad>',commonOpponents:3,attackWins:1,attackLosses:0,defenseWins:0,defenses:1}],
  common:[{name:'Enemy',role:'attack',advantage:.5}],
  profile:{beaters:[{name:'<script>bad</script>',wins:2,losses:0,dates:['2026-10-24'],relation:'weaker'}],attackWins:1,attackLosses:2,defenseWins:0,defenseLosses:3,distinctAttackers:2,opponents:[{name:'Peer',wins:2,losses:1}]},
  proofs:[{date:'2026-10-24',time:'12:00',attacker:'Peer',defender:'Target',winner:'Peer'}]};
(async()=>{
  await context.window.LeagueView.open(async path=>path.includes('/targets')?{admin:true,player:'RoQ',asOf:'2026-10-24',opponents:['Other'],players:['RoQ'],note:'Test',targets:[{name:'Target',gang:'Other',category:'candidate',label:'Cel do przetestowania',rating:{value:79,basis:'Test oceny'},reason:'Porównanie profili.',wins:0,losses:0,evidence:[],totalEvidence:0,analysis,lastXP:{value:237,date:'2026-10-25',source:'opponents'},lossXP:{value:264,date:'2026-10-25',source:'opponents'},prestige:{value:2456,date:'2026-10-25'}}]}:{permissions:{admin:true},matches:[]});
  const html=get('league-targets').innerHTML;
  for(const text of ['Średnia pewność','Korzystne wskazówki','Porównywalni gracze','Kto pokonywał cel dziś i wczoraj?','słabsze wyniki na wspólnych rywalach','3 wspólnych rywali','Wspólni przeciwnicy','porównanie ataków','Profil celu (14 dni)','Pewność opisuje jakość danych, nie szansę wygranej.'])assert.ok(html.includes(text),text);
  assert.ok(!html.includes('<script>bad</script>'));
  assert.ok(html.includes('Łańcuchy wyników — do 4 walk'));assert.ok(html.includes('Za wyborem celu'));
  assert.ok(html.includes('Waga po uwzględnieniu wspólnych dowodów'));
  const scoreScript=fs.readFileSync(require.resolve('../league-parser.js'),'utf8');
  assert.ok(scoreScript.includes('Rekomendacja silnika'));assert.ok(scoreScript.includes('To nie jest szansa wygranej.'));
  assert.ok(html.includes('band-7'));assert.ok(html.includes('79%'));assert.ok(!html.includes('league-target-tag'));
  assert.ok(html.includes('&lt;img onerror=bad&gt;'));assert.ok(!html.includes('<img onerror=bad>'));
  assert.ok(html.includes('<details><summary>Analiza profilu i pewność</summary>'));
  assert.ok(html.includes('Szacowana wygrana: +237 XP'));
  assert.ok(html.includes('Prestiż:'));
  assert.ok(html.includes('tylko pomocniczo'));
  assert.ok(html.includes('szacunek z listy rywali z 2026-10-25'));
  assert.ok(html.includes('Porażka: stawka RoQ z jego listy rywali z 2026-10-25'));
  console.log('Analysis UI: separate confidence, collapsed explanations, common opponents, similar players, role-separated results, contextual profile, escaped names — OK');
})().catch(error=>{console.error(error);process.exitCode=1;});
