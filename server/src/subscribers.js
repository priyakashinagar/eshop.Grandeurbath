// Reactions to backend events. Routes only emit events; everything that should happen "because of"
// an event (saving the event log, emails, future SMS/WhatsApp, analytics) is registered here.
import { on } from './events.js'
import { redact } from './logging.js'
import { mails } from './mail.js'
import { EventLog } from './models/logs.js'

let registered = false

export function registerSubscribers() {
  if (registered) return
  registered = true

  // 1. Every event is stored in the event log
  on('*', (e) =>
    EventLog.create({
      name: e.name,
      actor: e.actor,
      entity: e.entity,
      data: redact(e.data),
      changes: e.changes,
      requestId: e.requestId,
      ip: e.ip,
      createdAt: e.at,
    }),
  )

  // 2. Customer and admin emails
  on('order.placed', ({ payload }) => {
    mails.orderPlaced(payload.order)
    mails.adminNewOrder(payload.order)
  })
  on('order.status_changed', ({ payload, data }) => mails.orderStatus(payload.order, data.note))
  on('order.cancelled', ({ payload }) => mails.orderStatus(payload.order))
  on('order.return_updated', ({ payload }) => mails.returnUpdate(payload.order))
  on('auth.password_reset_requested', ({ payload }) => mails.passwordReset(payload.user, payload.link))
  on('enquiry.created', ({ payload }) => mails.adminNewEnquiry(payload.enquiry))

  // 3. Server errors are also printed for whoever watches the server console
  on('system.error', (e) => console.error(`[${e.requestId}] ${e.data.method} ${e.data.path}: ${e.data.message}`))
}
