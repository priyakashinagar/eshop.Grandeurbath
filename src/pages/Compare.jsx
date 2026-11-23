import { Link } from 'react-router-dom'
import { Button, Empty } from 'antd'
import { X } from 'lucide-react'
import StoreHeading from '../components/shop/StoreHeading'
import ProductImage from '../components/shop/ProductImage'
import { StockLabel } from '../components/ProductCard'
import { findProduct } from '../data/shop'
import { useShop } from '../store/shopContext'
import { inr } from '../utils/pricing'

const rows = [
  ['Price', (p) => <b className="text-heading">{inr(p.price)}</b>],
  ['MRP', (p) => <s className="text-muted">{inr(p.mrp)}</s>],
  ['Discount', (p) => <span className="font-bold text-new">{p.off}% off</span>],
  ['Rating', (p) => `${p.rating} ★ (${p.reviews})`],
  ['Brand', (p) => p.brand],
  ['Type', (p) => p.type],
  ['Size', (p) => p.size],
  ['Capacity', (p) => p.capacity || '—'],
  ['Material', (p) => p.material],
  ['Color', (p) => p.color],
  ['Dimensions (mm)', (p) => p.dims.join(' × ')],
  ['Weight', (p) => `${p.weight} kg`],
  ['Warranty', (p) => p.warranty],
  ['Availability', (p) => <StockLabel stock={p.stock} />],
]

export default function Compare() {
  const { compare, toggleCompare, clearCompare, addToCart } = useShop()
  const list = compare.map(findProduct).filter(Boolean)

  return (
    <>
      <StoreHeading title="Compare Products" crumbs={[{ label: 'Compare' }]} text="Compare up to 4 products side by side">
        {list.length > 0 && <Button onClick={clearCompare}>Clear all</Button>}
      </StoreHeading>
      <section className="bg-cool py-6 md:py-8">
        <div className="container-x">
          {list.length === 0 ? (
            <div className="rounded-xl border border-line bg-white py-16">
              <Empty description="No products to compare. Use the compare button on any product.">
                <Link to="/products"><Button type="primary" size="large">Browse products</Button></Link>
              </Empty>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr>
                    <th className="w-40 border-b border-line p-4 text-left text-body">Product</th>
                    {list.map((p) => (
                      <th key={p.id} className="relative border-b border-l border-line p-4 text-left align-top font-normal">
                        <button type="button" onClick={() => toggleCompare(p.id)} aria-label="Remove" className="absolute right-2 top-2 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-light hover:bg-sale hover:text-white">
                          <X size={14} />
                        </button>
                        <Link to={`/product/${p.id}`}>
                          <ProductImage p={p} width={300} className="aspect-square w-full max-w-[160px] rounded-lg ring-1 ring-line" />
                          <p className="mt-2 line-clamp-2 font-semibold text-heading hover:text-primary-dark">{p.name}</p>
                        </Link>
                        <Button type="primary" size="small" className="!mt-2" disabled={p.stock <= 0} onClick={() => addToCart(p.id)}>Add to cart</Button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([label, get], i) => (
                    <tr key={label} className={i % 2 ? '' : 'bg-soft'}>
                      <th scope="row" className="p-4 text-left font-semibold text-body">{label}</th>
                      {list.map((p) => <td key={p.id} className="border-l border-line p-4 text-heading">{get(p)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
