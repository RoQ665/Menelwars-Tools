(function(root){
 'use strict';
 const norm=v=>String(v).normalize('NFKC').trim().toLocaleLowerCase('pl');
 function signal(x){
  const p=x.stepChange,q=x.quantityChange;if(q==null)return null;
  if(p<0&&q>0)return {label:'Cena ↓ · sztuk ↑',tone:'good'};
  if(p>0&&q<0)return {label:'Cena ↑ · sztuk ↓',tone:'warm'};
  if(p<0&&q<0)return {label:'Cena ↓ · sztuk ↓',tone:'neutral'};
  if(p>0&&q>0)return {label:'Cena ↑ · sztuk ↑',tone:'neutral'};
  if(p<0&&q===0)return {label:'Cena ↓ · tyle samo sztuk',tone:'neutral'};
  if(p>0&&q===0)return {label:'Cena ↑ · tyle samo sztuk',tone:'neutral'};
  if(q>0)return {label:'Przybyło sztuk',tone:'neutral'};
  if(q<0)return {label:'Ubyło sztuk',tone:'neutral'};
  return null;
 }
 function context(x){
  const s=x.stats7d;if(x.price==null)return {label:'Brak ofert',tone:'neutral'};
  if(!s||!s.samples)return {label:'Brak historii ceny',tone:'neutral'};
  const delta=s.median>0?(x.price/s.median-1)*100:null;
  return {label:delta===null?'Mediana wynosi 0 zł':Math.abs(delta)<.05?'Na poziomie mediany':Math.abs(delta).toLocaleString('pl-PL',{maximumFractionDigits:1})+'% '+(delta<0?'poniżej':'powyżej')+' mediany',tone:s.mature&&delta!==null&&delta<=-5?'good':s.mature&&delta>=5?'warm':'neutral',short:!s.mature};
 }
 function lootOptions(recipes,items,candidates,budget,calculate){
  const market=new Map(items.filter(x=>x.level===0).map(x=>[norm(x.name),x]));
  return candidates.map(c=>{
   const options=recipes.filter(r=>r.reward.gold>0&&Object.keys(r.items).some(n=>norm(n)===norm(c.name))).map(r=>calculate(r,items,'gold',{[norm(c.name)]:c.quantity}));
   options.sort((a,b)=>Number(b.complete&&budget!==null&&b.totalCost<=budget)-Number(a.complete&&budget!==null&&a.totalCost<=budget)||Number(b.complete)-Number(a.complete)||(a.costPerCoin??Infinity)-(b.costPerCoin??Infinity)||(a.totalCost??Infinity)-(b.totalCost??Infinity)||a.missing.length-b.missing.length||a.recipe.name.localeCompare(b.recipe.name,'pl'));
   return {...c,market:market.get(norm(c.name))??null,best:options[0]??null,options};
  }).sort((a,b)=>Number(Boolean(b.best?.complete&&budget!==null&&b.best.totalCost<=budget))-Number(Boolean(a.best?.complete&&budget!==null&&a.best.totalCost<=budget))||Number(Boolean(b.best?.complete))-Number(Boolean(a.best?.complete))||(a.best?.costPerCoin??Infinity)-(b.best?.costPerCoin??Infinity)||(a.best?.totalCost??Infinity)-(b.best?.totalCost??Infinity));
 }
 function tradeCandidate(x,budget=null){
  const stats=x.stats7d;if(x.price==null||!stats||stats.samples<2||x.quantity<1||!Number.isFinite(x.price)||x.price>1e12)return null;
  let resale=Math.floor(stats.median);
  if(x.minListingPrice!=null&&resale<Math.ceil(x.minListingPrice))return null;
  if(x.maxListingPrice!=null)resale=Math.min(resale,Math.floor(x.maxListingPrice));
  const fee=Math.floor(resale*.05),profit=Math.round((resale-fee-x.price)*100)/100,capital=x.price+fee;
  let low=0,high=Math.ceil(x.price/.95)+2;while(low<high){const mid=Math.floor((low+high)/2);if(mid-Math.floor(mid*.05)>=x.price)high=mid;else low=mid+1;}
  return {item:x,resale,fee,profit,capital,breakEven:low,roi:x.price>0?profit/x.price*100:null,affordable:budget===null||capital<=budget,confirmed:stats.mature&&stats.dropIntervals>=3,limitsKnown:x.minListingPrice!=null&&x.maxListingPrice!=null};
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={signal,context,lootOptions,tradeCandidate};return;}
 root.MarketEngine={signal,context};
 const el=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>v==null?'—':new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2}).format(v)+' zł';
 let api,items=[],snapshot=null,viewer=null,version=-1,watch=[],recipes=null,candidates=[],budget=null;
 const drafts=new Map(),pending=new Map();
 const selected=key=>watch.find(x=>x.key===key);
 function badges(x){const s=signal(x),c=context(x);return `<span class="market-context ${c.tone}">${esc(c.label)}</span>${s?`<span class="market-signal ${s.tone}" title="Zmiana od poprzedniej migawki; nie potwierdza transakcji">${esc(s.label)}</span>`:''}`;}
 function renderWatch(){
  el('market-watch-count').textContent=watch.length?'('+watch.length+')':'';
  const rows=watch.map(w=>({w,x:items.find(x=>x.key===w.key)}));
  const hits=rows.filter(({w,x})=>x?.price!=null&&x.quantity>0&&w.targetPrice!==null&&x.price<=w.targetPrice);
  el('market-watch-alerts').hidden=!hits.length;
  el('market-watch-alerts').textContent=hits.length===1?'1 obserwowany przedmiot osiągnął cenę docelową →':hits.length+' obserwowanych przedmiotów osiągnęło cenę docelową →';
  el('market-watch-list').innerHTML=!viewer?'<p class="market-help">Zaloguj się na konto, aby zapisać własne obserwowane i ceny docelowe. <a href="#konto">Przejdź do konta</a></p>':!watch.length?'<div class="market-empty">Kliknij ☆ przy przedmiocie w notowaniach. Lista i ceny docelowe zapiszą się na Twoim koncie.</div>':rows.map(({w,x})=>{
   const hit=x?.price!=null&&w.targetPrice!==null&&x.price<=w.targetPrice;
   return `<article class="market-watch-card ${hit?'target-hit':''}"><div><div class="market-watch-heading"><button type="button" class="market-name-link" data-watch-history="${esc(w.key)}">${esc(x?.name||'Przedmiot '+w.key)}${x?.level?' +'+x.level:''}</button><button type="button" class="market-watch-bell" data-watch-notify="${esc(w.key)}" aria-label="${w.notify?'Wyłącz':'Włącz'} powiadomienia: ${esc(x?.name||w.key)}" aria-pressed="${Boolean(w.notify)}" title="${w.notify?'Powiadomienia włączone':'Włącz powiadomienia'}" ${pending.has(w.key)?'disabled':''}>${w.notify?'🔔':'🔕'}</button></div><strong>${money(x?.price)}</strong><small>${x?.quantity??0} szt. na rynku</small>${x?badges(x):''}${hit?'<b class="market-target-hit">Cena docelowa osiągnięta</b>':''}</div><form data-watch-form="${esc(w.key)}"><label>Cena maksymalna za sztukę · zł (opcjonalna)<input name="target" type="number" min="0" max="1000000000000" step="0.01" inputmode="decimal" autocomplete="off" data-lpignore="true" placeholder="Bez limitu" value="${esc(drafts.has(w.key)?drafts.get(w.key):w.targetPrice??'')}"></label><button type="submit" ${pending.has(w.key)?'disabled':''}>Zapisz cenę</button><button type="button" data-watch-remove="${esc(w.key)}" ${pending.has(w.key)?'disabled':''}>Usuń</button></form></article>`;
  }).join('');
  el('market-watch-list').querySelectorAll('[data-watch-history]').forEach(b=>b.onclick=()=>root.MarketView.history(b.dataset.watchHistory));
  el('market-watch-list').querySelectorAll('[data-watch-remove]').forEach(b=>b.onclick=()=>save(b.dataset.watchRemove,false,null));
  el('market-watch-list').querySelectorAll('[data-watch-notify]').forEach(b=>b.onclick=()=>{const key=b.dataset.watchNotify,w=selected(key),raw=drafts.has(key)?drafts.get(key):w.targetPrice;const target=raw===''||raw==null?null:Number(raw);if(target!==null&&(!Number.isFinite(target)||target<0)){el('market-desk-message').textContent='Podaj poprawną cenę maksymalną.';return;}void save(key,true,target,!w.notify);});
  el('market-watch-list').querySelectorAll('[data-watch-form]').forEach(f=>{
   f.elements.target.oninput=()=>drafts.set(f.dataset.watchForm,f.elements.target.value);
   f.onsubmit=e=>{e.preventDefault();const n=f.elements.target.value===''?null:Number(f.elements.target.value);if(n!==null&&(!Number.isFinite(n)||n<0))return;void save(f.dataset.watchForm,true,n);};
  });
 }
 async function save(key,enabled,target,notify){
  if(pending.has(key))return;
  if(!viewer){el('market-desk-message').textContent='Zaloguj się, aby zapisać obserwowane przedmioty.';return;}
  const owner=viewer;pending.set(key,owner);renderWatch();
  try{const result=await api('/market/watch',{method:'POST',body:{key,watch:enabled,targetPrice:target,...(notify===undefined?{}:{notify})}});if(owner!==viewer)return;if(result.watchVersion>=version){watch=result.watchlist;version=result.watchVersion;}drafts.delete(key);el('market-desk-message').textContent=enabled?'Zapisano obserwowany przedmiot.':'Usunięto z obserwowanych.';root.MarketView.render();}
  catch(e){if(owner===viewer)el('market-desk-message').textContent=e.message;}
  finally{if(pending.get(key)===owner)pending.delete(key);renderWatch();}
 }
 function renderTrade(){
  const mode=el('market-trade-sort').value;
  const rows=items.map(x=>tradeCandidate(x,budget)).filter(x=>x&&x.profit>0&&x.affordable);
  rows.sort((a,b)=>Number(b.confirmed)-Number(a.confirmed)||(mode==='roi'?(b.roi??0)-(a.roi??0):mode==='flow'?(b.item.stats7d.removed-a.item.stats7d.removed):b.profit-a.profit)||b.profit-a.profit);
  el('market-trade-count').textContent=rows.length+' kandydatów z dodatnią marżą po jednej opłacie 5%'+(budget===null?'':' · zakup i wystawienie mieszczą się w budżecie');
  el('market-trade-results').innerHTML=rows.length?rows.slice(0,50).map(r=>{
   const x=r.item,stats=x.stats7d;
   return '<article class="market-trade-card"><div class="market-section-heading"><button class="market-name-link" data-trade-history="'+esc(x.key)+'">'+esc(x.name)+(x.level?' +'+x.level:'')+'</button><span>'+ (r.confirmed?'Więcej obserwacji':'Wstępny kandydat · mało potwierdzeń')+'</span></div><div class="market-trade-metrics"><div><small>Zakup · 1 szt.</small><b>'+money(x.price)+'</b></div><div><small>Cena odsprzedaży odniesienia</small><b>'+money(r.resale)+'</b></div><div><small>Opłata wystawienia</small><b>'+money(r.fee)+'</b></div><div><small>Możliwy zysk po opłacie</small><b class="market-down">+'+money(r.profit)+'</b><small>'+(r.roi===null?'':r.roi.toFixed(1)+'% względem zakupu')+'</small></div></div><p class="market-help">Potrzebny kapitał: '+money(r.capital)+' · cena wyjścia bez straty: '+money(r.breakEven)+'.</p><p>Ubytki między odczytami: <b>'+stats.removed+' szt.</b> · przyrosty: '+stats.added+' szt. · ubytki w '+stats.dropIntervals+' odstępach między odczytami. Na rynku teraz: '+x.quantity+' szt.</p>'+(stats.dropPriceMin===null?'':'<p class="market-help">Minimum ofertowe przed ubytkami: '+money(stats.dropPriceMin)+'–'+money(stats.dropPriceMax)+'. Nie znamy ceny ani przyczyny zniknięcia każdej oferty.</p>')+'<p class="market-help">'+(r.limitsKnown?'Cena odniesienia mieści się w przechwyconych widełkach wystawienia.':'Sprawdź widełki wystawienia w grze — starszy raport ich nie zawiera.')+' Odsprzedaż zakłada powrót do mediany ofert; obecne tańsze oferty mogą konkurować z Twoją. Każde ponowne wystawienie kosztuje dodatkowo.</p><button type="button" data-trade-watch="'+esc(x.key)+'">'+(selected(x.key)?'Obserwujesz ten przedmiot':'☆ Obserwuj')+'</button> <button type="button" data-trade-calculator="'+esc(x.key)+'">Policz wystawienie</button></article>';
  }).join(''):'<p class="market-empty">Brak kandydatów z dodatnią marżą po opłacie w podanym budżecie. Sam spadek ceny nie musi wystarczyć na pokrycie kosztu wystawienia.</p>';
  el('market-trade-results').querySelectorAll('[data-trade-calculator]').forEach(b=>b.onclick=()=>{const x=items.find(x=>x.key===b.dataset.tradeCalculator),r=tradeCandidate(x,budget);if(r)root.MarketFinance.calculator({quantity:1,buyPrice:x.price,salePrice:r.resale});});
  el('market-trade-results').querySelectorAll('[data-trade-history]').forEach(b=>b.onclick=()=>root.MarketView.history(b.dataset.tradeHistory));
  el('market-trade-results').querySelectorAll('[data-trade-watch]').forEach(b=>b.onclick=()=>save(b.dataset.tradeWatch,true,selected(b.dataset.tradeWatch)?.targetPrice??null));
 }
 function renderLoot(){
  if(!recipes)return;
  const names=new Set([...items.filter(x=>x.level===0).map(x=>x.name),...recipes.flatMap(r=>Object.keys(r.items))]);
  el('market-loot-options').innerHTML=[...names].sort((a,b)=>a.localeCompare(b,'pl')).map(n=>'<option value="'+esc(n)+'"></option>').join('');
  el('market-loot-selected').innerHTML=candidates.map((c,i)=>`<div class="market-loot-chip"><span>${esc(c.name)}</span><label>Szt.<input type="number" min="1" max="1000000000" value="${c.quantity}" data-loot-quantity="${i}" aria-label="Liczba sztuk: ${esc(c.name)}"></label><button type="button" data-loot-remove="${i}" aria-label="Usuń ${esc(c.name)}">✕</button></div>`).join('');
  el('market-loot-selected').querySelectorAll('[data-loot-remove]').forEach(b=>b.onclick=()=>{candidates.splice(Number(b.dataset.lootRemove),1);renderLoot();});
  el('market-loot-selected').querySelectorAll('[data-loot-quantity]').forEach(i=>i.onchange=()=>{candidates[Number(i.dataset.lootQuantity)].quantity=Math.min(1000000000,Math.max(1,Math.floor(Number(i.value)||1)));renderLoot();});
  const ranked=lootOptions(recipes,items,candidates,budget,root.MarketCollections.calculate);
  el('market-loot-results').innerHTML=ranked.length?ranked.map((r,i)=>{
   const b=r.best,affordable=b?.complete&&budget!==null&&b.totalCost<=budget;
   const alternatives=r.options.filter(x=>x!==b);
   return `<article class="market-loot-result"><div class="market-section-heading"><h3>${i+1}. ${esc(r.name)}</h3><span>${r.quantity} szt. do zatrzymania</span></div>${b?`<p>Najkorzystniejsza kolekcja: <b>${esc(b.recipe.name)}</b> · ${b.reward} złotych monet</p>${b.complete?`<div class="market-loot-metrics"><div><small>Do dokupienia</small><strong>${money(b.totalCost)}</strong></div><div><small>Za złotą monetę</small><strong>${money(b.costPerCoin)}</strong></div></div>${budget===null?'':`<p class="${affordable?'market-down':'market-up'}">${affordable?'Mieści się w budżecie · pozostanie '+money(budget-b.totalCost):'Brakuje '+money(b.totalCost-budget)}</p>`}`:`<p class="sync-notice">Nie można teraz skompletować zestawu. Brak na rynku: ${b.missing.map(x=>esc(x.name)).join(', ')}. Nie wyliczamy ceny za monetę.</p>`}<details><summary>Co trzeba dokupić?</summary><ul>${b.ingredients.map(x=>`<li>${esc(x.name)}: ${x.held?'zatrzymujesz '+x.held+' · ':''}${x.quantity?'dokup '+x.quantity+' · '+(x.available<x.quantity?'brak wystarczającej liczby ofert':money(x.cost)):'nic nie dokupujesz'}</li>`).join('')}</ul></details>${alternatives.length?`<details><summary>Inne kolekcje (${alternatives.length})</summary><ul>${alternatives.map(x=>`<li>${esc(x.recipe.name)}: ${x.complete?money(x.costPerCoin)+' / monetę · dokupienie '+money(x.totalCost):'brak składników na rynku'}</li>`).join('')}</ul></details>`:''}`:'<p>Ten przedmiot nie jest składnikiem znanych powtarzalnych kolekcji za złote monety.</p>'}<p class="market-help">${r.market?.price!=null?'Aktualne minimum ofertowe tego przedmiotu: '+money(r.market.price)+' / szt. · '+r.market.quantity+' szt. na rynku.':'Brak aktualnej oferty tego składnika na rynku.'} To porównanie ofert, nie gwarantowany przychód ze sprzedaży.</p></article>`;
  }).join(''):'<p class="market-help">Dodaj przedmioty proponowane przez NPC. Każdy wariant liczymy osobno — zakładamy zatrzymanie tylko wskazanej nagrody.</p>';
 }
 async function openLoot(){
  el('market-loot-status').textContent='Pobieram kolekcje…';
  try{recipes=await root.MarketCollections.getRecipes();budget=root.MarketCollections.getBudget();el('market-loot-budget').value=budget??'';renderLoot();el('market-loot-status').textContent='Koszt dokupienia pozostałych składników / nagroda w złotych monetach. Ranking uwzględnia podany budżet.';}
  catch(e){el('market-loot-status').textContent=e.message;}
 }
 el('market-loot-add').onsubmit=e=>{
  e.preventDefault();if(!recipes)return;const input=el('market-loot-name'),n=norm(input.value),names=[...items.filter(x=>x.level===0).map(x=>x.name),...recipes.flatMap(r=>Object.keys(r.items))],name=names.find(x=>norm(x)===n);
  if(!name){el('market-loot-status').textContent='Wybierz przedmiot z podpowiedzi.';return;}
  if(candidates.some(x=>norm(x.name)===n)){el('market-loot-status').textContent='Ten przedmiot już jest na liście.';return;}
  if(candidates.length>=8){el('market-loot-status').textContent='Porównaj najwyżej 8 nagród jednocześnie.';return;}
  candidates.push({name,quantity:1});input.value='';renderLoot();
 };
 el('market-trade-sort').onchange=renderTrade;
 el('market-trade-budget').oninput=e=>{const n=Number(e.target.value);budget=e.target.value!==''&&Number.isFinite(n)&&n>=0?n:null;root.MarketCollections.setBudget(budget);el('market-loot-budget').value=budget??'';renderTrade();renderLoot();};
 el('market-loot-budget').oninput=e=>{const n=Number(e.target.value);budget=e.target.value!==''&&Number.isFinite(n)&&n>=0?n:null;root.MarketCollections.setBudget(budget);el('market-trade-budget').value=budget??'';renderTrade();renderLoot();};
 el('market-watch-alerts').onclick=()=>root.MarketView.pane('watch');
 root.MarketDesk={configure:fn=>{api=fn;},selected,badges,save,openLoot,addLoot:async(name,quantity=1)=>{await openLoot();if(!candidates.some(x=>norm(x.name)===norm(name)))candidates.push({name,quantity:Math.min(1000000000,Math.max(1,quantity))});renderLoot();},openTrade:()=>{budget=root.MarketCollections.getBudget();el('market-trade-budget').value=budget??'';renderTrade();},
  budgetChanged:value=>{budget=value;el('market-loot-budget').value=value??'';el('market-trade-budget').value=value??'';renderLoot();renderTrade();},
  bindStars:container=>container.querySelectorAll('[data-market-watch]').forEach(b=>b.onclick=()=>{const w=selected(b.dataset.marketWatch);void save(b.dataset.marketWatch,!w,null);}),
  update:(list,data)=>{items=list;snapshot=data;const next=data?.viewer?.nick??null;if(next!==viewer){viewer=next;version=-1;watch=[];drafts.clear();pending.clear();candidates=[];budget=null;el('market-loot-budget').value='';el('market-trade-budget').value='';}if((data?.watchVersion??0)>=version){watch=data?.watchlist??[];version=data?.watchVersion??0;}renderWatch();renderLoot();renderTrade();},
  contextPanel:x=>{const s=x?.stats7d;if(!s)return '<p class="market-help">Na razie brak historii do porównania ceny.</p>';return `<div class="market-price-context"><div><small>Minimum · 7 dni</small><b>${money(s.min)}</b></div><div><small>Mediana · 7 dni</small><b>${money(s.median)}</b></div><div><small>Maksimum · 7 dni</small><b>${money(s.max)}</b></div></div><p class="market-help">${s.days} ${s.days===1?'dzień':'dni'} obserwacji · ${s.samples} odczytów cen minimalnych. ${s.mature?'':'Mało historii — to jeszcze nie mocna podstawa do oceny okazji. '}Ubytki między odczytami: ${s.removed??0} szt. · przyrosty: ${s.added??0} szt. (nie potwierdzają sprzedaży). Bieżący dzień i sześć poprzednich; mediana dotyczy migawek ofert, nie transakcji.</p>`;}
 };
})(typeof window!=='undefined'?window:globalThis);
