import { useId, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { photo } from '../../data/content'

// Shade a hex colour (amount -1..1) for the SVG product art
const shade = (hex, amount) => {
  const n = parseInt(hex.slice(1), 16)
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (amount < 0 ? c : 255 - c) * amount)))
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`
}

// Simple illustrations for products that have no photo yet (tanks, pipes, fittings)
export function ProductArt({ kind = 'tank', color = '#1C1C1C', className = '' }) {
  // Unique per instance: a shared id would point at a copy inside a hidden menu and render blank
  const id = `g-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const light = shade(color, 0.35)
  const dark = shade(color, -0.35)
  const grad = (
    <linearGradient id={id} x1="0" x2="1">
      <stop offset="0" stopColor={dark} />
      <stop offset=".45" stopColor={light} />
      <stop offset="1" stopColor={dark} />
    </linearGradient>
  )

  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-hidden>
      <defs>{grad}</defs>
      <ellipse cx="100" cy="182" rx="70" ry="8" fill="rgba(0,0,0,.08)" />
      {kind === 'tank' && (
        <g>
          <path d="M42 52 Q42 40 100 40 Q158 40 158 52 L162 168 Q162 178 100 178 Q38 178 38 168 Z" fill={`url(#${id})`} />
          {[78, 106, 134].map((y) => (
            <path key={y} d={`M40 ${y} Q100 ${y + 10} 160 ${y}`} stroke={dark} strokeWidth="3" fill="none" opacity=".55" />
          ))}
          <ellipse cx="100" cy="46" rx="58" ry="10" fill={light} />
          <ellipse cx="100" cy="36" rx="20" ry="6" fill={dark} />
          <rect x="80" y="26" width="40" height="11" rx="3" fill={color} />
        </g>
      )}
      {kind === 'loft' && (
        <g>
          <rect x="26" y="70" width="148" height="100" rx="12" fill={`url(#${id})`} />
          <rect x="26" y="62" width="148" height="18" rx="8" fill={light} />
          <rect x="84" y="54" width="32" height="10" rx="3" fill={dark} />
          {[56, 100, 144].map((x) => (
            <rect key={x} x={x - 3} y="88" width="6" height="74" rx="3" fill={dark} opacity=".25" />
          ))}
        </g>
      )}
      {kind === 'pipe' && (
        <g transform="rotate(-28 100 100)">
          <rect x="10" y="82" width="180" height="36" rx="6" fill={`url(#${id})`} />
          <ellipse cx="190" cy="100" rx="8" ry="18" fill={dark} />
          <ellipse cx="190" cy="100" rx="4" ry="11" fill="rgba(0,0,0,.35)" />
          <rect x="22" y="128" width="160" height="30" rx="6" fill={`url(#${id})`} opacity=".9" />
          <ellipse cx="182" cy="143" rx="7" ry="15" fill={dark} />
        </g>
      )}
      {kind === 'elbow' && (
        <g>
          <path d="M50 40 h40 v70 a20 20 0 0 0 20 20 h50 v40 h-50 a60 60 0 0 1 -60 -60 Z" fill={`url(#${id})`} />
          <rect x="44" y="30" width="52" height="18" rx="4" fill={light} stroke={dark} strokeOpacity=".3" />
          <rect x="152" y="124" width="18" height="52" rx="4" fill={light} stroke={dark} strokeOpacity=".3" />
        </g>
      )}
    </svg>
  )
}

// Product photo with a graceful fallback
export default function ProductImage({ p, index = 0, width = 600, className = '', imgClassName = '' }) {
  const [failed, setFailed] = useState(false)
  const id = p.images?.[index] ?? p.images?.[0] ?? p.img

  if (!id && p.art) {
    return (
      <div className={`grid place-items-center bg-soft ${className}`}>
        <ProductArt kind={p.art.kind} color={p.art.color} className="h-[78%] w-[78%]" />
      </div>
    )
  }

  if (!id || failed) {
    return (
      <div className={`grid place-items-center bg-light text-muted ${className}`}>
        <ImageOff size={32} />
      </div>
    )
  }

  return (
    <div className={`overflow-hidden bg-soft ${className}`}>
      <img src={photo(id, width)} alt={p.name || p.label || ''} loading="lazy" onError={() => setFailed(true)} className={`h-full w-full object-cover ${imgClassName}`} />
    </div>
  )
}
