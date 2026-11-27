import path from 'node:path'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { config } from './config.js'
import { errorHandler, notFound } from './middleware.js'
import { requestContext } from './context.js'
import { requestLogger } from './logging.js'
import { registerSubscribers } from './subscribers.js'
import publicRoutes from './routes/public.js'
import authRoutes from './routes/auth.js'
import orderRoutes, { razorpayWebhook } from './routes/orders.js'
import adminRoutes from './routes/admin.js'
import adminStoreRoutes from './routes/adminStore.js'
import logRoutes from './routes/logs.js'

export function createApp() {
  registerSubscribers()
  const app = express()
  app.set('trust proxy', 1)
  app.disable('x-powered-by')
  // Uploaded product images are shown on the website, which runs on another origin
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(cors({ origin: config.corsOrigins, credentials: false, exposedHeaders: ['X-Request-Id'] }))
  // Request id + user context for events, then one stored log per API call
  app.use(requestContext)
  app.use(requestLogger)

  // Razorpay signs the raw body, so this route must read it before the JSON parser
  app.post('/api/payments/razorpay/webhook', express.raw({ type: 'application/json', limit: '1mb' }), razorpayWebhook)

  app.use(express.json({ limit: '2mb' }))
  if (config.env !== 'test') app.use(morgan(config.isProd ? 'combined' : 'dev'))

  app.use('/uploads', express.static(path.resolve(config.uploadDir), { maxAge: '30d', index: false }))
  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'grandeur-bath-api' }))
  app.use('/api', publicRoutes, authRoutes, orderRoutes, adminRoutes, adminStoreRoutes, logRoutes)
  app.use(notFound)
  app.use(errorHandler)
  return app
}
