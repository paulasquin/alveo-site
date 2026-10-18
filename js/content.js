// Alveo content in French (English in content.en.js, same order and ids).
// Every number of the method charts comes from the simulated trial (js/data/sim.js).
import { LANG, nf } from './kit/i18n.js';
import { TIMELINE_EN, ENTRIES_EN, STATS_EN, TILES_EN } from './content.en.js';
import { SIM } from './data/sim.js';

export const TIMELINE = [
  { date: '1 · Données', title: 'Charger l’essai', text: 'Les fichiers .eit du moniteur, une quinzaine en une fois, envoyés en petits morceaux ; ou les exports .asc du PulmoVista 500, un par palier.' },
  { date: '2 · Cycles', title: 'Choisir les respirations', text: 'L’impédance de tout l’essai, les enregistrements bout à bout, un zoom d’une minute ; un clic dans un cycle donne ses trois images.' },
  { date: '3 · Paliers', title: 'Construire les paliers', text: 'Jusqu’à quinze cycles moyennés par palier, la PEEP et la Pplat lues dans le fichier, l’image de base, les identifiants du patient et de la visite.' },
  { date: '4 · ODLC', title: 'Calculer', text: 'Surdistension et collapsus à chaque palier, modèle en compliance par défaut, PEEP optimale au croisement des courbes.' },
  { date: '5 · Cartes', title: 'Lire les cartes', text: 'PEEP optimale par pixel, masque pulmonaire, surdistension et collapsus à n’importe quelle PEEP intermédiaire.' },
  { date: '6 · Exports', title: 'Garder une trace', text: 'Un classeur par palier, un classeur de la visite (xlsx ou csv) et le rapport PDF, aussi affiché à l’écran.' },
];

export const ENTRIES = [
  {
    id: 'essai', num: '01', date: 'Données simulées', year: 'Cycles',
    title: 'Voir tout l’essai avant de choisir',
    question: 'Quelles respirations garder pour chaque palier ?',
    body: [
      'Les enregistrements sont mis bout à bout : la descente de PEEP se lit d’un coup d’œil, palier après palier, et l’impédance de fin d’expiration baisse avec elle.',
      'Un clic dans la courbe amène le sélecteur sur ce cycle. Alveo y lit la PEEP et la pression de plateau transmises par le ventilateur et enregistrées dans le fichier.',
    ],
    result: 'Six paliers de 40 secondes, de PEEP 20 à 5 cmH₂O.',
    viz: { type: 'chart', chart: 'wave' },
  },
  {
    id: 'pixels', num: '02', date: 'Données simulées', year: 'Compliance',
    title: 'Chaque pixel a sa meilleure PEEP',
    question: 'Pourquoi raisonner pixel par pixel ?',
    body: [
      'La compliance d’un pixel, c’est sa variation d’impédance divisée par la pression motrice. Quand la PEEP augmente, elle monte, passe par un maximum, puis redescend.',
      'Un pixel ventral atteint son maximum à PEEP basse ; un pixel dorsal a besoin d’une PEEP plus haute pour rester ouvert. Aucune PEEP n’est la meilleure pour tous les pixels à la fois : il faut un compromis.',
    ],
    result: 'Compliance de deux pixels, chacune rapportée à son maximum.',
    viz: { type: 'chart', chart: 'pixels' },
  },
  {
    id: 'odlc', num: '03', date: 'Données simulées', year: 'ODLC',
    title: 'Deux courbes qui se croisent',
    question: 'Où placer le compromis ?',
    body: [
      'À chaque palier, la compliance perdue par chaque pixel est sommée sur tout le poumon : elle compte en surdistension au-dessus de sa meilleure PEEP, en collapsus au-dessous.',
      'La PEEP optimale est le croisement des deux courbes. Alveo calcule deux modèles : en compliance (avec la pression motrice), retenu par défaut, et en impédance seule.',
    ],
    result: () => `PEEP optimale ${nf(SIM.odlc.best, 1)} cmH₂O, surdistension = collapsus = ${nf(SIM.odlc.value, 1)} %.`,
    viz: { type: 'chart', chart: 'odlc' },
  },
];

export const STATS = [
  { value: 4, decimals: 0, unit: 'visites', unitEn: 'visits', label: 'recalculées : mêmes résultats que le pipeline de référence de l’équipe clinique', note: 'écart < 10⁻¹⁴ sur chaque palier', accent: true },
  { value: 0.92, decimals: 2, unit: 'r', label: 'corrélation des images avec le logiciel Dräger', note: 'r de 0,91 à 0,92 sur trois paliers d’un même essai de PEEP, chacun sur les mêmes 30 secondes que l’export Dräger' },
  { value: 15, decimals: 0, unit: 'fichiers', unitEn: 'files', label: '.eit d’un essai complet chargés en une fois', note: 'envoyés par morceaux, même sur une connexion lente' },
];

export const TILES = [
  { year: 'Fichiers', name: 'Dräger PulmoVista 500', tag: '.eit · .asc', text: 'Les enregistrements bruts .eit, lus trame par trame, ou les exports .asc du logiciel du moniteur.' },
  { year: 'Ventilateur', name: 'PEEP et Pplat lues', tag: 'machine recorded', text: 'Les pressions transmises par le ventilateur et enregistrées dans le .eit remplissent les paliers ; une saisie manuelle reste prioritaire.' },
  { year: 'Calcul', name: 'Deux modèles', tag: 'ODLC · C et Z', text: 'Le modèle en compliance (avec la pression motrice) par défaut ; le modèle en impédance seule quand la Pplat manque.' },
  { year: 'Protocole', name: 'Image de base', tag: 'base image', text: 'L’enregistrement fait avant la descente de PEEP est traité avec l’essai ; le rapport montre la courbe de surdistension et de collapsus avec et sans lui.' },
  { year: 'Visite', name: 'Rapport et classeurs', tag: 'pdf · xlsx · csv', text: 'Rapport PDF de la visite, classeur par palier et classeur de la visite, avec les paramètres de reconstruction.' },
  { year: 'Interface', name: 'Français et anglais', tag: 'FR · EN', text: 'L’interface s’ouvre en anglais et passe en français d’un clic, pour toute la session.' },
];

// Method charts (functions, so the translations apply).
const fr = () => LANG === 'fr';
export const CHARTS = {
  wave: () => {
    const w = SIM.wave;
    const steps = [...new Set(w.peep)];
    return {
      id: 'wave',
      x: { label: fr() ? 'temps (s)' : 'time (s)', min: 0, max: 240, ticks: [0, 40, 80, 120, 160, 200, 240], unit: 's', d: 0 },
      y: { label: fr() ? 'impédance (u.a.)' : 'impedance (a.u.)', min: 0.2, max: 1.3, ticks: [0.4, 0.8, 1.2], unit: '', d: 2 },
      series: [{ name: fr() ? 'Impédance moyenne' : 'Mean impedance', color: '#6fd6ff', data: w.t.map((x, i) => [x, w.z[i]]) }],
      notes: steps.map((p, k) => ({ x: k * 40 + 6, y: 1.25, text: `PEEP ${p}` })),
    };
  },
  pixels: () => ({
    id: 'pixels',
    x: { label: 'PEEP (cmH₂O)', min: 4, max: 22, ticks: [5, 8, 11, 14, 17, 20], unit: 'cmH₂O', d: 1 },
    y: { label: fr() ? 'compliance (part du maximum)' : 'compliance (share of maximum)', min: 0, max: 1.05, ticks: [0, 0.25, 0.5, 0.75, 1], unit: '', d: 2 },
    series: [
      { name: fr() ? 'Pixel ventral' : 'Ventral pixel', color: '#6fd6ff', data: SIM.pixel_peeps.map((p, i) => [p, SIM.pixels.ventral[i]]) },
      { name: fr() ? 'Pixel dorsal' : 'Dorsal pixel', color: '#ffb45e', data: SIM.pixel_peeps.map((p, i) => [p, SIM.pixels.dorsal[i]]) },
    ],
  }),
  odlc: () => ({
    id: 'odlc',
    x: { label: 'PEEP (cmH₂O)', min: 4, max: 21, ticks: SIM.odlc.peeps.slice().reverse(), unit: 'cmH₂O', d: 1 },
    y: { label: fr() ? '% du poumon ventilé' : '% of ventilated lung', min: 0, max: 75, ticks: [0, 20, 40, 60], unit: '%', d: 1 },
    series: [
      { name: fr() ? 'Surdistension' : 'Overdistension', color: '#ff7a45', data: SIM.odlc.peeps.map((p, i) => [p, SIM.odlc.od[i]]), dots: true },
      { name: fr() ? 'Collapsus' : 'Collapse', color: '#b48cff', data: SIM.odlc.peeps.map((p, i) => [p, SIM.odlc.lc[i]]), dots: true },
    ],
    notes: [{ x: SIM.odlc.best, y: SIM.odlc.value + 9, text: `${fr() ? 'PEEP optimale' : 'Optimal PEEP'} ${nf(SIM.odlc.best, 1)}` }],
  }),
};

if (LANG === 'en') {
  TIMELINE.forEach((x, i) => Object.assign(x, TIMELINE_EN[i]));
  ENTRIES.forEach((e) => Object.assign(e, ENTRIES_EN[e.id]));
  STATS.forEach((x, i) => Object.assign(x, STATS_EN[i], x.unitEn ? { unit: x.unitEn } : {}));
  TILES.forEach((x, i) => Object.assign(x, TILES_EN[i]));
}
ENTRIES.forEach((e) => { if (typeof e.result === 'function') e.result = e.result(); });
