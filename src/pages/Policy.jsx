import { NavLink, useParams } from 'react-router-dom'
import StoreHeading from '../components/shop/StoreHeading'
import NotFound from './NotFound'
import { company } from '../data/content'
import { delivery } from '../data/shop'

// Draft policy text. Have it reviewed before going live.
const policies = {
  privacy: {
    title: 'Privacy Policy',
    sections: [
      ['Information we collect', `When you place an order or create an account we collect your name, mobile number, email, delivery address and GSTIN if you provide it. Payment details are entered on Razorpay's secure page and are never stored by ${company.brand}.`],
      ['How we use it', 'We use your details to process and deliver orders, send order updates, provide support and, if you agree, share offers. We do not sell your personal data.'],
      ['Sharing', 'We share only what is needed with courier partners, payment gateways and tax authorities to complete your order and meet legal requirements.'],
      ['Cookies and storage', 'This website stores your cart, wishlist and preferences in your browser so they are available on your next visit.'],
      ['Your choices', `You can ask us to update or delete your data at any time by writing to ${company.email}.`],
    ],
  },
  terms: {
    title: 'Terms and Conditions',
    sections: [
      ['About these terms', `This website is operated by ${company.legal}. By using the website or placing an order you agree to these terms.`],
      ['Products and prices', 'We try to show accurate product details, images and prices. Colours may vary slightly on screen. All prices are in Indian Rupees and include GST unless stated.'],
      ['Orders', 'An order is confirmed once payment is received or a cash on delivery order is accepted. We may cancel an order if a product is unavailable or a price was listed in error, with a full refund.'],
      ['Warranty', 'Products carry the manufacturer warranty mentioned on the product page, from the date of invoice.'],
      ['Governing law', 'These terms are governed by the laws of India. Courts at Ghaziabad, Uttar Pradesh have jurisdiction.'],
    ],
  },
  shipping: {
    title: 'Shipping and Delivery Policy',
    sections: [
      ['Delivery charges', `Delivery is free on orders above ₹${delivery.freeAbove}. Orders below this have a flat delivery charge of ₹${delivery.charge}.`],
      ['Delivery time', 'Orders are dispatched within 1 to 2 working days. Delhi NCR deliveries take 2 to 3 days and other cities usually 4 to 7 days. Remote areas may take longer.'],
      ['Large items', 'Bathtubs, vanities and water tanks are shipped with special packing. Our team will call you to confirm the delivery date and site access.'],
      ['Inspection', 'Please check the package at delivery. If it is damaged, note it on the delivery slip and contact us within 48 hours with photos.'],
    ],
  },
  'return-refund': {
    title: 'Return and Refund Policy',
    sections: [
      ['Replacement window', 'Damaged, defective or wrong products can be returned or replaced within 7 days of delivery.'],
      ['Conditions', 'The product must be unused, uninstalled and in its original packing with all parts. Products that are installed, cut or custom ordered cannot be returned unless defective.'],
      ['How to request', `Go to My Orders or contact us at ${company.phone} or ${company.email} with your order ID and photos of the product.`],
      ['Refunds', 'After we receive and check the product, refunds are made to the original payment method within 5 to 7 working days. Cash on delivery orders are refunded by bank transfer.'],
    ],
  },
  cancellation: {
    title: 'Cancellation Policy',
    sections: [
      ['Before shipping', 'You can cancel an order from My Orders before it is shipped. Prepaid orders are refunded in full.'],
      ['After shipping', 'Once shipped, an order cannot be cancelled. You can refuse the delivery or request a return as per the Return and Refund Policy.'],
      ['Cancellation by us', 'We may cancel an order if the product is out of stock, the address is not serviceable or payment fails. You will receive a full refund.'],
    ],
  },
}

export default function Policy() {
  const { slug } = useParams()
  const page = policies[slug]
  if (!page) return <NotFound />

  return (
    <>
      <StoreHeading title={page.title} crumbs={[{ label: page.title }]} text={`Last updated: 1 November 2026`} />
      <section className="bg-cool py-8">
        <div className="container-x grid gap-6 lg:grid-cols-[260px_1fr]">
          <nav className="self-start rounded-xl border border-line bg-white p-2 lg:sticky lg:top-[140px]" aria-label="Policies">
            {Object.entries(policies).map(([key, p]) => (
              <NavLink key={key} to={`/policy/${key}`} className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-primary-50 text-primary-dark' : 'text-heading hover:bg-light'}`}>
                {p.title}
              </NavLink>
            ))}
          </nav>
          <article className="rounded-xl border border-line bg-white p-6 md:p-8">
            {page.sections.map(([h, t], i) => (
              <div key={h} className={i ? 'mt-6' : ''}>
                <h2 className="text-lg font-bold">{i + 1}. {h}</h2>
                <p className="mt-2 text-[15px] leading-relaxed">{t}</p>
              </div>
            ))}
            <p className="mt-8 border-t border-line pt-4 text-sm">Questions about this policy? Write to <a href={`mailto:${company.email}`} className="font-bold text-primary-dark">{company.email}</a> or call {company.phone}.</p>
          </article>
        </div>
      </section>
    </>
  )
}
