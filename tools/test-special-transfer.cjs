const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app.js','utf8');
const code=source.slice(source.indexOf('let specialOpsTransferIndexGlobal='),source.indexOf('function specialOpsItemIconGlobal'));
const saved=new Map();let now=10000;
const box={hidden:true,html:'',buttons:new Map(),set innerHTML(value){this.html=value;this.buttons=new Map();},get innerHTML(){return this.html;},querySelector(selector){
 if(!this.buttons.has(selector))this.buttons.set(selector,{addEventListener(type,fn){this.click=fn;}});
 return this.buttons.get(selector);
}};
const context={Date:{now:()=>now},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},el:()=>box,escapeHtml:x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
vm.createContext(context);vm.runInContext(code+';globalThis.api={render:specialOpsRenderTransferGlobal,groups:specialOpsTransferGroupsGlobal,state:specialOpsTransferStateGlobal};',context);
const draw=(id,item,winner,order,status='pending')=>({id,itemKey:item,itemName:item==='spirit'?'Duch puszczy':'Legendarna taśma',winnerKey:winner,winner,drawOrder:order,status});
const payload={permissions:{admin:true},batch:{id:'batch1',status:'pending',draws:[draw('1','spirit','A',1),draw('2','tape','B',2),draw('3','tape','C',3)]},stash:[{itemKey:'spirit',quantity:1},{itemKey:'tape',quantity:2}],imports:[]};
const render=()=>context.api.render(payload);
const click=(selector,advance=600)=>{now+=advance;const button=box.buttons.get(`[data-special-transfer-${selector}]`);assert.ok(button?.click,selector);button.click();};
const current=()=>box.html.match(/<small>ODBIORCA<\/small><strong>(.*?)<\/strong>/)?.[1];
render();assert.equal(current(),'A');
assert.match(box.html,/Następny przedmiot: Legendarna taśma/);
click('confirm');assert.equal(current(),'A','stops at item boundary');assert.equal(context.api.state(payload).checked.length,1);
click('next');assert.equal(current(),'B');
click('confirm');assert.equal(current(),'C','moves to next recipient of same item');
click('confirm',0);assert.equal(context.api.state(payload).checked.length,2,'rapid second click cannot check next recipient');
click('confirm');assert.equal(current(),'C');assert.match(box.html,/Wszystkie przydziały oznaczone/);
// Reproduce the original end-of-list jump: leave Spirit unchecked and finish tapes.
click('prev');click('prev');click('confirm');assert.equal(current(),'A');
click('next');click('next');click('confirm');click('confirm');
assert.equal(current(),'C','no wrap to earlier unchecked Spirit');
assert.equal(context.api.state(payload).checked.length,2);
assert.doesNotMatch(box.html,/Wszystkie przydziały oznaczone/);
// Refresh/re-render must keep selected group by key, not shift with pending-array indexes.
payload.batch.draws[0].status='confirmed';render();assert.equal(current(),'C');
// New batch begins on its own first unmarked group, never inherits old numeric cursor.
payload.batch={id:'batch2',status:'pending',draws:[draw('4','spirit','D',1),draw('5','tape','E',2)]};render();assert.equal(current(),'D');
assert.equal(context.api.state(payload).checked.length,0);
// Quantities are grouped per item/recipient regardless of interleaved draw order.
payload.batch.draws.push(draw('6','spirit','D',3));
assert.equal(context.api.groups(payload).find(x=>x.winner==='D').quantity,2);
assert.equal(saved.has('menelwars-special-transfer:batch1'),true,'local progress retained');
assert.ok(payload.batch.draws.every(x=>x.status==='pending'),'checklist never confirms server draws');
console.log('OK: item-boundary stop, no wrap, double-click guard, stable selection, batches, grouping and local-only checklist.');
