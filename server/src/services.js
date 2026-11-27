import crypto from 'node:crypto'
import Razorpay from 'razorpay'
import { config, razorpayEnabled } from './config.js'
import { Coupon, Product, Setting } from './models/index.js'

/* ---------------- Website product visibility ---------------- */

// Store settings from the admin, with defaults from config for anything not set yet
export async function getWebsiteSettings() {
  const s = await Setting.findOne({ key: 'website' })
  const d = config.delivery
  return {
    maxWebsiteProducts: s?.maxWebsiteProducts ?? 0,
    freeAbove: s?.freeAbove ?? d.freeAbove,
    deliveryCharge: s?.deliveryCharge ?? d.charge,
    codLimit: s?.codLimit ?? d.codLimit,
    gstRate: s?.gstRate ?? d.gstRate,
    returnDays: s?.returnDays ?? d.returnDays,
    unserviceablePincodes: s?.unserviceablePincodes ?? [],
    announcement: s?.announcement || '',
  }
}

// Products the admin has allowed on the website, in admin order, capped at the admin's limit
export async function websiteProducts() {
  const { maxWebsiteProducts } = await getWebsiteSettings()
  const q = Product.find({ active: true, showOnWebsite: true }).sort({ websiteOrder: 1, createdAt: -1, _id: 1 })
  if (maxWebsiteProducts > 0) q.limit(maxWebsiteProducts)
  return q
}

// A single product is only public if it is inside the list above
export async function findWebsiteProduct(idOrCode) {
  const { maxWebsiteProducts } = await getWebsiteSettings()
  if (!maxWebsiteProducts) return Product.findOne({ $or: [{ slug: idOrCode }, { code: idOrCode }], active: true, showOnWebsite: true })
  const list = await websiteProducts()
  return list.find((p) => p.slug === idOrCode || p.code === idOrCode) || null
}

/* ---------------- Coupons and pricing ---------------- */

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`

export async function couponDiscount(code, subtotal) {
  const c = code ? await Coupon.findOne({ code: String(code).trim().toUpperCase(), active: true }) : null
  if (!c || (c.expiresAt && c.expiresAt < new Date())) return { ok: false, discount: 0, message: 'This coupon code is not valid' }
  if (subtotal < c.min) return { ok: false, discount: 0, message: `Add ${inr(c.min - subtotal)} more to use ${c.code}` }
  const raw = c.type === 'flat' ? c.value : (subtotal * c.value) / 100
  const discount = Math.round(Math.min(raw, c.max ?? raw, subtotal))
  return { ok: true, code: c.code, discount, message: `${c.code} applied. You save ${inr(discount)}` }
}

// rows: [{ product, qty }] with product from the database. Prices include GST.
export async function summarize(rows, couponCode) {
  const { freeAbove, deliveryCharge: charge, gstRate } = await getWebsiteSettings()
  const mrpTotal = rows.reduce((s, r) => s + r.product.mrp * r.qty, 0)
  const subtotal = rows.reduce((s, r) => s + r.product.price * r.qty, 0)
  const coupon = couponCode ? await couponDiscount(couponCode, subtotal) : null
  const couponOff = coupon?.ok ? coupon.discount : 0
  const afterCoupon = subtotal - couponOff
  const shipping = rows.length === 0 || afterCoupon >= freeAbove ? 0 : charge
  const gst = Math.round(afterCoupon - afterCoupon / (1 + gstRate / 100))
  return {
    coupon,
    summary: {
      count: rows.reduce((n, r) => n + r.qty, 0),
      mrpTotal,
      subtotal,
      mrpDiscount: mrpTotal - subtotal,
      couponOff,
      shipping,
      gst,
      taxable: afterCoupon - gst,
      total: afterCoupon + shipping,
      savings: mrpTotal - subtotal + couponOff,
    },
  }
}

/* ---------------- Delivery ---------------- */

const cities = {
  11: 'New Delhi', 12: 'Gurugram', 13: 'Haryana', 14: 'Punjab', 20: 'Ghaziabad / Noida', 22: 'Lucknow', 30: 'Jaipur', 38: 'Ahmedabad',
  40: 'Mumbai', 41: 'Pune', 45: 'Indore', 50: 'Hyderabad', 56: 'Bengaluru', 60: 'Chennai', 68: 'Kochi', 70: 'Kolkata', 80: 'Patna',
}

// First digits of an Indian pincode -> state (postal circles)
const statePrefixes = [
  ['11', 'Delhi'], ['12', 'Haryana'], ['13', 'Haryana'], ['14', 'Punjab'], ['15', 'Punjab'], ['16', 'Chandigarh'], ['17', 'Himachal Pradesh'],
  ['18', 'Jammu and Kashmir'], ['19', 'Jammu and Kashmir'], ['24', 'Uttarakhand'], ['20', 'Uttar Pradesh'], ['21', 'Uttar Pradesh'], ['22', 'Uttar Pradesh'],
  ['23', 'Uttar Pradesh'], ['25', 'Uttar Pradesh'], ['26', 'Uttar Pradesh'], ['27', 'Uttar Pradesh'], ['28', 'Uttar Pradesh'], ['30', 'Rajasthan'],
  ['31', 'Rajasthan'], ['32', 'Rajasthan'], ['33', 'Rajasthan'], ['34', 'Rajasthan'], ['36', 'Gujarat'], ['37', 'Gujarat'], ['38', 'Gujarat'], ['39', 'Gujarat'],
  ['403', 'Goa'], ['40', 'Maharashtra'], ['41', 'Maharashtra'], ['42', 'Maharashtra'], ['43', 'Maharashtra'], ['44', 'Maharashtra'], ['49', 'Chhattisgarh'],
  ['45', 'Madhya Pradesh'], ['46', 'Madhya Pradesh'], ['47', 'Madhya Pradesh'], ['48', 'Madhya Pradesh'], ['50', 'Telangana'], ['51', 'Andhra Pradesh'],
  ['52', 'Andhra Pradesh'], ['53', 'Andhra Pradesh'], ['56', 'Karnataka'], ['57', 'Karnataka'], ['58', 'Karnataka'], ['59', 'Karnataka'], ['605', 'Puducherry'],
  ['60', 'Tamil Nadu'], ['61', 'Tamil Nadu'], ['62', 'Tamil Nadu'], ['63', 'Tamil Nadu'], ['64', 'Tamil Nadu'], ['67', 'Kerala'], ['68', 'Kerala'], ['69', 'Kerala'],
  ['70', 'West Bengal'], ['71', 'West Bengal'], ['72', 'West Bengal'], ['73', 'West Bengal'], ['74', 'West Bengal'], ['75', 'Odisha'], ['76', 'Odisha'], ['77', 'Odisha'],
  ['78', 'Assam'], ['79', 'North East'], ['80', 'Bihar'], ['81', 'Bihar'], ['82', 'Jharkhand'], ['83', 'Jharkhand'], ['84', 'Bihar'], ['85', 'Bihar'],
]
const stateMatch = (pin) => statePrefixes.filter(([p]) => pin.startsWith(p)).sort((a, b) => b[0].length - a[0].length)[0]
// A 3-digit match (e.g. 403 Goa) is more exact than the 2-digit city guess (40 Mumbai)
const placeOf = (pin) => {
  const st = stateMatch(pin)
  if (st && st[0].length >= 3) return st[1]
  return cities[pin.slice(0, 2)] || st?.[1]
}

// Rule-based estimate until a courier serviceability API is connected.
// The admin can block pincodes or prefixes (e.g. "194" or "744101") in the store settings.
export async function checkPincode(pin) {
  const { unserviceablePincodes } = await getWebsiteSettings()
  if (unserviceablePincodes.some((p) => pin.startsWith(p))) {
    return { ok: false, pincode: pin, message: 'Sorry, we do not deliver to this pincode yet. Please call us for help.' }
  }
  const prefix = pin.slice(0, 2)
  const days = ['11', '12', '20'].includes(prefix) ? 2 : ['18', '19', '79'].includes(prefix) ? 8 : 5
  const eta = new Date(Date.now() + days * 864e5).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
  return { ok: true, pincode: pin, city: placeOf(pin) || 'your area', days, eta, cod: true }
}

/* ---------------- Stock ---------------- */

// Atomically takes stock for every item; puts it back if any item runs out
export async function deductStock(items) {
  const done = []
  for (const it of items) {
    const res = await Product.updateOne({ slug: it.id, stock: { $gte: it.qty } }, { $inc: { stock: -it.qty, sold: it.qty } })
    if (res.modifiedCount !== 1) {
      await restoreStock(done)
      return { ok: false, item: it }
    }
    done.push(it)
  }
  return { ok: true }
}

export async function restoreStock(items) {
  for (const it of items) await Product.updateOne({ slug: it.id }, { $inc: { stock: it.qty, sold: -it.qty } })
}

/* ---------------- Razorpay ---------------- */

let rzp = null
const razorpay = () => (rzp ??= new Razorpay({ key_id: config.razorpay.keyId, key_secret: config.razorpay.keySecret }))

export async function createRazorpayOrder(orderNo, amountRupees) {
  const r = await razorpay().orders.create({ amount: Math.round(amountRupees * 100), currency: 'INR', receipt: orderNo })
  return { keyId: config.razorpay.keyId, orderId: r.id, amount: r.amount, currency: r.currency }
}

export function verifyRazorpaySignature(orderId, paymentId, signature) {
  if (!razorpayEnabled() || !orderId || !paymentId || !signature) return false
  const expected = crypto.createHmac('sha256', config.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(String(signature))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function refundRazorpayPayment(paymentId, amountRupees) {
  const r = await razorpay().payments.refund(paymentId, { amount: Math.round(amountRupees * 100), speed: 'normal' })
  return { id: r.id, status: r.status }
}

// Razorpay webhooks are signed with the webhook secret over the raw request body
export function verifyWebhookSignature(rawBody, signature) {
  const secret = config.razorpay.webhookSecret
  if (!secret || !signature || !rawBody) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(String(signature))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export const newOrderNo = () => `GB${Date.now().toString().slice(-6)}${crypto.randomInt(10, 99)}`
