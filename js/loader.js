// Loader: a lung that forms from particles (canvas 2D, no number, no text), then
// breathes until the page is ready. Plain script, run as soon as the markup is
// parsed, before the 3D stage loads. main.js drives it through window.__lungLoader:
// set(f) for the load progress, formed (a promise) before the loader is hidden.
(function () {
  var cv = document.getElementById('loader-lung');
  if (!cv) return;
  var g = cv.getContext('2d');
  var S = 240, dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = cv.height = S * dpr;
  cv.style.width = cv.style.height = S + 'px';
  g.scale(dpr, dpr);
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.matchMedia && matchMedia('(max-width: 860px)').matches;
  var N = small ? 800 : 1400;

  // Seeded random, so the lung is the same on every visit.
  var seed = 2809;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  // Targets: two lobes seen from the front (the patient's right lung, larger, on
  // the screen's left), the heart notch on the left lung, a trachea and two bronchi.
  function inLobe(x, y, cx, cy, rx, ry) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry;
    var taper = 1 - 0.32 * Math.max(0, -dy); // narrower towards the apex
    dx /= taper;
    return Math.pow(Math.abs(dx), 2.3) + Math.pow(Math.abs(dy), 2.1) <= 1;
  }
  var pts = [], tries = 0;
  while (pts.length < N * 0.8 && tries < 200000) {
    tries++;
    var x = rnd() * 2 - 1, y = rnd() * 2 - 1, lobe = 0;
    if (inLobe(x, y, -0.4, 0.12, 0.34, 0.68)) lobe = -1;
    else if (inLobe(x, y, 0.4, 0.15, 0.31, 0.64)) lobe = 1;
    if (!lobe) continue;
    if (lobe === 1 && Math.pow((x - 0.24) / 0.2, 2) + Math.pow((y - 0.42) / 0.26, 2) < 1) continue; // heart notch
    pts.push({ x: x, y: y, b: 0.5 + 0.5 * rnd() });
  }
  function branch(x0, y0, x1, y1, n) {
    for (var k = 0; k < n; k++) {
      var f = rnd();
      pts.push({ x: x0 + (x1 - x0) * f + (rnd() - 0.5) * 0.02, y: y0 + (y1 - y0) * f + (rnd() - 0.5) * 0.02, b: 1 });
    }
  }
  var nb = N - pts.length;
  branch(0, -0.92, 0, -0.5, Math.round(nb * 0.4));      // trachea
  branch(0, -0.5, -0.24, -0.3, Math.round(nb * 0.3));   // right main bronchus
  branch(0, -0.5, 0.22, -0.28, nb - Math.round(nb * 0.7)); // left main bronchus

  // Start: scattered on a wide ring, each particle with its own delay.
  pts.forEach(function (p) {
    var a = rnd() * Math.PI * 2, r = 1.6 + rnd() * 0.9;
    p.sx = Math.cos(a) * r; p.sy = Math.sin(a) * r;
    p.d = rnd() * 0.45; p.s = 0.6 + rnd() * 1.1; p.w = rnd() * 6.28;
  });

  // The clock starts at the first painted frame: if the main thread is busy loading
  // the 3D stage, the lung still forms in front of the visitor instead of popping in.
  var progress = 0, t0 = null, FORM = 1500, done = false, resolveFormed;
  var formed = new Promise(function (r) { resolveFormed = r; });
  var ease = function (x) { return x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3); };

  function frame(now) {
    if (done) return;
    if (t0 === null) t0 = now;
    var el = reduced ? 1 : Math.min(1, (now - t0) / FORM);
    var breath = 0.5 - 0.5 * Math.cos(((now - t0) / 3400) * Math.PI * 2);
    g.clearRect(0, 0, S, S);
    g.globalCompositeOperation = 'lighter';
    var c = S / 2, R = S * 0.42;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var k = ease((el - p.d) / (1 - p.d));
      var swell = 1 + 0.035 * breath * (p.b < 1 ? 1 : 0.3);
      var x = p.sx + (p.x * swell - p.sx) * k + (1 - k) * 0.05 * Math.sin(now / 600 + p.w);
      var y = p.sy + (p.y * swell - p.sy) * k + (1 - k) * 0.05 * Math.cos(now / 700 + p.w);
      var glow = 0.35 + 0.45 * p.b * (0.6 + 0.4 * breath) + 0.2 * progress;
      g.fillStyle = 'rgba(' + Math.round(111 + 120 * k * p.b * breath) + ',' + Math.round(214 + 30 * k * breath) + ',255,' + (glow * (0.25 + 0.75 * k)).toFixed(3) + ')';
      g.beginPath();
      g.arc(c + x * R, c + y * R, p.s * (0.7 + 0.3 * k), 0, 6.283);
      g.fill();
    }
    if (el >= 1 && resolveFormed) { resolveFormed(); resolveFormed = null; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.__lungLoader = {
    set: function (f) { progress = Math.max(progress, Math.min(1, f || 0)); },
    formed: formed,
    stop: function () { setTimeout(function () { done = true; }, 1200); },
  };
})();
