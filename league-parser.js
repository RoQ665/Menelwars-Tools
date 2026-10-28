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
  const sortKeys = ['name','attacks','defenses','attackXP','defenseXP','xp','recommendation'];
  function sortPlayers(players, field = 'xp', direction = 'desc') {
    const column = sortKeys.includes(field) ? field : 'xp';
    const sign = direction === 'asc' ? 1 : -1;
    return [...players].sort((a,b) => {
      if(column==='recommendation'||column==='certainty'){
        const av=a[column],bv=b[column];
        if(!Number.isFinite(av)||!Number.isFinite(bv))return Number(!Number.isFinite(av))-Number(!Number.isFinite(bv))||a.name.localeCompare(b.name,'pl');
      }
      return sign*(column==='name'?a.name.localeCompare(b.name,'pl'):a[column]-b[column])||a.name.localeCompare(b.name,'pl');
    });
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
    const sortLabels = {name:'Gracz',attacks:'Ataki',defenses:'Obrony',attackXP:'XP atak',defenseXP:'XP obrona',xp:'Bilans XP',recommendation:'Rekomendacja silnika'};
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
      const showRatings=Boolean(viewerData?.ownGang&&selectedGang!==viewerData.ownGang);
      if(!showRatings&&['recommendation','certainty'].includes(sortField)){sortField='xp';sortDirection='desc';}
      const normalize=n=>String(n||'').normalize('NFKC').trim().toLocaleLowerCase('pl');
      const personal=new Map((viewerData?.targets||[]).map(t=>[JSON.stringify([t.gang,normalize(t.name)]),t]));
      const rows = sortPlayers(data.players.filter(p=>p.gang===selectedGang).map(p=>{
        const t=showRatings?personal.get(JSON.stringify([p.gang,normalize(p.name)])):null;
        return {...p,personal:t,recommendation:t?.rating?.value??null,certainty:t?.rating?.value==null?null:({low:0,medium:1,high:2}[t.analysis?.confidence]??null)};
      }),sortField,sortDirection);
      const total = key => rows.reduce((sum,p)=>sum+p[key],0);
      const win = total('attackWins')+total('defenseWins'), loss = total('attackLosses')+total('defenseLosses');
      const teamXP = selectedGang===data.gangA ? data.xp : -data.xp;
      const ourGang=gangs.find(g=>normalize(g)===normalize(viewerData?.ownGang||'Dupkapupka'));
      const contributors=ourGang?sortPlayers(data.players.filter(p=>p.gang===ourGang&&Number.isFinite(p.xp)&&p.xp>0),'xp','desc'):[];
      const leaders=contributors.slice(0,3).map((p,i)=>({...p,place:contributors.findIndex(q=>q.xp===p.xp)+1,slot:i+1}));
      const tiedOutside=leaders.length===3?contributors.slice(3).filter(p=>p.xp===leaders[2].xp).length:0;
      const podium=leaders.length?`<section class="league-podium" aria-label="Największy dodatni wkład XP gangu ${escape(ourGang)}"><header><div><span class="league-podium-kicker">WYRÓŻNIENIA EKIPY</span><h3>Największy wkład w mecz</h3></div><span>${escape(ourGang)}</span></header><div class="league-podium-places">${leaders.map(p=>`<div class="league-podium-place slot-${p.slot}"><span class="league-podium-medal" aria-label="Miejsce ${p.place}">${p.place===1?'♛':p.place===2?'◆':'✦'} <small>${p.place}</small></span><strong>${escape(p.name)}</strong><b>+${Number(p.xp).toLocaleString('pl-PL')} <small>XP</small></b><span class="league-podium-step">${p.place===1?'ZŁOTO':p.place===2?'SREBRO':'BRĄZ'}</span></div>`).join('')}</div><p>Bilans XP z rozstrzygniętych ataków i obron · według ostatniego importu.${pending?' Mecz ma trwające walki — kolejność może się zmienić.':''}${tiedOutside?` Jeszcze ${tiedOutside} graczy ma bilans równy ostatniemu pokazanemu miejscu.`:''}${leaders.some((p,i)=>i&&p.place===leaders[i-1].place)?' Równy bilans oznacza miejsce ex aequo.':''}</p></section>`:'';
      result.innerHTML = `
        <div class="league-scoreboard">
          <div class="league-eyebrow">LIGA MENELI <span>${escape(data.date.split('-').reverse().join('.'))}</span></div>
          <div class="league-scoreline">
            <div><strong>${escape(gangs[0])}</strong><b class="${tone(leftXP)}">${signed(leftXP)} <small>XP</small></b></div>
            <span class="league-versus">VS</span>
            <div><strong>${escape(gangs[1])}</strong><b class="${tone(-leftXP)}">${signed(-leftXP)} <small>XP</small></b></div>
          </div>
          ${podium}
          <div class="league-score-foot"><span>${data.fights.length} walk  ·  ${data.fights.length-pending} rozstrzygniętych</span><span class="league-live">${pending} w toku</span></div>
        </div>
        ${data.warnings.map(w=>`<p class="league-warning" role="alert">${escape(w)}</p>`).join('')}
        <div class="league-team-tabs" role="group" aria-label="Wybierz gang">${gangs.map(g=>`<button type="button" data-league-team="${escape(g)}" aria-pressed="${g===selectedGang}" class="${g===selectedGang?'active':''}">${escape(g)}</button>`).join('')}</div>
        <div class="league-metrics">
          <div><span>Rozpoczęte ataki</span><strong>${total('attacks')}</strong><small>${total('pendingAttack')} w toku</small></div>
          <div><span>Wygrane / przegrane</span><strong>${win} <i>/</i> ${loss}</strong><small>ataki i obrony</small></div>
          <div><span>Bilans gangu</span><strong class="${tone(teamXP)}">${signed(teamXP)}</strong><small>XP z rozstrzygniętych walk</small></div>
        </div>
        <div class="league-mobile-sort" role="group" aria-label="Sortowanie graczy">${sortKeys.filter(k=>showRatings||!['recommendation','certainty'].includes(k)).map(sortButton).join('')}</div>
        <div class="league-table-wrap"><table class="league-table">
          <thead><tr><th aria-sort="${sortAria('name')}">${sortButton('name')}</th><th aria-sort="${sortAria('attacks')}">${sortButton('attacks')}</th><th aria-sort="${sortAria('defenses')}">${sortButton('defenses')}</th><th aria-sort="${sortField==='attackXP'||sortField==='defenseXP'?sortAria(sortField):'none'}">${sortButton('attackXP')} / ${sortButton('defenseXP')}</th><th aria-sort="${sortAria('xp')}">${sortButton('xp')}</th>${showRatings?`<th aria-sort="${sortAria('recommendation')}">${sortButton('recommendation')}</th>`:''}</tr></thead>
          <tbody>${rows.map((p,index)=>`<tr>
            <td class="league-player"><span class="league-rank">${index+1}</span><strong>${escape(p.name)}${p.noMatchData?'<small>Brak walk w raporcie</small>':''}</strong></td>
            <td data-label="Ataki"><b>${p.attacks}</b><small><span class="positive">${p.attackWins} W</span> / <span class="negative">${p.attackLosses} P</span>${p.pendingAttack?` · ${p.pendingAttack} w toku`:''}</small></td>
            <td data-label="Obrony"><b>${p.defenses}</b><small><span class="positive">${p.defenseWins} W</span> / <span class="negative">${p.defenseLosses} P</span>${p.pendingDefense?` · ${p.pendingDefense} w toku`:''}</small></td>
            <td class="league-xp-split" data-label="XP atak / obrona"><span class="${tone(p.attackXP)}">${signed(p.attackXP)}</span><span class="${tone(p.defenseXP)}">${signed(p.defenseXP)}</span></td>
            <td class="league-net" data-label="Bilans XP"><b class="${tone(p.xp)}">${signed(p.xp)}</b></td>
            ${showRatings?`<td data-label="Rekomendacja silnika">${Number.isFinite(p.recommendation)?`<button type="button" class="league-score-chip league-rating band-${Math.floor(p.recommendation/10)}" data-league-target="${viewerData.targets.indexOf(p.personal)}" aria-label="Analiza ${escape(p.name)} dla ${escape(viewerData.player)}">${p.recommendation}%</button>`:'<small>Brak oceny</small>'}</td>`:''}
          </tr>`).join('')}</tbody></table></div>
        <p class="league-caption">${rows.length} graczy · W = wygrane, P = przegrane. Ataki i obrony obejmują próby w toku. Sortowanie: ${sortLabels[sortField]}, ${sortDirection==='desc'?'malejąco':'rosnąco'}. ${(data.rosterNotes||[]).map(escape).join(' ')}</p>${showRatings?`<p class="league-caption">Oceny dla: <b>${escape(viewerData.player)}</b> · stan na ${escape(viewerData.asOf)} (również przy oglądaniu dawnych meczów). Rekomendacja silnika łączy wyniki, pewność i XP — nie jest szansą wygranej. Kliknij procent, aby zobaczyć składniki i uzasadnienie.</p>`:''}`;
    }
    result.onclick = event => {
      const score=event.target.closest('[data-league-target]');
      if(score&&viewerData){
        const t=viewerData.targets[Number(score.dataset.leagueTarget)];
        if(t){
          const dialog=document.getElementById('league-target-dialog');
          dialog.innerHTML=`<button type="button" data-league-dialog-close>Zamknij</button><h3>${escape(t.name)} — dla ${escape(viewerData.player)}</h3>${ratingView(t.rating)}<p>Pewność danych: <b>${escape(t.analysis?.confidenceLabel||'Brak danych')}</b></p>${analysisDetails(t.analysis)}`;
          if(dialog.showModal)dialog.showModal();else dialog.hidden=false;
        }
        return;
      }
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
    let targetData = null, viewerData = null, targetGang = '', targetPlayer = '', targetRequestId=0;
    const dialog=document.getElementById('league-target-dialog');
    let backdropDown=false;
    const outsideDialog=event=>{
      if(event.target!==dialog||!dialog.getBoundingClientRect)return false;
      const r=dialog.getBoundingClientRect();
      return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;
    };
    dialog.onpointerdown=event=>{backdropDown=outsideDialog(event);};
    dialog.onclick=event=>{
      const close=event.target.closest?.('[data-league-dialog-close]')||(backdropDown&&outsideDialog(event));
      backdropDown=false;
      if(close){if(dialog.close)dialog.close();else dialog.hidden=true;}
    };
    const ratingView = r => !r ? '' : `<div class="league-rating ${Number.isFinite(r.value)?'band-'+Math.max(0,Math.min(10,Math.floor(r.value/10))):'unknown'}"><div><b>${Number.isFinite(r.value)?Number(r.value)+'%':'Brak oceny'}</b><span>Rekomendacja silnika</span></div>${r.components?`<p class="league-caption">Wyniki walk: ${Number(r.components.strength)} / 100 · pewność danych: ${escape({low:'niska',medium:'średnia',high:'wysoka'}[r.components.confidence]||'brak')} · szacowany XP: ${r.components.xp===null?'brak — opłacalność nieustalona':Number(r.components.xp)}. Punkt odniesienia XP dla tego gangu: ${r.components.maxComparableXP===null?'brak':Number(r.components.maxComparableXP)}.</p>`:''}<small>${escape(r.basis)} To nie jest szansa wygranej. Nawet 100% rekomendacji nie gwarantuje zwycięstwa.</small></div>`;
    const chainView=c=>`<div class="league-target-proof"><b>${c.direction==='positive'?'Za wyborem celu':'Przeciw wyborowi celu'} · ${Number(c.hops)} ogniwa</b><span>${c.route.map(p=>`${escape(p.name)} (${escape(p.gang)})`).join(' → ')}</span><span>Waga po uwzględnieniu wspólnych dowodów: ${Number(c.weight).toLocaleString('pl-PL')} · przed korektą: ${Number(c.rawWeight).toLocaleString('pl-PL')}</span>${c.edges.map(e=>`<span>${escape(e.date)}: ${Number(e.wins)} W / ${Number(e.losses)} P · ${e.winsInAttack?'potwierdzone w ataku':'wyłącznie wygrane obrony — mniejsza waga'}${e.historyConflict?' · starsze wyniki sprzeczne':''}</span>`).join('')}</div>`;
    const analysisDetails = a => !a ? '' : `<p class="league-caption">Ty i cel: ${a.commonOpponents} wspólnych rywali. Uwzględnieni gracze porównawczy: ${a.independentPeers}. Analiza obejmuje ${a.independentEvidence} unikalnych walk w całej sieci porównań — nie tylko przeciw temu celowi. Podobieństwo wyników nie oznacza identycznej siły ani buildu.</p>
      ${a.personalSeries?.date?`<p class="league-caption"><b>Twoje bezpośrednie ataki z ${escape(a.personalSeries.date)}:</b> ${Number(a.personalSeries.attackWins)} W / ${Number(a.personalSeries.attackLosses)} P.</p>`:''}
      ${a.confidenceReason?`<p class="league-caption"><b>Pewność danych:</b> ${escape(a.confidenceReason)}</p>`:''}
      ${(a.reasons||[]).map(reason=>`<p class="league-caption">${escape(reason)}</p>`).join('')}
      ${(a.chains||[]).length?`<p class="league-caption"><b>Łańcuchy wyników — do 4 walk</b></p><p class="league-caption">Strzałka oznacza wynik serii, nie gwarancję przewagi. Te same walki nie są ponownie liczone.</p>${a.chains.filter(c=>c.weight>=.005).map(chainView).join('')}${a.chains.some(c=>c.weight<.005)?`<details><summary>Powiązania już uwzględnione lub śladowe (${a.chains.filter(c=>c.weight<.005).length})</summary>${a.chains.filter(c=>c.weight<.005).map(c=>`<p class="league-caption">${escape(c.route.map(p=>p.name).join(' → '))}: ${c.weight===0?'nie zwiększa oceny — te walki uwzględniono wcześniej':'śladowy wpływ na ocenę'}.</p>`).join('')}</details>`:''}`:''}
      ${(a.profile?.beaters||[]).length?`<p class="league-caption"><b>Kto pokonywał cel dziś i wczoraj?</b></p>${a.profile.beaters.map(p=>`<div class="league-target-proof"><b>${escape(p.name)} · ${p.wins} W / ${p.losses} P w ataku</b><span>${escape(p.dates.join(', '))} · ${p.relation==='self'?'Twoja bezpośrednia wygrana':p.relation==='similar'?'podobne wyniki do Twoich':p.relation==='weaker'?'słabsze wyniki na wspólnych rywalach':'brak dostatecznego porównania z Tobą'}</span></div>`).join('')}`:''}
      ${(a.peers||[]).length?`<p class="league-caption"><b>Porównywalni gracze</b></p>${a.peers.map(p=>`<div class="league-target-proof"><b>${escape(p.name)} · ${p.commonOpponents} wspólnych rywali</b><span>Przeciw celowi: ataki ${p.attackWins} W / ${p.attackLosses} P; obrony ${p.defenseWins} W / ${p.defenses-p.defenseWins} P.</span></div>`).join('')}`:''}
      ${(a.common||[]).length?`<p class="league-caption"><b>Wspólni przeciwnicy — Ty i cel</b></p>${a.common.map(p=>`<div class="league-target-proof"><b>${escape(p.name)} · ${p.role==='attack'?'porównanie ataków':'porównanie obron'}</b><span>${p.advantage>.1?'Twoje wyniki lepsze':p.advantage<-.1?'Wyniki celu lepsze':'Podobne wyniki — brak rozstrzygnięcia przewagi'}.</span></div>`).join('')}`:''}
      ${a.profile?`<p class="league-caption"><b>Profil celu (14 dni)</b>: ataki ${a.profile.attackWins} W / ${a.profile.attackLosses} P; obrony ${a.profile.defenseWins} W / ${a.profile.defenseLosses} P. ${a.profile.distinctAttackers} różnych atakujących.</p>`:''}
      ${(a.profile?.opponents||[]).length?`<p class="league-caption">Kontekst rywali celu — ich pozostałe walki, bez Ciebie i celu: ${a.profile.opponents.map(p=>`${escape(p.name)} (${p.wins} W / ${p.losses} P)`).join(', ')}. To nie jest wspólna skala siły.</p>`:''}`;
    function renderTargets() {
      const d = targetData;
      if(!admin){targetBox.innerHTML='';return;}
      if (!d) return;
      if (!d.opponents.includes(targetGang)) targetGang = d.opponents[0] || '';
      const rows = d.targets.filter(p=>p.gang===targetGang);
      targetBox.innerHTML = `<header class="league-target-head"><div><span class="league-beta">TEST</span><h3>Cele do ataku</h3><p>Dla: <b>${escape(d.player)}</b> · ${escape(d.asOf)}</p></div></header>
        <div class="league-target-controls">${d.admin?`<label>Gracz<select data-target-player>${d.players.map(p=>`<option ${p===d.player?'selected':''}>${escape(p)}</option>`).join('')}</select></label>`:''}
        <label>Gang przeciwnika<select data-target-gang>${d.opponents.map(g=>`<option ${g===targetGang?'selected':''}>${escape(g)}</option>`).join('')}</select></label></div>
        ${d.dataCoverage?`<p class="league-caption">Analizowane dane: ${Number(d.dataCoverage.fights)} zakończonych walk · ${Number(d.dataCoverage.players)} graczy · ${Number(d.dataCoverage.gangs)} gangów · ostatnie 14 dni.</p>`:''}<details><summary>Jak działa ocena?</summary><p class="league-caption">${escape(d.note)}</p></details>
        ${rows.length?`<div class="league-target-list">${rows.map(p=>`<article class="league-target-card ${escape(p.category)}"><div class="league-target-top"><strong>${escape(p.name)}</strong>${p.rating?'':`<span class="league-target-tag">${escape(p.label)}</span>`}</div>${ratingView(p.rating)}
          <div class="league-target-stats"><b>${p.lastXP?.source==='opponents'?'Szacowana wygrana':'Wygrana'}: ${p.lastXP?'+'+p.lastXP.value+' XP':'brak danych'}</b><span>Porażka ${escape(d.player)}: ${p.lossXP?'−'+p.lossXP.value+' XP':'brak danych'}</span><span>${p.sampleDate?`${p.wins} W / ${p.losses} P · ${escape(p.sampleDate)}`:'Brak świeżej próbki własnych walk'}</span>${p.prestige?`<span>Prestiż: ${Number(p.prestige.value).toLocaleString('pl-PL')} · ${escape(p.prestige.date)} · tylko pomocniczo</span>`:''}</div>
          <p>${escape(p.reason)}</p>${p.analysis?.profile?.beaters?.length?`<p class="league-caption">Dziś i wczoraj pokonali: ${p.analysis.profile.beaters.slice(0,4).map(b=>`${escape(b.name)} (${Number(b.wins)}×)`).join(', ')}${p.analysis.profile.beaters.length>4?' i inni':''}.</p>`:''}<small>${p.lastXP?`Wygrana: ${p.lastXP.source==='opponents'?'szacunek z listy rywali':'stawka z walki'} z ${escape(p.lastXP.date)}. `:''}${p.lossXP?`Porażka: stawka ${escape(d.player)} ${p.lossXP.source==='opponents'?'z jego listy rywali ':''}z ${escape(p.lossXP.date)}. `:''}To wartości zaobserwowane, nie aktualny podgląd gry.</small>
          ${p.analysis?`<p class="league-caption">Pewność danych: <b>${escape(p.analysis.confidenceLabel)}</b> · ${escape({favorable:'Korzystne wskazówki',unfavorable:'Niekorzystne wskazówki',mixed:'Niejednoznaczne wskazówki',unknown:'Brak osobistego porównania'}[p.analysis.favorability]||'Brak oceny')}</p><details><summary>Analiza profilu i pewność</summary>${analysisDetails(p.analysis)}${(p.analysis.proofs||[]).map(f=>`<div class="league-target-proof"><span>${escape(f.date)} · ${escape(f.time)}</span><b>${escape(f.attacker)} → ${escape(f.defender)}</b><span>Wygrywa ${escape(f.winner)}</span></div>`).join('')}<p class="league-caption">Pewność opisuje jakość danych, nie szansę wygranej.</p></details>`:''}
          ${p.evidence.length?`<details><summary>${p.evidenceKind==='direct'?'Twoje walki':'Wyniki pośrednie'} (${p.totalEvidence})</summary>${Number.isFinite(p.evidenceTotal)?`<p class="league-caption">${p.evidenceKind==='direct'?`Suma wag własnych walk: ${Number(p.weightedWins).toLocaleString('pl-PL')} W / ${Number(p.weightedLosses).toLocaleString('pl-PL')} P`:`Pomocnicza suma wag powiązań: ${Number(p.evidenceTotal).toLocaleString('pl-PL')}`}. To nie jest szansa wygranej.</p>`:''}${p.evidence.map(f=>`<div class="league-target-proof"><span>${escape(f.date)} · ${escape(f.time)}${Number.isFinite(f.weight)?` · waga dowodu ${Math.round(f.weight*100)}%`:''}</span><b>${escape(f.attacker)} → ${escape(f.defender)}</b><span>Wygrywa ${escape(f.winner)}</span></div>`).join('')}${p.totalEvidence>p.evidence.length?'<small>Pokazano 6 najnowszych walk.</small>':''}</details>`:''}</article>`).join('')}</div>${rows.length>6?`<button type="button" data-target-expand>Pokaż pozostałe cele (${rows.length-6})</button>`:''}`:'<p class="league-caption">Brak kandydatów — potrzebny raport z udziałem tego gracza.</p>'}`;
    }
    async function loadTargets() {
      const requestId=++targetRequestId;
      targetBox.textContent = 'Szukam celów w zapisanych raportach…';
      try {
        const selectedPlayer=targetPlayer;
        const [payload,own]=await Promise.all([
          request('/gang/league/targets'+(selectedPlayer?'?player='+encodeURIComponent(selectedPlayer):'')),
          selectedPlayer&&!viewerData?request('/gang/league/targets'):Promise.resolve(null)
        ]);
        if(requestId!==targetRequestId)return;
        targetData=payload;
        if(!selectedPlayer)viewerData=payload;else if(own)viewerData=own;
        renderTargets();
        if(currentReport)render(currentReport);
      } catch(e) {
        if(requestId!==targetRequestId)return;
        if(!targetPlayer){viewerData=null;if(currentReport)render(currentReport);}
        targetBox.textContent = 'Nie udało się wczytać celów: '+e.message;
      }
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
      document.getElementById('league-target-drawer').hidden=!admin;
      document.getElementById('league-import-panel').hidden = !admin;
      button.disabled = !admin;
    }
    async function refreshHistory(selected) {
      const payload = await request('/gang/league');
      applyPermissions(payload.permissions?.admin,payload.permissions?.adminTier);
      viewerData=null;
      const history = payload.matches || [];
      historySelect.innerHTML = '<option value="">Wybierz zapisany mecz…</option>' + history.map(m=>`<option value="${escape(m.id)}">${escape(m.date)} · ${escape(m.gangA)} / ${escape(m.gangB)} · ${m.fightCount} walk</option>`).join('');
      historySelect.value = selected || history[0]?.id || '';
      if (historySelect.value) await loadSelected();
      else { currentReport=null;result.textContent = 'Nie zapisano jeszcze żadnego meczu.'; status.textContent = admin ? 'Wklej pierwszy raport meczu.' : 'Administrator nie wgrał jeszcze raportu.'; }
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
        if(saved.source==='opponents')targetGang=saved.gang;
        await refreshHistory(historySelect.value);
        status.textContent=saved.merged?`Uzupełniono ${saved.gang}: ${saved.count} rywali, prestiż i szacowane XP. Nie usunięto wcześniejszych członków.`:`Zapisano skład ${saved.gang}: ${saved.count} graczy. Tabela uzupełniona o osoby bez walk.`;
      } catch(e) {status.textContent='Nie zapisano składu. '+e.message;}
      finally {control.disabled=false;}
    };
    const syncStatus=document.getElementById('league-sync-status'),syncToken=document.getElementById('league-sync-token'),syncCopy=document.getElementById('league-sync-copy');
    window.LeagueSyncPanel={configure(api,account){
      syncAllowed=Boolean(account?.admin&&Number(account.adminTier)>=2);
      syncRequest=syncAllowed?api:null;
      document.getElementById('league-sync-panel').hidden=!syncAllowed;
      const identity=syncAllowed?String(account.nick||'')+':'+account.adminTier:'';
      if(identity!==syncIdentity||!syncAllowed){syncToken.value='';syncToken.type='password';syncToken.hidden=true;syncCopy.hidden=true;syncStatus.textContent='';document.getElementById('sync-source-status').textContent='';}
      syncIdentity=identity;
    }};
    window.LeagueSyncPanel.configure(null,null);
    document.getElementById('league-sync-create').onclick=async()=>{
      if(!syncAllowed||!syncRequest)return;
      if(!window.confirm('Wygenerować klucz? Poprzedni klucz synchronizacji Twojego konta przestanie działać.'))return;
      const control=document.getElementById('league-sync-create');control.disabled=true;
      try{
        const payload=await syncRequest('/admin/gang/league/sync-key',{method:'POST',body:{unified:true}});
        syncToken.value=payload.token;syncToken.hidden=false;syncCopy.hidden=false;
        syncStatus.textContent='Zakres: '+String(payload.scope||'league').split(',').map(s=>({league:'Liga',payments:'Wpłaty',ai_dump:'Wysypisko AI',company:'Spółka',market:'Giełda',roster:'Kontrola składu'}[s]||s)).join(' + ')+'. Klucz ważny do '+new Date(payload.expiresAt).toLocaleString('pl-PL')+'. Skopiuj go teraz do skryptu; nie zapisujemy jego jawnej postaci w historii.';
      }catch(e){syncStatus.textContent=e.message;}
      finally{control.disabled=false;}
    };
    syncCopy.onclick=async()=>{
      if(!syncAllowed)return;
      try{await navigator.clipboard.writeText(syncToken.value);syncStatus.textContent='Skopiowano klucz. Wklej go w panelu skryptu w grze.';}
      catch(_){syncToken.type='text';syncToken.select();syncStatus.textContent='Skopiuj zaznaczony klucz ręcznie (Ctrl+C).';}
    };
    document.getElementById('sync-source-refresh').onclick=async()=>{
      const box=document.getElementById('sync-source-status');if(!syncAllowed||!syncRequest)return;const identity=syncIdentity;
      box.textContent='Sprawdzam…';
      try{const result=await syncRequest('/admin/sync/state');if(identity!==syncIdentity||!syncAllowed)return;box.replaceChildren();
        if(!result.sources.length)box.textContent='Brak raportów nowej synchronizacji.';
        for(const source of result.sources){const p=document.createElement('div');p.className='sync-notice';
          const labels={roster:'Skład gangu',company:'Spółka',payments:'Wpłaty',ai_dump:'Wysypisko AI',market:'Giełda'};
          p.textContent=(labels[source.source]||source.source)+' · '+new Date(source.capturedAt).toLocaleString('pl-PL');
          const data=source.data||{},issues=data.issues||data.salaries?.issues||[];
          for(const issue of issues){const line=document.createElement('div');line.textContent=issue.nick+': '+issue.action+(issue.expected!=null?' · oczekiwane '+issue.expected+' zł, w grze '+(issue.actual??'brak'):'');p.append(line);}
          if(source.source==='roster'&&!issues.length)p.append(document.createTextNode(' · skład zgodny'));
          if(data.salaries?.confirmedAt)p.append(document.createTextNode(' · pensje potwierdzone'));
          if(data.historyPages)p.append(document.createTextNode(' · strony historii: '+data.historyPages.received+'/'+data.historyPages.total));
          box.append(p);
        }
      }catch(e){if(identity===syncIdentity&&syncAllowed)box.textContent=e.message;}
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
        viewerData = null;targetRequestId++;
        if(dialog.close)dialog.close();dialog.innerHTML='';
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
