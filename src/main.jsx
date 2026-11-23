import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/effect-fade'
import 'swiper/css/effect-coverflow'
import './index.css'
import { setCatalog } from './data/shop'
import { getProducts } from './api'

// Load the products the admin allows on the website before the app renders,
// so every page works with one ready list. Falls back to dummy data if the API is down.
try {
  setCatalog(await getProducts())
} catch (err) {
  console.warn('Products API not reachable, showing sample products.', err)
  setCatalog(null)
}

const { default: App } = await import('./App.jsx')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
