// Act 4 — the per-pixel best PEEP: each pixel column rises to the PEEP at which
// that region of lung is best ventilated (Costa 2009, model C); low in the ventral
// lung, high in the dorsal lung. Slow turntable, then the view from above.
import * as THREE from 'three';
import { smooth, clamp01, easeInOut, lerp, frameOpposite, createStars } from '../kit/fx.js';
import { t as tr } from '../kit/i18n.js';
import { createGrid, levelColor } from '../eit.js';
import { SIM } from '../data/sim.js';

const PANELS = 2;

export class MapAct {
  constructor({ labels }) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 400);
    this.look = { bloom: 0.32, bloomRadius: 0.4, threshold: 0.92, exposure: 1, fade: 0, fadeColor: '#000000', vignette: 1 };
    this.progress = 0;
    this.labels = labels;
    const s = this.scene;
    s.background = new THREE.Color('#02040a');
    this.dust = createStars(900, 40);
    s.add(this.dust);
    s.add(new THREE.HemisphereLight('#d9ecff', '#05070d', 1.0));
    const key = new THREE.DirectionalLight('#ffffff', 1.4);
    key.position.set(3, 7, 2);
    s.add(key);
    this.grid = createGrid({ cell: 0.1, maxH: 1.3 });
    s.add(this.grid);
    this.lab = {
      low: labels.add(tr('map.label.low'), new THREE.Vector3(-0.5, 0.3, -1.0)),
      high: labels.add(tr('map.label.high'), new THREE.Vector3(0.6, 1.3, 0.9), { side: 'left' }),
    };
    this.c = new THREE.Color();
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 48 : 30;
    this.camera.updateProjectionMatrix();
    this.w = w; this.h = h;
  }

  setProgress(p) { this.progress = p; }
  leave() { this.labels.hideAll(); }

  update(dt, t) {
    const p = this.progress;
    const ph = (i) => clamp01(p * PANELS - i);
    this.look.fade = Math.max(1 - smooth(0, 0.08, p), smooth(0.95, 1, p));
    const rise = easeInOut(smooth(0.05, 0.7, ph(0)));
    // A wave from the ventral to the dorsal rows as the columns rise.
    this.grid.userData.targets((i, j) => {
      const v = SIM.map[i][j];
      const lvl = v == null || v <= 0 ? 0 : v;
      const r = clamp01(rise * 1.6 - (i / 32) * 0.6);
      return { h: ((lvl - 2) / 20) * r, c: levelColor(lvl, this.c).multiplyScalar(0.3 + 0.45 * r) };
    });
    this.grid.userData.update(dt, 5);
    this.dust.userData.update(t);

    const az = 0.6 + t * 0.06 + p * 1.2;
    const el = lerp(0.45, 0.95, easeInOut(smooth(0.3, 1, p)));
    const dist = lerp(6.6, 6.4, easeInOut(clamp01(p)));
    this.camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
    this.camera.lookAt(0, 0.35, 0);
    frameOpposite(this.camera, p, [-1, 1], this.w, this.h, 0.21);
    const on = rise > 0.6 && p < 0.93;
    this.labels.show(this.lab.low, on);
    this.labels.show(this.lab.high, on);
    this.labels.update(this.camera, innerWidth, innerHeight);
  }
}
