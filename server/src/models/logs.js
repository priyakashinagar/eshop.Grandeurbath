import mongoose from 'mongoose'

const { Schema, model } = mongoose
const days = (n) => n * 24 * 60 * 60

// One document per API request. Removed automatically after API_LOG_DAYS (default 90).
const apiLogSchema = new Schema(
  {
    requestId: { type: String, index: true },
    method: String,
    path: String, // actual URL path, e.g. /api/orders/GB123
    route: String, // matched route pattern, e.g. /api/orders/:id
    query: Schema.Types.Mixed,
    body: Schema.Types.Mixed, // redacted, only for write requests
    status: { type: Number, index: true },
    durationMs: Number,
    ip: String,
    userAgent: String,
    user: { id: String, role: String, name: String },
    error: String,
    createdAt: { type: Date, default: Date.now, expires: days(Number(process.env.API_LOG_DAYS) || 90) },
  },
  { versionKey: false },
)
apiLogSchema.index({ createdAt: -1 })
apiLogSchema.index({ 'user.id': 1, createdAt: -1 })
apiLogSchema.index({ route: 1, createdAt: -1 })

// One document per business event. Removed automatically after EVENT_LOG_DAYS (default 365).
const eventLogSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    actor: { type: { type: String }, id: String, name: String }, // guest, customer, admin or system
    entity: { type: { type: String }, id: String }, // e.g. order GB12345678
    data: Schema.Types.Mixed,
    changes: { before: Schema.Types.Mixed, after: Schema.Types.Mixed },
    requestId: { type: String, index: true },
    ip: String,
    createdAt: { type: Date, default: Date.now, expires: days(Number(process.env.EVENT_LOG_DAYS) || 365) },
  },
  { versionKey: false },
)
eventLogSchema.index({ createdAt: -1 })
eventLogSchema.index({ 'entity.type': 1, 'entity.id': 1, createdAt: -1 })
eventLogSchema.index({ 'actor.id': 1, createdAt: -1 })

export const ApiLog = model('ApiLog', apiLogSchema)
export const EventLog = model('EventLog', eventLogSchema)
