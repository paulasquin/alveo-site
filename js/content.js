// Alveo content in French (English in content.en.js, same order and ids).
// Every number of the method charts comes from the simulated trial (js/data/sim.js).
import { LANG, nf } from './kit/i18n.js';
import { TIMELINE_EN, ENTRIES_EN, STATS_EN, TILES_EN } from './content.en.js';
import { SIM } from './data/sim.js';

export const TIMELINE = [
  { date: '1 · Données', title: 'Charger l’essai', text: 'Les fichiers .eit du moniteur, une quinzaine à la fois, envoyés par morceaux ; ou les exports .asc du PulmoVista 500, un par palier.' },
  { date: '2 · Cycles', title: 'Sélectionner les cycles', text: 'La courbe d’impédance de l’essai entier, enregistrements à la suite, avec un zoom sur une minute ; un clic sur un cycle affiche ses trois images.' },
  { date: '3 · Paliers', title: 'Constituer les paliers', text: 'Jusqu’à quinze cycles moyennés par palier, PEEP et Pplat lues dans le fichier, image de base, identifiants du patient et de la visite.' },
  { date: '4 · ODLC', title: 'Calculer', text: 'Surdistension et collapsus à chaque palier, modèle en compliance par défaut, PEEP optimale au croisement des courbes.' },
  { date: '5 · Cartes', title: 'Lire les cartes', text: 'PEEP optimale par pixel, masque pulmonaire, surdistension et collapsus à toute PEEP intermédiaire.' },
  { date: '6 · Exports', title: 'Exporter', text: 'Un classeur par palier, un classeur de visite (xlsx ou csv) et le rapport PDF, également affiché à l’écran.' },
];

export const ENTRIES = [
  {
    id: 'essai', num: '01', date: 'Données simulées', year: 'Cycles',
    title: 'L’essai dans son ensemble',
    question: 'Quels cycles retenir pour chaque palier ?',
    body: [
      'Les enregistrements sont affichés à la suite : on suit la descente de PEEP palier par palier, et la baisse de l’impédance de fin d’expiration qui l’accompagne.',
      'Un clic sur la courbe sélectionne le cycle correspondant ; Alveo y lit la PEEP et la pression de plateau transmises par le ventilateur.',
    ],
    result: 'Six paliers de 40 secondes, de 20 à 5 cmH₂O.',
    viz: { type: 'chart', chart: 'wave' },
  },
  {
    id: 'pixels', num: '02', date: 'Données simulées', year: 'Compliance',
    title: 'Une PEEP optimale propre à chaque pixel',
    question: 'Pourquoi raisonner pixel par pixel ?',
    body: [
      'La compliance d’un pixel est sa variation d’impédance rapportée à la pression motrice. Lorsque la PEEP augmente, elle croît, atteint un maximum, puis diminue.',
      'Un pixel ventral atteint son maximum à PEEP basse ; un pixel dorsal a besoin d’une PEEP plus élevée pour rester ouvert. Aucune PEEP n’est optimale pour tous les pixels à la fois : le choix est un compromis.',
    ],
    result: 'Compliance de deux pixels, rapportée à leur maximum respectif.',
    viz: { type: 'chart', chart: 'pixels' },
  },
  {
    id: 'odlc', num: '03', date: 'Données simulées', year: 'ODLC',
    title: 'Le croisement des courbes',
    question: 'Où placer ce compromis ?',
    body: [
      'À chaque palier, la compliance perdue par chaque pixel est additionnée sur l’ensemble du poumon : en surdistension au-dessus de sa meilleure PEEP, en collapsus en dessous.',
      'La PEEP optimale est le point de croisement des deux courbes. Alveo propose deux modèles : en compliance, qui intègre la pression motrice et est retenu par défaut, et en impédance seule.',
    ],
    result: () => `PEEP optimale ${nf(SIM.odlc.best, 1)} cmH₂O ; surdistension = collapsus = ${nf(SIM.odlc.value, 1)} %.`,
    viz: { type: 'chart', chart: 'odlc' },
  },
];

export const STATS = [
  { value: 4, decimals: 0, unit: 'visites', unitEn: 'visits', label: 'recalculées avec les mêmes résultats que le pipeline de référence d’une équipe clinique', note: 'écart inférieur à 10⁻¹⁴ à chaque palier', accent: true },
  { value: 0.92, decimals: 2, unit: 'r', label: 'corrélation entre les images d’Alveo et celles du logiciel Dräger', note: 'de 0,91 à 0,92 sur trois paliers d’un essai, sur les mêmes 30 secondes que l’export Dräger' },
  { value: 15, decimals: 0, unit: 'fichiers', unitEn: 'files', label: '.eit d’un essai complet chargés en une seule fois', note: 'envoyés par morceaux, y compris sur une connexion lente' },
];

export const TILES = [
  { year: 'Fichiers', name: 'Dräger PulmoVista 500', tag: '.eit · .asc', text: 'Enregistrements .eit lus trame par trame, ou exports .asc du logiciel du moniteur.' },
  { year: 'Ventilateur', name: 'PEEP et Pplat du ventilateur', tag: 'machine recorded', text: 'Les pressions enregistrées dans le fichier .eit renseignent les paliers ; une valeur saisie manuellement reste prioritaire.' },
  { year: 'Calcul', name: 'Deux modèles', tag: 'ODLC · C et Z', text: 'Le modèle en compliance, qui intègre la pression motrice, par défaut ; le modèle en impédance seule lorsque la Pplat manque.' },
  { year: 'Protocole', name: 'Image de base', tag: 'base image', text: 'L’enregistrement réalisé avant la décroissance de PEEP est intégré à l’analyse ; le rapport présente les courbes avec et sans cette image.' },
  { year: 'Visite', name: 'Rapport et classeurs', tag: 'pdf · xlsx · csv', text: 'Rapport PDF de la visite, classeur par palier et classeur de visite, avec les paramètres de reconstruction.' },
  { year: 'Interface', name: 'Français et anglais', tag: 'FR · EN', text: 'L’interface est en anglais par défaut et passe en français en un clic.' },
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
