import mongoose from 'mongoose'

export const ORDER_STATUSES = ['payment_pending', 'placed', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']

const itemSchema = new mongoose.Schema(
  {
    id: String, // product slug
    code: String,
    name: String,
    brand: String,
    price: Number,
    mrp: Number,
    qty: Number,
    images: [String],
    art: { kind: String, color: String },
  },
  { _id: false },
)

const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, required: true, unique: true, index: true }, // shown to customers, e.g. GB12345678
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    customer: {
      name: { type: String, required: true },
      mobile: { type: String, required: true, index: true },
      email: { type: String, required: true },
      guest: { type: Boolean, default: true },
    },
    address: {
      line1: { type: String, required: true },
      landmark: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      gstin: String,
    },
    items: { type: [itemSchema], required: true },
    summary: {
      count: Number,
      mrpTotal: Number,
      subtotal: Number,
      mrpDiscount: Number,
      couponOff: Number,
      shipping: Number,
      gst: Number,
      taxable: Number,
      total: Number,
      savings: Number,
    },
    coupon: String,
    payment: { type: String, enum: ['cod', 'razorpay'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    razorpay: { orderId: String, paymentId: String, testMode: Boolean },
    status: { type: String, enum: ORDER_STATUSES, default: 'placed', index: true },
    statusHistory: [{ _id: false, status: String, at: { type: Date, default: Date.now }, note: String }],
    stockDeducted: { type: Boolean, default: false },
    cancelledAt: Date,
    deliveredAt: Date,
    // Customer return request after delivery
    returnRequest: {
      status: { type: String, enum: ['requested', 'approved', 'rejected', 'received', 'refunded'] },
      reason: String,
      details: String,
      requestedAt: Date,
      resolvedAt: Date,
      adminNote: String,
    },
    refund: {
      status: { type: String, enum: ['pending', 'processed', 'failed'] },
      amount: Number,
      razorpayRefundId: String,
      at: Date,
    },
    invoiceNo: String,
  },
  { timestamps: true },
)

// Shape the website expects for orders
orderSchema.methods.toPublic = function toPublic() {
  const o = this
  return {
    id: o.orderNo,
    customer: o.customer,
    address: o.address,
    items: o.items,
    summary: o.summary,
    coupon: o.coupon || '',
    payment: o.payment,
    paymentStatus: o.paymentStatus,
    status: o.status,
    statusHistory: o.statusHistory,
    createdAt: o.createdAt,
    cancelledAt: o.cancelledAt,
    deliveredAt: o.deliveredAt,
    returnRequest: o.returnRequest?.status ? o.returnRequest : undefined,
    refund: o.refund?.status ? o.refund : undefined,
    invoiceNo: o.invoiceNo,
  }
}

export const Order = mongoose.model('Order', orderSchema)
