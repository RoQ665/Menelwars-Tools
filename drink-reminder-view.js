(function(root){
 'use strict';
 let clock;
 async function mount(box,api){
  clearInterval(clock);let row=null,open=true;
  const key='roq_private_drink_expanded_v1';try{open=localStorage.getItem(key)!=='0';}catch{}
  function render(){
   if(!box.isConnected)return;
   const minutes=row?.readyAt?Math.max(0,Math.ceil((row.readyAt-Date.now())/60000)):0;
   const wait=minutes?Math.floor(minutes/60)+' godz. '+minutes%60+' min':'Zapisany czas zatrucia minął';
   box.innerHTML='<details '+(open?'open':'')+'><summary style="cursor:pointer;font-weight:bold;padding:4px 0">🍾 Trunek · prywatne RoQ T2</summary>'+
    '<p class="account-note">Termin z komunikatu gry o jabolowym zatruciu. Jedno powiadomienie na blokadę, sprawdzanie co 10 min.</p>'+
    '<label style="display:flex;gap:9px;align-items:center"><input type="checkbox" data-drink-enabled '+(row?.enabled!==0?'checked':'')+'> Powiadamiaj, gdy można znów wypić trunek</label>'+
    (row?.readyAt?'<p><b>'+wait+'</b><br>Koniec: '+new Date(row.readyAt).toLocaleString('pl-PL')+'</p><p class="account-note">Odczyt: '+new Date(row.capturedAt).toLocaleString('pl-PL')+(row.notifiedAt?' · powiadomienie obsłużone':'')+'</p>':'<p>Zainstaluj Tamper 2.8.0. Próba wypicia trunku z paska podczas zatrucia zapisze czas pozostały do kolejnego użycia.</p>')+
    '<p class="account-note">Wybór jest zapamiętany na kolejne blokady i wspólny dla PC i telefonu. Udane wypicie nie zapisuje jeszcze nowego terminu — potrzebny jest komunikat o pozostałym zatruciu. Powiadomienia urządzenia włącz w Koncie.</p>'+
    '<button type="button" data-drink-refresh>Odśwież zapis</button><div role="status" data-drink-status></div></details>';
   const details=box.querySelector('details');details.ontoggle=()=>{if(!details.isConnected)return;open=details.open;try{localStorage.setItem(key,open?'1':'0');}catch{}};
   box.querySelector('[data-drink-refresh]').onclick=()=>void load();
   const input=box.querySelector('[data-drink-enabled]');input.onchange=async()=>{input.disabled=true;try{const data=await api('/admin/drink-reminder',{method:'POST',body:{enabled:input.checked}});if(!box.isConnected)return;row=data.drink;render();}catch(e){if(box.isConnected){input.checked=!input.checked;box.querySelector('[data-drink-status]').textContent=e.message;}}finally{input.disabled=false;}};
  }
  async function load(){try{const data=await api('/admin/drink-reminder');if(!box.isConnected)return;row=data.drink;render();}catch(e){if(box.isConnected)box.textContent='Trunek: '+e.message;}}
  box.textContent='Ładowanie trunku…';await load();
  if(box.isConnected)clock=setInterval(()=>{if(!box.isConnected){clearInterval(clock);return;}if(document.visibilityState==='visible'&&!box.closest('[hidden]')&&!box.querySelector('input:disabled'))render();},30000);
 }
 root.DrinkReminder={mount};
})(window);
