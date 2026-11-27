// Editable website content (company details, FAQs, policies, testimonials, home and about page sections).
// Each key is one document in the `contents` collection and has a schema so the admin cannot save broken data.
// Text may use placeholders the website fills from store settings:
//   {brand} {legal} {phone} {email} {freeAbove} {deliveryCharge} {codLimit} {returnDays}
import mongoose from 'mongoose'
import { z } from 'zod'

export const Content = mongoose.model(
  'Content',
  new mongoose.Schema({ key: { type: String, required: true, unique: true }, value: mongoose.Schema.Types.Mixed }, { timestamps: true }),
)

const text = (max = 300) => z.string().trim().max(max)
const image = text(500) // Unsplash id or full URL from /api/admin/uploads
const icon = text(60) // icon name from icons8 3D Fluency set

export const CONTENT_SCHEMAS = {
  company: z.object({
    brand: text(80).min(2),
    legal: text(120).min(2),
    phone: text(30).min(8),
    phoneRaw: text(20).regex(/^\+?[0-9]{8,15}$/, 'Phone for calling, digits only, e.g. +918826377525'),
    whatsapp: text(20).regex(/^[0-9]{8,15}$/, 'WhatsApp number with country code, digits only, e.g. 918826377525'),
    email: z.email(),
    address: text(300).min(5),
    gstin: text(15),
    mapQuery: text(200).optional(),
    socials: z.object({ instagram: text(300), facebook: text(300), linkedin: text(300), youtube: text(300) }).partial().optional(),
  }),
  testimonials: z.array(z.object({ name: text(80).min(2), role: text(120), image: image.optional(), text: text(1000).min(10), rating: z.number().int().min(1).max(5).default(5) })).max(50),
  faqs: z.array(z.object({ category: z.enum(['orders', 'payment', 'delivery', 'returns', 'projects']), q: text(300).min(5), a: text(2000).min(5), home: z.boolean().default(false) })).max(200),
  policies: z
    .array(z.object({ slug: text(40).regex(/^[a-z0-9-]+$/), title: text(120).min(3), sections: z.array(z.object({ heading: text(150).min(2), body: text(4000).min(5) })).min(1).max(30) }))
    .max(20),
  combos: z.array(z.object({ title: text(80).min(3), text: text(200), items: z.array(text(40)).min(2).max(6), extra: z.number().min(0).max(50) })).max(20),
  popularSearches: z.array(text(40).min(2)).max(20),
  stats: z.array(z.object({ value: text(20).min(1), label: text(60).min(2) })).max(8),
  whyUs: z.array(z.object({ icon, color: text(20), title: text(80).min(2), text: text(300) })).max(12),
  gallery: z.array(z.object({ img: image.min(3), title: text(80).min(2), place: text(80) })).max(40),
  segments: z.array(z.object({ icon, title: text(80).min(2), img: image.min(3), text: text(300) })).max(12),
  spaces: z.array(z.object({ title: text(80).min(2), icon, img: image.min(3), text: text(300) })).max(12),
  projectSteps: z.array(z.object({ icon, color: text(20), title: text(80).min(2), text: text(300) })).max(10),
}

export const CONTENT_KEYS = Object.keys(CONTENT_SCHEMAS)

export async function getAllContent() {
  const docs = await Content.find({ key: { $in: CONTENT_KEYS } }).lean()
  return Object.fromEntries(docs.map((d) => [d.key, d.value]))
}

export async function getContent(key) {
  return (await Content.findOne({ key }).lean())?.value ?? null
}
