(function(root){
 'use strict';
 const norm=v=>String(v).normalize('NFKC').trim().toLocaleLowerCase('pl');
 function clean(text){return String(text).replace(/\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/[\u00a0\u202f]/g,' ').replace(/[*_#]/g,'').trim();}
 function parse(text,catalog){
  if(typeof text!=='string'||text.length>500000)throw Error('Wklej tekst jednej lub kilku stron ekwipunku (do 500 tys. znaków).');
  const lines=text.split(/\r?\n/).map(clean).filter(Boolean),known=new Map(catalog.map(x=>[norm(x.name),x]));
  const sections=new Map();let current=null,active=false;let money=null;
  for(let i=0;i<lines.length;i++){
   const line=lines[i];
   if(/^Pieniądze/i.test(line)){const v=(line.replace(/^Pieniądze\s*/i,'')||lines[i+1]||'').replace(/\s/g,'').replace(/zł.*$/i,'').replace(',','.');if(/^\d+(?:\.\d{1,2})?$/.test(v))money=Number(v);}
   let source=/^Melina\s*[-–]\s*Rupieciarnia$/i.test(line)?'stash':/^Melina\s*[-–]\s*Sejf$/i.test(line)?'safe':/^Ekwipunek$/i.test(line)?'backpack':null;
   if(source){current={source,items:[],stacks:0,reportedSlots:null};active=false;continue;}
   if(!current)continue;
   if(/^Zobacz\s+(plecak|rupieciarni|sejf)/i.test(line)){active=true;sections.set(current.source,current);continue;}
   if(!active)continue;
   if(/^(Popraw stack|Przeka[zż] do|Przenieś do|Ulepsz mandzur|Zadania|Chat|Info)\b/i.test(line)){active=false;continue;}
   const slots=line.match(/Przedmioty:\s*(\d+)\s*\//i);if(slots){current.reportedSlots=Number(slots[1]);continue;}
   if(/^(Wszystkie|Ubrania i bronie|Żywność|Inne|Mandzur|Wyposa[zż]enie|Ziomale|Przedmioty w sejfie|[←↥‹★🔔✕]+)$/.test(line)||/^Przedmioty w sejfie/i.test(line)||/^[\d\s+/%:.,()]+$/.test(line)||/^image$/i.test(line))continue;
   let name=line,level=0,quantity=1;const inline=name.match(/^(.*?)\s+\+(\d+)$/);if(inline){name=inline[1];level=Number(inline[2]);}
   if(/^\+\d+$/.test(lines[i+1]||'')){level=Number(lines[++i].slice(1));}
   if(/^\d+$/.test(lines[i+1]||'')){quantity=Number(lines[++i]);}
   if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1e9||level>100)throw Error('Nieprawidłowa liczba sztuk lub ulepszenie przy '+name+'.');
   const meta=known.get(norm(name));current.stacks++;const row={name,id:meta?.id??null,level,quantity};
   const previous=current.items.find(x=>norm(x.name)===norm(name)&&x.level===level);if(previous)previous.quantity+=quantity;else current.items.push(row);
  }
  const result=[...sections.values()].filter(s=>s.stacks);
  if(!result.length)throw Error('Nie rozpoznano plecaka, rupieciarni ani sejfu. Skopiuj całą stronę z widoczną listą przedmiotów.');
  for(const s of result)if(s.reportedSlots!==null&&s.reportedSlots!==s.stacks)throw Error('Schowek '+s.source+': odczytano '+s.stacks+' z '+s.reportedSlots+' pozycji. Wybierz Wszystkie i skopiuj pełną listę.');
  return {sections:result,money};
 }
 function assess(row,market,catalog,recipes,includeSafe=false){
  const meta=catalog.find(x=>x.id===row.id),quote=market.find(x=>x.id===row.id&&x.level===row.level),paser=row.level===0?meta?.paserPrice??null:null;
  const price=quote?.price??null,gross=price===null?null:Math.floor(price)*row.quantity,fee=gross===null?null:Math.floor(gross*.05),marketNet=gross===null?null:gross-fee,paserTotal=paser===null?null:paser*row.quantity;
  const sets=recipes.filter(r=>Object.keys(r.items).some(n=>norm(n)===norm(row.name))).map(r=>r.name);
  let choice='check',reason='Brak wystarczającej wyceny.';
  if(!meta){reason='Nierozpoznana nazwa lub wariant — sprawdź ręcznie.';}
  else if(row.source==='safe'&&!includeSafe){choice='keep';reason='Przedmiot w sejfie — domyślnie do zachowania.';}
  else if(row.level>0){choice='check';reason='Ulepszony przedmiot — sprawdź ręcznie; nie stosujemy ceny pasera dla +0.';}
  else if(sets.length){choice='collection';reason='Składnik kolekcji — porównaj wartość przed sprzedażą.';}
  else if(meta.tradable&&marketNet!==null&&paserTotal!==null){choice=marketNet>paserTotal?'market':'paser';reason=marketNet>paserTotal?'Bazar po jednej opłacie przewyższa bazową cenę pasera, jeśli sprzedasz cały pakiet.':'Bazowa cena pasera jest co najmniej równa minimum bazaru po opłacie.';}
  else if(!meta.tradable){choice=paser>0?'paser':'keep';reason=paser>0?'Brak handlu z graczami; znana cena pasera.':'Niehandlowy lub bez ceny skupu — zachowaj albo sprawdź zastosowanie.';}
  else if(price===null){reason='Brak ofert tego wariantu. Nie zgadujemy ceny wystawienia.';}
  else{reason='Jest cena bazaru, ale brakuje porównywalnej ceny pasera.';}
  return {row,meta,quote,paser,paserTotal,price,fee,marketNet,sets,choice,reason};
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={parse,assess};return;}
 root.MarketInventoryEngine={parse,assess};
})(typeof window!=='undefined'?window:globalThis);
