(function(root){
 'use strict';
 const key=v=>String(v).normalize('NFKC').trim().toLocaleLowerCase('pl');
 function calculate(recipe,items,currency='gold'){
  const prices=new Map(items.filter(x=>x.level===0).map(x=>[key(x.name),x]));let cents=0;const missing=[];
  const ingredients=Object.entries(recipe.items).map(([name,quantity])=>{
   const item=prices.get(key(name)),available=item?.price!=null?item.quantity:0,unit=item?.price??null;
   if(available<quantity||unit===null)missing.push({name,missing:Math.max(0,quantity-available)});
   const cost=unit===null?null:Math.round(unit*100)*quantity;cents+=cost??0;
   return {name,quantity,available,price:unit,cost:cost===null?null:cost/100,marketKey:item?.key??null,icon:item?.icon||''};
  });
  const complete=missing.length===0,reward=Number(recipe.reward[currency])||0;
  return {recipe,complete,ingredients,missing,totalCost:complete?cents/100:null,costPerCoin:complete&&reward?cents/100/reward:null,reward,lowerBound:ingredients.some(x=>x.quantity>1)};
 }
 function rank(recipes,items,currency='gold'){
  return recipes.filter(r=>currency==='items'?Array.isArray(r.reward.items):Number(r.reward[currency])>0).map(r=>calculate(r,items,currency)).sort((a,b)=>Number(b.complete)-Number(a.complete)||(currency==='items'?(a.totalCost??Infinity)-(b.totalCost??Infinity):(a.costPerCoin??Infinity)-(b.costPerCoin??Infinity))||(a.totalCost??Infinity)-(b.totalCost??Infinity)||a.recipe.name.localeCompare(b.recipe.name,'pl'));
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={calculate,rank};return;}
 const el=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>v==null?'—':new Intl.NumberFormat('pl-PL',{minimumFractionDigits:0,maximumFractionDigits:2}).format(v)+' zł';
 const labels={gold:'złotą monetę',silver:'srebrną monetę',bronze:'brązową monetę'},rewards={gold:'złotych',silver:'srebrnych',bronze:'brązowych'};
 let recipes=null,items=[],snapshot=null,loading=null,budget=null;
 function rewardText(r){return ['gold','silver','bronze'].filter(k=>r[k]).map(k=>`${r[k]} ${rewards[k]} monet`).concat((r.items||[]).map(x=>`${x.quantity}× ${x.name}`)).join(' + ');}
 async function load(){
  if(recipes)return;if(loading)return loading;
  loading=(async()=>{try{const response=await fetch('collections-data.json?v=24.41');if(!response.ok)throw Error('Nie udało się pobrać listy kolekcji.');const data=await response.json();if(!Array.isArray(data.recipes))throw Error('Nieprawidłowy katalog kolekcji.');recipes=data.recipes;}finally{loading=null;}})();return loading;
 }
 function render(){
  if(!recipes)return;const currency=el('collection-currency').value,rows=rank(recipes,items,currency),ready=rows.filter(x=>x.complete),unavailable=rows.filter(x=>!x.complete);
  el('collection-status').textContent=`${rows.length} kolekcji · ${ready.length} dostępnych w całości${snapshot?.lastSeenAt?' · ceny z '+new Date(snapshot.lastSeenAt).toLocaleString('pl-PL'):''}`;
  function card(r,index){
   const affordable=budget!==null&&r.complete&&r.totalCost<=budget,shortfall=budget!==null&&r.complete?Math.max(0,r.totalCost-budget):null;
   return `<details class="collection-card ${r.complete?'':'collection-unavailable'}"><summary><div class="collection-name"><span class="collection-rank">${r.complete?index+1:'—'}</span><div><b>${esc(r.recipe.name)}</b><small>T${r.recipe.tier} · ${esc(rewardText(r.recipe.reward))}</small></div></div><div class="collection-value"><strong>${currency==='items'?money(r.totalCost):money(r.costPerCoin)}</strong><small>${currency==='items'?'koszt kompletu':'za '+labels[currency]}</small></div><div class="collection-total"><b>${money(r.totalCost)}</b><small>${r.complete?(affordable?'Mieści się w budżecie':shortfall>0?'Brakuje '+money(shortfall):'za cały komplet'):'Braki: '+r.missing.length+' składników'}</small></div><span class="collection-chevron">⌄</span></summary><div class="collection-details"><table><thead><tr><th>Składnik</th><th>Potrzeba / na rynku</th><th>Cena sztuki</th><th>Koszt</th></tr></thead><tbody>${r.ingredients.map(i=>`<tr><td>${i.marketKey?`<button type="button" data-collection-item="${esc(i.marketKey)}">${esc(i.name)}</button>`:esc(i.name)}</td><td class="${i.available<i.quantity?'collection-shortage':''}">${i.quantity} / ${i.available}</td><td>${money(i.price)}</td><td>${i.available<i.quantity?'Brak '+(i.quantity-i.available)+' szt.':money(i.cost)}</td></tr>`).join('')}</tbody></table>${r.lowerBound?'<p>Koszt dla kilku sztuk jest dolnym oszacowaniem: kolejne oferty mogą być droższe od minimum.</p>':''}${budget!==null&&r.complete?'<p class="'+(affordable?'market-down':'market-up')+'">'+(affordable?'Po zakupie pozostanie '+money(budget-r.totalCost):'Do zakupu brakuje '+money(shortfall))+'</p>':''}</div></details>`;
  }
  el('collection-list').innerHTML=(ready.length?ready.map(card).join(''):'<p class="market-help">Żadna kolekcja w tej grupie nie jest obecnie dostępna w całości.</p>')+(unavailable.length?'<h3 class="collection-section-title">Brakujące składniki na rynku</h3><p class="market-help">Te zestawy nie są uwzględniane w rankingu ceny za monetę.</p>'+unavailable.map(card).join(''):'');
  el('collection-list').querySelectorAll('[data-collection-item]').forEach(b=>b.onclick=()=>root.MarketView.history(b.dataset.collectionItem));
 }
 el('collection-currency').onchange=render;
 el('collection-budget').oninput=e=>{if(!e.isTrusted)return;const n=Number(e.target.value);budget=e.target.value!==''&&Number.isFinite(n)&&n>=0?n:null;render();};
 el('collection-controls').onsubmit=e=>e.preventDefault();
 el('collection-refresh').onclick=()=>root.MarketView.refresh();
 root.MarketCollections={reset:()=>{budget=null;el('collection-budget').value='';items=[];snapshot=null;render();},update:(list,data)=>{items=list;snapshot=data;render();},open:async()=>{el('collection-status').textContent='Pobieram kolekcje…';try{await load();render();}catch(e){el('collection-status').textContent=e.message;}}};
})(typeof window!=='undefined'?window:globalThis);
