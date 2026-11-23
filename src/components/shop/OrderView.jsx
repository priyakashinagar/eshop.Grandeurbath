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
