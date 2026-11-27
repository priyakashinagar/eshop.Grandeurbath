import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Badge, Drawer, Dropdown, Button, Collapse } from 'antd'
import { Menu, MapPin, User, Heart, ShoppingCart, Package, ChevronDown, LayoutGrid, Phone, Headphones, Truck, FileText, ArrowRight, Tag, Sparkles, SlidersHorizontal } from 'lucide-react'
import Logo from './Logo'
import SearchBox from './shop/SearchBox'
import FilterDrawer from './shop/FilterDrawer'
import ProductImage from './shop/ProductImage'
import { groups, products, delivery } from '../data/shop'
import { company } from '../data/content'
import { useQuote } from './quoteContext'
import { useShop } from '../store/shopContext'
import { inr, summarize } from '../utils/pricing'

// The first line can be changed from the admin panel (store settings > announcement)
const announcements = [
  delivery.announcement || 'Festive Sale is live: up to 40% off on bathroom products',
  `Free shipping on orders above ₹${delivery.freeAbove.toLocaleString('en-IN')} · Cash on delivery available`,
  'Use code WELCOME10 for 10% off on your first order',
]

const topProducts = (group) => products.filter((p) => p.group === group).sort((a, b) => b.sold - a.sold).slice(0, 3)

function IconAction({ to, onClick, icon: Icon, label, count, sub }) {
  const inner = (
    <>
      <Badge count={count} size="small" color="#AE7714" offset={[-2, 2]}>
        <Icon size={23} strokeWidth={1.7} className="text-heading" />
      </Badge>
      <span className="hidden leading-tight xl:block">
        <span className="block text-[11px] text-body">{sub}</span>
        <span className="block text-[13px] font-bold text-heading">{label}</span>
      </span>
    </>
  )
  const cls = 'flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-light cursor-pointer'
  return to ? (
    <Link to={to} className={cls} aria-label={label}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} aria-label={label}>
      {inner}
    </button>
  )
}

function GroupPanel({ g, onPick }) {
  return (
    <div className="grid grid-cols-12 gap-6 p-6">
      <div className="col-span-3">
        <Link to={`/products?group=${g.key}`} onClick={onPick} className="group block overflow-hidden rounded-xl bg-light">
          <ProductImage p={g} width={500} className="aspect-[4/3]" imgClassName="transition-transform duration-500 group-hover:scale-105" />
          <div className="p-4">
            <p className="font-bold text-heading">{g.label}</p>
            <p className="mt-0.5 text-[13px]">{g.text}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-primary-dark">
              View all <ArrowRight size={14} />
            </span>
          </div>
        </Link>
      </div>
      <div className="col-span-6">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-heading">Shop by type</p>
        <div className="grid grid-cols-3 gap-3">
          {g.subs.map((s) => (
            <Link key={s.key} to={`/products?cat=${s.key}`} onClick={onPick} className="group text-center">
              <ProductImage p={s} width={240} className="mx-auto aspect-square w-full max-w-[120px] rounded-xl ring-1 ring-line" imgClassName="transition-transform duration-500 group-hover:scale-110" />
              <span className="mt-2 block text-[13px] font-semibold leading-snug text-heading group-hover:text-primary-dark">{s.label}</span>
            </Link>
          ))}
        </div>
      </div>
      <div className="col-span-3 border-l border-line pl-6">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-heading">Best sellers</p>
        <ul className="m-0 list-none space-y-3 p-0">
          {topProducts(g.key).map((p) => (
            <li key={p.id}>
              <Link to={`/product/${p.id}`} onClick={onPick} className="flex items-center gap-3 hover:text-primary-dark">
                <ProductImage p={p} width={120} className="h-14 w-14 shrink-0 rounded-lg ring-1 ring-line" />
                <span className="min-w-0">
                  <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-heading">{p.name}</span>
                  <span className="text-[13px] font-bold text-heading">{inr(p.price)}</span> <s className="text-xs text-muted">{inr(p.mrp)}</s>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function AllCategoriesPanel({ onPick }) {
  const [active, setActive] = useState(groups[0].key)
  const g = groups.find((x) => x.key === active)
  return (
    <div className="flex min-h-[380px]">
      <ul className="m-0 w-[270px] shrink-0 list-none border-r border-[#eee] bg-soft p-0">
        {groups.map((x) => (
          <li key={x.key}>
            <Link
              to={`/products?group=${x.key}`}
              onClick={onPick}
              onMouseEnter={() => setActive(x.key)}
              onFocus={() => setActive(x.key)}
              className={`flex items-center justify-between border-b border-l-[3px] border-b-[#f0f0f0] px-5 py-4 font-bold transition-all ${
                active === x.key ? 'border-l-primary bg-white text-primary-dark' : 'border-l-transparent text-[#333]'
              }`}
            >
              {x.label}
              <ArrowRight size={16} className="text-[#ccc]" />
            </Link>
          </li>
        ))}
        <li>
          <Link to="/offers" onClick={onPick} className="flex items-center gap-2 border-l-[3px] border-l-transparent px-5 py-4 font-bold text-accent">
            <Tag size={16} /> Offers
          </Link>
        </li>
      </ul>
      <div className="flex-1">
        <GroupPanel g={g} onPick={onPick} />
      </div>
    </div>
  )
}

export default function Header() {
  const navigate = useNavigate()
  const { pathname, search, key } = useLocation()
  // The drawer belongs to the page it was opened on, so it closes by itself after navigation
  const [openKey, setOpenKey] = useState(null)
  const open = openKey === key
  const setOpen = (v) => setOpenKey(v ? key : null)
  const [megaOff, setMegaOff] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { count: quoteCount, openQuote } = useQuote()
  const { cartRows, cartCount, wishlist, user, logout, pincode, openPincode } = useShop()
  const cartTotal = summarize(cartRows).subtotal

  // Close the hover menus after a link inside them is clicked
  const pick = () => {
    setMegaOff(true)
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }

  const accountItems = user
    ? [
        { key: 'hi', label: <span className="font-bold text-heading">Hi, {user.name?.split(' ')[0] || 'there'}</span>, disabled: true },
        { type: 'divider' },
        { key: '/account', label: 'My account', icon: <User size={15} /> },
        { key: '/orders', label: 'My orders', icon: <Package size={15} /> },
        { key: '/wishlist', label: 'Wishlist', icon: <Heart size={15} /> },
        { key: '/compare', label: 'Compare', icon: <LayoutGrid size={15} /> },
        { key: '/track-order', label: 'Track order', icon: <Truck size={15} /> },
        { type: 'divider' },
        { key: 'logout', label: 'Log out', danger: true },
      ]
    : [
        { key: '/login', label: <span className="font-bold">Login</span>, icon: <User size={15} /> },
        { key: '/login?tab=signup', label: 'Create an account' },
        { type: 'divider' },
        { key: '/orders', label: 'My orders', icon: <Package size={15} /> },
        { key: '/track-order', label: 'Track order', icon: <Truck size={15} /> },
      ]

  const onAccount = ({ key }) => (key === 'logout' ? logout() : navigate(key))

  const navCls = ({ isActive }) =>
    `flex shrink-0 items-center gap-1 whitespace-nowrap px-2.5 py-3 text-[14px] font-bold xl:px-3.5 transition-colors hover:text-primary-dark ${isActive ? 'text-primary-dark' : 'text-heading'}`

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-secondary text-[13px] text-white/85">
        <div className="container-x flex h-9 items-center justify-between gap-4">
          <div className="h-9 flex-1 overflow-hidden">
            <div className="ticker">
              {announcements.map((a) => (
                <p key={a} className="flex h-9 items-center truncate">{a}</p>
              ))}
            </div>
          </div>
          <div className="hidden shrink-0 items-center gap-5 whitespace-nowrap md:flex">
            <Link to="/hospitality" className="text-white/85 hover:text-gold xl:hidden">Hotels and Projects</Link>
            <Link to="/about" className="text-white/85 hover:text-gold xl:hidden">About</Link>
            <Link to="/contact" className="flex items-center gap-1.5 whitespace-nowrap text-white/85 hover:text-gold"><Headphones size={14} /> Customer Support</Link>
            <Link to="/track-order" className="flex items-center gap-1.5 text-white/85 hover:text-gold"><Truck size={14} /> Track Order</Link>
            <button type="button" onClick={openQuote} className="flex cursor-pointer items-center gap-1.5 hover:text-gold">
              <FileText size={14} /> Bulk Quote{quoteCount ? ` (${quoteCount})` : ''}
            </button>
            <a href={`tel:${company.phoneRaw}`} className="flex items-center gap-1.5 font-bold text-gold hover:text-white"><Phone size={14} /> {company.phone}</a>
          </div>
        </div>
      </div>
      <div className="gold-line" aria-hidden />

      <header className="sticky top-0 z-50 bg-white shadow-[0_1px_0_#E5E5E5]">
        {/* Main row */}
        <div className="container-x flex h-[68px] items-center gap-3 lg:h-20 lg:gap-6">
          <button type="button" className="-ml-1 grid h-10 w-10 cursor-pointer place-items-center rounded-lg hover:bg-light lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu size={24} />
          </button>
          <Logo />

          <button type="button" onClick={openPincode} className="hidden shrink-0 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-light xl:flex">
            <MapPin size={22} strokeWidth={1.7} className="text-primary-dark" />
            <span className="leading-tight">
              <span className="block text-[11px] text-body">Deliver to</span>
              <span className="block max-w-[120px] truncate text-[13px] font-bold text-heading">{pincode ? `${pincode.city} ${pincode.pincode}` : 'Enter pincode'}</span>
            </span>
          </button>

          <SearchBox className="hidden flex-1 lg:block" />

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1 lg:ml-0">
            <Dropdown menu={{ items: accountItems, onClick: onAccount }} trigger={['hover', 'click']} placement="bottomRight" rootClassName="min-w-[200px]">
              <button type="button" className="hidden cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-light sm:flex" aria-label="Account">
                <User size={23} strokeWidth={1.7} className="text-heading" />
                <span className="hidden leading-tight xl:block">
                  <span className="block text-left text-[11px] text-body">{user ? 'Hello' : 'Login / Signup'}</span>
                  <span className="flex items-center gap-0.5 text-[13px] font-bold text-heading">
                    {user ? user.name?.split(' ')[0] : 'My Account'} <ChevronDown size={13} />
                  </span>
                </span>
              </button>
            </Dropdown>
            <span className="hidden md:block">
              <IconAction to="/orders" icon={Package} label="Orders" sub="My" />
            </span>
            <IconAction to="/wishlist" icon={Heart} label="Wishlist" sub="My" count={wishlist.length} />
            <IconAction to="/cart" icon={ShoppingCart} label={inr(cartTotal)} sub="Cart" count={cartCount} />
          </div>
        </div>

        {/* Mobile search */}
        <div className="container-x flex gap-2 pb-3 lg:hidden">
          <SearchBox className="flex-1" />
          <button type="button" onClick={() => setFiltersOpen(true)} aria-label="Open filters" className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] border border-line px-3 text-sm font-bold text-heading">
            <SlidersHorizontal size={17} /> <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        {/* Category navigation */}
        <nav
          aria-label="Categories"
          onMouseLeave={() => setMegaOff(false)}
          className={`relative hidden border-t border-line lg:block ${megaOff ? '[&_.mega-panel]:!hidden' : ''}`}
        >
          <div className="container-x flex items-center">
            <div className="mega-trigger">
              <button type="button" className="my-1.5 mr-2 flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg gold-grad px-3 py-2 text-[14px] xl:mr-3 xl:px-4 font-bold text-white shadow-[0_6px_16px_-8px_rgba(174,119,20,.8)] hover:brightness-110">
                <Menu size={17} /> All Categories <ChevronDown size={15} />
              </button>
              <div className="mega-panel absolute inset-x-0 top-full z-50">
                <div className="container-x">
                  <div className="overflow-hidden rounded-b-xl border border-t-0 border-[#f0f0f0] bg-white shadow-[0_20px_40px_-12px_rgba(0,0,0,.18)]">
                    <AllCategoriesPanel onPick={pick} />
                  </div>
                </div>
              </div>
            </div>

            {groups.map((g) => (
              <div key={g.key} className="mega-trigger">
                <NavLink to={`/products?group=${g.key}`} onClick={pick} className={() => navCls({ isActive: pathname === '/products' && search.includes(`group=${g.key}`) })}>
                  {g.label} <ChevronDown size={14} className="text-body" />
                </NavLink>
                <div className="mega-panel absolute inset-x-0 top-full z-50">
                  <div className="container-x">
                    <div className="rounded-b-xl border border-t-0 border-[#f0f0f0] bg-white shadow-[0_20px_40px_-12px_rgba(0,0,0,.18)]">
                      <GroupPanel g={g} onPick={pick} />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button type="button" onClick={() => setFiltersOpen(true)} className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap px-2.5 py-3 text-[14px] font-bold text-heading hover:text-primary-dark xl:px-3.5">
              <SlidersHorizontal size={15} /> Filters
            </button>

            <NavLink to="/offers" className={({ isActive }) => `${navCls({ isActive })} !text-accent`}>
              <Tag size={15} /> Offers
            </NavLink>
            <NavLink to="/new-arrivals" className={navCls}>
              <Sparkles size={15} className="text-new" /> New Arrivals
            </NavLink>

            <div className="ml-auto hidden items-center xl:flex">
              <NavLink to="/hospitality" className={navCls}>Hotels and Projects</NavLink>
              <NavLink to="/about" className={navCls}>About</NavLink>
            </div>
          </div>
        </nav>
      </header>

      <FilterDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} />

      {/* Mobile menu */}
      <Drawer open={open} onClose={() => setOpen(false)} placement="left" title={<Logo />} size={320} styles={{ body: { padding: 0 } }}>
        <div className="border-b border-line bg-light p-4">
          {user ? (
            <div className="flex items-center justify-between">
              <p className="font-bold text-heading">Hi, {user.name}</p>
              <Button size="small" onClick={logout}>Log out</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link to="/login"><Button type="primary" block>Login</Button></Link>
              <Link to="/login?tab=signup"><Button block>Sign up</Button></Link>
            </div>
          )}
          <button type="button" onClick={() => { setOpen(false); openPincode() }} className="mt-3 flex w-full cursor-pointer items-center gap-2 text-left text-sm font-semibold text-heading">
            <MapPin size={17} className="text-primary-dark" /> {pincode ? `Deliver to ${pincode.city} ${pincode.pincode}` : 'Enter delivery pincode'}
          </button>
        </div>

        <p className="px-4 pb-1 pt-4 text-xs font-extrabold uppercase tracking-wider text-body">Shop by category</p>
        <Collapse
          ghost
          expandIconPlacement="end"
          items={groups.map((g) => ({
            key: g.key,
            label: <span className="font-bold text-heading">{g.label}</span>,
            children: (
              <ul className="m-0 -mt-2 list-none space-y-0.5 p-0">
                <li><Link to={`/products?group=${g.key}`} className="block py-1.5 text-sm font-bold text-primary-dark">View all {g.label}</Link></li>
                {g.subs.map((s) => (
                  <li key={s.key}><Link to={`/products?cat=${s.key}`} className="block py-1.5 text-sm text-heading">{s.label}</Link></li>
                ))}
              </ul>
            ),
          }))}
        />

        <nav className="flex flex-col border-t border-line px-4 py-2" aria-label="Mobile">
          {[
            ['/offers', 'Offers'],
            ['/new-arrivals', 'New Arrivals'],
            ['/account', 'My Account'],
            ['/orders', 'My Orders'],
            ['/wishlist', 'Wishlist'],
            ['/compare', 'Compare'],
            ['/track-order', 'Track Order'],
            ['/hospitality', 'Hotels and Projects'],
            ['/about', 'About Us'],
            ['/contact', 'Contact Us'],
            ['/faq', 'FAQ'],
          ].map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `border-b border-line py-3 text-[15px] font-semibold last:border-0 ${isActive ? 'text-primary-dark' : 'text-heading'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 p-4">
          <Button block icon={<FileText size={16} />} onClick={() => { setOpen(false); openQuote() }}>
            Bulk / project quote{quoteCount ? ` (${quoteCount})` : ''}
          </Button>
          <a href={`tel:${company.phoneRaw}`} className="block">
            <Button type="primary" block icon={<Phone size={16} />}>Call {company.phone}</Button>
          </a>
        </div>
      </Drawer>
    </>
  )
}
