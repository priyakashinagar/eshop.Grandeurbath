import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import Header from './components/Header'
import Footer from './components/Footer'
import QuoteProvider from './components/QuoteProvider'
import WhatsAppButton from './components/WhatsAppButton'
import ShopProvider from './store/ShopProvider'
import PincodeModal from './components/shop/PincodeModal'
import MobileTabBar from './components/shop/MobileTabBar'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import Orders from './pages/Orders'
import TrackOrder from './pages/TrackOrder'
import Login from './pages/Login'
import Account from './pages/Account'
import { ForgotPassword, ResetPassword } from './pages/PasswordReset'
import Wishlist from './pages/Wishlist'
import Compare from './pages/Compare'
import FaqPage from './pages/FaqPage'
import Policy from './pages/Policy'
import Hospitality from './pages/Hospitality'
import About from './pages/About'
import Contact from './pages/Contact'
import NotFound from './pages/NotFound'

// Layout follows plantex.in, colours follow the gold Grandeur Bath logo
const theme = {
  token: {
    colorPrimary: '#AE7714',
    colorInfo: '#AE7714',
    colorSuccess: '#0D9D00',
    colorError: '#DB0000',
    colorWarning: '#E95200',
    colorLink: '#8A5C0B',
    colorTextBase: '#1C1C1C',
    colorBgSpotlight: '#161412',
    colorBorder: '#E5E5E5',
    fontFamily: '"DM Sans", sans-serif',
    borderRadius: 8,
    controlHeight: 40,
    controlHeightLG: 46,
    fontSizeLG: 15,
  },
  components: {
    Button: {
      fontWeight: 700,
      paddingInlineLG: 22,
      primaryShadow: 'none',
      defaultShadow: 'none',
    },
    Collapse: { headerBg: '#ffffff' },
    Tabs: { titleFontSizeLG: 16 },
    Segmented: { itemSelectedBg: '#161412', itemSelectedColor: '#E6C46E' },
  },
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <StyleProvider layer>
      <ConfigProvider theme={theme}>
        <AntApp>
          <ShopProvider>
            <QuoteProvider>
              <ScrollToTop />
              <Header />
              <main className="min-h-[50vh]">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/offers" element={<Products key="offers" preset="offers" />} />
                  <Route path="/new-arrivals" element={<Products key="new" preset="new" />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/order-success/:id" element={<OrderSuccess />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/track-order" element={<TrackOrder />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/wishlist" element={<Wishlist />} />
                  <Route path="/compare" element={<Compare />} />
                  <Route path="/faq" element={<FaqPage />} />
                  <Route path="/policy/:slug" element={<Policy />} />
                  {/* Standard policy URLs that payment gateways (Razorpay) and customers look for */}
                  <Route path="/privacy-policy" element={<Policy slug="privacy" />} />
                  <Route path="/terms-and-conditions" element={<Policy slug="terms" />} />
                  <Route path="/terms" element={<Policy slug="terms" />} />
                  <Route path="/refund-policy" element={<Policy slug="return-refund" />} />
                  <Route path="/return-policy" element={<Policy slug="return-refund" />} />
                  <Route path="/cancellation-policy" element={<Policy slug="cancellation" />} />
                  <Route path="/cancellation-and-refund" element={<Policy slug="return-refund" />} />
                  <Route path="/shipping-policy" element={<Policy slug="shipping" />} />
                  <Route path="/contact-us" element={<Contact />} />
                  <Route path="/about-us" element={<About />} />
                  <Route path="/hospitality" element={<Hospitality />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
              <div className="h-16 lg:hidden" aria-hidden />
              <MobileTabBar />
              <WhatsAppButton />
              <PincodeModal />
            </QuoteProvider>
          </ShopProvider>
        </AntApp>
      </ConfigProvider>
    </StyleProvider>
  )
}
