import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, InputNumber, Tabs, Rate, Progress, Form, Input, Checkbox, Modal, App, Image } from 'antd'
import { Heart, GitCompareArrows, Share2, ShoppingCart, Zap, ShieldCheck, Truck, RotateCcw, BadgePercent, PlayCircle, FileText, ThumbsUp, MessageCircleQuestion } from 'lucide-react'
import StoreHeading from '../components/shop/StoreHeading'
import ProductImage from '../components/shop/ProductImage'
import ProductRail from '../components/shop/ProductRail'
import { PincodeChecker } from '../components/shop/PincodeModal'
import { RatingPill, StockLabel } from '../components/ProductCard'
import NotFound from './NotFound'
import { photo } from '../data/content'
import { findProduct, findSub, products, coupons, delivery } from '../data/shop'
import { getReviews, addReview, getQuestions, askQuestion } from '../api'
import { useShop } from '../store/shopContext'
import { useQuote } from '../components/quoteContext'
import { inr } from '../utils/pricing'

function Gallery({ p }) {
  const [active, setActive] = useState(0)
  const [video, setVideo] = useState(false)
  const count = Math.max(p.images.length, 1)

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      <div className="no-scrollbar flex gap-2 overflow-x-auto md:w-20 md:flex-col">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Image ${i + 1}`}
            className={`shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 ${active === i ? 'border-primary' : 'border-line'}`}
          >
            <ProductImage p={p} index={i} width={160} className="h-16 w-16 md:h-20 md:w-[76px]" />
          </button>
        ))}
        <button type="button" onClick={() => setVideo(true)} className="relative shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 border-line" aria-label="Play product video">
          <ProductImage p={p} width={160} className="h-16 w-16 opacity-60 md:h-20 md:w-[76px]" />
          <span className="absolute inset-0 grid place-items-center bg-black/30 text-white"><PlayCircle size={26} /></span>
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden rounded-xl border border-line">
        {p.images.length ? (
          <Image.PreviewGroup items={p.images.map((id) => photo(id, 1600))} preview={{ current: active, onChange: setActive }}>
            <Image src={photo(p.images[active] || p.images[0], 900)} alt={p.name} rootClassName="!block" className="aspect-square !w-full object-cover" />
          </Image.PreviewGroup>
        ) : (
          <ProductImage p={p} className="aspect-square" />
        )}
        {p.off > 0 && <span className="pointer-events-none absolute left-3 top-3 rounded bg-sale px-2.5 py-1 text-xs font-bold text-white">-{p.off}% OFF</span>}
      </div>

      <Modal open={video} onCancel={() => setVideo(false)} footer={null} title="Product video" width={720} destroyOnHidden>
        {p.video ? (
          <video src={p.video} controls autoPlay className="w-full rounded-lg" />
        ) : (
          <div className="grid aspect-video place-items-center rounded-lg bg-light text-center">
            <div>
              <PlayCircle size={42} className="mx-auto text-muted" />
              <p className="mt-2 font-semibold text-heading">Video for this product is coming soon</p>
              <p className="text-sm">Product videos will appear here once they are uploaded from the admin panel.</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Specs({ p }) {
  const rows = [
    ['Brand', p.brand],
    ['SKU / Product ID', p.code],
    ['Product type', p.type],
    ['Dimensions (L × W × H)', `${p.dims[0]} × ${p.dims[1]} × ${p.dims[2]} mm`],
    ['Weight', `${p.weight} kg`],
    ['Material', p.material],
    ['Color / Finish', p.color],
    ['Size', p.size],
    ...(p.capacity ? [['Capacity', p.capacity]] : []),
    ['Warranty', p.warranty],
    ['Country of origin', 'India'],
  ]
  return (
    <table className="w-full overflow-hidden rounded-xl text-sm ring-1 ring-line">
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={k} className={i % 2 ? 'bg-white' : 'bg-soft'}>
            <th scope="row" className="w-2/5 px-4 py-3 text-left font-semibold text-body">{k}</th>
            <td className="px-4 py-3 font-semibold text-heading">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Loads a list for this product from the API once; returns [list, setList, loading, fullResponse]
function useProductList(load, id, field) {
  const [state, setState] = useState({ id: null, list: [], meta: null })
  useEffect(() => {
    let live = true
    load(id).then((res) => live && setState({ id, list: res.ok ? res[field] : [], meta: res.ok ? res : null }))
    return () => {
      live = false
    }
  }, [load, id, field])
  const setList = (fn) => setState((x) => ({ ...x, list: fn(x.list) }))
  return [state.list, setList, state.id !== id, state.meta]
}

function Reviews({ p }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [list, setList, loading, meta] = useProductList(getReviews, p.id, 'reviews')
  const [sending, setSending] = useState(false)
  const [added, setAdded] = useState([]) // ratings posted during this visit
  // Star breakdown of the written reviews, from the server's real counts
  const counts = Object.fromEntries([5, 4, 3, 2, 1].map((s) => [s, (meta?.breakdown?.[s] || 0) + added.filter((x) => x === s).length]))
  const written = Object.values(counts).reduce((a, b) => a + b, 0)
  const bars = [5, 4, 3, 2, 1].map((s) => ({ s, count: counts[s], pct: written ? Math.round((counts[s] / written) * 100) : 0 }))

  return (
    <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
      <div>
        <div className="rounded-xl bg-soft p-5 text-center ring-1 ring-line">
          <p className="text-5xl font-extrabold text-heading">{p.rating.toFixed(1)}</p>
          <Rate disabled allowHalf value={p.rating} className="!text-base" />
          <p className="text-sm">Based on {p.reviews} ratings</p>
          <div className="mt-4 space-y-1.5">
            {bars.map((b) => (
              <div key={b.s} className="flex items-center gap-2 text-xs font-semibold">
                <span className="w-6">{b.s}★</span>
                <Progress percent={b.pct} showInfo={false} size="small" strokeColor="#0D9D00" className="!m-0 flex-1" />
                <span className="w-8 text-right">{b.count}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs">{written ? `From ${written} written ${written === 1 ? 'review' : 'reviews'}` : 'No written reviews yet'}</p>
        </div>
        <div className="mt-4 rounded-xl p-4 ring-1 ring-line">
          <p className="mb-3 font-bold text-heading">Write a review</p>
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={async (v) => {
              setSending(true)
              const res = await addReview(p.id, { name: v.name, rating: v.rating, text: v.text })
              setSending(false)
              if (!res.ok) {
                message.error(res.message)
                return
              }
              setList((x) => [res.review, ...x])
              setAdded((x) => [...x, res.review.rating])
              form.resetFields()
              message.success('Thank you for your review')
            }}
          >
            <Form.Item name="rating" label="Your rating" rules={[{ required: true, message: 'Please give a rating' }]}>
              <Rate />
            </Form.Item>
            <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please enter your name' }]}>
              <Input placeholder="Your name" />
            </Form.Item>
            <Form.Item name="text" label="Review" rules={[{ required: true, min: 10, message: 'Please write at least 10 characters' }]}>
              <Input.TextArea rows={3} placeholder="What did you like or dislike?" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={sending}>Submit review</Button>
          </Form>
        </div>
      </div>
      {loading && <p className="text-sm">Loading reviews...</p>}
      {!loading && !list.length && <p className="text-sm">No reviews yet. Be the first to review this product.</p>}
      <ul className="m-0 list-none divide-y divide-line p-0">
        {list.map((r) => (
          <li key={r.id} className="py-4 first:pt-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5 rounded bg-new px-1.5 py-0.5 text-xs font-bold text-white">{r.rating}★</span>
              <p className="font-bold text-heading">{r.name}</p>
              {r.verified && <span className="text-xs font-semibold text-new">Verified buyer</span>}
              <span className="ml-auto text-xs">{new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <p className="mt-1.5 text-[15px] leading-relaxed text-heading/85">{r.text}</p>
            <button type="button" className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-body hover:text-primary-dark">
              <ThumbsUp size={13} /> Helpful
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Questions({ p }) {
  const { message } = App.useApp()
  const [q, setQ] = useState('')
  const [list, setList] = useProductList(getQuestions, p.id, 'questions')
  return (
    <div className="max-w-3xl">
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (q.trim().length < 5) return
          const res = await askQuestion(p.id, q.trim())
          if (!res.ok) {
            message.error(res.message)
            return
          }
          setList((x) => [res.question, ...x])
          setQ('')
          message.success('Question submitted. Our team usually answers within 24 hours.')
        }}
      >
        <Input size="large" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Have a question? Ask about size, fitting, warranty..." />
        <Button size="large" type="primary" htmlType="submit">Ask</Button>
      </form>
      <ul className="m-0 mt-5 list-none space-y-4 p-0">
        {list.map((x, i) => (
          <li key={i} className="rounded-xl p-4 ring-1 ring-line">
            <p className="flex gap-2 font-bold text-heading"><MessageCircleQuestion size={18} className="mt-0.5 shrink-0 text-primary-dark" /> Q: {x.q}</p>
            <p className="mt-1.5 pl-[26px] text-[15px]">{x.a ? `A: ${x.a}` : <i>Awaiting answer from our team</i>}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BoughtTogether({ p }) {
  const { addToCart } = useShop()
  const { message } = App.useApp()
  const extras = useMemo(() => {
    const sameGroup = products.filter((x) => x.id !== p.id && x.group === p.group && x.cat !== p.cat && x.stock > 0)
    const fallback = products.filter((x) => x.id !== p.id && x.stock > 0)
    return [...sameGroup, ...fallback].filter((x, i, a) => a.indexOf(x) === i).slice(0, 2)
  }, [p])
  const all = [p, ...extras]
  const [picked, setPicked] = useState(all.map((x) => x.id))
  const chosen = all.filter((x) => picked.includes(x.id))
  const total = chosen.reduce((s, x) => s + x.price, 0)

  return (
    <div className="rounded-xl p-5 ring-1 ring-line">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {all.map((x, i) => (
            <div key={x.id} className="flex items-center gap-3">
              {i > 0 && <span className="text-xl font-bold text-body">+</span>}
              <div className="w-32 text-center">
                <Link to={`/product/${x.id}`}>
                  <ProductImage p={x} width={240} className="mx-auto aspect-square w-28 rounded-lg ring-1 ring-line" />
                </Link>
                <Checkbox
                  checked={picked.includes(x.id)}
                  disabled={x.id === p.id || x.stock <= 0}
                  onChange={(e) => setPicked((s) => (e.target.checked ? [...s, x.id] : s.filter((id) => id !== x.id)))}
                  className="!mt-2 !text-left !text-xs"
                >
                  <span className="line-clamp-2 text-xs font-semibold text-heading">{x.id === p.id ? 'This item: ' : ''}{x.name}</span>
                </Checkbox>
                <p className="text-sm font-bold text-heading">{inr(x.price)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-soft p-4 lg:w-64">
          <p className="text-sm">Total for {chosen.length} items</p>
          <p className="text-2xl font-extrabold text-heading">{inr(total)}</p>
          <Button
            type="primary"
            block
            className="!mt-3"
            disabled={p.stock <= 0}
            onClick={() => {
              chosen.forEach((x) => addToCart(x.id, 1, { silent: true }))
              message.success(`${chosen.length} items added to cart`)
            }}
          >
            Add {chosen.length} to cart
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ProductDetail() {
  const { id } = useParams()
  const p = findProduct(id)
  return p ? <Detail key={p.id} p={p} /> : <NotFound />
}

function Detail({ p }) {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { addToCart, toggleWishlist, inWishlist, toggleCompare, inCompare } = useShop()
  const { add: addToQuote } = useQuote()
  const [qty, setQty] = useState(1)
  const sub = findSub(p.cat)
  const soldOut = p.stock <= 0
  const liked = inWishlist(p.id)
  const related = products.filter((x) => x.cat === p.cat && x.id !== p.id).concat(products.filter((x) => x.group === p.group && x.cat !== p.cat)).slice(0, 10)

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: p.name, url })
        return
      }
      await navigator.clipboard.writeText(url)
      message.success('Product link copied')
    } catch {
      // share sheet closed or clipboard blocked
    }
  }

  const buyNow = () => {
    addToCart(p.id, qty, { silent: true })
    navigate('/checkout')
  }

  return (
    <>
      <StoreHeading
        title={p.name}
        crumbs={[
          { label: sub.groupLabel, to: `/products?group=${sub.group}` },
          { label: sub.label, to: `/products?cat=${sub.key}` },
        ]}
      />

      <section className="container-x py-6 md:py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="lg:sticky lg:top-[140px] lg:self-start">
            <Gallery p={p} />
          </div>

          <div>
            <Link to={`/products?brand=${encodeURIComponent(p.brand)}`} className="text-sm font-bold uppercase tracking-wider text-primary-dark">{p.brand}</Link>
            <h2 className="mt-1 text-2xl font-bold leading-snug md:text-[28px]">{p.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <a href="#reviews"><RatingPill rating={p.rating} reviews={`${p.reviews} ratings`} /></a>
              <span>SKU: <b className="text-heading">{p.code}</b></span>
              <span>{p.sold}+ sold</span>
            </div>

            <div className="mt-4 rounded-xl bg-soft p-4 ring-1 ring-line">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-3xl font-extrabold text-heading">{inr(p.price)}</span>
                {p.off > 0 && (
                  <>
                    <span className="text-base">MRP <s className="text-muted">{inr(p.mrp)}</s></span>
                    <span className="rounded bg-sale px-2 py-0.5 text-sm font-bold text-white">{p.off}% off</span>
                  </>
                )}
              </div>
              <p className="mt-1 text-xs">Inclusive of all taxes. You save <b className="text-new">{inr(p.mrp - p.price)}</b></p>
              <div className="mt-3"><StockLabel stock={p.stock} className="!text-sm" /></div>
            </div>

            <div className="mt-4 space-y-2">
              {coupons.slice(0, 2).map((c) => (
                <p key={c.code} className="flex items-start gap-2 text-sm text-heading">
                  <BadgePercent size={17} className="mt-0.5 shrink-0 text-accent" />
                  <span><b>{c.code}</b> · {c.text}</span>
                </p>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-heading">Quantity</span>
              <InputNumber min={1} max={Math.max(1, p.stock)} value={qty} onChange={(v) => setQty(v || 1)} disabled={soldOut} size="large" className="!w-24" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Button size="large" type="primary" ghost icon={<ShoppingCart size={18} />} disabled={soldOut} onClick={() => addToCart(p.id, qty)}>
                Add to cart
              </Button>
              <Button size="large" type="primary" icon={<Zap size={18} />} disabled={soldOut} onClick={buyNow}>
                Buy now
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button icon={<Heart size={16} fill={liked ? 'currentColor' : 'none'} />} danger={liked} onClick={() => toggleWishlist(p.id)}>
                {liked ? 'Wishlisted' : 'Add to wishlist'}
              </Button>
              <Button icon={<GitCompareArrows size={16} />} type={inCompare(p.id) ? 'primary' : 'default'} onClick={() => toggleCompare(p.id)}>
                Compare
              </Button>
              <Button icon={<Share2 size={16} />} onClick={share}>Share</Button>
              <Button icon={<FileText size={16} />} onClick={() => addToQuote(p.code)}>Bulk quote</Button>
            </div>

            <div className="mt-6 rounded-xl p-4 ring-1 ring-line">
              <p className="mb-2 flex items-center gap-2 font-bold text-heading"><Truck size={18} className="text-primary-dark" /> Check delivery</p>
              <PincodeChecker compact />
            </div>

            <ul className="m-0 mt-5 grid list-none grid-cols-3 gap-2 p-0 text-center text-xs font-semibold text-heading">
              <li className="rounded-xl bg-soft p-3 ring-1 ring-line"><ShieldCheck size={22} className="mx-auto mb-1 text-primary-dark" />{p.warranty} warranty</li>
              <li className="rounded-xl bg-soft p-3 ring-1 ring-line"><RotateCcw size={22} className="mx-auto mb-1 text-primary-dark" />{delivery.returnDays} day replacement</li>
              <li className="rounded-xl bg-soft p-3 ring-1 ring-line"><Truck size={22} className="mx-auto mb-1 text-primary-dark" />Free above ₹{delivery.freeAbove.toLocaleString('en-IN')}</li>
            </ul>

            <div className="mt-6">
              <p className="mb-2 font-bold text-heading">Key highlights</p>
              <ul className="m-0 list-disc space-y-1 pl-5 text-[15px]">
                {p.highlights.map((h) => <li key={h}>{h}</li>)}
                <li>Dimensions: {p.dims.join(' × ')} mm · Weight {p.weight} kg</li>
              </ul>
            </div>
          </div>
        </div>

        <div id="reviews" className="mt-10 scroll-mt-40">
          <Tabs
            size="large"
            items={[
              { key: 'desc', label: 'Description', children: <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed"><p>{p.desc}</p><p>Suitable for {sub.groupLabel.toLowerCase()} requirements in homes, hotels and commercial projects. For bulk orders, use the Bulk quote button to get project pricing.</p></div> },
              { key: 'specs', label: 'Specifications', children: <div className="max-w-3xl"><Specs p={p} /></div> },
              { key: 'reviews', label: `Reviews (${p.reviews})`, children: <Reviews p={p} /> },
              { key: 'qa', label: 'Questions and Answers', children: <Questions p={p} /> },
            ]}
          />
        </div>

        <div className="mt-10">
          <h2 className="mb-4 text-[22px] font-bold md:text-[26px]">Frequently bought together</h2>
          <BoughtTogether p={p} />
        </div>

        {related.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-[22px] font-bold md:text-[26px]">Related products</h2>
            <ProductRail list={related} />
          </div>
        )}
      </section>
    </>
  )
}
