import { useState } from 'react'
import { Button, Modal, Form, Select, Input, App } from 'antd'
import { RotateCcw } from 'lucide-react'
import { requestReturn } from '../../api'
import { useShop } from '../../store/shopContext'
import { delivery } from '../../data/shop'

const reasons = [
  { value: 'damaged', label: 'Product arrived damaged' },
  { value: 'defective', label: 'Product is defective or not working' },
  { value: 'wrong_item', label: 'Received a wrong item' },
  { value: 'missing_parts', label: 'Parts are missing' },
  { value: 'other', label: 'Other reason' },
]

// Shown on delivered orders without a return request
export default function ReturnButton({ order, size = 'small' }) {
  const { message } = App.useApp()
  const { updateOrder } = useShop()
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  if (order.status !== 'delivered' || order.returnRequest?.status) return null

  const submit = async (v) => {
    setSending(true)
    const res = await requestReturn(order.id, order.customer.mobile, v)
    setSending(false)
    if (!res.ok) return message.error(res.message)
    updateOrder(res.order)
    setOpen(false)
    message.success(res.message)
  }

  return (
    <>
      <Button size={size} icon={<RotateCcw size={14} />} onClick={() => setOpen(true)}>Return</Button>
      <Modal open={open} title={`Return order #${order.id}`} onCancel={() => setOpen(false)} footer={null} destroyOnHidden>
        <p className="mb-4 text-sm">Returns are accepted within {delivery.returnDays} days of delivery for damaged, defective or wrong items. Keep the product in its original packing.</p>
        <Form layout="vertical" requiredMark={false} onFinish={submit}>
          <Form.Item name="reason" label="Reason" rules={[{ required: true, message: 'Please choose a reason' }]}>
            <Select options={reasons} placeholder="Choose a reason" />
          </Form.Item>
          <Form.Item name="details" label="What is the problem?" rules={[{ required: true, min: 10, message: 'Please describe the problem in a few words' }]}>
            <Input.TextArea rows={3} placeholder="For example: the basin has a crack on the left side" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={sending}>Request return</Button>
        </Form>
      </Modal>
    </>
  )
}
