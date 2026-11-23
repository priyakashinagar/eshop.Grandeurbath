// Store catalogue. Products are loaded from the backend (GET /api/products) in main.jsx;
// the dummy list below is only used when the API cannot be reached.

export const delivery = { freeAbove: 999, charge: 99, codLimit: 50000, gstRate: 18 }

// Top-level groups shown in the navigation, each with its sub-categories
export const groups = [
  {
    key: 'bathtub',
    label: 'Bath Tub',
    icon: 'bathtub',
    img: 'photo-1620626011761-996317b8d101',
    text: 'Freestanding, built-in and whirlpool bathtubs',
    subs: [
      { key: 'freestanding', label: 'Freestanding Bathtubs', img: 'photo-1620626011761-996317b8d101' },
      { key: 'built-in', label: 'Built-in Bathtubs', img: 'photo-1507652313519-d4e9174996dd' },
      { key: 'whirlpool', label: 'Whirlpool and Jacuzzi', img: 'photo-1603825491103-bd638b1873b0' },
      { key: 'tub-spouts', label: 'Tub Spouts and Trims', img: 'photo-1507652313519-d4e9174996dd' },
    ],
  },
  {
    key: 'water-tank',
    label: 'Water Tank',
    icon: 'water',
    art: { kind: 'tank', color: '#1C1C1C' },
    text: 'Overhead, loft and underground storage tanks',
    subs: [
      { key: 'overhead', label: 'Overhead Tanks', art: { kind: 'tank', color: '#1C1C1C' } },
      { key: 'loft', label: 'Loft Tanks', art: { kind: 'loft', color: '#EDEDED' } },
      { key: 'underground', label: 'Underground Sump Tanks', art: { kind: 'tank', color: '#1F6FD1' } },
    ],
  },
  {
    key: 'bathroom',
    label: 'Bathroom Products',
    icon: 'shower',
    img: 'photo-1584622650111-993a426fbf0a',
    text: 'Showers, faucets, basins, WCs and vanities',
    subs: [
      { key: 'showers', label: 'Showers', img: 'photo-1584622650111-993a426fbf0a' },
      { key: 'faucets', label: 'Basin Faucets', img: 'photo-1576698483491-8c43f0862543' },
      { key: 'basins', label: 'Wash Basins', img: 'photo-1564540583246-934409427776' },
      { key: 'wc', label: 'WC and Health Faucets', img: 'photo-1631889993959-41b4e9c6e3c5' },
      { key: 'vanity', label: 'Vanities and Mirrors', img: 'photo-1600488999585-e4364713b90a' },
      { key: 'kitchen', label: 'Kitchen Faucets and Sinks', img: 'photo-1600566752229-250ed79470f8' },
    ],
  },
  {
    key: 'plumbing',
    label: 'Plumbing',
    icon: 'wrench',
    img: 'photo-1585704032915-c3400ca199e7',
    text: 'Valves, pipes, fittings and drains',
    subs: [
      { key: 'valves', label: 'Valves and Concealed', img: 'photo-1585704032915-c3400ca199e7' },
      { key: 'pipes', label: 'Pipes', art: { kind: 'pipe', color: '#E9DFC6' } },
      { key: 'fittings', label: 'Pipe Fittings', art: { kind: 'elbow', color: '#E9DFC6' } },
      { key: 'drains', label: 'Floor Drains', img: 'photo-1604709177225-055f99402ea3' },
    ],
  },
]

export const subcategories = groups.flatMap((g) => g.subs.map((s) => ({ ...s, group: g.key, groupLabel: g.label })))
export const findGroup = (key) => groups.find((g) => g.key === key)
export const findSub = (key) => subcategories.find((s) => s.key === key)

export const brands = [
  { name: 'Delta', note: 'Showers and faucets', color: '#C8102E' },
  { name: 'Grandeur Bath', note: 'Bathtubs and sanitaryware', color: '#AE7714' },
  { name: 'Ishan Tubes', note: 'Pipes and fittings', color: '#1C1C1C' },
  { name: 'AquaMax', note: 'Water storage tanks', color: '#1F6FD1' },
  { name: 'Kami', note: 'Designer trims', color: '#B6713E' },
]

const day = (d) => new Date(Date.UTC(2026, 0, 1) + d * 864e5).toISOString().slice(0, 10)
const round10 = (n) => Math.round(n / 10) * 10

const raw = [
  // Bathroom: showers
  { code: 'ISH1118', name: 'Delta 10 inch H2Okinetic Rain Shower', brand: 'Delta', cat: 'showers', type: 'Rain Shower', mrp: 21100, off: 20, rating: 4.7, reviews: 214, stock: 26, sold: 940, added: day(40), material: 'Brass', color: 'Chrome', size: '10 inch', dims: [254, 254, 45], weight: 1.8, warranty: '5 years', images: ['photo-1584622650111-993a426fbf0a', 'photo-1552321554-5fefe8c9ef14', 'photo-1600566752355-35792bedcfea'], tag: 'Bestseller' },
  { code: 'S777', name: 'Delta 5 inch Multi-Function Handshower with Mist Spray', brand: 'Delta', cat: 'showers', type: 'Hand Shower', mrp: 15900, off: 18, rating: 4.5, reviews: 96, stock: 14, sold: 520, added: day(120), material: 'ABS and Brass', color: 'Chrome', size: '5 inch', dims: [127, 127, 240], weight: 0.6, warranty: '5 years', images: ['photo-1629079447777-1e605162dc8d', 'photo-1584622650111-993a426fbf0a'] },
  { code: 'RP70171PR', name: 'Single Function 6 inch Square Showerhead with H2Okinetic', brand: 'Delta', cat: 'showers', type: 'Overhead Shower', mrp: 14000, off: 15, rating: 4.4, reviews: 41, stock: 9, sold: 210, added: day(300), material: 'Brass', color: 'Polished Chrome', size: '6 inch', dims: [152, 152, 40], weight: 0.9, warranty: '5 years', images: ['photo-1552321554-5fefe8c9ef14', 'photo-1629079447777-1e605162dc8d'], tag: 'New' },
  { code: 'RP49139', name: 'Delta Wall-Mount Shower Arm', brand: 'Delta', cat: 'showers', type: 'Shower Arm', mrp: 2830, off: 10, rating: 4.3, reviews: 58, stock: 40, sold: 610, added: day(60), material: 'Brass', color: 'Chrome', size: '12 inch', dims: [305, 30, 60], weight: 0.4, warranty: '3 years', images: ['photo-1600566752355-35792bedcfea'] },
  { code: 'U4993-PK', name: 'Delta 6 inch Shower Arm with Round Flange', brand: 'Delta', cat: 'showers', type: 'Shower Arm', mrp: 1145, off: 8, rating: 4.2, reviews: 33, stock: 3, sold: 300, added: day(20), material: 'Brass', color: 'Chrome', size: '6 inch', dims: [152, 60, 60], weight: 0.3, warranty: '3 years', images: ['photo-1604709177225-055f99402ea3'] },

  // Bathroom: faucets, basins, WC, vanity, kitchen
  { code: 'T31339-WL', name: 'Kami Single-Handle Wall-Mount Basin Faucet Trim', brand: 'Kami', cat: 'faucets', type: 'Wall-Mount Faucet', mrp: 15900, off: 20, rating: 4.6, reviews: 122, stock: 18, sold: 700, added: day(90), material: 'Brass', color: 'Chrome', size: '8 inch spout', dims: [203, 70, 90], weight: 1.2, warranty: '5 years', images: ['photo-1595514535415-dae8580c416c', 'photo-1576698483491-8c43f0862543'], tag: 'Bestseller' },
  { code: 'GB-BF201', name: 'Grandeur Mono Basin Mixer Tall Body', brand: 'Grandeur Bath', cat: 'faucets', type: 'Deck-Mount Faucet', mrp: 9800, off: 35, rating: 4.5, reviews: 64, stock: 22, sold: 480, added: day(310), material: 'Brass', color: 'Matte Black', size: '12 inch', dims: [180, 50, 305], weight: 1.4, warranty: '7 years', images: ['photo-1576698483491-8c43f0862543', 'photo-1595514535415-dae8580c416c'], tag: 'New' },
  { code: 'GB-CB450', name: 'Grandeur Round Counter-top Wash Basin 450 mm', brand: 'Grandeur Bath', cat: 'basins', type: 'Counter-top Basin', mrp: 8900, off: 40, rating: 4.4, reviews: 88, stock: 30, sold: 650, added: day(150), material: 'Ceramic', color: 'White', size: '450 mm', dims: [450, 450, 140], weight: 9.5, warranty: '10 years', images: ['photo-1564540583246-934409427776', 'photo-1600488999585-e4364713b90a'] },
  { code: 'GB-WB600', name: 'Grandeur Wall-hung Wash Basin 600 mm', brand: 'Grandeur Bath', cat: 'basins', type: 'Wall-hung Basin', mrp: 6500, off: 30, rating: 4.1, reviews: 27, stock: 0, sold: 190, added: day(80), material: 'Ceramic', color: 'Matte Black', size: '600 mm', dims: [600, 420, 160], weight: 12, warranty: '10 years', images: ['photo-1595514535415-dae8580c416c'] },
  { code: '22901-I', name: 'Contemporary Health Faucet with Hose', brand: 'Delta', cat: 'wc', type: 'Health Faucet', mrp: 2780, off: 12, rating: 4.3, reviews: 150, stock: 60, sold: 1300, added: day(30), material: 'ABS and Brass', color: 'Chrome', size: 'Standard', dims: [190, 50, 40], weight: 0.5, warranty: '3 years', images: ['photo-1631889993959-41b4e9c6e3c5'] },
  { code: 'GB-WH520', name: 'Grandeur Rimless Wall-hung WC with Soft-close Seat', brand: 'Grandeur Bath', cat: 'wc', type: 'Wall-hung WC', mrp: 32000, off: 35, rating: 4.6, reviews: 73, stock: 7, sold: 260, added: day(305), material: 'Ceramic', color: 'White', size: '520 mm', dims: [520, 360, 350], weight: 22, warranty: '10 years', images: ['photo-1631889993959-41b4e9c6e3c5', 'photo-1600566752355-35792bedcfea'], tag: 'New' },
  { code: 'GB-VU800', name: 'Grandeur 800 mm Floating Vanity Unit with Basin', brand: 'Grandeur Bath', cat: 'vanity', type: 'Vanity Unit', mrp: 46000, off: 30, rating: 4.5, reviews: 39, stock: 5, sold: 140, added: day(200), material: 'Plywood and Ceramic', color: 'Walnut', size: '800 mm', dims: [800, 480, 500], weight: 34, warranty: '2 years', images: ['photo-1600488999585-e4364713b90a', 'photo-1564540583246-934409427776'] },
  { code: '91355', name: 'Delta Ixa Jive Pull-Down Kitchen Faucet', brand: 'Delta', cat: 'kitchen', type: 'Kitchen Faucet', mrp: 17600, off: 15, rating: 4.7, reviews: 110, stock: 12, sold: 560, added: day(100), material: 'Brass', color: 'Chrome', size: '16 inch', dims: [230, 60, 410], weight: 2.1, warranty: '5 years', images: ['photo-1600566752229-250ed79470f8', 'photo-1556911220-bff31c812dba'], tag: 'Premium' },
  { code: 'GB-KS3218', name: 'Grandeur Stainless Steel Kitchen Sink 32 x 18 inch', brand: 'Grandeur Bath', cat: 'kitchen', type: 'Kitchen Sink', mrp: 14500, off: 38, rating: 4.4, reviews: 95, stock: 16, sold: 420, added: day(250), material: 'Stainless Steel 304', color: 'Satin Steel', size: '32 x 18 inch', dims: [813, 457, 230], weight: 8, warranty: '10 years', images: ['photo-1556912173-3bb406ef7e77', 'photo-1600566752229-250ed79470f8'] },

  // Bath tubs
  { code: 'GB-FT1700', name: 'Grandeur Oval Freestanding Bathtub 1700 mm', brand: 'Grandeur Bath', cat: 'freestanding', type: 'Freestanding Bathtub', mrp: 124000, off: 25, rating: 4.8, reviews: 46, stock: 4, sold: 90, added: day(290), material: 'Acrylic', color: 'White', size: '1700 mm', capacity: '230 L', dims: [1700, 800, 600], weight: 42, warranty: '5 years', images: ['photo-1620626011761-996317b8d101', 'photo-1603825491103-bd638b1873b0'], tag: 'Premium' },
  { code: 'GB-FT1500', name: 'Grandeur Slipper Freestanding Bathtub 1500 mm', brand: 'Grandeur Bath', cat: 'freestanding', type: 'Freestanding Bathtub', mrp: 98000, off: 22, rating: 4.6, reviews: 61, stock: 6, sold: 150, added: day(110), material: 'Acrylic', color: 'White', size: '1500 mm', capacity: '190 L', dims: [1500, 750, 620], weight: 36, warranty: '5 years', images: ['photo-1603825491103-bd638b1873b0', 'photo-1620626011761-996317b8d101'], tag: 'Bestseller' },
  { code: 'GB-BT1600', name: 'Grandeur Built-in Rectangular Bathtub 1600 mm', brand: 'Grandeur Bath', cat: 'built-in', type: 'Built-in Bathtub', mrp: 54000, off: 30, rating: 4.3, reviews: 28, stock: 8, sold: 75, added: day(170), material: 'Acrylic', color: 'White', size: '1600 mm', capacity: '200 L', dims: [1600, 750, 560], weight: 30, warranty: '5 years', images: ['photo-1507652313519-d4e9174996dd', 'photo-1620626011761-996317b8d101'] },
  { code: 'GB-WP1800', name: 'Grandeur Whirlpool Jacuzzi Bathtub with 6 Jets', brand: 'Grandeur Bath', cat: 'whirlpool', type: 'Whirlpool Bathtub', mrp: 215000, off: 28, rating: 4.7, reviews: 19, stock: 2, sold: 40, added: day(315), material: 'Acrylic', color: 'White', size: '1800 mm', capacity: '320 L', dims: [1800, 900, 650], weight: 68, warranty: '3 years', images: ['photo-1603825491103-bd638b1873b0', 'photo-1507652313519-d4e9174996dd'], tag: 'New' },
  { code: 'T853339', name: 'Kami In-Wall Tub and Shower Trim', brand: 'Kami', cat: 'tub-spouts', type: 'Tub and Shower Trim', mrp: 7420, off: 15, rating: 4.4, reviews: 37, stock: 15, sold: 230, added: day(70), material: 'Brass', color: 'Chrome', size: 'Standard', dims: [180, 180, 80], weight: 1.1, warranty: '5 years', images: ['photo-1603825491103-bd638b1873b0'] },
  { code: 'ITS62339', name: 'Kami Tub Spout with Diverter to Handshower', brand: 'Kami', cat: 'tub-spouts', type: 'Tub Spout', mrp: 10100, off: 18, rating: 4.5, reviews: 52, stock: 11, sold: 300, added: day(140), material: 'Brass', color: 'Chrome', size: '8 inch', dims: [203, 60, 70], weight: 1.3, warranty: '5 years', images: ['photo-1507652313519-d4e9174996dd'] },
  { code: 'ITS61339', name: 'Kami Wall-Mount Tub Spout', brand: 'Kami', cat: 'tub-spouts', type: 'Tub Spout', mrp: 7400, off: 12, rating: 4.2, reviews: 24, stock: 20, sold: 190, added: day(50), material: 'Brass', color: 'Chrome', size: '7 inch', dims: [178, 55, 60], weight: 1, warranty: '5 years', images: ['photo-1620626011761-996317b8d101'] },

  // Water tanks
  { code: 'AQ-OT500', name: 'AquaMax Triple Layer Overhead Water Tank 500 L', brand: 'AquaMax', cat: 'overhead', type: 'Overhead Tank', mrp: 5400, off: 22, rating: 4.4, reviews: 180, stock: 50, sold: 1500, added: day(130), material: 'LLDPE', color: 'Black', size: '500 L', capacity: '500 L', dims: [860, 860, 1040], weight: 11, warranty: '10 years', art: { kind: 'tank', color: '#1C1C1C' } },
  { code: 'AQ-OT1000', name: 'AquaMax Triple Layer Overhead Water Tank 1000 L', brand: 'AquaMax', cat: 'overhead', type: 'Overhead Tank', mrp: 9800, off: 25, rating: 4.6, reviews: 260, stock: 34, sold: 2100, added: day(130), material: 'LLDPE', color: 'Black', size: '1000 L', capacity: '1000 L', dims: [1080, 1080, 1290], weight: 19, warranty: '10 years', art: { kind: 'tank', color: '#1C1C1C' }, tag: 'Bestseller' },
  { code: 'AQ-OT2000', name: 'AquaMax Triple Layer Overhead Water Tank 2000 L', brand: 'AquaMax', cat: 'overhead', type: 'Overhead Tank', mrp: 18900, off: 24, rating: 4.5, reviews: 140, stock: 12, sold: 860, added: day(160), material: 'LLDPE', color: 'Black', size: '2000 L', capacity: '2000 L', dims: [1380, 1380, 1580], weight: 35, warranty: '10 years', art: { kind: 'tank', color: '#1C1C1C' } },
  { code: 'AQ-IT1000', name: 'AquaMax Insulated 4 Layer Water Tank 1000 L', brand: 'AquaMax', cat: 'overhead', type: 'Insulated Tank', mrp: 12900, off: 15, rating: 4.7, reviews: 55, stock: 10, sold: 230, added: day(318), material: 'LLDPE with PUF', color: 'White', size: '1000 L', capacity: '1000 L', dims: [1100, 1100, 1300], weight: 24, warranty: '10 years', art: { kind: 'tank', color: '#EFEFEF' }, tag: 'New' },
  { code: 'AQ-LT300', name: 'AquaMax Loft Water Tank 300 L', brand: 'AquaMax', cat: 'loft', type: 'Loft Tank', mrp: 3900, off: 20, rating: 4.2, reviews: 77, stock: 25, sold: 640, added: day(90), material: 'LLDPE', color: 'White', size: '300 L', capacity: '300 L', dims: [1200, 600, 520], weight: 9, warranty: '7 years', art: { kind: 'loft', color: '#EDEDED' } },
  { code: 'AQ-UG3000', name: 'AquaMax Underground Sump Tank 3000 L', brand: 'AquaMax', cat: 'underground', type: 'Underground Tank', mrp: 32000, off: 18, rating: 4.3, reviews: 31, stock: 4, sold: 120, added: day(210), material: 'LLDPE', color: 'Blue', size: '3000 L', capacity: '3000 L', dims: [1600, 1600, 1750], weight: 62, warranty: '10 years', art: { kind: 'tank', color: '#1F6FD1' } },

  // Plumbing
  { code: 'T75002', name: 'Korby Concealed Stop Valve Trim 1/2 and 3/4 inch', brand: 'Delta', cat: 'valves', type: 'Stop Valve', mrp: 1550, off: 10, rating: 4.2, reviews: 44, stock: 35, sold: 410, added: day(40), material: 'Brass', color: 'Chrome', size: '1/2 inch', dims: [80, 80, 60], weight: 0.3, warranty: '3 years', images: ['photo-1585704032915-c3400ca199e7'] },
  { code: 'IAO36005', name: 'Rectangular Quarter-Turn Angle Valve with Flange', brand: 'Kami', cat: 'valves', type: 'Angle Valve', mrp: 1810, off: 12, rating: 4.4, reviews: 92, stock: 48, sold: 980, added: day(75), material: 'Brass', color: 'Chrome', size: '1/2 inch', dims: [70, 50, 60], weight: 0.25, warranty: '3 years', images: ['photo-1576698483491-8c43f0862543'] },
  { code: 'GB-AV15', name: 'Grandeur Brass Angle Valve 1/2 inch (Pack of 2)', brand: 'Grandeur Bath', cat: 'valves', type: 'Angle Valve', mrp: 1600, off: 40, rating: 4.1, reviews: 210, stock: 120, sold: 2600, added: day(240), material: 'Brass', color: 'Chrome', size: '1/2 inch', dims: [65, 45, 55], weight: 0.4, warranty: '2 years', images: ['photo-1585704032915-c3400ca199e7'] },
  { code: 'IT-CP25', name: 'Ishan CPVC Pipe 1 inch SDR 11 (3 m length)', brand: 'Ishan Tubes', cat: 'pipes', type: 'CPVC Pipe', mrp: 780, off: 15, rating: 4.5, reviews: 320, stock: 400, sold: 5200, added: day(20), material: 'CPVC', color: 'Off White', size: '1 inch', dims: [3000, 32, 32], weight: 1.2, warranty: '10 years', art: { kind: 'pipe', color: '#E9DFC6' }, tag: 'Bestseller' },
  { code: 'IT-UP110', name: 'Ishan uPVC SWR Pipe 4 inch (3 m length)', brand: 'Ishan Tubes', cat: 'pipes', type: 'uPVC Pipe', mrp: 1450, off: 12, rating: 4.3, reviews: 140, stock: 220, sold: 1800, added: day(60), material: 'uPVC', color: 'Grey', size: '4 inch', dims: [3000, 110, 110], weight: 4.5, warranty: '10 years', art: { kind: 'pipe', color: '#9AA0A6' } },
  { code: 'IT-PPR25', name: 'Ishan PPR Hot and Cold Water Pipe 25 mm (4 m length)', brand: 'Ishan Tubes', cat: 'pipes', type: 'PPR Pipe', mrp: 960, off: 18, rating: 4.4, reviews: 85, stock: 160, sold: 900, added: day(312), material: 'PPR', color: 'Green', size: '25 mm', dims: [4000, 25, 25], weight: 1.6, warranty: '10 years', art: { kind: 'pipe', color: '#3DAA5C' }, tag: 'New' },
  { code: 'IT-EL25', name: 'Ishan CPVC Elbow 90 degree 1 inch (Pack of 10)', brand: 'Ishan Tubes', cat: 'fittings', type: 'Elbow', mrp: 420, off: 10, rating: 4.3, reviews: 66, stock: 300, sold: 2400, added: day(20), material: 'CPVC', color: 'Off White', size: '1 inch', dims: [45, 45, 32], weight: 0.3, warranty: '10 years', art: { kind: 'elbow', color: '#E9DFC6' } },
  { code: 'IT-TE25', name: 'Ishan CPVC Equal Tee 1 inch (Pack of 10)', brand: 'Ishan Tubes', cat: 'fittings', type: 'Tee', mrp: 520, off: 10, rating: 4.2, reviews: 38, stock: 260, sold: 1300, added: day(25), material: 'CPVC', color: 'Off White', size: '1 inch', dims: [60, 45, 32], weight: 0.35, warranty: '10 years', art: { kind: 'elbow', color: '#E9DFC6' } },
  { code: 'GB-FD5', name: 'Grandeur Anti-Cockroach Floor Drain 5 x 5 inch', brand: 'Grandeur Bath', cat: 'drains', type: 'Floor Drain', mrp: 1290, off: 30, rating: 4.4, reviews: 115, stock: 70, sold: 1100, added: day(190), material: 'Stainless Steel 304', color: 'Satin Steel', size: '5 x 5 inch', dims: [127, 127, 40], weight: 0.35, warranty: '5 years', images: ['photo-1604709177225-055f99402ea3'] },
]

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const fallbackProducts = raw.map((p) => {
  const sub = findSub(p.cat)
  const price = round10(p.mrp * (1 - p.off / 100))
  return {
    ...p,
    id: slug(`${p.name}-${p.code}`),
    group: sub.group,
    price,
    off: Math.round(((p.mrp - price) / p.mrp) * 100),
    images: p.images || [],
    // kept for older components (quote list) that read a single photo and finish
    img: p.images?.[0],
    finish: p.color,
    desc: `${p.name} by ${p.brand}. Made from ${p.material.toLowerCase()} in a ${p.color.toLowerCase()} finish, it is built for everyday use in homes, hotels and projects. Every unit is 100% genuine, comes with a ${p.warranty} warranty and a proper GST invoice.`,
    highlights: [
      `${p.material} body for long life`,
      `${p.color} finish that is easy to clean`,
      `${p.warranty} manufacturer warranty`,
      'Free installation guidance for your plumber',
    ],
  }
})

// Filled once at start-up. The array is updated in place so every import sees the same list.
export const products = []
export const catalogSource = { from: 'fallback' }

export function setCatalog(list, from = 'api') {
  products.splice(0, products.length, ...(list?.length ? list : fallbackProducts))
  catalogSource.from = list?.length ? from : 'fallback'
}

export const findProduct = (id) => products.find((p) => p.id === id || p.code === id)

// Hero and promo banners for the home page
export const heroSlides = [
  {
    img: 'photo-1603825491103-bd638b1873b0',
    tag: 'Festive Sale',
    title: 'Up to 40% off on bathroom makeovers',
    text: 'Showers, faucets, basins and WCs from top brands with free delivery above ₹999.',
    cta: { label: 'Shop the sale', to: '/offers' },
  },
  {
    img: 'photo-1620626011761-996317b8d101',
    tag: 'New Arrival',
    title: 'Freestanding bathtubs for a spa at home',
    text: 'Acrylic oval and slipper tubs with 5 year warranty. No-cost EMI available.',
    cta: { label: 'Explore bath tubs', to: '/products?group=bathtub' },
  },
  {
    img: 'photo-1556912173-3bb406ef7e77',
    tag: 'Kitchen Week',
    title: 'Pull-down faucets and steel sinks',
    text: 'Flat 15% to 38% off on the kitchen collection, this week only.',
    cta: { label: 'Shop kitchen', to: '/products?cat=kitchen' },
  },
]

export const sideBanners = [
  { title: 'Water Tanks', text: 'Triple layer tanks from ₹4,210', to: '/products?group=water-tank', art: { kind: 'tank', color: '#1C1C1C' }, bg: 'from-[#FBF5E8] to-[#F1DFB8]' },
  { title: 'Plumbing Essentials', text: 'Pipes and fittings up to 40% off', to: '/products?group=plumbing', img: 'photo-1585704032915-c3400ca199e7', bg: 'from-[#FFF1E8] to-[#FFDCC8]' },
]

export const trustBadges = [
  { icon: 'delivery', title: 'Free Shipping', text: 'On orders above ₹999' },
  { icon: 'approval', title: 'Secure Payment', text: 'UPI, cards and net banking' },
  { icon: 'guarantee', title: '100% Genuine', text: 'Manufacturer warranty' },
  { icon: 'package', title: 'Easy Returns', text: '7 day replacement' },
  { icon: 'receipt', title: 'GST Billing', text: 'Claim input tax credit' },
]

export const coupons = [
  { code: 'WELCOME10', text: '10% off on your first order, up to ₹1,000', type: 'percent', value: 10, max: 1000, min: 0 },
  { code: 'FLAT500', text: 'Flat ₹500 off on orders above ₹5,000', type: 'flat', value: 500, min: 5000 },
  { code: 'BATH20', text: '20% off up to ₹5,000 on orders above ₹20,000', type: 'percent', value: 20, max: 5000, min: 20000 },
]

export const combos = [
  { title: 'Complete Shower Set', text: 'Rain shower, shower arm and hand shower', items: ['ISH1118', 'RP49139', 'S777'], extra: 8 },
  { title: 'Bathtub Starter Kit', text: 'Freestanding tub with tub spout and trim', items: ['GB-FT1500', 'ITS62339', 'T853339'], extra: 5 },
  { title: 'Tank Plumbing Pack', text: '1000 L tank with CPVC pipes and elbows', items: ['AQ-OT1000', 'IT-CP25', 'IT-EL25'], extra: 6 },
]

const names = ['Rohit S.', 'Ananya K.', 'Vikram P.', 'Sneha M.', 'Arjun R.', 'Pooja T.', 'Karan D.', 'Meera J.']
const texts = [
  'Excellent quality and the finish looks premium. Delivery was quick and packing was very safe.',
  'Exactly as shown in the pictures. My plumber said the fittings are solid and easy to install.',
  'Good value for money. Customer support helped me pick the right size before ordering.',
  'Using it for a few months now, no issues at all. Would buy again from this store.',
  'Product is good but delivery took one extra day. Overall happy with the purchase.',
]

export const reviewsFor = (p) => {
  const n = p.code.length + p.mrp
  return [0, 1, 2].map((i) => ({
    id: `${p.code}-${i}`,
    name: names[(n + i * 3) % names.length],
    rating: i === 2 ? 4 : 5,
    date: day(250 + ((n + i * 17) % 60)),
    text: texts[(n + i) % texts.length],
    verified: true,
  }))
}

export const questionsFor = (p) => [
  { q: 'Does it come with installation?', a: 'We share installation guidance and our team can guide your plumber on call. On-site installation is available in Delhi NCR on request.' },
  { q: `What is the warranty on this ${p.type.toLowerCase()}?`, a: `It has a ${p.warranty} manufacturer warranty from the date of invoice.` },
  { q: 'Will I get a GST invoice?', a: 'Yes, every order comes with a GST invoice. Add your GSTIN at checkout to claim input tax credit.' },
]

export const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep',
]
