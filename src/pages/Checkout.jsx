import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Form, Input, Select, Button, Radio, Empty, Modal, Spin, Tag, App } from 'antd'
import { UserRound, MapPin, CreditCard, Lock, CheckCircle2, Wallet, Banknote } from 'lucide-react'
import StoreHeading from '../components/shop/StoreHeading'
import ProductImage from '../components/shop/ProductImage'
import OrderSummary, { CouponBox } from '../components/shop/OrderSummary'
import { indianStates, delivery } from '../data/shop'
import { checkPincode, placeOrder, payWithRazorpay } from '../api'
import { useShop } from '../store/shopContext'
import { inr, summarize } from '../utils/pricing'

function Step({ n, icon: Icon, title, done, children, extra }) {
  return (
    <div className="rounded-xl border border-line bg-white">
      <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-extrabold ${done ? 'bg-new text-white' : 'bg-primary text-white'}`}>
          {done ? <CheckCircle2 size={16} /> : n}
        </span>
        <p className="flex flex-1 items-center gap-2 font-bold text-heading"><Icon size={17} className="text-body" /> {title}</p>
        {extra}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

const payOptions = [
  { value: 'razorpay', title: 'Pay online with Razorpay', text: 'UPI, debit card, credit card, net banking and wallets', icon: CreditCard, tags: ['UPI', 'Cards', 'Net Banking', 'Wallets'] },
  { value: 'cod', title: 'Cash on delivery', text: 'Pay in cash or UPI when the order arrives', icon: Banknote },
]

export default function Checkout() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { cartRows, coupon, clearCart, user, orders, addOrder, pincode, setPincode } = useShop()
  const [mode, setMode] = useState(user ? 'user' : 'guest')
  const [payment, setPayment] = useState('razorpay')
  const [placing, setPlacing] = useState(false)
  const [pinInfo, setPinInfo] = useState(pincode)
  const s = summarize(cartRows, coupon)
  const codAllowed = s.total <= delivery.codLimit
  const last = orders[0]?.address
  const lastCustomer = orders[0]?.customer

  if (!cartRows.length) {
    return (
      <>
        <StoreHeading title="Checkout" crumbs={[{ label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />
        <section className="container-x py-14">
          <Empty description="Your cart is empty, add products to checkout">
            <Link to="/products"><Button type="primary" size="large">Browse products</Button></Link>
          </Empty>
        </section>
      </>
    )
  }

  const onPin = async (e) => {
    const value = e.target.value
    if (value.length !== 6) return
    const res = await checkPincode(value)
    if (res.ok) {
      setPinInfo(res)
      setPincode(res)
    }
  }

  const submit = async (v) => {
    setPlacing(true)
    // Only ids and quantities are sent; the server works out prices, coupon and stock itself
    const res = await placeOrder({
      customer: { name: v.name, mobile: v.mobile, email: v.email },
      address: { line1: v.line1, landmark: v.landmark || undefined, city: v.city, state: v.state, pincode: v.pincode, gstin: v.gstin || undefined },
      items: cartRows.map(({ product: p, qty }) => ({ id: p.id, qty })),
      coupon: s.couponOff ? coupon : '',
      payment: codAllowed ? payment : 'razorpay',
    })
    if (!res.ok) {
      setPlacing(false)
      message.error(res.message)
      return
    }

    let order = res.order
    if (res.razorpay) {
      if (!res.razorpay.testMode) setPlacing(false) // Razorpay shows its own window
      const paid = await payWithRazorpay(order, res.razorpay)
      if (!paid.ok) {
        setPlacing(false)
        message.warning(paid.message) // cart is kept so the customer can try again
        return
      }
      order = paid.order
    }

    setPlacing(false)
    addOrder(order)
    clearCart()
    navigate(`/order-success/${order.id}`, { replace: true })
  }


  return (
    <>
      <StoreHeading title="Checkout" crumbs={[{ label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />

      <section className="bg-cool py-6 md:py-8">
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={submit}
          scrollToFirstError={{ behavior: 'smooth', block: 'center' }}
          initialValues={{
            name: user?.name || lastCustomer?.name,
            mobile: user?.mobile || lastCustomer?.mobile,
            email: user?.email || lastCustomer?.email,
            line1: last?.line1,
            landmark: last?.landmark,
            city: last?.city || (pincode ? pincode.city.split(' / ')[0] : undefined),
            state: last?.state,
            pincode: last?.pincode || pincode?.pincode,
          }}
          className="container-x grid gap-6 lg:grid-cols-[1fr_400px]"
        >
          <div className="space-y-4">
            <Step n={1} icon={UserRound} title="Login or guest checkout" done={!!user || mode === 'guest'}>
              {user ? (
                <p className="text-sm text-heading">Logged in as <b>{user.name}</b> ({user.mobile || user.email})</p>
              ) : (
                <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} className="!grid gap-3 sm:!grid-cols-2">
                  <Radio value="guest" className="!m-0 rounded-lg !p-3 ring-1 ring-line">
                    <span className="font-bold text-heading">Continue as guest</span>
                    <span className="block text-xs">No account needed</span>
                  </Radio>
                  <Radio value="login" className="!m-0 rounded-lg !p-3 ring-1 ring-line" onClick={() => navigate('/login?from=/checkout')}>
                    <span className="font-bold text-heading">Login / Sign up</span>
                    <span className="block text-xs">Track orders and save addresses</span>
                  </Radio>
                </Radio.Group>
              )}
            </Step>

            <Step n={2} icon={MapPin} title="Contact and delivery address">
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Form.Item name="name" label="Full name" rules={[{ required: true, message: 'Please enter your name' }]}>
                  <Input size="large" placeholder="Your full name" autoComplete="name" />
                </Form.Item>
                <Form.Item name="mobile" label="Mobile number" rules={[{ required: true, message: 'Please enter your mobile number' }, { pattern: /^[6-9][0-9]{9}$/, message: 'Enter a valid 10 digit mobile number' }]}>
                  <Input size="large" prefix={<span className="text-body">+91</span>} maxLength={10} inputMode="numeric" placeholder="10 digit number" autoComplete="tel-national" />
                </Form.Item>
                <Form.Item name="email" label="Email" className="sm:col-span-2" rules={[{ required: true, message: 'Please enter your email' }, { type: 'email', message: 'Enter a valid email' }]}>
                  <Input size="large" placeholder="For order updates and invoice" autoComplete="email" />
                </Form.Item>
                <Form.Item name="line1" label="Address (house no, building, street, area)" className="sm:col-span-2" rules={[{ required: true, message: 'Please enter your address' }]}>
                  <Input.TextArea rows={2} placeholder="Flat / house no, building, street, area" autoComplete="street-address" />
                </Form.Item>
                <Form.Item name="landmark" label="Landmark (optional)">
                  <Input size="large" placeholder="Near..." />
                </Form.Item>
                <Form.Item name="pincode" label="Pincode" rules={[{ required: true, message: 'Please enter pincode' }, { pattern: /^[1-9][0-9]{5}$/, message: 'Enter a valid 6 digit pincode' }]} extra={pinInfo && <span className="text-xs font-semibold text-new">Delivery by {pinInfo.eta} to {pinInfo.city}</span>}>
                  <Input size="large" maxLength={6} inputMode="numeric" placeholder="6 digit pincode" onChange={onPin} autoComplete="postal-code" />
                </Form.Item>
                <Form.Item name="city" label="City" rules={[{ required: true, message: 'Please enter city' }]}>
                  <Input size="large" placeholder="City" autoComplete="address-level2" />
                </Form.Item>
                <Form.Item name="state" label="State" rules={[{ required: true, message: 'Please select state' }]}>
                  <Select size="large" showSearch placeholder="Select state" options={indianStates.map((x) => ({ value: x, label: x }))} />
                </Form.Item>
                <Form.Item name="gstin" label="GSTIN (optional, for business invoice)" className="sm:col-span-2" rules={[{ pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, message: 'Enter a valid 15 character GSTIN' }]} normalize={(v) => v?.toUpperCase()}>
                  <Input size="large" maxLength={15} placeholder="22AAAAA0000A1Z5" />
                </Form.Item>
              </div>
            </Step>

            <Step n={3} icon={Wallet} title="Payment method" extra={<span className="flex items-center gap-1 text-xs font-semibold text-new"><Lock size={13} /> Secure</span>}>
              <Radio.Group value={codAllowed ? payment : 'razorpay'} onChange={(e) => setPayment(e.target.value)} className="!grid w-full gap-3">
                {payOptions.map((o) => {
                  const disabled = o.value === 'cod' && !codAllowed
                  return (
                    <Radio key={o.value} value={o.value} disabled={disabled} className={`!m-0 w-full rounded-lg !p-4 ring-1 ${payment === o.value && !disabled ? 'ring-primary bg-primary-50' : 'ring-line'}`}>
                      <span className="flex items-center gap-2 font-bold text-heading"><o.icon size={18} /> {o.title}</span>
                      <span className="block text-xs">{disabled ? `Not available for orders above ${inr(delivery.codLimit)}` : o.text}</span>
                      {o.tags && (
                        <span className="mt-2 flex flex-wrap gap-1">
                          {o.tags.map((t) => <Tag key={t} className="!m-0 !text-[11px] !font-bold">{t}</Tag>)}
                        </span>
                      )}
                    </Radio>
                  )
                })}
              </Radio.Group>
              <p className="mt-3 text-xs">Payments are processed securely by Razorpay. Until live Razorpay keys are added on the server, online payment runs in test mode.</p>
            </Step>
          </div>

          <div className="space-y-4 lg:sticky lg:top-[140px] lg:self-start">
            <div className="rounded-xl border border-line bg-white p-5">
              <p className="mb-3 font-bold text-heading">Order summary</p>
              <ul className="m-0 max-h-64 list-none space-y-3 overflow-y-auto p-0">
                {cartRows.map(({ product: p, qty }) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <ProductImage p={p} width={120} className="h-14 w-14 shrink-0 rounded-lg ring-1 ring-line" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-heading">{p.name}</p>
                      <p className="text-xs">Qty {qty} × {inr(p.price)}</p>
                    </div>
                    <p className="text-sm font-bold text-heading">{inr(p.price * qty)}</p>
                  </li>
                ))}
              </ul>
              <Link to="/cart" className="mt-3 inline-block text-xs font-bold text-primary-dark">Edit cart</Link>
              <div className="mt-4 border-t border-line pt-4">
                <CouponBox subtotal={s.subtotal} />
              </div>
            </div>
            <OrderSummary s={s}>
              <Button type="primary" size="large" block htmlType="submit" loading={placing} className="!mt-4" icon={<Lock size={16} />}>
                {payment === 'cod' && codAllowed ? 'Place order' : `Pay ${inr(s.total)} and place order`}
              </Button>
              <p className="mt-2 text-center text-xs">By placing the order you agree to our <Link to="/policy/terms" className="font-bold text-primary-dark">Terms</Link> and <Link to="/policy/return-refund" className="font-bold text-primary-dark">Return policy</Link></p>
            </OrderSummary>
          </div>
        </Form>
      </section>

      <Modal open={placing} footer={null} closable={false} centered width={360}>
        <div className="py-6 text-center">
          <Spin size="large" />
          <p className="mt-4 font-bold text-heading">{payment === 'cod' ? 'Placing your order...' : 'Processing payment...'}</p>
          <p className="text-sm">Please do not close or refresh this page</p>
        </div>
      </Modal>
    </>
  )
}
