import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Form, Input, Button, Result, Alert, App } from 'antd'
import { KeyRound } from 'lucide-react'
import { forgotPassword, resetPassword } from '../api'
import { useShop } from '../store/shopContext'

function Card({ title, text, children }) {
  return (
    <section className="bg-cool py-10 md:py-14">
      <div className="container-x">
        <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-6 md:p-8">
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary-50 text-primary-dark"><KeyRound size={24} /></span>
          <h1 className="text-2xl font-bold">{title}</h1>
          {text && <p className="mt-1 text-sm">{text}</p>}
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </section>
  )
}

// /forgot-password: asks the backend to email a reset link
export function ForgotPassword() {
  const [sent, setSent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async ({ email }) => {
    setLoading(true)
    setError('')
    const res = await forgotPassword(email.trim())
    setLoading(false)
    if (res.ok) setSent(res.message)
    else setError(res.message)
  }

  if (sent) {
    return (
      <Card title="Check your email">
        <Result status="success" className="!p-0" subTitle={`${sent} The link is valid for 30 minutes.`} extra={<Link to="/login"><Button type="primary">Back to login</Button></Link>} />
      </Card>
    )
  }

  return (
    <Card title="Forgot your password?" text="Enter the email on your account and we will send you a link to set a new password.">
      <Form layout="vertical" requiredMark={false} onFinish={submit}>
        <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Please enter your email' }, { type: 'email', message: 'Enter a valid email' }]}>
          <Input size="large" placeholder="name@email.com" autoComplete="email" />
        </Form.Item>
        {error && <Alert type="error" showIcon title={error} className="!mb-4" />}
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>Send reset link</Button>
      </Form>
      <p className="mt-4 text-center text-sm">Remembered it? <Link to="/login" className="font-bold text-primary-dark">Log in</Link></p>
    </Card>
  )
}

// /reset-password?token=...: link from the email
export function ResetPassword() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [params] = useSearchParams()
  const { signIn } = useShop()
  const token = params.get('token') || ''
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return (
      <Card title="Link not valid">
        <Result status="warning" className="!p-0" subTitle="This reset link is incomplete or broken. Please request a new one." extra={<Link to="/forgot-password"><Button type="primary">Request a new link</Button></Link>} />
      </Card>
    )
  }

  const submit = async ({ password }) => {
    setLoading(true)
    setError('')
    const res = await resetPassword(token, password)
    setLoading(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    await signIn(res.user)
    message.success('Password updated. You are now logged in.')
    navigate('/account', { replace: true })
  }

  return (
    <Card title="Set a new password">
      <Form layout="vertical" requiredMark={false} onFinish={submit}>
        <Form.Item name="password" label="New password" rules={[{ required: true, min: 6, message: 'Use at least 6 characters' }]}>
          <Input.Password size="large" autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="Confirm new password"
          dependencies={['password']}
          rules={[{ required: true, message: 'Please confirm the password' }, ({ getFieldValue }) => ({ validator: (_, v) => (!v || v === getFieldValue('password') ? Promise.resolve() : Promise.reject(new Error('Passwords do not match'))) })]}
        >
          <Input.Password size="large" autoComplete="new-password" />
        </Form.Item>
        {error && (
          <Alert type="error" showIcon title={error} className="!mb-4" action={<Link to="/forgot-password" className="text-xs font-bold">New link</Link>} />
        )}
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>Save new password</Button>
      </Form>
    </Card>
  )
}
