(function(root){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=v=>new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2}).format(v);
 const time=t=>new Date(t).toLocaleString('pl-PL');
 function scale(min,max,integer=false){
  if(integer){min=0;max=Math.max(1,max);}
  const pad=integer?max*.08:min===max?Math.max(.01,max*.02):(max-min)*.1;
  const low=integer?0:Math.max(0,min-pad),high=max+pad,raw=(high-low)/4,power=10**Math.floor(Math.log10(raw||1));
  let step=[1,2,2.5,5,10].map(v=>v*power).find(v=>v>=raw)||power*10;
  step=integer?Math.max(1,Math.ceil(step)):Math.max(.01,step);
  const bottom=Math.floor(low/step)*step,top=Math.ceil(high/step)*step,ticks=[];
  for(let i=0;i<=Math.round((top-bottom)/step);i++)ticks.push(Number((bottom+i*step).toFixed(2)));
  return {min:bottom,max:top,ticks};
 }
 function series(points,days=7,now=Date.now(),reference=null){
  if(!points.length)return {svg:'',minimum:null,maximum:null,quantities:[],deltas:[]};
  const values=points.filter(p=>p.item?.price!=null).map(p=>p.item.price),min=values.length?Math.min(...values):null,max=values.length?Math.max(...values):null;
  const quantities=points.map(p=>p.item?.quantity??0),prices=scale(reference===null?min??0:Math.min(min??reference,reference),reference===null?max??1:Math.max(max??reference,reference)),stock=scale(0,Math.max(...quantities),true);
  const start=Math.max(now-days*86400000,points[0].at),end=Math.max(start,points.at(-1).seenAt),span=Math.max(1,end-start);
  const x=t=>end===start?440:114+Math.max(0,Math.min(1,(t-start)/span))*652;
  const yPrice=v=>244-(v-prices.min)/(prices.max-prices.min)*184,yQuantity=v=>244-v/stock.max*184;
  function path(value,y,colour,dashed=false){let output=[],part=[];for(const p of points){const v=value(p);if(v==null){if(part.length)output.push(part.join(' '));part=[];continue;}part.push((part.length?'L':'M')+x(p.at)+','+y(v));if(p.seenAt>p.at)part.push('L'+x(p.seenAt)+','+y(v));}if(part.length)output.push(part.join(' '));return output.map(d=>'<path d="'+d+'" fill="none" stroke="'+colour+'" stroke-width="3" stroke-linejoin="round"'+(dashed?' stroke-dasharray="7 5"':'')+'/>').join('');}
  const green='#217157',blue='#477caa';
  const grid=prices.ticks.map(v=>'<path d="M96 '+yPrice(v)+'H784" stroke="#e6ded0" stroke-dasharray="3 5"/><text x="84" y="'+(yPrice(v)+4)+'" text-anchor="end" fill="'+green+'" font-size="13">'+number(v)+'</text>').join('');
  const quantityTicks=stock.ticks.map(v=>'<text x="798" y="'+(yQuantity(v)+4)+'" fill="'+blue+'" font-size="13">'+v+'</text>').join('');
  const sameDay=new Date(start).toDateString()===new Date(end).toDateString(),short=t=>new Date(t).toLocaleString('pl-PL',sameDay?{hour:'2-digit',minute:'2-digit'}:{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  const timeline=(end===start?[start]:Array.from({length:5},(_,i)=>start+(end-start)*i/4)).map(t=>'<text x="'+x(t)+'" y="271" text-anchor="middle" fill="#897b64" font-size="12">'+esc(short(t))+'</text>').join('');
  function dot(p,value,y,color){return '<circle cx="'+x(p.at)+'" cy="'+y(value)+'" r="4.5" fill="'+color+'" stroke="#fffdf8" stroke-width="2"><title>'+esc(time(p.at))+' · '+number(value)+'</title></circle>';}
  const pointsSvg=points.map(p=>(p.item?.price!=null?dot(p,p.item.price,yPrice,green):'')+dot(p,p.item?.quantity??0,yQuantity,blue)).join('');
  const svg='<svg viewBox="0 0 900 310" role="img" aria-label="Dwie linie: cena w złotych po lewej i dostępne sztuki po prawej"><text x="96" y="28" fill="'+green+'" font-size="13">Cena · zł</text><text x="784" y="28" text-anchor="end" fill="'+blue+'" font-size="13">Dostępność · szt.</text>'+grid+quantityTicks+(reference===null?'':'<path d="M96 '+yPrice(reference)+'H784" stroke="#b28b3e" stroke-width="2" stroke-dasharray="3 6"><title>Mediana 7 dni: '+number(reference)+' zł</title></path>')+path(p=>p.item?.price??null,yPrice,green)+path(p=>p.item?.quantity??0,yQuantity,blue,true)+pointsSvg+timeline+'<text x="96" y="300" fill="#a19279" font-size="11">'+esc(new Date(start).toLocaleDateString('pl-PL'))+' · punkty oznaczają rzeczywiste odczyty</text></svg>';
  return {svg,priceScale:prices,quantityScale:stock,minimum:min,maximum:max,quantities,deltas:quantities.map((q,i)=>i?q-quantities[i-1]:null)};
 }
 const api={series};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MarketChart=api;
})(typeof window!=='undefined'?window:globalThis);
