# Alveo — site

Showcase page of Alveo (private repository `paulasquin/alveo`), the electrical impedance tomography tool that computes overdistension, collapse and the optimal PEEP of a decremental PEEP trial (Costa et al., 2009). Published at **https://alveo.aidiligence.eu** (GitHub Pages, edited by Guardia SAS).

Built from the private template `paulasquin/showcase-kit`: its recipe, act contract, testing routine and pitfalls are in [docs/showcase-kit.md](docs/showcase-kit.md). Static site, no build step.

```bash
python3 -m http.server 8791      # http://localhost:8791 — ?lang=en forces English, ?debug exposes window.__kit
```

## No patient data

Every image, curve and number drawn on the page comes from a **simulated** lung (`tools/build_sim.py` → `js/data/sim.js`): 32 × 32 pixels, dorsal regions that collapse at low PEEP, ventral regions that overdistend at high PEEP, constant tidal volume. Overdistension, collapse, the crossing and the per-pixel map are computed by Alveo itself (`alveo.analysis.odlc.compute_odlc`):

```bash
uv run --project ~/code/guardia/alveo python tools/build_sim.py
```

The validation figures quoted on the page (4 visits identical to the reference pipeline, correlation 0.91–0.92 with the Dräger software) are aggregates from Alveo's tests and release notes; no recording, image, study, hospital or clinician is shown or named.

## Layout

```
index.html          the page (French; English in js/strings.js `static`)
js/main.js          wiring: content, acts, read-outs
js/eit.js           shared 3D pieces: particle lung, electrode belt, pixel-column grid, Costa per pixel
js/acts/            lung (hero), recon (208 measurements -> image), trial (PEEP 20 -> 5), map (best PEEP per pixel)
js/content*.js      workflow, method charts, validation, features (FR / EN)
js/kit/             shared code from showcase-kit — fix there first, then port
tools/build_sim.py  the simulated trial
modal/gpu_probe.py  real-GPU check on an ephemeral Modal machine
```

## Publish

GitHub Pages on `main` at `/`, `CNAME` = `alveo.aidiligence.eu`, OVH record `alveo CNAME paulasquin.github.io.` in the `aidiligence.eu` zone. Legal notice and contact are Guardia's (aidiligence.eu/legal, contact@aidiligence.eu).
