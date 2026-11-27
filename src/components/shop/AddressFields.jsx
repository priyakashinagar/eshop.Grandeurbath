import { Form, Input, Select } from 'antd'
import { indianStates } from '../../data/shop'

const pincodeRules = [{ required: true, message: 'Please enter pincode' }, { pattern: /^[1-9][0-9]{5}$/, message: 'Enter a valid 6 digit pincode' }]

// Address inputs shared by checkout and the address book
export default function AddressFields({ onPincodeChange, pincodeExtra, withLabel = false }) {
  return (
    <div className="grid gap-x-4 sm:grid-cols-2">
      {withLabel && (
        <Form.Item name="label" label="Save as" initialValue="Home" className="sm:col-span-2">
          <Select options={['Home', 'Office', 'Site', 'Other'].map((v) => ({ value: v, label: v }))} />
        </Form.Item>
      )}
      <Form.Item name="line1" label="Address (house no, building, street, area)" className="sm:col-span-2" rules={[{ required: true, min: 5, message: 'Please enter your address' }]}>
        <Input.TextArea rows={2} placeholder="Flat / house no, building, street, area" autoComplete="street-address" />
      </Form.Item>
      <Form.Item name="landmark" label="Landmark (optional)">
        <Input size="large" placeholder="Near..." />
      </Form.Item>
      <Form.Item name="pincode" label="Pincode" rules={pincodeRules} extra={pincodeExtra}>
        <Input size="large" maxLength={6} inputMode="numeric" placeholder="6 digit pincode" onChange={onPincodeChange} autoComplete="postal-code" />
      </Form.Item>
      <Form.Item name="city" label="City" rules={[{ required: true, message: 'Please enter city' }]}>
        <Input size="large" placeholder="City" autoComplete="address-level2" />
      </Form.Item>
      <Form.Item name="state" label="State" rules={[{ required: true, message: 'Please select state' }]}>
        <Select size="large" showSearch placeholder="Select state" options={indianStates.map((x) => ({ value: x, label: x }))} />
      </Form.Item>
      <Form.Item
        name="gstin"
        label="GSTIN (optional, for business invoice)"
        className="sm:col-span-2"
        rules={[{ pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, message: 'Enter a valid 15 character GSTIN' }]}
        normalize={(v) => v?.toUpperCase()}
      >
        <Input size="large" maxLength={15} placeholder="22AAAAA0000A1Z5" />
      </Form.Item>
    </div>
  )
}
