import { Steps, Tag } from 'antd'
import { orderStages, orderStage } from '../../api'
import ProductImage from './ProductImage'
import { inr } from '../../utils/pricing'
import { fmtDate } from '../../utils/search'

export function StatusTag({ order }) {
  const stage = orderStage(order)
  if (stage < 0) return <Tag color="red" className="!m-0 !font-bold">Cancelled</Tag>
  const colors = ['blue', 'cyan', 'geekblue', 'orange', 'green']
  return <Tag color={colors[stage]} className="!m-0 !font-bold">{orderStages[stage]}</Tag>
}

export function OrderTimeline({ order }) {
  const stage = orderStage(order)
  if (stage < 0) {
    return <p className="rounded-lg bg-[#FFF1F0] px-4 py-3 text-sm font-semibold text-sale">This order was cancelled on {fmtDate(order.cancelledAt || order.createdAt)}. Any online payment is refunded in 5 to 7 working days.</p>
  }
  return (
    <Steps
      size="small"
      current={stage}
      responsive
      items={orderStages.map((t, i) => ({ title: t, content: i === 0 ? fmtDate(order.createdAt) : undefined }))}
    />
  )
}

export function OrderItems({ order }) {
  return (
    <ul className="m-0 list-none divide-y divide-line p-0">
      {order.items.map((it) => (
        <li key={it.id} className="flex items-center gap-3 py-3">
          <ProductImage p={it} width={120} className="h-14 w-14 shrink-0 rounded-lg ring-1 ring-line" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-sm font-semibold text-heading">{it.name}</p>
            <p className="text-xs">{it.brand} · Qty {it.qty}</p>
          </div>
          <p className="text-sm font-bold text-heading">{inr(it.price * it.qty)}</p>
        </li>
      ))}
    </ul>
  )
}

const returnLabels = { requested: 'Return requested', approved: 'Return approved', rejected: 'Return rejected', received: 'Return received', refunded: 'Refunded' }
const returnColors = { requested: 'orange', approved: 'blue', rejected: 'red', received: 'cyan', refunded: 'green' }

// Return and refund progress after delivery or cancellation
export function AfterSaleInfo({ order }) {
  const rr = order.returnRequest
  const rf = order.refund
  if (!rr?.status && !rf?.status) return null
  return (
    <div className="space-y-1 rounded-lg bg-soft px-4 py-3 text-sm ring-1 ring-line">
      {rr?.status && (
        <p className="flex flex-wrap items-center gap-2">
          <Tag color={returnColors[rr.status]} className="!m-0 !font-bold">{returnLabels[rr.status]}</Tag>
          <span>{rr.adminNote || rr.details}</span>
        </p>
      )}
      {rf?.status && (
        <p>
          Refund of <b className="text-heading">{inr(rf.amount)}</b>: {rf.status === 'processed' ? 'processed. It reaches your account in 5 to 7 working days.' : rf.status === 'failed' ? 'could not be completed automatically. Our team will process it manually.' : 'in progress.'}
        </p>
      )}
    </div>
  )
}
