import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/effect-fade'
import 'swiper/css/effect-coverflow'
import './index.css'
import { setCatalog, setStoreContent } from './data/shop'
import { setSiteContent } from './data/content'
import { getProducts, getStorefront } from './api'

// Before the app renders: load the products the admin allows on the website, and everything else the
// admin manages (categories, brands, banners, coupons, store settings, company details, FAQs, policies,
// testimonials, page sections). Whatever fails keeps the built-in sample data.
const [products, storefront] = await Promise.allSettled([getProducts(), getStorefront()])

if (products.status === 'fulfilled') setCatalog(products.value)
else {
  console.warn('Products API not reachable, showing sample products.', products.reason)
  setCatalog(null)
}
const sf = storefront.status === 'fulfilled' && storefront.value.ok ? storefront.value : null
if (sf) {
  setStoreContent({ categories: sf.categories, brands: sf.brands, banners: sf.banners, settings: sf.settings, coupons: sf.coupons, combos: sf.content?.combos })
  setSiteContent(sf.content)
}

const { default: App } = await import('./App.jsx')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
