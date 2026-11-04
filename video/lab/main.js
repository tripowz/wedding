(() => {
  const $ = (s) => document.querySelector(s);
  const B = window.Bake2;

  const fontsReady = Promise.all([
    document.fonts.load('400 148px "Great Vibes"', "Bekzod & Ferangiz Бекзод и Ферангиз BFБФ"),
    document.fonts.load('400 30px "Forum"', "SIZNI TO‘YIMIZGA ПРИГЛАШАЕМ 0123456789"),
    document.fonts.load('italic 500 34px "Cormorant Garamond"', "To‘yxonasi Банкетный"),
  ]);

  fontsReady.then(() => {
    const V = Object.assign({},
      ...JSON.parse(document.documentElement.dataset.compositionVariables).map((d) => ({ [d.id]: d.default })),
      (window.__hyperframes && window.__hyperframes.getVariables && window.__hyperframes.getVariables()) || {});

    /* ---------- материалы ---------- */
    const KE = 1.5, KC = 1.25;
    const size = (el, w, h, k) => { el.width = Math.round(w * k); el.height = Math.round(h * k); };
    size($("#envBack"), 880, 1560, KE); size($("#pocket"), 880, 1560, KE);
    size($("#flapOut"), 880, 660, KE); size($("#flapIn"), 880, 660, KE);
    B.envelope({ back: $("#envBack"), pocket: $("#pocket"), flapOut: $("#flapOut"), flapIn: $("#flapIn") }, KE);
    size($("#cardPaper"), 780, 1480, KC); B.card($("#cardPaper"), KC);
    $("#seal").width = $("#seal").height = 450; B.seal($("#seal"), V.mono1, V.mono2);
    size($("#sprigL"), 330, 460, 1.5); size($("#sprigR"), 330, 470, 1.5);
    B.sprig($("#sprigL"), 1.5, { base: [40, 430], dir: -1.05, bend: 0.55, len: 380, leaves: 11, leafLen: 74, goldShare: 0.35, buds: 7, seed: 5 });
    B.sprig($("#sprigR"), 1.5, { base: [292, 30], dir: 2.05, bend: 0.45, len: 400, leaves: 11, leafLen: 70, goldShare: 0.4, buds: 6, seed: 9 });
    B.grain($("#grain"));

    const silk = Satin.Silk($("#silk"), [-160, -160, 1400, 2240], { lo: [0.80, 0.68, 0.61], mid: [0.93, 0.86, 0.80], hi: [1.0, 0.975, 0.95], relief: 0.16 });
    const R = window.RIBBONS;
    const ribBack = Satin.Ribbons($("#ribBack"), [-100, -100, 1280, 2120], R.back);
    const ribFront = Satin.Ribbons($("#ribFront"), [-100, -100, 1280, 2120], R.front);
    const dustPts = B.dust(70, 21, [-40, 0, 1160, 2300]);

    /* ---------- тексты ---------- */
    const txt = { tBless: "blessing", tGroom: "groom", tAmp: "amp", tBride: "bride", tInv1: "invite1", tInv2: "invite2",
      dLeft: "weekday", dMonth: "month", dDay: "day", dYear: "year", dT1: "time1", dT2: "time2",
      tVenue: "venue", tVenue2: "venue2", tHosts1: "hosts1", tHosts2: "hosts2" };
    for (const [id, key] of Object.entries(txt)) $("#" + id).textContent = V[key];

    /* ---------- камера: плавный сплайн по ключам (t, масштаб, фокус x, фокус y) ---------- */
    const CAM = [
      [0, 1.30, 540, 880], [3.0, 1.355, 540, 868], [4.9, 1.22, 540, 850], [8.6, 1.0, 540, 960],
      [16, 1.022, 540, 945], [24, 1.034, 540, 972], [31, 1.03, 540, 982], [37.5, 1.024, 540, 966],
      [42.5, 1.0, 540, 960], [47, 1.0, 540, 960],
    ];
    function camAt(t) {
      const K = CAM, n = K.length;
      if (t <= K[0][0]) return K[0].slice(1);
      if (t >= K[n - 1][0]) return K[n - 1].slice(1);
      let i = 0; while (K[i + 1][0] < t) i++;
      const t0 = K[i][0], t1 = K[i + 1][0], h = t1 - t0, u = (t - t0) / h;
      const slope = (j, c) => {
        if (j === 0 || j === n - 1) return 0;
        return (K[j + 1][c] - K[j - 1][c]) / (K[j + 1][0] - K[j - 1][0]);
      };
      const out = [];
      for (let c = 1; c <= 3; c++) {
        const p0 = K[i][c], p1 = K[i + 1][c], m0 = slope(i, c) * h, m1 = slope(i + 1, c) * h;
        const u2 = u * u, u3 = u2 * u;
        out.push((2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1);
      }
      return out;
    }
    const smooth = (a, b, x) => { const v = Math.min(1, Math.max(0, (x - a) / (b - a))); return v * v * (3 - 2 * v); };

    const world = $("#world"), fg = $("#fg"), sprigL = $("#sprigL"), sprigR = $("#sprigR"), dustCv = $("#dust");
    function render(t) {
      const [s, fx, fy] = camAt(t);
      world.style.transform = `translate(${540 - fx * s}px, ${960 - fy * s}px) scale(${s})`;
      const sf = 1 + (s - 1) * 1.3;                             // передний план ближе к камере
      fg.style.transform = `translate(${540 - fx * sf}px, ${960 - fy * sf}px) scale(${sf})`;
      const blur = 7 * (1 - smooth(3.2, 7.6, t));               // перевод фокуса с печати на открытку
      $("#ribFront").style.filter = `blur(${blur.toFixed(2)}px) drop-shadow(0 26px 30px rgba(80,35,30,.30)) drop-shadow(0 5px 8px rgba(80,35,30,.18))`;
      silk(t); ribBack(t); ribFront(t);
      B.drawDust(dustCv, dustPts, t, 1, 0.55 + 0.45 * smooth(6, 10, t));
      const sw = (a, f, p) => a * Math.sin(t * f + p);
      sprigL.style.transform = `rotate(${(sw(1.1, 0.55, 0.3) + sw(0.4, 1.3, 1.9)).toFixed(3)}deg)`;
      sprigR.style.transform = `rotate(${(sw(1.0, 0.5, 2.2) + sw(0.35, 1.2, 0.7)).toFixed(3)}deg)`;
    }

    /* ---------- таймлайн ---------- */
    const tl = gsap.timeline({ paused: true });
    const clock = { t: 0 };
    tl.to(clock, { t: 47, duration: 47, ease: "none", onUpdate: () => render(clock.t) }, 0);

    const ENV = ["#envBack", "#flapWrap", "#pocket"];
    gsap.set(ENV, { y: 0 }); gsap.set("#card", { y: 0 }); gsap.set("#flap", { rotationX: 0 });
    gsap.set(["#sprigL", "#sprigR"], { opacity: 0 });

    // 0.6 — свет скользит по конверту и печати
    tl.fromTo("#sweep", { x: 0 }, { x: 2300, duration: 3.4, ease: "sine.inOut" }, 0.5);

    // 3.0 — 4.9: клапан открывается (ребром к камере ровно на середине — там и меняется порядок слоёв)
    tl.fromTo("#flap", { rotationX: 0 }, { rotationX: 180, duration: 1.9, ease: "sine.inOut" }, 3.0);
    tl.fromTo("#shadeOut", { opacity: 0 }, { opacity: 0.55, duration: 0.95, ease: "sine.in" }, 3.0);
    tl.fromTo("#shadeIn", { opacity: 0.7 }, { opacity: 0, duration: 0.95, ease: "sine.out" }, 3.95);
    tl.set("#flapWrap", { zIndex: 2 }, 3.95);

    // 4.6 — 8.4: открытка выходит, конверт опускается вниз кадра
    tl.to("#card", { y: -140, duration: 3.7, ease: "power2.inOut" }, 4.6);
    tl.to(ENV, { y: 1240, duration: 3.8, ease: "power2.inOut" }, 4.6);

    // веточки «распускаются» у краёв открытки
    tl.fromTo("#sprigL", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 2.2, ease: "sine.out" }, 7.6);
    tl.fromTo("#sprigR", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 2.2, ease: "sine.out" }, 7.9);

    // проявления
    const P = (sel, t, dur, ease = "sine.inOut") => tl.fromTo(sel, { "--p": 0 }, { "--p": 1, duration: dur, ease }, t);
    // рамка-арка прорисовывается от вершины вниз
    tl.fromTo("#frame .draw", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 3.0, ease: "sine.inOut", stagger: 0.12 }, 7.7);
    P("#orn1", 8.4, 1.6);
    P("#tBless", 8.9, 1.6);
    P("#tGroom", 9.7, 1.9, "power1.inOut");
    P("#tAmp", 11.0, 1.0, "power1.inOut");
    P("#tBride", 11.6, 2.0, "power1.inOut");
    P("#div1", 13.7, 1.4);
    // 15.5 — приглашение и дата
    P("#tInv1", 15.7, 1.6); P("#tInv2", 16.3, 1.6);
    tl.fromTo(["#vL", "#vR"], { scaleY: 0 }, { scaleY: 1, duration: 1.4, ease: "sine.inOut" }, 17.4);
    P("#dMonth", 17.9, 1.2); P("#dDay", 18.3, 1.5); P("#dYear", 18.9, 1.2);
    P("#dLeft", 19.4, 1.3); P("#dT1", 19.9, 1.1); P("#dT2", 20.2, 1.3);
    // 23.0 — место
    P("#orn2", 23.3, 1.5);
    P("#tVenue", 23.9, 1.7); P("#tVenue2", 24.8, 1.6);
    // 29.5 — подпись пишется от руки
    P("#tHosts1", 29.8, 1.6, "power1.inOut"); P("#tHosts2", 31.0, 2.2, "power1.inOut");

    // блеск фольги и свет в финале
    tl.fromTo(".gold", { "--g": "120%" }, { "--g": "-20%", duration: 2.6, ease: "sine.inOut" }, 13.2);
    tl.fromTo(".gold", { "--g": "120%" }, { "--g": "-20%", duration: 2.8, ease: "sine.inOut" }, 38.0);
    tl.fromTo("#cardSheen", { x: 0, opacity: 0.9 }, { x: 1600, opacity: 0.9, duration: 3.6, ease: "sine.inOut" }, 37.6);
    tl.set("#sweep", { x: 0 }, 39.4);
    tl.to("#sweep", { x: 2300, duration: 3.6, ease: "sine.inOut" }, 39.5);

    render(0);
    window.__timelines = window.__timelines || {};
    window.__timelines["main"] = tl;
  });
})();
