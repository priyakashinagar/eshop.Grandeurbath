import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Select, Empty, Button, Checkbox, Slider, Collapse, Drawer, Tag, Switch, InputNumber } from 'antd'
import { SlidersHorizontal, Star, X } from 'lucide-react'
import StoreHeading from '../components/shop/StoreHeading'
import ProductCard from '../components/ProductCard'
import ProductImage from '../components/shop/ProductImage'
import { matchProducts } from '../utils/search'
import { products, groups, findGroup, findSub } from '../data/shop'
import { inr } from '../utils/pricing'

const sorts = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Popularity' },
  { value: 'newest', label: 'Newest First' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'discount', label: 'Biggest Discount' },
]

const sorters = {
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  popular: (a, b) => b.sold - a.sold,
  newest: (a, b) => b.added.localeCompare(a.added),
  rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
  discount: (a, b) => b.off - a.off,
}

const swatches = {
  Chrome: '#D9DDE1', 'Polished Chrome': '#E4E7EA', 'Matte Black': '#222', Black: '#111', White: '#fff', 'Off White': '#F1EBDD',
  Blue: '#1F6FD1', Grey: '#9AA0A6', Green: '#3DAA5C', Walnut: '#7A5230', 'Satin Steel': '#B9BEC3',
}

const PAGE = 12
const NEW_SINCE = '2026-09-01'

const facetKeys = [
  ['brand', 'Brand'],
  ['type', 'Product Type'],
  ['size', 'Size'],
  ['capacity', 'Capacity'],
  ['material', 'Material'],
  ['color', 'Color'],
]

const uniq = (list, key) => {
  const counts = {}
  list.forEach((p) => p[key] && (counts[p[key]] = (counts[p[key]] || 0) + 1))
  return Object.entries(counts)
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
    .map(([value, count]) => ({ value, count }))
}

function Filters({ base, f, set, priceBounds }) {
  const facets = facetKeys.map(([key, label]) => ({ key, label, options: uniq(base, key) })).filter((x) => x.options.length > 1)

  const items = [
    {
      key: 'price',
      label: 'Price Range',
      children: (
        <div className="px-1">
          <Slider range min={priceBounds[0]} max={priceBounds[1]} step={10} value={f.price} onChange={(v) => set({ price: v })} tooltip={{ formatter: (v) => inr(v) }} />
          <div className="flex items-center gap-2">
            <InputNumber size="small" className="!w-full" min={priceBounds[0]} max={f.price[1]} value={f.price[0]} onChange={(v) => set({ price: [v ?? priceBounds[0], f.price[1]] })} prefix="₹" aria-label="Minimum price" />
            <span className="text-body">to</span>
            <InputNumber size="small" className="!w-full" min={f.price[0]} max={priceBounds[1]} value={f.price[1]} onChange={(v) => set({ price: [f.price[0], v ?? priceBounds[1]] })} prefix="₹" aria-label="Maximum price" />
          </div>
        </div>
      ),
    },
    ...facets.map(({ key, label, options }) => ({
      key,
      label,
      children: (
        <Checkbox.Group value={f[key]} onChange={(v) => set({ [key]: v })} className="!flex !flex-col !gap-2">
          {options.map((o) => (
            <Checkbox key={o.value} value={o.value}>
              <span className="inline-flex items-center gap-2 text-[13px] text-heading">
                {key === 'color' && <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/15" style={{ background: swatches[o.value] || '#ccc' }} />}
                {o.value} <span className="text-body">({o.count})</span>
              </span>
            </Checkbox>
          ))}
        </Checkbox.Group>
      ),
    })),
    {
      key: 'stock',
      label: 'Availability',
      children: (
        <label className="flex cursor-pointer items-center justify-between text-[13px] text-heading">
          Show in-stock items only
          <Switch size="small" checked={f.inStock} onChange={(v) => set({ inStock: v })} />
        </label>
      ),
    },
    {
      key: 'rating',
      label: 'Customer Rating',
      children: (
        <div className="flex flex-col gap-1">
          {[4.5, 4, 3].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => set({ rating: f.rating === r ? 0 : r })}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[13px] font-semibold ${f.rating === r ? 'bg-primary-50 text-primary-dark' : 'text-heading hover:bg-light'}`}
            >
              {r} <Star size={13} fill="currentColor" className="text-[#F5A623]" /> and above
            </button>
          ))}
        </div>
      ),
    },
  ]

  return <Collapse ghost size="small" expandIconPlacement="end" defaultActiveKey={items.map((i) => i.key)} items={items.map((i) => ({ ...i, label: <span className="text-sm font-bold text-heading">{i.label}</span> }))} />
}

// Filters can arrive in the URL, e.g. from the home page finder: ?brand=Delta&type=Rain+Shower&min=1000&max=5000&stock=1&rating=4
const filtersFromParams = (params, bounds) => {
  const num = (k, d) => {
    const v = Number(params.get(k))
    return params.has(k) && Number.isFinite(v) ? v : d
  }
  const lo = Math.max(bounds[0], Math.min(num('min', bounds[0]), bounds[1]))
  const hi = Math.min(bounds[1], Math.max(num('max', bounds[1]), lo))
  return {
    price: [lo, hi],
    ...Object.fromEntries(facetKeys.map(([k]) => [k, params.getAll(k)])),
    inStock: params.get('stock') === '1',
    rating: num('rating', 0),
  }
}

function Listing({ base, params, sort, setSort }) {
  const priceBounds = useMemo(() => {
    if (!base.length) return [0, 0]
    const prices = base.map((p) => p.price)
    return [Math.floor(Math.min(...prices) / 100) * 100, Math.ceil(Math.max(...prices) / 100) * 100]
  }, [base])

  const empty = { price: priceBounds, brand: [], type: [], size: [], capacity: [], material: [], color: [], inStock: false, rating: 0 }
  const [f, setF] = useState(() => filtersFromParams(params, priceBounds))
  const [shown, setShown] = useState(PAGE)
  const [drawer, setDrawer] = useState(false)
  const set = (patch) => {
    setF((x) => ({ ...x, ...patch }))
    setShown(PAGE)
  }

  const list = useMemo(() => {
    const out = base.filter(
      (p) =>
        p.price >= f.price[0] &&
        p.price <= f.price[1] &&
        facetKeys.every(([k]) => !f[k].length || f[k].includes(p[k])) &&
        (!f.inStock || p.stock > 0) &&
        p.rating >= f.rating,
    )
    return sorters[sort] ? [...out].sort(sorters[sort]) : out
  }, [base, f, sort])

  const chips = [
    ...facetKeys.flatMap(([k]) => f[k].map((v) => ({ k, v, label: v }))),
    ...(f.inStock ? [{ k: 'inStock', label: 'In stock' }] : []),
    ...(f.rating ? [{ k: 'rating', label: `${f.rating}★ and above` }] : []),
    ...(f.price[0] !== priceBounds[0] || f.price[1] !== priceBounds[1] ? [{ k: 'price', label: `${inr(f.price[0])} to ${inr(f.price[1])}` }] : []),
  ]
  const clearChip = (c) => {
    if (c.k === 'inStock') set({ inStock: false })
    else if (c.k === 'rating') set({ rating: 0 })
    else if (c.k === 'price') set({ price: priceBounds })
    else set({ [c.k]: f[c.k].filter((x) => x !== c.v) })
  }

  const filters = <Filters base={base} f={f} set={set} priceBounds={priceBounds} />

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[270px_1fr]">
      <aside className="hidden self-start rounded-xl border border-line bg-white lg:sticky lg:top-[136px] lg:block">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="font-bold text-heading">Filters</p>
          {chips.length > 0 && <button type="button" onClick={() => { setF(empty); setShown(PAGE) }} className="cursor-pointer text-xs font-bold text-primary-dark">Clear all</button>}
        </div>
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-1">{filters}</div>
      </aside>

      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm">
            Showing <b className="text-heading">{Math.min(shown, list.length)}</b> of <b className="text-heading">{list.length}</b> products
          </p>
          <div className="flex items-center gap-2">
            <Button className="lg:!hidden" icon={<SlidersHorizontal size={16} />} onClick={() => setDrawer(true)}>
              Filters{chips.length ? ` (${chips.length})` : ''}
            </Button>
            <span className="hidden text-sm font-semibold text-heading sm:inline">Sort by</span>
            <Select value={sort} onChange={setSort} options={sorts} className="w-44 sm:w-52" aria-label="Sort products" />
          </div>
        </div>

        {chips.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {chips.map((c) => (
              <Tag key={`${c.k}-${c.label}`} closable={{ closeIcon: <X size={12} /> }} onClose={(e) => { e.preventDefault(); clearChip(c) }} className="!m-0 !rounded-full !border-primary-200 !bg-primary-50 !px-3 !py-1 !text-[13px] !font-semibold !text-primary-dark">
                {c.label}
              </Tag>
            ))}
          </div>
        )}

        {list.length ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
              {list.slice(0, shown).map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
            {shown < list.length && (
              <div className="mt-6 text-center">
                <Button size="large" onClick={() => setShown((n) => n + PAGE)}>Load more products</Button>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-line bg-white py-14">
            <Empty description="No products match these filters">
              <Button type="primary" onClick={() => { setF(empty); setShown(PAGE) }}>Clear filters</Button>
            </Empty>
          </div>
        )}
      </div>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Filters" placement="left" size={320} styles={{ body: { padding: 8 } }}
        footer={
          <div className="flex gap-2">
            <Button block onClick={() => { setF(empty); setShown(PAGE) }}>Clear all</Button>
            <Button block type="primary" onClick={() => setDrawer(false)}>Show {list.length} products</Button>
          </div>
        }
      >
        {filters}
      </Drawer>
    </div>
  )
}

export default function Products({ preset }) {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const cat = params.get('cat') || ''
  const sub = findSub(cat)
  const group = sub?.group || params.get('group') || ''
  const g = findGroup(group)
  // Remount the listing (and re-read URL filters) whenever anything except the sort order changes
  const filterKey = (() => {
    const k = new URLSearchParams(params)
    k.delete('sort')
    return k.toString()
  })()
  const sort = params.get('sort') || (preset === 'offers' ? 'discount' : preset === 'new' ? 'newest' : 'relevance')

  const setSort = (v) => {
    const next = new URLSearchParams(params)
    next.set('sort', v)
    setParams(next, { replace: true })
  }

  const base = useMemo(() => {
    let list = q ? matchProducts(q) : products
    if (sub) list = list.filter((p) => p.cat === sub.key)
    else if (g) list = list.filter((p) => p.group === g.key)
    if (preset === 'offers') list = list.filter((p) => p.off >= 20)
    if (preset === 'new') list = list.filter((p) => p.added >= NEW_SINCE || p.tag === 'New')
    return list
  }, [q, sub, g, preset])

  const title = preset === 'offers' ? 'Offers and Deals' : preset === 'new' ? 'New Arrivals' : q ? `Results for “${q}”` : sub?.label || g?.label || 'All Products'
  const text =
    preset === 'offers'
      ? 'Products with 20% or more off, plus limited-time deals'
      : preset === 'new'
        ? 'The latest products added to our store'
        : g?.text || 'Bath tubs, water tanks, bathroom products and plumbing'
  const crumbs = [
    ...(g && !preset ? [{ label: g.label, to: sub ? `/products?group=${g.key}` : undefined }] : [{ label: preset ? title : 'Products' }]),
    ...(sub && !preset ? [{ label: sub.label }] : []),
  ]
  const subLinks = g ? g.subs : groups.map((x) => ({ key: x.key, label: x.label, img: x.img, art: x.art, isGroup: true }))

  return (
    <>
      <StoreHeading title={title} text={text} crumbs={crumbs} />

      {!preset && !q && (
        <div className="border-b border-line bg-white">
          <div className="container-x no-scrollbar flex gap-2.5 overflow-x-auto py-2.5">
            {g && (
              <Link to="/products" className="flex shrink-0 items-center rounded-full border border-line px-4 py-2 text-[13px] font-bold text-heading hover:border-primary">
                All categories
              </Link>
            )}
            {subLinks.map((s) => {
              const active = s.key === cat || (s.isGroup && s.key === group)
              return (
                <Link
                  key={s.key}
                  to={s.isGroup ? `/products?group=${s.key}` : `/products?cat=${s.key}`}
                  className={`flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-4 text-[13px] font-bold transition-colors ${active ? 'border-primary bg-primary-50 text-primary-dark' : 'border-line text-heading hover:border-primary'}`}
                >
                  <ProductImage p={s} width={100} className="h-8 w-8 rounded-full" />
                  {s.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <section className="bg-cool py-4 md:py-5">
        <div className="container-x">
          <Listing key={`${preset}|${filterKey}`} base={base} params={params} sort={sort} setSort={setSort} />
        </div>
      </section>
    </>
  )
}
