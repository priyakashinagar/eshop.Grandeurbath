import { AsyncLocalStorage } from 'node:async_hooks'
import crypto from 'node:crypto'

// Per-request context (request id, IP, logged-in user) available anywhere in the call chain,
// so events and logs know "who did what" without passing req around.
const storage = new AsyncLocalStorage()

export const getCtx = () => storage.getStore() || {}

export function requestContext(req, res, next) {
  const incoming = req.get('x-request-id')
  const requestId = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID()
  res.set('X-Request-Id', requestId)
  req.requestId = requestId
  storage.run({ requestId, ip: req.ip, userAgent: req.get('user-agent') || '', user: null }, next)
}

// Called by the auth middleware once the user is known
export function setCtxUser(user) {
  const ctx = storage.getStore()
  if (ctx) ctx.user = user ? { id: user._id.toString(), role: user.role, name: user.name } : null
}

// Runs background work (seed, scripts, webhooks) with a "system" actor
export const runAsSystem = (fn) => storage.run({ requestId: `sys-${crypto.randomUUID()}`, ip: '', user: null, system: true }, fn)
