(() => {
 'use strict';
 const el=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>v==null?'—':new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2}).format(v)+' zł';
 const labels={backpack:'Plecak',stash:'Rupieciarnia',safe:'Sejf'},choices={market:'Bazar daje więcej',paser:'Porównaj z paserem',keep:'Do zachowania',collection:'Składnik kolekcji',check:'Sprawdź ręcznie'};
 let viewer=null,book={sources:{},money:null,reserves:{}},items=[],catalog=null,recipes=null,loading=null,catalogDate=null,page=1,sourceFilter='',selectedKey=null;
 const PAGE_SIZE=24;
 const rowKey=r=>JSON.stringify([r.source,r.id??r.name,r.level]);
 const storageKey=()=>viewer?'mwt-inventory-v1:'+encodeURIComponent(viewer.toLocaleLowerCase('pl')):null;
 function loadBook(){
  book={sources:{},money:null,reserves:{}};if(!viewer)return;
  try{const raw=JSON.parse(localStorage.getItem(storageKey())||'null');if(!raw)return;
   for(const source of Object.keys(labels)){const s=raw.sources?.[source];if(!s)continue;if(!Array.isArray(s.items)||s.items.length>1000)throw Error();
    if(!s.items.every(x=>typeof x.name==='string'&&x.name.length<=150&&Number.isSafeInteger(x.level)&&x.level>=0&&x.level<=100&&Number.isSafeInteger(x.quantity)&&x.quantity>0&&x.quantity<=1e9&&(x.id===null||Number.isSafeInteger(x.id))))throw Error();
    book.sources[source]={items:s.items,at:Number(s.at)||0};
   }
   if(raw.reserves&&typeof raw.reserves==='object')for(const [key,value] of Object.entries(raw.reserves))if(key.length<220&&Number.isSafeInteger(value)&&value>=0&&value<=1e9)book.reserves[key]=value;
   book.money=typeof raw.money==='number'&&Number.isFinite(raw.money)&&raw.money>=0?raw.money:null;
  }catch{book={sources:{},money:null,reserves:{}};}
 }
 function saveBook(){try{localStorage.setItem(storageKey(),JSON.stringify(book));return true;}catch{el('inventory-message').textContent='Analiza działa, ale przeglądarka nie pozwala zapisać schowków lokalnie.';return false;}}
 function rows(){return Object.entries(book.sources).flatMap(([source,s])=>s.items.map(x=>({...x,source})));}
 function availableRows(){return MarketEconomy.reserveRows(rows(),book.reserves,el('inventory-include-safe').checked);}
 function availableOwned(){const owned={};for(const r of availableRows())if(r.level===0&&r.sellQuantity){const key=r.name.normalize('NFKC').trim().toLocaleLowerCase('pl');owned[key]=(owned[key]||0)+r.sellQuantity;}return owned;}
 function applyOwned(){window.MarketCollections.setOwned(availableOwned());window.MarketFinance?.inventoryChanged();}
 function assessRow(row){const r=window.MarketInventoryEngine.assess({...row,quantity:row.sellQuantity},items,catalog,recipes,el('inventory-include-safe').checked);r.row=row;if(!row.sellQuantity){r.choice='keep';r.reason=row.source==='safe'&&!el('inventory-include-safe').checked?'Sejf pozostaje chroniony.':'Całość mieści się w ustawionej rezerwie — brak nadwyżki do sprzedaży.';}return r;}
 async function load(){if(catalog&&recipes)return;if(loading)return loading;loading=(async()=>{try{const [response,list]=await Promise.all([fetch('market-item-data.json?v=24.44'),window.MarketCollections.getRecipes()]);if(!response.ok)throw Error('Nie udało się pobrać cen pasera.');const data=await response.json();if(!Array.isArray(data.items))throw Error('Nieprawidłowy katalog przedmiotów.');catalog=data.items;catalogDate=data.checkedAt;recipes=list;}finally{loading=null;}})();return loading;}
 function render(){
  el('inventory-import-controls').hidden=!viewer;el('inventory-login-note').hidden=Boolean(viewer);
  el('inventory-catalog-date').textContent=catalogDate?'Bazowe ceny pasera z wiki: '+new Date(catalogDate).toLocaleDateString('pl-PL')+'. Bez premii umiejętności, kar za alkohol i kosztu transportu.':'';
  el('inventory-profile').textContent=viewer?'Schowki zapisane lokalnie w tej przeglądarce dla '+viewer+'. Pełny wklejony tekst nie jest zapisywany ani wysyłany.':'';
  el('inventory-money').hidden=book.money===null;el('inventory-money-value').textContent=money(book.money);
  el('inventory-sources').innerHTML=(Object.keys(book.sources).length?'<button type="button" data-inventory-source="" class="'+(!sourceFilter?'active':'')+'">Wszystkie schowki</button>':'')+Object.entries(book.sources).map(([source,s])=>'<button type="button" data-inventory-source="'+source+'" class="'+(sourceFilter===source?'active':'')+'" title="Odczyt '+esc(new Date(s.at).toLocaleString('pl-PL'))+'">'+labels[source]+' · '+s.items.length+'</button>').join('');
  el('inventory-sources').querySelectorAll('[data-inventory-source]').forEach(b=>b.onclick=()=>{sourceFilter=b.dataset.inventorySource;page=1;render();});
  if(!catalog||!recipes)return;
  const mode=el('inventory-filter').value,list=availableRows().map(assessRow).filter(r=>(!mode||r.choice===mode)&&(!sourceFilter||r.row.source===sourceFilter));
  list.sort((a,b)=>(b.marketNet??-1)-(a.marketNet??-1)||a.row.name.localeCompare(b.row.name,'pl'));
  const pages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));page=Math.min(page,pages);
  const controls='<div class="inventory-pagination"><span>'+list.length+' wariantów'+(list.length?' · '+((page-1)*PAGE_SIZE+1)+'–'+Math.min(page*PAGE_SIZE,list.length):'')+'</span><nav aria-label="Strony ekwipunku"><button type="button" data-inventory-page="prev" '+(page===1?'disabled':'')+' aria-label="Poprzednia strona">‹</button><span>'+page+' / '+pages+'</span><button type="button" data-inventory-page="next" '+(page===pages?'disabled':'')+' aria-label="Następna strona">›</button></nav></div>';
  el('inventory-results').innerHTML=controls+(list.length?'<div class="inventory-grid">'+list.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE).map(r=>{
   const candidate=r.meta?.icon||r.quote?.icon||r.row.icon||'',icon=/^https:\/\/(?:images\.menelgame\.online|menelwars\.pl)\//.test(candidate)?candidate:'';
   return '<button type="button" class="inventory-tile '+r.choice+'" data-inventory-item="'+esc(rowKey(r.row))+'" aria-label="'+esc(r.row.name)+(r.row.level?' +'+r.row.level:'')+' · '+r.row.quantity+' szt. · '+labels[r.row.source]+' · '+choices[r.choice]+'" title="'+esc(r.row.name)+' — '+choices[r.choice]+'"><span class="inventory-tile-quantity">'+r.row.quantity+'</span>'+(r.row.level?'<span class="inventory-tile-level">+'+r.row.level+'</span>':'')+'<span class="inventory-tile-icon">'+(icon?'<img src="'+esc(icon)+'" alt="" loading="lazy">':'<span aria-hidden="true">📦</span>')+'</span><span class="inventory-tile-name">'+esc(r.row.name)+'</span><small>'+(r.row.source==='safe'?'🔒 ':'')+labels[r.row.source]+(r.row.reserved?' · 🔒'+r.row.reserved:'')+'</small></button>';
  }).join('')+'</div>':'<p class="market-empty">Brak zaimportowanych przedmiotów pasujących do filtra.</p>');
  el('inventory-results').querySelectorAll('[data-inventory-page]').forEach(b=>b.onclick=()=>{page+=b.dataset.inventoryPage==='next'?1:-1;render();});
  el('inventory-results').querySelectorAll('[data-inventory-item]').forEach(b=>b.onclick=()=>{selectedKey=b.dataset.inventoryItem;renderDialog();el('inventory-detail-dialog').showModal();});
  if(el('inventory-detail-dialog').open)renderDialog();

 }
 function renderDialog(){
  const row=availableRows().find(r=>rowKey(r)===selectedKey),dialog=el('inventory-detail-dialog');
  if(!row){if(dialog.open)dialog.close();selectedKey=null;return;}
  const r=assessRow(row);
  el('inventory-detail-title').textContent=row.name+(row.level?' +'+row.level:'');
  el('inventory-detail-content').innerHTML='<p class="market-help">'+labels[row.source]+' · '+row.quantity+' szt. · do zachowania '+row.reserved+' · nadwyżka '+row.sellQuantity+' szt.</p><b class="inventory-choice '+r.choice+'">'+choices[r.choice]+'</b><p>'+esc(r.reason)+'</p><div class="market-trade-metrics"><div><small>Bazar · cena za sztukę</small><b>'+money(r.price)+'</b></div><div><small>Bazar po opłacie · nadwyżka</small><b>'+money(r.marketNet)+'</b></div><div><small>Opłata za cały pakiet</small><b>'+money(r.fee)+'</b></div><div><small>Paser · bazowo za nadwyżkę</small><b>'+money(r.paserTotal)+'</b></div></div>'+(r.sets.length?'<p class="market-help">Kolekcje: '+r.sets.map(esc).join(', ')+'</p><button type="button" id="inventory-detail-loot">Porównaj dokupienie kolekcji</button>':'')+'<p class="market-help">'+(r.price!==null?'Punktem odniesienia do wystawienia jest obecne minimum ofertowe dla tego ulepszenia. Porównanie zakłada sprzedaż całego pakietu po tej cenie i jedną bezzwrotną opłatę 5%.':'Brak aktualnej ceny bazaru dla tego wariantu.')+' '+(r.quote?.minListingPrice!=null?'Widełki wystawienia: '+money(r.quote.minListingPrice)+'–'+money(r.quote.maxListingPrice)+'.':'Sprawdź dozwoloną cenę wystawienia w grze.')+'</p>';
  el('inventory-detail-content').insertAdjacentHTML('beforeend','<form id="inventory-reserve-form" class="finance-form"><label>Zachowaj co najmniej · szt.<input id="inventory-reserve-count" type="number" min="0" max="1000000000" step="1" value="'+(book.reserves[MarketEconomy.reserveKey(row)]||0)+'" required></label><button type="submit">Zapisz rezerwę</button></form><p class="market-help">Rezerwa obejmuje ten wariant we wszystkich schowkach i jest wyłączona ze sprzedaży oraz planu kolekcji. Sejf domyślnie pozostaje chroniony. Wyceniany pakiet to tylko nadwyżka.</p><button type="button" id="inventory-offer-calc" '+(!row.sellQuantity?'disabled':'')+'>Kalkulator wystawienia nadwyżki</button>');
  el('inventory-reserve-form').onsubmit=e=>{e.preventDefault();const n=Number(el('inventory-reserve-count').value);if(!Number.isSafeInteger(n)||n<0)return;const key=MarketEconomy.reserveKey(row);if(n)book.reserves[key]=n;else delete book.reserves[key];saveBook();applyOwned();render();};
  el('inventory-offer-calc').onclick=()=>{dialog.close();window.MarketFinance.calculator({quantity:row.sellQuantity,salePrice:r.price});};
  if(el('inventory-detail-loot'))el('inventory-detail-loot').onclick=async()=>{dialog.close();window.MarketView.pane('loot');await window.MarketDesk.addLoot(row.name,row.quantity);};
 }
 el('inventory-detail-close').onclick=()=>el('inventory-detail-dialog').close();
 el('inventory-detail-dialog').addEventListener('click',e=>{const box=e.currentTarget.getBoundingClientRect();if(e.target===e.currentTarget&&(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom))e.currentTarget.close();});
 el('inventory-import').onsubmit=async e=>{
  e.preventDefault();if(!viewer)return;const owner=viewer;
  try{await load();if(viewer!==owner)return;const result=window.MarketInventoryEngine.parse(el('inventory-paste').value,catalog);
   for(const section of result.sections)book.sources[section.source]={items:section.items,at:Date.now()};if(result.money!==null)book.money=result.money;
   const saved=saveBook();page=1;applyOwned();render();el('inventory-message').textContent='Zaktualizowano: '+result.sections.map(s=>labels[s.source]).join(', ')+(saved?' · zapisano lokalnie.':' · bez zapisu lokalnego.');el('inventory-paste').value='';el('inventory-import-box').open=false;
  }catch(error){el('inventory-message').textContent=error.message;}
 };
 el('inventory-filter').onchange=()=>{page=1;render();};el('inventory-include-safe').onchange=()=>{applyOwned();render();};
 el('inventory-use-money').onclick=()=>{window.MarketCollections.setBudget(book.money);window.MarketDesk.budgetChanged(book.money);el('inventory-message').textContent='Ustawiono budżet '+money(book.money)+' ze skopiowanego ekranu.';};
 el('inventory-clear').onclick=()=>{book={sources:{},money:null,reserves:book.reserves};if(viewer)saveBook();applyOwned();render();el('inventory-message').textContent='Usunięto lokalne odczyty schowków.';};
 window.MarketInventoryView={getAvailableOwned:availableOwned,open:async()=>{try{await load();render();}catch(e){el('inventory-message').textContent=e.message;}},update:(list,data)=>{items=list;const next=data?.viewer?.nick??null;if(next!==viewer){viewer=next;page=1;sourceFilter='';selectedKey=null;el('inventory-detail-dialog').close();loadBook();el('inventory-paste').value='';el('inventory-filter').value='';el('inventory-message').textContent='';el('inventory-include-safe').checked=false;applyOwned();}render();}};
})();
