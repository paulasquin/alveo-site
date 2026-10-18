// English content — same order and ids as content.js.
import { nf } from './kit/i18n.js';
import { SIM } from './data/sim.js';

export const TIMELINE_EN = [
  { date: '1 · Data', title: 'Load the trial', text: 'The monitor’s .eit files, fifteen or so at once, sent in small chunks; or the PulmoVista 500 .asc exports, one per step.' },
  { date: '2 · Cycles', title: 'Choose the breaths', text: 'The impedance of the whole trial, recordings end to end, a one-minute zoom; a click in a cycle gives its three images.' },
  { date: '3 · Steps', title: 'Build the steps', text: 'Up to fifteen cycles averaged per step, PEEP and Pplat read from the file, the base image, the patient and visit identifiers.' },
  { date: '4 · ODLC', title: 'Compute', text: 'Overdistension and collapse at each step, the compliance model by default, the optimal PEEP where the curves cross.' },
  { date: '5 · Maps', title: 'Read the maps', text: 'Optimal PEEP per pixel, lung mask, overdistension and collapse at any intermediate PEEP.' },
  { date: '6 · Exports', title: 'Keep a record', text: 'A workbook per step, a visit workbook (xlsx or csv) and the PDF report, also shown on screen.' },
];

export const ENTRIES_EN = {
  essai: {
    date: 'Simulated data', year: 'Cycles',
    title: 'See the whole trial before choosing',
    question: 'Which breaths should each step keep?',
    body: [
      'The recordings are laid end to end: the PEEP descent reads at a glance, step after step, and the end-expiratory impedance falls with it.',
      'A click in the curve brings the selector to that cycle. There, Alveo reads the PEEP and plateau pressure sent by the ventilator and recorded in the file.',
    ],
    result: 'Six 40-second steps, from PEEP 20 down to 5 cmH₂O.',
  },
  pixels: {
    date: 'Simulated data', year: 'Compliance',
    title: 'Every pixel has its own best PEEP',
    question: 'Why reason pixel by pixel?',
    body: [
      'The compliance of a pixel is its impedance change divided by the driving pressure. As PEEP increases, it rises, reaches a maximum, then falls.',
      'A ventral pixel peaks at a low PEEP; a dorsal pixel needs a higher one to stay open. No single PEEP is best for every pixel at once: a compromise is needed.',
    ],
    result: 'Compliance of two pixels, each relative to its own maximum.',
  },
  odlc: {
    date: 'Simulated data', year: 'ODLC',
    title: 'Two curves that cross',
    question: 'Where should the compromise sit?',
    body: [
      'At each step, the compliance each pixel has lost is summed over the whole lung: it counts as overdistension above the pixel’s best PEEP, as collapse below it.',
      'The optimal PEEP is where the two curves cross. Alveo computes two models: compliance (with the driving pressure), the default, and impedance alone.',
    ],
    result: () => `Optimal PEEP ${nf(SIM.odlc.best, 1)} cmH₂O, overdistension = collapse = ${nf(SIM.odlc.value, 1)}%.`,
  },
};

export const STATS_EN = [
  { label: 'recomputed: same results as the clinical team’s reference pipeline', note: 'difference < 10⁻¹⁴ at every step' },
  { label: 'correlation of the images with the Dräger software', note: 'r from 0.91 to 0.92 on three steps of one PEEP trial, each over the same 30 seconds as the Dräger export' },
  { label: '.eit files of a whole trial loaded at once', note: 'sent in chunks, even on a slow connection' },
];

export const TILES_EN = [
  { year: 'Files', text: 'Raw .eit recordings, read frame by frame, or .asc exports from the monitor’s software.' },
  { year: 'Ventilator', name: 'PEEP and Pplat read', text: 'The pressures sent by the ventilator and recorded in the .eit fill in the steps; a value entered by hand takes priority.' },
  { year: 'Computation', name: 'Two models', tag: 'ODLC · C and Z', text: 'The compliance model (with the driving pressure) by default; the impedance-only model when Pplat is missing.' },
  { year: 'Protocol', name: 'Base image', text: 'The recording made before the PEEP descent is processed with the trial; the report shows the overdistension and collapse curve with and without it.' },
  { year: 'Visit', name: 'Report and workbooks', text: 'PDF visit report, a workbook per step and a visit workbook, with the reconstruction parameters.' },
  { year: 'Interface', name: 'English and French', text: 'The interface opens in English and switches to French in one click, for the whole session.' },
];
