const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const s=fs.readFileSync(require.resolve('../app.js'),'utf8');
const start=s.indexOf('    // Nagła Śmierć została'),end=s.indexOf('    pvpGeneratedPresetsCache = out;',start);
const c={};vm.createContext(c);vm.runInContext('const out=[];'+s.slice(start,end)+';this.bosses=out;',c);
const bosses=c.bosses;
assert.equal(bosses.length,36);assert.equal(new Set(bosses.map(x=>x.id)).size,36);
assert.ok(bosses[0].name.startsWith('Menel Igor'));assert.ok(bosses[34].name.startsWith('Deweloper Bogdan'));
const confirmed=bosses.filter(b=>b.exactCombat).map(b=>({id:b.id,exactCombat:b.exactCombat,profile:b.profile,attributes:b.attributes,perks:b.perks,bonuses:b.bonuses}));
assert.equal(confirmed.length,14);
assert.equal(crypto.createHash('sha256').update(JSON.stringify(confirmed)).digest('hex'),'c8a5108864756d727cb7a72123d601cf85a2cb6ac3a626ace877873212e359ca','All 14 existing confirmed combat profiles and build inputs must remain unchanged');
const rstart=s.indexOf('  function buildSimulationReadiness('),rend=s.indexOf('  function pvpPresetAllocate(',rstart);
vm.runInContext(s.slice(rstart,rend),c);
for(const b of bosses){assert.equal(c.buildSimulationReadiness(b).ok,Boolean(b.exactCombat||b.estimatedCombat),b.name);}
for(const [id,level,attack,defense,hp] of [['boss-35-deweloper-bogdan',35,1824,1997,9645],['boss-37-hrabia-dzialek',36,1891,2093,10116]]){
 const b=bosses.find(b=>b.id===id);assert.ok(b);assert.equal(b.level,level);
 assert.equal(b.exactCombat,undefined,'Estimates must never be labelled exact');
 assert.deepEqual(JSON.parse(JSON.stringify(b.estimatedCombat.primary)),{attack,defense,hp});
 assert.match(b.description,/szacowany/);assert.equal(b.simulationUnavailable,undefined);
}
const publicData=JSON.stringify(bosses);
assert.doesNotMatch(publicData,/RoQ|playerMaxHp|playerHpBeforeExecution|bossRemainingHp|firstBleedRound|bleedDamage.*4021|remainingHp|winner|attempts/,'Public boss metadata must not expose private battle outcomes');
console.log('PASS: 14 confirmed profiles unchanged; Count and Bogdan estimated profiles ready; private battle metadata removed.');
