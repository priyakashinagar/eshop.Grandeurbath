import { useState } from 'react'
import { Input, Button, Tag } from 'antd'
import { BadgePercent, X } from 'lucide-react'
import { coupons } from '../../data/shop'
import { applyCoupon } from '../../api'
import { useShop } from '../../store/shopContext'
import { inr } from '../../utils/pricing'

export function CouponBox({ subtotal }) {
  const { coupon, setCoupon } = useShop()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const apply = async (value = code) => {
    setLoading(true)
    setError('')
    const res = await applyCoupon(value, subtotal)
    setLoading(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setCoupon(value.trim().toUpperCase())
    setCode('')
  }

  if (coupon) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-dashed border-new bg-[#F0FAEF] px-3 py-2.5">
        <span className="flex items-center gap-2 text-sm font-bold text-new"><BadgePercent size={17} /> {coupon} applied</span>
        <button type="button" onClick={() => setCoupon('')} className="flex cursor-pointer items-center gap-1 text-xs font-bold text-sale" aria-label="Remove coupon">
          <X size={14} /> Remove
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onPressEnter={() => apply()} placeholder="Enter coupon code" prefix={<BadgePercent size={16} className="text-body" />} status={error ? 'error' : undefined} aria-label="Coupon code" />
        <Button onClick={() => apply()} loading={loading} disabled={!code.trim()}>Apply</Button>
      </div>
      {error && <p className="mt-1.5 text-xs font-semibold text-sale">{error}</p>}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {coupons.map((c) => (
          <Tag key={c.code} onClick={() => apply(c.code)} title={c.text} className="!m-0 cursor-pointer !border-dashed !border-primary !bg-primary-50 !font-bold !text-primary-dark">
            {c.code}
          </Tag>
        ))}
      </div>
    </div>
  )
}

// Price breakup shared by cart and checkout
export default function OrderSummary({ s, children }) {
  const row = (label, value, cls = '') => (
    <div className={`flex items-center justify-between py-1.5 text-sm ${cls}`}>
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-body">Price details ({s.count} {s.count === 1 ? 'item' : 'items'})</p>
      {row('Total MRP', inr(s.mrpTotal), 'text-heading')}
      {s.mrpDiscount > 0 && row('Discount on MRP', `− ${inr(s.mrpDiscount)}`, 'text-new')}
      {s.couponOff > 0 && row('Coupon discount', `− ${inr(s.couponOff)}`, 'text-new')}
      {s.coupon && !s.coupon.ok && <p className="pb-1 text-xs font-semibold text-accent">{s.coupon.message}</p>}
      {row('Delivery charges', s.shipping ? inr(s.shipping) : <span className="text-new">FREE</span>, 'text-heading')}
      {s.freeShippingGap > 0 && <p className="pb-1 text-xs text-accent">Add {inr(s.freeShippingGap)} more for free delivery</p>}
      <div className="my-2 border-t border-dashed border-line" />
      <div className="flex items-center justify-between py-1 text-base font-extrabold text-heading">
        <span>Total payable</span>
        <span>{inr(s.total)}</span>
      </div>
      <p className="text-xs">Includes GST of {inr(s.gst)} (taxable value {inr(s.taxable)})</p>
      {s.savings > 0 && (
        <p className="mt-3 rounded-lg bg-[#F0FAEF] px-3 py-2 text-sm font-bold text-new">You save {inr(s.savings)} on this order</p>
      )}
      {children}
    </div>
  )
}
