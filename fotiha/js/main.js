/* ============================================================
   Атлас и золото — логика сайта-приглашения
   ============================================================ */
(() => {
  const W = window.WEDDING, T = window.I18N, B = window.Bake2;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const hasG = !!window.gsap;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  document.documentElement.classList.add("js");
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  scrollTo(0, 0);

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* приватный режим */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };

  /* ---------- язык: ?lang=ru в ссылке, затем сохранённый, затем узбекский ---------- */
  const qs = new URLSearchParams(location.search);
  let lang = (qs.get("lang") || (qs.has("ru") ? "ru" : "") || store.get("lang") || "uz").toLowerCase();
  if (!T[lang]) lang = "uz";
  const t = (k) => (T[lang][k] ?? T.uz[k] ?? "");

  /* ---------- дата (часовой пояс Ташкента) ---------- */
  const when = new Date(W.date);
  const local = new Date(when.getTime() + 5 * 3600e3);       // «часы» Ташкента в UTC-полях
  const D = { day: local.getUTCDate(), mon: local.getUTCMonth(), year: local.getUTCFullYear(), wd: local.getUTCDay(),
    time: `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}` };
  const deadline = (() => { const [y, m, d] = W.rsvpDeadline.split("-").map(Number); return { d, m: m - 1, y }; })();

  /* ============================================================
     ТЕКСТЫ И СПИСКИ
     ============================================================ */
  const ICONS = {
    clock: '<circle cx="16" cy="16" r="11"/><path d="M16 9.5V16l4.5 3"/>',
    rings: '<circle cx="12.5" cy="18" r="7"/><circle cx="19.5" cy="18" r="7"/><path d="M10.5 8.5 12.5 6l2 2.5M17.5 8.5l2-2.5 2 2.5"/>',
    note: '<path d="M12 23V9l12-3v14"/><circle cx="9.5" cy="23" r="2.8"/><circle cx="21.5" cy="20" r="2.8"/>',
    piyola: '<path d="M5 13h22c0 6-5 10-11 10S5 19 5 13Z"/><path d="M11 23.5h10M12 9c0-2 2-2 2-4M17 9c0-2 2-2 2-4"/>',
    camera: '<path d="M5 11.5h5l2-3h8l2 3h5v13H5Z"/><circle cx="16" cy="17.5" r="4.6"/><path d="M23.5 14.2h1"/>',
    moon: '<path d="M21.5 5.5a10.5 10.5 0 1 0 5 15.5 8.5 8.5 0 0 1-5-15.5Z"/><path d="M9 7.5v3M7.5 9h3M25.5 25v2M24.5 26h2"/>',
    cake: '<path d="M6 27h20M8 27V19h16v8M10 19v-5h12v5M16 14V10"/><path d="M16 6.5c1.2 1.2 1.2 2.5 0 3.5-1.2-1-1.2-2.3 0-3.5Z"/>',
  };
  function renderLists() {
    if (!$("#prog") || !$("#rulesList")) return;
    $("#prog").innerHTML = W.program.map((p) => `
      <li class="prog__item reveal">
        <span class="prog__time gold">${p.time}</span>
        <span><span class="prog__title">${p[lang]}</span><br /><span class="prog__note">${p.note[lang]}</span></span>
      </li>`).join("");
    $("#rulesList").innerHTML = W.rules.map((r) => `
      <li class="panel rule reveal">
        <span class="rule__icon"><svg viewBox="0 0 32 32" fill="none" stroke="url(#gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[r.icon] || ICONS.note}</svg></span>
        <span><span class="rule__title">${r.title[lang]}</span><br /><span class="rule__text">${r.text[lang]}</span></span>
      </li>`).join("");
    $$("#rulesList svg *").forEach((el) => el.setAttribute("pathLength", "1"));
    observe($$("#prog .reveal, #rulesList .reveal"));
  }

  function applyLang() {
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    $$("[data-i18n-label]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nLabel)); });
    $$(".lang [data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    $("#nGroom").textContent = W.groom[lang];
    $("#nBride").textContent = W.bride[lang];
    $("#dWeek").textContent = T[lang].weekdays[D.wd];
    $("#dMonth").textContent = T[lang].months[D.mon];
    $("#dDay").textContent = D.day;
    $("#dYear").textContent = D.year;
    $("#dTime").textContent = D.time;
    $("#cVenue").textContent = $("#vName").textContent = W.venue.name;
    $("#cKind").textContent = $("#vKind").textContent = W.venue.kind[lang];
    $("#vAddr").textContent = W.venue.address[lang];
    $("#footMono").textContent = W.mono[lang].join(" & ");
    const dl = lang === "uz" ? `${deadline.d}-${T.uz.monthsGen[deadline.m]}` : `${deadline.d} ${T.ru.monthsGen[deadline.m]}`;
    $("#rsvpSub").textContent = t("rsvp.sub").replace("{date}", dl);
    document.title = `${lang === "ru" ? "Фотиха-туй" : "Fotiha to‘yi"} · ${W.groom[lang]} & ${W.bride[lang]} · ${String(D.day).padStart(2, "0")}.${String(D.mon + 1).padStart(2, "0")}.${D.year}`;
    renderLists();
    const saved = readAnswer(); if (saved && !$("#thanks").hidden) fillThanks(saved);
    if (!opened && envReady) bakeEnvelope();
    if ($("#wreath").innerHTML) $("#wreath").innerHTML = wreathSVG();
    const ev = $("#eveningLink"); if (ev) ev.href = "https://bekzod-ferangiz.vercel.app/" + (lang === "ru" ? "?lang=ru" : "");
    store.set("lang", lang);
  }
  $$(".lang [data-lang]").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.lang === lang) return;
    lang = b.dataset.lang; applyLang();
  }));

  /* ============================================================
     МАТЕРИАЛЫ: бумага, конверт, сургуч
     ============================================================ */
  function bakePaper() {
    try {
      const c = document.createElement("canvas"); c.width = 390; c.height = 740;
      B.card(c, 0.5);
      document.documentElement.style.setProperty("--paper", `url(${c.toDataURL("image/jpeg", 0.86)})`);
    } catch { /* без текстуры — просто жемчужный цвет */ }
  }
  function bakeSprigs() {
    const u = card.offsetWidth / 780;
    if (u < 0.1) return;
    const k = u * DPR;
    const R = $("#sprigR"), L = $("#sprigL");
    R.width = Math.round(460 * k); R.height = Math.round(590 * k);
    L.width = Math.round(460 * k); L.height = Math.round(580 * k);
    B.sprig(R, k, { base: [382, 90], dir: 2.05, bend: 0.30, len: 290, leaves: 10, leafLen: 64, goldShare: 0.4, buds: 6, seed: 9 });
    B.sprig(L, k, { base: [80, 510], dir: -1.2, bend: 0.35, len: 280, leaves: 10, leafLen: 66, goldShare: 0.35, buds: 7, seed: 5 });
  }
  let envReady = false;
  function bakeEnvelope() {          // шторы из розового шёлка + сургуч хаки
    const vw = innerWidth, vh = innerHeight, q = Math.min(DPR, 2) * 0.6;
    ["#curL", "#curR"].forEach((sel, side) => {
      const cv = $(sel + " canvas"), w = Math.ceil((vw / 2 + 4) * q), h = Math.ceil(vh * q);
      cv.width = w; cv.height = h;
      const c = cv.getContext("2d"), P = 46 * q;
      for (let x = 0; x < w; x++) {
        const xi = side ? x : w - 1 - x;                         // складки считаем от шва
        const ph = (xi / P) * 6.283 + Math.sin(xi / (37 * q)) * 0.9;
        const k = Math.pow(0.5 + 0.5 * Math.cos(ph), 0.8);
        const hl = Math.pow(Math.max(0, Math.cos(ph - 0.7)), 18) * 0.35;
        const col = [214, 158, 166].map((d, j) => Math.round(d + ([251, 233, 233][j] - d) * k + 255 * hl * 0.12));
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, `rgb(${col.map((v) => Math.round(v * 0.9)).join(",")})`);
        g.addColorStop(0.18, `rgb(${col.join(",")})`); g.addColorStop(1, `rgb(${col.map((v) => Math.round(v * 0.94)).join(",")})`);
        c.fillStyle = g; c.fillRect(x, 0, 1, h);
      }
      const sh = c.createLinearGradient(side ? 0 : w, 0, side ? 26 * q : w - 26 * q, 0);
      sh.addColorStop(0, "rgba(120,70,75,.28)"); sh.addColorStop(1, "rgba(120,70,75,0)");
      c.fillStyle = sh; c.fillRect(side ? 0 : w - 26 * q, 0, 26 * q, h);
      const gg = c.createLinearGradient(0, 0, 0, h);
      gg.addColorStop(0, "#9a7a3e"); gg.addColorStop(0.3, "#ecd49c"); gg.addColorStop(0.6, "#b8955a"); gg.addColorStop(1, "#e3c486");
      c.fillStyle = gg; c.fillRect(side ? 3 * q : w - 7 * q, 0, 3.2 * q, h);
      c.fillStyle = "rgba(111,107,69,.6)"; c.fillRect(side ? 8 * q : w - 10 * q, 0, 1 * q, h);
    });
    B.seal($("#sealCv"), W.mono[lang][0], W.mono[lang][1]);
    envReady = true;
  }

  /* ============================================================
     ШЁЛК, ЛЕНТЫ, ЗОЛОТАЯ ПЫЛЬ (WebGL, медленно и дёшево)
     ============================================================ */
  const silkCv = $("#silk"), ribBackCv = $("#ribBack"), ribFrontCv = $("#ribFront"), dustCv = $("#dust");
  const silkBox = [0, 0, 1080, 1920], ribBox = [0, 0, 1080, 1920];
  let silk = null, ribIntroBack = null, ribAll = null, ribFront = null, view = { s: 1, bx: 0, by: 0 };
  const R = window.RIBBONS;
  function layout() {
    const vw = innerWidth, vh = innerHeight;
    const s = Math.max(vw / 1080, vh / 1920), bw = vw / s, bh = vh / s;
    view = { s, bx: (1080 - bw) / 2, by: (1920 - bh) / 2, bw, bh };
    silkBox.splice(0, 4, view.bx - 40, view.by, bw + 80, bh);
    ribBox.splice(0, 4, view.bx, view.by, bw, bh);
    silkCv.width = Math.round(vw * DPR * 0.5); silkCv.height = Math.round(vh * DPR * 0.5);
    for (const c of [ribBackCv, ribFrontCv]) { c.width = Math.round(vw * DPR * 0.85); c.height = Math.round(vh * DPR * 0.85); }
    dustCv.width = Math.round(vw * DPR); dustCv.height = Math.round(vh * DPR);
  }
  function initGL() { /* в этом дизайне фон — бумага с акварелью (CSS), без WebGL */ }
  // золотая пыль в кадре конверта
  const dust = (() => {
    let a = 7; const rnd = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let q = Math.imul(a ^ (a >>> 15), 1 | a); q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q; return ((q ^ (q >>> 14)) >>> 0) / 4294967296; };
    return Array.from({ length: 46 }, () => ({ x: rnd(), y: rnd(), r: 0.8 + Math.pow(rnd(), 3) * 2.6, vy: 0.004 + rnd() * 0.01, ph: rnd() * 6.28, f: 0.5 + rnd(), a: 0.3 + rnd() * 0.6 }));
  })();
  function drawDust(time, alpha) {
    const c = dustCv.getContext("2d"), w = dustCv.width, h = dustCv.height;
    c.clearRect(0, 0, w, h);
    if (alpha <= 0.01) return;
    for (const p of dust) {
      const tw = 0.5 + 0.5 * Math.sin(p.ph + time * p.f * 2), a = p.a * (0.2 + 0.8 * tw * tw) * alpha;
      const x = ((p.x + Math.sin(time * 0.2 + p.ph) * 0.01) % 1) * w, y = (((p.y - time * p.vy) % 1) + 1) % 1 * h;
      const r = p.r * DPR * (1 + tw * 0.8);
      const g = c.createRadialGradient(x, y, 0, x, y, r * 2.6);
      g.addColorStop(0, `rgba(255,246,214,${a})`); g.addColorStop(0.4, `rgba(232,196,120,${a * 0.6})`); g.addColorStop(1, "rgba(220,180,100,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.6, 0, 6.283); c.fill();
    }
  }
  let introOn = true, dustAlpha = 1, raf = 0, lastFrame = 0;
  const t0 = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - lastFrame < (introOn ? 32 : 48)) return;      // 30 кадров/с у конверта, ~20 потом: ткань движется медленно
    lastFrame = now;
    const time = reduce ? 4 : (now - t0) / 1000;
    const par = Math.min(scrollY, 6000) / view.s;              // параллакс: ткань и ленты едут медленнее страницы
    silkBox[1] = view.by + par * 0.10;
    ribBox[1] = view.by + par * 0.22;
    if (silk) silk(time);
    if (introOn) { if (ribIntroBack) ribIntroBack(time); if (ribFront) ribFront(time); drawDust(time, dustAlpha); }
    else if (ribAll) ribAll(time);
  }
  function startLoop() { if (!raf) raf = requestAnimationFrame(frame); }
  function stopLoop() { cancelAnimationFrame(raf); raf = 0; }
  document.addEventListener("visibilitychange", () => (document.hidden ? stopLoop() : startLoop()));
  let rsz = 0;
  addEventListener("resize", () => { clearTimeout(rsz); rsz = setTimeout(() => { layout(); if (!opened) bakeEnvelope(); }, 150); });

  /* ============================================================
     МУЗЫКА
     ============================================================ */
  const audio = $("#audio"), musicBtn = $("#musicBtn");
  const START = +W.musicStart || 0;
  let musicLoad = null, unlocked = false, started = false, wantMusic = false;
  const setMusicUI = (on) => { musicBtn.hidden = false; musicBtn.setAttribute("aria-pressed", String(on)); };
  function loadMusic() {
    if (musicLoad) return musicLoad;
    musicLoad = fetch(W.music).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then((b) => { if (!started) { audio.src = URL.createObjectURL(b); audio.load(); } })
      .catch(() => { /* играем потоком */ });
    return musicLoad;
  }
  const seekStart = () => new Promise((res) => {
    const go = () => { try { audio.currentTime = START; } catch { /* ещё не готово */ } res(); };
    if (audio.readyState >= 1) go(); else audio.addEventListener("loadedmetadata", go, { once: true });
  });
  function primeMusic() {                                       // звук разрешён только по жесту гостя
    if (unlocked) return; unlocked = true;
    if (!audio.src) audio.src = W.music;
    audio.muted = true;
    const p = audio.play();
    const park = () => { if (!started) audio.pause(); audio.muted = false; };
    if (p && p.then) p.then(park).catch(() => { audio.muted = false; }); else park();
  }
  async function fadeInMusic() {
    if (!unlocked || started) return;
    started = true; wantMusic = true;
    await Promise.race([loadMusic(), new Promise((r) => setTimeout(r, 2500))]);
    await seekStart();
    audio.muted = false; audio.volume = 0.2;
    audio.play().then(() => {
      setMusicUI(true);
      if (hasG) gsap.to(audio, { volume: 0.6, duration: 2, ease: "sine.out" }); else audio.volume = 0.6;
    }).catch(() => { started = false; wantMusic = false; setMusicUI(false); });
  }
  audio.addEventListener("ended", () => { audio.currentTime = START; audio.play().catch(() => {}); });
  musicBtn.addEventListener("click", () => {
    if (audio.paused) {
      wantMusic = true;
      if (!started) { started = true; if (!audio.src) audio.src = W.music; seekStart(); }
      audio.muted = false; audio.volume = 0.6;
      audio.play().then(() => setMusicUI(true)).catch(() => {});
    } else { wantMusic = false; audio.pause(); setMusicUI(false); }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) audio.pause(); else if (wantMusic) audio.play().catch(() => {});
  });

  /* ============================================================
     КОНВЕРТ → ОТКРЫТКА
     ============================================================ */
  const card = $("#card"), home = $("#cardHome"), slot = $("#slot"), env = $("#env");
  let opened = false;
  const revealEls = () => $$(".rv, .rvs, .rvc, .rvv", card);
  function placeCardInEnvelope() { /* открытка ждёт за шторами на своём месте */ }

  function openEnvelope() {
    if (opened) return;
    opened = true;
    primeMusic();
    try { navigator.vibrate && navigator.vibrate(12); } catch { /* нет вибро */ }
    if (!hasG) { landCard(); fadeInMusic(); return; }
    const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
    tl.to("#seal", { scale: 0.9, duration: 0.12, ease: "power2.out" })
      .to("#seal", { scale: 1.12, opacity: 0, duration: 0.5, ease: "power2.in" })
      .to(["#hint", ".seal__ring"], { opacity: 0, duration: 0.3 }, 0)
      .to("#env", { opacity: 0, y: -12, duration: 0.55, ease: "sine.in" }, 0.15)
      .add(fadeInMusic, 0.3)
      .to("#curL", { xPercent: -104, duration: 1.5, ease: "power3.inOut" }, 0.35)
      .to("#curR", { xPercent: 104, duration: 1.5, ease: "power3.inOut" }, 0.35)
      .fromTo("#card", { scale: 0.97 }, { scale: 1, duration: 1.6, ease: "power2.out", clearProps: "transform" }, 0.4)
      .to("#dust", { opacity: 0, duration: 1 }, 0.6)
      .add(revealCard, 0.85)
      .add(landCard, 1.9);
  }

  function landCard() {
    introOn = false;
    $("#intro").classList.add("is-gone");
    document.body.classList.remove("is-locked");
    if (!hasG) revealCard();
    drawBoughs();
    setTimeout(showSwipe, 1200);
    setTimeout(() => leafShower(18), 500);
  }

  /* ---------- линейная ботаника: венок, ветви оливы, веточка-разделитель ---------- */
  const leafPath = (len, w) => `M0,0 Q${len * 0.45},${-w} ${len},0 Q${len * 0.45},${w} 0,0Z`;
  function leafEl(x, y, deg, len, w, extra = "") {
    return `<path d="${leafPath(len, w)}" transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${deg.toFixed(1)})" ${extra}/>`;
  }
  function wreathSVG() {
    const cx = 150, cy = 150, R = 112, out = [];
    out.push('<g fill="rgba(138,132,88,.10)" stroke="#8a8458" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">');
    for (const dir of [-1, 1]) {
      const a0 = 100, a1 = 250, step = 12;
      const arc = [];
      for (let a = a0; a <= a1; a += 3) { const r = (dir < 0 ? a : 180 - a) * Math.PI / 180; arc.push(`${(cx + Math.cos(r) * R).toFixed(1)},${(cy + Math.sin(r) * R).toFixed(1)}`); }
      out.push(`<path fill="none" d="M${arc.join(" L")}"/>`);
      let i = 0;
      for (let a = a0 + 6; a <= a1 - 4; a += step, i++) {
        const ad = dir < 0 ? a : 180 - a, r = ad * Math.PI / 180;
        const x = cx + Math.cos(r) * R, y = cy + Math.sin(r) * R;
        const tang = ad + (dir < 0 ? 90 : -90);
        const len = 30 - (a - a0) * 0.06;
        out.push(leafEl(x, y, tang + (i % 2 ? 38 : -38) * (dir < 0 ? 1 : -1), len, len * 0.32));
      }
    }
    out.push("</g>");
    [[132, 258], [168, 258], [150, 266], [44, 120], [256, 120]].forEach(([x, y]) => out.push(`<circle cx="${x}" cy="${y}" r="3.4" fill="#d59aa4"/>`));
    const m = W.mono[lang];
    out.push(`<text x="118" y="176" text-anchor="middle" font-family="Cormorant Garamond" font-style="italic" font-weight="500" font-size="96" fill="#6f6b45">${m[0]}</text>`);
    out.push(`<text x="186" y="186" text-anchor="middle" font-family="Cormorant Garamond" font-style="italic" font-weight="500" font-size="96" fill="#6f6b45">${m[1]}</text>`);
    out.push('<text x="152" y="158" text-anchor="middle" font-family="Great Vibes" font-size="40" fill="#c27f8a">&amp;</text>');
    return out.join("");
  }
  function boughSVG() {
    const out = ['<g fill="rgba(138,132,88,.08)" stroke="#8a8458" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">'];
    out.push('<path fill="none" d="M4,4 C70,40 120,90 150,160 C165,195 172,225 176,256"/>');
    const pts = [[30, 18], [58, 36], [84, 58], [106, 84], [124, 112], [140, 140], [152, 170], [162, 200], [170, 230]];
    pts.forEach(([x, y], i) => {
      const t = Math.atan2(1, 0.6 - i * 0.05) * 180 / Math.PI;
      out.push(leafEl(x, y, t + (i % 2 ? -62 : 62) - 30, 34 - i, 10 - i * 0.4));
    });
    out.push("</g>");
    [[96, 40], [150, 120], [182, 196]].forEach(([x, y]) => out.push(`<circle cx="${x}" cy="${y}" r="3.2" fill="#e1aab3"/>`));
    return out.join("");
  }
  function sprigHSVG() {
    const out = ['<g fill="rgba(138,132,88,.10)" stroke="#8a8458" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">',
      '<path fill="none" d="M30,40 Q150,30 270,40"/>'];
    for (let i = 0; i < 9; i++) {
      const x = 52 + i * 24, y = 36 - Math.sin((i / 8) * Math.PI) * 4;
      out.push(leafEl(x, y, i % 2 ? -40 : -140, 20, 6));
    }
    out.push('</g><circle cx="150" cy="34" r="3.2" fill="#d59aa4"/>');
    return out.join("");
  }
  function drawBotany() {
    $("#wreath").innerHTML = wreathSVG();
    $("#sprigH").innerHTML = sprigHSVG();
    $("#boughTL").innerHTML = boughSVG(); $("#boughBR").innerHTML = boughSVG();
  }
  function drawBoughs() {
    $$(".bough").forEach((b) => b.classList.add("is-on"));
    if (!hasG || reduce) return;
    $$(".bough").forEach((b) => {
      $$("path", b).forEach((p) => p.setAttribute("pathLength", "1"));
      gsap.fromTo($$("path", b), { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.2, stagger: 0.07, ease: "sine.inOut" });
      gsap.fromTo($$("circle", b), { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.6, delay: 1.6, stagger: 0.15, ease: "back.out(2)" });
    });
  }

  const textParts = () => $$(".card__wreath, .card__tag, .card__names, .card__div, .card__invite, .card__date, .card__orn--sm, .card__venue, .card__kind, .card__wait, .card__hosts", card);
  function revealCard() {
    if (!hasG || reduce) { textParts().forEach((e) => { e.style.opacity = ""; e.style.filter = ""; }); afterReveal(); return; }
    gsap.to(textParts(), { opacity: 1, filter: "blur(0px)", scale: 1, duration: 1.15, ease: "power2.out", stagger: 0.055,
      onComplete() { gsap.set(textParts(), { clearProps: "filter,transform" }); afterReveal(); } });
  }
  function revealCardSlow() {
    const els = revealEls();
    const P = (sel, at, dur, ease = "sine.inOut") => tl.to($$(sel, card), { "--p": 1, duration: dur, ease, stagger: 0.12 }, at);
    const tl = gsap.timeline({ onComplete: afterReveal });
    P(".card__tag", 0, 0.9);
    P("#nGroom", 0.3, 1.15, "power1.inOut");
    P(".card__amp", 1.15, 0.6, "power1.inOut");
    P("#nBride", 1.4, 1.25, "power1.inOut");
    P(".card__div", 2.3, 0.8);
    P(".card__invite", 2.55, 0.9);
    P(".card__vr", 2.85, 0.9);
    P("#dMonth", 3.0, 0.6); P("#dDay", 3.15, 0.8); P("#dYear", 3.4, 0.6);
    P("#dWeek", 3.55, 0.7); P(".card__dcol:last-of-type", 3.75, 0.7);
    P(".card__orn--sm", 4.1, 0.8);
    P(".card__venue", 4.35, 0.8); P(".card__kind", 4.65, 0.7);
    P(".card__wait", 5.0, 1.0, "power1.inOut"); P(".card__hosts", 5.6, 1.2, "power1.inOut");
  }
  function afterReveal() {
    $(".scroll-cue").classList.add("is-on");
    if (!hasG || reduce) return;
    // фольга живёт: блеск по золоту и свет по открытке раз в несколько секунд
    gsap.timeline({ repeat: -1, repeatDelay: 7 })
      .fromTo($$(".gold"), { "--g": "120%" }, { "--g": "-20%", duration: 2.4, ease: "sine.inOut" })
      .fromTo(".card__sheen", { xPercent: 0, opacity: 0.85 }, { xPercent: 420, opacity: 0.85, duration: 2.8, ease: "sine.inOut" }, 0.2);
  }

  const swipe = $("#swipe");
  let swipeDone = false;
  function hideSwipe() { swipeDone = true; swipe.classList.remove("is-on"); }
  function showSwipe() { if (!swipeDone && scrollY < 80) swipe.classList.add("is-on"); }
  addEventListener("scroll", () => { if (!introOn && scrollY > 80) hideSwipe(); }, { passive: true });
  swipe.addEventListener("click", () => { hideSwipe(); $("#countdown").scrollIntoView({ behavior: "smooth", block: "start" }); });

  $("#seal").addEventListener("click", openEnvelope);
  $("#seal").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEnvelope(); } });

  /* ============================================================
     ПОЯВЛЕНИЕ ПРИ ПРОКРУТКЕ, КАРТА, ТАЙМЕР
     ============================================================ */
  const io = "IntersectionObserver" in window ? new IntersectionObserver((ents) => {
    for (const e of ents) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }) : null;
  function observe(els) {
    els.forEach((el, i) => {
      if (!io) { el.classList.add("is-in"); return; }
      if (el.classList.contains("prog__item") || el.classList.contains("rule")) el.style.transitionDelay = `${(i % 6) * 0.08}s`;
      io.observe(el);
    });
  }
  observe($$(".reveal"));
  const writeIO = "IntersectionObserver" in window && hasG && !reduce ? new IntersectionObserver((ents) => {
    for (const e of ents) if (e.isIntersecting) {
      writeIO.unobserve(e.target);
      const sep = e.target.classList.contains("sep");
      gsap.to(e.target, { "--p": 1, duration: sep ? 1.3 : 1.7, delay: sep ? 0 : 0.25, ease: sep ? "sine.inOut" : "power1.inOut" });
    }
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.2 }) : null;
  if (writeIO) $$(".write").forEach((el) => { el.style.setProperty("--p", 0); writeIO.observe(el); });
  if ($("#prog")) { if (io) io.observe($("#prog")); else $("#prog").classList.add("is-in"); }

  const mapIO = "IntersectionObserver" in window ? new IntersectionObserver((ents, o) => {
    if (!ents.some((e) => e.isIntersecting)) return;
    o.disconnect(); loadMap();
  }, { rootMargin: "600px 0px" }) : null;
  function loadMap() {
    const { lat, lon } = W.venue, f = document.createElement("iframe");
    f.src = W.venue.search
      ? `https://yandex.uz/map-widget/v1/?ll=${lon},${lat}&z=16&text=${encodeURIComponent(W.venue.search)}`
      : `https://yandex.uz/map-widget/v1/?ll=${lon},${lat}&z=16&pt=${lon},${lat},pm2rdm`;
    f.title = W.venue.name; f.loading = "lazy"; f.allowFullscreen = true;
    $("#vMap").appendChild(f);
  }
  if (mapIO) mapIO.observe($("#vMap")); else loadMap();
  $("#mapCover").addEventListener("click", () => {
    if (!$("#vMap iframe")) { mapIO && mapIO.disconnect(); loadMap(); }
    $("#vMap").classList.add("is-live");
  });
  $("#lnkYandex").href = W.venue.links.yandex; $("#lnk2gis").href = W.venue.links.twogis; $("#lnkGoogle").href = W.venue.links.google;

  const nums = { d: $('[data-unit="d"]'), h: $('[data-unit="h"]'), m: $('[data-unit="m"]'), s: $('[data-unit="s"]') };
  function tick() {
    let ms = when.getTime() - Date.now();
    if (ms <= 0) { $("#count").hidden = true; $("#countDone").hidden = false; return; }
    const d = Math.floor(ms / 864e5); ms -= d * 864e5;
    const h = Math.floor(ms / 36e5); ms -= h * 36e5;
    const m = Math.floor(ms / 6e4); const s = Math.floor((ms - m * 6e4) / 1e3);
    const set = (el, v) => {
      const txt = String(v).padStart(2, "0");
      if (el.textContent === txt) return;
      const first = !el.dataset.ready; el.dataset.ready = "1";
      el.textContent = txt;
      if (!first && hasG && !reduce && !document.hidden) gsap.fromTo(el, { yPercent: 55, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: "power2.out" });
    };
    set(nums.d, d); set(nums.h, h); set(nums.m, m); set(nums.s, s);
  }
  tick(); setInterval(tick, 1000);

  const agree = $("#agreeBtn");
  if (agree) agree.addEventListener("click", () => {
    const on = agree.getAttribute("aria-pressed") !== "true";
    agree.setAttribute("aria-pressed", String(on));
    agree.dataset.i18n = on ? "rules.agreed" : "rules.agree";
    agree.textContent = t(agree.dataset.i18n);
  });

  /* ============================================================
     ОТВЕТ ГОСТЯ → Google Таблица + Telegram
     ============================================================ */
  const form = $("#form"), err = $("#formErr"), send = $("#sendBtn"), more = $("#formMore");
  let guests = 1;
  const guestsOut = $("#guestsOut");
  $$(".stepper__btn").forEach((b) => b.addEventListener("click", () => {
    guests = Math.max(1, Math.min(10, guests + Number(b.dataset.step)));
    guestsOut.textContent = guests;
  }));
  form.addEventListener("change", (e) => {
    if (e.target.name === "attending") more.classList.toggle("is-hidden", e.target.value === "no");
    err.textContent = "";
  });
  function readAnswer() { try { return JSON.parse(store.get("rsvp-fotiha") || "null"); } catch { return null; } }
  function fillThanks(a) { $("#thanksText").textContent = t(a.attending === "yes" ? "rsvp.thanksYes" : "rsvp.thanksNo"); }
  function showThanks(a, animate) {
    fillThanks(a);
    form.hidden = true; $("#thanks").hidden = false;
    B.seal($("#thanksSeal"), W.mono[lang][0], W.mono[lang][1]);
    if (animate && hasG && !reduce) {
      gsap.fromTo("#thanksSeal", { scale: 1.9, rotation: -18, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.7, ease: "back.out(1.6)" });
      gsap.fromTo("#thanks .thanks__title, #thanks .thanks__text, #againBtn", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, delay: 0.35, ease: "sine.out" });
    }
  }
  $("#againBtn").addEventListener("click", () => {
    const a = readAnswer() || {};
    $("#thanks").hidden = true; form.hidden = false;
    form.name.value = a.name || "";
    $$('input[name="attending"]', form).forEach((r) => { r.checked = r.value === a.attending; });
    $$('input[name="side"]', form).forEach((r) => { r.checked = r.value === a.side; });
    form.message.value = a.message || "";
    guests = a.guests || 1; guestsOut.textContent = guests;
    more.classList.toggle("is-hidden", a.attending === "no");
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.name.value.trim().replace(/\s+/g, " ");
    const attending = (form.querySelector('input[name="attending"]:checked') || {}).value;
    if (name.length < 2) { err.textContent = t("rsvp.required"); form.name.focus(); return; }
    if (!attending) { err.textContent = t("rsvp.chooseAttend"); return; }
    const side = (form.querySelector('input[name="side"]:checked') || {}).value || "";
    const answer = { name, attending, guests: attending === "yes" ? guests : 0, side: attending === "yes" ? side : "", message: form.message.value.trim(), lang };
    if (form.website.value) { store.set("rsvp-fotiha", JSON.stringify(answer)); showThanks(answer, true); return; }   // бот-спамер

    send.disabled = true; send.firstElementChild.textContent = t("rsvp.sending"); err.textContent = "";
    try {
      const prev = readAnswer();
      const body = new URLSearchParams({ ...answer, guests: String(answer.guests), update: prev ? "1" : "", event: W.event || "" });
      if (W.rsvpEndpoint) {
        await fetch(W.rsvpEndpoint, { method: "POST", mode: "no-cors", body });
      } else {
        console.info("[RSVP] тестовый режим, ничего не отправлено:", Object.fromEntries(body));
        await new Promise((r) => setTimeout(r, 700));
      }
      store.set("rsvp-fotiha", JSON.stringify(answer));
      showThanks(answer, true);
      if (answer.attending === "yes") setTimeout(() => leafShower(24), 300);
    } catch {
      err.textContent = t("rsvp.error");
    } finally {
      send.disabled = false; send.firstElementChild.textContent = t("rsvp.send");
    }
  });

  /* ============================================================
     ЛИСТОПАД: бордовые и золотые листья медленно кружатся и падают
     ============================================================ */
  const leavesCv = $("#leaves");
  let leafList = [], leafRaf = 0, leafLast = 0;
  function leafShower(n) {
    if (reduce) return;
    const w = innerWidth, h = innerHeight;
    leavesCv.width = Math.round(w * DPR); leavesCv.height = Math.round(h * DPR);
    const now = performance.now();
    for (let i = 0; i < n; i++) leafList.push({
      x: Math.random() * w, y: -40 - Math.random() * 60, vy: 38 + Math.random() * 46, sway: 16 + Math.random() * 34,
      sf: 0.5 + Math.random() * 0.7, ph: Math.random() * 6.28, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 1.1,
      flip: 0.9 + Math.random() * 1.6, size: 7 + Math.random() * 7, gold: Math.random() < 0.22, born: now + Math.random() * 2600,
    });
    if (!leafRaf) { leafLast = now; leafRaf = requestAnimationFrame(leafTick); }
  }
  function drawLeaf(c, s, khaki) {                                 // лепесток
    c.beginPath(); c.moveTo(0, -s);
    c.bezierCurveTo(s * 0.95, -s * 0.55, s * 0.7, s * 0.85, 0, s);
    c.bezierCurveTo(-s * 0.7, s * 0.85, -s * 0.95, -s * 0.55, 0, -s); c.closePath();
    const g = c.createLinearGradient(-s, -s, s, s);
    if (khaki) { g.addColorStop(0, "#d6d2a6"); g.addColorStop(1, "#8a8458"); }
    else { g.addColorStop(0, "#fde3e6"); g.addColorStop(0.55, "#efb6bf"); g.addColorStop(1, "#cf8b97"); }
    c.fillStyle = g; c.fill();
  }
  function leafTick(now) {
    const dt = Math.min(0.05, (now - leafLast) / 1000); leafLast = now;
    const c = leavesCv.getContext("2d"), h = innerHeight;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, leavesCv.width, leavesCv.height);
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    leafList = leafList.filter((l) => l.y < h + 40);
    for (const l of leafList) {
      if (now < l.born) continue;
      const t = (now - l.born) / 1000;
      l.y += l.vy * dt;
      const x = l.x + Math.sin(t * l.sf + l.ph) * l.sway;
      const fade = Math.min(1, t / 0.8) * Math.min(1, (h + 40 - l.y) / 160);
      c.save(); c.globalAlpha = 0.92 * fade;
      c.translate(x, l.y); c.rotate(l.rot + t * l.vr + Math.sin(t * l.sf + l.ph) * 0.5);
      c.scale(Math.cos(t * l.flip + l.ph), 1);                 // лист переворачивается в воздухе
      drawLeaf(c, l.size, l.gold);
      c.restore();
    }
    if (leafList.length) leafRaf = requestAnimationFrame(leafTick);
    else { leafRaf = 0; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, leavesCv.width, leavesCv.height); }
  }

  /* ============================================================
     СТАРТ
     ============================================================ */
  layout();
  initGL();
  bakePaper();
  applyLang();
  const saved = readAnswer(); if (saved) showThanks(saved, false);
  if (hasG && !reduce) gsap.set(textParts(), { opacity: 0, filter: "blur(14px)", scale: 1.04 });

  const fontsReady = Promise.race([
    Promise.all([
      document.fonts.load('400 40px "Great Vibes"', "BekzodFerangiz&БекзодФерангиз"),
      document.fonts.load('400 20px "Forum"', "SOFINUR ДВА"),
      document.fonts.load('italic 500 20px "Cormorant Garamond"', "To‘yxonasi Банкетный"),
    ]),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  fontsReady.then(() => {
    bakeEnvelope();
    drawBotany();
    startLoop();
    if (hasG && !reduce) {
      gsap.fromTo("#env", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: "power2.out" });
      gsap.to("#hint", { opacity: 1, duration: 0.8, delay: 0.6 });
    } else { $("#env").style.opacity = 1; $("#hint").style.opacity = 1; }
    // предзагрузка музыки после первого кадра
    setTimeout(loadMusic, 1500);
  });
})();
