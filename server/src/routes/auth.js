import { Router } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { User, Product } from '../models/index.js'
import { HttpError, requireAuth, rules, signToken, validate } from '../middleware.js'

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
    res.status(201).json({ ok: true, token: signToken(user), user: user.toPublic() })
  },
)

r.post('/auth/login', authLimiter, validate(z.object({ id: z.string().trim().min(3).max(120), password: z.string().min(1).max(100) })), async (req, res) => {
  const key = req.body.id.toLowerCase()
  const user = await User.findOne({ $or: [{ mobile: key }, { email: key }] }).select('+passwordHash')
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    throw new HttpError(401, 'Mobile/email or password is incorrect')
  }
  res.json({ ok: true, token: signToken(user), user: user.toPublic() })
})

r.get('/me', requireAuth, (req, res) => res.json({ ok: true, user: req.user.toPublic() }))

r.put('/me', requireAuth, validate(z.object({ name: rules.name.optional(), email: rules.email.optional() })), async (req, res) => {
  Object.assign(req.user, req.body)
  await req.user.save()
  res.json({ ok: true, user: req.user.toPublic() })
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
    res.json({ ok: true })
  },
)

export default r
