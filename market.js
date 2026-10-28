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
  const available=items.filter(x=>x.price!==null),fall=available.filter(x=>x.change<0).length,rise=available.filter(x=>x.change>0).length;
  el('market-summary').innerHTML=`<article><small>Przedmioty na rynku</small><strong>${available.length.toLocaleString('pl-PL')}</strong><span>dostępnych wariantów</span></article><article><small>Dostępne sztuki</small><strong>${available.reduce((n,x)=>n+x.quantity,0).toLocaleString('pl-PL')}</strong><span>łącznie na rynku</span></article><article class="market-down"><small>Spadki cen</small><strong>↓ ${fall}</strong><span>względem poprzedniej migawki</span></article><article class="market-up"><small>Wzrosty cen</small><strong>↑ ${rise}</strong><span>względem poprzedniej migawki</span></article>`;
  el('market-active-filter').hidden=!search&&!filter;
  el('market-active-filter-label').textContent=[search?'Szukasz: „'+query+'”':'',filter?el('market-filter').selectedOptions[0].textContent:''].filter(Boolean).join(' · ');
  el('market-count').textContent=`${list.length.toLocaleString('pl-PL')} z ${items.length.toLocaleString('pl-PL')} wariantów · wybierz przedmiot, aby otworzyć historię`;
  el('market-rows').innerHTML=list.map(x=>`<tr class="${x.price===null?'market-unlisted':''}"><td><button type="button" class="market-item" data-item="${esc(x.key)}">${x.icon?`<img loading="lazy" alt="" src="${esc(x.icon)}">`:''}<span><strong>${esc(x.name)}${x.level?` <em>+${x.level}</em>`:''}</strong><small>${x.tier?'T'+esc(x.tier)+' · ':''}${x.price===null?'Aktualnie niedostępny':'Zobacz historię ceny'}</small></span></button></td><td class="market-price">${x.price===null?'<span class="market-muted">—</span>':price(x.price)}</td><td><span class="market-change ${x.change<0?'market-down':x.change>0?'market-up':''}">${x.change==null?'—':(x.change<0?'↓ ':x.change>0?'↑ +':'')+price(x.change)}</span>${x.change!=null&&x.previousPrice>0?'<small class="market-percent">'+(x.change>0?'+':'')+((x.price/x.previousPrice-1)*100).toFixed(1)+'%</small>':''}</td><td class="market-quantity">${x.quantity.toLocaleString('pl-PL')}</td></tr>`).join('')||`<tr><td colspan="4" class="market-empty">${snapshot?'Brak przedmiotów pasujących do filtrów.':inFlight?'Pobieram dane rynku…':'Pierwsze dane pojawią się po synchronizacji rynku.'}</td></tr>`;
  el('market-rows').querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>openHistory(b.dataset.item));
  el('market-view').querySelectorAll('[data-market-sort]').forEach(b=>{b.textContent=b.dataset.label+(order===b.dataset.marketSort?(direction===1?' ↑':' ↓'):' ↕');});
 }
 function refresh(){
  if(inFlight)return inFlight;
  const current=++epoch;el('market-status').textContent='Pobieram rynek…';
  el('market-refresh').disabled=true;
  const work=(async()=>{
   await Promise.resolve();
   try{const data=await request('/market/state');if(current!==epoch)return;if(!Array.isArray(data.items))throw Error('Niekompletny odczyt rynku.');snapshot=data;items=data.items;lastLoadedAt=Date.now();el('market-status').textContent=`Odczyt rynku: ${date(data.lastSeenAt)} · ostatnia zmiana: ${date(data.capturedAt)}`;render();}
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
   const points=data.points,values=points.flatMap(p=>p.item?[p.item.price]:[]),min=Math.min(...values),max=Math.max(...values);
   if(!values.length){el('market-chart').textContent='Brak zapisanych cen w tym okresie.';return;}
   const start=Math.max(Date.now()-Number(el('market-days').value)*86400000,points[0].at),end=Math.max(start+1,points.at(-1).seenAt),x=t=>40+Math.max(0,(t-start)/(end-start))*720,y=v=>170-(v-min)/(max-min||1)*130;
   let paths=[],segment=[];
   for(const p of points){if(!p.item){if(segment.length)paths.push(segment.join(' '));segment=[];continue;}const px=x(p.at),py=y(p.item.price);if(segment.length)segment.push(`H${px}`);else segment.push(`M${px},${py}`);segment.push(`V${py}`,`H${x(p.seenAt)}`);}
   if(segment.length)paths.push(segment.join(' '));
   el('market-chart').innerHTML=`<p>Minimum: <b>${price(min)}</b> · maksimum: <b>${price(max)}</b> · ${points.length} zapisów${data.truncated?' · wynik ograniczony':''}</p><svg viewBox="0 0 800 210" role="img" aria-label="Historia najniższej ceny ofertowej"><path d="M40 15V185H770" fill="none" stroke="#b9ac95"/>${paths.map(d=>`<path d="${d}" fill="none" stroke="#227b66" stroke-width="3"/>`).join('')}${points.filter(p=>p.item).map(p=>`<circle cx="${x(p.at)}" cy="${y(p.item.price)}" r="4" fill="#227b66"><title>${esc(date(p.at))}: ${price(p.item.price)}</title></circle>`).join('')}<text x="40" y="205" font-size="12">${esc(new Date(start).toLocaleDateString('pl-PL'))}</text><text x="660" y="205" font-size="12">${esc(new Date(end).toLocaleDateString('pl-PL'))}</text></svg><div class="market-history-scroll"><table><thead><tr><th>Odczyt</th><th>Cena minimalna</th><th>Sztuk</th></tr></thead><tbody>${[...points].reverse().slice(0,100).map(p=>`<tr><td>${date(p.at)}${p.seenAt>p.at?'<small> · bez zmian do '+date(p.seenAt)+'</small>':''}</td><td>${p.item?price(p.item.price):'Brak ofert'}</td><td>${p.item?.quantity??0}</td></tr>`).join('')}</tbody></table></div>`;
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
 window.MarketView={open:async api=>{request=api;render();if(!snapshot||Date.now()-lastLoadedAt>=60000)await refresh();},clear:()=>{const visible=!el('market-view').hidden;epoch++;historyEpoch++;inFlight=null;items=[];snapshot=null;lastLoadedAt=0;el('market-dialog').close();el('market-refresh').disabled=false;render();el('market-status').textContent='';if(visible&&request)queueMicrotask(()=>refresh());}};
 setInterval(()=>{if(request&&!el('market-view').hidden)void refresh();},300000);
})();
