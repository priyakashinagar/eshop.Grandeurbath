import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { config } from '../config.js'
import { Banner, Brand, Category, Enquiry, Order, Product, Question, Review, User } from '../models/index.js'
import { HttpError, requireAdmin, validate } from '../middleware.js'
import { restoreStock } from '../services.js'
import { emit } from '../events.js'
import { diff } from '../logging.js'
import { startRefund } from './orders.js'
import { Content, CONTENT_KEYS, CONTENT_SCHEMAS, getAllContent } from '../siteContent.js'

const r = Router()
r.use('/admin', requireAdmin)

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const objectId = z.string().regex(/^[a-f0-9]{24}$/, 'Invalid id')

/* ---------- Simple create/read/update/delete for store content ---------- */

// Store content (categories, brands, banners) emits content.created / content.updated / content.deleted
function crud(base, Model, fields, sort) {
  const ref = (item) => ({ type: base.replace(/s$/, '').replace(/ie$/, 'y'), id: String(item.key || item.name || item._id) })
  r.get(`/admin/${base}`, async (_req, res) => res.json({ ok: true, items: await Model.find().sort(sort) }))
  r.post(`/admin/${base}`, validate(fields), async (req, res) => {
    const item = await Model.create(req.body)
    emit('content.created', { entity: ref(item), data: req.body })
    res.status(201).json({ ok: true, item })
  })
  r.patch(`/admin/${base}/:id`, validate(fields.partial()), async (req, res) => {
    const before = await Model.findById(req.params.id).lean()
    if (!before) throw new HttpError(404, 'Not found')
    const item = await Model.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true })
    emit('content.updated', { entity: ref(item), changes: diff(before, item.toObject(), Object.keys(req.body)) })
    res.json({ ok: true, item })
  })
  r.delete(`/admin/${base}/:id`, async (req, res) => {
    const item = await Model.findByIdAndDelete(req.params.id)
    if (!item) throw new HttpError(404, 'Not found')
    emit('content.deleted', { entity: ref(item), data: { title: item.title || item.label || item.name } })
    res.json({ ok: true })
  })
}

const art = z.object({ kind: z.enum(['tank', 'loft', 'pipe', 'elbow']), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) })

crud(
  'categories',
  Category,
  z.object({
    key: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,40}$/, 'Use lowercase letters, numbers and dashes'),
    label: z.string().trim().min(2).max(80),
    parent: z.string().trim().toLowerCase().max(40).nullable().optional(),
    text: z.string().trim().max(200).optional(),
    image: z.string().trim().max(500).optional(),
    art: art.optional(),
    order: z.number().int().optional(),
    active: z.boolean().optional(),
  }),
  { parent: 1, order: 1 },
)

crud(
  'brands',
  Brand,
  z.object({
    name: z.string().trim().min(1).max(80),
    note: z.string().trim().max(120).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    logo: z.string().trim().max(500).optional(),
    order: z.number().int().optional(),
    active: z.boolean().optional(),
  }),
  { order: 1, name: 1 },
)

crud(
  'banners',
  Banner,
  z.object({
    placement: z.enum(['hero', 'side']).default('hero'),
    tag: z.string().trim().max(40).optional(),
    title: z.string().trim().min(2).max(120),
    text: z.string().trim().max(300).optional(),
    image: z.string().trim().max(500).optional(),
    art: art.optional(),
    ctaLabel: z.string().trim().max(40).optional(),
    ctaLink: z.string().trim().max(300).optional(),
    bg: z.string().trim().max(100).optional(),
    order: z.number().int().optional(),
    active: z.boolean().optional(),
    startsAt: z.coerce.date().nullable().optional(),
    endsAt: z.coerce.date().nullable().optional(),
  }),
  { placement: 1, order: 1 },
)

/* ---------- Website content (company details, FAQs, policies, testimonials, page sections) ---------- */

r.get('/admin/content', async (_req, res) => res.json({ ok: true, keys: CONTENT_KEYS, content: await getAllContent() }))

r.get('/admin/content/:key', async (req, res) => {
  if (!CONTENT_KEYS.includes(req.params.key)) throw new HttpError(404, `Unknown content key. Use one of: ${CONTENT_KEYS.join(', ')}`)
  res.json({ ok: true, key: req.params.key, value: (await Content.findOne({ key: req.params.key }).lean())?.value ?? null })
})

// PUT /admin/content/:key with { value } replaces that block after checking it against its schema
r.put('/admin/content/:key', async (req, res) => {
  const schema = CONTENT_SCHEMAS[req.params.key]
  if (!schema) throw new HttpError(404, `Unknown content key. Use one of: ${CONTENT_KEYS.join(', ')}`)
  const parsed = schema.safeParse(req.body?.value)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
    throw new HttpError(400, `${issues[0].field || 'value'}: ${issues[0].message}`, issues)
  }
  const before = (await Content.findOne({ key: req.params.key }).lean())?.value
  await Content.updateOne({ key: req.params.key }, { $set: { value: parsed.data } }, { upsert: true })
  emit('content.updated', { entity: { type: 'content', id: req.params.key }, changes: diff({ value: before }, { value: parsed.data }, ['value']) })
  res.json({ ok: true, key: req.params.key, value: parsed.data })
})

/* ---------- Image upload ---------- */

const uploadDir = path.resolve(config.uploadDir)
fs.mkdirSync(uploadDir, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'].includes(file.mimetype) && ['.jpg', '.jpeg', '.png', '.webp', '.mp4'].includes(path.extname(file.originalname).toLowerCase())
    cb(ok ? null : new HttpError(400, 'Only JPG, PNG, WEBP images or MP4 videos are allowed'), ok)
  },
})

// POST /admin/uploads (multipart, field "files"): returns full URLs to save in product.images or banner.image
r.post('/admin/uploads', (req, res, next) => upload.array('files', 10)(req, res, (err) => (err ? next(err.status ? err : new HttpError(400, err.message)) : next())), (req, res) => {
  if (!req.files?.length) throw new HttpError(400, 'Choose at least one file')
  emit('upload.created', { entity: { type: 'upload', id: req.files[0].filename }, data: { files: req.files.map((f) => ({ name: f.filename, original: f.originalname, size: f.size, type: f.mimetype })) } })
  res.status(201).json({ ok: true, urls: req.files.map((f) => `${config.publicApiUrl}/uploads/${f.filename}`) })
})

/* ---------- Product import (sync from the existing product API or a spreadsheet) ---------- */

const importItem = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(200),
  brand: z.string().trim().min(1).max(80),
  group: z.string().trim().min(1).max(40),
  cat: z.string().trim().min(1).max(40),
  type: z.string().trim().min(1).max(80),
  mrp: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0).default(0),
  material: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  capacity: z.string().optional(),
  dims: z.array(z.coerce.number()).length(3).optional(),
  weight: z.coerce.number().optional(),
  warranty: z.string().optional(),
  images: z.array(z.string().max(500)).optional(),
  description: z.string().max(5000).optional(),
  highlights: z.array(z.string().max(200)).optional(),
  tag: z.string().optional(),
  showOnWebsite: z.boolean().optional(),
})

// Upserts by SKU (code). New products stay hidden unless showOnWebsite is sent, so the admin decides what goes live.
r.post('/admin/products/import', validate(z.object({ products: z.array(z.unknown()).min(1).max(2000) })), async (req, res) => {
  const result = { created: 0, updated: 0, errors: [] }
  for (const [i, raw] of req.body.products.entries()) {
    const parsed = importItem.safeParse(raw)
    if (!parsed.success) {
      result.errors.push({ index: i, code: raw?.code, message: parsed.error.issues[0]?.message })
      continue
    }
    const p = parsed.data
    if (p.price > p.mrp) {
      result.errors.push({ index: i, code: p.code, message: 'Selling price is more than MRP' })
      continue
    }
    const { showOnWebsite, ...fields } = p
    const out = await Product.updateOne(
      { code: p.code },
      { $set: fields, $setOnInsert: { slug: slugify(`${p.name}-${p.code}`), showOnWebsite: showOnWebsite ?? false, active: true } },
      { upsert: true },
    )
    if (out.upsertedCount) result.created += 1
    else result.updated += 1
  }
  emit('product.imported', { entity: { type: 'product', id: 'import' }, data: { received: req.body.products.length, created: result.created, updated: result.updated, errors: result.errors.slice(0, 20) } })
  res.json({ ok: true, ...result })
})

/* ---------- Dashboard ---------- */

r.get('/admin/dashboard', async (_req, res) => {
  const since = new Date(Date.now() - 30 * 864e5)
  const paidish = { status: { $nin: ['payment_pending', 'cancelled'] } }
  const [sales, byStatus, last30, lowStock, newEnquiries, pendingReturns, customers, recent] = await Promise.all([
    Order.aggregate([{ $match: paidish }, { $group: { _id: null, revenue: { $sum: '$summary.total' }, orders: { $sum: 1 } } }]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { ...paidish, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, revenue: { $sum: '$summary.total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Product.find({ active: true, stock: { $lte: 5 } }).sort({ stock: 1 }).limit(20).select('code name stock showOnWebsite'),
    Enquiry.countDocuments({ status: 'new' }),
    Order.countDocuments({ 'returnRequest.status': 'requested' }),
    User.countDocuments({ role: 'customer' }),
    Order.find({ status: { $ne: 'payment_pending' } }).sort({ createdAt: -1 }).limit(10),
  ])
  res.json({
    ok: true,
    totals: { revenue: sales[0]?.revenue || 0, orders: sales[0]?.orders || 0, customers, newEnquiries, pendingReturns },
    ordersByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    last30Days: last30.map((d) => ({ date: d._id, revenue: d.revenue, orders: d.orders })),
    lowStock,
    recentOrders: recent.map((o) => ({ id: o.orderNo, customer: o.customer.name, total: o.summary.total, status: o.status, createdAt: o.createdAt })),
  })
})

/* ---------- Customers ---------- */

r.get('/admin/users', async (req, res) => {
  const filter = {}
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const rx = new RegExp(req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ name: rx }, { mobile: rx }, { email: rx }]
  }
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(500)
  res.json({ ok: true, users: users.map((u) => ({ ...u.toPublic(), active: u.active !== false })) })
})

r.patch('/admin/users/:id', validate(z.object({ active: z.boolean().optional(), role: z.enum(['customer', 'admin']).optional() })), async (req, res) => {
  if (req.params.id === req.user._id.toString()) throw new HttpError(400, 'You cannot change your own account here')
  const before = await User.findById(req.params.id).lean()
  if (!before) throw new HttpError(404, 'User not found')
  const u = await User.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' })
  emit('user.updated_by_admin', { entity: { type: 'user', id: u._id.toString() }, changes: diff({ ...before, active: before.active !== false }, { ...u.toObject(), active: u.active !== false }, Object.keys(req.body)) })
  res.json({ ok: true, user: { ...u.toPublic(), active: u.active !== false } })
})

/* ---------- Returns and refunds ---------- */

r.get('/admin/returns', async (_req, res) => {
  const list = await Order.find({ 'returnRequest.status': { $exists: true, $ne: null } }).sort({ 'returnRequest.requestedAt': -1 }).limit(500)
  res.json({ ok: true, orders: list.map((o) => o.toPublic()) })
})

// requested -> approved | rejected; approved -> received (stock back) -> refunded
r.patch(
  '/admin/returns/:id',
  validate(z.object({ status: z.enum(['approved', 'rejected', 'received', 'refunded']), note: z.string().trim().max(300).optional() })),
  async (req, res) => {
    const order = await Order.findOne({ orderNo: req.params.id })
    if (!order?.returnRequest?.status) throw new HttpError(404, 'Return request not found')
    const from = order.returnRequest.status
    const allowed = { requested: ['approved', 'rejected'], approved: ['received', 'rejected'], received: ['refunded'] }
    if (!allowed[from]?.includes(req.body.status)) throw new HttpError(400, `Cannot move a return from ${from} to ${req.body.status}`)

    if (req.body.status === 'received' && order.stockDeducted) {
      await restoreStock(order.items)
      order.stockDeducted = false
    }
    if (req.body.status === 'refunded') {
      if (order.payment === 'razorpay') await startRefund(order)
      else order.refund = { status: 'processed', amount: order.summary.total, at: new Date() } // COD: paid back by bank transfer
      if (order.refund?.status === 'processed') order.paymentStatus = 'refunded'
    }
    order.returnRequest.status = req.body.status
    order.returnRequest.adminNote = req.body.note
    if (['rejected', 'refunded'].includes(req.body.status)) order.returnRequest.resolvedAt = new Date()
    order.statusHistory.push({ status: order.status, note: `Return ${req.body.status}${req.body.note ? `: ${req.body.note}` : ''}` })
    await order.save()
    emit('order.return_updated', { entity: { type: 'order', id: order.orderNo }, data: { from, to: req.body.status, note: req.body.note }, payload: { order } })
    res.json({ ok: true, order: order.toPublic() })
  },
)

// Records a refund done outside Razorpay, or retries a failed Razorpay refund
r.post('/admin/orders/:id/refund', validate(z.object({ amount: z.number().positive().optional(), manual: z.boolean().optional() })), async (req, res) => {
  const order = await Order.findOne({ orderNo: req.params.id })
  if (!order) throw new HttpError(404, 'Order not found')
  if (order.paymentStatus === 'refunded') throw new HttpError(400, 'This order is already refunded')
  const amount = Math.min(req.body.amount ?? order.summary.total, order.summary.total)
  if (req.body.manual || order.payment === 'cod') {
    order.refund = { status: 'processed', amount, at: new Date() }
    order.paymentStatus = 'refunded'
    emit('order.refund_processed', { entity: { type: 'order', id: order.orderNo }, data: { amount, manual: true } })
  } else {
    if (order.paymentStatus !== 'paid') throw new HttpError(400, 'This order has no captured payment to refund')
    await startRefund(order, amount)
  }
  order.statusHistory.push({ status: order.status, note: `Refund ${order.refund?.status || 'recorded'} (₹${amount})` })
  await order.save()
  res.json({ ok: true, order: { ...order.toPublic(), razorpay: order.razorpay } })
})

/* ---------- Reviews and questions moderation ---------- */

r.get('/admin/reviews', async (req, res) => {
  const filter = typeof req.query.product === 'string' ? { product: req.query.product } : {}
  res.json({ ok: true, reviews: await Review.find(filter).sort({ createdAt: -1 }).limit(500) })
})

r.delete('/admin/reviews/:id', validate(z.object({ id: objectId }), 'params'), async (req, res) => {
  const rv = await Review.findByIdAndDelete(req.params.id)
  if (!rv) throw new HttpError(404, 'Review not found')
  emit('review.deleted', { entity: { type: 'review', id: rv._id.toString() }, data: { product: rv.product, rating: rv.rating } })
  res.json({ ok: true })
})

r.delete('/admin/questions/:id', validate(z.object({ id: objectId }), 'params'), async (req, res) => {
  const q = await Question.findByIdAndDelete(req.params.id)
  if (!q) throw new HttpError(404, 'Question not found')
  emit('question.deleted', { entity: { type: 'question', id: q._id.toString() }, data: { product: q.product } })
  res.json({ ok: true })
})

export default r
