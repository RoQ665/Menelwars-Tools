(() => {
 'use strict';
 const el=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>v==null?'—':new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2}).format(v)+' zł';
 const localTime=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
 const date=v=>new Date(v).toLocaleString('pl-PL'),number=id=>Number(el(id).value),optional=id=>el(id).value===''?null:Number(el(id).value);
 const norm=v=>String(v).normalize('NFKC').trim().toLocaleLowerCase('pl');
 let api,viewer=null,items=[],snapshot=null,subpane='offers',records=[],journalPage=1,journalPages=1,journalLoaded=0,readEpoch=0,writeBusy=false,deleted=null,worker=null,job=0,createId=null;
 const eventIds=new Map();
 const eventDrafts=new Map();
 function calculateOffer(){
  try{const r=MarketEconomy.offer({quantity:number('offer-quantity'),buyPrice:number('offer-buy'),salePrice:number('offer-sale'),initialPrice:optional('offer-initial'),repeats:number('offer-repeats'),relistPrice:optional('offer-relist'),previousCosts:number('offer-costs')});
   el('offer-message').textContent='Symulacja, nie zapis rzeczywistej transakcji.';
   el('offer-results').innerHTML='<div class="market-summary finance-metrics"><article><small>Wynik po wszystkich opłatach</small><strong class="'+(r.profit>=0?'market-down':'market-up')+'">'+money(r.profit)+'</strong></article><article><small>Wszystkie opłaty i inne koszty</small><strong>'+money(r.totalFees)+'</strong><span>Pierwsze wystawienie '+money(r.initialFee)+' · ponowne '+money(r.repeatFees)+'</span></article><article><small>Zakup i wszystkie opłaty</small><strong>'+money(r.capital)+'</strong></article><article><small>Cena za sztukę bez straty</small><strong>'+money(r.breakEven)+'</strong><span>'+(r.breakEven===null?'Przy tych kosztach brak ceny wyjścia bez straty.':'Według założonych cen wystawienia.')+'</span></article></div><p class="market-help">Zakup: '+money(r.buyCost)+' · wpływ ze sprzedaży: '+money(r.revenue)+'. Wynik zakłada sprzedaż wszystkich '+r.quantity+' sztuk. Ponowne wystawienia oznaczają dodatkowe, bezzwrotne opłaty.</p>';
  }catch(error){el('offer-message').textContent=error.message;el('offer-results').innerHTML='';}
 }
 el('offer-form').onsubmit=e=>{e.preventDefault();calculateOffer();};
 function showSubpane(name){
  subpane=name;for(const key of ['offers','calculator','journal'])el('market-trade-'+key).hidden=key!==name;
  document.querySelectorAll('[data-finance-pane]').forEach(b=>{const active=b.dataset.financePane===name;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  if(name==='journal')void loadJournal();
 }
 document.querySelectorAll('[data-finance-pane]').forEach(b=>b.onclick=()=>showSubpane(b.dataset.financePane));
 async function loadJournal(force=false){
  el('journal-login').hidden=Boolean(viewer);el('journal-controls').hidden=!viewer;
  if(!viewer){records=[];renderJournal();return;}
  if(!force&&Date.now()-journalLoaded<300000)return;
  const owner=viewer,epoch=++readEpoch;el('journal-message').textContent='Pobieram dziennik…';
  try{const data=await api('/market/journal?page='+journalPage);if(owner!==viewer||epoch!==readEpoch)return;records=data.positions;journalPage=data.page;journalPages=data.pages;journalLoaded=Date.now();renderJournal(data.summary);el('journal-message').textContent=data.count+' pozycji · zapisane na koncie '+viewer+'.';}
  catch(error){if(owner===viewer&&epoch===readEpoch)el('journal-message').textContent=error.message;}
 }
 function renderJournal(summary){
  if(summary)el('journal-summary').innerHTML=[['Wynik sprzedaży i opłat',summary.result],['Przepływ gotówki',summary.cashFlow],['Koszt pozostałego zapasu',summary.stockCost],['Poniesione opłaty',summary.fees]].map(([label,value])=>'<article><small>'+label+'</small><strong>'+money(value)+'</strong></article>').join('');
  if(!viewer){el('journal-summary').innerHTML='';el('journal-list').innerHTML='';el('journal-pagination').innerHTML='';return;}
  const open=new Set([...el('journal-list').querySelectorAll('details[open]')].map(x=>x.dataset.position));
  el('journal-list').innerHTML=records.length?records.map(p=>{
   const s=p.summary;
   return `<details class="journal-position" data-position="${esc(p.id)}" ${open.has(p.id)?'open':''}><summary><span><b>${esc(p.name)}</b><small>${s.sold} / ${p.quantity} sprzedanych · ${s.closed?'zamknięta':'pozostało '+s.remaining+' szt.'}</small></span><strong class="${s.result>=0?'market-down':'market-up'}">${money(s.result)}</strong><span>⌄</span></summary><div class="journal-body"><p>Zakup: ${date(p.boughtAt)} · ${money(p.buyPrice)} / szt. · łącznie ${money(s.buyCost)}</p><p class="market-help">Wpływy ${money(s.revenue)} · opłaty ${money(s.fees)} · koszt zapasu ${money(s.stockCost)} · przepływ gotówki ${money(s.cashFlow)}.</p><ol class="journal-events">${p.events.map(e=>`<li><span>${date(e.at)} · ${e.kind==='listing'?'Wystawienie '+e.quantity+' szt. po '+money(e.price)+' · opłata '+money(e.fee??Math.floor(e.quantity*e.price*.05)):e.kind==='sale'?'Sprzedaż '+e.quantity+' szt. po '+money(e.price)+' · '+(e.channel==='paser'?'paser':'bazar'):'Inny koszt '+money(e.amount)}</span><button type="button" data-remove-event="${esc(e.id)}" data-journal-id="${esc(p.id)}">Usuń zdarzenie</button></li>`).join('')||'<li>Brak wystawień i sprzedaży.</li>'}</ol><form class="journal-event-form finance-form" data-event-position="${esc(p.id)}"><label>Zdarzenie<select name="kind"><option value="listing">Wystawienie / ponowne wystawienie</option><option value="sale">Rzeczywista sprzedaż</option><option value="cost">Inny poniesiony koszt</option></select></label><label>Data<input name="at" type="datetime-local" value="${localTime()}" required></label><label data-event-field="quantity">Liczba sztuk<input name="quantity" type="number" min="1" max="${p.quantity}" step="1" value="${Math.max(1,s.remaining)}"></label><label data-event-field="price">Cena · zł / szt.<input name="price" type="number" min="0" step="0.01"></label><label data-event-field="channel" hidden>Miejsce sprzedaży<select name="channel"><option value="market">Bazar</option><option value="paser">Paser</option></select></label><label data-event-field="fee">Rzeczywista opłata · zł<input name="fee" type="number" min="0" step="0.01" placeholder="Automatycznie 5%"></label><label data-event-field="amount" hidden>Kwota kosztu · zł<input name="amount" type="number" min="0" step="0.01"></label><button type="submit">Zapisz zdarzenie</button></form><p class="market-help">Opłatę za bazar zapisujesz przy wystawieniu, także gdy nic się nie sprzedało. Sprzedaż jej ponownie nie nalicza. Błędny wpis możesz usunąć i wprowadzić poprawnie.</p><button type="button" data-delete-position="${esc(p.id)}">Usuń pozycję z dziennika</button></div></details>`;
  }).join(''):'<p class="market-empty">Dziennik jest pusty. Zacznij od zapisania rzeczywistego zakupu.</p>';
  el('journal-pagination').innerHTML='<span>Strona '+journalPage+' / '+journalPages+'</span><nav><button type="button" data-journal-page="-1" '+(journalPage===1?'disabled':'')+'>‹</button><button type="button" data-journal-page="1" '+(journalPage===journalPages?'disabled':'')+'>›</button></nav>';
  el('journal-pagination').querySelectorAll('[data-journal-page]').forEach(b=>b.onclick=()=>{journalPage+=Number(b.dataset.journalPage);void loadJournal(true);});
  el('journal-list').querySelectorAll('[data-delete-position]').forEach(b=>b.onclick=()=>{const p=records.find(p=>p.id===b.dataset.deletePosition);void mutate({action:'delete',id:p.id,revision:p.revision},p.id);});
  el('journal-list').querySelectorAll('[data-remove-event]').forEach(b=>b.onclick=()=>{const p=records.find(p=>p.id===b.dataset.journalId);void mutate({action:'removeEvent',id:p.id,eventId:b.dataset.removeEvent,revision:p.revision},p.id);});
  el('journal-list').querySelectorAll('[data-event-position]').forEach(form=>{
   const id=form.dataset.eventPosition,draft=eventDrafts.get(id);if(draft)for(const [key,value] of Object.entries(draft))if(form.elements[key])form.elements[key].value=value;
   function fields(){const kind=form.elements.kind.value;for(const f of ['quantity','price','channel','fee','amount']){const shown=f==='quantity'||f==='price'?kind!=='cost':f==='amount'?kind==='cost':f==='channel'?kind==='sale':kind==='listing';form.querySelector('[data-event-field="'+f+'"]').hidden=!shown;form.elements[f].required=shown&&!['fee','channel'].includes(f);}form.elements.price.step=kind==='listing'?'1':'0.01';form.elements.price.min=kind==='listing'?'1':'0';}
   form.oninput=form.onchange=()=>{eventDrafts.set(id,Object.fromEntries(new FormData(form)));eventIds.delete(id);fields();};fields();
   form.onsubmit=e=>{e.preventDefault();const p=records.find(p=>p.id===id),v=Object.fromEntries(new FormData(form)),event={id:eventIds.get(id)||crypto.randomUUID(),kind:v.kind,at:new Date(v.at).toISOString()};eventIds.set(id,event.id);if(v.kind==='cost')event.amount=Number(v.amount);else{event.quantity=Number(v.quantity);event.price=Number(v.price);if(v.kind==='sale')event.channel=v.channel;else event.fee=v.fee===''?null:Number(v.fee);}void mutate({action:'addEvent',id,revision:p.revision,event},id);};
  });
  setWriteBusy(writeBusy);
 }
 function setWriteBusy(value){el('journal-create').querySelector('button').disabled=value;el('journal-list').querySelectorAll('button').forEach(b=>b.disabled=value);el('journal-undo').disabled=value;}
 async function mutate(body,positionId=null){
  if(writeBusy||!viewer)return;const owner=viewer;writeBusy=true;++readEpoch;setWriteBusy(true);
  try{const data=await api('/market/journal',{method:'POST',body:{...body,owner}});if(owner!==viewer)return;
   if(body.action==='delete'){deleted=data.position;el('journal-undo').hidden=false;}else if(body.action==='restore'){deleted=null;el('journal-undo').hidden=true;}
   if(positionId){eventDrafts.delete(positionId);eventIds.delete(positionId);}
   if(body.action==='create'){createId=null;el('journal-create').reset();el('journal-bought').value=localTime();el('journal-create-box').open=false;journalPage=1;}
   await loadJournal(true);
  }catch(error){if(owner===viewer)el('journal-message').textContent=error.message;}
  finally{if(owner===viewer){writeBusy=false;setWriteBusy(false);}}
 }
 el('journal-create').onsubmit=e=>{e.preventDefault();const name=el('journal-name').value.trim(),item=items.find(x=>norm(x.name+(x.level?' +'+x.level:''))===norm(name));void mutate({action:'create',position:{id:createId||(createId=crypto.randomUUID()),itemKey:item?.key??null,name,quantity:number('journal-quantity'),buyPrice:number('journal-buy'),boughtAt:new Date(el('journal-bought').value).toISOString()}});};
 el('journal-create').oninput=()=>{createId=null;};
 el('journal-bought').value=localTime();el('journal-refresh').onclick=()=>void loadJournal(true);el('journal-undo').onclick=()=>{if(deleted)void mutate({action:'restore',id:deleted.id,revision:deleted.revision});};
 function cancelPlan(message='Obliczenia przerwane.'){job++;if(worker)worker.terminate();worker=null;el('plan-start').disabled=false;el('plan-cancel').hidden=true;if(message)el('plan-message').textContent=message;}
 el('collection-plan-box').ontoggle=()=>{if(el('collection-plan-box').open&&el('plan-budget').value==='')el('plan-budget').value=MarketCollections.getBudget()??'';};
 el('plan-cancel').onclick=()=>cancelPlan();
 el('collection-plan-form').oninput=()=>{if(worker)cancelPlan('Założenia zmienione. Policz plan ponownie.');};
 el('collection-plan-form').onsubmit=async e=>{
  e.preventDefault();cancelPlan('');const owner=viewer,token=job,stamp=snapshot?.capturedAt;el('plan-message').textContent='Szukam korzystnego zestawu kolekcji…';el('plan-results').innerHTML='';el('plan-start').disabled=true;el('plan-cancel').hidden=false;
  try{const recipes=await MarketCollections.getRecipes();if(token!==job||owner!==viewer)return;
   const budget=number('plan-budget'),maxRuns=number('plan-limit'),owned=el('plan-owned').checked?(window.MarketInventoryView?.getAvailableOwned()||{}):{};
   MarketCollections.setBudget(budget);MarketDesk.budgetChanged(budget);
   worker=new Worker('market-plan-worker.js?v=24.47');
   worker.onmessage=event=>{if(token!==job||owner!==viewer)return;worker.terminate();worker=null;el('plan-start').disabled=false;el('plan-cancel').hidden=true;
    if(stamp!==snapshot?.capturedAt){el('plan-message').textContent='Ceny zmieniły się podczas obliczeń. Policz ponownie.';return;}
    if(!event.data.ok){el('plan-message').textContent=event.data.error;return;}
    const p=event.data.result;el('plan-message').textContent=p.optimal?'Najwięcej monet w tym planie: uwzględniamy najwyżej jedną kupowaną sztukę każdego składnika po widocznym minimum.':'Najlepszy znaleziony plan w limicie obliczeń — maksimum nie zostało potwierdzone.';
    el('plan-results').innerHTML='<div class="market-summary"><article><small>Złote monety</small><strong>'+p.coins+'</strong></article><article><small>Dokupienie · według odczytu</small><strong>'+money(p.cost)+'</strong></article><article><small>Pozostały budżet</small><strong>'+money(p.left)+'</strong></article><article><small>Cena za złotą monetę</small><strong>'+money(p.coins?p.cost/p.coins:null)+'</strong></article></div>'+(p.runs.length?'<ul class="finance-plan-runs">'+p.runs.map(r=>'<li><b>'+r.count+'× '+esc(r.name)+'</b><span>'+r.coins+' monet</span></li>').join('')+'<details class="finance-box"><summary>Lista składników i zakupów</summary><div class="finance-table-scroll"><table><thead><tr><th>Składnik</th><th>Potrzeba</th><th>Z zapasu</th><th>Dokup</th><th>Koszt</th></tr></thead><tbody>'+p.shopping.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+x.quantity+'</td><td>'+x.held+'</td><td>'+x.buy+'</td><td>'+money(x.cost)+'</td></tr>').join('')+'</tbody></table></div></details>':'<p class="market-help">Żaden komplet nie mieści się w budżecie i dostępnych zapasach.</p>');
   };
   worker.onerror=()=>cancelPlan('Nie udało się obliczyć planu. Spróbuj ponownie.');worker.postMessage({recipes,items,owned,budget,maxRuns});
  }catch(error){cancelPlan(error.message);}
 };
 window.MarketFinance={inventoryChanged:()=>{if(worker||el('plan-results').innerHTML){cancelPlan('Zmieniono zapas lub rezerwy. Policz ponownie.');el('plan-results').innerHTML='';}},configure:fn=>api=fn,tradeOpened:()=>showSubpane(subpane),
  calculator:preset=>{MarketView.pane('trade');showSubpane('calculator');for(const [id,key] of [['offer-quantity','quantity'],['offer-buy','buyPrice'],['offer-sale','salePrice']])el(id).value=preset[key]??'';el('offer-initial').value='';el('offer-relist').value='';el('offer-repeats').value='0';el('offer-costs').value='0';el('offer-message').textContent='';el('offer-results').innerHTML='';if(preset.buyPrice!=null&&preset.salePrice!=null)calculateOffer();},
  update:(list,data)=>{if(snapshot?.capturedAt&&snapshot.capturedAt!==data?.capturedAt&&(worker||el('plan-results').innerHTML)){cancelPlan('Zmieniły się ceny. Policz plan ponownie.');el('plan-results').innerHTML='';}items=list;snapshot=data;const next=data?.viewer?.nick??null;if(next!==viewer){viewer=next;readEpoch++;records=[];journalPage=1;journalLoaded=0;writeBusy=false;deleted=null;createId=null;eventDrafts.clear();eventIds.clear();el('journal-create').reset();el('offer-form').reset();el('offer-results').innerHTML='';el('offer-message').textContent='';el('plan-budget').value='';el('journal-summary').innerHTML='';el('journal-bought').value=localTime();el('journal-undo').hidden=true;el('journal-message').textContent='';cancelPlan('');el('plan-results').innerHTML='';el('plan-message').textContent='';renderJournal();if(viewer&&subpane==='journal'&&!el('market-trade-pane').hidden)void loadJournal();}el('journal-login').hidden=Boolean(viewer);el('journal-controls').hidden=!viewer;el('finance-item-options').innerHTML=items.map(x=>'<option value="'+esc(x.name+(x.level?' +'+x.level:''))+'"></option>').join('');}
 };
})();
