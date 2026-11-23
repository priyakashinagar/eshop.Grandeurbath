import { useState } from 'react'
import { Modal, Input, Button } from 'antd'
import { MapPin, CheckCircle2 } from 'lucide-react'
import { useShop } from '../../store/shopContext'
import { checkPincode } from '../../api'

// Pincode entry used from the header and the product page
export function PincodeChecker({ compact = false, onDone }) {
  const { pincode, setPincode } = useShop()
  const [value, setValue] = useState(pincode?.pincode || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const check = async () => {
    setLoading(true)
    setError('')
    const res = await checkPincode(value)
    setLoading(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setPincode(res)
    onDone?.(res)
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input
          size={compact ? 'middle' : 'large'}
          inputMode="numeric"
          maxLength={6}
          prefix={<MapPin size={16} className="text-body" />}
          placeholder="Enter delivery pincode"
          value={value}
          status={error ? 'error' : undefined}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
          onPressEnter={check}
          aria-label="Delivery pincode"
        />
        <Button size={compact ? 'middle' : 'large'} type="primary" loading={loading} onClick={check}>
          Check
        </Button>
      </div>
      {error && <p className="mt-1.5 text-xs font-semibold text-sale">{error}</p>}
      {!error && pincode && (
        <p className="mt-2 flex items-start gap-1.5 text-[13px] text-heading">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-new" />
          <span>
            Delivery to <b>{pincode.pincode}</b> ({pincode.city}) by <b>{pincode.eta}</b>. Cash on delivery available.
          </span>
        </p>
      )}
    </div>
  )
}

export default function PincodeModal() {
  const { pincodeOpen, closePincode } = useShop()
  return (
    <Modal open={pincodeOpen} onCancel={closePincode} footer={null} title="Choose your delivery location" destroyOnHidden width={440}>
      <p className="mb-3 text-sm">Enter your pincode to see delivery dates and charges for your area.</p>
      <PincodeChecker onDone={() => setTimeout(closePincode, 700)} />
    </Modal>
  )
}
