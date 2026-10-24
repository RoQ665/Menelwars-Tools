const assert = require('node:assert/strict');
const fs = require('node:fs');
const {parse, matchKey, saveMatch, readHistory} = require('../league-parser.js');
const sample = `Szczegóły meczu
✕
Dzień 1 · 24.10.2026 · Dywizja 1
Gang A
−30
wygrane walki: 1
vs
Gang B
+30
wygrane walki: 1
Walki (3)
Atakujący
Broniący
Ala
Gang A
vs
Bob
Gang B
Wygrywa Ala
+100 XP
06:30
Bob
Gang B
vs
Ala
Gang A
Wygrywa Bob
+130 XP
07:00
Ala
Gang A
vs
Bob
Gang B
Trwa · rozstrzygnięcie o 08:00
07:30`;
const r = parse(sample);
assert.equal(r.xp,-30);
assert.deepEqual(r.warnings,[]);
assert.equal(r.players[0].attacks,2);
assert.equal(r.players[0].attackWins,1);
assert.equal(r.players[0].defenseLosses,1);
assert.equal(r.players[0].pendingAttack,1);
assert.equal(r.players.reduce((sum,p)=>sum+p.xp,0),0);
assert.equal(parse(sample.replace('+130 XP','−130 XP')).xp,-30);
assert.ok(parse(sample.replace('Walki (3)','Walki (4)')).warnings.length);
assert.ok(parse(sample.replace('Trwa · rozstrzygnięcie o 08:00','Nieznany wynik')).warnings.length);
assert.throws(()=>parse('zła strona'));
assert.deepEqual(parse(sample),parse(sample)); // importing a snapshot never accumulates fights
const memory = new Map();
const storage = {getItem:key=>memory.get(key) ?? null, setItem:(key,value)=>memory.set(key,value)};
assert.equal(saveMatch(storage,sample).updated,false);
assert.equal(saveMatch(storage,sample).updated,true);
assert.equal(readHistory(storage).length,1);
assert.equal(matchKey(r),matchKey({...r,gangA:r.gangB,gangB:r.gangA}));
const nextDay = sample.replace('24.10.2026','25.10.2026');
saveMatch(storage,nextDay,'2026-10-25T10:00:00Z');
assert.equal(readHistory(storage).length,2);
// A previous day's report imported tomorrow still updates yesterday, not today.
assert.equal(saveMatch(storage,sample,'2026-10-25T11:00:00Z').updated,true);
assert.equal(readHistory(storage).length,2);
assert.equal(parse(readHistory(storage).find(m=>m.key===matchKey(r)).text).date,'2026-10-24');
assert.throws(()=>saveMatch(storage,sample.replace('Walki (3)','Walki (4)')));
assert.throws(()=>saveMatch(storage,sample.replace('Wygrywa Bob\n+130 XP\n07:00','Trwa · rozstrzygnięcie o 07:00\n06:30').replace('−30','+100').replace('+30','−100')));
assert.equal(readHistory(storage).length,2);
const brokenStorage = {getItem:()=>'{broken',setItem:()=>assert.fail('Do not overwrite corrupted history')};
assert.throws(()=>saveMatch(brokenStorage,sample));
for (const path of process.argv.slice(2)) {
  const report = parse(fs.readFileSync(path,'utf8'));
  assert.deepEqual(report.warnings,[],path);
  assert.equal(report.fights.length,report.expected);
  assert.equal(report.xp,report.expectedXP);
  assert.equal(report.players.reduce((sum,p)=>sum+p.xp,0),0);
  console.log(`${report.gangA} / ${report.gangB}: ${report.fights.length} walk, ${report.xp} XP — OK`);
}
console.log('Testy parsera ligi: OK');
