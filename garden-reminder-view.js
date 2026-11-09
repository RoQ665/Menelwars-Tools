(function(root){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let timer;
 async function mount(box,api){
  clearInterval(timer);let state={enabled:false,plots:[]},open=true;
  const key='roq_private_garden_expanded_v1';try{open=localStorage.getItem(key)!=='0';}catch{}
  function render(){
   if(!box.isConnected)return;
   box.innerHTML='<details '+(open?'open':'')+'><summary style="cursor:pointer;font-weight:bold;padding:4px 0">🌱 Ogród · prywatne RoQ T2</summary><p class="account-note">Przewidywany czas zbioru według modelu Ogrodu. To szacunek, sprawdź gotowość w grze. Jedno powiadomienie na uprawę; grządki gotowe w tym samym sprawdzeniu łączymy. Sprawdzanie co 10 min.</p><label style="display:flex;gap:9px;align-items:center"><input type="checkbox" data-garden-notify '+(state.enabled?'checked':'')+'> Powiadamiaj o przewidywanym zbiorze</label>'+
    (state.plots.length?state.plots.map(r=>'<p><b>Grządka '+Number(r.plot)+' · '+esc(r.plant)+'</b><br>☀️ '+Number(r.sun)+' · 💧 '+Number(r.water)+' · pH '+Number(r.ph)+'<br>Przewidywany zbiór: '+new Date(r.readyAt).toLocaleString('pl-PL')+(r.source==='fallback52'?' · brak danych modelu, domyślnie 52 godz.':'')+(r.notifiedAt?' · powiadomienie obsłużone':'')+'</p>').join(''):'<p>Zaktualizuj skrypt do 2.8.1 na PC i telefonie. Obsługujemy zwykłe sadzenie i ponowny zasiew. Obecnych upraw nie odliczamy od chwili otwarcia ogrodu.</p>')+
    '<p class="account-note">Przy ponownym zasiewie z tymi samymi parametrami używamy poprzedniego szacowanego czasu wzrostu. Wybór pozostaje na kolejne uprawy i działa na obu urządzeniach. Udany zbiór usuwa przypomnienie. Włącz też powiadomienia na tym urządzeniu w ustawieniach Konta.</p><button type="button" data-garden-refresh>Odśwież zapis</button><div role="status" data-garden-status></div></details>';
   const details=box.querySelector('details');details.ontoggle=()=>{if(!details.isConnected)return;open=details.open;try{localStorage.setItem(key,open?'1':'0');}catch{}};
   box.querySelector('[data-garden-refresh]').onclick=()=>void load();
   const input=box.querySelector('[data-garden-notify]');input.onchange=async()=>{input.disabled=true;try{state=await api('/admin/garden-reminder',{method:'POST',body:{enabled:input.checked}});render();}catch(e){input.checked=!input.checked;box.querySelector('[data-garden-status]').textContent=e.message;}finally{input.disabled=false;}};
  }
  async function load(){try{state=await api('/admin/garden-reminder');render();}catch(e){if(box.isConnected)box.textContent='Ogród: '+e.message;}}
  await load();if(box.isConnected)timer=setInterval(()=>{if(!box.isConnected){clearInterval(timer);return;}if(document.visibilityState==='visible'&&!box.closest('[hidden]')&&!box.querySelector('input:disabled'))void load();},60000);
 }
 root.GardenReminder={mount};
})(window);
