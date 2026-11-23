import { Router } from 'express'
import { z } from 'zod'
import { Coupon, Enquiry, Question, Review, Subscriber, Product } from '../models/index.js'
import { HttpError, optionalAuth, rules, validate } from '../middleware.js'
import { checkPincode, couponDiscount, findWebsiteProduct, websiteProducts } from '../services.js'

const r = Router()

/* Products: only the ones the admin allows on the website */

r.get('/products', async (_req, res) => {
  const list = await websiteProducts()
  res.json({ ok: true, total: list.length, products: list.map((p) => p.toPublic()) })
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
  const list = await Review.find({ product: p.slug, approved: true }).sort({ createdAt: -1 }).limit(50)
  res.json({
    ok: true,
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
  res.status(201).json({ ok: true, question: { id: q._id, q: q.q, a: null } })
})

/* Delivery and coupons */

r.get('/delivery/:pincode', (req, res) => {
  const pin = rules.pincode.safeParse(req.params.pincode)
  if (!pin.success) return res.json({ ok: false, message: 'Enter a valid 6 digit pincode' })
  res.json(checkPincode(pin.data))
})

r.get('/coupons', async (_req, res) => {
  const list = await Coupon.find({ active: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }).sort({ min: 1 })
  res.json({ ok: true, coupons: list.map((c) => ({ code: c.code, text: c.text, type: c.type, value: c.value, max: c.max, min: c.min })) })
})

r.post('/coupons/apply', validate(z.object({ code: z.string().trim().min(1).max(30), subtotal: z.number().min(0) })), async (req, res) => {
  res.json(await couponDiscount(req.body.code, req.body.subtotal))
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
    res.status(201).json({ ok: true, id: e._id, message: 'Thank you. Our team will contact you within 24 hours.' })
  },
)

r.post('/newsletter', validate(z.object({ email: rules.email })), async (req, res) => {
  await Subscriber.updateOne({ email: req.body.email }, { $setOnInsert: { email: req.body.email } }, { upsert: true })
  res.json({ ok: true, message: 'Thanks for subscribing' })
})

export default r
