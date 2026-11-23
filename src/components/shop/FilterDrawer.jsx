import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Drawer, Checkbox, Radio, Collapse, InputNumber, Button } from 'antd'
import { Star } from 'lucide-react'
import { products, groups } from '../../data/shop'

const budgets = [
  { label: 'Under ₹1,000', max: 999 },
  { label: '₹1,000 – ₹5,000', min: 1000, max: 5000 },
  { label: '₹5,000 – ₹20,000', min: 5000, max: 20000 },
  { label: '₹20,000 – ₹50,000', min: 20000, max: 50000 },
  { label: 'Above ₹50,000', min: 50000 },
]

const facets = [
  ['brand', 'Brand'],
  ['type', 'Product Type'],
  ['material', 'Material'],
]

const empty = { category: '', brand: [], type: [], material: [], min: null, max: null, rating: 0, inStock: false }

// Each rule ignores its own section, so the counts show what picking that option would give
const rules = {
  category: (p, v) => !v || (v.startsWith('g:') ? p.group === v.slice(2) : p.cat === v.slice(2)),
  brand: (p, v) => !v.length || v.includes(p.brand),
  type: (p, v) => !v.length || v.includes(p.type),
  material: (p, v) => !v.length || v.includes(p.material),
  price: (p, _v, f) => (f.min == null || p.price >= f.min) && (f.max == null || p.price <= f.max),
  rating: (p, v) => p.rating >= v,
  inStock: (p, v) => !v || p.stock > 0,
}

const matching = (f, skip) => products.filter((p) => Object.entries(rules).every(([k, rule]) => k === skip || rule(p, f[k], f)))

const counts = (list, key) =>
  Object.entries(list.reduce((m, p) => ({ ...m, [p[key]]: (m[p[key]] || 0) + 1 }), {})).sort((a, b) => a[0].localeCompare(b[0]))

// Reads filters already in the URL so the panel opens with the current selection on the listing page
const fromSearch = (search) => {
  const qs = new URLSearchParams(search)
  const num = (k) => (qs.has(k) && Number.isFinite(Number(qs.get(k))) ? Number(qs.get(k)) : null)
  return {
    category: qs.get('cat') ? `s:${qs.get('cat')}` : qs.get('group') ? `g:${qs.get('group')}` : '',
    brand: qs.getAll('brand'),
    type: qs.getAll('type'),
    material: qs.getAll('material'),
    min: num('min'),
    max: num('max'),
    rating: num('rating') || 0,
    inStock: qs.get('stock') === '1',
  }
}

function Panel({ initial, onApply }) {
  const [f, setF] = useState(initial)
  const set = (patch) => setF((x) => ({ ...x, ...patch }))
  const toggle = (k, v) => set({ [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] })

  const results = useMemo(() => matching(f), [f])
  const catPool = useMemo(() => matching(f, 'category'), [f])
  const facetPools = useMemo(() => Object.fromEntries(facets.map(([k]) => [k, counts(matching(f, k), k)])), [f])
  const pricePool = useMemo(() => matching(f, 'price'), [f])
  const touched = JSON.stringify(f) !== JSON.stringify(empty)

  const apply = () => {
    const qs = new URLSearchParams()
    if (f.category) qs.set(f.category.startsWith('g:') ? 'group' : 'cat', f.category.slice(2))
    facets.forEach(([k]) => f[k].forEach((v) => qs.append(k, v)))
    if (f.min != null) qs.set('min', f.min)
    if (f.max != null) qs.set('max', f.max)
    if (f.rating) qs.set('rating', f.rating)
    if (f.inStock) qs.set('stock', '1')
    onApply(`/products${qs.toString() ? `?${qs}` : ''}`)
  }

  const label = (text) => <span className="text-[13px] font-extrabold uppercase tracking-wider text-heading">{text}</span>
  const row = 'flex w-full items-center justify-between gap-2 text-[14px] text-heading'

  const sections = [
    {
      key: 'category',
      label: label('Categories'),
      children: (
        <Radio.Group value={f.category} onChange={(e) => set({ category: e.target.value, type: [] })} className="!flex !flex-col !gap-1">
          <Radio value="">All categories <span className="text-body">({catPool.length})</span></Radio>
          {groups.map((g) => (
            <div key={g.key}>
              <Radio value={`g:${g.key}`} className="!font-bold">
                {g.label} <span className="font-normal text-body">({catPool.filter((p) => p.group === g.key).length})</span>
              </Radio>
              {(f.category === `g:${g.key}` || g.subs.some((s) => f.category === `s:${s.key}`)) && (
                <div className="ml-6 mt-1 flex flex-col gap-1">
                  {g.subs.map((s) => (
                    <Radio key={s.key} value={`s:${s.key}`}>
                      {s.label} <span className="text-body">({catPool.filter((p) => p.cat === s.key).length})</span>
                    </Radio>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Radio.Group>
      ),
    },
    {
      key: 'price',
      label: label('Price'),
      children: (
        <div>
          <div className="flex items-center gap-2">
            <InputNumber className="!w-full" min={0} placeholder="Min" prefix="₹" value={f.min} onChange={(v) => set({ min: v })} aria-label="Minimum price" />
            <span className="text-body">to</span>
            <InputNumber className="!w-full" min={0} placeholder="Max" prefix="₹" value={f.max} onChange={(v) => set({ max: v })} aria-label="Maximum price" />
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            {budgets.map((b) => {
              const active = f.min === (b.min ?? null) && f.max === (b.max ?? null)
              const n = pricePool.filter((p) => p.price >= (b.min ?? 0) && p.price <= (b.max ?? Infinity)).length
              return (
                <Checkbox key={b.label} checked={active} disabled={!n && !active} onChange={() => set(active ? { min: null, max: null } : { min: b.min ?? null, max: b.max ?? null })}>
                  <span className={row}>{b.label} <span className="text-body">({n})</span></span>
                </Checkbox>
              )
            })}
          </div>
        </div>
      ),
    },
    ...facets.map(([k, title]) => ({
      key: k,
      label: label(title),
      children: (
        <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1">
          {facetPools[k].map(([v, n]) => (
            <Checkbox key={v} checked={f[k].includes(v)} onChange={() => toggle(k, v)}>
              <span className={row}>{v} <span className="text-body">({n})</span></span>
            </Checkbox>
          ))}
        </div>
      ),
    })),
    {
      key: 'rating',
      label: label('Customer Ratings'),
      children: (
        <div className="flex flex-col gap-1.5">
          {[4.5, 4, 3].map((r) => (
            <Checkbox key={r} checked={f.rating === r} onChange={() => set({ rating: f.rating === r ? 0 : r })}>
              <span className="inline-flex items-center gap-1 text-[14px] text-heading">
                {r} <Star size={13} fill="currentColor" className="text-[#F5A623]" /> & above
              </span>
            </Checkbox>
          ))}
        </div>
      ),
    },
    {
      key: 'stock',
      label: label('Availability'),
      children: (
        <Checkbox checked={f.inStock} onChange={(e) => set({ inStock: e.target.checked })}>
          <span className="text-[14px] text-heading">Exclude out of stock</span>
        </Checkbox>
      ),
    },
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <Collapse ghost expandIconPlacement="end" defaultActiveKey={['category', 'price', 'brand']} items={sections} className="[&_.ant-collapse-item]:border-b [&_.ant-collapse-item]:border-line" />
      </div>
      <div className="flex items-center gap-3 border-t border-line bg-white p-4">
        <Button size="large" onClick={() => setF(empty)} disabled={!touched}>Clear all</Button>
        <Button size="large" type="primary" block onClick={apply} disabled={!results.length}>
          {results.length ? `Show ${results.length} products` : 'No products match'}
        </Button>
      </div>
    </div>
  )
}

// Flipkart-style filter panel that slides in from the left
export default function FilterDrawer({ open, onClose }) {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const initial = pathname === '/products' ? fromSearch(search) : empty

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="left"
      size={360}
      title={<span className="text-lg font-bold">Filters</span>}
      destroyOnHidden
      styles={{ body: { padding: 0 } }}
    >
      <Panel
        initial={initial}
        onApply={(url) => {
          onClose()
          navigate(url)
        }}
      />
    </Drawer>
  )
}
