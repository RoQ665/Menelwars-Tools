(() => {
 'use strict';
 const el=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>v==null?'—':new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2}).format(v)+' zł';
 const labels={backpack:'Plecak',stash:'Rupieciarnia',safe:'Sejf'},choices={market:'Bazar daje więcej',paser:'Porównaj z paserem',keep:'Do zachowania',collection:'Składnik kolekcji',check:'Sprawdź ręcznie'};
 let viewer=null,book={sources:{},money:null},items=[],catalog=null,recipes=null,loading=null,catalogDate=null;
 const storageKey=()=>viewer?'mwt-inventory-v1:'+encodeURIComponent(viewer.toLocaleLowerCase('pl')):null;
 function loadBook(){
  book={sources:{},money:null};if(!viewer)return;
  try{const raw=JSON.parse(localStorage.getItem(storageKey())||'null');if(!raw)return;
   for(const source of Object.keys(labels)){const s=raw.sources?.[source];if(!s)continue;if(!Array.isArray(s.items)||s.items.length>1000)throw Error();
    if(!s.items.every(x=>typeof x.name==='string'&&x.name.length<=150&&Number.isSafeInteger(x.level)&&x.level>=0&&x.level<=100&&Number.isSafeInteger(x.quantity)&&x.quantity>0&&x.quantity<=1e9&&(x.id===null||Number.isSafeInteger(x.id))))throw Error();
    book.sources[source]={items:s.items,at:Number(s.at)||0};
   }
   book.money=typeof raw.money==='number'&&Number.isFinite(raw.money)&&raw.money>=0?raw.money:null;
  }catch{book={sources:{},money:null};}
 }
 function saveBook(){try{localStorage.setItem(storageKey(),JSON.stringify(book));return true;}catch{el('inventory-message').textContent='Analiza działa, ale przeglądarka nie pozwala zapisać schowków lokalnie.';return false;}}
 function rows(){return Object.entries(book.sources).flatMap(([source,s])=>s.items.map(x=>({...x,source})));}
 function applyOwned(){const owned={};for(const x of rows())if(x.level===0&&(x.source!=='safe'||el('inventory-include-safe').checked)){const key=x.name.normalize('NFKC').trim().toLocaleLowerCase('pl');owned[key]=(owned[key]||0)+x.quantity;}window.MarketCollections.setOwned(owned);}
 async function load(){if(catalog&&recipes)return;if(loading)return loading;loading=(async()=>{try{const [response,list]=await Promise.all([fetch('market-item-data.json?v=24.44'),window.MarketCollections.getRecipes()]);if(!response.ok)throw Error('Nie udało się pobrać cen pasera.');const data=await response.json();if(!Array.isArray(data.items))throw Error('Nieprawidłowy katalog przedmiotów.');catalog=data.items;catalogDate=data.checkedAt;recipes=list;}finally{loading=null;}})();return loading;}
 function render(){
  el('inventory-import-controls').hidden=!viewer;el('inventory-login-note').hidden=Boolean(viewer);
  el('inventory-catalog-date').textContent=catalogDate?'Bazowe ceny pasera z wiki: '+new Date(catalogDate).toLocaleDateString('pl-PL')+'. Bez premii umiejętności, kar za alkohol i kosztu transportu.':'';
  el('inventory-profile').textContent=viewer?'Schowki zapisane lokalnie w tej przeglądarce dla '+viewer+'. Pełny wklejony tekst nie jest zapisywany ani wysyłany.':'';
  el('inventory-money').hidden=book.money===null;el('inventory-money-value').textContent=money(book.money);
  el('inventory-sources').innerHTML=Object.entries(book.sources).map(([source,s])=>'<span>'+labels[source]+' · '+s.items.length+' wariantów · '+esc(new Date(s.at).toLocaleString('pl-PL'))+'</span>').join('');
  if(!catalog||!recipes)return;
  const mode=el('inventory-filter').value,list=rows().map(r=>window.MarketInventoryEngine.assess(r,items,catalog,recipes,el('inventory-include-safe').checked)).filter(r=>!mode||r.choice===mode);
  list.sort((a,b)=>(b.marketNet??-1)-(a.marketNet??-1)||a.row.name.localeCompare(b.row.name,'pl'));
  el('inventory-results').innerHTML=list.length?list.map(r=>`<article class="inventory-card"><div class="market-section-heading"><h3>${esc(r.row.name)}${r.row.level?' +'+r.row.level:''}</h3><span>${labels[r.row.source]} · ${r.row.quantity} szt.</span></div><b class="inventory-choice ${r.choice}">${choices[r.choice]}</b><p>${esc(r.reason)}</p><div class="market-trade-metrics"><div><small>Bazar · cena za sztukę</small><b>${money(r.price)}</b></div><div><small>Bazar po opłacie · całość</small><b>${money(r.marketNet)}</b></div><div><small>Opłata za cały pakiet</small><b>${money(r.fee)}</b></div><div><small>Paser · bazowo za całość</small><b>${money(r.paserTotal)}</b></div></div>${r.sets.length?'<p class="market-help">Kolekcje: '+r.sets.map(esc).join(', ')+'</p><button type="button" data-inventory-loot="'+esc(r.row.name)+'" data-inventory-quantity="'+r.row.quantity+'">Porównaj dokupienie kolekcji</button>':''}<p class="market-help">${r.price!==null?'Punktem odniesienia do wystawienia jest obecne minimum ofertowe dla tego ulepszenia. Porównanie zakłada sprzedaż całego pakietu po tej cenie i jedną bezzwrotną opłatę 5%.':'Brak aktualnej ceny bazaru dla tego wariantu.'} ${r.quote?.minListingPrice!=null?'Widełki wystawienia: '+money(r.quote.minListingPrice)+'–'+money(r.quote.maxListingPrice)+'.':'Sprawdź dozwoloną cenę wystawienia w grze.'}</p></article>`).join(''):'<p class="market-empty">Brak zaimportowanych przedmiotów pasujących do filtra.</p>';
  el('inventory-results').querySelectorAll('[data-inventory-loot]').forEach(b=>b.onclick=async()=>{window.MarketView.pane('loot');await window.MarketDesk.addLoot(b.dataset.inventoryLoot,Number(b.dataset.inventoryQuantity)||1);});
 }
 el('inventory-import').onsubmit=async e=>{
  e.preventDefault();if(!viewer)return;const owner=viewer;
  try{await load();if(viewer!==owner)return;const result=window.MarketInventoryEngine.parse(el('inventory-paste').value,catalog);
   for(const section of result.sections)book.sources[section.source]={items:section.items,at:Date.now()};if(result.money!==null)book.money=result.money;
   const saved=saveBook();applyOwned();render();el('inventory-message').textContent='Zaktualizowano: '+result.sections.map(s=>labels[s.source]).join(', ')+(saved?' · zapisano lokalnie.':' · bez zapisu lokalnego.');el('inventory-paste').value='';el('inventory-import-box').open=false;
  }catch(error){el('inventory-message').textContent=error.message;}
 };
 el('inventory-filter').onchange=render;el('inventory-include-safe').onchange=()=>{applyOwned();render();};
 el('inventory-use-money').onclick=()=>{window.MarketCollections.setBudget(book.money);window.MarketDesk.budgetChanged(book.money);el('inventory-message').textContent='Ustawiono budżet '+money(book.money)+' ze skopiowanego ekranu.';};
 el('inventory-clear').onclick=()=>{book={sources:{},money:null};if(viewer)saveBook();applyOwned();render();el('inventory-message').textContent='Usunięto lokalne odczyty schowków.';};
 window.MarketInventoryView={open:async()=>{try{await load();render();}catch(e){el('inventory-message').textContent=e.message;}},update:(list,data)=>{items=list;const next=data?.viewer?.nick??null;if(next!==viewer){viewer=next;loadBook();el('inventory-paste').value='';el('inventory-filter').value='';el('inventory-message').textContent='';el('inventory-include-safe').checked=false;applyOwned();}render();}};
})();
