/* Панель гостей — Telegram Mini App.
   Данные берутся из той же Google Таблицы через Apps Script (doGet, action=guests).
   Список выдаётся только тем, чей chat_id есть в TG_CHAT_IDS / TG_ADMIN_IDS. */
(() => {
  "use strict";
  const ENDPOINT = "https://script.google.com/macros/s/AKfycbw8eS1XqzYu8Mzn3M39Hddte1JTG3qYOUdIzDASjpy_3TeBXWE89saV_UGOdJ3bB_A6og/exec";
  const FOTIHA_END = Date.parse("2026-11-10T23:59:00+05:00");

  const tg = window.Telegram && window.Telegram.WebApp;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* приватный режим */ } },
  };
  const haptic = (kind) => { try { tg && tg.HapticFeedback && (kind === "tap" ? tg.HapticFeedback.selectionChanged() : tg.HapticFeedback.notificationOccurred(kind)); } catch { /* старый клиент */ } };

  if (tg) {
    try { tg.ready(); tg.expand(); tg.setHeaderColor("#f1e6dc"); tg.setBackgroundColor("#f1e6dc"); } catch { /* старый клиент */ }
  }

  const params = new URLSearchParams(location.search);
  const demo = params.has("demo");
  const initData = (tg && tg.initData) || "";

  let data = null;
  let event = store.get("event") || (Date.now() > FOTIHA_END ? "wedding" : "fotiha");
  let tab = "guests", filter = "all", query = "";

  /* ---------- склонения и форматирование ---------- */
  const plural = (n, one, few, many) => {
    const a = Math.abs(n) % 100, b = a % 10;
    return a > 10 && a < 20 ? many : b > 1 && b < 5 ? few : b === 1 ? one : many;
  };
  const fmtTime = (t) => {
    if (!t) return "";
    const d = new Date(t), opts = { timeZone: "Asia/Tashkent" };
    const day = d.toLocaleDateString("ru-RU", { ...opts, day: "numeric", month: "short" }).replace(".", "");
    const time = d.toLocaleTimeString("ru-RU", { ...opts, hour: "2-digit", minute: "2-digit" });
    const today = new Date().toLocaleDateString("ru-RU", opts) === d.toLocaleDateString("ru-RU", opts);
    return (today ? "сегодня" : day) + ", " + time;
  };
  const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  const sideName = (s) => (s === "groom" ? "со стороны жениха" : s === "bride" ? "со стороны невесты" : "");
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  /* ---------- состояния ---------- */
  function showState(kind, opts = {}) {
    const s = $("#state");
    s.hidden = false;
    s.classList.toggle("is-loading", kind === "loading");
    $("#stateTitle").textContent = opts.title || "";
    $("#stateText").textContent = opts.text || "";
    const b = $("#stateBtn");
    b.hidden = !opts.btn;
    if (opts.btn) { b.textContent = opts.btn; b.onclick = opts.onBtn; }
  }
  const hideState = () => { $("#state").hidden = true; };

  /* ---------- загрузка ---------- */
  async function load(silent) {
    const btn = $("#refresh");
    btn.classList.add("is-spin");
    if (!silent && !data) showState("loading", { title: "Минутку…", text: "Собираем ответы гостей" });
    try {
      let res;
      if (demo) res = await demoData();
      else {
        if (!initData) {
          showState("info", { title: "Только в Telegram", text: "Эта панель открывается из бота: нажмите кнопку «Гости» внизу чата с ботом." });
          return;
        }
        const r = await fetch(ENDPOINT + "?action=guests&initData=" + encodeURIComponent(initData), { cache: "no-store" });
        res = await r.json();
      }
      if (!res.ok) {
        if (res.error === "forbidden") {
          showState("info", { title: "Нет доступа", text: "Панель видят только хозяева торжества. Ваш Telegram ID: " + res.id + " — его можно добавить в свойство TG_ADMIN_IDS в Apps Script." });
        } else if (res.error === "auth") {
          showState("info", { title: "Откройте заново", text: "Не удалось подтвердить вход. Закройте панель и откройте её снова кнопкой в боте.", btn: "Закрыть", onBtn: () => tg && tg.close() });
        } else throw new Error(res.error || "bad response");
        return;
      }
      data = res;
      hideState();
      render(true);
      if (silent) haptic("success");
    } catch (err) {
      console.error(err);
      if (!data) showState("error", { title: "Нет связи", text: "Не получилось загрузить список. Проверьте интернет и попробуйте ещё раз.", btn: "Повторить", onBtn: () => load() });
      else haptic("error");
    } finally {
      btn.classList.remove("is-spin");
    }
  }

  /* ---------- отрисовка ---------- */
  function current() { return (data && data.events && data.events[event]) || { guests: [] }; }

  function totals(list) {
    const t = { answers: list.length, coming: 0, declined: 0, people: 0, groom: 0, bride: 0 };
    list.forEach((g) => {
      if (g.attending) {
        t.coming++; t.people += g.guests || 1;
        if (g.side === "groom") t.groom += g.guests || 1;
        if (g.side === "bride") t.bride += g.guests || 1;
      } else t.declined++;
    });
    return t;
  }

  function count(node, to) {
    const from = Number(node.dataset.v || 0);
    node.dataset.v = to;
    if (from === to || matchMedia("(prefers-reduced-motion: reduce)").matches) { node.textContent = to; return; }
    const t0 = performance.now(), dur = 700;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      node.textContent = Math.round(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function render(animateNumbers) {
    const list = current().guests;
    const t = totals(list);

    $("#eventSeg").dataset.active = event;
    $$("#eventSeg button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.event === event)));

    if (animateNumbers) { count($("#sPeople"), t.people); count($("#sAnswers"), t.answers); count($("#sComing"), t.coming); count($("#sDeclined"), t.declined); }
    $("#sPeopleSub").textContent = plural(t.people, "гость", "гостя", "гостей");
    $("#sGroom").textContent = t.groom; $("#sBride").textContent = t.bride;
    const sideSum = t.groom + t.bride || 1;
    $("#barG").style.width = (t.groom / sideSum) * 100 + "%";
    $("#barB").style.width = (t.bride / sideSum) * 100 + "%";

    const wishes = list.filter((g) => g.message);
    $("#nGuests").textContent = list.length ? list.length : "";
    $("#nWishes").textContent = wishes.length ? wishes.length : "";

    renderGuests(list);
    renderWishes(wishes);

    const latest = list[0];
    $("#foot").textContent = (demo ? "Демо-данные · " : "") + (latest ? "Последний ответ: " + fmtTime(latest.time) : "Пока никто не ответил");
  }

  function renderGuests(list) {
    const q = query.trim().toLowerCase();
    const shown = list.filter((g) => {
      if (q && !g.name.toLowerCase().includes(q)) return false;
      if (filter === "yes") return g.attending;
      if (filter === "no") return !g.attending;
      if (filter === "groom" || filter === "bride") return g.side === filter;
      return true;
    });
    const ul = $("#list");
    ul.textContent = "";
    if (!shown.length) { ul.appendChild(el("li", "empty", list.length ? "Никого не нашли" : "Здесь появятся гости, когда они ответят на приглашение")); return; }
    shown.forEach((g, i) => {
      const li = el("li", "guest card " + (g.attending ? "guest--yes" : "guest--no"));
      li.style.animationDelay = Math.min(i, 12) * 0.03 + "s";
      li.appendChild(el("span", "guest__ava", initials(g.name)));
      li.appendChild(el("p", "guest__name", g.name));
      li.appendChild(el("span", "guest__badge", g.attending ? "✓ " + g.guests + " " + plural(g.guests, "гость", "гостя", "гостей") : "не сможет"));
      const meta = el("p", "guest__meta");
      const parts = [sideName(g.side), fmtTime(g.time)].filter(Boolean);
      parts.forEach((p, k) => { if (k) meta.appendChild(el("i", null, "·")); meta.appendChild(el("span", null, p)); });
      if (g.updated) { meta.appendChild(el("i", null, "·")); meta.appendChild(el("span", "tag", "изменил ответ")); }
      li.appendChild(meta);
      if (g.message) li.appendChild(el("p", "guest__msg", g.message));
      ul.appendChild(li);
    });
  }

  function renderWishes(wishes) {
    const ul = $("#wishes");
    ul.textContent = "";
    if (!wishes.length) { ul.appendChild(el("li", "empty", "Пожеланий пока нет")); return; }
    wishes.forEach((g, i) => {
      const li = el("li", "wish card");
      li.style.animationDelay = Math.min(i, 12) * 0.04 + "s";
      li.appendChild(el("p", "wish__text", g.message));
      li.appendChild(el("p", "wish__who", g.name + " · " + fmtTime(g.time)));
      ul.appendChild(li);
    });
  }

  /* ---------- управление ---------- */
  $$("#eventSeg button").forEach((b) => b.addEventListener("click", () => {
    if (event === b.dataset.event) return;
    event = b.dataset.event; store.set("event", event); haptic("tap");
    if (data) render(true);
  }));
  $$(".tabs [data-tab]").forEach((b) => b.addEventListener("click", () => {
    tab = b.dataset.tab; haptic("tap");
    $$(".tabs [data-tab]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
    $("#tabGuests").hidden = tab !== "guests"; $("#tabWishes").hidden = tab !== "wishes";
  }));
  $$("#chips .chip").forEach((c) => c.addEventListener("click", () => {
    filter = c.dataset.f; haptic("tap");
    $$("#chips .chip").forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
    if (data) renderGuests(current().guests);
  }));
  $("#q").addEventListener("input", (e) => { query = e.target.value; if (data) renderGuests(current().guests); });
  $("#q").addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); });
  $("#refresh").addEventListener("click", () => { haptic("tap"); load(true); });

  // само обновляется раз в минуту, пока панель открыта
  setInterval(() => { if (!document.hidden && data) load(true); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && data) load(true); });

  /* ---------- демо (?demo=1): вымышленные гости, только для просмотра дизайна ---------- */
  function demoData() {
    const now = Date.now(), h = 36e5;
    const mk = (name, attending, guests, side, message, ago, updated) => ({ name, attending, guests: attending ? guests : 0, side, message, lang: "RU", updated: !!updated, time: now - ago * h });
    return new Promise((r) => setTimeout(() => r({ ok: true, events: {
      fotiha: { guests: [
        mk("Азиза Каримова", true, 2, "bride", "Пусть ваш дом всегда будет полон света и смеха!", 0.4),
        mk("Шерзод Рахимов", true, 4, "groom", "", 2),
        mk("Дилноза Юсупова", false, 0, "bride", "Очень жаль, что не смогу. Счастья вам!", 5),
        mk("Отабек Ахмедов", true, 1, "groom", "", 9, true),
        mk("Malika Tursunova", true, 3, "bride", "Baxtli bo‘linglar!", 20),
        mk("Жасур Назаров", true, 2, "groom", "", 30),
      ] },
      wedding: { guests: [
        mk("Нодира Хасанова", true, 2, "bride", "Любви и терпения на долгие годы!", 1),
        mk("Бобур Каримов", true, 5, "groom", "", 3),
        mk("Сардор Алиев", false, 0, "groom", "", 7),
        mk("Гульнора Исмоилова", true, 2, "bride", "", 12),
      ] },
    } }), 500));
  }

  render(false);
  load();
})();
