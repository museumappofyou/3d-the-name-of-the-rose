import { AED, CHURCH, CLOISTER, DORMITORY, CHAPTER, ABBOT, HOSPICE, INFIRMARY, BATHS, HERB_GARDEN, VEG_GARDEN, CEMETERY, FOLDS, STABLES, GRANARY, OXSHED, SOUTH_RANGE, GATEHOUSE, FLOWER_GARDEN, ORCHARD, P } from '../core/plan.js';
import { pointInPoly } from '../core/library.js';
import { OUTLINE, HIDDEN_STAIR } from '../world/aedificium.js';
import { OSSUARY_PATH } from '../world/church.js';

// Where is the walker? Named zones for the banner, indoor lighting and
// footstep sounds. Smaller zones are listed first.

const R = r => [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]];
const aedW = OUTLINE.map(([x, z]) => [x + AED.x, z + AED.z]);
const zc = (CHURCH.zN + CHURCH.zS) / 2;
const infPoly = (() => {
  const a = INFIRMARY.a, b = INFIRMARY.b, w = INFIRMARY.width / 2 + 0.5;
  const d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(...d), n = [-d[1] / L * w, d[0] / L * w];
  return [[a[0] + n[0], a[1] + n[1]], [b[0] + n[0] + d[0] / L * 3, b[1] + n[1] + d[1] / L * 3], [b[0] - n[0] + d[0] / L * 3, b[1] - n[1] + d[1] / L * 3], [a[0] - n[0], a[1] - n[1]]];
})();
// underground footprints: the ossuary passage (a band along its path), the
// skull-chapel stair, the kitchen descent, the hidden stair's foot passage
const segDist = (x, z, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
};
const inR = (x, z, x0, x1, z0, z1) => x > x0 && x < x1 && z > z0 && z < z1;
const HSW = [HIDDEN_STAIR.c[0] + AED.x, HIDDEN_STAIR.c[1] + AED.z];
const ossTest = (x, y, z) => {
  if (y > -1.0 || y < -4.5) return false;
  for (let i = 0; i < OSSUARY_PATH.length - 1; i++) if (segDist(x, z, OSSUARY_PATH[i], OSSUARY_PATH[i + 1]) < 2.2) return true;
  const [sx] = OSSUARY_PATH[0];
  if (inR(x, z, sx - 1.0, sx + 1.0, CHURCH.zN - 6.5, CHURCH.zN + 0.2)) return true;                    // chapel stair
  const kx = AED.x + AED.ossX;
  if (inR(x, z, kx - 1.5, kx + 1.5, AED.z + AED.dT + 2.0, AED.z + AED.dT + 6.8)) return true;          // kitchen descent
  if (inR(x, z, HSW[0] - 1.0, kx - 1.1, HSW[1] - 0.5, AED.z + HIDDEN_STAIR.zPass + 0.9)) return true;   // hidden-stair foot passage
  return false;
};
const smithy = SOUTH_RANGE.find(s => s.id === 'smithy');
const churchPoly = [[CHURCH.x0, CHURCH.zN - 2.2], [CHURCH.xCross, CHURCH.zN - 2.2], [CHURCH.xCross, CHURCH.transeptN], [CHURCH.xChoir, CHURCH.transeptN], [CHURCH.xChoir, zc - 4.6], [CHURCH.xApse + 4.6, zc - 4.6], [CHURCH.xApse + 4.6, CHURCH.zS], [CHURCH.x0, CHURCH.zS]];

export const ZONES = [
  { id: 'crypt', latin: 'Crypta', tr: 'Hazine mahzeni', en: 'The treasury crypt', test: (x, y, z) => y < -1.5 && x > CHURCH.xChoir && x < CHURCH.xApse + 4 && Math.abs(z - zc) < 4.2, indoor: true, floor: 'stone' },
  // F4: inside the shaft of Jorge's secret stair, from the ossuary to the library
  { id: 'secret-stair', latin: 'Scala occulta', tr: 'Gizli merdiven', en: 'The secret stair', test: (x, y, z) => y > -3.3 && y < AED.y2 - 0.3 && Math.hypot(x - HSW[0], z - HSW[1]) < HIDDEN_STAIR.rIn + 0.05, indoor: true, floor: 'stone' },
  { id: 'ossuary', latin: 'Ossuarium', tr: 'Kemik mezarlığı', en: 'The ossuary', test: ossTest, indoor: true, floor: 'stone' },
  // F7: the cells beneath the smithy (floor y ≈ −3.1)
  { id: 'smithy-cells', latin: 'Carceres', tr: 'Demirhanenin zindanı', en: 'The cells beneath the forge', test: (x, y, z) => y < -1.0 && pointInPoly([x, z], R(smithy)), indoor: true, floor: 'stone', place: 'smithy' },
  { id: 'library', latin: 'Bibliotheca', tr: 'Kitaplık', en: 'The library', test: (x, y, z) => y > AED.y2 - 0.6 && pointInPoly([x, z], aedW), indoor: true, floor: 'stone', place: 'library' },
  { id: 'scriptorium', latin: 'Scriptorium', tr: 'Yazı Salonu', en: 'The scriptorium', test: (x, y, z) => y > AED.y1 - 0.6 && pointInPoly([x, z], aedW), indoor: true, floor: 'straw', place: 'scriptorium' },
  { id: 'kitchen', latin: 'Culina', tr: 'Mutfak', en: 'The kitchen', test: (x, y, z) => pointInPoly([x, z], aedW) && (x - AED.x) - (z - AED.z) < 0, indoor: true, floor: 'stone', place: 'kitchen' },
  { id: 'refectory', latin: 'Refectorium', tr: 'Yemekhane', en: 'The refectory', test: (x, y, z) => pointInPoly([x, z], aedW), indoor: true, floor: 'stone', place: 'refectory' },
  { id: 'skull', latin: 'Capella calvariarum', tr: 'Kafatasları şapeli', en: 'The chapel of skulls', test: (x, y, z) => Math.abs(x - 15.4) < 2.2 && z < CHURCH.zN + 1.2 && z > CHURCH.zN - 2.3, indoor: true, floor: 'stone', place: 'skull-chapel' },
  { id: 'choir', latin: 'Chorus', tr: 'Koro yeri', en: 'The choir', test: (x, y, z) => x > CHURCH.xCross - 1 && pointInPoly([x, z], churchPoly), indoor: true, floor: 'stone', place: 'nave' },
  { id: 'church', latin: 'Ecclesia', tr: 'Kilise', en: 'The church', test: (x, y, z) => pointInPoly([x, z], churchPoly), indoor: true, floor: 'stone', place: 'nave' },
  { id: 'porch', latin: 'Porticus', tr: 'Kilise kapısı', en: 'The west portal', test: (x, y, z) => x < CHURCH.x0 && x > CHURCH.x0 - 7 && Math.abs(z - zc) < 5, indoor: false, floor: 'stone', place: 'portal' },
  { id: 'hospice-cell', latin: 'Cella Guillelmi', tr: 'William’in hücresi', en: 'William’s cell', test: (x, y, z) => y > 5.0 && pointInPoly([x, z], R(HOSPICE)) && Math.abs(z - (HOSPICE.z0 + 2.5 * (HOSPICE.z1 - HOSPICE.z0) / 4)) < 2.4, indoor: true, floor: 'wood', place: 'hospice' },
  { id: 'hospice', latin: 'Hospitium', tr: 'Hacılar konukevi', en: 'The pilgrims’ hospice', test: (x, y, z) => pointInPoly([x, z], R(HOSPICE)), indoor: true, floor: 'wood', place: 'hospice' },
  { id: 'abbot', latin: 'Domus abbatis', tr: 'Başrahibin evi', en: 'The Abbot’s house', test: (x, y, z) => pointInPoly([x, z], R(ABBOT)), indoor: true, floor: 'stone', place: 'abbot' },
  { id: 'chapter', latin: 'Capitulum', tr: 'Toplantı Salonu', en: 'The chapter house', test: (x, y, z) => pointInPoly([x, z], R({ ...CHAPTER, x0: CHAPTER.narthex })), indoor: true, floor: 'stone', place: 'chapter' },
  { id: 'narthex', latin: 'Atrium vetus', tr: 'Eski kilisenin avlusu', en: 'The courtyard of the old church', test: (x, y, z) => pointInPoly([x, z], R(CHAPTER)), indoor: false, floor: 'stone', place: 'chapter' },
  { id: 'dormitory', latin: 'Dormitorium', tr: 'Yatakhane', en: 'The dormitory', test: (x, y, z) => pointInPoly([x, z], R({ ...DORMITORY, z1: DORMITORY.z0 + 34 })), indoor: true, floor: 'stone', place: 'dormitory' },
  { id: 'calefactory', latin: 'Calefactorium', tr: 'Isınma odası', en: 'The warming room', test: (x, y, z) => x > CLOISTER.x1 && x < DORMITORY.x0 + 0.4 && z > CHURCH.zS && z < CLOISTER.z1, indoor: true, floor: 'stone' },
  { id: 'garth', latin: 'Hortus claustri', tr: 'Avlu bahçesi', en: 'The cloister garth', test: (x, y, z) => x > CLOISTER.x0 + CLOISTER.walk && x < CLOISTER.x1 - CLOISTER.walk && z > CHURCH.zS + CLOISTER.walk + 0.5 && z < CLOISTER.z1 - CLOISTER.walk, indoor: false, floor: 'snow', place: 'cloister' },
  { id: 'cloister', latin: 'Claustrum', tr: 'Avlu', en: 'The cloister', test: (x, y, z) => pointInPoly([x, z], R({ ...CLOISTER, z0: CHURCH.zS })), indoor: false, floor: 'stone', place: 'cloister' },
  { id: 'infirmary', latin: 'Infirmarium', tr: 'Hastane', en: 'The infirmary', test: (x, y, z) => pointInPoly([x, z], infPoly), indoor: true, floor: 'stone', place: 'infirmary' },
  { id: 'baths', latin: 'Balnea', tr: 'Hamam', en: 'The baths', test: (x, y, z) => pointInPoly([x, z], R(BATHS)), indoor: true, floor: 'stone', place: 'baths' },
  { id: 'stables', latin: 'Stabula', tr: 'Ahırlar', en: 'The stables', test: (x, y, z) => pointInPoly([x, z], R(STABLES)), indoor: true, floor: 'straw', place: 'stables' },
  { id: 'folds', latin: 'Ovilia', tr: 'Ağıllar', en: 'The sheepfolds', test: (x, y, z) => pointInPoly([x, z], R(FOLDS)), indoor: true, floor: 'straw', place: 'stables' },
  { id: 'granary', latin: 'Horreum', tr: 'Ambar', en: 'The granary', test: (x, y, z) => pointInPoly([x, z], R(GRANARY)), indoor: true, floor: 'wood', place: 'stables' },
  { id: 'oxshed', latin: 'Bovile', tr: 'Öküz ahırı', en: 'The ox stable', test: (x, y, z) => pointInPoly([x, z], R(OXSHED)), indoor: true, floor: 'straw', place: 'stables' },
  { id: 'gatehouse', latin: 'Portaria', tr: 'Kapıcı odası', en: 'The porter’s lodge', test: (x, y, z) => pointInPoly([x, z], R(GATEHOUSE)), indoor: true, floor: 'stone', place: 'gate' },
  ...SOUTH_RANGE.map(s => ({
    id: s.id, test: (x, y, z) => pointInPoly([x, z], R(s)), indoor: true, floor: s.id === 'smithy' ? 'earth' : 'stone', place: s.id === 'smithy' ? 'smithy' : 'south-range',
    ...{ novices: { latin: 'Domus novitiorum', tr: 'Çömezlerin evi', en: 'The novices’ house' }, lodgings: { latin: 'Domus famulorum', tr: 'Hizmetçilerin evi', en: 'The servants’ quarters' }, cellars: { latin: 'Cellaria', tr: 'Mahzenler', en: 'The cellars' }, granaries: { latin: 'Horrea', tr: 'Ambarlar', en: 'The granaries' }, mill: { latin: 'Molendinum', tr: 'Değirmen', en: 'The mill' }, press: { latin: 'Torcular', tr: 'Yağhane', en: 'The oil press' }, smithy: { latin: 'Fabrica', tr: 'Demirhane', en: 'The smithy' } }[s.id],
  })),
  { id: 'cemetery', latin: 'Coemeterium', tr: 'Mezarlık', en: 'The cemetery', test: (x, y, z) => pointInPoly([x, z], CEMETERY.poly), indoor: false, floor: 'snow', place: 'cemetery' },
  { id: 'herbs', latin: 'Hortus botanicus', tr: 'Botanik bahçesi', en: 'The botanical garden', test: (x, y, z) => pointInPoly([x, z], R(HERB_GARDEN)), indoor: false, floor: 'snow', place: 'gardens' },
  { id: 'veg', latin: 'Hortus olerum', tr: 'Sebze bahçesi', en: 'The vegetable garden', test: (x, y, z) => pointInPoly([x, z], R(VEG_GARDEN)), indoor: false, floor: 'snow', place: 'gardens' },
  { id: 'orchard', latin: 'Pomarium', tr: 'Meyve bahçesi', en: 'The orchard', test: (x, y, z) => pointInPoly([x, z], ORCHARD.poly), indoor: false, floor: 'snow', place: 'gardens' },
  { id: 'flowers', latin: 'Viridarium', tr: 'Çiçek bahçesi', en: 'The flower garden', test: (x, y, z) => pointInPoly([x, z], R(FLOWER_GARDEN)), indoor: false, floor: 'snow', place: 'flower-garden' },
  { id: 'farmyard', latin: 'Curtis', tr: 'Çiftlik avlusu', en: 'The farmyard', test: (x, y, z) => x > 50 && z < 45, indoor: false, floor: 'snow', place: 'stables' },
  { id: 'avenue', latin: 'Via arborum', tr: 'Ağaçlı yol', en: 'The avenue', test: (x, y, z) => x < CHURCH.x0 && x > P(80, 0)[0] && Math.abs(z - P(0, 272)[1]) < 7, indoor: false, floor: 'snow', place: 'gate' },
  { id: 'road', latin: 'Semita caprarum', tr: 'Keçi yolu', en: 'The goat path', test: x => x < P(78, 0)[0], indoor: false, floor: 'snow', place: 'road' },
  { id: 'abbey', latin: 'Abbatia', tr: 'Manastır', en: 'The abbey', test: () => true, indoor: false, floor: 'snow' },
];

export function zoneAt(x, y, z) {
  for (const zn of ZONES) if (zn.test(x, y, z)) return zn;
  return ZONES[ZONES.length - 1];
}
