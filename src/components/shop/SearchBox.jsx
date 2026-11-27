import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import ProductImage from './ProductImage'
import { subcategories } from '../../data/shop'
import { inr } from '../../utils/pricing'
import { matchProducts } from '../../utils/search'
import { popularSearches } from '../../data/content'

// Admin can change these in the panel (content: popularSearches)
const popular = popularSearches.length ? popularSearches : ['Rain shower', 'Bathtub', '1000 L tank', 'CPVC pipe', 'Angle valve', 'Kitchen sink']

// Header search with live suggestions
export default function SearchBox({ className = '', autoFocus = false, onDone }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const [q, setQ] = useState(pathname === '/products' ? params.get('q') || '' : '')
  const [open, setOpen] = useState(false)
  const box = useRef(null)

  useEffect(() => {
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const term = q.trim()
  const hits = useMemo(() => matchProducts(term).slice(0, 6), [term])
  const cats = useMemo(() => (term ? subcategories.filter((s) => s.label.toLowerCase().includes(term.toLowerCase())).slice(0, 3) : []), [term])

  const go = (value = term) => {
    setOpen(false)
    onDone?.()
    navigate(value ? `/products?q=${encodeURIComponent(value)}` : '/products')
  }

  return (
    <div ref={box} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          go()
        }}
        className="flex h-11 items-center rounded-[10px] bg-light ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-primary"
      >
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          placeholder="Enter your keywords"
          aria-label="Search products"
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-[15px] text-heading outline-none placeholder:text-body [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button type="button" aria-label="Clear search" onClick={() => setQ('')} className="cursor-pointer px-1 text-body hover:text-heading">
            <X size={16} />
          </button>
        )}
        <button type="submit" aria-label="Search" className="grid h-full w-12 cursor-pointer place-items-center text-heading hover:text-primary-dark">
          <Search size={19} />
        </button>
      </form>

      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-[60] overflow-hidden rounded-xl bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,.25)] ring-1 ring-line">
          {!term && (
            <div className="p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-body">Popular searches</p>
              <div className="flex flex-wrap gap-2">
                {popular.map((t) => (
                  <button key={t} type="button" onClick={() => go(t)} className="cursor-pointer rounded-full bg-light px-3 py-1.5 text-[13px] font-semibold text-heading hover:bg-primary-50 hover:text-primary-dark">
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          {term && !hits.length && !cats.length && <p className="p-4 text-sm">No products found for “{term}”.</p>}
          {cats.length > 0 && (
            <div className="border-b border-line px-4 py-2.5">
              {cats.map((c) => (
                <Link key={c.key} to={`/products?cat=${c.key}`} onClick={() => { setOpen(false); onDone?.() }} className="block py-1 text-sm font-semibold text-heading hover:text-primary-dark">
                  {c.label} <span className="font-normal text-body">in {c.groupLabel}</span>
                </Link>
              ))}
            </div>
          )}
          {hits.length > 0 && (
            <ul className="m-0 max-h-[360px] list-none overflow-y-auto p-1.5">
              {hits.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/product/${p.id}`}
                    onClick={() => { setOpen(false); onDone?.() }}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-light"
                  >
                    <ProductImage p={p} width={120} className="h-12 w-12 shrink-0 rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-heading">{p.name}</span>
                      <span className="text-xs text-body">{p.brand}</span>
                    </span>
                    <span className="text-sm font-bold text-heading">{inr(p.price)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {term && hits.length > 0 && (
            <button type="button" onClick={() => go()} className="block w-full cursor-pointer border-t border-line py-2.5 text-sm font-bold text-primary-dark hover:bg-primary-50">
              See all results for “{term}”
            </button>
          )}
        </div>
      )}
    </div>
  )
}
