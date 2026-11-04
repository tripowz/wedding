/* Материалы v2: перламутровая бумага, бордовая подкладка, сургуч с золотом, веточки. Детерминированно. */
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
  const LIGHT = (() => { const v = [-0.45, -0.68, 0.58]; const l = Math.hypot(...v); return v.map((x) => x / l); })();
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

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
  function fibers(w, h, rnd, n, ctx, light = 0.06, dark = 0.03) {
    ctx.save(); ctx.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const x = rnd() * w, y = rnd() * h, a = rnd() * Math.PI * 2, L = 6 + rnd() * 20;
      ctx.strokeStyle = rnd() < 0.6 ? `rgba(255,255,250,${light})` : `rgba(110,80,60,${dark})`;
      ctx.lineWidth = 0.5 + rnd() * 0.8;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a + 0.6) * L * 0.5, y + Math.sin(a + 0.6) * L * 0.5, x + Math.cos(a) * L, y + Math.sin(a) * L);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Перламутровая бумага: тёплая база, мягкие пятна, диагональный перелив, волокна, зерно
  function pearlPaper(ctx, w, h, base, seed, sheen = 0.10) {
    const rnd = mulberry32(seed);
    ctx.fillStyle = `rgb(${base.join(",")})`; ctx.fillRect(0, 0, w, h);
    noiseLayer(w, h, 120, rnd, 0.16, ctx);
    noiseLayer(w, h, 18, rnd, 0.10, ctx);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, `rgba(255,250,244,${sheen})`); g.addColorStop(0.35, "rgba(255,236,226,0)");
    g.addColorStop(0.55, `rgba(255,248,240,${sheen * 0.8})`); g.addColorStop(0.8, "rgba(214,190,176,0.06)"); g.addColorStop(1, `rgba(255,246,236,${sheen * 0.6})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    fibers(w, h, rnd, Math.round((w * h) / 1400), ctx);
    fineGrain(w, h, rnd, 0.05, ctx);
  }
  // Бордовый атлас/бархат подкладки
  function liner(ctx, w, h, seed) {
    const rnd = mulberry32(seed);
    ctx.fillStyle = "rgb(92,22,34)"; ctx.fillRect(0, 0, w, h);
    noiseLayer(w, h, 160, rnd, 0.7, ctx);
    noiseLayer(w, h, 46, rnd, 0.35, ctx);
    const g = ctx.createLinearGradient(0, 0, w * 0.7, h);
    g.addColorStop(0, "rgba(255,190,190,0.12)"); g.addColorStop(0.5, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(25,0,6,0.30)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // тонкий золотой узор-ромб (фольга)
    ctx.save(); ctx.globalAlpha = 0.16; ctx.strokeStyle = "#e2c48a"; ctx.lineWidth = 1;
    const st = 46;
    for (let y = -st; y < h + st; y += st) for (let x = -st; x < w + st; x += st) {
      const ox = ((y / st) % 2) * st / 2;
      ctx.beginPath(); ctx.moveTo(x + ox, y - 7); ctx.lineTo(x + ox + 5, y); ctx.lineTo(x + ox, y + 7); ctx.lineTo(x + ox - 5, y); ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
    fineGrain(w, h, rnd, 0.22, ctx);
  }

  function shade(hCanvas, maskCanvas, out, fn, strength = 6) {
    const w = hCanvas.width, h = hCanvas.height;
    const H = hCanvas.getContext("2d").getImageData(0, 0, w, h).data;
    const M = maskCanvas.getContext("2d").getImageData(0, 0, w, h).data;
    const o = out.getContext("2d").createImageData(w, h);
    const hv = (x, y) => H[(Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))) * 4] / 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, a = M[i + 3];
      if (!a) continue;
      const dx = hv(x + 1, y) - hv(x - 1, y), dy = hv(x, y + 1) - hv(x, y - 1);
      let nx = -dx * strength, ny = -dy * strength, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const [r, g, b] = fn(nx, ny, nz, x, y, hv(x, y), i);
      o.data[i] = r; o.data[i + 1] = g; o.data[i + 2] = b; o.data[i + 3] = a;
    }
    out.getContext("2d").putImageData(o, 0, 0);
  }

  const B2 = {};
  B2.LIGHT = LIGHT;

  /* ---------- Конверт (локальные координаты 880 × 1560, холсты в масштабе k) ---------- */
  B2.ENV = { W: 830, H: 1560, FLAP: 640 };
  B2.envelope = function ({ back, pocket, flapOut, flapIn }, k, mono, address) {
    const { W, H, FLAP } = B2.ENV;
    // задняя стенка: изнутри — подкладка
    {
      const c = back.getContext("2d"); c.setTransform(k, 0, 0, k, 0, 0);
      pearlPaper(c, W, H, [234, 219, 205], 11, 0.08);
      const L = mk(Math.round(W * k), Math.round(H * k)), lc = L.getContext("2d");
      lc.setTransform(k, 0, 0, k, 0, 0); liner(lc, W, H, 12);
      c.save(); c.beginPath(); c.rect(10, 6, W - 20, H * 0.6); c.clip(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(L, 0, 0); c.restore();
      c.setTransform(k, 0, 0, k, 0, 0);
      const g = c.createLinearGradient(0, 0, 0, 220); g.addColorStop(0, "rgba(30,5,10,0.30)"); g.addColorStop(1, "rgba(30,5,10,0)");
      c.fillStyle = g; c.fillRect(10, 6, W - 20, 220);
    }
    // карман: вырез V сверху, боковые и нижний клапаны
    {
      const c = pocket.getContext("2d"); c.setTransform(k, 0, 0, k, 0, 0);
      const M = W / 2;
      const shape = () => { c.beginPath(); c.moveTo(0, 4); c.quadraticCurveTo(M * 0.5, 40, M, 128); c.quadraticCurveTo(M * 1.5, 40, W, 4); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); };
      c.save(); shape(); c.clip();
      pearlPaper(c, W, H, [238, 225, 212], 21, 0.12);
      // боковые клапаны: левый светлее, правый темнее
      c.fillStyle = "rgba(255,250,244,0.10)"; c.beginPath(); c.moveTo(0, 0); c.lineTo(M, 128); c.lineTo(M, 860); c.lineTo(0, H); c.closePath(); c.fill();
      c.fillStyle = "rgba(120,90,70,0.07)"; c.beginPath(); c.moveTo(W, 0); c.lineTo(M, 128); c.lineTo(M, 860); c.lineTo(W, H); c.closePath(); c.fill();
      // нижний клапан с мягкой тенью по краю
      const bot = () => { c.beginPath(); c.moveTo(-10, H); c.lineTo(-10, H - 40); c.bezierCurveTo(140, 1180, M - 110, 860, M, 830); c.bezierCurveTo(M + 110, 860, W - 140, 1180, W + 10, H - 40); c.lineTo(W + 10, H); c.closePath(); };
      c.save(); c.shadowColor = "rgba(90,55,40,0.30)"; c.shadowBlur = 18; c.shadowOffsetY = -5; bot(); c.fillStyle = "rgb(240,229,217)"; c.fill(); c.restore();
      c.save(); bot(); c.clip(); pearlPaper(c, W, H, [240, 229, 217], 23, 0.14); c.restore();
      c.save(); bot(); c.strokeStyle = "rgba(255,252,246,0.75)"; c.lineWidth = 1.4; c.stroke(); c.restore();
      c.restore();
      // кромка выреза: светлая толщина бумаги
      c.save(); c.beginPath(); c.moveTo(0, 4); c.quadraticCurveTo(M * 0.5, 40, M, 128); c.quadraticCurveTo(M * 1.5, 40, W, 4);
      c.strokeStyle = "rgba(255,252,246,0.9)"; c.lineWidth = 2; c.stroke(); c.restore();
      // золотая фольга: тонкая рамка по клапанам и монограмма
      if (mono) {
        const gg = c.createLinearGradient(M - 160, 0, M + 160, 0);
        gg.addColorStop(0, "#8c6632"); gg.addColorStop(0.35, "#e7cb8f"); gg.addColorStop(0.5, "#f7e7bc"); gg.addColorStop(0.7, "#b98f4e"); gg.addColorStop(1, "#8c6632");
        c.save(); c.fillStyle = gg; c.textAlign = "center"; c.textBaseline = "middle"; c.font = '400 92px "Great Vibes"';
        c.shadowColor = "rgba(90,60,30,0.35)"; c.shadowBlur = 2; c.shadowOffsetY = 1;
        c.fillText(mono, M, 300); c.restore();
        c.save(); c.strokeStyle = gg; c.lineWidth = 1.2; c.beginPath(); c.moveTo(M - 120, 372); c.lineTo(M - 14, 372); c.moveTo(M + 14, 372); c.lineTo(M + 120, 372); c.stroke();
        c.fillStyle = gg; c.beginPath(); c.moveTo(M, 365); c.lineTo(M + 6, 372); c.lineTo(M, 379); c.lineTo(M - 6, 372); c.closePath(); c.fill(); c.restore();
      }
    }
    // клапан: снаружи бумага, изнутри подкладка
    const flapPath = (c, inset = 0) => {
      const M = W / 2;
      c.beginPath(); c.moveTo(inset, inset * 0.2); c.lineTo(W - inset, inset * 0.2);
      c.bezierCurveTo(W - 115 - inset, 260, M + 120, FLAP - 40 - inset, M + 30, FLAP - 14 - inset);
      c.quadraticCurveTo(M, FLAP - 2 - inset * 1.2, M - 30, FLAP - 14 - inset);
      c.bezierCurveTo(M - 120, FLAP - 40 - inset, 115 + inset, 260, inset, inset * 0.2); c.closePath();
    };
    {
      const c = flapOut.getContext("2d"); c.setTransform(k, 0, 0, k, 0, 0);
      c.save(); c.translate(0, 0); flapPath(c); c.clip(); pearlPaper(c, W, FLAP + 20, [241, 230, 219], 31, 0.16);
      const g = c.createLinearGradient(0, 0, 0, FLAP); g.addColorStop(0, "rgba(120,90,70,0.10)"); g.addColorStop(0.25, "rgba(0,0,0,0)");
      c.fillStyle = g; c.fillRect(0, 0, W, FLAP); c.restore();
      c.save(); flapPath(c); c.strokeStyle = "rgba(255,252,246,0.85)"; c.lineWidth = 1.6; c.stroke(); c.restore();
      if (address) {   // надпись от руки: бордовые чернила
        c.save(); c.textAlign = "center"; c.textBaseline = "middle"; c.font = '400 70px "Great Vibes"';
        const ig = c.createLinearGradient(0, 200, 0, 300); ig.addColorStop(0, "#8e3444"); ig.addColorStop(1, "#5a1220");
        c.fillStyle = ig; c.globalAlpha = 0.92; c.fillText(address, W / 2, 238); c.restore();
      }
    }
    {
      // изнутри: рисуем перевёрнутым по вертикали (после поворота клапана на 180° шарнир внизу)
      const c = flapIn.getContext("2d"); const flip = () => c.setTransform(k, 0, 0, -k, 0, (FLAP + 20) * k);
      flip(); c.save(); flapPath(c); c.clip(); c.setTransform(k, 0, 0, k, 0, 0); pearlPaper(c, W, FLAP + 20, [232, 217, 203], 41, 0.08); c.restore();
      const L = mk(Math.round(W * k), Math.round((FLAP + 20) * k)), lc = L.getContext("2d"); lc.setTransform(k, 0, 0, k, 0, 0); liner(lc, W, FLAP + 20, 42);
      flip(); c.save(); flapPath(c, 12); c.clip(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(L, 0, 0); c.restore();
      flip(); c.save(); flapPath(c); c.strokeStyle = "rgba(255,250,244,0.6)"; c.lineWidth = 1.4; c.stroke(); c.restore();
    }
  };

  /* ---------- Открытка-арка: жемчужная бумага ---------- */
  B2.card = function (cv, k) {
    const c = cv.getContext("2d"); c.setTransform(k, 0, 0, k, 0, 0);
    pearlPaper(c, 780, 1480, [251, 246, 239], 61, 0.10);
    const g = c.createRadialGradient(390, 520, 60, 390, 700, 900);
    g.addColorStop(0, "rgba(255,255,255,0.20)"); g.addColorStop(1, "rgba(200,170,150,0.10)");
    c.fillStyle = g; c.fillRect(0, 0, 780, 1480);
  };

  /* ---------- Сургуч: бордовый воск, золотая монограмма ---------- */
  B2.seal = function (cv, a, b) {
    const S = cv.width, cx = S / 2, cy = S / 2, R = S * 0.36;
    const rnd = mulberry32(51);
    const mask = mk(S, S), mc = mask.getContext("2d");
    const n = 28, P = [];
    for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2, r = R * (1 + (rnd() - 0.5) * 0.10 + (i % 7 === 0 ? 0.06 : 0)); P.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); }
    mc.fillStyle = "#fff"; mc.beginPath();
    for (let i = 0; i < n; i++) { const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n]; if (!i) mc.moveTo(...p1); mc.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, ...p2); }
    mc.fill();
    // карта высот
    const hC = mk(S, S), hc = hC.getContext("2d");
    hc.fillStyle = "#000"; hc.fillRect(0, 0, S, S); hc.drawImage(mask, 0, 0);
    hc.filter = `blur(${S * 0.04}px)`; hc.drawImage(hC, 0, 0); hc.filter = "none";
    const r2 = R * 0.78;
    hc.beginPath(); hc.arc(cx, cy, r2, 0, Math.PI * 2); hc.fillStyle = "rgb(170,170,170)"; hc.fill();
    hc.beginPath(); hc.arc(cx, cy, r2, 0, Math.PI * 2); hc.strokeStyle = "rgb(240,240,240)"; hc.lineWidth = S * 0.022; hc.stroke();
    // монограмма (утоплена)
    const lt = mk(S, S), ltc = lt.getContext("2d");
    ltc.fillStyle = "#fff"; ltc.textAlign = "center"; ltc.textBaseline = "middle";
    ltc.font = `400 ${S * 0.36}px "Great Vibes"`;
    ltc.fillText(a, cx - S * 0.07, cy - S * 0.005); ltc.fillText(b, cx + S * 0.085, cy + S * 0.035);
    hc.globalCompositeOperation = "source-over";
    hc.save(); hc.globalAlpha = 1; hc.filter = "brightness(0.42)"; hc.drawImage(lt, 0, 0); hc.restore();
    // мелкие точки по ободу
    for (let i = 0; i < 24; i++) { const t = (i / 24) * Math.PI * 2; hc.beginPath(); hc.arc(cx + Math.cos(t) * r2 * 0.88, cy + Math.sin(t) * r2 * 0.88, S * 0.008, 0, Math.PI * 2); hc.fillStyle = "rgb(205,205,205)"; hc.fill(); }
    const h2 = mk(S, S), h2c = h2.getContext("2d"); h2c.filter = `blur(${S * 0.006}px)`; h2c.drawImage(hC, 0, 0);
    const LM = lt.getContext("2d").getImageData(0, 0, S, S).data;
    const out = mk(S, S);
    const Hx = LIGHT[0], Hy = LIGHT[1], Hz = LIGHT[2] + 1, Hl = Math.hypot(Hx, Hy, Hz);
    shade(h2, mask, out, (nx, ny, nz, x, y, hv, i) => {
      const d = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
      const nh = Math.max(0, (nx * Hx + ny * Hy + nz * Hz) / Hl);
      const gold = LM[i + 3] / 255;
      const spec = Math.pow(nh, 70) * 0.9 + Math.pow(nh, 12) * 0.14;
      const wax = [112, 22, 36].map((q, j) => q * (0.38 + 0.78 * d) + spec * [255, 232, 228][j]);
      const g = [214, 172, 98].map((q, j) => q * (0.45 + 0.75 * d) + Math.pow(nh, 20) * [255, 240, 205][j] * 0.6);
      return wax.map((w, j) => clamp(w * (1 - gold) + g[j] * gold));
    }, S * 0.03);
    const c = cv.getContext("2d"); c.clearRect(0, 0, S, S);
    c.save(); c.shadowColor = "rgba(40,10,14,0.40)"; c.shadowBlur = S * 0.05; c.shadowOffsetX = S * 0.012; c.shadowOffsetY = S * 0.03; c.drawImage(out, 0, 0); c.restore();
  };

  /* ---------- Веточки: бордовые и золотые листья на золотом стебле ---------- */
  function goldGrad(c, x0, y0, x1, y1) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "#8c6632"); g.addColorStop(0.3, "#e3c486"); g.addColorStop(0.5, "#f7e7bc"); g.addColorStop(0.7, "#b98f4e"); g.addColorStop(1, "#7d5a2b");
    return g;
  }
  function leaf(c, x, y, ang, L, Wd, kind, rnd) {
    c.save(); c.translate(x, y); c.rotate(ang);
    const path = () => { c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(L * 0.25, -Wd * 0.75, L * 0.70, -Wd * 0.62, L, 0); c.bezierCurveTo(L * 0.70, Wd * 0.55, L * 0.25, Wd * 0.62, 0, 0); c.closePath(); };
    if (kind === "bur") {
      c.save(); c.shadowColor = "rgba(50,10,15,0.28)"; c.shadowBlur = 8; c.shadowOffsetX = 2; c.shadowOffsetY = 5; path(); c.fillStyle = "#4a0d18"; c.fill(); c.restore();
      const g = c.createLinearGradient(0, -Wd, 0, Wd);
      g.addColorStop(0, "#9c3c4c"); g.addColorStop(0.45, "#6e1a2a"); g.addColorStop(1, "#3e0912");
      path(); c.fillStyle = g; c.fill();
      const g2 = c.createLinearGradient(0, 0, L, 0); g2.addColorStop(0, "rgba(255,200,205,0)"); g2.addColorStop(0.55, "rgba(255,205,210,0.28)"); g2.addColorStop(1, "rgba(255,200,205,0)");
      c.save(); path(); c.clip(); c.fillStyle = g2; c.fillRect(0, -Wd, L, Wd * 0.9); c.restore();
      c.strokeStyle = "rgba(240,190,170,0.55)"; c.lineWidth = 1.1; c.beginPath(); c.moveTo(2, 0); c.quadraticCurveTo(L * 0.5, -Wd * 0.08, L * 0.94, 0); c.stroke();
      c.strokeStyle = "rgba(230,190,130,0.75)"; c.lineWidth = 0.9; path(); c.stroke();
    } else {
      path(); c.fillStyle = goldGrad(c, 0, -Wd, L, Wd); c.globalAlpha = 0.85; c.fill(); c.globalAlpha = 1;
      c.strokeStyle = "rgba(120,85,40,0.55)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(2, 0); c.lineTo(L * 0.92, 0); c.stroke();
    }
    c.restore();
  }
  // opts: base [x,y], dir angle, len, seed, leaves count; рисует в cv в масштабе k
  B2.sprig = function (cv, k, o) {
    const c = cv.getContext("2d"); c.setTransform(k, 0, 0, k, 0, 0);
    const rnd = mulberry32(o.seed);
    const [bx, by] = o.base;
    // стебель как кривая Безье
    const p0 = o.base, p3 = [bx + Math.cos(o.dir + o.bend) * o.len, by + Math.sin(o.dir + o.bend) * o.len];
    const p1 = [bx + Math.cos(o.dir) * o.len * 0.4, by + Math.sin(o.dir) * o.len * 0.4];
    const p2 = [bx + Math.cos(o.dir + o.bend * 0.7) * o.len * 0.75, by + Math.sin(o.dir + o.bend * 0.7) * o.len * 0.75];
    const bez = (t) => { const u = 1 - t; return [0, 1].map((j) => u * u * u * p0[j] + 3 * u * u * t * p1[j] + 3 * u * t * t * p2[j] + t * t * t * p3[j]); };
    const tanA = (t) => { const q = bez(Math.min(1, t + 0.01)), p = bez(Math.max(0, t - 0.01)); return Math.atan2(q[1] - p[1], q[0] - p[0]); };
    c.save(); c.lineCap = "round"; c.strokeStyle = goldGrad(c, p0[0], p0[1], p3[0], p3[1]); c.lineWidth = 2.4;
    c.shadowColor = "rgba(60,30,20,0.25)"; c.shadowBlur = 3; c.shadowOffsetY = 2;
    c.beginPath(); c.moveTo(...p0); c.bezierCurveTo(...p1, ...p2, ...p3); c.stroke(); c.restore();
    // листья парами вдоль стебля
    const N = o.leaves;
    for (let i = 0; i < N; i++) {
      const t = 0.12 + (i / N) * 0.86, p = bez(t), ta = tanA(t);
      const side = i % 2 ? 1 : -1;
      const L = o.leafLen * (1.05 - t * 0.45) * (0.85 + rnd() * 0.3), Wd = L * 0.36;
      const kind = rnd() < o.goldShare ? "gold" : "bur";
      // короткий черешок
      const ang = ta + side * (0.62 + rnd() * 0.25);
      c.save(); c.strokeStyle = "#b38a4a"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(...p); c.lineTo(p[0] + Math.cos(ang) * 8, p[1] + Math.sin(ang) * 8); c.stroke(); c.restore();
      leaf(c, p[0] + Math.cos(ang) * 6, p[1] + Math.sin(ang) * 6, ang, L, Wd, kind, rnd);
    }
    leaf(c, p3[0], p3[1], tanA(1), o.leafLen * 0.55, o.leafLen * 0.18, "bur", rnd);
    // золотые бусины-бутоны
    for (let i = 0; i < (o.buds || 0); i++) {
      const t = 0.2 + rnd() * 0.75, p = bez(t), ta = tanA(t) + (rnd() < 0.5 ? -1 : 1) * (0.9 + rnd() * 0.6), d = 18 + rnd() * 34;
      const q = [p[0] + Math.cos(ta) * d, p[1] + Math.sin(ta) * d], r = 3 + rnd() * 3.5;
      c.save(); c.strokeStyle = "rgba(180,140,80,0.8)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(...p); c.quadraticCurveTo(p[0] + Math.cos(ta) * d * 0.5 + 6, p[1] + Math.sin(ta) * d * 0.5, ...q); c.stroke(); c.restore();
      const g = c.createRadialGradient(q[0] - r * 0.35, q[1] - r * 0.4, r * 0.1, q[0], q[1], r);
      g.addColorStop(0, "#fff6da"); g.addColorStop(0.45, "#dcb672"); g.addColorStop(1, "#7f5a28");
      c.fillStyle = g; c.beginPath(); c.arc(q[0], q[1], r, 0, Math.PI * 2); c.fill();
    }
  };

  /* ---------- Зерно ---------- */
  B2.grain = function (cv) {
    const c = cv.getContext("2d"), w = cv.width, h = cv.height, rnd = mulberry32(77);
    const id = c.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { const v = Math.round(128 + (rnd() - 0.5) * 255 * 0.5); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    c.putImageData(id, 0, 0);
  };

  /* ---------- Золотая пыль: точки заранее, рисуются по времени ---------- */
  B2.dust = function (n, seed, box) {
    const rnd = mulberry32(seed);
    return Array.from({ length: n }, () => ({
      x: box[0] + rnd() * box[2], y: box[1] + rnd() * box[3], r: 0.8 + Math.pow(rnd(), 3) * 3.2,
      vx: (rnd() - 0.5) * 6, vy: -3 - rnd() * 7, ph: rnd() * 6.28, f: 0.4 + rnd() * 0.9, a: 0.35 + rnd() * 0.6,
    }));
  };
  B2.drawDust = function (cv, pts, t, k, alpha) {
    const c = cv.getContext("2d"); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    c.setTransform(k, 0, 0, k, 0, 0);
    for (const p of pts) {
      const tw = 0.5 + 0.5 * Math.sin(p.ph + t * p.f * 2.2);
      const a = p.a * (0.25 + 0.75 * tw * tw) * alpha;
      if (a < 0.02) continue;
      const x = p.x + p.vx * t + Math.sin(t * 0.3 + p.ph) * 6, y = p.y + p.vy * t;
      const r = p.r * (1 + 1.6 * tw * (p.r > 2.6 ? 1 : 0.3));
      const g = c.createRadialGradient(x, y, 0, x, y, r * 2.6);
      g.addColorStop(0, `rgba(255,246,214,${a})`); g.addColorStop(0.35, `rgba(232,196,120,${a * 0.65})`); g.addColorStop(1, "rgba(220,180,100,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.6, 0, Math.PI * 2); c.fill();
    }
  };

  window.Bake2 = B2;
})();
