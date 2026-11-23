import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button, Empty, Collapse, Popconfirm } from 'antd'
import StoreHeading from '../components/shop/StoreHeading'
import ProductImage from '../components/shop/ProductImage'
import { OrderItems, OrderTimeline, StatusTag } from '../components/shop/OrderView'
import { fmtDate } from '../utils/search'
import { orderStage } from '../api'
import { useShop } from '../store/shopContext'
import { inr } from '../utils/pricing'

export default function Orders() {
  const { orders, cancelOrder, user, loadMyOrders } = useShop()

  // Logged-in customers get their latest orders and statuses from the server
  useEffect(() => {
    if (user) loadMyOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return (
    <>
      <StoreHeading title="My Orders" crumbs={[{ label: 'My Orders' }]} text={user ? `Orders placed by ${user.name}` : 'Orders placed from this device'}>
        <Link to="/track-order"><Button>Track an order</Button></Link>
      </StoreHeading>
      <section className="bg-cool py-6 md:py-8">
        <div className="container-x max-w-5xl">
          {!user && orders.length > 0 && (
            <p className="mb-4 rounded-lg bg-primary-50 px-4 py-3 text-sm text-heading">
              <Link to="/login?from=/orders" className="font-bold text-primary-dark">Log in</Link> to see your orders on every device.
            </p>
          )}
          {orders.length === 0 ? (
            <div className="rounded-xl border border-line bg-white py-16">
              <Empty description="You have not placed any orders yet">
                <Link to="/products"><Button type="primary" size="large">Start shopping</Button></Link>
              </Empty>
            </div>
          ) : (
            <Collapse
              className="!border-0 !bg-transparent [&_.ant-collapse-item]:!mb-3 [&_.ant-collapse-item]:overflow-hidden [&_.ant-collapse-item]:!rounded-xl [&_.ant-collapse-item]:!border [&_.ant-collapse-item]:!border-line [&_.ant-collapse-item]:!bg-white"
              expandIconPlacement="end"
              items={orders.map((o) => ({
                key: o.id,
                label: (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <div className="flex -space-x-3">
                      {o.items.slice(0, 3).map((it) => (
                        <ProductImage key={it.id} p={it} width={100} className="h-11 w-11 rounded-lg ring-2 ring-white" />
                      ))}
                    </div>
                    <div>
                      <p className="font-bold text-heading">#{o.id}</p>
                      <p className="text-xs">{fmtDate(o.createdAt)} · {o.items.length} {o.items.length === 1 ? 'item' : 'items'}</p>
                    </div>
                    <p className="font-extrabold text-heading">{inr(o.summary.total)}</p>
                    <StatusTag order={o} />
                  </div>
                ),
                children: (
                  <div className="space-y-5">
                    <OrderTimeline order={o} />
                    <OrderItems order={o} />
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
                      <p>
                        Payment: <b className="text-heading">{o.payment === 'cod' ? 'Cash on delivery' : o.paymentStatus === 'paid' ? 'Razorpay (paid)' : 'Razorpay (pending)'}</b> · Deliver to {o.address.city} {o.address.pincode}
                      </p>
                      <div className="flex gap-2">
                        <Link to={`/order-success/${o.id}`}><Button size="small">Details</Button></Link>
                        {orderStage(o) >= 0 && orderStage(o) < 2 && (
                          <Popconfirm title="Cancel this order?" description="You can cancel before the order is shipped." okText="Cancel order" cancelText="Keep" onConfirm={() => cancelOrder(o.id)}>
                            <Button size="small" danger>Cancel order</Button>
                          </Popconfirm>
                        )}
                      </div>
                    </div>
                  </div>
                ),
              }))}
            />
          )}
        </div>
      </section>
    </>
  )
}
