// Calls to the Express backend in /server. Every function resolves to { ok, ... } or throws on network failure
// (getProducts only), so pages can show the backend's message to the customer.

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api'
const TOKEN_KEY = 'gb-token'

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
const setToken = (t) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // storage unavailable
  }
}
export const clearToken = () => setToken(null)

async function call(path, { method = 'GET', body, query } = {}) {
  const qs = query ? `?${new URLSearchParams(query)}` : ''
  const headers = { Accept: 'application/json' }
  if (body) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  try {
    const res = await fetch(`${BASE}${path}${qs}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
    const data = await res.json().catch(() => ({}))
    if (res.status === 401 && token) clearToken()
    if (!res.ok) return { ok: false, status: res.status, message: data.message || 'Something went wrong. Please try again.' }
    return { ok: true, ...data }
  } catch {
    return { ok: false, status: 0, message: 'Cannot reach the server. Please check your internet and try again.' }
  }
}

/* Products */

// GET /products: throws so start-up can fall back to sample data
export async function getProducts() {
  const res = await call('/products')
  if (!res.ok) throw new Error(res.message)
  return res.products
}

export const getReviews = (id) => call(`/products/${encodeURIComponent(id)}/reviews`)
export const addReview = (id, review) => call(`/products/${encodeURIComponent(id)}/reviews`, { method: 'POST', body: review })
export const getQuestions = (id) => call(`/products/${encodeURIComponent(id)}/questions`)
export const askQuestion = (id, q) => call(`/products/${encodeURIComponent(id)}/questions`, { method: 'POST', body: { q } })

/* Delivery and coupons */

export async function checkPincode(pincode) {
  const pin = String(pincode || '').trim()
  if (!/^[1-9][0-9]{5}$/.test(pin)) return { ok: false, message: 'Enter a valid 6 digit pincode' }
  return call(`/delivery/${pin}`)
}

export const applyCoupon = (code, subtotal) => call('/coupons/apply', { method: 'POST', body: { code, subtotal } })

/* Auth: the token is stored here; callers only get { ok, user } */

async function withToken(promise) {
  const res = await promise
  if (res.ok) setToken(res.token)
  return res
}

export const signup = ({ name, mobile, email, password }) => withToken(call('/auth/signup', { method: 'POST', body: { name, mobile, email, password } }))
export const login = ({ id, password }) => withToken(call('/auth/login', { method: 'POST', body: { id, password } }))
export const getMe = () => call('/me')

export const getSavedCart = () => call('/me/cart')
export const saveCart = (cart, wishlist) => call('/me/cart', { method: 'PUT', body: { cart, wishlist } })

/* Orders */

// POST /orders. For online payment the response also has `razorpay` (real keys, or { testMode: true })
export const placeOrder = ({ items, customer, address, coupon, payment }) =>
  call('/orders', { method: 'POST', body: { items: items.map((i) => ({ id: i.id, qty: i.qty })), customer, address, coupon: coupon || undefined, payment } })

export const verifyPayment = (orderId, payload) => call(`/orders/${encodeURIComponent(orderId)}/verify-payment`, { method: 'POST', body: payload })
export const myOrders = () => call('/orders/mine')
export const trackOrder = (id, mobile) => call('/orders/track', { query: { id, mobile } })
export const cancelOrder = (id, mobile) => call(`/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST', query: mobile ? { mobile } : undefined })

/* Enquiries and newsletter */

export const sendEnquiry = (data) => call('/enquiries', { method: 'POST', body: data })
export const subscribe = (email) => call('/newsletter', { method: 'POST', body: { email } })

/* Razorpay Checkout (https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/) */

let rzpScript
const loadRazorpay = () =>
  (rzpScript ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = resolve
    s.onerror = () => {
      rzpScript = null
      reject(new Error('Could not load Razorpay'))
    }
    document.body.appendChild(s)
  }))

// Opens Razorpay and resolves with the verified order, or { ok: false, message } if cancelled or failed
export async function payWithRazorpay(order, rp) {
  if (rp.testMode) return verifyPayment(order.id, { test: true })
  try {
    await loadRazorpay()
  } catch (e) {
    return { ok: false, message: e.message }
  }
  return new Promise((resolve) => {
    const checkout = new window.Razorpay({
      key: rp.keyId,
      order_id: rp.orderId,
      amount: rp.amount,
      currency: rp.currency,
      name: 'Grandeur Bath',
      description: `Order ${order.id}`,
      prefill: { name: rp.name, email: rp.email, contact: rp.contact },
      theme: { color: '#AE7714' },
      handler: async (resp) => resolve(await verifyPayment(order.id, resp)),
      modal: { ondismiss: () => resolve({ ok: false, cancelled: true, message: 'Payment was cancelled. Your order is saved; you can try again.' }) },
    })
    // On payment.failed Razorpay keeps its window open so the customer can retry; closing it resolves via ondismiss
    checkout.open()
  })
}

/* Order stages for tracking (status comes from the admin panel) */

export const orderStages = ['Order placed', 'Confirmed', 'Shipped', 'Out for delivery', 'Delivered']
const stageKeys = ['placed', 'confirmed', 'shipped', 'out_for_delivery', 'delivered']

export function orderStage(order) {
  if (order.status === 'cancelled') return -1
  return Math.max(0, stageKeys.indexOf(order.status))
}
