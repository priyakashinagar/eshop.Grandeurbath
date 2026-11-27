import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'

process.env.NODE_ENV = 'test'
const ADMIN = { email: 'admin@test.local', password: 'admin12345' }

let mongo, app, mongoose, admin, settle

before(async () => {
  mongo = await MongoMemoryServer.create()
  const { connectDb } = await import('../src/db.js')
  const { seed } = await import('../src/seed/seed.js')
  const { createApp } = await import('../src/app.js')
  const { flushEvents } = await import('../src/events.js')
  const { flushLogs } = await import('../src/logging.js')
  mongoose = (await import('mongoose')).default
  settle = async () => {
    await flushEvents()
    await flushLogs()
  }
  await connectDb(mongo.getUri())
  await seed({ admin: ADMIN, log: () => {} })
  app = createApp()
  admin = { Authorization: `Bearer ${(await request(app).post('/api/auth/login').send({ id: ADMIN.email, password: ADMIN.password })).body.token}` }
})

after(async () => {
  await settle()
  await mongoose.disconnect()
  await mongo.stop()
})

describe('storefront and site content', () => {
  test('one call returns everything the website needs', async () => {
    const d = (await request(app).get('/api/storefront').expect(200)).body
    assert.equal(d.categories.length, 4)
    assert.equal(d.brands.length, 5)
    assert.equal(d.banners.hero.length, 3)
    assert.equal(d.coupons.length, 3)
    assert.equal(d.settings.freeAbove, 999)
    for (const key of ['company', 'testimonials', 'faqs', 'policies', 'combos', 'popularSearches', 'stats', 'whyUs', 'gallery', 'segments', 'spaces', 'projectSteps']) {
      assert.ok(d.content[key], `missing content ${key}`)
    }
    assert.equal(d.content.company.brand, 'Grandeur Bath')
    assert.equal(d.content.policies.length, 5)
  })

  test('single content block and unknown keys', async () => {
    assert.equal((await request(app).get('/api/content/faqs').expect(200)).body.value.length, 18)
    await request(app).get('/api/content/secrets').expect(404)
  })

  test('admin edits are validated, saved and logged', async () => {
    await request(app).put('/api/admin/content/stats').send({ value: [] }).expect(401)
    const bad = await request(app).put('/api/admin/content/company').set(admin).send({ value: { brand: 'X' } }).expect(400)
    assert.ok(bad.body.message)

    const company = (await request(app).get('/api/content/company')).body.value
    await request(app).put('/api/admin/content/company').set(admin).send({ value: { ...company, phone: '+91 99999 11111', phoneRaw: '+919999911111' } }).expect(200)
    const sf = (await request(app).get('/api/storefront')).body
    assert.equal(sf.content.company.phone, '+91 99999 11111')

    await request(app).put('/api/admin/content/popularSearches').set(admin).send({ value: ['Geyser', 'Shower'] }).expect(200)
    assert.deepEqual((await request(app).get('/api/content/popularSearches')).body.value, ['Geyser', 'Shower'])

    await settle()
    const ev = (await request(app).get('/api/admin/logs/events').set(admin).query({ name: 'content.updated', entityId: 'company' })).body.items[0]
    assert.equal(ev.changes.after.value.phone, '+91 99999 11111')
  })

  test('seed does not overwrite admin content', async () => {
    const { seed } = await import('../src/seed/seed.js')
    await seed({ admin: ADMIN, log: () => {} })
    assert.deepEqual((await request(app).get('/api/content/popularSearches')).body.value, ['Geyser', 'Shower'])
  })

  test('invoice uses the edited company details', async () => {
    const p = (await request(app).get('/api/products')).body.products.find((x) => x.stock > 3 && x.price < 3000)
    const o = (await request(app).post('/api/orders').send({ items: [{ id: p.id, qty: 1 }], customer: { name: 'Inv Test', mobile: '9855500000', email: 'inv@test.local' }, address: { line1: '9 Invoice Road, Phase 1', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301' }, payment: 'cod' }).expect(201)).body.order
    const html = (await request(app).get(`/api/orders/${o.id}/invoice`).query({ mobile: '9855500000' }).expect(200)).text
    assert.match(html, /\+91 99999 11111/)
  })
})

describe('reviews and delivery', () => {
  test('review breakdown counts real reviews', async () => {
    const p = (await request(app).get('/api/products')).body.products[0]
    const before = (await request(app).get(`/api/products/${p.id}/reviews`)).body
    assert.equal(before.count, 2)
    await request(app).post(`/api/products/${p.id}/reviews`).send({ name: 'Breakdown Tester', rating: 3, text: 'Average product, works fine' }).expect(201)
    const afterRes = (await request(app).get(`/api/products/${p.id}/reviews`)).body
    assert.equal(afterRes.count, 3)
    assert.equal(afterRes.breakdown[3], before.breakdown[3] + 1)
  })

  test('pincode shows the state when the city is not known', async () => {
    assert.equal((await request(app).get('/api/delivery/262701')).body.city, 'Uttar Pradesh')
    assert.equal((await request(app).get('/api/delivery/403001')).body.city, 'Goa')
    assert.equal((await request(app).get('/api/delivery/201005')).body.city, 'Ghaziabad / Noida')
  })
})
