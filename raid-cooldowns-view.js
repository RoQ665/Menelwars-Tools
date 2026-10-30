(function(root){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let clock;
 function remaining(at){const minutes=Math.ceil((at-Date.now())/60000);if(minutes<=0)return 'Powinien być dostępny';const d=Math.floor(minutes/1440),h=Math.floor(minutes%1440/60),m=minutes%60;return [d?d+' dni':'',h?h+' godz.':'',m?m+' min':''].filter(Boolean).join(' ');}
 async function mount(box,api){
  clearInterval(clock);let rows=[];
  function render(){
   if(!box.isConnected){clearInterval(clock);return;}
   box.innerHTML='<b>🎯 Napady grupowe · prywatne RoQ T2</b><p class="account-note">Terminy z gry na PC i telefonie. Kontener jest pomijany. Zaznacz napady do powiadomień; sprawdzanie co 10 min. Dostępność potwierdź w grze — ktoś mógł już rozpocząć nowy napad.</p><button type="button" data-raids-refresh>Odśwież zapis</button><div role="status" data-raids-status></div>'+
    (rows.length?'<div style="display:grid;gap:10px;margin-top:12px">'+[...rows].sort((a,b)=>a.availableAt-b.availableAt).map(r=>'<label style="display:flex;gap:10px;align-items:start;border-bottom:1px solid #ddcfb7;padding-bottom:9px"><input type="checkbox" data-raid-id="'+r.id+'" '+(r.enabled?'checked':'')+' aria-label="Powiadom o '+esc(r.name)+'"><span><b>'+esc(r.name)+'</b><br>'+remaining(r.availableAt)+'<br><small>'+new Date(r.availableAt).toLocaleString('pl-PL')+' · odczyt '+new Date(r.capturedAt).toLocaleString('pl-PL')+(r.notifiedAt?' · powiadomienie obsłużone':'')+'</small></span></label>').join('')+'</div>':'<p>Brak zapisanych terminów. Zaktualizuj skrypt do 2.4.0, otwórz Gang, a potem listę napadów w grze. Import nie uruchamia napadów.</p>');
   box.querySelector('[data-raids-refresh]').onclick=()=>void load();
   box.querySelectorAll('[data-raid-id]').forEach(input=>input.onchange=async()=>{input.disabled=true;try{const data=await api('/admin/raid-cooldowns',{method:'POST',body:{id:Number(input.dataset.raidId),enabled:input.checked}});if(!box.isConnected)return;rows=data.raids;render();}catch(e){input.checked=!input.checked;box.querySelector('[data-raids-status]').textContent=e.message;}finally{input.disabled=false;}});
  }
  async function load(){try{const data=await api('/admin/raid-cooldowns');if(!box.isConnected)return;rows=data.raids||[];render();}catch(e){if(box.isConnected)box.textContent='Napady: '+e.message;}}
  box.textContent='Ładowanie terminów napadów…';await load();
  if(box.isConnected)clock=setInterval(()=>{if(!box.isConnected){clearInterval(clock);return;}if(document.visibilityState==='visible'&&!box.closest('[hidden]')&&!box.querySelector('input:disabled'))render();},60000);
 }
 root.RaidCooldowns={mount};
})(window);
