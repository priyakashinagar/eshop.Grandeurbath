import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Tabs, Form, Input, Button, Modal, Popconfirm, Empty, Tag, App } from 'antd'
import { MapPin, Plus, Pencil, Trash2, Package, Heart } from 'lucide-react'
import StoreHeading from '../components/shop/StoreHeading'
import AddressFields from '../components/shop/AddressFields'
import { addressText } from '../utils/search'
import * as api from '../api'
import { useShop } from '../store/shopContext'

function Profile() {
  const { user, setUser } = useShop()
  const { message } = App.useApp()
  const [saving, setSaving] = useState(false)

  const save = async (v) => {
    setSaving(true)
    const res = await api.updateMe({ name: v.name, email: v.email })
    setSaving(false)
    if (!res.ok) return message.error(res.message)
    setUser(res.user)
    message.success('Profile updated')
  }

  return (
    <Form layout="vertical" requiredMark={false} onFinish={save} initialValues={{ name: user.name, email: user.email, mobile: user.mobile }} className="max-w-lg">
      <Form.Item name="name" label="Full name" rules={[{ required: true, min: 2, message: 'Please enter your name' }]}>
        <Input size="large" autoComplete="name" />
      </Form.Item>
      <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Please enter your email' }, { type: 'email', message: 'Enter a valid email' }]}>
        <Input size="large" autoComplete="email" />
      </Form.Item>
      <Form.Item name="mobile" label="Mobile number" extra="Mobile number cannot be changed. Call support if you need to update it.">
        <Input size="large" disabled prefix={<span className="text-body">+91</span>} />
      </Form.Item>
      <Button type="primary" htmlType="submit" size="large" loading={saving}>Save changes</Button>
    </Form>
  )
}

function Addresses() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [list, setList] = useState(null)
  const [editing, setEditing] = useState(null) // null = closed, {} = new, address = edit
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getAddresses().then((res) => setList(res.ok ? res.addresses : []))
  }, [])

  const open = (a) => {
    setEditing(a)
    form.setFieldsValue(a._id ? a : { label: 'Home', line1: undefined, landmark: undefined, city: undefined, state: undefined, pincode: undefined, gstin: undefined })
  }

  const save = async (v) => {
    setSaving(true)
    const body = { ...v, landmark: v.landmark || undefined, gstin: v.gstin || undefined }
    const res = editing._id ? await api.updateAddress(editing._id, body) : await api.addAddress(body)
    setSaving(false)
    if (!res.ok) return message.error(res.message)
    setList(res.addresses)
    setEditing(null)
    message.success('Address saved')
  }

  const act = async (promise, text) => {
    const res = await promise
    if (!res.ok) return message.error(res.message)
    setList(res.addresses)
    message.success(text)
  }

  if (!list) return <p className="text-sm">Loading addresses...</p>

  return (
    <div>
      <Button type="primary" icon={<Plus size={16} />} onClick={() => open({})} disabled={list.length >= 10}>Add new address</Button>
      {list.length === 0 ? (
        <Empty className="!mt-8" description="No saved addresses yet. Add one for faster checkout." />
      ) : (
        <ul className="m-0 mt-4 grid list-none gap-3 p-0 md:grid-cols-2">
          {list.map((a) => (
            <li key={a._id} className={`rounded-xl p-4 ring-1 ${a.isDefault ? 'bg-primary-50 ring-primary-200' : 'ring-line'}`}>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-primary-dark" />
                <p className="font-bold text-heading">{a.label}</p>
                {a.isDefault && <Tag color="gold" className="!m-0">Default</Tag>}
              </div>
              <p className="mt-1.5 text-sm">{addressText(a)}</p>
              {a.gstin && <p className="text-xs">GSTIN {a.gstin}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="small" icon={<Pencil size={13} />} onClick={() => open(a)}>Edit</Button>
                {!a.isDefault && <Button size="small" onClick={() => act(api.updateAddress(a._id, { isDefault: true }), 'Default address changed')}>Make default</Button>}
                <Popconfirm title="Delete this address?" okText="Delete" onConfirm={() => act(api.deleteAddress(a._id), 'Address deleted')}>
                  <Button size="small" danger icon={<Trash2 size={13} />}>Delete</Button>
                </Popconfirm>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!editing} title={editing?._id ? 'Edit address' : 'Add address'} onCancel={() => setEditing(null)} footer={null} destroyOnHidden width={620}>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={save} preserve={false}>
          <AddressFields withLabel />
          <Button type="primary" htmlType="submit" size="large" block loading={saving}>Save address</Button>
        </Form>
      </Modal>
    </div>
  )
}

function Password() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const save = async (v) => {
    setSaving(true)
    const res = await api.changePassword(v.currentPassword, v.newPassword)
    setSaving(false)
    if (!res.ok) return message.error(res.message)
    form.resetFields()
    message.success('Password changed')
  }

  return (
    <Form form={form} layout="vertical" requiredMark={false} onFinish={save} className="max-w-lg">
      <Form.Item name="currentPassword" label="Current password" rules={[{ required: true, message: 'Please enter your current password' }]}>
        <Input.Password size="large" autoComplete="current-password" />
      </Form.Item>
      <Form.Item name="newPassword" label="New password" rules={[{ required: true, min: 6, message: 'Use at least 6 characters' }]}>
        <Input.Password size="large" autoComplete="new-password" />
      </Form.Item>
      <Button type="primary" htmlType="submit" size="large" loading={saving}>Change password</Button>
      <p className="mt-3 text-sm">Forgot it? <Link to="/forgot-password" className="font-bold text-primary-dark">Reset by email</Link></p>
    </Form>
  )
}

export default function Account() {
  const { user } = useShop()
  const [params, setParams] = useSearchParams()
  if (!user) return <Navigate to="/login?from=/account" replace />
  const tab = ['profile', 'addresses', 'password'].includes(params.get('tab')) ? params.get('tab') : 'profile'

  return (
    <>
      <StoreHeading title="My Account" crumbs={[{ label: 'My Account' }]} text={`Logged in as ${user.name}`}>
        <div className="flex gap-2">
          <Link to="/orders"><Button icon={<Package size={15} />}>My orders</Button></Link>
          <Link to="/wishlist"><Button icon={<Heart size={15} />}>Wishlist</Button></Link>
        </div>
      </StoreHeading>
      <section className="bg-cool py-6 md:py-8">
        <div className="container-x max-w-4xl">
          <div className="rounded-xl border border-line bg-white p-5 md:p-7">
            <Tabs
              activeKey={tab}
              onChange={(k) => setParams({ tab: k }, { replace: true })}
              items={[
                { key: 'profile', label: 'Profile', children: <Profile /> },
                { key: 'addresses', label: 'Saved addresses', children: <Addresses /> },
                { key: 'password', label: 'Password', children: <Password /> },
              ]}
            />
          </div>
        </div>
      </section>
    </>
  )
}
