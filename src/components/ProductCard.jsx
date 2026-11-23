import { Link, useNavigate } from 'react-router-dom'
import { Button, Tooltip } from 'antd'
import { Heart, GitCompareArrows, Star, ShoppingCart } from 'lucide-react'
import ProductImage from './shop/ProductImage'
import { useShop } from '../store/shopContext'
import { inr } from '../utils/pricing'

export function StockLabel({ stock, className = '' }) {
  if (stock <= 0) return <span className={`text-xs font-bold text-sale ${className}`}>Out of stock</span>
  if (stock <= 5) return <span className={`text-xs font-bold text-accent ${className}`}>Only {stock} left</span>
  return <span className={`text-xs font-bold text-new ${className}`}>In stock</span>
}

export function RatingPill({ rating, reviews }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="inline-flex items-center gap-0.5 rounded bg-new px-1.5 py-0.5 font-bold text-white">
        {rating.toFixed(1)} <Star size={10} fill="currentColor" />
      </span>
      <span className="text-body">({reviews})</span>
    </span>
  )
}

export default function ProductCard({ p }) {
  const navigate = useNavigate()
  const { addToCart, toggleWishlist, inWishlist, toggleCompare, inCompare } = useShop()
  const liked = inWishlist(p.id)
  const comparing = inCompare(p.id)
  const soldOut = p.stock <= 0
  const url = `/product/${p.id}`

  const buyNow = () => {
    addToCart(p.id, 1, { silent: true })
    navigate('/checkout')
  }

  return (
    <article className="pcard group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white">
      <div className="relative">
        <Link to={url} aria-label={p.name}>
          <ProductImage p={p} width={500} className="aspect-square" imgClassName="transition-transform duration-700 group-hover:scale-105" />
        </Link>

        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {p.off > 0 && <span className="rounded bg-sale px-2 py-0.5 text-[11px] font-bold text-white">-{p.off}%</span>}
          {p.tag === 'New' && <span className="rounded bg-new px-2 py-0.5 text-[11px] font-bold text-white">New</span>}
          {p.tag && p.tag !== 'New' && <span className="rounded bg-secondary px-2 py-0.5 text-[11px] font-bold text-white">{p.tag}</span>}
        </div>

        <div className="pcard-actions absolute right-2.5 top-2.5 flex flex-col gap-1.5">
          <Tooltip title={liked ? 'Remove from wishlist' : 'Add to wishlist'} placement="left">
            <button
              type="button"
              onClick={() => toggleWishlist(p.id)}
              aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={liked}
              className={`grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-white shadow-md transition-colors hover:bg-primary hover:text-white ${liked ? 'text-sale' : 'text-secondary'}`}
            >
              <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
            </button>
          </Tooltip>
          <Tooltip title={comparing ? 'Remove from compare' : 'Compare'} placement="left">
            <button
              type="button"
              onClick={() => toggleCompare(p.id)}
              aria-label="Compare product"
              aria-pressed={comparing}
              className={`grid h-9 w-9 cursor-pointer place-items-center rounded-full shadow-md transition-colors hover:bg-primary hover:text-white ${comparing ? 'bg-primary text-white' : 'bg-white text-secondary'}`}
            >
              <GitCompareArrows size={16} />
            </button>
          </Tooltip>
        </div>

        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-secondary/80 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-white">Sold out</span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-body">{p.brand}</p>
        <Link to={url} className="mt-1 line-clamp-2 min-h-[40px] text-sm font-semibold leading-snug text-heading transition-colors hover:text-primary-dark">
          {p.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
          <RatingPill rating={p.rating} reviews={p.reviews} />
          <StockLabel stock={p.stock} />
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="text-lg font-bold text-heading">{inr(p.price)}</span>
          {p.off > 0 && (
            <>
              <s className="text-sm text-muted">{inr(p.mrp)}</s>
              <span className="text-xs font-bold text-new">{p.off}% off</span>
            </>
          )}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
          <Button type="primary" ghost disabled={soldOut} onClick={() => addToCart(p.id)} icon={<ShoppingCart size={14} />} className="!gap-1 !px-1 !text-[13px]">
            Add
          </Button>
          <Button type="primary" disabled={soldOut} onClick={buyNow} className="!px-1 !text-[13px]">
            Buy now
          </Button>
        </div>
      </div>
    </article>
  )
}
