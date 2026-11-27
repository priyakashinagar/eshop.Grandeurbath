import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { config } from './config.js'
import { User } from './models/index.js'
import { setCtxUser } from './context.js'
import { emit } from './events.js'

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

export const signToken = (user) => jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn })

async function readUser(req) {
  const header = req.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return null
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    const user = await User.findById(payload.sub)
    const active = user?.active === false ? null : user
    setCtxUser(active)
    return active
  } catch {
    return null
  }
}

// Attaches req.user when a valid token is sent; guests continue without it
export async function optionalAuth(req, _res, next) {
  req.user = await readUser(req)
  next()
}

export async function requireAuth(req, _res, next) {
  req.user = await readUser(req)
  if (!req.user) throw new HttpError(401, 'Please log in to continue')
  next()
}

export async function requireAdmin(req, _res, next) {
  req.user = await readUser(req)
  if (!req.user) throw new HttpError(401, 'Please log in to continue')
  if (req.user.role !== 'admin') throw new HttpError(403, 'Admin access only')
  next()
}

// Validates req.body / req.query with a zod schema and replaces it with the parsed value
export const validate = (schema, where = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[where] ?? {})
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
    throw new HttpError(400, issues[0]?.message || 'Invalid input', issues)
  }
  if (where === 'query') req.validQuery = result.data
  else req[where] = result.data
  next()
}

export const notFound = (req) => {
  throw new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`)
}

// Express 5 forwards errors thrown in async handlers here
export function errorHandler(err, req, res, _next) {
  res.locals.errorMessage = err?.message
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'value'
    return res.status(409).json({ ok: false, message: `This ${field} is already in use` })
  }
  if (err?.name === 'CastError') return res.status(400).json({ ok: false, message: 'Invalid id' })
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ ok: false, message: 'Invalid JSON body' })
  const status = err.status || 500
  if (status >= 500) {
    const stack = err.stack?.split('\n').slice(0, 6).join('\n')
    emit('system.error', { data: { method: req.method, path: req.originalUrl.split('?')[0], message: err.message, stack } })
  }
  res.status(status).json({ ok: false, message: status >= 500 && config.isProd ? 'Something went wrong' : err.message, details: err.details })
}

// Common field rules
export const rules = {
  mobile: z.string().trim().regex(/^[6-9][0-9]{9}$/, 'Enter a valid 10 digit mobile number'),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email')),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6 digit pincode'),
  name: z.string().trim().min(2, 'Please enter your name').max(80),
}
