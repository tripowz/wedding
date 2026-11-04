(() => {
  "use strict";

  const W = window.WEDDING;
  const I18N = window.I18N;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = matchMedia("(pointer: coarse)").matches;

  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.MotionPathPlugin) gsap.registerPlugin(MotionPathPlugin);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  // Детерминированный «случай», чтобы формы бумаги и воска были одинаковыми при каждой загрузке
  let seed = 20261111;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  /* ------------------------------------------------------------
     Дата
     ------------------------------------------------------------ */
  const [Y, M, D] = W.date.slice(0, 10).split("-").map(Number);
  const TIME = W.date.slice(11, 16);
  const WEEKDAY = new Date(Date.UTC(Y, M - 1, D)).getUTCDay();
  const [, DM, DD] = W.rsvpDeadline.split("-").map(Number);
  const pad = (n) => String(n).padStart(2, "0");

  /* ------------------------------------------------------------
     Язык
     ------------------------------------------------------------ */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* приватный режим */ } },
  };
  const urlLang = new URLSearchParams(location.search).get("lang");
  let lang = ["uz", "ru"].includes(urlLang) ? urlLang
    : ["uz", "ru"].includes(store.get("lang")) ? store.get("lang")
    : (navigator.language || "").toLowerCase().startsWith("ru") ? "ru" : "uz";

  const t = (key) => (I18N[lang] && I18N[lang][key]) ?? I18N.uz[key] ?? key;
  const L = (obj) => (typeof obj === "string" ? obj : obj[lang] ?? obj.uz);
  const fmtLong = () => lang === "ru" ? `${D} ${t("monthsGen")[M - 1]} ${Y}` : `${D}-${t("monthsGen")[M - 1]}, ${Y}`;
  const fmtDeadline = () => lang === "ru" ? `${DD} ${t("monthsGen")[DM - 1]}` : `${DD}-${t("monthsGen")[DM - 1]}`;

  /* ------------------------------------------------------------
     Генераторы форм
     ------------------------------------------------------------ */
  const pt = (r, a) => `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
  const star = (n, R, r, off = 0) => {
    const pts = [];
    for (let i = 0; i < n * 2; i++) pts.push(pt(i % 2 ? r : R, (Math.PI / n) * i + off - Math.PI / 2));
    return pts.join(" ");
  };
  const square = (R, off) => [0, 1, 2, 3].map((k) => pt(R, off + (k * Math.PI) / 2)).join(" ");

  function girihSVG() {
    let s = '<svg viewBox="-100 -100 200 200" aria-hidden="true">';
    s += '<circle r="98"/>';
    s += `<polygon points="${star(16, 95, 82)}"/>`;
    s += '<circle r="74"/>';
    s += `<polygon points="${square(71, 0)}"/><polygon points="${square(71, Math.PI / 4)}"/>`;
    s += `<polygon points="${star(8, 50, 31, Math.PI / 8)}"/>`;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      s += `<path d="M${pt(13, a)} Q${pt(27, a - 0.42)} ${pt(38, a)} Q${pt(27, a + 0.42)} ${pt(13, a)}"/>`;
    }
    return s + '<circle r="13"/></svg>';
  }

  // Плавная замкнутая кривая через точки (Catmull-Rom → Безье)
  function smoothClosed(p) {
    const n = p.length;
    let d = "";
    for (let i = 0; i < n; i++) {
      const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
      if (i === 0) d += `M${p1[0].toFixed(2)},${p1[1].toFixed(2)}`;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
    }
    return d + "Z";
  }

  // Неровная капля воска
  const WAX_BLOB = (() => {
    const pts = [];
    const n = 20;
    const bumps = new Set([3, 9, 15]);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 50 + (rnd() - 0.5) * 4 + (bumps.has(i) ? 4 + rnd() * 3 : 0);
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return smoothClosed(pts);
  })();

  function sealSVG(text) {
    let dots = "";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      dots += `<circle cx="${(Math.cos(a) * 42.5).toFixed(2)}" cy="${(Math.sin(a) * 42.5).toFixed(2)}" r="1.1" fill="#4F4B30" fill-opacity=".55"/>`;
    }
    return `<svg viewBox="-60 -60 120 120" aria-hidden="true">
      <path d="${WAX_BLOB}" fill="url(#wax)" filter="url(#emboss)"/>
      <circle r="37" fill="url(#waxWell)"/>
      <circle r="37" fill="none" stroke="#3E3B25" stroke-opacity=".45" stroke-width="1.4"/>
      <g filter="url(#emboss)">
        <circle class="seal-orn" r="32" stroke-dasharray="1.2 3.2"/>
        ${dots}
        <text class="seal-text" x="0" y="2" text-anchor="middle" dominant-baseline="middle">${text}</text>
      </g>
    </svg>`;
  }

  // Рваный край бумаги (clip-path)
  function deckleRect(el, amp = 1.2, step = 7) {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) return "";
    const P = [];
    const j = () => rnd() * amp;
    for (let x = 0; x <= w; x += step) P.push([x, j()]);
    for (let y = step; y <= h; y += step) P.push([w - j(), y]);
    for (let x = w - step; x >= 0; x -= step) P.push([x, h - j()]);
    for (let y = h - step; y > 0; y -= step) P.push([j(), y]);
    return `polygon(${P.map(([x, y]) => `${((x / w) * 100).toFixed(2)}% ${((y / h) * 100).toFixed(2)}%`).join(",")})`;
  }

  function deckleFlap(el, amp = 1.3) {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!w) return;
    const P = [[0, 0], [w, 0]];
    const tip = [w / 2, h];
    const side = (A, B, steps) => {
      const nx = -(B[1] - A[1]), ny = B[0] - A[0];
      const len = Math.hypot(nx, ny);
      for (let i = 1; i < steps; i++) {
        const k = i / steps;
        const j = (rnd() - 0.5) * 2 * amp;
        P.push([A[0] + (B[0] - A[0]) * k + (nx / len) * j, A[1] + (B[1] - A[1]) * k + (ny / len) * j]);
      }
    };
    side([w, 0], [w / 2 + 10, h - 5], 40);
    P.push([w / 2 + 5, h - 1.5], tip, [w / 2 - 5, h - 1.5]);
    side([w / 2 - 10, h - 5], [0, 0], 40);
    const toPoly = (flip) => `polygon(${P.map(([x, y]) => `${((x / w) * 100).toFixed(2)}% ${(((flip ? h - y : y) / h) * 100).toFixed(2)}%`).join(",")})`;
    $(".flap__face--out", el).style.clipPath = toPoly(false);
    $(".flap__face--in", el).style.clipPath = toPoly(true);
  }

  function bottomFoldPoly() {
    const P = [[0, 100]];
    const q = (a, c, b, k) => (1 - k) * (1 - k) * a + 2 * (1 - k) * k * c + k * k * b;
    for (let i = 0; i <= 14; i++) { const k = i / 14; P.push([q(0, 20, 50, k), q(97, 60, 45, k) + (rnd() - .5) * .5]); }
    for (let i = 1; i <= 14; i++) { const k = i / 14; P.push([q(50, 80, 100, k), q(45, 60, 97, k) + (rnd() - .5) * .5]); }
    P.push([100, 100]);
    return `polygon(${P.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(",")})`;
  }

  // Тень ветки для «солнечных бликов»
  function branchURI() {
    let s = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 150'>";
    s += "<g fill='%233E3A22'><path d='M0 80 Q200 55 400 92' stroke='%233E3A22' stroke-width='3' fill='none'/>";
    for (let i = 0; i < 16; i++) {
      const x = 14 + i * 24, k = x / 400;
      const y = (1 - k) * (1 - k) * 80 + 2 * (1 - k) * k * 55 + k * k * 92;
      const size = 14 + Math.sin((i / 15) * Math.PI) * 18;
      [-1, 1].forEach((sd) => {
        const a = (sd * (34 + rnd() * 14) - 8) * Math.PI / 180;
        const cx = x + Math.cos(a) * size * 0.95, cy = y + Math.sin(a) * size * 0.95;
        s += `<ellipse cx='${cx.toFixed(1)}' cy='${cy.toFixed(1)}' rx='${size.toFixed(1)}' ry='${(size * 0.3).toFixed(1)}' transform='rotate(${(a * 180 / Math.PI).toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})'/>`;
      });
    }
    s += "</g></svg>";
    return `url("data:image/svg+xml,${encodeURIComponent(s).replace(/%25/g, "%")}")`;
  }

  function fitStroke(svg) {
    const vb = svg.viewBox.baseVal;
    if (!vb || !vb.width || !svg.clientWidth) return;
    const scale = Math.min(svg.clientWidth / vb.width, svg.clientHeight / vb.height);
    svg.style.setProperty("--sw", (1 / scale).toFixed(3));
  }
  function prepDraw(svg) {
    $$("path, circle, polygon", svg).forEach((el) => {
      const len = el.getTotalLength ? el.getTotalLength() : 600;
      el.style.strokeDasharray = `${len} ${len}`;
      el.style.strokeDashoffset = len;
    });
  }
  const draw = (svg, o = {}) => gsap.to($$("path, circle, polygon", svg), { strokeDashoffset: 0, duration: o.duration ?? 1.6, stagger: o.stagger ?? 0.08, ease: o.ease ?? "power2.inOut" });

  function splitChars(el, text) {
    el.textContent = "";
    const words = text.split(" ");
    words.forEach((word, i) => {
      const line = document.createElement("span");
      line.className = "split-line";
      Array.from(word).forEach((ch) => {
        const c = document.createElement("span");
        c.className = "split-char";
        c.textContent = ch;
        line.appendChild(c);
      });
      el.appendChild(line);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
    return $$(".split-char", el);
  }
  function splitWords(el, text) {
    el.textContent = "";
    text.split(" ").forEach((w, i, arr) => {
      const s = document.createElement("span");
      s.className = "w";
      s.textContent = w + (i < arr.length - 1 ? " " : "");
      el.appendChild(s);
    });
    return $$(".w", el);
  }

  const ICONS = {
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    rings: '<circle cx="9" cy="14" r="5.2"/><circle cx="15" cy="14" r="5.2"/><path d="M13.4 5.6l1.6-2 1.6 2-1.6 1.6z"/>',
    note: '<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.8" cy="17.5" r="2.4"/><circle cx="16.8" cy="15.5" r="2.4"/>',
    piyola: '<path d="M3 10.5h18c0 4.8-4 8-9 8s-9-3.2-9-8z"/><path d="M8.5 21h7"/><path d="M9.5 7.5c0-1.2 1.2-1.6 1.2-2.8M13.3 7.5c0-1.2 1.2-1.6 1.2-2.8"/>',
    phone: '<rect x="7" y="2.8" width="10" height="18.4" rx="2.2"/><path d="M11 18h2"/>',
    cake: '<path d="M3.5 21h17"/><path d="M5 21v-6.5h14V21"/><path d="M7.5 14.5V10.5h9v4"/><path d="M5 17.6c1.2.9 2.3.9 3.5 0s2.3-.9 3.5 0 2.3.9 3.5 0 2.3-.9 3.5 0"/><path d="M12 10.5V8"/><path d="M12 6c-.8-.7-.8-1.8 0-2.7.8.9.8 2 0 2.7z"/>',
  };
  const ARCH_LINE = "M-6,153 V52 C-6,25 16,8 50,-6 C84,8 106,25 106,52 V153";

  /* ------------------------------------------------------------
     Построение страницы
     ------------------------------------------------------------ */
  const ASTRO_RINGS = [
    { key: "seconds", n: 60, r1: 164, r2: 138, lr: 151, major: 5 },
    { key: "minutes", n: 60, r1: 134, r2: 108, lr: 121, major: 5 },
    { key: "hours", n: 24, r1: 104, r2: 82, lr: 93, major: 6, cls: "lbl--h" },
  ];

  function buildAstro() {
    const svg = $("#astroSvg");
    let s = "";
    ASTRO_RINGS.forEach((r) => {
      const mid = (r.r1 + r.r2) / 2;
      s += `<g class="ring" data-key="${r.key}">`;
      s += `<circle r="${mid}" fill="none" stroke="rgba(251,248,241,.78)" stroke-width="${r.r1 - r.r2}"/>`;
      s += `<circle class="orn" r="${r.r1}"/><circle class="orn" r="${r.r2}"/>`;
      for (let i = 0; i < r.n; i++) {
        const a = (i / r.n) * 360;
        const major = i % r.major === 0;
        s += `<line class="tick${major ? " tick--major" : ""}" x1="0" y1="${-r.r2 - 1}" x2="0" y2="${-r.r2 - (major ? 6 : 3)}" transform="rotate(${a})"/>`;
        s += `<text class="lbl ${r.cls || ""}" data-i="${i}" transform="rotate(${a}) translate(0 ${-r.lr - 1})">${pad(i)}</text>`;
      }
      s += "</g>";
    });
    s += '<circle class="disc" r="78"/>';
    s += `<g class="orn-disc"><polygon class="orn" points="${star(16, 74, 66)}"/><circle class="orn" r="62"/></g>`;
    s += '<rect class="window" x="-10" y="-167" width="20" height="87" rx="10"/>';
    s += '<polygon class="pointer" points="0,-168 -5,-177 5,-177"/>';
    svg.innerHTML = s;
  }

  function build() {
    document.documentElement.style.setProperty("--branch", branchURI());

    $$("[data-photo]").forEach((img) => {
      img.src = W.photos[img.dataset.photo];
      img.decoding = "async";
      if (img.dataset.photo !== "hero") img.loading = "lazy";
    });
    $$("[data-ornament]").forEach((el) => (el.innerHTML = girihSVG()));
    $$("[data-short-date]").forEach((el) => (el.textContent = `${pad(D)} · ${pad(M)} · ${Y}`));

    // Печати
    const initials = W.initials.replace(/\s/g, "");
    $("#seal").innerHTML = sealSVG(initials);
    $("#sendSeal").innerHTML = sealSVG(initials);
    $("#thanksSeal").innerHTML = sealSVG(initials);

    // Круговой бейдж
    $("#badgeText").textContent = `${L(W.groom).toUpperCase()} · ${L(W.bride).toUpperCase()} · ${pad(D)}.${pad(M)}.${Y} · `;
    $(".badge__star").innerHTML = `<polygon points="${star(8, 16, 7, Math.PI / 8)}"/><circle r="3"/>`;

    // Программа
    const list = $("#threadList");
    W.program.forEach((p) => {
      const li = document.createElement("li");
      li.className = "ev";
      li.innerHTML = `<span class="ev__knot"></span><div class="ev__time">${p.time}</div><h3 class="ev__title i18n-dyn"></h3><p class="ev__note i18n-dyn"></p>`;
      list.appendChild(li);
    });

    // Правила
    const stack = $("#rulesStack");
    (W.rules || []).forEach((r, i) => {
      const card = document.createElement("article");
      card.className = "rule";
      card.style.setProperty("--i", i);
      card.innerHTML = `
        <div class="rule__head">
          <span class="rule__icon"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[r.icon] || ICONS.clock}</svg></span>
          <span class="rule__num">${pad(i + 1)}</span>
        </div>
        <h3 class="rule__title i18n-dyn"></h3>
        <p class="rule__text i18n-dyn"></p>`;
      stack.appendChild(card);
    });
    if (!stack.children.length) $("#rules").hidden = true;

    // Ротонда
    const ring = $("#ring");
    W.photos.gallery.forEach((src) => {
      const c = document.createElement("figure");
      c.className = "rcard";
      c.style.margin = "0";
      c.innerHTML = `<div class="rcard__in">
          <div class="rcard__frame"><img src="${src}" alt="" loading="lazy" decoding="async"/></div>
          <div class="rcard__shade"></div>
          <svg class="rcard__line" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true"><path d="${ARCH_LINE}" vector-effect="non-scaling-stroke"/></svg>
        </div>`;
      ring.appendChild(c);
    });

    // Календарь
    const grid = $("#calGrid");
    for (let i = 0; i < 7; i++) {
      const wd = document.createElement("div");
      wd.className = "wd";
      wd.dataset.wd = i;
      grid.appendChild(wd);
    }
    const first = (new Date(Date.UTC(Y, M - 1, 1)).getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(Y, M, 0)).getUTCDate();
    for (let i = 0; i < first; i++) {
      const e = document.createElement("div");
      e.className = "d is-off";
      e.textContent = "·";
      grid.appendChild(e);
    }
    for (let d = 1; d <= days; d++) {
      const e = document.createElement("div");
      e.className = "d";
      e.textContent = d;
      if (d === D) {
        e.classList.add("is-day");
        e.innerHTML = `${d}<span class="ripple"></span><span class="stamp">${sealSVG(String(d))}</span>`;
      }
      grid.appendChild(e);
    }

    buildAstro();

    // Карта и ссылки
    const { lat, lon } = W.venue;
    const links = W.venue.links || {};
    $("#linkYandex").href = links.yandex || `https://yandex.uz/maps/?rtext=~${lat},${lon}&rtt=auto`;
    $("#linkGoogle").href = links.google || `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    $("#link2gis").href = links.twogis || `https://2gis.uz/geo/${lon}%2C${lat}`;

    // Песню начинаем грузить в фоне, чуть позже основного контента
    setTimeout(loadMusic, 1200);
  }

  function paperEdges() {
    const back = $(".env__back");
    const poly = deckleRect(back, 1.1, 6);
    back.style.clipPath = poly;
    $(".env__front").style.clipPath = poly;
    $(".card").style.clipPath = deckleRect($(".card"), 1.4, 6);
    $(".fold--b").style.clipPath = bottomFoldPoly();
    deckleFlap($("#flap"));
  }

  function loadMap() {
    const box = $("#venueMap");
    if (box.dataset.loaded) return;
    box.dataset.loaded = "1";
    const { lat, lon } = W.venue;
    const a = document.createElement("a");
    a.href = $("#linkYandex").href;
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", t("venue.route"));
    a.style.cssText = "display:block;width:100%;height:100%";
    const f = document.createElement("iframe");
    f.src = `https://yandex.uz/map-widget/v1/?ll=${lon},${lat}&z=16&pt=${lon},${lat},pm2dgl`;
    f.loading = "lazy";
    f.title = "Map";
    f.style.pointerEvents = "none";
    a.appendChild(f);
    box.appendChild(a);
  }

  /* ------------------------------------------------------------
     Тексты
     ------------------------------------------------------------ */
  let heroPlayed = false;
  let wordsTween = null;

  function applyTexts() {
    document.documentElement.lang = lang;
    $$("[data-lang]").forEach((b) => b.classList.toggle("is-active", b.dataset.lang === lang));

    $$("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      if (el.hasAttribute("data-words")) return;
      if (el.hasAttribute("data-split")) {
        const chars = splitChars(el, t(key));
        if (hasGsap && !el.dataset.played) gsap.set(chars, { yPercent: 115 });
        return;
      }
      el.textContent = t(key);
    });

    $$("[data-name]").forEach((el) => {
      const txt = L(W[el.dataset.name]);
      if (el.classList.contains("hn")) {
        const chars = splitChars(el, txt);
        if (hasGsap && !heroPlayed) gsap.set(chars, { opacity: 0 });
      } else {
        el.textContent = txt;
      }
    });
    document.title = `${L(W.groom)} & ${L(W.bride)} — ${lang === "ru" ? "Приглашение на свадьбу" : "To'y taklifnomasi"}`;
    $("#badgeText").textContent = `${L(W.groom).toUpperCase()} · ${L(W.bride).toUpperCase()} · ${pad(D)}.${pad(M)}.${Y} · ${t("city").toUpperCase()} · `;

    const inv = $(".invite__text");
    const words = splitWords(inv, t("invite.text"));
    if (hasGsap) {
      if (wordsTween) { wordsTween.scrollTrigger && wordsTween.scrollTrigger.kill(); wordsTween.kill(); }
      wordsTween = gsap.fromTo(words, { opacity: 0.12, y: 12, color: "#B9B28C" }, {
        opacity: 1, y: 0, color: "#2E2D24", ease: "none", stagger: 0.08,
        scrollTrigger: { trigger: inv, start: "top 82%", end: "bottom 52%", scrub: 0.6 },
      });
    }

    $("#weekday").textContent = t("weekdaysLong")[WEEKDAY];
    $("#bigDate").textContent = fmtLong();
    $("#bigTime").textContent = lang === "ru" ? `Начало в ${TIME}` : `Soat ${TIME} da`;
    $("#calMonth").textContent = `${t("months")[M - 1]} ${Y}`;
    $$("#calGrid .wd").forEach((el) => (el.textContent = t("weekdays")[+el.dataset.wd]));

    $$(".ev").forEach((li, i) => {
      $(".ev__title", li).textContent = L(W.program[i]);
      $(".ev__note", li).textContent = W.program[i].note ? L(W.program[i].note) : "";
    });
    $$(".rule").forEach((card, i) => {
      $(".rule__title", card).textContent = L(W.rules[i].title);
      $(".rule__text", card).textContent = L(W.rules[i].text);
    });
    const agreeBtn = $("#agreeBtn");
    if (agreeBtn.classList.contains("is-on")) $(".rules__agree-text", agreeBtn).textContent = t("rules.agreed");
    if ($("#sochqiBtn").dataset.used) $("#sochqiBtn span").textContent = t("sochqi.again");

    $("#venueName").textContent = L(W.venue.name);
    $("#venueAddr").textContent = L(W.venue.address);
    $("#hosts").textContent = L(W.hosts);
    $("#rsvpSub").textContent = t("rsvp.sub").replace("{date}", fmtDeadline());
    updateThanksText();
  }

  function setLang(next) {
    if (next === lang) return;
    lang = next;
    store.set("lang", lang);
    document.body.classList.add("lang-fade");
    setTimeout(() => {
      applyTexts();
      requestAnimationFrame(() => {
        document.body.classList.remove("lang-fade");
        if (hasGsap) ScrollTrigger.refresh();
      });
    }, 260);
  }

  /* ------------------------------------------------------------
     Плавный скролл
     ------------------------------------------------------------ */
  let lenis = null;
  if (hasGsap && window.Lenis && !reduced) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* ------------------------------------------------------------
     Музыка
     ------------------------------------------------------------ */
  const audio = $("#bgm");
  const musicBtn = $("#musicBtn");
  let wantMusic = false;
  const setMusicUI = (on) => { musicBtn.classList.toggle("is-playing", on); musicBtn.setAttribute("aria-pressed", String(on)); };
  // Первый запуск — с заданной секунды, повторы по кругу — тоже с неё
  const START = +W.musicStart || 0;
  if (START) {
    audio.loop = false;
    audio.addEventListener("ended", () => { audio.currentTime = START; audio.play().catch(() => {}); });
  }
  let unlocked = false;
  let started = false;

  // Песня загружается в память целиком: так перемотка на START работает на любом сервере
  // и при открытии конверта не нужно ждать буферизации
  let musicLoad = null;
  function loadMusic() {
    if (musicLoad) return musicLoad;
    musicLoad = fetch(W.music)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then((b) => {
        if (started) return; // уже играет потоком — не перебиваем
        audio.src = URL.createObjectURL(b);
        audio.load();
      })
      .catch(() => { musicBtn.hidden = true; });
    return musicLoad;
  }
  const seekStart = () => new Promise((res) => {
    const go = () => { try { audio.currentTime = START; } catch { /* ещё не готово */ } res(); };
    if (audio.readyState >= 1) go(); else audio.addEventListener("loadedmetadata", go, { once: true });
  });

  // Нажатие на печать: браузер разрешает звук только по жесту гостя,
  // поэтому здесь «разблокируем» аудио беззвучно, а песня начнётся при открытии открытки
  function primeMusic() {
    if (unlocked) return;
    unlocked = true;
    if (!audio.src) audio.src = W.music;
    audio.muted = true;
    const p = audio.play();
    const park = () => { if (!started) audio.pause(); audio.muted = false; };
    if (p && p.then) p.then(park).catch(() => { audio.muted = false; });
    else park();
  }
  async function fadeInMusic() {
    if (!unlocked || started) return;
    started = true;
    wantMusic = true;
    // Ждём полную загрузку не дольше 2,5 с, иначе играем потоком
    await Promise.race([loadMusic(), new Promise((r) => setTimeout(r, 2500))]);
    await seekStart();
    audio.muted = false;
    audio.volume = 0.25;
    audio.play().then(() => {
      setMusicUI(true);
      if (hasGsap) gsap.to(audio, { volume: 0.65, duration: 1.4, ease: "power1.out" }); else audio.volume = 0.65;
    }).catch(() => { started = false; wantMusic = false; });
  }
  audio.addEventListener("error", () => { if (!musicLoad) musicBtn.hidden = true; });
  musicBtn.addEventListener("click", () => {
    if (audio.paused) {
      wantMusic = true;
      if (!started) { started = true; audio.currentTime = START; }
      audio.muted = false;
      audio.volume = 0.65;
      audio.play().then(() => setMusicUI(true)).catch(() => {});
    } else {
      wantMusic = false;
      audio.pause();
      setMusicUI(false);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) audio.pause();
    else if (wantMusic) audio.play().catch(() => {});
  });

  /* ------------------------------------------------------------
     Вспомогательное: удержание, разлёт частиц
     ------------------------------------------------------------ */
  const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch { /* нет вибро */ } };

  function burst(origin, { count = 18, colors = ["#FBF8F1", "#B9B28C", "#8A8458"], spread = 120, host } = {}) {
    const r = origin.getBoundingClientRect();
    const layer = host || $("#rain");
    const hr = layer.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      const size = 3 + Math.random() * 6;
      s.style.cssText = `position:absolute;left:${r.left - hr.left + r.width / 2}px;top:${r.top - hr.top + r.height / 2}px;width:${size}px;height:${size}px;border-radius:50%;pointer-events:none;background:${colors[i % colors.length]};box-shadow:0 1px 3px rgba(60,57,35,.3)`;
      layer.appendChild(s);
      const a = Math.random() * Math.PI * 2;
      const d = spread * (0.4 + Math.random() * 0.6);
      gsap.to(s, {
        x: Math.cos(a) * d, y: Math.sin(a) * d + 30, opacity: 0, scale: 0.4,
        duration: 0.9 + Math.random() * 0.6, ease: "power3.out", onComplete: () => s.remove(),
      });
    }
  }

  // Удержание кнопки-печати: возвращает объект с play/cancel
  function makeHold(wrap, sealEl, duration, onDone, extra) {
    const bar = $(".hold-ring__bar", wrap);
    const tl = gsap.timeline({ paused: true, onComplete: onDone });
    tl.to(bar, { strokeDashoffset: 0, duration, ease: "none" }, 0)
      .to(sealEl, { scale: 0.9, duration, ease: "power1.in" }, 0);
    if (extra) extra(tl, duration);
    tl.eventCallback("onUpdate", () => {
      const p = tl.progress();
      if (p > 0.55 && p < 1) gsap.set($("svg", sealEl), { x: (Math.random() - 0.5) * (p - 0.55) * 9, y: (Math.random() - 0.5) * (p - 0.55) * 9 });
    });
    return {
      tl,
      play() { tl.timeScale(1).play(); },
      cancel() { tl.timeScale(2.6).reverse(); gsap.set($("svg", sealEl), { x: 0, y: 0 }); },
    };
  }

  /* ------------------------------------------------------------
     ИНТРО: конверт
     ------------------------------------------------------------ */
  const env = $("#env");
  let broken = false;
  let idleTween = null;
  let introHold = null;

  function introSetup() {
    gsap.set(env, { rotationX: 26, rotationZ: -5 });
    gsap.set(".env__shadow", { z: -4 });
    gsap.set(".env__back", { z: 0 });
    gsap.set("#card", { z: 0.6 });
    gsap.set(".env__front", { z: 1.2 });
    gsap.set("#flap", { z: 1.8 });
    gsap.set("#twine", { z: 2.4 });
    gsap.set("#sealWrap", { z: 3 });

    gsap.from(env, { y: 80, rotationX: 55, autoAlpha: 0, duration: 1.8, ease: "power3.out" });
    gsap.from([".intro__head", "#introHint"], { autoAlpha: 0, y: 16, duration: 1.1, stagger: 0.25, delay: 0.5, ease: "power3.out" });
    idleTween = gsap.to(env, { rotationY: 5, rotationZ: -3, duration: 3.6, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.6 });

    // Наклон за курсором
    if (!isTouch) {
      $("#intro").addEventListener("pointermove", (e) => {
        if (broken || holding) return;
        if (idleTween) { idleTween.kill(); idleTween = null; }
        const dx = e.clientX / innerWidth - 0.5, dy = e.clientY / innerHeight - 0.5;
        gsap.to(env, { rotationY: dx * 14, rotationX: 26 - dy * 12, duration: 0.9, ease: "power2.out" });
      });
    }

    introHold = makeHold($("#sealWrap"), $("#seal"), 1.1, breakSeal, (tl, d) => {
      tl.to(env, { rotationX: 6, rotationY: 0, rotationZ: 0, y: -12, duration: d, ease: "power2.inOut" }, 0)
        .to("#introHint", { autoAlpha: 0.25, duration: 0.4 }, 0)
        .to(".env__shadow", { scale: 1.08, opacity: 0.7, duration: d }, 0);
    });

    let pressAt = 0;
    const seal = $("#seal");
    seal.addEventListener("pointerdown", (e) => {
      if (broken) return;
      e.preventDefault();
      try { seal.setPointerCapture(e.pointerId); } catch { /* ок */ }
      holding = true;
      pressAt = performance.now();
      primeMusic();
      if (idleTween) { idleTween.kill(); idleTween = null; }
      vibrate(10);
      introHold.play();
    });
    const release = () => {
      if (!holding || broken) return;
      holding = false;
      introHold.cancel();
      if (performance.now() - pressAt < 450) nudgeHint();
    };
    seal.addEventListener("pointerup", release);
    seal.addEventListener("pointercancel", release);
    seal.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); primeMusic(); breakSeal(); }
    });
  }
  let holding = false;

  function nudgeHint() {
    const span = $("#introHint span");
    span.textContent = t("intro.holdMore");
    gsap.fromTo("#introHint", { x: -8 }, { x: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
    gsap.fromTo("#seal", { rotation: -6 }, { rotation: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
    clearTimeout(nudgeHint.tm);
    nudgeHint.tm = setTimeout(() => { span.textContent = t("intro.hold"); }, 2200);
  }

  function breakSeal() {
    if (broken) return;
    broken = true;
    holding = false;
    vibrate([25, 40, 70]);
    if (idleTween) { idleTween.kill(); idleTween = null; }
    gsap.to(env, { rotationX: 6, rotationY: 0, rotationZ: 0, duration: 0.6, ease: "power2.out" });
    gsap.set($("#seal svg"), { x: 0, y: 0 });

    // Осколки: клинья от точки удара
    const shardsHost = $("#sealShards");
    const c = [50 + (rnd() - 0.5) * 12, 50 + (rnd() - 0.5) * 12];
    const n = 5;
    const angles = [];
    for (let i = 0; i < n; i++) angles.push((i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.7);
    const edgeMid = angles.map((a) => [c[0] + Math.cos(a) * 22 + (rnd() - 0.5) * 9, c[1] + Math.sin(a) * 22 + (rnd() - 0.5) * 9]);
    const outer = (a) => [50 + Math.cos(a) * 80, 50 + Math.sin(a) * 80];
    let crackSVG = '<svg viewBox="0 0 100 100" style="position:absolute;inset:0;overflow:visible">';
    for (let i = 0; i < n; i++) {
      const a0 = angles[i], a1 = angles[(i + 1) % n] + (i === n - 1 ? Math.PI * 2 : 0);
      const P = [c, edgeMid[i]];
      for (let k = 0; k <= 5; k++) P.push(outer(a0 + ((a1 - a0) * k) / 5));
      P.push(edgeMid[(i + 1) % n]);
      const div = document.createElement("div");
      div.innerHTML = sealSVG(W.initials.replace(/\s/g, ""));
      div.style.clipPath = `polygon(${P.map((p) => `${p[0].toFixed(1)}% ${p[1].toFixed(1)}%`).join(",")})`;
      div.dataset.dir = String((a0 + a1) / 2);
      shardsHost.appendChild(div);
      const o = outer(a0);
      crackSVG += `<polyline class="seal-crack" points="${c.join(",")} ${edgeMid[i].join(",")} ${(c[0] + (o[0] - c[0]) * 0.62).toFixed(1)},${(c[1] + (o[1] - c[1]) * 0.62).toFixed(1)}"/>`;
    }
    crackSVG += "</svg>";
    $("#seal").insertAdjacentHTML("beforeend", crackSVG);
    const cracks = $$(".seal-crack", $("#seal"));
    cracks.forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });

    const shards = $$("div", shardsHost);
    const tl = gsap.timeline();
    tl.to(".hold-ring", { autoAlpha: 0, duration: 0.3 }, 0)
      .to("#seal", { scale: 1.04, duration: 0.08 }, 0)
      .to(cracks, { strokeDashoffset: 0, duration: 0.18, stagger: 0.03, ease: "power2.out" }, 0.02)
      .set("#seal", { autoAlpha: 0 }, 0.26)
      .set(shards, { opacity: 1, scale: 0.94 }, 0.26)
      .add(() => burst($("#sealWrap"), { count: 16, colors: ["#8A8458", "#5E5A3A", "#A39C6C"], spread: 90 }), 0.26);

    shards.forEach((s) => {
      const a = +s.dataset.dir;
      const dx = Math.cos(a), dy = Math.sin(a);
      tl.to(s, { x: dx * 26, y: dy * 26, rotation: dx * 14, duration: 0.2, ease: "power2.out" }, 0.26)
        .to(s, {
          x: `+=${dx * (70 + rnd() * 90)}`, y: `+=${innerHeight * (0.55 + rnd() * 0.3)}`,
          rotation: `+=${(dx > 0 ? 1 : -1) * (120 + rnd() * 200)}`, rotationX: 60 + rnd() * 160,
          duration: 1.15 + rnd() * 0.3, ease: "power2.in",
        }, 0.46)
        .to(s, { opacity: 0, duration: 0.3 }, 1.2);
    });

    // Бечёвка соскальзывает
    tl.to(".twine__l", { x: -50, y: 40, rotation: -14, autoAlpha: 0, duration: 0.9, ease: "power2.in" }, 0.3)
      .to(".twine__r", { x: 50, y: 46, rotation: 12, autoAlpha: 0, duration: 0.9, ease: "power2.in" }, 0.32)
      .to(".intro__head, #introHint, .lang--intro", { autoAlpha: 0, y: -10, duration: 0.5 }, 0.2)
      // Клапан открывается в 3D
      .to("#flap", { rotationX: 180, duration: 1.05, ease: "power2.inOut" }, 0.55)
      .set("#flap", { z: -1 }, 1.1)
      .to(env, { y: 40, duration: 1.2, ease: "power2.inOut" }, 0.9)
      // Открытка выезжает
      .to("#card", { yPercent: -64, duration: 1.1, ease: "power3.out" }, 1.4)
      .add(fadeInMusic, 1.4)
      .add(toSheet, 2.35);
  }

  // Открытка превращается в страницу
  function toSheet() {
    const card = $("#card");
    const r = card.getBoundingClientRect();
    const sheet = $("#sheet");
    const inner = $(".card__inner", sheet);
    const ratio = parseFloat(getComputedStyle(env).width) / 380;
    const clipFrom = `inset(${r.top.toFixed(1)}px ${(innerWidth - r.right).toFixed(1)}px ${(innerHeight - r.bottom).toFixed(1)}px ${r.left.toFixed(1)}px round 3px)`;

    gsap.set(sheet, { visibility: "visible", clipPath: clipFrom });
    gsap.set(inner, { x: r.left + r.width / 2 - innerWidth / 2, y: r.top + r.height / 2 - innerHeight / 2, scale: ratio });
    gsap.set(card, { autoAlpha: 0 });

    gsap.timeline()
      .to(sheet, { clipPath: "inset(0px 0px 0px 0px round 0px)", duration: 1.15, ease: "power3.inOut" }, 0)
      .to(inner, { x: 0, y: 0, scale: 1.3, duration: 1.15, ease: "power3.inOut" }, 0)
      .to("#scene", { y: innerHeight * 0.6, autoAlpha: 0, duration: 0.9, ease: "power2.in" }, 0)
      .to(inner, { autoAlpha: 0, filter: "blur(6px)", duration: 0.5 }, 0.75)
      .add(() => {
        $("#intro").style.display = "none";
        document.body.classList.remove("is-locked");
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
        heroIn();
      }, 0.95)
      .to(sheet, { autoAlpha: 0, duration: 0.9, ease: "power2.out" }, 1.1)
      .set(sheet, { display: "none" });
  }

  /* ------------------------------------------------------------
     HERO
     ------------------------------------------------------------ */
  const stage = $("#heroStage");
  const heroImg = $("#heroPhoto img");
  const archSize = () => {
    const mw = Math.round(Math.min(innerWidth * 0.56, 250, innerHeight * 0.3));
    return { mw, mh: Math.round(mw * 1.5) };
  };
  const bigArch = () => {
    const mw = Math.max(innerWidth * 1.15, innerHeight * 2.5);
    return { mw, mh: mw * 1.5 };
  };

  function heroLayout() {
    const { mw, mh } = archSize();
    stage.style.setProperty("--ah", mh + "px");
    fitStroke($("#heroArchLine"));
  }

  function heroSetup() {
    heroLayout();
    gsap.set(stage, { "--mw": "2px", "--mh": "3px" });
    gsap.set(heroImg, { scale: 1.45 });
    gsap.set([".hero__kicker", ".hero__side", ".scroll-cue"], { autoAlpha: 0 });
    gsap.set(".hn-amp", { scale: 0, rotation: -120 });
    gsap.set("#topbar", { autoAlpha: 0 });
    prepDraw($("#heroArchLine"));
  }

  function heroIn() {
    const { mw, mh } = archSize();
    const chars = $$(".hn .split-char");
    heroPlayed = true;
    gsap.timeline()
      .to("#topbar", { autoAlpha: 1, duration: 0.8 }, 0.6)
      .to(stage, { "--mw": mw + "px", "--mh": mh + "px", duration: 1.8, ease: "expo.out" }, 0)
      .to(heroImg, { scale: 1.2, duration: 2.4, ease: "power3.out" }, 0)
      .add(draw($("#heroArchLine"), { duration: 1.8 }), 0.2)
      .fromTo(chars, { opacity: 0, filter: "blur(8px)", scale: 1.12, yPercent: 8 }, {
        opacity: 1, filter: "blur(0px)", scale: 1, yPercent: 0,
        duration: 1.2, stagger: { each: 0.05, from: "random" }, ease: "power3.out",
      }, 0.35)
      .to(".hn-amp", { scale: 1, rotation: 0, duration: 1.1, ease: "back.out(2)" }, 0.9)
      .to([".hero__kicker", ".hero__side"], { autoAlpha: 1, duration: 1 }, 1)
      .to(".scroll-cue", { autoAlpha: 1, duration: 0.8 }, 1.6);
  }

  function heroScroll() {
    gsap.timeline({
      scrollTrigger: { trigger: "#hero", start: "top top", end: "+=170%", pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true },
    })
      .fromTo(stage, { "--mw": () => archSize().mw + "px", "--mh": () => archSize().mh + "px" },
        { "--mw": () => bigArch().mw + "px", "--mh": () => bigArch().mh + "px", ease: "power2.in", duration: 1, immediateRender: false }, 0)
      .fromTo(heroImg, { scale: 1.2 }, { scale: 1, duration: 1, ease: "none", immediateRender: false }, 0)
      .to(".hn--1", { x: () => -innerWidth * 0.9, duration: 0.7, ease: "power2.in" }, 0)
      .to(".hn--2", { x: () => innerWidth * 0.9, duration: 0.7, ease: "power2.in" }, 0)
      .to([".hn-amp", ".hero__side", ".hero__kicker", ".scroll-cue", "#heroArchLine"], { autoAlpha: 0, duration: 0.3 }, 0)
      .to(stage, { "--shade": 1, duration: 0.35 }, 0.62)
      .fromTo("#heroOverlay", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.35 }, 0.68)
      .to({}, { duration: 0.3 });
  }

  /* ------------------------------------------------------------
     Астролябия-отсчёт
     ------------------------------------------------------------ */
  const target = new Date(W.date).getTime();
  const ringState = {};
  let astroStarted = false;
  let astroIntroUntil = 0;
  let dragKey = null;

  function nearestAngle(current, value, n) {
    const tgt = -value * (360 / n);
    let diff = ((tgt - current) % 360 + 540) % 360 - 180;
    return current + diff;
  }

  function units() {
    const diff = Math.max(0, target - Date.now());
    return {
      diff,
      days: Math.floor(diff / 864e5),
      hours: Math.floor(diff / 36e5) % 24,
      minutes: Math.floor(diff / 6e4) % 60,
      seconds: Math.floor(diff / 1e3) % 60,
    };
  }

  function setRing(key, value, { duration = 0.7, ease = "power3.out" } = {}) {
    const cfg = ASTRO_RINGS.find((r) => r.key === key);
    const g = $(`#astroSvg .ring[data-key="${key}"]`);
    const st = ringState[key] || (ringState[key] = { angle: 0, value: -1 });
    $$(".lbl.is-on", g).forEach((l) => l.classList.remove("is-on"));
    const lbl = $(`.lbl[data-i="${value}"]`, g);
    if (lbl) lbl.classList.add("is-on");
    st.value = value;
    if (dragKey === key) return;
    st.angle = nearestAngle(st.angle, value, cfg.n);
    if (hasGsap) gsap.to(g, { rotation: st.angle, svgOrigin: "0 0", duration, ease, overwrite: true });
    else g.setAttribute("transform", `rotate(${st.angle})`);
  }

  function tick() {
    const u = units();
    $$("#countLine [data-cl]").forEach((b) => (b.textContent = u[b.dataset.cl]));
    if (astroStarted && performance.now() > astroIntroUntil) {
      $("#astroDays").textContent = u.days;
      ["seconds", "minutes", "hours"].forEach((k) => setRing(k, u[k]));
    }
    if (u.diff === 0) $("#countDone").hidden = false;
  }

  function astroEnter() {
    if (astroStarted) return;
    astroStarted = true;
    astroIntroUntil = performance.now() + 3300;
    const u = units();
    ["hours", "minutes", "seconds"].forEach((k, i) => {
      const st = ringState[k] || (ringState[k] = { angle: 0, value: -1 });
      st.angle = (i % 2 ? -1 : 1) * (240 + i * 90);
      gsap.set(`#astroSvg .ring[data-key="${k}"]`, { rotation: st.angle, svgOrigin: "0 0" });
      setRing(k, u[k], { duration: 2.4 + i * 0.35, ease: "power4.out" });
    });
    const o = { v: 0 };
    gsap.to(o, { v: u.days, duration: 2.2, ease: "power3.out", onUpdate: () => ($("#astroDays").textContent = Math.round(o.v)) });
  }

  function astroDrag() {
    const svg = $("#astroSvg");
    let start = 0, startAngle = 0, last = 0, lastT = 0, vel = 0;
    const toSvg = (e) => {
      const p = svg.createSVGPoint();
      p.x = e.clientX; p.y = e.clientY;
      return p.matrixTransform(svg.getScreenCTM().inverse());
    };
    svg.addEventListener("pointerdown", (e) => {
      const p = toSvg(e);
      const r = Math.hypot(p.x, p.y);
      const cfg = ASTRO_RINGS.find((c) => r <= c.r1 + 4 && r >= c.r2 - 4);
      if (!cfg) return;
      dragKey = cfg.key;
      const st = ringState[cfg.key] || (ringState[cfg.key] = { angle: 0, value: 0 });
      gsap.killTweensOf(`#astroSvg .ring[data-key="${cfg.key}"]`);
      start = Math.atan2(p.y, p.x) * 180 / Math.PI;
      startAngle = st.angle; last = start; lastT = performance.now(); vel = 0;
      try { svg.setPointerCapture(e.pointerId); } catch { /* ок */ }
    });
    svg.addEventListener("pointermove", (e) => {
      if (!dragKey) return;
      const p = toSvg(e);
      const a = Math.atan2(p.y, p.x) * 180 / Math.PI;
      let d = a - start;
      d = ((d % 360) + 540) % 360 - 180;
      const st = ringState[dragKey];
      st.angle = startAngle + d;
      const now = performance.now();
      let da = a - last; da = ((da % 360) + 540) % 360 - 180;
      vel = da / Math.max(1, now - lastT);
      last = a; lastT = now;
      if (Math.abs(d) > 170) { startAngle = st.angle; start = a; }
      gsap.set(`#astroSvg .ring[data-key="${dragKey}"]`, { rotation: st.angle, svgOrigin: "0 0" });
    });
    const end = () => {
      if (!dragKey) return;
      const key = dragKey;
      dragKey = null;
      const st = ringState[key];
      const cfg = ASTRO_RINGS.find((c) => c.key === key);
      // Бросок по инерции, затем пружинный возврат к реальному значению
      const spin = st.angle + vel * 380;
      gsap.timeline()
        .to(`#astroSvg .ring[data-key="${key}"]`, { rotation: spin, svgOrigin: "0 0", duration: 0.5, ease: "power2.out" })
        .add(() => {
          st.angle = nearestAngle(spin, st.value, cfg.n);
          gsap.to(`#astroSvg .ring[data-key="${key}"]`, { rotation: st.angle, svgOrigin: "0 0", duration: 1.4, ease: "elastic.out(1, 0.35)" });
        });
      vibrate(8);
    };
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", end);
  }

  /* ------------------------------------------------------------
     Золотая нить программы
     ------------------------------------------------------------ */
  function buildThread() {
    const box = $("#thread");
    const svg = $("#threadSvg");
    const W0 = box.offsetWidth, H0 = box.offsetHeight;
    svg.setAttribute("width", W0);
    svg.setAttribute("height", H0);
    svg.setAttribute("viewBox", `0 0 ${W0} ${H0}`);
    const pts = [[W0 / 2, -40]];
    $$(".ev").forEach((li, i) => {
      const knot = $(".ev__knot", li);
      const odd = i % 2 === 0;
      const x = odd ? li.offsetLeft - 22 : li.offsetLeft + li.offsetWidth + 22;
      knot.style.left = odd ? "-27.5px" : "auto";
      knot.style.right = odd ? "auto" : "-27.5px";
      pts.push([x, li.offsetTop + 24]);
    });
    pts.push([W0 / 2, H0 + 30]);
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const dy = y1 - y0;
      d += ` C${x0},${y0 + dy * 0.6} ${x1},${y1 - dy * 0.6} ${x1},${y1}`;
    }
    $("#threadPath").setAttribute("d", d);
    $("#threadGhost").setAttribute("d", d);
    const len = $("#threadPath").getTotalLength();
    $("#threadPath").style.strokeDasharray = `${len} ${len}`;
    return len;
  }

  /* ------------------------------------------------------------
     Ротонда
     ------------------------------------------------------------ */
  const rot = { scroll: 0, drag: 0, cur: 0, R: 300, n: 0 };
  function rotundaLayout() {
    const cards = $$(".rcard");
    rot.n = cards.length;
    const h = $("#rotunda").offsetHeight || 400;
    const cw = Math.round(Math.min(innerWidth * 0.46, 250, h * 0.52));
    rot.R = (cw / 2) / Math.tan(Math.PI / rot.n) * 1.22;
    $("#ring").style.setProperty("--cw", cw + "px");
    cards.forEach((c, i) => {
      c.style.transform = `rotateY(${(i * 360) / rot.n}deg) translateZ(${rot.R}px)`;
    });
  }
  function rotundaRender() {
    const targetRot = rot.scroll + rot.drag;
    rot.cur += (targetRot - rot.cur) * 0.12;
    $("#ring").style.transform = `translateZ(${-rot.R}px) rotateX(-7deg) rotateY(${rot.cur.toFixed(3)}deg)`;
    const step = 360 / rot.n;
    let best = 0, bestA = 999;
    $$(".rcard").forEach((c, i) => {
      let a = ((i * step + rot.cur) % 360 + 540) % 360 - 180;
      const abs = Math.abs(a);
      if (abs < bestA) { bestA = abs; best = i; }
      c.firstElementChild.lastElementChild.previousElementSibling.style.opacity = Math.min(0.65, abs / 140).toFixed(3);
    });
    const label = `${pad(best + 1)} / ${pad(rot.n)}`;
    const idx = $("#galleryIdx");
    if (idx.textContent !== label) idx.textContent = label;
  }
  function rotundaDrag() {
    const el = $("#rotunda");
    let sx = 0, sd = 0, down = false, lx = 0, lt = 0, v = 0;
    el.addEventListener("pointerdown", (e) => { down = true; sx = lx = e.clientX; sd = rot.drag; lt = performance.now(); v = 0; });
    addEventListener("pointermove", (e) => {
      if (!down) return;
      rot.drag = sd + (e.clientX - sx) * 0.32;
      const now = performance.now();
      v = (e.clientX - lx) / Math.max(1, now - lt);
      lx = e.clientX; lt = now;
    });
    const up = () => {
      if (!down) return;
      down = false;
      const step = 360 / rot.n;
      const proj = rot.drag + v * 260;
      rot.drag = Math.round((rot.scroll + proj) / step) * step - rot.scroll;
    };
    addEventListener("pointerup", up);
    addEventListener("pointercancel", up);
  }

  /* ------------------------------------------------------------
     Стирание пальцем (фото зала)
     ------------------------------------------------------------ */
  function scratchSetup() {
    const cv = $("#scratch");
    const box = $("#venuePhoto");
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    let dpr = 1, w = 0, h = 0, moves = 0, done = false, last = null, touched = false;

    function paint() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = box.offsetWidth; h = box.offsetHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#F1EBDD");
      g.addColorStop(1, "#E4DAC6");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // «Иней» из точек и узор
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = `rgba(${Math.random() < .5 ? "255,255,255" : "138,132,88"},${(Math.random() * 0.25).toFixed(2)})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2);
      }
      ctx.strokeStyle = "rgba(138,132,88,.35)";
      ctx.lineWidth = 0.8;
      const s = 34;
      for (let y = s / 2; y < h; y += s) for (let x = s / 2; x < w; x += s) {
        ctx.beginPath();
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 4 : 9;
          const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
    function erase(x, y) {
      ctx.globalCompositeOperation = "destination-out";
      const rad = Math.max(26, w * 0.08);
      const pts = last ? Math.ceil(Math.hypot(x - last[0], y - last[1]) / 6) : 1;
      for (let i = 1; i <= pts; i++) {
        const px = last ? last[0] + ((x - last[0]) * i) / pts : x;
        const py = last ? last[1] + ((y - last[1]) * i) / pts : y;
        const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
        g.addColorStop(0, "rgba(0,0,0,1)");
        g.addColorStop(0.6, "rgba(0,0,0,.7)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2); ctx.fill();
      }
      last = [x, y];
      if (++moves % 12 === 0) check();
    }
    function check() {
      const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let clear = 0, total = 0;
      for (let i = 3; i < data.length; i += 4 * 40) { total++; if (data[i] < 40) clear++; }
      if (clear / total > 0.42) reveal();
    }
    function reveal() {
      if (done) return;
      done = true;
      gsap.to(cv, { opacity: 0, duration: 1, ease: "power2.out", onComplete: () => (cv.style.display = "none") });
      gsap.to("#scratchHint", { autoAlpha: 0, duration: 0.3 });
      burst(box, { count: 14, spread: 140 });
    }
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    let down = false;
    cv.addEventListener("pointerdown", (e) => { down = true; last = null; touched = true; gsap.to("#scratchHint", { autoAlpha: 0, duration: 0.3 }); erase(...pos(e)); });
    cv.addEventListener("pointermove", (e) => {
      if (done || !(down || e.pointerType === "mouse")) return;
      if (!touched) { touched = true; gsap.to("#scratchHint", { autoAlpha: 0, duration: 0.3 }); }
      erase(...pos(e));
    });
    const up = () => { down = false; last = null; };
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("pointerleave", up);
    paint();

    // Подсказка-демо: один автоматический мазок
    const demo = () => {
      if (touched || done) return;
      const o = { k: 0 };
      last = null;
      gsap.to(o, {
        k: 1, duration: 1.1, ease: "power1.inOut",
        onUpdate: () => erase(w * (0.28 + o.k * 0.44), h * (0.34 + Math.sin(o.k * Math.PI) * 0.12)),
        onComplete: () => { last = null; },
      });
    };
    ScrollTrigger.create({ trigger: box, start: "top 70%", once: true, onEnter: () => gsap.delayedCall(0.6, demo) });
    ScrollTrigger.create({ trigger: "#venue", start: "bottom 20%", once: true, onEnter: reveal });
    addEventListener("resize", () => { if (!done && !touched) paint(); });
  }

  /* ------------------------------------------------------------
     RSVP
     ------------------------------------------------------------ */
  const form = $("#rsvpForm");
  const seg = $("#segAttend");
  let lastAttending = "yes";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function updateThanksText() {
    $("#thanksText").textContent = lastAttending === "no" ? t("rsvp.thanksNo") : t("rsvp.thanksText");
  }

  $("#fName").addEventListener("input", () => { if ($("#fName").value.trim()) $("#nameErr").hidden = true; });
  form.addEventListener("change", (e) => {
    if (e.target.name === "attending") {
      const no = e.target.value === "no";
      seg.classList.toggle("is-no", no);
      $("#guestsWrap").classList.toggle("is-closed", no);
    }
  });
  $$(".stepper button").forEach((b) => b.addEventListener("click", () => {
    const input = $("#guests");
    const v = Math.min(10, Math.max(1, +input.value + +b.dataset.step));
    input.value = v;
    $("#guestsOut").textContent = v;
    if (hasGsap) gsap.fromTo("#guestsOut", { y: +b.dataset.step > 0 ? 10 : -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power3.out" });
  }));

  function validName() {
    const ok = !!$("#fName").value.trim();
    $("#nameErr").hidden = ok;
    if (!ok) {
      $("#fName").focus({ preventScroll: true });
      if (lenis) lenis.scrollTo($("#fName"), { offset: -160 }); else $("#fName").scrollIntoView({ block: "center", behavior: "smooth" });
      if (hasGsap) gsap.fromTo(".field:first-child", { x: -8 }, { x: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
    }
    return ok;
  }

  let sending = false;
  async function submitRsvp() {
    if (sending || !validName()) return;
    sending = true;
    $("#sendErr").hidden = true;
    const fd = new FormData(form);
    const attending = String(fd.get("attending"));
    const name = String(fd.get("name")).trim();
    const payload = new URLSearchParams({
      name,
      attending: attending === "yes" ? (lang === "ru" ? "Придёт" : "Keladi") : (lang === "ru" ? "Не придёт" : "Kelmaydi"),
      guests: attending === "yes" ? String(fd.get("guests")) : "0",
      side: fd.get("side") === "bride" ? (lang === "ru" ? "Невеста" : "Kelin") : (lang === "ru" ? "Жених" : "Kuyov"),
      message: String(fd.get("message") || "").trim(),
      lang,
    });
    try {
      if (W.rsvpEndpoint) await fetch(W.rsvpEndpoint, { method: "POST", mode: "no-cors", body: payload });
      else { console.info("[RSVP] Тестовый режим — rsvpEndpoint не задан. Данные:", Object.fromEntries(payload)); await sleep(500); }
      lastAttending = attending;
      store.set("rsvp", JSON.stringify({ name, attending }));
      showThanks(true);
    } catch (err) {
      console.error(err);
      $("#sendErr").hidden = false;
      if (sendHold) sendHold.cancel();
    } finally {
      sending = false;
    }
  }

  let sendHold = null;
  function sendSetup() {
    const btn = $("#sendSeal");
    btn.type = "button";
    sendHold = makeHold($("#sendWrap"), btn, 0.9, submitRsvp);
    let at = 0, active = false;
    btn.addEventListener("pointerdown", (e) => {
      if (!$("#fName").value.trim()) { validName(); return; }
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch { /* ок */ }
      active = true; at = performance.now();
      vibrate(10);
      sendHold.play();
    });
    const rel = () => {
      if (!active) return;
      active = false;
      if (sendHold.tl.progress() < 1) {
        sendHold.cancel();
        if (performance.now() - at < 400) gsap.fromTo("#sendHint", { x: -8 }, { x: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
      }
    };
    btn.addEventListener("pointerup", rel);
    btn.addEventListener("pointercancel", rel);
    btn.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); submitRsvp(); } });
    form.addEventListener("submit", (e) => { e.preventDefault(); submitRsvp(); });
  }

  function showThanks(animate) {
    updateThanksText();
    const thanks = $("#thanks");
    if (!animate || !hasGsap) {
      form.hidden = true; thanks.hidden = false; $("#rsvpSub").hidden = true;
      return;
    }
    vibrate([20, 30, 40]);
    gsap.timeline()
      .to([form, "#rsvpSub"], { autoAlpha: 0, y: -20, duration: 0.45, ease: "power2.in" })
      .add(() => {
        form.hidden = true; $("#rsvpSub").hidden = true; thanks.hidden = false;
        gsap.set([form, "#rsvpSub"], { clearProps: "all" });
        if (sendHold) sendHold.tl.progress(0).pause();
        ScrollTrigger.refresh();
        if (lenis) lenis.scrollTo("#rsvpCard", { offset: -60, duration: 1 });
      })
      .fromTo("#thanksSeal", { scale: 2.8, rotation: -24, autoAlpha: 0, y: -40 }, { scale: 1, rotation: -6, autoAlpha: 1, y: 0, duration: 0.55, ease: "power4.in" })
      .add(() => burst($("#thanksSeal"), { count: 20 }))
      .fromTo("#rsvpCard", { y: 0 }, { y: 7, duration: 0.08, yoyo: true, repeat: 1, ease: "power1.inOut" })
      .from(["#thanks .title", "#thanksText", "#againBtn"], { autoAlpha: 0, y: 16, stagger: 0.1, duration: 0.6, ease: "power3.out" }, "-=0.05");
  }

  $("#againBtn").addEventListener("click", () => {
    $("#thanks").hidden = true;
    form.hidden = false;
    $("#rsvpSub").hidden = false;
    if (hasGsap) { gsap.from(form, { autoAlpha: 0, y: 20, duration: 0.6, ease: "power3.out" }); ScrollTrigger.refresh(); }
  });

  function restoreRsvp() {
    const saved = store.get("rsvp");
    if (!saved) return;
    try {
      const s = JSON.parse(saved);
      lastAttending = s.attending;
      $("#fName").value = s.name || "";
      showThanks(false);
    } catch { /* ignore */ }
  }

  /* ------------------------------------------------------------
     Правила: кнопка согласия
     ------------------------------------------------------------ */
  $("#agreeBtn").addEventListener("click", () => {
    const btn = $("#agreeBtn");
    const on = !btn.classList.contains("is-on");
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", String(on));
    $(".rules__agree-text", btn).textContent = on ? t("rules.agreed") : t("rules.agree");
    if (on && hasGsap) {
      vibrate(15);
      gsap.fromTo(btn, { scale: 0.92 }, { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" });
      burst($(".rules__box", btn));
      gsap.fromTo(".rule", { y: 0 }, { y: -10, duration: 0.18, yoyo: true, repeat: 1, stagger: 0.05, ease: "power1.inOut" });
    }
  });

  /* ------------------------------------------------------------
     Сочки: осыпать молодых сладостями
     ------------------------------------------------------------ */
  function sochqi() {
    const rain = $("#rain");
    const btn = $("#sochqiBtn");
    btn.dataset.used = "1";
    $("span", btn).textContent = t("sochqi.again");
    vibrate([10, 20, 10]);
    gsap.fromTo(btn, { scale: 0.9 }, { scale: 1, duration: 0.7, ease: "elastic.out(1, 0.35)" });
    const kinds = ["coin", "coin", "petal", "petal", "petal", "navvot", "candy"];
    for (let i = 0; i < 56; i++) {
      const k = kinds[i % kinds.length];
      const el = document.createElement("i");
      let css = "";
      if (k === "coin") css = "width:15px;height:15px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#F6E7A9,#C9A548 55%,#9C7C2C);box-shadow:inset 0 0 0 2px rgba(255,255,255,.25)";
      if (k === "petal") css = `width:${11 + Math.random() * 6}px;height:${15 + Math.random() * 6}px;border-radius:80% 0 80% 0;background:${["#F3E3DA", "#EBD3C6", "#FBF8F1", "#E9DFC8"][i % 4]};box-shadow:0 1px 2px rgba(0,0,0,.08)`;
      if (k === "navvot") css = "width:10px;height:9px;clip-path:polygon(20% 0,85% 10%,100% 60%,70% 100%,10% 85%,0 35%);background:linear-gradient(135deg,#F7E6B8,#D9B56A)";
      if (k === "candy") css = "width:16px;height:8px;border-radius:4px;background:repeating-linear-gradient(90deg,#FBF8F1 0 3px,#B9B28C 3px 6px)";
      el.style.cssText = css;
      rain.appendChild(el);
      const x0 = Math.random() * innerWidth;
      const dur = 2.2 + Math.random() * 1.8;
      gsap.set(el, { x: x0, y: -30 - Math.random() * 120, rotation: Math.random() * 360 });
      gsap.to(el, { y: innerHeight + 60, duration: dur, ease: "power1.in", delay: Math.random() * 0.5, onComplete: () => el.remove() });
      gsap.to(el, { x: x0 + (Math.random() - 0.5) * 160, rotation: `+=${(Math.random() - 0.5) * 720}`, rotationX: Math.random() * 360, duration: dur, ease: "sine.inOut", delay: Math.random() * 0.5 });
    }
  }
  $("#sochqiBtn").addEventListener("click", sochqi);

  /* ------------------------------------------------------------
     Скролл-анимации секций
     ------------------------------------------------------------ */
  function scrollAnimations() {
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: (s) => { $("#progressBar").style.transform = `scaleX(${s.progress})`; } });

    heroScroll();

    // Заголовки по буквам
    $$("[data-split]").forEach((el) => {
      ScrollTrigger.create({
        trigger: el, start: "top 88%", once: true,
        onEnter: () => { el.dataset.played = "1"; gsap.to($$(".split-char", el), { yPercent: 0, duration: 1, stagger: 0.035, ease: "power4.out" }); },
      });
    });
    $$(".section > .kicker, .venue__addr, .date__weekday, .date__time, .rsvp__sub, .count-line, .hint").forEach((el) => {
      gsap.from(el, { autoAlpha: 0, y: 18, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 92%", once: true } });
    });

    // Бейдж
    const badge = $("#badge svg");
    gsap.to(badge, { rotation: 300, ease: "none", scrollTrigger: { trigger: ".invite", start: "top bottom", end: "bottom top", scrub: 0.6 } });
    gsap.from("#badge", { scale: 0.4, autoAlpha: 0, duration: 1.2, ease: "back.out(1.6)", scrollTrigger: { trigger: "#badge", start: "top 90%", once: true } });

    // Астролябия
    gsap.set("#astroSvg .ring", { svgOrigin: "0 0" });
    gsap.from("#astro", { scale: 0.85, autoAlpha: 0, duration: 1.4, ease: "power3.out", scrollTrigger: { trigger: "#astro", start: "top 85%", once: true } });
    ScrollTrigger.create({ trigger: "#astro", start: "top 70%", once: true, onEnter: astroEnter });

    // Дата и печать на календаре
    gsap.from("#bigDate", { autoAlpha: 0, y: 30, filter: "blur(8px)", duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: "#bigDate", start: "top 90%", once: true } });
    const cells = $$("#calGrid .d");
    const dayIndex = cells.findIndex((c) => c.classList.contains("is-day"));
    gsap.set(cells, { autoAlpha: 0, scale: 0.6 });
    const stamp = $("#calGrid .stamp");
    gsap.set(stamp, { autoAlpha: 0 });
    gsap.from("#calendar", { y: 60, autoAlpha: 0, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: "#calendar", start: "top 90%", once: true } });
    ScrollTrigger.create({
      trigger: "#calGrid", start: "top 72%", once: true,
      onEnter: () => {
        gsap.timeline()
          .to(cells, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2)", stagger: { each: 0.025, grid: [Math.ceil(cells.length / 7), 7], from: dayIndex } })
          .fromTo(stamp, { scale: 3.4, y: -60, rotation: -40, autoAlpha: 0 }, { scale: 1, y: 0, rotation: -8, autoAlpha: 1, duration: 0.5, ease: "power4.in" }, 0.7)
          .add(() => vibrate(30))
          .fromTo("#calendar", { y: 0 }, { y: 5, duration: 0.07, yoyo: true, repeat: 1 })
          .fromTo("#calGrid .ripple", { scale: 1, opacity: 0.8 }, { scale: 2.6, opacity: 0, duration: 0.9, ease: "power2.out" }, "<");
      },
    });

    // Нить программы
    let len = buildThread();
    const needle = $("#needle");
    needle.style.margin = "0";
    const st = { trigger: "#thread", start: "top 62%", end: "bottom 62%", scrub: 0.6 };
    gsap.fromTo("#threadPath", { strokeDashoffset: () => len }, { strokeDashoffset: 0, ease: "none", scrollTrigger: { ...st, invalidateOnRefresh: true } });
    if (window.MotionPathPlugin) {
      gsap.to(needle, {
        ease: "none",
        motionPath: { path: "#threadPath", align: "#threadPath", alignOrigin: [0.5, 0.5], autoRotate: 45 },
        scrollTrigger: { ...st, invalidateOnRefresh: true },
      });
    }
    ScrollTrigger.addEventListener("refreshInit", () => { len = buildThread(); });
    $$(".ev").forEach((li) => {
      gsap.set(li.children, { autoAlpha: 0.12 });
      ScrollTrigger.create({
        trigger: li, start: "top 62%",
        onEnter: () => {
          li.classList.add("is-on");
          gsap.fromTo($$(".ev__time, .ev__title, .ev__note", li), { autoAlpha: 0, y: 18, filter: "blur(6px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.9, stagger: 0.08, ease: "power3.out" });
          gsap.to($(".ev__knot", li), { autoAlpha: 1, duration: 0.3 });
          gsap.fromTo($(".ev__knot", li), { scale: 0.3 }, { scale: 1, duration: 0.7, ease: "back.out(3)" });
        },
        onLeaveBack: () => { li.classList.remove("is-on"); gsap.to(li.children, { autoAlpha: 0.12, duration: 0.3 }); },
      });
    });

    // Правила: колода
    const rules = $$(".rule");
    rules.forEach((card, i) => {
      gsap.fromTo(card, { rotation: i % 2 ? 6 : -6, y: 60 }, { rotation: i % 2 ? 0.8 : -0.8, y: 0, ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "top 55%", scrub: 0.5 } });
      gsap.fromTo($(".rule__icon svg", card), { rotation: -90, scale: 0.4 }, { rotation: 0, scale: 1, duration: 0.9, ease: "back.out(2)", scrollTrigger: { trigger: card, start: "top 80%", once: true } });
      const next = rules[i + 1];
      if (!next) return;
      gsap.to(card, { scale: 0.94 - (rules.length - i) * 0.008, ease: "none", scrollTrigger: { trigger: next, start: "top 80%", end: "top 25%", scrub: 0.5 } });
      gsap.to($$(".rule__title, .rule__text", card), { opacity: 0.25, ease: "none", scrollTrigger: { trigger: next, start: "top 60%", end: "top 30%", scrub: 0.5 } });
    });

    // Ротонда
    rotundaLayout();
    ScrollTrigger.create({
      trigger: "#gallery", start: "top top", end: "+=220%", pin: true, scrub: true, anticipatePin: 1,
      onUpdate: (s) => { rot.scroll = -s.progress * 360 * (rot.n - 1) / rot.n; },
    });
    gsap.ticker.add(rotundaRender);
    ScrollTrigger.addEventListener("refreshInit", rotundaLayout);
    gsap.from(".rcard__in", { autoAlpha: 0, y: 120, duration: 1.3, stagger: 0.06, ease: "power3.out", scrollTrigger: { trigger: "#gallery", start: "top 75%", once: true } });

    // Место
    gsap.from("#venueName", { autoAlpha: 0, y: 30, duration: 1, ease: "power3.out", scrollTrigger: { trigger: "#venueName", start: "top 90%", once: true } });
    gsap.fromTo("#venuePhoto", { clipPath: "inset(100% 0% 0% 0% round 200px 200px 16px 16px)" }, { clipPath: "inset(0% 0% 0% 0% round 200px 200px 16px 16px)", duration: 1.4, ease: "power3.inOut", scrollTrigger: { trigger: "#venuePhoto", start: "top 88%", once: true } });
    gsap.from("#venueMap", { autoAlpha: 0, y: 40, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: "#venueMap", start: "top 92%", once: true } });
    gsap.from(".venue__links .pill", { autoAlpha: 0, y: 16, stagger: 0.08, duration: 0.7, ease: "power3.out", scrollTrigger: { trigger: ".venue__links", start: "top 95%", once: true } });
    ScrollTrigger.create({ trigger: "#venue", start: "top 150%", once: true, onEnter: loadMap });
    $$(".venue__photo img, .rsvp__bg img").forEach((img) => {
      gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: "none", scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
    });

    // RSVP
    gsap.from("#rsvpCard", { y: 90, rotationX: 14, transformPerspective: 1200, transformOrigin: "50% 100%", autoAlpha: 0, duration: 1.3, ease: "power3.out", scrollTrigger: { trigger: "#rsvp", start: "top 75%", once: true } });
    gsap.from("#sendWrap", { scale: 0, rotation: -90, duration: 1, ease: "back.out(2)", scrollTrigger: { trigger: "#sendWrap", start: "top 92%", once: true } });

    // Финал
    const fsvg = $(".footer__orn svg");
    fitStroke(fsvg);
    prepDraw(fsvg);
    ScrollTrigger.create({ trigger: ".footer", start: "top 85%", once: true, onEnter: () => draw(fsvg, { duration: 2, stagger: 0.06 }) });
    gsap.from(".footer__names", { autoAlpha: 0, scale: 0.92, filter: "blur(10px)", duration: 1.4, ease: "power3.out", scrollTrigger: { trigger: ".footer__names", start: "top 92%", once: true } });
  }

  /* ------------------------------------------------------------
     Старт
     ------------------------------------------------------------ */
  build();
  applyTexts();
  restoreRsvp();
  tick();
  setInterval(tick, 1000);

  $$("[data-lang]").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));

  const afterFonts = (fn) => (document.fonts && document.fonts.ready ? document.fonts.ready.then(fn) : fn());

  if (hasGsap) {
    paperEdges();
    $$("[data-ornament] svg").forEach(fitStroke);
    heroSetup();
    introSetup();
    scrollAnimations();
    astroDrag();
    rotundaDrag();
    scratchSetup();
    sendSetup();
    afterFonts(() => { heroLayout(); ScrollTrigger.refresh(); });
    addEventListener("resize", () => { heroLayout(); paperEdges(); });
  } else {
    // Без GSAP: простое открытие и статичная страница
    $("#seal").addEventListener("click", () => {
      $("#intro").style.display = "none";
      document.body.classList.remove("is-locked");
      $("#topbar").style.opacity = 1;
      primeMusic(); fadeInMusic();
    });
    heroLayout();
    astroStarted = true;
    tick();
  }
})();
