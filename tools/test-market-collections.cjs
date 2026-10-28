const assert=require('node:assert/strict');
const data=require('../collections-data.json'),{calculate,rank}=require('../collections.js'),{series}=require('../market-chart.js');
assert.equal(data.recipes.length,24);assert.equal(data.recipes.filter(x=>x.reward.gold).length,14);
assert.deepEqual([1,2,3,4,5,6].map(t=>data.recipes.filter(x=>x.tier===t).length),[2,3,4,1,9,5]);
const r=data.recipes.find(x=>x.name==='Narzędzia T1');
const items=[{key:'1:0',id:1,level:0,name:'Wihajster',price:10,quantity:5},{key:'2:0',id:2,level:0,name:'Przyczłap',price:20,quantity:5},{key:'1:3',id:1,level:3,name:'Wihajster',price:1,quantity:100}];
let c=calculate(r,items,'bronze');assert.equal(c.totalCost,150);assert.equal(c.costPerCoin,18.75);assert.equal(c.lowerBound,true);
c=calculate(r,[{...items[0],quantity:4},items[1]],'bronze');assert.equal(c.complete,false);assert.equal(c.totalCost,null);assert.equal(c.costPerCoin,null);assert.equal(c.missing[0].missing,1);
assert.equal(calculate(r,[],'bronze').costPerCoin,null);
assert.equal(rank(data.recipes,items,'gold').length,14);assert.equal(rank(data.recipes,items,'silver').length,4);assert.equal(rank(data.recipes,items,'bronze').length,4);assert.equal(rank(data.recipes,items,'items').length,4);
assert.equal(rank([r,{name:'Cheaper',items:{Wihajster:1},reward:{bronze:8}}],items,'bronze')[0].recipe.name,'Cheaper');
const now=Date.now(),points=[{at:now-300000,seenAt:now-300000,item:{price:100,quantity:5}},{at:now-200000,seenAt:now-200000,item:{price:120,quantity:2}},{at:now-100000,seenAt:now-100000,item:null},{at:now,seenAt:now,item:{price:110,quantity:8}}];
const chart=series(points,7,now);assert.deepEqual(chart.quantities,[5,2,0,8]);assert.deepEqual(chart.deltas,[null,-3,-2,8]);assert.equal(chart.minimum,100);assert.equal(chart.maximum,120);
assert.ok(chart.svg.includes('Cena · zł'));assert.ok(chart.svg.includes('Dostępność · szt.'));assert.ok(chart.svg.includes('#217157'));assert.ok(chart.svg.includes('#477caa'));assert.ok(!/NaN|Infinity/.test(chart.svg));
assert.ok(!/NaN|Infinity/.test(series([points[0]],7,now).svg));assert.equal(series([],7,now).svg,'');
const egg=series([5999,5999,5999,5793].map((price,i)=>({at:now-(3-i)*600000,seenAt:now-(3-i)*600000,item:{price,quantity:i===3?2:1}})),7,now);
assert.deepEqual(egg.priceScale.ticks,[5700,5800,5900,6000,6100]);
assert.ok(egg.quantityScale.ticks.every(Number.isInteger));
assert.ok(egg.svg.includes('stroke-dasharray="7 5"'));
assert.ok(!/d="[^"]*V/.test(egg.svg));
assert.ok([...egg.svg.matchAll(/circle cx="([\d.]+)"/g)].every(m=>Number(m[1])>96&&Number(m[1])<784));
console.log('Collections: 24 recipes, tiers, separate currencies, integer costs, quantities, missing stock, base variants, ordering — OK');
console.log('Chart: two units/scales, missing offers, stock deltas, single sample, empty history — OK');

{const {calculate,purchaseLimit}=require('../collections.js');const r=calculate({name:'Limit',items:{A:1,B:1},reward:{gold:12}},[{name:'A',level:0,price:8000,quantity:1},{name:'B',level:0,price:3000,quantity:1}]);assert.equal(purchaseLimit(r,r.ingredients[0],1000),9000);assert.equal(purchaseLimit(r,r.ingredients[0],1000,8000),5000);assert.equal(purchaseLimit(r,r.ingredients[0],100),-1800);assert.equal(purchaseLimit(r,r.ingredients[0],null,null),null);const held=calculate(r.recipe,[{name:'A',level:0,price:8000,quantity:1}], 'gold',{b:1});assert.equal(purchaseLimit(held,held.ingredients[0],1000),12000);console.log('Purchase ceiling: other ingredients, budget, target, owned ingredients and unaffordable cap — OK');}
