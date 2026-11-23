import { Link, useNavigate } from 'react-router-dom'
import { Button, Empty, Popconfirm } from 'antd'
import { Minus, Plus, Trash2, Heart, ShieldCheck } from 'lucide-react'
import StoreHeading from '../components/shop/StoreHeading'
import ProductImage from '../components/shop/ProductImage'
import ProductRail from '../components/shop/ProductRail'
import OrderSummary, { CouponBox } from '../components/shop/OrderSummary'
import { StockLabel } from '../components/ProductCard'
import { products } from '../data/shop'
import { useShop } from '../store/shopContext'
import { inr, summarize } from '../utils/pricing'

export function QtyStepper({ value, max, onChange, size = 'md' }) {
  const h = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  return (
    <div className="inline-flex items-center rounded-lg ring-1 ring-line">
      <button type="button" aria-label="Decrease quantity" disabled={value <= 1} onClick={() => onChange(value - 1)} className={`grid ${h} cursor-pointer place-items-center text-heading disabled:cursor-not-allowed disabled:text-muted`}>
        <Minus size={15} />
      </button>
      <span className="w-9 text-center text-sm font-bold text-heading" aria-live="polite">{value}</span>
      <button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(value + 1)} className={`grid ${h} cursor-pointer place-items-center text-heading disabled:cursor-not-allowed disabled:text-muted`}>
        <Plus size={15} />
      </button>
    </div>
  )
}

export default function Cart() {
  const navigate = useNavigate()
  const { cartRows, setCartQty, removeFromCart, clearCart, toggleWishlist, inWishlist, coupon } = useShop()
  const s = summarize(cartRows, coupon)
  const suggestions = products.filter((p) => !cartRows.some((r) => r.product.id === p.id) && p.stock > 0).sort((a, b) => b.sold - a.sold).slice(0, 10)

  const moveToWishlist = (id) => {
    if (!inWishlist(id)) toggleWishlist(id)
    removeFromCart(id)
  }

  return (
    <>
      <StoreHeading title="Shopping Cart" crumbs={[{ label: 'Cart' }]} text={cartRows.length ? `${s.count} ${s.count === 1 ? 'item' : 'items'} in your cart` : undefined} />

      <section className="bg-cool py-6 md:py-8">
        <div className="container-x">
          {cartRows.length === 0 ? (
            <div className="rounded-xl border border-line bg-white py-16">
              <Empty description={<span className="text-base font-semibold text-heading">Your cart is empty</span>}>
                <Link to="/products"><Button type="primary" size="large">Start shopping</Button></Link>
              </Empty>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <div className="rounded-xl border border-line bg-white">
                <div className="flex items-center justify-between border-b border-line px-5 py-3">
                  <p className="font-bold text-heading">Cart items</p>
                  <Popconfirm title="Remove all items from cart?" okText="Remove all" onConfirm={clearCart}>
                    <button type="button" className="cursor-pointer text-xs font-bold text-sale">Clear cart</button>
                  </Popconfirm>
                </div>
                <ul className="m-0 list-none divide-y divide-line p-0">
                  {cartRows.map(({ product: p, qty }) => (
                    <li key={p.id} className="flex gap-4 p-4 md:p-5">
                      <Link to={`/product/${p.id}`} className="shrink-0">
                        <ProductImage p={p} width={240} className="h-24 w-24 rounded-lg ring-1 ring-line md:h-28 md:w-28" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-body">{p.brand}</p>
                        <Link to={`/product/${p.id}`} className="line-clamp-2 font-semibold text-heading hover:text-primary-dark">{p.name}</Link>
                        <p className="mt-0.5 text-xs">SKU {p.code} · {p.color}</p>
                        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                          <span className="font-bold text-heading">{inr(p.price)}</span>
                          {p.off > 0 && <><s className="text-sm text-muted">{inr(p.mrp)}</s><span className="text-xs font-bold text-new">{p.off}% off</span></>}
                        </div>
                        <StockLabel stock={p.stock} />
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <QtyStepper value={qty} max={p.stock} onChange={(v) => setCartQty(p.id, v)} size="sm" />
                          <button type="button" onClick={() => moveToWishlist(p.id)} className="flex cursor-pointer items-center gap-1 text-xs font-bold text-heading hover:text-primary-dark">
                            <Heart size={14} /> Move to wishlist
                          </button>
                          <button type="button" onClick={() => removeFromCart(p.id)} className="flex cursor-pointer items-center gap-1 text-xs font-bold text-sale">
                            <Trash2 size={14} /> Remove
                          </button>
                        </div>
                      </div>
                      <p className="hidden shrink-0 text-right font-extrabold text-heading sm:block">{inr(p.price * qty)}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4 lg:sticky lg:top-[140px] lg:self-start">
                <div className="rounded-xl border border-line bg-white p-5">
                  <p className="mb-3 font-bold text-heading">Apply coupon</p>
                  <CouponBox subtotal={s.subtotal} />
                </div>
                <OrderSummary s={s}>
                  <Button type="primary" size="large" block className="!mt-4" onClick={() => navigate('/checkout')}>
                    Proceed to checkout
                  </Button>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-xs"><ShieldCheck size={14} className="text-new" /> Safe and secure payments</p>
                </OrderSummary>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="container-x pt-10">
        <h2 className="mb-4 text-[22px] font-bold md:text-[26px]">{cartRows.length ? 'You may also like' : 'Popular right now'}</h2>
        <ProductRail list={suggestions} />
      </section>
    </>
  )
}
