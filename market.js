(() => {
 'use strict';
 const el=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const price=v=>v==null?'—':new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2}).format(v)+' zł';
 const date=v=>v?new Date(v).toLocaleString('pl-PL'):'brak odczytu';
 let request,items=[],query='',filter='',snapshot=null,lastLoadedAt=0,inFlight=null,order='name',direction=1,epoch=0,historyEpoch=0;
 function render(){
  // Keep intentional search state separate from browser/password-manager autofill.
  el('market-search').value=query;el('market-filter').value=filter;
  const search=query.trim().toLocaleLowerCase('pl');
  const list=items.filter(x=>(x.name+' +'+x.level).toLocaleLowerCase('pl').includes(search)&&(!filter||filter==='listed'&&x.price!==null||filter==='fall'&&x.change<0||filter==='rise'&&x.change>0||filter==='missing'&&x.price===null));
  list.sort((a,b)=>{if(order==='name'&&(a.price===null)!==(b.price===null))return a.price===null?1:-1;const x=a[order],y=b[order];if(x==null)return y==null?0:1;if(y==null)return -1;return direction*(typeof x==='string'?x.localeCompare(y,'pl'):x-y);});
  const available=items.filter(x=>x.price!==null),fall=available.filter(x=>x.change<0).length,rise=available.filter(x=>x.change>0).length,hasDay=Boolean(snapshot?.comparison24h?.available),stockChange=snapshot?.quantityChange,added=items.reduce((n,x)=>n+Math.max(0,x.quantityChange||0),0),removed=items.reduce((n,x)=>n+Math.max(0,-(x.quantityChange||0)),0);
  el('market-summary').innerHTML=`<article><small>Przedmioty na rynku</small><strong>${available.length.toLocaleString('pl-PL')}</strong><span>dostępnych wariantów</span></article><article><small>Dostępne sztuki</small><strong>${available.reduce((n,x)=>n+x.quantity,0).toLocaleString('pl-PL')}</strong><span title="Zmiana między ostatnimi migawkami">${stockChange==null?'łącznie na rynku':'przybyło '+added.toLocaleString('pl-PL')+' · ubyło '+removed.toLocaleString('pl-PL')}</span></article><article class="market-down"><small>Spadki cen · 24h</small><strong>${hasDay?'↓ '+fall:'—'}</strong><span>${hasDay?'względem odczytu sprzed doby':'brak odczytu sprzed 24h'}</span></article><article class="market-up"><small>Wzrosty cen · 24h</small><strong>${hasDay?'↑ '+rise:'—'}</strong><span>${hasDay?'względem odczytu sprzed doby':'brak odczytu sprzed 24h'}</span></article>`;
  el('market-active-filter').hidden=!search&&!filter;
  el('market-active-filter-label').textContent=[search?'Szukasz: „'+query+'”':'',filter?el('market-filter').selectedOptions[0].textContent:''].filter(Boolean).join(' · ');
  el('market-count').textContent=`${list.length.toLocaleString('pl-PL')} z ${items.length.toLocaleString('pl-PL')} wariantów · wybierz przedmiot, aby otworzyć historię`;
  el('market-rows').innerHTML=list.map(x=>`<tr class="${x.price===null?'market-unlisted':''}"><td><button type="button" class="market-item" data-item="${esc(x.key)}">${x.icon?`<img loading="lazy" alt="" src="${esc(x.icon)}">`:''}<span><strong>${esc(x.name)}${x.level?` <em>+${x.level}</em>`:''}</strong><small>${x.tier?'T'+esc(x.tier)+' · ':''}${x.price===null?'Aktualnie niedostępny':'Zobacz historię ceny'}</small></span></button></td><td class="market-price">${x.price===null?'<span class="market-muted">—</span>':price(x.price)}</td><td><span class="market-change ${x.change<0?'market-down':x.change>0?'market-up':''}">${x.change==null?'—':(x.change<0?'↓ ':x.change>0?'↑ +':'')+price(x.change)}</span>${x.change!=null&&x.previousPrice>0?'<small class="market-percent">'+(x.change>0?'+':'')+((x.price/x.previousPrice-1)*100).toFixed(1)+'%</small>':''}</td><td class="market-quantity"><b>${x.quantity.toLocaleString('pl-PL')}</b>${x.quantityChange!=null?'<small class="market-stock-change '+(x.quantityChange>0?'stock-added':x.quantityChange<0?'stock-removed':'')+'" title="Zmiana od poprzedniej migawki">'+(x.quantityChange>0?'+':'')+x.quantityChange.toLocaleString('pl-PL')+' szt.</small>':''}</td></tr>`).join('')||`<tr><td colspan="4" class="market-empty">${snapshot?'Brak przedmiotów pasujących do filtrów.':inFlight?'Pobieram dane rynku…':'Pierwsze dane pojawią się po synchronizacji rynku.'}</td></tr>`;
  el('market-rows').querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>openHistory(b.dataset.item));
  el('market-view').querySelectorAll('[data-market-sort]').forEach(b=>{b.textContent=b.dataset.label+(order===b.dataset.marketSort?(direction===1?' ↑':' ↓'):' ↕');});
  window.MarketCollections?.update(items,snapshot);
 }
 function refresh(){
  if(inFlight)return inFlight;
  const current=++epoch;el('market-status').textContent='Pobieram rynek…';
  el('market-refresh').disabled=true;
  const work=(async()=>{
   await Promise.resolve();
   try{const data=await request('/market/state');if(current!==epoch)return;if(!Array.isArray(data.items))throw Error('Niekompletny odczyt rynku.');snapshot=data;items=data.items.map(x=>({...x,change:x.change24h??null,previousPrice:x.price24h??null}));lastLoadedAt=Date.now();el('market-status').textContent=`Odczyt rynku: ${date(data.lastSeenAt)} · ostatnia zmiana: ${date(data.capturedAt)}`;render();}
   catch(error){if(current!==epoch)return;if(error.status===401||error.status===403){items=[];snapshot=null;lastLoadedAt=0;}render();el('market-status').textContent=error.message+(snapshot?' · wyświetlam ostatni poprawny odczyt z '+date(snapshot.lastSeenAt):'');}
   finally{if(current===epoch){inFlight=null;el('market-refresh').disabled=false;if(!snapshot)render();}}
  })();inFlight=work;return work;
 }
 async function openHistory(key){
  const modal=el('market-dialog');modal.dataset.key=key;el('market-history-title').textContent=items.find(x=>x.key===key)?.name||'Historia przedmiotu';
  if(!modal.open)modal.showModal();const generation=++historyEpoch;
  el('market-chart').textContent='Pobieram historię…';
  try{
   const data=await request(`/market/state?item=${encodeURIComponent(key)}&days=${el('market-days').value}`);if(generation!==historyEpoch||!modal.open)return;
   const points=data.points,chart=window.MarketChart.series(points,Number(el('market-days').value));
   if(!points.length){el('market-chart').textContent='Brak zapisów w tym okresie.';return;}
   el('market-chart').innerHTML=`<p>Minimum: <b>${price(chart.minimum)}</b> · maksimum: <b>${price(chart.maximum)}</b> · ${points.length} zapisów${data.truncated?' · wynik ograniczony':''}</p><div class="market-chart-legend"><span>Cena · lewa skala</span><span>Liczba sztuk · prawa skala</span></div>${chart.svg}<p class="market-help">Zmiana sztuk jest porównaniem kolejnych odczytów, nie potwierdzeniem sprzedaży.</p><div class="market-history-scroll"><table><thead><tr><th>Odczyt</th><th>Cena minimalna</th><th>Sztuk</th><th>Zmiana sztuk</th></tr></thead><tbody>${points.map((p,i)=>({p,i})).reverse().slice(0,100).map(({p,i})=>`<tr><td>${date(p.at)}${p.seenAt>p.at?'<small> · bez zmian do '+date(p.seenAt)+'</small>':''}</td><td>${p.item?price(p.item.price):'Brak ofert'}</td><td>${p.item?.quantity??0}</td><td>${chart.deltas[i]==null?'—':(chart.deltas[i]>0?'+':'')+chart.deltas[i]+' szt.'}</td></tr>`).join('')}</tbody></table></div>`;
  }catch(e){if(generation===historyEpoch)el('market-chart').textContent=e.message;}
 }
 el('market-search-form').onsubmit=e=>e.preventDefault();
 el('market-search').oninput=e=>{if(!e.isTrusted){e.target.value=query;return;}try{if(e.target.matches(':-webkit-autofill')){e.target.value=query;return;}}catch{}query=e.target.value;render();};
 el('market-search').addEventListener('animationstart',e=>{if(e.animationName==='market-autofill-detected')e.target.value=query;});
 el('market-filter').onchange=e=>{filter=e.target.value;render();};el('market-refresh').onclick=()=>refresh();
 el('market-clear-search').onclick=()=>{query='';filter='';render();el('market-search').focus();};
 el('market-view').querySelectorAll('[data-market-sort]').forEach(b=>b.onclick=()=>{direction=order===b.dataset.marketSort?-direction:b.dataset.marketSort==='name'?1:-1;order=b.dataset.marketSort;render();});
 el('market-close').onclick=()=>{historyEpoch++;el('market-dialog').close();};
 el('market-dialog').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();if(e.target===e.currentTarget&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)){historyEpoch++;e.currentTarget.close();}});
 el('market-days').onchange=()=>openHistory(el('market-dialog').dataset.key);
 document.querySelectorAll('[data-market-pane]').forEach(button=>button.onclick=async()=>{
  const collections=button.dataset.marketPane==='collections';el('market-quotes-pane').hidden=collections;el('market-collections-pane').hidden=!collections;
  document.querySelectorAll('[data-market-pane]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
  if(collections)await window.MarketCollections.open();
 });
 window.MarketView={refresh,history:openHistory,open:async api=>{request=api;render();if(!snapshot||Date.now()-lastLoadedAt>=60000)await refresh();},clear:()=>{const visible=!el('market-view').hidden;epoch++;historyEpoch++;inFlight=null;items=[];snapshot=null;lastLoadedAt=0;window.MarketCollections?.reset();el('market-dialog').close();el('market-refresh').disabled=false;render();el('market-status').textContent='';if(visible&&request)queueMicrotask(()=>refresh());}};
 setInterval(()=>{if(request&&!el('market-view').hidden)void refresh();},300000);
})();
