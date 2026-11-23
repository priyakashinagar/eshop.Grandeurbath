// Seeds dummy products, coupons, settings and an admin user.
// Usage: npm run seed            (adds missing data, keeps existing)
//        npm run seed -- --fresh (wipes products, coupons, reviews and questions first)
import bcrypt from 'bcryptjs'
import { pathToFileURL } from 'node:url'
import { config } from '../config.js'
import { connectDb, disconnectDb } from '../db.js'
import { Coupon, Product, Question, Review, Setting, User } from '../models/index.js'
import { products } from './products.js'

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
  if (fresh) await Promise.all([Product.deleteMany({}), Coupon.deleteMany({}), Review.deleteMany({}), Question.deleteMany({})])

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

  log(`Seed done. ${added} new products (${await Product.countDocuments()} total), ${coupons.length} coupons.`)
}

// Run directly: node src/seed/seed.js
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await connectDb(config.mongoUri)
  await seed({ fresh: process.argv.includes('--fresh') })
  await disconnectDb()
}
