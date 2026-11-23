import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true }, // SKU
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    group: { type: String, required: true, index: true }, // bathtub, water-tank, bathroom, plumbing
    cat: { type: String, required: true, index: true }, // sub-category key
    type: { type: String, required: true },
    mrp: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    sold: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0, min: 0 },
    material: String,
    color: String,
    size: String,
    capacity: String,
    dims: { type: [Number], default: [0, 0, 0] }, // L x W x H in mm
    weight: Number, // kg
    warranty: String,
    images: { type: [String], default: [] }, // image ids or full URLs
    video: String,
    art: { kind: String, color: String }, // drawn placeholder when there is no photo
    tag: String, // Bestseller, New, Premium
    description: String,
    highlights: { type: [String], default: [] },

    // Controlled from the admin panel
    active: { type: Boolean, default: true },
    showOnWebsite: { type: Boolean, default: true, index: true },
    websiteOrder: { type: Number, default: 0 }, // lower shows first
  },
  { timestamps: true },
)

// Shape the website expects (see src/data/shop.js in the frontend)
productSchema.methods.toPublic = function toPublic() {
  const p = this
  const off = p.mrp > 0 ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0
  return {
    id: p.slug,
    code: p.code,
    name: p.name,
    brand: p.brand,
    group: p.group,
    cat: p.cat,
    type: p.type,
    mrp: p.mrp,
    price: p.price,
    off,
    stock: p.stock,
    sold: p.sold,
    rating: p.rating,
    reviews: p.reviewsCount,
    added: p.createdAt?.toISOString().slice(0, 10),
    material: p.material,
    color: p.color,
    finish: p.color,
    size: p.size,
    capacity: p.capacity || undefined,
    dims: p.dims,
    weight: p.weight,
    warranty: p.warranty,
    images: p.images,
    img: p.images[0],
    video: p.video || undefined,
    art: p.art?.kind ? { kind: p.art.kind, color: p.art.color } : undefined,
    tag: p.tag || undefined,
    desc: p.description,
    highlights: p.highlights,
  }
}

export const Product = mongoose.model('Product', productSchema)
