// Seeds dummy products, coupons, settings and an admin user.
// Usage: npm run seed            (adds missing data, keeps existing)
//        npm run seed -- --fresh (wipes products, coupons, reviews and questions first)
import bcrypt from 'bcryptjs'
import { pathToFileURL } from 'node:url'
import { config } from '../config.js'
import { connectDb, disconnectDb } from '../db.js'
import { Banner, Brand, Category, Coupon, Product, Question, Review, Setting, User } from '../models/index.js'
import { products } from './products.js'
import { Content } from '../siteContent.js'
import { readFileSync } from 'node:fs'

const siteContent = JSON.parse(readFileSync(new URL('./siteContent.json', import.meta.url), 'utf8'))

const groupOf = {
  freestanding: 'bathtub', 'built-in': 'bathtub', whirlpool: 'bathtub', 'tub-spouts': 'bathtub',
  overhead: 'water-tank', loft: 'water-tank', underground: 'water-tank',
  showers: 'bathroom', faucets: 'bathroom', basins: 'bathroom', wc: 'bathroom', vanity: 'bathroom', kitchen: 'bathroom',
  valves: 'plumbing', pipes: 'plumbing', fittings: 'plumbing', drains: 'plumbing',
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const round10 = (n) => Math.round(n / 10) * 10

export const coupons = [
  { code: 'WELCOME10', text: '10% off on your first order, up to ₹1,000', type: 'percent', value: 10, max: 1000, min: 0 },
  { code: 'FLAT500', text: 'Flat ₹500 off on orders above ₹5,000', type: 'flat', value: 500, min: 5000 },
  { code: 'BATH20', text: '20% off up to ₹5,000 on orders above ₹20,000', type: 'percent', value: 20, max: 5000, min: 20000 },
]

const tank = (color) => ({ kind: 'tank', color })

export const categories = [
  { key: 'bathtub', label: 'Bath Tub', text: 'Freestanding, built-in and whirlpool bathtubs', image: 'photo-1620626011761-996317b8d101' },
  { key: 'freestanding', parent: 'bathtub', label: 'Freestanding Bathtubs', image: 'photo-1620626011761-996317b8d101' },
  { key: 'built-in', parent: 'bathtub', label: 'Built-in Bathtubs', image: 'photo-1507652313519-d4e9174996dd' },
  { key: 'whirlpool', parent: 'bathtub', label: 'Whirlpool and Jacuzzi', image: 'photo-1603825491103-bd638b1873b0' },
  { key: 'tub-spouts', parent: 'bathtub', label: 'Tub Spouts and Trims', image: 'photo-1507652313519-d4e9174996dd' },
  { key: 'water-tank', label: 'Water Tank', text: 'Overhead, loft and underground storage tanks', art: tank('#1C1C1C') },
  { key: 'overhead', parent: 'water-tank', label: 'Overhead Tanks', art: tank('#1C1C1C') },
  { key: 'loft', parent: 'water-tank', label: 'Loft Tanks', art: { kind: 'loft', color: '#EDEDED' } },
  { key: 'underground', parent: 'water-tank', label: 'Underground Sump Tanks', art: tank('#1F6FD1') },
  { key: 'bathroom', label: 'Bathroom Products', text: 'Showers, faucets, basins, WCs and vanities', image: 'photo-1584622650111-993a426fbf0a' },
  { key: 'showers', parent: 'bathroom', label: 'Showers', image: 'photo-1584622650111-993a426fbf0a' },
  { key: 'faucets', parent: 'bathroom', label: 'Basin Faucets', image: 'photo-1576698483491-8c43f0862543' },
  { key: 'basins', parent: 'bathroom', label: 'Wash Basins', image: 'photo-1564540583246-934409427776' },
  { key: 'wc', parent: 'bathroom', label: 'WC and Health Faucets', image: 'photo-1631889993959-41b4e9c6e3c5' },
  { key: 'vanity', parent: 'bathroom', label: 'Vanities and Mirrors', image: 'photo-1600488999585-e4364713b90a' },
  { key: 'kitchen', parent: 'bathroom', label: 'Kitchen Faucets and Sinks', image: 'photo-1600566752229-250ed79470f8' },
  { key: 'plumbing', label: 'Plumbing', text: 'Valves, pipes, fittings and drains', image: 'photo-1585704032915-c3400ca199e7' },
  { key: 'valves', parent: 'plumbing', label: 'Valves and Concealed', image: 'photo-1585704032915-c3400ca199e7' },
  { key: 'pipes', parent: 'plumbing', label: 'Pipes', art: { kind: 'pipe', color: '#E9DFC6' } },
  { key: 'fittings', parent: 'plumbing', label: 'Pipe Fittings', art: { kind: 'elbow', color: '#E9DFC6' } },
  { key: 'drains', parent: 'plumbing', label: 'Floor Drains', image: 'photo-1604709177225-055f99402ea3' },
].map((c, order) => ({ parent: null, ...c, order }))

export const brands = [
  { name: 'Delta', note: 'Showers and faucets', color: '#C8102E' },
  { name: 'Grandeur Bath', note: 'Bathtubs and sanitaryware', color: '#AE7714' },
  { name: 'Ishan Tubes', note: 'Pipes and fittings', color: '#1C1C1C' },
  { name: 'AquaMax', note: 'Water storage tanks', color: '#1F6FD1' },
  { name: 'Kami', note: 'Designer trims', color: '#B6713E' },
].map((b, order) => ({ ...b, order }))

export const banners = [
  { placement: 'hero', tag: 'Festive Sale', title: 'Up to 40% off on bathroom makeovers', text: 'Showers, faucets, basins and WCs from top brands with free delivery above ₹999.', image: 'photo-1603825491103-bd638b1873b0', ctaLabel: 'Shop the sale', ctaLink: '/offers' },
  { placement: 'hero', tag: 'New Arrival', title: 'Freestanding bathtubs for a spa at home', text: 'Acrylic oval and slipper tubs with 5 year warranty. No-cost EMI available.', image: 'photo-1620626011761-996317b8d101', ctaLabel: 'Explore bath tubs', ctaLink: '/products?group=bathtub' },
  { placement: 'hero', tag: 'Kitchen Week', title: 'Pull-down faucets and steel sinks', text: 'Flat 15% to 38% off on the kitchen collection, this week only.', image: 'photo-1556912173-3bb406ef7e77', ctaLabel: 'Shop kitchen', ctaLink: '/products?cat=kitchen' },
  { placement: 'side', title: 'Water Tanks', text: 'Triple layer tanks from ₹4,210', art: tank('#1C1C1C'), ctaLink: '/products?group=water-tank', bg: 'from-[#FBF5E8] to-[#F1DFB8]' },
  { placement: 'side', title: 'Plumbing Essentials', text: 'Pipes and fittings up to 40% off', image: 'photo-1585704032915-c3400ca199e7', ctaLink: '/products?group=plumbing', bg: 'from-[#FFF1E8] to-[#FFDCC8]' },
].map((b, order) => ({ ...b, order }))

const reviewNames = ['Rohit S.', 'Ananya K.', 'Vikram P.', 'Sneha M.', 'Arjun R.', 'Pooja T.']
const reviewTexts = [
  'Excellent quality and the finish looks premium. Delivery was quick and packing was very safe.',
  'Exactly as shown in the pictures. My plumber said the fittings are solid and easy to install.',
  'Good value for money. Customer support helped me pick the right size before ordering.',
]

export function productDocs() {
  return products.map((p, i) => ({
    code: p.code,
    slug: slugify(`${p.name}-${p.code}`),
    name: p.name,
    brand: p.brand,
    group: groupOf[p.cat],
    cat: p.cat,
    type: p.type,
    mrp: p.mrp,
    price: round10(p.mrp * (1 - p.off / 100)),
    stock: p.stock,
    sold: p.sold,
    rating: p.rating,
    reviewsCount: p.reviews,
    material: p.material,
    color: p.color,
    size: p.size,
    capacity: p.capacity,
    dims: p.dims,
    weight: p.weight,
    warranty: p.warranty,
    images: p.images || [],
    art: p.art,
    tag: p.tag,
    description: `${p.name} by ${p.brand}. Made from ${p.material.toLowerCase()} in a ${p.color.toLowerCase()} finish, it is built for everyday use in homes, hotels and projects. Every unit is 100% genuine, comes with a ${p.warranty} warranty and a proper GST invoice.`,
    highlights: [`${p.material} body for long life`, `${p.color} finish that is easy to clean`, `${p.warranty} manufacturer warranty`, 'Free installation guidance for your plumber'],
    showOnWebsite: true,
    websiteOrder: i,
    createdAt: new Date(p.added),
  }))
}

export async function seed({ fresh = false, admin = config.admin, log = console.log } = {}) {
  if (fresh) await Promise.all([Product.deleteMany({}), Coupon.deleteMany({}), Review.deleteMany({}), Question.deleteMany({}), Category.deleteMany({}), Brand.deleteMany({}), Banner.deleteMany({})])

  let added = 0
  for (const doc of productDocs()) {
    const res = await Product.updateOne({ code: doc.code }, { $setOnInsert: doc }, { upsert: true, timestamps: false })
    if (res.upsertedCount) {
      added += 1
      await Review.insertMany(
        [0, 1].map((n) => ({ product: doc.slug, name: reviewNames[(added + n) % reviewNames.length], rating: 5 - n, text: reviewTexts[(added + n) % reviewTexts.length], verified: true })),
      )
      await Question.create({ product: doc.slug, q: 'Will I get a GST invoice?', a: 'Yes, every order comes with a GST invoice. Add your GSTIN at checkout to claim input tax credit.' })
    }
  }
  for (const c of coupons) await Coupon.updateOne({ code: c.code }, { $setOnInsert: c }, { upsert: true })
  for (const c of categories) await Category.updateOne({ key: c.key }, { $setOnInsert: c }, { upsert: true })
  for (const b of brands) await Brand.updateOne({ name: b.name }, { $setOnInsert: b }, { upsert: true })
  if (!(await Banner.exists({}))) await Banner.insertMany(banners)
  // Website content blocks: only added when missing, so admin edits are never overwritten
  for (const [key, value] of Object.entries(siteContent)) await Content.updateOne({ key }, { $setOnInsert: { key, value } }, { upsert: true })
  await Setting.updateOne({ key: 'website' }, { $setOnInsert: { key: 'website', maxWebsiteProducts: 0 } }, { upsert: true })

  if (admin?.email && admin?.password) {
    const exists = await User.findOne({ email: admin.email.toLowerCase() })
    if (!exists) {
      await User.create({ name: 'Store Admin', mobile: '9000000000', email: admin.email, passwordHash: await bcrypt.hash(admin.password, 10), role: 'admin' })
      log(`Admin user created: ${admin.email}`)
    }
  } else {
    log('Skipped admin user: set ADMIN_EMAIL and ADMIN_PASSWORD in .env to create one.')
  }

  log(`Seed done. ${added} new products (${await Product.countDocuments()} total), ${coupons.length} coupons, ${categories.length} categories, ${brands.length} brands, ${banners.length} banners, ${Object.keys(siteContent).length} content blocks.`)
}

// Run directly: node src/seed/seed.js
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await connectDb(config.mongoUri)
  await seed({ fresh: process.argv.includes('--fresh') })
  await disconnectDb()
}
