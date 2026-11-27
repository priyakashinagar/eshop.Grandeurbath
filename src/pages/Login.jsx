import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Tabs, Form, Input, Button, Alert, App } from 'antd'
import { Package, Heart, Truck, BadgePercent } from 'lucide-react'
import { login, signup } from '../api'
import { useShop } from '../store/shopContext'

const perks = [
  { icon: Package, text: 'Track all your orders in one place' },
  { icon: Heart, text: 'Save products to your wishlist' },
  { icon: Truck, text: 'Faster checkout with saved details' },
  { icon: BadgePercent, text: 'Member-only offers and coupons' },
]

export default function Login() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [params] = useSearchParams()
  const { user, signIn } = useShop()
  const [tab, setTab] = useState(params.get('tab') === 'signup' ? 'signup' : 'login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const from = params.get('from') || '/'

  if (user) return <Navigate to={from} replace />

  const done = (res, text) => {
    setLoading(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    signIn(res.user)
    message.success(text)
    navigate(from, { replace: true })
  }

  const loginForm = (
    <Form layout="vertical" requiredMark={false} onFinish={async (v) => { setLoading(true); setError(''); done(await login(v), 'Welcome back!') }}>
      <Form.Item name="id" label="Mobile number or email" rules={[{ required: true, message: 'Please enter your mobile number or email' }]}>
        <Input size="large" placeholder="10 digit mobile or email" autoComplete="username" />
      </Form.Item>
      <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Please enter your password' }]}>
        <Input.Password size="large" placeholder="Your password" autoComplete="current-password" />
      </Form.Item>
      <p className="-mt-3 mb-4 text-right text-sm"><Link to="/forgot-password" className="font-bold text-primary-dark">Forgot password?</Link></p>
      <Button type="primary" size="large" htmlType="submit" block loading={loading}>Login</Button>
      <p className="mt-4 text-center text-sm">
        New here? <button type="button" onClick={() => { setTab('signup'); setError('') }} className="cursor-pointer font-bold text-primary-dark">Create an account</button>
      </p>
    </Form>
  )

  const signupForm = (
    <Form layout="vertical" requiredMark={false} onFinish={async (v) => { setLoading(true); setError(''); done(await signup(v), 'Account created. Welcome!') }}>
      <Form.Item name="name" label="Full name" rules={[{ required: true, message: 'Please enter your name' }]}>
        <Input size="large" placeholder="Your full name" autoComplete="name" />
      </Form.Item>
      <Form.Item name="mobile" label="Mobile number" rules={[{ required: true, message: 'Please enter your mobile number' }, { pattern: /^[6-9][0-9]{9}$/, message: 'Enter a valid 10 digit mobile number' }]}>
        <Input size="large" maxLength={10} inputMode="numeric" prefix={<span className="text-body">+91</span>} autoComplete="tel-national" />
      </Form.Item>
      <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Please enter your email' }, { type: 'email', message: 'Enter a valid email' }]}>
        <Input size="large" placeholder="name@email.com" autoComplete="email" />
      </Form.Item>
      <Form.Item name="password" label="Password" rules={[{ required: true, min: 6, message: 'Use at least 6 characters' }]}>
        <Input.Password size="large" placeholder="Create a password" autoComplete="new-password" />
      </Form.Item>
      <Button type="primary" size="large" htmlType="submit" block loading={loading}>Create account</Button>
      <p className="mt-4 text-center text-sm">
        Already have an account? <button type="button" onClick={() => { setTab('login'); setError('') }} className="cursor-pointer font-bold text-primary-dark">Login</button>
      </p>
    </Form>
  )

  return (
    <section className="bg-cool py-10 md:py-14">
      <div className="container-x">
        <div className="mx-auto grid max-w-4xl overflow-hidden rounded-2xl border border-line bg-white md:grid-cols-2">
          <div className="hidden flex-col justify-between bg-gradient-to-br from-primary to-primary-dark p-8 text-white md:flex">
            <div>
              <h1 className="text-3xl font-extrabold !text-white">{tab === 'login' ? 'Welcome back' : 'Join us today'}</h1>
              <p className="mt-2 text-white/85">Login to manage orders, wishlist and faster checkout.</p>
            </div>
            <ul className="m-0 list-none space-y-4 p-0">
              {perks.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 font-semibold">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"><Icon size={19} /></span>
                  {text}
                </li>
              ))}
            </ul>
            <p className="text-xs text-white/75">An account is needed to place orders. Signing up takes less than a minute.</p>
          </div>
          <div className="p-6 md:p-8">
            <Tabs
              activeKey={tab}
              onChange={(k) => { setTab(k); setError('') }}
              items={[
                { key: 'login', label: 'Login', children: loginForm },
                { key: 'signup', label: 'Sign up', children: signupForm },
              ]}
            />
            {error && <Alert type="error" showIcon title={error} className="!mt-4" />}
          </div>
        </div>
      </div>
    </section>
  )
}
