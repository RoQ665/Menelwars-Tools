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
  if (typeof module !== 'undefined' && module.exports) module.exports = {parse, matchKey, saveMatch, readHistory};
  if (typeof document === 'undefined') return;
  const init = () => {
    const button = document.getElementById('league-parse');
    if (!button) return;
    const result = document.getElementById('league-result');
    const historySelect = document.getElementById('league-history');
    const status = document.getElementById('league-status');
    const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const signed = n => n > 0 ? '+' + n : String(n);
    function render(data) {
        result.innerHTML = `<p>${escape(data.gangA)} / ${escape(data.gangB)} · ${data.fights.length} walk · w toku: ${data.fights.filter(f=>f.pending).length} · bilans ${escape(data.gangA)}: ${signed(data.xp)} XP</p>` + data.warnings.map(w=>`<p role="alert">⚠️ ${escape(w)}</p>`).join('') + [data.gangA,data.gangB].map(gang => `<h3>${escape(gang)}</h3><div style="overflow-x:auto"><table><thead><tr><th>Gracz</th><th>Ataki</th><th>Atak W/P</th><th>Obrony W/P</th><th>W toku A/O</th><th>XP atak</th><th>XP obrona</th><th>Bilans XP</th></tr></thead><tbody>${data.players.filter(p=>p.gang===gang).sort((a,b)=>b.xp-a.xp || a.name.localeCompare(b.name,'pl')).map(p=>`<tr><td>${escape(p.name)}</td><td>${p.attacks}</td><td>${p.attackWins}/${p.attackLosses}</td><td>${p.defenseWins}/${p.defenseLosses}</td><td>${p.pendingAttack}/${p.pendingDefense}</td><td>${signed(p.attackXP)}</td><td>${signed(p.defenseXP)}</td><td>${signed(p.xp)}</td></tr>`).join('')}</tbody></table></div>`).join('');
    }
    function refreshHistory(selected) {
      const history = readHistory(localStorage).map(entry => ({...entry, data:parse(entry.text)})).sort((a,b)=>b.data.date.localeCompare(a.data.date) || b.updatedAt.localeCompare(a.updatedAt));
      historySelect.innerHTML = '<option value="">Wybierz zapisany mecz…</option>' + history.map(m=>`<option value="${escape(m.key)}">${escape(m.data.date)} · ${escape(m.data.gangA)} / ${escape(m.data.gangB)} · ${m.data.fights.length} walk</option>`).join('');
      historySelect.value = selected || '';
      return history;
    }
    button.onclick = () => {
      try {
        const saved = saveMatch(localStorage, document.getElementById('league-input').value);
        refreshHistory(matchKey(saved.data));
        render(saved.data);
        status.textContent = `${saved.updated ? 'Zaktualizowano' : 'Zapisano'} mecz z ${saved.data.date}. Historia jest dostępna na tym urządzeniu i w tej przeglądarce.`;
      } catch (e) { status.textContent = 'Nie zapisano meczu. ' + e.message; }
    };
    historySelect.onchange = () => {
      try {
        const entry = readHistory(localStorage).find(m=>m.key===historySelect.value);
        if (entry) { render(parse(entry.text)); status.textContent = 'Ostatni import: ' + new Date(entry.updatedAt).toLocaleString('pl-PL'); }
      } catch(e) { status.textContent = e.message; }
    };
    try {
      const history = refreshHistory();
      if (history.length) { historySelect.value = history[0].key; historySelect.onchange(); }
    } catch(e) { status.textContent = 'Nie można wczytać historii: ' + e.message; }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
