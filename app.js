
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

      const result =
        await jsonp(
          "reserveRecipe",
          {
            nick:cleanNick,
            baza:recipe.baza,
            drozdze:recipe.drozdze,
            woda:recipe.woda,
            program:recipe.program,
            ownerToken:
              owner &&
              owner.token
                ? owner.token
                : "",
            sessionToken:
              accountNick
                ? playerAccountSessionToken()
                : ""
          }
        );

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

    try {
      await fetch(
        BACKEND_URL,
        {
          method:"POST",
          mode:"no-cors",
          headers:{
            "Content-Type":
              "text/plain;charset=UTF-8"
          },
          body:
            JSON.stringify({
              action:
                "submitReservedRecipe",
              nonce,
              ownerToken:
                owner &&
                owner.token
                  ? owner.token
                  : "",
              sessionToken:
                accountOwner
                  ? playerAccountSessionToken()
                  : "",
              baza:recipe.baza,
              drozdze:recipe.drozdze,
              woda:recipe.woda,
              program:recipe.program,
              litry
            })
        }
      );

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
        throw new Error(
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
    }
  }


  function renderUnknown(data) {

    const allUnknown = data.unknown;

    const inProgress = allUnknown
      .filter(recipe => Boolean(recipeReservationFor(recipe)));

    const freeAll = allUnknown
      .filter(recipe => !recipeReservationFor(recipe));

    setupUnknownRecipeFilters();

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

  const container =
    el("map-list");

  const markers =
    MAP
      .map(
        ([district, action, icon]) => {

          const position =
            MAP_POSITIONS[district];

          if (!position) {
            return "";
          }

          const known =
            Boolean(action);

          return `
            <div
              style="
                position:absolute;
                left:${position.x}%;
                top:${position.y}%;
                transform:translate(-50%, 0);
                z-index:2;

                padding:2px 5px;
                border-radius:6px;

                background:${
                  known
                    ? "rgba(255,248,230,.92)"
                    : "rgba(255,238,238,.94)"
                };

                border:1px solid ${
                  known
                    ? "rgba(95,70,40,.55)"
                    : "rgba(180,80,80,.65)"
                };

                box-shadow:
                  0 1px 3px rgba(0,0,0,.25);

                font-size:10px;
                font-weight:700;
                line-height:1.15;
                white-space:nowrap;

                color:${
                  known
                    ? "#3d3022"
                    : "#9a2f2f"
                };

                pointer-events:none;
              "
            >
              ${icon}
              ${escapeHtml(
                action || "Nieodkryte"
              )}
            </div>
          `;
        }
      )
      .join("");


  container.innerHTML = `

    <div
      style="
        max-width:420px;
        margin:0 auto;
      "
    >

      <div
        style="
          position:relative;
          width:100%;
        "
      >

        <img
          src="mapa-warszawa.png"
          alt="Mapa dzielnic"
          style="
            display:block;
            width:100%;
            height:auto;
            border-radius:8px;
          "
        >

        ${markers}

      </div>


      <div
        style="
          margin-top:12px;
          padding:8px 10px;
          border-radius:8px;
          background:#f8f0df;
          border:1px solid #d8c49f;
          font-size:12px;
          line-height:1.5;
          text-align:center;
        "
      >
        ⚪ Neutralny
        &nbsp;·&nbsp;
        🙏 Błagalny
        &nbsp;·&nbsp;
        🤝 Przyjacielski
        &nbsp;·&nbsp;
        ⚔️ Agresywny
      </div>

    </div>
  `;
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

    try {

      // no-cors pozwala wysłać dane do Apps Script
      // bez proszenia użytkownika o konto Google.
      await fetch(
        BACKEND_URL,
        {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type":
              "text/plain;charset=UTF-8"
          },
          body:
            JSON.stringify(payload)
        }
      );

      status.innerHTML =
        "✅ Zgłoszenie wysłane do weryfikacji.";

      el("submit-liters").value = "";
      el("submit-notes").value = "";

    } catch (err) {

      status.textContent =
        "Nie udało się wysłać zgłoszenia. Sprawdź internet.";
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

      if (cols.length < 5) {
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

    try {
      await fetch(
        BACKEND_URL,
        {
          method:"POST",
          mode:"no-cors",
          headers:{"Content-Type":"text/plain;charset=UTF-8"},
          body:JSON.stringify({
            action:"submitRecipeBatch",
            nonce,
            nick,
            items
          })
        }
      );

      let result = null;

      for (let attempt=0; attempt<20; attempt++) {
        if (attempt > 0) await new Promise(resolve => setTimeout(resolve,350));
        result = await jsonp("recipeBatchImportResult",{nonce});
        if (result && !result.pending) break;
      }

      if (!result || result.pending) {
        throw new Error("Serwer nie zwrócił wyniku importu.");
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
      await fetchApprovedRecipes({force:true});

    } catch (err) {
      status.textContent = err && err.message
        ? err.message
        : "Nie udało się wysłać importu.";
    } finally {
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
  let mapModuleLoaded = false;

  const moduleOpenInFlight = {
    distillery:null,
    gang:null,
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
    builds:false,
    map:false
  };

  let moduleAccessPolicyAt = 0;
  let moduleAccessPolicyInFlight = null;

  const MODULE_ACCESS_POLICY_TTL_MS =
    30 * 1000;

  async function fetchModuleAccessPolicy(
    options={}
  ) {
    const force =
      Boolean(options.force);

    if (
      !force &&
      moduleAccessPolicyAt &&
      Date.now() - moduleAccessPolicyAt <
        MODULE_ACCESS_POLICY_TTL_MS
    ) {
      return moduleAccessPolicyCache;
    }

    if (moduleAccessPolicyInFlight) {
      return moduleAccessPolicyInFlight;
    }

    moduleAccessPolicyInFlight =
      (async () => {
        try {
          const payload =
            await jsonp(
              "moduleAccessPolicy",
              {}
            );

          if (
            payload &&
            payload.ok &&
            payload.policy
          ) {
            moduleAccessPolicyCache = {
              distillery:
                Boolean(
                  payload.policy.distillery
                ),
              builds:
                Boolean(
                  payload.policy.builds
                ),
              map:
                Boolean(
                  payload.policy.map
                )
            };

            moduleAccessPolicyAt =
              Date.now();
          }
        } catch (err) {
          console.warn(
            "[MenelWars Tools] Ustawienia dostępu do modułów:",
            err
          );
        } finally {
          moduleAccessPolicyInFlight =
            null;
        }

        return moduleAccessPolicyCache;
      })();

    return moduleAccessPolicyInFlight;
  }

  const MODULE_ACCESS_LABELS = {
    distillery:"Destylarnia",
    builds:"Buildy",
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
    moduleName
  ) {
    const policy =
      await fetchModuleAccessPolicy();

    if (
      !policy ||
      !policy[moduleName]
    ) {
      return true;
    }

    const account =
      await playerAccountStatus();

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
    if (
      !(await ensureModuleAccess(
        "distillery"
      ))
    ) {
      return;
    }

    const forceRefresh =
      Boolean(options.forceRefresh);

    if (
      distilleryDataLoaded &&
      !forceRefresh
    ) {
      showToolView(target,"distillery");
      return;
    }

    if (moduleOpenInFlight.distillery) {
      await moduleOpenInFlight.distillery;
      showToolView(target,"distillery");
      return;
    }

    showModuleLoading(
      "distillery",
      "⚗ Ładowanie Destylarni...",
      "Pobieram aktualne receptury i rezerwacje."
    );

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
    if (
      !(await ensureModuleAccess(
        "map"
      ))
    ) {
      return;
    }

    showModuleLoading(
      "map",
      "🗺 Ładowanie mapy...",
      "Przygotowuję mapę i oznaczenia dzielnic."
    );

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

  function jsonp(action, params={}) {

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

    await timedBackendPost(
      action,
      {
        action,
        nonce,
        ...data
      }
    );

    let result = null;
    for (let i=0;i<20;i++) {
      await new Promise(resolve => setTimeout(resolve,350));
      result = await jsonp("playerAccountActionResult",{nonce});
      if (result && !result.pending) break;
    }

    if (!result || result.pending) throw new Error("Serwer nie zwrócił wyniku operacji.");
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

    if (
      !force &&
      cachedAccountStatus &&
      cachedAccountStatusToken === token &&
      Date.now() - cachedAccountStatusAt < 60000
    ) {
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
        return result;

      } catch (err) {
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

  async function renderAccountView(options={}) {
    const forceRefresh =
      Boolean(options.force);

    const box = el("account-content");
    const status = el("account-status");
    const adminHost = el("account-admin-host");
    if (!box) return;

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

    box.innerHTML = `
      <div class="account-card logged">
        <b>👤 ${escapeHtml(account.nick)}</b>
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

          try {
          adminLoaderTexts(
            "sessions"
          );
            await fetch(
              BACKEND_URL,
              {
                method:"POST",
                mode:"no-cors",
                headers:{
                  "Content-Type":
                    "text/plain;charset=UTF-8"
                },
                body:
                  JSON.stringify({
                    action:
                      "playerAccountLogoutOtherSessions",
                    sessionToken:
                      playerAccountSessionToken()
                  })
              }
            );

            status.textContent =
              "✅ Pozostałe sesje zostały wylogowane.";

            await renderAccountView();

          } catch (err) {
            status.textContent =
              err.message ||
              "Nie udało się wylogować innych sesji.";
          } finally {
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
      try {
        await fetch(BACKEND_URL,{
          method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=UTF-8"},
          body:JSON.stringify({action:"playerAccountBootstrapAdmin",legacyAdminPassword:password,sessionToken:playerAccountSessionToken()})
        });
        await new Promise(resolve=>setTimeout(resolve,600));
        const refreshed=await playerAccountStatus();
        if (!refreshed || !refreshed.admin) throw new Error("Nie udało się nadać uprawnień. Sprawdź stare hasło Admina.");
        status.textContent="✅ Konto otrzymało uprawnienia administratora.";
        await renderAccountView();
      } catch(err) { status.textContent=err.message || "Nie udało się nadać uprawnień."; }
      finally { clearActionLoading(button); }
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
                await timedBackendPost(
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
                }
              );

              accountAdminPlayersCacheAt = 0;

              // Bez sztucznego dodatkowego 400 ms.
              loadAccountAdminPermissions({
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
                await timedBackendPost(
                "accountAdminLogoutAll",
                {
                  action:
                    "accountAdminLogoutAll",
                  sessionToken:
                    playerAccountSessionToken(),
                  nick
                }
              );

              accountAdminPlayersCacheAt = 0;

              loadAccountAdminPermissions({
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

    await fetch(
      BACKEND_URL,
      {
        method:"POST",
        mode:"no-cors",
        headers:{
          "Content-Type":
            "text/plain;charset=UTF-8"
        },
        body:
          JSON.stringify({
            action,
            nonce,
            ...data
          })
      }
    );

    let result = null;

    for (
      let attempt=0;
      attempt<20;
      attempt++
    ) {
      await new Promise(
        resolve =>
          setTimeout(resolve,350)
      );

      result =
        await jsonp(
          "playerIdentityActionResult",
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
      throw new Error(
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

    await fetch(
      BACKEND_URL,
      {
        method:"POST",
        mode:"no-cors",
        headers:{
          "Content-Type":
            "text/plain;charset=UTF-8"
        },
        body:
          JSON.stringify({
            action,
            nonce,
            ...data
          })
      }
    );

    let result = null;

    for (
      let attempt=0;
      attempt<20;
      attempt++
    ) {
      await new Promise(
        resolve =>
          setTimeout(resolve,350)
      );

      result =
        await jsonp(
          "companySalaryActionResult",
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
      throw new Error(
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

      await fetch(
        BACKEND_URL,
        {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "text/plain;charset=UTF-8"
          },
          body: JSON.stringify({
            action: "gangLogin",
            nonce,
            password
          })
        }
      );

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
        throw new Error(
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
const GANG_PAYLOAD_TTL_MS = 10 * 60 * 1000;
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
  body
) {
  const startedAt =
    requestTimingNow();

  try {
    const result =
      await fetch(
        BACKEND_URL,
        {
          method:"POST",
          mode:"no-cors",
          headers:{
            "Content-Type":
              "text/plain;charset=UTF-8"
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

    throw err;
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
  adminClearAllReservations:"🧹 Czyszczę rezerwacje…",
  adminRenamePlayer:"✏️ Zmieniam nick gracza…"
};

async function adminPostAction(action, data={}) {
  const token = adminToken();

  if (!token) {
    showAdminLogin();
    throw new Error("Brak sesji administratora.");
  }

  const criticalTitle =
    ADMIN_CRITICAL_ACTIONS[action] || "";

  if (criticalTitle) {
    criticalOperationStart(
      criticalTitle,
      "Zapisuję zmianę. Poczekaj na potwierdzenie serwera."
    );
  }

  try {
    await timedBackendPost(
      action,
      {
        action,
        token,
        ...data
      }
    );

    // Apps Script + no-cors: krótki bufor przed odczytem świeżego stanu.
    await new Promise(resolve => setTimeout(resolve, 350));
  } finally {
    // Overlay dotyczy samego zapisu. Dalsze GET-y mogą odświeżyć widoki
    // bez niepotrzebnego blokowania całej aplikacji.
    if (criticalTitle) {
      criticalOperationFinish();
    }
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
        "builds",
        "🛠 Buildy",
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

  criticalOperationStart(
    loadingText,
    "Poczekaj aż receptura zostanie zapisana i lista odświeżona."
  );


  try {

    await fetch(
      BACKEND_URL,
      {
        method: "POST",
        mode: "no-cors",

        headers: {
          "Content-Type":
            "text/plain;charset=UTF-8"
        },

        body: JSON.stringify({
          action:
            "adminSetSubmissionStatus",

          token,

          row,

          status:
            newStatus,

          correction:
            Boolean(correction)
        })
      }
    );


    // Backend v20.19 robi SpreadsheetApp.flush()
    // przed odpowiedzią, więc nie potrzebujemy już
    // sztucznego dodatkowego oczekiwania 500 ms.
    invalidateAdminSubmissionsCache();
    await loadAdminSubmissions({force:true});


    // Zatwierdzona receptura ma od razu trafić
    // również do wspólnej bazy widocznej w PWA.
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
    criticalOperationFinish();
    loadAdminDashboardStatus().catch(()=>{});
  }
}

let adminSubmissionsCache = null;
let adminSubmissionsCacheAt = 0;
let adminSubmissionsCacheToken = "";
let adminSubmissionsInFlight = null;
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

    setAdminSectionBadge(
      "admin-section-submissions",
      submissions.length
    );

    // Zbiorczy badge też aktualizujemy po pełnym odczycie sekcji.
    loadAdminDashboardStatus().catch(()=>{});

    el(
      "admin-submissions"
    ).innerHTML =
      submissions.length

        ? submissions
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

    await fetch(
      BACKEND_URL,
      {
        method: "POST",
        mode: "no-cors",

        headers: {
          "Content-Type":
            "text/plain;charset=UTF-8"
        },

        body:
          JSON.stringify({
            action:
              "adminAddPlayer",

            token,

            nick
          })
      }
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

    await fetch(
      BACKEND_URL,
      {
        method: "POST",
        mode: "no-cors",

        headers: {
          "Content-Type":
            "text/plain;charset=UTF-8"
        },

        body:
          JSON.stringify({
            action:
              "adminDeletePlayer",

            token,

            nick,

            confirmationNick:
              second.trim()
          })
      }
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
    const needsAction =
      salaryChanged || waiverPending || Boolean(player.planPending);

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
          ${baseline ? "Pierwszy odczyt · delta 0 zł" : waiting ? "Oczekiwanie na pierwszy odczyt" : `Nowe wpłaty: +${paymentPreviewMoney(player.delta)} zł · Obowiązek: -${paymentPreviewMoney(player.obligation)} zł (${Number(player.chargedDays)||0} dni)`}
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
    await fetch(
      BACKEND_URL,
      {
        method:"POST",
        mode:"no-cors",
        headers:{"Content-Type":"text/plain;charset=UTF-8"},
        body:JSON.stringify({
          action:"adminImportPayments",
          token,
          nonce,
          report
        })
      }
    );

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
      throw new Error("Serwer nie zwrócił wyniku zapisu.");
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

          criticalOperationStart(
            "💰 Aktualizuję dochód Spółki…",
            "Zapisuję nową wartość. Pozostałe dane odświeżą się w tle."
          );

          const payload =
            await jsonp(
              "adminSetCompanyIncome",
              {
                token:
                  adminToken(),
                income:
                  String(income)
              }
            );

          if (!payload || !payload.ok) {
            throw new Error(
              payload && payload.error
                ? payload.error
                : "Nie udało się zapisać dochodu spółki."
            );
          }

          criticalOperationFinish();

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
          criticalOperationFinish();
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

        try {
          await fetch(
            BACKEND_URL,
            {
              method:"POST",
              mode:"no-cors",
              headers:{
                "Content-Type":
                  "text/plain;charset=UTF-8"
              },
              body:
                JSON.stringify({
                  action:
                    "accountAdminLogoutAll",
                  sessionToken:
                    playerAccountSessionToken(),
                  nick
                })
            }
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
          const result = await jsonp("adminGenerateSalaryClaimCode",{
            token:adminToken(),
            nick
          });

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
        [["Perfekcyjny Cel","+7% szansy na krytyka, +3% celności"],["Mistrz Krwawienia","+12% obrażeń krytycznych; krytyki mogą nałożyć krwawienie"]],
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

  function buildCapInfo(key,value) {
    const raw = buildStatNumber(value);
    const cap = BUILD_STAT_CAPS[key];
    const effective = Number.isFinite(cap)
      ? buildStatNumber(Math.min(cap,raw))
      : raw;
    const over = Number.isFinite(cap)
      ? buildStatNumber(Math.max(0,raw-cap))
      : 0;

    return {raw,effective,cap:Number.isFinite(cap) ? cap : null,over};
  }

  function buildCapStat(key,value) {
    return buildCapInfo(key,value).effective;
  }

  function buildEffectNumber(effect,pattern) {
    const match = String(effect || "").match(pattern);
    if (!match) return 0;
    return Number(String(match[1]).replace(",", ".")) || 0;
  }

  function buildApplyPerkEffect(stats,effect,extras) {
    const text = String(effect || "").trim();
    const lower = text.toLocaleLowerCase("pl-PL");

    // Bonusy zależne od HP / tury / specjalnego warunku pokazujemy osobno.
    if (
      lower.includes("gdy hp<") ||
      lower.includes("krytyki mogą")
    ) {
      extras.conditional.push(text);
      return;
    }

    const add = (key,pattern,transform=value=>value) => {
      const value = buildEffectNumber(text,pattern);
      if (value) stats[key] += transform(value);
    };

    add("attackPct",/([+-]?\d+(?:[.,]\d+)?)%\s*ataku\b/i);
    add("armorPen",/([+-]?\d+(?:[.,]\d+)?)%\s*przebicia pancerza/i);
    add("critDmg",/([+-]?\d+(?:[.,]\d+)?)%\s*obrażeń krytycznych/i);
    add("execute",/([+-]?\d+(?:[.,]\d+)?)%\s*progu egzekucji/i);
    add("lifesteal",/([+-]?\d+(?:[.,]\d+)?)%\s*kradzieży życia/i);

    // "szansy na podwójne uderzenie" i skrócone "podwójnego uderzenia"
    let doubleBonus =
      buildEffectNumber(text,/([+-]?\d+(?:[.,]\d+)?)%\s*szansy na podwójne uderzenie/i) ||
      buildEffectNumber(text,/([+-]?\d+(?:[.,]\d+)?)%\s*podwójnego uderzenia/i);
    stats.doubleStrike += doubleBonus;

    let evasionBonus =
      buildEffectNumber(text,/([+-]?\d+(?:[.,]\d+)?)%\s*szansy na unik/i) ||
      buildEffectNumber(text,/([+-]?\d+(?:[.,]\d+)?)%\s*uniku\b/i);
    stats.evasion += evasionBonus;

    add("counter",/([+-]?\d+(?:[.,]\d+)?)%\s*kontrataku/i);

    let critBonus =
      buildEffectNumber(text,/([+-]?\d+(?:[.,]\d+)?)%\s*szansy na trafienie krytyczne/i) ||
      buildEffectNumber(text,/([+-]?\d+(?:[.,]\d+)?)%\s*szansy na krytyka/i);
    stats.critChance += critBonus;

    add("accuracy",/([+-]?\d+(?:[.,]\d+)?)%\s*celności/i);
    add("healingReduction",/([+-]?\d+(?:[.,]\d+)?)%\s*redukcji leczenia wroga/i);
    add("defensePct",/([+-]?\d+(?:[.,]\d+)?)%\s*obrony\b/i);
    add("critResist",/([+-]?\d+(?:[.,]\d+)?)%\s*odporności na trafienia krytyczne/i);
    add("stunResist",/([+-]?\d+(?:[.,]\d+)?)%\s*odporności na ogłuszenie/i);
    add("bleedResist",/([+-]?\d+(?:[.,]\d+)?)%\s*odporności na krwawienie/i);
    add("maxHpPct",/([+-]?\d+(?:[.,]\d+)?)%\s*maksymalnego hp/i);

    const allResist =
      buildEffectNumber(text,/([+-]?\d+(?:[.,]\d+)?)%\s*wszystkich odporności/i);
    if (allResist) {
      stats.critResist += allResist;
      stats.stunResist += allResist;
      stats.bleedResist += allResist;
    }

    // Ujemne "otrzymywane obrażenia" zamieniamy na dodatnią redukcję obrażeń.
    const taken =
      buildEffectNumber(text,/([+-]?\d+(?:[.,]\d+)?)%\s*otrzymywanych obrażeń/i);
    if (taken < 0) stats.damageReduction += Math.abs(taken);

    const regenPct =
      buildEffectNumber(
        text,
        /([+-]?\d+(?:[.,]\d+)?)%\s*regeneracji hp/i
      );
    if (regenPct) {
      stats.hpRegenPct += regenPct;
    }

    const regenFlat =
      buildEffectNumber(
        text,
        /([+-]?\d+(?:[.,]\d+)?)(?!\s*%)\s*regeneracji hp/i
      );
    if (regenFlat) {
      stats.hpRegen += regenFlat;
    }

    // Zachowujemy nietypowe, nieprzeliczalne opisy jako efekty specjalne.
    if (
      lower.includes("krwawienie") &&
      !/odporności na krwawienie/i.test(text) &&
      !/otrzymywanych obrażeń/i.test(text)
    ) {
      if (!/^\+?\d+(?:[.,]\d+)?%\s*kradzieży życia/i.test(text)) {
        extras.special.push(text);
      }
    }
  }


  const BUILD_BONUS_LABELS = {
    // HP
    "hp":{key:"maxHpFlat",label:"Maks. HP",unit:"flat"},
    "max hp":{key:"maxHpFlat",label:"Maks. HP",unit:"flat"},
    "maks hp":{key:"maxHpFlat",label:"Maks. HP",unit:"flat"},
    "max hp %":{key:"maxHpPct",label:"Maks. HP (%)",unit:"pct"},
    "maks hp %":{key:"maxHpPct",label:"Maks. HP (%)",unit:"pct"},

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

  function buildParseBonusText(text) {
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
      unknown
    };
  }

  function buildApplyImportedBonuses(stats,source,options={}) {
    const entries = Array.isArray(source && source.bonuses) ? source.bonuses : [];
    const skipProfileFlat = options.skipProfileFlat !== false;

    entries.forEach(entry => {
      const key = String(entry && entry.key || "");
      const value = Number(entry && entry.value);

      if (!Object.prototype.hasOwnProperty.call(stats,key) || !Number.isFinite(value)) {
        return;
      }

      // Atak i Obrona wpisane z menu Postaci już zawierają zwykłe płaskie
      // bonusy z EQ, peta, EQ peta, skilli i Gangu. Nie doliczamy ich drugi raz.
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
    if (!entries.length) {
      host.innerHTML = `<div class="muted">Brak wczytanych bonusów dodatkowych.</div>`;
      return;
    }

    host.innerHTML = entries.map(entry => `
      <div class="build-bonus-row">
        <span><b>${escapeHtml(entry.source)}</b> · ${escapeHtml(entry.name)}</span>
        <strong>+${escapeHtml(buildFormatPlainNumber(entry.value))}${entry.percent ? "%" : ""}</strong>
      </div>
    `).join("");
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
    buildState.bonusText = text;

    if (!parsed.entries.length) {
      status.textContent = parsed.unknown.length
        ? "❌ Nie rozpoznałem żadnego bonusu z wklejonego tekstu."
        : "Wklej bonusy z gry.";
    } else {
      status.textContent =
        `✅ Wczytano ${parsed.entries.length} bonusów.` +
        (parsed.unknown.length ? ` ⚠️ Pominięto ${parsed.unknown.length} nierozpoznanych wierszy.` : "");
    }

    buildRenderBonusPreview();
    renderBuildStats();
  }

  function buildClearBonuses() {
    buildState.bonuses = [];
    buildState.bonusText = "";
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

    return {
      attack:cleanPositive(profile.attack,1),
      defense:cleanPositive(profile.defense,1),
      baseHp:cleanPositive(profile.baseHp,100),
      petHp:cleanNonNegative(profile.petHp,0),
      eqHp:cleanNonNegative(profile.eqHp,0)
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

    const stats = buildNewStatBag();
    const extras = {
      conditional:[],
      special:[]
    };

    // Mechaniki atrybutów dokładnie według ekranów z gry.
    stats.attackFlat = profile.attack + STR * 0.5 + AGI * 0.5 + PRC * 0.4;
    stats.attackPct = STR * 0.45;

    stats.defenseFlat = profile.defense + END * 1.65;
    stats.defensePct = END * 0.65;

    stats.levelHp =
      requiredLevel * 5;

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

    // Perki typu "+3% regeneracji HP" regenerują procent AKTUALNEGO
    // maksymalnego HP na turę. Najpierw wyliczamy końcowe HP po bonusie %,
    // a dopiero potem zamieniamy procent regeneracji na wartość / turę.
    const maxHpForRegen =
      buildStatNumber(
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
    Object.keys(stats).forEach(key => {
      const info = buildCapInfo(key,stats[key]);
      rawStats[key] = info.raw;
      capInfo[key] = info;
      stats[key] = info.effective;
    });

    // Usuń duplikaty opisów warunkowych/specjalnych.
    extras.conditional = [...new Set(extras.conditional)];
    extras.special = [...new Set(extras.special)];

    return {
      stats,
      rawStats,
      capInfo,
      extras,
      requiredLevel
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
        group.finalKind
          ? (() => {
              const value =
                finalPrimary[group.finalKind];

              let formula = "";

              if (group.finalKind === "attack") {
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
              group.levelHpRow
                ? `
                  <div class="build-stat-row build-stat-level-hp-row">
                    <span class="build-stat-name">
                      HP za poziom
                      <small>
                        ${escapeHtml(String(calculated.requiredLevel))} × 5 HP
                      </small>
                    </span>
                    <span class="build-stat-base">—</span>
                    <span class="build-stat-build">
                      ${escapeHtml(
                        sourceValue(
                          "maxHpFlat",
                          calculated.requiredLevel * 5
                        )
                      )}
                    </span>
                    <span class="build-stat-items">—</span>
                    <span class="build-stat-total">
                      <strong>
                        ${escapeHtml(
                          sourceValue(
                            "maxHpFlat",
                            calculated.requiredLevel * 5
                          )
                        )}
                      </strong>
                    </span>
                  </div>
                `
                : ""
            }
            ${group.keys.map(key => `
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

    return groupsHtml + conditionalHtml + specialHtml;
  }

  function renderBuildStats() {
    const host = el("build-stats");
    if (!host) return;
    host.innerHTML = buildStatsHtml(buildState);
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
        eqHp:0
      },
      bonuses:[],
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
    const readPositive = (id,fallback) => {
      const value = Number(el(id)?.value);
      return Number.isFinite(value) && value >= 1
        ? buildStatNumber(value)
        : fallback;
    };

    const petHpValue =
      Number(el("build-profile-pet-hp")?.value);

    const eqHpValue =
      Number(el("build-profile-eq-hp")?.value);

    buildState.profile = {
      attack:readPositive("build-profile-attack",1),
      defense:readPositive("build-profile-defense",1),
      baseHp:readPositive("build-profile-hp",100),
      petHp:
        Number.isFinite(petHpValue) && petHpValue >= 0
          ? buildStatNumber(petHpValue)
          : 0,
      eqHp:
        Number.isFinite(eqHpValue) && eqHpValue >= 0
          ? buildStatNumber(eqHpValue)
          : 0
    };

    return buildState.profile;
  }

  function buildWriteProfileInputs(profile) {
    const clean = buildProfileStats({profile});

    if (el("build-profile-attack")) {
      el("build-profile-attack").value = clean.attack;
    }

    if (el("build-profile-defense")) {
      el("build-profile-defense").value = clean.defense;
    }

    if (el("build-profile-hp")) {
      el("build-profile-hp").value = clean.baseHp;
    }

    if (el("build-profile-pet-hp")) {
      el("build-profile-pet-hp").value = clean.petHp;
    }

    if (el("build-profile-eq-hp")) {
      el("build-profile-eq-hp").value = clean.eqHp;
    }
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
      bonuses:Array.isArray(buildState.bonuses) ? buildState.bonuses : []
    };
  }

  async function buildPostAction(payload) {
    if (!backendConfigured()) throw new Error("Backend nie jest skonfigurowany.");

    await timedBackendPost(
      payload.action || "buildAction",
      payload
    );

    let result = null;
    for (let attempt=0; attempt<20; attempt++) {
      if (attempt) await new Promise(resolve=>setTimeout(resolve,350));
      result = await jsonp("buildActionResult",{nonce:payload.nonce});
      if (result && !result.pending) break;
    }

    if (!result || result.pending) throw new Error("Serwer nie zwrócił wyniku operacji.");
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

      await fetchBuildLists(true);
    } catch (err) {
      status.textContent = "❌ " + (err && err.message ? err.message : "Nie udało się zapisać buildu.");
    } finally {
      button.disabled = false;
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
    if (mySection) mySection.hidden = !accountNick;

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
      el("build-editor")?.scrollIntoView({behavior:"smooth",block:"start"});
    });

    el("build-copy-with-items")?.addEventListener("click",()=>{
      loadBuildIntoEditor(
        item,
        false,
        true
      );
      host.hidden = true;
      el("build-editor")?.scrollIntoView({behavior:"smooth",block:"start"});
    });

    el("build-edit-own")?.addEventListener("click",()=>{
      loadBuildIntoEditor(
        item,
        true,
        true
      );
      host.hidden = true;
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
      status.textContent = "Usuwanie...";
      try {
        await buildPostAction(payload);
        status.textContent = "✅ Build został usunięty.";
        host.hidden = true;
        invalidateAppCache("builds");
        await fetchBuildLists(true);
      } catch(err) {
        status.textContent = "❌ " + (err && err.message ? err.message : "Nie udało się usunąć buildu.");
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
        : {
            attack:1,
            defense:1,
            baseHp:100,
            petHp:0,
            eqHp:0
          };

    fresh.bonuses =
      includeBonuses &&
      Array.isArray(item.bonuses)
        ? item.bonuses.map(entry=>Object.assign({},entry))
        : [];
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
            : "📋 Skopiowano atrybuty i perki bez danych profilu i itemów autora. Wpisz swój Atak, Obronę, Bazowe HP, HP z pancerza peta, HP ze zwykłego EQ (bez bonusu seta) i wklej własne bonusy."
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

  async function openBuildModule() {
    if (
      !(await ensureModuleAccess(
        "builds"
      ))
    ) {
      return;
    }

    showModuleLoading(
      "builds",
      "🛠 Ładowanie Buildów...",
      "Pobieram aktualne publiczne buildy i dane Twojego konta."
    );

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

  function setupBuildCreator() {
    if (!el("build-attributes")) return;

    el("build-new")?.addEventListener("click",newBuild);
    setupBuildPublicFilters();
    el("build-bonus-import")?.addEventListener("click",buildImportBonuses);
    el("build-bonus-clear")?.addEventListener("click",buildClearBonuses);

    [
      "build-profile-attack",
      "build-profile-defense",
      "build-profile-hp",
      "build-profile-pet-hp",
      "build-profile-eq-hp"
    ].forEach(id => {
      el(id)?.addEventListener("input",()=>{
        buildReadProfileInputs();
        renderBuildStats();
      });
    });

    buildWriteProfileInputs(buildState.profile);

    el("build-save-private")?.addEventListener("click",()=>saveBuild(false));
    el("build-share-public")?.addEventListener("click",()=>saveBuild(true));

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
    button.addEventListener("click",async ()=>{
      if (button.disabled) {
        return;
      }

      if (!playerAccountSessionToken()) {
        await openGangLanding();
        return;
      }

      await openGangModule(
        button.dataset.gangMenuTarget
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

    await loadGangMenuStatus();

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

    // v20.71:
    // Wpłaty i Spółka są renderowane z tego samego payloadu.
    // Jeśli został już pobrany w tej sesji, samo przełączenie zakładki
    // nie wykonuje kolejnego requestu ani nie pokazuje ekranu ładowania.
    if (
      isPaymentsOrCompany &&
      latestGangPayload &&
      !forceRefresh
    ) {
      el("gang-tabs").hidden = false;

      renderGangPayload(
        latestGangPayload
      );

      showToolView(
        target,
        "gang"
      );

      const payloadAge =
        Date.now() - latestGangPayloadAt;

      // v20.72 — stale-while-revalidate:
      // < 10 min: przełączanie bez requestu.
      // >= 10 min: stary widok pokazujemy od razu,
      // a świeże dane pobieramy po cichu w tle.
      if (
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
      "announcements-view":"📢 Ładowanie Ogłoszeń..."
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

    if (!moduleOpenInFlight.gang) {
      moduleOpenInFlight.gang =
        Promise.allSettled(requests);
    }

    try {
      await moduleOpenInFlight.gang;
    } finally {
      moduleOpenInFlight.gang = null;
    }

    if (!playerAccountSessionToken()) {
      el("gang-tabs").hidden = true;
      showToolView("gang-gate-view","gang");
      return;
    }

    el("gang-tabs").hidden = false;
    showToolView(target,"gang");

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
        await openGangModule(viewId);
        return;
      }

      await openDistilleryModule(viewId);
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
        account =
          await playerAccountStatus({
            force:true
          });
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
setupPayments();
setupAdmin();

showToolView("home-view", "");
if (el("admin-view")) el("admin-view").hidden = true;

preloadApplicationData();
fetchModuleAccessPolicy().catch(()=>{});


  const ADMIN_ACCOUNT_BADGE_REFRESH_MS =
    60 * 1000;

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

  setInterval(
    refreshAdminBadgeOnAccount,
    ADMIN_ACCOUNT_BADGE_REFRESH_MS
  );

  // Destylarnia: aktualne rezerwacje również wtedy,
  // gdy użytkownik już ma moduł otwarty.
  const DISTILLERY_LIVE_REFRESH_MS =
    20 * 1000;

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
      await fetchApprovedRecipes({
        force:true
      });
    } catch (err) {
      console.warn(
        "[MenelWars Tools] Odświeżanie Destylarni w tle:",
        err
      );
    }
  }

  setInterval(
    refreshActiveDistilleryInBackground,
    DISTILLERY_LIVE_REFRESH_MS
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (
        document.visibilityState === "visible" &&
        activeToolModule === "distillery"
      ) {
        refreshActiveDistilleryInBackground();
      }

      if (
        document.visibilityState === "visible" &&
        activeToolModule === "account"
      ) {
        refreshAdminBadgeOnAccount();
      }
    }
  );


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


  if ("serviceWorker" in navigator) {

    navigator.serviceWorker
      .register("./sw.js")
      .catch(console.error);
  }

})();
