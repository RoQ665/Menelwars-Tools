(function(root){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let clock;
 async function mount(box,api){
  clearInterval(clock);let row=null,open=true;
  const stateKey='roq_private_investment_expanded_v1';try{open=localStorage.getItem(stateKey)!=='0';}catch{}
  function render(){
   if(!box.isConnected)return;
   const left=row?.finishesAt?Math.max(0,Math.ceil((row.finishesAt-Date.now())/60000)):0;
   const wait=left?Math.floor(left/1440)+' dni '+Math.floor(left%1440/60)+' godz. '+left%60+' min':'Zapisany czas inwestycji minął';
   box.innerHTML='<details '+(open?'open':'')+'><summary style="cursor:pointer;font-weight:bold;padding:4px 0">🏢 Koniec inwestycji · prywatne RoQ T2</summary><p class="account-note">Jedno powiadomienie po zakończeniu inwestycji. Wybór pozostaje na kolejne inwestycje, także na telefonie. Sprawdzanie co 10 min.</p>'+
    (row?'<label style="display:flex;gap:9px;align-items:center"><input type="checkbox" data-investment-enabled '+(row.enabled?'checked':'')+'> Powiadamiaj o końcu inwestycji</label>'+(row.finishesAt?'<p><b>'+esc(row.name)+'</b><br>'+wait+'<br><small>Koniec: '+new Date(row.finishesAt).toLocaleString('pl-PL')+'</small></p>':'<p>Według ostatniego odczytu brak aktywnej inwestycji.</p>')+'<p class="account-note">Odczyt: '+new Date(row.capturedAt).toLocaleString('pl-PL')+(row.notifiedAt?' · powiadomienie obsłużone':'')+'. Przed rozpoczęciem kolejnej sprawdź spółkę w grze.</p>':'<p>Zaktualizuj skrypt do 2.5.0 i otwórz Spółkę w grze, aby zapisać termin inwestycji.</p>')+'<button type="button" data-investment-refresh>Odśwież zapis</button><div role="status" data-investment-status></div></details>';
   const details=box.querySelector('details');details.ontoggle=()=>{if(!details.isConnected)return;open=details.open;try{localStorage.setItem(stateKey,open?'1':'0');}catch{}};
   box.querySelector('[data-investment-refresh]').onclick=()=>void load();
   const input=box.querySelector('[data-investment-enabled]');if(input)input.onchange=async()=>{input.disabled=true;try{const data=await api('/admin/investment-reminder',{method:'POST',body:{enabled:input.checked}});if(!box.isConnected)return;row=data.investment;render();}catch(e){input.checked=!input.checked;box.querySelector('[data-investment-status]').textContent=e.message;}finally{input.disabled=false;}};
  }
  async function load(){try{const data=await api('/admin/investment-reminder');if(!box.isConnected)return;row=data.investment;render();}catch(e){if(box.isConnected)box.textContent='Inwestycja: '+e.message;}}
  box.textContent='Ładowanie inwestycji…';await load();
  if(box.isConnected)clock=setInterval(()=>{if(!box.isConnected){clearInterval(clock);return;}if(document.visibilityState==='visible'&&!box.closest('[hidden]')&&!box.querySelector('input:disabled'))render();},60000);
 }
 root.InvestmentReminder={mount};
})(window);
