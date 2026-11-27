// Small in-process event bus.
//
//   emit('order.placed', { data, entity, changes, payload })
//
// - data:    small, JSON-safe details. Stored in the event log (sensitive keys are redacted).
// - entity:  what the event is about, e.g. { type: 'order', id: 'GB12345678' }.
// - changes: { before, after } for admin edits. Stored in the event log.
// - payload: live objects for subscribers (e.g. the order document). Never stored.
//
// Subscribers (src/subscribers.js) react to events: save the event log, send emails, etc.
// Handlers run after the current request work, never block the response and never throw into routes.
import { getCtx } from './context.js'

const handlers = new Map() // name -> Set<fn>; "*" receives every event
const pending = new Set()

export function on(name, fn) {
  if (!handlers.has(name)) handlers.set(name, new Set())
  handlers.get(name).add(fn)
  return () => handlers.get(name)?.delete(fn)
}

export function clearHandlers() {
  handlers.clear()
}

function actorFrom(ctx) {
  if (ctx.system) return { type: 'system' }
  if (ctx.user) return { type: ctx.user.role === 'admin' ? 'admin' : 'customer', id: ctx.user.id, name: ctx.user.name }
  return { type: 'guest' }
}

export function emit(name, { data = {}, entity, changes, payload, actor } = {}) {
  const ctx = getCtx()
  const event = {
    name,
    at: new Date(),
    data,
    entity,
    changes,
    payload,
    actor: actor || actorFrom(ctx),
    requestId: ctx.requestId,
    ip: ctx.ip,
  }
  const list = [...(handlers.get(name) || []), ...(handlers.get('*') || [])]
  for (const fn of list) {
    const p = Promise.resolve()
      .then(() => fn(event))
      .catch((err) => console.error(`Event handler failed for ${name}:`, err?.message || err))
      .finally(() => pending.delete(p))
    pending.add(p)
  }
  return event
}

// Waits for running handlers (used by tests and graceful shutdown)
export async function flushEvents() {
  while (pending.size) await Promise.allSettled([...pending])
}

// Every event the backend emits, for documentation and the admin log filter
export const EVENTS = {
  auth: ['auth.signup', 'auth.login', 'auth.login_failed', 'auth.password_changed', 'auth.password_reset_requested', 'auth.password_reset'],
  account: ['account.updated', 'account.address_added', 'account.address_updated', 'account.address_removed', 'account.cart_saved'],
  orders: [
    'order.placed',
    'order.payment_pending',
    'order.payment_verified',
    'order.payment_failed',
    'order.cancelled',
    'order.status_changed',
    'order.return_requested',
    'order.return_updated',
    'order.refund_processed',
    'order.refund_failed',
    'payment.webhook_received',
  ],
  catalog: ['product.created', 'product.updated', 'product.deleted', 'product.visibility_changed', 'product.imported', 'content.created', 'content.updated', 'content.deleted', 'upload.created'],
  store: ['settings.updated', 'coupon.created', 'coupon.updated', 'coupon.deleted', 'coupon.applied'],
  customers: ['user.updated_by_admin', 'review.created', 'review.moderated', 'review.deleted', 'question.created', 'question.answered', 'question.deleted', 'enquiry.created', 'enquiry.updated', 'newsletter.subscribed'],
  system: ['system.error'],
}
