import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'

process.env.NODE_ENV = 'test'
const ADMIN = { email: 'admin@test.local', password: 'admin12345' }

let mongo, app, mongoose, admin, ApiLog, EventLog, settle

before(async () => {
  mongo = await MongoMemoryServer.create()
  const { connectDb } = await import('../src/db.js')
  const { seed } = await import('../src/seed/seed.js')
  const { createApp } = await import('../src/app.js')
  const { flushEvents } = await import('../src/events.js')
  const { flushLogs } = await import('../src/logging.js')
  ;({ ApiLog, EventLog } = await import('../src/models/logs.js'))
  mongoose = (await import('mongoose')).default
  settle = async () => {
    await flushEvents()
    await flushLogs()
  }
  await connectDb(mongo.getUri())
  await seed({ admin: ADMIN, log: () => {} })
  app = createApp()
  const token = (await request(app).post('/api/auth/login').send({ id: ADMIN.email, password: ADMIN.password })).body.token
  admin = { Authorization: `Bearer ${token}` }
})

after(async () => {
  await settle()
  await mongoose.disconnect()
  await mongo.stop()
})

describe('API logs', () => {
  test('every API call is stored with route, status, timing and request id', async () => {
    const res = await request(app).get('/api/products/does-not-exist').set('X-Request-Id', 'test-request-0001').expect(404)
    assert.equal(res.headers['x-request-id'], 'test-request-0001')
    await settle()
    const log = await ApiLog.findOne({ requestId: 'test-request-0001' }).lean()
    assert.equal(log.method, 'GET')
    assert.equal(log.path, '/api/products/does-not-exist')
    assert.equal(log.route, '/api/products/:id')
    assert.equal(log.status, 404)
    assert.equal(log.error, 'Product not found')
    assert.ok(log.durationMs >= 0)
  })

  test('passwords and tokens never reach the logs', async () => {
    await request(app).post('/api/auth/signup').send({ name: 'Log Tester', mobile: '9833300000', email: 'logs@test.local', password: 'supersecret1' }).expect(201)
    await settle()
    const log = await ApiLog.findOne({ path: '/api/auth/signup', status: 201 }).lean()
    assert.equal(log.body.password, '[redacted]')
    assert.equal(log.body.email, 'logs@test.local')
    const all = JSON.stringify(await ApiLog.find().lean()) + JSON.stringify(await EventLog.find().lean())
    assert.ok(!all.includes('supersecret1'), 'raw password is not stored anywhere')
    assert.ok(!all.includes(ADMIN.password), 'admin password is not stored anywhere')
  })

  test('logged-in user is attached to the log', async () => {
    const res = await request(app).get('/api/admin/dashboard').set(admin).expect(200)
    await settle()
    const log = await ApiLog.findOne({ requestId: res.headers['x-request-id'] }).lean()
    assert.equal(log.user.role, 'admin')
  })
})

describe('event logs', () => {
  test('login and failed login are recorded', async () => {
    await request(app).post('/api/auth/login').send({ id: 'logs@test.local', password: 'wrong-one' }).expect(401)
    await request(app).post('/api/auth/login').send({ id: 'logs@test.local', password: 'supersecret1' }).expect(200)
    await settle()
    const failed = await EventLog.findOne({ name: 'auth.login_failed' }).lean()
    assert.equal(failed.data.reason, 'wrong_password')
    const ok = await EventLog.findOne({ name: 'auth.login', 'actor.name': 'Log Tester' }).lean()
    assert.equal(ok.actor.type, 'customer')
  })

  test('order events share the request id with the API log and build a timeline', async () => {
    const product = (await request(app).get('/api/products')).body.products.find((p) => p.stock > 5 && p.price < 3000)
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ id: product.id, qty: 1 }], customer: { name: 'Event Buyer', mobile: '9844400000', email: 'buyer@test.local' }, address: { line1: '1 Event Road, Block A', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301' }, payment: 'cod' })
      .expect(201)
    const orderId = res.body.order.id
    await request(app).patch(`/api/admin/orders/${orderId}/status`).set(admin).send({ status: 'shipped', note: 'Sent with BlueDart' }).expect(200)
    await settle()

    const placed = await EventLog.findOne({ name: 'order.placed', 'entity.id': orderId }).lean()
    assert.equal(placed.actor.type, 'guest')
    assert.equal(placed.data.total, res.body.order.summary.total)
    assert.equal(placed.requestId, res.headers['x-request-id'])
    assert.ok(await ApiLog.exists({ requestId: placed.requestId, path: '/api/orders' }))

    const timeline = (await request(app).get(`/api/admin/logs/timeline/order/${orderId}`).set(admin).expect(200)).body.items
    assert.deepEqual(timeline.map((e) => e.name), ['order.placed', 'order.status_changed'])
    assert.deepEqual(timeline[1].changes, { before: { status: 'placed' }, after: { status: 'shipped' } })
    assert.equal(timeline[1].actor.type, 'admin')
  })

  test('admin edits store before and after values', async () => {
    const p = (await request(app).get('/api/admin/products').set(admin)).body.products[0]
    await request(app).patch(`/api/admin/products/${p._id}`).set(admin).send({ price: p.price - 10, stock: 3 }).expect(200)
    await request(app).put('/api/admin/settings').set(admin).send({ codLimit: 40000 }).expect(200)
    await settle()
    const upd = await EventLog.findOne({ name: 'product.updated', 'entity.id': p.code }).lean()
    assert.deepEqual(upd.changes.before, { price: p.price, stock: p.stock })
    assert.deepEqual(upd.changes.after, { price: p.price - 10, stock: 3 })
    const st = await EventLog.findOne({ name: 'settings.updated' }).lean()
    assert.deepEqual(st.changes, { before: { codLimit: 50000 }, after: { codLimit: 40000 } })
  })
})

describe('admin log APIs', () => {
  test('only admins can read logs', async () => {
    await request(app).get('/api/admin/logs/api').expect(401)
    const user = (await request(app).post('/api/auth/login').send({ id: 'logs@test.local', password: 'supersecret1' })).body.token
    await request(app).get('/api/admin/logs/events').set('Authorization', `Bearer ${user}`).expect(403)
  })

  test('filters, paging and summary', async () => {
    const errors = (await request(app).get('/api/admin/logs/api').set(admin).query({ errors: 1, limit: 5 }).expect(200)).body
    assert.ok(errors.total >= 2)
    assert.ok(errors.items.every((l) => l.status >= 400))
    assert.ok(errors.items.length <= 5)

    const orderEvents = (await request(app).get('/api/admin/logs/events').set(admin).query({ name: 'order.' }).expect(200)).body
    assert.ok(orderEvents.items.length >= 2)
    assert.ok(orderEvents.items.every((e) => e.name.startsWith('order.')))

    const summary = (await request(app).get('/api/admin/logs/summary').set(admin).expect(200)).body
    assert.ok(summary.events.some((e) => e.name === 'order.placed'))
    assert.ok(summary.api['2xx'] > 0)
    assert.ok(summary.knownEvents.orders.includes('order.placed'))
  })
})
