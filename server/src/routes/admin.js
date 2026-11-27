import { Router } from 'express'
import { z } from 'zod'
import { Coupon, Enquiry, Order, ORDER_STATUSES, Product, Question, Review, Setting, Subscriber } from '../models/index.js'
import { HttpError, requireAdmin, validate } from '../middleware.js'
import { getWebsiteSettings, restoreStock, websiteProducts } from '../services.js'
import { emit } from '../events.js'
import { diff } from '../logging.js'
import { startRefund } from './orders.js'

const r = Router()
r.use('/admin', requireAdmin)

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/* ---------- Website settings: how many products the website may show ---------- */

r.get('/admin/settings', async (_req, res) => {
  const settings = await getWebsiteSettings()
  const [visible, onWebsite] = await Promise.all([Product.countDocuments({ active: true, showOnWebsite: true }), websiteProducts()])
  res.json({ ok: true, settings, counts: { allowed: visible, shownOnWebsite: onWebsite.length } })
})

// Any field can be sent on its own, e.g. { maxWebsiteProducts: 50 } or { freeAbove: 1499, codLimit: 30000 }
r.put(
  '/admin/settings',
  validate(
    z.object({
      maxWebsiteProducts: z.number().int().min(0).max(100000).optional(),
      freeAbove: z.number().min(0).optional(),
      deliveryCharge: z.number().min(0).optional(),
      codLimit: z.number().min(0).optional(),
      gstRate: z.number().min(0).max(28).optional(),
      returnDays: z.number().int().min(0).max(60).optional(),
      unserviceablePincodes: z.array(z.string().trim().regex(/^[0-9]{2,6}$/, 'Use a pincode or its first 2 to 5 digits')).max(5000).optional(),
      announcement: z.string().trim().max(200).optional(),
    }),
  ),
  async (req, res) => {
    const before = await getWebsiteSettings()
    await Setting.updateOne({ key: 'website' }, { $set: req.body }, { upsert: true })
    const after = await getWebsiteSettings()
    emit('settings.updated', { entity: { type: 'settings', id: 'website' }, changes: diff(before, after, Object.keys(req.body)) })
    res.json({ ok: true, settings: after })
  },
)

/* ---------- Products ---------- */

const productFields = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(200),
  brand: z.string().trim().min(1).max(80),
  group: z.string().trim().min(1).max(40),
  cat: z.string().trim().min(1).max(40),
  type: z.string().trim().min(1).max(80),
  mrp: z.number().min(0),
  price: z.number().min(0),
  stock: z.number().int().min(0).default(0),
  material: z.string().trim().max(80).optional(),
  color: z.string().trim().max(80).optional(),
  size: z.string().trim().max(80).optional(),
  capacity: z.string().trim().max(80).optional(),
  dims: z.array(z.number().min(0)).length(3).optional(),
  weight: z.number().min(0).optional(),
  warranty: z.string().trim().max(80).optional(),
  images: z.array(z.string().trim().max(500)).max(20).optional(),
  video: z.string().trim().max(500).optional(),
  art: z.object({ kind: z.string().max(20), color: z.string().max(20) }).optional(),
  tag: z.string().trim().max(30).optional(),
  description: z.string().trim().max(5000).optional(),
  highlights: z.array(z.string().trim().max(200)).max(20).optional(),
  active: z.boolean().optional(),
  showOnWebsite: z.boolean().optional(),
  websiteOrder: z.number().int().optional(),
})

const adminView = (p) => ({ ...p.toPublic(), _id: p._id, active: p.active, showOnWebsite: p.showOnWebsite, websiteOrder: p.websiteOrder, description: p.description })

r.get('/admin/products', async (req, res) => {
  const { q, visible, group } = req.query
  const filter = {}
  if (typeof q === 'string' && q.trim()) {
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ name: rx }, { code: rx }, { brand: rx }]
  }
  if (visible === 'true' || visible === 'false') filter.showOnWebsite = visible === 'true'
  if (typeof group === 'string' && group) filter.group = group
  const list = await Product.find(filter).sort({ websiteOrder: 1, createdAt: -1 })
  res.json({ ok: true, total: list.length, products: list.map(adminView) })
})

r.post('/admin/products', validate(productFields), async (req, res) => {
  if (req.body.price > req.body.mrp) throw new HttpError(400, 'Selling price cannot be more than MRP')
  const p = await Product.create({ ...req.body, slug: slugify(`${req.body.name}-${req.body.code}`) })
  emit('product.created', { entity: { type: 'product', id: p.code }, data: { name: p.name, price: p.price, stock: p.stock, showOnWebsite: p.showOnWebsite } })
  res.status(201).json({ ok: true, product: adminView(p) })
})

r.patch('/admin/products/:id', validate(productFields.partial()), async (req, res) => {
  const p = await Product.findById(req.params.id)
  if (!p) throw new HttpError(404, 'Product not found')
  const before = p.toObject()
  Object.assign(p, req.body)
  if (p.price > p.mrp) throw new HttpError(400, 'Selling price cannot be more than MRP')
  await p.save()
  emit('product.updated', { entity: { type: 'product', id: p.code }, changes: diff(before, p.toObject(), Object.keys(req.body)) })
  res.json({ ok: true, product: adminView(p) })
})

// Show or hide many products on the website in one go
r.patch(
  '/admin/products-visibility',
  validate(z.object({ ids: z.array(z.string().regex(/^[a-f0-9]{24}$/)).min(1).max(1000), showOnWebsite: z.boolean() })),
  async (req, res) => {
    const out = await Product.updateMany({ _id: { $in: req.body.ids } }, { $set: { showOnWebsite: req.body.showOnWebsite } })
    const codes = (await Product.find({ _id: { $in: req.body.ids } }).select('code')).map((p) => p.code)
    emit('product.visibility_changed', { entity: { type: 'product', id: codes.length === 1 ? codes[0] : 'many' }, data: { showOnWebsite: req.body.showOnWebsite, codes, updated: out.modifiedCount } })
    res.json({ ok: true, updated: out.modifiedCount })
  },
)

// Soft delete: hides the product everywhere but keeps it for old orders
r.delete('/admin/products/:id', async (req, res) => {
  const p = await Product.findByIdAndUpdate(req.params.id, { active: false, showOnWebsite: false }, { returnDocument: 'after' })
  if (!p) throw new HttpError(404, 'Product not found')
  emit('product.deleted', { entity: { type: 'product', id: p.code }, data: { name: p.name, soft: true } })
  res.json({ ok: true })
})

/* ---------- Orders ---------- */

r.get('/admin/orders', async (req, res) => {
  const filter = {}
  if (typeof req.query.status === 'string' && ORDER_STATUSES.includes(req.query.status)) filter.status = req.query.status
  const list = await Order.find(filter).sort({ createdAt: -1 }).limit(500)
  res.json({ ok: true, total: list.length, orders: list.map((o) => ({ ...o.toPublic(), razorpay: o.razorpay })) })
})

r.patch(
  '/admin/orders/:id/status',
  validate(z.object({ status: z.enum(ORDER_STATUSES.filter((s) => s !== 'payment_pending')), note: z.string().trim().max(300).optional() })),
  async (req, res) => {
    const order = await Order.findOne({ orderNo: req.params.id })
    if (!order) throw new HttpError(404, 'Order not found')
    const from = order.status
    if (order.status === 'cancelled') throw new HttpError(400, 'Cancelled orders cannot be changed')
    if (order.status === 'payment_pending') throw new HttpError(400, 'This order has not been paid yet')
    if (req.body.status === 'cancelled') {
      if (order.stockDeducted) await restoreStock(order.items)
      order.stockDeducted = false
      order.cancelledAt = new Date()
    }
    order.status = req.body.status
    order.statusHistory.push({ status: req.body.status, note: req.body.note })
    if (req.body.status === 'delivered') {
      order.deliveredAt = new Date()
      if (order.payment === 'cod') order.paymentStatus = 'paid'
    }
    if (req.body.status === 'cancelled') await startRefund(order)
    await order.save()
    emit('order.status_changed', { entity: { type: 'order', id: order.orderNo }, data: { from, to: order.status, note: req.body.note }, changes: { before: { status: from }, after: { status: order.status } }, payload: { order } })
    res.json({ ok: true, order: order.toPublic() })
  },
)

/* ---------- Coupons ---------- */

const couponFields = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,30}$/, 'Use 3 to 30 letters or numbers'),
  text: z.string().trim().max(200).optional(),
  type: z.enum(['percent', 'flat']),
  value: z.number().min(0),
  max: z.number().min(0).optional(),
  min: z.number().min(0).default(0),
  active: z.boolean().optional(),
  expiresAt: z.coerce.date().optional(),
})

r.get('/admin/coupons', async (_req, res) => res.json({ ok: true, coupons: await Coupon.find().sort({ createdAt: -1 }) }))
r.post('/admin/coupons', validate(couponFields), async (req, res) => {
  const c = await Coupon.create(req.body)
  emit('coupon.created', { entity: { type: 'coupon', id: c.code }, data: req.body })
  res.status(201).json({ ok: true, coupon: c })
})
r.patch('/admin/coupons/:id', validate(couponFields.partial()), async (req, res) => {
  const before = await Coupon.findById(req.params.id).lean()
  if (!before) throw new HttpError(404, 'Coupon not found')
  const c = await Coupon.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true })
  emit('coupon.updated', { entity: { type: 'coupon', id: c.code }, changes: diff(before, c.toObject(), Object.keys(req.body)) })
  res.json({ ok: true, coupon: c })
})
r.delete('/admin/coupons/:id', async (req, res) => {
  const c = await Coupon.findByIdAndDelete(req.params.id)
  if (c) emit('coupon.deleted', { entity: { type: 'coupon', id: c.code } })
  res.json({ ok: true })
})

/* ---------- Enquiries, subscribers, reviews, questions ---------- */

r.get('/admin/enquiries', async (_req, res) => res.json({ ok: true, enquiries: await Enquiry.find().sort({ createdAt: -1 }).limit(500) }))
r.patch('/admin/enquiries/:id', validate(z.object({ status: z.enum(['new', 'contacted', 'closed']) })), async (req, res) => {
  const e = await Enquiry.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' })
  if (!e) throw new HttpError(404, 'Enquiry not found')
  emit('enquiry.updated', { entity: { type: 'enquiry', id: e._id.toString() }, data: { status: e.status } })
  res.json({ ok: true, enquiry: e })
})

r.get('/admin/subscribers', async (_req, res) => res.json({ ok: true, subscribers: await Subscriber.find().sort({ createdAt: -1 }) }))

r.patch('/admin/reviews/:id', validate(z.object({ approved: z.boolean() })), async (req, res) => {
  const rv = await Review.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' })
  if (!rv) throw new HttpError(404, 'Review not found')
  emit('review.moderated', { entity: { type: 'review', id: rv._id.toString() }, data: { product: rv.product, approved: rv.approved } })
  res.json({ ok: true, review: rv })
})

r.get('/admin/questions', async (_req, res) => res.json({ ok: true, questions: await Question.find().sort({ a: 1, createdAt: -1 }).limit(500) }))
r.patch('/admin/questions/:id', validate(z.object({ a: z.string().trim().min(1).max(2000) })), async (req, res) => {
  const q = await Question.findByIdAndUpdate(req.params.id, { a: req.body.a }, { returnDocument: 'after' })
  if (!q) throw new HttpError(404, 'Question not found')
  emit('question.answered', { entity: { type: 'question', id: q._id.toString() }, data: { product: q.product } })
  res.json({ ok: true, question: q })
})

export default r
