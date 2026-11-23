import { useState } from 'react'
import { Form, Input, Select, Button, App } from 'antd'
import { sendEnquiry } from '../api'

// Saves a contact enquiry, or a bulk quote request when items are passed
export default function LeadForm({ submitText = 'Submit', withMessage = false, onDone, items }) {
  const [form] = Form.useForm()
  const { message } = App.useApp()

  const [sending, setSending] = useState(false)

  const submit = async (v) => {
    setSending(true)
    const res = await sendEnquiry({ ...v, email: v.email || undefined, kind: items?.length ? 'quote' : 'contact', items })
    setSending(false)
    if (!res.ok) {
      message.error(res.message)
      return
    }
    message.success(res.message)
    form.resetFields()
    onDone?.()
  }

  return (
    <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
      <div className="grid sm:grid-cols-2 gap-x-4">
        <Form.Item name="name" label="Full name" rules={[{ required: true, message: 'Please enter your name' }]}>
          <Input placeholder="Your name" />
        </Form.Item>
        <Form.Item
          name="phone"
          label="Mobile number"
          rules={[
            { required: true, message: 'Please enter your number' },
            { pattern: /^[0-9+\s-]{10,15}$/, message: 'Enter a valid number' },
          ]}
        >
          <Input placeholder="+91" />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Enter a valid email' }]}>
          <Input placeholder="name@email.com" />
        </Form.Item>
        <Form.Item name="city" label="City">
          <Input placeholder="Delivery city" />
        </Form.Item>
      </div>
      <Form.Item name="type" label="I am a" initialValue="home">
        <Select
          options={[
            { value: 'home', label: 'Home owner' },
            { value: 'hotel', label: 'Hotel / Resort' },
            { value: 'builder', label: 'Builder / Developer' },
            { value: 'architect', label: 'Architect / Interior designer' },
            { value: 'dealer', label: 'Dealer / Plumber' },
          ]}
        />
      </Form.Item>
      {withMessage && (
        <Form.Item name="message" label="Your requirement">
          <Input.TextArea rows={4} placeholder="Number of bathrooms, products you need, site location" />
        </Form.Item>
      )}
      <Button type="primary" htmlType="submit" size="large" block loading={sending}>
        {submitText}
      </Button>
    </Form>
  )
}
