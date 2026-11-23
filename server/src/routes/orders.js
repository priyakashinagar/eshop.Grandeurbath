import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { config, razorpayEnabled } from '../config.js'
import { Order } from '../models/index.js'
import { HttpError, optionalAuth, requireAuth, rules, validate } from '../middleware.js'
import { createRazorpayOrder, deductStock, findWebsiteProduct, newOrderNo, restoreStock, summarize, verifyRazorpaySignature } from '../services.js'

const r = Router()

const orderLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 40, standardHeaders: 'draft-8', legacyHeaders: false, message: { ok: false, message: 'Too many requests. Please try again shortly.' } })

const CANCELLABLE = ['payment_pending', 'placed', 'confirmed']

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

// POST /orders: prices, coupon and stock are always re-checked here, never trusted from the browser
r.post('/orders', orderLimiter, optionalAuth, validate(orderSchema), async (req, res) => {
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
  if (payment === 'cod' && summary.total > config.delivery.codLimit) {
    throw new HttpError(400, `Cash on delivery is available for orders up to ₹${config.delivery.codLimit.toLocaleString('en-IN')}`)
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
    await order.save()
    return res.status(201).json({ ok: true, order: order.toPublic() })
  }

  // Online payment: create the Razorpay order; the website opens Razorpay Checkout with it
  if (razorpayEnabled()) {
    const rp = await createRazorpayOrder(order.orderNo, summary.total)
    order.razorpay = { orderId: rp.orderId }
    await order.save()
    return res.status(201).json({ ok: true, order: order.toPublic(), razorpay: { ...rp, name: customer.name, email: customer.email, contact: customer.mobile } })
  }

  // No keys configured: test mode for local development only
  if (config.isProd) throw new HttpError(503, 'Online payment is not available right now. Please choose cash on delivery.')
  order.razorpay = { testMode: true }
  await order.save()
  res.status(201).json({ ok: true, order: order.toPublic(), razorpay: { testMode: true } })
})

// POST /orders/:id/verify-payment: called by the website after Razorpay Checkout succeeds
r.post(
  '/orders/:id/verify-payment',
  validate(z.object({ razorpay_order_id: z.string().optional(), razorpay_payment_id: z.string().optional(), razorpay_signature: z.string().optional(), test: z.boolean().optional() })),
  async (req, res) => {
    const order = await Order.findOne({ orderNo: req.params.id })
    if (!order) throw new HttpError(404, 'Order not found')
    if (order.paymentStatus === 'paid') return res.json({ ok: true, order: order.toPublic() })
    if (order.status !== 'payment_pending') throw new HttpError(400, 'This order is not waiting for payment')

    const { razorpay_order_id: rOrder, razorpay_payment_id: rPay, razorpay_signature: rSig, test } = req.body
    const testOk = test && order.razorpay?.testMode && !config.isProd
    const realOk = rOrder === order.razorpay?.orderId && verifyRazorpaySignature(rOrder, rPay, rSig)
    if (!testOk && !realOk) {
      order.paymentStatus = 'failed'
      await order.save()
      throw new HttpError(400, 'Payment could not be verified. If money was deducted it will be refunded automatically.')
    }

    const stock = await deductStock(order.items)
    if (!stock.ok) {
      // Paid but stock ran out in the meantime: keep the payment, flag for refund by admin
      order.paymentStatus = 'paid'
      order.razorpay.paymentId = rPay
      order.status = 'cancelled'
      order.statusHistory.push({ status: 'cancelled', note: `Out of stock after payment (${stock.item.name}). Refund due.` })
      await order.save()
      throw new HttpError(409, `${stock.item.name} went out of stock. Your payment will be refunded in 5 to 7 working days.`)
    }

    order.stockDeducted = true
    order.paymentStatus = 'paid'
    order.razorpay.paymentId = rPay || 'test_payment'
    order.status = 'placed'
    order.statusHistory.push({ status: 'placed', note: testOk ? 'Test payment' : 'Paid via Razorpay' })
    await order.save()
    res.json({ ok: true, order: order.toPublic() })
  },
)

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

// Owner check: logged-in owner, or the mobile number used for the order
const canSee = (req, order) =>
  (req.user && (order.user?.equals(req.user._id) || order.customer.mobile === req.user.mobile)) || req.validQuery?.mobile === order.customer.mobile

r.get('/orders/:id', optionalAuth, (req, _res, next) => (req.user ? next() : lookup(req, _res, next)), async (req, res) => {
  const order = await Order.findOne({ orderNo: req.params.id })
  if (!order || !canSee(req, order)) throw new HttpError(404, 'Order not found')
  res.json({ ok: true, order: order.toPublic() })
})

r.post('/orders/:id/cancel', optionalAuth, (req, _res, next) => (req.user ? next() : lookup(req, _res, next)), async (req, res) => {
  const order = await Order.findOne({ orderNo: req.params.id })
  if (!order || !canSee(req, order)) throw new HttpError(404, 'Order not found')
  if (!CANCELLABLE.includes(order.status)) throw new HttpError(400, 'This order has already been shipped and cannot be cancelled. You can request a return after delivery.')
  if (order.stockDeducted) {
    await restoreStock(order.items)
    order.stockDeducted = false
  }
  order.status = 'cancelled'
  order.cancelledAt = new Date()
  if (order.paymentStatus === 'paid') order.statusHistory.push({ status: 'cancelled', note: 'Cancelled by customer. Refund due.' })
  else order.statusHistory.push({ status: 'cancelled', note: 'Cancelled by customer' })
  await order.save()
  res.json({ ok: true, order: order.toPublic() })
})

export default r
