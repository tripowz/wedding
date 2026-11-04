/* Запекание материалов в канвасы. Всё детерминированно (свой генератор), свет один — сверху слева. */
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const LIGHT = (() => { const v = [-0.52, -0.62, 0.59]; const l = Math.hypot(...v); return v.map((x) => x / l); })();

  // Низкочастотный шум: маленький случайный канвас, растянутый со сглаживанием
  function noiseLayer(w, h, cell, rnd, amp, ctx, mode = "soft-light") {
    const sw = Math.ceil(w / cell) + 2, sh = Math.ceil(h / cell) + 2;
    const s = mk(sw, sh), sc = s.getContext("2d"), id = sc.createImageData(sw, sh);
    for (let i = 0; i < sw * sh; i++) { const v = Math.round(128 + (rnd() - 0.5) * 255 * amp); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    sc.putImageData(id, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = mode; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(s, -cell, -cell, sw * cell, sh * cell); ctx.restore();
  }
  function fineGrain(w, h, rnd, amp, ctx) {
    const s = mk(w, h), sc = s.getContext("2d"), id = sc.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { const v = Math.round(128 + (rnd() - 0.5) * 255 * amp); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    sc.putImageData(id, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = "soft-light"; ctx.drawImage(s, 0, 0); ctx.restore();
  }
  function fibers(w, h, rnd, n, ctx, light = 0.06, dark = 0.035) {
    ctx.save(); ctx.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const x = rnd() * w, y = rnd() * h, a = rnd() * Math.PI * 2, L = 6 + rnd() * 22;
      ctx.strokeStyle = rnd() < 0.6 ? `rgba(255,255,250,${light})` : `rgba(90,70,50,${dark})`;
      ctx.lineWidth = 0.6 + rnd() * 0.8;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a + 0.6) * L * 0.5, y + Math.sin(a + 0.6) * L * 0.5, x + Math.cos(a) * L, y + Math.sin(a) * L);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Бумага: цвет, мягкие пятна, волокна, зерно
  function paperFill(ctx, w, h, base, seed, opt = {}) {
    const rnd = mulberry32(seed);
    ctx.fillStyle = `rgb(${base.join(",")})`; ctx.fillRect(0, 0, w, h);
    noiseLayer(w, h, opt.cloud || 90, rnd, opt.cloudAmp ?? 0.22, ctx);
    noiseLayer(w, h, 14, rnd, opt.midAmp ?? 0.18, ctx);
    fibers(w, h, rnd, Math.round((w * h) / (opt.fiberDensity || 900)), ctx, opt.fiberLight ?? 0.07, opt.fiberDark ?? 0.035);
    fineGrain(w, h, rnd, opt.grain ?? 0.08, ctx);
  }
  // Бархат: сильные мягкие переливы ворса + мелкий ворс
  function velvetFill(ctx, w, h, seed) {
    const rnd = mulberry32(seed);
    ctx.fillStyle = "rgb(104,32,42)"; ctx.fillRect(0, 0, w, h);
    noiseLayer(w, h, 120, rnd, 0.9, ctx, "soft-light");
    noiseLayer(w, h, 40, rnd, 0.6, ctx, "soft-light");
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "rgba(255,200,200,0.10)"); g.addColorStop(0.5, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(20,0,5,0.25)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    fineGrain(w, h, rnd, 0.25, ctx);
  }
  // Рваный край: многоугольник с мелкой «бахромой»
  function deckle(x, y, w, h, rnd, amp = 3, step = 5) {
    const P = []; const j = () => (rnd() - 0.5) * 2 * amp + (rnd() < 0.08 ? (rnd() - 0.5) * amp * 2 : 0);
    for (let t = 0; t <= w; t += step) P.push([x + t, y + j()]);
    for (let t = step; t <= h; t += step) P.push([x + w + j(), y + t]);
    for (let t = w - step; t >= 0; t -= step) P.push([x + t, y + h + j()]);
    for (let t = h - step; t > 0; t -= step) P.push([x + j(), y + t]);
    return P;
  }
  const polyPath = (ctx, P) => { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
  // Арка (как в бухарских порталах — стрельчатая)
  function archPts(x0, x1, ySpring, yApex, yBottom, n = 90) {
    const cx = (x0 + x1) / 2, w = x1 - x0, P = [[x0, yBottom], [x0, ySpring]];
    const bez = (p0, p1, p2, p3, t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };
    const H = ySpring - yApex;
    for (let i = 1; i <= n; i++) P.push(bez([x0, ySpring], [x0, ySpring - H * 0.62], [cx - w * 0.16, yApex + H * 0.1], [cx, yApex], i / n));
    for (let i = 1; i <= n; i++) P.push(bez([cx, yApex], [cx + w * 0.16, yApex + H * 0.1], [x1, ySpring - H * 0.62], [x1, ySpring], i / n));
    P.push([x1, yBottom]);
    return P;
  }
  function jitterPts(P, rnd, amp) { return P.map(([x, y]) => [x + (rnd() - 0.5) * 2 * amp, y + (rnd() - 0.5) * 2 * amp]); }

  // Освещение карты высот → цвет с альфой
  function shade(hCanvas, maskCanvas, out, fn, strength = 6) {
    const w = hCanvas.width, h = hCanvas.height;
    const H = hCanvas.getContext("2d").getImageData(0, 0, w, h).data;
    const M = maskCanvas.getContext("2d").getImageData(0, 0, w, h).data;
    const o = out.getContext("2d").createImageData(w, h);
    const hv = (x, y) => H[(Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))) * 4] / 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, a = M[i + 3];
      if (!a) continue;
      const dx = (hv(x + 1, y) - hv(x - 1, y)), dy = (hv(x, y + 1) - hv(x, y - 1));
      let nx = -dx * strength, ny = -dy * strength, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const [r, g, b] = fn(nx, ny, nz, x, y, hv(x, y));
      o.data[i] = r; o.data[i + 1] = g; o.data[i + 2] = b; o.data[i + 3] = a;
    }
    out.getContext("2d").putImageData(o, 0, 0);
  }
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  function withShadow(src, dst, { dx = 3, dy = 6, blur = 8, color = "rgba(50,35,25,0.28)" } = {}) {
    const c = dst.getContext("2d");
    c.clearRect(0, 0, dst.width, dst.height);
    c.save(); c.shadowColor = color; c.shadowBlur = blur; c.shadowOffsetX = dx; c.shadowOffsetY = dy;
    c.drawImage(src, 0, 0); c.restore();
  }

  const Bake = {};

  Bake.paper = function (cv, { base, seed }) {
    paperFill(cv.getContext("2d"), cv.width, cv.height, base, seed, { cloud: 140, cloudAmp: 0.28, fiberDensity: 700 });
  };

  Bake.envelope = function (back, front, flapOut, flapIn) {
    const W = 860, Hh = 1240;
    // задняя стенка + бархатная подкладка внутри
    const b = back.getContext("2d");
    const rB = mulberry32(11);
    const shape = deckle(0, 0, W, Hh, rB, 1.6, 6);
    b.save(); polyPath(b, shape); b.clip();
    paperFill(b, W, Hh, [214, 203, 186], 12, { fiberDensity: 700 });
    b.save();
    const liner = [[26, 26], [834, 26], [834, 600], [430, 760], [26, 600]];
    polyPath(b, liner); b.clip(); velvetFill(b, W, Hh, 13);
    b.restore();
    // внутренняя тень у кромки подкладки
    b.strokeStyle = "rgba(40,10,15,0.35)"; b.lineWidth = 3; polyPath(b, liner); b.stroke();
    b.restore();

    // передние клапаны: боковые и нижний, каждый со своей тенью
    const f = front.getContext("2d");
    const piece = (pts, tone, seed, shadow) => {
      const t = mk(W, Hh), tc = t.getContext("2d");
      tc.save(); polyPath(tc, jitterPts(pts, mulberry32(seed), 0.8)); tc.clip();
      paperFill(tc, W, Hh, tone, seed, { fiberDensity: 800 });
      // мягкая светотень по клапану
      const g = tc.createLinearGradient(0, 0, W, Hh);
      g.addColorStop(0, "rgba(255,250,240,0.10)"); g.addColorStop(1, "rgba(60,40,25,0.08)");
      tc.fillStyle = g; tc.fillRect(0, 0, W, Hh);
      tc.restore();
      f.save(); f.shadowColor = "rgba(55,38,25,0.30)"; f.shadowBlur = shadow; f.shadowOffsetY = -2; f.drawImage(t, 0, 0); f.restore();
    };
    piece([[0, 30], [470, 700], [0, 1240]], [222, 212, 196], 21, 10);
    piece([[860, 30], [860, 1240], [390, 700]], [218, 208, 192], 22, 10);
    piece([[0, 1240], [0, 1120], [430, 610], [860, 1120], [860, 1240]], [226, 216, 201], 23, 14);

    // клапан снаружи
    const fo = flapOut.getContext("2d");
    const tri = [[0, 0], [860, 0], [470, 690], [430, 700], [390, 690]];
    fo.save(); polyPath(fo, jitterPts(tri, mulberry32(31), 0.8)); fo.clip();
    paperFill(fo, 860, 700, [229, 220, 205], 32, { fiberDensity: 800 });
    const g = fo.createLinearGradient(0, 0, 0, 700);
    g.addColorStop(0, "rgba(255,252,244,0.14)"); g.addColorStop(1, "rgba(80,60,40,0.06)");
    fo.fillStyle = g; fo.fillRect(0, 0, 860, 700);
    fo.restore();
    // клапан изнутри: бархат с бумажной кромкой (треугольник перевёрнут — см. геометрию поворота)
    const fi = flapIn.getContext("2d");
    const triIn = [[390, 10], [430, 0], [470, 10], [860, 700], [0, 700]];
    fi.save(); polyPath(fi, triIn); fi.clip();
    paperFill(fi, 860, 700, [214, 203, 186], 33, {});
    fi.restore();
    fi.save(); polyPath(fi, [[430, 40], [800, 690], [60, 690]]); fi.clip(); velvetFill(fi, 860, 700, 34); fi.restore();
  };

  Bake.card = function (cv) {
    const W = cv.width, Hh = cv.height, c = cv.getContext("2d");
    const rnd = mulberry32(41);
    // основной лист — жемчужная бумага с рваным краем
    const sheet = deckle(6, 6, W - 12, Hh - 12, rnd, 2.6, 4);
    const t = mk(W, Hh), tc = t.getContext("2d");
    tc.save(); polyPath(tc, sheet); tc.clip();
    paperFill(tc, W, Hh, [246, 243, 238], 42, { cloud: 160, cloudAmp: 0.08, midAmp: 0.06, fiberDensity: 650, fiberLight: 0.09, fiberDark: 0.018, grain: 0.05 });
    // жемчужный перелив — едва заметный
    const pg = tc.createLinearGradient(0, 0, W, Hh);
    pg.addColorStop(0, "rgba(255,226,236,0.07)"); pg.addColorStop(0.45, "rgba(226,246,240,0.06)"); pg.addColorStop(1, "rgba(232,226,252,0.07)");
    tc.fillStyle = pg; tc.fillRect(0, 0, W, Hh);
    // светлая «бахрома» по краю
    tc.restore();
    tc.save(); polyPath(tc, sheet); tc.lineWidth = 3; tc.strokeStyle = "rgba(255,255,255,0.9)"; tc.stroke(); tc.restore();
    c.drawImage(t, 0, 0);

    // вложенная арка — второй слой бумаги с рваным краем и тенью
    const archP = jitterPts(archPts(90, 910, 420, 130, 1770, 140), mulberry32(43), 2.4);
    const a = mk(W, Hh), ac = a.getContext("2d");
    ac.save(); polyPath(ac, archP); ac.clip();
    paperFill(ac, W, Hh, [248, 246, 242], 44, { cloud: 180, cloudAmp: 0.06, midAmp: 0.05, fiberDensity: 700, fiberLight: 0.1, fiberDark: 0.015, grain: 0.04 });
    ac.restore();
    ac.save(); polyPath(ac, archP); ac.lineWidth = 2.5; ac.strokeStyle = "rgba(255,255,255,0.95)"; ac.stroke(); ac.restore();
    c.save(); c.shadowColor = "rgba(70,55,45,0.20)"; c.shadowBlur = 10; c.shadowOffsetX = 2; c.shadowOffsetY = 4; c.drawImage(a, 0, 0); c.restore();
  };

  Bake.arch = function (svg) {
    // тиснёная линия внутри арки: светлая кромка + тень
    const toD = (P) => "M" + P.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L") + " Z";
    const outer = archPts(130, 870, 440, 180, 1730, 120), inner = archPts(148, 852, 446, 202, 1712, 120);
    const line = (P, w, col, dx, dy) => `<path d="${toD(P)}" fill="none" stroke="${col}" stroke-width="${w}" transform="translate(${dx} ${dy})"/>`;
    svg.innerHTML =
      line(outer, 2, "rgba(255,255,255,0.95)", 0, 1.2) + line(outer, 1.4, "rgba(120,108,96,0.45)", 0, 0) +
      line(inner, 1.4, "rgba(255,255,255,0.9)", 0, 1) + line(inner, 1, "rgba(120,108,96,0.32)", 0, 0);
  };

  Bake.ornament = function (svg) {
    svg.innerHTML = `<path d="M0 7 H22 M38 7 H60" stroke="rgba(110,100,90,0.6)" stroke-width="1.4"/>
      <path d="M30 1 L36 7 L30 13 L24 7 Z" fill="none" stroke="rgba(110,100,90,0.7)" stroke-width="1.4"/>
      <circle cx="30" cy="7" r="1.6" fill="rgba(110,100,90,0.7)"/>`;
  };

  // Серебряная фольга с тиснением: две буквы внахлёст и веточка
  Bake.monogram = function (cv, shineCv, a, b) {
    const W = cv.width, Hh = cv.height;
    const mask = mk(W, Hh), mc = mask.getContext("2d");
    mc.fillStyle = "#fff"; mc.strokeStyle = "#fff"; mc.textBaseline = "alphabetic"; mc.textAlign = "center";
    mc.font = '500 400px "Cormorant Garamond"';
    mc.fillText(a, 250, 360);
    mc.fillText(b, 420, 420);
    // росчерк под буквами
    mc.lineWidth = 3;
    mc.beginPath(); mc.moveTo(160, 450); mc.bezierCurveTo(300, 400, 470, 470, 560, 380); mc.bezierCurveTo(590, 350, 560, 330, 540, 350); mc.stroke();

    const hC = mk(W, Hh), hc = hC.getContext("2d");
    hc.filter = "blur(4.2px)"; hc.drawImage(mask, 0, 0);
    const lit = (bright) => {
      const out = mk(W, Hh);
      shade(hC, mask, out, (nx, ny, nz, x, y) => {
        const d = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
        const env = 0.5 + 0.5 * (-nx * 0.6 - ny * 0.8);
        const hx = LIGHT[0], hy = LIGHT[1], hz = LIGHT[2] + 1, hl = Math.hypot(hx, hy, hz);
        const spec = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hl), 36);
        const hatch = 0.035 * Math.sin((x + y) * 0.85);
        const band = 0.5 + 0.5 * Math.sin((x * 0.62 - y * 0.95) / 46) * Math.cos((x + y) / 210);
        let v = 0.26 + 0.42 * d + 0.42 * band + 0.2 * (env - 0.5) - 0.62 * (1 - nz) + hatch + bright;
        v = Math.max(0, Math.min(1.15, v));
        const lo = [86, 84, 80], hi = [252, 251, 248];
        return lo.map((q, k) => clamp(q + (hi[k] - q) * v + spec * 170));
      }, 16);
      return out;
    };
    withShadow(lit(0), cv, { dx: 2, dy: 4, blur: 5, color: "rgba(60,50,40,0.25)" });
    const sh = lit(0.42); shineCv.getContext("2d").drawImage(sh, 0, 0);
  };

  // Сургучная печать: неровная капля, ободок, оттиск монограммы
  Bake.seal = function (cv, a, b) {
    const W = cv.width, Hh = cv.height, cx = W / 2, cy = Hh / 2;
    const rnd = mulberry32(51);
    const mask = mk(W, Hh), mc = mask.getContext("2d");
    const n = 26, P = [];
    for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2, r = 118 * (1 + (rnd() - 0.5) * 0.12 + (i % 6 === 0 ? 0.07 : 0)); P.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); }
    mc.fillStyle = "#fff"; mc.beginPath();
    for (let i = 0; i < n; i++) { const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n]; if (!i) mc.moveTo(...p1); mc.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, ...p2); }
    mc.fill();
    const hC = mk(W, Hh), hc = hC.getContext("2d");
    hc.fillStyle = "#000"; hc.fillRect(0, 0, W, Hh);
    hc.globalAlpha = 1; hc.drawImage(mask, 0, 0);
    hc.filter = "blur(10px)"; hc.drawImage(hC, 0, 0); hc.filter = "none";
    const ring = (r, g, w) => { hc.beginPath(); hc.arc(cx, cy, r, 0, Math.PI * 2); hc.strokeStyle = `rgb(${g},${g},${g})`; hc.lineWidth = w; hc.stroke(); };
    hc.beginPath(); hc.arc(cx, cy, 92, 0, Math.PI * 2); hc.fillStyle = "rgb(150,150,150)"; hc.fill();
    ring(92, 235, 7);
    for (let i = 0; i < 20; i++) { const t = (i / 20) * Math.PI * 2; hc.beginPath(); hc.arc(cx + Math.cos(t) * 78, cy + Math.sin(t) * 78, 2.6, 0, Math.PI * 2); hc.fillStyle = "rgb(205,205,205)"; hc.fill(); }
    hc.fillStyle = "rgb(225,225,225)"; hc.textAlign = "center"; hc.textBaseline = "alphabetic";
    hc.font = '500 118px "Cormorant Garamond"'; hc.fillText(a, cx - 22, cy + 30); hc.fillText(b, cx + 24, cy + 52);
    const h2 = mk(W, Hh), h2c = h2.getContext("2d"); h2c.filter = "blur(1.6px)"; h2c.drawImage(hC, 0, 0);
    const out = mk(W, Hh);
    shade(h2, mask, out, (nx, ny, nz) => {
      const d = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
      const hx = LIGHT[0], hy = LIGHT[1], hz = LIGHT[2] + 1, hl = Math.hypot(hx, hy, hz);
      const nh = Math.max(0, (nx * hx + ny * hy + nz * hz) / hl);
      const spec = Math.pow(nh, 60) * 0.85 + Math.pow(nh, 10) * 0.12;
      const base = [118, 32, 44];
      return base.map((q, k) => clamp(q * (0.42 + 0.75 * d) + spec * [255, 235, 230][k]));
    });
    withShadow(out, cv, { dx: 4, dy: 9, blur: 12, color: "rgba(40,15,15,0.38)" });
  };

  // Гипсофила: ветвящиеся стебли и облачка мелких цветков
  function gyps(ctx, x, y, ang, len, depth, rnd) {
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
    ctx.save(); ctx.strokeStyle = "rgba(188,176,156,0.95)"; ctx.lineWidth = Math.max(0.7, depth * 0.55); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(ang + 0.3) * len * 0.5, y + Math.sin(ang + 0.3) * len * 0.5, ex, ey); ctx.stroke(); ctx.restore();
    if (depth <= 0) {
      const n = 3 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) {
        const fx = ex + (rnd() - 0.5) * 14, fy = ey + (rnd() - 0.5) * 14, r = 2.6 + rnd() * 2.6;
        ctx.save(); ctx.shadowColor = "rgba(90,75,60,0.28)"; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1.5;
        const g = ctx.createRadialGradient(fx - r * 0.3, fy - r * 0.3, 0, fx, fy, r);
        g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#e9e4da");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        if (rnd() < 0.5) { ctx.fillStyle = "rgba(196,180,150,0.9)"; ctx.beginPath(); ctx.arc(fx, fy, 0.9, 0, Math.PI * 2); ctx.fill(); }
      }
      return;
    }
    const k = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < k; i++) gyps(ctx, ex, ey, ang + (rnd() - 0.5) * 1.3, len * (0.55 + rnd() * 0.2), depth - 1, rnd);
  }
  // Перламутровый лист: полупрозрачный, с радужным переливом и прожилкой
  function pearlLeaf(ctx, x, y, ang, L, Wd, rnd) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const path = () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(L * 0.3, -Wd, L * 0.75, -Wd * 0.9, L, 0); ctx.bezierCurveTo(L * 0.75, Wd * 0.9, L * 0.3, Wd, 0, 0); ctx.closePath(); };
    ctx.save(); ctx.shadowColor = "rgba(90,75,60,0.22)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
    path(); const g = ctx.createLinearGradient(0, -Wd, 0, Wd);
    g.addColorStop(0, "rgba(255,255,255,0.92)"); g.addColorStop(0.5, "rgba(246,243,238,0.78)"); g.addColorStop(1, "rgba(236,232,226,0.88)");
    ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.save(); path(); ctx.clip();
    [["rgba(255,205,226,0.35)", 0.25], ["rgba(200,245,232,0.32)", 0.55], ["rgba(214,206,255,0.32)", 0.8]].forEach(([col, t]) => {
      const r = ctx.createRadialGradient(L * t, (rnd() - 0.5) * Wd, 0, L * t, 0, Wd * 1.4);
      r.addColorStop(0, col); r.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = r; ctx.fillRect(0, -Wd, L, Wd * 2);
    });
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 1.4; path(); ctx.stroke();
    ctx.strokeStyle = "rgba(150,138,124,0.35)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(L * 0.5, -Wd * 0.08, L * 0.95, 0); ctx.stroke();
    for (let i = 1; i < 6; i++) { const px = L * i / 6.5; ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px + L * 0.08, -Wd * 0.55); ctx.moveTo(px, 0); ctx.lineTo(px + L * 0.08, Wd * 0.55); ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 0.9; ctx.stroke(); }
    ctx.restore();
  }

  Bake.flora = function (cv) {
    const c = cv.getContext("2d"), rnd = mulberry32(61);
    // верхний правый угол (вне текста: x > 880)
    pearlLeaf(c, 1110, 70, Math.PI * 0.84, 240, 64, rnd);
    pearlLeaf(c, 1100, 300, Math.PI * 0.98, 190, 52, rnd);
    pearlLeaf(c, 960, -30, Math.PI * 0.6, 170, 46, rnd);
    for (let i = 0; i < 8; i++) gyps(c, 1080, 30 + i * 62, Math.PI * (0.92 + rnd() * 0.2), 64 + rnd() * 24, 3, rnd);
    // левый край, низ (вне строки даты)
    pearlLeaf(c, -40, 1600, -0.12, 210, 56, rnd);
    pearlLeaf(c, -30, 1790, 0.1, 190, 52, rnd);
    for (let i = 0; i < 7; i++) gyps(c, 0, 1560 + i * 50, -0.05 + (rnd() - 0.5) * 0.5, 60 + rnd() * 22, 3, rnd);
    // нижний правый угол
    pearlLeaf(c, 1120, 1760, Math.PI * 1.06, 230, 62, rnd);
    pearlLeaf(c, 1060, 1950, Math.PI * 1.2, 200, 56, rnd);
    for (let i = 0; i < 6; i++) gyps(c, 1080, 1720 + i * 40, Math.PI * (1.0 + rnd() * 0.18), 60 + rnd() * 24, 3, rnd);
    // верхний левый — небольшой акцент
    pearlLeaf(c, -30, 110, 0.35, 160, 44, rnd);
    for (let i = 0; i < 4; i++) gyps(c, 0, 40 + i * 45, 0.2 + rnd() * 0.3, 56 + rnd() * 20, 2, rnd);
  };

  Bake.sprig = function (cv) {
    const c = cv.getContext("2d"), rnd = mulberry32(71);
    const cx = 280, cy = 340;
    pearlLeaf(c, cx, cy, -2.3, 220, 56, rnd);
    pearlLeaf(c, cx, cy, -0.75, 200, 50, rnd);
    for (let i = 0; i < 6; i++) gyps(c, cx, cy, -Math.PI / 2 + (i - 2.5) * 0.28, 120 + rnd() * 60, 3, rnd);
  };

  Bake.grain = function (cv) {
    const c = cv.getContext("2d"), rnd = mulberry32(81), w = cv.width, h = cv.height;
    const id = c.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { const v = Math.round(128 + (rnd() - 0.5) * 120); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    c.putImageData(id, 0, 0);
  };

  window.Bake = Bake;
})();
