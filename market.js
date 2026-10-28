(() => {
 'use strict';
 const el=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const price=v=>v==null?'—':new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2}).format(v)+' zł';
 const date=v=>v?new Date(v).toLocaleString('pl-PL'):'brak odczytu';
 let request,items=[],order='name',direction=1,epoch=0,historyEpoch=0;
 function render(){
  const query=el('market-search').value.trim().toLocaleLowerCase('pl'),filter=el('market-filter').value;
  const list=items.filter(x=>(x.name+' +'+x.level).toLocaleLowerCase('pl').includes(query)&&(!filter||filter==='fall'&&x.change<0||filter==='rise'&&x.change>0||filter==='missing'&&x.price===null));
  list.sort((a,b)=>{const x=a[order],y=b[order];if(x==null)return y==null?0:1;if(y==null)return -1;return direction*(typeof x==='string'?x.localeCompare(y,'pl'):x-y);});
  el('market-count').textContent=`${list.length} wariantów · kliknij przedmiot, aby zobaczyć historię`;
  el('market-rows').innerHTML=list.map(x=>`<tr><td><button class="market-item" data-item="${esc(x.key)}">${x.icon?`<img loading="lazy" alt="" src="${esc(x.icon)}">`:''}<span>${esc(x.name)}${x.level?` <small>+${x.level}</small>`:''}</span></button></td><td>${x.price===null?'<span class="market-muted">Brak ofert</span>':price(x.price)}</td><td class="${x.change<0?'market-down':x.change>0?'market-up':''}">${x.change==null?'—':(x.change>0?'+':'')+price(x.change)+(x.previousPrice>0?' <small>('+((x.price/x.previousPrice-1)*100).toFixed(1)+'%)</small>':'')}</td><td>${x.quantity}</td><td>${x.offers}</td></tr>`).join('')||'<tr><td colspan="5">Brak pasujących przedmiotów. Pierwsze dane pojawią się po synchronizacji rynku.</td></tr>';
  el('market-rows').querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>openHistory(b.dataset.item));
  el('market-view').querySelectorAll('[data-market-sort]').forEach(b=>{b.textContent=b.dataset.label+(order===b.dataset.marketSort?(direction===1?' ↑':' ↓'):' ↕');});
 }
 async function refresh(){
  const current=++epoch;el('market-status').textContent='Pobieram rynek…';
  try{const data=await request('/market/state');if(current!==epoch)return;items=data.items;el('market-status').textContent=`Ostatnio sprawdzono: ${date(data.lastSeenAt)} · ostatnia zmiana: ${date(data.capturedAt)}`;render();}
  catch(error){if(current!==epoch)return;items=[];render();el('market-status').textContent=error.message;}
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
 el('market-search').oninput=render;el('market-filter').onchange=render;el('market-refresh').onclick=refresh;
 el('market-view').querySelectorAll('[data-market-sort]').forEach(b=>b.onclick=()=>{direction=order===b.dataset.marketSort?-direction:b.dataset.marketSort==='name'?1:-1;order=b.dataset.marketSort;render();});
 el('market-close').onclick=()=>{historyEpoch++;el('market-dialog').close();};
 el('market-dialog').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();if(e.target===e.currentTarget&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)){historyEpoch++;e.currentTarget.close();}});
 el('market-days').onchange=()=>openHistory(el('market-dialog').dataset.key);
 window.MarketView={open:async api=>{request=api;await refresh();},clear:()=>{epoch++;historyEpoch++;items=[];el('market-dialog').close();render();el('market-status').textContent='';}};
 setInterval(()=>{if(request&&!el('market-view').hidden)void refresh();},300000);
})();
