import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { config } from './config.js'
import { errorHandler, notFound } from './middleware.js'
import publicRoutes from './routes/public.js'
import authRoutes from './routes/auth.js'
import orderRoutes from './routes/orders.js'
import adminRoutes from './routes/admin.js'

export function createApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ origin: config.corsOrigins, credentials: false }))
  app.use(express.json({ limit: '200kb' }))
  if (config.env !== 'test') app.use(morgan(config.isProd ? 'combined' : 'dev'))

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'grandeur-bath-api' }))
  app.use('/api', publicRoutes, authRoutes, orderRoutes, adminRoutes)
  app.use(notFound)
  app.use(errorHandler)
  return app
}
