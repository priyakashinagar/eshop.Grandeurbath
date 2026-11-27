import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { config, razorpayEnabled } from '../config.js'
import { Order } from '../models/index.js'
import { HttpError, optionalAuth, requireAuth, rules, validate } from '../middleware.js'
import {
  checkPincode,
  createRazorpayOrder,
  deductStock,
  findWebsiteProduct,
  getWebsiteSettings,
  newOrderNo,
  refundRazorpayPayment,
  restoreStock,
  summarize,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from '../services.js'
import { emit } from '../events.js'
import { invoiceHtml } from '../invoice.js'
import { getContent } from '../siteContent.js'

const r = Router()

const orderLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 40, standardHeaders: 'draft-8', legacyHeaders: false, message: { ok: false, message: 'Too many requests. Please try again shortly.' } })

const CANCELLABLE = ['payment_pending', 'placed', 'confirmed']

const orderRef = (o) => ({ type: 'order', id: o.orderNo })
const orderData = (o) => ({ total: o.summary.total, payment: o.payment, items: o.items.map((i) => ({ code: i.code, qty: i.qty, price: i.price })), coupon: o.coupon || undefined, pincode: o.address.pincode })

const invoiceNoFor = (o) => `INV-${new Date(o.createdAt || Date.now()).getFullYear()}-${o.orderNo.slice(2)}`

// Starts a refund for a paid online order: through Razorpay when possible, otherwise left for the admin
export async function startRefund(order, amount = order.summary.total) {
  if (order.payment !== 'razorpay' || order.paymentStatus !== 'paid') return
  order.refund = { status: 'pending', amount }
  const paymentId = order.razorpay?.paymentId
  if (razorpayEnabled() && paymentId && !order.razorpay?.testMode) {
    try {
      const rf = await refundRazorpayPayment(paymentId, amount)
      order.refund = { status: 'processed', amount, razorpayRefundId: rf.id, at: new Date() }
      order.paymentStatus = 'refunded'
      emit('order.refund_processed', { entity: orderRef(order), data: { amount, razorpayRefundId: rf.id } })
    } catch (err) {
      order.refund = { status: 'failed', amount, at: new Date() }
      emit('order.refund_failed', { entity: orderRef(order), data: { amount, reason: err?.error?.description || err.message } })
    }
  }
}

// Marks a payment_pending order as paid and placed. Shared by the website's verify call and the webhook.
async function finalizePaidOrder(order, paymentId, note) {
  if (order.paymentStatus === 'paid' && order.status !== 'payment_pending') return { ok: true }
  order.paymentStatus = 'paid'
  order.razorpay.paymentId = paymentId
  const stock = await deductStock(order.items)
  if (!stock.ok) {
    order.status = 'cancelled'
    order.cancelledAt = new Date()
    order.statusHistory.push({ status: 'cancelled', note: `Out of stock after payment (${stock.item.name}). Refund started.` })
    await startRefund(order)
    await order.save()
    emit('order.cancelled', { entity: orderRef(order), actor: { type: 'system' }, data: { by: 'system', reason: 'out_of_stock_after_payment', product: stock.item.code }, payload: { order } })
    return { ok: false, item: stock.item }
  }
  order.stockDeducted = true
  order.status = 'placed'
  order.invoiceNo = invoiceNoFor(order)
  order.statusHistory.push({ status: 'placed', note })
  await order.save()
  emit('order.payment_verified', { entity: orderRef(order), data: { paymentId, amount: order.summary.total, note } })
  emit('order.placed', { entity: orderRef(order), data: orderData(order), payload: { order } })
  return { ok: true }
}

const orderSchema = z.object({
  items: z.array(z.object({ id: z.string().min(1).max(200), qty: z.number().int().min(1).max(999) })).min(1, 'Your cart is empty').max(50),
  customer: z.object({ name: rules.name, mobile: rules.mobile, email: rules.email }),
  address: z.object({
    line1: z.string().trim().min(5, 'Please enter your address').max(300),
    landmark: z.string().trim().max(120).optional(),
    city: z.string().trim().min(2, 'Please enter city').max(80),
    state: z.string().trim().min(2, 'Please select state').max(80),
    pincode: rules.pincode,
    gstin: z.union([z.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid GSTIN'), z.literal('')]).optional(),
  }),
  coupon: z.string().trim().max(30).optional(),
  payment: z.enum(['cod', 'razorpay']),
})

// POST /orders: customers must be logged in. Prices, coupon and stock are always re-checked here, never trusted from the browser
const loginToOrder = (req, _res, next) => (req.user ? next() : next(new HttpError(401, 'Please log in to place your order')))
r.post('/orders', orderLimiter, optionalAuth, loginToOrder, validate(orderSchema), async (req, res) => {
  const { items, customer, address, coupon, payment } = req.body

  const merged = new Map()
  items.forEach((i) => merged.set(i.id, (merged.get(i.id) || 0) + i.qty))

  const rows = []
  for (const [id, qty] of merged) {
    const product = await findWebsiteProduct(id)
    if (!product) throw new HttpError(400, 'A product in your cart is no longer available. Please review your cart.')
    if (product.stock < qty) throw new HttpError(409, product.stock ? `Only ${product.stock} left of ${product.name}` : `${product.name} is out of stock`)
    rows.push({ product, qty })
  }

  const { summary, coupon: c } = await summarize(rows, coupon)
  const settings = await getWebsiteSettings()
  const pin = await checkPincode(address.pincode)
  if (!pin.ok) throw new HttpError(400, pin.message)
  if (payment === 'cod' && summary.total > settings.codLimit) {
    throw new HttpError(400, `Cash on delivery is available for orders up to ₹${settings.codLimit.toLocaleString('en-IN')}`)
  }

  const orderItems = rows.map(({ product: p, qty }) => ({ id: p.slug, code: p.code, name: p.name, brand: p.brand, price: p.price, mrp: p.mrp, qty, images: p.images, art: p.art }))
  const order = new Order({
    orderNo: newOrderNo(),
    user: req.user?._id,
    customer: { ...customer, guest: !req.user },
    address,
    items: orderItems,
    summary,
    coupon: c?.ok ? c.code : '',
    payment,
    status: payment === 'cod' ? 'placed' : 'payment_pending',
    statusHistory: [{ status: payment === 'cod' ? 'placed' : 'payment_pending' }],
  })

  if (payment === 'cod') {
    const stock = await deductStock(orderItems)
    if (!stock.ok) throw new HttpError(409, `${stock.item.name} just went out of stock. Please update your cart.`)
    order.stockDeducted = true
    order.invoiceNo = invoiceNoFor(order)
    await order.save()
    emit('order.placed', { entity: orderRef(order), data: orderData(order), payload: { order } })
    return res.status(201).json({ ok: true, order: order.toPublic() })
  }

  // Online payment: create the Razorpay order; the website opens Razorpay Checkout with it
  if (razorpayEnabled()) {
    const rp = await createRazorpayOrder(order.orderNo, summary.total)
    order.razorpay = { orderId: rp.orderId }
    await order.save()
    emit('order.payment_pending', { entity: orderRef(order), data: { ...orderData(order), razorpayOrderId: rp.orderId } })
    return res.status(201).json({ ok: true, order: order.toPublic(), razorpay: { ...rp, name: customer.name, email: customer.email, contact: customer.mobile } })
  }

  // No keys configured: test mode for local development only
  if (config.isProd) throw new HttpError(503, 'Online payment is not available right now. Please choose cash on delivery.')
  order.razorpay = { testMode: true }
  await order.save()
  emit('order.payment_pending', { entity: orderRef(order), data: { ...orderData(order), testMode: true } })
  res.status(201).json({ ok: true, order: order.toPublic(), razorpay: { testMode: true } })
})

// POST /orders/:id/verify-payment: called by the website after Razorpay Checkout succeeds
r.post(
  '/orders/:id/verify-payment',
  validate(z.object({ razorpay_order_id: z.string().optional(), razorpay_payment_id: z.string().optional(), razorpay_signature: z.string().optional(), test: z.boolean().optional() })),
  async (req, res) => {
    const order = await Order.findOne({ orderNo: req.params.id })
    if (!order) throw new HttpError(404, 'Order not found')
    if (order.paymentStatus === 'paid' && order.status !== 'payment_pending') return res.json({ ok: true, order: order.toPublic() })
    if (order.status !== 'payment_pending') throw new HttpError(400, 'This order is not waiting for payment')

    const { razorpay_order_id: rOrder, razorpay_payment_id: rPay, razorpay_signature: rSig, test } = req.body
    const testOk = test && order.razorpay?.testMode && !config.isProd
    const realOk = rOrder === order.razorpay?.orderId && verifyRazorpaySignature(rOrder, rPay, rSig)
    if (!testOk && !realOk) {
      order.paymentStatus = 'failed'
      await order.save()
      emit('order.payment_failed', { entity: orderRef(order), data: { razorpayOrderId: rOrder, paymentId: rPay, reason: 'signature_mismatch' } })
      throw new HttpError(400, 'Payment could not be verified. If money was deducted it will be refunded automatically.')
    }

    const done = await finalizePaidOrder(order, rPay || 'test_payment', testOk ? 'Test payment' : 'Paid via Razorpay')
    if (!done.ok) throw new HttpError(409, `${done.item.name} went out of stock. Your payment will be refunded in 5 to 7 working days.`)
    res.json({ ok: true, order: order.toPublic() })
  },
)

// POST /payments/razorpay/webhook: Razorpay calls this even if the customer closes the browser after paying.
// Mounted in app.js with a raw body parser so the signature can be checked.
export async function razorpayWebhook(req, res) {
  if (!verifyWebhookSignature(req.body, req.get('x-razorpay-signature'))) return res.status(400).json({ ok: false, message: 'Invalid signature' })
  let event
  try {
    event = JSON.parse(req.body.toString('utf8'))
  } catch {
    return res.status(400).json({ ok: false, message: 'Invalid JSON' })
  }
  emit('payment.webhook_received', { actor: { type: 'system', name: 'razorpay' }, data: { event: event.event, paymentId: event.payload?.payment?.entity?.id, orderId: event.payload?.payment?.entity?.order_id } })
  if (['payment.captured', 'order.paid'].includes(event.event)) {
    const pay = event.payload?.payment?.entity
    const order = pay?.order_id ? await Order.findOne({ 'razorpay.orderId': pay.order_id }) : null
    if (order && order.status === 'payment_pending') await finalizePaidOrder(order, pay.id, 'Paid via Razorpay (webhook)')
  }
  if (event.event === 'refund.processed') {
    const rf = event.payload?.refund?.entity
    const order = rf?.payment_id ? await Order.findOne({ 'razorpay.paymentId': rf.payment_id }) : null
    if (order) {
      order.refund = { status: 'processed', amount: rf.amount / 100, razorpayRefundId: rf.id, at: new Date() }
      order.paymentStatus = 'refunded'
      await order.save()
      emit('order.refund_processed', { entity: orderRef(order), actor: { type: 'system', name: 'razorpay' }, data: { amount: rf.amount / 100, razorpayRefundId: rf.id } })
    }
  }
  res.json({ ok: true })
}

// GET /orders/mine: orders placed while logged in, plus guest orders with the same mobile
r.get('/orders/mine', requireAuth, async (req, res) => {
  const list = await Order.find({ $or: [{ user: req.user._id }, { 'customer.mobile': req.user.mobile }], status: { $ne: 'payment_pending' } }).sort({ createdAt: -1 }).limit(100)
  res.json({ ok: true, orders: list.map((o) => o.toPublic()) })
})

const lookup = validate(z.object({ mobile: rules.mobile }), 'query')

// GET /orders/track?id=GB..&mobile=..
r.get('/orders/track', validate(z.object({ id: z.string().trim().toUpperCase().min(4).max(20), mobile: rules.mobile }), 'query'), async (req, res) => {
  const { id, mobile } = req.validQuery
  const order = await Order.findOne({ orderNo: id.replace(/^#/, ''), 'customer.mobile': mobile })
  if (!order) throw new HttpError(404, 'Order not found. Please check the order ID and mobile number.')
  res.json({ ok: true, order: order.toPublic() })
})

// Owner check: logged-in owner, the mobile number used for the order, or an admin
const canSee = (req, order) =>
  req.user?.role === 'admin' ||
  (req.user && (order.user?.equals(req.user._id) || order.customer.mobile === req.user.mobile)) ||
  req.validQuery?.mobile === order.customer.mobile

const ownerOrMobile = [optionalAuth, (req, res, next) => (req.user ? next() : lookup(req, res, next))]

async function loadOwnOrder(req) {
  const order = await Order.findOne({ orderNo: req.params.id })
  if (!order || !canSee(req, order)) throw new HttpError(404, 'Order not found')
  return order
}

r.get('/orders/:id', ...ownerOrMobile, async (req, res) => {
  res.json({ ok: true, order: (await loadOwnOrder(req)).toPublic() })
})

// GET /orders/:id/invoice: printable GST invoice (HTML; use the browser's Print > Save as PDF)
r.get('/orders/:id/invoice', ...ownerOrMobile, async (req, res) => {
  const order = await loadOwnOrder(req)
  if (order.status === 'payment_pending') throw new HttpError(400, 'Invoice is available after payment')
  const [{ gstRate }, company] = await Promise.all([getWebsiteSettings(), getContent('company')])
  res.type('html').set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'").send(invoiceHtml(order, gstRate, company))
})

r.post('/orders/:id/cancel', ...ownerOrMobile, async (req, res) => {
  const order = await loadOwnOrder(req)
  if (!CANCELLABLE.includes(order.status)) throw new HttpError(400, 'This order has already been shipped and cannot be cancelled. You can request a return after delivery.')
  if (order.stockDeducted) {
    await restoreStock(order.items)
    order.stockDeducted = false
  }
  order.status = 'cancelled'
  order.cancelledAt = new Date()
  await startRefund(order)
  order.statusHistory.push({ status: 'cancelled', note: order.refund?.status ? 'Cancelled by customer. Refund started.' : 'Cancelled by customer' })
  await order.save()
  emit('order.cancelled', { entity: orderRef(order), data: { by: 'customer', refund: order.refund?.status }, payload: { order } })
  res.json({ ok: true, order: order.toPublic() })
})

// POST /orders/:id/return: customer asks to return a delivered order within the return window
r.post(
  '/orders/:id/return',
  ...ownerOrMobile,
  validate(
    z.object({
      reason: z.enum(['damaged', 'defective', 'wrong_item', 'missing_parts', 'other']),
      details: z.string().trim().min(10, 'Please describe the problem in a few words').max(1000),
    }),
  ),
  async (req, res) => {
    const order = await loadOwnOrder(req)
    if (order.status !== 'delivered') throw new HttpError(400, 'Returns can be requested only after the order is delivered')
    if (order.returnRequest?.status) throw new HttpError(409, 'A return request already exists for this order')
    const { returnDays } = await getWebsiteSettings()
    const deliveredAt = order.deliveredAt || order.updatedAt
    if (Date.now() - deliveredAt.getTime() > returnDays * 864e5) throw new HttpError(400, `Returns are accepted within ${returnDays} days of delivery`)
    order.returnRequest = { status: 'requested', reason: req.body.reason, details: req.body.details, requestedAt: new Date() }
    order.statusHistory.push({ status: 'delivered', note: 'Return requested by customer' })
    await order.save()
    emit('order.return_requested', { entity: orderRef(order), data: { reason: req.body.reason, details: req.body.details } })
    res.status(201).json({ ok: true, order: order.toPublic(), message: 'Return request received. Our team will contact you within 24 hours.' })
  },
)

export default r
