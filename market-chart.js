(function(root){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=v=>new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2}).format(v);
 const time=t=>new Date(t).toLocaleString('pl-PL');
 function series(points,days=7,now=Date.now()){
  if(!points.length)return {svg:'',minimum:null,maximum:null,quantities:[],deltas:[]};
  const values=points.filter(p=>p.item?.price!=null).map(p=>p.item.price),min=values.length?Math.min(...values):null,max=values.length?Math.max(...values):null;
  const quantities=points.map(p=>p.item?.quantity??0),quantityMax=Math.max(2,...quantities),padding=min===max?Math.max(1,(min||1)*.05):Math.max(1,(max-min)*.1),priceMin=min===null?0:Math.max(0,min-padding),priceMax=max===null?1:max+padding;
  const start=Math.max(now-days*86400000,points[0].at),end=Math.max(start+1,points.at(-1).seenAt),x=t=>90+Math.max(0,Math.min(1,(t-start)/(end-start)))*700;
  const yPrice=v=>225-(v-priceMin)/(priceMax-priceMin)*170,yQuantity=v=>225-v/quantityMax*170;
  function path(value,y,colour){let output=[],part=[];for(const p of points){const v=value(p);if(v==null){if(part.length)output.push(part.join(' '));part=[];continue;}if(part.length)part.push('H'+x(p.at),'V'+y(v));else part.push('M'+x(p.at)+','+y(v));part.push('H'+x(p.seenAt));}if(part.length)output.push(part.join(' '));return output.map(d=>`<path d="${d}" fill="none" stroke="${colour}" stroke-width="2.6"/>`).join('');}
  const green='#217157',blue='#477caa';
  const grid=[0,.5,1].map(f=>{const y=225-f*170;return `<path d="M90 ${y}H790" stroke="#e5ddce" stroke-dasharray="4 4"/><text x="78" y="${y+4}" text-anchor="end" fill="${green}" font-size="11">${number(priceMin+f*(priceMax-priceMin))}</text><text x="802" y="${y+4}" fill="${blue}" font-size="11">${Math.round(f*quantityMax)}</text>`;}).join('');
  const pointsSvg=points.map(p=>`${p.item?.price!=null?`<circle cx="${x(p.at)}" cy="${yPrice(p.item.price)}" r="3.5" fill="${green}"><title>${esc(time(p.at))} · cena ${number(p.item.price)} zł</title></circle>`:''}<circle cx="${x(p.at)}" cy="${yQuantity(p.item?.quantity??0)}" r="3.5" fill="${blue}"><title>${esc(time(p.at))} · ${p.item?.quantity??0} szt.</title></circle>`).join('');
  const svg=`<svg viewBox="0 0 900 280" role="img" aria-label="Dwie linie: cena w złotych po lewej i dostępne sztuki po prawej"><text x="90" y="25" fill="${green}" font-size="12">Cena · zł</text><text x="790" y="25" text-anchor="end" fill="${blue}" font-size="12">Dostępność · szt.</text>${grid}${path(p=>p.item?.price??null,yPrice,green)}${path(p=>p.item?.quantity??0,yQuantity,blue)}${pointsSvg}<text x="90" y="258" font-size="10" fill="#8b7d64">${esc(time(start))}</text><text x="790" y="258" text-anchor="end" font-size="10" fill="#8b7d64">${esc(time(end))}</text></svg>`;
  return {svg,minimum:min,maximum:max,quantities,deltas:quantities.map((q,i)=>i?q-quantities[i-1]:null)};
 }
 const api={series};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MarketChart=api;
})(typeof window!=='undefined'?window:globalThis);
