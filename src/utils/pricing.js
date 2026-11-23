import { coupons, delivery } from '../data/shop'

export const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`

export const findCoupon = (code) => coupons.find((c) => c.code === String(code || '').trim().toUpperCase())

// Returns { ok, discount, message } for a coupon against a cart subtotal
export function couponDiscount(code, subtotal) {
  const c = findCoupon(code)
  if (!c) return { ok: false, discount: 0, message: 'This coupon code is not valid' }
  if (subtotal < c.min) return { ok: false, discount: 0, message: `Add ${inr(c.min - subtotal)} more to use ${c.code}` }
  const raw = c.type === 'flat' ? c.value : (subtotal * c.value) / 100
  const discount = Math.round(Math.min(raw, c.max ?? raw, subtotal))
  return { ok: true, discount, message: `${c.code} applied. You save ${inr(discount)}` }
}

// rows: [{ product, qty }]. Prices are GST inclusive, GST is shown as a breakup.
export function summarize(rows, couponCode) {
  const mrpTotal = rows.reduce((s, r) => s + r.product.mrp * r.qty, 0)
  const subtotal = rows.reduce((s, r) => s + r.product.price * r.qty, 0)
  const coupon = couponCode ? couponDiscount(couponCode, subtotal) : null
  const couponOff = coupon?.ok ? coupon.discount : 0
  const afterCoupon = subtotal - couponOff
  const shipping = rows.length === 0 || afterCoupon >= delivery.freeAbove ? 0 : delivery.charge
  const total = afterCoupon + shipping
  const gst = Math.round(afterCoupon - afterCoupon / (1 + delivery.gstRate / 100))
  return {
    count: rows.reduce((n, r) => n + r.qty, 0),
    mrpTotal,
    subtotal,
    mrpDiscount: mrpTotal - subtotal,
    coupon,
    couponOff,
    shipping,
    gst,
    taxable: afterCoupon - gst,
    total,
    savings: mrpTotal - subtotal + couponOff,
    freeShippingGap: shipping ? delivery.freeAbove - afterCoupon : 0,
  }
}
