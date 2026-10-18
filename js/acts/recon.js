// Act 2 — reconstruction: the 208 measurements of one frame stand around the
// image (16 injections x 13 voltages), particles carry them into the 32 x 32
// pixels, the tidal image rises; then the fragile measurements (a reference voltage
// close to zero) drop out and the stripes they caused fade.
import * as THREE from 'three';
import { smooth, clamp01, easeInOut, lerp, frameOpposite, glowTexture, QUALITY } from '../kit/fx.js';
import { t as tr } from '../kit/i18n.js';
import { createGrid, breath, ventColor, STEPS, N, COL } from '../eit.js';
import { SIM } from '../data/sim.js';

const PANELS = 3;
const R = 2.25; // ring radius
const BEST_STEP = STEPS.reduce((b, s) => (Math.abs(s.peep - SIM.odlc.best) < Math.abs(b.peep - SIM.odlc.best) ? s : b));
/** The 12 measurements with a reference near zero: the middle voltage of 12 injections. */
const WEAK = new Set([0, 1, 2, 4, 5, 7, 8, 10, 11, 12, 13, 15].map((inj) => inj * 13 + 6));

export class ReconAct {
  constructor({ labels }) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.05, 400);
    this.look = { bloom: 0.42, bloomRadius: 0.4, threshold: 0.9, exposure: 1, fade: 0, fadeColor: '#000000', vignette: 1 };
    this.progress = 0;
    this.labels = labels;
    const s = this.scene;
    s.background = new THREE.Color('#02040a');
    s.add(new THREE.HemisphereLight('#bfe4ff', '#05070d', 0.9));
    const key = new THREE.DirectionalLight('#ffffff', 1.2);
    key.position.set(2, 6, 4);
    s.add(key);

    // The 208 measurement bars, radial, standing on the ring.
    const bar = new THREE.BoxGeometry(0.035, 1, 0.035);
    bar.translate(0, 0.5, 0);
    this.bars = new THREE.InstancedMesh(bar, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true }), 208);
    this.bars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.amp = new Float32Array(208);
    this.angle = new Float32Array(208);
    for (let k = 0; k < 208; k++) {
      const m = k % 13;
      this.amp[k] = 0.18 + 0.82 * ((m - 6) / 6) ** 2; // large next to the injecting pair, small opposite
      this.angle[k] = Math.PI / 2 + (k + 0.5) / 208 * Math.PI * 2;
    }
    this.bars.frustumCulled = false;
    s.add(this.bars);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.006, 6, 200), new THREE.MeshBasicMaterial({ color: '#6fd6ff', transparent: true, opacity: 0.5 }));
    ring.rotation.x = Math.PI / 2;
    s.add(ring);
    this.ring = ring;

    // The pixels.
    this.grid = createGrid({ cell: 0.1, maxH: 1.7 });
    s.add(this.grid);
    this.cells = this.grid.userData.idx;

    // Particles: from a measurement bar into a pixel, along a low arc.
    const n = Math.round(5200 * Math.max(0.4, QUALITY.particles));
    const from = new Float32Array(n * 3), to = new Float32Array(n * 3), seed = new Float32Array(n);
    const off = (N - 1) / 2;
    for (let q = 0; q < n; q++) {
      const k = (Math.random() * 208) | 0, a = this.angle[k];
      from.set([Math.cos(a) * R, 0.25 + Math.random() * 0.5, -Math.sin(a) * R], q * 3);
      const [i, j] = this.cells[(Math.random() * this.cells.length) | 0];
      to.set([(j - off) * 0.1, 0.05, (i - off) * 0.1], q * 3);
      seed[q] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(from, 3));
    g.setAttribute('aTo', new THREE.BufferAttribute(to, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.flow = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uPR: { value: Math.min(devicePixelRatio, 2) }, uMap: { value: glowTexture() }, uCol: { value: COL.air } },
      vertexShader: /* glsl */`
        attribute vec3 aTo; attribute float aSeed;
        uniform float uTime, uPR;
        varying float vA;
        void main() {
          float f = fract(uTime * 0.35 + aSeed);
          vec3 p = mix(position, aTo, f);
          p.y += sin(3.14159 * f) * 0.6;
          vA = sin(3.14159 * f);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = 9.0 * uPR / max(0.3, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap; uniform float uOn; uniform vec3 uCol;
        varying float vA;
        void main() { vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(uCol * 1.6, t.a * vA * uOn); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.flow.frustumCulled = false;
    s.add(this.flow);

    this.lab = {
      bars: labels.add(tr('recon.label.bars'), new THREE.Vector3(-R, 0.9, 0)),
      tidal: labels.add(tr('recon.label.tidal'), new THREE.Vector3(0.6, 0.9, -0.4), { side: 'left' }),
      weak: labels.add(tr('recon.label.weak'), new THREE.Vector3(0, 0.4, R)),
    };
    this.m4 = new THREE.Matrix4();
    this.c = new THREE.Color();
    this.tmpCol = new THREE.Color();
    this.onCount = null; // callback(measurements kept)
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 50 : 32;
    this.camera.updateProjectionMatrix();
    this.w = w; this.h = h;
  }

  setProgress(p) { this.progress = p; }
  leave() { this.labels.hideAll(); }

  update(dt, t) {
    const p = this.progress;
    const ph = (i) => clamp01(p * PANELS - i);
    this.look.fade = Math.max(1 - smooth(0, 0.08, p), smooth(0.94, 1, p));
    const b = breath(t);
    const inj = Math.floor(t * 6) % 16;

    // Bars: grow in, the injecting sector glows; in panel 3 the weak ones turn
    // violet and fall.
    const grow = easeInOut(smooth(0.02, 0.35, ph(0)));
    const drop = smooth(0.15, 0.6, ph(2));
    for (let k = 0; k < 208; k++) {
      const a = this.angle[k], sector = (k / 13) | 0, weak = WEAK.has(k);
      let h = this.amp[k] * (0.92 + 0.08 * b) * 0.55 * grow;
      let y = 0;
      if (weak && drop > 0) { y = -1.4 * drop * drop; h *= 1 - 0.5 * drop; }
      this.m4.makeRotationY(a).setPosition(Math.cos(a) * R, y, -Math.sin(a) * R);
      this.m4.scale(new THREE.Vector3(1, Math.max(0.001, h), 1));
      this.bars.setMatrixAt(k, this.m4);
      const lit = sector === inj || sector === (inj + 1) % 16;
      this.c.copy(lit ? COL.airHi : COL.air).multiplyScalar(lit ? 0.7 : 0.4);
      if (weak && ph(2) > 0.05) this.c.copy(COL.lc).multiplyScalar(1.1);
      this.bars.setColorAt(k, this.c);
    }
    this.bars.instanceMatrix.needsUpdate = true;
    this.bars.instanceColor.needsUpdate = true;
    this.onCount?.(208 - Math.round(12 * smooth(0.3, 0.6, ph(2))));

    // Particles carry the measurements into the pixels (panel 1, then thin out).
    this.flow.material.uniforms.uTime.value = t;
    this.flow.material.uniforms.uOn.value = smooth(0.15, 0.5, ph(0)) * (1 - 0.8 * smooth(0.2, 0.8, ph(1)));

    // Pixels: the tidal image rises (panel 2), breathing; before the clean-up
    // (panel 3), a diagonal stripe pattern sits over it, then fades.
    const rise = easeInOut(smooth(0.3, 1, ph(0)) * 0.4 + smooth(0, 0.6, ph(1)) * 0.6);
    const stripes = (1 - smooth(0.35, 0.8, ph(2))) * smooth(0.0, 0.4, ph(0));
    this.grid.userData.targets((i, j) => {
      const v = BEST_STEP.tidal[i][j] ?? 0;
      const art = 0.55 * Math.sin((i + j) * 0.55 + 0.6) * stripes;
      const h = Math.max(0, (v * (0.55 + 0.45 * b) + art) * rise);
      ventColor(Math.min(1, h * 1.1 + 0.1), this.tmpCol);
      if (art < -0.15) this.tmpCol.lerp(COL.lc, Math.min(1, -art));
      return { h, c: this.tmpCol };
    });
    this.grid.userData.update(dt, 10);
    this.ring.material.opacity = 0.5 * grow;

    // Camera: low and wide on the ring, then up over the image, then round to
    // the weak side.
    const e = easeInOut(clamp01(p));
    const az = lerp(-0.5, 0.35, e) + Math.sin(t * 0.1) * 0.03;
    const el = lerp(0.32, 0.9, easeInOut(smooth(0.25, 0.75, p)));
    const dist = lerp(9.2, 7.4, e);
    this.camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
    this.camera.lookAt(0, 0.25, 0);
    frameOpposite(this.camera, p, [-1, 1, -1], this.w, this.h, 0.17);

    this.labels.show(this.lab.bars, ph(0) > 0.35 && ph(0) < 0.95);
    this.labels.show(this.lab.tidal, ph(1) > 0.3 && ph(1) < 0.95);
    this.labels.show(this.lab.weak, ph(2) > 0.25 && p < 0.93);
    this.labels.update(this.camera, innerWidth, innerHeight);
  }
}
