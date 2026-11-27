import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'

process.env.NODE_ENV = 'test'
const ADMIN = { email: 'admin@test.local', password: 'admin12345' }


// Orders need a logged-in customer
let buyer
const makeBuyer = async (app, request) => {
  const res = await request(app).post('/api/auth/signup').send({ name: 'Test Buyer Account', mobile: '9700000001', email: 'buyer.account@test.local', password: 'buyerpass1' })
  return { Authorization: `Bearer ${res.body.token}` }
}

let mongo
let app
let mongoose

before(async () => {
  mongo = await MongoMemoryServer.create()
  const { connectDb } = await import('../src/db.js')
  const { seed } = await import('../src/seed/seed.js')
  const { createApp } = await import('../src/app.js')
  mongoose = (await import('mongoose')).default
  await connectDb(mongo.getUri())
  await seed({ admin: ADMIN, log: () => {} })
  app = createApp()
  buyer = await makeBuyer(app, request)
})

after(async () => {
  await mongoose.disconnect()
  await mongo.stop()
})

const login = async (id, password) => (await request(app).post('/api/auth/login').send({ id, password })).body.token
const customer = { name: 'Test Buyer', mobile: '9876543210', email: 'buyer@test.local' }
const address = { line1: '12 Test Street, Sector 5', city: 'Ghaziabad', state: 'Uttar Pradesh', pincode: '201005' }

describe('products and admin visibility', () => {
  test('lists all seeded products by default', async () => {
    const res = await request(app).get('/api/products').expect(200)
    assert.equal(res.body.total, 36)
    const p = res.body.products[0]
    for (const key of ['id', 'code', 'name', 'price', 'mrp', 'off', 'stock', 'group', 'cat']) assert.ok(key in p, `missing ${key}`)
  })

  test('admin routes need an admin token', async () => {
    await request(app).get('/api/admin/products').expect(401)
    await request(app).post('/api/auth/signup').send({ name: 'Normal User', mobile: '9811111111', email: 'normal@test.local', password: 'secret12' }).expect(201)
    const userToken = await login('normal@test.local', 'secret12')
    await request(app).get('/api/admin/products').set('Authorization', `Bearer ${userToken}`).expect(403)
  })

  test('admin limit and hide control what the website shows', async () => {
    const token = await login(ADMIN.email, ADMIN.password)
    const auth = { Authorization: `Bearer ${token}` }

    await request(app).put('/api/admin/settings').set(auth).send({ maxWebsiteProducts: 5 }).expect(200)
    let res = await request(app).get('/api/products')
    assert.equal(res.body.total, 5)
    const sixth = (await request(app).get('/api/admin/products').set(auth)).body.products[5]
    await request(app).get(`/api/products/${sixth.id}`).expect(404) // outside the limit

    const first = res.body.products[0]
    const all = (await request(app).get('/api/admin/products').set(auth)).body.products
    const firstAdmin = all.find((p) => p.id === first.id)
    await request(app).patch('/api/admin/products-visibility').set(auth).send({ ids: [firstAdmin._id], showOnWebsite: false }).expect(200)
    res = await request(app).get('/api/products')
    assert.equal(res.body.total, 5)
    assert.ok(!res.body.products.some((p) => p.id === first.id), 'hidden product is not listed')
    await request(app).get(`/api/products/${first.id}`).expect(404)

    // restore for the next tests
    await request(app).patch('/api/admin/products-visibility').set(auth).send({ ids: [firstAdmin._id], showOnWebsite: true }).expect(200)
    await request(app).put('/api/admin/settings').set(auth).send({ maxWebsiteProducts: 0 }).expect(200)
    assert.equal((await request(app).get('/api/products')).body.total, 36)
  })
})

describe('auth', () => {
  test('signup, duplicate signup and wrong password', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'Priya', mobile: '9822222222', email: 'priya@test.local', password: 'secret12' }).expect(201)
    assert.ok(res.body.token)
    assert.equal(res.body.user.role, 'customer')
    await request(app).post('/api/auth/signup').send({ name: 'Priya', mobile: '9822222222', email: 'x@test.local', password: 'secret12' }).expect(409)
    await request(app).post('/api/auth/login').send({ id: 'priya@test.local', password: 'wrong-pass' }).expect(401)
    const token = await login('9822222222', 'secret12')
    const me = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`).expect(200)
    assert.equal(me.body.user.name, 'Priya')
  })

  test('validation errors come back as 400 with a message', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'A', mobile: '123', email: 'bad', password: '1' }).expect(400)
    assert.ok(res.body.message)
  })
})

describe('orders', () => {
  let product

  before(async () => {
    product = (await request(app).get('/api/products')).body.products.find((p) => p.stock >= 10 && p.price < 5000)
  })

  test('COD order uses server prices and reduces stock', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set(buyer)
      .send({ items: [{ id: product.id, qty: 2, price: 1 }], customer, address, payment: 'cod', coupon: 'WELCOME10' })
      .expect(201)
    const o = res.body.order
    assert.equal(o.status, 'placed')
    assert.equal(o.items[0].price, product.price, 'client price is ignored')
    const subtotal = product.price * 2
    const couponOff = Math.round(Math.min(subtotal * 0.1, 1000))
    assert.equal(o.summary.couponOff, couponOff)
    const after = (await request(app).get(`/api/products/${product.id}`)).body.product
    assert.equal(after.stock, product.stock - 2)

    const tracked = await request(app).get('/api/orders/track').query({ id: o.id, mobile: customer.mobile }).expect(200)
    assert.equal(tracked.body.order.id, o.id)
    await request(app).get('/api/orders/track').query({ id: o.id, mobile: '9000000001' }).expect(404)

    await request(app).post(`/api/orders/${o.id}/cancel`).query({ mobile: customer.mobile }).expect(200)
    const restored = (await request(app).get(`/api/products/${product.id}`)).body.product
    assert.equal(restored.stock, product.stock, 'stock returns on cancel')
  })

  test('guests must log in before ordering', async () => {
    const res = await request(app).post('/api/orders').send({ items: [{ id: product.id, qty: 1 }], customer, address, payment: 'cod' }).expect(401)
    assert.equal(res.body.message, 'Please log in to place your order')
  })

  test('cannot order more than stock', async () => {
    const res = await request(app).post('/api/orders').set(buyer).send({ items: [{ id: product.id, qty: 999 }], customer, address, payment: 'cod' }).expect(409)
    assert.match(res.body.message, /left|out of stock/)
  })

  test('online payment in test mode: pending until verified', async () => {
    const res = await request(app).post('/api/orders').set(buyer).send({ items: [{ id: product.id, qty: 1 }], customer, address, payment: 'razorpay' }).expect(201)
    assert.equal(res.body.order.status, 'payment_pending')
    assert.equal(res.body.razorpay.testMode, true)
    const before = (await request(app).get(`/api/products/${product.id}`)).body.product.stock
    await request(app).post(`/api/orders/${res.body.order.id}/verify-payment`).send({ razorpay_order_id: 'x', razorpay_payment_id: 'y', razorpay_signature: 'z' }).expect(400)
    const ok = await request(app).post(`/api/orders/${res.body.order.id}/verify-payment`).send({ test: true }).expect(200)
    // A failed attempt marks the order failed, but a later valid verification still completes it
    assert.equal(ok.body.order.paymentStatus, 'paid')
    assert.equal(ok.body.order.status, 'placed')
    assert.equal((await request(app).get(`/api/products/${product.id}`)).body.product.stock, before - 1)
  })

  test('logged-in customers see their orders and admin can move status', async () => {
    const userToken = await login('priya@test.local', 'secret12')
    const placed = await request(app)
      .post('/api/orders')
      .set(buyer)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ items: [{ id: product.id, qty: 1 }], customer: { ...customer, mobile: '9822222222' }, address, payment: 'cod' })
      .expect(201)
    const mine = await request(app).get('/api/orders/mine').set('Authorization', `Bearer ${userToken}`).expect(200)
    assert.ok(mine.body.orders.some((o) => o.id === placed.body.order.id))

    const adminToken = await login(ADMIN.email, ADMIN.password)
    const upd = await request(app).patch(`/api/admin/orders/${placed.body.order.id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'shipped' }).expect(200)
    assert.equal(upd.body.order.status, 'shipped')
    await request(app).post(`/api/orders/${placed.body.order.id}/cancel`).set('Authorization', `Bearer ${userToken}`).expect(400)
  })
})

describe('coupons, delivery, enquiries', () => {
  test('coupon rules', async () => {
    assert.equal((await request(app).post('/api/coupons/apply').send({ code: 'FLAT500', subtotal: 1000 })).body.ok, false)
    const ok = await request(app).post('/api/coupons/apply').send({ code: 'flat500', subtotal: 6000 })
    assert.equal(ok.body.discount, 500)
  })

  test('pincode check', async () => {
    assert.equal((await request(app).get('/api/delivery/201005')).body.days, 2)
    assert.equal((await request(app).get('/api/delivery/12')).body.ok, false)
  })

  test('enquiry and newsletter', async () => {
    await request(app).post('/api/enquiries').send({ kind: 'quote', name: 'Hotel Buyer', phone: '9876500000', items: [{ code: 'ISH1118', qty: 20 }] }).expect(201)
    await request(app).post('/api/newsletter').send({ email: 'news@test.local' }).expect(200)
    await request(app).post('/api/newsletter').send({ email: 'news@test.local' }).expect(200)
  })
})
