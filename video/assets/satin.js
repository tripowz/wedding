/* Атлас: шёлковый фон и объёмные ленты (WebGL). Всё — чистая функция времени t. */
(function () {
  const FW = 1080, FH = 1920;          // кадр, в котором заданы координаты
  const D = 2600;                      // расстояние до камеры (перспектива лент)
  const LIGHT = norm([-0.42, -0.72, 0.56]);

  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

  function sh(gl, type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  const ctxOpts = { antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true };

  /* ---------------- Шёлковый фон ---------------- */
  const SILK_FS = `
precision highp float;
uniform vec2 uRes; uniform float uT; uniform vec4 uBox;
uniform vec3 cLo, cMid, cHi; uniform float uRelief;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<3;i++){ v+=a*noise(p); p=p*2.02+vec2(1.7,9.2); a*=.5; } return v; }
float H(vec2 p){
  float t=uT*0.010;
  vec2 q=p+vec2(fbm(p*0.8+vec2(t,0.)), fbm(p*0.8+vec2(4.3,1.7-t)))*0.9;
  float m=smoothstep(0.3,0.75,fbm(q*0.6+2.));
  float f1=sin(dot(q,vec2(0.78,0.62))*4.6);
  float f2=sin(dot(q,vec2(-0.42,0.91))*2.7+1.0);
  float f3=sin(dot(q,vec2(0.95,-0.30))*7.2+2.0);
  return 0.70*f1*(0.4+0.6*m) + 0.55*f2 + 0.22*f3*(1.-m);
}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes; uv.y=1.-uv.y;
  vec2 px=uBox.xy+uv*uBox.zw;            // координаты кадра, px
  vec2 p=px/1000.;
  float e=0.0025;
  float h=H(p), hx=H(p+vec2(e,0.))-h, hy=H(p+vec2(0.,e))-h;
  vec3 N=normalize(vec3(-hx/e*uRelief, -hy/e*uRelief, 1.));
  vec3 V=vec3(0.,0.,1.);
  vec3 L1=normalize(vec3(-0.42,-0.72,0.56)), L2=normalize(vec3(0.0,-0.3,0.95)), L3=normalize(vec3(0.7,-0.1,0.7));
  float dif=clamp(dot(N,L1)*0.5+0.5,0.,1.);
  float s1=pow(clamp(dot(N,normalize(L1+V)),0.,1.),70.);
  float s2=pow(clamp(dot(N,normalize(L2+V)),0.,1.),28.);
  float s3=pow(clamp(dot(N,normalize(L3+V)),0.,1.),50.);
  vec3 lo=pow(cLo,vec3(2.2)), mid=pow(cMid,vec3(2.2)), hi=pow(cHi,vec3(2.2));
  vec3 col=mix(lo,mid,smoothstep(0.05,0.95,dif));
  col+=hi*(s1*0.42+s2*0.22+s3*0.12);
  vec2 c=(px-vec2(540.,900.))/vec2(900.,1300.);
  col*=1.0-0.28*smoothstep(0.3,1.3,length(c));
  col=pow(col,vec3(1./2.2));
  col+=(hash(gl_FragCoord.xy+uT)-.5)/255.*1.5;
  gl_FragColor=vec4(col,1.);
}`;
  const QUAD_VS = `attribute vec2 a; void main(){ gl_Position=vec4(a,0.,1.); }`;

  function Silk(canvas, box, colors) {
    const gl = canvas.getContext("webgl", ctxOpts);
    const p = program(gl, QUAD_VS, SILK_FS);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, "a");
    const U = (n) => gl.getUniformLocation(p, n);
    return function render(t) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(p);
      gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(U("uRes"), canvas.width, canvas.height); gl.uniform1f(U("uT"), t);
      gl.uniform4f(U("uBox"), box[0], box[1], box[2], box[3]);
      gl.uniform3fv(U("cLo"), colors.lo); gl.uniform3fv(U("cMid"), colors.mid); gl.uniform3fv(U("cHi"), colors.hi); gl.uniform1f(U("uRelief"), colors.relief || 0.16);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
  }

  /* ---------------- Атласные ленты ---------------- */
  const RIB_VS = `
attribute vec3 aP; attribute vec3 aN; attribute vec3 aT; attribute float aU;
uniform vec4 uBox; uniform float uD;
varying vec3 vN; varying vec3 vT; varying vec3 vP; varying float vU;
void main(){
  vN=aN; vT=aT; vP=aP; vU=aU;
  float w=(uD-aP.z)/uD;
  vec2 c=uBox.xy+uBox.zw*0.5;                    // центр холста
  vec2 ndc=vec2((aP.x-540.)+(540.-c.x)*w, (aP.y-960.)+(960.-c.y)*w);
  ndc=vec2(ndc.x/(uBox.z*0.5), -ndc.y/(uBox.w*0.5));
  gl_Position=vec4(ndc, -aP.z/4000.*w, w);
}`;
  const RIB_FS = `
precision highp float;
uniform vec3 cBase, cSheen, cBack; uniform float uAT, uAW, uSpec, uAmb; uniform vec3 cShade; uniform vec3 uL; uniform float uD;
varying vec3 vN; varying vec3 vT; varying vec3 vP; varying float vU;
void main(){
  vec3 N0=normalize(vN); vec3 T=normalize(vT);
  vec3 V=normalize(vec3(540.,960.,uD)-vP);
  float face=dot(N0,V);
  vec3 N=face<0.?-N0:N0;
  bool back=face<0.;
  vec3 L1=normalize(uL), L2=normalize(vec3(0.05,-0.28,0.96)), L3=normalize(vec3(0.75,-0.15,0.64));
  float dif=pow(clamp(dot(N,L1)*0.5+0.5,0.,1.),1.3);
  float s1=pow(max(dot(N,normalize(L1+V)),0.),uAT);
  float s2=pow(max(dot(N,normalize(L2+V)),0.),uAT*0.6);
  float s3=pow(max(dot(N,normalize(L3+V)),0.),uAT*1.4);
  float br=pow(max(dot(N,normalize(L2+V)),0.),uAW);
  vec3 base=pow(back?cBack:cBase,vec3(2.2)), sheen=pow(cSheen,vec3(2.2));
  float k=uSpec*(back?0.3:1.0);
  float edge=1.-0.35*pow(abs(vU*2.-1.),14.);
  vec3 shade=pow(cShade,vec3(2.2));
  vec3 col=mix(shade, base, clamp(uAmb+(1.-uAmb)*dif,0.,1.)) + sheen*k*(s1*0.9+s2*0.75+s3*0.45+br*0.18);
  col*=edge;
  col=col/(1.+col*0.35);
  col=pow(col,vec3(1./2.2));
  gl_FragColor=vec4(col,1.);
}`;

  // Катмулл-Ром по контрольным точкам [x,y,z,twistDeg,width]
  function sampleSpline(P, perSeg) {
    const out = [];
    const n = P.length;
    const get = (i) => P[Math.max(0, Math.min(n - 1, i))];
    for (let i = 0; i < n - 1; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      for (let k = 0; k < perSeg; k++) {
        const t = k / perSeg, t2 = t * t, t3 = t2 * t;
        const v = p1.map((_, j) => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3));
        out.push(v);
      }
    }
    out.push(P[n - 1].slice());
    return out;
  }

  function buildRibbon(ctrl, rip, t) {
    const S = sampleSpline(ctrl, 28), m = S.length;
    if (rip) { let L = 0; for (let k = 0; k < m; k++) { if (k) L += Math.hypot(S[k][0] - S[k - 1][0], S[k][1] - S[k - 1][1]); S[k][2] += rip[0] * Math.sin(L / rip[1] + t * rip[2] + (rip[3] || 0)); } }
    const pos = [], nor = [], tan = [], uu = [];
    let Nprev = null;
    for (let k = 0; k < m; k++) {
      const a = S[Math.max(0, k - 1)], b = S[Math.min(m - 1, k + 1)];
      const T = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
      let Nk;
      if (!Nprev) Nk = norm(cross(T, [0, 0, 1]));
      else { const d = dot(Nprev, T); Nk = norm([Nprev[0] - d * T[0], Nprev[1] - d * T[1], Nprev[2] - d * T[2]]); }
      Nprev = Nk;
      const B = cross(T, Nk);
      const th = (S[k][3] * Math.PI) / 180, c = Math.cos(th), s = Math.sin(th);
      const W = [c * Nk[0] + s * B[0], c * Nk[1] + s * B[1], c * Nk[2] + s * B[2]];
      const nrm = norm(cross(T, W));
      const hw = S[k][4] / 2;
      for (const side of [-1, 1]) {
        pos.push(S[k][0] + W[0] * hw * side, S[k][1] + W[1] * hw * side, S[k][2] + W[2] * hw * side);
        nor.push(...nrm); tan.push(...T); uu.push(side < 0 ? 0 : 1);
      }
    }
    return { pos: new Float32Array(pos), nor: new Float32Array(nor), tan: new Float32Array(tan), u: new Float32Array(uu), count: m * 2 };
  }

  // ribbons: [{ ctrl:[[x,y,z,tw,w],...], wob:[[ax,ay,az,atw,freq,phase],...] | null, colors:{base,sheen,back}, at, aw, spec }]
  function Ribbons(canvas, box, ribbons) {
    const gl = canvas.getContext("webgl", ctxOpts);
    const p = program(gl, RIB_VS, RIB_FS);
    const bufs = { aP: gl.createBuffer(), aN: gl.createBuffer(), aT: gl.createBuffer(), aU: gl.createBuffer() };
    const L = { aP: gl.getAttribLocation(p, "aP"), aN: gl.getAttribLocation(p, "aN"), aT: gl.getAttribLocation(p, "aT"), aU: gl.getAttribLocation(p, "aU") };
    const U = (n) => gl.getUniformLocation(p, n);
    const put = (name, data, size) => { gl.bindBuffer(gl.ARRAY_BUFFER, bufs[name]); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(L[name]); gl.vertexAttribPointer(L[name], size, gl.FLOAT, false, 0, 0); };
    return function render(t) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clearDepth(1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      gl.useProgram(p);
      gl.uniform4f(U("uBox"), box[0], box[1], box[2], box[3]);
      gl.uniform1f(U("uD"), D); gl.uniform3fv(U("uL"), LIGHT);
      for (const r of ribbons) {
        const ctrl = r.ctrl.map((c, i) => {
          const w = (r.wob && r.wob[i]) || [0, 0, 0, 0, 0, 0];
          const ph = w[5] + t * w[4];
          return [c[0] + w[0] * Math.sin(ph), c[1] + w[1] * Math.sin(ph * 0.83 + 1.1), c[2] + w[2] * Math.sin(ph * 0.71 + 2.3), c[3] + w[3] * Math.sin(ph * 0.9 + 0.4), c[4]];
        });
        const g = buildRibbon(ctrl, r.ripple, t);
        put("aP", g.pos, 3); put("aN", g.nor, 3); put("aT", g.tan, 3); put("aU", g.u, 1);
        gl.uniform3fv(U("cBase"), r.colors.base); gl.uniform3fv(U("cSheen"), r.colors.sheen); gl.uniform3fv(U("cBack"), r.colors.back);
        gl.uniform1f(U("uAT"), r.at || 0.22); gl.uniform1f(U("uAW"), r.aw || 0.9); gl.uniform1f(U("uSpec"), r.spec || 0.9); gl.uniform1f(U("uAmb"), r.amb ?? 0.1); gl.uniform3fv(U("cShade"), r.colors.shade || [0, 0, 0]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, g.count);
      }
    };
  }

  window.Satin = { Silk, Ribbons };
})();
