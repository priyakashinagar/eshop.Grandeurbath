import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Form, Input, Button, Radio, Empty, Modal, Spin, Tag, App, Checkbox } from 'antd'
import { UserRound, MapPin, CreditCard, Lock, CheckCircle2, Wallet, Banknote } from 'lucide-react'
import StoreHeading from '../components/shop/StoreHeading'
import ProductImage from '../components/shop/ProductImage'
import OrderSummary, { CouponBox } from '../components/shop/OrderSummary'
import { delivery } from '../data/shop'
import AddressFields from '../components/shop/AddressFields'
import { addressText } from '../utils/search'
import { checkPincode, placeOrder, payWithRazorpay, getAddresses, addAddress } from '../api'
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
  const [payment, setPayment] = useState('razorpay')
  const [placing, setPlacing] = useState(false)
  const [pinInfo, setPinInfo] = useState(pincode)
  const s = summarize(cartRows, coupon)
  const codAllowed = s.total <= delivery.codLimit
  const last = orders[0]?.address
  const lastCustomer = orders[0]?.customer

  // Saved addresses for logged-in customers; the default one is filled in automatically
  const [saved, setSaved] = useState([])
  const [picked, setPicked] = useState('new')
  const [saveNew, setSaveNew] = useState(true)
  const pick = (a) => {
    setPicked(a?._id || 'new')
    if (!a) return
    form.setFieldsValue({ line1: a.line1, landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode, gstin: a.gstin })
    checkPincode(a.pincode).then((res) => res.ok && setPinInfo(res))
  }
  useEffect(() => {
    if (!user) return
    getAddresses().then((res) => {
      if (!res.ok || !res.addresses.length) return
      setSaved(res.addresses)
      pick(res.addresses.find((a) => a.isDefault) || res.addresses[0])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

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

  // Orders and payments need an account; the cart is kept while the customer logs in
  if (!user) {
    return (
      <>
        <StoreHeading title="Checkout" crumbs={[{ label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />
        <section className="bg-cool py-10 md:py-14">
          <div className="container-x">
            <div className="mx-auto max-w-lg rounded-2xl border border-line bg-white p-6 text-center md:p-8">
              <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-primary-dark"><Lock size={26} /></span>
              <h2 className="text-xl font-bold md:text-2xl">Log in to continue to payment</h2>
              <p className="mt-2 text-sm">Please log in or create an account to place your order. Your cart ({s.count} {s.count === 1 ? 'item' : 'items'}, {inr(s.total)}) is saved.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Link to="/login?from=/checkout"><Button type="primary" size="large" block>Login</Button></Link>
                <Link to="/login?tab=signup&from=/checkout"><Button size="large" block>Create account</Button></Link>
              </div>
              <Link to="/cart" className="mt-4 inline-block text-sm font-bold text-primary-dark">Back to cart</Link>
            </div>
          </div>
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
      if (res.status === 401) navigate('/login?from=/checkout') // session expired
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
    if (user && picked === 'new' && saveNew) {
      addAddress({ label: saved.length ? 'Other' : 'Home', line1: v.line1, landmark: v.landmark || undefined, city: v.city, state: v.state, pincode: v.pincode, gstin: v.gstin || undefined })
    }
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
            <Step n={1} icon={UserRound} title="Account" done>
              <p className="text-sm text-heading">Logged in as <b>{user.name}</b> ({user.mobile || user.email})</p>
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
              </div>

              {saved.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-sm font-bold text-heading">Deliver to a saved address</p>
                  <Radio.Group value={picked} onChange={(e) => pick(saved.find((x) => x._id === e.target.value))} className="!grid w-full gap-2 sm:!grid-cols-2">
                    {saved.map((a) => (
                      <Radio key={a._id} value={a._id} className={`!m-0 rounded-lg !p-3 ring-1 ${picked === a._id ? 'bg-primary-50 ring-primary' : 'ring-line'}`}>
                        <span className="font-bold text-heading">{a.label}{a.isDefault ? ' (default)' : ''}</span>
                        <span className="block text-xs">{addressText(a)}</span>
                      </Radio>
                    ))}
                    <Radio value="new" className={`!m-0 rounded-lg !p-3 ring-1 ${picked === 'new' ? 'bg-primary-50 ring-primary' : 'ring-line'}`}>
                      <span className="font-bold text-heading">Use a new address</span>
                    </Radio>
                  </Radio.Group>
                </div>
              )}

              <AddressFields onPincodeChange={onPin} pincodeExtra={pinInfo && <span className="text-xs font-semibold text-new">Delivery by {pinInfo.eta} to {pinInfo.city}</span>} />
              {user && picked === 'new' && (
                <Checkbox checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} className="!text-sm">Save this address to my account</Checkbox>
              )}
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
              {delivery.paymentMode === 'test' && (
                <p className="mt-3 rounded-lg bg-[#FFF7E6] px-3 py-2 text-xs text-heading ring-1 ring-[#FFE1A8]">
                  <b>Razorpay test mode:</b> no real money is charged. Use Razorpay's test cards or test UPI ID from the Razorpay docs (Test Card Details).
                </p>
              )}
              {delivery.paymentMode === 'mock' && <p className="mt-3 text-xs">Razorpay keys are not set on the server yet, so online payment is simulated.</p>}
              {delivery.paymentMode === 'live' && <p className="mt-3 text-xs">Payments are processed securely by Razorpay. Your card details are never stored on our servers.</p>}
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
