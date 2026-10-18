// English content — same order and ids as content.js.
import { nf } from './kit/i18n.js';
import { SIM } from './data/sim.js';

export const TIMELINE_EN = [
  { date: '1 · Data', title: 'Load the trial', text: 'The monitor’s .eit files, fifteen or so at a time, sent in chunks; or the PulmoVista 500 .asc exports, one per step.' },
  { date: '2 · Cycles', title: 'Select the cycles', text: 'The impedance curve of the whole trial, recordings in sequence, with a one-minute zoom; clicking a cycle shows its three images.' },
  { date: '3 · Steps', title: 'Build the steps', text: 'Up to fifteen cycles averaged per step, PEEP and Pplat read from the file, base image, patient and visit identifiers.' },
  { date: '4 · ODLC', title: 'Compute', text: 'Overdistension and collapse at each step, the compliance model by default, the optimal PEEP where the curves cross.' },
  { date: '5 · Maps', title: 'Read the maps', text: 'Optimal PEEP per pixel, lung mask, overdistension and collapse at any intermediate PEEP.' },
  { date: '6 · Exports', title: 'Export', text: 'A workbook per step, a visit workbook (xlsx or csv) and the PDF report, also shown on screen.' },
];

export const ENTRIES_EN = {
  essai: {
    date: 'Simulated data', year: 'Cycles',
    title: 'The trial as a whole',
    question: 'Which cycles should each step keep?',
    body: [
      'The recordings are shown in sequence: the PEEP descent can be followed step by step, together with the fall in end-expiratory impedance that comes with it.',
      'Clicking the curve selects the corresponding cycle; Alveo reads there the PEEP and plateau pressure sent by the ventilator.',
    ],
    result: 'Six 40-second steps, from 20 to 5 cmH₂O.',
  },
  pixels: {
    date: 'Simulated data', year: 'Compliance',
    title: 'An optimal PEEP for each pixel',
    question: 'Why reason pixel by pixel?',
    body: [
      'The compliance of a pixel is its impedance change divided by the driving pressure. As PEEP increases, it rises, reaches a maximum, then falls.',
      'A ventral pixel peaks at a low PEEP; a dorsal pixel needs a higher one to stay open. No PEEP is optimal for every pixel at once: the choice is a compromise.',
    ],
    result: 'Compliance of two pixels, each relative to its own maximum.',
  },
  odlc: {
    date: 'Simulated data', year: 'ODLC',
    title: 'Where the curves cross',
    question: 'Where should the compromise lie?',
    body: [
      'At each step, the compliance lost by each pixel is summed over the whole lung: as overdistension above its best PEEP, as collapse below it.',
      'The optimal PEEP is the point where the two curves cross. Alveo offers two models: compliance, which includes the driving pressure and is used by default, and impedance alone.',
    ],
    result: () => `Optimal PEEP ${nf(SIM.odlc.best, 1)} cmH₂O; overdistension = collapse = ${nf(SIM.odlc.value, 1)}%.`,
  },
};

export const STATS_EN = [
  { label: 'recomputed with the same results as a clinical team’s reference pipeline', note: 'difference below 10⁻¹⁴ at every step' },
  { label: 'correlation between Alveo’s images and those of the Dräger software', note: 'from 0.91 to 0.92 on three steps of a trial, over the same 30 seconds as the Dräger export' },
  { label: '.eit files of a whole trial loaded at once', note: 'sent in chunks, even on a slow connection' },
];

export const TILES_EN = [
  { year: 'Files', text: '.eit recordings read frame by frame, or .asc exports from the monitor’s software.' },
  { year: 'Ventilator', name: 'Ventilator PEEP and Pplat', text: 'The pressures recorded in the .eit file fill in the steps; a value entered by hand still takes priority.' },
  { year: 'Computation', name: 'Two models', tag: 'ODLC · C and Z', text: 'The compliance model, which includes the driving pressure, by default; the impedance-only model when Pplat is missing.' },
  { year: 'Protocol', name: 'Base image', text: 'The recording made before the PEEP descent is included in the analysis; the report shows the curves with and without it.' },
  { year: 'Visit', name: 'Report and workbooks', text: 'PDF visit report, a workbook per step and a visit workbook, with the reconstruction parameters.' },
  { year: 'Interface', name: 'English and French', text: 'The interface opens in English and switches to French in one click.' },
];
