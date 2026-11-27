import { Router } from 'express'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { User, Product } from '../models/index.js'
import { HttpError, requireAuth, rules, signToken, validate } from '../middleware.js'
import { config } from '../config.js'
import { emit } from '../events.js'
import { setCtxUser } from '../context.js'
import { diff } from '../logging.js'

const r = Router()

// Slows down password guessing
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { ok: false, message: 'Too many attempts. Please try again in a few minutes.' } })

r.post(
  '/auth/signup',
  authLimiter,
  validate(z.object({ name: rules.name, mobile: rules.mobile, email: rules.email, password: z.string().min(6, 'Use at least 6 characters').max(100) })),
  async (req, res) => {
    const { name, mobile, email, password } = req.body
    if (await User.exists({ $or: [{ mobile }, { email }] })) {
      throw new HttpError(409, 'An account with this mobile or email already exists. Please log in.')
    }
    const user = await User.create({ name, mobile, email, passwordHash: await bcrypt.hash(password, 10) })
    setCtxUser(user)
    emit('auth.signup', { entity: { type: 'user', id: user._id.toString() }, data: { mobile, email } })
    res.status(201).json({ ok: true, token: signToken(user), user: user.toPublic() })
  },
)

r.post('/auth/login', authLimiter, validate(z.object({ id: z.string().trim().min(3).max(120), password: z.string().min(1).max(100) })), async (req, res) => {
  const key = req.body.id.toLowerCase()
  const user = await User.findOne({ $or: [{ mobile: key }, { email: key }] }).select('+passwordHash')
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    emit('auth.login_failed', { entity: user ? { type: 'user', id: user._id.toString() } : undefined, data: { login: req.body.id, reason: user ? 'wrong_password' : 'unknown_account' } })
    throw new HttpError(401, 'Mobile/email or password is incorrect')
  }
  if (user.active === false) {
    emit('auth.login_failed', { entity: { type: 'user', id: user._id.toString() }, data: { login: req.body.id, reason: 'blocked' } })
    throw new HttpError(403, 'This account has been blocked. Please contact support.')
  }
  setCtxUser(user)
  emit('auth.login', { entity: { type: 'user', id: user._id.toString() }, data: { role: user.role } })
  res.json({ ok: true, token: signToken(user), user: user.toPublic() })
})

r.get('/me', requireAuth, (req, res) => res.json({ ok: true, user: req.user.toPublic() }))

r.put('/me', requireAuth, validate(z.object({ name: rules.name.optional(), email: rules.email.optional() })), async (req, res) => {
  const before = { name: req.user.name, email: req.user.email }
  Object.assign(req.user, req.body)
  emit('account.updated', { entity: { type: 'user', id: req.user._id.toString() }, changes: diff(before, req.body) })
  await req.user.save()
  res.json({ ok: true, user: req.user.toPublic() })
})

/* Passwords */

r.post(
  '/me/password',
  requireAuth,
  validate(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(6, 'Use at least 6 characters').max(100) })),
  async (req, res) => {
    const user = await User.findById(req.user._id).select('+passwordHash')
    if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) throw new HttpError(400, 'Current password is incorrect')
    user.passwordHash = await bcrypt.hash(req.body.newPassword, 10)
    await user.save()
    emit('auth.password_changed', { entity: { type: 'user', id: user._id.toString() } })
    res.json({ ok: true, message: 'Password changed' })
  },
)

const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex')

// Always answers the same way so nobody can find out which emails have accounts
r.post('/auth/forgot-password', authLimiter, validate(z.object({ email: rules.email })), async (req, res) => {
  const user = await User.findOne({ email: req.body.email, active: { $ne: false } })
  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    user.resetTokenHash = hashToken(token)
    user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000)
    await user.save()
    emit('auth.password_reset_requested', {
      entity: { type: 'user', id: user._id.toString() },
      payload: { user, link: `${config.websiteUrl}/reset-password?token=${token}` },
    })
    // Lets tests and local development continue without an email server
    if (config.env === 'test') res.set('X-Test-Reset-Token', token)
  }
  res.json({ ok: true, message: 'If an account exists for this email, a reset link has been sent.' })
})

r.post('/auth/reset-password', authLimiter, validate(z.object({ token: z.string().length(64), password: z.string().min(6, 'Use at least 6 characters').max(100) })), async (req, res) => {
  const user = await User.findOne({ resetTokenHash: hashToken(req.body.token), resetTokenExpires: { $gt: new Date() } }).select('+resetTokenHash +resetTokenExpires')
  if (!user) throw new HttpError(400, 'This reset link is invalid or has expired. Please request a new one.')
  user.passwordHash = await bcrypt.hash(req.body.password, 10)
  user.resetTokenHash = undefined
  user.resetTokenExpires = undefined
  await user.save()
  setCtxUser(user)
  emit('auth.password_reset', { entity: { type: 'user', id: user._id.toString() } })
  res.json({ ok: true, token: signToken(user), user: user.toPublic(), message: 'Password updated' })
})

/* Saved addresses */

const addressFields = z.object({
  label: z.string().trim().max(30).optional(),
  name: rules.name.optional(),
  mobile: rules.mobile.optional(),
  line1: z.string().trim().min(5, 'Please enter your address').max(300),
  landmark: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: rules.pincode,
  gstin: z.string().trim().toUpperCase().max(15).optional(),
  isDefault: z.boolean().optional(),
})

const setDefault = (user, id) => user.addresses.forEach((a) => (a.isDefault = a._id.equals(id)))

r.get('/me/addresses', requireAuth, (req, res) => res.json({ ok: true, addresses: req.user.addresses }))

r.post('/me/addresses', requireAuth, validate(addressFields), async (req, res) => {
  if (req.user.addresses.length >= 10) throw new HttpError(400, 'You can save up to 10 addresses')
  req.user.addresses.push(req.body)
  const added = req.user.addresses.at(-1)
  if (req.body.isDefault || req.user.addresses.length === 1) setDefault(req.user, added._id)
  await req.user.save()
  emit('account.address_added', { entity: { type: 'user', id: req.user._id.toString() }, data: { addressId: added._id.toString(), city: added.city, pincode: added.pincode } })
  res.status(201).json({ ok: true, addresses: req.user.addresses })
})

r.patch('/me/addresses/:addressId', requireAuth, validate(addressFields.partial()), async (req, res) => {
  const a = req.user.addresses.id(req.params.addressId)
  if (!a) throw new HttpError(404, 'Address not found')
  Object.assign(a, req.body)
  if (req.body.isDefault) setDefault(req.user, a._id)
  await req.user.save()
  emit('account.address_updated', { entity: { type: 'user', id: req.user._id.toString() }, data: { addressId: a._id.toString(), fields: Object.keys(req.body) } })
  res.json({ ok: true, addresses: req.user.addresses })
})

r.delete('/me/addresses/:addressId', requireAuth, async (req, res) => {
  const a = req.user.addresses.id(req.params.addressId)
  if (!a) throw new HttpError(404, 'Address not found')
  const wasDefault = a.isDefault
  a.deleteOne()
  if (wasDefault && req.user.addresses.length) req.user.addresses[0].isDefault = true
  await req.user.save()
  emit('account.address_removed', { entity: { type: 'user', id: req.user._id.toString() }, data: { addressId: req.params.addressId } })
  res.json({ ok: true, addresses: req.user.addresses })
})

/* Cart and wishlist saved on the account, so they follow the customer across devices */

const knownSlugs = async (slugs) => new Set((await Product.find({ slug: { $in: slugs }, active: true }).select('slug')).map((p) => p.slug))

r.get('/me/cart', requireAuth, (req, res) => {
  res.json({ ok: true, cart: req.user.cart.map((i) => ({ id: i.product, qty: i.qty })), wishlist: req.user.wishlist })
})

r.put(
  '/me/cart',
  requireAuth,
  validate(
    z.object({
      cart: z.array(z.object({ id: z.string().min(1).max(200), qty: z.number().int().min(1).max(999) })).max(100),
      wishlist: z.array(z.string().min(1).max(200)).max(200).optional(),
    }),
  ),
  async (req, res) => {
    const { cart, wishlist } = req.body
    const ok = await knownSlugs([...cart.map((i) => i.id), ...(wishlist || [])])
    req.user.cart = cart.filter((i) => ok.has(i.id)).map((i) => ({ product: i.id, qty: i.qty }))
    if (wishlist) req.user.wishlist = [...new Set(wishlist.filter((id) => ok.has(id)))]
    await req.user.save()
    emit('account.cart_saved', { entity: { type: 'user', id: req.user._id.toString() }, data: { items: req.user.cart.length, wishlist: req.user.wishlist.length } })
    res.json({ ok: true })
  },
)

export default r
