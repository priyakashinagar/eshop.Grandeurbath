import { company } from '../data/content'
import { delivery } from '../data/shop'

const money = (n) => Number(n || 0).toLocaleString('en-IN')

// Replaces {placeholders} in admin-written text with live store values, e.g. "within {returnDays} days"
export function fillText(text) {
  const values = {
    brand: company.brand,
    legal: company.legal,
    phone: company.phone,
    email: company.email,
    freeAbove: money(delivery.freeAbove),
    deliveryCharge: money(delivery.charge),
    codLimit: money(delivery.codLimit),
    returnDays: delivery.returnDays,
  }
  return String(text ?? '').replace(/\{(\w+)\}/g, (m, k) => (values[k] ?? m))
}
