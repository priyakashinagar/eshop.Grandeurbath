import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Input, Button, App } from 'antd'
import { LinkedinFilled, FacebookFilled, InstagramFilled, YoutubeFilled } from '@ant-design/icons'
import { MapPin, Phone, Mail, MessageCircle } from 'lucide-react'
import Logo from './Logo'
import { Icon3d } from './IconTile'
import { company } from '../data/content'
import { subscribe as subscribeApi } from '../api'
import { groups, trustBadges } from '../data/shop'

const columns = [
  {
    title: 'Company',
    links: [
      ['About Us', '/about'],
      ['Contact Us', '/contact'],
      ['Hotels and Projects', '/hospitality'],
      ['FAQ', '/faq'],
    ],
  },
  {
    title: 'Customer Support',
    links: [
      ['My Orders', '/orders'],
      ['Track Your Order', '/track-order'],
      ['Wishlist', '/wishlist'],
      ['Customer Support', '/contact'],
    ],
  },
  {
    title: 'Policies',
    links: [
      ['Privacy Policy', '/policy/privacy'],
      ['Terms and Conditions', '/policy/terms'],
      ['Return and Refund Policy', '/policy/return-refund'],
      ['Shipping and Delivery Policy', '/policy/shipping'],
      ['Cancellation Policy', '/policy/cancellation'],
    ],
  },
]

// Links come from the admin panel (content: company.socials); icons without a link are hidden
const socials = [
  { key: 'instagram', Icon: InstagramFilled, label: 'Instagram' },
  { key: 'facebook', Icon: FacebookFilled, label: 'Facebook' },
  { key: 'linkedin', Icon: LinkedinFilled, label: 'LinkedIn' },
  { key: 'youtube', Icon: YoutubeFilled, label: 'YouTube' },
].filter((s) => company.socials?.[s.key])

const year = new Date().getFullYear()

const payments = ['UPI', 'Visa', 'Mastercard', 'RuPay', 'Net Banking', 'Cash on Delivery']

export default function Footer() {
  const { message } = App.useApp()
  const [email, setEmail] = useState('')

  const subscribe = async (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      message.error('Please enter a valid email')
      return
    }
    const res = await subscribeApi(email.trim())
    if (!res.ok) {
      message.error(res.message)
      return
    }
    message.success('Thanks for subscribing. Offers will reach your inbox.')
    setEmail('')
  }

  return (
    <footer className="mt-10 bg-white">
      {/* Trust badges */}
      <div className="border-y border-line bg-soft">
        <div className="container-x grid grid-cols-2 gap-4 py-6 md:grid-cols-5">
          {trustBadges.map((b) => (
            <div key={b.title} className="flex items-center gap-3">
              <Icon3d name={b.icon} size={36} />
              <div>
                <p className="text-sm font-bold text-heading">{b.title}</p>
                <p className="text-xs">{b.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-secondary text-white/70">
        <div className="gold-line" aria-hidden />
        {/* Newsletter */}
        <div className="border-b border-white/10">
          <div className="container-x flex flex-col items-start justify-between gap-4 py-7 md:flex-row md:items-center">
            <div>
              <p className="text-lg font-bold text-white">Get offers and new arrivals first</p>
              <p className="text-sm">Subscribe to our newsletter. No spam, only useful deals.</p>
            </div>
            <form onSubmit={subscribe} className="flex w-full gap-2 md:w-[440px]">
              <Input size="large" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" aria-label="Email address" />
              <Button size="large" type="primary" htmlType="submit">Subscribe</Button>
            </form>
          </div>
        </div>

        <div className="container-x grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo light />
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              Bath tubs, water tanks, bathroom fittings and plumbing products for homes, hotels and projects, from {company.legal}.
            </p>
            <ul className="m-0 mt-5 list-none space-y-2.5 p-0 text-sm">
              <li className="flex gap-2.5"><MapPin size={17} className="mt-0.5 shrink-0 text-gold" /> {company.address}</li>
              <li><a href={`tel:${company.phoneRaw}`} className="flex gap-2.5 hover:text-gold"><Phone size={17} className="text-gold" /> {company.phone}</a></li>
              <li><a href={`mailto:${company.email}`} className="flex gap-2.5 hover:text-gold"><Mail size={17} className="text-gold" /> {company.email}</a></li>
              <li><a href={`https://wa.me/${company.whatsapp}`} target="_blank" rel="noreferrer" className="flex gap-2.5 hover:text-gold"><MessageCircle size={17} className="text-gold" /> WhatsApp us</a></li>
            </ul>
            {socials.length > 0 && <div className="mt-5 flex gap-2.5">
              {socials.map(({ key, Icon, label }) => (
                <a key={label} href={company.socials[key]} target="_blank" rel="noreferrer" aria-label={label} className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white transition-colors hover:bg-primary">
                  <Icon />
                </a>
              ))}
            </div>}
          </div>

          <div className="grid grid-cols-2 gap-8 sm:col-span-1 lg:col-span-8 lg:grid-cols-4">
            <div>
              <h4 className="mb-4 text-[15px] font-bold !text-gold">Categories</h4>
              <ul className="m-0 list-none space-y-2.5 p-0 text-sm">
                {groups.map((g) => (
                  <li key={g.key}><Link to={`/products?group=${g.key}`} className="transition-colors hover:text-gold">{g.label}</Link></li>
                ))}
                <li><Link to="/offers" className="transition-colors hover:text-gold">Offers</Link></li>
                <li><Link to="/new-arrivals" className="transition-colors hover:text-gold">New Arrivals</Link></li>
              </ul>
            </div>
            {columns.map((c) => (
              <div key={c.title}>
                <h4 className="mb-4 text-[15px] font-bold !text-gold">{c.title}</h4>
                <ul className="m-0 list-none space-y-2.5 p-0 text-sm">
                  {c.links.map(([label, to]) => (
                    <li key={label}><Link to={to} className="transition-colors hover:text-gold">{label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="container-x flex flex-col items-center justify-between gap-3 py-5 text-[13px] lg:flex-row">
            <p>&copy; {year} {company.legal}. All rights reserved. GSTIN: {company.gstin}</p>
            <ul className="m-0 flex list-none flex-wrap justify-center gap-1.5 p-0">
              {payments.map((p) => (
                <li key={p} className="rounded bg-white px-2 py-1 text-[11px] font-bold text-heading">{p}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}
