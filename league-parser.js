(function () {
  'use strict';
  function parse(text) {
    const lines = text.replace(/\r/g, '').split('\n').map(s => s.trim()).filter(Boolean);
    const start = lines.lastIndexOf('Szczegóły meczu');
    if (start < 0) throw Error('Wklej stronę z otwartymi Szczegółami meczu.');
    const l = lines.slice(start);
    const dateMatch = (l.find(s => /^Dzień\s+\d+/.test(s)) || '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (!dateMatch) throw Error('Brak daty meczu — nie można bezpiecznie przypisać zapisu do dnia.');
    const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    const head = l.indexOf('Atakujący');
    if (head < 0 || l[head + 1] !== 'Broniący') throw Error('Brak nagłówków Atakujący / Broniący.');
    const vs = l.indexOf('vs');
    const gangA = l[vs - 3], gangB = l[vs + 1];
    if (!gangA || !gangB) throw Error('Nie rozpoznano gangów meczu.');
    const number = s => Number(s.replace(/[−–]/g, '-').replace(/[^\d+-]/g, ''));
    const expectedXP = number(l[vs - 2]);
    const expected = Number((l.slice(0, head).join('\n').match(/Walki\s*\((\d+)\)/) || [])[1]);
    const fights = [], warnings = [];
    let i = head + 2;
    while (i < l.length) {
      if (l[i + 2] !== 'vs' || ![gangA, gangB].includes(l[i + 1]) || ![gangA, gangB].includes(l[i + 4])) { warnings.push('Nierozpoznany fragment: ' + l[i]); break; }
      const f = {attacker:l[i], attackerGang:l[i+1], defender:l[i+3], defenderGang:l[i+4], status:l[i+5], xp:0};
      i += 6;
      if (f.status.startsWith('Trwa')) { f.pending = true; }
      else if (f.status.startsWith('Wygrywa ')) {
        f.winner = f.status.slice(8).trim();
        if (![f.attacker, f.defender].includes(f.winner) || !/^[+−–-]?\s*[\d\s]+\s*XP$/.test(l[i] || '')) { warnings.push('Niepełny wynik walki: ' + f.attacker + ' / ' + f.defender); break; }
        f.xp = Math.abs(number(l[i++]));
      } else if (/remis/i.test(f.status)) { f.draw = true; if (/XP$/.test(l[i] || '')) i++; }
      else { warnings.push('Nieobsługiwany wynik: ' + f.status); break; }
      if (!/^\d{1,2}:\d{2}$/.test(l[i] || '')) { warnings.push('Brak godziny walki: ' + f.attacker); break; }
      f.time = l[i++]; fights.push(f);
    }
    const players = new Map();
    for (const f of fights) {
      for (const attack of [true, false]) {
        const name = attack ? f.attacker : f.defender, gang = attack ? f.attackerGang : f.defenderGang;
        const key = JSON.stringify([gang, name]);
        if (!players.has(key)) players.set(key, {name, gang, attacks:0, defenses:0, attackWins:0, attackLosses:0, defenseWins:0, defenseLosses:0, pendingAttack:0, pendingDefense:0, draws:0, attackXP:0, defenseXP:0, xp:0});
        const p = players.get(key), role = attack ? 'attack' : 'defense';
        p[attack ? 'attacks' : 'defenses']++;
        if (f.pending) { p[attack ? 'pendingAttack' : 'pendingDefense']++; continue; }
        if (f.draw) { p.draws++; continue; }
        const win = f.winner === name, amount = win ? f.xp : -f.xp;
        p[role + (win ? 'Wins' : 'Losses')]++; p[role + 'XP'] += amount; p.xp += amount;
      }
    }
    const rows = [...players.values()];
    const xp = rows.filter(p => p.gang === gangA).reduce((sum,p) => sum+p.xp,0);
    if (fights.length !== expected) warnings.push(`Odczytano ${fights.length} z ${expected || '?'} walk — podsumowanie może być niepełne.`);
    if (xp !== expectedXP) warnings.push(`Bilans z walk (${xp}) różni się od nagłówka (${expectedXP}).`);
    return {date, gangA, gangB, expected, expectedXP, xp, fights, players:rows, warnings};
  }
  const storageKey = 'menelwars_league_matches_v1';
  const matchKey = data => JSON.stringify([data.date, ...[data.gangA,data.gangB].sort()]);
  function saveMatch(storage, text, now = new Date().toISOString()) {
    const data = parse(text);
    if (data.warnings.length) throw Error('Nie zapisano niepełnego lub niespójnego meczu: ' + data.warnings.join(' '));
    const history = readHistory(storage);
    const key = matchKey(data), previous = history.find(m => m.key === key);
    const completed = report => report.fights.filter(f => !f.pending).length;
    if (previous) {
      const old = parse(previous.text);
      if (old.fights.length > data.fights.length || completed(old) > completed(data)) throw Error('Ten odczyt zawiera mniej walk lub wyników niż zapisany mecz. Zachowano nowszy zapis.');
    }
    // Store only the match section, never the copied account header or gang announcements.
    const entry = {key, text:text.slice(text.lastIndexOf('Szczegóły meczu')), updatedAt:now};
    storage.setItem(storageKey, JSON.stringify([...history.filter(m => m.key !== key), entry]));
    return {data, updated:Boolean(previous)};
  }
  function readHistory(storage) {
    const raw = storage.getItem(storageKey);
    if (!raw) return [];
    const history = JSON.parse(raw);
    if (!Array.isArray(history) || history.some(m => !m || typeof m.text !== 'string' || m.key !== matchKey(parse(m.text)))) throw Error('Nie można odczytać historii. Dotychczasowe dane nie zostały nadpisane.');
    return history;
  }
  const sortKeys = ['name','attacks','defenses','attackXP','defenseXP','xp'];
  function sortPlayers(players, field = 'xp', direction = 'desc') {
    const column = sortKeys.includes(field) ? field : 'xp';
    const sign = direction === 'asc' ? 1 : -1;
    return [...players].sort((a,b) => sign * (column === 'name' ? a.name.localeCompare(b.name,'pl') : a[column]-b[column]) || a.name.localeCompare(b.name,'pl'));
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {parse, matchKey, saveMatch, readHistory, sortPlayers};
  if (typeof document === 'undefined') return;
  const init = () => {
    const button = document.getElementById('league-parse');
    if (!button) return;
    const result = document.getElementById('league-result');
    const historySelect = document.getElementById('league-history');
    const status = document.getElementById('league-status');
    const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const signed = n => n > 0 ? '+' + n : String(n);
    let selectedGang = '', currentReport = null;
    let sortField = 'xp', sortDirection = 'desc';
    const sortLabels = {name:'Gracz',attacks:'Ataki',defenses:'Obrony',attackXP:'XP atak',defenseXP:'XP obrona',xp:'Bilans XP'};
    const sortButton = field => `<button type="button" data-league-sort="${field}" aria-label="${sortLabels[field]} — sortuj ${sortField===field&&sortDirection==='desc'?'rosnąco':'malejąco'}" class="${sortField===field?'active':''}">${sortLabels[field]} <span aria-hidden="true">${sortField===field?(sortDirection==='desc'?'↓':'↑'):'↕'}</span></button>`;
    const sortAria = field => sortField===field?(sortDirection==='desc'?'descending':'ascending'):'none';
    const tone = n => n > 0 ? 'positive' : n < 0 ? 'negative' : 'neutral';
    function render(data) {
      const gangs = [data.gangA,data.gangB];
      if (gangs[1].trim().toLocaleLowerCase('pl') === 'dupkapupka') gangs.reverse();
      const newMatch = !currentReport || matchKey(currentReport)!==matchKey(data);
      currentReport = data;
      if (newMatch || !gangs.includes(selectedGang)) selectedGang = gangs[0];
      const leftXP = gangs[0]===data.gangA ? data.xp : -data.xp;
      const pending = data.fights.filter(f=>f.pending).length;
      const rows = sortPlayers(data.players.filter(p=>p.gang===selectedGang),sortField,sortDirection);
      const total = key => rows.reduce((sum,p)=>sum+p[key],0);
      const win = total('attackWins')+total('defenseWins'), loss = total('attackLosses')+total('defenseLosses');
      const teamXP = selectedGang===data.gangA ? data.xp : -data.xp;
      result.innerHTML = `
        <div class="league-scoreboard">
          <div class="league-eyebrow">LIGA MENELI <span>${escape(data.date.split('-').reverse().join('.'))}</span></div>
          <div class="league-scoreline">
            <div><strong>${escape(gangs[0])}</strong><b class="${tone(leftXP)}">${signed(leftXP)} <small>XP</small></b></div>
            <span class="league-versus">VS</span>
            <div><strong>${escape(gangs[1])}</strong><b class="${tone(-leftXP)}">${signed(-leftXP)} <small>XP</small></b></div>
          </div>
          <div class="league-score-foot"><span>${data.fights.length} walk  ·  ${data.fights.length-pending} rozstrzygniętych</span><span class="league-live">${pending} w toku</span></div>
        </div>
        ${data.warnings.map(w=>`<p class="league-warning" role="alert">${escape(w)}</p>`).join('')}
        <div class="league-team-tabs" role="group" aria-label="Wybierz gang">${gangs.map(g=>`<button type="button" data-league-team="${escape(g)}" aria-pressed="${g===selectedGang}" class="${g===selectedGang?'active':''}">${escape(g)}</button>`).join('')}</div>
        <div class="league-metrics">
          <div><span>Rozpoczęte ataki</span><strong>${total('attacks')}</strong><small>${total('pendingAttack')} w toku</small></div>
          <div><span>Wygrane / przegrane</span><strong>${win} <i>/</i> ${loss}</strong><small>ataki i obrony</small></div>
          <div><span>Bilans gangu</span><strong class="${tone(teamXP)}">${signed(teamXP)}</strong><small>XP z rozstrzygniętych walk</small></div>
        </div>
        <div class="league-mobile-sort" role="group" aria-label="Sortowanie graczy">${sortKeys.map(sortButton).join('')}</div>
        <div class="league-table-wrap"><table class="league-table">
          <thead><tr><th aria-sort="${sortAria('name')}">${sortButton('name')}</th><th aria-sort="${sortAria('attacks')}">${sortButton('attacks')}</th><th aria-sort="${sortAria('defenses')}">${sortButton('defenses')}</th><th aria-sort="${sortField==='attackXP'||sortField==='defenseXP'?sortAria(sortField):'none'}">${sortButton('attackXP')} / ${sortButton('defenseXP')}</th><th aria-sort="${sortAria('xp')}">${sortButton('xp')}</th></tr></thead>
          <tbody>${rows.map((p,index)=>`<tr>
            <td class="league-player"><span class="league-rank">${index+1}</span><strong>${escape(p.name)}${p.noMatchData?'<small>Brak walk w raporcie</small>':''}</strong></td>
            <td data-label="Ataki"><b>${p.attacks}</b><small><span class="positive">${p.attackWins} W</span> / <span class="negative">${p.attackLosses} P</span>${p.pendingAttack?` · ${p.pendingAttack} w toku`:''}</small></td>
            <td data-label="Obrony"><b>${p.defenses}</b><small><span class="positive">${p.defenseWins} W</span> / <span class="negative">${p.defenseLosses} P</span>${p.pendingDefense?` · ${p.pendingDefense} w toku`:''}</small></td>
            <td class="league-xp-split" data-label="XP atak / obrona"><span class="${tone(p.attackXP)}">${signed(p.attackXP)}</span><span class="${tone(p.defenseXP)}">${signed(p.defenseXP)}</span></td>
            <td class="league-net" data-label="Bilans XP"><b class="${tone(p.xp)}">${signed(p.xp)}</b></td>
          </tr>`).join('')}</tbody></table></div>
        <p class="league-caption">${rows.length} graczy · W = wygrane, P = przegrane. Ataki i obrony obejmują próby w toku. Sortowanie: ${sortLabels[sortField]}, ${sortDirection==='desc'?'malejąco':'rosnąco'}. ${(data.rosterNotes||[]).map(escape).join(' ')}</p>`;
    }
    result.onclick = event => {
      const sort = event.target.closest('[data-league-sort]');
      if (sort && currentReport && sortKeys.includes(sort.dataset.leagueSort)) {
        const field = sort.dataset.leagueSort;
        sortDirection = sortField===field && sortDirection==='desc' ? 'asc' : 'desc';
        sortField = field;
        render(currentReport);
        result.querySelector?.(`[data-league-sort="${field}"]`)?.focus({preventScroll:true});
        return;
      }
      const tab = event.target.closest('[data-league-team]');
      if (tab && currentReport) { selectedGang = tab.dataset.leagueTeam; render(currentReport); }
    };
    let request = null, admin = false, syncAllowed = false, syncRequest = null, syncIdentity = '';
    const targetBox = document.getElementById('league-targets');
    let targetData = null, targetGang = '', targetPlayer = '';
    const analysisDetails = a => !a ? '' : `<p class="league-caption">${a.commonOpponents} wspólnych rywali · ${a.independentPeers} niezależnych podobnych graczy · ${a.independentEvidence} unikalnych walk. Powtórzone powiązania nie są nowymi dowodami.</p>
      ${(a.reasons||[]).map(reason=>`<p class="league-caption">${escape(reason)}</p>`).join('')}
      ${(a.peers||[]).length?`<p class="league-caption"><b>Podobni gracze</b></p>${a.peers.map(p=>`<div class="league-target-proof"><b>${escape(p.name)} · ${p.commonOpponents} wspólnych rywali</b><span>Przeciw celowi: ataki ${p.attackWins} W / ${p.attackLosses} P; obrony ${p.defenseWins} W / ${p.defenses-p.defenseWins} P.</span></div>`).join('')}`:''}
      ${(a.common||[]).length?`<p class="league-caption"><b>Wspólni przeciwnicy</b></p>${a.common.map(p=>`<div class="league-target-proof"><b>${escape(p.name)} · ${p.role==='attack'?'porównanie ataków':'porównanie obron'}</b><span>${p.advantage>.1?'Twoje wyniki lepsze':p.advantage<-.1?'Wyniki celu lepsze':'Podobne wyniki'}.</span></div>`).join('')}`:''}
      ${a.profile?`<p class="league-caption"><b>Profil celu (14 dni)</b>: ataki ${a.profile.attackWins} W / ${a.profile.attackLosses} P; obrony ${a.profile.defenseWins} W / ${a.profile.defenseLosses} P. ${a.profile.distinctAttackers} różnych atakujących.</p>`:''}
      ${(a.profile?.opponents||[]).length?`<p class="league-caption">Kontekst rywali celu — ich pozostałe walki, bez Ciebie i celu: ${a.profile.opponents.map(p=>`${escape(p.name)} (${p.wins} W / ${p.losses} P)`).join(', ')}. To nie jest wspólna skala siły.</p>`:''}`;
    function renderTargets() {
      const d = targetData;
      if (!d) return;
      if (!d.opponents.includes(targetGang)) targetGang = d.opponents[0] || '';
      const rows = d.targets.filter(p=>p.gang===targetGang);
      targetBox.innerHTML = `<header class="league-target-head"><div><span class="league-beta">TEST</span><h3>Cele do ataku</h3><p>Dla: <b>${escape(d.player)}</b> · ${escape(d.asOf)}</p></div></header>
        <div class="league-target-controls">${d.admin?`<label>Gracz<select data-target-player>${d.players.map(p=>`<option ${p===d.player?'selected':''}>${escape(p)}</option>`).join('')}</select></label>`:''}
        <label>Gang przeciwnika<select data-target-gang>${d.opponents.map(g=>`<option ${g===targetGang?'selected':''}>${escape(g)}</option>`).join('')}</select></label></div>
        <p class="league-caption">${escape(d.note)}</p>
        ${rows.length?`<div class="league-target-list">${rows.map(p=>`<article class="league-target-card ${escape(p.category)}"><div class="league-target-top"><strong>${escape(p.name)}</strong><span class="league-target-tag">${escape(p.label)}</span></div>
          <div class="league-target-stats"><b>Wygrana: ${p.lastXP?'+'+p.lastXP.value+' XP':'brak danych'}</b><span>Porażka ${escape(d.player)}: ${p.lossXP?'−'+p.lossXP.value+' XP':'brak danych'}</span><span>${p.sampleDate?`${p.wins} W / ${p.losses} P · ${escape(p.sampleDate)}`:'Brak świeżej próbki własnych walk'}</span></div>
          <p>${escape(p.reason)}</p><small>${p.lastXP?`Wygrana: stawka celu z ${escape(p.lastXP.date)}. `:''}${p.lossXP?`Porażka: stawka ${escape(d.player)} z ${escape(p.lossXP.date)}. `:''}To wartości zaobserwowane, nie aktualny podgląd gry.</small>
          ${p.analysis?`<p class="league-caption"><b>${escape(p.analysis.confidenceLabel)}</b> · ${escape({favorable:'Korzystne wskazówki',unfavorable:'Niekorzystne wskazówki',mixed:'Niejednoznaczne wskazówki',unknown:'Brak osobistego porównania'}[p.analysis.favorability]||'Brak oceny')}</p><details><summary>Analiza profilu i pewność</summary>${analysisDetails(p.analysis)}${(p.analysis.proofs||[]).map(f=>`<div class="league-target-proof"><span>${escape(f.date)} · ${escape(f.time)}</span><b>${escape(f.attacker)} → ${escape(f.defender)}</b><span>Wygrywa ${escape(f.winner)}</span></div>`).join('')}<p class="league-caption">Pewność opisuje jakość danych, nie szansę wygranej.</p></details>`:''}
          ${p.evidence.length?`<details><summary>Dowody (${p.totalEvidence})</summary>${Number.isFinite(p.evidenceTotal)?`<p class="league-caption">${p.evidenceKind==='direct'?`Suma wag własnych walk: ${Number(p.weightedWins).toLocaleString('pl-PL')} W / ${Number(p.weightedLosses).toLocaleString('pl-PL')} P`:`Pomocnicza suma wag powiązań: ${Number(p.evidenceTotal).toLocaleString('pl-PL')}`}. To nie jest szansa wygranej.</p>`:''}${p.evidence.map(f=>`<div class="league-target-proof"><span>${escape(f.date)} · ${escape(f.time)}${Number.isFinite(f.weight)?` · waga dowodu ${Math.round(f.weight*100)}%`:''}</span><b>${escape(f.attacker)} → ${escape(f.defender)}</b><span>Wygrywa ${escape(f.winner)}</span></div>`).join('')}${p.totalEvidence>p.evidence.length?'<small>Pokazano 6 najnowszych walk.</small>':''}</details>`:''}</article>`).join('')}</div>${rows.length>6?`<button type="button" data-target-expand>Pokaż pozostałe cele (${rows.length-6})</button>`:''}`:'<p class="league-caption">Brak kandydatów — potrzebny raport z udziałem tego gracza.</p>'}`;
    }
    async function loadTargets() {
      targetBox.textContent = 'Szukam celów w zapisanych raportach…';
      try {
        targetData = await request('/gang/league/targets'+(targetPlayer?'?player='+encodeURIComponent(targetPlayer):''));
        renderTargets();
      } catch(e) { targetBox.textContent = 'Nie udało się wczytać celów: '+e.message; }
    }
    targetBox.onchange = event => {
      targetBox.classList?.remove('league-targets-expanded');
      if (event.target.matches('[data-target-player]')) { targetPlayer=event.target.value; loadTargets(); }
      if (event.target.matches('[data-target-gang]')) { targetGang=event.target.value; renderTargets(); }
    };
    targetBox.onclick = event => {
      if (event.target.matches('[data-target-expand]')) {
        const expanded=targetBox.classList.toggle('league-targets-expanded');
        event.target.textContent=expanded?'Pokaż tylko 6 celów':'Pokaż pozostałe cele';
      }
    };
    function applyPermissions(value,tier=0) {
      admin = Boolean(value);
      document.getElementById('league-import-panel').hidden = !admin;
      button.disabled = !admin;
    }
    async function refreshHistory(selected) {
      const payload = await request('/gang/league');
      applyPermissions(payload.permissions?.admin,payload.permissions?.adminTier);
      const history = payload.matches || [];
      historySelect.innerHTML = '<option value="">Wybierz zapisany mecz…</option>' + history.map(m=>`<option value="${escape(m.id)}">${escape(m.date)} · ${escape(m.gangA)} / ${escape(m.gangB)} · ${m.fightCount} walk</option>`).join('');
      historySelect.value = selected || history[0]?.id || '';
      if (historySelect.value) await loadSelected();
      else { result.textContent = 'Nie zapisano jeszcze żadnego meczu.'; status.textContent = admin ? 'Wklej pierwszy raport meczu.' : 'Administrator nie wgrał jeszcze raportu.'; }
      await loadTargets();
    }
    async function loadSelected() {
      if (!historySelect.value) return;
      const payload = await request('/gang/league?match=' + encodeURIComponent(historySelect.value));
      render(payload.data);
      status.textContent = 'Ostatni import: ' + new Date(payload.updatedAt).toLocaleString('pl-PL') + ' · ' + payload.updatedBy;
    }
    button.onclick = async () => {
      if (!admin || !request) return;
      button.disabled = true;
      try {
        const text = document.getElementById('league-input').value;
        const preview = parse(text);
        if (preview.warnings.length) throw Error(preview.warnings.join(' '));
        status.textContent = 'Zapisuję wspólny raport…';
        const saved = await request('/admin/gang/league/import', {method:'POST',body:{text}});
        await refreshHistory(saved.id);
        document.getElementById('league-input').value = '';
      } catch(e) { status.textContent = 'Nie zapisano meczu. ' + e.message; if (e.status===401 || e.status===403) applyPermissions(false); }
      finally { button.disabled = !admin; }
    };
    document.getElementById('league-roster-save').onclick = async () => {
      if(!admin||!request)return;
      const control=document.getElementById('league-roster-save');control.disabled=true;
      try {
        const saved=await request('/admin/gang/league/roster',{method:'POST',body:{gang:document.getElementById('league-roster-gang').value,text:document.getElementById('league-roster-text').value}});
        await refreshHistory(historySelect.value);
        status.textContent=`Zapisano skład ${saved.gang}: ${saved.count} graczy. Tabela uzupełniona o osoby bez walk.`;
      } catch(e) {status.textContent='Nie zapisano składu. '+e.message;}
      finally {control.disabled=false;}
    };
    const syncStatus=document.getElementById('league-sync-status'),syncToken=document.getElementById('league-sync-token'),syncCopy=document.getElementById('league-sync-copy');
    window.LeagueSyncPanel={configure(api,account){
      syncAllowed=Boolean(account?.admin&&Number(account.adminTier)>=2);
      syncRequest=syncAllowed?api:null;
      document.getElementById('league-sync-panel').hidden=!syncAllowed;
      const identity=syncAllowed?String(account.nick||'')+':'+account.adminTier:'';
      if(identity!==syncIdentity||!syncAllowed){syncToken.value='';syncToken.type='password';syncToken.hidden=true;syncCopy.hidden=true;syncStatus.textContent='';}
      syncIdentity=identity;
    }};
    window.LeagueSyncPanel.configure(null,null);
    document.getElementById('league-sync-create').onclick=async()=>{
      if(!syncAllowed||!syncRequest)return;
      if(!window.confirm('Wygenerować klucz? Poprzedni klucz synchronizacji Twojego konta przestanie działać.'))return;
      const control=document.getElementById('league-sync-create');control.disabled=true;
      try{
        const payload=await syncRequest('/admin/gang/league/sync-key',{method:'POST',body:{payments:Boolean(document.getElementById('sync-payments-allow').checked),aiDump:Boolean(document.getElementById('sync-ai-dump-allow').checked)}});
        syncToken.value=payload.token;syncToken.hidden=false;syncCopy.hidden=false;
        syncStatus.textContent='Zakres: '+String(payload.scope||'league').split(',').map(s=>({league:'Liga',payments:'Wpłaty',ai_dump:'Wysypisko AI',company:'Spółka'}[s]||s)).join(' + ')+'. Klucz ważny do '+new Date(payload.expiresAt).toLocaleString('pl-PL')+'. Skopiuj go teraz do skryptu; nie zapisujemy jego jawnej postaci w historii.';
      }catch(e){syncStatus.textContent=e.message;}
      finally{control.disabled=false;}
    };
    syncCopy.onclick=async()=>{
      if(!syncAllowed)return;
      try{await navigator.clipboard.writeText(syncToken.value);syncStatus.textContent='Skopiowano klucz. Wklej go w panelu skryptu w grze.';}
      catch(_){syncToken.type='text';syncToken.select();syncStatus.textContent='Skopiuj zaznaczony klucz ręcznie (Ctrl+C).';}
    };
    document.getElementById('league-sync-revoke').onclick=async()=>{
      if(!syncAllowed||!syncRequest)return;
      try{await syncRequest('/admin/gang/league/sync-key/revoke',{method:'POST',body:{}});syncToken.value='';syncToken.hidden=true;syncCopy.hidden=true;syncStatus.textContent='Twój klucz synchronizacji został unieważniony.';}
      catch(e){syncStatus.textContent=e.message;}
    };
    historySelect.onchange = () => loadSelected().catch(e=>{status.textContent=e.message;});
    window.LeagueView = {
      async open(api) {
        request = api;
        targetPlayer = '';
        targetData = null;
        targetBox.textContent = '';
        applyPermissions(false);
        result.textContent = '';
        historySelect.innerHTML = '<option value="">Ładowanie historii…</option>';
        status.textContent = 'Pobieram wspólne wyniki…';
        try { await refreshHistory(); }
        catch(e) { status.textContent = 'Nie udało się pobrać wyników. ' + e.message; }
      }
    };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
