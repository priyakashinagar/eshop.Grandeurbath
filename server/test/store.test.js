import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'

process.env.NODE_ENV = 'test'
process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test'
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-uploads-'))
const ADMIN = { email: 'admin@test.local', password: 'admin12345' }

let mongo, app, mongoose, Order, admin

before(async () => {
  mongo = await MongoMemoryServer.create()
  const { connectDb } = await import('../src/db.js')
  const { seed } = await import('../src/seed/seed.js')
  const { createApp } = await import('../src/app.js')
  ;({ Order } = await import('../src/models/index.js'))
  mongoose = (await import('mongoose')).default
  await connectDb(mongo.getUri())
  await seed({ admin: ADMIN, log: () => {} })
  app = createApp()
  const token = (await request(app).post('/api/auth/login').send({ id: ADMIN.email, password: ADMIN.password })).body.token
  admin = { Authorization: `Bearer ${token}` }
})

after(async () => {
  await mongoose.disconnect()
  await mongo.stop()
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true })
})

const customer = { name: 'Return Tester', mobile: '9811100000', email: 'returns@test.local' }
const address = { line1: '7 Test Lane, Sector 2', city: 'Ghaziabad', state: 'Uttar Pradesh', pincode: '201005' }
const anyProduct = async () => (await request(app).get('/api/products')).body.products.find((p) => p.stock >= 10 && p.price < 3000)

describe('store content', () => {
  test('categories, brands, banners and settings', async () => {
    const cats = (await request(app).get('/api/categories').expect(200)).body.groups
    assert.equal(cats.length, 4)
    assert.ok(cats.find((g) => g.key === 'water-tank').subs.some((s) => s.key === 'overhead'))
    assert.equal((await request(app).get('/api/brands')).body.brands.length, 5)
    const b = (await request(app).get('/api/banners')).body
    assert.equal(b.hero.length, 3)
    assert.equal(b.side.length, 2)
    assert.equal((await request(app).get('/api/settings')).body.settings.freeAbove, 999)
  })

  test('admin can add a category and a banner', async () => {
    await request(app).post('/api/admin/categories').set(admin).send({ key: 'geysers', label: 'Geysers' }).expect(201)
    assert.ok((await request(app).get('/api/categories')).body.groups.some((g) => g.key === 'geysers'))
    const created = await request(app).post('/api/admin/banners').set(admin).send({ title: 'Monsoon Sale', placement: 'hero', endsAt: '2020-01-01' }).expect(201)
    assert.ok(!(await request(app).get('/api/banners')).body.hero.some((x) => x.title === 'Monsoon Sale'), 'expired banner is hidden')
    await request(app).delete(`/api/admin/banners/${created.body.item._id}`).set(admin).expect(200)
  })
})

describe('product search and filters', () => {
  test('filter, sort, paginate and facets', async () => {
    const res = await request(app).get('/api/products').query({ group: 'water-tank', sort: 'price-asc', limit: 2, page: 1 }).expect(200)
    assert.equal(res.body.total, 6)
    assert.equal(res.body.products.length, 2)
    assert.equal(res.body.pages, 3)
    assert.ok(res.body.products[0].price <= res.body.products[1].price)
    assert.ok(res.body.facets.brand.some((b) => b.value === 'AquaMax'))

    const q = await request(app).get('/api/products').query({ q: 'cpvc pipe' })
    assert.ok(q.body.products.every((p) => /cpvc/i.test(p.name)))
    const multi = await request(app).get('/api/products').query({ brand: 'Delta,Kami', max: 5000 })
    assert.ok(multi.body.products.every((p) => ['Delta', 'Kami'].includes(p.brand) && p.price <= 5000))
    await request(app).get('/api/products').query({ sort: 'bogus' }).expect(400)
  })
})

describe('store settings change checkout', () => {
  test('delivery charge, COD limit and blocked pincodes come from admin settings', async () => {
    const p = await anyProduct()
    await request(app).put('/api/admin/settings').set(admin).send({ freeAbove: 100000, deliveryCharge: 150, codLimit: 100, unserviceablePincodes: ['194'] }).expect(200)

    assert.equal((await request(app).get('/api/delivery/194101')).body.ok, false)
    await request(app).post('/api/orders').send({ items: [{ id: p.id, qty: 1 }], customer, address: { ...address, pincode: '194101' }, payment: 'razorpay' }).expect(400)
    await request(app).post('/api/orders').send({ items: [{ id: p.id, qty: 1 }], customer, address, payment: 'cod' }).expect(400)
    const online = await request(app).post('/api/orders').send({ items: [{ id: p.id, qty: 1 }], customer, address, payment: 'razorpay' }).expect(201)
    assert.equal(online.body.order.summary.shipping, 150)

    await request(app).put('/api/admin/settings').set(admin).send({ freeAbove: 999, deliveryCharge: 99, codLimit: 50000, unserviceablePincodes: [] }).expect(200)
  })
})

describe('accounts', () => {
  let auth
  before(async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'Meera', mobile: '9822200000', email: 'meera@test.local', password: 'oldpass1' }).expect(201)
    auth = { Authorization: `Bearer ${res.body.token}` }
  })

  test('change password', async () => {
    await request(app).post('/api/me/password').set(auth).send({ currentPassword: 'wrong', newPassword: 'newpass1' }).expect(400)
    await request(app).post('/api/me/password').set(auth).send({ currentPassword: 'oldpass1', newPassword: 'newpass1' }).expect(200)
    await request(app).post('/api/auth/login').send({ id: 'meera@test.local', password: 'newpass1' }).expect(200)
  })

  test('forgot and reset password', async () => {
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@test.local' }).expect(200)
    assert.equal(unknown.headers['x-test-reset-token'], undefined)
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'meera@test.local' }).expect(200)
    const token = res.headers['x-test-reset-token']
    assert.equal(token.length, 64)
    await request(app).post('/api/auth/reset-password').send({ token: 'a'.repeat(64), password: 'resetpw1' }).expect(400)
    await request(app).post('/api/auth/reset-password').send({ token, password: 'resetpw1' }).expect(200)
    await request(app).post('/api/auth/reset-password').send({ token, password: 'again123' }).expect(400) // single use
    await request(app).post('/api/auth/login').send({ id: 'meera@test.local', password: 'resetpw1' }).expect(200)
  })

  test('address book keeps one default', async () => {
    const a1 = await request(app).post('/api/me/addresses').set(auth).send({ ...address, label: 'Home' }).expect(201)
    assert.equal(a1.body.addresses[0].isDefault, true)
    const a2 = await request(app).post('/api/me/addresses').set(auth).send({ ...address, label: 'Office', isDefault: true }).expect(201)
    assert.deepEqual(a2.body.addresses.map((a) => a.isDefault), [false, true])
    const del = await request(app).delete(`/api/me/addresses/${a2.body.addresses[1]._id}`).set(auth).expect(200)
    assert.equal(del.body.addresses[0].isDefault, true)
  })

  test('blocked users cannot log in', async () => {
    const users = (await request(app).get('/api/admin/users').set(admin).query({ q: 'meera' })).body.users
    await request(app).patch(`/api/admin/users/${users[0].id}`).set(admin).send({ active: false }).expect(200)
    await request(app).post('/api/auth/login').send({ id: 'meera@test.local', password: 'resetpw1' }).expect(403)
    await request(app).get('/api/me').set(auth).expect(401)
  })
})

describe('returns, refunds and invoices', () => {
  test('delivered order can be returned, received and refunded', async () => {
    const p = await anyProduct()
    const placed = (await request(app).post('/api/orders').send({ items: [{ id: p.id, qty: 2 }], customer, address, payment: 'cod' }).expect(201)).body.order
    await request(app).post(`/api/orders/${placed.id}/return`).query({ mobile: customer.mobile }).send({ reason: 'damaged', details: 'Box arrived broken' }).expect(400)

    await request(app).patch(`/api/admin/orders/${placed.id}/status`).set(admin).send({ status: 'delivered' }).expect(200)
    const afterSale = (await request(app).get(`/api/products/${p.id}`)).body.product.stock

    await request(app).post(`/api/orders/${placed.id}/return`).query({ mobile: customer.mobile }).send({ reason: 'damaged', details: 'Box arrived broken' }).expect(201)
    await request(app).post(`/api/orders/${placed.id}/return`).query({ mobile: customer.mobile }).send({ reason: 'damaged', details: 'Box arrived broken' }).expect(409)
    await request(app).patch(`/api/admin/returns/${placed.id}`).set(admin).send({ status: 'refunded' }).expect(400) // must be received first
    await request(app).patch(`/api/admin/returns/${placed.id}`).set(admin).send({ status: 'approved' }).expect(200)
    await request(app).patch(`/api/admin/returns/${placed.id}`).set(admin).send({ status: 'received' }).expect(200)
    assert.equal((await request(app).get(`/api/products/${p.id}`)).body.product.stock, afterSale + 2, 'stock comes back')
    const done = await request(app).patch(`/api/admin/returns/${placed.id}`).set(admin).send({ status: 'refunded' }).expect(200)
    assert.equal(done.body.order.paymentStatus, 'refunded')
    assert.equal(done.body.order.returnRequest.status, 'refunded')
  })

  test('invoice is only for the owner', async () => {
    const p = await anyProduct()
    const placed = (await request(app).post('/api/orders').send({ items: [{ id: p.id, qty: 1 }], customer, address, payment: 'cod' }).expect(201)).body.order
    const inv = await request(app).get(`/api/orders/${placed.id}/invoice`).query({ mobile: customer.mobile }).expect(200)
    assert.match(inv.headers['content-type'], /html/)
    assert.match(inv.text, /Tax Invoice/)
    assert.match(inv.text, /CGST 9%/) // Uttar Pradesh is intra-state
    await request(app).get(`/api/orders/${placed.id}/invoice`).query({ mobile: '9000000009' }).expect(404)
  })
})

describe('admin tools', () => {
  test('dashboard numbers', async () => {
    const d = (await request(app).get('/api/admin/dashboard').set(admin).expect(200)).body
    assert.ok(d.totals.orders >= 2)
    assert.ok(d.totals.revenue > 0)
    assert.ok(Array.isArray(d.lowStock))
  })

  test('import creates hidden products and updates existing ones by SKU', async () => {
    const res = await request(app)
      .post('/api/admin/products/import')
      .set(admin)
      .send({ products: [
        { code: 'NEW-001', name: 'Imported Geyser 15 L', brand: 'Grandeur Bath', group: 'bathroom', cat: 'showers', type: 'Geyser', mrp: 9000, price: 7000, stock: 5 },
        { code: 'ISH1118', name: 'Delta 10 inch H2Okinetic Rain Shower', brand: 'Delta', group: 'bathroom', cat: 'showers', type: 'Rain Shower', mrp: 21100, price: 16000, stock: 30 },
        { code: 'BAD-1', name: 'Bad price', brand: 'X', group: 'bathroom', cat: 'showers', type: 'T', mrp: 10, price: 20 },
        { name: 'missing code' },
      ] })
      .expect(200)
    assert.equal(res.body.created, 1)
    assert.equal(res.body.updated, 1)
    assert.equal(res.body.errors.length, 2)
    assert.ok(!(await request(app).get('/api/products')).body.products.some((p) => p.code === 'NEW-001'), 'new import is hidden until allowed')
    assert.equal((await request(app).get('/api/products/ISH1118')).body.product.price, 16000)
  })

  test('image upload accepts images only', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
    const ok = await request(app).post('/api/admin/uploads').set(admin).attach('files', png, { filename: 'tap.png', contentType: 'image/png' }).expect(201)
    assert.match(ok.body.urls[0], /\/uploads\/.+\.png$/)
    const file = ok.body.urls[0].split('/uploads/')[1]
    await request(app).get(`/uploads/${file}`).expect(200)
    await request(app).post('/api/admin/uploads').set(admin).attach('files', Buffer.from('hi'), { filename: 'x.exe', contentType: 'application/octet-stream' }).expect(400)
  })
})

describe('razorpay webhook', () => {
  test('rejects bad signatures and confirms a pending order', async () => {
    const p = await anyProduct()
    const placed = (await request(app).post('/api/orders').send({ items: [{ id: p.id, qty: 1 }], customer, address, payment: 'razorpay' }).expect(201)).body.order
    await Order.updateOne({ orderNo: placed.id }, { $set: { 'razorpay.orderId': 'order_TEST123' } })
    const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_TEST1', order_id: 'order_TEST123' } } } })

    await request(app).post('/api/payments/razorpay/webhook').set('Content-Type', 'application/json').set('X-Razorpay-Signature', 'bad').send(body).expect(400)
    const sig = crypto.createHmac('sha256', 'whsec_test').update(body).digest('hex')
    await request(app).post('/api/payments/razorpay/webhook').set('Content-Type', 'application/json').set('X-Razorpay-Signature', sig).send(body).expect(200)
    const o = (await request(app).get('/api/orders/track').query({ id: placed.id, mobile: customer.mobile })).body.order
    assert.equal(o.status, 'placed')
    assert.equal(o.paymentStatus, 'paid')
  })
})
