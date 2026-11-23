// Mock API. Every function returns a Promise with the shape the UI expects,
// so each one can later be replaced with a real fetch() call without touching the pages.
import { products, findProduct } from '../data/shop'
import { couponDiscount } from '../utils/pricing'

const wait = (ms = 450) => new Promise((r) => setTimeout(r, ms))

const USERS_KEY = 'gb-users'
const readUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || []
  } catch {
    return []
  }
}
const writeUsers = (list) => {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(list))
  } catch {
    // storage unavailable
  }
}

// GET /products
export async function getProducts() {
  await wait(150)
  return products
}

// GET /products/:id
export async function getProduct(id) {
  await wait(150)
  return findProduct(id) || null
}

const cities = {
  11: 'New Delhi', 12: 'Gurugram', 13: 'Haryana', 14: 'Punjab', 20: 'Ghaziabad / Noida', 22: 'Lucknow', 30: 'Jaipur', 38: 'Ahmedabad',
  40: 'Mumbai', 41: 'Pune', 45: 'Indore', 50: 'Hyderabad', 56: 'Bengaluru', 60: 'Chennai', 68: 'Kochi', 70: 'Kolkata', 80: 'Patna',
}

// GET /delivery/check?pincode=
export async function checkPincode(pincode) {
  await wait()
  const pin = String(pincode || '').trim()
  if (!/^[1-9][0-9]{5}$/.test(pin)) return { ok: false, message: 'Enter a valid 6 digit pincode' }
  const prefix = pin.slice(0, 2)
  const days = ['11', '12', '20'].includes(prefix) ? 2 : ['18', '19', '79'].includes(prefix) ? 8 : 5
  const eta = new Date(Date.now() + days * 864e5).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  return { ok: true, pincode: pin, city: cities[prefix] || 'your area', days, eta, cod: true }
}

// POST /coupons/apply
export async function applyCoupon(code, subtotal) {
  await wait()
  return couponDiscount(code, subtotal)
}

// POST /auth/signup
export async function signup({ name, mobile, email, password }) {
  await wait()
  const users = readUsers()
  if (users.some((u) => u.mobile === mobile || (email && u.email === email))) {
    return { ok: false, message: 'An account with this mobile or email already exists. Please log in.' }
  }
  const user = { id: `U${Date.now()}`, name, mobile, email }
  writeUsers([...users, { ...user, password }])
  return { ok: true, user }
}

// POST /auth/login
export async function login({ id, password }) {
  await wait()
  const key = String(id || '').trim().toLowerCase()
  const found = readUsers().find((u) => u.mobile === key || u.email?.toLowerCase() === key)
  if (!found || found.password !== password) return { ok: false, message: 'Mobile/email or password is incorrect' }
  const { password: _pw, ...user } = found
  return { ok: true, user }
}

// POST /orders. Online payments would open Razorpay Checkout here with the order id from the server.
export async function placeOrder(payload) {
  await wait(900)
  const id = `GB${Date.now().toString().slice(-8)}`
  const paid = payload.payment !== 'cod'
  return {
    ok: true,
    order: {
      ...payload,
      id,
      createdAt: new Date().toISOString(),
      status: 'placed',
      paymentStatus: paid ? 'paid' : 'pending',
    },
  }
}

// Order stages for tracking. A real API would return the courier status instead.
export const orderStages = ['Order placed', 'Confirmed', 'Shipped', 'Out for delivery', 'Delivered']

export function orderStage(order) {
  if (order.status === 'cancelled') return -1
  const hours = (Date.now() - new Date(order.createdAt).getTime()) / 36e5
  if (hours > 96) return 4
  if (hours > 72) return 3
  if (hours > 24) return 2
  if (hours > 1) return 1
  return 0
}
