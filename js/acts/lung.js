// Act 1 — hero: a particle lung breathes; the electrode belt lights up and the
// current turns around it; the camera comes down to the axial slice, where the
// impedance image appears (the bridge to the reconstruction act).
import * as THREE from 'three';
import { createStars, smooth, clamp01, easeInOut, lerp, frameOpposite } from '../kit/fx.js';
import { t as tr } from '../kit/i18n.js';
import { createLung, createBelt, breath, STEPS, N, ventColor } from '../eit.js';
import { SIM } from '../data/sim.js';

const PANELS = 3; // hero, belt, slice

/** The tidal image of the step closest to the optimal PEEP, as a texture for the slice. */
function sliceTexture() {
  const step = STEPS.reduce((b, s) => (Math.abs(s.peep - SIM.odlc.best) < Math.abs(b.peep - SIM.odlc.best) ? s : b));
  const top = Math.max(...step.tidal.flat().filter((v) => v != null));
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const img = g.createImageData(N, N);
  const col = new THREE.Color();
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const v = step.tidal[i][j];
    const k = (i * N + j) * 4;
    if (v == null || !SIM.mask[i][j]) { img.data[k + 3] = 0; continue; }
    ventColor(0.45 + 0.55 * (v / top), col);
    img.data.set([col.r * 255, col.g * 255, col.b * 255, 255], k);
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export class LungAct {
  constructor({ labels }) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.05, 400);
    this.look = { bloom: 0.75, bloomRadius: 0.5, threshold: 0.6, exposure: 1, fade: 1, fadeColor: '#000000', vignette: 1 };
    this.progress = 0;
    this.labels = labels;
    const s = this.scene;
    s.background = new THREE.Color('#02040a');
    this.dust = createStars(1800, 60);
    s.add(this.dust);

    // Supine patient seen from the foot of the bed: anterior up, head away from the camera.
    this.body = new THREE.Group();
    s.add(this.body);
    this.lung = createLung();
    this.body.add(this.lung);
    this.belt = createBelt();
    this.body.add(this.belt);

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), new THREE.MeshBasicMaterial({ map: sliceTexture(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    plane.position.z = 0.001;
    plane.scale.x = -1; // seen from the feet: the image's left column on the screen's left
    this.slice = plane;
    this.body.add(plane);

    this.lab = {
      belt: labels.add(tr('lung.label.belt'), new THREE.Vector3(1.2, 0, 0), { object: this.belt }),
      inj: labels.add(tr('lung.label.inj'), new THREE.Vector3(0, 0.95, 0), { object: this.belt, side: 'left' }),
      slice: labels.add(tr('lung.label.slice'), new THREE.Vector3(-0.6, -0.3, 0), { object: this.body, side: 'left' }),
    };
    this.cam = new THREE.Vector3();
    this.target = new THREE.Vector3();
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 52 : 34;
    this.camera.updateProjectionMatrix();
    this.w = w; this.h = h;
    // Point sizes are in pixels: scale them with the viewport so a phone does not
    // get a cloud twice as dense (and, additive, washed out to white).
    this.lung.userData.u.uScale.value = Math.min(1, Math.min(w, h) / 900);
    this.portrait = w < h;
  }

  setProgress(p) { this.progress = p; }
  leave() { this.labels.hideAll(); }

  update(dt, t) {
    this.t0 ??= performance.now();
    const it = Math.min(1, (performance.now() - this.t0) / 4200);
    const p = this.progress;
    const ph = (i) => clamp01(p * PANELS - i);
    this.look.fade = Math.max(1 - smooth(0, 0.35, it), smooth(0.93, 1, p));
    this.look.fadeColor = '#000000';

    const b = breath(t);
    const u = this.lung.userData.u;
    u.uTime.value = t;
    u.uBreath.value = b * smooth(0.15, 0.6, it);
    u.uOpacity.value = smooth(0.05, 0.5, it) * (this.portrait ? 0.7 : 1);
    // The slice: other particles dim, the image of the slice appears.
    const sl = smooth(0.15, 0.7, ph(2));
    u.uSlice.value = sl;
    this.slice.material.opacity = sl * (0.75 + 0.25 * b);

    // The belt comes in with panel 1; the injecting pair turns around the chest.
    const beltOn = smooth(0.1, 0.6, ph(1)) * (1 - 0.6 * sl);
    const inj = Math.floor(t * 6) % 16;
    this.belt.userData.update(t, inj, beltOn);
    this.belt.visible = beltOn > 0.01;
    this.dust.userData.update(t);

    // Camera: from the foot of the bed, three-quarter and above -> straight along
    // the body axis, onto the slice (the view of the bedside monitor).
    const e = easeInOut(clamp01(p));
    const az = lerp(0.85, 0, easeInOut(smooth(0.3, 0.95, p))) + Math.sin(t * 0.08) * 0.04 * (1 - sl);
    const el = lerp(0.5, 0.02, easeInOut(smooth(0.3, 0.95, p)));
    const dist = lerp(5.6, 3.9, e) + (1 - easeInOut(smooth(0, 0.6, it))) * 1.5;
    this.cam.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, -Math.cos(az) * Math.cos(el) * dist);
    this.camera.position.copy(this.cam);
    this.camera.lookAt(this.target);
    frameOpposite(this.camera, p, [0, 1, -1], this.w, this.h, 0.17);

    this.labels.show(this.lab.belt, ph(1) > 0.3 && ph(1) < 0.95);
    this.labels.show(this.lab.inj, ph(1) > 0.45 && ph(1) < 0.95);
    this.labels.show(this.lab.slice, ph(2) > 0.5 && p < 0.92);
    this.labels.update(this.camera, innerWidth, innerHeight);
  }
}
