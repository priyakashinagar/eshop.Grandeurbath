import mongoose from 'mongoose'
import { createApp } from './app.js'
import { config, paymentMode } from './config.js'
import { connectDb } from './db.js'
import { flushEvents } from './events.js'
import { flushLogs } from './logging.js'

let uri = config.mongoUri
let mongo = null

// No database configured during development: start a temporary in-memory MongoDB with dummy data,
// so `npm run dev` works before MongoDB is installed. Production always needs MONGODB_URI.
if (!uri && !config.isProd) {
  const { MongoMemoryServer } = await import('mongodb-memory-server')
  mongo = await MongoMemoryServer.create()
  uri = mongo.getUri()
  console.warn('\nMONGODB_URI is not set, using a temporary in-memory database. Data resets on every restart.')
  await connectDb(uri)
  const { seed } = await import('./seed/seed.js')
  await seed({ admin: { email: config.admin.email || 'admin@grandeurbath.local', password: config.admin.password || 'admin12345' } })
} else {
  await connectDb(uri)
}

const server = createApp().listen(config.port, () => {
  console.log(`Grandeur Bath API running on http://localhost:${config.port}/api`)
  const mode = paymentMode()
  console.log(mode === 'test' ? 'Payments: Razorpay TEST mode (no real money)' : mode === 'live' ? 'Payments: Razorpay LIVE mode' : 'Payments: mock mode (no Razorpay keys in .env)')
})

// Finish open requests and write the remaining logs and events before exiting
let stopping = false
async function shutdown(signal) {
  if (stopping) return
  stopping = true
  console.log(`\n${signal} received, shutting down...`)
  server.close()
  await flushEvents()
  await flushLogs()
  await mongoose.disconnect()
  await mongo?.stop()
  process.exit(0)
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
