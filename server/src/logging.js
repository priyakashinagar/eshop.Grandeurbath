import { config } from './config.js'
import { getCtx } from './context.js'
import { ApiLog } from './models/logs.js'

const SECRET_KEY = /pass(word)?|token|secret|signature|authorization|cookie|otp|cvv|card/i
const MAX_STRING = 500
const MAX_ITEMS = 50

// Copies a value for logging: hides secrets, shortens long strings and big arrays, stops deep nesting
export function redact(value, depth = 0) {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'string') return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value
  if (value instanceof Date) return value
  if (typeof value.toHexString === 'function') return value.toHexString() // ObjectId
  if (depth > 5) return '[nested]'
  if (Array.isArray(value)) {
    const out = value.slice(0, MAX_ITEMS).map((v) => redact(v, depth + 1))
    if (value.length > MAX_ITEMS) out.push(`… ${value.length - MAX_ITEMS} more`)
    return out
  }
  if (typeof value === 'object') {
    const src = typeof value.toObject === 'function' ? value.toObject() : value
    const out = {}
    for (const [k, v] of Object.entries(src)) out[k] = SECRET_KEY.test(k) ? '[redacted]' : redact(v, depth + 1)
    return out
  }
  return String(value)
}

// Field-level before/after for admin edits; only the fields that actually changed
export function diff(before, after, keys = Object.keys(after || {})) {
  const b = {}
  const a = {}
  for (const k of keys) {
    const x = before?.[k]
    const y = after?.[k]
    if (JSON.stringify(x) !== JSON.stringify(y)) {
      b[k] = redact(x)
      a[k] = redact(y)
    }
  }
  return Object.keys(a).length ? { before: b, after: a } : undefined
}

const pending = new Set()

export async function flushLogs() {
  while (pending.size) await Promise.allSettled([...pending])
}

// Saves one ApiLog per request once the response is sent. Never slows down or breaks the response.
export function requestLogger(req, res, next) {
  const started = process.hrtime.bigint()
  res.on('finish', () => {
    if (!req.originalUrl.startsWith('/api') || req.originalUrl === '/api/health') return
    const ctx = getCtx()
    const user = ctx.user || (req.user ? { id: req.user._id.toString(), role: req.user.role, name: req.user.name } : undefined)
    const write = req.method !== 'GET' && req.method !== 'HEAD'
    const entry = {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      // baseUrl is already reset once the response finishes, so add the /api mount back by hand
      route: req.route ? (req.route.path.startsWith('/api') ? req.route.path : `/api${req.route.path}`) : undefined,
      query: Object.keys(req.query || {}).length ? redact(req.query) : undefined,
      body: write && req.body && !Buffer.isBuffer(req.body) && Object.keys(req.body).length ? redact(req.body) : undefined,
      status: res.statusCode,
      durationMs: Number(process.hrtime.bigint() - started) / 1e6,
      ip: req.ip,
      userAgent: (req.get('user-agent') || '').slice(0, 200),
      user,
      error: res.locals.errorMessage,
    }
    const p = ApiLog.create(entry)
      .catch((err) => config.env !== 'test' && console.error('API log failed:', err.message))
      .finally(() => pending.delete(p))
    pending.add(p)
  })
  next()
}
