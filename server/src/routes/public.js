import { Router } from 'express'
import { z } from 'zod'
import { Banner, Brand, Category, Coupon, Enquiry, Question, Review, Subscriber, Product } from '../models/index.js'
import { HttpError, optionalAuth, rules, validate } from '../middleware.js'
import { checkPincode, couponDiscount, findWebsiteProduct, getWebsiteSettings, websiteProducts } from '../services.js'
import { emit } from '../events.js'
import { CONTENT_KEYS, getAllContent, getContent } from '../siteContent.js'
import { paymentMode } from '../config.js'

const r = Router()

/* Products: only the ones the admin allows on the website */

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  group: z.string().trim().max(40).optional(),
  cat: z.string().trim().max(40).optional(),
  brand: z.string().trim().max(300).optional(), // comma separated
  type: z.string().trim().max(300).optional(),
  material: z.string().trim().max(300).optional(),
  color: z.string().trim().max(300).optional(),
  min: z.coerce.number().min(0).optional(),
  max: z.coerce.number().min(0).optional(),
  inStock: z.enum(['1', 'true']).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  tag: z.string().trim().max(30).optional(),
  sort: z.enum(['relevance', 'price-asc', 'price-desc', 'popular', 'newest', 'rating', 'discount']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

const sorters = {
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  popular: (a, b) => b.sold - a.sold,
  newest: (a, b) => b.createdAt - a.createdAt,
  rating: (a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount,
  discount: (a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp,
}

const listOf = (v) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean) : [])
const counts = (list, key) => Object.entries(list.reduce((m, p) => (p[key] ? { ...m, [p[key]]: (m[p[key]] || 0) + 1 } : m), {})).map(([value, count]) => ({ value, count }))

// GET /products: only what the admin allows. With no query it returns the whole allowed list (the website
// filters in the browser); with query params it filters, sorts and pages on the server and adds filter counts.
r.get('/products', validate(listQuery, 'query'), async (req, res) => {
  const f = req.validQuery
  let list = await websiteProducts()
  if (!Object.keys(f).length) return res.json({ ok: true, total: list.length, products: list.map((p) => p.toPublic()) })

  if (f.q) {
    const words = f.q.toLowerCase().split(/s+/)
    list = list.filter((p) => words.every((w) => `${p.name} ${p.code} ${p.brand} ${p.type} ${p.cat} ${p.material} ${p.color}`.toLowerCase().includes(w)))
  }
  if (f.group) list = list.filter((p) => p.group === f.group)
  if (f.cat) list = list.filter((p) => p.cat === f.cat)
  const facetBase = list
  for (const key of ['brand', 'type', 'material', 'color']) {
    const wanted = listOf(f[key])
    if (wanted.length) list = list.filter((p) => wanted.includes(p[key]))
  }
  if (f.min != null) list = list.filter((p) => p.price >= f.min)
  if (f.max != null) list = list.filter((p) => p.price <= f.max)
  if (f.inStock) list = list.filter((p) => p.stock > 0)
  if (f.rating) list = list.filter((p) => p.rating >= f.rating)
  if (f.tag) list = list.filter((p) => p.tag === f.tag)
  if (sorters[f.sort]) list = [...list].sort(sorters[f.sort])

  const limit = f.limit || 24
  const page = f.page || 1
  res.json({
    ok: true,
    total: list.length,
    page,
    pages: Math.max(1, Math.ceil(list.length / limit)),
    products: list.slice((page - 1) * limit, page * limit).map((p) => p.toPublic()),
    facets: {
      brand: counts(facetBase, 'brand'),
      type: counts(facetBase, 'type'),
      material: counts(facetBase, 'material'),
      color: counts(facetBase, 'color'),
      price: facetBase.length ? { min: Math.min(...facetBase.map((p) => p.price)), max: Math.max(...facetBase.map((p) => p.price)) } : null,
    },
  })
})

/* Store content managed from the admin panel */

r.get('/categories', async (_req, res) => {
  const all = await Category.find({ active: true }).sort({ order: 1, label: 1 })
  const groups = all.filter((c) => !c.parent).map((g) => ({ key: g.key, label: g.label, text: g.text, image: g.image, art: g.art?.kind ? g.art : undefined, subs: all.filter((s) => s.parent === g.key).map((s) => ({ key: s.key, label: s.label, image: s.image, art: s.art?.kind ? s.art : undefined })) }))
  res.json({ ok: true, groups })
})

r.get('/brands', async (_req, res) => {
  res.json({ ok: true, brands: await Brand.find({ active: true }).sort({ order: 1, name: 1 }).select('name note color logo') })
})

r.get('/banners', async (_req, res) => {
  const now = new Date()
  const list = await Banner.find({ active: true, $and: [{ $or: [{ startsAt: null }, { startsAt: { $lte: now } }] }, { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] }] }).sort({ order: 1 })
  res.json({ ok: true, hero: list.filter((b) => b.placement === 'hero'), side: list.filter((b) => b.placement === 'side') })
})

// One call for everything the website needs besides products
r.get('/storefront', async (_req, res) => {
  const now = new Date()
  const [allCats, brandList, bannerList, s, couponList, content] = await Promise.all([
    Category.find({ active: true }).sort({ order: 1, label: 1 }),
    Brand.find({ active: true }).sort({ order: 1, name: 1 }).select('name note color logo'),
    Banner.find({ active: true, $and: [{ $or: [{ startsAt: null }, { startsAt: { $lte: now } }] }, { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] }] }).sort({ order: 1 }),
    getWebsiteSettings(),
    Coupon.find({ active: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }).sort({ min: 1 }),
    getAllContent(),
  ])
  res.json({
    ok: true,
    categories: allCats.filter((c) => !c.parent).map((g) => ({ key: g.key, label: g.label, text: g.text, image: g.image, art: g.art?.kind ? g.art : undefined, subs: allCats.filter((x) => x.parent === g.key).map((x) => ({ key: x.key, label: x.label, image: x.image, art: x.art?.kind ? x.art : undefined })) })),
    brands: brandList,
    banners: { hero: bannerList.filter((b) => b.placement === 'hero'), side: bannerList.filter((b) => b.placement === 'side') },
    settings: { freeAbove: s.freeAbove, deliveryCharge: s.deliveryCharge, codLimit: s.codLimit, gstRate: s.gstRate, returnDays: s.returnDays, announcement: s.announcement, paymentMode: paymentMode() },
    coupons: couponList.map((c) => ({ code: c.code, text: c.text, type: c.type, value: c.value, max: c.max, min: c.min })),
    content,
  })
})

r.get('/content/:key', async (req, res) => {
  if (!CONTENT_KEYS.includes(req.params.key)) throw new HttpError(404, 'Unknown content')
  res.json({ ok: true, key: req.params.key, value: await getContent(req.params.key) })
})

// Public store rules the website shows (delivery, COD, returns, top bar text)
r.get('/settings', async (_req, res) => {
  const s = await getWebsiteSettings()
  res.json({ ok: true, settings: { freeAbove: s.freeAbove, deliveryCharge: s.deliveryCharge, codLimit: s.codLimit, gstRate: s.gstRate, returnDays: s.returnDays, announcement: s.announcement, paymentMode: paymentMode() } })
})

r.get('/products/:id', async (req, res) => {
  const p = await findWebsiteProduct(req.params.id)
  if (!p) throw new HttpError(404, 'Product not found')
  res.json({ ok: true, product: p.toPublic() })
})

/* Reviews */

r.get('/products/:id/reviews', async (req, res) => {
  const p = await findWebsiteProduct(req.params.id)
  if (!p) throw new HttpError(404, 'Product not found')
  const [list, groups] = await Promise.all([
    Review.find({ product: p.slug, approved: true }).sort({ createdAt: -1 }).limit(50),
    Review.aggregate([{ $match: { product: p.slug, approved: true } }, { $group: { _id: '$rating', count: { $sum: 1 } } }]),
  ])
  // Real star breakdown of the written reviews (5 down to 1)
  const breakdown = Object.fromEntries([5, 4, 3, 2, 1].map((s) => [s, groups.find((g) => g._id === s)?.count || 0]))
  res.json({
    ok: true,
    count: Object.values(breakdown).reduce((a, b) => a + b, 0),
    breakdown,
    reviews: list.map((x) => ({ id: x._id, name: x.name, rating: x.rating, text: x.text, verified: x.verified, date: x.createdAt.toISOString().slice(0, 10) })),
  })
})

r.post(
  '/products/:id/reviews',
  optionalAuth,
  validate(z.object({ name: rules.name, rating: z.number().int().min(1).max(5), text: z.string().trim().min(10, 'Please write at least 10 characters').max(2000) })),
  async (req, res) => {
    const p = await findWebsiteProduct(req.params.id)
    if (!p) throw new HttpError(404, 'Product not found')
    const review = await Review.create({ ...req.body, product: p.slug, user: req.user?._id })
    // Keep the product's average rating up to date
    const n = p.reviewsCount + 1
    await Product.updateOne({ _id: p._id }, { $set: { rating: Math.round(((p.rating * p.reviewsCount + review.rating) / n) * 10) / 10, reviewsCount: n } })
    emit('review.created', { entity: { type: 'product', id: p.code }, data: { reviewId: review._id.toString(), rating: review.rating, name: review.name } })
    res.status(201).json({ ok: true, review: { id: review._id, name: review.name, rating: review.rating, text: review.text, verified: false, date: review.createdAt.toISOString().slice(0, 10) } })
  },
)

/* Questions and answers */

r.get('/products/:id/questions', async (req, res) => {
  const p = await findWebsiteProduct(req.params.id)
  if (!p) throw new HttpError(404, 'Product not found')
  const list = await Question.find({ product: p.slug }).sort({ createdAt: -1 }).limit(50)
  res.json({ ok: true, questions: list.map((x) => ({ id: x._id, q: x.q, a: x.a })) })
})

r.post('/products/:id/questions', optionalAuth, validate(z.object({ q: z.string().trim().min(5, 'Please type your question').max(500) })), async (req, res) => {
  const p = await findWebsiteProduct(req.params.id)
  if (!p) throw new HttpError(404, 'Product not found')
  const q = await Question.create({ product: p.slug, q: req.body.q, askedBy: req.user?.name })
  emit('question.created', { entity: { type: 'product', id: p.code }, data: { questionId: q._id.toString(), q: q.q } })
  res.status(201).json({ ok: true, question: { id: q._id, q: q.q, a: null } })
})

/* Delivery and coupons */

r.get('/delivery/:pincode', async (req, res) => {
  const pin = rules.pincode.safeParse(req.params.pincode)
  if (!pin.success) return res.json({ ok: false, message: 'Enter a valid 6 digit pincode' })
  res.json(await checkPincode(pin.data))
})

r.get('/coupons', async (_req, res) => {
  const list = await Coupon.find({ active: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }).sort({ min: 1 })
  res.json({ ok: true, coupons: list.map((c) => ({ code: c.code, text: c.text, type: c.type, value: c.value, max: c.max, min: c.min })) })
})

r.post('/coupons/apply', validate(z.object({ code: z.string().trim().min(1).max(30), subtotal: z.number().min(0) })), async (req, res) => {
  const result = await couponDiscount(req.body.code, req.body.subtotal)
  emit('coupon.applied', { entity: { type: 'coupon', id: req.body.code.toUpperCase() }, data: { subtotal: req.body.subtotal, ok: result.ok, discount: result.discount } })
  res.json(result)
})

/* Enquiries (contact form, bulk quote) and newsletter */

r.post(
  '/enquiries',
  validate(
    z.object({
      kind: z.enum(['contact', 'quote']).default('contact'),
      name: rules.name,
      phone: z.string().trim().regex(/^[0-9+\s-]{10,15}$/, 'Enter a valid number'),
      email: z.union([rules.email, z.literal('')]).optional(),
      city: z.string().trim().max(80).optional(),
      type: z.string().trim().max(40).optional(),
      message: z.string().trim().max(2000).optional(),
      items: z.array(z.object({ code: z.string().max(40), name: z.string().max(200).optional(), qty: z.number().int().min(1).max(9999) })).max(100).optional(),
    }),
  ),
  async (req, res) => {
    const e = await Enquiry.create(req.body)
    emit('enquiry.created', { entity: { type: 'enquiry', id: e._id.toString() }, data: { kind: e.kind, name: e.name, city: e.city, items: e.items?.length || 0 }, payload: { enquiry: e } })
    res.status(201).json({ ok: true, id: e._id, message: 'Thank you. Our team will contact you within 24 hours.' })
  },
)

r.post('/newsletter', validate(z.object({ email: rules.email })), async (req, res) => {
  const out = await Subscriber.updateOne({ email: req.body.email }, { $setOnInsert: { email: req.body.email } }, { upsert: true })
  if (out.upsertedCount) emit('newsletter.subscribed', { entity: { type: 'subscriber', id: req.body.email } })
  res.json({ ok: true, message: 'Thanks for subscribing' })
})

export default r
