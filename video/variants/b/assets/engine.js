/* Общий движок для вариантов B и C: рельеф + материалы под одним ключевым светом.
   Каждый кадр рисуется в три 2D-канваса 1080×1920:
   H — высота (серый), A — альбедо (цвет), K — материал (серый код).
   Коды материалов: 0 бумага · 60 лён · 110 сургуч · 170 фольга · 230 шёлк · 250 металл иглы. */
(function () {
  const W = 1080, Hh = 1920;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const gray = (v) => { const c = Math.round(Math.max(0, Math.min(1, v)) * 255); return `rgb(${c},${c},${c})`; };

  function makeLayers() {
    const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = Hh; return c; };
    const H = mk(), A = mk(), K = mk();
    const h = H.getContext("2d"), a = A.getContext("2d"), k = K.getContext("2d");
    // общий API: path(ctx) описывает форму, fill кладёт её во все три слоя
    const u = {
      W, H: Hh, h, a, k, gray, rnd: mulberry32(7),
      fill(path, { hv, alb, mat, hOnly = false, alpha = 1 }) {
        if (hv != null) { h.save(); h.globalAlpha = alpha; path(h); h.fillStyle = gray(hv); h.fill(); h.restore(); }
        if (hOnly) return;
        if (alb) { a.save(); path(a); a.fillStyle = alb; a.fill(); a.restore(); }
        if (mat != null) { k.save(); path(k); k.fillStyle = gray(mat / 255); k.fill(); k.restore(); }
      },
      stroke(path, { hv, alb, mat, width, dash }) {
        [[h, hv != null ? gray(hv) : null], [a, alb], [k, mat != null ? gray(mat / 255) : null]].forEach(([c, st]) => {
          if (!st) return;
          c.save(); path(c); c.lineWidth = width; c.lineCap = "round"; c.lineJoin = "round";
          if (dash) c.setLineDash(dash);
          c.strokeStyle = st; c.stroke(); c.restore();
        });
      },
      text(str, x, y, font, { hv, alb, mat, tracking = 0, align = "center" }) {
        [[h, hv != null ? gray(hv) : null], [a, alb], [k, mat != null ? gray(mat / 255) : null]].forEach(([c, st]) => {
          if (!st) return;
          c.save(); c.font = font; c.fillStyle = st; c.textBaseline = "middle";
          if (!tracking) { c.textAlign = align; c.fillText(str, x, y); c.restore(); return; }
          const ch = Array.from(str), ws = ch.map((q) => c.measureText(q).width);
          const tot = ws.reduce((p, q) => p + q, 0) + tracking * (ch.length - 1);
          let cx = x - tot / 2; c.textAlign = "left";
          ch.forEach((q, i) => { c.fillText(q, cx, y); cx += ws[i] + tracking; });
          c.restore();
        });
      },
      // Высоту по маске: тело с плавной фаской (blur), без изменения цвета
      bevel(px) {
        const t = document.createElement("canvas"); t.width = W; t.height = Hh;
        const tc = t.getContext("2d"); tc.filter = `blur(${px}px)`; tc.drawImage(H, 0, 0);
        h.clearRect(0, 0, W, Hh); h.drawImage(t, 0, 0);
      },
    };
    return { H, A, K, u };
  }

  // Атлас шёлковой глади: параллельные нити внутри маски.
  // maskDraw(c) рисует форму белым на чистом канвасе (путь или текст).
  function satin(u, maskDraw, { angle, spacing = 3.4, width = 2.8, base, top, color, mat = 230, jitter = 0.25 }) {
    const { W: w, H: hh } = u;
    const mk = () => { const c = document.createElement("canvas"); c.width = w; c.height = hh; return [c, c.getContext("2d")]; };
    const [M, mc] = mk();
    mc.fillStyle = "#fff"; mc.strokeStyle = "#fff"; maskDraw(mc);
    const [T, tc] = mk();
    tc.save(); tc.translate(w / 2, hh / 2); tc.rotate(angle);
    const R = Math.hypot(w, hh);
    for (let y = -R; y < R; y += spacing) {
      const j = (u.rnd() - 0.5) * jitter * spacing;
      tc.strokeStyle = gray(0.7 + u.rnd() * 0.3); tc.lineWidth = width;
      tc.beginPath(); tc.moveTo(-R, y + j); tc.lineTo(R, y + j); tc.stroke();
    }
    tc.restore();
    const [T2, t2] = mk();
    t2.filter = "blur(0.8px)"; t2.drawImage(T, 0, 0); t2.filter = "none";
    t2.globalCompositeOperation = "destination-in"; t2.drawImage(M, 0, 0);
    const paint = (ctx, style, addThreads) => {
      const [X, xc] = mk();
      xc.fillStyle = style; xc.fillRect(0, 0, w, hh);
      xc.globalCompositeOperation = "destination-in"; xc.drawImage(M, 0, 0);
      if (addThreads) { xc.globalCompositeOperation = "lighter"; xc.globalAlpha = top - base; xc.drawImage(T2, 0, 0); }
      ctx.drawImage(X, 0, 0);
    };
    paint(u.h, gray(base), true);
    paint(u.a, color, false);
    paint(u.k, gray(mat / 255), false);
  }

  const VS = `#version 300 es
  in vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
  const FS = `#version 300 es
  precision highp float;
  uniform sampler2D uH, uA, uK;
  uniform vec2 uRes;
  uniform float uDepth, uAz, uEl, uAmb, uKey, uFrame, uZoom;
  uniform vec2 uCam;
  out vec4 o;
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
  float Hs(vec2 w){ return texture(uH, w / uRes).r; }
  void main(){
    vec2 sc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
    vec2 w = uCam + (sc - uRes*0.5) / uZoom;
    vec2 uv = w / uRes;
    float h = Hs(w);
    float hx = Hs(w+vec2(1,0)) - Hs(w-vec2(1,0));
    float hy = Hs(w+vec2(0,1)) - Hs(w-vec2(0,1));
    vec3 N = normalize(vec3(-hx*uDepth*0.5, -hy*uDepth*0.5, 1.0));
    vec3 L = normalize(vec3(cos(uAz)*cos(uEl), sin(uAz)*cos(uEl), sin(uEl)));
    vec3 V = vec3(0,0,1);
    vec3 alb = texture(uA, uv).rgb;
    float mat = texture(uK, uv).r * 255.0;

    // мягкие падающие тени
    vec2 dir = normalize(L.xy); float slope = L.z / length(L.xy);
    float sh = 1.0;
    for (int i = 1; i <= 26; i++) {
      float s = float(i) * 2.4;
      float occ = Hs(w + dir*s)*uDepth - (h*uDepth + s*slope);
      sh = min(sh, 1.0 - clamp(occ / (0.8 + s*0.12), 0.0, 1.0));
    }
    float hb = textureLod(uH, uv, 3.5).r;
    float ao = clamp((hb - h) * 2.4, 0.0, 1.0);

    float diff = max(dot(N, L), 0.0);
    vec3 H2 = normalize(L + V);
    float nh = max(dot(N, H2), 0.0);
    vec3 col;
    vec3 key = vec3(1.0, 0.965, 0.915) * uKey;
    vec3 amb = vec3(0.97, 0.965, 0.96) * uAmb;

    if (mat < 30.0) {                        // бумага: волокна
      float f = vn(w*vec2(0.9,0.22))*0.5 + vn(w*0.6)*0.5;
      alb *= 0.975 + f*0.05;
      col = alb * (amb*(1.0-ao*0.5) + key*diff*sh);
      col += pow(nh, 12.0) * 0.03 * sh;
    } else if (mat < 85.0) {                 // лён: переплетение
      float wx = sin(w.x*1.15), wy = sin(w.y*1.15);
      alb *= 0.95 + 0.05*vn(w*vec2(0.05,1.2)) + 0.03*wx*wy;
      col = alb * (amb*(1.0-ao*0.6) + key*diff*sh);
    } else if (mat < 140.0) {                // сургуч: глянец
      col = alb * (amb*0.9*(1.0-ao*0.5) + key*diff*sh*0.95);
      col += vec3(1.0,0.97,0.9) * pow(nh, 46.0) * 0.55 * sh;
      col += vec3(1.0,0.97,0.9) * pow(nh, 9.0) * 0.07 * sh;
    } else if (mat < 200.0) {                // фольга хаки: металл
      vec3 R = reflect(-V, N);
      float env = 0.35 + 0.65*smoothstep(-0.6, 0.9, dot(R.xy, -dir));
      col = alb * (0.30*amb + env*0.85) * (0.75 + 0.25*sh);
      col += alb * pow(nh, 28.0) * 1.3 * sh + pow(nh, 80.0) * 0.4 * sh;
    } else if (mat < 240.0) {                // шёлк: блеск по нити
      col = alb * (amb*(1.0-ao*0.4)*0.9 + key*diff*sh*0.9);
      col += mix(alb, vec3(1.0), 0.45) * pow(nh, 14.0) * 0.42 * sh;
    } else {                                 // сталь иглы
      col = vec3(0.62,0.62,0.6) * (0.35 + 0.65*diff) + pow(nh, 60.0) * 1.2 * sh;
    }
    col = col / (1.0 + col*0.15) * 1.15;
    vec2 q = sc / uRes - 0.5;
    col *= 1.0 - 0.12 * smoothstep(0.2, 0.8, length(q*vec2(1.0,0.75))*1.4);
    col += (hash(sc + uFrame*17.1) - 0.5) * 0.018;
    o = vec4(clamp(col, 0.0, 1.0), 1.0);
  }`;

  window.ReliefStills = function ({ canvas, shots, slot = 2 }) {
    const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false });
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x);
      if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr); gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const lp = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    ["uH", "uA", "uK", "uRes", "uDepth", "uAz", "uEl", "uAmb", "uKey", "uFrame", "uZoom", "uCam"].forEach((n) => (U[n] = gl.getUniformLocation(pr, n)));

    const tex = (src, rgb) => {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, rgb ? gl.RGBA : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    const built = shots.map((s) => {
      const L = makeLayers();
      L.u.satin = (mask, o) => satin(L.u, mask, o);
      s.draw(L.u);
      return { H: tex(L.H), A: tex(L.A), K: tex(L.K), s };
    });

    return function renderAt(t) {
      const i = Math.max(0, Math.min(built.length - 1, Math.floor(t / slot)));
      const { H, A, K, s } = built[i];
      const local = t - i * slot;
      [[H, 0, U.uH], [A, 1, U.uA], [K, 2, U.uK]].forEach(([tx, unit, loc]) => {
        gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx); gl.uniform1i(loc, unit);
      });
      gl.viewport(0, 0, W, Hh);
      gl.uniform2f(U.uRes, W, Hh);
      gl.uniform1f(U.uDepth, s.depth || 40);
      gl.uniform1f(U.uAz, ((s.az ?? 225) * Math.PI) / 180);
      gl.uniform1f(U.uEl, ((s.el ?? 38) * Math.PI) / 180);
      gl.uniform1f(U.uAmb, s.amb ?? 0.55);
      gl.uniform1f(U.uKey, s.key ?? 0.85);
      gl.uniform1f(U.uFrame, Math.round(t * 30));
      const z = s.zoom ? s.zoom(local) : 1;
      gl.uniform1f(U.uZoom, z);
      gl.uniform2f(U.uCam, W / 2, Hh / 2);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
  };
})();
