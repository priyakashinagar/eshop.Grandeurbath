import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    cart: [{ _id: false, product: { type: String, required: true }, qty: { type: Number, min: 1, default: 1 } }], // product = slug
    wishlist: { type: [String], default: [] }, // product slugs
  },
  { timestamps: true },
)

userSchema.methods.toPublic = function toPublic() {
  return { id: this._id.toString(), name: this.name, mobile: this.mobile, email: this.email, role: this.role }
}

export const User = mongoose.model('User', userSchema)
