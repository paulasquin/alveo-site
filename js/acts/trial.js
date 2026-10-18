// Act 3 — the decremental PEEP trial on the pixel grid: from PEEP 20 down to 5,
// each pixel loses compliance as overdistension (orange, above its own best PEEP)
// or as collapse (violet, below it); the scroll then comes back to the PEEP where
// the two curves cross. The OD/LC read-out comes from Alveo's own computation.
import * as THREE from 'three';
import { smooth, clamp01, easeInOut, lerp, frameOpposite } from '../kit/fx.js';
import { t as tr } from '../kit/i18n.js';
import { createGrid, breath, ventColor, STEPS, PEEPS, COSTA, COL, N, atStep, peepAt } from '../eit.js';
import { SIM } from '../data/sim.js';

const PANELS = 3;
const LAST = STEPS.length - 1;
/** Fractional step index of a PEEP (steps are in decreasing PEEP). */
const xOf = (peep) => {
  for (let k = 0; k < LAST; k++) if (peep <= PEEPS[k] && peep >= PEEPS[k + 1]) return k + (PEEPS[k] - peep) / (PEEPS[k] - PEEPS[k + 1]);
  return peep > PEEPS[0] ? 0 : LAST;
};
const X_BEST = xOf(SIM.odlc.best);
/** Global OD / LC (%) at a fractional step, interpolated between Alveo's values. */
const globalAt = (x, arr) => {
  const k = Math.max(0, Math.min(LAST, Math.floor(x))), f = clamp01(x - k);
  return arr[k] + (arr[Math.min(LAST, k + 1)] - arr[k]) * f;
};

export class TrialAct {
  constructor({ labels }) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 400);
    this.look = { bloom: 0.65, bloomRadius: 0.45, threshold: 0.75, exposure: 1, fade: 0, fadeColor: '#000000', vignette: 1 };
    this.progress = 0;
    this.labels = labels;
    const s = this.scene;
    s.background = new THREE.Color('#02040a');
    s.add(new THREE.HemisphereLight('#cfe8ff', '#05070d', 0.9));
    const key = new THREE.DirectionalLight('#ffffff', 1.3);
    key.position.set(-3, 6, 4);
    s.add(key);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: '#070b16' }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.002;
    s.add(floor);
    this.grid = createGrid({ cell: 0.1, maxH: 1.25 });
    s.add(this.grid);
    this.flat = this.grid.userData.idx.map(([i, j]) => i * N + j);
    this.tidal = STEPS.map((st) => st.tidal.flat().map((q) => q ?? 0)); // per step, flattened once
    this.lab = {
      ventral: labels.add(tr('trial.label.ventral'), new THREE.Vector3(0, 0.6, -1.15)),
      dorsal: labels.add(tr('trial.label.dorsal'), new THREE.Vector3(0, 0.4, 1.0), { side: 'left' }),
    };
    this.c = new THREE.Color();
    this.onStep = null; // callback({ peep, od, lc })
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 48 : 30;
    this.camera.updateProjectionMatrix();
    this.w = w; this.h = h;
  }

  setProgress(p) { this.progress = p; }
  leave() { this.labels.hideAll(); }

  /** Fractional step through the scroll: 20 -> 14, 14 -> 5, then back to the crossing. */
  stepAt(p) {
    const ph = (i) => clamp01(p * PANELS - i);
    if (p < 1 / PANELS) return lerp(0, 2, easeInOut(smooth(0.1, 0.9, ph(0))));
    if (p < 2 / PANELS) return lerp(2, LAST, easeInOut(smooth(0.1, 0.9, ph(1))));
    return lerp(LAST, X_BEST, easeInOut(smooth(0.05, 0.7, ph(2))));
  }

  update(dt, t) {
    const p = this.progress;
    this.look.fade = Math.max(1 - smooth(0, 0.06, p), smooth(0.95, 1, p));
    const x = this.stepAt(p);
    const b = breath(t);
    this.grid.userData.targets((i, j, k) => {
      const f = this.flat[k];
      const v = atStep(this.tidal, x, f);
      const od = atStep(COSTA.od, x, f), lc = atStep(COSTA.lc, x, f);
      ventColor(Math.min(1, v * 1.05 + 0.08), this.c);
      if (od > 0.08) this.c.lerp(COL.od, Math.min(1, od * 1.4));
      if (lc > 0.08) this.c.lerp(COL.lc, Math.min(1, lc * 1.4));
      return { h: v * (0.6 + 0.4 * b), c: this.c };
    });
    this.grid.userData.update(dt, 8);

    const peep = peepAt(x);
    this.onStep?.({ peep, od: globalAt(x, SIM.odlc.od), lc: globalAt(x, SIM.odlc.lc), best: p > 2.55 / PANELS });

    const e = easeInOut(clamp01(p));
    const az = lerp(0.55, -0.45, e) + Math.sin(t * 0.12) * 0.03;
    const el = lerp(0.62, 0.95, e);
    const dist = 5.9;
    this.camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
    this.camera.lookAt(0, 0.15, 0);
    frameOpposite(this.camera, p, [1, -1, 1], this.w, this.h, 0.21);
    const on = p > 0.05 && p < 0.93;
    this.labels.show(this.lab.ventral, on);
    this.labels.show(this.lab.dorsal, on);
    this.labels.update(this.camera, innerWidth, innerHeight);
  }
}
