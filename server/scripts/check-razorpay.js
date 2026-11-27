// Checks the Razorpay keys in .env without opening the website.
// Usage: npm run check:razorpay
// It creates a ₹1 order on Razorpay (nothing is charged; in test mode no real money is involved).
import Razorpay from 'razorpay'
import { config, paymentMode } from '../src/config.js'

const mode = paymentMode()
if (mode === 'mock') {
  console.log('No Razorpay keys found. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to server/.env (Razorpay Dashboard > Account & Settings > API Keys, in Test Mode).')
  process.exit(1)
}

console.log(`Key ${config.razorpay.keyId.slice(0, 13)}… (${mode.toUpperCase()} mode)`)
if (mode === 'live') console.log('Warning: these are LIVE keys. Use rzp_test_ keys while testing.')

try {
  const rzp = new Razorpay({ key_id: config.razorpay.keyId, key_secret: config.razorpay.keySecret })
  const order = await rzp.orders.create({ amount: 100, currency: 'INR', receipt: `key-check-${Date.now()}` })
  console.log(`OK: Razorpay accepted the keys and created order ${order.id} (status: ${order.status}).`)
  console.log(config.razorpay.webhookSecret ? 'Webhook secret: set' : 'Webhook secret: not set (optional while testing on localhost)')
} catch (err) {
  const reason = err?.error?.description || err?.message || String(err)
  console.log(`FAILED: ${reason}`)
  if (err?.statusCode === 401) console.log('Check that the Key ID and Key Secret are copied completely and belong to the same mode (test/live).')
  process.exit(1)
}
