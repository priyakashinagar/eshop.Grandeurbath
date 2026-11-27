import { Router } from 'express'
import { z } from 'zod'
import { ApiLog, EventLog } from '../models/logs.js'
import { requireAdmin, validate } from '../middleware.js'
import { EVENTS } from '../events.js'

const r = Router()
r.use('/admin/logs', requireAdmin)

const page = { page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(200).default(50) }
const range = { from: z.coerce.date().optional(), to: z.coerce.date().optional() }
const dateFilter = ({ from, to }) => (from || to ? { createdAt: { ...(from && { $gte: from }), ...(to && { $lte: to }) } } : {})
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

async function paged(Model, filter, { page: p, limit }) {
  const [total, items] = await Promise.all([Model.countDocuments(filter), Model.find(filter).sort({ createdAt: -1 }).skip((p - 1) * limit).limit(limit).lean()])
  return { ok: true, total, page: p, pages: Math.max(1, Math.ceil(total / limit)), items }
}

// GET /admin/logs/api: every API call
r.get(
  '/admin/logs/api',
  validate(
    z.object({
      ...page,
      ...range,
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
      status: z.coerce.number().int().min(100).max(599).optional(),
      errors: z.enum(['1', 'true']).optional(), // only 4xx/5xx
      path: z.string().trim().max(200).optional(), // contains
      userId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
      requestId: z.string().max(80).optional(),
    }),
    'query',
  ),
  async (req, res) => {
    const q = req.validQuery
    const filter = {
      ...dateFilter(q),
      ...(q.method && { method: q.method }),
      ...(q.status && { status: q.status }),
      ...(q.errors && { status: { $gte: 400 } }),
      ...(q.path && { path: new RegExp(escape(q.path), 'i') }),
      ...(q.userId && { 'user.id': q.userId }),
      ...(q.requestId && { requestId: q.requestId }),
    }
    res.json(await paged(ApiLog, filter, q))
  },
)

// GET /admin/logs/events: business events (orders, payments, logins, admin changes...)
r.get(
  '/admin/logs/events',
  validate(
    z.object({
      ...page,
      ...range,
      name: z.string().trim().max(60).optional(), // exact name, or a prefix ending in "." e.g. "order."
      entityType: z.string().trim().max(30).optional(),
      entityId: z.string().trim().max(80).optional(),
      actorId: z.string().trim().max(40).optional(),
      actorType: z.enum(['guest', 'customer', 'admin', 'system']).optional(),
      requestId: z.string().max(80).optional(),
    }),
    'query',
  ),
  async (req, res) => {
    const q = req.validQuery
    const filter = {
      ...dateFilter(q),
      ...(q.name && { name: q.name.endsWith('.') ? new RegExp(`^${escape(q.name)}`) : q.name }),
      ...(q.entityType && { 'entity.type': q.entityType }),
      ...(q.entityId && { 'entity.id': q.entityId }),
      ...(q.actorId && { 'actor.id': q.actorId }),
      ...(q.actorType && { 'actor.type': q.actorType }),
      ...(q.requestId && { requestId: q.requestId }),
    }
    res.json(await paged(EventLog, filter, q))
  },
)

// GET /admin/logs/summary: counts per event name and API errors for a period (default last 7 days)
r.get('/admin/logs/summary', validate(z.object(range), 'query'), async (req, res) => {
  const from = req.validQuery.from || new Date(Date.now() - 7 * 864e5)
  const to = req.validQuery.to || new Date()
  const match = { createdAt: { $gte: from, $lte: to } }
  const [events, apiByStatus, slowest] = await Promise.all([
    EventLog.aggregate([{ $match: match }, { $group: { _id: '$name', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    ApiLog.aggregate([{ $match: match }, { $group: { _id: { $floor: { $divide: ['$status', 100] } }, count: { $sum: 1 } } }]),
    ApiLog.aggregate([{ $match: { ...match, route: { $ne: null } } }, { $group: { _id: { method: '$method', route: '$route' }, avgMs: { $avg: '$durationMs' }, calls: { $sum: 1 } } }, { $sort: { avgMs: -1 } }, { $limit: 10 }]),
  ])
  res.json({
    ok: true,
    from,
    to,
    events: events.map((e) => ({ name: e._id, count: e.count })),
    api: Object.fromEntries(apiByStatus.map((s) => [`${s._id}xx`, s.count])),
    slowestRoutes: slowest.map((s) => ({ method: s._id.method, route: s._id.route, avgMs: Math.round(s.avgMs), calls: s.calls })),
    knownEvents: EVENTS,
  })
})

// GET /admin/logs/timeline/:type/:id: full history of one order, product, user...
r.get('/admin/logs/timeline/:type/:id', async (req, res) => {
  const items = await EventLog.find({ 'entity.type': req.params.type, 'entity.id': req.params.id }).sort({ createdAt: 1 }).limit(500).lean()
  res.json({ ok: true, items })
})

export default r
