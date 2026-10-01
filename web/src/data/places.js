// Folios for every place. Descriptions paraphrase the novel; quotations are
// short excerpts from the Turkish translation (Şadan Karadeniz, Can
// Yayınları) with an English gloss. `ref` names the chapter (canonical
// hour) where the passage occurs. Coordinates are world metres.

import { AED, CHURCH, P } from '../core/plan.js';

const ax = AED.x, az = AED.z, zc = (CHURCH.zN + CHURCH.zS) / 2;

export const CATEGORIES = [
  { id: 'aedificium', latin: 'Aedificium', en: 'The Aedificium' },
  { id: 'ecclesia', latin: 'Ecclesia', en: 'The Church' },
  { id: 'claustrum', latin: 'Claustrum', en: 'Around the Cloister' },
  { id: 'horti', latin: 'Horti', en: 'Gardens & Infirmary' },
  { id: 'officinae', latin: 'Officinae', en: 'Farmyard & Workshops' },
  { id: 'moenia', latin: 'Moenia', en: 'Walls & Road' },
];

export const PLACES = [
  // ------------------------------------------------------------------ A
  {
    id: 'aedificium', cat: 'aedificium', key: 'A', en: 'The Aedificium', tr: 'Aedificium',
    text: 'An octagonal fortress that from afar looks like a square. Its southern walls rise from the plateau while its northern walls seem to grow from the precipice, the rock changing into bastions without any change of colour. A heptagonal tower stands at each corner, five of its seven sides showing. Three rows of windows mark its threefold height: kitchen and refectory, scriptorium, library.',
    quotes: [
      { tr: 'Uzaktan bir dörtgen gibi görünen sekizgen bir yapıydı', en: 'An octagonal building that from afar looked like a square.', ref: 'First Day, Prime' },
      { tr: 'Üç sıra pencere, yüksekliğinin üçlü uyumunu', en: 'Three rows of windows proclaimed the triple rhythm of its height.', ref: 'First Day, Prime' },
      { tr: 'kuzey kulesiyse uçurumun üstünden dışarı fırlıyordu', en: '…while the north tower jutted out over the precipice.', ref: 'First Day, Prime' },
    ],
    note: 'Dimensions are not given. The towers stand on the cardinal axes exactly as on the printed plan, traced here at 0.42 m to the plan pixel. The building is ≈63 m across its towers and ≈31 m to the tower peaks. The roofs are inferred: during the fire the flames “reached the eaves” and wooden frameworks, which implies pitched timber roofs.',
    view: { t: [ax, 10, az], p: [ax - 70, 45, az + 70] }, walk: { x: ax + 27, z: az + 28, yaw: 0.76 },
  },
  {
    id: 'kitchen', cat: 'aedificium', key: 'A', en: 'The Kitchen', tr: 'Mutfak', floor: 0,
    text: 'The western half of the ground floor, "huge and full of smoke, like an endless entrance hall". A great bread oven glows with its mouth open in the west tower, and in the south tower a huge hearth boils pots and turns spits. Behind the hearth, at the foot of the stair, an iron-clad door leads down into the ossuary.',
    quotes: [
      { tr: 'Batı kulesinin altında, kocaman bir ekmek fırını, ağzı açık… kıpkırmızı alevlerle', en: 'In the west tower, a huge bread oven, its mouth open, blazing red.', ref: 'First Day, Nones' },
      { tr: 'koca koca tencerelerin kaynadığı ve ızgaraların döndüğü kocaman bir ocak', en: 'A huge hearth where big pots boiled and spits turned.', ref: 'First Day, Nones' },
      { tr: 'Mutfağın tek bir kapısı vardır; içeriden de sürgülenmez.', en: 'The kitchen has only one door, and it cannot be bolted from inside.', ref: 'Fourth Day, Lauds (Remigio)' },
    ],
    note: 'The two heated spiral stairs of Second Day, Terce wind round columns that carry the oven flues, in the west and south towers. The washing-up pit where Remigio found Venantius is set against the outer wall.',
    view: { t: [ax - 8, 1, az + 8], p: [ax - 30, 26, az + 30] }, cut: 1, walk: { x: ax - 12.5, z: az + 7.5, y: AED.y0, yaw: 0.4 },
  },
  {
    id: 'refectory', cat: 'aedificium', key: 'A', en: 'The Refectory', tr: 'Yemekhane', floor: 0,
    text: 'The eastern half of the ground floor. Lit by big torches, it has rows of tables and the Abbot\'s table on a great dais set perpendicular to them, with a pulpit for the reader opposite. A fire burns in the north tower. From here the east tower\'s spiral stair climbs to the scriptorium. It is the only stair that reaches the library above.',
    quotes: [
      { tr: 'Yemekhane büyük meşalelerle aydınlatılmıştı', en: 'The refectory was lit by great torches.', ref: 'First Day, Compline' },
      { tr: 'Başrahip’in büyük bir yükselti üstüne, onlarınkine dikey olarak konmuş masasının', en: '…the Abbot’s table, on a large dais, set perpendicular to theirs.', ref: 'First Day, Compline' },
    ],
    note: 'In First Day, Nones the Turkish text calls this half "hastane" (hospital). The meal scenes and the separate infirmary building K show that the refectory is meant. The windows toward the precipice are the only ground-floor windows facing it.',
    view: { t: [ax + 10, 1, az - 10], p: [ax + 34, 28, az - 32] }, cut: 1, walk: { x: ax + 5.5, z: az - 5.0, y: AED.y0, yaw: -0.55 },
  },
  {
    id: 'scriptorium', cat: 'aedificium', key: 'A', en: 'The Scriptorium', tr: 'Yazı Salonu', floor: 1,
    text: 'The whole second floor is one undivided hall under low curved vaults, with straw on the floor to muffle footsteps. It has forty windows: three huge ones in each great wall, a smaller one in each of the five outer faces of every tower, and eight tall narrow ones onto the central well. A desk stands under each. The catalogue is chained to Malachi\'s desk, and Jorge sits on a stool beside the north-tower fire.',
    quotes: [
      { tr: 'büyük duvarlarının her birinde üçer tane kocaman pencere', en: 'Three huge windows in each of the great walls…', ref: 'First Day, after Nones' },
      { tr: 'sekiz yüksek, dar pencere… sekizgen biçimindeki kuyudan', en: '…eight tall, narrow windows opening onto the octagonal well.', ref: 'First Day, after Nones' },
      { tr: 'kurşun çerçeveli, renksiz cam kareleri', en: 'Colourless panes of glass set in lead.', ref: 'First Day, after Nones' },
    ],
    note: 'The count is 3×4 + 5×4 + 8 = 40 windows and forty desks, all modelled. The columns and arches stand under the library walls above, so that the labyrinth rests on the vaults.',
    view: { t: [ax, 9, az], p: [ax - 30, 38, az + 28] }, cut: 2, walk: { x: ax + 11.0, z: az + 9.2, y: AED.y1, yaw: -2.9 },   // behind a scribe at a desk under a great window, the next desks along the wall
  },
  {
    id: 'library', cat: 'aedificium', key: 'A', en: 'The Library', tr: 'Kitaplık', floor: 2,
    text: 'The labyrinth on the top floor has fifty-six rooms. Four are heptagonal halls in the towers and fifty-two are more or less square. Of these, eight are blind, twenty-eight face the outside and sixteen the central well. Every room is marked by one letter, the initial of an Apocalypse verse painted over its arch. Read in order, the letters spell out a map of the world.',
    quotes: [
      { tr: 'Kitaplıkta elli altı oda var; bunların dördü yedigen, elli ikisi az çok kare biçiminde', en: 'The library has fifty-six rooms: four heptagonal, fifty-two more or less square…', ref: 'Third Day, Vespers' },
      { tr: 'Tinsel bir labirent olduğu kadar, dünyasal bir labirenttir o.', en: 'It is a spiritual labyrinth, and also a worldly one.', ref: 'First Day, Terce' },
    ],
    note: 'The room letters satisfy the words read in Fourth Day, After Compline: FONS ADAE, LEONES, YSPANIA, HIBERNIA, ACAIA, ANGLIA, GERMANI, GALLIA, ROMA and AEGYPTUS. The book leaves the exact doorways open, so the door plan is a reconstruction constrained by every passage Adso describes.',
    view: { t: [ax, 16, az], p: [ax + 22, 60, az + 30] }, cut: 3, walk: { x: ax + AED.dT + 1.2, z: az + 1.8, y: AED.y2, yaw: 1.2 },
  },
  {
    id: 'east-hall', cat: 'aedificium', key: 'A', en: 'Apocalypsis Iesu Christi', tr: 'Giriş yedigeni', floor: 2, sub: true,
    text: 'The stair arrives in the heptagonal hall of the east tower. It is not large and has no windows, and it smells of mould. Only four of its seven walls open, each an arch between two small columns. The largest scroll in the library reads "Apocalypsis Iesu Christi". The rooms around it spell FONS ADAE, the Earthly Paradise of the east. One of them has no books, only a stone altar lit by the rising sun.',
    quotes: [
      { tr: 'yedi duvarlı pek büyük sayılmayacak, penceresiz bir salon', en: 'A seven-walled room, not very large, without windows.', ref: 'Second Day, Night' },
      { tr: 'yalnızca dördünde duvara gömülü iki küçük sütun arasında, yuvarlak bir kemerin çevrelediği oldukça geniş bir açıklık', en: 'Only four had an opening — a fairly wide archway between two small columns set into the wall.', ref: 'Second Day, Night' },
    ],
    view: { t: [ax + AED.dT, 16, az], p: [ax + AED.dT + 14, 34, az + 14] }, cut: 3, walk: { x: ax + AED.dT + 1.2, z: az + 1.8, y: AED.y2, yaw: 1.2 },
  },
  {
    id: 'mirror', late: true, cat: 'aedificium', key: 'A', en: 'The Mirror of Room S', tr: 'Aynalı oda', floor: 2, sub: true,
    text: 'Room S is a blind room of the south tower. Its passages lead to rooms Y, P, E and U. A mirror taller than a man hangs on one wall in a sturdy oak frame. Its wavy glass swells and bends the reflections of anyone who approaches. Above it is written "Super thronos viginti quatuor". Pressing the first and seventh letters of quatuor, Q and R, makes the mirror open like a door.',
    quotes: [
      { tr: 'Ayna ortalama bir adam boyundan daha yüksekti; sağlam bir meşe çerçeveyle duvara asılmıştı', en: 'The mirror was taller than an average man, hung on the wall in a sturdy oak frame.', ref: 'Fourth Day, After Compline' },
      { tr: 'üstüne basılınca q harfi tık diye kuru bir ses çıkardı', en: 'When pressed, the q gave a dry click.', ref: 'Seventh Day, Night' },
    ],
    note: 'Walk up to the mirror and press E to reach for the letters. The finis Africae lies behind it.',
    view: { t: [ax - 3, 16, az + 26], p: [ax - 14, 32, az + 40] }, cut: 3, walk: { x: ax - 3.6, z: az + 18.0, y: AED.y2, yaw: 2.9 },
  },
  {
    id: 'finis-africae', late: true, cat: 'aedificium', key: 'A', en: 'Finis Africae', tr: 'Finis Africae', floor: 2, sub: true,
    text: 'The walled heptagon of the south tower, the "end of Africa". It is vaulted and windowless, and smells heavily of damp books. Shelves run along the walls, and the table in the middle is piled with papers. At the far end stands a cupboard hiding a door, with a wheel hung with weights beside it. On the table lies the worn volume that holds an Arabic, a Syriac and a Latin text and a headless Greek one.',
    quotes: [
      { tr: 'Yedigen oda var, ama ulaşılamaz.', en: 'The heptagonal room exists, but it cannot be reached.', ref: 'Fourth Day, After Compline' },
      { tr: 'odanın ortasında üstü kâğıtlarla tepeleme dolu bir masa', en: 'In the middle of the room, a table heaped with papers.', ref: 'Seventh Day, Night' },
    ],
    view: { t: [ax, 16, az + AED.dT], p: [ax + 10, 30, az + AED.dT + 14] }, cut: 3, walk: { x: ax + 0.6, z: az + AED.dT - 1.4, y: AED.y2, yaw: 3.1 },
  },
  {
    id: 'censer', late: true, cat: 'aedificium', key: 'A', en: 'The Room of Visions', tr: 'Buhurdan', floor: 2, sub: true,
    text: 'In the Apocalypse rooms of YSPANIA a faint, steady light burns on a table. It is not a lamp but an open censer, smouldering. Beside it lies an Apocalypse open at the woman clothed with the sun. Adso breathes the smoke of the herbs and sees the monster\'s scales become a forest. Step close and see what he saw.',
    quotes: [
      { tr: 'üstü açık bir buhurdana benziyordu; alevi yoktu', en: 'It looked like an open censer; it had no flame.', ref: 'Second Day, Night' },
      { tr: 'sarı, zencefil, camgöbeği ve yanık toprak rengi', en: 'Yellow, cinnabar, turquoise and burnt earth.', ref: 'Second Day, Night' },
    ],
    view: { t: [ax - 12, 16, az + 12], p: [ax - 22, 32, az + 26] }, cut: 3, walk: { x: ax - 15.9, z: az + 12.9, y: AED.y2, yaw: 0.8 },
  },

  {
    id: 'fire', late: true, cat: 'aedificium', key: 'A', en: 'The Burning', tr: 'Yangın', sub: true, fire: true, hour: 1.2,
    text: 'On the seventh night Jorge throws the lamp into the books of room Y. The parchment flares "like a bundle of dry brushwood" and the whole labyrinth becomes a vast pyre. Flames show between the alabaster frames of the south wing. The floors give way into the scriptorium, and sparks carried on a light wind set fire to the church roof, the stables, the forges and the dormitory. The abbey burns for three days and three nights.',
    quotes: [
      { tr: 'Tüm labirentin... kocaman bir kurban yığınından başka bir şey olmadığının', en: 'That the whole labyrinth was nothing but an immense sacrificial pyre.', ref: 'Seventh Day, Night' },
      { tr: 'Manastır tam üç gün üç gece yandı', en: 'The abbey burned for three days and three nights.', ref: 'Last Page' },
    ],
    note: 'Years later Adso returns: of the Aedificium only the south wall has fallen, and the two outer towers over the precipice stand almost whole, their windows like empty eye sockets. This view shows the first hour of the fire.',
    view: { t: [ax, 14, az], p: [ax - 85, 46, az + 95] }, walk: { x: 42.2, z: -18.5, yaw: 0 },
  },

  // ------------------------------------------------------------------ B
  {
    id: 'church', cat: 'ecclesia', key: 'B', en: 'The Abbey Church', tr: 'Kilise',
    text: 'The church is Italian in type, "firmly planted on the ground" and wider than it is tall. Its first level is crowned with square crenellations like a fortress. Above rises a second structure, "more a second church than a tower", with a pitched roof and severe windows, and over the choir a pointed spire, recently added. The main door faces due west. The north door faces the Aedificium\'s south tower across the cemetery.',
    quotes: [
      { tr: 'birinci katında bir kale gibi, bir dizi dört köşe mazgal vardı', en: 'Its first level had a row of square crenellations, like a fortress.', ref: 'First Day, Sext' },
      { tr: 'koro yerinin üstünde gökkubbeye doğru yüreklice yükselen sivri bir kuleyle', en: '…with a pointed spire rising boldly over the choir.', ref: 'First Day, Sext' },
      { tr: 'Kilisenin kuzey kapısı Aedificium’un güney kulesine bakıyor', en: 'The north door of the church faces the south tower of the Aedificium.', ref: 'First Day, Prime' },
    ],
    view: { t: [15, 8, zc], p: [-45, 32, zc + 40] }, walk: { x: CHURCH.x0 - 12, z: zc, yaw: -Math.PI / 2 },
  },
  {
    id: 'portal', cat: 'ecclesia', key: 'B', en: 'The West Portal', tr: 'Kilise kapısı', sub: true,
    text: 'Two plain pillars and a silvery vault stand before the doors. Receding arches draw the eye into shadow, toward the tympanum: a throne set in heaven, the Seated One with his sealed book and raised right hand, the sea of crystal at his feet. The four living creatures surround him, and the twenty-four elders sit in rows of 7+7, 3+3 and 2+2. Three pairs of lions cross on the central column. Peter, Paul, Jeremiah and Isaiah lean from the jambs as if dancing.',
    quotes: [
      { tr: 'yedi artı yedi, sonra üç artı üç, sonra da iki artı ikilik', en: 'Seven plus seven, then three plus three, then two plus two.', ref: 'First Day, Sext' },
      { tr: 'Petro’su ve Pavlos’u, Yeremya’yı ve Yeşaya’yı tanıdım', en: 'I recognised Peter and Paul, Jeremiah and Isaiah.', ref: 'First Day, Sext' },
    ],
    note: 'The relief is generated from these descriptions: the figures and their numbers follow the text, and the forms are simplified. The painted colours follow the "cheerful softness of the colours".',
    view: { t: [CHURCH.x0 - 1, 4.8, zc], p: [CHURCH.x0 - 14.5, 3.6, zc + 0.4] }, walk: { x: CHURCH.x0 - 4, z: zc, yaw: -Math.PI / 2, pitch: 0.35 },   // under the porch, looking up into the tympanum as Adso does
  },
  {
    id: 'nave', cat: 'ecclesia', key: 'B', en: 'Nave & Choir', tr: 'Nef ve koro', sub: true,
    text: 'The naves are enormous in the half-dark. Sixty monks stand in facing stalls in the choir, where a single lamp burns all night on a great bronze tripod two men tall. The high altar looks gold from every side. The choir windows, above the altar, throw a heavenly blue into the nave. In the north aisle a stone Virgin smiles from a slender column beside the last chapel.',
    quotes: [
      { tr: 'İki insan boyunda, kocaman bir bronz üçayak üstünde tek bir lamba', en: 'A single lamp on a huge bronze tripod, two men tall.', ref: 'First Day, Compline' },
      { tr: 'koro yerinde hâlâ görülebilen olağanüstü mavi', en: 'The extraordinary blue still to be seen in the choir.', ref: 'First Day, Vespers' },
    ],
    view: { t: [20, 4, zc], p: [0, 12, zc + 2] }, walk: { x: CHURCH.x0 + 3, z: zc, yaw: -Math.PI / 2 },
  },
  {
    id: 'skull-chapel', cat: 'ecclesia', key: 'B', en: 'The Skull Chapel', tr: 'Kafatasları şapeli', sub: true,
    text: 'This is the third chapel on the left. Its altar stone shows a row of empty-socketed skulls above a heap of shin bones. Press the eyes of the fourth skull from the right and the whole altar turns on a hidden pivot, uncovering damp steps down into the ossuary.',
    quotes: [
      { tr: 'Sağdan dördüncü kafatası: Gözlerine bas', en: 'The fourth skull from the right: press its eyes.', ref: 'Second Day, after Vespers (Alinardo)' },
      { tr: 'Sunak kımıldadı, gizli bir eksenin çevresinde dönerek karanlık bir açıklığı', en: 'The altar moved, turning on a hidden pivot to reveal a dark opening.', ref: 'Second Day, Compline' },
    ],
    note: 'Stand before the altar and press E.',
    view: { t: [15.4, 1.5, CHURCH.zN - 1], p: [15.4, 5, CHURCH.zN + 6] }, walk: { x: 15.4, z: CHURCH.zN + 2.5, yaw: 0 },
  },
  {
    id: 'ossuary', cat: 'ecclesia', key: 'B', en: 'The Ossuary', tr: 'Kemik mezarlığı', sub: true,
    text: 'More than ten steps lead down into a corridor with horizontal niches on either side. The bones of generations of monks are sorted by kind: skulls stacked in pyramids so they will not roll, long bones in bundles, and in one niche only hands with their fingers interlaced. The passage runs under the cemetery to the Aedificium. Rats run through it for the kitchen. At its end, beside a blind wall with a worn plaque, steps climb to an iron-clad door.',
    quotes: [
      { tr: 'yuvarlanmamaları için bir çeşit piramit biçiminde', en: '…in a kind of pyramid, so that they would not roll.', ref: 'Second Day, Compline' },
      { tr: 'Bir nişte yalnızca eller… birbirine dolanmış ölü parmaklarıyla', en: 'In one niche only hands, their dead fingers interlaced.', ref: 'Second Day, Compline' },
    ],
    view: { t: [30, -2, -25.6], p: [22, 22, -8] }, walk: { x: 29, z: -25.2, y: -2.8, yaw: -1.8 },
  },
  {
    id: 'treasury', cat: 'ecclesia', key: 'B', en: 'The Treasury Crypt', tr: 'Hazine mahzeni', sub: true,
    text: 'Behind the high altar a small stair goes down to a room with a very low vault on thick, rough columns. In dusty cases are gold crowns, a Gospel cover of emerald plaques and a little temple with columns of lapis. There are relics too: the tip of the Holy Lance on purple, a thorn among dried roses, a unicorn horn and an egg found inside an egg.',
    quotes: [
      { tr: 'kalın, kaba taştan sütunların desteklediği çok alçak tonozlu bir tavanı olan bir odada', en: 'In a room with a very low vaulted ceiling held up by thick, rough stone columns.', ref: 'Sixth Day, Prime' },
    ],
    view: { t: [42.5, -2, zc], p: [36, 12, zc + 10] }, walk: { x: 45.8, z: zc + 0.1, y: -3.0, yaw: Math.PI / 2 },
  },

  // ------------------------------------------------------------------ D F H
  {
    id: 'cloister', cat: 'claustrum', key: 'D', en: 'The Cloister', tr: 'Avlu / Dehliz',
    text: 'Arcaded walks surround a garden with trees. Monks sit on the inner parapet between the columns, whose capitals carry apes, lions and centaurs among leaves. Jorge points them out from the scriptorium window as the very distractions a monk should shun.',
    quotes: [
      { tr: 'Korkuluk duvarının iç kısmının üstüne, iki sütun arasına oturduk', en: 'We sat on the inner side of the parapet, between two columns.', ref: 'Second Day, Lauds' },
    ],
    view: { t: [10, 2, 14], p: [-8, 22, 38] }, walk: { x: -2, z: 5.2, yaw: -Math.PI / 2 - 1.2 },
  },
  {
    id: 'dormitory', cat: 'claustrum', key: 'F', en: 'The Dormitory', tr: 'Yatakhane',
    text: 'The dormitory is east of the cloister and close to the choir. It has an upper and a lower floor. The Rule prescribes a common room, yet each monk has a cell of his own. Jorge\'s opens off the lower corridor. The latrines stand at its end, and a passage leads to the church for the night office.',
    quotes: [
      { tr: 'sağda, koro yerinin yakınında, rahiplerin yatakhane ve helalarının bulunduğu patika', en: 'On the right, near the choir, the path by the monks’ dormitory and latrines.', ref: 'First Day, Vespers' },
    ],
    view: { t: [44, 3, 20], p: [70, 26, 30] }, walk: { x: 44.1, z: 7.4, yaw: Math.PI },
  },
  {
    id: 'chapter', cat: 'claustrum', key: 'H', en: 'The Chapter House', tr: 'Toplantı Salonu',
    text: 'The chapter house was built on the ruins of an old abbey church burnt long ago. An undecorated pointed door with a coloured window leads into a courtyard on the remains of the old narthex. Beyond it the old portal survives. Christ sits between the twelve apostles, under an arch of twelve panels showing the peoples of the world. Around it thirty roundels hold the peoples of unknown lands: sciapods, dog-heads, blemmyes, centaurs, cyclopes.',
    quotes: [
      { tr: 'yeni biçimde, sivri kemerli, süssüz, üstünde renkli camdan bir penceresi olan bir kapı', en: 'A door in the new style, pointed, unadorned, with a coloured window above it.', ref: 'Fifth Day, Prime' },
      { tr: 'on iki panelli kemerin üstünde bir kemer oluşturan otuz yuvarlak içinde', en: '…in thirty roundels forming an arch above the arch of twelve panels.', ref: 'Fifth Day, Prime' },
    ],
    view: { t: [-6, 3, 31], p: [-28, 14, 44] }, walk: { x: CHURCH.x0 - 3.5, z: 31, yaw: -Math.PI / 2 },
  },
  {
    id: 'abbot', cat: 'claustrum', key: '', en: 'The Abbot’s House', tr: 'Başrahibin evi',
    text: 'The Abbot\'s house is one of the buildings around the cloister. His great cold hall is upstairs. From its window, on clear windy days, the outline of the Aedificium shows over the roof of the church. Abbone calls it a beautiful fortress whose proportions follow the golden rule. It has three floors, because three is the number of the Trinity.',
    quotes: [
      { tr: 'geniş, görkemli salonun penceresinden… manastır kilisesinin damı üzerinden Aedificium’un çizgileri görülebiliyordu', en: 'From the window of the large, sumptuous hall… over the church roof, the lines of the Aedificium.', ref: 'Sixth Day, Nones' },
    ],
    note: 'The plan does not letter this building. It is placed in the south range beside the chapter house, which burns “together with the Abbot’s magnificent house”, and its chapel lies below the hall.',
    view: { t: [28, 5, 31], p: [34, 20, 52] }, walk: { x: 31.4, z: 31.6, y: 6.5, yaw: 1.25 },   // in the Abbot's upper hall (claustrum.js abbot(): floor h1 + 0.3 = 6.5), looking past the table to the fireplace and the north windows
  },
  {
    id: 'hospice', cat: 'claustrum', key: '', en: 'The Pilgrims’ Hospice', tr: 'Hacılar Konukevi',
    text: 'Guests reach the hospice by crossing a beautiful flower garden, and outside steps climb to their cells. William\'s cell has a long, wide niche in the wall, filled with fresh straw for Adso\'s bed. On the first day they are brought wine, cheese, olives, bread and fine raisins. From the windows the mass of the Aedificium rises "like a crown above the church".',
    quotes: [
      { tr: 'hücrenin duvarındaki, içine güzel taze saman doldurtarak hazırlattığı uzun ve geniş bir nişte', en: 'In a long, wide niche in the wall of the cell, filled with good fresh straw.', ref: 'First Day, Terce' },
      { tr: 'manastır kilisesinin üstünde bir taç gibi yükselen Aedificium yığını', en: 'The mass of the Aedificium, rising like a crown above the abbey church.', ref: 'First Day, Terce' },
    ],
    view: { t: [-16, 4, 13], p: [-40, 16, 20] }, walk: { x: -18.3, z: 14.7, y: 6.2, yaw: -1.9 },   // William's cell on the raised guest floor (claustrum.js hospice(): boards top h1 + 0.3), just in from the upper door, facing the table and the east window
  },

  // ------------------------------------------------------------------ gardens
  {
    id: 'infirmary', cat: 'horti', key: 'K', en: 'The Infirmary', tr: 'Hastane',
    text: 'Severinus\'s domain is a long ward of beds with a chapel at its end and his laboratory, "an alchemist\'s shop". Shelves beside the door hold rows of bottles, jugs and jars, and twenty or thirty books stand in a corner. There are alembics, a lodestone and, on the table left of the door, an armillary sphere of brass and silver rings.',
    quotes: [
      { tr: 'Kapının yanında, duvara dayalı uzun rafların üstüne... şişe, testi, kavanoz', en: 'Beside the door, on long shelves against the wall… bottles, jugs, jars.', ref: 'Second Day, Matins' },
      { tr: 'pirinç ve gümüşten yapılmış zarif halkalar', en: 'Elegant rings of brass and silver.', ref: 'Fifth Day, Terce' },
    ],
    view: { t: P(139, 194).concat ? [P(139, 194)[0], 2, P(139, 194)[1]] : [0, 0, 0], p: [P(139, 194)[0] + 22, 18, P(139, 194)[1] + 22] }, walk: { x: P(120, 206)[0] + 1.5, z: P(120, 206)[1] + 1.5, yaw: -0.7 },
  },
  {
    id: 'baths', cat: 'horti', key: 'J', en: 'The Baths', tr: 'Hamam',
    text: 'The baths stand beside the infirmary, among the herb beds. Tubs are separated by heavy curtains, and Adso cannot remember how many there were. In front of the hearth with its fresh ashes lies a huge overturned cauldron, and water is drawn from a basin in the corner. The last tub stands behind a drawn curtain.',
    later: 'On the third night Berengar is found drowned in that last tub, behind the drawn curtain.',
    quotes: [
      { tr: 'Birbirinden kalın perdelerle ayrılmış fıçılar vardı; sayısını anımsamıyorum', en: 'There were tubs separated by heavy curtains; I do not remember how many.', ref: 'Third Day, Night' },
      { tr: 'Ocakta taze küller vardı; önünde de tersine çevrilmiş kocaman bir kazan duruyordu.', en: 'There were fresh ashes in the hearth, and before it a huge overturned cauldron.', ref: 'Third Day, Night' },
    ],
    note: 'Four tubs are shown. The narrator gives no number.',
    view: { t: [P(208, 164)[0], 2, P(208, 164)[1]], p: [P(208, 164)[0] + 10, 12, P(208, 164)[1] + 16] }, walk: { x: P(208, 175)[0], z: P(208, 175)[1] + 1, yaw: 0 },
  },
  {
    id: 'gardens', cat: 'horti', key: '', en: 'Botanical & Vegetable Gardens', tr: 'Botanik ve sebze bahçeleri',
    text: 'To the left of the avenue lie the vegetable gardens. The botanical garden follows the curve of the wall around the baths and the infirmary. In winter William names plants by their stems alone: frangula, burdock, valerian. Severinus keeps the dangerous herbs apart. Dry stalks stand up through three fingers of snow.',
    quotes: [
      { tr: 'Yolun solunda, sebze bahçeleriyle kaplı geniş bir alan', en: 'To the left of the road, a wide area of vegetable gardens.', ref: 'First Day, Prime' },
      { tr: 'toprak üç parmak kalınlığını aşmayan soğuk bir örtüyle örtülmüştü', en: 'The ground was covered by a cold blanket no more than three fingers deep.', ref: 'First Day, Prime' },
    ],
    view: { t: [-35, 1, -40], p: [-20, 30, -8] }, walk: { x: P(213, 238)[0], z: P(213, 238)[1], yaw: 0.2 },
  },
  {
    id: 'flower-garden', cat: 'claustrum', key: '', en: 'The Flower Garden', tr: 'Çiçek bahçesi', sub: true,
    text: 'The flower garden lies before the pilgrims\' hospice, as the plan draws it: four hedged beds around a round centre. In late November it is asleep under the snow.',
    quotes: [{ tr: 'Güzel bir çiçek bahçesini geçtikten sonra oraya ulaştık', en: 'We reached it after crossing a beautiful flower garden.', ref: 'First Day, Prime' }],
    view: { t: [-32, 1, 13.5], p: [-40, 14, 30] }, walk: { x: -36, z: 13.5, yaw: -Math.PI / 2 },
  },
  {
    id: 'cemetery', cat: 'horti', key: '', en: 'The Cemetery', tr: 'Mezarlık',
    text: 'The graves lie between the church\'s north side, the Aedificium and the vegetable garden. Some gravestones are freshly set and others are worn by centuries. After supper the monks cross it in a long file to the church\'s north door. An oak stands at its edge, and Benno hid behind its trunk.',
    quotes: [
      { tr: 'mezarlık, kilisenin kuzey yanıyla Aedificium ve sebze bahçesi arasında', en: 'The cemetery, between the north side of the church, the Aedificium and the vegetable garden.', ref: 'First Day, Terce' },
      { tr: 'mezarlığın kıyısındaki bir meşe ağacının gövdesine yaslanmış', en: 'Leaning against the trunk of an oak at the edge of the cemetery.', ref: 'Second Day, Lauds' },
    ],
    view: { t: [38, 1, -24], p: [20, 16, -2] }, walk: { x: 22.0, z: -24.0, yaw: -1.2 },   // among the graves, looking past the four near ones to the Aedificium's tower and the oak at the cemetery's edge
  },

  // ------------------------------------------------------------------ farmyard
  {
    id: 'blood-jar', cat: 'officinae', key: '', en: 'The Jar of Blood', tr: 'Domuz kanı küpü',
    text: 'It is the season of the pig slaughter. Behind the choir, in front of the henhouses, the swineherds stir fresh blood in a huge jar so that it will not clot. In this cold it keeps for days.',
    later: 'On the second morning a man hangs head-down in it, his legs sticking up "almost in a cross", and the snow around is crimson.',
    quotes: [
      { tr: 'Koro yerinin ardında, kümeslerin önünde... büyük küpte', en: 'Behind the choir, in front of the henhouses… in the great jar.', ref: 'Second Day, Matins' },
    ],
    view: { t: [58.8, 1, -11.8], p: [48, 9, -2] }, walk: { x: 55.2, z: -8.2, yaw: -0.8 },
  },
  {
    id: 'stables', cat: 'officinae', key: 'N', en: 'Stables & Folds', tr: 'Ahırlar ve Ağıllar',
    text: 'The granary comes first. Then come the horse stables, whose great door is a metal grille, and Brunellus stands first from the left. After them the ox stables, the henhouses and sheepfolds, and the pigsties. Behind the stables the outer wall is lower. Beyond it the slope falls to the refuse heap under the east tower.',
    quotes: [
      { tr: 'birincisinin ambar olduğunu; sonra at ahırları, sonra öküz ahırları, sonra kümesler ve koyun ağılları', en: 'The first was the granary; then the horse stables, then the ox stables, then henhouses and sheepfolds.', ref: 'First Day, Nones' },
      { tr: 'Ahırların arkasında dış duvarın daha alçak olduğunu', en: 'Behind the stables the outer wall was lower.', ref: 'First Day, Vespers' },
    ],
    view: { t: [94, 2, -25], p: [70, 24, -2] }, walk: { x: 89.6, z: -24.3, yaw: -1.35 },   // squarely before the grille (the great W door), the stalls beyond
  },
  {
    id: 'smithy', cat: 'officinae', key: 'R', en: 'Smithy & Glassworks', tr: 'Demirhane',
    text: 'The smithy stands where the east wall turns north. Smiths work in the front, and in the back glass is blown and leaded for windows. On Nicola\'s bench lie tiny coloured pieces, larger panes lean against the wall, and an unfinished silver reliquary waits to be set with glass. Here the lenses for William\'s new spectacles are ground. There are cells in the cellar.',
    quotes: [
      { tr: 'Doğu duvarının kuzeye doğru döndüğü köşede demirci ocağı', en: 'The forge, at the corner where the east wall turns north.', ref: 'First Day, Vespers' },
      { tr: 'en uygun camlar zümrüt renginde', en: 'The best glass is emerald-coloured.', ref: 'Third Day, Nones' },
    ],
    view: { t: [P(526, 425)[0], 2, P(526, 425)[1]], p: [P(526, 425)[0] - 16, 14, P(526, 425)[1] - 18] }, walk: { x: P(510, 404)[0] + 1.3, z: P(510, 404)[1] - 2.2, yaw: Math.PI - 0.12 },
  },
  {
    id: 'south-range', cat: 'officinae', key: '', en: 'Mills, Presses & Cellars', tr: 'Değirmen, yağhane, mahzenler',
    text: 'Along the south wall stand the peasants\' quarters, the mill where peasants bring wheat and millet, the oil press, the granaries, the cellars and the novices\' house. In the cellars the cooks perfume the wine and brew beer from heather, bog myrtle and wild rosemary.',
    quotes: [
      { tr: 'güney duvarları boyunca…çiftlik, ahırlar, değirmenler, yağhaneler, ambarlar, mahzenler…çömezlerin evi', en: 'Along the south walls… farm, stables, mills, oil presses, granaries, cellars… the novices’ house.', ref: 'First Day, Prime' },
    ],
    note: 'The plan draws these buildings but letters only R. The assignments follow the order Adso gives.',
    view: { t: [5, 2, 55], p: [0, 30, 20] }, walk: { x: 18.9, z: 50.4, yaw: Math.PI },
  },

  // ------------------------------------------------------------------ walls
  {
    id: 'gate', cat: 'moenia', key: '', en: 'The Gate & the Avenue', tr: 'Kapı ve ağaçlı yol',
    text: 'The walls surround the abbey on every side, and the great western gate is their only opening. From it a tree-lined avenue runs straight to the church. The west tower of the Aedificium faces the arriving visitor head-on. At the threshold the Abbot once waited with two novices holding a golden basin of water.',
    quotes: [
      { tr: 'Dış duvarlardaki tek açıklık olan kapıdan sonra', en: 'After the gate, the only opening in the outer walls…', ref: 'First Day, Prime' },
      { tr: 'iki yanına ağaçlar sıralanmış bir yol manastır kilisesine gidiyordu', en: 'A road lined with trees on both sides led to the abbey church.', ref: 'First Day, Prime' },
    ],
    view: { t: [-100, 4, -8.6], p: [-130, 18, 6] }, walk: { x: -98, z: -8.6, yaw: -Math.PI / 2 },
  },
  {
    id: 'road', cat: 'moenia', key: '', en: 'The Goat Path', tr: 'Keçi yolu',
    text: 'A steep path winds round the mountain. At the last bend the road splits in three. Evergreen pines, white with snow, form a natural roof over the upper road. Far to the south the sea shows from some of the bends, ten miles off or less.',
    quotes: [
      { tr: 'Dağın çevresinden dolanan dik keçi yolunu güçlükle tırmanırken manastırı gördüm', en: 'As we struggled up the steep goat path winding round the mountain, I saw the abbey.', ref: 'First Day, Prime' },
      { tr: 'bir dizi yaz kış yeşil çamın bir ara kardan bembeyaz, doğal bir çatı', en: 'A row of evergreen pines, white with snow, a natural roof.', ref: 'First Day, Prime' },
    ],
    view: { t: [-110, -20, 40], p: [-200, 40, 120] }, walk: { x: -135, z: 5, yaw: -0.6, road: true },
  },
];

export const byId = Object.fromEntries(PLACES.map(p => [p.id, p]));

// Following William: the days in order
export const JOURNEY = [
  { id: 'road', day: 'First Day · Prime', hour: 7.6, line: 'A fine morning at the end of November; three fingers of snow.' },
  { id: 'gate', day: 'First Day · Prime', hour: 8.0, line: 'The only gate, and the west tower of the Aedificium ahead.' },
  { id: 'portal', day: 'First Day · Sext', hour: 12.0, line: 'Adso loses himself in the portal.' },
  { id: 'gardens', day: 'First Day · Nones', hour: 14.3, line: 'Severinus among his herbs under the snow.' },
  { id: 'kitchen', day: 'First Day · Nones', hour: 14.6, line: 'Smoke, the oven and the hearth.' },
  { id: 'scriptorium', day: 'First Day · after Nones', hour: 15.2, line: 'Forty windows, forty desks.' },
  { id: 'smithy', day: 'First Day · Vespers', hour: 16.4, line: 'The tour of the grounds at sunset.' },
  { id: 'refectory', day: 'First Day · Compline', hour: 18.2, line: 'Supper by torchlight.' },
  { id: 'nave', day: 'Second Day · Matins', hour: 2.6, line: 'Sixty shadows in the choir.' },
  { id: 'blood-jar', day: 'Second Day · Matins', hour: 5.4, line: 'A man head-down in the jar of blood.' },
  { id: 'skull-chapel', day: 'Second Day · Compline', hour: 19.5, line: 'The fourth skull from the right.' },
  { id: 'ossuary', day: 'Second Day · Night', hour: 21.0, line: 'Through the bones to the kitchen.' },
  { id: 'east-hall', day: 'Second Day · Night', hour: 22.0, line: 'Into the labyrinth.' },
  { id: 'censer', day: 'Second Day · Night', hour: 22.4, line: 'A light that is not a lamp.' },
  { id: 'baths', day: 'Third Day · Night', hour: 1.5, line: 'The last tub, behind the curtain.' },
  { id: 'chapter', day: 'Fifth Day · Prime', hour: 7.8, line: 'The legations meet under the old portal.' },
  { id: 'treasury', day: 'Sixth Day · Prime', hour: 8.4, line: 'The Abbot shows his treasure.' },
  { id: 'abbot', day: 'Sixth Day · Nones', hour: 14.6, line: 'The Aedificium over the church roof.' },
  { id: 'mirror', day: 'Sixth Day · Night', hour: 23.0, line: 'Primum et septimum de quatuor.' },
  { id: 'finis-africae', day: 'Seventh Day · Night', hour: 0.5, line: 'The end of Africa.' },
];
