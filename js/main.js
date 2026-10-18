// Alveo page wiring: strings, plain sections, the four acts and their read-outs, boot.
import { registerStrings, applyStatic, nf, t } from './kit/i18n.js';
import { STRINGS } from './strings.js';
import {
  $, $$, capture, debug, setupAnchors, webglOK, setupStage, bindActs, setupPanels, setupReveals,
  setupNav, setupLightbox, finishBoot,
} from './kit/page.js';
import { renderTimeline, renderJournal, renderStats, renderTiles } from './kit/render.js';
import { TIMELINE, ENTRIES, STATS, TILES, CHARTS } from './content.js';
import { SIM } from './data/sim.js';
import { LEVEL_CSS, PEEPS } from './eit.js';

registerStrings(STRINGS);

function renderSimNumbers() {
  $$('.sim-best').forEach((e) => { e.textContent = nf(SIM.odlc.best, 1); });
  $$('.sim-value').forEach((e) => { e.textContent = nf(SIM.odlc.value, 1); });
  const levels = [...PEEPS].sort((a, b) => a - b);
  $('#map-legend').innerHTML = `<span class="legend-title">${t('legend.title')}</span>` +
    levels.map((p, k) => `<span class="legend-item"><i style="background:${LEVEL_CSS[k]}"></i>${p}</span>`).join('');
}

/** Trial read-out in every card of the act: PEEP, overdistension, collapse. */
function trialReadout({ peep, od, lc }) {
  $$('#essai .ro-peep').forEach((e) => { e.textContent = nf(peep, 1); });
  $$('#essai .ro-odv').forEach((e) => { e.textContent = nf(od, 1); });
  $$('#essai .ro-lcv').forEach((e) => { e.textContent = nf(lc, 1); });
}

async function boot() {
  applyStatic();
  setupAnchors();
  renderTimeline($('#timeline'), TIMELINE);
  renderJournal($('#journal-list'), ENTRIES, { charts: CHARTS });
  renderStats($('#stats'), STATS);
  renderTiles($('#tiles'), TILES);
  renderSimNumbers();
  setupLightbox();
  setupNav();

  // The loader is a lung forming from particles (js/loader.js): no gauge, no number.
  const onProgress = (f) => window.__lungLoader?.set(f);
  let bundle = null;
  if (webglOK()) {
    try {
      bundle = await setupStage(async ({ labelsFor }) => {
        const [{ LungAct }, { ReconAct }, { TrialAct }, { MapAct }] = await Promise.all([
          import('./acts/lung.js'), import('./acts/recon.js'), import('./acts/trial.js'), import('./acts/map.js'),
        ]);
        const acts = {
          lung: new LungAct({ labels: labelsFor() }),
          recon: new ReconAct({ labels: labelsFor() }),
          trial: new TrialAct({ labels: labelsFor() }),
          map: new MapAct({ labels: labelsFor() }),
        };
        let kept = -1;
        acts.recon.onCount = (n) => { if (n !== kept) { kept = n; $('#kept').textContent = n; } };
        acts.trial.onStep = trialReadout;
        return acts;
      }, onProgress);
    } catch (e) { console.error('3D stage disabled:', e); }
  }
  if (!bundle) document.body.classList.add('no-webgl');
  onProgress(1);
  setupPanels();
  setupReveals();
  if (bundle) bindActs(bundle);
  if (debug || capture) window.__kit = bundle;
  // Let the lung finish forming before the page shows (at most 2.5 s).
  await Promise.race([window.__lungLoader?.formed, new Promise((r) => setTimeout(r, 2500))]);
  await finishBoot();
  window.__lungLoader?.stop();
}

boot();
