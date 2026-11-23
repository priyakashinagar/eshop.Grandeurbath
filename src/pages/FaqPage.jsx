import { useState } from 'react'
import { Collapse, Input, Segmented, Button } from 'antd'
import { Search, Plus } from 'lucide-react'
import StoreHeading from '../components/shop/StoreHeading'
import { faqs as projectFaqs, company } from '../data/content'
import { delivery } from '../data/shop'

const sections = [
  {
    key: 'orders',
    label: 'Orders',
    items: [
      { q: 'How do I place an order?', a: 'Add products to your cart, click Proceed to checkout, enter your address and choose a payment method. You can checkout as a guest or log in.' },
      { q: 'Can I change my order after placing it?', a: 'Orders can be changed or cancelled before they are shipped. Go to My Orders or call our support team.' },
      { q: 'How do I track my order?', a: 'Use the Track Order page with your order ID and mobile number, or open My Orders if you are logged in.' },
    ],
  },
  {
    key: 'payment',
    label: 'Payment',
    items: [
      { q: 'Which payment methods do you accept?', a: 'We accept UPI, debit cards, credit cards, net banking and wallets through Razorpay, and cash on delivery.' },
      { q: 'Is online payment safe?', a: 'Yes. Payments are processed by Razorpay on a secure, PCI DSS compliant gateway. We never store your card details.' },
      { q: 'Is cash on delivery available?', a: `Yes, cash on delivery is available for orders up to ₹${delivery.codLimit.toLocaleString('en-IN')} at most pincodes.` },
      { q: 'Will I get a GST invoice?', a: 'Yes. Every order includes a GST invoice. Enter your GSTIN at checkout to claim input tax credit.' },
    ],
  },
  {
    key: 'delivery',
    label: 'Shipping',
    items: [
      { q: 'What are the delivery charges?', a: `Delivery is free on orders above ₹${delivery.freeAbove}. A flat ₹${delivery.charge} is charged on smaller orders.` },
      { q: 'How long does delivery take?', a: 'Delhi NCR orders arrive in 2 to 3 days. Most other cities take 4 to 7 days. Enter your pincode on any product to see the exact date.' },
      { q: 'Do you deliver large items like bathtubs and water tanks?', a: 'Yes. Large items are shipped with special packing. Our team calls you before delivery to confirm access to the site.' },
    ],
  },
  {
    key: 'returns',
    label: 'Returns',
    items: [
      { q: 'What is your return policy?', a: 'Damaged, defective or wrong products can be replaced within 7 days of delivery. See the Return and Refund Policy for details.' },
      { q: 'How long do refunds take?', a: 'Refunds are processed within 5 to 7 working days after we receive and check the returned product.' },
    ],
  },
  { key: 'projects', label: 'Projects', items: projectFaqs },
]

export default function FaqPage() {
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const shown = sections
    .filter((s) => tab === 'all' || s.key === tab)
    .map((s) => ({ ...s, items: s.items.filter((i) => !term || `${i.q} ${i.a}`.toLowerCase().includes(term)) }))
    .filter((s) => s.items.length)

  return (
    <>
      <StoreHeading title="Frequently Asked Questions" crumbs={[{ label: 'FAQ' }]} text="Answers about orders, payments, shipping and returns" />
      <section className="bg-cool py-8">
        <div className="container-x max-w-4xl">
          <Input size="large" allowClear prefix={<Search size={18} className="text-body" />} placeholder="Search questions" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="no-scrollbar mt-4 overflow-x-auto">
            <Segmented value={tab} onChange={setTab} options={[{ value: 'all', label: 'All' }, ...sections.map((s) => ({ value: s.key, label: s.label }))]} />
          </div>
          <div className="mt-6 space-y-6">
            {shown.map((s) => (
              <div key={s.key}>
                <h2 className="mb-3 text-lg font-bold">{s.label}</h2>
                <Collapse
                  accordion
                  expandIconPlacement="end"
                  expandIcon={({ isActive }) => <Plus size={18} className={`text-primary-dark transition-transform ${isActive ? 'rotate-45' : ''}`} />}
                  className="!border-0 !bg-transparent [&_.ant-collapse-content]:!border-0 [&_.ant-collapse-item]:!mb-2 [&_.ant-collapse-item]:overflow-hidden [&_.ant-collapse-item]:!rounded-xl [&_.ant-collapse-item]:!border [&_.ant-collapse-item]:!border-line [&_.ant-collapse-item]:!bg-white"
                  items={s.items.map((i, n) => ({
                    key: String(n),
                    label: <span className="font-semibold text-heading">{i.q}</span>,
                    children: <p className="-mt-2 text-[15px] leading-relaxed">{i.a}</p>,
                  }))}
                />
              </div>
            ))}
            {!shown.length && <p className="rounded-xl bg-white p-6 text-center ring-1 ring-line">No questions match your search.</p>}
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-3 rounded-xl bg-white p-5 ring-1 ring-line sm:flex-row">
            <p className="font-semibold text-heading">Still need help? Our team replies within a few hours.</p>
            <a href={`tel:${company.phoneRaw}`}><Button type="primary">Call {company.phone}</Button></a>
          </div>
        </div>
      </section>
    </>
  )
}
