import { products } from '../data/shop'

// Every word must appear somewhere in the product's searchable text
export const matchProducts = (term) => {
  const words = term.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  return products.filter((p) => {
    const hay = `${p.name} ${p.code} ${p.brand} ${p.type} ${p.cat} ${p.material} ${p.color}`.toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}

export const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
