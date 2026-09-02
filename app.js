
(() => {
  "use strict";

  const D = window.ROQ_DATA;
  const PROGRAMS = [1,2,3,4,5];

  // ============================================================
  // WKLEJ TU URL WEB APP Z GOOGLE APPS SCRIPT
  // Musi kończyć się na /exec
  // ============================================================
  const BACKEND_URL = "https://script.google.com/macros/s/AKfycby8rjCO9HuRtQvQvFoF-OkjFhfnfcS1bTIag0V9LCSJykW6c8k5IZVH8K3pSVFH66ZBKQ/exec";

  const STORAGE_KEY = "roq_tools_premium_v1";
  const REMOTE_KEY = "roq_tools_remote_approved_v1";
  const NICK_KEY = "roq_tools_submitter_nick_v1";
  const RESERVATION_OWNER_KEY = "roq_recipe_reservation_owners_v1";
  const COMPANY_SALARY_IDENTITY_KEY = "menelwars_company_salary_identity_v1";
  const PLAYER_IDENTITY_KEY = "menelwars_player_identity_v1";
  const PLAYER_ACCOUNT_SESSION_KEY = "menelwars_player_account_session_v1";
  const GANG_TOKEN_KEY = "menelwars_tools_gang_token_v1";
  const ADMIN_TOKEN_KEY = "menelwars_tools_admin_token_v1";
  const COMPANY_INCOME_KEY = "menelwars_tools_company_income_v1";

  const COMPANY_MIN_CONTRIBUTION = 30000;
  const COMPANY_BASE_SALARY = 160;
  const COMPANY_SALARY_RATIO = 0.50;

  const DISPLAY_NAMES = {
  "Ziemniak irga": 'Ziemniaki "Irga"',
  "Ziemniak vinieta": 'Ziemniaki "Vineta"',
  "Obierki jabłek": "Obierki po jabłkach",
  "Obierki ziemniaków": "Obierki po ziemniakach",
  "Cukier": 'Cukier "Klasyczny"',

  "Instant": 'Drożdże "Instant"',
  "Babuni": "Drożdże Babuni",
  "Klasyczne": "Drożdże klasyczne",
  "Piekarskie": "Drożdże piekarskie",
  "Turbo": "Turbo drożdże",
  "Winiarskie": "Drożdże winiarskie",

  "Górski strumyk": 'Woda "Górski strumyk"',
  "Menel zdrój": 'Woda "Menel Zdrój"'
};

function displayName(name) {
  return DISPLAY_NAMES[name] || name;
}

  const MAP = [
    ["Wilanów", "Agresywny", "⚔️"],
    ["Mokotów", "Przyjacielski", "🤝"],
    ["Ursynów", "Przyjacielski", "🤝"],
    ["Ochota", "Neutralny", "⚪"],
    ["Śródmieście", "Agresywny", "⚔️"],
    ["Bemowo", "Błagalny", "🙏"],
    ["Wola", "Błagalny", "🙏"],
    ["Żoliborz", "Przyjacielski", "🤝"],
    ["Bielany", "Przyjacielski", "🤝"],
    ["Praga", "Błagalny", "🙏"],
    ["Białołęka", "Neutralny", "⚪"],
    ["Targówek", "Błagalny", "🙏"]
  ];

const MAP_POSITIONS = {
  "Bielany":      { x: 28.7, y: 12.2 },
  "Białołęka":    { x: 62.0, y: 16.7 },
  "Żoliborz":     { x: 19.2, y: 29.8 },
  "Targówek":     { x: 81.7, y: 33.6 },
  "Bemowo":       { x: 13.5, y: 47.7 },
  "Śródmieście":  { x: 46.8, y: 48.9 },
  "Praga":        { x: 86.1, y: 55.2 },
  "Wola":         { x: 22.0, y: 61.4 },
  "Ochota":       { x: 20.2, y: 75.9 },
  "Mokotów":      { x: 50.8, y: 73.3 },
  "Wilanów":      { x: 77.9, y: 80.9 },
  "Ursynów":      { x: 39.6, y: 92.4 }
};

const MAP_ROUTE_DISTRICTS = [
  "Bielany","Białołęka","Targówek","Praga","Śródmieście","Wola",
  "Bemowo","Żoliborz","Ochota","Mokotów","Wilanów","Ursynów"
];

const MAP_ROUTE_MINUTES = [
  [0,5,7,8,8,6,6,4,10,13,18,17],
  [5,0,3,6,8,8,10,4,11,13,17,17],
  [7,3,0,5,7,8,11,5,11,12,15,16],
  [8,6,5,0,3,5,9,4,7,7,11,12],
  [8,8,7,3,0,3,7,5,4,6,10,10],
  [6,8,8,5,3,0,5,4,4,7,12,12],
  [6,10,11,9,7,5,0,6,6,10,15,14],
  [4,4,5,4,5,4,6,0,7,10,15,14],
  [10,11,11,7,4,4,6,7,0,5,10,9],
  [13,13,12,7,6,7,10,10,5,0,5,5],
  [18,17,15,11,10,12,15,15,10,5,0,3],
  [17,17,16,12,10,12,14,14,9,5,3,0]
];

const MAP_VIP_FREE_MINUTES = 5;
let mapRouteMode = "vip";

function mapRouteLexLess(a,b) {
  if (!b) return true;
  if (a.wait !== b.wait) return a.wait < b.wait;
  if (a.hops !== b.hops) return a.hops < b.hops;
  return a.nominal < b.nominal;
}

function mapRouteNormal(startIndex) {
  const n = MAP_ROUTE_DISTRICTS.length;
  const fullMask = (1 << n) - 1;
  const size = 1 << n;
  const costs = Array.from({length:size},()=>Array(n).fill(Infinity));
  const prev = Array.from({length:size},()=>Array(n).fill(null));
  const startMask = 1 << startIndex;
  costs[startMask][startIndex] = 0;

  for (let mask=0; mask<size; mask++) {
    if (!(mask & startMask)) continue;
    for (let last=0; last<n; last++) {
      const current = costs[mask][last];
      if (!Number.isFinite(current)) continue;
      for (let next=0; next<n; next++) {
        if (mask & (1 << next)) continue;
        const nextMask = mask | (1 << next);
        const candidate = current + MAP_ROUTE_MINUTES[last][next];
        if (candidate < costs[nextMask][next]) {
          costs[nextMask][next] = candidate;
          prev[nextMask][next] = [mask,last];
        }
      }
    }
  }

  let end = 0;
  let best = Infinity;
  for (let last=0; last<n; last++) {
    if (costs[fullMask][last] < best) {
      best = costs[fullMask][last];
      end = last;
    }
  }

  const route = [];
  let mask = fullMask;
  let last = end;
  while (true) {
    route.push(last);
    const p = prev[mask][last];
    if (!p) break;
    mask = p[0];
    last = p[1];
  }
  route.reverse();

  return {
    mode:"normal",
    route,
    wait:best,
    nominal:best,
    hops:Math.max(0,route.length-1)
  };
}

function mapRouteVip(startIndex) {
  const n = MAP_ROUTE_DISTRICTS.length;
  const fullMask = (1 << n) - 1;
  const startMask = 1 << startIndex;
  const dist = new Map();
  const prev = new Map();
  const heap = [];

  const keyOf = (mask,last) => `${mask}|${last}`;

  const heapPush = node => {
    heap.push(node);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = Math.floor((i-1)/2);
      if (!mapRouteLexLess(heap[i].cost,heap[parent].cost)) break;
      [heap[i],heap[parent]] = [heap[parent],heap[i]];
      i = parent;
    }
  };

  const heapPop = () => {
    if (!heap.length) return null;
    const top = heap[0];
    const tail = heap.pop();
    if (heap.length && tail) {
      heap[0] = tail;
      let i = 0;
      while (true) {
        const left = i*2+1;
        const right = left+1;
        let best = i;
        if (left < heap.length && mapRouteLexLess(heap[left].cost,heap[best].cost)) best = left;
        if (right < heap.length && mapRouteLexLess(heap[right].cost,heap[best].cost)) best = right;
        if (best === i) break;
        [heap[i],heap[best]] = [heap[best],heap[i]];
        i = best;
      }
    }
    return top;
  };

  const startKey = keyOf(startMask,startIndex);
  const startCost = {wait:0,hops:0,nominal:0};
  dist.set(startKey,startCost);
  heapPush({mask:startMask,last:startIndex,key:startKey,cost:startCost});

  let finishNode = null;

  while (heap.length) {
    const node = heapPop();
    if (!node) break;
    const known = dist.get(node.key);
    if (!known || known.wait !== node.cost.wait || known.hops !== node.cost.hops || known.nominal !== node.cost.nominal) {
      continue;
    }

    if (node.mask === fullMask) {
      finishNode = node;
      break;
    }

    for (let next=0; next<n; next++) {
      if (next === node.last) continue;
      const nominalEdge = MAP_ROUTE_MINUTES[node.last][next];
      const waitEdge = Math.max(0,nominalEdge - MAP_VIP_FREE_MINUTES);
      const nextMask = node.mask | (1 << next);
      const nextKey = keyOf(nextMask,next);
      const candidate = {
        wait:node.cost.wait + waitEdge,
        hops:node.cost.hops + 1,
        nominal:node.cost.nominal + nominalEdge
      };

      if (mapRouteLexLess(candidate,dist.get(nextKey))) {
        dist.set(nextKey,candidate);
        prev.set(nextKey,{key:node.key,from:node.last,to:next,mask:node.mask});
        heapPush({mask:nextMask,last:next,key:nextKey,cost:candidate});
      }
    }
  }

  if (!finishNode) return null;

  const route = [finishNode.last];
  let key = finishNode.key;
  while (prev.has(key)) {
    const step = prev.get(key);
    route.push(step.from);
    key = step.key;
  }
  route.reverse();

  return {
    mode:"vip",
    route,
    wait:finishNode.cost.wait,
    nominal:finishNode.cost.nominal,
    hops:finishNode.cost.hops
  };
}

function mapRouteSolve(startName,mode) {
  const startIndex = MAP_ROUTE_DISTRICTS.indexOf(startName);
  if (startIndex < 0) return null;
  return mode === "normal"
    ? mapRouteNormal(startIndex)
    : mapRouteVip(startIndex);
}

function mapRenderRouteResult() {
  const host = el("map-route-result");
  const startSelect = el("map-route-start");
  if (!host || !startSelect) return;

  const result = mapRouteSolve(startSelect.value,mapRouteMode);
  if (!result) {
    host.innerHTML = `<div class="empty">Nie udało się wyznaczyć trasy.</div>`;
    return;
  }

  const visited = new Set();
  const steps = result.route.map((index,routeIndex) => {
    const district = MAP_ROUTE_DISTRICTS[index];
    const previous = routeIndex > 0 ? result.route[routeIndex-1] : null;
    const nominal = previous == null ? 0 : MAP_ROUTE_MINUTES[previous][index];
    const wait = previous == null
      ? 0
      : result.mode === "vip"
        ? Math.max(0,nominal-MAP_VIP_FREE_MINUTES)
        : nominal;
    const revisit = visited.has(index);
    visited.add(index);

    return `
      <div class="map-route-step">
        <span class="hop">${routeIndex+1}</span>
        <span>
          <b>${escapeHtml(district)}</b>
          ${revisit ? `<span class="map-route-revisit"> · powrót przez odwiedzoną dzielnicę</span>` : ""}
        </span>
        <span>${routeIndex===0 ? "start" : `${nominal} min · czekasz ${wait}`}</span>
      </div>`;
  }).join("");

  host.innerHTML = `
    <div>
      <strong>${result.mode === "vip" ? "💎 VIP" : "🚶 Normal"} · optymalna trasa</strong>
      <div class="map-route-kpis">
        <div class="map-route-kpi"><span>Realne czekanie</span><strong>${result.wait} min</strong></div>
        <div class="map-route-kpi"><span>Przejazdy</span><strong>${result.hops}</strong></div>
        <div class="map-route-kpi"><span>Nominalnie</span><strong>${result.nominal} min</strong></div>
      </div>
      <div class="map-route-steps">${steps}</div>
    </div>`;
}

  const el = id => document.getElementById(id);

  function key(b,y,w,p) {
    return `${b}|${y}|${w}|${p}`;
  }

  function loadJson(k, fallback={}) {
    try {
      return JSON.parse(localStorage.getItem(k)) || fallback;
    } catch {
      return fallback;
    }
  }

  let premium = loadJson(STORAGE_KEY, {});
  let remoteApproved = loadJson(REMOTE_KEY, {});
  let recipeReservations = {};
  let recipeRanking = [];

  function backendConfigured() {
    return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(BACKEND_URL);
  }

  function allRecipes() {

    const out = [];

    for (const baza of D.bases)
      for (const drozdze of D.yeasts)
        for (const woda of D.waters)
          for (const program of PROGRAMS) {

            const k = key(baza,drozdze,woda,program);

            let litry =
              Object.prototype.hasOwnProperty.call(D.known,k)
                ? Number(D.known[k])
                : null;

            // Zatwierdzone wyniki z serwera nadpisują bazę wbudowaną.
            if (Object.prototype.hasOwnProperty.call(remoteApproved,k)) {
              litry = Number(remoteApproved[k]);
            }

            out.push({
              baza,
              drozdze,
              woda,
              program,
              litry
            });
          }

    return out;
  }

  function available(r) {

    if (
      D.premiumBases.includes(r.baza) &&
      !premium[r.baza]
    ) {
      return false;
    }

    if (
      D.premiumYeasts.includes(r.drozdze) &&
      !premium[r.drozdze]
    ) {
      return false;
    }

    return true;
  }

  function fmt(n) {

    return Number(n)
      .toLocaleString(
        "pl-PL",
        {maximumFractionDigits:2}
      );
  }

  function trio(r) {
    return `${r.baza}|${r.drozdze}|${r.woda}`;
  }

  function compute() {

    const recipes =
      allRecipes();

    // Pełna baza — niezależna od zaznaczonych premium.
    const known =
      recipes
        .filter(
          recipe =>
            recipe.litry !== null
        )
        .sort(
          (a,b) =>
            b.litry - a.litry
        );

    const unknown =
      recipes
        .filter(
          recipe =>
            recipe.litry === null
        );

    // TYLKO podium / Top 3 respektuje zaznaczone składniki premium.
    const topKnown =
      recipes
        .filter(available)
        .filter(
          recipe =>
            recipe.litry !== null
        )
        .sort(
          (a,b) =>
            b.litry - a.litry
        );

    const trioMax =
      new Map();

    for (
      const r of known
    ) {
      trioMax.set(
        trio(r),
        Math.max(
          trioMax.get(
            trio(r)
          ) ?? -Infinity,
          r.litry
        )
      );
    }

    const vals =
      known
        .map(
          x => x.litry
        )
        .sort(
          (a,b) => a-b
        );

    const threshold =
      vals.length
        ? vals[
            Math.min(
              Math.floor(
                vals.length * .8
              ),
              vals.length - 1
            )
          ]
        : Infinity;

    for (
      const r of unknown
    ) {
      r.trioMax =
        trioMax.get(
          trio(r)
        ) ?? null;

      r.interesting =
        r.trioMax !== null &&
        r.trioMax >=
          threshold;
    }

    unknown.sort(
      (a,b) =>
        (b.trioMax ?? -1) -
        (a.trioMax ?? -1) ||
        a.baza.localeCompare(
          b.baza
        ) ||
        a.program -
        b.program
    );

    return {
      recipes,

      // Zachowujemy "avail" dla starszego renderProgress().
      // Od v20.6 oznacza całą bazę, nie filtr premium.
      avail:recipes,

      known,
      unknown,
      topKnown
    };
  }

  function renderPremium() {

    const names = [
      ...D.premiumBases,
      ...D.premiumYeasts
    ];

    el("premium-grid").innerHTML =
      names
        .map(name => `

          <label class="check-card">

            <input
              type="checkbox"
              data-premium="${name.replaceAll('"','&quot;')}"
              ${premium[name] ? "checked" : ""}
            >

            <span class="premium-name">${displayName(name)}</span>

          </label>

        `)
        .join("");

    document
      .querySelectorAll("[data-premium]")
      .forEach(cb => {

        cb.addEventListener(
          "change",
          () => {

            premium[cb.dataset.premium] =
              cb.checked;

            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(premium)
            );

            renderAll();
          }
        );
      });
  }

  function recipeCard(r,i) {

    return `

      <article class="recipe-card">

        <div class="rank">
          ${i+1}.
        </div>

        <div class="recipe-main">

          <strong>
	  ${displayName(r.baza)}
	</strong>

	<small>
	  ${displayName(r.drozdze)} ·
	  ${displayName(r.woda)} ·
	  P${r.program}
	</small>

        </div>

        <div class="liters">
          ${fmt(r.litry)} l
        </div>

      </article>

    `;
  }

  function fillAvailableFilter(id, values, allLabel) {
    const select = el(id);
    if (!select || select.dataset.ready === "1") return;

    select.innerHTML =
      `<option value="">${allLabel}</option>` +
      values
        .map(value =>
          `<option value="${escapeHtml(String(value))}">${escapeHtml(displayName(String(value)))}</option>`
        )
        .join("");

    select.dataset.ready = "1";
    select.addEventListener("change", renderAll);
  }

  function setupAvailableRecipeFilters() {
    fillAvailableFilter("available-filter-base", D.bases, "Wszystkie bazy");
    fillAvailableFilter("available-filter-yeast", D.yeasts, "Wszystkie drożdże");
    fillAvailableFilter("available-filter-water", D.waters, "Wszystkie wody");
    fillAvailableFilter("available-filter-program", PROGRAMS.map(String), "Wszystkie programy");
  }

  function setupUnknownRecipeFilters() {
    fillAvailableFilter("unknown-filter-base", D.bases, "Wszystkie bazy");
    fillAvailableFilter("unknown-filter-yeast", D.yeasts, "Wszystkie drożdże");
    fillAvailableFilter("unknown-filter-water", D.waters, "Wszystkie wody");
    fillAvailableFilter("unknown-filter-program", PROGRAMS.map(String), "Wszystkie programy");
  }

  function renderAllAvailableRecipes(data) {
    setupAvailableRecipeFilters();

    const base = el("available-filter-base")?.value || "";
    const yeast = el("available-filter-yeast")?.value || "";
    const water = el("available-filter-water")?.value || "";
    const program = el("available-filter-program")?.value || "";

    const filtered = data.known.filter(recipe =>
      (!base || recipe.baza === base) &&
      (!yeast || recipe.drozdze === yeast) &&
      (!water || recipe.woda === water) &&
      (!program || String(recipe.program) === program)
    );

    const list = el("available-list");
    const summary = el("available-filter-summary");

    if (summary) {
      summary.textContent =
        `Pokazano ${filtered.length} z ${data.known.length} dostępnych recept.`;
    }

    if (list) {
      list.innerHTML =
        filtered.length
          ? filtered.map(recipeCard).join("")
          : `<div class="empty">Brak recept spełniających wybrane filtry.</div>`;
    }
  }

  function renderTop(data) {

    const top =
      data.topKnown.slice(
        0,
        3
      );

    const medal = ["🥇","🥈","🥉"];
    const place = ["1. miejsce","2. miejsce","3. miejsce"];
    const tone = ["gold","silver","bronze"];

    el("top-list").innerHTML =
      top.length
        ? `
            <div class="recipe-podium">
              ${top.map((recipe,index) => `
                <article class="podium-card ${tone[index] || ""}">
                  <div class="podium-head">
                    <span class="podium-medal">${medal[index] || "🏅"}</span>
                    <span class="podium-place">${place[index] || `${index+1}. miejsce`}</span>
                  </div>

                  <div class="podium-base">
                    ${escapeHtml(displayName(recipe.baza))}
                  </div>

                  <div class="podium-combo">
                    ${escapeHtml(displayName(recipe.drozdze))}
                    <span>·</span>
                    ${escapeHtml(displayName(recipe.woda))}
                    <span>·</span>
                    P${recipe.program}
                  </div>

                  <div class="podium-result">
                    ${fmt(recipe.litry)} l
                  </div>
                </article>
              `).join("")}
            </div>
          `
        : `
            <div class="empty">
              Brak znanych receptur dla zaznaczonych składników premium.
            </div>
          `;
  }

  function reservationOwnerMap() {
    try {
      const parsed =
        JSON.parse(
          localStorage.getItem(
            RESERVATION_OWNER_KEY
          ) || "{}"
        );

      return (
        parsed &&
        typeof parsed === "object"
          ? parsed
          : {}
      );
    } catch (err) {
      return {};
    }
  }

  function saveReservationOwnerMap(map) {
    localStorage.setItem(
      RESERVATION_OWNER_KEY,
      JSON.stringify(map || {})
    );
  }

  function reservationOwnerFor(recipe) {
    const recipeKey =
      key(
        recipe.baza,
        recipe.drozdze,
        recipe.woda,
        recipe.program
      );

    const map =
      reservationOwnerMap();

    const owner =
      map[recipeKey];

    if (!owner || !owner.token) {
      return null;
    }

    if (
      Number(owner.expiresAt) &&
      Number(owner.expiresAt) <
        Date.now()
    ) {
      delete map[recipeKey];
      saveReservationOwnerMap(map);
      return null;
    }

    return owner;
  }

  function saveReservationOwner(
    recipe,
    token,
    reservation
  ) {
    if (!token) return;

    const recipeKey =
      key(
        recipe.baza,
        recipe.drozdze,
        recipe.woda,
        recipe.program
      );

    const map =
      reservationOwnerMap();

    map[recipeKey] = {
      token,
      nick:
        String(
          reservation &&
          reservation.nick ||
          ""
        ),
      expiresAt:
        Number(
          reservation &&
          reservation.expiresAt
        ) || 0
    };

    saveReservationOwnerMap(map);
  }

  function clearReservationOwner(recipe) {
    const recipeKey =
      key(
        recipe.baza,
        recipe.drozdze,
        recipe.woda,
        recipe.program
      );

    const map =
      reservationOwnerMap();

    delete map[recipeKey];

    saveReservationOwnerMap(map);
  }

  function normalizedPlayerNick(value) {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("pl-PL");
  }

  function cachedAccountNick() {
    if (
      !cachedAccountStatus ||
      !cachedAccountStatus.nick ||
      cachedAccountStatusToken !==
        playerAccountSessionToken()
    ) {
      return "";
    }

    return String(
      cachedAccountStatus.nick || ""
    ).trim();
  }

  function accountOwnsReservation(
    reservation
  ) {
    const nick =
      cachedAccountNick();

    if (
      !nick ||
      !reservation ||
      !reservation.nick
    ) {
      return false;
    }

    return (
      normalizedPlayerNick(nick) ===
      normalizedPlayerNick(
        reservation.nick
      )
    );
  }

  function ownsReservation(
    recipe,
    reservation
  ) {
    if (!reservation) {
      return false;
    }

    // v20.15 — zalogowane konto tego samego nicku
    // może obsłużyć rezerwację na każdym urządzeniu.
    if (
      accountOwnsReservation(
        reservation
      )
    ) {
      return true;
    }

    // Dla niezalogowanych zachowujemy dotychczasowy
    // mechanizm urządzenia / ownerToken.
    const owner =
      reservationOwnerFor(recipe);

    if (!owner) {
      return false;
    }

    return (
      normalizedPlayerNick(
        owner.nick
      ) ===
      normalizedPlayerNick(
        reservation.nick
      )
    );
  }

  function makeRecipeNonce() {
    if (
      globalThis.crypto &&
      typeof globalThis.crypto.randomUUID ===
        "function"
    ) {
      return globalThis.crypto
        .randomUUID()
        .replace(/-/g,"");
    }

    const bytes =
      new Uint8Array(24);

    globalThis.crypto
      .getRandomValues(bytes);

    return Array
      .from(
        bytes,
        value =>
          value
            .toString(16)
            .padStart(2,"0")
      )
      .join("");
  }

  function recipeReservationFor(r) {
    return recipeReservations[
      key(r.baza,r.drozdze,r.woda,r.program)
    ] || null;
  }

  function reservationClock(expiresAt) {
    const date = new Date(Number(expiresAt));
    if (!Number.isFinite(date.getTime())) return "";
    return date.toLocaleTimeString("pl-PL", {
      hour:"2-digit",
      minute:"2-digit"
    });
  }

  function showRecipeActionNotice(
    message,
    type="info"
  ) {
    let box =
      document.getElementById(
        "recipe-action-notice"
      );

    if (!box) {
      box =
        document.createElement(
          "div"
        );

      box.id =
        "recipe-action-notice";

      box.className =
        "recipe-action-notice";

      document.body.appendChild(
        box
      );
    }

    box.dataset.type =
      type;

    box.textContent =
      message;

    box.hidden =
      false;

    clearTimeout(
      showRecipeActionNotice.timer
    );

    if (
      type !== "loading"
    ) {
      showRecipeActionNotice.timer =
        setTimeout(
          () => {
            box.hidden = true;
          },
          2400
        );
    }
  }


  async function reserveUnknownRecipe(recipe) {
    if (!backendConfigured()) {
      window.alert(
        "Backend nie jest skonfigurowany."
      );
      return;
    }

    const accountNick =
      cachedAccountNick();

    let cleanNick = "";

    if (accountNick) {
      const accepted =
        window.confirm(
          "Zarezerwować tę receptę?\n\n" +
          `Rezerwacja zostanie przypisana do ${accountNick} na 24 godziny.`
        );

      if (!accepted) {
        return;
      }

      cleanNick =
        accountNick;

    } else {
      const savedNick =
        localStorage.getItem(
          NICK_KEY
        ) || "";

      const nick =
        window.prompt(
          "Kto rezerwuje tę recepturę na 24 godziny?",
          savedNick
        );

      if (nick === null) {
        return;
      }

      cleanNick =
        String(nick || "")
          .trim();

      if (!cleanNick) {
        window.alert(
          "Podaj nick."
        );
        return;
      }

      localStorage.setItem(
        NICK_KEY,
        cleanNick
      );
    }

    showRecipeActionNotice(
      "⏳ Rezerwuję recepturę...",
      "loading"
    );

    try {
      const owner =
        reservationOwnerFor(
          recipe
        );

      const nonce = makeRecipeNonce();
      let sendError = null;

      criticalOperationStart(
        "🔬 Rezerwuję recepturę…",
        "Zapisuję rezerwację i czekam na potwierdzenie serwera."
      );

      try {
        await timedBackendPost(
          "reserveRecipe",
          {
            action:"reserveRecipe",
            nonce,
            nick:cleanNick,
            baza:recipe.baza,
            drozdze:recipe.drozdze,
            woda:recipe.woda,
            program:recipe.program,
            ownerToken:
              owner && owner.token
                ? owner.token
                : "",
            sessionToken:
              playerAccountSessionToken() || ""
          }
        );
      } catch (err) {
        // POST nie jest ponawiany. Sprawdzamy wynik pod tym samym nonce.
        sendError = err;
      }

      let result = null;
      for (let attempt=0; attempt<20; attempt++) {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve,350));
        }

        try {
          result = await jsonp("reserveRecipeResult",{nonce});
        } catch (err) {
          if (attempt === 19 && !sendError) sendError = err;
          continue;
        }

        if (result && !result.pending) break;
      }

      if (!result || result.pending) {
        throw sendError || new Error(
          "Serwer nie potwierdził rezerwacji receptury."
        );
      }

      if (
        !result ||
        !result.ok
      ) {
        throw new Error(
          result &&
          result.error
            ? result.error
            : "Nie udało się zarezerwować receptury."
        );
      }

      if (result.ownerToken) {
        saveReservationOwner(
          recipe,
          result.ownerToken,
          result.reservation
        );
      }

      showRecipeActionNotice(
        result.message ||
        "✅ Receptura zarezerwowana na 24 godziny.",
        "success"
      );
      achievementTrack(["distillery_reserve"]);

      await fetchApprovedRecipes({force:true});

    } catch (err) {
      const message =
        err &&
        err.message
          ? err.message
          : "Nie udało się zarezerwować receptury.";

      showRecipeActionNotice(
        "❌ " + message,
        "error"
      );

      window.alert(message);
    } finally {
      criticalOperationFinish();
    }
  }

  async function submitReservedRecipe(
    recipe,
    reservation
  ) {
    const owner =
      reservationOwnerFor(recipe);

    const accountOwner =
      accountOwnsReservation(
        reservation
      );

    if (
      !ownsReservation(
        recipe,
        reservation
      )
    ) {
      window.alert(
        "Wynik może wprowadzić tylko urządzenie, które utworzyło rezerwację, " +
        "albo zalogowane konto gracza przypisanego do tej rezerwacji."
      );
      return;
    }

    const raw =
      window.prompt(
        "Wpisz wynik tej receptury w litrach:",
        ""
      );

    if (raw === null) return;

    const litry =
      Number(
        String(raw)
          .trim()
          .replace(/\s+/g,"")
          .replace(",",".")
      );

    if (
      !Number.isFinite(litry) ||
      litry <= 0 ||
      litry > 50
    ) {
      window.alert(
        "Podaj poprawny wynik w litrach."
      );
      return;
    }

    if (
      !window.confirm(
        `Wysłać wynik ${fmt(litry)} l do weryfikacji?\n\n` +
        `${displayName(recipe.baza)} · ` +
        `${displayName(recipe.drozdze)} · ` +
        `${displayName(recipe.woda)} · P${recipe.program}`
      )
    ) {
      return;
    }

    const nonce =
      makeRecipeNonce();

    showRecipeActionNotice(
      "⏳ Wysyłam wynik...",
      "loading"
    );

    criticalOperationStart(
      "🧪 Wysyłam wynik receptury…",
      "Zapisuję wynik i czekam na potwierdzenie serwera."
    );

    try {
      let sendError = null;

      try {
        await timedBackendPost(
          "submitReservedRecipe",
          {
            action:
              "submitReservedRecipe",
            nonce,
            ownerToken:
              owner &&
              owner.token
                ? owner.token
                : "",
            sessionToken:
              playerAccountSessionToken() || "",
            baza:recipe.baza,
            drozdze:recipe.drozdze,
            woda:recipe.woda,
            program:recipe.program,
            litry
          }
        );
      } catch (err) {
        sendError = err;
      }

      let result = null;

      for (
        let attempt = 0;
        attempt < 20;
        attempt++
      ) {
        if (attempt > 0) {
          await new Promise(
            resolve =>
              setTimeout(
                resolve,
                350
              )
          );
        }

        result =
          await jsonp(
            "reservedSubmitResult",
            {nonce}
          );

        if (
          result &&
          !result.pending
        ) {
          break;
        }
      }

      if (
        !result ||
        result.pending
      ) {
        throw sendError || new Error(
          "Serwer nie zwrócił wyniku zapisu."
        );
      }

      if (!result.ok) {
        throw new Error(
          result.error ||
          "Nie udało się wysłać wyniku."
        );
      }

      showRecipeActionNotice(
        "✅ Wynik został wysłany do weryfikacji.",
        "success"
      );
      achievementTrack(["distillery_result"]);

      // Tak jak w stabilnym v20: po zapisie pobieramy pełny stan.
      await fetchApprovedRecipes({force:true});

    } catch (err) {
      const message =
        err && err.message
          ? err.message
          : "Nie udało się wysłać wyniku.";

      showRecipeActionNotice(
        "❌ " + message,
        "error"
      );

      window.alert(message);
    } finally {
      criticalOperationFinish();
    }
  }



  // ============================================================
  // v21.00 — Destylarnia: eksperymentalny model danych
  // Osobny model log-additive dla każdego programu. Nie próbuje
  // odtwarzać ukrytych współczynników backendu gry.
  // ============================================================
  let distilleryModelCache = null;
  let distilleryModelCacheSignature = "";

  function distillerySolveLinearSystem(matrix, vector) {
    const n = vector.length;
    const a = matrix.map((row,i) => row.slice().concat([vector[i]]));

    for (let col=0; col<n; col++) {
      let pivot = col;
      for (let row=col+1; row<n; row++) {
        if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
      }
      if (Math.abs(a[pivot][col]) < 1e-10) return null;
      if (pivot !== col) [a[pivot],a[col]] = [a[col],a[pivot]];

      const div = a[col][col];
      for (let j=col; j<=n; j++) a[col][j] /= div;

      for (let row=0; row<n; row++) {
        if (row === col) continue;
        const factor = a[row][col];
        if (!factor) continue;
        for (let j=col; j<=n; j++) a[row][j] -= factor * a[col][j];
      }
    }

    return a.map(row => row[n]);
  }

  function distilleryWeightedRidge(X, y, weights, lambda=0.015) {
    if (!X.length) return null;
    const p = X[0].length;
    const xtx = Array.from({length:p},() => Array(p).fill(0));
    const xty = Array(p).fill(0);

    for (let i=0; i<X.length; i++) {
      const w = Math.max(0.0001,Number(weights[i]) || 1);
      for (let r=0; r<p; r++) {
        xty[r] += w * X[i][r] * y[i];
        for (let c=0; c<p; c++) xtx[r][c] += w * X[i][r] * X[i][c];
      }
    }
    for (let i=1; i<p; i++) xtx[i][i] += lambda;
    xtx[0][0] += 1e-8;
    return distillerySolveLinearSystem(xtx,xty);
  }

  function distilleryMedian(values) {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a,b)=>a-b);
    const mid = Math.floor(sorted.length/2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
  }

  function distilleryFitProgram(rows, program) {
    const data = rows.filter(row => Number(row.program) === Number(program) && Number(row.litry) > 0);
    if (data.length < 8) return null;

    const bases = [...new Set(data.map(r=>r.baza))].sort((a,b)=>String(a).localeCompare(String(b),"pl"));
    const yeasts = [...new Set(data.map(r=>r.drozdze))].sort((a,b)=>String(a).localeCompare(String(b),"pl"));
    const waters = [...new Set(data.map(r=>r.woda))].sort((a,b)=>String(a).localeCompare(String(b),"pl"));
    if (!bases.length || !yeasts.length || !waters.length) return null;

    const baseRef = bases[0], yeastRef = yeasts[0], waterRef = waters[0];
    const featureNames = ["intercept"]
      .concat(bases.slice(1).map(x=>`b:${x}`))
      .concat(yeasts.slice(1).map(x=>`y:${x}`))
      .concat(waters.slice(1).map(x=>`w:${x}`));

    const vectorFor = row => {
      const x = [1];
      bases.slice(1).forEach(v=>x.push(row.baza===v ? 1 : 0));
      yeasts.slice(1).forEach(v=>x.push(row.drozdze===v ? 1 : 0));
      waters.slice(1).forEach(v=>x.push(row.woda===v ? 1 : 0));
      return x;
    };

    const X = data.map(vectorFor);
    const y = data.map(r=>Math.log(Number(r.litry)));
    let weights = data.map(()=>1);
    let beta = null;

    for (let iteration=0; iteration<4; iteration++) {
      beta = distilleryWeightedRidge(X,y,weights);
      if (!beta) return null;
      const residuals = y.map((target,i) => target - X[i].reduce((sum,v,j)=>sum+v*beta[j],0));
      const center = distilleryMedian(residuals);
      const mad = distilleryMedian(residuals.map(v=>Math.abs(v-center))) || 0.02;
      const scale = Math.max(0.015,1.4826*mad);
      const huber = 1.5*scale;
      weights = residuals.map(r => {
        const d = Math.abs(r-center);
        return d <= huber ? 1 : huber/Math.max(d,1e-9);
      });
    }

    const predictRaw = row => Math.exp(vectorFor(row).reduce((sum,v,j)=>sum+v*beta[j],0));
    const errors = data.map(row=>Number(row.litry)-predictRaw(row));
    const abs = errors.map(Math.abs);
    const mae = abs.reduce((a,b)=>a+b,0)/abs.length;
    const rmse = Math.sqrt(errors.reduce((a,b)=>a+b*b,0)/errors.length);

    const counts = {
      base:Object.fromEntries(bases.map(v=>[v,data.filter(r=>r.baza===v).length])),
      yeast:Object.fromEntries(yeasts.map(v=>[v,data.filter(r=>r.drozdze===v).length])),
      water:Object.fromEntries(waters.map(v=>[v,data.filter(r=>r.woda===v).length]))
    };

    return {program,dataCount:data.length,bases,yeasts,waters,baseRef,yeastRef,waterRef,featureNames,beta,mae,rmse,counts,predictRaw};
  }

  function distilleryBuildExperimentalModel(recipes) {
    const rows = (recipes || []).filter(r=>Number.isFinite(Number(r.litry)) && Number(r.litry)>0);
    const signature = rows
      .map(r=>`${key(r.baza,r.drozdze,r.woda,r.program)}=${Number(r.litry).toFixed(4)}`)
      .sort()
      .join(";");

    if (distilleryModelCache && signature === distilleryModelCacheSignature) return distilleryModelCache;

    const programs = {};
    PROGRAMS.forEach(program => {
      programs[program] = distilleryFitProgram(rows,program);
    });

    distilleryModelCacheSignature = signature;
    distilleryModelCache = {programs,knownCount:rows.length,createdAt:Date.now()};
    return distilleryModelCache;
  }

  function distilleryPredict(recipe, model) {
    const fit = model && model.programs ? model.programs[Number(recipe.program)] : null;
    if (!fit) return null;
    if (!fit.bases.includes(recipe.baza) || !fit.yeasts.includes(recipe.drozdze) || !fit.waters.includes(recipe.woda)) return null;

    const estimate = fit.predictRaw(recipe);
    if (!Number.isFinite(estimate) || estimate <= 0) return null;

    const support = Math.min(
      Number(fit.counts.base[recipe.baza]) || 0,
      Number(fit.counts.yeast[recipe.drozdze]) || 0,
      Number(fit.counts.water[recipe.woda]) || 0
    );
    const relError = fit.rmse / Math.max(estimate,0.01);
    let confidence = "niska";
    if (fit.dataCount >= 35 && support >= 8 && relError <= 0.10) confidence = "wysoka";
    else if (fit.dataCount >= 20 && support >= 4 && relError <= 0.18) confidence = "średnia";

    return {
      estimate,
      confidence,
      support,
      dataCount:fit.dataCount,
      mae:fit.mae,
      rmse:fit.rmse,
      uncertainty:Math.max(fit.rmse,fit.mae*1.25,0.03)
    };
  }

  function distilleryPredictionHtml(recipe, model, compact=false) {
    const prediction = distilleryPredict(recipe,model);
    if (!prediction) return compact ? "" : `<div class="distillery-estimate unavailable">🧪 Brak wystarczających danych do estymacji.</div>`;
    return `<div class="distillery-estimate confidence-${prediction.confidence}">
      <span class="distillery-estimate-main">🧪 Szacunek: <b>~${fmt(prediction.estimate)} l</b> · pewność ${escapeHtml(prediction.confidence)}</span>
      <span class="distillery-estimate-meta">P${recipe.program} · ${prediction.dataCount} wyników · wsparcie min. ${prediction.support}</span>
    </div>`;
  }

  function distilleryExperimentRecommendations(data, model) {
    const free = (data.unknown || []).filter(r=>!recipeReservationFor(r));
    const predicted = free
      .map(recipe=>({recipe,prediction:distilleryPredict(recipe,model)}))
      .filter(x=>x.prediction);
    if (!predicted.length) return [];

    const estimates = predicted.map(x=>x.prediction.estimate);
    const min = Math.min(...estimates), max = Math.max(...estimates);
    predicted.forEach(item => {
      const yieldScore = max>min ? (item.prediction.estimate-min)/(max-min) : 0.5;
      const infoScore = 1/Math.sqrt(Math.max(1,item.prediction.support));
      const confidenceBonus = item.prediction.confidence === "niska" ? 0.12 : 0;
      item.score = 0.62*yieldScore + 0.38*infoScore + confidenceBonus;
    });
    predicted.sort((a,b)=>b.score-a.score || b.prediction.estimate-a.prediction.estimate);

    const selected = [];
    const signatures = new Set();
    for (const item of predicted) {
      const trioSig = `${item.recipe.baza}|${item.recipe.drozdze}|${item.recipe.woda}`;
      // Trzy rekomendacje mają badać trzy różne zestawy składników.
      // Program nadal wpływa na model/wynik, ale nie chcemy zajmować całej
      // listy prawie tym samym trio tylko na innych programach.
      if (signatures.has(trioSig)) continue;
      selected.push(item);
      signatures.add(trioSig);
      if (selected.length >= 3) break;
    }
    return selected;
  }

  function renderDistilleryExperimentalModel(data) {
    const host = el("distillery-experiment-recommendations");
    if (!host) return;
    const model = distilleryBuildExperimentalModel(data.recipes);
    const recommendations = distilleryExperimentRecommendations(data,model);
    const fits = PROGRAMS.map(p=>model.programs[p]).filter(Boolean);
    const meanRmse = fits.length ? fits.reduce((sum,f)=>sum+f.rmse,0)/fits.length : null;

    host.innerHTML = `
      <div class="distillery-model-head">
        <div>
          <strong>🧪 Eksperymentalny model Destylarni</strong>
          <div class="distillery-model-meta">${model.knownCount} potwierdzonych wyników${meanRmse!=null ? ` · RMSE ~${fmt(meanRmse)} l` : ""}</div>
        </div>
        <span class="distillery-model-badge">estymacja</span>
      </div>
      <details class="distillery-model-info">
        <summary>Jak czytać rekomendacje?</summary>
        <div>Model uczy zależności składników osobno dla każdego programu. Wynik jest estymacją z danych gangu, nie ukrytym wzorem gry.</div>
      </details>
      ${recommendations.length ? `
        <div class="distillery-recommendation-grid">
          ${recommendations.map((item,index)=>`
            <button type="button" class="distillery-recommendation" data-distillery-recommend="${escapeHtml(key(item.recipe.baza,item.recipe.drozdze,item.recipe.woda,item.recipe.program))}">
              <span class="distillery-rec-top">
                <b>${index===0 ? "🎯 Najciekawszy test" : "🔬 Warto zbadać"}</b>
                <span class="distillery-confidence">${escapeHtml(item.prediction.confidence)}</span>
              </span>
              <span class="distillery-rec-yield">~${fmt(item.prediction.estimate)} l</span>
              <span class="distillery-rec-recipe">
                <strong>${escapeHtml(displayName(item.recipe.baza))}</strong>
                <span>P${item.recipe.program}</span>
                <span>${escapeHtml(displayName(item.recipe.drozdze))}</span>
                <span>${escapeHtml(displayName(item.recipe.woda))}</span>
              </span>
              <small>${item.prediction.support <= 4 ? "Mało danych — pomiar mocno poprawi model." : "Dobry szacunek i wartościowy nowy pomiar."}</small>
            </button>`).join("")}
        </div>` : `<div class="empty">Za mało danych do bezpiecznej rekomendacji.</div>`}
    `;

    host.querySelectorAll("[data-distillery-recommend]").forEach(button=>{
      button.addEventListener("click",()=>{
        const recipe = (data.unknown || []).find(r=>key(r.baza,r.drozdze,r.woda,r.program)===button.dataset.distilleryRecommend);
        if (recipe) reserveUnknownRecipe(recipe);
      });
    });
    return model;
  }


  function renderUnknown(data) {

    const allUnknown = data.unknown;

    const inProgress = allUnknown
      .filter(recipe => Boolean(recipeReservationFor(recipe)));

    const freeAll = allUnknown
      .filter(recipe => !recipeReservationFor(recipe));

    setupUnknownRecipeFilters();

    const experimentalModel =
      renderDistilleryExperimentalModel(data) ||
      distilleryBuildExperimentalModel(data.recipes);

    const unknownBase =
      el("unknown-filter-base")?.value || "";
    const unknownYeast =
      el("unknown-filter-yeast")?.value || "";
    const unknownWater =
      el("unknown-filter-water")?.value || "";
    const unknownProgram =
      el("unknown-filter-program")?.value || "";

    const free = freeAll.filter(recipe =>
      (!unknownBase || recipe.baza === unknownBase) &&
      (!unknownYeast || recipe.drozdze === unknownYeast) &&
      (!unknownWater || recipe.woda === unknownWater) &&
      (!unknownProgram || String(recipe.program) === unknownProgram)
    );

    const unknownSummary =
      el("unknown-filter-summary");

    if (unknownSummary) {
      unknownSummary.textContent =
        `Pokazano ${free.length} z ${freeAll.length} wolnych nieodkrytych recept.`;
    }

    const researchList = el("research-list");

    if (researchList) {
      researchList.innerHTML =
        inProgress.length
          ? inProgress.map(recipe => {
              const reservation = recipeReservationFor(recipe);

              const isOwner =
                ownsReservation(
                  recipe,
                  reservation
                );

              const isSubmitted =
                String(
                  reservation.state ||
                  "reserved"
                ) === "submitted";

              const canEnterResult =
                isOwner &&
                !isSubmitted;

              return `
                <article
                  class="unknown-card research-card ${
                    isSubmitted
                      ? "research-submitted"
                      : isOwner
                        ? "research-owned"
                        : "research-waiting"
                  }"
                  ${
                    canEnterResult
                      ? `data-owned-research="${escapeHtml(key(recipe.baza,recipe.drozdze,recipe.woda,recipe.program))}" style="cursor:pointer"`
                      : ""
                  }>
                  <div>
                    <strong>${displayName(recipe.baza)}</strong>
                    <small>
                      ${displayName(recipe.drozdze)} ·
                      ${displayName(recipe.woda)} ·
                      P${recipe.program}
                    </small>
                  </div>

                  ${distilleryPredictionHtml(recipe,experimentalModel,true)}

                  ${
                    recipe.interesting
                      ? `
                          <div class="hint">
                            ⭐ Interesująca do zbadania
                            <br>
                            <span>
                              Inny program tej trójki:
                              do ${fmt(recipe.trioMax)} l
                            </span>
                          </div>
                        `
                      : ""
                  }

                  <div class="research-status">
                    ${
                      isSubmitted
                        ? (
                            isOwner
                              ? `📨 <b>Wynik wprowadzony</b> · ${reservation.submittedLiters != null ? `${fmt(Number(reservation.submittedLiters))} l · ` : ""}oczekuje na akceptację`
                              : `📨 <b>${escapeHtml(reservation.nick)}</b> wprowadził wynik · oczekuje na akceptację`
                          )
                        : (
                            isOwner
                              ? `🧪 <b>Oczekuje na wynik</b> · Twoja rezerwacja · kliknij, aby wprowadzić wynik · do ${reservationClock(reservation.expiresAt)}`
                              : `⏳ <b>Oczekuje na wynik</b> · ${escapeHtml(reservation.nick)} bada tę recepturę · do ${reservationClock(reservation.expiresAt)}`
                          )
                    }
                  </div>
                </article>
              `;
            }).join("")
          : (
              approvedRecipesRequestState === "loading"
                ? `<div class="empty">⏳ Sprawdzam aktualne badania...</div>`
                : approvedRecipesRequestState === "error"
                  ? `<div class="empty">⚠️ Nie udało się potwierdzić aktualnych badań. Użyj Odśwież.</div>`
                  : `<div class="empty">Aktualnie żadna receptura nie jest zarezerwowana.</div>`
            );
    }

    if (researchList) {
      researchList
        .querySelectorAll(
          "[data-owned-research]"
        )
        .forEach(card => {
          card.addEventListener(
            "click",
            () => {
              const recipeKey =
                card.dataset
                  .ownedResearch;

              const recipe =
                inProgress.find(
                  item =>
                    key(
                      item.baza,
                      item.drozdze,
                      item.woda,
                      item.program
                    ) === recipeKey
                );

              if (!recipe) return;

              submitReservedRecipe(
                recipe,
                recipeReservationFor(recipe)
              );
            }
          );
        });
    }

    const unknownList = el("unknown-list");

    if (unknownList) {
      unknownList.innerHTML =
        free.length
          ? free.map((recipe,index) => `
              <article
                class="unknown-card ${recipe.interesting ? "interesting" : ""}"
                data-reserve-index="${index}"
                style="cursor:pointer"
                title="Kliknij, aby zarezerwować recepturę na 24 godziny">

                <div>
                  <strong>${displayName(recipe.baza)}</strong>
                  <small>
                    ${displayName(recipe.drozdze)} ·
                    ${displayName(recipe.woda)} ·
                    P${recipe.program}
                  </small>
                </div>

                ${distilleryPredictionHtml(recipe,experimentalModel,true)}

                ${
                  recipe.interesting
                    ? `
                        <div class="hint">
                          ⭐ Interesująca do zbadania
                          <br>
                          <span>
                            Inny program tej trójki:
                            do ${fmt(recipe.trioMax)} l
                          </span>
                        </div>
                      `
                    : ""
                }

                <div class="muted" style="margin-top:7px">
                  🔓 Wolna · kliknij, aby zaklepać na 24 h
                </div>
              </article>
            `).join("")
          : `<div class="empty">Brak wolnych nieodkrytych receptur dla wybranych składników.</div>`;

      unknownList
        .querySelectorAll("[data-reserve-index]")
        .forEach(card => {
          card.addEventListener("click", () => {
            const recipe = free[Number(card.dataset.reserveIndex)];
            if (recipe) reserveUnknownRecipe(recipe);
          });
        });
    }
  }

  function renderProgress(data) {

    const globalKnown =
      data.recipes
        .filter(x => x.litry !== null)
        .length;

    const globalPct =
      globalKnown /
      data.recipes.length *
      100;

    const availPct =
      data.avail.length
        ? data.known.length /
          data.avail.length *
          100
        : 0;

    el("progress-body").innerHTML = `

      <div class="stat-grid">

        <div class="stat">
          <span>Znane</span>
          <strong>
            ${globalKnown} /
            ${data.recipes.length}
          </strong>
        </div>

        <div class="stat">
          <span>Nieodkryte</span>
          <strong>
            ${data.recipes.length-globalKnown}
          </strong>
        </div>

        <div class="stat">
          <span>Postęp</span>
          <strong>
            ${globalPct.toFixed(1).replace(".",",")}%
          </strong>
        </div>

        <div class="stat">
          <span>Dostępne</span>
          <strong>
            ${data.known.length} /
            ${data.avail.length}
          </strong>
        </div>

      </div>

      <h3>Cała baza</h3>

      <div class="progress">
        <div style="width:${globalPct}%"></div>
      </div>

      <h3>Twoje dostępne składniki</h3>

      <div class="progress">
        <div style="width:${availPct}%"></div>
      </div>

      <p class="muted">
        Nieodkryte receptury:
        <b>${data.unknown.length}</b>
      </p>

      <p class="muted">
        Zatwierdzone wyniki pobrane z serwera:
        <b>${Object.keys(remoteApproved).length}</b>
      </p>

      <h3>🏆 Ranking odkrywców</h3>

      <div>
        ${
          recipeRanking.length
            ? recipeRanking.slice(0,15).map((item,index) => `
                <div style="
                  display:flex;
                  justify-content:space-between;
                  gap:10px;
                  padding:6px 8px;
                  margin-bottom:4px;
                  border:1px solid #e1d4bc;
                  border-radius:7px;
                  background:#fffdf8;
                ">
                  <span>
                    <b>${index + 1}.</b>
                    ${escapeHtml(item.nick)}
                  </span>
                  <b>${Number(item.count) || 0}</b>
                </div>
              `).join("")
            : `<div class="empty">Brak zaakceptowanych odkryć do rankingu.</div>`
        }
      </div>

      <p class="muted">
        Ranking liczy unikalne receptury. Duplikaty i późniejsze korekty nie dodają kolejnego punktu.
      </p>

    `;
  }

  function renderMap() {
    const container = el("map-list");
    if (!container) return;

    const markers =
      MAP
        .map(([district,action,icon]) => {
          const position = MAP_POSITIONS[district];
          if (!position) return "";
          const known = Boolean(action);
          return `
            <div
              style="
                position:absolute;
                left:${position.x}%;
                top:${position.y}%;
                transform:translate(-50%,0);
                z-index:2;
                padding:2px 5px;
                border-radius:6px;
                background:${known ? "rgba(255,248,230,.92)" : "rgba(255,238,238,.94)"};
                border:1px solid ${known ? "rgba(95,70,40,.55)" : "rgba(180,80,80,.65)"};
                box-shadow:0 1px 3px rgba(0,0,0,.25);
                font-size:10px;
                font-weight:700;
                line-height:1.15;
                white-space:nowrap;
                color:${known ? "#3d3022" : "#9a2f2f"};
                pointer-events:none;
              ">
              ${icon} ${escapeHtml(action || "Nieodkryte")}
            </div>`;
        })
        .join("");

    container.innerHTML = `
      <div style="max-width:420px;margin:0 auto">
        <div style="position:relative;width:100%">
          <img
            src="mapa-warszawa.png"
            alt="Mapa dzielnic"
            style="display:block;width:100%;height:auto;border-radius:8px">
          ${markers}
        </div>

        <div style="
          margin-top:12px;
          padding:8px 10px;
          border-radius:8px;
          background:#f8f0df;
          border:1px solid #d8c49f;
          font-size:12px;
          line-height:1.5;
          text-align:center">
          ⚪ Neutralny &nbsp;·&nbsp; 🙏 Błagalny &nbsp;·&nbsp;
          🤝 Przyjacielski &nbsp;·&nbsp; ⚔️ Agresywny
        </div>
      </div>

      <div class="map-route-planner">
        <strong>🧭 Planer przejazdu przez wszystkie dzielnice</strong>
        <p class="muted" style="margin:5px 0 9px">
          Normal minimalizuje sumę czasów. VIP liczy realne czekanie jako
          <b>max(0, czas − ${MAP_VIP_FREE_MINUTES} min)</b> i może celowo wracać przez odwiedzone dzielnice.
        </p>
        <div class="map-route-controls">
          <label>
            <span>📍 Jestem tutaj</span>
            <select id="map-route-start">
              ${MAP_ROUTE_DISTRICTS.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}
            </select>
          </label>
          <div class="map-mode-switch">
            <button type="button" data-map-mode="normal">Normal</button>
            <button type="button" data-map-mode="vip" class="active">💎 VIP</button>
          </div>
        </div>
        <div id="map-route-result" class="map-route-result"></div>
      </div>`;

    const startSelect = el("map-route-start");
    if (startSelect) {
      const preferred =
        localStorage.getItem("menelwars_map_start_v1") || "Wilanów";
      if (MAP_ROUTE_DISTRICTS.includes(preferred)) startSelect.value = preferred;
      startSelect.addEventListener("change",() => {
        localStorage.setItem("menelwars_map_start_v1",startSelect.value);
        if (mapEasterSessionActive) {
          mapEasterVisitedDistricts.add(startSelect.value);
          if (MAP_ROUTE_DISTRICTS.every(name=>mapEasterVisitedDistricts.has(name))) {
            mapEasterSessionActive = false;
            achievementTrack(["easter_all_districts"]);
          }
        }
        mapRenderRouteResult();
      });
    }

    container.querySelectorAll("[data-map-mode]").forEach(button => {
      button.addEventListener("click",() => {
        mapRouteMode = button.dataset.mapMode === "normal" ? "normal" : "vip";
        container.querySelectorAll("[data-map-mode]").forEach(item => {
          item.classList.toggle("active",item.dataset.mapMode === mapRouteMode);
        });
        mapRenderRouteResult();
      });
    });

    mapRenderRouteResult();
  }

  function renderAll() {

    renderPremium();

    const data = compute();

    renderTop(data);
    renderAllAvailableRecipes(data);
    renderUnknown(data);
    renderProgress(data);
    updateSubmissionInfo();
  }


  // ============================================================
  // FORMULARZ ZGŁOSZENIA
  // ============================================================

  function fillSelect(id, values) {

  el(id).innerHTML =
    values
      .map(
        v =>
          `<option value="${v}">${displayName(v)}</option>`
      )
      .join("");
}

  function setupSubmissionForm() {

    fillSelect(
      "submit-base",
      D.bases
    );

    fillSelect(
      "submit-yeast",
      D.yeasts
    );

    fillSelect(
      "submit-water",
      D.waters
    );

    fillSelect(
      "submit-program",
      PROGRAMS.map(String)
    );

    el("submit-nick").value =
      localStorage.getItem(NICK_KEY) || "";

    [
      "submit-base",
      "submit-yeast",
      "submit-water",
      "submit-program"
    ].forEach(id => {

      el(id).addEventListener(
        "change",
        updateSubmissionInfo
      );
    });

    el("submit-nick")
      .addEventListener(
        "change",
        () => {

          localStorage.setItem(
            NICK_KEY,
            el("submit-nick").value.trim()
          );
        }
      );

    el("submit-form")
      .addEventListener(
        "submit",
        submitRecipe
      );

    if (!backendConfigured()) {

      el("submit-status").innerHTML = `
        <div class="server-warning">
          ⚠️ Administrator nie skonfigurował jeszcze adresu serwera zgłoszeń.
        </div>
      `;
    }

    updateSubmissionInfo();
  }

  function selectedSubmissionKey() {

    return key(
      el("submit-base").value,
      el("submit-yeast").value,
      el("submit-water").value,
      Number(el("submit-program").value)
    );
  }

  function currentKnownValue(k) {

    // Jedno wspólne źródło prawdy dla interfejsu receptur:
    // 1) wynik zatwierdzony na serwerze ma pierwszeństwo,
    // 2) jeśli serwer nie ma jeszcze tej receptury, używamy
    //    wbudowanej bazy D.known.
    // To jest ta sama zasada, której używa allRecipes().
    if (
      Object.prototype
        .hasOwnProperty
        .call(remoteApproved,k)
    ) {
      return Number(remoteApproved[k]);
    }

    if (
      Object.prototype
        .hasOwnProperty
        .call(D.known,k)
    ) {
      return Number(D.known[k]);
    }

    return null;
  }

  function updateSubmissionInfo() {

    const info = el("submit-info");

    if (!info) return;

    const k =
      selectedSubmissionKey();

    const knownValue =
      currentKnownValue(k);

    if (knownValue === null) {

      info.className =
        "submit-info unknown-recipe";

      info.innerHTML =
        "🔬 Ta receptura jest obecnie <b>nieodkryta</b>.";

    } else {

      info.className =
        "submit-info known-recipe";

      info.innerHTML =
        "ℹ️ Aktualny znany wynik tej receptury: " +
        "<b>" +
        fmt(knownValue) +
        " l</b>. " +
        "Możesz wysłać korektę do weryfikacji.";
    }
  }

  async function submitRecipe(event) {

    event.preventDefault();

    const status =
      el("submit-status");

    const nick =
      el("submit-nick").value.trim();

    const litryRaw =
  	el("submit-liters").value.trim();

	const litry =
  		Number(
    			litryRaw
      				.replace(/\s+/g, "")
      				.replace(",", ".")
  	);

    if (!nick) {

      status.textContent =
        "Podaj nick.";

      return;
    }

    if (
      !Number.isFinite(litry) ||
      litry <= 0
    ) {

      status.textContent =
        "Podaj poprawną liczbę litrów.";

      return;
    }

    if (!backendConfigured()) {

      status.textContent =
        "Serwer zgłoszeń nie jest jeszcze skonfigurowany.";

      return;
    }

    localStorage.setItem(
      NICK_KEY,
      nick
    );

    const payload = {

      nick,

      baza:
        el("submit-base").value,

      drozdze:
        el("submit-yeast").value,

      woda:
        el("submit-water").value,

      program:
        Number(
          el("submit-program").value
        ),

      litry,

      uwagi:
        el("submit-notes").value.trim()
    };

    status.textContent =
      "Wysyłanie...";

    const nonce = makeRecipeNonce();

    criticalOperationStart(
      "🧪 Wysyłam recepturę…",
      "Zapisuję zgłoszenie i czekam na potwierdzenie serwera."
    );

    try {
      let sendError = null;

      try {
        await timedBackendPost(
          "submitRecipeBatch",
          {
            action:"submitRecipeBatch",
            nonce,
            nick,
            sessionToken:playerAccountSessionToken() || "",
            items:[{
              ...payload,
              uwagi:
                payload.uwagi ||
                "Ręczne zgłoszenie z MenelWars Tools."
            }]
          }
        );
      } catch (err) {
        // Nie ponawiamy POST. Wynik jest sprawdzany po tym samym nonce.
        sendError = err;
      }

      let result = null;

      for (let attempt=0; attempt<20; attempt++) {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve,350));
        }

        try {
          result = await jsonp(
            "recipeBatchImportResult",
            {nonce}
          );
        } catch (err) {
          if (attempt === 19 && !sendError) sendError = err;
          continue;
        }

        if (result && !result.pending) break;
      }

      if (!result || result.pending) {
        throw sendError || new Error(
          "Serwer nie potwierdził zapisu receptury."
        );
      }

      if (!result.ok) {
        throw new Error(
          result.error ||
          "Nie udało się zapisać zgłoszenia."
        );
      }

      if (Number(result.insertedCount) > 0) {
        status.innerHTML =
          "✅ Zgłoszenie wysłane do weryfikacji.";
      } else if (Number(result.skippedKnown) > 0) {
        status.innerHTML =
          "✅ Ten sam wynik jest już potwierdzony w bazie.";
      } else if (Number(result.skippedPending) > 0) {
        status.innerHTML =
          "ℹ️ Identyczne zgłoszenie już czeka na weryfikację.";
      } else {
        status.innerHTML =
          "✅ Zgłoszenie zostało sprawdzone przez serwer.";
      }

      el("submit-liters").value = "";
      el("submit-notes").value = "";
      if (Number(result.insertedCount)>0) achievementTrack(["distillery_result"]);

    } catch (err) {
      status.textContent =
        err && err.message
          ? err.message
          : "Nie udało się wysłać zgłoszenia. Sprawdź internet.";
    } finally {
      criticalOperationFinish();
    }
  }


  // ============================================================
  // IMPORT WIELU WYNIKÓW Z „KOPIUJ DO EXCELA” W MENELWARS
  // ============================================================

  let recipeBatchPreviewRows = [];

  function recipeImportNormalizeLabel(value) {
    return String(value || "")
      .trim()
      .replace(/[„”]/g,'"')
      .replace(/\s+/g," ")
      .toLocaleLowerCase("pl-PL");
  }

  function recipeImportCanonical(value, type) {
    const raw = String(value || "").trim();
    const normalized = recipeImportNormalizeLabel(raw);

    const values =
      type === "base" ? D.bases :
      type === "yeast" ? D.yeasts :
      type === "water" ? D.waters : [];

    for (const internal of values) {
      if (
        recipeImportNormalizeLabel(internal) === normalized ||
        recipeImportNormalizeLabel(displayName(internal)) === normalized
      ) {
        return internal;
      }
    }

    const extra = {
      water: {
        "woda z kranu":"Kranówa",
        "woda kranowa":"Kranówa",
        "kranowa":"Kranówa"
      },
      base: {
        "cukier klasyczny":"Cukier"
      },
      yeast: {}
    };

    return extra[type] && extra[type][normalized]
      ? extra[type][normalized]
      : null;
  }

  function parseRecipeBatchText(text) {
    const lines = String(text || "")
      .split(/\r?\n/)
      .map(line => line.trimEnd())
      .filter(line => line.trim());

    const parsed = [];

    lines.forEach((line, index) => {
      const cols = line.split("\t").map(value => value.trim());

      if (
        index === 0 &&
        recipeImportNormalizeLabel(cols[0]).includes("nazwa składnika 1")
      ) {
        return;
      }

      if (cols.length !== 5) {
        parsed.push({
          line:index + 1,
          state:"invalid",
          error:"Nie udało się odczytać 5 kolumn. Wklej dane bezpośrednio z „Kopiuj do Excela”.",
          raw:line
        });
        return;
      }

      const baza = recipeImportCanonical(cols[0],"base");
      const drozdze = recipeImportCanonical(cols[1],"yeast");
      const woda = recipeImportCanonical(cols[2],"water");
      const program = Number(String(cols[3]).replace(/[^0-9]/g,""));
      const litry = Number(
        String(cols[4])
          .replace(/\s+/g,"")
          .replace(",",".")
      );

      const errors = [];
      if (!baza) errors.push(`nieznana baza: ${cols[0] || "—"}`);
      if (!drozdze) errors.push(`nieznane drożdże: ${cols[1] || "—"}`);
      if (!woda) errors.push(`nieznana woda: ${cols[2] || "—"}`);
      if (!PROGRAMS.includes(program)) errors.push(`nieprawidłowy program: ${cols[3] || "—"}`);
      if (!Number.isFinite(litry) || litry <= 0 || litry > 50) errors.push(`nieprawidłowy wynik: ${cols[4] || "—"}`);

      if (errors.length) {
        parsed.push({
          line:index + 1,
          state:"invalid",
          error:errors.join("; "),
          raw:line
        });
        return;
      }

      parsed.push({
        line:index + 1,
        baza,
        drozdze,
        woda,
        program,
        litry,
        recipeKey:key(baza,drozdze,woda,program),
        state:"pending"
      });
    });

    // Ta sama receptura z dwoma różnymi wynikami w jednym wklejeniu jest
    // niejednoznaczna — nie wysyłamy żadnego z nich automatycznie.
    const groups = new Map();
    parsed
      .filter(row => row.state === "pending")
      .forEach(row => {
        if (!groups.has(row.recipeKey)) groups.set(row.recipeKey,[]);
        groups.get(row.recipeKey).push(row);
      });

    groups.forEach(rows => {
      const values = [...new Set(rows.map(row => Number(row.litry).toFixed(6)))];

      if (values.length > 1) {
        rows.forEach(row => {
          row.state = "invalid";
          row.error = "Ta sama receptura występuje w tym imporcie z różnymi wynikami.";
        });
        return;
      }

      rows.forEach((row, rowIndex) => {
        if (rowIndex > 0) {
          row.state = "batchDuplicate";
          return;
        }

        const known = currentKnownValue(row.recipeKey);

        if (known !== null && Math.abs(known - row.litry) <= 0.000001) {
          row.state = "known";
          row.knownLiters = known;
        } else if (known !== null) {
          row.state = "correction";
          row.knownLiters = known;
        } else {
          row.state = "new";
          row.knownLiters = null;
        }
      });
    });

    return parsed;
  }

  function recipeBatchStateLabel(row) {
    if (row.state === "new") return "🆕 Nowa receptura";
    if (row.state === "correction") return `⚠️ Korekta ${fmt(row.knownLiters)} → ${fmt(row.litry)} l`;
    if (row.state === "known") return "✅ Już znajduje się w bazie";
    if (row.state === "batchDuplicate") return "↪️ Powtórzenie w tym samym wklejeniu — pominięte";
    return "❌ " + (row.error || "Nieprawidłowy wiersz");
  }

  function renderRecipeBatchPreview() {
    const box = el("recipe-batch-preview-result");
    const submitButton = el("recipe-batch-submit");
    if (!box || !submitButton) return;

    const rows = recipeBatchPreviewRows;
    const sendable = rows.filter(row => row.state === "new" || row.state === "correction");
    const known = rows.filter(row => row.state === "known").length;
    const duplicates = rows.filter(row => row.state === "batchDuplicate").length;
    const invalid = rows.filter(row => row.state === "invalid").length;
    const corrections = rows.filter(row => row.state === "correction").length;
    const fresh = rows.filter(row => row.state === "new").length;

    // v20.33: importer działa jednym przyciskiem.
    // Drugi element zostaje ukryty tylko dla zgodności z istniejącym DOM.
    submitButton.hidden = true;

    if (!rows.length) {
      box.innerHTML = `<div class="submit-info unknown-recipe">Wklej co najmniej jeden wiersz danych z gry.</div>`;
      return;
    }

    box.innerHTML = `
      <div class="submit-info ${invalid ? "unknown-recipe" : "known-recipe"}">
        <b>Odczytano: ${rows.length}</b> ·
        🆕 ${fresh} nowych ·
        ⚠️ ${corrections} korekt ·
        ✅ ${known} już znanych ·
        ↪️ ${duplicates} powtórzeń ·
        ❌ ${invalid} błędnych
      </div>
      <div style="display:grid;gap:6px;margin-top:8px;max-height:360px;overflow:auto">
        ${rows.map(row => `
          <div style="border:1px solid #d8c7aa;border-radius:8px;padding:8px;background:#fffdf8">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
              <div>
                <b>${row.baza ? escapeHtml(displayName(row.baza)) : `Wiersz ${row.line}`}</b>
                ${row.baza ? `<div class="muted">${escapeHtml(displayName(row.drozdze))} · ${escapeHtml(displayName(row.woda))} · P${row.program}</div>` : ""}
              </div>
              ${Number.isFinite(row.litry) ? `<strong>${fmt(row.litry)} l</strong>` : ""}
            </div>
            <div class="muted" style="margin-top:4px">${escapeHtml(recipeBatchStateLabel(row))}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  async function previewRecipeBatch() {
    const status = el("recipe-batch-status");
    const text = el("recipe-batch-text")?.value || "";

    recipeBatchPreviewRows = parseRecipeBatchText(text).slice(0,1000);
    renderRecipeBatchPreview();

    if (!recipeBatchPreviewRows.length) {
      if (status) status.textContent = "Nie znaleziono danych do importu.";
      return;
    }

    // Jedno kliknięcie: sprawdzamy dane i od razu wysyłamy
    // wszystkie nowe receptury oraz korekty.
    await submitRecipeBatch();
  }

    async function submitRecipeBatch() {
    const status = el("recipe-batch-status");
    const button = el("recipe-batch-preview");
    const nick = el("submit-nick")?.value.trim() || "";
    const items = recipeBatchPreviewRows
      .filter(row => row.state === "new" || row.state === "correction")
      .map(row => ({
        baza:row.baza,
        drozdze:row.drozdze,
        woda:row.woda,
        program:row.program,
        litry:row.litry
      }));

    if (!nick) {
      status.textContent = "Podaj nick w formularzu powyżej.";
      return;
    }

    if (!items.length) {
      const confirmedCount = recipeBatchPreviewRows.filter(
        row => row.state === "known" || row.state === "batchDuplicate"
      ).length;
      const invalidCount = recipeBatchPreviewRows.filter(
        row => row.state === "invalid"
      ).length;

      if (confirmedCount) {
        status.textContent =
          `✅ Sprawdzono ${confirmedCount} wyników — wszystkie poprawne pozycje są już w bazie.` +
          (invalidCount ? ` Pominięto ${invalidCount} błędnych.` : "");
      } else {
        status.textContent =
          "Nie znaleziono poprawnych nowych wyników ani korekt do wysłania.";
      }

      return;
    }

    if (!backendConfigured()) {
      status.textContent = "Serwer zgłoszeń nie jest jeszcze skonfigurowany.";
      return;
    }

    localStorage.setItem(NICK_KEY,nick);
    const nonce = makeRecipeNonce();
    button.disabled = true;
    status.textContent = "Wysyłanie paczki wyników...";

    criticalOperationStart(
      "📋 Wysyłam paczkę receptur…",
      "Zapisuję wyniki i czekam na potwierdzenie serwera."
    );

    try {
      let sendError = null;

      try {
        await timedBackendPost(
          "submitRecipeBatch",
          {
            action:"submitRecipeBatch",
            nonce,
            nick,
            sessionToken:playerAccountSessionToken() || "",
            items
          }
        );
      } catch (err) {
        sendError = err;
      }

      let result = null;

      for (let attempt=0; attempt<20; attempt++) {
        if (attempt > 0) await new Promise(resolve => setTimeout(resolve,350));
        result = await jsonp("recipeBatchImportResult",{nonce});
        if (result && !result.pending) break;
      }

      if (!result || result.pending) {
        throw sendError || new Error("Serwer nie zwrócił wyniku importu.");
      }

      if (!result.ok) {
        throw new Error(result.error || "Nie udało się zapisać importu.");
      }

      status.textContent =
        `✅ Zapisano ${Number(result.insertedCount)||0} zgłoszeń do weryfikacji. ` +
        `Pominięto: ${Number(result.skippedKnown)||0} już znanych, ` +
        `${Number(result.skippedPending)||0} już oczekujących. ` +
        (Number(result.rejectedCount) ? `Odrzucono ${Number(result.rejectedCount)} błędnych.` : "");

      el("recipe-batch-text").value = "";
      recipeBatchPreviewRows = [];
      renderRecipeBatchPreview();
      if (Number(result.insertedCount)>0) achievementTrack(["distillery_import"]);
      await fetchApprovedRecipes({force:true});

    } catch (err) {
      status.textContent = err && err.message
        ? err.message
        : "Nie udało się wysłać importu.";
    } finally {
      criticalOperationFinish();
      button.disabled = false;
    }
  }

  function setupRecipeBatchImport() {
    el("recipe-batch-preview")?.addEventListener("click",previewRecipeBatch);
  }


  // ============================================================
  // AUTOMATYCZNE POBIERANIE ZATWIERDZONYCH RECEPTUR
  // JSONP omija ograniczenia CORS Apps Script.
  // ============================================================

  let approvedRecipesInFlight = null;
  let approvedRecipesRequestState = "idle";
  let distilleryDataLoaded = false;
  let gardenDataLoaded = false;
  let mapModuleLoaded = false;
  let mapEasterVisitedDistricts = new Set();
  let mapEasterSessionActive = false;

  const moduleOpenInFlight = {
    distillery:null,
    garden:null,
    gang:Object.create(null),
    builds:null,
    map:null,
    account:null
  };

  function showModuleLoading(moduleName,title,text="Pobieram potrzebne dane...") {
    const titleEl = el("module-loading-title");
    const textEl = el("module-loading-text");

    if (titleEl) titleEl.textContent = title || "Ładowanie modułu...";
    if (textEl) textEl.textContent = text;

    showToolView("module-loading-view",moduleName);
  }

  function updateHomeAccountState(account) {
    const box = el("home-account-state");
    if (!box) return;

    if (account && account.nick) {
      box.className = "submit-info known-recipe";
      box.innerHTML =
        `✅ Zalogowano jako <b>${escapeHtml(account.nick)}</b>${account.admin ? " · 🛠 Administrator" : ""}.`;
    } else if (playerAccountSessionToken()) {
      box.className = "submit-info unknown-recipe";
      box.textContent = "⚠️ Nie udało się potwierdzić zapisanej sesji.";
    } else {
      box.className = "submit-info";
      box.textContent = "👤 Korzystasz bez logowania. Zaloguj się, aby uzyskać dostęp do funkcji wymagających Konta.";
    }
  }

  let moduleAccessPolicyCache = {
    distillery:false,
    garden:false,
    builds:false,
    map:false
  };

  let moduleAccessPolicyAt = 0;
  let moduleAccessPolicyInFlight = null;

  const MODULE_ACCESS_POLICY_TTL_MS =
    60 * 1000;

  async function fetchModuleAccessPolicy(
    options={}
  ) {
    const force = Boolean(options.force);
    const hasKnownPolicy = moduleAccessPolicyAt > 0;
    const isFresh =
      hasKnownPolicy &&
      Date.now() - moduleAccessPolicyAt < MODULE_ACCESS_POLICY_TTL_MS;

    if (!force && isFresh) {
      return moduleAccessPolicyCache;
    }

    // v21.00.3 — stale-while-revalidate. Po pierwszym poprawnym pobraniu
    // polityki kolejne kliknięcie nie czeka na sieć tylko dlatego, że minął TTL.
    if (!force && hasKnownPolicy) {
      if (!moduleAccessPolicyInFlight) {
        moduleAccessPolicyInFlight = (async () => {
          try {
            const payload = await jsonp("moduleAccessPolicy",{});
            if (payload && payload.ok && payload.policy) {
              moduleAccessPolicyCache = {
                distillery:Boolean(payload.policy.distillery),
                garden:Boolean(payload.policy.garden),
                builds:Boolean(payload.policy.builds),
                map:Boolean(payload.policy.map)
              };
              moduleAccessPolicyAt = Date.now();
            }
          } catch (err) {
            console.warn("[MenelWars Tools] Odświeżenie ustawień dostępu w tle:",err);
          } finally {
            moduleAccessPolicyInFlight = null;
          }
          return moduleAccessPolicyCache;
        })();
      }
      moduleAccessPolicyInFlight.catch(() => {});
      return moduleAccessPolicyCache;
    }

    if (moduleAccessPolicyInFlight) {
      return moduleAccessPolicyInFlight;
    }

    moduleAccessPolicyInFlight = (async () => {
      try {
        const payload = await jsonp("moduleAccessPolicy",{});
        if (payload && payload.ok && payload.policy) {
          moduleAccessPolicyCache = {
            distillery:Boolean(payload.policy.distillery),
            garden:Boolean(payload.policy.garden),
            builds:Boolean(payload.policy.builds),
            map:Boolean(payload.policy.map)
          };
          moduleAccessPolicyAt = Date.now();
        }
      } catch (err) {
        console.warn("[MenelWars Tools] Ustawienia dostępu do modułów:",err);
      } finally {
        moduleAccessPolicyInFlight = null;
      }
      return moduleAccessPolicyCache;
    })();

    return moduleAccessPolicyInFlight;
  }

  const MODULE_ACCESS_LABELS = {
    distillery:"Destylarnia",
    garden:"Ogród",
    builds:"PVP",
    map:"Mapa"
  };

  async function showModuleAccountGate(
    moduleName
  ) {
    await renderAccountView();

    showToolView(
      "account-view",
      "account"
    );

    const status =
      el("account-status");

    if (status) {
      status.textContent =
        `🔒 ${MODULE_ACCESS_LABELS[moduleName] || "Ten moduł"} wymaga zalogowanego Konta.`;
    }
  }

  async function ensureModuleAccess(
    moduleName,
    options={}
  ) {
    const policy =
      await fetchModuleAccessPolicy({
        force:Boolean(options.force)
      });

    if (
      !policy ||
      !policy[moduleName]
    ) {
      return true;
    }

    const token = playerAccountSessionToken();

    // Znane, wcześniej potwierdzone konto otwiera moduł natychmiast.
    // Odnowienie sesji odbywa się w tle; backend pozostaje autorytatywny.
    if (
      token &&
      cachedAccountStatus &&
      cachedAccountStatusToken === token
    ) {
      playerAccountStatus({force:false,strict:false}).catch(() => {});
      return true;
    }

    const account =
      await playerAccountStatus({
        force:Boolean(options.force),
        strict:true
      });

    if (account) {
      return true;
    }

    await showModuleAccountGate(
      moduleName
    );

    return false;
  }


  async function openDistilleryModule(
    target="optimizer-view",
    options={}
  ) {
    // Natychmiastowa reakcja na klik. Kontrola dostępu może wymagać sieci,
    // więc loader musi pojawić się PRZED pierwszym await.
    if (!distilleryDataLoaded) {
      showModuleLoading(
        "distillery",
        "⚗ Ładowanie Destylarni...",
        "Pobieram aktualne receptury i rezerwacje."
      );
    }

    if (
      !(await ensureModuleAccess(
        "distillery",
        {force:false}
      ))
    ) {
      return;
    }

    const forceRefresh =
      Boolean(options.forceRefresh);

    // Stale-while-revalidate: jeśli dane już są, pokazujemy je bez czekania.
    // Świeży request nie może blokować przełączania podzakładek.
    if (distilleryDataLoaded) {
      showToolView(target,"distillery");

      if (forceRefresh && !moduleOpenInFlight.distillery) {
        moduleOpenInFlight.distillery = (async () => {
          await fetchApprovedRecipes({force:true});
          renderAll();
          distilleryDataLoaded = true;
        })();

        moduleOpenInFlight.distillery
          .catch(err => {
            console.warn("Nie udało się odświeżyć Destylarni w tle:",err);
          })
          .finally(() => {
            moduleOpenInFlight.distillery = null;
          });
      }

      return;
    }

    if (moduleOpenInFlight.distillery) {
      await moduleOpenInFlight.distillery;
      showToolView(target,"distillery");
      return;
    }

    moduleOpenInFlight.distillery = (async () => {
      await fetchApprovedRecipes({force:true});
      renderAll();
      distilleryDataLoaded = true;
    })();

    try {
      await moduleOpenInFlight.distillery;
    } finally {
      moduleOpenInFlight.distillery = null;
    }

    showToolView(target,"distillery");
  }

  async function openMapModule() {
    const startsNewMapSession = activeToolModule !== "map";
    if (!mapModuleLoaded) {
      showModuleLoading(
        "map",
        "🗺 Ładowanie mapy...",
        "Przygotowuję mapę i oznaczenia dzielnic."
      );
    }

    if (
      !(await ensureModuleAccess(
        "map",
        {force:false}
      ))
    ) {
      return;
    }

    if (mapModuleLoaded) {
      showToolView("map-view","map");
      if (startsNewMapSession) {
        mapEasterVisitedDistricts = new Set();
        mapEasterSessionActive = true;
      }
      achievementTrack(["map_open"]);
      return;
    }

    if (!moduleOpenInFlight.map) {
      moduleOpenInFlight.map = (async () => {
        renderMap();

        const image = el("map-list")?.querySelector("img");

        if (image && !image.complete) {
          await Promise.race([
            new Promise(resolve => {
              image.addEventListener("load",resolve,{once:true});
              image.addEventListener("error",resolve,{once:true});
            }),
            new Promise(resolve => setTimeout(resolve,4000))
          ]);
        }

        mapModuleLoaded = true;
      })();
    }

    try {
      await moduleOpenInFlight.map;
    } finally {
      moduleOpenInFlight.map = null;
    }

    showToolView("map-view","map");
    mapEasterVisitedDistricts = new Set();
    mapEasterSessionActive = true;
    achievementTrack(["map_open"]);
  }

  function fetchApprovedRecipes(options={}) {
    if (!backendConfigured()) {
      approvedRecipesRequestState = "error";
      renderAll();
      distilleryDataLoaded = true;
      return Promise.resolve(false);
    }

    if (approvedRecipesInFlight) {
      return approvedRecipesInFlight;
    }

    approvedRecipesRequestState = "loading";

    // Jeżeli użytkownik patrzy już na Destylarnię,
    // nie pokazujemy fałszywego "brak badań" podczas requestu.
    if (distilleryDataLoaded) {
      renderAll();
    }

    approvedRecipesInFlight = new Promise(resolve => {
      const timingStartedAt =
        requestTimingNow();

      const callbackName =
        "roqApproved_" +
        Date.now() +
        "_" +
        Math.floor(Math.random()*100000);

      const script =
        document.createElement("script");

      let settled = false;
      let timingRecorded = false;
      let lateCleanupTimer = null;

      const recordTiming = ok => {
        if (timingRecorded) return;
        timingRecorded = true;

        recordRequestTiming(
          "approvedRecipes",
          requestTimingNow() - timingStartedAt,
          ok,
          "GET"
        );
      };

      const leaveSafeNoopCallback = () => {
        window[callbackName] = () => {};
      };

      const cleanupCompleted = () => {
        clearTimeout(timeout);

        if (lateCleanupTimer) {
          clearTimeout(lateCleanupTimer);
          lateCleanupTimer = null;
        }

        script.remove();

        try {
          delete window[callbackName];
        } catch {
          leaveSafeNoopCallback();
        }
      };

      const timeout =
        setTimeout(
          () => {
            if (settled) return;
            settled = true;

            approvedRecipesRequestState = "error";
            distilleryDataLoaded = true;

            recordTiming(false);
            renderAll();

            lateCleanupTimer =
              setTimeout(() => {
                script.remove();
                leaveSafeNoopCallback();
              }, JSONP_LATE_GRACE_MS);

            resolve(false);
          },
          JSONP_TIMEOUT_MS
        );

      window[callbackName] =
        payload => {
          if (settled) {
            if (lateCleanupTimer) {
              clearTimeout(lateCleanupTimer);
              lateCleanupTimer = null;
            }

            script.remove();
            leaveSafeNoopCallback();
            return;
          }

          settled = true;
          clearTimeout(timeout);

          let ok = false;

          try {
            if (
              payload &&
              payload.authRequired
            ) {
              approvedRecipesRequestState =
                "error";

              if (
                activeToolModule ===
                "distillery"
              ) {
                showModuleAccountGate(
                  "distillery"
                );
              }
            } else if (
              payload &&
              payload.ok &&
              payload.recipes &&
              typeof payload.recipes === "object"
            ) {
              remoteApproved = payload.recipes;

              recipeReservations =
                payload.reservations &&
                typeof payload.reservations === "object"
                  ? payload.reservations
                  : {};

              recipeRanking =
                Array.isArray(payload.ranking)
                  ? payload.ranking
                  : [];

              localStorage.setItem(
                REMOTE_KEY,
                JSON.stringify(remoteApproved)
              );

              ok = true;
            }
          } catch (err) {
            console.warn(
              "[MenelWars Tools] Destylarnia:",
              err
            );
          }

          approvedRecipesRequestState =
            ok ? "ready" : "error";

          renderAll();
          updateSubmissionInfo();
          distilleryDataLoaded = true;

          recordTiming(ok);
          cleanupCompleted();
          resolve(ok);
        };

      script.onerror = () => {
        if (settled) {
          script.remove();
          leaveSafeNoopCallback();
          return;
        }

        settled = true;
        clearTimeout(timeout);

        approvedRecipesRequestState = "error";
        distilleryDataLoaded = true;

        recordTiming(false);
        renderAll();
        cleanupCompleted();
        resolve(false);
      };

      script.src =
        BACKEND_URL +
        "?action=approved" +
        "&sessionToken=" +
        encodeURIComponent(
          playerAccountSessionToken()
        ) +
        "&callback=" +
        encodeURIComponent(callbackName) +
        "&_=" +
        Date.now();

      document.head.appendChild(script);
    });

    return approvedRecipesInFlight.finally(() => {
      approvedRecipesInFlight = null;
    });
  }


  // ============================================================
  // WPŁATY GANGU — LOGOWANIE + CHRONIONE DANE
  // ============================================================

  function gangToken() {
    return playerAccountSessionToken() || "";
  }

  function setGangToken(token) {
    if (token) {
      localStorage.setItem(GANG_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(GANG_TOKEN_KEY);
    }
  }

  function makeNonce() {
    if (crypto && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2,"0")).join("");
  }

  // ============================================================
  // v20.74 — POMIAR CZASÓW REQUESTÓW
  // ============================================================

  const requestTimingStats = new Map();
  const requestTimingHistory = [];
  const REQUEST_TIMING_HISTORY_MAX = 150;

  function requestTimingNow() {
    return (
      typeof performance !== "undefined" &&
      typeof performance.now === "function"
    )
      ? performance.now()
      : Date.now();
  }

  function recordRequestTiming(
    action,
    durationMs,
    ok=true,
    method="GET"
  ) {
    const key =
      `${String(method || "GET").toUpperCase()} ${String(action || "unknown")}`;

    const ms =
      Math.max(
        0,
        Math.round(Number(durationMs) || 0)
      );

    const item =
      requestTimingStats.get(key) || {
        action:key,
        count:0,
        success:0,
        errors:0,
        totalMs:0,
        minMs:null,
        maxMs:0,
        lastMs:0,
        lastAt:""
      };

    item.count++;
    item.success += ok ? 1 : 0;
    item.errors += ok ? 0 : 1;
    item.totalMs += ms;
    item.minMs =
      item.minMs === null
        ? ms
        : Math.min(item.minMs,ms);
    item.maxMs =
      Math.max(item.maxMs,ms);
    item.lastMs = ms;
    item.lastAt =
      new Date().toISOString();

    requestTimingStats.set(
      key,
      item
    );

    requestTimingHistory.push({
      action:key,
      ms,
      ok:Boolean(ok),
      at:item.lastAt
    });

    if (
      requestTimingHistory.length >
      REQUEST_TIMING_HISTORY_MAX
    ) {
      requestTimingHistory.splice(
        0,
        requestTimingHistory.length -
        REQUEST_TIMING_HISTORY_MAX
      );
    }
  }

  function requestTimingSummary() {
    return Array.from(
      requestTimingStats.values()
    )
      .map(item => ({
        request:item.action,
        count:item.count,
        avgMs:
          item.count
            ? Math.round(item.totalMs / item.count)
            : 0,
        minMs:item.minMs ?? 0,
        maxMs:item.maxMs,
        lastMs:item.lastMs,
        errors:item.errors,
        lastAt:item.lastAt
      }))
      .sort(
        (a,b) =>
          b.avgMs - a.avgMs
      );
  }

  window.mwRequestTimings = () => {
    const summary =
      requestTimingSummary();

    console.table(summary);

    return {
      summary,
      history:
        requestTimingHistory.slice()
    };
  };

  window.mwClearRequestTimings = () => {
    requestTimingStats.clear();
    requestTimingHistory.length = 0;

    console.info(
      "[MenelWars Tools] Wyczyszczono pomiary requestów."
    );
  };


  const JSONP_TIMEOUT_MS = 20 * 1000;
  const JSONP_LATE_GRACE_MS = 60 * 1000;

  function jsonpOnce(action, params={}) {

    const timingStartedAt =
      requestTimingNow();

    return new Promise((resolve, reject) => {

      const callbackName =
        "mwJsonp_" +
        Date.now() +
        "_" +
        Math.floor(Math.random()*1000000);

      const script =
        document.createElement("script");

      let settled = false;
      let lateCleanupTimer = null;

      const leaveSafeNoopCallback = () => {
        // Jeżeli Apps Script odpowie bardzo późno, callback nadal istnieje.
        // Dzięki temu nie dostajemy "mwJsonp_xxx is not defined".
        window[callbackName] = () => {};
      };

      const cleanupCompleted = () => {
        clearTimeout(timeout);

        if (lateCleanupTimer) {
          clearTimeout(lateCleanupTimer);
          lateCleanupTimer = null;
        }

        script.remove();

        try {
          delete window[callbackName];
        } catch {
          leaveSafeNoopCallback();
        }
      };

      const timeout =
        setTimeout(() => {
          if (settled) return;
          settled = true;

          recordRequestTiming(
            action,
            requestTimingNow() - timingStartedAt,
            false,
            "GET"
          );

          // Nie usuwamy od razu tagu <script> ani callbacku.
          // Apps Script może odpowiedzieć już po naszym limicie.
          lateCleanupTimer =
            setTimeout(() => {
              script.remove();
              leaveSafeNoopCallback();
            }, JSONP_LATE_GRACE_MS);

          reject(
            new Error(
              "Przekroczono czas odpowiedzi serwera."
            )
          );
        }, JSONP_TIMEOUT_MS);

      window[callbackName] = payload => {
        if (settled) {
          if (lateCleanupTimer) {
            clearTimeout(lateCleanupTimer);
            lateCleanupTimer = null;
          }

          script.remove();
          leaveSafeNoopCallback();
          return;
        }

        settled = true;
        clearTimeout(timeout);

        recordRequestTiming(
          action,
          requestTimingNow() - timingStartedAt,
          Boolean(!payload || payload.ok !== false),
          "GET"
        );

        cleanupCompleted();
        resolve(payload);
      };

      script.onerror = () => {
        if (settled) {
          script.remove();
          leaveSafeNoopCallback();
          return;
        }

        settled = true;
        clearTimeout(timeout);

        recordRequestTiming(
          action,
          requestTimingNow() - timingStartedAt,
          false,
          "GET"
        );

        cleanupCompleted();

        reject(
          new Error(
            "Błąd połączenia z serwerem."
          )
        );
      };

      const query =
        new URLSearchParams({
          action,
          ...params,
          callback: callbackName,
          _: String(Date.now())
        });

      script.src =
        BACKEND_URL + "?" + query.toString();

      document.head.appendChild(script);
    });
  }

  const JSONP_SAFE_RETRY_ACTIONS = new Set([
    "reserveRecipeResult",
    "reservedSubmitResult",
    "recipeBatchImportResult",
    "moduleAccessPolicy",
    "playerAccountActionResult",
    "playerAccountStatus",
    "accountAdminPlayers",
    "playerIdentityStatus",
    "playerIdentityActionResult",
    "companySalaryActionResult",
    "gangPolls",
    "gangGoal",
    "gangAnnouncements",
    "payments",
    "gangLoginResult",
    "adminMutationResult",
    "adminDashboardStatus",
    "adminGangTools",
    "adminBuilds",
    "adminTest",
    "adminSubmissions",
    "adminPaymentsStatus",
    "adminImportPaymentsResult",
    "buildActionResult",
    "builds",
    "gardenActionResult",
    "gardenData",
    "gangMenuStatus"
  ]);

  function jsonpShouldRetry(action) {
    // Retry jest dozwolony WYŁĄCZNIE dla jawnie sklasyfikowanych odczytów.
    // Nieznana/nowa akcja domyślnie nie jest ponawiana, więc przypadkowy
    // mutujący GET nie może zostać wykonany drugi raz po zgubionej odpowiedzi.
    return JSONP_SAFE_RETRY_ACTIONS.has(String(action || ""));
  }

  async function jsonp(action,params={},options={}) {
    const retry =
      options.retry === false
        ? false
        : jsonpShouldRetry(action);

    try {
      return await jsonpOnce(action,params);
    } catch (err) {
      if (!retry) throw err;
      await new Promise(resolve => setTimeout(resolve,250));
      return jsonpOnce(action,params);
    }
  }


  function formatPaymentsDateTime(value) {

    const text =
      String(value || "").trim();

    if (!text) {
      return "—";
    }

    // Backend może zwrócić gotowy zapis w strefie skryptu.
    const display =
      /^(\d{2})\.(\d{2})\.(\d{4}),\s*(\d{2}):(\d{2})(?::(\d{2}))?$/
        .exec(text);

    if (display) {
      return (
        `${display[1]}.${display[2]}.${display[3]} ` +
        `${display[4]}:${display[5]}` +
        (display[6] ? `:${display[6]}` : "")
      );
    }

    // Stary format YYYY-MM-DD.
    const dateOnly =
      /^(\d{4})-(\d{2})-(\d{2})$/
        .exec(text);

    if (dateOnly) {
      return `${dateOnly[3]}.${dateOnly[2]}.${dateOnly[1]}`;
    }

    // ISO — fallback.
    const date =
      new Date(text);

    if (Number.isFinite(date.getTime())) {
      return date.toLocaleString(
        "pl-PL",
        {
          day:"2-digit",
          month:"2-digit",
          year:"numeric",
          hour:"2-digit",
          minute:"2-digit",
          second:"2-digit"
        }
      );
    }

    return text;
  }

  function formatSaldo(value) {

    return Number(value).toLocaleString(
      "pl-PL",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    );
  }

  function paymentsShare(value) {

    const share =
      Math.max(
        0,
        Number(value) || 0
      );

    return (share * 100)
      .toFixed(2)
      .replace(".", ",") + "%";
  }

  function paymentsRankBadge(index) {
    const position = index + 1;

    if (position === 1) {
      return `<span class="rank-badge gold">1</span>`;
    }

    if (position === 2) {
      return `<span class="rank-badge silver">2</span>`;
    }

    if (position === 3) {
      return `<span class="rank-badge bronze">3</span>`;
    }

    return `<span class="rank-badge normal">${position}</span>`;
  }

  function paymentsRow(player,index=0) {

    const saldo = Number(player.saldo) || 0;

    let stateClass = "zero";
    let status = "🟢 Na bieżąco";
    let amount = "0 zł";

    if (saldo < 0) {
      stateClass = "debt";
      status = "🔴 Dług";
      amount = "-" + formatSaldo(Math.abs(saldo)) + " zł";
    } else if (saldo > 0) {
      stateClass = "credit";
      status = "🔵 Nadpłata";
      amount = "+" + formatSaldo(saldo) + " zł";
    }

    return `
      <div class="finance-player-row ${stateClass} ranked-payment-row">
        <div class="payment-rank">
          ${paymentsRankBadge(index)}
        </div>

        <div class="payment-main">
          <div class="finance-name">
            ${escapeHtml(player.nick)}
          </div>

          <div class="finance-meta">
            <span>${status}</span>
          </div>
        </div>

        <div class="payment-total">
          ${amount}
        </div>
      </div>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function showPaymentsLogin(message="") {
    el("payments-login-status").textContent = message;
    showToolView("gang-gate-view", "gang");
    el("gang-tabs").hidden = true;
  }

  function showPaymentsContent() {
    el("gang-tabs").hidden = false;
    showToolView("payments-view", "gang");
  }

  function playerAccountSessionToken() {
    return localStorage.getItem(PLAYER_ACCOUNT_SESSION_KEY) || "";
  }

  function setPlayerAccountSessionToken(token) {
    if (token) {
      localStorage.setItem(
        PLAYER_ACCOUNT_SESSION_KEY,
        token
      );
    } else {
      localStorage.removeItem(
        PLAYER_ACCOUNT_SESSION_KEY
      );
    }

    cachedAccountStatus = null;
    cachedAccountStatusAt = 0;
    cachedAccountStatusToken = "";
    accountStatusInFlight = null;
  }

  async function playerAccountPostAction(action,data={}) {
    const nonce = makeRecipeNonce();
    let sendError = null;

    try {
      await timedBackendPost(
        action,
        {
          action,
          nonce,
          ...data
        }
      );
    } catch (err) {
      // Nie ponawiamy POST. Backend pamięta wynik pod tym samym nonce.
      sendError = err;
    }

    let result = null;
    for (let i=0;i<20;i++) {
      if (i > 0) await new Promise(resolve => setTimeout(resolve,350));
      try {
        result = await jsonp("playerAccountActionResult",{nonce});
      } catch (err) {
        if (i === 19 && !sendError) sendError = err;
        continue;
      }
      if (result && !result.pending) break;
    }

    if (!result || result.pending) {
      throw sendError || new Error("Serwer nie zwrócił wyniku operacji.");
    }
    if (!result.ok) {
      const err = new Error(result.error || "Operacja nie powiodła się.");
      err.data = result;
      throw err;
    }
    return result;
  }

  let cachedAccountStatus = null;
  let cachedAccountStatusAt = 0;
  let cachedAccountStatusToken = "";
  let accountStatusInFlight = null;

  async function playerAccountStatus(options={}) {
    const token = playerAccountSessionToken();

    if (!token) {
      cachedAccountStatus = null;
      cachedAccountStatusAt = 0;
      cachedAccountStatusToken = "";
      return null;
    }

    const force = Boolean(options.force);
    const strict = Boolean(options.strict);

    const hasCachedAccount =
      Boolean(
        cachedAccountStatus &&
        cachedAccountStatusToken === token
      );
    const cachedAccountFresh =
      hasCachedAccount &&
      Date.now() - cachedAccountStatusAt < 60000;

    if (!force && cachedAccountFresh) {
      return cachedAccountStatus;
    }

    // v21.00.3 — po wygaśnięciu 60 s nie blokujemy nawigacji.
    // Zwracamy ostatni poprawny status i odnawiamy go w tle.
    if (!force && hasCachedAccount) {
      if (!accountStatusInFlight) {
        accountStatusInFlight = (async () => {
          try {
            const result = await jsonp(
              "playerAccountStatus",
              {sessionToken:token}
            );

            if (!result || !result.ok || !result.authenticated) {
              cachedAccountStatus = null;
              cachedAccountStatusAt = 0;
              cachedAccountStatusToken = "";
              setPlayerAccountSessionToken("");
              return null;
            }

            cachedAccountStatus = result;
            cachedAccountStatusAt = Date.now();
            cachedAccountStatusToken = token;
            updateHomeAccountState(result);
            return result;
          } catch (err) {
            return cachedAccountStatusToken === token
              ? cachedAccountStatus
              : null;
          } finally {
            accountStatusInFlight = null;
          }
        })();
      }
      accountStatusInFlight.catch(() => {});
      return cachedAccountStatus;
    }

    if (!force && accountStatusInFlight) {
      return accountStatusInFlight;
    }

    accountStatusInFlight = (async () => {
      try {
        const result =
          await jsonp(
            "playerAccountStatus",
            {sessionToken:token}
          );

        if (
          !result ||
          !result.ok ||
          !result.authenticated
        ) {
          cachedAccountStatus = null;
          cachedAccountStatusAt = 0;
          cachedAccountStatusToken = "";
          setPlayerAccountSessionToken("");
          return null;
        }

        cachedAccountStatus = result;
        cachedAccountStatusAt = Date.now();
        cachedAccountStatusToken = token;
        updateHomeAccountState(result);
        return result;

      } catch (err) {
        // Dla kontroli dostępu można wymusić fail-closed: jeśli świeże
        // potwierdzenie sesji się nie udało, nie otwieramy modułu tylko na
        // podstawie nawet poprawnego wcześniej cache.
        if (strict) return null;
        return cachedAccountStatusToken === token
          ? cachedAccountStatus
          : null;
      } finally {
        accountStatusInFlight = null;
      }
    })();

    return accountStatusInFlight;
  }

  let accountViewRenderInFlight = null;

  const ACHIEVEMENT_CATEGORIES = [
    {id:"distillery",icon:"🥃",medal:"assets/achievements/distillery-medal.png",title:"Destylarnia",items:[
      ["distillery_reserve","Rezerwacja stolika","Zarezerwuj recepturę."],["distillery_result","Wynik spod lady","Wyślij poprawny wynik receptury."],["distillery_accepted","Receptura uznana","Twój wynik zostanie zaakceptowany."],["distillery_import","Księgowy z Excela","Użyj importu wyników z gry."]
    ]},
    {id:"garden",icon:"🌱",medal:"assets/achievements/garden-medal.png",title:"Ogród",items:[
      ["garden_plant_onion","Pierwsza cebulka","Posadź cebulę."],["garden_plant_potato","Ziemniak na próbę","Posadź młode ziemniaki."],["garden_harvest_onion","Cebulowy plon","Zbierz cebulę po co najmniej 40 h."],["garden_harvest_potato","Kartoflany plon","Zbierz ziemniaki po co najmniej 40 h."],["garden_check","Czujne oko","Odpowiedz Tak albo Nie na pytanie o etap."],["garden_checks_three","Dziennik ogrodnika","Zostaw trzy odpowiedzi Tak/Nie w jednej uprawie."]
    ]},
    {id:"pvp",icon:"⚔️",medal:"assets/achievements/pvp-medal.png",title:"PvP",items:[
      ["pvp_build","Gotów do ustawki","Zapisz pierwszy kompletny build."],["pvp_simulation","Próba generalna","Uruchom pierwszą symulację."],["pvp_ai_first","Bolek poszedł spać","W 1 000 walk osiągnij minimum 80% wygranych z pierwszym AI."],["pvp_ai_district","Dzielnica oczyszczona","Osiągnij minimum 80% wygranych z kompletem trzech AI na jednym poziomie."],["pvp_ai_50","Poziom wyżej","Osiągnij minimum 80% wygranych z AI lvl 50."],["pvp_ai_60","Stary wyjadacz","Osiągnij minimum 80% wygranych z AI lvl 60."],["pvp_ai_all","Król melin","Osiągnij minimum 80% wygranych z wszystkimi 27 AI."],["pvp_underdog","Dawid kontra Goliat","Osiągnij minimum 80% wygranych z AI co najmniej 5 poziomów wyżej."],["pvp_hp_2000","Dwa tysiące powodów","Zapisz build z minimum 2 000 HP."],["pvp_attack_1000","Tysiąc argumentów","Zapisz build z minimum 1 000 ATK."],["pvp_defense_1000","Mur z meliny","Zapisz build z minimum 1 000 DEF."],["pvp_public_build","Pokaż, co masz","Udostępnij publiczny build."],["pvp_stat_50","Specjalizacja","Rozdaj 50 punktów w jednym atrybucie."],["pvp_tree_single","Jedna droga","Przy 50 punktach wybierz wszystkie perki A albo wszystkie B."],["pvp_level_50","Weteran ustawki","Zapisz build na poziomie co najmniej 50."],["pvp_public_fight","Ustawka z ulicy","Symuluj walkę z publicznym buildem innej osoby."],["pvp_public_win","Wygrana na dzielni","W 1 000 walk osiągnij 80% wygranych z publicznym buildem innej osoby."]
    ]},
    {id:"map",icon:"🗺️",medal:"assets/achievements/map-medal.png",title:"Mapa",items:[["map_open","Znam teren","Sprawdź mapę."]]},
    {id:"gang",icon:"🏢",medal:"assets/achievements/gang-medal.png",title:"Gang",items:[
      ["gang_overpay_10k","Nadpłata 10k","Osiągnij 10 000 nadpłaty."],["gang_overpay_50k","Nadpłata 50k","Osiągnij 50 000 nadpłaty."],["gang_overpay_100k","Nadpłata 100k","Osiągnij 100 000 nadpłaty."],["gang_overpay_250k","Nadpłata 250k","Osiągnij 250 000 nadpłaty."],["gang_overpay_500k","Nadpłata 500k","Osiągnij 500 000 nadpłaty."],["gang_overpay_1m","Nadpłata 1 mln","Osiągnij 1 000 000 nadpłaty."],["gang_top3","Podium wpłat","Znajdź się w TOP 3 wpłat."],["gang_employed","Etat w melinie","Bądź zatrudniony w Spółce."],["gang_salary_10k","Pensja 10k","Osiągnij należną pensję 10 000 zł."],["gang_salary_50k","Pensja 50k","Osiągnij należną pensję 50 000 zł."],["gang_salary_100k","Pensja 100k","Osiągnij należną pensję 100 000 zł."],["gang_salary_fund","Pensja dla ekipy","Przekaż wypłatę do Funduszu."],["gang_fund_10k","Fundusz 10k","Przekaż 10 000 pensji do Funduszu."],["gang_fund_50k","Fundusz 50k","Przekaż 50 000 pensji do Funduszu."],["gang_fund_100k","Fundusz 100k","Przekaż 100 000 pensji do Funduszu."],["gang_fund_250k","Fundusz 250k","Przekaż 250 000 pensji do Funduszu."],["gang_fund_500k","Fundusz 500k","Przekaż 500 000 pensji do Funduszu."],["gang_fund_1m","Fundusz 1 mln","Przekaż 1 000 000 pensji do Funduszu."],["gang_login","Swój wśród swoich","Zaloguj się do strefy Gangu."],["gang_vote","Głos ulicy","Oddaj głos w ankiecie."],["gang_goal","Plan ekipy","Sprawdź cele Gangu."],["gang_announcements","Wieści z meliny","Przeczytaj ogłoszenia."],["gang_demand","Lista zakupów","Dodaj pierwsze zapotrzebowanie ekipy."]
    ]}
  ];

  const EASTER_EGG_CATEGORY = {
    id:"easter-eggs",icon:"🥚",medal:"assets/achievements/easter-egg-medal.png",title:"Easter eggi",items:[
      ["easter_bolek_mirror","Bolek w lustrze","Zapisz build nazwany Bolek Bimberek i uruchom nim 1 000 walk przeciw Bolekowi Bimberkowi."],
      ["easter_indecisive_president","Niezdecydowany prezes","Po wejściu do Gangu przejdź trzy razy: Spółka → Wpłaty."],
      ["easter_all_districts","Mieszkaniec wszystkich dzielnic","W jednej otwartej sesji Mapy wskaż „Jestem tutaj” w każdej dzielnicy."],
      ["easter_forgetful_watering","Zapominalski podlewacz","W ciągu 30 sekund ustaw suwak podlewania kolejno: 1%, 100%, 1%, 100%. Wartości pomiędzy nie przeszkadzają."]
    ]
  };

  function achievementCategoriesFor(unlocked={}) {
    const eggUnlocked = EASTER_EGG_CATEGORY.items.some(item=>Boolean(unlocked && unlocked[item[0]]));
    return eggUnlocked ? [...ACHIEVEMENT_CATEGORIES,EASTER_EGG_CATEGORY] : ACHIEVEMENT_CATEGORIES;
  }

  function achievementsHtml(unlocked={},expandedCategories=new Set()) {
    const categories=achievementCategoriesFor(unlocked);
    const total=categories.reduce((sum,category)=>sum+category.items.length,0);
    const count=Object.keys(unlocked || {}).filter(id=>categories.some(category=>category.items.some(item=>item[0]===id))).length;
    const percent=total ? Math.round(count/total*100) : 0;
    return `<section class="achievements-card"><div class="achievements-head"><div><strong>🏆 Osiągnięcia</strong><small>${count} odblokowane · ${total-count} pozostałe · ${total} łącznie</small></div><b>${percent}%</b></div><div class="achievements-progress"><i style="width:${percent}%"></i></div>${categories.map(category=>{const complete=category.items.filter(item=>unlocked && unlocked[item[0]]).length;const secretCategory=category.id==="easter-eggs";return `<details class="achievement-category" data-achievement-category="${category.id}"${expandedCategories.has(category.id)?" open":""}><summary><span>${category.icon} ${category.title}</span><small>${complete} / ${category.items.length}</small></summary><div class="achievement-grid">${category.items.map(([id,title,description])=>{const done=Boolean(unlocked && unlocked[id]);const visibleTitle=!secretCategory || done ? title : "???";const visibleDescription=!secretCategory || done ? description : "???";return `<span class="achievement-badge ${done?"done":"locked"}" tabindex="0" title="${escapeHtml(visibleDescription)}"><b><img src="${category.medal}" alt="" aria-hidden="true"></b><span>${escapeHtml(visibleTitle)}</span><small>${escapeHtml(visibleDescription)}</small></span>`;}).join("")}</div></details>`;}).join("")}</section>`;
  }

  function achievementCategoryMedals(unlocked={}) {
    return achievementCategoriesFor(unlocked).map(category=>{
      const complete=category.items.filter(item=>unlocked && unlocked[item[0]]).length;
      const percent=category.items.length ? complete/category.items.length*100 : 0;
      const tier=percent===100 ? "platinum" : percent>=75 ? "gold" : percent>=50 ? "silver" : percent>=25 ? "bronze" : "";
      return Object.assign({},category,{complete,percent,tier});
    }).filter(category=>category.tier);
  }

  function achievementOverallMedal(unlocked={}) {
    const categories=achievementCategoriesFor(unlocked);
    const total=categories.reduce((sum,category)=>sum+category.items.length,0);
    const complete=Object.keys(unlocked || {}).filter(id=>categories.some(category=>category.items.some(item=>item[0]===id))).length;
    const percent=total ? complete/total*100 : 0;
    const tier=percent>=100 ? "platinum" : percent>=75 ? "gold" : percent>=50 ? "silver" : percent>=25 ? "bronze" : "";
    return tier ? {tier,complete,total,percent,medal:`assets/achievements/overall-${tier}.png`} : null;
  }

  function adminPanelIsOpen() {
    const panel = el("admin-view");
    return Boolean(panel && !panel.hidden && panel.isConnected);
  }

  async function renderAccountView(options={}) {
    const forceRefresh =
      Boolean(options.force);

    // Panel Admina jest osadzony wewnątrz widoku Konta. Ponowne zbudowanie
    // account-content usuwałoby go z DOM razem z otwartymi sekcjami i polami,
    // przez co tekst kopiowany przez administratora znikał przy focus/return.
    // Dane panelu odświeżają się wyłącznie ręcznym przyciskiem Admina.
    if (adminPanelIsOpen() && playerAccountSessionToken()) return cachedAccountStatus;

    const box = el("account-content");
    const status = el("account-status");
    const adminHost = el("account-admin-host");
    if (!box) return;

    // Odświeżenie statusu po focusie nie może zwijać kategorii, które
    // użytkownik właśnie przeglądał.
    const expandedAchievementCategories=new Set(
      Array.from(box.querySelectorAll(".achievement-category[open]"))
        .map(item=>String(item.dataset.achievementCategory||""))
        .filter(Boolean)
    );

    // Jeśli status nie jest jeszcze w cache, pokaż od razu jasny stan ładowania
    // zamiast pozostawiać użytkownika z wrażeniem zawieszenia.
    if (
      playerAccountSessionToken() &&
      !cachedAccountStatus
    ) {
      box.innerHTML = `
        <div class="account-card">
          <div class="loading-inline">
            <span class="loading-spinner" aria-hidden="true"></span>
            Ładowanie konta...
          </div>
        </div>
      `;
    }

    if (adminHost) {
      const adminPanel = el("admin-view");
      if (adminPanel && adminPanel.parentElement === adminHost) {
        adminPanel.hidden = true;
      }
    }

    const account =
      await playerAccountStatus({
        force:forceRefresh
      });

    if (!account) {
      box.innerHTML = `
        <div class="account-card">
          <b>🔐 Logowanie</b>
          <div class="account-form" style="margin-top:9px">
            <label><span>Nick z gry</span><input id="account-login-nick" maxlength="40" placeholder="np. RoQ"></label>
            <label><span>Hasło lub kod 24h przy pierwszym logowaniu</span><input id="account-login-password" type="password" maxlength="128" placeholder="Hasło / kod"></label>
            <button id="account-login-button" class="primary-btn" type="button">🔐 Zaloguj</button>
          </div>
          <div class="account-note">Pierwsze logowanie: wpisz swój nick i kod 24h od administratora. Następnie ustawisz własne hasło.</div>
        </div>

        <div id="account-setup" class="account-card" style="margin-top:10px" hidden>
          <b>🔑 Ustaw własne hasło</b>
          <div class="account-form" style="margin-top:8px">
            <input id="account-new-password" type="password" placeholder="Nowe hasło — minimum 8 znaków">
            <input id="account-new-password-2" type="password" placeholder="Powtórz hasło">
            <button id="account-activate-button" class="primary-btn" type="button">✅ Aktywuj konto</button>
          </div>
        </div>

        <div class="account-card" style="margin-top:10px">
          <button id="account-reset-open" type="button">🔑 Mam kod resetujący hasło</button>
          <div id="account-reset-panel" class="account-form" style="margin-top:8px" hidden>
            <input id="account-reset-nick" placeholder="Nick z gry">
            <input id="account-reset-code" type="password" placeholder="Kod 24h">
            <input id="account-reset-password" type="password" placeholder="Nowe hasło">
            <input id="account-reset-password-2" type="password" placeholder="Powtórz nowe hasło">
            <button id="account-reset-button" class="primary-btn" type="button">✅ Ustaw nowe hasło</button>
          </div>
        </div>
      `;

      let pendingNick = "";
      let pendingCode = "";

      el("account-login-button")?.addEventListener("click",async event => {
        const button = event.currentTarget;
        const nick = el("account-login-nick").value.trim();
        const password = el("account-login-password").value;
        if (!nick || !password) { status.textContent="Podaj nick i hasło."; return; }

        setActionLoading(button,status,"Logowanie...");
        try {
          const result = await playerAccountPostAction("playerAccountLogin",{nick,password});
          setPlayerAccountSessionToken(result.session.token);
          status.textContent="✅ Zalogowano.";
          await renderAccountView();
        } catch (err) {
          if (err.data && err.data.needsActivation) {
            pendingNick=nick;
            pendingCode=password;
            el("account-setup").hidden=false;
            status.textContent="Ustaw własne hasło do konta.";
          } else status.textContent=err.message || "Nie udało się zalogować.";
        } finally { clearActionLoading(button); }
      });

      el("account-activate-button")?.addEventListener("click",async event => {
        const button=event.currentTarget;
        const p1=el("account-new-password").value;
        const p2=el("account-new-password-2").value;
        if (!pendingNick || !pendingCode) { status.textContent="Najpierw wpisz nick i kod 24h."; return; }
        if (p1!==p2) { status.textContent="Hasła nie są identyczne."; return; }
        if (p1.length<8) { status.textContent="Hasło musi mieć minimum 8 znaków."; return; }
        setActionLoading(button,status,"Aktywowanie konta...");
        try {
          const result=await playerAccountPostAction("playerAccountActivate",{nick:pendingNick,code:pendingCode,newPassword:p1});
          setPlayerAccountSessionToken(result.session.token);
          status.textContent="✅ Konto zostało aktywowane.";
          await renderAccountView();
        } catch(err) { status.textContent=err.message || "Nie udało się aktywować konta."; }
        finally { clearActionLoading(button); }
      });

      el("account-bootstrap-code-open")?.addEventListener("click",()=>{
        el("account-bootstrap-code-panel").hidden=!el("account-bootstrap-code-panel").hidden;
      });

      el("account-bootstrap-generate-code")?.addEventListener("click",async event=>{
        const button=event.currentTarget;
        const nick=el("account-bootstrap-code-nick").value.trim();
        const password=el("account-bootstrap-old-password").value;
        const resultBox=el("account-bootstrap-code-result");

        if (!nick || !password) {
          status.textContent="Podaj nick i dotychczasowe hasło Admina.";
          return;
        }

        setActionLoading(button,status,"Generowanie kodu...");

        try {
          const result=await playerAccountPostAction(
            "playerAccountBootstrapGenerateCode",
            {nick,legacyAdminPassword:password}
          );

          resultBox.hidden=false;
          resultBox.innerHTML=`Kod dla: <b>${escapeHtml(result.nick)}</b><strong>${escapeHtml(result.code)}</strong><span class="muted">Jednorazowy · ważny 24 godziny</span>`;
          status.textContent="✅ Kod został wygenerowany. Użyj go jako hasła przy pierwszym logowaniu.";
        } catch(err) {
          status.textContent=err.message || "Nie udało się wygenerować kodu.";
        } finally {
          clearActionLoading(button);
        }
      });

      el("account-reset-open")?.addEventListener("click",()=>{
        el("account-reset-panel").hidden=!el("account-reset-panel").hidden;
      });

      el("account-reset-button")?.addEventListener("click",async event => {
        const button=event.currentTarget;
        const nick=el("account-reset-nick").value.trim();
        const code=el("account-reset-code").value.trim();
        const p1=el("account-reset-password").value;
        const p2=el("account-reset-password-2").value;
        if (!nick || !code) { status.textContent="Podaj nick i kod 24h."; return; }
        if (p1!==p2) { status.textContent="Hasła nie są identyczne."; return; }
        if (p1.length<8) { status.textContent="Hasło musi mieć minimum 8 znaków."; return; }
        setActionLoading(button,status,"Resetowanie hasła...");
        try {
          const result=await playerAccountPostAction("playerAccountResetWithCode",{nick,code,newPassword:p1});
          setPlayerAccountSessionToken(result.session.token);
          status.textContent="✅ Hasło zostało zmienione i zalogowano.";
          await renderAccountView();
        } catch(err) { status.textContent=err.message || "Nie udało się zresetować hasła."; }
        finally { clearActionLoading(button); }
      });

      return;
    }

    // Konto staje się źródłem tożsamości dla obecnych funkcji.
    setPlayerIdentityToken && setPlayerIdentityToken(playerAccountSessionToken());

    const profileMedals=achievementCategoryMedals(account.achievements || {});
    const overallMedal=achievementOverallMedal(account.achievements || {});

    box.innerHTML = `
      <div class="account-card logged">
        <div class="account-profile-heading"><b>👤 ${escapeHtml(account.nick)}</b>${overallMedal?`<span class="account-overall-medal ${overallMedal.tier}" title="Postęp ogólny: ${overallMedal.complete} / ${overallMedal.total} (${Math.round(overallMedal.percent)}%)"><img src="${overallMedal.medal}" alt="Medal ogólnego postępu"></span>`:""}</div>
        ${profileMedals.length?`<div class="account-achievement-medals" aria-label="Medale kategorii">${profileMedals.map(category=>`<span class="account-achievement-medal ${category.tier}" title="${escapeHtml(category.title)}: ${category.complete} / ${category.items.length} (${Math.round(category.percent)}%)"><img src="${category.medal}" alt="${escapeHtml(category.title)}"></span>`).join("")}</div>`:""}
        <div style="margin-top:5px">✅ Zalogowany${account.admin ? " · 🛠 Administrator" : ""}</div>
        <div style="margin-top:7px"><span class="account-session-stat">📱 Aktywne sesje: ${Number(account.sessionCount)||0}</span></div>
        <div class="account-actions">
          <button id="account-change-open" type="button">🔑 Zmień hasło</button>
          <button id="account-logout-others" type="button">📱 Wyloguj inne sesje</button>
          <button id="account-logout" class="logout-btn" type="button">🚪 Wyloguj</button>
        </div>

        ${account.admin ? `<div class="account-admin-link"><button id="account-admin-open" class="primary-btn" type="button">🛠 Panel administratora</button></div>` : ""}
      </div>

      <div id="account-change-panel" class="account-card" style="margin-top:10px" hidden>
        <b>🔑 Zmiana hasła</b>
        <div class="account-form" style="margin-top:8px">
          <input id="account-current-password" type="password" placeholder="Aktualne hasło">
          <input id="account-change-password" type="password" placeholder="Nowe hasło">
          <input id="account-change-password-2" type="password" placeholder="Powtórz nowe hasło">
          <button id="account-change-save" class="primary-btn" type="button">✅ Zapisz nowe hasło</button>
        </div>
      </div>
      ${achievementsHtml(account.achievements || {},expandedAchievementCategories)}
    `;

    if (account.admin) {
      // Badge panelu Admina ma być aktualny już na ekranie Konta,
      // bez konieczności otwierania samego panelu.
      loadAdminDashboardStatus()
        .catch(()=>{});
    }

    el("account-change-open")?.addEventListener("click",()=>{
      el("account-change-panel").hidden=!el("account-change-panel").hidden;
    });

    el("account-change-save")?.addEventListener("click",async event => {
      const button=event.currentTarget;
      const currentPassword=el("account-current-password").value;
      const p1=el("account-change-password").value;
      const p2=el("account-change-password-2").value;
      if (p1!==p2) { status.textContent="Nowe hasła nie są identyczne."; return; }
      setActionLoading(button,status,"Zmiana hasła...");
      try {
        const result=await playerAccountPostAction("playerAccountChangePassword",{sessionToken:playerAccountSessionToken(),currentPassword,newPassword:p1});
        setPlayerAccountSessionToken(result.session.token);
        status.textContent="✅ Hasło zostało zmienione.";
        await renderAccountView();
      } catch(err) { status.textContent=err.message || "Nie udało się zmienić hasła."; }
      finally { clearActionLoading(button); }
    });

    el("account-logout-others")
      ?.addEventListener(
        "click",
        async event => {
          const button = event.currentTarget;

          if (
            !window.confirm(
              "Wylogować wszystkie pozostałe sesje tego konta?"
            )
          ) return;

          setActionLoading(
            button,
            status,
            "Wylogowywanie innych sesji..."
          );

          criticalOperationStart(
            "🚫 Wylogowuję inne sesje…",
            "Unieważniam pozostałe sesje i czekam na potwierdzenie serwera."
          );

          try {
            adminLoaderTexts(
              "sessions"
            );

            await playerAccountPostAction(
              "playerAccountLogoutOtherSessions",
              {sessionToken:playerAccountSessionToken()}
            );

            status.textContent =
              "✅ Pozostałe sesje zostały wylogowane.";

            await renderAccountView();

          } catch (err) {
            status.textContent =
              err.message ||
              "Nie udało się wylogować innych sesji.";
          } finally {
            criticalOperationFinish();
            clearActionLoading(button);
          }
        }
      );


    el("account-logout")?.addEventListener("click",async ()=>{
      try { await playerAccountPostAction("playerAccountLogout",{sessionToken:playerAccountSessionToken()}); } catch(err) {}
      setPlayerAccountSessionToken("");
      if (typeof setGangToken === "function") setGangToken("");
      await renderAccountView();
    });

    el("account-bootstrap-admin")?.addEventListener("click",async event=>{
      const button=event.currentTarget;
      const password=el("account-bootstrap-password")?.value || "";
      if (!password) { status.textContent="Wpisz dotychczasowe hasło Admina."; return; }
      setActionLoading(button,status,"Nadawanie uprawnień...");
      criticalOperationStart(
        "🛠 Nadaję pierwszego Admina…",
        "Zapisuję uprawnienie i potwierdzam je świeżym odczytem konta."
      );
      try {
        let sendError=null;
        try {
          await timedBackendPost(
            "playerAccountBootstrapAdmin",
            {
              action:"playerAccountBootstrapAdmin",
              legacyAdminPassword:password,
              sessionToken:playerAccountSessionToken()
            }
          );
        } catch(err) {
          sendError=err;
        }

        await new Promise(resolve=>setTimeout(resolve,400));
        const refreshed=await playerAccountStatus({force:true});
        if (!refreshed || !refreshed.admin) {
          throw sendError || new Error(
            "Nie udało się nadać uprawnień. Sprawdź stare hasło Admina."
          );
        }
        status.textContent="✅ Konto otrzymało uprawnienia administratora.";
        await renderAccountView();
      } catch(err) { status.textContent=err.message || "Nie udało się nadać uprawnień."; }
      finally {
        criticalOperationFinish();
        clearActionLoading(button);
      }
    });

    el("account-admin-open")?.addEventListener("click",()=>{
      const host=el("account-admin-host");
      const panel=el("admin-view");

      if (host && panel) {
        host.appendChild(panel);
        panel.hidden=false;
        el("admin-login").hidden=true;
        el("admin-content").hidden=false;

        closeAllAdminSections();
        setupAdminAccordionLazyLoad();

        const adminNeedsRequest =
          !adminWarmLoadedAt ||
          Date.now() - adminWarmLoadedAt >= 30000;

        if (
          adminNeedsRequest &&
          el("admin-status")
        ) {
          el("admin-status").textContent =
            "⏳ Ładowanie panelu administratora...";
        }

        if (adminNeedsRequest) {
          withRuntimeLoader(
            () => warmAdminData({
              silent:false
            }),
            "🛠️ Odświeżam panel Admina...",
            ['🥫 Admin gdzieś zapodział puszki z serwera...','🧹 Odkurzam ostatnie zakamarki panelu...','🍺 Panel Admina robi dolewkę...','🥴 Backend twierdzi, że już prawie...']
          );
        } else {
          warmAdminData({
            silent:false
          });
        }
      }
    });
  }

  async function warmAdminData(options={}) {
    const force =
      Boolean(options.force);

    const silent =
      Boolean(options.silent);

    if (
      !force &&
      adminWarmLoadedAt &&
      Date.now() - adminWarmLoadedAt < 30000
    ) {
      return true;
    }

    if (adminWarmPromise) {
      return adminWarmPromise;
    }

    if (!playerAccountSessionToken()) {
      return false;
    }

    adminWarmPromise =
      (async () => {
        const previousSilent =
          adminWarmSilent;

        adminWarmSilent =
          silent;

        const results =
          await Promise.allSettled([
            loadAccountAdminPermissions(),
            loadAdminDashboardStatus()
          ]);

        const anyOk =
          results.some(
            item =>
              item.status === "fulfilled"
          );

        if (anyOk) {
          adminWarmLoadedAt =
            Date.now();

          const adminStatus =
            el("admin-status");

          if (
            adminStatus &&
            adminStatus.textContent
              .includes("Ładowanie panelu administratora")
          ) {
            adminStatus.textContent = "";
          }
        }

        adminWarmSilent =
          previousSilent;

        return anyOk;
      })();

    try {
      return await adminWarmPromise;
    } finally {
      adminWarmPromise = null;
    }
  }


  let accountAdminPlayersCache = null;
let accountAdminPlayersCacheAt = 0;
let accountAdminPlayersCacheToken = "";
let accountAdminPlayersInFlight = null;

const ACCOUNT_ADMIN_PLAYERS_TTL_MS =
  60 * 1000;

async function fetchAccountAdminPlayers(
  options={}
) {
  const force =
    Boolean(options.force);

  const token =
    playerAccountSessionToken();

  if (!token) {
    accountAdminPlayersCache = null;
    accountAdminPlayersCacheAt = 0;
    accountAdminPlayersCacheToken = "";
    accountAdminPlayersInFlight = null;
    return null;
  }

  if (
    !force &&
    accountAdminPlayersCache &&
    accountAdminPlayersCacheToken === token &&
    Date.now() - accountAdminPlayersCacheAt <
      ACCOUNT_ADMIN_PLAYERS_TTL_MS
  ) {
    return accountAdminPlayersCache;
  }

  if (accountAdminPlayersInFlight) {
    return accountAdminPlayersInFlight;
  }

  accountAdminPlayersInFlight =
    (async () => {
      try {
        const result =
          await jsonp(
            "accountAdminPlayers",
            {
              sessionToken:token
            }
          );

        if (
          result &&
          result.ok
        ) {
          accountAdminPlayersCache =
            result;

          accountAdminPlayersCacheAt =
            Date.now();

          accountAdminPlayersCacheToken =
            token;
        }

        return result;

      } finally {
        accountAdminPlayersInFlight =
          null;
      }
    })();

  return accountAdminPlayersInFlight;
}


async function loadAccountAdminPermissions(
  options={}
) {
    const holder =
      el("account-admin-permissions");

    if (!holder) return;

    try {
      const result =
        await fetchAccountAdminPlayers({
          force:
            Boolean(options.force)
        });

      if (
        !result ||
        !result.ok
      ) {
        throw new Error(
          result &&
          result.error
            ? result.error
            : "Brak dostępu."
        );
      }

      // v20.9 — ta sama lista graczy zasila również
      // "Kody kont i reset hasła". Nie zależymy już od tego,
      // czy wcześniej załadowano dane Wpłat/Spółki.
      const salaryPlayerSelect =
        el("admin-salary-player");

      if (salaryPlayerSelect) {
        const previous =
          salaryPlayerSelect.value;

        salaryPlayerSelect.innerHTML =
          result.players
            .slice()
            .sort(
              (a,b) =>
                String(a.nick || "")
                  .localeCompare(
                    String(b.nick || ""),
                    "pl"
                  )
            )
            .map(
              player => `
                <option
                  value="${escapeHtml(player.nick)}"
                  data-account-active="${player.accountActive ? "1" : "0"}"
                  data-account-sessions="${Number(player.sessions) || 0}">
                  ${escapeHtml(player.nick)}
                </option>
              `
            )
            .join("");

        if (
          previous &&
          Array.from(
            salaryPlayerSelect.options
          ).some(
            option =>
              option.value === previous
          )
        ) {
          salaryPlayerSelect.value =
            previous;
        }

        refreshAdminAccountCodeStatus();
      }


      holder.innerHTML = `
        <div class="admin-player-permissions-head">
          <b>🛠 Uprawnienia graczy</b>
          <span class="muted">
            Dostęp do Panelu Admina i aktywne sesje kont.
          </span>
        </div>

        <div class="admin-player-permissions-list">
          ${
            result.players
              .map(player => `
                <div class="account-admin-player">
                  <div>
                    <b>${escapeHtml(player.nick)}</b>
                    <small>
                      Konto:
                      ${player.accountActive ? "aktywne" : "nieaktywne"}
                      · Sesje:
                      ${Number(player.sessions) || 0}
                    </small>
                  </div>

                  <button
                    data-account-admin-toggle="${escapeHtml(player.nick)}"
                    data-enabled="${player.admin ? 1 : 0}">
                    ${player.admin ? "✅ Admin" : "Nadaj Admin"}
                  </button>

                  <button
                    data-account-logout="${escapeHtml(player.nick)}">
                    🚫 Wyloguj
                  </button>

                  <button
                    type="button"
                    data-account-rename-player="${escapeHtml(player.nick)}">
                    ✏️ Zmień nick
                  </button>

                  <button
                    type="button"
                    class="account-player-delete"
                    data-account-delete-player="${escapeHtml(player.nick)}">
                    🗑 Usuń
                  </button>
                </div>
              `)
              .join("")
          }
        </div>
      `;

      holder
        .querySelectorAll(
          "[data-account-admin-toggle]"
        )
        .forEach(button => {
          button.onclick =
            async () => {
              criticalOperationStart(
                "🛠 Zmieniam uprawnienia Admina…",
                "Zapisuję zmianę uprawnień gracza."
              );

              try {
                await confirmedAdminMutationPost(
                  "accountAdminSetPermission",
                  {
                    action:
                      "accountAdminSetPermission",
                    sessionToken:
                      playerAccountSessionToken(),
                    nick:
                      button.dataset.accountAdminToggle,
                    enabled:
                      button.dataset.enabled !== "1"
                  },
                  {token:playerAccountSessionToken()}
                );

              accountAdminPlayersCacheAt = 0;

              // Bez sztucznego dodatkowego 400 ms.
              await loadAccountAdminPermissions({
                force:true
              });
              } finally {
                criticalOperationFinish();
              }
            };
        });

      holder
        .querySelectorAll(
          "[data-account-logout]"
        )
        .forEach(button => {
          button.onclick =
            async () => {
              const nick =
                button.dataset.accountLogout;

              if (
                !confirm(
                  `Wylogować ${nick} ze wszystkich sesji?`
                )
              ) {
                return;
              }

              criticalOperationStart(
                "🚫 Wylogowuję sesje gracza…",
                "Unieważniam aktywne sesje tego konta."
              );

              try {
                await confirmedAdminMutationPost(
                  "accountAdminLogoutAll",
                  {
                    action:
                      "accountAdminLogoutAll",
                    sessionToken:
                      playerAccountSessionToken(),
                    nick
                  },
                  {token:playerAccountSessionToken()}
                );

              accountAdminPlayersCacheAt = 0;

              await loadAccountAdminPermissions({
                force:true
              });
              } finally {
                criticalOperationFinish();
              }
            };
        });

      holder
        .querySelectorAll(
          "[data-account-rename-player]"
        )
        .forEach(button => {
          button.onclick =
            async () => {
              await renameAdminPlayer(
                button.dataset.accountRenamePlayer
              );
            };
        });

      holder
        .querySelectorAll(
          "[data-account-delete-player]"
        )
        .forEach(button => {
          button.onclick =
            async () => {
              const nick =
                button.dataset
                  .accountDeletePlayer;

              await deleteAdminPlayer(
                nick
              );

              // deleteAdminPlayer odświeża stare źródło danych;
              // tu odświeżamy również nową, wspólną listę Gracze.
              loadAccountAdminPermissions();
            };
        });

    } catch (err) {
      holder.innerHTML = `
        <div class="muted">
          ${escapeHtml(
            err.message ||
            "Nie udało się pobrać uprawnień."
          )}
        </div>
      `;
    }
  }

  function playerIdentityToken() {
    const current =
      localStorage.getItem(
        PLAYER_IDENTITY_KEY
      ) || "";

    if (current) return current;

    const legacy =
      localStorage.getItem(
        COMPANY_SALARY_IDENTITY_KEY
      ) || "";

    if (legacy) {
      localStorage.setItem(
        PLAYER_IDENTITY_KEY,
        legacy
      );
    }

    return legacy;
  }

  function setPlayerIdentityToken(token) {
    if (token) {
      localStorage.setItem(
        PLAYER_IDENTITY_KEY,
        token
      );

      // zgodność z v17 — moduł pensji używał starego klucza
      localStorage.setItem(
        COMPANY_SALARY_IDENTITY_KEY,
        token
      );
    } else {
      localStorage.removeItem(
        PLAYER_IDENTITY_KEY
      );

      localStorage.removeItem(
        COMPANY_SALARY_IDENTITY_KEY
      );
    }
  }

  function companySalaryIdentityToken() {
    return playerAccountSessionToken() || playerIdentityToken();
  }

  function setCompanySalaryIdentityToken(token) {
    setPlayerIdentityToken(token);
  }

  async function playerIdentityStatus() {
    const token =
      playerIdentityToken();

    if (!token) return null;

    try {
      const result =
        await jsonp(
          "playerIdentityStatus",
          {identityToken:token}
        );

      if (
        !result ||
        !result.ok ||
        !result.authenticated
      ) {
        setPlayerIdentityToken("");
        return null;
      }

      return result;
    } catch (err) {
      return null;
    }
  }

  async function playerIdentityPostAction(
    action,
    data={}
  ) {
    const nonce =
      makeRecipeNonce();

    let sendError = null;

    try {
      await timedBackendPost(
        action,
        {
          action,
          nonce,
          ...data
        }
      );
    } catch (err) {
      sendError = err;
    }

    let result = null;

    for (
      let attempt=0;
      attempt<20;
      attempt++
    ) {
      if (attempt > 0) {
        await new Promise(
          resolve => setTimeout(resolve,350)
        );
      }

      try {
        result =
          await jsonp(
            "playerIdentityActionResult",
            {nonce}
          );
      } catch (err) {
        if (attempt === 19 && !sendError) sendError = err;
        continue;
      }

      if (
        result &&
        !result.pending
      ) {
        break;
      }
    }

    if (
      !result ||
      result.pending
    ) {
      throw sendError || new Error(
        "Serwer nie zwrócił wyniku operacji."
      );
    }

    if (!result.ok) {
      throw new Error(
        result.error ||
        "Operacja nie powiodła się."
      );
    }

    return result;
  }

  async function companySalaryPostAction(
    action,
    data={}
  ) {
    // Aktywacja tożsamości jest od v18 wspólna dla całego Gangu.
    if (
      action ===
      "companyClaimSalaryIdentity"
    ) {
      return playerIdentityPostAction(
        "playerClaimIdentity",
        data
      );
    }

    const nonce =
      makeRecipeNonce();

    let sendError = null;

    try {
      await timedBackendPost(
        action,
        {
          action,
          nonce,
          ...data
        }
      );
    } catch (err) {
      sendError = err;
    }

    let result = null;

    for (
      let attempt=0;
      attempt<20;
      attempt++
    ) {
      if (attempt > 0) {
        await new Promise(
          resolve => setTimeout(resolve,350)
        );
      }

      try {
        result =
          await jsonp(
            "companySalaryActionResult",
            {nonce}
          );
      } catch (err) {
        if (attempt === 19 && !sendError) sendError = err;
        continue;
      }

      if (
        result &&
        !result.pending
      ) {
        break;
      }
    }

    if (
      !result ||
      result.pending
    ) {
      throw sendError || new Error(
        "Serwer nie zwrócił wyniku operacji."
      );
    }

    if (!result.ok) {
      throw new Error(
        result.error ||
        "Operacja nie powiodła się."
      );
    }

    return result;
  }

  async function companySalaryIdentityStatus() {
    const account =
      await playerAccountStatus();

    if (!account) {
      return null;
    }

    return {
      ok:true,
      authenticated:true,
      nick:account.nick,
      expiresAt:account.expiresAt
    };
  }

  async function renderPlayerIdentitySettings() {
    const box =
      el("player-identity-box");

    const status =
      el("player-identity-status");

    if (!box) return;

    const identity =
      await playerIdentityStatus();

    if (!identity) {
      box.innerHTML = `
        <div class="identity-card">
          <b>🔐 Potwierdź swoją tożsamość</b>

          <p class="muted">
            Jednorazowy kod otrzymasz od administratora.
            Po aktywacji to urządzenie będzie mogło korzystać z funkcji przypisanych do Twojego nicku.
          </p>

          <div class="salary-identity-grid">
            <label>
              <span>Twój nick</span>
              <input
                id="player-identity-nick"
                type="text"
                maxlength="40"
                placeholder="np. RoQ">
            </label>

            <label>
              <span>Kod aktywacyjny</span>
              <input
                id="player-identity-code"
                type="text"
                maxlength="12"
                autocomplete="one-time-code"
                placeholder="XXXXXXXX">
            </label>

            <button
              id="player-identity-claim"
              class="primary-btn"
              type="button">
              🔓 Aktywuj
            </button>
          </div>
        </div>
      `;

      el("player-identity-claim")
        ?.addEventListener(
          "click",
          async event => {
            const button =
              event.currentTarget;

            const nick =
              el("player-identity-nick")
                .value.trim();

            const code =
              el("player-identity-code")
                .value.trim();

            if (!nick || !code) {
              status.textContent =
                "Podaj nick i kod aktywacyjny.";
              return;
            }

            setActionLoading(
              button,
              status,
              "Aktywowanie..."
            );

            try {
              const result =
                await playerIdentityPostAction(
                  "playerClaimIdentity",
                  {nick,code}
                );

              setPlayerIdentityToken(
                result.token
              );

              status.textContent =
                `✅ To urządzenie zostało przypisane do: ${result.nick}.`;

              await renderPlayerIdentitySettings();

            } catch (err) {
              status.textContent =
                err.message ||
                "Nie udało się aktywować dostępu.";
            } finally {
              clearActionLoading(button);
            }
          }
        );

      return;
    }

    box.innerHTML = `
      <div class="identity-card identity-ok">
        <b>👤 Tożsamość gracza</b>

        <div style="margin-top:6px">
          Zalogowany jako:
          <strong>${escapeHtml(identity.nick)}</strong>
        </div>

        <div class="muted" style="margin-top:4px">
          ✅ To urządzenie jest potwierdzone.
        </div>

        <button
          id="player-identity-logout"
          class="logout-btn"
          type="button"
          style="margin-top:8px">
          🔒 Odłącz tożsamość
        </button>
      </div>
    `;

    el("player-identity-logout")
      ?.addEventListener(
        "click",
        async () => {
          setPlayerIdentityToken("");

          status.textContent =
            "Tożsamość została odłączona na tym urządzeniu.";

          await renderPlayerIdentitySettings();
        }
      );
  }

  function pollPercent(
    count,
    total
  ) {
    return total
      ? Math.round(
          count /
          total *
          100
        )
      : 0;
  }

  let gangPollsLoadInFlight = null;
  let gangPollsCache = null;
  let gangPollsCacheAt = 0;
  let gangPollsCacheToken = "";
  const GANG_POLLS_CACHE_TTL_MS = 60 * 1000;

  function invalidateGangPollsCache() {
    gangPollsCache = null;
    gangPollsCacheAt = 0;
    gangPollsCacheToken = "";
  }

  async function fetchGangPollsPayload(options={}) {
    const force = Boolean(options.force);
    const token = playerAccountSessionToken();

    if (!token) {
      invalidateGangPollsCache();
      return null;
    }

    if (
      !force &&
      gangPollsCache &&
      gangPollsCacheToken === token &&
      Date.now() - gangPollsCacheAt < GANG_POLLS_CACHE_TTL_MS
    ) {
      return gangPollsCache;
    }

    if (gangPollsLoadInFlight) {
      return gangPollsLoadInFlight;
    }

    gangPollsLoadInFlight = (async () => {
      try {
        const payload = await jsonp(
          "gangPolls",
          {
            sessionToken: token,
            identityToken: token
          }
        );

        if (payload && payload.ok !== false) {
          gangPollsCache = payload;
          gangPollsCacheAt = Date.now();
          gangPollsCacheToken = token;
        }

        return payload;
      } finally {
        gangPollsLoadInFlight = null;
      }
    })();

    return gangPollsLoadInFlight;
  }

  async function loadGangPolls(options={}) {
    const box =
      el("gang-polls-list");

    if (!box) return;

    try {
      const payload =
        await fetchGangPollsPayload(options);

      const polls =
        Array.isArray(
          payload &&
          payload.polls
        )
          ? payload.polls
          : [];

      box.innerHTML =
        polls.length
          ? polls.map(poll => {
              const total =
                Number(
                  poll.totalVotes
                ) || 0;

              const isOpen =
                poll.status === "OPEN";

              return `
                <article class="poll-card ${isOpen ? "" : "closed"}">
                  <div class="poll-title">
                    ${escapeHtml(poll.title)}
                  </div>

                  <div class="poll-question">
                    ${escapeHtml(poll.question)}
                  </div>

                  ${
                    !payload.authenticated &&
                    isOpen
                      ? `
                          <div class="poll-auth-note">
                            🔐 Potwierdź swoją tożsamość w
                            <b>Gang → Ustawienia</b>,
                            aby zagłosować.
                          </div>
                        `
                      : ""
                  }

                  ${
                    poll.options
                      .map(
                        (option,index) => {
                          const count =
                            Number(
                              poll.counts &&
                              poll.counts[index]
                            ) || 0;

                          const pct =
                            pollPercent(
                              count,
                              total
                            );

                          const selected =
                            Number(
                              poll.myVote
                            ) === index;

                          return `
                            <div class="poll-option">
                              <button
                                type="button"
                                data-poll-id="${escapeHtml(poll.id)}"
                                data-poll-option="${index}"
                                class="${selected ? "selected" : ""}"
                                ${isOpen ? "" : "disabled"}>
                                ${selected ? "✅ " : ""}
                                ${escapeHtml(option)}
                              </button>

                              <div class="poll-bar">
                                <div style="width:${pct}%"></div>
                              </div>

                              <div class="poll-option-meta">
                                <span>${count} gł.</span>
                                <span>${pct}%</span>
                              </div>
                            </div>
                          `;
                        }
                      )
                      .join("")
                  }

                  <div class="muted">
                    Głosowało:
                    <b>${total}</b>
                    ·
                    ${
                      isOpen
                        ? "ankieta otwarta"
                        : "ankieta zamknięta"
                    }
                  </div>
                </article>
              `;
            }).join("")
          : `
              <div class="empty">
                Brak ankiet.
              </div>
            `;

      box
        .querySelectorAll(
          "[data-poll-id]"
        )
        .forEach(button => {
          button.addEventListener(
            "click",
            async () => {
              if (button.disabled) {
                return;
              }

              const account =
                await playerAccountStatus();

              if (!account) {
                window.alert(
                  "🔐 Zaloguj się na Konto, aby zagłosować."
                );
                return;
              }

              try {
                await playerIdentityPostAction(
                  "gangPollVote",
                  {
                    identityToken:
                      playerAccountSessionToken(),
                    pollId:
                      button.dataset.pollId,
                    optionIndex:
                      Number(
                        button.dataset.pollOption
                      )
                  }
                );

                invalidateGangPollsCache();
                await loadGangPolls({force:true});
                achievementTrack(["gang_vote"]);

              } catch (err) {
                window.alert(
                  err.message ||
                  "Nie udało się zapisać głosu."
                );
              }
            }
          );
        });

    } catch (err) {
      box.innerHTML = `
        <div class="empty">
          Nie udało się pobrać ankiet.
        </div>
      `;
    }
  }

  async function renderCompanySalarySelfService(payload) {
    const box = el("company-salary-identity-box");
    const status = el("company-salary-self-status");

    if (!box) return;

    const identity = await companySalaryIdentityStatus();

    if (!identity) {
      box.innerHTML = `
        <div class="salary-identity-card">
          <b>🔐 Zaloguj się na swoje Konto</b>
          <p class="muted">
            Aby zarządzać własną pensją, zaloguj się w
            <b>Konto</b>.
          </p>
        </div>
      `;
      return;
    }

    const players = Array.isArray(payload && payload.players)
      ? payload.players
      : [];

    const player = players.find(item =>
      String(item.nick || "").trim().toLocaleLowerCase("pl-PL") ===
      String(identity.nick || "").trim().toLocaleLowerCase("pl-PL")
    );

    const eligible =
      player &&
      Number(
        player.salary
      ) > 0;

    const proposedWaived =
      Boolean(
        player &&
        player.salaryWaived
      );

    const requestedWaived =
      Boolean(
        player &&
        player.salaryWaived
      );

    const planPending =
      Boolean(
        player &&
        player.planPending
      );

    const money = value =>
      (Number(value) || 0).toLocaleString("pl-PL",{maximumFractionDigits:2}) + " zł";

    box.innerHTML = `
      <div class="salary-waiver-card ${proposedWaived ? "waived" : ""}">
        <b>💰 Twoja pensja — ${escapeHtml(identity.nick)}</b>

        ${
          eligible
            ? `
                <div class="finance-meta" style="margin-top:6px">
                  <span>Należna pensja: <strong>${money(player.salary)}</strong></span>
                  <span>🎮 Pensja: <strong>${money(player.payoutSalary ?? player.salary)}</strong></span>
                  ${proposedWaived ? `<span>💚 Fundusz: <strong>${money(player.waivedAmount)}</strong></span>` : ""}
                </div>

                <div class="salary-waiver-actions">
                  <div class="salary-waiver-note">
                    ${
                      planPending
                        ? (
                            requestedWaived
                              ? "💾 Zrzeczenie jest zapisane w planie proponowanym. Zacznie obowiązywać po ustawieniu pensji w grze przez Administrację."
                              : "💾 Pełna pensja jest zapisana w planie proponowanym. Zacznie obowiązywać po ustawieniu pensji w grze przez Administrację."
                          )
                        : (
                            requestedWaived
                              ? "Dobrowolnie zrzekasz się części pensji ponad minimalne 160 zł. Po wypłacie kwota trafi do Funduszu i zwiększy Twój wkład wraz z bonusem 1,4%."
                              : "Możesz zrzec się części pensji ponad minimalne 160 zł. Po wypłacie 100% tej kwoty trafi do Funduszu i zostanie doliczone do Twojego wkładu wraz z bonusem 1,4%."
                          )
                    }
                  </div>

                  <button
                    id="company-salary-waiver-toggle"
                    class="${requestedWaived ? "logout-btn" : "primary-btn"}"
                    type="button">
                    ${requestedWaived ? "↩️ Przywróć pensję" : "💚 Zrzekam się pensji"}
                  </button>
                </div>
              `
            : `<p class="muted">Nie masz obecnie naliczanej pensji udziałowca.</p>`
        }
      </div>
    `;

    el("company-salary-waiver-toggle")?.addEventListener("click",async event => {
      const button = event.currentTarget;
      const nextWaived =
        !requestedWaived;

      if (!window.confirm(
        nextWaived
          ? "Zrzec się pensji ponad minimalne 160 zł? Różnica trafi do Funduszu."
          : "Przywrócić pełną należną pensję?"
      )) return;

      setActionLoading(
        button,
        status,
        nextWaived ? "Zapisywanie rezygnacji..." : "Przywracanie pensji..."
      );

      try {
        await companySalaryPostAction("companySetSalaryWaiver",{
          identityToken:
            playerAccountSessionToken(),
          waived:nextWaived
        });

        status.textContent =
          "✅ Zapisano w planie proponowanym. Zmiana zacznie obowiązywać po ustawieniu pensji w grze przez Administrację.";

        await loadPayments({
          background:true,
          force:true
        });
      } catch (err) {
        status.textContent = err.message || "Nie udało się zapisać decyzji.";
      } finally {
        clearActionLoading(button);
      }
    });
  }


  function renderCompanySummary(payload) {
    const box = el("company-summary");
    if (!box) return;

    const players = Array.isArray(payload && payload.players)
      ? payload.players
      : [];

    const eligible = players
      .filter(player => Number(player.share) > 0 || Number(player.salary) > 0)
      .sort((a,b) => Number(b.contribution || 0) - Number(a.contribution || 0));

    const money = value =>
      (Number(value) || 0).toLocaleString("pl-PL",{maximumFractionDigits:2}) + " zł";

    const snapshotLabel =
      payload.snapshotUpdatedAtDisplay ||
      payload.updatedAtDisplay ||
      payload.updatedAt ||
      payload.saldoDate ||
      "—";

    box.innerHTML = `
      <div class="company-snapshot-info">
        💾 Wpłaty: snapshot z <strong>${escapeHtml(formatPaymentsDateTime(snapshotLabel))}</strong>
      </div>

      <div class="company-grid">
        <div class="company-stat"><small>Dzienny dochód</small><b>${money(payload.companyIncome)}</b></div>
        <div class="company-stat"><small>Budżet pensji 50%</small><b>${money(payload.salaryBudget)}</b></div>
        <div class="company-stat"><small>Rozwój 50%</small><b>${money(payload.developmentBudget)}</b></div>
        <div class="company-stat"><small>Udziałowcy ≥ 30 000</small><b>${Number(payload.eligibleCount) || 0}</b></div>
      </div>

      ${
        Number(payload.waivedToFund) > 0
          ? `
              <div class="salary-fund-highlight company-fund-top">
                <strong>
                  💚 Dobrowolnie przekazane pensje:
                  +${money(payload.waivedToFund)}
                </strong>
                <br>
                <strong>
                  Fundusz łącznie z częścią rozwojową:
                  ${money(payload.fundTotal)}
                </strong>
              </div>
            `
          : ""
      }

      <div
        id="company-salary-self-service"
        class="salary-self-service company-salary-top">
        <div id="company-salary-identity-box">
          <div class="muted">
            Przygotowuję Twoją pensję...
          </div>
        </div>
        <div
          id="company-salary-self-status"
          class="submit-status"></div>
      </div>

      <h3 class="company-shares-title">
        Udziały i przewidywane pensje
      </h3>

      <div class="company-list">
        ${
          eligible.length
            ? eligible.map(player => `
                <div class="finance-player-row credit">
                  <div class="finance-name">
                    ${escapeHtml(player.nick)}
                    ${player.salaryWaived ? `<span class="salary-waived-badge">💚 pensja dla Funduszu</span>` : ""}
                    ${
                      player.waiverPending
                        ? `
                            <span class="company-waiver-pending">
                              ${
                                player.requestedSalaryWaived
                                  ? "💾 zrzeczenie od następnego przeliczenia"
                                  : "💾 pełna pensja od następnego przeliczenia"
                              }
                            </span>
                          `
                        : ""
                    }
                  </div>

                  <div class="finance-meta">
                    <span>🏢 Wkład: <strong>${money(player.contribution)}</strong></span>
                  </div>

                  <div class="company-contribution-breakdown">
                    Wpłaty ${money(player.paymentsContribution)}
                    · Fundusz ${money(player.fundGiven)}
                    · Bonus ${money(player.fundBonus)}
                  </div>

                  <div class="finance-meta company-salary-line">
                    <span>Udział: <strong>${(Number(player.share || 0)*100).toLocaleString("pl-PL",{minimumFractionDigits:2,maximumFractionDigits:2})}%</strong></span>
                    <span>💰 Należna: <strong>${money(player.salary)}</strong></span>

                    ${
                      player.salaryWaived
                        ? `
                            <span>🎮 Pensja: <strong>${money(player.payoutSalary)}</strong></span>
                            <span>💚 Fundusz: <strong>${money(player.waivedAmount)}</strong></span>
                          `
                        : ""
                    }
                  </div>
                </div>
              `).join("")
            : `<div class="empty">Nikt nie osiągnął jeszcze progu 30 000 zł wkładu.</div>`
        }
      </div>

      <p class="muted" style="margin-top:10px">
        Dobrowolnie zrzeczona część pensji trafia w 100% do Funduszu i jest zapisywana jako wkład gracza.
        Do niej doliczany jest bonus 1,4%. Ucięte grosze pozostają w Funduszu Spółki, ale nie są przypisywane graczowi.
        Udział jest liczony z łącznego wkładu według wagi wkład<sup>0,8</sup>.
        Widoczne kwoty są planem proponowanym; wypłata 03:00 jest rozliczana według ostatniego planu potwierdzonego przez Administrację.
        Zmiana zrzeczenia zaczyna obowiązywać dopiero po następnym przeliczeniu pensji przez Administrację.
      </p>
    `;

    renderCompanySalarySelfService(payload);
  }

  function gangFormatNumber(value) {
    return (Number(value) || 0).toLocaleString(
      "pl-PL",
      {maximumFractionDigits:2}
    );
  }

  function renderGangGoal(payload) {
    const box = el("gang-goal-content");
    if (!box) return;
const goal = payload && payload.goal;

    if (!goal) {
      box.innerHTML = `
        <div class="empty">
          🎯 Administrator nie ustawił jeszcze aktywnego celu gangu.
        </div>
      `;
      return;
    }

    const current = Math.max(0, Number(goal.current) || 0);
    const target = Math.max(0, Number(goal.target) || 0);
    const percent = target > 0
      ? Math.max(0, Math.min(100, current / target * 100))
      : 0;
    const unit = String(goal.unit || "").trim();
    const suffix = unit ? ` ${escapeHtml(unit)}` : "";

    box.innerHTML = `
      <div class="gang-goal-card">
        <div class="muted">🎯 Aktualny cel</div>
        <h3 style="margin:4px 0 6px">
          ${escapeHtml(goal.title)}
        </h3>

        <div>
          <b>${gangFormatNumber(current)}${suffix}</b>
          /
          ${gangFormatNumber(target)}${suffix}
        </div>

        <div class="gang-progress-track">
          <div
            class="gang-progress-fill"
            style="width:${percent}%">
          </div>
        </div>

        <div class="muted">
          ${percent.toFixed(1).replace(".",",")}% ukończone
          ${current < target
            ? ` · brakuje ${gangFormatNumber(target-current)}${suffix}`
            : " · ✅ cel osiągnięty"}
        </div>
      </div>
    `;
  }

  function gangAnnouncementDate(timestamp) {
    const date = new Date(Number(timestamp));
    if (!Number.isFinite(date.getTime())) return "";

    return date.toLocaleString(
      "pl-PL",
      {
        day:"2-digit",
        month:"2-digit",
        year:"numeric",
        hour:"2-digit",
        minute:"2-digit"
      }
    );
  }

  let gangGoalInFlight = null;
  let gangAnnouncementsInFlight = null;

  async function loadGangGoal() {
    if (gangGoalInFlight) return gangGoalInFlight;

    gangGoalInFlight = (async () => {
      const token = gangToken();
      if (!token) return null;

      const payload = await jsonp("gangGoal",{sessionToken:token});
      if (!payload || !payload.ok) {
        throw new Error(payload && payload.error ? payload.error : "Nie udało się pobrać celu.");
      }
      renderGangGoal(payload);
      achievementTrack(["gang_goal"]);
      return payload;
    })();

    try { return await gangGoalInFlight; }
    finally { gangGoalInFlight = null; }
  }

  async function loadGangAnnouncements() {
    if (gangAnnouncementsInFlight) return gangAnnouncementsInFlight;

    gangAnnouncementsInFlight = (async () => {
      const token = gangToken();
      if (!token) return null;

      const payload = await jsonp("gangAnnouncements",{sessionToken:token});
      if (!payload || !payload.ok) {
        throw new Error(payload && payload.error ? payload.error : "Nie udało się pobrać ogłoszeń.");
      }
      renderGangAnnouncements(payload);
      achievementTrack(["gang_announcements"]);
      return payload;
    })();

    try { return await gangAnnouncementsInFlight; }
    finally { gangAnnouncementsInFlight = null; }
  }

  function renderGangAnnouncements(payload) {
    const box = el("gang-announcements-content");
    if (!box) return;

    const announcements =
      Array.isArray(payload && payload.announcements)
        ? payload.announcements
        : [];

    box.innerHTML = announcements.length
      ? announcements.map(item => `
          <article class="announcement-card ${item.important ? "important" : ""}">
            <div class="announcement-meta">
              <span>
                ${item.important ? "📌 Ważne" : "📢 Ogłoszenie"}
              </span>
              <span>${escapeHtml(gangAnnouncementDate(item.createdAt))}</span>
            </div>
            <div style="white-space:pre-wrap">
              ${escapeHtml(item.text)}
            </div>
          </article>
        `).join("")
      : `
          <div class="empty">
            📢 Brak aktywnych ogłoszeń.
          </div>
        `;
  }

  function renderGangPayload(payload) {
    if (!payload) return;

    renderCompanySummary(payload);

    const players =
      Array.isArray(payload.players)
        ? payload.players
        : [];

    el("payments-date").textContent =
      "Stan na: " +
      formatPaymentsDateTime(
        payload.updatedAtDisplay ||
        payload.updatedAt ||
        payload.saldoDate
      );

    el("payments-count").textContent =
      `Graczy: ${players.length}`;

    const rankedPlayers =
      players
        .slice()
        .sort((a,b) =>
          (Number(b.saldo) || 0) -
          (Number(a.saldo) || 0)
          ||
          String(a.nick || "")
            .localeCompare(
              String(b.nick || ""),
              "pl"
            )
        );

    el("payments-list").innerHTML =
      rankedPlayers.length
        ? rankedPlayers
            .map((player,index) =>
              paymentsRow(player,index)
            )
            .join("")
        : `<div class="empty">Brak danych do wyświetlenia.</div>`;
  }

  let paymentsLoadInFlight = null;

  async function loadPayments(options={}) {
    const force =
      Boolean(options.force);

    if (paymentsLoadInFlight) {
      if (force) {
        // Czekamy aż poprzednie pobranie się skończy i wykonujemy
        // jeszcze jedno świeże pobranie. To ważne m.in. po zmianie
        // zrzeczenia pensji, aby użytkownik od razu zobaczył nowy stan.
        try {
          await paymentsLoadInFlight;
        } catch (err) {
          // Kolejny request poniżej i tak pobierze świeży stan.
        }
      } else {
        if (latestGangPayload) {
          renderGangPayload(latestGangPayload);
        }
        return paymentsLoadInFlight;
      }
    }

    paymentsLoadInFlight = (async () => {

    const token = gangToken();

    if (!token) {
      showPaymentsLogin();
      return;
    }

    const background = Boolean(options.background);

    if (!background) {
      showPaymentsContent();
    }

    if (latestGangPayload) {
      renderGangPayload(latestGangPayload);
    }

    if (!background) {
      el("payments-status").textContent =
        latestGangPayload
          ? ""
          : "Pobieranie danych...";
    }

    try {

      const payload =
        await jsonp(
          "payments",
          {token}
        );

      if (!payload || !payload.ok) {

        if (
          payload &&
          String(payload.error || "").toLowerCase().includes("brak dostępu")
        ) {
          setGangToken("");
          setPlayerAccountSessionToken("");

          el("gang-tabs").hidden =
            true;

          showToolView(
            "gang-gate-view",
            "gang"
          );

          return;
        }

        throw new Error(
          payload && payload.error
            ? payload.error
            : "Nie udało się pobrać wpłat."
        );
      }

      latestGangPayload = payload;
      latestGangPayloadAt = Date.now();
      renderGangPayload(payload);

      if (!background) {
        el("payments-status").textContent = "";
      }

    } catch (err) {

      if (!background) {
        el("payments-status").textContent =
          err && err.message
            ? err.message
            : "Nie udało się pobrać danych.";
      }
    }
  
    })();

    try {
      return await paymentsLoadInFlight;
    } finally {
      paymentsLoadInFlight = null;
    }
  }

  async function loginToPayments(event) {

    event.preventDefault();

    const password =
      el("payments-password").value;

    const status =
      el("payments-login-status");

    if (!password) {
      status.textContent = "Wpisz hasło gangu.";
      return;
    }

    if (!backendConfigured()) {
      status.textContent = "Backend nie jest skonfigurowany.";
      return;
    }

    const nonce = makeNonce();

    status.textContent = "Sprawdzanie hasła...";

    try {
      let sendError = null;

      try {
        await timedBackendPost(
          "gangLogin",
          {
            action:"gangLogin",
            nonce,
            password
          }
        );
      } catch (err) {
        sendError = err;
      }

      let result = null;

      for (let i=0; i<12; i++) {

        await new Promise(
          resolve => setTimeout(resolve, 500)
        );

        result =
          await jsonp(
            "gangLoginResult",
            {nonce}
          );

        if (!result || !result.pending) {
          break;
        }
      }

      if (!result || result.pending) {
        throw sendError || new Error(
          "Serwer nie zwrócił wyniku logowania. Spróbuj ponownie."
        );
      }

      if (!result.ok || !result.token) {
        status.textContent =
          result.error || "Nieprawidłowe hasło.";
        return;
      }

      setGangToken(result.token);
      el("payments-password").value = "";
      status.textContent = "";

      await loadPayments();
      achievementTrack(["gang_login"]);

    } catch (err) {

      status.textContent =
        err && err.message
          ? err.message
          : "Nie udało się zalogować.";
    }
  }

  function setupPayments() {
    el("payments-refresh")?.addEventListener("click",async ()=>{
      await openGangModule(
        "payments-view",
        {forceRefresh:true}
      );
    });

    el("gang-tabs").hidden = true;
  }


  // ============================================================
// PANEL ADMINISTRATORA
// ============================================================

let adminPaymentsSnapshot = null;
let latestGangPayload = null;
let latestGangPayloadAt = 0;
const GANG_PAYLOAD_TTL_MS = 5 * 1000;
let gangSessionValidationAt = 0;


// ============================================================
// v20.74 — CENTRALNA INVALIDACJA CACHE
// ============================================================

function invalidateAppCache(scope) {
  const scopes =
    Array.isArray(scope)
      ? scope
      : [scope];

  scopes.forEach(name => {
    switch (name) {

      case "gang-finance":
      case "payments":
      case "company":
        latestGangPayload = null;
        latestGangPayloadAt = 0;

        if (
          typeof adminSectionLoadedAt !== "undefined"
        ) {
          adminSectionLoadedAt.delete(
            "admin-section-payments"
          );
        }
        break;

      case "admin":
        adminWarmLoadedAt = 0;

        if (
          typeof adminSectionLoadedAt !== "undefined"
        ) {
          adminSectionLoadedAt.clear();
        }
        break;

      case "admin-company":
        if (
          typeof adminSectionLoadedAt !== "undefined"
        ) {
          adminSectionLoadedAt.delete(
            "admin-section-payments"
          );
        }
        break;

      case "admin-submissions":
        if (
          typeof adminSectionLoadedAt !== "undefined"
        ) {
          adminSectionLoadedAt.delete(
            "admin-section-submissions"
          );
        }
        break;

      case "admin-reservations":
        if (
          typeof adminSectionLoadedAt !== "undefined"
        ) {
          adminSectionLoadedAt.delete(
            "admin-section-reservations"
          );
        }
        break;

      case "builds":
        buildListsLoaded = false;

        if (
          typeof adminSectionLoadedAt !== "undefined"
        ) {
          adminSectionLoadedAt.delete(
            "admin-section-builds"
          );
        }
        break;

      case "distillery":
        distilleryDataLoaded = false;
        break;

      case "garden":
        gardenDataLoaded = false;
        break;

      case "account":
        cachedAccountStatus = null;
        cachedAccountStatusAt = 0;
        cachedAccountStatusToken = "";
        accountStatusInFlight = null;

        accountAdminPlayersCache = null;
        accountAdminPlayersCacheAt = 0;
        accountAdminPlayersCacheToken = "";
        accountAdminPlayersInFlight = null;
        break;

      case "admin-accounts":
        accountAdminPlayersCache = null;
        accountAdminPlayersCacheAt = 0;
        accountAdminPlayersCacheToken = "";
        accountAdminPlayersInFlight = null;

        if (
          typeof adminSectionLoadedAt !== "undefined"
        ) {
          adminSectionLoadedAt.delete(
            "admin-section-salary-access"
          );
          adminSectionLoadedAt.delete(
            "admin-section-players"
          );
        }
        break;

      case "all":
        latestGangPayload = null;
        latestGangPayloadAt = 0;
        adminWarmLoadedAt = 0;
        distilleryDataLoaded = false;
        gardenDataLoaded = false;
        buildListsLoaded = false;

        if (
          typeof adminSectionLoadedAt !== "undefined"
        ) {
          adminSectionLoadedAt.clear();
        }

        cachedAccountStatus = null;
        cachedAccountStatusAt = 0;
        cachedAccountStatusToken = "";
        accountStatusInFlight = null;

        accountAdminPlayersCache = null;
        accountAdminPlayersCacheAt = 0;
        accountAdminPlayersCacheToken = "";
        accountAdminPlayersInFlight = null;
        break;
    }
  });
}




// v20.11 — jeden wspólny preload Admina.
// Kliknięcie panelu podczas prefetchu nie uruchamia drugiego kompletu requestów.
let adminWarmPromise = null;
let adminWarmLoadedAt = 0;
let adminWarmSilent = false;

function adminToken() {
  return playerAccountSessionToken() || localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}


function setAdminToken(token) {

  if (token) {
    localStorage.setItem(
      ADMIN_TOKEN_KEY,
      token
    );
  } else {
    localStorage.removeItem(
      ADMIN_TOKEN_KEY
    );
  }
}


function showAdminLogin(message="") {

  el("admin-login").hidden = false;
  el("admin-content").hidden = true;

  el("admin-login-status").textContent =
    message;
}


function setActionLoading(button,statusEl,text="Zapisywanie...") {
  if (button) {
    button.disabled = true;
    button.dataset.originalText =
      button.dataset.originalText ||
      button.innerHTML;
    button.innerHTML =
      `<span class="loading-spinner" aria-hidden="true"></span> ${escapeHtml(text)}`;
  }

  if (statusEl) {
    statusEl.innerHTML =
      `<span class="loading-inline">
        <span class="loading-spinner" aria-hidden="true"></span>
        ${escapeHtml(text)}
      </span>`;
  }
}

function clearActionLoading(button) {
  if (!button) return;

  button.disabled = false;

  if (button.dataset.originalText) {
    button.innerHTML =
      button.dataset.originalText;
    delete button.dataset.originalText;
  }
}

let criticalOperationDepth = 0;

function criticalOperationEnsureOverlay() {
  let overlay = document.getElementById("critical-operation-overlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "critical-operation-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="critical-operation-card" role="status" aria-live="polite">
        <div class="critical-operation-hourglass">⌛</div>
        <strong id="critical-operation-title">Zapisywanie zmian…</strong>
        <div id="critical-operation-text">Poczekaj na zakończenie operacji.</div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  return overlay;
}

function criticalOperationStart(title,text="Nie zamykaj strony i nie klikaj ponownie.") {
  criticalOperationDepth++;
  const overlay = criticalOperationEnsureOverlay();
  const titleEl = overlay.querySelector("#critical-operation-title");
  const textEl = overlay.querySelector("#critical-operation-text");

  if (titleEl) titleEl.textContent = title || "Zapisywanie zmian…";
  if (textEl) textEl.textContent = text;

  overlay.hidden = false;
  document.documentElement.classList.add("critical-operation-active");
}

function criticalOperationFinish() {
  criticalOperationDepth = Math.max(0,criticalOperationDepth-1);
  if (criticalOperationDepth > 0) return;

  const overlay = document.getElementById("critical-operation-overlay");
  if (overlay) overlay.hidden = true;
  document.documentElement.classList.remove("critical-operation-active");
}

async function timedBackendPost(
  action,
  body,
  options={}
) {
  const startedAt = requestTimingNow();
  const timeoutMs =
    Math.max(3000,Number(options.timeoutMs) || 20000);

  const controller =
    typeof AbortController !== "undefined"
      ? new AbortController()
      : null;

  const timer =
    controller
      ? setTimeout(() => controller.abort(),timeoutMs)
      : null;

  try {
    // Krytyczny zapis POST nigdy nie jest automatycznie ponawiany.
    // Potwierdzenie wyniku odbywa się osobnym odczytem po nonce/requestId.
    const result = await fetch(
      BACKEND_URL,
      {
        method:"POST",
        mode:"no-cors",
        cache:"no-store",
        signal:controller ? controller.signal : undefined,
        headers:{
          "Content-Type":"text/plain;charset=UTF-8"
        },
        body:JSON.stringify(body)
      }
    );

    recordRequestTiming(
      action,
      requestTimingNow() - startedAt,
      true,
      "POST"
    );

    return result;

  } catch (err) {
    recordRequestTiming(
      action,
      requestTimingNow() - startedAt,
      false,
      "POST"
    );

    if (err && err.name === "AbortError") {
      throw new Error("Przekroczono czas wysyłania zapisu do serwera.");
    }

    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}


async function waitForAdminMutationResult(
  mutationAction,
  requestId,
  token,
  options={}
) {
  const attempts =
    Math.max(4,Number(options.attempts) || 28);

  const intervalMs =
    Math.max(150,Number(options.intervalMs) || 400);

  let lastTransportError = null;

  for (let attempt=0; attempt<attempts; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve,intervalMs));
    }

    let payload = null;

    try {
      payload = await jsonp(
        "adminMutationResult",
        {
          token,
          mutationAction,
          requestId
        }
      );
    } catch (err) {
      lastTransportError = err;
      continue;
    }

    if (!payload) {
      continue;
    }

    if (payload.ok === false) {
      throw new Error(
        payload.error ||
        "Serwer odrzucił potwierdzenie operacji administratora."
      );
    }

    if (payload.pending) {
      continue;
    }

    const result =
      payload.result && typeof payload.result === "object"
        ? payload.result
        : null;

    if (!result) {
      throw new Error(
        "Serwer zwrócił nieprawidłowe potwierdzenie zapisu."
      );
    }

    if (result.ok === false) {
      const error = new Error(
        result.error ||
        "Operacja nie została wykonana."
      );
      error.result = result;
      throw error;
    }

    return result;
  }

  if (lastTransportError) {
    throw new Error(
      `Nie udało się potwierdzić zapisu: ${
        lastTransportError && lastTransportError.message
          ? lastTransportError.message
          : "błąd połączenia"
      }`
    );
  }

  throw new Error(
    "Serwer nie potwierdził zapisu w wymaganym czasie. Nie ponawiaj operacji automatycznie — odśwież dane i sprawdź stan."
  );
}


async function confirmedAdminMutationPost(
  action,
  body,
  options={}
) {
  const requestId =
    String(
      options.requestId ||
      body.requestId ||
      body.nonce ||
      makeRecipeNonce()
    ).trim();

  const token =
    String(
      options.token ||
      body.token ||
      body.sessionToken ||
      adminToken() ||
      ""
    );

  const postBody = {
    ...body,
    requestId
  };

  let transportError = null;

  try {
    await timedBackendPost(
      action,
      postBody,
      options
    );
  } catch (err) {
    // POST mógł zostać wykonany po stronie Apps Script mimo zerwanego
    // połączenia. Nie wysyłamy go ponownie — sprawdzamy dokładnie ten
    // sam requestId w osobnym, bezpiecznym GET.
    transportError = err;
  }

  try {
    return await waitForAdminMutationResult(
      action,
      requestId,
      token,
      options
    );
  } catch (confirmationError) {
    if (
      transportError &&
      confirmationError &&
      /nie potwierdził|nie udało się potwierdzić/i.test(
        String(confirmationError.message || "")
      )
    ) {
      throw new Error(
        `${transportError.message || "Błąd wysyłania zapisu."} ` +
        "Nie udało się również potwierdzić, czy serwer wykonał operację. Odśwież dane przed ponowną próbą."
      );
    }

    throw confirmationError;
  }
}


const ADMIN_CRITICAL_ACTIONS = {
  adminSaveGoal:"🎯 Zapisuję cel…",
  adminDeleteGoal:"🗑 Usuwam cel…",
  adminAddAnnouncement:"📢 Dodaję ogłoszenie…",
  adminDeleteAnnouncement:"🗑 Usuwam ogłoszenie…",
  adminSetAnnouncementImportant:"📌 Aktualizuję ogłoszenie…",
  adminCreateGangPoll:"📊 Tworzę ankietę…",
  adminSetGangPollStatus:"📊 Aktualizuję ankietę…",
  adminDeleteGangPoll:"🗑 Usuwam ankietę…",
  adminSetModuleAccess:"🔐 Zmieniam dostęp do modułu…",
  adminDeleteBuild:"🗑 Usuwam publiczny build…",
  adminClearReservation:"🧹 Zwalniam rezerwację…",
  adminClearAllReservations:"🧹 Czyszczę rezerwacje…",
  adminGenerateSalaryClaimCode:"🔑 Generuję kod aktywacyjny…",
  adminSetCompanyIncome:"💰 Aktualizuję dochód Spółki…",
  adminActivateCompanySalaryPlan:"💰 Aktywuję plan pensji…",
  adminRenamePlayer:"✏️ Zmieniam nick gracza…",
  adminRevokePlayerIdentity:"🚫 Unieważniam tożsamość gracza…"
};

async function adminPostAction(action, data={}) {
  const token = adminToken();

  if (!token) {
    showAdminLogin();
    throw new Error("Brak sesji administratora.");
  }

  // adminPostAction służy wyłącznie do zapisów. Każdy taki zapis dostaje
  // blocking overlay oraz własny requestId potwierdzany przez backend.
  const criticalTitle =
    ADMIN_CRITICAL_ACTIONS[action] ||
    "💾 Zapisuję zmianę…";

  criticalOperationStart(
    criticalTitle,
    "Zapisuję zmianę. Poczekaj na potwierdzenie dokładnie tej operacji."
  );

  try {
    const result = await confirmedAdminMutationPost(
      action,
      {
        action,
        token,
        ...data
      },
      {token}
    );

    // Dashboard jest odświeżany dopiero po potwierdzeniu requestId.
    // Jego chwilowy błąd nie unieważnia już potwierdzonego zapisu.
    try {
      const dashboard = await jsonp(
        "adminDashboardStatus",
        {token,confirmAt:Date.now()}
      );

      if (dashboard && dashboard.ok) {
        applyAdminDashboardStatus(dashboard);
      }
    } catch (err) {
      console.warn(
        "[MenelWars Tools] Zapis Admin potwierdzony, ale dashboard nie odświeżył się:",
        err
      );
    }

    return result;
  } finally {
    criticalOperationFinish();
  }
}

function adminRecipeLabel(item) {
  return [
    item.baza,
    item.drozdze,
    item.woda,
    `P${Number(item.program) || 0}`
  ].filter(Boolean).join(" · ");
}

function refreshAdminAccountCodeStatus() {
  const select =
    el("admin-salary-player");

  const box =
    el("admin-identity-device-count");

  if (!select || !box) return;

  const option =
    select.options[
      select.selectedIndex
    ];

  if (!option) {
    box.textContent =
      "Konto: — · Aktywne sesje: 0";
    return;
  }

  const active =
    option.dataset.accountActive === "1";

  const sessions =
    Number(
      option.dataset.accountSessions
    ) || 0;

  box.textContent =
    `Konto: ${active ? "aktywne" : "nieaktywne"} · Aktywne sesje: ${sessions}`;
}


async function refreshAdminIdentityStatus() {
  // Alias pozostawiony dla zgodności starszych wywołań.
  refreshAdminAccountCodeStatus();
}

async function loadAdminPolls() {
  const box =
    el("admin-polls-list");

  if (!box) return;

  try {
    const payload =
      await fetchGangPollsPayload();

    const polls =
      Array.isArray(
        payload &&
        payload.polls
      )
        ? payload.polls
        : [];

    box.innerHTML =
      polls.length
        ? polls.map(poll => `
            <div class="poll-admin-card">
              <b>${escapeHtml(poll.title)}</b>

              <div class="muted">
                ${escapeHtml(poll.question)}
                · ${poll.totalVotes || 0} gł.
                · ${poll.status === "OPEN" ? "otwarta" : "zamknięta"}
              </div>

              <div class="poll-admin-actions">
                <button
                  type="button"
                  data-admin-poll-toggle="${escapeHtml(poll.id)}"
                  data-next-status="${poll.status === "OPEN" ? "CLOSED" : "OPEN"}">
                  ${poll.status === "OPEN" ? "🔒 Zamknij" : "🔓 Otwórz"}
                </button>

                <button
                  type="button"
                  data-admin-poll-delete="${escapeHtml(poll.id)}">
                  🗑 Usuń
                </button>
              </div>
            </div>
          `).join("")
        : `<div class="muted">Brak ankiet.</div>`;

    box
      .querySelectorAll(
        "[data-admin-poll-toggle]"
      )
      .forEach(button => {
        button.onclick =
          async () => {
            adminLoaderTexts(
              "poll"
            );

            try {
              await adminPostAction(
              "adminSetGangPollStatus",
              {
                pollId:
                  button.dataset.adminPollToggle,
                status:
                  button.dataset.nextStatus
              }
            );

              invalidateGangPollsCache();

              await Promise.allSettled([
                fetchGangPollsPayload({force:true}),
                loadAdminPolls(),
                loadGangPolls()
              ]);

              await runtimeLoaderFinish(
                "✅ Ankieta zaktualizowana"
              );
            } catch (err) {
              await runtimeLoaderFinish(
                "❌ Aktualizacja nieudana"
              );
              throw err;
            }
          };
      });

    box
      .querySelectorAll(
        "[data-admin-poll-delete]"
      )
      .forEach(button => {
        button.onclick =
          async () => {
            if (
              !window.confirm(
                "Usunąć tę ankietę razem z głosami?"
              )
            ) {
              return;
            }

            adminLoaderTexts(
              "poll"
            );

            try {
              await adminPostAction(
              "adminDeleteGangPoll",
              {
                pollId:
                  button.dataset.adminPollDelete
              }
            );

              invalidateGangPollsCache();

              await Promise.allSettled([
                fetchGangPollsPayload({force:true}),
                loadAdminPolls(),
                loadGangPolls()
              ]);

              await runtimeLoaderFinish(
                "✅ Ankieta usunięta"
              );
            } catch (err) {
              await runtimeLoaderFinish(
                "❌ Usuwanie nieudane"
              );
              throw err;
            }
          };
      });

  } catch (err) {
    box.innerHTML =
      `<div class="muted">Nie udało się pobrać ankiet.</div>`;
  }
}


function renderAdminGangTools(payload) {

  // v20.9 — lista graczy do kodów kont jest ładowana
  // przez loadAccountAdminPermissions(), a nie przez latestGangPayload.
  // Dzięki temu wejście bezpośrednio Konto → Admin nie czyści selecta.


  const reservations =
    Array.isArray(payload && payload.reservations)
      ? payload.reservations
      : [];

  const reservationsBox =
    el("admin-reservations-list");

  const reservationsAccordion =
    el("admin-section-reservations");


  if (reservationsBox) {
    reservationsBox.innerHTML =
      reservations.length
        ? reservations.map(item => `
            <div class="reservation-admin-row">
              <div>
                <b>${escapeHtml(item.nick)}</b>
                <div class="muted">
                  ${escapeHtml(adminRecipeLabel(item))}
                  · do ${escapeHtml(
                    new Date(Number(item.expiresAt))
                      .toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"})
                  )}
                </div>
              </div>

              <button
                type="button"
                data-clear-reservation="${escapeHtml(item.recipeKey)}">
                🗑 Zwolnij
              </button>
            </div>
          `).join("")
        : `<div class="empty">Brak aktywnych rezerwacji.</div>`;

    reservationsBox
      .querySelectorAll("[data-clear-reservation]")
      .forEach(button => {
        button.onclick = async () => {
          if (!window.confirm("Usunąć tę rezerwację?")) return;

          const status = el("admin-gang-tools-status");

          setActionLoading(
            button,
            status,
            "Zwalnianie rezerwacji..."
          );

          try {
            adminLoaderTexts(
              "reservation"
            );

            await adminPostAction(
              "adminClearReservation",
              {recipeKey:button.dataset.clearReservation}
            );

            status.textContent =
              "✅ Rezerwacja została zwolniona.";

            await loadAdminGangTools();
            await fetchApprovedRecipes({force:true});

            await runtimeLoaderFinish(
              "✅ Rezerwacja zwolniona"
            );
          } catch (err) {
            status.textContent =
              err.message || "Nie udało się usunąć rezerwacji.";

            await runtimeLoaderFinish(
              "❌ Zwalnianie nieudane"
            );
          } finally {
            clearActionLoading(button);
          }
        };
      });
  }

  const goal = payload && payload.goal;

  if (el("admin-goal-title")) {
    el("admin-goal-title").value =
      goal ? String(goal.title || "") : "";
    el("admin-goal-current").value =
      goal ? String(goal.current ?? "") : "";
    el("admin-goal-target").value =
      goal ? String(goal.target ?? "") : "";
    el("admin-goal-unit").value =
      goal ? String(goal.unit || "") : "";
  }

  const announcements =
    Array.isArray(payload && payload.announcements)
      ? payload.announcements
      : [];

  const announcementsBox =
    el("admin-announcements-list");

  if (announcementsBox) {
    announcementsBox.innerHTML =
      announcements.length
        ? announcements.map(item => `
            <div class="announcement-card ${item.important ? "important" : ""}">
              <div class="announcement-meta">
                <span>${item.important ? "📌 Ważne" : "📢 Ogłoszenie"}</span>
                <span>${escapeHtml(gangAnnouncementDate(item.createdAt))}</span>
              </div>

              <div style="white-space:pre-wrap;margin-bottom:8px">
                ${escapeHtml(item.text)}
              </div>

              <div class="admin-actions-row">
                <button
                  type="button"
                  data-toggle-important="${escapeHtml(item.id)}"
                  data-important="${item.important ? "1" : "0"}">
                  ${item.important ? "📌 Odepnij" : "📌 Oznacz Ważne"}
                </button>

                <button
                  type="button"
                  data-delete-announcement="${escapeHtml(item.id)}">
                  🗑 Usuń
                </button>
              </div>
            </div>
          `).join("")
        : `<div class="empty">Brak ogłoszeń.</div>`;

    announcementsBox
      .querySelectorAll("[data-toggle-important]")
      .forEach(button => {
        button.onclick = async () => {
          const important =
            button.dataset.important !== "1";

          button.disabled = true;

          try {
            adminLoaderTexts(
              "announcement"
            );

            await adminPostAction(
              "adminSetAnnouncementImportant",
              {
                id:button.dataset.toggleImportant,
                important
              }
            );
            await Promise.allSettled([
              loadAdminGangTools(),
              loadPayments({background:true})
            ]);

            await runtimeLoaderFinish(
              "✅ Ogłoszenie zaktualizowane"
            );
          } catch (err) {
            el("admin-gang-tools-status").textContent =
              err.message || "Nie udało się zmienić przypięcia.";

            await runtimeLoaderFinish(
              "❌ Aktualizacja nieudana"
            );
          }
        };
      });

    announcementsBox
      .querySelectorAll("[data-delete-announcement]")
      .forEach(button => {
        button.onclick = async () => {
          if (!window.confirm("Usunąć to ogłoszenie?")) return;

          button.disabled = true;

          try {
            adminLoaderTexts(
              "announcement"
            );

            await adminPostAction(
              "adminDeleteAnnouncement",
              {id:button.dataset.deleteAnnouncement}
            );
            await Promise.allSettled([
              loadAdminGangTools(),
              loadPayments({background:true})
            ]);

            await runtimeLoaderFinish(
              "✅ Ogłoszenie usunięte"
            );
          } catch (err) {
            el("admin-gang-tools-status").textContent =
              err.message || "Nie udało się usunąć ogłoszenia.";

            await runtimeLoaderFinish(
              "❌ Usuwanie nieudane"
            );
          }
        };
      });
  }
}

async function loadAdminGangTools() {
  const token = adminToken();

  if (!token) return;

  const status = el("admin-gang-tools-status");

  try {
    const payload =
      await jsonp("adminGangTools",{token});

    if (!payload || !payload.ok) {
      throw new Error(
        payload && payload.error
          ? payload.error
          : "Nie udało się pobrać narzędzi gangu."
      );
    }

    renderAdminGangTools(payload);
    loadAdminPolls();

    if (status) status.textContent = "";

  } catch (err) {
    if (status) {
      status.textContent =
        err && err.message
          ? err.message
          : "Nie udało się pobrać narzędzi gangu.";
    }
  }
}


async function loadAdminModuleAccess() {
  const box =
    el("admin-module-access-list");

  const status =
    el("admin-module-access-status");

  if (!box) return;

  try {
    const policy =
      await fetchModuleAccessPolicy({
        force:true
      });

    const rows = [
      [
        "distillery",
        "⚗ Destylarnia",
        "Receptury, badania i rezerwacje."
      ],
      [
        "garden",
        "🌱 Ogród",
        "Uprawy, pomiary czasu i rezerwacje ustawień."
      ],
      [
        "builds",
        "⚔️ PVP",
        "Kreator i publiczne buildy PvP."
      ],
      [
        "map",
        "🗺 Mapa",
        "Ściąga mapy gry."
      ]
    ];

    box.innerHTML =
      rows.map(
        ([key,label,description]) => `
          <div class="module-access-row">
            <div class="module-access-meta">
              <strong>${label}</strong>
              <span class="muted">${description}</span>
            </div>

            <label
              class="module-access-switch"
              title="Wymagaj zalogowanego Konta">
              <input
                type="checkbox"
                data-module-access="${key}"
                ${policy && policy[key] ? "checked" : ""}
              >
              <span class="module-access-slider"></span>
            </label>
          </div>
        `
      ).join("");

    box
      .querySelectorAll(
        "[data-module-access]"
      )
      .forEach(input => {
        input.addEventListener(
          "change",
          async () => {
            const moduleName =
              input.dataset.moduleAccess;

            const nextValue =
              Boolean(input.checked);

            input.disabled = true;

            if (status) {
              status.textContent =
                "Zapisywanie ustawienia...";
            }

            try {
              await adminPostAction(
                "adminSetModuleAccess",
                {
                  module:moduleName,
                  requiresAccount:
                    nextValue
                }
              );

              moduleAccessPolicyCache = {
                ...moduleAccessPolicyCache,
                [moduleName]:nextValue
              };

              moduleAccessPolicyAt =
                Date.now();

              if (status) {
                status.textContent =
                  nextValue
                    ? `✅ ${MODULE_ACCESS_LABELS[moduleName]} wymaga teraz Konta.`
                    : `✅ ${MODULE_ACCESS_LABELS[moduleName]} jest dostępna bez Konta.`;
              }

            } catch (err) {
              input.checked =
                !nextValue;

              if (status) {
                status.textContent =
                  err && err.message
                    ? err.message
                    : "Nie udało się zapisać ustawienia.";
              }
            } finally {
              input.disabled = false;
            }
          }
        );
      });

  } catch (err) {
    box.innerHTML =
      `<div class="muted">Nie udało się pobrać ustawień dostępu.</div>`;

    if (status) {
      status.textContent =
        err && err.message
          ? err.message
          : "";
    }
  }
}


async function loadAdminBuilds() {
  const token = adminToken();
  const box = el("admin-builds-list");
  const count = el("admin-builds-count");
  const status = el("admin-builds-status");

  if (!token || !box) return;

  if (status) status.textContent = "Pobieranie publicznych buildów...";

  try {
    const payload =
      await jsonp(
        "adminBuilds",
        {token}
      );

    if (!payload || !payload.ok) {
      throw new Error(
        payload && payload.error
          ? payload.error
          : "Nie udało się pobrać buildów."
      );
    }

    const builds =
      Array.isArray(payload.builds)
        ? payload.builds
        : [];

    if (count) {
      count.textContent =
        `Publiczne buildy: ${builds.length}`;
    }

    box.innerHTML =
      builds.length
        ? builds.map(item => `
            <div class="admin-build-row" data-admin-build-row="${escapeHtml(item.id)}">
              <div class="admin-build-row-main">
                <div>
                  <b>${escapeHtml(item.name || "Bez nazwy")}</b>
                  <div class="muted">
                    Autor: ${escapeHtml(item.authorNick || item.ownerNick || "—")}
                    · poziom ${Number(item.level) || 1}
                  </div>
                </div>

                <button
                  type="button"
                  class="danger-soft"
                  data-admin-delete-build="${escapeHtml(item.id)}"
                  data-admin-build-name="${escapeHtml(item.name || "Bez nazwy")}"
                  data-admin-build-author="${escapeHtml(item.authorNick || item.ownerNick || "—")}">
                  🗑 Usuń
                </button>
              </div>
            </div>
          `).join("")
        : `<div class="empty">Brak publicznych buildów.</div>`;

    box
      .querySelectorAll("[data-admin-delete-build]")
      .forEach(button => {
        button.onclick = async () => {
          const id =
            button.dataset.adminDeleteBuild;

          const name =
            button.dataset.adminBuildName || "Bez nazwy";

          const author =
            button.dataset.adminBuildAuthor || "—";

          if (
            !window.confirm(
              `Usunąć publiczny build "${name}" autora ${author}?\n\nTa operacja jest trwała.`
            )
          ) {
            return;
          }

          setActionLoading(
            button,
            status,
            "Usuwanie buildu..."
          );

          try {
            await adminPostAction(
              "adminDeleteBuild",
              {id}
            );

            if (status) {
              status.textContent =
                `✅ Usunięto build "${name}".`;
            }

            // Czyścimy lokalny cache listy buildów, żeby publiczna karta
            // po kolejnym wejściu nie pokazała usuniętego wpisu.
            invalidateAppCache("builds");

            await Promise.allSettled([
              loadAdminBuilds(),
              fetchBuildLists(true)
            ]);
          } catch (err) {
            if (status) {
              status.textContent =
                "❌ " +
                (
                  err && err.message
                    ? err.message
                    : "Nie udało się usunąć buildu."
                );
            }
          } finally {
            clearActionLoading(button);
          }
        };
      });

    if (status && !status.textContent.startsWith("✅")) {
      status.textContent = "";
    }

  } catch (err) {
    if (status) {
      status.textContent =
        "❌ " +
        (
          err && err.message
            ? err.message
            : "Nie udało się pobrać buildów."
        );
    }
  }
}


let adminDashboardStatusInFlight = null;

// v20.73 — cache sekcji Admina z TTL.
// Sekcja pokazuje od razu ostatnio wyrenderowane dane,
// a po 10 minutach odświeża je po cichu w tle.
const ADMIN_SECTION_TTL_MS = 10 * 60 * 1000;
const adminSectionLoadedAt = new Map();

function closeAllAdminSections() {
  document
    .querySelectorAll("#admin-content details.admin-accordion")
    .forEach(details => {
      details.open = false;
    });
}

function setAdminSectionBadge(sectionId,count,label="") {
  const details = el(sectionId);
  const summary = details && details.querySelector(":scope > summary");
  if (!summary) return;

  let badge = summary.querySelector(".admin-attention-badge");

  if (!badge) {
    badge = document.createElement("span");
    badge.className = "admin-attention-badge";
    const chevron = summary.querySelector(".accordion-chevron");
    if (chevron) summary.insertBefore(badge,chevron);
    else summary.appendChild(badge);
  }

  const number = Math.max(0,Number(count) || 0);
  badge.hidden = number <= 0;
  badge.textContent = number > 0 ? (label || String(number)) : "";
}

function setAdminGlobalBadge(count) {
  const button = el("account-admin-open");
  if (!button) return;

  let badge = button.querySelector(".admin-global-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "admin-global-badge";
    button.appendChild(badge);
  }

  const number = Math.max(0,Number(count) || 0);
  badge.hidden = number <= 0;
  badge.textContent = number > 0 ? String(number) : "";
}

function applyAdminDashboardStatus(payload) {
  const pending = Math.max(0,Number(payload && payload.pendingSubmissions) || 0);
  const company = Math.max(0,Number(payload && payload.companyChanges) || 0);
  const total = Math.max(0,Number(payload && payload.totalAttention) || pending + company);

  setAdminSectionBadge("admin-section-submissions",pending);
  setAdminSectionBadge("admin-section-payments",company);
  setAdminGlobalBadge(total);

  const count = el("admin-submissions-count");
  if (count) {
    count.textContent = total
      ? `Wymaga uwagi: ${total}`
      : "Brak rzeczy wymagających uwagi";
  }
}

async function loadAdminDashboardStatus() {
  if (adminDashboardStatusInFlight) return adminDashboardStatusInFlight;

  const token = adminToken();
  if (!token) return null;

  adminDashboardStatusInFlight = (async () => {
    const payload = await jsonp("adminDashboardStatus",{token});
    if (!payload || !payload.ok) {
      throw new Error(payload && payload.error ? payload.error : "Nie udało się pobrać statusu Admina.");
    }
    applyAdminDashboardStatus(payload);
    return payload;
  })();

  try { return await adminDashboardStatusInFlight; }
  finally { adminDashboardStatusInFlight = null; }
}

async function loadAdminSection(
  sectionId,
  force=false,
  options={}
) {
  const background =
    Boolean(options.background);

  const loadedAt =
    Number(
      adminSectionLoadedAt.get(sectionId)
    ) || 0;

  const age =
    loadedAt
      ? Date.now() - loadedAt
      : Infinity;

  // Świeże dane: niczego nie pobieramy ponownie.
  if (
    !force &&
    loadedAt &&
    age < ADMIN_SECTION_TTL_MS
  ) {
    return;
  }

  const load = async () => {
    if (sectionId === "admin-section-module-access") {
      await loadAdminModuleAccess();

    } else if (sectionId === "admin-section-submissions") {
      await loadAdminSubmissions();

    } else if (sectionId === "admin-section-reservations") {
      await loadAdminGangTools();

    } else if (sectionId === "admin-section-builds") {
      await loadAdminBuilds();

    } else if (sectionId === "admin-section-payments") {
      await loadAdminPaymentsStatus();

    } else if (
      sectionId === "admin-section-goal" ||
      sectionId === "admin-section-announcements"
    ) {
      await loadAdminGangTools();

    } else if (sectionId === "admin-section-polls") {
      await loadAdminPolls();

    } else if (sectionId === "admin-section-salary-access") {
      await loadAccountAdminPermissions();

    } else if (sectionId === "admin-section-players") {
      await Promise.allSettled([
        loadAdminPlayers(),
        loadAccountAdminPermissions()
      ]);
    }

    adminSectionLoadedAt.set(
      sectionId,
      Date.now()
    );
  };

  // Jeśli sekcja była już kiedyś pobrana i TTL minął,
  // zostawiamy starą zawartość na ekranie i odświeżamy ją w tle.
  if (
    !force &&
    loadedAt &&
    age >= ADMIN_SECTION_TTL_MS
  ) {
    load().catch(err => {
      console.warn(
        `[MenelWars Tools] Nie udało się odświeżyć sekcji Admina ${sectionId}:`,
        err
      );
    });

    return;
  }

  // Pierwsze otwarcie albo ręczny force refresh.
  if (background) {
    load().catch(err => {
      console.warn(
        `[MenelWars Tools] Nie udało się załadować sekcji Admina ${sectionId}:`,
        err
      );
    });
    return;
  }

  await load();
}

function setupAdminAccordionLazyLoad() {
  document
    .querySelectorAll("#admin-content details.admin-accordion")
    .forEach(details => {
      if (details.dataset.lazyBound === "1") return;
      details.dataset.lazyBound = "1";

      details.addEventListener("toggle",async () => {
        if (!details.open) return;

        try {
          await loadAdminSection(
            details.id
          );
        } catch (err) {
          const status = el("admin-status");

          if (status) {
            status.textContent =
              err && err.message
                ? err.message
                : "Nie udało się pobrać sekcji.";
          }
        }
      });
    });
}

function showAdminContent() {
  el("admin-login").hidden = true;
  el("admin-content").hidden = false;

  el("admin-status").textContent = "";

  closeAllAdminSections();
  setupAdminAccordionLazyLoad();

  // Na wejściu pobieramy tylko lekkie statusy i uprawnienia konta.
  Promise.allSettled([
    loadAdminDashboardStatus(),
    loadAccountAdminPermissions()
  ]);
}

async function checkAdminAccess() {

  const token = adminToken();

  if (!token) {
    showAdminLogin();
    return;
  }

  el("admin-login").hidden = true;
  el("admin-content").hidden = false;

  el("admin-status").textContent =
    "Sprawdzanie dostępu...";

  try {

    const result =
      await jsonp(
        "adminTest",
        {token}
      );

    if (
      !result ||
      !result.ok
    ) {

      setAdminToken("");

      showAdminLogin(
        "Sesja administratora wygasła. Zaloguj się ponownie."
      );

      return;
    }

    showAdminContent();

  } catch (err) {

    el("admin-status").textContent =
      err && err.message
        ? err.message
        : "Nie udało się sprawdzić dostępu.";
  }
}


function adminSubmissionCard(item) {

  const notes =
    item.uwagi
      ? `
          <div
            class="muted"
            style="margin-top:5px">
            💬 ${escapeHtml(item.uwagi)}
          </div>
        `
      : "";

  const duplicateInfo = item.duplicate
    ? `<div style="margin-top:6px;padding:6px;border-radius:6px;background:#f4efe5">
         ♻️ Identyczny wynik jest już zatwierdzony (${formatSaldo(item.knownLiters)} l).
       </div>`
    : "";

  const correctionInfo = item.correction
    ? `<div style="margin-top:6px;padding:6px;border-radius:6px;background:#fff3d6">
         ⚠️ Znany wynik: <b>${formatSaldo(item.knownLiters)} l</b> · nowe zgłoszenie: <b>${formatSaldo(item.litry)} l</b>.
       </div>`
    : "";

  const distilleryModel =
    distilleryBuildExperimentalModel(compute().recipes);
  const anomalyPrediction =
    distilleryPredict({
      baza:item.baza,
      drozdze:item.drozdze,
      woda:item.woda,
      program:item.program
    },distilleryModel);
  const anomalyDelta = anomalyPrediction
    ? Math.abs(Number(item.litry)-anomalyPrediction.estimate)
    : 0;
  const anomalyThreshold = anomalyPrediction
    ? Math.max(0.15,3*anomalyPrediction.rmse,0.20*anomalyPrediction.estimate)
    : Infinity;
  const anomalyInfo = anomalyPrediction && anomalyDelta > anomalyThreshold
    ? `<div class="admin-model-anomaly">
         🧪 <b>Nietypowy wynik względem modelu:</b> estymacja ~${formatSaldo(anomalyPrediction.estimate)} l, różnica ${formatSaldo(anomalyDelta)} l.
         <small>To tylko ostrzeżenie jakości danych — nie odrzuca zgłoszenia automatycznie.</small>
       </div>`
    : "";

  const approveAction = item.duplicate
    ? "DUPLIKAT"
    : "ZATWIERDZONE";

  const approveLabel = item.duplicate
    ? "♻️ Oznacz duplikat"
    : item.correction
      ? "✅ Zatwierdź korektę"
      : "✅ Zatwierdź";

  return `
    <div
      data-submission-row="${item.row}"
      style="
        border:1px solid #d8c7aa;
        border-radius:8px;
        background:#fffdf8;
        padding:9px 10px;
        margin-bottom:6px;
      "
    >

      <div style="
        display:flex;
        justify-content:space-between;
        gap:8px;
        align-items:center;
      ">

        <strong>
          ${escapeHtml(item.nick)}
        </strong>

        <strong>
          ${formatSaldo(item.litry)} l
        </strong>

      </div>

      <div
        style="
          font-size:13px;
          margin-top:4px;
        "
      >
        ${escapeHtml(displayName(item.baza))}
        ·
        ${escapeHtml(displayName(item.drozdze))}
        ·
        ${escapeHtml(displayName(item.woda))}
        ·
        P${item.program}
      </div>

      <div
        class="muted"
        style="margin-top:3px">
        ${escapeHtml(item.date)}
      </div>

      ${notes}
      ${duplicateInfo}
      ${correctionInfo}
      ${anomalyInfo}

      <div style="
        display:flex;
        gap:8px;
        margin-top:9px;
      ">

        <button
          type="button"
          data-admin-action="${approveAction}"
          data-correction="${item.correction ? "1" : "0"}"
          data-row="${item.row}"
          style="
            flex:1;
            background:#eaf6ea;
            border-color:#9fc79f;
          ">
          ${approveLabel}
        </button>

        <button
          type="button"
          data-admin-action="ODRZUCONE"
          data-row="${item.row}"
          style="
            flex:1;
            background:#fff0f0;
            border-color:#d9aaaa;
          ">
          ❌ Odrzuć
        </button>

      </div>

    </div>
  `;
}

async function setAdminSubmissionStatus(
  row,
  newStatus,
  button,
  correction=false
) {

  const token =
    adminToken();

  if (!token) {
    showAdminLogin();
    return;
  }


  const isApprove =
    newStatus === "ZATWIERDZONE";

  const isDuplicate =
    newStatus === "DUPLIKAT";


  const confirmed =
    window.confirm(
      isDuplicate
        ? "Oznaczyć to zgłoszenie jako duplikat?"
        : isApprove
          ? (
              correction
                ? "Zatwierdzić ten wynik jako korektę istniejącej receptury?"
                : "Zatwierdzić tę recepturę?"
            )
          : "Odrzucić tę recepturę?"
    );

  if (!confirmed) {
    return;
  }


  const card =
    button.closest(
      "[data-submission-row]"
    );


  const buttons =
    card
      ? card.querySelectorAll("button")
      : [];


  buttons.forEach(
    btn => btn.disabled = true
  );


  const loadingText =
    isDuplicate
      ? "♻️ Oznaczam duplikat..."
      : isApprove
        ? (
            correction
              ? "✅ Zatwierdzam korektę receptury..."
              : "✅ Zatwierdzam recepturę..."
          )
        : "❌ Odrzucam recepturę...";

  const funnyText =
    isApprove
      ? [
          "🧪 Destylator miesza w papierach, już kończę...",
          "🥫 Recepta zaplątała się między puszkami...",
          "📋 Sprawdzam ostatnią karteczkę z wynikiem...",
          "🍺 Laborant obiecuje, że to już moment..."
        ]
      : isDuplicate
        ? [
            "♻️ Szukam bliźniaka tej recepty w stercie kartek...",
            "🧬 Porównuję składniki jeszcze raz...",
            "🥫 Duplikat schował się za puszką...",
            "🍺 Archiwum twierdzi, że już go widziało..."
          ]
        : [
            "🗑️ Wyrzucam receptę do kosza, kosz stawia opór...",
            "📄 Kartka nie chce się poddać...",
            "🥫 Kosz jest pełen puszek...",
            "🍺 Jeszcze chwila i recepta znika..."
          ];


  el("admin-status").textContent =
    loadingText;

  // Kafelek znika od razu, ale zachowujemy jego lokalną kopię. Dzięki temu
  // nie blokujemy administratora na czas odpowiedzi Apps Script, a przy
  // błędzie możemy bezpiecznie przywrócić dokładnie tę samą listę.
  const submissionsBeforeMutation = adminSubmissionsCache;
  adminPendingSubmissionRows.add(String(row));
  if (
    submissionsBeforeMutation &&
    Array.isArray(submissionsBeforeMutation.submissions)
  ) {
    const submissionsAfterMutation = submissionsBeforeMutation.submissions.filter(
      item => Number(item && item.row) !== Number(row)
    );
    adminSubmissionsCache = Object.assign({}, submissionsBeforeMutation, {
      submissions: submissionsAfterMutation,
      count: submissionsAfterMutation.length
    });
    adminSubmissionsCacheAt = Date.now();
    loadAdminSubmissions().catch(()=>{});
  } else if (card) {
    card.remove();
  }

  let gangDemandLoadInFlight = null;
  let gangDemandCache = null;

  function gangDemandCatalog() {
    const raw=Array.isArray(window.MENELWARS_GAME_ITEMS) ? window.MENELWARS_GAME_ITEMS : [];
    return raw.map(item=>({id:Number(item[0]),name:String(item[1] || ""),iconUrl:String(item[2] || ""),group:String(item[3] || ""),subtitle:String(item[4] || "")})).filter(item=>Number.isFinite(item.id) && item.name);
  }

  function gangDemandItem(itemId) {
    return gangDemandCatalog().find(item=>item.id===Number(itemId)) || {id:Number(itemId)||0,name:`Przedmiot #${itemId}`,iconUrl:"",group:"",subtitle:""};
  }

  function gangDemandIcon(item) {
    return item.iconUrl ? `<img class="gang-demand-item-icon" src="${escapeHtml(item.iconUrl)}" alt="" loading="lazy">` : `<span class="gang-demand-item-icon" aria-hidden="true">📦</span>`;
  }

  function renderGangDemandChoices(query) {
    const box=el("gang-demand-results");
    if (!box) return;
    const needle=String(query || "").trim().toLocaleLowerCase("pl");
    const catalog=gangDemandCatalog().sort((a,b)=>a.name.localeCompare(b.name,"pl"));
    // Lista jest dostępna już po kliknięciu pola; wpisywanie tylko ją zawęża.
    const matches=(needle ? catalog.filter(item=>item.name.toLocaleLowerCase("pl").includes(needle)) : catalog).slice(0,40);
    box.hidden=!matches.length;
    box.innerHTML=matches.length ? `${!needle?'<div class="gang-demand-list-hint">Wybierz z listy lub wpisz nazwę, aby ją zawęzić.</div>':''}${matches.map(item=>`<button type="button" class="gang-demand-choice" data-gang-demand-item="${item.id}">${gangDemandIcon(item)}<span><b>${escapeHtml(item.name)}</b>${item.subtitle?`<small>${escapeHtml(item.subtitle)}</small>`:""}</span><small>${escapeHtml(item.group || "przedmiot")}</small></button>`).join("")}` : '<div class="gang-demand-list-hint">Brak przedmiotów o takiej nazwie.</div>';
    box.querySelectorAll("[data-gang-demand-item]").forEach(button=>button.addEventListener("click",()=>{
      const item=gangDemandItem(button.dataset.gangDemandItem);
      el("gang-demand-item-id").value=String(item.id);
      el("gang-demand-search").value=item.name;
      box.hidden=true;
      box.innerHTML="";
    }));
  }

  function renderGangDemand(payload) {
    const box=el("gang-demand-list");
    if (!box) return;
    const entries=Array.isArray(payload && payload.entries) ? payload.entries : [];
    box.innerHTML=entries.length ? entries.map(entry=>{
      const item=gangDemandItem(entry.itemId);
      const action=entry.canClose ? `<button type="button" class="gang-demand-close" data-gang-demand-close="${escapeHtml(entry.id)}">${entry.canDelete ? "🗑 Usuń" : "✅ Załatwione"}</button>` : "";
      return `<article class="gang-demand-card">${gangDemandIcon(item)}<div class="gang-demand-card-main"><strong>${escapeHtml(item.name)} × ${Math.max(1,Number(entry.amount)||1)}</strong><span class="gang-demand-card-meta">${escapeHtml(entry.nick || "Członek Gangu")} · ${escapeHtml(gangAnnouncementDate(entry.createdAt))}</span>${entry.note?`<span class="gang-demand-card-note">${escapeHtml(entry.note)}</span>`:""}</div>${action}</article>`;
    }).join("") : `<div class="empty">📦 Brak aktywnego zapotrzebowania. Dodaj pierwszy przedmiot, którego szukasz.</div>`;
    box.querySelectorAll("[data-gang-demand-close]").forEach(button=>button.addEventListener("click",()=>gangDemandClose(button.dataset.gangDemandClose,button.textContent.includes("Usuń"))));
  }

  async function loadGangDemand(options={}) {
    if (gangDemandLoadInFlight) return gangDemandLoadInFlight;
    gangDemandLoadInFlight=(async()=>{
      const token=playerAccountSessionToken();
      const box=el("gang-demand-list");
      if (!token) {
        if (box) box.innerHTML='<div class="empty">🔒 Zaloguj się, aby zobaczyć zapotrzebowanie ekipy.</div>';
        return null;
      }
      try {
        // Zapotrzebowanie nie może zatrzymywać całej zakładki Gangu. Jeśli
        // backend nie ma jeszcze tej akcji albo odpowiada zbyt wolno,
        // kończymy oczekiwanie szybko i pokazujemy czytelny komunikat.
        const payload=await Promise.race([
          jsonp("gangDemand",{sessionToken:token,_:options.force?Date.now():""},{retry:false}),
          new Promise((_,reject)=>setTimeout(()=>reject(new Error("Serwer nie odpowiedział w 8 sekund. Sprawdź wdrożenie backendu akcji gangDemand.")),8000))
        ]);
        if (!payload || !payload.ok) throw new Error(payload && payload.error ? payload.error : "Nie udało się pobrać zapotrzebowania.");
        gangDemandCache=payload;
        renderGangDemand(payload);
        return payload;
      } catch (err) {
        if (box) box.innerHTML=`<div class="empty">❌ Nie udało się pobrać zapotrzebowania.<br><small>${escapeHtml(err && err.message ? err.message : "Sprawdź połączenie lub wdrożenie backendu.")}</small></div>`;
        return null;
      }
    })();
    try { return await gangDemandLoadInFlight; }
    finally { gangDemandLoadInFlight=null; }
  }

  async function gangDemandClose(id,isDelete) {
    const status=el("gang-demand-status");
    if (status) status.textContent="⏳ Zapisuję zmianę…";
    try {
      await playerAccountPostAction("gangDemandClose",{sessionToken:playerAccountSessionToken(),id,delete:Boolean(isDelete)});
      if (status) status.textContent="✅ Wpis został usunięty z aktywnego zapotrzebowania.";
      await loadGangDemand({force:true});
    } catch (err) { if (status) status.textContent="❌ "+(err.message || "Nie udało się zmienić wpisu."); }
  }

  function setupGangDemand() {
    const form=el("gang-demand-form");
    const search=el("gang-demand-search");
    search?.addEventListener("input",()=>{
      el("gang-demand-item-id").value="";
      renderGangDemandChoices(search.value);
    });
    search?.addEventListener("focus",()=>renderGangDemandChoices(search.value));
    form?.addEventListener("submit",async event=>{
      event.preventDefault();
      const status=el("gang-demand-status");
      const itemId=Number(el("gang-demand-item-id").value);
      const selected=gangDemandItem(itemId);
      if (!itemId || selected.id!==itemId || el("gang-demand-search").value!==selected.name) {
        if (status) status.textContent="⚠️ Wybierz przedmiot z podpowiedzi.";
        return;
      }
      if (status) status.textContent="⏳ Dodaję zapotrzebowanie…";
      try {
        await playerAccountPostAction("gangDemandAdd",{sessionToken:playerAccountSessionToken(),itemId,amount:Number(el("gang-demand-amount").value),note:el("gang-demand-note").value});
        form.reset();
        el("gang-demand-amount").value="1";
        if (status) status.textContent="✅ Zapotrzebowanie dodane dla całej ekipy.";
        await loadGangDemand({force:true});
      } catch (err) { if (status) status.textContent="❌ "+(err.message || "Nie udało się dodać wpisu."); }
    });
  }

  criticalOperationStart(
    loadingText,
    "Zgłoszenie znika teraz, a potwierdzenie serwera trwa w tle."
  );

  let overlayReleased = false;
  const releaseOverlay = () => {
    if (overlayReleased) return;
    overlayReleased = true;
    criticalOperationFinish();
  };
  const releaseTimer = setTimeout(() => {
    el("admin-status").textContent = "⌛ Potwierdzam zmianę w tle — możesz dalej pracować w panelu.";
    releaseOverlay();
  }, 700);


  try {

    await confirmedAdminMutationPost(
      "adminSetSubmissionStatus",
      {
        action:"adminSetSubmissionStatus",
        token,
        row,
        status:newStatus,
        correction:Boolean(correction)
      },
      {token}
    );


    // Backend v20.19 robi SpreadsheetApp.flush()
    // przed odpowiedzią, więc nie potrzebujemy już
    // sztucznego dodatkowego oczekiwania 500 ms.
    invalidateAdminSubmissionsCache();
    await loadAdminSubmissions({force:true});


    adminPendingSubmissionRows.delete(String(row));

    // Zatwierdzona receptura ma od razu trafić również do wspólnej bazy
    // widocznej w Destylarni. Nie dotyczy to listy oczekujących w Adminie.
    if (isApprove) {
      await fetchApprovedRecipes({force:true});
    }


    const finalText =
      isDuplicate
        ? "✅ Duplikat oznaczony"
        : isApprove
          ? (
              correction
                ? "✅ Korekta zatwierdzona"
                : "✅ Receptura zatwierdzona"
            )
          : "✅ Receptura odrzucona";

    await runtimeLoaderFinish(
      finalText
    );

    adminWarmLoadedAt =
      Date.now();


  } catch (err) {

    // Serwer nie potwierdził zmiany: pokazujemy zgłoszenie ponownie.
    adminPendingSubmissionRows.delete(String(row));
    if (submissionsBeforeMutation) {
      adminSubmissionsCache = submissionsBeforeMutation;
      adminSubmissionsCacheAt = Date.now();
      await loadAdminSubmissions().catch(()=>{});
    } else {
      await loadAdminSubmissions({force:true}).catch(()=>{});
    }

    el("admin-status").textContent =
      err && err.message
        ? err.message
        : "Nie udało się zmienić statusu.";

    buttons.forEach(
      btn => btn.disabled = false
    );

    await runtimeLoaderFinish(
      "❌ Operacja nieudana"
    );
  } finally {
    clearTimeout(releaseTimer);
    releaseOverlay();
    loadAdminDashboardStatus().catch(()=>{});
  }
}

// Zapotrzebowanie Gangu musi być w głównym zakresie aplikacji. Wcześniejsza
// wersja została omyłkowo wklejona do obsługi zatwierdzania receptur, przez
// co przy starcie setupGangDemand nie istniało i zatrzymywało cały app.js.
let gangDemandLoadInFlightGlobal = null;
let gangDemandCacheGlobal = null;
let gangDemandBlockedIdsGlobal = new Set();
let gangDemandAdminGlobal = false;

function gangDemandCatalogAllGlobal() {
  const raw=Array.isArray(window.MENELWARS_GAME_ITEMS) ? window.MENELWARS_GAME_ITEMS : [];
  return raw.map(item=>({id:Number(item[0]),name:String(item[1]||""),iconUrl:String(item[2]||""),group:String(item[3]||""),subtitle:String(item[4]||"")})).filter(item=>Number.isFinite(item.id)&&item.name);
}

function gangDemandCatalogGlobal() {
  return gangDemandCatalogAllGlobal().filter(item=>!gangDemandBlockedIdsGlobal.has(item.id));
}

function gangDemandItemGlobal(itemId) {
  return gangDemandCatalogAllGlobal().find(item=>item.id===Number(itemId)) || {id:Number(itemId)||0,name:`Przedmiot #${itemId}`,iconUrl:"",group:"",subtitle:""};
}

function gangDemandIconGlobal(item) {
  return item.iconUrl ? `<img class="gang-demand-item-icon" src="${escapeHtml(item.iconUrl)}" alt="" loading="lazy">` : `<span class="gang-demand-item-icon" aria-hidden="true">📦</span>`;
}

function renderGangDemandChoicesGlobal(query) {
  const box=el("gang-demand-results");
  if (!box) return;
  const needle=String(query||"").trim().toLocaleLowerCase("pl");
  const catalog=gangDemandCatalogGlobal().sort((a,b)=>a.name.localeCompare(b.name,"pl"));
  const matches=(needle ? catalog.filter(item=>[
    item.name,item.subtitle,item.group
  ].some(value=>String(value||"").toLocaleLowerCase("pl").includes(needle))) : catalog).slice(0,40);
  box.hidden=!matches.length;
  box.innerHTML=matches.length ? `${!needle?'<div class="gang-demand-list-hint">Wybierz z listy lub wpisz nazwę, aby ją zawęzić.</div>':''}${matches.map(item=>`<button type="button" class="gang-demand-choice" data-gang-demand-item="${item.id}">${gangDemandIconGlobal(item)}<span><b>${escapeHtml(item.name)}</b>${item.subtitle?`<small>${escapeHtml(item.subtitle)}</small>`:""}</span><small>${escapeHtml(item.group||"przedmiot")}</small></button>`).join("")}` : '<div class="gang-demand-list-hint">Brak przedmiotów o takiej nazwie.</div>';
  box.querySelectorAll("[data-gang-demand-item]").forEach(button=>button.addEventListener("click",()=>{
    const item=gangDemandItemGlobal(button.dataset.gangDemandItem);
    el("gang-demand-item-id").value=String(item.id);
    el("gang-demand-search").value=item.name;
    box.hidden=true; box.innerHTML="";
    renderGangDemandAdminToolsGlobal();
  }));
}

function renderGangDemandAdminToolsGlobal() {
  const host=el("gang-demand-admin-tools");
  if (!host) return;
  host.hidden=!gangDemandAdminGlobal;
  if (!gangDemandAdminGlobal) { host.innerHTML=""; return; }
  const selectedId=Number(el("gang-demand-item-id")?.value)||0;
  const selected=selectedId ? gangDemandItemGlobal(selectedId) : null;
  const blocked=[...gangDemandBlockedIdsGlobal].map(gangDemandItemGlobal).sort((a,b)=>a.name.localeCompare(b.name,"pl"));
  host.innerHTML=`<button type="button" class="secondary-btn" data-gang-demand-block-selected${selected?"":" disabled"}>🚫 ${selected?`Oznacz „${escapeHtml(selected.name)}” jako niewymienialny`:"Najpierw wybierz przedmiot z listy"}</button><details><summary>🚫 Niewymienialne przedmioty: ${blocked.length}</summary><div class="gang-demand-blocked-list">${blocked.length?blocked.map(item=>`<button type="button" class="secondary-btn" data-gang-demand-unblock="${item.id}">↩️ ${escapeHtml(item.name)}</button>`).join(""):'<span class="muted">Lista jest jeszcze pusta.</span>'}</div></details>`;
  host.querySelector("[data-gang-demand-block-selected]")?.addEventListener("click",()=>gangDemandSetTradableGlobal(selectedId,true));
  host.querySelectorAll("[data-gang-demand-unblock]").forEach(button=>button.addEventListener("click",()=>gangDemandSetTradableGlobal(Number(button.dataset.gangDemandUnblock),false)));
}

function renderGangDemandGlobal(payload) {
  const box=el("gang-demand-list");
  if (!box) return;
  const entries=Array.isArray(payload&&payload.entries) ? payload.entries : [];
  box.innerHTML=entries.length ? entries.map(entry=>{
    const item=gangDemandItemGlobal(entry.itemId);
    const action=entry.canClose ? `<button type="button" class="gang-demand-close" data-gang-demand-close="${escapeHtml(entry.id)}">${entry.canDelete?"🗑 Usuń":"✅ Załatwione"}</button>` : "";
    const blocked=gangDemandBlockedIdsGlobal.has(Number(entry.itemId)) ? '<span class="gang-demand-card-meta">🚫 Przedmiot oznaczony jako niewymienialny</span>' : "";
    return `<article class="gang-demand-card">${gangDemandIconGlobal(item)}<div class="gang-demand-card-main"><strong>${escapeHtml(item.name)} × ${Math.max(1,Number(entry.amount)||1)}</strong><span class="gang-demand-card-meta">${escapeHtml(entry.nick||"Członek Gangu")} · ${escapeHtml(gangAnnouncementDate(entry.createdAt))}</span>${blocked}${entry.note?`<span class="gang-demand-card-note">${escapeHtml(entry.note)}</span>`:""}</div>${action}</article>`;
  }).join("") : '<div class="empty">📦 Brak aktywnego zapotrzebowania. Dodaj pierwszy przedmiot, którego szukasz.</div>';
  box.querySelectorAll("[data-gang-demand-close]").forEach(button=>button.addEventListener("click",()=>gangDemandCloseGlobal(button.dataset.gangDemandClose,button.textContent.includes("Usuń"))));
}

async function loadGangDemandGlobal(options={}) {
  if (gangDemandLoadInFlightGlobal) return gangDemandLoadInFlightGlobal;
  if (gangDemandCacheGlobal && !options.force) {
    renderGangDemandGlobal(gangDemandCacheGlobal);
    renderGangDemandAdminToolsGlobal();
    return gangDemandCacheGlobal;
  }
  gangDemandLoadInFlightGlobal=(async()=>{
    const token=playerAccountSessionToken(),box=el("gang-demand-list");
    if (!token) { if (box) box.innerHTML='<div class="empty">🔒 Zaloguj się, aby zobaczyć zapotrzebowanie ekipy.</div>'; return null; }
    try {
      const payload=await Promise.race([
        jsonp("gangDemand",{sessionToken:token,_:options.force?Date.now():""},{retry:false}),
        new Promise((_,reject)=>setTimeout(()=>reject(new Error("Serwer nie odpowiedział w 8 sekund.")),8000))
      ]);
      if (!payload||!payload.ok) throw new Error(payload&&payload.error ? payload.error : "Nie udało się pobrać zapotrzebowania.");
      gangDemandCacheGlobal=payload;
      gangDemandBlockedIdsGlobal=new Set((Array.isArray(payload.blockedItemIds)?payload.blockedItemIds:[]).map(Number).filter(Number.isFinite));
      gangDemandAdminGlobal=Boolean(payload.admin);
      renderGangDemandGlobal(payload);
      renderGangDemandAdminToolsGlobal();
      return payload;
    } catch(err) {
      if (box) box.innerHTML=`<div class="empty">❌ Nie udało się pobrać zapotrzebowania.<br><small>${escapeHtml(err&&err.message ? err.message : "Sprawdź połączenie.")}</small></div>`;
      return null;
    }
  })();
  try { return await gangDemandLoadInFlightGlobal; } finally { gangDemandLoadInFlightGlobal=null; }
}

async function gangDemandCloseGlobal(id,isDelete) {
  const status=el("gang-demand-status");
  if (status) status.textContent="⏳ Zapisuję zmianę…";
  try { await playerAccountPostAction("gangDemandClose",{sessionToken:playerAccountSessionToken(),id,delete:Boolean(isDelete)}); if (status) status.textContent="✅ Wpis usunięty z aktywnego zapotrzebowania."; await loadGangDemandGlobal({force:true}); }
  catch(err) { if (status) status.textContent="❌ "+(err.message||"Nie udało się zmienić wpisu."); }
}

async function gangDemandSetTradableGlobal(itemId,blocked) {
  const status=el("gang-demand-status"),item=gangDemandItemGlobal(itemId);
  if (!gangDemandAdminGlobal || !itemId) return;
  if (status) status.textContent=blocked ? `⏳ Oznaczam „${item.name}” jako niewymienialny…` : `⏳ Przywracam „${item.name}” do wyboru…`;
  try {
    await playerAccountPostAction("gangDemandSetTradable",{sessionToken:playerAccountSessionToken(),itemId,blocked:Boolean(blocked)});
    if (blocked) {
      gangDemandBlockedIdsGlobal.add(Number(itemId));
      if (Number(el("gang-demand-item-id")?.value)===Number(itemId)) {
        el("gang-demand-item-id").value="";
        el("gang-demand-search").value="";
      }
    } else gangDemandBlockedIdsGlobal.delete(Number(itemId));
    renderGangDemandChoicesGlobal(el("gang-demand-search")?.value||"");
    renderGangDemandAdminToolsGlobal();
    if (status) status.textContent=blocked ? `✅ „${item.name}” nie będzie już dostępny na liście.` : `✅ „${item.name}” ponownie jest dostępny na liście.`;
    loadGangDemandGlobal({force:true}).catch(()=>{});
  } catch(err) {
    if (status) status.textContent="❌ "+(err.message||"Nie udało się zmienić przedmiotu.");
  }
}

function setupGangDemand() {
  const form=el("gang-demand-form"),search=el("gang-demand-search");
  search?.addEventListener("input",()=>{ el("gang-demand-item-id").value=""; renderGangDemandChoicesGlobal(search.value); renderGangDemandAdminToolsGlobal(); });
  search?.addEventListener("focus",()=>renderGangDemandChoicesGlobal(search.value));
  form?.addEventListener("submit",async event=>{
    event.preventDefault();
    const status=el("gang-demand-status"),itemId=Number(el("gang-demand-item-id").value),selected=gangDemandItemGlobal(itemId);
    if (!itemId||selected.id!==itemId||el("gang-demand-search").value!==selected.name) { if (status) status.textContent="⚠️ Wybierz przedmiot z listy."; return; }
    if (status) status.textContent="⏳ Dodaję zapotrzebowanie…";
    try { await playerAccountPostAction("gangDemandAdd",{sessionToken:playerAccountSessionToken(),itemId,amount:Number(el("gang-demand-amount").value),note:el("gang-demand-note").value}); achievementTrack(["gang_demand"]); form.reset(); el("gang-demand-amount").value="1"; if (status) status.textContent="✅ Zapotrzebowanie dodane dla całej ekipy."; await loadGangDemandGlobal({force:true}); }
    catch(err) { if (status) status.textContent="❌ "+(err.message||"Nie udało się dodać wpisu."); }
  });
}

let adminSubmissionsCache = null;
let adminSubmissionsCacheAt = 0;
let adminSubmissionsCacheToken = "";
let adminSubmissionsInFlight = null;
// Kilka kliknięć może zakończyć się w innej kolejności. Ten zbiór sprawia,
// że kafelek wysłany do serwera nie wraca na chwilę po starszym odczycie.
const adminPendingSubmissionRows = new Set();
const ADMIN_SUBMISSIONS_CACHE_TTL_MS = 60 * 1000;

function invalidateAdminSubmissionsCache() {
  adminSubmissionsCache = null;
  adminSubmissionsCacheAt = 0;
  adminSubmissionsCacheToken = "";
}

async function fetchAdminSubmissionsPayload(options={}) {
  const force = Boolean(options.force);
  const token = adminToken();

  if (!token) {
    invalidateAdminSubmissionsCache();
    return null;
  }

  if (
    !force &&
    adminSubmissionsCache &&
    adminSubmissionsCacheToken === token &&
    Date.now() - adminSubmissionsCacheAt < ADMIN_SUBMISSIONS_CACHE_TTL_MS
  ) {
    return adminSubmissionsCache;
  }

  if (adminSubmissionsInFlight) {
    return adminSubmissionsInFlight;
  }

  adminSubmissionsInFlight = (async () => {
    try {
      const payload = await jsonp(
        "adminSubmissions",
        {token}
      );

      if (payload && payload.ok) {
        adminSubmissionsCache = payload;
        adminSubmissionsCacheAt = Date.now();
        adminSubmissionsCacheToken = token;
      }

      return payload;
    } finally {
      adminSubmissionsInFlight = null;
    }
  })();

  return adminSubmissionsInFlight;
}

async function loadAdminSubmissions(options={}) {

  const token =
    adminToken();

  if (!token) {
    showAdminLogin();
    return;
  }

  el("admin-status").textContent =
    "Pobieranie zgłoszeń...";

  try {

    const payload =
      await fetchAdminSubmissionsPayload(options);

    if (
      !payload ||
      !payload.ok
    ) {

      if (
        payload &&
        String(
          payload.error || ""
        )
          .toLowerCase()
          .includes(
            "brak dostępu"
          )
      ) {

        setAdminToken("");

        showAdminLogin(
          "Sesja administratora wygasła."
        );

        return;
      }

      throw new Error(
        payload &&
        payload.error
          ? payload.error
          : "Nie udało się pobrać zgłoszeń."
      );
    }

    const submissions =
      Array.isArray(
        payload.submissions
      )
        ? payload.submissions
        : [];

    const visibleSubmissions = submissions.filter(
      item => !adminPendingSubmissionRows.has(String(item && item.row))
    );

    setAdminSectionBadge(
      "admin-section-submissions",
      visibleSubmissions.length
    );

    // Zbiorczy badge też aktualizujemy po pełnym odczycie sekcji.
    loadAdminDashboardStatus().catch(()=>{});

    el(
      "admin-submissions"
    ).innerHTML =
      visibleSubmissions.length

        ? visibleSubmissions
            .map(
              adminSubmissionCard
            )
            .join("")

        : `
            <div
              style="
                padding:14px;
                border:1px solid #bad7ba;
                border-radius:8px;
                background:#eef7ee;
              ">
              ✅ Brak zgłoszeń oczekujących na weryfikację.
            </div>
          `;

	document
  .querySelectorAll(
    "#admin-submissions [data-admin-action]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const row =
          Number(
            button.dataset.row
          );

        const newStatus =
          button.dataset.adminAction;

        setAdminSubmissionStatus(
          row,
          newStatus,
          button,
          button.dataset.correction === "1"
        );
      }
    );
  });

    el("admin-status").textContent =
      "";

  } catch (err) {

    if (!adminWarmSilent) {
      el("admin-status").textContent =
        err && err.message
          ? err.message
          : "Nie udało się pobrać zgłoszeń.";
    }
  }
}

function formatAdminDate(value) {

  const m =
    /^(\d{4})-(\d{2})-(\d{2})$/
      .exec(String(value || ""));

  if (!m) {
    return value || "—";
  }

  return `${m[3]}.${m[2]}.${m[1]}`;
}

function adminPlayerRow(player) {

  return `
    <div
      style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        padding:7px 9px;
        margin-bottom:5px;
        border:1px solid #d8c7aa;
        border-radius:7px;
        background:#fffdf8;
      "
    >

      <strong>
        ${escapeHtml(player.nick)}
      </strong>

      <button
        type="button"
        data-delete-player="${escapeHtml(player.nick)}"
        style="
          background:#fff0f0;
          border-color:#d9aaaa;
          white-space:nowrap;
        "
      >
        🗑 Usuń
      </button>

    </div>
  `;
}

async function loadAdminPlayers() {

  const token =
    adminToken();

  const box =
    el("admin-players-list");

  const status =
    el("admin-players-status");

  if (
    !token ||
    !box ||
    !status
  ) {
    return;
  }


  status.textContent =
    "Pobieranie graczy...";


  try {

    const payload =
      await jsonp(
        "adminPaymentsStatus",
        {token}
      );


    if (
      !payload ||
      !payload.ok
    ) {

      throw new Error(
        payload &&
        payload.error
          ? payload.error
          : "Nie udało się pobrać graczy."
      );
    }


    const players =
      Array.isArray(
        payload.players
      )
        ? payload.players
        : [];


    // Lista graczy jest od v20.5 renderowana wspólnie
    // z uprawnieniami w account-admin-permissions.
    // Ten element zostaje tylko dla kompatybilności starego kodu.
    box.innerHTML = "";


    status.textContent = "";

    await runtimeLoaderFinish(
      "✅ Dane sprawdzone"
    );


  } catch (err) {

    status.textContent =
      err && err.message
        ? err.message
        : "Nie udało się pobrać graczy.";
  }
}

async function addAdminPlayer(event) {

  event.preventDefault();


  const token =
    adminToken();

  const input =
    el("admin-player-nick");

  const status =
    el("admin-players-status");


  const nick =
    String(
      input.value || ""
    ).trim();


  if (!nick) {

    status.textContent =
      "Podaj nick gracza.";

    return;
  }


  status.textContent =
    "Dodawanie gracza...";

  adminLoaderTexts(
    "playerAdd"
  );

  criticalOperationStart(
    "➕ Dodaję gracza…",
    "Aktualizuję roster i snapshot Wpłat."
  );

  try {

    await confirmedAdminMutationPost(
      "adminAddPlayer",
      {
        action:"adminAddPlayer",
        token,
        nick
      },
      {token}
    );


    input.value = "";

    status.textContent =
      `✅ Dodano gracza ${nick}.`;


    await loadAdminPlayers();
    await loadAccountAdminPermissions();

    await loadAdminPaymentsStatus();

    await runtimeLoaderFinish(
      "✅ Gracz dodany"
    );


  } catch (err) {

    status.textContent =
      err && err.message
        ? err.message
        : "Nie udało się dodać gracza.";

    await runtimeLoaderFinish(
      "❌ Dodawanie nieudane"
    );
  } finally {
    criticalOperationFinish();
  }
}

async function deleteAdminPlayer(
  nick
) {

  const token =
    adminToken();

  const status =
    el("admin-players-status");


  const first =
    window.confirm(
      `Czy na pewno chcesz usunąć gracza "${nick}"?`
    );


  if (!first) {
    return;
  }


  const second =
    window.prompt(
      `UWAGA!\n\n` +
      `Usunięcie gracza "${nick}" usunie jego bieżącą historię z tabeli.\n\n` +
      `Aby potwierdzić, wpisz dokładnie nick gracza:`
    );


  if (
    second === null
  ) {
    return;
  }


  if (
    second.trim()
      .toLocaleLowerCase(
        "pl-PL"
      ) !==
    nick.trim()
      .toLocaleLowerCase(
        "pl-PL"
      )
  ) {

    status.textContent =
      "Usuwanie anulowane — nick potwierdzający jest nieprawidłowy.";

    return;
  }


  status.textContent =
    `Usuwanie gracza ${nick}...`;

  adminLoaderTexts(
    "playerDelete"
  );

  criticalOperationStart(
    "🗑 Usuwam gracza…",
    "Usuwam bieżące dane gracza, konto i aktualizuję snapshot."
  );

  try {

    await confirmedAdminMutationPost(
      "adminDeletePlayer",
      {
        action:"adminDeletePlayer",
        token,
        nick,
        confirmationNick:second.trim()
      },
      {token}
    );


    status.textContent =
      `✅ Usunięto gracza ${nick}.`;


    await loadAdminPlayers();
    await loadAccountAdminPermissions();

    await loadAdminPaymentsStatus();

    await runtimeLoaderFinish(
      "✅ Gracz usunięty"
    );


  } catch (err) {

    status.textContent =
      err && err.message
        ? err.message
        : "Nie udało się usunąć gracza.";

    await runtimeLoaderFinish(
      "❌ Usuwanie nieudane"
    );
  } finally {
    criticalOperationFinish();
  }
}


async function renameAdminPlayer(
  oldNick
) {
  const status =
    el("admin-players-status");

  const proposed =
    window.prompt(
      `Zmiana nicku gracza\n\nAktualny nick: ${oldNick}\n\nPodaj nowy nick:`,
      oldNick
    );

  if (proposed === null) {
    return;
  }

  const newNick =
    String(proposed || "").trim();

  if (!newNick) {
    if (status) {
      status.textContent =
        "Podaj nowy nick gracza.";
    }
    return;
  }

  if (
    newNick.toLocaleLowerCase("pl-PL") ===
    String(oldNick || "")
      .trim()
      .toLocaleLowerCase("pl-PL")
  ) {
    if (status) {
      status.textContent =
        "Nowy nick jest taki sam jak obecny.";
    }
    return;
  }

  if (
    !window.confirm(
      `Zmienić nick "${oldNick}" → "${newNick}"?\n\n` +
      `Konto, hasło, aktywne sesje, bieżący fundusz i buildy zostaną zachowane.`
    )
  ) {
    return;
  }

  if (status) {
    status.textContent =
      `Zmieniam nick ${oldNick} → ${newNick}...`;
  }

  criticalOperationStart(
    "✏️ Zmieniam nick gracza…",
    "Migruję konto, sesje i bieżące dane gracza."
  );

  try {
    await adminPostAction(
      "adminRenamePlayer",
      {
        oldNick,
        newNick
      }
    );

    accountAdminPlayersCacheAt = 0;
    invalidateAppCache("payments");
    invalidateAppCache("builds");

    await Promise.allSettled([
      loadAdminPlayers(),
      loadAccountAdminPermissions({force:true}),
      loadAdminPaymentsStatus(),
      loadPayments({background:true})
    ]);

    if (status) {
      status.textContent =
        `✅ Zmieniono nick ${oldNick} → ${newNick}.`;
    }

    await runtimeLoaderFinish(
      "✅ Nick zmieniony"
    );
  } catch (err) {
    if (status) {
      status.textContent =
        err && err.message
          ? err.message
          : "Nie udało się zmienić nicku.";
    }

    await runtimeLoaderFinish(
      "❌ Zmiana nicku nieudana"
    );
  } finally {
    criticalOperationFinish();
  }
}


function adminReportDate(value) {

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/
      .exec(String(value || ""));

  if (!match) {
    return String(value || "");
  }

  return (
    match[3] +
    "." +
    match[2] +
    "." +
    match[1]
  );
}


function adminReportAmount(value) {

  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  const rounded =
    Math.round(number);

  const formatted =
    Math.abs(rounded)
      .toLocaleString(
        "pl-PL",
        {
          maximumFractionDigits: 0
        }
      );

  if (number > 0) {
    return "+" + formatted;
  }

  if (number < 0) {
    return "-" + formatted;
  }

  return "0";
}


function adminReportNick(value) {

  const nick =
    String(value || "");

  const width = 22;

  if (nick.length >= width) {
    return nick.slice(0,width);
  }

  return (
    nick +
    " ".repeat(
      width - nick.length
    )
  );
}


function buildAdminDailyReport(payload) {

  const players =
    Array.isArray(
      payload &&
      payload.players
    )
      ? payload.players
      : [];

  const date =
    adminReportDate(
      payload &&
      payload.saldoDate
    );

  const rows =
    players
      .map(
        player =>
          adminReportNick(
            player.nick
          ) +
          adminReportAmount(
            player.saldo
          )
      )
      .join("\n");

  return (
`📊 Dzienne podsumowanie wpłat — ${date}

🔴 wartość ujemna — dług do nadrobienia
🟢 0 — wszystko na bieżąco
🔵 wartość dodatnia — wkład w firmę

Każdego dnia naliczany jest wymóg 2 000 zł.
Nadpłata przechodzi na kolejne dni i jednocześnie stanowi wkład w firmę.

🏢 Od 30 000 zł wkładu gracz kwalifikuje się do udziału w spółce.

\`\`\`
${rows}
\`\`\`

🔎 MenelWars Tools
https://roq665.github.io/Menelwars-Tools/
(Hasło do wpłat: 6N4X38)

Dziękuję wszystkim za regularne wpłaty i dodatkowe wsparcie. ❤️`
  );
}


async function copyAdminDailyReport() {

  const status =
    el(
      "admin-copy-daily-report-status"
    );

  if (!adminPaymentsSnapshot) {

    if (status) {
      status.textContent =
        "Najpierw pobierz dane wpłat.";
    }

    return;
  }

  const report =
    buildAdminDailyReport(
      adminPaymentsSnapshot
    );

  try {

    await navigator.clipboard.writeText(
      report
    );

    if (status) {

      status.textContent =
        "✅ Raport skopiowany do schowka.";

      setTimeout(
        () => {
          if (status) {
            status.textContent = "";
          }
        },
        2000
      );
    }

  } catch (err) {

    if (status) {
      status.textContent =
        "Nie udało się skopiować raportu.";
    }
  }
}


function companyMoney(value) {

  return Number(value || 0)
    .toLocaleString(
      "pl-PL",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    );
}


function companyPlan(
  payload,
  income
) {
  const players=
    Array.isArray(payload&&payload.players)
      ? payload.players
      : [];

  const rows=players
    .filter(p=>Number(p.share)>0 || Number(p.salary)>0)
    .sort((a,b)=>Number(b.contribution||0)-Number(a.contribution||0));

  return {
    income:Number(payload.companyIncome ?? income)||0,
    salaryBudget:Number(payload.salaryBudget)||0,
    developmentBudget:Number(payload.developmentBudget)||0,
    actualSalaryTotal:Number(payload.actualPayoutTotal)||0,
    waivedToFund:Number(payload.waivedToFund)||0,
    roundingToFund:Number(payload.roundingToFund)||0,
    rows
  };
}

function renderAdminCompanyPlan(
  payload =
    adminPaymentsSnapshot
) {

  const result =
    el(
      "admin-company-result"
    );

  const input =
    el(
      "admin-company-income"
    );

  if (
    !result ||
    !input ||
    !payload
  ) {
    return;
  }

  const income =
    Math.max(
      0,
      Number(
        payload.companyIncome ??
        String(
          input.value || ""
        )
          .replace(/\s+/g, "")
          .replace(",", ".")
      ) || 0
    );

  input.value =
    String(income);

  const plan =
    companyPlan(
      payload,
      income
    );

  const totalContribution =
    (Array.isArray(payload.players)
      ? payload.players
      : []
    ).reduce(
      (sum, player) =>
        sum +
        Math.max(
          0,
          Number(
            player.contribution
          ) || 0
        ),
      0
    );

  const preparedRows = plan.rows.map(player => {
    const proposed = Math.max(0, Number(player.payoutSalary) || 0);
    const activeExists = Boolean(player.activePlanExists);
    const active = activeExists
      ? Math.max(0, Number(player.activePayoutSalary) || 0)
      : null;
    const requestedWaiver = Boolean(
      player.requestedSalaryWaived ?? player.salaryWaived
    );
    const activeWaiver = Boolean(player.activeSalaryWaived);
    const waiverPending = Boolean(player.waiverPending);
    const salaryChanged =
      !activeExists || active === null || Math.abs(active - proposed) > 0.009;
    // Tabela "Co ustawić w MenelWars" ma pokazywać wyłącznie
    // realną zmianę, którą Admin musi wykonać w grze.
    //
    // player.planPending może być true także wtedy, gdy zmieniła się
    // pełna należna / kwota Funduszu, ale wypłata w grze pozostaje
    // identyczna (np. aktywne zrzeczenie: 160 zł -> 160 zł).
    // Taki gracz powinien mieć "ZOSTAW", nie "USTAW".
    const needsAction =
      salaryChanged || waiverPending;

    return {
      player, proposed, activeExists, active, requestedWaiver,
      activeWaiver, waiverPending, needsAction
    };
  });

  const anyNeedsAction = preparedRows.some(row => row.needsAction);

  const salarySort = (a, b) =>
    (b.proposed - a.proposed) ||
    String(a.player.nick || "").localeCompare(
      String(b.player.nick || ""), "pl", { sensitivity: "base" }
    );

  const orderedRows = anyNeedsAction
    ? [
        ...preparedRows.filter(row => row.needsAction).sort(salarySort),
        ...preparedRows.filter(row => !row.needsAction).sort(salarySort)
      ]
    : [...preparedRows].sort(salarySort);

  const renderSalaryRow = row => {
    const {
      player, proposed, activeExists, active, requestedWaiver,
      activeWaiver, waiverPending, needsAction
    } = row;

    let waiverHtml = "";
    if (requestedWaiver && waiverPending) {
      waiverHtml = `<span class="admin-company-waiver pending">💚 Zrzeczenie od kolejnego</span>`;
    } else if (!requestedWaiver && waiverPending && activeWaiver) {
      waiverHtml = `<span class="admin-company-waiver pending-off">↩️ Zrzeczenie wycofane</span>`;
    } else if (requestedWaiver) {
      waiverHtml = `<span class="admin-company-waiver active">💚 Zrzeczenie aktywne</span>`;
    }

    const instruction = needsAction
      ? `<div class="admin-company-instruction change${requestedWaiver && waiverPending ? " waiver-change" : ""}">
           <span>${requestedWaiver && waiverPending ? "🔴 ZRZECZENIE · USTAW" : "🟡 USTAW"}</span>
           <strong>${companyMoney(proposed)} zł</strong>
         </div>`
      : `<div class="admin-company-instruction keep">
           <span>🟢 ZOSTAW</span>
           <strong>${companyMoney(proposed)} zł</strong>
         </div>`;

    return `
      <div class="admin-company-salary-row ${needsAction ? "needs-change" : "no-change"}">
        <div class="admin-company-salary-player">
          <div class="admin-company-player-name">
            <strong>${escapeHtml(player.nick)}</strong>
            ${waiverHtml}
          </div>
          <div class="muted">
            Wkład: ${companyMoney(player.contribution)} zł
            · należna: ${companyMoney(player.salary)} zł
            · udział: ${(Number(player.share)*100).toFixed(2).replace(".",",")}%
          </div>
          <div class="admin-company-current-salary">
            ${activeExists
              ? `Aktualnie ustawione: <strong>${companyMoney(active)} zł</strong>${needsAction ? ` → docelowo: <strong>${companyMoney(proposed)} zł</strong>` : ""}`
              : `<strong>Brak potwierdzonego poprzedniego planu.</strong>`}
          </div>
          ${requestedWaiver
            ? `<div class="muted">Pełna należna: ${companyMoney(player.fullGameSalary)} zł · do Funduszu: ${companyMoney(player.waivedAmount)} zł</div>`
            : ""}
        </div>
        ${instruction}
      </div>`;
  };

  let rowsHtml = "";
  if (!orderedRows.length) {
    rowsHtml = `<div class="empty">Nikt nie osiągnął jeszcze progu ${companyMoney(COMPANY_MIN_CONTRIBUTION)} zł.</div>`;
  } else if (anyNeedsAction) {
    const changed = orderedRows.filter(row => row.needsAction);
    const correct = orderedRows.filter(row => !row.needsAction);
    rowsHtml = `
      <div class="admin-company-salary-section change-section">
        <div class="admin-company-salary-section-head">
          <strong>🔶 DO ZMIANY</strong><span>${changed.length} ${changed.length === 1 ? "osoba" : "osób"}</span>
        </div>
        ${changed.map(renderSalaryRow).join("")}
      </div>
      ${correct.length ? `
        <div class="admin-company-salary-section correct-section">
          <div class="admin-company-salary-section-head">
            <strong>✅ POPRAWNE</strong><span>${correct.length} ${correct.length === 1 ? "osoba" : "osób"}</span>
          </div>
          ${correct.map(renderSalaryRow).join("")}
        </div>` : ""}`;
  } else {
    rowsHtml = orderedRows.map(renderSalaryRow).join("");
  }

  result.innerHTML = `
    <div style="
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(135px,1fr));
      gap:6px;
      margin-bottom:8px;
    ">
      <div style="
        padding:8px;
        border:1px solid #d8c7aa;
        border-radius:7px;
        background:#fffdf8;
      ">
        <div class="muted">
          Łączny wkład
        </div>
        <strong>
          ${companyMoney(
            totalContribution
          )} zł
        </strong>
      </div>

      <div style="
        padding:8px;
        border:1px solid #d8c7aa;
        border-radius:7px;
        background:#fffdf8;
      ">
        <div class="muted">
          Kwalifikowani
        </div>
        <strong>
          ${plan.rows.length}
        </strong>
      </div>

      <div style="
        padding:8px;
        border:1px solid #d8c7aa;
        border-radius:7px;
        background:#fffdf8;
      ">
        <div class="muted">
          Budżet pensji 50%
        </div>
        <strong>
          ${companyMoney(
            plan.salaryBudget
          )} zł
        </strong>
      </div>

      <div style="
        padding:8px;
        border:1px solid #d8c7aa;
        border-radius:7px;
        background:#fffdf8;
      ">
        <div class="muted">
          Do wypłaty
        </div>
        <strong>
          ${companyMoney(
            plan.actualSalaryTotal
          )} zł
        </strong>
      </div>

      <div style="
        padding:8px;
        border:1px solid #d8c7aa;
        border-radius:7px;
        background:#fffdf8;
      ">
        <div class="muted">
          Rozwój 50%
        </div>
        <strong>
          ${companyMoney(
            plan.developmentBudget
          )} zł
        </strong>
      </div>
    </div>

    <div class="muted" style="margin-bottom:6px">
      Próg zatrudnienia:
      <b>
        ${companyMoney(
          COMPANY_MIN_CONTRIBUTION
        )} zł
      </b>.
      Każdy zakwalifikowany dostaje najpierw
      <b>${COMPANY_BASE_SALARY} zł</b>,
      a pozostała część 50% dochodu jest
      dzielona według wagi <b>wkład<sup>0,8</sup></b>.
      Pensję do gry zawsze ucinamy do pełnych złotych.
    </div>

    <div class="admin-company-salary-guide">
      <strong>🎮 Co ustawić w MenelWars</strong>
      <span>
        🟡 USTAW = wartość różni się od ostatnio potwierdzonego planu.
        🟢 ZOSTAW = w grze powinna już być prawidłowa wartość.
      </span>
    </div>

    ${rowsHtml}
  `;

  const activeStatus=el("admin-company-active-plan-status");

  if (activeStatus) {
    if (payload.hasActivePlan && Number(payload.activePlanEffectiveFrom)) {
      const activeDate=new Date(Number(payload.activePlanEffectiveFrom));

      activeStatus.innerHTML=
        `<strong>🟢 Aktywny plan:</strong> ${escapeHtml(activeDate.toLocaleString("pl-PL"))}` +
        (payload.proposalChanged
          ? ` · <strong>🟡 obecne wyliczenia oczekują na ustawienie w grze</strong>`
          : ` · aktualne wyliczenia są zgodne z planem`);
    } else {
      activeStatus.innerHTML=
        `<strong>🔴 Brak aktywnego planu.</strong> Ustaw pokazane pensje w MenelWars i potwierdź je przed najbliższą wypłatą o 03:00.`;
    }
  }
}

async function loadAdminPaymentsStatus() {

  const token =
    adminToken();

  if (!token) {
    showAdminLogin();
    return;
  }

  const box =
    el("admin-payments-status-box");

  if (!box) {
    return;
  }

  box.innerHTML = `
    <div class="muted">
      Pobieranie statusu wpłat...
    </div>
  `;

  try {

    const payload =
      await jsonp(
        "adminPaymentsStatus",
        {token}
      );

    if (
      !payload ||
      !payload.ok
    ) {

      if (
        payload &&
        String(payload.error || "")
          .toLowerCase()
          .includes("brak dostępu")
      ) {

        setAdminToken("");

        showAdminLogin(
          "Sesja administratora wygasła."
        );

        return;
      }

      throw new Error(
        payload && payload.error
          ? payload.error
          : "Nie udało się pobrać statusu wpłat."
      );
    }

    adminPaymentsSnapshot =
      payload;

    renderAdminCompanyPlan(
      payload
    );

    const writeProtection =
      payload.writeProtection || {blocked:false};

    const writeBlocked =
      Boolean(writeProtection.blocked);

    const saveButton = el("admin-payments-preview");
    if (saveButton) {
      saveButton.disabled = writeBlocked;
      saveButton.textContent = writeBlocked
        ? "🌙 Aktualizacja zablokowana do 04:00"
        : "🔎 Sprawdź i zapisz ranking";
    }

    box.innerHTML = `

      <div class="admin-snapshot-meta">
        <span>💾 Wpłaty: ${escapeHtml(formatAdminDate(payload.snapshotUpdatedAtDisplay || payload.lastClose))}</span>
        <span>🟢 Fundusz: ${escapeHtml(formatAdminDate(payload.fundSnapshotUpdatedAtDisplay))}</span>
      </div>

      <div style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
        gap:8px;
      ">

        <div style="
          padding:10px;
          border:1px solid #d8c7aa;
          border-radius:8px;
          background:#fffdf8;
        ">
          <div class="muted">
            Snapshot rankingu do
          </div>

          <strong>
            ${escapeHtml(
              formatAdminDate(
                payload.saldoDate
              )
            )}
          </strong>
        </div>


        <div style="
          padding:10px;
          border:1px solid #d8c7aa;
          border-radius:8px;
          background:#fffdf8;
        ">
          <div class="muted">
            Ostatnia aktualizacja
          </div>

          <strong>
            ${escapeHtml(
              formatAdminDate(
                payload.lastClose
              )
            )}
          </strong>
        </div>


        <div style="
          padding:10px;
          border:1px solid #d8c7aa;
          border-radius:8px;
          background:#fffdf8;
        ">
          <div class="muted">
            Graczy w tabeli
          </div>

          <strong>
            ${Number(payload.count) || 0}
          </strong>
        </div>

      </div>

      ${
        writeBlocked
          ? `
              <div style="
                margin-top:10px;
                padding:10px;
                border:1px solid #e0b766;
                border-radius:8px;
                background:#fff8e7;
              ">

                <strong>
                  🌙 Okres ochronny 00:00–04:00
                </strong>

                <div
                  class="muted"
                  style="margin-top:4px"
                >
                  Możesz sprawdzać raporty,
                  ale wprowadzanie danych
                  będzie zablokowane do 04:00.
                </div>

              </div>
            `
          : `
              <div style="
                margin-top:10px;
                padding:10px;
                border:1px solid #bad7ba;
                border-radius:8px;
                background:#eef7ee;
              ">

                <strong>
                  ✅ Wprowadzanie danych dostępne
                </strong>

              </div>
            `
      }
    `;

  } catch (err) {

    box.innerHTML = `
      <div style="
        padding:10px;
        border:1px solid #e3b2b2;
        border-radius:8px;
        background:#fff1f1;
      ">
        ${escapeHtml(
          err && err.message
            ? err.message
            : "Nie udało się pobrać statusu wpłat."
        )}
      </div>
    `;
  }
}

function paymentPreviewMoney(value) {
  return Number(value).toLocaleString(
    "pl-PL",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  );
}


function renderAdminPaymentsPreview(payload) {

  const result = el("admin-payments-preview-result");
  const importButton = el("admin-payments-import");
  const players = Array.isArray(payload.players) ? payload.players : [];
  const errors = Array.isArray(payload.errors) ? payload.errors : [];
  const warnings = Array.isArray(payload.warnings) ? payload.warnings : [];

  if (importButton) {
    importButton.hidden = !payload.canWrite;
    importButton.disabled = false;
  }

  const summary = `
    <div class="panel" style="margin-bottom:10px">
      <div class="panel-body">
        <b>${payload.mode === "initialize" ? "🧭 Pierwszy snapshot" : "✅ Rozliczenie do zapisania"}</b><br>
        Stan rankingu: <b>${escapeHtml(formatAdminDate(payload.closeDate))}</b><br>
        Aktywni w rosterze: <b>${Number(payload.rosterCount)||0}</b> ·
        znalezieni: <b>${Number(payload.matchedCount)||0}</b> ·
        zignorowani spoza gangu: <b>${Number(payload.ignoredCount)||0}</b>
      </div>
    </div>`;

  const messages = [
    ...errors.map(x => `<div style="color:#9b2d2d;margin:4px 0">❌ ${escapeHtml(x)}</div>`),
    ...warnings.map(x => `<div style="color:#8a6500;margin:4px 0">⚠️ ${escapeHtml(x)}</div>`)
  ].join("");

  const rows = players.map(player => {
    const baseline = player.status === "baseline";
    const waiting = player.status === "waiting_baseline";
    const bad = player.status === "error";
    const bg = bad ? "#fff1f1" : waiting ? "#f3f3f3" : baseline ? "#eef4ff" : "#eef7ee";
    const border = bad ? "#e3b2b2" : waiting ? "#c8c8c8" : baseline ? "#b7c8e8" : "#bad7ba";

    return `
      <div style="border:1px solid ${border};background:${bg};border-radius:8px;padding:8px;margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;gap:8px"><strong>${escapeHtml(player.nick)}</strong><strong>${paymentPreviewMoney(player.newBalance)} zł</strong></div>
        <div class="muted" style="margin-top:3px">
          ${baseline ? "Pierwszy odczyt · delta 0 zł" : waiting ? "Oczekiwanie na pierwszy odczyt" : `Nowe wpłaty: +${paymentPreviewMoney(player.delta)} zł · Obowiązek: -${paymentPreviewMoney(player.obligation)} zł (${Number(player.chargedDays)||0} dni)${Number(player.repairCredit) > 0 ? ` · Korekta karencji: +${paymentPreviewMoney(player.repairCredit)} zł` : ""}`}
        </div>
        ${player.previousTotal != null ? `<div class="muted">Suma: ${paymentPreviewMoney(player.previousTotal)} → ${paymentPreviewMoney(player.currentTotal)} zł · wpłaty: ${Number(player.previousCount)||0} → ${Number(player.currentCount)||0}</div>` : ""}
      </div>`;
  }).join("");

  result.innerHTML = summary + messages + rows;
}


async function previewAdminPayments() {
  // v20.70 — jedno kliknięcie: walidacja i zapis są atomowe po stronie backendu.
  return importAdminPayments();
}
async function importAdminPayments() {
  const token = adminToken();

  if (!token) {
    showAdminLogin();
    return;
  }

  const report = el("admin-payments-report").value.trim();
  const status = el("admin-payments-preview-status");
  const resultBox = el("admin-payments-preview-result");
  const button = el("admin-payments-preview");

  if (!report) {
    status.textContent = "Wklej pełny ranking łącznych wpłat.";
    return;
  }

  const writeProtection =
    adminPaymentsSnapshot && adminPaymentsSnapshot.writeProtection
      ? adminPaymentsSnapshot.writeProtection
      : null;

  if (writeProtection && writeProtection.blocked) {
    status.textContent =
      "🌙 Aktualizacja Wpłat jest zablokowana od 00:00 do 04:00. Spółka korzysta z ostatniego snapshotu.";
    return;
  }

  const nonce = makeNonce();
  button.disabled = true;
  status.textContent = "Sprawdzanie i zapisywanie danych...";
  if (resultBox) resultBox.innerHTML = "";

  criticalOperationStart(
    "💰 Aktualizuję Ranking wpłat…",
    "Sprawdzam raport, zapisuję dane i tworzę nowy snapshot."
  );

  try {
    let sendError = null;

    try {
      await timedBackendPost(
        "adminImportPayments",
        {
          action:"adminImportPayments",
          token,
          nonce,
          report
        }
      );
    } catch (err) {
      // Nie powtarzamy POST. Import jest idempotentny po nonce; nawet po
      // timeoutcie sprawdzamy wynik tego samego żądania.
      sendError = err;
    }

    let payload = null;

    for (let i=0; i<24; i++) {
      if (i > 0) await new Promise(resolve => setTimeout(resolve,500));

      payload = await jsonp(
        "adminImportPaymentsResult",
        {token,nonce}
      );

      if (!payload || !payload.pending) break;
    }

    if (!payload || payload.pending) {
      throw sendError || new Error("Serwer nie zwrócił wyniku zapisu.");
    }

    if (!payload.ok) {
      if (payload.preview) {
        renderAdminPaymentsPreview(payload.preview);
      }
      throw new Error(payload.error || "Raport zawiera błędy i nie został zapisany.");
    }

    if (payload.preview) {
      renderAdminPaymentsPreview(payload.preview);
    }

    let message = `✅ ${payload.message || "Dane zostały zapisane."}`;

    if (payload.paymentsSnapshot) {
      message += `\n💾 Nowy snapshot: ${formatAdminDate(payload.paymentsSnapshot.updatedAtDisplay || payload.paymentsSnapshot.updatedAt)}`;
    }

    if (
      payload.fundSettlement &&
      Number(payload.fundSettlement.payoutCount) > 0
    ) {
      message +=
        "\n\n💚 Rozliczono wypłaty Spółki: " +
        Number(payload.fundSettlement.payoutCount) +
        "\nDo Funduszu: " +
        (Number(payload.fundSettlement.totalFund) || 0).toLocaleString("pl-PL",{minimumFractionDigits:2,maximumFractionDigits:2}) +
        " zł";
    }

    status.textContent = message;

    // Wszystkie widoki finansowe korzystają od tej chwili
    // z nowego snapshotu.
    invalidateAppCache("gang-finance");

    await Promise.allSettled([
      loadAdminPaymentsStatus(),
      loadPayments({background:true,force:true}),
      loadAdminDashboardStatus()
    ]);

    el("admin-payments-report").value = "";

  } catch (err) {
    status.textContent =
      err && err.message
        ? `❌ ${err.message}`
        : "❌ Nie udało się wprowadzić danych.";
  } finally {
    criticalOperationFinish();

    // Status może po operacji ustawić blokadę nocną albo ponownie odblokować.
    if (!(adminPaymentsSnapshot && adminPaymentsSnapshot.writeProtection && adminPaymentsSnapshot.writeProtection.blocked)) {
      button.disabled = false;
    }
  }
}
function setupAdmin() {

  el("admin-refresh")
    .addEventListener(
      "click",
      () => {
        invalidateAppCache("admin");
        closeAllAdminSections();

        withRuntimeLoader(
          () => Promise.allSettled([
            warmAdminData({force:true})
          ]),
          "🛠️ Odświeżam panel Admina...",
          ['🍺 Panel Admina robi dolewkę, już kończę...','🥫 Szukam ostatniej puszki z uprawnieniami...','🧹 Sprzątam kolejkę requestów...','🥴 Jeszcze tylko jedna rubryka...']
        );
      }
    );

  el("admin-builds-refresh")
    ?.addEventListener(
      "click",
      loadAdminBuilds
    );

  el("admin-payments-preview")
  .addEventListener(
    "click",
    previewAdminPayments
  );

  el("admin-payments-import")
  ?.addEventListener(
    "click",
    importAdminPayments
  );

  el("admin-copy-daily-report")
    ?.addEventListener(
      "click",
      copyAdminDailyReport
    );

  el("admin-company-income")
    ?.addEventListener(
      "change",
      async event => {

        const input =
          event.target;

        const income =
          Math.max(
            0,
            Number(
              String(
                input.value || ""
              )
                .replace(/\s+/g, "")
                .replace(",", ".")
            ) || 0
          );

        input.disabled = true;

        try {

          adminLoaderTexts(
            "company"
          );

          await adminPostAction(
            "adminSetCompanyIncome",
            {income:String(income)}
          );

          await loadAdminPaymentsStatus();

          await runtimeLoaderFinish(
            "✅ Spółka zaktualizowana"
          );

        } catch (err) {

          const status =
            el("admin-status");

          if (status) {
            status.textContent =
              err && err.message
                ? err.message
                : "Nie udało się zapisać dochodu spółki.";
          }

          await runtimeLoaderFinish(
            "❌ Aktualizacja nieudana"
          );

        } finally {
          input.disabled = false;
        }
      }
    );

  el("admin-company-plan-activate")
    ?.addEventListener(
      "click",
      async event => {
        const button=event.currentTarget;
        const status=el("admin-company-plan-action-status");

        if (!window.confirm(
          "Potwierdzasz, że wszystkie pokazane pensje zostały już ustawione w MenelWars?\n\nOd tej chwili ten plan będzie rozliczany przy wypłatach o 03:00."
        )) return;

        setActionLoading(button,status,"Zapisywanie planu...");
        criticalOperationStart(
          "💰 Zapisuję plan pensji…",
          "Ustawiam potwierdzony plan jako źródło wypłaty o 03:00."
        );

        try {
          await adminPostAction(
            "adminActivateCompanySalaryPlan"
          );

          status.textContent=
            "✅ Plan ustawiony w grze został zapisany jako aktywny.";

          await Promise.allSettled([
            loadAdminPaymentsStatus(),
            loadPayments({background:true})
          ]);

          await runtimeLoaderFinish(
            "✅ Plan pensji aktywny"
          );
        } catch (err) {
          status.textContent=
            err&&err.message
              ? err.message
              : "Nie udało się aktywować planu pensji.";

          await runtimeLoaderFinish(
            "❌ Aktywacja nieudana"
          );
        } finally {
          criticalOperationFinish();
          clearActionLoading(button);
          loadAdminDashboardStatus().catch(()=>{});
        }
      }
    );


  el("admin-payments-refresh")
  .addEventListener(
    "click",
    loadAdminPaymentsStatus
  );

  el("admin-clear-all-reservations")
    ?.addEventListener(
      "click",
      async event => {
        if (!window.confirm(
          "Wyczyścić WSZYSTKIE aktywne rezerwacje receptur?"
        )) return;

        const button = event.currentTarget;
        const status = el("admin-gang-tools-status");

        setActionLoading(
          button,
          status,
          "Czyszczenie rezerwacji..."
        );

        try {
          adminLoaderTexts(
            "reservation"
          );

          await adminPostAction(
            "adminClearAllReservations"
          );

          status.textContent =
            "✅ Rezerwacje zostały wyczyszczone.";

          await loadAdminGangTools();
          await fetchApprovedRecipes({force:true});

          await runtimeLoaderFinish(
            "✅ Rezerwacje wyczyszczone"
          );
        } catch (err) {
          status.textContent =
            err.message || "Nie udało się wyczyścić rezerwacji.";

          await runtimeLoaderFinish(
            "❌ Czyszczenie nieudane"
          );
        } finally {
          clearActionLoading(button);
        }
      }
    );

  el("admin-goal-form")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const form = event.currentTarget;
        const button =
          form.querySelector('button[type="submit"]');
        const status =
          el("admin-goal-status");

        const current = Number(
          String(el("admin-goal-current").value || "")
            .replace(/\s+/g,"")
            .replace(",",".")
        );

        const target = Number(
          String(el("admin-goal-target").value || "")
            .replace(/\s+/g,"")
            .replace(",",".")
        );

        setActionLoading(
          button,
          status,
          "Zapisywanie celu..."
        );

        try {
          adminLoaderTexts(
            "goal"
          );

          await adminPostAction(
            "adminSaveGoal",
            {
              title:el("admin-goal-title").value.trim(),
              current,
              target,
              unit:el("admin-goal-unit").value.trim()
            }
          );

          status.textContent =
            "✅ Cel gangu zapisany.";

          // Odświeżamy dane już po pokazaniu użytkownikowi sukcesu.
          await Promise.allSettled([
            loadAdminGangTools(),
            loadPayments({background:true})
          ]);

          await runtimeLoaderFinish(
            "✅ Cel zapisany"
          );

        } catch (err) {
          status.textContent =
            err.message || "Nie udało się zapisać celu.";

          await runtimeLoaderFinish(
            "❌ Zapis celu nieudany"
          );
        } finally {
          clearActionLoading(button);
        }
      }
    );

  el("admin-goal-delete")
    ?.addEventListener(
      "click",
      async event => {
        if (!window.confirm("Usunąć aktywny cel gangu?")) return;

        const button = event.currentTarget;
        const status = el("admin-goal-status");

        setActionLoading(
          button,
          status,
          "Usuwanie celu..."
        );

        try {
          adminLoaderTexts(
            "goal"
          );

          await adminPostAction("adminDeleteGoal");

          status.textContent =
            "✅ Cel został usunięty.";

          await Promise.allSettled([
            loadAdminGangTools(),
            loadPayments({background:true})
          ]);

          await runtimeLoaderFinish(
            "✅ Cel usunięty"
          );

        } catch (err) {
          status.textContent =
            err.message || "Nie udało się usunąć celu.";

          await runtimeLoaderFinish(
            "❌ Usuwanie celu nieudane"
          );
        } finally {
          clearActionLoading(button);
        }
      }
    );

  el("admin-announcement-form")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const form = event.currentTarget;
        const button =
          form.querySelector('button[type="submit"]');
        const status =
          el("admin-gang-tools-status");

        const text =
          el("admin-announcement-text").value.trim();

        if (!text) {
          status.textContent =
            "Wpisz treść ogłoszenia.";
          return;
        }

        setActionLoading(
          button,
          status,
          "Dodawanie ogłoszenia..."
        );

        try {
          adminLoaderTexts(
            "announcement"
          );

          await adminPostAction(
            "adminAddAnnouncement",
            {
              text,
              important:
                el("admin-announcement-important").checked
            }
          );

          el("admin-announcement-text").value = "";
          el("admin-announcement-important").checked = false;

          status.textContent =
            "✅ Ogłoszenie dodane.";

          await Promise.allSettled([
            loadAdminGangTools(),
            loadPayments({background:true})
          ]);

          await runtimeLoaderFinish(
            "✅ Ogłoszenie dodane"
          );

        } catch (err) {
          status.textContent =
            err.message || "Nie udało się dodać ogłoszenia.";

          await runtimeLoaderFinish(
            "❌ Dodawanie nieudane"
          );
        } finally {
          clearActionLoading(button);
        }
      }
    );


  el("admin-player-add-form")
    ?.addEventListener(
      "submit",
      addAdminPlayer
    );

  el("admin-poll-create")
    ?.addEventListener(
      "click",
      async event => {
        const button =
          event.currentTarget;

        const status =
          el("admin-poll-status");

        const title =
          el("admin-poll-title")
            .value.trim();

        const question =
          el("admin-poll-question")
            .value.trim();

        const options =
          el("admin-poll-options")
            .value
            .split(/\r?\n/)
            .map(value =>
              value.trim()
            )
            .filter(Boolean);

        const endValue =
          el("admin-poll-end")
            .value;

        if (
          !title ||
          !question ||
          options.length < 2
        ) {
          status.textContent =
            "Podaj tytuł, pytanie i co najmniej 2 odpowiedzi.";
          return;
        }

        setActionLoading(
          button,
          status,
          "Tworzenie ankiety..."
        );

        try {
          adminLoaderTexts(
            "poll"
          );

          await adminPostAction(
            "adminCreateGangPoll",
            {
              title,
              question,
              options,
              endAt:
                endValue
                  ? new Date(
                      endValue
                    ).toISOString()
                  : ""
            }
          );

          status.textContent =
            "✅ Ankieta została utworzona.";

          el("admin-poll-title").value = "";
          el("admin-poll-question").value = "";
          el("admin-poll-options").value = "";
          el("admin-poll-end").value = "";

          invalidateGangPollsCache();

          await Promise.allSettled([
            fetchGangPollsPayload({force:true}),
            loadAdminPolls(),
            loadGangPolls()
          ]);

          await runtimeLoaderFinish(
            "✅ Ankieta utworzona"
          );

        } catch (err) {
          status.textContent =
            err.message ||
            "Nie udało się utworzyć ankiety.";

          await runtimeLoaderFinish(
            "❌ Tworzenie nieudane"
          );
        } finally {
          clearActionLoading(button);
        }
      }
    );


  el("admin-salary-player")
    ?.addEventListener(
      "change",
      refreshAdminAccountCodeStatus
    );


  el("admin-identity-revoke-all")
    ?.addEventListener(
      "click",
      async event => {
        const button =
          event.currentTarget;

        const select =
          el("admin-salary-player");

        const status =
          el("admin-identity-revoke-status");

        const nick =
          select && select.value
            ? select.value
            : "";

        if (!nick) {
          status.textContent =
            "Wybierz gracza.";
          return;
        }

        if (
          !window.confirm(
            `Wylogować ${nick} ze wszystkich sesji konta?`
          )
        ) {
          return;
        }

        setActionLoading(
          button,
          status,
          "Wylogowywanie sesji..."
        );

        criticalOperationStart(
          "🚫 Wylogowuję sesje gracza…",
          "Unieważniam aktywne sesje i czekam na potwierdzenie serwera."
        );

        try {
          await confirmedAdminMutationPost(
            "accountAdminLogoutAll",
            {
              action:
                "accountAdminLogoutAll",
              sessionToken:
                playerAccountSessionToken(),
              nick
            },
            {token:playerAccountSessionToken()}
          );

          status.textContent =
            `✅ Wylogowano wszystkie sesje konta ${nick}.`;

          // Odświeżamy źródło danych dropdownu i liczbę sesji.
          await loadAccountAdminPermissions();

          await runtimeLoaderFinish(
            "✅ Sesje wylogowane"
          );

        } catch (err) {
          status.textContent =
            err.message ||
            "Nie udało się wylogować sesji.";

          await runtimeLoaderFinish(
            "❌ Wylogowanie nieudane"
          );
        } finally {
          criticalOperationFinish();
          clearActionLoading(button);
        }
      }
    );


  el("admin-salary-generate-code")
    ?.addEventListener(
      "click",
      async event => {
        const button = event.currentTarget;
        const select = el("admin-salary-player");
        const resultBox = el("admin-salary-code-result");
        const nick = select && select.value ? select.value : "";

        if (!nick) {
          resultBox.hidden = false;
          resultBox.textContent = "Brak gracza do wygenerowania kodu.";
          return;
        }

        button.disabled = true;
        button.textContent = "⏳ Generowanie...";

        try {
          const result = await adminPostAction(
            "adminGenerateSalaryClaimCode",
            {nick}
          );

          if (!result || !result.ok) {
            throw new Error(result && result.error ? result.error : "Nie udało się wygenerować kodu.");
          }

          resultBox.hidden = false;
          resultBox.innerHTML = `
            Kod dla: <b>${escapeHtml(result.nick)}</b>
            <strong>${escapeHtml(result.code)}</strong>
            <span class="muted">Jednorazowy · ważny 24 godziny</span>
          `;
        } catch (err) {
          resultBox.hidden = false;
          resultBox.textContent = err.message || "Nie udało się wygenerować kodu.";
        } finally {
          button.disabled = false;
          button.innerHTML = "🔑 Generuj kod";
        }
      }
    );


  el("admin-logout")
    ?.addEventListener(
      "click",
      () => {
        const panel =
          el("admin-view");

        if (panel) {
          panel.hidden = true;
        }

        showToolView(
          "account-view"
        );
      }
    );

  const companyIncomeInput =
    el("admin-company-income");

  if (companyIncomeInput) {
    companyIncomeInput.value =
      "25000";
  }

  // v20.8 — osobne logowanie Admina nie jest już używane.
}

  // ============================================================
  // BUILDY PvP
  // ============================================================

  const BUILD_ATTR_ORDER = [
    "strength",
    "endurance",
    "agility",
    "vitality",
    "precision"
  ];

  const BUILD_ATTRS = {
    strength: {
      name:"Siła",
      icon:"✊",
      description:"Atak, przebicie pancerza, obrażenia krytyczne, krwawienie",
      perks:[
        [["Brutalny Buc","+3% przebicia pancerza"],["Ciężka Łapa","+8% ataku"]],
        [["Kat Żulików","+2% progu egzekucji"],["Wściekły Pijak","+5% ataku gdy HP<30%"]],
        [["Łamacz Kości","+10% obrażeń krytycznych"],["Niszczyciel","+5% przebicia pancerza"]],
        [["Krwiopijca","+2% kradzieży życia"],["Nabrany Rozpęd","+2% ataku za turę"]],
        [["Szał Bitewny","+12% ataku"],["Roztrzaskiwacz","+7% przebicia pancerza"]],
        [["Herszt Bójki","+12% obrażeń krytycznych"],["Uścisk Tytana","+3% progu egzekucji"]],
        [["Dzika Furia","+8% ataku gdy HP<50%"],["Nieustępliwy Drań","+3% szansy na podwójne uderzenie"]],
        [["Bóg Mordobicia","+15% ataku"],["Totalna Zagłada","+15% obrażeń krytycznych"]],
        [["Kataklizm","+10% przebicia pancerza"],["Wcielona Furia","+10% ataku gdy HP<40%"]],
        [["Armagedon","+18% ataku, +20% obrażeń krytycznych"],["Ostateczna Zagłada","+4% progu egzekucji, +10% przebicia pancerza"]]
      ]
    },
    endurance: {
      name:"Wytrzymałość",
      icon:"🛡️",
      description:"Obrona, redukcja obrażeń, odporności",
      perks:[
        [["Skóra jak Beton","+8% obrony"],["Gruba Skóra","-5% otrzymywanych obrażeń"]],
        [["Trudny do Zbicia","+6% odporności na trafienia krytyczne"],["Łeb jak Mur","+8% odporności na ogłuszenie"]],
        [["Ostatni Bastion","-8% otrzymywanych obrażeń gdy HP<30%"],["Nie do Złamania","-6% otrzymywanych obrażeń"]],
        [["Żywa Barykada","+10% obrony"],["Jak Skała","+2% regeneracji HP"]],
        [["Tarcza Menela","+8% odporności na trafienia krytyczne"],["Nieporuszony","-8% otrzymywanych obrażeń"]],
        [["Strażnik Ulicy","+12% obrony"],["Kuloodporny","+10% odporności na ogłuszenie i krwawienie"]],
        [["Forteca","-10% otrzymywanych obrażeń gdy HP<40%"],["Mur nie do Przebicia","+12% obrony"]],
        [["Pancerna Skóra","-10% otrzymywanych obrażeń"],["Niezłomny Kozak","+10% odporności na trafienia krytyczne"]],
        [["Nieśmiertelna Skorupa","+14% obrony, +3% regeneracji HP"],["Wieczna Straż","-12% otrzymywanych obrażeń gdy HP<50%"]],
        [["Niezwyciężony","+10% obrony, -5% otrzymywanych obrażeń"],["Boska Tarcza","+12% wszystkich odporności"]]
      ]
    },
    agility: {
      name:"Zręczność",
      icon:"👟",
      description:"Uniki, podwójne uderzenia, kontrataki, redukcja leczenia",
      perks:[
        [["Zwinny","+2% szansy na podwójne uderzenie"],["Nieuchwytny Cień","+4% szansy na unik"]],
        [["Oportunista","+3% kontrataku, +2% szansy na krytyka"],["Gotowy na Odwet","+5% szansy na kontratak"]],
        [["Grad Ciosów","+3% szansy na podwójne uderzenie"],["Cichociemny","+4% uniku, +4% redukcji leczenia wroga"]],
        [["Refleks Kota","+4% kontrataku, +4% uniku"],["Duch Ulicy","+5% szansy na unik"]],
        [["Taniec Ostrzy","+3% podwójnego uderzenia, +2% kontrataku"],["Znak Zabójcy","+6% redukcji leczenia wroga"]],
        [["Niewidzialny","+6% szansy na unik"],["Taniec Śmierci","+3% podwójnego uderzenia, +2% szansy na krytyka"]],
        [["Miraż","+4% uniku, +5% kontrataku"],["Mistrz Riposty","+5% kontrataku, +3% podwójnego uderzenia"]],
        [["Nie do Złapania","+6% szansy na unik"],["Mistrzowskie Cięcie","+4% podwójnego uderzenia, +3% szansy na krytyka"]],
        [["Transcendencja","+6% uniku, +5% kontrataku"],["Zakrzywienie Czasu","+5% podwójnego uderzenia, +3% kontrataku"]],
        [["Boska Szybkość","+7% uniku, +6% kontrataku"],["Wszechuderzenie","+6% podwójnego uderzenia, +4% kontrataku, +5% szansy na krytyka"]]
      ]
    },
    vitality: {
      name:"Żywotność",
      icon:"📜",
      description:"HP, regeneracja, wytrzymałość",
      perks:[
        [["Żyłka Życia","+3% maksymalnego HP"],["Regenerator","+1 regeneracji HP za turę"]],
        [["Gęsta Krew","+12% odporności na krwawienie"],["Drugi Oddech","+2 regeneracji HP gdy HP<35%"]],
        [["Wiecznie Żywy","+3% maksymalnego HP"],["Wyssany Sok","+1% kradzieży życia"]],
        [["Siła Życia","+4% maksymalnego HP"],["Szybka Regeneracja","+2 regeneracji HP za turę"]],
        [["Twarde Ciało","+4% maksymalnego HP, +5% odporności na krwawienie"],["Syfon","+2% kradzieży życia"]],
        [["Krew Tytana","+6% maksymalnego HP"],["Pijawka","+2% kradzieży życia"]],
        [["Feniks","+5 regeneracji HP gdy HP<40%"],["Pakt Krwi","+3% kradzieży życia, +3% maksymalnego HP"]],
        [["Nieśmiertelny Wigor","+14% maksymalnego HP"],["Wysysacz Dusz","+6% kradzieży życia"]],
        [["Wieczny Płomień","+18% maksymalnego HP, +4 regeneracji HP"],["Drenaż Esencji","+6% kradzieży życia, +10% maksymalnego HP"]],
        [["Nieumarły","+22% maksymalnego HP, +6 regeneracji HP gdy HP<50%"],["Bóg Życia","+7% kradzieży życia, +14% maksymalnego HP, +8% odporności na krwawienie"]]
      ]
    },
    precision: {
      name:"Precyzja",
      icon:"👓",
      description:"Celność, szansa na kryt, obrażenia krytyczne, egzekucja, ogłuszenie",
      perks:[
        [["Bystre Oko","+2% szansy na trafienie krytyczne"],["Pewna Ręka","+2% celności, +3% obrażeń krytycznych"]],
        [["Wampiryzm","+1% kradzieży życia"],["Naznaczony Śmiercią","+1% progu egzekucji"]],
        [["Śmiertelny Cios","+3% szansy na trafienie krytyczne"],["Krwotok","+5% obrażeń krytycznych"]],
        [["Snajper","+3% szansy na krytyka, +2% celności"],["Rozpruwacz","+7% obrażeń krytycznych"]],
        [["Drapieżnik","+1% progu egzekucji, +2% szansy na krytyka"],["Słaby Punkt","+2% kradzieży życia, +6% obrażeń krytycznych"]],
        [["Znak Łowcy","+1% progu egzekucji"],["Skrytobójstwo","+6% szansy na trafienie krytyczne"]],
        [["Perfekcyjny Cel","+7% szansy na krytyka, +3% celności"],["Mistrz Krwawienia","+12% obrażeń krytycznych; krytyki automatycznie nakładają krwawienie"]],
        [["Oko Kata","+2% progu egzekucji, +6% szansy na krytyka"],["Szkarłatne Ostrze","+4% kradzieży życia, +15% obrażeń krytycznych"]],
        [["Oko Śmierci","+10% szansy na krytyka, +3% progu egzekucji"],["Wykrwawienie","+4% kradzieży życia, +18% obrażeń krytycznych"]],
        [["Jeden Strzał","+12% szansy na krytyka, +3% progu egzekucji, +25% obrażeń krytycznych"],["Bóg Krwi","+5% kradzieży życia, +25% obrażeń krytycznych, +7% szansy na krytyka"]]
      ]
    }
  };


  const BUILD_STAT_META = {
    attackFlat:["Atak bazowy",""],
    attackPct:["Atak","%"],
    defenseFlat:["Obrona bazowa",""],
    defensePct:["Obrona","%"],
    maxHpFlat:["Maks. HP — flat",""],
    maxHpPct:["Maks. HP","%"],
    accuracy:["Celność","%"],
    initiative:["Inicjatywa",""],
    firstStrike:["Pierwszy cios","%"],
    critChance:["Szansa na kryt","%"],
    critDmg:["Obrażenia krytyczne","%"],
    execute:["Próg egzekucji","%"],
    lifesteal:["Kradzież życia","%"],
    armorPen:["Przebicie pancerza","%"],
    stun:["Ogłuszenie","%"],
    bleed:["Szansa krwawienia","%"],
    bleedDamage:["Obrażenia krwawienia","%"],
    appliesBleed:["Krwawienie na kryt",""],
    evasion:["Unik","%"],
    doubleStrike:["Podwójne uderzenie","%"],
    counter:["Kontratak","%"],
    healingReduction:["Redukcja leczenia wroga","%"],
    damageReduction:["Redukcja obrażeń","%"],
    critResist:["Odporność na kryt","%"],
    stunResist:["Odporność na ogłuszenie","%"],
    bleedResist:["Odporność na krwawienie","%"],
    hpRegen:["Regeneracja HP / turę",""]
  };

  const BUILD_STAT_CAPS = {
    accuracy:140,
    critChance:65,
    critDmg:130,
    execute:18,
    lifesteal:30,
    armorPen:50,
    stun:35,
    evasion:55,
    doubleStrike:40,
    counter:40,
    healingReduction:50,
    damageReduction:60,
    critResist:50,
    stunResist:60,
    bleedResist:60,
    hpRegen:20
  };

  // Oficjalny frontend MenelWars pobiera `statCaps` z PvP Summary i używa
  // ich zamiast fallbacków v3.1. Tool robi to samo, jeśli użytkownik wklei
  // surowy JSON z gry. Klucze po lewej są dokładnie z PvPCombinedStats.
  const BUILD_RAW_STAT_CAP_ALIASES = {
    accuracy_percent:"accuracy",
    crit_chance_percent:"critChance",
    crit_damage_percent:"critDmg",
    execute_threshold_percent:"execute",
    lifesteal_percent:"lifesteal",
    armor_pen_percent:"armorPen",
    armor_penetration_percent:"armorPen",
    stun_chance_percent:"stun",
    evasion_percent:"evasion",
    double_strike_percent:"doubleStrike",
    counter_attack_percent:"counter",
    healing_reduction_percent:"healingReduction",
    damage_taken_reduction_percent:"damageReduction",
    crit_resist_percent:"critResist",
    stun_resist_percent:"stunResist",
    bleed_resist_percent:"bleedResist",
    hp_regen_flat:"hpRegen",
    hp_regen_effective:"hpRegen"
  };

  function buildNormalizeDynamicStatCaps(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};

    const out = {};
    const priority = {};

    Object.entries(value).forEach(([rawKey,rawValue]) => {
      const sourceKey = String(rawKey || "");
      const internalKey =
        BUILD_RAW_STAT_CAP_ALIASES[sourceKey] ||
        (Object.prototype.hasOwnProperty.call(BUILD_STAT_CAPS,sourceKey) ? sourceKey : "");
      const number = Number(rawValue);

      if (!internalKey || !Number.isFinite(number) || number < 0) return;

      // Backend walki capuje sumę regeneracji jako hp_regen_effective.
      // Jeśli odpowiedź zawiera także historyczny hp_regen_flat, efektywny
      // limit ma pierwszeństwo niezależnie od kolejności kluczy w JSON-ie.
      const itemPriority =
        sourceKey === "hp_regen_effective"
          ? 3
          : (sourceKey === "hp_regen_flat" ? 1 : 2);

      if (priority[internalKey] !== undefined && priority[internalKey] > itemPriority) {
        return;
      }

      priority[internalKey] = itemPriority;
      out[internalKey] = buildStatNumber(Math.min(1000000,number));
    });

    return out;
  }

  function buildStatCapsForSource(source) {
    const raw =
      source && source.statCaps && typeof source.statCaps === "object"
        ? source.statCaps
        : (
            source &&
            source.profile &&
            source.profile.statCaps &&
            typeof source.profile.statCaps === "object"
              ? source.profile.statCaps
              : {}
          );

    return Object.assign({},BUILD_STAT_CAPS,buildNormalizeDynamicStatCaps(raw));
  }

  function buildNewStatBag() {
    return {
      attackFlat:0,
      attackPct:0,
      defenseFlat:0,
      defensePct:0,
      maxHpFlat:0,
      maxHpPct:0,
      accuracy:0,
      initiative:0,
      firstStrike:0,
      critChance:0,
      critDmg:0,
      execute:0,
      lifesteal:0,
      armorPen:0,
      stun:0,
      bleed:0,
      bleedDamage:0,
      appliesBleed:0,
      evasion:0,
      doubleStrike:0,
      counter:0,
      healingReduction:0,
      damageReduction:0,
      critResist:0,
      stunResist:0,
      bleedResist:0,
      hpRegen:0,
      hpRegenPct:0,
      levelHp:0
    };
  }

  function buildStatNumber(value) {
    const n = Number(value) || 0;
    return Math.round(n * 100) / 100;
  }

  function buildCapInfo(key,value,caps=BUILD_STAT_CAPS) {
    const raw = buildStatNumber(value);
    const cap = caps && Object.prototype.hasOwnProperty.call(caps,key)
      ? Number(caps[key])
      : undefined;
    const effective = Number.isFinite(cap)
      ? buildStatNumber(Math.min(cap,raw))
      : raw;
    const over = Number.isFinite(cap)
      ? buildStatNumber(Math.max(0,raw-cap))
      : 0;

    return {raw,effective,cap:Number.isFinite(cap) ? cap : null,over};
  }

  function buildCapStat(key,value,caps=BUILD_STAT_CAPS) {
    return buildCapInfo(key,value,caps).effective;
  }

  function buildEffectNumber(effect,pattern) {
    const match = String(effect || "").match(pattern);
    if (!match) return 0;
    return Number(String(match[1]).replace(",", ".")) || 0;
  }

  function buildApplyPerkEffect(stats,effect,extras) {
    const text = String(effect || "").trim();

    // Jeden perk może zawierać jednocześnie bonus stały i warunkowy.
    // Przykład Nieumarły:
    // "+22% maksymalnego HP, +6 regeneracji HP gdy HP<50%"
    // +22% HP liczymy zawsze, a tylko regenerację pokazujemy jako warunkową.
    const parts = text
      .split(/\s*[,;]\s*/)
      .map(part => part.trim())
      .filter(Boolean);

    const unconditionalParts = [];

    parts.forEach(part => {
      const partLower =
        part.toLocaleLowerCase("pl-PL");

      const attackPerTurn =
        part.match(
          /([+-]?\d+(?:[.,]\d+)?)%\s*ataku\s+za\s+turę/i
        );

      if (attackPerTurn) {
        extras.dynamic.push({
          type:"attackPctPerTurn",
          amount:
            Number(
              String(attackPerTurn[1])
                .replace(",",".")
            ) || 0,
          text:part
        });
        return;
      }

      if (partLower.includes("krytyki mogą nałożyć krwawienie") || partLower.includes("krytyki automatycznie nakładają krwawienie")) {
        // Mistrz Krwawienia: krytyk AUTOMATYCZNIE nakłada bleed.
        // Source mapa bitwy pokazuje osobny boolean `appliesBleed`, a użytkownik
        // potwierdził semantykę mechaniki. Nie traktujemy tego jako szansy.
        stats.appliesBleed = 1;
        extras.special.push("Krytyk automatycznie nakłada krwawienie");
      } else if (partLower.includes("gdy hp<")) {
        extras.conditional.push(part);
      } else {
        unconditionalParts.push(part);
      }
    });

    if (!unconditionalParts.length) {
      return;
    }

    const calcText =
      unconditionalParts.join(", ");

    const lower =
      calcText.toLocaleLowerCase("pl-PL");

    const add = (key,pattern,transform=value=>value) => {
      const value = buildEffectNumber(calcText,pattern);
      if (value) stats[key] += transform(value);
    };

    add("attackPct",/([+-]?\d+(?:[.,]\d+)?)%\s*ataku\b/i);
    add("armorPen",/([+-]?\d+(?:[.,]\d+)?)%\s*przebicia pancerza/i);
    add("critDmg",/([+-]?\d+(?:[.,]\d+)?)%\s*obrażeń krytycznych/i);
    add("execute",/([+-]?\d+(?:[.,]\d+)?)%\s*progu egzekucji/i);
    add("lifesteal",/([+-]?\d+(?:[.,]\d+)?)%\s*kradzieży życia/i);

    // "szansy na podwójne uderzenie" i skrócone "podwójnego uderzenia"
    let doubleBonus =
      buildEffectNumber(calcText,/([+-]?\d+(?:[.,]\d+)?)%\s*szansy na podwójne uderzenie/i) ||
      buildEffectNumber(calcText,/([+-]?\d+(?:[.,]\d+)?)%\s*podwójnego uderzenia/i);
    stats.doubleStrike += doubleBonus;

    let evasionBonus =
      buildEffectNumber(calcText,/([+-]?\d+(?:[.,]\d+)?)%\s*szansy na unik/i) ||
      buildEffectNumber(calcText,/([+-]?\d+(?:[.,]\d+)?)%\s*uniku\b/i);
    stats.evasion += evasionBonus;

    let counterBonus =
      buildEffectNumber(calcText,/([+-]?\d+(?:[.,]\d+)?)%\s*szansy na kontratak/i) ||
      buildEffectNumber(calcText,/([+-]?\d+(?:[.,]\d+)?)%\s*kontrataku/i);
    stats.counter += counterBonus;

    let critBonus =
      buildEffectNumber(calcText,/([+-]?\d+(?:[.,]\d+)?)%\s*szansy na trafienie krytyczne/i) ||
      buildEffectNumber(calcText,/([+-]?\d+(?:[.,]\d+)?)%\s*szansy na krytyka/i);
    stats.critChance += critBonus;

    add("accuracy",/([+-]?\d+(?:[.,]\d+)?)%\s*celności/i);
    add("healingReduction",/([+-]?\d+(?:[.,]\d+)?)%\s*redukcji leczenia wroga/i);
    add("defensePct",/([+-]?\d+(?:[.,]\d+)?)%\s*obrony\b/i);
    add("critResist",/([+-]?\d+(?:[.,]\d+)?)%\s*odporności na trafienia krytyczne/i);
    add("stunResist",/([+-]?\d+(?:[.,]\d+)?)%\s*odporności na ogłuszenie/i);
    add("bleedResist",/([+-]?\d+(?:[.,]\d+)?)%\s*odporności na krwawienie/i);

    // Oficjalne opisy potrafią łączyć dwie odporności jednym procentem,
    // np. „+10% odporności na ogłuszenie i krwawienie”. W takim zapisie
    // ten sam bonus dotyczy obu statystyk.
    const stunAndBleedResist =
      buildEffectNumber(
        calcText,
        /([+-]?\d+(?:[.,]\d+)?)%\s*odporności na ogłuszenie i krwawienie/i
      );
    if (stunAndBleedResist) {
      // stun został już wykryty przez krótszy wzorzec powyżej; dokładamy
      // tylko brakującą odporność na krwawienie.
      stats.bleedResist += stunAndBleedResist;
    }
    add("maxHpPct",/([+-]?\d+(?:[.,]\d+)?)%\s*maksymalnego hp/i);

    const allResist =
      buildEffectNumber(calcText,/([+-]?\d+(?:[.,]\d+)?)%\s*wszystkich odporności/i);
    if (allResist) {
      stats.critResist += allResist;
      stats.stunResist += allResist;
      stats.bleedResist += allResist;
    }

    // Ujemne "otrzymywane obrażenia" zamieniamy na dodatnią redukcję obrażeń.
    const taken =
      buildEffectNumber(calcText,/([+-]?\d+(?:[.,]\d+)?)%\s*otrzymywanych obrażeń/i);
    if (taken < 0) stats.damageReduction += Math.abs(taken);

    const regenPct =
      buildEffectNumber(
        calcText,
        /([+-]?\d+(?:[.,]\d+)?)%\s*regeneracji hp/i
      );
    if (regenPct) {
      stats.hpRegenPct += regenPct;
    }

    const regenFlat =
      buildEffectNumber(
        calcText,
        /([+-]?\d+(?:[.,]\d+)?)(?!\s*%)\s*regeneracji hp/i
      );
    if (regenFlat) {
      stats.hpRegen += regenFlat;
    }

    // Zachowujemy nietypowe, nieprzeliczalne opisy jako efekty specjalne.
    if (
      lower.includes("krwawienie") &&
      !/odporności na (?:[^,;]*\s+i\s+)?krwawienie/i.test(calcText) &&
      !/otrzymywanych obrażeń/i.test(calcText)
    ) {
      if (!/^\+?\d+(?:[.,]\d+)?%\s*kradzieży życia/i.test(calcText)) {
        extras.special.push(calcText);
      }
    }
  }


  const BUILD_BONUS_LABELS = {
    // HP
    "hp":{key:"maxHpFlat",label:"Maks. HP",unit:"flat"},
    "max hp":{key:"maxHpFlat",label:"Maks. HP",unit:"flat"},
    "maks hp":{key:"maxHpFlat",label:"Maks. HP",unit:"flat"},
    "max hp %":{key:"maxHpPct",label:"Maks. HP (%)",unit:"pct"},
    "max hp%":{key:"maxHpPct",label:"Maks. HP (%)",unit:"pct"},
    "maks hp %":{key:"maxHpPct",label:"Maks. HP (%)",unit:"pct"},
    "maks hp%":{key:"maxHpPct",label:"Maks. HP (%)",unit:"pct"},

    // Atak / obrona — auto rozróżnia flat i procent po znaku % wartości.
    "atak":{key:"attackAuto",label:"Atak",unit:"auto"},
    "atak %":{key:"attackPct",label:"Atak (%)",unit:"pct"},
    "obrona":{key:"defenseAuto",label:"Obrona",unit:"auto"},
    "obrona %":{key:"defensePct",label:"Obrona (%)",unit:"pct"},

    // Ofensywa
    "celnosc":{key:"accuracy",label:"Celność",unit:"pct"},
    "pierwszy cios":{key:"firstStrike",label:"Pierwszy cios",unit:"pct"},
    "prog egzekucji":{key:"execute",label:"Próg egzekucji",unit:"pct"},
    "kradziez zycia":{key:"lifesteal",label:"Kradzież życia",unit:"pct"},
    "przebicie pancerza":{key:"armorPen",label:"Przebicie pancerza",unit:"pct"},
    "szansa ogluszenia":{key:"stun",label:"Szansa ogłuszenia",unit:"pct"},
    "szansa na ogluszenie":{key:"stun",label:"Szansa ogłuszenia",unit:"pct"},
    "szansa na kryt":{key:"critChance",label:"Szansa na kryt",unit:"pct"},
    "szansa na kryta":{key:"critChance",label:"Szansa na kryt",unit:"pct"},
    "obrazenia krytyczne":{key:"critDmg",label:"Obrażenia krytyczne",unit:"pct"},
    "obrazenia kryt":{key:"critDmg",label:"Obrażenia krytyczne",unit:"pct"},
    "szansa krwawienia":{key:"bleed",label:"Szansa krwawienia",unit:"pct"},
    "szansa na krwawienie":{key:"bleed",label:"Szansa krwawienia",unit:"pct"},
    "obrazenia krwawienia":{key:"bleedDamage",label:"Obrażenia krwawienia",unit:"pct"},
    "redukcja leczenia wroga":{key:"healingReduction",label:"Redukcja leczenia wroga",unit:"pct"},
    "podwojne uderzenie":{key:"doubleStrike",label:"Podwójne uderzenie",unit:"pct"},
    "kontratak":{key:"counter",label:"Kontratak",unit:"pct"},
    "unik":{key:"evasion",label:"Unik",unit:"pct"},

    // Obrona / odporności
    "redukcja obrazen":{key:"damageReduction",label:"Redukcja obrażeń",unit:"pct"},
    "odpornosc na kryta":{key:"critResist",label:"Odporność na kryt",unit:"pct"},
    "odpornosc na kryt":{key:"critResist",label:"Odporność na kryt",unit:"pct"},
    "odp na kryt":{key:"critResist",label:"Odporność na kryt",unit:"pct"},
    "odp na kryta":{key:"critResist",label:"Odporność na kryt",unit:"pct"},
    "odp na kryt szansa":{key:"critResist",label:"Odporność na kryt",unit:"pct"},
    "odp na kryta szansa":{key:"critResist",label:"Odporność na kryt",unit:"pct"},
    "odpornosc na ogluszenie":{key:"stunResist",label:"Odporność na ogłuszenie",unit:"pct"},
    "odp na ogluszenie":{key:"stunResist",label:"Odporność na ogłuszenie",unit:"pct"},
    "odpornosc na krwawienie":{key:"bleedResist",label:"Odporność na krwawienie",unit:"pct"},
    "odp na krwawienie":{key:"bleedResist",label:"Odporność na krwawienie",unit:"pct"}
  };

  function buildNormalizeBonusName(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[łŁ]/g,"l")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\u00a0/g," ")
      .toLocaleLowerCase("pl-PL")
      // Gra potrafi zwrócić np. „Atak (%)”, „Odp. na kryt (szansa)”
      // albo ten sam tekst bez polskich znaków. Sprowadzamy to do jednego klucza.
      .replace(/[()]/g," ")
      .replace(/[.:]/g," ")
      .replace(/[^a-z0-9%]+/g," ")
      .replace(/\s+/g," ")
      .trim();
  }


  // Surowe klucze pvp_bonuses potwierdzone w source mapie gry.
  // Jeśli użytkownik wklei JSON z pvp_bonuses, ten blok jest źródłem
  // prawdy i ma pierwszeństwo przed parserem opisowych etykiet.
  const BUILD_RAW_PVP_ALIASES = {
    crit_chance_percent:["critChance",true,"Szansa na kryt"],
    crit_damage_percent:["critDmg",true,"Obrażenia krytyczne"],
    armor_pen_percent:["armorPen",true,"Przebicie pancerza"],
    armor_penetration_percent:["armorPen",true,"Przebicie pancerza"],
    hp_percent:["maxHpPct",true,"Maks. HP"],
    max_hp_percent:["maxHpPct",true,"Maks. HP"],
    hp_flat:["maxHpFlat",false,"Maks. HP"],
    max_hp_flat:["maxHpFlat",false,"Maks. HP"],
    double_strike_percent:["doubleStrike",true,"Podwójne uderzenie"],
    first_strike_percent:["firstStrike",true,"Pierwszy cios"],
    execute_threshold_percent:["execute",true,"Próg egzekucji"],
    stun_chance_percent:["stun",true,"Szansa ogłuszenia"],
    bleed_chance_percent:["bleed",true,"Szansa krwawienia"],
    bleed_damage_percent:["bleedDamage",true,"Obrażenia krwawienia"],
    applies_bleed:["appliesBleed",false,"Krwawienie na kryt"],
    evasion_percent:["evasion",true,"Unik"],
    accuracy_percent:["accuracy",true,"Celność"],
    crit_resist_percent:["critResist",true,"Odporność na kryt"],
    counter_attack_percent:["counter",true,"Kontratak"],
    damage_taken_reduction_percent:["damageReduction",true,"Redukcja obrażeń"],
    stun_resist_percent:["stunResist",true,"Odporność na ogłuszenie"],
    bleed_resist_percent:["bleedResist",true,"Odporność na krwawienie"],
    lifesteal_percent:["lifesteal",true,"Kradzież życia"],
    hp_regen_flat:["hpRegen",false,"Regeneracja HP / turę"],
    hp_regen_percent:["hpRegenPct",true,"Regeneracja HP"],
    healing_reduction_percent:["healingReduction",true,"Redukcja leczenia wroga"],
    attack_percent:["attackPct",true,"Atak"],
    defense_percent:["defensePct",true,"Obrona"],
    attack_flat:["attackFlat",false,"Atak"],
    defense_flat:["defenseFlat",false,"Obrona"],
    initiative:["initiative",false,"Inicjatywa"]
  };

  function buildFindRawPvpObject(value) {
    if (!value || typeof value !== "object") return null;
    if (value.pvp_bonuses && typeof value.pvp_bonuses === "object") return value.pvp_bonuses;
    const keys = Object.keys(value);
    if (keys.some(k=>BUILD_RAW_PVP_ALIASES[k])) return value;

    const nonBonusContainers = new Set([
      "statCaps","stat_caps",
      "combinedStats","combined_stats",
      "baseStats","base_stats",
      "skillBonuses","skill_bonuses",
      "setPvpBonuses","set_pvp_bonuses",
      "miscPvpBonuses","misc_pvp_bonuses",
      "gangUpgradeBonuses","gang_upgrade_bonuses"
    ]);

    for (const [childKey,child] of Object.entries(value)) {
      if (nonBonusContainers.has(childKey)) continue;
      if (child && typeof child === "object") {
        const found = buildFindRawPvpObject(child);
        if (found) return found;
      }
    }
    return null;
  }

  function buildFindRawStatCapsObject(value) {
    if (!value || typeof value !== "object") return null;

    // Nie próbujemy zgadywać po samych nazwach statystyk: pvp_bonuses i
    // statCaps używają częściowo tych samych kluczy. Dynamiczne limity
    // uznajemy za wiarygodne wyłącznie, gdy JSON nazywa je wprost.
    if (value.statCaps && typeof value.statCaps === "object") {
      return value.statCaps;
    }

    if (value.stat_caps && typeof value.stat_caps === "object") {
      return value.stat_caps;
    }

    for (const child of Object.values(value)) {
      if (child && typeof child === "object") {
        const found = buildFindRawStatCapsObject(child);
        if (found) return found;
      }
    }

    return null;
  }

  function buildFindExplicitPvpBonusesObject(value) {
    if (!value || typeof value !== "object") return null;

    if (value.pvp_bonuses && typeof value.pvp_bonuses === "object") {
      return value.pvp_bonuses;
    }

    for (const child of Object.values(value)) {
      if (child && typeof child === "object") {
        const found = buildFindExplicitPvpBonusesObject(child);
        if (found) return found;
      }
    }

    return null;
  }

  function buildCollectPvpSummaryBonusGroups(value,groups=[],seen=new Set()) {
    if (!value || typeof value !== "object" || seen.has(value)) return groups;
    seen.add(value);

    const add = (keys,source,kind="equipment") => {
      for (const key of keys) {
        const candidate = value[key];
        if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
          groups.push({source,kind,bonuses:candidate});
          break;
        }
      }
    };

    add(["setPvpBonuses","set_pvp_bonuses"],"Set (raw)");
    add(["miscPvpBonuses","misc_pvp_bonuses"],"Akcesoria / misc (raw)");
    add(["gangUpgradeBonuses","gang_upgrade_bonuses"],"Gang (raw)","gang");

    for (const child of Object.values(value)) {
      if (child && typeof child === "object") {
        buildCollectPvpSummaryBonusGroups(child,groups,seen);
      }
    }

    return groups;
  }

  function buildPushRawEquipmentEntries(bonuses,source,entries,unknown) {
    Object.entries(bonuses || {}).forEach(([rawKey,rawValue])=>{
      const def = BUILD_RAW_PVP_ALIASES[String(rawKey)];
      const number = Number(rawValue);
      if (!def) {
        if (Number.isFinite(number) && number !== 0) unknown.push(`${source}: ${rawKey}`);
        return;
      }
      if (!Number.isFinite(number) || number === 0) return;
      entries.push({
        source,
        name:def[2],
        key:def[0],
        value:buildStatNumber(number),
        percent:Boolean(def[1]),
        rawKey:String(rawKey)
      });
    });
  }

  function buildPushRawGangEntries(bonuses,source,entries,unknown) {
    const aliases = {
      cellarAttack:["attackFlat",false,"Atak","Gang — Piwnica"],
      cellar_attack:["attackFlat",false,"Atak","Gang — Piwnica"],
      sewerDefense:["defenseFlat",false,"Obrona","Gang — Bagno"],
      sewer_defense:["defenseFlat",false,"Obrona","Gang — Bagno"],
      gymHp:["maxHpFlat",false,"Maks. HP","Gang — Siłownia"],
      gym_hp:["maxHpFlat",false,"Maks. HP","Gang — Siłownia"],
      shootingRangeAccuracy:["accuracy",true,"Celność","Gang — Strzelnica"],
      shooting_range_accuracy:["accuracy",true,"Celność","Gang — Strzelnica"]
    };

    Object.entries(bonuses || {}).forEach(([rawKey,rawValue])=>{
      const def = aliases[String(rawKey)];
      const number = Number(rawValue);
      if (!def) {
        if (Number.isFinite(number) && number !== 0) unknown.push(`${source}: ${rawKey}`);
        return;
      }
      if (!Number.isFinite(number) || number === 0) return;
      entries.push({
        source:def[3],
        name:def[2],
        key:def[0],
        value:buildStatNumber(number),
        percent:Boolean(def[1]),
        rawKey:String(rawKey)
      });
    });
  }

  function buildParseRawPvpBonuses(text) {
    const raw = String(text || "").trim();
    if (!raw || !raw.includes("{")) return null;
    const candidates = [raw];
    const pvpMatch = raw.match(/["']?pvp_bonuses["']?\s*:\s*(\{[^{}]*\})/s);
    // Najpierw próbujemy cały JSON PvP Summary, bo tylko tam mogą być
    // równolegle setPvpBonuses, miscPvpBonuses, gangUpgradeBonuses i statCaps.
    // Wycięty pvp_bonuses jest fallbackiem dla niepełnych wklejek.
    if (pvpMatch) candidates.push(pvpMatch[1]);

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate.replace(/'([^']*)'\s*:/g,'"$1":'));
        const rawStatCaps = buildFindRawStatCapsObject(parsed);
        const statCaps = buildNormalizeDynamicStatCaps(rawStatCaps || {});
        const entries = [];
        const unknown = [];

        // Jeśli w danych występuje jawne pvp_bonuses, traktujemy je jako
        // autorytatywny, już zagregowany zestaw i nie dokładamy równolegle
        // set/misc/gang, aby nie policzyć tych samych bonusów podwójnie.
        const explicit = buildFindExplicitPvpBonusesObject(parsed);
        if (explicit) {
          buildPushRawEquipmentEntries(
            explicit,
            "pvp_bonuses (raw)",
            entries,
            unknown
          );
        } else {
          const groups = buildCollectPvpSummaryBonusGroups(parsed);

          if (groups.length) {
            groups.forEach(group=>{
              if (group.kind === "gang") {
                buildPushRawGangEntries(group.bonuses,group.source,entries,unknown);
              } else {
                buildPushRawEquipmentEntries(group.bonuses,group.source,entries,unknown);
              }
            });
          } else {
            // Fallback dla wklejonego pojedynczego obiektu bonusów bez nazwy.
            const bonuses = buildFindRawPvpObject(parsed);
            if (bonuses) {
              buildPushRawEquipmentEntries(
                bonuses,
                "pvp_bonuses (raw)",
                entries,
                unknown
              );
            }
          }
        }

        if (!entries.length && !Object.keys(statCaps).length && !unknown.length) continue;

        return {
          entries,
          unknown:[...new Set(unknown)],
          rawAuthoritative:true,
          statCaps
        };
      } catch (err) {}
    }
    return null;
  }

  function buildParseBonusText(text) {
    const rawParsed = buildParseRawPvpBonuses(text);
    if (
      rawParsed &&
      (
        rawParsed.entries.length ||
        Object.keys(rawParsed.statCaps || {}).length
      )
    ) {
      return rawParsed;
    }

    const entries = [];
    const unknown = [];

    const rawLines = String(text || "")
      .replace(/\r/g,"")
      .split("\n");

    const lines = rawLines
      .map(line => String(line || "")
        // Markdown link: [Atak](url) -> Atak
        .replace(/\[([^\]]+)\]\([^)]+\)/g,"$1")
        // Markdown image / standalone image label is not a stat.
        .replace(/!\[[^\]]*\]\([^)]+\)/g,"")
        .replace(/\*\*/g,"")
        .replace(/\*/g,"")
        .replace(/\u00a0/g," ")
        .trim()
      )
      .filter(Boolean)
      .filter(line => !/powyższe atrybuty/i.test(line));

    let currentSetName = "";

    const resolveDefinition = statName => {
      const normalized =
        buildNormalizeBonusName(statName);

      return {
        normalized,
        def:BUILD_BONUS_LABELS[normalized] || null
      };
    };

    const pushEntry = (
      sourceName,
      statName,
      value,
      isPercent
    ) => {
      const number = Number(
        String(value).replace(",",".")
      );

      const resolved =
        resolveDefinition(statName);

      if (
        !resolved.def ||
        !Number.isFinite(number)
      ) {
        return false;
      }

      const def = resolved.def;
      let key = def.key;

      if (key === "attackAuto") {
        key = isPercent
          ? "attackPct"
          : "attackFlat";
      }

      if (key === "defenseAuto") {
        key = isPercent
          ? "defensePct"
          : "defenseFlat";
      }

      if (
        def.key === "maxHpFlat" &&
        isPercent
      ) {
        key = "maxHpPct";
      }

      entries.push({
        source:String(sourceName || "Set").trim(),
        name:String(statName || def.label).trim(),
        key,
        value:buildStatNumber(number),
        percent:Boolean(isPercent)
      });

      return true;
    };

    const addPrefixedEntry = (
      labelLine,
      valueLine
    ) => {
      const match =
        String(labelLine || "")
          .match(
            /^(Set|Akcesoria|Gang\s*[—–-]\s*.+?)\s+(.+?)\s*$/i
          );

      const valueMatch =
        String(valueLine || "")
          .match(
            /^\s*[⚔️]?\s*\+\s*([0-9]+(?:[.,][0-9]+)?)(%)?\s*$/
          );

      if (!match || !valueMatch) {
        return false;
      }

      return pushEntry(
        match[1].replace(/\s+/g," ").trim(),
        match[2].replace(/\s+/g," ").trim(),
        valueMatch[1],
        Boolean(valueMatch[2])
      );
    };

    const addStandaloneLine = (
      line,
      sourceName
    ) => {
      let clean =
        String(line || "")
          .replace(/^[⚔️\s]+/u,"")
          .trim();

      if (!clean) {
        return false;
      }

      // Format setów, np.:
      // +8% Unik
      // +500 Max HP
      // +10% Obrazenia krytyczne
      let match =
        clean.match(
          /^\+\s*([0-9]+(?:[.,][0-9]+)?)(%)?\s*(.+?)\s*$/i
        );

      if (match) {
        return pushEntry(
          sourceName,
          match[3],
          match[1],
          Boolean(match[2])
        );
      }

      // Format stron setów, np.:
      // Atak +20 atak
      // Obrona +15 obrona
      // HP +5 max HP
      match =
        clean.match(
          /^(.+?)\s*\+\s*([0-9]+(?:[.,][0-9]+)?)(%)?\s*(.*?)\s*$/i
        );

      if (match) {
        const before = match[1].trim();
        const after = match[4].trim();

        // Preferujemy nazwę po wartości, jeśli jest prawidłową statystyką
        // ("HP +5 max HP"), w przeciwnym razie nazwę przed wartością.
        const afterDef =
          after
            ? resolveDefinition(after).def
            : null;

        const beforeDef =
          resolveDefinition(before).def;

        const statName =
          afterDef
            ? after
            : (
                beforeDef
                  ? before
                  : ""
              );

        if (statName) {
          return pushEntry(
            sourceName,
            statName,
            match[2],
            Boolean(match[3])
          );
        }
      }

      return false;
    };

    for (
      let i=0;
      i<lines.length;
      i++
    ) {
      const line = lines[i];

      const setHeading =
        line.match(
          /(?:czesc|część)\s+zestawu\s*:\s*(.+)$/i
        );

      if (setHeading) {
        currentSetName =
          setHeading[1]
            .replace(/\s+/g," ")
            .trim();
        continue;
      }

      if (
        /^wymagane przedmioty\s*:/i.test(line) ||
        /^bonusy za komplet\s*:/i.test(line) ||
        /^bonus za ulepszenie/i.test(line) ||
        /^(set|akcesoria|gang)\s*:?$/i.test(line) ||
        /^t\d+\s*/i.test(line) ||
        /^image$/i.test(line)
      ) {
        continue;
      }

      // Dotychczasowy format PWA:
      // Akcesoria Atak
      // +11.10%
      if (
        i+1 < lines.length &&
        addPrefixedEntry(
          line,
          lines[i+1]
        )
      ) {
        i++;
        continue;
      }

      // Dotychczasowy format jednowierszowy:
      // Akcesoria Atak +11.10%
      const prefixedOneLine =
        line.match(
          /^(Set|Akcesoria|Gang\s*[—–-]\s*.+?)\s+(.+?)\s+\+\s*([0-9]+(?:[.,][0-9]+)?)(%)?\s*$/i
        );

      if (
        prefixedOneLine &&
        pushEntry(
          prefixedOneLine[1],
          prefixedOneLine[2],
          prefixedOneLine[3],
          Boolean(prefixedOneLine[4])
        )
      ) {
        continue;
      }

      const sourceName =
        currentSetName
          ? `Set · ${currentSetName}`
          : "Set";

      if (
        addStandaloneLine(
          line,
          sourceName
        )
      ) {
        continue;
      }

      // Samotna wartość po nierozpoznanej etykiecie nie jest osobnym błędem.
      if (
        /^\s*[⚔️]?\s*\+\s*[0-9]+(?:[.,][0-9]+)?%?\s*$/u.test(line)
      ) {
        continue;
      }

      // Nazwy elementów zestawu / treści sklepu nie są błędami importera.
      if (
        /^https?:\/\//i.test(line) ||
        /złota moneta/i.test(line) ||
        /\b(kup|brakuje)\b/i.test(line)
      ) {
        continue;
      }

      unknown.push(line);
    }

    return {
      entries,
      unknown,
      statCaps:{}
    };
  }

  function buildApplyImportedBonuses(stats,source,options={}) {
    const entries = Array.isArray(source && source.bonuses) ? source.bonuses : [];
    const skipProfileFlat = options.skipProfileFlat !== false;
    const profile = buildProfileStats(source || {});
    const usesCombatStart = Boolean(
      profile.provided &&
      profile.provided.combatAttack &&
      profile.provided.combatDefense &&
      profile.provided.combatHp
    );

    entries.forEach(entry => {
      const key = String(entry && entry.key || "");
      const value = Number(entry && entry.value);

      if (!Object.prototype.hasOwnProperty.call(stats,key) || !Number.isFinite(value)) {
        return;
      }

      // Trzy liczby z ekranu „Statystyki startowe w walce” zawierają już
      // wszystkie płaskie i procentowe bonusy ATK / DEF / HP (set, akcesoria,
      // gang itd.). Pozostawiamy wpis w podglądzie importu, ale nigdy nie
      // dokładamy go drugi raz do mechaniki walki.
      if (
        usesCombatStart &&
        ["attackFlat","attackPct","defenseFlat","defensePct","maxHpFlat","maxHpPct"].includes(key)
      ) {
        return;
      }

      // Zgodność ze starymi, zapisanymi buildami, które korzystają jeszcze
      // z pola profilu Postaci zamiast trzech statystyk startowych z walki.
      if (
        skipProfileFlat &&
        (key === "attackFlat" || key === "defenseFlat")
      ) {
        return;
      }

      stats[key] += value;
    });
  }

  function buildRenderBonusPreview() {
    const host = el("build-bonus-preview");
    if (!host) return;

    const entries = Array.isArray(buildState.bonuses) ? buildState.bonuses : [];
    const statCaps = buildNormalizeDynamicStatCaps(buildState.statCaps || {});
    const capEntries = Object.entries(statCaps);

    if (!entries.length && !capEntries.length) {
      host.innerHTML = `<div class="muted">Brak wczytanych bonusów dodatkowych i dynamicznych limitów PvP.</div>`;
      return;
    }

    const bonusesHtml = entries.map(entry => `
      <div class="build-bonus-row">
        <span><b>${escapeHtml(entry.source)}</b> · ${escapeHtml(entry.name)}</span>
        <strong>${entry.key === "appliesBleed" ? (Number(entry.value) > 0 ? "tak" : "nie") : `+${escapeHtml(buildFormatPlainNumber(entry.value))}${entry.percent ? "%" : ""}`}</strong>
      </div>
    `).join("");

    const capsHtml = capEntries.length
      ? `
        <div class="build-bonus-cap-note">
          <b>🎯 Dynamiczne limity z PvP Summary:</b>
          ${
            capEntries
              .map(([key,value]) => {
                const meta = BUILD_STAT_META[key] || [key,""];
                return `${escapeHtml(meta[0])} ${escapeHtml(buildFormatPlainNumber(value))}${escapeHtml(meta[1] || "")}`;
              })
              .join(" · ")
          }
        </div>
      `
      : "";

    host.innerHTML = bonusesHtml + capsHtml;
  }

  function buildFormatPlainNumber(value) {
    const n = buildStatNumber(value);
    return n.toLocaleString("pl-PL",{
      minimumFractionDigits:Number.isInteger(n) ? 0 : 1,
      maximumFractionDigits:2
    });
  }

  function buildImportBonuses() {
    const text = el("build-bonus-text")?.value || "";
    const status = el("build-bonus-status");
    const parsed = buildParseBonusText(text);

    buildState.bonuses = parsed.entries;
    buildState.statCaps = buildNormalizeDynamicStatCaps(parsed.statCaps || {});
    buildState.bonusText = text;
    if (!buildState.profile || typeof buildState.profile !== "object") buildState.profile = buildEmptyState().profile;
    const capCount = Object.keys(buildState.statCaps).length;
    buildState.profile.bonusesConfirmed = Boolean(parsed.entries.length || capCount);

    if (!parsed.entries.length && !capCount) {
      status.textContent = parsed.unknown.length
        ? "❌ Nie rozpoznałem żadnego bonusu z wklejonego tekstu."
        : "Wklej bonusy z gry.";
    } else {
      const parts = [];
      if (parsed.entries.length) parts.push(`${parsed.entries.length} bonusów`);
      if (capCount) parts.push(`${capCount} dynamicznych limitów PvP`);
      status.textContent =
        `✅ Wczytano ${parts.join(" i ")}.` +
        (parsed.unknown.length ? ` ⚠️ Pominięto ${parsed.unknown.length} nierozpoznanych wierszy.` : "");
    }

    buildRenderBonusPreview();
    renderBuildStats();
  }

  function buildClearBonuses() {
    buildState.bonuses = [];
    buildState.statCaps = {};
    buildState.bonusText = "";
    if (!buildState.profile || typeof buildState.profile !== "object") buildState.profile = buildEmptyState().profile;
    buildState.profile.bonusesConfirmed = false;
    if (el("build-bonus-text")) el("build-bonus-text").value = "";
    if (el("build-bonus-status")) el("build-bonus-status").textContent = "Bonusy dodatkowe zostały wyczyszczone.";
    buildRenderBonusPreview();
    renderBuildStats();
  }


  function buildProfileStats(source) {
    const profile =
      source &&
      source.profile &&
      typeof source.profile === "object"
        ? source.profile
        : {};

    const cleanPositive = (value,fallback) => {
      const number = Number(value);
      return Number.isFinite(number) && number >= 1
        ? buildStatNumber(number)
        : fallback;
    };

    const cleanNonNegative = (value,fallback=0) => {
      const number = Number(value);
      return Number.isFinite(number) && number >= 0
        ? buildStatNumber(number)
        : fallback;
    };

    const cleanCharacterLevel = (value,fallback=1) => {
      const number = Number(value);
      return Number.isInteger(number) && number >= 1
        ? Math.min(100000,number)
        : fallback;
    };

    const supplied =
      profile.provided && typeof profile.provided === "object"
        ? profile.provided
        : null;
    const has = keyName =>
      supplied
        ? Boolean(supplied[keyName])
        : Object.prototype.hasOwnProperty.call(profile,keyName);

    const validPositive = keyName =>
      Number.isFinite(Number(profile[keyName])) && Number(profile[keyName]) >= 1;
    const validNonNegative = keyName =>
      Number.isFinite(Number(profile[keyName])) && Number(profile[keyName]) >= 0;

    return {
      characterLevel:cleanCharacterLevel(profile.characterLevel,1),
      attack:cleanPositive(profile.attack,1),
      defense:cleanPositive(profile.defense,1),
      baseHp:cleanPositive(profile.baseHp,100),
      petHp:cleanNonNegative(profile.petHp,0),
      eqHp:cleanNonNegative(profile.eqHp,0),
      combatAttack:cleanPositive(profile.combatAttack,0),
      combatDefense:cleanPositive(profile.combatDefense,0),
      combatHp:cleanPositive(profile.combatHp,0),
      provided:{
        attack:has("attack") && validPositive("attack"),
        defense:has("defense") && validPositive("defense"),
        baseHp:has("baseHp") && validPositive("baseHp"),
        petHp:has("petHp") && validNonNegative("petHp"),
        eqHp:has("eqHp") && validNonNegative("eqHp"),
        combatAttack:has("combatAttack") && validPositive("combatAttack"),
        combatDefense:has("combatDefense") && validPositive("combatDefense"),
        combatHp:has("combatHp") && validPositive("combatHp")
      },
      bonusesConfirmed:Boolean(profile.bonusesConfirmed)
    };
  }

  function buildCalculateStats(source) {
    const attributes = source && source.attributes ? source.attributes : {};
    const perks = source && source.perks ? source.perks : {};

    const STR = Number(attributes.strength) || 0;
    const END = Number(attributes.endurance) || 0;
    const AGI = Number(attributes.agility) || 0;
    const VIT = Number(attributes.vitality) || 0;
    const PRC = Number(attributes.precision) || 0;
    const profile = buildProfileStats(source);

    const usedAttributePoints =
      STR + END + AGI + VIT + PRC;

    const requiredLevel =
      Math.max(
        1,
        Math.ceil(usedAttributePoints / 2)
      );

    // Poziom wynika bezpośrednio z liczby rozdanych punktów. Dokładne
    // ATK/DEF/HP pobieramy z ekranu startowego walki, bez rozbijania HP.
    const characterLevel = Number.isInteger(Number(source && source.simulationLevel))
      ? Math.max(1,Number(source.simulationLevel))
      : requiredLevel;

    const stats = buildNewStatBag();
    const extras = {
      conditional:[],
      dynamic:[],
      special:[]
    };

    // Mechaniki atrybutów dokładnie według ekranów z gry.
    stats.attackFlat = profile.attack + STR * 0.5 + AGI * 0.5 + PRC * 0.4;
    stats.attackPct = STR * 0.45;

    stats.defenseFlat = profile.defense + END * 1.65;
    stats.defensePct = END * 0.65;

    stats.levelHp =
      characterLevel * 5;

    stats.maxHpFlat =
      profile.baseHp +
      stats.levelHp +
      profile.petHp +
      profile.eqHp +
      VIT * 1.5;
    stats.maxHpPct = VIT * 1.1;

    stats.accuracy = 85 + PRC * 0.5;
    stats.initiative = 3 + PRC * 0.3;
    stats.firstStrike = PRC * 0.25;

    stats.critChance = 3 + PRC * 0.5 + AGI * 0.3;
    stats.critDmg = 10 + STR * 0.6 + PRC * 0.5;

    stats.execute = 2 + PRC * 0.15;
    stats.lifesteal = PRC * 0.15;
    stats.armorPen = STR * 0.3 + PRC * 0.15;

    stats.stun = PRC * 0.4;
    stats.bleed = STR * 0.3 + AGI * 0.3 + PRC * 0.2;

    stats.evasion = 2 + AGI * 0.35;
    stats.doubleStrike = AGI * 0.5;
    stats.counter = AGI * 0.3;
    stats.healingReduction = AGI * 0.8;

    stats.damageReduction = END * 0.18 + VIT * 0.3;
    stats.critResist = END * 0.4;
    stats.stunResist = END * 0.4;
    stats.bleedResist = VIT * 0.5;

    stats.hpRegen = VIT * 0.15;

    BUILD_ATTR_ORDER.forEach(attrKey => {
      const selected = perks[attrKey] || {};
      const attr = BUILD_ATTRS[attrKey];

      Object.keys(selected).forEach(tierKey => {
        const tier = Number(tierKey);
        const choice = selected[tierKey];
        if (!tier || tier < 1 || tier > 10 || (choice !== "A" && choice !== "B")) return;

        const pair = attr.perks[tier - 1];
        if (!pair) return;

        const perk = pair[choice === "A" ? 0 : 1];
        if (!perk) return;

        buildApplyPerkEffect(stats,perk[1],extras);
      });
    });

    buildApplyImportedBonuses(stats,source);

    if (Number(stats.appliesBleed) > 0) {
      extras.special.push("Krytyk automatycznie nakłada krwawienie");
    }

    // Perki typu "+3% regeneracji HP" regenerują procent AKTUALNEGO
    // maksymalnego HP na turę. Najpierw wyliczamy końcowe HP po bonusie %,
    // a dopiero potem zamieniamy procent regeneracji na wartość / turę.
    const maxHpForRegen =
      profile.provided && profile.provided.combatHp
        ? profile.combatHp
        : buildStatNumber(
            (Number(stats.maxHpFlat) || 0) *
            (1 + (Number(stats.maxHpPct) || 0) / 100)
          );

    if (stats.hpRegenPct) {
      stats.hpRegen +=
        maxHpForRegen *
        stats.hpRegenPct /
        100;
    }

    const rawStats = {};
    const capInfo = {};
    const effectiveStatCaps = buildStatCapsForSource(source || {});

    Object.keys(stats).forEach(key => {
      const info = buildCapInfo(key,stats[key],effectiveStatCaps);
      rawStats[key] = info.raw;
      capInfo[key] = info;
      stats[key] = info.effective;
    });

    // Usuń duplikaty opisów warunkowych/dynamicznych/specjalnych.
    extras.conditional = [...new Set(extras.conditional)];

    const dynamicSeen =
      new Set();

    extras.dynamic =
      extras.dynamic.filter(item => {
        const key =
          `${item.type}|${item.amount}|${item.text}`;

        if (dynamicSeen.has(key)) {
          return false;
        }

        dynamicSeen.add(key);
        return true;
      });

    extras.special = [...new Set(extras.special)];

    return {
      stats,
      rawStats,
      capInfo,
      extras,
      requiredLevel,
      characterLevel,
      characterLevelProvided:true,
      combatStart:{
        attack:profile.combatAttack,
        defense:profile.combatDefense,
        hp:profile.combatHp,
        provided:Boolean(profile.provided && profile.provided.combatAttack && profile.provided.combatDefense && profile.provided.combatHp)
      }
    };
  }

  function buildFormatStatValue(key,value) {
    const meta = BUILD_STAT_META[key] || [key,""];
    const suffix = meta[1] || "";
    const n = buildStatNumber(value);

    return `${n.toLocaleString("pl-PL",{
      minimumFractionDigits:Number.isInteger(n) ? 0 : 1,
      maximumFractionDigits:2
    })}${suffix}`;
  }

  function buildBaseStatBag(source) {
    const stats = buildNewStatBag();
    const profile = buildProfileStats(source);

    // Wartości startowe / wpisane z profilu postaci.
    stats.attackFlat = profile.attack;
    stats.defenseFlat = profile.defense;
    stats.maxHpFlat = profile.baseHp;

    // Bazowe wartości mechanik PvP przy 0 pkt atrybutów.
    stats.accuracy = 85;
    stats.initiative = 3;
    stats.critChance = 3;
    stats.critDmg = 10;
    stats.execute = 2;
    stats.evasion = 2;

    return stats;
  }

  function buildFinalPrimaryStats(calculated) {
    const combatStart=calculated && calculated.combatStart;
    if (combatStart && combatStart.provided) {
      return {
        attack:buildStatNumber(combatStart.attack),
        defense:buildStatNumber(combatStart.defense),
        hp:buildStatNumber(combatStart.hp)
      };
    }
    const stats =
      calculated && calculated.stats
        ? calculated.stats
        : buildNewStatBag();

    const attack =
      buildStatNumber(
        (Number(stats.attackFlat) || 0) *
        (1 + (Number(stats.attackPct) || 0) / 100)
      );

    const defense =
      buildStatNumber(
        (Number(stats.defenseFlat) || 0) *
        (1 + (Number(stats.defensePct) || 0) / 100)
      );

    const hp =
      buildStatNumber(
        (Number(stats.maxHpFlat) || 0) *
        (1 + (Number(stats.maxHpPct) || 0) / 100)
      );

    return {
      attack,
      defense,
      hp
    };
  }

  function buildStatsHtml(source) {
    const calculated = buildCalculateStats(source);
    const extras = calculated.extras;
    const usesCombatStart=Boolean(calculated.combatStart && calculated.combatStart.provided);
    const finalPrimary =
      buildFinalPrimaryStats(calculated);

    // Rozdzielamy wartości bazowe gry, wkład buildu i bonusy z itemów.
    // Razem nadal pokazuje faktyczną wartość po zastosowaniu limitu gry.
    const buildOnlySource = Object.assign(
      {},
      source || {},
      {
        bonuses:[],
        profile:Object.assign(
          {},
          buildProfileStats(source || {}),
          {
            petHp:0,
            eqHp:0
          }
        )
      }
    );
    const buildOnly = buildCalculateStats(buildOnlySource);

    const baseStats = buildBaseStatBag(source);
    const buildContribution = buildNewStatBag();

    Object.keys(buildContribution).forEach(key => {
      buildContribution[key] =
        buildStatNumber(
          (Number(buildOnly.rawStats[key]) || 0) -
          (Number(baseStats[key]) || 0)
        );
    });

    const itemStats = buildNewStatBag();
    buildApplyImportedBonuses(
      itemStats,
      source || {},
      {skipProfileFlat:true}
    );

    const profileForItems = buildProfileStats(source || {});
    itemStats.maxHpFlat +=
      profileForItems.petHp +
      profileForItems.eqHp;

    const groups = [
      {
        title:"⚔️ Atak",
        finalKind:"attack",
        finalLabel:"Atak po przeliczeniu",
        keys:[
          "attackFlat","attackPct","accuracy","initiative","firstStrike",
          "critChance","critDmg","execute","lifesteal","armorPen","stun","bleed","bleedDamage"
        ]
      },
      {
        title:"👟 Mobilność i kontrola",
        keys:["evasion","doubleStrike","counter","healingReduction"]
      },
      {
        title:"🛡️ Obrona",
        finalKind:"defense",
        finalLabel:"Obrona po przeliczeniu",
        keys:[
          "defenseFlat","defensePct","damageReduction",
          "critResist","stunResist","bleedResist"
        ]
      },
      {
        title:"❤️ Życie",
        finalKind:"hp",
        finalLabel:"HP po przeliczeniu",
        levelHpRow:true,
        keys:["maxHpFlat","maxHpPct","hpRegen"]
      }
    ];

    const sourceValue = (key,value,emptyAsDash=false) => {
      const n = buildStatNumber(value);
      if (emptyAsDash && n === 0) return "—";
      return buildFormatStatValue(key,n);
    };

    const totalValueHtml = key => {
      const info = calculated.capInfo[key];
      const value = calculated.stats[key];

      if (!info || info.cap === null) {
        return `<strong>${escapeHtml(buildFormatStatValue(key,value))}</strong>`;
      }

      if (info.over > 0) {
        return `
          <strong class="build-stat-capped">
            ${escapeHtml(buildFormatStatValue(key,value))}
            <small>MAX (+${escapeHtml(buildFormatPlainNumber(info.over))}${BUILD_STAT_META[key][1] || ""} ponad)</small>
          </strong>
        `;
      }

      if (info.effective === info.cap) {
        return `
          <strong class="build-stat-capped">
            ${escapeHtml(buildFormatStatValue(key,value))}
            <small>MAX</small>
          </strong>
        `;
      }

      return `
        <strong>
          ${escapeHtml(buildFormatStatValue(key,value))}
          <small>/ ${escapeHtml(buildFormatPlainNumber(info.cap))}${BUILD_STAT_META[key][1] || ""} max</small>
        </strong>
      `;
    };

    const finalPrimaryValue = value => {
      const n = buildStatNumber(value);

      return n.toLocaleString(
        "pl-PL",
        {
          minimumFractionDigits:Number.isInteger(n) ? 0 : 1,
          maximumFractionDigits:2
        }
      );
    };

    const groupsHtml = groups.map(group => {
      const finalRow =
        // ATK / DEF / HP wpisane z ekranu gry są już wartościami startowymi
        // w walce. Nie pokazujemy ich drugi raz jako „po przeliczeniu”, bo
        // sugerowałoby to dodatkowe (i niepotrzebne) wyliczenie przez Tool.
        group.finalKind && !usesCombatStart
          ? (() => {
              const value =
                finalPrimary[group.finalKind];

              let formula = "";

              if (usesCombatStart) {
                formula="wartość z ekranu „Statystyki startowe w walce”";
              } else if (group.finalKind === "attack") {
                formula =
                  `${finalPrimaryValue(calculated.stats.attackFlat)} × ` +
                  `(1 + ${finalPrimaryValue(calculated.stats.attackPct)}%)`;
              }

              if (group.finalKind === "defense") {
                formula =
                  `${finalPrimaryValue(calculated.stats.defenseFlat)} × ` +
                  `(1 + ${finalPrimaryValue(calculated.stats.defensePct)}%)`;
              }

              if (group.finalKind === "hp") {
                formula =
                  `${finalPrimaryValue(calculated.stats.maxHpFlat)} × ` +
                  `(1 + ${finalPrimaryValue(calculated.stats.maxHpPct)}%)`;
              }

              return `
                <div class="build-stat-row build-stat-result-row">
                  <span class="build-stat-name">
                    ${escapeHtml(group.finalLabel)}
                    <small>${escapeHtml(formula)}</small>
                  </span>
                  <span class="build-stat-base">—</span>
                  <span class="build-stat-build">—</span>
                  <span class="build-stat-items">—</span>
                  <span class="build-stat-total">
                    <strong>${escapeHtml(finalPrimaryValue(value))}</strong>
                  </span>
                </div>
              `;
            })()
          : "";

      return `
        <section class="build-stat-group">
          <div class="build-stat-group-title">${group.title}</div>

          <div class="build-stat-source-head" aria-hidden="true">
            <span>Statystyka</span>
            <span>Baza</span>
            <span>Build</span>
            <span>Itemy</span>
            <span>Razem</span>
          </div>

          <div class="build-stat-grid">
            ${
              group.levelHpRow && !usesCombatStart
                ? `
                  <div class="build-stat-row build-stat-level-hp-row">
                    <span class="build-stat-name">
                      HP za poziom
                      <small>
                        ${escapeHtml(String(calculated.characterLevel))} × 5 HP${calculated.characterLevelProvided ? "" : " · poziom nieuzupełniony (tymczasowo minimum buildu)"}
                      </small>
                    </span>
                    <span class="build-stat-base">—</span>
                    <span class="build-stat-build">
                      ${escapeHtml(
                        sourceValue(
                          "maxHpFlat",
                          calculated.characterLevel * 5
                        )
                      )}
                    </span>
                    <span class="build-stat-items">—</span>
                    <span class="build-stat-total">
                      <strong>
                        ${escapeHtml(
                          sourceValue(
                            "maxHpFlat",
                            calculated.characterLevel * 5
                          )
                        )}
                      </strong>
                    </span>
                  </div>
                `
                : ""
            }
            ${group.keys.filter(key=>!usesCombatStart || !["attackFlat","attackPct","defenseFlat","defensePct","maxHpFlat","maxHpPct"].includes(key)).map(key => `
              <div class="build-stat-row">
                <span class="build-stat-name">${escapeHtml(BUILD_STAT_META[key][0])}</span>
                <span class="build-stat-base">${escapeHtml(sourceValue(key,baseStats[key] || 0,true))}</span>
                <span class="build-stat-build">${escapeHtml(sourceValue(key,buildContribution[key] || 0))}</span>
                <span class="build-stat-items">${escapeHtml(sourceValue(key,itemStats[key] || 0,true))}</span>
                <span class="build-stat-total">${totalValueHtml(key)}</span>
              </div>
            `).join("")}
            ${finalRow}
          </div>
        </section>
      `;
    }).join("");

    const dynamicAttackPerTurn =
      extras.dynamic.filter(
        item =>
          item &&
          item.type ===
            "attackPctPerTurn" &&
          Number(item.amount)
      );

    const dynamicAttackPerTurnTotal =
      dynamicAttackPerTurn.reduce(
        (sum,item) =>
          sum +
          (Number(item.amount) || 0),
        0
      );

    const dynamicHtml =
      dynamicAttackPerTurnTotal
        ? (() => {
            const maxTurns = 15;

            const maxBonus =
              buildStatNumber(
                dynamicAttackPerTurnTotal *
                maxTurns
              );

            const rows =
              Array.from(
                {length:maxTurns},
                (_,index) => {
                  const turn =
                    index + 1;

                  const turnBonus =
                    buildStatNumber(
                      dynamicAttackPerTurnTotal *
                      turn
                    );

                  const totalAttackPct =
                    buildStatNumber(
                      (Number(
                        calculated.stats.attackPct
                      ) || 0) +
                      turnBonus
                    );

                  const turnAttack =
                    buildStatNumber(
                      (Number(
                        calculated.stats.attackFlat
                      ) || 0) *
                      (
                        1 +
                        totalAttackPct /
                        100
                      )
                    );

                  return `
                    <tr>
                      <td>${turn}</td>
                      <td>+${escapeHtml(finalPrimaryValue(turnBonus))}%</td>
                      <td>${escapeHtml(finalPrimaryValue(totalAttackPct))}%</td>
                      <td><strong>${escapeHtml(finalPrimaryValue(turnAttack))}</strong></td>
                    </tr>
                  `;
                }
              ).join("");

            const sourceText =
              dynamicAttackPerTurn
                .map(item => item.text)
                .join(" + ");

            return `
              <section class="build-stat-group build-stat-extra">
                <div class="build-stat-group-title">
                  📈 Bonusy narastające z perków
                </div>

                <div class="build-stat-extra-list">
                  <div>
                    • ${escapeHtml(sourceText)}
                    <strong>
                      (maks. +${escapeHtml(finalPrimaryValue(maxBonus))}% w 15. turze)
                    </strong>
                  </div>
                </div>

                <details style="margin-top:10px">
                  <summary style="cursor:pointer;font-weight:700">
                    Pokaż przeliczenie tur 1–15
                  </summary>

                  <div style="overflow-x:auto;margin-top:8px">
                    <table style="width:100%;border-collapse:collapse;text-align:right">
                      <thead>
                        <tr>
                          <th style="text-align:left;padding:6px">Tura</th>
                          <th style="padding:6px">Bonus</th>
                          <th style="padding:6px">Łączny Atak %</th>
                          <th style="padding:6px">Atak po przeliczeniu</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${rows}
                      </tbody>
                    </table>
                  </div>
                </details>
              </section>
            `;
          })()
        : "";

    const conditionalHtml = extras.conditional.length
      ? `
        <section class="build-stat-group build-stat-extra">
          <div class="build-stat-group-title">⚡ Bonusy warunkowe z perków</div>
          <div class="build-stat-extra-list">
            ${extras.conditional.map(text=>`<div>• ${escapeHtml(text)}</div>`).join("")}
          </div>
        </section>
      `
      : "";

    const specialHtml = extras.special.length
      ? `
        <section class="build-stat-group build-stat-extra">
          <div class="build-stat-group-title">✨ Efekty specjalne</div>
          <div class="build-stat-extra-list">
            ${extras.special.map(text=>`<div>• ${escapeHtml(text)}</div>`).join("")}
          </div>
        </section>
      `
      : "";

    return groupsHtml + dynamicHtml + conditionalHtml + specialHtml;
  }

  function renderBuildStats() {
    const host = el("build-stats");
    if (!host) return;
    host.innerHTML = buildStatsHtml(buildState);
    buildRenderSetupSteps();
  }

  function buildRenderSetupSteps() {
    const host=el("build-setup-steps");
    if (!host) return;
    const profile=buildProfileStats(buildState);
    const hasBuild=buildPointsUsed()>0;
    const hasBonuses=Boolean(profile.bonusesConfirmed);
    const hasCombat=Boolean(profile.provided?.combatAttack && profile.provided?.combatDefense && profile.provided?.combatHp);
    const card=(step,title,ready,text)=>`<button type="button" class="build-setup-step ${ready?"ready":""}" data-build-setup-open="${step}"><span class="build-setup-step-number">${ready?"✓":step}</span><span><strong>${title}</strong><small>${text}</small></span><span class="build-setup-step-state">${ready?"Gotowe":"Uzupełnij"}</span>${ready?"":'<span class="build-setup-attention" aria-label="Wymaga uzupełnienia">!</span>'}</button>`;
    host.innerHTML=`<div class="build-setup-title"><strong>🥊 Przygotuj build do symulatora</strong><span class="muted">Uzupełnij trzy kroki. Zielone karty oznaczają gotowość.</span></div><div class="build-setup-grid">${card(1,"Build",hasBuild,hasBuild?`${buildPointsUsed()} pkt · poziom ${buildRequiredLevel()}`:"Wklej „Kopiuj build” z gry")}${card(2,"Bonusy PvP",hasBonuses,hasBonuses?`${(buildState.bonuses||[]).length} rozpoznanych bonusów`:"Wklej „Łączne bonusy PvP”")}${card(3,"Start walki",hasCombat,hasCombat?`${profile.combatAttack} ATK · ${profile.combatDefense} DEF · ${profile.combatHp} HP`:"Przepisz trzy statystyki z walki")}</div>`;
    host.querySelectorAll("[data-build-setup-open]").forEach(button=>button.addEventListener("click",()=>{
      const step=String(button.dataset.buildSetupOpen||"");
      const dialog=el(`build-setup-${step=== "1" ? "build" : step === "2" ? "bonuses" : "combat"}-dialog`);
      if (!dialog) return;
      if (step==="1") el("build-setup-build-input").value=el("build-game-string")?.value||"";
      if (step==="2") el("build-setup-bonuses-input").value=el("build-bonus-text")?.value||"";
      if (step==="3") { el("build-setup-combat-attack").value=profile.provided?.combatAttack?profile.combatAttack:""; el("build-setup-combat-defense").value=profile.provided?.combatDefense?profile.combatDefense:""; el("build-setup-combat-hp").value=profile.provided?.combatHp?profile.combatHp:""; }
      dialog.showModal();
    }));
  }


  function buildEmptyState() {
    return {
      id:"",
      level:1,
      attributes:{
        strength:0,
        endurance:0,
        agility:0,
        vitality:0,
        precision:0
      },
      perks:{
        strength:{},
        endurance:{},
        agility:{},
        vitality:{},
        precision:{}
      },
      name:"",
      description:"",
      profile:{
        attack:1,
        defense:1,
        baseHp:100,
        petHp:0,
        eqHp:0,
        combatAttack:0,
        combatDefense:0,
        combatHp:0,
        provided:{attack:false,defense:false,baseHp:false,petHp:false,eqHp:false,combatAttack:false,combatDefense:false,combatHp:false},
        bonusesConfirmed:false
      },
      bonuses:[],
      statCaps:{},
      bonusText:""
    };
  }

  let buildState = buildEmptyState();
  let buildEditingExisting = false;
  let buildActiveAttr = "";
  let buildPublicItems = [];
  let buildMyItems = [];
  let buildListsLoaded = false;

  function buildPointsUsed() {
    return BUILD_ATTR_ORDER.reduce(
      (sum,keyName) => sum + (Number(buildState.attributes[keyName]) || 0),
      0
    );
  }

  function buildRequiredLevel() {
    return Math.max(1,Math.ceil(buildPointsUsed()/2));
  }

  function buildAvailableTierCount(attrKey) {
    return Math.min(
      10,
      Math.floor((Number(buildState.attributes[attrKey]) || 0) / 5)
    );
  }


  function buildOfficialStringFrom(source) {
    const attrs = source && source.attributes ? source.attributes : {};
    const perks = source && source.perks ? source.perks : {};
    const values = BUILD_ATTR_ORDER.map(attrKey=>Math.max(0,Math.min(50,Math.trunc(Number(attrs[attrKey])||0))));
    const skillSegments = BUILD_ATTR_ORDER.map((attrKey,index)=>{
      const tierCount = Math.min(10,Math.floor(values[index]/5));
      const selected = perks[attrKey] || {};
      let out = "";
      for (let tier=1; tier<=tierCount; tier++) {
        const choice = selected[tier];
        out += choice === "A" || choice === "B" ? choice : "-";
      }
      return out;
    });
    return `${values.join("/")}:${skillSegments.join("/")}`;
  }

  function buildParseOfficialString(raw) {
    const text = String(raw || "").trim();
    if (!text) throw new Error("Wklej build z MenelWars.");
    const colon = text.indexOf(":");
    const attrPart = colon >= 0 ? text.slice(0,colon) : text;
    const skillPart = colon >= 0 ? text.slice(colon+1) : null;
    const attrParts = attrPart.split("/");
    if (attrParts.length !== 5) throw new Error("Część atrybutów musi mieć dokładnie 5 wartości STR/END/AGI/VIT/PRC.");

    const values = attrParts.map((value,index)=>{
      if (!/^\d+$/.test(String(value).trim())) throw new Error(`Atrybut ${index+1} nie jest liczbą całkowitą.`);
      const number = Number(value);
      if (!Number.isInteger(number) || number < 0 || number > 50) throw new Error(`Atrybut ${index+1} musi być w zakresie 0–50.`);
      return number;
    });

    let skillSegments = ["","","","",""];
    if (skillPart !== null) {
      skillSegments = skillPart.split("/");
      if (skillSegments.length !== 5) throw new Error("Po dwukropku musi być dokładnie 5 segmentów perków rozdzielonych znakiem /.");
    }

    const perks = {};
    BUILD_ATTR_ORDER.forEach((attrKey,index)=>{
      perks[attrKey] = {};
      const segment = String(skillSegments[index] || "").toUpperCase();
      const available = Math.min(10,Math.floor(values[index]/5));
      if (!/^[AB-]*$/.test(segment)) throw new Error(`Perki ${BUILD_ATTRS[attrKey].name}: dozwolone są tylko A, B i -.`);
      if (segment.length > available) throw new Error(`Perki ${BUILD_ATTRS[attrKey].name}: segment ma ${segment.length} wyborów, ale atrybut ${values[index]} odblokowuje tylko ${available}.`);
      [...segment].forEach((choice,tierIndex)=>{
        if (choice === "A" || choice === "B") perks[attrKey][tierIndex+1] = choice;
      });
    });

    const attributes = {};
    BUILD_ATTR_ORDER.forEach((attrKey,index)=>{ attributes[attrKey] = values[index]; });
    return {attributes,perks,official:buildOfficialStringFrom({attributes,perks})};
  }

  function buildImportOfficialString() {
    const status = el("build-game-string-status");
    try {
      const parsed = buildParseOfficialString(el("build-game-string")?.value || "");
      buildState.attributes = parsed.attributes;
      buildState.perks = parsed.perks;
      buildActiveAttr = "";
      if (el("build-game-string")) el("build-game-string").value = buildOfficialStringFrom(buildState);
      if (status) status.textContent = `✅ Import poprawny. Rozdano ${buildPointsUsed()} pkt · wymagany poziom ${buildRequiredLevel()}.`;
      renderBuildEditor();
      if (el("build-skill-editor")) el("build-skill-editor").hidden = true;
    } catch (err) {
      if (status) status.textContent = "❌ " + (err && err.message ? err.message : "Nie udało się zaimportować buildu.");
    }
  }

  async function buildCopyOfficialString() {
    const status = el("build-game-string-status");
    const value = buildOfficialStringFrom(buildState);
    if (el("build-game-string")) el("build-game-string").value = value;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const input = el("build-game-string");
        input?.focus();
        input?.select();
        if (!document.execCommand("copy")) throw new Error("Schowek niedostępny");
      }
      if (status) status.textContent = "✅ Skopiowano oficjalny format buildu.";
    } catch (err) {
      if (status) status.textContent = "⚠️ Nie mogłem użyć schowka — gotowy ciąg jest w polu powyżej.";
    }
  }


  function buildSelectedSkillCount(attrKey) {
    const perks = buildState.perks[attrKey] || {};
    return Object.keys(perks).filter(
      tier => perks[tier] === "A" || perks[tier] === "B"
    ).length;
  }

  function buildCleanLockedPerks(attrKey) {
    const available = buildAvailableTierCount(attrKey);
    const perks = buildState.perks[attrKey] || {};
    Object.keys(perks).forEach(tier => {
      if (Number(tier) > available) delete perks[tier];
    });
  }

  function buildSetAttribute(attrKey,nextValue) {
    const current = Number(buildState.attributes[attrKey]) || 0;
    let next = Math.max(0,Math.min(50,Number(nextValue) || 0));

    buildState.attributes[attrKey] = next;
    buildCleanLockedPerks(attrKey);
    renderBuildEditor();
  }

  function renderBuildEditor() {
    const host = el("build-attributes");
    if (!host) return;

    const used = buildPointsUsed();
    buildState.level = buildRequiredLevel();

    el("build-points-used").textContent = used;
    el("build-required-level").textContent = buildState.level;


    host.innerHTML = BUILD_ATTR_ORDER.map(attrKey => {
      const attr = BUILD_ATTRS[attrKey];
      const value = Number(buildState.attributes[attrKey]) || 0;
      const available = Math.min(10,Math.floor(value/5));
      const selected = buildSelectedSkillCount(attrKey);

      return `
        <article class="build-attr-card" data-attr="${attrKey}">
          <div class="build-attr-main" data-build-open-attr="${attrKey}">
            <div class="build-attr-title">
              <div class="build-attr-icon">${attr.icon}</div>
              <div>
                <div class="build-attr-name">${escapeHtml(attr.name)}</div>
                <div class="build-attr-sub">
                  ${escapeHtml(attr.description)} · Skille ${selected}/${available}
                </div>
              </div>
            </div>
            <div class="build-attr-controls">
              <button class="build-step-btn" type="button" data-build-minus="${attrKey}" ${value<=0?"disabled":""}>−</button>
              <span class="build-attr-value">${value}</span>
              <button class="build-step-btn" type="button" data-build-plus="${attrKey}" ${value>=50?"disabled":""}>＋</button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    host.querySelectorAll("[data-build-minus]").forEach(button=>{
      button.addEventListener("click",event=>{
        event.stopPropagation();
        const attrKey = button.dataset.buildMinus;
        buildSetAttribute(attrKey,(Number(buildState.attributes[attrKey])||0)-1);
      });
    });

    host.querySelectorAll("[data-build-plus]").forEach(button=>{
      button.addEventListener("click",event=>{
        event.stopPropagation();
        const attrKey = button.dataset.buildPlus;
        buildSetAttribute(attrKey,(Number(buildState.attributes[attrKey])||0)+1);
      });
    });

    host.querySelectorAll("[data-build-open-attr]").forEach(card=>{
      card.addEventListener("click",()=>{
        buildActiveAttr = card.dataset.buildOpenAttr;
        renderBuildSkillEditor();
      });
    });

    if (buildActiveAttr) renderBuildSkillEditor();
    renderBuildStats();
    renderBuildAccountState();
  }

  function renderBuildSkillEditor() {
    const host = el("build-skill-editor");
    if (!host || !buildActiveAttr || !BUILD_ATTRS[buildActiveAttr]) {
      if (host) host.hidden = true;
      return;
    }

    const attrKey = buildActiveAttr;
    const attr = BUILD_ATTRS[attrKey];
    const value = Number(buildState.attributes[attrKey]) || 0;
    const available = buildAvailableTierCount(attrKey);
    const selected = buildSelectedSkillCount(attrKey);

    host.hidden = false;
    host.innerHTML = `
      <div class="build-skill-head">
        <div>
          <strong>${attr.icon} ${escapeHtml(attr.name)}</strong>
          <div class="muted">Poziom ${value} · Skille ${selected}/${available}</div>
        </div>
        <button id="build-close-skills" type="button" class="secondary-btn">← Wróć do atrybutów</button>
      </div>

      <div class="build-tier-grid">
        ${attr.perks.map((pair,index)=>{
          const tier = index + 1;
          const required = tier * 5;
          const unlocked = value >= required;
          const current = (buildState.perks[attrKey] || {})[tier] || "";
          const optionA = pair[0];
          const optionB = pair[1];

          const perkButton = (letter,perk)=>`
            <button
              type="button"
              class="build-perk ${current===letter?"selected":""} ${unlocked?"":"locked"}"
              data-build-perk-tier="${tier}"
              data-build-perk-choice="${letter}"
              ${unlocked?"":"disabled"}
            >
              <strong>${letter} · ${escapeHtml(perk[0])}</strong>
              <small>${escapeHtml(perk[1])}</small>
            </button>
          `;

          return `
            <div class="build-tier-row ${unlocked?"":"locked"}">
              <div class="build-tier-number"><b>${tier}</b><span>Lvl ${required}</span></div>
              ${perkButton("A",optionA)}
              ${perkButton("B",optionB)}
            </div>
          `;
        }).join("")}
      </div>
    `;

    el("build-close-skills")?.addEventListener("click",()=>{
      buildActiveAttr = "";
      host.hidden = true;
    });

    host.querySelectorAll("[data-build-perk-tier]").forEach(button=>{
      button.addEventListener("click",()=>{
        const tier = Number(button.dataset.buildPerkTier);
        const choice = button.dataset.buildPerkChoice;
        if ((Number(buildState.attributes[attrKey])||0) < tier*5) return;

        const perks = buildState.perks[attrKey];
        perks[tier] = perks[tier] === choice ? "" : choice;
        if (!perks[tier]) delete perks[tier];

        renderBuildEditor();
      });
    });
  }

  function renderBuildAccountState(options={}) {
    const privateButton = el("build-save-private");
    const publicButton = el("build-share-public");
    const guestRow = el("build-guest-author-row");
    const hint = el("build-account-hint");
    if (!privateButton || !publicButton || !guestRow || !hint) return;

    const checking = Boolean(options.checking);
    const accountNick = cachedAccountNick();

    if (checking) {
      privateButton.hidden = true;
      guestRow.hidden = true;
      publicButton.classList.add("build-full-action");
      hint.className = "submit-info";
      hint.innerHTML = "⏳ Sprawdzam zalogowane konto...";
      return;
    }

    privateButton.hidden = !accountNick;
    guestRow.hidden = Boolean(accountNick);
    publicButton.classList.toggle("build-full-action",!accountNick);

    if (accountNick) {
      hint.className = "submit-info known-recipe";
      hint.innerHTML =
        `👤 Zalogowano jako <b>${escapeHtml(accountNick)}</b>. Możesz zapisać build prywatnie albo go udostępnić.`;
    } else {
      hint.className = "submit-info unknown-recipe";
      hint.innerHTML =
        `🌍 Kreator działa bez konta. Bez logowania możesz udostępnić build publicznie. Prywatny zapis jest dostępny po zalogowaniu.`;
    }
  }

  function buildReadProfileInputs() {
    const rawValue = id => String(el(id)?.value ?? "").trim();
    const readPositive = (id,fallback) => {
      const value = Number(rawValue(id));
      return Number.isFinite(value) && value >= 1
        ? buildStatNumber(value)
        : fallback;
    };
    const validPositiveInput = id => {
      const raw = rawValue(id);
      const value = Number(raw);
      return raw !== "" && Number.isFinite(value) && value >= 1;
    };
    buildState.profile = {
      // Zachowujemy stare pola jako bezpieczny fallback dla wcześniej
      // zapisanych buildów, ale nowe buildy używają trzech statystyk walki.
      attack:1,defense:1,baseHp:100,petHp:0,eqHp:0,
      combatAttack:readPositive("build-combat-attack",0),
      combatDefense:readPositive("build-combat-defense",0),
      combatHp:readPositive("build-combat-hp",0),
      provided:{
        attack:false,defense:false,baseHp:false,petHp:false,eqHp:false,
        combatAttack:validPositiveInput("build-combat-attack"),
        combatDefense:validPositiveInput("build-combat-defense"),
        combatHp:validPositiveInput("build-combat-hp")
      },
      bonusesConfirmed:Boolean(buildState.profile && buildState.profile.bonusesConfirmed)
    };

    return buildState.profile;
  }

  function buildWriteProfileInputs(profile) {
    const clean = buildProfileStats({profile});
    const provided = clean.provided || {};
    const setValue = (id,keyName,value) => {
      const input = el(id);
      if (input) input.value = provided[keyName] ? value : "";
    };

    setValue("build-combat-attack","combatAttack",clean.combatAttack);
    setValue("build-combat-defense","combatDefense",clean.combatDefense);
    setValue("build-combat-hp","combatHp",clean.combatHp);
  }


  function buildPayload(isPublic) {
    const accountNick = cachedAccountNick();
    const guestAuthor = el("build-guest-author")?.value.trim() || "";
    const name = el("build-name")?.value.trim() || "";
    const description = el("build-description")?.value.trim() || "";

    buildState.name = name;
    buildState.description = description;
    buildReadProfileInputs();

    return {
      action:"buildSave",
      nonce:makeRecipeNonce(),
      sessionToken:playerAccountSessionToken(),
      id:buildEditingExisting ? (buildState.id || "") : "",
      public:Boolean(isPublic),
      authorNick:accountNick || guestAuthor,
      name,
      description,
      level:buildRequiredLevel(),
      attributes:buildState.attributes,
      perks:buildState.perks,
      profile:Object.assign({},buildState.profile),
      bonuses:Array.isArray(buildState.bonuses) ? buildState.bonuses : [],
      statCaps:buildNormalizeDynamicStatCaps(buildState.statCaps || {})
    };
  }

  async function buildPostAction(payload) {
    if (!backendConfigured()) throw new Error("Backend nie jest skonfigurowany.");

    let sendError = null;

    try {
      await timedBackendPost(
        payload.action || "buildAction",
        payload
      );
    } catch (err) {
      sendError = err;
    }

    let result = null;
    for (let attempt=0; attempt<20; attempt++) {
      if (attempt) await new Promise(resolve=>setTimeout(resolve,350));
      try {
        result = await jsonp("buildActionResult",{nonce:payload.nonce});
      } catch (err) {
        if (attempt === 19 && !sendError) sendError = err;
        continue;
      }
      if (result && !result.pending) break;
    }

    if (!result || result.pending) {
      throw sendError || new Error("Serwer nie zwrócił wyniku operacji.");
    }
    if (!result.ok) throw new Error(result.error || "Nie udało się zapisać buildu.");
    return result;
  }

  function buildValidateBeforeSave(isPublic) {
    const status = el("build-save-status");
    const name = el("build-name")?.value.trim() || "";
    const accountNick = cachedAccountNick();
    const guestAuthor = el("build-guest-author")?.value.trim() || "";

    if (!name) {
      status.textContent = "Podaj nazwę buildu.";
      return false;
    }

    if (!isPublic && !accountNick) {
      status.textContent = "Prywatny build wymaga zalogowanego konta.";
      return false;
    }

    if (isPublic && !accountNick && !guestAuthor) {
      status.textContent = "Podaj nick autora przed udostępnieniem buildu.";
      return false;
    }

    return true;
  }

  async function saveBuild(isPublic) {
    const status = el("build-save-status");
    const button = isPublic ? el("build-share-public") : el("build-save-private");
    if (!buildValidateBeforeSave(isPublic)) return;

    const payload = buildPayload(isPublic);
    button.disabled = true;
    status.textContent = isPublic ? "Udostępniam build..." : "Zapisuję build prywatnie...";

    criticalOperationStart(
      isPublic ? "🌐 Udostępniam build…" : "💾 Zapisuję build…",
      "Zapis uruchomiony — po krótkiej chwili możesz dalej edytować formularz."
    );

    let overlayReleased = false;
    const releaseOverlay = () => {
      if (overlayReleased) return;
      overlayReleased = true;
      criticalOperationFinish();
    };
    const releaseTimer = setTimeout(() => {
      status.textContent = "⌛ Zapis buildu trwa w tle. Możesz dalej przeglądać narzędzie.";
      releaseOverlay();
    }, 700);

    try {
      const result = await buildPostAction(payload);

      if (buildEditingExisting) {
        buildState.id =
          result.build && result.build.id
            ? result.build.id
            : buildState.id;
      } else {
        // Zwykły kreator tworzy nowy rekord przy każdym zapisie.
        // Edycja istniejącego buildu jest możliwa tylko po wejściu przez
        // „✏️ Edytuj mój build”.
        buildState.id = "";
      }

      status.textContent = buildEditingExisting
        ? (
            isPublic
              ? "✅ Zapisany build został zaktualizowany i jest publiczny."
              : "✅ Zapisany build został zaktualizowany jako prywatny."
          )
        : (
            isPublic
              ? "✅ Utworzono nowy publiczny build."
              : "✅ Utworzono nowy prywatny build."
          );

      const primary=buildFinalPrimaryStats(buildCalculateStats(buildState));
      const values=Object.values(buildState.attributes || {}).map(Number);
      const fiftyAttr=values.some(value=>value>=50);
      const monoTree=BUILD_ATTR_ORDER.some(attrKey=>{
        if (Number(buildState.attributes?.[attrKey]) < 50) return false;
        const picks=Object.values(buildState.perks?.[attrKey] || {});
        return picks.length===10 && (picks.every(x=>x==="A") || picks.every(x=>x==="B"));
      });
      achievementTrack(["pvp_build",isPublic?"pvp_public_build":"",primary.hp>=2000?"pvp_hp_2000":"",primary.attack>=1000?"pvp_attack_1000":"",primary.defense>=1000?"pvp_defense_1000":"",fiftyAttr?"pvp_stat_50":"",monoTree?"pvp_tree_single":"",buildRequiredLevel()>=50?"pvp_level_50":""].filter(Boolean));

      await fetchBuildLists(true);
    } catch (err) {
      status.textContent = "❌ " + (err && err.message ? err.message : "Nie udało się zapisać buildu.");
    } finally {
      button.disabled = false;
      clearTimeout(releaseTimer);
      releaseOverlay();
    }
  }

  function buildNormalizeServerItem(item) {
    return {
      id:String(item && item.id || ""),
      name:String(item && item.name || ""),
      description:String(item && item.description || ""),
      authorNick:String(item && item.authorNick || ""),
      ownerNick:String(item && item.ownerNick || ""),
      public:Boolean(item && item.public),
      level:Math.max(1,Number(item && item.level) || 1),
      attributes:Object.assign(buildEmptyState().attributes,item && item.attributes || {}),
      perks:Object.assign(buildEmptyState().perks,item && item.perks || {}),
      profile:buildProfileStats(item || {}),
      bonuses:Array.isArray(item && item.bonuses) ? item.bonuses : [],
      statCaps:buildNormalizeDynamicStatCaps(
        item && item.statCaps
          ? item.statCaps
          : (item && item.profile && item.profile.statCaps ? item.profile.statCaps : {})
      ),
      updatedAt:String(item && item.updatedAt || "")
    };
  }

  async function fetchBuildLists(force=false) {
    if (buildListsLoaded && !force) {
      renderBuildLists();
      return;
    }

    const publicHost = el("build-public-list");
    if (publicHost) publicHost.innerHTML = `<div class="empty">Ładowanie buildów...</div>`;

    try {
      const result = await jsonp("builds",{
        sessionToken:playerAccountSessionToken()
      });

      if (!result || !result.ok) {
        throw new Error(result && result.error ? result.error : "Nie udało się pobrać buildów.");
      }

      buildPublicItems = Array.isArray(result.publicBuilds)
        ? result.publicBuilds.map(buildNormalizeServerItem)
        : [];
      buildMyItems = Array.isArray(result.myBuilds)
        ? result.myBuilds.map(buildNormalizeServerItem)
        : [];
      buildListsLoaded = true;
      renderBuildLists();
      renderBuildAccountState();
    } catch (err) {
      if (publicHost) {
        publicHost.innerHTML =
          `<div class="empty">❌ ${escapeHtml(err && err.message ? err.message : "Nie udało się pobrać buildów.")}</div>`;
      }
    }
  }


  const BUILD_PUBLIC_FILTER_INPUT_IDS = [
    "build-filter-query",
    "build-filter-level-min",
    "build-filter-level-max",
    "build-filter-sort",
    "build-filter-strength",
    "build-filter-endurance",
    "build-filter-agility",
    "build-filter-vitality",
    "build-filter-precision",
    "build-filter-attack",
    "build-filter-defense",
    "build-filter-hp",
    "build-filter-crit",
    "build-filter-armorpen",
    "build-filter-evasion",
    "build-filter-lifesteal",
    "build-filter-execute"
  ];

  function buildFilterNumber(id) {
    const raw = el(id)?.value;
    if (raw === undefined || raw === null || String(raw).trim() === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }

  function buildPublicFilterState() {
    return {
      query:String(el("build-filter-query")?.value || "").trim().toLocaleLowerCase("pl-PL"),
      levelMin:buildFilterNumber("build-filter-level-min"),
      levelMax:buildFilterNumber("build-filter-level-max"),
      sort:String(el("build-filter-sort")?.value || "newest"),
      attrs:{
        strength:buildFilterNumber("build-filter-strength"),
        endurance:buildFilterNumber("build-filter-endurance"),
        agility:buildFilterNumber("build-filter-agility"),
        vitality:buildFilterNumber("build-filter-vitality"),
        precision:buildFilterNumber("build-filter-precision")
      },
      stats:{
        attackPct:buildFilterNumber("build-filter-attack"),
        defensePct:buildFilterNumber("build-filter-defense"),
        maxHpPct:buildFilterNumber("build-filter-hp"),
        critChance:buildFilterNumber("build-filter-crit"),
        armorPen:buildFilterNumber("build-filter-armorpen"),
        evasion:buildFilterNumber("build-filter-evasion"),
        lifesteal:buildFilterNumber("build-filter-lifesteal"),
        execute:buildFilterNumber("build-filter-execute")
      }
    };
  }

  function buildItemFilterStats(item) {
    // buildCalculateStats zwraca wartości efektywne po capie
    // i uwzględnia atrybuty, perki oraz zapisane bonusy dodatkowe.
    return buildCalculateStats(item).stats;
  }

  function buildFilteredPublicItems() {
    const filter = buildPublicFilterState();

    let result = buildPublicItems.filter(item => {
      if (filter.query) {
        const haystack =
          `${item.name || ""} ${item.authorNick || ""} ${item.description || ""}`
            .toLocaleLowerCase("pl-PL");
        if (!haystack.includes(filter.query)) return false;
      }

      const level = Number(item.level) || 1;
      if (filter.levelMin !== null && level < filter.levelMin) return false;
      if (filter.levelMax !== null && level > filter.levelMax) return false;

      const attrs = item.attributes || {};
      for (const [key,minValue] of Object.entries(filter.attrs)) {
        if (minValue !== null && (Number(attrs[key]) || 0) < minValue) return false;
      }

      const needsStats = Object.values(filter.stats).some(value => value !== null);
      if (needsStats) {
        const stats = buildItemFilterStats(item);
        for (const [key,minValue] of Object.entries(filter.stats)) {
          if (minValue !== null && (Number(stats[key]) || 0) < minValue) return false;
        }
      }

      return true;
    });

    const statForSort = item => buildItemFilterStats(item);

    result.sort((a,b) => {
      switch (filter.sort) {
        case "levelAsc":
          return (Number(a.level)||1) - (Number(b.level)||1) ||
            String(a.name||"").localeCompare(String(b.name||""),"pl");
        case "levelDesc":
          return (Number(b.level)||1) - (Number(a.level)||1) ||
            String(a.name||"").localeCompare(String(b.name||""),"pl");
        case "attack":
          return (statForSort(b).attackPct||0) - (statForSort(a).attackPct||0);
        case "defense":
          return (statForSort(b).defensePct||0) - (statForSort(a).defensePct||0);
        case "hp":
          return (statForSort(b).maxHpPct||0) - (statForSort(a).maxHpPct||0);
        case "crit":
          return (statForSort(b).critChance||0) - (statForSort(a).critChance||0);
        case "evasion":
          return (statForSort(b).evasion||0) - (statForSort(a).evasion||0);
        case "newest":
        default:
          return String(b.updatedAt||"").localeCompare(String(a.updatedAt||""));
      }
    });

    return result;
  }

  function renderPublicBuildList() {
    const publicHost = el("build-public-list");
    if (!publicHost) return;

    const filtered = buildFilteredPublicItems();
    const count = el("build-filter-count");

    if (count) {
      count.textContent =
        `Pokazano ${filtered.length} z ${buildPublicItems.length} publicznych buildów.`;
    }

    if (!buildPublicItems.length) {
      publicHost.innerHTML =
        `<div class="empty">Nie ma jeszcze publicznych buildów. Możesz dodać pierwszy.</div>`;
      return;
    }

    if (!filtered.length) {
      publicHost.innerHTML =
        `<div class="empty">🔎 Żaden publiczny build nie spełnia wybranych filtrów.</div>`;
      return;
    }

    publicHost.innerHTML =
      `<div class="build-card-list">${filtered.map(item=>buildCardHtml(item,false)).join("")}</div>`;

    publicHost.querySelectorAll("[data-build-open]").forEach(card=>{
      card.addEventListener("click",()=>{
        const id = card.dataset.buildOpen;
        const item = buildPublicItems.find(entry=>entry.id===id);
        if (item) showBuildViewer(item);
      });
    });
  }

  function clearBuildPublicFilters() {
    BUILD_PUBLIC_FILTER_INPUT_IDS.forEach(id=>{
      const input = el(id);
      if (!input) return;
      if (id === "build-filter-sort") input.value = "newest";
      else input.value = "";
    });
    renderPublicBuildList();
  }

  function setupBuildPublicFilters() {
    BUILD_PUBLIC_FILTER_INPUT_IDS.forEach(id=>{
      const input = el(id);
      if (!input) return;
      input.addEventListener(
        id === "build-filter-sort" ? "change" : "input",
        renderPublicBuildList
      );
    });

    el("build-filter-clear")?.addEventListener("click",clearBuildPublicFilters);
  }


  function buildCardHtml(item,isMine=false) {
    const attrs = item.attributes || {};
    const perkCount = BUILD_ATTR_ORDER.reduce((sum,keyName)=>{
      const perks = item.perks && item.perks[keyName] ? item.perks[keyName] : {};
      return sum + Object.keys(perks).filter(tier=>perks[tier]==="A" || perks[tier]==="B").length;
    },0);

    return `
      <article class="build-card" data-build-open="${escapeHtml(item.id)}" data-build-scope="${isMine?"mine":"public"}">
        <div class="build-card-head">
          <div>
            <div class="build-card-name">${escapeHtml(item.name || "Bez nazwy")}</div>
            <div class="build-card-meta">
              👤 ${escapeHtml(item.authorNick || "Anonim")} · lvl ${item.level} · ${perkCount} perków
              ${item.public ? " · 🌍 Publiczny" : " · 🔒 Prywatny"}
            </div>
          </div>
          <span>›</span>
        </div>
        ${item.description ? `<div class="build-card-desc">${escapeHtml(item.description)}</div>` : ""}
        <div class="build-card-attrs">
          <span>✊ ${Number(attrs.strength)||0}</span>
          <span>🛡️ ${Number(attrs.endurance)||0}</span>
          <span>👟 ${Number(attrs.agility)||0}</span>
          <span>📜 ${Number(attrs.vitality)||0}</span>
          <span>👓 ${Number(attrs.precision)||0}</span>
        </div>
      </article>
    `;
  }

  function renderBuildLists() {
    const publicHost = el("build-public-list");
    const myHost = el("build-my-list");
    const mySection = el("build-my-section");

    if (publicHost) {
      renderPublicBuildList();
    }

    const accountNick = cachedAccountNick();
    if (mySection) mySection.hidden = !accountNick || buildActiveTab!=="mine";

    if (myHost && accountNick) {
      myHost.innerHTML = buildMyItems.length
        ? `<div class="build-card-list">${buildMyItems.map(item=>buildCardHtml(item,true)).join("")}</div>`
        : `<div class="empty">Nie masz jeszcze zapisanych buildów.</div>`;
    }

    if (myHost) {
      myHost.querySelectorAll("[data-build-open]").forEach(card=>{
        card.addEventListener("click",()=>{
          const id = card.dataset.buildOpen;
          const item = buildMyItems.find(entry=>entry.id===id);
          if (item) showBuildViewer(item);
        });
      });
    }
    pvpPopulateSelectors();
  }

  function showBuildViewer(item) {
    const host = el("build-viewer");
    if (!host) return;

    const attrHtml = BUILD_ATTR_ORDER.map(attrKey=>{
      const attr = BUILD_ATTRS[attrKey];
      const value = Number(item.attributes && item.attributes[attrKey]) || 0;
      const perks = item.perks && item.perks[attrKey] ? item.perks[attrKey] : {};
      const picked = Object.keys(perks)
        .map(Number)
        .sort((a,b)=>a-b)
        .filter(tier=>perks[tier]==="A" || perks[tier]==="B")
        .map(tier=>{
          const choice = perks[tier];
          const perk = attr.perks[tier-1][choice==="A"?0:1];
          return `T${tier}${choice}: ${perk[0]}`;
        });

      return `
        <div class="build-viewer-attr">
          <strong>${attr.icon} ${escapeHtml(attr.name)} — ${value}</strong>
          <div class="build-viewer-perks">
            ${picked.length ? escapeHtml(picked.join(" · ")) : "Brak wybranych perków"}
          </div>
        </div>
      `;
    }).join("");

    const mine = Boolean(
      cachedAccountNick() &&
      normalizedPlayerNick(item.ownerNick) === normalizedPlayerNick(cachedAccountNick())
    );

    const hasImportedBonuses =
      Array.isArray(item.bonuses) &&
      item.bonuses.length > 0;

    host.hidden = false;
    host.innerHTML = `
      <div class="build-skill-head">
        <div>
          <strong>🛠 ${escapeHtml(item.name)}</strong>
          <div class="muted">
            👤 ${escapeHtml(item.authorNick || "Anonim")} · lvl ${item.level} · ${item.public ? "🌍 Publiczny" : "🔒 Prywatny"}
          </div>
        </div>
        <button id="build-viewer-close" type="button" class="secondary-btn">✕ Zamknij</button>
      </div>
      ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
      <div class="build-viewer-attrs">${attrHtml}</div>

      <details class="content-accordion build-stats-accordion" open>
        <summary>
          <span>📊 Łączne statystyki buildu</span>
          <span class="accordion-chevron">⌄</span>
        </summary>
        <div class="content-accordion-body">
          <div class="build-stats">${buildStatsHtml(item)}</div>
        </div>
      </details>

      <div class="build-viewer-actions">
        <button id="build-copy-to-editor" type="button" class="primary-btn">📋 Użyj jako podstawy</button>
        ${
          hasImportedBonuses
            ? `<button id="build-copy-with-items" type="button" class="secondary-btn">📦 Kopiuj razem z itemami</button>`
            : ""
        }
        ${mine ? `<button id="build-edit-own" type="button" class="secondary-btn">✏️ Edytuj mój build</button>` : ""}
        ${mine ? `<button id="build-delete-own" type="button" class="danger-soft">🗑 Usuń</button>` : ""}
      </div>
      <div id="build-viewer-status" class="submit-status"></div>
    `;

    el("build-viewer-close")?.addEventListener("click",()=>{ host.hidden=true; });

    el("build-copy-to-editor")?.addEventListener("click",()=>{
      loadBuildIntoEditor(
        item,
        false,
        false
      );
      host.hidden = true;
      setBuildTab("editor",{noScroll:true});
      el("build-editor")?.scrollIntoView({behavior:"smooth",block:"start"});
    });

    el("build-copy-with-items")?.addEventListener("click",()=>{
      loadBuildIntoEditor(
        item,
        false,
        true
      );
      host.hidden = true;
      setBuildTab("editor",{noScroll:true});
      el("build-editor")?.scrollIntoView({behavior:"smooth",block:"start"});
    });

    el("build-edit-own")?.addEventListener("click",()=>{
      loadBuildIntoEditor(
        item,
        true,
        true
      );
      host.hidden = true;
      setBuildTab("editor",{noScroll:true});
      el("build-editor")?.scrollIntoView({behavior:"smooth",block:"start"});
    });

    el("build-delete-own")?.addEventListener("click",async()=>{
      if (!window.confirm(`Usunąć build „${item.name}”?`)) return;
      const status = el("build-viewer-status");
      const payload = {
        action:"buildDelete",
        nonce:makeRecipeNonce(),
        sessionToken:playerAccountSessionToken(),
        id:item.id
      };
      const publicBeforeDelete = buildPublicItems;
      const myBeforeDelete = buildMyItems;
      buildPublicItems = buildPublicItems.filter(entry=>entry.id !== item.id);
      buildMyItems = buildMyItems.filter(entry=>entry.id !== item.id);
      renderBuildLists();
      host.hidden = true;
      status.textContent = "Usuwanie...";
      criticalOperationStart(
        "🗑 Usuwam build…",
        "Build znika teraz, a potwierdzenie usunięcia trwa w tle."
      );
      let overlayReleased = false;
      const releaseOverlay = () => {
        if (overlayReleased) return;
        overlayReleased = true;
        criticalOperationFinish();
      };
      const releaseTimer = setTimeout(()=>{
        releaseOverlay();
      },700);
      try {
        await buildPostAction(payload);
        status.textContent = "✅ Build został usunięty.";
        host.hidden = true;
        invalidateAppCache("builds");
        await fetchBuildLists(true);
      } catch(err) {
        buildPublicItems = publicBeforeDelete;
        buildMyItems = myBeforeDelete;
        renderBuildLists();
        host.hidden = false;
        status.textContent = "❌ " + (err && err.message ? err.message : "Nie udało się usunąć buildu.");
      } finally {
        clearTimeout(releaseTimer);
        releaseOverlay();
      }
    });
  }

  function loadBuildIntoEditor(
    item,
    keepId=false,
    includeBonuses=true
  ) {
    const fresh = buildEmptyState();
    buildEditingExisting = Boolean(keepId);
    fresh.id = keepId ? String(item.id || "") : "";
    fresh.level = Math.max(1,Number(item.level)||1);
    fresh.name = keepId ? String(item.name||"") : `${String(item.name||"Build")} — kopia`;
    fresh.description = String(item.description||"");
    fresh.profile =
      (
        keepId ||
        includeBonuses
      )
        ? buildProfileStats(item || {})
        : Object.assign({},buildEmptyState().profile,{
            provided:Object.assign({},buildEmptyState().profile.provided)
          });

    fresh.bonuses =
      includeBonuses &&
      Array.isArray(item.bonuses)
        ? item.bonuses.map(entry=>Object.assign({},entry))
        : [];
    fresh.statCaps =
      (keepId || includeBonuses)
        ? buildNormalizeDynamicStatCaps(item.statCaps || {})
        : {};
    fresh.bonusText = "";

    BUILD_ATTR_ORDER.forEach(attrKey=>{
      fresh.attributes[attrKey] = Math.max(0,Math.min(50,Number(item.attributes && item.attributes[attrKey])||0));
      const srcPerks = item.perks && item.perks[attrKey] ? item.perks[attrKey] : {};
      fresh.perks[attrKey] = {};
      Object.keys(srcPerks).forEach(tier=>{
        const choice = srcPerks[tier];
        if ((choice==="A" || choice==="B") && Number(tier)<=10) {
          fresh.perks[attrKey][tier] = choice;
        }
      });
    });

    buildState = fresh;
    buildActiveAttr = "";
    el("build-name").value = fresh.name;
    el("build-description").value = fresh.description;
    buildWriteProfileInputs(fresh.profile);
    if (el("build-bonus-text")) el("build-bonus-text").value = "";
    buildRenderBonusPreview();
    el("build-save-status").textContent = keepId
      ? "✏️ Tryb edycji: kolejne zapisanie zaktualizuje ten konkretny build."
      : (
          includeBonuses
            ? "📦 Skopiowano build razem z itemami. Zapis utworzy nowy build."
            : "📋 Skopiowano atrybuty i perki bez danych autora. Uzupełnij trzy kroki nad kreatorem: build, własne bonusy PvP oraz statystyki startowe w walce."
        );
    renderBuildEditor();
    el("build-skill-editor").hidden = true;
  }

  function newBuild() {
    buildState = buildEmptyState();
    buildEditingExisting = false;
    buildActiveAttr = "";
    el("build-name").value = "";
    el("build-description").value = "";
    buildWriteProfileInputs(buildState.profile);
    if (el("build-bonus-text")) el("build-bonus-text").value = "";
    if (el("build-bonus-status")) el("build-bonus-status").textContent = "";
    buildRenderBonusPreview();
    el("build-save-status").textContent = "";
    el("build-skill-editor").hidden = true;
    renderBuildEditor();
  }


  // ============================================================
  // OGRÓD v20.94 — natychmiastowa synchronizacja pól + ręczny czas startu
  // ============================================================

  const GARDEN_LOCAL_KEY = "menelwars_garden_plots_v1";
  let gardenData = {active:[],results:[],phases:[],plants:["Cebula"]};
  let gardenSelectedPlot = 1;
  let gardenResultsSelectedPlant = "";
  let gardenLiveRefreshInFlight = null;
  let gardenLastRenderSignature = "";
  let gardenLastPlotStateSignature = "";
  let gardenPendingPhase = null;
  let gardenEasterWaterSequence = [];
  let gardenEasterWaterStartedAt = 0;
  const GARDEN_AUTO_MODEL_VERSION = "AUTO52";
  const GARDEN_AUTO_MODEL_HOURS = 52;
  const GARDEN_AUTO_STAGE_MS = (GARDEN_AUTO_MODEL_HOURS * 60 * 60 * 1000) / 10;
  const GARDEN_OPTIMAL_LIMIT_MS = 56 * 60 * 60 * 1000;

  function gardenLoadLocalPlots() {
    try {
      const parsed = JSON.parse(localStorage.getItem(GARDEN_LOCAL_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function gardenSaveLocalPlots(value) {
    localStorage.setItem(GARDEN_LOCAL_KEY,JSON.stringify(value || {}));
  }

  function gardenSetLocalPlot(plot,item) {
    const all = gardenLoadLocalPlots();
    if (item) all[String(plot)] = item;
    else delete all[String(plot)];
    gardenSaveLocalPlots(all);
  }

  function gardenComboKey(item) {
    return [
      String(item && item.plant || ""),
      Math.round(Number(item && item.sun) || 0),
      Math.round(Number(item && item.water) || 0),
      (Math.round((Number(item && item.ph) || 0)*10)/10).toFixed(1)
    ].join("|");
  }

  function gardenFormatDuration(ms) {
    ms = Math.max(0,Number(ms) || 0);
    const totalMinutes = Math.floor(ms / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (days) parts.push(`${days} d`);
    if (days || hours) parts.push(`${hours} godz.`);
    parts.push(`${minutes} min`);
    return parts.join(" ");
  }

  function gardenClampValue(value,min,max,step,fallback) {
    let number = Number(value);
    if (!Number.isFinite(number)) number = Number(fallback);
    number = Math.max(min,Math.min(max,number));
    const precision = step < 1 ? 1 : 0;
    const rounded = Math.round(number/step)*step;
    return Number(rounded.toFixed(precision));
  }

  function gardenManualConfig(kind) {
    return {
      sun:{range:"garden-sun",input:"garden-sun-input",min:0,max:100,step:1,fallback:60},
      water:{range:"garden-water",input:"garden-water-input",min:0,max:100,step:1,fallback:50},
      ph:{range:"garden-ph",input:"garden-ph-input",min:0,max:14,step:0.1,fallback:7}
    }[kind] || null;
  }

  function gardenSyncManualInput(kind,source) {
    const config = gardenManualConfig(kind);
    if (!config) return;

    const range = el(config.range);
    const input = el(config.input);
    if (!range || !input) return;

    const raw = source === "range" ? range.value : input.value;
    const value = gardenClampValue(raw,config.min,config.max,config.step,range.value || config.fallback);
    range.value = String(value);
    input.value = kind === "ph" ? value.toFixed(1) : String(Math.round(value));
  }

  function gardenTrackWaterEasterEgg(value) {
    const endpoint=Number(value);
    if (endpoint!==1 && endpoint!==100) return;
    const now=Date.now();
    const expected=[1,100,1,100];
    if (gardenEasterWaterStartedAt && now-gardenEasterWaterStartedAt>30000) {
      gardenEasterWaterSequence=[];
      gardenEasterWaterStartedAt=0;
    }
    if (endpoint===expected[gardenEasterWaterSequence.length]) {
      if (!gardenEasterWaterSequence.length) gardenEasterWaterStartedAt=now;
      gardenEasterWaterSequence.push(endpoint);
      if (gardenEasterWaterSequence.length===expected.length) {
        gardenEasterWaterSequence=[];
        gardenEasterWaterStartedAt=0;
        achievementTrack(["easter_forgetful_watering"]);
      }
      return;
    }
    gardenEasterWaterSequence=endpoint===1 ? [1] : [];
    gardenEasterWaterStartedAt=endpoint===1 ? now : 0;
  }

  // Synchronizacja podczas wpisywania: pole liczbowe jest źródłem prawdy już
  // po każdym znaku. Dzięki temu suwak nigdy nie zostaje ze starą wartością.
  function gardenSyncManualInputLive(kind) {
    const config = gardenManualConfig(kind);
    if (!config) return;

    const range = el(config.range);
    const input = el(config.input);
    if (!range || !input) return;

    let raw = String(input.value == null ? "" : input.value).trim();

    // Minus nie jest dozwolony. Dotyczy też wartości wklejonych ze schowka.
    if (raw.startsWith("-")) {
      const value = config.min;
      range.value = String(value);
      input.value = kind === "ph" ? value.toFixed(1) : String(Math.round(value));
      gardenRenderComboStatus();
      return;
    }

    if (kind === "ph") {
      raw = raw.replace(/,/g,".").replace(/[^0-9.]/g,"");
      const dot = raw.indexOf(".");
      if (dot !== -1) {
        raw = raw.slice(0,dot+1) + raw.slice(dot+1).replace(/\./g,"");
        // pH w Ogrodzie ma dokładność 0,1 — nie przyjmujemy dalszych cyfr.
        raw = raw.slice(0,dot+2);
      }
      if (raw.startsWith(".")) raw = `0${raw}`;
      input.value = raw;
      if (!raw || raw === ".") return;

      const numericRaw = raw.endsWith(".") ? raw.slice(0,-1) : raw;
      const number = Number(numericRaw);
      if (!Number.isFinite(number)) return;

      const value = gardenClampValue(number,config.min,config.max,config.step,config.fallback);
      range.value = String(value);
      if (number > config.max || number < config.min) input.value = value.toFixed(1);
      gardenRenderComboStatus();
      return;
    }

    raw = raw.replace(/[^0-9]/g,"");
    input.value = raw;
    if (!raw) return;

    const number = Number(raw);
    if (!Number.isFinite(number)) return;
    const value = gardenClampValue(number,config.min,config.max,config.step,config.fallback);
    range.value = String(value);
    input.value = String(Math.round(value));
    gardenRenderComboStatus();
  }

  function gardenSyncAllManualInputs() {
    gardenSyncManualInput("sun","range");
    gardenSyncManualInput("water","range");
    gardenSyncManualInput("ph","range");
  }

  function gardenCommitAllManualInputs() {
    gardenSyncManualInput("sun","input");
    gardenSyncManualInput("water","input");
    gardenSyncManualInput("ph","input");
  }

  function gardenCurrentControls() {
    return {
      plant:el("garden-plant")?.value || "Cebula",
      sun:gardenClampValue(el("garden-sun")?.value,0,100,1,0),
      water:gardenClampValue(el("garden-water")?.value,0,100,1,0),
      ph:gardenClampValue(el("garden-ph")?.value,0,14,0.1,0)
    };
  }

  function gardenLocalDateTimeValue(ms) {
    const date = new Date(Number(ms) || Date.now());
    const pad = value => String(value).padStart(2,"0");
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function gardenRefreshStartTimeControls() {
    const fieldset = el("garden-start-time");
    const earlier = el("garden-start-earlier");
    const wrap = el("garden-start-earlier-wrap");
    const input = el("garden-start-datetime");
    if (!fieldset || !earlier || !wrap || !input) return;

    const own = gardenOwnExperimentForPlot(gardenSelectedPlot);
    fieldset.hidden = Boolean(own);
    if (own) return;

    const nowValue = gardenLocalDateTimeValue(Date.now());
    input.max = nowValue;
    wrap.hidden = !earlier.checked;
    if (earlier.checked && !input.value) input.value = nowValue;
  }

  function gardenStartTimingPayload() {
    const earlier = Boolean(el("garden-start-earlier")?.checked);
    if (!earlier) return {startMode:"now"};

    const input = el("garden-start-datetime");
    const raw = String(input?.value || "").trim();
    if (!raw) throw new Error("Podaj datę i godzinę zasadzenia w grze.");

    const startedAtMs = new Date(raw).getTime();
    if (!Number.isFinite(startedAtMs)) throw new Error("Nieprawidłowa data lub godzina zasadzenia.");
    if (startedAtMs > Date.now()+60000) throw new Error("Czas zasadzenia nie może być w przyszłości.");

    return {
      startMode:"manual",
      startedAtMs:String(Math.round(startedAtMs))
    };
  }

  function gardenLatestResultFor(combo) {
    const wanted = gardenComboKey(combo);
    return (gardenData.results || []).find(item => gardenComboKey(item) === wanted) || null;
  }

  function gardenActiveFor(combo) {
    const wanted = gardenComboKey(combo);
    return (gardenData.active || []).filter(item => gardenComboKey(item) === wanted);
  }

  function gardenOwnExperimentForPlot(plot) {
    const local = gardenLoadLocalPlots()[String(plot)] || null;
    const accountNick = cachedAccountNick();
    const active = gardenData.active || [];

    if (local && local.id) {
      const found = active.find(item => String(item.id) === String(local.id));
      if (found) return {...found,ownerToken:String(local.ownerToken || "")};
    }

    if (accountNick) {
      const found = active.find(item =>
        Number(item.plot) === Number(plot) &&
        normalizedPlayerNick(item.nick) === normalizedPlayerNick(accountNick)
      );
      if (found) return {...found,ownerToken:""};
    }

    return null;
  }


  // ============================================================
  // v21.00 — Ogród: append-only obserwacje atlasFrame/READY
  // ============================================================
  function gardenEventsFor(experimentId) {
    return (gardenData.phases || [])
      .filter(event=>String(event.experimentId)===String(experimentId))
      .slice()
      .sort((a,b)=>(Number(a.observedAt)||0)-(Number(b.observedAt)||0) || String(a.eventId||"").localeCompare(String(b.eventId||"")));
  }

  function gardenPhaseSummary(experiment) {
    if (!experiment || !experiment.id) {
      return {events:[],analysisEvents:[],frames:[],checks:[],lastFrame:null,ready:null};
    }

    // Historia pozostaje append-only. Korekta nie usuwa starego wiersza z OgrodFazy,
    // ale w analizie wykluczamy raport wskazany przez CorrectionOfEventID. Dzięki temu
    // błędne 7 skorygowane później na 6 nie wygląda jak biologiczne cofnięcie 7→6.
    const events=gardenEventsFor(experiment.id);
    const correctedIds=new Set(
      events
        .map(event=>String(event.correctionOfEventId||"").trim())
        .filter(Boolean)
    );
    const analysisEvents=events.filter(
      event=>!correctedIds.has(String(event.eventId||"").trim())
    );

    const frames=analysisEvents.filter(
      event=>event.eventType==="FRAME" && Number.isInteger(Number(event.atlasFrame))
    );
    const checks=analysisEvents.filter(
      event=>event.eventType==="CHECK" &&
        Number.isInteger(Number(event.expectedFrame)) &&
        (event.answer==="YES" || event.answer==="NO")
    );
    const readyEvents=analysisEvents.filter(event=>event.eventType==="READY");
    const ready=readyEvents.length?readyEvents[0]:null;
    const lastFrame=frames.length?frames[frames.length-1]:null;
    let entryLower=Number(experiment.startedAt)||0;
    let entryUpper=lastFrame?Number(lastFrame.observedAt)||0:0;

    if (lastFrame) {
      let firstIndex=frames.length-1;
      while (firstIndex>0 && Number(frames[firstIndex-1].atlasFrame)===Number(lastFrame.atlasFrame)) firstIndex--;
      const firstCurrent=frames[firstIndex];
      entryUpper=Number(firstCurrent.observedAt)||entryUpper;
      const allBefore=analysisEvents.filter(
        event=>(Number(event.observedAt)||0)<entryUpper && event.eventType==="FRAME"
      );
      if (allBefore.length) entryLower=Number(allBefore[allBefore.length-1].observedAt)||entryLower;
    }

    return {events,analysisEvents,frames,checks,lastFrame,ready,entryLower,entryUpper};
  }

  function gardenUsesAutoModel(item) {
    return String(item && item.modelVersion || "").toUpperCase() === GARDEN_AUTO_MODEL_VERSION;
  }

  function gardenAutoFrame(item,now=Date.now()) {
    const age=Math.max(0,Number(now)-Number(item && item.startedAt || 0));
    return Math.max(0,Math.min(9,Math.floor(age/GARDEN_AUTO_STAGE_MS)));
  }

  function gardenDisplayFrame(item,summary,now=Date.now()) {
    if (gardenUsesAutoModel(item)) return gardenAutoFrame(item,now);
    return summary && summary.lastFrame ? Number(summary.lastFrame.atlasFrame) : null;
  }

  function gardenCheckForFrame(summary,frame) {
    return (summary && summary.checks || []).find(
      event=>Number(event.expectedFrame)===Number(frame)
    ) || null;
  }

  function gardenNeedsModelCheck(item,summary,now=Date.now()) {
    if (!item || !gardenUsesAutoModel(item)) return false;
    const frame=gardenAutoFrame(item,now);
    // Etap 1 jest potwierdzany posadzeniem, a etap 10 potwierdza sam zbiór.
    return frame>0 && frame<9 && !gardenCheckForFrame(summary,frame);
  }

  function gardenCheckStats(item,summary) {
    const checks=(summary && summary.checks || []).slice().sort((a,b)=>Number(a.observedAt)-Number(b.observedAt));
    const yes=checks.filter(event=>event.answer==="YES");
    const no=checks.filter(event=>event.answer==="NO");
    const gaps=checks.slice(1).map((event,index)=>Math.max(0,Number(event.observedAt)-Number(checks[index].observedAt)));
    const last=checks.length ? checks[checks.length-1] : null;
    const lastNonReadyYes=yes.filter(event=>Number(event.expectedFrame)<9).slice(-1)[0] || null;
    return {
      checks,yes,no,last,lastNonReadyYes,
      medianGap:gardenMedian(gaps),
      maxGap:gaps.length ? Math.max(...gaps) : 0,
      agreement:checks.length ? yes.length/checks.length : null
    };
  }

  function gardenEvidenceForResult(item) {
    const summary=gardenPhaseSummary(item);
    const stats=gardenCheckStats(item,summary);
    const duration=Math.max(0,Number(item && item.durationMs) || 0);
    const provenByDeadline=duration>0 && duration<=GARDEN_OPTIMAL_LIMIT_MS;
    const provenSlow=Boolean(
      stats.lastNonReadyYes &&
      Number(stats.lastNonReadyYes.observedAt)-Number(item.startedAt||0)>GARDEN_OPTIMAL_LIMIT_MS
    );
    const finalGap=stats.last
      ? Math.max(0,Number(item.finishedAt||0)-Number(stats.last.observedAt||0))
      : 0;
    let confidence="niska";
    if (stats.checks.length>=3 && stats.last && finalGap<=6*60*60*1000) confidence="wysoka";
    else if (stats.checks.length>=1) confidence="średnia";
    return {summary,stats,duration,provenByDeadline,provenSlow,finalGap,confidence};
  }

  function gardenDisplayStage(frame) {
    const number=Number(frame);
    if (!Number.isInteger(number) || number<0 || number>9) return null;
    return number+1;
  }

  function gardenAtlasForPlant(plant) {
    return /ziemniak/i.test(String(plant||"")) ? "potato-growth-atlas-v4.png?v=21.60" : "onion-growth-atlas.png?v=21.09";
  }

  function gardenFrameSpriteHtml(frame,className="garden-phase-sprite",plant="Cebula") {
    const number=Number(frame);
    if (!Number.isInteger(number) || number<0 || number>9) return "";
    return `<span class="${className}" style="--garden-frame:${number};--garden-atlas:url('${gardenAtlasForPlant(plant)}')" aria-label="Etap ${gardenDisplayStage(number)}"></span>`;
  }

  async function gardenPostAction(action,payload) {
    const nonce=makeRecipeNonce();
    let sendError=null;
    try {
      await timedBackendPost(action,Object.assign({},payload,{action,nonce}));
    } catch (err) {
      // Brak odpowiedzi POST nie oznacza, że Apps Script nie wykonał zapisu.
      // Nie ponawiamy mutacji; pytamy o ten sam nonce.
      sendError=err;
    }
    let result=null;
    for (let attempt=0;attempt<24;attempt++) {
      if (attempt) await new Promise(resolve=>setTimeout(resolve,350));
      try {
        result=await jsonp("gardenActionResult",{nonce});
      } catch (err) {
        if (attempt===23 && !sendError) sendError=err;
        continue;
      }
      if (result && !result.pending) break;
    }
    if (!result || result.pending) {
      throw sendError || new Error("Serwer nie potwierdził zapisu Ogrodu.");
    }
    return result;
  }

  async function achievementTrack(ids) {
    if (!playerAccountSessionToken()) return null;
    try {
      const result=await playerAccountPostAction("achievementTrack",{sessionToken:playerAccountSessionToken(),ids:Array.isArray(ids)?ids:[ids]});
      if (cachedAccountStatus && result.unlocked) cachedAccountStatus.achievements=result.unlocked;
      return result;
    } catch (err) {
      console.warn("[MenelWars Tools] Osiągnięcie nie zostało zapisane:",err);
      return null;
    }
  }

  async function achievementTrackAiWin(presetId,ownLevel) {
    if (!playerAccountSessionToken()) return null;
    try {
      const result=await playerAccountPostAction("achievementAiWin",{
        sessionToken:playerAccountSessionToken(),
        presetId,
        ownLevel
      });
      if (cachedAccountStatus && result.unlocked) cachedAccountStatus.achievements=result.unlocked;
      return result;
    } catch (err) {
      console.warn("[MenelWars Tools] Wygrana z AI nie została zapisana:",err);
      return null;
    }
  }

  async function gardenRecordModelCheck(frame,answer) {
    const own=gardenOwnExperimentForPlot(gardenSelectedPlot);
    if (!own || !gardenUsesAutoModel(own)) return;
    const summary=gardenPhaseSummary(own);
    if (gardenCheckForFrame(summary,frame)) return;
    const status=el("garden-action-status");
    const observedAt=Date.now();
    const pendingEventId=`local-check-${observedAt}-${Math.random().toString(36).slice(2)}`;
    gardenPendingPhase={
      experimentId:String(own.id),eventId:pendingEventId,eventType:"CHECK",
      expectedFrame:Number(frame),answer:String(answer),observedAt,source:"AUTO_CHECK"
    };
    gardenData={...gardenData,phases:[...(gardenData.phases||[]),gardenPendingPhase]};
    gardenRenderPlots();
    gardenRenderEditor();
    criticalOperationStart("🌿 Zapisuję odpowiedź…","Odpowiedź znika z ekranu, a potwierdzenie serwera trwa w tle.");
    let overlayReleased=false;
    const releaseOverlay=()=>{
      if (overlayReleased) return;
      overlayReleased=true;
      criticalOperationFinish();
    };
    const releaseTimer=setTimeout(()=>{
      if (status) status.textContent="⌛ Odpowiedź zapisuje się w tle — możesz dalej korzystać z Ogrodu.";
      releaseOverlay();
    },700);
    try {
      const result=await gardenPostAction("gardenCheck",{
        id:own.id,ownerToken:own.ownerToken||"",sessionToken:playerAccountSessionToken()||"",
        expectedFrame:Number(frame),answer:String(answer)
      });
      if (!result || !result.ok) throw new Error(result&&result.error?result.error:"Nie udało się zapisać odpowiedzi.");
      gardenPendingPhase=null;
      if (status) status.textContent=answer==="YES"?"✅ Zapisano zgodność etapu.":"✅ Zapisano niezgodność etapu.";
      await gardenFetchData({force:true});
      const updatedOwn=gardenOwnExperimentForPlot(gardenSelectedPlot);
      const checkCount=updatedOwn ? gardenCheckStats(updatedOwn,gardenPhaseSummary(updatedOwn)).checks.length : 0;
      achievementTrack(["garden_check",checkCount>=3?"garden_checks_three":""].filter(Boolean));
    } catch(err) {
      if (gardenPendingPhase && gardenPendingPhase.eventId===pendingEventId) {
        gardenPendingPhase=null;
        gardenData={...gardenData,phases:(gardenData.phases||[]).filter(event=>String(event.eventId||"")!==pendingEventId)};
        gardenRenderPlots();
        gardenRenderEditor();
      }
      if (status) status.textContent=`❌ ${err&&err.message?err.message:"Błąd zapisu odpowiedzi."}`;
    } finally {
      clearTimeout(releaseTimer);
      releaseOverlay();
    }
  }

  async function gardenRecordPhase(atlasFrame,correction=false) {
    const own=gardenOwnExperimentForPlot(gardenSelectedPlot);
    if (!own) return;
    const status=el("garden-action-status");
    const observedAt=Date.now();
    const pendingEventId=`local-phase-${observedAt}-${Math.random().toString(36).slice(2)}`;
    gardenPendingPhase={experimentId:String(own.id),eventId:pendingEventId,eventType:"FRAME",atlasFrame:Number(atlasFrame),observedAt};
    gardenData={...gardenData,phases:[...(gardenData.phases||[]),gardenPendingPhase]};
    gardenRenderPlots();
    gardenRenderEditor();
    criticalOperationStart("🌿 Zapisuję etap…","Dopisuję obserwację do historii faz. Poprzednie raporty nie są nadpisywane.");
    // Zapis fazy nie zmienia samej uprawy — jest tylko obserwacją pomocniczą.
    // Po krótkim potwierdzeniu wysyłki zwalniamy interfejs, a bezpieczne
    // oczekiwanie na ten sam nonce trwa dalej w tle tej funkcji.
    let overlayReleased=false;
    const releaseOverlay=()=>{
      if (overlayReleased) return;
      overlayReleased=true;
      criticalOperationFinish();
    };
    const releaseTimer=setTimeout(()=>{
      if (status) status.textContent="⌛ Zapis etapu trwa w tle — możesz dalej korzystać z Ogrodu.";
      releaseOverlay();
    },700);
    try {
      let result=await gardenPostAction("gardenPhase",{
        id:own.id,ownerToken:own.ownerToken||"",sessionToken:playerAccountSessionToken()||"",
        eventType:"FRAME",atlasFrame:Number(atlasFrame),correction:correction?"1":"0",observedAtMs:observedAt
      });
      if (result && result.correctionRequired && !correction) {
        criticalOperationFinish();
        const accepted=window.confirm(`${result.error||"Wybrano wcześniejszy etap."}\n\nZapisać to jako korektę poprzedniego raportu? Historia pozostanie zachowana.`);
        if (!accepted) return;
        criticalOperationStart("🌿 Zapisuję korektę…","Dopisuję oznaczoną korektę do append-only historii faz.");
        result=await gardenPostAction("gardenPhase",{
          id:own.id,ownerToken:own.ownerToken||"",sessionToken:playerAccountSessionToken()||"",
          eventType:"FRAME",atlasFrame:Number(atlasFrame),correction:"1",observedAtMs:observedAt
        });
      }
      if (!result || !result.ok) throw new Error(result&&result.error?result.error:"Nie udało się zapisać etapu.");
      gardenPendingPhase=null;
      if (status) status.textContent=result.correction?`✅ Zapisano korektę: etap ${gardenDisplayStage(atlasFrame)}.`:`✅ Zapisano obserwację: etap ${gardenDisplayStage(atlasFrame)}.`;
      await gardenFetchData({force:true});
    } catch(err) {
      if (gardenPendingPhase && gardenPendingPhase.eventId===pendingEventId) {
        gardenPendingPhase=null;
        gardenData={...gardenData,phases:(gardenData.phases||[]).filter(event=>String(event.eventId||"")!==pendingEventId)};
        gardenRenderPlots();
        gardenRenderEditor();
      }
      if (status) status.textContent=`❌ ${err&&err.message?err.message:"Błąd zapisu etapu."}`;
    } finally {
      clearTimeout(releaseTimer);
      releaseOverlay();
    }
  }

  async function gardenRecordReady() {
    const own=gardenOwnExperimentForPlot(gardenSelectedPlot);
    if (!own) return;
    const status=el("garden-action-status");
    if (!window.confirm("Potwierdzić timestamp: gra pokazuje „Gotowe do zbioru”? READY jest zapisywane niezależnie od klatki 9 i od późniejszego zbioru.")) return;
    const observedAt=Date.now();
    const pendingEventId=`local-ready-${observedAt}-${Math.random().toString(36).slice(2)}`;
    gardenPendingPhase={experimentId:String(own.id),eventId:pendingEventId,eventType:"READY",observedAt};
    gardenData={...gardenData,phases:[...(gardenData.phases||[]),gardenPendingPhase]};
    gardenRenderPlots();
    gardenRenderEditor();
    criticalOperationStart("✅ Zapisuję READY…","Zapisuję moment, w którym gra pokazała gotowość do zbioru.");
    let overlayReleased=false;
    const releaseOverlay=()=>{
      if (overlayReleased) return;
      overlayReleased=true;
      criticalOperationFinish();
    };
    const releaseTimer=setTimeout(()=>{
      if (status) status.textContent="⌛ READY zapisuje się w tle — możesz dalej korzystać z Ogrodu.";
      releaseOverlay();
    },700);
    try {
      const result=await gardenPostAction("gardenPhase",{
        id:own.id,ownerToken:own.ownerToken||"",sessionToken:playerAccountSessionToken()||"",
        eventType:"READY",observedAtMs:observedAt
      });
      if (!result || !result.ok) throw new Error(result&&result.error?result.error:"Nie udało się zapisać READY.");
      gardenPendingPhase=null;
      if (status) status.textContent="✅ Zapisano READY. Zbiór możesz zakończyć osobnym przyciskiem, gdy faktycznie zbierzesz roślinę.";
      await gardenFetchData({force:true});
    } catch(err) {
      if (gardenPendingPhase && gardenPendingPhase.eventId===pendingEventId) {
        gardenPendingPhase=null;
        gardenData={...gardenData,phases:(gardenData.phases||[]).filter(event=>String(event.eventId||"")!==pendingEventId)};
        gardenRenderPlots();
        gardenRenderEditor();
      }
      if (status) status.textContent=`❌ ${err&&err.message?err.message:"Błąd zapisu READY."}`;
    } finally {
      clearTimeout(releaseTimer);
      releaseOverlay();
    }
  }

  function gardenRenderPhaseTools(own) {
    const tools=el("garden-phase-tools");
    if (!tools) return;
    tools.hidden=!own;
    if (!own) return;
    const summary=gardenPhaseSummary(own);
    if (!gardenUsesAutoModel(own)) {
      tools.innerHTML=`<strong>🌿 Starszy pomiar</strong><div class="muted">Historia ręcznie zgłoszonych etapów pozostaje zachowana. Nowe odpowiedzi Tak/Nie działają dla nowych upraw automatycznych.</div>`;
      return;
    }
    const frame=gardenAutoFrame(own);
    const stage=gardenDisplayStage(frame);
    // Etap 1 jest potwierdzony samym udanym posadzeniem; pierwsza
    // sensowna obserwacja porównawcza zaczyna się od etapu 2.
    const canAskForCheck=frame>0 && frame<9;
    const check=canAskForCheck ? gardenCheckForFrame(summary,frame) : null;
    const sprite=gardenFrameSpriteHtml(frame,"garden-phase-sprite",own.plant);
    const stats=gardenCheckStats(own,summary);
    const report=frame===0
      ? `<div class="garden-phase-note">🌱 Etap 1 został potwierdzony przez posadzenie. Pierwsze pytanie pojawi się przy etapie 2.</div>`
      : frame===9
      ? `<div class="garden-phase-note">Etap 10 wygląda tak samo podczas dalszego wzrostu i przy gotowości. Zbierz roślinę dopiero, gdy gra pozwoli.</div>`
      : check
        ? `<div class="garden-phase-note">${check.answer==="YES"?"✅ Zapisano: etap się zgadza.":"↔️ Zapisano: etap się nie zgadza."} Jedna odpowiedź na etap wystarczy.</div>`
        : `<div class="garden-phase-question"><b>Czy w grze widzisz teraz etap ${stage}?</b><div class="garden-phase-answer-actions"><button type="button" class="primary-btn" data-garden-check="YES">✅ Tak</button><button type="button" class="secondary-btn" data-garden-check="NO">❌ Nie</button></div></div>`;
    tools.innerHTML=`<div class="garden-phase-head"><div><strong>🌿 Automatyczny etap ${stage}/10</strong><div class="muted">Model 52 h · kolejny etap za ${escapeHtml(gardenFormatDuration(Math.max(0,(frame+1)*GARDEN_AUTO_STAGE_MS-(Date.now()-Number(own.startedAt||0)))))}.</div></div><span class="chip">${stats.checks.length} raportów</span></div><div class="garden-auto-phase-visual">${sprite}</div>${report}<div class="muted garden-phase-note">Brak odpowiedzi nie obniża wyniku. Tak/Nie zapisujemy z czasem serwera.</div>`;
    tools.querySelectorAll("[data-garden-check]").forEach(button=>button.addEventListener("click",()=>{
      gardenRecordModelCheck(frame,String(button.dataset.gardenCheck||""));
    }));
  }

  function gardenObservedDuration(item) {
    const summary=gardenPhaseSummary(item);
    if (summary.ready && Number(summary.ready.observedAt)>Number(item.startedAt)) {
      return {duration:Number(summary.ready.observedAt)-Number(item.startedAt),source:"READY"};
    }
    if (Number(item.durationMs)>0) return {duration:Number(item.durationMs),source:"HARVEST"};
    return null;
  }

  function gardenObservationForModel(item) {
    if (gardenUsesAutoModel(item)) {
      const evidence=gardenEvidenceForResult(item);
      if (!evidence.duration) return null;

      // Późny zbiór bez obserwacji nie dowodzi wolnego wzrostu — gracz mógł
      // po prostu odebrać gotową roślinę później. Takiego wyniku nie używamy
      // do uczenia suwaków, dopóki nie mamy dowodu, że roślina nie była READY.
      if (!evidence.provenByDeadline && !evidence.provenSlow) return null;

      const reportWeight=Math.min(0.28,evidence.stats.checks.length*0.08);
      const agreementWeight=evidence.stats.agreement==null
        ? 0
        : Math.max(-0.16,Math.min(0.16,(evidence.stats.agreement-0.5)*0.32));
      const timeWeight=evidence.provenByDeadline ? 0.58 : 0.46;
      return {
        duration:evidence.duration,
        source:evidence.provenSlow ? "AUTO_PROVEN_SLOW" : "AUTO_HARVEST",
        weight:Math.max(0.25,Math.min(1,timeWeight+reportWeight+agreementWeight)),
        evidence
      };
    }

    const observed=gardenObservedDuration(item);
    if (!observed || !Number.isFinite(observed.duration) || observed.duration<=0) return null;

    // MANUAL ma mniejszą wiarygodność czasu startu. HARVEST bywa mocno
    // spóźniony, więc dostaje mniejszą wagę niż osobno zgłoszone READY.
    // Obie wartości nadal są górnym ograniczeniem rzeczywistego momentu
    // dojrzenia, a nie „prawdą co do sekundy”.
    const startWeight=String(item.startSource||"LIVE").toUpperCase()==="MANUAL" ? 0.65 : 1;
    const endWeight=observed.source==="READY" ? 1 : 0.78;
    return {
      duration:observed.duration,
      source:observed.source,
      weight:startWeight*endWeight
    };
  }

  function gardenBestCompletedCenter(plant) {
    const rows=(gardenData.results||[])
      .filter(item=>item.plant===plant)
      .map(item=>({item,obs:gardenObservationForModel(item)}))
      .filter(x=>x.obs&&x.obs.duration>0);

    rows.sort((a,b)=>
      a.obs.duration/Math.max(0.1,a.obs.weight) -
      b.obs.duration/Math.max(0.1,b.obs.weight)
    );
    return rows[0]||null;
  }

  function gardenRaceCenter(plant) {
    const grouped=new Map();
    (gardenData.active||[])
      .filter(item=>item.plant===plant)
      .forEach(item=>{
        const summary=gardenPhaseSummary(item);
        if (!summary.lastFrame || !summary.entryUpper) return;
        const frame=Number(summary.lastFrame.atlasFrame);
        if (!Number.isInteger(frame)) return;
        if (!grouped.has(frame)) grouped.set(frame,[]);
        grouped.get(frame).push({
          item,
          summary,
          upper:Math.max(0,Number(summary.entryUpper)-Number(item.startedAt||0)),
          weight:String(item.startSource||"LIVE").toUpperCase()==="MANUAL"?0.65:1
        });
      });

    // Do wyznaczania centrum używamy tylko grup, w których naprawdę można
    // porównać co najmniej dwie rośliny na TYM SAMYM frame. Nie porównujemy
    // frame 7 z frame 6 i nie zamieniamy numeru klatki na procent.
    const comparable=[...grouped.entries()]
      .filter(([,rows])=>rows.length>=2)
      .sort((a,b)=>b[1].length-a[1].length || b[0]-a[0]);
    if (!comparable.length) return null;

    const [frame,rows]=comparable[0];
    rows.sort((a,b)=>
      a.upper/Math.max(0.1,a.weight) -
      b.upper/Math.max(0.1,b.weight)
    );
    return {item:rows[0].item,frame,count:rows.length,source:"FRAME"};
  }

  function gardenCandidateIsActive(candidate) {
    const wanted=gardenComboKey(candidate);
    return (gardenData.active||[]).some(item=>gardenComboKey(item)===wanted);
  }

  function gardenHalton(index,base) {
    let f=1,result=0,i=Math.max(1,index);
    while(i>0){f/=base;result+=f*(i%base);i=Math.floor(i/base);} return result;
  }

  function gardenResearchDistance(a,b) {
    if (!a || !b) return Infinity;
    const ds=(Number(a.sun)-Number(b.sun))/25;
    const dw=(Number(a.water)-Number(b.water))/25;
    const dp=(Number(a.ph)-Number(b.ph))/2;
    return Math.sqrt(ds*ds+dw*dw+dp*dp);
  }

  function gardenNearestResearchDistance(candidate) {
    const rows=[]
      .concat(gardenData.active||[])
      .concat(gardenData.results||[])
      .filter(item=>item&&item.plant===candidate.plant);
    if (!rows.length) return Infinity;
    return Math.min(...rows.map(item=>gardenResearchDistance(candidate,item)));
  }

  function gardenKernelPrediction(candidate) {
    const rows=(gardenData.results||[])
      .filter(item=>item&&item.plant===candidate.plant)
      .map(item=>({item,obs:gardenObservationForModel(item)}))
      .filter(row=>row.obs);
    if (rows.length<3) return null;

    const bandwidth=0.9;
    const weighted=[];
    rows.forEach(row=>{
      const distance=gardenResearchDistance(candidate,row.item);
      const kernel=Math.exp(-0.5*(distance/bandwidth)*(distance/bandwidth));
      const weight=kernel*row.obs.weight;
      if (weight>0.015) weighted.push({
        duration:row.obs.duration,
        weight,
        distance,
        source:row.obs.source
      });
    });
    if (weighted.length<3) return null;

    const sw=weighted.reduce((sum,row)=>sum+row.weight,0);
    const sw2=weighted.reduce((sum,row)=>sum+row.weight*row.weight,0);
    const effectiveN=sw2>0 ? (sw*sw)/sw2 : 0;
    if (sw<=0 || effectiveN<2.2) return null;

    const predictedMs=weighted.reduce((sum,row)=>sum+row.weight*row.duration,0)/sw;
    const variance=weighted.reduce((sum,row)=>sum+row.weight*Math.pow(row.duration-predictedMs,2),0)/sw;
    const nearest=Math.min(...weighted.map(row=>row.distance));
    const uncertaintyMs=Math.sqrt(Math.max(0,variance)) + predictedMs*(0.06/Math.sqrt(Math.max(1,effectiveN))) + predictedMs*Math.min(0.25,nearest*0.08);
    const readySupport=weighted.filter(row=>row.source==="READY").length;

    let confidence="niska";
    if (effectiveN>=6 && nearest<=0.55 && uncertaintyMs/predictedMs<=0.18) confidence="wysoka";
    else if (effectiveN>=3.5 && nearest<=0.9 && uncertaintyMs/predictedMs<=0.30) confidence="średnia";

    return {
      predictedMs,
      uncertaintyMs,
      confidence,
      effectiveN,
      support:weighted.length,
      readySupport,
      nearest
    };
  }

  function gardenCandidatePool(mode,center,plant,n) {
    const pool=[];
    const push=(sun,water,ph)=>{
      const candidate={
        plant,
        sun:gardenClampValue(sun,0,100,1,60),
        water:gardenClampValue(water,0,100,1,50),
        ph:gardenClampValue(ph,0,14,0.1,7)
      };
      const keyValue=gardenComboKey(candidate);
      if (!pool.some(item=>gardenComboKey(item)===keyValue)) pool.push(candidate);
    };

    if (mode==="Zawężanie") {
      const offsets=[
        [4,0,0],[-4,0,0],[0,4,0],[0,-4,0],[0,0,0.2],[0,0,-0.2],
        [8,0,0],[-8,0,0],[0,8,0],[0,-8,0],[0,0,0.4],[0,0,-0.4],
        [6,-5,0.2],[-6,5,-0.2],[5,5,-0.3],[-5,-5,0.3],
        [10,-8,0],[-10,8,0],[8,0,0.4],[-8,0,-0.4]
      ];
      offsets.forEach(offset=>push(
        Number(center.sun)+offset[0],
        Number(center.water)+offset[1],
        Number(center.ph)+offset[2]
      ));
    } else {
      for (let k=0;k<64;k++) {
        const i=n+1+k;
        push(
          Math.round(gardenHalton(i,2)*100),
          Math.round(gardenHalton(i,3)*100),
          Number((gardenHalton(i,5)*14).toFixed(1))
        );
      }
    }
    return pool;
  }

  function gardenChooseModelCandidate(pool) {
    const candidates=pool
      .filter(candidate=>!gardenCandidateIsActive(candidate))
      .map(candidate=>({
        candidate,
        prediction:gardenKernelPrediction(candidate),
        novelty:gardenNearestResearchDistance(candidate)
      }));
    if (!candidates.length) return null;

    const predicted=candidates.filter(item=>item.prediction);
    if (!predicted.length) {
      return candidates.sort((a,b)=>b.novelty-a.novelty)[0];
    }

    const times=predicted.map(item=>item.prediction.predictedMs);
    const uncertainties=predicted.map(item=>item.prediction.uncertaintyMs);
    const minTime=Math.min(...times),maxTime=Math.max(...times);
    const minUnc=Math.min(...uncertainties),maxUnc=Math.max(...uncertainties);

    predicted.forEach(item=>{
      const quality=maxTime>minTime
        ? (maxTime-item.prediction.predictedMs)/(maxTime-minTime)
        : 0.5;
      const uncertainty=maxUnc>minUnc
        ? (item.prediction.uncertaintyMs-minUnc)/(maxUnc-minUnc)
        : 0.5;
      const novelty=Math.min(1,item.novelty/1.4);
      const nearDuplicatePenalty=item.novelty<0.22 ? 0.55 : item.novelty<0.38 ? 0.20 : 0;
      item.score=0.52*quality+0.30*uncertainty+0.18*novelty-nearDuplicatePenalty;
    });
    predicted.sort((a,b)=>b.score-a.score || b.novelty-a.novelty);
    return predicted[0];
  }

  function gardenExperimentalRecommendation(combo) {
    const plant=combo.plant||"Cebula";
    const completed=(gardenData.results||[]).filter(x=>x.plant===plant);
    const active=(gardenData.active||[]).filter(x=>x.plant===plant);
    const n=completed.length+active.length;
    const best=gardenBestCompletedCenter(plant);
    const race=gardenRaceCenter(plant);
    const center=best
      ? best.item
      : race
        ? race.item
        : {plant,sun:60,water:50,ph:7};

    // 1/7 ≈ 14.3% daje kontrolowaną replikację w środku uzgodnionego pasma
    // 10–20%. Pozostałe rekomendacje przeplatają eksplorację i zawężanie.
    const mode=n>0 && n%7===0
      ? "Kontrola / replikacja"
      : (completed.length>=3 && n%2===0 ? "Zawężanie" : "Eksploracja");

    if (mode==="Kontrola / replikacja") {
      const candidate={plant,sun:Number(center.sun),water:Number(center.water),ph:Number(center.ph)};
      const prediction=gardenKernelPrediction(candidate);
      const reason=best
        ? "Celowo powtarzamy obecnie najlepszy wariant z READY/HARVEST, żeby sprawdzić powtarzalność."
        : race
          ? `Celowo replikujemy lidera porównania na tym samym etapie ${race.frame}; frame nie jest procentem postępu.`
          : "Powtarzamy punkt kontrolny 60/50/7; to punkt startowy, nie uznane optimum.";
      return {mode,candidate,reason,best,race,count:n,prediction,replication:true};
    }

    const pool=gardenCandidatePool(mode,center,plant,n);
    const chosen=gardenChooseModelCandidate(pool) || {candidate:pool[0]||{plant,sun:60,water:50,ph:7},prediction:null,novelty:Infinity};
    let reason="";
    if (mode==="Zawężanie") {
      reason=chosen.prediction
        ? "Badamy sąsiedztwo aktualnego lidera, równoważąc przewidywany czas, niepewność modelu i karę za prawie-duplikaty."
        : "Badamy bliskie sąsiedztwo aktualnego lidera małym krokiem; danych jest jeszcze za mało na stabilną predykcję 3D.";
    } else {
      reason=chosen.prediction
        ? "Wybieramy informacyjny punkt 3D: model łączy obiecujący obszar z wysoką niepewnością i odległością od trwających prób."
        : "Wybieramy szeroko odległy punkt Haltona, żeby zdobyć nową informację zamiast kopiować bieżące próby.";
    }
    return {mode,candidate:chosen.candidate,reason,best,race,count:n,prediction:chosen.prediction||null,replication:false};
  }

  function gardenRenderRecommendation(own) {
    const host=el("garden-recommendation");
    if (!host) return;
    if (own) {host.hidden=true;host.innerHTML="";return;}
    const rec=gardenExperimentalRecommendation(gardenCurrentControls());
    const c=rec.candidate;
    host.hidden=false;
    const prediction=rec.prediction;
    const modelLine=prediction
      ? `<div class="garden-model-prediction">🧪 Lokalny model: przewidywany górny czas ~<b>${escapeHtml(gardenFormatDuration(prediction.predictedMs))}</b> · pewność ${escapeHtml(prediction.confidence)} · wsparcie ${Number(prediction.effectiveN).toLocaleString("pl-PL",{maximumFractionDigits:1})}</div>`
      : `<div class="garden-model-prediction muted">🧪 Za mało porównywalnych, wiarygodnych wyników — wybieramy test, który dostarczy nowej informacji.</div>`;
    host.innerHTML=`<strong>🔬 Polecany eksperyment — 🧪 Eksperymentalne</strong><div class="garden-recommendation-values">☀️ ${c.sun} · 💧 ${c.water} · pH ${Number(c.ph).toFixed(1)}</div><div><b>${escapeHtml(rec.mode)}</b> · ${escapeHtml(rec.reason)}</div>${modelLine}<div class="muted">Nowe pomiary uwzględniają czas zbioru, odpowiedzi Tak/Nie i ich regularność. Późny zbiór bez obserwacji nie jest traktowany jako wolny wzrost.</div><button type="button" class="secondary-btn" data-garden-use-recommendation>Ustaw te wartości</button>`;
    host.querySelector("[data-garden-use-recommendation]")?.addEventListener("click",()=>{
      if (el("garden-sun")) el("garden-sun").value=String(c.sun);
      if (el("garden-water")) el("garden-water").value=String(c.water);
      if (el("garden-ph")) el("garden-ph").value=Number(c.ph).toFixed(1);
      gardenSyncAllManualInputs(); gardenRenderComboStatus();
    });
  }

  function gardenRenderRace() {
    const host=el("garden-race");
    if (!host) return;
    const plants=[...new Set([
      ...(gardenData.plants||[]),
      ...(gardenData.results||[]).map(item=>String(item&&item.plant||"").trim()).filter(Boolean)
    ])];
    if (!plants.length) plants.push("Cebula");
    if (!plants.includes(gardenResultsSelectedPlant)) {
      const currentPlant=String(gardenCurrentControls().plant||"").trim();
      gardenResultsSelectedPlant=plants.includes(currentPlant) ? currentPlant : plants[0];
    }
    const tabs=`<div class="garden-result-tabs" role="tablist" aria-label="Roślina wyników">${plants.map(plant=>`<button type="button" class="garden-result-tab ${plant===gardenResultsSelectedPlant?"active":""}" data-garden-result-plant="${escapeHtml(plant)}" aria-pressed="${plant===gardenResultsSelectedPlant}">${escapeHtml(plant)}</button>`).join("")}</div>`;
    const groups=new Map();
    (gardenData.results||[]).filter(item=>String(item&&item.plant||"")===gardenResultsSelectedPlant).forEach(item=>{
      if (!item || !Number.isFinite(Number(item.durationMs)) || Number(item.durationMs)<=0) return;
      const key=gardenComboKey(item);
      const current=groups.get(key) || {item,times:[],latest:0};
      current.times.push(Number(item.durationMs));
      current.latest=Math.max(current.latest,Number(item.finishedAt)||0);
      groups.set(key,current);
    });
    const rows=[...groups.values()];
    if (!rows.length) {host.innerHTML=`${tabs}<div class="empty">Brak zakończonych pomiarów dla tej rośliny. Po pierwszym zbiorze wynik pojawi się tutaj.</div>`;host.querySelectorAll("[data-garden-result-plant]").forEach(button=>button.addEventListener("click",()=>{gardenResultsSelectedPlant=String(button.dataset.gardenResultPlant||"");gardenRenderRace();}));return;}

    rows.forEach(row=>{
      row.times.sort((a,b)=>a-b);
      row.fastest=row.times[0];
    });
    const resultSort=String(el("garden-race-sort")?.value||"time");
    rows.sort((a,b)=>{
      if (resultSort==="recent") return b.latest-a.latest || a.fastest-b.fastest;
      if (resultSort==="samples") return b.times.length-a.times.length || a.fastest-b.fastest;
      return a.fastest-b.fastest || b.times.length-a.times.length;
    });

    host.innerHTML=`${tabs}<div class="garden-race-list">${rows.map((row,index)=>{
      const item=row.item;
      const times=row.times.map(time=>escapeHtml(gardenFormatDuration(time))).join(" · ");
      const summary=row.times.length===1
        ? "1 zgłoszony zbiór"
        : `${row.times.length} zgłoszone zbiory · najkrótszy zapis ${escapeHtml(gardenFormatDuration(row.fastest))}`;
      const label=index===0&&resultSort==="time" ? "najkrótszy zapis" : `${row.times.length} ${row.times.length===1?"zbiór":"zbiory"}`;
      return `<div class="garden-race-row ${index===0&&resultSort==="time"?"leader":""}"><div class="garden-race-main"><strong>${escapeHtml(item.plant)} · ☀️${item.sun}% 💧${item.water}% pH ${Number(item.ph).toFixed(1)}</strong><div class="garden-race-meta"><span>${summary}</span><span class="garden-result-times">czas${row.times.length===1?"":"y"} zbioru: ${times}</span></div></div><span class="garden-race-label">${escapeHtml(label)}</span></div>`;
    }).join("")}</div>`;
    host.querySelectorAll("[data-garden-result-plant]").forEach(button=>button.addEventListener("click",()=>{
      gardenResultsSelectedPlant=String(button.dataset.gardenResultPlant||"");
      gardenRenderRace();
    }));
  }


  function gardenRenderPlots() {
    const host = el("garden-plots");
    if (!host) return;

    gardenLastPlotStateSignature=(gardenData.active || [])
      .map(item=>{
        const summary=gardenPhaseSummary(item);
        return `${item.id}:${gardenDisplayFrame(item,summary)}:${gardenNeedsModelCheck(item,summary) ? 1 : 0}`;
      }).join("|");

    host.innerHTML = [1,2,3,4].map(plot => {
      const active = gardenOwnExperimentForPlot(plot);
      const summary = active ? gardenPhaseSummary(active) : null;
      const growingFor = active
        ? gardenFormatDuration(Date.now()-Number(active.startedAt || 0))
        : "";
      const stats = active
        ? `<span class="garden-plot-stats">
             <span>☀️ ${Number(active.sun)}%</span>
             <span>💧 ${Number(active.water)}%</span>
             <span>🧪 ${Number(active.ph).toFixed(1)}</span>
           </span>
           <span class="garden-plot-time">⏱️ ${escapeHtml(growingFor)}</span>`
        : "";
      const frame = active ? gardenDisplayFrame(active,summary) : null;
      const sprite = frame !== null ? gardenFrameSpriteHtml(frame,"garden-plot-sprite",active.plant) : "";
      const frameBadge = "";
      const needsCheck=active && gardenNeedsModelCheck(active,summary);

      return `
        <button type="button" class="garden-plot ${active ? "growing" : "empty"} ${plot===gardenSelectedPlot ? "active" : ""}" data-garden-plot="${plot}">
          <span class="garden-plot-visual">
            ${sprite}
            ${frameBadge}
            ${stats}
          </span>
          ${needsCheck?'<span class="build-setup-attention garden-plot-attention" aria-label="Czeka pytanie Tak lub Nie">!</span>':""}
          <span class="garden-plot-name">Grządka ${plot}</span>
          <span class="garden-plot-meta">${active ? `${escapeHtml(active.plant)} · ${frame===null?"bez etapu":`etap ${gardenDisplayStage(frame)}`}` : "Pusta"}</span>
        </button>`;
    }).join("");

    host.querySelectorAll("[data-garden-plot]").forEach(button => {
      button.addEventListener("click",()=>{
        gardenSelectedPlot = Number(button.dataset.gardenPlot) || 1;
        gardenRenderPlots();
        gardenRenderEditor();
      });
    });
  }

  function gardenMedian(values) {
    const sorted = (values || [])
      .map(Number)
      .filter(Number.isFinite)
      .sort((a,b)=>a-b);
    if (!sorted.length) return 0;
    const mid = Math.floor(sorted.length/2);
    return sorted.length % 2
      ? sorted[mid]
      : (sorted[mid-1]+sorted[mid])/2;
  }

  function gardenDirectionForDimension(combo,dimension) {
    const rows = (gardenData.results || [])
      .filter(item => item && item.plant === combo.plant)
      .map(item => ({item,obs:gardenObservationForModel(item)}))
      .filter(row => row.obs);

    // Przy kilku pierwszych pomiarach nie udajemy, że znamy optimum.
    if (rows.length < 5) {
      return {direction:"unknown",strength:"",count:rows.length};
    }

    const ranges = {sun:100,water:100,ph:14};
    const other = ["sun","water","ph"].filter(key => key !== dimension);
    const range = ranges[dimension];
    const weighted = [];

    rows.forEach(row => {
      const item=row.item;
      const x = Number(item[dimension]);
      const y = Number(row.obs.duration);
      if (!Number.isFinite(x) || !Number.isFinite(y) || y <= 0) return;

      // Porównania najbardziej podobne w pozostałych dwóch parametrach
      // dostają największą wagę. Dzięki temu np. zmiana pH nie jest
      // mylona z dużą zmianą podlewania.
      let otherDistanceSq = 0;
      other.forEach(key => {
        const diff = (Number(item[key]) - Number(combo[key])) / ranges[key];
        otherDistanceSq += diff*diff;
      });

      const targetDiff = Math.abs(x-Number(combo[dimension]))/range;
      const sourceWeight = Number(row.obs.weight) || 0.5;
      const weight = Math.exp(-10*otherDistanceSq) * Math.exp(-1.5*targetDiff) * sourceWeight;
      if (weight > 0.015) weighted.push({x:x/range,y,w:weight});
    });

    if (weighted.length < 4) {
      return {direction:"unknown",strength:"",count:weighted.length};
    }

    const sw = weighted.reduce((s,p)=>s+p.w,0);
    const sw2 = weighted.reduce((s,p)=>s+p.w*p.w,0);
    const effectiveN = sw2 > 0 ? (sw*sw)/sw2 : 0;
    if (sw <= 0 || effectiveN < 3.2) {
      return {direction:"unknown",strength:"",count:Math.round(effectiveN)};
    }

    const mx = weighted.reduce((s,p)=>s+p.w*p.x,0)/sw;
    const my = weighted.reduce((s,p)=>s+p.w*p.y,0)/sw;
    let varX=0,varY=0,cov=0;
    weighted.forEach(p=>{
      const dx=p.x-mx;
      const dy=p.y-my;
      varX += p.w*dx*dx;
      varY += p.w*dy*dy;
      cov += p.w*dx*dy;
    });

    if (varX < 0.001 || varY <= 0) {
      return {direction:"unknown",strength:"",count:Math.round(effectiveN)};
    }

    const slope = cov/varX; // ms zmiany czasu na pełny zakres suwaka
    const corr = cov/Math.sqrt(varX*varY);
    const typical = gardenMedian(weighted.map(p=>p.y)) || my;
    const effect10 = typical > 0 ? Math.abs(slope)*0.10/typical : 0;

    // Kierunek pokazujemy dopiero, gdy zależność ma sensowną siłę.
    if (!Number.isFinite(corr) || Math.abs(corr) < 0.18 || effect10 < 0.01) {
      return {direction:"unknown",strength:"",count:Math.round(effectiveN)};
    }

    // Dodatni slope = większa wartość wydłuża czas -> idź w dół.
    const direction = slope < 0 ? "more" : "less";
    const confidence = Math.min(1,effectiveN/10) *
      Math.min(1,Math.abs(corr)/0.55) *
      Math.min(1,effect10/0.05);

    let strength = "słaba";
    if (confidence >= 0.62) strength = "mocna";
    else if (confidence >= 0.34) strength = "średnia";

    return {
      direction,
      strength,
      count:Math.round(effectiveN),
      correlation:Math.abs(corr),
      effect10
    };
  }

  function gardenAdviceHtml(combo) {
    const configs = [
      ["sun","☀️ Nasłonecznienie"],
      ["water","💧 Podlewanie"],
      ["ph","🧪 pH"]
    ];
    const completed = (gardenData.results || []).filter(item =>
      item && item.plant === combo.plant && Boolean(gardenObservationForModel(item))
    ).length;

    const rows = configs.map(([key,label]) => {
      const advice = gardenDirectionForDimension(combo,key);
      if (advice.direction === "more") {
        return `<div class="garden-advice-row"><span>${label}</span><strong class="garden-advice-more">więcej →</strong><small>${escapeHtml(advice.strength)} wskazówka</small></div>`;
      }
      if (advice.direction === "less") {
        return `<div class="garden-advice-row"><span>${label}</span><strong class="garden-advice-less">← mniej</strong><small>${escapeHtml(advice.strength)} wskazówka</small></div>`;
      }
      return `<div class="garden-advice-row"><span>${label}</span><strong>?</strong><small>za mało danych</small></div>`;
    }).join("");

    return `
      <div class="garden-advice">
        <div class="garden-advice-title">📊 Kierunek z dotychczasowych badań</div>
        ${rows}
        <div class="garden-advice-note">Na podstawie ${completed} zakończonych ${completed===1 ? "badania" : "badań"} tej rośliny. Tool nie zgaduje optimum — wskazówki zmieniają się wraz z wynikami graczy.</div>
      </div>`;
  }

  function gardenRenderComboStatus() {
    const box = el("garden-combo-status");
    const start = el("garden-start");
    if (!box || !start) return;

    const own = gardenOwnExperimentForPlot(gardenSelectedPlot);
    if (own) return;

    const combo = gardenCurrentControls();
    const result = gardenLatestResultFor(combo);
    const active = gardenActiveFor(combo);
    const lines = [];

    if (result) {
      const manualHint = String(result.startSource || "").toUpperCase() === "MANUAL"
        ? ` <small class="garden-manual-hint">🟡 start wpisany ręcznie</small>`
        : "";
      if (gardenUsesAutoModel(result)) {
        const evidence=gardenEvidenceForResult(result);
        const quality=`${evidence.stats.checks.length} raportów · pewność ${evidence.confidence}`;
        if (evidence.provenByDeadline) {
          lines.push(`<div class="garden-known">✅ Zbiór do 56 h: ${escapeHtml(gardenFormatDuration(evidence.duration))} · ${escapeHtml(quality)}${manualHint}</div>`);
        } else if (evidence.provenSlow) {
          lines.push(`<div class="garden-known">↔️ Potwierdzona wolniejsza uprawa: zbiór ${escapeHtml(gardenFormatDuration(evidence.duration))} · ${escapeHtml(quality)}</div>`);
        } else {
          lines.push(`<div class="garden-known">🕒 Późny zbiór: ${escapeHtml(gardenFormatDuration(evidence.duration))} · READY mógł nastąpić wcześniej, więc wynik nie obniża rankingu.</div>`);
        }
      } else {
        const observed = gardenObservedDuration(result);
        const observedDuration = observed && Number(observed.duration) > 0
          ? Number(observed.duration)
          : Number(result.durationMs) || 0;
        const observedLabel = observed && observed.source === "READY"
          ? "Czas wg READY"
          : "Czas do zbioru (HARVEST)";
        lines.push(`<div class="garden-known">✅ ${observedLabel}: ${escapeHtml(gardenFormatDuration(observedDuration))}${manualHint}</div>`);
      }
    } else {
      lines.push(`<div>🔬 Brak zapisanego wyniku dla tych ustawień.</div>`);
    }

    lines.push(gardenAdviceHtml(combo));

    if (active.length) {
      active.forEach(item => {
        lines.push(`<div class="garden-reserved">🌱 ${escapeHtml(item.nick)} bada to ustawienie · trwa ${escapeHtml(gardenFormatDuration(Date.now()-Number(item.startedAt || 0)))}</div>`);
      });
      start.textContent = "⚠️ Zacznij mimo rezerwacji";
    } else {
      lines.push(`<div>🟢 Nikt aktualnie nie bada tej kombinacji.</div>`);
      start.textContent = "🌱 Zacznij uprawę";
    }

    box.innerHTML = lines.join("");
    start.disabled = !gardenDataLoaded;
  }

  function gardenRenderEditor() {
    const editor = el("garden-editor");
    if (!editor) return;
    editor.hidden = false;

    const own = gardenOwnExperimentForPlot(gardenSelectedPlot);
    el("garden-editor-title").textContent = `Grządka ${gardenSelectedPlot}`;
    const ownPhaseSummary = own ? gardenPhaseSummary(own) : null;
    el("garden-editor-mode").textContent = own
      ? (gardenUsesAutoModel(own) ? `etap ${gardenDisplayStage(gardenAutoFrame(own))}/10` : "starszy pomiar")
      : "pusta";

    const controls = [
      el("garden-plant"),el("garden-sun"),el("garden-water"),el("garden-ph"),
      el("garden-sun-input"),el("garden-water-input"),el("garden-ph-input")
    ];
    controls.forEach(control => { if (control) control.disabled = Boolean(own); });

    if (own) {
      el("garden-plant").value = own.plant;
      el("garden-sun").value = String(own.sun);
      el("garden-water").value = String(own.water);
      el("garden-ph").value = Number(own.ph).toFixed(1);
      gardenSyncAllManualInputs();
    }

    el("garden-start").hidden = Boolean(own);
    el("garden-finish").hidden = !own;
    el("garden-cancel").hidden = !own;
    el("garden-active-time").hidden = !own;
    gardenRefreshStartTimeControls();

    if (own) {
      const startHint = String(own.startSource || "").toUpperCase() === "MANUAL"
        ? `<div class="garden-start-source-manual">🟡 Start uprawy został wpisany ręcznie.</div>`
        : "";
      el("garden-combo-status").innerHTML =
        `<div class="garden-reserved">🌱 ${escapeHtml(own.plant)} · ☀️ ${own.sun}% · 💧 ${own.water}% · pH ${Number(own.ph).toFixed(1)}</div>${startHint}`;
      gardenUpdateClock();
    } else {
      gardenRenderComboStatus();
    }

    gardenRenderPhaseTools(own);
    gardenRenderRecommendation(own);
  }

  function gardenUpdateClock() {
    const box = el("garden-active-time");
    if (!box || box.hidden) return;
    const own = gardenOwnExperimentForPlot(gardenSelectedPlot);
    if (!own) return;
    const age=Math.max(0,Date.now()-Number(own.startedAt || 0));
    if (gardenUsesAutoModel(own)) {
      const frame=gardenAutoFrame(own);
      const stats=gardenCheckStats(own,gardenPhaseSummary(own));
      box.textContent=`⏱️ Rośnie już: ${gardenFormatDuration(age)} · model: etap ${gardenDisplayStage(frame)}/10 · raporty ${stats.yes.length} Tak / ${stats.no.length} Nie`;
      gardenRenderPhaseTools(own);
      const plotState=(gardenData.active || []).map(item=>{
        const summary=gardenPhaseSummary(item);
        return `${item.id}:${gardenDisplayFrame(item,summary)}:${gardenNeedsModelCheck(item,summary) ? 1 : 0}`;
      }).join("|");
      if (plotState !== gardenLastPlotStateSignature) gardenRenderPlots();
    } else {
      box.textContent = `⏱️ Starszy pomiar trwa: ${gardenFormatDuration(age)}`;
    }
  }

  async function gardenFetchData(options={}) {
    const payload = await jsonp("gardenData",{
      sessionToken:playerAccountSessionToken() || ""
    });
    if (!payload || !payload.ok) {
      if (payload && payload.authRequired) {
        await showModuleAccountGate("garden");
        return false;
      }
      throw new Error(payload && payload.error ? payload.error : "Nie udało się pobrać Ogrodu.");
    }
    const serverPhases=Array.isArray(payload.phases) ? payload.phases : [];
    const phases=gardenPendingPhase
      ? [...serverPhases.filter(event=>String(event.eventId||"")!==gardenPendingPhase.eventId),gardenPendingPhase]
      : serverPhases;
    const nextGardenData = {
      plants:Array.isArray(payload.plants) ? payload.plants : ["Cebula"],
      active:Array.isArray(payload.active) ? payload.active : [],
      results:Array.isArray(payload.results) ? payload.results : [],
      phases
    };
    // Odpowiedź Ogrodu przychodzi cyklicznie, często bez żadnej zmiany.
    // Nie przebudowujemy wtedy plotów i edytora, bo resetuje to wybór fazy
    // oraz niepotrzebnie obciąża telefon. Zegar aktualizuje się osobno.
    const nextSignature = JSON.stringify(nextGardenData);
    const changed = nextSignature !== gardenLastRenderSignature;
    gardenData = nextGardenData;
    gardenDataLoaded = true;
    if (changed) {
      gardenLastRenderSignature = nextSignature;
      gardenRenderPlots();
      gardenRenderEditor();
      gardenRenderRace();
    }
    return true;
  }

  async function gardenResolveNick() {
    const accountNick = cachedAccountNick();
    if (accountNick) return accountNick;
    const saved = localStorage.getItem(NICK_KEY) || "";
    const entered = window.prompt("Podaj nick, do którego przypisać tę uprawę:",saved);
    if (entered === null) return "";
    const nick = String(entered || "").trim();
    if (nick) localStorage.setItem(NICK_KEY,nick);
    return nick;
  }

  async function gardenStartCultivation() {
    const button = el("garden-start");
    const status = el("garden-action-status");
    if (!button || button.disabled) return;

    const nick = await gardenResolveNick();
    if (!nick) return;

    // Ostatnie zabezpieczenie przed wysłaniem: nawet jeśli telefon nie zdążył
    // wywołać blur/change, bierzemy dokładnie wartości widoczne w polach.
    gardenCommitAllManualInputs();
    const combo = gardenCurrentControls();
    // Nowe badania startują wyłącznie od czasu potwierdzonego przez backend.
    // Dzięki temu porównanie automatycznych etapów nie zależy od ręcznej daty.
    const timing = {startMode:"now"};

    button.disabled = true;
    if (status) status.textContent = "⏳ Sprawdzam i rozpoczynam uprawę…";

    const request = async forceDuplicate => gardenPostAction("gardenStart",{
      ...combo,
      plot:gardenSelectedPlot,
      nick,
      ...timing,
      modelVersion:GARDEN_AUTO_MODEL_VERSION,
      sessionToken:playerAccountSessionToken() || "",
      forceDuplicate:forceDuplicate ? "1" : "0"
    });

    let overlayActive = false;
    const showStartOverlay = () => {
      if (overlayActive) return;
      criticalOperationStart(
        "🌱 Rozpoczynam uprawę…",
        "Zapisuję rezerwację i przygotowuję grządkę. Poczekaj, aż pojawi się sadzonka."
      );
      overlayActive = true;
    };
    const hideStartOverlay = () => {
      if (!overlayActive) return;
      criticalOperationFinish();
      overlayActive = false;
    };

    try {
      showStartOverlay();
      let result = await request(false);

      if (result && result.duplicate) {
        // Najpierw pokazujemy aktualną rezerwację, a dopiero potem pozwalamy
        // użytkownikowi świadomie rozpocząć duplikat.
        const active = Array.isArray(result.active) ? result.active : [];
        gardenData.active = [
          ...(gardenData.active || []).filter(item => gardenComboKey(item)!==gardenComboKey(combo)),
          ...active
        ];
        gardenRenderComboStatus();
        hideStartOverlay();

        const who = active.map(item=>item.nick).filter(Boolean).join(", ") || "Inny gracz";
        const accepted = window.confirm(`${who} bada już to ustawienie.\n\nInformacja o rezerwacji jest pokazana nad przyciskiem. Czy mimo to chcesz rozpocząć własną uprawę?`);
        if (!accepted) {
          if (status) status.textContent = "";
          return;
        }

        showStartOverlay();
        result = await request(true);
      }

      if (!result || !result.ok) {
        throw new Error(result && result.error ? result.error : "Nie udało się rozpocząć uprawy.");
      }

      gardenSetLocalPlot(gardenSelectedPlot,{
        id:result.experiment.id,
        ownerToken:result.ownerToken || ""
      });
      if (status) status.textContent = "";

      // Overlay znika dopiero po ponownym pobraniu danych i wyrenderowaniu
      // stanu „rośnie”, dzięki czemu nie da się kliknąć drugi raz zanim
      // użytkownik zobaczy sadzonkę.
      await gardenFetchData({force:true});
      if (status) status.textContent = "✅ Posadzono. Narzędzie pokazuje etap 1 i będzie zmieniać go automatycznie.";
      achievementTrack([/ziemniak/i.test(combo.plant)?"garden_plant_potato":"garden_plant_onion"]);
      gardenRenderPlots();
      gardenRenderEditor();
    } catch (err) {
      if (status) status.textContent = `❌ ${err && err.message ? err.message : "Błąd."}`;
    } finally {
      hideStartOverlay();
      gardenRenderComboStatus();
    }
  }

  async function gardenFinishCultivation() {
    const own = gardenOwnExperimentForPlot(gardenSelectedPlot);
    if (!own) return;
    if (!window.confirm("Potwierdź, że roślina w grze już wyrosła i została zebrana.")) return;

    const status = el("garden-action-status");
    if (status) status.textContent = "⏳ Zapisuję czas wzrostu…";

    criticalOperationStart(
      "🧺 Zapisuję zbiór…",
      "Zapisuję czas wzrostu i odświeżam grządkę. Poczekaj na zakończenie operacji."
    );

    try {
      const result = await gardenPostAction("gardenFinish",{
        id:own.id,
        ownerToken:own.ownerToken || "",
        sessionToken:playerAccountSessionToken() || ""
      });
      if (!result || !result.ok) throw new Error(result && result.error ? result.error : "Nie udało się zapisać wyniku.");
      gardenSetLocalPlot(gardenSelectedPlot,null);
      if (status) status.textContent = `✅ Zapisano wynik: ${gardenFormatDuration(result.durationMs)}.`;
      await gardenFetchData({force:true});
      if (Number(result.durationMs)>=40*60*60*1000) achievementTrack([/ziemniak/i.test(own.plant)?"garden_harvest_potato":"garden_harvest_onion"]);
      gardenRenderPlots();
      gardenRenderEditor();
    } catch (err) {
      if (status) status.textContent = `❌ ${err && err.message ? err.message : "Błąd."}`;
    } finally {
      criticalOperationFinish();
    }
  }

  async function gardenCancelCultivation() {
    const own = gardenOwnExperimentForPlot(gardenSelectedPlot);
    if (!own) return;
    if (!window.confirm("Anulować tę uprawę? Nie zostanie zapisana jako wynik.")) return;

    const status = el("garden-action-status");
    if (status) status.textContent = "⏳ Anuluję uprawę…";

    criticalOperationStart(
      "🗑️ Anuluję uprawę…",
      "Usuwam aktywną rezerwację i odświeżam grządkę. Poczekaj na zakończenie operacji."
    );

    try {
      const result = await gardenPostAction("gardenCancel",{
        id:own.id,
        ownerToken:own.ownerToken || "",
        sessionToken:playerAccountSessionToken() || ""
      });
      if (!result || !result.ok) throw new Error(result && result.error ? result.error : "Nie udało się anulować uprawy.");
      gardenSetLocalPlot(gardenSelectedPlot,null);
      if (status) status.textContent = "✅ Uprawa anulowana.";
      await gardenFetchData({force:true});
      gardenRenderPlots();
      gardenRenderEditor();
    } catch (err) {
      if (status) status.textContent = `❌ ${err && err.message ? err.message : "Błąd."}`;
    } finally {
      criticalOperationFinish();
    }
  }

  async function gardenLiveRefresh() {
    if (activeToolModule !== "garden") return false;
    if (gardenLiveRefreshInFlight) return gardenLiveRefreshInFlight;

    gardenLiveRefreshInFlight = gardenFetchData({force:true})
      .catch(err => {
        console.warn("Ogród — odświeżenie na żywo:",err);
        return false;
      })
      .finally(() => {
        gardenLiveRefreshInFlight = null;
      });

    return gardenLiveRefreshInFlight;
  }

  function setupGarden() {
    if (!el("garden-plots")) return;

    ["sun","water","ph"].forEach(kind => {
      const range = el(`garden-${kind}`);
      const input = el(`garden-${kind}-input`);

      range?.addEventListener("input",()=>{
        gardenSyncManualInput(kind,"range");
        if (kind === "water") gardenTrackWaterEasterEgg(range.value);
        gardenRenderEditor();
      });
      range?.addEventListener("change",()=>{
        gardenSyncManualInput(kind,"range");
        gardenRenderEditor();
      });

      // Pole ręczne i suwak są synchronizowane natychmiast po każdym znaku.
      input?.addEventListener("input",()=>{
        gardenSyncManualInputLive(kind);
      });
      input?.addEventListener("change",()=>{
        gardenSyncManualInput(kind,"input");
        gardenRenderComboStatus();
      });
      input?.addEventListener("blur",()=>{
        gardenSyncManualInput(kind,"input");
        gardenRenderComboStatus();
      });
      input?.addEventListener("keydown",event=>{
        if (["-","+","e","E"].includes(event.key)) {
          event.preventDefault();
          return;
        }
        if (kind !== "ph" && [".",","].includes(event.key)) {
          event.preventDefault();
          return;
        }
        if (event.key !== "Enter") return;
        event.preventDefault();
        gardenSyncManualInput(kind,"input");
        gardenRenderComboStatus();
        input.blur();
      });
    });

    el("garden-plant")?.addEventListener("input",gardenRenderEditor);
    el("garden-plant")?.addEventListener("change",gardenRenderEditor);

    [el("garden-start-now"),el("garden-start-earlier")].forEach(radio => {
      radio?.addEventListener("change",()=>{
        gardenRefreshStartTimeControls();
        const status = el("garden-action-status");
        if (status) status.textContent = "";
      });
    });
    el("garden-start-datetime")?.addEventListener("change",()=>{
      const input = el("garden-start-datetime");
      if (!input) return;
      input.max = gardenLocalDateTimeValue(Date.now());
      if (input.value && new Date(input.value).getTime() > Date.now()) {
        input.value = input.max;
      }
    });

    el("garden-start")?.addEventListener("click",gardenStartCultivation);
    el("garden-finish")?.addEventListener("click",gardenFinishCultivation);
    el("garden-cancel")?.addEventListener("click",gardenCancelCultivation);
    el("garden-open-phase-picker")?.addEventListener("click",()=>{
      const picker=el("garden-phase-picker");
      if (picker) picker.hidden=!picker.hidden;
    });
    el("garden-race-sort")?.addEventListener("change",gardenRenderRace);
    el("garden-ready")?.addEventListener("click",gardenRecordReady);
    gardenRenderPlots();
    gardenRenderEditor();

  }

  async function openGardenModule() {
    if (!gardenDataLoaded) {
      showModuleLoading("garden","🌱 Ładowanie Ogrodu…","Pobieram aktywne uprawy, rezerwacje i zapisane wyniki.");
    }

    if (!(await ensureModuleAccess("garden",{force:false}))) return;

    // Przy ponownym wejściu nie chowamy działającego Ogrodu za loaderem.
    // Pokazujemy ostatni stan od razu, a świeże dane dociągamy w tle.
    if (gardenDataLoaded) {
      showToolView("garden-view","garden");
      gardenRenderPlots();
      gardenRenderEditor();

      if (!moduleOpenInFlight.garden) {
        moduleOpenInFlight.garden = gardenFetchData({force:true});
        moduleOpenInFlight.garden
          .catch(err => {
            console.warn("Nie udało się odświeżyć Ogrodu w tle:",err);
          })
          .finally(() => {
            moduleOpenInFlight.garden = null;
          });
      }
      return;
    }

    if (!moduleOpenInFlight.garden) {
      moduleOpenInFlight.garden = gardenFetchData({force:true});
    }
    try {
      const ok = await moduleOpenInFlight.garden;
      if (!ok) return;
    } finally {
      moduleOpenInFlight.garden = null;
    }

    showToolView("garden-view","garden");
    gardenRenderPlots();
    gardenRenderEditor();

  }

  async function openBuildModule() {
    if (!buildListsLoaded) {
      showModuleLoading(
        "builds",
        "🛠 Ładowanie Buildów...",
        "Pobieram aktualne publiczne buildy i dane Twojego konta."
      );
    }

    if (
      !(await ensureModuleAccess(
        "builds",
        {force:false}
      ))
    ) {
      return;
    }

    // Lista już istnieje: pokaż ją natychmiast i odśwież po cichu.
    if (buildListsLoaded) {
      showToolView("builds-view","builds");
      renderBuildAccountState();
      renderBuildLists();

      if (!moduleOpenInFlight.builds) {
        moduleOpenInFlight.builds = fetchBuildLists(true);
        moduleOpenInFlight.builds
          .catch(err => {
            console.warn("Nie udało się odświeżyć Buildów w tle:",err);
          })
          .finally(() => {
            moduleOpenInFlight.builds = null;
          });
      }
      return;
    }

    if (!moduleOpenInFlight.builds) {
      moduleOpenInFlight.builds = (async () => {
        const hasSession =
          Boolean(playerAccountSessionToken());

        if (hasSession) {
          try {
            await playerAccountStatus();
          } catch (err) {}
        }

        renderBuildAccountState();

        // Przy świadomym wejściu do modułu nie używamy starej listy.
        await fetchBuildLists(true);
      })();
    }

    try {
      await moduleOpenInFlight.builds;
    } finally {
      moduleOpenInFlight.builds = null;
    }

    showToolView("builds-view","builds");
    renderBuildAccountState();
    renderBuildLists();
  }


  // ============================================================
  // v21.00.2 — PvP Lab / symulacje (jawnie eksperymentalny)
  // Znane reguły są odtwarzane wprost, a brakujące elementy silnika
  // pozostają parametrami użytkownika. Nie jest to klon backendu gry.
  // ============================================================
  const PVP_ESCALATION = [3,7,10,13,16,20,23,26,29,33,36,39,42,46,49];
  let pvpGeneratedPresetsCache = null;

  function buildSimulationReadiness(source) {
    const missing = [];
    if (!source || typeof source !== "object") return {ok:false,missing:["build"]};

    const profile = buildProfileStats(source);
    const attrs = source.attributes || {};
    const allowMissingPerks=Boolean(source.allowMissingPerks);
    BUILD_ATTR_ORDER.forEach(attrKey=>{
      const value = Number(attrs[attrKey]);
      if (!Number.isInteger(value) || value < 0 || value > 50) {
        missing.push(`atrybut ${BUILD_ATTRS[attrKey].name}`);
      }
    });

    const usedAttributePoints = BUILD_ATTR_ORDER.reduce(
      (sum,attrKey) => sum + (Number.isFinite(Number(attrs[attrKey])) ? Number(attrs[attrKey]) : 0),
      0
    );
    if (!allowMissingPerks) BUILD_ATTR_ORDER.forEach(attrKey=>{
      const value = Math.max(0,Math.min(50,Number(attrs[attrKey])||0));
      const tiers = Math.min(10,Math.floor(value/5));
      const perks = source.perks && source.perks[attrKey] ? source.perks[attrKey] : {};
      for (let tier=1; tier<=tiers; tier++) {
        if (perks[tier] !== "A" && perks[tier] !== "B") {
          missing.push(`${BUILD_ATTRS[attrKey].name}: wybór perka T${tier}`);
        }
      }
    });

    const profileLabels = {
      combatAttack:"ATK startowe w walce",
      combatDefense:"DEF startowe w walce",
      combatHp:"HP startowe w walce"
    };
    Object.keys(profileLabels).forEach(keyName=>{
      if (!profile.provided || !profile.provided[keyName]) missing.push(profileLabels[keyName]);
    });
    if (!profile.bonusesConfirmed) missing.push("potwierdzenie pełnych bonusów PvP itemów/setu/akcesoriów/gangu");

    try {
      const calculated = buildCalculateStats(source);
      const primary = buildFinalPrimaryStats(calculated);
      if (![primary.attack,primary.defense,primary.hp].every(v=>Number.isFinite(v) && v>0)) {
        missing.push("obliczalne Atak / Obrona / HP");
      }
    } catch (err) {
      missing.push("obliczalne statystyki końcowe");
    }

    return {ok:missing.length===0,missing:[...new Set(missing)]};
  }

  function pvpPresetAllocate(level,weights) {
    const target = Math.min(250,2*level);
    const cap = Math.min(50,level);
    const values = weights.map(()=>0);
    let left = target;
    while (left>0) {
      let best = -1, bestScore = -Infinity;
      weights.forEach((weight,index)=>{
        if (values[index] >= cap) return;
        const desired = target * weight / weights.reduce((a,b)=>a+b,0);
        const score = desired - values[index] + weight*0.001;
        if (score > bestScore) { bestScore=score; best=index; }
      });
      if (best<0) break;
      values[best]++;
      left--;
    }
    return values;
  }

  function pvpPresetBonus(source,name,key,value,percent=true) {
    return {source:`Preset · ${source}`,name,key,value,percent};
  }

  // Przeciwnicy treningowi używają realnych bonusów akcesoriów ze sklepu
  // (katalog z 2.09.2026). Tier rośnie wraz z poziomem, bo API sklepu nie
  // podaje osobnego wymogu levelu dla przedmiotu.
  const PVP_PRESET_GEAR = {
    offense:[
      ["Bandana Grzmotu",[["attackPct",6.6],["armorPen",7.5],["accuracy",4.8],["critDmg",36]]],
      ["Pas Pękniętej Apteczki",[["maxHpPct",7.5],["damageReduction",3.6],["defensePct",12.3],["healingReduction",10.5]]],
      ["Sygnet Twardej Pięści",[["counter",10.8],["critChance",12.9],["doubleStrike",8.1],["lifesteal",10.8]]]
    ],
    bruiser:[
      ["Bandana Łowcy Głów",[["attackPct",6.6],["armorPen",7.5],["accuracy",4.8],["execute",4.2]]],
      ["Pas Obitej Szczęki",[["maxHpPct",7.5],["damageReduction",3.6],["critResist",10.5],["stunResist",10.5]]],
      ["Sygnet Cichego Ciosu",[["evasion",4.8],["critChance",12.9],["lifesteal",10.8],["stun",8.1]]]
    ],
    skirmish:[
      ["Bandana Refleksu",[["attackPct",6.6],["armorPen",7.5],["accuracy",4.8],["firstStrike",4.2]]],
      ["Pas Zbitego Boku",[["maxHpPct",7.8],["damageReduction",3.6],["critResist",10.5],["bleedResist",11.1]]],
      ["Sygnet Szybkiej Ręki",[["evasion",4.8],["doubleStrike",8.1],["counter",10.8],["lifesteal",10.8]]]
    ]
  };

  const PVP_PRESET_GEAR_BY_TIER = {
    offense:[
      PVP_PRESET_GEAR.offense,
      [["Bandana Łamacza Szczęk",[["attackPct",12.1],["armorPen",13.75],["accuracy",8.8],["critDmg",66]]],["Pas Fałszywego Medyka",[["maxHpPct",13.75],["damageReduction",6.6],["defensePct",22.55],["healingReduction",19.25]]],["Sygnet Ulicznego Łowcy",[["critChance",23.65],["doubleStrike",14.85],["evasion",8.8],["lifesteal",19.8]]]],
      [["Bandana Nokautu",[["attackPct",16.5],["armorPen",18.75],["accuracy",12],["critDmg",90]]],["Pas Zatrutej Igły",[["maxHpPct",18.75],["damageReduction",9],["defensePct",30.75],["healingReduction",26.25]]],["Sygnet Nocnego Rzeźnika",[["critChance",32.25],["doubleStrike",20.25],["evasion",12],["lifesteal",27]]]],
      [["Bandana Ciężkiej Pięści",[["attackPct",18.7],["armorPen",21.25],["accuracy",13.6],["critDmg",102]]],["Pas Bez Znieczulenia",[["maxHpPct",21.25],["damageReduction",10.2],["defensePct",34.85],["healingReduction",29.75]]],["Sygnet Ulicznej Zemsty",[["counter",30.6],["critChance",36.55],["doubleStrike",22.95],["lifesteal",30.6]]]],
      [["Bandana Tytanicznego Ciosu",[["attackPct",20.9],["armorPen",23.75],["accuracy",15.2],["critDmg",114]]],["Pas Końca Kuracji",[["maxHpPct",23.75],["damageReduction",11.4],["defensePct",38.95],["healingReduction",33.25]]],["Sygnet Ostatniej Odpłaty",[["counter",34.2],["critChance",40.85],["doubleStrike",25.65],["lifesteal",34.2]]]]
    ],
    bruiser:[
      PVP_PRESET_GEAR.bruiser,
      [["Bandana Ulicznego Kata",[["attackPct",12.1],["armorPen",13.75],["accuracy",8.8],["execute",7.7]]],["Pas Twardego Karku",[["maxHpPct",13.75],["damageReduction",6.6],["critResist",19.25],["stunResist",19.25]]],["Sygnet Brudnego Nokautu",[["evasion",8.8],["critChance",23.65],["lifesteal",19.8],["stun",14.85]]]],
      [["Bandana Wyroku",[["attackPct",16.5],["armorPen",18.75],["accuracy",12],["execute",10.5]]],["Pas Żelaznej Gardy",[["maxHpPct",18.75],["damageReduction",9],["critResist",26.25],["stunResist",26.25]]],["Sygnet Krwawego Rabusia",[["evasion",12],["critChance",32.25],["lifesteal",27],["stun",20.25]]]],
      [["Bandana Skazańca",[["attackPct",18.7],["armorPen",21.25],["accuracy",13.6],["execute",11.9]]],["Pas Niezłomnego Bramkarza",[["maxHpPct",21.25],["damageReduction",10.2],["critResist",29.75],["stunResist",29.75]]],["Sygnet Nocnego Oprawcy",[["evasion",13.6],["critChance",36.55],["lifesteal",30.6],["stun",22.95]]]],
      [["Bandana Egzekucji",[["attackPct",20.9],["armorPen",23.75],["accuracy",15.2],["execute",13.3]]],["Pas Ostatniego Bastionu",[["maxHpPct",23.75],["damageReduction",11.4],["critResist",33.25],["stunResist",33.25]]],["Sygnet Wiecznego Nokautu",[["evasion",15.2],["critChance",40.85],["lifesteal",34.2],["stun",25.65]]]]
    ],
    skirmish:[
      PVP_PRESET_GEAR.skirmish,
      [["Bandana Pierwszej Krwi",[["attackPct",12.1],["armorPen",13.75],["accuracy",8.8],["firstStrike",7.7]]],["Pas Polowego Opatrunku",[["bleedResist",20.35],["damageReduction",6.6],["defensePct",21.45],["maxHpPct",14.3]]],["Sygnet Brudnej Kontry",[["evasion",8.8],["doubleStrike",14.85],["counter",19.8],["lifesteal",19.8]]]],
      [["Bandana Zasadzki",[["attackPct",16.5],["armorPen",18.75],["accuracy",12],["firstStrike",10.5]]],["Pas Zszytego Boku",[["bleedResist",27.75],["damageReduction",9],["defensePct",29.25],["maxHpPct",19.5]]],["Sygnet Ulicznego Rewanżu",[["evasion",12],["doubleStrike",20.25],["counter",27],["lifesteal",27]]]],
      [["Bandana Bez Ostrzeżenia",[["attackPct",18.7],["armorPen",21.25],["accuracy",13.6],["firstStrike",11.9]]],["Pas Nie do Zdarcia",[["maxHpPct",22.1],["damageReduction",10.2],["critResist",29.75],["bleedResist",31.45]]],["Sygnet Krwawego Odwetu",[["evasion",13.6],["doubleStrike",22.95],["counter",30.6],["lifesteal",30.6]]]],
      [["Bandana Pierwszego Ciosu",[["attackPct",20.9],["armorPen",23.75],["accuracy",15.2],["firstStrike",13.3]]],["Pas Ostatniej Twierdzy",[["maxHpPct",24.7],["damageReduction",11.4],["critResist",33.25],["bleedResist",35.15]]],["Sygnet Wiecznego Odwetu",[["evasion",15.2],["doubleStrike",25.65],["counter",34.2],["lifesteal",34.2]]]]
    ]
  };

  function pvpPresetGearBonuses(style,tier) {
    const items = (PVP_PRESET_GEAR_BY_TIER[style] || [])[tier-1] || [];
    return items.flatMap(([name,stats]) =>
      stats.map(([key,value]) => pvpPresetBonus(`Wyposażenie · ${name}`,name,key,value,true))
    );
  }

  function pvpGeneratedPresets() {
    if (pvpGeneratedPresetsCache) return pvpGeneratedPresetsCache;
    const archetypes = [
      {
        id:"offense",role:"napastnik",weights:[3.8,1.5,1.4,1.7,3.6],choices:"ABBA",
        names:["Bolek Bimberek","Włodek Wyrwa","Rysiek Rozwałka","Zdzichu Zawał","Grzesiu Grzmot","Mirek Młot","Franek Furia","Darek Dynamit","Wiesiek Wycisk"],
        description:"Wszechstronny napastnik: obrażenia, przebicie i krytyki, ale z punktami w Żywotność oraz Wytrzymałość.",
        primary:(level,tier)=>({attack:Math.round(100+level*5.7+tier*17),defense:Math.round(150+level*6.2+tier*25),hp:Math.round(330+level*27+tier*75)})
      },
      {
        id:"bruiser",role:"twardziel",weights:[2.1,3.7,1.3,3.7,2.8],choices:"BAAB",
        names:["Heniek Hart","Czesiek Cegła","Mietek Murem","Józek Żelazo","Wacek Wał","Bogdan Barykada","Tadzio Twardy","Roman Rykoszet","Stefan Schron"],
        description:"Twardziel z realną presją: odporności i redukcje, lecz także celność, ogłuszenie oraz Egzekucja.",
        primary:(level,tier)=>({attack:Math.round(85+level*4.5+tier*12),defense:Math.round(175+level*8.7+tier*35),hp:Math.round(450+level*31+tier*90)})
      },
      {
        id:"skirmish",role:"uliczny spryciarz",weights:[2.5,1.6,3.4,2.2,3.3],choices:"ABAB",
        names:["Dżesika Drybling","Krycha Kontra","Andrzej Antylopa","Basia Błysk","Norbert Nurek","Kinga Kropelka","Madzia Migawka","Olek Odbicie","Patryk Półcień"],
        description:"Zwinny mieszaniec: unik, kontra i podwójne uderzenie, wsparty Precją oraz zdrowiem na dłuższą walkę.",
        primary:(level,tier)=>({attack:Math.round(95+level*5.1+tier*14),defense:Math.round(145+level*7.1+tier*26),hp:Math.round(360+level*27.5+tier*78)})
      }
    ];

    const out = [];
    const levels=[30,35,40,45,50,55,60,65,70];
    levels.forEach((level,levelIndex)=>{
      const tier=Math.min(5,1+Math.floor(levelIndex/2));
      archetypes.forEach((arch,archIndex)=>{
        const values = pvpPresetAllocate(level,arch.weights);
        const attributes = {};
        const perks = {};
        BUILD_ATTR_ORDER.forEach((attrKey,index)=>{
          attributes[attrKey] = values[index];
          perks[attrKey] = {};
          const tiers = Math.min(10,Math.floor(values[index]/5));
          for (let tier=1;tier<=tiers;tier++) {
            perks[attrKey][tier] = arch.choices[(tier+index+archIndex)%arch.choices.length];
          }
        });
        const primary=arch.primary(level,tier);
        const profile = {
          attack:1,defense:1,baseHp:100,petHp:0,eqHp:0,
          combatAttack:primary.attack,
          combatDefense:primary.defense,
          combatHp:primary.hp,
          provided:{attack:false,defense:false,baseHp:false,petHp:false,eqHp:false,combatAttack:true,combatDefense:true,combatHp:true},
          bonusesConfirmed:true
        };
        const bonuses=pvpPresetGearBonuses(arch.id,tier);
        const equipment=(PVP_PRESET_GEAR_BY_TIER[arch.id][tier-1] || []).map(item=>item[0]).join(" · ");
        out.push({
          id:`preset-${level}-${arch.id}`,
          name:`${arch.names[levelIndex]} · Lvl ${level}`,
          authorNick:"MenelWars Tools · przeciwnik",
          ownerNick:"",
          public:false,
          level,
          attributes,perks,profile,bonuses,
          description:`${arch.description} Wyposażenie T${tier}: ${equipment}. Statystyki startowe walki: ${primary.attack} ATK · ${primary.defense} DEF · ${primary.hp} HP.`
        });
      });
    });
    // Jedyny testowy NPC z Rewirów. Wszystkie szanse mechanik wynikają
    // wyłącznie z jego prawdziwych atrybutów; brak dopisanych perków, itemów
    // i bonusów. simulationLevel=13 zachowuje faktyczny poziom widoczny w grze.
    out.push({
      id:"rewir-test-kamil-zdun",
      name:"Kamil Zdun · Lvl 13 · Rewiry TEST",
      authorNick:"MenelWars · Rewiry (test)",
      ownerNick:"",
      public:false,
      level:13,
      simulationLevel:13,
      allowMissingPerks:true,
      attributes:{strength:42,endurance:32,agility:42,vitality:28,precision:42},
      perks:{strength:{},endurance:{},agility:{},vitality:{},precision:{}},
      profile:{
        attack:1,defense:1,baseHp:100,petHp:0,eqHp:0,
        combatAttack:470,combatDefense:460,combatHp:1350,
        provided:{attack:false,defense:false,baseHp:false,petHp:false,eqHp:false,combatAttack:true,combatDefense:true,combatHp:true},
        bonusesConfirmed:true
      },
      bonuses:[],
      description:"Test Rewirów: 470 ATK · 460 DEF · 1350 HP; STR 42 · END 32 · AGI 42 · VIT 28 · PRC 42. Bez perków i wyposażenia — efekty wynikają wyłącznie z atrybutów."
    });
    pvpGeneratedPresetsCache = out;
    return out;
  }

  function pvpSimulationSources() {
    const current = Object.assign({},buildState,{id:"current",name:"Aktualny edytor",level:buildRequiredLevel(),profile:buildProfileStats(buildState)});
    const all = [{key:"current",label:"✏️ Aktualny edytor",source:current,group:"current"}];
    buildMyItems.forEach(item=>all.push({key:`mine:${item.id}`,label:`🔒 ${item.name}`,source:item,group:"mine"}));
    buildPublicItems.forEach(item=>all.push({key:`public:${item.id}`,label:`🌍 ${item.name} · ${item.authorNick||"Anonim"}`,source:item,group:"public"}));
    pvpGeneratedPresets().forEach(item=>all.push({key:`preset:${item.id}`,label:`🤖 ${item.name} · treningowy`,source:item,group:"preset"}));
    return all;
  }

  function pvpPopulateSelectors() {
    const left = el("pvp-sim-left"), right = el("pvp-sim-right");
    if (!left || !right) return;
    const sources = pvpSimulationSources();
    const leftSources = sources.filter(item=>item.group==="current" || item.group==="mine");
    const render = (select,items) => {
      const old = select.value;
      select.innerHTML = items.map(item=>`<option value="${escapeHtml(item.key)}">${escapeHtml(item.label)}</option>`).join("");
      if (items.some(x=>x.key===old)) select.value=old;
    };
    render(left,leftSources); render(right,sources);
    if (!left.value) left.value = leftSources.some(x=>x.key==="current") ? "current" : leftSources[0]?.key || "";
    if (!right.value || right.value===left.value) {
      const preferred = sources.find(x=>x.group==="preset") || sources.find(x=>x.group==="public");
      if (preferred) right.value=preferred.key;
    }
    pvpUpdateReadiness();
  }

  function pvpResolveSource(key) {
    return pvpSimulationSources().find(item=>item.key===key) || null;
  }

  function pvpUpdateReadiness() {
    const host = el("pvp-sim-readiness");
    if (!host) return;
    const leftItem=pvpResolveSource(el("pvp-sim-left")?.value||"");
    const rightItem=pvpResolveSource(el("pvp-sim-right")?.value||"");
    if (!leftItem || !rightItem) { host.textContent="Wybierz dwa buildy."; return; }
    const leftReady=buildSimulationReadiness(leftItem.source);
    const rightReady=buildSimulationReadiness(rightItem.source);
    if (leftReady.ok && rightReady.ok) {
      host.textContent="✅ Oba buildy mają komplet danych wymaganych do symulacji.";
      return;
    }
    const parts=[];
    if (!leftReady.ok) parts.push(`${leftItem.label}: ${leftReady.missing.join(", ")}`);
    if (!rightReady.ok) parts.push(`${rightItem.label}: ${rightReady.missing.join(", ")}`);
    host.textContent="⚠️ Brakuje: "+parts.join(" · ");
  }

  function pvpClamp(value,min,max) { return Math.max(min,Math.min(max,value)); }
  function pvpChance(percent) { return Math.random()*100 < pvpClamp(percent,0,100); }

  // Pseudo-random distribution (PRD): po serii nieudanych prób chwilowa
  // szansa rośnie, a po procu wraca do początku. Współczynnik dobieramy
  // numerycznie do bazowej statystyki. Meter przyspieszamy nieznacznie po
  // nieudanych próbach, aby średnie szanse częściej były odczuwalne w krótkiej walce.
  // To przybliżenie "proc meterów" opisanych w patch notes, nie kopia backendu.
  // Współczynnik startowy jest kalibrowany z tym samym wzrostem, którego używa
  // pvpProc(). Dzięki temu meter zmienia rozkład proców w czasie, ale nie
  // podnosi ukrycie długoterminowej szansy ze statystyk.
  const pvpPrdCoefficientCache = new Map();
  const PVP_PRD_GROWTH = 1.25;
  function pvpPrdCoefficient(percent) {
    const chance=pvpClamp(Number(percent)||0,0,100);
    const key=chance.toFixed(6);
    if (pvpPrdCoefficientCache.has(key)) return pvpPrdCoefficientCache.get(key);
    if (chance<=0) return 0;
    if (chance>=100) return 1;
    const target=chance/100;
    let low=0,high=1;
    for (let i=0;i<42;i++) {
      const middle=(low+high)/2;
      let survival=1,expectedAttempts=0;
      for (let attempt=1;attempt<=10000;attempt++) {
        expectedAttempts+=survival;
        survival*=1-Math.min(1,middle*(1+(attempt-1)*PVP_PRD_GROWTH));
        if (survival<1e-12) break;
      }
      const achieved=1/Math.max(1,expectedAttempts);
      if (achieved<target) low=middle;
      else high=middle;
    }
    pvpPrdCoefficientCache.set(key,high);
    return high;
  }

  function pvpProc(fighter,key,percent) {
    const chance=pvpClamp(Number(percent)||0,0,100);
    if (chance<=0) return false;
    if (chance>=100) { fighter.procMeters[key]=0; return true; }
    const failures=Math.max(0,Number(fighter.procMeters[key])||0);
    const momentaryChance=Math.min(100,100*pvpPrdCoefficient(chance)*(1+failures*PVP_PRD_GROWTH));
    const success=pvpChance(momentaryChance);
    fighter.procMeters[key]=success ? 0 : failures+1;
    return success;
  }

  function pvpResetProc(fighter,key) { fighter.procMeters[key]=0; }

  function pvpConditionalEffects(calculated,hpPct) {
    const out={attackPct:0,damageReduction:0,regenFlat:0};
    (calculated.extras?.conditional || []).forEach(text=>{
      const threshold=String(text).match(/HP\s*<\s*(\d+(?:[.,]\d+)?)%/i);
      if (!threshold || hpPct >= Number(threshold[1].replace(",","."))) return;
      const attack=String(text).match(/\+\s*(\d+(?:[.,]\d+)?)%\s*ataku/i);
      if (attack) out.attackPct += Number(attack[1].replace(",","."));
      const reduction=String(text).match(/-\s*(\d+(?:[.,]\d+)?)%\s*otrzymywanych obrażeń/i);
      if (reduction) out.damageReduction += Number(reduction[1].replace(",","."));
      const regen=String(text).match(/\+\s*(\d+(?:[.,]\d+)?)(?!\s*%)\s*regeneracji hp/i);
      if (regen) out.regenFlat += Number(regen[1].replace(",","."));
    });
    return out;
  }

  function pvpPrepareFighter(source,label) {
    const calculated=buildCalculateStats(source);
    const primary=buildFinalPrimaryStats(calculated);
    return {
      source,label,calculated,stats:calculated.stats,primary,
      maxHp:Math.max(1,primary.hp),hp:Math.max(1,primary.hp),
      bleeding:null,stunned:false,firstAttack:true,
      procMeters:{crit:0,double:0,counter:0,stun:0,bleed:0,evasion:0},
      metrics:{
        damage:0,crit:0,double:0,counter:0,bleed:0,bleedProc:0,stun:0,execute:0,evade:0,miss:0,hit:0,hitAttempts:0,lifesteal:0,regen:0,
        normalHitDamage:0,normalHitCount:0,critDamage:0,critHitCount:0,counterDamage:0,counterHitCount:0,
        critOpportunities:0,critChanceSum:0,doubleOpportunities:0,doubleChanceSum:0,
        counterOpportunities:0,counterChanceSum:0,bleedOpportunities:0,bleedChanceSum:0,
        stunOpportunities:0,stunChanceSum:0,executeChecks:0,
        eventTurns:{crit:[],double:[],counter:[],bleed:[],bleedProc:[],stun:[],execute:[]}
      }
    };
  }

  function pvpHeal(fighter,amount,enemy,metricKey) {
    const reduction=pvpClamp(Number(enemy.stats.healingReduction)||0,0,100);
    const heal=Math.max(0,Math.round(Number(amount||0)*(1-reduction/100)));
    const actual=Math.max(0,Math.min(heal,fighter.maxHp-fighter.hp));
    fighter.hp += actual;
    if (actual && metricKey) fighter.metrics[metricKey]+=actual;
    return actual;
  }

  function pvpDamageFormula(attacker,defender,round,params,isCrit,isFirst) {
    const hpPct=100*attacker.hp/attacker.maxHp;
    const condA=pvpConditionalEffects(attacker.calculated,hpPct);
    const condD=pvpConditionalEffects(defender.calculated,100*defender.hp/defender.maxHp);
    const dynamicPct=(attacker.calculated.extras?.dynamic||[])
      .filter(x=>x.type==="attackPctPerTurn")
      // „Nabrany Rozpęd” jest przyznawany po ataku i działa na następny.
      // Pierwsze uderzenie nie otrzymuje więc jeszcze premii; od T2 jest
      // jedna warstwa +2% za każdy zakończony wcześniej atak/obrót.
      .reduce((sum,x)=>sum+(Number(x.amount)||0)*Math.max(0,round-1),0);
    // Poziom 1 potwierdza małą, ukrytą bazę +5 obrażeń. Testujemy osobną
    // warstwę poziomu profilu: +0,5 ATK i +1,65 DEF za zdobyty poziom.
    const attackerLevel=Math.max(1,Number(attacker.calculated?.characterLevel)||1);
    const defenderLevel=Math.max(1,Number(defender.calculated?.characterLevel)||1);
    const earnedAttackerLevels=Math.max(0,attackerLevel-1);
    const earnedDefenderLevels=Math.max(0,defenderLevel-1);
    // Zwykłe premie do ATK (w tym momentum) tworzą podstawową wartość ataku.
    // Premia warunkowa low HP jest osobnym, późniejszym etapem tego samego
    // efektu — nie sumujemy jej z normalnymi premiami procentowymi.
    const normalAttack=(attacker.primary.attack+earnedAttackerLevels*0.5)*(1+dynamicPct/100)+5;
    const attack=normalAttack*(1+condA.attackPct/100);
    // Ukryty DEF za zdobyte poziomy traktujemy jak zwykłą obronę, więc
    // przebicie pancerza zmniejsza również tę część.
    const defenseBeforePen=defender.primary.defense+earnedDefenderLevels*1.65;
    const effectiveDefense=Math.max(0,defenseBeforePen*(1-pvpClamp(attacker.stats.armorPen,0,100)/100));
    // Jedyny aktywny model DEF: K rośnie z poziomem atakującego.
    // Został dobrany do obserwacji z walk na niskich poziomach i RoQ vs Bulax.
    const defenseK=20+5.6*(attackerLevel-1);
    const defenseFactor=defenseK/(effectiveDefense+defenseK);
    // Pasywny unik jest częścią zwykłej redukcji obrażeń. Zwykły DR i unik/3,5
    // sumują się przed wspólnym limitem 60%. Warunkowy DR low HP jest osobnym,
    // późniejszym efektem i nie wchodzi do tego limitu.
    const normalDamageReduction=pvpClamp(
      (Number(defender.stats.damageReduction)||0)+(Number(defender.stats.evasion)||0)/3.5,
      0,60
    );
    const escalation=1+(PVP_ESCALATION[Math.max(0,Math.min(14,round-1))]||0)/100;
    let damage=attack*defenseFactor*(1-normalDamageReduction/100);
    damage*=1-condD.damageReduction/100;
    damage*=escalation;
    if (isCrit) damage*=1+(Number(attacker.stats.critDmg)||0)/100;
    if (isFirst) damage*=1+(Number(attacker.stats.firstStrike)||0)/100;
    return Math.max(1,Math.round(damage));
  }

  // Determinystyczna tabela kalibracyjna: pełne HP i bez First Strike.
  // Pokazuje osobno zwykły cios, krytyk i niekrytyczną kontrę dla tej samej
  // tury, zamiast mieszać je ze średnią ze wszystkich walk.
  function pvpNormalDamageByRound(leftSource,rightSource,params) {
    const left=pvpPrepareFighter(leftSource,"left");
    const right=pvpPrepareFighter(rightSource,"right");
    return Array.from({length:15},(_,index)=>{
      const round=index+1;
      const leftBaseDamage=pvpDamageFormula(left,right,round,params,false,false);
      const rightBaseDamage=pvpDamageFormula(right,left,round,params,false,false);
      const leftFirstDamage=pvpDamageFormula(left,right,round,params,false,round===1);
      const rightFirstDamage=pvpDamageFormula(right,left,round,params,false,round===1);
      return {
        round,
        leftBaseDamage,
        rightBaseDamage,
        leftDamage:leftFirstDamage,
        rightDamage:rightFirstDamage,
        leftFirstDamage,
        rightFirstDamage,
        leftBaseCritDamage:pvpDamageFormula(left,right,round,params,true,false),
        rightBaseCritDamage:pvpDamageFormula(right,left,round,params,true,false),
        leftCritDamage:pvpDamageFormula(left,right,round,params,true,round===1),
        rightCritDamage:pvpDamageFormula(right,left,round,params,true,round===1),
        leftCounterDamage:Math.max(1,Math.round(leftBaseDamage*(Number(params.counterMult)||1))),
        rightCounterDamage:Math.max(1,Math.round(rightBaseDamage*(Number(params.counterMult)||1)))
      };
    });
  }

  function pvpRenderNormalDamageByRound(rows,leftLabel,rightLabel) {
    const cell=(normal,crit,counter)=>`N ${normal} · K ${crit} · C ${counter}`;
    return `<details class="pvp-result-details pvp-round-damage-details"><summary>📏 Obrażenia według tur</summary><div class="pvp-result-details-body"><div class="pvp-round-legend">N = normalny · K = krytyk · C = niekrytyczna kontra. T1 uwzględnia płomyk i First Strike dla N/K.</div><div class="pvp-round-damage-list">${rows.map(row=>`<div class="pvp-round-damage-row"><b>T${row.round}</b><span><small>${escapeHtml(leftLabel)} → ${escapeHtml(rightLabel)}</small>${cell(row.leftDamage,row.leftCritDamage,row.leftCounterDamage)}</span><span><small>${escapeHtml(rightLabel)} → ${escapeHtml(leftLabel)}</small>${cell(row.rightDamage,row.rightCritDamage,row.rightCounterDamage)}</span></div>`).join("")}</div></div></details>`;
  }

  function pvpApplyBleedTick(victim,round) {
    if (!victim.bleeding) return {damage:0,killed:false};
    const source=victim.bleeding;
    const escalation=1+(PVP_ESCALATION[Math.max(0,Math.min(14,round-1))]||0)/100;
    const damage=Math.max(1,Math.round(victim.maxHp*0.02*(1+(Number(source.stats.bleedDamage)||0)/100)*escalation));
    victim.hp=Math.max(0,victim.hp-damage);
    source.metrics.damage+=damage;
    return {damage,killed:victim.hp<=0};
  }

  // Pudło nie może dać crita, bleed ani stuna, ale jest nieudaną okazją dla
  // każdego z tych meterów. Nie losujemy ukrytego sukcesu, tylko jawnie
  // zapisujemy porażkę — dzięki temu następne trafienie ma wyższą szansę.
  function pvpFailProc(fighter,key,percent) {
    if (pvpClamp(Number(percent)||0,0,100)<=0) return;
    const failures=Math.max(0,Number(fighter.procMeters[key])||0);
    fighter.procMeters[key]=failures+1;
  }

  function pvpStrike(attacker,defender,round,params,options={}) {
    if (attacker.hp<=0 || defender.hp<=0) return {killed:false,cause:""};
    const allowExecute=options.allowExecute!==false;
    const allowCounter=options.allowCounter!==false;
    const isFirst=Boolean(attacker.firstAttack && options.consumeFirst!==false);
    if (options.consumeFirst!==false) attacker.firstAttack=false;

    const finalHit=pvpClamp((Number(attacker.stats.accuracy)||0)-(Number(defender.stats.evasion)||0),5,99);
    const critChance=Math.max(0,(Number(attacker.stats.critChance)||0)-(Number(defender.stats.critResist)||0));
    const bleedChance=Math.max(0,(Number(attacker.stats.bleed)||0)-(Number(defender.stats.bleedResist)||0));
    const stunChance=Math.max(0,(Number(attacker.stats.stun)||0)-(Number(defender.stats.stunResist)||0));
    attacker.metrics.hitAttempts++;
    const evadeChance=100-finalHit;
    if (pvpProc(defender,"evasion",evadeChance)) {
      attacker.metrics.miss++;
      defender.metrics.evade++;
      // Zmisowany atak jest nieudaną okazją na efekty atakującego.
      attacker.metrics.critOpportunities++;
      attacker.metrics.critChanceSum+=pvpClamp(critChance,0,100);
      attacker.metrics.stunOpportunities++;
      attacker.metrics.stunChanceSum+=pvpClamp(stunChance,0,100);
      pvpFailProc(attacker,"crit",critChance);
      // Gdy ofiara już krwawi, kolejne próby nie mają skutku i nie są
      // okazjami do raportu ani kolejnymi porażkami metera bleed.
      if (!defender.bleeding) {
        attacker.metrics.bleedOpportunities++;
        attacker.metrics.bleedChanceSum+=pvpClamp(bleedChance,0,100);
        pvpFailProc(attacker,"bleed",bleedChance);
      }
      pvpFailProc(attacker,"stun",stunChance);
      if (allowCounter) {
        const counterChance=pvpClamp(Number(defender.stats.counter)||0,0,100);
        defender.metrics.counterOpportunities++;
        defender.metrics.counterChanceSum+=counterChance;
        if (pvpProc(defender,"counter",counterChance)) {
          defender.metrics.counter++;
          defender.metrics.eventTurns.counter.push(round);
          const counterResult=pvpStrike(defender,attacker,round,params,{allowExecute:false,allowCounter:false,consumeFirst:false,damageMultiplier:params.counterMult,isCounter:true});
          if (counterResult.killed) return {killed:true,cause:"counter"};
        }
      }
      return {killed:false,cause:"evade"};
    }

    attacker.metrics.hit++;
    // Execute jest zwykłym głównym atakiem, który po trafieniu zamienia się w
    // zabicie. Unik blokuje go; Double Strike przekazuje allowExecute=false.
    if (allowExecute) {
      attacker.metrics.executeChecks++;
      if (100*defender.hp/defender.maxHp < (Number(attacker.stats.execute)||0)) {
        defender.hp=0; attacker.metrics.execute++;
        attacker.metrics.eventTurns.execute.push(round);
        return {killed:true,cause:"execute"};
      }
    }
    attacker.metrics.critOpportunities++;
    attacker.metrics.critChanceSum+=pvpClamp(critChance,0,100);
    const crit=pvpProc(attacker,"crit",critChance);
    if (crit) {
      attacker.metrics.crit++;
      attacker.metrics.eventTurns.crit.push(round);
    }
    let damage=pvpDamageFormula(attacker,defender,round,params,crit,isFirst);
    if (Number.isFinite(options.damageMultiplier)) damage=Math.max(1,Math.round(damage*options.damageMultiplier));
    const actual=Math.min(defender.hp,damage);
    defender.hp-=actual;
    attacker.metrics.damage+=actual;
    if (options.isCounter) {
      attacker.metrics.counterDamage+=actual;
      attacker.metrics.counterHitCount++;
    } else if (crit) {
      attacker.metrics.critDamage+=actual;
      attacker.metrics.critHitCount++;
    } else {
      attacker.metrics.normalHitDamage+=actual;
      attacker.metrics.normalHitCount++;
    }

    if (actual>0 && Number(attacker.stats.lifesteal)>0) {
      pvpHeal(attacker,actual*(Number(attacker.stats.lifesteal)||0)/100,defender,"lifesteal");
    }
    if (defender.hp<=0) return {killed:true,cause:options.damageMultiplier!=null?"counter":"damage"};

    // Mistrz Krwawienia / applies_bleed: krytyk automatycznie nakłada bleed.
    // Po pierwszym skutecznym nałożeniu status trwa do końca walki, dlatego
    // nie losujemy ani nie raportujemy kolejnych, niewidocznych "proców".
    if (!defender.bleeding) {
      const autoBleed = crit && Number(attacker.stats.appliesBleed) > 0;
      attacker.metrics.bleedOpportunities++;
      attacker.metrics.bleedChanceSum+=autoBleed?100:pvpClamp(bleedChance,0,100);
      const bleedProc=autoBleed || pvpProc(attacker,"bleed",bleedChance);
      if (autoBleed) pvpResetProc(attacker,"bleed");
      if (bleedProc) {
        attacker.metrics.bleedProc++;
        attacker.metrics.eventTurns.bleedProc.push(round);
        attacker.metrics.bleed++;
        attacker.metrics.eventTurns.bleed.push(round);
        defender.bleeding=attacker;
      }
    }
    attacker.metrics.stunOpportunities++;
    attacker.metrics.stunChanceSum+=pvpClamp(stunChance,0,100);
    if (pvpProc(attacker,"stun",stunChance)) {
      defender.stunned=true; attacker.metrics.stun++;
      attacker.metrics.eventTurns.stun.push(round);
    }
    return {killed:false,cause:crit?"crit":"hit"};
  }

  function pvpActivity(actor,enemy,round,params) {
    const bleedTick=pvpApplyBleedTick(actor,round);
    if (bleedTick.killed) return {winner:enemy,cause:"bleed"};

    // Z logów: po ticku krwawienia postać dostaje zwykłą regenerację,
    // a dopiero potem wykonuje swoją część tury. Dodatek low HP oceniamy
    // po zwykłej regeneracji, jako osobny efekt warunkowy.
    pvpHeal(actor,Number(actor.stats.hpRegen)||0,enemy,"regen");
    const regenCond=pvpConditionalEffects(actor.calculated,100*actor.hp/actor.maxHp);
    pvpHeal(actor,regenCond.regenFlat,enemy,"regen");

    if (actor.stunned) {
      actor.stunned=false;
      // Ogłuszenie odbiera atak, nie regenerację przypisaną do tej tury.
      return null;
    }
    const main=pvpStrike(actor,enemy,round,params,{allowExecute:true,allowCounter:true,consumeFirst:true});
    if (enemy.hp<=0) return {winner:actor,cause:main.cause||"damage"};
    // Kontratak jest rozstrzygany wewnątrz pvpStrike(). Jeśli zabił aktywnego
    // gracza, nie wolno pozwolić mu wykonać double strike ani przejść do
    // kolejnych tur z HP=0.
    if (actor.hp<=0) return {winner:enemy,cause:main.cause||"counter"};

    // Udany unik kończy sekwencję atakującego. Nie ma po nim Double Strike.
    // Pudło pozostaje jednak nieudaną okazją dla metera Double Strike, więc
    // następny trafiony główny atak może mieć wyższą chwilową szansę.
    if (main.cause==="evade") {
      const missedDoubleChance=pvpClamp(Number(actor.stats.doubleStrike)||0,0,100);
      actor.metrics.doubleOpportunities++;
      actor.metrics.doubleChanceSum+=missedDoubleChance;
      pvpFailProc(actor,"double",missedDoubleChance);
      return null;
    }

    const doubleChance=pvpClamp(Number(actor.stats.doubleStrike)||0,0,100);
    actor.metrics.doubleOpportunities++;
    actor.metrics.doubleChanceSum+=doubleChance;
    if (pvpProc(actor,"double",doubleChance)) {
      actor.metrics.double++;
      actor.metrics.eventTurns.double.push(round);
      const second=pvpStrike(actor,enemy,round,params,{allowExecute:false,allowCounter:true,consumeFirst:false});
      if (enemy.hp<=0) return {winner:actor,cause:second.cause||"double"};
      if (actor.hp<=0) return {winner:enemy,cause:second.cause||"counter"};
    }
    return null;
  }

  function pvpPickFirst(a,b,params) {
    const ia=Number(a.stats.initiative)||0, ib=Number(b.stats.initiative)||0;
    if (Math.abs(ia-ib)<1e-9) return Math.random()<0.5 ? a : b;
    return ia>ib ? a : b;
  }

  function pvpOneBattle(sourceA,sourceB,params,defenderSide="B") {
    const a=pvpPrepareFighter(sourceA,"A"), b=pvpPrepareFighter(sourceB,"B");
    let cause="timeout_hp", rounds=15, winner=null;

    // Inicjatywa wyznacza pierwszy ruch; przy idealnym remisie losujemy raz
    // na całą walkę.
    const first=pvpPickFirst(a,b,params);
    const second=first===a?b:a;

    for (let round=1;round<=15;round++) {
      const r1=pvpActivity(first,second,round,params);
      if (r1) { winner=r1.winner;cause=r1.cause;rounds=round;break; }
      const r2=pvpActivity(second,first,round,params);
      if (r2) { winner=r2.winner;cause=r2.cause;rounds=round;break; }
    }

    // Techniczny limit rund nie tworzy remisu:
    // 1) wygrywa wyższy % pozostałego maksymalnego HP,
    // 2) przy dokładnie takim samym % HP wygrywa obrońca.
    if (!winner) {
      const pa=a.maxHp>0 ? a.hp/a.maxHp : 0;
      const pb=b.maxHp>0 ? b.hp/b.maxHp : 0;
      if (Math.abs(pa-pb)>1e-9) {
        winner=pa>pb?a:b;
        cause="timeout_hp";
      } else {
        winner=defenderSide==="A"?a:b;
        cause="timeout_defender";
      }
    }
    return {winner:winner===a?"A":"B",cause,rounds,a,b,timeout:cause==="timeout_hp"||cause==="timeout_defender"};
  }

  function pvpHpBucketIndex(percent) {
    const value=pvpClamp(Number(percent)||0,0,100);
    if (value<=0) return 0;
    if (value<=25) return 1;
    if (value<=50) return 2;
    if (value<=75) return 3;
    return 4;
  }

  function pvpAddCause(target,cause) {
    const key=String(cause||"inne");
    target[key]=(target[key]||0)+1;
  }

  async function pvpMonteCarlo(sourceA,sourceB,runs,params,defenderSide="B") {
    const eventKeys=["crit","double","counter","bleed","bleedProc","stun","execute"];
    const emptyEvents=()=>Object.fromEntries(eventKeys.map(key=>[key,0]));
    const agg={
      runs,winsA:0,winsB:0,ties:0,timeouts:0,rounds:[],
      endHpA:0,endHpB:0,damageA:0,damageB:0,
      hpBucketsA:[0,0,0,0,0],hpBucketsB:[0,0,0,0,0],
      eventsA:emptyEvents(),eventsB:emptyEvents(),
      eventFightsA:emptyEvents(),eventFightsB:emptyEvents(),
      utilityA:{evade:0,evadeFights:0,lifesteal:0,regen:0,hit:0,miss:0,hitAttempts:0},utilityB:{evade:0,evadeFights:0,lifesteal:0,regen:0,hit:0,miss:0,hitAttempts:0},
      detailA:{},detailB:{},eventTurnsA:Object.fromEntries(eventKeys.map(k=>[k,[]])),eventTurnsB:Object.fromEntries(eventKeys.map(k=>[k,[]])),
      causes:{},causesByWinner:{A:{},B:{},tie:{}}
    };
    for (let i=0;i<runs;i++) {
      // Każda iteracja Monte Carlo jest odrębną walką arenową. Meter nie
      // przechodzi między nimi i zaczyna od zera dla obu graczy.
      const result=pvpOneBattle(sourceA,sourceB,params,defenderSide);
      if (result.winner==="A") agg.winsA++;
      else if (result.winner==="B") agg.winsB++;
      else agg.ties++;
      if (result.timeout) agg.timeouts++;
      agg.rounds.push(result.rounds);

      const hpA=100*result.a.hp/result.a.maxHp;
      const hpB=100*result.b.hp/result.b.maxHp;
      agg.endHpA+=hpA;
      agg.endHpB+=hpB;
      agg.hpBucketsA[pvpHpBucketIndex(hpA)]++;
      agg.hpBucketsB[pvpHpBucketIndex(hpB)]++;
      agg.damageA+=result.a.metrics.damage;
      agg.damageB+=result.b.metrics.damage;
      agg.utilityA.evade+=Number(result.a.metrics.evade)||0; if ((Number(result.a.metrics.evade)||0)>0) agg.utilityA.evadeFights++;
      agg.utilityB.evade+=Number(result.b.metrics.evade)||0; if ((Number(result.b.metrics.evade)||0)>0) agg.utilityB.evadeFights++;
      agg.utilityA.hit+=Number(result.a.metrics.hit)||0; agg.utilityA.miss+=Number(result.a.metrics.miss)||0; agg.utilityA.hitAttempts+=Number(result.a.metrics.hitAttempts)||0;
      agg.utilityB.hit+=Number(result.b.metrics.hit)||0; agg.utilityB.miss+=Number(result.b.metrics.miss)||0; agg.utilityB.hitAttempts+=Number(result.b.metrics.hitAttempts)||0;
      agg.utilityA.lifesteal+=Number(result.a.metrics.lifesteal)||0; agg.utilityB.lifesteal+=Number(result.b.metrics.lifesteal)||0;
      agg.utilityA.regen+=Number(result.a.metrics.regen)||0; agg.utilityB.regen+=Number(result.b.metrics.regen)||0;

      eventKeys.forEach(key=>{
        const countA=Number(result.a.metrics[key])||0;
        const countB=Number(result.b.metrics[key])||0;
        agg.eventsA[key]+=countA;
        agg.eventsB[key]+=countB;
        if (countA>0) agg.eventFightsA[key]++;
        if (countB>0) agg.eventFightsB[key]++;
      });

      ["normalHitDamage","normalHitCount","critDamage","critHitCount","counterDamage","counterHitCount",
        "critOpportunities","critChanceSum","doubleOpportunities","doubleChanceSum","counterOpportunities","counterChanceSum",
        "bleedOpportunities","bleedChanceSum","stunOpportunities","stunChanceSum","executeChecks"].forEach(key=>{
          agg.detailA[key]=(agg.detailA[key]||0)+(Number(result.a.metrics[key])||0);
          agg.detailB[key]=(agg.detailB[key]||0)+(Number(result.b.metrics[key])||0);
        });
      eventKeys.forEach(key=>{
        agg.eventTurnsA[key].push(...(result.a.metrics.eventTurns[key]||[]));
        agg.eventTurnsB[key].push(...(result.b.metrics.eventTurns[key]||[]));
      });

      pvpAddCause(agg.causes,result.cause);
      pvpAddCause(agg.causesByWinner[result.winner]||agg.causesByWinner.tie,result.cause);
      if (i && i%500===0) await new Promise(resolve=>setTimeout(resolve,0));
    }

    agg.rounds.sort((a,b)=>a-b);
    agg.avgRounds=agg.rounds.reduce((a,b)=>a+b,0)/runs;
    const mid=Math.floor(agg.rounds.length/2);
    agg.medianRounds=agg.rounds.length%2
      ? (agg.rounds[mid]||0)
      : ((agg.rounds[mid-1]||0)+(agg.rounds[mid]||0))/2;
    return agg;
  }

  function pvpPct(n,d) { return d ? (100*n/d).toLocaleString("pl-PL",{maximumFractionDigits:1})+"%" : "0%"; }

  function pvpAvg(n,d,digits=1) {
    return d ? (Number(n)/Number(d)).toLocaleString("pl-PL",{maximumFractionDigits:digits}) : "—";
  }

  function pvpAvgTurn(turns) {
    if (!turns?.length) return "—";
    return (turns.reduce((a,b)=>a+b,0)/turns.length).toLocaleString("pl-PL",{maximumFractionDigits:1});
  }

  function pvpTurnBand(turns) {
    if (!turns?.length) return "nie wystąpiło";
    const sorted=[...turns].sort((a,b)=>a-b);
    const pick=q=>sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*q))];
    return `śr. tura ${pvpAvgTurn(sorted)} · połowa do T${pick(.5)} · 75% do T${pick(.75)}`;
  }

  function pvpMechanicRows(events,eventFights,detail,turns,runs) {
    const chance=(sum,opp)=>opp?pvpAvg(sum,opp,1)+"%":"—";
    const row=(icon,label,key,oppKey,chanceKey,extra="")=>{
      const count=Number(events[key]||0), opp=Number(detail[oppKey]||0);
      return `<div class="pvp-mechanic-row">
        <div class="pvp-mechanic-name">${icon} <b>${label}</b></div>
        <div><span>Szansa</span><b>${chance(detail[chanceKey]||0,opp)}</b></div>
        <div><span>Okazje</span><b>${pvpAvg(opp,runs,2)}/walkę</b></div>
        <div><span>Weszło</span><b>${pvpPct(eventFights[key]||0,runs)} walk · ${pvpAvg(count,runs,2)}/walkę</b></div>
        <div class="pvp-mechanic-turn"><span>Kiedy</span><b>${pvpTurnBand(turns[key])}</b></div>
        ${extra}
      </div>`;
    };
    return [
      row("💥","Krytyk","crit","critOpportunities","critChanceSum"),
      row("⚡","Double","double","doubleOpportunities","doubleChanceSum"),
      row("↩️","Kontratak","counter","counterOpportunities","counterChanceSum"),
      row("🩸","Proc krwawienia","bleedProc","bleedOpportunities","bleedChanceSum"),
      row("💫","Ogłuszenie","stun","stunOpportunities","stunChanceSum")
    ].join("");
  }

  function pvpDamageCard(label,detail,firstTurnDamage) {
    const baseMetric=(icon,name,base,first,firstLabel)=>`<div class="pvp-damage-metric"><span>${icon} ${name} · T1</span><b>${Number.isFinite(base)?base+" dmg":"—"}</b><small>${firstLabel}: ${Number.isFinite(first)?first+" dmg":"—"}</small></div>`;
    return `<div class="pvp-fighter-report">
      <div class="pvp-fighter-report-title">${escapeHtml(label)}</div>
      <div class="pvp-damage-grid">
        ${baseMetric("👊","Cios baza",firstTurnDamage?.normal,firstTurnDamage?.first,"Pierwszy cios")}
        ${baseMetric("💥","Krytyk baza",firstTurnDamage?.crit,firstTurnDamage?.firstCrit,"Pierwszy krytyk")}
        ${baseMetric("↩️","Kontra baza",firstTurnDamage?.counter,firstTurnDamage?.counter,"Kontra bez First Strike")}
      </div>
    </div>`;
  }

  function pvpHpDistributionLine(buckets,runs) {
    const labels=["0%","1–25%","26–50%","51–75%","76–100%"];
    return labels.map((label,index)=>`<span><b>${label}</b>${pvpPct(buckets[index]||0,runs)}</span>`).join("");
  }

  function pvpWinFinishCard(label,causes,wins) {
    const total=Math.max(1,wins);
    const timeout=(causes.timeout_hp||0)+(causes.timeout_defender||0);
    const hpZero=Math.max(0,wins-timeout);
    const finishing=[
      ["☠️ Execute",causes.execute||0],
      ["↩️ Kontra",causes.counter||0],
      ["🩸 Krwawienie",causes.bleed||0],
      ["👊 Cios / obrażenia",(causes.damage||0)+(causes.crit||0)+(causes.double||0)]
    ].filter(([,v])=>v>0);
    return `<div class="pvp-win-card">
      <div class="pvp-fighter-report-title">${escapeHtml(label)} · ${Number(wins).toLocaleString("pl-PL")} zwycięstw</div>
      <div class="pvp-win-main">
        <div><span>❤️ HP przeciwnika spadło do 0</span><b>${hpZero.toLocaleString("pl-PL")} · ${pvpPct(hpZero,total)}</b></div>
        <div><span>⏱️ Limit rund / wyższy % HP</span><b>${timeout.toLocaleString("pl-PL")} · ${pvpPct(timeout,total)}</b></div>
      </div>
      ${finishing.length?`<div class="pvp-finisher"><span>Czym zakończono walkę przy HP = 0</span>${finishing.map(([k,v])=>`<b>${k}: ${v.toLocaleString("pl-PL")} · ${pvpPct(v,Math.max(1,hpZero))}</b>`).join("")}</div>`:""}
    </div>`;
  }

  function pvpInsightCards(label,events,eventFights,detail,turns,runs,utility,enemyUtility) {
    const card=(icon,name,value,sub)=>`<div class="pvp-insight-card"><span>${icon} ${name}</span><b>${value}</b>${sub?`<small>${sub}</small>`:""}</div>`;
    const healed=(utility.lifesteal||0)+(utility.regen||0);
    const hitAttempts=Number(utility.hitAttempts||0), hits=Number(utility.hit||0), misses=Number(utility.miss||0);
    const hitPct=hitAttempts?pvpPct(hits,hitAttempts):"—";
    const missPct=hitAttempts?pvpPct(misses,hitAttempts):"—";
    const targetedAttempts=Number(enemyUtility?.hitAttempts||0);
    const evades=Number(utility.evade||0);
    const proc=(key,oppKey)=>{
      const count=Number(events[key]||0), opp=Number(detail[oppKey]||0);
      return {
        pct:opp?pvpPct(count,opp):"—",
        sub:opp?`${count.toLocaleString("pl-PL")} / ${opp.toLocaleString("pl-PL")} okazji · ${pvpAvg(count,runs,2)}/walkę`:"brak okazji"
      };
    };
    const crit=proc("crit","critOpportunities");
    const dbl=proc("double","doubleOpportunities");
    const counter=proc("counter","counterOpportunities");
    const bleed=proc("bleedProc","bleedOpportunities");
    const stun=proc("stun","stunOpportunities");
    const evadePct=targetedAttempts?pvpPct(evades,targetedAttempts):"—";
    const items=[
      card("💥","Krytyk",`${crit.pct} trafień`,`${crit.sub}${turns.crit?.length?` · ${pvpTurnBand(turns.crit)}`:""}`),
      card("⚡","Podwójne uderzenie",`${dbl.pct} okazji`,`${dbl.sub}${turns.double?.length?` · ${pvpTurnBand(turns.double)}`:""}`),
      card("↩️","Kontratak",`${counter.pct} okazji`,`${counter.sub}${turns.counter?.length?` · ${pvpTurnBand(turns.counter)}`:""}`),
      card("💧","Unik",`${evadePct} ataków`,targetedAttempts?`${evades.toLocaleString("pl-PL")} / ${targetedAttempts.toLocaleString("pl-PL")} ciosów unikniętych · ${pvpAvg(evades,runs,2)}/walkę`:"brak ataków przeciwnika"),
      card("🩸","Proc krwawienia",`${bleed.pct} okazji`,`${bleed.sub}${turns.bleedProc?.length?` · ${pvpTurnBand(turns.bleedProc)}`:""}`),
      card("💫","Ogłuszenie",`${stun.pct} okazji`,`${stun.sub}${turns.stun?.length?` · ${pvpTurnBand(turns.stun)}`:""}`),
      card("💚","Odzyskane HP",`${Math.round(healed/Math.max(1,runs)).toLocaleString("pl-PL")} / walkę`,`lifesteal ${Math.round((utility.lifesteal||0)/Math.max(1,runs))} · regen ${Math.round((utility.regen||0)/Math.max(1,runs))}`),
      card("🎯","Trafienie / pudło",`${hitPct} / ${missPct}`,hitAttempts?`${hits.toLocaleString("pl-PL")} trafień · ${misses.toLocaleString("pl-PL")} pudeł · ${hitAttempts.toLocaleString("pl-PL")} prób`:"brak prób ataku")
    ];
    return `<div class="pvp-fighter-report"><div class="pvp-fighter-report-title">${escapeHtml(label)}</div><div class="pvp-insight-grid">${items.join("")}</div></div>`;
  }

  function pvpRenderAggregate(agg,leftLabel,rightLabel,title="Wynik symulacji",perRoundDamage=null) {
    const leftWin=pvpPct(agg.winsA,agg.runs), rightWin=pvpPct(agg.winsB,agg.runs);
    return `<section class="pvp-sim-result-card">
      <h4>${escapeHtml(title)}</h4>
      <div class="pvp-result-scorecards two-way">
        <div class="pvp-result-scorecard winner-a"><span>${escapeHtml(leftLabel)}</span><strong>${leftWin}</strong></div>
        <div class="pvp-result-scorecard"><span>${escapeHtml(rightLabel)}</span><strong>${rightWin}</strong></div>
      </div>
      <div class="pvp-sim-kpis">
        <span>Śr. rund <b>${agg.avgRounds.toLocaleString("pl-PL",{maximumFractionDigits:1})}</b></span>
        <span>Mediana <b>${agg.medianRounds.toLocaleString("pl-PL",{maximumFractionDigits:1})}</b></span>
        <span>Timeout <b>${pvpPct(agg.timeouts,agg.runs)}</b></span>
      </div>

      <details class="pvp-result-details" open>
        <summary>🏆 Jak kończyły się zwycięstwa</summary>
        <div class="pvp-result-details-body">${pvpWinFinishCard(leftLabel,agg.causesByWinner.A,agg.winsA)}${pvpWinFinishCard(rightLabel,agg.causesByWinner.B,agg.winsB)}</div>
      </details>

      <details class="pvp-result-details" open>
        <summary>🥊 Obrażenia Baza</summary>
        <div class="pvp-result-details-body">${pvpDamageCard(leftLabel,agg.detailA,perRoundDamage?.[0] ? {normal:perRoundDamage[0].leftBaseDamage,first:perRoundDamage[0].leftFirstDamage,crit:perRoundDamage[0].leftBaseCritDamage,firstCrit:perRoundDamage[0].leftCritDamage,counter:perRoundDamage[0].leftCounterDamage} : null)}${pvpDamageCard(rightLabel,agg.detailB,perRoundDamage?.[0] ? {normal:perRoundDamage[0].rightBaseDamage,first:perRoundDamage[0].rightFirstDamage,crit:perRoundDamage[0].rightBaseCritDamage,firstCrit:perRoundDamage[0].rightCritDamage,counter:perRoundDamage[0].rightCounterDamage} : null)}</div>
      </details>

      <details class="pvp-result-details" open>
        <summary>🔎 Najczęstsze zdarzenia</summary>
        <div class="pvp-result-details-body">${pvpInsightCards(leftLabel,agg.eventsA,agg.eventFightsA,agg.detailA,agg.eventTurnsA,agg.runs,agg.utilityA,agg.utilityB)}${pvpInsightCards(rightLabel,agg.eventsB,agg.eventFightsB,agg.detailB,agg.eventTurnsB,agg.runs,agg.utilityB,agg.utilityA)}</div>
      </details>
    </section>`;
  }

  async function pvpRunSimulation() {
    const button=el("pvp-sim-run"), host=el("pvp-sim-results"), readinessHost=el("pvp-sim-readiness");
    const leftItem=pvpResolveSource(el("pvp-sim-left")?.value||"");
    const rightItem=pvpResolveSource(el("pvp-sim-right")?.value||"");
    if (!leftItem || !rightItem) return;
    const lready=buildSimulationReadiness(leftItem.source), rready=buildSimulationReadiness(rightItem.source);
    if (!lready.ok || !rready.ok) { pvpUpdateReadiness(); return; }
    const params={
      // Potwierdzone przez logi gry: kontratak ma 75% zwykłych obrażeń;
      // nadal może krytować, co obsługuje pvpStrike().
      counterMult:0.75
    };
    const runs=[10,100,1000].includes(Number(el("pvp-sim-runs")?.value))?Number(el("pvp-sim-runs")?.value):1000;
    const mode=String(el("pvp-sim-mode")?.value||"both");
    button.disabled=true; if (readinessHost) readinessHost.textContent=`⏳ Symuluję ${runs.toLocaleString("pl-PL")} walk...`;
    try {
      // Jeden raport. Nie dublujemy już symulacji „atakuję / bronię”, bo
      // poza skrajnym remisem timeoutu nie mamy potwierdzonej różnicy stron.
      const agg=await pvpMonteCarlo(leftItem.source,rightItem.source,runs,params,"B");
      const perRoundDamage=pvpNormalDamageByRound(leftItem.source,rightItem.source,params);
      host.innerHTML=`<details class="pvp-sim-assumptions"><summary>🧪 Założenia eksperymentalnego silnika</summary><div>hit = clamp(Celność − Unik, 5–99%), crit/unik/double/kontra/stun/bleed używają wygładzonego proc metera PRD: chwilowa szansa rośnie po pudłach o 25% szybciej niż bazowy PRD, przy zachowaniu średniej statystyki. Pudło nabija meter crita, stuna i standardowego bleed. Crit/stun/standardowy bleed pomniejszane są o odpowiednią odporność, Mistrz Krwawienia nakłada bleed automatycznie po krycie. Zwykły DR zawiera pasywny unik = Unik/3.5 i ma wspólny limit 60%; DR low HP jest osobnym późniejszym efektem. Execute wymaga trafienia i nie działa na Double Strike. Normalne obrażenia: ATK + 0,5 × zdobyty poziom profilu (przed premiami) + ukryte 5, DEF profilu + 1,65 × zdobyty poziom profilu przed armor pen; HP zawiera już +5 × poziom. DEF używa stałego modelu zależnego od poziomu atakującego: K = 20 + 5,6 × (poziom − 1). Bleed tick następuje przed regeneracją, a regeneracja przed atakiem; kontra ×75% i może krytować. Wyższa inicjatywa zawsze zaczyna; przy remisie inicjatywy kolejność jest losowa. Po limicie 15 rund wygrywa wyższy % HP.</div></details>${pvpRenderAggregate(agg,leftItem.label,rightItem.label,"Wynik symulacji",perRoundDamage)}${pvpRenderNormalDamageByRound(perRoundDamage,leftItem.label,rightItem.label)}`;
      const achievementIds=["pvp_simulation"];
      const ownNick=normalizedPlayerNick(cachedAccountNick());
      const fightsOtherPublic=rightItem.group==="public" && normalizedPlayerNick(rightItem.source.ownerNick || rightItem.source.authorNick)!==ownNick;
      if (fightsOtherPublic) {
        achievementIds.push("pvp_public_fight");
        if (runs===1000 && agg.winsA/runs>=0.8) achievementIds.push("pvp_public_win");
      }
      const fightsMirrorBolek=
        leftItem.group==="mine" &&
        normalizedPlayerNick(leftItem.source.name)===normalizedPlayerNick("Bolek Bimberek") &&
        rightItem.group==="preset" &&
        rightItem.source.id==="preset-30-offense" &&
        runs===1000;
      if (fightsMirrorBolek) achievementIds.push("easter_bolek_mirror");
      achievementTrack(achievementIds);
      // Przeciwnik AI jest zaliczany dopiero na wiarygodnej próbie 1 000 walk.
      // „Pokonaj” oznacza przewagę w symulacji, nie pojedynczy szczęśliwy rzut.
      if (rightItem.group==="preset" && runs===1000 && agg.winsA/runs>=0.8) {
        achievementTrackAiWin(rightItem.source.id,buildRequiredLevel());
      }
      if (readinessHost) readinessHost.textContent="✅ Symulacja zakończona. Wyniki są eksperymentalne, nie są prognozą 1:1 silnika gry.";
    } catch (err) {
      if (readinessHost) readinessHost.textContent="❌ "+(err&&err.message?err.message:"Błąd symulacji.");
    } finally { button.disabled=false; }
  }

  function pvpAnalyzeLog() {
    const text=String(el("pvp-log-text")?.value||"");
    const host=el("pvp-log-results");
    if (!host) return;
    if (!text.trim()) { host.innerHTML='<div class="empty">Wklej log walki.</div>'; return; }
    const patterns={
      krytyk:/\b(kryt|critical|crit)\w*/gi,
      double:/podw[oó]jn\w*\s+uderz|double\s+strike/gi,
      counter:/kontratak|counter/gi,
      bleed:/krwaw|bleed/gi,
      stun:/og[łl]usz|stun/gi,
      execute:/egzekuc|execute/gi,
      evade:/unik|evad/gi
    };
    const counts={}; Object.entries(patterns).forEach(([k,re])=>{counts[k]=(text.match(re)||[]).length;});
    const turns=(text.match(/\b(?:tura|turn)\s*#?\s*\d+/gi)||[]).map(x=>Number((x.match(/\d+/)||[0])[0])).filter(Boolean);
    const damage=(text.match(/\b\d+(?:[.,]\d+)?\s*(?:obra[żz]e[nń]|damage)/gi)||[]).map(x=>Number((x.match(/\d+(?:[.,]\d+)?/)||[0])[0].replace(",","."))).filter(Number.isFinite);
    host.innerHTML=`<div class="pvp-log-summary"><b>Rozpoznane wzmianki:</b> ${Object.entries(counts).map(([k,v])=>`${escapeHtml(k)}: ${v}`).join(" · ")}<br>${turns.length?`Najwyższy numer tury: ${Math.max(...turns)}. `:""}${damage.length?`Rozpoznane wartości obrażeń: ${damage.length}, średnia ${Math.round(damage.reduce((a,b)=>a+b,0)/damage.length)}.`:"Brak jednoznacznych wartości obrażeń."}<div class="muted">Analizator liczy tylko to, co faktycznie występuje w tekście; nie uzupełnia brakujących eventów.</div></div>`;
  }

  function setupPvpLab() {
    pvpPopulateSelectors();
    ["pvp-sim-left","pvp-sim-right"].forEach(id=>el(id)?.addEventListener("change",pvpUpdateReadiness));
    el("pvp-sim-run")?.addEventListener("click",pvpRunSimulation);
    el("pvp-log-analyze")?.addEventListener("click",pvpAnalyzeLog);
  }


  let buildActiveTab="editor";

  function setBuildTab(tab,options={}) {
    const wanted=["editor","sim","public","mine"].includes(tab)?tab:"editor";
    buildActiveTab=wanted;

    const intro=el("build-editor-intro");
    const editor=el("build-editor");
    const publicSection=el("build-public-section");
    const mineSection=el("build-my-section");
    const simSection=el("pvp-simulator-section");

    if (intro) intro.hidden=wanted!=="editor";
    if (editor) editor.hidden=wanted!=="editor";
    if (publicSection) publicSection.hidden=wanted!=="public";
    if (mineSection) mineSection.hidden=wanted!=="mine";
    if (simSection) simSection.hidden=wanted!=="sim";

    document.querySelectorAll("[data-build-tab]").forEach(button=>{
      button.classList.toggle("active",button.dataset.buildTab===wanted);
      button.setAttribute("aria-selected",button.dataset.buildTab===wanted?"true":"false");
    });

    if (wanted==="sim") {
      pvpPopulateSelectors();
      pvpUpdateReadiness();
    }
    if ((wanted==="public" || wanted==="mine") && !options.noScroll) {
      renderBuildLists();
    }
  }

  function setupBuildCreator() {
    if (!el("build-attributes")) return;

    document.querySelectorAll("[data-build-tab]").forEach(button=>{
      button.addEventListener("click",()=>setBuildTab(button.dataset.buildTab));
    });
    setBuildTab("editor",{noScroll:true});

    el("build-new")?.addEventListener("click",newBuild);
    el("build-game-import")?.addEventListener("click",buildImportOfficialString);
    el("build-game-copy")?.addEventListener("click",buildCopyOfficialString);
    setupBuildPublicFilters();
    el("build-bonus-import")?.addEventListener("click",buildImportBonuses);
    el("build-bonus-clear")?.addEventListener("click",buildClearBonuses);

    [
      "build-combat-attack",
      "build-combat-defense",
      "build-combat-hp"
    ].forEach(id => {
      el(id)?.addEventListener("input",()=>{
        buildReadProfileInputs();
        renderBuildStats();
      });
    });

    el("build-setup-build-save")?.addEventListener("click",()=>{
      if (el("build-game-string")) el("build-game-string").value=el("build-setup-build-input")?.value||"";
      buildImportOfficialString();
      const ok=buildPointsUsed()>0;
      if (el("build-setup-build-status")) el("build-setup-build-status").textContent=ok?"✅ Build wczytany.":(el("build-game-string-status")?.textContent||"Nie udało się wczytać buildu.");
      if (ok) el("build-setup-build-dialog")?.close();
    });
    el("build-setup-bonuses-save")?.addEventListener("click",()=>{
      if (el("build-bonus-text")) el("build-bonus-text").value=el("build-setup-bonuses-input")?.value||"";
      buildImportBonuses();
      const ok=Boolean(buildState.profile?.bonusesConfirmed);
      if (el("build-setup-bonuses-status")) el("build-setup-bonuses-status").textContent=ok?"✅ Bonusy wczytane.":(el("build-bonus-status")?.textContent||"Nie udało się wczytać bonusów.");
      if (ok) el("build-setup-bonuses-dialog")?.close();
    });
    el("build-setup-combat-save")?.addEventListener("click",()=>{
      const copy=(target,source)=>{if(el(target)) el(target).value=el(source)?.value||"";};
      copy("build-combat-attack","build-setup-combat-attack");
      copy("build-combat-defense","build-setup-combat-defense");
      copy("build-combat-hp","build-setup-combat-hp");
      buildReadProfileInputs();
      renderBuildStats();
      const profile=buildProfileStats(buildState);
      const ok=Boolean(profile.provided?.combatAttack&&profile.provided?.combatDefense&&profile.provided?.combatHp);
      if (el("build-setup-combat-status")) el("build-setup-combat-status").textContent=ok?"✅ Statystyki zapisane.":"Podaj poprawne ATK, DEF i HP.";
      if (ok) el("build-setup-combat-dialog")?.close();
    });
    document.querySelectorAll("[data-build-setup-close]").forEach(button=>button.addEventListener("click",()=>button.closest("dialog")?.close()));

    el("build-combat-stats-help")?.addEventListener("click",()=>{
      el("build-combat-stats-tutorial")?.showModal();
    });
    el("build-combat-stats-tutorial-close")?.addEventListener("click",()=>{
      el("build-combat-stats-tutorial")?.close();
    });

    buildWriteProfileInputs(buildState.profile);

    el("build-save-private")?.addEventListener("click",()=>saveBuild(false));
    el("build-share-public")?.addEventListener("click",()=>saveBuild(true));
    setupPvpLab();

    renderBuildEditor();
  }


  // ============================================================
  // NAWIGACJA MODUŁOWA
  // ============================================================

  let activeToolModule = "";

  function showToolView(viewId,moduleName) {
    document.querySelectorAll(".view").forEach(view=>{
      view.hidden = view.id !== viewId;
    });

    document.querySelectorAll("[data-module]").forEach(button=>{
      button.classList.toggle("active",button.dataset.module===moduleName);
    });

    const distilleryTabs=el("distillery-tabs");
    const gangTabs=el("gang-tabs");
    const transientView =
      viewId === "home-view" ||
      viewId === "module-loading-view";

    activeToolModule =
      transientView
        ? ""
        : String(moduleName || "");

    if (distilleryTabs) {
      distilleryTabs.hidden =
        moduleName !== "distillery" ||
        transientView;
    }

    if (gangTabs) {
      gangTabs.hidden =
        moduleName !== "gang" ||
        !playerAccountSessionToken() ||
        viewId === "gang-gate-view" ||
        viewId === "gang-menu-view" ||
        transientView;
    }

    document.querySelectorAll("[data-gang-menu-target]").forEach(button=>{
      // showToolView() jest wywoływane bardzo często. Bez strażnika każde
      // wejście do dowolnego widoku dokładało kolejny handler do tych samych
      // przycisków menu Gangu, więc po dłuższej sesji jedno kliknięcie mogło
      // uruchamiać tę samą nawigację wielokrotnie.
      if (button.dataset.gangMenuBound === "1") return;
      button.dataset.gangMenuBound = "1";

      button.addEventListener("click",async ()=>{
        if (button.disabled) {
          return;
        }

        if (!playerAccountSessionToken()) {
          await openGangLanding();
          return;
        }

        await openGangModule(
          button.dataset.gangMenuTarget,
          {forceRefresh:true}
        );
      });
    });

  document.querySelectorAll("[data-subtab]").forEach(button=>{
      button.classList.toggle("active",button.dataset.subtab===viewId);
    });
  }

  function validateGangSessionInBackground() {
    const now =
      Date.now();

    // Nie sprawdzaj sesji przy każdym kliknięciu.
    // Jedno sprawdzenie maksymalnie raz na 60 sekund.
    if (
      now -
      gangSessionValidationAt <
      60000
    ) {
      return;
    }

    gangSessionValidationAt =
      now;

    playerAccountStatus()
      .then(account => {
        if (account) return;

        // Jeśli sesja faktycznie wygasła / została cofnięta,
        // backend potwierdzi to w tle i dopiero wtedy wracamy do bramki.
        el("gang-tabs").hidden =
          true;

        showToolView(
          "gang-gate-view",
          "gang"
        );
      })
      .catch(() => {
        // Błąd sieci nie blokuje lokalnej nawigacji.
      });
  }


  let runtimeLoaderTimer = null;
  let runtimeLoaderFunnyTimer = null;
  let runtimeLoaderProgress = 0;
  let runtimeLoaderActive = false;

  function runtimeLoaderStart() {
    // v20.51 — globalny pasek u góry został usunięty.
  }

  async function runtimeLoaderFinish() {
    // v20.51 — loadery są teraz lokalne dla modułów / przycisków.
  }

  async function withRuntimeLoader(
    promiseFactory,
    text,
    funnyText
  ) {
    runtimeLoaderStart(
      text,
      funnyText
    );

    try {
      return await promiseFactory();
    } finally {
      await runtimeLoaderFinish();
    }
  }


  function adminLoaderTexts(kind){
    const sets={
      paymentsPreview:["🔍 Sprawdzam dane wpłat...",[
        "🧾 Księgowy porównuje cyferki po raz trzeci...",
        "🪙 Liczę drobniaki spod biurka...",
        "🥫 Raport zaplątał się między puszkami...",
        "🍺 Kalkulator prosi o chwilę przerwy..."
      ]],
      paymentsImport:["✅ Wprowadzam dane wpłat...",[
        "💰 Księgowy przelicza wszystko jeszcze raz...",
        "🧮 Kalkulator dostał zadyszki...",
        "🥫 Wkładam wpłaty do właściwych przegródek...",
        "🍺 Ostatnia kontrola i lecimy dalej..."
      ]],
      playerAdd:["➕ Dodaję gracza...",[
        "👤 Szukam wolnego miejsca przy stole...",
        "🪑 Dosuwam krzesło dla nowego gracza...",
        "🥫 Sprawdzam, czy starczy puszek na powitanie...",
        "🍺 Kadry właśnie znalazły długopis..."
      ]],
      playerDelete:["🗑️ Usuwam gracza...",[
        "📦 Pakuję jego rzeczy do kartonu...",
        "🧹 Sprzątam po nim sesje i uprawnienia...",
        "🥫 Sprawdzam, czy nie zostawił puszek w szafce...",
        "🍺 Kadry wykreślają ostatnią rubrykę..."
      ]],
      poll:["📊 Aktualizuję ankietę...",[
        ['🗳️ Liczę głosy, nawet te oddane po pijaku...','📋 Komisja sprawdza ostatnią kartkę...','🥫 Głosy schowały się między puszkami...','🍺 Ankieta zaraz odzyska pion...'],
        "📋 Ankieta szuka pieczątki...",
        "🥫 Głosy rozsypały się między puszkami...",
        "🍺 Komisja wyborcza robi krótką przerwę..."
      ]],
      announcement:["📢 Aktualizuję ogłoszenia...",[
        "📯 Goniec chyba zasnął po drodze...",
        "📌 Szukam pinezki do ważnego ogłoszenia...",
        "🥫 Ogłoszenie utknęło pod stertą puszek...",
        "🍺 Tablica ogłoszeń właśnie trzeźwieje..."
      ]],
      goal:["🎯 Aktualizuję cel gangu...",[
        "🎯 Cel się przesunął, już go łapię...",
        "📏 Mierzę postęp jeszcze raz...",
        ['🥫 Zbieram puszki na realizację celu...','🎯 Cel ucieka, ale już go doganiam...','📏 Mierzę postęp linijką z magazynu...','🍺 Motywacja jeszcze się ładuje...'],
        "🍺 Motywacja przyszła, ale trochę chwiejnym krokiem..."
      ]],
      reservation:["🧪 Aktualizuję rezerwacje...",[
        "🧪 Destylator przestawia karteczki na beczkach...",
        "🥫 Rezerwacja zgubiła się między puszkami...",
        "📋 Sprawdzam, kto zaklepał którą receptę...",
        "🍺 Laborant wraca za moment..."
      ]],
      company:["🏢 Aktualizuję Spółkę...",[
        ['💸 Księgowy zgubił kalkulator, już szukam...','🧮 Kalkulator chyba poszedł na przerwę...','🥫 Liczę fundusz na puszkach...','🍺 Zarząd obiecuje, że to już chwila...'],
        "🧾 Udziały układają się w równy stos...",
        "🥫 Fundusz liczy puszki po raz ostatni...",
        "🍺 Zarząd ma właśnie bardzo krótkie zebranie..."
      ]],
      salaryPlan:["💰 Zapisuję plan pensji...",[
        "🧾 Sprawdzam, czy wszystkie koperty się zgadzają...",
        "🍺 Księgowy przysięga, że tym razem dobrze policzył...",
        "🥫 Ostatnia pensja schowała się między puszkami...",
        "💸 Zamykam kasę przed wypłatą o trzeciej..."
      ]],
      sessions:["📱 Aktualizuję sesje gracza...",[
        "📱 Szukam telefonu, który jeszcze się nie wylogował...",
        "🔑 Zbieram porzucone klucze do sesji...",
        "🥫 Jedna sesja schowała się za puszką...",
        "🍺 Ostatnie urządzenie właśnie dostało wypowiedzenie..."
      ]]
    };

    const set=sets[kind]||[
      "⏳ Wykonuję operację...",
      [
        "🥫 Serwer szuka ostatniej puszki...",
        "🍺 Backend robi małą przerwę...",
        "🧹 Odkurzam dane...",
        "🥴 Jeszcze chwila..."
      ]
    ];

    runtimeLoaderStart(
      set[0],
      set[1]
    );
  }


  let gangMenuStatusInFlight = null;

  function setGangOptionalButtonState(
    target,
    enabled,
    emptyText
  ) {
    const selectors = [
      `[data-gang-menu-target="${target}"]`,
      `[data-subtab="${target}"][data-group="gang"]`
    ];

    selectors.forEach(selector => {
      document
        .querySelectorAll(selector)
        .forEach(button => {
          button.disabled = !enabled;
          button.classList.toggle(
            "gang-option-empty",
            !enabled
          );

          if (
            button.matches("[data-gang-menu-target]")
          ) {
            const small =
              button.querySelector("small");

            if (small) {
              if (!small.dataset.defaultText) {
                small.dataset.defaultText =
                  small.textContent || "";
              }

              small.textContent =
                enabled
                  ? small.dataset.defaultText
                  : emptyText;
            }
          }

          button.title =
            enabled
              ? ""
              : emptyText;
        });
    });
  }


  function setGangOptionalButtonsChecking() {
    [
      ["polls-view","Sprawdzam, czy są ankiety..."],
      ["goals-view","Sprawdzam, czy jest aktywny cel..."],
      ["announcements-view","Sprawdzam, czy są ogłoszenia..."]
    ].forEach(([target,text]) => {
      setGangOptionalButtonState(
        target,
        false,
        text
      );
    });
  }


  function applyGangMenuStatus(payload) {
    const pollsCount =
      Math.max(
        0,
        Number(payload && payload.pollsCount) || 0
      );

    const announcementsCount =
      Math.max(
        0,
        Number(payload && payload.announcementsCount) || 0
      );

    const hasGoal =
      Boolean(payload && payload.hasGoal);

    setGangOptionalButtonState(
      "polls-view",
      pollsCount > 0,
      "Brak ankiet."
    );

    setGangOptionalButtonState(
      "goals-view",
      hasGoal,
      "Brak aktywnego celu."
    );

    setGangOptionalButtonState(
      "announcements-view",
      announcementsCount > 0,
      "Brak ogłoszeń."
    );
  }


  async function loadGangMenuStatus() {
    if (gangMenuStatusInFlight) {
      return gangMenuStatusInFlight;
    }

    gangMenuStatusInFlight = (async () => {
      const token =
        playerAccountSessionToken();

      if (!token) {
        return null;
      }

      try {
        const payload =
          await jsonp(
            "gangMenuStatus",
            {sessionToken:token}
          );

        if (
          !payload ||
          !payload.ok
        ) {
          if (
            payload &&
            payload.authRequired
          ) {
            setPlayerAccountSessionToken("");
          }

          return null;
        }

        applyGangMenuStatus(payload);
        return payload;

      } catch (err) {
        console.warn(
          "[MenelWars Tools] Status menu Gangu:",
          err
        );

        // Przy błędzie nie blokujemy funkcji na stałe.
        // Użytkownik może spróbować ponownie wejść do Gangu.
        return null;
      }
    })();

    try {
      return await gangMenuStatusInFlight;
    } finally {
      gangMenuStatusInFlight = null;
    }
  }

  let gangEasterNavigationSequence = [];
  let gangEasterNavigationOpen = false;

  function gangTrackIndecisiveEasterEgg(target) {
    if (!gangEasterNavigationOpen) return;
    const expected=["company-view","payments-view","company-view","payments-view","company-view","payments-view"];
    if (target===expected[gangEasterNavigationSequence.length]) {
      gangEasterNavigationSequence.push(target);
      if (gangEasterNavigationSequence.length===expected.length) {
        gangEasterNavigationOpen=false;
        gangEasterNavigationSequence=[];
        achievementTrack(["easter_indecisive_president"]);
      }
      return;
    }
    gangEasterNavigationSequence=target==="company-view" ? [target] : [];
  }

  async function openGangLanding() {
    if (!playerAccountSessionToken()) {
      if (el("gang-tabs")) {
        el("gang-tabs").hidden = true;
      }

      showToolView(
        "gang-gate-view",
        "gang"
      );
      return;
    }

    if (el("gang-tabs")) {
      el("gang-tabs").hidden = true;
    }

    showToolView(
      "gang-menu-view",
      "gang"
    );

    setGangOptionalButtonsChecking();

    // Zapotrzebowanie pobieramy od razu po wejściu do Gangu, równolegle ze
    // statusem menu. Późniejsze otwarcie kafelka pokazuje gotowy cache.
    const demandPrefetch=loadGangDemandGlobal({force:true}).catch(()=>null);
    const gangMenuStatus=await loadGangMenuStatus();
    demandPrefetch.catch(()=>{});
    if (gangMenuStatus) {
      gangEasterNavigationSequence=[];
      gangEasterNavigationOpen=true;
      achievementTrack(["gang_login"]);
    }

    if (!playerAccountSessionToken()) {
      if (el("gang-tabs")) {
        el("gang-tabs").hidden = true;
      }

      showToolView(
        "gang-gate-view",
        "gang"
      );
    }
  }


  async function openGangModule(
    target="payments-view",
    options={}
  ) {
    if (!playerAccountSessionToken()) {
      el("gang-tabs").hidden = true;
      showToolView("gang-gate-view","gang");
      return;
    }

    const forceRefresh =
      Boolean(options.forceRefresh);

    const isPaymentsOrCompany =
      target === "payments-view" ||
      target === "company-view";

    // Zapotrzebowanie jest prostą listą. Otwieramy ją natychmiast, a odczyt
    // serwera działa w tle — awaria nie może zatrzymać całej zakładki Gangu.
    if (target === "demand-view") {
      el("gang-tabs").hidden = false;
      showToolView("demand-view","gang");
      gangTrackIndecisiveEasterEgg(target);
      const list=el("gang-demand-list");
      if (!gangDemandCacheGlobal && list) {
        // Nie zostawiamy niekończącego się loadera. Odczyt w tle nadpisze
        // ten stan prawdziwą listą lub czytelnym błędem.
        renderGangDemandGlobal({entries:[]});
      }
      loadGangDemandGlobal({force:false}).catch(()=>{});
      validateGangSessionInBackground();
      return;
    }

    // v20.71:
    // Wpłaty i Spółka są renderowane z tego samego payloadu.
    // Jeśli został już pobrany w tej sesji, samo przełączenie zakładki
    // nie wykonuje kolejnego requestu ani nie pokazuje ekranu ładowania.
    if (
      isPaymentsOrCompany &&
      latestGangPayload
    ) {
      el("gang-tabs").hidden = false;

      renderGangPayload(
        latestGangPayload
      );

      showToolView(
        target,
        "gang"
      );
      gangTrackIndecisiveEasterEgg(target);

      const payloadAge =
        Date.now() - latestGangPayloadAt;

      // v20.72 — stale-while-revalidate:
      // < 10 min: przełączanie bez requestu.
      // >= 10 min: stary widok pokazujemy od razu,
      // a świeże dane pobieramy po cichu w tle.
      if (
        forceRefresh ||
        !latestGangPayloadAt ||
        payloadAge >= GANG_PAYLOAD_TTL_MS
      ) {
        loadPayments({
          background:true,
          force:true
        }).catch(error => {
          console.warn(
            "Nie udało się odświeżyć payloadu Gangu w tle:",
            error
          );
        });
      }

      validateGangSessionInBackground();
      return;
    }

    const labels = {
      "payments-view":"💰 Ładowanie Wpłat...",
      "company-view":"🏢 Ładowanie Spółki...",
      "polls-view":"📊 Ładowanie Ankiet...",
      "goals-view":"🎯 Ładowanie Celów...",
      "announcements-view":"📢 Ładowanie Ogłoszeń...",
      "demand-view":"📦 Ładowanie zapotrzebowania..."
    };

    showModuleLoading(
      "gang",
      labels[target] || "👥 Ładowanie Gangu...",
      forceRefresh
        ? "Odświeżam dane tego modułu."
        : "Pobieram aktualne dane tego modułu."
    );

    const requests = [];

    if (isPaymentsOrCompany) {
      requests.push(
        loadPayments({
          background:true,
          force:forceRefresh
        })
      );
    }

    if (target === "polls-view") {
      requests.push(loadGangPolls());
    }

    if (target === "goals-view") {
      requests.push(loadGangGoal());
    }

    if (target === "announcements-view") {
      requests.push(loadGangAnnouncements());
    }

    if (target === "demand-view") {
      requests.push(loadGangDemandGlobal({force:forceRefresh}));
    }

    const gangLoadKey = isPaymentsOrCompany ? "payments-company" : target;

    if (!moduleOpenInFlight.gang[gangLoadKey]) {
      moduleOpenInFlight.gang[gangLoadKey] =
        Promise.allSettled(requests);
    }

    try {
      await moduleOpenInFlight.gang[gangLoadKey];
    } finally {
      moduleOpenInFlight.gang[gangLoadKey] = null;
    }

    if (!playerAccountSessionToken()) {
      el("gang-tabs").hidden = true;
      showToolView("gang-gate-view","gang");
      return;
    }

    el("gang-tabs").hidden = false;
    showToolView(target,"gang");
    gangTrackIndecisiveEasterEgg(target);

    if (
      latestGangPayload &&
      isPaymentsOrCompany
    ) {
      renderGangPayload(
        latestGangPayload
      );
    }

    validateGangSessionInBackground();
  }

  document.querySelectorAll("[data-module]").forEach(button=>{
    button.addEventListener("click",async ()=>{
      const moduleName=button.dataset.module;

      if (moduleName === "distillery") {
        await openDistilleryModule(
          "optimizer-view",
          {forceRefresh:true}
        );
        return;
      }

      if (moduleName === "garden") {
        await openGardenModule();
        return;
      }

      if (moduleName === "gang") {
        await openGangLanding();
        return;
      }

      if (moduleName === "builds") {
        await openBuildModule();
        return;
      }

      if (moduleName === "map") {
        await openMapModule();
        return;
      }

      if (moduleName === "account") {
        showModuleLoading(
          "account",
          "👤 Ładowanie Konta...",
          "Pobieram aktualny stan konta i uprawnienia."
        );

        await renderAccountView({
          force:true
        });

        showToolView("account-view","account");
      }
    });
  });

  document.querySelectorAll("[data-subtab]").forEach(button=>{
    button.addEventListener("click",async ()=>{
      if (button.disabled) {
        return;
      }

      const viewId=button.dataset.subtab;
      const group=button.dataset.group;

      if (group === "gang") {
        await openGangModule(viewId,{forceRefresh:true});
        return;
      }

      await openDistilleryModule(viewId,{forceRefresh:true});
    });
  });

  el("gang-go-account")?.addEventListener("click",async ()=>{
    showModuleLoading(
      "account",
      "👤 Ładowanie Konta...",
      "Pobieram aktualny stan konta i uprawnienia."
    );

    await renderAccountView({
      force:true
    });

    showToolView("account-view","account");
  });

// ============================================================
  // START — tylko sprawdzenie konta
  // ============================================================

  async function preloadApplicationData() {
    let account = null;

    try {
      if (playerAccountSessionToken()) {
        const homeAccountState=el("home-account-state");
        if (homeAccountState) {
          homeAccountState.className="submit-info";
          homeAccountState.textContent="⏳ Weryfikuję zapisaną sesję w tle — możesz już korzystać z Toola.";
        }
        // Ekran startowy nie może czekać na dwie długie próby JSONP.
        // Weryfikacja biegnie dalej w tle, ale po 3 s pokazujemy uczciwy
        // komunikat zamiast pozostawić "Sprawdzam konto..." bez końca.
        const statusPromise=playerAccountStatus({force:true});
        const earlyResult=await Promise.race([
          statusPromise,
          new Promise(resolve=>setTimeout(()=>resolve("pending"),3000))
        ]);
        if (earlyResult === "pending") {
          const homeAccountState=el("home-account-state");
          if (homeAccountState) {
            homeAccountState.className="submit-info";
            homeAccountState.textContent="⏳ Weryfikuję sesję w tle — możesz już korzystać z Toola.";
          }
          statusPromise.then(updateHomeAccountState).catch(()=>updateHomeAccountState(null));
          return;
        }
        account=earlyResult;
      }
    } catch (err) {
      console.warn(
        "[MenelWars Tools] Sprawdzanie konta:",
        err
      );
    }

    updateHomeAccountState(account);
  }


// ============================================================
  // START
  // ============================================================

setupSubmissionForm();
setupRecipeBatchImport();
setupBuildCreator();
  setupGarden();
setupPayments();
setupGangDemand();
setupAdmin();

showToolView("home-view", "");
if (el("admin-view")) el("admin-view").hidden = true;

preloadApplicationData();
fetchModuleAccessPolicy().catch(()=>{});


  // ============================================================
  // v21.00 — JEDEN WSPÓLNY TICKER + JEDEN REFRESH PO POWROCIE
  // ============================================================

  const APP_TICK_MS = 5 * 1000;
  const DISTILLERY_LIVE_REFRESH_MS = 20 * 1000;
  const ADMIN_ACCOUNT_BADGE_REFRESH_MS = 60 * 1000;

  const appRefreshAt = {
    garden:0,
    distillery:0,
    account:0
  };

  let activeModuleReturnRefreshAt = 0;
  let activeModuleReturnRefreshInFlight = null;

  async function refreshAdminBadgeOnAccount() {
    if (
      activeToolModule !== "account" ||
      document.visibilityState !== "visible" ||
      !cachedAccountStatus ||
      !cachedAccountStatus.admin
    ) {
      return;
    }

    try {
      await loadAdminDashboardStatus();
    } catch (err) {
      console.warn(
        "[MenelWars Tools] Odświeżanie badge Admina:",
        err
      );
    }
  }

  async function refreshActiveDistilleryInBackground() {
    if (
      activeToolModule !== "distillery" ||
      document.visibilityState !== "visible" ||
      !distilleryDataLoaded ||
      !backendConfigured() ||
      approvedRecipesInFlight
    ) {
      return;
    }

    try {
      await fetchApprovedRecipes({force:true});
    } catch (err) {
      console.warn(
        "[MenelWars Tools] Odświeżanie Destylarni w tle:",
        err
      );
    }
  }

  function currentVisibleViewId() {
    const view = Array.from(document.querySelectorAll(".view"))
      .find(item => !item.hidden);
    return view ? view.id : "";
  }

  async function refreshActiveGangView() {
    if (activeToolModule !== "gang" || !playerAccountSessionToken()) return;

    const viewId = currentVisibleViewId();

    if (viewId === "payments-view" || viewId === "company-view") {
      await loadPayments({background:true,force:true});
      return;
    }

    if (viewId === "polls-view") {
      await loadGangPolls({force:true});
      return;
    }

    if (viewId === "goals-view") {
      await loadGangGoal();
      return;
    }

    if (viewId === "announcements-view") {
      await loadGangAnnouncements();
      return;
    }

    if (viewId === "demand-view") {
      await loadGangDemandGlobal({force:true});
      return;
    }

    if (viewId === "gang-menu-view") {
      await loadGangMenuStatus();
    }
  }

  async function refreshActiveModuleOnReturn() {
    if (document.visibilityState !== "visible") return;

    const now = Date.now();
    if (now - activeModuleReturnRefreshAt < 750) {
      return activeModuleReturnRefreshInFlight;
    }
    activeModuleReturnRefreshAt = now;

    if (activeModuleReturnRefreshInFlight) {
      return activeModuleReturnRefreshInFlight;
    }

    activeModuleReturnRefreshInFlight = (async () => {
      try {
        await fetchModuleAccessPolicy({force:true});

        if (activeToolModule === "garden") {
          appRefreshAt.garden = Date.now();
          await gardenLiveRefresh();
          gardenUpdateClock();
          gardenRenderPlots();
          return;
        }

        if (activeToolModule === "distillery") {
          appRefreshAt.distillery = Date.now();
          await refreshActiveDistilleryInBackground();
          return;
        }

        if (activeToolModule === "builds") {
          await fetchBuildLists(true);
          renderBuildLists();
          return;
        }

        if (activeToolModule === "gang") {
          await refreshActiveGangView();
          return;
        }

        if (activeToolModule === "account") {
          appRefreshAt.account = Date.now();
          if (!adminPanelIsOpen()) {
            await renderAccountView({force:true});
          }
          await refreshAdminBadgeOnAccount();
        }
      } catch (err) {
        console.warn("[MenelWars Tools] Odświeżenie po powrocie:",err);
      } finally {
        activeModuleReturnRefreshInFlight = null;
      }
    })();

    return activeModuleReturnRefreshInFlight;
  }

  async function globalApplicationTick() {
    if (document.visibilityState !== "visible") return;

    const now = Date.now();

    if (activeToolModule === "garden") {
      gardenUpdateClock();
      if (!gardenOwnExperimentForPlot(gardenSelectedPlot)) {
        gardenRenderComboStatus();
      }

      if (now - appRefreshAt.garden >= APP_TICK_MS) {
        appRefreshAt.garden = now;
        await gardenLiveRefresh();
      }
      return;
    }

    if (
      activeToolModule === "distillery" &&
      now - appRefreshAt.distillery >= DISTILLERY_LIVE_REFRESH_MS
    ) {
      appRefreshAt.distillery = now;
      await refreshActiveDistilleryInBackground();
      return;
    }

    if (
      activeToolModule === "account" &&
      now - appRefreshAt.account >= ADMIN_ACCOUNT_BADGE_REFRESH_MS
    ) {
      appRefreshAt.account = now;
      await refreshAdminBadgeOnAccount();
    }
  }

  setInterval(globalApplicationTick,APP_TICK_MS);

  document.addEventListener("visibilitychange",()=>{
    if (document.visibilityState === "visible") {
      refreshActiveModuleOnReturn();
    }
  });

  window.addEventListener("focus",()=>{
    refreshActiveModuleOnReturn();
  });


  // ============================================================
  // v20.96 — MOBILE: stabilny nagłówek podczas klawiatury ekranowej
  // ============================================================

  function mobileFormFocusTarget(target) {
    return Boolean(
      target &&
      target.matches &&
      target.matches('input, textarea, select, [contenteditable="true"]')
    );
  }

  function updateMobileFormFocusState() {
    const mobile = window.matchMedia('(max-width:700px)').matches;
    const focused = mobileFormFocusTarget(document.activeElement);
    document.body.classList.toggle('mobile-form-focus',mobile && focused);
  }

  document.addEventListener('focusin',event => {
    if (!mobileFormFocusTarget(event.target)) return;
    updateMobileFormFocusState();
  });

  document.addEventListener('focusout',() => {
    // Android potrafi przełączyć focus dopiero po schowaniu klawiatury,
    // dlatego sprawdzamy aktywny element w następnym kroku event loop.
    setTimeout(updateMobileFormFocusState,0);
  });

  window.addEventListener('resize',updateMobileFormFocusState);

  // ============================================================
  // INSTALACJA PWA
  // ============================================================

  let deferredPrompt = null;

  window.addEventListener(
    "beforeinstallprompt",
    e => {

      e.preventDefault();

      deferredPrompt = e;

      el("install-btn").hidden =
        false;
    }
  );

  el("install-btn")
    .addEventListener(
      "click",
      async () => {

        if (!deferredPrompt) {
          return;
        }

        deferredPrompt.prompt();

        await deferredPrompt.userChoice;

        deferredPrompt = null;

        el("install-btn").hidden =
          true;
      }
    );

  window.addEventListener(
    "appinstalled",
    () => {
      el("install-btn").hidden = true;
    }
  );


  // ============================================================
  // ONLINE / OFFLINE
  // ============================================================

  function onlineState() {

    el("net-state").textContent =
      navigator.onLine
        ? "online"
        : "offline";

    el("net-state").classList.toggle(
      "offline",
      !navigator.onLine
    );
  }

  addEventListener(
    "online",
    onlineState
  );

  addEventListener(
    "offline",
    onlineState
  );

  onlineState();


  // ============================================================
  // v21.00 — PWA: widoczna informacja o nowej wersji
  // ============================================================

  let pwaReloadingForUpdate = false;

  function showPwaUpdateBanner(registration) {
    if (!registration || !registration.waiting) return;
    if (document.querySelector(".pwa-update-banner")) return;

    const banner = document.createElement("div");
    banner.className = "pwa-update-banner";
    banner.setAttribute("role","status");
    banner.innerHTML = `
      <span>🆕 Dostępna jest nowa wersja MenelWars Tools.</span>
      <button type="button" class="primary-btn">Odśwież</button>
    `;

    banner.querySelector("button")?.addEventListener("click",()=>{
      const waiting = registration.waiting;
      if (!waiting) {
        location.reload();
        return;
      }
      waiting.postMessage({type:"SKIP_WAITING"});
    });

    document.body.appendChild(banner);
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange",()=>{
      if (pwaReloadingForUpdate) return;
      pwaReloadingForUpdate = true;
      location.reload();
    });

    navigator.serviceWorker
      .register("./sw.js")
      .then(registration => {
        registration.update().catch(()=>{});

        if (registration.waiting) {
          showPwaUpdateBanner(registration);
        }

        registration.addEventListener("updatefound",()=>{
          const worker = registration.installing;
          if (!worker) return;

          worker.addEventListener("statechange",()=>{
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              showPwaUpdateBanner(registration);
            }
          });
        });
      })
      .catch(error => {
        console.warn("[MenelWars Tools] Service Worker:",error);
      });
  }

})();
