import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Segmented, App } from 'antd'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination } from 'swiper/modules'
import { ArrowRight, Clock, Zap, Gift } from 'lucide-react'
import SectionHead from '../components/shop/SectionHead'
import ProductRail from '../components/shop/ProductRail'
import ProductImage, { ProductArt } from '../components/shop/ProductImage'
import ProductCard from '../components/ProductCard'
import WhyUs from '../sections/WhyUs'
import Testimonials from '../sections/Testimonials'
import CtaBanner from '../sections/CtaBanner'
import { photo } from '../data/content'
import { groups, subcategories, products, heroSlides, sideBanners, brands, combos, findProduct } from '../data/shop'
import { useShop } from '../store/shopContext'
import { inr } from '../utils/pricing'

const bestSellers = [...products].sort((a, b) => b.sold - a.sold).slice(0, 10)
const newArrivals = [...products].sort((a, b) => b.added.localeCompare(a.added)).slice(0, 10)
const mostPopular = [...products].sort((a, b) => b.rating * b.reviews - a.rating * a.reviews).slice(0, 10)
const bigDeals = [...products].filter((p) => p.stock > 0).sort((a, b) => b.off - a.off)

function HeroBanners() {
  return (
    <section className="container-x pt-4 md:pt-6">
      <div className="grid gap-3 md:gap-4 lg:grid-cols-[2fr_1fr]">
        <Swiper
          className="store-slider w-full min-w-0 overflow-hidden rounded-2xl"
          modules={[Autoplay, Pagination]}
          loop
          speed={700}
          autoplay={{ delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}
          pagination={{ clickable: true }}
        >
          {heroSlides.map((s, i) => (
            <SwiperSlide key={s.title}>
              <Link to={s.cta.to} className="group relative block h-[240px] sm:h-[320px] lg:h-[420px]">
                <img src={photo(s.img, 1400)} alt="" loading={i === 0 ? 'eager' : 'lazy'} className="absolute inset-0 h-full w-full object-cover transition-transform duration-[2s] group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
                <div className="relative flex h-full max-w-lg flex-col justify-center px-6 sm:px-10">
                  <span className="w-fit rounded bg-accent px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">{s.tag}</span>
                  <h1 className="mt-3 text-[24px] font-extrabold leading-[1.15] !text-white sm:text-[34px] lg:text-[42px]">{s.title}</h1>
                  <p className="mt-2 hidden text-[15px] text-white/85 sm:block">{s.text}</p>
                  <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors group-hover:bg-primary-dark">
                    {s.cta.label} <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-1">
          {sideBanners.map((b) => (
            <Link key={b.title} to={b.to} className={`group relative flex h-[150px] overflow-hidden rounded-2xl bg-gradient-to-br sm:h-[180px] lg:h-auto ${b.bg}`}>
              <div className="relative z-10 flex max-w-[62%] flex-col justify-center p-4 sm:p-6">
                <p className="text-[17px] font-extrabold leading-tight text-heading sm:text-2xl">{b.title}</p>
                <p className="mt-1 text-xs font-semibold text-heading/70 sm:text-sm">{b.text}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-primary-dark group-hover:gap-2 transition-all">
                  Shop now <ArrowRight size={15} />
                </span>
              </div>
              <div className="absolute bottom-0 right-0 top-0 w-[42%]">
                {b.art ? (
                  <ProductArt kind={b.art.kind} color={b.art.color} className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <img src={photo(b.img, 500)} alt="" className="h-full w-full rounded-l-[40px] object-cover transition-transform duration-500 group-hover:scale-105" />
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function CategoryStrip() {
  return (
    <section className="container-x pt-8">
      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-6 md:px-0 xl:grid-cols-9">
        {subcategories.slice(0, 18).map((s) => (
          <Link key={s.key} to={`/products?cat=${s.key}`} className="group flex w-[84px] shrink-0 flex-col items-center text-center md:w-auto">
            <ProductImage p={s} width={240} className="aspect-square w-full max-w-[96px] rounded-full ring-1 ring-line transition-shadow group-hover:ring-2 group-hover:ring-primary" imgClassName="transition-transform duration-500 group-hover:scale-110" />
            <span className="mt-2 text-[12px] font-semibold leading-snug text-heading group-hover:text-primary-dark md:text-[13px]">{s.label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function ShopByCategory() {
  return (
    <section className="container-x pt-12">
      <SectionHead title="Shop by Category" text="Everything for bathrooms, water storage and plumbing in one place" to="/products" />
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {groups.map((g) => (
          <div key={g.key} className="group overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-[0_18px_40px_-22px_rgba(0,0,0,.3)]">
            <Link to={`/products?group=${g.key}`} className="relative block">
              <ProductImage p={g} width={600} className="aspect-[4/3]" imgClassName="transition-transform duration-700 group-hover:scale-105" />
              <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-heading shadow">
                {products.filter((p) => p.group === g.key).length} products
              </span>
            </Link>
            <div className="p-4">
              <Link to={`/products?group=${g.key}`} className="text-base font-bold text-heading hover:text-primary-dark md:text-lg">{g.label}</Link>
              <ul className="m-0 mt-2 hidden list-none flex-wrap gap-1.5 p-0 sm:flex">
                {g.subs.slice(0, 4).map((s) => (
                  <li key={s.key}>
                    <Link to={`/products?cat=${s.key}`} className="block rounded-full bg-light px-2.5 py-1 text-xs font-semibold text-heading hover:bg-primary-50 hover:text-primary-dark">{s.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

const tabs = { best: bestSellers, new: newArrivals, popular: mostPopular }

function Trending() {
  const [tab, setTab] = useState('best')
  return (
    <section className="container-x pt-12">
      <SectionHead title="Trending Products" text="What customers are buying right now" to={tab === 'new' ? '/new-arrivals' : '/products?sort=popular'}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'best', label: 'Best Sellers' },
            { value: 'new', label: 'New Arrivals' },
            { value: 'popular', label: 'Most Popular' },
          ]}
        />
      </SectionHead>
      <ProductRail key={tab} list={tabs[tab]} />
    </section>
  )
}

const pad = (n) => String(n).padStart(2, '0')

function useCountdown() {
  const left = () => {
    const end = new Date()
    end.setHours(24, 0, 0, 0)
    return Math.max(0, end - Date.now())
  }
  const [ms, setMs] = useState(left)
  useEffect(() => {
    const t = setInterval(() => setMs(left()), 1000)
    return () => clearInterval(t)
  }, [])
  const s = Math.floor(ms / 1000)
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
}

function DealOfTheDay() {
  const deal = bigDeals[0]
  const [h, m, s] = useCountdown()
  const { addToCart } = useShop()
  return (
    <div className="flex h-full flex-col rounded-2xl bg-gradient-to-br from-[#FFF1E8] to-[#FFE0CC] p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wider text-accent"><Zap size={16} fill="currentColor" /> Deal of the day</p>
        <span className="rounded bg-sale px-2 py-0.5 text-xs font-bold text-white">-{deal.off}%</span>
      </div>
      <Link to={`/product/${deal.id}`} className="mt-3 block">
        <ProductImage p={deal} width={500} className="aspect-[4/3] rounded-xl bg-white" />
      </Link>
      <Link to={`/product/${deal.id}`} className="mt-3 line-clamp-2 font-bold text-heading hover:text-primary-dark">{deal.name}</Link>
      <p className="mt-1">
        <span className="text-xl font-extrabold text-heading">{inr(deal.price)}</span> <s className="text-sm text-muted">{inr(deal.mrp)}</s>
      </p>
      <div className="mt-3 flex items-center gap-2" aria-label="Offer ends in">
        <Clock size={16} className="text-accent" />
        {[['h', h], ['m', m], ['s', s]].map(([k, v]) => (
          <span key={k} className="rounded-lg bg-white px-2 py-1 text-center text-sm font-extrabold tabular-nums text-heading shadow-sm">
            {pad(v)}<span className="text-[10px] font-bold text-body">{k}</span>
          </span>
        ))}
        <span className="text-xs font-semibold">left</span>
      </div>
      <div className="mt-auto pt-4">
        <Button type="primary" size="large" block onClick={() => addToCart(deal.id)}>
          Grab this deal
        </Button>
      </div>
    </div>
  )
}

function SpecialOffers() {
  return (
    <section className="container-x pt-12">
      <SectionHead title="Special Offers" text="Discounted products and limited-time deals" to="/offers" />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <DealOfTheDay />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {bigDeals.slice(1, 7).map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Combos() {
  const { addToCart } = useShop()
  const { message } = App.useApp()
  return (
    <section className="container-x pt-12">
      <SectionHead title="Combo Offers" text="Buy together and save extra on every set" />
      <div className="grid gap-4 md:grid-cols-3">
        {combos.map((c) => {
          const items = c.items.map(findProduct).filter(Boolean)
          const sum = items.reduce((t, p) => t + p.price, 0)
          const comboPrice = Math.round((sum * (1 - c.extra / 100)) / 10) * 10
          return (
            <div key={c.title} className="flex flex-col rounded-2xl border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 font-bold text-heading"><Gift size={17} className="text-accent" /> {c.title}</p>
                <span className="rounded bg-new px-2 py-0.5 text-[11px] font-bold text-white">Extra {c.extra}% off</span>
              </div>
              <p className="mt-0.5 text-[13px]">{c.text}</p>
              <div className="mt-3 flex items-center gap-2">
                {items.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2">
                    {i > 0 && <span className="font-bold text-body">+</span>}
                    <Link to={`/product/${p.id}`} title={p.name}>
                      <ProductImage p={p} width={200} className="h-16 w-16 rounded-lg ring-1 ring-line sm:h-20 sm:w-20" />
                    </Link>
                  </div>
                ))}
              </div>
              <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                <p>
                  <span className="text-xl font-extrabold text-heading">{inr(comboPrice)}</span> <s className="text-sm text-muted">{inr(sum)}</s>
                  <span className="block text-xs font-bold text-new">You save {inr(sum - comboPrice)} more on the set</span>
                </p>
                <Button
                  type="primary"
                  onClick={() => {
                    items.forEach((p) => addToCart(p.id, 1, { silent: true }))
                    message.success(`${c.title} added to cart`)
                  }}
                >
                  Add set
                </Button>
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-xs">Combo price is a preview. Until the offers API is connected, the cart charges each item at its own selling price.</p>
    </section>
  )
}

function GroupRails() {
  return groups.slice(0, 2).map((g) => (
    <section key={g.key} className="container-x pt-12">
      <SectionHead title={g.label} text={g.text} to={`/products?group=${g.key}`} />
      <ProductRail list={products.filter((p) => p.group === g.key)} />
    </section>
  ))
}

function Brands() {
  const row = [...brands, ...brands, ...brands, ...brands]
  return (
    <section className="pt-12">
      <div className="container-x">
        <SectionHead title="Our Brands" text="Genuine products from brands you trust" />
      </div>
      <div className="overflow-hidden border-y border-line bg-soft py-5">
        <div className="marquee flex w-max gap-4">
          {row.map((b, i) => (
            <Link
              key={`${b.name}-${i}`}
              to={`/products?brand=${encodeURIComponent(b.name)}`}
              className="flex h-20 w-48 shrink-0 flex-col items-center justify-center rounded-xl bg-white ring-1 ring-line transition-shadow hover:shadow-md"
            >
              <span className="text-xl font-extrabold tracking-tight" style={{ color: b.color }}>{b.name}</span>
              <span className="text-[11px] font-semibold text-body">{b.note}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <HeroBanners />
      <CategoryStrip />
      <ShopByCategory />
      <Trending />
      <SpecialOffers />
      <Combos />
      <GroupRails />
      <Brands />
      <div className="pt-12">
        <WhyUs />
      </div>
      <Testimonials />
      <CtaBanner />
    </>
  )
}
