(function(root){
 'use strict';
 const key=v=>String(v).normalize('NFKC').trim().toLocaleLowerCase('pl');
 function calculate(recipe,items,currency='gold',owned={}){
  const prices=new Map(items.filter(x=>x.level===0).map(x=>[key(x.name),x]));let cents=0;const missing=[];
  const ingredients=Object.entries(recipe.items).map(([name,requiredQuantity])=>{
   const deposited=Math.min(requiredQuantity,Math.max(0,Math.floor(Number(recipe.progress?.deposited?.[key(name)])||0))),held=Math.min(requiredQuantity-deposited,Math.max(0,Math.floor(Number(owned[key(name)])||0))),quantity=requiredQuantity-deposited-held;
   const item=prices.get(key(name)),available=item?.price!=null?item.quantity:0,unit=item?.price??null;
   if(quantity>0&&(available<quantity||unit===null))missing.push({name,missing:Math.max(0,quantity-available)});
   const cost=quantity===0?0:unit===null?null:Math.round(unit*100)*quantity;cents+=cost??0;
   return {name,quantity,held,deposited,requiredQuantity,available,price:unit,cost:cost===null?null:cost/100,marketKey:item?.key??null,icon:item?.icon||''};
  });
  const complete=missing.length===0,reward=Number(recipe.reward[currency])||0;
  return {recipe,complete,ingredients,missing,totalCost:complete?cents/100:null,costPerCoin:complete&&reward?cents/100/reward:null,reward,lowerBound:ingredients.some(x=>x.quantity>1)};
 }
 function rank(recipes,items,currency='gold',owned={}){
  return recipes.filter(r=>!r.progress?.completed).filter(r=>currency==='items'?Array.isArray(r.reward.items):Number(r.reward[currency])>0).map(r=>calculate(r,items,currency,owned)).sort((a,b)=>Number(b.complete)-Number(a.complete)||(currency==='items'?(a.totalCost??Infinity)-(b.totalCost??Infinity):(a.costPerCoin??Infinity)-(b.costPerCoin??Infinity))||(a.totalCost??Infinity)-(b.totalCost??Infinity)||a.recipe.name.localeCompare(b.recipe.name,'pl'));
 }
 function purchaseLimit(result,ingredient,target,budget=null){
  if(ingredient.quantity!==1)return null;
  const others=result.ingredients.filter(x=>x!==ingredient&&x.quantity>0);if(others.some(x=>x.cost===null||x.quantity>1))return null;
  const otherCost=others.reduce((v,x)=>v+Math.round(x.cost*100),0),caps=[];
  if(target!==null&&Number.isFinite(target)&&target>=0)caps.push(Math.round(target*100)*result.reward);
  if(budget!==null&&Number.isFinite(budget)&&budget>=0)caps.push(Math.round(budget*100));
  return caps.length?Math.floor((Math.min(...caps)-otherCost)/100):null;
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={calculate,rank,purchaseLimit};return;}
 const el=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>v==null?'—':new Intl.NumberFormat('pl-PL',{minimumFractionDigits:0,maximumFractionDigits:2}).format(v)+' zł';
 const labels={gold:'złotą monetę',silver:'srebrną monetę',bronze:'brązową monetę'},rewards={gold:'złotych',silver:'srebrnych',bronze:'brązowych'};
 let recipes=null,items=[],snapshot=null,loading=null,budget=null,owned={},target=null,progress={};
 function activeRecipes(){const result=(recipes||[]).map(r=>({...r,repeatable:true,progress:progress[key(r.name)]})),known=new Set(result.map(r=>key(r.name)));for(const r of Object.values(progress))if(!known.has(key(r.name))&&!r.completed)result.push({name:r.name,items:r.items,reward:r.reward,tier:null,imported:true,repeatable:false,progress:r});return result;}
 function rewardText(r){return ['gold','silver','bronze'].filter(k=>r[k]).map(k=>`${r[k]} ${rewards[k]} monet`).concat((r.items||[]).map(x=>`${x.quantity}× ${x.name}`)).join(' + ');}
 async function load(){
  if(recipes)return;if(loading)return loading;
  loading=(async()=>{try{const response=await fetch('collections-data.json?v=24.41');if(!response.ok)throw Error('Nie udało się pobrać listy kolekcji.');const data=await response.json();if(!Array.isArray(data.recipes))throw Error('Nieprawidłowy katalog kolekcji.');recipes=data.recipes;}finally{loading=null;}})();return loading;
 }
 function render(){
  if(!recipes)return;const openRecipes=new Set([...el('collection-list').querySelectorAll('details[open]')].map(d=>d.dataset.recipe));el('collection-owned').disabled=!Object.keys(owned).length;if(!Object.keys(owned).length)el('collection-owned').checked=false;el('collection-affordable').disabled=budget===null;if(budget===null)el('collection-affordable').checked=false;const currency=el('collection-currency').value,rows=rank(activeRecipes(),items,currency,el('collection-owned').checked?owned:{}),regular=rows.filter(x=>x.recipe.imported),allReady=rows.filter(x=>x.complete),ready=allReady.filter(x=>!x.recipe.imported).filter(x=>!el('collection-affordable').checked||budget===null||x.totalCost<=budget),unavailable=rows.filter(x=>!x.complete&&!x.recipe.imported);
  const personal=currency==='gold'?rank(activeRecipes(),items,'gold',owned).filter(r=>!r.recipe.imported).filter(r=>{const missing=r.ingredients.filter(i=>i.quantity>0);return r.ingredients.some(i=>i.held+i.deposited>0)&&missing.length===1&&missing[0].quantity===1;}):[];
  el('collection-personal').innerHTML=currency==='gold'?'<div class="market-section-heading"><h3>Twoje okazje · brakuje jednej sztuki</h3></div>'+(personal.length?'<div class="market-deals">'+personal.slice(0,6).map(r=>{const i=r.ingredients.find(i=>i.quantity),limit=purchaseLimit(r,i,target,budget);return '<article><small>'+esc(rewardText(r.recipe.reward))+'</small><b>'+esc(r.recipe.name)+'</b><span>Masz pozostałe składniki. Dokup: <b>'+esc(i.name)+'</b></span><strong>'+money(i.price)+'</strong><span>'+(i.price===null?'Brak ofert':money(r.costPerCoin)+' / złotą monetę')+'</span>'+(limit===null?'':'<span class="'+(limit>=0&&i.price!==null&&i.price<=limit?'market-down':'market-up')+'">'+(limit<0?'Przekracza wybrany limit':'Kup do '+money(limit)+' / szt.')+'</span>')+(budget!==null&&i.price!==null&&i.price>budget?'<span>Brakuje '+money(i.price-budget)+'</span>':'')+'<button type="button" data-collection-history="'+esc(r.recipe.name)+'">Wykres ceny kolekcji</button></article>';}).join('')+'</div>':'<p class="market-help">'+(Object.keys(owned).length||Object.keys(progress).length?'Nie ma teraz kolekcji za złote monety, do której brakuje Ci dokładnie jednej sztuki.':'Wklej swój ekwipunek w zakładce „Mój ekwipunek”, aby znaleźć kolekcje do taniego dokończenia.')+'</p>'):'';
  if(regular.length&&!personal.length)el('collection-personal').innerHTML='';
  const useOwned=el('collection-owned').checked||Object.keys(progress).length>0;
  el('collection-status').textContent=`${rows.length} kolekcji · ${allReady.length} dostępnych w całości${snapshot?.lastSeenAt?' · ceny z '+new Date(snapshot.lastSeenAt).toLocaleString('pl-PL'):''}`;
  function card(r,index){
   const affordable=budget!==null&&r.complete&&r.totalCost<=budget,shortfall=budget!==null&&r.complete?Math.max(0,r.totalCost-budget):null;
   return `<details data-recipe="${esc(r.recipe.name)}" class="collection-card ${r.complete?'':'collection-unavailable'}"><summary><div class="collection-name"><span class="collection-rank">${r.complete?index+1:'—'}</span><div><b>${esc(r.recipe.name)}</b><small>${r.recipe.imported?'Import':'T'+r.recipe.tier} · ${esc(rewardText(r.recipe.reward))}</small></div></div><div class="collection-value"><strong>${currency==='items'?money(r.totalCost):money(r.costPerCoin)}</strong><small>${currency==='items'?'koszt kompletu':'za '+labels[currency]}</small></div><div class="collection-total"><b>${money(r.totalCost)}</b><small>${r.complete?(affordable?'Mieści się w budżecie':shortfall>0?'Brakuje '+money(shortfall):(useOwned?'za dokupienie reszty':'za cały komplet')):'Braki: '+r.missing.length+' składników'}</small></div><span class="collection-chevron">⌄</span></summary><div class="collection-details">${currency==='gold'?'<button type="button" data-collection-history="'+esc(r.recipe.name)+'">Wykres ceny kolekcji</button>':''}<table><thead><tr><th>Składnik</th><th>${useOwned?'Do dokupienia / na rynku':'Potrzeba / na rynku'}</th><th>Cena sztuki</th><th>Koszt</th>${currency==='gold'?'<th>Kup do / szt.</th>':''}</tr></thead><tbody>${r.ingredients.map(i=>`<tr><td>${i.marketKey?`<button type="button" data-collection-item="${esc(i.marketKey)}">${esc(i.name)}</button>`:esc(i.name)}</td><td class="${i.available<i.quantity?'collection-shortage':''}">${i.quantity} / ${i.available}${i.held?'<small> · w schowkach '+i.held+'</small>':''}${i.deposited?'<small> · oddane '+i.deposited+'</small>':''}</td><td>${money(i.price)}</td><td>${i.available<i.quantity?'Brak '+(i.quantity-i.available)+' szt.':money(i.cost)}</td>${currency==='gold'?'<td>'+(()=>{const limit=purchaseLimit(r,i,target,budget);return i.quantity===0?'Masz':limit===null?'—':limit<0?'Poza limitem':money(limit);})()+'</td>':''}</tr>`).join('')}</tbody></table>${currency==='gold'?'<p>„Kup do” uwzględnia Twój limit ceny za monetę i budżet. Pozostałe składniki muszą pozostać w podanych cenach. Limitów dla różnych składników nie należy sumować. Dla wielu sztuk nie zgadujemy kolejnych cen.</p>':''}${r.lowerBound?'<p>Koszt dla kilku sztuk jest dolnym oszacowaniem: kolejne oferty mogą być droższe od minimum.</p>':''}${budget!==null&&r.complete?'<p class="'+(affordable?'market-down':'market-up')+'">'+(affordable?'Po zakupie pozostanie '+money(budget-r.totalCost):'Do zakupu brakuje '+money(shortfall))+'</p>':''}</div></details>`;
  }
  el('collection-list').innerHTML=(regular.length?'<h3 class="collection-section-title">Twoje aktywne kolekcje zwykłe · '+regular.length+'</h3><p class="market-help">Postęp z Kolekcjonera. Wszystkie nieukończone zestawy, także bez ofert lub poza budżetem.</p>'+regular.map(card).join('')+'<h3 class="collection-section-title">Kolekcje powtarzalne</h3>':'')+(ready.length?ready.map(card).join(''):allReady.length?'<p class="market-help">Żaden dostępny komplet nie mieści się w podanym budżecie.</p>':'<p class="market-help">Żadna kolekcja w tej grupie nie jest obecnie dostępna w całości.</p>')+(unavailable.length?'<h3 class="collection-section-title">Brakujące składniki na rynku</h3><p class="market-help">Te zestawy nie są uwzględniane w rankingu ceny za monetę.</p>'+unavailable.map(card).join(''):'');
  el('market-collections-pane').querySelectorAll('[data-collection-history]').forEach(b=>b.onclick=()=>root.CollectionHistory.open(activeRecipes().find(r=>r.name===b.dataset.collectionHistory),items));
  el('collection-list').querySelectorAll('details[data-recipe]').forEach(d=>{d.open=openRecipes.has(d.dataset.recipe);});
  el('collection-list').querySelectorAll('[data-collection-item]').forEach(b=>b.onclick=()=>root.MarketView.history(b.dataset.collectionItem));
 }
 el('collection-target').oninput=e=>{const n=Number(e.target.value);target=e.target.value!==''&&Number.isFinite(n)&&n>=0?n:null;render();};
 el('collection-currency').onchange=render;
 el('collection-affordable').onchange=render;el('collection-owned').onchange=render;
 el('collection-budget').oninput=e=>{if(!e.isTrusted)return;const n=Number(e.target.value);budget=e.target.value!==''&&Number.isFinite(n)&&n>=0?n:null;render();root.MarketDesk?.budgetChanged(budget);};
 el('collection-controls').onsubmit=e=>e.preventDefault();
 el('collection-refresh').onclick=()=>root.MarketView.refresh();
 root.MarketCollections={calculate,getRecipes:async()=>{await load();return activeRecipes();},setProgress:value=>{progress=value;render();},getBudget:()=>budget,setOwned:value=>{owned=value;render();},setBudget:value=>{budget=value;el('collection-budget').value=value??'';render();},reset:()=>{root.CollectionHistory?.reset();budget=null;owned={};progress={};target=null;el('collection-target').value='';el('collection-owned').checked=false;el('collection-budget').value='';el('collection-affordable').checked=false;items=[];snapshot=null;render();},update:(list,data)=>{items=list;snapshot=data;render();},open:async()=>{el('collection-status').textContent='Pobieram kolekcje…';try{await load();render();}catch(e){el('collection-status').textContent=e.message;}}};
})(typeof window!=='undefined'?window:globalThis);
