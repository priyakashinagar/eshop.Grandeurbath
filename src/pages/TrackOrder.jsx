import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Form, Input, Button, Alert } from 'antd'
import { Truck } from 'lucide-react'
import StoreHeading from '../components/shop/StoreHeading'
import { OrderItems, OrderTimeline, StatusTag } from '../components/shop/OrderView'
import { fmtDate } from '../utils/search'
import { useShop } from '../store/shopContext'
import { trackOrder } from '../api'
import { company } from '../data/content'
import { inr } from '../utils/pricing'

export default function TrackOrder() {
  const { orders } = useShop()
  const [result, setResult] = useState(null)
  const [missing, setMissing] = useState('')
  const [loading, setLoading] = useState(false)

  const find = async ({ id, mobile }) => {
    setLoading(true)
    const res = await trackOrder(id.trim().toUpperCase().replace(/^#/, ''), mobile.trim())
    setLoading(false)
    setResult(res.ok ? res.order : null)
    setMissing(res.ok ? '' : res.message)
  }

  return (
    <>
      <StoreHeading title="Track Your Order" crumbs={[{ label: 'Track Order' }]} text="Enter your order ID and the mobile number used at checkout" />
      <section className="bg-cool py-8">
        <div className="container-x grid max-w-5xl gap-6 lg:grid-cols-[360px_1fr]">
          <div className="self-start rounded-xl border border-line bg-white p-5">
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary-50 text-primary-dark"><Truck size={24} /></span>
            <Form layout="vertical" requiredMark={false} onFinish={find}>
              <Form.Item name="id" label="Order ID" rules={[{ required: true, message: 'Please enter your order ID' }]}>
                <Input size="large" placeholder="e.g. GB12345678" />
              </Form.Item>
              <Form.Item name="mobile" label="Mobile number" rules={[{ required: true, message: 'Please enter your mobile number' }, { pattern: /^[6-9][0-9]{9}$/, message: 'Enter a valid 10 digit number' }]}>
                <Input size="large" maxLength={10} inputMode="numeric" prefix={<span className="text-body">+91</span>} />
              </Form.Item>
              <Button type="primary" htmlType="submit" size="large" block loading={loading}>Track order</Button>
            </Form>
            {orders.length > 0 && (
              <p className="mt-4 text-xs">Or see all your orders in <Link to="/orders" className="font-bold text-primary-dark">My Orders</Link></p>
            )}
          </div>

          <div>
            {missing && (
              <Alert
                type="warning"
                showIcon
                title="Order not found"
                description={<>{missing} Need help? Call us at <a href={`tel:${company.phoneRaw}`} className="font-bold">{company.phone}</a>.</>}
              />
            )}
            {result && (
              <div className="rounded-xl border border-line bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-heading">Order #{result.id}</p>
                    <p className="text-sm">Placed on {fmtDate(result.createdAt)} · {inr(result.summary.total)}</p>
                  </div>
                  <StatusTag order={result} />
                </div>
                <div className="mt-6"><OrderTimeline order={result} /></div>
                <div className="mt-6"><OrderItems order={result} /></div>
              </div>
            )}
            {!result && !missing && (
              <div className="grid h-full min-h-[200px] place-items-center rounded-xl border border-dashed border-line bg-white p-6 text-center text-sm">
                Your order status will appear here.
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
