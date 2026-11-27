import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Result, Spin } from 'antd'
import { FileText } from 'lucide-react'
import StoreHeading from '../components/shop/StoreHeading'
import { OrderItems, OrderTimeline, AfterSaleInfo } from '../components/shop/OrderView'
import ReturnButton from '../components/shop/ReturnButton'
import { useShop } from '../store/shopContext'
import { getOrder, invoiceUrl } from '../api'
import { inr } from '../utils/pricing'

export default function OrderSuccess() {
  const { id } = useParams()
  const { orders, user, updateOrder } = useShop()
  const local = orders.find((o) => o.id === id)
  const [loading, setLoading] = useState(Boolean(user))

  // Refresh from the server: latest status for this device's copy, or the order itself for logged-in customers
  useEffect(() => {
    const mobile = local?.customer?.mobile
    if (!user && !mobile) return
    getOrder(id, user ? undefined : mobile).then((res) => {
      if (res.ok) updateOrder(res.order)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id])

  const order = local
  if (!order && loading) {
    return (
      <section className="container-x grid place-items-center py-20">
        <Spin size="large" />
      </section>
    )
  }

  if (!order) {
    return (
      <section className="container-x py-14">
        <Result status="404" title="Order not found" subTitle="We could not find this order on this device." extra={<Link to="/track-order"><Button type="primary">Track an order</Button></Link>} />
      </section>
    )
  }

  const a = order.address
  return (
    <>
      <StoreHeading title="Order confirmed" crumbs={[{ label: 'Orders', to: '/orders' }, { label: order.id }]} />
      <section className="bg-cool py-8">
        <div className="container-x max-w-4xl">
          <div className="rounded-xl border border-line bg-white p-5 md:p-8">
            <Result
              status="success"
              className="!p-0"
              title={`Thank you, ${order.customer.name.split(' ')[0]}! Your order is placed.`}
              subTitle={
                <>
                  Order ID <b className="text-heading">{order.id}</b> · {order.payment === 'cod' ? 'Cash on delivery' : order.paymentStatus === 'paid' ? 'Paid online via Razorpay' : 'Payment pending'}. Save this order ID to track your order.
                </>
              }
            />
            <div className="mt-6"><OrderTimeline order={order} /></div>
            <div className="mt-4"><AfterSaleInfo order={order} /></div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-1 font-bold text-heading">Items</p>
                <OrderItems order={order} />
              </div>
              <div className="space-y-4">
                <div className="rounded-lg bg-soft p-4 ring-1 ring-line">
                  <p className="font-bold text-heading">Delivery address</p>
                  <p className="mt-1 text-sm">{order.customer.name}, +91 {order.customer.mobile}<br />{a.line1}{a.landmark ? `, ${a.landmark}` : ''}<br />{a.city}, {a.state} {a.pincode}</p>
                </div>
                <div className="rounded-lg bg-soft p-4 ring-1 ring-line text-sm">
                  <p className="flex justify-between"><span>Items total</span><b className="text-heading">{inr(order.summary.subtotal)}</b></p>
                  {order.summary.couponOff > 0 && <p className="flex justify-between text-new"><span>Coupon ({order.coupon})</span><b>− {inr(order.summary.couponOff)}</b></p>}
                  <p className="flex justify-between"><span>Delivery</span><b className="text-heading">{order.summary.shipping ? inr(order.summary.shipping) : 'FREE'}</b></p>
                  <p className="mt-1 flex justify-between border-t border-line pt-1 text-base font-extrabold text-heading"><span>Total</span><span>{inr(order.summary.total)}</span></p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/orders"><Button size="large">View my orders</Button></Link>
              {order.status !== 'payment_pending' && (
                <a href={invoiceUrl(order)} target="_blank" rel="noreferrer"><Button size="large" icon={<FileText size={16} />}>Download invoice</Button></a>
              )}
              <ReturnButton order={order} size="large" />
              <Link to="/products"><Button size="large" type="primary">Continue shopping</Button></Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
