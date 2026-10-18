// Alveo building blocks shared by the acts: the simulated trial (js/data/sim.js),
// the per-pixel overdistension / collapse of each step (Costa 2009), a particle lung,
// the 16-electrode belt and a 32 x 32 grid of pixel columns.
import * as THREE from 'three';
import { QUALITY, glowTexture, clamp01 } from './kit/fx.js';
import { SIM } from './data/sim.js';

export const N = SIM.N;
export const STEPS = SIM.steps;
export const PEEPS = STEPS.map((s) => s.peep);
export const BEST = SIM.odlc.best;

export const COL = {
  air: new THREE.Color('#6fd6ff'),
  airHi: new THREE.Color('#e9fbff'),
  deep: new THREE.Color('#123a8c'),
  od: new THREE.Color('#ff7a45'),
  lc: new THREE.Color('#b48cff'),
  dim: new THREE.Color('#1a2440'),
};

/** Breath phase in [0, 1]: quick inspiration, slower expiration (about 18 breaths a minute). */
export function breath(t, period = 3.4) {
  const ph = (t / period) % 1;
  return ph < 0.38 ? Math.sin((Math.PI / 2) * (ph / 0.38)) : Math.exp(-(ph - 0.38) * 5.2);
}

/**
 * Costa 2009 on the simulated trial: compliance of each pixel at each step
 * (tidal change / driving pressure), then for each step the share of the pixel's
 * best compliance it has lost — counted as overdistension above the PEEP of that
 * best compliance, as collapse below it.
 */
export const COSTA = (() => {
  const comp = STEPS.map((s) => s.tidal.map((row) => row.map((v) => (v == null ? null : v / (s.pplat - s.peep)))));
  const od = [], lc = [];
  STEPS.forEach((s, k) => {
    const o = [], l = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      if (!SIM.mask[i][j]) { o.push(0); l.push(0); continue; }
      let best = 0, at = 0;
      comp.forEach((c, m) => { if (c[i][j] > best) { best = c[i][j]; at = m; } });
      const loss = best > 0 ? clamp01((best - comp[k][i][j]) / best) : 0;
      o.push(PEEPS[k] > PEEPS[at] ? loss : 0);
      l.push(PEEPS[k] < PEEPS[at] ? loss : 0);
    }
    od.push(o); lc.push(l);
  });
  return { od, lc };
})();

/** Value of a per-step array at a fractional step index (0 = first, highest PEEP). */
export const atStep = (arrays, x, idx) => {
  const k = Math.max(0, Math.min(arrays.length - 1, Math.floor(x)));
  const f = Math.min(1, Math.max(0, x - k));
  const a = arrays[k][idx], b = arrays[Math.min(arrays.length - 1, k + 1)][idx];
  return a + (b - a) * f;
};
export const peepAt = (x) => {
  const k = Math.max(0, Math.min(PEEPS.length - 1, Math.floor(x)));
  const b = PEEPS[Math.min(PEEPS.length - 1, k + 1)];
  return PEEPS[k] + (b - PEEPS[k]) * Math.min(1, Math.max(0, x - k));
};

/* ------------------------------------------------------------------ lung */
/**
 * Particle lung of a supine patient: anterior up (+Y), head towards +Z. Seen from
 * the feet, as the monitor shows it, the patient's right lung is on the screen's left.
 * Each point carries its depth (0 ventral, 1 dorsal) and a ventilation weight.
 */
export function createLung({ count = 26000, size = 3.2 } = {}) {
  count = Math.round(count * Math.max(0.35, QUALITY.particles));
  const pos = new Float32Array(count * 3), aux = new Float32Array(count * 3);
  // Viewed from the feet (camera on -Z), screen right is -X: the patient's right lung sits at +X.
  const lobes = [
    { cx: 0.52, cy: 0, rx: 0.42, ry: 0.6, rz: 1.05 },
    { cx: -0.5, cy: -0.02, rx: 0.38, ry: 0.57, rz: 0.98 },
  ];
  let n = 0;
  while (n < count) {
    const L = lobes[Math.random() < 0.53 ? 0 : 1];
    const x = (Math.random() * 2 - 1), y = (Math.random() * 2 - 1), z = (Math.random() * 2 - 1);
    // Rounded lobe, narrower at the apex (+Z), flat towards the mediastinum.
    const taper = 1 - 0.35 * Math.max(0, z);
    if (Math.abs(x) ** 2.4 + Math.abs(y) ** 2.4 + Math.abs(z) ** 2.2 > 1) continue;
    const px = L.cx + x * L.rx * taper, py = L.cy + y * L.ry * taper, pz = z * L.rz;
    // The heart, front and left of the patient (screen right).
    if (((px + 0.28) / 0.34) ** 2 + ((py - 0.18) / 0.32) ** 2 + (pz / 0.45) ** 2 < 1) continue;
    pos.set([px, py, pz], n * 3);
    const depth = clamp01((0.6 - py) / 1.2);
    aux.set([depth, 0.55 + 0.45 * Math.random(), Math.random() * 100], n * 3);
    n++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aAux', new THREE.BufferAttribute(aux, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uBreath: { value: 0 }, uPR: { value: Math.min(devicePixelRatio, 2) },
      uSize: { value: size }, uScale: { value: 1 }, uOpacity: { value: 1 }, uSlice: { value: 0 }, uSliceW: { value: 0.07 },
      uAir: { value: COL.air }, uHi: { value: COL.airHi }, uDeep: { value: COL.deep },
    },
    vertexShader: /* glsl */`
      attribute vec3 aAux;
      uniform float uTime, uBreath, uPR, uSize, uScale, uSlice, uSliceW;
      varying float vVent, vSlice, vDepth;
      void main() {
        float depth = aAux.x;
        // Supine patient: the ventral lung takes more of the tidal volume.
        float vent = (1.0 - 0.55 * depth) * aAux.y;
        vec3 p = position;
        p.xy *= 1.0 + 0.07 * uBreath * vent;
        p.z += 0.05 * uBreath * vent * (p.z + 1.0);
        p += 0.004 * vec3(sin(uTime * 0.7 + aAux.z), cos(uTime * 0.9 + aAux.z * 1.3), sin(uTime * 0.5 + aAux.z * 0.7));
        vVent = vent;
        vDepth = depth;
        vSlice = 1.0 - smoothstep(uSliceW, uSliceW * 3.0, abs(position.z));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * uScale * uPR * (0.6 + 0.4 * aAux.y) / max(0.3, -mv.z) * 4.0;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uBreath, uOpacity, uSlice;
      uniform vec3 uAir, uHi, uDeep;
      varying float vVent, vSlice, vDepth;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.0, length(d));
        float glow = clamp(uBreath * vVent, 0.0, 1.0);
        vec3 c = mix(uDeep, uAir, 0.35 + 0.65 * glow);
        c = mix(c, uHi, glow * glow * 0.6);
        float keep = mix(1.0, 0.12 + 0.88 * vSlice, uSlice);
        c = mix(c, uHi, vSlice * uSlice * 0.5);
        gl_FragColor = vec4(c * (0.55 + 0.9 * glow), a * uOpacity * keep * 0.55);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.userData.u = mat.uniforms;
  return pts;
}

/* ------------------------------------------------------------------ belt */
/**
 * The electrode belt around the chest at z = 0: an elliptic band, 16 electrodes
 * numbered counter-clockwise from the sternum, and the current of the injecting
 * pair drawn as moving dots between them.
 */
export function createBelt({ rx = 1.2, ry = 0.95 } = {}) {
  const g = new THREE.Group();
  const curve = new THREE.EllipseCurve(0, 0, rx, ry, 0, Math.PI * 2);
  const pts = curve.getPoints(160).map((p) => new THREE.Vector3(p.x, p.y, 0));
  const band = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#6fd6ff', transparent: true, opacity: 0.45 }));
  g.add(band);
  const tex = glowTexture();
  const els = [];
  for (let e = 0; e < 16; e++) {
    const a = Math.PI / 2 + (e + 0.5) / 16 * Math.PI * 2;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#bfeaff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(Math.cos(a) * rx, Math.sin(a) * ry, 0);
    s.scale.setScalar(0.12);
    g.add(s);
    els.push({ sprite: s, a });
  }
  // Current between the injecting pair: dots along a bowed path through the chest.
  const NC = 90;
  const cur = new Float32Array(NC * 3);
  const cgeo = new THREE.BufferGeometry();
  cgeo.setAttribute('position', new THREE.BufferAttribute(cur, 3));
  const cmat = new THREE.PointsMaterial({ map: tex, color: '#ffe3a8', size: 0.05, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 });
  const current = new THREE.Points(cgeo, cmat);
  current.frustumCulled = false;
  g.add(current);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), M = new THREE.Vector3();
  g.userData = {
    els, band, current,
    /** inj: injecting pair index (0-15), t: time, on: 0-1 visibility */
    update(t, inj, on = 1) {
      band.material.opacity = 0.45 * on;
      els.forEach((el, i) => {
        const lit = i === inj || i === (inj + 1) % 16;
        el.sprite.material.opacity = on * (lit ? 1 : 0.55);
        el.sprite.material.color.set(lit ? '#ffe3a8' : '#bfeaff');
        el.sprite.scale.setScalar(lit ? 0.2 : 0.12);
      });
      A.copy(els[inj].sprite.position); B.copy(els[(inj + 1) % 16].sprite.position);
      M.copy(A).add(B).multiplyScalar(0.5).multiplyScalar(0.25);
      for (let k = 0; k < NC; k++) {
        const f = (k / NC + t * 0.9) % 1, lane = (k % 9) / 8 - 0.5;
        const q = new THREE.Vector3().copy(A).lerp(B, f);
        const bow = Math.sin(Math.PI * f);
        q.lerp(M, bow * (0.35 + lane * 0.5));
        cur.set([q.x, q.y, 0.002], k * 3);
      }
      cgeo.attributes.position.needsUpdate = true;
      cmat.opacity = 0.9 * on;
    },
  };
  return g;
}

/* ------------------------------------------------------------------ grid */
/**
 * 32 x 32 pixel columns (instanced), ventral at the back (-Z) so that looking down
 * from the front reads like the monitor. set(heights, colors) eases towards targets.
 */
export function createGrid({ cell = 0.1, gap = 0.012, maxH = 1.4 } = {}) {
  const idx = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (SIM.mask[i][j]) idx.push([i, j]);
  const geo = new THREE.BoxGeometry(cell - gap, 1, cell - gap);
  geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1, emissive: '#ffffff', emissiveIntensity: 0.0 });
  mat.onBeforeCompile = (sh) => {
    // Emissive follows the instance colour, so the bloom picks up bright pixels only.
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance = vColor.rgb * 0.55;');
  };
  const mesh = new THREE.InstancedMesh(geo, mat, idx.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const h = new Float32Array(idx.length), ht = new Float32Array(idx.length);
  const col = idx.map(() => new THREE.Color('#000')), colT = idx.map(() => new THREE.Color('#000'));
  const m4 = new THREE.Matrix4();
  const off = (N - 1) / 2;
  mesh.userData = {
    idx, cell,
    flatIndex: (k) => idx[k][0] * N + idx[k][1],
    targets(fn) { idx.forEach(([i, j], k) => { const r = fn(i, j, k); ht[k] = r.h; colT[k].copy(r.c); }); },
    update(dt, rate = 6) {
      const a = 1 - Math.exp(-rate * dt);
      idx.forEach(([i, j], k) => {
        h[k] += (ht[k] - h[k]) * a;
        col[k].lerp(colT[k], a);
        m4.makeScale(1, Math.max(0.002, h[k] * maxH), 1).setPosition((j - off) * cell, 0, (i - off) * cell);
        mesh.setMatrixAt(k, m4);
        mesh.setColorAt(k, col[k]);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
  };
  mesh.frustumCulled = false;
  return mesh;
}

/** Ventilation colour of a tidal value (0-1): dark blue -> blue -> white, like the bedside monitor. */
export function ventColor(v, out = new THREE.Color()) {
  v = clamp01(v);
  if (v < 0.55) return out.copy(COL.dim).lerp(COL.deep, v / 0.55);
  if (v < 0.85) return out.copy(COL.deep).lerp(COL.air, (v - 0.55) / 0.3);
  return out.copy(COL.air).lerp(COL.airHi, (v - 0.85) / 0.15);
}

/** Colour of a best-PEEP level, from low (ventral) to high (dorsal). */
const LEVEL = ['#2f6bff', '#29a7ff', '#6fd6ff', '#9be7c4', '#ffd36b', '#ff8a4c'].map((c) => new THREE.Color(c));
export function levelColor(peep, out = new THREE.Color()) {
  const order = [...PEEPS].sort((a, b) => a - b);
  const k = Math.max(0, order.indexOf(peep));
  return out.copy(LEVEL[Math.min(LEVEL.length - 1, k)]);
}
export const LEVEL_CSS = LEVEL.map((c) => `#${c.getHexString()}`);
