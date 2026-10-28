(function(root){
 'use strict';
 const norm=v=>String(v).normalize('NFKC').trim().toLocaleLowerCase('pl');
 const integer=(v,min=0,max=1e9)=>{if(!Number.isSafeInteger(v)||v<min||v>max)throw Error('Nieprawidłowa liczba sztuk lub wystawień.');return v;};
 const cents=v=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e12)throw Error('Nieprawidłowa kwota.');return safe(Math.round(v*100));};
 const safe=v=>{if(!Number.isSafeInteger(v)||v<0)throw Error('Kwota lub liczba sztuk jest zbyt duża.');return v;};
 const fee=(q,p)=>safe(Math.floor(safe(q*p)/20)*100);
 function breakEven(quantity,targetCents,variableListings){
  let best=null;const slope=quantity*(20-variableListings)*100;
  for(let residue=0;residue<20;residue++){
   const base=(quantity*residue-variableListings*Math.floor(quantity*residue/20))*100;
   let k=0;if(slope>0)k=Math.max(0,Math.ceil((targetCents-base)/slope));else if(base<targetCents)continue;
   if(k===0&&residue===0){if(slope<=0)continue;k=1;}
   const price=20*k+residue;if(quantity*price*100-variableListings*Math.floor(quantity*price/20)*100>=targetCents&&(best===null||price<best))best=price;
  }
  return best;
 }
 function offer(input){
  const q=integer(input.quantity,1,1e6),buy=cents(input.buyPrice),sale=integer(input.salePrice,1,1e9),repeats=integer(input.repeats??0,0,99);
  const initial=input.initialPrice==null?sale:integer(input.initialPrice,1,1e9),relist=input.relistPrice==null?sale:integer(input.relistPrice,1,1e9);
  const previous=cents(input.previousCosts??0),cost=safe(q*buy),revenue=safe(q*sale*100),listing=fee(q,initial),repeatFees=safe(fee(q,relist)*repeats),fees=safe(listing+repeatFees+previous);
  const fixed=previous+(input.initialPrice==null?0:listing)+(input.relistPrice==null?0:repeatFees),variable=(input.initialPrice==null?1:0)+(input.relistPrice==null?repeats:0);
  return {quantity:q,buyCost:cost/100,revenue:revenue/100,initialFee:listing/100,repeatFees:repeatFees/100,totalFees:fees/100,profit:(revenue-cost-fees)/100,capital:safe(cost+fees)/100,breakEven:breakEven(q,safe(cost+fixed),variable),roi:cost?(revenue-cost-fees)/cost*100:null};
 }
 function journal(position){
  const q=integer(position.quantity,1,1e6),unit=cents(position.buyPrice),purchase=Date.parse(position.boughtAt);if(!Number.isFinite(purchase))throw Error('Nieprawidłowa data zakupu.');
  if(!Array.isArray(position.events)||position.events.length>200)throw Error('Pozycja może mieć najwyżej 200 zdarzeń.');
  let remaining=q,revenue=0,fees=0,hasListing=false;const ids=new Set();
  for(const e of [...position.events].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))){
   if(typeof e.id!=='string'||!/^[a-zA-Z0-9_-]{10,80}$/.test(e.id)||ids.has(e.id))throw Error('Powtórzone lub nieprawidłowe zdarzenie.');ids.add(e.id);
   const at=Date.parse(e.at);if(!Number.isFinite(at)||at<purchase)throw Error('Zdarzenie nie może poprzedzać zakupu.');
   if(e.kind==='cost'){fees=safe(fees+cents(e.amount));continue;}
   const count=integer(e.quantity,1,q),price=cents(e.price);if(count>remaining)throw Error('Liczba sztuk przekracza stan pozycji w podanym dniu.');
   if(e.kind==='listing'){
    if(!Number.isInteger(e.price)||e.price<1)throw Error('Cena wystawienia musi być dodatnią liczbą całkowitą.');
    fees=safe(fees+(e.fee==null?fee(count,e.price):cents(e.fee)));hasListing=true;
   }else if(e.kind==='sale'){
    if(!['market','paser'].includes(e.channel))throw Error('Wybierz miejsce sprzedaży.');
    if(e.channel==='market'&&!hasListing)throw Error('Przed sprzedażą na bazarze zapisz przynajmniej jedno wystawienie i jego opłatę.');
    remaining-=count;revenue=safe(revenue+safe(count*price));
   }else throw Error('Nieznany rodzaj zdarzenia.');
  }
  const buyCost=safe(q*unit),sold=q-remaining,soldCost=safe(sold*unit);
  return {quantity:q,sold,remaining,buyCost:buyCost/100,revenue:revenue/100,fees:fees/100,soldCost:soldCost/100,result:(revenue-soldCost-fees)/100,cashFlow:(revenue-buyCost-fees)/100,stockCost:safe(remaining*unit)/100,closed:remaining===0};
 }
 const reserveKey=row=>row.id!=null?row.id+':'+row.level:'name:'+norm(row.name)+':'+row.level;
 function reserveRows(rows,reserves={},includeSafe=false){
  const groups=new Map(),result=rows.map(r=>({...r,reserved:0,sellQuantity:r.quantity}));
  for(const r of result){const k=reserveKey(r);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
  for(const [key,group] of groups){
   let protectedCount=0;for(const r of group)if(r.source==='safe'&&!includeSafe){r.reserved=r.quantity;r.sellQuantity=0;protectedCount+=r.quantity;}
   let left=Math.max(0,(Number(reserves[key])||0)-protectedCount);
   const order={backpack:0,stash:1,safe:2};
   for(const r of [...group].sort((a,b)=>order[a.source]-order[b.source])){if(r.source==='safe'&&!includeSafe)continue;r.reserved=Math.min(left,r.quantity);r.sellQuantity=r.quantity-r.reserved;left-=r.reserved;}
  }
  return result;
 }
 function plan(recipes,items,owned,budget,maxRuns=50,options={}){
  const limit=integer(maxRuns,1,100),budgetCents=cents(budget),market=new Map(items.filter(x=>x.level===0).map(x=>[norm(x.name),x])),resources=new Map();
  const candidates=recipes.filter(r=>r.reward.gold>0).map(r=>({name:r.name,gold:r.reward.gold,needs:Object.entries(r.items).map(([name,q])=>{
   const key=norm(name),m=market.get(key),have=Math.max(0,Math.floor(Number(owned[key])||0)),quantity=m?.price!=null?Math.min(1,Math.max(0,Math.floor(m.quantity))):0;
   if(!resources.has(key))resources.set(key,{name,owned:have,market:quantity,price:m?.price!=null?cents(m.price):null});return {key,q};
  })}));
  const used=new Map([...resources.keys()].map(k=>[k,0]));
  function maxCount(r,spent,runs){let cap=limit-runs;for(const n of r.needs){const v=resources.get(n.key);cap=Math.min(cap,Math.floor((v.owned+v.market-used.get(n.key))/n.q));}let low=0,high=Math.max(0,cap);while(low<high){const mid=Math.ceil((low+high)/2);if(delta(r,mid)<=budgetCents-spent)low=mid;else high=mid-1;}return low;}
  function delta(r,n){let cost=0;for(const a of r.needs){const v=resources.get(a.key),before=used.get(a.key),buy=Math.max(0,before+a.q*n-v.owned)-Math.max(0,before-v.owned);cost+=buy*(v.price??0);}return cost;}
  candidates.sort((a,b)=>{const ca=delta(a,1),cb=delta(b,1);return (cb?b.gold/cb:Infinity)-(ca?a.gold/ca:Infinity)||b.gold-a.gold||a.name.localeCompare(b.name,'pl');});
  let visited=0,truncated=false,best={coins:0,cost:0,counts:[]};const counts=Array(candidates.length).fill(0),memo=new Map(),started=Date.now(),maxNodes=options.maxNodes??250000,maxMs=options.maxMs??1500;
  function bound(index,spent,runs){
   const blocks=[];for(let i=index;i<candidates.length;i++){const r=candidates[i],cap=maxCount(r,spent,runs);if(!cap)continue;
    const changes=new Set([0,cap]);for(const n of r.needs){const v=resources.get(n.key),free=Math.max(0,v.owned-used.get(n.key)),t=Math.floor(free/n.q);for(const cut of [t,t+1])if(cut>0&&cut<cap)changes.add(cut);}
    const cuts=[...changes].sort((a,b)=>a-b);for(let j=1;j<cuts.length;j++){const a=cuts[j-1],b=cuts[j];blocks.push({n:b-a,gold:r.gold,cost:(delta(r,b)-delta(r,a))/(b-a)});}
   }
   let moneyLeft=budgetCents-spent,byMoney=0;for(const b of [...blocks].sort((a,b)=>(b.cost?b.gold/b.cost:Infinity)-(a.cost?a.gold/a.cost:Infinity))){const take=b.cost?Math.min(b.n,moneyLeft/b.cost):b.n;byMoney+=take*b.gold;moneyLeft-=take*b.cost;}
   let slots=limit-runs,byRuns=0;for(const b of [...blocks].sort((a,b)=>b.gold-a.gold)){const take=Math.min(slots,b.n);byRuns+=take*b.gold;slots-=take;}
   return Math.min(byMoney,byRuns);
  }
  function search(index,spent,runs,coins){
   if(++visited>maxNodes||(visited%256===0&&Date.now()-started>maxMs)){truncated=true;return;}
   if(coins>best.coins||coins===best.coins&&spent<best.cost)best={coins,cost:spent,counts:[...counts]};
   if(index===candidates.length||runs===limit||coins+bound(index,spent,runs)<best.coins-1e-7)return;
   const keys=[...new Set(candidates.slice(index).flatMap(r=>r.needs.map(n=>n.key)))];
   const signature=index+'|'+spent+'|'+runs+'|'+keys.map(k=>used.get(k)).join(',');
   if((memo.get(signature)??-1)>=coins)return;memo.set(signature,coins);
   const r=candidates[index],max=maxCount(r,spent,runs);
   for(let n=max;n>=0;n--){const cost=delta(r,n);counts[index]=n;for(const a of r.needs)used.set(a.key,used.get(a.key)+a.q*n);search(index+1,spent+cost,runs+n,coins+r.gold*n);for(const a of r.needs)used.set(a.key,used.get(a.key)-a.q*n);counts[index]=0;if(truncated)break;}
  }
  search(0,0,0,0);
  const selected=candidates.map((r,i)=>({...r,count:best.counts[i]||0})).filter(r=>r.count);
  const demands=new Map();for(const r of selected)for(const n of r.needs)demands.set(n.key,(demands.get(n.key)||0)+n.q*r.count);
  const shopping=[...demands].map(([key,quantity])=>{const r=resources.get(key),held=Math.min(quantity,r.owned),buy=quantity-held;return {name:r.name,quantity,held,buy,available:r.market,unitPrice:r.price===null?null:r.price/100,cost:buy*(r.price??0)/100};});
  return {coins:best.coins,cost:best.cost/100,left:(budgetCents-best.cost)/100,runs:selected.map(r=>({name:r.name,count:r.count,coins:r.gold*r.count})),shopping,optimal:!truncated,visited,maxRuns:limit};
 }
 const api={offer,journal,reserveKey,reserveRows,plan};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MarketEconomy=api;
})(typeof window!=='undefined'?window:globalThis);
