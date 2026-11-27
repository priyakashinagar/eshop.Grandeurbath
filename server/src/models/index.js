import mongoose from 'mongoose'

export { Product } from './Product.js'
export { User } from './User.js'
export { Order, ORDER_STATUSES } from './Order.js'

const { Schema, model } = mongoose

export const Coupon = model(
  'Coupon',
  new Schema(
    {
      code: { type: String, required: true, unique: true, uppercase: true, trim: true },
      text: String, // shown to customers
      type: { type: String, enum: ['percent', 'flat'], required: true },
      value: { type: Number, required: true, min: 0 },
      max: Number, // cap for percent coupons
      min: { type: Number, default: 0 }, // minimum order value
      active: { type: Boolean, default: true },
      expiresAt: Date,
    },
    { timestamps: true },
  ),
)

// Single document with key "website": admin controls for the storefront
export const Setting = model(
  'Setting',
  new Schema(
    {
      key: { type: String, required: true, unique: true },
      maxWebsiteProducts: { type: Number, default: 0, min: 0 }, // 0 = no limit
      freeAbove: { type: Number, min: 0 }, // free delivery from this order value
      deliveryCharge: { type: Number, min: 0 },
      codLimit: { type: Number, min: 0 },
      gstRate: { type: Number, min: 0, max: 28 },
      returnDays: { type: Number, min: 0, max: 60 },
      unserviceablePincodes: { type: [String], default: [] }, // full pincodes or 2-3 digit prefixes
      announcement: String, // text for the website's top bar
    },
    { timestamps: true },
  ),
)

// Top-level groups (Bath Tub, Water Tank...) and their sub-categories
export const Category = model(
  'Category',
  new Schema(
    {
      key: { type: String, required: true, unique: true, lowercase: true, trim: true },
      label: { type: String, required: true, trim: true },
      parent: { type: String, default: null, index: true }, // group key for sub-categories, null for groups
      text: String,
      image: String,
      art: { kind: String, color: String },
      order: { type: Number, default: 0 },
      active: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
)

export const Brand = model(
  'Brand',
  new Schema(
    {
      name: { type: String, required: true, unique: true, trim: true },
      note: String,
      color: String,
      logo: String,
      order: { type: Number, default: 0 },
      active: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
)

// Home page banners: placement "hero" (main slider) or "side"
export const Banner = model(
  'Banner',
  new Schema(
    {
      placement: { type: String, enum: ['hero', 'side'], default: 'hero', index: true },
      tag: String,
      title: { type: String, required: true },
      text: String,
      image: String,
      art: { kind: String, color: String },
      ctaLabel: String,
      ctaLink: String,
      bg: String,
      order: { type: Number, default: 0 },
      active: { type: Boolean, default: true },
      startsAt: Date,
      endsAt: Date,
    },
    { timestamps: true },
  ),
)

export const Review = model(
  'Review',
  new Schema(
    {
      product: { type: String, required: true, index: true }, // product slug
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, required: true, trim: true },
      rating: { type: Number, required: true, min: 1, max: 5 },
      text: { type: String, required: true, trim: true },
      verified: { type: Boolean, default: false },
      approved: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
)

export const Question = model(
  'Question',
  new Schema(
    {
      product: { type: String, required: true, index: true },
      q: { type: String, required: true, trim: true },
      a: { type: String, default: null },
      askedBy: String,
    },
    { timestamps: true },
  ),
)

// Quote requests, contact form and bulk enquiries
export const Enquiry = model(
  'Enquiry',
  new Schema(
    {
      kind: { type: String, enum: ['contact', 'quote'], default: 'contact' },
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: String,
      city: String,
      type: String, // home owner, hotel, builder...
      message: String,
      items: [{ _id: false, code: String, name: String, qty: Number }],
      status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' },
    },
    { timestamps: true },
  ),
)

export const Subscriber = model(
  'Subscriber',
  new Schema({ email: { type: String, required: true, unique: true, lowercase: true, trim: true } }, { timestamps: true }),
)
